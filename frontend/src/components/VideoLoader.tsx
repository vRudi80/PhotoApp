import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface VideoLoaderProps {
  fullPage?: boolean; // 👈 Opcionális kapcsoló: teljes képernyős vagy konténer-szintű legyen
}

export default function VideoLoader({ fullPage = false }: VideoLoaderProps) {
  const { lang } = useLanguage();

  // Dinamikus stíluskezelés a rugalmas felhasználhatóságért
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
        <h4 style={{ color: '#f8fafc', fontSize: fullPage ? '1.15rem' : '0.95rem', fontWeight: 'bold', margin: '0 0 4px 0', letterSpacing: '0.5px' }}>
          {lang === 'en' ? 'Loading data...' : 'Adatok betöltése...'}
        </h4>
        <p style={{ color: '#64748b', fontSize: fullPage ? '0.85rem' : '0.75rem', margin: 0 }}>
          {lang === 'en' ? 'Please wait a moment' : 'Kérlek várj egy pillanatot'}
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
