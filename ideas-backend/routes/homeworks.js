const fs = require('fs');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🎯 JAVÍTVA: A te valódi admin e-mailedet állítottuk be biztonsági tartaléknak!
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kovari.rudolf@gmail.com";

// ====================================================================
// 🔒 GOLYÓÁLLÓ AUTHENTICATION MIDDLEWARE A HOMEWORKS MODULHOZ
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
    console.error("🔒 Biztonsági őr hiba a homeworks modulban:", error.message);
    return res.status(401).json({ error: 'Lejárt vagy érvénytelen munkamenet token!' });
  }
}

module.exports = function(app, pool, drive, upload, cleanupTempFile) {
  
  // Segédfüggvény: Ellenőrzi, hogy a felhasználó az adott klub tagja/vezetője-e, vagy főadmin
  async function checkClubOrAdminAccess(email, clubId) {
    if (email === ADMIN_EMAIL) return true;
    const [rows] = await pool.query('SELECT club_id, club_role FROM photo_users WHERE email = ?', [email]);
    if (rows.length === 0) return false;
    // Ha egyezik a klub ID, VAGY az illető az adott klub vezetője/helyettese
    return Number(rows[0].club_id) === Number(clubId);
  }

  // Segédfüggvény: Ellenőrzi, hogy a felhasználó vezetői státuszban van-e az adott klubban
  async function isClubLeaderOrAdmin(email, clubId) {
    if (email === ADMIN_EMAIL) return true;
    const [rows] = await pool.query('SELECT club_id, club_role FROM photo_users WHERE email = ? AND club_id = ?', [email, clubId]);
    return rows.length > 0 && (rows[0].club_role === 'leader' || rows[0].club_role === 'deputy');
  }

  // ====================================================================
  // 1. Házi feladatok listázása (VÉDETT)
  // ====================================================================
  app.get('/api/homeworks', requireAuth, async (req, res) => {
    try { 
      const [rows] = await pool.query(`SELECT h.*, c.name as club_name FROM photo_homeworks h JOIN photo_clubs c ON h.club_id = c.id ORDER BY h.deadline DESC`); 
      res.json(rows); 
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // ====================================================================
  // 2. Új házi feladat kiírása (VÉDETT - Csak klubvezető vagy főadmin)
  // ====================================================================
  app.post('/api/homeworks', requireAuth, async (req, res) => {
    const { clubId, topic, description, deadline, maxImages } = req.body;
    
    if (!await isClubLeaderOrAdmin(req.user.email, clubId)) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Csak klubvezetők írhatnak ki házi feladatot.' });
    }

    try { 
      await pool.query('INSERT INTO photo_homeworks (club_id, topic, description, deadline, max_images) VALUES (?, ?, ?, ?, ?)', [clubId, topic, description, deadline, maxImages || 4]); 
      res.json({ success: true }); 
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // ====================================================================
  // 3. Házi feladat módosítása (VÉDETT - Csak klubvezető vagy főadmin)
  // ====================================================================
  app.put('/api/homeworks/:id', requireAuth, async (req, res) => {
    const { topic, description, deadline, maxImages } = req.body;
    const homeworkId = req.params.id;

    try {
      const [hw] = await pool.query('SELECT club_id FROM photo_homeworks WHERE id = ?', [homeworkId]);
      if (hw.length === 0) return res.status(404).json({ error: 'A házi feladat nem létezik!' });

      if (!await isClubLeaderOrAdmin(req.user.email, hw[0].club_id)) {
        return res.status(403).json({ error: 'Hozzáférés megtagadva! Nincs jogod módosítani ezt a feladatot.' });
      }

      await pool.query('UPDATE photo_homeworks SET topic = ?, description = ?, deadline = ?, max_images = ? WHERE id = ?', [topic, description, deadline, maxImages || 4, homeworkId]); 
      res.json({ success: true }); 
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // ====================================================================
  // 4. Házi feladat törlése (VÉDETT - Csak klubvezető vagy főadmin)
  // ====================================================================
  app.delete('/api/homeworks/:id', requireAuth, async (req, res) => {
    const homeworkId = req.params.id;
    try {
      const [hw] = await pool.query('SELECT club_id FROM photo_homeworks WHERE id = ?', [homeworkId]);
      if (hw.length === 0) return res.status(404).json({ error: 'A házi feladat nem létezik!' });

      if (!await isClubLeaderOrAdmin(req.user.email, hw[0].club_id)) {
        return res.status(403).json({ error: 'Hozzáférés megtagadva! Nincs jogod törölni ezt a feladatot.' });
      }

      await pool.query('DELETE FROM photo_homeworks WHERE id = ?', [homeworkId]); 
      res.json({ success: true }); 
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // ====================================================================
  // 5. Saját leadott házi feladatok lekérése (VÉDETT - IDOR Szűrt)
  // ====================================================================
  app.get('/api/my-homework-entries', requireAuth, async (req, res) => {
    const targetEmail = req.query.userEmail;
    if (!targetEmail) return res.status(400).json({ error: 'Hiányzó email cím!' });

    // 🔒 BIZTONSÁGI PAJZS: Megakadályozzuk, hogy valaki más leadott munkáit halássza ki
    if (req.user.email !== targetEmail && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nem kérheted le más fotós egyéni leadásait.' });
    }

    try { 
      const [rows] = await pool.query('SELECT * FROM photo_homework_entries WHERE user_email = ? ORDER BY created_at DESC', [targetEmail]); 
      res.json(rows); 
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // ====================================================================
  // 6. Egy adott klub összes leadásának megtekintése (VÉDETT - Klubszintű GDPR gát)
  // ====================================================================
  app.get('/api/homework-entries/club/:clubId', requireAuth, async (req, res) => {
    const clubId = req.params.clubId;

    // 🔒 BIZTONSÁGI PAJZS: Külsősök nem leskelődhetnek a klub belső házi feladatai között!
    if (!await checkClubOrAdminAccess(req.user.email, clubId)) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nem vagy tagja ennek a fotóklubnak.' });
    }

    try { 
      const [rows] = await pool.query(
        `SELECT e.*, 
                (SELECT COUNT(*) FROM photo_homework_likes WHERE entry_id = e.id) as like_count, 
                (SELECT COUNT(*) FROM photo_homework_likes WHERE entry_id = e.id AND user_email = ?) as user_liked 
         FROM photo_homework_entries e 
         JOIN photo_homeworks h ON e.homework_id = h.id 
         WHERE h.club_id = ? 
         ORDER BY e.created_at DESC`, 
        [req.user.email, clubId]
      ); 
      res.json(rows); 
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // ====================================================================
  // 7. Új kép feltöltése házi feladathoz (VÉDETT - Hamisítás-biztosítva)
  // ====================================================================
  app.post('/api/upload-homework', requireAuth, upload.single('photo'), async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Nincs fájl kiválasztva!' });
    
    const { homeworkId, userEmail, userName, title } = req.body;

    // 🔒 BIZTONSÁGI PAJZS: Megakadályozzuk, hogy valaki más nevében töltsön fel képet
    if (req.user.email !== userEmail) {
      cleanupTempFile(file);
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nem nevezhetsz más fotós nevében.' });
    }

    try {
      const [hwRows] = await pool.query('SELECT club_id, max_images FROM photo_homeworks WHERE id = ?', [homeworkId]);
      if (hwRows.length === 0) { cleanupTempFile(file); return res.status(404).json({ error: 'A házi feladat nem található!' }); }
      
      // Ellenőrizzük, hogy valóban tagja-e annak a klubnak, ahova fel szeretne tölteni
      if (!await checkClubOrAdminAccess(req.user.email, hwRows[0].club_id)) {
        cleanupTempFile(file);
        return res.status(403).json({ error: 'Nem tartozol ehhez a klubhoz, így nem adhatsz le házi feladatot!' });
      }

      const maxImages = hwRows[0].max_images;
      const [countRows] = await pool.query('SELECT COUNT(*) as count FROM photo_homework_entries WHERE homework_id = ? AND user_email = ?', [homeworkId, req.user.email]);
      if (countRows[0].count >= maxImages) { cleanupTempFile(file); return res.status(400).json({ error: `Elérted a maximálisan feltölthető ${maxImages} képes limitet!` }); }

      const fileStream = fs.createReadStream(file.path);
      const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
      const driveRes = await drive.files.create({ requestBody: { name: `Hazi_${homeworkId}_${userName || req.user.name}_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, media: { mimeType: file.mimetype, body: fileStream }, fields: 'id, webViewLink' });

      cleanupTempFile(file);
      await pool.query('INSERT INTO photo_homework_entries (homework_id, user_email, user_name, title, file_url, drive_file_id, file_size) VALUES (?, ?, ?, ?, ?, ?, ?)', [homeworkId, req.user.email, userName || req.user.name, title, driveRes.data.webViewLink, driveRes.data.id, req.file.size]);
      res.json({ success: true });
    } catch (err) { cleanupTempFile(file); res.status(500).json({ error: err.message }); }
  });

  // ====================================================================
  // 8. Leadott kép címének frissítése (VÉDETT - Felülírás elleni gát)
  // ====================================================================
  app.put('/api/homework-entries/:id', requireAuth, async (req, res) => {
    try {
      // Szigorúan a hitelesített munkamenet-e-mail alapján engedélyezzük a módosítást!
      const [result] = await pool.query('UPDATE photo_homework_entries SET title = ? WHERE id = ? AND user_email = ?', [req.body.title, req.params.id, req.user.email]);
      if (result.affectedRows === 0) return res.status(403).json({ error: 'Nincs jogosultságod módosítani ezt a képet, vagy a kép nem létezik!' });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Hiba a cím frissítésekor' }); }
  });

  // ====================================================================
  // 9. Leadott kép törlése (VÉDETT - Illetéktelen törlés letiltva)
  // ====================================================================
  app.delete('/api/homework-entries/:id', requireAuth, async (req, res) => {
    const entryId = req.params.id;
    try {
      const [rows] = await pool.query('SELECT * FROM photo_homework_entries WHERE id = ?', [entryId]);
      if (rows.length === 0) return res.status(404).json({ error: 'A kép nem található!' });

      // Megnézzük melyik házi feladathoz tartozik, hogy a klubvezetők is törölhessék ha szükséges
      const [hw] = await pool.query('SELECT club_id FROM photo_homeworks WHERE id = ?', [rows[0].homework_id]);
      const isLeaderOfClub = hw.length > 0 ? await isClubLeaderOrAdmin(req.user.email, hw[0].club_id) : false;

      // Csak a saját képét törölheti, vagy ha ő a klub bejegyzett vezetője / főadminja
      if (rows[0].user_email !== req.user.email && !isLeaderOfClub) {
        return res.status(403).json({ error: 'Nincs jogosultságod törölni ezt a képet!' });
      }
      
      if (rows[0].drive_file_id) {
        await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(e => console.log('Drive törlési hiba:', e.message));
      }
      
      await pool.query('DELETE FROM photo_homework_entries WHERE id = ?', [entryId]);
      res.json({ success: true });
    } catch (err) { 
      res.status(500).json({ error: 'Szerveroldali hiba a törlés során.' }); 
    }
  });

  // ====================================================================
  // 10. Kép lájkolása (VÉDETT)
  // ====================================================================
  app.post('/api/homework-entries/:id/like', requireAuth, async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT * FROM photo_homework_likes WHERE entry_id = ? AND user_email = ?', [req.params.id, req.user.email]);
      if (existing.length > 0) { 
        await pool.query('DELETE FROM photo_homework_likes WHERE entry_id = ? AND user_email = ?', [req.params.id, req.user.email]); 
        res.json({ liked: false }); 
      } else { 
        await pool.query('INSERT INTO photo_homework_likes (entry_id, user_email) VALUES (?, ?)', [req.params.id, req.user.email]); 
        res.json({ liked: true }); 
      }
    } catch (err) { res.status(500).json({ error: 'Hiba a like-olásnál' }); }
  });

  // ====================================================================
  // 11. MAFOSZ ZIP TÖMÖRÍTŐ MOTOR (VÉDETT - Csak Vezetők és Admin)
  // ====================================================================
  const archiver = require('archiver');

  app.post('/api/homework/download-zip', requireAuth, async (req, res) => {
    const { entries, topic, clubId } = req.body;
    if (!entries || entries.length === 0) {
      return res.status(400).json({ error: 'Nincs kiválasztott kép a tömörítéshez.' });
    }

    // 🔒 BIZTONSÁGI PAJZS: Csak a klub vezetője töltheti le tömegesen a tagok képeit ZIP-ben
    if (clubId && !await isClubLeaderOrAdmin(req.user.email, clubId)) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Csak klubvezetők jogosultak a ZIP letöltésre.' });
    }

    try {
      const safeTopic = topic ? topic.replace(/[^a-zA-Z0-9-_]/g, '_') : 'valogatas';
      res.attachment(`${safeTopic}_klub_valogatas.zip`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);

      for (const entry of entries) {
        if (entry.drive_file_id) {
          try {
            const driveRes = await drive.files.get(
              { fileId: entry.drive_file_id, alt: 'media' },
              { responseType: 'stream' }
            );

            const safeTitle = (entry.title || 'kep').replace(/[^a-zA-Z0-9-_]/g, '_');
            const safeAuthor = (entry.user_name || 'szerzo').replace(/[^a-zA-Z0-9-_]/g, '_');

            archive.append(driveRes.data, { name: `${safeAuthor}_${safeTitle}.jpg` });
          } catch (driveErr) {
            console.error(`Hiba a(z) ${entry.id} kép letöltésekor Drive-ból:`, driveErr.message);
          }
        }
      }

      await archive.finalize();

    } catch (err) {
      console.error("❌ Kritikus hiba a ZIP generálása közben:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Nem sikerült összeállítani a ZIP archívumot.' });
      }
    }
  });

  // ====================================================================
  // 12. Kép kiválasztása / státuszváltás (VÉDETT - Csak Vezetőknek)
  // ====================================================================
  app.post('/api/homework-entries/:id/toggle-select', requireAuth, async (req, res) => {
    const entryId = req.params.id;
    try {
      const [rows] = await pool.query('SELECT * FROM photo_homework_entries WHERE id = ?', [entryId]);
      if (rows.length === 0) return res.status(404).json({ error: 'A kép nem található!' });

      const [hw] = await pool.query('SELECT club_id FROM photo_homeworks WHERE id = ?', [rows[0].homework_id]);
      if (hw.length === 0 || !await isClubLeaderOrAdmin(req.user.email, hw[0].club_id)) {
        return res.status(403).json({ error: 'Hozzáférés megtagadva! Csak klubvezetők válogathatnak képeket.' });
      }

      const newStatus = rows[0].is_selected ? 0 : 1;
      await pool.query('UPDATE photo_homework_entries SET is_selected = ? WHERE id = ?', [newStatus, entryId]);
      res.json({ success: true, is_selected: newStatus });
    } catch (err) { res.status(500).json({ error: 'Hiba a státusz módosításakor' }); }
  });
};
