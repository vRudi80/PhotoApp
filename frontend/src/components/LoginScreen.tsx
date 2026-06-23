import React, { useMemo, useState, useRef, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';

// 🎯 ÚJ IMPORTOK: Helyes, egy mappán belüli relatív útvonalak
import logoHu from './logo_hu2.png'; 
import logoEn from './logo_en2.png'; 

// Behozzuk a nyelvi kontextust
import { useLanguage } from '../context/LanguageContext';

interface LoginScreenProps {
  onLoginSuccess: (credential: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  
  // 🎯 Aktiváljuk a kontextust
  const { t, lang, setLang } = useLanguage();

  // 🎯 DINAMIKUS LOGÓVÁLASZTÓ
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
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      position: 'relative', 
      backgroundColor: '#0f172a',
      backgroundImage: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.98) 100%), url("https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=2070&auto=format&fit=crop")',
      backgroundSize: 'cover', 
      backgroundPosition: 'center', 
      backgroundAttachment: 'fixed',
      fontFamily: 'Inter, sans-serif', 
      overflow: 'hidden', 
      padding: '2rem'
    }}>

      {/* 🔮 PRÉMIUM HÁTTÉR-SZŰRŐ: Ez a láthatatlan mátrix szűri ki a tiszta fehér (#ffffff) pixeleket */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id="remove-white-bg">
          <feColorMatrix type="matrix" values="
            1 0 0 0 0
            0 1 0 0 0
            0 0 1 0 0
            -1 -1 -1 3 -0.1
          "/>
        </filter>
      </svg>
      
      {/* NYELVVÁLASZTÓ A JOBB FELSŐ SAROKBAN */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100 }}>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(10px)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
           <button 
              onClick={() => setLang('hu')} 
              style={{ 
                background: lang === 'hu' ? 'linear-gradient(135deg, #f97316, #ef4444)' : 'transparent', 
                color: lang === 'hu' ? 'white' : '#94a3b8', 
                border: 'none', padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' 
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
                border: 'none', padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' 
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

      {/* Háttér fények */}
      <div className="bg-glow" style={{ position: 'absolute', top: '-10%', left: '-10%', width: '500px', height: '500px', background: '#38bdf8', filter: 'blur(200px)', opacity: 0.15, borderRadius: '50%' }}></div>
      <div className="bg-glow" style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '500px', height: '500px', background: '#8b5cf6', filter: 'blur(200px)', opacity: 0.15, borderRadius: '50%' }}></div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4rem', maxWidth: '1200px', width: '100%', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        
        {/* BAL OLDAL: Bemutatkozás és Funkciók */}
        <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'slideInLeft 0.8s ease-out' }}>
          
          <img 
            src={currentLogo} 
            alt="PhotAwesome" 
            style={{ 
              width: '100%', 
              maxWidth: '240px', 
              marginBottom: '1rem', 
              filter: 'url(#remove-white-bg) drop-shadow(0px 10px 25px rgba(0,0,0,0.65))' 
            }} 
          />
          
          <h1 style={{ fontSize: '3rem', margin: 0, color: '#f8fafc', lineHeight: '1.1', fontWeight: 800, letterSpacing: '-1px' }}>
            {t('loginTitlePre')} <br/>
            <span style={{ background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t('loginTitleGradient')}
            </span>
          </h1>
          
          <p style={{ fontSize: '1.15rem', color: '#94a3b8', marginBottom: '1.5rem', lineHeight: '1.6', maxWidth: '90%' }}>
            {t('loginMainDesc')}
          </p>
          
          {/* Funkciók Bento-Rács */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {features.map((feat, idx) => (
              <div 
                key={idx} 
                className="feature-card"
                style={{ 
                  background: 'rgba(30, 41, 59, 0.4)', 
                  border: '1px solid rgba(255,255,255,0.05)', 
                  borderRadius: '16px', 
                  padding: '1rem 1.2rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <div style={{ fontSize: '1.8rem', background: `${feat.color}20`, padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {feat.icon}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#f8fafc', fontSize: '1rem' }}>
                    {t(feat.titleKey as any)}
                  </h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem', lineHeight: '1.3' }}>
                    {t(feat.descKey as any)}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* JOBB OLDAL: Belépés Panel */}
        <div style={{ flex: '1 1 350px', maxWidth: '420px', width: '100%', animation: 'slideInRight 0.8s ease-out' }}>
          {/* 🎯 JAVÍTVA: Kivettük az ártalmas le-fel lebegő animációt és a backdrop szűrőket a bejelentkező kártyáról a zökkenőmentes gombnyomásért */}
          <div className="login-panel-static" style={{
            background: '#111827', 
            padding: '3.5rem 2.5rem', 
            borderRadius: '24px', 
            border: '1px solid rgba(255, 255, 255, 0.08)', 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
            textAlign: 'center', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            position: 'relative'
          }}>
            
            <div style={{ position: 'absolute', top: '-15px', background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: 'white', padding: '6px 16px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(249, 115, 22, 0.4)' }}>
              {t('loginBadge')}
            </div>

            <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#f8fafc', fontWeight: '800' }}>{t('loginBoxTitle')}</h2>
            <p style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '2.5rem', lineHeight: '1.6' }}>
              {t('loginBoxDesc')}
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              {/* 🎯 JAVÍTVA: Letisztított, statikus wrapper a Google iframe zónájának */}
              <div className="google-btn-wrapper-static" style={{ padding: '4px', background: 'rgba(255,255,255,0.02)', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.06)', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin 
                  onSuccess={(res) => onLoginSuccess(res.credential!)} 
                  shape="pill" 
                  size="large" 
                  theme="filled_black" 
                  text="continue_with"
                  locale={lang} 
                
                />
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                {t('loginSecureNotice')}
              </span>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .feature-card:hover {
          transform: translateY(-5px);
          background: rgba(30, 41, 59, 0.8) !important;
          border-color: rgba(255,255,255,0.15) !important;
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
