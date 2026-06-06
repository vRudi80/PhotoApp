const fs = require('fs');

module.exports = function(app, pool, drive, upload, cleanupTempFile) {
  
  // 📊 1. SEGÉDFÜGGVÉNY: Kiszámolja egy felhasználó összesített pontjait ÉS hivatalos győzelmeit (1. helyezéseit)
  async function getUserLikesAndVictories(pool, email) {
    // Összes szerzett lájk/pont
    const [likesRows] = await pool.query(`
      SELECT COALESCE(SUM(e.likes_count), 0) as total 
      FROM weekly_entries e
      JOIN weekly_topics t ON e.topic_id = t.id
      WHERE e.user_email = ? AND (e.is_active = 1 OR t.end_date < CURRENT_DATE())
    `, [email]);
    const totalLikes = likesRows[0].total || 0;

    // Hivatalos győzelmek (Hányszor volt abszolút első helyezett lezárt arénában)
    const [pastTopics] = await pool.query('SELECT id FROM weekly_topics WHERE end_date < CURRENT_DATE()');
    let victories = 0;
    for (const topic of pastTopics) {
      const [entries] = await pool.query(`
        SELECT user_email FROM weekly_entries 
        WHERE topic_id = ? AND is_active = 1 
        ORDER BY likes_count DESC, views_count ASC LIMIT 1
      `, [topic.id]);
      if (entries[0] && entries[0].user_email === email) {
        victories++;
      }
    }
    return { totalLikes, victories };
  }

  // 📈 2. SEGÉDFÜGGVÉNY: Meghatározza a szint sorszámát (1-5) az új szabályok alapján
  function calculateRankLevel(totalLikes, victories) {
    if (totalLikes < 20) return 1;                  // Újonc 🌱
    if (totalLikes < 100) return 2;                 // Felfedezett 📸
    if (totalLikes < 300 || victories < 1) return 3; // Haladó ⭐ (Hiába van sok pontja, ha nincs 1 győzelme)
    if (totalLikes < 800 || victories < 3) return 4; // Profi 🏅 (Hiába van sok pontja, ha nincs 3 győzelme)
    return 5;                                       // Guru 👑
  }

  // 🚨 3. ÚJ MOTOR: Ellenőrzi a szintlépést, és azonnal kioszt +10 cserét, ha feljebb lépett!
  async function checkAndAwardLevelUp(pool, email) {
    const { totalLikes, victories } = await getUserLikesAndVictories(pool, email);
    const newLevel = calculateRankLevel(totalLikes, victories);

    const [userRows] = await pool.query('SELECT rank_level FROM photo_users WHERE email = ?', [email]);
    if (userRows.length > 0) {
      const oldLevel = userRows[0].rank_level;
      
      // Ha szintet lépett felfelé: kap fixen 10 Joker cserét!
      if (newLevel > oldLevel) {
        await pool.query(
          'UPDATE photo_users SET rank_level = ?, swap_balance = swap_balance + 10 WHERE email = ?',
          [newLevel, email]
        );
        console.log(`🎉 SZINTLÉPÉS DETEKTÁLVA: ${email} szintet lépett (${oldLevel} -> ${newLevel})! +10 Joker kiosztva.`);
      } else if (newLevel < oldLevel) {
        await pool.query('UPDATE photo_users SET rank_level = ? WHERE email = ?', [newLevel, email]);
      }
    }
    return newLevel;
  }

  // ⚙️ 4. MÓDOSÍTVA: Kiszámolja a szavazó pontozási erejét az új szintek alapján
  async function getUserVotePower(pool, email) {
    const { totalLikes, victories } = await getUserLikesAndVictories(pool, email);
    const level = calculateRankLevel(totalLikes, victories);
    
    if (level === 1) return { super: 1, brilliant: 2 }; // Újonc 🌱
    if (level === 2) return { super: 2, brilliant: 3 }; // Felfedezett 📸
    if (level === 3) return { super: 2, brilliant: 4 }; // Haladó ⭐
    if (level === 4) return { super: 3, brilliant: 5 }; // Profi 🏅
    return { super: 4, brilliant: 6 };                  // Guru 👑
  }


  // 🏆 JAVÍTVA: Holtverseny-biztos lezáró motor pontszám-referenciákkal
  async function processFinishedChallenges(pool) {
    try {
      // Megkeressük azokat a lezárult témákat, amik nincsenek még feldolgozva
      const [unfinished] = await pool.query(
        'SELECT id FROM weekly_topics WHERE end_date < CURRENT_DATE() AND processed = 0'
      );

      for (const topic of unfinished) {
        // ❗ MÓDOSÍTVA: A likes_count mezőt is lekérjük az összehasonlításhoz
        const [entries] = await pool.query(
          'SELECT user_email, likes_count FROM weekly_entries WHERE topic_id = ? AND is_active = 1 ORDER BY likes_count DESC, views_count ASC',
          [topic.id]
        );

        if (entries.length === 0) {
          // Ha senki sem nevezett a fordulóba, egyszerűen lezárjuk a témát és megyünk tovább
          await pool.query('UPDATE weekly_topics SET processed = 1 WHERE id = ?', [topic.id]);
          continue;
        }

        // 📊 Kigyűjtjük a dobogós helyek mérce-pontszámait az indexek alapján
        const score1 = entries[0].likes_count;
        const score2 = entries[1] ? entries[1].likes_count : -1;
        const score3 = entries[2] ? entries[2].likes_count : -1;

        // Végigmegyünk a FORDULÓ ÖSSZES JÁTÉKOSÁN
        for (const entry of entries) {
          // Ha pontszáma megegyezik az 1. helyezettével, megkapja a +3 cserét (akkor is, ha többen vannak)
          if (entry.likes_count === score1) {
            await pool.query('UPDATE photo_users SET swap_balance = swap_balance + 3 WHERE email = ?', [entry.user_email]);
          } 
          // Ha a 2. helyezett pontszámát érte el
          else if (entry.likes_count === score2) {
            await pool.query('UPDATE photo_users SET swap_balance = swap_balance + 2 WHERE email = ?', [entry.user_email]);
          } 
          // Ha a 3. helyezettével azonos a pontja (itt kapnak a 4., 5. stb. helyen állók is, ha döntetlen van!)
          else if (entry.likes_count === score3) {
            await pool.query('UPDATE photo_users SET swap_balance = swap_balance + 1 WHERE email = ?', [entry.user_email]);
          }
        }

        // Megjelöljük a témát feldolgozottnak
        await pool.query('UPDATE weekly_topics SET processed = 1 WHERE id = ?', [topic.id]);
        console.log(`🏆 Kihívás #${topic.id} igazságosan lezárva. Holtversenyek ellenőrizve, a cserék kiosztva!`);
      }
    } catch (err) {
      console.error("❌ Hiba a lezárt kihívások feldolgozásakor:", err.message);
    }
  }
  // ====================================================================
  // ⚙️ ADMINISZTRÁCIÓS VÉGPONTOK
  // ====================================================================

  app.get('/api/admin/weekly-topics', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM weekly_topics ORDER BY start_date DESC');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Hiba a témák lekérésekor' });
    }
  });

  app.post('/api/admin/weekly-topics', async (req, res) => {
    const { title, description, startDate, endDate } = req.body;
    try {
      await pool.query('INSERT INTO weekly_topics (title, description, start_date, end_date) VALUES (?, ?, ?, ?)', [title, description, startDate, endDate]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Hiba a mentés során' });
    }
  });

  app.put('/api/admin/weekly-topics/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, startDate, endDate } = req.body;
    try {
      await pool.query('UPDATE weekly_topics SET title = ?, description = ?, start_date = ?, end_date = ? WHERE id = ?', [title, description, startDate, endDate, id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Hiba a frissítés során' });
    }
  });

  app.delete('/api/admin/weekly-topics/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM weekly_topics WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Hiba a törlés során' });
    }
  });


  // ====================================================================
  // ⚔️ INTEGRÁLT VÉGPONT: AKTUÁLIS TÉMA ÉS ARÉNA ADATOK LEKÉRÉSE
  // ====================================================================
  app.get('/api/weekly/current', async (req, res) => {
    const { userEmail, topicId } = req.query;
    try {
      // 🏆 1. AUTOMATIKUS LEZÁRÓ MOTOR FUTTATÁSA
      // Ha van frissen lezárult téma, itt osztja ki a cseréket a holtverseny-szabályok szerint
      await processFinishedChallenges(pool);

      const [allTopics] = await pool.query('SELECT * FROM weekly_topics ORDER BY id DESC');
      const today = new Date();
      
      // Aktív témák szűrése a dátumok alapján
      const activeTopics = allTopics.filter(t => {
          const start = new Date(t.start_date);
          const end = new Date(t.end_date);
          start.setHours(0,0,0,0);
          end.setHours(23,59,59,999);
          return today >= start && today <= end;
      });

      // 👑 2. FELHASZNÁLÓI STATISZTIKÁK & ÚJ RANGRENDSZER LEKÉRDEZÉSE
      // Kiszámolja a szavazati erőt a pontok ÉS győzelmek alapján
      const power = await getUserVotePower(pool, userEmail);
      const { totalLikes, victories } = await getUserLikesAndVictories(pool, userEmail);
      const userTotalLikes = totalLikes;

      // Lekérjük a felhasználó éles, globális csereegyenlegét a tárcájából
      const [userRows] = await pool.query('SELECT COALESCE(swap_balance, 0) as swap_balance FROM photo_users WHERE email = ?', [userEmail]);
      const swapBalance = userRows[0] ? userRows[0].swap_balance : 3;

      // --------------------------------------------------------------------
      // A) HA NINCS SPECIFIKUS TOPIC ID -> Kihívások listájának visszaadása (Aréna főoldal)
      // --------------------------------------------------------------------
      if (!topicId) {
        const topicsWithStatus = [];
        for (const t of activeTopics) {
          const [entry] = await pool.query('SELECT id FROM weekly_entries WHERE topic_id = ? AND user_email = ? AND is_active = 1', [t.id, userEmail]);
          topicsWithStatus.push({ 
            ...t, 
            hasEntered: entry.length > 0 
          });
        }
        return res.json({ 
          activeTopics: topicsWithStatus, 
          userTotalLikes, 
          userVictories: victories, // ➕ Átadva a frontend rang-számításához
          userPower: power, 
          swapBalance 
        });
      }

      // --------------------------------------------------------------------
      // B) HA VAN SPECIFIKUS TOPIC ID -> Egy konkrét aréna szoba betöltése
      // --------------------------------------------------------------------
      const currentTopic = activeTopics.find(t => t.id === Number(topicId)) || allTopics.find(t => t.id === Number(topicId));
      if (!currentTopic) return res.status(404).json({ error: 'Ez a kihívás nem található vagy már lezárult!' });

      // Jelenleg AKTÍV és a KORÁBBI soft-deleted (visszaváltható) képek szétválasztása
      const [myEntries] = await pool.query('SELECT * FROM weekly_entries WHERE topic_id = ? AND user_email = ? AND is_active = 1', [currentTopic.id, userEmail]);
      const [myPastEntries] = await pool.query('SELECT * FROM weekly_entries WHERE topic_id = ? AND user_email = ? AND is_active = 0 ORDER BY id DESC', [currentTopic.id, userEmail]);
      
      // Felhasználó leadott szavazatainak száma ebben a fordulóban
      const [myVotes] = await pool.query(`
        SELECT COUNT(*) as vote_count 
        FROM weekly_votes v 
        JOIN weekly_entries e ON v.entry_id = e.id 
        WHERE e.topic_id = ? AND v.voter_email = ?
      `, [currentTopic.id, userEmail]);

      // Csak az aktuálisan versenyben lévő (aktív) képeket számoljuk a mezőnyben
      const [allEntriesCount] = await pool.query('SELECT COUNT(*) as total FROM weekly_entries WHERE topic_id = ? AND is_active = 1', [currentTopic.id]);
      const totalEntries = allEntriesCount[0].total || 0;
      const votableEntries = Math.max(1, totalEntries - 1);

      // Vak toplista: Kizárólag az aktív képek jelennek meg
      const [leaderboard] = await pool.query(`
        SELECT e.id, e.user_name, e.user_email, e.file_url, e.drive_file_id, e.views_count, e.likes_count, u.club_name
        FROM weekly_entries e 
        LEFT JOIN photo_users u ON e.user_email = u.email
        WHERE e.topic_id = ? AND e.is_active = 1
        ORDER BY e.likes_count DESC, e.views_count ASC
      `, [currentTopic.id]);

      // Élő Klubok Csatája pontgyűjtés (Top 3 tag alapján)
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

      // Teljes adatcsomag visszaküldése a frontend szoba számára
      res.json({ 
        topic: currentTopic, 
        myEntry: myEntries.length > 0 ? myEntries[0] : null, 
        myPastEntries, 
        myVoteCount: myVotes[0]?.vote_count || 0, 
        votableEntries,
        leaderboard,
        clubLeaderboard,
        userTotalLikes,
        userVictories: victories, // ➕ Átadva az aréna belső nézetéhez is
        userPower: power,
        swapBalance
      });

    } catch (err) { 
      console.error("❌ Kritikus hiba az aréna fő API lekérdezésekor:", err);
      res.status(500).json({ error: 'Szerveroldali hiba történt a szoba előkészítésekor.' }); 
    }
  });


  // 2. ELSŐ KÉP FELTÖLTÉSE
  app.post('/api/weekly/upload', upload.single('photo'), async (req, res) => {
    const { topicId, userEmail, userName } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Fotó kötelező!' });

    const ipAddress = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.ip || req.socket.remoteAddress);

    try {
      // Megnézzük, hogy akár aktív, akár inaktív képe van-e már (ha van inaktív is, akkor ő már nem "upload", hanem "swap" fázisban van)
      const [existing] = await pool.query('SELECT id FROM weekly_entries WHERE topic_id = ? AND user_email = ?', [topicId, userEmail]);
      if (existing.length > 0) { cleanupTempFile(file); return res.status(400).json({ error: 'Már neveztél erre a kihívásra! Kép cseréjéhez használd a Csere panelt.' }); }

      const fileStream = fs.createReadStream(file.path);
      const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
      const driveRes = await drive.files.create({ requestBody: { name: `Challenge_${topicId}_${userName}_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, media: { mimeType: file.mimetype, body: fileStream }, fields: 'id, webViewLink' });

      cleanupTempFile(file);
      await pool.query(
        'INSERT INTO weekly_entries (topic_id, user_email, user_name, file_url, drive_file_id, swapped, ip_address, is_active) VALUES (?, ?, ?, ?, ?, 0, ?, 1)', 
        [topicId, userEmail, userName, driveRes.data.webViewLink, driveRes.data.id, ipAddress]
      );
      
      res.json({ success: true });
    } catch (err) { cleanupTempFile(file); res.status(500).json({ error: err.message }); }
  });

  // 3. JAVÍTVA: ÚJ KÉP FELTÖLTÉSE CSERÉVEL (SOFT-DELETE MODELL, PÉNZTÁRCA LEVONÁSSAL)
  app.post('/api/weekly/swap', upload.single('photo'), async (req, res) => {
    const { topicId, userEmail, userName } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Új fotó kötelező!' });

    const ipAddress = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.ip || req.socket.remoteAddress);
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // 1. Csekkoljuk a csereegyenlegét
      const [userRows] = await conn.query('SELECT swap_balance FROM photo_users WHERE email = ?', [userEmail]);
      if (!userRows[0] || userRows[0].swap_balance < 1) {
        cleanupTempFile(file);
        await conn.rollback();
        return res.status(400).json({ error: 'Nincs elég Joker cseréd a számládon!' });
      }

      // 2. Megkeressük a jelenleg éles képét
      const [existing] = await conn.query('SELECT id, swapped FROM weekly_entries WHERE topic_id = ? AND user_email = ? AND is_active = 1', [topicId, userEmail]);
      if (existing.length === 0) {
        cleanupTempFile(file);
        await conn.rollback();
        return res.status(400).json({ error: 'Még nincs aktív nevezésed, amit lecserélhetnél!' });
      }

      // 3. SOFT-DELETE: Nem töröljük, csak lekapcsoljuk a jelenlegi fotót inaktívra (is_active = 0)
      // Így a szavazati tábla érintetlen marad, a többiek Expo-mérője nem sérül!
      await conn.query('UPDATE weekly_entries SET is_active = 0 WHERE id = ?', [existing[0].id]);

      // 4. Feltöltjük az új képet a Drive-ra (A régit NEM töröljük, hogy visszaváltható legyen!)
      const fileStream = fs.createReadStream(file.path);
      const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
      const driveRes = await drive.files.create({ requestBody: { name: `Challenge_SWAP_${topicId}_${userName}_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, media: { mimeType: file.mimetype, body: fileStream }, fields: 'id, webViewLink' });
      cleanupTempFile(file);

      // 5. Beszúrunk egy TELJESEN ÚJ SORT az új képnek (0 pontról indul, de is_active = 1)
      const nextSwapCount = existing[0].swapped + 1;
      await conn.query(
        'INSERT INTO weekly_entries (topic_id, user_email, user_name, file_url, drive_file_id, swapped, ip_address, is_active, likes_count, views_count) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, 0)',
        [topicId, userEmail, userName, driveRes.data.webViewLink, driveRes.data.id, nextSwapCount, ipAddress]
      );

      // 6. VALUTA LEVONÁS: Levonunk 1 cserét a felhasználó globális számlájáról
      await conn.query('UPDATE photo_users SET swap_balance = swap_balance - 1 WHERE email = ?', [userEmail]);

      await conn.commit();
      res.json({ success: true });
    } catch (err) { 
      await conn.rollback(); 
      cleanupTempFile(file); 
      res.status(500).json({ error: err.message }); 
    } finally { conn.release(); }
  });

  // 3b. UTRA ÚJ VÉGPONT: VISSZAVÁLTÁS EGY KORÁBBI FOTÓRA (SWAP BACK)
  app.post('/api/weekly/swap-back', async (req, res) => {
    const { topicId, userEmail, entryId } = req.body;
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // 1. Pénztárca ellenőrzése
      const [userRows] = await conn.query('SELECT swap_balance FROM photo_users WHERE email = ?', [userEmail]);
      if (!userRows[0] || userRows[0].swap_balance < 1) {
        await conn.rollback();
        return res.status(400).json({ error: 'Nincs elég Joker cseréd a visszaváltáshoz!' });
      }

      // 2. Lekapcsoljuk az aktuális aktív képet
      await conn.query('UPDATE weekly_entries SET is_active = 0 WHERE topic_id = ? AND user_email = ? AND is_active = 1', [topicId, userEmail]);

      // 3. Újraaktiváljuk a választott régi képet (is_active = 1)
      // Mivel a pontjai (likes_count) és megtekintései megmaradtak, azonnal onnan folytatja a versenyt!
      const [result] = await conn.query('UPDATE weekly_entries SET is_active = 1 WHERE id = ? AND topic_id = ? AND user_email = ?', [entryId, topicId, userEmail]);
      
      if (result.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ error: 'A kiválasztott korábbi kép nem található!' });
      }

      // 4. Levonjuk a csereköltséget a globális profilból
      await conn.query('UPDATE photo_users SET swap_balance = swap_balance - 1 WHERE email = ?', [userEmail]);

      await conn.commit();
      res.json({ success: true });
    } catch (err) { 
      await conn.rollback(); 
      res.status(500).json({ error: err.message }); 
    } finally { conn.release(); }
  });

  // 4. KÖVETKEZŐ KÉP KIVÁLASZTÁSA (KIZÁRÓLAG AZ AKTÍV KÉPEKET SORSOLJA)
  app.get('/api/weekly/next-vote', async (req, res) => {
    const { topicId, userEmail } = req.query;
    try {
      const [entries] = await pool.query(`
        SELECT e.*, 
          (SELECT COUNT(*) FROM weekly_votes v JOIN weekly_entries we ON v.entry_id = we.id WHERE we.topic_id = e.topic_id AND v.voter_email = e.user_email AND we.is_active = 1) as owner_votes
        FROM weekly_entries e
        WHERE e.topic_id = ? AND e.user_email != ? AND e.is_active = 1 AND e.id NOT IN (SELECT entry_id FROM weekly_votes WHERE voter_email = ?)
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
        WHERE e.topic_id = ? AND e.views_count > 0 AND e.is_active = 1 ORDER BY e.likes_count DESC, e.views_count ASC
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
          FROM weekly_entries WHERE topic_id = ? AND is_active = 1 ORDER BY likes_count DESC, views_count ASC
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

  // Admin 5. GYANÚS (IP DUPLIKÁCIÓ) LEKÉRÉSE (MÓDOSÍTVA: Csak a különböző felhasználókat számolja, a képcseréket kiszűri!)
  app.get('/api/admin/weekly/suspicious', async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT 
          e.topic_id,
          t.title AS topic_title,
          e.ip_address,
          COUNT(DISTINCT e.user_email) AS entry_count,
          GROUP_CONCAT(DISTINCT CONCAT(e.user_name, ' (', e.user_email, ')') SEPARATOR ' || ') AS suspect_list
        FROM weekly_entries e
        JOIN weekly_topics t ON e.topic_id = t.id
        WHERE e.ip_address IS NOT NULL AND e.ip_address != '127.0.0.1'
        GROUP BY e.topic_id, e.ip_address
        HAVING COUNT(DISTINCT e.user_email) > 1
        ORDER BY e.topic_id DESC
      `);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Hiba a lekérdezés során' });
    }
  });
  
  app.delete('/api/admin/weekly/disqualify', async (req, res) => {
    const { topicId, userEmail } = req.query;
    try {
      // Töröljük az ÖSSZES képet ehhez a fordulóhoz és userhez (ha volt korábbi inaktív képe is)
      const [entries] = await pool.query('SELECT id, drive_file_id FROM weekly_entries WHERE topic_id = ? AND user_email = ?', [topicId, userEmail]);
      
      for (const entry of entries) {
        if (entry.drive_file_id) {
          await drive.files.delete({ fileId: entry.drive_file_id }).catch(e => console.log("Drive törlés:", e.message));
        }
        await pool.query('DELETE FROM weekly_votes WHERE entry_id = ?', [entry.id]);
        await pool.query('DELETE FROM weekly_entries WHERE id = ?', [entry.id]);
      }
      
      res.json({ success: true, message: 'Felhasználó sikeresen kizárva a fordulóból.' });
    } catch (err) {
      res.status(500).json({ error: 'Hiba a törlés során' });
    }
  });
  
   // GLOBÁLIS DICSŐSÉGCSARNOK (JAVÍTVA: KLUB TÁBLA ÖSSZEKAPCSOLÁSSAL)
  app.get('/api/weekly/hall-of-fame', async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT 
          u.name as user_name, 
          u.email as user_email, 
          u.club_name,
          c.logo as club_logo, -- ✅ JAVÍTVA: A photo_clubs (c) táblából húzzuk be a logót!
          COALESCE(SUM(e.likes_count), 0) as total_likes
        FROM photo_users u
        LEFT JOIN weekly_entries e ON u.email = e.user_email AND e.is_active = 1
        LEFT JOIN photo_clubs c ON u.club_name = c.name -- ✅ ÚJ: Összekötjük a klubnevek alapján
        GROUP BY u.email, u.name, u.club_name, c.logo -- ✅ JAVÍTVA: A csoportosításba is a c.logo került
        HAVING total_likes > 0
        ORDER BY total_likes DESC, u.name ASC
      `);
      res.json(rows);
    } catch (err) {
      console.error("❌ Hiba a dicsőségcsarnok lekérésekor:", err.message);
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
