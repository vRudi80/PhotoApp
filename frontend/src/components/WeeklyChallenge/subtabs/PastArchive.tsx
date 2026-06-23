import React, { useState, useEffect, useMemo } from 'react';
import { getImageUrl } from '../../../utils/helpers';
import { toPng } from 'html-to-image'; 
import { BACKEND_URL, ADMIN_EMAIL } from '../../../utils/constants';

// Nyelvi kontextus betöltése
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

  const { t, lang } = useLanguage();
  
  const [subTab, setSubTab] = useState<'winners' | 'details' | 'prizes' | 'rank'>('winners');
  const [activeRankSubTab, setActiveRankSubTab] = useState<'photographer' | 'photo' | 'guru'>('photographer');

  const [adminPosterData, setAdminPosterData] = useState<{ topic: any; entries: any[] } | null>(null);
  const [isAdminGeneratingPoster, setIsAdminGeneratingPoster] = useState(false);

  const handleSelectTopic = (topicId: number) => {
    loadPastHistoryList(topicId);
    setSubTab('winners');
    setActiveRankSubTab('photographer');
  };

  const currentTopicObj = useMemo(() => {
    return pastTopics.find(x => x.id === selectedPastTopicId) || null;
  }, [selectedPastTopicId, pastTopics]);

  const topThreeWinners = useMemo(() => {
    if (!pastLeaderboard || pastLeaderboard.length === 0) return [];
    return [...pastLeaderboard].sort((a, b) => {
      const scoreA = a.fair_score !== undefined ? Number(a.fair_score) : Number(a?.likes_count || 0);
      const scoreB = b.fair_score !== undefined ? Number(b.fair_score) : Number(b?.likes_count || 0);
      
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (Number(a?.views_count || 0)) - (Number(b?.views_count || 0));
    }).slice(0, 3);
  }, [pastLeaderboard]);

  const photographersPackList = useMemo(() => {
    if (!pastLeaderboard || pastLeaderboard.length === 0) return [];
    
    const groups: Record<string, any> = {};
    pastLeaderboard.forEach(entry => {
      const email = entry.user_email || 'unknown';
      if (!groups[email]) {
        groups[email] = {
          user_name: entry.user_name || 'Alkotó',
          user_email: email,
          club_name: entry.club_name,
          user_rank: entry.rank_level || 'GURU III',
          total_votes: 0,
          photos: []
        }; 
      }
      const votes = entry.archive_likes || entry.likes_count || 0;
      groups[email].total_votes += Number(votes);
      groups[email].photos.push({
        id: entry.id,
        title: entry.title,
        url: getImageUrl(entry.drive_file_id, entry.file_url),
        votes: votes
      });
    });

    return Object.values(groups).sort((a: any, b: any) => b.total_votes - a.total_votes);
  }, [pastLeaderboard]);

  const singlePhotosRankedList = useMemo(() => {
    if (!pastLeaderboard || pastLeaderboard.length === 0) return [];
    return [...pastLeaderboard].sort((a, b) => {
      const votesA = a.archive_likes || a.likes_count || 0;
      const votesB = b.archive_likes || b.likes_count || 0;
      return votesB - votesA;
    });
  }, [pastLeaderboard]);

  const guruTopPicksList = useMemo(() => {
    return singlePhotosRankedList.filter((_, idx) => idx % 3 === 0).slice(0, 4); 
  }, [singlePhotosRankedList]);

  useEffect(() => {
    if (!adminPosterData) return;
    const executeDownload = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      const node = document.getElementById('admin-past-poster-node');
      if (node) {
        try {
          const dataUrl = await toPng(node, { cacheBust: true, quality: 1.0 });
          const link = document.createElement('a');
          link.download = `Arena_Facebook_Winners_${adminPosterData.topic.title.replace(/\s+/g, '_')}.png`;
          link.href = dataUrl;
          link.click();
        } catch (e) {
          alert('Hiba a plakátkép letöltése közben.');
        } finally {
          setAdminPosterData(null);
          setIsAdminGeneratingPoster(false);
        }
      }
    };
    executeDownload();
  }, [adminPosterData]);

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      {!selectedPastTopicId ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '25px' }}>
          {pastTopics.map(topicRow => {
            const isDaily = getTopicType(topicRow.start_date, topicRow.end_date) === 'daily';
            const endedDate = new Date(topicRow.end_date).toLocaleDateString(lang === 'en' ? 'en-US' : 'hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' });
            
            return (
              <div 
                key={topicRow.id}
                onClick={() => handleSelectTopic(topicRow.id)}
                style={{ background: '#1e293b', borderRadius: '16px', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 15px 35px rgba(0,0,0,0.4)', cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', transition: 'all 0.25s ease' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#38bdf8'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#334155'; }}
              >
                <div style={{ position: 'absolute', top: '12px', right: '-35px', background: isDaily ? 'linear-gradient(135deg, #ec4899, #f43f5e)' : 'linear-gradient(135deg, #a78bfa, #8b5cf6)', color: 'white', padding: '4px 40px', fontSize: '0.7rem', fontWeight: 'bold', transform: 'rotate(45deg)', zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.3)', letterSpacing: '0.5px' }}>
                  {isDaily ? 'BLITZ' : 'MASTER'}
                </div>

                <div style={{ padding: '12px 20px', background: '#0f172a80', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    "{lang === 'en' && topicRow.title_en ? topicRow.title_en : topicRow.title}"
                  </h4>
                </div>

                <div style={{ height: '170px', backgroundColor: '#090d16', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={topicRow.cover_url || 'https://via.placeholder.com/400x200/0f172a/cbd5e1?text=PhotAwesome'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleImageError} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: '#000000e0', borderTop: '1px solid #223147', textAlign: 'center', fontSize: '0.75rem', padding: '10px 4px', color: '#94a3b8' }}>
                  <div style={{ borderRight: '1px solid #1e293b' }}>
                    <b style={{ color: 'white', display: 'block' }}>{topicRow.entries_count || topicRow.totalEntries || 0} db</b> 
                    {lang === 'en' ? 'Photographers' : 'Fotós'}
                  </div>
                  <div style={{ borderRight: '1px solid #1e293b' }}>
                    <b style={{ color: 'white', display: 'block' }}>{endedDate}</b> 
                    {lang === 'en' ? 'Ended' : 'Lezárult'}
                  </div>
                  <div>
                    <b style={{ color: '#38bdf8', display: 'block' }}>{topicRow.total_votes || topicRow.total_votes_count || 0} db</b> 
                    {lang === 'en' ? 'Votes' : 'Szavazat'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <button onClick={() => setSelectedPastTopicId(null)} style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
              ← Vissza az archívumhoz
            </button>
            <h2 style={{ margin: 0, color: 'white', fontSize: '1.6rem', fontWeight: '900' }}>
              {lang === 'en' && currentTopicObj?.title_en ? currentTopicObj.title_en : currentTopicObj?.title}
            </h2>
          </div>

          <div style={{ display: 'flex', background: '#0f172a', padding: '6px', borderRadius: '14px', width: 'fit-content', gap: '6px', border: '1px solid #223147' }}>
            {[
              { id: 'winners', label: 'WINNERS' },
              { id: 'details', label: 'DETAILS' },
              { id: 'prizes', label: 'PRIZES' },
              { id: 'rank', label: 'RANK' }
            ].map(btn => (
              <button key={btn.id} onClick={() => setSubTab(btn.id as any)} style={{ padding: '8px 22px', border: 'none', background: subTab === btn.id ? '#ffffff' : 'transparent', color: subTab === btn.id ? '#0f172a' : '#cbd5e1', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                {btn.label}
              </button>
            ))}
          </div>

          <div style={{ background: '#1e293b', borderRadius: '24px', padding: '30px', border: '1px solid #334155', boxShadow: '0 15px 40px rgba(0,0,0,0.3)' }}>
            {subTab === 'winners' && ( 
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ border: '1px solid #475569', background: '#0f172a', borderRadius: '16px', padding: '25px', width: '100%', maxWidth: '650px', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '15px' }}>
                    <span>🛡️</span> <span>TOP PHOTOGRAPHER WINNER</span>
                  </div>
                  
                  {topThreeWinners[0] ? (
                    <div style={{ width: '100%' }}>
                      <div style={{ width: '100%', height: '320px', background: '#000', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                        <img src={getImageUrl(topThreeWinners[0].drive_file_id, topThreeWinners[0].file_url)} alt="Winner" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f172a', padding: '12px 20px', borderRadius: '12px', borderLeft: '4px solid #fbbf24' }}>
                        <div style={{ textAlign: 'left' }}>
                          <strong style={{ color: 'white', display: 'block', fontSize: '1.1rem' }}>{topThreeWinners[0].user_name}</strong>
                          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Germany | GURU VII</span>
                        </div>
                        <div style={{ color: '#fbbf24', fontWeight: '900', fontSize: '1.3rem' }}>
                          {topThreeWinners[0].fair_score !== undefined ? `${topThreeWinners[0].fair_score} FP` : `${topThreeWinners[0].likes_count} ⭐`}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: '#64748b' }}>Nincs kiértékelhető győztes adat.</p>
                  )}
                </div>
              </div>
            )}

            {subTab === 'details' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '30px', alignItems: 'start', padding: '10px 0' }}>
                <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: '1px solid #334155' }}>
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" alt="Master" style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #334155', marginBottom: '12px' }} />
                  <strong style={{ color: 'white', fontSize: '1.1rem' }}>GURU</strong>
                  <span style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '2px' }}>{currentTopicObj?.master_name || 'Menim Menim'}</span>
                </div>
                <div style={{ borderLeft: '1px solid #334155', paddingLeft: '25px' }}>
                  <h3 style={{ color: 'white', fontSize: '1.8rem', margin: '0 0 12px 0', fontWeight: '900' }}>
                    {lang === 'en' && currentTopicObj?.title_en ? currentTopicObj.title_en : (currentTopicObj?.title || 'Let\'s Have Fun!')} <span style={{ color: '#64748b', fontWeight: 'normal', fontSize: '1.3rem' }}>Challenge</span>
                  </h3>
                  <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '25px', whiteSpace: 'pre-wrap' }}>
                    {lang === 'en' && currentTopicObj?.description_en ? currentTopicObj.description_en : (currentTopicObj?.description || 'Share your best photos of activities you find fun to do...')}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', borderTop: '1px solid #334155', paddingTop: '20px', marginTop: '20px', textAlign: 'center' }}>
                    <div><span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '4px' }}>📥</span> <strong style={{ color: 'white', display: 'block', fontSize: '1.1rem' }}>{pastLeaderboard.length}</strong> <small style={{ color: '#64748b', fontSize: '0.75rem' }}>BEKÜLDÖTT</small></div>
                    <div><span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '4px' }}>⏳</span> <strong style={{ color: 'white', display: 'block', fontSize: '1.1rem' }}>{currentTopicObj?.end_date ? new Date(currentTopicObj.end_date).toLocaleDateString('hu-HU') : 'Lezárult'}</strong> <small style={{ color: '#64748b', fontSize: '0.75rem' }}>VÉGZŐDÖTT</small></div>
                    <div><span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '4px' }}>💰</span> <strong style={{ color: '#fbbf24', display: 'block', fontSize: '1.1rem' }}>${currentTopicObj?.prize_pool || '600'}</strong> <small style={{ color: '#64748b', fontSize: '0.75rem' }}>NYEREMÉNY</small></div>
                  </div>
                </div>
              </div>
            )}

            {subTab === 'prizes' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🎁</div>
                <h4 style={{ color: '#fbbf24', fontSize: '1.4rem', margin: '0 0 10px 0' }}>Kiosztott Jutalom Alap</h4>
                <p style={{ color: '#cbd5e1', maxWidth: '450px', margin: '0 auto', lineHeight: '1.5', fontSize: '0.95rem' }}>
                  A verseny lezárásával a játékosok megkapták a helyezéseik alapján járó Arena érmeket és Fair Play pontokat (FP).
                </p>
              </div>
            )}

            {subTab === 'rank' && (
              <div>
                <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #334155', paddingBottom: '10px', marginBottom: '25px', fontSize: '0.85rem' }}>
                  {[
                    { id: 'photographer', label: 'TOP PHOTOGRAPHER' },
                    { id: 'photo', label: 'TOP PHOTO' },
                    { id: 'guru', label: "GURU'S TOP PICK" }
                  ].map(sTab => (
                    <span key={sTab.id} onClick={() => setActiveRankSubTab(sTab.id as any)} style={{ color: activeRankSubTab === sTab.id ? '#38bdf8' : '#64748b', fontWeight: 'bold', cursor: 'pointer', borderBottom: activeRankSubTab === sTab.id ? '2px solid #38bdf8' : 'none', paddingBottom: '11px', marginBottom: '-11px', transition: 'all 0.2s' }}>
                      {sTab.label}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {activeRankSubTab === 'photographer' ? (
                    photographersPackList.map((photoGroup, idx) => (
                      <div key={idx} style={{ background: '#0f172a', padding: '20px', borderRadius: '18px', border: '1px solid #223147' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '28px', height: '28px', background: '#1e293b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#cbd5e1', fontSize: '0.85rem' }}>{idx + 1}</div>
                            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80" alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                            <div>
                              <strong style={{ color: 'white', display: 'block', fontSize: '0.95rem' }}>{photoGroup.user_name}</strong>
                              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{photoGroup.user_rank}</span>
                            </div>
                          </div>
                          <div style={{ background: '#111827', color: '#38bdf8', padding: '6px 16px', borderRadius: '8px', fontWeight: '900', fontSize: '0.9rem', border: '1px solid #1f2937' }}>
                            {photoGroup.total_votes} VOTES
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '5px' }}>
                          {photoGroup.photos.map((imgItem: any) => (
                            <div key={imgItem.id} style={{ position: 'relative', width: '110px', height: '110px', borderRadius: '8px', overflow: 'hidden', background: '#000', flexShrink: 0, border: '1px solid #223147' }}>
                              <img src={imgItem.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.65)', color: 'white', textAlign: 'center', fontSize: '0.7rem', padding: '3px 0', fontWeight: 'bold' }}>
                                {imgItem.votes} VOTES
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : activeRankSubTab === 'photo' ? (
                    singlePhotosRankedList.map((entry, idx) => (
                      <div key={entry.id} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '12px 20px', borderRadius: '14px', border: '1px solid #223147' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', width: '30px', color: '#64748b' }}>#{idx + 1}</div>
                        <img src={getImageUrl(entry.drive_file_id, entry.file_url)} alt="" style={{ width: '50px', height: '55px', objectFit: 'cover', borderRadius: '6px', margin: '0 15px' }} />
                        <div style={{ flex: 1 }}>
                          <strong style={{ color: 'white', display: 'block' }}>{entry.title || 'Nincs cím'}</strong>
                          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{entry.user_name}</span>
                        </div>
                        <div style={{ color: '#f97316', fontWeight: '900', fontSize: '1.1rem' }}>{entry.archive_likes || entry.likes_count || 0} ⭐</div>
                      </div>
                    ))
                  ) : (
                    guruTopPicksList.map((entry, idx) => (
                      <div key={entry.id} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '12px 20px', borderRadius: '14px', border: '1px solid #a78bfa30' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', width: '30px', color: '#a78bfa' }}>✨</div>
                        <img src={getImageUrl(entry.drive_file_id, entry.file_url)} alt="" style={{ width: '50px', height: '55px', objectFit: 'cover', borderRadius: '6px', margin: '0 15px' }} />
                        <div style={{ flex: 1 }}>
                          <strong style={{ color: 'white', display: 'block' }}>{entry.title || 'Nincs cím'}</strong>
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Kiemelte a Képmester</span>
                        </div>
                        <div style={{ color: '#a78bfa', fontWeight: '900', fontSize: '1.1rem' }}>PICKED</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 👑 REJTETT PLAKÁT-GENERÁLÓ SABLON */}
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
                ✨ {lang === 'en' ? 'Challenge RESULTS' : 'Kihívás EREDMÉNYEK'} ✨
              </div>
              <h1 style={{ color: '#ffffff', fontSize: '64px', margin: '0 0 10px 0', fontWeight: '900', letterSpacing: '-1px', lineHeight: '1.2' }}>
                {adminPosterData.topic.title}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '35px', width: '100%', padding: '0 20px', boxSizing: 'border-box' }}>
              {adminPosterData.entries[1] && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '290px' }}>
                  <div style={{ width: '240px', height: '240px', borderRadius: '16px', overflow: 'hidden', border: '6px solid #cbd5e1', boxShadow: '0 20px 45px rgba(0,0,0,0.6)', backgroundColor: '#000', marginBottom: '15px' }}>
                    <img src={adminPosterData.entries[1].file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, #7c2d12 0%, #431407 100%)', width: '100%', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                    <strong style={{ color: 'white', display: 'block' }}>{adminPosterData.entries[1].user_name}</strong>
                    <div style={{ color: '#cbd5e1', fontSize: '22px', fontWeight: '900', marginTop: '10px' }}>🥈 2. HELY</div>
                  </div>
                </div>
              )}

              {adminPosterData.entries[0] && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '330px', zIndex: 10 }}>
                  <div style={{ fontSize: '70px', marginBottom: '-10px' }}>👑</div>
                  <div style={{ width: '290px', height: '290px', borderRadius: '24px', overflow: 'hidden', border: '8px solid #fbbf24', boxShadow: '0 25px 60px rgba(251,191,36,0.3)', backgroundColor: '#000', marginBottom: '15px' }}>
                    <img src={adminPosterData.entries[0].file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ background: 'linear-gradient(180deg, #fbbf24 0%, #b45309 100%)', width: '100%', padding: '20px', borderRadius: '20px', textAlign: 'center' }}>
                    <strong style={{ color: '#0f172a', fontSize: '24px', fontWeight: '900' }}>{adminPosterData.entries[0].user_name}</strong>
                    <div style={{ color: '#ffffff', fontSize: '28px', fontWeight: '900', marginTop: '12px' }}>🥇 1. HELY</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
