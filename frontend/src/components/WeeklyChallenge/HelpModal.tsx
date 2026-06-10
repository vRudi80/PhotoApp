import React from 'react';

// 🎯 ÚJ IMPORT: Behozzuk a nyelvi kontextust
import { useLanguage } from '../../context/LanguageContext';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: { name: string; color: string; bg: string };
}

export default function HelpModal({ isOpen, onClose, currentLevel }: HelpModalProps) {
  // 🎯 ÚJ: Aktiváljuk a fordítót és a nyelv-figyelőt
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

  // 🇬🇧 ÚJ: Angol rangnév szótár a nemzetközi felülethez
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
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box', animation: 'fadeIn 0.2s ease-out' }}>
      <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '24px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
        
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: '#1e293b', border: 'none', color: '#94a3b8', fontSize: '1.5rem', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✖</button>
        
        <h2 style={{ color: '#f8fafc', margin: '0 0 25px 0', fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {t('helpTitle')}
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Láthatósági mérő szekció */}
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #f59e0b' }}>
            <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '1.1rem' }}>{t('helpExposureTitle')}</h4>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
              {t('helpExposureDesc')}
            </p>
          </div>

          {/* Joker szekció */}
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #e11d48' }}>
            <h4 style={{ color: '#e11d48', margin: '0 0 10px 0', fontSize: '1.1rem' }}>{t('helpJokerTitle')}</h4>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
              {t('helpJokerDesc')}
            </p>
          </div>

          {/* Képmester szekció */}
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #a78bfa' }}>
            <h4 style={{ color: '#a78bfa', margin: '0 0 10px 0', fontSize: '1.1rem' }}>{t('helpMasterTitle')}</h4>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
              {t('helpMasterDesc')}
            </p>
          </div>

          {/* Nyeremények szekció */}
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #fbbf24' }}>
            <h4 style={{ color: '#fbbf24', margin: '0 0 10px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>{t('helpRewardsTitle')}</h4>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
              {t('helpRewardsDesc')}
            </p>
            <ul style={{ color: '#f8fafc', fontSize: '0.9rem', margin: '10px 0 0 0', paddingLeft: '20px', lineHeight: '1.8' }}>
              <li>🥇 <b>{t('helpReward1')}</b> {lang === 'en' ? <><span style={{ color: '#fbbf24', fontWeight: 'bold' }}>+3</span> global Joker swaps <span style={{ color: '#4ade80', fontWeight: '900' }}>+ 1 WEEK EXTENDED PREMIUM MEMBERSHIP</span> completely free!</> : <><span style={{ color: '#fbbf24', fontWeight: 'bold' }}>+3 db</span> globális Joker csere <span style={{ color: '#4ade80', fontWeight: '900' }}>+ 1 HÉTTEL MEGHOSSZABBÍTOTT PRÉMIUM TAGSÁG</span> teljesen ingyen!</>}</li>
              <li>🥈 <b>{t('helpReward2')}</b> {lang === 'en' ? <><span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>+2</span> Joker swaps</> : <><span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>+2 db</span> Joker csere</>}</li>
              <li>🥉 <b>{t('helpReward3')}</b> {lang === 'en' ? <><span style={{ color: '#cd7f32', fontWeight: 'bold' }}>+1</span> Joker swap</> : <><span style={{ color: '#cd7f32', fontWeight: 'bold' }}>+1 db</span> Joker csere</>}</li>
            </ul>
          </div>
          
          {/* Ranglétra szekció */}
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #38bdf8' }}>
            <h4 style={{ color: '#38bdf8', margin: '0 0 15px 0', fontSize: '1.1rem' }}>{t('helpRanksTitle')}</h4>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', margin: '0 0 15px 0' }}>
              {t('helpRanksDesc')}
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rankLadderData.map((rank, i) => {
                const isMyRank = normalizedMyRankName === rank.name;
                
                // 🎯 ÚJ: Ha angol módban vagyunk, lefordítjuk a rang nevét és a feltételt is
                const displayName = lang === 'en' ? (rankNamesEn[rank.name] || rank.name) : rank.name;
                const displayReq = lang === 'en' ? rank.reqEn : rank.reqHu;

                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: isMyRank ? `${rank.color}20` : '#0f172a', border: isMyRank ? `1px solid ${rank.color}` : '1px solid #334155', borderRadius: '8px' }}>
                    <div>
                      <div style={{ color: rank.color, fontWeight: 'bold', fontSize: '1rem' }}>
                        {displayName} {isMyRank && <span style={{ fontSize: '0.75rem', background: rank.color, color: '#000', padding: '2px 6px', borderRadius: '10px', marginLeft: '5px', fontWeight: '900' }}>{t('helpYou')}</span>}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{lang === 'en' ? 'Required:' : 'Szükséges:'} {displayReq}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#f8fafc', fontSize: '0.9rem' }}>
                      {rank.power}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
