const fs = require('fs');

module.exports = function(app, pool, drive, upload, cleanupTempFile) {
  
  app.get('/api/homeworks', async (req, res) => {
    try { const [rows] = await pool.query(`SELECT h.*, c.name as club_name FROM photo_homeworks h JOIN photo_clubs c ON h.club_id = c.id ORDER BY h.deadline DESC`); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  app.post('/api/homeworks', async (req, res) => {
    const { clubId, topic, description, deadline, maxImages } = req.body;
    try { await pool.query('INSERT INTO photo_homeworks (club_id, topic, description, deadline, max_images) VALUES (?, ?, ?, ?, ?)', [clubId, topic, description, deadline, maxImages || 4]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  app.put('/api/homeworks/:id', async (req, res) => {
    const { topic, description, deadline, maxImages } = req.body;
    try { await pool.query('UPDATE photo_homeworks SET topic = ?, description = ?, deadline = ?, max_images = ? WHERE id = ?', [topic, description, deadline, maxImages || 4, req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  app.delete('/api/homeworks/:id', async (req, res) => {
    try { await pool.query('DELETE FROM photo_homeworks WHERE id = ?', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  app.get('/api/my-homework-entries', async (req, res) => {
    try { const [rows] = await pool.query('SELECT * FROM photo_homework_entries WHERE user_email = ? ORDER BY created_at DESC', [req.query.userEmail]); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  app.get('/api/homework-entries/club/:clubId', async (req, res) => {
    const userEmail = req.query.userEmail || '';
    try { const [rows] = await pool.query(`SELECT e.*, (SELECT COUNT(*) FROM photo_homework_likes WHERE entry_id = e.id) as like_count, (SELECT COUNT(*) FROM photo_homework_likes WHERE entry_id = e.id AND user_email = ?) as user_liked FROM photo_homework_entries e JOIN photo_homeworks h ON e.homework_id = h.id WHERE h.club_id = ? ORDER BY e.created_at DESC`, [userEmail, req.params.clubId]); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  app.post('/api/upload-homework', upload.single('photo'), async (req, res) => {
    const { homeworkId, userEmail, userName, title } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Nincs fájl kiválasztva!' });
    try {
      const [hwRows] = await pool.query('SELECT max_images FROM photo_homeworks WHERE id = ?', [homeworkId]);
      if (hwRows.length === 0) { cleanupTempFile(file); return res.status(404).json({ error: 'A házi feladat nem található!' }); }
      
      const maxImages = hwRows[0].max_images;
      const [countRows] = await pool.query('SELECT COUNT(*) as count FROM photo_homework_entries WHERE homework_id = ? AND user_email = ?', [homeworkId, userEmail]);
      if (countRows[0].count >= maxImages) { cleanupTempFile(file); return res.status(400).json({ error: `Elérted a maximálisan feltölthető ${maxImages} képes limitet!` }); }

      const fileStream = fs.createReadStream(file.path);
      const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
      const driveRes = await drive.files.create({ requestBody: { name: `Hazi_${homeworkId}_${userName}_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, media: { mimeType: file.mimetype, body: fileStream }, fields: 'id, webViewLink' });

      cleanupTempFile(file);
      await pool.query('INSERT INTO photo_homework_entries (homework_id, user_email, user_name, title, file_url, drive_file_id, file_size) VALUES (?, ?, ?, ?, ?, ?, ?)', [homeworkId, userEmail, userName, title, driveRes.data.webViewLink, driveRes.data.id, req.file.size]);
      res.json({ success: true });
    } catch (err) { cleanupTempFile(file); res.status(500).json({ error: err.message }); }
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
    try {
      const [existing] = await pool.query('SELECT * FROM photo_homework_likes WHERE entry_id = ? AND user_email = ?', [req.params.id, userEmail]);
      if (existing.length > 0) { await pool.query('DELETE FROM photo_homework_likes WHERE entry_id = ? AND user_email = ?', [req.params.id, userEmail]); res.json({ liked: false }); } 
      else { await pool.query('INSERT INTO photo_homework_likes (entry_id, user_email) VALUES (?, ?)', [req.params.id, userEmail]); res.json({ liked: true }); }
    } catch (err) { res.status(500).json({ error: 'Hiba a like-olásnál' }); }
  });

  app.post('/api/homework-entries/:id/toggle-select', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT is_selected FROM photo_homework_entries WHERE id = ?', [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'A kép nem található!' });
      const newStatus = rows[0].is_selected ? 0 : 1;
      await pool.query('UPDATE photo_homework_entries SET is_selected = ? WHERE id = ?', [newStatus, req.params.id]);
      res.json({ success: true, is_selected: newStatus });
    } catch (err) { res.status(500).json({ error: 'Hiba a státusz módosításakor' }); }
  });
};
