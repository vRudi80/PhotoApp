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

module.exports = function(app, pool, upload) {

// 🎯 MÓDOSÍTVA: KÉRDÉSEK GENERÁLÁSA KUPON-ELLENŐRZÉSSEL
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

      // Ha már játszott ma ÉS egyetlen kuponja sincs, akkor tiltjuk le
      if (attempts.length > 0 && quizBalance === 0) {
        return res.json({ alreadyPlayed: true, questions: [] });
      }

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
  // 📡 KIÉRTÉKELÉS, IDŐMÉRÉS ÉS KÖZPONTI LEDGER PONTKÖNYVELÉS (TELJES)
  // ====================================================================
  app.post('/api/quiz/submit', requireAuth, async (req, res) => {
    // 🎯 INTEGRÁLVA: durationSeconds (időtartam) kicsomagolása a kérés törzséből
    const { answers, userEmail, durationSeconds } = req.body;
    if (!userEmail || req.user.email !== userEmail) {
      return res.status(403).json({ error: 'Munkamenet biztonsági eltérés!' });
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

      // 1. Ha kuponos kör volt, levonjuk a ráadás kupont közvetlenül
      if (usesToken) {
        await pool.query('UPDATE photo_users SET quiz_balance = quiz_balance - 1 WHERE email = ?', [req.user.email]);
      }

      // 2. Elmentjük a független kísérletet a kvíznaplóba
      // 🎯 MÓDOSÍTVA: Az SQL lekérdezés kiterjesztve a duration_seconds oszloppal és értékével!
      await pool.query(
        'INSERT INTO quiz_attempts (user_email, score, points_awarded, completed_at, answers_json, duration_seconds) VALUES (?, ?, ?, NOW(), ?, ?)',
        [
          req.user.email, 
          serverCalculatedScore, 
          pointsToAward, 
          JSON.stringify(submittedAnswers), 
          Number(durationSeconds || 0) // Biztonsági fallback 0-ra, ha üresen jönne át
        ]
      );

      // 3. Közvetlenül a 'pool' objektumot adjuk át a belső bankmotornak (Deadlock védelem)
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
  // 📡 3. ADMINISZTRÁCIÓS MENTÉS (HIÁNYTALAN + MAGYARÁZATOK)
  // ====================================================================
  app.post('/api/admin/quiz/add', requireAuth, upload.single('photo'), async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Adminisztrátori jog szükséges!' });
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'A kvízkérdéshez kötelező képet feltölteni!' });
    
    // 🎯 JAVÍTVA: Az explanationHu és explanationEn bekerült a destructuringbe!
    const { type, questionHu, questionEn, optionsHu, optionsEn, correctOption, exifTarget, explanationHu, explanationEn } = req.body;
    try {
      const result = await cloudinary.uploader.upload(file.path, { 
        folder: 'arena_kviz', width: 1200, height: 900, crop: "limit", quality: "auto:good" 
      });
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      
      // 🎯 JAVÍTVA: Az új mezők mentésre kerülnek az adatbázisba!
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

  app.get('/api/admin/quiz/questions', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Adminisztrátori jog szükséges!' });
    try {
      const [rows] = await pool.query('SELECT * FROM quiz_questions ORDER BY id DESC');
      res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Hiba a kérdések betöltésekor.' }); }
  });

   // ====================================================================
  // 🔍 ÚJ: EGY ADOTT MÚLTBÉLI KVÍZKÍSÉRLET RÉSZLETES ADATAINAK LEKÉRÉSE
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
      
      // Összefésüljük a kérdéseket azzal, amit a felhasználó ténylegesen válaszolt rájuk
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
  // 📡 4. ADMINISZTRÁCIÓS MODOSÍTÁS (HIÁNYTALAN + MAGYARÁZATOK)
  // ====================================================================
  app.put('/api/admin/quiz/update/:id', requireAuth, upload.single('photo'), async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Adminisztrátori jog szükséges!' });
    const { id } = req.params; const file = req.file;
    
    // 🎯 JAVÍTVA: Az explanationHu és explanationEn bekerült a módosítási folyamatba!
    const { type, questionHu, questionEn, optionsHu, optionsEn, correctOption, exifTarget, currentImageUrl, explanationHu, explanationEn } = req.body;
    try {
      let finalImageUrl = currentImageUrl;
      if (file) {
        const result = await cloudinary.uploader.upload(file.path, { folder: 'arena_kviz', width: 1200, height: 900, crop: "limit", quality: "auto:good" });
        finalImageUrl = result.secure_url;
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
      
      // 🎯 JAVÍTVA: Az SQL parancs most már az új edukációs mezőket is frissíti!
      await pool.query(
        `UPDATE quiz_questions 
         SET type = ?, image_url = ?, question_hu = ?, question_en = ?, options_hu = ?, options_en = ?, correct_option = ?, exif_target_value = ?, explanation_hu = ?, explanation_en = ? 
         WHERE id = ?`, 
        [type, finalImageUrl, questionHu, questionEn, optionsHu, optionsEn, correctOption, exifTarget || null, explanationHu || null, explanationEn || null, id]
      );
      res.json({ success: true });
    } catch (err) { if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path); res.status(500).json({ error: err.message }); }
  });
  // ====================================================================
  // 🤖 ÉLES AI: VISION-ALAPÚ FOTÓTÖRTÉNETI KVÍZGENERÁTOR (GEMINI 1.5 FLASH)
  // ====================================================================
  app.post('/api/admin/quiz/analyze-image', requireAuth, upload.single('photo'), async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Nincs fájl kiválasztva az AI elemzéshez!' });

    // Biztonsági ellenőrzés: Csak érvényes API kulccsal indulunk el
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(500).json({ error: 'Szerveroldali konfigurációs hiba: A GEMINI_API_KEY hiányzik a környezeti változók közül!' });
    }

    try {
      // 1. Beolvassuk az ideiglenesen feltöltött képet tiszta Base64 karakterlánccá
      const imageBuffer = fs.readFileSync(file.path);
      const base64Image = imageBuffer.toString('base64');

      // 2. Meghívjuk a Google Gemini 1.5 Flash Vision neurális hálóját az axios motoron keresztül
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
      
      const response = await axios.post(geminiUrl, {
        contents: [
          {
            parts: [
              {
                text: `Elemezd ezt a fotótörténeti vagy híres fotográfiai képet, azonosítsd be a készítőjét, a keletkezési körülményeit, és generálj belőle egy izgalmas, professzionális kvízkérdést. 
                
                A válaszod kizárólag egyetlen tiszta JSON objektum lehet, markdown kódblokk (\`\`\`json) és egyéb sallangok nélkül, pontosan az alábbi kulcsokkal és felépítéssel:
                {
                  "questionHu": "A kérdés magyarul (pl. Ki készítette ezt a híres felvételt?)",
                  "questionEn": "A kérdés angolul",
                  "explanationHu": "Részletes, több mondatos szakmai edukációs háttéranyag magyarul a kép kontextusáról, művészeti vagy történelmi jelentőségéről a fotósok számára.",
                  "explanationEn": "Ugyanez a részletes szakmai edukációs magyarázat angol nyelven.",
                  "correctOption": "A",
                  "optionsHu": ["Ide jön a tökéletes helyes válasz", "Rossz válaszlehetőség 1", "Rossz válaszlehetőség 2", "Rossz válaszlehetőség 3"],
                  "optionsEn": ["Helyes válasz angolul", "Rossz válaszlehetőség 1 angolul", "Rossz válaszlehetőség 2 angolul", "Rossz válaszlehetőség 3 angolul"]
                }
                
                Szigorú megkötés: Az optionsHu[0] és optionsEn[0] (vagyis az első index) mindig a valós helyes válasz legyen, a correctOption értéke pedig fixen 'A', mert a frontend felületünk bekészített keverőmotorja automatikusan megbolondítja majd a sorrendet a játékosok előtt!`
              },
              {
                inlineData: {
                  mimeType: file.mimetype, // Dinamikusan alkalmazkodik (image/jpeg, image/png, stb.)
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json", // Kikényszerítjük a strukturált JSON kimenetet
          temperature: 0.4
        }
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 25000 // 25 másodperces hálózati időkorlát a lassabb elemzésekhez
      });

      // 3. Kicsomagoljuk és parszoljuk a Gemini-től kapott tiszta text-választ
      const rawJsonText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJsonText) {
        throw new Error("Az AI Vision válasza üres vagy sérült volt.");
      }

      const parsedQuizData = JSON.parse(rawJsonText.trim());

      // 4. Sikeres elemzés után letakarítjuk a lokális tárhelyről a temp fájlt
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

      // Visszaadjuk a kész, kétnyelvű feladványcsomagot az Admin felületnek
      res.json(parsedQuizData);

    } catch (err) {
      // Biztonsági takarítás hiba esetén is, hogy ne teljen meg a szerver
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      console.error("❌ Éles Gemini Kvízgenerátor hiba:", err.message);
      res.status(502).json({ error: 'Az AI Vision szerver nem tudta feldolgozni vagy beazonosítani a képet. Kérlek, próbáld újra egy tisztább verzióval!' });
    }
  });


  // ====================================================================
  // 📋 VÉGLEG JAVÍTVA: MY-HISTORY + KATÉGÓRIÁNKÉNTI ÉS ÖSSZESÍTETT SZÁMLÁLÓK
  // ====================================================================
  app.get('/api/quiz/my-history', requireAuth, async (req, res) => {
    try {
      const userEmail = req.user.email;

      // 1. Lekérjük a felhasználó teljes kvíztörténetét időrendben visszafelé
      const [historyRows] = await pool.query(
        'SELECT id, score, points_awarded, completed_at AS date FROM quiz_attempts WHERE user_email = ? ORDER BY completed_at DESC',
        [userEmail]
      );

      // 2. Lekérjük a felhasználó aktuális kupon egyenlegét a photo_users táblából
      const [userRows] = await pool.query(
        'SELECT quiz_balance FROM photo_users WHERE email = ?',
        [userEmail]
      );
      const quizBalance = userRows[0]?.quiz_balance || 0;

      // 3. Szigorúan ellenőrizzük, hogy a mai naptári napon küldött-e már be kvízt
      const [todayRows] = await pool.query(
        'SELECT id FROM quiz_attempts WHERE user_email = ? AND DATE(completed_at) = CURDATE()',
        [userEmail]
      );
      const alreadyPlayedToday = todayRows.length > 0;

      // 4. Kategóriánkénti darabszámok dinamikus összesítése a kérdésbankból
      const [countsRows] = await pool.query('SELECT type, COUNT(*) as count FROM quiz_questions GROUP BY type');
      
      let questionCounts = { total: 0, exif: 0, composition: 0, history: 0 };
      countsRows.forEach(row => {
        if (row.type === 'exif') questionCounts.exif = row.count;
        if (row.type === 'composition') questionCounts.composition = row.count;
        if (row.type === 'history') questionCounts.history = row.count;
        questionCounts.total += row.count;
      });

      // Visszaküldjük a frontendnek a hiánytalan, stabil adatcsomagot
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
  // 🏆 FRISSÍTVE: KVÍZ RANGLISTA (KLUB LOGÓKKAL ÉS MEZŐNY-ÖSSZEFÉSÜLÉSSEL)
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
        /* 🎯 ÚJ: Kiszámoljuk a userek átlagos kitöltési idejét az adott időszakban */
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
      /* 🎯 ÚJ HOLTVERSENY-TÖRŐ REND EZÉS: Elsőként az elért százalék dönt, */
      /* egyenlőség esetén a kisebb átlagos kitöltési idő (AVG duration ASC) kap elsőbbséget! */
      ORDER BY (SUM(a.score) / COUNT(a.id)) DESC, AVG(a.duration_seconds) ASC
      LIMIT 50
    `;

    try {
      const [rows] = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Hiba' });
    }
  });

  
  app.delete('/api/admin/quiz/delete/:id', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Adminisztrátori jog szükséges!' });
    try { await pool.query('DELETE FROM quiz_questions WHERE id = ?', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba a törlés közben.' }); }
  });
};
