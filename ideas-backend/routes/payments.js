// 🎯 KÖZVETLENÜL A FRISSÍTETT KÖZPONTI AUTH MIDDLEWARE-T BEHÚZZUK:
const { requireAuth } = require('../authMiddleware');

module.exports = function(app, pool, stripe) {

  // ====================================================================
  // 💳 STRIPE CHECKOUT SESSION LÉTREHOZÁSA (PRÉMIUM ELŐFIZETÉS)
  // ====================================================================
  app.post('/api/create-checkout-session', requireAuth, async (req, res) => {
    const { userEmail, tier } = req.body;
    if (req.user.email !== userEmail) return res.status(403).json({ error: 'Csalás észlelve!' });
    
    const isPro = tier === 'pro';
    const priceAmount = isPro ? 249000 : 100000;
    const productName = isPro ? 'Képolvasók Fotóklub Pro Prémium' : 'Képolvasók Fotóklub Alap Prémium';
    
    try {
      const [rows] = await pool.query('SELECT stripe_customer_id FROM photo_users WHERE email = ?', [userEmail]);
      const existingCustomerId = rows.length > 0 ? rows[0].stripe_customer_id : null;
  
      const sessionConfig = {
        payment_method_types: ['card'],
        line_items: [{ price_data: { currency: 'huf', product_data: { name: productName }, unit_amount: priceAmount, recurring: { interval: 'month' } }, quantity: 1 }],
        mode: 'subscription',
        subscription_data: { trial_period_days: 7 },
        metadata: { tier: isPro ? 'pro' : 'basic' },
        success_url: `${req.headers.origin}?success=true`,
        cancel_url: `${req.headers.origin}?canceled=true`,
      };
      if (existingCustomerId) sessionConfig.customer = existingCustomerId;
      else sessionConfig.customer_email = userEmail;
  
      const session = await stripe.checkout.sessions.create(sessionConfig);
      res.json({ url: session.url });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  
  // ====================================================================
  // 🏆 PÁLYÁZATI NEVEZÉSI DÍJ FIZETÉSI SESSION
  // ====================================================================
  app.post('/api/create-contest-payment', requireAuth, async (req, res) => {
    const { userEmail, contestId, returnUrl } = req.body;
    if (req.user.email !== userEmail) return res.status(403).json({ error: 'Nincs jogosultságod!' });
  
    try {
      const [contests] = await pool.query('SELECT title, entry_fee, fee_currency FROM photo_contests WHERE id = ?', [contestId]);
      if (contests.length === 0) return res.status(404).json({ error: 'A pályázat nem található!' });
      const contest = contests[0];
      const origin = returnUrl || req.headers.origin || 'https://kepolvasok.hu';
  
      const sessionConfig = {
        payment_method_types: ['card'],
        line_items: [{ price_data: { currency: (contest.fee_currency || 'HUF').toLowerCase(), product_data: { name: `Nevezési díj: ${contest.title}` }, unit_amount: contest.entry_fee * 100 }, quantity: 1 }],
        mode: 'payment',
        metadata: { type: 'contest_fee', contest_id: contestId.toString(), user_email: userEmail },
        success_url: `${origin}?tab=contests_open_active&success_contest=${contestId}`,
        cancel_url: `${origin}?tab=contests_open_active&canceled_contest=true`,
      };
  
      const session = await stripe.checkout.sessions.create(sessionConfig);
      res.json({ url: session.url });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  
  // ====================================================================
  // 💳 NEVEZÉSI DÍJ FIZETÉSEK LEKÉRÉSE (Admin: Összes, Tagok: Saját befizetések)
  // ====================================================================
  app.get('/api/contest-payments', requireAuth, async (req, res) => {
    try {
      let query = 'SELECT contest_id, user_email FROM photo_contest_payments WHERE status = "paid"';
      let params = [];

      // Ha NEM admin, kizárólag a saját befizetéseit érheti el
      if (!req.user.isAdmin) {
        query += ' AND user_email = ?';
        params.push(req.user.email);
      }

      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (err) {
      console.error("❌ Hiba a contest-payments lekérésekor:", err);
      res.status(500).json({ error: 'Hiba a fizetések lekérésekor' });
    }
  });

  // ====================================================================
  // 🏛️ STRIPE ÜGYFÉLKAPU (PORTAL SESSION) LÉTREHOZÁSA
  // ====================================================================
  app.post('/api/create-portal-session', requireAuth, async (req, res) => {
    const { userEmail } = req.body;
    if (req.user.email !== userEmail && !req.user.isAdmin) return res.status(403).json({ error: 'Megtagadva!' });
    try {
      const [rows] = await pool.query('SELECT stripe_customer_id FROM photo_users WHERE email = ?', [userEmail]);
      if (rows.length === 0 || !rows[0].stripe_customer_id) return res.status(400).json({ error: 'Nincs Stripe előfizetés!' });
  
      const session = await stripe.billingPortal.sessions.create({
        customer: rows[0].stripe_customer_id,
        return_url: req.headers.origin, 
      });
      res.json({ url: session.url });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
};
