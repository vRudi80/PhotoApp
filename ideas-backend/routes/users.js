// A modul elejére beemeljük a szükséges biztonsági csomagot a tokengeneráláshoz/ellenőrzéshez
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const multer = require('multer'); 
const upload = multer({ dest: 'uploads/' }); // Átmeneti mappa a feltöltött fájlnak
const fs = require('fs'); 
const cloudinary = require('cloudinary').v2; // 🎯 ÚJ: Cloudinary integráció behúzása

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kovari.rudolf@gmail.com';

// ====================================================================
// 🔒 GOLYÓÁLLÓ AUTHENTICATION MIDDLEWARE
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
    console.error("🔒 Biztonsági őr hiba:", error.message);
    return res.status(401).json({ error: 'Lejárt vagy érvénytelen munkamenet token!' });
  }
}

module.exports = function(app, pool) {
  
  // ====================================================================
  // 📸 ÚJ VÉGPONT: Profilkép feltöltése CLOUDINARY-RA (IDOR & GDPR védett)
  // ====================================================================
  app.post('/api/users/:email/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
    const { email } = req.params;
    const file = req.file;

    // Biztonsági ellenőrzés: csak a saját képedet cserélheted, kivéve ha Admin vagy
    if (req.user.email !== email && !req.user.isAdmin) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nem módosíthatod más profilképét.' });
    }

    if (!file) return res.status(400).json({ error: 'Nem választottál ki fájlt a feltöltéshez!' });

    try {
      // 🎯 Kép feltöltése a Cloudinary tárhelyedre egy dedikált mappába
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'photawesome_avatars',
        resource_type: 'image'
      });

      // Átmeneti helyi fájl azonnali törlése a Node szerverről a feltöltés után
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

      // Elmentjük a biztonságos HTTPS Cloudinary linket az 'avatar_url' oszlopba
      await pool.query('UPDATE photo_users SET avatar_url = ? WHERE email = ?', [result.secure_url, email]);

      // Visszaküldjük a frontendnek pontosan azt a mezőt, amit vár
      res.json({ success: true, avatar_url: result.secure_url });
    } catch (err) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      console.error("❌ Hiba a profilkép Cloudinary-ra mentésekor:", err);
      res.status(500).json({ error: 'Nem sikerült feltölteni a profilképet a Cloudinary rendszerébe.' });
    }
  });

  // ====================================================================
  // 🔐 PRÉMIUM AJÁNDÉKKAL ELLÁTOTT AUTH SZINKRONIZÁCIÓS VÉGPONT (Nyitott)
  // ====================================================================
  app.post('/api/auth/sync', async (req, res) => {
    const { email, name, sub } = req.body;
    if (!email) return res.status(400).json({ error: 'Email megadása kötelező.' });
    
    try {
      // 🎯 JAVÍTVA: Beillesztettük a registered_at oszlopot és a NOW() értéket.
      // Új felhasználónál a registered_at és a last_login is NOW() lesz.
      // Visszatérő felhasználónál csak az UPDATE ág fut le, így a registered_at érintetlen marad!
      await pool.query(
        `INSERT INTO photo_users (google_id, email, name, last_login, registered_at, is_premium, premium_level, premium_until) 
         VALUES (?, ?, ?, NOW(), NOW(), 1, 1, DATE_ADD(NOW(), INTERVAL 7 DAY)) 
         ON DUPLICATE KEY UPDATE last_login = NOW()`, 
        [sub, email, name]
      );
      
      const [rows] = await pool.query('SELECT is_premium, premium_until, premium_level FROM photo_users WHERE email = ?', [email]);
      const userDb = rows[0];
      const now = new Date();
      const premiumUntil = userDb.premium_until ? new Date(userDb.premium_until) : null;
      const isPremiumActive = (userDb.is_premium === 1 && premiumUntil && premiumUntil > now);
  
      res.json({ 
        success: true, 
        isPremium: isPremiumActive, 
        premiumLevel: userDb.premium_level, 
        premiumUntil: userDb.premium_until 
      });
    } catch (err) { 
      console.error("🔥 Hiba az auth szinkronizációnál:", err.message);
      res.status(500).json({ error: 'Adatbázis hiba az auth szinkronizációnál' }); 
    }
  });

  
  // ====================================================================
  // 🎯 Felhasználók listája (Intelligens szűréssel!)
  // ====================================================================
  app.get('/api/users', requireAuth, async (req, res) => {
    try {
      if (req.user.isAdmin) {
        const [rows] = await pool.query(`
          SELECT 
            google_id, email, name, last_login, club_name, club_role, 
            is_premium, premium_until, stripe_customer_id, premium_level, 
            club_id, swap_balance, rank_level, referral_code, referred_by,
            phone_number, shipping_address, association_id, avatar_url 
          FROM photo_users
          ORDER BY name ASC
        `);
        return res.json(rows);
      }

      const [publicRows] = await pool.query(`
        SELECT 
          email, name, club_name, club_role, 
          is_premium, premium_level, club_id, 
          rank_level, avatar_url 
        FROM photo_users
        ORDER BY name ASC
      `);
      return res.json(publicRows);

    } catch (err) {
      console.error("❌ Hiba a photo_users lekérésekor:", err);
      res.status(500).json({ error: 'Nem sikerült betölteni a felhasználókat.' });
    }
  });

  // ====================================================================
  // 👤 Egy konkrét felhasználó adatlapjának lekérése
  // ====================================================================
  app.get('/api/users/:email', requireAuth, async (req, res) => {
    const { email } = req.params;
    
    if (req.user.email !== email && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Mások részletes profilja nem kérhető le.' });
    }

    try {
      const [rows] = await pool.query(`
        SELECT 
          u.*, 
          COALESCE(p.ai_count, 0) AS ai_usage_count
        FROM photo_users u
        LEFT JOIN (
          SELECT user_email, COUNT(*) AS ai_count 
          FROM photo_portfolio 
          WHERE ai_tags IS NOT NULL 
            AND TRIM(ai_tags) != '' 
            AND ai_tags != '[]'
          GROUP BY user_email
        ) p ON u.email = p.user_email
        WHERE u.email = ?
      `, [email]);
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Felhasználó nem található!' });
      }

      const userProfile = rows[0];
      userProfile.ai_usage_count = Number(userProfile.ai_usage_count) || 0;

      if (!req.user.isAdmin) {
        delete userProfile.stripe_customer_id;
      }

      res.json(userProfile);
    } catch (err) {
      console.error("❌ Hiba az egyéni profil lekérésekor:", err);
      res.status(500).json({ error: 'Szerveroldali hiba történt.' });
    }
  });
  
  // ====================================================================
  // 👤 HIVATALOS MAFOSZ PROFIL ADATOK MENTÉSE (IDOR Fix)
  // ====================================================================
  app.put('/api/users/:email/extended-profile', requireAuth, async (req, res) => {
    const { email } = req.params;
    const { name, phone_number, shipping_address, association_id } = req.body;

    if (req.user.email !== email && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nem módosíthatod más felhasználó profilját.' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'A hivatalos név megadása kötelező!' });
    }

    try {
      await pool.query(
        `UPDATE photo_users 
         SET name = ?, phone_number = ?, shipping_address = ?, association_id = ? 
         WHERE email = ?`,
        [name.trim(), phone_number?.trim() || null, shipping_address?.trim() || null, association_id?.trim() || null, email]
      );
      
      await pool.query('UPDATE weekly_entries SET user_name = ? WHERE user_email = ?', [name.trim(), email]);
      res.json({ success: true, message: 'Profil adatok sikeresen frissítve!' });
    } catch (err) {
      console.error("🔥 Hiba a hivatalos profil mentésekor:", err.message);
      res.status(500).json({ error: 'Adatbázis hiba a profil mentése során.' });
    }
  });

  // ====================================================================
  // 👑 EXKLUZÍV ADMIN VÉGPONT
  // ====================================================================
  app.get('/api/admin/exclusive-users', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Ez egy exkluzív adminisztrátori végpont.' });
    }

    try {
      const [rows] = await pool.query(`
        SELECT 
          u.*, 
          COALESCE(p.ai_count, 0) AS ai_usage_count
        FROM photo_users u
        LEFT JOIN (
          SELECT user_email, COUNT(*) AS ai_count 
          FROM photo_portfolio 
          WHERE ai_tags IS NOT NULL 
            AND TRIM(ai_tags) != '' 
            AND ai_tags != '[]'
          GROUP BY user_email
        ) p ON u.email = p.user_email
        ORDER BY u.name ASC
      `);
      
      res.json(rows);
    } catch (err) {
      console.error("❌ Hiba az exkluzív admin felhasználó listázásakor:", err);
      res.status(500).json({ error: 'Szerveroldali hiba történt az admin lista lekérésekor.' });
    }
  });

  // ====================================================================
  // 🛡️ Felhasználó klubjának és szerepkörének módosítása (Admin felület)
  // ====================================================================
  app.put('/api/users/:email', requireAuth, async (req, res) => {
    const { email } = req.params;
    const { clubName, clubRole, clubId } = req.body;

    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Csak adminisztrátor módosíthatja a tagsági szerepköröket.' });
    }

    try {
      await pool.query(
        'UPDATE photo_users SET club_name = ?, club_role = ?, club_id = ? WHERE email = ?',
        [clubName || null, clubRole || 'member', clubId || null, email]
      );
      
      res.json({ success: true });
    } catch (err) {
      console.error("🔥 Hiba a felhasználó klubjának mentésekor:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ====================================================================
  // 👨‍⚖️ Zsűri kezelő végpontok
  // ====================================================================
  app.get('/api/jury', requireAuth, async (req, res) => {
    try { 
      const [rows] = await pool.query('SELECT * FROM photo_jury'); 
      res.json(rows); 
    } catch (err) { 
      res.status(500).json({ error: 'Hiba' }); 
    }
  });
  
  app.post('/api/jury', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Csak admin adhat hozzá zsűritagokat.' });
    try { 
      await pool.query('INSERT IGNORE INTO photo_jury (contest_id, user_email) VALUES (?, ?)', [req.body.contestId, req.body.userEmail]); 
      res.json({ success: true }); 
    } catch (err) { 
      res.status(500).json({ error: 'Hiba' }); 
    }
  });
  
  app.delete('/api/jury', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Csak admin törölhet zsűritagokat.' });
    try { 
      await pool.query('DELETE FROM photo_jury WHERE contest_id = ? AND user_email = ?', [req.body.contestId, req.body.userEmail]); 
      res.json({ success: true }); 
    } catch (err) { 
      res.status(500).json({ error: 'Hiba' }); 
    }
  });

};
