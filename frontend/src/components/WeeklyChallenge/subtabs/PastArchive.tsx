import React, { useState, useEffect, useMemo } from 'react';
import { getImageUrl } from '../../../utils/helpers';
import { toPng } from 'html-to-image'; 
import { BACKEND_URL, ADMIN_EMAIL } from '../../../utils/constants';
// Nyelvi kontextus betöltése
import { useLanguage } from '../../../context/LanguageContext';

// Téma környezet betöltése
import { useTheme } from '../../../context/ThemeContext';
// Mindkét modál behozatala
import ShareCardModal from '../ShareCardModal';
import ArchiveDetailModal from '../ArchiveDetailModal';
// Letisztult Lucide ikonok importálása
import { 
  ArrowLeft, 
  Download, 
  Crown, 
  Trophy, 
  Medal, 
  Award, 
  Calendar, 
  Users, 
  Vote, 
  FileText, 
  Heart, 
  Eye, 
  User, 
  Gift, 
  Sparkles,
  Layers,
  Info,
  Star,
  Share2,
  ImageIcon
} from 'lucide-react';

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
  allUsers: any[]; // 🎯 Összekötve a központi felhasználói listával a photo_users táblából
}

// 🎯 KÖZPONTI AUTH FEJLÉC GENERÁTOR HELYI RENDERSZINTRE
const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('photoAppToken');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

export default function PastArchive({
  pastTopics, selectedPastTopicId, setSelectedPastTopicId, loadPastHistoryList,
  pastClubLeaderboard, pastLeaderboard, getTopicType,
  handleImageError, setFullscreenData, user, allUsers
}: PastArchiveProps) {

  const { t, lang } = useLanguage();
  const [subTab, setSubTab] = useState<'winners' | 'details' | 'prizes' | 'rank'>('winners');
  const [activeRankSubTab, setActiveRankSubTab] = useState<'photo' | 'guru'>('photo');
  const [adminPosterData, setAdminPosterData] = useState<any | null>(null);
  const [isAdminGeneratingPoster, setIsAdminGeneratingPoster] = useState(false);
  // Az interaktív fotó-adatlap lokális állapota
  const [activeArchiveEntry, setActiveArchiveEntry] = useState<any | null>(null);
  // A trófeakártya megosztásához szükséges lokális state-ek
  const [activeShareData, setActiveShareData] = useState<any | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  // BIZTONSÁGI VÉDŐHÁLÓ: Lekérjük az aktuális témát
  let isLight = false;
  try {
    const themeContext = useTheme();
    if (themeContext) {
      isLight = themeContext.theme === 'light';
    }
  } catch (e) {}

  const silhouetteAvatar = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23475569'><circle cx='12' cy='8' r='4'/><path d='M12 14c-6.1 0-10 4-10 4v2h20v-2s-3.9-4-10-4z'/></svg>";

  // 🎯 JAVÍTVA: Intelligens profilkép-kereső motor, ami az AdminUsersView mintájára név alapján párosít a photo_users táblából!
  const getAvatarSrc = (entry: any) => {
    if (!entry) return silhouetteAvatar;
    
    if (allUsers && Array.isArray(allUsers) && entry.user_name) {
      const matchedUser = allUsers.find(u => u.name?.toLowerCase().trim() === entry.user_name?.toLowerCase().trim());
      if (matchedUser && matchedUser.avatar_url) return matchedUser.avatar_url;
    }
    return entry.avatar_url || silhouetteAvatar;
  };

  // 🎯 JAVÍTVA: A kiíró Képmester profilképét is keresztbe-lekérdezzük név alapján a photo_users táblából
  const getMasterAvatarSrc = () => {
    if (allUsers && Array.isArray(allUsers) && currentTopicObj?.master_name) {
      const matchedMaster = allUsers.find(u => u.name?.toLowerCase().trim() === currentTopicObj.master_name?.toLowerCase().trim());
      if (matchedMaster && matchedMaster.avatar_url) return matchedMaster.avatar_url;
    }
    return currentTopicObj?.master_avatar_url || silhouetteAvatar;
  };

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
          const proxyRes = await fetch(proxyUrl, { headers: getAuthHeaders() });
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {Array.isArray(pastTopics) && pastTopics.map(topicRow => {
            const isDaily = getTopicType(topicRow.start_date, topicRow.end_date) === 'daily';
            const endedDate = new Date(topicRow.end_date).toLocaleDateString(lang === 'en' ? 'en-US' : 'hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' });
            const realEntriesCount = topicRow.entries_count ?? topicRow.totalEntries ?? topicRow.entry_count ?? 0;
            const realVotesCount = topicRow.total_votes ?? topicRow.vote_count ?? topicRow.total_votes_count ?? 0;

            return (
              <div 
                key={topicRow.id}
                onClick={() => handleSelectTopic(topicRow.id)}
                style={{ background: 'var(--bg-card)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-main)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease-in-out' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--text-body)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-main)'; }}
              >
                <div style={{ padding: '12px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                    {lang === 'en' && topicRow.title_en ? topicRow.title_en : topicRow.title}
                  </h4>
                  <span style={{ flexShrink: 0, fontSize: '0.68rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: isDaily ? 'rgba(239,68,68,0.08)' : 'rgba(139,92,246,0.08)', color: isDaily ? '#f87171' : '#a78bfa', border: `1px solid ${isDaily ? 'rgba(239,68,68,0.2)' : 'rgba(139,92,246,0.2)'}` }}>
                    {isDaily ? 'BLITZ' : 'MASTER'}
                  </span>
                </div>

                <div style={{ height: '160px', backgroundColor: '#090d16', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={topicRow.cover_url || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' fill='%230f172a'><rect width='100%' height='100%'/></svg>`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleLocalImageError} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: 'var(--bg-main)', borderTop: '1px solid var(--border-main)', textAlign: 'center', fontSize: '0.75rem', padding: '10px 4px', color: 'var(--text-muted)' }}>
                  <div style={{ borderRight: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <Users size={12} color="var(--text-muted)" />
                    <span style={{ color: 'var(--text-title)', fontWeight: '600' }}>{realEntriesCount > 0 ? `${realEntriesCount} db` : '- db'}</span> 
                    <span>{t('archiveCountPhotographer', 'Fotós')}</span>
                  </div>
                  <div style={{ borderRight: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <Calendar size={12} color="var(--text-muted)" />
                    <span style={{ color: 'var(--text-title)', fontWeight: '600' }}>{endedDate}</span> 
                    <span>{t('archiveCountEnded', 'Lezárult')}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <Vote size={12} color="#38bdf8" />
                    <span style={{ color: '#38bdf8', fontWeight: '600' }}>{realVotesCount > 0 ? `${realVotesCount} db` : '- db'}</span> 
                    <span>{t('archiveCountVotes', 'Szavazat')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        
        // ── 🏛️ DETALIZÁLT AL-ARÉNA PANEL ──
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <button onClick={() => setSelectedPastTopicId(null)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}>
              <ArrowLeft size={14} /> {t('archiveBtnBack', 'Vissza')}
            </button>
            
            {user?.email === ADMIN_EMAIL && pastLeaderboard.length > 0 && (
              <button
                disabled={isAdminGeneratingPoster}
                onClick={() => handleGenerateAdminPoster(currentTopicObj)}
                style={{ background: 'var(--bg-main)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)', padding: '6px 14px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.82rem', cursor: isAdminGeneratingPoster ? 'not-allowed' : 'pointer', transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={14} />
                {isAdminGeneratingPoster ? t('archiveBtnGeneratingPoster', '⏳ Processing...') : t('archiveBtnDownloadPoster', '🏆 FB Plakát')}
              </button>
            )}

            <h2 style={{ margin: 0, color: 'var(--text-title)', fontSize: '1.3rem', fontWeight: '700', letterSpacing: '-0.3px' }}>
              {lang === 'en' && currentTopicObj?.title_en ? currentTopicObj.title_en : currentTopicObj?.title}
            </h2>
          </div>

          <div style={{ display: 'flex', background: 'var(--bg-main)', padding: '4px', borderRadius: '6px', width: 'fit-content', gap: '4px', border: '1px solid var(--border-main)' }}>
            {[
              { id: 'winners', label: t('archiveTabWinners', 'GYŐZTESEK') },
              { id: 'details', label: t('archiveTabDetails', 'RÉSZLETEK') },
              { id: 'prizes', label: t('archiveTabPrizes', 'NYEREMÉNYEK') },
              { id: 'rank', label: t('archiveTabRank', 'RANGSOR') }
            ].map(btn => (
              <button key={btn.id} onClick={() => setSubTab(btn.id as any)} style={{ padding: '6px 16px', border: 'none', background: subTab === btn.id ? 'var(--hover-overlay)' : 'transparent', color: subTab === btn.id ? 'var(--text-title)' : 'var(--text-body)', borderRadius: '4px', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.1s' }}>
                {btn.label}
              </button>
            ))}
          </div>

          <div style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '24px', border: '1px solid var(--border-main)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            
            {/* 🥇 GYŐZTESEK FÜL */}
            {subTab === 'winners' && ( 
              <div style={{ display: 'flex', alignItems: 'center', textAlign: 'center', flexDirection: 'column' }}>
                <div style={{ border: '1px solid var(--border-main)', background: 'var(--bg-main)', borderRadius: '8px', padding: '20px', width: '100%', maxWidth: '600px', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#fbbf24', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '14px' }}>
                    <Crown size={14} /> <span>{t('archiveWinnerTitleCard', 'TOP PHOTOGRAPHER WINNER')}</span>
                  </div>
                  
                  {topThreeWinners[0] ? (
                    <div style={{ width: '100%' }}>
                      <div style={{ width: '100%', height: '300px', background: '#090d16', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', cursor: 'zoom-in', border: '1px solid var(--border-main)' }} onClick={() => setActiveArchiveEntry(topThreeWinners[0])}>
                        <img src={getImageUrl(topThreeWinners[0].drive_file_id, topThreeWinners[0].file_url)} alt="Winner" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={handleLocalImageError} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '6px', borderLeft: '4px solid #fbbf24', border: '1px solid var(--border-main)' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', textAlign: 'left' }}>
                          {/* 🎯 INTUÍCIÓS JAVÍTÁS: Keresztlekérdezés név alapján a photo_users táblából az AdminUsersView mintájára */}
                          <img 
                            src={getAvatarSrc(topThreeWinners[0])} 
                            alt="" 
                            style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-main)', backgroundColor: '#090d16' }} 
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = silhouetteAvatar; }}
                          />
                          <div>
                            <strong style={{ color: 'var(--text-title)', display: 'block', fontSize: '0.98rem' }}>{topThreeWinners[0].user_name}</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'block', marginTop: '1px' }}>{winnerLevelName}</span>
                          </div>
                        </div>
                        <div style={{ color: '#fbbf24', fontWeight: '700', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Star size={14} fill="#fbbf24" /> {topThreeWinners[0].fair_score !== undefined ? `${topThreeWinners[0].fair_score} FP` : `${topThreeWinners[0].likes_count} ⭐`}
                        </div>
                      </div>

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
                        style={{ marginTop: '16px', width: '100%', background: '#fbbf24', color: '#090d16', border: 'none', padding: '12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }}
                      >
                        <Share2 size={14} /> {t('btnShareResult', 'Trófeakártya Mentése')}
                      </button>

                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>{t('archiveNoWinnerData', 'Nincs kiértékelhető győztes adat.')}</p>
                  )}
                </div>
              </div>
            )}

            {/* 📝 RÉSZLETEK FÜL */}
            {subTab === 'details' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', alignItems: 'start' }}>
                <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: '1px solid var(--border-main)' }}>
                  <img 
                    src={getMasterAvatarSrc()} 
                    alt="Master" 
                    style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-main)', backgroundColor: '#090d16' }} 
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = silhouetteAvatar; }}
                  />
                  <strong style={{ color: '#a78bfa', fontSize: '0.85rem', marginTop: '10px', fontWeight: 'bold', letterSpacing: '0.5px' }}>KÉPMESTER</strong>
                  <span style={{ color: 'var(--text-title)', fontSize: '0.88rem', fontWeight: '600', marginTop: '2px' }}>{currentTopicObj?.master_name || t('archiveUnknownMaster', 'Ismeretlen Képmester')}</span>
                </div>
                <div style={{ borderLeft: '1px solid var(--border-main)', paddingLeft: '20px' }} className="archive-details-pane">
                  <h3 style={{ color: 'var(--text-title)', fontSize: '1.4rem', margin: '0 0 8px 0', fontWeight: '700', letterSpacing: '-0.3px' }}>
                    {lang === 'en' && currentTopicObj?.title_en ? currentTopicObj.title_en : currentTopicObj?.title}
                  </h3>
                  <p style={{ color: 'var(--text-body)', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
                    {lang === 'en' && currentTopicObj?.description_en ? currentTopicObj.description_en : currentTopicObj?.description}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', borderTop: '1px solid var(--border-main)', paddingTop: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}><ImageIcon size={14} color="var(--text-muted)" /><strong style={{ color: 'var(--text-title)', fontSize: '1rem', marginTop: '2px' }}>{pastLeaderboard.length}</strong> <small style={{ color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 'bold' }}>{t('archiveMetaSubmitted')}</small></div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}><Calendar size={14} color="var(--text-muted)" /><strong style={{ color: 'var(--text-title)', fontSize: '1rem', marginTop: '2px' }}>{currentTopicObj?.end_date ? new Date(currentTopicObj.end_date).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' }) : '-'}</strong> <small style={{ color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 'bold' }}>{t('archiveMetaEnded')}</small></div>
                  </div>
                </div>
              </div>
            )}

            {/* 💎 NYEREMÉNYEK FÜL */}
            {subTab === 'prizes' && (
              <div style={{ textAlign: 'left', maxWidth: '700px', margin: '0 auto' }}>
                <h4 style={{ color: '#fbbf24', fontSize: '1.15rem', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Gift size={16} /> {t('archivePrizesTitle', 'Dobogós Jutalmak & Extra Cserék')}
                </h4>
                <p style={{ color: 'var(--text-body)', lineHeight: '1.5', marginBottom: '16px', fontSize: '0.88rem' }}>
                  {t('archivePrizesDesc', 'Tekintsd meg, milyen jutalmakban részesültek az aréna legjobbjai:')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div style={{ background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '4px', border: '1px solid var(--border-main)', color: 'var(--text-title)' }}><b style={{ color: '#fbbf24' }}>1. Helyezett:</b> +3 Joker csere kupon és 7 nap ingyen prémium tagság.</div>
                  <div style={{ background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '4px', border: '1px solid var(--border-main)', color: 'var(--text-title)' }}><b style={{ color: isLight ? '#475569' : '#cbd5e1' }}>2. Helyezett:</b> +2 Joker csere kupon a következő futamokra.</div>
                  <div style={{ background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '4px', border: '1px solid var(--border-main)', color: 'var(--text-title)' }}><b style={{ color: '#b45309' }}>3. Helyezett:</b> +1 Joker csere kupon.</div>
                </div>
              </div>
            )}

            {/* 📊 RANGSOR FÜL */}
            {subTab === 'rank' && (
              <div>
                <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-main)', paddingBottom: '8px', marginBottom: '16px', fontSize: '0.82rem' }}>
                  {[
                    { id: 'photo', label: t('archiveSubTabTopPhoto', 'TOP PHOTO') },
                    { id: 'guru', label: t('archiveSubTabMasterPick', 'KÉPMESTER KIEMELÉS') }
                  ].map(sTab => (
                    <span key={sTab.id} onClick={() => setActiveRankSubTab(sTab.id as any)} style={{ color: activeRankSubTab === sTab.id ? '#38bdf8' : 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer', borderBottom: activeRankSubTab === sTab.id ? '2px solid #38bdf8' : 'none', paddingBottom: '9px', marginBottom: '-9px', transition: 'all 0.15s' }}>
                      {sTab.label}
                    </span>
                  ))}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeRankSubTab === 'photo' ? (
                    singlePhotosRankedList.map((entry, idx) => {
                      const photoScore = entry.fair_score !== undefined ? entry.fair_score : (entry.archive_likes || entry.likes_count || 0);
                      
                      return (
                        <div key={entry.id} onClick={() => setActiveArchiveEntry(entry)} style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-main)', padding: '10px 16px', borderRadius: '4px', border: '1px solid var(--border-main)', cursor: 'pointer', transition: 'all 0.1s' }} className="hof-row-card">
                          <div style={{ fontSize: '0.9rem', fontWeight: '700', width: '30px', color: 'var(--text-muted)' }}>
                            {idx === 0 ? <Crown size={12} color="#fbbf24" fill="#fbbf24" /> :
                             idx === 1 ? <Trophy size={12} color="var(--text-body)" /> :
                             idx === 2 ? <Trophy size={12} color="#b45309" /> :
                             <span>#{idx + 1}</span>}
                          </div>
                          <img src={getImageUrl(entry.drive_file_id, entry.file_url)} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', margin: '0 12px', backgroundColor: '#000', border: '1px solid var(--border-main)' }} onError={handleLocalImageError} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ color: 'var(--text-title)', display: 'block', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.user_name}</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                              {computeArchiveRank(entry.rank_level, Number(photoScore))} {entry.title ? `• "${entry.title}"` : ''}
                            </span>
                            
                            <div style={{ fontSize: '0.72rem', color: entry?.has_user_liked ? '#f87171' : 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: entry?.has_user_liked ? 'bold' : 'normal' }}>
                              <Heart size={10} fill={entry?.has_user_liked ? '#f87171' : 'transparent'} /> 
                              <span>{entry?.archive_likes || 0} dicséret</span>
                            </div>
                          </div>
                          
                          <div style={{ color: 'var(--text-title)', fontWeight: '700', fontSize: '0.95rem', textAlign: 'right', marginLeft: '10px' }}>
                            {entry.fair_score !== undefined ? `${entry.fair_score} FP` : `${entry.likes_count} ⭐`}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    guruTopPicksList.map(entry => (
                      <div key={entry.id} onClick={() => setActiveArchiveEntry(entry)} style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-main)', padding: '10px 16px', borderRadius: '4px', border: '1px solid rgba(167,139,250,0.25)', cursor: 'pointer', transition: 'all 0.1s' }} className="hof-row-card">
                        <Sparkles size={12} color="#a78bfa" style={{ width: '22px', flexShrink: 0 }} />
                        <img src={getImageUrl(entry.drive_file_id, entry.file_url)} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', margin: '0 12px', backgroundColor: '#000', border: '1px solid var(--border-main)' }} onError={handleLocalImageError} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ color: 'var(--text-title)', display: 'block', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.user_name}</strong>
                          <span style={{ color: '#a78bfa', fontSize: '0.75rem', display: 'block', fontWeight: '500' }}>{t('archiveHighlightedByMaster', 'Képmester Kiemelés')}</span>
                    
                          <div style={{ fontSize: '0.72rem', color: entry?.has_user_liked ? '#f87171' : 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: entry?.has_user_liked ? 'bold' : 'normal' }}>
                            <Heart size={10} fill={entry?.has_user_liked ? '#f87171' : 'transparent'} /> 
                            <span>{entry?.archive_likes || 0} dicséret</span>
                          </div>
                        </div>
                        <div style={{ color: '#a78bfa', fontWeight: '700', fontSize: '0.85rem', textAlign: 'right', marginLeft: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PICK</div>
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

      {/* INTERAKTÍV KIBESZÉLŐ ÉS HOZZÁSZÓLÁS MODÁL */}
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

      {/* REJTETT PLAKÁT-GENERÁLÓ SABLON ADMINOKNAK */}
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
                {t('archivePosterHeader', 'Challenge RESULTS')}
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
                    <div style={{ color: '#fdba74', fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>
                      {adminPosterData.entries[1].fair_score !== undefined ? `${adminPosterData.entries[1].fair_score} pont` : `${adminPosterData.entries[1].likes_count} pont`}
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
                      {adminPosterData.entries[0].fair_score !== undefined ? `${adminPosterData.entries[0].fair_score} pont` : `${adminPosterData.entries[0].likes_count} pont`}
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
                  <div style={{ background: 'linear-gradient(180deg, #7c2d12 0%, #431407 100%)', width: '100%', height: '200px', borderRadius: '16px 16px 0 0', border: '1px solid #7c2d12', borderBottom: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '15px', boxSizing: 'border-box' }}>
                    <div style={{ color: '#fdba74', fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>
                      {adminPosterData.entries[2].fair_score !== undefined ? `${adminPosterData.entries[2].fair_score} pont` : `${adminPosterData.entries[2].likes_count} pont`}
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

      <style>{`
        .hof-row-card:hover {
          border-color: var(--text-body) !important;
          background: var(--hover-overlay) !important;
        }
        @media (max-width: 600px) {
          .archive-details-pane {
            border-left: none !important;
            padding-left: 0 !important;
            margin-top: 10px;
          }
        }
      `}</style>
    </div>
  );
}
