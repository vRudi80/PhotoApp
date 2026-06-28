import React, { useState } from 'react';
import { getImageUrl } from '../../../utils/helpers';
import VideoLoader from '../../../components/VideoLoader';

// Nyelvi kontextus aktiválása
import { useLanguage } from '../../../context/LanguageContext';

interface HallOfFameProps {
  isLoadingHof: boolean;
  hallOfFame: any[];
  user: any;
  getLevelDetails: (likes: number, victories: number) => { name: string; color: string; bg: string };
}

function ClubLogo({ driveId, logoUrl }: { driveId: any; logoUrl: any }) {
  const [isError, setIsError] = useState(false);
  if (isError || (!driveId && !logoUrl)) {
    return <span style={{ fontSize: '1.1rem' }}>🛡️</span>;
  }
  return (
    <img 
      src={getImageUrl(driveId, logoUrl)} 
      alt="" 
      style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'contain', backgroundColor: '#0f172a', border: '1px solid #10b98130', display: 'inline-block' }} 
      onError={() => setIsError(true)} 
    />
  );
}

export default function HallOfFame({ isLoadingHof, hallOfFame, user, getLevelDetails }: HallOfFameProps) {
  
  const { t, lang } = useLanguage();

  // Biztonságos helyi sziluett avatar, ha valakinek nincs feltöltött profilképe
  const silhouetteAvatar = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23475569'><circle cx='12' cy='8' r='4'/><path d='M12 14c-6.1 0-10 4-10 4v2h20v-2s-3.9-4-10-4z'/></svg>";

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

  if (isLoadingHof) {
    return <VideoLoader />;
  }

  if (!hallOfFame || hallOfFame.length === 0) {
    return <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>{t('hofEmpty')}</div>;
  }

  return (
    <div style={{ background: '#1e293b', padding: '30px', borderRadius: '24px', border: '1px solid #fbbf2440', boxShadow: '0 10px 40px rgba(0,0,0,0.4)', animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ color: '#fbbf24', margin: 0, fontSize: '1.8rem', fontWeight: '900' }}>{t('hofTitle')}</h2>
        <p style={{ color: '#94a3b8', margin: '5px 0 0 0' }}>{t('hofDesc')}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {hallOfFame.map((row, index) => {
          const isMe = row.user_email === user?.email;
          const likes = Number(row.total_likes) || 0;
          
          const firstPlaces = Number(row.first_places) || 0;
          const podiums = Number(row.podiums) || 0;

          const level = getLevelDetails(likes, 0); 
          
          const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#cbd5e1' : index === 2 ? '#b45309' : '#64748b';
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;

          const displayRankName = lang === 'en' ? (rankNamesEn[level.name] || level.name) : level.name;

          return (
            <div 
              key={row.user_email || index} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                background: isMe ? 'linear-gradient(90deg, #fbbf2415, #0f172a)' : '#0f172a', 
                border: isMe ? '1px solid #fbbf2460' : '1px solid #334155', 
                padding: '16px 20px', 
                borderRadius: '16px',
                boxShadow: isMe ? '0 0 20px #fbbf2415' : 'none',
                transition: 'transform 0.2s',
                flexWrap: 'wrap',
                gap: '15px'
              }}
            >
              {/* Érem / Helyezés */}
              <div style={{ fontSize: '1.4rem', fontWeight: '900', width: '45px', color: rankColor, textAlign: 'center' }}>
                {medal}
              </div>

              {/* 📸 ÚJ: Dinamikus, kör alakú Felhasználói Profilkép az Aréna dicsőségfalán */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img 
                  src={row.avatar_url || silhouetteAvatar} 
                  alt="" 
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: isMe ? '2px solid #fbbf24' : '2px solid #334155', backgroundColor: '#090d16' }}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = silhouetteAvatar; }}
                />
              </div>

              {/* Felhasználó adatai és a versenyeredmények */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ color: isMe ? '#fbbf24' : 'white', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {row.user_name} {isMe && <span style={{ fontSize: '0.75rem', background: '#fbbf24', color: '#0f172a', padding: '2px 8px', borderRadius: '10px', fontWeight: '900' }}>{t('hofYou')}</span>}
                </div>
                
                {row.club_name && (
                  <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ClubLogo driveId={row.drive_logo_id} logoUrl={row.logo_url} />
                    <span>{row.club_name}</span>
                  </div>
                )}

                {/* Verseny statisztikai boxok */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: '#fbbf24', background: '#fbbf2410', padding: '3px 10px', borderRadius: '6px', border: '1px solid #fbbf2420', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    🥇 {firstPlaces} {lang === 'en' ? (firstPlaces === 1 ? 'Win' : 'Wins') : 'győzelem'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', background: '#38bdf810', padding: '3px 10px', borderRadius: '6px', border: '1px solid #38bdf820', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    🏆 {podiums} {lang === 'en' ? 'Podium' : 'dobogó'}
                  </span>
                </div>
              </div>

              {/* Rangjelzés */}
              <div style={{ marginRight: '10px' }}>
                <span style={{ color: level.color, background: level.bg, border: `1px solid ${level.color}40`, padding: '6px 16px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  {displayRankName}
                </span>
              </div>

              {/* Összesített pontszám */}
              <div style={{ textAlign: 'right', minWidth: '80px' }}>
                <div style={{ color: '#fbbf24', fontWeight: '900', fontSize: '1.4rem', whiteSpace: 'nowrap' }}>{likes} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#64748b' }}>⭐</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
