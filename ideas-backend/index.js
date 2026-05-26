const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const { google } = require('googleapis');
require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const xlsx = require('xlsx');

// Új csomagok a fájlrendszer-alapú memóriakímélő kezeléshez
const fs = require('fs');
const os = require('os');
const path = require('path');

// ==========================================
// 1. INICIALIZÁLÁSOK ÉS KAPCSOLATOK
// ==========================================

// Adatbázis (MySQL)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Stripe, Gemini és Google Drive
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const oauth2Client = new google.auth.OAuth2(process.env.DRIVE_CLIENT_ID, process.env.DRIVE_CLIENT_SECRET, "https://developers.google.com/oauthplayground");
oauth2Client.setCredentials({ refresh_token: process.env.DRIVE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

// Express App
const app = express();
app.use(cors());

// ==========================================
// 2. STRIPE WEBHOOK (KÖTELEZŐEN AZ express.json ELÉ!)
// ==========================================
app.post('/api/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ Hiba: A STRIPE_WEBHOOK_SECRET környezeti változó hiányzik a Renderen!');
    return res.status(500).send('Webhook konfigurációs hiba a szerveren.');
  }

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook hiba: Érvénytelen aláírás.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // --- A) PÁLYÁZATI DÍJ FIZETÉSE ---
    if (session.metadata && session.metadata.type === 'contest_fee') {
      const contestId = session.metadata.contest_id;
      const userEmail = session.metadata.user_email;
      const sessionId = session.id;

      try {
        await pool.query(
          'INSERT INTO photo_contest_payments (contest_id, user_email, stripe_session_id, status) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = ?',
          [contestId, userEmail, sessionId, 'paid', 'paid']
        );
        console.log(`✅ Sikeres pályázati díj fizetés! Pályázat ID: ${contestId}, Fotós: ${userEmail}`);
      } catch (err) {
        console.error('Adatbázis hiba a pályázati díj fizetésénél:', err);
      }
    } 
    // --- B) PRÉMIUM ELŐFIZETÉS KEZELÉSE ---
    else {
      const userEmail = session.customer_details ? session.customer_details.email : session.customer_email;
      const customerId = session.customer; 
      const newSubscriptionId = session.subscription; 
      const tier = session.metadata ? session.metadata.tier : 'basic'; 
      const premiumLevel = tier === 'pro' ? 2 : 1; 

      try {
        if (customerId && newSubscriptionId) {
          const activeSubscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
          });
          
          for (const sub of activeSubscriptions.data) {
            if (sub.id !== newSubscriptionId) {
              await stripe.subscriptions.cancel(sub.id);
              console.log(`🧹 Csomagváltás: A régi előfizetést automatikusan lemondtuk (${sub.id})`);
            }
          }
        }

        const premiumUntil = new Date();
        premiumUntil.setMonth(premiumUntil.getMonth() + 1);
        
        await pool.query(
          'UPDATE photo_users SET is_premium = 1, premium_until = ?, stripe_customer_id = ?, premium_level = ? WHERE email = ? OR stripe_customer_id = ?',
          [premiumUntil, customerId, premiumLevel, userEmail, customerId]
        );
        console.log(`✅ Prémium (${tier}) sikeresen aktiválva neki: ${userEmail || customerId}`);
      } catch (err) {
        console.error('Adatbázis/Lemondási hiba a webhookban:', err);
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const customerId = event.data.object.customer;
    try {
      await pool.query('UPDATE photo_users SET is_premium = 0 WHERE stripe_customer_id = ?', [customerId]);
      console.log(`❌ Prémium lemondva/lejárt (Customer ID: ${customerId})`);
    } catch (err) {
      console.error('Adatbázis hiba a webhook lemondásnál:', err);
    }
  }

  res.send();
});


// ==========================================
// 3. MIDDLEWARE ÉS ALAP BEÁLLÍTÁSOK
// ==========================================
app.use(express.json()); 

// Optimalizált fájl feltöltés: a szerver temp mappájába rakjuk a memóriafoglalás helyett
const upload = multer({ dest: os.tmpdir() });

// Segédfüggvény az ideiglenes fájlok törléséhez
const cleanupTempFile = (file) => {
  if (file && file.path && fs.existsSync(file.path)) {
    try {
      fs.unlinkSync(file.path);
    } catch (err) {
      console.error('Hiba a temp fájl törlésekor:', err.message);
    }
  }
};

const checkPremium = async (req, res, next) => {
  const userEmail = req.query.userEmail || req.body.userEmail;
  if (!userEmail) return res.status(400).json({ error: 'Felhasználói azonosító (email) szükséges!' });

  try {
    const [rows] = await pool.query('SELECT is_premium, premium_until FROM photo_users WHERE email = ?', [userEmail]);
    if (rows.length > 0) {
      const user = rows[0];
      const now = new Date();
      const premiumUntil = user.premium_until ? new Date(user.premium_until) : null;
      if (user.is_premium === 1 && premiumUntil && premiumUntil > now) {
        return next(); 
      }
    }
    return res.status(403).json({ error: 'PREMIUM_REQUIRED', message: 'Ehhez a funkcióhoz aktív Prémium előfizetés szükséges!' });
  } catch (err) {
    return res.status(500).json({ error: 'Hiba a jogosultság ellenőrzésekor.' });
  }
};


// ==========================================
// 4. API VÉGPONTOK (ROUTES)
// ==========================================

// --- STRIPE: ELŐFIZETÉSI OLDAL (CHECKOUT) GENERÁLÁSA ---
app.post('/api/create-checkout-session', async (req, res) => {
  const { userEmail, tier } = req.body;
  const isPro = tier === 'pro';
  const priceAmount = isPro ? 249000 : 100000;
  const productName = isPro ? 'Képolvasók Fotóklub Pro Prémium' : 'Képolvasók Fotóklub Alap Prémium';
  
  try {
    const [rows] = await pool.query('SELECT stripe_customer_id FROM photo_users WHERE email = ?', [userEmail]);
    const existingCustomerId = rows.length > 0 ? rows[0].stripe_customer_id : null;

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [{
          price_data: {
            currency: 'huf',
            product_data: { name: productName },
            unit_amount: priceAmount, 
            recurring: { interval: 'month' },
          },
          quantity: 1,
      }],
      mode: 'subscription',
      subscription_data: { trial_period_days: 7 },
      metadata: { tier: isPro ? 'pro' : 'basic' },
      success_url: `${req.headers.origin}?success=true`,
      cancel_url: `${req.headers.origin}?canceled=true`,
    };

    if (existingCustomerId) {
      sessionConfig.customer = existingCustomerId;
    } else {
      sessionConfig.customer_email = userEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    res.json({ url: session.url });
  } catch (e) {
    console.error('Stripe Hiba:', e);
    res.status(500).json({ error: e.message });
  }
});


// --- STRIPE: PÁLYÁZATI NEVEZÉSI DÍJ FIZETÉSE ---
app.post('/api/create-contest-payment', async (req, res) => {
  const { userEmail, contestId, returnUrl } = req.body;
  
  if (!contestId) return res.status(400).json({ error: 'Nem érkezett meg a pályázat azonosítója!' });

  try {
    const [contests] = await pool.query('SELECT title, entry_fee, fee_currency FROM photo_contests WHERE id = ?', [contestId]);
    if (contests.length === 0) return res.status(404).json({ error: 'A pályázat nem található!' });
    
    const contest = contests[0];
    if (contest.entry_fee <= 0) return res.status(400).json({ error: 'Ez a pályázat ingyenes!' });

    const origin = returnUrl || req.headers.origin || 'https://kepolvasok.hu';

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [{
          price_data: {
            currency: (contest.fee_currency || 'HUF').toLowerCase(),
            product_data: { name: `Nevezési díj: ${contest.title}` },
            unit_amount: contest.entry_fee * 100, 
          },
          quantity: 1,
      }],
      mode: 'payment',
      metadata: { 
        type: 'contest_fee',
        contest_id: contestId.toString(),
        user_email: userEmail
      },
      success_url: `${origin}?tab=contests_open_active&success_contest=${contestId}`,
      cancel_url: `${origin}?tab=contests_open_active&canceled_contest=true`,
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);
    res.json({ url: session.url });
  } catch (e) {
    console.error('Stripe Pályázati fizetés Hiba:', e);
    res.status(500).json({ error: `Stripe szerver hiba: ${e.message}` });
  }
});


// Lekérdező végpont, hogy a frontend tudja, fizetett-e már
app.get('/api/contest-payments', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT contest_id, user_email FROM photo_contest_payments WHERE status = "paid"');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Hiba a fizetések lekérésekor' });
  }
});


// --- AUTH ÉS USEREK ---
app.post('/api/auth/sync', async (req, res) => {
  const { email, name, sub } = req.body;
  try {
    await pool.query(
      `INSERT INTO photo_users (google_id, email, name, last_login) 
       VALUES (?, ?, ?, NOW()) 
       ON DUPLICATE KEY UPDATE name = ?, last_login = NOW()`, 
      [sub, email, name, name]
    );

    const [rows] = await pool.query('SELECT is_premium, premium_until, premium_level FROM photo_users WHERE email = ?', [email]);
    
    const userDb = rows[0];
    const now = new Date();
    const premiumUntil = userDb.premium_until ? new Date(userDb.premium_until) : null;
    const isPremiumActive = (userDb.is_premium === 1 && premiumUntil && premiumUntil > now);

    res.json({ 
      success: true,
      isPremium: isPremiumActive,
      premiumLevel: userDb.premium_level,
      premiumUntil: userDb.premium_until 
    });
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: 'Adatbázis hiba az auth szinkronizációnál' }); 
  }
});


app.get('/api/users', async (req, res) => {
  try { 
    const [rows] = await pool.query(`
      SELECT 
        u.email, 
        u.name, 
        u.club_name, 
        u.club_role, 
        u.last_login,
        u.is_premium,
        u.premium_until,
        (SELECT COUNT(*) FROM photo_portfolio p WHERE p.user_email = u.email AND p.ai_tags IS NOT NULL) as ai_usage_count
      FROM photo_users u 
      ORDER BY u.last_login DESC
    `); 
    res.json(rows); 
  } catch (err) { 
    res.status(500).json({ error: 'Hiba' }); 
  }
});


app.put('/api/users/:email', async (req, res) => {
  try { 
    await pool.query('UPDATE photo_users SET club_name = ?, club_role = ? WHERE email = ?', [req.body.clubName || null, req.body.clubRole || 'member', req.params.email]); 
    res.json({ success: true }); 
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

// --- KLUBOK ---
app.get('/api/clubs', async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM photo_clubs ORDER BY name ASC'); res.json(rows); } 
  catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.post('/api/clubs', async (req, res) => {
  try { await pool.query('INSERT IGNORE INTO photo_clubs (name) VALUES (?)', [req.body.name]); res.json({ success: true }); } 
  catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.delete('/api/clubs/:id', async (req, res) => {
  try { await pool.query('DELETE FROM photo_clubs WHERE id = ?', [req.params.id]); res.json({ success: true }); } 
  catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

// --- ZSŰRI ---
app.get('/api/jury', async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM photo_jury'); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.post('/api/jury', async (req, res) => {
  try { await pool.query('INSERT IGNORE INTO photo_jury (contest_id, user_email) VALUES (?, ?)', [req.body.contestId, req.body.userEmail]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.delete('/api/jury', async (req, res) => {
  try { await pool.query('DELETE FROM photo_jury WHERE contest_id = ? AND user_email = ?', [req.body.contestId, req.body.userEmail]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

// --- PÁLYÁZATOK ---
app.get('/api/contests', async (req, res) => {
  try { 
    const [rows] = await pool.query(`SELECT c.*, (SELECT COUNT(*) FROM photo_entries WHERE contest_id = c.id) as entry_count, (SELECT COUNT(*) FROM photo_jury WHERE contest_id = c.id) as jury_count, (SELECT COUNT(*) FROM photo_votes v JOIN photo_entries e ON v.entry_id = e.id WHERE e.contest_id = c.id) as vote_count FROM photo_contests c ORDER BY c.created_at DESC`); 
    res.json(rows); 
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.post('/api/contests', async (req, res) => {
  const { title, description, startDate, endDate, categories, restrictedClub, entryFee, feeCurrency, categorySettings } = req.body;
  try { 
    await pool.query(
      'INSERT INTO photo_contests (title, description, start_date, end_date, categories, restricted_club, entry_fee, fee_currency, category_settings) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
      [title, description, startDate, endDate, categories, restrictedClub, entryFee || 0, feeCurrency || 'HUF', categorySettings ? JSON.stringify(categorySettings) : null]
    ); 
    res.json({ success: true }); 
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.put('/api/contests/:id', async (req, res) => {
  const { title, description, startDate, endDate, categories, restrictedClub, entryFee, feeCurrency, categorySettings } = req.body;
  try { 
    await pool.query(
      'UPDATE photo_contests SET title = ?, description = ?, start_date = ?, end_date = ?, categories = ?, restricted_club = ?, entry_fee = ?, fee_currency = ?, category_settings = ? WHERE id = ?', 
      [title, description, startDate, endDate, categories, restrictedClub, entryFee || 0, feeCurrency || 'HUF', categorySettings ? JSON.stringify(categorySettings) : null, req.params.id]
    ); 
    res.json({ success: true }); 
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.delete('/api/contests/:id', async (req, res) => {
  try {
    const [entries] = await pool.query('SELECT drive_file_id FROM photo_entries WHERE contest_id = ? AND drive_file_id IS NOT NULL', [req.params.id]);
    for (const entry of entries) { await drive.files.delete({ fileId: entry.drive_file_id }).catch(e => console.log('Drive törlési hiba:', e.message)); }
    await pool.query('DELETE FROM photo_votes WHERE entry_id IN (SELECT id FROM photo_entries WHERE contest_id = ?)', [req.params.id]);
    await pool.query('DELETE FROM photo_entries WHERE contest_id = ?', [req.params.id]);
    await pool.query('DELETE FROM photo_jury WHERE contest_id = ?', [req.params.id]);
    await pool.query('DELETE FROM photo_contests WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba a pályázat törlésekor' }); }
});

app.get('/api/my-entries', async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM photo_entries WHERE user_email = ? ORDER BY created_at DESC', [req.query.userEmail]); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.post('/api/upload', upload.single('photo'), async (req, res) => {
  const { contestId, userEmail, userName, title, category } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Nincs fájl kiválasztva!' });
  
  try {
    const [juryCheck] = await pool.query('SELECT * FROM photo_jury WHERE contest_id = ? AND user_email = ?', [contestId, userEmail]);
    if (juryCheck.length > 0) {
      cleanupTempFile(file);
      return res.status(403).json({ error: 'Zsűritagként nem nevezhetsz!' });
    }
    
    const [countRows] = await pool.query('SELECT COUNT(*) as count FROM photo_entries WHERE contest_id = ? AND user_email = ? AND category = ?', [contestId, userEmail, category]);
    if (countRows[0].count >= 4) {
      cleanupTempFile(file);
      return res.status(400).json({ error: 'Elérted a 4 képes limitet!' });
    }

    const fileStream = fs.createReadStream(file.path);
    const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
    
    const driveRes = await drive.files.create({ 
      requestBody: { name: `Nevezes_${contestId}_${userName}_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, 
      media: { mimeType: file.mimetype, body: fileStream }, 
      fields: 'id, webViewLink' 
    });

    cleanupTempFile(file);

    const fileSize = req.file.size; 
    await pool.query(
      'INSERT INTO photo_entries (contest_id, user_email, user_name, title, category, file_url, drive_file_id, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
      [contestId, userEmail, userName, title, category, driveRes.data.webViewLink, driveRes.data.id, fileSize]
    );

    res.json({ success: true });
  } catch (err) { 
    cleanupTempFile(file);
    res.status(500).json({ error: err.message }); 
  }
});
// --- ÚJ: A zsűritag saját haladásának lekérdezése ---
app.get('/api/my-judged-contests', async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id as contest_id,
        (
          SELECT COUNT(*) FROM photo_entries e 
          LEFT JOIN photo_contest_payments p ON e.contest_id = p.contest_id AND e.user_email = p.user_email
          WHERE e.contest_id = c.id AND (c.entry_fee IS NULL OR c.entry_fee = 0 OR p.id IS NOT NULL)
        ) as judgeable_count,
        (
          SELECT COUNT(*) FROM photo_votes v 
          JOIN photo_entries e ON v.entry_id = e.id 
          WHERE e.contest_id = c.id AND v.jury_email = ?
        ) as voted_count
      FROM photo_contests c
      JOIN photo_jury j ON c.id = j.contest_id
      WHERE j.user_email = ?
    `;
    const [rows] = await pool.query(query, [req.query.userEmail, req.query.userEmail]);
    res.json(rows);
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: 'Hiba' }); 
  }
});
app.put('/api/entries/:id', async (req, res) => {
  try {
    const [result] = await pool.query('UPDATE photo_entries SET title = ? WHERE id = ? AND user_email = ?', [req.body.title, req.params.id, req.body.userEmail]);
    if (result.affectedRows === 0) return res.status(403).json({ error: 'Nincs jogosultságod módosítani ezt a képet!' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba a cím frissítésekor' }); }
});

app.delete('/api/entries/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM photo_entries WHERE id = ? AND user_email = ?', [req.params.id, req.body.userEmail]);
    if (rows.length === 0) return res.status(403).json({ error: 'Nincs jogod!' });
    if (rows[0].drive_file_id) await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(e => console.log(e.message));
    await pool.query('DELETE FROM photo_entries WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.get('/api/admin/stats/:contestId', async (req, res) => {
  try { const [rows] = await pool.query('SELECT user_name, user_email, category, COUNT(*) as image_count FROM photo_entries WHERE contest_id = ? GROUP BY user_email, user_name, category ORDER BY user_name ASC, category ASC', [req.params.contestId]); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.get('/api/admin/jury-stats/:contestId', async (req, res) => {
  try {
    const contestId = req.params.contestId;
    const [[{ total_entries }]] = await pool.query('SELECT COUNT(*) as total_entries FROM photo_entries WHERE contest_id = ?', [contestId]);
    const [stats] = await pool.query(`SELECT j.user_email, COALESCE(v.voted_count, 0) as voted_count FROM photo_jury j LEFT JOIN (SELECT pv.jury_email, COUNT(*) as voted_count FROM photo_votes pv JOIN photo_entries pe ON pv.entry_id = pe.id WHERE pe.contest_id = ? GROUP BY pv.jury_email) v ON j.user_email = v.jury_email WHERE j.contest_id = ?`, [contestId, contestId]);
    res.json({ total_entries: total_entries || 0, stats });
  } catch (err) { res.status(500).json({ error: 'Hiba a statisztika lekérésekor' }); }
});

app.get('/api/jury-entries/:contestId', async (req, res) => {
  try { 
    const query = `
      SELECT e.id, e.title, e.category, e.file_url, e.drive_file_id 
      FROM photo_entries e 
      JOIN photo_contests c ON e.contest_id = c.id
      LEFT JOIN photo_votes v ON e.id = v.entry_id AND v.jury_email = ? 
      LEFT JOIN photo_contest_payments p ON e.contest_id = p.contest_id AND e.user_email = p.user_email
      WHERE e.contest_id = ? 
        AND v.id IS NULL
        AND (c.entry_fee IS NULL OR c.entry_fee = 0 OR p.id IS NOT NULL)
    `;
    const [rows] = await pool.query(query, [req.query.userEmail, req.params.contestId]); 
    res.json(rows); 
  } catch (err) { 
    console.error('Hiba a zsűri képeinek lekérésekor:', err);
    res.status(500).json({ error: 'Hiba' }); 
  }
});


app.post('/api/vote', async (req, res) => {
  if (req.body.score < 0 || req.body.score > 100) return res.status(400).json({ error: 'Érvénytelen pontszám!' });
  try { await pool.query('INSERT INTO photo_votes (entry_id, jury_email, score) VALUES (?, ?, ?)', [req.body.entryId, req.body.juryEmail, req.body.score]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.get('/api/results/:contestId', async (req, res) => {
  try { const [rows] = await pool.query(`SELECT e.id, e.title, e.category, e.file_url, e.drive_file_id, e.user_name, e.user_email, COALESCE(SUM(v.score), 0) as total_score, COUNT(v.id) as vote_count FROM photo_entries e LEFT JOIN photo_votes v ON e.id = v.entry_id WHERE e.contest_id = ? GROUP BY e.id ORDER BY e.category ASC, total_score DESC`, [req.params.contestId]); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

// --- ÚJ: KÉP LETÖLTÉSE BASE64 FORMÁTUMBAN (OKLEVÉLHEZ) ---
app.get('/api/image-base64/:fileId', async (req, res) => {
  try {
    const driveRes = await drive.files.get({ fileId: req.params.fileId, alt: 'media' }, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(driveRes.data).toString('base64');
    res.json({ base64: `data:image/jpeg;base64,${base64}` });
  } catch (err) {
    res.status(500).json({ error: 'Nem sikerült a képet betölteni az oklevélhez.' });
  }
});

// --- KLUBESTEK (MEETINGS) ---
app.get('/api/meetings', async (req, res) => {
  try { const [rows] = await pool.query(`SELECT m.*, c.name as club_name FROM photo_club_meetings m JOIN photo_clubs c ON m.club_id = c.id ORDER BY m.meeting_date DESC, m.meeting_time DESC`); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.post('/api/meetings', upload.single('coverPhoto'), async (req, res) => {
  const { clubId, date, time, topic, description, locationType, locationDetails, videoLink } = req.body;
  const file = req.file; let fileUrl = null; let driveFileId = null;
  try {
    if (file) {
      const fileStream = fs.createReadStream(file.path);
      const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
      const driveRes = await drive.files.create({ 
        requestBody: { name: `Klubest_Cover_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, 
        media: { mimeType: file.mimetype, body: fileStream }, 
        fields: 'id, webViewLink' 
      });
      fileUrl = driveRes.data.webViewLink; driveFileId = driveRes.data.id;
      cleanupTempFile(file);
    }
    await pool.query('INSERT INTO photo_club_meetings (club_id, meeting_date, meeting_time, topic, description, location_type, location_details, file_url, drive_file_id, video_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [clubId, date, time, topic, description, locationType, locationDetails, fileUrl, driveFileId, videoLink || null]);
    res.json({ success: true });
  } catch (err) { 
    cleanupTempFile(file);
    res.status(500).json({ error: err.message }); 
  }
});

app.put('/api/meetings/:id', upload.single('coverPhoto'), async (req, res) => {
  const { date, time, topic, description, locationType, locationDetails, videoLink } = req.body;
  const file = req.file;
  
  try {
    if (file) {
      const [oldRows] = await pool.query('SELECT drive_file_id FROM photo_club_meetings WHERE id = ?', [req.params.id]);
      if (oldRows.length > 0 && oldRows[0].drive_file_id) {
        await drive.files.delete({ fileId: oldRows[0].drive_file_id }).catch(e => console.log('Régi borítókép törlése sikertelen:', e.message));
      }

      const fileStream = fs.createReadStream(file.path);
      const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
      
      const driveRes = await drive.files.create({ 
        requestBody: { name: `Klubest_Cover_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, 
        media: { mimeType: file.mimetype, body: fileStream }, 
        fields: 'id, webViewLink' 
      });
      
      cleanupTempFile(file);

      await pool.query('UPDATE photo_club_meetings SET meeting_date=?, meeting_time=?, topic=?, description=?, location_type=?, location_details=?, file_url=?, drive_file_id=?, video_link=? WHERE id=?', 
        [date, time, topic, description, locationType, locationDetails, driveRes.data.webViewLink, driveRes.data.id, videoLink || null, req.params.id]);
    } else {
      await pool.query('UPDATE photo_club_meetings SET meeting_date=?, meeting_time=?, topic=?, description=?, location_type=?, location_details=?, video_link=? WHERE id=?', 
        [date, time, topic, description, locationType, locationDetails, videoLink || null, req.params.id]);
    }
    res.json({ success: true });
  } catch (err) { 
    cleanupTempFile(file);
    console.error('Klubest mentési hiba:', err);
    res.status(500).json({ error: 'Hálózati hiba a Google Drive feltöltésnél. Kérlek, próbáld újra egy perc múlva!' }); 
  }
});

app.delete('/api/meetings/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT drive_file_id FROM photo_club_meetings WHERE id = ?', [req.params.id]);
    if (rows.length > 0 && rows[0].drive_file_id) await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(e => console.log('Drive hiba:', e.message));
    await pool.query('DELETE FROM photo_club_meetings WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba a törlésnél' }); }
});

app.get('/api/attendance/:meetingId', async (req, res) => {
  try { const [rows] = await pool.query('SELECT user_email FROM photo_meeting_attendance WHERE meeting_id = ?', [req.params.meetingId]); res.json(rows.map(r => r.user_email)); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.post('/api/attendance/:meetingId', async (req, res) => {
  const { emails } = req.body; const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM photo_meeting_attendance WHERE meeting_id = ?', [req.params.meetingId]);
    if (emails && emails.length > 0) { const values = emails.map(email => [req.params.meetingId, email]); await conn.query('INSERT INTO photo_meeting_attendance (meeting_id, user_email) VALUES ?', [values]); }
    await conn.commit(); res.json({ success: true });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); } finally { conn.release(); }
});

// --- HÁZI FELADATOK ---
app.get('/api/homeworks', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT h.*, c.name as club_name FROM photo_homeworks h JOIN photo_clubs c ON h.club_id = c.id ORDER BY h.deadline DESC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.post('/api/homeworks', async (req, res) => {
  const { clubId, topic, description, deadline, maxImages } = req.body;
  try { 
    await pool.query('INSERT INTO photo_homeworks (club_id, topic, description, deadline, max_images) VALUES (?, ?, ?, ?, ?)', [clubId, topic, description, deadline, maxImages || 4]); 
    res.json({ success: true }); 
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.put('/api/homeworks/:id', async (req, res) => {
  const { topic, description, deadline, maxImages } = req.body;
  try { 
    await pool.query('UPDATE photo_homeworks SET topic = ?, description = ?, deadline = ?, max_images = ? WHERE id = ?', [topic, description, deadline, maxImages || 4, req.params.id]); 
    res.json({ success: true }); 
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.delete('/api/homeworks/:id', async (req, res) => {
  try { await pool.query('DELETE FROM photo_homeworks WHERE id = ?', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.get('/api/my-homework-entries', async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM photo_homework_entries WHERE user_email = ? ORDER BY created_at DESC', [req.query.userEmail]); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.get('/api/homework-entries/club/:clubId', async (req, res) => {
  const userEmail = req.query.userEmail || '';
  try { 
    const [rows] = await pool.query(`SELECT e.*, (SELECT COUNT(*) FROM photo_homework_likes WHERE entry_id = e.id) as like_count, (SELECT COUNT(*) FROM photo_homework_likes WHERE entry_id = e.id AND user_email = ?) as user_liked FROM photo_homework_entries e JOIN photo_homeworks h ON e.homework_id = h.id WHERE h.club_id = ? ORDER BY e.created_at DESC`, [userEmail, req.params.clubId]); 
    res.json(rows); 
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.post('/api/upload-homework', upload.single('photo'), async (req, res) => {
  const { homeworkId, userEmail, userName, title } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Nincs fájl kiválasztva!' });
  try {
    const [hwRows] = await pool.query('SELECT max_images FROM photo_homeworks WHERE id = ?', [homeworkId]);
    if (hwRows.length === 0) {
      cleanupTempFile(file);
      return res.status(404).json({ error: 'A házi feladat nem található!' });
    }
    const maxImages = hwRows[0].max_images;

    const [countRows] = await pool.query('SELECT COUNT(*) as count FROM photo_homework_entries WHERE homework_id = ? AND user_email = ?', [homeworkId, userEmail]);
    if (countRows[0].count >= maxImages) {
      cleanupTempFile(file);
      return res.status(400).json({ error: `Elérted a maximálisan feltölthető ${maxImages} képes limitet!` });
    }

    const fileStream = fs.createReadStream(file.path);
    const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
    
    const driveRes = await drive.files.create({ 
      requestBody: { name: `Hazi_${homeworkId}_${userName}_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, 
      media: { mimeType: file.mimetype, body: fileStream }, 
      fields: 'id, webViewLink' 
    });

    cleanupTempFile(file);

    const fileSize = req.file.size; 
    await pool.query(
      'INSERT INTO photo_homework_entries (homework_id, user_email, user_name, title, file_url, drive_file_id, file_size) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      [homeworkId, userEmail, userName, title, driveRes.data.webViewLink, driveRes.data.id, fileSize]
    );

    res.json({ success: true });
  } catch (err) { 
    cleanupTempFile(file);
    res.status(500).json({ error: err.message }); 
  }
});

app.put('/api/homework-entries/:id', async (req, res) => {
  try {
    const [result] = await pool.query('UPDATE photo_homework_entries SET title = ? WHERE id = ? AND user_email = ?', [req.body.title, req.params.id, req.body.userEmail]);
    if (result.affectedRows === 0) return res.status(403).json({ error: 'Nincs jogosultságod módosítani ezt a képet!' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba a cím frissítésekor' }); }
});

app.delete('/api/homework-entries/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM photo_homework_entries WHERE id = ? AND user_email = ?', [req.params.id, req.body.userEmail]);
    if (rows.length === 0) return res.status(403).json({ error: 'Nincs jogod!' });
    if (rows[0].drive_file_id) await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(e => console.log(e.message));
    await pool.query('DELETE FROM photo_homework_entries WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.post('/api/homework-entries/:id/like', async (req, res) => {
  const { userEmail } = req.body;
  const entryId = req.params.id;
  try {
    const [existing] = await pool.query('SELECT * FROM photo_homework_likes WHERE entry_id = ? AND user_email = ?', [entryId, userEmail]);
    if (existing.length > 0) {
      await pool.query('DELETE FROM photo_homework_likes WHERE entry_id = ? AND user_email = ?', [entryId, userEmail]);
      res.json({ liked: false });
    } else {
      await pool.query('INSERT INTO photo_homework_likes (entry_id, user_email) VALUES (?, ?)', [entryId, userEmail]);
      res.json({ liked: true });
    }
  } catch (err) { res.status(500).json({ error: 'Hiba a like-olásnál' }); }
});

app.post('/api/homework-entries/:id/toggle-select', async (req, res) => {
  const entryId = req.params.id;
  try {
    const [rows] = await pool.query('SELECT is_selected FROM photo_homework_entries WHERE id = ?', [entryId]);
    if (rows.length === 0) return res.status(404).json({ error: 'A kép nem található!' });
    
    const newStatus = rows[0].is_selected ? 0 : 1;
    await pool.query('UPDATE photo_homework_entries SET is_selected = ? WHERE id = ?', [newStatus, entryId]);
    
    res.json({ success: true, is_selected: newStatus });
  } catch (err) { 
    console.error('Hiba a kép kiválasztásakor:', err);
    res.status(500).json({ error: 'Hiba a státusz módosításakor' }); 
  }
});

// --- NEMZETKÖZI SZALONOK ÉS PÁLYÁZATOK (ADMIN) ---
app.get('/api/countries', async (req, res) => {
  try { const [rows] = await pool.query('SELECT id, country, country_hun, country_code FROM photo_countries WHERE is_active = 1 ORDER BY country_hun ASC'); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.get('/api/categories', async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM photo_categories ORDER BY hun_name ASC'); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.get('/api/patrons', async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM photo_patrons ORDER BY name ASC'); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.get('/api/salons', async (req, res) => {
  try {
    const [salons] = await pool.query(`SELECT s.*, c.country_hun, c.country_code FROM photo_salons s LEFT JOIN photo_countries c ON s.host_country_id = c.id ORDER BY s.end_date DESC`);
    const [patrons] = await pool.query(`SELECT sp.salon_id, p.name, sp.patron_number FROM photo_salon_patrons sp JOIN photo_patrons p ON sp.patron_id = p.id`);
    const [categories] = await pool.query(`SELECT sc.salon_id, cat.hun_name, cat.name FROM photo_salon_categories sc JOIN photo_categories cat ON sc.category_id = cat.id`);
    
    const patronMap = {}; patrons.forEach(p => { if (!patronMap[p.salon_id]) patronMap[p.salon_id] = []; patronMap[p.salon_id].push({ name: p.name, number: p.patron_number }); });
    const categoryMap = {}; categories.forEach(c => { if (!categoryMap[c.salon_id]) categoryMap[c.salon_id] = []; categoryMap[c.salon_id].push(c.hun_name || c.name); });
    const formattedSalons = salons.map(salon => ({ ...salon, patron_details: patronMap[salon.id] || [], categories: categoryMap[salon.id] || [] }));
    res.json(formattedSalons);
  } catch(err) { res.status(500).json({error: err.message}); }
});

app.put('/api/salons/:id', async (req, res) => {
  const { name, feeAmount, feeCurrency, startDate, endDate, website, resultsDate, isCircuit, awardsCount, cashPrize, circuitNumber, submissionType, hostCountryId, patronsData, categoryIds } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (patronsData && patronsData.length > 0) {
      const numbersToCheck = patronsData.map(p => p.number).filter(n => n && n.trim() !== '');
      if (numbersToCheck.length > 0) {
        const [existing] = await conn.query('SELECT patron_number FROM photo_salon_patrons WHERE patron_number IN (?) AND salon_id != ?', [numbersToCheck, req.params.id]);
        if (existing.length > 0) { await conn.rollback(); return res.status(400).json({ error: `Ezzel az azonosítóval (${existing[0].patron_number}) már létezik MÁSIK szalon a rendszerben!` }); }
      }
    }
    await conn.query('UPDATE photo_salons SET name=?, fee_amount=?, fee_currency=?, start_date=?, end_date=?, website=?, results_date=?, is_circuit=?, awards_count=?, cash_prize=?, circuit_number=?, submission_type=?, host_country_id=? WHERE id=?', [name, feeAmount || null, feeCurrency || 'EUR', startDate || null, endDate, website || null, resultsDate || null, isCircuit ? 1 : 0, awardsCount || 0, cashPrize || null, circuitNumber || null, submissionType || 'online', hostCountryId || null, req.params.id]);
    await conn.query('DELETE FROM photo_salon_patrons WHERE salon_id = ?', [req.params.id]);
    if (patronsData && patronsData.length > 0) {
      const pValues = patronsData.map(p => [req.params.id, p.id, p.number || null]);
      await conn.query('INSERT INTO photo_salon_patrons (salon_id, patron_id, patron_number) VALUES ?', [pValues]);
    }
    await conn.query('DELETE FROM photo_salon_categories WHERE salon_id = ?', [req.params.id]);
    if (categoryIds && categoryIds.length > 0) {
      const cValues = categoryIds.map(id => [req.params.id, id]);
      await conn.query('INSERT INTO photo_salon_categories (salon_id, category_id) VALUES ?', [cValues]);
    }
    await conn.commit();
    res.json({ success: true });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); } finally { conn.release(); }
});

app.post('/api/salons', async (req, res) => {
  const { name, feeAmount, feeCurrency, startDate, endDate, website, resultsDate, isCircuit, awardsCount, cashPrize, circuitNumber, submissionType, hostCountryId, patronsData, categoryIds } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (patronsData && patronsData.length > 0) {
      const numbersToCheck = patronsData.map(p => p.number).filter(n => n && n.trim() !== '');
      if (numbersToCheck.length > 0) {
        const [existing] = await conn.query('SELECT patron_number FROM photo_salon_patrons WHERE patron_number IN (?)', [numbersToCheck]);
        if (existing.length > 0) { await conn.rollback(); return res.status(400).json({ error: `Ezzel az azonosítóval (${existing[0].patron_number}) már létezik szalon a rendszerben!` }); }
      }
    }
    const [result] = await conn.query('INSERT INTO photo_salons (name, fee_amount, fee_currency, start_date, end_date, website, results_date, is_circuit, awards_count, cashPrize, circuit_number, submission_type, host_country_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [name, feeAmount || null, feeCurrency || 'EUR', startDate || null, endDate, website || null, resultsDate || null, isCircuit ? 1 : 0, awardsCount || 0, cashPrize || null, circuitNumber || null, submissionType || 'online', hostCountryId || null]);
    const salonId = result.insertId;
    if (patronsData && patronsData.length > 0) {
      const pValues = patronsData.map(p => [salonId, p.id, p.number || null]);
      await conn.query('INSERT INTO photo_salon_patrons (salon_id, patron_id, patron_number) VALUES ?', [pValues]);
    }
    if (categoryIds && categoryIds.length > 0) {
      const cValues = categoryIds.map(id => [salonId, id]);
      await conn.query('INSERT INTO photo_salon_categories (salon_id, category_id) VALUES ?', [cValues]);
    }
    await conn.commit();
    res.json({ success: true });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); } finally { conn.release(); }
});

app.delete('/api/salons/:id', async (req, res) => {
  try { await pool.query('DELETE FROM photo_salons WHERE id = ?', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

// ==========================================
// --- SAJÁT KÉPALBUM (PORTFÓLIÓ) KEZELÉSE VÉDVE! ---
// ==========================================
app.get('/api/my-album', checkPremium, async (req, res) => {
  try { 
    const query = `
      SELECT p.*, 
        COALESCE(SUM(CASE WHEN e.award_id IS NOT NULL AND e.award_id NOT IN (0, 1, 15) THEN 1 ELSE 0 END), 0) as award_count,
        COALESCE(SUM(CASE WHEN e.award_id = 1 OR (e.achieved_score >= e.acceptance_score AND (e.award_id IS NULL OR e.award_id != 15)) THEN 1 ELSE 0 END), 0) as acceptance_count
      FROM photo_portfolio p
      LEFT JOIN photo_salon_entries e ON p.id = e.portfolio_id
      WHERE p.user_email = ?
      GROUP BY p.id
      ORDER BY p.title ASC
    `;
    const [rows] = await pool.query(query, [req.query.userEmail]); 
    res.json(rows); 
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: 'Hiba a képek lekérésekor' }); 
  }
});

app.get('/api/my-portfolio-results', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT e.portfolio_id, s.name as salon_name, a.award_name, e.achieved_score, e.acceptance_score FROM photo_salon_entries e JOIN photo_salons s ON e.salon_id = s.id LEFT JOIN photo_awards a ON e.award_id = a.id WHERE e.user_email = ? AND (e.award_id IS NOT NULL OR e.achieved_score IS NOT NULL) ORDER BY s.end_date DESC`, [req.query.userEmail]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Hiba az eredmények lekérésekor' }); }
});

app.post('/api/my-album/upload', upload.single('photo'), checkPremium, async (req, res) => {

  const { userEmail, userName, title } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Nincs fájl kiválasztva!' });
  
  try {
    const fileStream = fs.createReadStream(file.path);
    const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
    
    const driveRes = await drive.files.create({ 
      requestBody: { name: `Portfolio_${userName}_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, 
      media: { mimeType: file.mimetype, body: fileStream }, 
      fields: 'id, webViewLink' 
    });
    
    cleanupTempFile(file);

    const fileSize = req.file.size; 
    await pool.query(
      'INSERT INTO photo_portfolio (user_email, user_name, title, file_url, drive_file_id, file_size) VALUES (?, ?, ?, ?, ?, ?)', 
      [userEmail, userName, title, driveRes.data.webViewLink, driveRes.data.id, fileSize]
    );

    res.json({ success: true });
  } catch (err) { 
    cleanupTempFile(file);
    res.status(500).json({ error: err.message }); 
  }
});

app.put('/api/my-album/:id', upload.single('photo'), checkPremium, async (req, res) => {
  const file = req.file;
  try {
    const { title, userEmail } = req.body; 
    const [rows] = await pool.query('SELECT * FROM photo_portfolio WHERE id = ? AND user_email = ?', [req.params.id, userEmail]);
    if (rows.length === 0) {
      cleanupTempFile(file);
      return res.status(403).json({ error: 'Nincs jogosultságod módosítani ezt a képet!' });
    }
    
    if (file) {
      if (rows[0].drive_file_id) await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(e => console.log('Régi kép törlése a Drive-ról sikertelen:', e.message));
      
      const fileStream = fs.createReadStream(file.path);
      const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
      const userName = rows[0].user_name || 'Ismeretlen';
      
      const driveRes = await drive.files.create({ 
        requestBody: { name: `Portfolio_${userName}_Frissitett_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, 
        media: { mimeType: file.mimetype, body: fileStream }, 
        fields: 'id, webViewLink' 
      });
      
      cleanupTempFile(file);

      await pool.query('UPDATE photo_portfolio SET title = ?, file_url = ?, drive_file_id = ? WHERE id = ? AND user_email = ?', [title, driveRes.data.webViewLink, driveRes.data.id, req.params.id, userEmail]);
    } else {
      await pool.query('UPDATE photo_portfolio SET title = ? WHERE id = ? AND user_email = ?', [title, req.params.id, userEmail]);
    }
    res.json({ success: true });
  } catch (err) { 
    cleanupTempFile(file);
    res.status(500).json({ error: 'Hiba a kép frissítésekor: ' + err.message }); 
  }
});

app.delete('/api/my-album/:id', checkPremium, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM photo_portfolio WHERE id = ? AND user_email = ?', [req.params.id, req.body.userEmail]);
    if (rows.length === 0) return res.status(403).json({ error: 'Nincs jogod!' });
    if (rows[0].drive_file_id) await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(e => console.log(e.message));
    await pool.query('DELETE FROM photo_portfolio WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba a törlésnél' }); }
});

app.get('/api/admin/user-storage-stats', async (req, res) => {
  try {
    const query = `
      SELECT user_email, COUNT(*) as total_photos, COALESCE(SUM(GREATEST(file_size, 0)), 0) as total_bytes
      FROM (
        SELECT user_email, file_size FROM photo_portfolio
        UNION ALL
        SELECT user_email, file_size FROM photo_entries
        UNION ALL
        SELECT user_email, file_size FROM photo_homework_entries
      ) as all_photos
      GROUP BY user_email
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('Hiba a tárhely lekérésekor:', err);
    res.status(500).json({ error: 'Szerver hiba' });
  }
});



// ==========================================
// --- VALÓDI AI KÉPELEMZÉS VÉDVE! ---
// ==========================================
app.post('/api/my-album/:id/analyze', checkPremium, async (req, res) => {
  const { userEmail } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM photo_portfolio WHERE id = ? AND user_email = ?', [req.params.id, userEmail]);
    if (rows.length === 0) return res.status(403).json({ error: 'Nincs jogosultságod vagy a kép nem található!' });
    const photo = rows[0];
    if (!photo.drive_file_id) return res.status(400).json({ error: 'Ehhez a képhez nem található fizikai fájl. Valószínűleg egy korábban feltöltött kép. Kérlek, töltsd fel újra a "Szerkesztés" gombra kattintva!' });

    const driveRes = await drive.files.get({ fileId: photo.drive_file_id, alt: 'media' }, { responseType: 'arraybuffer' });
    let imageBuffer = Buffer.from(driveRes.data);
    const base64Image = imageBuffer.toString('base64');
    
    // RAM AZONNALI FELSZABADÍTÁSA: 
    // Mivel a base64 string már megvan, a nyers buffereket kiürítjük, 
    // hogy a Node.js Garbage Collector ki tudja takarítani őket a memóriából.
    imageBuffer = null;
    driveRes.data = null;
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" } 
    });
    
    const prompt = `Te egy szigorú nemzetközi fotós zsűri vagy (FIAP/PSA szabályrendszer). Kérlek, elemezd ezt a fotót. 
KIZÁRÓLAG egy érvényes JSON objektumot adj vissza!
A JSON pontos struktúrája ez legyen:
{
  "evaluation": "Ide írj egy 2-3 mondatos magyar nyelvű, professzionális, őszinte zsűri értékelést. Térj ki a kompozícióra, fényekre, és a kategóriára. Ne használj idézőjeleket ezen a szövegen belül!",
  "tags": "ide jöjjön 6-8 angol kulcsszó vesszővel elválasztva (pl: monochrome, portrait)"
}`;
    
    const imagePart = { inlineData: { data: base64Image, mimeType: "image/jpeg" } };
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    let text = response.text();
    
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Az AI nem generált felismerhető JSON objektumot.");
    }
    
    text = text.substring(jsonStart, jsonEnd + 1);
    JSON.parse(text); 
    
    await pool.query('UPDATE photo_portfolio SET ai_tags = ? WHERE id = ?', [text, req.params.id]);
    res.json({ success: true, ai_tags: text });
  } catch (err) {
    console.error('Gemini / Rendszer hiba:', err.message);
    
    if (err.message.includes('503') || err.message.includes('high demand') || err.message.includes('overloaded')) {
      return res.status(503).json({ 
        error: 'Az AI szerverek jelenleg nagyon leterheltek a nagy érdeklődés miatt. Kérlek, próbáld meg az elemzést újra 1-2 perc múlva! 🤖⏳' 
      });
    }

    return res.status(500).json({ 
      error: 'Sajnos a mesterséges intelligencia jelenleg nem tudta kielemezni ezt a képet. Kérlek, próbáld újra később!' 
    });
  }
});

// ==========================================
// --- MAFOSZ MINŐSÍTÉS STATISZTIKA VÉDVE! ---
// ==========================================
app.get('/api/mafosz-progress', checkPremium, async (req, res) => {
  const userEmail = req.query.userEmail;
  try {
    const baseQuery = `
      FROM photo_salon_entries e 
      JOIN photo_salons s ON e.salon_id = s.id 
      JOIN photo_awards a ON e.award_id = a.id 
      JOIN photo_salon_patrons sp ON sp.salon_id = s.id 
      WHERE sp.patron_id = 3 
        AND e.user_email = ? 
        AND e.award_id IS NOT NULL 
        AND e.award_id > 0 
        AND a.award_name IS NOT NULL 
        AND TRIM(a.award_name) != ''
    `;
    
    const [accRows] = await pool.query(`SELECT SUM(CASE WHEN LOWER(a.award_name) != 'acceptance' THEN 2 ELSE 1 END) as total_acceptances ${baseQuery}`, [userEmail]);
    const [workRows] = await pool.query(`SELECT COUNT(DISTINCT e.portfolio_id) as distinct_works ${baseQuery}`, [userEmail]);
    const [awardRows] = await pool.query(`SELECT SUM(CASE WHEN LOWER(a.award_name) != 'acceptance' THEN 1 ELSE 0 END) as total_awards ${baseQuery}`, [userEmail]);
    
    res.json({ 
      acceptances: Number(accRows[0].total_acceptances) || 0, 
      works: Number(workRows[0].distinct_works) || 0, 
      awards: Number(awardRows[0].total_awards) || 0 
    });
  } catch (err) { 
    console.error('Hiba a MAFOSZ statisztika lekérésekor:', err);
    res.status(500).json({ error: err.message }); 
  }
});

// ==========================================
// --- MAFOSZ TÉTELES LISTA ---
// ==========================================
app.get('/api/mafosz-entries', checkPremium, async (req, res) => {
  const userEmail = req.query.userEmail;
  try {
    const [rows] = await pool.query(`
      SELECT 
        COALESCE(port.title, 'Ismeretlen / Törölt kép') as photo_title, 
        s.name as salon_name, 
        sp.patron_number as mafosz_number, 
        a.award_name as award, 
        s.submission_type, 
        port.drive_file_id, 
        port.file_url 
      FROM photo_salon_entries e 
      JOIN photo_salons s ON e.salon_id = s.id 
      JOIN photo_awards a ON e.award_id = a.id 
      JOIN photo_salon_patrons sp ON sp.salon_id = s.id 
      LEFT JOIN photo_portfolio port ON e.portfolio_id = port.id 
      WHERE sp.patron_id = 3 
        AND e.user_email = ? 
        AND e.award_id IS NOT NULL 
        AND e.award_id > 0 
        AND a.award_name IS NOT NULL 
        AND TRIM(a.award_name) != '' 
      ORDER BY s.name ASC, photo_title ASC
    `, [userEmail]);
    
    res.json(rows);
  } catch (err) { 
    console.error('Hiba a MAFOSZ tételes lista lekérésekor:', err);
    res.status(500).json({ error: err.message }); 
  }
});



// ==========================================
// --- FIAP MINŐSÍTÉS STATISZTIKA VÉDVE! ---
// ==========================================
app.get('/api/fiap-progress', checkPremium, async (req, res) => {
  const userEmail = req.query.userEmail;
  try {
    const baseWhere = `WHERE e.user_email = ? AND e.award_id IS NOT NULL AND e.award_id > 0 AND a.award_name IS NOT NULL AND TRIM(a.award_name) != '' AND EXISTS (SELECT 1 FROM photo_salon_patrons sp WHERE sp.salon_id = s.id AND sp.patron_id = 1)`;
    const [accRows] = await pool.query(`SELECT COALESCE(SUM(GREATEST(pre_2026_count, LEAST(pre_2026_count + post_2026_count, 10))), 0) as total_acceptances FROM (SELECT e.portfolio_id, SUM(CASE WHEN YEAR(s.end_date) < 2026 THEN 1 ELSE 0 END) as pre_2026_count, SUM(CASE WHEN YEAR(s.end_date) >= 2026 THEN 1 ELSE 0 END) as post_2026_count FROM photo_salon_entries e JOIN photo_salons s ON e.salon_id = s.id JOIN photo_awards a ON e.award_id = a.id ${baseWhere} GROUP BY e.portfolio_id) as sub`, [userEmail]);
    const [countryRows] = await pool.query(`SELECT COUNT(DISTINCT s.host_country_id) as distinct_countries FROM photo_salon_entries e JOIN photo_salons s ON e.salon_id = s.id JOIN photo_awards a ON e.award_id = a.id ${baseWhere}`, [userEmail]);
    const [workRows] = await pool.query(`SELECT COUNT(DISTINCT e.portfolio_id) as distinct_works FROM photo_salon_entries e JOIN photo_salons s ON e.salon_id = s.id JOIN photo_awards a ON e.award_id = a.id ${baseWhere}`, [userEmail]);
    res.json({ acceptances: Number(accRows[0].total_acceptances) || 0, countries: Number(countryRows[0].distinct_countries) || 0, works: Number(workRows[0].distinct_works) || 0 });
  } catch (err) { res.status(500).json({ error: 'Hiba a FIAP statisztika lekérésekor' }); }
});

app.get('/api/fiap-entries', checkPremium, async (req, res) => {
  const userEmail = req.query.userEmail;
  try {
    const [rows] = await pool.query(`SELECT COALESCE(p.title, 'Ismeretlen / Törölt kép') as photo_title, s.name as salon_name, c.country_hun as country, c.country_code as country_code, sp.patron_number as fiap_number, a.award_name as award, s.submission_type, p.drive_file_id, p.file_url FROM photo_salon_entries e JOIN photo_salons s ON e.salon_id = s.id JOIN photo_awards a ON e.award_id = a.id JOIN photo_salon_patrons sp ON sp.salon_id = s.id AND sp.patron_id = 1 LEFT JOIN photo_portfolio p ON e.portfolio_id = p.id LEFT JOIN photo_countries c ON s.host_country_id = c.id WHERE e.user_email = ? AND e.award_id IS NOT NULL AND e.award_id > 0 AND a.award_name IS NOT NULL AND TRIM(a.award_name) != '' ORDER BY s.name ASC, photo_title ASC`, [userEmail]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Hiba a FIAP tételes lista lekérésekor' }); }
});

// --- SZALON NEVEZÉSEK ÉS EGYÉB (PORTFÓLIÓBÓL) ---
app.get('/api/salon-entries/:salonId', async (req, res) => {
  try { const [rows] = await pool.query(`SELECT e.id as entry_id, e.category, e.award_id, e.achieved_score, e.acceptance_score, p.*, a.award_name FROM photo_salon_entries e JOIN photo_portfolio p ON e.portfolio_id = p.id LEFT JOIN photo_awards a ON e.award_id = a.id WHERE e.salon_id = ? AND e.user_email = ?`, [req.params.salonId, req.query.userEmail]); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba a nevezések lekérésekor' }); }
});
app.post('/api/salon-entries', async (req, res) => {
  const { salonId, userEmail, portfolioId, category } = req.body;
  try {
    const [existing] = await pool.query('SELECT * FROM photo_salon_entries WHERE salon_id = ? AND portfolio_id = ? AND user_email = ?', [salonId, portfolioId, userEmail]);
    if (existing.length > 0) return res.status(400).json({ error: 'Ezt a képet már nevezted erre a szalonra!' });
    await pool.query('INSERT INTO photo_salon_entries (salon_id, user_email, portfolio_id, category) VALUES (?, ?, ?, ?)', [salonId, userEmail, portfolioId, category]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba a nevezésnél' }); }
});
app.delete('/api/salon-entries/:id', async (req, res) => {
  try { await pool.query('DELETE FROM photo_salon_entries WHERE id = ? AND user_email = ?', [req.params.id, req.body.userEmail]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba a nevezés visszavonásakor' }); }
});
app.get('/api/my-salon-entries-status', async (req, res) => {
  try { const [rows] = await pool.query('SELECT DISTINCT salon_id FROM photo_salon_entries WHERE user_email = ?', [req.query.userEmail]); res.json(rows.map(r => r.salon_id)); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});
app.get('/api/awards', async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM photo_awards ORDER BY id ASC'); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});
app.put('/api/salon-entries/:id/results', async (req, res) => {
  const { awardId, achievedScore, acceptanceScore, userEmail } = req.body;
  try { await pool.query('UPDATE photo_salon_entries SET award_id = ?, achieved_score = ?, acceptance_score = ? WHERE id = ? AND user_email = ?', [awardId || null, achievedScore || null, acceptanceScore || null, req.params.id, userEmail]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba az eredmények mentésekor' }); }
});

app.post('/api/categories', async (req, res) => {
  try { await pool.query('INSERT INTO photo_categories (name, hun_name) VALUES (?, ?)', [req.body.name, req.body.hunName]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba a kategória létrehozásakor' }); }
});
app.put('/api/categories/:id', async (req, res) => {
  try { await pool.query('UPDATE photo_categories SET name = ?, hun_name = ? WHERE id = ?', [req.body.name, req.body.hunName, req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba a kategória frissítésekor' }); }
});
app.delete('/api/categories/:id', async (req, res) => {
  try { await pool.query('DELETE FROM photo_categories WHERE id = ?', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});
app.post('/api/awards', async (req, res) => {
  try { const [[{ nextId }]] = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 as nextId FROM photo_awards'); await pool.query('INSERT INTO photo_awards (id, award_name) VALUES (?, ?)', [nextId, req.body.awardName]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba a díj létrehozásakor' }); }
});
app.put('/api/awards/:id', async (req, res) => {
  try { await pool.query('UPDATE photo_awards SET award_name = ? WHERE id = ?', [req.body.awardName, req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba a díj frissítésekor' }); }
});
app.delete('/api/awards/:id', async (req, res) => {
  try { await pool.query('DELETE FROM photo_awards WHERE id = ?', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba a díj törlésekor' }); }
});

// --- FIAP IMPORT ROBOT ---
app.get('/api/admin/scrape-fiap', async (req, res) => {
  try {
    const [existingPatrons] = await pool.query('SELECT patron_number FROM photo_salon_patrons WHERE patron_id = 1 AND patron_number IS NOT NULL');
    const existingFiapNumbers = existingPatrons.map(p => p.patron_number);
    
    const response = await fetch('https://www.myfiap.net/patronages', { 
      method: 'GET',
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', 
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      } 
    });

    if (!response.ok) {
      throw new Error(`A FIAP szerver elutasította a kérést: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const scrapedSalons = [];
    
    $('table tbody tr').each((index, element) => {
      const tds = $(element).find('td');
      if (tds.length >= 11) {
        const fiapNumber = $(tds[0]).text().trim();
        if (fiapNumber && fiapNumber.includes('/') && !existingFiapNumbers.includes(fiapNumber)) {
          const typeRaw = $(tds[1]).text().trim();
          const sectionsRaw = $(tds[2]).text().trim();
          let name = $(tds[4]).text().trim(); if (!name) name = $(tds[3]).text().trim();
          const country = $(tds[5]).text().trim();    
          const feeRaw = $(tds[8]) ? $(tds[8]).text().trim() : ''; 
          const feeMatch = feeRaw.match(/\d+/);
          const fee = feeMatch ? feeMatch[0] : null;
          const deadlineStr = $(tds[10]) ? $(tds[10]).text().trim() : '';
          let website = $(tds[11]) ? $(tds[11]).text().trim() : '';
          if (website && !website.startsWith('http')) website = `https://${website}`;
          scrapedSalons.push({ fiap_number: fiapNumber, name: name || 'Névtelen Szalon', country: country, end_date_raw: deadlineStr, fee: fee, website: website, categories: sectionsRaw.split(',').map(c => c.trim()).filter(c => c), submission_type: typeRaw.includes('PI') ? 'online' : 'print', is_circuit: (name.toLowerCase().includes('circuit') || $(tds[3]).text().toLowerCase().includes('circuit')) ? 1 : 0 });
        }
      }
    });
    res.json(scrapedSalons);
  } catch (err) { 
    res.status(500).json({ error: `Hálózati hiba: ${err.message}` }); 
  }
});


app.post('/api/admin/import-fiap', async (req, res) => {
  const { salonsToImport } = req.body;
  if (!salonsToImport || salonsToImport.length === 0) return res.json({ count: 0 });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let importedCount = 0;
    const [dbCountries] = await conn.query('SELECT id, country, country_hun FROM photo_countries');
    const todayStr = new Date().toISOString().split('T')[0];
    for (const salon of salonsToImport) {
      if (salon.fiap_number) {
        const [existing] = await conn.query('SELECT salon_id FROM photo_salon_patrons WHERE patron_number = ?', [salon.fiap_number]);
        if (existing.length > 0) continue; 
      }
      const matchedCountry = dbCountries.find(c => c.country.toLowerCase() === salon.country.toLowerCase() || c.country_hun.toLowerCase() === salon.country.toLowerCase());
      const hostCountryId = matchedCountry ? matchedCountry.id : null;
      let formattedEndDate = null;
      if (salon.end_date_raw) {
        const d = new Date(salon.end_date_raw);
        if (!isNaN(d.getTime())) formattedEndDate = d.toISOString().split('T')[0];
      }
      const [insertResult] = await conn.query('INSERT INTO photo_salons (name, start_date, end_date, website, fee_amount, fee_currency, is_circuit, submission_type, host_country_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [salon.name, todayStr, formattedEndDate, salon.website, salon.fee, 'EUR', salon.is_circuit, salon.submission_type, hostCountryId]);
      await conn.query('INSERT INTO photo_salon_patrons (salon_id, patron_id, patron_number) VALUES (?, ?, ?)', [insertResult.insertId, 1, salon.fiap_number]);
      importedCount++;
    }
    await conn.commit();
    res.json({ count: importedCount, success: true });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); } finally { conn.release(); }
});

// ==========================================
// --- OKOS EXCEL IMPORTÁLÁS (FIAP/MAFOSZ) ---
// ==========================================

// 1. Fájl fogadása, Excel olvasás, AI normalizálás és DB ellenőrzés
app.post('/api/import/excel-analyze', upload.single('file'), checkPremium, async (req, res) => {
  const { userEmail } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Nincs fájl feltöltve!' });

  try {
    // Excel beolvasása a MAPPÁBÓL (lemezről), nem a RAM-ból
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0]; 
    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    // Töröljük is a lemezről, amint az xlsx csomag feldolgozta
    cleanupTempFile(req.file);

    if (rawData.length === 0) return res.status(400).json({ error: 'Az Excel táblázat üres vagy nem olvasható.' });
    
    const sampleData = rawData.slice(0, 150);

    // 2. Gemini AI Normalizálás
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Kaptál egy nyers JSON adatot, ami egy fotós FIAP/MAFOSZ pályázati eredményeit tartalmazza egy Excelből.
    A feladatod, hogy normalizáld ezt az adatot, és egy szigorú, egységes JSON tömböt (Array) adj vissza!
    
    Szabályok minden sorhoz:
    - "title": Keresd meg a kép címét (Image Title, Title, Photo, Image Name, stb.).
    - "fiapNumber": Keresd meg a FIAP vagy MAFOSZ azonosítót (pl. "2024/123", "FIAP Patronage", stb.). Ha nincs, hagyd üresen.
    - "award": Keresd meg az eredményt (Acceptance, Gold Medal, Ribbon, Elfogadás, stb.). Ha nincs, legyen "Acceptance".
    - "salonName": Keresd meg a Szalon nevét (Salon, Exhibition, stb.). HA NINCS BENNE konkrét szalonnév oszlop, akkor a "fiapNumber" alapján (a fotós tudásbázisodból) találd ki a pályázat nevét (pl. 'Oasis Photo Circuit')! Ha sehogy sem tudod, legyen "Ismeretlen Szalon".

    KIZÁRÓLAG egy érvényes JSON tömböt adj vissza, amiben ilyen objektumok vannak (szigorúan idézőjelek nélkül a kulcsokon belül):
    [{"title": "Kép címe", "fiapNumber": "2024/001", "award": "Acceptance", "salonName": "Szalon Neve 2024"}]

    Nyers adat:
    ${JSON.stringify(sampleData)}
    `;

    const result = await model.generateContent(prompt);
    let text = await result.response.text();
    
    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("Az AI nem generált érvényes listát.");
    
    const normalizedArray = JSON.parse(text.substring(jsonStart, jsonEnd + 1));

    // 3. Adatbázis ellenőrzés
    const processedResults = [];
    const [dbPortfolio] = await pool.query('SELECT id, title FROM photo_portfolio WHERE user_email = ?', [userEmail]);
    
    const [dbSalons] = await pool.query('SELECT s.id, s.name, sp.patron_number FROM photo_salons s JOIN photo_salon_patrons sp ON s.id = sp.salon_id WHERE sp.patron_number IS NOT NULL AND sp.patron_number != ""');
    
    const [dbEntries] = await pool.query('SELECT salon_id, portfolio_id FROM photo_salon_entries WHERE user_email = ?', [userEmail]);

    for (const item of normalizedArray) {
      const itemTitle = item.title ? item.title.trim() : '';
      const itemFiap = item.fiapNumber ? item.fiapNumber.trim() : '';
      
      let status = 'ready'; 
      let portfolioId = null;
      let salonId = null;
      let warnings = [];

      const matchedPhoto = dbPortfolio.find(p => p.title.toLowerCase() === itemTitle.toLowerCase());
      if (matchedPhoto) {
        portfolioId = matchedPhoto.id;
      } else {
        status = 'missing_photo'; 
        warnings.push('A kép nincs a portfóliódban (üres keretként jön létre).');
      }

      const matchedSalon = dbSalons.find(s => s.patron_number === itemFiap);
      if (matchedSalon) {
        salonId = matchedSalon.id;
        item.salonName = matchedSalon.name; 
      } else {
        if (status === 'ready') status = 'missing_salon'; 
        else status = 'missing_both';
        warnings.push('A szalon nem létezik, automatikusan létrejön.');
      }

      if (portfolioId && salonId) {
        const isDuplicate = dbEntries.find(e => e.salon_id === salonId && e.portfolio_id === portfolioId);
        if (isDuplicate) {
          status = 'duplicate'; 
          warnings = ['Ez az eredmény már szerepel a rendszerben!'];
        }
      }

      processedResults.push({
        ...item,
        status,
        warnings,
        portfolioId,
        salonId
      });
    }

    res.json(processedResults);

  } catch (err) {
    cleanupTempFile(req.file);
    console.error('Excel feldolgozási hiba:', err);
    res.status(500).json({ error: 'Hiba történt az Excel elemzésekor: ' + err.message });
  }
});

// 2. A jóváhagyott lista végleges mentése az Adatbázisba
app.post('/api/import/execute', checkPremium, async (req, res) => {
  const { userEmail, userName, items } = req.body; 
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [dbAwards] = await conn.query('SELECT id, award_name FROM photo_awards');

    for (const item of items) {
      if (item.status === 'duplicate' || item.skip) continue; 

      let finalSalonId = item.salonId;
      let finalPortfolioId = item.portfolioId;

      if (!finalSalonId) {
        const todayStr = new Date().toISOString().split('T')[0];
        const [insSalon] = await conn.query(
          'INSERT INTO photo_salons (name, start_date, end_date, submission_type) VALUES (?, ?, ?, ?)',
          [item.salonName || 'Importált Szalon', todayStr, todayStr, 'online']
        );
        finalSalonId = insSalon.insertId;
        
        if (item.fiapNumber) {
          await conn.query(
            'INSERT INTO photo_salon_patrons (salon_id, patron_id, patron_number) VALUES (?, ?, ?)',
            [finalSalonId, 1, item.fiapNumber]
          );
        }
      }

      if (!finalPortfolioId) {
        const [insPhoto] = await conn.query(
          'INSERT INTO photo_portfolio (user_email, user_name, title, file_url, drive_file_id) VALUES (?, ?, ?, ?, ?)',
          [userEmail, userName || 'Importált Felhasználó', item.title || 'Ismeretlen Kép', '', null]
        );
        finalPortfolioId = insPhoto.insertId;
      }

      let awardId = null;
      if (item.award) {
        const matchedAward = dbAwards.find(a => a.award_name.toLowerCase() === item.award.toLowerCase());
        if (matchedAward) {
          awardId = matchedAward.id;
        } else {
          const [[{ nextId }]] = await conn.query('SELECT COALESCE(MAX(id), 0) + 1 as nextId FROM photo_awards');
          await conn.query('INSERT INTO photo_awards (id, award_name) VALUES (?, ?)', [nextId, item.award]);
          awardId = nextId;
          dbAwards.push({ id: awardId, award_name: item.award }); 
        }
      }

      await conn.query(
        'INSERT INTO photo_salon_entries (salon_id, user_email, portfolio_id, award_id, category) VALUES (?, ?, ?, ?, ?)',
        [finalSalonId, userEmail, finalPortfolioId, awardId, 'Importált']
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (e) {
    await conn.rollback();
    console.error('Importálási hiba:', e);
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});


// ==========================================
// --- STRIPE: ÜGYFÉLKAPU (CUSTOMER PORTAL) LEMONDÁSHOZ ÉS KÁRTYACSERÉHEZ ---
// ==========================================
app.post('/api/create-portal-session', async (req, res) => {
  const { userEmail } = req.body;
  try {
    const [rows] = await pool.query('SELECT stripe_customer_id FROM photo_users WHERE email = ?', [userEmail]);
    
    if (rows.length === 0 || !rows[0].stripe_customer_id) {
      return res.status(400).json({ error: 'Ehhez a felhasználóhoz nem tartozik Stripe előfizetés!' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: rows[0].stripe_customer_id,
      return_url: req.headers.origin, 
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error('Stripe Portal Hiba:', e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Szerver fut a ${PORT} porton`));
