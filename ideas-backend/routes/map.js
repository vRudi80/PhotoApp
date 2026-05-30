const fs = require('fs');

module.exports = function(app, pool, drive, upload, cleanupTempFile) {

  // 1. Helyszínek lekérése
  app.get('/api/locations', async (req, res) => {
    const { search, userEmail } = req.query;
    try {
      let query = `
        SELECT l.*,
               (SELECT COUNT(*) FROM photo_location_likes WHERE location_id = l.id) as like_count,
               (SELECT COUNT(*) FROM photo_location_likes WHERE location_id = l.id AND user_email = ?) as user_liked
        FROM photo_locations l
      `;
      let params = [userEmail || ''];
      if (search) {
        query += ' WHERE l.title LIKE ? OR l.description LIKE ?';
        params.push(`%${search}%`, `%${search}%`);
      }
      query += ' ORDER BY l.created_at DESC';
      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (err) { 
      res.status(500).json({ error: 'Hiba a helyszínek lekérésekor' }); 
    }
  });

  // 2. Új helyszín felvitele
  app.post('/api/locations', upload.single('photo'), async (req, res) => {
    const { userEmail, userName, lat, lng, title, description } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Fotó feltöltése kötelező a helyszínhez!' });

    try {
      const fileStream = fs.createReadStream(file.path);
      const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
      const driveRes = await drive.files.create({ 
        requestBody: { name: `Location_${userName}_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, 
        media: { mimeType: file.mimetype, body: fileStream }, 
        fields: 'id, webViewLink' 
      });
      cleanupTempFile(file);
      await pool.query(
        'INSERT INTO photo_locations (user_email, user_name, lat, lng, title, description, file_url, drive_file_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
        [userEmail, userName, lat, lng, title, description, driveRes.data.webViewLink, driveRes.data.id]
      );
      res.json({ success: true });
    } catch (err) { 
      cleanupTempFile(file);
      res.status(500).json({ error: 'Hiba a mentéskor' }); 
    }
  });

  // 3. Helyszín szerkesztése (és mozgatása)
  app.put('/api/locations/:id', upload.single('photo'), async (req, res) => {
    const { title, description, userEmail, lat, lng, isAdmin } = req.body;
    const file = req.file;

    try {
      const [rows] = await pool.query('SELECT * FROM photo_locations WHERE id = ?', [req.params.id]);
      if (rows.length === 0) {
        if (file) cleanupTempFile(file);
        return res.status(404).json({ error: 'Helyszín nem található' });
      }
      if (rows[0].user_email !== userEmail && !isAdmin && userEmail !== process.env.ADMIN_EMAIL) {
        if (file) cleanupTempFile(file);
        return res.status(403).json({ error: 'Nincs jogosultságod módosítani ezt a helyszínt!' });
      }

      const newTitle = title || rows[0].title;
      const newDesc = description || rows[0].description;
      const newLat = lat !== undefined ? lat : rows[0].lat;
      const newLng = lng !== undefined ? lng : rows[0].lng;

      if (file) {
        if (rows[0].drive_file_id) {
          await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(e => console.log('Törlési hiba:', e.message));
        }
        const fileStream = fs.createReadStream(file.path);
        const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
        const driveRes = await drive.files.create({ 
          requestBody: { name: `Location_Edit_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, 
          media: { mimeType: file.mimetype, body: fileStream }, 
          fields: 'id, webViewLink' 
        });
        cleanupTempFile(file);
        await pool.query('UPDATE photo_locations SET title=?, description=?, lat=?, lng=?, file_url=?, drive_file_id=? WHERE id=?', [newTitle, newDesc, newLat, newLng, driveRes.data.webViewLink, driveRes.data.id, req.params.id]);
      } else {
        await pool.query('UPDATE photo_locations SET title=?, description=?, lat=?, lng=? WHERE id=?', [newTitle, newDesc, newLat, newLng, req.params.id]);
      }
      res.json({ success: true });
    } catch (err) { 
      if (file) cleanupTempFile(file);
      res.status(500).json({ error: 'Adatbázis hiba' }); 
    }
  });

  // 4. Helyszín törlése
  app.delete('/api/locations/:id', async (req, res) => {
    const { userEmail } = req.body;
    try {
      const [rows] = await pool.query('SELECT * FROM photo_locations WHERE id = ?', [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Helyszín nem található' });

      if (rows[0].user_email !== userEmail && userEmail !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ error: 'Nincs jogosultságod törölni ezt a helyszínt!' });
      }

      if (rows[0].drive_file_id) {
        await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(e => console.log(e.message));
      }
      
      await pool.query('DELETE FROM photo_location_likes WHERE location_id = ?', [req.params.id]);
      await pool.query('DELETE FROM photo_location_comments WHERE location_id = ?', [req.params.id]);
      await pool.query('DELETE FROM photo_locations WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) { 
      res.status(500).json({ error: 'Hiba a törlésnél' }); 
    }
  });

  // 5. Lájkolás
  app.post('/api/locations/:id/like', async (req, res) => {
    const { userEmail } = req.body;
    const locationId = req.params.id;
    try {
      const [existing] = await pool.query('SELECT * FROM photo_location_likes WHERE location_id = ? AND user_email = ?', [locationId, userEmail]);
      if (existing.length > 0) {
        await pool.query('DELETE FROM photo_location_likes WHERE location_id = ? AND user_email = ?', [locationId, userEmail]);
      } else {
        await pool.query('INSERT INTO photo_location_likes (location_id, user_email) VALUES (?, ?)', [locationId, userEmail]);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Adatbázis hiba a lájkolás során.' });
    }
  });

  // 6. Kommentek lekérése
  app.get('/api/locations/:id/comments', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM photo_location_comments WHERE location_id = ? ORDER BY created_at ASC', [req.params.id]);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Hiba a kommentek lekérésekor' });
    }
  });

  // 7. Komment beküldése
  app.post('/api/locations/:id/comments', async (req, res) => {
    const { userEmail, userName, commentText } = req.body;
    if (!commentText || commentText.trim() === '') return res.status(400).json({ error: 'Üres komment!' });
    try {
      await pool.query('INSERT INTO photo_location_comments (location_id, user_email, user_name, comment_text) VALUES (?, ?, ?, ?)', [req.params.id, userEmail, userName, commentText]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Hiba a komment mentésekor' });
    }
  });

  // 8. Térkép komment olvasottá tétele
  app.post('/api/locations/comments/:commentId/read', async (req, res) => {
    const { userEmail } = req.body;
    try {
      await pool.query(
        'INSERT IGNORE INTO photo_location_comment_reads (comment_id, user_email) VALUES (?, ?)',
        [req.params.commentId, userEmail]
      );
      res.json({ success: true });
    } catch (err) { 
      res.status(500).json({ error: 'Hiba az olvasottság rögzítésekor' }); 
    }
  });

};
