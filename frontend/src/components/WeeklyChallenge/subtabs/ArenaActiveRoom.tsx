import React, { useState, useMemo, useEffect, useRef } from 'react';
import { getImageUrl } from '../../../utils/helpers';
import { BACKEND_URL } from '../../../utils/constants';

import { useLanguage } from '../../../context/LanguageContext';

function ActiveRoomCountdown({ endDate, lang }: { endDate: string; lang: string }) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (!endDate) return;
    
    const standardized = String(endDate).replace(' ', 'T').split('.')[0];
    const targetMillis = new Date(standardized).getTime();

    const updateTextDirectly = () => {
      if (!elementRef.current) return;

      const now = new Date().getTime();
      const difference = targetMillis - now;

      if (difference <= 0) {
        elementRef.current.innerText = t('roomMatchClosed');
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
  }, [endDate, lang, t]);

  return (
    <div style={{ 
      width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
      background: '#f59e0b10', padding: '10px 14px', borderRadius: '10px', 
      border: '1px solid #f59e0b30', boxSizing: 'border-box', zIndex: 1
    }}>
      <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold', letterSpacing: '0.5px' }}>
        {t('roomTimeLeftLabel')}
      </span>
      <span ref={elementRef} style={{ color: '#fff', fontFamily: 'monospace', fontSize: '1rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>---</span>
    </div>
  );
}

interface ArenaActiveRoomProps {
  topic: any; timeLeft: string; isMaster: boolean; exposureColor: string; exposurePercentage: number; exposureLabel: string;
  myEntry: any; voteEntry: any; noMoreEntries: boolean; masterVotesLeft: number; userPower: any; swapBalance: number;
  myPastEntries: any[]; leaderboard: any[]; currentClubLeaderboard: any[]; user: any; isUploading: boolean; uploadPreview: string | null;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void; handleUpload: () => void; isLoadingSwapAlbum: boolean; isSwapping: boolean;
  swapPreview: string | null; deleteEntry?: any; handleSwapFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void; handleSwapSubmit: () => void;
  onOpenAlbumForUpload: () => void; onOpenAlbumForSwap: () => void; handleVote: (type: 'pass' | 'super' | 'brilliant' | 'master') => void;
  handleOffTopicReport: (id: number) => void; handleSwapBackSubmit: (id: number) => void; setFullscreenData: (data: any) => void;
  handleImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  fetchCurrentTopic: (isSilent?: boolean) => Promise<void>;
}

export default function ArenaActiveRoom({
  topic, timeLeft, isMaster, exposureColor, exposurePercentage, exposureLabel,
  myEntry, voteEntry, noMoreEntries, masterVotesLeft, userPower, swapBalance,
  myPastEntries, leaderboard, currentClubLeaderboard, user, isUploading, uploadPreview,
  isLoadingSwapAlbum, isSwapping, swapPreview, onOpenAlbumForUpload, onOpenAlbumForSwap,
  handleVote, handleOffTopicReport, handleSwapBackSubmit, setFullscreenData, handleImageError,
  fetchCurrentTopic
}: ArenaActiveRoomProps) {

  const { t, lang } = useLanguage();
  const [pendingVotes, setPendingVotes] = useState<Record<number, 'pass' | 'super' | 'brilliant' | 'master'>>({});
  const [selectedExifPhoto, setSelectedExifPhoto] = useState<any | null>(null);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];
  const safeClubLeaderboard = Array.isArray(currentClubLeaderboard) ? currentClubLeaderboard : [];
  const safePastEntries = Array.isArray(myPastEntries) ? myPastEntries : [];
  const safeUserPower = userPower || { super: 1, brilliant: 2 };

  const batchVoteEntries = useMemo(() => {
    const eligibleEntries = safeLeaderboard.filter(item => {
      const isOwnPhoto = item.user_email === user?.email;
      const alreadyVoted = item.has_user_voted === 1 || item.has_user_voted === true || item.has_user_voted === '1';
      return !isOwnPhoto && !alreadyVoted;
    });
    
    return eligibleEntries.slice(0, 10).map(item => {
      const isLegacyPhoto = !item.camera && !item.software && !item.shutter;
      const isAiFlagged = item.software && (item.software.toLowerCase().includes('midjourney') || item.software.toLowerCase().includes('stable'));
      const isAiSuspect = !isLegacyPhoto && (!!isAiFlagged || (!item.camera && !item.shutter));

      return {
        ...item,
        file_url: getImageUrl(item.drive_file_id, item.file_url),
        exif: {
          camera: item.camera || '-',
          lens: item.lens || '-',
          shutter: item.shutter || '-',
          iso: item.iso || '-',
          aperture: item.aperture || '-',
          software: item.software || '-',
          isLegacy: isLegacyPhoto,
          isAiSuspect: isAiSuspect
        }
      };
    });
  }, [safeLeaderboard, user?.email]);

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

  const handleBatchSubmit = async () => {
    const totalVoted = Object.keys(pendingVotes).length;
    if (totalVoted < batchVoteEntries.length) {
      alert(t('roomBatchAlertError').replace('{count}', String(batchVoteEntries.length)));
      return;
    }

    setIsSubmittingBatch(true);
    try {
      const votePromises = Object.entries(pendingVotes).map(([entryId, type]) => {
        return fetch(`${BACKEND_URL}/api/weekly/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entryId: Number(entryId), userEmail: user?.email, voteType: type })
        });
      });

      await Promise.all(votePromises);
      alert(t('roomBatchAlertSuccess'));
      setPendingVotes({});
      await fetchCurrentTopic(true);
    } catch (e) {
      console.error(e);
      alert(t('msgNetworkError'));
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  return (
    <div className="arena-main-layout-grid">
      
      {/* 🏛️ BAL HASÁB: FŐ TARTALOM */}
      <div className="arena-layout-column-main">
        <div className="arena-responsive-card" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '30px', borderRadius: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '8rem', opacity: 0.05 }}>🔥</div>
          <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '1.8rem', textAlign: 'center', zIndex: 1 }}>
            <span>{displayRoomTitle}</span>
          </h3>
          <p style={{ margin: '0 0 20px 0', color: '#cbd5e1', fontSize: '0.95rem', textAlign: 'center', lineHeight: '1.6' }}>{displayRoomDesc}</p>
          <ActiveRoomCountdown endDate={topic?.end_date} lang={lang} />
        </div>

        {/* BATCH EVALUATION PULT */}
        <div className="arena-responsive-card" style={{ background: '#1e293b', padding: '25px 20px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 15px 35px rgba(0,0,0,0.4)', boxSizing: 'border-box' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderLeft: '4px solid #38bdf8', padding: '15px', borderRadius: '0 12px 12px 0', marginBottom: '25px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
            <strong style={{ color: '#38bdf8', display: 'block', marginBottom: '4px', fontSize: '0.95rem' }}>{t('roomExifShieldTitle')}</strong>
            {t('roomExifShieldDesc')}
          </div>
          <h3 style={{ margin: '0 0 5px 0', color: '#f8fafc', fontSize: '1.6rem', fontWeight: '900' }}>{t('roomBatchTitle')}</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 25px 0' }}>{t('roomBatchDesc')}</p>

          {(!myEntry && !isMaster) ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: '#0f172a', borderRadius: '16px', border: '2px dashed #fb923c' }}>
              <h4 style={{ color: '#fb923c', margin: '0 0 10px 0', fontWeight: 'bold' }}>{t('roomNoVoteRight')}</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>{t('roomNoVoteRightDesc')}</p>
            </div>
          ) : batchVoteEntries.length === 0 ? (
            <div style={{ padding: '50px 20px', textAlign: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '16px', border: '1px solid #10b981' }}>
              <h4 style={{ color: '#10b981', margin: '0 0 10px 0' }}>{t('roomAllVoted')}</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>{t('roomAllVotedDesc')}</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {batchVoteEntries.map((entry, index) => {
                  const selectedVote = pendingVotes[entry.id];
                  return (
                    <div key={entry.id} style={{ background: '#0f172a', padding: '20px', borderRadius: '20px', border: selectedVote ? '1px solid #10b98150' : '1px solid #232f46', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '15px', left: '15px', background: selectedVote ? '#10b981' : '#334155', color: 'white', padding: '4px 12px', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 5 }}>
                        #{index + 1}
                      </div>
                      <div className="batch-vote-responsive-card">
                        <div onClick={() => setSelectedExifPhoto(entry)} className="batch-vote-responsive-imgbox">
                          <img src={entry.file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleImageError} loading="lazy" />
                          <div style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', color: 'white' }}>{t('roomZoomLabel')}</div>
                        </div>
                        <div className="batch-vote-responsive-content">
                          <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.4', width: '100%' }}>
                            {entry.exif?.isLegacy ? (
                              <div style={{ background: '#f59e0b15', color: '#fbbf24', padding: '4px 10px', borderRadius: '6px', border: '1px solid #fbbf2430', fontWeight: 'bold', marginBottom: '8px', display: 'inline-block' }}>{t('roomLegacyPhoto')}</div>
                            ) : entry.exif?.isAiSuspect ? (
                              <div style={{ background: '#ef444415', color: '#f87171', padding: '4px 10px', borderRadius: '6px', border: '1px solid #ef444430', fontWeight: 'bold', marginBottom: '8px', display: 'inline-block' }}>{t('roomAiSuspect')}</div>
                            ) : null}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 15px', color: '#94a3b8', width: '100%' }}>
                              <div> {t('mapExifCamera')} <b style={{ color: entry.exif?.isLegacy ? '#475569' : '#f8fafc', display: 'block', overflowWrap: 'break-word' }}>{entry.exif?.camera}</b></div>
                              <div> {t('mapExifLens')} <b style={{ color: entry.exif?.isLegacy ? '#475569' : '#f8fafc', display: 'block', overflowWrap: 'break-word' }}>{entry.exif?.lens}</b></div>
                              <div> {t('roomShutterIso')} <b style={{ color: entry.exif?.isLegacy ? '#475569' : '#38bdf8', display: 'block' }}>{entry.exif?.shutter} / {entry.exif?.iso}</b></div>
                              <div> {t('roomSoftware')} <b style={{ color: entry.exif?.isLegacy ? '#475569' : '#a78bfa', display: 'block', overflowWrap: 'break-word' }}>{entry.exif?.software}</b></div>
                            </div>
                          </div>
                          <div className="batch-vote-responsive-buttons">
                            {[
                              { type: 'pass', label: t('roomVotePass').split(' ')[0], score: '0 pont', bg: '#334155' },
                              { type: 'super', label: t('roomVoteSuper'), score: `+${safeUserPower.super} pont`, bg: '#1e3a8a' },
                              { type: 'brilliant', label: t('roomVoteBrilliant'), score: `+${safeUserPower.brilliant} pont`, bg: '#f97316' },
                              ...(isMaster ? [{ type: 'master', label: t('statusMaster'), score: '+10 pont', bg: '#fbbf24' }] : [])
                            ].map(btn => {
                              const isCurrentActive = selectedVote === btn.type;
                              return (
                                <button key={btn.type} onClick={() => setPendingVotes(prev => ({ ...prev, [entry.id]: btn.type as any }))} style={{ padding: '6px 10px', borderRadius: '10px', border: isCurrentActive ? `2px solid white` : '1px solid #334155', background: isCurrentActive ? btn.bg : 'transparent', color: isCurrentActive ? 'white' : '#94a3b8', fontWeight: 'bold', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '80px', flex: '1 1 calc(33.33% - 8px)', transition: 'all 0.1s' }}>
                                  <span>{btn.label}</span>
                                  <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{btn.score}</span>
                                </button>
                              );
                            })}
                            <button onClick={() => handleOffTopicReport(entry.id)} style={{ padding: '6px 10px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'transparent', color: '#ef4444', fontWeight: 'bold', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '80px', flex: '1 1 calc(100% - 8px)' }}>
                              <span>{t('roomReportBtn').split(' ')[0]}</span>
                              <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>AI / Off-Topic</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: '35px', borderTop: '1px solid #334155', paddingTop: '25px', textAlign: 'center' }}>
                <button onClick={handleBatchSubmit} disabled={isSubmittingBatch || Object.keys(pendingVotes).length < batchVoteEntries.length} style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: Object.keys(pendingVotes).length === batchVoteEntries.length ? 'linear-gradient(135deg, #10b981, #059669)' : '#334155', color: Object.keys(pendingVotes).length === batchVoteEntries.length ? 'white' : '#64748b', fontSize: '1.2rem', fontWeight: '900', cursor: Object.keys(pendingVotes).length === batchVoteEntries.length ? 'pointer' : 'not-allowed', boxShadow: Object.keys(pendingVotes).length === batchVoteEntries.length ? '0 10px 25px rgba(16,185,129,0.3)' : 'none', transition: 'all 0.3s' }}>
                  {isSubmittingBatch ? '⏳ Processing...' : `${t('roomBatchSubmitBtn')} (${Object.keys(pendingVotes).length} / ${batchVoteEntries.length})`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 🎚️ JOBB HASÁB: STATISZTIKÁK ÉS RANGSOROK */}
      <div className="arena-layout-column-side">
        
        {/* SAJÁT NEVEZÉS SZEKCIÓ */}
        <div className="arena-responsive-card" style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.4rem', fontWeight: 'bold' }}>📸 {t('roomMyEntry')}</h3>
            <span style={{ fontSize: '0.85rem', background: '#be123c30', color: '#fb7185', border: '1px solid #be123c60', padding: '4px 12px', borderRadius: '50px', fontWeight: 'bold' }}>
              {t('roomJokerSwaps').replace('{count}', String(swapBalance))}
            </span>
          </div>

          {isMaster ? (
            <div style={{ padding: '30px 15px', background: 'linear-gradient(135deg, #4c1d9520, #1e1b4b40)', border: '1px solid #a78bfa40', borderRadius: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>👑</div>
              <h4 style={{ color: '#a78bfa', margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 'bold' }}>{t('roomYouAreMaster')}</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, lineHeight: '1.6' }}>{t('roomYouAreMasterDesc')}</p>
            </div>
          ) : myEntry ? (
            <div>
              <div style={{ width: '100%', height: '220px', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)' }}>
                <img src={getImageUrl(myEntry?.drive_file_id, myEntry?.file_url)} alt="My submission" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={handleImageError} />
              </div>
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${exposureColor || '#ef4444'}` }}>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#f59e0b', fontSize: '1.5rem', fontWeight: '900' }}>{myEntry?.likes_count || 0} ⭐</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#38bdf8', fontSize: '1.5rem', fontWeight: '900' }}>{myEntry?.views_count || 0} 👁️</div></div>
              </div>

              {swapBalance > 0 ? (
                <div style={{ marginTop: '25px', background: 'linear-gradient(145deg, #4c1d9515, #be123c15)', padding: '20px', borderRadius: '18px', border: '1px solid #be123c30', textAlign: 'center' }}>
                  <h5 style={{ margin: '0 0 8px 0', color: '#f43f5e', fontSize: '1.1rem', fontWeight: 'bold' }}>{t('roomSwapTitle')}</h5>
                  <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '0 0 15px 0', lineHeight: '1.4' }}>{t('roomSwapDesc')}</p>
                  <button disabled={isSwapping || isLoadingSwapAlbum} onClick={onOpenAlbumForSwap} style={{ width: '100%', maxWidth: '280px', margin: '0 auto', background: 'linear-gradient(135deg, #e11d48, #be123c)', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(225,29,72,0.2)', display: 'block' }}>
                    🔄 {t('roomSwapGalleryBtn')}
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: '25px', background: '#0f172a', padding: '15px', borderRadius: '12px', color: '#64748b', fontSize: '0.9rem', textAlign: 'center', border: '1px dashed #475569' }}>{t('roomNoSwapsLeft')}</div>
              )}

              {safePastEntries.length > 0 && (
                <div style={{ marginTop: '25px', borderTop: '1px dashed #334155', paddingTop: '20px' }}>
                  <h5 style={{ margin: '0 0 12px 0', color: '#38bdf8', fontSize: '1.05rem' }}>{t('roomPastEntriesTitle')}</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {safePastEntries.map((past, pIdx) => (
                      <div key={pIdx} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '8px', borderRadius: '12px' }}>
                        <img src={getImageUrl(past?.drive_file_id, past?.file_url)} alt="" style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '6px' }} />
                        <div style={{ flex: 1, marginLeft: '10px' }}>
                          <div style={{ fontSize: '0.9rem', color: '#fbbf24', fontWeight: 'bold' }}>{past?.likes_count || 0} ⭐</div>
                        </div>
                        <button onClick={() => handleSwapBackSubmit(past.id || past._id)} disabled={swapBalance < 1} style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>{t('roomReactivateBtn')}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* 📸 PRÉMIUM KEZDŐ KÁRTYA (Esztétikus méretre húzva) */
            <div style={{ background: '#0f172a', padding: '35px 20px', borderRadius: '20px', border: '1px dashed #38bdf840', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🏆</div>
              <h4 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '1.3rem', fontWeight: 'bold' }}>
                {t('roomJoinChallenge')}
              </h4>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 25px 0', lineHeight: '1.5' }}>
                {t('roomJoinDesc')}
              </p>
              {/* 🎯 JAVÍTVA: Szép, arányos asztali méretet kapott, nem nyúlik el mint a rétestészta */}
              <button disabled={isLoadingSwapAlbum} onClick={onOpenAlbumForUpload} style={{ width: '100%', maxWidth: '280px', margin: '0 auto', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(37,99,235,0.25)', transition: 'all 0.2s', display: 'block' }}>
                ✨ {t('btnEntry')}
              </button>
            </div>
          )}
        </div>

        {!isMaster && (
          <div className="arena-responsive-card" style={{ background: '#0f172a', padding: '25px 20px', borderRadius: '24px', border: `1px solid ${exposureColor || '#ef4444'}30`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ fontSize: '1.8rem', color: exposureColor }}>👁️‍🗨️</div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Láthatósági Index</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f8fafc' }}>{getTranslatedExposureLabel(exposureLabel)}</div>
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: exposureColor }}>{Math.round(exposurePercentage || 0)}%</div>
          </div>
        )}

        {/* KLUBOK CSATÁJA RANGSOR */}
        <div className="arena-responsive-card" style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #1e293b', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#10b981', fontSize: '1.3rem', fontWeight: 'bold' }}>🛡️ {t('roomClubLeague')}</h3>
            <span style={{ fontSize: '0.75rem', background: '#ef4444', color: 'white', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold' }}>{t('roomLiveBadge')}</span>
          </div>
          {safeClubLeaderboard.length === 0 ? <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px', background: '#0f172a', borderRadius: '16px' }}>{t('roomNoClubsYet')}</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {safeClubLeaderboard.map((club, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '12px', borderRadius: '12px', border: '1px solid #223147' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: '900', width: '25px', color: index === 0 ? '#fbbf24' : '#cbd5e1', textAlign: 'center' }}>{index + 1}</div>
                  <div style={{ flex: 1, marginLeft: '10px', minWidth: 0 }}>
                    <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{club?.club_name || 'Unknown Club'}</div>
                  </div>
                  <div style={{ color: '#10b981', fontWeight: '900', fontSize: '1.1rem' }}>{club?.total_score || 0} FP</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* VAK TOPLISTA MEGJELENÍTŐ */}
        <div className="arena-responsive-card" style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #1e293b', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#f59e0b', fontSize: '1.3rem', fontWeight: 'bold' }}>📊 {t('roomBlindLeaderboard')}</h3>
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 15px 0', lineHeight: '1.4' }}>{t('roomBlindLeaderboardDesc')}</p>
          {safeLeaderboard.length === 0 ? <div style={{ color: '#94a3b8', textAlign: 'center', padding: '30px', background: '#0f172a', borderRadius: '16px' }}>{t('roomArenaEmpty')}</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[...safeLeaderboard].sort((a, b) => (b.fair_score || b.likes_count || 0) - (a.fair_score || a.likes_count || 0)).map((entry, index) => {
                const isMe = entry?.user_email === user?.email;
                const showUnblinded = isMe || isMaster; 
                const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#cd7f32' : '#475569';
                return (
                  <div key={entry?.id || index} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: isMe ? '1px solid #f59e0b50' : '1px solid #223147', padding: '10px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: '900', width: '25px', color: rankColor, textAlign: 'center' }}>{index + 1}</div>
                    <div onClick={() => showUnblinded ? setFullscreenData({url: getImageUrl(entry?.drive_file_id, entry?.file_url), title: entry?.user_name || ''}) : null} style={{ width: '40px', height: '40px', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', margin: '0 10px', cursor: showUnblinded ? 'zoom-in' : 'default', position: 'relative' }}>
                      <img src={getImageUrl(entry?.drive_file_id, entry?.file_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: showUnblinded ? 'none' : 'blur(4px)' }} onError={handleImageError} loading="lazy" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: isMe ? '#f8fafc' : '#94a3b8', fontWeight: 'bold', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{showUnblinded ? (entry?.user_name || '') : t('roomEncryptedOpponent')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: isMe ? '#f97316' : '#fbbf24' }}>{entry.fair_score !== undefined ? `${entry.fair_score} FP` : `${entry.likes_count || 0} ⭐`}</div>
                    </div>
                  </div>
                );
              }).slice(0, 5)}
            </div>
          )}
        </div>
      </div>

      {/* INSPECTOR MODÁL */}
      {selectedExifPhoto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,13,22,0.96)', backdropFilter: 'blur(20px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#1e293b', width: '100%', maxWidth: '1000px', maxHeight: '90vh', borderRadius: '24px', border: '1px solid #475569', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, color: 'white', fontSize: '1.3rem', fontWeight: 'bold' }}>🔎 {t('roomInspectorTitle')}</h4>
              <button onClick={() => setSelectedExifPhoto(null)} style={{ background: '#334155', color: '#cbd5e1', border: 'none', width: '36px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ flex: 1, backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src={selectedExifPhoto.file_url} alt="" style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain' }} loading="lazy" />
            </div>
          </div>
        </div>
      )}

      {/* ── 🎯 ASZTALI BENTO GRID STYLING LAYER ── */}
      <style>{`
        .arena-main-layout-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 30px;
          width: 100%;
          box-sizing: border-box;
        }
        .arena-layout-column-main {
          display: flex;
          flex-direction: column;
          gap: 25px;
          width: 100%;
        }
        .arena-layout-column-side {
          display: flex;
          flex-direction: column;
          gap: 25px;
          width: 100%;
        }
        @media (min-width: 992px) {
          .arena-main-layout-grid {
            grid-template-columns: 1.5fr 1fr !important;
          }
        }
        .batch-vote-responsive-card {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 20px;
          align-items: start;
        }
        .batch-vote-responsive-imgbox {
          width: 140px;
          height: 140px;
          background-color: #000;
          border-radius: 12px;
          overflow: hidden;
          cursor: zoom-in;
          border: 1px solid #334155;
          position: relative;
        }
        .batch-vote-responsive-content {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 140px;
        }
        .batch-vote-responsive-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 12px;
        }
      `}</style>
    </div>
  );
}
