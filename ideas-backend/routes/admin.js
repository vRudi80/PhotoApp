const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kovari.rudolf@gmail.com";

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Hiányzó token!' });
    const token = authHeader.split(' ')[1];
    const ticket = await client.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
    req.user = { email: ticket.getPayload().email, isAdmin: ticket.getPayload().email === ADMIN_EMAIL };
    next();
  } catch (e) { return res.status(401).json({ error: 'Hibás munkamenet!' }); }
}

module.exports = function(app, pool) {
  // Szigorúan ellenőrizzük az admin státuszt hírlevélküldés előtt
  app.post('/api/admin/send-bulk-email', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva! Nem vagy adminisztrátor.' });
    
    const { emails, subject, body } = req.body;
    if (!emails || !Array.isArray(emails) || emails.length === 0) return res.status(400).json({ error: 'Nincsenek címzettek.' });

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      });

      const mailOptions = {
        from: `"PhotAwesome Admin" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER,
        bcc: emails.join(','),
        subject: subject,
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333;">${body.replace(/\n/g, '<br>')}</div>`
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: 'Levelek elküldve.' });
    } catch (error) { res.status(500).json({ error: 'Szerveroldali hiba a küldés során.' }); }
  });
};
