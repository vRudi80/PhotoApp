import React from 'react';

// Nyelvi kontextus betöltése
import { useLanguage } from '../../context/LanguageContext';

// 🎯 ÚJ: Professzionális Lucide Ikonok importálása az AI-sallangok ellen
import { 
  X, 
  Scale, 
  Eye, 
  Zap, 
  Crown, 
  Gift, 
  Award, 
  BookOpen,
  Sparkles
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: { name: string; color: string; bg: string };
}

export default function HelpModal({ isOpen, onClose, currentLevel }: HelpModalProps) {
  // Aktiváljuk a fordítót (t) és a nyelv-figyelőt (lang)
  const { t, lang } = useLanguage();

  if (!isOpen) return null;

  // 🔄 RÉGI ÉS ÚJ RANGOK KÖZÖTTI INTELIGENS HÍD (Átmeneti névfordító)
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

  // 🇬🇧 Angol rangnév szótár a nemzetközi felülethez
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

  // Statikus ranglétra adatsor lefordított követelmény-szövegekkel
  const rankLadderData = [
    { name: 'Fényleső 🌱', reqHu: '0 - 29 pont', reqEn: '0 - 29 points', power: '✨ +1 / 🔥 +2', color: '#94a3b8' },
    { name: 'Megfigyelő 👁️', reqHu: '30 - 99 pont', reqEn: '30 - 99 points', power: '✨ +2 / 🔥 +3', color: '#cbd5e1' },
    { name: 'Képvadász 📷', reqHu: '100 - 249 pont', reqEn: '100 - 249 points', power: '✨ +2 / 🔥 +4', color: '#38bdf8' },
    { name: 'Komponista 📐', reqHu: '250 - 499 pont', reqEn: '250 - 499 points', power: '✨ +3 / 🔥 +5', color: '#60a5fa' },
    { name: 'Fényíró 🎞️', reqHu: '500 - 799 pont ÉS 1+ győzelem', reqEn: '500 - 799 points AND 1+ win', power: '✨ +3 / 🔥 +6', color: '#10b981' },
    { name: 'Esztéta 💎', reqHu: '800 - 1299 pont ÉS 2+ győzelem', reqEn: '800 - 1299 points AND 2+ wins', power: '✨ +4 / 🔥 +7', color: '#059669' },
    { name: 'Szakértő 🎯', reqHu: '1300 - 1999 pont ÉS 3+ győzelem', reqEn: '1300 - 1999 points AND 3+ wins', power: '✨ +4 / 🔥 +8', color: '#a78bfa' },
    { name: 'Képmester 🎨', reqHu: '2000 - 3199 pont ÉS 5+ győzelem', reqEn: '2000 - 3199 points AND 5+ wins', power: '✨ +5 / 🔥 +10', color: '#ec4899' },
    { name: 'Nagymester 🌟', reqHu: '3200 - 4799 pont ÉS 7+ győzelem', reqEn: '3200 - 4799 points AND 7+ wins', power: '✨ +5 / 🔥 +12', color: '#f59e0b' },
    { name: 'Virtuóz ⚡', reqHu: '4800 - 6999 pont ÉS 9+ győzelem', reqEn: '4800 - 6999 points AND 9+ wins', power: '✨ +6 / 🔥 +14', color: '#eab308' },
    { name: 'Fotóguru 🔥', reqHu: '7000 - 9999 pont ÉS 12+ győzelem', reqEn: '7000 - 9999 points AND 12+ wins', power: '✨ +7 / 🔥 +17', color: '#ef4444' },
    { name: 'Vizuális Legenda 👑', reqHu: '10000+ pont ÉS 15+ győzelem', reqEn: '10000+ points AND 15+ wins', power: '✨ +8 / 🔥 +20', color: '#fbbf24' }
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(9,13,22,0.9)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', boxSizing: 'border-box', animation: 'fadeIn 0.2s ease-out' }}>
      <div style={{ background: '#131b2e', border: '1px solid #222f47', borderRadius: '8px', width: '100%', maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto', padding: '24px', position: 'relative', boxSizing: 'border-box', boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>
        
        {/* Bezárás gomb – 🎯 Letisztult szoftveres X gomb szegéllyel */}
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '16px', right: '16px', background: '#222f47', border: '1px solid #334155', color: '#94a3b8', width: '28px', height: '28px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s' }}
          className="help-close-cross"
        >
          <X size={14} />
        </button>
        
        <h2 style={{ color: '#f8fafc', margin: '0 0 20px 0', fontSize: '1.3rem', fontWeight: '700', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={18} color="#38bdf8" /> {t('helpTitle')}
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* ⚖️ KIEGYENSÚLYOZOTT PONTRENDSZER (FAIR SCORE) SZEKCIÓ */}
          <div style={{ background: '#0f172a', padding: '20px', borderRadius: '6px', border: '1px solid #222f47' }}>
            <h4 style={{ color: '#38bdf8', margin: '0 0 10px 0', fontSize: '1.05rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '-0.2px' }}>
              <Scale size={16} /> {t('helpFairScoreTitle')}
            </h4>
            <div style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.55', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: 0 }}>{t('helpFairScoreIntro')}</p>

              <div style={{ background: '#131b2e', padding: '10px 14px', borderRadius: '4px', borderLeft: '3px solid #a78bfa', border: '1px solid #222f47', borderLeftColor: '#a78bfa' }}>
                <b style={{ color: '#a78bfa', display: 'block', marginBottom: '2px', fontSize: '0.88rem' }}>{t('helpFairScoreAnchorTitle')}</b>
                {t('helpFairScoreAnchorDesc')}
              </div>

              <div style={{ background: '#131b2e', padding: '10px 14px', borderRadius: '4px', borderLeft: '3px solid #f43f5e', border: '1px solid #222f47', borderLeftColor: '#f43f5e' }}>
                <b style={{ color: '#f43f5e', display: 'block', marginBottom: '2px', fontSize: '0.88rem' }}>{t('helpFairScoreDisciplineTitle')}</b>
                {t('helpFairScoreDisciplineDesc')}
              </div>

              <p style={{ fontStyle: 'italic', color: '#64748b', marginTop: '2px', borderTop: '1px dashed #222f47', paddingTop: '8px', margin: 0, fontSize: '0.82rem' }}>
                {t('helpFairScoreExample')}
              </p>
            </div>
          </div>

          {/* Láthatósági mérő szekció */}
          <div style={{ background: '#0f172a', padding: '16px', borderRadius: '6px', border: '1px solid #222f47', borderLeft: '3px solid #f59e0b' }}>
            <h4 style={{ color: '#f59e0b', margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><Eye size={14} /> {t('helpExposureTitle')}</h4>
            <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
              {t('helpExposureDesc')}
            </p>
          </div>

          {/* Joker szekció */}
          <div style={{ background: '#0f172a', padding: '16px', borderRadius: '6px', border: '1px solid #222f47', borderLeft: '3px solid #e11d48' }}>
            <h4 style={{ color: '#e11d48', margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={14} /> {t('helpJokerTitle')}</h4>
            <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
              {t('helpJokerDesc')}
            </p>
          </div>

          {/* Képmester szekció */}
          <div style={{ background: '#0f172a', padding: '16px', borderRadius: '6px', border: '1px solid #222f47', borderLeft: '3px solid #a78bfa' }}>
            <h4 style={{ color: '#a78bfa', margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><Crown size={14} /> {t('helpMasterTitle')}</h4>
            <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
              {t('helpMasterDesc')}
            </p>
          </div>

          {/* Nyeremények szekció */}
          <div style={{ background: '#0f172a', padding: '16px', borderRadius: '6px', border: '1px solid #222f47', borderLeft: '3px solid #fbbf24' }}>
            <h4 style={{ color: '#fbbf24', margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><Gift size={14} /> {t('helpRewardsTitle')}</h4>
            <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
              {t('helpRewardsDesc')}
            </p>
            <ul style={{ color: '#f8fafc', fontSize: '0.85rem', margin: '8px 0 0 0', paddingLeft: '16px', lineHeight: '1.7', listStyleType: 'none' }}>
              <li style={{ display: 'flex', gap: '6px', alignItems: 'start' }}><span>🥇</span> <span><b>{t('helpReward1')}</b> {lang === 'en' ? <><span style={{ color: '#fbbf24', fontWeight: 'bold' }}>+3</span> global Joker swaps <span style={{ color: '#4ade80', fontWeight: '700' }}>+ 1 Week Extended Premium Membership</span></> : <><span style={{ color: '#fbbf24', fontWeight: 'bold' }}>+3 db</span> globális Joker csere <span style={{ color: '#4ade80', fontWeight: '700' }}>+ 1 héttel meghosszabbított prémium tagság</span></>}</span></li>
              <li style={{ display: 'flex', gap: '6px', alignItems: 'start', marginTop: '4px' }}><span>🥈</span> <span><b>{t('helpReward2')}</b> {lang === 'en' ? <><span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>+2</span> Joker swaps</> : <><span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>+2 db</span> Joker csere</>}</span></li>
              <li style={{ display: 'flex', gap: '6px', alignItems: 'start', marginTop: '4px' }}><span>🥉</span> <span><b>{t('helpReward3')}</b> {lang === 'en' ? <><span style={{ color: '#b45309', fontWeight: 'bold' }}>+1</span> Joker swap</> : <><span style={{ color: '#b45309', fontWeight: 'bold' }}>+1 db</span> Joker csere</>}</span></li>
            </ul>
          </div>
          
          {/* Ranglétra szekció */}
          <div style={{ background: '#0f172a', padding: '16px', borderRadius: '6px', border: '1px solid #222f47', borderLeft: '3px solid #38bdf8' }}>
            <h4 style={{ color: '#38bdf8', margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><Award size={14} /> {t('helpRanksTitle')}</h4>
            <p style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: '1.45', margin: '0 0 12px 0' }}>
              {t('helpRanksDesc')}
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {rankLadderData.map((rank, i) => {
                const isMyRank = normalizedMyRankName === rank.name;
                
                const displayName = lang === 'en' ? (rankNamesEn[rank.name] || rank.name) : rank.name;
                const displayReq = lang === 'en' ? rank.reqEn : rank.reqHu;

                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: isMyRank ? 'rgba(34,47,71,0.3)' : '#131b2e', border: isMyRank ? `1px solid ${rank.color}` : '1px solid #222f47', borderRadius: '4px' }}>
                    <div>
                      <div style={{ color: rank.color, fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {displayName} {isMyRank && <span style={{ fontSize: '0.62rem', background: rank.color, color: '#0f172a', padding: '1px 5px', borderRadius: '2px', fontWeight: 'bold', textTransform: 'uppercase' }}>{t('helpYou')}</span>}
                      </div>
                      <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '1px' }}>{lang === 'en' ? 'Required:' : 'Szükséges:'} {displayReq}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: '600', color: '#cbd5e1', fontSize: '0.8rem', fontFamily: 'monospace' }}>
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
          background: #334155 !important;
          color: white !important;
        }
      `}</style>
    </div>
  );
}
