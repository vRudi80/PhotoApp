module.exports = function(app, pool) {
  
  // 1. Összes elérhető klub lekérése a "photo_clubs" táblából (Most már az ID-t is kikérjük!)
  app.get('/api/clubs', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT id, name FROM photo_clubs ORDER BY name ASC');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Hiba a klubok lekérésekor' });
    }
  });

  // 2. Felhasználó klubjának frissítése a "photo_users" táblában
  // JAVÍTVA: A frontendtől már a clubId-t kapjuk, de mindkét oszlopot (ID és Név) egyszerre mentjük!
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

  // 3. ÚJ: Klub átnevezése az Admin felületen
  // Mivel bevezettük az ID-t, most már golyóálló: átírjuk a nevet a fő táblában, 
  // és frissítjük a photo_users-ben is ott, ahol az ID egyezik!
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
