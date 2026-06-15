import React, { useEffect, useRef } from 'react';
import { getImageUrl } from '../../../utils/helpers';

// 🎯 Nyelvi kontextus aktiválása
import { useLanguage } from '../../../context/LanguageContext';

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
      width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
      background: '#f59e0b10', padding: '10px 14px', borderRadius: '10px', 
      border: '1px solid #f59e0b30', boxSizing: 'border-box', zIndex: 1
    }}>
      <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold', letterSpacing: '0.5px' }}>
        {lang === 'en' ? '⏳ TIME LEFT:' : '⏳ HÁTRALÉVŐ IDŐ:'}
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
  swapPreview: string | null; handleSwapFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void; handleSwapSubmit: () => void;
  onOpenAlbumForUpload: () => void; onOpenAlbumForSwap: () => void; handleVote: (type: 'pass' | 'super' | 'brilliant' | 'master') => void;
  handleOffTopicReport: (id: number) => void; handleSwapBackSubmit: (id: number) => void; setFullscreenData: (data: any) => void;
  handleImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export default function ArenaActiveRoom({
  topic, timeLeft, isMaster, exposureColor, exposurePercentage, exposureLabel,
  myEntry, voteEntry, noMoreEntries, masterVotesLeft, userPower, swapBalance,
  myPastEntries, leaderboard, currentClubLeaderboard, user, isUploading, uploadPreview,
  handleFileSelect, handleUpload, isLoadingSwapAlbum, isSwapping, swapPreview,
  handleSwapFileSelect, handleSwapSubmit, onOpenAlbumForUpload, onOpenAlbumForSwap,
  handleVote, handleOffTopicReport, handleSwapBackSubmit, setFullscreenData, handleImageError
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

  // ── 🎯 EXIF DIAGNOSZTIKAI KIÉRTÉKELÉS ADATBÁZIS ALAPON ──
  const isLegacyPhoto = voteEntry && !voteEntry.camera && !voteEntry.software && !voteEntry.shutter;
  const isAiFlagged = voteEntry && voteEntry.software && (voteEntry.software.toLowerCase().includes('midjourney') || voteEntry.software.toLowerCase().includes('stable'));
  const isAiSuspect = voteEntry && !isLegacyPhoto && (!!isAiFlagged || (!voteEntry.camera && !voteEntry.shutter));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '30px', animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* BAL OLDAL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '30px', borderRadius: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '1.8rem', textAlign: 'center', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
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

        {/* SINGLE-VOTE ARENA INTERFACE */}
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '1.4rem' }}>{t('roomVotingArena')}</h3>
          
          {(!myEntry && !isMaster) ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: '#0f172a', borderRadius: '16px', border: '2px dashed #f59e0b' }}>
              <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>{t('roomNoVoteRight')}</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>{t('roomNoVoteRightDesc')}</p>
            </div>
          ) : noMoreEntries ? (
            <div style={{ padding: '50px 20px', textAlign: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '16px', border: '1px solid #10b981' }}>
              <h4 style={{ color: '#10b981', margin: '0 0 10px 0' }}>{t('roomAllVoted')}</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>{t('roomAllVotedDesc')}</p>
            </div>
          ) : voteEntry ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div onClick={() => setFullscreenData({url: getImageUrl(voteEntry?.drive_file_id, voteEntry?.file_url), title: 'Arena'})} style={{ width: '100%', height: '380px', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-in' }}>
                <img src={getImageUrl(voteEntry?.drive_file_id, voteEntry?.file_url)} alt="Vote" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={handleImageError} />
              </div>

              {/* ── 🎯 VALÓDI ADATBÁZIS EXIF DIAGNOSZTIKAI MEGJELENÍTŐ KÁRTYA ── */}
              <div style={{ width: '100%', background: '#0f172a', padding: '15px', borderRadius: '14px', marginBottom: '20px', border: '1px solid #232f46', boxSizing: 'border-box' }}>
                {isLegacyPhoto ? (
                  <div style={{ background: '#f59e0b15', color: '#fbbf24', padding: '6px 12px', borderRadius: '8px', border: '1px solid #fbbf2430', fontWeight: 'bold', marginBottom: '12px', fontSize: '0.8rem', textAlign: 'center' }}>
                    ℹ️ Exif hiányzik: korábban feltöltött kép
                  </div>
                ) : isAiSuspect ? (
                  <div style={{ background: '#ef444415', color: '#f87171', padding: '6px 12px', borderRadius: '8px', border: '1px solid #ef444430', fontWeight: 'bold', marginBottom: '12px', fontSize: '0.8rem', textAlign: 'center' }}>
                    ⚠️ AI GYANÚ: Hiányzó hardveres pecsét!
                  </div>
                ) : null}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 15px', fontSize: '0.8rem', color: '#94a3b8' }}>
                  <div>📷 {t('mapExifCamera')} <b style={{ color:切换🎨 => isLegacyPhoto ? '#475569' : '#f8fafc' }}>{voteEntry.camera || '-'}</b></div>
                  <div>🔭 {t('mapExifLens')} <b style={{ color: isLegacyPhoto ? '#475569' : '#f8fafc' }}>{voteEntry.lens || '-'}</b></div>
                  <div>⏱️ Záridő / ISO: <b style={{ color: isLegacyPhoto ? '#475569' : '#38bdf8' }}>{voteEntry.shutter || '-'} / {voteEntry.iso || '-'}</b></div>
                  <div>💿 Szoftver: <b style={{ color: isLegacyPhoto ? '#475569' : '#a78bfa' }}>{voteEntry.software || '-'}</b></div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', width: '100%', flexDirection: 'column' }}>
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
              </div>
            </div>
          ) : <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>{t('roomLoadingPhoto')}</div>}
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155' }}>
          <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.4rem' }}>{t('roomMyEntry')}</h3>
          {!myEntry && (
            <div style={{ marginTop: '15px' }}>
              <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileSelect} style={{ color: '#cbd5e1', marginBottom: '15px' }} />
              <button onClick={handleUpload} disabled={isUploading || !uploadPreview} style={{ width: '100%', background: '#0ea5e9', color: 'white', padding: '14px', borderRadius: '12px', fontWeight: 'bold', border: 'none' }}>
                {isUploading ? t('roomUploadingInProgress') : t('roomUploadSubmitBtn')}
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
