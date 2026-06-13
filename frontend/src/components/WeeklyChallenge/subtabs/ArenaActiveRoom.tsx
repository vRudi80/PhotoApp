import React, { useEffect, useRef } from 'react';
import { getImageUrl } from '../../../utils/helpers';

// 🎯 ÚJ IMPORT: Behozzuk a nyelvi kontextust
import { useLanguage } from '../../../context/LanguageContext';

// 🕒 1. FIXEN SZINKRONIZÁLT AKTIÓV SZŐBA VISSZASZÁMLÁLÓ (A másikkal azonos prémium dizájnnal)
function ActiveRoomCountdown({ endDate, lang }: { endDate: string; lang: string }) {
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!endDate) return;
    const standardized = String(endDate).replace(' ', 'T').split('.')[0];
    const targetMillis = new Date(standardized).getTime();

    const updateTextDirectly = () => {
      if (!elementRef.current) return;

      const now = new Date().getTime();
      const difference = targetMillis - now;

      if (difference <= 0) {
        elementRef.current.innerText = lang === 'en' ? 'Match Closed!' : 'Futam Lezárult! 📜';
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      if (lang === 'en') {
        elementRef.current.innerText = days > 0 
          ? `${days}d ${hours}h ${minutes}m ${seconds}s` 
          : `${hours}h ${minutes}m ${seconds}s`;
      } else {
        elementRef.current.innerText = days > 0 
          ? `${days}n ${hours}ó ${minutes}p ${seconds}mp` 
          : `${hours}ó ${minutes}p ${seconds}mp`;
      }
    };

    updateTextDirectly();
    const interval = setInterval(updateTextDirectly, 1000);

    return () => clearInterval(interval);
  }, [endDate, lang]);

  return (
    <div style={{ 
      width: '100%',
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      background: '#f59e0b10', 
      padding: '10px 14px', 
      borderRadius: '10px', 
      border: '1px solid #f59e0b30', 
      boxSizing: 'border-box',
      zIndex: 1
    }}>
      <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold', letterSpacing: '0.5px' }}>
        {lang === 'en' ? '⏳ TIME LEFT:' : '⏳ HÁTRALÉVŐ IDŐ:'}
      </span>
      <span ref={elementRef} style={{ color: '#fff', fontFamily: 'monospace', fontSize: '1rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>---</span>
    </div>
  );
}

interface ArenaActiveRoomProps {
  topic: any;
  timeLeft: string;
  isMaster: boolean;
  exposureColor: string;
  exposurePercentage: number;
  exposureLabel: string;
  myEntry: any;
  voteEntry: any;
  noMoreEntries: boolean;
  masterVotesLeft: number;
  userPower: any;
  swapBalance: number;
  myPastEntries: any[];
  leaderboard: any[];
  currentClubLeaderboard: any[];
  user: any;
  isUploading: boolean;
  uploadPreview: string | null;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpload: () => void;
  isLoadingSwapAlbum: boolean;
  isSwapping: boolean;
  swapPreview: string | null;
  handleSwapFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSwapSubmit: () => void;
  onOpenAlbumForUpload: () => void;
  onOpenAlbumForSwap: () => void;
  handleVote: (type: 'pass' | 'super' | 'brilliant' | 'master') => void;
  handleOffTopicReport: (id: number) => void;
  handleSwapBackSubmit: (id: number) => void;
  setFullscreenData: (data: any) => void;
  handleImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

// ⚔️ 2. FŐKOMPONENS
export default function ArenaActiveRoom({
  topic, timeLeft, isMaster, exposureColor, exposurePercentage, exposureLabel,
  myEntry, voteEntry, noMoreEntries, masterVotesLeft, userPower, swapBalance,
  myPastEntries, leaderboard, currentClubLeaderboard, user,
  isUploading, uploadPreview, handleFileSelect, handleUpload, isLoadingSwapAlbum,
  isSwapping, swapPreview, handleSwapFileSelect, handleSwapSubmit,
  onOpenAlbumForUpload, onOpenAlbumForSwap,
  handleVote, handleOffTopicReport, handleSwapBackSubmit,
  setFullscreenData, handleImageError
}: ArenaActiveRoomProps) {

  const { t, lang } = useLanguage();

  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];
  const safeClubLeaderboard = Array.isArray(currentClubLeaderboard) ? currentClubLeaderboard : [];
  const safePastEntries = Array.isArray(myPastEntries) ? myPastEntries : [];
  const safeUserPower = userPower || { super: 1, brilliant: 2 };

  const getTranslatedExposureLabel = (label: string) => {
    if (lang === 'en') {
      if (label === 'Alacsony') return 'Low';
      if (label === 'Közepes') return 'Medium';
      if (label === 'Maximális') return 'Maximum';
      if (label?.includes('Láthatatlan')) return 'Invisible (0%)';
    }
    return label;
  };

  const displayRoomTitle = lang === 'en' && topic?.title_en ? topic.title_en : (topic?.title || t('roomChallengeRoom'));
  const displayRoomDesc = lang === 'en' && topic?.description_en ? topic.description_en : (topic?.description || '');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '30px', animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* ── BAL OLDALI OSZLOP ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        {/* TÉMA INFÓ */}
        <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '30px', borderRadius: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '8rem', opacity: 0.05 }}>🔥</div>
          
          <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '1.8rem', textAlign: 'center', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span>{displayRoomTitle}</span>
            {(topic?.master_name || topic?.master_email) && (
              <span style={{ fontSize: '0.85rem', color: '#a78bfa', background: '#a78bfa15', padding: '5px 14px', borderRadius: '10px', border: '1px solid #a78bfa30', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                {t('roomMasterTitle')} {topic.master_name || topic.master_email}
              </span>
            )}
          </h3>
          
          <p style={{ margin: '0 0 20px 0', color: '#cbd5e1', fontSize: '0.95rem', textAlign: 'center', zIndex: 1, lineHeight: '1.6' }}>{displayRoomDesc}</p>
          
          {/* DINAMIKUS CSATATÉR FŐDÍJ BANNER */}
          <div style={{ width: '100%', background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(16, 185, 129, 0.05))', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '12px 20px', borderRadius: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', zIndex: 1, boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <span style={{ fontSize: '1.3rem' }}>🏆</span>
            <div style={{ textAlign: 'center', fontSize: '0.9rem', lineHeight: '1.4' }}>
              <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{t('roomMainPrize')}</span>{' '}
              <strong style={{ color: '#4ade80' }}>{t('roomFreePremium')}</strong>{' '}
              <span style={{ color: '#cbd5e1' }}>{t('roomBonusSwaps')}</span>
            </div>
          </div>

          <ActiveRoomCountdown endDate={topic?.end_date} lang={lang} />
        </div>
        
        {/* LÁTHATÓSÁGI MÉRŐ */}
        {!isMaster && (
          <div style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', padding: '25px 15px', borderRadius: '24px', border: `1px solid ${exposureColor || '#ef4444'}40`, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: `0 10px 40px -10px ${exposureColor || '#ef4444'}30`, transition: 'all 0.5s ease' }}>
            <h4 style={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 15px 0', fontSize: '0.85rem', textAlign: 'center' }}>{t('roomExposureMeter')}</h4>
            
            <div style={{ position: 'relative', width: '100%', maxWidth: '240px', margin: '0 auto' }}>
              <svg viewBox="0 0 200 120" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1e293b" strokeWidth="16" strokeLinecap="round" />
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={exposureColor || '#ef4444'} strokeWidth="16" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - (exposurePercentage || 0)} />
              </svg>
              
              <div style={{ position: 'absolute', bottom: '15px', left: '0', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '2.8rem', fontWeight: '900', color: exposureColor || '#ef4444', lineHeight: '1' }}>
                  {Math.round(exposurePercentage || 0)}<span style={{ fontSize: '1.2rem' }}>%</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#f8fafc', textTransform: 'uppercase', marginTop: '5px', letterSpacing: '2px' }}>
                  {getTranslatedExposureLabel(exposureLabel)}
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '15px 0 0 0', textAlign: 'center', lineHeight: '1.6' }}>
              {!myEntry ? t('roomExpNoEntry') : voteEntry ? t('roomExpNewPhotos') : t('roomExpMaxed')}
            </p>
          </div>
        )}

        {/* ÉRTÉKELŐ ARÉNA PULT */}
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '1.4rem' }}>{t('roomVotingArena')}</h3>
          
          {(!myEntry && !isMaster) ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: '#0f172a', borderRadius: '16px', border: '2px dashed #f59e0b' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>🛑</div>
              <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '1.3rem' }}>{t('roomNoVoteRight')}</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>{t('roomNoVoteRightDesc')}</p>
            </div>
          ) : noMoreEntries ? (
            <div style={{ padding: '50px 20px', textAlign: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '16px', border: '1px solid #10b981' }}>
              <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🎉</div>
              <h4 style={{ color: '#10b981', margin: '0 0 10px 0', fontSize: '1.5rem' }}>{t('roomAllVoted')}</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>{t('roomAllVotedDesc')}</p>
            </div>
          ) : voteEntry ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div onClick={() => setFullscreenData({url: getImageUrl(voteEntry?.drive_file_id, voteEntry?.file_url), title: 'Arena'})} style={{ width: '100%', height: '380px', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-in', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }}>
                <img src={getImageUrl(voteEntry?.drive_file_id, voteEntry?.file_url)} alt="Vote" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={handleImageError} />
              </div>
              
              {voteEntry?.off_topic_count > 0 && (
                <div style={{ background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b40', padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '15px', display: 'inline-flex', alignItems: 'center', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                  {t('roomOffTopicWarning').replace('{count}', String(voteEntry.off_topic_count))}
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '12px', width: '100%', flexDirection: 'column' }}>
                
                {/* 🎯 JAVÍTVA: A Képmester gombja mindig látható, de ha elfogy a szavazat, letiltódik (disabled) */}
                {isMaster && (
                  <button 
                    onClick={() => handleVote('master')} 
                    disabled={masterVotesLeft <= 0}
                    style={{ 
                      width: '100%', 
                      padding: '16px', 
                      background: masterVotesLeft > 0 ? 'linear-gradient(135deg, #fbbf24, #d97706)' : '#1e293b', 
                      color: masterVotesLeft > 0 ? '#0f172a' : '#64748b', 
                      border: masterVotesLeft > 0 ? 'none' : '1px dashed #334155', 
                      borderRadius: '14px', 
                      fontSize: '1.1rem', 
                      fontWeight: '900', 
                      cursor: masterVotesLeft > 0 ? 'pointer' : 'not-allowed', 
                      boxShadow: masterVotesLeft > 0 ? '0 4px 15px rgba(251,191,36,0.4)' : 'none', 
                      marginBottom: '6px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {masterVotesLeft > 0 ? t('roomMasterVoteBtn') : (lang === 'en' ? '👑 All Special Awards Distributed' : '👑 Minden Különdíj kiosztva')} <br/>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.8 }}>
                      {masterVotesLeft > 0 
                        ? t('roomMasterVotesRemaining').replace('{count}', String(masterVotesLeft))
                        : (lang === 'en' ? '0 votes remaining' : '0 szavazat maradt')}
                    </span>
                  </button>
                )}

                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <button onClick={() => handleVote('super')} style={{ flex: 1, padding: '15px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                    {t('roomVoteSuper')} <br/><span style={{fontSize: '0.8rem', fontWeight: 'normal'}}>+{safeUserPower.super}{t('roomPoints')}</span>
                  </button>
                  <button onClick={() => handleVote('brilliant')} style={{ flex: 1, padding: '15px', background: 'linear-gradient(135deg, #f97316, #ef4444)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                    {t('roomVoteBrilliant')} <br/><span style={{fontSize: '0.8rem', fontWeight: 'normal'}}>+{safeUserPower.brilliant}{t('roomPoints')}</span>
                  </button>
                </div>
                <button onClick={() => handleVote('pass')} style={{ width: '100%', padding: '12px', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '14px', fontSize: '0.95rem', cursor: 'pointer' }}>
                  {t('roomVotePass')}
                </button>
                <button 
                  onClick={() => handleOffTopicReport(voteEntry?.id)}
                  style={{ width: '100%', padding: '10px 20px', background: '#ef444410', color: '#ef4444', border: '1px solid #ef444430', borderRadius: '14px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                >
                  {t('roomReportBtn')}
                </button>
              </div>
            </div>
          ) : <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>{t('roomLoadingPhoto')}</div>}
        </div>
      </div>

      {/* ── JOBB OLDALI OSZLOP ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        {/* SAJÁT NEVEZÉS */}
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.4rem' }}>{t('roomMyEntry')}</h3>
            <span style={{ fontSize: '0.85rem', background: '#be123c30', color: '#fb7185', border: '1px solid #be123c60', padding: '4px 12px', borderRadius: '50px', fontWeight: 'bold' }}>
              {t('roomJokerSwaps').replace('{count}', String(swapBalance))}
            </span>
          </div>

          {isMaster ? (
            <div style={{ padding: '30px 15px', background: 'linear-gradient(135deg, #4c1d9520, #1e1b4b40)', border: '1px solid #a78bfa40', borderRadius: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>👑</div>
              <h4 style={{ color: '#a78bfa', margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 'bold' }}>{t('roomYouAreMaster')}</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, lineHeight: '1.6' }}>
                {t('roomYouAreMasterDesc')}
              </p>
            </div>
          ) : myEntry ? (
            <div>
              <div style={{ width: '100%', height: '220px', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)' }}>
                <img src={getImageUrl(myEntry?.drive_file_id, myEntry?.file_url)} alt="My submission" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={handleImageError} />
              </div>
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${exposureColor || '#ef4444'}` }}>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>{t('roomResult')}</div><div style={{ color: '#f59e0b', fontSize: '1.5rem', fontWeight: '900' }}>{myEntry?.likes_count || 0} ⭐</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>{t('roomViews')}</div><div style={{ color: '#38bdf8', fontSize: '1.5rem', fontWeight: '900' }}>{myEntry?.views_count || 0} 👁️</div></div>
              </div>

              {myEntry?.off_topic_count > 0 && (
                <div style={{ background: 'linear-gradient(90deg, #ef444415, transparent)', borderLeft: '4px solid #ef4444', padding: '15px', borderRadius: '0 12px 12px 0', marginTop: '15px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                  <b style={{ color: '#ef4444', display: 'block', marginBottom: '4px', fontSize: '0.95rem' }}>
                    {t('roomMyOffTopicTitle')}
                  </b>
                  {t('roomMyOffTopicDesc').replace('{count}', String(myEntry.off_topic_count))}
                </div>
              )}

              {swapBalance > 0 ? (
                <div style={{ marginTop: '25px', background: 'linear-gradient(135deg, #4c1d9520, #be123c20)', padding: '20px', borderRadius: '16px', border: '1px solid #be123c50' }}>
                  <h5 style={{ margin: '0 0 10px 0', color: '#f43f5e', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>{t('roomSwapTitle')}</h5>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 15px 0', lineHeight: '1.5' }}>{t('roomSwapDesc')}</p>
                  <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleSwapFileSelect} style={{ color: '#cbd5e1', marginBottom: '15px', fontSize: '0.9rem' }} disabled={isSwapping} />
                  {swapPreview && <div style={{marginBottom: '15px', display: 'flex', justifyContent: 'center'}}><img src={swapPreview} alt="Swap preview" style={{maxHeight: '120px', borderRadius: '8px', border: '2px solid #e11d48'}} /></div>}
                  <button onClick={handleSwapSubmit} disabled={!swapPreview || isSwapping} style={{ width: '100%', background: !swapPreview ? '#334155' : 'linear-gradient(135deg, #e11d48, #be123c)', color: !swapPreview ? '#94a3b8' : 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: !swapPreview ? 'not-allowed' : 'pointer' }}>
                    {isSwapping ? t('roomSwappingInProgress') : t('roomSwapBrowseBtn')}
                  </button>

                  <div style={{ marginTop: '18px', borderTop: '1px solid #be123c40', paddingTop: '15px', textAlign: 'center' }}>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 10px 0' }}>{t('roomOrUseAlbum')}</p>
                    <button 
                      disabled={isSwapping || isLoadingSwapAlbum}
                      onClick={onOpenAlbumForSwap}
                      style={{ width: '100%', background: '#1e293b', border: '1px solid #f43f5e', color: '#f43f5e', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}
                    >
                      {isLoadingSwapAlbum ? t('roomLoadingGallery') : t('roomSwapGalleryBtn')}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '25px', background: '#0f172a', padding: '15px', borderRadius: '12px', color: '#64748b', fontSize: '0.9rem', textAlign: 'center', border: '1px dashed #475569' }}>
                  {t('roomNoSwapsLeft')}
                </div>
              )}

              {safePastEntries.length > 0 && (
                <div style={{ marginTop: '25px', borderTop: '1px dashed #334155', paddingTop: '20px' }}>
                  <h5 style={{ margin: '0 0 12px 0', color: '#38bdf8', fontSize: '1.05rem' }}>{t('roomPastEntriesTitle')}</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {safePastEntries.map((past, pIdx) => (
                      <div key={pIdx} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '8px', borderRadius: '12px', border: '1px solid #1e293b' }}>
                        <img src={getImageUrl(past?.drive_file_id, past?.file_url)} alt="Past entry" style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '6px' }} onError={handleImageError} />
                        <div style={{ flex: 1, marginLeft: '10px' }}>
                          <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{t('roomPastSavedScore')}</div>
                          <div style={{ fontSize: '0.9rem', color: '#fbbf24', fontWeight: 'bold' }}>{past?.likes_count || 0} ⭐ <span style={{ color: '#64748b', fontWeight: 'normal', fontSize: '0.75rem' }}>({past?.views_count || 0} 👁️)</span></div>
                        </div>
                        <button 
                          onClick={() => handleSwapBackSubmit(past.id)}
                          disabled={swapBalance < 1}
                          style={{ background: swapBalance < 1 ? '#1e293b' : 'linear-gradient(135deg, #0284c7, #0369a1)', color: swapBalance < 1 ? '#475569' : 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: swapBalance < 1 ? 'not-allowed' : 'pointer' }}
                        >
                          {t('roomReactivateBtn')}
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
                <button onClick={handleUpload} disabled={!uploadPreview || isUploading} style={{ width: '100%', background: (!uploadPreview || isUploading) ? '#334155' : 'linear-gradient(135deg, #0ea5e9, #2563eb)', color: (!uploadPreview || isUploading) ? '#94a3b8' : 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  {isUploading ? t('roomUploadingInProgress') : t('roomUploadSubmitBtn')}
                </button>

                <div style={{ marginTop: '15px', borderTop: '1px solid #334155', paddingTop: '15px', textAlign: 'center' }}>
                  <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 10px 0' }}>{t('roomOrChooseAlbumUpload')}</p>
                  <button 
                    disabled={isUploading || isLoadingSwapAlbum}
                    onClick={onOpenAlbumForUpload}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #14b8a6', color: '#14b8a6', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    {t('roomChooseGalleryUploadBtn')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* KLUBOK CSATÁJA */}
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #10b981', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, color: '#10b981', fontSize: '1.4rem' }}>{t('roomClubLeague')}</h3>
            <span style={{ fontSize: '0.8rem', background: '#ef4444', color: 'white', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold', boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)' }}>{t('roomLiveBadge')}</span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>{t('roomClubLeagueDesc')}</p>
          
          {safeClubLeaderboard.length === 0 ? <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px', background: '#0f172a', borderRadius: '16px' }}>{t('roomNoClubsYet')}</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {safeClubLeaderboard.map((club, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: '1px solid #059669', padding: '12px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '900', width: '35px', color: index === 0 ? '#fbbf24' : '#cbd5e1', textAlign: 'center' }}>{index + 1}.</div>
                  <div style={{ flex: 1, marginLeft: '10px' }}>
                    <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>{club?.club_name || 'Unknown Club'}</div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{club?.members_counted || 0} {t('roomActiveMembers')}</div>
                  </div>
                  <div style={{ color: '#10b981', fontWeight: '900', fontSize: '1.4rem' }}>{club?.total_score || 0} ⭐</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* VAK TOPLISTA */}
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #f59e0b', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#f59e0b', fontSize: '1.4rem' }}>{t('roomBlindLeaderboard')}</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>{t('roomBlindLeaderboardDesc')}</p>
          
          {safeLeaderboard.length === 0 ? <div style={{ color: '#94a3b8', textAlign: 'center', padding: '30px', background: '#0f172a', borderRadius: '16px' }}>{t('roomArenaEmpty')}</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[...safeLeaderboard].sort((a, b) => {
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
                      <img src={getImageUrl(entry?.drive_file_id, entry?.file_url)} alt="Top entry" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isMe ? 'none' : 'blur(6px) contrast(120%) saturation(150%)', transform: isMe ? 'none' : 'scale(1.2)' }} onError={handleImageError} />
                      {!isMe && (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '1.5rem', opacity: 0.8 }}>🔒</span>
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: isMe ? '#f8fafc' : '#94a3b8', fontWeight: 'bold', fontStyle: isMe ? 'normal' : 'italic', fontSize: '1.05rem' }}>
                        {isMe ? (entry?.user_name || t('roomMe')) : t('roomEncryptedOpponent')}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('roomViews')}: {entry?.views_count || 0}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: isMe ? '#f97316' : '#94a3b8', fontWeight: '900', fontSize: '1.5rem' }}>{entry?.likes_count || 0} ⭐</div>
                    </div>
                  </div>
                );
              }).slice(0, 15)}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
