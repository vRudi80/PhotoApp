import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/constants';

export default function MarketplaceDetails(props: any) {
  const { adId, currentUser, user, onBack, onEdit } = props;
  const activeUser = currentUser || user;

  const [ad, setAd] = useState<any>(null);
  const [activeImage, setActiveImage] = useState('');
  
  // Üzenetküldés állapotai
  const [isMessaging, setIsMessaging] = useState(false);
  const [messageBody, setMessageBody] = useState('');

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
        const adData = Array.isArray(res.data) ? res.data[0] : res.data;
        
        setAd(adData);
        if (adData && adData.images && adData.images.length > 0) {
          setActiveImage(adData.images[0].url);
        }
      } catch (err) {
        console.error("Hiba a részletek betöltésekor:", err);
      }
    };
    if (adId) fetchAd();
  }, [adId]);

  const handleMarkAsSold = async () => {
    try {
      const res = await axios.put(`${BACKEND_URL}/api/marketplace/ads/${adId}/sold`, 
        { userEmail: activeUser?.email }, 
        { withCredentials: true }
      );
      alert(res.data.message);
      window.location.reload();
    } catch (err) {
      alert('Hiba a státusz frissítésekor.');
    }
  };

  const handleSendMessage = async () => {
  if (!messageBody.trim()) return;
  
  // LOGOLJUK, MIT KÜLDÜNK
  console.log("Küldött adatok:", {
    adId,
    receiverEmail: ad.user_email,
    message: messageBody
  });

  try {
    const response = await axios.post(`${BACKEND_URL}/api/marketplace/messages`, {
      adId: adId,
      receiverEmail: ad.user_email,
      message: messageBody
    }, { withCredentials: true });
    
    alert('Üzenet elküldve!');
    setIsMessaging(false);
    setMessageBody('');
  } catch (err: any) {
    // ITT FOGJUK LÁTNI A PONTOS HIBAOKOT A KONZOLBAN
    console.error("Backend hiba:", err.response?.data);
    alert('Hiba az üzenetküldésnél: ' + (err.response?.data?.error || 'Ismeretlen hiba'));
  }
};

  if (!ad) return <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>Betöltés...</div>;

  const isOwner = activeUser?.email && ad?.user_email && activeUser.email === ad.user_email;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', color: 'white', padding: '20px', animation: 'fadeIn 0.5s' }}>
      <button onClick={onBack} style={{ background: '#334155', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' }}>
        ⬅ Vissza a listához
      </button>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155' }}>
        
        {/* KÉPGALÉRIA */}
        <div>
          <img src={activeImage} style={{ width: '100%', height: '400px', objectFit: 'contain', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155' }} alt={ad.title} />
          <div style={{ display: 'flex', gap: '10px', marginTop: '15px', overflowX: 'auto', paddingBottom: '5px' }}>
            {ad.images?.map((img: any, idx: number) => (
              <img 
                key={idx} 
                src={img.url} 
                onClick={() => setActiveImage(img.url)} 
                style={{ width: '80px', height: '60px', objectFit: 'cover', cursor: 'pointer', border: activeImage === img.url ? '2px solid #38bdf8' : '1px solid #334155', borderRadius: '4px', transition: 'all 0.2s' }} 
                alt=""
              />
            ))}
          </div>
        </div>

        {/* ADATOK SZEKCIÓ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
            <h1 style={{ margin: 0, color: '#38bdf8', fontSize: '2rem', fontWeight: 700 }}>{ad.title}</h1>
            
            <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
              {isOwner ? (
                <>
                  <button onClick={onEdit} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    📝 Szerkesztés
                  </button>
                  <button onClick={handleMarkAsSold} style={{ background: ad.is_active === 1 ? '#ef4444' : '#10b981', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {ad.is_active === 1 ? '🚫 Eladottnak jelöl' : '✅ Újra aktivál'}
                  </button>
                </>
              ) : (
                activeUser?.email && !isMessaging && (
                  <button onClick={() => setIsMessaging(true)} className="market-btn-secondary">
                    📩 Üzenet küldése
                  </button>
                )
              )}
            </div>
          </div>

          {/* ÜZENETKÜLDŐ PANEL */}
          {isMessaging && (
            <div className="message-panel">
              <textarea 
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Írd meg az ajánlatodat vagy kérdésedet..."
                rows={4}
              />
              <div className="panel-actions">
                <button onClick={() => setIsMessaging(false)} className="btn-cancel">Mégsem</button>
                <button onClick={handleSendMessage} className="btn-send">Küldés</button>
              </div>
            </div>
          )}
          
          <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f43f5e', margin: '5px 0' }}>
            {ad.price?.toLocaleString()} {ad.currency || 'HUF'}
          </p>
          
          <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ margin: 0, color: '#94a3b8' }}>👤 Hirdető: <span style={{ color: 'white', fontWeight: 500 }}>{ad.advertiser_name || 'Felhasználó'}</span></p>
            <p style={{ margin: 0, color: '#94a3b8' }}>📸 Gyártó / Márka: <span style={{ color: 'white', fontWeight: 500 }}>{ad.brand || 'N/A'}</span></p>
            <p style={{ margin: 0, color: '#94a3b8' }}>🔍 Modell / Típus: <span style={{ color: 'white', fontWeight: 500 }}>{ad.modelName || 'N/A'}</span></p>
            <p style={{ margin: 0, color: '#94a3b8' }}>✨ Állapot: <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{conditionMap[ad.conditionState] || ad.conditionState || 'N/A'}</span></p>
            <p style={{ margin: 0, color: '#94a3b8' }}>📍 Helyszín: <span style={{ color: 'white', fontWeight: 500 }}>{ad.location || 'Országos'}</span></p>
          </div>

          <div style={{ marginTop: '10px', borderTop: '1px solid #334155', paddingTop: '15px' }}>
            <h3 style={{ color: '#38bdf8', marginBottom: '10px', fontSize: '1.2rem' }}>Leírás</h3>
            <p style={{ lineHeight: '1.6', color: '#cbd5e1', margin: 0, whiteSpace: 'pre-line' }}>{ad.description || 'Nincs leírás megadva.'}</p>
          </div>
        </div>
      </div>

      <style>{`
        .message-panel { background: #0f172a; padding: 15px; border-radius: 12px; border: 1px solid #38bdf8; margin-top: 15px; }
        .message-panel textarea { width: 100%; background: #1e293b; border: 1px solid #334155; color: white; padding: 10px; border-radius: 8px; margin-bottom: 10px; resize: none; }
        .panel-actions { display: flex; gap: 10px; justify-content: flex-end; }
        .btn-send { background: #38bdf8; border: none; padding: 8px 16px; border-radius: 6px; color: #0f172a; font-weight: bold; cursor: pointer; }
        .btn-cancel { background: transparent; border: 1px solid #475569; color: #94a3b8; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
        .market-btn-secondary { background: #1e293b; border: 1px solid #38bdf8; color: #38bdf8; padding: 10px 20px; border-radius: 8px; cursor: pointer; transition: 0.3s; }
        .market-btn-secondary:hover { background: #38bdf8; color: #0f172a; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
