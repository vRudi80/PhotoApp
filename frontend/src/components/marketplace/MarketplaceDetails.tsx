import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/constants';

export default function MarketplaceDetails({ adId, currentUser, onBack, onEdit }: any) {
  const [ad, setAd] = useState<any>(null);
  const [activeImage, setActiveImage] = useState('');
const conditionMap: { [key: string]: string } = {
    mint: 'Újszerű (Mint)',
    excellent: 'Kiváló állapotú (Excellent)',
    good: 'Megkímélt (Good)',
    heavily_used: 'Használt (Heavily Used)',
    for_parts: 'Hibás / Alkatrésznek (For Parts)'
  };
  useEffect(() => {
    const fetchAd = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/marketplace/ads/${adId}`);
        
        // JAVÍTÁS: A szerver tömböt küld, ki kell választani az első elemet
        const adData = Array.isArray(res.data) ? res.data[0] : res.data;
        
        console.log("DEBUG - Részletek betöltve:", adData);
        
        setAd(adData);
        
        // Biztonságos képbeállítás
        if (adData && adData.images && adData.images.length > 0) {
          setActiveImage(adData.images[0].url);
        }
      } catch (err) {
        console.error("Hiba a részletek betöltésekor:", err);
      }
    };
    
    if (adId) fetchAd();
  }, [adId]);
  if (!ad) return <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>Betöltés...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', color: 'white', animation: 'fadeIn 0.5s' }}>
      <button onClick={onBack} className="btn-cancel" style={{ marginBottom: '20px' }}>⬅ Vissza a listához</button>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', background: '#1e293b', padding: '30px', borderRadius: '16px' }}>
        
        {/* KÉPGALÉRIA */}
        <div>
          <img src={activeImage} style={{ width: '100%', height: '400px', objectFit: 'contain', borderRadius: '8px', background: '#0f172a' }} />
          <div style={{ display: 'flex', gap: '10px', marginTop: '15px', overflowX: 'auto' }}>
            {ad.images?.map((img: any, idx: number) => (
              <img key={idx} src={img.url} onClick={() => setActiveImage(img.url)} 
                style={{ width: '80px', height: '60px', objectFit: 'cover', cursor: 'pointer', border: activeImage === img.url ? '2px solid #38bdf8' : 'none', borderRadius: '4px' }} 
              />
            ))}
          </div>
        </div>

        {/* ADATOK */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h1 style={{ margin: 0, color: '#38bdf8' }}>{ad.title}</h1>
            {currentUser.email === ad.user_email && (
              <button onClick={onEdit} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer' }}>📝 Szerkesztés</button>
            )}
          </div>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f43f5e', margin: '15px 0' }}>{ad.price.toLocaleString()} {ad.currency}</p>
          <p style={{ color: '#94a3b8' }}>👤 Hirdető: <span style={{ color: 'white' }}>{ad.advertiser_name || 'N/A'}</span></p>
<p style={{ color: '#94a3b8' }}>📍 Helyszín: <span style={{ color: 'white' }}>{ad.location || 'N/A'}</span></p>
<p style={{ color: '#94a3b8' }}>
  ✨ Állapot: 
  <span style={{ color: 'white', marginLeft: '8px' }}>
    {/* Itt ellenőrizzük a két lehetséges kulcsot és a fordítást */}
    {conditionMap[ad.condition_state] || conditionMap[ad.conditionState] || ad.condition_state || ad.conditionState || 'N/A'}
  </span>
</p>

<div style={{ marginTop: '20px', borderTop: '1px solid #334155', paddingTop: '20px' }}>
  <h3 style={{ color: '#38bdf8' }}>Leírás</h3>
  <p style={{ lineHeight: '1.6' }}>{ad.description || 'Nincs leírás megadva.'}</p>
</div>
        </div>
      </div>
    </div>
  );
}
