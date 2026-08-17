import React from 'react';
import { getImageUrl } from '../../../utils/helpers';
import VideoLoader from '../../../components/VideoLoader';

import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';

import { 
  Zap, 
  Trophy, 
  Medal, 
  RefreshCw, 
  Eye, 
  TrendingUp, 
  Award, 
  Copy, 
  Check, 
  ShieldCheck, 
  Camera,
  Crown,
  Share2
} from 'lucide-react';

interface TrophyRoomProps {
  isLoadingStats: boolean;
  myStats: { podiums: any; history: any[] } | null;
  userTotalLikes: number;
  userVictories: number;
  swapBalance: number;
  myReferralCode: string;
  referredBy: string | null;
  referralInput: string;
  setReferralInput: (val: string) => void;
  isClaimingReferral: boolean;
  handleClaimReferral: () => void;
  setActiveShareData: (entry: any) => void;
  setFullscreenData: (data: any) => void;
  getLevelDetails?: (likes: number, victories: number) => { name: string; color: string; bg: string };
  getTopicType: (start: string, end: string) => 'daily' | 'weekly';
  handleImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  premiumUntil?: string | null; 
}

const rankThresholds = [
  { name: 'Fényleső 🌱', minFp: 0, maxFp: 30, minVic: 0 },
  { name: 'Megfigyelő 👁️', minFp: 30, maxFp: 100, minVic: 0 },
  { name: 'Képvadász 📷', minFp: 100, maxFp: 250, minVic: 0 },
  { name: 'Komponista 📐', minFp: 250, maxFp: 500, minVic: 0 },
  { name: 'Fényíró 🎞️', minFp: 500, maxFp: 800, minVic: 1 },
  { name: 'Esztéta 💎', minFp: 800, maxFp: 1300, minVic: 2 },
  { name: 'Szakértő 🎯', minFp: 1300, maxFp: 2000, minVic: 3 },
  { name: 'Képmester 🎨', minFp: 2000, maxFp: 3200, minVic: 5 },
  { name: 'Nagymester 🌟', minFp: 3200, maxFp: 4800, minVic: 7 },
  { name: 'Virtuóz ⚡', minFp: 4800, maxFp: 7000, minVic: 9 },
  { name: 'Fotóguru 🔥', minFp: 7000, maxFp: 10000, minVic: 12 },
  { name: 'Vizuális Legenda 👑', minFp: 10000, maxFp: Infinity, minVic: 15 }
];

export default function TrophyRoom({
  isLoadingStats, myStats, userTotalLikes, userVictories, swapBalance,
  myReferralCode, referredBy, referralInput, setReferralInput,
  isClaimingReferral, handleClaimReferral, setActiveShareData, setFullscreenData,
  getTopicType, handleImageError,
  premiumUntil 
}: TrophyRoomProps) {

  const { t, lang } = useLanguage();

  let isLight = false;
  try {
    const themeContext = useTheme();
    if (themeContext) {
      isLight = themeContext.theme === 'light';
    }
  } catch (e) {}

  const rankNamesEn: Record<string, string> = {
    'Fényleső 🌱': 'Light Seeker 🌱',
    'Megfigyelő 👁️': 'Observer 👁️',
    'Képvadász 📷': 'Photo Hunter 📷',
    'Komponista 📐': 'Composer 📐',
    'Fényíró 🎞️': 'Light Writer 🎞️',
    'Esztéta 💎': 'Aesthete 💎',
    'Szakértő 🎯': 'Expert 🎯',
    'Képmester 🎨': 'Photo Master 🎨',
    'Nagymester 🌟': 'Grandmaster 🌟',
    'Virtuóz ⚡': 'Virtuoso ⚡',
    'Fotóguru 🔥': 'Photo Guru 🔥',
    'Vizuális Legenda 👑': 'Visual Legend 👑'
  };

  if (isLoadingStats && (!myStats || myStats.history.length === 0)) {
    return <VideoLoader />;
  }

  if (!myStats) {
    return <div style={{ color: '#ef4444', textAlign: 'center', padding: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>{t('trophyError')}</div>;
  }

  let currentRankIdx = 0;
  for (let i = rankThresholds.length - 1; i >= 0; i--) {
    if (userTotalLikes >= rankThresholds[i].minFp && userVictories >= rankThresholds[i].minVic) {
      currentRankIdx = i;
      break;
    }
  }

  const currentRank = rankThresholds[currentRankIdx];
  const nextRank = currentRankIdx < rankThresholds.length - 1 ? rankThresholds[currentRankIdx + 1] : null;

  let progressPercent = 100;
  let levelHelpText = lang === 'en' ? 'Maximum Visual Legend Tier reached! 👑' : 'Elérted a maximális Vizuális Legenda szintet! 👑';

  if (nextRank) {
    const fpRange = nextRank.minFp - currentRank.minFp;
    const currentFpProgress = userTotalLikes - currentRank.minFp;
    progressPercent = Math.min(100, Math.max(0, (currentFpProgress / fpRange) * 100));

    const fpNeeded = Math.max(0, Math.round((nextRank.minFp - userTotalLikes) * 100) / 100);
    const vicNeeded = Math.max(0, nextRank.minVic - userVictories);

    if (fpNeeded > 0 && vicNeeded > 0) {
      levelHelpText = lang === 'en' 
        ? `${fpNeeded} more FP points AND ${vicNeeded} more Arena victory needed for ${nextRank.name}` 
        : `Még ${fpNeeded} FP pont ÉS ${vicNeeded} Aréna győzelem szükséges a(z) ${nextRank.name} ranghoz`;
    } else if (fpNeeded > 0) {
      levelHelpText = lang === 'en' 
        ? `${fpNeeded} more FP points needed for ${nextRank.name}` 
        : `Még ${fpNeeded} FP pont szükséges a(z) ${nextRank.name} ranghoz`;
    } else if (vicNeeded > 0) {
      levelHelpText = lang === 'en'
        ? `Points met! ${vicNeeded} more Arena victory needed for ${nextRank.name}` 
        : `Pontszám megvan! Még ${vicNeeded} Aréna győzelem szükséges a(z) ${nextRank.name} ranghoz`;
    } else {
      levelHelpText = lang === 'en' ? 'Ready for the next rank tier!' : 'Minden feltétel teljesítve a következő szinthez!';
    }
  }

  const currentRankDisplayName = lang === 'en' ? (rankNamesEn[currentRank.name] || currentRank.name) : currentRank.name;

  const totalViews = myStats.history?.reduce((sum, e) => sum + (Number(e?.views) || 0), 0) || 0;
  const podiumCount = Number(myStats.podiums?.second || 0) + Number(myStats.podiums?.third || 0);
  
  let top10Count = 0;
  let top20Count = 0;
  if (myStats.history) {
    myStats.history.forEach(e => {
      const entriesCount = Number(e?.total_entries) || 1;
      const percentile = (Number(e?.rank) || 1) / entriesCount;
      if (percentile <= 0.1 && (Number(e?.rank) || 0) > 3) top10Count++;
      if (percentile > 0.1 && percentile <= 0.2) top20Count++;
    });
  }

  const isPremiumActive = premiumUntil && new Date(premiumUntil) > new Date();

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', width: '100%', maxWidth: '100vw', overflowX: 'hidden', boxSizing: 'border-box' }}>
      
      {/* Szint progressziós banner */}
      <div style={{ background: 'var(--bg-card)', padding: '20px 16px', borderRadius: '8px', border: '1px solid var(--border-main)', marginBottom: '16px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', boxSizing: 'border-box', width: '100%' }}>
        <h3 style={{ color: 'var(--text-muted)', margin: '0 0 4px 0', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold' }}>{t('trophyCurrentStatus')}</h3>
        <h1 style={{ color: '#fbbf24', margin: '0 0 12px 0', fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', fontWeight: '700', letterSpacing: '-0.5px', wordBreak: 'break-word' }}>{currentRankDisplayName}</h1>
        
        <div style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-main)', height: '10px', borderRadius: '4px', margin: '0 auto', overflow: 'hidden', border: '1px solid var(--border-main)', position: 'relative' }}>
          <div style={{ width: `${progressPercent}%`, background: '#fbbf24', height: '100%', borderRadius: '4px' }}></div>
        </div>
        
        <div style={{ color: currentRank.name === 'Vizuális Legenda 👑' ? '#fbbf24' : 'var(--text-body)', fontSize: '0.82rem', marginTop: '10px', fontWeight: '600', wordBreak: 'break-word' }}>
          {levelHelpText}
        </div>
        <div style={{ marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {lang === 'en' ? `Current stats: ${userTotalLikes} FP | ${userVictories} victories` : `Saját statisztikád: ${userTotalLikes} FP | ${userVictories} Győzelem`}
        </div>
      </div>

      {isPremiumActive && (
        <div style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.2)', borderLeft: '4px solid #10b981', padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', boxSizing: 'border-box', width: '100%' }}>
          <ShieldCheck size={22} color="#10b981" style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#4ade80', fontWeight: '700', fontSize: '0.88rem', marginBottom: '1px' }}>{t('trophyPremiumActive')}</div>
            <div style={{ color: 'var(--text-body)', fontSize: '0.78rem', lineHeight: '1.4', wordBreak: 'break-word' }}>
              {t('trophyPremiumDesc')}<strong style={{ color: 'var(--text-title)' }}>{new Date(premiumUntil!).toLocaleDateString(lang === 'en' ? 'en-US' : 'hu-HU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>{t('trophyPremiumNotice')}
            </div>
          </div>
        </div>
      )}

      {/* ANALITIKAI RÁCS ELEMEK */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px', marginBottom: '20px', boxSizing: 'border-box', width: '100%' }}>
        <div style={{ background: 'var(--bg-card)', padding: '12px 8px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', textAlign: 'center' }}>
          <Zap size={14} color="#f97316" />
          <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#f97316', lineHeight: '1.2' }}>{userTotalLikes}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>{lang === 'en' ? 'FP Points' : 'FP Pont'}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '12px 8px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', textAlign: 'center' }}>
          <Crown size={14} color="#fbbf24" />
          <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#fbbf24', lineHeight: '1.2' }}>{userVictories}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>{t('trophyStatWins')}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '12px 8px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', textAlign: 'center' }}>
          <Medal size={14} color={isLight ? '#475569' : '#cbd5e1'} />
          <div style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--text-title)', lineHeight: '1.2' }}>{podiumCount}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>{t('trophyStatPodiums')}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '12px 8px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', textAlign: 'center' }}>
          <RefreshCw size={12} color="#fb7185" />
          <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#fb7185', lineHeight: '1.2' }}>{swapBalance}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>{t('trophyStatJokers')}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '12px 8px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', textAlign: 'center' }}>
          <Eye size={14} color="#38bdf8" />
          <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#38bdf8', lineHeight: '1.2' }}>{totalViews}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>{t('trophyStatViews')}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '12px 8px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', textAlign: 'center' }}>
          <TrendingUp size={14} color="#a855f7" />
          <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#a855f7', lineHeight: '1.2' }}>{top10Count}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>Top 10%</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '12px 8px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', textAlign: 'center' }}>
          <Award size={14} color="#10b981" />
          <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#10b981', lineHeight: '1.2' }}>{top20Count}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>Top 20%</div>
        </div>
      </div>

      {/* MEGHÍVÓ PANEL ZÓNA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '20px', boxSizing: 'border-box', width: '100%' }}>
        <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box' }}>
          <h4 style={{ margin: 0, color: '#38bdf8', fontSize: '0.98rem', fontWeight: '600', letterSpacing: '-0.2px' }}>{t('trophyInviteTitle')}</h4>
          <p style={{ color: 'var(--text-body)', fontSize: '0.78rem', margin: 0, lineHeight: '1.4', wordBreak: 'break-word' }}>
            {lang === 'en' 
              ? 'Invite your photographer friends! Share your unique code for +200 Points!' 
              : 'Hívd meg fotós barátaidat! Oszd meg az egyedi kódodat a +200 Globális Pontért!'}
          </p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-main)', padding: '8px 10px', borderRadius: '4px', border: '1px dashed var(--border-main)', marginTop: 'auto', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 'bold' }}>{t('trophyInviteCode')}</span>
            <strong style={{ color: 'var(--text-title)', fontSize: '1rem', fontFamily: 'monospace', letterSpacing: '0.5px', flex: 1, wordBreak: 'break-all' }}>{myReferralCode}</strong>
            <button 
              onClick={() => { navigator.clipboard.writeText(myReferralCode); alert(t('trophyCopiedAlert')); }}
              style={{ background: 'var(--bg-card)', color: 'var(--text-title)', border: '1px solid var(--border-main)', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.72rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Copy size={12} /> {t('trophyCopy')}
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px', boxSizing: 'border-box' }}>
          <div>
            <h4 style={{ margin: 0, color: '#10b981', fontSize: '0.98rem', fontWeight: '600', letterSpacing: '-0.2px' }}>{t('trophyReferredTitle')}</h4>
            <p style={{ color: 'var(--text-body)', fontSize: '0.78rem', margin: '4px 0 0 0', lineHeight: '1.4', wordBreak: 'break-word' }}>
              {lang === 'en'
                ? 'Enter an invitation code to unlock your starting +200 Global Points bonus!'
                : 'Írd be az alábbi mezőbe a kapott meghívó kódot a +200 Globális Pont bónuszodért!'}
            </p>
          </div>
          
          {!referredBy ? ( 
            <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
              <input 
                type="text" 
                placeholder={t('trophyPlaceholderRef')} 
                value={referralInput}
                onChange={e => setReferralInput(e.target.value.toUpperCase())}
                disabled={isClaimingReferral}
                style={{ flex: 1, padding: '6px 10px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'var(--text-title)', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', textTransform: 'uppercase', fontFamily: 'monospace', minWidth: 0 }} 
              />
              <button 
                onClick={handleClaimReferral}
                disabled={!referralInput.trim() || isClaimingReferral}
                style={{ background: !referralInput.trim() || isClaimingReferral ? 'var(--border-main)' : '#10b981', color: !referralInput.trim() || isClaimingReferral ? 'var(--text-muted)' : 'white', border: 'none', padding: '0 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                {isClaimingReferral ? '...' : t('trophySubmit')}
              </button>
            </div>
          ) : (
            <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', padding: '8px', borderRadius: '4px', color: '#10b981', fontSize: '0.78rem', fontWeight: 'bold', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: 'auto' }}>
              <Check size={14} /> {t('trophyReferredSuccess')}
            </div>
          )}
        </div>
      </div>

      <h3 style={{ color: 'var(--text-title)', marginBottom: '12px', fontSize: '1.1rem', fontWeight: '600', letterSpacing: '-0.3px', wordBreak: 'break-word' }}>
        {lang === 'en' ? `Past Submissions (${myStats.history?.length || 0})` : `Korábbi pályaműveid (${myStats.history?.length || 0} db)`}
      </h3>
      
      {myStats.history?.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '24px', borderRadius: '8px', textAlign: 'center', border: '1px dashed var(--border-main)' }}>
          <Camera size={22} style={{ margin: '0 auto 6px auto' }} />
          <h4 style={{ color: 'var(--text-title)', margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: '600' }}>{t('trophyNoPastEntries')}</h4>
          <p style={{ margin: 0, fontSize: '0.78rem' }}>{t('trophyNoPastEntriesDesc')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
          {myStats.history?.map((entry: any, idx: number) => {
            const totalEntries = Number(entry?.total_entries) || 1;
            const percentile = (Number(entry?.rank) || 1) / totalEntries;
            const rank = Number(entry?.rank) || 0;
            
            let badge = ''; let badgeColor = 'var(--border-main)'; let txtColor = 'var(--text-body)';
            if (rank === 1) { badge = lang === 'en' ? '1st Place 🏆' : '1. Hely 🏆'; badgeColor = '#fbbf24'; txtColor = '#000'; }
            else if (rank === 2) { badge = lang === 'en' ? '2nd Place 🥈' : '2. Hely 🥈'; badgeColor = '#cbd5e1'; txtColor = '#000'; }
            else if (rank === 3) { badge = lang === 'en' ? '3rd Place 🥉' : '3. Hely 🥉'; badgeColor = '#b45309'; txtColor = '#fff'; }
            else if (percentile <= 0.1) { badge = '⭐ Top 10%'; badgeColor = '#a855f7'; txtColor = '#fff'; }
            else if (percentile <= 0.2) { badge = '✨ Top 20%'; badgeColor = '#10b981'; txtColor = '#fff'; }

            const isDaily = getTopicType(entry?.start_date, entry?.end_date) === 'daily';

            return (
              <div key={idx} style={{ background: 'var(--bg-card)', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${rank <= 3 || percentile <= 0.2 ? badgeColor : 'var(--border-main)'}`, boxShadow: '0 4px 15px rgba(0,0,0,0.05)', transition: 'all 0.2s ease-in-out', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', width: '100%' }} className="trophy-archive-card">
                <div style={{ position: 'relative', height: '180px', backgroundColor: '#090d16' }}>
                  {/* 🎯 referrerPolicy="no-referrer" az Androidos képbetöltéshez */}
                  <img src={getImageUrl(entry?.drive_file_id, entry?.file_url)} alt="Submission" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} onClick={() => setFullscreenData({url: getImageUrl(entry?.drive_file_id, entry?.file_url), title: entry?.topic_title || ''})} onError={handleImageError} />
                  
                  <div style={{ position: 'absolute', top: '10px', left: '10px', background: badgeColor, color: txtColor, padding: '3px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.72rem' }}>
                    {badge || (lang === 'en' ? `Rank ${entry?.rank}` : `${entry?.rank}. Hely`)}
                  </div>
                  
                  <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(9,13,22,0.82)', color: isDaily ? '#f87171' : '#60a5fa', padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 'bold', border: `1px solid ${isDaily ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'}` }}>
                    {isDaily ? (lang === 'en' ? 'Blitz' : 'Villámfutam') : (lang === 'en' ? 'Master' : 'Mesterfutam')}
                  </div>
                </div>
                <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', width: '100%' }}>
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-title)', fontSize: '0.98rem', fontWeight: '600', letterSpacing: '-0.2px', wordBreak: 'break-word' }}>{entry?.topic_title}</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-body)', fontSize: '0.78rem', marginBottom: '8px' }}>
                      <span>{lang === 'en' ? `Field: ${entry?.total_entries || 0} photos` : `Mezőny: ${entry?.total_entries || 0} kép`}</span>
                      <span style={{color: 'var(--text-title)'}}>{lang === 'en' ? 'Rank: ' : 'Helyezés: '}<b>{entry?.rank || 0}.</b></span>
                    </div>
                    <div style={{ background: 'var(--bg-main)', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border-main)', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '12px' }}>
                      <span style={{color: '#f97316', fontWeight: '700'}}>⚡ {entry?.likes || 0} FP</span>
                      <span style={{color: '#38bdf8', fontWeight: '700'}}>👁️ {entry?.views || 0}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveShareData({ ...entry, file_url: getImageUrl(entry?.drive_file_id, entry?.file_url) })}
                    style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.78rem', transition: 'all 0.15s' }}
                    className="trophy-share-btn"
                  >
                    <Share2 size={12} /> {t('trophyShareBtn')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <style>{`
        .trophy-share-btn:hover {
          background: var(--hover-overlay) !important;
          color: var(--text-title) !important;
          border-color: #475569 !important;
        }
        .trophy-archive-card:hover {
          transform: translateY(-2px);
          border-color: #475569 !important;
        }
      `}</style>
    </div>
  );
}
