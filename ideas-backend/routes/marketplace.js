const cloudinary = require('cloudinary').v2;

// Ha az index.js-ben még nincs konfigurálva a Cloudinary, akkor itt (vagy a főfájlban) tedd meg:

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


module.exports = function(app, pool, checkPremium) {

  // ==========================================
  // ÚJ HIRDETÉS FELADÁSA
  // ==========================================
  app.post('/api/marketplace/ads', checkPremium, async (req, res) => {
    const { 
      userEmail, category, title, brand, modelName, 
      conditionState, price, currency, description, location, 
      specificAttributes, images 
    } = req.body;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Alapadatok és dinamikus JSON attribútumok mentése
      const [adResult] = await conn.query(
        `INSERT INTO photo_marketplace_ads 
        (user_email, category, title, brand, model_name, condition_state, price, currency, description, location, specific_attributes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userEmail, category, title, brand, modelName, conditionState, price, 
          currency || 'HUF', description, location, 
          JSON.stringify(specificAttributes || {})
        ]
      );

      const newAdId = adResult.insertId;

      // 2. Képek bekötése a hirdetéshez (ha vannak)
      if (images && images.length > 0) {
        const imageValues = images.map((img, index) => [
          newAdId, 
          img.url, 
          img.public_id, 
          index === 0 ? 1 : 0 // Az első kép lesz a borítókép
        ]);
        
        await conn.query(
          'INSERT INTO photo_marketplace_images (ad_id, cloudinary_url, cloudinary_public_id, is_primary) VALUES ?',
          [imageValues]
        );
      }

      await conn.commit();
      res.json({ success: true, adId: newAdId });
    } catch (err) {
      await conn.rollback();
      res.status(500).json({ error: 'Hiba a hirdetés feladásakor: ' + err.message });
    } finally {
      conn.release();
    }
  });

  // ==========================================
  // CLOUDINARY BIZTONSÁGI ALÁÍRÁS GENERÁLÁSA
  // ==========================================
  app.get('/api/marketplace/upload-signature', checkPremium, (req, res) => {
    try {
      const timestamp = Math.round((new Date).getTime() / 1000);
      
      // Megadjuk, hogy a 'marketplace' mappába kérjük a feltöltést
      const signature = cloudinary.utils.api_sign_request({
        timestamp: timestamp,
        folder: 'marketplace'
      }, process.env.CLOUDINARY_API_SECRET);

      res.json({ 
        timestamp, 
        signature, 
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME
      });
    } catch (error) {
      res.status(500).json({ error: 'Hiba a Cloudinary aláírás generálásakor.' });
    }
  }); // <-- ITT JAVÍTOTTAM: A hiányzó zárójel pótolva!

  // ==========================================
  // HIRDETÉSEK LEKÉRÉSE (Előkészület a listázáshoz)
  // ==========================================
  app.get('/api/marketplace/ads', async (req, res) => {
    try {
      // Itt később bevezetjük a szűréseket (kategória, ár, állapot szerint)
      const [ads] = await pool.query(`
        SELECT a.*, 
               (SELECT cloudinary_url FROM photo_marketplace_images WHERE ad_id = a.id AND is_primary = 1 LIMIT 1) as cover_image 
        FROM photo_marketplace_ads a 
        WHERE a.is_active = 1 
        ORDER BY a.created_at DESC
      `);
      res.json(ads);
    } catch (err) {
      res.status(500).json({ error: 'Hiba a hirdetések lekérésekor: ' + err.message });
    }
  });

};
