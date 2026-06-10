const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const { google } = require('googleapis');
require('dotenv').config();
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const xlsx = require('xlsx');

const fs = require('fs');
const os = require('os');
const path = require('path');

// ==========================================
// 1. INICIALIZÁLÁSOK ÉS KAPCSOLATOK
// ==========================================
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const oauth2Client = new google.auth.OAuth2(process.env.DRIVE_CLIENT_ID, process.env.DRIVE_CLIENT_SECRET, "https://developers.google.com/oauthplayground");
oauth2Client.setCredentials({ refresh_token: process.env.DRIVE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

const app = express();
app.use(cors());

// ==========================================
// 2. STRIPE WEBHOOK (KÖTELEZŐEN AZ express.json ELÉ!)
// ==========================================
app.post('/api/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  if (!process.env.STRIPE_WEBHOOK_SECRET) return res.status(500).send('Webhook konfigurációs hiba a szerveren.');

  try { event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET); } 
  catch (err) { return res.status(400).send(`Webhook Error: ${err.message}`); }

  // --- 1. ESEMÉNY: Első feliratkozás (vagy pályázati díj) ---
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.metadata && session.metadata.type === 'contest_fee') {
      const contestId = session.metadata.contest_id; const userEmail = session.metadata.user_email;
      try {
        await pool.query('INSERT INTO photo_contest_payments (contest_id, user_email, stripe_session_id, status) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = ?', [contestId, userEmail, session.id, 'paid', 'paid']);
      } catch (err) { console.error('Adatbázis hiba:', err); }
    } else {
      const userEmail = session.customer_details ? session.customer_details.email : session.customer_email;
      const customerId = session.customer; const newSubscriptionId = session.subscription; 
      const premiumLevel = (session.metadata && session.metadata.tier === 'pro') ? 2 : 1; 
      try {
        if (customerId && newSubscriptionId) {
          const activeSubscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'active' });
          for (const sub of activeSubscriptions.data) { if (sub.id !== newSubscriptionId) await stripe.subscriptions.cancel(sub.id); }
        }
        const premiumUntil = new Date(); premiumUntil.setMonth(premiumUntil.getMonth() + 1);
        await pool.query('UPDATE photo_users SET is_premium = 1, premium_until = ?, stripe_customer_id = ?, premium_level = ? WHERE email = ? OR stripe_customer_id = ?', [premiumUntil, customerId, premiumLevel, userEmail, customerId]);
      } catch (err) { console.error('Hiba:', err); }
    }
  }

  // --- 2. ÚJ ESEMÉNY: Trial lejárat ÉS minden sikeres havi megújulás! ---
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object;
    
    // Csak a feliratkozáshoz tartozó számlákkal foglalkozunk (az egyszeri pályázati díjaknak nincs subscription-je)
    if (invoice.subscription) {
      const customerId = invoice.customer;
      
      // A Stripe másodpercben küldi a lejárati dátumot, a JS Date viszont ezredmásodpercet vár, ezért szorozzuk 1000-rel!
      const periodEnd = new Date(invoice.lines.data[0].period.end * 1000);
      
      try {
        // Frissítjük a felhasználót: aktív státuszban tartjuk, és beírjuk a Stripe által diktált hivatalos lejárati dátumot!
        await pool.query(
          'UPDATE photo_users SET is_premium = 1, premium_until = ? WHERE stripe_customer_id = ?', 
          [periodEnd, customerId]
        );
        console.log(`💰 Sikeres fizetés feldolgozva (${customerId}). Új lejárati dátum: ${periodEnd}`);
      } catch (err) { 
        console.error('Adatbázis hiba az invoice.paid feldolgozásakor:', err); 
      }
    }
  }

  // --- 3. ESEMÉNY: Lemondott / Megszakadt előfizetés ---
  // --- 3. ESEMÉNY: Lemondott / Megszakadt előfizetés ---
  if (event.type === 'customer.subscription.deleted') {
    const customerId = event.data.object.customer;
    try { 
      // 👑 JAVÍTVA: Nemcsak az is_premium-ot nullázzuk, hanem a lejárati dátumot is teljesen kiürítjük, így láncreakcióként minden kapu bezárul!
      await pool.query(
        'UPDATE photo_users SET is_premium = 0, premium_until = NULL WHERE stripe_customer_id = ?', 
        [customerId]
      ); 
      console.log(`❌ Előfizetés sikeresen lezárva az adatbázisban a Stripe jelzése alapján: ${customerId}`);
    } catch (err) { 
      console.error('Hiba a lemondás feldolgozásakor:', err); 
    }
  }
  
  res.send();
});

// ==========================================
// 3. MIDDLEWARE ÉS ALAP BEÁLLÍTÁSOK
// ==========================================
app.use(express.json()); 

const upload = multer({ dest: os.tmpdir() });
const cleanupTempFile = (file) => { if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path); };

const checkPremium = async (req, res, next) => {
  const userEmail = req.query.userEmail || req.body.userEmail;
  if (!userEmail) return res.status(400).json({ error: 'Felhasználói azonosító szükséges!' });
  try {
    const [rows] = await pool.query('SELECT is_premium, premium_until FROM photo_users WHERE email = ?', [userEmail]);
    if (rows.length > 0) {
      const user = rows[0]; const premiumUntil = user.premium_until ? new Date(user.premium_until) : null;
      if (user.is_premium === 1 && premiumUntil && premiumUntil > new Date()) return next(); 
    }
    return res.status(403).json({ error: 'PREMIUM_REQUIRED', message: 'Prémium előfizetés szükséges!' });
  } catch (err) { return res.status(500).json({ error: 'Hiba a jogosultság ellenőrzésekor.' }); }
};

// ====================================================================
  // 🔒 IDEIGLENES ADMIN ÚJRAKALKULÁLÓ VÉGPONT (Terminál nélküli futtatáshoz)
  // ====================================================================
  app.get('/api/admin/recalculate-scores-secret-997', async (req, res) => {
    
    // 📊 BELSŐ RANGPROGRESSZIÓS LOGIKA
    function getVoterPower(likes, victories) {
      if (likes < 30) return { super: 1, brilliant: 2 };
      if (likes < 100) return { super: 2, brilliant: 3 };
      if (likes < 250) return { super: 2, brilliant: 4 };
      if (likes < 500) return { super: 3, brilliant: 5 };
      if (likes < 800 || victories < 1) return { super: 3, brilliant: 6 };
      if (likes < 1300 || victories < 2) return { super: 4, brilliant: 7 };
      if (likes < 2000 || victories < 3) return { super: 4, brilliant: 8 };
      if (likes < 3200 || victories < 5) return { super: 5, brilliant: 10 };
      if (likes < 4800 || victories < 7) return { super: 5, brilliant: 12 };
      if (likes < 7000 || victories < 9) return { super: 6, brilliant: 14 };
      if (likes < 10000 || victories < 12) return { super: 7, brilliant: 17 };
      return { super: 8, brilliant: 20 };
    }

    console.log("🚀 Böngészőből indított kronologikus újraszámolás...");
    const virtualUsers = {};

    try {
      // 1. Témák időrendben
      const [topics] = await pool.query('SELECT id FROM weekly_topics ORDER BY id ASC');

      for (const topic of topics) {
        const topicId = topic.id;

        // 2. Szavazatok az entry-ken keresztül
        const [votes] = await pool.query(`
          SELECT v.id, v.entry_id, v.voter_email, v.vote_type 
          FROM weekly_votes v
          INNER JOIN weekly_entries e ON v.entry_id = e.id
          WHERE e.topic_id = ?
        `, [topicId]);

        // 3. Nevezések
        const [entries] = await pool.query(
          'SELECT id, user_email, views_count FROM weekly_entries WHERE topic_id = ?', 
          [topicId]
        );

        const entryScores = {};
        entries.forEach(e => { entryScores[e.id] = 0; });

        // 4. Szavazatok feldolgozása
        for (const vote of votes) {
          const voterEmail = vote.voter_email;
          const entryId = vote.entry_id;
          const type = vote.vote_type;

          if (entryScores[entryId] === undefined) continue;

          if (!virtualUsers[voterEmail]) {
            virtualUsers[voterEmail] = { totalLikes: 0, victories: 0 };
          }

          const currentPower = getVoterPower(
            virtualUsers[voterEmail].totalLikes, 
            virtualUsers[voterEmail].victories
          );

          if (type === 'master') {
            entryScores[entryId] += 10;
          } else if (type === 'brilliant') {
            entryScores[entryId] += currentPower.brilliant;
          } else if (type === 'super') {
            entryScores[entryId] += currentPower.super;
          }
        }

        // 5. Pontok mentése és virtuális egyenlegek követése
        let roundWinner = null;
        let maxScore = -1;
        let winnerViews = Infinity;

        for (const entry of entries) {
          const finalScore = entryScores[entry.id];
          
          await pool.query('UPDATE weekly_entries SET likes_count = ? WHERE id = ?', [finalScore, entry.id]);

          const ownerEmail = entry.user_email;
          if (!virtualUsers[ownerEmail]) virtualUsers[ownerEmail] = { totalLikes: 0, victories: 0 };
          virtualUsers[ownerEmail].totalLikes += finalScore;

          if (finalScore > maxScore) {
            maxScore = finalScore;
            winnerViews = Number(entry.views_count) || 0;
            roundWinner = ownerEmail;
          } else if (finalScore === maxScore && finalScore > 0) {
            const currentViews = Number(entry.views_count) || 0;
            if (currentViews < winnerViews) {
              winnerViews = currentViews;
              roundWinner = ownerEmail;
            }
          }
        }

        if (roundWinner && maxScore > 0) {
          virtualUsers[roundWinner].victories += 1;
        }
      }

      // 6. Profilok szinkronizálása a photo_users táblába
      for (const email in virtualUsers) {
        await pool.query(
          'UPDATE photo_users SET userTotalLikes = ?, userVictories = ? WHERE email = ?',
          [virtualUsers[email].totalLikes, virtualUsers[email].victories, email]
        );
      }

      // 🎯 VISSZAJELZÉS A BÖNGÉSZŐNEK (A process.exit() helyett ez kell, különben összeomlana a szerver!)
      res.json({ 
        success: true, 
        message: "Minden történelmi pontszám és rang sikeresen újra lett építve a szerveren!",
        processedUsersCount: Object.keys(virtualUsers).length 
      });

    } catch (error) {
      console.error("❌ Hiba:", error);
      res.status(500).json({ error: 'Súlyos hiba az újraszámítás közben: ' + error.message });
    }
  });


// ==========================================
// 4. KISZERVEZETT ÚTVONALAK (ROUTES) BEKÖTÉSE
// ==========================================
require('./routes/album')(app, pool, drive, genAI, upload, cleanupTempFile, checkPremium);
require('./routes/map')(app, pool, drive, upload, cleanupTempFile);
require('./routes/weekly')(app, pool, drive, upload, cleanupTempFile);
require('./routes/contests')(app, pool, drive, upload, cleanupTempFile);
require('./routes/homeworks')(app, pool, drive, upload, cleanupTempFile);
require('./routes/profile')(app, pool);

// Új fájlok:
require('./routes/users')(app, pool);
require('./routes/payments')(app, pool, stripe);
require('./routes/clubs')(app, pool, drive, upload, cleanupTempFile);
require('./routes/salons')(app, pool, checkPremium, genAI, xlsx, cheerio, upload, cleanupTempFile);
require('./routes/tickets')(app, pool);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Szerver fut a ${PORT} porton`));
