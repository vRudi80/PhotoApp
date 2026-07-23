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
          visibility VARCHAR(20) DEFAULT 'public',
          photos_json LONGTEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_user_gallery (user_email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Oszlop ellenőrzése és hozzáadása ha korábbi verzióról frissülne
      try {
        await pool.query(`ALTER TABLE user_3d_galleries ADD COLUMN visibility VARCHAR(20) DEFAULT 'public'`);
      } catch (e) {}

    } catch (e) {
      console.error("⚠️ 3D Galéria tábla hiba:", e.message);
    }
  }

  // 1. Összes elérhető tárlat lekérése (Publikus + Saját Klub)
  app.get('/api/3d-galleries', requireAuth, async (req, res) => {
    try {
      await ensureTableExists();

      // Lekérjük a kérelmező fotóklubját
      const [userRows] = await pool.query('SELECT club_name FROM photo_users WHERE email = ?', [req.user.email]);
      const myClubName = userRows[0]?.club_name || null;

      const [rows] = await pool.query(`
        SELECT 
          g.*, 
          u.name as photographer_name, 
          u.avatar_url, 
          u.club_name,
          c.drive_logo_id,
          c.logo_url
        FROM user_3d_galleries g
        JOIN photo_users u ON g.user_email = u.email
        LEFT JOIN photo_clubs c ON u.club_name = c.name
        WHERE g.visibility = 'public'
           OR (g.visibility = 'club' AND u.club_name IS NOT NULL AND u.club_name = ?)
           OR g.user_email = ?
        ORDER BY g.updated_at DESC
      `, [myClubName, req.user.email]);

      const formatted = rows.map(gal => {
        let photos = [];
        try { photos = typeof gal.photos_json === 'string' ? JSON.parse(gal.photos_json) : (gal.photos_json || []); } catch(e){}
        return { ...gal, photos };
      });

      res.json(formatted);
    } catch (err) {
      console.error("❌ Hiba a tárlatok lekérésekor:", err.message);
      res.status(500).json({ error: 'Szerver hiba.' });
    }
  });

  // 2. Saját galéria lekérése
  app.get('/api/premium/3d-gallery/my', requireAuth, async (req, res) => {
    try {
      await ensureTableExists();
      const [rows] = await pool.query('SELECT * FROM user_3d_galleries WHERE user_email = ?', [req.user.email]);
      if (!rows || rows.length === 0) return res.json({ gallery: null });

      const gal = rows[0];
      let photos = [];
      try { photos = typeof gal.photos_json === 'string' ? JSON.parse(gal.photos_json) : (gal.photos_json || []); } catch(e){}

      res.json({ gallery: { ...gal, photos } });
    } catch (err) {
      res.json({ gallery: null });
    }
  });

  // 3. Galéria mentése (Címekkel és láthatósággal)
  app.post('/api/premium/3d-gallery/save', requireAuth, async (req, res) => {
    const { title, theme, visibility, photos } = req.body;
    const cleanTitle = (title || 'Saját Virtuális Kiállításom').trim();
    const cleanVis = visibility === 'club' ? 'club' : 'public';

    if (!Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ error: 'Legalább 1 fotó kiválasztása kötelező a mentéshez!' });
    }

    try {
      await ensureTableExists();
      const photosJson = JSON.stringify(photos.slice(0, 10));

      await pool.query(`
        INSERT INTO user_3d_galleries (user_email, title, theme, visibility, photos_json)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          title = VALUES(title), 
          theme = VALUES(theme), 
          visibility = VALUES(visibility), 
          photos_json = VALUES(photos_json)
      `, [req.user.email, cleanTitle, theme || 'modern', cleanVis, photosJson]);

      res.json({ success: true });
    } catch (err) {
      console.error("❌ 3D Galéria mentési hiba:", err.message);
      res.status(500).json({ error: 'Nem sikerült elmenteni a galériát.' });
    }
  });

};
