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

  if (event.type === 'customer.subscription.deleted') {
    const customerId = event.data.object.customer;
    try { await pool.query('UPDATE photo_users SET is_premium = 0 WHERE stripe_customer_id = ?', [customerId]); } catch (err) { console.error('Hiba:', err); }
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Szerver fut a ${PORT} porton`));
