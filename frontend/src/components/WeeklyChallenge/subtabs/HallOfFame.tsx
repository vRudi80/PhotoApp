import React, { useState } from 'react';
import axios from 'axios';
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

  // 🎯 Állapotok a felugró ablakhoz (Modal)
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [playerStats, setPlayerStats] = useState<any | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

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

  // 🎯 Kattintáskor betöltjük a kiválasztott játékos trófeáit
  const handleUserClick = async (row: any) => {
    const targetEmail = row.user_email || row.email;
    if (!targetEmail) return;

    setSelectedUser(row);
    setModalOpen(true);
    setStatsLoading(true);
    setPlayerStats(null);
    try {
      const res = await axios.get(`/api/weekly/my-stats?userEmail=${encodeURIComponent(targetEmail)}`);
      setPlayerStats(res.data);
    } catch (err) {
      console.error('Hiba az adatok lekérésekor:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  return (
    <div style={{ background: '#1e293b', padding: '30px', borderRadius: '24px', border: '1px solid #fbbf2440', boxShadow: '0 10px 40px rgba(0,0,0,0.4)', animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ color: '#fbbf24', margin: 0, fontSize: '1.8rem', fontWeight: '900' }}>{t('hofTitle')}</h2>
        <p style={{ color: '#94a3b8', margin: '5px 0 0 0' }}>{t('hofDesc')}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {hallOfFame.map((row, index) => {
          const rowEmail = row.user_email || row.email;
          const isMe = rowEmail === user?.email;
          const likes = Number(row.total_likes) || 0;
          
          const firstPlaces = Number(row.first_places) || 0;
          const podiums = Number(row.podiums) || 0;

          const level = getLevelDetails(likes, 0); 
          
          const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#cbd5e1' : index === 2 ? '#b45309' : '#64748b';
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;

          const displayRankName = lang === 'en' ? (rankNamesEn[level.name] || level.name) : level.name;

          return (
            <div 
              key={rowEmail || index} 
              onClick={() => handleUserClick(row)} // 🎯 Kattinthatóvá tesszük a sort
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
                gap: '15px',
                cursor: 'pointer'
              }}
            >
              {/* Érem / Helyezés */}
              <div style={{ fontSize: '1.4rem', fontWeight: '900', width: '45px', color: rankColor, textAlign: 'center' }}>
                {medal}
              </div>

              {/* Felhasználói Profilkép */}
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

      {/* ==================================================================== */}
      {/* 🎯 JÁTÉKOS TRÓFEATEREM MODAL (HAJSZÁLPONTOSAN A TROPHYROOM MÁSOLATA) */}
      {/* ==================================================================== */}
      {modalOpen && selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '24px', width: '100%', maxWidth: '620px', maxHeight: '85vh', overflowY: 'auto', padding: '30px', position: 'relative' }}>
            
            {/* Bezárás gomb */}
            <button 
              onClick={() => { setModalOpen(false); setSelectedUser(null); setPlayerStats(null); }}
              style={{ position: 'absolute', top: '15px', right: '15px', background: '#1e293b', border: 'none', color: '#94a3b8', width: '35px', height: '35px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ✖
            </button>

            {/* Profil fejléc */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '20px' }}>
              <img 
                src={selectedUser.avatar_url || silhouetteAvatar} 
                alt="" 
                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #334155' }} 
              />
              <div>
                <h3 style={{ color: 'white', margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedUser.user_name}</h3>
                <p style={{ color: '#10b981', margin: '4px 0 0 0', fontSize: '0.85rem', fontWeight: 'bold' }}>{selectedUser.club_name || (lang === 'en' ? 'Independent Photographer' : 'Független fotós')}</p>
              </div>
            </div>

            {/* Trófeaterem tartalom */}
            {statsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                {lang === 'en' ? 'Opening Trophy Room...' : 'Trófeaterem berendezése...'}
              </div>
            ) : playerStats ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 🥇 🥈 🥉 Trófea számlálók (A TrophyRoom mintájára) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px', textAlign: 'center' }}>
                  <div style={{ background: '#1e293b', padding: '12px', borderRadius: '14px', border: '1px solid #fbbf2430' }}>
                    <div style={{ fontSize: '1.6rem' }}>🥇</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold', marginTop: '2px' }}>{lang === 'en' ? '1st Places' : 'Arany'}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fbbf24' }}>{playerStats.podiums?.first || 0}</div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '12px', borderRadius: '14px', border: '1px solid #cbd5e130' }}>
                    <div style={{ fontSize: '1.6rem' }}>🥈</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold', marginTop: '2px' }}>{lang === 'en' ? '2nd Places' : 'Ezüst'}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#cbd5e1' }}>{playerStats.podiums?.second || 0}</div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '12px', borderRadius: '14px', border: '1px solid #cd7f3230' }}>
                    <div style={{ fontSize: '1.6rem' }}>🥉</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold', marginTop: '2px' }}>{lang === 'en' ? '3rd Places' : 'Bronz'}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#cd7f32' }}>{playerStats.podiums?.third || 0}</div>
                  </div>
                </div>

                {/* 📷 Korábbi pályaművek listája (Tűpontos TrophyRoom logika másolat) */}
                <div>
                  <h4 style={{ color: '#94a3b8', marginBottom: '12px', fontSize: '1rem', fontWeight: 'bold' }}>
                    {lang === 'en' ? `Past Submissions (${playerStats.history?.length || 0})` : `Korábbi pályaművek (${playerStats.history?.length || 0} db)`}
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '40vh', overflowY: 'auto', paddingRight: '4px' }}>
                    {playerStats.history && playerStats.history.length > 0 ? (
                      playerStats.history.map((entry: any, idx: number) => {
                        const totalEntries = Number(entry?.total_entries) || 1;
                        const rank = Number(entry?.rank) || 0;
                        const percentile = rank / totalEntries;

                        // Jelvény és színmeghatározás szóról szóra a te TrophyRoom.tsx fájlodból:
                        let badge = ''; let badgeColor = '#334155';
                        if (rank === 1) { badge = lang === 'en' ? '1st Place 🏆' : '1. Hely 🏆'; badgeColor = '#fbbf24'; }
                        else if (rank === 2) { badge = lang === 'en' ? '2nd Place 🥈' : '2. Hely 🥈'; badgeColor = '#cbd5e1'; }
                        else if (rank === 3) { badge = lang === 'en' ? '3rd Place 🥉' : '3. Hely 🥉'; badgeColor = '#cd7f32'; }
                        else if (percentile <= 0.1) { badge = '⭐ Top 10%'; badgeColor = '#a855f7'; }
                        else if (percentile <= 0.2) { badge = '✨ Top 20%'; badgeColor = '#10b981'; }

                        return (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '12px', borderRadius: '16px', border: `1px solid ${badgeColor}50` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <img 
                                src={getImageUrl(entry?.drive_file_id, entry?.file_url)} 
                                alt="" 
                                style={{ width: '45px', height: '45px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #334155' }} 
                              />
                              <div>
                                <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 'bold' }}>{entry?.topic_title}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                  <span style={{ color: badgeColor, fontWeight: 'bold', marginRight: '6px' }}>{badge || (lang === 'en' ? `Rank #${rank}` : `${rank}. Hely`)}</span>
                                  <span>• {lang === 'en' ? `Field: ${totalEntries}` : `Mezőny: ${totalEntries}`}</span>
                                  <span style={{ marginLeft: '6px' }}>👁️ {entry?.views || 0}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Pontszámok (FP) kijelzése */}
                            <div style={{ textAlign: 'right', background: '#0f172a', padding: '6px 12px', borderRadius: '10px' }}>
                              <span style={{ color: '#f97316', fontWeight: '900', fontSize: '0.85rem' }}>⚡ {entry?.likes || 0} FP</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ color: '#64748b', textAlign: 'center', padding: '20px', fontSize: '0.85rem' }}>
                        {lang === 'en' ? 'No past submissions found.' : 'Még nincsenek lezárt versenyadatai.'}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '0.85rem' }}>
                {lang === 'en' ? 'Failed to load statistics.' : 'Nem sikerült betölteni az adatokat.'}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
