module.exports = function(app, pool) {

  // 1. Új hibajegy nyitása (User) - KIBŐVÍTVE admin jelzéssel
  app.post('/api/tickets', async (req, res) => {
    const { userEmail, userName, subject, message } = req.body;
    if (!userEmail || !subject || !message) return res.status(400).json({ error: 'Minden mező kitöltése kötelező!' });

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

  // 2. Hibajegyek listázása
  app.get('/api/tickets', async (req, res) => {
    const { userEmail, isAdmin } = req.query;
    if (!userEmail) return res.status(400).json({ error: 'Hiányzó email cím!' });

    try {
      let rows;
      if (isAdmin === 'true') {
        [rows] = await pool.query('SELECT * FROM weekly_tickets ORDER BY updated_at DESC');
      } else {
        [rows] = await pool.query('SELECT * FROM weekly_tickets WHERE user_email = ? ORDER BY updated_at DESC', [userEmail]);
      }
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // NEW: Globális olvasatlan ticketek száma a Headerhez
  app.get('/api/tickets/unread-count', async (req, res) => {
    const { userEmail, isAdmin } = req.query;
    if (!userEmail) return res.status(400).json({ error: 'Hiányzó email!' });

    try {
      let count = 0;
      if (isAdmin === 'true') {
        const [rows] = await pool.query("SELECT COUNT(*) as count FROM weekly_tickets WHERE admin_unread = 1 AND status != 'closed'");
        count = rows[0].count;
      } else {
        const [rows] = await pool.query("SELECT COUNT(*) as count FROM weekly_tickets WHERE user_email = ? AND user_unread = 1", [userEmail]);
        count = rows[0].count;
      }
      res.json({ count });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Chat lekérése - JAVÍTVA: Megnyitáskor AZONNAL nullázza a jelzőt!
  app.get('/api/tickets/:id/replies', async (req, res) => {
    const { userEmail, isAdmin } = req.query;
    try {
      // Ha megnyitották, nullázzuk a megfelelő értesítést
      if (isAdmin === 'true') {
        await pool.query('UPDATE weekly_tickets SET admin_unread = 0 WHERE id = ?', [req.params.id]);
      } else if (userEmail) {
        await pool.query('UPDATE weekly_tickets SET user_unread = 0 WHERE id = ?', [req.params.id]);
      }

      const [rows] = await pool.query('SELECT * FROM weekly_ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC', [req.params.id]);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Új válasz küldése (Admin vagy User) - KIBŐVÍTVE intelligens értesítéssel
  app.post('/api/tickets/:id/replies', async (req, res) => {
    const { senderEmail, senderName, message } = req.body;
    const ticketId = req.params.id;
    if (!message) return res.status(400).json({ error: 'Az üzenet nem lehet üres!' });

    try {
      await pool.query(
        'INSERT INTO weekly_ticket_replies (ticket_id, sender_email, sender_name, message) VALUES (?, ?, ?, ?)',
        [ticketId, senderEmail, senderName, message]
      );
      
      // Megnézzük ki a ticket eredeti tulajdonosa
      const [tRows] = await pool.query('SELECT user_email FROM weekly_tickets WHERE id = ?', [ticketId]);
      if (tRows.length > 0) {
        const isOwnerReplying = senderEmail === tRows[0].user_email;
        
        // Ha a tulajdonos írt, az adminnak jelez (admin_unread=1), ha fordítva, a usernek (user_unread=1)
        await pool.query(
          'UPDATE weekly_tickets SET updated_at = NOW(), admin_unread = ?, user_unread = ? WHERE id = ?', 
          [isOwnerReplying ? 1 : 0, isOwnerReplying ? 0 : 1, ticketId]
        );
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Státuszváltás
  app.put('/api/tickets/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
      await pool.query('UPDATE weekly_tickets SET status = ? WHERE id = ?', [status, req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

};
