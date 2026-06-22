import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import exifr from 'exifr'; 

import { useLanguage } from '../context/LanguageContext';

// ====================================================================
// 📊 GLOBÁLIS SEGÉDFÜGGVÉNYEK
// ====================================================================
const getTopicType = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return 'weekly';
  const durationDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  return durationDays <= 2 ? 'daily' : 'weekly';
};

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.src = 'https://via.placeholder.com/400x300/1e293b/64748b?text=Image+not+found';
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
// 📊 SELEKCIÓS KÁRTYA KOMPONENS
// ====================================================================
function ChallengeCard({ topic, onSelect }: { topic: any; onSelect: () => void }) {
  const { t, lang } = useLanguage();
  const [timeLeft, setTimeLeft] = useState<string>(t('viewTimeCalc'));

  useEffect(() => {
    if (!topic || !topic.end_date) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const parts = topic.end_date.split(/[- :T]/);
      const end = parts.length >= 5 
        ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), parseInt(parts[3]), parseInt(parts[4]), parts[5] ? parseInt(parts[5]) : 0)
        : new Date(topic.end_date);
      
      if (isNaN(end.getTime())) {
        setTimeLeft(t('viewTimeError'));
        return false;
      }

      const distance = end.getTime() - now;
      if (distance < 0) {
        setTimeLeft(t('viewTimeEnded'));
        return false;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
      const seconds = Math.floor((distance % (1000 * 60)) / 1000).toString().padStart(2, '0');

      if (days > 0) {
        setTimeLeft(`${days}${t('viewTimeDays')}${hours}:${minutes}:${seconds}`);
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
  }, [topic.id, topic.end_date, t]);

  const isDaily = getTopicType(topic.start_date, topic.end_date) === 'daily';
  const isMaster = topic.isMaster === true;
  const statusColor = isMaster ? '#a78bfa' : (topic.hasEntered ? '#10b981' : '#f59e0b');

  const displayTitle = lang === 'en' && topic.title_en ? topic.title_en : topic.title;
  const displayDesc = lang === 'en' && topic.description_en ? topic.description_en : topic.description;

  return (
    <div 
      onClick={onSelect}
      style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', borderRadius: '24px', border: '1px solid #334155', padding: '25px', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 10px 25px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', position: 'relative' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = isDaily ? '#ef4444' : '#3b82f6'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#334155'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <span style={{ background: isDaily ? '#ef444420' : '#3b82f620', color: isDaily ? '#f87171' : '#60a5fa', border: `1px solid ${isDaily ? '#ef444450' : '#3b82f650'}`, padding: '4px 12px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold' }}>
          {isDaily ? t('typeBlitz') : t('typeMaster')}
        </span>
        <span style={{ color: statusColor, fontSize: '0.85rem', fontWeight: 'bold' }}>
          {isMaster ? t('statusMaster') : topic.hasEntered ? t('statusEntered') : t('statusNotEntered')}
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
          {t('viewCoverAuthor')}{topic.cover_author}
        </div>
      )}

      <h3 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '1.4rem', fontWeight: 'bold' }}>{displayTitle}</h3>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 20px 0', lineHeight: '1.5', flex: 1 }}>{displayDesc}</p>
      
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px', lineHeight: '1' }}>
        {(topic.master_name || topic.master_email) && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#a78bfa', fontSize: '0.8rem', fontWeight: 'bold', background: '#a78bfa10', padding: '6px 10px', borderRadius: '10px', border: '1px solid #a78bfa20', whiteSpace: 'nowrap' }}>
            <span>{t('viewMasterLabel')}</span>
            <span style={{ color: '#e9d5ff' }}>{topic.master_name || topic.master_email}</span>
          </div>
        )}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontSize: '0.8rem', fontWeight: 'bold', background: '#38bdf810', padding: '6px 10px', borderRadius: '10px', border: '#38bdf820', whiteSpace: 'nowrap' }}>
          <span>👥 {topic.totalEntries || 0} {t('photographers')}</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: topic.unvotedEntries > 0 ? '#fb923c' : '#4ade80', fontSize: '0.8rem', fontWeight: 'bold', background: topic.unvotedEntries > 0 ? '#fb923c10' : '#4ade8010', padding: '6px 10px', borderRadius: '10px', border: topic.unvotedEntries > 0 ? '1px solid #fb923c20' : '1px solid #4ade8020', whiteSpace: 'nowrap' }}>
          <span>🗳️ {topic.unvotedEntries || 0} {t('unvoted')}</span>
        </div>        
      </div>

      <div style={{ background: '#00000040', padding: '12px 15px', borderRadius: '12px', fontSize: '0.9rem', color: isDaily ? '#f87171' : '#38bdf8', textAlign: 'center', border: '1px solid #1e293b', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
        {t('timeLeft')} {timeLeft}
      </div>
    </div>
  );
}

// ====================================================================
// ⚔️ FŐ IRÁNYÍTÓKÖZPONT KOMPONENS
// ====================================================================
export default function WeeklyChallengeView({ user, setFullscreenData }: WeeklyChallengeViewProps) {
  const { t, lang } = useLanguage();

  // 1. MINDEN ÁLLAPOT (STATES)
  const [subTab, setSubTab] = useState<'current' | 'upcoming' | 'past' | 'my_stats' | 'hall_of_fame' | 'arena_album'>('current');
  const [loading, setLoading] = useState(true);
  const [myReferralCode, setMyReferralCode] = useState<string>('');
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [referralInput, setReferralInput] = useState<string>('');
  const [isClaimingReferral, setIsClaimingReferral] = useState<boolean>(false);
  const [masterVotesLeft, setMasterVotesLeft] = useState<number>(0);
  const [isMaster, setIsMaster] = useState<boolean>(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [uploadCamera, setUploadCamera] = useState('');
  const [uploadLens, setUploadLens] = useState('');
  const [uploadShutter, setUploadShutter] = useState('');
  const [uploadIso, setUploadIso] = useState('');
  const [uploadAperture, setUploadAperture] = useState('');
  const [uploadSoftware, setUploadSoftware] = useState('');

  const [swapCamera, setSwapCamera] = useState('');
  const [swapLens, setSwapLens] = useState('');
  const [swapShutter, setSwapShutter] = useState('');
  const [swapIso, setSwapIso] = useState('');
  const [swapAperture, setSwapAperture] = useState('');
  const [swapSoftware, setSwapSoftware] = useState('');

  const [showSwapAlbumModal, setShowSwapAlbumModal] = useState(false);
  const [swapAlbumPhotos, setSwapAlbumPhotos] = useState<any[]>([]);
  const [isLoadingSwapAlbum, setIsLoadingSwapAlbum] = useState(false);
  const [albumModalMode, setAlbumModalMode] = useState<'upload' | 'swap'>('swap');

  const [activeTopics, setActiveTopics] = useState<any[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'endDate' | 'startDate'>('endDate');

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
  
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const lastTypingSignalSent = useRef<number>(0);

  // REFS ÉS HOISTOLT ALAP-FÜGGVÉNYEK
  const isChatOpenRef = useRef(isChatOpen);
  const lobbyMessagesCountRef = useRef(lobbyMessages.length);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
    lobbyMessagesCountRef.current = lobbyMessages.length;
  }, [isChatOpen, lobbyMessages.length]);

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

  const myOfficialNameRef = useRef<string>(lang === 'en' ? 'Me' : 'Én');
  useEffect(() => {
    myOfficialNameRef.current = myEntry?.user_name || user?.name || (lang === 'en' ? 'Me' : 'Én');
  }, [myEntry, user, lang]);

  // REAKTÍV HORGOK (HOOKS) ÉS LOOP-BIZTONSÁGOS AUTOMATIZMUSOK
  useEffect(() => {
    if (subTab === 'current') {
      fetchCurrentTopic(false);
    }
    else if (subTab === 'upcoming') fetch(`${BACKEND_URL}/api/weekly/upcoming`).then(res => res.json()).then(data => setUpcomingTopics(data || [])).catch(console.error);
    else if (subTab === 'past') fetch(`${BACKEND_URL}/api/weekly/past`).then(res => res.json()).then(data => setPastTopics(data || [])).catch(console.error);
    else if (subTab === 'my_stats') fetchMyStats(); 
    else if (subTab === 'hall_of_fame') fetchHallOfFame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab, selectedTopicId, user?.email]);

  useEffect(() => {
    setTopic(null);
    setMyEntry(null);
    setMyPastEntries([]);
    setVoteEntry(null);
    setLeaderboard([]);
    setCurrentClubLeaderboard([]);
    setTimeLeft('');
    setPastLeaderboard([]); 
    setPastClubLeaderboard([]);
    setMasterVotesLeft(0); 
    setIsMaster(false);     
    setHasNewMessage(false);
  }, [selectedTopicId, user?.email]);

  useEffect(() => {
    if (isChatOpen && lobbyMessages.length > 0 && user?.email) {
      const lastMsg = lobbyMessages[lobbyMessages.length - 1];
      const lastId = lastMsg.id || lastMsg._id;
      if (lastId) {
        localStorage.setItem(`arena_chat_last_read_${user.email}`, String(lastId));
      }
      setHasNewMessage(false);
    }
  }, [isChatOpen, lobbyMessages, user?.email]);

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
          const newMessages = data.messages || [];
          
          if (newMessages.length > 0 && user?.email) {
            const lastMsg = newMessages[newMessages.length - 1];
            const lastMsgEmail = lastMsg?.user_email || lastMsg?.userEmail;
            const lastId = lastMsg.id || lastMsg._id;

            if (lastMsgEmail !== user.email) {
              if (isChatOpenRef.current) {
                localStorage.setItem(`arena_chat_last_read_${user.email}`, String(lastId));
              } else {
                const storedId = localStorage.getItem(`arena_chat_last_read_${user.email}`);
                if (!storedId || String(lastId) !== storedId) {
                  setHasNewMessage(true);
                }
              }
            }
          }

          setLobbyMessages(newMessages);
          const othersTyping = (data.typing || []).filter((name: string) => name !== myOfficialNameRef.current);
          setCurrentlyTyping(othersTyping);
        }
      } catch (err) {
        console.error("Lobby chat synchronization anomaly:", err);
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
  }, [subTab, selectedTopicId, user?.email]);

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
    if (!window.confirm(t('msgReportConfirm'))) return;
    
    setVoteEntry(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/report-off-topic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, userEmail: user?.email || '' })
      });
      
      if (res.ok) {
        alert(t('msgReportSuccess'));
        setMyVoteCount(prev => prev + 1);
        if (topic) {
          fetchNextVote(topic.id);
          fetchCurrentTopic(true); 
        }
      }
    } catch (e) {
      alert(t('msgReportError'));
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
        body: JSON.stringify({ 
          userEmail: user?.email, 
          referralCode: referralInput.trim().toUpperCase() 
        })
      });

      if (res.ok) {
        alert(t('msgReferralSuccess'));
        setReferredBy(referralInput); 
        fetchCurrentTopic(true);      
      } else {
        const err = await res.json();
        alert(err.error || t('msgSwapErrorMain'));
      }
    } catch (e) { alert(t('msgNetworkError')); }
    finally { setIsClaimingReferral(false); }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const rawFile = e.target.files[0];

      try {
        const exifData = await exifr.parse(rawFile);
        
        if (exifData) {
          if (exifData.Model) {
            const makePrefix = exifData.Make && !exifData.Model.startsWith(exifData.Make) ? `${exifData.Make} ` : '';
            setUploadCamera(`${makePrefix}${exifData.Model}`);
          } else if (exifData.Make) {
            setUploadCamera(exifData.Make);
          } else {
            setUploadCamera('');
          }

          setUploadLens(exifData.LensModel || '');

          if (exifData.ExposureTime) {
            const shutterFraction = exifData.ExposureTime < 1 
              ? `1/${Math.round(1 / exifData.ExposureTime)}s` 
              : `${exifData.ExposureTime}s`;
            setUploadShutter(shutterFraction);
          } else {
            setUploadShutter('');
          }

          setUploadIso(exifData.ISO ? String(exifData.ISO) : '');
          setUploadAperture(exifData.FNumber ? `f/${exifData.FNumber}` : '');
          setUploadSoftware(exifData.Software || '');
        }
      } catch (exifError) {
        console.log("Nem található EXIF pecsét a képben.");
        setUploadCamera(''); setUploadLens(''); setUploadShutter('');
        setUploadIso(''); setUploadAperture(''); setUploadSoftware('');
      }

      let finalFile = rawFile;
      if (rawFile.size > 2 * 1024 * 1024) {
        console.log("⚡ Large asset detected, triggering browser side compression engine...");
        finalFile = await compressImageOnClient(rawFile);
      }

      setUploadFile(finalFile); 
      if (uploadPreview) URL.revokeObjectURL(uploadPreview); 
      setUploadPreview(URL.createObjectURL(finalFile));
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return alert("Nincs fájl kiválasztva!");

    setIsUploading(true);
    const formData = new FormData();
    formData.append('photo', uploadFile);
    formData.append('userEmail', user.email);
    formData.append('topicId', topic.id); 
    formData.append('userName', user.name || user.email);
    
    formData.append('camera', uploadCamera);
    formData.append('lens', uploadLens);
    formData.append('shutter', uploadShutter);
    formData.append('iso', uploadIso);
    formData.append('aperture', uploadAperture);
    formData.append('software', uploadSoftware);

    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/upload`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        alert("Sikeres nevezés rögzített EXIF adatokkal!");
        setUploadFile(null);
        if (uploadPreview) URL.revokeObjectURL(uploadPreview);
        setUploadPreview(null);
        setUploadCamera(''); setUploadLens(''); setUploadShutter('');
        setUploadIso(''); setUploadAperture(''); setUploadSoftware('');
        await fetchCurrentTopic(true); 
      }
    } catch (e) {
      console.error("Feltöltési hiba:", e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelectForSwap = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const rawFile = e.target.files[0];

      try {
        const exifData = await exifr.parse(rawFile);
        
        if (exifData) {
          if (exifData.Model) {
            const makePrefix = exifData.Make && !exifData.Model.startsWith(exifData.Make) ? `${exifData.Make} ` : '';
            setSwapCamera(`${makePrefix}${exifData.Model}`);
          } else if (exifData.Make) {
            setSwapCamera(exifData.Make);
          } else {
            setSwapCamera('');
          }

          setSwapLens(exifData.LensModel || '');

          if (exifData.ExposureTime) {
            const shutterFraction = exifData.ExposureTime < 1 
              ? `1/${Math.round(1 / exifData.ExposureTime)}s` 
              : `${exifData.ExposureTime}s`;
            setSwapShutter(shutterFraction);
          } else {
            setSwapShutter('');
          }

          setSwapIso(exifData.ISO ? String(exifData.ISO) : '');
          setSwapAperture(exifData.FNumber ? `f/${exifData.FNumber}` : '');
          setSwapSoftware(exifData.Software || '');
        }
      } catch (exifError) {
        console.log("Nem található EXIF pecsét a képben.");
        setSwapCamera(''); setSwapLens(''); setSwapShutter('');
        setSwapIso(''); setSwapAperture(''); setSwapSoftware('');
      }

      let finalFile = rawFile;
      if (rawFile.size > 2 * 1024 * 1024) {
        console.log("⚡ Large asset detected on swap, compressing in client browser...");
        finalFile = await compressImageOnClient(rawFile);
      }

      setSwapFile(finalFile);
      if (swapPreview) URL.revokeObjectURL(swapPreview);
      setSwapPreview(URL.createObjectURL(finalFile));
    }
  };

  const handleSwapSubmit = async () => {
    if (!swapFile || !topic) return;
    if (!window.confirm(t('msgSwapConfirm'))) return;
    setIsSwapping(true);
    try {
      const formData = new FormData();
      formData.append('photo', swapFile); 
      formData.append('topicId', topic.id.toString()); 
      formData.append('userEmail', user?.email || ''); 
      formData.append('userName', user?.name || '');
      
      formData.append('camera', swapCamera);
      formData.append('lens', swapLens);
      formData.append('shutter', swapShutter);
      formData.append('iso', swapIso);
      formData.append('aperture', swapAperture);
      formData.append('software', swapSoftware);

      const res = await fetch(`${BACKEND_URL}/api/weekly/swap`, { method: 'POST', body: formData });
      if (res.ok) { 
        alert(t('msgSwapSuccess')); 
        setSwapFile(null); 
        setSwapPreview(null); 
        setSwapCamera(''); setSwapLens(''); setSwapShutter('');
        setSwapIso(''); setSwapAperture(''); setSwapSoftware('');
        fetchCurrentTopic(false); 
      } 
      else { const err = await res.json(); alert(err.error); }
    } catch (e) { alert(t('msgSwapErrorMain')); }
    finally { setIsSwapping(false); }
  };

  const handleSwapBackSubmit = async (entryId: number) => {
    if (!window.confirm(t('msgSwapBackConfirm'))) return;
    setIsSwapping(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/swap-back`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: topic.id, userEmail: user?.email, entryId })
      });
      if (res.ok) {
        alert(t('msgSwapBackSuccess'));
        fetchCurrentTopic(false);
      } else {
        const err = await res.json();
        alert(err.error || t('msgSwapErrorMain'));
      }
    } catch (e) { alert(t('msgNetworkError')); }
    finally { 
      setIsSwapping(false);
    }
  };

  const handleSelectPhotoForSwap = async (photoUrl: string) => {
    if (!window.confirm(t('msgSwapExistingConfirm'))) return;
    setIsSwapping(true);
    setShowSwapAlbumModal(false); 
    
    try {
      const swapRes = await fetch(`${BACKEND_URL}/api/weekly/swap-existing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: topic.id, userEmail: user.email, userName: user.name, fileUrl: photoUrl })
      });
      
      if (swapRes.ok) {
        alert(t('msgSwapExistingSuccess'));
        fetchCurrentTopic(false);
      } else {
        const err = await swapRes.json(); 
        alert(err.error);
      }
    } catch (e) { 
      alert(t('msgNetworkError')); 
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
      const file = new File([blob], `Arena_Award_${activeShareData.topic_title}.png`, { type: 'image/png' });

      const getOrdinalStr = (rankNum: number) => {
        if (lang === 'hu') return `${rankNum}.`;
        const m = rankNum % 10, n = rankNum % 100;
        if (m === 1 && n !== 11) return `${rankNum}st`;
        if (m === 2 && n !== 12) return `${rankNum}nd`;
        if (m === 3 && n !== 13) return `${rankNum}rd`;
        return `${rankNum}th`;
      };

      const shareTextCompiled = t('msgShareText')
        .replace('{rank}', lang === 'en' ? getOrdinalStr(activeShareData.rank) : String(activeShareData.rank))
        .replace('{title}', activeShareData.topic_title);

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t('msgShareTitle'),
          text: shareTextCompiled
        });
      } else {
        const link = document.createElement('a');
        link.download = `Arena_Trophy_${activeShareData.topic_title}.png`;
        link.href = dataUrl;
        link.click();
      }
      setActiveShareData(null);
     } catch (e) {
      alert(t('msgGenerateImageError'));
      console.error(e);
    } finally { 
      setIsGeneratingImage(false);
    }
  };

  // EFFEKTUSOK: SUTIK / TRÓFEÁK / ANIMÁCIÓK
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
        console.error("Error downloading proxy asset:", err);
        if (isMounted) setLoadingShareImg(false);
      });
    return () => { isMounted = false; };
  }, [activeShareData]);

  // EFFEKTUSOK: GÖRDÍTÉS ÉS IDŐZÍTŐK
  useEffect(() => {
    if (selectedTopicId === null && subTab === 'current' && chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  }, [lobbyMessages.length, selectedTopicId, subTab, isChatOpen]);

  useEffect(() => {
    if (!topic || !topic.end_date) {
      setTimeLeft(t('viewTimeError'));
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const parts = topic.end_date.split(/[- :T]/);
      const end = parts.length >= 5 
        ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), parseInt(parts[3]), parseInt(parts[4]), parts[5] ? parseInt(parts[5]) : 0)
        : new Date(topic.end_date);
      
      if (isNaN(end.getTime())) {
        setTimeLeft(t('viewTimeError'));
        return false;
      }

      const distance = end.getTime() - now;
      if (distance < 0) {
        setTimeLeft(t('viewTimeEnded'));
        return false;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
      const seconds = Math.floor((distance % (1000 * 60)) / 1000).toString().padStart(2, '0');

      if (days > 0) {
        setTimeLeft(`${days}${t('viewTimeDays')}${hours}:${minutes}:${seconds}`);
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
  }, [topic, t]);


  // 🎯 4. SZÁMÍTOTT ÉRTÉKEK A RENDELÉSHEZ (Garantáltan definiálva a használat helye előtt)
  // 🛡️ JAVÍTVA: A currentLevel és a hozzá tartozó expo változók most már biztosan beolvasásra kerülnek
  const currentLevel = getLevelDetails(userTotalLikes, userVictories);

  const BASE_EXPOSURE = 10;
  const exposureEarned = BASE_EXPOSURE + (Number(myVoteCount || 0) * 2);
  const safeViewsCount = myEntry ? (Number(myEntry.views_count) || 0) : 0;
  const viewsRemaining = myEntry ? (exposureEarned - safeViewsCount) : 0;
  const rawPercentage = myEntry ? ((viewsRemaining / 15) * 100) : 0;
  const exposurePercentage = isNaN(rawPercentage) || !isFinite(rawPercentage) ? 0 : Math.min(100, Math.max(0, rawPercentage));

  let exposureColor = '#ef4444';
  let exposureLabel = viewsRemaining <= 0 ? (lang === 'en' ? 'Invisible (0%)' : 'Láthatatlan (0%)') : (lang === 'en' ? 'Low' : 'Alacsony');
  if (exposurePercentage >= 80) { exposureColor = '#10b981'; exposureLabel = lang === 'en' ? 'Maximum' : 'Maximális'; } 
  else if (exposurePercentage >= 40) { exposureColor = '#f59e0b'; exposureLabel = lang === 'en' ? 'Medium' : 'Közepes'; }

  const sortedActiveTopics = [...activeTopics].sort((a, b) => {
    const dateStrA = String(sortBy === 'endDate' ? a.end_date : a.start_date).replace(' ', 'T').split('.')[0];
    const dateStrB = String(sortBy === 'endDate' ? b.end_date : b.start_date).replace(' ', 'T').split('.')[0];
    
    const timeA = new Date(dateStrA).getTime() || 0;
    const timeB = new Date(dateStrB).getTime() || 0;

    if (sortBy === 'endDate') {
      return timeA - timeB;
    } else {
      return timeB - timeA;
    }
  });
  
  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', position: 'relative' }}>
      
      {/* TABS HEADER GOMBSOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '10px', background: '#0f172a', padding: '10px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', width: 'fit-content', flexWrap: 'wrap', border: '1px solid #1e293b' }}>
          <button onClick={() => { setSubTab('current'); setSelectedTopicId(null); }} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'current' ? 'linear-gradient(135deg, #f97316, #ef4444)' : 'transparent', color: subTab === 'current' ? 'white' : '#94a3b8', transition: 'all 0.3s', boxShadow: subTab === 'current' ? '0 4px 15px rgba(239,68,68,0.4)' : 'none' }}>{t('tabChallenges')}</button>
          <button onClick={() => setSubTab('upcoming')} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'upcoming' ? '#334155' : 'transparent', color: subTab === 'upcoming' ? 'white' : '#94a3b8', transition: 'all 0.3s' }}>{t('tabUpcoming')}</button>
          <button onClick={() => setSubTab('past')} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'past' ? '#334155' : 'transparent', color: subTab === 'past' ? 'white' : '#94a3b8', transition: 'all 0.3s' }}>{t('tabPast')}</button>
          <button onClick={() => setSubTab('arena_album')} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'arena_album' ? 'linear-gradient(135deg, #14b8a6, #0d9488)' : 'transparent', color: subTab === 'arena_album' ? 'white' : '#94a3b8', transition: 'all 0.3s', boxShadow: subTab === 'arena_album' ? '0 4px 15px rgba(20,184,166,0.4)' : 'none' }}>{t('tabAlbum')}</button>
          <button onClick={() => { setSubTab('my_stats'); fetchMyStats(); }} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'my_stats' ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'transparent', color: subTab === 'my_stats' ? 'white' : '#94a3b8', transition: 'all 0.3s', boxShadow: subTab === 'my_stats' ? '0 4px 15px rgba(139,92,246,0.4)' : 'none' }}>{t('tabStats')}</button>
          <button onClick={() => setSubTab('hall_of_fame')} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'hall_of_fame' ? 'linear-gradient(135deg, #fbbf24, #d97706)' : 'transparent', color: subTab === '#0f172a' ? '#0f172a' : '#94a3b8', transition: 'all 0.3s', boxShadow: subTab === 'hall_of_fame' ? '0 4px 15px rgba(251,191,36,0.4)' : 'none' }}>{t('tabHof')}</button>
        </div>
        <button onClick={() => setShowHelp(true)} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #334155', cursor: 'pointer', fontWeight: 'bold', background: '#0f172a', color: '#38bdf8', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(56,189,248,0.2)' }}>
          {t('btnRules')}
        </button>
      </div>

      {subTab === 'current' && (
        <>
          {selectedTopicId === null ? (
            <div className="arena-fluid-container">
              
              <div>
                <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <h2 style={{ color: 'white', margin: 0, fontSize: '1.8rem' }}>{t('viewActiveLeagues')}</h2>
                    <p style={{ color: '#94a3b8', margin: '5px 0 0 0' }}>{t('viewActiveLeaguesDesc')}</p>
                  </div>

                  {activeTopics.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                        {t('sortLabel')}
                      </span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'endDate' | 'startDate')}
                        style={{ background: '#0f172a', color: 'white', border: '1px solid #334155', padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem', outline: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        <option value="endDate">{t('sortEndDate')}</option>
                        <option value="startDate">{t('sortStartDate')}</option>
                      </select>
                    </div>
                  )}
                </div>

                {loading ? (
                  <div style={{ color: '#94a3b8', textAlign: 'center', padding: '50px' }}>{t('loading')}</div>
                ) : activeTopics.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'linear-gradient(180deg, #1e293b, #0f172a)', borderRadius: '24px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>😴</div>
                    <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '2rem' }}>{t('viewNoActiveLeagues')}</h2>
                    <p style={{ color: '#94a3b8' }}>{t('viewNoActiveLeaguesDesc')}</p>
                  </div>
                ) : (
                  <div className="arena-cards-grid">
                    {sortedActiveTopics.map((actTop) => (
                      <ChallengeCard 
                        key={actTop.id} 
                        topic={actTop} 
                        onSelect={() => setSelectedTopicId(actTop.id)} 
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* FLOATING CHAT WIDGET */}
              <div className={`arena-floating-chat-dock ${isChatOpen ? 'is-open' : 'is-closed'} ${hasNewMessage ? 'has-unread' : ''}`}>
                
                <div 
                  onClick={() => {
                    setIsChatOpen(!isChatOpen);
                    if (!isChatOpen) setHasNewMessage(false);
                  }}
                  className="chat-dock-header"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
                    <span style={{ fontSize: '1.2rem' }}>💬</span>
                    <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                      {t('viewLobbyTitle')} {hasNewMessage && <span style={{ color: '#f43f5e', fontSize: '0.8rem', marginLeft: '5px' }}>({lang === 'en' ? 'New!' : 'Új üzenet!'})</span>}
                    </span>
                    {hasNewMessage && <span className="chat-notification-badge" />}
                  </div>
                  <span style={{ transform: isChatOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', fontWeight: 'bold' }}>▲</span>
                </div>

                {isChatOpen && (
                  <div className="chat-dock-body">
                    <p style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '0.78rem' }}>{t('viewLobbyDesc')}</p>
                    
                    <div ref={chatScrollContainerRef} className="chat-messages-scroll-area">
                      {lobbyMessages.length === 0 ? (
                        <div style={{ color: '#475569', textAlign: 'center', margin: 'auto', fontStyle: 'italic', fontSize: '0.85rem', padding: '20px 0' }}>
                          {t('viewLobbyEmpty')}
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
                                maxWidth: '92%',
                                alignSelf: isMsgMe ? 'flex-end' : 'flex-start',
                                marginBottom: '8px'
                              }}
                            >
                              <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginBottom: '2px', fontSize: '0.7rem', color: isMsgMe ? '#38bdf8' : '#94a3b8', fontWeight: 'bold' }}>
                                <span>{msgName}</span>
                                <span style={{ color: '#475569', fontWeight: 'normal' }}>
                                  • {new Date(msg.created_at).toLocaleTimeString(lang === 'en' ? 'en-US' : 'hu-HU', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div 
                                style={{ 
                                  background: isMsgMe ? 'linear-gradient(135deg, #f97316, #ef4444)' : '#1e293b', 
                                  color: '#f8fafc', 
                                  padding: '8px 12px', 
                                  borderRadius: isMsgMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                  fontSize: '0.85rem', 
                                  lineHeight: '1.4',
                                  wordBreak: 'break-word',
                                  border: isMsgMe ? 'none' : '1px solid #334155'
                                }}
                              >
                                {msgText}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div style={{ height: '14px', paddingLeft: '2px', fontSize: '0.75rem', color: '#38bdf8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px' }}>
                      {currentlyTyping.length > 0 && (
                        <>
                          <span>{currentlyTyping.join(', ')}{t('viewLobbyTyping')}</span>
                          <span className="typing-dots">
                            <span style={{ animationDelay: '0s' }}>•</span>
                            <span style={{ animationDelay: '0.2s' }}>•</span>
                            <span style={{ animationDelay: '0.4s' }}>•</span>
                          </span>
                        </>
                      )}
                    </div>

                    <form onSubmit={handleSendLobbyMessage} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        placeholder={t('viewLobbyPlaceholder')} 
                        value={typedLobbyMsg}
                        onChange={handleInputChange} 
                        maxLength={500}
                        disabled={isSendingLobbyMsg}
                        style={{ flex: 1, padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '10px', fontSize: '0.85rem', outline: 'none' }}
                      />
                      <button 
                        type="submit"
                        disabled={!typedLobbyMsg.trim() || isSendingLobbyMsg}
                        style={{ background: (!typedLobbyMsg.trim() || isSendingLobbyMsg) ? '#334155' : 'linear-gradient(135deg, #f97316, #ef4444)', color: (!typedLobbyMsg.trim() || isSendingLobbyMsg) ? '#64748b' : 'white', border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        {t('viewLobbySend')}
                      </button>
                    </form>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <button 
                  onClick={() => { setSelectedTopicId(null); }} 
                  style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '8px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                >
                  {t('viewBackBtn')}
                </button>
              </div>

              {(!topic || loading) ? (
                <div style={{ color: '#94a3b8', padding: '50px' }}>{t('viewPreparingRoom')}</div>
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
                        if (albumPhotos.length === 0) return alert(t('msgNoPhotosInGallery'));
                        setSwapAlbumPhotos(albumPhotos);
                        setAlbumModalMode('upload');
                        setShowSwapAlbumModal(true);
                      }
                    } catch (e) { alert(t('msgGalleryLoadError')); }
                    finally { setIsLoadingSwapAlbum(false); }
                  }}
                  onOpenAlbumForSwap={async () => {
                    setIsLoadingSwapAlbum(true);
                    try {
                      const res = await fetch(`${BACKEND_URL}/api/weekly/my-album?userEmail=${user?.email}`);
                      if (res.ok) {
                        const albumPhotos = await res.json();
                        if (albumPhotos.length === 0) return alert(t('msgNoPhotosInGallery'));
                        setSwapAlbumPhotos(albumPhotos);
                        setAlbumModalMode('swap');
                        setShowSwapAlbumModal(true);
                      }
                    } catch (e) { alert(t('msgGalleryLoadError')); }
                    finally { setIsLoadingSwapAlbum(false); }
                  }}
                  handleVote={handleVote}
                  handleOffTopicReport={handleOffTopicReport}
                  handleSwapBackSubmit={handleSwapBackSubmit}
                  setFullscreenData={setFullscreenData}
                  handleImageError={handleImageError}
                  fetchCurrentTopic={fetchCurrentTopic}
                />
              )}
            </div>
          )}
        </>
      )}

      {subTab === 'upcoming' && (
        <UpcomingChallenges upcomingTopics={upcomingTopics} getTopicType={getTopicType} handleImageError={handleImageError} user={user} />
      )}
      
      {subTab === 'past' && (
        <PastArchive pastTopics={pastTopics} selectedPastTopicId={selectedPastTopicId} loadPastHistoryList={loadPastHistoryList} pastClubLeaderboard={pastClubLeaderboard} pastLeaderboard={pastLeaderboard} getTopicType={getTopicType} handleImageError={handleImageError} setFullscreenData={setFullscreenData} user={user} />
      )}

      {subTab === 'my_stats' && (
        <TrophyRoom isLoadingStats={isLoadingStats} myStats={myStats} userTotalLikes={userTotalLikes} userVictories={userVictories} swapBalance={swapBalance} myReferralCode={myReferralCode} referredBy={referredBy} referralInput={referralInput} setReferralInput={setReferralInput} isClaimingReferral={isClaimingReferral} handleClaimReferral={handleClaimReferral} setActiveShareData={setActiveShareData} setFullscreenData={setFullscreenData} getLevelDetails={getLevelDetails} getTopicType={getTopicType} handleImageError={handleImageError} />
      )}

      {subTab === 'hall_of_fame' && (
        <HallOfFame isLoadingHof={isLoadingHof} hallOfFame={hallOfFame} user={user} getLevelDetails={getLevelDetails} />
      )}
      
      {subTab === 'arena_album' && (
        <MyArenaAlbumView user={user} setFullscreenData={setFullscreenData} />
      )}
          
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} currentLevel={currentLevel} />

      <AlbumSelectionModal isOpen={showSwapAlbumModal} onClose={() => setShowSwapAlbumModal(false)} albumModalMode={albumModalMode} swapAlbumPhotos={swapAlbumPhotos} myPastEntries={myPastEntries} topic={topic} user={user} setIsUploading={setIsUploading} setIsSwapping={setIsSwapping} fetchCurrentTopic={fetchCurrentTopic} handleSwapBackSubmit={handleSwapBackSubmit} handleSelectPhotoForSwap={handleSelectPhotoForSwap} />

      <ShareCardModal activeShareData={activeShareData} onClose={() => setActiveShareData(null)} user={user} shareBase64={shareBase64} loadingShareImg={loadingShareImg} isGeneratingImage={isGeneratingImage} handleExecuteShare={handleExecuteShare} />

      {/* ── 🎯 STYLING LAYER ── */}
      <style>{`
        .arena-fluid-container {
          width: 100%;
          box-sizing: border-box;
        }
        .arena-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 25px;
          width: 100%;
        }

        /* ── DOCK CHAT WIDGET ── */
        .arena-floating-chat-dock {
          position: fixed;
          bottom: 0;
          right: 30px;
          width: 360px;
          background: #1e293b;
          border: 1px solid #334155;
          border-bottom: none;
          border-radius: 16px 16px 0 0;
          box-shadow: 0 -10px 30px rgba(0,0,0,0.5);
          z-index: 1000;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1);
        }
        .arena-floating-chat-dock.is-closed {
          transform: translateY(calc(100% - 50px));
        }
        .arena-floating-chat-dock.has-unread .chat-dock-header {
          border-color: #f43f5e;
          box-shadow: inset 0 0 10px rgba(244,63,94,0.2);
        }
        .chat-dock-header {
          padding: 14px 20px;
          background: linear-gradient(90deg, #1e293b, #0f172a);
          border-bottom: 1px solid #334155;
          border-radius: 15px 15px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          user-select: none;
        }
        .chat-dock-header:hover {
          background: #24334d;
        }
        .chat-dock-body {
          padding: 15px;
          height: 400px;
          display: flex;
          flex-direction: column;
        }
        .chat-messages-scroll-area {
          background: #0f172a;
          border: 1px solid #223147;
          border-radius: 12px;
          padding: 12px;
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .chat-notification-badge {
          position: absolute;
          top: -1px;
          left: -3px;
          width: 8px;
          height: 8px;
          background: #f43f5e;
          border-radius: 50%;
          box-shadow: 0 0 8px #f43f5e;
          animation: pulse 1.5s infinite;
        }
        .typing-dots span {
          animation: bounce 1.4s infinite both;
          font-weight: bold;
          display: inline-block;
        }
        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.5; }
          100% { transform: scale(0.9); opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @media (max-width: 480px) {
          .arena-floating-chat-dock {
            right: 10px;
            width: calc(100% - 20px);
          }
        }
      `}</style>

    </div>
  );
}
