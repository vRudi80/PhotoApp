const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const fs = require('fs');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kovari.rudolf@gmail.com";

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

module.exports = function(app, pool, drive, upload, cleanupTempFile, genAI) {

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
  // 🗓️ 2. HETI CIKLUS ÉS AKTUÁLIS FORDULÓ
  // ====================================================================
  
  app.get('/api/club-review/active-round', requireAuth, async (req, res) => {
    try {
      const [[userDb]] = await pool.query('SELECT club_name, club_role, is_premium, premium_level FROM photo_users WHERE email = ?', [req.user.email]);
      if (!userDb || !userDb.club_name) {
        return res.status(400).json({ error: 'Nem vagy tagja fotóklubnak.' });
      }

      let [rounds] = await pool.query(
        'SELECT * FROM club_review_rounds WHERE club_name = ? AND status != "closed" ORDER BY id DESC LIMIT 1',
        [userDb.club_name]
      );

      let round = rounds[0];

      if (!round) {
        const now = new Date();
        const nextSun = new Date(now);
        nextSun.setDate(now.getDate() + ((7 - now.getDay()) % 7));
        nextSun.setHours(23, 59, 59, 999);

        const nextWed = new Date(nextSun);
        nextWed.setDate(nextSun.getDate() + 3);

        const weekTitle = `${now.getFullYear()} / ${Math.ceil(now.getDate() / 7)}. hét - Heti Képértékelő`;

        const [ins] = await pool.query(
          `INSERT INTO club_review_rounds (club_name, title, upload_deadline, rating_deadline, status) 
           VALUES (?, ?, ?, ?, 'uploading')`,
          [userDb.club_name, weekTitle, nextSun, nextWed]
        );

        const [[newRound]] = await pool.query('SELECT * FROM club_review_rounds WHERE id = ?', [ins.insertId]);
        round = newRound;
      }

      res.json({ round, userRole: userDb.club_role, isPremium: userDb.is_premium });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ====================================================================
  // 📸 3. KÉP FELTÖLTÉSE (FÁJL) ÉS AI ELEMZÉS (GEMINI 2.5)
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

      // Csomagkorlát ellenőrzése
      const maxUploads = (userDb.is_premium && userDb.premium_level >= 2) ? 10 : 3;

      const [[{ uploadCount }]] = await pool.query(
        'SELECT COUNT(*) as uploadCount FROM club_review_entries WHERE round_id = ? AND user_email = ?',
        [roundId, req.user.email]
      );

      if (uploadCount >= maxUploads) {
        cleanupTempFile(req.file);
        return res.status(403).json({ 
          error: `A csomagod alapján ezen a héten legfeljebb ${maxUploads} képet tölthetsz fel! Válts FIAP Pro csomagra a 10 képes korláthoz.` 
        });
      }

      // 1. FELTÖLTÉS A GOOGLE DRIVE-RA
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

      // 2. KÉP BEOLVASÁSA MEMÓRIÁBA AZ AI ELEMZÉSHEZ ÉS HELYI FÁJL TÖRLÉSE
      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Data = imageBuffer.toString('base64');
      const mimeType = req.file.mimetype || 'image/jpeg';
      cleanupTempFile(req.file);

      // 3. GEMINI AI ELEMZÉS & TANFOLYAM ILLESZTÉS
      let aiCategory = 'color';
      let aiScore = 70;
      let aiFeedback = 'Szép kompozíció és jó fénykezelés.';
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
          "category": "portrait" | "color" | "monochrome" | "nature",
          "score": 10 és 100 közötti egész szám (FIAP színvonal alapján),
          "critique": "Részletes, konstruktív szakmai értékelés 2-3 mondatban. Miben jó a kép, és min kellene javítani?",
          "suggestedCourseId": A fenti listából kiválasztott tanfolyam ID-ja, ami segítene kijavítani a kép hibáját (ha nincs találat, null)
        }`;

        const result = await model.generateContent([
          prompt,
          { inlineData: { data: base64Data, mimeType } }
        ]);

        const aiData = JSON.parse(result.response.text());
        aiCategory = aiData.category || 'color';
        aiScore = Math.min(100, Math.max(10, Number(aiData.score) || 70));
        
        const fiapUpsell = " 🌟 Tipp: Ez a kép a FIAP nemzetközi szalonokon is jó eséllyel indulhatna! Próbáld ki a PhotAwesome FIAP modulját.";
        aiFeedback = (aiData.critique || 'Jó kivitelezés.') + fiapUpsell;
        suggestedCourseId = aiData.suggestedCourseId || null;

      } catch (aiErr) {
        console.error("AI elemzési hiba:", aiErr.message);
      }

      // 4. KÉP ADATOK ELMENTÉSE AZ ADATBÁZISBA
      const [ins] = await pool.query(
        `INSERT INTO club_review_entries 
         (round_id, club_name, user_email, user_name, title, file_url, drive_file_id, ai_category, ai_score, ai_feedback, ai_suggested_course_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [roundId, userDb.club_name, req.user.email, userDb.name || req.user.name, title, fileUrl, driveFileId, aiCategory, aiScore, aiFeedback, suggestedCourseId]
      );

      res.json({ success: true, entryId: ins.insertId });
    } catch (err) {
      cleanupTempFile(req.file);
      res.status(500).json({ error: err.message });
    }
  });

  // ====================================================================
  // 🗳️ 4. PONTOZÁS (TAGOK ÉS MESTEREK)
  // ====================================================================
  
  app.post('/api/club-review/rate', requireAuth, async (req, res) => {
    const { entryId, score } = req.body;
    const numScore = Number(score);

    try {
      const [[userDb]] = await pool.query(
        'SELECT club_name, club_role FROM photo_users WHERE email = ?', 
        [req.user.email]
      );

      const [[entry]] = await pool.query(
        'SELECT round_id, club_name, user_email FROM club_review_entries WHERE id = ?', 
        [entryId]
      );

      if (!entry) return res.status(404).json({ error: 'A kép nem található.' });
      if (entry.club_name !== userDb.club_name) return res.status(403).json({ error: 'Más klub képére nem szavazhatsz.' });

      if (entry.user_email === req.user.email) {
        return res.status(400).json({ error: 'A saját képedet nem értékelheted!' });
      }

      const isMaster = userDb.club_role === 'master' || userDb.club_role === 'leader';
      const evaluatorRole = isMaster ? 'master' : 'member';

      if (!isMaster && (numScore < 0 || numScore > 2)) {
        return res.status(400).json({ error: 'Klubtagként 0, 1 vagy 2 pontot adhatsz!' });
      }

      if (isMaster && (numScore < 1 || numScore > 10)) {
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
  // 📊 5. FORDULÓ KÉPEINEK LEKÉRÉSE ÉS EREDMÉNYEK
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
