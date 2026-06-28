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

  // 🎯 ÚJ STATE-EK: Pop-up ablak kezeléséhez
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

  // 🎯 ÚJ FÜGGVÉNY: Lekéri a kiválasztott játékos adatait
  const handleUserClick = async (row: any) => {
    setSelectedUser(row);
    setModalOpen(true);
    setStatsLoading(true);
    setPlayerStats(null);
    try {
      // Mindkét verziót elküldjük query-ben a maximális backend kompatibilitásért
      const res = await axios.get(`/api/weekly/my-stats?userEmail=${encodeURIComponent(row.user_email)}&email=${encodeURIComponent(row.user_email)}`);
      setPlayerStats(res.data);
    } catch (err) {
      console.error('Hiba a trófeaterem betöltésekor:', err);
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
              onClick={() => handleUserClick(row)} // 🎯 JAVÍTVA: Aktív kattintás esemény
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
                cursor: 'pointer' // 🎯 JAVÍTVA: Mutatja, hogy kattintható
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
      {/* 🎯 ÚJ: JÁTÉKOS TRÓFEATEREM FELUGRÓ MODAL – SZINKRONBAN A TRÓFEATEREMMEK */}
      {/* ==================================================================== */}
      {modalOpen && selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '24px', width: '100%', maxWidth: '580px', maxHeight: '85vh', overflowY: 'auto', padding: '25px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            
            {/* Bezárás gomb */}
            <button 
              onClick={() => { setModalOpen(false); setSelectedUser(null); setPlayerStats(null); }}
              style={{ position: 'absolute', top: '15px', right: '15px', background: '#1e293b', border: 'none', color: '#94a3b8', width: '35px', height: '35px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}
            >
              ✖
            </button>

            {/* Fejléc: Játékos profil adatai */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '20px' }}>
              <img 
                src={selectedUser.avatar_url || silhouetteAvatar} 
                alt="" 
                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #334155', backgroundColor: '#090d16' }} 
              />
              <div>
                <h3 style={{ color: 'white', margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedUser.user_name}</h3>
                <p style={{ color: '#38bdf8', margin: '4px 0 0 0', fontSize: '0.8rem', fontWeight: 'bold' }}>{selectedUser.club_name || (lang === 'en' ? 'Independent Photographer' : 'Független fotós')}</p>
              </div>
            </div>

            {/* Betöltési állapot és adatok kirajzolása */}
            {statsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                {lang === 'en' ? 'Opening Trophy Room...' : 'Trófeaterem berendezése...'}
              </div>
            ) : playerStats ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 1. Trófeák (Podiums) Szekció */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px', textAlign: 'center' }}>
                  <div style={{ background: '#1e293b50', padding: '12px', borderRadius: '12px', border: '1px solid #33415530' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '2px' }}>🥇</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 'bold' }}>{lang === 'en' ? '1st Places' : 'Arany'}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fbbf24', marginTop: '2px' }}>{playerStats.podiums?.first || 0}</div>
                  </div>
                  <div style={{ background: '#1e293b50', padding: '12px', borderRadius: '12px', border: '1px solid #33415530' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '2px' }}>🥈</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 'bold' }}>{lang === 'en' ? '2nd Places' : 'Ezüst'}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#cbd5e1', marginTop: '2px' }}>{playerStats.podiums?.second || 0}</div>
                  </div>
                  <div style={{ background: '#1e293b50', padding: '12px', borderRadius: '12px', border: '1px solid #33415530' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '2px' }}>🥉</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 'bold' }}>{lang === 'en' ? '3rd Places' : 'Bronz'}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#b45309', marginTop: '2px' }}>{playerStats.podiums?.third || 0}</div>
                  </div>
                </div>

                {/* 2. Csatatörténet és képek listája */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '10px', fontWeight: 'bold' }}>
                    📷 {lang === 'en' ? 'Battle History' : 'Csaták krónikája'} ({playerStats.history?.length || 0})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '35vh', overflowY: 'auto', paddingRight: '4px' }}>
                    {playerStats.history && playerStats.history.length > 0 ? (
                      playerStats.history.map((item: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '10px', borderRadius: '12px', border: '1px solid #1e293b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* 🎯 JAVÍTVA: getImageUrl használata a drive_file_id-hoz, pont mint a TrophyRoom-ban! */}
                            <img 
                              src={getImageUrl(item.drive_file_id, item.file_url)} 
                              alt="" 
                              style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #334155' }} 
                            />
                            <div>
                              <div style={{ fontSize: '0.8rem', color: '#f8fafc', fontWeight: 'bold' }}>{item.topic_title}</div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                {lang === 'en' ? 'Rank:' : 'Helyezés:'} <b style={{ color: item.rank === 1 ? '#fbbf24' : '#cbd5e1' }}>#{item.rank}</b> / {item.total_entries}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', background: '#00000040', padding: '6px 10px', borderRadius: '8px', border: '1px solid #33415530' }}>
                            <span style={{ color: '#38bdf8', fontWeight: '900', fontSize: '0.85rem' }}>{Number(item.likes || 0).toFixed(2)}</span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '2px' }}>FP</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', padding: '15px' }}>
                        {lang === 'en' ? 'No battle history yet.' : 'Még nincs lezárt csatája.'}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '0.8rem' }}>
                {lang === 'en' ? 'Failed to load statistics.' : 'Nem sikerült betölteni az adatokat.'}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
