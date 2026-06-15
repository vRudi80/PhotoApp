import React, { useState, useMemo, useEffect, useRef } from 'react';
import { getImageUrl } from '../../../utils/helpers';
import { BACKEND_URL } from '../../../utils/constants';

// 🎯 Nyelvi kontextus aktiválása
import { useLanguage } from '../../../context/LanguageContext';

// 🕒 1. FIXEN SZINKRONIZÁLT AKTÍV SZŐBA VISSZASZÁMLÁLÓ
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

// ── 🎯 ⚡ ÚJ: PROFI JAVÍTOTT BINÁRIS EXIF RE-INJECTOR MOTOR ──
const insertExifToBlob = async (originalFile: File, compressedBlob: Blob): Promise<Blob> => {
  try {
    const origBuffer = await originalFile.arrayBuffer();
    const compBuffer = await compressedBlob.arrayBuffer();
    const origView = new DataView(origBuffer);
    const compView = new DataView(compBuffer);

    if (origView.byteLength < 2 || compView.byteLength < 2) return compressedBlob;
    if (origView.getUint16(0) !== 0xFFD8 || compView.getUint16(0) !== 0xFFD8) return compressedBlob;

    // 1. Kikeressük az eredeti képből a tiszta EXIF (APP1) szegmenst
    let origIdx = 2;
    let exifMarkerIdx = -1;
    let exifLength = 0;

    while (origIdx < origView.byteLength - 4) {
      const marker = origView.getUint16(origIdx);
      if (marker === 0xFFE1) { 
        exifMarkerIdx = origIdx;
        exifLength = origView.getUint16(origIdx + 2) + 2;
        break;
      }
      if ((marker & 0xFF00) !== 0xFF) break; 
      if (marker === 0xFFDA) break; 
      origIdx += origView.getUint16(origIdx + 2) + 2;
    }

    if (exifMarkerIdx === -1) return compressedBlob;
    const exifSlice = origBuffer.slice(exifMarkerIdx, exifMarkerIdx + exifLength);

    // 2. JAVÍTVA: Letisztítjuk a canvas által gyártott JPEG üres, zavaró APP0/APP1 szegmenseit a rácsúszás ellen
    let compIdx = 2;
    while (compIdx < compView.byteLength - 4) {
      const marker = compView.getUint16(compIdx);
      if (marker === 0xFFE0 || marker === 0xFFE1) {
        compIdx += compView.getUint16(compIdx + 2) + 2;
      } else {
        break;
      }
    }
    const compSlice = compBuffer.slice(compIdx);

    // 3. Összefűzzük az atombiztos struktúrát: SOI -> Eredeti EXIF -> Tömörített képadatok
    return new Blob([new Uint8Array([0xFF, 0xD8]), exifSlice, compSlice], { type: 'image/jpeg' });
  } catch (e) {
    console.error("Sikertelen EXIF visszaírás:", e);
    return compressedBlob; 
  }
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
        const MAX_SIZE = 2000; 

        if (width > height) {
          if (width > MAX_SIZE) { height = Math.round((height * MAX_SIZE) / width); width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width = Math.round((width * MAX_SIZE) / height); height = MAX_SIZE; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(async (blob) => {
          if (blob) {
            const blobWithExif = await insertExifToBlob(file, blob);
            const compressedFile = new File([blobWithExif], file.name.replace(/\.[^/.]+$/, "") + "_web.jpg", {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); 
          }
        }, 'image/jpeg', 0.85); 
      };
    };
  });
};

interface ArenaActiveRoomProps {
  topic: any; timeLeft: string; isMaster: boolean; exposureColor: string; exposurePercentage: number; exposureLabel: string;
  myEntry: any; voteEntry: any; noMoreEntries: boolean; masterVotesLeft: number; userPower: any; swapBalance: number;
  myPastEntries: any[]; leaderboard: any[]; currentClubLeaderboard: any[]; user: any; isUploading: boolean; uploadPreview: string | null;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void; handleUpload: () => void; isLoadingSwapAlbum: boolean; isSwapping: boolean;
  swapPreview: string | null; handleSwapFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void; handleSwapSubmit: () => void;
  onOpenAlbumForUpload: () => void; onOpenAlbumForSwap: () => void; handleVote: (type: 'pass' | 'super' | 'brilliant' | 'master') => void;
  handleOffTopicReport: (id: number) => void; handleSwapBackSubmit: (id: number) => void; setFullscreenData: (data: any) => void;
  handleImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  fetchCurrentTopic: (isSilent?: boolean) => Promise<void>;
}

export default function ArenaActiveRoom({
  topic, timeLeft, isMaster, exposureColor, exposurePercentage, exposureLabel,
  myEntry, voteEntry, noMoreEntries, masterVotesLeft, userPower, swapBalance,
  myPastEntries, leaderboard, currentClubLeaderboard, user, isUploading, uploadPreview,
  handleFileSelect, handleUpload, isLoadingSwapAlbum, isSwapping, swapPreview,
  handleSwapFileSelect, handleSwapSubmit, onOpenAlbumForUpload, onOpenAlbumForSwap,
  handleVote, handleOffTopicReport, handleSwapBackSubmit, setFullscreenData, handleImageError,
  fetchCurrentTopic
}: ArenaActiveRoomProps) {

  const { t, lang } = useLanguage();

  const [pendingVotes, setPendingVotes] = useState<Record<number, 'pass' | 'super' | 'brilliant' | 'master'>>({});
  const [selectedExifPhoto, setSelectedExifPhoto] = useState<any | null>(null);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];
  const safeClubLeaderboard = Array.isArray(currentClubLeaderboard) ? currentClubLeaderboard : [];
  const safePastEntries = Array.isArray(myPastEntries) ? myPastEntries : [];
  const safeUserPower = userPower || { super: 1, brilliant: 2 };

  const handleFileChangeWithCompression = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    originalHandler: (e: React.ChangeEvent<HTMLInputElement>) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 9 * 1024 * 1024) {
      setIsCompressing(true);
      try {
        const compressedFile = await compressImageOnClient(file);
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(compressedFile);
        
        Object.defineProperty(e.target, 'files', {
          value: dataTransfer.files,
          configurable: true
        });
      } catch (err) {
        console.error("Kliens oldali tömörítési hiba:", err);
      } finally {
        setIsCompressing(false);
      }
    }
    originalHandler(e);
  };

  const batchVoteEntries = useMemo(() => {
    const eligibleEntries = safeLeaderboard.filter(item => {
      const isOwnPhoto = item.user_email === user?.email;
      const alreadyVoted = item.has_user_voted === 1 || 
                           item.has_user_voted === true || 
                           item.has_user_voted === '1';

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
          body: JSON.stringify({
            entryId: Number(entryId),
            userEmail: user?.email,
            voteType: type
          })
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '30px', animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* BAL OLDAL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '30px', borderRadius: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '8rem', opacity: 0.05 }}>🔥</div>
          <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '1.8rem', textAlign: 'center', zIndex: 1 }}>
            <span>{displayRoomTitle}</span>
          </h3>
          <p style={{ margin: '0 0 20px 0', color: '#cbd5e1', fontSize: '0.95rem', textAlign: 'center', lineHeight: '1.6' }}>{displayRoomDesc}</p>
          <ActiveRoomCountdown endDate={topic?.end_date} lang={lang} />
        </div>
        
        {!isMaster && (
          <div style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', padding: '25px 15px', borderRadius: '24px', border: `1px solid ${exposureColor || '#ef4444'}40`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg viewBox="0 0 200 120" style={{ width: '100%', maxWidth: '240px', height: 'auto', display: 'block' }}>
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1e293b" strokeWidth="16" strokeLinecap="round" />
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={exposureColor || '#ef4444'} strokeWidth="16" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - (exposurePercentage || 0)} />
            </svg>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: exposureColor || '#ef4444', marginTop: '-40px' }}>{Math.round(exposurePercentage || 0)}%</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#cbd5e1', textTransform: 'uppercase', marginTop: '5px' }}>{getTranslatedExposureLabel(exposureLabel)}</div>
          </div>
        )}

        {/* BATCH EVALUATION PULT */}
        <div style={{ background: '#1e293b', padding: '35px', borderRadius: '24px', border: '2px solid #38bdf8', boxShadow: '0 15px 35px rgba(0,0,0,0.4)' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderLeft: '4px solid #38bdf8', padding: '15px 20px', borderRadius: '0 12px 12px 0', marginBottom: '25px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
            <strong style={{ color: '#38bdf8', display: 'block', marginBottom: '4px', fontSize: '0.95rem' }}>
              {t('roomExifShieldTitle')}
            </strong>
            {t('roomExifShieldDesc')}
          </div>

          <h3 style={{ margin: '0 0 5px 0', color: '#f8fafc', fontSize: '1.6rem', fontWeight: '900' }}>{t('roomBatchTitle')}</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 25px 0' }}>{t('roomBatchDesc')}</p>

          {(!myEntry && !isMaster) ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: '#0f172a', borderRadius: '16px', border: '2px dashed #f59e0b' }}>
              <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>{t('roomNoVoteRight')}</h4>
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

                      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '20px', alignItems: 'start' }}>
                        <div 
                          onClick={() => setSelectedExifPhoto(entry)}
                          style={{ width: '160px', height: '160px', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', cursor: 'zoom-in', border: '1px solid #334155', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.4)' }}
                        >
                          <img src={entry.file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleImageError} />
                          <div style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', color: 'white' }}>{t('roomZoomLabel')}</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: '160px' }}>
                          <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                            {entry.exif?.isLegacy ? (
                              <div style={{ background: '#f59e0b15', color: '#fbbf24', padding: '4px 10px', borderRadius: '6px', border: '1px solid #fbbf2430', fontWeight: 'bold', fontStyle: 'normal', marginBottom: '8px', display: 'inline-block' }}>
                                {t('roomLegacyPhoto')}
                              </div>
                            ) : entry.exif?.isAiSuspect ? (
                              <div style={{ background: '#ef444415', color: '#f87171', padding: '4px 10px', borderRadius: '6px', border: '1px solid #ef444430', fontWeight: 'bold', fontStyle: 'normal', marginBottom: '8px', display: 'inline-block' }}>
                                {t('roomAiSuspect')}
                              </div>
                            ) : null}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 15px', color: '#94a3b8' }}>
                              <div> {t('mapExifCamera')} <b style={{ color: entry.exif?.isLegacy ? '#475569' : '#f8fafc' }}>{entry.exif?.camera}</b></div>
                              <div> {t('mapExifLens')} <b style={{ color: entry.exif?.isLegacy ? '#475569' : '#f8fafc' }}>{entry.exif?.lens}</b></div>
                              <div> {t('roomShutterIso')} <b style={{ color: entry.exif?.isLegacy ? '#475569' : '#38bdf8' }}>{entry.exif?.shutter} / {entry.exif?.iso}</b></div>
                              <div> {t('roomSoftware')} <b style={{ color: entry.exif?.isLegacy ? '#475569' : '#a78bfa' }}>{entry.exif?.software}</b></div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '15px', alignItems: 'center' }}>
                            {[
                              { type: 'pass', label: t('roomVotePass').split(' ')[0], score: '0 pont', bg: '#334155' },
                              { type: 'super', label: t('roomVoteSuper'), score: `+${safeUserPower.super} pont`, bg: '#1e3a8a' },
                              { type: 'brilliant', label: t('roomVoteBrilliant'), score: `+${safeUserPower.brilliant} pont`, bg: '#f97316' },
                              ...(isMaster ? [{ type: 'master', label: t('statusMaster'), score: '+10 pont', bg: '#fbbf24' }] : [])
                            ].map(btn => {
                              const isCurrentActive = selectedVote === btn.type;
                              return (
                                <button
                                  key={btn.type}
                                  onClick={() => setPendingVotes(prev => ({ ...prev, [entry.id]: btn.type as any }))}
                                  style={{ padding: '6px 12px', borderRadius: '10px', border: isCurrentActive ? `2px solid white` : '1px solid #334155', background: isCurrentActive ? btn.bg : 'transparent', color: isCurrentActive ? 'white' : '#94a3b8', fontWeight: 'bold', fontSize: '0.84rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '85px', transition: 'all 0.1s' }}
                                >
                                  <span>{btn.label}</span>
                                  <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{btn.score}</span>
                                </button>
                              );
                            })}

                            <button
                              onClick={() => handleOffTopicReport(entry.id)}
                              style={{ padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'transparent', color: '#ef4444', fontWeight: 'bold', fontSize: '0.84rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '85px' }}
                            >
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
                <button
                  onClick={handleBatchSubmit}
                  disabled={isSubmittingBatch || Object.keys(pendingVotes).length < batchVoteEntries.length}
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: Object.keys(pendingVotes).length === batchVoteEntries.length ? 'linear-gradient(135deg, #10b981, #059669)' : '#334155', color: Object.keys(pendingVotes).length === batchVoteEntries.length ? 'white' : '#64748b', fontSize: '1.2rem', fontWeight: '900', cursor: Object.keys(pendingVotes).length === batchVoteEntries.length ? 'pointer' : 'not-allowed', boxShadow: Object.keys(pendingVotes).length === batchVoteEntries.length ? '0 10px 25px rgba(16,185,129,0.3)' : 'none', transition: 'all 0.3s' }}
                >
                  {isSubmittingBatch ? '⏳ Processing...' : `${t('roomBatchSubmitBtn')} (${Object.keys(pendingVotes).length} / ${batchVoteEntries.length})`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* JOBB OLDAL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
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
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, lineHeight: '1.6' }}>{t('roomYouAreMasterDesc')}</p>
            </div>
          ) : myEntry ? (
            <div>
              <div style={{ width: '100%', height: '220px', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)' }}>
                <img src={getImageUrl(myEntry?.drive_file_id, myEntry?.file_url)} alt="My submission" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={handleImageError} />
              </div>
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${exposureColor || '#ef4444'}` }}>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '5px' }}>{t('roomResult')}</div><div style={{ color: '#f59e0b', fontSize: '1.5rem', fontWeight: '900' }}>{myEntry?.likes_count || 0} ⭐</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '5px' }}>{t('roomViews')}</div><div style={{ color: '#38bdf8', fontSize: '1.5rem', fontWeight: '900' }}>{myEntry?.views_count || 0} 👁️</div></div>
              </div>

              {swapBalance > 0 ? (
                <div style={{ marginTop: '25px', background: 'linear-gradient(135deg, #4c1d9520, #be123c20)', padding: '20px', borderRadius: '16px', border: '1px solid #be123c50' }}>
                  <h5 style={{ margin: '0 0 10px 0', color: '#f43f5e', fontSize: '1.1rem' }}>{t('roomSwapTitle')}</h5>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 15px 0' }}>{t('roomSwapDesc')}</p>
                  
                  <input type="file" accept="image/jpeg, image/png, image/webp" onChange={(e) => handleFileChangeWithCompression(e, handleSwapFileSelect)} style={{ color: '#cbd5e1', marginBottom: '15px', fontSize: '0.9rem' }} disabled={isSwapping || isCompressing} />
                  
                  {isCompressing && <div style={{ color: '#fbbf24', fontSize: '0.85rem', marginBottom: '10px', fontWeight: 'bold' }}>⏳ {lang === 'en' ? 'Compressing and migrating EXIF data...' : 'Kép tömörítése és EXIF adatok átmentése...'}</div>}
                  {swapPreview && <div style={{marginBottom: '15px', display: 'flex', justifyContent: 'center'}}><img src={swapPreview} alt="Preview" style={{maxHeight: '120px', borderRadius: '8px'}} /></div>}
                  <button onClick={handleSwapSubmit} disabled={!swapPreview || isSwapping || isCompressing} style={{ width: '100%', background: !swapPreview ? '#334155' : 'linear-gradient(135deg, #e11d48, #be123c)', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                    {isSwapping ? t('roomSwappingInProgress') : t('roomSwapBrowseBtn')}
                  </button>

                  <div style={{ marginTop: '18px', borderTop: '1px solid #be123c40', paddingTop: '15px', textAlign: 'center' }}>
                    <button disabled={isSwapping || isLoadingSwapAlbum || isCompressing} onClick={onOpenAlbumForSwap} style={{ width: '100%', background: '#1e293b', border: '1px solid #f43f5e', color: '#f43f5e', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
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
                      <div key={pIdx} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '8px', borderRadius: '12px' }}>
                        <img src={getImageUrl(past?.drive_file_id, past?.file_url)} alt="" style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '6px' }} />
                        <div style={{ flex: 1, marginLeft: '10px' }}>
                          <div style={{ fontSize: '0.9rem', color: '#fbbf24', fontWeight: 'bold' }}>{past?.likes_count || 0} ⭐</div>
                        </div>
                        <button onClick={handleSwapBackSubmit(past.id)} disabled={swapBalance < 1} style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
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
                
                <input type="file" accept="image/jpeg, image/png, image/webp" onChange={(e) => handleFileChangeWithCompression(e, handleFileSelect)} style={{ color: '#cbd5e1', marginBottom: '15px', width: '100%' }} disabled={isUploading || isCompressing} />
                
                {isCompressing && <div style={{ color: '#fbbf24', fontSize: '0.85rem', marginBottom: '15px', fontWeight: 'bold' }}>⏳ {lang === 'en' ? 'Compressing and migrating EXIF data...' : 'Kép tömörítése és EXIF adatok átmentése...'}</div>}
                {uploadPreview && <div style={{marginBottom: '20px', display: 'flex', justifyContent: 'center'}}><img src={uploadPreview} alt="Preview" style={{maxHeight: '200px', borderRadius: '12px'}} /></div>}
                <button onClick={handleUpload} disabled={!uploadPreview || isUploading || isCompressing} style={{ width: '100%', background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {isUploading ? t('roomUploadingInProgress') : t('roomUploadSubmitBtn')}
                </button>

                <div style={{ marginTop: '15px', borderTop: '1px solid #334155', paddingTop: '15px', textAlign: 'center' }}>
                  <button disabled={isUploading || isLoadingSwapAlbum || isCompressing} onClick={onOpenAlbumForUpload} style={{ width: '100%', background: '#1e293b', border: '1px solid #14b8a6', color: '#14b8a6', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                    {t('roomChooseGalleryUploadBtn')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* KLUBOK CSATÁJA RANGSOR */}
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #10b981', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, color: '#10b981', fontSize: '1.4rem' }}>{t('roomClubLeague')}</h3>
            <span style={{ fontSize: '0.8rem', background: '#ef4444', color: 'white', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold' }}>{t('roomLiveBadge')}</span>
          </div>
          
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

        {/* VAK TOPLISTA MEGJELENÍTŐ */}
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #f59e0b', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#f59e0b', fontSize: '1.4rem' }}>{t('roomBlindLeaderboard')}</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>{t('roomBlindLeaderboardDesc')}</p>
          
          {safeLeaderboard.length === 0 ? <div style={{ color: '#94a3b8', textAlign: 'center', padding: '30px', background: '#0f172a', borderRadius: '16px' }}>{t('roomArenaEmpty')}</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[...safeLeaderboard].sort((a, b) => {
                const likesA = Number(a?.likes_count || 0);
                const likesB = Number(b?.likes_count || 0);
                if (likesB !== likesA) return likesB - likesA;
                return (Number(a?.views_count || 0)) - (Number(b?.views_count || 0));
              }).map((entry, index) => {
                const isMe = entry?.user_email === user?.email;
                const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#e2e8f0' : index === 2 ? '#cd7f32' : '#64748b';
                
                return (
                  <div key={entry?.id || index} style={{ display: 'flex', alignItems: 'center', background: isMe ? 'linear-gradient(90deg, #f59e0b20, #0f172a)' : '#0f172a', border: isMe ? '1px solid #f59e0b50' : '1px solid #334155', padding: '12px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', width: '35px', color: rankColor, textAlign: 'center' }}>{index + 1}.</div>
                    <div onClick={() => isMe ? setFullscreenData({url: getImageUrl(entry?.drive_file_id, entry?.file_url), title: entry?.user_name || ''}) : null} style={{ width: '55px', height: '55px', backgroundColor: '#000', borderRadius: '10px', overflow: 'hidden', margin: '0 15px', cursor: isMe ? 'zoom-in' : 'default', position: 'relative' }}>
                      <img src={getImageUrl(entry?.drive_file_id, entry?.file_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isMe ? 'none' : 'blur(6px) contrast(120%)' }} onError={handleImageError} />
                      {!isMe && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔒</div>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: isMe ? '#f8fafc' : '#94a3b8', fontWeight: 'bold', fontSize: '1.05rem' }}>
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

      {/* NAGYÍTÓ ÉS EXIF INSPECTOR MODÁL */}
      {selectedExifPhoto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,13,22,0.96)', backdropFilter: 'blur(20px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ background: '#1e293b', width: '100%', maxWidth: '1200px', maxHeight: '95vh', borderRadius: '24px', border: '1px solid #475569', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 70px rgba(0,0,0,0.8)' }}>
            
            {/* MODÁL FEJLÉC */}
            <div style={{ padding: '20px 30px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <h4 style={{ margin: 0, color: 'white', fontSize: '1.4rem', fontWeight: 'bold' }}>🔎 {t('roomInspectorTitle')}</h4>
                <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold', background: '#0f172a', padding: '4px 12px', borderRadius: '6px', border: '1px solid #334155' }}>
                   {t('roomInspectorAnon')}
                </span>
              </div>
              <button onClick={() => setSelectedExifPhoto(null)} style={{ background: '#334155', color: '#cbd5e1', border: 'none', width: '36px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#ef4444'}>✕</button>
            </div>

            {/* THEATER BOX */}
            <div style={{ flex: 1, backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
              <img 
                src={selectedExifPhoto.file_url} 
                alt="" 
                style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain' }} 
              />
            </div>

            {/* EXIF LÁBLÉC */}
            <div style={{ padding: '20px 30px', background: '#0f172a', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '15px', flexShrink: 0 }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px 25px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                <div> <span style={{ color: '#64748b' }}>{t('mapExifCamera')}:</span> <b style={{ color: 'white' }}>{selectedExifPhoto.exif?.camera}</b></div>
                <div> <span style={{ color: '#64748b' }}>{t('mapExifLens')}:</span> <b style={{ color: 'white' }}>{selectedExifPhoto.exif?.lens}</b></div>
                <div>⏱️ <span style={{ color: '#64748b' }}>{t('roomInspectorShutter')}:</span> <b style={{ color: '#38bdf8' }}>{selectedExifPhoto.exif?.shutter}</b></div>
                <div>💎 <span style={{ color: '#64748b' }}>{t('roomInspectorIso')}:</span> <b style={{ color: '#38bdf8' }}>{selectedExifPhoto.exif?.iso}</b></div>
                <div>📐 <span style={{ color: '#64748b' }}>{t('roomInspectorAperture')}:</span> <b style={{ color: '#10b981' }}>{selectedExifPhoto.exif?.aperture}</b></div>
                <div>💻 <span style={{ color: '#64748b' }}>{t('roomInspectorSoftware')}:</span> <b style={{ color: '#a78bfa' }}>{selectedExifPhoto.exif?.software}</b></div>
              </div>

              {/* RADAR ÁLLAPOT */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: selectedExifPhoto.exif?.isLegacy ? '#f59e0b10' : selectedExifPhoto.exif?.isAiSuspect ? '#ef444410' : '#10b98110', border: selectedExifPhoto.exif?.isLegacy ? '1px solid #fbbf2430' : selectedExifPhoto.exif?.isAiSuspect ? '1px solid #ef444430' : '1px solid #10b98130', padding: '8px', borderRadius: '10px' }}>
                <span style={{ color: selectedExifPhoto.exif?.isLegacy ? '#fbbf24' : selectedExifPhoto.exif?.isAiSuspect ? '#f87171' : '#4ade80', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  {selectedExifPhoto.exif?.isLegacy ? t('roomLegacyPhoto') : selectedExifPhoto.exif?.isAiSuspect ? t('roomAiSuspect') : t('roomVerifiedHardware')}
                </span>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
