module.exports = function(app, pool) {
  
  // ====================================================================
  // 🔐 PRÉMIUM AJÁNDÉKKAL ELLÁTOTT AUTH SZINKRONIZÁCIÓS VÉGPONT
  // ====================================================================
  app.post('/api/auth/sync', async (req, res) => {
    const { email, name, sub } = req.body;
    try {
      
      // 🎁 JAVÍTVA: Az első INSERT ágba bekerült az is_premium (1), premium_level (1) 
      // és a 7 napos eltolás, az ON DUPLICATE KEY UPDATE viszont CSAK a belépési időt frissíti!
      await pool.query(
        `INSERT INTO photo_users (google_id, email, name, last_login, is_premium, premium_level, premium_until) 
         VALUES (?, ?, ?, NOW(), 1, 1, DATE_ADD(NOW(), INTERVAL 7 DAY)) 
         ON DUPLICATE KEY UPDATE last_login = NOW()`, 
        [sub, email, name]
      );
      
      // Lekérjük az aktuális státuszt (legyen az friss vagy régi)
      const [rows] = await pool.query('SELECT is_premium, premium_until, premium_level FROM photo_users WHERE email = ?', [email]);
      const userDb = rows[0];
      const now = new Date();
      const premiumUntil = userDb.premium_until ? new Date(userDb.premium_until) : null;
      const isPremiumActive = (userDb.is_premium === 1 && premiumUntil && premiumUntil > now);
  
      res.json({ 
        success: true, 
        isPremium: isPremiumActive, 
        premiumLevel: userDb.premium_level, 
        premiumUntil: userDb.premium_until 
      });
    } catch (err) { 
      console.error("🔥 Hiba az auth szinkronizációnál:", err.message);
      res.status(500).json({ error: 'Adatbázis hiba az auth szinkronizációnál' }); 
    }
  });
  
  // Felhasználók listázása
  app.get('/api/users', async (req, res) => {
    try { 
      const [rows] = await pool.query(`SELECT u.email, u.name, u.club_name, u.club_role, u.last_login, u.is_premium, u.premium_until, (SELECT COUNT(*) FROM photo_portfolio p WHERE p.user_email = u.email AND p.ai_tags IS NOT NULL) as ai_usage_count FROM photo_users u ORDER BY u.last_login DESC`); 
      res.json(rows); 
    } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });
  
  // Felhasználó klubjának és szerepkörének módosítása (Admin felület)
  app.put('/api/users/:email', async (req, res) => {
    const { email } = req.params;
    const { clubName, clubRole, clubId } = req.body;

    try {
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

  // Zsűri kezelő végpontok
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
