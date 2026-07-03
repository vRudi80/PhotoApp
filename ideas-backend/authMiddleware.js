// backend/middleware/authMiddleware.js
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@photawesome.com";

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Nincs hitelesítési token, a hozzáférés megtagadva!' });
    }

    const token = authHeader.split(' ')[1];
    
    // Google Token ellenőrzése
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    
    // Eltároljuk a hitelesített felhasználót a kérésben
    req.user = {
      email: payload.email,
      name: payload.name,
      isAdmin: payload.email === ADMIN_EMAIL
    };

    next(); // Minden jó, mehetünk a végpontra
  } catch (error) {
    console.error("Auth hiba:", error);
    return res.status(401).json({ error: 'Érvénytelen vagy lejárt token!' });
  }
};

module.exports = { requireAuth };
