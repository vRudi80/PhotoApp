const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Fájlfeltöltéshez a memóriát használjuk
const upload = multer({ storage: multer.memoryStorage() });

// Adatbázis kapcsolat
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const PORT = process.env.PORT || 4000;

// --- API VÉGPONTOK ---

app.get('/api/status', (req, res) => {
  res.json({ status: 'online', message: 'PhotoApp Backend fut!' });
});

// Felhasználó szinkronizálása bejelentkezéskor
app.post('/api/auth/sync', async (req, res) => {
  const { email, name, sub } = req.body;
  try {
    await pool.query(
      `INSERT INTO photo_users (google_id, email, name, last_login) 
       VALUES (?, ?, ?, NOW()) 
       ON DUPLICATE KEY UPDATE name = ?, last_login = NOW()`,
      [sub, email, name, name]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Hiba user mentésekor:', err);
    res.status(500).json({ error: 'Adatbázis hiba a belépésnél' });
  }
});

// 1. Pályázatok lekérése
app.get('/api/contests', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM photo_contests ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Hiba lekéréskor:', err);
    res.status(500).json({ error: 'Adatbázis hiba' });
  }
});

// 2. Új pályázat létrehozása (Admin)
app.post('/api/contests', async (req, res) => {
  const { title, description } = req.body;
  try {
    await pool.query(
      'INSERT INTO photo_contests (title, description) VALUES (?, ?)',
      [title, description]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Hiba pályázat létrehozásakor:', err);
    res.status(500).json({ error: 'Hiba mentéskor', details: err.message });
  }
});

// 3. Kép feltöltése (Később ide jön a Drive logika)
app.post('/api/upload', upload.single('photo'), async (req, res) => {
  const { contestId, userEmail, userName } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Nincs fájl kiválasztva!' });
  try {
    const fakeDriveUrl = `https://drive.google.com/fake-link-${Date.now()}`;
    await pool.query(
      'INSERT INTO photo_entries (contest_id, user_email, user_name, file_url) VALUES (?, ?, ?, ?)',
      [contestId, userEmail, userName, fakeDriveUrl]
    );
    res.status(200).json({ success: true, message: 'Feltöltve' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Hiba a feltöltés során' });
  }
});

// Szerver indítása
app.listen(PORT, () => {
  console.log(`Szerver fut a ${PORT} porton`);
});
