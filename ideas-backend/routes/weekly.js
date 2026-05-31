const fs = require('fs');

module.exports = function(app, pool, drive, upload, cleanupTempFile) {
  // 1. Aktuális téma lekérése
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
      const [myVotes] = await pool.query('SELECT COUNT(*) as vote_count FROM weekly_votes v JOIN weekly_entries e ON v.entry_id = e.id WHERE e.topic_id = ? AND v.voter_email = ?', [currentTopic.id, userEmail]);

      const [allEntriesCount] = await pool.query('SELECT COUNT(*) as total FROM weekly_entries WHERE topic_id = ?', [currentTopic.id]);
      const totalEntries = allEntriesCount[0].total || 0;
      const requiredVotes = Math.max(0, Math.min(3, totalEntries - 1));
      const votableEntries = Math.max(1, totalEntries - 1);

      const [rawLeaderboard] = await pool.query(`
        SELECT e.id, e.user_name, e.user_email, e.file_url, e.drive_file_id, e.views_count, e.likes_count,
               (SELECT COUNT(*) FROM weekly_votes v JOIN weekly_entries we ON v.entry_id = we.id WHERE we.topic_id = ? AND v.voter_email = e.user_email) as user_vote_count
        FROM weekly_entries e WHERE e.topic_id = ? AND e.views_count >= 3
      `, [currentTopic.id, currentTopic.id]);

      const processedLeaderboard = rawLeaderboard.map(entry => {
        const likes = Number(entry.likes_count) || 0;
        const views = Number(entry.views_count) || 1; 
        const userVotes = Number(entry.user_vote_count) || 0;

        const winRate = likes / views; 
        const qualityScore = winRate * 80;
        const activityRatio = Math.min(1, userVotes / votableEntries);
        const activityScore = activityRatio * 20;
        const totalScore = qualityScore + activityScore;
        
        return { ...entry, win_rate: winRate * 100, quality_score: qualityScore, activity_score: activityScore, total_score: totalScore, user_vote_count: userVotes };
      });

      processedLeaderboard.sort((a, b) => b.total_score - a.total_score);

      res.json({ topic: currentTopic, myEntry: myEntries.length > 0 ? myEntries[0] : null, myVoteCount: myVotes[0]?.vote_count || 0, requiredVotes, votableEntries, leaderboard: processedLeaderboard.slice(0, 15) });
    } catch (err) { res.status(500).json({ error: 'Hiba a heti kihívás lekérésekor' }); }
  });

  // 2. Kép feltöltése a kihívásra
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
      await pool.query('INSERT INTO weekly_entries (topic_id, user_email, user_name, file_url, drive_file_id) VALUES (?, ?, ?, ?, ?)', [topicId, userEmail, userName, driveRes.data.webViewLink, driveRes.data.id]);
      res.json({ success: true });
    } catch (err) { cleanupTempFile(file); res.status(500).json({ error: err.message }); }
  });

  // 3. Egy random (legkevesebbet látott) kép lekérése szavazásra
  app.get('/api/weekly/next-vote', async (req, res) => {
    const { topicId, userEmail } = req.query;
    try {
      const [candidates] = await pool.query(`
        SELECT e.id, e.file_url, e.drive_file_id FROM weekly_entries e
        LEFT JOIN weekly_votes v ON e.id = v.entry_id AND v.voter_email = ?
        WHERE e.topic_id = ? AND e.user_email != ? AND v.id IS NULL
        ORDER BY e.views_count ASC LIMIT 10
      `, [userEmail, topicId, userEmail]);

      if (candidates.length === 0) return res.json({ entry: null, message: 'Minden e-heti képet értékeltél már!' });
      const randomIndex = Math.floor(Math.random() * candidates.length);
      res.json({ entry: candidates[randomIndex] });
    } catch (err) { res.status(500).json({ error: 'Hiba a kép betöltésekor' }); }
  });

  // 4. Szavazat (Lájk / Passz) leadása
  app.post('/api/weekly/vote', async (req, res) => {
    const { entryId, userEmail, voteType } = req.body; 
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [existing] = await conn.query('SELECT id FROM weekly_votes WHERE entry_id = ? AND voter_email = ?', [entryId, userEmail]);
      if (existing.length > 0) { await conn.rollback(); return res.json({ success: false, message: 'Már szavaztál erre a képre!' }); }

      await conn.query('INSERT INTO weekly_votes (entry_id, voter_email, vote_type) VALUES (?, ?, ?)', [entryId, userEmail, voteType]);
      if (voteType === 'like') { await conn.query('UPDATE weekly_entries SET views_count = views_count + 1, likes_count = likes_count + 1 WHERE id = ?', [entryId]); } 
      else { await conn.query('UPDATE weekly_entries SET views_count = views_count + 1 WHERE id = ?', [entryId]); }

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
        SELECT e.id, e.user_name, e.file_url, e.drive_file_id, e.views_count, e.likes_count, (e.likes_count * 100 / e.views_count) as win_rate
        FROM weekly_entries e WHERE e.topic_id = ? AND e.views_count > 0 ORDER BY win_rate DESC, likes_count DESC
      `, [req.params.topicId]);
      res.json(leaderboard);
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });
    // --- ÚJ: SAJÁT EREDMÉNYEK STATISZTIKÁJA ---
  app.get('/api/weekly/my-stats', async (req, res) => {
    const { userEmail } = req.query;
    try {
      // 1. Lekérjük az összes lezárult témát
      const [pastTopics] = await pool.query('SELECT * FROM weekly_topics WHERE end_date < CURRENT_DATE() ORDER BY end_date DESC');
      
      let podiums = { first: 0, second: 0, third: 0 };
      let history = [];

      // 2. Minden témára legeneráljuk a toplistát, és megnézzük, hanyadik lett a user
      for (const topic of pastTopics) {
        const [entries] = await pool.query(`
          SELECT id, user_email, file_url, likes_count, views_count, 
                 (likes_count * 100 / GREATEST(views_count, 1)) as win_rate
          FROM weekly_entries 
          WHERE topic_id = ? AND views_count > 0 
          ORDER BY win_rate DESC, likes_count DESC
        `, [topic.id]);

        const userIndex = entries.findIndex(e => e.user_email === userEmail);
        
        if (userIndex !== -1) {
          const rank = userIndex + 1;
          const entry = entries[userIndex];
          
          if (rank === 1) podiums.first++;
          else if (rank === 2) podiums.second++;
          else if (rank === 3) podiums.third++;

          history.push({
            topic_title: topic.title,
            start_date: topic.start_date,
            rank: rank,
            total_entries: entries.length,
            file_url: entry.file_url,
            win_rate: entry.win_rate,
            likes: entry.likes_count,
            views: entry.views_count
          });
        }
      }

      res.json({ podiums, history });
    } catch (err) { 
      console.error(err);
      res.status(500).json({ error: 'Hiba a statisztika lekérésekor' }); 
    }
  });


  // ADMINISZTRÁCIÓ
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
