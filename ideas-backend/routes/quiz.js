const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const PointsService = require('../PointsService');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kovari.rudolf@gmail.com";

// Felhős képkezelő konfigurációja
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ====================================================================
// 🔒 BIZTONSÁGI KAPU (MIDDLEWARE) A KVÍZ VÉGPONTOKHOZ
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
      return res.status(401).json({ error: 'Érvénytelen munkamenet token.' });
    }

    req.user = {
      email: payload.email.toLowerCase().trim(),
      name: payload.name,
      isAdmin: payload.email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()
    };

    next();
  } catch (error) {
    console.error("🔒 Kvíz biztonsági hiba:", error.message);
    return res.status(401).json({ error: 'Lejárt vagy hibás hitelesítés!' });
  }
}

module.exports = function(app, pool, upload) {

  // 📡 1. NAPI VÉLETLENSZERŰ KVÍZ KÉRDÉSEK LEKÉRÉSE (VÉDETT + CHEAT-PROTECTION)
  app.get('/api/quiz/questions', requireAuth, async (req, res) => {
    try {
      const [attempts] = await pool.query(
        `SELECT id FROM quiz_attempts 
         WHERE user_email = ? AND DATE(completed_at) = CURDATE()`,
        [req.user.email]
      );

      if (attempts.length > 0) {
        return res.json({ alreadyPlayed: true, questions: [] });
      }

      const [questions] = await pool.query(
        `SELECT id, type, image_url, question_hu, question_en, options_hu, options_en 
         FROM quiz_questions 
         ORDER BY RAND() LIMIT 10`
      );

      res.json({ alreadyPlayed: false, questions });
    } catch (err) {
      console.error("❌ Kvíz betöltési hiba:", err.message);
      res.status(500).json({ error: 'Nem sikerült legenerálni a kvízkérdéseket.' });
    }
  });

  // 📡 2. KVÍZ EREDMÉNYEK LEADÁSA ÉS PONTOSZTÁS (VÉDETT)
  app.post('/api/quiz/submit', requireAuth, async (req, res) => {
    const { score, userEmail } = req.body;
    if (req.user.email !== userEmail.toLowerCase().trim()) {
      return res.status(403).json({ error: 'Munkamenet biztonsági eltérés!' });
    }

    const [checkAttempt] = await pool.query(
      'SELECT id FROM quiz_attempts WHERE user_email = ? AND DATE(completed_at) = CURDATE()',
      [req.user.email]
    );
    if (checkAttempt.length > 0) {
      return res.status(400).json({ error: 'Ma már leadtad a napi kvíz eredményedet!' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const pointsToAward = Math.min(50, Math.floor(score / 20));

      if (pointsToAward > 0) {
        await PointsService.handleTransaction(
          conn, req.user.email, pointsToAward, 'quiz_reward', null,
          `🎮 LensMaster Kvíz jutalom (+${pointsToAward}p)`, `LensMaster Quiz reward (+${pointsToAward}p)`
        );
      }

      await conn.query(
        'INSERT INTO quiz_attempts (user_email, score, points_awarded, completed_at) VALUES (?, ?, ?, NOW())',
        [req.user.email, score, pointsToAward]
      );

      await conn.commit();
      res.json({ success: true, pointsAwarded: pointsToAward, score });
    } catch (err) {
      try {
        if (conn && conn.connection && !conn.connection._closing && !conn.connection._fatalError) {
          await conn.rollback();
        }
      } catch (e) {}
      console.error("❌ Kvíz mentési hiba:", err.message);
      res.status(500).json({ error: 'Szerver hiba az eredmény kiértékelésekor.' });
    } finally {
      conn.release();
    }
  });

  // 📡 3. ÚJ KÉRDÉS HOZZÁADÁSA MULTIPART KÉPFELTÖLTÉSSEL (KIZÁRÓLAG ADMINOKNAK)
  // JAVÍTVA: JSON body helyett multer fájlfolyamot fogad, amit feltölt Cloudinary-be
  app.post('/api/admin/quiz/add', requireAuth, upload.single('photo'), async (req, res) => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Ehhez a művelethez Adminisztrátori jog szükséges!' });
    }

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'A kvízkérdéshez kötelező képet feltölteni!' });

    const { type, questionHu, questionEn, optionsHu, optionsEn, correctOption, exifTarget } = req.body;

    try {
      // Kép biztonságos feltöltése a Cloudinary 'arena_kviz' mappájába
      const result = await cloudinary.uploader.upload(file.path, { 
        folder: 'arena_kviz', 
        width: 1200, 
        height: 900, 
        crop: "limit", 
        quality: "auto:good" 
      });

      // Töröljük az átmeneti helyi fájlt a szerverről
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

      // Elmentjük a végleges rekordot a generált felhős kép-linkkel
      await pool.query(
        `INSERT INTO quiz_questions 
         (type, image_url, question_hu, question_en, options_hu, options_en, correct_option, exif_target_value) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [type, result.secure_url, questionHu, questionEn, optionsHu, optionsEn, correctOption, exifTarget || null]
      );

      res.json({ success: true, message: 'Kérdés és fotó sikeresen hozzáadva a kvízbázishoz!' });
    } catch (err) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      console.error("❌ Kvíz mentési hiba:", err.message);
      res.status(500).json({ error: 'Nem sikerült elmenteni a kérdést és a fotót.' });
    }
  });
};
