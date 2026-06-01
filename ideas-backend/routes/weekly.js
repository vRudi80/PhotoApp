const fs = require('fs');

module.exports = function(app, pool, drive, upload, cleanupTempFile) {
  
  // Segédfüggvény: Kiszámolja a szavazó aktuális pontozási erejét a korábbi összteljesítménye alapján
  async function getUserVotePower(pool, email) {
    const [rows] = await pool.query('SELECT SUM(likes_count) as total FROM weekly_entries WHERE user_email = ?', [email]);
    const totalLikes = rows[0].total || 0;
    
    if (totalLikes < 20) return { super: 1, brilliant: 2 };       // Újonc 🌱
    if (totalLikes < 100) return { super: 2, brilliant: 3 };      // Felfedezett 📸
    if (totalLikes < 300) return { super: 2, brilliant: 4 };      // Haladó ⭐
    if (totalLikes < 800) return { super: 3, brilliant: 5 };      // Profi 🏅
    return { super: 4, brilliant: 6 };                            // Guru 👑
  }

  // 1. AKTUÁLIS TÉMA ÉS TOPLISTA LEKÉRÉSE
  app.get('/api/weekly/current', async (req, res) => {
    const { userEmail } = req.query;
    try {
      const [allTopics] = await pool.query('SELECT * FROM weekly_topics ORDER BY id DESC');
      const today = new Date();
      const currentTopic = allTopics.find(t => {
          const start = new Date(t.start_date);
          const end = new Date(t.end_date);
          start.setHours(0,0,0,0);
          end.setHours(23,59,59,999);
          return today >= start && today <= end;
      });

      if (!currentTopic) return res.json({ topic: null });

      const [myEntries] = await pool.query('SELECT * FROM weekly_entries WHERE topic_id = ? AND user_email = ?', [currentTopic.id, userEmail]);
      
      const [myVotes] = await pool.query(`
        SELECT COUNT(*) as vote_count 
        FROM weekly_votes v 
        JOIN weekly_entries e ON v.entry_id = e.id 
        WHERE e.topic_id = ? AND v.voter_email = ?
      `, [currentTopic.id, userEmail]);

      const [allEntriesCount] = await pool.query('SELECT COUNT(*) as total FROM weekly_entries WHERE topic_id = ?', [currentTopic.id]);
      const totalEntries = allEntriesCount[0].total || 0;
      const votableEntries = Math.max(1, totalEntries - 1);

      const [leaderboard] = await pool.query(`
        SELECT id, user_name, user_email, file_url, drive_file_id, views_count, likes_count
        FROM weekly_entries 
        WHERE topic_id = ? 
        ORDER BY likes_count DESC, views_count ASC
      `, [currentTopic.id]);

      res.json({ 
        topic: currentTopic, 
        myEntry: myEntries.length > 0 ? myEntries[0] : null, 
        myVoteCount: myVotes[0]?.vote_count || 0, 
        votableEntries,
        leaderboard 
      });
    } catch (err) { 
      res.status(500).json({ error: 'Hiba a heti kihívás lekérésekor' }); 
    }
  });

  // 2. KÉP FELTÖLTÉSE (ELSŐ NEVEZÉS)
  app.post('/api/weekly/upload', upload.single('photo'), async (req, res) => {
    const { topicId, userEmail, userName } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Fotó kötelező!' });

    try {
      const [existing] = await pool.query('SELECT id FROM weekly_entries WHERE topic_id = ? AND user_email = ?', [topicId, userEmail]);
      if (existing.length > 0) { cleanupTempFile(file); return res.status(400).json({ error: 'Már töltöttél fel képet erre a hétre!' }); }

      const fileStream = fs.createReadStream(file.path);
      const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
      const driveRes = await drive.files.create({ requestBody: { name: `Heti_${topicId}_${userName}_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, media: { mimeType: file.mimetype, body: fileStream }, fields: 'id, webViewLink' });

      cleanupTempFile(file);
      await pool.query('INSERT INTO weekly_entries (topic_id, user_email, user_name, file_url, drive_file_id, swapped) VALUES (?, ?, ?, ?, ?, 0)', [topicId, userEmail, userName, driveRes.data.webViewLink, driveRes.data.id]);
      res.json({ success: true });
    } catch (err) { cleanupTempFile(file); res.status(500).json({ error: err.message }); }
  });

  // 3. ÚJ: KÉPCSERE FUNKCIÓ (EGYSZERI LEHETŐSÉG)
  app.post('/api/weekly/swap', upload.single('photo'), async (req, res) => {
    const { topicId, userEmail, userName } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Új fotó kötelező!' });

    try {
      const [existing] = await pool.query('SELECT id, drive_file_id, swapped FROM weekly_entries WHERE topic_id = ? AND user_email = ?', [topicId, userEmail]);
      if (existing.length === 0) { cleanupTempFile(file); return res.status(400).json({ error: 'Még nem is neveztél erre a hétre!' }); }
      if (existing[0].swapped >= 1) { cleanupTempFile(file); return res.status(400).json({ error: 'Ezen a héten már elhasználtad az egyetlen képcsere lehetőségedet!' }); }

      // Régi kép törlése Google Drive-ról a helytakarékosság miatt
      if (existing[0].drive_file_id) {
        await drive.files.delete({ fileId: existing[0].drive_file_id }).catch(e => console.log("Drive törlési hiba (figyelmen kívül hagyható):", e.message));
      }

      // Új kép feltöltése
      const fileStream = fs.createReadStream(file.path);
      const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
      const driveRes = await drive.files.create({ requestBody: { name: `Heti_SWAP_${topicId}_${userName}_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, media: { mimeType: file.mimetype, body: fileStream }, fields: 'id, webViewLink' });

      cleanupTempFile(file);

      // Frissítés: Pontszám (likes_count) VISSZALŐVE NULLÁRA, swapped jelző beállítva 1-re, nézettség MEGMARAD!
      await pool.query('UPDATE weekly_entries SET file_url = ?, drive_file_id = ?, likes_count = 0, swapped = 1 WHERE id = ?', [driveRes.data.webViewLink, driveRes.data.id, existing[0].id]);
      
      res.json({ success: true });
    } catch (err) { cleanupTempFile(file); res.status(500).json({ error: err.message }); }
  });

  // 4. GURUSHOTS LOGIKA: KÖVETKEZŐ KÉP KIVÁLASZTÁSA
  app.get('/api/weekly/next-vote', async (req, res) => {
    const { topicId, userEmail } = req.query;
    try {
      const [entries] = await pool.query(`
        SELECT e.*, 
          (SELECT COUNT(*) 
           FROM weekly_votes v 
           JOIN weekly_entries we ON v.entry_id = we.id 
           WHERE we.topic_id = e.topic_id AND v.voter_email = e.user_email) as owner_votes
        FROM weekly_entries e
        WHERE e.topic_id = ? 
          AND e.user_email != ? 
          AND e.id NOT IN (SELECT entry_id FROM weekly_votes WHERE voter_email = ?)
        ORDER BY ((10 + (owner_votes * 2)) - e.views_count) DESC, RAND()
        LIMIT 1
      `, [topicId, userEmail, userEmail]);

      res.json({ entry: entries[0] || null });
    } catch (err) { res.status(500).json({ error: 'Hiba a kép lekérésekor' }); }
  });

  // 5. JAVÍTVA: SÚLYOZOTT ÉS IMMUTÁBILIS SZAVAZAT LEADÁSA
  app.post('/api/weekly/vote', async (req, res) => {
    const { entryId, userEmail, voteType } = req.body; 
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [existing] = await conn.query('SELECT id FROM weekly_votes WHERE entry_id = ? AND voter_email = ?', [entryId, userEmail]);
      if (existing.length > 0) { await conn.rollback(); return res.json({ success: false, message: 'Már szavaztál erre a képre!' }); }

      // Lekérjük a szavazó aktuális erejét a szavazat leadásának szent pillanatában!
      const power = await getUserVotePower(conn, userEmail);
      let calculatedPoints = 0;
      if (voteType === 'super') calculatedPoints = power.super;
      if (voteType === 'brilliant') calculatedPoints = power.brilliant;

      // Mentés a szavazatok közé
      await conn.query('INSERT INTO weekly_votes (entry_id, voter_email, vote_type) VALUES (?, ?, ?)', [entryId, userEmail, voteType]);
      
      // Hozzáadjuk a fix pontot a képhez. Ez így örökre megmarad, nem változik ha a szavazó később szintet lép!
      await conn.query('UPDATE weekly_entries SET views_count = views_count + 1, likes_count = likes_count + ? WHERE id = ?', [calculatedPoints, entryId]);

      await conn.commit();
      res.json({ success: true });
    } catch (err) { await conn.rollback(); res.status(500).json({ error: 'Hiba a szavazás rögzítésekor' }); } finally { conn.release(); }
  });

  app.get('/api/weekly/upcoming', async (req, res) => {
    try { const [rows] = await pool.query('SELECT * FROM weekly_topics WHERE start_date > CURRENT_DATE() ORDER BY start_date ASC'); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  app.get('/api/weekly/past', async (req, res) => {
    try { const [rows] = await pool.query('SELECT * FROM weekly_topics WHERE end_date < CURRENT_DATE() ORDER BY end_date DESC'); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  app.get('/api/weekly/history/:topicId', async (req, res) => {
    try {
      const [leaderboard] = await pool.query(`
        SELECT id, user_name, file_url, drive_file_id, views_count, likes_count
        FROM weekly_entries WHERE topic_id = ? AND views_count > 0 
        ORDER BY likes_count DESC, views_count ASC
      `, [req.params.topicId]);
      res.json(leaderboard);
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 6. TRÓFEATEREM STATISZTIKÁK
  app.get('/api/weekly/my-stats', async (req, res) => {
    const { userEmail } = req.query;
    try {
      const [pastTopics] = await pool.query('SELECT * FROM weekly_topics WHERE end_date < CURRENT_DATE() ORDER BY end_date DESC');
      let podiums = { first: 0, second: 0, third: 0 };
      let history = [];

      for (const topic of pastTopics) {
        const [entries] = await pool.query(`
          SELECT id, user_email, file_url, drive_file_id, likes_count, views_count
          FROM weekly_entries 
          WHERE topic_id = ? 
          ORDER BY likes_count DESC, views_count ASC
        `, [topic.id]);

        const userIndex = entries.findIndex(e => e.user_email === userEmail);
        
        if (userIndex !== -1) {
          const rank = userIndex + 1;
          const entry = entries[userIndex];
          
          if (rank === 1) podiums.first++; else if (rank === 2) podiums.second++; else if (rank === 3) podiums.third++;

          history.push({
            topic_title: topic.title,
            start_date: topic.start_date,
            rank: rank,
            total_entries: entries.length,
            file_url: entry.file_url,
            drive_file_id: entry.drive_file_id,
            likes: entry.likes_count,
            views: entry.views_count
          });
        }
      }
      res.json({ podiums, history });
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // ADMIN VÉGPONTOK
  app.get('/api/admin/weekly-topics', async (req, res) => {
    try { const [rows] = await pool.query('SELECT * FROM weekly_topics ORDER BY start_date DESC'); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });
  app.post('/api/admin/weekly-topics', async (req, res) => {
    const { title, description, startDate, endDate } = req.body;
    try { await pool.query('INSERT INTO weekly_topics (title, description, start_date, end_date, is_active) VALUES (?, ?, ?, ?, false)', [title, description, startDate, endDate]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });
  app.put('/api/admin/weekly-topics/:id', async (req, res) => {
    const { title, description, startDate, endDate } = req.body;
    try { await pool.query('UPDATE weekly_topics SET title = ?, description = ?, start_date = ?, end_date = ? WHERE id = ?', [title, description, startDate, endDate, req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });
  app.post('/api/admin/weekly-topics/:id/activate', async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE weekly_topics SET is_active = false');
      await conn.query('UPDATE weekly_topics SET is_active = true WHERE id = ?', [req.params.id]);
      await conn.commit(); res.json({ success: true });
    } catch (e) { await conn.rollback(); res.status(500).json({ error: 'Hiba' }); } finally { conn.release(); }
  });
  // --- EGYSZER HASZNÁLATOS ÚJRASZÁMOLÓ (Ideiglenes végpont) ---
  app.get('/api/admin/recalculate-current', async (req, res) => {
    try {
      const [allTopics] = await pool.query('SELECT * FROM weekly_topics ORDER BY id DESC');
      const today = new Date();
      const currentTopic = allTopics.find(t => {
          const start = new Date(t.start_date);
          const end = new Date(t.end_date);
          start.setHours(0,0,0,0);
          end.setHours(23,59,59,999);
          return today >= start && today <= end;
      });

      if (!currentTopic) return res.json({ error: "Nincs aktív téma, amit újra kéne számolni!" });

      // 1. Lenullázzuk a jelenlegi heti pontokat (views_count és likes_count)
      await pool.query('UPDATE weekly_entries SET likes_count = 0, views_count = 0 WHERE topic_id = ?', [currentTopic.id]);

      // 2. Lekérjük az összes eddigi szavazatot erre a hétre
      const [votes] = await pool.query('SELECT * FROM weekly_votes WHERE entry_id IN (SELECT id FROM weekly_entries WHERE topic_id = ?)', [currentTopic.id]);

      // 3. Egyenként újraszámoljuk őket a súlyozott rendszerrel
      for (const vote of votes) {
        // Megnézzük, milyen szinten van a szavazó (csak a korábbi lezárt hetek alapján)
        const [rows] = await pool.query('SELECT SUM(likes_count) as total FROM weekly_entries WHERE user_email = ? AND topic_id != ?', [vote.voter_email, currentTopic.id]);
        const totalLikes = rows[0].total || 0;
        
        // Hatalmi szorzó megállapítása
        let power = { super: 1, brilliant: 2 };
        if (totalLikes >= 800) power = { super: 4, brilliant: 6 };
        else if (totalLikes >= 300) power = { super: 3, brilliant: 5 };
        else if (totalLikes >= 100) power = { super: 2, brilliant: 4 };
        else if (totalLikes >= 20) power = { super: 2, brilliant: 3 };

        let pointsToAdd = 0;
        // A régi "like" szavazatokat konvertáljuk a legerősebb "Zseniális"-ra
        if (vote.vote_type === 'like' || vote.vote_type === 'brilliant') {
            pointsToAdd = power.brilliant;
        } else if (vote.vote_type === 'super') {
            pointsToAdd = power.super;
        }

        // Frissítjük a képet az új súlyozott pontokkal és +1 megtekintéssel
        await pool.query('UPDATE weekly_entries SET views_count = views_count + 1, likes_count = likes_count + ? WHERE id = ?', [pointsToAdd, vote.entry_id]);
      }

      res.json({ success: true, message: `Sikeresen újraszámolva ${votes.length} db szavazat az új rang-súlyozós rendszer szerint!` });
    } catch(e) {
      res.status(500).json({error: e.message});
    }
  });
  app.delete('/api/admin/weekly-topics/:id', async (req, res) => {
    try {
      const [entries] = await pool.query('SELECT drive_file_id FROM weekly_entries WHERE topic_id = ?', [req.params.id]);
      for (const entry of entries) { if (entry.drive_file_id) await drive.files.delete({ fileId: entry.drive_file_id }).catch(e => console.log(e.message)); }
      await pool.query('DELETE FROM weekly_votes WHERE entry_id IN (SELECT id FROM weekly_entries WHERE topic_id = ?)', [req.params.id]);
      await pool.query('DELETE FROM weekly_entries WHERE topic_id = ?', [req.params.id]);
      await pool.query('DELETE FROM weekly_topics WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });
};
