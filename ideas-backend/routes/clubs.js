const fs = require('fs');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const PointsService = require('../PointsService');

// A te valódi admin e-mailed biztonsági tartaléknak
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kovari.rudolf@gmail.com";

module.exports = function(app, pool, drive, upload, cleanupTempFile) {

  // ====================================================================
  // 🔒 GOLYÓÁLLÓ AUTHENTICATION MIDDLEWARE + TILTÓLISTA ELLENŐRZÉS
  // ====================================================================
  async function requireAuth(req, res, next) {
    if (req.method === 'OPTIONS') {
      return next();
    }

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

      // Ellenőrizzük a feketelistát az adatbázisban
      const [banRows] = await pool.query('SELECT 1 FROM photo_banned_emails WHERE email = ?', [payload.email]);
      if (banRows.length > 0) {
        return res.status(403).json({ error: 'Ez a fiók biztonsági okokból véglegesen ki lett tiltva!' });
      }

      // Biztonságosan injektáljuk a kérésbe a hitelesített entitást
      req.user = {
        email: payload.email,
        name: payload.name,
        isAdmin: payload.email === ADMIN_EMAIL
      };

      next();
    } catch (error) {
      console.error("🔒 Biztonsági őr hiba a clubs modulban:", error.message);
      return res.status(401).json({ error: 'Lejárt vagy érvénytelen munkamenet token!' });
    }
  }

  // Helper funkció a klubvezetői/helyettesi jogosultság ellenőrzésére
  async function isClubManagement(email, clubId) {
    if (email === ADMIN_EMAIL) return true;
    const [rows] = await pool.query('SELECT club_role FROM photo_users WHERE email = ? AND club_id = ?', [email, clubId]);
    return rows.length > 0 && (rows[0].club_role === 'leader' || rows[0].club_role === 'deputy');
  }

  // Helper funkció egy találkozó klubazonosítójának kinyerésére
  async function getClubIdByMeeting(meetingId) {
    const [rows] = await pool.query('SELECT club_id FROM photo_club_meetings WHERE id = ?', [meetingId]);
    return rows.length > 0 ? rows[0].club_id : null;
  }

  // Helper funkció egy hír klubazonosítójának kinyerésére
  async function getClubIdByNews(newsId) {
    const [rows] = await pool.query('SELECT club_id FROM photo_club_news WHERE id = ?', [newsId]);
    return rows.length > 0 ? rows[0].club_id : null;
  }

  // ====================================================================
  // 📁 KLUBOK ALAP KEZELÉSE (VÉDETT)
  // ====================================================================
  app.get('/api/clubs', requireAuth, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT c.*, 
               (SELECT COUNT(*) FROM photo_users WHERE club_id = c.id AND club_role != 'pending') as member_count
        FROM photo_clubs c 
        ORDER BY c.name ASC
      `);
      res.json(rows);
    } catch (err) {
      console.error("❌ Hiba a klubok lekérésekor:", err.message);
      res.status(500).json({ error: 'Hiba a klubok lekérésekor' });
    }
  });

  app.post('/api/clubs', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Csak admin hozhat létre klubot!' });
    try { 
      await pool.query('INSERT IGNORE INTO photo_clubs (name) VALUES (?)', [req.body.name]); 
      res.json({ success: true }); 
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  app.delete('/api/clubs/:id', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Csak admin törölhet klubot!' });
    try { 
      await pool.query('DELETE FROM photo_clubs WHERE id = ?', [req.params.id]); 
      res.json({ success: true }); 
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // ====================================================================
  // ⏳ KLUBESTEK VÉDELME
  // ====================================================================
  app.get('/api/meetings', requireAuth, async (req, res) => {
    try { 
      const [rows] = await pool.query(`SELECT m.*, c.name as club_name FROM photo_club_meetings m JOIN photo_clubs c ON m.club_id = c.id ORDER BY m.meeting_date DESC, m.meeting_time DESC`); 
      res.json(rows); 
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  app.post('/api/meetings', upload.single('coverPhoto'), requireAuth, async (req, res) => {
    const { clubId, date, time, topic, description, locationType, locationDetails, videoLink } = req.body;
    const file = req.file; 
    
    if (!await isClubManagement(req.user.email, clubId)) {
      if (file) cleanupTempFile(file);
      return res.status(403).json({ error: 'Nincs jogosultságod ehhez a klubhoz eseményt rögzíteni!' });
    }

    let fileUrl = null; let driveFileId = null;
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

  app.put('/api/meetings/:id', upload.single('coverPhoto'), requireAuth, async (req, res) => {
    const file = req.file;
    const currentClubId = await getClubIdByMeeting(req.params.id);
    if (!currentClubId || !await isClubManagement(req.user.email, currentClubId)) {
      if (file) cleanupTempFile(file);
      return res.status(403).json({ error: 'Nincs jogosultságod eseményt szerkeszteni ebben a klubban!' });
    }

    const { date, time, topic, description, locationType, locationDetails, videoLink } = req.body;
    try {
      if (file) {
        const [oldRows] = await pool.query('SELECT drive_file_id FROM photo_club_meetings WHERE id = ?', [req.params.id]);
        if (oldRows.length > 0 && oldRows[0].drive_file_id) await drive.files.delete({ fileId: oldRows[0].drive_file_id }).catch(() => {});
        const fileStream = fs.createReadStream(file.path);
        const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
        const driveRes = await drive.files.create({ requestBody: { name: `Klubest_Cover_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, media: { mimeType: file.mimetype, body: fileStream }, fields: 'id, webViewLink' });
        cleanupTempFile(file);
        await pool.query('UPDATE photo_club_meetings SET meeting_date=?, meeting_time=?, topic=?, description=?, location_type=?, location_details=?, file_url=?, drive_file_id=?, video_link=? WHERE id=?', [date, time, topic, description, locationType, locationDetails, driveRes.data.webViewLink, driveRes.data.id, videoLink || null, req.params.id]);
      } else {
        await pool.query('UPDATE photo_club_meetings SET meeting_date=?, meeting_time=?, topic=?, description=?, location_type=?, location_details=?, video_link=? WHERE id=?', [date, time, topic, description, locationType, locationDetails, videoLink || null, req.params.id]);
      }
      res.json({ success: true });
    } catch (err) { cleanupTempFile(file); res.status(500).json({ error: 'Sikertelen Drive feltöltés.' }); }
  });

  app.delete('/api/meetings/:id', requireAuth, async (req, res) => {
    const currentClubId = await getClubIdByMeeting(req.params.id);
    if (!currentClubId || !await isClubManagement(req.user.email, currentClubId)) {
      return res.status(403).json({ error: 'Nincs jogosultságod az esemény törléséhez!' });
    }

    try {
      const [rows] = await pool.query('SELECT drive_file_id FROM photo_club_meetings WHERE id = ?', [req.params.id]);
      if (rows.length > 0 && rows[0].drive_file_id) await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(() => {});
      await pool.query('DELETE FROM photo_club_meetings WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Hiba a törlésnél' }); }
  });

  // ====================================================================
  // 👥 Jelenléti ívek védelme (Csak vezetőség láthatja!)
  // ====================================================================
  app.get('/api/attendance/:meetingId', requireAuth, async (req, res) => {
    const currentClubId = await getClubIdByMeeting(req.params.meetingId);
    if (!currentClubId || !await isClubManagement(req.user.email, currentClubId)) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Résztvevők listáját csak klubvezetők tölthetik le.' });
    }
    try { 
      const [rows] = await pool.query('SELECT user_email FROM photo_meeting_attendance WHERE meeting_id = ?', [req.params.meetingId]); 
      res.json(rows.map(r => r.user_email)); 
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  app.post('/api/attendance/:meetingId', requireAuth, async (req, res) => {
    const { clubId } = req.body;
    const currentClubId = clubId || await getClubIdByMeeting(req.params.meetingId);
    if (!currentClubId || !await isClubManagement(req.user.email, currentClubId)) {
      return res.status(403).json({ error: 'Nincs jogosultságod a jelenléti ív módosításához!' });
    }
    const { emails } = req.body; const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM photo_meeting_attendance WHERE meeting_id = ?', [req.params.meetingId]);
      if (emails && emails.length > 0) { const values = emails.map(email => [req.params.meetingId, email]); await conn.query('INSERT INTO photo_meeting_attendance (meeting_id, user_email) VALUES ?', [values]); }
      await conn.commit(); res.json({ success: true });
    } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); } finally { conn.release(); }
  });

  // ====================================================================
  // 📰 HÍREK SZEKCIÓ
  // ====================================================================
  // 🎯 JAVÍTVA: A hibás rendszer-ellenőrző snippet teljesen ki lett pucolva!
  app.get('/api/news/public', requireAuth, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT n.*, c.name as club_name,
               (SELECT COUNT(*) FROM photo_club_news_reads r WHERE r.news_id = n.id AND r.user_email = ?) as is_read 
        FROM photo_club_news n
        JOIN photo_clubs c ON n.club_id = c.id
        WHERE n.is_public = 1 
        ORDER BY n.created_at DESC
      `, [req.user.email]); 
      res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Hiba a nyilvános hírek lekérésekor' }); }
  });

  app.get('/api/clubs/:clubId/news', requireAuth, async (req, res) => {
    try { 
      const [rows] = await pool.query(`SELECT n.*, (SELECT COUNT(*) FROM photo_club_news_reads r WHERE r.news_id = n.id AND r.user_email = ?) as is_read FROM photo_club_news n WHERE n.club_id = ? ORDER BY n.created_at DESC`, [req.user.email, req.params.clubId]);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Hiba a hírek lekérésekor' }); }
  });

  app.post('/api/clubs/:clubId/news', requireAuth, async (req, res) => {
    const { title, content, isPublic } = req.body;
    const { clubId } = req.params;

    if (!await isClubManagement(req.user.email, clubId)) {
      return res.status(403).json({ error: 'Nincs jogosultságod hír posztolásához ebben a klubban!' });
    }

    try { 
      await pool.query(
        'INSERT INTO photo_club_news (club_id, author_email, author_name, title, content, is_public) VALUES (?, ?, ?, ?, ?, ?)', 
        [clubId, req.user.email, req.user.name, title, content, isPublic ? 1 : 0]
      );
      res.json({ success: true }); 
    } catch (err) { res.status(500).json({ error: 'Hiba a hír posztolásakor' }); }
  });

  app.delete('/api/news/:id', requireAuth, async (req, res) => {
    const currentClubId = await getClubIdByNews(req.params.id);
    if (!currentClubId || !await isClubManagement(req.user.email, currentClubId)) {
      return res.status(403).json({ error: 'Nincs jogosultságod a hír törléséhez!' });
    }
    try {
      await pool.query('DELETE FROM photo_club_news_reads WHERE news_id = ?', [req.params.id]);
      await pool.query('DELETE FROM photo_club_news_comments WHERE news_id = ?', [req.params.id]);
      await pool.query('DELETE FROM photo_club_news WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Hiba a hír törlésekor' }); }
  });

  app.post('/api/news/:id/read', requireAuth, async (req, res) => {
    try { await pool.query('INSERT IGNORE INTO photo_club_news_reads (news_id, user_email) VALUES (?, ?)', [req.params.id, req.user.email]); res.json({ success: true }); } 
    catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  app.get('/api/news/:id/readers', requireAuth, async (req, res) => {
    const currentClubId = await getClubIdByNews(req.params.id);
    if (!currentClubId || !await isClubManagement(req.user.email, currentClubId)) {
      return res.status(403).json({ error: 'Csak klubvezetők ellenőrizhetik az olvasottsági listát.' });
    }
    try { const [rows] = await pool.query(`SELECT r.user_email, u.name, r.read_at FROM photo_club_news_reads r JOIN photo_users u ON r.user_email = u.email WHERE r.news_id = ? ORDER BY r.read_at DESC`, [req.params.id]); res.json(rows); } 
    catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

// ====================================================================
  // 💬 HOZZÁSZÓLÁSOK LEKÉRÉSE PROFILKÉP (AVATAR) TÁMOGATÁSSAL
  // ====================================================================
  app.get('/api/news/:id/comments', requireAuth, async (req, res) => {
    try {
      // 🎯 JAVÍTVA: Összekötjük a kommenteket a photo_users táblával, így a frontend azonnal látni fogja a képeket!
      const [rows] = await pool.query(`
        SELECT c.*, u.avatar_url 
        FROM photo_club_news_comments c
        LEFT JOIN photo_users u ON LOWER(TRIM(c.user_email)) = LOWER(TRIM(u.email))
        WHERE c.news_id = ? 
        ORDER BY c.created_at ASC
      `, [req.params.id]);
      
      res.json(rows);
    } catch (err) {
      console.error("❌ Hiba a kommentek lekérésekor:", err.message);
      res.status(500).json({ error: 'Hiba a hozzászólások betöltésekor.' });
    }
  });

  // ====================================================================
  // 👥 TAGFELVÉTEL ÉS KÉRELMEK VÉDELME
  // ====================================================================
  app.get('/api/clubs/active-only', requireAuth, async (req, res) => {
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

  app.post('/api/clubs/join-request', requireAuth, async (req, res) => {
    const { clubId, clubName } = req.body;
    if (!clubId || !clubName) return res.status(400).json({ error: 'Hiányzó adatok!' });
    try {
      await pool.query("UPDATE photo_users SET club_id = ?, club_name = ?, club_role = 'pending' WHERE email = ?", [clubId, clubName, req.user.email]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/clubs/pending-members', requireAuth, async (req, res) => {
    const { clubId } = req.query;
    if (!clubId) return res.status(400).json({ error: 'Hiányzó klub azonosító!' });
    if (!await isClubManagement(req.user.email, clubId)) return res.status(403).json({ error: 'Nincs jogosultságod a kérelmek megtekintéséhez!' });
    
    try {
      const [rows] = await pool.query("SELECT email, name, club_name FROM photo_users WHERE club_id = ? AND club_role = 'pending'", [clubId]);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/clubs/handle-request', requireAuth, async (req, res) => {
    const { targetEmail, action, clubId, clubName } = req.body;
    
    if (!await isClubManagement(req.user.email, clubId)) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Csak a klub igazgatósága bírálhatja el a jelentkezéseket.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      if (action === 'approve') {
        await conn.query("UPDATE photo_users SET club_role = 'member' WHERE email = ?", [targetEmail]);
        await conn.query("UPDATE photo_club_memberships SET status = 'left', left_date = CURRENT_DATE() WHERE user_email = ? AND status = 'active'", [targetEmail]);
        await conn.query("INSERT INTO photo_club_memberships (club_id, club_name, user_email, club_role, joined_date, status) VALUES (?, ?, ?, 'member', CURRENT_DATE(), 'active')", [clubId, clubName, targetEmail]);
      } else {
        await conn.query("UPDATE photo_users SET club_id = NULL, club_name = NULL, club_role = 'member' WHERE email = ?", [targetEmail]);
        await conn.query("UPDATE photo_club_memberships SET status = 'left', left_date = CURRENT_DATE() WHERE user_email = ? AND club_id = ? AND status = 'active'", [targetEmail, clubId]);
      }
      await conn.commit(); res.json({ success: true });
    } catch (err) { await conn.rollback(); res.status(500).json({ error: err.message }); } finally { conn.release(); }
  });

  // ====================================================================
  // 🛡️ VEZETŐI ÉS HELYETTESI IRÁNYÍTÓPULT VÉGPONTOK
  // ====================================================================
  app.get('/api/my-club', requireAuth, async (req, res) => {
    try {
      const [userRows] = await pool.query('SELECT club_id, club_role FROM photo_users WHERE email = ?', [req.user.email]);
      if (userRows.length === 0 || !userRows[0].club_id) {
        return res.status(404).json({ error: 'Nem tartozol egyetlen regisztrált fotóklubhoz sem!' });
      }

      const { club_id, club_role } = userRows[0];
      if (club_role !== 'leader' && club_role !== 'deputy' && req.user.email !== ADMIN_EMAIL) {
        return res.status(403).json({ error: 'Nincs jogosultságod a klubvezetői adatok eléréséhez!' });
      }

      const [clubRows] = await pool.query('SELECT * FROM photo_clubs WHERE id = ?', [club_id]);
      const [members] = await pool.query("SELECT name, email, club_role FROM photo_users WHERE club_id = ? AND club_role != 'pending' ORDER BY name ASC", [club_id]);
      res.json({ club: clubRows[0], members });
    } catch (err) { res.status(500).json({ error: 'Szerveroldali hiba' }); }
  });

  app.post('/api/my-club/update-name', requireAuth, async (req, res) => {
    const { clubId, newClubName } = req.body;
    if (!await isClubManagement(req.user.email, clubId)) return res.status(403).json({ error: 'Megtagadva!' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE photo_clubs SET name = ? WHERE id = ?', [newClubName.trim(), clubId]);
      await conn.query('UPDATE photo_users SET club_name = ? WHERE club_id = ?', [newClubName.trim(), clubId]);
      await conn.commit(); res.json({ success: true });
    } catch (err) { await conn.rollback(); res.status(500).json({ error: 'Hiba' }); } finally { conn.release(); }
  });

  app.post('/api/my-club/logo', upload.single('logo'), requireAuth, async (req, res) => {
    const file = req.file; if (!file) return res.status(400).json({ error: 'Fájl kötelező!' });
    const { clubId } = req.body;

    if (!await isClubManagement(req.user.email, clubId)) {
      cleanupTempFile(file); return res.status(403).json({ error: 'Megtagadva!' });
    }

    try {
      const [clubRows] = await pool.query('SELECT drive_logo_id FROM photo_clubs WHERE id = ?', [clubId]);
      if (clubRows.length > 0 && clubRows[0].drive_logo_id) {
        await drive.files.delete({ fileId: clubRows[0].drive_logo_id }).catch(() => {});
      }
      const fileExt = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
      const driveRes = await drive.files.create({ requestBody: { name: `ClubLogo_${clubId}_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, media: { mimeType: file.mimetype, body: fs.createReadStream(file.path) }, fields: 'id, webViewLink' });
      cleanupTempFile(file);
      await pool.query('UPDATE photo_clubs SET logo_url = ?, drive_logo_id = ? WHERE id = ?', [driveRes.data.webViewLink, driveRes.data.id, clubId]);
      res.json({ success: true });
    } catch (err) { cleanupTempFile(file); res.status(500).json({ error: err.message }); }
  });

  // ====================================================================
  // 🎯 KLUB PÉNZÜGYEK ÉS TAGNYILVÁNTARTÁS VÉDELME
  // ====================================================================
  app.get('/api/my-club/admin-records', requireAuth, async (req, res) => {
    const { clubId } = req.query;
    if (!clubId) return res.status(400).json({ error: 'Hiányzó klub azonosító!' });

    if (!await isClubManagement(req.user.email, clubId)) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Csak a klubvezetés láthatja a belső nyilvántartást.' });
    }

    try {
      const [allTimeMembers] = await pool.query(`
        SELECT 
          u.name, 
          u.email, 
          u.club_role,
          u.shipping_address,
          1 as is_currently_here,
          COALESCE(DATE_FORMAT((SELECT joined_date FROM photo_club_memberships WHERE user_email = u.email AND club_id = u.club_id AND status = 'active' LIMIT 1), '%Y-%m-%d'), 'Ismeretlen') as membership_start,
          NULL as membership_end
        FROM photo_users u
        WHERE u.club_id = ? AND u.club_role != 'pending'

        UNION ALL

        SELECT 
          u.name, 
          u.email, 
          m.club_role,
          u.shipping_address,
          0 as is_currently_here,
          DATE_FORMAT(m.joined_date, '%Y-%m-%d') as membership_start,
          DATE_FORMAT(m.left_date, '%Y-%m-%d') as membership_end
        FROM photo_club_memberships m
        JOIN photo_users u ON m.user_email = u.email
        WHERE m.club_id = ? AND m.status = 'left' AND (u.club_id IS NULL OR u.club_id != ?)
        
        ORDER BY is_currently_here DESC, name ASC
      `, [clubId, clubId, clubId]);

      const [payments] = await pool.query(`
        SELECT id, user_email, fiscal_year, fee_amount, paid_amount, DATE_FORMAT(payment_date, '%Y-%m-%d') as payment_date 
        FROM photo_club_payments 
        WHERE club_id = ?
        ORDER BY fiscal_year DESC, payment_date DESC
      `, [clubId]);

      res.json({ members: allTimeMembers, payments });
    } catch (err) {
      console.error("❌ Hiba az adminisztratív rekordok lekérésekor:", err.message);
      res.status(500).json({ error: 'Szerveroldali hiba történt.' });
    }
  });

  app.post('/api/my-club/member/log-payment', requireAuth, async (req, res) => {
    const { clubId, targetEmail, fiscalYear, feeAmount, paidAmount, paymentDate } = req.body;
    
    if (!await isClubManagement(req.user.email, clubId)) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nincs jogod tagdíjat rögzíteni.' });
    }

    try {
      const [existing] = await pool.query('SELECT id FROM photo_club_payments WHERE club_id = ? AND user_email = ? AND fiscal_year = ?', [clubId, targetEmail, fiscalYear]);

      if (existing.length > 0) {
        await pool.query(
          'UPDATE photo_club_payments SET fee_amount = ?, paid_amount = ?, payment_date = ? WHERE id = ?',
          [feeAmount, paidAmount, paymentDate || null, existing[0].id]
        );
      } else {
        await pool.query(
          'INSERT INTO photo_club_payments (club_id, user_email, fiscal_year, fee_amount, paid_amount, payment_date) VALUES (?, ?, ?, ?, ?, ?)',
          [clubId, targetEmail, fiscalYear, feeAmount, paidAmount, paymentDate || null]
        );
      }
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // 🎯 ÚJ: RENDESZETT INTERFÉSZ A HISTÓRIKUS TAGDÍJAKHOZ (ÁTHELYEZVE /api/clubs/ my-payments ALÁ)
  app.get('/api/clubs/my-payments', requireAuth, async (req, res) => {
    const { userEmail } = req.query;
    if (!userEmail) return res.status(400).json({ error: 'Hiányzó e-mail cím!' });
    if (req.user.email !== userEmail && !req.user.isAdmin) return res.status(403).json({ error: 'Megtagadva!' });
    try {
      const [rows] = await pool.query(
        `SELECT 
          p.fiscal_year, 
          p.fee_amount, 
          p.paid_amount, 
          (p.fee_amount - p.paid_amount) AS outstanding_balance, 
          DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS payment_date, 
          COALESCE(c.name, 'Klubtagság') AS target_club_name 
         FROM photo_club_payments p 
         LEFT JOIN photo_clubs c ON p.club_id = c.id 
         WHERE LOWER(TRIM(p.user_email)) = LOWER(TRIM(?)) 
         ORDER BY p.fiscal_year DESC`,
        [userEmail]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  app.post('/api/my-club/member/update-dates', requireAuth, async (req, res) => {
    const { clubId, targetEmail, membershipStart, membershipEnd } = req.body;
    if (!targetEmail || !clubId) return res.status(400).json({ error: 'Hiányzó azonosítók!' });
    
    if (!await isClubManagement(req.user.email, clubId)) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nincs jogod a tagsági viszonyok módosításához.' });
    }

    try {
      const status = membershipEnd ? 'left' : 'active';
      const [existingLog] = await pool.query('SELECT id FROM photo_club_memberships WHERE user_email = ? AND club_id = ?', [targetEmail, clubId]);

      if (existingLog.length > 0) {
        await pool.query(
          'UPDATE photo_club_memberships SET joined_date = ?, left_date = ?, status = ? WHERE id = ?',
          [membershipStart, membershipEnd, status, existingLog[0].id]
        );
      } else {
        await pool.query(
          'INSERT INTO photo_club_memberships (club_id, club_name, user_email, club_role, joined_date, left_date, status) VALUES (?, (SELECT name FROM photo_clubs WHERE id = ?), ?, "member", ?, ?, ?)',
          [clubId, clubId, targetEmail, membershipStart, membershipEnd, status]
        );
      }

      if (status === 'left') {
        await pool.query("UPDATE photo_users SET club_id = NULL, club_name = NULL, club_role = 'member' WHERE email = ?", [targetEmail]);
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Adatbázis hiba történt a mentés során: ' + err.message });
    }
  });
  // ====================================================================
  // 🏛️ FÓRUM KATEGÓRIÁK KEZELÉSE
  // ====================================================================
  
  // 1. Kategóriák listázása (Minden bejelentkezett tagnak elérhető)
    // 🎯 FRISSÍTVE: Kategóriák listázása intelligens olvasatlan-számlálóval
    // 🎯 REAKTÍV ÖSSZEVONT SZÁMLÁLÓ: Kategóriák listázása olvasatlan-számlálóval
  app.get('/api/forum/categories', requireAuth, async (req, res) => {
    const { mode, clubId } = req.query;
    
    try {
      let query = '';
      let params = [];

      if (mode === 'public' && clubId) {
        // Nyilvános oldal + Bejelentkezett klubtag: Látja a nyilvánosat ÉS a saját belső klubos posztjait is!
        query = `
          SELECT c.*, 
            (SELECT COUNT(*) 
             FROM photo_club_news n 
             WHERE n.category_id = c.id 
               AND (n.is_public = 1 OR n.club_id = ?) 
               AND n.id NOT IN (SELECT news_id FROM photo_club_news_reads WHERE user_email = ?)
            ) as unread_count
          FROM photo_forum_categories c
          ORDER BY c.id ASC
        `;
        params = [clubId, req.user.email];
      } else if (mode === 'public') {
        // Nyilvános oldal + Külsős látogató (nincs klubja): Csak a teljesen nyilvános posztok olvasatlanságát számoljuk
        query = `
          SELECT c.*, 
            (SELECT COUNT(*) 
             FROM photo_club_news n 
             WHERE n.category_id = c.id 
               AND n.is_public = 1 
               AND n.id NOT IN (SELECT news_id FROM photo_club_news_reads WHERE user_email = ?)
            ) as unread_count
          FROM photo_forum_categories c
          ORDER BY c.id ASC
        `;
        params = [req.user.email];
      } else {
        // Tisztán belső Klub Fórum oldal: Csak a saját klub belső posztjait számoljuk
        query = `
          SELECT c.*, 
            (SELECT COUNT(*) 
             FROM photo_club_news n 
             WHERE n.category_id = c.id 
               AND n.club_id = ? 
               AND n.id NOT IN (SELECT news_id FROM photo_club_news_reads WHERE user_email = ?)
            ) as unread_count
          FROM photo_forum_categories c
          ORDER BY c.id ASC
        `;
        params = [clubId || null, req.user.email];
      }

      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Hiba a kategóriák lekérésekor.' });
    }
  });

// ====================================================================
  // 🏛️ FÓRUM POSZTOK LEKÉRÉSE AVATAR TÁMOGATÁSSAL ÉS SZINTAKTIKAI JAVÍTÁSSAL
  // ====================================================================
  app.get('/api/forum/categories/:categoryId/posts', requireAuth, async (req, res) => {
    const { categoryId } = req.params;
    const { mode, clubId } = req.query;
    const userEmail = req.user.email;

    try {
      let query = '';
      let params = [];

      // Megtisztítjuk a beérkező clubId-t a frontend stringes "null/undefined" anomáliáitól
      const cleanClubId = (clubId && clubId !== 'null' && clubId !== 'undefined' && String(clubId).trim() !== '') ? Number(clubId) : null;

      if (mode === 'public') {
        if (cleanClubId) {
          // Nyilvános mód + Klubtag: Látja a nyilvános posztokat ÉS a saját belső klubja posztjait is
          query = `
            SELECT n.*, c.name as club_name, u.avatar_url,
                   (SELECT COUNT(*) FROM photo_club_news_reads r WHERE r.news_id = n.id AND r.user_email = ?) as is_read 
            FROM photo_club_news n
            LEFT JOIN photo_clubs c ON n.club_id = c.id
            LEFT JOIN photo_users u ON LOWER(TRIM(n.author_email)) = LOWER(TRIM(u.email))
            WHERE n.category_id = ? AND (n.is_public = 1 OR n.club_id = ?)
            ORDER BY n.created_at DESC
          `;
          params = [userEmail, categoryId, cleanClubId];
        } else {
          // 🎯 JAVÍTVA: Nyilvános mód + Külsős/Testuser (nincs klubja): Csak a teljesen publikus posztok jönnek le
          // Kiküszöböltük a hiányzó 'AND' miatti 500-as adatbázis hibát, és hozzáfűztük az u.avatar_url-t!
          query = `
            SELECT n.*, c.name as club_name, u.avatar_url,
                   (SELECT COUNT(*) FROM photo_club_news_reads r WHERE r.news_id = n.id AND r.user_email = ?) as is_read 
            FROM photo_club_news n
            LEFT JOIN photo_clubs c ON n.club_id = c.id
            LEFT JOIN photo_users u ON LOWER(TRIM(n.author_email)) = LOWER(TRIM(u.email))
            WHERE n.category_id = ? AND n.is_public = 1
            ORDER BY n.created_at DESC
          `;
          params = [userEmail, categoryId];
        }
      } else {
        // Tisztán zárt Klub Fórum nézet
        if (!cleanClubId) return res.status(400).json({ error: 'Ehhez a nézethez be kell lépned egy klubba!' });
        
        query = `
          SELECT n.*, c.name as club_name, u.avatar_url,
                 (SELECT COUNT(*) FROM photo_club_news_reads r WHERE r.news_id = n.id AND r.user_email = ?) as is_read 
          FROM photo_club_news n
          LEFT JOIN photo_clubs c ON n.club_id = c.id
          LEFT JOIN photo_users u ON LOWER(TRIM(n.author_email)) = LOWER(TRIM(u.email))
          WHERE n.category_id = ? AND n.club_id = ?
          ORDER BY n.created_at DESC
        `;
        params = [userEmail, categoryId, cleanClubId];
      }

      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (err) {
      console.error("❌ Fórum posztok lekérdezési hiba:", err.message);
      res.status(500).json({ error: 'Hiba a fórumbejegyzések lekérésekor.' });
    }
  });



  // 2. Új kategória létrehozása (KIZÁRÓLAG GLOBÁLIS ADMINNAK)
    // 1. Új kategória létrehozása leírással (Admin)
  app.post('/api/forum/categories', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Csak a főadminisztrátor hozhat létre új fórumcsoportot!' });
    const { name, description } = req.body;
    try {
      await pool.query('INSERT INTO photo_forum_categories (name, description) VALUES (?, ?)', [name, description || 'Szabad eszmecsere és témanyitás']);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Hiba a mentés során.' });
    }
  });

  // 2. Kategória szerkesztése leírással (Admin)
  app.put('/api/forum/categories/:id', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Csak a főadminisztrátor szerkesztheti a fórumcsoportokat!' });
    const { name, description } = req.body;
    try {
      await pool.query('UPDATE photo_forum_categories SET name = ?, description = ? WHERE id = ?', [name, description, req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Hiba a frissítés során.' });
    }
  });


  // ====================================================================
  // 📝 FÓRUM BEJEGYZÉSEK (POSTS) SZŰRT LEKÉRÉSE ÉS MENTÉSE
  // ====================================================================

 

  // 5. Új téma/beszélgetés indítása
    // 1. Új téma/beszélgetés indítása KÉPFELTÖLTÉSSEL
    // 🎯 VÉGLEGES FIX: Fórumposzt-mentő végpont natív fájltörléssel
    // 🎯 JAVÍTVA: Intelligens klub-azonosító kezelés a null értékek kivédésére
// ====================================================================
  // 📝 ÚJ TÉMA INDÍTÁSA INTEGRÁLT PONTRENDSZERREL
  // ====================================================================
  app.post('/api/forum/categories/:categoryId/posts', upload.single('photo'), requireAuth, async (req, res) => {
    const { categoryId } = req.params;
    const { clubId, title, content, isPublic } = req.body;
    const file = req.file;

    // Vezetőségi ellenőrzés az 1-es kategóriához
    if (Number(categoryId) === 1 && !req.user.isAdmin) {
      const [rows] = await pool.query('SELECT club_role FROM photo_users WHERE email = ? AND club_id = ?', [req.user.email, clubId]);
      const userRole = rows[0]?.club_role;
      if (userRole !== 'leader' && userRole !== 'deputy') {
        if (file) cleanupTempFile(file);
        return res.status(403).json({ error: 'A Hírek kategóriába kizárólag a vezetőség posztolhat!' });
      }
    }

    let fileUrl = null; 
    let driveFileId = null;

    try {
      if (file) {
        const fileStream = fs.createReadStream(file.path);
        const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
        const driveRes = await drive.files.create({
          requestBody: { name: `Forum_Post_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] },
          media: { mimeType: file.mimetype, body: fileStream },
          fields: 'id, webViewLink'
        });
        fileUrl = driveRes.data.webViewLink; 
        driveFileId = driveRes.data.id;
        cleanupTempFile(file);
      }

      // 🎯 BIZTONSÁGI FIX: Ha a beküldött clubId üres vagy "null" string, megpróbáljuk a bejelentkezett user saját klubját használni, különben 0-át vagy NULL-t adunk át
      let finalClubId = null;
      if (clubId && clubId !== 'null' && clubId !== 'undefined' && String(clubId).trim() !== '') {
        finalClubId = Number(clubId);
      } else if (req.user.club_id) {
        finalClubId = Number(req.user.club_id);
      }

      // 🎯 MODOSÍTVA: Kimentjük a mentés eredményét a [result] tömbbe
      const [result] = await pool.query(
        'INSERT INTO photo_club_news (category_id, club_id, author_email, author_name, title, content, is_public, file_url, drive_file_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [categoryId, finalClubId, req.user.email, req.user.name, title, content, isPublic === 'true' || isPublic === true ? 1 : 0, fileUrl, driveFileId]
      );

      // 🪙 JUTALOMPONT: Ha a mentés sikeres volt, azonnal kiosztunk +10 bónuszpontot a szerzőnek
      if (result && result.insertId) {
        try {
          await PointsService.handleTransaction(
            pool, 
            req.user.email, 
            10, // +10 pont jár érte
            'forum_post', 
            result.insertId, // Összekötjük a pontot a poszt ID-jával
            `📝 Új témát indítottál a fórumban: "${title.trim()}"`,
            `Started a new topic in the forum: "${title.trim()}"`
          );
        } catch (pe) {
          // Ha a pontozás valamiért hibára futna, a konzolra kiírjuk, de a posztot nem engedjük elveszni!
          console.error("❌ Fórum poszt pontozási hiba:", pe.message);
        }
      }

      res.json({ success: true });
    } catch (err) {
      if (file) cleanupTempFile(file);
      console.error("❌ Fórum mentési hiba:", err.message);
      res.status(500).json({ error: 'Hiba a téma létrehozásakor az adatbázisban.' });
    }
  });


  // 🎯 ÚJ: Fórumbejegyzés/Téma utólagos szerkesztése (Csak a szerző vagy Admin)
  app.put('/api/forum/posts/:id', requireAuth, async (req, res) => {
    const { title, content, isPublic } = req.body;
    const postId = req.params.id;

    try {
      // 🔒 Első lépésként leellenőrizzük, létezik-e a poszt, és ki írta
      const [rows] = await pool.query('SELECT author_email FROM photo_club_news WHERE id = ?', [postId]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'A keresett beszélgetés nem található!' });
      }

      const isOwnPost = rows[0].author_email === req.user.email;
      if (!isOwnPost && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Nincs jogosultságod a bejegyzés módosításához!' });
      }

      // Frissítjük a címet, tartalmat és a láthatóságot
      await pool.query(
        'UPDATE photo_club_news SET title = ?, content = ?, is_public = ? WHERE id = ?',
        [title, content, isPublic ? 1 : 0, postId]
      );

      res.json({ success: true });
    } catch (err) {
      console.error("❌ Fórum szerkesztési hiba:", err.message);
      res.status(500).json({ error: 'Hiba történt a bejegyzés mentésekor.' });
    }
  });

// ====================================================================
  // 💬 ÚJ HOZZÁSZÓLÁS KÜLDÉSE INTEGRÁLT PONTRENDSZERREL
  // ====================================================================
  app.post('/api/news/:id/comments', upload.single('photo'), requireAuth, async (req, res) => {
    const { commentText } = req.body;
    const newsId = req.params.id;
    const file = req.file;

    let fileUrl = null; 
    let driveFileId = null;

    try {
      if (file) {
        const fileStream = fs.createReadStream(file.path);
        const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
        const driveRes = await drive.files.create({
          requestBody: { name: `Forum_Comment_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] },
          media: { mimeType: file.mimetype, body: fileStream },
          fields: 'id, webViewLink'
        });
        fileUrl = driveRes.data.webViewLink; 
        driveFileId = driveRes.data.id;
        cleanupTempFile(file);
      }

      // 🎯 MODOSÍTVA: Kimentjük a komment mentésének eredményét a [result] változóba
      const [result] = await pool.query(
        'INSERT INTO photo_club_news_comments (news_id, user_email, user_name, comment_text, file_url, drive_file_id) VALUES (?, ?, ?, ?, ?, ?)', 
        [newsId, req.user.email, req.user.name, commentText || '', fileUrl, driveFileId]
      );

      // 🪙 JUTALOMPONT: Ha a komment bekerült az adatbázisba, kap +5 pontot a felhasználó
      if (result && result.insertId) {
        try {
          // Lekérjük a főbejegyzés címét, hogy a pontnaplóban szépen jelenjen meg a kontextus
          const [postRows] = await pool.query('SELECT title FROM photo_club_news WHERE id = ?', [newsId]);
          const postTitle = postRows[0]?.title || 'Fórum beszélgetés';
          
          await PointsService.handleTransaction(
            pool, 
            req.user.email, 
            5, // +5 pont jár érte
            'forum_comment', 
            result.insertId, // Összekötjük a tranzakciót a komment egyedi ID-jával
            `💬 Hozzászóltál a(z) "${postTitle.trim()}" témához`,
            `Commented on topic: "${postTitle.trim()}"`
          );
        } catch (pe) {
          // Ha a pontozó modul hibázna, naplózzuk, de a kommentet nem bántjuk
          console.error("❌ Fórum komment pontozási hiba:", pe.message);
        }
      }

      res.json({ success: true });
    } catch (err) { 
      if (file) cleanupTempFile(file);
      res.status(500).json({ error: 'Hiba a kommentelés során.' }); 
    }
  });

 // ====================================================================
  // ❤️ ATOMI FÓRUM POSZT LÁJKOLÁS JUTALOMPONT RENDSZERREL (DEADLOCK-PROOF)
  // ====================================================================
  app.post('/api/forum/posts/:id/like', requireAuth, async (req, res) => {
    const postId = req.params.id;
    const userEmail = req.user.email;
    
    try {
      // 1. Ellenőrizzük a poszt létezését és a szerzőt
      const [postRows] = await pool.query('SELECT author_email, title FROM photo_club_news WHERE id = ?', [postId]);
      if (postRows.length === 0) {
        return res.status(404).json({ error: 'A beszélgetés nem található!' });
      }
      const authorEmail = postRows[0].author_email;
      const postTitle = postRows[0].title;

      // 2. Megnézzük, létezik-e már a lájk rekord
      const [existing] = await pool.query('SELECT id FROM photo_club_news_likes WHERE news_id = ? AND user_email = ?', [postId, userEmail]);
      
      if (existing.length > 0) {
        // --- UNLIKE FOLYAMAT ---
        await pool.query('DELETE FROM photo_club_news_likes WHERE news_id = ? AND user_email = ?', [postId, userEmail]);
        
        // Csökkentjük a számlálót (ha hibára futna mert nincs oszlop, menet közben létrehozzuk)
        await pool.query('UPDATE photo_club_news SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?', [postId]).catch(async () => {
          await pool.query('ALTER TABLE photo_club_news ADD COLUMN likes_count INT DEFAULT 0').catch(()=>{});
          await pool.query('UPDATE photo_club_news SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?', [postId]);
        });

        // Pontlevonás korrekció (kivéve ha saját magát lájkolta)
        if (authorEmail && authorEmail !== userEmail) {
          await PointsService.handleTransaction(
            pool, authorEmail, -1, 'forum_like_revoked', postId,
            `💔 Visszavonták egy kedvelésedet a(z) "${postTitle}" témádról`,
            `A like was revoked from your topic: "${postTitle}"`
          ).catch(e => console.error("⚠️ Pont korrekciós hiba:", e.message));
        }
        
        return res.json({ success: true, liked: false });
      } else {
        // --- LIKE FOLYAMAT ---
        await pool.query('INSERT INTO photo_club_news_likes (news_id, user_email) VALUES (?, ?)', [postId, userEmail]);
        
        // Növeljük a számlálót (ha hibára futna mert nincs oszlop, menet közben létrehozzuk)
        await pool.query('UPDATE photo_club_news SET likes_count = likes_count + 1 WHERE id = ?', [postId]).catch(async () => {
          await pool.query('ALTER TABLE photo_club_news ADD COLUMN likes_count INT DEFAULT 0').catch(()=>{});
          await pool.query('UPDATE photo_club_news SET likes_count = likes_count + 1 WHERE id = ?', [postId]);
        });

        // Pontosztás a szerzőnek (kivéve ha saját magát lájkolja)
        if (authorEmail && authorEmail !== userEmail) {
          await PointsService.handleTransaction(
            pool, authorEmail, 1, 'forum_like_received', postId,
            `❤️ Valaki kedvelte a(z) "${postTitle}" témádat!`,
            `Someone liked your topic: "${postTitle}"`
          ).catch(e => console.error("⚠️ Pont osztási hiba:", e.message));
        }
        
        return res.json({ success: true, liked: true });
      }
    } catch (err) {
      console.error("❌ Fórum lájk feldolgozási hiba:", err);
      res.status(500).json({ error: 'Hiba történt a kedvelés feldolgozásakor.' });
    }
  });
  
  app.get('/api/clubs/active-membership', requireAuth, async (req, res) => {
    try {
      const [rows] = await pool.query(
        "SELECT DATE_FORMAT(joined_date, '%Y-%m-%d') as membership_start, DATE_FORMAT(left_date, '%Y-%m-%d') as membership_end FROM photo_club_memberships WHERE user_email = ? AND status = 'active' LIMIT 1",
        [req.user.email]
      );
      res.json(rows[0] || { membership_start: null, membership_end: null });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
  
  app.get('/api/dashboard-alerts', requireAuth, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT club_name, club_id FROM photo_users WHERE email = ?', [req.user.email]);
    let clubId = users.length > 0 ? users[0].club_id : null;

    const [contests] = await pool.query(`SELECT id, title, end_date, restricted_club_id FROM photo_contests WHERE start_date <= CURRENT_DATE() AND end_date >= CURRENT_DATE() AND (restricted_club_id IS NULL OR restricted_club_id = 0 OR restricted_club_id = ?) ORDER BY end_date ASC`, [clubId || null]);
    const [weekly] = await pool.query('SELECT id, title, end_date FROM weekly_topics WHERE start_date <= CURRENT_DATE() AND end_date >= CURRENT_DATE()');

    let homeworks = []; 
    if (clubId) {
      const [hw] = await pool.query('SELECT id, topic, deadline FROM photo_homeworks WHERE club_id = ? AND deadline >= CURRENT_DATE() ORDER BY deadline ASC', [clubId]);
      homeworks = hw;
    }

    // 🎯 JAVÍTVA: Kivettük a zárt if(clubId) blokkból, így mindenki látja a csoportokat!
    // Kibővítettük a kijelölt mezőket a (category_id, is_public) oszlopokkal a frontend bento-kártya számára.
    const [unreadNews] = await pool.query(`
      SELECT id, title, created_at, category_id, is_public 
      FROM photo_club_news 
      WHERE (is_public = 1 OR (club_id IS NOT NULL AND club_id = ?))
        AND id NOT IN (SELECT news_id FROM photo_club_news_reads WHERE user_email = ?)
      ORDER BY created_at DESC
    `, [clubId || 0, req.user.email]);

    const [mapComments] = await pool.query(`SELECT c.id as comment_id, c.location_id, l.title as location_title, c.user_name, c.created_at FROM photo_location_comments c JOIN photo_locations l ON c.location_id = l.id WHERE l.user_email = ? AND c.user_email != ? AND c.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) AND c.id NOT IN (SELECT comment_id FROM photo_location_comment_reads WHERE user_email = ?) ORDER BY c.created_at DESC LIMIT 5`, [req.user.email, req.user.email, req.user.email]);
    
    res.json({ contests, weekly, homeworks, unreadNews, mapComments });
  } catch (err) { 
    console.error("❌ Dashboard összesítési hiba:", err);
    res.status(500).json({ error: 'Hiba az értesítések betöltésekor.' }); 
  }
});


  // ====================================================================
  // 🚫 TILTÓLISTA KEZELÉSE (KIZÁRÓLAG GLOBÁLIS ADMINOKNAK)
  // ====================================================================
  
  // 1. Tiltólista teljes lekérése
  app.get('/api/admin/banned-emails', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    try {
      const [rows] = await pool.query('SELECT email, DATE_FORMAT(banned_at, "%Y-%m-%d %H:%i") as banned_at FROM photo_banned_emails ORDER BY banned_at DESC');
      res.json(rows);
    } catch (err) { 
      console.error("❌ Hiba a tiltólista lekérésekor:", err.message);
      res.status(500).json({ error: 'Szerveroldali hiba történt a lekérés során.' }); 
    }
  });

  // 2. Új e-mail végleges kitiltása és az adatok azonnali takarítása
  app.post('/api/admin/banned-emails', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    
    try {
      const { email } = req.body;
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Érvényes e-mail cím megadása kötelező!' });
      }

      const targetEmail = email.trim().toLowerCase();
      const conn = await pool.getConnection();
      
      try {
        await conn.beginTransaction();
        
        // Elhelyezzük a feketelistában
        await conn.query('INSERT IGNORE INTO photo_banned_emails (email) VALUES (?)', [targetEmail]);
        
        // GDPR takarítás: Töröljük az aktív felhasználók közül
        await conn.query('DELETE FROM photo_users WHERE email = ?', [targetEmail]);
        
        await conn.commit();
        res.json({ success: true, message: 'E-mail cím sikeresen tiltva, adatok törölve.' });
      } catch (innerErr) {
        await conn.rollback();
        throw innerErr;
      } finally { 
        conn.release(); 
      }
    } catch (err) {
      console.error("❌ Hiba a kitiltási folyamat során:", err.message);
      res.status(500).json({ error: `Adatbázis hiba: ${err.message}` });
    }
  });

  // ====================================================================
  // ❤️ HOZZÁSZÓLÁS LÁJKOLÁS JUTALOMPONT RENDSZERREL (ANTI-CHEAT)
  // ====================================================================
  app.post('/api/forum/comments/:id/like', requireAuth, async (req, res) => {
    const commentId = req.params.id;
    const userEmail = req.user.email;
    
    try {
      // 1. Ellenőrizzük a hozzászólás létezését
      const [commentRows] = await pool.query('SELECT user_email, news_id FROM photo_club_news_comments WHERE id = ?', [commentId]);
      if (commentRows.length === 0) {
        return res.status(404).json({ error: 'A hozzászólás nem található!' });
      }
      const authorEmail = commentRows[0].user_email;
      const newsId = commentRows[0].news_id;

      // 2. Megnézzük, lájkolta-e már
      const [existing] = await pool.query('SELECT id FROM photo_club_news_comment_likes WHERE comment_id = ? AND user_email = ?', [commentId, userEmail]);
      
      if (existing.length > 0) {
        // --- UNLIKE FOLYAMAT ---
        await pool.query('DELETE FROM photo_club_news_comment_likes WHERE comment_id = ? AND user_email = ?', [commentId, userEmail]);
        await pool.query('UPDATE photo_club_news_comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?', [commentId]);

        // -1 pont levonás a komment írójától (ha nem önlájk volt)
        if (authorEmail && authorEmail !== userEmail) {
          await PointsService.handleTransaction(
            pool, authorEmail, -1, 'forum_comment_like_revoked', commentId,
            `💔 Visszavonták egy kedvelésedet a hozzászólásodról`,
            `A like was revoked from your comment`
          ).catch(e => console.error("⚠️ Komment pontlevonási hiba:", e.message));
        }
        
        return res.json({ success: true, liked: false });
      } else {
        // --- LIKE FOLYAMAT ---
        await pool.query('INSERT INTO photo_club_news_comment_likes (comment_id, user_email) VALUES (?, ?)', [commentId, userEmail]);
        await pool.query('UPDATE photo_club_news_comments SET likes_count = likes_count + 1 WHERE id = ?', [commentId]);

        // +1 pont kiosztása a komment írójának (ha nem önlájk)
        if (authorEmail && authorEmail !== userEmail) {
          await PointsService.handleTransaction(
            pool, authorEmail, 1, 'forum_comment_like_received', commentId,
            `❤️ Valaki kedvelte a hozzászólásodat egy fórumbeszélgetésben!`,
            `Someone liked your comment in a forum topic`
          ).catch(e => console.error("⚠️ Komment pontozási hiba:", e.message));
        }
        
        return res.json({ success: true, liked: true });
      }
    } catch (err) {
      console.error("❌ Komment lájk feldolgozási hiba:", err);
      res.status(500).json({ error: 'Hiba történt a hozzászólás kedvelésekor.' });
    }
  });
  
  // 3. Kitiltás feloldása (Unban)
  app.delete('/api/admin/banned-emails/:email', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    try {
      const targetEmail = req.params.email.trim().toLowerCase();
      await pool.query('DELETE FROM photo_banned_emails WHERE email = ?', [targetEmail]);
      res.json({ success: true, message: 'A kitiltás sikeresen feloldva.' });
    } catch (err) { 
      res.status(500).json({ error: `Hiba a feloldáskor: ${err.message}` }); 
    }
  });
};
