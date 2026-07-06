import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BACKEND_URL, ADMIN_EMAIL } from '../utils/constants';
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
import ChallengeShareModal from '../components/WeeklyChallenge/ChallengeShareModal';

// Professzionális Lucide Ikonok importálása (Coins hozzáadva)
import { 
  Flame, 
  Zap, 
  Trophy, 
  HelpCircle, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Calendar, 
  History, 
  BarChart3, 
  Award, 
  MessageSquare, 
  Send, 
  ChevronUp, 
  ChevronDown, 
  Share2, 
  Info,
  BookOpen,
  Coins
} from 'lucide-react';

interface WeeklyChallengeViewProps {
  user: any;
  setFullscreenData: (data: { url: string; title?: string } | null) => void;
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
  if (likes < 30) return { id: 0, name: 'Fényleső 🌱', color: '#64748b', bg: 'rgba(100,116,139,0.1)' };
  if (likes < 100) return { id: 1, name: 'Megfigyelő 👁️', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
  if (likes < 250) return { id: 2, name: 'Képvadász 📷', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' };
  if (likes < 500) return { id: 3, name: 'Komponista 📐', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' };
  if (likes < 800 || victories < 1) return { id: 4, name: 'Fényíró 🎞️', color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
  if (likes < 1300 || victories < 2) return { id: 5, name: 'Esztéta 💎', color: '#059669', bg: 'rgba(5,150,105,0.1)' };
  if (likes < 1300 || victories < 3) return { id: 6, name: 'Szakértő 🎯', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' };
  if (likes < 2000 || victories < 5) return { id: 7, name: 'Képmester 🎨', color: '#ec4899', bg: 'rgba(236,72,153,0.1)' };
  if (likes < 3200 || victories < 7) return { id: 8, name: 'Nagymester 🌟', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
  if (likes < 4800 || victories < 9) return { id: 9, name: 'Virtuóz ⚡', color: '#eab308', bg: 'rgba(234,179,8,0.1)' };
  if (likes < 7000 || victories < 12) return { id: 10, name: 'Fotóguru 🔥', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
  return { id: 11, name: 'Vizuális Legenda 👑', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' };
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

const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('photoAppToken');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

// ====================================================================
// 📊 SELEKCIÓS KÁRTYA KOMPONENS
// ====================================================================
function ChallengeCard({ topic, onSelect, onShare }: { topic: any; onSelect: () => void, onShare: () => void }) {
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
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [topic.id, topic.end_date, t]);

  const isDaily = getTopicType(topic.start_date, topic.end_date) === 'daily';
  const isMaster = topic.isMaster === true;
  const statusColor = isMaster ? '#a78bfa' : (topic.hasEntered ? '#10b981' : '#f59e0b');
  const displayTitle = lang === 'en' && topic.title_en ? topic.title_en : topic.title;
  const displayDesc = lang === 'en' && topic.description_en ? topic.description_en : topic.description;

  const totalImagesCount = topic.entries_count ?? topic.entry_count ?? topic.totalEntries ?? 0;
  const unvotedCount = topic.unvotedEntries ?? topic.unvoted_count ?? 0;
  
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    onShare(); 
  };

  return (
    <div 
      onClick={onSelect}
      style={{ background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-main)', padding: '22px', cursor: 'pointer', transition: 'all 0.2s ease-in-out', display: 'flex', flexDirection: 'column', position: 'relative' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = isDaily ? '#ef4444' : '#3b82f6'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-main)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ background: isDaily ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.08)', color: isDaily ? '#f87171' : '#60a5fa', border: `1px solid ${isDaily ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'}`, padding: '3px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
          {isDaily ? t('typeBlitz', 'Villámfutam') : t('typeMaster', 'Mesterfutam')}
        </span>
        <span style={{ color: statusColor, fontSize: '0.8rem', fontWeight: 'bold' }}>
          {isMaster ? t('statusMaster', 'Képmester') : topic.hasEntered ? (lang === 'en' ? 'Entered' : 'Neveztél') : t('statusNotEntered', 'Nyitott szoba')}
        </span>
      </div>

      {topic.cover_url && (
        <div style={{ width: '100%', height: '140px', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px', border: '1px solid var(--border-main)', position: 'relative', backgroundColor: '#090d16' }}>
          <img src={topic.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleImageError} />
        </div>
      )}
      {topic.cover_author && (
        <div style={{ color: '#475569', fontSize: '0.72rem', fontStyle: 'italic', marginTop: '-8px', marginBottom: '12px', textAlign: 'right', paddingRight: '2px' }}>
          {t('viewCoverAuthor', 'Borítókép: ')}{topic.cover_author}
        </div>
      )}

      <h3 style={{ color: 'var(--text-title)', margin: '0 0 8px 0', fontSize: '1.15rem', fontWeight: '600', letterSpacing: '-0.2px' }}>{displayTitle}</h3>
      <p style={{ color: 'var(--text-body)', fontSize: '0.85rem', margin: '0 0 16px 0', lineHeight: '1.45', flex: 1 }}>{displayDesc}</p>
      
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px', lineHeight: '1' }}>
        {(topic.master_name || topic.master_email) && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#a78bfa', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(167,139,250,0.06)', padding: '5px 10px', borderRadius: '4px', border: '1px solid rgba(167,139,250,0.15)', whiteSpace: 'nowrap' }}>
            <span> {t('viewMasterLabel', 'Képmester')}:</span>
            <span style={{ color: '#e9d5ff' }}>{topic.master_name || topic.master_email}</span>
          </div>
        )}

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(16,185,129,0.06)', padding: '5px 10px', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.15)', whiteSpace: 'nowrap' }}>
          <span> {t('contCardTotalImages', 'Összes kép')}:</span>
          <span style={{ color: '#a7f3d0' }}>{totalImagesCount} db</span>
        </div>

        {unvotedCount > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#f97316', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(249,115,22,0.06)', padding: '5px 10px', borderRadius: '4px', border: '1px solid rgba(249,115,22,0.15)', whiteSpace: 'nowrap' }}>
            <span>Aktivitás:</span>
            <span style={{ color: '#ffedd5' }}>{unvotedCount} db szavazásra vár</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        <div style={{ flex: 1, background: 'var(--bg-main)', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-main)', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '0.5px' }}>
            {t('timeLeft', 'HÁTRALÉVŐ IDŐ:')}
          </span>
          <span style={{ fontSize: '0.88rem', color: isDaily ? '#f87171' : '#38bdf8', fontWeight: '700' }}>
            {timeLeft}
          </span>
        </div>
        
        <button 
          onClick={handleShare}
          style={{ background: '#3b5998', color: 'white', border: 'none', borderRadius: '4px', padding: '0 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background 0.15s ease', justifyContent: 'center' }}
          onMouseEnter={e => e.currentTarget.style.background = '#2d4373'}
          onMouseLeave={e => e.currentTarget.style.background = '#3b5998'}
          title={lang === 'en' ? 'Share' : 'Megosztás'}
        >
          <Share2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ====================================================================
// 👑 FŐ IRÁNYÍTÓKÖZPONT KOMPONENS
// ====================================================================
export default function WeeklyChallengeView({ user, setFullscreenData }: WeeklyChallengeViewProps) {
  const { t, lang } = useLanguage();
  const [subTab, setSubTab] = useState<'current' | 'upcoming' | 'manage' | 'past' | 'arena_album' | 'my_stats' | 'hall_of_fame'>('current');
  const [loading, setLoading] = useState(true);
  
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [topicToShare, setTopicToShare] = useState<any | null>(null);
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

  // 🪙 Helyi pontegyenleg állapot az Arénán belüli kijelzéshez
  const [pointsBalance, setPointsBalance] = useState<number>(user?.points_balance || 0);

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

  const isAdminUser = user?.email === ADMIN_EMAIL;
  const isChatOpenRef = useRef(isChatOpen);
  const lobbyMessagesCountRef = useRef(lobbyMessages.length);
  const lastTypingSignalSent = useRef<number>(0);

  // Szinkronizáljuk az egyenleget, ha a szülő komponens vagy a profil frissül
  useEffect(() => {
    if (user?.points_balance !== undefined) {
      setPointsBalance(user.points_balance);
    }
  }, [user?.points_balance]);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
    lobbyMessagesCountRef.current = lobbyMessages.length;
  }, [isChatOpen, lobbyMessages.length]);

  const fetchNextVote = async (topicId: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/next-vote?topicId=${topicId}&userEmail=${user?.email || ''}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.entry) { setVoteEntry(data.entry); setNoMoreEntries(false); } 
        else { setVoteEntry(null); setNoMoreEntries(true); }
      }
    } catch (e) { console.error(e); }
  };

      // 🪙 ÚJ: Golyóálló pontszám-szinkronizáció közvetlenül az adatbázisból
  const fetchFreshPointsBalance = async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/${user.email}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const freshData = await res.json();
        if (freshData.points_balance !== undefined) {
          setPointsBalance(freshData.points_balance);
        }
      }
    } catch (e) {
      console.error("Nem sikerült az Aréna pontszámot közvetlenül szinkronizálni:", e);
    }
  };
  
  const fetchCurrentTopic = async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
      setFetchError(null);
    }


    
    if (!user?.email) {
      if (!isSilent) setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(); 
    }, 5000);

    try {
      const url = selectedTopicId 
        ? `${BACKEND_URL}/api/weekly/current?userEmail=${user.email}&topicId=${selectedTopicId}`
        : `${BACKEND_URL}/api/weekly/current?userEmail=${user.email}`;
      const res = await fetch(url, { 
        signal: controller.signal,
        headers: getAuthHeaders()
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Szerver hiba státusz: ${res.status}`);
      }

      const data = await res.json();
      
      if (data.userTotalLikes !== undefined) setUserTotalLikes(data.userTotalLikes);
      if (data.userVictories !== undefined) setUserVictories(data.userVictories);
      if (data.masterVotesLeft !== undefined) setMasterVotesLeft(data.masterVotesLeft); 
      if (data.isMaster !== undefined) setIsMaster(data.isMaster);                      
      if (data.myReferralCode !== undefined) setMyReferralCode(data.myReferralCode);
      if (data.referredBy !== undefined) setReferredBy(data.referredBy);
      if (data.swapBalance !== undefined) setSwapBalance(data.swapBalance);
      if (data.userPower !== undefined) setUserPower(data.userPower);
      if (data.points_balance !== undefined) setPointsBalance(data.points_balance);
      if (data.pointsBalance !== undefined) setPointsBalance(data.pointsBalance);

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
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("❌ Kritikus hiba az Aréna adatok szinkronizálásakor:", err);
      
      if (!isSilent) {
        setFetchError(err.message || "Kapcsolati hiba");
        const lastAutoReload = sessionStorage.getItem('last_arena_auto_reload');
        const now = Date.now();
        if (!lastAutoReload || now - Number(lastAutoReload) > 10000) {
          sessionStorage.setItem('last_arena_auto_reload', String(now));
          window.location.reload();
          return;
        }
        setActiveTopics([]);
      }
    } finally { 
      if (!isSilent) setLoading(false); 
    }
  };

  const fetchAlbumSilently = async () => {
    if (!user?.email) return;
    setIsLoadingSwapAlbum(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/my-album?userEmail=${user.email}`, {
        headers: getAuthHeaders()
      });
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
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
      fetchFreshPointsBalance(); // 🎯 ÚJ: Azonnal lekérjük a legfrissebb pontokat az adatbázisból, ha ide lép a user!
    }
    else if (subTab === 'upcoming') fetch(`${BACKEND_URL}/api/weekly/upcoming`, { headers: getAuthHeaders() }).then(res => res.json()).then(data => setUpcomingTopics(data || [])).catch(console.error);
    else if (subTab === 'past') fetch(`${BACKEND_URL}/api/weekly/past`, { headers: getAuthHeaders() }).then(res => res.json()).then(data => setPastTopics(data || [])).catch(console.error);
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
  }, [isChatOpen, lobbyMessages.length, user?.email]);

  useEffect(() => {
    if (subTab !== 'current') return;
    
    const fetchLobbyChat = () => {
      fetch(`${BACKEND_URL}/api/weekly/chat/0?t=${Date.now()}`, {
        method: 'GET',
        headers: getAuthHeaders({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        })
      })
        .then(res => res.json())
        .then(data => {
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
        })
        .catch(console.error);
    };

    fetchLobbyChat();
    const interval = setInterval(fetchLobbyChat, 2500);
    return () => clearInterval(interval);
  }, [subTab, user?.email]);

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
      const res = await fetch(`${BACKEND_URL}/api/weekly/hall-of-fame`, { headers: getAuthHeaders() });
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
      const res = await fetch(`${BACKEND_URL}/api/weekly/my-stats?userEmail=${user?.email || ''}`, { headers: getAuthHeaders() });
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
      const res = await fetch(`${BACKEND_URL}/api/weekly/history/${topicId}?userEmail=${user?.email || ''}`, { headers: getAuthHeaders() });
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
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }), 
        body: JSON.stringify({ entryId, userEmail: user?.email || '' })
      });
      if (res.ok) {
        alert(t('msgReportSuccess')); setMyVoteCount(prev => prev + 1);
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
        method: 'POST', 
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ entryId: oldEntryId, userEmail: user?.email || '', voteType: type })
      });
      if (res.ok) { setMyVoteCount(prev => prev + 1); fetchNextVote(topic.id); fetchCurrentTopic(true); }
    } catch (e) { 
      if(topic) fetchNextVote(topic.id);
    }
  };

  const handleClaimReferral = async () => {
    if (!referralInput.trim()) return;
    setIsClaimingReferral(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/claim-referral`, {
        method: 'POST', 
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userEmail: user?.email, referralCode: referralInput.trim().toUpperCase() })
      });
      if (res.ok) { alert(t('msgReferralSuccess')); setReferredBy(referralInput); fetchCurrentTopic(true); } 
      else { 
        const err = await res.json();
        alert(err.error || t('msgSwapErrorMain')); 
      }
    } catch (e) { alert(t('msgNetworkError')); }
    finally { setIsClaimingReferral(false); }
  };

  // 🎯 ÚJ: Gyors Joker Csere vásárlás közvetlenül az Aréna felületéről (Pontszinkronizáció hozzáadva)
  const handleQuickBuySwap = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/store/buy-swap`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' })
      });
      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        setSwapBalance(data.newSwapBalance); 
        if (data.newPointsBalance !== undefined) {
          setPointsBalance(data.newPointsBalance); // Valós időben frissítjük a kijelzőt
        }
      } else {
        alert(data.error || "Sikertelen vásárlás.");
      }
    } catch (e) {
      alert("Hálózati hiba lépett fel.");
    }
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
      const res = await fetch(`${BACKEND_URL}/api/weekly/upload`, { 
        method: 'POST', 
        headers: getAuthHeaders(),
        body: formData 
      });
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
            setSwapCamera(`${makePrefix}${exifData.Model}`);
          } else if (exifData.Make) setSwapCamera(exifData.Make);
          else setSwapCamera('');

          setSwapLens(exifData.LensModel || '');
          if (exifData.ExposureTime) {
            const shutterFraction = exifData.ExposureTime < 1 ? `1/${Math.round(1 / exifData.ExposureTime)}s` : `${exifData.ExposureTime}s`;
            setSwapShutter(shutterFraction);
          } else setSwapShutter('');
          setSwapIso(exifData.ISO ? String(exifData.ISO) : ''); setSwapAperture(exifData.FNumber ? `f/${exifData.FNumber}` : '');
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
    const formData = new FormData();
    formData.append('photo', swapFile); formData.append('topicId', topic.id.toString()); formData.append('userEmail', user?.email || '');
    formData.append('userName', user?.name || '');
    formData.append('camera', swapCamera);
    formData.append('lens', swapLens); formData.append('shutter', swapShutter); formData.append('iso', swapIso); formData.append('aperture', swapAperture); formData.append('software', swapSoftware);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/swap`, { 
        method: 'POST', 
        headers: getAuthHeaders(),
        body: formData 
      });
      if (res.ok) { 
        alert(t('msgSwapSuccess')); setSwapFile(null); setSwapPreview(null); 
        setSwapCamera(''); setSwapLens(''); setSwapShutter(''); setSwapIso(''); setSwapAperture(''); setSwapSoftware('');
        fetchCurrentTopic(false); fetchAlbumSilently();
      } else { 
        const err = await res.json(); alert(err.error);
      }
    } catch (e) { alert(t('msgSwapErrorMain')); }
    finally { setIsSwapping(false); }
  };

  const handleSwapBackSubmit = async (entryId: number) => {
    if (!window.confirm(t('msgSwapBackConfirm'))) return;
    setIsSwapping(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/swap-back`, {
        method: 'POST', 
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }), 
        body: JSON.stringify({ topicId: topic.id, userEmail: user?.email, entryId })
      });
      if (res.ok) { alert(t('msgSwapBackSuccess')); fetchCurrentTopic(false); fetchAlbumSilently(); } 
      else { 
        const err = await res.json();
        alert(err.error || t('msgSwapErrorMain')); 
      }
    } catch (e) { alert(t('msgNetworkError')); }
    finally { setIsSwapping(false); }
  };

  const handleSelectPhotoForSwap = async (photoUrl: string) => {
    if (!window.confirm(t('msgSwapExistingConfirm'))) return;
    setIsSwapping(true); setShowSwapAlbumModal(false);
    try {
      const swapRes = await fetch(`${BACKEND_URL}/api/weekly/swap-existing`, {
        method: 'POST', 
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }), 
        body: JSON.stringify({ topicId: topic.id, userEmail: user.email, userName: user.name, fileUrl: photoUrl })
      });
      if (swapRes.ok) { alert(t('msgSwapExistingSuccess')); fetchCurrentTopic(false); fetchAlbumSilently(); } 
      else { 
        const err = await swapRes.json();
        alert(err.error); 
      }
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
      <div className="arena-tabs-scroll-wrapper" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-main)', marginBottom: '20px', borderRadius: '8px 8px 0 0' }}>
        <div className="arena-tabs-internal-line" style={{ display: 'flex', gap: '4px', padding: '12px 16px 0 16px', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '2px' }}>
            {[
              { id: 'current', label: lang === 'en' ? 'Active' : 'Aktív' },
              { id: 'past', label: lang === 'en' ? 'Completed' : 'Lezárt' },
              { id: 'upcoming', label: lang === 'en' ? 'Upcoming' : 'Közelgő' }, 
              { id: 'manage', label: lang === 'en' ? 'Manage' : 'Tervezőpult' },
              { id: 'arena_album', label: lang === 'en' ? 'My Arena Album' : 'Albumom' },
              { id: 'my_stats', label: lang === 'en' ? 'Statistics' : 'Statisztikák' },
              { id: 'hall_of_fame', label: lang === 'en' ? 'Hall of Fame' : 'Dicsőségcsarnok' }
            ].map((tab) => {
              const isActive = subTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setSubTab(tab.id as any); setSelectedTopicId(null); }}
                  style={{
                    padding: '10px 18px',
                    background: isActive ? 'var(--hover-overlay)' : 'transparent',
                    color: isActive ? '#38bdf8' : 'var(--text-body)',
                    border: 'none',
                    borderBottom: isActive ? '2px solid #38bdf8' : '2px solid transparent',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    borderRadius: '4px 4px 0 0',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          
          {/* 🎯 INTEGRÁLT PONTTÁRCA ÉS JOKER SZÁMLÁLÓ CSOPORT */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexShrink: 0 }}>
            
            {/* 🪙 ÚJ: Aktuális pontegyenleg elegáns arany plecsnije az Arénában */}
            <div style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', padding: '5px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Coins size={12} color="#fbbf24" />
              <span>{pointsBalance} {lang === 'en' ? 'Points' : 'Pont'}</span>
            </div>

            {/* Megmaradt Joker cserék számlálója */}
            <div style={{ background: 'rgba(225,29,72,0.08)', color: '#fb7185', border: '1px solid rgba(225,29,72,0.2)', padding: '5px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={12} />
              <span>{swapBalance} {lang === 'en' ? 'Swaps left' : 'Joker Csere'}</span>
            </div>

            {/* Gyorsvásárlás gomb */}
            <button 
              onClick={handleQuickBuySwap}
              style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', padding: '5px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(56,189,248,0.1)'}
              title={lang === 'en' ? 'Buy 1 Joker Swap for 50 points' : '1 db Joker csere vásárlása 50 pontért'}
            >
              + 🃏 {lang === 'en' ? 'Buy Swap (50p)' : 'Csere vásárlása (50p)'}
            </button>

            <button onClick={() => setShowHelp(true)} style={{ background: 'transparent', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', padding: '5px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <BookOpen size={12} /> {t('btnRules')}
            </button>
          </div>
        </div>
      </div>

      {/* 🎖️ RANG PROGRESSION TRACK BAR */}
      <div className="arena-progress-card-wrapper" style={{ background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-main)', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div className="arena-progress-track-line" style={{ display: 'flex', width: '100%', border: '1px solid var(--border-main)', position: 'relative' }}>
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
              : `Következő szint: ${rank.name}\nHátratévő feltétel: ${requirementMessage}`;
            let segmentBg = 'var(--bg-main)'; 
            if (isUnlocked) segmentBg = '#0284c7'; 
            if (isCurrent) segmentBg = '#38bdf8';
            return (
              <div
                key={rank.id}
                className="arena-rank-tooltip-container"
                style={{
                  flex: 1,
                  background: segmentBg,
                  padding: '10px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  borderRight: idx < ARENA_LEVELS_REGISTRY.length - 1 ? '1px solid rgba(15,23,42,0.1)' : 'none',
                  position: 'relative',
                  cursor: 'help',
                  transition: 'all 0.15s ease'
                }}
              >
                {isUnlocked ? <Unlock size={10} color="#fff" /> : <Lock size={10} color="var(--text-muted)" />}
                <span style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: '700', 
                  color: isUnlocked ? '#ffffff' : 'var(--text-muted)',
                  border: isCurrent ? '1px solid #ffffff60' : 'none',
                  padding: isCurrent ? '1px 4px' : '0',
                  borderRadius: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden'
                }}>
                  {rank.name.split(' ')[0]}
                </span>

                <div className="arena-rank-tooltip-box">
                  <div style={{ fontWeight: 'bold', color: '#fbbf24', marginBottom: '4px' }}>{rank.name}</div>
                  <div style={{ fontSize: '0.75rem', whiteSpace: 'pre-line', lineHeight: '1.4', color: '#cbd5e1' }}>{tooltipText}</div>
                  <div style={{ marginTop: '8px', fontSize: '0.7rem', color: '#475569', borderTop: '1px solid var(--border-main)', paddingTop: '4px' }}>
                    Saját statisztikád: {userTotalLikes} ⭐ | {userVictories} 🥇
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🎮 ALMODULOK MEGJELENÍTÉSI ZÓNÁJA */}
      <div style={{ width: '100%' }}>
        
        {subTab === 'current' && (
          <>
            {selectedTopicId === null ? (
              <div className="arena-fluid-container">
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '15px' }}>
                  {activeTopics.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: 'var(--text-body)', fontSize: '0.8rem', fontWeight: 'bold' }}>{t('sortLabel')}</span>
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} style={{ background: 'var(--bg-card)', color: 'var(--text-title)', border: '1px solid var(--border-main)', padding: '6px 12px', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                        <option value="endDate" style={{ background: 'var(--bg-card)', color: 'var(--text-title)' }}>{t('sortEndDate')}</option>
                        <option value="startDate" style={{ background: 'var(--bg-card)', color: 'var(--text-title)' }}>{t('sortStartDate')}</option>
                      </select>
                    </div>
                  )}
                </div>

                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '15px', width: '100%' }}>
                    <VideoLoader />
                    <div style={{ textAlign: 'center', animation: 'arenaPulse 2s infinite' }}>
                      <h4 style={{ color: 'var(--text-body)', margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>
                        {lang === 'en' ? '⚡ Synchronizing Arena...' : '⚡ Csatatér adatok letöltése...'}
                      </h4>
                    </div>
                  </div>
                ) : fetchError ? (
                  <div style={{ color: '#ef4444', fontSize: '0.85rem', padding: '20px', background: 'rgba(239,68,68,0.02)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.15)', textAlign: 'center', maxWidth: '450px', margin: '30px auto' }}>
                    <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>⚠️ Hálózati vagy belső hiba történt az Aréna adatok betöltésekor.</p>
                    <button onClick={() => fetchCurrentTopic(false)} style={{ background: 'transparent', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '6px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <RefreshCw size={12} /> {t('dashReload', 'Frissítés')}
                    </button>
                  </div>
                ) : activeTopics.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-main)' }}>
                    <Info size={36} color="#f59e0b" style={{ marginBottom: '12px' }} />
                    <h2 style={{ color: '#f59e0b', margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: '600' }}>{t('viewNoActiveLeagues')}</h2>
                    <p style={{ color: 'var(--text-body)', fontSize: '0.9rem', margin: 0 }}>{t('viewNoActiveLeaguesDesc')}</p>
                  </div>
                ) : (
                  <div className="arena-cards-grid">
                    {sortedActiveTopics.map((actTop) => (
                      <ChallengeCard 
                        key={actTop.id} 
                        topic={actTop} 
                        onSelect={() => setSelectedTopicId(actTop.id)} 
                        onShare={() => setTopicToShare(actTop)} 
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <button onClick={() => setSelectedTopicId(null)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    {t('viewBackBtn')}
                  </button>
                </div>
                {(!topic || loading) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', width: '100%' }}>
                    <VideoLoader />
                  </div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                  <MessageSquare size={16} color={hasNewMessage ? '#f43f5e' : '#38bdf8'} />
                  <span style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-title)' }}>
                    {t('viewLobbyTitle')} {hasNewMessage && <span style={{ color: '#f43f5e', fontSize: '0.75rem', marginLeft: '2px' }}>({lang === 'en' ? 'New!' : 'Új!'})</span>}
                  </span>
                  {hasNewMessage && <span className="chat-notification-badge" />}
                </div>
                {isChatOpen ? <ChevronDown size={16} color="var(--text-body)" /> : <ChevronUp size={16} color="var(--text-body)" />}
              </div>
              {isChatOpen && (
                <div className="chat-dock-body">
                  <p style={{ margin: '0 0 10px 0', color: 'var(--text-body)', fontSize: '0.75rem' }}>{t('viewLobbyDesc')}</p>
                  
                  <div ref={chatScrollContainerRef} className="chat-messages-scroll-area">
                    {lobbyMessages.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 'auto', fontStyle: 'italic', fontSize: '0.8rem' }}>{t('viewLobbyEmpty')}</div>
                    ) : (
                      lobbyMessages.slice(-100).map((msg, idx) => {
                        const isMsgMe = (msg.user_email || msg.userEmail) === user?.email;
                        return (
                          <div key={msg.id || idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', justifyContent: isMsgMe ? 'flex-end' : 'flex-start', marginBottom: '10px', width: '100%' }}>
                            
                            {!isMsgMe && (
                              <div style={{ flexShrink: 0, marginTop: '2px' }}>
                                {msg.avatar_url ? (
                                  <img src={msg.avatar_url} alt="" style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-main)' }} />
                                ) : (
                                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', border: '1px solid var(--border-main)', color: 'var(--text-muted)' }}>👤</div>
                                )}
                              </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMsgMe ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '2px', fontSize: '0.68rem', color: isMsgMe ? '#f97316' : 'var(--text-body)', fontWeight: 'bold' }}>
                                <span>{msg.user_name || msg.userName}</span>
                                <span style={{ color: 'var(--text-muted)' }}>• {new Date(msg.created_at).toLocaleString(lang === 'en' ? 'en-US' : 'hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div style={{ background: isMsgMe ? '#f97316' : 'var(--bg-card)', color: isMsgMe ? '#ffffff' : 'var(--text-title)', padding: '6px 10px', borderRadius: isMsgMe ? '8px 8px 2px 8px' : '8px 8px 8px 2px', fontSize: '0.82rem', wordBreak: 'break-word', border: isMsgMe ? 'none' : '1px solid var(--border-main)' }}>
                                {msg.message_text || msg.messageText}
                              </div>
                            </div>

                            {isMsgMe && (
                              <div style={{ flexShrink: 0, marginTop: '2px' }}>
                                {msg.avatar_url ? (
                                  <img src={msg.avatar_url} alt="" style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-main)' }} />
                                ) : (
                                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', border: '1px solid var(--border-main)', color: 'var(--text-muted)' }}>👤</div>
                                )}
                              </div>
                            )}

                          </div>
                        );
                      })
                    )}
                  </div>
                  <div style={{ height: '12px', fontSize: '0.7rem', color: '#38bdf8', fontStyle: 'italic', marginBottom: '4px', paddingLeft: '2px' }}>
                    {currentlyTyping.length > 0 && <span>{currentlyTyping.join(', ')} {t('viewLobbyTyping')}...</span>}
                  </div>
                  <form onSubmit={handleSendLobbyMessage} style={{ display: 'flex', gap: '6px' }}>
                    <input type="text" placeholder={t('viewLobbyPlaceholder')} value={typedLobbyMsg} onChange={handleInputChange} maxLength={500} disabled={isSendingLobbyMsg} style={{ flex: 1, padding: '8px 10px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'var(--text-title)', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }} />
                    <button type="submit" disabled={!typedLobbyMsg.trim() || isSendingLobbyMsg} style={{ background: (!typedLobbyMsg.trim() || isSendingLobbyMsg) ? 'var(--border-main)' : '#f97316', color: (!typedLobbyMsg.trim() || isSendingLobbyMsg) ? 'var(--text-muted)' : 'white', border: 'none', padding: '8px 14px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}>
                      <Send size={12} />
                    </button>
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
          <TrophyRoom isLoadingStats={isLoadingStats} myStats={myStats} userTotalLikes={userTotalLikes} userVictories={userVictories} swapBalance={swapBalance} myReferralCode={myReferralCode} referredBy={referredBy} referralInput={referralInput} setReferralInput={setReferralInput} isClaimingReferral={isClaimingReferral} handleClaimReferral={handleClaimReferral} setActiveShareData={setActiveShareData} setFullscreenData={setFullscreenData} getLevelDetails={getLevelDetails} getTopicType={getTopicType} handleImageError={handleImageError} />
        )}

        {subTab === 'hall_of_fame' && (
          <HallOfFame isLoadingHof={isLoadingHof} hallOfFame={hallOfFame} user={user} getLevelDetails={getLevelDetails} />
        )}
        
        {subTab === 'arena_album' && (
          <MyArenaAlbumView user={user} setFullscreenData={setFullscreenData} />
        )}
      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} currentLevel={currentLevel} />

      <AlbumSelectionModal 
        isOpen={showSwapAlbumModal} 
        onClose={(wasActionSubmitted) => { setShowSwapAlbumModal(false); if (wasActionSubmitted === true) fetchCurrentTopic(false); }} 
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
        myEntry={myEntry} 
      />

      <ShareCardModal activeShareData={activeShareData} onClose={() => setActiveShareData(null)} user={user} shareBase64={shareBase64} loadingShareImg={loadingShareImg} isGeneratingImage={isGeneratingImage} handleExecuteShare={handleExecuteShare} />
      {topicToShare && (
        <ChallengeShareModal 
          topic={topicToShare} 
          onClose={() => setTopicToShare(null)} 
        />
      )}
      <style>{`
        .arena-fluid-container { width: 100%; box-sizing: border-box; }
        .arena-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; width: 100%; }
        .arena-rank-tooltip-container { position: relative; }
        .arena-progress-card-wrapper, .arena-tabs-scroll-wrapper { scrollbar-width: thin; scrollbar-color: var(--border-main) var(--bg-card); }
        .arena-progress-card-wrapper::-webkit-scrollbar, .arena-tabs-scroll-wrapper::-webkit-scrollbar { height: 4px; }
        .arena-progress-card-wrapper::-webkit-scrollbar-track, .arena-tabs-scroll-wrapper::-webkit-scrollbar-track { background: var(--bg-card); }
        .arena-progress-card-wrapper::-webkit-scrollbar-thumb, .arena-tabs-scroll-wrapper::-webkit-scrollbar-thumb { background-color: var(--border-main); border-radius: 4px; }
        @media (max-width: 900px) {
          .arena-tabs-scroll-wrapper { overflow-x: auto !important; -webkit-overflow-scrolling: touch; padding-bottom: 4px !important; }
          .arena-tabs-internal-line { min-width: 820px !important; justify-content: flex-start !important; }
          .arena-progress-card-wrapper { overflow-x: auto !important; -webkit-overflow-scrolling: touch; padding-bottom: 8px !important; }
          .arena-progress-track-line { min-width: 920px !important; }
        }
        .arena-rank-tooltip-box { position: absolute; bottom: 145%; left: 50%; transform: translateX(-50%) translateY(4px); background: var(--bg-main); color: var(--text-title); border: 1px solid var(--border-main); border-radius: 6px; width: 230px; box-shadow: 0 10px 20px rgba(0,0,0,0.2); z-index: 999999 !important; opacity: 0; pointer-events: none; transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1); padding: 10px; text-align: center; }
        .arena-rank-tooltip-box::after { content: ""; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border-width: 5px; border-style: solid; border-color: var(--bg-main) transparent transparent transparent; }
        .arena-rank-tooltip-container:hover .arena-rank-tooltip-box { opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: auto; }
        .arena-floating-chat-dock { position: fixed; bottom: 0; right: 30px; width: 340px; background: var(--bg-card); border: 1px solid var(--border-main); border-bottom: none; border-radius: 4px 4px 0 0; box-shadow: 0 -8px 24px rgba(0,0,0,0.15); z-index: 1000; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
        .arena-floating-chat-dock.is-open { transform: translateY(0); }
        .arena-floating-chat-dock.is-closed { transform: translateY(calc(100% - 44px)); }
        .arena-floating-chat-dock.has-unread .chat-dock-header { border-color: #f43f5e; }
        .chat-dock-header { padding: 12px 16px; background: var(--bg-card); border-bottom: 1px solid var(--border-main); border-radius: 3px 3px 0 0; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; }
        .chat-dock-header:hover { background: var(--hover-overlay); }
        .chat-dock-body { padding: 12px; height: 380px; display: flex; flex-direction: column; }
        .chat-messages-scroll-area { background: var(--bg-main); border: 1px solid var(--border-main); border-radius: 4px; padding: 10px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
        .chat-notification-badge { position: absolute; top: -1px; left: -2px; width: 6px; height: 6px; background: #ef4444; border-radius: 50%; }
        @keyframes arenaPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        @media (max-width: 480px) { .arena-floating-chat-dock { right: 10px; width: calc(100% - 20px); } }
      `}</style>

    </div>
  );
}
