const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🎯 A te valódi admin e-mailed biztonsági tartaléknak
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kovari.rudolf@gmail.com";

// ====================================================================
// 🔒 GOLYÓÁLLÓ AUTHENTICATION MIDDLEWARE A TICKETS MODULHOZ
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
    console.error("🔒 Biztonsági őr hiba a tickets modulban:", error.message);
    return res.status(401).json({ error: 'Lejárt vagy érvénytelen munkamenet token!' });
  }
}

module.exports = function(app, pool) {

  // ====================================================================
  // 1. Új hibajegy nyitása (VÉDETT)
  // ====================================================================
  app.post('/api/tickets', requireAuth, async (req, res) => {
    const { userEmail, userName, subject, message } = req.body;
    if (!userEmail || !subject || !message) return res.status(400).json({ error: 'Minden mező kitöltése kötelező!' });

    if (req.user.email !== userEmail) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nem nyithatsz hibajegyet más e-mail címmel.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [ticketResult] = await conn.query(
        'INSERT INTO weekly_tickets (user_email, user_name, subject, status, admin_unread, user_unread) VALUES (?, ?, ?, ?, 1, 0)',
        [userEmail, userName, subject, 'open']
      );
      const ticketId = ticketResult.insertId;

      await conn.query(
        'INSERT INTO weekly_ticket_replies (ticket_id, sender_email, sender_name, message) VALUES (?, ?, ?, ?)',
        [ticketId, userEmail, userName, message]
      );

      await conn.commit();
      res.json({ success: true, ticketId });
    } catch (err) {
      await conn.rollback();
      res.status(500).json({ error: err.message });
    } finally {
      conn.release();
    }
  });

  // ====================================================================
  // 2. Hibajegyek listázása (JAVÍTVA ÉS BIZTONSÁGOSSÁ TEVVE)
  // ====================================================================
  app.get('/api/tickets', requireAuth, async (req, res) => {
    try { 
      // 🎯 JAVÍTVA: Ha admin kéri, lekérjük az ÖSSZES hibajegyet az igazi nyomtatványtáblából!
      if (req.user.isAdmin) {
        const [rows] = await pool.query(
          'SELECT * FROM weekly_tickets ORDER BY updated_at DESC'
        );
        return res.json(rows);
      }

      // Sima felhasználónak szigorúan csak a saját jegyeit adjuk vissza
      const [rows] = await pool.query(
        'SELECT * FROM weekly_tickets WHERE user_email = ? ORDER BY updated_at DESC', 
        [req.user.email]
      ); 
      res.json(rows); 
    } catch (err) {
      console.error("❌ Adatbázis hiba a ticketek listázásakor:", err.message);
      res.status(500).json({ error: 'Szerveroldali hiba történt a jegyek betöltésekor.' });
    }
  });

  // ====================================================================
  // 🔔 Olvasatlan ticketek száma a Headerhez (VÉDETT)
  // ====================================================================
  app.get('/api/tickets/unread-count', requireAuth, async (req, res) => {
    try {
      if (req.user.isAdmin) {
        const [rows] = await pool.query("SELECT COUNT(*) as count FROM weekly_tickets WHERE admin_unread = 1 AND status != 'closed'");
        return res.json({ count: rows[0].count });
      } else {
        const [rows] = await pool.query("SELECT COUNT(*) as count FROM weekly_tickets WHERE user_email = ? AND user_unread = 1", [req.user.email]);
        return res.json({ count: rows[0].count });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ====================================================================
  // 3. Chat üzenetek lekérése (VÉDETT)
  // ====================================================================
  app.get('/api/tickets/:id/replies', requireAuth, async (req, res) => {
    const ticketId = req.params.id;

    try {
      const [ticket] = await pool.query('SELECT user_email FROM weekly_tickets WHERE id = ?', [ticketId]);
      if (ticket.length === 0) return res.status(404).json({ error: 'A keresett hibajegy nem létezik!' });

      if (ticket[0].user_email !== req.user.email && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Hozzáférés megtagadva! Ez nem a te hibajegyed.' });
      }

      if (req.user.isAdmin) {
        await pool.query('UPDATE weekly_tickets SET admin_unread = 0 WHERE id = ?', [ticketId]);
      } else {
        await pool.query('UPDATE weekly_tickets SET user_unread = 0 WHERE id = ?', [ticketId]);
      }

      const [rows] = await pool.query('SELECT * FROM weekly_ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC', [ticketId]);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ====================================================================
  // 4. Új válasz küldése (VÉDETT)
  // ====================================================================
  app.post('/api/tickets/:id/replies', requireAuth, async (req, res) => {
    const { message } = req.body;
    const ticketId = req.params.id;
    if (!message?.trim()) return res.status(400).json({ error: 'Üres üzenet!' });

    try {
      const [ticketRows] = await pool.query('SELECT user_email, status FROM weekly_tickets WHERE id = ?', [ticketId]);
      if (ticketRows.length === 0) return res.status(404).json({ error: 'A jegy nem található.' });

      const ticket = ticketRows[0];
      if (ticket.user_email !== req.user.email && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Nincs jogosultságod ehhez a jegyhez!' });
      }

      await pool.query(
        'INSERT INTO weekly_ticket_replies (ticket_id, sender_email, sender_name, message) VALUES (?, ?, ?, ?)',
        [ticketId, req.user.email, req.user.name, message.trim()]
      );

      // Automatikus státusz- és olvasottság-kezelés
      if (req.user.isAdmin) {
        await pool.query('UPDATE weekly_tickets SET user_unread = 1, status = IF(status = "open", "in_progress", status) WHERE id = ?', [ticketId]);
      } else {
        await pool.query('UPDATE weekly_tickets SET admin_unread = 1 WHERE id = ?', [ticketId]);
      }

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // ====================================================================
  // 5. Státusz frissítése (VÉDETT)
  // ====================================================================
  app.put('/api/tickets/:id/status', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Csak az adminisztrátor módosíthatja a státuszt!' });
    try {
      await pool.query('UPDATE weekly_tickets SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

};
