// 🎯 1. BEHÚZZUK A KÖZPONTI VÉDELMET (Kezeli a Webes és Androidos Google tokeneket):
const { requireAuth } = require('../authMiddleware');

// 🎯 2. MEGTARTJUK A PONTBOLT SAJÁT BANKMOTORJÁT:
const PointsService = require('../PointsService');

module.exports = function(app, pool) {

  // ====================================================================
  // 🃏 1. JOKER CSERE VÁSÁRLÁSA PONTÉRT
  // ====================================================================
  app.post('/api/store/buy-swap', requireAuth, async (req, res) => {
    const userEmail = req.user.email; // 🔒 GDPR/IDOR FIX: Szigorúan a Google tokenből vesszük az emailt!
    const cost = -PointsService.CONSTANTS.COST_BUY_SWAP; // -50 pont

    try {
      // 1. Lefuttatjuk a pontlevonást és a naplózást a belső biztonságos tranzakcióval
      const txResult = await PointsService.handleTransaction(
        pool,
        userEmail,
        cost,
        'buy_swap',
        null,
        '1 db Joker csere kupon vásárlása',
        'Purchased 1 Joker Swap coupon'
      );

      // 2. Ha a pontlevonás sikeres volt, jóváírjuk a cserét a felhasználónak
      await pool.query(
        'UPDATE photo_users SET swap_balance = swap_balance + 1 WHERE email = ?',
        [userEmail]
      );

      // Lekérjük a frissített csere egyenleget a válaszhoz
      const [updatedUser] = await pool.query('SELECT swap_balance FROM photo_users WHERE email = ?', [userEmail]);

      res.json({
        success: true,
        message: 'A Joker csere kupon sikeresen jóváírva a tárcádban! 🃏',
        newPointsBalance: txResult.newBalance,
        newSwapBalance: updatedUser[0]?.swap_balance || 0
      });

    } catch (err) {
      console.error("❌ Hiba a csere vásárlásakor:", err.message);
      res.status(400).json({ error: err.message || 'Sikertelen vásárlás.' });
    }
  });

  // ====================================================================
  // 👑 2. 7 NAPOS PRÉMIUM TAGSÁG VÁSÁRLÁSA PONTÉRT
  // ====================================================================
  app.post('/api/store/buy-premium', requireAuth, async (req, res) => {
    const userEmail = req.user.email;
    const cost = -PointsService.CONSTANTS.COST_PREMIUM_7DAYS; // -200 pont

    try {
      // 1. Pontlevonás és könyvelés
      const txResult = await PointsService.handleTransaction(
        pool,
        userEmail,
        cost,
        'buy_premium',
        null,
        '7 napos Prémium tagság vásárlása',
        'Purchased 7 days of Premium membership'
      );

      // 2. Prémium idő meghosszabbítása
      await pool.query(
        `UPDATE photo_users 
         SET is_premium = 1, 
             premium_level = 1, 
             premium_until = DATE_ADD(IF(premium_until IS NOT NULL AND premium_until > NOW(), premium_until, NOW()), INTERVAL 7 DAY) 
         WHERE email = ?`,
        [userEmail]
      );

      const [updatedUser] = await pool.query('SELECT premium_until FROM photo_users WHERE email = ?', [userEmail]);

      res.json({
        success: true,
        message: 'Sikeres prémium előfizetés! Köszönjük, hogy támogatod a közösséget! 👑',
        newPointsBalance: txResult.newBalance,
        premiumUntil: updatedUser[0]?.premium_until
      });

    } catch (err) {
      console.error("❌ Hiba a prémium vásárlásakor:", err.message);
      res.status(400).json({ error: err.message || 'Sikertelen vásárlás.' });
    }
  });

  // ====================================================================
  // 🪙 3. EXTRA KVÍZ KUPON VÁSÁRLÁSA 5 PONTÉRT
  // ====================================================================
  app.post('/api/quiz/buy-token', requireAuth, async (req, res) => {
    try {
      const cost = -5; // Szigorúan 5 pont levonás

      const txResult = await PointsService.handleTransaction(
        pool,
        req.user.email,
        cost,
        'buy_quiz_token',
        null,
        '1 db Extra Kvíz Kupon vásárlása',
        'Purchased 1 Extra Quiz Coupon'
      );

      await pool.query(
        'UPDATE photo_users SET quiz_balance = quiz_balance + 1 WHERE email = ?',
        [req.user.email]
      );

      const [userRows] = await pool.query('SELECT quiz_balance FROM photo_users WHERE email = ?', [req.user.email]);

      res.json({
        success: true,
        newPointsBalance: txResult.newBalance,
        newQuizBalance: userRows[0]?.quiz_balance || 0
      });
    } catch (err) {
      console.error("❌ Hiba a kvízkupon vásárlásakor:", err.message);
      res.status(400).json({ error: err.message || 'Sikertelen kupon vásárlás.' });
    }
  });
  
  // ====================================================================
  // 👑 4. ADMINISZTRÁTORI PONTKORREKCIÓ (GOD MODE)
  // ====================================================================
  app.post('/api/admin/adjust-points', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Ez a művelet kizárólag a Főadminisztrátornak engedélyezett.' });
    }

    const { targetEmail, amount, reasonHu, reasonEn } = req.body;

    if (!targetEmail || amount === undefined) {
      return res.status(400).json({ error: 'Hiányzó paraméterek! A célszemély email címe és a pontmennyiség megadása kötelező.' });
    }

    const pointsAmount = Number(amount);
    if (isNaN(pointsAmount) || pointsAmount === 0) {
      return res.status(400).json({ error: 'Érvénytelen pontmennyiség! Nullától eltérő számot kell megadnod.' });
    }

    try {
      const txResult = await PointsService.handleTransaction(
        pool,
        targetEmail.trim().toLowerCase(),
        pointsAmount,
        'admin_adjustment',
        null,
        reasonHu?.trim() || 'Adminisztrátori pontmódosítás',
        reasonEn?.trim() || 'Admin point adjustment'
      );

      res.json({
        success: true,
        message: `👑 Pontmódosítás sikeres! ${targetEmail} számlájára ${pointsAmount > 0 ? '+' : ''}${pointsAmount} pont felírva.`,
        newPointsBalance: txResult.newBalance
      });

    } catch (err) {
      console.error("❌ Hiba az adminisztrátori pontmódosítás során:", err.message);
      res.status(400).json({ error: err.message || 'Sikertelen adminisztrátori művelet.' });
    }
  });

  // ====================================================================
  // 👑 UTILS A: ÖSSZES USER PONTLISTÁJA (CSAK ADMIN)
  // ====================================================================
  app.get('/api/admin/users-points', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    }
    try {
      const [rows] = await pool.query(
        'SELECT email, name, points_balance, avatar_url FROM photo_users ORDER BY points_balance DESC'
      );
      res.json(rows);
    } catch (err) {
      console.error("Hiba az admin user-pontok lekérésekor:", err.message);
      res.status(500).json({ error: 'Adatbázis hiba történt.' });
    }
  });

  // ====================================================================
  // 👑 UTILS B: EGY ADOTT USER TRANZAKCIÓS NAPLÓJA (CSAK ADMIN)
  // ====================================================================
  app.get('/api/admin/user-ledger', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
    }
    const { targetEmail } = req.query;
    if (!targetEmail) {
      return res.status(400).json({ error: 'A célszemély email címe kötelező!' });
    }
    try {
      const [rows] = await pool.query(
        'SELECT *, DATE_FORMAT(created_at, "%Y-%m-%d %H:%i") as date FROM photo_points_ledger WHERE user_email = ? ORDER BY created_at DESC',
        [targetEmail.trim().toLowerCase()]
      );
      res.json(rows);
    } catch (err) {
      console.error("Hiba az admin ledger lekérésekor:", err.message);
      res.status(500).json({ error: 'Adatbázis hiba történt.' });
    }
  });

  // ====================================================================
  // 📜 5. FELHASZNÁLÓ SAJÁT TRANZAKCIÓS NAPLÓJA
  // ====================================================================
  app.get('/api/store/my-ledger', requireAuth, async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT id, points_changed, balance_after, reason_key, description_hu, description_en,
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as date
         FROM photo_points_ledger 
         WHERE user_email = ? 
         ORDER BY created_at DESC LIMIT 50`,
        [req.user.email]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Nem sikerült betölteni a ponttörténetet.' });
    }
  });

};
