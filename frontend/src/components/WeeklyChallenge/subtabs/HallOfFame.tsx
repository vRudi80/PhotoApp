import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { getImageUrl } from '../../../utils/helpers';
import VideoLoader from '../../../components/VideoLoader';
import { BACKEND_URL } from '../../../utils/constants';

// Nyelvi kontextus aktiválása
import { useLanguage } from '../../../context/LanguageContext';

// Téma környezet aktiválása
import { useTheme } from '../../../context/ThemeContext';

// Az interaktív kibeszélő modál importálása (ugyanúgy, mint a PastArchive-ban)
import ArchiveDetailModal from '../ArchiveDetailModal';

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
  Layers,
  X,
  Heart
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
    return <Shield size={12} color="var(--text-muted)" style={{ display: 'inline-block' }} />;
  }
  return (
    <img 
      src={getImageUrl ? getImageUrl(driveId, logoUrl) : ''} 
      alt="" 
      style={{ width: '16px', height: '18px', borderRadius: '2px', objectFit: 'contain', backgroundColor: '#090d16', border: '1px solid var(--border-main)', display: 'inline-block' }} 
      onError={() => setIsError(true)} 
    />
  );
}

export default function HallOfFame({ isLoadingHof, hallOfFame, user, getLevelDetails }: HallOfFameProps) {
  
  const { t, lang } = useLanguage();

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [playerStats, setPlayerStats] = useState<any | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // 🎯 ÚJ: Lokális állapot az éppen megnyitott interaktív kép részleteihez
  const [activeHofEntry, setActiveHofEntry] = useState<any | null>(null);

  let isLight = false;
  try {
    const themeContext = useTheme();
    if (themeContext) {
      isLight = themeContext.theme === 'light';
    }
  } catch (e) {}

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

  const getAdaptiveLevelDetails = (likes: number, victories: number) => {
    const lvl = getLevelDetails ? getLevelDetails(likes, victories) : { name: '', color: '#fbbf24', bg: '' };
    if (!isLight) return lvl;
    
    let adaptiveColor = lvl.color;
    if (lvl.name.includes('Megfigyelő')) adaptiveColor = '#475569';
    else if (lvl.name.includes('Képvadász')) adaptiveColor = '#0284c7';
    else if (lvl.name.includes('Komponista')) adaptiveColor = '#2563eb';
    else if (lvl.name.includes('Fényíró')) adaptiveColor = '#059669';
    else if (lvl.name.includes('Szakértő')) adaptiveColor = '#7c3aed';
    else if (lvl.name.includes('Képmester')) adaptiveColor = '#db2777';
    else if (lvl.name.includes('Nagymester')) adaptiveColor = '#d97706';
    else if (lvl.name.includes('Virtuóz')) adaptiveColor = '#ca8a04';
    else if (lvl.name.includes('Vizuális Legenda')) adaptiveColor = '#b45309';

    return { ...lvl, color: adaptiveColor };
  };

  // 🎯 ÚJ: Dinamikus reaktív szinkronizáció a modál ablak és a háttérben lévő adatsor között
  const currentModalEntry = useMemo(() => {
    if (!activeHofEntry || !playerStats?.history) return activeHofEntry;
    return playerStats.history.find((x: any) => x.id === activeHofEntry.id || x.file_url === activeHofEntry.file_url) || activeHofEntry;
  }, [activeHofEntry, playerStats]);

  if (isLoadingHof) {
    return VideoLoader ? <VideoLoader /> : <div>Loading...</div>;
  }

  if (!hallOfFame || hallOfFame.length === 0) {
    return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px', fontSize: '0.85rem', fontStyle: 'italic' }}>{t ? t('hofEmpty') : 'Üres toplista'}</div>;
  }

  const handleUserClick = async (row: any) => {
    setSelectedUser(row);
    
    const targetEmail = row?.user_email || row?.email;
    if (!targetEmail) return;

    setStatsLoading(true);
    setPlayerStats(null);
    try {
      const token = localStorage.getItem('photoAppToken');
      const res = await axios.get(`${BACKEND_URL}/api/weekly/hof-stats?userEmail=${encodeURIComponent(targetEmail)}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      setPlayerStats(res.data);
    } catch (err) {
      console.error('Hiba az adatok letöltésekor:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // ====================================================================
  // 📸 1. OLDALNÉZET: JÁTÉKOS STATISZTIKAI ADATLAPJA (REAKTÍV VERZIÓ)
  // ====================================================================
  if (selectedUser) {
    const totalLikes = Number(selectedUser?.total_likes) || 0;
    const currentLevel = getAdaptiveLevelDetails(totalLikes, Number(selectedUser?.first_places) || 0);
    const displayRankName = lang === 'en' ? (rankNamesEn[currentLevel?.name || ''] || currentLevel?.name || '') : (currentLevel?.name || '');
    const masterCount = Number(selectedUser?.master_count) || 0;

    return (
      <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
        
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={() => { setSelectedUser(null); setPlayerStats(null); }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} />
            {lang === 'en' ? 'Back to Hall of Fame' : 'Vissza a dicsőségcsarnokba'}
          </button>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '30px 20px', borderRadius: '8px', border: '1px solid var(--border-main)', marginBottom: '20px', textAlign: 'center', position: 'relative' }}>
          <div style={{ display: 'flex', marginBottom: '12px', justifyContent: 'center' }}>
            <img 
              src={selectedUser?.avatar_url || silhouetteAvatar} 
              alt="" 
              style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${currentLevel?.color || 'var(--border-main)'}`, backgroundColor: '#090d16' }} 
            />
          </div>
          
          <h1 style={{ color: 'var(--text-title)', margin: '0 0 4px 0', fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.3px' }}>{selectedUser?.user_name || 'Anonim'}</h1>
          <p style={{ color: '#10b981', margin: '0 0 16px 0', fontSize: '0.85rem', fontWeight: '600' }}>
            {selectedUser?.club_name || (lang === 'en' ? 'Independent Photographer' : 'Független fotós')}
          </p>

          <h3 style={{ color: 'var(--text-muted)', margin: '0 0 4px 0', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold' }}>{lang === 'en' ? 'RANK TIER' : 'FOTÓSMESTERI RANG'}</h3>
          <h2 style={{ color: currentLevel?.color || 'var(--text-title)', margin: '0 0 8px 0', fontSize: '1.8rem', fontWeight: '700' }}>{displayRankName}</h2>
          
          <div style={{ marginTop: '8px', fontSize: '0.82rem', color: 'var(--text-body)', fontWeight: '600' }}>
            {lang === 'en' ? `Total Score: ${totalLikes.toFixed(1)} FP` : `Összesített teljesítmény: ${totalLikes.toFixed(1)} FP`}
          </div>
        </div>

        {statsLoading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            {VideoLoader ? <VideoLoader /> : <div>Adatok betöltése...</div>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Bento statisztikai rács nyelvhelyes magyarázó tooltipekkel */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', textAlign: 'center' }}>
              
              <div title={lang === 'en' ? 'First Places in Arena challenges' : 'Első helyezések száma az Aréna kihívásokban'} style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <Crown size={16} color="#fbbf24" />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-body)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{lang === 'en' ? '1st Places' : 'Győzelmek'}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#fbbf24' }}>{selectedUser?.first_places || 0}</div>
              </div>
              
              <div title={lang === 'en' ? 'Podium finishes (1st, 2nd, or 3rd place)' : 'Dobogós helyezések száma összesen (1-3. hely)'} style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <Trophy size={16} color="#38bdf8" />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-body)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{lang === 'en' ? 'Total Podiums' : 'Dobogók'}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#38bdf8' }}>{selectedUser?.podiums || 0}</div>
              </div>
              
              <div title={lang === 'en' ? 'Times approved as Arena Judge / Master' : 'Jóváhagyott Csatabíró / Képmester alkalmak száma'} style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <Zap size={14} color="#ec4899" />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-body)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{lang === 'en' ? 'Master' : 'Képmester'}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#ec4899' }}>{masterCount}</div>
              </div>

              <div title={lang === 'en' ? 'Total accumulative Performance Points' : 'Összesített Fotós dicsőségpont egyenleg'} style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <Star size={14} color="#a855f7" />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-body)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{lang === 'en' ? 'Fair Score' : 'Dicsőség Pont'}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#a855f7' }}>{totalLikes.toFixed(1)}</div>
              </div>
              
            </div>

            {/* Pályaművek rácsa */}
            <div>
              <h3 style={{ color: 'var(--text-title)', marginBottom: '14px', fontSize: '1.2rem', fontWeight: '600', letterSpacing: '-0.2px' }}>
                {lang === 'en' ? `Past Submissions (${playerStats?.history?.length || 0})` : `Hivatalos pályaművek (${playerStats?.history?.length || 0} db)`}
              </h3>
              
              {!playerStats || !playerStats.history || playerStats.history.length === 0 ? (
                <div style={{ color: 'var(--text-body)', background: 'var(--bg-card)', padding: '30px', borderRadius: '8px', textAlign: 'center', border: '1px dashed var(--border-main)' }}>
                  <Camera size={24} style={{ margin: '0 auto 8px auto' }} />
                  <h4 style={{ color: 'var(--text-title)', margin: '0 0 4px 0', fontSize: '0.95rem' }}>{lang === 'en' ? 'No finalized history available.' : 'Még nincs lezárt meccse.'}</h4>
                  <p style={{ margin: '12px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {lang === 'en' ? 'Submissions appear here once the current rounds are finalized by the admin.' : 'A pályaművek itt jelennek meg, amint a futamok lezárulnak és jóváhagyásra kerülnek.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {playerStats.history.map((entry: any, idx: number) => {
                    const totalEntries = Number(entry?.total_entries) || 1;
                    const rank = Number(entry?.rank) || 0;
                    
                    let badge = ''; let badgeColor = 'var(--border-main)'; let txtColor = 'var(--text-body)';
                    if (rank === 1) { badge = lang === 'en' ? '1st Place 🏆' : '1. Hely 🏆'; badgeColor = '#fbbf24'; txtColor = '#000'; }
                    else if (rank === 2) { badge = lang === 'en' ? '2nd Place 🥈' : '2. Hely 🥈'; badgeColor = '#cbd5e1'; txtColor = '#000'; }
                    else if (rank === 3) { badge = lang === 'en' ? '3rd Place 🥉' : '3. Hely 🥉'; badgeColor = '#b45309'; txtColor = '#fff'; }

                    const isDaily = getTopicType(entry?.start_date, entry?.end_date) === 'daily';

                    return (
                      // 🎯 JAVÍTVA: A teljes kártyára rátettem az interaktív modálnyitó eseményt!
                      <div 
                        key={idx} 
                        onClick={() => setActiveHofEntry(entry)}
                        style={{ background: 'var(--bg-card)', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${rank <= 3 ? badgeColor : 'var(--border-main)'}`, boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                        className="hof-row-card"
                      >
                        <div style={{ position: 'relative', height: '200px', backgroundColor: '#090d16', cursor: 'zoom-in' }}>
                          <img src={getImageUrl ? getImageUrl(entry?.drive_file_id, entry?.file_url) : entry?.file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          
                          <div style={{ position: 'absolute', top: '12px', left: '12px', background: badgeColor, color: txtColor, padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.78rem' }}>
                            {badge || (lang === 'en' ? `Rank ${entry?.rank}` : `${entry?.rank}. Hely`)}
                          </div>
                          
                          <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(9,13,22,0.82)', color: isDaily ? '#f87171' : '#60a5fa', padding: '3px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${isDaily ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'}` }}>
                            {isDaily ? (lang === 'en' ? 'Blitz' : 'Villámfutam') : (lang === 'en' ? 'Master' : 'Mesterfutam')}
                          </div>
                        </div>

                        <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-title)', fontSize: '1.05rem', fontWeight: '600', letterSpacing: '-0.2px' }}>{entry?.topic_title}</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-body)', fontSize: '0.82rem', marginBottom: '10px' }}>
                              <span>{lang === 'en' ? `Field: ${totalEntries} photos` : `Mezőny: ${totalEntries} kép`}</span>
                              <span style={{color: 'var(--text-title)'}}>{lang === 'en' ? 'Rank: ' : 'Helyezés: '}<b>{rank}.</b></span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-main)', fontSize: '0.82rem' }}>
                              <span style={{color: '#f97316', fontWeight: '700'}}>⚡ {Number(entry?.likes || 0).toFixed(1)} FP</span>
                              
                              {/* 🎯 VIZUÁLIS EXTRA: Kis szívecske jelzi az archív dicséretek mennyiségét */}
                              <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                                <Heart size={12} className="text-muted" /> {entry?.archive_likes || 0} dicséret
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 🎯 INTERAKTÍV KIBESZÉLŐ ÉS HOZZÁSZÓLÁS MODÁL INTEGRÁCIÓJA */}
            {currentModalEntry && (
              <ArchiveDetailModal
                entry={{
                  ...currentModalEntry,
                  // Biztosítjuk, hogy a változó nevek megegyezzenek a modál elvárásaival
                  likes_count: currentModalEntry.rank <= 3 ? currentModalEntry.likes : currentModalEntry.likes_count
                }}
                userEmail={user?.email || user?.userEmail || ''} 
                userName={user?.name || user?.userName || (lang === 'en' ? 'Me' : 'Én')} 
                onClose={() => setActiveHofEntry(null)}
                onLikeUpdate={async () => {
                  // Azonnali reaktív statisztika-frissítés lájkolás/kommentelés esetén
                  const targetEmail = selectedUser?.user_email || selectedUser?.email;
                  if (targetEmail) {
                    try {
                      const token = localStorage.getItem('photoAppToken');
                      const res = await axios.get(`${BACKEND_URL}/api/weekly/hof-stats?userEmail=${encodeURIComponent(targetEmail)}`, {
                        headers: {
                          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                        }
                      });
                      setPlayerStats(res.data);
                    } catch (err) {
                      console.error('Hiba a HoF adatok frissítésekor:', err);
                    }
                  }
                }}
              />
            )}

          </div>
        )}
      </div>
    );
  }

  // ====================================================================
  // 🏆 2. OLDALNÉZET: AZ EREDETI DICSŐSÉGCSARNOK LISTA NÉZET
  // ====================================================================
  return (
    <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-main)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#fbbf24', margin: 0, fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}><Trophy size={18} /> {t('hofTitle')}</h2>
        <p style={{ color: 'var(--text-body)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>{t('hofDesc')}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {hallOfFame.map((row, index) => {
          const rowEmail = row?.user_email || row?.email;
          const isMe = rowEmail === user?.email;
          const likes = Number(row?.total_likes) || 0;
          
          const firstPlaces = Number(row?.first_places) || 0;
          const podiums = Number(row?.podiums) || 0;
          const masterCount = Number(row?.master_count) || 0;

          // 🎯 JAVÍTVA: Átadható a valós győzelmek száma (firstPlaces), így a szintek pontosan jelennek meg!
          const level = getAdaptiveLevelDetails(likes, firstPlaces); 
          const displayRankName = lang === 'en' ? (rankNamesEn[level?.name || ''] || level?.name || '') : (level?.name || '');

          return (
            <div 
              key={rowEmail || index} 
              onClick={() => handleUserClick(row)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                background: isMe ? 'rgba(245,158,11,0.03)' : 'var(--bg-main)', 
                border: isMe ? '1px solid rgba(245,158,11,0.35)' : '1px solid var(--border-main)', 
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
                 index === 1 ? <Trophy size={14} color="var(--text-body)" /> :
                 index === 2 ? <Trophy size={14} color="#b45309" /> :
                 <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>{index + 1}</span>}
              </div>

              {/* Felhasználói Profilkép */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img 
                  src={row?.avatar_url || silhouetteAvatar} 
                  alt="" 
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: isMe ? '1px solid #fbbf24' : '1px solid var(--border-main)', backgroundColor: '#090d16' }} 
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = silhouetteAvatar; }}
                />
              </div>

              {/* Felhasználó adatai */}
              <div style={{ flex: 1, minWidth: '180px' }}>
                <div style={{ color: isMe ? (isLight ? '#b45309' : '#fbbf24') : 'var(--text-title)', fontWeight: '600', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '-0.2px' }}>
                  {row?.user_name} {isMe && <span style={{ fontSize: '0.65rem', background: '#fbbf24', color: '#0f172a', padding: '1px 6px', borderRadius: '3px', fontWeight: 'bold', textTransform: 'uppercase' }}>{t('hofYou')}</span>}
                </div>
                
                {row?.club_name && (
                  <div style={{ color: '#10b981', fontSize: '0.78rem', fontWeight: 'bold', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ClubLogo driveId={row?.drive_logo_id} logoUrl={row?.logo_url} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row?.club_name}</span>
                  </div>
                )}

                {/* Statisztikai címkék reszponzív, lebegő magyarázatokkal */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span title={lang === 'en' ? 'Arena Victories (1st Places)' : 'Aréna győzelmek száma (1. helyezések)'} style={{ fontSize: '0.7rem', color: '#fbbf24', background: 'rgba(251,191,36,0.06)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(251,191,36,0.12)', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    🥇 {firstPlaces}
                  </span>
                  
                  <span title={lang === 'en' ? 'Podium finishes (1st, 2nd, or 3rd place)' : 'Dobogós helyezések száma (1., 2. és 3. helyek)'} style={{ fontSize: '0.7rem', color: '#38bdf8', background: 'rgba(56,189,248,0.06)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(56,189,248,0.12)', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    🏆 {podiums}
                  </span>
                  
                  <span title={lang === 'en' ? 'Times approved as Arena Judge / Master' : 'Csatabíróként / Képmesterként vezetett Aréna futamok száma'} style={{ fontSize: '0.7rem', color: '#ec4899', background: 'rgba(236,72,153,0.06)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(236,72,153,0.12)', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <Zap size={10} /> {masterCount}
                  </span>
                </div>
              </div>

              {/* Rangjelzés */}
              <div style={{ marginRight: '6px' }} className="hof-rank-badge-wrapper">
                <span style={{ color: level?.color, border: `1px solid ${level?.color}30`, padding: '4px 12px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 'bold', whiteSpace: 'nowrap', background: 'var(--hover-overlay)' }}>
                  {displayRankName.split(' ')[0]}
                </span>
              </div>

              {/* Összesített pontszám */}
              <div style={{ textAlign: 'right', minWidth: '70px', flexShrink: 0 }}>
                <div style={{ color: 'var(--text-title)', fontWeight: '700', fontSize: '1.15rem', whiteSpace: 'nowrap' }}>{likes.toFixed(0)} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>FP</span></div>
              </div>
            </div>
          );
        })}
      </div>
      
      <style>{`
        .hof-row-card:hover {
          border-color: #475569 !important;
          background: var(--hover-overlay) !important;
        }
        .hof-back-btn:hover {
          background: var(--hover-overlay) !important;
          color: var(--text-title) !important;
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
