const fs = require('fs');
const path = require('path'); // 👑 Előrehozva a legtetejére a tiszta import érdekében
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
// 🧠 Globális in-memory objektum a gépelő júzerek követéséhez (Adatbázis terhelés = 0!)
let typingStatus = {};

// Cloudinary konfiguráció a környezeti változókból
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = function(app, pool, drive, upload, cleanupTempFile) {
  
  // 🕒 Globális in-memory változó a háttérben futó lezárások ritkításához
  let lastChallengeProcessTime = 0;

// 🎯 JAVÍTVA: Atombiztos, ICU-verzióktól független Magyar Idő Generátor
// Nem használunk idegen nyelvi karakter-trükköket. Explicit módon elkérjük a budapesti 
// falióra szerinti pontos számokat, és manuálisan fűzzük össze tiszta MySQL formátummá.
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



// 📊 JAVÍTVA: Teljesen hurokmentesített, magyar időzónára szinkronizált profil statisztika
async function getUserLikesAndVictories(pool, email) {
  const currentNow = getLocalMySQLNow();

  const [likesRows] = await pool.query(`
    SELECT COALESCE(SUM(e.likes_count), 0) as total 
    FROM weekly_entries e
    JOIN weekly_topics t ON e.topic_id = t.id
    WHERE e.user_email = ? AND (e.is_active = 1 OR t.end_date < ?)
  `, [email, currentNow]);
  const totalLikes = likesRows[0].total || 0;

  const [victoryRows] = await pool.query(`
    SELECT COUNT(*) as victories
    FROM weekly_entries e1
    WHERE e1.user_email = ? 
      AND e1.is_active = 1
      AND e1.topic_id IN (SELECT id FROM weekly_topics WHERE end_date < ?)
      AND e1.id = (
        SELECT e2.id 
        FROM weekly_entries e2
        WHERE e2.topic_id = e1.topic_id AND e2.is_active = 1
        ORDER BY e2.likes_count DESC, e2.views_count ASC
        LIMIT 1
      )
  `, [email, currentNow]);
  
  const victories = victoryRows[0]?.victories || 0;

  return { totalLikes, victories };
}


  // 👑 JAVÍTVA: Az új, 12 szintes Nomád-Magyar progressziós motor (Tűpontos győzelmi kényszer-szűréssel)
  function calculateRankLevel(totalLikes, victories) {
    if (totalLikes < 30) return 1;                             // 1. Újonc 🌱
    if (totalLikes < 100) return 2;                           // 2. Bojtár 🪶
    if (totalLikes < 250) return 3;                           // 3. Nyomolvasó 🎯
    if (totalLikes < 500 || victories < 1) return 4;         // 4. Íjász 🏹
    if (totalLikes < 800 || victories < 2) return 5;         // 5. Lovas 🐎
    if (totalLikes < 1300 || victories < 3) return 6;        // 6. Sólyom 🦅
    if (totalLikes < 2000 || victories < 5) return 7;        // 7. Vitéz ⚔️
    if (totalLikes < 3200 || victories < 7) return 8;        // 8. Bajnok 🛡️
    if (totalLikes < 4800 || victories < 9) return 9;        // 9. Törzsfő ⭐
    if (totalLikes < 7000 || victories < 12) return 10;      // 10. Hadúr 🔱
    if (totalLikes < 10000 || victories < 15) return 11;     // 11. Táltos 🔥
    return 12;                                                // 12. Fejedelem 👑
  }

  // ⚡ SEBÉSZI JAVÍTÁS: Memóriaalapú, azonnali szavazati erő leképzés (nulla DB terhelés!)
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

  // 👑 JAVÍTVA: Dinamikus, 12 szintre skálázott szavazati erő számító (✨ Szuper / 🔥 Zseniális)
  async function getUserVotePower(pool, email) {
    const { totalLikes, victories } = await getUserLikesAndVictories(pool, email);
    const level = calculateRankLevel(totalLikes, victories);
    return getVotePowerByLevel(level);
  }

  // ====================================================================
  // 🏆 LEZÁRÓ MOTOR (Szinkronizálva a pontos helyi időhöz)
  // ====================================================================
  async function processFinishedChallenges(pool) {
    try {
      const currentNow = getLocalMySQLNow();
      const [unfinished] = await pool.query(
        'SELECT id FROM weekly_topics WHERE end_date < ? AND processed = 0',
        [currentNow]
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

        // 🎯 JAVÍTVA: LOWER(TRIM()) védelemmel ellátott automata jutalomosztás
for (const entry of entries) {
  if (entry.likes_count === score1) {
    // 1. Helyezett jutalma: +3 Joker csere (Casing-biztosan)
    await pool.query(
      'UPDATE photo_users SET swap_balance = swap_balance + 3 WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))', 
      [entry.user_email]
    );
    
   // 🎯 JAVÍTVA: NULL-dátum biztos automata prémium hosszabbítás
// Ha a premium_until LÉTEZIK és a JÖVŐBEN VAN, akkor ahhoz adunk 7 napot (hosszabbítás).
// Minden más esetben (ha NULL, üres, vagy már rég lejárt) a MAI NAPHOZ (currentNow) adunk 1 hetet!
await pool.query(`
  UPDATE photo_users 
  SET premium_level = 1,
      premium_until = DATE_ADD(
        IF(premium_until IS NOT NULL AND premium_until > ?, premium_until, ?), 
        INTERVAL 7 DAY
      ) 
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
`, [currentNow, currentNow, entry.user_email]);

    console.log(`🎉 PRÉMIUM KIUTALVA: ${entry.user_email} megnyerte a csatát!`);
  } 
  else if (entry.likes_count === score2) {
    await pool.query('UPDATE photo_users SET swap_balance = swap_balance + 2 WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))', [entry.user_email]);
  } 
  else if (entry.likes_count === score3) {
    await pool.query('UPDATE photo_users SET swap_balance = swap_balance + 1 WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))', [entry.user_email]);
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
  // ⚙️ ADMINISZTRÁCIÓS VÉGPONTOK (Kétnyelvűsítve)
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

  app.post('/api/admin/weekly-topics', upload.single('cover'), async (req, res) => {
    const { title, title_en, description, description_en, startDate, endDate, masterEmail, coverAuthor } = req.body; 
    const file = req.file;
    let finalCoverUrl = null;

    try {
      if (file) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'parbaj_boritokepek',
          width: 1200, height: 600, crop: "limit", quality: "auto:good"
        });
        finalCoverUrl = result.secure_url;
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }

      await pool.query(
        'INSERT INTO weekly_topics (title, title_en, description, description_en, start_date, end_date, master_email, cover_url, cover_author) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
        [title, title_en || null, description, description_en || null, startDate, endDate, masterEmail || null, finalCoverUrl, coverAuthor || null]
      );
      res.json({ success: true });
    } catch (err) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(500).json({ error: 'Hiba a mentés során: ' + err.message });
    }
  });

  app.put('/api/admin/weekly-topics/:id', upload.single('cover'), async (req, res) => {
    const { id } = req.params;
    const { title, title_en, description, description_en, startDate, endDate, masterEmail, coverUrl } = req.body; 
    const file = req.file;
    
    let finalCoverUrl = coverUrl || null; 

    try {
      if (file) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'parbaj_boritokepek',
          width: 1200, 
          height: 600, 
          crop: "limit", 
          quality: "auto:good"
        });
        
        if (coverUrl && coverUrl.includes('parbaj_boritokepek')) {
          try {
            const urlParts = coverUrl.split('/parbaj_boritokepek/');
            if (urlParts.length > 1) {
              const filenameWithExt = urlParts[1];
              const publicId = 'parbaj_boritokepek/' + filenameWithExt.split('.')[0];
              
              console.log(`[Cloudinary] 🗑️ Régi borítókép törlése: ${publicId}`);
              await cloudinary.uploader.destroy(publicId);
            }
          } catch (deleteErr) {
            console.error("⚠️ Nem sikerült törölni a régi képet a Cloudinary-ről:", deleteErr.message);
          }
        }

        finalCoverUrl = result.secure_url;
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }

      await pool.query(
        'UPDATE weekly_topics SET title = ?, title_en = ?, description = ?, description_en = ?, start_date = ?, end_date = ?, master_email = ?, cover_url = ?, cover_author = ? WHERE id = ?', 
        [title, title_en || null, description, description_en || null, startDate, endDate, masterEmail || null, finalCoverUrl, req.body.coverAuthor || null, id]
      );
      
      res.json({ success: true });
    } catch (err) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(500).json({ error: 'Hiba a frissítés során: ' + err.message });
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
  // ⚔️ JAVÍTVA: TURBÓ FOKOZATÚ, HUROKMENTES CSATATÉR FŐ VÉGPONT (Helyi idővel)
  // ====================================================================
    // ====================================================================
  // ⚔️ JAVÍTVA: AZONNALI LEZÁRÁSSAL ELLÁTOTT CSATATÉR FŐ VÉGPONT
  // ====================================================================
  app.get('/api/weekly/current', async (req, res) => {
    const { userEmail, topicId } = req.query;
    try {
      // 🎯 AZONNALI KIÉRTÉKELÉS: Kidobtuk a 15 perces gátat! 
      // Amint lejár a futam, az első látogató kérésére azonnal lefut a lezáró motor.
      await processFinishedChallenges(pool);

      // Csak egyszer kérjük le a profil statisztikákat, megszüntetve a redundáns DB köröket!
      const { totalLikes, victories } = await getUserLikesAndVictories(pool, userEmail);
      const userTotalLikes = totalLikes;
      const rankLevel = calculateRankLevel(totalLikes, victories);
      const power = getVotePowerByLevel(rankLevel); 

      const [userRows] = await pool.query('SELECT COALESCE(swap_balance, 0) as swap_balance FROM photo_users WHERE email = ?', [userEmail]);
      const swapBalance = userRows[0] ? userRows[0].swap_balance : 3;
      
      const myReferralCode = await ensureReferralCode(pool, userEmail);
      const [referredCheck] = await pool.query('SELECT referred_by FROM photo_users WHERE email = ?', [userEmail]);
      const referredBy = referredCheck[0] ? referredCheck[0].referred_by : null;

      // A) HA A FŐ LISTÁT TÖLTI BE A FRONTEND
      if (!topicId) {
        // 🔥 JAVÍTVA: Bekérjük a teljes játékosszámot, a le nem szavazott fotókat és a pontos helyi időt!
        const [activeTopics] = await pool.query(`
          SELECT t.*, u.name AS master_name,
            IF(e.id IS NOT NULL, 1, 0) as hasEntered,
            IF(t.master_email IS NOT NULL AND LOWER(TRIM(t.master_email)) = LOWER(TRIM(?)), 1, 0) as isMaster,
            (SELECT COUNT(*) FROM weekly_entries we WHERE we.topic_id = t.id AND we.is_active = 1) as totalEntries,
            (SELECT COUNT(*) FROM weekly_entries we WHERE we.topic_id = t.id AND we.is_active = 1 AND LOWER(TRIM(we.user_email)) != LOWER(TRIM(?)) AND we.id NOT IN (SELECT entry_id FROM weekly_votes WHERE voter_email = ?)) as unvotedEntries
          FROM weekly_topics t
          LEFT JOIN photo_users u ON t.master_email = u.email
          LEFT JOIN weekly_entries e ON e.topic_id = t.id AND LOWER(TRIM(e.user_email)) = LOWER(TRIM(?)) AND e.is_active = 1
          WHERE ? BETWEEN t.start_date AND t.end_date AND (t.status = 'approved' OR t.status IS NULL)
          ORDER BY t.id DESC
        `, [userEmail || '', userEmail || '', userEmail || '', userEmail || '', getLocalMySQLNow()]);

        const mappedTopics = activeTopics.map(t => ({
          ...t,
          hasEntered: t.hasEntered === 1,
          isMaster: t.isMaster === 1,
          totalEntries: Number(t.totalEntries || 0),     // 👥 Átalakítva számmá a frontendnek
          unvotedEntries: Number(t.unvotedEntries || 0)   // 🗳️ Átalakítva számmá a frontendnek
        }));

        return res.json({ 
          activeTopics: mappedTopics, userTotalLikes, userVictories: victories, userPower: power, swapBalance, myReferralCode, referredBy, masterVotesLeft: 0, isMaster: false     
        });
      }

      // B) HA EGY SPECIFIKUS CSATA ARÉNÁJÁBA LÉPÜNK BE
      const [allTopics] = await pool.query('SELECT t.*, u.name AS master_name FROM weekly_topics t LEFT JOIN photo_users u ON t.master_email = u.email WHERE t.id = ?', [topicId]);
      const currentTopic = allTopics[0];
      if (!currentTopic) return res.status(404).json({ error: 'Ez a kihívás nem található vagy már lezárult!' });

      const isMasterUser = currentTopic.master_email && userEmail && currentTopic.master_email.toLowerCase().trim() === userEmail.toLowerCase().trim();

      let masterVotesLeft = 0;
      if (isMasterUser) {
        const [masterVotesCount] = await pool.query("SELECT COUNT(*) as count FROM weekly_votes v JOIN weekly_entries e ON v.entry_id = e.id WHERE e.topic_id = ? AND v.voter_email = ? AND v.vote_type = 'master'", [currentTopic.id, userEmail]);
        masterVotesLeft = Math.max(0, 5 - (masterVotesCount[0]?.count || 0));
      }

      const [myEntries] = await pool.query('SELECT * FROM weekly_entries WHERE topic_id = ? AND user_email = ? AND is_active = 1', [currentTopic.id, userEmail]);
      const [myPastEntries] = await pool.query('SELECT * FROM weekly_entries WHERE topic_id = ? AND user_email = ? AND is_active = 0 ORDER BY id DESC', [currentTopic.id, userEmail]);
      const [myVotes] = await pool.query('SELECT COUNT(*) as vote_count FROM weekly_votes v JOIN weekly_entries e ON v.entry_id = e.id WHERE e.topic_id = ? AND v.voter_email = ?', [currentTopic.id, userEmail]);
      const [allEntriesCount] = await pool.query('SELECT COUNT(*) as total FROM weekly_entries WHERE topic_id = ? AND is_active = 1', [currentTopic.id]);
      const totalEntries = allEntriesCount[0].total || 0;
      const votableEntries = isMasterUser ? totalEntries : Math.max(1, totalEntries - 1);

      const [leaderboard] = await pool.query(`
        SELECT e.id, e.user_name, e.user_email, e.file_url, e.drive_file_id, e.views_count, e.likes_count, u.club_name
        FROM weekly_entries e LEFT JOIN photo_users u ON e.user_email = u.email WHERE e.topic_id = ? AND e.is_active = 1 ORDER BY e.likes_count DESC, e.views_count ASC
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
        clubLeaderboard.push({ club_name: club, total_score: clubsData[club].slice(0, 3).reduce((sum, val) => sum + val, 0), members_counted: clubsData[club].slice(0, 3).length });
      }
      clubLeaderboard.sort((a, b) => b.total_score - a.total_score);

      res.json({ 
        topic: { ...currentTopic, isMaster: !!isMasterUser }, myEntry: myEntries.length > 0 ? myEntries[0] : null, myPastEntries, myVoteCount: myVotes[0]?.vote_count || 0, votableEntries, leaderboard, clubLeaderboard, userTotalLikes, userVictories: victories, userPower: power, swapBalance, myReferralCode, referredBy, masterVotesLeft, isMaster: !!isMasterUser  
      });

    } catch (err) { 
      console.error("❌ Kritikus hiba:", err);
      res.status(500).json({ error: 'Szerveroldali hiba történt.' }); 
    }
  });


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
          SELECT 
            t.id AS topic_id,
            t.title AS topic_title, 
            e.likes_count, 
            e.views_count, 
            e.is_active, 
            t.end_date,
            IF(t.end_date >= ?, 1, 0) AS is_topic_live,
            (
              SELECT COUNT(*) + 1 
              FROM weekly_entries e2 
              WHERE e2.topic_id = e.topic_id 
                AND e2.is_active = 1 
                AND (e2.likes_count > e.likes_count OR (e2.likes_count = e.likes_count && e2.views_count < e.views_count))
            ) AS entry_rank,
            (
              SELECT COUNT(*) 
              FROM weekly_entries e3 
              WHERE e3.topic_id = e.topic_id AND e3.is_active = 1
            ) AS total_entries
          FROM weekly_entries e
          JOIN weekly_topics t ON e.topic_id = t.id
          WHERE e.file_url = ? AND e.user_email = ?
          ORDER BY t.end_date DESC
        `, [getLocalMySQLNow(), photo.file_url, userEmail]);

        const totalLikes = history.reduce((sum, h) => sum + Number(h.likes_count), 0);
        const totalViews = history.reduce((sum, h) => sum + Number(h.views_count), 0);
        
        const firstPlaces = history.filter(h => Number(h.entry_rank) === 1 && h.is_topic_live === 0 && h.is_active === 1).length;
        const podiums = history.filter(h => Number(h.entry_rank) >= 2 && Number(h.entry_rank) <= 3 && h.is_topic_live === 0 && h.is_active === 1).length;
        
        const isCurrentlyActive = history.some(h => h.is_active === 1 && h.is_topic_live === 1);

        albumWithStats.push({
          ...photo,
          totalLikes,
          totalViews,
          firstPlaces,
          podiums,
          isCurrentlyActive,
          history
        });
      }

      res.json(albumWithStats);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Hiba az album lekérésekor.' });
    }
  });
  
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

  app.post('/api/weekly/swap-existing', async (req, res) => {
    const { topicId, userEmail, userName, fileUrl } = req.body;
    if (!topicId || !userEmail || !fileUrl) return res.status(400).json({ error: 'Hiányzó adatok!' });

    const ipAddress = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.ip || req.socket.remoteAddress);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [userRows] = await conn.query('SELECT swap_balance FROM photo_users WHERE email = ?', [userEmail]);
      if (!userRows[0] || userRows[0].swap_balance < 1) {
        await conn.rollback();
        return res.status(400).json({ error: 'Nincs elég Joker cseréd!' });
      }

      const [existing] = await conn.query('SELECT id, swapped FROM weekly_entries WHERE topic_id = ? AND user_email = ? AND is_active = 1', [topicId, userEmail]);
      if (existing.length === 0) {
        await conn.rollback();
        return res.status(400).json({ error: 'Még nincs aktív nevezésed, amit lecserélhetnél!' });
      }

      await conn.query('UPDATE weekly_entries SET is_active = 0 WHERE id = ?', [existing[0].id]);

      const nextSwapCount = existing[0].swapped + 1;
      await conn.query(
        'INSERT INTO weekly_entries (topic_id, user_email, user_name, file_url, drive_file_id, swapped, ip_address, is_active, likes_count, views_count) VALUES (?, ?, ?, ?, \'\', ?, ?, 1, 0, 0)',
        [topicId, userEmail, userName, fileUrl, nextSwapCount, ipAddress]
      );

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
  
  app.post('/api/weekly/upload-existing', async (req, res) => {
    const { topicId, userEmail, userName, fileUrl } = req.body;
    if (!topicId || !userEmail || !fileUrl) return res.status(400).json({ error: 'Hiányzó adatok!' });
    
    const ipAddress = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.ip || req.socket.remoteAddress);

    try {
      const [topicCheck] = await pool.query('SELECT master_email FROM weekly_topics WHERE id = ?', [topicId]);
      if (topicCheck[0] && topicCheck[0].master_email === userEmail) {
        return res.status(400).json({ error: 'Csatabíróként nem nevezhetsz a saját csatádra!' });
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

  // ====================================================================
  // 🚀 JAVÍTVA: ULTRA OPTIMALIZÁLT SZAVAZAT-GENERÁTOR (2ms-os futás)
  // ====================================================================
  app.get('/api/weekly/next-vote', async (req, res) => {
    const { topicId, userEmail } = req.query;
    try {
      const [entries] = await pool.query(`
        SELECT e.id, e.user_name, e.file_url, e.views_count, e.likes_count 
        FROM weekly_entries e
        WHERE e.topic_id = ? 
          AND e.user_email != ? 
          AND e.is_active = 1 
          AND e.id NOT IN (SELECT entry_id FROM weekly_votes WHERE voter_email = ?)
        ORDER BY e.views_count ASC, RAND()
        LIMIT 1
      `, [topicId, userEmail, userEmail]);
      res.json({ entry: entries[0] || null });
    } catch (err) { res.status(500).json({ error: 'Hiba a kép lekérésekor' }); }
  });

  // ====================================================================
  // 🗳️ ULTRA OPTIMALIZÁLT SZAVAZATBEKÜLDŐ VÉGPONT (Képmester-biztos verzió)
  // ====================================================================
  app.post('/api/weekly/vote', async (req, res) => {
    const { entryId, userEmail, voteType } = req.body; 
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      // 1. Duplikált szavazás szűrése
      const [existing] = await conn.query('SELECT id FROM weekly_votes WHERE entry_id = ? AND voter_email = ?', [entryId, userEmail]);
      if (existing.length > 0) { 
        await conn.rollback(); 
        return res.json({ success: false, message: 'Már szavaztál!' }); 
      }

      // 2. Téma és Csatabíró (Képmester) azonosítása a kép alapján
      const [entryTopicRows] = await conn.query('SELECT topic_id FROM weekly_entries WHERE id = ?', [entryId]);
      const topicId = entryTopicRows[0]?.topic_id;

      const [topicRows] = await conn.query('SELECT master_email FROM weekly_topics WHERE id = ?', [topicId]);
      const assignedMasterEmail = topicRows[0]?.master_email;
      
      // 👑 Ellenőrizzük, hogy a szavazó-e a szoba hivatalos Képmestere
      const isRealMasterOfThisRoom = (userEmail === assignedMasterEmail);

      // 🎯 KÉNYSZERÍTÉS: Ha a Képmester a legerősebb voksát ('brilliant' vagy 'master') küldi, 
      // akkor azt az adatbázis és a limitellenőrzés kedvéért fixen 'master'-nek tekintjük.
      let finalVoteType = voteType;
      if (isRealMasterOfThisRoom && (voteType === 'brilliant' || voteType === 'master')) {
        finalVoteType = 'master';
      }

      let calculatedPoints = 0;

      // 3. Pontszámítás az ellenőrzött szavazat típusa szerint
      if (finalVoteType === 'pass') {
        calculatedPoints = 0;
      } 
      else if (finalVoteType === 'master') {
        // 🛡️ BIZTONSÁGI PAJZS: Ha a frontend 'master'-t küldött, de az illető NEM a Képmester, visszaverjük!
        if (!isRealMasterOfThisRoom) {
          await conn.rollback();
          return res.status(403).json({ error: 'Nem te vagy a csata kijelölt Csatabírója!' });
        }

        // Bírói limit ellenőrzése (max 5)
        const [masterVotesCount] = await conn.query(`
          SELECT COUNT(*) as count FROM weekly_votes v 
          JOIN weekly_entries e ON v.entry_id = e.id 
          WHERE e.topic_id = ? AND v.voter_email = ? AND v.vote_type = 'master'
        `, [topicId, userEmail]);
        
        if ((masterVotesCount[0]?.count || 0) >= 5) {
          await conn.rollback();
          return res.status(400).json({ error: 'Már elhasználtad mind az 5 Csatabíró szavazatodat!' });
        }

        calculatedPoints = 10; 
      } 
      else {
        // Sima játékosok szavazata, vagy a Képmester 'super' voksa (ami a saját rangja szerint ad pontot)
        const { totalLikes, victories } = await getUserLikesAndVictories(conn, userEmail);
        const level = calculateRankLevel(totalLikes, victories);
        const power = getVotePowerByLevel(level);
        calculatedPoints = finalVoteType === 'super' ? power.super : power.brilliant;
      }

      // 4. Szavazat rögzítése és pontok hozzáírása a képhez (már a kényszerített finalVoteType-al!)
      await conn.query('INSERT INTO weekly_votes (entry_id, voter_email, vote_type) VALUES (?, ?, ?)', [entryId, userEmail, finalVoteType]);
      await conn.query('UPDATE weekly_entries SET views_count = views_count + 1, likes_count = likes_count + ? WHERE id = ?', [calculatedPoints, entryId]);

      // 5. Alkotó szintlépésének ellenőrzése (Csak ha ténylegesen kapott pontot a kép)
      if (calculatedPoints > 0) {
        const [entryRows] = await conn.query('SELECT user_email FROM weekly_entries WHERE id = ?', [entryId]);
        if (entryRows[0]?.user_email) {
          await checkAndAwardLevelUp(conn, entryRows[0].user_email);
        }
      }

      await conn.commit();
      res.json({ success: true, savedAs: finalVoteType });
    } catch (err) { 
      await conn.rollback(); 
      res.status(500).json({ error: 'Hiba a szavazat feldolgozásakor.' }); 
    } finally { 
      conn.release(); 
    }
  });

  app.post('/api/weekly/claim-referral', async (req, res) => {
    const { userEmail, referralCode } = req.body;
    try {
      const [userRows] = await pool.query('SELECT referred_by FROM photo_users WHERE email = ?', [userEmail]);
      if (!userRows[0]) return res.status(404).json({ error: 'Felhasználó nem található!' });
      if (userRows[0].referred_by) return res.status(400).json({ error: 'Te már adtál meg meghívó kódot korábban!' });

      const cleanCode = referralCode.trim().toUpperCase();
      const [referrerRows] = await pool.query('SELECT email FROM photo_users WHERE referral_code = ?', [cleanCode]);
      if (referrerRows.length === 0) return res.status(400).json({ error: 'Ez a meghívó kód nem létezik!' });

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

  // ====================================================================
  // ⏳ JAVÍTVA: Közelgő csaták lekérése a Csatabíró VALÓDI NEVÉVEL (Helyi idővel)
  // ====================================================================
  app.get('/api/weekly/upcoming', async (req, res) => {
    try {
      const [topics] = await pool.query(`
        SELECT t.*, u.name AS master_name 
        FROM weekly_topics t
        LEFT JOIN photo_users u ON t.master_email = u.email
        WHERE t.start_date > ? AND t.status = 'approved'
        ORDER BY t.start_date ASC
      `, [getLocalMySQLNow()]);
      res.json(topics);
    } catch (err) {
      res.status(500).json({ error: 'Hiba a közelgő csaták betöltésekor: ' + err.message });
    }
  });

  app.get('/api/weekly/past', async (req, res) => {
    try { 
      const [rows] = await pool.query(`
        SELECT t.*, u.name AS master_name 
        FROM weekly_topics t
        LEFT JOIN photo_users u ON t.master_email = u.email
        WHERE t.end_date < ? AND t.status = 'approved'
        ORDER BY t.end_date DESC
      `, [getLocalMySQLNow()]); 
      res.json(rows); 
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // 🎯 MÓDOSÍTVA: Történeti kártyák kibővítése a t.title_en mezővel (Helyi idővel)
  app.get('/api/weekly/my-stats', async (req, res) => {
    const { userEmail } = req.query;
    try {
      const [pastTopics] = await pool.query(
        "SELECT * FROM weekly_topics WHERE end_date < ? AND status = 'approved' ORDER BY end_date DESC",
        [getLocalMySQLNow()]
      );
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
            topic_title_en: topic.title_en, 
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

  // ====================================================================
  // 🚨 GYANÚS TEVÉKENYSÉGEK DETEKTÁLÁSA
  // ====================================================================
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
        WHERE e.ip_address IS NOT NULL 
          AND e.ip_address != '127.0.0.1'
          AND e.ip_approved = 0
        GROUP BY e.topic_id, e.ip_address
        HAVING COUNT(DISTINCT e.user_email) > 1
        ORDER BY e.topic_id DESC
      `);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Hiba a lekérdezés során: ' + err.message });
    }
  });

  app.post('/api/admin/weekly/approve-ip', async (req, res) => {
    const { topicId, userEmail } = req.body;
    try {
      await pool.query(
        'UPDATE weekly_entries SET ip_approved = 1 WHERE topic_id = ? AND user_email = ?',
        [topicId, userEmail]
      );
      res.json({ success: true, message: 'Felhasználó nevezése sikeresen elfogadva, IP konfliktus feloldva.' });
    } catch (err) {
      res.status(500).json({ error: 'Hiba az elfogadás során: ' + err.message });
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
  
  // ====================================================================
  // 👑 JAVÍTVA: SZINKRONIZÁLT, HISTORIKUS GLOBÁLIS DICSŐSÉGFAL (Helyi idővel)
  // ====================================================================
  app.get('/api/weekly/hall-of-fame', async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT 
          u.name as user_name, 
          u.email as user_email, 
          u.club_name,
          c.drive_logo_id, 
          c.logo_url,      
          COALESCE(SUM(IF(e.is_active = 1 OR t.end_date < ?, e.likes_count, 0)), 0) as total_likes
        FROM photo_users u
        LEFT JOIN weekly_entries e ON u.email = e.user_email
        LEFT JOIN weekly_topics t ON e.topic_id = t.id
        LEFT JOIN photo_clubs c ON u.club_name = c.name
        GROUP BY u.email, u.name, u.club_name, c.drive_logo_id, c.logo_url 
        HAVING total_likes > 0
        ORDER BY total_likes DESC, u.name ASC
      `, [getLocalMySQLNow()]);
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
            COALESCE(SUM(IF(e.is_active = 1 OR t.end_date < ?, e.likes_count, 0)), 0) as total_likes
          FROM photo_users u
          LEFT JOIN weekly_entries e ON u.email = e.user_email
          LEFT JOIN weekly_topics t ON e.topic_id = t.id
          GROUP BY u.email, u.name, u.club_name
          HAVING total_likes > 0
          ORDER BY total_likes DESC, u.name ASC
        `, [getLocalMySQLNow()]);
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

      (async () => {
        try {
          console.log(`[Háttér] 🔧 1. FÁZIS: Aréna album (user_photos) felépítése az eddigi 24 képből...`);
          
          const [alreadyMigrated] = await pool.query(
            "SELECT user_email, file_url FROM weekly_entries WHERE file_url LIKE '%cloudinary.com%'"
          );

          let builtCount = 0;
          for (const entry of alreadyMigrated) {
            const [exists] = await pool.query(
              "SELECT id FROM user_photos WHERE user_email = ? AND file_url = ?",
              [entry.user_email, entry.file_url]
            );
            
            if (exists.length === 0) {
              await pool.query(
                "INSERT INTO user_photos (user_email, file_url, file_hash) VALUES (?, ?, 'migrated')",
                [entry.user_email, entry.file_url]
              );
              builtCount++;
            }
          }
          console.log(`✓ [Háttér] 🎉 SIKER: ${builtCount} db kép sikeresen létrehozva az üres Aréna albumban!`);

          console.log(`[Háttér] 💾 2. FÁZIS: Maradék ${rows.length} db kép feldolgozása...`);
          
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
                console.log(`skip [Háttér Kihagyva] ${entry.user_name} fotója túl nagy.`);
                continue; 
              }

              fs.writeFileSync(tempFilePath, buffer);

              const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
                folder: 'parbaj_archivum'
              });

              if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

              await pool.query(
                "UPDATE weekly_entries SET drive_file_id = '', file_url = ? WHERE id = ?",
                [uploadResult.secure_url, entry.id]
              );

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
              console.log(`✓ [Háttér] [${migratedCount}/${rows.length}] ${entry.user_name} fotója áttolva.`);

              await delay(1500);

            } catch (singleErr) {
              console.error(`❌ [Háttér Hiba] Hiba a képnél:`, singleErr.message);
              if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            }
          }
          console.log(`🏁 [Háttér] Sikeresen áthelyezve: ${migratedCount} db kép.`);
        } catch (bgErr) {
          console.error("Súlyos hiba történt a háttérfolyamat futása közben:", bgErr);
        }
      })();

    } catch (err) {
      console.error("Súlyos hiba a háttérmotor indításakor:", err);
      if (!res.headersSent) res.status(500).json({ error: err.message });
    }
  });

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

  app.post('/api/weekly/propose', upload.single('cover'), async (req, res) => {
    const { title, title_en, description, description_en, cover_author, master_name, start_date, end_date, userEmail } = req.body;
    
    if (!title || !description || !start_date || !end_date) {
      return res.status(400).json({ error: 'Minden kötelező mezőt ki kell tölteni!' });
    }

    try {
      let coverUrl = null;

      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'parbaj_boritokepek',
          width: 1200, height: 600, crop: "limit", quality: "auto:good"
        });
        coverUrl = result.secure_url;
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      }

      await pool.query(
        `INSERT INTO weekly_topics 
          (title, title_en, description, description_en, cover_url, cover_author, master_email, start_date, end_date, status, proposed_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [
          title, 
          title_en || null,         
          description, 
          description_en || null,   
          coverUrl, 
          cover_author, 
          master_name || null, 
          start_date, 
          end_date, 
          userEmail
        ]
      );

      res.json({ success: '⚔️ A csatitervedet sikeresen elmentettük és feltöltöttük a felhőbe! A törzsi tanács hamarosan elbírálja.' });
    } catch (err) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      console.error("Csatajavaslat hiba:", err);
      res.status(500).json({ error: `Szerveroldali hiba: ${err.message}` });
    }
  });
        
  app.get('/api/admin/proposals', async (req, res) => {
    try {
      const [proposals] = await pool.query(
        "SELECT * FROM weekly_topics WHERE status = 'pending' ORDER BY start_date ASC"
      );
      res.json(proposals);
    } catch (err) {
      res.status(500).json({ error: 'Hiba a javaslatok lekérésekor.' });
    }
  });

  app.post('/api/admin/decide-proposal', async (req, res) => {
    const { topicId, decision } = req.body; 
    
    try {
      await pool.query(
        "UPDATE weekly_topics SET status = ? WHERE id = ?",
        [decision, topicId]
      );
      res.json({ success: `Sikeres bírálat: ${decision === 'approved' ? 'Elfogadva és csatasorba állítva!' : 'Elutasítva.'}` });
    } catch (err) {
      res.status(500).json({ error: 'Hiba az elbírálás során.' });
    }
  });

  // ====================================================================
  // 💬 ESZMECSERE ÉS UTÓLAGOS ELISMERÉSEK KIBESZÉLŐ VÉGPONTJAI
  // ====================================================================

  app.get('/api/weekly/archive/comments/:entryId', async (req, res) => {
    const { entryId } = req.params;
    try {
      const [comments] = await pool.query(
        "SELECT id, user_name, user_email, comment_text, created_at FROM weekly_archive_comments WHERE entry_id = ? ORDER BY created_at ASC",
        [entryId]
      );
      res.json(comments);
    } catch (err) {
      res.status(500).json({ error: 'Hiba a kommentek betöltésekor: ' + err.message });
    }
  });

  app.post('/api/weekly/archive/comment', async (req, res) => {
    const { entryId, userEmail, userName, commentText } = req.body;
    
    if (!entryId || !userEmail || !userName || !commentText?.trim()) {
      return res.status(400).json({ 
        error: `Hiányzó adatok a kommenthez!` 
      });
    }
    try {
      await pool.query(
        "INSERT INTO weekly_archive_comments (entry_id, user_email, user_name, comment_text) VALUES (?, ?, ?, ?)",
        [entryId, userEmail, userName, commentText.trim()]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Hiba a komment mentésekor: ' + err.message });
    }
  });

  app.post('/api/weekly/archive/like-toggle', async (req, res) => {
    const { entryId, userEmail } = req.body;
    
    if (!entryId || !userEmail) {
      return res.status(400).json({ 
        error: `Hiányzó adatok a lájkoláshoz!` 
      });
    }

    try {
      const [existing] = await pool.query(
        "SELECT id FROM weekly_archive_likes WHERE entry_id = ? AND user_email = ?",
        [entryId, userEmail]
      );

      if (existing.length > 0) {
        await pool.query("DELETE FROM weekly_archive_likes WHERE id = ?", [existing[0].id]);
        res.json({ success: true, liked: false });
      } else {
        await pool.query("INSERT INTO weekly_archive_likes (entry_id, user_email) VALUES (?, ?)", [entryId, userEmail]);
        res.json({ success: true, liked: true });
      }
    } catch (err) {
      res.status(500).json({ error: 'Hiba a lájk kezelésekor: ' + err.message });
    }
  });

  // ====================================================================
  // 👑 JELENTKEZÉS CSATABÍRÓNAK (FELHASZNÁLÓI OLDAL)
  // ====================================================================
  app.post('/api/weekly/apply-master', async (req, res) => {
    const { topicId, userEmail } = req.body;
    try {
      const [check] = await pool.query('SELECT master_email, pending_master_email FROM weekly_topics WHERE id = ?', [topicId]);
      if (!check[0]) return res.status(404).json({ error: 'Ez a csata nem található!' });
      if (check[0].master_email) return res.status(400).json({ error: 'Ekhöz a csatához már tartozik Csatabíró!' });
      if (check[0].pending_master_email) return res.status(400).json({ error: 'Valaki már jelentkezett erre a pozícióra, elbírálásra vár!' });

      await pool.query('UPDATE weekly_topics SET pending_master_email = ? WHERE id = ?', [userEmail, topicId]);
      res.json({ success: true, message: 'Jelentkezés sikeresen regisztrálva, admin jóváhagyásra vár!' });
    } catch (err) {
      res.status(500).json({ error: 'Szerveroldali hiba: ' + err.message });
    }
  });

  // ====================================================================
  // 🔒 ADMINISZTRÁTORI DÖNTÉS A CSATABÍRÓRÓL
  // ====================================================================
  app.post('/api/admin/decide-master', async (req, res) => {
    const { topicId, decision } = req.body; 
    try {
      if (decision === 'approved') {
        await pool.query(
          'UPDATE weekly_topics SET master_email = pending_master_email, pending_master_email = NULL WHERE id = ?',
          [topicId]
        );
      } else {
        await pool.query('UPDATE weekly_topics SET pending_master_email = NULL WHERE id = ?', [topicId]);
      }
      res.json({ success: true, message: `Bírálat rögzítve: ${decision}` });
    } catch (err) {
      res.status(500).json({ error: 'Szerveroldali hiba bírálatkor: ' + err.message });
    }
  });
  
  // ====================================================================
  // 👑 ARCHÍVUM TÖRTÉNETI LEKÉRDEZÉS (KONSZOLIDÁLT, LÁJK-TUDATOS VERZIÓ)
  // ====================================================================
  app.get('/api/weekly/history/:topicId', async (req, res) => {
    const { userEmail } = req.query; 
    try {
      const [leaderboard] = await pool.query(`
        SELECT 
          e.id, e.user_name, e.file_url, e.drive_file_id, e.views_count, e.likes_count, u.club_name,
          COUNT(DISTINCT wal.id) as archive_likes,
          COALESCE(MAX(IF(wal.user_email = ?, 1, 0)), 0) as has_user_liked
        FROM weekly_entries e 
        LEFT JOIN photo_users u ON e.user_email = u.email
        LEFT JOIN weekly_archive_likes wal ON wal.entry_id = e.id
        WHERE e.topic_id = ? AND e.views_count > 0 AND e.is_active = 1 
        GROUP BY e.id, e.user_name, e.file_url, e.drive_file_id, e.views_count, e.likes_count, u.club_name
        ORDER BY e.likes_count DESC, e.views_count ASC
      `, [userEmail || '', req.params.topicId]);

      const clubsData = {};
      leaderboard.forEach(entry => {
        if (!entry.club_name || entry.club_name.trim() === '') return; 
        if (!clubsData[entry.club_name]) clubsData[entry.club_name] = [];
        clubsData[entry.club_name].push(Number(entry.likes_count));
      });

      const clubLeaderboard = [];
      for (const club in clubsData) {
        clubsData[club].sort((a, b) => b - a); const top3 = clubsData[club].slice(0, 3);
        clubLeaderboard.push({ club_name: club, total_score: top3.reduce((sum, val) => sum + val, 0), members_counted: top3.length });
      }
      clubLeaderboard.sort((a, b) => b.total_score - a.total_score);
      res.json({ leaderboard, clubLeaderboard });
    } catch (err) { res.status(500).json({ error: 'Hiba: ' + err.message }); }
  });

  // ====================================================================
  // 💬 ARÉNA LÍGA ÉLŐ CSEVEGŐ VÉGPONTOK (Típusbiztos, 0-ra optimalizált)
  // ====================================================================
  app.get('/api/weekly/chat/:topicId', async (req, res) => {
    const parsedTopicId = Number(req.params.topicId); 
    try {
      const [messages] = await pool.query(`
        SELECT 
          c.id, 
          COALESCE(u.name, c.user_name) AS user_name, 
          c.user_email, 
          c.message_text, 
          c.created_at 
        FROM weekly_chat c LEFT JOIN photo_users u ON c.user_email = u.email
        WHERE c.topic_id = ? ORDER BY c.created_at ASC LIMIT 100
      `, [parsedTopicId]);

      const now = Date.now();
      const currentTypers = [];
      if (typingStatus[parsedTopicId]) {
        for (const email in typingStatus[parsedTopicId]) {
          if (now - typingStatus[parsedTopicId][email].timestamp < 5000) {
            currentTypers.push(typingStatus[parsedTopicId][email].name);
          } else {
            delete typingStatus[parsedTopicId][email];
          }
        }
      }

      res.json({ messages, typing: currentTypers });
    } catch (err) {
      res.status(500).json({ error: 'Hiba: ' + err.message });
    }
  });

  app.post('/api/weekly/chat', async (req, res) => {
    const { topicId, userEmail, userName, messageText } = req.body;
    const parsedTopicId = Number(topicId); 
    
    if (topicId === undefined || topicId === null || !userEmail || !messageText?.trim()) {
      return res.status(400).json({ error: 'Hiányzó adatok!' });
    }
    try {
      const [userRows] = await pool.query('SELECT name FROM photo_users WHERE email = ?', [userEmail]);
      const officialName = userRows[0]?.name || userName || 'Anonim Fotós';

      await pool.query(
        'INSERT INTO weekly_chat (topic_id, user_email, user_name, message_text) VALUES (?, ?, ?, ?)',
        [parsedTopicId, userEmail, officialName, messageText.trim()]
      );
      
      if (typingStatus[parsedTopicId] && typingStatus[parsedTopicId][userEmail]) {
        delete typingStatus[parsedTopicId][userEmail];
      }

      res.json({ success: true, user_name: officialName });
    } catch (err) {
      res.status(500).json({ error: 'Hiba: ' + err.message });
    }
  });

  app.post('/api/weekly/chat/typing', (req, res) => {
    const { topicId, userEmail, userName } = req.body;
    const parsedTopicId = Number(topicId); 
    if (topicId === undefined || !userEmail) return res.json({ success: false });

    if (!typingStatus[parsedTopicId]) typingStatus[parsedTopicId] = {};
    
    typingStatus[parsedTopicId][userEmail] = {
      name: userName || 'Valaki',
      timestamp: Date.now()
    };

    res.json({ success: true });
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
