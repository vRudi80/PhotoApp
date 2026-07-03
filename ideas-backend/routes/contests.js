const fs = require('fs');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kovari.rudolf@gmail.com';

// ====================================================================
// 🔒 GOLYÓÁLLÓ AUTHENTICATION MIDDLEWARE A CONTESTS MODULHOZ
// ====================================================================
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Hozzáférés megtagadva! Nincs hitelesítési token.' });
    }

    const token = authHeader.split(' ')[1];
    
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'Érvénytelen vagy sérült Google token.' });
    }

    req.user = {
      email: payload.email,
      name: payload.name,
      isAdmin: payload.email === ADMIN_EMAIL
    };

    next();
  } catch (error) {
    console.error("🔒 Biztonsági őr hiba a contests modulban:", error.message);
    return res.status(401).json({ error: 'Lejárt vagy érvénytelen munkamenet token!' });
  }
}

module.exports = function(app, pool, drive, upload, cleanupTempFile) {
  
  // ── 🎯 BIZTONSÁGI CORS KAPU ──
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://photawesome.com");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
  
  // 1. Pályázatok lekérése (Nyilvános)
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

  // 2. Új pályázat létrehozása (VÉDETT: Csak Admin)
  app.post('/api/contests', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva! Csak admin hozhat létre pályázatot.' });
    
    const { 
      title, description, startDate, endDate, categories, 
      restrictedClubId, sponsorClubId, entryFee, feeCurrency, categorySettings 
    } = req.body;

    try { 
      let restrictedClubName = null;
      if (restrictedClubId) {
        const [clubRows] = await pool.query('SELECT name FROM photo_clubs WHERE id = ?', [restrictedClubId]);
        if (clubRows.length > 0) restrictedClubName = clubRows[0].name;
      }

      const query = `
        INSERT INTO photo_contests (
          title, description, start_date, end_date, categories, 
          restricted_club, restricted_club_id, sponsor_club_id, 
          entry_fee, fee_currency, category_settings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await pool.query(query, [
        title, description, startDate || null, endDate || null, categories,
        restrictedClubName, restrictedClubId || null, sponsorClubId || null,
        entryFee || 0, feeCurrency || 'HUF',
        categorySettings ? JSON.stringify(categorySettings) : null
      ]); 

      res.json({ success: true }); 
    } catch (err) { 
      console.error("❌ Hiba a pályázat mentésekor:", err);
      res.status(500).json({ error: 'Hiba a mentés során' }); 
    }
  });

  // 3. Pályázat módosítása (VÉDETT: Csak Admin)
  app.put('/api/contests/:id', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    
    const { 
      title, description, startDate, endDate, categories, 
      restrictedClubId, sponsorClubId, entryFee, feeCurrency, categorySettings 
    } = req.body;

    try {
      let restrictedClubName = null;
      if (restrictedClubId) {
        const [clubRows] = await pool.query('SELECT name FROM photo_clubs WHERE id = ?', [restrictedClubId]);
        if (clubRows.length > 0) restrictedClubName = clubRows[0].name;
      }

      const query = `
        UPDATE photo_contests SET 
          title = ?, description = ?, start_date = ?, end_date = ?, categories = ?, 
          restricted_club = ?, restricted_club_id = ?, sponsor_club_id = ?, 
          entry_fee = ?, fee_currency = ?, category_settings = ? 
        WHERE id = ?
      `;

      await pool.query(query, [
        title, description, startDate || null, endDate || null, categories,
        restrictedClubName, restrictedClubId || null, sponsorClubId || null,
        entryFee || 0, feeCurrency || 'HUF', 
        categorySettings ? JSON.stringify(categorySettings) : null,
        req.params.id
      ]);

      res.json({ success: true });
    } catch (err) {
      console.error("❌ Hiba a pályázat frissítésekor:", err);
      res.status(500).json({ error: 'Hiba a frissítés során' });
    }
  });

  // 4. Pályázat törlése (VÉDETT: Csak Admin)
  app.delete('/api/contests/:id', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    try {
      const [entries] = await pool.query('SELECT drive_file_id FROM photo_entries WHERE contest_id = ? AND drive_file_id IS NOT NULL', [req.params.id]);
      for (const entry of entries) { await drive.files.delete({ fileId: entry.drive_file_id }).catch(e => console.log('Drive törlési hiba:', e.message)); }
      await pool.query('DELETE FROM photo_votes WHERE entry_id IN (SELECT id FROM photo_entries WHERE contest_id = ?)', [req.params.id]);
      await pool.query('DELETE FROM photo_entries WHERE contest_id = ?', [req.params.id]);
      await pool.query('DELETE FROM photo_jury WHERE contest_id = ?', [req.params.id]);
      await pool.query('DELETE FROM photo_contests WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 5. Saját nevezések lekérése (VÉDETT: Biztonsági IDOR ellenőrzéssel)
  app.get('/api/my-entries', requireAuth, async (req, res) => {
    const targetEmail = req.query.userEmail;
    if (req.user.email !== targetEmail && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Nincs jogosultságod más felhasználó nevezéseit lekérni!' });
    }
    try { 
      const [rows] = await pool.query('SELECT * FROM photo_entries WHERE user_email = ? ORDER BY created_at DESC', [targetEmail]); 
      res.json(rows); 
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 6. Kép feltöltése és nevezés (VÉDETT)
  app.post('/api/upload', requireAuth, upload.single('photo'), async (req, res) => {
    const { contestId, userEmail, userName, title, category, acceptedTerms } = req.body;
    
    if (req.user.email !== userEmail) {
      return res.status(403).json({ error: 'Nem nevezhetsz más felhasználó nevében!' });
    }

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Nincs fájl kiválasztva!' });
    
    try {
      const [juryCheck] = await pool.query('SELECT * FROM photo_jury WHERE contest_id = ? AND user_email = ?', [contestId, userEmail]);
      if (juryCheck.length > 0) { cleanupTempFile(file); return res.status(403).json({ error: 'Zsűritagként nem nevezhetsz!' }); }
      
      const [countRows] = await pool.query('SELECT COUNT(*) as count FROM photo_entries WHERE contest_id = ? AND user_email = ? AND category = ?', [contestId, userEmail, category]);
      if (countRows[0].count >= 4) { cleanupTempFile(file); return res.status(400).json({ error: 'Elérted a 4 képes limitet!' }); }

      const fileStream = fs.createReadStream(file.path);
      const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
      const driveRes = await drive.files.create({ requestBody: { name: `Nevezes_${contestId}_${userName}_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, media: { mimeType: file.mimetype, body: fileStream }, fields: 'id, webViewLink' });

      cleanupTempFile(file);

      const queryStr = `
        INSERT INTO photo_entries 
        (contest_id, user_email, user_name, title, category, file_url, drive_file_id, file_size, accepted_terms, accepted_terms_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      await pool.query(queryStr, [
        contestId, userEmail, userName, title, category, driveRes.data.webViewLink, driveRes.data.id, req.file.size, acceptedTerms || 0
      ]);

      res.json({ success: true });
    } catch (err) { cleanupTempFile(file); res.status(500).json({ error: err.message }); }
  });

  // 7. Kép címének frissítése (VÉDETT: req.user.email-re cserélve a body helyett!)
  app.put('/api/entries/:id', requireAuth, async (req, res) => {
    try {
      const [result] = await pool.query('UPDATE photo_entries SET title = ? WHERE id = ? AND user_email = ?', [req.body.title, req.params.id, req.user.email]);
      if (result.affectedRows === 0) return res.status(403).json({ error: 'Nincs jogosultságod módosítani ezt a képet!' });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Hiba a cím frissítésekor' }); }
  });

  // 8. Nevezés törlése (VÉDETT: req.user.email-re cserélve a body helyett!)
  app.delete('/api/entries/:id', requireAuth, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM photo_entries WHERE id = ? AND user_email = ?', [req.params.id, req.user.email]);
      if (rows.length === 0) return res.status(403).json({ error: 'Nincs jogod törölni ezt a képet!' });
      if (rows[0].drive_file_id) await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(e => console.log(e.message));
      await pool.query('DELETE FROM photo_entries WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 9. Zsűrizett pályázataim (VÉDETT)
  app.get('/api/my-judged-contests', requireAuth, async (req, res) => {
    const targetEmail = req.query.userEmail;
    if (req.user.email !== targetEmail && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Nem kérheted le más zsűri statisztikáit!' });
    }
    try {
      const query = `
        SELECT c.id as contest_id,
          (SELECT COUNT(*) FROM photo_entries e LEFT JOIN photo_contest_payments p ON e.contest_id = p.contest_id AND e.user_email = p.user_email WHERE e.contest_id = c.id AND (c.entry_fee IS NULL OR c.entry_fee = 0 OR p.id IS NOT NULL)) as judgeable_count,
          (SELECT COUNT(*) FROM photo_votes v JOIN photo_entries e ON v.entry_id = e.id WHERE e.contest_id = c.id AND v.jury_email = ?) as voted_count
        FROM photo_contests c JOIN photo_jury j ON c.id = j.contest_id WHERE j.user_email = ?
      `;
      const [rows] = await pool.query(query, [targetEmail, targetEmail]);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 10. Admin statisztikák (VÉDETT: Csak Admin)
  app.get('/api/admin/stats/:contestId', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    try { const [rows] = await pool.query('SELECT user_name, user_email, category, COUNT(*) as image_count FROM photo_entries WHERE contest_id = ? GROUP BY user_email, user_name, category ORDER BY user_name ASC, category ASC', [req.params.contestId]); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 11. Admin zsűri statisztikák (VÉDETT: Csak Admin)
  app.get('/api/admin/jury-stats/:contestId', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    try {
      const contestId = req.params.contestId;
      const [[{ total_entries }]] = await pool.query('SELECT COUNT(*) as total_entries FROM photo_entries WHERE contest_id = ?', [contestId]);
      const [stats] = await pool.query(`SELECT j.user_email, COALESCE(v.voted_count, 0) as voted_count FROM photo_jury j LEFT JOIN (SELECT pv.jury_email, COUNT(*) as voted_count FROM photo_votes pv JOIN photo_entries pe ON pv.entry_id = pe.id WHERE pe.contest_id = ? GROUP BY pv.jury_email) v ON j.user_email = v.jury_email WHERE j.contest_id = ?`, [contestId, contestId]);
      res.json({ total_entries: total_entries || 0, stats });
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 12. Zsűrizendő képek listája (VÉDETT)
  app.get('/api/jury-entries/:contestId', requireAuth, async (req, res) => {
    const targetEmail = req.query.userEmail;
    if (req.user.email !== targetEmail && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Nem kérheted le más szavazólapját!' });
    }
    try { 
      const query = `
        SELECT e.id, e.title, e.category, e.file_url, e.drive_file_id FROM photo_entries e JOIN photo_contests c ON e.contest_id = c.id
        LEFT JOIN photo_votes v ON e.id = v.entry_id AND v.jury_email = ? LEFT JOIN photo_contest_payments p ON e.contest_id = p.contest_id AND e.user_email = p.user_email
        WHERE e.contest_id = ? AND v.id IS NULL AND (c.entry_fee IS NULL OR c.entry_fee = 0 OR p.id IS NOT NULL)
      `;
      const [rows] = await pool.query(query, [targetEmail, req.params.contestId]); 
      res.json(rows); 
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 13. Zsűri szavazat leadása (VÉDETT)
  app.post('/api/vote', requireAuth, async (req, res) => {
    if (req.body.score < 0 || req.body.score > 100) return res.status(400).json({ error: 'Érvénytelen pontszám!' });
    if (req.user.email !== req.body.juryEmail) return res.status(403).json({ error: 'Nem szavazhatsz más nevében!' });
    try { await pool.query('INSERT INTO photo_votes (entry_id, jury_email, score) VALUES (?, ?, ?)', [req.body.entryId, req.body.juryEmail, req.body.score]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 14. Eredmények lekérése (Nyilvános / Lezárt eredmények)
  app.get('/api/results/:contestId', async (req, res) => {
    try { const [rows] = await pool.query(`SELECT e.id, e.title, e.category, e.file_url, e.drive_file_id, e.user_name, e.user_email, COALESCE(SUM(v.score), 0) as total_score, COUNT(v.id) as vote_count FROM photo_entries e LEFT JOIN photo_votes v ON e.id = v.entry_id WHERE e.contest_id = ? GROUP BY e.id ORDER BY e.category ASC, total_score DESC`, [req.params.contestId]); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 15. Oklevél Base64 kép letöltés (VÉDETT)
  app.get('/api/image-base64/:fileId', requireAuth, async (req, res) => {
    try {
      const driveRes = await drive.files.get({ fileId: req.params.fileId, alt: 'media' }, { responseType: 'arraybuffer' });
      const base64 = Buffer.from(driveRes.data).toString('base64');
      res.json({ base64: `data:image/jpeg;base64,${base64}` });
    } catch (err) { res.status(500).json({ error: 'Nem sikerült a képet betölteni az oklevélhez.' }); }
  });

  // 16. KÖTELEZŐ MAFOSZ PROFIL MENTÉSI ÚTVONAL (VÉDETT - Összehangolva a users.js-sel!)
  app.put('/api/users/:email/extended-profile', requireAuth, async (req, res) => {
    const { email } = req.params;
    const { name, phone_number, shipping_address, association_id } = req.body;

    if (req.user.email !== email && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nem módosíthatod más felhasználó profilját.' });
    }

    try {
      const query = `
        UPDATE photo_users 
        SET name = ?, phone_number = ?, shipping_address = ?, association_id = ? 
        WHERE email = ?
      `;
      const [result] = await pool.query(query, [name, phone_number, shipping_address, association_id, email]);
      if (result.affectedRows === 0) return res.status(404).json({ error: "A megadott felhasználó nem létezik!" });
      res.json({ success: true, message: "A MAFOSZ profil sikeresen frissítve!" });
    } catch (err) {
      console.error("❌ Szerver hiba a photo_users frissítésekor:", err);
      res.status(500).json({ error: 'Hiba történt a profil adatok mentése közben.' });
    }
  });

  // ❌ JAVÍTVA / TÖRÖLVE: A legalsó, teljesen nyitott app.get('/api/users') adatbázis-szivárogtató kód teljesen el lett távolítva ebből a fájlból, 
  // így az többé nem tudja felülírni a users.js biztonságos változatát!

};
