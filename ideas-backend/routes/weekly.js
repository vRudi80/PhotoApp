const fs = require('fs');
const path = require('path'); 
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const axios = require('axios'); // 🎯 EZ A SOR HIÁNYZOTT A PROXY MŰKÖDÉSÉHEZ!
const PointsService = require('../PointsService');

// 🎯 JAVÍTVA: A te valódi admin e-mailedet állítottuk be biztonsági tartaléknak!
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kovari.rudolf@gmail.com";

let typingStatus = {};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ====================================================================
// 🔒 GOLYÓÁLLÓ AUTHENTICATION MIDDLEWARE A WEEKLY MODULHOZ
// ====================================================================
async function requireAuth(req, res, next) {
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

    // Biztonságosan injektáljuk a kérésbe a hitelesített entitást
    req.user = {
      email: payload.email,
      name: payload.name,
      isAdmin: payload.email === ADMIN_EMAIL
    };

    next();
  } catch (error) {
    console.error("🔒 Biztonsági őr hiba a weekly modulban:", error.message);
    return res.status(401).json({ error: 'Lejárt vagy érvénytelen munkamenet token!' });
  }
}

// ====================================================================
// 🎯 A PONTRENDSZER EGYETLEN KÖZPONTOSÍTOTT FORRÁSA (Single Source of Truth)
// ====================================================================
const getFairScoreSql = (entryAlias = 'e', topicAlias = 't') => {
  return `
    IF(${topicAlias}.end_date < '2026-06-16 00:00:00',
      ${entryAlias}.likes_count,
      ROUND(
        ((${entryAlias}.likes_count + 10.0) / (${entryAlias}.views_count + 10.0) * 10.0) - 
        (POW(GREATEST(0, 
          LEAST(15.0, (SELECT COUNT(*) FROM weekly_entries WHERE topic_id = ${entryAlias}.topic_id AND is_active = 1) - 1) - 
          (SELECT COUNT(*) FROM weekly_votes WHERE voter_email = ${entryAlias}.user_email AND entry_id IN (SELECT id FROM weekly_entries WHERE topic_id = ${entryAlias}.topic_id AND is_active = 1))
        ), 1.5) * 0.5), 2
      )
    )
  `;
};

module.exports = function(app, pool, drive, upload, cleanupTempFile) {
  
  // 🎯 AUTOPROVIZIÓS MOTOR: Ha nincsenek meg az archív lájk/komment táblák, magától létrehozza őket
  (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS weekly_archive_likes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          entry_id INT NOT NULL,
          user_email VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_entry_archive_user (entry_id, user_email)
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS weekly_archive_comments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          entry_id INT NOT NULL,
          user_email VARCHAR(255) NOT NULL,
          user_name VARCHAR(255) NOT NULL,
          comment_text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (e) { console.error("⚠️ Archívum tábla ellenőrzési hiba:", e.message); }
  })();

  const getLocalMySQLNow = () => {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Budapest' }));
    const pad = num => String(num).padStart(2, '0');
    
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  async function getUserLikesAndVictories(pool, email) {
    try {
      const [rows] = await pool.query(
        'SELECT COALESCE(total_likes, 0) as total_likes, COALESCE(victories, 0) as victories FROM photo_users WHERE email = ?', 
        [email]
      );
      if (rows[0]) {
        return { 
          totalLikes: Number(rows[0].total_likes), 
          victories: Number(rows[0].victories) 
        };
      }
      return { totalLikes: 0, victories: 0 };
    } catch (err) {
      console.error("❌ Hiba a denormalizált statisztikák kiolvasásakor:", err.message);
      return { totalLikes: 0, victories: 0 };
    }
  }

  function calculateRankLevel(totalLikes, victories) {
    if (totalLikes < 30) return 1;                               
    if (totalLikes < 100) return 2;                              
    if (totalLikes < 250) return 3;                              
    if (totalLikes < 500 || victories < 1) return 4;         
    if (totalLikes < 800 || victories < 2) return 5;         
    if (totalLikes < 1300 || victories < 3) return 6;        
    if (totalLikes < 2000 || victories < 5) return 7;        
    if (totalLikes < 3200 || victories < 7) return 8;        
    if (totalLikes < 4800 || victories < 9) return 9;        
    if (totalLikes < 7000 || victories < 12) return 10;      
    if (totalLikes < 10000 || victories < 15) return 11;     
    return 12;                                               
  }

  function getVotePowerByLevel(level) {
    if (level === 1) return { super: 1, brilliant: 2 };
    if (level === 2) return { super: 2, brilliant: 3 };
    if (level === 3) return { super: 2, brilliant: 4 };
    if (level === 4) return { super: 3, brilliant: 5 };
    if (level === 5) return { super: 3, brilliant: 6 };
    if (level === 6) return { super: 4, brilliant: 7 };
    if (level === 7) return { super: 4, brilliant: 8 };
    if (level === 8) return { super: 5, brilliant: 10 };
    if (level === 9) return { super: 5, brilliant: 12 };
    if (level === 10) return { super: 6, brilliant: 14 };
    if (level === 11) return { super: 7, brilliant: 17 };
    return { super: 8, brilliant: 20 };
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

  async function processFinishedChallenges(pool) {
    try {
      const currentNow = getLocalMySQLNow();
      await pool.query(`UPDATE photo_users SET premium_level = 0, is_premium = 0 WHERE premium_until IS NOT NULL AND premium_until < ?`, [currentNow]);
      const [unfinished] = await pool.query('SELECT id FROM weekly_topics WHERE end_date < ? AND processed = 0', [currentNow]);

      for (const topic of unfinished) {
        console.log(`🔒 [PERSISTENCE] ${topic.id} azonosítójú futam végleges lezárása...`);
        const [entries] = await pool.query(`
          SELECT e.id, e.user_email, e.likes_count, e.views_count, ${getFairScoreSql('e', 't')} as calculated_fair_score
          FROM weekly_entries e JOIN weekly_topics t ON e.topic_id = t.id
          WHERE e.topic_id = ? AND e.is_active = 1 
          ORDER BY calculated_fair_score DESC, e.likes_count DESC, e.views_count ASC
        `, [topic.id]);

        if (entries.length === 0) {
          await pool.query('UPDATE weekly_topics SET processed = 1 WHERE id = ?', [topic.id]);
          continue;
        }

        const score1 = entries[0].calculated_fair_score;
        const score2 = entries[1] ? entries[1].calculated_fair_score : -1;
        const score3 = entries[2] ? entries[2].calculated_fair_score : -1;

        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const rank = i + 1;
          const finalScore = Number(entry.calculated_fair_score || 0);

          await pool.query('UPDATE weekly_entries SET final_fair_score = ?, final_rank = ? WHERE id = ?', [finalScore, rank, entry.id]);
          await pool.query('UPDATE photo_users SET total_likes = total_likes + ? WHERE email = ?', [finalScore, entry.user_email]);

          if (rank === 1) {
            await pool.query('UPDATE photo_users SET victories = victories + 1 WHERE email = ?', [entry.user_email]);
          }

          if (entry.calculated_fair_score === score1) {
            await PointsService.handleTransaction(
              pool, entry.user_email, PointsService.CONSTANTS.EARN_ARENA_1ST, 'arena_1st', topic.id,
              `🏆 1. helyezés az Arénában: "${topic.title}"`, `1st place in the Arena: "${topic.title}"`
            );
          } else if (entry.calculated_fair_score === score2) {
            await PointsService.handleTransaction(
              pool, entry.user_email, PointsService.CONSTANTS.EARN_ARENA_2ND, 'arena_2nd', topic.id,
              `🥈 2. helyezés az Arénában: "${topic.title}"`, `2nd place in the Arena: "${topic.title}"`
            );
          } else if (entry.calculated_fair_score === score3) {
            await PointsService.handleTransaction(
              pool, entry.user_email, PointsService.CONSTANTS.EARN_ARENA_3RD, 'arena_3rd', topic.id,
              `🥉 3. helyezés az Arénában: "${topic.title}"`, `3rd place in the Arena: "${topic.title}"`
            );
          } else {
            await PointsService.handleTransaction(
              pool, entry.user_email, 5, 'arena_participant', topic.id,
              `🌱 Aréna részvételi pont: "${topic.title}"`, `Arena participation point: "${topic.title}"`
            );
          }

          await checkAndAwardLevelUp(pool, entry.user_email);
        }
        await pool.query('UPDATE weekly_topics SET processed = 1 WHERE id = ?', [topic.id]);
      }
    } catch (err) { console.error("❌ Hiba a lezárt kihívások feldolgozásakor:", err.message); }
  }

  // ====================================================================
  // ⚙️ ADMINISZTRÁCIÓS VÉGPONTOK (SZIGORÚ ADMIN KONTROLLAL)
  // ====================================================================
  app.get('/api/admin/weekly-topics', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Csak admin láthatja!' });
    try {
      const [rows] = await pool.query('SELECT * FROM weekly_topics ORDER BY start_date DESC');
      res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  app.get('/api/admin/weekly/users', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Csak admin láthatja!' });
    try {
      const [rows] = await pool.query('SELECT email, name FROM photo_users ORDER BY name ASC');
      res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  app.post('/api/admin/weekly-topics', requireAuth, upload.single('cover'), async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    const { title, title_en, description, description_en, startDate, endDate, masterEmail, coverAuthor } = req.body; 
    const file = req.file; let finalCoverUrl = null;
    try {
      if (file) {
        const result = await cloudinary.uploader.upload(file.path, { folder: 'parbaj_boritokepek', width: 1200, height: 600, crop: "limit", quality: "auto:good" });
        finalCoverUrl = result.secure_url;
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
      await pool.query('INSERT INTO weekly_topics (title, title_en, description, description_en, start_date, end_date, master_email, cover_url, cover_author) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [title, title_en || null, description, description_en || null, startDate, endDate, masterEmail || null, finalCoverUrl, coverAuthor || null]);
      res.json({ success: true });
    } catch (err) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/weekly-topics/:id', requireAuth, upload.single('cover'), async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Megtagadva!' });
    const { id } = req.params;
    const { title, title_en, description, description_en, startDate, endDate, masterEmail, coverUrl } = req.body; 
    const file = req.file; let finalCoverUrl = coverUrl || null; 
    try {
      if (file) {
        const result = await cloudinary.uploader.upload(file.path, { folder: 'parbaj_boritokepek', width: 1200, height: 600, crop: "limit", quality: "auto:good" });
        if (coverUrl && coverUrl.includes('parbaj_boritokepek')) {
          try {
            const urlParts = coverUrl.split('/parbaj_boritokepek/');
            if (urlParts.length > 1) {
              await cloudinary.uploader.destroy('parbaj_boritokepek/' + urlParts[1].split('.')[0]);
            }
          } catch (e) {}
        }
        finalCoverUrl = result.secure_url;
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
      await pool.query('UPDATE weekly_topics SET title = ?, title_en = ?, description = ?, description_en = ?, start_date = ?, end_date = ?, master_email = ?, cover_url = ?, cover_author = ? WHERE id = ?', [title, title_en || null, description, description_en || null, startDate, endDate, masterEmail || null, finalCoverUrl, req.body.coverAuthor || null, id]);
      res.json({ success: true });
    } catch (err) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/weekly-topics/:id', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Megtagadva!' });
    try {
      await pool.query('DELETE FROM weekly_topics WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // ====================================================================
  // 1. PUBLIC SHARE REDIRECTOR
  // ====================================================================
  app.get('/api/share/challenge/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await pool.query('SELECT * FROM weekly_topics WHERE id = ?', [id]);
      const FRONTEND_URL = process.env.FRONTEND_URL || 'https://photawesome.com';
      const TARGET_URL = `${FRONTEND_URL}/weekly_challenge`; 

      if (rows.length === 0) return res.redirect(TARGET_URL); 

      const topic = rows[0];
      const fullDescription = `✨ Téma: ${topic.description || ''} | Gyere, mutasd meg a legjobb fotódat, szavazz és zsebeld be a trófeákat! 🏆`;

      res.send(`
        <!DOCTYPE html>
        <html lang="hu">
        <head>
          <meta charset="UTF-8">
          <title>${topic.title} | PhotAwesome</title>
          <meta property="og:type" content="website" />
          <meta property="og:url" content="${FRONTEND_URL}/share/challenge/${id}" />
          <meta property="og:title" content="📸 ${topic.title}" />
          <meta property="og:description" content="${fullDescription}" />
          <meta property="og:image" content="${topic.cover_url || ''}" />
        </head>
        <body><script>window.location.href = "${TARGET_URL}";</script></body>
        </html>
      `);
    } catch (err) { res.redirect('https://photawesome.com/weekly_challenge'); }
  });

  // ====================================================================
  // ⚔️ CSATATÉR FŐ VÉGPONT
  // ====================================================================
  app.get('/api/weekly/current', requireAuth, async (req, res) => {
    const { userEmail, topicId } = req.query;
    if (!userEmail) return res.status(400).json({ error: 'Hiányzó e-mail cím!' });

    if (req.user.email !== userEmail && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Token eltérés.' });
    }

    try {
      await processFinishedChallenges(pool);
      const { totalLikes, victories } = await getUserLikesAndVictories(pool, userEmail);
      const rankLevel = calculateRankLevel(totalLikes, victories);
      const power = getVotePowerByLevel(rankLevel); 

      const [userRows] = await pool.query('SELECT COALESCE(swap_balance, 0) as swap_balance, referral_code, referred_by FROM photo_users WHERE email = ?', [userEmail]);
      let swapBalance = userRows[0]?.swap_balance ?? 3;
      let myReferralCode = userRows[0]?.referral_code ?? '';
      let referredBy = userRows[0]?.referred_by ?? null;

      if (!myReferralCode) myReferralCode = await ensureReferralCode(pool, userEmail);
      const mysqlNow = getLocalMySQLNow();

      if (!topicId) {
        const [activeTopics] = await pool.query(`
          SELECT t.*, u.name AS master_name, IF(e.id IS NOT NULL, 1, 0) as hasEntered, IF(t.master_email IS NOT NULL AND LOWER(TRIM(t.master_email)) = LOWER(TRIM(?)), 1, 0) as isMaster, (SELECT COUNT(*) FROM weekly_entries we WHERE we.topic_id = t.id AND we.is_active = 1) as totalEntries, (SELECT COUNT(*) FROM weekly_entries we WHERE we.topic_id = t.id AND we.is_active = 1 AND LOWER(TRIM(we.user_email)) != LOWER(TRIM(?)) AND we.id NOT IN (SELECT entry_id FROM weekly_votes WHERE voter_email = ?)) as unvotedEntries
          FROM weekly_topics t LEFT JOIN photo_users u ON t.master_email = u.email LEFT JOIN weekly_entries e ON e.topic_id = t.id AND LOWER(TRIM(e.user_email)) = LOWER(TRIM(?)) AND e.is_active = 1
          WHERE ? BETWEEN t.start_date AND t.end_date AND (t.status = 'approved' OR t.status IS NULL OR t.status = '') ORDER BY t.id DESC
        `, [userEmail, userEmail, userEmail, userEmail, mysqlNow]);

        const mappedTopics = activeTopics.map(t => ({
          ...t, hasEntered: t.hasEntered === 1, isMaster: t.isMaster === 1, totalEntries: Number(t.totalEntries || 0), entry_count: Number(t.totalEntries || 0), entries_count: Number(t.totalEntries || 0), unvotedEntries: Number(t.unvotedEntries || 0), unvoted_count: Number(t.unvotedEntries || 0), hasUnvoted: Number(t.unvotedEntries || 0) > 0, has_unvoted: Number(t.unvotedEntries || 0) > 0
        }));
        return res.json({ activeTopics: mappedTopics, userTotalLikes: totalLikes, userVictories: victories, userPower: power, swapBalance, myReferralCode, referredBy, masterVotesLeft: 0, isMaster: false });
      }

      const [allTopics] = await pool.query(`SELECT t.*, u.name AS master_name, (SELECT COUNT(*) FROM weekly_entries we WHERE we.topic_id = t.id AND we.is_active = 1) as totalEntries, (SELECT COUNT(*) FROM weekly_entries we WHERE we.topic_id = t.id AND we.is_active = 1 AND LOWER(TRIM(we.user_email)) != LOWER(TRIM(?)) AND we.id NOT IN (SELECT entry_id FROM weekly_votes WHERE voter_email = ?)) as unvotedEntries FROM weekly_topics t LEFT JOIN photo_users u ON t.master_email = u.email WHERE t.id = ?`, [userEmail, userEmail, topicId]);
      const currentTopic = allTopics[0];
      if (!currentTopic) return res.status(404).json({ error: 'Ez a kihívás nem található!' });

      const isMasterUser = currentTopic.master_email && userEmail && currentTopic.master_email.toLowerCase().trim() === userEmail.toLowerCase().trim();
      const [myEntries] = await pool.query('SELECT * FROM weekly_entries WHERE topic_id = ? AND user_email = ? AND is_active = 1', [currentTopic.id, userEmail]);
      const [myPastEntries] = await pool.query('SELECT * FROM weekly_entries WHERE topic_id = ? AND user_email = ? AND is_active = 0 ORDER BY id DESC', [currentTopic.id, userEmail]);
      const [myVotes] = await pool.query('SELECT COUNT(*) as vote_count FROM weekly_votes v JOIN weekly_entries e ON v.entry_id = e.id WHERE e.topic_id = ? AND v.voter_email = ?', [currentTopic.id, userEmail]);
      
      const [leaderboard] = await pool.query(`SELECT e.id, e.user_name, e.user_email, e.file_url, e.drive_file_id, e.views_count, e.likes_count, u.club_name, e.camera, e.lens, e.shutter, e.iso, e.aperture, e.software, EXISTS(SELECT 1 FROM weekly_votes WHERE entry_id = e.id AND voter_email = ?) as has_user_voted, (SELECT COUNT(*) FROM weekly_votes WHERE voter_email = e.user_email AND entry_id IN (SELECT id FROM weekly_entries WHERE topic_id = e.topic_id AND is_active = 1)) as votes_cast, ${getFairScoreSql('e', 't')} as fair_score, IF((SELECT COUNT(*) FROM weekly_votes WHERE entry_id = e.id AND vote_type = 'master') > 0, 1, 0) AS has_master_vote FROM weekly_entries e JOIN weekly_topics t ON e.topic_id = t.id LEFT JOIN photo_users u ON e.user_email = u.email WHERE e.topic_id = ? AND e.is_active = 1 ORDER BY fair_score DESC, e.likes_count DESC, e.views_count ASC`, [userEmail, currentTopic.id]);

      const clubsData = {};
      leaderboard.forEach(entry => {
        if (!entry.club_name?.trim()) return; 
        if (!clubsData[entry.club_name]) clubsData[entry.club_name] = [];
        clubsData[entry.club_name].push(Number(entry.fair_score || 0));
      });

      const clubLeaderboard = Object.keys(clubsData).map(club => {
        clubsData[club].sort((a, b) => b - a);
        const top3 = clubsData[club].slice(0, 3);
        return { club_name: club, total_score: Number(top3.reduce((s, v) => s + v, 0).toFixed(2)), members_counted: top3.length };
      }).sort((a, b) => b.total_score - a.total_score);

      res.json({ topic: { ...currentTopic, isMaster: !!isMasterUser }, myEntry: myEntries[0] || null, myPastEntries, myVoteCount: myVotes[0]?.vote_count || 0, votableEntries: isMasterUser ? currentTopic.totalEntries : Math.max(1, currentTopic.totalEntries - 1), leaderboard, clubLeaderboard, userTotalLikes: totalLikes, userVictories: victories, userPower: power, swapBalance, myReferralCode, referredBy, masterVotesLeft: isMasterUser ? 999 : 0, isMaster: !!isMasterUser });
    } catch (err) { res.status(500).json({ error: 'Szerveroldali hiba.' }); }
  });

  // ====================================================================
  // ⚡ ARÉNA ALBUM
  // ====================================================================
  app.get('/api/weekly/my-album', requireAuth, async (req, res) => {
    const { userEmail } = req.query;
    if (!userEmail) return res.status(400).json({ error: 'Hiányzó e-mail cím!' });
    if (req.user.email !== userEmail && !req.user.isAdmin) return res.status(403).json({ error: 'Megtagadva!' });

    try {
      const nowMySQL = getLocalMySQLNow();
      const [photos] = await pool.query("SELECT id, file_url, created_at, camera, lens, shutter, iso, aperture, software FROM user_photos WHERE user_email = ? ORDER BY created_at DESC", [userEmail]);
      if (photos.length === 0) return res.json([]);

      const [userEntries] = await pool.query(`SELECT e.topic_id, e.file_url, e.likes_count, e.views_count, e.is_active, t.title AS topic_title, t.title_en, t.end_date, IF(t.end_date >= ?, 1, 0) AS is_topic_live, ${getFairScoreSql('e', 't')} as user_fair_score FROM weekly_entries e JOIN weekly_topics t ON e.topic_id = t.id WHERE e.user_email = ?`, [nowMySQL, userEmail]);
      const entriesByUrl = {}; const topicIds = new Set();
      userEntries.forEach(entry => {
        if (!entriesByUrl[entry.file_url]) entriesByUrl[entry.file_url] = [];
        entriesByUrl[entry.file_url].push(entry); topicIds.add(entry.topic_id);
      });

      let leaderboards = {};
      if (topicIds.size > 0) {
        const [allTopicEntries] = await pool.query(`SELECT e.topic_id, e.user_email, e.views_count, e.likes_count, ${getFairScoreSql('e', 't')} as fair_score FROM weekly_entries e JOIN weekly_topics t ON e.topic_id = t.id WHERE e.topic_id IN (?) AND e.is_active = 1`, [Array.from(topicIds)]);
        allTopicEntries.forEach(entry => { if (!leaderboards[entry.topic_id]) leaderboards[entry.topic_id] = []; leaderboards[entry.topic_id].push(entry); });
      }

      const albumWithStats = photos.map(photo => {
        const entries = entriesByUrl[photo.file_url] || []; const history = [];
        entries.forEach(entry => {
          const board = leaderboards[entry.topic_id] || [];
          const currentEntry = board.find(l => String(l.user_email).toLowerCase() === String(userEmail).trim().toLowerCase());
          let entryRank = board.length + 1;
          if (currentEntry) {
            entryRank = board.filter(item => Number(item.fair_score) > Number(currentEntry.fair_score) || (Number(item.fair_score) === Number(currentEntry.fair_score) && Number(item.likes_count) > Number(currentEntry.likes_count))).length + 1;
          }
          history.push({ topic_id: entry.topic_id, topic_title: entry.topic_title || '', likes_count: Number((currentEntry ? currentEntry.fair_score : entry.likes_count) || 0), views_count: entry.views_count, is_active: entry.is_active, end_date: entry.end_date, is_topic_live: entry.is_topic_live, entry_rank: entryRank, total_entries: board.length });
        });
        history.sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
        return { ...photo, totalLikes: Number(history.reduce((sum, h) => sum + Number(h.likes_count), 0).toFixed(2)), totalViews: history.reduce((sum, h) => sum + Number(h.views_count), 0), firstPlaces: history.filter(h => Number(h.entry_rank) === 1 && h.is_topic_live === 0 && h.is_active === 1).length, podiums: history.filter(h => Number(h.entry_rank) >= 2 && Number(h.entry_rank) <= 3 && h.is_topic_live === 0 && h.is_active === 1).length, isCurrentlyActive: history.some(h => h.is_active === 1 && h.is_topic_live === 1), history };
      });
      res.json(albumWithStats);
    } catch (err) { res.status(500).json({ error: 'Hiba.' }); }
  });

  // ====================================================================
  // 👑 JELENTKEZÉS CSATABÍRÓNAK
  // ====================================================================
  app.post('/api/weekly/apply-master', requireAuth, async (req, res) => {
    const { topicId, userEmail } = req.body;
    if (!topicId || !userEmail) return res.status(400).json({ error: 'Hiányzó adatok!' });
    if (req.user.email !== userEmail) return res.status(403).json({ error: 'Csalás észlelve!' });

    try {
      const [check] = await pool.query('SELECT master_email, pending_master_email FROM weekly_topics WHERE id = ?', [Number(topicId)]);
      if (check.length === 0) return res.json({ success: false, message: 'Ez a kihívás nem található!' });
      if (check[0].master_email) return res.json({ success: false, message: 'Ehhez a csatához már tartozik jóváhagyott Csatabíró!' });
      if (check[0].pending_master_email) return res.json({ success: false, message: 'Valaki már jelentkezett erre a pozícióra!' });

      await pool.query('UPDATE weekly_topics SET pending_master_email = ? WHERE id = ?', [userEmail.trim(), Number(topicId)]);
      res.json({ success: true, message: 'Jelentkezésedet sikeresen regisztráltuk! 👑' });
    } catch (err) { res.status(500).json({ error: 'Hiba.' }); }
  });

  // 🎯 MODOSÍTVA: Képmester jóváhagyásakor kivettük a +2 nap ingyen prémium adományozást
  app.post('/api/admin/decide-master', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Megtagadva!' });
    const { topicId, decision } = req.body; 
    try {
      if (decision === 'approved') {
        const [topicRows] = await pool.query('SELECT pending_master_email FROM weekly_topics WHERE id = ?', [topicId]);
        const masterEmail = topicRows[0]?.pending_master_email;
        if (masterEmail) {
          await pool.query('UPDATE weekly_topics SET master_email = pending_master_email, pending_master_email = NULL WHERE id = ?', [topicId]);
          // 🛑 AZ AJÁNDÉK PRÉMIUM TÖRLÉSRE KERÜLT - Innentől pontért veheti meg a boltban
        } else return res.status(400).json({ error: 'Nincs jelentkező!' });
      } else {
        await pool.query('UPDATE weekly_topics SET pending_master_email = NULL WHERE id = ?', [topicId]);
      }
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ====================================================================
  // 📸 ARÉNA KÉPFELTÖLTÉSEK
  // ====================================================================
  app.post('/api/weekly/my-album/upload', requireAuth, upload.single('photo'), async (req, res) => {
    const file = req.file; const { userEmail, camera, lens, shutter, iso, aperture, software } = req.body;
    if (!file || !userEmail) { if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path); return res.status(400).json({ error: 'Hiányzó adatok!' }); }
    if (req.user.email !== userEmail) { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); return res.status(403).json({ error: 'Tiltott feltöltés!' }); }

    try {
      const fileHash = crypto.createHash('md5').update(fs.readFileSync(file.path)).digest('hex');
      const [existing] = await pool.query("SELECT file_url FROM user_photos WHERE user_email = ? AND file_hash = ?", [userEmail, fileHash]);
      if (existing.length > 0) { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); return res.json({ success: true, message: 'Már az albumodban van!', file_url: existing[0].file_url }); }

      const result = await cloudinary.uploader.upload(file.path, { folder: 'felhasznaloi_albumok', width: 1600, height: 1600, crop: "limit", quality: "auto:good" });
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

      await pool.query("INSERT INTO user_photos (user_email, file_url, file_hash, camera, lens, shutter, iso, aperture, software) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [userEmail, result.secure_url, fileHash, camera || null, lens || null, shutter || null, iso || null, aperture || null, software || null]);
      res.json({ success: true, file_url: result.secure_url });
    } catch (err) { if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path); res.status(500).json({ error: err.message }); }
  });

  app.post('/api/weekly/upload', requireAuth, upload.single('photo'), async (req, res) => {
    const file = req.file; const { userEmail, topicId, userName, camera, lens, shutter, iso, aperture, software } = req.body;
    if (!file || req.user.email !== userEmail) { if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path); return res.status(400).json({ error: 'Hiba!' }); }

    const ipAddress = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.ip || req.socket.remoteAddress);
    try {
      const fileHash = crypto.createHash('md5').update(fs.readFileSync(file.path)).digest('hex');
      const result = await cloudinary.uploader.upload(file.path, { folder: 'parbajok', width: 1600, height: 1600, crop: "limit", quality: "auto:good" });
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

      await pool.query(`INSERT INTO weekly_entries (topic_id, user_email, user_name, file_url, drive_file_id, swapped, ip_address, is_active, likes_count, views_count, camera, lens, shutter, iso, aperture, software) VALUES (?, ?, ?, ?, '', 0, ?, 1, 0, 0, ?, ?, ?, ?, ?, ?)`, [Number(topicId), userEmail, userName, result.secure_url, ipAddress, camera || null, lens || null, shutter || null, iso || null, aperture || null, software || null]);
      const [albumDuplicate] = await pool.query("SELECT id FROM user_photos WHERE user_email = ? AND file_hash = ?", [userEmail, fileHash]);
      if (albumDuplicate.length === 0) {
        await pool.query("INSERT INTO user_photos (user_email, file_url, file_hash, camera, lens, shutter, iso, aperture, software) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [userEmail, result.secure_url, fileHash, camera || null, lens || null, shutter || null, iso || null, aperture || null, software || null]);
      }
      res.json({ success: true });
    } catch (err) { if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path); res.status(500).json({ error: err.message }); }
  });

  // ====================================================================
  // 🃏 JOKER CSERÉK INTEGRITÁS VÉDELME
  // ====================================================================
  app.post('/api/weekly/swap', requireAuth, upload.single('photo'), async (req, res) => {
    const file = req.file; const { topicId, userEmail, userName, camera, lens, shutter, iso, aperture, software } = req.body;
    if (!file || req.user.email !== userEmail) { if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path); return res.status(400).json({ error: 'Hiba!' }); }
    
    const ipAddress = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.ip || req.socket.remoteAddress);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [userRows] = await conn.query('SELECT swap_balance FROM photo_users WHERE email = ?', [userEmail]);
      if (!userRows[0] || userRows[0].swap_balance < 1) { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); await conn.rollback(); return res.status(400).json({ error: 'Nincs elég Jokered!' }); }
      
      const [existing] = await conn.query('SELECT id, swapped FROM weekly_entries WHERE topic_id = ? AND user_email = ? AND is_active = 1', [topicId, userEmail]);
      if (existing.length === 0) { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); await conn.rollback(); return res.status(400).json({ error: 'Nincs mit lecserélni!' }); }

      await conn.query('UPDATE weekly_entries SET is_active = 0 WHERE id = ?', [existing[0].id]);
      const fileHash = crypto.createHash('md5').update(fs.readFileSync(file.path)).digest('hex');
      let finalFileUrl = '';
      
      const [duplicatePhoto] = await conn.query("SELECT file_url FROM user_photos WHERE user_email = ? AND file_hash = ?", [userEmail, fileHash]);
      if (duplicatePhoto.length > 0) { finalFileUrl = duplicatePhoto[0].file_url; if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } 
      else {
        const result = await cloudinary.uploader.upload(file.path, { folder: 'parbajok', width: 1600, height: 1600, crop: "limit", quality: "auto:good" });
        finalFileUrl = result.secure_url; if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        await conn.query("INSERT INTO user_photos (user_email, file_url, file_hash, camera, lens, shutter, iso, aperture, software) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [userEmail, finalFileUrl, fileHash, camera || null, lens || null, shutter || null, iso || null, aperture || null, software || null]);
      }

      await conn.query(`INSERT INTO weekly_entries (topic_id, user_email, user_name, file_url, drive_file_id, swapped, ip_address, is_active, likes_count, views_count, camera, lens, shutter, iso, aperture, software) VALUES (?, ?, ?, ?, '', ?, ?, 1, 0, 0, ?, ?, ?, ?, ?, ?)`, [topicId, userEmail, userName, finalFileUrl, existing[0].swapped + 1, ipAddress, camera || null, lens || null, shutter || null, iso || null, aperture || null, software || null]);
      await conn.query('UPDATE photo_users SET swap_balance = swap_balance - 1 WHERE email = ?', [userEmail]);
      await conn.commit(); res.json({ success: true });
    } catch (err) { await conn.rollback(); if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path); res.status(500).json({ error: err.message }); } finally { conn.release(); }
  });

  app.post('/api/weekly/swap-existing', requireAuth, async (req, res) => {
    const { topicId, userEmail, userName, fileUrl } = req.body;
    if (req.user.email !== userEmail) return res.status(403).json({ error: 'Megtagadva!' });

    const ipAddress = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.ip || req.socket.remoteAddress);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [userRows] = await conn.query('SELECT swap_balance FROM photo_users WHERE email = ?', [userEmail]);
      if (!userRows[0] || userRows[0].swap_balance < 1) { await conn.rollback(); return res.status(400).json({ error: 'Nincs elég Joker cseréd!' }); }

      const [existing] = await conn.query('SELECT id, swapped FROM weekly_entries WHERE topic_id = ? AND user_email = ? AND is_active = 1', [topicId, userEmail]);
      if (existing.length === 0) { await conn.rollback(); return res.status(400).json({ error: 'Nincs aktív nevezésed!' }); }

      await conn.query('UPDATE weekly_entries SET is_active = 0 WHERE id = ?', [existing[0].id]);
      const [photoExif] = await conn.query("SELECT camera, lens, shutter, iso, aperture, software FROM user_photos WHERE user_email = ? AND file_url = ? LIMIT 1", [userEmail, fileUrl]);
      const exif = photoExif[0] || {};

      await conn.query(`INSERT INTO weekly_entries (topic_id, user_email, user_name, file_url, drive_file_id, swapped, ip_address, is_active, likes_count, views_count, camera, lens, shutter, iso, aperture, software) VALUES (?, ?, ?, ?, '', ?, ?, 1, 0, 0, ?, ?, ?, ?, ?, ?)`, [topicId, userEmail, userName, fileUrl, existing[0].swapped + 1, ipAddress, exif.camera || null, exif.lens || null, exif.shutter || null, exif.iso || null, exif.aperture || null, exif.software || null]);
      await conn.query('UPDATE photo_users SET swap_balance = swap_balance - 1 WHERE email = ?', [userEmail]);
      await conn.commit(); res.json({ success: true });
    } catch (err) { await conn.rollback(); res.status(500).json({ error: err.message }); } finally { conn.release(); }
  });

  app.post('/api/weekly/upload-existing', requireAuth, async (req, res) => {
    const topicId = req.body.topicId || req.body.topic_id;
    const userEmail = req.body.userEmail || req.body.user_email;
    const userName = req.body.userName || req.body.user_name;
    const fileUrl = req.body.fileUrl || req.body.file_url;

    if (req.user.email !== userEmail) return res.status(403).json({ error: 'Hitelesítési eltérés!' });
    const ipAddress = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.ip || req.socket.remoteAddress);

    try {
      const [topicCheck] = await pool.query('SELECT master_email FROM weekly_topics WHERE id = ?', [topicId]);
      if (topicCheck[0] && topicCheck[0].master_email === userEmail) return res.status(400).json({ error: 'Csatabíróként nem nevezhetsz a saját csatádra!' });

      const [existing] = await pool.query('SELECT id FROM weekly_entries WHERE topic_id = ? AND user_email = ? AND is_active = 1', [topicId, userEmail]);
      if (existing.length > 0) return res.status(400).json({ error: 'Már neveztél!' });

      const [photoExif] = await pool.query("SELECT camera, lens, shutter, iso, aperture, software FROM user_photos WHERE user_email = ? AND file_url = ? LIMIT 1", [userEmail, fileUrl]);
      const exif = photoExif[0] || {};

      await pool.query(`INSERT INTO weekly_entries (topic_id, user_email, user_name, file_url, drive_file_id, swapped, ip_address, is_active, likes_count, views_count, camera, lens, shutter, iso, aperture, software) VALUES (?, ?, ?, ?, '', 0, ?, 1, 0, 0, ?, ?, ?, ?, ?, ?)`, [topicId, userEmail, userName, fileUrl, ipAddress, exif.camera || null, exif.lens || null, exif.shutter || null, exif.iso || null, exif.aperture || null, exif.software || null]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/weekly/swap-back', requireAuth, async (req, res) => {
    const { topicId, userEmail, entryId } = req.body;
    if (req.user.email !== userEmail) return res.status(403).json({ error: 'Megtagadva!' });
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [userRows] = await conn.query('SELECT swap_balance FROM photo_users WHERE email = ?', [userEmail]);
      if (!userRows[0] || userRows[0].swap_balance < 1) { await conn.rollback(); return res.status(400).json({ error: 'Nincs elég Jokered!' }); }

      await conn.query('UPDATE weekly_entries SET is_active = 0 WHERE topic_id = ? AND user_email = ? AND is_active = 1', [topicId, userEmail]);
      const [result] = await conn.query('UPDATE weekly_entries SET is_active = 1 WHERE id = ? AND topic_id = ? AND user_email = ?', [entryId, topicId, userEmail]);
      if (result.affectedRows === 0) { await conn.rollback(); return res.status(404).json({ error: 'Kép nem található!' }); }

      await conn.query('UPDATE photo_users SET swap_balance = swap_balance - 1 WHERE email = ?', [userEmail]);
      await conn.commit(); res.json({ success: true });
    } catch (err) { await conn.rollback(); res.status(500).json({ error: err.message }); } finally { conn.release(); }
  });

  // ====================================================================
  // 🗳️ SZAVAZÁSI VÉGPONTOK
  // ====================================================================
  app.get('/api/weekly/next-vote', requireAuth, async (req, res) => {
    const { topicId, userEmail } = req.query;
    if (req.user.email !== userEmail) return res.status(403).json({ error: 'Eltérő munkamenet!' });
    try {
      const [entries] = await pool.query(`SELECT e.id, e.user_name, e.file_url, e.views_count, e.likes_count FROM weekly_entries e WHERE e.topic_id = ? AND e.user_email != ? AND e.is_active = 1 AND e.id NOT IN (SELECT entry_id FROM weekly_votes WHERE voter_email = ?) ORDER BY e.views_count ASC, RAND() LIMIT 1`, [topicId, userEmail, userEmail]);
      res.json({ entry: entries[0] || null });
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  app.post('/api/weekly/vote', requireAuth, async (req, res) => {
    const { entryId, userEmail, voteType } = req.body; 
    if (req.user.email !== userEmail) return res.status(403).json({ error: 'Tiltott manipuláció!' });
    
    const conn = await pool.getConnection();
    let awardVoteBonus = false;
    let targetTopicId = null;

    try {
      await conn.beginTransaction();
      const [existing] = await conn.query('SELECT id FROM weekly_votes WHERE entry_id = ? AND voter_email = ?', [entryId, userEmail]);
      if (existing.length > 0) { await conn.rollback(); return res.json({ success: false, message: 'Már szavaztál!' }); }

      const [entryTopicRows] = await conn.query('SELECT topic_id FROM weekly_entries WHERE id = ?', [entryId]);
      const topicId = entryTopicRows[0]?.topic_id;
      targetTopicId = topicId; 

      const [topicRows] = await conn.query('SELECT master_email FROM weekly_topics WHERE id = ?', [topicId]);
      
      const isRealMasterOfThisRoom = userEmail && topicRows[0]?.master_email && userEmail.toLowerCase().trim() === topicRows[0].master_email.toLowerCase().trim();
      let calculatedPoints = 0;

      if (voteType === 'pass') { calculatedPoints = 0; } 
      else if (voteType === 'master') {
        if (!isRealMasterOfThisRoom) { await conn.rollback(); return res.status(403).json({ error: 'Nem te vagy a Csatabíró!' }); }
        calculatedPoints = 10; 
      } else {
        const { totalLikes, victories } = await getUserLikesAndVictories(conn, userEmail);
        const power = getVotePowerByLevel(calculateRankLevel(totalLikes, victories));
        calculatedPoints = voteType === 'super' ? power.super : power.brilliant;
      }

      await conn.query('INSERT INTO weekly_votes (entry_id, voter_email, vote_type) VALUES (?, ?, ?)', [entryId, userEmail, voteType]);
      await conn.query('UPDATE weekly_entries SET views_count = views_count + 1, likes_count = likes_count + ? WHERE id = ?', [calculatedPoints, entryId]);

      if (calculatedPoints > 0) {
        const [entryRows] = await conn.query('SELECT user_email FROM weekly_entries WHERE id = ?', [entryId]);
        if (entryRows[0]?.user_email) await checkAndAwardLevelUp(conn, entryRows[0].user_email);
      }

      if (topicId) {
        const [totalEntriesRows] = await conn.query(
          'SELECT COUNT(*) as total FROM weekly_entries WHERE topic_id = ? AND is_active = 1 AND LOWER(TRIM(user_email)) != LOWER(TRIM(?))',
          [topicId, userEmail]
        );
        const totalVotable = Number(totalEntriesRows[0]?.total || 0);

        const [userVotesRows] = await conn.query(
          `SELECT COUNT(*) as votes FROM weekly_votes v 
           JOIN weekly_entries e ON v.entry_id = e.id 
           WHERE e.topic_id = ? AND v.voter_email = ?`,
          [topicId, userEmail]
        );
        const userVotesCount = Number(userVotesRows[0]?.votes || 0);

        if (totalVotable > 0 && userVotesCount === totalVotable) {
          const [alreadyAwarded] = await conn.query(
            "SELECT id FROM photo_points_ledger WHERE user_email = ? AND reason_key = 'arena_vote_bonus' AND related_id = ?",
            [userEmail, topicId]
          );
          
          if (alreadyAwarded.length === 0) {
            awardVoteBonus = true;
          }
        }
      }

      await conn.commit();
    } catch (err) { 
      await conn.rollback(); 
      res.status(500).json({ error: err.message }); 
      return;
    } finally { 
      conn.release(); 
    }

    if (awardVoteBonus && targetTopicId) {
      try {
        await PointsService.handleTransaction(
          pool, 
          userEmail, 
          PointsService.CONSTANTS.EARN_ARENA_VOTE_BONUS, 
          'arena_vote_bonus', 
          targetTopicId,
          'Minden szavazat sikeresen leadva a szobában! ⚡', 
          'All votes successfully cast in the room!'
        );
      } catch (e) {
        console.error("⚠️ Nem sikerült a szavazási bónuszt lekönyvelni:", e.message);
      }
    }

    res.json({ success: true, savedAs: voteType, voteBonusAwarded: awardVoteBonus });
  });

  // ====================================================================
  // 👥 AJÁNLÓRENDSZER ÉRVÉNYESÍTÉSE (MÓDOSÍTVA: 200-200 GLOBÁLIS PONT)
  // ====================================================================
  app.post('/api/weekly/claim-referral', requireAuth, async (req, res) => {
    const { userEmail, referralCode } = req.body;
    if (req.user.email !== userEmail) return res.status(403).json({ error: 'Munkamenet hiba!' });
    try {
      const [userRows] = await pool.query('SELECT referred_by FROM photo_users WHERE email = ?', [userEmail]);
      if (!userRows[0]) return res.status(404).json({ error: 'Nincs meg a user!' });
      if (userRows[0].referred_by) return res.status(400).json({ error: 'Már adtál meg kódot!' });

      const cleanCode = referralCode.trim().toUpperCase();
      const [referrerRows] = await pool.query('SELECT email FROM photo_users WHERE referral_code = ?', [cleanCode]);
      if (referrerRows.length === 0) return res.status(400).json({ error: 'A kód nem létezik!' });

      const referrerEmail = referrerRows[0].email;
      if (referrerEmail === userEmail) return res.status(400).json({ error: 'Saját magad kódja nem ér!' });

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // 🪙 Cserék helyett tranzakcióbiztosan lekönyveljük a 200 pontot az Ajánlónak
        await PointsService.handleTransaction(
          conn, 
          referrerEmail, 
          200, 
          'referral_reward', 
          null,
          `👥 Sikeres meghívás! Regisztrált tag: ${userEmail}`, 
          `Successful referral! Registered member: ${userEmail}`
        );

        // 🎁 És lekönyveljük a 200 pontot a kódot beíró új felhasználónak is
        await PointsService.handleTransaction(
          conn, 
          userEmail, 
          200, 
          'referred_bonus', 
          null,
          `🎁 Meghívó kód érvényesítve (+200p bónusz!)`, 
          `Referral code claimed (+200p bonus!)`
        );

        // Elmentjük az érvényesítést a felhasználó profiljába, hogy többször ne tudja kijátszani
        await conn.query('UPDATE photo_users SET referred_by = ? WHERE email = ?', [cleanCode, userEmail]);
        await conn.commit(); 
        
        res.json({ success: true });
      } catch (e) { 
        await conn.rollback(); 
        throw e; 
      } finally { 
        conn.release(); 
      }
    } catch (err) { 
      res.status(500).json({ error: 'Hiba az ajánlás feldolgozásakor.' }); 
    }
  });

  // ====================================================================
  // 📰 HISTÓRIKUS ÉS NYILVÁNOS ADATOK
  // ====================================================================
  app.get('/api/weekly/upcoming', requireAuth, async (req, res) => {
    try {
      const [topics] = await pool.query(`SELECT t.*, u.name AS master_name FROM weekly_topics t LEFT JOIN photo_users u ON t.master_email = u.email WHERE t.start_date > ? AND t.status = 'approved' ORDER BY t.start_date ASC`, [getLocalMySQLNow()]);
      res.json(topics);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/weekly/past', requireAuth, async (req, res) => {
    try {
      const [rows] = await pool.query(`SELECT t.*, u.name as master_name, u.avatar_url as master_avatar_url, (SELECT COUNT(*) FROM weekly_entries WHERE topic_id = t.id AND is_active = 1) as entries_count, (SELECT COUNT(*) FROM weekly_votes WHERE entry_id IN (SELECT id FROM weekly_entries WHERE topic_id = t.id)) as total_votes FROM weekly_topics t LEFT JOIN photo_users u ON t.master_email = u.email WHERE t.end_date < ? ORDER BY t.end_date DESC`, [getLocalMySQLNow()]);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  app.get('/api/weekly/my-stats', requireAuth, async (req, res) => {
    const { userEmail } = req.query;
    if (req.user.email !== userEmail && !req.user.isAdmin) return res.status(403).json({ error: 'Megtagadva!' });
    try {
      const [userStats] = await pool.query("SELECT victories FROM photo_users WHERE email = ?", [userEmail]);
      const [podiumRows] = await pool.query(`SELECT COUNT(CASE WHEN final_rank = 1 THEN 1 END) as first, COUNT(CASE WHEN final_rank = 2 THEN 1 END) as second, COUNT(CASE WHEN final_rank = 3 THEN 1 END) as third FROM weekly_entries WHERE LOWER(TRIM(user_email)) = LOWER(TRIM(?)) AND final_rank IS NOT NULL`, [userEmail]);
      const [historyRows] = await pool.query(`SELECT t.title as topic_title, t.title_en as topic_title_en, t.start_date, t.end_date, e.file_url, e.drive_file_id, e.final_rank as rank, e.views_count as views, e.final_fair_score as likes, e.user_name FROM weekly_entries e JOIN weekly_topics t ON e.topic_id = t.id WHERE LOWER(TRIM(e.user_email)) = LOWER(TRIM(?)) AND e.final_rank IS NOT NULL ORDER BY t.end_date DESC`, [userEmail]);
      res.json({ podiums: { first: podiumRows[0]?.first || 0, second: podiumRows[0]?.second || 0, third: podiumRows[0]?.third || 0 }, history: historyRows });
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // ====================================================================
  // 🛡️ ANTI-FRAUD ÉS MONITORING VÉGPONTOK
  // ====================================================================
  app.get('/api/admin/weekly/suspicious', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    try {
      const [rows] = await pool.query(`SELECT e.topic_id, t.title AS topic_title, e.ip_address, COUNT(DISTINCT e.user_email) AS entry_count, GROUP_CONCAT(DISTINCT CONCAT(e.user_name, ' (', e.user_email, ')') SEPARATOR ' || ') AS suspect_list FROM weekly_entries e JOIN weekly_topics t ON e.topic_id = t.id WHERE e.ip_address IS NOT NULL AND e.ip_address != '127.0.0.1' AND e.ip_approved = 0 GROUP BY e.topic_id, e.ip_address HAVING COUNT(DISTINCT e.user_email) > 1 ORDER BY e.topic_id DESC`);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/admin/weekly/approve-ip', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    try {
      await pool.query('UPDATE weekly_entries SET ip_approved = 1 WHERE topic_id = ? AND user_email = ?', [req.body.topicId, req.body.userEmail]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
  
  app.delete('/api/admin/weekly/disqualify', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    const { topicId, userEmail } = req.query;
    try {
      const [entries] = await pool.query('SELECT id, drive_file_id, file_url FROM weekly_entries WHERE topic_id = ? AND user_email = ?', [topicId, userEmail]);
      for (const entry of entries) {
        if (entry.drive_file_id) await drive.files.delete({ fileId: entry.drive_file_id }).catch(() => {});
        else if (entry.file_url?.includes('cloudinary.com')) {
          const urlParts = entry.file_url.split('/'); const uploadIndex = urlParts.indexOf('upload');
          if (uploadIndex !== -1 && urlParts.length > uploadIndex + 2) {
            await cloudinary.uploader.destroy('parbaj_archivum/' + urlParts.slice(uploadIndex + 2).join('/').split('.')[0]).catch(() => {});
          }
        }
        await pool.query('DELETE FROM weekly_votes WHERE entry_id = ?', [entry.id]);
        await pool.query('DELETE FROM weekly_entries WHERE id = ?', [entry.id]);
      }
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  app.get('/api/weekly/report-hof-stats', requireAuth, async (req, res) => {
    const { userEmail } = req.query;
    if (req.user.email !== userEmail && !req.user.isAdmin) return res.status(403).json({ error: 'Megtagadva!' });
    try {
      let cleanEmail = String(userEmail).trim().toLowerCase();
      const [pastTopics] = await pool.query("SELECT id, title, title_en, start_date, end_date FROM weekly_topics WHERE end_date < ? AND (status = 'approved' OR status IS NULL OR status = '') ORDER BY end_date DESC", [getLocalMySQLNow()]);
      let podiums = { first: 0, second: 0, third: 0 }; let history = [];

      for (const topic of pastTopics) {
        const [entries] = await pool.query(`SELECT e.id, e.user_email, e.user_name, e.file_url, e.drive_file_id, e.likes_count, e.views_count, ${getFairScoreSql('e', 't')} as fair_score FROM weekly_entries e JOIN weekly_topics t ON e.topic_id = t.id WHERE e.topic_id = ? AND e.is_active = 1 ORDER BY fair_score DESC, e.likes_count DESC, e.views_count ASC`, [topic.id]);
        const userIndex = entries.findIndex(e => e.user_email && String(e.user_email).trim().toLowerCase() === cleanEmail);
        if (userIndex !== -1) {
          const rank = userIndex + 1; const entry = entries[userIndex];
          if (rank === 1) podiums.first++; else if (rank === 2) podiums.second++; else if (rank === 3) podiums.third++;
          history.push({ topic_title: String(topic.title || ''), topic_title_en: String(topic.title_en || topic.title || ''), start_date: topic.start_date, end_date: topic.end_date, rank: Number(rank), total_entries: Number(entries.length), file_url: String(entry.file_url || ''), drive_file_id: String(entry.drive_file_id || ''), likes: Number(entry.fair_score || 0), views: Number(entry.views_count || 0), user_name: String(entry.user_name || '') });
        }
      }
      res.json({ podiums, history });
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

 // ====================================================================
  // 🏆 GLOBÁLIS DICSŐSÉGCSARNOK LEKÉRDEZÉS (JAVÍTVA: VALÓDI DOBOGÓK SZÁMÍTÁSA)
  // ====================================================================
  app.get('/api/weekly/hall-of-fame', requireAuth, async (req, res) => {
    try {
      // 🎯 JAVÍTVA: A subquery most már kizárólag a lezárt futamok 1., 2. és 3. helyezéseit számolja dobogónak!
      const [leaderboard] = await pool.query(`
        SELECT u.name as user_name, u.email as user_email, u.club_name, u.avatar_url, c.drive_logo_id, c.logo_url, 
               COALESCE(u.total_likes, 0) as total_likes, 
               COALESCE(u.victories, 0) as first_places, 
               (SELECT COUNT(*) FROM weekly_entries WHERE LOWER(TRIM(user_email)) = LOWER(TRIM(u.email)) AND final_rank IN (1, 2, 3)) as podiums, 
               (SELECT COUNT(*) FROM weekly_topics WHERE LOWER(TRIM(master_email)) = LOWER(TRIM(u.email)) AND status = 'approved') as master_count 
        FROM photo_users u 
        LEFT JOIN photo_clubs c ON u.club_name = c.name 
        WHERE u.total_likes > 0 OR u.victories > 0 
        ORDER BY u.total_likes DESC, u.name ASC
      `);
      res.json(leaderboard);
    } catch (err) { 
      console.error("❌ Hiba a dicsőségcsarnok lekérésekor:", err.message);
      res.status(500).json({ error: 'Hiba a dicsőségcsarnok betöltésekor' }); 
    }
  });

  // ====================================================================
  // ☁️ CLOUDINARY ADAT-MIGRÁCIÓS ÉS PROXY PANEL
  // ====================================================================
  app.post('/api/admin/test-cloudinary', requireAuth, upload.single('photo'), async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    const file = req.file; if (!file) return res.status(400).json({ error: 'Nincs fájl!' });
    try {
      const result = await cloudinary.uploader.upload(file.path, { folder: 'fotoklub_tesztek', width: 1600, height: 1600, crop: "limit", quality: "auto:good" });
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.json({ success: true, secure_url: result.secure_url });
    } catch (err) { if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path); res.status(500).json({ error: 'Hiba' }); }
  });

  app.get('/api/admin/migrate-drive-to-cloudinary', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    try {
      const [rows] = await pool.query("SELECT id, drive_file_id, user_name, user_email FROM weekly_entries WHERE drive_file_id IS NOT NULL AND drive_file_id != ''");
      res.json({ success: true, message: `🚚 Adat-migráció elindítva a háttérben!` });
      
      (async () => {
        try {
          const [alreadyMigrated] = await pool.query("SELECT user_email, file_url FROM weekly_entries WHERE file_url LIKE '%cloudinary.com%'");
          for (const entry of alreadyMigrated) {
            const [exists] = await pool.query("SELECT id FROM user_photos WHERE user_email = ? AND file_url = ?", [entry.user_email, entry.file_url]);
            if (exists.length === 0) await pool.query("INSERT INTO user_photos (user_email, file_url, file_hash) VALUES (?, ?, 'migrated')", [entry.user_email, entry.file_url]);
          }
          const tempFilePath = './temp_migration_file.jpg';
          for (const entry of rows) {
            try {
              const driveResponse = await drive.files.get({ fileId: entry.drive_file_id, alt: 'media' }, { responseType: 'arraybuffer' });
              const buffer = Buffer.from(driveResponse.data);
              if (buffer.length > 10 * 1024 * 1024) continue;
              fs.writeFileSync(tempFilePath, buffer);
              const uploadResult = await cloudinary.uploader.upload(tempFilePath, { folder: 'parbaj_archivum' });
              if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
              await pool.query("UPDATE weekly_entries SET drive_file_id = '', file_url = ? WHERE id = ?", [uploadResult.secure_url, entry.id]);
              const [albumExists] = await pool.query("SELECT id FROM user_photos WHERE user_email = ? AND file_url = ?", [entry.user_email, uploadResult.secure_url]);
              if (albumExists.length === 0) await pool.query("INSERT INTO user_photos (user_email, file_url, file_hash) VALUES (?, ?, 'migrated')", [entry.user_email, uploadResult.secure_url]);
              await new Promise(r => setTimeout(resolve, 1500));
            } catch (e) { if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath); }
          }
        } catch (e) {}
      })();
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  app.get('/api/admin/base64-proxy', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    try {
      const response = await axios.get(req.query.url, { responseType: 'arraybuffer' });
      res.json({ base64: `data:${response.headers['content-type']};base64,${Buffer.from(response.data).toString('base64')}` });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ====================================================================
  // 💡 JAVASLATOK ÉS ARCHÍVUM CSERÉK
  // ====================================================================
  app.post('/api/weekly/propose', requireAuth, upload.single('cover'), async (req, res) => {
    const { title, title_en, description, description_en, cover_author, master_name, start_date, end_date, userEmail } = req.body;
    if (req.user.email !== userEmail) { if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); return res.status(403).json({ error: 'Munkamenet hiba!' }); }

    try {
      let coverUrl = null;
      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, { folder: 'parbaj_boritokepek', width: 1200, height: 600, crop: "limit", quality: "auto:good" });
        coverUrl = result.secure_url;
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
      await pool.query('INSERT INTO weekly_topics (title, title_en, description, description_en, start_date, end_date, master_email, cover_url, cover_author) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [title, title_en || null, description, description_en || null, start_date, end_date, master_name || null, coverUrl, cover_author || null]);
      res.json({ success: true });
    } catch (err) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/proposals', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    try { res.json((await pool.query("SELECT * FROM weekly_topics WHERE status = 'pending' ORDER BY start_date ASC"))[0]); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 🎯 JAVÍTVA: A helyes végpont név visszaállítva, Prémium adományozás nélkül!
  app.post('/api/admin/decide-proposal', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    const { topicId, decision } = req.body;
    try {
      if (decision === 'approved') {
        await pool.query("UPDATE weekly_topics SET status = 'approved' WHERE id = ?", [topicId]);
        // 🛑 AZ INGYEN PRÉMIUM TÖRLÉSRE KERÜLT - Innentől pontért veheti meg a boltban
      } else {
        await pool.query("UPDATE weekly_topics SET status = ? WHERE id = ?", [decision, topicId]);
      }
      res.json({ success: 'Sikeres bírálat!' });
    } catch (err) { res.status(500).json({ error: 'Hiba.' }); }
  });
  app.delete('/api/admin/weekly-topics/:id', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Megtagadva!' });
    try {
      await pool.query('DELETE FROM weekly_topics WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // ====================================================================
  // 💬 ÉLŐ ARÉNA CSEVEGÉS PROXY MOTORJA
  // ====================================================================
  app.get('/api/weekly/chat/:topicId', requireAuth, async (req, res) => {
    try {
      const [messages] = await pool.query(`
        SELECT c.id, COALESCE(u.name, c.user_name) AS user_name, c.user_email, u.avatar_url, c.message_text, c.created_at 
        FROM weekly_chat c LEFT JOIN photo_users u ON c.user_email = u.email 
        WHERE c.topic_id = ? ORDER BY c.created_at ASC LIMIT 100
      `, [Number(req.params.topicId)]);
      
      const currentTypers = []; const now = Date.now();
      if (typingStatus[req.params.topicId]) {
        for (const email in typingStatus[req.params.topicId]) {
          if (now - typingStatus[req.params.topicId][email].timestamp < 5000) currentTypers.push(typingStatus[req.params.topicId][email].name);
          else delete typingStatus[req.params.topicId][email];
        }
      }
      res.json({ messages, typing: currentTypers });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

   app.get('/api/weekly/hof-stats', requireAuth, async (req, res) => {
    const { userEmail } = req.query;
    if (req.user.email !== userEmail && !req.user.isAdmin) return res.status(403).json({ error: 'Megtagadva!' });
    try {
      let cleanEmail = String(userEmail).trim().toLowerCase();
      const [pastTopics] = await pool.query("SELECT id, title, title_en, start_date, end_date FROM weekly_topics WHERE end_date < ? AND (status = 'approved' OR status IS NULL OR status = '') ORDER BY end_date DESC", [getLocalMySQLNow()]);
      let podiums = { first: 0, second: 0, third: 0 }; let history = [];

      for (const topic of pastTopics) {
        const [entries] = await pool.query(`SELECT e.id, e.user_email, e.user_name, e.file_url, e.drive_file_id, e.likes_count, e.views_count, ${getFairScoreSql('e', 't')} as fair_score FROM weekly_entries e JOIN weekly_topics t ON e.topic_id = t.id WHERE e.topic_id = ? AND e.is_active = 1 ORDER BY fair_score DESC, e.likes_count DESC, e.views_count ASC`, [topic.id]);
        const userIndex = entries.findIndex(e => e.user_email && String(e.user_email).trim().toLowerCase() === cleanEmail);
        if (userIndex !== -1) {
          const rank = userIndex + 1; const entry = entries[userIndex];
          if (rank === 1) podiums.first++; else if (rank === 2) podiums.second++; else if (rank === 3) podiums.third++;
          history.push({ topic_title: String(topic.title || ''), topic_title_en: String(topic.title_en || topic.title || ''), start_date: topic.start_date, end_date: topic.end_date, rank: Number(rank), total_entries: Number(entries.length), file_url: String(entry.file_url || ''), drive_file_id: String(entry.drive_file_id || ''), likes: Number(entry.fair_score || 0), views: Number(entry.views_count || 0), user_name: String(entry.user_name || '') });
        }
      }
      res.json({ podiums, history });
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });
  
  app.post('/api/weekly/chat', requireAuth, async (req, res) => {
    const { topicId, userEmail, userName, messageText } = req.body;
    if (req.user.email !== userEmail) return res.status(403).json({ error: 'Munkamenet hiba!' });
    if (!messageText?.trim()) return res.status(400).json({ error: 'Üres üzenet!' });
    try {
      const [userRows] = await pool.query('SELECT name FROM photo_users WHERE email = ?', [userEmail]);
      const officialName = userRows[0]?.name || userName || 'Anonim Fotós';
      await pool.query('INSERT INTO weekly_chat (topic_id, user_email, user_name, message_text) VALUES (?, ?, ?, ?)', [Number(topicId), userEmail, officialName, messageText.trim()]);
      if (typingStatus[topicId]?.[userEmail]) delete typingStatus[topicId][userEmail];
      res.json({ success: true, user_name: officialName });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ====================================================================
  // ❤️ ARCHÍVUM INTERAKTÍV MÓD
  // ====================================================================
  const handleArchiveLikeLogic = async (req, res) => {
    const { entryId, userEmail } = req.body;
    if (req.user.email !== userEmail) return res.status(403).json({ error: 'Munkamenet hiba!' });
    try {
      const [existing] = await pool.query('SELECT id FROM weekly_archive_likes WHERE entry_id = ? AND user_email = ?', [entryId, userEmail]);
      if (existing.length > 0) {
        await pool.query('DELETE FROM weekly_archive_likes WHERE entry_id = ? AND user_email = ?', [entryId, userEmail]);
        return res.json({ success: true, liked: false });
      } else {
        await pool.query('INSERT INTO weekly_archive_likes (entry_id, user_email) VALUES (?, ?)', [entryId, userEmail]);
        return res.json({ success: true, liked: true });
      }
    } catch (e) { res.status(500).json({ error: e.message }); }
  };
  app.post('/api/weekly/archive/like', requireAuth, handleArchiveLikeLogic);
  app.post('/api/weekly/history/like', requireAuth, handleArchiveLikeLogic);
  app.post('/api/weekly/archive/like-toggle', requireAuth, handleArchiveLikeLogic);
  app.post('/api/weekly/history/like-toggle', requireAuth, handleArchiveLikeLogic);

  const handleGetComments = async (req, res) => {
    try { res.json((await pool.query('SELECT * FROM weekly_archive_comments WHERE entry_id = ? ORDER BY created_at ASC', [req.params.entryId]))[0]); } catch (e) { res.status(500).json({ error: e.message }); }
  };
  app.get('/api/weekly/archive/comments/:entryId', requireAuth, handleGetComments);
  app.get('/api/weekly/history/comments/:entryId', requireAuth, handleGetComments);

  const handlePostComment = async (req, res) => {
    const { entryId, userEmail, userName, commentText } = req.body;
    if (req.user.email !== userEmail) return res.status(403).json({ error: 'Munkamenet hiba!' });
    try {
      await pool.query('INSERT INTO weekly_archive_comments (entry_id, user_email, user_name, comment_text) VALUES (?, ?, ?, ?)', [entryId, userEmail, userName || 'Anonim', commentText.trim()]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  };
  app.post('/api/weekly/archive/comment', requireAuth, handlePostComment);
  app.post('/api/weekly/history/comment', requireAuth, handlePostComment);

  app.post('/api/weekly/chat/typing', requireAuth, (req, res) => {
    const { topicId, userEmail, userName } = req.body;
    if (req.user.email !== userEmail) return res.json({ success: false });
    if (!typingStatus[topicId]) typingStatus[topicId] = {};
    typingStatus[topicId][userEmail] = { name: userName || 'Valaki', timestamp: Date.now() };
    res.json({ success: true });
  });
  
 app.get('/api/weekly/history/:topicId', requireAuth, async (req, res) => {
    const userEmail = req.query.userEmail || '';
    if (req.user.email !== userEmail && !req.user.isAdmin) return res.status(403).json({ error: 'Munkamenet hiba!' });
    try {
      const [leaderboard] = await pool.query(`SELECT e.id, e.user_name, e.user_email, e.file_url, e.drive_file_id, e.views_count, e.likes_count, u.club_name, e.camera, e.lens, e.shutter, e.iso, e.aperture, e.software, EXISTS(SELECT 1 FROM weekly_votes WHERE entry_id = e.id AND voter_email = ?) as has_user_voted, (SELECT COUNT(*) FROM weekly_votes WHERE voter_email = e.user_email AND entry_id IN (SELECT id FROM weekly_entries WHERE topic_id = e.topic_id AND is_active = 1)) as votes_cast, ${getFairScoreSql('e', 't')} as fair_score, COALESCE((SELECT 1 FROM weekly_votes WHERE entry_id = e.id AND vote_type = 'master' LIMIT 1), 0) AS has_master_vote, (SELECT COUNT(*) FROM weekly_archive_likes WHERE entry_id = e.id) as archive_likes, EXISTS(SELECT 1 FROM weekly_archive_likes WHERE entry_id = e.id AND LOWER(TRIM(user_email)) = LOWER(TRIM(?))) as has_user_liked FROM weekly_entries e JOIN weekly_topics t ON e.topic_id = t.id LEFT JOIN photo_users u ON e.user_email = u.email WHERE e.topic_id = ? AND e.is_active = 1 ORDER BY fair_score DESC, e.likes_count DESC, e.views_count ASC`, [userEmail, userEmail, req.params.topicId]);
      const clubsData = {};
      leaderboard.forEach(entry => { if (entry.club_name?.trim()) { if (!clubsData[entry.club_name]) clubsData[entry.club_name] = []; clubsData[entry.club_name].push(Number(entry.fair_score || 0)); } });
      const clubLeaderboard = Object.keys(clubsData).map(club => { clubsData[club].sort((a, b) => b - a); return { club_name: club, total_score: Number(clubsData[club].slice(0, 3).reduce((sum, val) => sum + val, 0).toFixed(2)), members_counted: clubsData[club].slice(0, 3).length }; }).sort((a, b) => b.total_score - a.total_score);
      res.json({ leaderboard, clubLeaderboard });
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });
  // ====================================================================
  // ⚡ HISTÓRIKUS ADAT-ÚJRAÉPÍTŐ MOTOR
  // ====================================================================
  app.get('/api/admin/rebuild-historical-facts', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    try {
      const currentNow = getLocalMySQLNow();
      await pool.query('UPDATE photo_users SET total_likes = 0, victories = 0');
      await pool.query('UPDATE weekly_entries SET final_fair_score = NULL, final_rank = NULL');
      const [pastTopics] = await pool.query("SELECT id FROM weekly_topics WHERE end_date < ?", [currentNow]);
      let processedEntriesCount = 0;

      for (const topic of pastTopics) {
        const [entries] = await pool.query(`SELECT e.id, e.user_email, ${getFairScoreSql('e', 't')} as fair_score FROM weekly_entries e JOIN weekly_topics t ON e.topic_id = t.id WHERE e.topic_id = ? AND e.is_active = 1 ORDER BY fair_score DESC, e.likes_count DESC, e.views_count ASC`, [topic.id]);
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i]; const rank = i + 1; const finalScore = Number(entry.fair_score || 0);
          await pool.query('UPDATE weekly_entries SET final_fair_score = ?, final_rank = ? WHERE id = ?', [finalScore, rank, entry.id]);
          await pool.query('UPDATE photo_users SET total_likes = total_likes + ? WHERE email = ?', [finalScore, entry.user_email]);
          if (rank === 1) await pool.query('UPDATE photo_users SET victories = victories + 1 WHERE email = ?', [entry.user_email]);
          processedEntriesCount++;
        }
      }
      const [allUsers] = await pool.query('SELECT email FROM photo_users');
      for (const u of allUsers) {
        const [stats] = await pool.query('SELECT total_likes, victories FROM photo_users WHERE email = ?', [u.email]);
        if (stats[0]) await pool.query('UPDATE photo_users SET rank_level = ? WHERE email = ?', [calculateRankLevel(Number(stats[0].total_likes), Number(stats[0].victories)), u.email]);
      }
      res.json({ success: true, message: `Sikeres migráció: ${processedEntriesCount} nevezés helyezése beégetve!` });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/weekly/report-off-topic', requireAuth, async (req, res) => {
    const { entryId, userEmail } = req.body;
    if (req.user.email !== userEmail) return res.status(403).json({ error: 'Munkamenet hiba!' });
    try {
      await pool.query('UPDATE weekly_entries SET off_topic_count = off_topic_count + 1, views_count = views_count + 1 WHERE id = ?', [entryId]);
      await pool.query("INSERT IGNORE INTO weekly_votes (entry_id, voter_email, vote_type) VALUES (?, ?, 'pass')", [entryId, userEmail]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
};
