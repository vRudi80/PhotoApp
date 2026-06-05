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

  // ====================================================================
  // ⚙️ ÚJ: ADMINISZTRÁCIÓS VÉGPONTOK (A HETI KIHÍVÁSOK KEZELÉSÉHEZ)
  // ====================================================================

  // Admin 1. Összes téma lekérése a naptárhoz (Időrendben csökkenőben)
  app.get('/api/admin/weekly-topics', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM weekly_topics ORDER BY start_date DESC');
      res.json(rows);
    } catch (err) {
      console.error("❌ Hiba az admin témák lekérésekor:", err);
      res.status(500).json({ error: 'Hiba a témák lekérésekor' });
    }
  });

  // Admin 2. Új téma létrehozása/mentése
  app.post('/api/admin/weekly-topics', async (req, res) => {
    const { title, description, startDate, endDate } = req.body;
    try {
      await pool.query(
        'INSERT INTO weekly_topics (title, description, start_date, end_date) VALUES (?, ?, ?, ?)',
        [title, description, startDate, endDate]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("❌ Hiba az új téma mentésekor:", err);
      res.status(500).json({ error: 'Hiba a mentés során' });
    }
  });

  // Admin 3. Meglévő téma szerkesztése ID alapján
  app.put('/api/admin/weekly-topics/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, startDate, endDate } = req.body;
    try {
      await pool.query(
        'UPDATE weekly_topics SET title = ?, description = ?, start_date = ?, end_date = ? WHERE id = ?',
        [title, description, startDate, endDate, id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("❌ Hiba a téma frissítésekor:", err);
      res.status(500).json({ error: 'Hiba a frissítés során' });
    }
  });

  // Admin 4. Téma végleges törlése
  app.delete('/api/admin/weekly-topics/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM weekly_topics WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("❌ Hiba a téma törlésekor:", err);
      res.status(500).json({ error: 'Hiba a törlés során' });
    }
  });


  // ====================================================================
  // ⚔️ FELHASZNÁLÓI ÉS ARÉNA VÉGPONTOK (MEGLÉVŐK)
  // ====================================================================

  // 1. AKTUÁLIS TÉMA ÉS ARÉNA DATA LEKÉRÉSE
  app.get('/api/weekly/current', async (req, res) => {
    const { userEmail, topicId } = req.query;
    try {
      const [allTopics] = await pool.query('SELECT * FROM weekly_topics ORDER BY id DESC');
      const today = new Date();
      
      const activeTopics = allTopics.filter(t => {
          const start = new Date(t.start_date);
          const end = new Date(t.end_date);
          start.setHours(0,0,0,0);
          end.setHours(23,59,59,999);
          return today >= start && today <= end;
      });

      const power = await getUserVotePower(pool, userEmail);
      const [likesRows] = await pool.query('SELECT SUM(likes_count) as total FROM weekly_entries WHERE user_email = ?', [userEmail]);
      const userTotalLikes = likesRows[0].total || 0;

      if (!topicId) {
        const topicsWithStatus = [];
        for (const t of activeTopics) {
          const [entry] = await pool.query('SELECT id FROM weekly_entries WHERE topic_id = ? AND user_email = ?', [t.id, userEmail]);
          topicsWithStatus.push({
            ...t,
            hasEntered: entry.length > 0
          });
        }
        return res.json({ activeTopics: topicsWithStatus, userTotalLikes, userPower: power });
      }

      const currentTopic = activeTopics.find(t => t.id === Number(topicId)) || allTopics.find(t => t.id === Number(topicId));
      if (!currentTopic) return res.status(404).json({ error: 'Ez a kihívás nem található vagy már lezárult!' });

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
        SELECT e.id, e.user_name, e.user_email, e.file_url, e.drive_file_id, e.views_count, e.likes_count, u.club_name
        FROM weekly_entries e 
        LEFT JOIN photo_users u ON e.user_email = u.email
        WHERE e.topic_id = ? 
        ORDER BY e.likes_count DESC, e.views_count ASC
      `, [currentTopic.id]);

      const clubsData = {};
      leaderboard.forEach(entry => {
        if (!entry.club_name || entry.club_name.trim() === '') return; 
        if (!clubsData[entry.club_name]) clubsData[entry.club_name] = [];
        clubsData[entry.club_name].push(Number(entry.likes_count));
      });

      const clubLeaderboard = [];
      for (const club in clubsData) {
        clubsData[club].sort((a, b) => b - a);
        const top3 = clubsData[club].slice(0, 3);
        const totalScore = top3.reduce((sum, val) => sum + val, 0);
        clubLeaderboard.push({
          club_name: club,
          total_score: totalScore,
          members_counted: top3.length
        });
      }
      clubLeaderboard.sort((a, b) => b.total_score - a.total_score);

      res.json({ 
        topic: currentTopic, 
        myEntry: myEntries.length > 0 ? myEntries[0] : null, 
        myVoteCount: myVotes[0]?.vote_count || 0, 
        votableEntries,
        leaderboard,
        clubLeaderboard,
        userTotalLikes,
        userPower: power
      });
    } catch (err) { 
      res.status(500).json({ error: 'Hiba a kihívás részleteinek lekérésekor' }); 
    }
  });

  // 2. KÉP FELTÖLTÉSE
  app.post('/api/weekly/upload', upload.single('photo'), async (req, res) => {
    const { topicId, userEmail, userName } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Fotó kötelező!' });

    try {
      const [existing] = await pool.query('SELECT id FROM weekly_entries WHERE topic_id = ? AND user_email = ?', [topicId, userEmail]);
      if (existing.length > 0) { cleanupTempFile(file); return res.status(400).json({ error: 'Már neveztél erre a kihívásra!' }); }

      const fileStream = fs.createReadStream(file.path);
      const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
      const driveRes = await drive.files.create({ requestBody: { name: `Challenge_${topicId}_${userName}_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, media: { mimeType: file.mimetype, body: fileStream }, fields: 'id, webViewLink' });

      cleanupTempFile(file);
      await pool.query('INSERT INTO weekly_entries (topic_id, user_email, user_name, file_url, drive_file_id, swapped) VALUES (?, ?, ?, ?, ?, 0)', [topicId, userEmail, userName, driveRes.data.webViewLink, driveRes.data.id]);
      res.json({ success: true });
    } catch (err) { cleanupTempFile(file); res.status(500).json({ error: err.message }); }
  });

  // 3. KÉPCSERE FUNKCIÓ
  app.post('/api/weekly/swap', upload.single('photo'), async (req, res) => {
    const { topicId, userEmail, userName } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Új fotó kötelező!' });

    try {
      const [existing] = await pool.query('SELECT id, drive_file_id, swapped FROM weekly_entries WHERE topic_id = ? AND user_email = ?', [topicId, userEmail]);
      if (existing.length === 0) { cleanupTempFile(file); return res.status(400).json({ error: 'Még nem neveztél!' }); }
      if (existing[0].swapped >= 1) { cleanupTempFile(file); return res.status(400).json({ error: 'Már elhasználtad a cseremodult!' }); }

      if (existing[0].drive_file_id) {
        await drive.files.delete({ fileId: existing[0].drive_file_id }).catch(e => console.log(e.message));
      }

      const fileStream = fs.createReadStream(file.path);
      const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
      const driveRes = await drive.files.create({ requestBody: { name: `Challenge_SWAP_${topicId}_${userName}_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, media: { mimeType: file.mimetype, body: fileStream }, fields: 'id, webViewLink' });

      cleanupTempFile(file);
      await pool.query('UPDATE weekly_entries SET file_url = ?, drive_file_id = ?, likes_count = 0, views_count = 0, off_topic_count = 0, swapped = 1 WHERE id = ?', [driveRes.data.webViewLink, driveRes.data.id, existing[0].id]);
      await pool.query('DELETE FROM weekly_votes WHERE entry_id = ?', [existing[0].id]);
      res.json({ success: true });
    } catch (err) { cleanupTempFile(file); res.status(500).json({ error: err.message }); }
  });

  // 4. KÖVETKEZŐ KÉP KIVÁLASZTÁSA
  app.get('/api/weekly/next-vote', async (req, res) => {
    const { topicId, userEmail } = req.query;
    try {
      const [entries] = await pool.query(`
        SELECT e.*, 
          (SELECT COUNT(*) FROM weekly_votes v JOIN weekly_entries we ON v.entry_id = we.id WHERE we.topic_id = e.topic_id AND v.voter_email = e.user_email) as owner_votes
        FROM weekly_entries e
        WHERE e.topic_id = ? AND e.user_email != ? AND e.id NOT IN (SELECT entry_id FROM weekly_votes WHERE voter_email = ?)
        ORDER BY ((10 + (owner_votes * 2)) - e.views_count) DESC, RAND()
        LIMIT 1
      `, [topicId, userEmail, userEmail]);
      res.json({ entry: entries[0] || null });
    } catch (err) { res.status(500).json({ error: 'Hiba a kép lekérésekor' }); }
  });

  // 5. SZAVAZAT LEADÁSA
  app.post('/api/weekly/vote', async (req, res) => {
    const { entryId, userEmail, voteType } = req.body; 
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [existing] = await conn.query('SELECT id FROM weekly_votes WHERE entry_id = ? AND voter_email = ?', [entryId, userEmail]);
      if (existing.length > 0) { await conn.rollback(); return res.json({ success: false, message: 'Már szavaztál!' }); }

      const power = await getUserVotePower(conn, userEmail);
      let calculatedPoints = 0;
      if (voteType === 'super') calculatedPoints = power.super;
      if (voteType === 'brilliant') calculatedPoints = power.brilliant;

      await conn.query('INSERT INTO weekly_votes (entry_id, voter_email, vote_type) VALUES (?, ?, ?)', [entryId, userEmail, voteType]);
      await conn.query('UPDATE weekly_entries SET views_count = views_count + 1, likes_count = likes_count + ? WHERE id = ?', [calculatedPoints, entryId]);

      await conn.commit();
      res.json({ success: true });
    } catch (err) { await conn.rollback(); res.status(500).json({ error: 'Hiba' }); } finally { conn.release(); }
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
        SELECT e.id, e.user_name, e.file_url, e.drive_file_id, e.views_count, e.likes_count, u.club_name
        FROM weekly_entries e LEFT JOIN photo_users u ON e.user_email = u.email
        WHERE e.topic_id = ? AND e.views_count > 0 ORDER BY e.likes_count DESC, e.views_count ASC
      `, [req.params.topicId]);

      const clubsData = {};
      leaderboard.forEach(entry => {
        if (!entry.club_name || entry.club_name.trim() === '') return; 
        if (!clubsData[entry.club_name]) clubsData[entry.club_name] = [];
        clubsData[entry.club_name].push(Number(entry.likes_count));
      });

      const clubLeaderboard = [];
      for (const club in clubsData) {
        clubsData[club].sort((a, b) => b - a);
        const top3 = clubsData[club].slice(0, 3);
        const totalScore = top3.reduce((sum, val) => sum + val, 0);
        clubLeaderboard.push({ club_name: club, total_score: totalScore, members_counted: top3.length });
      }
      clubLeaderboard.sort((a, b) => b.total_score - a.total_score);
      res.json({ leaderboard, clubLeaderboard });
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  app.get('/api/weekly/my-stats', async (req, res) => {
    const { userEmail } = req.query;
    try {
      const [pastTopics] = await pool.query('SELECT * FROM weekly_topics WHERE end_date < CURRENT_DATE() ORDER BY end_date DESC');
      let podiums = { first: 0, second: 0, third: 0 };
      let history = [];

      for (const topic of pastTopics) {
        const [entries] = await pool.query(`
          SELECT id, user_email, file_url, drive_file_id, likes_count, views_count
          FROM weekly_entries WHERE topic_id = ? ORDER BY likes_count DESC, views_count ASC
        `, [topic.id]);

        const userIndex = entries.findIndex(e => e.user_email === userEmail);
        if (userIndex !== -1) {
          const rank = userIndex + 1;
          const entry = entries[userIndex];
          if (rank === 1) podiums.first++; else if (rank === 2) podiums.second++; else if (rank === 3) podiums.third++;

          history.push({
            topic_title: topic.title,
            start_date: topic.start_date,
            end_date: topic.end_date,
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

  // GLOBÁLIS DICSŐSÉGCSARNOK
  app.get('/api/weekly/hall-of-fame', async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT 
          u.name as user_name, 
          u.email as user_email, 
          u.club_name,
          COALESCE(SUM(e.likes_count), 0) as total_likes
        FROM photo_users u
        LEFT JOIN weekly_entries e ON u.email = e.user_email
        GROUP BY u.email, u.name, u.club_name
        HAVING total_likes > 0
        ORDER BY total_likes DESC, u.name ASC
      `);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Hiba a dicsőségcsarnok lekérésekor' });
    }
  });
  
  app.post('/api/weekly/report-off-topic', async (req, res) => {
    const { entryId, userEmail } = req.body;
    try {
      await pool.query('UPDATE weekly_entries SET off_topic_count = off_topic_count + 1, views_count = views_count + 1 WHERE id = ?', [entryId]);
      await pool.query("INSERT IGNORE INTO weekly_votes (entry_id, voter_email, vote_type) VALUES (?, ?, 'pass')", [entryId, userEmail]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
};
