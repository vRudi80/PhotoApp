import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';
import VideoLoader from '../components/VideoLoader';

// Nyelvi kontextus betöltése
import { useLanguage } from '../context/LanguageContext';

// 🎯 ÚJ: Professzionális Lucide Ikonok importálása az AI-sallangok ellen
import { 
  Image as ImageIcon, 
  Sword, 
  Crown, 
  Trophy, 
  Star, 
  Eye, 
  History, 
  X, 
  Calendar,
  AlertCircle,
  Layers
} from 'lucide-react';

interface MyArenaAlbumViewProps {
  user: any;
  setFullscreenData: (data: any) => void;
}

export default function MyArenaAlbumView({ user, setFullscreenData }: MyArenaAlbumViewProps) {
  // Aktiváljuk a fordítót (t) és a nyelvi állapotot (lang)
  const { t, lang } = useLanguage();

  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  
  useEffect(() => {
    let isMounted = true;

    const fetchAlbum = async () => {
      if (!user?.email) return;

      try {
        setLoading(true);
        const res = await fetch(`${BACKEND_URL}/api/weekly/my-album?userEmail=${user.email}`);
        if (res.ok && isMounted) {
          setPhotos(await res.json());
        }
      } catch (e) {
        console.error("Hiba az album betöltésekor:", e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAlbum();

    return () => {
      isMounted = false;
    };
  }, [user?.email]);

  if (loading) {
    return <VideoLoader />;
  }

  if (photos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#131b2e', borderRadius: '8px', border: '1px solid #222f47' }}>
        <ImageIcon size={32} color="#475569" style={{ marginBottom: '12px' }} />
        <h3 style={{ color: 'white', fontSize: '1.2rem', margin: '0 0 6px 0', fontWeight: '600' }}>{t('arenaAlbumEmptyTitle')}</h3>
        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>{t('arenaAlbumEmptyDesc')}</p>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: 'white', margin: 0, fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}><ImageIcon size={18} color="#38bdf8" /> {t('arenaAlbumTitle')}</h2>
        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>{t('arenaAlbumSubtitle')}</p>
      </div>

      {/* FOTÓ MÁTRIX RÁCS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '16px' }}>
        {photos.map((photo) => (
          <div 
            key={photo.id}
            style={{ background: '#131b2e', borderRadius: '8px', overflow: 'hidden', border: '1px solid #222f47', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', position: 'relative', transition: 'all 0.2s ease-in-out' }}
            className="album-asset-card"
          >
            {/* 🎯 MÓDOSÍTVA: Színátmenetes plecsni helyett letisztult outline csatamedál */}
            {photo.isCurrentlyActive && (
              <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(16,185,129,0.08)', color: '#10b981', fontWeight: 'bold', fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px', zIndex: 10, border: '1px solid rgba(16,185,129,0.2)', display: 'inline-flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                <Sword size={10} /> {t('arenaAlbumInBattle')}
              </span>
            )}

            {/* KÁRTYA BÉLYEGKÉP DOBOGÓS JELZÉSEI */}
            {(photo.firstPlaces > 0 || photo.podiums > 0) && (
              <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(9,13,22,0.85)', backdropFilter: 'blur(4px)', padding: '3px 8px', borderRadius: '4px', zIndex: 10, display: 'flex', gap: '6px', fontSize: '0.72rem', fontWeight: 'bold', border: '1px solid #222f47', alignItems: 'center' }}>
                {photo.firstPlaces > 0 && <span style={{ color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Crown size={10} /> {photo.firstPlaces}</span>}
                {photo.podiums > 0 && <span style={{ color: '#cbd5e1', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Trophy size={10} /> {photo.podiums}</span>}
              </div>
            )}

            <div style={{ width: '100%', height: '170px', backgroundColor: '#090d16', overflow: 'hidden', position: 'relative' }}>
              <img 
                src={getImageUrl(null, photo.file_url)} 
                alt="" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
                onClick={() => setFullscreenData({ url: getImageUrl(null, photo.file_url), title: t('tabAlbum') || 'Galéria' })}
              />
            </div>

            <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0f172a', borderTop: '1px solid #222f47' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '10px', fontWeight: 'bold' }}>
                <span style={{ color: '#f97316', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Star size={12} fill="#f97316" /> {photo.totalLikes || 0} {lang === 'en' ? 'pts' : 'pont'}</span>
                <span style={{ color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Eye size={12} /> {photo.totalViews || 0} {lang === 'en' ? 'views' : 'megtek.'}</span>
              </div>

              <button 
                onClick={() => setSelectedPhoto(photo)}
                style={{ width: '100%', background: '#222f47', border: '1px solid #334155', color: '#cbd5e1', padding: '8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                className="album-card-details-btn"
              >
                <History size={12} />
                <span>{t('arenaAlbumBtnDetails')} ({photo.history?.length || 0})</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 📊 RÉSZLETES IDŐVONAL MODAL */}
      {selectedPhoto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,13,22,0.92)', backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
          <div style={{ background: '#131b2e', border: '1px solid #222f47', borderRadius: '8px', width: '100%', maxWidth: '520px', maxHeight: '80vh', overflowY: 'auto', padding: '24px', position: 'relative', boxSizing: 'border-box', boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>
            
            <button 
              onClick={() => setSelectedPhoto(null)} 
              style={{ position: 'absolute', top: '16px', right: '16px', background: '#222f47', border: '1px solid #334155', color: '#94a3b8', width: '28px', height: '28px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s' }}
              className="album-modal-close-cross"
            >
              <X size={14} />
            </button>
            
            <h3 style={{ color: 'white', margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: '600', letterSpacing: '-0.2px' }}>{t('arenaAlbumModalTitle')}</h3>
            <p style={{ color: '#475569', fontSize: '0.78rem', margin: '0 0 16px 0', fontWeight: '500' }}>{t('arenaAlbumModalUploaded')}: {new Date(selectedPhoto.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'hu-HU')}</p>
            
            <div style={{ width: '100%', height: '200px', backgroundColor: '#090d16', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px', border: '1px solid #222f47' }}>
              <img src={getImageUrl(null, selectedPhoto.file_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>

            {/* DICSŐSÉG JELVÉNYEK PANELJE SZILÁRD SZOFTVERES VERZIÓBAN */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#0f172a', padding: '10px', borderRadius: '4px', border: '1px solid rgba(251,191,36,0.2)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <Crown size={16} color="#fbbf24" fill="#fbbf24" />
                <div style={{ color: 'white', fontWeight: '700', fontSize: '1.05rem', marginTop: '2px' }}>{selectedPhoto.firstPlaces} {lang === 'en' ? 'x' : 'db'}</div>
                <div style={{ color: '#fbbf24', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('arenaAlbumFirstPlace')}</div>
              </div>
              <div style={{ background: '#0f172a', padding: '10px', borderRadius: '4px', border: '1px solid rgba(56,189,248,0.2)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <Trophy size={16} color="#38bdf8" />
                <div style={{ color: 'white', fontWeight: '700', fontSize: '1.05rem', marginTop: '2px' }}>{selectedPhoto.podiums} {lang === 'en' ? 'x' : 'db'}</div>
                <div style={{ color: '#38bdf8', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('arenaAlbumPodiumPlace')}</div>
              </div>
            </div>

            <h4 style={{ color: 'white', fontSize: '0.9rem', fontWeight: '600', marginBottom: '10px', borderBottom: '1px solid #222f47', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <History size={12} color="#64748b" /> {t('arenaAlbumHistoryTitle').replace('{count}', (selectedPhoto.history?.length || 0).toString())}
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedPhoto.history.map((h: any, hIdx: number) => {
                const isLive = h.is_topic_live === 1;
                const isSwapped = h.is_active === 0;
                const isWinner = Number(h.entry_rank) === 1;
                const isPodium = Number(h.entry_rank) <= 3;
                
                let rowBorder = '1px solid #222f47';
                let rankBadgeColor = '#475569';
                let rankText = lang === 'en' ? `Rank ${h.entry_rank}` : `${h.entry_rank}. Hely`;
                
                if (isLive) {
                  rowBorder = '1px solid rgba(16,185,129,0.25)';
                  rankBadgeColor = '#10b981';
                  rankText = lang === 'en' ? `Active #${h.entry_rank}` : `Aktív #${h.entry_rank}`;
                } else if (isSwapped) {
                  rowBorder = '1px dashed rgba(239,68,68,0.2)';
                  rankBadgeColor = '#ef4444';
                  rankText = t('arenaAlbumHistorySwapped');
                } else if (isWinner) {
                  rowBorder = '1px solid rgba(251,191,36,0.4)';
                  rankBadgeColor = '#fbbf24';
                } else if (isPodium) {
                  rowBorder = '1px solid rgba(168,85,247,0.3)';
                  rankBadgeColor = '#a855f7';
                }

                return (
                  <div key={hIdx} style={{ background: '#0f172a', border: rowBorder, padding: '10px 12px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
                    <div style={{ flex: 1, marginRight: '8px', minWidth: 0 }}>
                      <div style={{ color: 'white', fontWeight: '600', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.topic_title}</div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '2px', fontSize: '0.75rem', color: '#475569' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Star size={10} fill="#475569" /> <b>{h.likes_count}</b> {lang === 'en' ? 'pts' : 'pont'}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Eye size={10} /> <b>{h.views_count}</b> {lang === 'en' ? 'views' : 'nézet'}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                      <span style={{ background: 'rgba(255,255,255,0.01)', color: rankBadgeColor, border: `1px solid ${rankBadgeColor}30`, padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', minWidth: '70px', display: 'inline-block', textAlign: 'center' }}>
                        {rankText}
                      </span>
                      <small style={{ color: '#475569', fontSize: '0.68rem' }}>
                        {isSwapped 
                          ? (lang === 'en' ? 'Replaced' : 'Cserélve') 
                          : (lang === 'en' ? `of ${h.total_entries}` : `/${h.total_entries} kép`)}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}
      
      <style>{`
        .album-asset-card:hover {
          border-color: #475569 !important;
          transform: translateY(-2px);
        }
        .album-card-details-btn:hover {
          background: #2d3a54 !important;
          border-color: #475569 !important;
          color: white !important;
        }
        .album-modal-close-cross:hover {
          background: #334155 !important;
          color: white !important;
        }
      `}</style>
    </div>
  );
}
