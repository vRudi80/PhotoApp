module.exports = function(app, pool) {
  
  app.post('/api/auth/sync', async (req, res) => {
    const { email, name, sub } = req.body;
    try {
      await pool.query(
        `INSERT INTO photo_users (google_id, email, name, last_login) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE name = ?, last_login = NOW()`, 
        [sub, email, name, name]
      );
      const [rows] = await pool.query('SELECT is_premium, premium_until, premium_level FROM photo_users WHERE email = ?', [email]);
      const userDb = rows[0];
      const now = new Date();
      const premiumUntil = userDb.premium_until ? new Date(userDb.premium_until) : null;
      const isPremiumActive = (userDb.is_premium === 1 && premiumUntil && premiumUntil > now);
  
      res.json({ success: true, isPremium: isPremiumActive, premiumLevel: userDb.premium_level, premiumUntil: userDb.premium_until });
    } catch (err) { res.status(500).json({ error: 'Adatbázis hiba az auth szinkronizációnál' }); }
  });
  
  app.get('/api/users', async (req, res) => {
    try { 
      const [rows] = await pool.query(`SELECT u.email, u.name, u.club_name, u.club_role, u.last_login, u.is_premium, u.premium_until, (SELECT COUNT(*) FROM photo_portfolio p WHERE p.user_email = u.email AND p.ai_tags IS NOT NULL) as ai_usage_count FROM photo_users u ORDER BY u.last_login DESC`); 
      res.json(rows); 
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });
  
  // Felhasználó klubjának és szerepkörének módosítása (Admin felület)
  app.put('/api/users/:email', async (req, res) => {
    const { email } = req.params;
    const { clubName, clubRole, clubId } = req.body; // JAVÍTVA: Fogadjuk a clubId-t is

    try {
      // JAVÍTVA: Az SQL parancs most már a club_id-t is beírja a photo_users táblába!
      await pool.query(
        'UPDATE photo_users SET club_name = ?, club_role = ?, club_id = ? WHERE email = ?',
        [clubName || null, clubRole || 'member', clubId || null, email]
      );
      
      res.json({ success: true });
    } catch (err) {
      console.error("🔥 Hiba a felhasználó klubjának mentésekor:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/jury', async (req, res) => {
    try { const [rows] = await pool.query('SELECT * FROM photo_jury'); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });
  
  app.post('/api/jury', async (req, res) => {
    try { await pool.query('INSERT IGNORE INTO photo_jury (contest_id, user_email) VALUES (?, ?)', [req.body.contestId, req.body.userEmail]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });
  
  app.delete('/api/jury', async (req, res) => {
    try { await pool.query('DELETE FROM photo_jury WHERE contest_id = ? AND user_email = ?', [req.body.contestId, req.body.userEmail]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });
};
