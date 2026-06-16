import React, { useState, useEffect, useMemo } from 'react';
import { getImageUrl } from '../../../utils/helpers';
import ArchiveDetailModal from '../ArchiveDetailModal';
import { toPng } from 'html-to-image'; 
import { BACKEND_URL, ADMIN_EMAIL } from '../../../utils/constants';

// 🎯 ÚJ IMPORT: Behozzuk a nyelvi kontextust
import { useLanguage } from '../../../context/LanguageContext';

interface PastArchiveProps {
  pastTopics: any[];
  selectedPastTopicId: number | null;
  loadPastHistoryList: (id: number) => void;
  pastClubLeaderboard: any[];
  pastLeaderboard: any[];
  getTopicType: (start: string, end: string) => 'daily' | 'weekly';
  handleImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  setFullscreenData: (data: any) => void;
  user: any; 
}

export default function PastArchive({
  pastTopics, selectedPastTopicId, loadPastHistoryList,
  pastClubLeaderboard, pastLeaderboard, getTopicType,
  handleImageError, setFullscreenData, user
}: PastArchiveProps) {

  // 🎯 Nyelvi fordító és jelző beállítása
  const { t, lang } = useLanguage();

  const [activeArchiveEntry, setActiveArchiveEntry] = useState<any | null>(null);

  // 👑 Képgeneráló állapotok az admin pódium-plakáthoz
  const [adminPosterData, setAdminPosterData] = useState<{ topic: any; entries: any[] } | null>(null);
  const [isAdminGeneratingPoster, setIsAdminGeneratingPoster] = useState(false);

  // 💥 MATEMATIKAI MOTOR: A Top 3 győztes kiszámítása szigorú rangsor alapján a pódiumhoz
  const topThreeWinners = useMemo(() => {
    if (!pastLeaderboard || pastLeaderboard.length === 0) return [];
    return [...pastLeaderboard].sort((a, b) => {
      const likesA = Number(a?.likes_count || 0);
      const likesB = Number(b?.likes_count || 0);
      const viewsA = Number(a?.views_count || 0);
      const viewsB = Number(b?.views_count || 0);
      if (likesB !== likesA) return likesB - likesA;
      return viewsA - viewsB;
    }).slice(0, 3);
  }, [pastLeaderboard]);

  const currentModalEntry = activeArchiveEntry
    ? (pastLeaderboard.find(x => x.id === activeArchiveEntry.id) || activeArchiveEntry)
    : null;

  // 👑 ADMIN FUNKCIÓ: Top 3 helyezett kivonása és Base64 konverziója (CORS-biztos)
  const handleGenerateAdminPoster = async (matchedTopic: any) => {
    if (!matchedTopic || pastLeaderboard.length === 0) return;
    setIsAdminGeneratingPoster(true);

    try {
      const sortedWinners = [...pastLeaderboard].sort((a, b) => {
        const likesA = Number(a?.likes_count || 0);
        const likesB = Number(b?.likes_count || 0);
        const viewsA = Number(a?.views_count || 0);
        const viewsB = Number(b?.views_count || 0);
        if (likesB !== likesA) return likesB - likesA;
        return viewsA - viewsB;
      }).slice(0, 3);

      const processedEntries = [];
      for (let i = 0; i < sortedWinners.length; i++) {
        const entry = sortedWinners[i];
        let base64Url = 'https://via.placeholder.com/400x400/1e293b/64748b?text=No+Photo';
        
        try {
          const proxyUrl = entry.drive_file_id 
            ? `${BACKEND_URL}/api/image-base64/${entry.drive_file_id}`
            : `${BACKEND_URL}/api/admin/base64-proxy?url=${encodeURIComponent(entry.file_url)}`;
            
          const proxyRes = await fetch(proxyUrl);
          if (proxyRes.ok) {
            const proxyData = await proxyRes.json();
            if (proxyData.base64) base64Url = proxyData.base64;
          }
        } catch (e) { console.error("Kép konvertálási hiba:", e); }
        
        processedEntries.push({ ...entry, base64Url, rank: i + 1 });
      }

      setAdminPosterData({ topic: matchedTopic, entries: processedEntries });
    } catch (err) {
      alert("Hiba történt a pódium adatok feldolgozásakor.");
      console.error(err);
      setIsAdminGeneratingPoster(false);
    }
  };

  // 👑 ADMIN EFFECT: Automatikus nagy felbontású képkonverzió és letöltésindítás
  useEffect(() => {
    if (!adminPosterData) return;
    
    const executeDownload = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      const node = document.getElementById('admin-past-poster-node');
      
      if (node) {
        try {
          await toPng(node, { cacheBust: true }); 
          const dataUrl = await toPng(node, { cacheBust: true, quality: 1.0 });
          
          const link = document.createElement('a');
          link.download = `Arena_Facebook_Winners_${adminPosterData.topic.title.replace(/\s+/g, '_')}.png`;
          link.href = dataUrl;
          link.click();
        } catch (e) {
          console.error(e);
          alert("Hiba a plakátkép letöltése közben.");
        } finally {
          setAdminPosterData(null);
          setIsAdminGeneratingPoster(false);
        }
      }
    };
    executeDownload();
  }, [adminPosterData]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* 📜 BAL OLDALSÁV: BEFEJEZETT CSATÁK MENETRENDJE */}
      <div style={{ background: '#1e293b', borderRadius: '24px', padding: '25px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', height: 'fit-content' }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#60a5fa', fontSize: '1.4rem', fontWeight: 'bold' }}>{t('archiveTitle')}</h3>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem', lineHeight: '1.4' }}>{t('archiveNotice')}</p>
        {(!pastTopics || pastTopics.length === 0) ? (
          <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '15px' }}>{t('archiveEmpty')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
            {pastTopics.map(tRow => {
              const isDaily = getTopicType(tRow.start_date, tRow.end_date) === 'daily';
              return (
                <div 
                  key={tRow.id} 
                  onClick={() => loadPastHistoryList(tRow.id)} 
                  style={{ 
                    padding: '15px 20px', 
                    background: selectedPastTopicId === tRow.id ? 'linear-gradient(90deg, #3b82f640, #0f172a)' : '#0f172a', 
                    border: selectedPastTopicId === tRow.id ? '1px solid #3b82f6' : '1px solid #334155', 
                    borderRadius: '12px', cursor: 'pointer', color: 'white', 
                    fontWeight: selectedPastTopicId === tRow.id ? 'bold' : 'normal', transition: 'all 0.2s' 
                  }}
                >
                  {isDaily ? '🔴 ' : '🔵 '} {lang === 'en' && tRow.title_en ? tRow.title_en : tRow.title}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* 📊 JOBB OLDALSÁV: RÉSZLETES HADJELENTÉSEK */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* CSATA BORÍTÓKÉP BANNER ÉS ADMIN PLAKÁT GOMB */}
        {selectedPastTopicId && (() => {
          const matchedTopic = pastTopics.find(x => x.id === selectedPastTopicId);
          if (matchedTopic) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {matchedTopic.cover_url && (
                  <div>
                    <div style={{ width: '100%', height: '200px', borderRadius: '24px', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 10px 25px rgba(0,0,0,0.4)', position: 'relative', backgroundColor: '#090d16' }}>
                      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${matchedTopic.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(15px) brightness(0.5)', transform: 'scale(1.1)' }}></div>
                      <img src={matchedTopic.cover_url} alt="" style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', zIndex: 1 }} onError={handleImageError} />
                    </div>
                    {matchedTopic.cover_author && (
                      <div style={{ color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic', marginTop: '5px', textAlign: 'right', paddingRight: '10px' }}>
                        {t('archiveCoverAuthor')}{matchedTopic.cover_author}
                      </div>
                    )}
                  </div>
                )}

                {/* ── 🏆 MODERN 3D DOBOGÓ (PODIUM) SZERKEZET KÖZVETLENÜL A BANNER ALÁ ── */}
                {topThreeWinners.length > 0 && (
                  <div style={{ background: 'linear-gradient(180deg, #1e293b, #0f172a)', borderRadius: '24px', padding: '25px 15px', border: '1px solid #334155', boxShadow: '0 15px 35px rgba(0,0,0,0.4)', marginTop: '5px' }}>
                    <h4 style={{ color: '#fbbf24', fontSize: '1.1rem', fontWeight: 'bold', textAlign: 'center', margin: '0 0 25px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      🏆 {lang === 'en' ? 'Challenge Podium' : 'A Kihívás Dobogósai'}
                    </h4>
                    
                    <div className="past-archive-podium-container" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '12px', width: '100%', minHeight: '220px' }}>
                      
                      {/* 🥈 2. HELYEZETT (BAL OLDAL) */}
                      {topThreeWinners[1] && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
                          <div style={{ position: 'relative', cursor: 'pointer', marginBottom: '8px' }} onClick={() => setActiveArchiveEntry(topThreeWinners[1])}>
                            <img src={getImageUrl(topThreeWinners[1].drive_file_id, topThreeWinners[1].file_url)} alt="" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #cbd5e1', boxShadow: '0 8px 20px rgba(0,0,0,0.5)' }} onError={handleImageError} />
                            <span style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#cbd5e1', color: '#0f172a', width: '18px', height: '18px', borderRadius: '50%', fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                          </div>
                          <div style={{ background: 'linear-gradient(180deg, #334155, #1e293b)', border: '1px solid #475569', width: '100%', height: '85px', borderRadius: '12px 12px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px', boxSizing: 'border-box', textAlign: 'center' }}>
                            <span style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 'bold', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topThreeWinners[1].user_name}</span>
                            <span style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: '900', marginTop: '2px' }}>{topThreeWinners[1].likes_count} ⭐</span>
                          </div>
                        </div>
                      )}

                      {/* 🥇 1. HELYEZETT (KÖZÉP - KIEMELKEDŐ) */}
                      {topThreeWinners[0] && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1.1, minWidth: 0, zIndex: 2 }}>
                          <div style={{ fontSize: '1.4rem', marginBottom: '-6px', filter: 'drop-shadow(0 2px 6px rgba(251,191,36,0.4))' }}>👑</div>
                          <div style={{ position: 'relative', cursor: 'pointer', marginBottom: '8px' }} onClick={() => setActiveArchiveEntry(topThreeWinners[0])}>
                            <img src={getImageUrl(topThreeWinners[0].drive_file_id, topThreeWinners[0].file_url)} alt="" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #fbbf24', boxShadow: '0 10px 25px rgba(251,191,36,0.3)' }} onError={handleImageError} />
                            <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: '#fbbf24', color: '#0f172a', width: '22px', height: '22px', borderRadius: '50%', fontSize: '0.75rem', fontWeight: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>1</span>
                          </div>
                          <div style={{ background: 'linear-gradient(180deg, #fbbf24, #b45309)', width: '100%', height: '115px', borderRadius: '12px 12px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px', boxSizing: 'border-box', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
                            <span style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: '900', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topThreeWinners[0].user_name}</span>
                            <span style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 'bold', marginTop: '2px', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{topThreeWinners[0].likes_count} ⭐</span>
                          </div>
                        </div>
                      )}

                      {/* 🥉 3. HELYEZETT (JOBB OLDAL) */}
                      {topThreeWinners[2] && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
                          <div style={{ position: 'relative', cursor: 'pointer', marginBottom: '8px' }} onClick={() => setActiveArchiveEntry(topThreeWinners[2])}>
                            <img src={getImageUrl(topThreeWinners[2].drive_file_id, topThreeWinners[2].file_url)} alt="" style={{ width: '60px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #b45309', boxShadow: '0 8px 20px rgba(0,0,0,0.5)' }} onError={handleImageError} />
                            <span style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#b45309', color: '#ffffff', width: '18px', height: '18px', borderRadius: '50%', fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                          </div>
                          <div style={{ background: 'linear-gradient(180deg, #7c2d12, #431407)', border: '1px solid #7c2d12', width: '100%', height: '70px', borderRadius: '12px 12px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px', boxSizing: 'border-box', textAlign: 'center' }}>
                            <span style={{ color: '#ffedd5', fontSize: '0.78rem', fontWeight: 'bold', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topThreeWinners[2].user_name}</span>
                            <span style={{ color: '#fdba74', fontSize: '0.78rem', fontWeight: '900', marginTop: '2px' }}>{topThreeWinners[2].likes_count} ⭐</span>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}

                {/* 👑 Adminisztrátori pódium-generáló gomb */}
                {user?.email === ADMIN_EMAIL && pastLeaderboard.length > 0 && (
                  <button
                    disabled={isAdminGeneratingPoster}
                    onClick={() => handleGenerateAdminPoster(matchedTopic)}
                    style={{ background: '#0f172a', color: '#fbbf24', border: '1px solid #fbbf24', padding: '12px 24px', borderRadius: '14px', fontWeight: 'bold', fontSize: '0.95rem', cursor: isAdminGeneratingPoster ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(251,191,36,0.1)' }}
                    onMouseEnter={(e) => { if (!isAdminGeneratingPoster) { e.currentTarget.style.background = '#fbbf24'; e.currentTarget.style.color = '#0f172a'; } }}
                    onMouseLeave={(e) => { if (!isAdminGeneratingPoster) { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.color = '#fbbf24'; } }}
                  >
                    {isAdminGeneratingPoster ? '⏳ Plakát összeállítása...' : '🏆 Facebook Eredményplakát Letöltése (1200x1200px)'}
                  </button>
                )}
              </div>
            );
          }
          return null;
        })()}

        {/* KLUBOK CSATÁJA RANGLISTA */}
        <div style={{ background: '#1e293b', borderRadius: '24px', padding: '25px', border: '1px solid #10b981', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, color: '#10b981', fontSize: '1.4rem', fontWeight: 'bold' }}>{t('archiveClubLeague')}</h3>
            {selectedPastTopicId && (() => {
              const matchedTopic = pastTopics.find(x => x.id === selectedPastTopicId);
              if (!matchedTopic) return null;
              const isDaily = getTopicType(matchedTopic.start_date, matchedTopic.end_date) === 'daily';
              return (
                <span style={{ fontSize: '0.75rem', background: isDaily ? '#ef444420' : '#3b82f620', color: isDaily ? '#f87171' : '#60a5fa', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold', border: `1px solid ${isDaily ? '#ef444450' : '#3b82f650'}` }}>
                  {isDaily ? t('archiveBlitz') : t('archiveMaster')}
                </span>
              );
            })()}
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0 0 20px 0' }}>{t('archiveClubLeagueDesc')}</p>
          
          {selectedPastTopicId && (!pastClubLeaderboard || pastClubLeaderboard.length === 0) && <div style={{ color: '#94a3b8', textAlign: 'center', padding: '10px' }}>{t('archiveNoClubs')}</div>}
          {!selectedPastTopicId && <div style={{ color: '#94a3b8', textAlign: 'center', padding: '10px' }}>{t('archiveSelectChallenge')}</div>}
          
          {pastClubLeaderboard && pastClubLeaderboard.map((club, index) => {
            const clubMembers = pastLeaderboard
              .filter(entry => entry?.club_name === club?.club_name)
              .sort((a, b) => Number(b?.likes_count || 0) - Number(a?.likes_count || 0));

            return (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '15px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #059669' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '900', width: '35px', color: index === 0 ? '#fbbf24' : '#cbd5e1', textAlign: 'center' }}>{index + 1}.</div>
                  <div style={{ flex: 1, marginLeft: '10px' }}>
                    <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>{club?.club_name || t('archiveUnknownClub')}</div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{club?.members_counted || 0}{t('archiveBasedOnPoints')}</div>
                  </div>
                 {/* JAVÍTVA: Az archívumban is dinamikusan váltja az egységet a dátumhatár alapján */}
<div style={{ color: '#10b981', fontWeight: '900', fontSize: '1.3rem' }}>
  {club?.total_score || 0} {selectedTopic?.end_date && new Date(selectedTopic.end_date.replace(' ', 'T')).getTime() < new Date('2026-06-16T00:00:00').getTime() ? '⭐' : 'FP'}
</div>

                </div>

                <details style={{ marginTop: '10px', borderTop: '1px dashed #334155', paddingTop: '8px' }}>
                  <summary style={{ fontSize: '0.8rem', color: '#38bdf8', cursor: 'pointer', outline: 'none', userSelect: 'none' }}>
                    {t('archiveMemberIndividualScore').replace('{count}', String(clubMembers.length))}
                  </summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', paddingLeft: '10px' }}>
                    {clubMembers.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>{t('archiveNoMemberPoints')}</span>
                    ) : (
                      clubMembers.map((m, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1' }}>
                          <span>👤 {m.user_name}</span>
                          <span style={{ fontWeight: 'bold', color: '#fbbf24' }}>{m.likes_count || 0} ⭐</span>
                        </div>
                      ))
                    )}
                  </div>
                </details>
              </div>
            );
          })}
        </div>

        {/* EGYÉNI VÉGEREDMÉNY (RANGSOR) */}
        <div style={{ background: '#1e293b', borderRadius: '24px', padding: '25px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#3b82f6', fontSize: '1.4rem', fontWeight: 'bold' }}>{t('archiveIndividualRanking')}</h3>
          
          {!selectedPastTopicId && <div style={{ color: '#94a3b8', textAlign: 'center', padding: '10px' }}>{t('archiveSelectMatch')}</div>}
          
          {pastLeaderboard && [...pastLeaderboard].sort((a, b) => {
  // 🛡️ Ha van új fair_score, az dönt, ha nincs (régi kör), akkor a sima csillagok
  const scoreA = a.fair_score !== undefined ? Number(a.fair_score) : Number(a?.likes_count || 0);
  const scoreB = b.fair_score !== undefined ? Number(b.fair_score) : Number(b?.likes_count || 0);
  
  if (scoreB !== scoreA) return scoreB - scoreA;
  return (Number(a?.views_count || 0)) - (Number(b?.views_count || 0));
}).map((entry, index) => (
  // ... a többi komponens-renderelés változatlan marad
            <div key={entry?.id || index} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '12px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: '900', width: '35px', color: index === 0 ? '#fbbf24' : index === 1 ? '#e2e8f0' : index === 2 ? '#cd7f32' : '#64748b', textAlign: 'center' }}>{index + 1}.</div>
              
              <div style={{ position: 'relative', cursor: 'zoom-in' }} onClick={() => setActiveArchiveEntry(entry)}>
                <img 
                  src={getImageUrl(entry?.drive_file_id, entry?.file_url)} 
                  alt="Submission" 
                  style={{ width: '55px', height: '55px', borderRadius: '8px', margin: '0 15px', objectFit: 'cover' }} 
                  onError={handleImageError} 
                />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ color: 'white', fontWeight: 'bold' }}>{entry?.user_name || t('archivePhotographer')}</div>
                {entry?.club_name && <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold' }}>🛡️ {entry.club_name}</div>}
                
                <div style={{ fontSize: '0.75rem', color: entry?.has_user_liked ? '#f87171' : '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: entry?.has_user_liked ? 'bold' : 'normal' }}>
                  <span>{entry?.has_user_liked ? '❤️' : '🤍'}</span> 
                  <span>{entry?.archive_likes || 0}{t('archivePostPraises')}</span>
                </div>
              </div>
              
              {/* JAVÍTVA: Ha van új fair_score, azt írjuk ki fő pontként, a csillagok pedig alá mennek részletként */}
<div style={{ textAlign: 'right', minWidth: '80px' }}>
  <div style={{ color: '#fbbf24', fontWeight: '900', fontSize: '1.2rem' }}>
    {entry?.fair_score !== undefined ? `${entry.fair_score} FP` : `${entry?.likes_count || 0} ⭐`}
  </div>
  {entry?.fair_score !== undefined && (
    <small style={{ color: '#64748b', fontSize: '0.72rem', display: 'block', marginTop: '2px' }}>
      {entry?.likes_count || 0} ⭐ | {entry?.views_count || 0} 👁️
    </small>
  )}
</div>
            </div>
          ))}
        </div>

      </div>

      {/* 💬 INTERAKTÍV KIBESZÉLŐ MODÁL */}
      {currentModalEntry && (
        <ArchiveDetailModal
          entry={currentModalEntry}
          userEmail={user?.email || user?.userEmail || ''} 
          userName={user?.name || user?.userName || t('archiveNomadWarrior')} 
          onClose={() => setActiveArchiveEntry(null)}
          onLikeUpdate={() => {
            if (selectedPastTopicId) {
              loadPastHistoryList(selectedPastTopicId);
            }
          }}
        />
      )}

      {/* 👑 REJTETT 3D PÓDIUM-GENERÁLÓ EGYSÉG (Láthatatlan, 1200x1200px-es HD Facebook sablon) */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', overflow: 'hidden', width: 0, height: 0 }}>
        {adminPosterData && (
          <div 
            id="admin-past-poster-node" 
            style={{ width: '1200px', height: '1200px', background: 'linear-gradient(135deg, #090d16 0%, #111827 100%)', padding: '60px', boxSizing: 'border-box', border: '16px solid #fbbf24', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Inter, sans-serif', position: 'relative' }}
          >
            <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '400px', height: '400px', background: '#fbbf24', filter: 'blur(180px)', opacity: 0.1, borderRadius: '50%' }}></div>
            <div style={{ position: 'absolute', bottom: '-100px', right: '-100px', width: '400px', height: '400px', background: '#38bdf8', filter: 'blur(180px)', opacity: 0.1, borderRadius: '50%' }}></div>

            <div style={{ textAlign: 'center', width: '100%' }}>
              <div style={{ color: '#fbbf24', fontSize: '26px', fontWeight: '900', letterSpacing: '6px', textTransform: 'uppercase', marginBottom: '15px' }}>
                ✨ {lang === 'en' ? 'PhotAwesome.com Challenge RESULTS' : 'PhotAwesome.com Kihívás EREDMÉNYEK'} ✨
              </div>
              <h1 style={{ color: '#ffffff', fontSize: '64px', margin: '0 0 10px 0', fontWeight: '900', letterSpacing: '-1px', lineHeight: '1.2' }}>
                {adminPosterData.topic.title}
              </h1>
              <div style={{ background: '#fbbf2415', color: '#fbbf24', border: '1px solid #fbbf2440', padding: '8px 30px', borderRadius: '50px', fontSize: '20px', fontWeight: 'bold', display: 'inline-block', letterSpacing: '1px' }}>
                {lang === 'en' ? 'THE WINNERS!' : 'A GYŐZTESEK! 🏆'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '35px', width: '100%', padding: '0 20px', boxSizing: 'border-box' }}>
              {adminPosterData.entries[1] && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '290px' }}>
                  <div style={{ width: '240px', height: '240px', borderRadius: '16px', overflow: 'hidden', border: '6px solid #cbd5e1', boxShadow: '0 20px 45px rgba(0,0,0,0.6)', backgroundColor: '#000', marginBottom: '15px' }}>
                    <img src={adminPosterData.entries[1].base64Url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ background: 'linear-gradient(180deg, #334155 0%, #1e293b 100%)', width: '100%', height: '200px', borderRadius: '16px 16px 0 0', border: '1px solid #475569', borderBottom: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '15px', boxSizing: 'border-box', textAlign: 'center' }}>
                    <div style={{ color: '#cbd5e1', fontSize: '24px', fontWeight: 'bold', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adminPosterData.entries[1].user_name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>{adminPosterData.entries[1].likes_count} ⭐</div>
                    <div style={{ color: '#cbd5e1', fontSize: '32px', fontWeight: '900', marginTop: '20px', letterSpacing: '1px' }}>🥈 2. {lang === 'en' ? 'PLACE' : 'HELY'}</div>
                  </div>
                </div>
              )}

              {adminPosterData.entries[0] && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '330px', zIndex: 10 }}>
                  <div style={{ fontSize: '70px', marginBottom: '-10px', filter: 'drop-shadow(0 4px 10px rgba(251,191,36,0.5))' }}>👑</div>
                  <div style={{ width: '290px', height: '290px', borderRadius: '24px', overflow: 'hidden', border: '8px solid #fbbf24', boxShadow: '0 25px 60px rgba(251,191,36,0.3)', backgroundColor: '#000', marginBottom: '15px' }}>
                    <img src={adminPosterData.entries[0].base64Url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ background: 'linear-gradient(180deg, #fbbf24 0%, #b45309 100%)', width: '100%', height: '270px', borderRadius: '20px 24px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '15px', boxSizing: 'border-box', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                    <div style={{ color: '#0f172a', fontSize: '28px', fontWeight: '900', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adminPosterData.entries[0].user_name}</div>
                    <div style={{ color: '#0f172a', fontSize: '26px', fontWeight: '900', marginTop: '4px', opacity: 0.9 }}>{adminPosterData.entries[0].likes_count} ⭐</div>
                    <div style={{ color: '#ffffff', fontSize: '38px', fontWeight: '900', marginTop: '25px', letterSpacing: '1px', textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>🥇 1. {lang === 'en' ? 'PLACE' : 'HELY'}</div>
                  </div>
                </div>
              )}

              {adminPosterData.entries[2] && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '290px' }}>
                  <div style={{ width: '220px', height: '220px', borderRadius: '16px', overflow: 'hidden', border: '6px solid #b45309', boxShadow: '0 20px 45px rgba(0,0,0,0.6)', backgroundColor: '#000', marginBottom: '15px' }}>
                    <img src={adminPosterData.entries[2].base64Url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ background: 'linear-gradient(180deg, #7c2d12 0%, #431407 100%)', width: '100%', height: '150px', borderRadius: '16px 16px 0 0', border: '1px solid #7c2d12', borderBottom: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '15px', boxSizing: 'border-box', textAlign: 'center' }}>
                    <div style={{ color: '#ffedd5', fontSize: '22px', fontWeight: 'bold', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adminPosterData.entries[2].user_name}</div>
                    <div style={{ color: '#fdba74', fontSize: '20px', fontWeight: '900', marginTop: '4px' }}>{adminPosterData.entries[2].likes_count} ⭐</div>
                    <div style={{ color: '#fdba74', fontSize: '28px', fontWeight: '900', marginTop: '15px', letterSpacing: '1px' }}>🥉 3. {lang === 'en' ? 'PLACE' : 'HELY'}</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '18px', fontWeight: 'bold' }}>
              <div>{lang === 'en' ? 'Join the Arena Battle:' : 'Csatlakozz a kihívásokhoz:'} <span style={{ color: '#38bdf8' }}>photawesome.com</span></div>
              <div style={{ color: '#fbbf24', letterSpacing: '1px' }}>✨ PhotAwesome Arena ✨</div>
            </div>
          </div>
        )}
      </div>

      {/* ── 🎯 ⚡ ÚJ: TISZTA, LAPOS (UNNESTED) SZELEKTOROK AZ ATOMBIZTOS MEGJELENÍTÉSHEZ ── */}
      <style>{`
        @media (min-width: 1024px) {
          /* 1. Kiterjesztjük a modál tartalom hordozóját szélesebbre */
          div[style*="position: fixed"] div[style*="max-width: 1200px"],
          div[style*="position:fixed"] div[style*="maxWidth: '1200px'"] {
            max-width: 90vw !important;
            width: 90vw !important;
          }
          
          /* 2. Fixen beállítjuk a pult felosztását: a kép megkapja a nagy teret, a chat pedig kényelmesen 400px lesz */
          div[style*="position: fixed"] div[style*="grid-template-columns"],
          div[style*="position: fixed"] div[style*="gridTemplateColumns"],
          div[style*="position: fixed"] div[style*="display: flex"] {
            display: grid !important;
            grid-template-columns: 1fr 400px !important;
            width: 100% !important;
          }

          /* 3. Kényszerítjük a fekete színház dobozt, hogy függőlegesen nyúljon el kényelmesen */
          div[style*="position: fixed"] div[style*="background-color: #000"],
          div[style*="position: fixed"] div[style*="background-color: rgb(0, 0, 0)"],
          div[style*="position: fixed"] div[style*="backgroundColor: '#000'"] {
            height: 75vh !important;
            max-height: 75vh !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          /* 4. A fotó most már 100%-ban kitölti a hordozóját a torzulásmentes contain megtartásával */
          div[style*="position: fixed"] img[style*="max-height"] {
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 75vh !important;
            object-fit: contain !important;
            margin: 0 auto !important;
          }
        }

        @media (max-width: 420px) {
          .past-archive-podium-container {
            flex-direction: column !important;
            align-items: center !important;
            gap: 20px !important;
          }
          .past-archive-podium-container > div {
            width: 100% !important;
            max-width: 200px;
          }
          .past-archive-podium-container div[style*="height"] {
            height: 75px !important;
          }
        }
      `}</style>

    </div>
  );
}
