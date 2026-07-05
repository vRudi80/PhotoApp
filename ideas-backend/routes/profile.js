const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const multer = require('multer'); 
const upload = multer({ dest: 'uploads/' });
const fs = require('fs'); 

// A te valódi admin e-mailedet állítottuk be biztonsági tartaléknak is!
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kovari.rudolf@gmail.com";

// ====================================================================
// 🔒 GOLYÓÁLLÓ AUTHENTICATION MIDDLEWARE A PROFILE MODULHOZ
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
    console.error("🔒 Biztonsági őr hiba a profile modulban:", error.message);
    return res.status(401).json({ error: 'Lejárt vagy érvénytelen munkamenet token!' });
  }
}

module.exports = function(app, pool) {
  
  // ====================================================================
  // 📸 1. PROFILKÉP FELTÖLTÉSE GOOGLE DRIVE-RA (VÉDETT - IDOR VÉDELEMMEL)
  // ====================================================================
  app.post('/api/users/:email/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
    const { email } = req.params;
    const file = req.file;

    if (req.user.email !== email && !req.user.isAdmin) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nem módosíthatod más profilképét.' });
    }

    if (!file) return res.status(400).json({ error: 'Nem választottál ki fájlt a feltöltéshez!' });

    try {
      const fileStream = fs.createReadStream(file.path);
      const fileExt = file.originalname && file.originalname.includes('.') 
        ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() 
        : '.jpg';
      
      const driveRes = await drive.files.create({
        requestBody: { 
          name: `Avatar_${Date.now()}${fileExt}`, 
          parents: [process.env.DRIVE_MASTER_FOLDER_ID] 
        },
        media: { mimeType: file.mimetype, body: fileStream },
        fields: 'id, webViewLink'
      });

      const avatarUrl = driveRes.data.webViewLink;

      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

      await pool.query('UPDATE photo_users SET avatar_url = ? WHERE email = ?', [avatarUrl, email]);

      res.json({ success: true, avatar_url: avatarUrl });
    } catch (err) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      console.error("❌ Avatar mentési hiba:", err.message);
      res.status(500).json({ error: 'Nem sikerült feltölteni a profilképet a Google Drive-ra.' });
    }
  });

  // ====================================================================
  // 📝 2. KITERJESZTETT PROFILADATOK MENTÉSE (VÉDETT - IDOR VÉDELEMMEL)
  // ====================================================================
  app.put('/api/users/:email/extended-profile', requireAuth, async (req, res) => {
    const { email } = req.params;
    const { name, phone_number, shipping_address, association_id } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'A név megadása kötelező!' });
    }

    if (req.user.email !== email && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nem módosíthatod más adatait.' });
    }

    try {
      await pool.query(
        'UPDATE photo_users SET name = ?, phone_number = ?, shipping_address = ?, association_id = ? WHERE email = ?',
        [name.trim(), phone_number?.trim() || null, shipping_address?.trim() || null, association_id?.trim() || null, email]
      );

      await pool.query('UPDATE weekly_entries SET user_name = ? WHERE user_email = ?', [name.trim(), email]);

      res.json({ success: true, message: 'Profil adatok sikeresen frissítve!' });
    } catch (err) {
      console.error("❌ Extended profile mentési hiba:", err.message);
      res.status(500).json({ error: 'Szerveroldali hiba történt a részletes adatok mentésekor.' });
    }
  });

  // ====================================================================
  // 🏛️ 3. Klubok listájának lekérése (VÉDETT)
  // ====================================================================
  app.get('/api/clubsprofile', requireAuth, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM photo_clubs ORDER BY name ASC');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Hiba a klubok lekérésekor' });
    }
  });

  // ====================================================================
  // 🏢 4. Felhasználó klubjának frissítése (VÉDETT - IDOR Védelemmel)
  // ====================================================================
  app.put('/api/users/update-club', requireAuth, async (req, res) => {
    const { email, clubId } = req.body;
    if (!email) return res.status(400).json({ error: 'Hiányzó email cím!' });

    if (req.user.email !== email && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nem módosíthatod más felhasználó klubtagságát.' });
    }

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
      res.status(500).json({ error: 'Hiba a mentés során' });
    }
  });

  // ====================================================================
  // 💳 5. SAJÁT HISTÓRIKUS BEFIZETÉSEK LEKÉRÉSE KLUBNEVEKKEL (VÉDETT)
  // ====================================================================
  app.get('/api/profile/my-payments', requireAuth, async (req, res) => {
    const { userEmail } = req.query;
    if (!userEmail) return res.status(400).json({ error: 'Hiányzó email!' });

    if (req.user.email !== userEmail && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nincs jogosultságod más adataihoz.' });
    }

    try {
      const [rows] = await pool.query(`
        SELECT p.fiscal_year, p.fee_amount, p.paid_amount, DATE_FORMAT(p.payment_date, '%Y-%m-%d') as payment_date,
               (p.fee_amount - p.paid_amount) as outstanding_balance,
               c.name as target_club_name
        FROM photo_club_payments p
        JOIN photo_clubs c ON p.club_id = c.id
        WHERE LOWER(TRIM(p.user_email)) = LOWER(TRIM(?))
        ORDER BY p.fiscal_year DESC, p.payment_date DESC
      `, [userEmail]);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Nem sikerült lekérni a történeti egyenleget.' });
    }
  });
    
  // ====================================================================
  // 🛠️ 6. Klub átnevezése az Admin felületen (VÉDETT - Szigorú Admin Kontroll)
  // ====================================================================
  app.put('/api/clubs/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Csak a rendszeradminisztrátor jogosult klubok szerkesztésére.' });
    }

    if (!name) return res.status(400).json({ error: 'A név megadása kötelező!' });

    try {
      await pool.query('UPDATE photo_clubs SET name = ? WHERE id = ?', [name, id]);
      await pool.query('UPDATE photo_users SET club_name = ? WHERE club_id = ?', [name, id]);
      res.json({ success: true, message: 'Klub sikeresen átnevezve!' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

};
