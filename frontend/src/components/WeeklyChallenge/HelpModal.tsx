import React from 'react';

// Nyelvi kontextus betöltése
import { useLanguage } from '../../context/LanguageContext';

// Téma környezet betöltése
import { useTheme } from '../../context/ThemeContext';

// 🎯 Professzionális Lucide Ikonok importálása
import { 
  X, 
  Scale, 
  Eye, 
  Zap, 
  Crown, 
  Gift, 
  Award, 
  BookOpen,
  Sparkles,
  Coins,
  MapPin
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: { name: string; color: string; bg: string };
}

export default function HelpModal({ isOpen, onClose, currentLevel }: HelpModalProps) {
  const { t, lang } = useLanguage();

  let isLight = false;
  try {
    const themeContext = useTheme();
    if (themeContext) {
      isLight = themeContext.theme === 'light';
    }
  } catch (e) {}

  if (!isOpen) return null;

  // 🔄 Rangfordító híd
  const nameMap: Record<string, string> = {
    'Újonc 🌱': 'Fényleső 🌱',
    'Bojtár 🪶': 'Megfigyelő 👁️',
    'Nyomolvasó 🎯': 'Képvadász 📷',
    'Íjász 🏹': 'Komponista 📐',
    'Lovas 🐎': 'Fényíró 🎞️',
    'Sólyom 🦅': 'Esztéta 💎',
    'Vitéz ⚔️': 'Szakértő 🎯',
    'Bajnok 🛡️': 'Képmester 🎨',
    'Törzsfő ⭐': 'Nagymester 🌟',
    'Hadúr 🔱': 'Virtuóz ⚡',
    'Táltos 🔥': 'Fotóguru 🔥',
    'Fejedelem 👑': 'Vizuális Legenda 👑'
  };

  // 🇬🇧 Angol rangnév szótár
  const rankNamesEn: Record<string, string> = {
    'Fényleső 🌱': 'Light Seeker 🌱',
    'Megfigyelő 👁️': 'Observer 👁️',
    'Képvadász 📷': 'Photo Hunter 📷',
    'Komponista 📐': 'Composer 📐',
    'Fényíró 🎞️': 'Light Writer 🎞️',
    'Esztéta 💎': 'Aesthete 💎',
    'Szakértő 🎯': 'Expert 🎯',
    'Képmester 🎨': 'Photo Master 🎨',
    'Nagymester 🌟': 'Grandmaster 🌟',
    'Virtuóz ⚡': 'Virtuoso ⚡',
    'Fotóguru 🔥': 'Photo Guru 🔥',
    'Vizuális Legenda 👑': 'Visual Legend 👑'
  };

  const normalizedMyRankName = nameMap[currentLevel?.name] || currentLevel?.name;

  // 🪙 A ranglétra követelményei most már tisztán a Globális Pontok egyenlegére mutatnak
  const rankLadderData = [
    { name: 'Fényleső 🌱', reqHu: '0 - 29 globális pont', reqEn: '0 - 29 global points', power: '✨ +1 / 🔥 +2', color: '#94a3b8' },
    { name: 'Megfigyelő 👁️', reqHu: '30 - 99 globális pont', reqEn: '30 - 99 global points', power: '✨ +2 / 🔥 +3', color: '#cbd5e1' },
    { name: 'Képvadász 📷', reqHu: '100 - 249 globális pont', reqEn: '100 - 249 global points', power: '✨ +2 / 🔥 +4', color: '#38bdf8' },
    { name: 'Komponista 📐', reqHu: '250 - 499 globális pont', reqEn: '250 - 499 global points', power: '✨ +3 / 🔥 +5', color: '#60a5fa' },
    { name: 'Fényíró 🎞️', reqHu: '500 - 799 pont ÉS 1+ győzelem', reqEn: '500 - 799 pts AND 1+ win', power: '✨ +3 / 🔥 +6', color: '#10b981' },
    { name: 'Esztéta 💎', reqHu: '800 - 1299 pont ÉS 2+ győzelem', reqEn: '800 - 1299 pts AND 2+ wins', power: '✨ +4 / 🔥 +7', color: '#059669' },
    { name: 'Szakértő 🎯', reqHu: '1300 - 1999 pont ÉS 3+ győzelem', reqEn: '1300 - 1999 pts AND 3+ wins', power: '✨ +4 / 🔥 +8', color: '#a78bfa' },
    { name: 'Képmester 🎨', reqHu: '2000 - 3199 pont ÉS 5+ győzelem', reqEn: '2000 - 3199 pts AND 5+ wins', power: '✨ +5 / 🔥 +10', color: '#ec4899' },
    { name: 'Nagymester 🌟', reqHu: '3200 - 4799 pont ÉS 7+ győzelem', reqEn: '3200 - 4799 pts AND 7+ wins', power: '✨ +5 / 🔥 +12', color: '#f59e0b' },
    { name: 'Virtuóz ⚡', reqHu: '4800 - 6999 pont ÉS 9+ győzelem', reqEn: '4800 - 6999 pts AND 9+ wins', power: '✨ +6 / 🔥 +14', color: '#eab308' },
    { name: 'Fotóguru 🔥', reqHu: '7000 - 9999 pont ÉS 12+ győzelem', reqEn: '7000 - 9999 pts AND 12+ wins', power: '✨ +7 / 🔥 +17', color: '#ef4444' },
    { name: 'Vizuális Legenda 👑', reqHu: '10000+ pont ÉS 15+ győzelem', reqEn: '10000+ pts AND 15+ wins', power: '✨ +8 / 🔥 +20', color: '#fbbf24' }
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: isLight ? 'rgba(240,244,248,0.92)' : 'rgba(9,13,22,0.92)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', boxSizing: 'border-box', animation: 'fadeIn 0.2s ease-out' }}>
      
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '8px', width: '100%', maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto', padding: '24px', position: 'relative', boxSizing: 'border-box', boxShadow: '0 12px 30px rgba(0,0,0,0.1)' }}>
        
        {/* Bezárás gomb */}
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'var(--text-body)', width: '28px', height: '28px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.1s', justifyContent: 'center' }}
          className="help-close-cross"
        >
          <X size={14} />
        </button>
        
        <h2 style={{ color: 'var(--text-title)', margin: '0 0 20px 0', fontSize: '1.3rem', fontWeight: '700', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={18} color={isLight ? '#0284c7' : '#38bdf8'} /> {t('helpTitle')}
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* 🪙 ÚJ: KÖZPONTI GLOBÁLIS PONTRENDSZER ÉS BOLT SZABÁLYZAT */}
          <div style={{ background: 'var(--bg-main)', padding: '20px', borderRadius: '6px', border: '1px solid var(--border-main)', borderLeft: '4px solid #fbbf24' }}>
            <h4 style={{ color: '#fbbf24', margin: '0 0 10px 0', fontSize: '1.05rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '-0.2px' }}>
              <Coins size={16} /> {lang === 'en' ? 'Global Points Economy' : 'Globális Pontrendszer & Tárca'}
            </h4>
            <div style={{ color: 'var(--text-body)', fontSize: '0.85rem', lineHeight: '1.55', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ margin: 0 }}>
                {lang === 'en' 
                  ? 'PhotAwesome rewards your community activity with Global Points! Points are pooled into your account and can be spent across the entire application on premium features or tools.' 
                  : 'A PhotAwesome virtuális pontokkal jutalmazza a közösségi aktivitásodat! A megszerzett pontjaid egy központi tárcában gyűlnek, amit az alkalmazás bármely pontján beválthatsz prémium előnyökre vagy digitális eszközökre.'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '5px' }}>
                <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-main)' }}>
                  <b style={{ color: '#10b981', display: 'block', fontSize: '0.82rem', marginBottom: '4px' }}>📥 {lang === 'en' ? 'HOW TO EARN:' : 'PONTKERESÉS:'}</b>
                  <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '0.78rem', lineHeight: '1.4' }}>
                    <li>{lang === 'en' ? 'Arena Victory: +100 / +50 / +25 pts' : 'Aréna dobogó: +100 / +50 / +25 pont'}</li>
                    <li>{lang === 'en' ? 'Full Arena Voting: +10 pts' : 'Teljes Aréna szavazás leadása: +10 pont'}</li>
                    <li>{lang === 'en' ? 'Upload new Map Location: +20 pts' : 'Új fotós helyszín a térképre: +20 pont'}</li>
                    <li>{lang === 'en' ? 'New Forum post: +10 pts' : 'Új poszt a fórumon: +10 pont'}</li>
                    <li>{lang === 'en' ? 'Comment on a post: +5 pts' : 'Hozzászólás egy poszthoz: +5 pont'}</li>
                    <li>{lang === 'en' ? 'Like a post or comment: +1 pts' : 'Poszt vagy hozzászólás kedvelése: +1 pont'}</li>
                  </ul>
                </div>
                <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-main)' }}>
                  <b style={{ color: '#ef4444', display: 'block', fontSize: '0.82rem', marginBottom: '4px' }}>📤 {lang === 'en' ? 'HOW TO SPEND:' : 'PONTBEVÁLTÁS:'}</b>
                  <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '0.78rem', lineHeight: '1.4' }}>
                    <li>{lang === 'en' ? '1x Joker Swap item: 50 points' : '1 db Joker Csere kupon: 50 pont'}</li>
                    <li>{lang === 'en' ? '7 Days Premium Access: 200 points' : '7 napos Prémium tagság: 200 pont'}</li>
                    <li>{lang === 'en' ? 'More rewards coming soon!' : 'Hamarosan: AI elemzések, egyedi keretek!'}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* ⚖️ KIEGYENSÚLYOZOTT PONTRENDSZER (FAIR SCORE) SZEKCIÓ */}
          <div style={{ background: 'var(--bg-main)', padding: '20px', borderRadius: '6px', border: '1px solid var(--border-main)' }}>
            <h4 style={{ color: isLight ? '#0284c7' : '#38bdf8', margin: '0 0 10px 0', fontSize: '1.05rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '-0.2px' }}>
              <Scale size={16} /> {t('helpFairScoreTitle')}
            </h4>
            <div style={{ color: 'var(--text-body)', fontSize: '0.85rem', lineHeight: '1.55', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: 0 }}>{t('helpFairScoreIntro')}</p>

              <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '4px', borderLeft: '3px solid #a78bfa', border: '1px solid var(--border-main)', borderLeftColor: '#a78bfa' }}>
                <b style={{ color: '#a78bfa', display: 'block', marginBottom: '2px', fontSize: '0.88rem' }}>{t('helpFairScoreAnchorTitle')}</b>
                {t('helpFairScoreAnchorDesc')}
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '4px', borderLeft: '3px solid #f43f5e', border: '1px solid var(--border-main)', borderLeftColor: '#f43f5e' }}>
                <b style={{ color: '#f43f5e', display: 'block', marginBottom: '2px', fontSize: '0.88rem' }}>{t('helpFairScoreDisciplineTitle')}</b>
                {t('helpFairScoreDisciplineDesc')}
              </div>

              <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '2px', borderTop: '1px dashed var(--border-main)', paddingTop: '8px', margin: 0, fontSize: '0.82rem' }}>
                {t('helpFairScoreExample')}
              </p>
            </div>
          </div>

          {/* Láthatósági mérő szekció */}
          <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-main)', borderLeft: `3px solid ${isLight ? '#d97706' : '#f59e0b'}` }}>
            <h4 style={{ color: isLight ? '#d97706' : '#f59e0b', margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><Eye size={14} /> {t('helpExposureTitle')}</h4>
            <p style={{ color: 'var(--text-body)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
              {t('helpExposureDesc')}
            </p>
          </div>

          {/* Joker szekció */}
          <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-main)', borderLeft: `3px solid ${isLight ? '#be123c' : '#e11d48'}` }}>
            <h4 style={{ color: isLight ? '#be123c' : '#e11d48', margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={14} /> {t('helpJokerTitle')}</h4>
            <p style={{ color: 'var(--text-body)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
              {t('helpJokerDesc')}
            </p>
          </div>

          {/* Képmester szekció */}
          <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-main)', borderLeft: `3px solid ${isLight ? '#7c3aed' : '#a78bfa'}` }}>
            <h4 style={{ color: isLight ? '#7c3aed' : '#a78bfa', margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><Crown size={14} /> {t('helpMasterTitle')}</h4>
            <p style={{ color: 'var(--text-body)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
              {t('helpMasterDesc')}
            </p>
          </div>

          {/* 🎯 FRISSÍTVE: Pontrendszer-alapú Aréna nyereményjáték leírások */}
          <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-main)', borderLeft: `3px solid ${isLight ? '#b45309' : '#fbbf24'}` }}>
            <h4 style={{ color: isLight ? '#b45309' : '#fbbf24', margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><Gift size={14} /> {t('helpRewardsTitle')}</h4>
            <p style={{ color: 'var(--text-body)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
              {lang === 'en'
                ? 'At the closing of the Arena room, players receive the following Global Points automatically added to their wallet based on their final rank:'
                : 'A futamok lezárásakor a végső sorrend alapján a rendszer automatikusan az alábbi Globális Pontokat írja jóvá a fotósok számláján:'}
            </p>
            <ul style={{ color: 'var(--text-title)', fontSize: '0.85rem', margin: '8px 0 0 0', paddingLeft: '16px', lineHeight: '1.7', listStyleType: 'none' }}>
              <li style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><span>🥇</span> <span><b>1. {lang === 'en' ? 'Place' : 'Helyezett'}:</b> <span style={{ color: '#10b981', fontWeight: '800' }}>+100 {lang === 'en' ? 'Global Points' : 'Globális pont'}</span></span></li>
              <li style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}><span>🥈</span> <span><b>2. {lang === 'en' ? 'Place' : 'Helyezett'}:</b> <span style={{ color: '#38bdf8', fontWeight: '800' }}>+50 {lang === 'en' ? 'Global Points' : 'Globális pont'}</span></span></li>
              <li style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}><span>🥉</span> <span><b>3. {lang === 'en' ? 'Place' : 'Helyezett'}:</b> <span style={{ color: '#f59e0b', fontWeight: '800' }}>+25 {lang === 'en' ? 'Global Points' : 'Globális pont'}</span></span></li>
              <li style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px', borderTop: '1px dashed var(--border-main)', paddingTop: '6px' }}><span>⚡</span> <span><b>{lang === 'en' ? 'Full Voting Bonus' : 'Szavazási bónusz'}:</b> <span style={{ color: '#fbbf24', fontWeight: '800' }}>+10 {lang === 'en' ? 'Points' : 'Pont'}</span> ({lang === 'en' ? 'For rating all available photos' : 'Ha az összes elérhető képet elbíráltad'})</span></li>
            </ul>
          </div>
          
          {/* Ranglétra szekció */}
          <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-main)', borderLeft: `3px solid ${isLight ? '#0284c7' : '#38bdf8'}` }}>
            <h4 style={{ color: isLight ? '#0284c7' : '#38bdf8', margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><Award size={14} /> {t('helpRanksTitle')}</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: '1.45', margin: '0 0 12px 0' }}>
              {t('helpRanksDesc')}
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {rankLadderData.map((rank, i) => {
                const isMyRank = normalizedMyRankName === rank.name;
                
                const displayName = lang === 'en' ? (rankNamesEn[rank.name] || rank.name) : rank.name;
                const displayReq = lang === 'en' ? rank.reqEn : rank.reqHu;

                let adaptiveColor = rank.color;
                if (isLight) {
                  if (rank.name.includes('Fényleső')) adaptiveColor = '#64748b';
                  else if (rank.name.includes('Megfigyelő')) adaptiveColor = '#475569';
                  else if (rank.name.includes('Képvadász')) adaptiveColor = '#0284c7';
                  else if (rank.name.includes('Komponista')) adaptiveColor = '#2563eb';
                  else if (rank.name.includes('Fényíró')) adaptiveColor = '#059669';
                  else if (rank.name.includes('Esztéta')) adaptiveColor = '#047857';
                  else if (rank.name.includes('Szakértő')) adaptiveColor = '#7c3aed';
                  else if (rank.name.includes('Képmester')) adaptiveColor = '#db2777';
                  else if (rank.name.includes('Nagymester')) adaptiveColor = '#d97706';
                  else if (rank.name.includes('Virtuóz')) adaptiveColor = '#ca8a04';
                  else if (rank.name.includes('Fotóguru')) adaptiveColor = '#dc2626';
                  else if (rank.name.includes('Vizuális Legenda')) adaptiveColor = '#b45309';
                }

                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: isMyRank ? 'var(--hover-overlay)' : 'var(--bg-card)', border: isMyRank ? `1px solid ${adaptiveColor}` : '1px solid var(--border-main)', borderRadius: '4px' }}>
                    <div>
                      <div style={{ color: adaptiveColor, fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {displayName} {isMyRank && <span style={{ fontSize: '0.62rem', background: adaptiveColor, color: isLight ? '#ffffff' : '#0f172a', padding: '1px 5px', borderRadius: '2px', fontWeight: 'bold', textTransform: 'uppercase' }}>{t('helpYou')}</span>}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '1px' }}>{lang === 'en' ? 'Required:' : 'Szükséges:'} {displayReq}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: '600', color: 'var(--text-body)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                      {rank.power}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
      
      <style>{`
        .help-close-cross:hover {
          background: var(--hover-overlay) !important;
          color: var(--text-title) !important;
        }
      `}</style>
    </div>
  );
}
