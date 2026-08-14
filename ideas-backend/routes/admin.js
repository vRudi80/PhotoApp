// 🎯 KÖZVETLENÜL A FRISSÍTETT KÖZPONTI AUTH MIDDLEWARE-T BEHÚZZUK:
const { requireAuth } = require('../authMiddleware');
const nodemailer = require('nodemailer');

module.exports = function(app, pool) {
  
  // ====================================================================
  // ✉️ TÖMEGES ADMIN E-MAIL KÜLDŐ VÉGPONT (VÉDETT)
  // ====================================================================
  app.post('/api/admin/send-bulk-email', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva! Nem vagy adminisztrátor.' });
    
    const { emails, subject, body } = req.body;
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'Nincsenek címzettek megadva.' });
    }

    // E-mail címek megtisztítása a hibás/üres értékektől
    const validEmails = emails.filter(e => typeof e === 'string' && e.includes('@'));

    if (validEmails.length === 0) {
      return res.status(400).json({ error: 'Nincs érvényes e-mail cím a listában.' });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: { 
          user: process.env.SMTP_USER, 
          // Mindkét változónevet elfogadja a .env fájlból
          pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS 
        }
      });

      // HTML felismerése
      const isHtml =
        /^\s*<!DOCTYPE/i.test(body) ||
        /^\s*<html/i.test(body) ||
        /<body/i.test(body) ||
        /<table/i.test(body) ||
        /<div/i.test(body);

      const mailOptions = {
        from: `"PhotAwesome - Kővári-Vágner Rudolf" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER,
        bcc: validEmails,
        subject,

        ...(isHtml
          ? {
              html: body
            }
          : {
              html: `
                <div style="
                    font-family:Arial,Helvetica,sans-serif;
                    max-width:700px;
                    margin:auto;
                    padding:30px;
                    line-height:1.6;
                    color:#333333;
                ">
                  ${body.replace(/\n/g, "<br>")}
                </div>
              `,
              text: body
            })
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: 'Levelek sikeresen elküldve.' });
    } catch (error) { 
      console.error("❌ E-mail küldési hiba:", error);
      res.status(500).json({ error: 'Szerveroldali hiba a küldés során: ' + (error.message || error) }); 
    }
  });
};
