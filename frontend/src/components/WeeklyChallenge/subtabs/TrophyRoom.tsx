import React, { useState } from 'react';
import { getImageUrl } from '../../../utils/helpers';
import VideoLoader from '../../../components/VideoLoader';

// Behozzuk a nyelvi kontextust
import { useLanguage } from '../../../context/LanguageContext';

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
    'Legenda 👑': 'Visual Legend 👑'
  };

  // Memóriából betöltjük a bezárt értesítéseket
  useEffect(() => {
    const stored = localStorage.getItem('dismissed_alerts');
    if (stored) setDismissedAlerts(JSON.parse(stored));
  }, []);

  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];
  const safeUserPower = userPower || { super: 1, brilliant: 2 };

  const currentLevel = getLevelDetails(userTotalLikes, userVictories);

  const displayRoomTitle = lang === 'en' && topic?.title_en ? topic.title_en : (topic?.title || t('roomChallengeRoom'));
  const displayRoomDesc = lang === 'en' && topic?.description_en ? topic.description_en : (topic?.description || '');

  // ... segédfüggvények ...
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString(lang === 'en' ? 'en-US' : 'hu-HU', { month: 'short', day: 'numeric' });

  const checkClubAccess = (item: any) => {
    const itemClubName = item.club_name || item.restricted_club;
    const itemClubId = item.club_id || item.restricted_club_id;
    const hasRestriction = (itemClubName && itemClubName.trim() !== '') || (itemClubId && itemClubId !== 0);
    if (!hasRestriction) return true; 
    if (!user?.club_name && !user?.club_id) return false;
    const nameMatch = itemClubName && user?.club_name && itemClubName.trim() === user.club_name.trim();
    const idMatch = itemClubId && user?.club_id && Number(itemClubId) === Number(user.club_id);
    return !!(nameMatch || idMatch);
  };

  if (isLoadingStats && (!myStats || myStats.history.length === 0)) {
    return <VideoLoader />;
  }

  if (!myStats) {
    return <div style={{ color: '#ef4444', textAlign: 'center', padding: '20px' }}>{t('trophyError')}</div>;
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
  const matchedLevel = getLevelDetails(userTotalLikes, userVictories);
  
  const currentLevelInfo = {
    name: lang === 'en' ? (rankNamesEn[matchedLevel.name] || matchedLevel.name) : matchedLevel.name,
    color: matchedLevel.color,
    bg: `${matchedLevel.color}15`
  };

  // 📊 SZÁZALÉK ÉS UTASÍTÓ SZÖVEG SZÁMÍTÁSA VALÓS IDŐBEN KEREKÍTÉSSEL
  let progressPercent = 100;
  let levelHelpText = lang === 'en' ? 'Maximum Visual Legend Tier reached! 👑' : 'Elérted a maximális Vizuális Legenda szintet! 👑';

  if (currentBracket && currentBracket.max !== Infinity) {
    const range = currentBracket.max - currentBracket.min;
    const currentProgress = userTotalLikes - currentBracket.min;
    progressPercent = Math.min(100, Math.max(0, (currentProgress / range) * 100));

    if (userTotalLikes < currentBracket.max) {
      // 🎯 JAVÍTVA: Matematikai kerekítés maximum 2 tizedesjegyre a lebegőpontos lógás ellen
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
    <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
      
      {/* Szint progressziós banner */}
      <div style={{ background: 'linear-gradient(180deg, #1e293b, #0f172a)', padding: '40px 25px', borderRadius: '24px', border: `1px solid ${currentLevelInfo.color}50`, marginBottom: '25px', textAlign: 'center', boxShadow: `0 10px 40px -10px ${currentLevelInfo.color}40`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-50px', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', background: `${currentLevelInfo.color}20`, filter: 'blur(80px)', borderRadius: '50%' }}></div>
        <h3 style={{ color: '#94a3b8', margin: '0 0 10px 0', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '3px', position: 'relative', zIndex: 1 }}>{t('trophyCurrentStatus')}</h3>
        <h1 style={{ color: currentLevelInfo.color, margin: '0 0 20px 0', fontSize: '3.5rem', fontWeight: '900', textShadow: `0 0 20px ${currentLevelInfo.color}60`, position: 'relative', zIndex: 1 }}>{currentLevelInfo.name}</h1>
        
        <div style={{ width: '100%', maxWidth: '600px', background: '#0f172a', height: '16px', borderRadius: '10px', margin: '0 auto', overflow: 'hidden', border: '1px solid #334155', position: 'relative', zIndex: 1 }}>
          <div style={{ width: `${progressPercent}%`, background: `linear-gradient(90deg, transparent, ${currentLevelInfo.color})`, height: '100%' }}></div>
        </div>
        
        <div style={{ color: matchedLevel.name === 'Vizuális Legenda 👑' ? '#fbbf24' : '#cbd5e1', fontSize: matchedLevel.name === 'Vizuális Legenda 👑' ? '1rem' : '0.9rem', marginTop: '15px', position: 'relative', zIndex: 1, fontWeight: matchedLevel.name === 'Vizuális Legenda 👑' ? 'bold' : 'normal' }}>
          {levelHelpText}
        </div>
        <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#64748b', position: 'relative', zIndex: 1 }}>
          {lang === 'en' ? `Current stats: ${userTotalLikes} FP | ${userVictories} victories` : `Saját statisztikád: ${userTotalLikes} FP | ${userVictories} Győzelem`}
        </div>
      </div>

      {/* JÁTÉKBAN NYERT PRÉMIUM JUTALOM BANNER */}
      {isPremiumActive && (
        <div style={{ background: 'linear-gradient(90deg, #10b98115, #0f172a)', border: '1px solid #10b98140', borderLeft: '5px solid #10b981', padding: '18px 25px', borderRadius: '16px', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 0 30px rgba(16,185,129,0.05)' }}>
          <div style={{ fontSize: '2rem' }}>💎</div>
          <div>
            <div style={{ color: '#4ade80', fontWeight: '900', fontSize: '1.1rem', marginBottom: '3px' }}>{t('trophyPremiumActive')}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              {t('trophyPremiumDesc')}<strong style={{ color: '#f8fafc' }}>{new Date(premiumUntil!).toLocaleDateString(lang === 'en' ? 'en-US' : 'hu-HU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>{t('trophyPremiumNotice')}
            </div>
          </div>
        </div>
      )}

      {/* Stat rács */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #334155', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#f97316', marginBottom: '5px' }}>{userTotalLikes}</div>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{lang === 'en' ? 'Total FP Points' : 'Összes FP Pont'}</div>
        </div>
        <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #fbbf24', boxShadow: '0 10px 20px rgba(251,191,36,0.1)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fbbf24', marginBottom: '5px' }}>{userVictories}</div>
          <div style={{ color: '#fbbf24', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{t('trophyStatWins')}</div>
        </div>
        <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #cbd5e1', boxShadow: '0 10px 20px rgba(203,213,225,0.1)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#cbd5e1', marginBottom: '5px' }}>{podiumCount}</div>
          <div style={{ color: '#cbd5e1', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{t('trophyStatPodiums')}</div>
        </div>
        <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #fb7185', boxShadow: '0 10px 20px rgba(190,18,60,0.1)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fb7185', marginBottom: '5px' }}>{swapBalance}</div>
          <div style={{ color: '#fb7185', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{t('trophyStatJokers')}</div>
        </div>
        <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #334155', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#38bdf8', marginBottom: '5px' }}>{totalViews}</div>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{t('trophyStatViews')}</div>
        </div>
        <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #a855f7', boxShadow: '0 10px 20px rgba(168,85,247,0.1)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#a855f7', marginBottom: '5px' }}>{top10Count}</div>
          <div style={{ color: '#a855f7', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Top 10%</div>
        </div>
        <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #10b981', boxShadow: '0 10px 20px rgba(16,165,129,0.1)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10b981', marginBottom: '5px' }}>{top20Count}</div>
          <div style={{ color: '#10b981', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Top 20%</div>
        </div>
      </div>

      {/* Ajánlórendszer panelek */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginBottom: '40px' }}>
        <div style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', padding: '25px', borderRadius: '24px', border: '1px solid #38bdf840', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#38bdf8', fontSize: '1.2rem' }}>{t('trophyInviteTitle')}</h4>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>{t('trophyInviteDesc')}</p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#0f172a', padding: '12px 20px', borderRadius: '12px', border: '1px dashed #38bdf860' }}>
            <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 'bold' }}>{t('trophyInviteCode')}</span>
            <strong style={{ color: 'white', fontSize: '1.3rem', fontFamily: 'monospace', letterSpacing: '1px', flex: 1 }}>{myReferralCode}</strong>
            <button 
              onClick={() => { navigator.clipboard.writeText(myReferralCode); alert(t('trophyCopiedAlert')); }}
              style={{ background: '#38bdf820', color: '#38bdf8', border: '1px solid #38bdf840', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              {t('trophyCopy')}
            </button>
          </div>
        </div>

        <div style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', padding: '25px', borderRadius: '24px', border: '1px solid #10b98140', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#10b981', fontSize: '1.2rem' }}>{t('trophyReferredTitle')}</h4>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>{t('trophyReferredDesc')}</p>
          </div>
          
          {!referredBy ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder={t('trophyPlaceholderRef')} 
                value={referralInput}
                onChange={e => setReferralInput(e.target.value.toUpperCase())}
                disabled={isClaimingReferral}
                style={{ flex: 1, padding: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '12px', fontSize: '1rem', outline: 'none', textTransform: 'uppercase', fontFamily: 'monospace' }} 
              />
              <button 
                onClick={handleClaimReferral}
                disabled={!referralInput.trim() || isClaimingReferral}
                style={{ background: !referralInput.trim() || isClaimingReferral ? '#334155' : 'linear-gradient(135deg, #10b981, #059669)', color: !referralInput.trim() || isClaimingReferral ? '#64748b' : 'white', border: 'none', padding: '0 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {isClaimingReferral ? '...' : t('trophySubmit')}
              </button>
            </div>
          ) : (
            <div style={{ background: '#10b98110', border: '1px solid #10b98130', padding: '12px', borderRadius: '12px', color: '#10b981', fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center' }}>
              {t('trophyReferredSuccess')}
            </div>
          )}
        </div>
      </div>

      {/* Korábbi pályaművek listája */}
      <h3 style={{ color: '#f8fafc', marginBottom: '20px', fontSize: '1.5rem' }}>
        {lang === 'en' ? `Past Submissions (${myStats.history?.length || 0})` : `Korábbi pályaműveid (${myStats.history?.length || 0} db)`}
      </h3>
      
      {myStats.history?.length === 0 ? (
        <div style={{ color: '#94a3b8', background: '#1e293b', padding: '40px', borderRadius: '20px', textAlign: 'center', border: '1px dashed #334155' }}>
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📸</div>
          <h4 style={{ color: '#f8fafc', margin: '0 0 10px 0', fontSize: '1.2rem' }}>{t('trophyNoPastEntries')}</h4>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{t('trophyNoPastEntriesDesc')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' }}>
          {myStats.history?.map((entry: any, idx: number) => {
            const totalEntries = Number(entry?.total_entries) || 1;
            const percentile = (Number(entry?.rank) || 1) / totalEntries;
            const rank = Number(entry?.rank) || 0;
            
            let badge = ''; let badgeColor = '#334155';
            if (rank === 1) { badge = lang === 'en' ? '1st Place 🏆' : '1. Hely 🏆'; badgeColor = '#fbbf24'; }
            else if (rank === 2) { badge = lang === 'en' ? '2nd Place 🥈' : '2. Hely 🥈'; badgeColor = '#cbd5e1'; }
            else if (rank === 3) { badge = lang === 'en' ? '3rd Place 🥉' : '3. Hely 🥉'; badgeColor = '#cd7f32'; }
            else if (percentile <= 0.1) { badge = '⭐ Top 10%'; badgeColor = '#a855f7'; }
            else if (percentile <= 0.2) { badge = '✨ Top 20%'; badgeColor = '#10b981'; }

            const isDaily = getTopicType(entry?.start_date, entry?.end_date) === 'daily';

            return (
              <div key={idx} style={{ background: '#1e293b', borderRadius: '20px', overflow: 'hidden', border: `1px solid ${badgeColor}`, transition: 'transform 0.2s', boxShadow: '0 10px 20px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                <div style={{ position: 'relative', height: '220px' }}>
                  <img src={getImageUrl(entry?.drive_file_id, entry?.file_url)} alt="Submission" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} onClick={() => setFullscreenData({url: getImageUrl(entry?.drive_file_id, entry?.file_url), title: entry?.topic_title || ''})} onError={handleImageError} />
                  
                  <div style={{ position: 'absolute', top: '15px', left: '15px', background: badgeColor, color: ['#fbbf24', '#cbd5e1'].includes(badgeColor) ? 'black' : 'white', padding: '6px 16px', borderRadius: '100px', fontWeight: '900', fontSize: '0.9rem' }}>
                    {badge || (lang === 'en' ? `Rank ${entry?.rank}` : `${entry?.rank}. Hely`)}
                  </div>
                  
                  <div style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', color: isDaily ? '#f87171' : '#60a5fa', padding: '4px 12px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${isDaily ? '#ef444450' : '#3b82f650'}` }}>
                    {isDaily ? (lang === 'en' ? '🔴 Blitz Match' : '🔴 Villámfutam') : (lang === 'en' ? '🔵 Master Match' : '🔵 Mesterfutam')}
                  </div>
                </div>
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: '0 0 15px 0', color: '#f8fafc', fontSize: '1.2rem' }}>{entry?.topic_title}</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '12px' }}>
                      <span>{lang === 'en' ? `Field: ${entry?.total_entries || 0} photos` : `Mezőny: ${entry?.total_entries || 0} kép`}</span>
                      <span style={{color: '#f8fafc'}}>{lang === 'en' ? 'Rank: ' : 'Helyezés: '}<b>{entry?.rank || 0}.</b></span>
                    </div>
                    <div style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '15px' }}>
                      <span style={{color: '#f97316', fontWeight: '900'}}>⚡ {entry?.likes || 0} FP</span>
                      <span style={{color: '#38bdf8', fontWeight: 'bold'}}>👁️ {entry?.views || 0}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveShareData(entry)}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #14b8a6, #0d9488)', color: 'white', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(20,184,166,0.2)' }}
                  >
                    {t('trophyShareBtn')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
