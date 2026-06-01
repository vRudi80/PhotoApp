module.exports = function(app, pool) {

  // 1. Új hibajegy nyitása (User)
  app.post('/api/tickets', async (req, res) => {
    const { userEmail, userName, subject, message } = req.body;
    if (!userEmail || !subject || !message) return res.status(400).json({ error: 'Minden mező kitöltése kötelező!' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Létrehozzuk a fő ticketet
      const [ticketResult] = await conn.query(
        'INSERT INTO weekly_tickets (user_email, user_name, subject, status) VALUES (?, ?, ?, ?)',
        [userEmail, userName, subject, 'open']
      );
      const ticketId = ticketResult.insertId;

      // Elmentjük az első üzenetet válaszként
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

  // 2. Hibajegyek listázása (Admin lát mindent, User csak a sajátját)
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

  // 3. Egy konkrét ticket válaszainak (chat előzményeinek) lekérése
  app.get('/api/tickets/:id/replies', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM weekly_ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC', [req.params.id]);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Új válasz küldése egy ticketbe (Admin vagy User)
  app.post('/api/tickets/:id/replies', async (req, res) => {
    const { senderEmail, senderName, message } = req.body;
    const ticketId = req.params.id;
    if (!message) return res.status(400).json({ error: 'Az üzenet nem lehet üres!' });

    try {
      // Beszúrjuk a választ
      await pool.query(
        'INSERT INTO weekly_ticket_replies (ticket_id, sender_email, sender_name, message) VALUES (?, ?, ?, ?)',
        [ticketId, senderEmail, senderName, message]
      );
      
      // Frissítjük a fő ticket módosítási idejét, hogy felugorjon a lista elejére
      await pool.query('UPDATE weekly_tickets SET updated_at = NOW() WHERE id = ?', [ticketId]);

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Ticket státuszának módosítása vagy lezárása
  app.put('/api/tickets/:id/status', async (req, res) => {
    const { status } = req.body; // 'open', 'in_progress', 'closed'
    try {
      await pool.query('UPDATE weekly_tickets SET status = ? WHERE id = ?', [status, req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

};
