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

// Összes felhasználó lekérése (Zsűri választáshoz)
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT email, name FROM photo_users ORDER BY name ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Hiba lekéréskor' }); }
});

// Zsűrik lekérése
app.get('/api/jury', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM photo_jury');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

// Zsűritag hozzáadása
app.post('/api/jury', async (req, res) => {
  const { contestId, userEmail } = req.body;
  try {
    await pool.query('INSERT IGNORE INTO photo_jury (contest_id, user_email) VALUES (?, ?)', [contestId, userEmail]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

// Zsűritag törlése
app.delete('/api/jury', async (req, res) => {
  const { contestId, userEmail } = req.body;
  try {
    await pool.query('DELETE FROM photo_jury WHERE contest_id = ? AND user_email = ?', [contestId, userEmail]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.get('/api/contests', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM photo_contests ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Hiba lekéréskor' }); }
});

app.get('/api/my-entries', async (req, res) => {
  const { userEmail } = req.query;
  try {
    const [rows] = await pool.query('SELECT * FROM photo_entries WHERE user_email = ? ORDER BY created_at DESC', [userEmail]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Hiba a képek lekérésekor' }); }
});

app.post('/api/contests', async (req, res) => {
  const { title, description, startDate, endDate, categories } = req.body;
  try {
    await pool.query('INSERT INTO photo_contests (title, description, start_date, end_date, categories) VALUES (?, ?, ?, ?, ?)', [title, description, startDate, endDate, categories]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba mentéskor' }); }
});

app.put('/api/contests/:id', async (req, res) => {
  const { title, description, startDate, endDate, categories } = req.body;
  try {
    await pool.query('UPDATE photo_contests SET title = ?, description = ?, start_date = ?, end_date = ?, categories = ? WHERE id = ?', [title, description, startDate, endDate, categories, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

// Kép feltöltése (Zsűri védelemmel)
app.post('/api/upload', upload.single('photo'), async (req, res) => {
  const { contestId, userEmail, userName, title, category } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Nincs fájl!' });

  try {
    // 1. Biztonsági ellenőrzés: Zsűri nem tölthet fel!
    const [juryCheck] = await pool.query('SELECT * FROM photo_jury WHERE contest_id = ? AND user_email = ?', [contestId, userEmail]);
    if (juryCheck.length > 0) return res.status(403).json({ error: 'Zsűritagként nem nevezhetsz erre a pályázatra!' });

    // 2. Limit ellenőrzése
    const [countRows] = await pool.query('SELECT COUNT(*) as count FROM photo_entries WHERE contest_id = ? AND user_email = ? AND category = ?', [contestId, userEmail, category]);
    if (countRows[0].count >= 4) return res.status(400).json({ error: 'Elérted a 4 képes maximum limitet ebben a kategóriában!' });

    // 3. Feltöltés Drive-ra
    const bufferStream = new Readable();
    bufferStream.push(file.buffer); bufferStream.push(null);
    const driveRes = await drive.files.create({
      requestBody: { name: `Nevezes_${contestId}_${userName}_${Date.now()}.jpg`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] },
      media: { mimeType: file.mimetype, body: bufferStream }, fields: 'id, webViewLink'
    });

    // 4. Mentés Adatbázisba
    await pool.query(
      'INSERT INTO photo_entries (contest_id, user_email, user_name, title, category, file_url, drive_file_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [contestId, userEmail, userName, title, category, driveRes.data.webViewLink, driveRes.data.id]
    );
    res.json({ success: true, message: 'Kép feltöltve!' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Feltöltési hiba' }); }
});

app.delete('/api/entries/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM photo_entries WHERE id = ? AND user_email = ?', [req.params.id, req.body.userEmail]);
    if (rows.length === 0) return res.status(403).json({ error: 'Nincs jogosultságod!' });
    if (rows[0].drive_file_id) await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(e => console.log(e.message));
    await pool.query('DELETE FROM photo_entries WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Törlési hiba' }); }
});

app.listen(PORT, () => console.log(`Szerver fut a ${PORT} porton`));
