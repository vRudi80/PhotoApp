import React, { useState, useEffect, useRef } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';
import { toPng } from 'html-to-image'; 
import MyArenaAlbumView from './MyArenaAlbumView';
import HelpModal from '../components/WeeklyChallenge/HelpModal';
import AlbumSelectionModal from '../components/WeeklyChallenge/AlbumSelectionModal';
import ShareCardModal from '../components/WeeklyChallenge/ShareCardModal';
import TrophyRoom from '../components/WeeklyChallenge/subtabs/TrophyRoom';
import HallOfFame from '../components/WeeklyChallenge/subtabs/HallOfFame';
import PastArchive from '../components/WeeklyChallenge/subtabs/PastArchive';
import UpcomingChallenges from '../components/WeeklyChallenge/subtabs/UpcomingChallenges';
import ArenaActiveRoom from '../components/WeeklyChallenge/subtabs/ArenaActiveRoom';

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
  if (likes < 30) return { name: 'Fényleső 🌱', color: '#94a3b8', bg: '#94a3b815' };
  if (likes < 100) return { name: 'Megfigyelő 👁️', color: '#cbd5e1', bg: '#cbd5e115' };
  if (likes < 250) return { name: 'Képvadász 📷', color: '#38bdf8', bg: '#38bdf815' };
  if (likes < 500) return { name: 'Komponista 📐', color: '#60a5fa', bg: '#60a5fa15' };
  if (likes < 800 || victories < 1) return { name: 'Fényíró 🎞️', color: '#10b981', bg: '#10b98115' };
  if (likes < 1300 || victories < 2) return { name: 'Esztéta 💎', color: '#059669', bg: '#05966915' };
  if (likes < 2000 || victories < 3) return { name: 'Szakértő 🎯', color: '#a78bfa', bg: '#a78bfa15' };
  if (likes < 3200 || victories < 5) return { name: 'Képmester 🎨', color: '#ec4899', bg: '#ec489915' };
  if (likes < 4800 || victories < 7) return { name: 'Nagymester 🌟', color: '#f59e0b', bg: '#f59e0b15' };
  if (likes < 7000 || victories < 9) return { name: 'Virtuóz ⚡', color: '#eab308', bg: '#eab30815' };
  if (likes < 10000 || victories < 12) return { name: 'Fotóguru 🔥', color: '#ef4444', bg: '#ef444415' };
  return { name: 'Vizuális Legenda 👑', color: '#fbbf24', bg: '#fbbf2420' };
};

// ====================================================================
// ⚡ BÖNGÉSZŐS KÉPTÖMÖRÍTŐ MOTOR
// ====================================================================
const compressImageOnClient = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1920;

        if (width > height) {
          if (width > MAX_SIZE) { height = Math.round((height * MAX_SIZE) / width); width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width = Math.round((width * MAX_SIZE) / height); height = MAX_SIZE; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); 
          }
        }, 'image/jpeg', 0.8); 
      };
    };
  });
};

// ====================================================================
// ⏳ SELEKCIÓS KÁRTYA KOMPONENS (Javított, időzóna-biztos határidővel)
// ====================================================================
function ChallengeCard({ topic, onSelect }: { topic: any; onSelect: () => void }) {
  const [timeLeft, setTimeLeft] = useState<string>('Számítás...');

  useEffect(() => {
    if (!topic || !topic.end_date) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      
      // 🎯 JAVÍTVA: Kényszerített helyi idő parzolás a böngészők UTC anomáliái ellen
      const parts = topic.end_date.split(/[- :T]/);
      const end = parts.length >= 5 
        ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), parseInt(parts[3]), parseInt(parts[4]), parts[5] ? parseInt(parts[5]) : 0)
        : new Date(topic.end_date);
      
      if (isNaN(end.getTime())) {
        setTimeLeft('Hibás dátum');
        return false;
      }

      // 🛑 JAVÍTVA: Az end.setHours(...) erőszakos felülírás teljesen ki lett törölve!
      const distance = end.getTime() - now;

      if (distance < 0) {
        setTimeLeft('Futam Lezárult!');
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
  const isMaster = topic.isMaster === true;
  const statusColor = isMaster ? '#a78bfa' : (topic.hasEntered ? '#10b981' : '#f59e0b');

  return (
    <div 
      onClick={onSelect}
      style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', borderRadius: '24px', border: '1px solid #334155', padding: '25px', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 10px 25px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', position: 'relative' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = isDaily ? '#ef4444' : '#3b82f6'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#334155'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <span style={{ background: isDaily ? '#ef444420' : '#3b82f620', color: isDaily ? '#f87171' : '#60a5fa', border: `1px solid ${isDaily ? '#ef444450' : '#3b82f650'}`, padding: '4px 12px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold' }}>
          {isDaily ? '🔴 Villámfutam' : '🔵 Mesterfutam'}
        </span>
        
        <span style={{ color: statusColor, fontSize: '0.85rem', fontWeight: 'bold' }}>
          {isMaster 
            ? '🚀 Képmester vagy' 
            : topic.hasEntered 
              ? '🚀 Neveztél' 
              : '⏳ Még nem neveztél'
          }
        </span>
      </div>
      {topic.cover_url && (
        <div style={{ width: '100%', height: '160px', borderRadius: '14px', overflow: 'hidden', marginBottom: '15px', border: '1px solid #334155', position: 'relative', backgroundColor: '#090d16' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${topic.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(12px) brightness(0.5)', transform: 'scale(1.1)' }}></div>
          <img src={topic.cover_url} alt="" style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', zIndex: 1 }} onError={handleImageError} />
        </div>
      )}
      
      {topic.cover_author && (
        <div style={{ color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic', marginTop: '-10px', marginBottom: '15px', textAlign: 'right', paddingRight: '5px' }}>
          📸 Borítókép: {topic.cover_author}
        </div>
      )}

      <h3 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '1.4rem', fontWeight: 'bold' }}>{topic.title}</h3>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 20px 0', lineHeight: '1.5', flex: 1 }}>{topic.description}</p>
      
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px', lineHeight: '1' }}>
        {(topic.master_name || topic.master_email) && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#a78bfa', fontSize: '0.85rem', fontWeight: 'bold', background: '#a78bfa10', padding: '6px 14px', borderRadius: '10px', border: '1px solid #a78bfa20', whiteSpace: 'nowrap', lineHeight: '1' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>👑 Képmester:&nbsp;</span>
            <span style={{ color: '#e9d5ff', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center' }}>{topic.master_name || topic.master_email}</span>
          </div>
        )}
        
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontSize: '0.85rem', fontWeight: 'bold', background: '#38bdf810', padding: '6px 14px', borderRadius: '10px', border: '1px solid #38bdf820', whiteSpace: 'nowrap', lineHeight: '1' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>👥 {topic.totalEntries || 0} fotós</span>
        </div>
        
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: topic.unvotedEntries > 0 ? '#fb923c' : '#4ade80', fontSize: '0.85rem', fontWeight: 'bold', background: topic.unvotedEntries > 0 ? '#fb923c10' : '#4ade8010', padding: '6px 14px', borderRadius: '10px', border: topic.unvotedEntries > 0 ? '1px solid #fb923c20' : '1px solid #4ade8020', whiteSpace: 'nowrap', lineHeight: '1' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>🗳️ {topic.unvotedEntries || 0} értékelendő</span>
        </div>        
      </div>

      <div style={{ background: '#00000040', padding: '12px 15px', borderRadius: '12px', fontSize: '0.9rem', color: isDaily ? '#f87171' : '#38bdf8', textAlign: 'center', border: '1px solid #1e293b', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
        ⏳ Hátralévő idő: {timeLeft}
      </div>
    </div>
  );
}

// ====================================================================
// ⚔️ FŐ IRÁNYÍTÓKÖZPONT KOMPONENS
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

  const [showSwapAlbumModal, setShowSwapAlbumModal] = useState(false);
  const [swapAlbumPhotos, setSwapAlbumPhotos] = useState<any[]>([]);
  const [isLoadingSwapAlbum, setIsLoadingSwapAlbum] = useState(false);
  const [albumModalMode, setAlbumModalMode] = useState<'upload' | 'swap'>('swap');

  const [activeTopics, setActiveTopics] = useState<any[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);

  const [topic, setTopic] = useState<any>(null);
  const [myEntry, setMyEntry] = useState<any>(null);
  const [myPastEntries, setMyPastEntries] = useState<any[]>([]); 
  const [swapBalance, setSwapBalance] = useState<number>(3);     
  const [myVoteCount, setMyVoteCount] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const [isLoadingHof, setIsLoadingHof] = useState(false);

  const [timeLeft, setTimeLeft] = useState<string>('');
  const [userTotalLikes, setUserTotalLikes] = useState<number>(0);
  const [userVictories, setUserVictories] = useState<number>(0); 

  const [userPower, setUserPower] = useState<{ super: number; brilliant: number }>({ super: 1, brilliant: 2 });
  const [hallOfFame, setHallOfFame] = useState<any[]>([]);

  const [activeShareData, setActiveShareData] = useState<any | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [shareBase64, setShareBase64] = useState<string | null>(null);
  const [loadingShareImg, setLoadingShareImg] = useState(false);

  const [lobbyMessages, setLobbyMessages] = useState<any[]>([]);
  const [currentlyTyping, setCurrentlyTyping] = useState<string[]>([]);
  const [typedLobbyMsg, setTypedLobbyMsg] = useState('');
  const [isSendingLobbyMsg, setIsSendingLobbyMsg] = useState(false);
  
  const lobbyChatBottomRef = useRef<HTMLDivElement>(null);
  const lastTypingSignalSent = useRef<number>(0);

  const myOfficialNameRef = useRef<string>('Én');
  useEffect(() => {
    myOfficialNameRef.current = myEntry?.user_name || user?.name || 'Én';
  }, [myEntry, user]);

  useEffect(() => {
    if (!activeShareData) {
      setShareBase64(null);
      return;
    }
    let isMounted = true;
    setLoadingShareImg(true);
    
    const fetchUrl = activeShareData.drive_file_id 
      ? `${BACKEND_URL}/api/image-base64/${activeShareData.drive_file_id}`
      : `${BACKEND_URL}/api/admin/base64-proxy?url=${encodeURIComponent(activeShareData.file_url)}`;

    fetch(fetchUrl)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          if (data.base64) setShareBase64(data.base64);
          setLoadingShareImg(false);
        }
      })
      .catch(err => {
        console.error("Hiba a megosztó kép letöltésekor:", err);
        if (isMounted) setLoadingShareImg(false);
      });
    return () => { isMounted = false; };
  }, [activeShareData]);

  const currentLevel = getLevelDetails(userTotalLikes, userVictories);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTypedLobbyMsg(e.target.value);

    const now = Date.now();
    if (now - lastTypingSignalSent.current > 3000) {
      lastTypingSignalSent.current = now;
      fetch(`${BACKEND_URL}/api/weekly/chat/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: 0,
          userEmail: user?.email,
          userName: myOfficialNameRef.current
        })
      }).catch(() => {});
    }
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
    }
    else if (subTab === 'upcoming') fetch(`${BACKEND_URL}/api/weekly/upcoming`).then(res => res.json()).then(data => setUpcomingTopics(data || [])).catch(console.error);
    else if (subTab === 'past') fetch(`${BACKEND_URL}/api/weekly/past`).then(res => res.json()).then(data => setPastTopics(data || [])).catch(console.error);
    else if (subTab === 'my_stats') fetchMyStats(); 
    else if (subTab === 'hall_of_fame') fetchHallOfFame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab, selectedTopicId]);

  useEffect(() => {
    if (subTab !== 'current' || selectedTopicId !== null) return;

    let timerId: NodeJS.Timeout;
    let isMounted = true;

    const fetchLobbyChat = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/weekly/chat/0?t=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (res.ok && isMounted) {
          const data = await res.json();
          setLobbyMessages(data.messages || []);
          const othersTyping = (data.typing || []).filter((name: string) => name !== myOfficialNameRef.current);
          setCurrentlyTyping(othersTyping);
        }
      } catch (err) {
        console.error("❌ Hiba a lobbi chat szinkronizációjakor:", err);
      } finally {
        if (isMounted && subTab === 'current' && selectedTopicId === null) {
          timerId = setTimeout(fetchLobbyChat, 2500);
        }
      }
    };

    fetchLobbyChat();

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [subTab, selectedTopicId]);

  useEffect(() => {
    if (selectedTopicId === null && subTab === 'current') {
      lobbyChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lobbyMessages.length, selectedTopicId, subTab]);

  const handleSendLobbyMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedLobbyMsg.trim() || isSendingLobbyMsg) return;

    setIsSendingLobbyMsg(true);
    const msgPayload = {
      topicId: 0,
      userEmail: user?.email,
      userName: user?.name || 'Anonim Képolvasó',
      messageText: typedLobbyMsg
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgPayload)
      });
      
      if (res.ok) {
        const data = await res.json();
        setTypedLobbyMsg('');
        
        setLobbyMessages(prev => [...prev, { 
          id: Date.now(),
          topic_id: 0,
          user_email: user?.email,
          user_name: data.user_name || user?.name || 'Anonim Képolvasó',
          message_text: typedLobbyMsg,
          created_at: new Date().toISOString() 
        }]);
      }
    } catch (err) {
      console.error(err);
    } filey {
      setIsSendingLobbyMsg(false);
    }
  };

  // ====================================================================
  // ⏳ JAVÍTVA: A szoba belső időzítője (Darabolós, tiszta helyi parzolás)
  // ====================================================================
  useEffect(() => {
    if (!topic || !topic.end_date) {
      setTimeLeft('Ismeretlen dátum');
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      
      // 🎯 JAVÍTVA: Darabolós parzolás helyi időzónára kényszerítve
      const parts = topic.end_date.split(/[- :T]/);
      const end = parts.length >= 5 
        ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), parseInt(parts[3]), parseInt(parts[4]), parts[5] ? parseInt(parts[5]) : 0)
        : new Date(topic.end_date);
      
      if (isNaN(end.getTime())) {
        setTimeLeft('Hibás dátum');
        return false;
      }

      // 🛑 JAVÍTVA: Az end.setHours(...) hibaforrás itt is örökre törölve lett!
      const distance = end.getTime() - now;

      if (distance < 0) {
        setTimeLeft('Futam Lezárult!');
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
      const res = await fetch(`${BACKEND_URL}/api/weekly/history/${topicId}?userEmail=${user?.email || ''}`);
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
        alert("🚫 Jelentve! A kép eltűnt a futamodból.");
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const rawFile = e.target.files[0];
      
      let finalFile = rawFile;
      if (rawFile.size > 2 * 1024 * 1024) {
        console.log("⚡ Óriásfájl észlelve, böngészős tömörítés indul...");
        finalFile = await compressImageOnClient(rawFile);
        console.log(`💪 Sikeres tömörítés: ${(rawFile.size / 1024 / 1024).toFixed(2)}MB -> ${(finalFile.size / 1024 / 1024).toFixed(2)}MB`);
      }

      setUploadFile(finalFile); 
      uploadPreview && URL.revokeObjectURL(uploadPreview); 
      setUploadPreview(URL.createObjectURL(finalFile));
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

  const handleFileSelectForSwap = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (!window.confirm("⚠️ Biztosan visszatérsz ehhez a korábbi pályaművedhez? Ez 1 Joker pontodba fog kerülni, viszont visszakapod az akkori csillagaidat!")) return;
    setIsSwapping(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/swap-back`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: topic.id, userEmail: user?.email, entryId })
      });
      if (res.ok) {
        alert("↩️ Sikeresen visszaaktiváltad a korábbi fotódat!");
        fetchCurrentTopic(false);
      } else {
        const err = await res.json();
        alert(err.error || "Hiba a csere során.");
      }
    } catch (e) { alert("Hálózati hiba!"); }
    finally { 
      setIsSwapping(false);
    }
  };

  const handleSelectPhotoForSwap = async (photoUrl: string) => {
    if (!window.confirm("⚠️ Biztosan elhasználsz 1 Joker cserére erre az albumképre? Ez a fotó most 0 pontról fog újrainduini ebben a fordulóban!")) return;
    setIsSwapping(true);
    setShowSwapAlbumModal(false); 
    
    try {
      const swapRes = await fetch(`${BACKEND_URL}/api/weekly/swap-existing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: topic.id, userEmail: user.email, userName: user.name, fileUrl: photoUrl })
      });
      
      if (swapRes.ok) {
        alert("🎉 Sikeres Joker képcsere az Aréna képtáradból!");
        fetchCurrentTopic(false);
      } else {
        const err = await swapRes.json(); 
        alert(err.error);
      }
    } catch (e) { 
      alert("Hálózati hiba a csere során."); 
    } finally { 
      setIsSwapping(false); 
    }
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
          title: 'Fotóklub Futam Trófea',
          text: `🎉 Elértem a(z) ${activeShareData.rank}. helyezést a "${activeShareData.topic_title}" fotós futamban! ⭐`
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
          <button onClick={() => { setSubTab('current'); setSelectedTopicId(null); }} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'current' ? 'linear-gradient(135deg, #f97316, #ef4444)' : 'transparent', color: subTab === 'current' ? 'white' : '#94a3b8', transition: 'all 0.3s', boxShadow: subTab === 'current' ? '0 4px 15px rgba(239,68,68,0.4)' : 'none' }}>🏆 Kihívások</button>
          <button onClick={() => setSubTab('upcoming')} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'upcoming' ? '#334155' : 'transparent', color: subTab === 'upcoming' ? 'white' : '#94a3b8', transition: 'all 0.3s' }}>⏳ Közelgő ligák</button>
          <button onClick={() => setSubTab('past')} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'past' ? '#334155' : 'transparent', color: subTab === 'past' ? 'white' : '#94a3b8', transition: 'all 0.3s' }}>📜 Befejezett ligák</button>
          
          <button 
            onClick={() => setSubTab('arena_album')} 
            style={{ 
              padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', 
              background: subTab === 'arena_album' ? 'linear-gradient(135deg, #14b8a6, #0d9488)' : 'transparent', 
              color: subTab === 'arena_album' ? 'white' : '#94a3b8', transition: 'all 0.3s', 
              boxShadow: subTab === 'arena_album' ? '0 4px 15px rgba(20,184,166,0.4)' : 'none' 
            }}
          >
            🖼️ Képcsarnok
          </button>

          <button onClick={() => { setSubTab('my_stats'); fetchMyStats(); }} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'my_stats' ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'transparent', color: subTab === 'my_stats' ? 'white' : '#94a3b8', transition: 'all 0.3s', boxShadow: subTab === 'my_stats' ? '0 4px 15px rgba(139,92,246,0.4)' : 'none' }}>🏆 Dicsőségfalam</button>
          <button onClick={() => setSubTab('hall_of_fame')} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'hall_of_fame' ? 'linear-gradient(135deg, #fbbf24, #d97706)' : 'transparent', color: subTab === 'hall_of_fame' ? '#0f172a' : '#94a3b8', transition: 'all 0.3s', boxShadow: subTab === 'hall_of_fame' ? '0 4px 15px rgba(251,191,36,0.4)' : 'none' }}>👑 Mesterek csarnoka</button>
        </div>
        
        <button onClick={() => setShowHelp(true)} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #38bdf8', cursor: 'pointer', fontWeight: 'bold', background: '#0f172a', color: '#38bdf8', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(56,189,248,0.2)' }}>
          <span style={{ fontSize: '1.2rem' }}>📖</span> Játékszabályok & Rangok
        </button>
      </div>

      {subTab === 'current' && (
        <>
          {selectedTopicId === null ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <h2 style={{ color: 'white', margin: 0, fontSize: '1.8rem' }}>🔥 Aktuális Ligák</h2>
                  <p style={{ color: '#94a3b8', margin: '5px 0 0 0' }}>Válassz egyet az alábbi futó ligák közül, és légy Te a legjobb!</p>
                </div>

                {loading ? (
                  <div style={{ color: '#94a3b8', textAlign: 'center', padding: '50px' }}>⏳ Betöltés...</div>
                ) : activeTopics.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'linear-gradient(180deg, #1e293b, #0f172a)', borderRadius: '24px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>😴</div>
                    <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '2rem' }}>Jelenleg nincs egyetlen aktív liga sem!</h2>
                    <p style={{ color: '#94a3b8' }}>Pihenj meg, hamarosan új kihívás érkezik.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px', marginTop: '20px' }}>
                    {activeTopics.map((t) => (
                      <ChallengeCard 
                        key={t.id} 
                        topic={t} 
                        onSelect={() => setSelectedTopicId(t.id)} 
                      />
                    ))}
                  </div>
                )}
              </div>

              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '24px', padding: '25px', boxShadow: '0 15px 35px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>💬</span> Aréna Központi Lobbi
                    </h3>
                    <p style={{ margin: '3px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>Köszöntsd a bent lévőket, beszéld meg a taktikákat, hívd meg az ismerőseidet éles küzdelmekre!</p>
                  </div>
                  <div style={{ background: '#38bdf815', border: '1px dashed #38bdf850', color: '#38bdf8', padding: '6px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    💡 Hívd be a fotós ismerőseidet az Arénába a saját meghívó kódoddal +10 db ajándék Jokerért!
                  </div>
                </div>

                <div style={{ background: '#0f172a', borderRadius: '16px', padding: '20px', height: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #223147' }}>
                  {lobbyMessages.length === 0 ? (
                    <div style={{ color: '#475569', textAlign: 'center', margin: 'auto', fontStyle: 'italic', fontSize: '0.9rem' }}>
                      Csendes még a Lobbi... 🤫 Indítsd el Te a társalgást, szólítsd meg a klubtagokat!
                    </div>
                  ) : (
                    lobbyMessages.map((msg, idx) => {
                      const msgEmail = msg.user_email || msg.userEmail;
                      const msgName = msg.user_name || msg.userName;
                      const msgText = msg.message_text || msg.messageText;
                      
                      const isMsgMe = msgEmail === user?.email;
                      
                      return (
                        <div 
                          key={msg.id || idx} 
                          style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: isMsgMe ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            alignSelf: isMsgMe ? 'flex-end' : 'flex-start'
                          }}
                        >
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '3px', fontSize: '0.75rem', color: isMsgMe ? '#38bdf8' : '#94a3b8', fontWeight: 'bold' }}>
                            <span>{msgName}</span>
                            <span style={{ color: '#475569', fontWeight: 'normal' }}>
                              • {new Date(msg.created_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div 
                            style={{ 
                              background: isMsgMe ? 'linear-gradient(135deg, #0284c7, #0369a1)' : '#1e293b', 
                              color: '#f8fafc', 
                              padding: '10px 16px', 
                              borderRadius: isMsgMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                              fontSize: '0.92rem', 
                              lineHeight: '1.4',
                              wordBreak: 'break-word',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              border: isMsgMe ? 'none' : '1px solid #334155'
                            }}
                          >
                            {msgText}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={lobbyChatBottomRef} />
                </div>

                <div style={{ height: '20px', paddingLeft: '10px', fontSize: '0.85rem', color: '#38bdf8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.3s' }}>
                  {currentlyTyping.length > 0 && (
                    <>
                      <span>{currentlyTyping.join(', ')} épp ír</span>
                      <span className="typing-dots" style={{ display: 'inline-flex', gap: '2px' }}>
                        <span style={{ animation: 'bounce 1.4s infinite both', animationDelay: '0s' }}>•</span>
                        <span style={{ animation: 'bounce 1.4s infinite both', animationDelay: '0.2s' }}>•</span>
                        <span style={{ animation: 'bounce 1.4s infinite both', animationDelay: '0.4s' }}>•</span>
                      </span>
                    </>
                  )}
                </div>

                <form onSubmit={handleSendLobbyMessage} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    placeholder="Írj egy üzenetet..." 
                    value={typedLobbyMsg}
                    onChange={handleInputChange} 
                    maxLength={500}
                    disabled={isSendingLobbyMsg}
                    style={{ flex: 1, padding: '14px 18px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '14px', fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#38bdf8'}
                    onBlur={e => e.target.style.borderColor = '#334155'}
                  />
                  <button 
                    type="submit"
                    disabled={!typedLobbyMsg.trim() || isSendingLobbyMsg}
                    style={{ background: (!typedLobbyMsg.trim() || isSendingLobbyMsg) ? '#334155' : 'linear-gradient(135deg, #0ea5e9, #2563eb)', color: (!typedLobbyMsg.trim() || isSendingLobbyMsg) ? '#64748b' : 'white', border: 'none', padding: '14px 28px', borderRadius: '14px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: typedLobbyMsg.trim() ? '0 4px 15px rgba(37,99,235,0.3)' : 'none' }}
                  >
                    {isSendingLobbyMsg ? '...' : 'Küldés 🚀'}
                  </button>
                </form>
              </div>
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
                <ArenaActiveRoom
                  topic={topic}
                  timeLeft={timeLeft}
                  isMaster={isMaster}
                  exposureColor={exposureColor}
                  exposurePercentage={exposurePercentage}
                  exposureLabel={exposureLabel}
                  myEntry={myEntry}
                  voteEntry={voteEntry}
                  noMoreEntries={noMoreEntries}
                  masterVotesLeft={masterVotesLeft}
                  userPower={userPower}
                  swapBalance={swapBalance}
                  myPastEntries={myPastEntries}
                  leaderboard={leaderboard}
                  currentClubLeaderboard={currentClubLeaderboard}
                  user={user}
                  isUploading={isUploading}
                  uploadPreview={uploadPreview}
                  handleFileSelect={handleFileSelect}
                  handleUpload={handleUpload}
                  isLoadingSwapAlbum={isLoadingSwapAlbum}
                  isSwapping={isSwapping}
                  swapPreview={swapPreview}
                  handleSwapFileSelect={handleFileSelectForSwap}
                  handleSwapSubmit={handleSwapSubmit}
                  onOpenAlbumForUpload={async () => {
                    setIsLoadingSwapAlbum(true);
                    try {
                      const res = await fetch(`${BACKEND_URL}/api/weekly/my-album?userEmail=${user?.email}`);
                      if (res.ok) {
                        const albumPhotos = await res.json();
                        if (albumPhotos.length === 0) return alert("Még nincs kép az Aréna képtáradban!");
                        setSwapAlbumPhotos(albumPhotos);
                        setAlbumModalMode('upload');
                        setShowSwapAlbumModal(true);
                      }
                    } catch (e) { alert("Hiba az album betöltésekor."); }
                    finally { setIsLoadingSwapAlbum(false); }
                  }}
                  onOpenAlbumForSwap={async () => {
                    setIsLoadingSwapAlbum(true);
                    try {
                      const res = await fetch(`${BACKEND_URL}/api/weekly/my-album?userEmail=${user?.email}`);
                      if (res.ok) {
                        const albumPhotos = await res.json();
                        if (albumPhotos.length === 0) return alert("Még nincs kép az Aréna képtáradban!");
                        setSwapAlbumPhotos(albumPhotos);
                        setAlbumModalMode('swap');
                        setShowSwapAlbumModal(true);
                      }
                    } catch (e) { alert("Hiba az album betöltésekor."); }
                    finally { setIsLoadingSwapAlbum(false); }
                  }}
                  handleVote={handleVote}
                  handleOffTopicReport={handleOffTopicReport}
                  handleSwapBackSubmit={handleSwapBackSubmit}
                  setFullscreenData={setFullscreenData}
                  handleImageError={handleImageError}
                />
              )}
            </div>
          )}
        </>
      )}

      {subTab === 'upcoming' && (
        <UpcomingChallenges
          upcomingTopics={upcomingTopics}
          getTopicType={getTopicType}
          handleImageError={handleImageError}
          user={user}
        />
      )}
      
      {subTab === 'past' && (
        <PastArchive
          pastTopics={pastTopics}
          selectedPastTopicId={selectedPastTopicId}
          loadPastHistoryList={loadPastHistoryList}
          pastClubLeaderboard={pastClubLeaderboard}
          pastLeaderboard={pastLeaderboard}
          getTopicType={getTopicType}
          handleImageError={handleImageError}
          setFullscreenData={setFullscreenData}
          user={user}
        />
      )}

      {subTab === 'my_stats' && (
        <TrophyRoom
          isLoadingStats={isLoadingStats}
          myStats={myStats}
          userTotalLikes={userTotalLikes}
          userVictories={userVictories}
          swapBalance={swapBalance}
          myReferralCode={myReferralCode}
          referredBy={referredBy}
          referralInput={referralInput}
          setReferralInput={setReferralInput}
          isClaimingReferral={isClaimingReferral}
          handleClaimReferral={handleClaimReferral}
          setActiveShareData={setActiveShareData}
          setFullscreenData={setFullscreenData}
          getLevelDetails={getLevelDetails}
          getTopicType={getTopicType}
          handleImageError={handleImageError}
        />
      )}

      {subTab === 'hall_of_fame' && (
        <HallOfFame
          isLoadingHof={isLoadingHof}
          hallOfFame={hallOfFame}
          user={user}
          getLevelDetails={getLevelDetails}
        />
      )}
      
      {subTab === 'arena_album' && (
        <MyArenaAlbumView user={user} setFullscreenData={setFullscreenData} />
      )}
          
      {/* ── SEGÉD MODÁLOK KISZERVEZVE ÉS VEZÉRELVE ── */}
      <HelpModal 
        isOpen={showHelp} 
        onClose={() => setShowHelp(false)} 
        currentLevel={currentLevel} 
      />

      <AlbumSelectionModal 
        isOpen={showSwapAlbumModal}
        onClose={() => setShowSwapAlbumModal(false)}
        albumModalMode={albumModalMode}
        swapAlbumPhotos={swapAlbumPhotos}
        myPastEntries={myPastEntries}
        topic={topic}
        user={user}
        setIsUploading={setIsUploading}
        setIsSwapping={setIsSwapping}
        fetchCurrentTopic={fetchCurrentTopic}
        handleSwapBackSubmit={handleSwapBackSubmit}
        handleSelectPhotoForSwap={handleSelectPhotoForSwap}
      />

      <ShareCardModal 
        activeShareData={activeShareData}
        onClose={() => setActiveShareData(null)}
        user={user}
        shareBase64={shareBase64}
        loadingShareImg={loadingShareImg}
        isGeneratingImage={isGeneratingImage}
        handleExecuteShare={handleExecuteShare}
      />

    </div>
  );
}
