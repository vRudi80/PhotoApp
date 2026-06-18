import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/constants';

interface AdDetails {
  id: number;
  title: string;
  brand: string;
  model_name: string;
  price: number;
  currency: string;
  location: string;
  condition_state: string;
  description: string;
  user_email: string;
  is_active: number;
  specific_attributes: any;
  images: Array<{ url: string }>;
  advertiser_name?: string;
}

export default function MarketplaceDetails({ adId, currentUser, onBack, onEdit }: any) {
  const [ad, setAd] = useState<AdDetails | null>(null);
  const [loading, setLoading] = useState(true);

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
        setAd(Array.isArray(res.data) ? res.data[0] : res.data);
      } catch (err) {
        console.error("Hiba a részletek betöltésekor:", err);
      } finally {
        setLoading(false);
      }
    };
    if (adId) fetchAd();
  }, [adId]);

  const handleMarkAsSold = async () => {
    if (!confirm('Biztosan eladottnak jelölöd a hirdetést?')) return;
    try {
      // Itt a backend végpontodnak kellene lennie, ami frissíti az is_active = 0 értékre
      await axios.put(`${BACKEND_URL}/api/marketplace/ads/${adId}/sold`);
      alert('Hirdetés lezárva!');
      onBack();
    } catch (err) {
      alert('Hiba a lezárás során.');
    }
  };

  if (loading) return <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>Betöltés...</div>;
  if (!ad) return <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>Hirdetés nem található.</div>;

  const isOwner = currentUser.email === ad.user_email;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', color: '#e2e8f0', padding: '20px' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', marginBottom: '20px' }}>← Vissza a listához</button>
      
      <div style={{ background: '#1e293b', padding: '30px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>{ad.title}</h1>
          {isOwner && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={onEdit} style={{ background: '#64748b', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                ✏️ Szerkesztés
              </button>
              <button onClick={handleMarkAsSold} style={{ background: '#059669', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                ✅ Eladottnak jelölés
              </button>
            </div>
          )}
        </div>

        <p style={{ fontSize: '1.8rem', color: '#f43f5e', fontWeight: 'bold' }}>{ad.price.toLocaleString()} {ad.currency}</p>
        
        {/* Képek megjelenítése */}
        {ad.images && ad.images.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto' }}>
            {ad.images.map((img, i) => (
              <img key={i} src={img.url} style={{ width: '150px', height: '100px', objectFit: 'cover', borderRadius: '8px' }} />
            ))}
          </div>
        )}

        <div style={{ margin: '20px 0', borderTop: '1px solid #334155', paddingTop: '20px' }}>
          <p><strong>Márka/Modell:</strong> {ad.brand} {ad.model_name}</p>
          <p><strong>Állapot:</strong> {conditionMap[ad.condition_state] || ad.condition_state}</p>
          <p><strong>Helyszín:</strong> {ad.location}</p>
        </div>

        <p style={{ lineHeight: '1.6', color: '#94a3b8' }}>{ad.description}</p>
      </div>
    </div>
  );
}
