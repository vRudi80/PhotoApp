const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const PointsService = require('../PointsService'); // 🎯 Beemeljük a központi pontkezelőt (igazítsd az útvonalat, ha máshová tetted)

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kovari.rudolf@gmail.com';

// ====================================================================
// 🔒 BIZTONSÁGI ŐR (MIDDLEWARE) A BOLT VÉDELMÉHEZ
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
    console.error("🔒 Biztonsági hiba a Pontboltban:", error.message);
    return res.status(401).json({ error: 'Lejárt vagy érvénytelen munkamenet token!' });
  }
}

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
      // Ha a PointsService dobta a hibát (pl. nincs elég pont), azt kulturáltan visszaadjuk a frontendnek
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

      // 2. Prémium idő meghosszabbítása (Ha már aktív, hozzáadja, ha lejárt vagy ingyenes, NOW()-tól indítja)
      await pool.query(
        `UPDATE photo_users 
         SET is_premium = 1, 
             premium_level = 1, 
             premium_until = DATE_ADD(IF(premium_until IS NOT NULL AND premium_until > NOW(), premium_until, NOW()), INTERVAL 7 DAY) 
         WHERE email = ?`,
        [userEmail]
      );

      // Lekérjük a friss dátumot a frontendnek
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
  // 👑 4. ADMINISZTRÁTORI PONTKORREKCIÓ (GOD MODE)
  // ====================================================================
  app.post('/api/admin/adjust-points', requireAuth, async (req, res) => {
    // 🔒 SZIGORÚ BIZTONSÁGI PAJZS: Csak a hitelesített főadminisztrátor léphet be!
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Ez a művelet kizárólag a Főadminisztrátornak engedélyezett.' });
    }

    const { targetEmail, amount, reasonHu, reasonEn } = req.body;

    // Alapvető adatellenőrzések
    if (!targetEmail || amount === undefined) {
      return res.status(400).json({ error: 'Hiányzó paraméterek! A célszemély email címe és a pontmennyiség megadása kötelező.' });
    }

    const pointsAmount = Number(amount);
    if (isNaN(pointsAmount) || pointsAmount === 0) {
      return res.status(400).json({ error: 'Érvénytelen pontmennyiség! Nullától eltérő számot kell megadnod.' });
    }

    try {
      // A központi bankmotorunk (PointsService) segítségével tranzakcióbiztosan végrehajtjuk
      const txResult = await PointsService.handleTransaction(
        pool,
        targetEmail.trim().toLowerCase(), // Szabványosítjuk az emailt
        pointsAmount,
        'admin_adjustment',
        null, // Nincs közvetlen entitás ID
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
      // Ha a PointsService dob hibát (pl. lecsúszna a user egyenlege nulla alá a levonástól), azt kulturáltan továbbítjuk
      res.status(400).json({ error: err.message || 'Sikertelen adminisztrátori művelet.' });
    }
  });

  // ====================================================================
  // 📜 3. FELHASZNÁLÓ SAJÁT TRANZAKCIÓS NAPLÓJÁNAK LEKÉRÉSE
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
