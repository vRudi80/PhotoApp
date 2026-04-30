const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const { google } = require('googleapis');
const { Readable } = require('stream');
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

// --- GOOGLE DRIVE BEÁLLÍTÁS ---
const oauth2Client = new google.auth.OAuth2(
  process.env.DRIVE_CLIENT_ID,
  process.env.DRIVE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: process.env.DRIVE_REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

// --- API VÉGPONTOK ---

app.get('/api/status', (req, res) => {
  res.json({ status: 'online', message: 'PhotoApp Backend fut!' });
});

// Felhasználó szinkronizálása
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

// Pályázatok lekérése
app.get('/api/contests', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM photo_contests ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Hiba lekéréskor:', err);
    res.status(500).json({ error: 'Adatbázis hiba' });
  }
});

// Új pályázat létrehozása (Admin)
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

// Kép feltöltése Google Drive-ra
app.post('/api/upload', upload.single('photo'), async (req, res) => {
  const { contestId, userEmail, userName } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'Nincs fájl kiválasztva!' });

  try {
    // 1. Buffer átalakítása Stream-mé (hogy a Google API meg tudja enni)
    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);

    // 2. Fájl adatai a Drive számára
    const fileMetadata = {
      name: `Nevezes_${contestId}_${userName}_${Date.now()}.jpg`,
      parents: [process.env.DRIVE_MASTER_FOLDER_ID] // Ide menti
    };

    const media = {
      mimeType: file.mimetype,
      body: bufferStream
    };

    // 3. Feltöltés indítása
    console.log("Feltöltés indítása a Drive-ra...");
    const driveRes = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    });

    const fileUrl = driveRes.data.webViewLink;
    console.log("Sikeres Drive feltöltés! Link:", fileUrl);

    // 4. Mentés az adatbázisba
    await pool.query(
      'INSERT INTO photo_entries (contest_id, user_email, user_name, file_url) VALUES (?, ?, ?, ?)',
      [contestId, userEmail, userName, fileUrl]
    );

    res.status(200).json({ success: true, message: 'Kép sikeresen feltöltve a Drive-ra!' });
  } catch (err) {
    console.error('Hiba a feltöltés során:', err);
    res.status(500).json({ error: 'Hiba a feltöltés során', details: err.message });
  }
});

// Szerver indítása
app.listen(PORT, () => {
  console.log(`Szerver fut a ${PORT} porton`);
});
