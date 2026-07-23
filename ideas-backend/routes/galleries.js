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
      // 3D Tárlat alap tábla
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_3d_galleries (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_email VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          theme VARCHAR(50) DEFAULT 'modern',
          visibility VARCHAR(20) DEFAULT 'public',
          photos_json LONGTEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_email (user_email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
      `);

      // Vendégkönyv tábla
      await pool.query(`
        CREATE TABLE IF NOT EXISTS gallery_guestbook (
          id INT AUTO_INCREMENT PRIMARY KEY,
          gallery_id INT NOT NULL,
          user_email VARCHAR(255) NOT NULL,
          comment_text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_gallery (gallery_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
      `);

      // Látogatási jegyzék tábla
      await pool.query(`
        CREATE TABLE IF NOT EXISTS gallery_visitors (
          id INT AUTO_INCREMENT PRIMARY KEY,
          gallery_id INT NOT NULL,
          user_email VARCHAR(255) NOT NULL,
          visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_gallery_visitor (gallery_id, user_email),
          INDEX idx_gallery_vis (gallery_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
      `);

    } catch (e) {
      console.error("⚠️ 3D Galéria táblák províziós hibája:", e.message);
    }
  }

  // 1. Összes elérhető tárlat lekérése
  app.get('/api/3d-galleries', requireAuth, async (req, res) => {
    try {
      await ensureTableExists();

      let myClubName = null;
      try {
        const [userRows] = await pool.query('SELECT club_name FROM photo_users WHERE email = ?', [req.user.email]);
        myClubName = userRows[0]?.club_name || null;
      } catch(e) {}

      const [rows] = await pool.query(`
        SELECT 
          g.*, 
          COALESCE(u.name, 'Fotóművész') as photographer_name, 
          u.avatar_url, 
          u.club_name,
          c.drive_logo_id,
          c.logo_url,
          (SELECT COUNT(*) FROM gallery_visitors WHERE gallery_id = g.id) as visitor_count,
          (SELECT COUNT(*) FROM gallery_guestbook WHERE gallery_id = g.id) as comment_count
        FROM user_3d_galleries g
        LEFT JOIN photo_users u ON g.user_email = u.email COLLATE utf8mb4_general_ci
        LEFT JOIN photo_clubs c ON u.club_name = c.name
        WHERE g.visibility = 'public'
           OR (g.visibility = 'club' AND u.club_name IS NOT NULL AND u.club_name = ?)
           OR g.user_email = ?
        ORDER BY g.updated_at DESC
      `, [myClubName || '', req.user.email]);

      const formatted = (rows || []).map(gal => {
        let photos = [];
        try { photos = typeof gal.photos_json === 'string' ? JSON.parse(gal.photos_json) : (gal.photos_json || []); } catch(e){}
        return { ...gal, photos };
      });

      res.json(formatted);
    } catch (err) {
      console.error("❌ Hiba a tárlatok lekérésekor:", err.message);
      res.json([]);
    }
  });

  // 2. Látogatás rögzítése (Belépéskor automatikusan meghívódik)
  app.post('/api/3d-gallery/:id/visit', requireAuth, async (req, res) => {
    try {
      await ensureTableExists();
      await pool.query(`
        INSERT INTO gallery_visitors (gallery_id, user_email, visited_at)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE visited_at = NOW()
      `, [req.params.id, req.user.email]);

      res.json({ success: true });
    } catch (err) {
      console.error("❌ Látogatás rögzítési hiba:", err.message);
      res.status(500).json({ error: 'Szerver hiba.' });
    }
  });

  // 3. Vendégkönyv és Látogatói jegyzék lekérése
  app.get('/api/3d-gallery/:id/interactions', requireAuth, async (req, res) => {
    try {
      await ensureTableExists();
      const galleryId = req.params.id;

      // Vendégkönyvi bejegyzések
      const [guestbook] = await pool.query(`
        SELECT 
          b.id, b.comment_text, b.created_at, b.user_email,
          COALESCE(u.name, 'Látogató') as user_name, u.avatar_url, u.club_name
        FROM gallery_guestbook b
        LEFT JOIN photo_users u ON b.user_email = u.email COLLATE utf8mb4_general_ci
        WHERE b.gallery_id = ?
        ORDER BY b.created_at DESC
      `, [galleryId]);

      // Látogatók listája
      const [visitors] = await pool.query(`
        SELECT 
          v.visited_at, v.user_email,
          COALESCE(u.name, 'Látogató') as user_name, u.avatar_url, u.club_name
        FROM gallery_visitors v
        LEFT JOIN photo_users u ON v.user_email = u.email COLLATE utf8mb4_general_ci
        WHERE v.gallery_id = ?
        ORDER BY v.visited_at DESC
      `, [galleryId]);

      res.json({ guestbook, visitors });
    } catch (err) {
      console.error("❌ Hiba az interakciók lekérésekor:", err.message);
      res.status(500).json({ error: 'Szerver hiba.' });
    }
  });

  // 4. Új bejegyzés írása a Vendégkönyvbe
  app.post('/api/3d-gallery/:id/guestbook', requireAuth, async (req, res) => {
    const { comment_text } = req.body;
    if (!comment_text || !comment_text.trim()) {
      return res.status(400).json({ error: 'A bejegyzés nem lehet üres!' });
    }

    try {
      await ensureTableExists();
      await pool.query(`
        INSERT INTO gallery_guestbook (gallery_id, user_email, comment_text)
        VALUES (?, ?, ?)
      `, [req.params.id, req.user.email, comment_text.trim()]);

      res.json({ success: true });
    } catch (err) {
      console.error("❌ Vendégkönyv mentési hiba:", err.message);
      res.status(500).json({ error: 'Szerver hiba a bejegyzés mentésekor.' });
    }
  });

  // 5. Galéria mentése (Új/Módosítás)
  app.post('/api/premium/3d-gallery/save', requireAuth, async (req, res) => {
    const { id, title, theme, visibility, photos } = req.body;
    const cleanTitle = (title || 'Saját Virtuális Kiállításom').trim();
    const cleanVis = visibility === 'club' ? 'club' : 'public';

    if (!Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ error: 'Legalább 1 fotó kiválasztása kötelező a mentéshez!' });
    }

    try {
      await ensureTableExists();
      const photosJson = JSON.stringify(photos.slice(0, 10));

      if (id) {
        const [result] = await pool.query(`
          UPDATE user_3d_galleries 
          SET title = ?, theme = ?, visibility = ?, photos_json = ? 
          WHERE id = ? AND (user_email = ? OR ?)
        `, [cleanTitle, theme || 'modern', cleanVis, photosJson, id, req.user.email, req.user.isAdmin]);

        if (result.affectedRows === 0) {
          return res.status(403).json({ error: 'Nincs jogosultságod ezt a tárlatot módosítani.' });
        }
      } else {
        await pool.query(`
          INSERT INTO user_3d_galleries (user_email, title, theme, visibility, photos_json)
          VALUES (?, ?, ?, ?, ?)
        `, [req.user.email, cleanTitle, theme || 'modern', cleanVis, photosJson]);
      }

      res.json({ success: true });
    } catch (err) {
      console.error("❌ 3D Galéria mentési hiba:", err.message);
      res.status(500).json({ error: 'Nem sikerült elmenteni a galériát.' });
    }
  });

  // 6. Tárlat törlése ID alapján
  app.delete('/api/premium/3d-gallery/:id', requireAuth, async (req, res) => {
    try {
      await ensureTableExists();
      const [result] = await pool.query(`
        DELETE FROM user_3d_galleries 
        WHERE id = ? AND (user_email = ? OR ?)
      `, [req.params.id, req.user.email, req.user.isAdmin]);

      if (result.affectedRows === 0) {
        return res.status(403).json({ error: 'Nincs jogosultságod törölni ezt a tárlatot.' });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("❌ 3D Galéria törlési hiba:", err.message);
      res.status(500).json({ error: 'Szerver hiba a törléskor.' });
    }
  });

};
