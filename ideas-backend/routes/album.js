const fs = require('fs');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🎯 JAVÍTVA: A te valódi admin e-mailedet állítottuk be biztonsági tartaléknak!
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kovari.rudolf@gmail.com";

// ====================================================================
// 🔒 GOLYÓÁLLÓ AUTHENTICATION MIDDLEWARE AN ALBUM MODULHOZ
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
    console.error("🔒 Biztonsági őr hiba az album modulban:", error.message);
    return res.status(401).json({ error: 'Lejárt vagy érvénytelen munkamenet token!' });
  }
}

module.exports = function(app, pool, drive, genAI, upload, cleanupTempFile, checkPremium) {
  
  // 🛡️ REJTETT FÉKRENDSZER: Tárhely limit ellenőrző függvény
  async function checkStorageLimit(pool, email, incomingFileBytes, currentPhotoIdToExclude = null) {
    const [userRows] = await pool.query(
      'SELECT is_premium, premium_until, premium_level FROM photo_users WHERE email = ?', 
      [email]
    );
    if (userRows.length === 0) return { allowed: false, error: 'Felhasználó nem található!' };

    const user = userRows[0];
    const now = new Date();
    
    const isPremium = user.is_premium === 1 || (user.premium_until && new Date(user.premium_until) > now);
    let limitBytes = 100 * 1024 * 1024; // Ingyenes alapcsomag: 100 MB
    
    if (isPremium) {
      if (Number(user.premium_level) >= 2) {
        limitBytes = 5 * 1024 * 1024 * 1024; // Pro Prémium: 5 GB
      } else {
        limitBytes = 1 * 1024 * 1024 * 1024; // Alap Prémium: 1 GB
      }
    }

    let query = '';
    let queryParams = [];

    if (currentPhotoIdToExclude) {
      query = `
        SELECT COALESCE(SUM(GREATEST(file_size, 0)), 0) as total_bytes
        FROM (
          SELECT user_email, file_size FROM photo_portfolio WHERE id != ?
          UNION ALL
          SELECT user_email, file_size FROM photo_entries
          UNION ALL
          SELECT user_email, file_size FROM photo_homework_entries
        ) as all_photos
        WHERE user_email = ?
      `;
      queryParams = [currentPhotoIdToExclude, email];
    } else {
      query = `
        SELECT COALESCE(SUM(GREATEST(file_size, 0)), 0) as total_bytes
        FROM (
          SELECT user_email, file_size FROM photo_portfolio
          UNION ALL
          SELECT user_email, file_size FROM photo_entries
          UNION ALL
          SELECT user_email, file_size FROM photo_homework_entries
        ) as all_photos
        WHERE user_email = ?
      `;
      queryParams = [email];
    }

    const [storageRows] = await pool.query(query, queryParams);
    const currentBytes = Number(storageRows[0].total_bytes) || 0;

    if (currentBytes + incomingFileBytes > limitBytes) {
      const limitText = limitBytes >= 1024*1024*1024 ? `${limitBytes / (1024*1024*1024)} GB` : `${limitBytes / (1024*1024)} MB`;
      const currentMB = (currentBytes / (1024 * 1024)).toFixed(2);
      return { 
        allowed: false, 
        error: `❌ Tárhely megtelt! A csomagod korlátja ${limitText}. Jelenleg elhasznált: ${currentMB} MB. Kérjük, szabadíts fel helyet a galériádban, vagy válts nagyobb csomagra!` 
      };
    }

    return { allowed: true };
  }

  // ====================================================================
  // 1. KÉPEK ALAPADATAINAK LEKÉRÉSE (VÉDETT - Szivárgásmentesítve!)
  // ====================================================================
  app.get('/api/my-album', requireAuth, checkPremium, async (req, res) => {
    const targetEmail = req.query.userEmail;
    if (!targetEmail) return res.status(400).json({ error: 'Hiányzó email!' });

    // 🔒 BIZTONSÁGI PAJZS: Csak a saját albumodat töltheted le, kivéve ha igazoltan Admin vagy
    if (req.user.email !== targetEmail && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nem kérheted le más fotós privát albumát.' });
    }

    try { 
      const query = `
        SELECT p.*, 
          COALESCE(SUM(CASE WHEN e.award_id IS NOT NULL AND e.award_id NOT IN (0, 1, 15) THEN 1 ELSE 0 END), 0) as award_count,
          COALESCE(SUM(CASE WHEN e.award_id = 1 OR (e.achieved_score >= e.acceptance_score AND (e.award_id IS NULL OR e.award_id != 15)) THEN 1 ELSE 0 END), 0) as acceptance_count
        FROM photo_portfolio p
        LEFT JOIN photo_salon_entries e ON p.id = e.portfolio_id
        WHERE p.user_email = ?
        GROUP BY p.id
        ORDER BY p.title ASC
      `;
      const [rows] = await pool.query(query, [targetEmail]); 
      res.json(rows); 
    } catch (err) { 
      console.error(err);
      res.status(500).json({ error: 'Hiba a képek lekérésekor' }); 
    }
  });

  // ====================================================================
  // 📢 PORTFÓLIÓ KÉPEKHEZ TARTOZÓ SZALONEREDMÉNYEK TÉTELES LISTÁJA (VÉDETT)
  // ====================================================================
  app.get('/api/my-portfolio-results', requireAuth, checkPremium, async (req, res) => {
    const targetEmail = req.query.userEmail;
    if (!targetEmail) return res.status(400).json({ error: 'Hiányzó email!' });

    if (req.user.email !== targetEmail && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nincs jogosultságod más eredményeit megtekinteni.' });
    }

    try {
      const query = `
        SELECT 
          e.portfolio_id,
          s.name as salon_name,
          a.award_name,
          e.achieved_score,
          e.acceptance_score
        FROM photo_salon_entries e
        JOIN photo_salons s ON e.salon_id = s.id
        LEFT JOIN photo_awards a ON e.award_id = a.id
        WHERE e.user_email = ?
      `;
      const [rows] = await pool.query(query, [targetEmail]);
      res.json(rows);
    } catch (err) {
      console.error('❌ Hiba a portfolio results lekérésekor:', err);
      res.status(500).json({ error: 'Hiba a szalon eredmények lekérésekor' });
    }
  });

  // ====================================================================
  // 2. KÉP FELTÖLTÉSE AZ ALBUMBA (VÉDETT)
  // ====================================================================
  app.post('/api/my-album/upload', requireAuth, upload.single('photo'), checkPremium, async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Nincs fájl kiválasztva!' });

    const { userEmail, userName, title } = req.body;

    // 🔒 BIZTONSÁGI PAJZS: Szigorúan ellenőrizzük, hogy a saját tárhelyére tölt-e fel
    if (req.user.email !== userEmail) {
      cleanupTempFile(file);
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nem tölthetsz fel képet más fiókjába.' });
    }

    try {
      const incomingBytes = file.size || 0;
      const storageCheck = await checkStorageLimit(pool, req.user.email, incomingBytes);
      if (!storageCheck.allowed) {
        cleanupTempFile(file);
        return res.status(400).json({ error: storageCheck.error });
      }

      const safeUserName = userName || req.user.name || 'Fotós';
      const safeTitle = title || 'Cím nélkül';

      const fileStream = fs.createReadStream(file.path);
      const fileExt = file.originalname && file.originalname.includes('.') 
        ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() 
        : '.jpg';
      
      const driveRes = await drive.files.create({ 
        requestBody: { 
          name: `Portfolio_${safeUserName}_${Date.now()}${fileExt}`, 
          parents: [process.env.DRIVE_MASTER_FOLDER_ID] 
        }, 
        media: { mimeType: file.mimetype, body: fileStream }, 
        fields: 'id, webViewLink' 
      });
      
      cleanupTempFile(file);
      const fileSize = file.size || 0; 

      await pool.query(
        'INSERT INTO photo_portfolio (user_email, user_name, title, file_url, drive_file_id, file_size) VALUES (?, ?, ?, ?, ?, ?)', 
        [req.user.email, safeUserName, safeTitle, driveRes.data.webViewLink, driveRes.data.id, fileSize]
      );
      res.json({ success: true });
    } catch (err) { 
      cleanupTempFile(file);
      console.error('❌ HIBA A PORTFÓLIÓ FELTÖLTÉSEKOR:', err); 
      res.status(500).json({ error: 'Szerver hiba a mentéskor: ' + err.message }); 
    }
  });

  // ====================================================================
  // 3. KÉP SZERKESZTÉSE (VÉDETT - Felülírás elleni védelem)
  // ====================================================================
  app.put('/api/my-album/:id', requireAuth, upload.single('photo'), checkPremium, async (req, res) => {
    const file = req.file;
    const { title, title_hu } = req.body;

    try {
      // Szigorúan a hitelesített munkamenet-e-mail alapján ellenőrizzük a tulajdonjogot!
      const [rows] = await pool.query('SELECT * FROM photo_portfolio WHERE id = ? AND user_email = ?', [req.params.id, req.user.email]);
      
      if (rows.length === 0) {
        if (file) cleanupTempFile(file);
        return res.status(403).json({ error: 'Nincs jogosultságod módosítani ezt a képet, vagy a kép nem létezik!' });
      }
      
      if (file) {
        const incomingBytes = file.size || 0;
        const storageCheck = await checkStorageLimit(pool, req.user.email, incomingBytes, req.params.id);
        if (!storageCheck.allowed) {
          cleanupTempFile(file);
          return res.status(400).json({ error: storageCheck.error });
        }

        if (rows[0].drive_file_id) {
          await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(e => console.log('Régi kép törlése a Drive-ról sikertelen:', e.message));
        }
        
        const fileStream = fs.createReadStream(file.path);
        const fileExt = file.originalname && file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '.jpg';
        const userName = rows[0].user_name || req.user.name || 'Ismeretlen';
        
        const driveRes = await drive.files.create({ 
          requestBody: { name: `Portfolio_${userName}_Frissitett_${Date.now()}${fileExt}`, parents: [process.env.DRIVE_MASTER_FOLDER_ID] }, 
          media: { mimeType: file.mimetype, body: fileStream }, 
          fields: 'id, webViewLink' 
        });
        
        cleanupTempFile(file);
        const fileSize = req.file.size;
        
        await pool.query('UPDATE photo_portfolio SET title = ?, title_hu = ?, file_url = ?, drive_file_id = ?, file_size = ? WHERE id = ? AND user_email = ?', 
          [title, title_hu, driveRes.data.webViewLink, driveRes.data.id, fileSize, req.params.id, req.user.email]);
      } else {
        await pool.query('UPDATE photo_portfolio SET title = ?, title_hu = ? WHERE id = ? AND user_email = ?', 
          [title, title_hu, req.params.id, req.user.email]);
      }
      res.json({ success: true });
    } catch (err) { 
      if (file) cleanupTempFile(file);
      res.status(500).json({ error: 'Hiba a kép frissítésekor: ' + err.message }); 
    }
  });

  // ====================================================================
  // 4. KÉP TÖRLÉSE (VÉDETT - Illetéktelen törlés letiltva)
  // ====================================================================
  app.delete('/api/my-album/:id', requireAuth, checkPremium, async (req, res) => {
    try {
      // Szigorú ellenőrzés a hitelesített req.user.email segítségével!
      const [rows] = await pool.query('SELECT * FROM photo_portfolio WHERE id = ? AND user_email = ?', [req.params.id, req.user.email]);
      if (rows.length === 0) return res.status(403).json({ error: 'Nincs jogosultságod törölni ezt a képet!' });
      
      if (rows[0].drive_file_id) {
        await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(e => console.log(e.message));
      }
      
      await pool.query('DELETE FROM photo_portfolio WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Hiba a törlésnél' }); }
  });

  // ====================================================================
  // 5. TÁRHELY STATISZTIKA (VÉDETT - Szigorú Admin Kontroll!)
  // ====================================================================
  app.get('/api/admin/user-storage-stats', requireAuth, async (req, res) => {
    // 🔒 BIZTONSÁGI PAJZS: Megszünteti a teljes adatbázis-szivárgást! Csak az Admin láthatja
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Ez egy exkluzív adminisztrátori végpont.' });
    }

    try {
      const query = `
        SELECT user_email, COUNT(*) as total_photos, COALESCE(SUM(GREATEST(file_size, 0)), 0) as total_bytes
        FROM (
          SELECT user_email, file_size FROM photo_portfolio
          UNION ALL
          SELECT user_email, file_size FROM photo_entries
          UNION ALL
          SELECT user_email, file_size FROM photo_homework_entries
        ) as all_photos
        GROUP BY user_email
      `;
      const [rows] = await pool.query(query);
      res.json(rows);
    } catch (err) {
      console.error('Hiba a tárhely lekérésekor:', err);
      res.status(500).json({ error: 'Szerver hiba' });
    }
  });

  // ====================================================================
  // 6. VALÓDI AI KÉPELEMZÉS (VÉDETT)
  // ====================================================================
 // 🎯 GOLYÓÁLLÓ AI ELEMZÉS VÉGPONT TIMEOUT ÉS CORS VÉDELEMMEL (routes/album.js)
app.post('/api/my-album/:id/analyze', requireAuth, async (req, res) => {
  // Garantáljuk a CORS fejléceket minden válaszra (hiba esetén is)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  const photoId = req.params.id;
  const { userEmail } = req.body;

  try {
    // 1. Kép lekérése az adatbázisból
    const [photos] = await pool.query(
      'SELECT * FROM user_photos WHERE id = ? AND LOWER(user_email) = LOWER(?)',
      [photoId, userEmail]
    );

    if (photos.length === 0) {
      return res.status(404).json({ error: 'A kép nem található az adatbázisban!' });
    }

    const photo = photos[0];
    const imageUrl = photo.file_url || (photo.drive_file_id ? `https://lh3.googleusercontent.com/d/${photo.drive_file_id}` : null);

    if (!imageUrl) {
      return res.status(400).json({ error: 'A képhez nem tartozik érvényes hivatkozás.' });
    }

    // 2. Gemini AI Elemzés végrehajtása Max 22 másodperces időkorláttal
    const generateAiPromise = (async () => {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = "Analyze this photograph for a professional photo contest portfolio. Provide a concise technical evaluation and keywords.";

      // Kép letöltése Buffer-be az elemzéshez
      const fetch = (await import('node-fetch')).default;
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error("A képet nem sikerült letölteni az AI elemzéshez.");

      const imgBuffer = await imgRes.arrayBuffer();
      const imagePart = {
        inlineData: {
          data: Buffer.from(imgBuffer).toString("base64"),
          mimeType: imgRes.headers.get("content-type") || "image/jpeg"
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();

      return {
        evaluation: responseText,
        tags: "photography, portfolio, contest"
      };
    })();

    // Időtúllépési számláló (22 másodperc)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI_TIMEOUT')), 22000)
    );

    // Versenyeztetjük az AI hívást és a számlálót
    const aiResult = await Promise.race([generateAiPromise, timeoutPromise]);

    // 3. Eredmény elmentése az adatbázisba
    const aiTagsJson = JSON.stringify(aiResult);
    await pool.query('UPDATE user_photos SET ai_tags = ? WHERE id = ?', [aiTagsJson, photoId]);

    res.json({ success: true, ai_tags: aiTagsJson });

  } catch (err) {
    console.error("❌ Hiba az AI elemzés során:", err.message);

    if (err.message === 'AI_TIMEOUT') {
      return res.status(504).json({ 
        error: 'Az AI elemzés túllépte a maximális várakozási időt (22 mp). A Google Gemini szerverei leterheltek, kérlek próbáld újra pár pillanat múlva!' 
      });
    }

    res.status(500).json({ 
      error: `Szerveroldali hiba az AI elemzéskor: ${err.message}` 
    });
  }
});
