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
// AUTH MIDDLEWARE
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
  // 0. MESTER TITULUS KAPCSOLÁSA (Klubvezető vagy Admin által)
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
  // 1. KLUB TANFOLYAMOK KEZELÉSE (CRUD)
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
  // 2. KLUB ÖSSZES FORDULÓJÁNAK LEKÉRÉSE (ARCHÍVUM)
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
  // 3. AKTUÁLIS FORDULÓ LEKÉRÉSE / AUTOMATIKUS INDÍTÁSA
  // ====================================================================
  app.get('/api/club-review/active-round', requireAuth, async (req, res) => {
    try {
      const [[userDb]] = await pool.query('SELECT club_name, club_role, is_master, is_premium, premium_level FROM photo_users WHERE email = ?', [req.user.email]);
      if (!userDb || !userDb.club_name) {
        return res.status(400).json({ error: 'Nem vagy tagja fotóklubnak.' });
      }

      const now = new Date();

      // 1. Automatikusan lezárjuk azokat a fordulókat, ahol a szerda éjféli rating_deadline eltelt
      await pool.query(
        'UPDATE club_review_rounds SET status = "closed" WHERE club_name = ? AND rating_deadline < ? AND status != "closed"',
        [userDb.club_name, now]
      );

      // 2. Megkeressük azt a fordulót, amelynek feltöltési határideje még érvényes (upload_deadline >= now)
      let [rounds] = await pool.query(
        'SELECT * FROM club_review_rounds WHERE club_name = ? AND upload_deadline >= ? ORDER BY id DESC LIMIT 1',
        [userDb.club_name, now]
      );

      let round = rounds[0];

      // 3. Ha hétfő van (vagy nincs még ezen a héten nyitott feltöltési forduló), automatikusan létrehozzuk az ÚJ HETET!
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
  // 4. KÉP FELTÖLTÉSE (FÁJL) ÉS AI ELEMZÉS (GEMINI 2.5)
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

      // FELTÖLTÉSI HATÁRIDŐ ELLENŐRZÉSE (Vasárnap éjfél)
      if (new Date() > new Date(targetRound.upload_deadline)) {
        cleanupTempFile(req.file);
        return res.status(403).json({ error: 'Erre a fordulóra a képfeltöltési határidő (vasárnap éjfél) már lejárt!' });
      }

      // CSOMAGKORLÁT SZÁMÍTÁSA
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

      // GEMINI AI ELEMZÉS (FIAP AJÁNLÁS AI DÖNTÉS ALAPJÁN)
      let aiCategories = ['color'];
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
          "categories": ["portrait", "color", "monochrome", "nature"],
          "score": 10 és 100 közötti egész szám (FIAP színvonal alapján),
          "critique": "Részletes, konstruktív szakmai értékelés 2-3 mondatban. Miben jó a kép, és min kellene javítani?",
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
        
        // FIAP Ajánlás fűzése kizárólag ha az AI szerint méltó a kép
        let fiapNotice = "";
        if (aiData.suggestFiap === true) {
          fiapNotice = " Tipp: Ez a kép a szakmai és művészi színvonala alapján a FIAP nemzetközi szalonokon is jó eséllyel indulhatna!";
        }

        aiFeedback = (aiData.critique || 'Jó kivitelezés.') + fiapNotice;
        suggestedCourseId = aiData.suggestedCourseId || null;

      } catch (aiErr) {
        console.error("AI elemzési hiba:", aiErr.message);
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
  // 5. PONTOZÁS (SZERDA ÉJFÉLIG ENGEDÉLYEZETT)
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

      // SZAVAZÁSI HATÁRIDŐ ELLENŐRZÉSE (Következő hét Szerda éjfél)
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
  // 6. FORDULÓ KÉPEINEK LEKÉRÉSE ÉS EREDMÉNYEK
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
