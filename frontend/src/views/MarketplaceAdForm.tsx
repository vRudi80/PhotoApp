import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { useLanguage } from '../context/LanguageContext';

interface MarketplaceViewProps {
  user: any;
  setActiveTab: (tab: string) => void;
}

export default function MarketplaceView({ user, setActiveTab }: MarketplaceViewProps) {
  const { t, lang } = useLanguage();
  
  // Átmeneti dummy adatok, amíg be nem kötöd az API-t
  const [ads, setAds] = useState([
    { id: 1, title: 'Nikon Z6 II váz hibátlan állapotban', price: '450 000 Ft', type: 'sell', date: '2023.10.12', author: 'Kovács János', image: '📷' },
    { id: 2, title: 'Keresek: Sony FE 85mm f/1.8', price: 'Megegyezés szerint', type: 'buy', date: '2023.10.10', author: 'Nagy Péter', image: '🔍' },
    { id: 3, title: 'Godox V1 vaku (Canon)', price: '65 000 Ft', type: 'sell', date: '2023.10.09', author: 'Szabó Anna', image: '⚡' },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* 1. ÜDVÖZLŐ FEJLÉC ÉS GOMBOK (Dashboard stílusban) */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
        padding: '30px', 
        borderRadius: '16px', 
        border: '1px solid #334155', 
        marginBottom: '25px', 
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        flexWrap: 'wrap', 
        gap: '20px' 
      }}>
        <div>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5rem', color: '#f8fafc' }}>
            🛒 {t('navMarketplace') || 'Piactér'}
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '1.1rem' }}>
            {t('marketDesc') || 'Add el feleslegessé vált fotós eszközeidet, vagy böngéssz a tagok ajánlatai között!'}
          </p>
        </div>
        
        <div>
          <button 
            className="market-btn-primary"
            onClick={() => setActiveTab('marketplace_new')}
          >
            + {t('marketPostAd') || 'Új hirdetés feladása'}
          </button>
        </div>
      </div>

      {/* 2. SZŰRŐK SÁVJA (Opcionális, de hasznos) */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap' }}>
        <button className="market-filter-btn active">Mind</button>
        <button className="market-filter-btn">Eladó eszközök</button>
        <button className="market-filter-btn">Keresnek</button>
        <button className="market-filter-btn">Szolgáltatás / Egyéb</button>
      </div>

      {/* 3. TERMÉKEK RÁCSHÁLÓZATA (Dashboard Csempék stílusban) */}
      {isLoading ? (
        <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '25px', background: '#1e293b', borderRadius: '12px', border: '1px dashed #475569', textAlign: 'center', animation: 'pulse 2s infinite' }}>
          Töltés...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {ads.map((ad) => (
            <div 
              key={ad.id} 
              className="market-card"
              onClick={() => setActiveTab(`marketplace_item_${ad.id}`)}
            >
              {/* Kis ikon a sarokban a típushoz */}
              <div style={{ position: 'absolute', top: '15px', right: '15px', background: ad.type === 'sell' ? '#10b98120' : '#3b82f620', color: ad.type === 'sell' ? '#10b981' : '#3b82f6', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${ad.type === 'sell' ? '#10b98150' : '#3b82f650'}` }}>
                {ad.type === 'sell' ? 'Eladó' : 'Keres'}
              </div>

              {/* Fénykép placeholder / Ikon */}
              <div style={{ fontSize: '3rem', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', border: '1px dashed #475569' }}>
                {ad.image}
              </div>
              
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#f8fafc', lineHeight: '1.4' }}>
                {ad.title}
              </h3>
              
              <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ec4899', marginBottom: '15px' }}>
                {ad.price}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem', borderTop: '1px solid #334155', paddingTop: '15px' }}>
                <span>👤 {ad.author}</span>
                <span>🕒 {ad.date}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- STÍLUSOK --- */}
      <style>{`
        /* Kártya stílusok (Dashboard másolata, pici igazítással) */
        .market-card {
          background: #1e293b;
          border-radius: 16px;
          padding: 25px;
          cursor: pointer;
          border: 1px solid #334155;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .market-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 30px rgba(0,0,0,0.3);
          border-color: #ec4899;
        }

        /* Fő gomb stílus */
        .market-btn-primary {
          background: linear-gradient(135deg, #ec4899, #be185d);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);
          transition: all 0.2s;
          font-size: 1.05rem;
        }
        .market-btn-primary:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(236, 72, 153, 0.6);
        }

        /* Szűrő gombok */
        .market-filter-btn {
          background: #1e293b;
          color: #94a3b8;
          border: 1px solid #334155;
          padding: 8px 16px;
          border-radius: 100px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .market-filter-btn:hover {
          border-color: #64748b;
          color: #f8fafc;
        }
        .market-filter-btn.active {
          background: #334155;
          color: #f8fafc;
          border-color: #475569;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
