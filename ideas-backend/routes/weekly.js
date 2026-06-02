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

  // 1. AKTUÁLIS TÉMA ÉS TOPLISTA LEKÉRÉSE (KLUBOK ÉLŐ ÁLLÁSÁVAL)
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

      // JAVÍTVA: Lekérjük a klubneveket is az élő listához!
      const [leaderboard] = await pool.query(`
        SELECT e.id, e.user_name, e.user_email, e.file_url, e.drive_file_id, e.views_count, e.likes_count, u.club_name
        FROM weekly_entries e 
        LEFT JOIN photo_users u ON e.user_email = u.email
        WHERE e.topic_id = ? 
        ORDER BY e.likes_count DESC, e.views_count ASC
      `, [currentTopic.id]);

      // ÚJ: Élő Klubok Csatája kiszámolása
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
        clubLeaderboard // <-- Átadjuk a frontednek az élő állást is!
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

      // JAVÍTVA: A pontok, az off-topic panaszok ÉS a valós nézettség (views_count) is nullázódik, 
      // így az új fotó tiszta lappal, maximális akkumulátor-energiával robbanhat be az Arénába!
      await pool.query(
        'UPDATE weekly_entries SET file_url = ?, drive_file_id = ?, likes_count = 0, views_count = 0, off_topic_count = 0, swapped = 1 WHERE id = ?', 
        [driveRes.data.webViewLink, driveRes.data.id, existing[0].id]
      );

      // 2. ÚJ: Töröljük a szavazási előzményeket ehhez az entry_id-hoz
      await pool.query('DELETE FROM weekly_votes WHERE entry_id = ?', [existing[0].id]);
      
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

  // 5. ARCHÍVUM ÉS KLUBOK CSATÁJA (TOP 3 SZABÁLY)
  app.get('/api/weekly/history/:topicId', async (req, res) => {
    try {
      // 1. Lekérjük az egyéni ranglistát a klubnevekkel (JOIN photo_users)
      const [leaderboard] = await pool.query(`
        SELECT e.id, e.user_name, e.file_url, e.drive_file_id, e.views_count, e.likes_count, u.club_name
        FROM weekly_entries e
        LEFT JOIN photo_users u ON e.user_email = u.email
        WHERE e.topic_id = ? AND e.views_count > 0 
        ORDER BY e.likes_count DESC, e.views_count ASC
      `, [req.params.topicId]);

      // 2. Klubok Csatája (Top 3 szabály) kiszámolása JavaScriptben
      const clubsData = {};
      leaderboard.forEach(entry => {
        // Csak azokat számoljuk, akiknek van beállítva klubja
        if (!entry.club_name || entry.club_name.trim() === '') return; 
        
        if (!clubsData[entry.club_name]) clubsData[entry.club_name] = [];
        clubsData[entry.club_name].push(Number(entry.likes_count));
      });

      const clubLeaderboard = [];
      for (const club in clubsData) {
        // Rendezzük csökkenőbe az adott klub tagjainak pontjait
        clubsData[club].sort((a, b) => b - a);
        
        // Vesszük a legjobb 3-at (ha kevesebben vannak, akkor annyit)
        const top3 = clubsData[club].slice(0, 3);
        const totalScore = top3.reduce((sum, val) => sum + val, 0);
        
        clubLeaderboard.push({
          club_name: club,
          total_score: totalScore,
          members_counted: top3.length
        });
      }

      // Rendezzük a klubokat a végső pontszámuk szerint csökkenőbe
      clubLeaderboard.sort((a, b) => b.total_score - a.total_score);

      // Visszaküldjük a frontendre az egyéni ÉS a klubos listát is!
      res.json({ leaderboard, clubLeaderboard });
    } catch (err) { 
      res.status(500).json({ error: 'Hiba az archívum betöltésekor' }); 
    }
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
  
   // ÚJ: TÉMATÉVESZTÉS JELENTÉSE (HIBAKERESŐ NAPLÓZÁSSAL)
app.post('/api/weekly/report-off-topic', async (req, res) => {
  const { entryId, userEmail } = req.body;
  
  // Ezt látnod kell a szerver logban, amint rákattintasz a gombra a frontend csoportban:
  console.log("📥 OFF-TOPIC JELENTÉS ÉRKEZETT:", { entryId, userEmail });

  if (!entryId || !userEmail) {
    return res.status(400).json({ error: 'Hiányzó adatok a kérésből!' });
  }

  try {
    // 1. Megpróbáljuk növelni a számlálót
    const [updateResult] = await pool.query(
      'UPDATE weekly_entries SET off_topic_count = off_topic_count + 1, views_count = views_count + 1 WHERE id = ?', 
      [entryId]
    );
    console.log("✅ Adatbázis számláló sikeresen frissítve. Eredmény:", updateResult);

    // 2. Szavazási előzmény beírása egy védett al-blokkban
    // JAVÍTVA: Külső dupla idézőjelek, hogy ne ütközzön a belső 'pass' szöveggel!
    try {
      await pool.query(
        "INSERT IGNORE INTO weekly_votes (entry_id, voter_email, vote_type) VALUES (?, ?, 'pass')", 
        [entryId, userEmail]
      );
      console.log("✅ Szavazási előzmény rögzítve a felhasználónak.");
    } catch (likeErr) {
      console.error("⚠️ Figyelem: A szavazási előzmény táblába nem sikerült írni (lehet, hogy más a neve?):", likeErr.message);
    }

    res.json({ success: true });
  } catch (err) {
    // Ha az UPDATE hasal el (pl. elgépelt oszlopnév miatt), itt azonnal kiírja a pontos okot:
    console.error("🔥 CRITICAL ADATBÁZIS HIBA:", err.message);
    res.status(500).json({ error: err.message });
  }
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
