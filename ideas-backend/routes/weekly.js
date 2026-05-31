const fs = require('fs');

module.exports = function(app, pool, drive, upload, cleanupTempFile) {
  
  // 1. Kép feltöltése a kihívásra
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

  // 2. GURUSHOTS LOGIKA: KÖVETKEZŐ KÉP KIVÁLASZTÁSA
  app.get('/api/weekly/next-vote', async (req, res) => {
    const { topicId, userEmail } = req.query;
    try {
      const [entries] = await pool.query(`
        SELECT e.*, 
          (SELECT COUNT(*) FROM weekly_votes v WHERE v.user_email = e.user_email AND v.topic_id = e.topic_id) as owner_votes
        FROM weekly_entries e
        WHERE e.topic_id = ? 
          AND e.user_email != ? 
          AND e.id NOT IN (SELECT entry_id FROM weekly_votes WHERE user_email = ? AND topic_id = ?)
        ORDER BY ((owner_votes * 2) - e.views_count) DESC, RAND()
        LIMIT 1
      `, [topicId, userEmail, userEmail, topicId]);

      res.json({ entry: entries[0] || null });
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 3. Szavazat (Lájk / Passz) leadása
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

  // 4. JAVÍTVA: Archívum is nyers lájkok alapján rendez!
  app.get('/api/weekly/history/:topicId', async (req, res) => {
    try {
      const [leaderboard] = await pool.query(`
        SELECT e.id, e.user_name, e.file_url, e.drive_file_id, e.views_count, e.likes_count
        FROM weekly_entries e WHERE e.topic_id = ? AND e.views_count > 0 
        ORDER BY likes_count DESC, views_count ASC
      `, [req.params.topicId]);
      res.json(leaderboard);
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 5. GURUSHOTS LOGIKA: AKTUÁLIS TOPLISTA (A régi, duplikált végpont törölve!)
  app.get('/api/weekly/current', async (req, res) => {
    const { userEmail } = req.query;
    try {
      const [topics] = await pool.query('SELECT * FROM weekly_topics WHERE start_date <= CURRENT_DATE() AND end_date >= CURRENT_DATE() LIMIT 1');
      if (topics.length === 0) return res.json({ topic: null });
      const topic = topics[0];

      const [myEntries] = await pool.query('SELECT * FROM weekly_entries WHERE topic_id = ? AND user_email = ?', [topic.id, userEmail]);
      const [myVotes] = await pool.query('SELECT COUNT(*) as cnt FROM weekly_votes WHERE topic_id = ? AND user_email = ?', [topic.id, userEmail]);

      const [leaderboard] = await pool.query(`
        SELECT e.id, e.user_email, e.file_url, e.drive_file_id, e.likes_count, e.views_count, u.name as user_name
        FROM weekly_entries e
        JOIN photo_users u ON e.user_email = u.email
        WHERE e.topic_id = ?
        ORDER BY e.likes_count DESC, e.views_count ASC
      `, [topic.id]);

      res.json({
        topic,
        myEntry: myEntries[0] || null,
        myVoteCount: myVotes[0]?.cnt || 0,
        leaderboard
      });
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 6. GURUSHOTS LOGIKA: SAJÁT EREDMÉNYEK (TRÓFEATEREM)
  app.get('/api/weekly/my-stats', async (req, res) => {
    const { userEmail } = req.query;
    try {
      const [pastTopics] = await pool.query('SELECT * FROM weekly_topics WHERE end_date < CURRENT_DATE() ORDER BY end_date DESC');
      let podiums = { first: 0, second: 0, third: 0 };
      let history = [];

      for (const topic of pastTopics) {
        const [entries] = await pool.query(`
          SELECT id, user_email, file_url, likes_count, views_count
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
            likes: entry.likes_count,
            views: entry.views_count
          });
        }
      }
      res.json({ podiums, history });
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
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
