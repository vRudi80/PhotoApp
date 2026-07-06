import React, { useState, useEffect, useRef } from 'react';
import { getImageUrl } from '../../../utils/helpers';
import VideoLoader from '../../../components/VideoLoader';
import { BACKEND_URL } from '../../../utils/constants';

// Nyelvi kontextus betöltése
import { useLanguage } from '../../../context/LanguageContext';

// Téma környezet betöltése
import { useTheme } from '../../../context/ThemeContext';

// Professzionális Lucide Ikonok importálása az AI-sallangok ellen
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
  getLevelDetails: (likes: number, victories: number) => { name: string; color: string; bg: string };
  getTopicType: (start: string, end: string) => 'daily' | 'weekly';
  handleImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  premiumUntil?: string | null; 
}

export default function TrophyRoom({
  isLoadingStats, myStats, userTotalLikes, userVictories, swapBalance,
  myReferralCode, referredBy, referralInput, setReferralInput,
  isClaimingReferral, handleClaimReferral, setActiveShareData, setFullscreenData,
  getLevelDetails, getTopicType, handleImageError,
  premiumUntil 
}: TrophyRoomProps) {

  const { t, lang } = useLanguage();

  // 🎯 BIZTONSÁGI VÉDŐHÁLÓ: Lekérjük az aktuális témát, felkészülve a környezeti cold-startra
  let isLight = false;
  try {
    const themeContext = useTheme();
    if (themeContext) {
      isLight = themeContext.theme === 'light';
    }
  } catch (e) {}

  // Angol rangnév szótár a szintjelzőhöz reszponzivitás miatt
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

  // 📐 FOTÓSMESTER RANG-PROGRESSZIÓ ADATBÁZIS
  const thresholds = [
    { name: 'Fényleső 🌱', min: 0, max: 30, vic: 0 },
    { name: 'Megfigyelő 👁️', min: 30, max: 100, vic: 0 },
    { name: 'Képvadász 📷', min: 100, max: 250, vic: 0 },
    { name: 'Komponista 📐', min: 250, max: 500, vic: 0 },
    { name: 'Fényíró 🎞️', min: 500, max: 800, vic: 1 },
    { name: 'Esztéta 💎', min: 800, max: 1300, vic: 2 },
    { name: 'Szakértő 🎯', min: 1300, max: 2000, vic: 3 },
    { name: 'Képmester 🎨', min: 2000, max: 3200, vic: 5 },
    { name: 'Nagymester 🌟', min: 3200, max: 4800, vic: 7 },
    { name: 'Virtuóz ⚡', min: 4800, max: 7000, vic: 9 },
    { name: 'Fotóguru 🔥', min: 7000, max: 10000, vic: 12 },
    { name: 'Vizuális Legenda 👑', min: 10000, max: Infinity, vic: 15 }
  ];

  const getActualRankBracket = (likes: number, vics: number) => {
    if (likes < 30) return thresholds[0];
    if (likes < 100) return thresholds[1];
    if (likes < 250) return thresholds[2];
    if (likes < 500 || vics < 1) return thresholds[3];
    if (likes < 800 || vics < 2) return thresholds[4];
    if (likes < 1300 || vics < 3) return thresholds[5];
    if (likes < 2000 || vics < 5) return thresholds[6];
    if (likes < 3200 || vics < 7) return thresholds[7];
    if (likes < 4800 || vics < 9) return thresholds[8];
    if (likes < 7000 || vics < 12) return thresholds[9];
    if (likes < 10000 || vics < 15) return thresholds[10];
    return thresholds[11];
  };

  const currentBracket = getActualRankBracket(userTotalLikes, userVictories);
  
  // Adaptív szint-színkezelő a tökéletes világos módos kontrasztért
  const getAdaptiveLevelDetails = (likes: number, victories: number) => {
    const lvl = getLevelDetails ? getLevelDetails(likes, victories) : { name: '', color: '#fbbf24', bg: '' };
    if (!isLight) return lvl;
    
    let adaptiveColor = lvl.color;
    if (lvl.name.includes('Megfigyelő')) adaptiveColor = '#475569';
    else if (lvl.name.includes('Képvadász')) adaptiveColor = '#0284c7';
    else if (lvl.name.includes('Komponista')) adaptiveColor = '#2563eb';
    else if (lvl.name.includes('Fényíró')) adaptiveColor = '#059669';
    else if (lvl.name.includes('Szakértő')) adaptiveColor = '#7c3aed';
    else if (lvl.name.includes('Képmester')) adaptiveColor = '#db2777';
    else if (lvl.name.includes('Nagymester')) adaptiveColor = '#d97706';
    else if (lvl.name.includes('Virtuóz')) adaptiveColor = '#ca8a04';
    else if (lvl.name.includes('Vizuális Legenda')) adaptiveColor = '#b45309';

    return { ...lvl, color: adaptiveColor };
  };

  const matchedLevel = getAdaptiveLevelDetails(userTotalLikes, userVictories);
  
  const currentLevelInfo = {
    name: lang === 'en' ? (rankNamesEn[matchedLevel.name] || matchedLevel.name) : matchedLevel.name,
    color: matchedLevel.color,
    bg: 'var(--hover-overlay)'
  };

  let progressPercent = 100;
  let levelHelpText = lang === 'en' ? 'Maximum Visual Legend Tier reached! 👑' : 'Elérted a maximális Vizuális Legenda szintet! 👑';

  if (currentBracket && currentBracket.max !== Infinity) {
    const range = currentBracket.max - currentBracket.min;
    const currentProgress = userTotalLikes - currentBracket.min;
    progressPercent = Math.min(100, Math.max(0, (currentProgress / range) * 100));

    if (userTotalLikes < currentBracket.max) {
      const neededLikes = Math.round((currentBracket.max - userTotalLikes) * 100) / 100;
      levelHelpText = lang === 'en' 
        ? `${neededLikes} more FP points needed for the next level` 
        : `Még ${neededLikes} FP pont szükséges a következő szinthez`;
    } else if (userVictories < currentBracket.vic) { 
      levelHelpText = lang === 'en'
        ? `${currentBracket.vic - userVictories} more Arena victory needed for the next level` 
        : `Még ${currentBracket.vic - userVictories} Aréna győzelem szükséges a következő szinthez`;
    } else {
      levelHelpText = lang === 'en' ? 'Ready for the next rank tier!' : 'Minden feltétel teljesítve a következő szinthez!';
    }
  }

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
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* Szint progressziós banner – 🎯 JAVÍTVA: Reaktív háttér és szegélyek */}
      <div style={{ background: 'var(--bg-card)', padding: '30px 20px', borderRadius: '8px', border: '1px solid var(--border-main)', marginBottom: '20px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <h3 style={{ color: 'var(--text-muted)', margin: '0 0 4px 0', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>{t('trophyCurrentStatus')}</h3>
        <h1 style={{ color: currentLevelInfo.color, margin: '0 0 16px 0', fontSize: '2.4rem', fontWeight: '700', letterSpacing: '-0.5px' }}>{currentLevelInfo.name}</h1>
        
        <div style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-main)', height: '10px', borderRadius: '4px', margin: '0 auto', overflow: 'hidden', border: '1px solid var(--border-main)', position: 'relative' }}>
          <div style={{ width: `${progressPercent}%`, background: currentLevelInfo.color, height: '100%', borderRadius: '4px' }}></div>
        </div>
        
        <div style={{ color: matchedLevel.name === 'Vizuális Legenda 👑' ? '#fbbf24' : 'var(--text-body)', fontSize: '0.85rem', marginTop: '12px', fontWeight: '600' }}>
          {levelHelpText}
        </div>
        <div style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {lang === 'en' ? `Current stats: ${userTotalLikes} FP | ${userVictories} victories` : `Saját statisztikád: ${userTotalLikes} FP | ${userVictories} Győzelem`}
        </div>
      </div>

      {isPremiumActive && (
        <div style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.2)', borderLeft: '4px solid #10b981', padding: '14px 20px', borderRadius: '6px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldCheck size={24} color="#10b981" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ color: '#4ade80', fontWeight: '700', fontSize: '0.95rem', marginBottom: '1px' }}>{t('trophyPremiumActive')}</div>
            <div style={{ color: 'var(--text-body)', fontSize: '0.8rem', lineHeight: '1.4' }}>
              {t('trophyPremiumDesc')}<strong style={{ color: 'var(--text-title)' }}>{new Date(premiumUntil!).toLocaleDateString(lang === 'en' ? 'en-US' : 'hu-HU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>{t('trophyPremiumNotice')}
            </div>
          </div>
        </div>
      )}

      {/* 🎯 ANALITIKAI RÁCS ELEMEK: Szinkronizált színekkel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <Zap size={16} color="#f97316" />
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#f97316', lineHeight: '1.2' }}>{userTotalLikes}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>{lang === 'en' ? 'Total FP Points' : 'Összes FP Pont'}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <Crown size={16} color="#fbbf24" />
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#fbbf24', lineHeight: '1.2' }}>{userVictories}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>{t('trophyStatWins')}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <Medal size={16} color={isLight ? '#475569' : '#cbd5e1'} />
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-title)', lineHeight: '1.2' }}>{podiumCount}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>{t('trophyStatPodiums')}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <RefreshCw size={14} color="#fb7185" />
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#fb7185', lineHeight: '1.2' }}>{swapBalance}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>{t('trophyStatJokers')}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <Eye size={16} color="#38bdf8" />
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#38bdf8', lineHeight: '1.2' }}>{totalViews}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>{t('trophyStatViews')}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <TrendingUp size={16} color="#a855f7" />
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#a855f7', lineHeight: '1.2' }}>{top10Count}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>Top 10%</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <Award size={16} color="#10b981" />
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#10b981', lineHeight: '1.2' }}>{top20Count}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>Top 20%</div>
        </div>
      </div>

      {/* MEGHÍVÓ PANEL ZÓNA */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ margin: 0, color: '#38bdf8', fontSize: '1.05rem', fontWeight: '600', letterSpacing: '-0.2px' }}>{t('trophyInviteTitle')}</h4>
          <p style={{ color: 'var(--text-body)', fontSize: '0.8rem', margin: 0, lineHeight: '1.4' }}>
            {lang === 'en' 
              ? 'Invite your photographer friends! Share your unique code, and when they register and claim it, you both receive +200 Global Points immediately!' 
              : 'Hívd meg fotós barátaidat! Oszd meg az egyedi kódodat, és amint érvényesítik azt, mindketten azonnal +200 Globális Pontot kaptok a számlátokra!'}
          </p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '4px', border: '1px dashed var(--border-main)', marginTop: 'auto' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 'bold' }}>{t('trophyInviteCode')}</span>
            <strong style={{ color: 'var(--text-title)', fontSize: '1.15rem', fontFamily: 'monospace', letterSpacing: '0.5px', flex: 1 }}>{myReferralCode}</strong>
            <button 
              onClick={() => { navigator.clipboard.writeText(myReferralCode); alert(t('trophyCopiedAlert')); }}
              style={{ background: 'var(--bg-card)', color: 'var(--text-title)', border: '1px solid var(--border-main)', padding: '5px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Copy size={12} /> {t('trophyCopy')}
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
          <div>
            <h4 style={{ margin: 0, color: '#10b981', fontSize: '1.05rem', fontWeight: '600', letterSpacing: '-0.2px' }}>{t('trophyReferredTitle')}</h4>
            <p style={{ color: 'var(--text-body)', fontSize: '0.8rem', margin: 0, lineHeight: '1.4' }}>
              {lang === 'en'
                ? 'Have an invitation code from a friend? Enter it below to unlock your starting +200 Global Points bonus!'
                : 'Kaptál egy meghívó kódot egy ismerősödtől? Írd be alább, és aktiváld az induló +200 Globális Pont bónuszodat!'}
            </p>
          </div>
          
          {!referredBy ? ( 
            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
              <input 
                type="text" 
                placeholder={t('trophyPlaceholderRef')} 
                value={referralInput}
                onChange={e => setReferralInput(e.target.value.toUpperCase())}
                disabled={isClaimingReferral}
                style={{ flex: 1, padding: '8px 12px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'var(--text-title)', borderRadius: '4px', fontSize: '0.9rem', outline: 'none', textTransform: 'uppercase', fontFamily: 'monospace' }} 
              />
              <button 
                onClick={handleClaimReferral}
                disabled={!referralInput.trim() || isClaimingReferral}
                style={{ background: !referralInput.trim() || isClaimingReferral ? 'var(--border-main)' : '#10b981', color: !referralInput.trim() || isClaimingReferral ? 'var(--text-muted)' : 'white', border: 'none', padding: '0 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                {isClaimingReferral ? '...' : t('trophySubmit')}
              </button>
            </div>
          ) : (
            <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', padding: '10px', borderRadius: '4px', color: '#10b981', fontSize: '0.82rem', fontWeight: 'bold', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: 'auto' }}>
              <Check size={14} /> {t('trophyReferredSuccess')}
            </div>
          )}
        </div>
      </div>

      <h3 style={{ color: 'var(--text-title)', marginBottom: '14px', fontSize: '1.2rem', fontWeight: '600', letterSpacing: '-0.3px' }}>
        {lang === 'en' ? `Past Submissions (${myStats.history?.length || 0})` : `Korábbi pályaműveid (${myStats.history?.length || 0} db)`}
      </h3>
      
      {myStats.history?.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '30px', borderRadius: '8px', textAlign: 'center', border: '1px dashed var(--border-main)' }}>
          <Camera size={24} style={{ margin: '0 auto 8px auto' }} />
          <h4 style={{ color: 'var(--text-title)', margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '600' }}>{t('trophyNoPastEntries')}</h4>
          <p style={{ margin: 0, fontSize: '0.82rem' }}>{t('trophyNoPastEntriesDesc')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
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
              <div key={idx} style={{ background: 'var(--bg-card)', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${rank <= 3 || percentile <= 0.2 ? badgeColor : 'var(--border-main)'}`, boxShadow: '0 4px 15px rgba(0,0,0,0.05)', transition: 'all 0.2s ease-in-out', display: 'flex', flexDirection: 'column' }} className="trophy-archive-card">
                <div style={{ position: 'relative', height: '200px', backgroundColor: '#090d16' }}>
                  <img src={getImageUrl(entry?.drive_file_id, entry?.file_url)} alt="Submission" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} onClick={() => setFullscreenData({url: getImageUrl(entry?.drive_file_id, entry?.file_url), title: entry?.topic_title || ''})} onError={handleImageError} />
                  
                  <div style={{ position: 'absolute', top: '12px', left: '12px', background: badgeColor, color: txtColor, padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.78rem' }}>
                    {badge || (lang === 'en' ? `Rank ${entry?.rank}` : `${entry?.rank}. Hely`)}
                  </div>
                  
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(9,13,22,0.82)', color: isDaily ? '#f87171' : '#60a5fa', padding: '3px 10px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', border: `1px solid ${isDaily ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'}` }}>
                    {isDaily ? (lang === 'en' ? 'Blitz' : 'Villámfutam') : (lang === 'en' ? 'Master' : 'Mesterfutam')}
                  </div>
                </div>
                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-title)', fontSize: '1.05rem', fontWeight: '600', letterSpacing: '-0.2px' }}>{entry?.topic_title}</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-body)', fontSize: '0.82rem', marginBottom: '10px' }}>
                      <span>{lang === 'en' ? `Field: ${entry?.total_entries || 0} photos` : `Mezőny: ${entry?.total_entries || 0} kép`}</span>
                      <span style={{color: 'var(--text-title)'}}>{lang === 'en' ? 'Rank: ' : 'Helyezés: '}<b>{entry?.rank || 0}.</b></span>
                    </div>
                    <div style={{ background: 'var(--bg-main)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-main)', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '14px' }}>
                      <span style={{color: '#f97316', fontWeight: '700'}}>⚡ {entry?.likes || 0} FP</span>
                      <span style={{color: '#38bdf8', fontWeight: '700'}}>👁️ {entry?.views || 0}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveShareData(entry)}
                    style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.82rem', transition: 'all 0.15s' }}
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
