const fs = require('fs');

module.exports = function(app, pool, drive, upload, cleanupTempFile) {
  
  // ── 🎯 ÚJ: BIZTONSÁGI CORS KAPU (Megszünteti a piros letiltásos hibaüzenetet a konzolban!) ──
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
  
  // 1. Pályázatok lekérése (c.* automatikusan hozza majd az új restricted_club_id-t is)
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

  // 2. Új pályázat létrehozása (JAVÍTVA: Kettős írás ID és Név alapján!)
  app.post('/api/contests', async (req, res) => {
    const { 
      title, description, startDate, endDate, categories, 
      restrictedClubId, sponsorClubId, entryFee, feeCurrency, categorySettings 
    } = req.body;

    try { 
      // 1. Háttérben lekérjük a klub nevét az ID alapján, ha klubhoz kötött a pályázat
      let restrictedClubName = null;
      if (restrictedClubId) {
        const [clubRows] = await pool.query('SELECT name FROM photo_clubs WHERE id = ?', [restrictedClubId]);
        if (clubRows.length > 0) restrictedClubName = clubRows[0].name;
      }

      // 2. Elmentjük az összes oszlopot pontosan összehangolva (11 oszlop = 11 kérdőjel!)
      const query = `
        INSERT INTO photo_contests (
          title, description, start_date, end_date, categories, 
          restricted_club, restricted_club_id, sponsor_club_id, 
          entry_fee, fee_currency, category_settings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await pool.query(query, [
        title,
        description,
        startDate || null,
        endDate || null,
        categories,
        restrictedClubName,          // -> restricted_club (szöveg)
        restrictedClubId || null,    // -> restricted_club_id (szám)
        sponsorClubId || null,       // -> sponsor_club_id (szám)
        entryFee || 0,
        feeCurrency || 'HUF',
        categorySettings ? JSON.stringify(categorySettings) : null
      ]); 

      res.json({ success: true }); 
    } catch (err) { 
      console.error("❌ Hiba a pályázat mentésekor:", err);
      res.status(500).json({ error: 'Hiba a mentés során' }); 
    }
  });

  // 3. Pályázat módosítása (JAVÍTVA: Kettős írás frissítésnél is!)
  app.put('/api/contests/:id', async (req, res) => {
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

  // 4. Pályázat törlése
  app.delete('/api/contests/:id', async (req, res) => {
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

  // 5. Saját nevezések lekérése
  app.get('/api/my-entries', async (req, res) => {
    try { const [rows] = await pool.query('SELECT * FROM photo_entries WHERE user_email = ? ORDER BY created_at DESC', [req.query.userEmail]); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 6. Kép feltöltése és nevezés (MÓDOSÍTVA: Elmenti a digitális jogi nyilatkozat pecsétjét)
  app.post('/api/upload', upload.single('photo'), async (req, res) => {
    const { contestId, userEmail, userName, title, category, acceptedTerms, acceptedTermsAt } = req.body;
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await pool.query(queryStr, [
        contestId, 
        userEmail, 
        userName, 
        title, 
        category, 
        driveRes.data.webViewLink, 
        driveRes.data.id, 
        req.file.size,
        acceptedTerms || 0,
        acceptedTermsAt || null
      ]);

      res.json({ success: true });
    } catch (err) { cleanupTempFile(file); res.status(500).json({ error: err.message }); }
  });

  // 7. Kép címének frissítése
  app.put('/api/entries/:id', async (req, res) => {
    try {
      const [result] = await pool.query('UPDATE photo_entries SET title = ? WHERE id = ? AND user_email = ?', [req.body.title, req.params.id, req.body.userEmail]);
      if (result.affectedRows === 0) return res.status(403).json({ error: 'Nincs jogosultságod módosítani ezt a képet!' });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Hiba a cím frissítésekor' }); }
  });

  // 8. Nevezés törlése
  app.delete('/api/entries/:id', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM photo_entries WHERE id = ? AND user_email = ?', [req.params.id, req.body.userEmail]);
      if (rows.length === 0) return res.status(403).json({ error: 'Nincs jogod!' });
      if (rows[0].drive_file_id) await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(e => console.log(e.message));
      await pool.query('DELETE FROM photo_entries WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 9. Zsűrizett pályázataim
  app.get('/api/my-judged-contests', async (req, res) => {
    try {
      const query = `
        SELECT c.id as contest_id,
          (SELECT COUNT(*) FROM photo_entries e LEFT JOIN photo_contest_payments p ON e.contest_id = p.contest_id AND e.user_email = p.user_email WHERE e.contest_id = c.id AND (c.entry_fee IS NULL OR c.entry_fee = 0 OR p.id IS NOT NULL)) as judgeable_count,
          (SELECT COUNT(*) FROM photo_votes v JOIN photo_entries e ON v.entry_id = e.id WHERE e.contest_id = c.id AND v.jury_email = ?) as voted_count
        FROM photo_contests c JOIN photo_jury j ON c.id = j.contest_id WHERE j.user_email = ?
      `;
      const [rows] = await pool.query(query, [req.query.userEmail, req.query.userEmail]);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 10. Admin statisztikák
  app.get('/api/admin/stats/:contestId', async (req, res) => {
    try { const [rows] = await pool.query('SELECT user_name, user_email, category, COUNT(*) as image_count FROM photo_entries WHERE contest_id = ? GROUP BY user_email, user_name, category ORDER BY user_name ASC, category ASC', [req.params.contestId]); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 11. Admin zsűri statisztikák
  app.get('/api/admin/jury-stats/:contestId', async (req, res) => {
    try {
      const contestId = req.params.contestId;
      const [[{ total_entries }]] = await pool.query('SELECT COUNT(*) as total_entries FROM photo_entries WHERE contest_id = ?', [contestId]);
      const [stats] = await pool.query(`SELECT j.user_email, COALESCE(v.voted_count, 0) as voted_count FROM photo_jury j LEFT JOIN (SELECT pv.jury_email, COUNT(*) as voted_count FROM photo_votes pv JOIN photo_entries pe ON pv.entry_id = pe.id WHERE pe.contest_id = ? GROUP BY pv.jury_email) v ON j.user_email = v.jury_email WHERE j.contest_id = ?`, [contestId, contestId]);
      res.json({ total_entries: total_entries || 0, stats });
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 12. Zsűrizendő képek listája
  app.get('/api/jury-entries/:contestId', async (req, res) => {
    try { 
      const query = `
        SELECT e.id, e.title, e.category, e.file_url, e.drive_file_id FROM photo_entries e JOIN photo_contests c ON e.contest_id = c.id
        LEFT JOIN photo_votes v ON e.id = v.entry_id AND v.jury_email = ? LEFT JOIN photo_contest_payments p ON e.contest_id = p.contest_id AND e.user_email = p.user_email
        WHERE e.contest_id = ? AND v.id IS NULL AND (c.entry_fee IS NULL OR c.entry_fee = 0 OR p.id IS NOT NULL)
      `;
      const [rows] = await pool.query(query, [req.query.userEmail, req.params.contestId]); 
      res.json(rows); 
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 13. Zsűri szavazat leadása
  app.post('/api/vote', async (req, res) => {
    if (req.body.score < 0 || req.body.score > 100) return res.status(400).json({ error: 'Érvénytelen pontszám!' });
    try { await pool.query('INSERT INTO photo_votes (entry_id, jury_email, score) VALUES (?, ?, ?)', [req.body.entryId, req.body.juryEmail, req.body.score]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 14. Eredmények lekérése
  app.get('/api/results/:contestId', async (req, res) => {
    try { const [rows] = await pool.query(`SELECT e.id, e.title, e.category, e.file_url, e.drive_file_id, e.user_name, e.user_email, COALESCE(SUM(v.score), 0) as total_score, COUNT(v.id) as vote_count FROM photo_entries e LEFT JOIN photo_votes v ON e.id = v.entry_id WHERE e.contest_id = ? GROUP BY e.id ORDER BY e.category ASC, total_score DESC`, [req.params.contestId]); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 15. Oklevél Base64 kép letöltés
  app.get('/api/image-base64/:fileId', async (req, res) => {
    try {
      const driveRes = await drive.files.get({ fileId: req.params.fileId, alt: 'media' }, { responseType: 'arraybuffer' });
      const base64 = Buffer.from(driveRes.data).toString('base64');
      res.json({ base64: `data:image/jpeg;base64,${base64}` });
    } catch (err) { res.status(500).json({ error: 'Nem sikerült a képet betölteni az oklevélhez.' }); }
  });

  // 16. KÖTELEZŐ MAFOSZ PROFIL MENTÉSI ÚTVONAL
  app.put('/api/users/:email/extended-profile', async (req, res) => {
    const { email } = req.params;
    const { name, phone_number, shipping_address, association_id } = req.body;

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

  // ── 🎯 17. ÚJ: AZ ELVESZETT FELHASZNÁLÓI ADATOLVASÓ MOTOR (Átvezeti a mentett adatokat a frontendre!) ──
  app.get('/api/users', async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT 
          google_id, email, name, last_login, club_name, club_role, 
          is_premium, premium_until, stripe_customer_id, premium_level, 
          club_id, swap_balance, rank_level, referral_code, referred_by,
          phone_number, shipping_address, association_id 
        FROM photo_users
      `);
      res.json(rows);
    } catch (err) {
      console.error("❌ Kritikus hiba a photo_users listázásakor:", err);
      res.status(500).json({ error: 'Szerveroldali hiba a szinkronizáció alatt.' });
    }
  });
};
