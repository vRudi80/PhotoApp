import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/constants';

export default function MarketplaceDetails({ adId, currentUser, onBack, onEdit }: any) {
  const [ad, setAd] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const conditionMap: { [key: string]: string } = {
    mint: 'Újszerű (Mint)',
    excellent: 'Kiváló állapotú (Excellent)',
    good: 'Megkímélt (Good)',
    heavily_used: 'Használt (Heavily Used)',
    for_parts: 'Hibás / Alkatrésznek (For Parts)'
  };

  useEffect(() => {
    if (!adId) return;
    
    const fetchAd = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${BACKEND_URL}/api/marketplace/ads/${adId}`);
        const data = Array.isArray(res.data) ? res.data[0] : res.data;
        setAd(data);
      } catch (err) {
        console.error("Hiba a részletek betöltésekor:", err);
        setError("Nem sikerült betölteni a hirdetést.");
      } finally {
        setLoading(false);
      }
    };
    fetchAd();
  }, [adId]);

  const handleMarkAsSold = async () => {
    if (!confirm('Biztosan eladottnak jelölöd a hirdetést?')) return;
    try {
      await axios.put(`${BACKEND_URL}/api/marketplace/ads/${adId}/sold`);
      alert('Hirdetés lezárva!');
      onBack();
    } catch (err) {
      alert('Hiba a lezárás során.');
    }
  };

  if (loading) return <div style={{ color: 'white', padding: '50px' }}>Betöltés...</div>;
  if (error) return <div style={{ color: 'red', padding: '50px' }}>{error}</div>;
  if (!ad) return <div style={{ color: 'white', padding: '50px' }}>Hirdetés nem található.</div>;

  // Biztonsági ellenőrzés a currentUser meglétére
  const isOwner = currentUser && ad.user_email === currentUser.email;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', color: '#e2e8f0', padding: '20px' }}>
      <button onClick={onBack} style={{ background: '#334155', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>
        ← Vissza
      </button>

      <div style={{ background: '#1e293b', padding: '30px', borderRadius: '16px', marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>{ad.title || 'Nincs cím'}</h1>
          {isOwner && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={onEdit} style={{ background: '#64748b', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>✏️ Szerkesztés</button>
              <button onClick={handleMarkAsSold} style={{ background: '#059669', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>✅ Eladottnak jelölés</button>
            </div>
          )}
        </div>

        <p style={{ fontSize: '1.8rem', color: '#f43f5e', fontWeight: 'bold' }}>{ad.price ? ad.price.toLocaleString() : 0} {ad.currency || 'HUF'}</p>
        
        {/* Képek biztonságos renderelése */}
        {ad.images && Array.isArray(ad.images) && ad.images.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '20px' }}>
            {ad.images.map((img: any, i: number) => (
              <img key={i} src={img.url} alt="Hirdetés kép" style={{ width: '150px', height: '100px', objectFit: 'cover', borderRadius: '8px' }} />
            ))}
          </div>
        )}

        <div style={{ margin: '20px 0', borderTop: '1px solid #334155', paddingTop: '20px' }}>
          <p><strong>Márka/Modell:</strong> {ad.brand} {ad.model_name}</p>
          <p><strong>Állapot:</strong> {conditionMap[ad.condition_state] || ad.condition_state}</p>
        </div>
      </div>
    </div>
  );
}
