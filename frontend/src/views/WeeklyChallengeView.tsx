import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';
import { toPng } from 'html-to-image'; 
import MyArenaAlbumView from './MyArenaAlbumView'; // ➕ ÚJ IMPORT SOR

interface WeeklyChallengeViewProps {
  user: any;
  setFullscreenData: (data: any) => void;
}

// ====================================================================
// 📊 GLOBÁLIS SEGÉDFÜGGVÉNYEK
// ====================================================================
const getTopicType = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return 'weekly';
  const durationDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  return durationDays <= 2 ? 'daily' : 'weekly';
};

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.src = 'https://via.placeholder.com/400x300/1e293b/64748b?text=Kép+nem+található';
};

const getLevelDetails = (likes: number, victories: number) => {
  if (likes < 20) return { name: 'Újonc 🌱', color: '#94a3b8', bg: '#94a3b815' };
  if (likes < 100) return { name: 'Felfedezett 📸', color: '#38bdf8', bg: '#38bdf815' };
  if (likes < 300 || victories < 1) return { name: 'Haladó ⭐', color: '#10b981', bg: '#10b98115' };
  if (likes < 800 || victories < 3) return { name: 'Profi 🏅', color: '#f59e0b', bg: '#f59e0b15' };
  return { name: 'Guru 👑', color: '#fbbf24', bg: '#fbbf2420' };
};


// ====================================================================
// ⏳ SEGÉDKOMPONENS: Önálló kártya saját belső visszaszámlálóval
// ====================================================================
// JAVÍTVA: Most már a user objektumot is elkéri a kártya propként
function ChallengeCard({ topic, onSelect }: { topic: any; onSelect: () => void }) {
   const [timeLeft, setTimeLeft] = useState<string>('Számítás...');

  useEffect(() => {
    if (!topic || !topic.end_date) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(topic.end_date?.replace ? topic.end_date.replace(' ', 'T') : topic.end_date); 
      
      if (isNaN(end.getTime())) {
        setTimeLeft('Hibás dátum');
        return false;
      }

      end.setHours(23, 59, 59, 999);
      const distance = end.getTime() - now;

      if (distance < 0) {
        setTimeLeft('Párbaj Lezárult!');
        return false;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
      const seconds = Math.floor((distance % (1000 * 60)) / 1000).toString().padStart(2, '0');

      if (days > 0) {
        setTimeLeft(`${days} nap ${hours}:${minutes}:${seconds}`);
      } else {
        setTimeLeft(`${hours}:${minutes}:${seconds}`);
      }
      return true;
    };

    calculateTimeLeft();
    const interval = setInterval(() => {
      const stillActive = calculateTimeLeft();
      if (!stillActive) clearInterval(interval);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [topic.id, topic.end_date]);

  const isDaily = getTopicType(topic.start_date, topic.end_date) === 'daily';


  // JAVÍTVA: Egyszerűen csak kiolvassuk, amit a backend küldött! Nem kell hozzá a user prop sem!
  const isMaster = topic.isMaster === true;
  
  const statusColor = isMaster ? '#a78bfa' : (topic.hasEntered ? '#10b981' : '#f59e0b');

  return (
    <div 
      onClick={onSelect}
      style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', borderRadius: '20px', border: '1px solid #334155', padding: '25px', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 10px 25px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', position: 'relative' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = isDaily ? '#ef4444' : '#3b82f6'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#334155'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <span style={{ background: isDaily ? '#ef444420' : '#3b82f620', color: isDaily ? '#f87171' : '#60a5fa', border: `1px solid ${isDaily ? '#ef444450' : '#3b82f650'}`, padding: '4px 12px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold' }}>
          {isDaily ? '🔴 Napi Pörgős' : '🔵 Heti Klasszikus'}
        </span>
        
        <span style={{ color: statusColor, fontSize: '0.85rem', fontWeight: 'bold' }}>
          {isMaster 
            ? '🚀 Párbajmester vagy' 
            : topic.hasEntered 
              ? '🚀 Neveztél' 
              : '⏳ Még nem neveztél'
          }
        </span>
      </div>

      <h3 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '1.4rem', fontWeight: 'bold' }}>{topic.title}</h3>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 20px 0', lineHeight: '1.5', flex: 1 }}>{topic.description}</p>
      
      {(topic.master_name || topic.master_email) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a78bfa', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '15px', background: '#a78bfa10', padding: '8px 14px', borderRadius: '10px', border: '1px solid #a78bfa20', width: 'fit-content' }}>
          <span>👑 Párbajmester:</span>
          <span style={{ color: '#e9d5ff', fontWeight: 'bold' }}>{topic.master_name || topic.master_email}</span>
        </div>
      )}

      <div style={{ background: '#00000040', padding: '12px 15px', borderRadius: '12px', fontSize: '0.9rem', color: isDaily ? '#f87171' : '#38bdf8', textAlign: 'center', border: '1px solid #1e293b', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
        ⏳ Hátralévő idő: {timeLeft}
      </div>
    </div>
  );
}



// ====================================================================
// ⚔️ FŐ KOMPONENS
// ====================================================================
export default function WeeklyChallengeView({ user, setFullscreenData }: WeeklyChallengeViewProps) {
  const [subTab, setSubTab] = useState<'current' | 'upcoming' | 'past' | 'my_stats' | 'hall_of_fame' | 'arena_album'>('current');
  const [loading, setLoading] = useState(true);
  const [myReferralCode, setMyReferralCode] = useState<string>('');
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [referralInput, setReferralInput] = useState<string>('');
  const [isClaimingReferral, setIsClaimingReferral] = useState<boolean>(false);
  const [masterVotesLeft, setMasterVotesLeft] = useState<number>(0);
  const [isMaster, setIsMaster] = useState<boolean>(false);         

  const [activeTopics, setActiveTopics] = useState<any[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);

  const [topic, setTopic] = useState<any>(null);
  const [myEntry, setMyEntry] = useState<any>(null);
  const [myPastEntries, setMyPastEntries] = useState<any[]>([]); 
  const [swapBalance, setSwapBalance] = useState<number>(3);     
  const [myVoteCount, setMyVoteCount] = useState(0);
  const [votableEntries, setVotableEntries] = useState(1);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const [upcomingTopics, setUpcomingTopics] = useState<any[]>([]);
  const [pastTopics, setPastTopics] = useState<any[]>([]);
  const [selectedPastTopicId, setSelectedPastTopicId] = useState<number | null>(null);
  const [pastLeaderboard, setPastLeaderboard] = useState<any[]>([]);
  const [pastClubLeaderboard, setPastClubLeaderboard] = useState<any[]>([]);
  const [currentClubLeaderboard, setCurrentClubLeaderboard] = useState<any[]>([]);

  const [voteEntry, setVoteEntry] = useState<any>(null);
  const [noMoreEntries, setNoMoreEntries] = useState(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [swapFile, setSwapFile] = useState<File | null>(null);
  const [swapPreview, setSwapPreview] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);

  const [myStats, setMyStats] = useState<{podiums: any, history: any[]} | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const [timeLeft, setTimeLeft] = useState<string>('');

  const [userTotalLikes, setUserTotalLikes] = useState<number>(0);
  const [userVictories, setUserVictories] = useState<number>(0); 

  const [userPower, setUserPower] = useState<{ super: number; brilliant: number }>({ super: 1, brilliant: 2 });

  const [hallOfFame, setHallOfFame] = useState<any[]>([]);
  const [isLoadingHof, setIsLoadingHof] = useState(false);

  const [activeShareData, setActiveShareData] = useState<any | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const [shareBase64, setShareBase64] = useState<string | null>(null);
  const [loadingShareImg, setLoadingShareImg] = useState(false);

  // ====================================================================
  // 👑 JAVÍTVA: Biztonságos Base64 betöltés trófeakártyákhoz (Drive és Cloudinary támogatás)
  // ====================================================================
  useEffect(() => {
    if (!activeShareData) {
      setShareBase64(null);
      return;
    }
    setLoadingShareImg(true);
    
    // Eldöntjük, hogy a régi Google Drive API-t vagy az új szupergyors proxy-t hívjuk meg
    const fetchUrl = activeShareData.drive_file_id 
      ? `${BACKEND_URL}/api/image-base64/${activeShareData.drive_file_id}`
      : `${BACKEND_URL}/api/admin/base64-proxy?url=${encodeURIComponent(activeShareData.file_url)}`;

    fetch(fetchUrl)
      .then(res => res.json())
      .then(data => {
        if (data.base64) setShareBase64(data.base64);
        setLoadingShareImg(false);
      })
      .catch(err => {
        console.error("Hiba a megosztó kép letöltésekor:", err);
        setLoadingShareImg(false);
      });
  }, [activeShareData]);

  const totalViews = myStats?.history?.reduce((sum, e) => sum + (Number(e?.views) || 0), 0) || 0;
  const podiumCount = myStats ? (Number(myStats.podiums?.first || 0) + Number(myStats.podiums?.second || 0) + Number(myStats.podiums?.third || 0)) : 0;
  
  let top10Count = 0;
  let top20Count = 0;
  if (myStats?.history) {
    myStats.history.forEach(e => {
      const entriesCount = Number(e?.total_entries) || 1;
      const percentile = (Number(e?.rank) || 1) / entriesCount;
      if (percentile <= 0.1 && (Number(e?.rank) || 0) > 3) top10Count++;
      if (percentile > 0.1 && percentile <= 0.2) top20Count++;
    });
  }

  const currentLevel = getLevelDetails(userTotalLikes, userVictories);
  const progressPercent = userTotalLikes < 20 ? (userTotalLikes / 20) * 100 :
                          userTotalLikes < 100 ? (userTotalLikes / 100) * 100 :
                          userTotalLikes < 300 ? (userTotalLikes / 300) * 100 :
                          userTotalLikes < 800 ? (userTotalLikes / 800) * 100 : 100;
  const nextLevelAt = userTotalLikes < 20 ? 20 : userTotalLikes < 100 ? 100 : userTotalLikes < 300 ? 300 : userTotalLikes < 800 ? 800 : null;

  const BASE_EXPOSURE = 10;
  const exposureEarned = BASE_EXPOSURE + (Number(myVoteCount || 0) * 2);
  const safeViewsCount = myEntry ? (Number(myEntry.views_count) || 0) : 0;
  const viewsRemaining = myEntry ? (exposureEarned - safeViewsCount) : 0;
  const rawPercentage = myEntry ? ((viewsRemaining / 15) * 100) : 0;
  const exposurePercentage = isNaN(rawPercentage) || !isFinite(rawPercentage) ? 0 : Math.min(100, Math.max(0, rawPercentage));

  let exposureColor = '#ef4444';
  let exposureLabel = viewsRemaining <= 0 ? 'Láthatatlan (0%)' : 'Alacsony';
  if (exposurePercentage >= 80) { exposureColor = '#10b981'; exposureLabel = 'Maximális'; } 
  else if (exposurePercentage >= 40) { exposureColor = '#f59e0b'; exposureLabel = 'Közepes'; }

  useEffect(() => {
    setTopic(null);
    setMyEntry(null);
    setMyPastEntries([]);
    setVoteEntry(null);
    setLeaderboard([]);
    setCurrentClubLeaderboard([]);
    setNoMoreEntries(false);
    setTimeLeft('');
    setMasterVotesLeft(0); 
    setIsMaster(false);     
  }, [selectedTopicId]);


  const fetchCurrentTopic = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const url = selectedTopicId 
        ? `${BACKEND_URL}/api/weekly/current?userEmail=${user?.email || ''}&topicId=${selectedTopicId}`
        : `${BACKEND_URL}/api/weekly/current?userEmail=${user?.email || ''}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        
        if (data.userTotalLikes !== undefined) setUserTotalLikes(data.userTotalLikes);
        if (data.userVictories !== undefined) setUserVictories(data.userVictories);
        if (data.masterVotesLeft !== undefined) setMasterVotesLeft(data.masterVotesLeft); 
        if (data.isMaster !== undefined) setIsMaster(data.isMaster);                     

        if (data.myReferralCode !== undefined) setMyReferralCode(data.myReferralCode);
        if (data.referredBy !== undefined) setReferredBy(data.referredBy);

        if (data.userPower) setUserPower(data.userPower);
        if (data.swapBalance !== undefined) setSwapBalance(data.swapBalance); 

        if (!selectedTopicId) {
          setActiveTopics(data.activeTopics || []);
        } else {
          if (data && data.topic) {
            setTopic(data.topic);
            setMyEntry(data.myEntry);
            setMyPastEntries(data.myPastEntries || []); 
            setMyVoteCount(Number(data.myVoteCount) || 0);
            setVotableEntries(Number(data.votableEntries) || 1);
            setLeaderboard(data.leaderboard || []);
            setCurrentClubLeaderboard(data.clubLeaderboard || []);
            if (!isSilent) fetchNextVote(data.topic.id);
          }
        }
      }
    } catch (e) { console.error(e); }
    finally { if (!isSilent) setLoading(false); }
  };

  const fetchNextVote = async (topicId: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/next-vote?topicId=${topicId}&userEmail=${user?.email || ''}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.entry) { setVoteEntry(data.entry); setNoMoreEntries(false); } 
        else { setVoteEntry(null); setNoMoreEntries(true); }
      }
    } catch (e) { console.error(e); }
  };

  const fetchMyStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/my-stats?userEmail=${user?.email || ''}`);
      if (res.ok) {
          const data = await res.json();
          if (data && data.history && data.podiums) {
             setMyStats(data);
          } else {
             setMyStats({ podiums: { first: 0, second: 0, third: 0 }, history: [] });
          }
      }
    } catch (error) { console.error(error); } 
    finally { setIsLoadingStats(false); }
  };

  const fetchHallOfFame = async () => {
    setIsLoadingHof(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/hall-of-fame`);
      if (res.ok) {
        setHallOfFame(await res.json());
      }
    } catch (e) { console.error(e); }
    finally { setIsLoadingHof(false); }
  };

  useEffect(() => {
    if (subTab === 'current') {
      fetchCurrentTopic(false);
      fetchMyStats();
    }
    else if (subTab === 'upcoming') fetch(`${BACKEND_URL}/api/weekly/upcoming`).then(res => res.json()).then(data => setUpcomingTopics(data || [])).catch(console.error);
    else if (subTab === 'past') fetch(`${BACKEND_URL}/api/weekly/past`).then(res => res.json()).then(data => setPastTopics(data || [])).catch(console.error);
    else if (subTab === 'hall_of_fame') fetchHallOfFame();
  }, [subTab, selectedTopicId]);

  useEffect(() => {
    if (!topic || !topic.end_date) {
      setTimeLeft('Ismeretlen dátum');
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(topic.end_date?.replace ? topic.end_date.replace(' ', 'T') : topic.end_date); 
      
      if (isNaN(end.getTime())) {
        setTimeLeft('Hibás dátum');
        return false;
      }

      end.setHours(23, 59, 59, 999);
      const distance = end.getTime() - now;

      if (distance < 0) {
        setTimeLeft('Párbaj Lezárult!');
        return false;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
      const seconds = Math.floor((distance % (1000 * 60)) / 1000).toString().padStart(2, '0');

      setTimeLeft(`${days} nap ${hours}:${minutes}:${seconds}`);
      return true;
    };

    const isActive = calculateTimeLeft();
    if (!isActive) return;

    const interval = setInterval(() => {
      const stillActive = calculateTimeLeft();
      if (!stillActive) clearInterval(interval);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [topic]);

  const loadPastHistoryList = async (topicId: number) => {
    setSelectedPastTopicId(topicId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/history/${topicId}`);
      if (res.ok) {
        const data = await res.json();
        setPastLeaderboard(data.leaderboard || []);
        setPastClubLeaderboard(data.clubLeaderboard || []);
      }
    } catch (e) { console.error(e); }
  };

  const handleOffTopicReport = async (entryId: number) => {
    if (!window.confirm("Biztosan jelented ezt a képet, mert nem illik a témához?")) return;
    
    setVoteEntry(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/report-off-topic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, userEmail: user?.email || '' })
      });
      
      if (res.ok) {
        alert("🚫 Jelentve! A kép eltűnt a párbajodból.");
        setMyVoteCount(prev => prev + 1);
        if (topic) {
          fetchNextVote(topic.id);
          fetchCurrentTopic(true); 
        }
      }
    } catch (e) {
      alert("Hiba a jelentés során.");
      if (topic) fetchNextVote(topic.id);
    }
  };
  
  const handleVote = async (type: 'pass' | 'super' | 'brilliant' | 'master') => {
    if (!voteEntry || !topic) return;
    const oldEntryId = voteEntry.id;
    setVoteEntry(null); 
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/vote`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: oldEntryId, userEmail: user?.email || '', voteType: type })
      });
      if (res.ok) {
        setMyVoteCount(prev => prev + 1);
        fetchNextVote(topic.id);
        fetchCurrentTopic(true); 
      }
    } catch (e) { if(topic) fetchNextVote(topic.id); }
  };

  const handleClaimReferral = async () => {
    if (!referralInput.trim()) return;
    setIsClaimingReferral(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/claim-referral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user?.email, referralCode: referralInput })
      });
      if (res.ok) {
        alert("🎉 Sikeres érvényesítés! A meghívód megkapta a +10 db ajándék Joker cserét.");
        setReferredBy(referralInput); 
        fetchCurrentTopic(true);      
      } else {
        const err = await res.json();
        alert(err.error || "Hiba történt a kód beváltása során.");
      }
    } catch (e) { alert("Hálózati hiba!"); }
    finally { setIsClaimingReferral(false); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadFile(file); uploadPreview && URL.revokeObjectURL(uploadPreview); setUploadPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !topic) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', uploadFile); formData.append('topicId', topic.id.toString()); formData.append('userEmail', user?.email || ''); formData.append('userName', user?.name || '');
      const res = await fetch(`${BACKEND_URL}/api/weekly/upload`, { method: 'POST', body: formData });
      if (res.ok) { alert('🎉 Sikeres nevezés! Irány szavazni!'); setUploadFile(null); setUploadPreview(null); fetchCurrentTopic(false); } 
      else { const err = await res.json(); alert(err.error); }
    } catch (e) { alert("Feltöltési hiba!"); }
    finally { setIsUploading(false); }
  };

  const handleSwapFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSwapFile(file); swapPreview && URL.revokeObjectURL(swapPreview); setSwapPreview(URL.createObjectURL(file));
    }
  };

  const handleSwapSubmit = async () => {
    if (!swapFile || !topic) return;
    if (!window.confirm("⚠️ Biztosan elhasználsz 1 Joker cserét? Az új képed 0 pontról fog indulni, de a korábbi képedet bármikor visszahozhatod!")) return;
    setIsSwapping(true);
    try {
      const formData = new FormData();
      formData.append('photo', swapFile); formData.append('topicId', topic.id.toString()); formData.append('userEmail', user?.email || ''); formData.append('userName', user?.name || '');
      const res = await fetch(`${BACKEND_URL}/api/weekly/swap`, { method: 'POST', body: formData });
      if (res.ok) { alert('🔄 Kép sikeresen lecserélve! Újra indul a harc!'); setSwapFile(null); setSwapPreview(null); fetchCurrentTopic(false); } 
      else { const err = await res.json(); alert(err.error); }
    } catch (e) { alert("Hiba a csere során!"); }
    finally { setIsSwapping(false); }
  };

  const handleSwapBackSubmit = async (entryId: number) => {
    if (swapBalance < 1) return alert("Nincs elég Joker cseréd a számládon!");
    if (!window.confirm("↩️ Biztosan visszatérsz erre a korábbi fotódra? Ez 1 Joker cserédbe kerül, de a kép azonnal visszakapja az összes korábban itt gyűjtött csillagát!")) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/swap-back`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: topic.id, userEmail: user?.email, entryId })
      });
      if (res.ok) {
        alert("↩️ Fotó sikeresen visszaaktiválva!");
        fetchCurrentTopic(false);
      } else {
        const err = await res.json();
        alert(err.error || "Hiba a visszaváltás során.");
      }
    } catch (e) { alert("Hálózati hiba!"); }
  };

  const handleExecuteShare = async () => {
    const node = document.getElementById('share-card-node');
    if (!node || !activeShareData) return;
    
    setIsGeneratingImage(true);
    try {
      await toPng(node, { cacheBust: true });
      const dataUrl = await toPng(node, { cacheBust: true, quality: 1.0 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `Parbaj_Award_${activeShareData.topic_title}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Fotóklub Párbaj Trófea',
          text: `🎉 Elértem a(z) ${activeShareData.rank}. helyezést a "${activeShareData.topic_title}" fotós párbajban! ⭐`
        });
      } else {
        const link = document.createElement('a');
        link.download = `Parbaj_Trofea_${activeShareData.topic_title}.png`;
        link.href = dataUrl;
        link.click();
      }
      setActiveShareData(null);
     } catch (e) {
      alert('Sajnos hiba történt a kép generálása közben.');
      console.error(e);
    } finally { 
      setIsGeneratingImage(false);
    }
  };
  
  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '10px', background: '#0f172a', padding: '10px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', width: 'fit-content', flexWrap: 'wrap', border: '1px solid #1e293b' }}>
        <button onClick={() => { setSubTab('current'); setSelectedTopicId(null); }} ...>⚔️ Aréna</button>
        <button onClick={() => setSubTab('upcoming')} ...>⏳ Hamarosan</button>
        <button onClick={() => setSubTab('past')} ...>📜 Archívum</button>
        
        {/* ➕ ÚJ SUB-TAB GOMB: Képtáram */}
        <button 
          onClick={() => setSubTab('arena_album')} 
          style={{ 
            padding: '10px 24px', 
            borderRadius: '10px', 
            border: 'none', 
            cursor: 'pointer', 
            fontWeight: 'bold', 
            background: subTab === 'arena_album' ? 'linear-gradient(135deg, #14b8a6, #0d9488)' : 'transparent', 
            color: subTab === 'arena_album' ? 'white' : '#94a3b8', 
            transition: 'all 0.3s', 
            boxShadow: subTab === 'arena_album' ? '0 4px 15px rgba(20,184,166,0.4)' : 'none' 
          }}
        >
          🖼️ Képtáram
        </button>

  <button onClick={() => { setSubTab('my_stats'); fetchMyStats(); }} ...>🏆 Trófeaterem</button>
  <button onClick={() => setSubTab('hall_of_fame')} ...>👑 Dicsőségfal</button>
</div>
        
        <button onClick={() => setShowHelp(true)} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #38bdf8', cursor: 'pointer', fontWeight: 'bold', background: '#0f172a', color: '#38bdf8', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(56,189,248,0.2)' }}>
          <span style={{ fontSize: '1.2rem' }}>📖</span> Játékszabályok & Rangok
        </button>
      </div>

      {subTab === 'current' && (
        <>
          {selectedTopicId === null ? (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ color: 'white', margin: 0, fontSize: '1.8rem' }}>🔥 Aktuális Kihívások</h2>
                <p style={{ color: '#94a3b8', margin: '5px 0 0 0' }}>Válassz egyet az alábbi futó párbajok közül, és lépj be a küzdelembe!</p>
          <span style={{ background: '#ef444420', color: '#f87171', border: '1px solid #ef444450', padding: '4px 12px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold' }}>
  {'🔴 Figyelem: a napokban a játék képszerverét költöztetem egy gyorsabb helyre, elképzelhető, hogy lesznek kimaradások. Türelmetek, megértésetek köszönöm!'}
</span>

              </div>

              {loading ? (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '50px' }}>⏳ Betöltés...</div>
              ) : activeTopics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'linear-gradient(180deg, #1e293b, #0f172a)', borderRadius: '24px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>😴</div>
                  <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '2rem' }}>Jelenleg nincs egyetlen aktív párbaj sem!</h2>
                  <p style={{ color: '#94a3b8' }}>Pihenj meg, hamarosan új kihívás érkezik.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px', marginTop: '20px' }}>
                  {activeTopics.map((t) => (
                    // JAVÍTVA: Átadjuk az isMaster változót propként!
                    <ChallengeCard 
                      key={t.id} 
                      topic={t} 
                      onSelect={() => setSelectedTopicId(t.id)} 
                      isMaster={isMaster}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <button 
                  onClick={() => { setSelectedTopicId(null); }} 
                  style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '8px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', transition: 'all 0.2s' }}
                >
                  ⬅️ Vissza a kihívásokhoz
                </button>
              </div>

              {(!topic || loading) ? (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '50px' }}>⏳ Aréna szoba előkészítése...</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '30px' }}>
                  
                  {/* ── BAL OLDALI OSZLOP Container ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    
                    {/* TÉMA INFÓ KÁRTYA */}
                    <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '30px', borderRadius: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '8rem', opacity: 0.05 }}>🔥</div>
                      <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '1.8rem', textAlign: 'center', zIndex: 1 }}>{topic.title}</h3>
                      <p style={{ margin: '0 0 20px 0', color: '#cbd5e1', fontSize: '0.95rem', textAlign: 'center', zIndex: 1, lineHeight: '1.6' }}>{topic.description}</p>
                      
                      <div style={{ background: '#00000080', padding: '15px 30px', borderRadius: '100px', border: '1px solid #ef444450', backdropFilter: 'blur(10px)', zIndex: 1 }}>
                        <div style={{ fontSize: '0.75rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', marginBottom: '5px' }}>Hátralévő Idő</div>
                        <div style={{ color: '#f8fafc', fontSize: '1.5rem', fontWeight: '900', fontFamily: 'monospace', letterSpacing: '1px' }}>{timeLeft || 'Számítás...'}</div>
                      </div>
                    </div>
                    
                    {/* EXPO / LÁTHATÓSÁGI MÉRŐ */}
                    {!isMaster && (
                      <div style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', padding: '25px 15px', borderRadius: '24px', border: `1px solid ${exposureColor}40`, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: `0 10px 40px -10px ${exposureColor}30`, transition: 'all 0.5s ease' }}>
                        <h4 style={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 15px 0', fontSize: '0.85rem', textAlign: 'center' }}>Láthatósági Mérő</h4>
                        
                        <div style={{ position: 'relative', width: '100%', maxWidth: '240px', margin: '0 auto' }}>
                          <svg viewBox="0 0 200 120" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
                            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1e293b" strokeWidth="16" strokeLinecap="round" />
                            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={exposureColor} strokeWidth="16" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - exposurePercentage} />
                          </svg>
                          
                          <div style={{ position: 'absolute', bottom: '15px', left: '0', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ fontSize: '2.8rem', fontWeight: '900', color: exposureColor, lineHeight: '1' }}>
                              {Math.round(exposurePercentage)}<span style={{ fontSize: '1.2rem' }}>%</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#f8fafc', textTransform: 'uppercase', marginTop: '5px', letterSpacing: '2px' }}>
                              {exposureLabel}
                            </div>
                          </div>
                        </div>

                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '15px 0 0 0', textAlign: 'center', lineHeight: '1.6' }}>
                          {!myEntry ? 'Töltsd fel a képedet az induláshoz, és kapsz 10 alap energiát!' : voteEntry ? '⚡ Új fotó érkezett az Arénába (vagy valaki Jokert használt)! Értékelt, hogy a mérőd újra maxon pörögjön!' : '🔥 A képed a maximumon pörög! Jelenleg nincs több értékelhető kép az Arénában.'}
                        </p>
                      </div>
                    )}

                    {/* ÉRTÉKELŐ ARÉNA PULT */}
                    <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                      <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '1.4rem' }}>⚔️ Értékelő Aréna</h3>
                      
                      {(!myEntry && !isMaster) ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center', background: '#0f172a', borderRadius: '166px', border: '2px dashed #f59e0b' }}>
                          <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>🛑</div>
                          <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '1.3rem' }}>Nincs szavazati jogod!</h4>
                          <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>A küzdelembe való belépéshez először be kell nevezned egy saját fotóval!</p>
                        </div>
                      ) : noMoreEntries ? (
                        <div style={{ padding: '50px 20px', textAlign: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '16px', border: '1px solid #10b981' }}>
                          <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🎉</div>
                          <h4 style={{ color: '#10b981', margin: '0 0 10px 0', fontSize: '1.5rem' }}>Mindent értékeltél!</h4>
                          <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>Várj, amíg a többiek is töltenek fel új képeket.</p>
                        </div>
                      ) : voteEntry ? (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div onClick={() => setFullscreenData({url: getImageUrl(voteEntry.drive_file_id, voteEntry.file_url), title: 'Kihívás'})} style={{ width: '100%', height: '380px', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-in', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }}>
                            <img src={getImageUrl(voteEntry.drive_file_id, voteEntry.file_url)} alt="Szavazás" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={handleImageError} />
                          </div>
                          
                          {voteEntry.off_topic_count > 0 && (
                            <div style={{ background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b40', padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '15px', display: 'inline-flex', alignItems: 'center', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                              ⚠️ {voteEntry.off_topic_count} játékos szerint ez a kép Off-Topic vagy AI generált!
                            </div>
                          )}
                          
                          <div style={{ display: 'flex', gap: '12px', width: '100%', flexDirection: 'column' }}>
                            {isMaster && masterVotesLeft > 0 && (
                              <button 
                                onClick={() => handleVote('master')} 
                                style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #fbbf24, #d97706)', color: '#0f172a', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 15px rgba(251,191,36,0.4)', marginBottom: '6px' }}
                              >
                                👑 Párbajmester Különdíj (+10 pont) <br/>
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.8 }}>Még {masterVotesLeft} db szavazatod maradt</span>
                              </button>
                            )}

                            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                              <button onClick={() => handleVote('super')} style={{ flex: 1, padding: '15px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                                ✨ Szuper <br/><span style={{fontSize: '0.8rem', fontWeight: 'normal'}}>+{userPower.super} pont</span>
                              </button>
                              <button onClick={() => handleVote('brilliant')} style={{ flex: 1, padding: '15px', background: 'linear-gradient(135deg, #f97316, #ef4444)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                                🔥 Zseniális <br/><span style={{fontSize: '0.8rem', fontWeight: 'normal'}}>+{userPower.brilliant} pont</span>
                              </button>
                            </div>
                            <button onClick={() => handleVote('pass')} style={{ width: '100%', padding: '12px', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '14px', fontSize: '0.95rem', cursor: 'pointer' }}>
                              ⏭️ Nem tetszik (0 pont)
                            </button>
                            <button 
                              onClick={() => handleOffTopicReport(voteEntry.id)}
                              style={{ width: '100%', padding: '10px 20px', background: '#ef444410', color: '#ef4444', border: '1px solid #ef444430', borderRadius: '14px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                            >
                              ⚠️ Off-Topic/AI gyanús Jelentés
                            </button>
                          </div>
                        </div>
                      ) : <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Kép betöltése...</div>}
                    </div>
                  </div>

                  {/* ── JOBB OLDALI OSZLOP Container ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    
                    {/* SAJÁT KÉP / PROFIL STATISZTIKA FORDULÓN BELÜL */}
                    <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.4rem' }}>📸 Saját Nevezésem</h3>
                        <span style={{ fontSize: '0.85rem', background: '#be123c30', color: '#fb7185', border: '1px solid #be123c60', padding: '4px 12px', borderRadius: '50px', fontWeight: 'bold' }}>
                          🃏 Joker cserék: {swapBalance} db
                        </span>
                      </div>

                      {isMaster ? (
                        <div style={{ padding: '30px 15px', background: 'linear-gradient(135deg, #4c1d9520, #1e1b4b40)', border: '1px solid #a78bfa40', borderRadius: '16px', textAlign: 'center' }}>
                          <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>👑</div>
                          <h4 style={{ color: '#a78bfa', margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 'bold' }}>Te vagy a Párbajmester!</h4>
                          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, lineHeight: '1.6' }}>
                            Ebben a párbajban te lettél felkérve a főbírónak! Saját alkotással nem nevezhetsz, cserébe kapsz 5 darab, egyenként **+10 pontot** érő Különdíjat, amit a szavazás során oszthatsz szét a kedvenc képeid között.
                          </p>
                        </div>
                      ) : myEntry ? (
                        <div>
                          <div style={{ width: '100%', height: '220px', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)' }}>
                            <img src={getImageUrl(myEntry.drive_file_id, myEntry.file_url)} alt="Saját" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={handleImageError} />
                          </div>
                          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${exposureColor}` }}>
                            <div style={{ textAlign: 'center' }}><div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Eredmény</div><div style={{ color: '#f59e0b', fontSize: '1.5rem', fontWeight: '900' }}>{myEntry.likes_count} ⭐</div></div>
                            <div style={{ textAlign: 'center' }}><div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Nézettség</div><div style={{ color: '#38bdf8', fontSize: '1.5rem', fontWeight: '900' }}>{myEntry.views_count} 👁️</div></div>
                          </div>

                          {myEntry.off_topic_count > 0 && (
                            <div style={{ background: 'linear-gradient(90deg, #ef444415, transparent)', borderLeft: '4px solid #ef4444', padding: '15px', borderRadius: '0 12px 12px 0', marginTop: '15px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                              <b style={{ color: '#ef4444', display: 'block', marginBottom: '4px', fontSize: '0.95rem' }}>
                                🚫 Figyelmeztetés: Tématévesztés gyanúja!
                              </b>
                              A képedet eddig <b>{myEntry.off_topic_count} fotóstársad</b> jelentette off-topicnak vagy gyanúsan AI-al generáltnak. Kérlek ügyelj a pontos témára, illetve ne használj AI fotót!
                            </div>
                          )}

                          {swapBalance > 0 ? (
                            <div style={{ marginTop: '25px', background: 'linear-gradient(135deg, #4c1d9520, #be123c20)', padding: '20px', borderRadius: '16px', border: '1px solid #be123c50' }}>
                              <h5 style={{ margin: '0 0 10px 0', color: '#f43f5e', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>🔄 Új Fotó Feltöltése & Csere</h5>
                              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 15px 0', lineHeight: '1.5' }}>Rosszul megy a szekér? Tölts fel egy vadonatúj fotót 1 cserepontért! Az új kép 0 pontról indul, de a mostani képedet sem veszíted el.</p>
                              <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleSwapFileSelect} style={{ color: '#cbd5e1', marginBottom: '15px', fontSize: '0.85rem', width: '100%', padding: '10px', background: '#0f172a', borderRadius: '8px' }} disabled={isSwapping} />
                              {swapPreview && <div style={{marginBottom: '15px', display: 'flex', justifyContent: 'center'}}><img src={swapPreview} alt="Swap preview" style={{maxHeight: '120px', borderRadius: '8px', border: '2px solid #e11d48'}} /></div>}
                              <button onClick={handleSwapSubmit} disabled={!swapFile || isSwapping} style={{ width: '100%', background: !swapFile ? '#334155' : 'linear-gradient(135deg, #e11d48, #be123c)', color: !swapFile ? '#94a3b8' : 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: !swapFile ? 'not-allowed' : 'pointer' }}>
                                {isSwapping ? 'Csere folyamatban...' : 'Joker Elköltése 🔄'}
                              </button>
                            </div>
                          ) : (
                            <div style={{ marginTop: '25px', background: '#0f172a', padding: '15px', borderRadius: '12px', color: '#64748b', fontSize: '0.9rem', textAlign: 'center', border: '1px dashed #475569' }}>
                              🔒 Elfogytak a globális Joker cseréid! Teljesíts jól feladatokat extra pontokért.
                            </div>
                          )}

                          {myPastEntries.length > 0 && (
                            <div style={{ marginTop: '25px', borderTop: '1px dashed #334155', paddingTop: '20px' }}>
                              <h5 style={{ margin: '0 0 12px 0', color: '#38bdf8', fontSize: '1.05rem' }}>↩️ Korábbi fotóid ebben a fordulóban</h5>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {myPastEntries.map((past, pIdx) => (
                                  <div key={pIdx} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '8px', borderRadius: '12px', border: '1px solid #1e293b' }}>
                                    <img src={getImageUrl(past.drive_file_id, past.file_url)} alt="Past" style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '6px' }} onError={handleImageError} />
                                    <div style={{ flex: 1, marginLeft: '10px' }}>
                                      <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Eltárolt korábbi állás:</div>
                                      <div style={{ fontSize: '0.9rem', color: '#fbbf24', fontWeight: 'bold' }}>{past.likes_count} ⭐ <span style={{ color: '#64748b', fontWeight: 'normal', fontSize: '0.75rem' }}>({past.views_count} 👁️)</span></div>
                                    </div>
                                    <button 
                                      onClick={() => handleSwapBackSubmit(past.id)}
                                      disabled={swapBalance < 1}
                                      style={{ background: swapBalance < 1 ? '#1e293b' : 'linear-gradient(135deg, #0284c7, #0369a1)', color: swapBalance < 1 ? '#475569' : 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: swapBalance < 1 ? 'not-allowed' : 'pointer' }}
                                    >
                                      ↩️ Visszaaktiválás
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px dashed #38bdf8' }}>
                            <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileSelect} style={{ color: '#cbd5e1', marginBottom: '15px', width: '100%', fontSize: '0.9rem' }} disabled={isUploading} />
                            {uploadPreview && <div style={{marginBottom: '20px', display: 'flex', justifyContent: 'center'}}><img src={uploadPreview} alt="Preview" style={{maxHeight: '200px', borderRadius: '12px', boxShadow: '0 5px 15px rgba(0,0,0,0.5)'}} /></div>}
                            <button onClick={handleUpload} disabled={!uploadFile || isUploading} style={{ width: '100%', background: (!uploadFile || isUploading) ? '#334155' : 'linear-gradient(135deg, #0ea5e9, #2563eb)', color: (!uploadFile || isUploading) ? '#94a3b8' : 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold' }}>
                              {isUploading ? 'Feltöltés...' : 'Nevezés és Indulás 🚀'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ÉLŐ KLUBOK CSATÁJA */}
                    <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #10b981', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ margin: 0, color: '#10b981', fontSize: '1.4rem' }}>🛡️ Klubok Csatája</h3>
                        <span style={{ fontSize: '0.8rem', background: '#ef4444', color: 'white', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold', boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)' }}>ÉLŐ</span>
                      </div>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>A 3 legjobb klubtag megmérettetése alapján.</p>
                      
                      {(!currentClubLeaderboard || currentClubLeaderboard.length === 0) ? <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px', background: '#0f172a', borderRadius: '16px' }}>Még nincs rangsorolt klub.</div> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {currentClubLeaderboard.map((club, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: '1px solid #059669', padding: '12px', borderRadius: '12px' }}>
                              <div style={{ fontSize: '1.5rem', fontWeight: '900', width: '35px', color: index === 0 ? '#fbbf24' : '#cbd5e1', textAlign: 'center' }}>{index + 1}.</div>
                              <div style={{ flex: 1, marginLeft: '10px' }}>
                                <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>{club?.club_name || 'Ismeretlen Klub'}</div>
                                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{club?.members_counted || 0} aktív tag</div>
                              </div>
                              <div style={{ color: '#10b981', fontWeight: '900', fontSize: '1.4rem' }}>{club?.total_score || 0} ⭐</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* VAK TOPLISTA */}
                    <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #f59e0b', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                      <h3 style={{ margin: '0 0 10px 0', color: '#f59e0b', fontSize: '1.4rem' }}>🏆 Vak Toplista</h3>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>A taktikázás elkerülése végett az ellenfelek kiléte titkos!</p>
                      
                      {(!leaderboard || leaderboard.length === 0) ? <div style={{ color: '#94a3b8', textAlign: 'center', padding: '30px', background: '#0f172a', borderRadius: '16px' }}>Még üres az Aréna.</div> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {[...leaderboard].sort((a, b) => {
                            const likesA = Number(a?.likes_count || 0);
                            const likesB = Number(b?.likes_count || 0);
                            const viewsA = Number(a?.views_count || 0);
                            const viewsB = Number(b?.views_count || 0);
                            if (likesB !== likesA) return likesB - likesA;
                            return viewsA - viewsB;
                          }).map((entry, index) => {
                            const isMe = entry?.user_email === user?.email;
                            const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#e2e8f0' : index === 2 ? '#cd7f32' : '#64748b';
                            
                            return (
                              <div key={entry?.id || index} style={{ display: 'flex', alignItems: 'center', background: isMe ? 'linear-gradient(90deg, #f59e0b20, #0f172a)' : '#0f172a', border: isMe ? '1px solid #f59e0b50' : '1px solid #334155', padding: '12px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: '900', width: '35px', color: rankColor, textAlign: 'center' }}>{index + 1}.</div>
                                <div onClick={() => isMe ? setFullscreenData({url: getImageUrl(entry?.drive_file_id, entry?.file_url), title: entry?.user_name || ''}) : null} style={{ width: '55px', height: '55px', backgroundColor: '#000', borderRadius: '10px', overflow: 'hidden', margin: '0 15px', cursor: isMe ? 'zoom-in' : 'default', flexShrink: 0, position: 'relative' }}>
                                  <img src={getImageUrl(entry?.drive_file_id, entry?.file_url)} alt="Top" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isMe ? 'none' : 'blur(6px) contrast(120%) saturation(150%)', transform: isMe ? 'none' : 'scale(1.2)' }} onError={handleImageError} />
                                  {!isMe && (
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <span style={{ fontSize: '1.5rem', opacity: 0.8 }}>🔒</span>
                                    </div>
                                  )}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ color: isMe ? '#f8fafc' : '#94a3b8', fontWeight: 'bold', fontStyle: isMe ? 'normal' : 'italic', fontSize: '1.05rem' }}>
                                    {isMe ? (entry?.user_name || 'Én') : 'Titkosított ellenfél'}
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Nézettség: {entry?.views_count || 0}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ color: isMe ? '#f97316' : '#94a3b8', fontWeight: '900', fontSize: '1.5rem' }}>{entry?.likes_count || 0} ⭐</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}
        </>
      )}

      {subTab === 'upcoming' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
          {(!upcomingTopics || upcomingTopics.length === 0) ? (
            <div style={{ color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center', padding: '60px', background: '#1e293b', borderRadius: '24px', border: '1px solid #334155' }}>Nincs betárazva elkövetkező téma.</div>
          ) : (
            upcomingTopics.map(t => {
              const isDaily = getTopicType(t.start_date, t.end_date) === 'daily';
              return (
                <div key={t.id} style={{ background: 'linear-gradient(180deg, #1e293b, #0f172a)', padding: '25px', borderRadius: '24px', border: '1px solid #475569', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ background: isDaily ? '#ef444420' : '#3b82f620', color: isDaily ? '#f87171' : '#60a5fa', border: `1px solid ${isDaily ? '#ef444450' : '#3b82f650'}`, padding: '4px 12px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      {isDaily ? '🔴 Napi Kihívás' : '🔵 Heti Kihívás'}
                    </span>
                  </div>
                
                  <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '1.4rem' }}>{t.title}</h4>
                  <p style={{ color: '#cbd5e1', fontSize: '0.95rem', margin: '0 0 20px 0', flex: 1, lineHeight: '1.6' }}>{t.description}</p>
                  
                  {(t.master_name || t.master_email) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a78bfa', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '15px', background: '#a78bfa10', padding: '8px 14px', borderRadius: '10px', border: '1px solid #a78bfa20', width: 'fit-content' }}>
                      <span>👑 Párbajmester:</span>
                      <span style={{ color: '#e9d5ff', fontWeight: 'bold' }}>{t.master_name || t.master_email}</span>
                    </div>
                  )}

                  <div style={{ color: '#38bdf8', fontSize: '0.9rem', background: '#0f172a', padding: '15px', borderRadius: '12px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #38bdf840' }}>
                    ⏳ Start: {new Date(t.start_date).toLocaleDateString('hu-HU')}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {subTab === 'past' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
          
          <div style={{ background: '#1e293b', borderRadius: '24px', padding: '25px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#60a5fa', fontSize: '1.4rem' }}>📚 Lezárult Kihívások</h3>
            {(!pastTopics || pastTopics.length === 0) ? <div style={{color: '#94a3b8', textAlign: 'center'}}>Nincs lezárt kihívás.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pastTopics.map(t => {
                  const isDaily = getTopicType(t.start_date, t.end_date) === 'daily';
                  return (
                    <div key={t.id} onClick={() => loadPastHistoryList(t.id)} style={{ padding: '15px 20px', background: selectedPastTopicId === t.id ? 'linear-gradient(90deg, #3b82f640, #0f172a)' : '#0f172a', border: selectedPastTopicId === t.id ? '1px solid #3b82f6' : '1px solid #334155', borderRadius: '12px', cursor: 'pointer', color: 'white', fontWeight: selectedPastTopicId === t.id ? 'bold' : 'normal', transition: 'all 0.2s' }}>
                      {isDaily ? '🔴 ' : '🔵 '} {t.title}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            <div style={{ background: '#1e293b', borderRadius: '24px', padding: '25px', border: '1px solid #10b981', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, color: '#10b981', fontSize: '1.4rem' }}>🛡️ Klubok Csatája</h3>
                {selectedPastTopicId && (() => {
                  const t = pastTopics.find(x => x.id === selectedPastTopicId);
                  if (!t) return null;
                  const isDaily = getTopicType(t.start_date, t.end_date) === 'daily';
                  return (
                    <span style={{ fontSize: '0.75rem', background: isDaily ? '#ef444420' : '#3b82f620', color: isDaily ? '#f87171' : '#60a5fa', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold', border: `1px solid ${isDaily ? '#ef444450' : '#3b82f650'}` }}>
                      {isDaily ? 'Napi' : 'Heti'}
                    </span>
                  );
                })()}
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0 0 20px 0' }}>Csak a 3 legjobb klubtag pontja számít!</p>
              
              {selectedPastTopicId && (!pastClubLeaderboard || pastClubLeaderboard.length === 0) && <div style={{color: '#94a3b8', textAlign: 'center', padding: '10px'}}>Nincs résztvevő klub.</div>}
              {!selectedPastTopicId && <div style={{color: '#94a3b8', textAlign: 'center', padding: '10px'}}>Válassz egy témát a listából.</div>}
              
              {pastClubLeaderboard && pastClubLeaderboard.map((club, index) => {
                const clubMembers = pastLeaderboard
                  .filter(entry => entry?.club_name === club?.club_name)
                  .sort((a, b) => Number(b?.likes_count || 0) - Number(a?.likes_count || 0));

                return (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '15px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #059669' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '900', width: '35px', color: index === 0 ? '#fbbf24' : '#cbd5e1', textAlign: 'center' }}>{index + 1}.</div>
                      <div style={{ flex: 1, marginLeft: '10px' }}>
                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>{club?.club_name || 'Ismeretlen Klub'}</div>
                        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{club?.members_counted || 0} tag pontja alapján</div>
                      </div>
                      <div style={{ color: '#10b981', fontWeight: '900', fontSize: '1.4rem' }}>{club?.total_score || 0} ⭐</div>
                    </div>

                    <details style={{ marginTop: '10px', borderTop: '1px dashed #334155', paddingTop: '8px' }}>
                      <summary style={{ fontSize: '0.8rem', color: '#38bdf8', cursor: 'pointer', outline: 'none', userSelect: 'none' }}>
                        📊 Pontszerző játékosok listája ({clubMembers.length} fő)
                      </summary>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', paddingLeft: '10px' }}>
                        {clubMembers.length === 0 ? (
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>Nem volt pontot szerző tag ebben a fordulóban.</span>
                        ) : (
                          clubMembers.map((m, idx) => (
                            // JAVÍTVA: justifycontent -> justifyContent
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1' }}>
                              <span>👤 {m.user_name} <small style={{ color: '#64748b' }}>("{m.title || 'Cím nélkül'}")</small></span>
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

            <div style={{ background: '#1e293b', borderRadius: '24px', padding: '25px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#3b82f6', fontSize: '1.4rem' }}>🏅 Egyéni Végeredmény</h3>
              
              {!selectedPastTopicId && <div style={{color: '#94a3b8', textAlign: 'center', padding: '10px'}}>Válassz egy témát a listából.</div>}
              
              {pastLeaderboard && [...pastLeaderboard].sort((a, b) => {
                const likesA = Number(a?.likes_count || 0);
                const likesB = Number(b?.likes_count || 0);
                const viewsA = Number(a?.views_count || 0);
                const viewsB = Number(b?.views_count || 0);
                if (likesB !== likesA) return likesB - likesA;
                return viewsA - viewsB;
              }).map((entry, index) => (
                <div key={entry?.id || index} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '12px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: '900', width: '35px', color: index === 0 ? '#fbbf24' : '#94a3b8', textAlign: 'center' }}>{index + 1}.</div>
                  <img 
                    src={getImageUrl(entry?.drive_file_id, entry?.file_url)} 
                    alt="Top" 
                    style={{ width: '50px', height: '50px', borderRadius: '8px', margin: '0 15px', objectFit: 'cover', cursor: 'zoom-in' }} 
                    onClick={() => setFullscreenData({ url: getImageUrl(entry?.drive_file_id, entry?.file_url), title: entry?.user_name || '' })}
                    onError={handleImageError} 
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: 'bold' }}>{entry?.user_name || 'Fotós'}</div>
                    {entry?.club_name && <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold' }}>🛡️ {entry.club_name}</div>}
                  </div>
                  <div style={{ color: '#f97316', fontWeight: '900', fontSize: '1.2rem' }}>{entry?.likes_count || 0} ⭐</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {subTab === 'my_stats' && (
        <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
          {isLoadingStats && (!myStats || myStats.history.length === 0) ? (
            <div style={{ color: '#94a3b8', textAlign: 'center', padding: '50px' }}>⏳ Statisztikák betöltése...</div>
          ) : !myStats ? (
            <div style={{ color: '#ef4444', textAlign: 'center', padding: '20px' }}>Nem sikerült betölteni az adatokat.</div>
          ) : (
            <>
              <div style={{ background: 'linear-gradient(180deg, #1e293b, #0f172a)', padding: '40px 25px', borderRadius: '24px', border: `1px solid ${currentLevel.color}50`, marginBottom: '40px', textAlign: 'center', boxShadow: `0 10px 40px -10px ${currentLevel.color}40`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-50px', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', background: `${currentLevel.color}20`, filter: 'blur(80px)', borderRadius: '50%' }}></div>
                <h3 style={{ color: '#94a3b8', margin: '0 0 10px 0', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '3px', position: 'relative', zIndex: 1 }}>Jelenlegi Státuszod</h3>
                <h1 style={{ color: currentLevel.color, margin: '0 0 20px 0', fontSize: '3.5rem', fontWeight: '900', textShadow: `0 0 20px ${currentLevel.color}60`, position: 'relative', zIndex: 1 }}>{currentLevel.name}</h1>
                
                <div style={{ width: '100%', maxWidth: '600px', background: '#0f172a', height: '16px', borderRadius: '10px', margin: '0 auto', overflow: 'hidden', border: '1px solid #334155', position: 'relative', zIndex: 1 }}>
                  <div style={{ width: `${progressPercent}%`, background: `linear-gradient(90deg, transparent, ${currentLevel.color})`, height: '100%' }}></div>
                </div>
                {nextLevelAt ? (
                  <div style={{ color: '#cbd5e1', fontSize: '0.9rem', marginTop: '15px', position: 'relative', zIndex: 1 }}>
                    Még <b style={{color: 'white', fontSize: '1.1rem'}}>{nextLevelAt - userTotalLikes} Rangpont</b> kell a következő szinthez!
                  </div>
                ) : (
                  <div style={{ color: '#fbbf24', fontSize: '1rem', marginTop: '15px', fontWeight: 'bold', position: 'relative', zIndex: 1 }}>Elérted a maximális szintet! Te vagy a Fotós Guru!</div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #334155', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#f97316', marginBottom: '5px' }}>{userTotalLikes}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Összes Szerzett Pont</div>
                </div>
                <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #be123c', boxShadow: '0 10px 20px rgba(190,18,60,0.1)' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fb7185', marginBottom: '5px' }}>{swapBalance} db</div>
                  <div style={{ color: '#fb7185', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Elkölthető Joker Csere</div>
                </div>
                <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #334155', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#38bdf8', marginBottom: '5px' }}>{totalViews}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Összes Megtekintés</div>
                </div>
                <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #fbbf24', boxShadow: '0 10px 20px rgba(251,191,36,0.1)' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fbbf24', marginBottom: '5px' }}>{podiumCount}</div>
                  <div style={{ color: '#fbbf24', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Dobogós Helyezés</div>
                </div>
                <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #a855f7', boxShadow: '0 10px 20px rgba(168,85,247,0.1)' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#a855f7', marginBottom: '5px' }}>{top10Count}</div>
                  <div style={{ color: '#a855f7', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Top 10% Plecsni</div>
                </div>
                <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #10b981', boxShadow: '0 10px 20px rgba(16,185,129,0.1)' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10b981', marginBottom: '5px' }}>{top20Count}</div>
                  <div style={{ color: '#10b981', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Top 20% Plecsni</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginBottom: '40px' }}>
                
                <div style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', padding: '25px', borderRadius: '24px', border: '1px solid #38bdf840', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#38bdf8', fontSize: '1.2rem' }}>🎁 Hívj meg egy barátot!</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                    Oszd meg a kódodat egy fotós ismerősöddel! Ha regisztrál a portálra és megadja a kódod, te **azonnal +10 db Joker cserét** kapsz a globális egyenlegedhez.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#0f172a', padding: '12px 20px', borderRadius: '12px', border: '1px dashed #38bdf860' }}>
                    <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 'bold' }}>KÓDOD:</span>
                    <strong style={{ color: 'white', fontSize: '1.3rem', fontFamily: 'monospace', letterSpacing: '1px', flex: 1 }}>{myReferralCode}</strong>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(myReferralCode); alert("📋 Meghívó kód a vágólapra másolva!"); }}
                      style={{ background: '#38bdf820', color: '#38bdf8', border: '1px solid #38bdf840', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Másolás
                    </button>
                  </div>
                </div>

                {/* JAVÍTVA: justifycontent -> justifyContent */}
                <div style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', padding: '25px', borderRadius: '24px', border: '1px solid #10b98140', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', color: '#10b981', fontSize: '1.2rem' }}>🤝 Téged ki hívott meg?</h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                      Ha egy barátod ajánlására regisztráltál a Fotóklub Portálra, add meg az ő személyes kódját, hogy megkapja érte a megérdemelt jutalom cseréit!
                    </p>
                  </div>
                  
                  {!referredBy ? (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        type="text" 
                        placeholder="Pl.: REF-A1B2C3" 
                        value={referralInput}
                        onChange={e => setReferralInput(e.target.value)}
                        disabled={isClaimingReferral}
                        style={{ flex: 1, padding: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '12px', fontSize: '1rem', outline: 'none', textTransform: 'uppercase', fontFamily: 'monospace' }} 
                      />
                      <button 
                        onClick={handleClaimReferral}
                        disabled={!referralInput.trim() || isClaimingReferral}
                        style={{ background: !referralInput.trim() || isClaimingReferral ? '#334155' : 'linear-gradient(135deg, #10b981, #059669)', color: !referralInput.trim() || isClaimingReferral ? '#64748b' : 'white', border: 'none', padding: '0 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        {isClaimingReferral ? '...' : 'Beküldés'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ background: '#10b98110', border: '1px solid #10b98130', padding: '12px', borderRadius: '12px', color: '#10b981', fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center' }}>
                      ✓ Sikeresen rögzítetted a meghívásodat! Köszönjük.
                    </div>
                  )}
                </div>

              </div>

              <h3 style={{ color: '#f8fafc', marginBottom: '20px', fontSize: '1.5rem' }}>📸 Korábbi Pályaművek ({myStats?.history?.length || 0})</h3>
              
              {myStats?.history?.length === 0 ? (
                <div style={{ color: '#94a3b8', background: '#1e293b', padding: '40px', borderRadius: '20px', textAlign: 'center', border: '1px dashed #334155' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📸</div>
                  <h4 style={{ color: '#f8fafc', margin: '0 0 10px 0', fontSize: '1.2rem' }}>Még nincs befejezett kihívásod!</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>Vegyél részt a kihívásokban, és itt fognak megjelenni a korábbi eredményeid.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' }}>
                  {myStats?.history?.map((entry: any, idx: number) => {
                    const totalEntries = Number(entry?.total_entries) || 1;
                    const percentile = (Number(entry?.rank) || 1) / totalEntries;
                    let badge = ''; let badgeColor = '#334155';
                    if ((Number(entry?.rank) || 0) <= 3) { badge = '🏆 Dobogós'; badgeColor = '#fbbf24'; }
                    else if (percentile <= 0.1) { badge = '⭐ Top 10%'; badgeColor = '#a855f7'; }
                    else if (percentile <= 0.2) { badge = '✨ Top 20%'; badgeColor = '#10b981'; }

                    const isDaily = getTopicType(entry?.start_date, entry?.end_date) === 'daily';

                    return (
                      // JAVÍTVA: justifycontent -> justifyContent
                      <div key={idx} style={{ background: '#1e293b', borderRadius: '20px', overflow: 'hidden', border: `1px solid ${badgeColor}`, transition: 'transform 0.2s', boxShadow: '0 10px 20px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ position: 'relative', height: '220px' }}>
                          <img src={getImageUrl(entry?.drive_file_id, entry?.file_url)} alt="Pályamű" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} onClick={() => setFullscreenData({url: getImageUrl(entry?.drive_file_id, entry?.file_url), title: entry?.topic_title || ''})} onError={handleImageError} />
                          <div style={{ position: 'absolute', top: '15px', left: '15px', background: badgeColor, color: badgeColor === '#fbbf24' ? 'black' : 'white', padding: '6px 16px', borderRadius: '100px', fontWeight: '900', fontSize: '0.9rem' }}>
                            {badge || `${entry?.rank}. Hely`}
                          </div>
                          
                          <div style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', color: isDaily ? '#f87171' : '#60a5fa', padding: '4px 12px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${isDaily ? '#ef444450' : '#3b82f650'}` }}>
                            {isDaily ? '🔴 Napi' : '🔵 Heti'}
                          </div>
                        </div>
                        {/* JAVÍTVA: justifycontent -> justifyContent */}
                        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <h4 style={{ margin: '0 0 15px 0', color: '#f8fafc', fontSize: '1.2rem' }}>{entry?.topic_title}</h4>
                            {/* JAVÍTVA: justifycontent -> justifyContent */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '12px' }}>
                              <span>Mezőny: {entry?.total_entries || 0} kép</span>
                              <span style={{color: '#f8fafc'}}>Helyezés: <b>{entry?.rank || 0}.</b></span>
                            </div>
                            {/* JAVÍTVA: justifycontent -> justifyContent */}
                            <div style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '15px' }}>
                              <span style={{color: '#f97316', fontWeight: '900'}}>⭐ {entry?.likes || 0} pont</span>
                              <span style={{color: '#38bdf8', fontWeight: 'bold'}}>👁️ {entry?.views || 0}</span>
                            </div>
                          </div>

                          {/* JAVÍTVA: justifycontent -> justifyContent */}
                          <button 
                            onClick={() => setActiveShareData(entry)}
                            style={{ width: '100%', background: 'linear-gradient(135deg, #14b8a6, #0d9488)', color: 'white', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(20,184,166,0.2)' }}
                          >
                            🚀 Eredmény megosztása
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {subTab === 'hall_of_fame' && (
        <div style={{ background: '#1e293b', padding: '30px', borderRadius: '24px', border: '1px solid #fbbf2440', boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ marginBottom: '25px' }}>
            <h2 style={{ color: '#fbbf24', margin: 0, fontSize: '1.8rem', fontWeight: '900' }}>👑 Globális Fotós Dicsőségfal</h2>
            <p style={{ color: '#94a3b8', margin: '5px 0 0 0' }}>A közösség összesített ranglistája az éles és lezárult arénákban gyűjtött csillagok alapján.</p>
          </div>

          {isLoadingHof ? (
            <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>⏳ A pódium összeállítása...</div>
          ) : hallOfFame.length === 0 ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>Még egyetlen fotós sem gyűjtött pontot. Legyél te az első!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {hallOfFame.map((row, index) => {
                const isMe = row.user_email === user?.email;
                const likes = Number(row.total_likes) || 0;
                const level = getLevelDetails(likes, 0); 
                
                const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#cbd5e1' : index === 2 ? '#b45309' : '#64748b';
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;

                return (
                  <div 
                    key={row.user_email || index} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      background: isMe ? 'linear-gradient(90deg, #fbbf2415, #0f172a)' : '#0f172a', 
                      border: isMe ? '1px solid #fbbf2460' : '1px solid #334155', 
                      padding: '16px 20px', 
                      borderRadius: '16px',
                      boxShadow: isMe ? '0 0 20px #fbbf2415' : 'none',
                      transition: 'transform 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '1.4rem', fontWeight: '900', width: '45px', color: rankColor, textAlign: 'center' }}>
                      {medal}
                    </div>

                    <div style={{ flex: 1, marginLeft: '10px' }}>
                      <div style={{ color: isMe ? '#fbbf24' : 'white', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {row.user_name} {isMe && <span style={{ fontSize: '0.75rem', background: '#fbbf24', color: '#0f172a', padding: '2px 8px', borderRadius: '10px', fontWeight: '900' }}>TE VAGY</span>}
                      </div>
                      {row.club_name && (
                        <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {row.drive_logo_id || row.logo_url ? (
                            <img 
                              src={getImageUrl(row.drive_logo_id, row.logo_url)} 
                              alt="" 
                              style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'contain', backgroundColor: '#0f172a', border: '1px solid #10b98130', display: 'inline-block' }} 
                              onError={(e) => { e.currentTarget.outerHTML = '<span>🛡️</span>'; }} 
                            />
                          ) : (
                            <span>🛡️</span>
                          )}
                          <span>{row.club_name}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ marginRight: '20px' }}>
                      <span style={{ color: level.color, background: level.bg, border: `1px solid ${level.color}40`, padding: '6px 16px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {level.name}
                      </span>
                    </div>

                    {/* JAVÍTVA: textalign -> textAlign */}
                    <div style={{ textAlign: 'right', minWidth: '80px' }}>
                      <div style={{ color: '#fbbf24', fontWeight: '900', fontSize: '1.4rem' }}>{likes} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#64748b' }}>⭐</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {subTab === 'arena_album' && (
        <MyArenaAlbumView user={user} setFullscreenData={setFullscreenData} />
      )}

      {showHelp && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '24px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
            
            <button onClick={() => setShowHelp(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: '#1e293b', border: 'none', color: '#94a3b8', fontSize: '1.5rem', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✖</button>
            
            <h2 style={{ color: '#f8fafc', margin: '0 0 25px 0', fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>📖 Útmutató az Arénához</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #f59e0b' }}>
                <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '1.1rem' }}>⚡ Láthatósági Mérő (Az Energia)</h4>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                  Amikor feltöltöd a képed, kapsz energiát. Valahányszor a gép megmutatja a képed valakinek, ez az energia csökken. Új energiát úgy szerezhetsz, ha értékelsz más fotókat. Tartsd a mérőt a Zöld zónában!
                </p>
              </div>

              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #e11d48' }}>
                <h4 style={{ color: '#e11d48', margin: '0 0 10px 0', fontSize: '1.1rem' }}>🃏 Joker: Taktikai Képcsere</h4>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                  Úgy érzed, rossz képet töltöttél fel, és lemaradtál a pontversenyben? Minden párbajban <b>egyszer</b> kijátszhatod a Jokert! A lecserélt fotóddal a pontjaid lenullázódnak, de a megkeresett Láthatóságod megmarad.
                </p>
              </div>

              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #a78bfa' }}>
                <h4 style={{ color: '#a78bfa', margin: '0 0 10px 0', fontSize: '1.1rem' }}>👑 Ki az a Párbajmester?</h4>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                  Minden kihívásnak van egy kijelölt Párbajmestere, aki a forduló szakmai házigazdája és főbírálója. Mivel ő felügyeli a küzdelmet, saját alkotással <b>nem nevezhet</b> az adott játékban. Cserébe kap 5 darab exkluzív Párbajmester szavazatot, amelyek egyenként fixen <b>+10 pontot</b> érnek, így hatalmas hatalom van a kezében a kedvenc képei felemelésére!
                </p>
              </div>

              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #fbbf24' }}>
                <h4 style={{ color: '#fbbf24', margin: '0 0 10px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>🏆 Dobogós Nyeremények & Extra Cserék</h4>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                  A párbajok lezárulásakor a mezőny legkiemelkedőbb fotóművészei értékes **globális Joker cseréket** kapnak jutalmul, amiket a naptár bármelyik jövőbeli kihívásában szabadon elkölthetnek:
                </p>
                <ul style={{ color: '#f8fafc', fontSize: '0.9rem', margin: '10px 0 0 0', paddingLeft: '20px', lineHeight: '1.8' }}>
                  <li>🥇 <b>1. Helyezett (Győztes):</b> <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>+3 db</span> profil szintű Joker csere</li>
                  <li>🥈 <b>2. Helyezett:</b> <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>+2 db</span> profil szintű Joker csere</li>
                  <li>🥉 <b>3. Helyezett:</b> <span style={{ color: '#cd7f32', fontWeight: 'bold' }}>+1 db</span> profil szintű Joker csere</li>
                </ul>
              </div>
              
              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #38bdf8' }}>
                <h4 style={{ color: '#38bdf8', margin: '0 0 15px 0', fontSize: '1.1rem' }}>⭐ Ranglétra és Szavazati Erő</h4>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', margin: '0 0 15px 0' }}>
                  Nem minden szavazat ér ugyanannyit! Ahogy halmozod a pontokat és győzelmeket, a rangod növekszik. Minél magasabb a rangod, annál több pontot adsz másoknak! <b style={{ color: '#fb7185' }}>💡 Minden sikeres szintlépésért a rendszer azonnal +10 db ajándék Joker cserével jutalmaz meg!</b>
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { name: 'Újonc 🌱', req: '0 - 19 pont', power: '✨ +1 / 🔥 +2', color: '#94a3b8' },
                    { name: 'Felfedezett 📸', req: '20 - 99 pont', power: '✨ +2 / 🔥 +3', color: '#38bdf8' },
                    { name: 'Haladó ⭐', req: '100 - 299 pont (vagy nincs győzelem)', power: '✨ +2 / 🔥 +4', color: '#10b981' },
                    { name: 'Profi 🏅', req: '300 - 799 pont ÉS legalább 1 győzelem', power: '✨ +3 / 🔥 +5', color: '#f59e0b' },
                    { name: 'Guru 👑', req: '800+ pont ÉS legalább 3 győzelem', power: '✨ +4 / 🔥 +6', color: '#fbbf24' }
                  ].map((rank, i) => {
                    const isMyRank = currentLevel && currentLevel.name === rank.name;
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: isMyRank ? `${rank.color}20` : '#0f172a', border: isMyRank ? `1px solid ${rank.color}` : '1px solid #334155', borderRadius: '8px' }}>
                        <div>
                          <div style={{ color: rank.color, fontWeight: 'bold', fontSize: '1rem' }}>{rank.name} {isMyRank && <span style={{fontSize: '0.75rem', background: rank.color, color: '#000', padding: '2px 6px', borderRadius: '10px', marginLeft: '5px'}}>TE VAGY</span>}</div>
                          <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Szükséges: {rank.req}</div>
                        </div>
                        <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#f8fafc', fontSize: '0.9rem' }}>
                          {rank.power}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}


      {activeShareData && (
        // JAVÍTVA: justifycontent -> justifyContent
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          
          {/* JAVÍTVA: justifycontent -> justifyContent */}
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '340px', marginBottom: '15px', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 'bold' }}>📱 Trófeakártya Előnézet</span>
            <button onClick={() => setActiveShareData(null)} style={{ background: '#1e293b', border: 'none', color: '#ef4444', padding: '6px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Mégse ✕</button>
          </div>

          {/* JAVÍTVA: justifycontent -> justifyContent */}
          <div 
            id="share-card-node"
            style={{ 
              width: '340px', 
              height: '580px', 
              background: 'linear-gradient(145deg, #0b0f19, #1e1b4b)', 
              borderRadius: '24px', 
              padding: '25px 20px', 
              boxSizing: 'border-box',
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              border: '3px solid #fbbf24',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ position: 'absolute', top: '-100px', width: '200px', height: '200px', background: '#fbbf2415', filter: 'blur(50px)', borderRadius: '50%' }}></div>

            <div style={{ textAlign: 'center', zIndex: 10 }}>
              <div style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '3px', textTransform: 'uppercase' }}>📸 kepolvasok.guru</div>
              <div style={{ color: '#64748b', fontSize: '0.65rem', marginTop: '2px', letterSpacing: '1px' }}>PÁRBAJ TRÓFEA</div>
            </div>

            {/* JAVÍTVA: justifycontent -> justifyContent */}
            <div style={{ 
              width: '100%', 
              height: '200px', 
              borderRadius: '16px', 
              border: '2px solid #fbbf24', 
              boxShadow: '0 8px 25px rgba(0,0,0,0.5)', 
              zIndex: 10, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              position: 'relative',
              boxSizing: 'border-box',
              backgroundColor: '#000',
              backgroundImage: shareBase64 ? `url(${shareBase64})` : 'none',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center center',
              backgroundSize: 'contain'
            }}>
              {loadingShareImg && (
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>⏳ Kép előkészítése...</div>
              )}
              {!shareBase64 && !loadingShareImg && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>⚠️ Kép betöltési hiba</div>
              )}
            </div>

          <div style={{ textAlign: 'center', zIndex: 10 }}>
  <div style={{ fontSize: '2.5rem', margin: 0, lineHeight: 1 }}>🏆</div>
  
  {/* JAVÍTVA: Első körben a kártyához tartozó adatbázis-nevet jelenítjük meg, így azonnal frissül! */}
  <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: '900', margin: '6px 0 2px 0' }}>
    {activeShareData?.user_name || user?.name || 'Fotóművész'}
  </h2>
  
  <div style={{ background: 'linear-gradient(90deg, transparent, #fbbf2430, transparent)', color: '#fbbf24', padding: '4px 20px', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.05rem', letterSpacing: '1px' }}>
    {activeShareData.rank}. HELYEZÉS
  </div>
</div>


            <div style={{ width: '100%', background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '14px', border: '1px solid #23293f', zIndex: 10, boxSizing: 'border-box' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>Kihívás témája:</div>
              <div style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 'bold', margin: '2px 0 10px 0', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                "{activeShareData.topic_title}"
              </div>
              
              <div style={{ display: 'flex', width: '100%', borderTop: '1px solid #23293f', paddingTop: '10px' }}>
                {/* JAVÍTVA: justifycontent -> justifyContent */}
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>Közösségi Értékelés</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f97316' }}>{activeShareData.likes || 0} ⭐</div>
                </div>
                <div style={{ width: '1px', background: '#23293f' }}></div>
                {/* JAVÍTVA: justifycontent -> justifyContent */}
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>Összes Nevező</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#38bdf8' }}>{activeShareData.total_entries || 0} fotó</div>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', zIndex: 10 }}>
              <div style={{ fontSize: '0.65rem', color: '#475569' }}>Játssz Te is következő párbajban:</div>
              <div style={{ color: '#38bdf8', fontWeight: 'bold', marginTop: '1px', fontSize: '0.8rem' }}>kepolvasok.guru</div>
            </div>
          </div>

          {/* JAVÍTVA: justifycontent -> justifyContent */}
          <button 
            onClick={handleExecuteShare}
            disabled={isGeneratingImage || loadingShareImg}
            style={{ width: '100%', maxWidth: '340px', marginTop: '15px', background: isGeneratingImage || loadingShareImg ? '#334155' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: isGeneratingImage || loadingShareImg ? '#64748b' : 'white', border: 'none', padding: '14px', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 'bold', cursor: isGeneratingImage || loadingShareImg ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 10px 25px rgba(29,78,216,0.3)' }}
          >
            {isGeneratingImage ? '⏳ Trófea mentése...' : '📱 Kártya Megosztása / Mentése 🚀'}
          </button>
        </div>
      )}

    </div>
  );
}
