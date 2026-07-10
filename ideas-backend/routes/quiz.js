const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const PointsService = require('../PointsService');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kovari.rudolf@gmail.com";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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
      return res.status(401).json({ error: 'Érvénytelen munkamenet token.' });
    }
    req.user = {
      email: payload.email.toLowerCase().trim(),
      name: payload.name,
      isAdmin: payload.email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Lejárt vagy hibás hitelesítés!' });
  }
}

module.exports = function(app, pool, upload) {

  // 📡 1. NAPI KVÍZ KÉRDÉSEK LEKÉRÉSE (BIZTONSÁGOS: A helyes opció rejtve marad!)
  app.get('/api/quiz/questions', requireAuth, async (req, res) => {
    try {
      const [attempts] = await pool.query(
        'SELECT id FROM quiz_attempts WHERE user_email = ? AND DATE(completed_at) = CURDATE()',
        [req.user.email]
      );
      if (attempts.length > 0) {
        return res.json({ alreadyPlayed: true, questions: [] });
      }

      // Szigorúan kihagyjuk a correct_option-t, hogy ne lehessen ellopni a kliensoldalon
      const [questions] = await pool.query(
        `SELECT id, type, image_url, question_hu, question_en, options_hu, options_en 
         FROM quiz_questions 
         ORDER BY RAND() LIMIT 10`
      );
      res.json({ alreadyPlayed: false, questions });
    } catch (err) {
      res.status(500).json({ error: 'Szerver hiba a kérdések generálásakor.' });
    }
  });

  // 📡 2. KIÉRTÉKELÉS ÉS PONTOSZTÁS (SZERVEROLDALI BIZTONSÁGI JAVÍTÁS)
  app.post('/api/quiz/submit', requireAuth, async (req, res) => {
    const { answers, userEmail } = req.body; // answers: { [questionId]: 'A' } formátumú objektum
    if (!userEmail || req.user.email !== userEmail.toLowerCase().trim()) {
      return res.status(403).json({ error: 'Munkamenet biztonsági eltérés!' });
    }

    const [checkAttempt] = await pool.query(
      'SELECT id FROM quiz_attempts WHERE user_email = ? AND DATE(completed_at) = CURDATE()',
      [req.user.email]
    );
    if (checkAttempt.length > 0) {
      return res.status(400).json({ error: 'Ma már játszottál!' });
    }

    try {
      let serverCalculatedScore = 0;
      const submittedAnswers = answers || {};

      // Végigmegyünk a beküldött válaszokon és az adatbázis alapján hitelesítjük őket
      const questionIds = Object.keys(submittedAnswers);
      if (questionIds.length > 0) {
        const [dbQuestions] = await pool.query(
          'SELECT id, correct_option FROM quiz_questions WHERE id IN (?)',
          [questionIds.map(Number)]
        );

        dbQuestions.forEach(q => {
          const userChoice = submittedAnswers[q.id];
          if (userChoice && String(userChoice).toUpperCase() === String(q.correct_option).toUpperCase()) {
            serverCalculatedScore += 100;
          }
        });
      }

      // Pontszámítás: max 50 pont osztható ki
      const pointsToAward = Math.min(50, Math.floor(serverCalculatedScore / 20));

      const conn = await pool.getConnection();
      await conn.beginTransaction();

      if (pointsToAward > 0) {
        await PointsService.handleTransaction(
          conn, req.user.email, pointsToAward, 'quiz_reward', null,
          `🎮 LensMaster Kvíz jutalom (+${pointsToAward}p)`, `LensMaster Quiz reward (+${pointsToAward}p)`
        );
      }

      await conn.query(
        'INSERT INTO quiz_attempts (user_email, score, points_awarded, completed_at) VALUES (?, ?, ?, NOW())',
        [req.user.email, serverCalculatedScore, pointsToAward]
      );

      await conn.commit();
      conn.release();

      res.json({ success: true, score: serverCalculatedScore, pointsAwarded: pointsToAward });
    } catch (err) {
      console.error("🔥 Szerveroldali kvízhiba:", err.message);
      res.status(500).json({ error: 'Szerveroldali hiba a kiértékeléskor.' });
    }
  });

  // 📡 3. ÚJ KÉRDÉS HOZZÁADÁSA (KIZÁRÓLAG ADMINOKNAK)
  app.post('/api/admin/quiz/add', requireAuth, upload.single('photo'), async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Adminisztrátori jog szükséges!' });
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'A kvízkérdéshez kötelező képet feltölteni!' });
    const { type, questionHu, questionEn, optionsHu, optionsEn, correctOption, exifTarget } = req.body;
    try {
      const result = await cloudinary.uploader.upload(file.path, { 
        folder: 'arena_kviz', width: 1200, height: 900, crop: "limit", quality: "auto:good" 
      });
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      await pool.query(
        `INSERT INTO quiz_questions 
         (type, image_url, question_hu, question_en, options_hu, options_en, correct_option, exif_target_value) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [type, result.secure_url, questionHu, questionEn, optionsHu, optionsEn, correctOption, exifTarget || null]
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
    } catch (err) { res.status(500).json({ error: 'Hiba.' }); }
  });

  app.put('/api/admin/quiz/update/:id', requireAuth, upload.single('photo'), async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Adminisztrátori jog szükséges!' });
    const { id } = req.params; const file = req.file;
    const { type, questionHu, questionEn, optionsHu, optionsEn, correctOption, exifTarget, currentImageUrl } = req.body;
    try {
      let finalImageUrl = currentImageUrl;
      if (file) {
        const result = await cloudinary.uploader.upload(file.path, { folder: 'arena_kviz', width: 1200, height: 900, crop: "limit", quality: "auto:good" });
        finalImageUrl = result.secure_url;
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
      await pool.query(`UPDATE quiz_questions SET type = ?, image_url = ?, question_hu = ?, question_en = ?, options_hu = ?, options_en = ?, correct_option = ?, exif_target_value = ? WHERE id = ?`, [type, finalImageUrl, questionHu, questionEn, optionsHu, optionsEn, correctOption, exifTarget || null, id]);
      res.json({ success: true });
    } catch (err) { if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path); res.status(500).json({ error: err.message }); }
  });

  app.delete('/api/admin/quiz/delete/:id', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Adminisztrátori jog szükséges!' });
    try { await pool.query('DELETE FROM quiz_questions WHERE id = ?', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });
};

 
