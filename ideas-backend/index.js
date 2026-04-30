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

const upload = multer({ storage: multer.memoryStorage() });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const PORT = process.env.PORT || 4000;

// Google Drive Auth
const oauth2Client = new google.auth.OAuth2(
  process.env.DRIVE_CLIENT_ID, process.env.DRIVE_CLIENT_SECRET, "https://developers.google.com/oauthplayground"
);
oauth2Client.setCredentials({ refresh_token: process.env.DRIVE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

// --- VÉGPONTOK ---

app.post('/api/auth/sync', async (req, res) => {
  const { email, name, sub } = req.body;
  try {
    await pool.query(
      `INSERT INTO photo_users (google_id, email, name, last_login) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE name = ?, last_login = NOW()`,
      [sub, email, name, name]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Adatbázis hiba' }); }
});

// Pályázatok lekérése (Dátumokkal és kategóriákkal)
app.get('/api/contests', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM photo_contests ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Hiba lekéréskor' }); }
});

// Saját nevezések lekérése
app.get('/api/my-entries', async (req, res) => {
  const { userEmail } = req.query;
  try {
    const [rows] = await pool.query('SELECT * FROM photo_entries WHERE user_email = ? ORDER BY created_at DESC', [userEmail]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Hiba a képek lekérésekor' }); }
});

// Új pályázat (Admin)
app.post('/api/contests', async (req, res) => {
  const { title, description, startDate, endDate, categories } = req.body;
  try {
    await pool.query(
      'INSERT INTO photo_contests (title, description, start_date, end_date, categories) VALUES (?, ?, ?, ?, ?)',
      [title, description, startDate, endDate, categories]
    );
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba mentéskor' }); }
});

// Kép feltöltése
app.post('/api/upload', upload.single('photo'), async (req, res) => {
  const { contestId, userEmail, userName, title, category } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'Nincs fájl!' });

  try {
    // Limit ellenőrzése
    const [countRows] = await pool.query(
      'SELECT COUNT(*) as count FROM photo_entries WHERE contest_id = ? AND user_email = ? AND category = ?',
      [contestId, userEmail, category]
    );
    if (countRows[0].count >= 4) {
      return res.status(400).json({ error: 'Elérted a maximum limitet (4 kép) ebben a kategóriában!' });
    }

    // Feltöltés Drive-ra
    const bufferStream = new Readable();
    bufferStream.push(file.buffer); bufferStream.push(null);

    const driveRes = await drive.files.create({
      requestBody: { name: `Nevezes_${contestId}_${userName}_${Date.now()}.jpg`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] },
      media: { mimeType: file.mimetype, body: bufferStream },
      fields: 'id, webViewLink'
    });

    // Mentés Adatbázisba
    await pool.query(
      'INSERT INTO photo_entries (contest_id, user_email, user_name, title, category, file_url, drive_file_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [contestId, userEmail, userName, title, category, driveRes.data.webViewLink, driveRes.data.id]
    );

    res.status(200).json({ success: true, message: 'Kép feltöltve!' });
  } catch (err) { res.status(500).json({ error: 'Feltöltési hiba' }); }
});

// Kép törlése
app.delete('/api/entries/:id', async (req, res) => {
  const entryId = req.params.id;
  const { userEmail } = req.body;
  try {
    // Ellenőrizzük, hogy tényleg az övé-e a kép, és lekérjük a Drive ID-t
    const [rows] = await pool.query('SELECT * FROM photo_entries WHERE id = ? AND user_email = ?', [entryId, userEmail]);
    if (rows.length === 0) return res.status(403).json({ error: 'Nincs jogosultságod törölni!' });
    
    const driveFileId = rows[0].drive_file_id;
    
    // Törlés Google Drive-ról
    if (driveFileId) {
      await drive.files.delete({ fileId: driveFileId }).catch(e => console.error("Drive törlési hiba (talán már nem létezik):", e.message));
    }

    // Törlés adatbázisból
    await pool.query('DELETE FROM photo_entries WHERE id = ?', [entryId]);
    res.json({ success: true, message: 'Kép sikeresen törölve!' });
  } catch (err) { res.status(500).json({ error: 'Törlési hiba' }); }
});

app.listen(PORT, () => console.log(`Szerver fut a ${PORT} porton`));
