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
import BattlePlanner from '../components/WeeklyChallenge/subtabs/BattlePlanner';
import exifr from 'exifr'; 
import VideoLoader from '../components/VideoLoader';
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

const ARENA_LEVELS_REGISTRY = [
  { id: 0, name: 'Fényleső 🌱', minLikes: 0 },
  { id: 1, name: 'Megfigyelő 👁️', minLikes: 30 },
  { id: 2, name: 'Képvadász 📷', minLikes: 100 },
  { id: 3, name: 'Komponista 📐', minLikes: 250 },
  { id: 4, name: 'Fényíró 🎞️', minLikes: 500, minVictories: 1 },
  { id: 5, name: 'Esztéta 💎', minLikes: 800, minVictories: 2 },
  { id: 6, name: 'Szakértő 🎯', minLikes: 1300, minVictories: 3 },
  { id: 7, name: 'Képmester 🎨', minLikes: 2000, minVictories: 5 },
  { id: 8, name: 'Nagymester 🌟', minLikes: 3200, minVictories: 7 },
  { id: 9, name: 'Virtuóz ⚡', minLikes: 4800, minVictories: 9 },
  { id: 10, name: 'Fotóguru 🔥', minLikes: 7000, minVictories: 12 },
  { id: 11, name: 'Legenda 👑', minLikes: 10000 }
];

const getLevelDetails = (likes: number, victories: number) => {
  if (likes < 30) return { id: 0, name: 'Fényleső 🌱', color: '#94a3b8', bg: '#94a3b815' };
  if (likes < 100) return { id: 1, name: 'Megfigyelő 👁️', color: '#cbd5e1', bg: '#cbd5e115' };
  if (likes < 250) return { id: 2, name: 'Képvadász 📷', color: '#38bdf8', bg: '#38bdf815' };
  if (likes < 500) return { id: 3, name: 'Komponista 📐', color: '#60a5fa', bg: '#60a5fa15' };
  if (likes < 800 || victories < 1) return { id: 4, name: 'Fényíró 🎞️', color: '#10b981', bg: '#10b98115' };
  if (likes < 1300 || victories < 2) return { id: 5, name: 'Esztéta 💎', color: '#059669', bg: '#05966915' };
  if (likes < 1300 || victories < 3) return { id: 6, name: 'Szakértő 🎯', color: '#a78bfa', bg: '#a78bfa15' };
  if (likes < 2000 || victories < 5) return { id: 7, name: 'Képmester 🎨', color: '#ec4899', bg: '#ec489915' };
  if (likes < 3200 || victories < 7) return { id: 8, name: 'Nagymester 🌟', color: '#f59e0b', bg: '#f59e0b15' };
  if (likes < 4800 || victories < 9) return { id: 9, name: 'Virtuóz ⚡', color: '#eab308', bg: '#eab30815' };
  if (likes < 7000 || victories < 12) return { id: 10, name: 'Fotóguru 🔥', color: '#ef4444', bg: '#ef444415' };
  return { id: 11, name: 'Vizuális Legenda 👑', color: '#fbbf24', bg: '#fbbf2420' };
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
        setTimeLeft(`${days}${t('viewTimeDays', ' nap ')}${hours}:${minutes}:${seconds}`);
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

  const totalImagesCount = topic.entries_count ?? topic.entry_count ?? topic.totalEntries ?? 0;
  const unvotedCount = topic.unvotedEntries ?? topic.unvoted_count ?? 0;
  return (
    <div 
      onClick={onSelect}
      style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', borderRadius: '24px', border: '1px solid #334155', padding: '25px', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 10px 25px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', position: 'relative' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = isDaily ? '#ef4444' : '#3b82f6'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#334155'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <span style={{ background: isDaily ? '#ef444420' : '#3b82f620', color: isDaily ? '#f87171' : '#60a5fa', border: `1px solid ${isDaily ? '#ef444450' : '#3b82f650'}`, padding: '4px 12px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold' }}>
          {isDaily ? t('typeBlitz', 'Villámfutam') : t('typeMaster', 'Mesterfutam')}
        </span>
        <span style={{ color: statusColor, fontSize: '0.85rem', fontWeight: 'bold' }}>
          {isMaster ? t('statusMaster', 'Képmester 🚀') : topic.hasEntered ? (lang === 'en' ? 'Entered 🚀' : 'Neveztél 🚀') : t('statusNotEntered', 'Nyitott szoba')}
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
          {t('viewCoverAuthor', 'Borítókép: ')}{topic.cover_author}
        </div>
      )}

      <h3 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '1.4rem', fontWeight: 'bold' }}>{displayTitle}</h3>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 20px 0', lineHeight: '1.5', flex: 1 }}>{displayDesc}</p>
      
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px', lineHeight: '1' }}>
        {(topic.master_name || topic.master_email) && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#a78bfa', fontSize: '0.8rem', fontWeight: 'bold', background: '#a78bfa10', padding: '6px 12px', borderRadius: '10px', border: '1px solid #a78bfa20', whiteSpace: 'nowrap' }}>
            <span> {t('viewMasterLabel', 'Képmester')}:</span>
            <span style={{ color: '#e9d5ff' }}>{topic.master_name || topic.master_email}</span>
          </div>
        )}

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold', background: '#10b98110', padding: '6px 12px', borderRadius: '10px', border: '1px solid #10b98120', whiteSpace: 'nowrap' }}>
          <span> {t('contCardTotalImages', 'Összes kép')}:</span>
          <span style={{ color: '#a7f3d0' }}>{totalImagesCount} db</span>
        </div>

        {unvotedCount > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#f97316', fontSize: '0.8rem', fontWeight: 'bold', background: '#f9731610', padding: '6px 12px', borderRadius: '10px', border: '1px solid #f9731630', whiteSpace: 'nowrap', animation: 'pulse 2s infinite' }}>
            <span>Aktivitás:</span>
            <span style={{ color: '#ffedd5' }}>{unvotedCount} db szavazásra vár</span>
          </div>
        )}
      </div>

      <div style={{ background: '#00000040', padding: '12px 15px', borderRadius: '12px', fontSize: '0.9rem', color: isDaily ? '#f87171' : '#38bdf8', textAlign: 'center', border: '1px solid #1e293b', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
        {t('timeLeft', 'HÁTRALÉVŐ IDŐ:')} {timeLeft}
      </div>
    </div>
  );
}

// ====================================================================
// ⚔️ FŐ IRÁNYÍTÓKÖZPONT KOMPONENS
// ====================================================================
export default function WeeklyChallengeView({ user, setFullscreenData }: WeeklyChallengeViewProps) {
  const { t, lang } = useLanguage();
  const [subTab, setSubTab] = useState<'current' | 'upcoming' | 'manage' | 'past' | 'arena_album' | 'my_stats' | 'hall_of_fame'>('current');
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
  const [uploadLens, setUploadCameraLens] = useState('');
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
        if (data.swapBalance !== undefined) setSwapBalance(data.swapBalance); 
        if (data.userPower !== undefined) setUserPower(data.userPower);
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

  const fetchAlbumSilently = async () => {
    if (!user?.email) return;
    setIsLoadingSwapAlbum(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/my-album?userEmail=${user.email}`);
      if (res.ok) {
        const albumPhotos = await res.json();
        setSwapAlbumPhotos(Array.isArray(albumPhotos) ? albumPhotos : []);
      } else {
        setSwapAlbumPhotos([]);
      }
    } catch (e) { 
      console.error("Silent prefetch failed:", e); 
      setSwapAlbumPhotos([]);
    } finally {
      setIsLoadingSwapAlbum(false);
    }
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

  const handleSendLobbyMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedLobbyMsg.trim() || isSendingLobbyMsg) return;
    setIsSendingLobbyMsg(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: 0,
          userEmail: user?.email,
          userName: user?.name || 'Anonim Fotós',
          messageText: typedLobbyMsg
        })
      });
      
      if (res.ok) {
        setTypedLobbyMsg('');
        setLobbyMessages(prev => [...prev, { 
          id: Date.now(),
          topic_id: 0,
          user_email: user?.email,
          user_name: user?.name || 'Anonim Fotós',
          message_text: typedLobbyMsg,
          created_at: new Date().toISOString() 
        }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingLobbyMsg(false);
    }
  };

  const myOfficialNameRef = useRef<string>(lang === 'en' ? 'Me' : 'Én');
  useEffect(() => {
    myOfficialNameRef.current = myEntry?.user_name || user?.name || (lang === 'en' ? 'Me' : 'Én');
  }, [myEntry, user, lang]);

  useEffect(() => {
    if (subTab === 'current') {
      fetchCurrentTopic(false);
      fetchAlbumSilently(); 
    }
    else if (subTab === 'upcoming') fetch(`${BACKEND_URL}/api/weekly/upcoming`).then(res => res.json()).then(data => setUpcomingTopics(data || [])).catch(console.error);
    else if (subTab === 'past') fetch(`${BACKEND_URL}/api/weekly/past`).then(res => res.json()).then(data => setPastTopics(data || [])).catch(console.error);
    else if (subTab === 'my_stats') fetchMyStats(); 
    else if (subTab === 'hall_of_fame') fetchHallOfFame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab, selectedTopicId, user?.email]);

  useEffect(() => {
    setTopic(null); setMyEntry(null); setMyPastEntries([]); setVoteEntry(null); setLeaderboard([]); setCurrentClubLeaderboard([]); setTimeLeft(''); setPastLeaderboard([]); setPastClubLeaderboard([]); setMasterVotesLeft(0); setIsMaster(false); setHasNewMessage(false);
  }, [selectedTopicId, user?.email]);

  useEffect(() => {
    if (isChatOpen && lobbyMessages.length > 0 && user?.email) {
      const lastMsg = lobbyMessages[lobbyMessages.length - 1];
      const lastId = lastMsg.id || lastMsg._id;
      if (lastId) localStorage.setItem(`arena_chat_last_read_${user.email}`, String(lastId));
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
          method: 'GET', headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' }
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
                if (!storedId || String(lastId) !== storedId) setHasNewMessage(true);
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
        if (isMounted && subTab === 'current' && selectedTopicId === null) timerId = setTimeout(fetchLobbyChat, 2500);
      }
    };
    fetchLobbyChat();
    return () => { isMounted = false; clearTimeout(timerId); };
  }, [subTab, selectedTopicId, user?.email]);

  useEffect(() => {
    if (selectedTopicId === null && subTab === 'current' && isChatOpen) {
      const handleScrollToBottom = () => {
        if (chatScrollContainerRef.current) {
          chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
        }
      };
      handleScrollToBottom();
      const t1 = setTimeout(handleScrollToBottom, 50);
      const t2 = setTimeout(handleScrollToBottom, 150);
      const t3 = setTimeout(handleScrollToBottom, 350); 

      return () => {
        clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      };
    }
  }, [lobbyMessages.length, selectedTopicId, subTab, isChatOpen]);

  const fetchHallOfFame = async () => {
    setIsLoadingHof(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/hall-of-fame`);
      if (res.ok) {
        const data = await res.json();
        setHallOfFame(Array.isArray(data) ? data : []);
      } else {
        setHallOfFame([]);
      }
    } catch (err) {
      console.error("Hiba a dicsőségcsarnok letöltésekor:", err);
      setHallOfFame([]);
    } finally {
      setIsLoadingHof(false);
    }
  };

  const fetchMyStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/my-stats?userEmail=${user?.email || ''}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.history && data.podiums) setMyStats(data);
        else setMyStats({ podiums: { first: 0, second: 0, third: 0 }, history: [] });
      }
    } catch (error) { console.error(error); } 
    finally { setIsLoadingStats(false); }
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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entryId, userEmail: user?.email || '' })
      });
      if (res.ok) {
        alert(t('msgReportSuccess')); setMyVoteCount(prev => prev + 1);
        if (topic) { fetchNextVote(topic.id); fetchCurrentTopic(true); }
      }
    } catch (e) { alert(t('msgReportError')); if (topic) fetchNextVote(topic.id); }
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
      if (res.ok) { setMyVoteCount(prev => prev + 1); fetchNextVote(topic.id); fetchCurrentTopic(true); }
    } catch (e) { if(topic) fetchNextVote(topic.id); }
  };

  const handleClaimReferral = async () => {
    if (!referralInput.trim()) return;
    setIsClaimingReferral(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/claim-referral`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user?.email, referralCode: referralInput.trim().toUpperCase() })
      });
      if (res.ok) { alert(t('msgReferralSuccess')); setReferredBy(referralInput); fetchCurrentTopic(true); } 
      else { const err = await res.json(); alert(err.error || t('msgSwapErrorMain')); }
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
          } else if (exifData.Make) setUploadCamera(exifData.Make);
          else setUploadCamera('');

          setUploadCameraLens(exifData.LensModel || '');
          if (exifData.ExposureTime) {
            const shutterFraction = exifData.ExposureTime < 1 ? `1/${Math.round(1 / exifData.ExposureTime)}s` : `${exifData.ExposureTime}s`;
            setUploadShutter(shutterFraction);
          } else setUploadShutter('');

          setUploadIso(exifData.ISO ? String(exifData.ISO) : '');
          setUploadAperture(exifData.FNumber ? `f/${exifData.FNumber}` : '');
          setUploadSoftware(exifData.Software || '');
        }
      } catch (exifError) {
        setUploadCamera('');
        setUploadCameraLens(''); setUploadShutter(''); setUploadIso(''); setUploadAperture(''); setUploadSoftware('');
      }
      let finalFile = rawFile;
      if (rawFile.size > 2 * 1024 * 1024) finalFile = await compressImageOnClient(rawFile);
      setUploadFile(finalFile); if (uploadPreview) URL.revokeObjectURL(uploadPreview); setUploadPreview(URL.createObjectURL(finalFile));
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return alert("Nincs fájl kiválasztva!");
    setIsUploading(true);
    const formData = new FormData();
    formData.append('photo', uploadFile); formData.append('userEmail', user.email); formData.append('topicId', topic.id); formData.append('userName', user.name || user.email);
    formData.append('camera', uploadCamera); formData.append('lens', uploadLens);
    formData.append('shutter', uploadShutter); formData.append('iso', uploadIso); formData.append('aperture', uploadAperture); formData.append('software', uploadSoftware);

    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/upload`, { method: 'POST', body: formData });
      if (res.ok) {
        alert("Sikeres nevezés rögzített EXIF adatokkal!");
        setUploadFile(null); if (uploadPreview) URL.revokeObjectURL(uploadPreview); setUploadPreview(null);
        setUploadCamera(''); setUploadCameraLens(''); setUploadShutter(''); setUploadIso(''); setUploadAperture(''); setUploadSoftware('');
        await fetchCurrentTopic(true); fetchAlbumSilently(); 
      }
    } catch (e) { console.error(e); } 
    finally { setIsUploading(false); }
  };

  const handleFileSelectForSwap = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const rawFile = e.target.files[0];
      try {
        const exifData = await exifr.parse(rawFile);
        if (exifData) {
          if (exifData.Model) {
            const makePrefix = exifData.Make && !exifData.Model.startsWith(exifData.Make) ? `${makePrefix}${exifData.Model}` : '';
            setSwapCamera(exifData.Model);
          }
          setSwapLens(exifData.LensModel || '-');
          if (exifData.ExposureTime) {
            setSwapShutter(exifData.ExposureTime < 1 ? `1/${Math.round(1 / exifData.ExposureTime)}s` : `${exifData.ExposureTime}s`);
          }
          setSwapIso(exifData.ISO ? String(exifData.ISO) : '');
          setSwapAperture(exifData.FNumber ? `f/${exifData.FNumber}` : '');
          setSwapSoftware(exifData.Software || '');
        }
      } catch (e) {
        setSwapCamera('');
        setSwapLens(''); setSwapShutter(''); setSwapIso(''); setSwapAperture(''); setSwapSoftware('');
      }
      let finalFile = rawFile;
      if (rawFile.size > 2 * 1024 * 1024) finalFile = await compressImageOnClient(rawFile);
      setSwapFile(finalFile); if (swapPreview) URL.revokeObjectURL(swapPreview); setSwapPreview(URL.createObjectURL(finalFile));
    }
  };

  const handleSwapSubmit = async () => {
    if (!swapFile || !topic) return;
    if (!window.confirm(t('msgSwapConfirm'))) return;
    setIsSwapping(true);
    try {
      const formData = new FormData();
      formData.append('photo', swapFile); formData.append('topicId', topic.id.toString()); formData.append('userEmail', user?.email || '');
      formData.append('userName', user?.name || '');
      formData.append('camera', swapCamera); formData.append('lens', swapLens); formData.append('shutter', swapShutter); formData.append('iso', swapIso); formData.append('aperture', swapAperture); formData.append('software', swapSoftware);
      const res = await fetch(`${BACKEND_URL}/api/weekly/swap`, { method: 'POST', body: formData });
      if (res.ok) { 
        alert(t('msgSwapSuccess')); setSwapFile(null); setSwapPreview(null); 
        setSwapCamera(''); setSwapLens(''); setSwapShutter(''); setSwapIso(''); setSwapAperture(''); setSwapSoftware('');
        fetchCurrentTopic(false); fetchAlbumSilently();
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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topicId: topic.id, userEmail: user?.email, entryId })
      });
      if (res.ok) { alert(t('msgSwapBackSuccess')); fetchCurrentTopic(false); fetchAlbumSilently(); } 
      else { const err = await res.json(); alert(err.error || t('msgSwapErrorMain')); }
    } catch (e) { alert(t('msgNetworkError')); }
    finally { setIsSwapping(false); }
  };

  const handleSelectPhotoForSwap = async (photoUrl: string) => {
    if (!window.confirm(t('msgSwapExistingConfirm'))) return;
    setIsSwapping(true); setShowSwapAlbumModal(false);
    try {
      const swapRes = await fetch(`${BACKEND_URL}/api/weekly/swap-existing`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topicId: topic.id, userEmail: user.email, userName: user.name, fileUrl: photoUrl })
      });
      if (swapRes.ok) { alert(t('msgSwapExistingSuccess')); fetchCurrentTopic(false); fetchAlbumSilently(); } 
      else { const err = await swapRes.json(); alert(err.error); }
    } catch (e) { alert(t('msgNetworkError')); } 
    finally { setIsSwapping(false); }
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
      const shareTextCompiled = t('msgShareText').replace('{rank}', lang === 'en' ? getOrdinalStr(activeShareData.rank) : String(activeShareData.rank)).replace('{title}', activeShareData.topic_title);
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: t('msgShareTitle'), text: shareTextCompiled });
      } else {
        const link = document.createElement('a'); link.download = `Arena_Trophy_${activeShareData.topic_title}.png`; link.href = dataUrl;
        link.click();
      }
      setActiveShareData(null);
     } catch (e) { alert(t('msgGenerateImageError')); } 
     finally { setIsGeneratingImage(false); }
  };

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
    const timeA = new Date(dateStrA).getTime() || 0; const timeB = new Date(dateStrB).getTime() || 0;
    return sortBy === 'endDate' ? timeA - timeB : timeB - timeA;
  });

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', position: 'relative' }}>
      
      {/* TABS HEADER GOMBSOR */}
      <div className="arena-tabs-scroll-wrapper" style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', marginBottom: '25px', borderRadius: '16px 16px 0 0' }}>
        <div className="arena-tabs-internal-line" style={{ display: 'flex', gap: '8px', padding: '15px 20px 0 20px', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'current', label: lang === 'en' ? 'Active' : 'Aktív szobák' },
              { id: 'upcoming', label: lang === 'en' ? 'Upcoming' : 'Közelgő Ligák' }, 
              { id: 'manage', label: lang === 'en' ? 'Manage' : 'Tervezőpult' },
              { id: 'past', label: lang === 'en' ? 'Completed' : 'Lezárt Arénák' },
              { id: 'arena_album', label: lang === 'en' ? 'My Arena Album' : 'Aréna Albumom' },
              { id: 'my_stats', label: lang === 'en' ? 'Statistics' : 'Trófea statisztikák' },
              { id: 'hall_of_fame', label: lang === 'en' ? 'Hall of Fame' : 'Dicsőségcsarnok' }
            ].map((tab) => {
              const isActive = subTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setSubTab(tab.id as any); setSelectedTopicId(null); }}
                  style={{
                    padding: '12px 24px',
                    background: isActive ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                    color: isActive ? '#38bdf8' : '#94a3b8',
                    border: 'none',
                    borderBottom: isActive ? '3px solid #38bdf8' : '3px solid transparent',
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    borderRadius: '8px 8px 0 0',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px', flexShrink: 0 }}>
            <div style={{ background: 'linear-gradient(135deg, #be123c20, #e11d4830)', color: '#fb7185', border: '1px solid #be123c50', padding: '6px 16px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(190, 18, 60, 0.15)' }}>
              <span style={{ fontSize: '1rem' }}>🔄</span> 
              <span>{swapBalance} {lang === 'en' ? 'Swaps left' : 'Joker Csere'}</span>
            </div>

            <button onClick={() => setShowHelp(true)} style={{ background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b40', padding: '6px 16px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              📜 {t('btnRules')}
            </button>
          </div>
        </div>
      </div>

      {/* 🎖️ RANG PROGRESSION TRACK BAR */}
      <div className="arena-progress-card-wrapper" style={{ background: '#1e293b', padding: '15px 20px', borderRadius: '16px', border: '1px solid #334155', marginBottom: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
        <div className="arena-progress-track-line" style={{ display: 'flex', width: '100%', border: '1px solid #0f172a', position: 'relative' }}>
          {ARENA_LEVELS_REGISTRY.map((rank, idx) => {
            const isUnlocked = idx <= currentLevel.id;
            const isCurrent = idx === currentLevel.id;
            
            const nextLvlObj = ARENA_LEVELS_REGISTRY[idx];
            const likesDiff = nextLvlObj.minLikes - userTotalLikes;
            const winsDiff = (nextLvlObj.minVictories || 0) - userVictories;

            let requirementMessage = '';
            if (likesDiff > 0) requirementMessage += `${likesDiff} db Kedvelés (⭐) `;
            if (winsDiff > 0) requirementMessage += `${requirementMessage ? 'és ' : ''}${winsDiff} db Aréna Győzelem (🥇)`;

            const tooltipText = isUnlocked 
              ? `${rank.name} - Sikeresen feloldva! ✔` 
              : `Következő szint: ${rank.name}\nHátralévő feltétel: ${requirementMessage}`;
            let segmentBg = '#0f172a'; 
            if (isUnlocked) segmentBg = '#0284c7'; 
            if (isCurrent) segmentBg = 'linear-gradient(90deg, #0284c7, #38bdf8)';
            return (
              <div
                key={rank.id}
                className="arena-rank-tooltip-container"
                style={{
                  flex: 1,
                  background: segmentBg,
                  padding: '12px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  borderRight: idx < ARENA_LEVELS_REGISTRY.length - 1 ? '1px solid rgba(15,23,42,0.3)' : 'none',
                  position: 'relative',
                  cursor: 'help',
                  transition: 'all 0.2s ease',
                  borderTopLeftRadius: idx === 0 ? '8px' : '0',
                  borderBottomLeftRadius: idx === 0 ? '8px' : '0',
                  borderTopRightRadius: idx === ARENA_LEVELS_REGISTRY.length - 1 ? '8px' : '0',
                  borderBottomRightRadius: idx === ARENA_LEVELS_REGISTRY.length - 1 ? '8px' : '0'
                }}
              >
                <span style={{ fontSize: '0.85rem' }}>{isUnlocked ? '🔓' : '🔒'}</span>
                <span style={{ 
                  fontSize: '0.74rem', 
                  fontWeight: '900', 
                  color: isUnlocked ? '#ffffff' : '#475569',
                  border: isCurrent ? '1px solid #ffffff80' : 'none',
                  padding: isCurrent ? '1px 5px' : '0',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden'
                }}>
                  {rank.name.split(' ')[0]}
                </span>

                <div className="arena-rank-tooltip-box">
                  <div style={{ fontWeight: 'bold', color: '#fbbf24', marginBottom: '4px' }}>{rank.name}</div>
                  <div style={{ fontSize: '0.75rem', whiteSpace: 'pre-line', lineHeight: '1.4', color: '#e2e8f0' }}>{tooltipText}</div>
                  <div style={{ marginTop: '8px', fontSize: '0.7rem', color: '#64748b', borderTop: '1px solid #223147', paddingTop: '4px' }}>
                    Saját statisztikád: {userTotalLikes} ⭐ | {userVictories} 🥇
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🎮 ALMODULOK DINAMIKUS MEGJELENÍTÉSI ZÓNÁJA */}
      <div style={{ width: '100%' }}>
        
        {subTab === 'current' && (
          <>
            {selectedTopicId === null ? (
              <div className="arena-fluid-container">
                <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '15px' }}>
                  {activeTopics.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 'bold' }}>{t('sortLabel')}</span>
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} style={{ background: '#0f172a', color: 'white', border: '1px solid #334155', padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem', outline: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                        <option value="endDate">{t('sortEndDate')}</option>
                        <option value="startDate">{t('sortStartDate')}</option>
                      </select>
                    </div>
                  )}
                </div>

                {loading ? (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: '80px 20px', 
                    gap: '20px',
                    width: '100%' 
                  }}>
                    <VideoLoader />
                    <div style={{ textAlign: 'center', animation: 'arenaPulse 2s infinite' }}>
                      <h4 style={{ color: '#f59e0b', margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                        {lang === 'en' ? '⚡ Server is waking up...' : '⚡ A szerver ébredezik...'}
                      </h4>
                      <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, maxWidth: '320px', lineHeight: '1.4' }}>
                        {lang === 'en' 
                          ? 'The free tier hosting takes about 30-50 seconds to warm up after a period of inactivity.' 
                          : 'A rendszer tétlenség után 30-50 másodpercig melegszik be. Azonnal indulunk!'}
                      </p>
                    </div>
                    <style>{`@keyframes arenaPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }`}</style>
                  </div>
                ) : activeTopics.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'linear-gradient(180deg, #1e293b, #0f172a)', borderRadius: '24px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>😴</div>
                    <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '2rem' }}>{t('viewNoActiveLeagues')}</h2>
                    <p style={{ color: '#94a3b8' }}>{t('viewNoActiveLeaguesDesc')}</p>
                  </div>
                ) : (
                  <div className="arena-cards-grid">
                    {sortedActiveTopics.map((actTop) => (
                      <ChallengeCard key={actTop.id} topic={actTop} onSelect={() => setSelectedTopicId(actTop.id)} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <button onClick={() => { setSelectedTopicId(null); }} style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '8px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    {t('viewBackBtn')}
                  </button>
                </div>
                {(!topic || loading) ? (
                  <div style={{ color: '#94a3b8', padding: '50px' }}>{t('viewPreparingRoom')}</div>
                ) : (
                  <ArenaActiveRoom
                    topic={topic} timeLeft={timeLeft} isMaster={isMaster} exposureColor={exposureColor} exposurePercentage={exposurePercentage} exposureLabel={exposureLabel} myEntry={myEntry} voteEntry={voteEntry} noMoreEntries={noMoreEntries} masterVotesLeft={masterVotesLeft} userPower={userPower} swapBalance={swapBalance} myPastEntries={myPastEntries} leaderboard={leaderboard} currentClubLeaderboard={currentClubLeaderboard} user={user} isUploading={isUploading} uploadPreview={uploadPreview} handleFileSelect={handleFileSelect} handleUpload={handleUpload} 
                    isLoadingSwapAlbum={isLoadingSwapAlbum} isSwapping={isSwapping} swapPreview={swapPreview} handleSwapFileSelect={handleFileSelectForSwap} handleSwapSubmit={handleSwapSubmit} onOpenAlbumForUpload={() => { setAlbumModalMode('upload'); setShowSwapAlbumModal(true); }} onOpenAlbumForSwap={() => { setAlbumModalMode('swap'); setShowSwapAlbumModal(true); }} handleVote={handleVote} handleOffTopicReport={handleOffTopicReport} handleSwapBackSubmit={handleSwapBackSubmit} setFullscreenData={setFullscreenData} handleImageError={handleImageError} fetchCurrentTopic={fetchCurrentTopic}
                  />
                )}
              </div>
            )}

            {/* FLOATING CHAT DOCK PANEL */}
            <div className={`arena-floating-chat-dock ${isChatOpen ? 'is-open' : 'is-closed'} ${hasNewMessage ? 'has-unread' : ''}`}>
              <div onClick={() => { setIsChatOpen(!isChatOpen); if (!isChatOpen) setHasNewMessage(false); }} className="chat-dock-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
                  <span style={{ fontSize: '1.2rem' }}>💬</span>
                  <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                    {t('viewLobbyTitle')} {hasNewMessage && <span style={{ color: '#f43f5e', fontSize: '0.8rem', marginLeft: '5px' }}>({lang === 'en' ? 'New!' : 'Új!'})</span>}
                  </span>
                  {hasNewMessage && <span className="chat-notification-badge" />}
                </div>
                <span style={{ transform: isChatOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▲</span>
              </div>
              {isChatOpen && (
                <div className="chat-dock-body">
                  <p style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '0.78rem' }}>{t('viewLobbyDesc')}</p>
                  
                  <div ref={chatScrollContainerRef} className="chat-messages-scroll-area">
                    {lobbyMessages.length === 0 ? (
                      <div style={{ color: '#475569', textAlign: 'center', margin: 'auto', fontStyle: 'italic', fontSize: '0.85rem' }}>{t('viewLobbyEmpty')}</div>
                    ) : (
                      lobbyMessages.slice(-100).map((msg, idx) => {
                        const isMsgMe = (msg.user_email || msg.userEmail) === user?.email;
                        return (
                          <div key={msg.id || idx} style={{ display: 'flex', flexDirection: 'column', alignItems: isMsgMe ? 'flex-end' : 'flex-start', maxWidth: '92%', alignSelf: isMsgMe ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginBottom: '2px', fontSize: '0.7rem', color: isMsgMe ? '#38bdf8' : '#94a3b8', fontWeight: 'bold' }}>
                              <span>{msg.user_name || msg.userName}</span>
                              <span style={{ color: '#475569', fontWeight: 'normal' }}>• {new Date(msg.created_at).toLocaleTimeString(lang === 'en' ? 'en-US' : 'hu-HU', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div style={{ background: isMsgMe ? 'linear-gradient(135deg, #f97316, #ef4444)' : '#1e293b', color: '#f8fafc', padding: '8px 12px', borderRadius: isMsgMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px', fontSize: '0.85rem', wordBreak: 'break-word', border: isMsgMe ? 'none' : '1px solid #334155' }}>
                              {msg.message_text || msg.messageText}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div style={{ height: '14px', fontSize: '0.75rem', color: '#38bdf8', fontStyle: 'italic', marginBottom: '5px' }}>
                    {currentlyTyping.length > 0 && <span>{currentlyTyping.join(', ')}{t('viewLobbyTyping')}...</span>}
                  </div>
                  <form onSubmit={handleSendLobbyMessage} style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" placeholder={t('viewLobbyPlaceholder')} value={typedLobbyMsg} onChange={handleInputChange} maxLength={500} disabled={isSendingLobbyMsg} style={{ flex: 1, padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '10px', fontSize: '0.85rem' }} />
                    <button type="submit" disabled={!typedLobbyMsg.trim() || isSendingLobbyMsg} style={{ background: (!typedLobbyMsg.trim() || isSendingLobbyMsg) ? '#334155' : 'linear-gradient(135deg, #f97316, #ef4444)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>{t('viewLobbySend')}</button>
                  </form>
                </div>
              )}
            </div>
          </>
        )}

        {subTab === 'manage' && (
          <BattlePlanner user={user} onSuccess={() => { setSubTab('current'); fetchCurrentTopic(false); }} />
        )}

        {subTab === 'upcoming' && (
          <UpcomingChallenges upcomingTopics={upcomingTopics} getTopicType={getTopicType} handleImageError={handleImageError} user={user} />
        )}
        
        {subTab === 'past' && (
          <PastArchive 
            pastTopics={pastTopics} 
            selectedPastTopicId={selectedPastTopicId} 
            setSelectedPastTopicId={setSelectedPastTopicId} 
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
          <TrophyRoom isLoadingStats={isLoadingStats} myStats={myStats} userTotalLikes={userTotalLikes} userVictories={userVictories} swapBalance={swapBalance} myReferralCode={myReferralCode} referredBy={referredBy} referralInput={referralInput} setReferralInput={setReferralInput} isClaimingReferral={isClaimingReferral} handleClaimReferral={handleClaimReferral} setActiveShareData={setActiveShareData} />
        )}

        {subTab === 'hall_of_fame' && (
          <HallOfFame user={user} />
        )}

        {subTab === 'arena_album' && (
          <MyArenaAlbumView user={user} setFullscreenData={setFullscreenData} />
        )}
      </div>

      {/* COMPONENT MODALS */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      
      <AlbumSelectionModal
        isOpen={showSwapAlbumModal}
        onClose={(wasActionSubmitted) => {
          setShowSwapAlbumModal(false);
          if (wasActionSubmitted) fetchCurrentTopic(true);
        }}
        albumModalMode={albumModalMode}
        swapAlbumPhotos={swapAlbumPhotos}
        myPastEntries={myPastEntries}
        topic={topic}
        user={user}
        isLoading={isLoadingSwapAlbum}
        setIsUploading={setIsUploading}
        setIsSwapping={setIsSwapping}
        fetchCurrentTopic={fetchCurrentTopic}
        handleSwapBackSubmit={handleSwapBackSubmit}
        handleSelectPhotoForSwap={handleSelectPhotoForSwap}
        myEntry={myEntry} // 🎯 ÚJ: Átadjuk az éppen bent lévő képet is a szűréshez
      />

      {activeShareData && (
        <ShareCardModal 
          data={activeShareData} 
          user={user} 
          onClose={() => { setActiveShareData(null); setShareBase64(null); }} 
          isGeneratingImage={isGeneratingImage}
          setIsGeneratingImage={setIsGeneratingImage}
          shareBase64={shareBase64}
          setShareBase64={setShareBase64}
          loadingShareImg={loadingShareImg}
          setLoadingShareImg={setLoadingShareImg}
        />
      )}

      {/* ── RENDKÍVÜL STABIL RESZPONZÍV STYLING REGETEG ── */}
      <style>{`
        .arena-fluid-container { width: 100%; box-sizing: border-box; }
        .arena-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 25px; width: 100%; }
        .arena-rank-tooltip-container { position: relative; }
        
        /* 🎯 ULTRASTABIL MODERN RANGSÁV JAVÍTÁS */
        .arena-progress-card-wrapper {
          background: #1e293b;
          padding: 15px 20px;
          border-radius: 16px;
          border: '1px solid #334155';
          margin-bottom: 30px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          overflow: visible !important; /* Biztosítja, hogy a tooltip ne vágódjon le */
        }
        
        .arena-progress-track-line {
          display: flex;
          width: 100%;
          border: 1px solid #0f172a;
          border-radius: 8px;
          overflow: hidden;
        }

        .arena-rank-tooltip-container span {
          transition: opacity 0.2s ease;
        }

        /* 📱 MOBIL ELRENDEZÉS: Letisztult, kompakt Bento-csík */
        @media (max-width: 768px) {
          .arena-progress-card-wrapper {
            padding: 12px 10px !important;
          }
          .arena-rank-tooltip-container {
            padding: 15px 0 !important; /* Elég nagy érintési felület a mobil tooltiphez */
          }
          .arena-rank-tooltip-container span {
            display: none !important; /* Mobilon elrejtjük a szövegeket és emojikat a sávból */
          }
        }

        /* 💻 ASZTALI ELRENDEZÉS: Itt már minden kiírható */
        @media (min-width: 769px) {
          .arena-progress-track-line {
            min-width: 100% !important;
          }
        }

        .arena-progress-card-wrapper, .arena-tabs-scroll-wrapper {
          scrollbar-width: thin;
          scrollbar-color: #334155 #1e293b;
        }
        .arena-progress-card-wrapper::-webkit-scrollbar, .arena-tabs-scroll-wrapper::-webkit-scrollbar {
          height: 5px;
        }
        .arena-progress-card-wrapper::-webkit-scrollbar-track, .arena-tabs-scroll-wrapper::-webkit-scrollbar-track {
          background: #1e293b;
        }
        .arena-progress-card-wrapper::-webkit-scrollbar-thumb, .arena-tabs-scroll-wrapper::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 10px;
        }

        @media (max-width: 900px) {
          .arena-tabs-scroll-wrapper {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 5px !important;
          }
          .arena-tabs-internal-line {
            min-width: 890px !important;
            justify-content: flex-start !important;
          }
        }
        
        /* 🎯 TOOLTIP POZÍCIONÁLÁS JAVÍTÁS MOBILRA IS */
        .arena-rank-tooltip-box {
          position: absolute;
          bottom: 145%; 
          left: 50%; 
          transform: translateX(-50%) translateY(8px);
          background: #090d16; 
          color: #f8fafc; 
          border: 1px solid #334155; 
          border-radius: 12px;
          width: 220px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.7); 
          z-index: 999999 !important;
          opacity: 0; 
          pointer-events: none; 
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 14px; 
          text-align: center;
        }
        .arena-rank-tooltip-box::after {
          content: "";
          position: absolute; 
          top: 100%; 
          left: 50%; 
          transform: translateX(-50%);
          border-width: 6px; 
          border-style: solid; 
          border-color: #090d16 transparent transparent transparent;
        }
        
        /* Aktív lebegő vagy érintési állapot */
        .arena-rank-tooltip-container:hover .arena-rank-tooltip-box,
        .arena-rank-tooltip-container:active .arena-rank-tooltip-box {
          opacity: 1;
          transform: translateX(-50%) translateY(0); 
          pointer-events: auto;
        }

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
          transform: translateY(calc(100% - 45px));
        }
        .arena-floating-chat-dock.has-unread .chat-dock-header { 
          border-color: #f43f5e; 
          box-shadow: inset 0 0 10px rgba(244,63,94,0.2);
        }
        .chat-dock-header { 
          padding: 12px 20px; 
          background: linear-gradient(90deg, #1e293b, #0f172a);
          border-bottom: 1px solid #334155; 
          border-radius: 15px 15px 0 0; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          cursor: pointer; 
          user-select: none;
        }
        .chat-dock-header:hover { background: #24334d; }
        .chat-dock-body { padding: 15px; height: 350px; display: flex; flex-direction: column; }
        .chat-messages-scroll-area { 
          background: #090d16; 
          border: 1px solid #223147; 
          border-radius: 10px; 
          padding: 10px;
          flex: 1; 
          overflow-y: auto; 
          display: flex; 
          flex-direction: column; 
          gap: 10px;
          margin-bottom: 10px;
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
        @keyframes pulse { 
          0% { transform: scale(0.9); opacity: 1; } 
          50% { transform: scale(1.2); opacity: 0.5; } 
          100% { transform: scale(0.9); opacity: 1; } 
        }
        @media (max-width: 480px) { 
          .arena-floating-chat-dock { right: 10px; width: calc(100% - 20px); } 
        }
      `}</style>

    </div>
  );
}
