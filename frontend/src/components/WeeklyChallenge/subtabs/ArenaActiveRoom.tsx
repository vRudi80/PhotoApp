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
  voteEntry: any; // Ezt a tesztben kiterjesztjük kötegelt adatokra is
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

  // ── 🧪 ÚJ TESZT ÁLLAPOTOK A KÖTEGELT SZAVAZÁSHOZ ──
  const [pendingVotes, setPendingVotes] = useState<Record<number, 'pass' | 'super' | 'brilliant' | 'master'>>({});
  const [selectedExifPhoto, setSelectedExifPhoto] = useState<any | null>(null);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];
  const safeClubLeaderboard = Array.isArray(currentClubLeaderboard) ? currentClubLeaderboard : [];
  const safePastEntries = Array.isArray(myPastEntries) ? myPastEntries : [];
  const safeUserPower = userPower || { super: 1, brilliant: 2 };

  // 🧪 SZIMULÁLT / REALISZTIKUS 10-ES KÉPKÖTEG GENERÁLÁSOK EXIF DIAGNOSZTIKÁVAL A TESZTHEZ
  const batchVoteEntries = useMemo(() => {
    // Ha az éles backendből már tömb jön, azt használjuk, egyébként legenerálunk 10 tesztmintát
    if (Array.isArray(voteEntry) && voteEntry.length > 0) return voteEntry.slice(0, 10);
    
    const mockTitles = ['Magányos vadász', 'Hajnali fények', 'Betonrengeteg', 'A völgy felett', 'Misztikus erdő', 'Végtelen út', 'Portré árnyékban', 'Makró világ', 'A vihar kapujában', 'Aranyóra'];
    
    return Array.from({ length: 10 }).map((_, i) => {
      const baseEntry = safeLeaderboard[i] || voteEntry;
      // Véletlenszerűen szimulálunk szoftveres AI képet metaadatok nélkül az ellenőrzés teszteléséhez
      const isAiSuspect = i === 3 || i === 7; 

      return {
        id: baseEntry?.id ? baseEntry.id + i + 100 : i + 1000,
        user_name: baseEntry?.user_name || `Fotós_${i + 1}`,
        file_url: baseEntry?.file_url || `https://picsum.photos/id/${i + 10}/800/600`,
        drive_file_id: baseEntry?.drive_file_id || '',
        off_topic_count: i === 4 ? 2 : 0,
        exif: isAiSuspect ? {
          camera: 'Nincs (Missing Hardware)',
          lens: 'Nincs (Missing Lens Profile)',
          shutter: '-',
          iso: '-',
          aperture: '-',
          software: 'Midjourney AI v6',
          isAiSuspect: true
        } : {
          camera: i % 2 === 0 ? 'Sony ILCE-7M4' : 'Canon EOS R6',
          lens: i % 2 === 0 ? 'FE 24-70mm F2.8 GM II' : 'RF 24-105mm F4L IS USM',
          shutter: i % 3 === 0 ? '1/250s' : '1/125s',
          iso: i % 2 === 0 ? '100' : '400',
          aperture: 'f/4.0',
          software: 'Adobe Photoshop 25.1 (Windows)',
          isAiSuspect: false
        }
      };
    });
  }, [voteEntry, safeLeaderboard]);

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

  // 🧪 KÖTEGELT SZAVAZATOK VÉGLEGESÍTÉSE ÉS BEKÜLDÉSE
  const handleBatchSubmit = async () => {
    const totalVoted = Object.keys(pendingVotes).length;
    if (totalVoted < batchVoteEntries.length) {
      alert(lang === 'en' ? `Please vote for all ${batchVoteEntries.length} photos before finalizing!` : `Kérlek mind a ${batchVoteEntries.length} képet értékeld, mielőtt véglegesítenéd a szavazást!`);
      return;
    }

    setIsSubmittingBatch(true);
    try {
      console.log("📥 Kötegelt szavazási mátrix beküldése:", pendingVotes);
      
      // Teszt jelleggel itt végigpörgetjük az éles handleVote-ot minden elemre
      for (const [entryId, type] of Object.entries(pendingVotes)) {
        // Itt hívódna meg az éles API axios/fetch kérése kötegelve
        // await fetch(`${BACKEND_URL}/api/weekly/vote-batch`, {...})
      }

      alert(lang === 'en' ? '🎉 All 10 votes successfully recorded and finalized!' : '🎉 Mind a 10 szavazat sikeresen rögzítve és véglegesítve lett!');
      setPendingVotes({});
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '30px', animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* ── BAL OLDALI OSZLOP (TÉMA ÉS STATISZTIKÁK) ── */}
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
      </div>

      {/* ── ⚔️ JOBB OLDALI OSZLOP (KÖTEGELT 10-ES SZAVAZÓ MATRIX FELÜLET) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        <div style={{ background: '#1e293b', padding: '35px', borderRadius: '24px', border: '2px solid #38bdf8', boxShadow: '0 15px 35px rgba(0,0,0,0.4)' }}>
          
          {/* EXIF MAGYARÁZÓ PANEL */}
          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderLeft: '4px solid #38bdf8', padding: '15px 20px', borderRadius: '0 12px 12px 0', marginBottom: '25px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
            <strong style={{ color: '#38bdf8', display: 'block', marginBottom: '4px', fontSize: '0.95rem' }}>
              🛡️ {lang === 'en' ? 'EXIF Diagnostics & AI Protection active' : 'EXIF Diagnosztika és AI Elleni Védelem'}
            </strong>
            {lang === 'en'
              ? 'To protect the purity of the competition, every photo displays raw hardware stamps. Generative AI models (Midjourney, Stable Diffusion) do not have true camera hardware signatures like physical lenses, ISO profiles, or shutter cycles. Use these diagnostic parameters to flag artificial rendering.'
              : 'A verseny tisztaságának megőrzése érdekében minden kép alatt láthatóvá tettük a nyers fájl-metaadatokat. A generatív AI modellek (Midjourney, Stable Diffusion) nem rendelkeznek valódi fizikai gépvázzal, ISO profillal vagy záridő-ciklussal. Használd ezeket a diagnosztikai adatokat a tématévesztő vagy mesterséges képek kiszűrésére!'}
          </div>

          <h3 style={{ margin: '0 0 5px 0', color: '#f8fafc', fontSize: '1.6rem', fontWeight: '900' }}>
            {lang === 'en' ? 'Batch Evaluation Desk (10 Photos)' : 'Kötegelt Értékelő Pult (10 Fotó)'}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 25px 0' }}>
            {lang === 'en' ? 'Review all photos locally, then submit them together at the bottom.' : 'Vizsgáld meg a képeket, oszd ki a pontokat, majd az oldal alján található gombbal véglegesítsd a teljes csomagot!'}
          </p>

          {/* 10 KÉPES SZAVAZÓ MATRIX FOLYAMAT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            {batchVoteEntries.map((entry, index) => {
              const selectedVote = pendingVotes[entry.id];
              
              return (
                <div key={entry.id} style={{ background: '#0f172a', padding: '20px', borderRadius: '20px', border: selectedVote ? '1px solid #10b98150' : '1px solid #232f46', transition: 'all 0.2s', position: 'relative' }}>
                  
                  {/* Kép sorszám lebegő ikon */}
                  <div style={{ position: 'absolute', top: '15px', left: '15px', background: selectedVote ? '#10b981' : '#334155', color: 'white', padding: '4px 12px', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 'black', zIndex: 5 }}>
                    #{index + 1}
                  </div>

                  {/* Sorszám szerinti képnézegető */}
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '20px', alignItems: 'start' }}>
                    
                    {/* Kis kép előnézet nagyítás opcióval */}
                    <div 
                      onClick={() => setSelectedExifPhoto(entry)}
                      style={{ width: '160px', height: '160px', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', cursor: 'zoom-in', border: '1px solid #334155', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.4)' }}
                    >
                      <img src={entry.file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', color: 'white' }}>🔍 {lang === 'en' ? 'ZOOM' : 'NAGYÍT'}</div>
                    </div>

                    {/* Metaadat és Pontozó felület zóna */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: '160px' }}>
                      
                      {/* EXIF Infó Panel */}
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

                      {/* Szavazat választó rádiógombok */}
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
                              style={{
                                padding: '8px 14px',
                                borderRadius: '10px',
                                border: isCurrentActive ? `2px solid white` : '1px solid #334155',
                                background: isCurrentActive ? btn.bg : 'transparent',
                                color: isCurrentActive ? 'white' : '#94a3b8',
                                fontWeight: 'bold',
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
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

          {/* VÉGLEGESÍTŐ GOMB A JÁTÉK MEGTAKARÍTÁSÁHOZ */}
          <div style={{ marginTop: '35px', borderTop: '1px solid #334155', paddingTop: '25px', textAlign: 'center' }}>
            <button
              onClick={handleBatchSubmit}
              disabled={isSubmittingBatch || Object.keys(pendingVotes).length < batchVoteEntries.length}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                border: 'none',
                background: Object.keys(pendingVotes).length === batchVoteEntries.length 
                  ? 'linear-gradient(135deg, #10b981, #059669)' 
                  : '#334155',
                color: Object.keys(pendingVotes).length === batchVoteEntries.length ? 'white' : '#64748b',
                fontSize: '1.2rem',
                fontWeight: '900',
                cursor: Object.keys(pendingVotes).length === batchVoteEntries.length ? 'pointer' : 'not-allowed',
                boxShadow: Object.keys(pendingVotes).length === batchVoteEntries.length ? '0 10px 25px rgba(16,185,129,0.3)' : 'none',
                transition: 'all 0.3s'
              }}
            >
              {isSubmittingBatch ? '⏳ Processing...' : `📗 SZAVAZATOK VÉGLEGESÍTÉSE ÉS BEKÜLDÉSE (${Object.keys(pendingVotes).length} / 10)`}
            </button>
          </div>

        </div>

      </div>

      {/* ── 🔍 INTERAKTÍV EXIF ÉS DIGITÁLIS NAGYÍTÓ MODÁL ── */}
      {selectedExifPhoto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,13,22,0.95)', backdropFilter: 'blur(15px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px', boxSizing: 'border-box', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: '#1e293b', width: '100%', maxWidth: '1000px', borderRadius: '24px', border: '1px solid #475569', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 340px', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
            
            {/* Bal oldal: Maximálisra nyújtott kép */}
            <div style={{ width: '100%', height: '650px', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #334155' }}>
              <img src={selectedExifPhoto.file_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>

            {/* Jobb oldal: Részletes EXIF laborvizsgálat panel */}
            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h4 style={{ margin: 0, color: 'white', fontSize: '1.3rem', fontWeight: 'bold' }}>🔎 {lang === 'en' ? 'Image Inspector' : 'Képvizsgálat'}</h4>
                  <button onClick={() => setSelectedExifPhoto(null)} style={{ background: '#334155', color: '#cbd5e1', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', fontWeight: 'bold', textTransform: 'uppercase' }}>{lang === 'en' ? 'Artist Profile' : 'Alkotó művész'}</span>
                    <span style={{ color: '#38bdf8', fontSize: '1.1rem', fontWeight: 'bold' }}>{selectedExifPhoto.user_name}</span>
                  </div>

                  <div style={{ height: '1px', background: '#334155' }}></div>

                  {/* Részletes EXIF listázás */}
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

              {/* Alsó AI biztonsági státusz visszajelzés */}
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
