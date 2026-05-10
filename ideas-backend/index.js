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
  try { const [rows] = await pool.query('SELECT email, name, club_name, club_role, last_login FROM photo_users ORDER BY name ASC'); res.json(rows); } 
  catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.put('/api/users/:email', async (req, res) => {
  try { await pool.query('UPDATE photo_users SET club_name = ?, club_role = ? WHERE email = ?', [req.body.clubName || null, req.body.clubRole || 'member', req.params.email]); res.json({ success: true }); } 
  catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

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
    const [rows] = await pool.query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM photo_entries WHERE contest_id = c.id) as entry_count,
        (SELECT COUNT(*) FROM photo_jury WHERE contest_id = c.id) as jury_count,
        (SELECT COUNT(*) FROM photo_votes v JOIN photo_entries e ON v.entry_id = e.id WHERE e.contest_id = c.id) as vote_count
      FROM photo_contests c 
      ORDER BY c.created_at DESC
    `); 
    res.json(rows); 
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.post('/api/contests', async (req, res) => {
  const { title, description, startDate, endDate, categories, restrictedClub } = req.body;
  try { await pool.query('INSERT INTO photo_contests (title, description, start_date, end_date, categories, restricted_club) VALUES (?, ?, ?, ?, ?, ?)', [title, description, startDate, endDate, categories, restrictedClub]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.put('/api/contests/:id', async (req, res) => {
  const { title, description, startDate, endDate, categories, restrictedClub } = req.body;
  try { await pool.query('UPDATE photo_contests SET title = ?, description = ?, start_date = ?, end_date = ?, categories = ?, restricted_club = ? WHERE id = ?', [title, description, startDate, endDate, categories, restrictedClub, req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.delete('/api/contests/:id', async (req, res) => {
  try {
    const [entries] = await pool.query('SELECT drive_file_id FROM photo_entries WHERE contest_id = ? AND drive_file_id IS NOT NULL', [req.params.id]);
    for (const entry of entries) {
      await drive.files.delete({ fileId: entry.drive_file_id }).catch(e => console.log('Drive törlési hiba:', e.message));
    }
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
    if (juryCheck.length > 0) return res.status(403).json({ error: 'Zsűritagként nem nevezhetsz!' });
    const [countRows] = await pool.query('SELECT COUNT(*) as count FROM photo_entries WHERE contest_id = ? AND user_email = ? AND category = ?', [contestId, userEmail, category]);
    if (countRows[0].count >= 4) return res.status(400).json({ error: 'Elérted a 4 képes limitet!' });

    const bufferStream = new Readable(); bufferStream.push(file.buffer); bufferStream.push(null);
    const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
    const driveRes = await drive.files.create({ requestBody: { name: `Nevezes_${contestId}_${userName}_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, media: { mimeType: file.mimetype, body: bufferStream }, fields: 'id, webViewLink' });

    await pool.query('INSERT INTO photo_entries (contest_id, user_email, user_name, title, category, file_url, drive_file_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [contestId, userEmail, userName, title, category, driveRes.data.webViewLink, driveRes.data.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
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
    const [stats] = await pool.query(`
      SELECT j.user_email, COALESCE(v.voted_count, 0) as voted_count
      FROM photo_jury j
      LEFT JOIN (SELECT pv.jury_email, COUNT(*) as voted_count FROM photo_votes pv JOIN photo_entries pe ON pv.entry_id = pe.id WHERE pe.contest_id = ? GROUP BY pv.jury_email) v ON j.user_email = v.jury_email
      WHERE j.contest_id = ?
    `, [contestId, contestId]);
    res.json({ total_entries: total_entries || 0, stats });
  } catch (err) { res.status(500).json({ error: 'Hiba a statisztika lekérésekor' }); }
});

app.get('/api/jury-entries/:contestId', async (req, res) => {
  try { const [rows] = await pool.query(`SELECT e.id, e.title, e.category, e.file_url, e.drive_file_id FROM photo_entries e LEFT JOIN photo_votes v ON e.id = v.entry_id AND v.jury_email = ? WHERE e.contest_id = ? AND v.id IS NULL`, [req.query.userEmail, req.params.contestId]); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.post('/api/vote', async (req, res) => {
  if (req.body.score < 0 || req.body.score > 100) return res.status(400).json({ error: 'Érvénytelen pontszám!' });
  try { await pool.query('INSERT INTO photo_votes (entry_id, jury_email, score) VALUES (?, ?, ?)', [req.body.entryId, req.body.juryEmail, req.body.score]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.get('/api/results/:contestId', async (req, res) => {
  try { const [rows] = await pool.query(`SELECT e.id, e.title, e.category, e.file_url, e.drive_file_id, e.user_name, e.user_email, COALESCE(SUM(v.score), 0) as total_score, COUNT(v.id) as vote_count FROM photo_entries e LEFT JOIN photo_votes v ON e.id = v.entry_id WHERE e.contest_id = ? GROUP BY e.id ORDER BY e.category ASC, total_score DESC`, [req.params.contestId]); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
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
      const bufferStream = new Readable(); bufferStream.push(file.buffer); bufferStream.push(null);
      const fileExt = file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
      const driveRes = await drive.files.create({ requestBody: { name: `Klubest_Cover_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, media: { mimeType: file.mimetype, body: bufferStream }, fields: 'id, webViewLink' });
      fileUrl = driveRes.data.webViewLink; driveFileId = driveRes.data.id;
    }
    await pool.query('INSERT INTO photo_club_meetings (club_id, meeting_date, meeting_time, topic, description, location_type, location_details, file_url, drive_file_id, video_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [clubId, date, time, topic, description, locationType, locationDetails, fileUrl, driveFileId, videoLink || null]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/meetings/:id', upload.single('coverPhoto'), async (req, res) => {
  const { date, time, topic, description, locationType, locationDetails, videoLink } = req.body;
  const file = req.file;
  try {
    if (file) {
      const bufferStream = new Readable(); bufferStream.push(file.buffer); bufferStream.push(null);
      const fileExt = file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
      const driveRes = await drive.files.create({ requestBody: { name: `Klubest_Cover_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, media: { mimeType: file.mimetype, body: bufferStream }, fields: 'id, webViewLink' });
      await pool.query('UPDATE photo_club_meetings SET meeting_date=?, meeting_time=?, topic=?, description=?, location_type=?, location_details=?, file_url=?, drive_file_id=?, video_link=? WHERE id=?', [date, time, topic, description, locationType, locationDetails, driveRes.data.webViewLink, driveRes.data.id, videoLink || null, req.params.id]);
    } else {
      await pool.query('UPDATE photo_club_meetings SET meeting_date=?, meeting_time=?, topic=?, description=?, location_type=?, location_details=?, video_link=? WHERE id=?', [date, time, topic, description, locationType, locationDetails, videoLink || null, req.params.id]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/meetings/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT drive_file_id FROM photo_club_meetings WHERE id = ?', [req.params.id]);
    if (rows.length > 0 && rows[0].drive_file_id) await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(e => console.log(e.message));
    await pool.query('DELETE FROM photo_club_meetings WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
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

// --- ÚJ / FRISSÍTETT: HÁZI FELADATOK ---
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
  try { const [rows] = await pool.query('SELECT e.* FROM photo_homework_entries e JOIN photo_homeworks h ON e.homework_id = h.id WHERE h.club_id = ? ORDER BY e.created_at DESC', [req.params.clubId]); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.post('/api/upload-homework', upload.single('photo'), async (req, res) => {
  const { homeworkId, userEmail, userName, title } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Nincs fájl kiválasztva!' });
  try {
    // Lekérjük a dinamikus limitet
    const [hwRows] = await pool.query('SELECT max_images FROM photo_homeworks WHERE id = ?', [homeworkId]);
    if (hwRows.length === 0) return res.status(404).json({ error: 'A házi feladat nem található!' });
    const maxImages = hwRows[0].max_images;

    const [countRows] = await pool.query('SELECT COUNT(*) as count FROM photo_homework_entries WHERE homework_id = ? AND user_email = ?', [homeworkId, userEmail]);
    if (countRows[0].count >= maxImages) return res.status(400).json({ error: `Elérted a maximálisan feltölthető ${maxImages} képes limitet!` });

    const bufferStream = new Readable(); bufferStream.push(file.buffer); bufferStream.push(null);
    const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
    const driveRes = await drive.files.create({ requestBody: { name: `Hazi_${homeworkId}_${userName}_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, media: { mimeType: file.mimetype, body: bufferStream }, fields: 'id, webViewLink' });

    await pool.query('INSERT INTO photo_homework_entries (homework_id, user_email, user_name, title, file_url, drive_file_id) VALUES (?, ?, ?, ?, ?, ?)', [homeworkId, userEmail, userName, title, driveRes.data.webViewLink, driveRes.data.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
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

app.listen(PORT, () => console.log(`Szerver fut a ${PORT} porton`));
