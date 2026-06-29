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
  
 // ====================================================================
  // 🎯 JAVÍTVA: Csak a valódi oszlopok + avatar_url (Nincs több szerveroldali hiba!)
  // ====================================================================
  app.get('/api/users', async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT 
          google_id, email, name, last_login, club_name, club_role, 
          is_premium, premium_until, stripe_customer_id, premium_level, 
          club_id, swap_balance, rank_level, referral_code, referred_by,
          phone_number, shipping_address, association_id, avatar_url 
        FROM photo_users
        ORDER BY name ASC
      `);
      
      res.json(rows);
    } catch (err) {
      console.error("❌ Hiba a photo_users lekérésekor:", err);
      res.status(500).json({ error: 'Nem sikerült betölteni a felhasználókat.' });
    }
  });

  // ====================================================================
  // 👤 ÚJ VÉGPONT: Egy konkrét felhasználó teljes adatlapjának lekérése
  // ====================================================================
  app.get('/api/users/:email', async (req, res) => {
    const { email } = req.params;
    try {
      // 🎯 JAVÍTVA: Beemeltük az AI portfólió számlálót, pont úgy, mint az adminnál!
      const [rows] = await pool.query(`
        SELECT 
          u.*, 
          COALESCE(p.ai_count, 0) AS ai_usage_count
        FROM photo_users u
        LEFT JOIN (
          SELECT user_email, COUNT(*) AS ai_count 
          FROM photo_portfolio 
          WHERE ai_tags IS NOT NULL 
            AND TRIM(ai_tags) != '' 
            AND ai_tags != '[]'
          GROUP BY user_email
        ) p ON u.email = p.user_email
        WHERE u.email = ?
      `, [email]);
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Felhasználó nem található!' });
      }

      const userProfile = rows[0];

      // Biztosítjuk a tiszta Number formátumot a frontend számára
      userProfile.ai_usage_count = Number(userProfile.ai_usage_count) || 0;

      res.json(userProfile);
    } catch (err) {
      console.error("❌ Hiba az egyéni profil lekérésekor:", err);
      res.status(500).json({ error: 'Szerveroldali hiba történt.' });
    }
  });
  
  // ====================================================================
  // 👤 ÚJ: HIVATALOS MAFOSZ PROFIL ADATOK (Extended Profile) MENTÉSE
  // ====================================================================
  app.put('/api/users/:email/extended-profile', async (req, res) => {
    const { email } = req.params;
    const { name, phone_number, shipping_address, association_id } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'A hivatalos név megadása kötelező!' });
    }

    try {
      await pool.query(
        `UPDATE photo_users 
         SET name = ?, phone_number = ?, shipping_address = ?, association_id = ? 
         WHERE email = ?`,
        [name.trim(), phone_number?.trim() || null, shipping_address?.trim() || null, association_id?.trim() || null, email]
      );
      
      // Ha a nevet is módosította, akkor a futó versenyeket is szinkronizáljuk!
      await pool.query('UPDATE weekly_entries SET user_name = ? WHERE user_email = ?', [name.trim(), email]);
      
      res.json({ success: true, message: 'Profil adatok sikeresen frissítve!' });
    } catch (err) {
      console.error("🔥 Hiba a hivatalos profil mentésekor:", err.message);
      res.status(500).json({ error: 'Adatbázis hiba a profil mentése során.' });
    }
  });

  // ====================================================================
  // 👑 JAVÍTVA: EXKLUZÍV ADMIN VÉGPONT (Dinamikus photo_portfolio AI számlálással)
  // ====================================================================
  app.get('/api/admin/exclusive-users', async (req, res) => {
    try {
      // 🎯 Összekötjük a felhasználókat a portfólió táblával, és megszámoljuk az ai_tags-szel rendelkező képeket
      const [rows] = await pool.query(`
        SELECT 
          u.*, 
          COALESCE(p.ai_count, 0) AS ai_usage_count
        FROM photo_users u
        LEFT JOIN (
          SELECT user_email, COUNT(*) AS ai_count 
          FROM photo_portfolio 
          WHERE ai_tags IS NOT NULL 
            AND TRIM(ai_tags) != '' 
            AND ai_tags != '[]'
          GROUP BY user_email
        ) p ON u.email = p.user_email
        ORDER BY u.name ASC
      `);
      
      res.json(rows);
    } catch (err) {
      console.error("❌ Hiba az exkluzív admin felhasználó listázásakor:", err);
      res.status(500).json({ error: 'Szerveroldali hiba történt az admin lista lekérésekor.' });
    }
  });

  
  // ====================================================================
  // 🛡️ Felhasználó klubjának és szerepkörének módosítása (Admin felület)
  // ====================================================================
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

  // ====================================================================
  // 👨‍⚖️ Zsűri kezelő végpontok
  // ====================================================================
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
