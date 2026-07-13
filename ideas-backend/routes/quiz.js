const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🎯 KÖZPONTI BANKMOTOR BEÉPÍTÉSE
const PointsService = require('../PointsService'); 

// 🎯 BIZTONSÁGI TARTALÉK EMAIL
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kovari.rudolf@gmail.com";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ====================================================================
// 🔒 HITELESÍTÉSI MIDDLEWARE (weekly.js alapú)
// ====================================================================
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Hozzáférés megtagadva! Token hiányzik.' });
    }

    const token = authHeader.split(' ')[1];
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'Érvénytelen vagy sérült Google token.' });
    }

    req.user = {
      email: payload.email,
      name: payload.name,
      isAdmin: payload.email === ADMIN_EMAIL
    };

    next();
  } catch (error) {
    console.error("🔒 Biztonsági őr hiba a kvíz modulban:", error.message);
    return res.status(401).json({ error: 'Lejárt vagy érvénytelen munkamenet token!' });
  }
}

// ====================================================================
// 🎮 ANTI-CHEAT MEMÓRIA TÁROLÓ
// ====================================================================
const activeQuizzes = {}; // Itt tartjuk számon, hogy ki játszik éppen aktívan

// 🎯 PARAMÉTEREK RAGYOGÓAN SZINKRONIZÁLVA (index.js-hez igazítva)
module.exports = function(app, pool, upload, genAI) {

  // ====================================================================
  // 🔓 ÚJ: ELAKADT / ELHAGYOTT KVÍZEK AUTOMATIKUS FELOLDÓ KAPUJA
  // ====================================================================
  app.post('/api/quiz/cancel-active', requireAuth, (req, res) => {
    if (activeQuizzes[req.user.email]) {
      delete activeQuizzes[req.user.email];
    }
    res.json({ success: true, message: 'Minden esetleges korábbi aktív kvízzár feloldva.' });
  });

  // ====================================================================
  // 📋 KÉRDÉSEK GENERÁLÁSA KUPON-ELLENŐRZÉSSEL + ANTI-CHEAT LOCK
  // ====================================================================
  app.get('/api/quiz/questions', requireAuth, async (req, res) => {
    try {
      const [attempts] = await pool.query(
        'SELECT id FROM quiz_attempts WHERE user_email = ? AND DATE(completed_at) = CURDATE()',
        [req.user.email]
      );
      const [userRows] = await pool.query(
        'SELECT quiz_balance FROM photo_users WHERE email = ?',
        [req.user.email]
      );
      const quizBalance = userRows[0]?.quiz_balance || 0;

      if (attempts.length > 0 && quizBalance === 0) {
        return res.json({ alreadyPlayed: true, questions: [] });
      }

      // 🎯 ANTI-CHEAT LOCK: Aktiváljuk a szerveroldali védelmi zárat
      activeQuizzes[req.user.email] = Date.now();

      const [questions] = await pool.query(
        `SELECT id, type, image_url, question_hu, question_en, options_hu, options_en, explanation_hu, explanation_en 
         FROM quiz_questions 
         ORDER BY RAND() LIMIT 10`
      );
      res.json({ alreadyPlayed: false, questions });
    } catch (err) {
      res.status(500).json({ error: 'Szerver hiba a kérdések generálásakor.' });
    }
  });

  // ====================================================================
  // 📡 KIÉRTÉKELÉS, IDŐMÉRÉS ÉS PONTKÖNYVELÉS + ANTI-CHEAT UNLOCK
  // ====================================================================
  app.post('/api/quiz/submit', requireAuth, async (req, res) => {
    const { answers, userEmail, durationSeconds } = req.body;
    if (!userEmail || req.user.email !== userEmail) {
      return res.status(403).json({ error: 'Munkamenet biztonsági eltérés!' });
    }

    // 🎯 ANTI-CHEAT UNLOCK: Sikeres beküldéskor azonnal feloldjuk a zárat
    if (activeQuizzes[req.user.email]) {
      delete activeQuizzes[req.user.email];
    }

    try {
      const [checkAttempt] = await pool.query(
        'SELECT id FROM quiz_attempts WHERE user_email = ? AND DATE(completed_at) = CURDATE()',
        [req.user.email]
      );
      
      let usesToken = false;
      if (checkAttempt.length > 0) {
        const [userRows] = await pool.query('SELECT quiz_balance FROM photo_users WHERE email = ?', [req.user.email]);
        const quizBalance = userRows[0]?.quiz_balance || 0;
        if (quizBalance <= 0) {
          return res.status(400).json({ error: 'Nincs több Kvíz Kuponod a mai ráadás körhöz!' });
        }
        usesToken = true;
      }

      let serverCalculatedScore = 0;
      const submittedAnswers = answers || {};
      const questionIds = Object.keys(submittedAnswers);
      const correctAnswersMap = {}; 

      if (questionIds.length > 0) {
        const [dbQuestions] = await pool.query('SELECT id, correct_option FROM quiz_questions WHERE id IN (?)', [questionIds.map(Number)]);
        dbQuestions.forEach(q => {
          correctAnswersMap[q.id] = q.correct_option; 
          const userChoice = submittedAnswers[q.id];
          if (userChoice && String(userChoice).toUpperCase() === String(q.correct_option).toUpperCase()) {
            serverCalculatedScore += 100;
          }
        });
      }

      const pointsToAward = Math.min(50, Math.floor(serverCalculatedScore / 20));

      if (usesToken) {
        await pool.query('UPDATE photo_users SET quiz_balance = quiz_balance - 1 WHERE email = ?', [req.user.email]);
      }

      await pool.query(
        'INSERT INTO quiz_attempts (user_email, score, points_awarded, completed_at, answers_json, duration_seconds) VALUES (?, ?, ?, NOW(), ?, ?)',
        [req.user.email, serverCalculatedScore, pointsToAward, JSON.stringify(submittedAnswers), Number(durationSeconds || 0)]
      );

      if (pointsToAward > 0) {
        try {
          await PointsService.handleTransaction(
            pool,
            req.user.email,
            pointsToAward,
            'quiz_reward',
            null, 
            `🎮 LensMaster Kvíz jutalom (+${pointsToAward}p)`,
            `LensMaster Quiz reward (+${pointsToAward}p)`
          );
        } catch (pointsErr) {
          console.error("⚠️ Hiba a PointsService könyvelése közben:", pointsErr.message);
        }
      }
      
      res.json({ 
        success: true, 
        score: serverCalculatedScore, 
        pointsAwarded: pointsToAward,
        correctAnswers: correctAnswersMap 
      });

    } catch (err) {
      console.error("❌ Éles központi kvíz submit hiba:", err.message);
      res.status(500).json({ error: 'Szerver hiba az eredmény kiértékelésekor.' });
    }
  });

  // ====================================================================
  // 📡 ADMINISZTRÁCIÓS MENTÉS (HIÁNYTALAN + MAGYARÁZATOK)
  // ====================================================================
  app.post('/api/admin/quiz/add', requireAuth, upload.single('photo'), async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Adminisztrátori jog szükséges!' });
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'A kvízkérdéshez kötelező képet feltölteni!' });
    
    const { type, questionHu, questionEn, optionsHu, optionsEn, correctOption, exifTarget, explanationHu, explanationEn } = req.body;
    try {
      const result = await cloudinary.uploader.upload(file.path, { 
        folder: 'arena_kviz', width: 1200, height: 900, crop: "limit", quality: "auto:good" 
      });
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      
      await pool.query(
        `INSERT INTO quiz_questions 
         (type, image_url, question_hu, question_en, options_hu, options_en, correct_option, exif_target_value, explanation_hu, explanation_en) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [type, result.secure_url, questionHu, questionEn, optionsHu, optionsEn, correctOption, exifTarget || null, explanationHu || null, explanationEn || null]
      );
      res.json({ success: true });
    } catch (err) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(500).json({ error: err.message });
    }
  });

  // ====================================================================
  // 📁 ADMINISZTRÁCIÓS KÉRDÉSLISTA
  // ====================================================================
  app.get('/api/admin/quiz/questions', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Adminisztrátori jog szükséges!' });
    try {
      const [rows] = await pool.query('SELECT * FROM quiz_questions ORDER BY id DESC');
      res.json(rows);
    } catch (err) { 
      res.status(500).json({ error: 'Hiba a kérdések betöltésekor.' }); 
    }
  });

  // ====================================================================
  // 🔍 MÚLTBÉLI KVÍZKÍSÉRLET RÉSZLETES ADATAINAK LEKÉRÉSE
  // ====================================================================
  app.get('/api/quiz/attempt/:id', requireAuth, async (req, res) => {
    try {
      const [attempts] = await pool.query(
        'SELECT answers_json FROM quiz_attempts WHERE id = ? AND user_email = ?',
        [req.params.id, req.user.email]
      );
      if (attempts.length === 0) return res.status(404).json({ error: 'A keresett kvízkör nem található.' });
      
      const answersMap = JSON.parse(attempts[0].answers_json || '{}');
      const questionIds = Object.keys(answersMap).map(Number);
      
      if (questionIds.length === 0) return res.json([]);
      
      const [questions] = await pool.query(`
        SELECT id, type, image_url, question_hu, question_en, options_hu, options_en, explanation_hu, explanation_en, correct_option 
        FROM quiz_questions 
        WHERE id IN (?)
      `, [questionIds]);
      
      const enrichedQuestions = questions.map(q => ({
        ...q,
        user_picked_letter: answersMap[q.id] || ''
      }));
      
      res.json(enrichedQuestions);
    } catch (err) {
      console.error("❌ Kvízkör részletező hiba:", err.message);
      res.status(500).json({ error: 'Nem sikerült betölteni a kör szakmai adatait.' });
    }
  });

  // ====================================================================
  // 📡 ADMINISZTRÁCIÓS MÓDOSÍTÁS (HIÁNYTALAN + MAGYARÁZATOK)
  // ====================================================================
  app.put('/api/admin/quiz/update/:id', requireAuth, upload.single('photo'), async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Adminisztrátori jog szükséges!' });
    const { id } = req.params; 
    const file = req.file;
    const { type, questionHu, questionEn, optionsHu, optionsEn, correctOption, exifTarget, currentImageUrl, explanationHu, explanationEn } = req.body;
    
    try {
      let finalImageUrl = currentImageUrl;
      if (file) {
        const result = await cloudinary.uploader.upload(file.path, { folder: 'arena_kviz', width: 1200, height: 900, crop: "limit", quality: "auto:good" });
        finalImageUrl = result.secure_url;
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
      
      await pool.query(
        `UPDATE quiz_questions 
         SET type = ?, image_url = ?, question_hu = ?, question_en = ?, options_hu = ?, options_en = ?, correct_option = ?, exif_target_value = ?, explanation_hu = ?, explanation_en = ? 
         WHERE id = ?`, 
        [type, finalImageUrl, questionHu, questionEn, optionsHu, optionsEn, correctOption, exifTarget || null, explanationHu || null, explanationEn || null, id]
      );
      res.json({ success: true });
    } catch (err) { 
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path); 
      res.status(500).json({ error: err.message }); 
    }
  });

  // ====================================================================
  // 🤖 ÉLES BELSŐ AI: VISION-ALAPÚ FOTÓTÖRTÉNETI KVÍZGENERÁTOR (GEMINI)
  // ====================================================================
  app.post('/api/admin/quiz/analyze-image', requireAuth, upload.single('photo'), async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Nincs fájl kiválasztva az AI elemzéshez!' });

    try {
      const imageBuffer = fs.readFileSync(file.path);
      const base64Image = imageBuffer.toString('base64');

      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" } 
      });

      const prompt = `Elemezd ezt a fotótörténeti vagy híres fotográfiai képet, azonosítsd be a készítőjét, a keletkezési körülményeit, és generálj belőle egy kvízkérdést.
      
      ⚠️ SZIGORÚ FIGYELMEZTETÉS: Kerüld el az azonos eseményen készült, hasonló témájú ikonikus képek összekeverését! (Például az 1967-es Pentagon-tüntetésen Bernie Boston and Marc Riboud is fotózott virágos jelenetet, de a kompozíciójuk teljesen más. Nézd meg alaposan a szereplőket, ruhákat, fegyvereket és a kép pontos részleteit, mielőtt rávágnád a fotós nevét!). Ha nem vagy 100%-ig biztos a szerzőben, ne találgass!
      
      KIZÁRÓLAG egy érvényes JSON objektumot adj vissza, markdown kódblokk és egyéb szöveges sallangok nélkül!
      A JSON pontos struktúrája ez legyen:
      {
        "questionHu": "A kérdés magyarul (pl. Ki készítette ezt a híres felvételt?)",
        "questionEn": "A kérdés angolul",
        "explanationHu": "Részletes, több mondatos szakmai edukációs háttéranyag magyarul a kép kontextusáról.",
        "explanationEn": "Ugyanez a részletes szakmai edukációs magyarázat angol nyelven.",
        "correctOption": "Válassz teljesen véletlenszerűen egy nagybetűt az A, B, C vagy D opciók közül",
        "optionsHu": ["Válaszlehetőség A", "Válaszlehetőség B", "Válaszlehetőség C", "Válaszlehetőség D"],
        "optionsEn": ["Option A", "Option B", "Option C", "Option D"]
      }
      Megkötés: A correctOption kulcsban általad választott betűhöz tartozó indexre (A=0, B=1, C=2, D=3) tedd a valós, igaz helyes választ mind a magyar, mind az angol tömbben! A maradék három helyre generálj megtévesztő, meggyőző, de egyértelműen hibás válaszokat.`;

      const imagePart = { inlineData: { data: base64Image, mimeType: file.mimetype } };
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      let text = response.text();

      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("Sérült vagy hibás JSON struktúra.");

      text = text.substring(jsonStart, jsonEnd + 1);
      const parsedQuizData = JSON.parse(text);

      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.json(parsedQuizData);
    } catch (err) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      console.error("❌ Éles belső Gemini Kvízgenerátor hiba:", err.message);
      res.status(502).json({ error: 'A belső AI motor nem tudta feldolgozni a képet.' });
    }
  });

  // ====================================================================
  // 📋 MY-HISTORY + KATÉGÓRIÁNKÉNTI ÉS ÖSSZESÍTETT SZÁMLÁLÓK
  // ====================================================================
  app.get('/api/quiz/my-history', requireAuth, async (req, res) => {
    try {
      const userEmail = req.user.email;
      const [historyRows] = await pool.query(
        'SELECT id, score, points_awarded, completed_at AS date FROM quiz_attempts WHERE user_email = ? ORDER BY completed_at DESC',
        [userEmail]
      );
      const [userRows] = await pool.query('SELECT quiz_balance FROM photo_users WHERE email = ?', [userEmail]);
      const quizBalance = userRows[0]?.quiz_balance || 0;

      const [todayRows] = await pool.query(
        'SELECT id FROM quiz_attempts WHERE user_email = ? AND DATE(completed_at) = CURDATE()',
        [userEmail]
      );
      const alreadyPlayedToday = todayRows.length > 0;

      const [countsRows] = await pool.query('SELECT type, COUNT(*) as count FROM quiz_questions GROUP BY type');
      let questionCounts = { total: 0, exif: 0, composition: 0, history: 0 };
      countsRows.forEach(row => {
        if (row.type === 'exif') questionCounts.exif = row.count;
        if (row.type === 'composition') questionCounts.composition = row.count;
        if (row.type === 'history') questionCounts.history = row.count;
        questionCounts.total += row.count;
      });

      res.json({
        success: true,
        history: historyRows,
        quizBalance: quizBalance,
        alreadyPlayedToday: alreadyPlayedToday,
        questionCounts
      });
    } catch (err) {
      console.error("❌ Kvíz történet és számláló éles hiba:", err.message);
      res.status(500).json({ error: 'Nem sikerült betölteni a kvíznapló adatait.' });
    }
  });

  // ====================================================================
  // 🏆 TISZTA TALÁLATI DARABSZÁM ÉS IDŐALAPÚ RANGLISTA
  // ====================================================================
  app.get('/api/quiz/leaderboard', requireAuth, async (req, res) => {
    const { period, year, month } = req.query;
    
    let sql = `
      SELECT 
        u.name, 
        u.club_name,
        u.avatar_url,
        c.drive_logo_id,
        c.logo_url,
        CAST(SUM(a.score) / 100 AS UNSIGNED) as total_correct,
        CAST(COUNT(a.id) * 10 AS UNSIGNED) as total_questions,
        ROUND((SUM(a.score) / (COUNT(a.id) * 100)) * 100) as percentage,
        ROUND(AVG(a.duration_seconds), 1) as avg_duration
      FROM quiz_attempts a
      JOIN photo_users u ON a.user_email = u.email COLLATE utf8mb4_general_ci
      LEFT JOIN photo_clubs c ON u.club_name = c.name
    `;
    
    let whereClause = 'WHERE 1=1';
    let params = [];

    if (period === 'daily') {
      whereClause = 'WHERE DATE(a.completed_at) = CURDATE()';
    } else if (period === 'weekly') {
      whereClause = 'WHERE YEARWEEK(a.completed_at, 1) = YEARWEEK(NOW(), 1)';
    } else if (period === 'monthly') {
      if (year && month) {
        whereClause = 'WHERE YEAR(a.completed_at) = ? AND MONTH(a.completed_at) = ?';
        params.push(Number(year), Number(month));
      } else {
        whereClause = 'WHERE YEAR(a.completed_at) = YEAR(NOW()) AND MONTH(a.completed_at) = MONTH(NOW())';
      }
    }

    sql += `
      ${whereClause}
      GROUP BY u.email, u.name, u.club_name, u.avatar_url, c.drive_logo_id, c.logo_url
      ORDER BY 
        SUM(a.score) DESC,
        AVG(a.duration_seconds) ASC
      LIMIT 50
    `;

    try {
      const [rows] = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Hiba a ranglista lekérésekor.' });
    }
  });

  // ====================================================================
  // 🖼️ PRÉMIUM EXKLUZÍV: FOTÓTÖRTÉNETI ALBUM + ANTI-CHEAT LOCK CHECK
  // ====================================================================
  app.get('/api/premium/photo-history', requireAuth, async (req, res) => {
    try {
      // 🎯 ANTI-CHEAT CHECK: Megnézzük, hogy van-e aktív, folyamatban lévő kvízköre
      const quizStartTime = activeQuizzes[req.user.email];
      if (quizStartTime) {
        const elapsedSeconds = (Date.now() - quizStartTime) / 1000;
        if (elapsedSeconds < 300) {
          return res.status(403).json({ 
            error: '🎮 CSALÁS ELLENI VÉDELEM: Jelenleg aktív kvízköröd van folyamatban! A puskázás elkerülése érdekében az album le van zárva.' 
          });
        } else {
          delete activeQuizzes[req.user.email];
        }
      }

      // Hozzáférés ellenőrzés
      const [userRows] = await pool.query(
        'SELECT is_premium, premium_until FROM photo_users WHERE email = ?', 
        [req.user.email]
      );
      
      const now = new Date();
      const isPremium = userRows[0]?.is_premium === 1 || (userRows[0]?.premium_until && new Date(userRows[0].premium_until) > now);

      if (!isPremium) {
        return res.status(403).json({ error: 'Ez a galéria kizárólag aktív Prémium tagjaink számára elérhető!' });
      }

      const [rows] = await pool.query(
        `SELECT id, image_url, question_hu, question_en, options_hu, options_en, correct_option, explanation_hu, explanation_en 
         FROM quiz_questions 
         WHERE type = 'history' 
         ORDER BY id DESC`
      );

      const processedEncyclopedia = rows.map(row => {
        let photographerHu = 'Ismeretlen alkotó';
        let photographerEn = 'Unknown artist';
        
        try {
          const optsHu = typeof row.options_hu === 'string' ? JSON.parse(row.options_hu) : row.options_hu;
          const optsEn = typeof row.options_en === 'string' ? JSON.parse(row.options_en) : row.options_en;
          const correctIdx = (row.correct_option || 'A').toUpperCase().charCodeAt(0) - 65;
          
          if (Array.isArray(optsHu) && optsHu[correctIdx]) photographerHu = optsHu[correctIdx];
          if (Array.isArray(optsEn) && optsEn[correctIdx]) photographerEn = optsEn[correctIdx];
        } catch (e) {
          console.error("Hiba a fotós nevének AI-Kvíz dekódolásakor:", e.message);
        }

        return {
          id: row.id,
          image_url: row.image_url,
          photographer: req.query.lang === 'en' ? photographerEn : photographerHu,
          title: req.query.lang === 'en' ? row.question_en : row.question_hu,
          explanation: req.query.lang === 'en' ? row.explanation_en : row.explanation_hu
        };
      });

      res.json(processedEncyclopedia);
    } catch (err) {
      console.error("❌ Enciklopédia betöltési hiba:", err.message);
      res.status(500).json({ error: 'Nem sikerült betölteni a fotótörténeti albumot.' });
    }
  });

  // ====================================================================
  // 🗑️ ADMINISZTRÁCIÓS TÖRLES
  // ====================================================================
  app.delete('/api/admin/quiz/delete/:id', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Adminisztrátori jog szükséges!' });
    try { 
      await pool.query('DELETE FROM quiz_questions WHERE id = ?', [req.params.id]); 
      res.json({ success: true }); 
    } catch (err) { 
      res.status(500).json({ error: 'Hiba a törlés közben.' }); 
    }
  });

};
