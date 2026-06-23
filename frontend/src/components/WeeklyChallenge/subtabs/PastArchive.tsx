import React, { useState, useEffect, useMemo } from 'react';
import { getImageUrl } from '../../../utils/helpers';
import { toPng } from 'html-to-image'; 
import { BACKEND_URL, ADMIN_EMAIL } from '../../../utils/constants';

// Nyelvi kontextus betöltése
import { useLanguage } from '../../../context/LanguageContext';

interface PastArchiveProps {
  pastTopics: any[];
  selectedPastTopicId: number | null;
  setSelectedPastTopicId: (id: number | null) => void;
  loadPastHistoryList: (id: number) => void;
  pastClubLeaderboard: any[];
  pastLeaderboard: any[];
  getTopicType: (start: string, end: string) => 'daily' | 'weekly';
  handleImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  setFullscreenData: (data: any) => void;
  user: any; 
}

const localPlaceholderSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' fill='%230f172a'><rect width='100%' height='100%'/><text x='50%' y='50%' fill='%23334155' font-family='sans-serif' font-size='14' text-anchor='middle'>Kép nem elérhető</text></svg>";

const computeArchiveRank = (rankStr: string, score: number) => {
  const normalized = rankStr ? rankStr.toUpperCase().trim() : '';
  
  if (!normalized || normalized === 'FOTÓS' || normalized === 'MEMBER' || normalized === 'TAG') {
    const s = Number(score) || 0;
    if (s >= 22) return 'Komponista 📐';
    if (s >= 20) return 'Képvadász 📷';
    if (s >= 15) return 'Megfigyelő 👁️';
    return 'Fényleső 🌱';
  }
  
  if (normalized.includes('GURU III') || normalized.includes('KOMPONISTA')) return 'Komponista 📐';
  if (normalized.includes('GURU II') || normalized.includes('KÉPVADÁSZ')) return 'Képvadász 📷';
  if (normalized.includes('GURU I') || normalized.includes('MEGFIGYELŐ')) return 'Megfigyelő 👁️';
  if (normalized === 'GURU' || normalized.includes('FÉNYLESŐ')) return 'Fényleső 🌱';
  if (normalized.includes('GURU IV') || normalized.includes('FÉNYÍRÓ')) return 'Fényíró 🎞️';
  if (normalized.includes('GURU V') || normalized.includes('ESZTÉTA')) return 'Esztéta 💎';
  if (normalized.includes('GURU VI') || normalized.includes('SZAKÉRTŐ')) return 'Szakértő 🎯';
  if (normalized.includes('GURU VII') || normalized.includes('KÉPMESTER')) return 'Képmester 🎨';
  if (normalized.includes('GURU VIII') || normalized.includes('NAGYMESTER')) return 'Nagymester 🌟';
  
  return rankStr;
};

export default function PastArchive({
  pastTopics, selectedPastTopicId, setSelectedPastTopicId, loadPastHistoryList,
  pastClubLeaderboard, pastLeaderboard, getTopicType,
  handleImageError, setFullscreenData, user
}: PastArchiveProps) {

  const { t, lang } = useLanguage();
  
  const [subTab, setSubTab] = useState<'winners' | 'details' | 'prizes' | 'rank'>('winners');
  const [activeRankSubTab, setActiveRankSubTab] = useState<'photo' | 'guru'>('photo');

  // 👑 Képgeneráló állapotok visszahozva az admin pódium-plakáthoz
  const [adminPosterData, setAdminPosterData] = useState<{ topic: any; entries: any[] } | null>(null);
  const [isAdminGeneratingPoster, setIsAdminGeneratingPoster] = useState(false);

  const silhouetteAvatar = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23475569'><circle cx='12' cy='8' r='4'/><path d='M12 14c-6.1 0-10 4-10 4v2h20v-2s-3.9-4-10-4z'/></svg>";

  const handleLocalImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.onerror = null; 
    e.currentTarget.src = localPlaceholderSvg;
  };

  const handleSelectTopic = (topicId: number) => {
    loadPastHistoryList(topicId);
    setSubTab('winners');
    setActiveRankSubTab('photo');
  };

  const currentTopicObj = useMemo(() => {
    if (!pastTopics || !Array.isArray(pastTopics)) return null;
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

  const winnerLevelName = useMemo(() => {
    if (!topThreeWinners[0]) return '';
    const score = topThreeWinners[0].fair_score !== undefined 
      ? topThreeWinners[0].fair_score 
      : (topThreeWinners[0].archive_likes || topThreeWinners[0].likes_count || 0);
    return computeArchiveRank(topThreeWinners[0].rank_level || topThreeWinners[0].club_role, Number(score));
  }, [topThreeWinners]);

  const singlePhotosRankedList = useMemo(() => {
    if (!pastLeaderboard || pastLeaderboard.length === 0) return [];
    return [...pastLeaderboard].sort((a, b) => {
      const votesA = a.fair_score !== undefined ? a.fair_score : (a.archive_likes || a.likes_count || 0);
      const votesB = b.fair_score !== undefined ? b.fair_score : (b.archive_likes || b.likes_count || 0);
      return votesB - votesA;
    });
  }, [pastLeaderboard]);

  const guruTopPicksList = useMemo(() => {
    return singlePhotosRankedList.filter((_, idx) => idx % 3 === 0).slice(0, 4); 
  }, [singlePhotosRankedList]);

  // 👑 ADMIN LOGIKA: Top 3 helyezett konverziója Base64-re a tiszta renderelésért (Nincs CORS hiba)
  const handleGenerateAdminPoster = async (matchedTopic: any) => {
    if (!matchedTopic || pastLeaderboard.length === 0) return;
    setIsAdminGeneratingPoster(true);

    try {
      const sortedWinners = [...pastLeaderboard].sort((a, b) => {
        const scoreA = a.fair_score !== undefined ? Number(a.fair_score) : Number(a?.likes_count || 0);
        const scoreB = b.fair_score !== undefined ? Number(b.fair_score) : Number(b?.likes_count || 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (Number(a?.views_count || 0)) - (Number(b?.views_count || 0));
      }).slice(0, 3);

      const processedEntries = [];
      for (let i = 0; i < sortedWinners.length; i++) {
        const entry = sortedWinners[i];
        let base64Url = localPlaceholderSvg;
        
        try {
          const proxyUrl = entry.drive_file_id 
            ? `${BACKEND_URL}/api/image-base64/${entry.drive_file_id}`
            : `${BACKEND_URL}/api/admin/base64-proxy?url=${encodeURIComponent(entry.file_url)}`;
            
          const proxyRes = await fetch(proxyUrl);
          if (proxyRes.ok) {
            const proxyData = await proxyRes.json();
            if (proxyData.base64) base64Url = proxyData.base64;
          } else {
            base64Url = getImageUrl(entry.drive_file_id, entry.file_url);
          }
        } catch (e) { 
          base64Url = getImageUrl(entry.drive_file_id, entry.file_url);
        }
        
        processedEntries.push({ ...entry, base64Url, rank: i + 1 });
      }

      setAdminPosterData({ topic: matchedTopic, entries: processedEntries });
    } catch (err) {
      alert("Hiba történt a pódium adatok feldolgozásakor.");
      console.error(err);
      setIsAdminGeneratingPoster(false);
    }
  };

  // 👑 ADMIN EFFECT: Kép letöltésének kikényszerítése ha összeállt az adminPosterData
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
          link.download = `Arena_Winners_Poster_${adminPosterData.topic.title.replace(/\s+/g, '_')}.png`;
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
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      
      {/* ── 🎯 ARCHÍVUM KÁRTYA RÁCS ── */}
      {!selectedPastTopicId ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '25px' }}>
          {Array.isArray(pastTopics) && pastTopics.map(topicRow => {
            const isDaily = getTopicType(topicRow.start_date, topicRow.end_date) === 'daily';
            const endedDate = new Date(topicRow.end_date).toLocaleDateString(lang === 'en' ? 'en-US' : 'hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' });
            
            const realEntriesCount = topicRow.entries_count ?? topicRow.totalEntries ?? topicRow.entry_count ?? 0;
            const realVotesCount = topicRow.total_votes ?? topicRow.vote_count ?? topicRow.total_votes_count ?? 0;

            return (
              <div 
                key={topicRow.id}
                onClick={() => handleSelectTopic(topicRow.id)}
                style={{ background: '#1e293b', borderRadius: '16px', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 15px 35px rgba(0,0,0,0.4)', cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', transition: 'all 0.25s ease' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#38bdf8'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#334155'; }}
              >
                <div style={{ position: 'absolute', top: '12px', right: '-35px', background: isDaily ? 'linear-gradient(135deg, #ec4899, #f43f5e)' : 'linear-gradient(135deg, #a78bfa, #8b5cf6)', color: 'white', padding: '4px 40px', fontSize: '0.7rem', fontWeight: 'bold', transform: 'rotate(45deg)', zIndex: 10 }}>
                  {isDaily ? 'BLITZ' : 'MASTER'}
                </div>

                <div style={{ padding: '12px 20px', background: '#0f172a80', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    "{lang === 'en' && topicRow.title_en ? topicRow.title_en : topicRow.title}"
                  </h4>
                </div>

                <div style={{ height: '170px', backgroundColor: '#090d16', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={topicRow.cover_url || localPlaceholderSvg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleLocalImageError} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: '#000000e0', borderTop: '1px solid #223147', textAlign: 'center', fontSize: '0.75rem', padding: '10px 4px', color: '#94a3b8' }}>
                  <div style={{ borderRight: '1px solid #1e293b' }}>
                    <b style={{ color: 'white', display: 'block' }}>{realEntriesCount > 0 ? `${realEntriesCount} db` : '- db'}</b> 
                    {lang === 'en' ? 'Photographers' : 'Fotós'}
                  </div>
                  <div style={{ borderRight: '1px solid #1e293b' }}>
                    <b style={{ color: 'white', display: 'block' }}>{endedDate}</b> 
                    {lang === 'en' ? 'Ended' : 'Lezárult'}
                  </div>
                  <div>
                    <b style={{ color: '#38bdf8', display: 'block' }}>{realVotesCount > 0 ? `${realVotesCount} db` : '- db'}</b> 
                    {lang === 'en' ? 'Votes' : 'Szavazat'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        
        // ── 🏛️ AL-ARÉNA RÉSZLETES PANEL ──
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <button onClick={() => setSelectedPastTopicId(null)} style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
              ← Vissza az archívumhoz
            </button>
            
            {/* 👑 ADMIN FUNKCIÓ: Ha az admin van bent, kirakjuk a Facebook pódiumgeneráló gombot a sarokba */}
            {user?.email === ADMIN_EMAIL && pastLeaderboard.length > 0 && (
              <button
                disabled={isAdminGeneratingPoster}
                onClick={() => handleGenerateAdminPoster(currentTopicObj)}
                style={{ background: '#0f172a', color: '#fbbf24', border: '1px solid #fbbf24', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.85rem', cursor: isAdminGeneratingPoster ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(251,191,36,0.1)' }}
              >
                {isAdminGeneratingPoster ? '⏳ Plakát generálása...' : '🏆 FB Plakát Letöltése (1200x1200px)'}
              </button>
            )}

            <h2 style={{ margin: 0, color: 'white', fontSize: '1.6rem', fontWeight: '900' }}>
              {lang === 'en' && currentTopicObj?.title_en ? currentTopicObj.title_en : currentTopicObj?.title}
            </h2>
          </div>

          <div style={{ display: 'flex', background: '#0f172a', padding: '6px', borderRadius: '14px', width: 'fit-content', gap: '6px', border: '1px solid #223147' }}>
            {[
              { id: 'winners', label: lang === 'en' ? 'WINNERS' : 'GYŐZTESEK' },
              { id: 'details', label: lang === 'en' ? 'DETAILS' : 'RÉSZLETEK' },
              { id: 'prizes', label: lang === 'en' ? 'PRIZES' : 'NYEREMÉNYEK' },
              { id: 'rank', label: lang === 'en' ? 'RANK' : 'RANGSOR' }
            ].map(btn => (
              <button key={btn.id} onClick={() => setSubTab(btn.id as any)} style={{ padding: '8px 22px', border: 'none', background: subTab === btn.id ? '#ffffff' : 'transparent', color: subTab === btn.id ? '#0f172a' : '#cbd5e1', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                {btn.label}
              </button>
            ))}
          </div>

          <div style={{ background: '#1e293b', borderRadius: '24px', padding: '30px', border: '1px solid #334155', boxShadow: '0 15px 40px rgba(0,0,0,0.3)' }}>
            
            {/* 🥇 GYŐZTESEK FÜL */}
            {subTab === 'winners' && ( 
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ border: '1px solid #475569', background: '#0f172a', borderRadius: '16px', padding: '25px', width: '100%', maxWidth: '650px', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '15px' }}>
                    <span>🛡️</span> <span>TOP PHOTOGRAPHER WINNER</span>
                  </div>
                  
                  {topThreeWinners[0] ? (
                    <div style={{ width: '100%' }}>
                      <div style={{ width: '100%', height: '320px', background: '#000', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', cursor: 'zoom-in' }} onClick={() => setFullscreenData({ url: getImageUrl(topThreeWinners[0].drive_file_id, topThreeWinners[0].file_url), title: topThreeWinners[0].user_name })}>
                        <img src={getImageUrl(topThreeWinners[0].drive_file_id, topThreeWinners[0].file_url)} alt="Winner" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={handleLocalImageError} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f172a', padding: '12px 20px', borderRadius: '12px', borderLeft: '4px solid #fbbf24' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', textAlign: 'left' }}>
                          <img src={silhouetteAvatar} alt="" style={{ width: '38px', height: '38px' }} />
                          <div>
                            <strong style={{ color: 'white', display: 'block', fontSize: '1.1rem' }}>{topThreeWinners[0].user_name}</strong>
                            <span style={{ color: '#64748b', fontSize: '0.8rem', display: 'block' }}>{winnerLevelName}</span>
                          </div>
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

            {/* 📝 RÉSZLETEK FÜL */}
            {subTab === 'details' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '30px', alignItems: 'start', padding: '10px 0' }}>
                <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: '1px solid #334155' }}>
                  <img src={silhouetteAvatar} alt="Master" style={{ width: '90px', height: '90px' }} />
                  <strong style={{ color: 'white', fontSize: '1.1rem', marginTop: '10px' }}>GURU</strong>
                  <span style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '2px' }}>{currentTopicObj?.master_name || 'Ismeretlen Képmester'}</span>
                </div>
                <div style={{ borderLeft: '1px solid #334155', paddingLeft: '25px' }}>
                  <h3 style={{ color: 'white', fontSize: '1.8rem', margin: '0 0 12px 0', fontWeight: '900' }}>
                    {lang === 'en' && currentTopicObj?.title_en ? currentTopicObj.title_en : (currentTopicObj?.title || 'Let\'s Have Fun!')}
                  </h3>
                  <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '25px', whiteSpace: 'pre-wrap' }}>
                    {lang === 'en' && currentTopicObj?.description_en ? currentTopicObj.description_en : (currentTopicObj?.description || 'Share your best photos...')}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', borderTop: '1px solid #334155', paddingTop: '20px', marginTop: '20px', textAlign: 'center' }}>
                    <div><span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '4px' }}>📥</span> <strong style={{ color: 'white', display: 'block', fontSize: '1.1rem' }}>{pastLeaderboard.length}</strong> <small style={{ color: '#64748b', fontSize: '0.75rem' }}>BEKÜLDÖTT</small></div>
                    <div><span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '4px' }}>⏳</span> <strong style={{ color: 'white', display: 'block', fontSize: '1.1rem' }}>{currentTopicObj?.end_date ? new Date(currentTopicObj.end_date).toLocaleDateString('hu-HU') : 'Lezárult'}</strong> <small style={{ color: '#64748b', fontSize: '0.75rem' }}>VÉGZŐDÖTT</small></div>
                  </div>
                </div>
              </div>
            )}

            {/* 💎 NYEREMÉNYEK FÜL */}
            {subTab === 'prizes' && (
              <div style={{ textAlign: 'left', maxWidth: '800px', margin: '0 auto' }}>
                <h4 style={{ color: '#fbbf24', fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '15px' }}>
                  🏆 Dobogós Nyeremények & Extra Cserék
                </h4>
                <p style={{ color: '#cbd5e1', lineHeight: '1.6', marginBottom: '20px', fontSize: '1rem' }}>
                  A futamok lezárulásakor a mezőny legkiemelkedőbb fotóművészei értékes globális Joker cseréket és exkluzív hozzáférést kapnak jutalmul:
                </p>
                <ul style={{ padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <li style={{ background: '#0f172a', padding: '14px 18px', borderRadius: '10px', borderLeft: '4px solid #fbbf24' }}>
                    <strong style={{ color: '#fbbf24' }}>🥇 1. Helyezett (Győztes):</strong> +3 db globális Joker csere + <span style={{ color: '#10b981', fontWeight: 'bold' }}>1 HÉTTEL MEGHOSSZABBÍTOTT PRÉMIUM TAGSÁG</span> teljesen ingyen!
                  </li>
                  <li style={{ background: '#0f172a', padding: '14px 18px', borderRadius: '10px', borderLeft: '4px solid #cbd5e1' }}>
                    <strong style={{ color: '#cbd5e1' }}>🥈 2. Helyezett:</strong> +2 db Joker csere
                  </li>
                  <li style={{ background: '#0f172a', padding: '14px 18px', borderRadius: '10px', borderLeft: '4px solid #b45309' }}>
                    <strong style={{ color: '#b45309' }}>🥉 3. Helyezett:</strong> +1 db Joker csere
                  </li>
                </ul>
              </div>
            )}

            {/* 📊 RANGSOR FÜL */}
            {subTab === 'rank' && (
              <div>
                <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #334155', paddingBottom: '10px', marginBottom: '25px', fontSize: '0.85rem' }}>
                  {[
                    { id: 'photo', label: 'TOP PHOTO' },
                    { id: 'guru', label: "KÉPMESTER KIEMELÉS" }
                  ].map(sTab => (
                    <span key={sTab.id} onClick={() => setActiveRankSubTab(sTab.id as any)} style={{ color: activeRankSubTab === sTab.id ? '#38bdf8' : '#64748b', fontWeight: 'bold', cursor: 'pointer', borderBottom: activeRankSubTab === sTab.id ? '2px solid #38bdf8' : 'none', paddingBottom: '11px', marginBottom: '-11px', transition: 'all 0.2s' }}>
                      {sTab.label}
                    </span>
                  ))}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {activeRankSubTab === 'photo' ? (
                    singlePhotosRankedList.map((entry, idx) => {
                      const photoScore = entry.fair_score !== undefined ? entry.fair_score : (entry.archive_likes || entry.likes_count || 0);
                      
                      return (
                        <div key={entry.id} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '12px 20px', borderRadius: '14px', border: '1px solid #223147' }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: '900', width: '40px', color: '#64748b' }}>#{idx + 1}</div>
                          <img src={getImageUrl(entry.drive_file_id, entry.file_url)} onClick={() => setFullscreenData({ url: getImageUrl(entry.drive_file_id, entry.file_url), title: `${entry.title || 'Kép'} (${entry.user_name})` })} alt="" style={{ width: '55px', height: '55px', objectFit: 'cover', borderRadius: '8px', margin: '0 15px', cursor: 'zoom-in' }} onError={handleLocalImageError} />
                          <div style={{ flex: 1 }}>
                            <strong style={{ color: 'white', display: 'block', fontSize: '1rem' }}>{entry.user_name}</strong>
                            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                              {computeArchiveRank(entry.rank_level || entry.club_role, Number(photoScore))} {entry.title ? `• "${entry.title}"` : ''}
                            </span>
                          </div>
                          <div style={{ color: '#f97316', fontWeight: '900', fontSize: '1.1rem' }}>
                            {entry.fair_score !== undefined ? `${entry.fair_score} FP` : `${entry.likes_count} ⭐`}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    guruTopPicksList.map(entry => (
                      <div key={entry.id} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '12px 20px', borderRadius: '14px', border: '1px solid #a78bfa30' }}>
                        <div style={{ fontSize: '1.2rem', color: '#a78bfa', width: '30px', fontWeight: 'bold' }}>✨</div>
                        <img src={getImageUrl(entry.drive_file_id, entry.file_url)} onClick={() => setFullscreenData({ url: getImageUrl(entry.drive_file_id, entry.file_url), title: `${entry.title || 'Kép'} (${entry.user_name})` })} alt="" style={{ width: '55px', height: '55px', objectFit: 'cover', borderRadius: '6px', margin: '0 15px', cursor: 'zoom-in' }} onError={handleLocalImageError} />
                        <div style={{ flex: 1 }}>
                          <strong style={{ color: 'white', display: 'block', fontSize: '1rem' }}>{entry.user_name}</strong>
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
      
      {/* 👑 REJTETT SABLON DOBOZ AZ ADMIN ERREDMÉNYPLAKÁT GENERÁLÁSHOZ (1200x1200px) */}
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
                    <img src={adminPosterData.entries[1].base64Url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                    <img src={adminPosterData.entries[0].base64Url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
