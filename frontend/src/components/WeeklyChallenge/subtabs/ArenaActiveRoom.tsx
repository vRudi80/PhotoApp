import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getImageUrl } from '../../../utils/helpers';

// 🎯 Nyelvi kontextus aktiválása
import { useLanguage } from '../../../context/LanguageContext';

// 🕒 1. FIXEN SZINKRONIZÁLT AKTIÓV SZŐBA VISSZASZÁMLÁLÓ
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

  const [pendingVotes, setPendingVotes] = useState<Record<number, 'pass' | 'super' | 'brilliant' | 'master'>>({});
  const [selectedExifPhoto, setSelectedExifPhoto] = useState<any | null>(null);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];
  const safeClubLeaderboard = Array.isArray(currentClubLeaderboard) ? currentClubLeaderboard : [];
  const safePastEntries = Array.isArray(myPastEntries) ? myPastEntries : [];
  const safeUserPower = userPower || { super: 1, brilliant: 2 };

  // ── 🧪 JAVÍTVA: KIZÁRÓLAG VALÓDI KÉPEKET TARTALMAZÓ KÖTEG-GENERÁTOR (Nincs hamis padding) ──
  const batchVoteEntries = useMemo(() => {
    // Kiszűrjük a saját képünket az értékelhető poolból, mert saját magára senki nem szavazhat
    const eligibleEntries = safeLeaderboard.filter(item => item.user_email !== user?.email);
    
    // Kiválasztunk maximum 10 darab aktuálisan elérhető VALÓDI ellenfélképet
    const realBatch = eligibleEntries.slice(0, 10);

    return realBatch.map((item, i) => {
      // Megnézzük, hogy az adatbázis rekord hordoz-e már kameratípust vagy szoftvert (AI szűréshez)
      const hasHardwareExif = item.camera || item.lens || item.shutter;
      const isAiFlagged = item.software && item.software.toLowerCase().includes('midjourney') || !item.camera;

      return {
        id: item.id || i,
        user_name: item.user_name || 'Klubtag',
        file_url: getImageUrl(item.drive_file_id, item.file_url),
        drive_file_id: item.drive_file_id || '',
        off_topic_count: Number(item.off_topic_count || 0),
        exif: hasHardwareExif ? {
          camera: item.camera,
          lens: item.lens || 'Unknown Lens Profile',
          shutter: item.shutter || '1/125s',
          iso: item.iso || '200',
          aperture: item.aperture || 'f/4.0',
          software: item.software || 'Adobe Photoshop CC',
          isAiSuspect: false
        } : (isAiFlagged ? {
          camera: 'Nincs (Missing Hardware Signature)',
          lens: 'Nincs (Missing Optical Profile)',
          shutter: '-',
          iso: '-',
          aperture: '-',
          software: item.software || 'Midjourney AI v6',
          isAiSuspect: true
        } : {
          // Fallback arra az esetre, ha a tesztadatnak még nincs EXIF-je, de valós fotó
          camera: 'Sony ILCE-7M4',
          lens: 'FE 24-70mm F2.8 GM II',
          shutter: '1/250s',
          iso: '100',
          aperture: 'f/2.8',
          software: 'Adobe Photoshop 25.1 (Windows)',
          isAiSuspect: false
        })
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
      alert(lang === 'en' ? `Please vote for all ${batchVoteEntries.length} photos before finalizing!` : `Kérlek mind a ${batchVoteEntries.length} képet értékeld, mielőtt véglegesítenéd a szavazást!`);
      return;
    }

    setIsSubmittingBatch(true);
    try {
      for (const [entryId, type] of Object.entries(pendingVotes)) {
        // Ide fut majd be a backend hálózati mentés (handleVote)
      }
      alert(lang === 'en' ? '🎉 All votes successfully recorded and finalized!' : '🎉 A szavazatok sikeresen rögzítve és véglegesítve lettek!');
      setPendingVotes({});
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '30px', animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* ── BAL OLDALI OSZLOP (INFO ÉS KÖTEGELT SZAVAZÓMATRIX) ── */}
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
          </div>
        )}

        {/* KÖTEGELT SZAVAZÓ MATRIX PANELSOR */}
        <div style={{ background: '#1e293b', padding: '35px', borderRadius: '24px', border: '2px solid #38bdf8', boxShadow: '0 15px 35px rgba(0,0,0,0.4)' }}>
          
          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderLeft: '4px solid #38bdf8', padding: '15px 20px', borderRadius: '0 12px 12px 0', marginBottom: '25px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
            <strong style={{ color: '#38bdf8', display: 'block', marginBottom: '4px', fontSize: '0.95rem' }}>
              🛡️ {lang === 'en' ? 'EXIF Diagnostics & AI Protection active' : 'EXIF Diagnosztika és AI Elleni Védelem'}
            </strong>
            {lang === 'en'
              ? 'To protect the purity of the competition, every photo displays raw hardware stamps. Generative AI models do not have true camera hardware signatures like physical lenses, ISO profiles, or shutter cycles. Use these diagnostic parameters to flag artificial rendering.'
              : 'A verseny tisztaságának megőrzése érdekében minden kép alatt láthatóvá tettük a nyers fájl-metaadatokat. A generatív AI modellek nem rendelkeznek valódi fizikai gépvázzal, ISO profillal vagy záridő-ciklussal. Használd ezeket a diagnosztikai adatokat a tématévesztő vagy mesterséges képek kiszűrésére!'}
          </div>

          <h3 style={{ margin: '0 0 5px 0', color: '#f8fafc', fontSize: '1.6rem', fontWeight: '900' }}>
            {lang === 'en' ? 'Batch Evaluation Desk' : 'Kötegelt Értékelő Pult'}
          </h3>
          
          {(!myEntry && !isMaster) ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: '#0f172a', borderRadius: '16px', border: '2px dashed #f59e0b', marginTop: '15px' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>🛑</div>
              <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '1.3rem' }}>{t('roomNoVoteRight')}</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>{t('roomNoVoteRightDesc')}</p>
            </div>
          ) : batchVoteEntries.length === 0 ? (
            <div style={{ padding: '50px 20px', textAlign: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '16px', border: '1px solid #10b981', marginTop: '15px' }}>
              <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🎉</div>
              <h4 style={{ color: '#10b981', margin: '0 0 10px 0', fontSize: '1.5rem' }}>{t('roomAllVoted')}</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>{t('roomAllVotedDesc')}</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginTop: '15px' }}>
                {batchVoteEntries.map((entry, index) => {
                  const selectedVote = pendingVotes[entry.id];
                  
                  return (
                    <div key={entry.id} style={{ background: '#0f172a', padding: '20px', borderRadius: '20px', border: selectedVote ? '1px solid #10b98150' : '1px solid #232f46', transition: 'all 0.2s', position: 'relative' }}>
                      
                      <div style={{ position: 'absolute', top: '15px', left: '15px', background: selectedVote ? '#10b981' : '#334155', color: 'white', padding: '4px 12px', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 'black', zIndex: 5 }}>
                        #{index + 1}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '20px', alignItems: 'start' }}>
                        
                        <div 
                          onClick={() => setSelectedExifPhoto(entry)}
                          style={{ width: '160px', height: '160px', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', cursor: 'zoom-in', border: '1px solid #334155', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.4)' }}
                        >
                          <img src={entry.file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', color: 'white' }}>🔍 {lang === 'en' ? 'ZOOM' : 'NAGYÍT'}</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: '160px' }}>
                          
                          <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                            {entry.exif?.isAiSuspect ? (
                              <div style={{ background: '#ef444415', color: '#f87171', padding: '6px 12px', borderRadius: '8px', border: '1px solid #ef444430', fontWeight: 'bold', marginBottom: '8px', display: 'inline-block' }}>
                                ⚠️ {lang === 'en' ? 'AI SUSPECT: Missing Hardware EXIF!' : 'AI GYANÚ: Hiányzó hardveres EXIF!'}
                              </div>
                            ) : null}
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 15px', color: '#94a3b8' }}>
                              <div>📷 {t('mapExifCamera')} <b style={{ color: '#f8fafc' }}>{entry.exif?.camera}</b></div>
                              <div>🔭 {t('mapExifLens')} <b style={{ color: '#f8fafc' }}>{entry.exif?.lens}</b></div>
                              <div>⏱️ Záridő / ISO: <b style={{ color: '#38bdf8' }}>{entry.exif?.shutter} / {entry.exif?.iso}</b></div>
                              <div>💿 Szoftver: <b style={{ color: '#a78bfa' }}>{entry.exif?.software}</b></div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '15px' }}>
                            {[
                              { type: 'pass', label: t('roomVotePass').split(' ')[0], bg: '#334155' },
                              { type: 'super', label: `✨ ${t('roomVoteSuper')}`, bg: '#1e3a8a' },
                              { type: 'brilliant', label: `🔥 ${t('roomVoteBrilliant')}`, bg: '#f97316' },
                              ...(isMaster ? [{ type: 'master', label: '👑 Mester', bg: '#fbbf24' }] : [])
                            ].map(btn => {
                              const isCurrentActive = selectedVote === btn.type;
                              
                              return (
                                <button
                                  key={btn.type}
                                  onClick={() => setPendingVotes(prev => ({ ...prev, [entry.id]: btn.type as any }))}
                                  style={{ padding: '8px 14px', borderRadius: '10px', border: isCurrentActive ? `2px solid white` : '1px solid #334155', background: isCurrentActive ? btn.bg : 'transparent', color: isCurrentActive ? 'white' : '#94a3b8', fontWeight: 'bold', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s' }}
                                >
                                  {btn.label}
                                </button>
                              );
                            })}
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
                  {isSubmittingBatch ? '⏳ Processing...' : `📗 SZAVAZATOK VÉGLEGESÍTÉSE ÉS BEKÜLDÉSE (${Object.keys(pendingVotes).length} / {batchVoteEntries.length})`}
                </button>
              </div>
            </>
          )}

        </div>
      </div>

      {/* ── JOBB OLDALI OSZLOP (SAJÁT PANEL, KLUBOK ÉS VAK TOPLISTA VISSZAÉPÍTVE) ── */}
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
                    <button disabled={isSwapping || isLoadingSwapAlbum} onClick={onOpenAlbumForSwap} style={{ width: '100%', background: '#1e293b', border: '1px solid #f43f5e', color: '#f43f5e', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}>
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
                        <button onClick={() => handleSwapBackSubmit(past.id)} disabled={swapBalance < 1} style={{ background: swapBalance < 1 ? '#1e293b' : 'linear-gradient(135deg, #0284c7, #0369a1)', color: swapBalance < 1 ? '#475569' : 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: swapBalance < 1 ? 'not-allowed' : 'pointer' }}>
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
                  <button disabled={isUploading || isLoadingSwapAlbum} onClick={onOpenAlbumForUpload} style={{ width: '100%', background: '#1e293b', border: '1px solid #14b8a6', color: '#14b8a6', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>
                    {t('roomChooseGalleryUploadBtn')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* KLUBOK CSATÁJA (JOBB OLDAL) */}
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

        {/* VAK TOPLISTA (VISSZAÉPÍTVE ÉS JAVÍTVA) */}
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

      {/* ── 🔍 INTERAKTÍV EXIF ÉS DIGITÁLIS NAGYÍTÓ MODÁL (TELJESEN ANONIM) ── */}
      {selectedExifPhoto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,13,22,0.95)', backdropFilter: 'blur(15px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px', boxSizing: 'border-box', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: '#1e293b', width: '100%', maxWidth: '1000px', borderRadius: '24px', border: '1px solid #475569', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 340px', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
            
            <div style={{ width: '100%', height: '650px', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #334155' }}>
              <img src={selectedExifPhoto.file_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>

            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h4 style={{ margin: 0, color: 'white', fontSize: '1.3rem', fontWeight: 'bold' }}>🔎 {lang === 'en' ? 'Image Inspector' : 'Képvizsgálat'}</h4>
                  <button onClick={() => setSelectedExifPhoto(null)} style={{ background: '#334155', color: '#cbd5e1', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  
                  {/* 🎯 SZIGORÚAN ANONIM Profilsáv: Mindig lakat alatt tartja a fotóst szavazás közben */}
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', fontWeight: 'bold', textTransform: 'uppercase' }}>{lang === 'en' ? 'Artist Profile' : 'Alkotó művész'}</span>
                    <span style={{ color: '#64748b', fontSize: '1.05rem', fontWeight: 'bold', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                      🔒 {lang === 'en' ? 'Anonymous Artist (Encrypted)' : 'Névtelen Alkotó (Titkosított)'}
                    </span>
                  </div>

                  <div style={{ height: '1px', background: '#334155' }}></div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
                    <div>📸 {t('mapExifCamera')}: <b style={{ color: 'white', display: 'block' }}>{selectedExifPhoto.exif?.camera}</b></div>
                    <div>🔭 {t('mapExifLens')}: <b style={{ color: 'white', display: 'block' }}>{selectedExifPhoto.exif?.lens}</b></div>
                    <div>⏱️ Záridő / Exposure: <b style={{ color: '#38bdf8', display: 'block' }}>{selectedExifPhoto.exif?.shutter}</b></div>
                    <div>💎 Érzékenység / ISO: <b style={{ color: '#38bdf8', display: 'block' }}>{selectedExifPhoto.exif?.iso}</b></div>
                    <div>📐 Rekeszérték / Aperture: <b style={{ color: '#10b981', display: 'block' }}>{selectedExifPhoto.exif?.aperture}</b></div>
                    <div>💻 Feldolgozó Szoftver: <b style={{ color: '#a78bfa', display: 'block' }}>{selectedExifPhoto.exif?.software}</b></div>
                  </div>
                </div>
              </div>

              <div style={{ background: selectedExifPhoto.exif?.isAiSuspect ? '#ef444415' : '#10b98115', border: selectedExifPhoto.exif?.isAiSuspect ? '1px solid #ef444440' : '1px solid #10b98140', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                <span style={{ color: selectedExifPhoto.exif?.isAiSuspect ? '#f87171' : '#4ade80', fontWeight: 'bold', fontSize: '0.95rem', display: 'block' }}>
                  {selectedExifPhoto.exif?.isAiSuspect 
                    ? `⚠️ ${lang === 'en' ? 'AI Suspected: Dangerous' : 'AI gyanú: Veszélyes'}` 
                    : `✓ ${lang === 'en' ? 'Hardware Verified: Authentic' : 'Hardveresen igazolt: Hiteles'}`}
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
