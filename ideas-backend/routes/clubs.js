const fs = require('fs');

module.exports = function(app, pool, drive, upload, cleanupTempFile) {

  // ====================================================================
  // 📁 KLUBOK ALAP KEZELÉSE (MEGLÉVŐ)
  // ====================================================================
  app.get('/api/clubs', async (req, res) => {
    try { const [rows] = await pool.query('SELECT * FROM photo_clubs ORDER BY name ASC'); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });
  app.post('/api/clubs', async (req, res) => {
    try { await pool.query('INSERT IGNORE INTO photo_clubs (name) VALUES (?)', [req.body.name]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });
  app.delete('/api/clubs/:id', async (req, res) => {
    try { await pool.query('DELETE FROM photo_clubs WHERE id = ?', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // ====================================================================
  // ⏳ KLUBESTEK (MEGLÉVŐ)
  // ====================================================================
  app.get('/api/meetings', async (req, res) => {
    try { const [rows] = await pool.query(`SELECT m.*, c.name as club_name FROM photo_club_meetings m JOIN photo_clubs c ON m.club_id = c.id ORDER BY m.meeting_date DESC, m.meeting_time DESC`); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });
  app.post('/api/meetings', upload.single('coverPhoto'), async (req, res) => {
    const { clubId, date, time, topic, description, locationType, locationDetails, videoLink } = req.body;
    const file = req.file; let fileUrl = null; let driveFileId = null;
    try {
      if (file) {
        const fileStream = fs.createReadStream(file.path);
        const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
        const driveRes = await drive.files.create({ requestBody: { name: `Klubest_Cover_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, media: { mimeType: file.mimetype, body: fileStream }, fields: 'id, webViewLink' });
        fileUrl = driveRes.data.webViewLink; driveFileId = driveRes.data.id;
        cleanupTempFile(file);
      }
      await pool.query('INSERT INTO photo_club_meetings (club_id, meeting_date, meeting_time, topic, description, location_type, location_details, file_url, drive_file_id, video_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [clubId, date, time, topic, description, locationType, locationDetails, fileUrl, driveFileId, videoLink || null]);
      res.json({ success: true });
    } catch (err) { cleanupTempFile(file); res.status(500).json({ error: err.message }); }
  });
  app.put('/api/meetings/:id', upload.single('coverPhoto'), async (req, res) => {
    const { date, time, topic, description, locationType, locationDetails, videoLink } = req.body;
    const file = req.file;
    try {
      if (file) {
        const [oldRows] = await pool.query('SELECT drive_file_id FROM photo_club_meetings WHERE id = ?', [req.params.id]);
        if (oldRows.length > 0 && oldRows[0].drive_file_id) await drive.files.delete({ fileId: oldRows[0].drive_file_id }).catch(e => console.log('Régi borítókép törlése sikertelen:', e.message));
        const fileStream = fs.createReadStream(file.path);
        const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
        const driveRes = await drive.files.create({ requestBody: { name: `Klubest_Cover_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, media: { mimeType: file.mimetype, body: fileStream }, fields: 'id, webViewLink' });
        cleanupTempFile(file);
        await pool.query('UPDATE photo_club_meetings SET meeting_date=?, meeting_time=?, topic=?, description=?, location_type=?, location_details=?, file_url=?, drive_file_id=?, video_link=? WHERE id=?', [date, time, topic, description, locationType, locationDetails, driveRes.data.webViewLink, driveRes.data.id, videoLink || null, req.params.id]);
      } else {
        await pool.query('UPDATE photo_club_meetings SET meeting_date=?, meeting_time=?, topic=?, description=?, location_type=?, location_details=?, video_link=? WHERE id=?', [date, time, topic, description, locationType, locationDetails, videoLink || null, req.params.id]);
      }
      res.json({ success: true });
    } catch (err) { cleanupTempFile(file); res.status(500).json({ error: 'Hálózati hiba a Google Drive feltöltésnél.' }); }
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

  // ====================================================================
  // 📰 HÍREK SZEKCIÓ (MEGLÉVŐ)
  // ====================================================================
  app.get('/api/clubs/:clubId/news', async (req, res) => {
    const userEmail = req.query.userEmail;
    try {
      const [rows] = await pool.query(`SELECT n.*, (SELECT COUNT(*) FROM photo_club_news_reads r WHERE r.news_id = n.id AND r.user_email = ?) as is_read FROM photo_club_news n WHERE n.club_id = ? ORDER BY n.created_at DESC`, [userEmail, req.params.clubId]);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Hiba a hírek lekérésekor' }); }
  });
  app.post('/api/clubs/:clubId/news', async (req, res) => {
    const { title, content, userEmail, userName } = req.body;
    try { await pool.query('INSERT INTO photo_club_news (club_id, author_email, author_name, title, content) VALUES (?, ?, ?, ?, ?)', [req.params.clubId, userEmail, userName, title, content]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba a hír posztolásakor' }); }
  });
  app.delete('/api/news/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM photo_club_news_reads WHERE news_id = ?', [req.params.id]);
      await pool.query('DELETE FROM photo_club_news_comments WHERE news_id = ?', [req.params.id]);
      await pool.query('DELETE FROM photo_club_news WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Hiba a hír törlésekor' }); }
  });
  app.post('/api/news/:id/read', async (req, res) => {
    try { await pool.query('INSERT IGNORE INTO photo_club_news_reads (news_id, user_email) VALUES (?, ?)', [req.params.id, req.body.userEmail]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba az olvasottság mentésekor' }); }
  });
  app.get('/api/news/:id/readers', async (req, res) => {
    try { const [rows] = await pool.query(`SELECT r.user_email, u.name, r.read_at FROM photo_club_news_reads r JOIN photo_users u ON r.user_email = u.email WHERE r.news_id = ? ORDER BY r.read_at DESC`, [req.params.id]); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba az olvasók lekérésekor' }); }
  });
  app.get('/api/news/:id/comments', async (req, res) => {
    try { const [rows] = await pool.query('SELECT * FROM photo_club_news_comments WHERE news_id = ? ORDER BY created_at ASC', [req.params.id]); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });
  app.post('/api/news/:id/comments', async (req, res) => {
    const { userEmail, userName, commentText } = req.body;
    try { await pool.query('INSERT INTO photo_club_news_comments (news_id, user_email, user_name, comment_text) VALUES (?, ?, ?, ?)', [req.params.id, userEmail, userName, commentText]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // ====================================================================
  // 👥 TAGFELVÉTEL ÉS KÉRELMEK (MEGLÉVŐ)
  // ====================================================================
  app.get('/api/clubs/active-only', async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT DISTINCT c.* FROM photo_clubs c
        INNER JOIN photo_users u ON c.id = u.club_id
        WHERE u.club_role IN ('leader', 'deputy')
        ORDER BY c.name ASC
      `);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/clubs/join-request', async (req, res) => {
    const { userEmail, clubId, clubName } = req.body;
    if (!userEmail || !clubId || !clubName) return res.status(400).json({ error: 'Hiányzó adatok!' });
    try {
      await pool.query("UPDATE photo_users SET club_id = ?, club_name = ?, club_role = 'pending' WHERE email = ?", [clubId, clubName, userEmail]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/clubs/pending-members', async (req, res) => {
    const { clubId } = req.query;
    if (!clubId) return res.status(400).json({ error: 'Hiányzó klub azonosító!' });
    try {
      const [rows] = await pool.query("SELECT email, name, club_name FROM photo_users WHERE club_id = ? AND club_role = 'pending'", [clubId]);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/clubs/handle-request', async (req, res) => {
    const { targetEmail, action } = req.body;
    try {
      if (action === 'approve') {
        await pool.query("UPDATE photo_users SET club_role = 'member' WHERE email = ?", [targetEmail]);
      } else {
        await pool.query("UPDATE photo_users SET club_id = NULL, club_name = NULL, club_role = 'member' WHERE email = ?", [targetEmail]);
      }
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ====================================================================
  // 🛡️ ÚJ VÉGPONTOK: VEZETŐI ÉS HELYETTESI MODULOK
  // ====================================================================

  // 1. SAJÁT KLUB ADATAINAK ÉS TÉTELES TAGLISTÁJÁNAK LEKÉRÉSE
  app.get('/api/my-club', async (req, res) => {
    const { userEmail } = req.query;
    try {
      const [userRows] = await pool.query('SELECT club_id, club_role FROM photo_users WHERE email = ?', [userEmail]);
      if (userRows.length === 0 || !userRows[0].club_id) {
        return res.status(404).json({ error: 'Nem tartozol egyetlen regisztrált fotóklubhoz sem!' });
      }

      const { club_id, club_role } = userRows[0];
      if (club_role !== 'leader' && club_role !== 'deputy') {
        return res.status(403).json({ error: 'Nincs jogosultságod a klubvezetői adatok eléréséhez!' });
      }

      const [clubRows] = await pool.query('SELECT * FROM photo_clubs WHERE id = ?', [club_id]);
      if (clubRows.length === 0) return res.status(404).json({ error: 'A fotóklub nem található!' });

      const [members] = await pool.query(
        "SELECT name, email, club_role FROM photo_users WHERE club_id = ? AND club_role != 'pending' ORDER BY name ASC",
        [club_id]
      );

      res.json({ club: clubRows[0], members });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Hiba a klubadatok szinkronizálásakor' });
    }
  });

  // 2. KLUB NEVÉNEK GLOBÁLIS MÓDOSÍTÁSA (A tagoknál is átírja!)
  app.post('/api/my-club/update-name', async (req, res) => {
    const { clubId, newClubName, userEmail } = req.body;
    if (!clubId || !newClubName || !newClubName.trim()) return res.status(400).json({ error: 'A név nem lehet üres!' });

    try {
      const [userRows] = await pool.query('SELECT club_role FROM photo_users WHERE email = ? AND club_id = ?', [userEmail, clubId]);
      if (userRows.length === 0 || (userRows[0].club_role !== 'leader' && userRows[0].club_role !== 'deputy')) {
        return res.status(403).json({ error: 'Nincs jogod megváltoztatni a klub nevét!' });
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query('UPDATE photo_clubs SET name = ? WHERE id = ?', [newClubName.trim(), clubId]);
        await conn.query('UPDATE photo_users SET club_name = ? WHERE club_id = ?', [newClubName.trim(), clubId]);
        await conn.commit();
        res.json({ success: true });
      } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
    } catch (err) { res.status(500).json({ error: 'Hiba: ' + err.message }); }
  });

  // 3. KLUB LOGÓ FELTÖLTÉSE GOOGLE DRIVE-RA
  app.post('/api/my-club/logo', upload.single('logo'), async (req, res) => {
    const file = req.file;
    const { clubId, userEmail } = req.body;
    if (!file) return res.status(400).json({ error: 'Fájl feltöltése kötelező!' });

    try {
      const [userRows] = await pool.query('SELECT club_role FROM photo_users WHERE email = ? AND club_id = ?', [userEmail, clubId]);
      if (userRows.length === 0 || (userRows[0].club_role !== 'leader' && userRows[0].club_role !== 'deputy')) {
        cleanupTempFile(file);
        return res.status(403).json({ error: 'Nincs jogosultságod a logó módosításához!' });
      }

      const [clubRows] = await pool.query('SELECT drive_logo_id, name FROM photo_clubs WHERE id = ?', [clubId]);
      if (clubRows.length === 0) { cleanupTempFile(file); return res.status(404).json({ error: 'Klub nem található' }); }

      if (clubRows[0].drive_logo_id) {
        await drive.files.delete({ fileId: clubRows[0].drive_logo_id }).catch(e => console.log('Régi logó törlése sikertelen:', e.message));
      }

      const fileStream = fs.createReadStream(file.path);
      const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.png';

      const driveRes = await drive.files.create({ 
        requestBody: { name: `ClubLogo_${clubId}_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, 
        media: { mimeType: file.mimetype, body: fileStream }, 
        fields: 'id, webViewLink' 
      });

      cleanupTempFile(file);
      await pool.query('UPDATE photo_clubs SET logo_url = ?, drive_logo_id = ? WHERE id = ?', [driveRes.data.webViewLink, driveRes.data.id, clubId]);
      res.json({ success: true });
    } catch (err) { cleanupTempFile(file); res.status(500).json({ error: err.message }); }
  });

  // ====================================================================
  // 🔔 JAVÍTVA: DASHBOARD ALERTS (KLUBBIZTONSÁGOS FOTÓPÁLYÁZAT SZŰRÉSSEL)
  // ====================================================================
  app.get('/api/dashboard-alerts', async (req, res) => {
    const { userEmail } = req.query;
    try {
      // 1. Lekérjük a felhasználó klubjának a nevét és belső ID-ját is (ha van neki)
      const [users] = await pool.query('SELECT club_name, club_id FROM photo_users WHERE email = ?', [userEmail]);
      const userClubName = users.length > 0 ? users[0].club_name : null;
      let userClubId = users.length > 0 ? users[0].club_id : null;

      // Biztonsági szinkronizáció: ha van név, de nincs ID, megkeressük az ID-t
      if (userClubName && !userClubId) {
        const [clubs] = await pool.query('SELECT id FROM photo_clubs WHERE name = ?', [userClubName]);
        if (clubs.length > 0) {
          userClubId = clubs[0].id;
        }
      }

      // 🎯 2. JAVÍTVA: Csak azokat a pályázatokat kérjük le, amik vagy NYILVÁNOSAK, vagy a felhasználó SAJÁT KLUBJÁHOZ tartoznak!
      // Feltételezzük, hogy a photo_contests tábládban a mező neve 'club_id' vagy 'restricted_club_id' (ha nem így van, igazítsd a nevet)
      const [contests] = await pool.query(`
        SELECT id, title, end_date 
        FROM photo_contests 
        WHERE start_date <= CURRENT_DATE() 
          AND end_date >= CURRENT_DATE()
          AND (
            club_id IS NULL 
            OR club_id = 0 
            OR is_club = 0 
            ${userClubId ? 'OR club_id = ?' : ''}
          )
        ORDER BY end_date ASC
      `, userClubId ? [userClubId] : []);

      const [weekly] = await pool.query('SELECT id, title, end_date FROM weekly_topics WHERE start_date <= CURRENT_DATE() AND end_date >= CURRENT_DATE()');

      let homeworks = []; 
      let unreadNews = [];

      // 3. Házi feladatok és klubhírek kezelése a meglévő logika szerint
      if (userClubId || userClubName) {
        // Ha valamiért még nem lenne meg az ID, lekérjük a név alapján
        if (!userClubId && userClubName) {
          const [clubs] = await pool.query('SELECT id FROM photo_clubs WHERE name = ?', [userClubName]);
          if (clubs.length > 0) userClubId = clubs[0].id;
        }

        if (userClubId) {
          const [hw] = await pool.query('SELECT id, topic, deadline FROM photo_homeworks WHERE club_id = ? AND deadline >= CURRENT_DATE() ORDER BY deadline ASC', [userClubId]);
          homeworks = hw;
          const [news] = await pool.query(`SELECT id, title, created_at FROM photo_club_news WHERE club_id = ? AND id NOT IN (SELECT news_id FROM photo_club_news_reads WHERE user_email = ?) ORDER BY created_at DESC`, [userClubId, userEmail]);
          unreadNews = news;
        }
      }

      const [mapComments] = await pool.query(`SELECT c.id as comment_id, c.location_id, l.title as location_title, c.user_name, c.created_at FROM photo_location_comments c JOIN photo_locations l ON c.location_id = l.id WHERE l.user_email = ? AND c.user_email != ? AND c.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) AND c.id NOT IN (SELECT comment_id FROM photo_location_comment_reads WHERE user_email = ?) ORDER BY c.created_at DESC LIMIT 5`, [userEmail, userEmail, userEmail]);
      
      res.json({ contests, weekly, homeworks, unreadNews, mapComments });
    } catch (err) { 
      console.error("❌ Hiba a Dashboard értesítések generálásakor:", err.message);
      res.status(500).json({ error: 'Hiba az értesítések betöltésekor' }); 
    }
  });

};
