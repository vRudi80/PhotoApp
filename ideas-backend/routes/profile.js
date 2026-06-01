module.exports = function(app, pool) {
  
  // 1. Összes elérhető klub lekérése a "photo_clubs" táblából
  app.get('/api/clubs', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT name FROM photo_clubs ORDER BY name ASC');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Hiba a klubok lekérésekor' });
    }
  });

  // 2. Felhasználó klubjának frissítése a "photo_users" táblában
  app.put('/api/users/update-club', async (req, res) => {
    const { email, clubName } = req.body;
    
    if (!email) return res.status(400).json({ error: 'Hiányzó email cím!' });

    try {
      // Ha üres stringet kapunk, az azt jelenti, hogy kilépett a klubból (független lett)
      const newClub = clubName === '' ? null : clubName;
      
      await pool.query('UPDATE photo_users SET club_name = ? WHERE email = ?', [newClub, email]);
      res.json({ success: true, message: 'Klub sikeresen frissítve!' });
    } catch (err) {
      console.error("Klub mentési hiba:", err);
      res.status(500).json({ error: 'Hiba a mentés során' });
    }
  });

};
