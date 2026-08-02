const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const fs = require('fs');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kovari.rudolf@gmail.com";

// ISO-8601 szerinti év hete számító függvény
function getISOWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

// ====================================================================
// 🔒 AUTH MIDDLEWARE
// ====================================================================
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Hozzáférés megtagadva! Nincs token.' });
    }

    const token = authHeader.split(' ')[1];
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'Érvénytelen token.' });
    }

    req.user = {
      email: payload.email,
      name: payload.name,
      isAdmin: payload.email === ADMIN_EMAIL
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Lejárt vagy érvénytelen munkamenet!' });
  }
}

// ====================================================================
// 📊 VALÓDI RANGSOR ÉS PONTSZÁM KISZÁMÍTÓ FÜGGVÉNY A FORDULÓHOZ
// ====================================================================
async function calculateRoundRanks(pool, roundId) {
  const [entries] = await pool.query(
    `SELECT 
      e.*,
      c.title as course_title, c.price as course_price, c.location_detail as course_location_detail,
      COALESCE(r_member.avg_member_score, 0) as avg_member_score,
      COALESCE(r_master.avg_master_score, 0) as avg_master_score
     FROM club_review_entries e
     LEFT JOIN photo_club_courses c ON e.ai_suggested_course_id = c.id
     LEFT JOIN (
       SELECT entry_id, AVG(score) as avg_member_score 
       FROM club_review_ratings WHERE evaluator_role = 'member' GROUP BY entry_id
     ) r_member ON e.id = r_member.entry_id
     LEFT JOIN (
       SELECT entry_id, AVG(score) as avg_master_score 
       FROM club_review_ratings WHERE evaluator_role = 'master' GROUP BY entry_id
     ) r_master ON e.id = r_master.entry_id
     WHERE e.round_id = ?`,
    [roundId]
  );

  if (!entries || entries.length === 0) return [];

  const totalCount = entries.length;

  // 1. Klubtagok szerinti sorrend
  const memberSorted = [...entries].sort((a, b) => Number(b.avg_member_score) - Number(a.avg_member_score));
  const memberRankMap = new Map();
  memberSorted.forEach((item, idx) => memberRankMap.set(item.id, idx + 1));

  // 2. Mesterek szerinti sorrend
  const masterSorted = [...entries].sort((a, b) => Number(b.avg_master_score) - Number(a.avg_master_score));
  const masterRankMap = new Map();
  masterSorted.forEach((item, idx) => masterRankMap.set(item.id, idx + 1));

  // 3. AI szerinti sorrend
  const aiSorted = [...entries].sort((a, b) => Number(b.ai_score) - Number(a.ai_score));
  const aiRankMap = new Map();
  aiSorted.forEach((item, idx) => aiRankMap.set(item.id, idx + 1));

  // 4. Összesített pontszám számítása a dobogóhoz (0-100-as skálára hozva mindhármat)
  const ranked = entries.map(entry => {
    const normMember = (Number(entry.avg_member_score) / 2) * 100;
    const normMaster = (Number(entry.avg_master_score) / 10) * 100;
    const normAi = Number(entry.ai_score) || 0;
    const combinedScore = (normMember + normMaster + normAi) / 3;

    return {
      ...entry,
      totalEntriesCount: totalCount,
      memberRank: memberRankMap.get(entry.id) || totalCount,
      masterRank: masterRankMap.get(entry.id) || totalCount,
      aiRank: aiRankMap.get(entry.id) || totalCount,
      combinedScore
    };
  });

  // Összesített sorrend
  const overallSorted = [...ranked].sort((a, b) => b.combinedScore - a.combinedScore);
  const overallRankMap = new Map();
  overallSorted.forEach((item, idx) => overallRankMap.set(item.id, idx + 1));

  return ranked.map(entry => ({
    ...entry,
    overallRank: overallRankMap.get(entry.id) || totalCount
  }));
}

module.exports = function(app, pool, drive, upload, cleanupTempFile, genAI) {

  // ====================================================================
  // 👑 0. MESTER TITULUS KAPCSOLÁSA
  // ====================================================================
  app.post('/api/club/toggle-master', requireAuth, async (req, res) => {
    const { targetEmail, isMaster } = req.body;
    try {
      const [[userDb]] = await pool.query('SELECT club_name, club_role FROM photo_users WHERE email = ?', [req.user.email]);
      
      if (!req.user.isAdmin && (!userDb || !['leader', 'deputy'].includes(userDb.club_role))) {
        return res.status(403).json({ error: 'Csak a klubvezetők és adminisztrátorok ítélhetik oda a Mester címet.' });
      }

      await pool.query(
        'UPDATE photo_users SET is_master = ? WHERE email = ? AND (club_name = ? OR ?)',
        [isMaster ? 1 : 0, targetEmail, userDb ? userDb.club_name : '', req.user.isAdmin ? 1 : 0]
      );

      res.json({ success: true, message: 'Mester titulus sikeresen frissítve!' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ====================================================================
  // 📚 1. KLUB TANFOLYAMOK KEZELÉSE (CRUD)
  // ====================================================================
  app.get('/api/club-courses', requireAuth, async (req, res) => {
    try {
      const [[userDb]] = await pool.query('SELECT club_name FROM photo_users WHERE email = ?', [req.user.email]);
      if (!userDb || !userDb.club_name) {
        return res.status(400).json({ error: 'Nem tartozol egyetlen fotóklubhoz sem.' });
      }

      const [courses] = await pool.query(
        'SELECT * FROM photo_club_courses WHERE club_name = ? AND is_active = 1 ORDER BY created_at DESC',
        [userDb.club_name]
      );
      res.json(courses);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/club-courses', requireAuth, async (req, res) => {
    const { title, description, instructor, price, locationType, locationDetail, errorCategory } = req.body;
    try {
      const [[userDb]] = await pool.query('SELECT club_name, club_role FROM photo_users WHERE email = ?', [req.user.email]);
      if (!req.user.isAdmin && (!userDb || !['leader', 'deputy'].includes(userDb.club_role))) {
        return res.status(403).json({ error: 'Csak a klubvezetők hozhatnak létre tanfolyamot.' });
      }

      await pool.query(
        `INSERT INTO photo_club_courses 
         (club_name, title, description, instructor, price, location_type, location_detail, error_category) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userDb.club_name, title, description, instructor, price || 'Ingyenes', locationType || 'online', locationDetail, errorCategory || 'general']
      );

      res.json({ success: true, message: 'Tanfolyam sikeresen létrehozva!' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/club-courses/:id', requireAuth, async (req, res) => {
    try {
      const [[userDb]] = await pool.query('SELECT club_name, club_role FROM photo_users WHERE email = ?', [req.user.email]);
      if (!req.user.isAdmin && (!userDb || !['leader', 'deputy'].includes(userDb.club_role))) {
        return res.status(403).json({ error: 'Nincs jogosultságod a törléshez.' });
      }

      await pool.query('UPDATE photo_club_courses SET is_active = 0 WHERE id = ? AND club_name = ?', [req.params.id, userDb.club_name]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ====================================================================
  // 📜 2. KLUB ÖSSZES FORDULÓJÁNAK LEKÉRÉSE
  // ====================================================================
  app.get('/api/club-review/rounds', requireAuth, async (req, res) => {
    try {
      const [[userDb]] = await pool.query('SELECT club_name FROM photo_users WHERE email = ?', [req.user.email]);
      if (!userDb || !userDb.club_name) {
        return res.status(400).json({ error: 'Nem vagy tagja fotóklubnak.' });
      }

      const [rounds] = await pool.query(
        'SELECT * FROM club_review_rounds WHERE club_name = ? ORDER BY id DESC',
        [userDb.club_name]
      );

      res.json(rounds);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ====================================================================
  // 🗓️ 3. AKTUÁLIS FORDULÓ LEKÉRÉSE / AUTOMATIKUS INDÍTÁSA
  // ====================================================================
  app.get('/api/club-review/active-round', requireAuth, async (req, res) => {
    try {
      const [[userDb]] = await pool.query('SELECT club_name, club_role, is_master, is_premium, premium_level FROM photo_users WHERE email = ?', [req.user.email]);
      if (!userDb || !userDb.club_name) {
        return res.status(400).json({ error: 'Nem vagy tagja fotóklubnak.' });
      }

      const now = new Date();

      await pool.query(
        'UPDATE club_review_rounds SET status = "closed" WHERE club_name = ? AND rating_deadline < ? AND status != "closed"',
        [userDb.club_name, now]
      );

      let [rounds] = await pool.query(
        'SELECT * FROM club_review_rounds WHERE club_name = ? AND upload_deadline >= ? ORDER BY id DESC LIMIT 1',
        [userDb.club_name, now]
      );

      let round = rounds[0];

      if (!round) {
        const nextSun = new Date(now);
        nextSun.setDate(now.getDate() + ((7 - now.getDay()) % 7));
        nextSun.setHours(23, 59, 59, 999);

        const nextWed = new Date(nextSun);
        nextWed.setDate(nextSun.getDate() + 3);

        const weekNum = getISOWeekNumber(now);
        const weekTitle = `${now.getFullYear()} / ${weekNum}. hét - Heti Képértékelő`;

        const [ins] = await pool.query(
          `INSERT INTO club_review_rounds (club_name, title, upload_deadline, rating_deadline, status) 
           VALUES (?, ?, ?, ?, 'active')`,
          [userDb.club_name, weekTitle, nextSun, nextWed]
        );

        const [[newRound]] = await pool.query('SELECT * FROM club_review_rounds WHERE id = ?', [ins.insertId]);
        round = newRound;
      }

      const isMasterUser = userDb.is_master === 1 || userDb.club_role === 'leader';

      res.json({ 
        round, 
        userRole: userDb.club_role, 
        isMaster: isMasterUser, 
        isPremium: userDb.is_premium 
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ====================================================================
  // 📸 4. KÉP FELTÖLTÉSE ÉS AI ELEMZÉS
  // ====================================================================
  app.post('/api/club-review/upload', requireAuth, upload.single('photo'), async (req, res) => {
    const { roundId, title } = req.body;

    if (!title || !req.file) {
      cleanupTempFile(req.file);
      return res.status(400).json({ error: 'Képfájl kiválasztása és cím megadása kötelező.' });
    }

    try {
      const [[userDb]] = await pool.query(
        'SELECT name, club_name, is_premium, premium_level FROM photo_users WHERE email = ?', 
        [req.user.email]
      );

      if (!userDb || !userDb.club_name) {
        cleanupTempFile(req.file);
        return res.status(400).json({ error: 'Csak klubtagok tölthetnek fel képet.' });
      }

      let targetRoundId = Number(roundId);
      const [[targetRound]] = await pool.query(
        'SELECT * FROM club_review_rounds WHERE id = ? AND club_name = ?',
        [targetRoundId, userDb.club_name]
      );

      if (!targetRound) {
        cleanupTempFile(req.file);
        return res.status(404).json({ error: 'A megadott forduló nem található.' });
      }

      if (new Date() > new Date(targetRound.upload_deadline)) {
        cleanupTempFile(req.file);
        return res.status(403).json({ error: 'Erre a fordulóra a képfeltöltési határidő (vasárnap éjfél) már lejárt!' });
      }

      const isPremium = Number(userDb.is_premium) === 1 || userDb.is_premium === true;
      const premLevel = Number(userDb.premium_level || 0);

      let maxUploads = 1;
      if (isPremium) {
        maxUploads = premLevel >= 2 ? 10 : 3;
      }

      const [[countRow]] = await pool.query(
        'SELECT COUNT(*) as uploadCount FROM club_review_entries WHERE round_id = ? AND user_email = ?',
        [targetRoundId, req.user.email]
      );

      const currentUploadCount = Number(countRow?.uploadCount || 0);

      if (currentUploadCount >= maxUploads) {
        cleanupTempFile(req.file);
        return res.status(403).json({ 
          error: `A csomagod alapján ezen a héten legfeljebb ${maxUploads} képet tölthetsz fel! (Feltöltve: ${currentUploadCount} db).` 
        });
      }

      const fileMetadata = { name: `${Date.now()}_${req.file.originalname}` };
      const media = { mimeType: req.file.mimetype, body: fs.createReadStream(req.file.path) };

      const driveRes = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id'
      });

      const driveFileId = driveRes.data.id;

      await drive.permissions.create({
        fileId: driveFileId,
        requestBody: { role: 'reader', type: 'anyone' }
      });

      const fileUrl = `https://lh3.googleusercontent.com/d/${driveFileId}`;

      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Data = imageBuffer.toString('base64');
      const mimeType = req.file.mimetype || 'image/jpeg';
      cleanupTempFile(req.file);

      let aiCategories = ['color'];
      let aiScore = 70;
      let aiFeedback = '';
      let suggestedCourseId = null;

      try {
        const [courses] = await pool.query(
          'SELECT id, title, error_category FROM photo_club_courses WHERE club_name = ? AND is_active = 1',
          [userDb.club_name]
        );

        const courseListText = courses.map(c => `ID: ${c.id}, Cím: "${c.title}", Kategória: ${c.error_category}`).join('\n');

        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `Elemezd ezt a fotót a hivatalos FIAP nemzetközi fotóművészeti szempontrendszer alapján!
        Kép címe: "${title}".
        
        Adott tanfolyamok a klubban:
        ${courseListText || 'Nincs elérhető tanfolyam.'}

        Adj vissza egy szigorú JSON objektumot az alábbi mezőkkel:
        {
          "categories": ["portrait", "color", "monochrome", "nature"],
          "score": 10 és 100 közötti egész szám (FIAP színvonal alapján),
          "critique": "Írj egy részletes, alapos és mélyenszántó szakmai elemzést 4-6 mondatban! Térj ki a kompozícióra, a fénykezelésre, a technikai megvalósításra (élesség, zaj, kontraszt), a képi hangulatra, emeld ki a fotó erősségeit és adj konkrét, konstruktív tanácsot arra, hogyan lehetne a fotót még jobbá tenni!",
          "suggestedCourseId": A fenti listából kiválasztott tanfolyam ID-ja, ami segítene kijavítani a kép hibáját (ha nincs találat, null),
          "suggestFiap": true VAGY false (Állítsd true-ra, ha a fotó művészi és technikai kivitelezése alapján valóban érdemes és jó eséllyel indulhatna nemzetközi FIAP fotószalonokon)
        }`;

        const result = await model.generateContent([
          prompt,
          { inlineData: { data: base64Data, mimeType } }
        ]);

        const aiData = JSON.parse(result.response.text());

        if (Array.isArray(aiData.categories) && aiData.categories.length > 0) {
          aiCategories = aiData.categories;
        } else if (aiData.category) {
          aiCategories = [aiData.category];
        }

        aiScore = Math.min(100, Math.max(10, Number(aiData.score) || 70));
        
        let fiapNotice = "";
        if (aiData.suggestFiap === true) {
          fiapNotice = " 🌟 Tipp: Ez a kép a szakmai és művészi színvonala alapján a FIAP nemzetközi szalonokon is jó eséllyel indulhatna! Próbáld ki a PhotAwesome FIAP modulját.";
        }

        const critiqueText = (aiData.critique && aiData.critique.length > 30)
          ? aiData.critique
          : `A "${title}" című fotó kifejezetten jó kompozíciós érzékről és megfontolt fénykezelésről tanúskodik. A kép vizuális egyensúlya jól működik, és hatásosan ragadja meg a néző figyelmét. Technikai szempontból a tónusok és az élesség finomhangolásával tovább erősíthető a képfőtéma kiemelése. Haladj tovább ezen a művészi vonalon!`;

        aiFeedback = critiqueText + fiapNotice;
        suggestedCourseId = aiData.suggestedCourseId || null;

      } catch (aiErr) {
        console.error("AI elemzési hiba:", aiErr.message);
        aiFeedback = `A "${title}" című fotó jó kompozíciós törekvésről és megfelelő fénykezelésről tanúskodik. A vizuális hatás fokozása érdekében érdemes kísérletezni a tónustartomány szélesítésével és a mikrokontrasztok kiemelésével a főtémán.`;
      }

      const aiCategoryString = aiCategories.join(',');

      const [ins] = await pool.query(
        `INSERT INTO club_review_entries 
         (round_id, club_name, user_email, user_name, title, file_url, drive_file_id, ai_category, ai_score, ai_feedback, ai_suggested_course_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [targetRoundId, userDb.club_name, req.user.email, userDb.name || req.user.name, title, fileUrl, driveFileId, aiCategoryString, aiScore, aiFeedback, suggestedCourseId]
      );

      res.json({ success: true, entryId: ins.insertId });
    } catch (err) {
      cleanupTempFile(req.file);
      res.status(500).json({ error: err.message });
    }
  });

  // ====================================================================
  // 🗳️ 5. PONTOZÁS
  // ====================================================================
  app.post('/api/club-review/rate', requireAuth, async (req, res) => {
    const { entryId, score } = req.body;
    const numScore = Number(score);

    try {
      const [[userDb]] = await pool.query(
        'SELECT club_name, club_role, is_master FROM photo_users WHERE email = ?', 
        [req.user.email]
      );

      const [[entry]] = await pool.query(
        'SELECT e.round_id, e.club_name, e.user_email, r.rating_deadline, r.status FROM club_review_entries e JOIN club_review_rounds r ON e.round_id = r.id WHERE e.id = ?', 
        [entryId]
      );

      if (!entry) return res.status(404).json({ error: 'A kép nem található.' });
      if (entry.club_name !== userDb.club_name) return res.status(403).json({ error: 'Más klub képére nem szavazhatsz.' });

      if (entry.user_email === req.user.email) {
        return res.status(400).json({ error: 'A saját képedet nem értékelheted!' });
      }

      if (entry.status === 'closed' || new Date() > new Date(entry.rating_deadline)) {
        return res.status(403).json({ error: 'Az értékelési határidő erre a fordulóra már lejárt!' });
      }

      const isMasterEvaluator = userDb.is_master === 1 || userDb.club_role === 'leader';
      const evaluatorRole = isMasterEvaluator ? 'master' : 'member';

      if (!isMasterEvaluator && (numScore < 0 || numScore > 2)) {
        return res.status(400).json({ error: 'Klubtagként 0, 1 vagy 2 pontot adhatsz!' });
      }

      if (isMasterEvaluator && (numScore < 1 || numScore > 10)) {
        return res.status(400).json({ error: 'Mesterként 1 és 10 közötti pontot adhatsz!' });
      }

      await pool.query(
        `INSERT INTO club_review_ratings (entry_id, evaluator_email, evaluator_role, score) 
         VALUES (?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE score = VALUES(score), evaluator_role = VALUES(evaluator_role)`,
        [entryId, req.user.email, evaluatorRole, numScore]
      );

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ====================================================================
  // ✉️ HTML E-MAIL SABLON GENERÁLÓ (Plakettel, Értékelésekkel, AI-val)
  // ====================================================================
  function generateWeeklyReviewEmail({ userName, clubName, roundTitle, entries, isTop3, top3Rank, bestPhotoTitle }) {
    const primaryColor = "#a78bfa";
    const bgDark = "#0f172a";
    const cardBg = "#1e293b";
    const borderCol = "#334155";

    let plaqueHtml = "";
    if (isTop3) {
      const badges = {
        1: { title: "1. HELYEZETT - ARANY PLAKETT", color: "#f59e0b", icon: "🥇" },
        2: { title: "2. HELYEZETT - EZÜST PLAKETT", color: "#94a3b8", icon: "🥈" },
        3: { title: "3. HELYEZETT - BRONZ PLAKETT", color: "#b45309", icon: "🥉" }
      };
      const badge = badges[top3Rank] || badges[1];

      plaqueHtml = `
        <div style="background: linear-gradient(135deg, ${cardBg}, #2e1065); border: 2px solid ${badge.color}; border-radius: 16px; padding: 25px; text-align: center; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <div style="font-size: 2.5rem; margin-bottom: 10px;">${badge.icon}</div>
          <h2 style="color: ${badge.color}; margin: 0 0 10px 0; font-size: 1.4rem; letter-spacing: 1px;">${badge.title}</h2>
          <p style="color: #f8fafc; font-size: 1.1rem; margin: 0 0 15px 0;">Ezúton igazoljuk, hogy <strong style="color: #38bdf8;">${userName}</strong> a(z) <strong>${clubName}</strong> felületén rendezett <strong>${roundTitle}</strong> fordulójában elismerésben részesült!</p>
          <div style="background: rgba(15,23,42,0.6); padding: 12px; border-radius: 8px; border: 1px dashed ${badge.color}; display: inline-block;">
            <span style="color: #cbd5e1; font-size: 0.9rem;">Díjazott alkotás:</span><br/>
            <strong style="color: #fff; font-size: 1.1rem;">"${bestPhotoTitle || 'Kiemelkedő fotó'}"</strong>
          </div>
        </div>
      `;
    }

    const entriesHtml = entries.map((entry, idx) => `
      <div style="background: ${cardBg}; border: 1px solid ${borderCol}; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #f8fafc; margin: 0 0 12px 0; font-size: 1.2rem;">${idx + 1}. ${entry.title}</h3>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; background: ${bgDark}; border-radius: 8px; text-align: center;">
          <tr>
            <td style="padding: 10px; border-right: 1px solid ${borderCol};">
              <span style="color: #94a3b8; font-size: 0.75rem; display: block;">Klubtagok</span>
              <strong style="color: #38bdf8; font-size: 1rem;">${entry.memberRank}/${entry.totalEntriesCount} hely</strong><br/>
              <small style="color: #64748b; font-size: 0.75rem;">${Number(entry.avg_member_score || 0).toFixed(1)} p</small>
            </td>
            <td style="padding: 10px; border-right: 1px solid ${borderCol};">
              <span style="color: #94a3b8; font-size: 0.75rem; display: block;">Mesterek</span>
              <strong style="color: #f59e0b; font-size: 1rem;">${entry.masterRank}/${entry.totalEntriesCount} hely</strong><br/>
              <small style="color: #64748b; font-size: 0.75rem;">${Number(entry.avg_master_score || 0).toFixed(1)} p</small>
            </td>
            <td style="padding: 10px;">
              <span style="color: #94a3b8; font-size: 0.75rem; display: block;">AI (FIAP)</span>
              <strong style="color: #a78bfa; font-size: 1rem;">${entry.aiRank}/${entry.totalEntriesCount} hely</strong><br/>
              <small style="color: #64748b; font-size: 0.75rem;">${entry.ai_score || 0} p</small>
            </td>
          </tr>
        </table>

        <div style="background: ${bgDark}; padding: 14px; border-radius: 8px; border-left: 4px solid ${primaryColor}; margin-bottom: 12px;">
          <strong style="color: ${primaryColor}; font-size: 0.85rem; display: block; margin-bottom: 6px;">🤖 AI Szakmai Értékelés (FIAP szempontok):</strong>
          <p style="color: #cbd5e1; font-size: 0.9rem; line-height: 1.5; margin: 0;">${entry.ai_feedback || 'Nincs elérhető kritika.'}</p>
        </div>

        ${entry.course_title ? `
          <div style="background: rgba(16,185,129,0.1); border: 1px solid #10b981; padding: 12px 15px; border-radius: 8px;">
            <small style="color: #10b981; font-weight: bold; display: block;">🎯 Javasolt klubtanfolyam a fejlődéshez:</small>
            <strong style="color: #fff; font-size: 0.95rem;">${entry.course_title}</strong>
            <div style="color: #94a3b8; font-size: 0.8rem; margin-top: 2px;">Ár: ${entry.course_price} • ${entry.course_location_detail || ''}</div>
          </div>
        ` : ''}
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"/></head>
      <body style="background-color: ${bgDark}; color: #f8fafc; font-family: Arial, sans-serif; padding: 20px; margin: 0;">
        <div style="max-width: 650px; margin: 0 auto; background: #0b1120; border: 1px solid ${borderCol}; border-radius: 16px; padding: 30px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
          
          <div style="text-align: center; border-bottom: 1px solid ${borderCol}; padding-bottom: 20px; margin-bottom: 25px;">
            <h1 style="color: ${primaryColor}; margin: 0 0 6px 0; font-size: 1.6rem;">${clubName}</h1>
            <h3 style="color: #cbd5e1; margin: 0; font-size: 1.1rem; font-weight: normal;">Heti Képértékelő Eredmények – ${roundTitle}</h3>
          </div>

          <p style="color: #cbd5e1; font-size: 1rem; line-height: 1.6;">Kedves <strong>${userName}</strong>!</p>
          <p style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.6; margin-bottom: 25px;">
            Lezárult a heti képértékelő forduló. Az alábbiakban megtalálod a beküldött fotóid részletes eredményeit és az AI szakmai visszajelzéseit:
          </p>

          ${plaqueHtml}
          ${entriesHtml}

          <div style="text-align: center; margin-top: 35px; padding-top: 20px; border-top: 1px solid ${borderCol};">
            <a href="https://photawesome.com" style="background: #f97316; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 0.95rem; display: inline-block;">
              Nézd meg a teljes klubrangsort!
            </a>
          </div>

          <div style="text-align: center; color: #64748b; font-size: 0.8rem; margin-top: 30px;">
            <p style="margin: 0;">${clubName} • PhotAwesome Platform</p>
          </div>

        </div>
      </body>
      </html>
    `;
  }

  // ====================================================================
  // 🧪 TESZT E-MAIL KÜLDÉSE (VALÓDI VALÓSZÍNŰSÉGI KISZÁMÍTÁSSAL A 75 KÉPBŐL)
  // ====================================================================
  app.post('/api/club-review/send-test-email', requireAuth, async (req, res) => {
    const { roundId, forceTop3 } = req.body;

    try {
      const [[userDb]] = await pool.query(
        'SELECT name, club_name FROM photo_users WHERE email = ?',
        [req.user.email]
      );

      if (!userDb || !userDb.club_name) {
        return res.status(400).json({ error: 'Nem vagy tagja fotóklubnak.' });
      }

      const [[targetRound]] = await pool.query(
        'SELECT * FROM club_review_rounds WHERE id = ? AND club_name = ?',
        [roundId, userDb.club_name]
      );

      if (!targetRound) {
        return res.status(404).json({ error: 'A forduló nem található.' });
      }

      // 🎯 KISZÁMOLJUK A FORDULÓ MINDEN KÉPÉNEK VALÓDI RANGSORÁT A SZAVAZATOK ALAPJÁN
      const allRankedEntries = await calculateRoundRanks(pool, roundId);

      // Kiszűrjük a tesztelő saját képeit a valós rangsoros listából
      const userEntries = allRankedEntries.filter(e => e.user_email === req.user.email);

      if (userEntries.length === 0) {
        return res.status(400).json({ error: 'Még nem töltöttél fel képet ebben a fordulóban, így nincs mit tesztelni!' });
      }

      // Megnézzük, van-e a felhasználónak valóban dobogós (Top 3) fotója
      const bestUserEntry = [...userEntries].sort((a, b) => a.overallRank - b.overallRank)[0];
      const naturallyTop3 = bestUserEntry && bestUserEntry.overallRank <= 3;

      const isTop3 = forceTop3 || naturallyTop3;
      const top3Rank = naturallyTop3 ? bestUserEntry.overallRank : 1;
      const bestPhotoTitle = bestUserEntry?.title || userEntries[0]?.title || 'Teszt Fotó';

      const htmlContent = generateWeeklyReviewEmail({
        userName: userDb.name || req.user.name,
        clubName: userDb.club_name,
        roundTitle: targetRound.title,
        entries: userEntries,
        isTop3,
        top3Rank,
        bestPhotoTitle
      });

      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_PASS;

      if (!smtpUser || !smtpPass) {
        return res.status(500).json({ 
          error: 'SMTP konfigurációs hiba: A process.env.SMTP_USER vagy SMTP_PASS hiányzik a szerver .env fájljából!' 
        });
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: Number(process.env.SMTP_PORT) === 465 || true,
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      const info = await transporter.sendMail({
        from: `"PhotAwesome Heti Értékelő" <${smtpUser}>`,
        to: req.user.email,
        subject: `[TESZT LEVÉL] 🏆 ${userDb.club_name} – Heti Képértékelő eredmények (${targetRound.title})`,
        html: htmlContent
      });

      console.log("✅ Teszt e-mail sikeresen elküldve. MessageId:", info.messageId);

      res.json({ 
        success: true, 
        message: `Teszt e-mail sikeresen elküldve a saját címedre (${req.user.email})!` 
      });

    } catch (err) {
      console.error("❌ E-mail küldési hiba a szerveren:", err);
      res.status(500).json({ error: `SMTP Hiba: ${err.message}` });
    }
  });

  // ====================================================================
  // 📊 6. FORDULÓ KÉPEINEK LEKÉRÉSE ÉS EREDMÉNYEK (FRONTEND)
  // ====================================================================
  app.get('/api/club-review/entries/:roundId', requireAuth, async (req, res) => {
    try {
      const [[userDb]] = await pool.query('SELECT club_name FROM photo_users WHERE email = ?', [req.user.email]);

      const [entries] = await pool.query(
        `SELECT 
          e.*,
          c.title as course_title, c.price as course_price, c.location_type as course_location_type, c.location_detail as course_location_detail,
          COALESCE(r_member.avg_member_score, 0) as avg_member_score,
          COALESCE(r_member.member_count, 0) as member_votes_count,
          COALESCE(r_master.avg_master_score, 0) as avg_master_score,
          COALESCE(r_master.master_count, 0) as master_votes_count,
          my_r.score as my_score
         FROM club_review_entries e
         LEFT JOIN photo_club_courses c ON e.ai_suggested_course_id = c.id
         LEFT JOIN (
           SELECT entry_id, AVG(score) as avg_member_score, COUNT(*) as member_count 
           FROM club_review_ratings WHERE evaluator_role = 'member' GROUP BY entry_id
         ) r_member ON e.id = r_member.entry_id
         LEFT JOIN (
           SELECT entry_id, AVG(score) as avg_master_score, COUNT(*) as master_count 
           FROM club_review_ratings WHERE evaluator_role = 'master' GROUP BY entry_id
         ) r_master ON e.id = r_master.entry_id
         LEFT JOIN club_review_ratings my_r ON e.id = my_r.entry_id AND my_r.evaluator_email = ?
         WHERE e.round_id = ? AND e.club_name = ?
         ORDER BY e.created_at DESC`,
        [req.user.email, req.params.roundId, userDb.club_name]
      );

      res.json(entries);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

};
