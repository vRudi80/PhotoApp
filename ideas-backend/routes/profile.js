const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🎯 JAVÍTVA: A te valódi admin e-mailedet állítottuk be biztonsági tartaléknak is!
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
    console.error("🔒 Biztonsági őr hiba a profile modulban:", error.message);
    return res.status(401).json({ error: 'Lejárt vagy érvénytelen munkamenet token!' });
  }
}

module.exports = function(app, pool) {
  
  // ====================================================================
  // 1. Klubok listájának lekérése (VÉDETT)
  // ====================================================================
  app.get('/api/clubsprofile', requireAuth, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM photo_clubs ORDER BY name ASC');
      res.json(rows);
    } catch (err) {
      console.error("Hiba a klubok lekérésekor:", err);
      res.status(500).json({ error: 'Hiba a klubok lekérésekor' });
    }
  });

  // ====================================================================
  // 2. Felhasználó klubjának frissítése (VÉDETT - IDOR Védelemmel)
  // ====================================================================
  app.put('/api/users/update-club', requireAuth, async (req, res) => {
    const { email, clubId } = req.body;
    
    if (!email) return res.status(400).json({ error: 'Hiányzó email cím!' });

    // 🔒 BIZTONSÁGI PAJZS: Megakadályozzuk, hogy valaki más felhasználó klubtagságát módosítsa
    if (req.user.email !== email && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nem módosíthatod más felhasználó klubtagságát.' });
    }

    try {
      if (!clubId) {
        // Ha nincs ID, akkor szabadúszó lett (Kettős törlés: mindkét mező NULL)
        await pool.query('UPDATE photo_users SET club_id = NULL, club_name = NULL WHERE email = ?', [email]);
        return res.json({ success: true, message: 'Sikeresen kiléptél a klubból!' });
      }

      // Megkeressük a klub nevét az ID alapján a kettős íráshoz
      const [clubRows] = await pool.query('SELECT name FROM photo_clubs WHERE id = ?', [clubId]);
      if (clubRows.length === 0) return res.status(404).json({ error: 'A választott klub nem létezik!' });
      const clubName = clubRows[0].name;

      // KETTŐS MENTÉS: Beírjuk a szám ID-t és a szöveges nevet is a biztonság kedvéért!
      await pool.query('UPDATE photo_users SET club_id = ?, club_name = ? WHERE email = ?', [clubId, clubName, email]);
      
      res.json({ success: true, message: 'Klubtagság sikeresen frissítve!' });
    } catch (err) {
      console.error("Klub mentési hiba:", err);
      res.status(500).json({ error: 'Hiba a mentés során' });
    }
  });

  // ====================================================================
  // 👤 Felhasználó nevének módosítása (VÉDETT - IDOR Védelemmel)
  // ====================================================================
  app.put('/api/users/update-name', requireAuth, async (req, res) => {
    const { email, newName } = req.body;

    if (!email || !newName || !newName.trim()) {
      return res.status(400).json({ error: 'A név megadása kötelező!' });
    }

    // 🔒 BIZTONSÁGI PAJZS: Megakadályozzuk, hogy valaki más nevét írja át a rendszerben
    if (req.user.email !== email && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nem módosíthatod más felhasználó nevét.' });
    }

    try {
      // 1. Átírjuk a nevet a fő felhasználói táblában
      await pool.query('UPDATE photo_users SET name = ? WHERE email = ?', [newName.trim(), email]);

      // 2. Frissítjük az összes korábbi és jelenlegi heti nevezését is, hogy a toplisták ne szakadjanak el!
      await pool.query('UPDATE weekly_entries SET user_name = ? WHERE user_email = ?', [newName.trim(), email]);

      res.json({ success: true, message: 'Név sikeresen frissítve minden felületen!' });
    } catch (err) {
      console.error("Névmódosítási hiba az adatbázisban:", err);
      res.status(500).json({ error: 'Szerveroldali hiba történt a név mentésekor.' });
    }
  });

  // ====================================================================
  // 💳 SAJÁT HISTÓRIKUS BEFIZETÉSEK LEKÉRÉSE KLUBNEVEKKEL (VÉDETT - IDOR Védelemmel)
  // ====================================================================
  app.get('/api/profile/my-payments', requireAuth, async (req, res) => {
    const { userEmail } = req.query;
    if (!userEmail) return res.status(400).json({ error: 'Hiányzó email!' });

    // 🔒 BIZTONSÁGI PAJZS: Csak a saját pénzügyi adataidat láthatod, vagy ha Admin vagy
    if (req.user.email !== userEmail && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nincs jogosultságod más felhasználó befizetéseit megtekinteni.' });
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
  // 3. Klub átnevezése az Admin felületen (VÉDETT - Szigorú Admin Kontroll)
  // ====================================================================
  app.put('/api/clubs/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    // 🔒 BIZTONSÁGI PAJZS: Kizárólag a hitelesített főadminisztrátor jogosult klubot átnevezni
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Csak a rendszeradminisztrátor jogosult klubok szerkesztésére.' });
    }

    if (!name) return res.status(400).json({ error: 'A név megadása kötelező!' });

    try {
      // 1. Átírjuk a nevet a photo_clubs táblában
      await pool.query('UPDATE photo_clubs SET name = ? WHERE id = ?', [name, id]);

      // 2. Frissítjük a szöveges nevet a felhasználóknál is az ID alapján (Dual-Write szinkron)
      await pool.query('UPDATE photo_users SET club_name = ? WHERE club_id = ?', [name, id]);

      res.json({ success: true, message: 'Klub sikeresen átnevezve!' });
    } catch (err) {
      console.error("Klub szerkesztési hiba:", err);
      res.status(500).json({ error: err.message });
    }
  });

};
