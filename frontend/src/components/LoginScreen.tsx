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
  BookOpen,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Lock,
  Zap,
  Heart
} from 'lucide-react';

// Helyes, egy mappán belüli relatív útvonalak a logókhoz
import logoHu from './logo_hu2.png'; 
import logoEn from './logo_en2.png'; 

// Opcionálisan saját fotó importálása (ha a mappában van pl. hero_camera.jpg néven):
// import heroCameraImg from './hero_camera.jpg';

// Behozzuk a nyelvi kontextust
import { useLanguage } from '../context/LanguageContext';

// Behozzuk a téma környezetet
import { useTheme } from '../context/ThemeContext';

interface LoginScreenProps {
  onLoginSuccess: (credential: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  
  // Aktiváljuk a kontextusokat
  const { t, lang, setLang } = useLanguage();
  
  let theme = 'dark';
  try {
    const themeContext = useTheme();
    if (themeContext) {
      theme = themeContext.theme;
    }
  } catch (e) {}

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.backgroundColor = 'var(--bg-main)';
      document.body.style.backgroundColor = 'var(--bg-main)';
    }
  }, [theme]);

  // Dinamikus logóválasztó
  const currentLogo = lang === 'en' ? logoEn : logoHu;

  const features = [
    { icon: Flame, titleKey: 'loginFeatMatchTitle', descKey: 'loginFeatMatchDesc', color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)' },
    { icon: Trophy, titleKey: 'loginFeatFiapTitle', descKey: 'loginFeatFiapDesc', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)' },
    { icon: MapPin, titleKey: 'loginFeatMapTitle', descKey: 'loginFeatMapDesc', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    { icon: ImageIcon, titleKey: 'loginFeatAiTitle', descKey: 'loginFeatAiDesc', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)' },
    { icon: Users, titleKey: 'loginFeatClubTitle', descKey: 'loginFeatClubDesc', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' },
    { icon: FileText, titleKey: 'loginFeatContestsTitle', descKey: 'loginFeatContestsDesc', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' },
    { icon: BookOpen, titleKey: 'loginPhotoHistoryTitle', descKey: 'loginPhotoHistoryDesc', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' }
  ];

  const scrollToFeatures = () => {
    const element = document.getElementById('features-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{
      minHeight: '100vh', 
      width: '100%',
      position: 'relative', 
      backgroundColor: 'var(--bg-main)', 
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif', 
      boxSizing: 'border-box',
      overflowX: 'hidden',
      color: 'var(--text-title)'
    }}>
      
      {/* ── NYELVVÁLASZTÓ FEJLÉC ── */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100 }}>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(12px)', padding: '4px', borderRadius: '30px', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
           <button 
              onClick={() => setLang('hu')} 
              style={{ 
                background: lang === 'hu' ? '#a855f7' : 'transparent', 
                color: '#ffffff', 
                border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' 
              }}
            >
              <img src="https://flagcdn.com/16x12/hu.png" width="16" height="12" alt="HU" style={{ borderRadius: '2px', display: 'block', objectFit: 'cover' }} />
              <span style={{ fontSize: '0.75rem' }}>HU</span>
            </button>
            <button 
              onClick={() => setLang('en')} 
              style={{ 
                background: lang === 'en' ? '#a855f7' : 'transparent', 
                color: '#ffffff', 
                border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' 
              }}
            >
              <img src="https://flagcdn.com/16x12/gb.png" width="16" height="12" alt="EN" style={{ borderRadius: '2px', display: 'block', objectFit: 'cover' }} />
              <span style={{ fontSize: '0.75rem' }}>EN</span>
            </button>
        </div>
      </div>

      {/* ── 1. HERO SZEKCIÓ (CÍMLAP MELEG MEGVILÁGÍTÁSSAL) ── */}
      <div style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px 60px 20px',
        boxSizing: 'border-box',
        textAlign: 'center',
        background: `
          radial-gradient(circle at 50% 20%, rgba(168, 85, 247, 0.22) 0%, transparent 60%),
          radial-gradient(circle at 20% 80%, rgba(249, 115, 22, 0.18) 0%, transparent 50%),
          linear-gradient(180deg, rgba(15, 23, 42, 0.75) 0%, var(--bg-main) 100%)
        `
      }}>

        {/* Brand Logó */}
        <div style={{ marginBottom: '1.8rem', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' }}>
          <img 
            src={currentLogo} 
            alt="PhotAwesome" 
            style={{ width: '100%', maxWidth: '210px', height: 'auto' }} 
          />
        </div>

        {/* Jelvény / Tagline */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '30px',
          background: 'rgba(168, 85, 247, 0.15)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          color: '#c084fc',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '1.2rem'
        }}>
          <Sparkles size={15} /> A fotózás szerelmeseinek digitális otthona
        </div>

        {/* Főcím */}
        <h1 style={{ 
          fontSize: 'clamp(2.1rem, 5vw, 3.4rem)', 
          margin: '0 0 16px 0', 
          lineHeight: '1.15', 
          fontWeight: 900, 
          letterSpacing: '-1.5px',
          maxWidth: '800px'
        }}>
          A fotósok közössége.<br/>
          <span style={{ 
            background: 'linear-gradient(135deg, #38bdf8 0%, #a855f7 50%, #f97316 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            Egy helyen.
          </span>
        </h1>

        {/* Részletes leírás */}
        <p style={{ 
          fontSize: 'clamp(1rem, 2vw, 1.15rem)', 
          color: 'var(--text-body)', 
          lineHeight: '1.6', 
          maxWidth: '580px', 
          margin: '0 auto 32px auto',
          opacity: 0.95
        }}>
          Lépj be, és fedezd fel a játékokat, pályázatokat, a helyszíntérképet és kérj profi AI képelemzést a fotóidra!
        </p>

        {/* KÖZPONTI BELÉPŐ DOBOZ */}
        <div style={{
          background: 'var(--bg-card)', 
          padding: '28px 24px', 
          borderRadius: '20px', 
          border: '1px solid var(--border-main)', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.3), 0 0 40px rgba(168, 85, 247, 0.15)',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          width: '100%',
          maxWidth: '400px',
          boxSizing: 'border-box',
          marginBottom: '28px',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ 
            padding: '4px', 
            background: 'var(--bg-main)', 
            borderRadius: '8px', 
            border: '1px solid var(--border-main)', 
            width: '100%', 
            display: 'flex', 
            justifyContent: 'center', 
            boxSizing: 'border-box' 
          }}>
            <GoogleLogin 
              onSuccess={(res) => onLoginSuccess(res.credential!)} 
              shape="pill" 
              size="large" 
              theme={theme === 'dark' ? "filled_black" : "outline"} 
              text="continue_with"
              locale={lang} 
            />
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            marginTop: '16px',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontWeight: 500,
            flexWrap: 'wrap'
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} color="#10b981" /> Biztonságos
            </span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={14} color="#fbbf24" /> Nincs regisztrációs űrlap
            </span>
          </div>
        </div>

        {/* Görgető nyíl */}
        <button 
          onClick={scrollToFeatures} 
          aria-label="Fedezd fel a funkciókat"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            marginTop: '10px',
            transition: 'color 0.2s'
          }}
        >
          <span>Fedezd fel, mit kínálunk</span>
          <ChevronDown size={20} className="bounce-arrow" />
        </button>
      </div>

      {/* ── 2. "MIT TALÁLSZ ITT?" FUNKCIÓMÁTRIX ── */}
      <div id="features-section" style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '60px 20px 80px 20px',
        boxSizing: 'border-box'
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '2rem', margin: '0 0 10px 0', fontWeight: 800 }}>
            Mit találsz a PhotAwesome-on?
          </h2>
          <p style={{ color: 'var(--text-body)', margin: 0, fontSize: '1rem', opacity: 0.85 }}>
            Minden egy helyen, ami a fotózás iránti szenvedélyedet táplálja.
          </p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '20px', 
          width: '100%' 
        }}>
          {features.map((feat, idx) => {
            const IconComponent = feat.icon;
            return (
              <div 
                key={idx} 
                className="feature-card"
                style={{ 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border-main)', 
                  borderRadius: '16px', 
                  padding: '20px 22px', 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '16px', 
                  textAlign: 'left',
                  transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                <div style={{ 
                  flexShrink: 0, 
                  width: '46px', 
                  height: '46px', 
                  borderRadius: '12px', 
                  background: feat.bg, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <IconComponent size={24} color={feat.color} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-title)', fontSize: '1.05rem', fontWeight: 700 }}>
                    {t(feat.titleKey as any)}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-body)', fontSize: '0.88rem', lineHeight: '1.5', opacity: 0.85 }}>
                    {t(feat.descKey as any)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. INSPIRÁCIÓ ÉS MÁSODIK BELÉPÉSI PONT ("KEZDJÜK!") ── */}
      <div style={{
        background: 'linear-gradient(180deg, var(--bg-main) 0%, rgba(168, 85, 247, 0.12) 100%)',
        borderTop: '1px solid var(--border-main)',
        padding: '70px 20px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          
          <div style={{
            fontSize: '1.2rem',
            fontStyle: 'italic',
            color: 'var(--text-body)',
            lineHeight: '1.6',
            marginBottom: '28px',
            position: 'relative'
          }}>
            „A jó fotó nem a gépről szól, hanem arról, amit láttatni akarsz.”
          </div>

          <h2 style={{ fontSize: '2.1rem', margin: '0 0 12px 0', fontWeight: 800 }}>
            Kész vagy csatlakozni?
          </h2>
          <p style={{ color: 'var(--text-body)', margin: '0 0 30px 0', fontSize: '1rem', opacity: 0.9 }}>
            Jelentkezz be Google fiókoddal egyetlen kattintással, és válj a közösség részévé!
          </p>

          <div style={{ display: 'inline-block', background: 'var(--bg-card)', padding: '20px 28px', borderRadius: '20px', border: '1px solid var(--border-main)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <GoogleLogin 
              onSuccess={(res) => onLoginSuccess(res.credential!)} 
              shape="pill" 
              size="large" 
              theme={theme === 'dark' ? "filled_black" : "outline"} 
              text="continue_with"
              locale={lang} 
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '24px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Lock size={14} /> Biztonságos belépés</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={14} /> Azonnali hozzáférés</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Heart size={14} /> Közösség</span>
          </div>

        </div>
      </div>

      {/* ── REAKTÍV HOVER ÉS RESZPONZÍV STÍLUSOK ── */}
      <style>{`
        html, body, #root {
          margin: 0 !important;
          padding: 0 !important;
          background-color: var(--bg-main) !important;
          box-sizing: border-box;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          border-color: #a855f7 !important;
          box-shadow: 0 12px 30px rgba(168, 85, 247, 0.15) !important;
        }

        .bounce-arrow {
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-6px);
          }
          60% {
            transform: translateY(-3px);
          }
        }

        @media (max-width: 600px) {
          h1 {
            font-size: 2.1rem !important;
          }
          .feature-card {
            padding: 16px 18px !important;
          }
        }
      `}</style>
    </div>
  );
}
