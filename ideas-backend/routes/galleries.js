// 🎯 KÖZVETLENÜL A FRISSÍTETT KÖZPONTI AUTH MIDDLEWARE-T BEHÚZZUK:
const { requireAuth } = require('../authMiddleware');

const PointsService = require('../PointsService');
const crypto = require('crypto');

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
          share_token VARCHAR(64) DEFAULT NULL,
          photos_json LONGTEXT NOT NULL,
          expires_at DATETIME DEFAULT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_email (user_email),
          INDEX idx_share_token (share_token)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      try {
        await pool.query("ALTER TABLE user_3d_galleries ADD COLUMN share_token VARCHAR(64) DEFAULT NULL AFTER visibility");
      } catch (colErr) {}

      try {
        await pool.query("ALTER TABLE user_3d_galleries ADD COLUMN expires_at DATETIME DEFAULT NULL AFTER photos_json");
      } catch (colErr) {}

      try {
        await pool.query("UPDATE user_3d_galleries SET share_token = MD5(CONCAT(id, user_email, NOW(), RAND())) WHERE share_token IS NULL OR share_token = ''");
      } catch (updateErr) {}

      try {
        await pool.query("UPDATE user_3d_galleries SET expires_at = DATE_ADD(NOW(), INTERVAL 1 MONTH) WHERE expires_at IS NULL");
      } catch (updateErr) {}

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

  // 1. Összes elérhető tárlat lekérése (Lejárat szűréssel)
  app.get('/api/3d-galleries', requireAuth, async (req, res) => {
    try {
      await ensureTableExists();

      const [galleries] = await pool.query('SELECT * FROM user_3d_galleries ORDER BY updated_at DESC');
      const [users] = await pool.query('SELECT email, name, avatar_url, club_name FROM photo_users');
      
      const userMap = new Map();
      (users || []).forEach(u => {
        if (u.email) userMap.set(u.email.trim().toLowerCase(), u);
      });

      const currentAuthEmail = (req.user.email || '').trim().toLowerCase();
      const currentUserObj = userMap.get(currentAuthEmail);
      const myClubName = currentUserObj?.club_name || '';
      const now = new Date();

      const formatted = await Promise.all((galleries || []).map(async (gal) => {
        const ownerEmail = (gal.user_email || '').trim().toLowerCase();
        const uInfo = userMap.get(ownerEmail) || {};

        const vis = (gal.visibility || 'public').trim().toLowerCase();
        const isOwner = (ownerEmail === currentAuthEmail || req.user.isAdmin);
        const isPublic = (vis === '' || vis === 'public');
        const isSameClub = (vis === 'club' && uInfo.club_name && uInfo.club_name === myClubName);

        const isExpired = gal.expires_at ? (new Date(gal.expires_at) < now) : false;

        if (isExpired && !isOwner) {
          return null;
        }

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

        let currentToken = gal.share_token;
        if (!currentToken) {
          currentToken = crypto.randomBytes(16).toString('hex');
          await pool.query('UPDATE user_3d_galleries SET share_token = ? WHERE id = ?', [currentToken, gal.id]);
        }

        return { 
          ...gal, 
          share_token: currentToken,
          photographer_name: uInfo.name || 'Fotóművész',
          avatar_url: uInfo.avatar_url || '',
          club_name: uInfo.club_name || '',
          visitor_count,
          comment_count,
          is_expired: isExpired,
          photos: Array.isArray(photos) ? photos : [] 
        };
      }));

      res.json(formatted.filter(Boolean));
    } catch (err) {
      console.error("❌ Hiba a tárlatok lekérésekor:", err);
      res.json([]);
    }
  });

  // 🌐 NYILVÁNOS WEBGEL KÉPCONVERTER 3D TÁRLATOKHOZ (CORS-MENTES BASE64)
  app.get('/api/public/image-proxy', async (req, res) => {
    let imageUrl = req.query.url;
    const fileId = req.query.fileId;

    if (!imageUrl && !fileId) {
      return res.status(400).json({ error: 'Nincs URL vagy fileId megadva.' });
    }

    if (fileId && !imageUrl) {
      imageUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
    }

    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });
      
      if (!response.ok) throw new Error(`Kép letöltési hiba: ${response.statusText}`);

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const base64 = `data:${contentType};base64,${buffer.toString('base64')}`;

      res.json({ base64 });
    } catch (err) {
      console.error("❌ Kép konvertálási hiba:", err.message);
      res.status(500).json({ error: 'Nem sikerült konvertálni a képet.' });
    }
  });

  // 2. NYILVÁNOS MEGOSZTÁSI ENDPOINT (Lejárat ellenőrzéssel)
  app.get('/api/public/3d-gallery/:token', async (req, res) => {
    try {
      await ensureTableExists();
      const tokenOrId = req.params.token;

      let rows = [];
      try {
        const [r] = await pool.query(
          'SELECT * FROM user_3d_galleries WHERE share_token = ? OR id = ?', 
          [tokenOrId, isNaN(Number(tokenOrId)) ? -1 : Number(tokenOrId)]
        );
        rows = r;
      } catch (qErr) {
        const [r] = await pool.query(
          'SELECT * FROM user_3d_galleries WHERE id = ?', 
          [isNaN(Number(tokenOrId)) ? -1 : Number(tokenOrId)]
        );
        rows = r;
      }

      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'A megadott kiállítás nem található.' });
      }

      const gal = rows[0];
      const now = new Date();
      if (gal.expires_at && new Date(gal.expires_at) < now) {
        return res.status(410).json({ error: 'Ez a 3D kiállítás lejárt.' });
      }

      const vis = (gal.visibility || 'public').trim().toLowerCase();
      if (vis === 'club') {
        return res.status(403).json({ error: 'Ez egy zárt klubkiállítás.' });
      }

      let uInfo = {};
      try {
        const [users] = await pool.query('SELECT email, name, avatar_url, club_name FROM photo_users WHERE LOWER(email) = LOWER(?)', [gal.user_email]);
        uInfo = users[0] || {};
      } catch(e) {}

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
        `, [gal.id]);
      } catch(e) {}

      res.json({
        id: gal.id,
        share_token: gal.share_token || String(gal.id),
        title: gal.title,
        theme: gal.theme,
        expires_at: gal.expires_at,
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

  // 4. Vendégkönyv lekérése
  app.get('/api/3d-gallery/:id/interactions', requireAuth, async (req, res) => {
    try {
      await ensureTableExists();
      const galleryId = req.params.id;

      const [guestbookRaw] = await pool.query('SELECT * FROM gallery_guestbook WHERE gallery_id = ? ORDER BY created_at DESC', [galleryId]);
      const [visitorsRaw] = await pool.query('SELECT * FROM gallery_visitors WHERE gallery_id = ? ORDER BY visited_at DESC', [galleryId]);

      const [users] = await pool.query('SELECT email, name, avatar_url, club_name FROM photo_users');
      const userMap = new Map();
      (users || []).forEach(u => {
        if (u.email) userMap.set(u.email.trim().toLowerCase(), u);
      });

      const guestbook = (guestbookRaw || []).map(b => {
        const emailKey = (b.user_email || '').trim().toLowerCase();
        const uInfo = userMap.get(emailKey);
        return {
          id: b.id,
          comment_text: b.comment_text,
          created_at: b.created_at,
          user_email: b.user_email,
          user_name: uInfo ? uInfo.name : (b.user_email || 'Vendég Látogató'),
          avatar_url: uInfo ? uInfo.avatar_url : '',
          club_name: uInfo ? uInfo.club_name : ''
        };
      });

      const visitors = (visitorsRaw || []).map(v => {
        const emailKey = (v.user_email || '').trim().toLowerCase();
        const uInfo = userMap.get(emailKey);
        return {
          visited_at: v.visited_at,
          user_email: v.user_email,
          user_name: uInfo ? uInfo.name : (v.user_email === 'guest_visitor' ? 'Külsős Vendég' : v.user_email),
          avatar_url: uInfo ? uInfo.avatar_url : '',
          club_name: uInfo ? uInfo.club_name : ''
        };
      });

      res.json({ guestbook, visitors });
    } catch (err) {
      console.error("❌ Hiba az interakciók lekérésekor:", err);
      res.status(500).json({ error: 'Szerver hiba.' });
    }
  });

  // 🌐 NYILVÁNOS VENDÉGKÖNYV LEKÉRDEZÉSE
  app.get('/api/public/3d-gallery/:token/interactions', async (req, res) => {
    try {
      await ensureTableExists();
      const tokenOrId = req.params.token;

      const [galleries] = await pool.query(
        'SELECT id FROM user_3d_galleries WHERE share_token = ? OR id = ?', 
        [tokenOrId, isNaN(Number(tokenOrId)) ? -1 : Number(tokenOrId)]
      );

      if (!galleries || galleries.length === 0) {
        return res.status(404).json({ error: 'Kiállítás nem található.' });
      }

      const galleryId = galleries[0].id;
      const [guestbookRaw] = await pool.query('SELECT * FROM gallery_guestbook WHERE gallery_id = ? ORDER BY created_at DESC', [galleryId]);

      const [users] = await pool.query('SELECT email, name, avatar_url FROM photo_users');
      const userMap = new Map();
      (users || []).forEach(u => {
        if (u.email) userMap.set(u.email.trim().toLowerCase(), u);
      });

      const guestbook = (guestbookRaw || []).map(b => {
        const emailKey = (b.user_email || '').trim().toLowerCase();
        const uInfo = userMap.get(emailKey);
        return {
          id: b.id,
          comment_text: b.comment_text,
          created_at: b.created_at,
          user_email: b.user_email,
          user_name: uInfo ? uInfo.name : (b.user_email || 'Vendég Látogató'),
          avatar_url: uInfo ? uInfo.avatar_url : ''
        };
      });

      res.json({ guestbook });
    } catch (err) {
      console.error("❌ Nyilvános vendégkönyv lekérdezési hiba:", err);
      res.status(500).json({ error: 'Szerver hiba.' });
    }
  });

  // 5. Vendégkönyv bejegyzés
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

  // 🌐 NYILVÁNOS VENDÉGKÖNYV BEJEGYZÉS
  app.post('/api/public/3d-gallery/:token/guestbook', async (req, res) => {
    const { comment_text, guest_name } = req.body;
    const tokenOrId = req.params.token;

    if (!comment_text || !comment_text.trim()) {
      return res.status(400).json({ error: 'A bejegyzés nem lehet üres!' });
    }

    try {
      await ensureTableExists();
      const [galleries] = await pool.query(
        'SELECT id FROM user_3d_galleries WHERE share_token = ? OR id = ?', 
        [tokenOrId, isNaN(Number(tokenOrId)) ? -1 : Number(tokenOrId)]
      );

      if (!galleries || galleries.length === 0) {
        return res.status(404).json({ error: 'Kiállítás nem található.' });
      }

      const galleryId = galleries[0].id;
      const authorName = (guest_name || 'Vendég Látogató').trim();

      await pool.query(`
        INSERT INTO gallery_guestbook (gallery_id, user_email, comment_text)
        VALUES (?, ?, ?)
      `, [galleryId, authorName, comment_text.trim()]);

      res.json({ success: true });
    } catch (err) {
      console.error("❌ Vendégkönyv bejegyzési hiba:", err);
      res.status(500).json({ error: 'Szerver hiba.' });
    }
  });

  // 6. Hosszabbítás (100 pontért +1 hónap)
  app.post('/api/premium/3d-gallery/:id/extend', requireAuth, async (req, res) => {
    const galleryId = req.params.id;
    const userEmail = req.user.email;
    const cost = 100;

    try {
      await ensureTableExists();

      const [rows] = await pool.query(
        'SELECT * FROM user_3d_galleries WHERE id = ? AND (LOWER(user_email) = LOWER(?) OR ?)', 
        [galleryId, userEmail, req.user.isAdmin]
      );

      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'A kiállítás nem található vagy nincs hozzá jogosultságod.' });
      }

      const gal = rows[0];

      try {
        await PointsService.handleTransaction(
          pool,
          userEmail,
          -cost,
          'extend_3d_gallery',
          galleryId,
          '3D Kiállítás meghosszabbítása (+1 hónap)',
          '3D Exhibition extension (+1 month)'
        );
      } catch (ptsErr) {
        return res.status(400).json({ error: ptsErr.message || 'Nincs elég pontod (100 pont szükséges)!' });
      }

      const now = new Date();
      const currentExpires = gal.expires_at ? new Date(gal.expires_at) : null;
      let baseDate = (currentExpires && currentExpires > now) ? currentExpires : now;

      const newExpiresAt = new Date(baseDate);
      newExpiresAt.setMonth(newExpiresAt.getMonth() + 1);

      await pool.query('UPDATE user_3d_galleries SET expires_at = ? WHERE id = ?', [newExpiresAt, galleryId]);

      res.json({ 
        success: true, 
        newExpiresAt, 
        message: 'A kiállítás sikeresen meghosszabbítva 1 hónappal!' 
      });
    } catch (err) {
      console.error("❌ Hiba a 3D tárlat hosszabbításakor:", err);
      res.status(500).json({ error: 'Szerveroldali hiba a hosszabbítás során.' });
    }
  });

  // 7. Galéria mentése (Kezdeti lejárattal)
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
        const generatedToken = crypto.randomBytes(16).toString('hex');
        const initialExpires = new Date();
        initialExpires.setMonth(initialExpires.getMonth() + 1);

        await pool.query(`
          INSERT INTO user_3d_galleries (user_email, title, theme, visibility, share_token, photos_json, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [userEmail, cleanTitle, theme || 'modern', cleanVis, generatedToken, photosJson, initialExpires]);
      }

      res.json({ success: true, deductedPoints: netCost });
    } catch (err) {
      console.error("❌ 3D Galéria mentési hiba:", err.message);
      res.status(500).json({ error: 'Szerveroldali hiba a mentés során.' });
    }
  });

  // 8. Tárlat törlése
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
