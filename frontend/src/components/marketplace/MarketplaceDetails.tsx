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
  user_email: string; // A hirdető emailje
  is_active: number;
  specific_attributes: any;
  images: Array<{ url: string }>;
  advertiser_name?: string;
}

export default function MarketplaceDetails({ adId, currentUser, onBack, onEdit }: any) {
  const [ad, setAd] = useState<AdDetails | null>(null);
  const [message, setMessage] = useState('');
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
      await axios.put(`${BACKEND_URL}/api/marketplace/ads/${adId}/sold`);
      alert('Hirdetés lezárva!');
      onBack();
    } catch (err) {
      alert('Hiba a lezárás során.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${BACKEND_URL}/api/marketplace/messages`, {
        adId,
        receiverEmail: ad?.user_email,
        message
      });
      alert('Üzenet elküldve a hirdetőnek!');
      setMessage('');
    } catch (err) {
      alert('Hiba az üzenetküldéskor.');
    }
  };

  if (loading) return <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>Betöltés...</div>;
  if (!ad) return <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>Hirdetés nem található.</div>;

  const isOwner = currentUser.email === ad.user_email;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', color: '#e2e8f0', padding: '20px' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', marginBottom: '20px' }}>← Vissza a listához</button>
      
      <div style={{ background: '#1e293b', padding: '30px', borderRadius: '16px' }}>
        <h1>{ad.title}</h1>
        <p style={{ fontSize: '1.8rem', color: '#f43f5e', fontWeight: 'bold' }}>{ad.price.toLocaleString()} {ad.currency}</p>
        
        <div style={{ margin: '20px 0', borderTop: '1px solid #334155', paddingTop: '20px' }}>
          <p><strong>Márka/Modell:</strong> {ad.brand} {ad.model_name}</p>
          <p><strong>Állapot:</strong> {conditionMap[ad.condition_state] || ad.condition_state}</p>
          <p><strong>Helyszín:</strong> {ad.location}</p>
          
          {ad.specific_attributes?.shutterCount && (
            <p><strong>Rekeszszámláló:</strong> {ad.specific_attributes.shutterCount} expozíció</p>
          )}
        </div>

        <p style={{ lineHeight: '1.6', color: '#94a3b8' }}>{ad.description}</p>

        {isOwner ? (
          <div style={{ marginTop: '30px' }}>
            <button onClick={handleMarkAsSold} style={{ background: '#059669', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              ✅ Eladottnak jelölés
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} style={{ marginTop: '30px', background: '#0f172a', padding: '20px', borderRadius: '8px' }}>
            <h3>Érdeklődés a hirdetőnél</h3>
            <textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Írj üzenetet az eladónak..."
              style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '10px', borderRadius: '8px', minHeight: '80px' }}
            />
            <button type="submit" style={{ marginTop: '10px', background: '#6366f1', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              Küldés
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
