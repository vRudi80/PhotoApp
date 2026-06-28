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
      src={getImageUrl ? getImageUrl(driveId, logoUrl) : ''} 
      alt="" 
      style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'contain', backgroundColor: '#0f172a', border: '1px solid #10b98130', display: 'inline-block' }} 
      onError={() => setIsError(true)} 
    />
  );
}

export default function HallOfFame({ isLoadingHof, hallOfFame, user, getLevelDetails }: HallOfFameProps) {
  
  const { t, lang } = useLanguage();

  // Állapotok a külön statisztika oldalhoz (Nincs popup!)
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
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

  // Futam típus vizsgáló (A TrophyRoom mintájára)
  const getTopicType = (start: string, end: string) => {
    if (!start || !end) return 'weekly';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return diff <= 25 * 60 * 60 * 1000 ? 'daily' : 'weekly';
  };

  if (isLoadingHof) {
    return VideoLoader ? <VideoLoader /> : <div>Loading...</div>;
  }

  if (!hallOfFame || hallOfFame.length === 0) {
    return <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>{t ? t('hofEmpty') : 'Üres toplista'}</div>;
  }

  // Játékosra kattintás kezelése
  const handleUserClick = async (row: any) => {
    const targetEmail = row?.user_email || row?.email;
    if (!targetEmail) return;

    setSelectedUser(row);
    setStatsLoading(true);
    setPlayerStats(null);
    try {
      const res = await axios.get(`/api/weekly/my-stats?userEmail=${encodeURIComponent(targetEmail)}`);
      setPlayerStats(res.data);
    } catch (err) {
      console.error('Hiba az adatok letöltésekor:', err);
    } {
      setStatsLoading(false);
    }
  };

  // ====================================================================
  // 📸 1. OLDALNÉZET: AZ ADOTT JÁTÉKOS STATISZTIKAI ADATLAPJA (TROPHYROOM MÁSOLAT)
  // ====================================================================
  if (selectedUser) {
    const totalLikes = Number(selectedUser?.total_likes) || 0;
    const currentLevel = getLevelDetails ? getLevelDetails(totalLikes, Number(selectedUser?.first_places) || 0) : { name: '', color: '#fbbf24', bg: '' };
    const displayRankName = lang === 'en' ? (rankNamesEn[currentLevel?.name || ''] || currentLevel?.name || '') : (currentLevel?.name || '');

    return (
      <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
        
        {/* Vissza a listához gomb */}
        <div style={{ marginBottom: '25px' }}>
          <button 
            onClick={() => { setSelectedUser(null); setPlayerStats(null); }}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#fbbf24', padding: '12px 24px', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}
          >
            {lang === 'en' ? '⬅ Back to Hall of Fame' : '⬅ Vissza a dicsőségcsarnokba'}
          </button>
        </div>

        {/* Játékos profil fejléce */}
        <div style={{ background: 'linear-gradient(180deg, #1e293b, #0f172a)', padding: '40px 25px', borderRadius: '24px', border: `1px solid ${currentLevel?.color || '#334155'}50`, marginBottom: '25px', textAlign: 'center', boxShadow: `0 10px 40px -10px ${currentLevel?.color || '#000'}40`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-50px', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', background: `${currentLevel?.color || '#fff'}20`, filter: 'blur(80px)', borderRadius: '50%' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px', position: 'relative', zIndex: 1 }}>
            <img 
              src={selectedUser?.avatar_url || silhouetteAvatar} 
              alt="" 
              style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${currentLevel?.color || '#334155'}` }} 
            />
          </div>
          
          <h1 style={{ color: 'white', margin: '0 0 5px 0', fontSize: '1.8rem', fontWeight: '900', position: 'relative', zIndex: 1 }}>{selectedUser?.user_name || 'Anonim'}</h1>
          <p style={{ color: '#10b981', margin: '0 0 20px 0', fontSize: '0.9rem', fontWeight: 'bold', position: 'relative', zIndex: 1 }}>
            {selectedUser?.club_name || (lang === 'en' ? 'Independent Photographer' : 'Független fotós')}
          </p>

          <h3 style={{ color: '#94a3b8', margin: '0 0 5px 0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', position: 'relative', zIndex: 1 }}>{lang === 'en' ? 'RANK TIER' : 'FOTÓSMESTERI RANG'}</h3>
          <h2 style={{ color: currentLevel?.color || '#fff', margin: '0 0 10px 0', fontSize: '2.2rem', fontWeight: '900', position: 'relative', zIndex: 1 }}>{displayRankName}</h2>
          
          <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#64748b', position: 'relative', zIndex: 1, fontWeight: 'bold' }}>
            {lang === 'en' ? `Total Score: ${totalLikes.toFixed(1)} FP` : `Összesített teljesítmény: ${totalLikes.toFixed(1)} FP`}
          </div>
        </div>

        {/* Adat letöltés pörgettyű */}
        {statsLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            {VideoLoader ? <VideoLoader /> : <div>Adatok betöltése...</div>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            
            {/* Érem számlálók */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(100px, 1fr))', gap: '15px', textAlign: 'center' }}>
              <div style={{ background: '#0f172a', padding: '20px', borderRadius: '20px', border: '1px solid #fbbf2440' }}>
                <div style={{ fontSize: '2.2rem' }}>🥇</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold', marginTop: '4px' }}>{lang === 'en' ? '1st Places' : 'Győzelmek'}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fbbf24', marginTop: '4px' }}>{selectedUser?.first_places || 0}</div>
              </div>
              <div style={{ background: '#0f172a', padding: '20px', borderRadius: '20px', border: '1px solid #38bdf840' }}>
                <div style={{ fontSize: '2.2rem' }}>🏆</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold', marginTop: '4px' }}>{lang === 'en' ? 'Total Podiums' : 'Dobogós helyezések'}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#38bdf8', marginTop: '4px' }}>{selectedUser?.podiums || 0}</div>
              </div>
              <div style={{ background: '#0f172a', padding: '20px', borderRadius: '20px', border: '1px solid #a855f740' }}>
                <div style={{ fontSize: '2.2rem' }}>⭐</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold', marginTop: '4px' }}>{lang === 'en' ? 'Fair Score' : 'Dicsőség Pont'}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#a855f7', marginTop: '4px' }}>{totalLikes.toFixed(1)}</div>
              </div>
            </div>

            {/* Pályaművek rácsa */}
            <div>
              <h3 style={{ color: '#f8fafc', marginBottom: '20px', fontSize: '1.5rem', fontWeight: '800' }}>
                {lang === 'en' ? `Past Submissions (${playerStats?.history?.length || 0})` : `Hivatalos pályaművek (${playerStats?.history?.length || 0} db)`}
              </h3>
              
              {!playerStats || !playerStats.history || playerStats.history.length === 0 ? (
                <div style={{ color: '#94a3b8', background: '#1e293b', padding: '40px', borderRadius: '20px', textAlign: 'center', border: '1px dashed #334155' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📸</div>
                  <h4 style={{ color: '#f8fafc', margin: '0 0 5px 0' }}>{lang === 'en' ? 'No finalized history available.' : 'Még nincs lezárt meccse.'}</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    {lang === 'en' ? 'Submissions appear here once the current rounds are finalized by the admin.' : 'A pályaművek itt jelennek meg, amint a futamok lezárulnak és jóváhagyásra kerülnek.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' }}>
                  {playerStats.history.map((entry: any, idx: number) => {
                    const totalEntries = Number(entry?.total_entries) || 1;
                    const percentile = (Number(entry?.rank) || 1) / totalEntries;
                    const rank = Number(entry?.rank) || 0;
                    
                    let badge = ''; let badgeColor = '#334155';
                    if (rank === 1) { badge = lang === 'en' ? '1st Place 🏆' : '1. Hely 🏆'; badgeColor = '#fbbf24'; }
                    else if (rank === 2) { badge = lang === 'en' ? '2nd Place 🥈' : '2. Hely 🥈'; badgeColor = '#cbd5e1'; }
                    else if (rank === 3) { badge = lang === 'en' ? '3rd Place 🥉' : '3. Hely 🥉'; badgeColor = '#cd7f32'; }
                    else if (percentile <= 0.1) { badge = '⭐ Top 10%'; badgeColor = '#a855f7'; }
                    else if (percentile <= 0.2) { badge = '✨ Top 20%'; badgeColor = '#10b981'; }

                    const isDaily = getTopicType(entry?.start_date, entry?.end_date) === 'daily';

                    return (
                      <div key={idx} style={{ background: '#1e293b', borderRadius: '20px', overflow: 'hidden', border: `1px solid ${badgeColor}`, transition: 'transform 0.2s', boxShadow: '0 10px 20px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ position: 'relative', height: '220px' }}>
                          <img src={getImageUrl ? getImageUrl(entry?.drive_file_id, entry?.file_url) : entry?.file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          
                          <div style={{ position: 'absolute', top: '15px', left: '15px', background: badgeColor, color: ['#fbbf24', '#cbd5e1'].includes(badgeColor) ? 'black' : 'white', padding: '6px 16px', borderRadius: '100px', fontWeight: '900', fontSize: '0.9rem' }}>
                            {badge || (lang === 'en' ? `Rank ${entry?.rank}` : `${entry?.rank}. Hely`)}
                          </div>
                          
                          <div style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', color: isDaily ? '#f87171' : '#60a5fa', padding: '4px 12px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${isDaily ? '#ef444450' : '#3b82f650'}` }}>
                            {isDaily ? (lang === 'en' ? '🔴 Blitz Match' : '🔴 Villámfutam') : (lang === 'en' ? '🔵 Master Match' : '🔵 Mesterfutam')}
                          </div>
                        </div>

                        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <h4 style={{ margin: '0 0 15px 0', color: '#f8fafc', fontSize: '1.2rem' }}>{entry?.topic_title}</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '12px' }}>
                              <span>{lang === 'en' ? `Field: ${totalEntries} photos` : `Mezőny: ${totalEntries} kép`}</span>
                              <span style={{color: '#f8fafc'}}>{lang === 'en' ? 'Rank: ' : 'Helyezés: '}<b>{rank}.</b></span>
                            </div>
                            <div style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '15px' }}>
                              <span style={{color: '#f97316', fontWeight: '900'}}>⚡ {Number(entry?.likes || 0).toFixed(2)} FP</span>
                              <span style={{color: '#38bdf8', fontWeight: 'bold'}}>👁️ {entry?.views || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ====================================================================
  // 🏆 2. OLDALNÉZET: AZ EREDETI DICSŐSÉGCSARNOK LISTA NÉZET
  // ====================================================================
  return (
    <div style={{ background: '#1e293b', padding: '30px', borderRadius: '24px', border: '1px solid #fbbf2440', boxShadow: '0 10px 40px rgba(0,0,0,0.4)', animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ color: '#fbbf24', margin: 0, fontSize: '1.8rem', fontWeight: '900' }}>{t ? t('hofTitle') : 'Dicsőségcsarnok'}</h2>
        <p style={{ color: '#94a3b8', margin: '5px 0 0 0' }}>{t ? t('hofDesc') : 'A PhotAwesome közösség legnagyobb legendái.'}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {hallOfFame.map((row, index) => {
          const rowEmail = row?.user_email || row?.email;
          const isMe = rowEmail === user?.email;
          const likes = Number(row?.total_likes) || 0;
          
          const firstPlaces = Number(row?.first_places) || 0;
          const podiums = Number(row?.podiums) || 0;

          const level = getLevelDetails ? getLevelDetails(likes, 0) : { name: '', color: '#fff', bg: '' }; 
          
          const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#cbd5e1' : index === 2 ? '#b45309' : '#64748b';
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;

          const displayRankName = lang === 'en' ? (rankNamesEn[level?.name || ''] || level?.name || '') : (level?.name || '');

          return (
            <div 
              key={rowEmail || index} 
              onClick={() => handleUserClick(row)}
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
                  src={row?.avatar_url || silhouetteAvatar} 
                  alt="" 
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: isMe ? '2px solid #fbbf24' : '2px solid #334155', backgroundColor: '#090d16' }}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = silhouetteAvatar; }}
                />
              </div>

              {/* Felhasználó adatai */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ color: isMe ? '#fbbf24' : 'white', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {row?.user_name} {isMe && <span style={{ fontSize: '0.75rem', background: '#fbbf24', color: '#0f172a', padding: '2px 8px', borderRadius: '10px', fontWeight: '900' }}>{t ? t('hofYou') : 'Ön'}</span>}
                </div>
                
                {row?.club_name && (
                  <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ClubLogo driveId={row?.drive_logo_id} logoUrl={row?.logo_url} />
                    <span>{row?.club_name}</span>
                  </div>
                )}

                {/* Statisztikai boxok */}
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
                <span style={{ color: level?.color, background: level?.bg, border: `1px solid ${level?.color}40`, padding: '6px 16px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
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
