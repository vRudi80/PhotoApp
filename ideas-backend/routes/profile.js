const fs = require('fs');

module.exports = function(app, pool) {
    // ====================================================================
  // 1. JAVÍTVA: Most már az ÖSSZES mezőt (*) lekérjük a photo_clubs táblából,
  // így a logó URL és a Drive ID is sértetlenül átmegy a frontendnek!
  // ====================================================================
  app.get('/api/clubsprofile', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM photo_clubs ORDER BY name ASC');
      res.json(rows);
    } catch (err) {
      console.error("Hiba a klubok lekérésekor:", err);
      res.status(500).json({ error: 'Hiba a klubok lekérésekor' });
    }
  });


  // ====================================================================
  // 2. Felhasználó klubjának frissítése a "photo_users" táblában
  // ====================================================================
  app.put('/api/users/update-club', async (req, res) => {
    const { email, clubId } = req.body; // clubName helyett clubId érkezik
    
    if (!email) return res.status(400).json({ error: 'Hiányzó email cím!' });

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
  // 👤 ÚJ VÉGPONT: Felhasználó nevének módosítása (táblák szinkronizálásával)
  // ====================================================================
  app.put('/api/users/update-name', async (req, res) => {
    const { email, newName } = req.body;

    if (!email || !newName || !newName.trim()) {
      return res.status(400).json({ error: 'A név megadása kötelező!' });
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

    // 💳 SAJÁT HISTÓRIKUS BEFIZETÉSEK LEKÉRÉSE KLUBNEVEKKEL
  app.get('/api/profile/my-payments', async (req, res) => {
    const { userEmail } = req.query;
    if (!userEmail) return res.status(400).json({ error: 'Hiányzó email!' });
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
  // 3. Klub átnevezése az Admin felületen
  // ====================================================================
  app.put('/api/clubs/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

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
