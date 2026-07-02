import React from 'react';
import { GoogleLogin } from '@react-oauth/google';

// Helyes, egy mappán belüli relatív útvonalak a logókhoz
import logoHu from './logo_hu2.png'; 
import logoEn from './logo_en2.png'; 

// Behozzuk a nyelvi kontextust
import { useLanguage } from '../context/LanguageContext';

interface LoginScreenProps {
  onLoginSuccess: (credential: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  
  // Aktiváljuk a kontextust
  const { t, lang, setLang } = useLanguage();

  // Dinamikus logóválasztó
  const currentLogo = lang === 'en' ? logoEn : logoHu;

  const features = [
    { icon: '🔥', titleKey: 'loginFeatMatchTitle', descKey: 'loginFeatMatchDesc', color: '#f97316' },
    { icon: '🏆', titleKey: 'loginFeatFiapTitle', descKey: 'loginFeatFiapDesc', color: '#f43f5e' },
    { icon: '🌍', titleKey: 'loginFeatMapTitle', descKey: 'loginFeatMapDesc', color: '#10b981' },
    { icon: '🖼️', titleKey: 'loginFeatAiTitle', descKey: 'loginFeatAiDesc', color: '#f59e0b' },
    { icon: '👥', titleKey: 'loginFeatClubTitle', descKey: 'loginFeatClubDesc', color: '#06b6d4' },
    { icon: '📝', titleKey: 'loginFeatContestsTitle', descKey: 'loginFeatContestsDesc', color: '#8b5cf6' }
  ];

  return (
    <div style={{
      minHeight: '100vh', 
      width: '100%',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      position: 'relative', 
      backgroundColor: '#0f172a', 
      fontFamily: 'Inter, sans-serif', 
      padding: '20px',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>
      
      {/* NYELVVÁLASZTÓ A JOBB FELSŐ SAROKBAN */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100 }}>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(10px)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
           <button 
              onClick={() => setLang('hu')} 
              style={{ 
                background: lang === 'hu' ? 'linear-gradient(135deg, #f97316, #ef4444)' : 'transparent', 
                color: lang === 'hu' ? 'white' : '#94a3b8', 
                border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' 
              }}
            >
              <img 
                src="https://flagcdn.com/16x12/hu.png" 
                width="16" 
                height="12" 
                alt="HU" 
                style={{ borderRadius: '2px', display: 'block', objectFit: 'cover' }} 
              />
              <span style={{ fontSize: '0.75rem' }}>HU</span>
            </button>
            <button 
              onClick={() => setLang('en')} 
              style={{ 
                background: lang === 'en' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'transparent', 
                color: lang === 'en' ? 'white' : '#94a3b8', 
                border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' 
              }}
            >
              <img 
                src="https://flagcdn.com/16x12/gb.png" 
                width="16" 
                height="12" 
                alt="EN" 
                style={{ borderRadius: '2px', display: 'block', objectFit: 'cover' }} 
              />
              <span style={{ fontSize: '0.75rem' }}>EN</span>
            </button>
        </div>
      </div>

      {/* 🎯 RESZPONZÍV FŐ KONTÉNER OSZTÁLLYAL ELLÁTVA */}
      <div className="login-main-wrapper" style={{ display: 'grid', gap: '2.5rem', maxWidth: '1140px', width: '100%', alignItems: 'center', zIndex: 10 }}>
        
        {/* BAL OLDAL: Bemutatkozás és Funkciók */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '100%' }}>
          
          <img 
            src={currentLogo} 
            alt="PhotAwesome" 
            style={{ width: '100%', maxWidth: '200px', marginBottom: '0.5rem' }} 
          />
          
          <h1 style={{ fontSize: '2.3rem', margin: 0, color: '#f8fafc', lineHeight: '1.15', fontWeight: 800, letterSpacing: '-1px' }}>
            {t('loginTitlePre')} <br/>
            <span style={{ background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t('loginTitleGradient')}
            </span>
          </h1>
          
          <p style={{ fontSize: '1.05rem', color: '#94a3b8', marginBottom: '1rem', lineHeight: '1.5', maxWidth: '100%' }}>
            {t('loginMainDesc')}
          </p>
          
          {/* Funkciók Bento-Rács */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.8rem' }}>
            {features.map((feat, idx) => (
              <div 
                key={idx} 
                className="feature-card"
                style={{ 
                  background: 'rgba(30, 41, 59, 0.4)', 
                  border: '1px solid rgba(255,255,255,0.05)', 
                  borderRadius: '16px', 
                  padding: '0.8rem 1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <div style={{ fontSize: '1.6rem', background: `${feat.color}15`, padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {feat.icon}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 2px 0', color: '#f8fafc', fontSize: '0.95rem', fontWeight: 'bold' }}>
                    {t(feat.titleKey as any)}
                  </h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.78rem', lineHeight: '1.3' }}>
                    {t(feat.descKey as any)}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* JOBB OLDAL: Belépés Panel */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            background: '#1e293b', 
            padding: '2.5rem 2rem', 
            borderRadius: '24px', 
            border: '1px solid #334155', 
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5)',
            textAlign: 'center', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            position: 'relative',
            width: '100%',
            maxWidth: '400px',
            boxSizing: 'border-box'
          }}>
            
            <div style={{ position: 'absolute', top: '-14px', background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: 'white', padding: '5px 16px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(249, 115, 22, 0.3)' }}>
              {t('loginBadge')}
            </div>

            <h2 style={{ fontSize: '1.6rem', marginBottom: '0.8rem', color: '#f8fafc', fontWeight: '800' }}>{t('loginBoxTitle')}</h2>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '2rem', lineHeight: '1.5' }}>
              {t('loginBoxDesc')}
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              <div style={{ padding: '4px', background: 'rgba(255,255,255,0.02)', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.06)', width: '100%', display: 'flex', justifyContent: 'center', boxSizing: 'border-box' }}>
                <GoogleLogin 
                  onSuccess={(res) => onLoginSuccess(res.credential!)} 
                  shape="pill" 
                  size="large" 
                  theme="filled_black" 
                  text="continue_with"
                  locale={lang} 
                />
              </div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                {t('loginSecureNotice')}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ── 🎯 BRUTÁLISAN STABIL ÉS ELLENŐRZÖTT RESZPONZÍV CSS LAYER ── */}
      <style>{`
        /* Globális Reset a "fehér keret" és beszűrődések végleges kiirtására */
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #0f172a !important;
          box-sizing: border-box;
        }

        /* Alapértelmezett elrendezés széles monitorokon (2 oszlopos Bento elrendezés) */
        .login-main-wrapper {
          grid-template-columns: 1.3fr 1fr;
        }

        /* Animáció és interakció a Bento kártyákhoz */
        .feature-card:hover {
          transform: translateY(-4px);
          background: rgba(30, 41, 59, 0.8) !important;
          border-color: rgba(255,255,255,0.15) !important;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        }

        /* Törhetetlen mobil nézet és kisebb kijelzők optimalizálása (Átváltás 1 oszlopra) */
        @media (max-width: 900px) {
          .login-main-wrapper {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
          h1 {
            font-size: 1.9rem !important;
          }
          .feature-card {
            padding: 0.75rem 0.9rem !important;
          }
        }
      `}</style>
    </div>
  );
}
