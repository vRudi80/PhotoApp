import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface VideoLoaderProps {
  fullPage?: boolean;
}

export default function VideoLoader({ fullPage = false }: VideoLoaderProps) {
  const { lang } = useLanguage();
  
  // 🎯 ÁLLAPOT A LASSULÁS ÉSZLELÉSÉHEZ
  const [isTakingTooLong, setIsLoadingTooLong] = useState(false);

  useEffect(() => {
    // ⏰ 1. IDŐZÍTŐ: 5 másodperc után figyelmeztetjük a felhasználót, hogy valami akadozik
    const warningTimer = setTimeout(() => {
      setIsLoadingTooLong(true);
    }, 5000);

    // ⏰ 2. WATCHDOG IDŐZÍTŐ: Ha 8 másodpercig sem történik semmi, erőszakkal újratöltjük az oldalt
    const watchdogTimer = setTimeout(() => {
      console.warn("🚨 Watchdog kibiztosítva: A betöltés beragadt, tiszta lap újratöltése indítva...");
      window.location.reload();
    }, 8000);

    // 🛡️ TAKARÍTÁS: Ha a betöltés sikeres és a komponens lekerül a képernyőről,
    // azonnal megsemmisítjük az időzítőket, nehogy feleslegesen töltsön újra!
    return () => {
      clearTimeout(warningTimer);
      clearTimeout(watchdogTimer);
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
    <div style={containerStyle} className="video-loader-wrapper">
      
      {/* Cinematic 16:9 arányú videó konténer */}
      <div style={{ 
        width: '90%', 
        maxWidth: fullPage ? '540px' : '340px', 
        aspectRatio: '16/9', 
        borderRadius: '16px', 
        overflow: 'hidden', 
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)', 
        border: '1px solid rgba(255,255,255,0.06)', 
        background: '#000', 
        position: 'relative' 
      }}>
        <video
          src={lang === 'en' ? '/splash_en.mp4' : '/splash_hu.mp4'}
          autoPlay
          muted
          playsInline
          loop
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Finoman pulzáló státusz szöveg */}
      <div style={{ marginTop: '20px', textAlign: 'center', animation: 'loaderPulse 1.8s infinite' }}>
        <h4 style={{ color: isTakingTooLong ? '#fb923c' : '#f8fafc', fontSize: fullPage ? '1.15rem' : '0.95rem', fontWeight: 'bold', margin: '0 0 6px 0', letterSpacing: '0.5px', transition: 'color 0.3s' }}>
          {isTakingTooLong 
            ? (lang === 'en' ? 'Connection unstable...' : 'A kapcsolat akadozik...') 
            : (lang === 'en' ? 'Loading data...' : 'Adatok betöltése...')}
        </h4>
        <p style={{ color: '#64748b', fontSize: fullPage ? '0.85rem' : '0.75rem', margin: 0 }}>
          {isTakingTooLong 
            ? (lang === 'en' ? 'Attempting to revive session / auto-refreshing' : 'Munkamenet helyreállítása / Automatikus frissítés mindjárt')
            : (lang === 'en' ? 'Please wait a moment' : 'Kérlek várj egy pillanatot')}
        </p>
      </div>

      <style>{`
        @keyframes loaderPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
