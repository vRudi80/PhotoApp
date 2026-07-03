const fs = require('fs');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🎯 JAVÍTVA: A te valódi admin e-mailedet állítottuk be biztonsági tartaléknak!
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kovari.rudolf@gmail.com";

// ====================================================================
// 🔒 GOLYÓÁLLÓ AUTHENTICATION MIDDLEWARE A MAP MODULHOZ
// ====================================================================
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Hozzáférés megtagadva! Nincs hitelesítési token.' });
    }

    const token = authHeader.split(' ')[1];
    
    // Google OAuth IdToken hitelesítése
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'Érvénytelen vagy sérült Google token.' });
    }

    // Biztonságosan injektáljuk a kérésbe a hitelesített entitást
    req.user = {
      email: payload.email,
      name: payload.name,
      isAdmin: payload.email === ADMIN_EMAIL
    };

    next();
  } catch (error) {
    console.error("🔒 Biztonsági őr hiba a map modulban:", error.message);
    return res.status(401).json({ error: 'Lejárt vagy érvénytelen munkamenet token!' });
  }
}

module.exports = function(app, pool, drive, upload, cleanupTempFile) {

  // ====================================================================
  // 1. Helyszínek lekérése (VÉDETT - Mobilis ékezet- és szóköz-szűréssel)
  // ====================================================================
  app.get('/api/locations', requireAuth, async (req, res) => {
    const { search } = req.query;
    try {
      let query = `
        SELECT l.*,
               (SELECT COUNT(*) FROM photo_location_likes WHERE location_id = l.id) as like_count,
               (SELECT COUNT(*) FROM photo_location_likes WHERE location_id = l.id AND user_email = ?) as user_liked
        FROM photo_locations l
      `;
      // 🔒 BIZTONSÁGI JAVÍTVA: A kliensoldali query paraméter helyett a hitelesített req.user.email-t küldjük a MySQL-nek
      let params = [req.user.email];
      
      if (search) {
        // Kitakarítjuk a mobilok által generált rejtett hibákat (szóközök + iPhone NFD kódolás)
        const cleanSearch = String(search).trim().normalize('NFC');

        query += ' WHERE l.title LIKE ? OR l.description LIKE ? OR l.user_name LIKE ?';
        params.push(`%${cleanSearch}%`, `%${cleanSearch}%`, `%${cleanSearch}%`);
      }
      
      query += ' ORDER BY l.created_at DESC';
      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (err) { 
      console.error('Hiba a helyszínek lekérésekor:', err.message);
      res.status(500).json({ error: 'Hiba a helyszínek lekérésekor' }); 
    }
  });

  // ====================================================================
  // 2. Új helyszín felvitele (VÉDETT - Hamisítás-biztosítva)
  // ====================================================================
  app.post('/api/locations', requireAuth, upload.single('photo'), async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Fotó feltöltése kötelező a helyszínhez!' });

    const { lat, lng, title, description, photoMonth, photoTimeOfDay, camera, lens } = req.body;

    try {
      const fileStream = fs.createReadStream(file.path);
      const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
      
      // Szigorúan a hitelesített req.user.name alapján nevezzük el a fájlt a Drive-on
      const driveRes = await drive.files.create({ 
        requestBody: { name: `Location_${req.user.name}_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, 
        media: { mimeType: file.mimetype, body: fileStream }, 
        fields: 'id, webViewLink' 
      });
      cleanupTempFile(file);

      // 🔒 BIZTONSÁGI JAVÍTVA: Elvetjük a req.body-ból érkező emailt/nevet, és a védett req.user adatokat írjuk az adatbázisba
      await pool.query(
        'INSERT INTO photo_locations (user_email, user_name, lat, lng, title, description, file_url, drive_file_id, photo_month, photo_time_of_day, camera, lens) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
        [req.user.email, req.user.name, lat, lng, title, description, driveRes.data.webViewLink, driveRes.data.id, photoMonth || null, photoTimeOfDay || null, camera || null, lens || null]
      );
      res.json({ success: true });
    } catch (err) { 
      cleanupTempFile(file);
      console.error("Hiba a helyszín mentésekor:", err.message);
      res.status(500).json({ error: 'Hiba a mentéskor' }); 
    }
  });

  // ====================================================================
  // 3. Helyszín szerkesztése és mozgatása (VÉDETT - Admin-hamisítás felszámolva)
  // ====================================================================
  app.put('/api/locations/:id', requireAuth, upload.single('photo'), async (req, res) => {
    const file = req.file;
    const { title, description, lat, lng, photoMonth, photoTimeOfDay, camera, lens } = req.body;

    try {
      const [rows] = await pool.query('SELECT * FROM photo_locations WHERE id = ?', [req.params.id]);
      if (rows.length === 0) {
        if (file) cleanupTempFile(file);
        return res.status(404).json({ error: 'Helyszín nem található' });
      }

      // 🔒 BIZTONSÁGI PAJZS: Kizárólag a helyszín eredeti tulajdonosa VAGY a hitelesített főadminisztrátor módosíthat!
      if (rows[0].user_email !== req.user.email && !req.user.isAdmin) {
        if (file) cleanupTempFile(file);
        return res.status(403).json({ error: 'Nincs jogosultságod módosítani ezt a helyszínt!' });
      }

      const newTitle = title || rows[0].title;
      const newDesc = description || rows[0].description;
      const newLat = lat !== undefined ? lat : rows[0].lat;
      const newLng = lng !== undefined ? lng : rows[0].lng;
      
      const newMonth = photoMonth !== undefined ? photoMonth : rows[0].photo_month;
      const newTime = photoTimeOfDay !== undefined ? photoTimeOfDay : rows[0].photo_time_of_day;
      const newCamera = camera !== undefined ? camera : rows[0].camera;
      const newLens = lens !== undefined ? lens : rows[0].lens;

      if (file) {
        if (rows[0].drive_file_id) {
          await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(e => console.log('Törlési hiba a Drive-on:', e.message));
        }
        const fileStream = fs.createReadStream(file.path);
        const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
        const driveRes = await drive.files.create({ 
          requestBody: { name: `Location_Edit_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, 
          media: { mimeType: file.mimetype, body: fileStream }, 
          fields: 'id, webViewLink' 
        });
        cleanupTempFile(file);
        await pool.query('UPDATE photo_locations SET title=?, description=?, lat=?, lng=?, file_url=?, drive_file_id=?, photo_month=?, photo_time_of_day=?, camera=?, lens=? WHERE id=?', [newTitle, newDesc, newLat, newLng, driveRes.data.webViewLink, driveRes.data.id, newMonth, newTime, newCamera, newLens, req.params.id]);
      } else {
        await pool.query('UPDATE photo_locations SET title=?, description=?, lat=?, lng=?, photo_month=?, photo_time_of_day=?, camera=?, lens=? WHERE id=?', [newTitle, newDesc, newLat, newLng, newMonth, newTime, newCamera, newLens, req.params.id]);
      }
      res.json({ success: true });
    } catch (err) { 
      if (file) cleanupTempFile(file);
      console.error("Adatbázis hiba helyszín frissítésekor:", err.message);
      res.status(500).json({ error: 'Adatbázis hiba' }); 
    }
  });

  // ====================================================================
  // 4. Helyszín törlése (VÉDETT - Illetéktelen törlés kivédve)
  // ====================================================================
  app.delete('/api/locations/:id', requireAuth, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM photo_locations WHERE id = ?', [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Helyszín nem található' });

      // 🔒 BIZTONSÁGI PAJZS: Csak a tulajdonos vagy a főadminisztrátor törölhet!
      if (rows[0].user_email !== req.user.email && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Nincs jogosultságod törölni ezt a helyszínt!' });
      }

      if (rows[0].drive_file_id) {
        await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(e => console.log('Sikertelen Drive törlés:', e.message));
      }
      
      await pool.query('DELETE FROM photo_location_likes WHERE location_id = ?', [req.params.id]);
      await pool.query('DELETE FROM photo_location_comments WHERE location_id = ?', [req.params.id]);
      await pool.query('DELETE FROM photo_locations WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) { 
      res.status(500).json({ error: 'Hiba a törlésnél' }); 
    }
  });

  // ====================================================================
  // 5. Lájkolás (VÉDETT - Dupla lájk / Email-hamisítás kizárva)
  // ====================================================================
  app.post('/api/locations/:id/like', requireAuth, async (req, res) => {
    const locationId = req.params.id;
    try {
      // 🔒 BIZTONSÁGI JAVÍTVA: Szigorúan a hitelesített req.user.email-lel dolgozunk
      const [existing] = await pool.query('SELECT * FROM photo_location_likes WHERE location_id = ? AND user_email = ?', [locationId, req.user.email]);
      if (existing.length > 0) {
        await pool.query('DELETE FROM photo_location_likes WHERE location_id = ? AND user_email = ?', [locationId, req.user.email]);
      } else {
        await pool.query('INSERT INTO photo_location_likes (location_id, user_email) VALUES (?, ?)', [locationId, req.user.email]);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Adatbázis hiba a lájkolás során.' });
    }
  });

  // ====================================================================
  // 6. Kommentek lekérése (VÉDETT)
  // ====================================================================
  app.get('/api/locations/:id/comments', requireAuth, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM photo_location_comments WHERE location_id = ? ORDER BY created_at ASC', [req.params.id]);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Hiba a kommentek lekérésekor' });
    }
  });

  // ====================================================================
  // 7. Komment beküldése (VÉDETT - Név- és fiók-eltérítés gátolva)
  // ====================================================================
  app.post('/api/locations/:id/comments', requireAuth, upload.single('photo'), async (req, res) => {
    const { commentText } = req.body;
    const file = req.file;
    
    if ((!commentText || !commentText.trim()) && !file) {
      return res.status(400).json({ error: 'Üres hozzászólás!' });
    }

    let fileUrl = null;
    let driveFileId = null;

    try {
      if (file) {
        const fileStream = fs.createReadStream(file.path);
        const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
        
        // Fájlnév szabványosítása a hitelesített adatok alapján
        const driveRes = await drive.files.create({ 
          requestBody: { name: `Comment_${req.user.name}_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, 
          media: { mimeType: file.mimetype, body: fileStream }, 
          fields: 'id, webViewLink' 
        });
        fileUrl = driveRes.data.webViewLink;
        driveFileId = driveRes.data.id;
        cleanupTempFile(file);
      }

      // 🔒 BIZTONSÁGI JAVÍTVA: Kizárólag a tokenből visszafejtett nevet és emailt írjuk a kommentek táblába!
      await pool.query(
        'INSERT INTO photo_location_comments (location_id, user_email, user_name, comment_text, file_url, drive_file_id) VALUES (?, ?, ?, ?, ?, ?)', 
        [req.params.id, req.user.email, req.user.name, commentText?.trim() || '', fileUrl, driveFileId]
      );
      
      res.json({ success: true });
    } catch (err) { 
      if (file) cleanupTempFile(file);
      console.error("Hiba a komment rögzítésekor:", err.message);
      res.status(500).json({ error: 'Hiba a komment mentésekor' }); 
    }
  });

  // ====================================================================
  // 8. Térkép komment olvasottá tétele (VÉDETT)
  // ====================================================================
  app.post('/api/locations/comments/:commentId/read', requireAuth, async (req, res) => {
    try {
      // 🔒 BIZTONSÁGI JAVÍTVA: A kliens által beküldött body helyett a req.user.email-lel naplózunk
      await pool.query(
        'INSERT IGNORE INTO photo_location_comment_reads (comment_id, user_email) VALUES (?, ?)',
        [req.params.commentId, req.user.email]
      );
      res.json({ success: true });
    } catch (err) { 
      res.status(500).json({ error: 'Hiba az olvasottság rögzítésekor' }); 
    }
  });

};
