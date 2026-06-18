import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/constants';

export default function MarketplaceDetails({ adId, currentUser, onBack }: any) {
  const [ad, setAd] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const conditionMap: { [key: string]: string } = {
    mint: 'Újszerű',
    excellent: 'Kiváló állapotú',
    good: 'Megkímélt',
    heavily_used: 'Használt',
    for_parts: 'Hibás / Alkatrésznek'
  };

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/marketplace/ads/${adId}`);
        // A válasz lehet tömb vagy objektum is
        const data = Array.isArray(res.data) ? res.data[0] : res.data;
        console.log("Betöltött adat:", data);
        setAd(data);
      } catch (err) {
        console.error("Hiba a részletek betöltésekor:", err);
      } finally {
        setLoading(false);
      }
    };
    if (adId) fetchAd();
  }, [adId]);

  if (loading) return <div style={{ color: 'white', padding: '20px' }}>Betöltés...</div>;
  if (!ad) return <div style={{ color: 'white', padding: '20px' }}>Hirdetés nem található.</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', color: '#e2e8f0', padding: '20px' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', marginBottom: '20px' }}>← Vissza</button>
      
      <div style={{ background: '#1e293b', padding: '30px', borderRadius: '16px' }}>
        <h1>{ad.title}</h1>
        
        {/* KÉPEK MEGJELENÍTÉSE */}
        {ad.images && ad.images.length > 0 ? (
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '20px' }}>
            {ad.images.map((img: any, idx: number) => (
              <img key={idx} src={img.url || img.cloudinary_url} alt="Hirdetés kép" style={{ width: '200px', height: '150px', objectFit: 'cover', borderRadius: '8px' }} />
            ))}
          </div>
        ) : (
          <p style={{ color: '#64748b' }}>Nincs kép feltöltve.</p>
        )}

        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f43f5e' }}>{ad.price?.toLocaleString()} {ad.currency || 'HUF'}</p>
        
        {/* RÉSZLETEK - Rugalmas kulcskezeléssel */}
        <div style={{ margin: '20px 0', borderTop: '1px solid #334155', paddingTop: '15px' }}>
          <p><strong>Márka/Modell:</strong> {ad.brand} {ad.model_name || ad.modelName}</p>
          <p><strong>Állapot:</strong> {conditionMap[ad.condition_state || ad.conditionState] || ad.condition_state || 'N/A'}</p>
          <p><strong>Helyszín:</strong> {ad.location}</p>
        </div>

        <p style={{ color: '#94a3b8' }}>{ad.description}</p>

        {/* SPECIFIKUS ATTRIBÚTUMOK (pl. Rekeszszámláló) */}
        {ad.specific_attributes && (
            <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginTop: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>Technikai adatok</h4>
                {typeof ad.specific_attributes === 'string' ? (
                    <p>{ad.specific_attributes}</p>
                ) : (
                    Object.entries(ad.specific_attributes).map(([key, val]: any) => (
                        <p key={key} style={{ margin: '5px 0' }}><strong>{key}:</strong> {val}</p>
                    ))
                )}
            </div>
        )}
      </div>
    </div>
  );
}
