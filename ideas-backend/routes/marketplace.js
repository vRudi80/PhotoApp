const cloudinary = require('cloudinary').v2;



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

 const cloudinary = require('cloudinary').v2;

app.get('/api/marketplace/upload-signature', (req, res) => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp: timestamp, folder: 'marketplace' },
    process.env.CLOUDINARY_API_SECRET
  );

  res.json({
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME
  });
});

  // HIRDETÉSEK LEKÉRÉSE (Most már hirdető nevével)
  app.get('/api/marketplace/ads', async (req, res) => {
    try {
      const [ads] = await pool.query(`
        SELECT a.*, u.name as advertiser_name,
               (SELECT cloudinary_url FROM photo_marketplace_images WHERE ad_id = a.id AND is_primary = 1 LIMIT 1) as cover_image 
        FROM photo_marketplace_ads a 
        LEFT JOIN photo_users u ON a.user_email = u.email
        WHERE a.is_active = 1 
        ORDER BY a.created_at DESC
      `);
      res.json(ads);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // EGY ADOTT HIRDETÉS ÉS ÖSSZES KÉPÉNEK LEKÉRÉSE (Hibabiztos verzió)
app.get('/api/marketplace/ads/:id', async (req, res) => {
  try {
    const adId = req.params.id;

    // 1. Lekérjük a hirdetés alap adatait (Ha a photo_users nem létezik, simán elhagyjuk a JOIN-t a teszt kedvéért)
    const [ads] = await pool.query(
      `SELECT * FROM photo_marketplace_ads WHERE id = ?`, 
      [adId]
    );

    if (ads.length === 0) {
      return res.status(404).json({ error: 'A hirdetés nem található.' });
    }

    const adData = ads[0];

    // 2. Lekérjük a hozzá tartozó képeket (Kipróbáljuk mindkét oszlopnév variációt)
    let images = [];
    try {
      // Megpróbáljuk a korábbi struktúra szerint lekérni
      const [imgRows] = await pool.query(
        `SELECT id, cloudinary_url AS url, cloudinary_public_id AS public_id FROM photo_marketplace_images WHERE ad_id = ?`, 
        [adId]
      );
      images = imgRows;
    } catch (imgErr) {
      // Ha az oszlopnevek simán url / public_id lennének a tábládban:
      try {
        const [imgRowsFallback] = await pool.query(
          `SELECT id, url, public_id FROM photo_marketplace_images WHERE ad_id = ?`, 
          [adId]
        );
        images = imgRowsFallback;
      } catch (e) {
        console.error("Képek lekérési hiba, üresen hagyjuk:", e.message);
      }
    }

    // 3. Próbáljuk megkeresni a hirdető nevét a photo_users-ből, ha létezik a tábla
    let advertiserName = 'Felhasználó';
    try {
      const [userRows] = await pool.query(
        `SELECT name FROM photo_users WHERE email = ? LIMIT 1`, 
        [adData.user_email]
      );
      if (userRows.length > 0) {
        advertiserName = userRows[0].name;
      }
    } catch (userErr) {
      console.error("Felhasználó név lekérési hiba:", userErr.message);
    }

    // Összerakjuk a frontondnek szükséges struktúrát
    const responseData = {
      id: adData.id,
      title: adData.title,
      brand: adData.brand,
      modelName: adData.model_name || adData.modelName,
      price: adData.price,
      currency: adData.currency || 'HUF',
      location: adData.location,
      category: adData.category,
      conditionState: adData.condition_state || adData.conditionState,
      description: adData.description,
      user_email: adData.user_email,
      advertiser_name: advertiserName,
      images: images
    };

    // Visszaküldjük tiszta objektumként
    res.json(responseData);

  } catch (err) {
    console.error('Súlyos szerverhiba a részleteknél:', err);
    res.status(500).json({ error: err.message });
  }
});

  // HIRDETÉS SZERKESZTÉSE
  app.put('/api/marketplace/ads/:id', checkPremium, async (req, res) => {
    const { title, brand, modelName, conditionState, price, description, location, specificAttributes, images } = req.body;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `UPDATE photo_marketplace_ads SET title=?, brand=?, model_name=?, condition_state=?, price=?, description=?, location=?, specific_attributes=? WHERE id=?`,
        [title, brand, modelName, conditionState, price, description, location, JSON.stringify(specificAttributes), req.params.id]
      );
      // Képek frissítése: legegyszerűbb törölni a régieket és beírni az újakat
      await conn.query('DELETE FROM photo_marketplace_images WHERE ad_id = ?', [req.params.id]);
      if (images && images.length > 0) {
        const imageValues = images.map((img, idx) => [req.params.id, img.url, img.public_id, idx === 0 ? 1 : 0]);
        await conn.query('INSERT INTO photo_marketplace_images (ad_id, cloudinary_url, cloudinary_public_id, is_primary) VALUES ?', [imageValues]);
      }
      await conn.commit();
      res.json({ success: true });
    } catch (err) {
      await conn.rollback();
      res.status(500).json({ error: err.message });
    } finally { conn.release(); }
  });

};
