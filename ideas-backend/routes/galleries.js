const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const PointsService = require('../PointsService');

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
          INDEX idx_user_email (user_email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS gallery_guestbook (
          id INT AUTO_INCREMENT PRIMARY KEY,
          gallery_id INT NOT NULL,
          user_email VARCHAR(255) NOT NULL,
          comment_text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_gallery (gallery_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS gallery_visitors (
          id INT AUTO_INCREMENT PRIMARY KEY,
          gallery_id INT NOT NULL,
          user_email VARCHAR(255) NOT NULL,
          visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_gallery_visitor (gallery_id, user_email),
          INDEX idx_gallery_vis (gallery_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

    } catch (e) {
      console.error("⚠️ 3D Galéria táblák províziós hibája:", e.message);
    }
  }

  // 1. Összes elérhető tárlat lekérése (SQL COLLATION-PROOF CSOMAGOLÁS)
  app.get('/api/3d-galleries', requireAuth, async (req, res) => {
    try {
      await ensureTableExists();

      // 1. Lekérjük a tárlatokat JOIN nélkül (kikerülve a MySQL collation hibát)
      const [galleries] = await pool.query('SELECT * FROM user_3d_galleries ORDER BY updated_at DESC');

      // 2. Lekérjük a felhasználói profilokat
      const [users] = await pool.query('SELECT email, name, avatar_url, club_name FROM photo_users');
      const userMap = new Map();
      (users || []).forEach(u => {
        if (u.email) userMap.set(u.email.trim().toLowerCase(), u);
      });

      const currentAuthEmail = (req.user.email || '').trim().toLowerCase();
      const currentUserObj = userMap.get(currentAuthEmail);
      const myClubName = currentUserObj?.club_name || '';

      const formatted = await Promise.all((galleries || []).map(async (gal) => {
        const ownerEmail = (gal.user_email || '').trim().toLowerCase();
        const uInfo = userMap.get(ownerEmail) || {};

        const vis = (gal.visibility || 'public').trim().toLowerCase();
        const isOwner = (ownerEmail === currentAuthEmail || req.user.isAdmin);
        const isPublic = (vis === '' || vis === 'public');
        const isSameClub = (vis === 'club' && uInfo.club_name && uInfo.club_name === myClubName);

        // Szűrés láthatóság szerint
        if (!isPublic && !isOwner && !isSameClub) {
          return null;
        }

        let photos = [];
        try { 
          photos = typeof gal.photos_json === 'string' ? JSON.parse(gal.photos_json) : (gal.photos_json || []); 
          if (typeof photos === 'string') photos = JSON.parse(photos);
        } catch(e){ photos = []; }

        let visitor_count = 0;
        let comment_count = 0;
        try {
          const [[vRow]] = await pool.query('SELECT COUNT(*) as cnt FROM gallery_visitors WHERE gallery_id = ?', [gal.id]);
          visitor_count = vRow?.cnt || 0;
          const [[cRow]] = await pool.query('SELECT COUNT(*) as cnt FROM gallery_guestbook WHERE gallery_id = ?', [gal.id]);
          comment_count = cRow?.cnt || 0;
        } catch(e) {}

        return { 
          ...gal, 
          photographer_name: uInfo.name || 'Fotóművész',
          avatar_url: uInfo.avatar_url || '',
          club_name: uInfo.club_name || '',
          visitor_count,
          comment_count,
          photos: Array.isArray(photos) ? photos : [] 
        };
      }));

      // Kiszűrjük a null elemeket
      res.json(formatted.filter(Boolean));
    } catch (err) {
      console.error("❌ Hiba a tárlatok lekérésekor:", err);
      res.json([]);
    }
  });

  // 2. NYILVÁNOS (AUTH MENTES) MEGOSZTÁSI ENDPOINT
  app.get('/api/public/3d-gallery/:id', async (req, res) => {
    try {
      await ensureTableExists();
      const galleryId = req.params.id;

      const [rows] = await pool.query('SELECT * FROM user_3d_galleries WHERE id = ?', [galleryId]);

      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'A megadott kiállítás nem található.' });
      }

      const gal = rows[0];
      const vis = (gal.visibility || 'public').trim().toLowerCase();
      if (vis === 'club') {
        return res.status(403).json({ error: 'Ez egy zárt klubkiállítás.' });
      }

      const [users] = await pool.query('SELECT email, name, avatar_url, club_name FROM photo_users WHERE LOWER(email) = LOWER(?)', [gal.user_email]);
      const uInfo = users[0] || {};

      let photos = [];
      try { 
        photos = typeof gal.photos_json === 'string' ? JSON.parse(gal.photos_json) : (gal.photos_json || []); 
        if (typeof photos === 'string') photos = JSON.parse(photos);
      } catch(e){ photos = []; }

      let visitor_count = 0;
      try {
        const [[vRow]] = await pool.query('SELECT COUNT(*) as cnt FROM gallery_visitors WHERE gallery_id = ?', [gal.id]);
        visitor_count = vRow?.cnt || 0;
      } catch(e) {}

      try {
        await pool.query(`
          INSERT INTO gallery_visitors (gallery_id, user_email, visited_at)
          VALUES (?, 'guest_visitor', NOW())
          ON DUPLICATE KEY UPDATE visited_at = NOW()
        `, [galleryId]);
      } catch(e) {}

      res.json({
        id: gal.id,
        title: gal.title,
        theme: gal.theme,
        photographer_name: uInfo.name || 'Fotóművész',
        avatar_url: uInfo.avatar_url || '',
        club_name: uInfo.club_name || '',
        visitor_count,
        photos: Array.isArray(photos) ? photos : []
      });

    } catch (err) {
      console.error("❌ Hiba a nyilvános 3D tárlat lekérésekor:", err);
      res.status(500).json({ error: 'Szerveroldali hiba.' });
    }
  });

  // 3. Látogatás rögzítése
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
      res.status(500).json({ error: 'Szerver hiba.' });
    }
  });

  // 4. Vendégkönyv és Látogatói jegyzék lekérése
  app.get('/api/3d-gallery/:id/interactions', requireAuth, async (req, res) => {
    try {
      await ensureTableExists();
      const galleryId = req.params.id;

      const [guestbook] = await pool.query(`
        SELECT 
          b.id, b.comment_text, b.created_at, b.user_email,
          COALESCE(u.name, 'Látogató') as user_name, u.avatar_url, u.club_name
        FROM gallery_guestbook b
        LEFT JOIN photo_users u ON LOWER(b.user_email) = LOWER(u.email)
        WHERE b.gallery_id = ?
        ORDER BY b.created_at DESC
      `, [galleryId]);

      const [visitors] = await pool.query(`
        SELECT 
          v.visited_at, v.user_email,
          COALESCE(u.name, 'Látogató') as user_name, u.avatar_url, u.club_name
        FROM gallery_visitors v
        LEFT JOIN photo_users u ON LOWER(v.user_email) = LOWER(u.email)
        WHERE v.gallery_id = ?
        ORDER BY v.visited_at DESC
      `, [galleryId]);

      res.json({ guestbook, visitors });
    } catch (err) {
      res.status(500).json({ error: 'Szerver hiba.' });
    }
  });

  // 5. Új bejegyzés írása a Vendégkönyvbe
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
      res.status(500).json({ error: 'Szerver hiba.' });
    }
  });

  // 6. Galéria mentése
  app.post('/api/premium/3d-gallery/save', requireAuth, async (req, res) => {
    const { id, title, theme, visibility, photos } = req.body;
    const userEmail = req.user.email;
    const cleanTitle = (title || 'Saját Virtuális Kiállításom').trim();
    const cleanVis = visibility === 'club' ? 'club' : 'public';

    if (!Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ error: 'Legalább 1 fotó kiválasztása kötelező!' });
    }

    if (photos.length > 30) {
      return res.status(400).json({ error: 'Legfeljebb 30 fotó választható ki!' });
    }

    const photoCount = photos.length;
    let requiredPoints = 0;
    if (photoCount > 20) requiredPoints = 400;
    else if (photoCount > 10) requiredPoints = 200;

    try {
      await ensureTableExists();

      let previousCost = 0;
      if (id) {
        const [existing] = await pool.query('SELECT photos_json FROM user_3d_galleries WHERE id = ?', [id]);
        if (existing.length > 0) {
          let oldPhotos = [];
          try { oldPhotos = JSON.parse(existing[0].photos_json); } catch(e){}
          if (oldPhotos.length > 20) previousCost = 400;
          else if (oldPhotos.length > 10) previousCost = 200;
        }
      }

      const netCost = Math.max(0, requiredPoints - previousCost);

      if (netCost > 0) {
        try {
          await PointsService.handleTransaction(
            pool,
            userEmail,
            -netCost,
            'buy_3d_gallery_tier',
            id || null,
            `3D Kiállítás bérlés (${photoCount} fotós csomag)`,
            `3D Exhibition rental (${photoCount} photos tier)`
          );
        } catch (ptsErr) {
          return res.status(400).json({ error: ptsErr.message || 'Nincs elég pontod ehhez a csomaghoz!' });
        }
      }

      const photosJson = JSON.stringify(photos.slice(0, 30));

      if (id) {
        const [result] = await pool.query(`
          UPDATE user_3d_galleries 
          SET title = ?, theme = ?, visibility = ?, photos_json = ? 
          WHERE id = ? AND (LOWER(user_email) = LOWER(?) OR ?)
        `, [cleanTitle, theme || 'modern', cleanVis, photosJson, id, userEmail, req.user.isAdmin]);

        if (result.affectedRows === 0) {
          return res.status(403).json({ error: 'Nincs jogosultságod ezt a tárlatot módosítani.' });
        }
      } else {
        await pool.query(`
          INSERT INTO user_3d_galleries (user_email, title, theme, visibility, photos_json)
          VALUES (?, ?, ?, ?, ?)
        `, [userEmail, cleanTitle, theme || 'modern', cleanVis, photosJson]);
      }

      res.json({ success: true, deductedPoints: netCost });
    } catch (err) {
      console.error("❌ 3D Galéria mentési hiba:", err.message);
      res.status(500).json({ error: 'Szerveroldali hiba a mentés során.' });
    }
  });

  // 7. Tárlat törlése
  app.delete('/api/premium/3d-gallery/:id', requireAuth, async (req, res) => {
    try {
      await ensureTableExists();
      const [result] = await pool.query(`
        DELETE FROM user_3d_galleries 
        WHERE id = ? AND (LOWER(user_email) = LOWER(?) OR ?)
      `, [req.params.id, req.user.email, req.user.isAdmin]);

      if (result.affectedRows === 0) {
        return res.status(403).json({ error: 'Nincs jogosultságod törölni ezt a tárlatot.' });
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Szerver hiba a törléskor.' });
    }
  });

};
