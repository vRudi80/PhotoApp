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

const oauth2Client = new google.auth.OAuth2(process.env.DRIVE_CLIENT_ID, process.env.DRIVE_CLIENT_SECRET, "https://developers.google.com/oauthplayground");
oauth2Client.setCredentials({ refresh_token: process.env.DRIVE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

app.post('/api/auth/sync', async (req, res) => {
  const { email, name, sub } = req.body;
  try {
    await pool.query(`INSERT INTO photo_users (google_id, email, name, last_login) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE name = ?, last_login = NOW()`, [sub, email, name, name]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Adatbázis hiba' }); }
});

app.get('/api/users', async (req, res) => {
  try { const [rows] = await pool.query('SELECT email, name, club_name FROM photo_users ORDER BY name ASC'); res.json(rows); } 
  catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.put('/api/users/:email', async (req, res) => {
  try { await pool.query('UPDATE photo_users SET club_name = ? WHERE email = ?', [req.body.clubName || null, req.params.email]); res.json({ success: true }); } 
  catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

// --- ÚJ: KLUBOK VÉGPONTOK ---
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
// ----------------------------

app.get('/api/jury', async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM photo_jury'); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.post('/api/jury', async (req, res) => {
  try { await pool.query('INSERT IGNORE INTO photo_jury (contest_id, user_email) VALUES (?, ?)', [req.body.contestId, req.body.userEmail]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.delete('/api/jury', async (req, res) => {
  try { await pool.query('DELETE FROM photo_jury WHERE contest_id = ? AND user_email = ?', [req.body.contestId, req.body.userEmail]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.get('/api/contests', async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM photo_contests ORDER BY created_at DESC'); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.get('/api/my-entries', async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM photo_entries WHERE user_email = ? ORDER BY created_at DESC', [req.query.userEmail]); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.get('/api/admin/stats/:contestId', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_name, user_email, category, COUNT(*) as image_count FROM photo_entries WHERE contest_id = ? GROUP BY user_email, user_name, category ORDER BY user_name ASC, category ASC', [req.params.contestId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.post('/api/contests', async (req, res) => {
  const { title, description, startDate, endDate, categories, restrictedClub } = req.body;
  try {
    await pool.query('INSERT INTO photo_contests (title, description, start_date, end_date, categories, restricted_club) VALUES (?, ?, ?, ?, ?, ?)', [title, description, startDate, endDate, categories, restrictedClub]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.put('/api/contests/:id', async (req, res) => {
  const { title, description, startDate, endDate, categories, restrictedClub } = req.body;
  try {
    await pool.query('UPDATE photo_contests SET title = ?, description = ?, start_date = ?, end_date = ?, categories = ?, restricted_club = ? WHERE id = ?', [title, description, startDate, endDate, categories, restrictedClub, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.post('/api/upload', upload.single('photo'), async (req, res) => {
  const { contestId, userEmail, userName, title, category } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Nincs fájl kiválasztva!' });
  try {
    const [juryCheck] = await pool.query('SELECT * FROM photo_jury WHERE contest_id = ? AND user_email = ?', [contestId, userEmail]);
    if (juryCheck.length > 0) return res.status(403).json({ error: 'Zsűritagként nem nevezhetsz!' });
    const [countRows] = await pool.query('SELECT COUNT(*) as count FROM photo_entries WHERE contest_id = ? AND user_email = ? AND category = ?', [contestId, userEmail, category]);
    if (countRows[0].count >= 4) return res.status(400).json({ error: 'Elérted a 4 képes limitet!' });

    const bufferStream = new Readable(); bufferStream.push(file.buffer); bufferStream.push(null);
    const driveRes = await drive.files.create({ requestBody: { name: `Nevezes_${contestId}_${userName}_${Date.now()}.jpg`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, media: { mimeType: file.mimetype, body: bufferStream }, fields: 'id, webViewLink' });

    await pool.query('INSERT INTO photo_entries (contest_id, user_email, user_name, title, category, file_url, drive_file_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [contestId, userEmail, userName, title, category, driveRes.data.webViewLink, driveRes.data.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/entries/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM photo_entries WHERE id = ? AND user_email = ?', [req.params.id, req.body.userEmail]);
    if (rows.length === 0) return res.status(403).json({ error: 'Nincs jogod!' });
    if (rows[0].drive_file_id) {
      await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(e => console.log(e.message));
    }
    await pool.query('DELETE FROM photo_entries WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.get('/api/jury-entries/:contestId', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT e.id, e.title, e.category, e.file_url, e.drive_file_id FROM photo_entries e LEFT JOIN photo_votes v ON e.id = v.entry_id AND v.jury_email = ? WHERE e.contest_id = ? AND v.id IS NULL`, [req.query.userEmail, req.params.contestId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.post('/api/vote', async (req, res) => {
  const { entryId, juryEmail, score } = req.body;
  if (score < 0 || score > 100) return res.status(400).json({ error: 'Érvénytelen pontszám!' });
  try { await pool.query('INSERT INTO photo_votes (entry_id, jury_email, score) VALUES (?, ?, ?)', [entryId, juryEmail, score]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.get('/api/results/:contestId', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT e.id, e.title, e.category, e.file_url, e.drive_file_id, e.user_name, e.user_email, COALESCE(SUM(v.score), 0) as total_score, COUNT(v.id) as vote_count FROM photo_entries e LEFT JOIN photo_votes v ON e.id = v.entry_id WHERE e.contest_id = ? GROUP BY e.id ORDER BY e.category ASC, total_score DESC`, [req.params.contestId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.listen(PORT, () => console.log(`Szerver fut a ${PORT} porton`));
