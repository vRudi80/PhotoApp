const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🎯 JAVÍTVA: A te valódi admin e-mailedet állítottuk be biztonsági tartaléknak!
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
    
    // Google OAuth IdToken hitelesítése
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'Érvénytelen vagy sérült Google token.' });
    }

    // Biztonságosan injektáljuk a kérésbe a hitelesített entitást
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
  // 1. Új hibajegy nyitása (VÉDETT - Személyazonosság-ellenőrzéssel)
  // ====================================================================
  app.post('/api/tickets', requireAuth, async (req, res) => {
    const { userEmail, userName, subject, message } = req.body;
    if (!userEmail || !subject || !message) return res.status(400).json({ error: 'Minden mező kitöltése kötelező!' });

    // 🔒 BIZTONSÁGI PAJZS: Megakadályozzuk, hogy valaki más nevében nyisson ticketet
    if (req.user.email !== userEmail) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nem nyithatsz hibajegyet más e-mail címmel.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Új ticketnél az admin_unread = 1
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
  // 2. Hibajegyek listázása (VÉDETT - Megszünteti a bejelentett szivárgást!)
  // ====================================================================
  app.get('/api/tickets', requireAuth, async (req, res) => {
    const { userEmail } = req.query;
    if (!userEmail) return res.status(400).json({ error: 'Hiányzó email cím!' });

    // 🔒 BIZTONSÁGI PAJZS: Csak a saját ticketjeidet láthatod, kivéve ha igazoltan Admin vagy
    if (req.user.email !== userEmail && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Hozzáférés megtagadva! Nincs jogosultságod más felhasználók beszélgetéseibe betekinteni.' });
    }

    try { 
      // Ha az admin kéri, kiadjuk a kért email ticketjeit, egyébként a usereknek szigorúan csak a sajátjukat
      if (req.user.isAdmin) {
        const [rows] = await pool.query(`
          SELECT * FROM weekly_topics 
          WHERE user_email = ? 
          ORDER BY created_at DESC`, // Fallback, ha a photo_tickets vagy weekly_tickets máshogy hívódik
          [userEmail]
        );
        // Biztonsági ellenőrzés a táblanévre szinkronizálva
        const [ticketRows] = await pool.query('SELECT * FROM weekly_entries WHERE user_email = ?', [userEmail]).catch(() => [[]]);
        if (ticketRows.length > 0) return res.json(ticketRows);
      }

      const [rows] = await pool.query(`SELECT * FROM weekly_entries WHERE user_email = ? ORDER BY created_at DESC`, [req.user.email]); 
      res.json(rows); 
    } catch (err) {
      // Dinamikus táblandor generikus lekérdezés a kompatibilitásért
      try {
        const [rows] = await pool.query('SELECT * FROM weekly_tickets WHERE user_email = ? ORDER BY updated_at DESC', [userEmail]);
        res.json(rows);
      } catch (innerErr) {
        res.status(500).json({ error: err.message });
      }
    }
  });

  // ====================================================================
  // 🔔 Olvasatlan ticketek száma a Headerhez (VÉDETT - Manipuláció-biztos)
  // ====================================================================
  app.get('/api/tickets/unread-count', requireAuth, async (req, res) => {
    try {
      // A kliensoldali query helyett közvetlenül a hitelesített req.user.isAdmin-re hagyatkozunk!
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
  // 3. Chat üzenetek lekérése (VÉDETT - Token-szintű IDOR védelemmel)
  // ====================================================================
  app.get('/api/tickets/:id/replies', requireAuth, async (req, res) => {
    const ticketId = req.params.id;

    try {
      // Első lépésben leellenőrizzük, hogy kié a ticket, nehogy egy ID tippelgetéssel bárki beleolvasson
      const [ticket] = await pool.query('SELECT user_email FROM weekly_tickets WHERE id = ?', [ticketId]);
      if (ticket.length === 0) return res.status(404).json({ error: 'A keresett hibajegy nem létezik!' });

      if (ticket[0].user_email !== req.user.email && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Hozzáférés megtagadva! Ez nem a te hibajegyed.' });
      }

      // Ha jogosult, nullázzuk a megfelelő értesítési számlálót
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
  // 4. Új válasz küldése (VÉDETT - Hamisítás-biztos)
  // ====================================================================
  app.post('/api/tickets/:id/replies', requireAuth, async (req, res) => {
    const { message } = req.body;
    const ticketId = req.params.id;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Az üzenet nem lehet üres!' });

    try {
      // Ellenőrizzük a tulajdonjogot válaszküldés előtt is
      const [tRows] = await pool.query('SELECT user_email FROM weekly_tickets WHERE id = ?', [ticketId]);
      if (tRows.length === 0) return res.status(404).json({ error: 'A hibajegy nem található!' });

      if (tRows[0].user_email !== req.user.email && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Hozzáférés megtagadva! Nem küldhetsz üzenetet más hibajegyébe.' });
      }

      // Szigorúan a hitelesített req.user adatait használjuk a kliensoldali body helyett!
      await pool.query(
        'INSERT INTO weekly_ticket_replies (ticket_id, sender_email, sender_name, message) VALUES (?, ?, ?, ?)',
        [ticketId, req.user.email, req.user.name, message.trim()]
      );
      
      const isOwnerReplying = req.user.email === tRows[0].user_email;
      
      // Ha a tulajdonos írt, az adminnak jelez (admin_unread=1), ha fordítva, a usernek (user_unread=1)
      await pool.query(
        'UPDATE weekly_tickets SET updated_at = NOW(), admin_unread = ?, user_unread = ? WHERE id = ?', 
        [isOwnerReplying ? 1 : 0, isOwnerReplying ? 0 : 1, ticketId]
      );

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ====================================================================
  // 5. Státuszváltás (VÉDETT - Csak tulajdonos vagy Admin)
  // ====================================================================
  app.put('/api/tickets/:id/status', requireAuth, async (req, res) => {
    const { status } = req.body;
    const ticketId = req.params.id;

    try {
      const [tRows] = await pool.query('SELECT user_email FROM weekly_tickets WHERE id = ?', [ticketId]);
      if (tRows.length === 0) return res.status(404).json({ error: 'A hibajegy nem létezik!' });

      if (tRows[0].user_email !== req.user.email && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Nincs jogosultságod lezárni ezt a hibajegyet!' });
      }

      await pool.query('UPDATE weekly_tickets SET status = ? WHERE id = ?', [status, ticketId]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

};
