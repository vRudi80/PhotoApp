const fs = require('fs');
const path = require('path'); 
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Átmeneti mappa a feltöltött képeknek

// A modul elejére beemeljük a szükséges biztonsági csomagot a Google token hitelesítéshez
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kovari.rudolf@gmail.com";

// Cloudinary konfiguráció szinkronizálása a környezeti változókkal
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ====================================================================
// 🔒 GOLYÓÁLLÓ AUTHENTICATION MIDDLEWARE A PROFIL VÉGPONTOKHOZ
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
    console.error("🔒 Biztonsági őr hiba a profil modulban:", error.message);
    return res.status(401).json({ error: 'Lejárt vagy érvénytelen munkamenet token!' });
  }
}

module.exports = function(app, pool) {
  
  // ====================================================================
  // 📸 1. ÚJ VÉGPONT: Profilkép feltöltése CLOUDINARY-RE (Védett - IDOR Fix)
  // ====================================================================
  app.post('/api/users/:email/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
    const { email } = req.params;
    const file = req.file;

    // Biztonsági IDOR ellenőrzés: csak a saját képedet cserélheted, kivéve ha Admin vagy
    if (req.user.email !== email && !req.user.isAdmin) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nem módosíthatod más profilképét.' });
    }

    if (!file) return res.status(400).json({ error: 'Nem választottál ki fájlt a feltöltéshez!' });

    try {
      // Feltöltjük a képet a Cloudinary 'felhasznaloi_avatarok' mappájába, optimalizált méretben
      const result = await cloudinary.uploader.upload(file.path, { 
        folder: 'felhasznaloi_avatarok', 
        width: 400, 
        height: 400, 
        crop: "fill", 
        gravity: "face", 
        quality: "auto:good" 
      });

      // Átmeneti helyi fájl azonnali takarítása a node szerverről
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

      // 🎯 MENTÉS: Beírjuk a generált Cloudinary secure_url-t a felhasználó 'avatar_url' oszlopába
      await pool.query('UPDATE photo_users SET avatar_url = ? WHERE email = ?', [result.secure_url, email]);

      res.json({ success: true, avatar_url: result.secure_url });
    } catch (err) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      console.error("❌ Cloudinary profilkép feltöltési hiba:", err.message);
      res.status(500).json({ error: 'Nem sikerült feltölteni a képet a Cloudinary tárhelyre.' });
    }
  });

  // ====================================================================
  // 🏛️ 2. Klubok listájának lekérése (Meglévő kódod alapján)
  // ====================================================================
  app.get('/api/clubs', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM photo_clubs ORDER BY name ASC');
      res.json(rows);
    } catch (err) {
      console.error("Hiba a klubok lekérésekor:", err);
      res.status(500).json({ error: 'Hiba a klubok lekérésekor' });
    }
  });

  // ====================================================================
  // 🏢 3. Felhasználó klubjának frissítése (Meglévő kódod alapján)
  // ====================================================================
  app.put('/api/users/update-club', async (req, res) => {
    const { email, clubId } = req.body;
    if (!email) return res.status(400).json({ error: 'Hiányzó email cím!' });

    try {
      if (!clubId) {
        await pool.query('UPDATE photo_users SET club_id = NULL, club_name = NULL WHERE email = ?', [email]);
        return res.json({ success: true, message: 'Sikeresen kiléptél a klubból!' });
      }

      const [clubRows] = await pool.query('SELECT name FROM photo_clubs WHERE id = ?', [clubId]);
      if (clubRows.length === 0) return res.status(404).json({ error: 'A választott klub nem létezik!' });
      const clubName = clubRows[0].name;

      await pool.query('UPDATE photo_users SET club_id = ?, club_name = ? WHERE email = ?', [clubId, clubName, email]);
      res.json({ success: true, message: 'Klubtagság sikeresen frissítve!' });
    } catch (err) {
      console.error("Klub mentési hiba:", err);
      res.status(500).json({ error: 'Hiba a mentés során' });
    }
  });

  // ====================================================================
  // 👤 4. Felhasználó nevének módosítása (Meglévő kódod alapján)
  // ====================================================================
  app.put('/api/users/update-name', async (req, res) => {
    const { email, newName } = req.body;
    if (!email || !newName || !newName.trim()) {
      return res.status(400).json({ error: 'A név megadása kötelező!' });
    }

    try {
      await pool.query('UPDATE photo_users SET name = ? WHERE email = ?', [newName.trim(), email]);
      await pool.query('UPDATE weekly_entries SET user_name = ? WHERE user_email = ?', [newName.trim(), email]);
      res.json({ success: true, message: 'Név sikeresen frissítve minden felületen!' });
    } catch (err) {
      console.error("Névmódosítási hiba az adatbázisban:", err);
      res.status(500).json({ error: 'Szerveroldali hiba történt a név mentésekor.' });
    }
  });

  // ====================================================================
  // 🛠️ 5. Klub átnevezése az Admin felületen (Meglévő kódod alapján)
  // ====================================================================
  app.put('/api/clubs/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'A név megadása kötelező!' });

    try {
      await pool.query('UPDATE photo_clubs SET name = ? WHERE id = ?', [name, id]);
      await pool.query('UPDATE photo_users SET club_name = ? WHERE club_id = ?', [name, id]);
      res.json({ success: true, message: 'Klub sikeresen átnevezve!' });
    } catch (err) {
      console.error("Klub szerkesztési hiba:", err);
      res.status(500).json({ error: err.message });
    }
  });

};
