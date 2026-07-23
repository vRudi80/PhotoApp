const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kovari.rudolf@gmail.com";

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token hiányzik!' });
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
    req.user = { email: payload.email, name: payload.name, isAdmin: payload.email === ADMIN_EMAIL };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Érvénytelen munkamenet!' });
  }
}

module.exports = function(app, pool) {

  async function ensureTableExists() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_3d_galleries (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_email VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          theme VARCHAR(50) DEFAULT 'modern',
          photos_json LONGTEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_user_gallery (user_email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    } catch (e) {
      console.error("⚠️ 3D Galéria tábla províziós hiba:", e.message);
    }
  }

  // 1. Saját galéria beállításainak lekérése
  app.get('/api/premium/3d-gallery/my', requireAuth, async (req, res) => {
    try {
      await ensureTableExists();

      const [rows] = await pool.query('SELECT * FROM user_3d_galleries WHERE user_email = ?', [req.user.email]);
      if (!rows || rows.length === 0) {
        return res.json({ gallery: null });
      }

      const gal = rows[0];
      let photos = [];
      try { 
        photos = typeof gal.photos_json === 'string' ? JSON.parse(gal.photos_json) : (gal.photos_json || []); 
      } catch(e){
        photos = [];
      }

      res.json({ gallery: { ...gal, photos } });
    } catch (err) {
      console.error("❌ 3D Galéria lekérési hiba:", err.message);
      res.json({ gallery: null });
    }
  });

  // 2. Galéria mentése / frissítése (Megengedő validációval)
  app.post('/api/premium/3d-gallery/save', requireAuth, async (req, res) => {
    const { title, theme, photos } = req.body;
    const cleanTitle = (title || 'Saját Virtuális Kiállításom').trim();

    if (!Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ error: 'Legalább 1 fotó kiválasztása kötelező a mentéshez!' });
    }

    try {
      await ensureTableExists();
      const photosJson = JSON.stringify(photos.slice(0, 10)); // Max 10 kép

      await pool.query(`
        INSERT INTO user_3d_galleries (user_email, title, theme, photos_json)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE title = VALUES(title), theme = VALUES(theme), photos_json = VALUES(photos_json)
      `, [req.user.email, cleanTitle, theme || 'modern', photosJson]);

      res.json({ success: true });
    } catch (err) {
      console.error("❌ 3D Galéria mentési hiba:", err.message);
      res.status(500).json({ error: 'Nem sikerült elmenteni a galériát: ' + err.message });
    }
  });

  // 3. Bárki által megtekinthető nyilvános galéria lekérés
  app.get('/api/3d-gallery/view/:email', async (req, res) => {
    try {
      await ensureTableExists();

      const [rows] = await pool.query(`
        SELECT g.*, u.name as photographer_name, u.avatar_url 
        FROM user_3d_galleries g
        JOIN photo_users u ON g.user_email = u.email
        WHERE g.user_email = ?
      `, [req.params.email]);

      if (!rows || rows.length === 0) return res.status(404).json({ error: 'A keresett virtuális galéria nem található.' });

      const gal = rows[0];
      let photos = [];
      try { 
        photos = typeof gal.photos_json === 'string' ? JSON.parse(gal.photos_json) : (gal.photos_json || []); 
      } catch(e){
        photos = [];
      }

      res.json({ ...gal, photos });
    } catch (err) {
      res.status(500).json({ error: 'Szerver hiba.' });
    }
  });

};
