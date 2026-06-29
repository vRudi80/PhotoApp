const nodemailer = require('nodemailer');

module.exports = function(app, pool) {

  // ====================================================================
  // 📧 TÖMEGES E-MAIL KÜLDŐ MODUL AZ ADMIN FELÜLETHEZ
  // ====================================================================
  app.post('/api/admin/send-bulk-email', async (req, res) => {
    const { emails, subject, body } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'Nincsenek megadva címzettek.' });
    }

    try {
      // 1. SMTP Transporter konfigurálása környezeti változókból
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com', // Ha Gmailezel, ez tökéletes
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true, // 465-ös porthoz true kell
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });

      // 2. Levél felépítése (Címzettek rejtve a BCC-ben)
      const mailOptions = {
        from: `"PhotAwesome Admin" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER, // Magadnak küldöd
        bcc: emails.join(','),     // A userek egymástól függetlenül kapják meg titkos másolatként!
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333;">
            ${body.replace(/\n/g, '<br>')}
          </div>
          <hr style="border: 0; border-bottom: 1px solid #ccc; margin-top: 30px;">
          <small style="color: #888;">Ez egy automatikusan küldött üzenet a PhotAwesome rendszeréből.</small>
        `
      };

      // 3. Levél kiküldése
      const info = await transporter.sendMail(mailOptions);
      console.log(`📧 E-mailek sikeresen elküldve. Címzettek száma: ${emails.length}`);

      res.json({ success: true, message: `${emails.length} e-mail sikeresen elküldve.` });

    } catch (error) {
      console.error("❌ Hiba az e-mail küldésekor:", error);
      res.status(500).json({ error: 'Szerveroldali hiba történt a levélküldés során.' });
    }
  });

};
