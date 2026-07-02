import React, { useState } from 'react';
import axios from 'axios';
import { getImageUrl } from '../../../utils/helpers';
import VideoLoader from '../../../components/VideoLoader';
import { BACKEND_URL } from '../../../utils/constants';

// Nyelvi kontextus aktiválása
import { useLanguage } from '../../../context/LanguageContext';

// Professzionális Lucide Ikonok importálása az AI-sallangok ellen
import { 
  ArrowLeft, 
  Crown, 
  Shield, 
  Zap, 
  Trophy, 
  Medal, 
  Camera, 
  Star,
  Eye,
  Clock,
  Layers
} from 'lucide-react';

interface HallOfFameProps {
  isLoadingHof: boolean;
  hallOfFame: any[];
  user: any;
  getLevelDetails: (likes: number, victories: number) => { name: string; color: string; bg: string };
}

function ClubLogo({ driveId, logoUrl }: { driveId: any; logoUrl: any }) {
  const [isError, setIsError] = useState(false);
  if (isError || (!driveId && !logoUrl)) {
    return <Shield size={12} color="#475569" style={{ display: 'inline-block' }} />;
  }
  return (
    <img 
      src={getImageUrl ? getImageUrl(driveId, logoUrl) : ''} 
      alt="" 
      style={{ width: '16px', height: '18px', borderRadius: '2px', objectFit: 'contain', backgroundColor: '#090d16', border: '1px solid #222f47', display: 'inline-block' }} 
      onError={() => setIsError(true)} 
    />
  );
}

export default function HallOfFame({ isLoadingHof, hallOfFame, user, getLevelDetails }: HallOfFameProps) {
  
  const { t, lang } = useLanguage();

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [playerStats, setPlayerStats] = useState<any | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

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
    'Virtuóz ⚡': 'Visual Legend 👑',
    'Fotóguru 🔥': 'Photo Guru 🔥',
    'Vizuális Legenda 👑': 'Visual Legend 👑'
  };

  const getTopicType = (start: string, end: string) => {
    if (!start || !end) return 'weekly';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return diff <= 25 * 60 * 60 * 1000 ? 'daily' : 'weekly';
  };

  if (isLoadingHof) {
    return VideoLoader ? <VideoLoader /> : <div>Loading...</div>;
  }

  if (!hallOfFame || hallOfFame.length === 0) {
    return <div style={{ color: '#475569', textAlign: 'center', padding: '20px', fontSize: '0.85rem', fontStyle: 'italic' }}>{t ? t('hofEmpty') : 'Üres toplista'}</div>;
  }

  const handleUserClick = async (row: any) => {
    setSelectedUser(row);
    
    const targetEmail = row?.user_email || row?.email;
    if (!targetEmail) return;

    setStatsLoading(true);
    setPlayerStats(null);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/weekly/hof-stats?userEmail=${encodeURIComponent(targetEmail)}`);
      setPlayerStats(res.data);
    } catch (err) {
      console.error('Hiba az adatok letöltésekor:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // ====================================================================
  // 📸 1. OLDALNÉZET: JÁTÉKOS STATISZTIKAI ADATLAPJA (LETISZTÍTVA)
  // ====================================================================
  if (selectedUser) {
    const totalLikes = Number(selectedUser?.total_likes) || 0;
    const currentLevel = getLevelDetails ? getLevelDetails(totalLikes, Number(selectedUser?.first_places) || 0) : { name: '', color: '#fbbf24', bg: '' };
    
    // 🎯 JAVÍTVA: Itt fent, a hatókörön belül is külön létrehozzuk a displayRankName változót!
    const displayRankName = lang === 'en' ? (rankNamesEn[currentLevel?.name || ''] || currentLevel?.name || '') : (currentLevel?.name || '');

    const masterCount = Number(selectedUser?.master_count) || 0;

    return (
      <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
        
        {/* Vissza a listához gomb */}
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={() => { setSelectedUser(null); setPlayerStats(null); }}
            style={{ background: '#131b2e', border: '1px solid #222f47', color: '#cbd5e1', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s' }}
            className="hof-back-btn"
          >
            <ArrowLeft size={14} />
            {lang === 'en' ? 'Back to Hall of Fame' : 'Vissza a dicsőségcsarnokba'}
          </button>
        </div>

        {/* Játékos profil fejléce */}
        <div style={{ background: '#131b2e', padding: '30px 20px', borderRadius: '8px', border: '1px solid #222f47', marginBottom: '20px', textAlign: 'center', position: 'relative' }}>
          <div style={{ display: 'flex', marginBottom: '12px', justifyContent: 'center' }}>
            <img 
              src={selectedUser?.avatar_url || silhouetteAvatar} 
              alt="" 
              style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${currentLevel?.color || '#222f47'}`, backgroundColor: '#090d16' }} 
            />
          </div>
          
          <h1 style={{ color: 'white', margin: '0 0 4px 0', fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.3px' }}>{selectedUser?.user_name || 'Anonim'}</h1>
          <p style={{ color: '#10b981', margin: '0 0 16px 0', fontSize: '0.85rem', fontWeight: '600' }}>
            {selectedUser?.club_name || (lang === 'en' ? 'Independent Photographer' : 'Független fotós')}
          </p>

          <h3 style={{ color: '#475569', margin: '0 0 4px 0', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold' }}>{lang === 'en' ? 'RANK TIER' : 'FOTÓSMESTERI RANG'}</h3>
          <h2 style={{ color: currentLevel?.color || '#fff', margin: '0 0 8px 0', fontSize: '1.8rem', fontWeight: '700' }}>{displayRankName}</h2>
          
          <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#64748b', fontWeight: '600' }}>
            {lang === 'en' ? `Total Score: ${totalLikes.toFixed(1)} FP` : `Összesített teljesítmény: ${totalLikes.toFixed(1)} FP`}
          </div>
        </div>

        {statsLoading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            {VideoLoader ? <VideoLoader /> : <div>Adatok betöltése...</div>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* 4 oszlopos reszponzív Érem számláló rács Lucide ikonokkal */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', textAlign: 'center' }}>
              
              <div style={{ background: '#131b2e', padding: '16px', borderRadius: '8px', border: '1px solid #222f47', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <Crown size={16} color="#fbbf24" />
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{lang === 'en' ? '1st Places' : 'Győzelmek'}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#fbbf24' }}>{selectedUser?.first_places || 0}</div>
              </div>
              
              <div style={{ background: '#131b2e', padding: '16px', borderRadius: '8px', border: '1px solid #222f47', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <Trophy size={16} color="#38bdf8" />
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{lang === 'en' ? 'Total Podiums' : 'Dobogók'}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#38bdf8' }}>{selectedUser?.podiums || 0}</div>
              </div>
              
              <div style={{ background: '#131b2e', padding: '16px', borderRadius: '8px', border: '1px solid #222f47', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <Zap size={14} color="#ec4899" />
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{lang === 'en' ? 'Master' : 'Képmester'}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#ec4899' }}>{masterCount}</div>
              </div>

              <div style={{ background: '#131b2e', padding: '16px', borderRadius: '8px', border: '1px solid #222f47', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <Star size={14} color="#a855f7" />
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{lang === 'en' ? 'Fair Score' : 'Dicsőség Pont'}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#a855f7' }}>{totalLikes.toFixed(1)}</div>
              </div>
              
            </div>

            {/* Pályaművek rácsa */}
            <div>
              <h3 style={{ color: '#f8fafc', marginBottom: '14px', fontSize: '1.2rem', fontWeight: '600', letterSpacing: '-0.2px' }}>
                {lang === 'en' ? `Past Submissions (${playerStats?.history?.length || 0})` : `Hivatalos pályaművek (${playerStats?.history?.length || 0} db)`}
              </h3>
              
              {!playerStats || !playerStats.history || playerStats.history.length === 0 ? (
                <div style={{ color: '#475569', background: '#131b2e', padding: '30px', borderRadius: '8px', textAlign: 'center', border: '1px dashed #222f47' }}>
                  <Camera size={24} style={{ margin: '0 auto 8px auto' }} />
                  <h4 style={{ color: '#cbd5e1', margin: '0 0 4px 0', fontSize: '0.95rem' }}>{lang === 'en' ? 'No finalized history available.' : 'Még nincs lezárt meccse.'}</h4>
                  
                  {/* ÉLŐ DIAGNOSZTIKAI MOTOR */}
                  <div style={{ background: '#0f172a', padding: '14px', marginTop: '16px', borderRadius: '6px', fontSize: '0.78rem', fontFamily: 'monospace', color: '#64748b', textAlign: 'left', border: '1px solid #222f47', lineHeight: '1.5' }}>
                    <div style={{ color: '#fb923c', marginBottom: '6px', fontWeight: 'bold' }}>🔍 SZERVEROLDALI FOLYAMAT-NAPLÓ:</div>
                    <div>• Frontend email: <span>"{selectedUser?.user_email || selectedUser?.email}"</span></div>
                    <div>• Backend beérkezett email: <span>"{playerStats?.debugQueryEmail || 'NINCS VÁLASZ'}"</span></div>
                    
                    <div style={{ margin: '8px 0', borderTop: '1px solid #222f47', paddingTop: '8px' }}>
                      {playerStats?.debugSteps && playerStats.debugSteps.map((step: string, i: number) => (
                        <div key={i} style={{ color: step.startsWith('❌') ? '#f43f5e' : step.startsWith('✅') || step.includes('Találat') ? '#10b981' : '#475569', marginBottom: '3px' }}>
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>

                  <p style={{ margin: '12px 0 0 0', fontSize: '0.8rem', color: '#475569' }}>
                    {lang === 'en' ? 'Submissions appear here once the current rounds are finalized by the admin.' : 'A pályaművek itt jelennek meg, amint a futamok lezárulnak és jóváhagyásra kerülnek.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {playerStats.history.map((entry: any, idx: number) => {
                    const totalEntries = Number(entry?.total_entries) || 1;
                    const rank = Number(entry?.rank) || 0;
                    
                    let badge = ''; let badgeColor = '#222f47'; let txtColor = '#64748b';
                    if (rank === 1) { badge = lang === 'en' ? '1st Place 🏆' : '1. Hely 🏆'; badgeColor = '#fbbf24'; txtColor = '#000'; }
                    else if (rank === 2) { badge = lang === 'en' ? '2nd Place 🥈' : '2. Hely 🥈'; badgeColor = '#cbd5e1'; txtColor = '#000'; }
                    else if (rank === 3) { badge = lang === 'en' ? '3rd Place 🥉' : '3. Hely 🥉'; badgeColor = '#b45309'; txtColor = '#fff'; }

                    const isDaily = getTopicType(entry?.start_date, entry?.end_date) === 'daily';

                    return (
                      <div key={idx} style={{ background: '#131b2e', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${rank <= 3 ? badgeColor : '#222f47'}`, boxShadow: '0 4px 15px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ position: 'relative', height: '200px', backgroundColor: '#090d16' }}>
                          <img src={getImageUrl ? getImageUrl(entry?.drive_file_id, entry?.file_url) : entry?.file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          
                          <div style={{ position: 'absolute', top: '12px', left: '12px', background: badgeColor, color: txtColor, padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.78rem' }}>
                            {badge || (lang === 'en' ? `Rank ${entry?.rank}` : `${entry?.rank}. Hely`)}
                          </div>
                          
                          <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(9,13,22,0.82)', color: isDaily ? '#f87171' : '#60a5fa', padding: '3px 10px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', border: `1px solid ${isDaily ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'}` }}>
                            {isDaily ? (lang === 'en' ? 'Blitz' : 'Villámfutam') : (lang === 'en' ? 'Master' : 'Mesterfutam')}
                          </div>
                        </div>

                        <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <h4 style={{ margin: '0 0 12px 0', color: '#f8fafc', fontSize: '1.05rem', fontWeight: '600', letterSpacing: '-0.2px' }}>{entry?.topic_title}</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.82rem', marginBottom: '10px' }}>
                              <span>{lang === 'en' ? `Field: ${totalEntries} photos` : `Mezőny: ${totalEntries} kép`}</span>
                              <span style={{color: '#cbd5e1'}}>{lang === 'en' ? 'Rank: ' : 'Helyezés: '}<b>{rank}.</b></span>
                            </div>
                            <div style={{ background: '#0f172a', padding: '10px', borderRadius: '4px', border: '1px solid #222f47', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                              <span style={{color: '#f97316', fontWeight: '700'}}>⚡ {Number(entry?.likes || 0).toFixed(1)} FP</span>
                              <span style={{color: '#38bdf8', fontWeight: '700'}}>👁️ {entry?.views || 0}</span>
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
  // 🏆 2. OLDALNÉZET: AZ EREDETI DICSŐGCSARNOK LISTA NÉZET
  // ====================================================================
  return (
    <div style={{ background: '#131b2e', padding: '24px', borderRadius: '8px', border: '1px solid #222f47', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#fbbf24', margin: 0, fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}><Trophy size={18} /> {t ? t('hofTitle') : 'Dicsőségcsarnok'}</h2>
        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>{t ? t('hofDesc') : 'A PhotAwesome közösség legnagyobb legendái.'}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {hallOfFame.map((row, index) => {
          const rowEmail = row?.user_email || row?.email;
          const isMe = rowEmail === user?.email;
          const likes = Number(row?.total_likes) || 0;
          
          const firstPlaces = Number(row?.first_places) || 0;
          const podiums = Number(row?.podiums) || 0;
          const masterCount = Number(row?.master_count) || 0;

          const level = getLevelDetails ? getLevelDetails(likes, 0) : { name: '', color: '#fff', bg: '' }; 
          
          const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#cbd5e1' : index === 2 ? '#b45309' : '#475569';
          
          // 🎯 Hatókörön belül: Itt is tökéletesen definiálva van
          const displayRankName = lang === 'en' ? (rankNamesEn[level?.name || ''] || level?.name || '') : (level?.name || '');

          return (
            <div 
              key={rowEmail || index} 
              onClick={() => handleUserClick(row)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                background: isMe ? 'rgba(251,191,36,0.02)' : '#0f172a', 
                border: isMe ? '1px solid rgba(251,191,36,0.3)' : '1px solid #222f47', 
                padding: '12px 16px', 
                borderRadius: '6px',
                transition: 'all 0.15s ease-in-out',
                flexWrap: 'wrap',
                gap: '12px',
                cursor: 'pointer'
              }}
              className="hof-row-card"
            >
              {/* Érem / Helyezés */}
              <div style={{ width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {index === 0 ? <Crown size={14} color="#fbbf24" fill="#fbbf24" /> :
                 index === 1 ? <Trophy size={14} color="#cbd5e1" /> :
                 index === 2 ? <Trophy size={14} color="#b45309" /> :
                 <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>{index + 1}</span>}
              </div>

              {/* Felhasználói Profilkép */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img 
                  src={row?.avatar_url || silhouetteAvatar} 
                  alt="" 
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: isMe ? '1px solid #fbbf24' : '1px solid #222f47', backgroundColor: '#090d16' }} 
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = silhouetteAvatar; }}
                />
              </div>

              {/* Felhasználó adatai */}
              <div style={{ flex: 1, minWidth: '180px' }}>
                <div style={{ color: isMe ? '#fbbf24' : 'white', fontWeight: '600', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '-0.2px' }}>
                  {row?.user_name} {isMe && <span style={{ fontSize: '0.65rem', background: '#fbbf24', color: '#0f172a', padding: '1px 6px', borderRadius: '3px', fontWeight: 'bold', textTransform: 'uppercase' }}>{t ? t('hofYou') : 'Ön'}</span>}
                </div>
                
                {row?.club_name && (
                  <div style={{ color: '#10b981', fontSize: '0.78rem', fontWeight: 'bold', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ClubLogo driveId={row?.drive_logo_id} logoUrl={row?.logo_url} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row?.club_name}</span>
                  </div>
                )}

                {/* Statisztikai címkék */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', color: '#fbbf24', background: 'rgba(251,191,36,0.06)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(251,191,36,0.12)', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    🥇 {firstPlaces}
                  </span>
                  
                  <span style={{ fontSize: '0.7rem', color: '#38bdf8', background: 'rgba(56,189,248,0.06)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(56,189,248,0.12)', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    🏆 {podiums}
                  </span>
                  
                  <span style={{ fontSize: '0.7rem', color: '#ec4899', background: 'rgba(236,72,153,0.06)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(236,72,153,0.12)', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <Zap size={10} /> {masterCount}
                  </span>
                </div>
              </div>

              {/* Rangjelzés */}
              <div style={{ marginRight: '6px' }} className="hof-rank-badge-wrapper">
                <span style={{ color: level?.color, border: `1px solid ${level?.color}30`, padding: '4px 12px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 'bold', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.01)' }}>
                  {displayRankName.split(' ')[0]}
                </span>
              </div>

              {/* Összesített pontszám */}
              <div style={{ textAlign: 'right', minWidth: '70px', flexShrink: 0 }}>
                <div style={{ color: '#cbd5e1', fontWeight: '700', fontSize: '1.15rem', whiteSpace: 'nowrap' }}>{likes.toFixed(0)} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#475569' }}>FP</span></div>
              </div>
            </div>
          );
        })}
      </div>
      
      <style>{`
        .hof-row-card:hover {
          border-color: #475569 !important;
          background: #141e33 !important;
        }
        .hof-back-btn:hover {
          background: #1e293b !important;
          color: white !important;
          border-color: #475569 !important;
        }
        @media (max-width: 540px) {
          .hof-rank-badge-wrapper {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
