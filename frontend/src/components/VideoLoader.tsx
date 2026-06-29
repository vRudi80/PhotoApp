import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface VideoLoaderProps {
  fullPage?: boolean;
}

export default function VideoLoader({ fullPage = false }: VideoLoaderProps) {
  const { lang } = useLanguage();
  const [isTakingTooLong, setIsLoadingTooLong] = useState(false);
  const [showReloadButton, setShowReloadButton] = useState(false); // Új állapot a kézi gombnak
  
   
useEffect(() => {
    // ⏰ 1. 5 másodperc után sárga figyelmeztetés
    const warningTimer = setTimeout(() => {
      setIsLoadingTooLong(true);
    }, 5000);

    // ⏰ 2. 12 másodperc után felajánljuk a kézi újratöltést (NINCS AUTOMATIKUS RELOAD!)
    const manualReloadTimer = setTimeout(() => {
      console.warn("🚨 A szerver lassan válaszol (cold start).");
      setShowReloadButton(true);
    }, 12000);

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(manualReloadTimer);
    };
  }, []);

  const containerStyle: React.CSSProperties = fullPage
    ? {
        position: 'fixed',
        inset: 0,
        backgroundColor: '#090d16',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
      }
    : {
        width: '100%',
        padding: '50px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: fullPage ? '100vh' : '200px', background: 'transparent' }}>
      
      <div style={{ width: fullPage ? '140px' : '80px', height: fullPage ? '140px' : '80px', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 0 50px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.06)', background: '#000', position: 'relative' }}>
        <video
          src={lang === 'en' ? '/splash_en.mp4' : '/splash_hu.mp4'}
          autoPlay
          muted
          playsInline
          loop
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      <div style={{ marginTop: '20px', textAlign: 'center', animation: 'loaderPulse 1.8s infinite' }}>
        <h4 style={{ color: isTakingTooLong ? '#fb923c' : '#f8fafc', fontSize: fullPage ? '1.15rem' : '0.95rem', fontWeight: 'bold', margin: '0 0 6px 0', transition: 'color 0.3s' }}>
          {isTakingTooLong 
            ? (lang === 'en' ? 'Waking up the server...' : 'Szerver ébresztése (ez eltarthat pár másodpercig)...') 
            : (lang === 'en' ? 'Loading data...' : 'Adatok betöltése...')}
        </h4>
      </div>

      {/* 🎯 BIZTONSÁGI GOMB: Csak akkor jelenik meg, ha nagyon lassan tölt */}
      {showReloadButton && (
        <button 
          onClick={() => window.location.reload()}
          style={{ marginTop: '20px', padding: '10px 20px', background: '#334155', color: '#f8fafc', border: '1px solid #475569', borderRadius: '8px', cursor: 'pointer', zIndex: 10 }}
        >
          {lang === 'en' ? 'Force Reload' : 'Kézi újratöltés'}
        </button>
      )}
    </div>
  );
}
