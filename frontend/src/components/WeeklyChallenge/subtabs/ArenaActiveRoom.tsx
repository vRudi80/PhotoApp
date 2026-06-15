import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getImageUrl } from '../../../utils/helpers';
import { BACKEND_URL } from '../../../utils/constants';
import exifr from 'exifr';

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

  // 📡 Háttértár a valós időben aszinkron módon beolvasott EXIF adatoknak
  const [realExifs, setRealExifs] = useState<Record<number, any>>({});

  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];
  const safeClubLeaderboard = Array.isArray(currentClubLeaderboard) ? currentClubLeaderboard : [];
  const safePastEntries = Array.isArray(myPastEntries) ? myPastEntries : [];
  const safeUserPower = userPower || { super: 1, brilliant: 2 };

  // Éles, feldolgozatlan képek tiszta szűrése
  const batchVoteEntries = useMemo(() => {
    const eligibleEntries = safeLeaderboard.filter(item => 
      item.user_email !== user?.email && 
      Number(item.has_user_voted || 0) !== 1
    );
    return eligibleEntries.slice(0, 10).map(item => ({
      ...item,
      file_url: getImageUrl(item.drive_file_id, item.file_url)
    }));
  }, [safeLeaderboard, user?.email]);

  // ── 🛰️ AUTOMATIZÁLT, HIBRID EXIF-OLVASÓ RADAR (Kipusztítja az infinite re-render hibákat) ──
  useEffect(() => {
    if (batchVoteEntries.length === 0) return;

    let isMounted = true;

    const parseAllExifsAsync = async () => {
      for (const entry of batchVoteEntries) {
        // Ha erre a kép ID-ra már van rögzített státuszunk a memóriában, ugrunk a következőre
        if (realExifs[entry.id]) continue;

        try {
          // Megkíséreljük a távoli fejléc-olvasást a felhőből
          const data = await exifr.parse(entry.file_url);
          
          if (!isMounted) return;

          if (data && (data.Model || data.Make || data.Software || data.ExposureTime)) {
            const makePrefix = data.Make && data.Model && !data.Model.startsWith(data.Make) ? `${data.Make} ` : '';
            const shutterFraction = data.ExposureTime ? (data.ExposureTime < 1 ? `1/${Math.round(1 / data.ExposureTime)}s` : `${data.ExposureTime}s`) : '-';
            const isAiSoftware = data.Software && (data.Software.toLowerCase().includes('midjourney') || data.Software.toLowerCase().includes('stable'));

            setRealExifs(prev => ({
              ...prev,
              [entry.id]: {
                camera: data.Model ? `${makePrefix}${data.Model}` : (data.Make || '-'),
                lens: data.LensModel || '-',
                shutter: shutterFraction,
                iso: data.ISO ? String(data.ISO) : '-',
                aperture: data.FNumber ? `f/${data.FNumber}` : '-',
                software: data.Software || '-',
                isAiSuspect: !!isAiSuspect || (!data.Model && !data.ExposureTime)
              }
            }));
          } else {
            // Ha a fájl beolvasható, de teljesen steril (Nincs kamera hardver-kód): AI Gyanú!
            setRealExifs(prev => ({
              ...prev,
              [entry.id]: { camera: '-', lens: '-', shutter: '-', iso: '-', aperture: '-', software: data?.Software || '-', isAiSuspect: true }
            }));
          }
        } catch (err) {
          if (!isMounted) return;
          
          // 🎯 FALLBACK ÁG: Ha a böngésző CORS hibával letiltja a közvetlen fájlolvasást, 
          // azonnal áttérünk a DB-ből érkező éles rekord-értékek kirajzolására!
          setRealExifs(prev => ({
            ...prev,
            [entry.id]: {
              camera: entry.camera || (lang === 'en' ? 'Protected / DB Sync Needed' : 'Védett / DB Szinkron kell'),
              lens: entry.lens || '-',
              shutter: entry.shutter || '-',
              iso: entry.iso || '-',
              aperture: entry.aperture || '-',
              software: entry.software || '-',
              // Ha a DB-ben sincs kamera infó rögzítve feltöltés óta, akkor jelöljük meg gyanúsként
              isAiSuspect: !entry.camera
            }
          }));
        }
      }
    };

    parseAllExifsAsync();

    return () => {
      isMounted = false;
    };
  }, [batchVoteEntries]);

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

      alert(lang === 'en' ? '🎉 All package votes successfully submitted and saved!' : '🎉 A szavazatok sikeresen rögzítve és elmentve lettek az adatbázisban!');
      setPendingVotes({});
      window.location.reload();

    } catch (e) {
      console.error("Hiba a szavazat elküldésekor:", e);
      alert(lang === 'en' ? '❌ Network error during submission.' : '❌ Hálózati hiba történt a szavazat elküldésekor.');
    } finally {
      setIsSubmittingBatch(false);
    }
  };

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
            <h3 style={{ margin 0, color: '#10b981', fontSize: '1.4rem' }}>{t('roomClubLeague')}</h3>
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

      {/* ── KÖTEGELT ÉRTÉKELŐ PULT MÁTRIX ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        <div style={{ background: '#1e293b', padding: '35px', borderRadius: '24px', border: '2px solid #38bdf8', boxShadow: '0 15px 35px rgba(0,0,0,0.4)' }}>
          
          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderLeft: '4px solid #38bdf8', padding: '15px 20px', borderRadius: '0 12px 12px 0', marginBottom: '25px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
            <strong style={{ color: '#38bdf8', display: 'block', marginBottom: '4px', fontSize: '0.95rem' }}>
              🛡️ {lang === 'en' ? 'EXIF Diagnostics & AI Protection active' : 'EXIF Diagnosztika és AI Elleni Védelem'}
            </strong>
            {lang === 'en'
              ? 'To protect the purity of the competition, every photo displays raw hardware stamps. Generative AI models do not have true camera hardware signatures like physical lenses, ISO profiles, or shutter cycles.'
              : 'A verseny tisztaságának megőrzése érdekében minden kép alatt láthatóvá tettük a nyers fájl-metaadatokat. A generatív AI modellek nem rendelkeznek valódi fizikai gépvázzal, ISO profillal vagy záridő-ciklussal.'}
          </div>

          <h3 style={{ margin: '0 0 5px 0', color: '#f8fafc', fontSize: '1.6rem', fontWeight: '900' }}>
            {lang === 'en' ? 'Batch Evaluation Desk' : 'Kötegelt Értékelő Pult'}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 25px 0' }}>
            {lang === 'en' ? 'Review photos locally, then click Submit to finalize the package.' : 'Vizsgáld meg a képeket, válaszd ki a szavazatokat, majd az oldal alján véglegesítsd a csomagot!'}
          </p>

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
                  
                  // 🎯 Kivesszük a háttér-állapotból az éles hibrid EXIF adatokat (Ha még olvas, jön a Loading felirat)
                  const currentExif = realExifs[entry.id] || { camera: '⏳ Reading...', lens: '-', shutter: '-', iso: '-', aperture: '-', software: '-', isAiSuspect: false };

                  return (
                    <div key={entry.id} style={{ background: '#0f172a', padding: '20px', borderRadius: '20px', border: selectedVote ? '1px solid #10b98150' : '1px solid #232f46', position: 'relative' }}>
                      
                      <div style={{ position: 'absolute', top: '15px', left: '15px', background: selectedVote ? '#10b981' : '#334155', color: 'white', padding: '4px 12px', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 'black', zIndex: 5 }}>
                        #{index + 1}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '20px', alignItems: 'start' }}>
                        
                        <div 
                          onClick={() => setSelectedExifPhoto({ ...entry, exif: currentExif })}
                          style={{ width: '160px', height: '160px', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', cursor: 'zoom-in', border: '1px solid #334155', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.4)' }}
                        >
                          <img src={entry.file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleImageError} />
                          <div style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', color: 'white' }}>🔍 {lang === 'en' ? 'ZOOM' : 'NAGYÍT'}</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: '160px' }}>
                          
                          <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                            {currentExif.isAiSuspect ? (
                              <div style={{ background: '#ef444415', color: '#f87171', padding: '6px 12px', borderRadius: '8px', border: '1px solid #ef444430', fontWeight: 'bold', marginBottom: '8px', display: 'inline-block' }}>
                                ⚠️ {lang === 'en' ? 'AI SUSPECT: Missing Hardware EXIF Signature!' : 'AI GYANÚ: Hiányzó hardveres pecsét!'}
                              </div>
                            ) : null}
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 15px', color: '#94a3b8' }}>
                              <div>📷 {t('mapExifCamera')} <b style={{ color: '#f8fafc' }}>{currentExif.camera}</b></div>
                              <div>🔭 {t('mapExifLens')} <b style={{ color: '#f8fafc' }}>{currentExif.lens}</b></div>
                              <div>⏱️ Záridő / ISO: <b style={{ color: '#38bdf8' }}>{currentExif.shutter} / {currentExif.iso}</b></div>
                              <div>💿 Szoftver: <b style={{ color: '#a78bfa' }}>{currentExif.software}</b></div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '15px', alignItems: 'center' }}>
                            {[
                              { type: 'pass', label: t('roomVotePass').split(' ')[0], score: lang === 'en' ? '0 pts' : '0 pont', bg: '#334155' },
                              { type: 'super', label: `✨ ${t('roomVoteSuper')}`, score: `+${safeUserPower.super} ${t('roomPoints').trim()}`, bg: '#1e3a8a' },
                              { type: 'brilliant', label: `🔥 ${t('roomVoteBrilliant')}`, score: `+${safeUserPower.brilliant} ${t('roomPoints').trim()}`, bg: '#f97316' },
                              ...(isMaster ? [{ type: 'master', label: '👑 Mester', score: `+10 ${t('roomPoints').trim()}`, bg: '#fbbf24' }] : [])
                            ].map(btn => {
                              const isCurrentActive = selectedVote === btn.type;
                              
                              return (
                                <button
                                  key={btn.type}
                                  onClick={() => setPendingVotes(prev => ({ ...prev, [entry.id]: btn.type as any }))}
                                  style={{ padding: '6px 12px', borderRadius: '10px', border: isCurrentActive ? `2px solid white` : '1px solid #334155', background: isCurrentActive ? btn.bg : 'transparent', color: isCurrentActive ? 'white' : '#94a3b8', fontWeight: 'bold', fontSize: '0.84rem', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '85px' }}
                                >
                                  <span>{btn.label}</span>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 'normal', opacity: 0.6 }}>{btn.score}</span>
                                </button>
                              );
                            })}

                            <button
                              onClick={() => handleOffTopicReport(entry.id)}
                              style={{ padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'transparent', color: '#ef4444', fontWeight: 'bold', fontSize: '0.84rem', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '85px' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <span>⚠️ {t('roomReportBtn').split(' ')[0]}</span>
                              <span style={{ fontSize: '0.68rem', fontWeight: 'normal', opacity: 0.6 }}>AI / Report</span>
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
                  {isSubmittingBatch ? '⏳ Processing...' : `📗 SZAVAZATOK VÉGLEGESÍTÉSE ÉS BEKÜLDÉSE (${Object.keys(pendingVotes).length} / ${batchVoteEntries.length})`}
                </button>
              </div>
            </>
          )}

        </div>

      </div>

      {/* ── 🔍 INTERAKTÍV EXIF ÉS TELJESEN ANONIM NAGYÍTÓ MODÁL ── */}
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
