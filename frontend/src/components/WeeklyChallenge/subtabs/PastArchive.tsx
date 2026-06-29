import React, { useState, useEffect, useMemo } from 'react';
import { getImageUrl } from '../../../utils/helpers';
import { toPng } from 'html-to-image'; 
import { BACKEND_URL, ADMIN_EMAIL } from '../../../utils/constants';

// Nyelvi kontextus betöltése
import { useLanguage } from '../../../context/LanguageContext';

// 🎯 Behozzuk MINDKÉT modált: a megosztót ÉS az interaktív fotó-kibeszélőt is!
import ShareCardModal from '../ShareCardModal';
import ArchiveDetailModal from '../ArchiveDetailModal';

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

export default function PastArchive({
  pastTopics, selectedPastTopicId, setSelectedPastTopicId, loadPastHistoryList,
  pastClubLeaderboard, pastLeaderboard, getTopicType,
  handleImageError, setFullscreenData, user
}: PastArchiveProps) {

  const { t, lang } = useLanguage();
  
  const [subTab, setSubTab] = useState<'winners' | 'details' | 'prizes' | 'rank'>('winners');
  const [activeRankSubTab, setActiveRankSubTab] = useState<'photo' | 'guru'>('photo');

  const [adminPosterData, setAdminPosterData] = useState<any | null>(null);
  const [isAdminGeneratingPoster, setIsAdminGeneratingPoster] = useState(false);

  // 🎯 VISSZATÉRT: Az interaktív fotó-adatlap lokális állapota
  const [activeArchiveEntry, setActiveArchiveEntry] = useState<any | null>(null);

  // A trófeakártya megosztásához szükséges lokális state-ek
  const [activeShareData, setActiveShareData] = useState<any | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const silhouetteAvatar = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23475569'><circle cx='12' cy='8' r='4'/><path d='M12 14c-6.1 0-10 4-10 4v2h20v-2s-3.9-4-10-4z'/></svg>";

  const computeArchiveRank = (rankLevel: any, score: number) => {
    const lvl = Number(rankLevel);
    if (!isNaN(lvl) && lvl >= 1 && lvl <= 12) {
      const globalRankNames = [
        t('rankScout', 'Fényleső 🌱'),
        t('rankObserver', 'Megfigyelő 👁️'),
        t('rankHunter', 'Képvadász 📷'),
        t('rankComposer', 'Komponista 📐'),
        t('rankWriter', 'Fényíró 🎞️'),
        t('rankAesthete', 'Esztéta 💎'),
        t('rankExpert', 'Szakértő 🎯'),
        t('rankMaster', 'Képmester 🎨'),
        t('rankGrandmaster', 'Nagymester 🌟'),
        t('rankVirtuoso', 'Virtuóz ⚡'),
        t('rankGuru', 'Fotóguru 🔥'),
        t('rankLegend', 'Vizuális Legenda 👑')
      ];
      return globalRankNames[lvl - 1];
    }

    const normalized = rankLevel ? String(rankLevel).toUpperCase().trim() : '';
    if (!normalized || normalized === 'FOTÓS' || normalized === 'MEMBER' || normalized === 'TAG') {
      const s = Number(score) || 0;
      if (s >= 22) return t('rankComposer', 'Komponista 📐');
      if (s >= 20) return t('rankHunter', 'Képvadász 📷');
      if (s >= 15) return t('rankObserver', 'Megfigyelő 👁️');
      return t('rankScout', 'Fényleső 🌱');
    }
    return String(rankLevel);
  };

  const handleLocalImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.onerror = null; 
    e.currentTarget.src = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' fill='%230f172a'><rect width='100%' height='100%'/><text x='50%' y='50%' fill='%23334155' font-family='sans-serif' font-size='14' text-anchor='middle'>${t('archiveImgNotAvailable', 'Kép nem elérhető')}</text></svg>`;
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
    return computeArchiveRank(topThreeWinners[0].rank_level, Number(score));
  }, [topThreeWinners]);

  const singlePhotosRankedList = useMemo(() => {
    if (!pastLeaderboard || pastLeaderboard.length === 0) return [];
    return [...pastLeaderboard].sort((a, b) => {
      const votesA = a.fair_score !== undefined ? a.fair_score : (a.archive_likes || a.likes_count || 0);
      const votesB = b.fair_score !== undefined ? b.fair_score : (b.archive_likes || b.likes_count || 0);
      return votesB - votesA;
    });
  }, [pastLeaderboard]);

  // 🎯 VISSZATÉRT: Szinkronizáljuk a modált a friss listás adatokkal
  const currentModalEntry = activeArchiveEntry
    ? (pastLeaderboard.find(x => x.id === activeArchiveEntry.id) || activeArchiveEntry)
    : null;

  const guruTopPicksList = useMemo(() => {
    return singlePhotosRankedList.filter((_, idx) => idx % 3 === 0).slice(0, 4); 
  }, [singlePhotosRankedList]);

  const handleExecuteShare = async () => {
    const node = document.getElementById('share-card-node');
    if (!node || !activeShareData) return;
    setIsGeneratingImage(true);
    try {
      await toPng(node, { cacheBust: true });
      const dataUrl = await toPng(node, { cacheBust: true, quality: 1.0 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `Arena_Award_${activeShareData.topic_title.replace(/\s+/g, '_')}.png`, { type: 'image/png' });
      const getOrdinalStr = (rankNum: number) => {
        if (lang === 'hu') return `${rankNum}.`;
        const m = rankNum % 10, n = rankNum % 100;
        if (m === 1 && n !== 11) return `${rankNum}st`;
        if (m === 2 && n !== 12) return `${rankNum}nd`;
        if (m === 3 && n !== 13) return `${rankNum}rd`;
        return `${rankNum}th`;
      };
      const shareTextCompiled = t('msgShareText').replace('{rank}', lang === 'en' ? getOrdinalStr(activeShareData.rank) : String(activeShareData.rank)).replace('{title}', activeShareData.topic_title);
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: t('msgShareTitle'), text: shareTextCompiled });
      } else {
        const link = document.createElement('a'); 
        link.download = `Arena_Trophy_${activeShareData.topic_title.replace(/\s+/g, '_')}.png`; 
        link.href = dataUrl;
        link.click();
      }
      setActiveShareData(null);
    } catch (e) {
      alert(t('msgGenerateImageError', 'Hiba történt a trófeakártya generálása közben.'));
    } finally {
      setIsGeneratingImage(false);
    }
  };

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
        let base64Url = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' fill='%230f172a'><rect width='100%' height='100%'/></svg>`;
        
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
                <div style={{ position: 'absolute', top: '12px', right: '-35px', background: isDaily ? 'linear-gradient(135deg, #ec4899, #f43f5e)' : 'linear-gradient(135deg, #a78bfa, #8b5cf6)', color: 'white', padding: '4px 40px', fontSize: '0.75rem', fontWeight: 'bold', transform: 'rotate(45deg)', zIndex: 10 }}>
                  {isDaily ? 'VILLÁM' : 'MESTER'}
                </div>

                <div style={{ padding: '12px 20px', background: '#0f172a80', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    "{lang === 'en' && topicRow.title_en ? topicRow.title_en : topicRow.title}"
                  </h4>
                </div>

                <div style={{ height: '170px', backgroundColor: '#090d16', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={topicRow.cover_url || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' fill='%230f172a'><rect width='100%' height='100%'/></svg>`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleLocalImageError} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: '#000000e0', borderTop: '1px solid #223147', textAlign: 'center', fontSize: '0.75rem', padding: '10px 4px', color: '#94a3b8' }}>
                  <div style={{ borderRight: '1px solid #1e293b' }}>
                    <b style={{ color: 'white', display: 'block' }}>{realEntriesCount > 0 ? `${realEntriesCount} db` : '- db'}</b> 
                    {t('archiveCountPhotographer', 'Fotós')}
                  </div>
                  <div style={{ borderRight: '1px solid #1e293b' }}>
                    <b style={{ color: 'white', display: 'block' }}>{endedDate}</b> 
                    {t('archiveCountEnded', 'Lezárult')}
                  </div>
                  <div>
                    <b style={{ color: '#38bdf8', display: 'block' }}>{realVotesCount > 0 ? `${realVotesCount} db` : '- db'}</b> 
                    {t('archiveCountVotes', 'Szavazat')}
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
              ← {t('archiveBtnBack', 'Vissza az archívumhoz')}
            </button>
            
            {user?.email === ADMIN_EMAIL && pastLeaderboard.length > 0 && (
              <button
                disabled={isAdminGeneratingPoster}
                onClick={() => handleGenerateAdminPoster(currentTopicObj)}
                style={{ background: '#0f172a', color: '#fbbf24', border: '1px solid #fbbf24', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.85rem', cursor: isAdminGeneratingPoster ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(251,191,36,0.1)' }}
              >
                {isAdminGeneratingPoster ? t('archiveBtnGeneratingPoster', '⏳ Plakát generálása...') : t('archiveBtnDownloadPoster', '🏆 FB Plakát Letöltése (1200x1200px)')}
              </button>
            )}

            <h2 style={{ margin: 0, color: 'white', fontSize: '1.6rem', fontWeight: '900' }}>
              {lang === 'en' && currentTopicObj?.title_en ? currentTopicObj.title_en : currentTopicObj?.title}
            </h2>
          </div>

          <div style={{ display: 'flex', background: '#0f172a', padding: '6px', borderRadius: '14px', width: 'fit-content', gap: '6px', border: '1px solid #223147' }}>
            {[
              { id: 'winners', label: t('archiveTabWinners', 'GYŐZTESEK') },
              { id: 'details', label: t('archiveTabDetails', 'RÉSZLETEK') },
              { id: 'prizes', label: t('archiveTabPrizes', 'NYEREMÉNYEK') },
              { id: 'rank', label: t('archiveTabRank', 'RANGSOR') }
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
                    <span>🛡️</span> <span>{t('archiveWinnerTitleCard', 'TOP PHOTOGRAPHER WINNER')}</span>
                  </div>
                  
                  {topThreeWinners[0] ? (
                    <div style={{ width: '100%' }}>
                      {/* 🎯 JAVÍTVA: A főkép kattintásakor most már megnyílik az interaktív visszajelzés panel */}
                      <div style={{ width: '100%', height: '320px', background: '#000', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', cursor: 'zoom-in' }} onClick={() => setActiveArchiveEntry(topThreeWinners[0])}>
                        <img src={getImageUrl(topThreeWinners[0].drive_file_id, topThreeWinners[0].file_url)} alt="Winner" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={handleLocalImageError} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f172a', padding: '12px 20px', borderRadius: '12px', borderLeft: '4px solid #fbbf24' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', textAlign: 'left' }}>
                          <img src={topThreeWinners[0].avatar_url || silhouetteAvatar} alt="" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} />
                          <div>
                            <strong style={{ color: 'white', display: 'block', fontSize: '1.1rem' }}>{topThreeWinners[0].user_name}</strong>
                            <span style={{ color: '#64748b', fontSize: '0.8rem', display: 'block' }}>{winnerLevelName}</span>
                          </div>
                        </div>
                        <div style={{ color: '#fbbf24', fontWeight: '900', fontSize: '1.3rem' }}>
                          {topThreeWinners[0].fair_score !== undefined ? `${topThreeWinners[0].fair_score} FP` : `${topThreeWinners[0].likes_count} ⭐`}
                        </div>
                      </div>

                      {/* Eredmény megosztása gomb */}
                      <button
                        onClick={() => setActiveShareData({
                          rank: 1,
                          topic_title: currentTopicObj?.title || '',
                          topic_title_en: currentTopicObj?.title_en || '',
                          likes: topThreeWinners[0].fair_score !== undefined ? topThreeWinners[0].fair_score : topThreeWinners[0].likes_count,
                          total_entries: pastLeaderboard.length,
                          user_name: topThreeWinners[0].user_name,
                          file_url: getImageUrl(topThreeWinners[0].drive_file_id, topThreeWinners[0].file_url)
                        })}
                        style={{ marginTop: '20px', width: '100%', background: 'linear-gradient(135deg, #fbbf24, #d97706)', color: '#0f172a', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.05rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(251,191,36,0.25)', transition: 'transform 0.15s ease' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        📢 {t('btnShareResult', 'Eredmény Megosztása / Trófeakártya Mentése 🚀')}
                      </button>

                    </div>
                  ) : (
                    <p style={{ color: '#64748b' }}>{t('archiveNoWinnerData', 'Nincs kiértékelhető győztes adat.')}</p>
                  )}
                </div>
              </div>
            )}

            {/* 📝 RÉSZLETEK FÜL */}
            {subTab === 'details' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '30px', alignItems: 'start', padding: '10px 0' }}>
                <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: '1px solid #334155' }}>
                  <img src={currentTopicObj?.master_avatar_url || silhouetteAvatar} alt="Master" style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover' }} />
                  <strong style={{ color: 'white', fontSize: '1.1rem', marginTop: '10px' }}>KÉPMESTER</strong>
                  <span style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '2px' }}>{currentTopicObj?.master_name || t('archiveUnknownMaster', 'Ismeretlen Képmester')}</span>
                </div>
                <div style={{ borderLeft: '1px solid #334155', paddingLeft: '25px' }}>
                  <h3 style={{ color: 'white', fontSize: '1.8rem', margin: '0 0 12px 0', fontWeight: '900' }}>
                    {lang === 'en' && currentTopicObj?.title_en ? currentTopicObj.title_en : currentTopicObj?.title}
                  </h3>
                  <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '25px', whiteSpace: 'pre-wrap' }}>
                    {lang === 'en' && currentTopicObj?.description_en ? currentTopicObj.description_en : currentTopicObj?.description}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', borderTop: '1px solid #334155', paddingTop: '20px', marginTop: '20px', textAlign: 'center' }}>
                    <div><span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '4px' }}>📥</span> <strong style={{ color: 'white', display: 'block', fontSize: '1.1rem' }}>{pastLeaderboard.length}</strong> <small style={{ color: '#64748b', fontSize: '0.75rem' }}>{t('archiveMetaSubmitted', 'BEKÜLDÖTT')}</small></div>
                    <div><span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '4px' }}>⏳</span> <strong style={{ color: 'white', display: 'block', fontSize: '1.1rem' }}>{currentTopicObj?.end_date ? new Date(currentTopicObj.end_date).toLocaleDateString('hu-HU') : '-'}</strong> <small style={{ color: '#64748b', fontSize: '0.75rem' }}>{t('archiveMetaEnded', 'VÉGZŐDÖTT')}</small></div>
                  </div>
                </div>
              </div>
            )}

            {/* 💎 NYEREMÉNYEK FÜL */}
            {subTab === 'prizes' && (
              <div style={{ textAlign: 'left', maxWidth: '800px', margin: '0 auto' }}>
                <h4 style={{ color: '#fbbf24', fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '15px' }}>
                  {t('archivePrizesTitle', '🏆 Dobogós Nyeremények & Extra Cserék')}
                </h4>
                <p style={{ color: '#cbd5e1', lineHeight: '1.6', marginBottom: '20px', fontSize: '1rem' }}>
                  {t('archivePrizesDesc', 'Tekintsd meg, milyen jutalmakban részesültek az aréna legjobbjai:')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ background: '#0f172a', padding: '12px 18px', borderRadius: '8px', borderLeft: '4px solid #fbbf24' }}><b style={{ color: '#fbbf24' }}>1. Helyezett:</b> +3 Joker csere kupon és 7 nap ingyen prémium tagság-hosszabbítás.</div>
                  <div style={{ background: '#0f172a', padding: '12px 18px', borderRadius: '8px', borderLeft: '4px solid #cbd5e1' }}><b style={{ color: '#cbd5e1' }}>2. Helyezett:</b> +2 Joker csere kupon a következő futamokra.</div>
                  <div style={{ background: '#0f172a', padding: '12px 18px', borderRadius: '8px', borderLeft: '4px solid #cd7f32' }}><b style={{ color: '#cd7f32' }}>3. Helyezett:</b> +1 Joker csere kupon.</div>
                </div>
              </div>
            )}

            {/* 📊 RANGSOR FÜL */}
            {subTab === 'rank' && (
              <div>
                <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #334155', paddingBottom: '10px', marginBottom: '25px', fontSize: '0.85rem' }}>
                  {[
                    { id: 'photo', label: t('archiveSubTabTopPhoto', 'TOP PHOTO') },
                    { id: 'guru', label: t('archiveSubTabMasterPick', 'KÉPMESTER KIEMELÉS') }
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
                        // 🎯 JAVÍTVA: A sorra kattintva (`onClick`) most már előugrik a teljes visszajelzés / lájk / komment panel!
                        <div key={entry.id} onClick={() => setActiveArchiveEntry(entry)} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '12px 20px', borderRadius: '14px', border: '1px solid #223147', cursor: 'pointer', transition: 'transform 0.15s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}>
                          <div style={{ fontSize: '1.2rem', fontWeight: '900', width: '40px', color: '#64748b' }}>#{idx + 1}</div>
                          <img src={getImageUrl(entry.drive_file_id, entry.file_url)} alt="" style={{ width: '55px', height: '55px', objectFit: 'cover', borderRadius: '8px', margin: '0 15px' }} onError={handleLocalImageError} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ color: 'white', display: 'block', fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.user_name}</strong>
                            <span style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {computeArchiveRank(entry.rank_level, Number(photoScore))} {entry.title ? `• "${entry.title}"` : ''}
                            </span>
                            
                            {/* 🎯 ÚJRA BERAKVA: A szívecskés archív lájkszámláló ❤️ */}
                            <div style={{ fontSize: '0.75rem', color: entry?.has_user_liked ? '#f87171' : '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: entry?.has_user_liked ? 'bold' : 'normal' }}>
                              <span>{entry?.has_user_liked ? '❤️' : '🤍'}</span> 
                              <span>{entry?.archive_likes || 0} dicséret</span>
                            </div>
                          </div>
                          
                          <div style={{ color: '#f97316', fontWeight: '900', fontSize: '1.1rem', textAlign: 'right', marginLeft: '10px' }}>
                            {entry.fair_score !== undefined ? `${entry.fair_score} pont` : `${entry.likes_count} ⭐`}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    guruTopPicksList.map(entry => (
                      <div key={entry.id} onClick={() => setActiveArchiveEntry(entry)} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '12px 20px', borderRadius: '14px', border: '1px solid #a78bfa30', cursor: 'pointer', transition: 'transform 0.15s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}>
                        <div style={{ fontSize: '1.2rem', color: '#a78bfa', width: '30px', fontWeight: 'bold' }}>✨</div>
                        <img src={getImageUrl(entry.drive_file_id, entry.file_url)} alt="" style={{ width: '55px', height: '55px', objectFit: 'cover', borderRadius: '6px', margin: '0 15px' }} onError={handleLocalImageError} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ color: 'white', display: 'block', fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.user_name}</strong>
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block' }}>{t('archiveHighlightedByMaster', 'Kiemelte a Képmester')}</span>
                          
                          {/* Szívecske a mesteri választásokhoz is */}
                          <div style={{ fontSize: '0.75rem', color: entry?.has_user_liked ? '#f87171' : '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: entry?.has_user_liked ? 'bold' : 'normal' }}>
                            <span>{entry?.has_user_liked ? '❤️' : '🤍'}</span> 
                            <span>{entry?.archive_likes || 0} dicséret</span>
                          </div>
                        </div>
                        <div style={{ color: '#a78bfa', fontWeight: '900', fontSize: '1.1rem', textAlign: 'right', marginLeft: '10px' }}>Mesteri választás</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
      
      {/* 👑 MODÁL RENDERELÉSI ZÓNA */}
      <ShareCardModal 
        activeShareData={activeShareData} 
        onClose={() => setActiveShareData(null)} 
        user={user} 
        shareBase64={null} 
        loadingShareImg={false} 
        isGeneratingImage={isGeneratingImage} 
        handleExecuteShare={handleExecuteShare} 
      />

      {/* 🎯 VISSZATÉRT: INTERAKTÍV KIBESZÉLŐ ÉS HOZZÁSZÓLÁS MODÁL */}
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

      {/* 👑 REJTETT PLAKÁT-GENERÁLÓ SABLON ADMINOKNAK */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', overflow: 'hidden', width: 0, height: 0 }}>
        {adminPosterData && (
          <div 
            id="admin-past-poster-node" 
            style={{ width: '1200px', height: '1200px', background: 'linear-gradient(135deg, #090d16 0%, #111827 100%)', padding: '60px', boxSizing: 'border-box', border: '16px solid #fbbf24', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Inter, sans-serif', position: 'relative' }}
          >
            <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '400px', height: '400px', background: '#fbbf24', filter: 'blur(180px)', opacity: 0.1, borderRadius: '50%' }}></div>
            <div style={{ position: 'absolute', bottom: '-100px', right: '-100px', width: '400px', height: '400px', background: '#38bdf8', filter: 'blur(180px)', opacity: 0.1, borderRadius: '50%' }}></div>

            <div style={{ textalign: 'center', width: '100%' }}>
              <div style={{ color: '#fbbf24', fontSize: '26px', fontWeight: '900', letterSpacing: '6px', textTransform: 'uppercase', marginBottom: '15px' }}>
                ✨ {t('archivePosterHeader', 'Challenge RESULTS')} ✨
              </div>
              <h1 style={{ color: '#ffffff', fontSize: '64px', margin: '0 0 10px 0', fontWeight: '900', letterSpacing: '-1px', lineHeight: '1.2' }}>
                {adminPosterData.topic.title}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '35px', width: '100%', padding: '0 20px', boxSizing: 'border-box' }}>
              {/* 2. HELYEZETT */}
              {adminPosterData.entries[1] && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '290px' }}>
                  <div style={{ width: '240px', height: '240px', borderRadius: '16px', overflow: 'hidden', border: '6px solid #cbd5e1', boxShadow: '0 20px 45px rgba(0,0,0,0.6)', backgroundColor: '#000', marginBottom: '15px' }}>
                    <img src={adminPosterData.entries[1].base64Url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ background: 'linear-gradient(180deg, #334155 0%, #1e293b 100%)', width: '100%', height: '200px', borderRadius: '16px 16px 0 0', border: '1px solid #475569', borderBottom: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '15px', boxSizing: 'border-box', textAlign: 'center' }}>
                    <div style={{ color: '#cbd5e1', fontSize: '24px', fontWeight: 'bold', width: '100%', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.2', textAlign: 'center', minHeight: '58px' }}>{adminPosterData.entries[1].user_name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>
                      {adminPosterData.entries[1].fair_score !== undefined ? `${adminPosterData.entries[1].fair_score} pont` : `${adminPosterData.entries[1].likes_count} ⭐`}
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: '32px', fontWeight: '900', marginTop: '20px', letterSpacing: '1px' }}>🥈 2. {t('archivePosterPlace', 'HELY')}</div>
                  </div>
                </div>
              )}

              {/* 1. HELYEZETT */}
              {adminPosterData.entries[0] && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '330px', zIndex: 10 }}>
                  <div style={{ fontSize: '70px', marginBottom: '-10px', filter: 'drop-shadow(0 4px 10px rgba(251,191,36,0.5))' }}>👑</div>
                  <div style={{ width: '290px', height: '290px', borderRadius: '24px', overflow: 'hidden', border: '8px solid #fbbf24', boxShadow: '0 25px 60px rgba(251,191,36,0.3)', backgroundColor: '#000', marginBottom: '15px' }}>
                    <img src={adminPosterData.entries[0].base64Url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ background: 'linear-gradient(180deg, #fbbf24 0%, #b45309 100%)', width: '100%', height: '270px', borderRadius: '20px 24px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '15px', boxSizing: 'border-box', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                    <div style={{ color: '#0f172a', fontSize: '28px', fontWeight: '900', width: '100%', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.2', textAlign: 'center', minHeight: '64px' }}>{adminPosterData.entries[0].user_name}</div>
                    <div style={{ color: '#0f172a', fontSize: '26px', fontWeight: '900', marginTop: '4px', opacity: 0.9 }}>
                      {adminPosterData.entries[0].fair_score !== undefined ? `${adminPosterData.entries[0].fair_score} pont` : `${adminPosterData.entries[0].likes_count} ⭐`}
                    </div>
                    <div style={{ color: '#ffffff', fontSize: '38px', fontWeight: '900', marginTop: '25px', letterSpacing: '1px', textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>🥇 1. {t('archivePosterPlace', 'HELY')}</div>
                  </div>
                </div>
              )}

              {/* 3. HELYEZETT */}
              {adminPosterData.entries[2] && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '290px' }}>
                  <div style={{ width: '240px', height: '240px', borderRadius: '16px', overflow: 'hidden', border: '6px solid #b45309', boxShadow: '0 20px 45px rgba(0,0,0,0.6)', backgroundColor: '#000', marginBottom: '15px' }}>
                    <img src={adminPosterData.entries[2].base64Url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ background: 'linear-gradient(180deg, #7c2d12 0%, #431407 100%)', width: '100%', height: '200px', borderRadius: '16px 16px 0 0', border: '1px solid #7c2d12', borderBottom: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '15px', boxSizing: 'border-box', textAlign: 'center' }}>
                    <div style={{ color: '#ffedd5', fontSize: '24px', fontWeight: 'bold', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adminPosterData.entries[2].user_name}</div>
                    <div style={{ color: '#fdba74', fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>
                      {adminPosterData.entries[2].fair_score !== undefined ? `${adminPosterData.entries[2].fair_score} pont` : `${adminPosterData.entries[2].likes_count} ⭐`}
                    </div>
                    <div style={{ color: '#fdba74', fontSize: '32px', fontWeight: '900', marginTop: '20px', letterSpacing: '1px' }}>🥉 3. {t('archivePosterPlace', 'HELY')}</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '18px', fontWeight: 'bold' }}>
              <div>{t('archivePosterFooterJoin', 'Join the Arena Battle:')} <span style={{ color: '#38bdf8' }}>photawesome.com</span></div>
              <div style={{ color: '#fbbf24', letterSpacing: '1px' }}>✨ PhotAwesome Arena ✨</div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
