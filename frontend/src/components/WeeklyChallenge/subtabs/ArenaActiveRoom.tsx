import React, { useState, useMemo, useEffect, useRef } from 'react';
import { getImageUrl } from '../../../utils/helpers';
import { BACKEND_URL } from '../../../utils/constants';

import { useLanguage } from '../../../context/LanguageContext';

import { 
  Clock, 
  Flame, 
  Crown, 
  Eye, 
  Star, 
  RefreshCw, 
  X, 
  ZoomIn, 
  AlertTriangle, 
  Camera, 
  Cpu, 
  Trophy, 
  Award, 
  Check, 
  AlertCircle, 
  Zap, 
  Sparkles,
  Layers,
  Sliders,
  BarChart3,
  Info
} from 'lucide-react';

// ====================================================================
// 🕒 1. VISSZASZÁMLÁLÓ KOMPONENS (REAKTÍV SZÍNEKKEL)
// ====================================================================
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
      background: 'rgba(245,158,11,0.05)', padding: '10px 14px', borderRadius: '6px', 
      border: '1px solid rgba(245,158,11,0.2)', boxSizing: 'border-box', zIndex: 1
    }}>
      <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 'bold', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Clock size={12} /> {t('roomTimeLeftLabel')}
      </span>
      {/* 🎯 JAVÍTVA: color #fff lecserélve var(--text-title)-re */}
      <span ref={elementRef} style={{ color: 'var(--text-title)', fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>---</span>
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
      
      {/* 🏛️ BAL HASÁB: FŐ EVALUÁCIÓS PANEL */}
      <div className="arena-layout-column-main">
        {/* 🎯 JAVÍTVA: Fix hátterek és színek reaktív változókra cserélve */}
        <div className="arena-responsive-card" style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', position: 'relative' }}>
          <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-title)', fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.3px', textAlign: 'center' }}>
            <span>{displayRoomTitle}</span>
          </h3>
          <p style={{ margin: '0 0 14px 0', color: 'var(--text-body)', fontSize: '0.88rem', textAlign: 'center', lineHeight: '1.5' }}>{displayRoomDesc}</p>
          
          {(topic?.master_name || topic?.master_email) && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#a78bfa', fontSize: '0.78rem', fontWeight: 'bold', background: 'rgba(167,139,250,0.06)', padding: '5px 12px', borderRadius: '4px', border: '1px solid rgba(167,139,250,0.2)', marginBottom: '16px', whiteSpace: 'nowrap' }}>
              <Crown size={12} />
              <span>{t('viewMasterLabel') || 'Képmester:'}</span>
              <span style={{ color: 'var(--text-title)' }}>{topic.master_name || topic.master_email}</span>
            </div>
          )}

          <ActiveRoomCountdown endDate={topic?.end_date} lang={lang} />
        </div>

        {/* BATCH EVALUATION PULT */}
        <div className="arena-responsive-card" style={{ background: 'var(--bg-card)', padding: '22px 18px', borderRadius: '8px', border: '1px solid var(--border-main)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', boxSizing: 'border-box' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.04)', borderLeft: '3px solid #38bdf8', padding: '12px 14px', borderRadius: '0 4px 4px 0', marginBottom: '20px', fontSize: '0.82rem', color: 'var(--text-body)', lineHeight: '1.45' }}>
            <strong style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', fontSize: '0.88rem' }}><Sliders size={14} /> {t('roomExifShieldTitle')}</strong>
            {t('roomExifShieldDesc')}
          </div>
          <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-title)', fontSize: '1.3rem', fontWeight: '700', letterSpacing: '-0.3px' }}>{t('roomBatchTitle')}</h3>
          <p style={{ color: 'var(--text-body)', fontSize: '0.82rem', margin: '0 0 20px 0' }}>{t('roomBatchDesc')}</p>

          {(!myEntry && !isMaster) ? (
            <div style={{ padding: '30px 15px', textAlign: 'center', background: 'var(--bg-main)', borderRadius: '6px', border: '1px dashed #fb923c' }}>
              <h4 style={{ color: '#fb923c', margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><AlertCircle size={16} /> {t('roomNoVoteRight')}</h4>
              <p style={{ color: 'var(--text-body)', fontSize: '0.85rem', margin: 0 }}>{t('roomNoVoteRightDesc')}</p>
            </div>
          ) : batchVoteEntries.length === 0 ? (
            <div style={{ padding: '40px 15px', textAlign: 'center', background: 'var(--bg-main)', borderRadius: '6px', border: '1px solid #10b981' }}>
              <h4 style={{ color: '#10b981', margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Check size={16} /> {t('roomAllVoted')}</h4>
              <p style={{ color: 'var(--text-body)', fontSize: '0.85rem', margin: 0 }}>{t('roomAllVotedDesc')}</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {batchVoteEntries.map((entry, index) => {
                  const selectedVote = pendingVotes[entry.id];
                  return (
                    <div key={entry.id} style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '6px', border: selectedVote ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border-main)', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '12px', left: '12px', background: selectedVote ? '#10b981' : 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '3px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', zIndex: 5 }}>
                        #{index + 1}
                      </div>
                      <div className="batch-vote-responsive-card">
                        <div onClick={() => setSelectedExifPhoto(entry)} className="batch-vote-responsive-imgbox" style={{ borderRadius: '4px', border: '1px solid var(--border-main)' }}>
                          <img src={entry.file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleImageError} loading="lazy" />
                          <div style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'rgba(0,0,0,0.7)', padding: '3px 6px', borderRadius: '3px', fontSize: '0.62rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}><ZoomIn size={10} /> {t('roomZoomLabel')}</div>
                        </div>
                        <div className="batch-vote-responsive-content">
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-title)', lineHeight: '1.4', width: '100%' }}>
                            {entry.exif?.isLegacy ? (
                              <div style={{ background: 'rgba(245,158,11,0.08)', color: '#fbbf24', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.72rem', fontWeight: 'bold', marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Layers size={10} /> {t('roomLegacyPhoto')}</div>
                            ) : entry.exif?.isAiSuspect ? (
                              <div style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.72rem', fontWeight: 'bold', marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={10} /> {t('roomAiSuspect')}</div>
                            ) : null}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1fr, 1fr)', gap: '8px 12px', color: 'var(--text-body)', width: '100%', fontSize: '0.78rem', gridTemplateColumns: '1fr 1fr' }}>
                              <div><span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}><Camera size={10} /> {t('mapExifCamera')}</span> <b style={{ color: entry.exif?.isLegacy ? 'var(--text-muted)' : 'var(--text-title)', display: 'block', overflowWrap: 'break-word' }}>{entry.exif?.camera}</b></div>
                              <div><span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}><Cpu size={10} /> {t('mapExifLens')}</span> <b style={{ color: entry.exif?.isLegacy ? 'var(--text-muted)' : 'var(--text-title)', display: 'block', overflowWrap: 'break-word' }}>{entry.exif?.lens}</b></div>
                              <div><span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}><Sliders size={10} /> {t('roomShutterIso')}</span> <b style={{ color: entry.exif?.isLegacy ? 'var(--text-muted)' : '#38bdf8', display: 'block' }}>{entry.exif?.shutter} / {entry.exif?.iso}</b></div>
                              <div><span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}><Layers size={10} /> {t('roomSoftware')}</span> <b style={{ color: entry.exif?.isLegacy ? 'var(--text-muted)' : '#a78bfa', display: 'block', overflowWrap: 'break-word' }}>{entry.exif?.software}</b></div>
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
                                <button key={btn.type} onClick={() => setPendingVotes(prev => ({ ...prev, [entry.id]: btn.type as any }))} style={{ padding: '6px 8px', borderRadius: '4px', border: isCurrentActive ? `1px solid white` : '1px solid var(--border-main)', background: isCurrentActive ? btn.bg : 'transparent', color: isCurrentActive ? 'white' : 'var(--text-body)', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', minWidth: '75px', flex: '1 1 calc(33.33% - 6px)', transition: 'all 0.1s' }}>
                                  <span>{btn.label}</span>
                                  <span style={{ fontSize: '0.62rem', opacity: 0.5, fontWeight: 'normal' }}>{btn.score}</span>
                                </button>
                              );
                            })}
                            <button onClick={() => handleOffTopicReport(entry.id)} style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'transparent', color: '#ef4444', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', minWidth: '75px', flex: '1 1 calc(100% - 6px)' }}>
                              <span>{t('roomReportBtn').split(' ')[0]}</span>
                              <span style={{ fontSize: '0.62rem', opacity: 0.5, fontWeight: 'normal' }}>AI / Off-Topic</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-main)', paddingTop: '18px', textAlign: 'center' }}>
                <button onClick={handleBatchSubmit} disabled={isSubmittingBatch || Object.keys(pendingVotes).length < batchVoteEntries.length} style={{ width: '100%', padding: '14px', borderRadius: '6px', border: 'none', background: Object.keys(pendingVotes).length === batchVoteEntries.length ? '#10b981' : 'var(--border-main)', color: Object.keys(pendingVotes).length === batchVoteEntries.length ? 'white' : 'var(--text-muted)', fontSize: '1.05rem', fontWeight: '700', cursor: Object.keys(pendingVotes).length === batchVoteEntries.length ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
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
        <div className="arena-responsive-card" style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-main)', boxShadow: '0 4px 15px rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '1.1rem', fontWeight: '600', letterSpacing: '-0.2px' }}> {t('roomMyEntry')}</h3>
            <span style={{ fontSize: '0.75rem', background: 'rgba(225,29,72,0.08)', color: '#fb7185', border: '1px solid rgba(225,29,72,0.2)', padding: '3px 10px', borderRadius: '4px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <RefreshCw size={10} /> {swapBalance}
            </span>
          </div>

          {isMaster ? (
            <div style={{ padding: '24px 12px', background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '6px', textAlign: 'center' }}>
              <Crown size={32} color="#a78bfa" style={{ marginBottom: '8px', margin: '0 auto 8px auto' }} />
              <h4 style={{ color: '#a78bfa', margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: '600' }}>{t('roomYouAreMaster')}</h4>
              <p style={{ color: 'var(--text-body)', fontSize: '0.8rem', margin: 0, lineHeight: '1.5' }}>{t('roomYouAreMasterDesc')}</p>
            </div>
          ) : myEntry ? (
            <div>
              <div style={{ width: '100%', height: '200px', backgroundColor: 'var(--bg-main)', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-main)' }}>
                <img src={getImageUrl(myEntry?.drive_file_id, myEntry?.file_url)} alt="My submission" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={handleImageError} />
              </div>
              <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--bg-main)', padding: '12px', borderRadius: '6px', borderLeft: `3px solid ${exposureColor || '#ef4444'}`, border: '1px solid var(--border-main)' }}>
                <div style={{ textAlign: 'center', borderRight: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>Pontszám</span>
                  <div style={{ color: '#fbbf24', fontSize: '1.15rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={14} fill="#fbbf24" /> {myEntry?.likes_count || 0}</div>
                </div>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>Megtekintés</span>
                  <div style={{ color: '#38bdf8', fontSize: '1.15rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={14} /> {myEntry?.views_count || 0}</div>
                </div>
              </div>

              {swapBalance > 0 ? (
                <div style={{ marginTop: '16px', background: 'var(--hover-overlay)', padding: '14px', borderRadius: '6px', border: '1px solid var(--border-main)', textAlign: 'center' }}>
                  <h5 style={{ margin: '0 0 4px 0', color: 'var(--text-title)', fontSize: '0.9rem', fontWeight: '600' }}>{t('roomSwapTitle')}</h5>
                  <p style={{ color: 'var(--text-body)', fontSize: '0.78rem', margin: '0 0 12px 0', lineHeight: '1.4' }}>{t('roomSwapDesc')}</p>
                  <button disabled={isSwapping || isLoadingSwapAlbum} onClick={onOpenAlbumForSwap} style={{ width: '100%', background: 'var(--bg-main)', color: 'var(--text-title)', border: '1px solid var(--border-main)', padding: '10px', borderRadius: '4px', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }}>
                    <RefreshCw size={12} /> {t('roomSwapGalleryBtn')}
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: '16px', background: 'var(--bg-main)', padding: '12px', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', border: '1px dashed var(--border-main)' }}>{t('roomNoSwapsLeft')}</div>
              )}

              {safePastEntries.length > 0 && (
                <div style={{ marginTop: '20px', borderTop: '1px dashed var(--border-main)', paddingTop: '16px' }}>
                  <h5 style={{ margin: '0 0 10px 0', color: '#38bdf8', fontSize: '0.9rem', fontWeight: '600' }}>{t('roomPastEntriesTitle')}</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {safePastEntries.map((past, pIdx) => (
                      <div key={pIdx} style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-main)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-main)' }}>
                        <img src={getImageUrl(past?.drive_file_id, past?.file_url)} alt="" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
                        <div style={{ flex: 1, marginLeft: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                          <span style={{ color: '#fbbf24', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Star size={10} fill="#fbbf24" /> {past?.likes_count || 0}</span>
                          <span style={{ color: 'var(--border-main)' }}>|</span>
                          <span style={{ color: '#38bdf8', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Eye size={10} /> {past?.views_count || 0}</span>
                        </div>
                        <button 
                          onClick={() => handleSwapBackSubmit(past.id || past._id)} 
                          disabled={swapBalance < 1} 
                          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
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
            <div style={{ background: 'var(--bg-main)', padding: '24px 16px', borderRadius: '6px', border: '1px dashed var(--border-main)', textAlign: 'center' }}>
              <Trophy size={28} color="var(--text-muted)" style={{ marginBottom: '10px', margin: '0 auto 10px auto' }} />
              <h4 style={{ color: 'var(--text-title)', margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: '600' }}>
                {t('roomJoinChallenge')}
              </h4>
              <p style={{ color: 'var(--text-body)', fontSize: '0.8rem', margin: '0 0 16px 0', lineHeight: '1.45' }}>
                {t('roomJoinDesc')}
              </p>
              <button disabled={isLoadingSwapAlbum} onClick={onOpenAlbumForUpload} style={{ width: '100%', background: '#f97316', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }}>
                <Sparkles size={14} /> {t('btnEntry')}
              </button>
            </div>
          )}
        </div>

        {/* LÁTHATÓSÁGI INDEX MÉRŐÓRA */}
        {!isMaster && (
          <div className="arena-responsive-card" style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Láthatósági Index</h4>
            <div style={{ position: 'relative', width: '100%', maxWidth: '160px', height: '95px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <svg viewBox="0 0 200 120" style={{ width: '100%', height: 'auto', display: 'block' }}>
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--bg-main)" strokeWidth="14" strokeLinecap="round" />
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={exposureColor || '#ef4444'} strokeWidth="14" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - (exposurePercentage || 0)} style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
              </svg>
              <div style={{ position: 'absolute', bottom: '5px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-title)', letterSpacing: '-0.5px' }}>{Math.round(exposurePercentage || 0)}%</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 'bold', color: exposureColor, textTransform: 'uppercase', marginTop: '1px' }}>{getTranslatedExposureLabel(exposureLabel)}</div>
              </div>
            </div>
          </div>
        )}

        {/* KLUBOK CSATÁJA RANGSOR */}
        <div className="arena-responsive-card" style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-main)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, color: '#10b981', fontSize: '1.05rem', fontWeight: '600', letterSpacing: '-0.2px' }}> {t('roomClubLeague')}</h3>
            <span style={{ fontSize: '0.68rem', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('roomLiveBadge')}</span>
          </div>
          {safeClubLeaderboard.length === 0 ? <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '16px', background: 'var(--bg-main)', borderRadius: '6px', fontSize: '0.8rem', fontStyle: 'italic' }}>{t('roomNoClubsYet')}</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {safeClubLeaderboard.map((club, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-main)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-main)' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', width: '20px', color: index === 0 ? '#fbbf24' : 'var(--text-muted)', textAlign: 'left' }}>{index + 1}</div>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                    <div style={{ color: 'var(--text-title)', fontWeight: '600', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{club?.club_name || 'Unknown Club'}</div>
                  </div>
                  <div style={{ color: '#10b981', fontWeight: '700', fontSize: '0.9rem' }}>{club?.total_score || 0} FP</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* VAK TOPLISTA MEGJELENÍTŐ */}
        <div className="arena-responsive-card" style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-main)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 3px 0', color: '#f59e0b', fontSize: '1.05rem', fontWeight: '600', letterSpacing: '-0.2px', display: 'flex', alignItems: 'center', gap: '6px' }}><BarChart3 size={14} /> {t('roomBlindLeaderboard')}</h3>
          <p style={{ color: 'var(--text-body)', fontSize: '0.78rem', margin: '0 0 14px 0', lineHeight: '1.4' }}>{t('roomBlindLeaderboardDesc')}</p>
          {safeLeaderboard.length === 0 ? <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px', background: 'var(--bg-main)', borderRadius: '6px', fontSize: '0.8rem', fontStyle: 'italic' }}>{t('roomArenaEmpty')}</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[...safeLeaderboard].sort((a, b) => {
                const scoreA = Number(a.fair_score || a.likes_count || 0);
                const scoreB = Number(b.fair_score || b.likes_count || 0);
                return scoreB - scoreA;
              }).map((actTop, index) => {
                const isMe = actTop?.user_email === user?.email;
                return (
                  <div key={actTop.id || index} style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-main)', padding: '8px 12px', borderRadius: '6px', border: isMe ? '1px solid rgba(245,158,11,0.3)' : '1px solid var(--border-main)' }}>
                    <div style={{ width: '22px', display: 'flex', alignItems: 'center' }}>
                      {index === 0 ? <Crown size={12} color="#fbbf24" fill="#fbbf24" /> :
                       index === 1 ? <Trophy size={12} color="var(--text-body)" /> :
                       index === 2 ? <Trophy size={12} color="#b45309" /> :
                       <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>{index + 1}</span>}
                    </div>
                    <div onClick={() => (actTop.user_email === user?.email || isMaster) ? setFullscreenData({url: getImageUrl(actTop?.drive_file_id, actTop?.file_url), title: actTop?.user_name || ''}) : null} style={{ width: '32px', height: '32px', backgroundColor: '#000', borderRadius: '4px', overflow: 'hidden', margin: '0 10px', cursor: (actTop.user_email === user?.email || isMaster) ? 'zoom-in' : 'default', position: 'relative', flexShrink: 0, border: '1px solid var(--border-main)' }}>
                      <img src={getImageUrl(actTop?.drive_file_id, actTop?.file_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: (actTop.user_email === user?.email || isMaster) ? 'none' : 'blur(5px)' }} onError={handleImageError} loading="lazy" />
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0, paddingRight: '6px' }}>
                      <div style={{ color: isMe ? 'var(--text-title)' : 'var(--text-body)', fontWeight: '600', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{(actTop.user_email === user?.email || isMaster) ? (actTop?.user_name || '') : t('roomEncryptedOpponent')}</span>
                        {Number(actTop?.has_master_vote) > 0 && (
                          <span title={lang === 'en' ? 'Received a Master Vote!' : 'Képmesteri szavazatot kapott!'} style={{ background: '#be123c', color: 'white', fontSize: '0.55rem', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>M</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Eye size={9} /> {actTop?.views_count || 0}</span>
                        {actTop.votes_cast !== undefined && (
                          <span> • {lang === 'en' ? 'Voted' : 'Szv'}: <strong style={{ color: 'var(--text-muted)' }}>{actTop.votes_cast}</strong></span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '700', color: isMe ? '#f97316' : 'var(--text-title)' }}>
                        {actTop.fair_score !== undefined ? `${actTop.fair_score} FP` : `${actTop.likes_count || 0} ⭐`}
                      </div>
                      {actTop.fair_score !== undefined && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {actTop.likes_count || 0} ⭐
                        </div>
                      )}
                    </div>
                  </div>
                );
              }).slice(0, 15)}
            </div>
          )}
        </div>
      </div>

      {/* INSPECTOR MODÁL */}
      {selectedExifPhoto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,13,22,0.92)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '900px', maxHeight: '85vh', borderRadius: '8px', border: '1px solid var(--border-main)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-main)' }}>
              <h4 style={{ margin: 0, color: 'var(--text-title)', fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}><Camera size={16} /> {t('roomInspectorTitle')}</h4>
              <button onClick={() => setSelectedExifPhoto(null)} style={{ background: 'var(--bg-main)', color: 'var(--text-body)', border: '1px solid var(--border-main)', width: '28px', height: '28px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
            </div>
            <div style={{ flex: 1, backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '10px' }}>
              <img src={selectedExifPhoto.file_url} alt="" style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }} loading="lazy" />
            </div>
          </div>
        </div>
      )}

      {/* ── 🎯 ASZTALI BENTO GRID STYLING LAYER ── */}
      <style>{`
        .arena-main-layout-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          width: 100%;
          box-sizing: border-box;
        }
        .arena-layout-column-main {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }
        .arena-layout-column-side {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }
        @media (min-width: 1060px) {
          .arena-main-layout-grid {
            grid-template-columns: 1.45fr 1fr !important;
          }
        }
        .batch-vote-responsive-card {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 16px;
          align-items: start;
        }
        .batch-vote-responsive-imgbox {
          width: 120px;
          height: 120px;
          background-color: #000;
          overflow: hidden;
          cursor: zoom-in;
          position: relative;
        }
        .batch-vote-responsive-content {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 120px;
        }
        .batch-vote-responsive-buttons {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 10px;
        }
        @media (max-width: 580px) {
          .batch-vote-responsive-card {
            grid-template-columns: 1fr !important;
          }
          .batch-vote-responsive-imgbox {
            width: 100% !important;
            height: 160px !important;
          }
        }
      `}</style>
    </div>
  );
}
