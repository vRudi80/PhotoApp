const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');

// Cloudinary konfiguráció a környezeti változókból
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = function(app, pool, drive, upload, cleanupTempFile) {
  
  // 📊 JAVÍTVA: MySQL 5.7 kompatibilis, hurokmentesített, szupergyors statisztikai lekérdezés
  async function getUserLikesAndVictories(pool, email) {
    const [likesRows] = await pool.query(`
      SELECT COALESCE(SUM(e.likes_count), 0) as total 
      FROM weekly_entries e
      JOIN weekly_topics t ON e.topic_id = t.id
      WHERE e.user_email = ? AND (e.is_active = 1 OR t.end_date < CURRENT_DATE())
    `, [email]);
    const totalLikes = likesRows[0].total || 0;

    const [victoryRows] = await pool.query(`
      SELECT COUNT(*) as victories
      FROM weekly_entries e1
      WHERE e1.user_email = ? 
        AND e1.is_active = 1
        AND e1.topic_id IN (SELECT id FROM weekly_topics WHERE end_date < CURRENT_DATE())
        AND e1.id = (
          SELECT e2.id 
          FROM weekly_entries e2
          WHERE e2.topic_id = e1.topic_id AND e2.is_active = 1
          ORDER BY e2.likes_count DESC, e2.views_count ASC
          LIMIT 1
        )
    `, [email]);
    
    const victories = victoryRows[0]?.victories || 0;

    return { totalLikes, victories };
  }

  function calculateRankLevel(totalLikes, victories) {
    if (totalLikes < 20) return 1;                  
    if (totalLikes < 100) return 2;                 
    if (totalLikes < 300 || victories < 1) return 3; 
    if (totalLikes < 800 || victories < 3) return 4; 
    return 5;                                       
  }

  async function ensureReferralCode(pool, email) {
    const [rows] = await pool.query('SELECT referral_code FROM photo_users WHERE email = ?', [email]);
    if (rows[0] && !rows[0].referral_code) {
      const randomCode = 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      await pool.query('UPDATE photo_users SET referral_code = ? WHERE email = ?', [randomCode, email]);
      return randomCode;
    }
    return rows[0]?.referral_code || '';
  }

  async function checkAndAwardLevelUp(pool, email) {
    const { totalLikes, victories } = await getUserLikesAndVictories(pool, email);
    const newLevel = calculateRankLevel(totalLikes, victories);

    const [userRows] = await pool.query('SELECT rank_level FROM photo_users WHERE email = ?', [email]);
    if (userRows.length > 0) {
      const oldLevel = userRows[0].rank_level;
      
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

  async function getUserVotePower(pool, email) {
    const { totalLikes, victories } = await getUserLikesAndVictories(pool, email);
    const level = calculateRankLevel(totalLikes, victories);
    
    if (level === 1) return { super: 1, brilliant: 2 }; 
    if (level === 2) return { super: 2, brilliant: 3 }; 
    if (level === 3) return { super: 2, brilliant: 4 }; 
    if (level === 4) return { super: 3, brilliant: 5 }; 
    return { super: 4, brilliant: 6 };                  
  }

  async function processFinishedChallenges(pool) {
    try {
      const [unfinished] = await pool.query(
        'SELECT id FROM weekly_topics WHERE end_date < CURRENT_DATE() AND processed = 0'
      );

      for (const topic of unfinished) {
        const [entries] = await pool.query(
          'SELECT user_email, likes_count FROM weekly_entries WHERE topic_id = ? AND is_active = 1 ORDER BY likes_count DESC, views_count ASC',
          [topic.id]
        );

        if (entries.length === 0) {
          await pool.query('UPDATE weekly_topics SET processed = 1 WHERE id = ?', [topic.id]);
          continue;
        }

        const score1 = entries[0].likes_count;
        const score2 = entries[1] ? entries[1].likes_count : -1;
        const score3 = entries[2] ? entries[2].likes_count : -1;

        for (const entry of entries) {
          if (entry.likes_count === score1) {
            await pool.query('UPDATE photo_users SET swap_balance = swap_balance + 3 WHERE email = ?', [entry.user_email]);
          } 
          else if (entry.likes_count === score2) {
            await pool.query('UPDATE photo_users SET swap_balance = swap_balance + 2 WHERE email = ?', [entry.user_email]);
          } 
          else if (entry.likes_count === score3) {
            await pool.query('UPDATE photo_users SET swap_balance = swap_balance + 1 WHERE email = ?', [entry.user_email]);
          }
        }

        await pool.query('UPDATE weekly_topics SET processed = 1 WHERE id = ?', [topic.id]);
        console.log(`🏆 Kihívás #${topic.id} lezárva. Cserék kiosztva!`);
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

  app.get('/api/admin/weekly/users', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT email, name FROM photo_users ORDER BY name ASC');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Hiba a felhasználók lekérésekor' });
    }
  });

  app.post('/api/admin/weekly-topics', async (req, res) => {
    const { title, description, startDate, endDate, masterEmail } = req.body; 
    try {
      await pool.query(
        'INSERT INTO weekly_topics (title, description, start_date, end_date, master_email) VALUES (?, ?, ?, ?, ?)', 
        [title, description, startDate, endDate, masterEmail || null]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Hiba a mentés során' });
    }
  });

  app.put('/api/admin/weekly-topics/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, startDate, endDate, masterEmail } = req.body; 
    try {
      await pool.query(
        'UPDATE weekly_topics SET title = ?, description = ?, start_date = ?, end_date = ?, master_email = ? WHERE id = ?', 
        [title, description, startDate, endDate, masterEmail || null, id]
      );
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
  // ⚔️ INTEGRÁLT VÉGPONT: AKTUÁLIS TÉMA ÉS ARÉNA ADATOK LEKÉRDEZÉSE
  // ====================================================================
  app.get('/api/weekly/current', async (req, res) => {
    const { userEmail, topicId } = req.query;
    try {
      await processFinishedChallenges(pool);

      const [allTopics] = await pool.query(`
        SELECT t.*, u.name AS master_name 
        FROM weekly_topics t
        LEFT JOIN photo_users u ON t.master_email = u.email
        ORDER BY t.id DESC
      `);
      
      const today = new Date();
      
      const activeTopics = allTopics.filter(t => {
          const start = new Date(t.start_date);
          const end = new Date(t.end_date);
          start.setHours(0,0,0,0);
          end.setHours(23,59,59,999);
          return today >= start && today <= end;
      });

      const power = await getUserVotePower(pool, userEmail);
      const { totalLikes, victories } = await getUserLikesAndVictories(pool, userEmail);
      const userTotalLikes = totalLikes;

      const [userRows] = await pool.query('SELECT COALESCE(swap_balance, 0) as swap_balance FROM photo_users WHERE email = ?', [userEmail]);
      const swapBalance = userRows[0] ? userRows[0].swap_balance : 3;
      
      const myReferralCode = await ensureReferralCode(pool, userEmail);
      const [referredCheck] = await pool.query('SELECT referred_by FROM photo_users WHERE email = ?', [userEmail]);
      const referredBy = referredCheck[0] ? referredCheck[0].referred_by : null;

      if (!topicId) {
        const topicsWithStatus = [];
        for (const t of activeTopics) {
          const [entry] = await pool.query('SELECT id FROM weekly_entries WHERE topic_id = ? AND user_email = ? AND is_active = 1', [t.id, userEmail]);
          const isMasterForThisTopic = t.master_email && userEmail && 
            t.master_email.toLowerCase().trim() === userEmail.toLowerCase().trim();

          topicsWithStatus.push({ 
            ...t, 
            hasEntered: entry.length > 0,
            isMaster: !!isMasterForThisTopic 
          });
        }
        return res.json({ 
          activeTopics: topicsWithStatus, 
          userTotalLikes, 
          userVictories: victories, 
          userPower: power, 
          swapBalance,
          myReferralCode, 
          referredBy,
          masterVotesLeft: 0, 
          isMaster: false     
        });
      }

      const currentTopic = activeTopics.find(t => t.id === Number(topicId)) || allTopics.find(t => t.id === Number(topicId));
      if (!currentTopic) return res.status(404).json({ error: 'Ez a kihívás nem található vagy már lezárult!' });

      const isMasterUser = currentTopic.master_email && userEmail && 
        currentTopic.master_email.toLowerCase().trim() === userEmail.toLowerCase().trim();

      let masterVotesLeft = 0;
      if (isMasterUser) {
        const [masterVotesCount] = await pool.query(`
          SELECT COUNT(*) as count 
          FROM weekly_votes v 
          JOIN weekly_entries e ON v.entry_id = e.id 
          WHERE e.topic_id = ? AND v.voter_email = ? AND v.vote_type = 'master'
        `, [currentTopic.id, userEmail]);
        masterVotesLeft = Math.max(0, 5 - (masterVotesCount[0]?.count || 0));
      }

      const [myEntries] = await pool.query('SELECT * FROM weekly_entries WHERE topic_id = ? AND user_email = ? AND is_active = 1', [currentTopic.id, userEmail]);
      const [myPastEntries] = await pool.query('SELECT * FROM weekly_entries WHERE topic_id = ? AND user_email = ? AND is_active = 0 ORDER BY id DESC', [currentTopic.id, userEmail]);
      
      const [myVotes] = await pool.query(`
        SELECT COUNT(*) as vote_count 
        FROM weekly_votes v 
        JOIN weekly_entries e ON v.entry_id = e.id 
        WHERE e.topic_id = ? AND v.voter_email = ?
      `, [currentTopic.id, userEmail]);

      const [allEntriesCount] = await pool.query('SELECT COUNT(*) as total FROM weekly_entries WHERE topic_id = ? AND is_active = 1', [currentTopic.id]);
      const totalEntries = allEntriesCount[0].total || 0;
      
      const votableEntries = isMasterUser ? totalEntries : Math.max(1, totalEntries - 1);

      const [leaderboard] = await pool.query(`
        SELECT e.id, e.user_name, e.user_email, e.file_url, e.drive_file_id, e.views_count, e.likes_count, u.club_name
        FROM weekly_entries e 
        LEFT JOIN photo_users u ON e.user_email = u.email
        WHERE e.topic_id = ? AND e.is_active = 1
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
        clubLeaderboard.push({ club_name: club, total_score: totalScore, members_counted: top3.length });
      }
      clubLeaderboard.sort((a, b) => b.total_score - a.total_score);

      res.json({ 
        topic: { ...currentTopic, isMaster: !!isMasterUser }, 
        myEntry: myEntries.length > 0 ? myEntries[0] : null, 
        myPastEntries, 
        myVoteCount: myVotes[0]?.vote_count || 0, 
        votableEntries,
        leaderboard,
        clubLeaderboard,
        userTotalLikes,
        userVictories: victories, 
        userPower: power,
        swapBalance,
        myReferralCode, 
        referredBy,
        masterVotesLeft,       
        isMaster: !!isMasterUser  
      });

    } catch (err) { 
      console.error("❌ Kritikus hiba az aréna fő API lekérdezésekor:", err);
      res.status(500).json({ error: 'Szerveroldali hiba történt a szoba előkészítésekor.' }); 
    }
  });

  // ====================================================================
  // 🖼️ ÁTNEVEZVE: `/api/weekly/my-album` lett az ütközések elkerülése miatt!
  // ====================================================================
  app.get('/api/weekly/my-album', async (req, res) => {
    const { userEmail } = req.query;
    if (!userEmail) return res.status(400).json({ error: 'Hiányzó e-mail cím!' });

    try {
      const [photos] = await pool.query(
        "SELECT id, file_url, created_at FROM user_photos WHERE user_email = ? ORDER BY created_at DESC",
        [userEmail]
      );

      const albumWithStats = [];
      for (const photo of photos) {
        const [history] = await pool.query(`
          SELECT t.title AS topic_title, e.likes_count, e.views_count, e.is_active, t.end_date
          FROM weekly_entries e
          JOIN weekly_topics t ON e.topic_id = t.id
          WHERE e.file_url = ? AND e.user_email = ?
        `, [photo.file_url, userEmail]);

        const totalLikes = history.reduce((sum, h) => sum + Number(h.likes_count), 0);
        const totalViews = history.reduce((sum, h) => sum + Number(h.views_count), 0);

        albumWithStats.push({
          ...photo,
          totalLikes,
          totalViews,
          history
        });
      }

      res.json(albumWithStats);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Hiba az album lekérésekor.' });
    }
  });

  // ====================================================================
  // 🖼️ ÁTNEVEZVE: `/api/weekly/my-album/upload`
  // ====================================================================
  app.post('/api/weekly/my-album/upload', upload.single('photo'), async (req, res) => {
    const { userEmail } = req.body;
    const file = req.file;
    if (!file || !userEmail) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Hiányzó fájl vagy e-mail!' });
    }

    try {
      const fileBuffer = fs.readFileSync(file.path);
      const fileHash = crypto.createHash('md5').update(fileBuffer).digest('hex');

      const [existing] = await pool.query(
        "SELECT file_url FROM user_photos WHERE user_email = ? AND file_hash = ?",
        [userEmail, fileHash]
      );

      if (existing.length > 0) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.json({ success: true, message: 'Ez a kép már szerepel az albumodban!', file_url: existing[0].file_url });
      }

      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'felhasznaloi_albumok',
        width: 1600, height: 1600, crop: "limit", quality: "auto:good"
      });

      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

      await pool.query(
        "INSERT INTO user_photos (user_email, file_url, file_hash) VALUES (?, ?, ?)",
        [userEmail, result.secure_url, fileHash]
      );

      res.json({ success: true, file_url: result.secure_url });
    } catch (err) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(500).json({ error: err.message });
    }
  });

  // ====================================================================
  // 🚀 ÚJ NEVEZÉS VÉGPONT JAVÍTÁSA
  // ====================================================================
  app.post('/api/weekly/upload', upload.single('photo'), async (req, res) => {
    const { topicId, userEmail, userName } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Fotó kötelező!' });
    const ipAddress = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.ip || req.socket.remoteAddress);
    try {
      const [topicCheck] = await pool.query('SELECT master_email FROM weekly_topics WHERE id = ?', [topicId]);
      if (topicCheck[0] && topicCheck[0].master_email === userEmail) { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); return res.status(400).json({ error: 'Párbajmesterként nem nevezhetsz!' }); }
      const [existingEntry] = await pool.query('SELECT id FROM weekly_entries WHERE topic_id = ? AND user_email = ?', [topicId, userEmail]);
      if (existingEntry.length > 0) { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); return res.status(400).json({ error: 'Már neveztél!' }); }

      const fileBuffer = fs.readFileSync(file.path);
      const fileHash = crypto.createHash('md5').update(fileBuffer).digest('hex');
      let finalFileUrl = '';
      
      const [duplicatePhoto] = await pool.query("SELECT file_url FROM user_photos WHERE user_email = ? AND file_hash = ?", [userEmail, fileHash]);

      if (duplicatePhoto.length > 0) {
        finalFileUrl = duplicatePhoto[0].file_url;
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } else {
        const result = await cloudinary.uploader.upload(file.path, { folder: 'parbajok', width: 1600, height: 1600, crop: "limit", quality: "auto:good" });
        finalFileUrl = result.secure_url;
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        await pool.query("INSERT INTO user_photos (user_email, file_url, file_hash) VALUES (?, ?, ?)", [userEmail, finalFileUrl, fileHash]);
      }

      await pool.query('INSERT INTO weekly_entries (topic_id, user_email, user_name, file_url, drive_file_id, swapped, ip_address, is_active) VALUES (?, ?, ?, ?, \'\', 0, ?, 1)', [topicId, userEmail, userName, finalFileUrl, ipAddress]);
      res.json({ success: true });
    } catch (err) { if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path); res.status(500).json({ error: err.message }); }
  });

  // ====================================================================
  // 🃏 JOKER CSERE VÉGPONT JAVÍTÁSA
  // ====================================================================
  app.post('/api/weekly/swap', upload.single('photo'), async (req, res) => {
    const { topicId, userEmail, userName } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Új fotó kötelező!' });
    const ipAddress = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.ip || req.socket.remoteAddress);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [userRows] = await conn.query('SELECT swap_balance FROM photo_users WHERE email = ?', [userEmail]);
      if (!userRows[0] || userRows[0].swap_balance < 1) { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); await conn.rollback(); return res.status(400).json({ error: 'Nincs elég Joker cseréd!' }); }
      const [existing] = await conn.query('SELECT id, swapped FROM weekly_entries WHERE topic_id = ? AND user_email = ? AND is_active = 1', [topicId, userEmail]);
      if (existing.length === 0) { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); await conn.rollback(); return res.status(400).json({ error: 'Még nincs aktív nevezésed!' }); }

      await conn.query('UPDATE weekly_entries SET is_active = 0 WHERE id = ?', [existing[0].id]);

      const fileBuffer = fs.readFileSync(file.path);
      const fileHash = crypto.createHash('md5').update(fileBuffer).digest('hex');
      let finalFileUrl = '';
      
      const [duplicatePhoto] = await conn.query("SELECT file_url FROM user_photos WHERE user_email = ? AND file_hash = ?", [userEmail, fileHash]);

      if (duplicatePhoto.length > 0) {
        finalFileUrl = duplicatePhoto[0].file_url;
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } else {
        const result = await cloudinary.uploader.upload(file.path, { folder: 'parbajok', width: 1600, height: 1600, crop: "limit", quality: "auto:good" });
        finalFileUrl = result.secure_url;
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        await pool.query("INSERT INTO user_photos (user_email, file_url, file_hash) VALUES (?, ?, ?)", [userEmail, finalFileUrl, fileHash]);
      }

      const nextSwapCount = existing[0].swapped + 1;
      await conn.query('INSERT INTO weekly_entries (topic_id, user_email, user_name, file_url, drive_file_id, swapped, ip_address, is_active, likes_count, views_count) VALUES (?, ?, ?, ?, \'\', ?, ?, 1, 0, 0)', [topicId, userEmail, userName, finalFileUrl, nextSwapCount, ipAddress]);
      await conn.query('UPDATE photo_users SET swap_balance = swap_balance - 1 WHERE email = ?', [userEmail]);
      await conn.commit();
      res.json({ success: true });
    } catch (err) { await conn.rollback(); if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path); res.status(500).json({ error: err.message }); } finally { conn.release(); }
  });

  // ====================================================================
  // 🃏 ÚJ VÉGPONT: JOKER CSERE MEGLÉVŐ ALBUMKÉPPEL (Fájlfeltöltés nélkül)
  // ====================================================================
  app.post('/api/weekly/swap-existing', async (req, res) => {
    const { topicId, userEmail, userName, fileUrl } = req.body;
    if (!topicId || !userEmail || !fileUrl) return res.status(400).json({ error: 'Hiányzó adatok!' });

    const ipAddress = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.ip || req.socket.remoteAddress);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Ellenőrizzük, van-e elég Jokere
      const [userRows] = await conn.query('SELECT swap_balance FROM photo_users WHERE email = ?', [userEmail]);
      if (!userRows[0] || userRows[0].swap_balance < 1) {
        await conn.rollback();
        return res.status(400).json({ error: 'Nincs elég Joker cseréd!' });
      }

      // 2. Megkeressük az aktuális aktív nevezést, amit le akar cserélni
      const [existing] = await conn.query('SELECT id, swapped FROM weekly_entries WHERE topic_id = ? AND user_email = ? AND is_active = 1', [topicId, userEmail]);
      if (existing.length === 0) {
        await conn.rollback();
        return res.status(400).json({ error: 'Még nincs aktív nevezésed, amit lecserélhetnél!' });
      }

      // 3. Leállítjuk (deaktiváljuk) a mostani futó képet
      await conn.query('UPDATE weekly_entries SET is_active = 0 WHERE id = ?', [existing[0].id]);

      // 4. Új sor beszúrása az albumkép URL-jével, 0 pontról indítva
      const nextSwapCount = existing[0].swapped + 1;
      await conn.query(
        'INSERT INTO weekly_entries (topic_id, user_email, user_name, file_url, drive_file_id, swapped, ip_address, is_active, likes_count, views_count) VALUES (?, ?, ?, ?, \'\', ?, ?, 1, 0, 0)',
        [topicId, userEmail, userName, fileUrl, nextSwapCount, ipAddress]
      );

      // 5. Levonunk 1 pontot a Joker egyenlegből
      await conn.query('UPDATE photo_users SET swap_balance = swap_balance - 1 WHERE email = ?', [userEmail]);

      await conn.commit();
      res.json({ success: true });
    } catch (err) {
      await conn.rollback();
      res.status(500).json({ error: err.message });
    } finally {
      conn.release();
    }
  });
  
  // ====================================================================
  // ⚔️ ÚJ VÉGPONT: NEVEZÉS MEGLÉVŐ ALBUMKÉPPEL
  // ====================================================================
  app.post('/api/weekly/upload-existing', async (req, res) => {
    const { topicId, userEmail, userName, fileUrl } = req.body;
    if (!topicId || !userEmail || !fileUrl) return res.status(400).json({ error: 'Hiányzó adatok!' });
    
    const ipAddress = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.ip || req.socket.remoteAddress);

    try {
      const [topicCheck] = await pool.query('SELECT master_email FROM weekly_topics WHERE id = ?', [topicId]);
      if (topicCheck[0] && topicCheck[0].master_email === userEmail) {
        return res.status(400).json({ error: 'Párbajmesterként nem nevezhetsz a saját párbajodra!' });
      }

      const [existing] = await pool.query('SELECT id FROM weekly_entries WHERE topic_id = ? AND user_email = ?', [topicId, userEmail]);
      if (existing.length > 0) return res.status(400).json({ error: 'Már neveztél erre a kihívásra!' });

      await pool.query(
        'INSERT INTO weekly_entries (topic_id, user_email, user_name, file_url, drive_file_id, swapped, ip_address, is_active) VALUES (?, ?, ?, ?, \'\', 0, ?, 1)', 
        [topicId, userEmail, userName, fileUrl, ipAddress]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/weekly/swap-back', async (req, res) => {
    const { topicId, userEmail, entryId } = req.body;
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [userRows] = await conn.query('SELECT swap_balance FROM photo_users WHERE email = ?', [userEmail]);
      if (!userRows[0] || userRows[0].swap_balance < 1) {
        await conn.rollback();
        return res.status(400).json({ error: 'Nincs elég Joker cseréd a vissvaváltáshoz!' });
      }

      await conn.query('UPDATE weekly_entries SET is_active = 0 WHERE topic_id = ? AND user_email = ? AND is_active = 1', [topicId, userEmail]);

      const [result] = await conn.query('UPDATE weekly_entries SET is_active = 1 WHERE id = ? AND topic_id = ? AND user_email = ?', [entryId, topicId, userEmail]);
      
      if (result.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ error: 'A kiválasztott korábbi kép nem található!' });
      }

      await conn.query('UPDATE photo_users SET swap_balance = swap_balance - 1 WHERE email = ?', [userEmail]);

      await conn.commit();
      res.json({ success: true });
    } catch (err) { 
      await conn.rollback(); 
      res.status(500).json({ error: err.message }); 
    } finally { conn.release(); }
  });

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

  app.post('/api/weekly/vote', async (req, res) => {
    const { entryId, userEmail, voteType } = req.body; 
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [existing] = await conn.query('SELECT id FROM weekly_votes WHERE entry_id = ? AND voter_email = ?', [entryId, userEmail]);
      if (existing.length > 0) { await conn.rollback(); return res.json({ success: false, message: 'Már szavaztál!' }); }

      const [entryTopicRows] = await conn.query('SELECT topic_id FROM weekly_entries WHERE id = ?', [entryId]);
      const topicId = entryTopicRows[0]?.topic_id;

      let calculatedPoints = 0;

      if (voteType === 'master') {
        const [topicRows] = await conn.query('SELECT master_email FROM weekly_topics WHERE id = ?', [topicId]);
        if (!topicRows[0] || topicRows[0].master_email !== userEmail) {
          await conn.rollback();
          return res.status(403).json({ error: 'Nem te vagy a párbaj kijelölt Párbajmestere!' });
        }

        const [masterVotesCount] = await conn.query(`
          SELECT COUNT(*) as count FROM weekly_votes v 
          JOIN weekly_entries e ON v.entry_id = e.id 
          WHERE e.topic_id = ? AND v.voter_email = ? AND v.vote_type = 'master'
        `, [topicId, userEmail]);
        
        if ((masterVotesCount[0]?.count || 0) >= 5) {
          await conn.rollback();
          return res.status(400).json({ error: 'Már elhasználtad mind az 5 Párbajmester szavazatodat!' });
        }

        calculatedPoints = 10; 
      } 
      else {
        const power = await getUserVotePower(conn, userEmail);
        if (voteType === 'super') calculatedPoints = power.super;
        if (voteType === 'brilliant') calculatedPoints = power.brilliant;
      }

      await conn.query('INSERT INTO weekly_votes (entry_id, voter_email, vote_type) VALUES (?, ?, ?)', [entryId, userEmail, voteType]);
      await conn.query('UPDATE weekly_entries SET views_count = views_count + 1, likes_count = likes_count + ? WHERE id = ?', [calculatedPoints, entryId]);

      const [entryRows] = await conn.query('SELECT user_email FROM weekly_entries WHERE id = ?', [entryId]);
      if (entryRows[0]?.user_email) {
        await checkAndAwardLevelUp(conn, entryRows[0].user_email);
      }

      await conn.commit();
      res.json({ success: true });
    } catch (err) { await conn.rollback(); res.status(500).json({ error: 'Hiba' }); } finally { conn.release(); }
  });

  app.post('/api/weekly/claim-referral', async (req, res) => {
    const { userEmail, referralCode } = req.body;
    try {
      const [userRows] = await pool.query('SELECT referred_by FROM photo_users WHERE email = ?', [userEmail]);
      if (!userRows[0]) return res.status(404).json({ error: 'Felhasználó nem található!' });
      if (userRows[0].referred_by) return res.status(400).json({ error: 'Te már adtál meg meghívó kódot korábban!' });

      const cleanCode = referralCode.trim().toUpperCase();
      const [referrerRows] = await pool.query('SELECT email FROM photo_users WHERE referral_code = ?', [cleanCode]);
      if (referrerRows.length === 0) return res.status(400).json({ error: 'Ez a meghívó kód nem lézieni!' });

      const referrerEmail = referrerRows[0].email;
      if (referrerEmail === userEmail) return res.status(400).json({ error: 'Saját magad kódját nem adhatod meg!' });

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query('UPDATE photo_users SET swap_balance = swap_balance + 10 WHERE email = ?', [referrerEmail]);
        await conn.query('UPDATE photo_users SET referred_by = ? WHERE email = ?', [userEmail]);
        await conn.commit();
        res.json({ success: true });
      } catch (txErr) {
        await conn.rollback();
        throw txErr;
      } finally { conn.release(); }

    } catch (err) {
      res.status(500).json({ error: 'Hiba a kód érvényesítésekor.' });
    }
  });

  app.get('/api/weekly/upcoming', async (req, res) => {
    try { 
      const [rows] = await pool.query(`
        SELECT t.*, u.name AS master_name 
        FROM weekly_topics t
        LEFT JOIN photo_users u ON t.master_email = u.email
        WHERE t.start_date > CURRENT_DATE() 
        ORDER BY t.start_date ASC
      `); 
      res.json(rows); 
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  app.get('/api/weekly/past', async (req, res) => {
    try { 
      const [rows] = await pool.query(`
        SELECT t.*, u.name AS master_name 
        FROM weekly_topics t
        LEFT JOIN photo_users u ON t.master_email = u.email
        WHERE t.end_date < CURRENT_DATE() 
        ORDER BY t.end_date DESC
      `); 
      res.json(rows); 
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
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
          SELECT id, user_email, user_name, file_url, drive_file_id, likes_count, views_count
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
            views: entry.views_count,
            user_name: entry.user_name 
          });
        }
      }
      res.json({ podiums, history });
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

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
      const [entries] = await pool.query('SELECT id, drive_file_id, file_url FROM weekly_entries WHERE topic_id = ? AND user_email = ?', [topicId, userEmail]);
      
      for (const entry of entries) {
        if (entry.drive_file_id) {
          await drive.files.delete({ fileId: entry.drive_file_id }).catch(e => console.log("Drive törlés:", e.message));
        } else if (entry.file_url && entry.file_url.includes('cloudinary.com')) {
          const urlParts = entry.file_url.split('/');
          const uploadIndex = urlParts.indexOf('upload');
          if (uploadIndex !== -1 && urlParts.length > uploadIndex + 2) {
            const publicIdWithExt = urlParts.slice(uploadIndex + 2).join('/');
            const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));
            await cloudinary.uploader.destroy(publicId).catch(e => console.log("Cloudinary törlés hiba:", e.message));
          }
        }
        await pool.query('DELETE FROM weekly_votes WHERE entry_id = ?', [entry.id]);
        await pool.query('DELETE FROM weekly_entries WHERE id = ?', [entry.id]);
      }
      
      res.json({ success: true, message: 'Felhasználó sikeresen kizárva a fordulóból.' });
    } catch (err) {
      res.status(500).json({ error: 'Hiba a törlés során' });
    }
  });
  
  app.get('/api/weekly/hall-of-fame', async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT 
          u.name as user_name, 
          u.email as user_email, 
          u.club_name,
          c.drive_logo_id, 
          c.logo_url,      
          COALESCE(SUM(e.likes_count), 0) as total_likes
        FROM photo_users u
        LEFT JOIN weekly_entries e ON u.email = e.user_email AND e.is_active = 1
        LEFT JOIN photo_clubs c ON u.club_name = c.name
        GROUP BY u.email, u.name, u.club_name, c.drive_logo_id, c.logo_url 
        HAVING total_likes > 0
        ORDER BY total_likes DESC, u.name ASC
      `);
      res.json(rows);
    } catch (err) {
      try {
        const [fallbackRows] = await pool.query(`
          SELECT 
            u.name as user_name, 
            u.email as user_email, 
            u.club_name,
            NULL as drive_logo_id,
            NULL as logo_url,
            COALESCE(SUM(e.likes_count), 0) as total_likes
          FROM photo_users u
          LEFT JOIN weekly_entries e ON u.email = e.user_email AND e.is_active = 1
          GROUP BY u.email, u.name, u.club_name
          HAVING total_likes > 0
          ORDER BY total_likes DESC, u.name ASC
        `);
        res.json(fallbackRows);
      } catch (fallbackErr) {
        res.status(500).json({ error: 'Hiba a dicsőségcsarnok lekérésekor' });
      }
    }
  });

  app.post('/api/admin/test-cloudinary', upload.single('photo'), async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Nem választottál ki fájlt!' });

    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'fotoklub_tesztek',
        width: 1600,
        height: 1600,
        crop: "limit",
        quality: "auto:good"
      });

      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

      res.json({
        success: true,
        secure_url: result.secure_url,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height
      });
    } catch (err) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(500).json({ error: err.message || 'Szerveroldali hiba.' });
    }
  });

  // ====================================================================
  // 🚚 MÓDOSÍTVA: ALBUMÉPÍTŐ, JAVÍTOTT MIGRÁCIÓS MOTOR (Üres user_photos fix)
  // ====================================================================
  app.get('/api/admin/migrate-drive-to-cloudinary', async (req, res) => {
    try {
      const [rows] = await pool.query(
        "SELECT id, drive_file_id, user_name, user_email FROM weekly_entries WHERE drive_file_id IS NOT NULL AND drive_file_id != ''"
      );

      const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

      res.json({
        success: true,
        message: `🚚 Albumépítő és biztonságos költöztetés elindítva a háttérben! Figyeld a Render élő logjait.`
      });

      // 💥 ULTRA-ALACSONY MEMÓRIÁJÚ, AUTOMATIKUS ALBUM FELÉPÍTŐ FOLYAMAT
      (async () => {
        try {
          console.log(`[Háttér] 🔧 1. FÁZIS: Aréna album (user_photos) felépítése az eddigi 24 képből...`);
          
          // Lekérjük az összes olyan képet, ami már sikeresen átment Cloudinary-re
          const [alreadyMigrated] = await pool.query(
            "SELECT user_email, file_url FROM weekly_entries WHERE file_url LIKE '%cloudinary.com%'"
          );

          let builtCount = 0;
          for (const entry of alreadyMigrated) {
            // Megnézzük, szerepel-e már az albumban
            const [exists] = await pool.query(
              "SELECT id FROM user_photos WHERE user_email = ? AND file_url = ?",
              [entry.user_email, entry.file_url]
            );
            
            // ⚡ HA NINCS BENNE, BEILLESZTJÜK (Mivel üres a táblád, itt fogja mindet legenerálni!)
            if (exists.length === 0) {
              await pool.query(
                "INSERT INTO user_photos (user_email, file_url, file_hash) VALUES (?, ?, 'migrated')",
                [entry.user_email, entry.file_url]
              );
              builtCount++;
            }
          }
          console.log(`✓ [Háttér] 🎉 SIKER: ${builtCount} db kép sikeresen létrehozva az üres Aréna albumban!`);

          console.log(`[Háttér] 💾 2. FÁZIS: Maradék ${rows.length} db kép feldolgozása és azonnali beillesztése...`);
          
          if (rows.length === 0) {
            console.log("🏁 [Háttér] Nincs új kép a költöztetéshez, a folyamat sikeresen lezárult.");
            return;
          }

          let migratedCount = 0;
          const tempFilePath = './temp_migration_file.jpg'; 

          for (const entry of rows) {
            try {
              const driveResponse = await drive.files.get(
                { fileId: entry.drive_file_id, alt: 'media' },
                { responseType: 'arraybuffer' }
              );

              const buffer = Buffer.from(driveResponse.data);

              if (buffer.length > 10 * 1024 * 1024) {
                console.log(`⏭️ [Háttér Kihagyva] ${entry.user_name} fotója túl nagy (${(buffer.length / 1024 / 1024).toFixed(2)} MB).`);
                continue; 
              }

              fs.writeFileSync(tempFilePath, buffer);

              const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
                folder: 'parbaj_archivum'
              });

              if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

              // A. Frissítjük a galéria bejegyzést
              await pool.query(
                "UPDATE weekly_entries SET drive_file_id = '', file_url = ? WHERE id = ?",
                [uploadResult.secure_url, entry.id]
              );

              // B. ⚡ AZONNALI ALBUMMENTÉS: Mivel üres a tábla, közvetlenül beillesztjük (INSERT) az új linket az albumba!
              const [albumExists] = await pool.query(
                "SELECT id FROM user_photos WHERE user_email = ? AND file_url = ?",
                [entry.user_email, uploadResult.secure_url]
              );
              if (albumExists.length === 0) {
                await pool.query(
                  "INSERT INTO user_photos (user_email, file_url, file_hash) VALUES (?, ?, 'migrated')",
                  [entry.user_email, uploadResult.secure_url]
                );
              }

              migratedCount++;
              console.log(`✓ [Háttér] [${migratedCount}/${rows.length}] ${entry.user_name} fotója áttolva és beírva az albumba.`);

              await delay(1500);

            } catch (singleErr) {
              console.error(`❌ [Háttér Hiba] Hiba a(z) ${entry.id} ID-jú képnél:`, singleErr.message);
              if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            }
          }
          console.log(`🏁 [Háttér] Minden a helyén van! Sikeresen áthelyezve a maradékból: ${migratedCount} db kép.`);
        } catch (bgErr) {
          console.error("Súlyos hiba történt a háttérfolyamat futása közben:", bgErr);
        }
      })();

    } catch (err) {
      console.error("Súlyos hiba a háttérmotor indításakor:", err);
      if (!res.headersSent) res.status(500).json({ error: err.message });
    }
  });

  // ====================================================================
  // 📱 ÚJ: BASE64 PROXY VÉGPONT
  // ====================================================================
  app.get('/api/admin/base64-proxy', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Hiányzó URL' });
    try {
      const axios = require('axios');
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const base64 = `data:${response.headers['content-type']};base64,${Buffer.from(response.data).toString('base64')}`;
      res.json({ base64 });
    } catch (e) { res.status(500).json({ error: e.message }); }
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
