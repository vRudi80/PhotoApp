import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { getImageUrl } from '../../../utils/helpers';
import VideoLoader from '../../../components/VideoLoader';
import { BACKEND_URL } from '../../../utils/constants';

import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import ArchiveDetailModal from '../ArchiveDetailModal';

import { 
  ArrowLeft, 
  Crown, 
  Shield, 
  Zap, 
  Trophy, 
  Camera, 
  Star,
  Heart
} from 'lucide-react';

interface HallOfFameProps {
  isLoadingHof: boolean;
  hallOfFame: any[];
  user: any;
}

export const calculateExactRank = (likes: number, victories: number) => {
  const fp = Number(likes) || 0;
  const vic = Number(victories) || 0;

  const ranks = [
    { name: 'Vizuális Legenda 👑', minFp: 10000, minVic: 15, color: '#eab308' },
    { name: 'Fotóguru 🔥', minFp: 7000, minVic: 12, color: '#ef4444' },
    { name: 'Virtuóz ⚡', minFp: 4800, minVic: 9, color: '#f97316' },
    { name: 'Nagymester 🌟', minFp: 3200, minVic: 7, color: '#fbbf24' },
    { name: 'Képmester 🎨', minFp: 2000, minVic: 5, color: '#ec4899' },
    { name: 'Szakértő 🎯', minFp: 1300, minVic: 3, color: '#a855f7' },
    { name: 'Esztéta 💎', minFp: 800, minVic: 2, color: '#06b6d4' },
    { name: 'Fényíró 🎞️', minFp: 500, minVic: 1, color: '#059669' },
    { name: 'Komponista 📐', minFp: 250, minVic: 0, color: '#3b82f6' },
    { name: 'Képvadász 📷', minFp: 100, minVic: 0, color: '#38bdf8' },
    { name: 'Megfigyelő 👁️', minFp: 30, minVic: 0, color: '#94a3b8' },
    { name: 'Fényleső 🌱', minFp: 0, minVic: 0, color: '#10b981' }
  ];

  for (const r of ranks) {
    if (fp >= r.minFp && vic >= r.minVic) {
      return r;
    }
  }
  return ranks[ranks.length - 1];
};

function ClubLogo({ driveId, logoUrl }: { driveId: any; logoUrl: any }) {
  const [isError, setIsError] = useState(false);
  if (isError || (!driveId && !logoUrl)) {
    return <Shield size={12} color="var(--text-muted)" style={{ display: 'inline-block' }} />;
  }
  return (
    <img 
      src={getImageUrl ? getImageUrl(driveId, logoUrl) : ''} 
      alt="" 
      referrerPolicy="no-referrer"
      style={{ width: '16px', height: '18px', borderRadius: '2px', objectFit: 'contain', backgroundColor: '#090d16', border: '1px solid var(--border-main)', display: 'inline-block' }} 
      onError={() => setIsError(true)} 
    />
  );
}

export default function HallOfFame({ isLoadingHof, hallOfFame, user }: HallOfFameProps) {
  const { t, lang } = useLanguage();

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [playerStats, setPlayerStats] = useState<any | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
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
    'Virtuóz ⚡': 'Virtuoso ⚡',
    'Fotóguru 🔥': 'Photo Guru 🔥',
    'Vizuális Legenda 👑': 'Visual Legend 👑'
  };

  const getAdaptiveLevelDetails = (likes: number, victories: number) => {
    return calculateExactRank(likes, victories);
  };

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

  if (selectedUser) {
    const totalLikes = Number(selectedUser?.total_likes) || 0;
    const currentLevel = getAdaptiveLevelDetails(totalLikes, Number(selectedUser?.first_places) || 0);
    const displayRankName = lang === 'en' ? (rankNamesEn[currentLevel?.name || ''] || currentLevel?.name || '') : (currentLevel?.name || '');

    return (
      <div style={{ animation: 'fadeIn 0.4s ease-out', width: '100%', maxWidth: '100vw', overflowX: 'hidden', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: '16px' }}>
          <button 
            onClick={() => { setSelectedUser(null); setPlayerStats(null); }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '6px 14px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} />
            {lang === 'en' ? 'Back to Hall of Fame' : 'Vissza a dicsőségcsarnokba'}
          </button>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '20px 16px', borderRadius: '8px', border: '1px solid var(--border-main)', marginBottom: '16px', textAlign: 'center', position: 'relative', boxSizing: 'border-box', width: '100%' }}>
          <div style={{ display: 'flex', marginBottom: '10px', justifyContent: 'center' }}>
            {/* 🎯 referrerPolicy="no-referrer" az Androidos betöltéshez */}
            <img 
              src={selectedUser?.avatar_url || silhouetteAvatar} 
              alt="" 
              referrerPolicy="no-referrer"
              style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${currentLevel?.color || 'var(--border-main)'}`, backgroundColor: '#090d16' }} 
            />
          </div>
          
          <h1 style={{ color: 'var(--text-title)', margin: '0 0 4px 0', fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', fontWeight: '700', letterSpacing: '-0.3px', wordBreak: 'break-word' }}>{selectedUser?.user_name || 'Anonim'}</h1>
          <p style={{ color: '#10b981', margin: '0 0 12px 0', fontSize: '0.82rem', fontWeight: '600', wordBreak: 'break-word' }}>
            {selectedUser?.club_name || (lang === 'en' ? 'Independent Photographer' : 'Független fotós')}
          </p>

          <h3 style={{ color: 'var(--text-muted)', margin: '0 0 2px 0', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold' }}>{lang === 'en' ? 'RANK TIER' : 'FOTÓSMESTERI RANG'}</h3>
          <h2 style={{ color: currentLevel?.color || 'var(--text-title)', margin: '0 0 6px 0', fontSize: 'clamp(1.3rem, 4vw, 1.6rem)', fontWeight: '700', wordBreak: 'break-word' }}>{displayRankName}</h2>
          
          <div style={{ marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-body)', fontWeight: '600' }}>
            {lang === 'en' ? `Total Score: ${totalLikes.toFixed(1)} FP` : `Összesített teljesítmény: ${totalLikes.toFixed(1)} FP`}
          </div>
        </div>

        {statsLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <VideoLoader />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ background: 'var(--bg-card)', padding: '12px 8px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <Crown size={14} color="#fbbf24" />
                <div style={{ fontSize: '0.68rem', color: 'var(--text-body)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{lang === 'en' ? '1st Places' : 'Győzelmek'}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fbbf24' }}>{selectedUser?.first_places || 0}</div>
              </div>
              
              <div style={{ background: 'var(--bg-card)', padding: '12px 8px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <Trophy size={14} color="#38bdf8" />
                <div style={{ fontSize: '0.68rem', color: 'var(--text-body)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{lang === 'en' ? 'Total Podiums' : 'Dobogók'}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#38bdf8' }}>{selectedUser?.podiums || 0}</div>
              </div>
              
              <div style={{ background: 'var(--bg-card)', padding: '12px 8px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <Zap size={12} color="#ec4899" />
                <div style={{ fontSize: '0.68rem', color: 'var(--text-body)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{lang === 'en' ? 'Master' : 'Képmester'}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ec4899' }}>{Number(selectedUser?.master_count) || 0}</div>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '12px 8px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <Star size={12} color="#a855f7" />
                <div style={{ fontSize: '0.68rem', color: 'var(--text-body)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{lang === 'en' ? 'Fair Score' : 'Dicsőség Pont'}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#a855f7' }}>{totalLikes.toFixed(1)}</div>
              </div>
            </div>

            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <h3 style={{ color: 'var(--text-title)', marginBottom: '12px', fontSize: '1.1rem', fontWeight: '600', letterSpacing: '-0.2px', wordBreak: 'break-word' }}>
                {lang === 'en' ? `Past Submissions (${playerStats?.history?.length || 0})` : `Hivatalos pályaművek (${playerStats?.history?.length || 0} db)`}
              </h3>
              
              {!playerStats || !playerStats.history || playerStats.history.length === 0 ? (
                <div style={{ color: 'var(--text-body)', background: 'var(--bg-card)', padding: '24px', borderRadius: '8px', textAlign: 'center', border: '1px dashed var(--border-main)' }}>
                  <Camera size={22} style={{ margin: '0 auto 6px auto' }} />
                  <h4 style={{ color: 'var(--text-title)', margin: '0 0 4px 0', fontSize: '0.9rem' }}>{lang === 'en' ? 'No finalized history available.' : 'Még nincs lezárt meccse.'}</h4>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
                  {playerStats.history.map((entry: any, idx: number) => {
                    const totalEntries = Number(entry?.total_entries) || 1;
                    const rank = Number(entry?.rank) || 0;
                    
                    let badge = ''; let badgeColor = 'var(--border-main)'; let txtColor = 'var(--text-body)';
                    if (rank === 1) { badge = lang === 'en' ? '1st Place 🏆' : '1. Hely 🏆'; badgeColor = '#fbbf24'; txtColor = '#000'; }
                    else if (rank === 2) { badge = lang === 'en' ? '2nd Place 🥈' : '2. Hely 🥈'; badgeColor = '#cbd5e1'; txtColor = '#000'; }
                    else if (rank === 3) { badge = lang === 'en' ? '3rd Place 🥉' : '3. Hely 🥉'; badgeColor = '#b45309'; txtColor = '#fff'; }

                    return (
                      <div 
                        key={idx} 
                        onClick={() => setActiveHofEntry(entry)}
                        style={{ background: 'var(--bg-card)', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${rank <= 3 ? badgeColor : 'var(--border-main)'}`, boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', cursor: 'pointer', boxSizing: 'border-box', width: '100%' }}
                        className="hof-row-card"
                      >
                        <div style={{ position: 'relative', height: '180px', backgroundColor: '#090d16', cursor: 'zoom-in' }}>
                          <img src={getImageUrl ? getImageUrl(entry?.drive_file_id, entry?.file_url) : entry?.file_url} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', top: '10px', left: '10px', background: badgeColor, color: txtColor, padding: '3px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.72rem' }}>
                            {badge || (lang === 'en' ? `Rank ${entry?.rank}` : `${entry?.rank}. Hely`)}
                          </div>
                        </div>

                        <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', width: '100%' }}>
                          <div>
                            <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-title)', fontSize: '0.98rem', fontWeight: '600', letterSpacing: '-0.2px', wordBreak: 'break-word' }}>{entry?.topic_title}</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-body)', fontSize: '0.78rem', marginBottom: '8px' }}>
                              <span>{lang === 'en' ? `Field: ${totalEntries} photos` : `Mezőny: ${totalEntries} kép`}</span>
                              <span style={{color: 'var(--text-title)'}}>{lang === 'en' ? 'Rank: ' : 'Helyezés: '}<b>{rank}.</b></span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border-main)', fontSize: '0.78rem' }}>
                              <span style={{color: '#f97316', fontWeight: '700'}}>⚡ {Number(entry?.likes || 0).toFixed(1)} FP</span>
                              <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}>
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

            {currentModalEntry && (
              <ArchiveDetailModal
                entry={{
                  ...currentModalEntry,
                  likes_count: currentModalEntry.rank <= 3 ? currentModalEntry.likes : currentModalEntry.likes_count
                }}
                userEmail={user?.email || user?.userEmail || ''} 
                userName={user?.name || user?.userName || (lang === 'en' ? 'Me' : 'Én')} 
                onClose={() => setActiveHofEntry(null)}
                onLikeUpdate={async () => {
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

  return (
    <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '8px', border: '1px solid var(--border-main)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', animation: 'fadeIn 0.4s ease-out', width: '100%', maxWidth: '100vw', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ color: '#fbbf24', margin: 0, fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '6px', wordBreak: 'break-word' }}><Trophy size={16} /> {t('hofTitle')}</h2>
        <p style={{ color: 'var(--text-body)', fontSize: '0.8rem', margin: '4px 0 0 0', wordBreak: 'break-word' }}>{t('hofDesc')}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
        {hallOfFame.map((row, index) => {
          const rowEmail = row?.user_email || row?.email;
          const isMe = rowEmail === user?.email;
          const likes = Number(row?.total_likes) || 0;
          const firstPlaces = Number(row?.first_places) || 0;

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
                padding: '10px 12px', 
                borderRadius: '6px',
                transition: 'all 0.15s ease-in-out',
                flexWrap: 'wrap',
                gap: '8px',
                cursor: 'pointer',
                boxSizing: 'border-box',
                width: '100%'
              }}
              className="hof-row-card"
            >
              <div style={{ width: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {index === 0 ? <Crown size={14} color="#fbbf24" fill="#fbbf24" /> :
                 index === 1 ? <Trophy size={14} color="var(--text-body)" /> :
                 index === 2 ? <Trophy size={14} color="#b45309" /> :
                 <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>{index + 1}</span>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img 
                  src={row?.avatar_url || silhouetteAvatar} 
                  alt="" 
                  referrerPolicy="no-referrer"
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: isMe ? '1px solid #fbbf24' : '1px solid var(--border-main)', backgroundColor: '#090d16' }} 
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = silhouetteAvatar; }}
                />
              </div>

              <div style={{ flex: '1 1 150px', minWidth: 0 }}>
                <div style={{ color: isMe ? (isLight ? '#b45309' : '#fbbf24') : 'var(--text-title)', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px', letterSpacing: '-0.2px', wordBreak: 'break-word' }}>
                  <span style={{ wordBreak: 'break-word' }}>{row?.user_name}</span>
                  {isMe && <span style={{ fontSize: '0.6rem', background: '#fbbf24', color: '#0f172a', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold', textTransform: 'uppercase', flexShrink: 0 }}>{t('hofYou')}</span>}
                </div>
                
                {row?.club_name && (
                  <div style={{ color: '#10b981', fontSize: '0.72rem', fontWeight: 'bold', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '4px', wordBreak: 'break-word' }}>
                    <ClubLogo driveId={row?.drive_logo_id} logoUrl={row?.logo_url} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row?.club_name}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span title={lang === 'en' ? 'Arena Victories (1st Places)' : 'Aréna győzelmek száma (1. helyezések)'} style={{ fontSize: '0.65rem', color: '#fbbf24', background: 'rgba(251,191,36,0.06)', padding: '1px 6px', borderRadius: '3px', border: '1px solid rgba(251,191,36,0.12)', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    🥇 {firstPlaces}
                  </span>
                  
                  <span title={lang === 'en' ? 'Podium finishes (1st, 2nd, or 3rd place)' : 'Dobogós helyezések száma (1., 2. és 3. helyek)'} style={{ fontSize: '0.65rem', color: '#38bdf8', background: 'rgba(56,189,248,0.06)', padding: '1px 6px', borderRadius: '3px', border: '1px solid rgba(56,189,248,0.12)', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    🏆 {Number(row?.podiums) || 0}
                  </span>
                  
                  <span title={lang === 'en' ? 'Times approved as Arena Judge / Master' : 'Csatabíróként / Képmesterként vezetett Aréna futamok száma'} style={{ fontSize: '0.65rem', color: '#ec4899', background: 'rgba(236,72,153,0.06)', padding: '1px 6px', borderRadius: '3px', border: '1px solid rgba(236,72,153,0.12)', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    <Zap size={9} /> {Number(row?.master_count) || 0}
                  </span>
                </div>
              </div>

              <div style={{ marginRight: '4px' }} className="hof-rank-badge-wrapper">
                <span style={{ color: level?.color, border: `1px solid ${level?.color}30`, padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 'bold', whiteSpace: 'nowrap', background: 'var(--hover-overlay)' }}>
                  {displayRankName.split(' ')[0]}
                </span>
              </div>

              <div style={{ textAlign: 'right', minWidth: '60px', flexShrink: 0 }}>
                <div style={{ color: 'var(--text-title)', fontWeight: '700', fontSize: '1rem', whiteSpace: 'nowrap' }}>{likes.toFixed(0)} <span style={{ fontSize: '0.7rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>FP</span></div>
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
        @media (max-width: 540px) {
          .hof-rank-badge-wrapper {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
