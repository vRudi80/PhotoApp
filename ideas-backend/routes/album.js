const fs = require('fs');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
    console.error("🔒 Biztonsági őr hiba az album modulban:", error.message);
    return res.status(401).json({ error: 'Lejárt vagy érvénytelen munkamenet token!' });
  }
}

// 🎯 KÉP DÍNAMIKUS MIME-TÍPUS FELISMERŐ
function detectMimeType(buffer, url) {
  if (buffer && buffer.length > 4) {
    // Magic bytes ellenőrzés
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg';
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image/png';
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return 'image/webp';
  }
  if (url) {
    const lower = url.toLowerCase();
    if (lower.includes('.png')) return 'image/png';
    if (lower.includes('.webp')) return 'image/webp';
  }
  return 'image/jpeg';
}

function getOptimizedUrlForAi(originalUrl) {
  if (!originalUrl) return originalUrl;

  if (originalUrl.includes('cloudinary.com') && originalUrl.includes('/upload/')) {
    return originalUrl.replace('/upload/', '/upload/w_1024,h_1024,c_limit,q_auto:eco/');
  }

  if (originalUrl.includes('googleusercontent.com')) {
    const baseUrl = originalUrl.split('=')[0];
    return `${baseUrl}=s1024`;
  }

  return originalUrl;
}

module.exports = function(app, pool, drive, genAI, upload, cleanupTempFile, checkPremium) {
  
  async function checkStorageLimit(pool, email, incomingFileBytes, currentPhotoIdToExclude = null) {
    const [userRows] = await pool.query(
      'SELECT is_premium, premium_until, premium_level FROM photo_users WHERE email = ?', 
      [email]
    );
    if (userRows.length === 0) return { allowed: false, error: 'Felhasználó nem található!' };

    const user = userRows[0];
    const now = new Date();
    
    const isPremium = user.is_premium === 1 || (user.premium_until && new Date(user.premium_until) > now);
    let limitBytes = 100 * 1024 * 1024;
    
    if (isPremium) {
      if (Number(user.premium_level) >= 2) {
        limitBytes = 5 * 1024 * 1024 * 1024;
      } else {
        limitBytes = 1 * 1024 * 1024 * 1024;
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

  // 1. KÉPEK ALAPADATAINAK LEKÉRÉSE
  app.get('/api/my-album', requireAuth, checkPremium, async (req, res) => {
    const targetEmail = req.query.userEmail;
    if (!targetEmail) return res.status(400).json({ error: 'Hiányzó email!' });

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

  // PORTFÓLIÓ EREDMÉNYEK
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

  // 2. KÉP FELTÖLTÉSE AZ ALBUMBA
  app.post('/api/my-album/upload', requireAuth, upload.single('photo'), checkPremium, async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Nincs fájl kiválasztva!' });

    const { userEmail, userName, title } = req.body;

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

  // 3. KÉP SZERKESZTÉSE
  app.put('/api/my-album/:id', requireAuth, upload.single('photo'), checkPremium, async (req, res) => {
    const file = req.file;
    const { title, title_hu } = req.body;

    try {
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

  // 4. KÉP TÖRLÉSE
  app.delete('/api/my-album/:id', requireAuth, checkPremium, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM photo_portfolio WHERE id = ? AND user_email = ?', [req.params.id, req.user.email]);
      if (rows.length === 0) return res.status(403).json({ error: 'Nincs jogosultságod törölni ezt a képet!' });
      
      if (rows[0].drive_file_id) {
        await drive.files.delete({ fileId: rows[0].drive_file_id }).catch(e => console.log(e.message));
      }
      
      await pool.query('DELETE FROM photo_portfolio WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Hiba a törlésnél' }); }
  });

  // 5. TÁRHELY STATISZTIKA
  app.get('/api/admin/user-storage-stats', requireAuth, async (req, res) => {
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
  // 6. VALÓDI AI KÉPELEMZÉS (DINAMIKUS FORMÁTUM ÉS PONTOS BÁJT LEKÉRÉS)
  // ====================================================================
  app.post('/api/my-album/:id/analyze', requireAuth, checkPremium, async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    const photoId = req.params.id;

    try {
      const [rows] = await pool.query('SELECT * FROM photo_portfolio WHERE id = ? AND user_email = ?', [photoId, req.user.email]);
      if (rows.length === 0) return res.status(403).json({ error: 'Nincs jogosultságod vagy a kép nem található!' });
      
      const photo = rows[0];
      let buffer = null;
      let detectedMime = 'image/jpeg';

      // 1. Google Drive kép letöltése
      if (photo.drive_file_id && photo.drive_file_id.trim().length > 5) {
        const driveRes = await drive.files.get(
          { fileId: photo.drive_file_id, alt: 'media' },
          { responseType: 'arraybuffer' }
        );
        buffer = Buffer.from(driveRes.data);
        detectedMime = detectMimeType(buffer, null);
      } 
      // 2. Cloudinary vagy egyéb URL letöltés
      else if (photo.file_url) {
        const optimizedUrl = getOptimizedUrlForAi(photo.file_url);
        const fetch = (await import('node-fetch')).default;
        const imgRes = await fetch(optimizedUrl);
        
        if (!imgRes.ok) throw new Error("A képet nem sikerült letölteni a megadott hivatkozásról.");
        
        const contentType = imgRes.headers.get("content-type");
        const arrayBuffer = await imgRes.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        
        detectedMime = (contentType && contentType.startsWith('image/')) 
          ? contentType.split(';')[0] 
          : detectMimeType(buffer, photo.file_url);
      } else {
        return res.status(400).json({ error: 'A képhez nem tartozik érvényes Google Drive azonosító vagy URL.' });
      }

      const base64Image = buffer.toString('base64');
      buffer = null; // Memória azonnali felszabadítása

      // 3. Gemini AI Elemzés (Hivatalos gemini-1.5-flash)
      const generateAiPromise = (async () => {
        const model = genAI.getGenerativeModel({ 
          model: "gemini-1.5-flash",
          generationConfig: { responseMimeType: "application/json" } 
        });

        const prompt = `Te egy szigorú nemzetközi fotós zsűri vagy (FIAP/PSA szabályrendszer). Kérlek, elemezd ezt a fotót. 
  KIZÁRÓLAG egy érvényes JSON objektumot adj vissza!
  A JSON pontos struktúrája ez legyen:
  {
    "evaluation": "Ide írj egy 2-3 mondatos magyar nyelvű, professzionális, őszinte zsűri értékelést. Térj ki a kompozícióra, fényekre, és a kategóriára. Ne használj idézőjeleket ezen a szövegen belül!",
    "tags": "ide jöjjön 6-8 angol kulcsszó vesszővel elválasztva (pl: monochrome, portrait)"
  }`;

        const imagePart = { inlineData: { data: base64Image, mimeType: detectedMime } };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        let text = response.text();

        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) throw new Error("Hibás válaszformátum érkezett az AI-tól.");

        text = text.substring(jsonStart, jsonEnd + 1);
        JSON.parse(text); 
        return text;
      })();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI_TIMEOUT')), 20000)
      );

      const aiTagsText = await Promise.race([generateAiPromise, timeoutPromise]);

      await pool.query('UPDATE photo_portfolio SET ai_tags = ? WHERE id = ?', [aiTagsText, photoId]);
      res.json({ success: true, ai_tags: aiTagsText });

    } catch (err) {
      console.error('❌ Gemini hiba:', err.message);

      if (err.message === 'AI_TIMEOUT') {
        return res.status(504).json({ 
          error: 'Az AI elemzés túllépte a várakozási időt. Kérlek próbáld újra pár pillanat múlva!' 
        });
      }

      if (err.message.includes('503') || err.message.includes('overloaded')) {
        return res.status(503).json({ error: 'Az AI szerverek leterheltek. Próbáld újra 1-2 perc múlva!' });
      }

      return res.status(500).json({ error: `AI elemzés sikertelen: ${err.message}` });
    }
  });
};
