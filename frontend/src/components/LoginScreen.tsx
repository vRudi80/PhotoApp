import React, { useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';

// Professzionális Lucide ikonok importálása
import { 
  Flame, 
  Trophy, 
  MapPin, 
  Image as ImageIcon, 
  Users, 
  FileText,
  ShieldCheck
} from 'lucide-react';

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

  // Kényszerített oldal-reset a háttérszín konzisztenciájáért
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.backgroundColor = '#0f172a';
      document.body.style.backgroundColor = '#0f172a';
    }
  }, []);

  // Dinamikus logóválasztó
  const currentLogo = lang === 'en' ? logoEn : logoHu;

  const features = [
    { icon: Flame, titleKey: 'loginFeatMatchTitle', descKey: 'loginFeatMatchDesc', color: '#f97316' },
    { icon: Trophy, titleKey: 'loginFeatFiapTitle', descKey: 'loginFeatFiapDesc', color: '#fbbf24' },
    { icon: MapPin, titleKey: 'loginFeatMapTitle', descKey: 'loginFeatMapDesc', color: '#10b981' },
    { icon: ImageIcon, titleKey: 'loginFeatAiTitle', descKey: 'loginFeatAiDesc', color: '#a855f7' },
    { icon: Users, titleKey: 'loginFeatClubTitle', descKey: 'loginFeatClubDesc', color: '#06b6d4' },
    { icon: FileText, titleKey: 'loginFeatContestsTitle', descKey: 'loginFeatContestsDesc', color: '#38bdf8' }
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
      padding: '40px 20px',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>
      
      {/* NYELVVÁLASZTÓ INTEGRÁCIÓ */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100 }}>
        <div style={{ display: 'flex', gap: '4px', background: '#131b2e', padding: '3px', borderRadius: '6px', border: '1px solid #222f47' }}>
           <button 
              onClick={() => setLang('hu')} 
              style={{ 
                background: lang === 'hu' ? '#223147' : 'transparent', 
                color: lang === 'hu' ? '#f8fafc' : '#64748b', 
                border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px' 
              }}
            >
              <img 
                src="https://flagcdn.com/16x12/hu.png" 
                width="16" 
                height="12" 
                alt="HU" 
                style={{ borderRadius: '1px', display: 'block', objectFit: 'cover' }} 
              />
              <span style={{ fontSize: '0.75rem' }}>HU</span>
            </button>
            <button 
              onClick={() => setLang('en')} 
              style={{ 
                background: lang === 'en' ? '#223147' : 'transparent', 
                color: lang === 'en' ? '#f8fafc' : '#64748b', 
                border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px' 
              }}
            >
              <img 
                src="https://flagcdn.com/16x12/gb.png" 
                width="16" 
                height="12" 
                alt="EN" 
                style={{ borderRadius: '1px', display: 'block', objectFit: 'cover' }} 
              />
              <span style={{ fontSize: '0.75rem' }}>EN</span>
            </button>
        </div>
      </div>

      {/* Központi Hyper-Fókuszált Konténer */}
      <div className="login-central-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '640px', width: '100%', textAlign: 'center', zIndex: 10 }}>
        
        {/* Brand Logó */}
        <img 
          src={currentLogo} 
          alt="PhotAwesome" 
          style={{ width: '100%', maxWidth: '160px', marginBottom: '1.5rem' }} 
        />
        
        {/* Főcím */}
        <h1 style={{ fontSize: '2.4rem', margin: '0 0 12px 0', color: '#f8fafc', lineHeight: '1.15', fontWeight: 800, letterSpacing: '-1px' }}>
          {t('loginTitlePre')} <br/>
          <span style={{ background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('loginTitleGradient')}
          </span>
        </h1>
        
        {/* Részletes leírás */}
        <p style={{ fontSize: '0.98rem', color: '#64748b', marginBottom: '2rem', lineHeight: '1.5', maxWidth: '520px', margin: '0 auto 24px auto' }}>
          {t('loginMainDesc')}
        </p>
        
        {/* 🎯 KÖZPONTI BELÉPŐ DOBOZ – Tisztán standardizált CSS formátumban, hiba nélkül */}
        <div style={{
          background: '#131b2e', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid #222f47', 
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          width: '100%',
          maxWidth: '360px',
          boxSizing: 'border-box',
          marginBottom: '40px'
        }}>
          <div style={{ padding: '3px', background: '#0f172a', borderRadius: '4px', border: '1px solid #222f47', width: '100%', display: 'flex', justifyContent: 'center', boxSizing: 'border-box' }}>
            <GoogleLogin 
              onSuccess={(res) => onLoginSuccess(res.credential!)} 
              shape="square" 
              size="large" 
              theme="filled_black" 
              text="continue_with"
              locale={lang} 
            />
          </div>
          <span style={{ fontSize: '0.72rem', color: '#475569', marginTop: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontWeight: '500' }}>
            <ShieldCheck size={12} color="#10b981" /> {t('loginSecureNotice')}
          </span>
        </div>

        {/* Elválasztó vonal */}
        <div style={{ width: '100%', height: '1px', background: '#222f47', marginBottom: '24px' }}></div>

        {/* Funkciók kompakt mátrixa */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', width: '100%' }}>
          {features.map((feat, idx) => {
            const IconComponent = feat.icon;
            return (
              <div 
                key={idx} 
                className="feature-card"
                style={{ 
                  background: '#131b2e', 
                  border: '1px solid #222f47', 
                  borderRadius: '6px', 
                  padding: '14px 16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  textAlign: 'left',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  <IconComponent size={18} color={feat.color} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 1px 0', color: '#f8fafc', fontSize: '0.88rem', fontWeight: '600', letterSpacing: '-0.1px' }}>
                    {t(feat.titleKey as any)}
                  </h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.75rem', lineHeight: '1.3' }}>
                    {t(feat.descKey as any)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      <style>{`
        html, body, #root {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #0f172a !important;
          box-sizing: border-box;
        }

        .feature-card:hover {
          border-color: #475569 !important;
          background: #18253f !important;
        }

        @media (max-width: 600px) {
          h1 {
            font-size: 1.8rem !important;
          }
          .login-central-container {
            padding: 0 10px !important;
          }
        }
      `}</style>
    </div>
  );
}
