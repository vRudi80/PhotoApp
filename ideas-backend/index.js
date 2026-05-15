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
  try { 
    const [rows] = await pool.query('SELECT email, name, club_name, club_role, last_login FROM photo_users ORDER BY last_login DESC'); 
    res.json(rows); 
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.put('/api/users/:email', async (req, res) => {
  try { 
    await pool.query('UPDATE photo_users SET club_name = ?, club_role = ? WHERE email = ?', [req.body.clubName || null, req.body.clubRole || 'member', req.params.email]); 
    res.json({ success: true }); 
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
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
      const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
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
      const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
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
    const [rows] = await pool.query(`
      SELECT e.*, 
        (SELECT COUNT(*) FROM photo_homework_likes WHERE entry_id = e.id) as like_count,
        (SELECT COUNT(*) FROM photo_homework_likes WHERE entry_id = e.id AND user_email = ?) as user_liked
      FROM photo_homework_entries e 
      JOIN photo_homeworks h ON e.homework_id = h.id 
      WHERE h.club_id = ? 
      ORDER BY e.created_at DESC
    `, [userEmail, req.params.clubId]); 
    res.json(rows); 
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.post('/api/upload-homework', upload.single('photo'), async (req, res) => {
  const { homeworkId, userEmail, userName, title } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Nincs fájl kiválasztva!' });
  try {
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

// --- NEMZETKÖZI SZALONOK ---
app.get('/api/countries', async (req, res) => {
  try { const [rows] = await pool.query('SELECT id, country, country_hun, country_code FROM photo_countries WHERE is_active = 1 ORDER BY country_hun ASC'); res.json(rows); } 
  catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.get('/api/categories', async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM photo_categories ORDER BY hun_name ASC'); res.json(rows); } 
  catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.get('/api/patrons', async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM photo_patrons ORDER BY name ASC'); res.json(rows); } 
  catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

app.get('/api/salons', async (req, res) => {
  try {
    const [salons] = await pool.query(`
      SELECT s.*, c.country_hun, c.country_code 
      FROM photo_salons s 
      LEFT JOIN photo_countries c ON s.host_country_id = c.id 
      ORDER BY s.end_date DESC
    `);

    const [patrons] = await pool.query(`
      SELECT sp.salon_id, p.name, sp.patron_number 
      FROM photo_salon_patrons sp 
      JOIN photo_patrons p ON sp.patron_id = p.id
    `);

    const [categories] = await pool.query(`
      SELECT sc.salon_id, cat.hun_name, cat.name 
      FROM photo_salon_categories sc 
      JOIN photo_categories cat ON sc.category_id = cat.id
    `);

    const patronMap = {};
    patrons.forEach(p => {
      if (!patronMap[p.salon_id]) patronMap[p.salon_id] = [];
      patronMap[p.salon_id].push({ name: p.name, number: p.patron_number });
    });

    const categoryMap = {};
    categories.forEach(c => {
      if (!categoryMap[c.salon_id]) categoryMap[c.salon_id] = [];
      categoryMap[c.salon_id].push(c.hun_name || c.name);
    });

    const formattedSalons = salons.map(salon => ({
      ...salon,
      patron_details: patronMap[salon.id] || [],
      categories: categoryMap[salon.id] || []
    }));

    res.json(formattedSalons);
  } catch(err) { 
    console.error(err);
    res.status(500).json({error: err.message}); 
  }
});

// A JAVÍTOTT PUT (Szalon szerkesztése) VÉGPONT, már a GET-en kívül!
app.put('/api/salons/:id', async (req, res) => {
  const { name, feeAmount, feeCurrency, startDate, endDate, website, resultsDate, isCircuit, awardsCount, cashPrize, circuitNumber, submissionType, hostCountryId, patronsData, categoryIds } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    await conn.query(
      'UPDATE photo_salons SET name=?, fee_amount=?, fee_currency=?, start_date=?, end_date=?, website=?, results_date=?, is_circuit=?, awards_count=?, cash_prize=?, circuit_number=?, submission_type=?, host_country_id=? WHERE id=?',
      [name, feeAmount || null, feeCurrency || 'EUR', startDate || null, endDate, website || null, resultsDate || null, isCircuit ? 1 : 0, awardsCount || 0, cashPrize || null, circuitNumber || null, submissionType || 'online', hostCountryId || null, req.params.id]
    );

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
  } catch (e) { 
    await conn.rollback(); 
    res.status(500).json({ error: e.message }); 
  } finally { 
    conn.release(); 
  }
});

app.post('/api/salons', async (req, res) => {
  const { name, feeAmount, feeCurrency, startDate, endDate, website, resultsDate, isCircuit, awardsCount, cashPrize, circuitNumber, submissionType, hostCountryId, patronsData, categoryIds } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO photo_salons (name, fee_amount, fee_currency, start_date, end_date, website, results_date, is_circuit, awards_count, cash_prize, circuit_number, submission_type, host_country_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, feeAmount || null, feeCurrency || 'EUR', startDate || null, endDate, website || null, resultsDate || null, isCircuit ? 1 : 0, awardsCount || 0, cashPrize || null, circuitNumber || null, submissionType || 'online', hostCountryId || null]
    );
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
  try { await pool.query('DELETE FROM photo_salons WHERE id = ?', [req.params.id]); res.json({ success: true }); } 
  catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

// ==========================================
// --- SAJÁT KÉPALBUM (PORTFÓLIÓ) KEZELÉSE ---
// ==========================================

app.get('/api/my-album', async (req, res) => {
  try { 
    const [rows] = await pool.query('SELECT * FROM photo_portfolio WHERE user_email = ? ORDER BY title ASC', [req.query.userEmail]); 
    res.json(rows); 
  } catch (err) { 
    res.status(500).json({ error: 'Hiba a képek lekérésekor' }); 
  }
});

// --- ÚJ: A portfólióhoz tartozó elért eredmények lekérése ---
app.get('/api/my-portfolio-results', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.portfolio_id, s.name as salon_name, a.award_name, e.achieved_score, e.acceptance_score 
      FROM photo_salon_entries e 
      JOIN photo_salons s ON e.salon_id = s.id 
      LEFT JOIN photo_awards a ON e.award_id = a.id 
      WHERE e.user_email = ? AND (e.award_id IS NOT NULL OR e.achieved_score IS NOT NULL)
      ORDER BY s.end_date DESC
    `, [req.query.userEmail]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Hiba az eredmények lekérésekor' });
  }
});

app.post('/api/my-album/upload', upload.single('photo'), async (req, res) => {
  const { userEmail, userName, title } = req.body;
  const file = req.file;
  
  if (!file) return res.status(400).json({ error: 'Nincs fájl kiválasztva!' });
  
  try {
    const bufferStream = new Readable(); 
    bufferStream.push(file.buffer); 
    bufferStream.push(null);
    
    const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
    
    const driveRes = await drive.files.create({ 
      requestBody: { 
        name: `Portfolio_${userName}_${Date.now()}${fileExt}`, 
        parents: [process.env.DRIVE_MASTER_FOLDER_ID] 
      }, 
      media: { mimeType: file.mimetype, body: bufferStream }, 
      fields: 'id, webViewLink' 
    });

    await pool.query(
      'INSERT INTO photo_portfolio (user_email, user_name, title, file_url, drive_file_id) VALUES (?, ?, ?, ?, ?)', 
      [userEmail, userName, title, driveRes.data.webViewLink, driveRes.data.id]
    );
    
    res.json({ success: true });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

app.put('/api/my-album/:id', upload.single('photo'), async (req, res) => {
  try {
    const { title, userEmail } = req.body;
    const file = req.file;

    // 1. Ellenőrizzük, hogy a useré-e a kép
    const [rows] = await pool.query('SELECT * FROM photo_portfolio WHERE id = ? AND user_email = ?', [req.params.id, userEmail]);
    if (rows.length === 0) return res.status(403).json({ error: 'Nincs jogosultságod módosítani ezt a képet!' });

    if (file) {
      // 2. Ha küldtek új képet, töröljük a régit a Drive-ról (ha volt neki drive_file_id-ja)
      if (rows[0].drive_file_id) {
        await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(e => console.log('Régi kép törlése a Drive-ról sikertelen:', e.message));
      }

      // 3. Feltöltjük az új képet a Drive-ra
      const bufferStream = new Readable(); 
      bufferStream.push(file.buffer); 
      bufferStream.push(null);
      
      const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
      const userName = rows[0].user_name || 'Ismeretlen';
      
      const driveRes = await drive.files.create({ 
        requestBody: { 
          name: `Portfolio_${userName}_Frissitett_${Date.now()}${fileExt}`, 
          parents: [process.env.DRIVE_MASTER_FOLDER_ID] 
        }, 
        media: { mimeType: file.mimetype, body: bufferStream }, 
        fields: 'id, webViewLink' 
      });

      // 4. Adatbázis frissítése (új cím + új kép URL és ID)
      await pool.query(
        'UPDATE photo_portfolio SET title = ?, file_url = ?, drive_file_id = ? WHERE id = ? AND user_email = ?',
        [title, driveRes.data.webViewLink, driveRes.data.id, req.params.id, userEmail]
      );
    } else {
      // 5. Ha nincs új kép, csak a címet frissítjük a régi logika alapján
      await pool.query('UPDATE photo_portfolio SET title = ? WHERE id = ? AND user_email = ?', [title, req.params.id, userEmail]);
    }

    res.json({ success: true });
  } catch (err) { 
    res.status(500).json({ error: 'Hiba a kép frissítésekor: ' + err.message }); 
  }
});

app.delete('/api/my-album/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM photo_portfolio WHERE id = ? AND user_email = ?', [req.params.id, req.body.userEmail]);
    if (rows.length === 0) return res.status(403).json({ error: 'Nincs jogod!' });
    
    if (rows[0].drive_file_id) {
      await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(e => console.log(e.message));
    }
    
    await pool.query('DELETE FROM photo_portfolio WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { 
    res.status(500).json({ error: 'Hiba a törlésnél' }); 
  }
});
// ==========================================
// --- FIAP MINŐSÍTÉS STATISZTIKA ---
// ==========================================
app.get('/api/fiap-progress', async (req, res) => {
  const userEmail = req.query.userEmail;
  try {
    // Közös feltétel: A felhasználó e-mailje + Érvényes díj + DÍJ NEVE NEM ÜRES (kizárja a 15-ös ID-t / elutasítottakat) + CSAK FIAP
    const baseWhere = `
      WHERE e.user_email = ? 
        AND e.award_id IS NOT NULL 
        AND e.award_id > 0
        AND a.award_name IS NOT NULL 
        AND TRIM(a.award_name) != '' 
        AND EXISTS (
          SELECT 1 FROM photo_salon_patrons sp 
          WHERE sp.salon_id = s.id AND sp.patron_id = 1
        )
    `;

    // 1. Elfogadások kiszámítása a 2026-os és a 10-es szabállyal
    const [accRows] = await pool.query(`
      SELECT COALESCE(SUM(
        GREATEST(pre_2026_count, LEAST(pre_2026_count + post_2026_count, 10))
      ), 0) as total_acceptances
      FROM (
        SELECT 
          e.portfolio_id,
          SUM(CASE WHEN YEAR(s.end_date) < 2026 THEN 1 ELSE 0 END) as pre_2026_count,
          SUM(CASE WHEN YEAR(s.end_date) >= 2026 THEN 1 ELSE 0 END) as post_2026_count
        FROM photo_salon_entries e
        JOIN photo_salons s ON e.salon_id = s.id
        JOIN photo_awards a ON e.award_id = a.id
        ${baseWhere}
        GROUP BY e.portfolio_id
      ) as sub
    `, [userEmail]);

    // 2. Különböző országok száma
    const [countryRows] = await pool.query(`
      SELECT COUNT(DISTINCT s.host_country_id) as distinct_countries
      FROM photo_salon_entries e
      JOIN photo_salons s ON e.salon_id = s.id
      JOIN photo_awards a ON e.award_id = a.id
      ${baseWhere}
    `, [userEmail]);

    // 3. Különböző művek (képek) száma
    const [workRows] = await pool.query(`
      SELECT COUNT(DISTINCT e.portfolio_id) as distinct_works
      FROM photo_salon_entries e
      JOIN photo_salons s ON e.salon_id = s.id
      JOIN photo_awards a ON e.award_id = a.id
      ${baseWhere}
    `, [userEmail]);

    res.json({
      acceptances: Number(accRows[0].total_acceptances) || 0,
      countries: Number(countryRows[0].distinct_countries) || 0,
      works: Number(workRows[0].distinct_works) || 0
    });

  } catch (err) {
    console.error("FIAP statisztika hiba:", err);
    res.status(500).json({ error: 'Hiba a FIAP statisztika lekérésekor' });
  }
});

// ==========================================
// --- FIAP TÉTELES EREDMÉNYEK (TÁBLÁZATHOZ) ---
// ==========================================
app.get('/api/fiap-entries', async (req, res) => {
  const userEmail = req.query.userEmail;
  try {
    const [rows] = await pool.query(`
      SELECT 
        COALESCE(p.title, 'Ismeretlen / Törölt kép') as photo_title,
        s.name as salon_name,
        s.country_hun as country,
        s.country_code,
        sp.patron_number as fiap_number,
        a.award_name as award,
        s.submission_type,
        p.drive_file_id,
        p.file_url
      FROM photo_salon_entries e
      JOIN photo_salons s ON e.salon_id = s.id
      JOIN photo_awards a ON e.award_id = a.id
      JOIN photo_salon_patrons sp ON sp.salon_id = s.id AND sp.patron_id = 1
      LEFT JOIN photo_portfolio p ON e.portfolio_id = p.id
      WHERE e.user_email = ?
        AND e.award_id IS NOT NULL 
        AND e.award_id > 0
        AND a.award_name IS NOT NULL 
        AND TRIM(a.award_name) != '' -- ITT IS KIZÁRJUK AZ ELUTASÍTOTT KÉPEKET
      ORDER BY s.name ASC, p.title ASC
    `, [userEmail]);
    
    res.json(rows);
  } catch (err) {
    console.error("FIAP tételes hiba:", err);
    res.status(500).json({ error: 'Hiba a FIAP tételes lista lekérésekor' });
  }
});
// ==========================================
// --- SZALON NEVEZÉSEK (PORTFÓLIÓBÓL) ---
// ==========================================

app.get('/api/salon-entries/:salonId', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.id as entry_id, e.category, e.award_id, e.achieved_score, e.acceptance_score, 
             p.*, a.award_name 
      FROM photo_salon_entries e 
      JOIN photo_portfolio p ON e.portfolio_id = p.id 
      LEFT JOIN photo_awards a ON e.award_id = a.id
      WHERE e.salon_id = ? AND e.user_email = ?
    `, [req.params.salonId, req.query.userEmail]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Hiba a nevezések lekérésekor' });
  }
});

app.post('/api/salon-entries', async (req, res) => {
  const { salonId, userEmail, portfolioId, category } = req.body;
  try {
    const [existing] = await pool.query('SELECT * FROM photo_salon_entries WHERE salon_id = ? AND portfolio_id = ? AND user_email = ?', [salonId, portfolioId, userEmail]);
    if (existing.length > 0) return res.status(400).json({ error: 'Ezt a képet már nevezted erre a szalonra!' });
    
    await pool.query('INSERT INTO photo_salon_entries (salon_id, user_email, portfolio_id, category) VALUES (?, ?, ?, ?)', [salonId, userEmail, portfolioId, category]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Hiba a nevezésnél' });
  }
});

app.delete('/api/salon-entries/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM photo_salon_entries WHERE id = ? AND user_email = ?', [req.params.id, req.body.userEmail]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Hiba a nevezés visszavonásakor' });
  }
});

app.get('/api/my-salon-entries-status', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT salon_id FROM photo_salon_entries WHERE user_email = ?', 
      [req.query.userEmail]
    );
    res.json(rows.map(r => r.salon_id));
  } catch (err) { res.status(500).json({ error: 'Hiba' }); }
});

// --- MÓDOSÍTOTT: Lekéri a nevezéseket a díjakkal és pontokkal együtt ---
app.get('/api/salon-entries/:salonId', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.id as entry_id, e.category, e.award_id, e.achieved_score, e.acceptance_score, 
             p.*, a.award_name 
      FROM photo_salon_entries e 
      JOIN photo_portfolio p ON e.portfolio_id = p.id 
      LEFT JOIN photo_awards a ON e.award_id = a.id
      WHERE e.salon_id = ? AND e.user_email = ?
    `, [req.params.salonId, req.query.userEmail]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Hiba a nevezések lekérésekor' });
  }
});

// --- ÚJ: Lekéri az összes választható díjat ---
app.get('/api/awards', async (req, res) => {
  try { 
    const [rows] = await pool.query('SELECT * FROM photo_awards ORDER BY id ASC'); 
    res.json(rows); 
  } catch (err) { 
    res.status(500).json({ error: 'Hiba' }); 
  }
});

// --- ÚJ: Menti a képhez tartozó eredményt (Pontok és Díj) ---
app.put('/api/salon-entries/:id/results', async (req, res) => {
  const { awardId, achievedScore, acceptanceScore, userEmail } = req.body;
  try {
    await pool.query(
      'UPDATE photo_salon_entries SET award_id = ?, achieved_score = ?, acceptance_score = ? WHERE id = ? AND user_email = ?',
      [awardId || null, achievedScore || null, acceptanceScore || null, req.params.id, userEmail]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Hiba az eredmények mentésekor' });
  }
});

// ==========================================
// --- KATEGÓRIÁK KEZELÉSE (ADMIN) ---
// ==========================================
app.post('/api/categories', async (req, res) => {
  try {
    await pool.query('INSERT INTO photo_categories (name, hun_name) VALUES (?, ?)', [req.body.name, req.body.hunName]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba a kategória létrehozásakor' }); }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    await pool.query('UPDATE photo_categories SET name = ?, hun_name = ? WHERE id = ?', [req.body.name, req.body.hunName, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba a kategória frissítésekor' }); }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM photo_categories WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba a kategória törlésekor. Lehet, hogy már használatban van egy szalonnál!' }); }
});

// ==========================================
// --- DÍJAK (AWARDS) KEZELÉSE (ADMIN) ---
// ==========================================
app.post('/api/awards', async (req, res) => {
  try {
    // Kikeressük a legnagyobb ID-t és hozzáadunk egyet (biztonságos megoldás, ha nincs auto_increment)
    const [[{ nextId }]] = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 as nextId FROM photo_awards');
    await pool.query('INSERT INTO photo_awards (id, award_name) VALUES (?, ?)', [nextId, req.body.awardName]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba a díj létrehozásakor' }); }
});

app.put('/api/awards/:id', async (req, res) => {
  try {
    await pool.query('UPDATE photo_awards SET award_name = ? WHERE id = ?', [req.body.awardName, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba a díj frissítésekor' }); }
});

app.delete('/api/awards/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM photo_awards WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Hiba a díj törlésekor. Lehet, hogy egy kép már megkapta ezt a díjat!' }); }
});

app.listen(PORT, () => console.log(`Szerver fut a ${PORT} porton`));
