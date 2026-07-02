import React, { useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';

// 🎯 ÚJ: Professzionális Lucide ikonok importálása
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

  // Kényszerített oldal-reset a fehér szegélyek ellen, amikor a Login betölt
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.backgroundColor = '#0f172a';
      document.body.style.backgroundColor = '#0f172a';
    }
  }, []);

  // Dinamikus logóválasztó
  const currentLogo = lang === 'en' ? logoEn : logoHu;

  // 🎯 MÓDOSÍTVA: Emojik helyett Lucide ikon-referenciák komoly, tiszta színekkel
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
      padding: '20px',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>
      
      {/* NYELVVÁLASZTÓ A JOBB FELSŐ SAROKBAN */}
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

      <div className="login-main-wrapper" style={{ display: 'grid', gap: '2.5rem', maxWidth: '1100px', width: '100%', alignItems: 'center', zIndex: 10 }}>
        
        {/* BAL OLDAL: Bemutatkozás és Funkciók */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          
          <img 
            src={currentLogo} 
            alt="PhotAwesome" 
            style={{ width: '100%', maxWidth: '180px', marginBottom: '0.5rem' }} 
          />
          
          <h1 style={{ fontSize: '2.2rem', margin: 0, color: '#f8fafc', lineHeight: '1.15', fontWeight: 800, letterSpacing: '-1px' }}>
            {t('loginTitlePre')} <br/>
            <span style={{ background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t('loginTitleGradient')}
            </span>
          </h1>
          
          <p style={{ fontSize: '1rem', color: '#64748b', marginBottom: '1rem', lineHeight: '1.5', maxWidth: '95%' }}>
            {t('loginMainDesc')}
          </p>
          
          {/* Funkciók Bento-Rács – 🎯 ÁTALAKÍTVA PROFESSZIONÁLIS SZOFTVER STÍLUSRA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
            {features.map((feat, idx) => (
              <div 
                key={idx} 
                className="feature-card"
                style={{ 
                  background: '#131b2e', 
                  border: '1px solid #222f47', 
                  borderRadius: '8px', 
                  padding: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '14px', 
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                {/* Tiszta, doboz és sallangmentes Lucide vektor ikon */}
                <div style={{ flexShrink: 0 }}>
                  <feat.icon size={20} color={feat.color} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 2px 0', color: '#f8fafc', fontSize: '0.92rem', fontWeight: '600', letterSpacing: '-0.2px' }}>
                    {t(feat.titleKey as any)}
                  </h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.78rem', lineHeight: '1.35' }}>
                    {t(feat.descKey as any)}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* JOBB OLDAL: Belépés Panel – 🎯 SZILÁRD SÖTÉT TÜKÖRPANEL LEKERÍKÍTÉSI FINOMÍTÁSSAL */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            background: '#131b2e', 
            padding: '2.5rem 2rem', 
            borderRadius: '12px', 
            border: '1px solid #222f47', 
            boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4)',
            textAlign: 'center', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            position: 'relative',
            width: '100%',
            maxWidth: '380px',
            boxSizing: 'border-box'
          }}>
            
            <div style={{ position: 'absolute', top: '-12px', background: '#f97316', color: 'white', padding: '4px 14px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              {t('loginBadge')}
            </div>

            <h2 style={{ fontSize: '1.4rem', marginBottom: '0.6rem', color: '#f8fafc', fontWeight: '700', letterSpacing: '-0.3px' }}>{t('loginBoxTitle')}</h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '2rem', lineHeight: '1.45' }}>
              {t('loginBoxDesc')}
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              <div style={{ padding: '3px', background: '#0f172a', borderRadius: '6px', border: '1px solid #222f47', width: '100%', display: 'flex', justifyContent: 'center', boxSizing: 'border-box' }}>
                <GoogleLogin 
                  onSuccess={(res) => onLoginSuccess(res.credential!)} 
                  shape="square" 
                  size="large" 
                  theme="filled_black" 
                  text="continue_with"
                  locale={lang} 
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.6rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <ShieldCheck size={12} color="#10b981" /> {t('loginSecureNotice')}
              </span>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        html, body, #root {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #0f172a !important;
          box-sizing: border-box;
        }

        .login-main-wrapper {
          grid-template-columns: 1.4fr 1fr;
        }

        .feature-card:hover {
          border-color: #475569 !important;
          background: #18253f !important;
        }

        @media (max-width: 950px) {
          .login-main-wrapper {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
          h1 {
            font-size: 1.8rem !important;
          }
          .feature-card {
            padding: 14px !important;
          }
        }
      `}</style>
    </div>
  );
}
