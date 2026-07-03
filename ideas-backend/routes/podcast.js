const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🎯 JAVÍTVA: A te valódi admin e-mailedet állítottuk be biztonsági tartaléknak!
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kovari.rudolf@gmail.com";

// ====================================================================
// 🔒 GOLYÓÁLLÓ AUTHENTICATION MIDDLEWARE A PODCAST MODULHOZ
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
    console.error("🔒 Biztonsági őr hiba a podcast modulban:", error.message);
    return res.status(401).json({ error: 'Lejárt vagy érvénytelen munkamenet token!' });
  }
}

// Globális memóriatároló (Cache) a YouTube kvóta védelmében
let podcastCache = { data: null, lastFetched: 0 };

module.exports = function(app, pool) {
  
  // ====================================================================
  // 🎙️ YOUTUBE PODCAST AUTOMATIKUS LEKÉRDEZŐ VÉGPONT (VÉDETT)
  // ====================================================================
  app.get('/api/podcast', requireAuth, async (req, res) => {
    const now = Date.now();
    const CACHE_DURATION = 3600000; // 1 óra ezredmásodpercben

    // Ha van friss mentett adatunk az elmúlt 1 órából, azonnal azt adjuk vissza hálózati kérés nélkül
    if (podcastCache.data && (now - podcastCache.lastFetched < CACHE_DURATION)) {
      return res.json(podcastCache.data);
    }

    try {
      const API_KEY = process.env.YOUTUBE_API_KEY;
      const handle = 'kepolvasokpodcast'; // A csatornád egyedi @neve

      if (!API_KEY) {
        return res.status(500).json({ error: 'Hiányzó YOUTUBE_API_KEY a Render környezeti változók között!' });
      }

      // 1. Csatorna adatok lekérése a handle alapján (innen tudjuk meg a feltöltési lista ID-t)
      const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${handle}&key=${API_KEY}`;
      const channelRes = await axios.get(channelUrl);

      if (!channelRes.data.items || channelRes.data.items.length === 0) {
        return res.status(404).json({ error: 'A megadott YouTube csatorna nem található.' });
      }

      const uploadsPlaylistId = channelRes.data.items[0].contentDetails.relatedPlaylists.uploads;

      // 2. A legfrissebb 50 videó lekérése a feltöltési listából
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${uploadsPlaylistId}&key=${API_KEY}`;
      const playlistRes = await axios.get(playlistUrl);

      const videos = playlistRes.data.items.map(item => ({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
        publishedAt: item.snippet.publishedAt
      }));

      // Frissítjük a gyorsítótárat (cache)
      podcastCache.data = videos;
      podcastCache.lastFetched = now;

      res.json(videos);
    } catch (err) {
      console.error("❌ YouTube API hiba a különálló modulban:", err.message);
      
      // Ha a Google API épp hibát dobna, de van régi mentett adatunk, kisegítjük vele a felhasználót
      if (podcastCache.data) return res.json(podcastCache.data);
      
      res.status(500).json({ error: 'Nem sikerült szinkronizálni a YouTube videókat.' });
    }
  });

};
