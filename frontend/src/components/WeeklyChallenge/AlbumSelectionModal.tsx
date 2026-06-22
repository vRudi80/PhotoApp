import React, { useMemo } from 'react';
import { getImageUrl } from '../../utils/helpers';
import { BACKEND_URL } from '../../utils/constants';

// 🎯 Aktiváljuk a nyelvi kontextust
import { useLanguage } from '../../context/LanguageContext';

interface AlbumSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  albumModalMode: 'upload' | 'swap';
  swapAlbumPhotos: any[];
  myPastEntries: any[];
  topic: any;
  user: any;
  isLoading: boolean; // 👈 ÚJ PROP: A szülőtől kapott betöltési állapot
  setIsUploading: (b: boolean) => void;
  setIsSwapping: (b: boolean) => void;
  fetchCurrentTopic: (isSilent: boolean) => void;
  handleSwapBackSubmit: (id: number) => void;
  handleSelectPhotoForSwap: (url: string) => void;
}

export default function AlbumSelectionModal({
  isOpen, onClose, albumModalMode, swapAlbumPhotos, myPastEntries, topic, user, isLoading,
  setIsUploading, setIsSwapping, fetchCurrentTopic, handleSwapBackSubmit, handleSelectPhotoForSwap
}: AlbumSelectionModalProps) {
  
  const { t } = useLanguage();

  // 🏎️ OPTIMALIZÁLÁS: Keresési Hash-Map építése ($O(1)$ komplexitás)
  const pastEntriesMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(myPastEntries)) {
      myPastEntries.forEach(entry => {
        if (entry.file_url) map.set(entry.file_url, entry);
      });
    }
    return map;
  }, [myPastEntries]);

  // 🏎️ OPTIMALIZÁLÁS: Pehelysúlyú Cloudinary Thumbnail generátor
  const getOptimizedThumbnail = (rawUrl: string) => {
    const url = getImageUrl(null, rawUrl);
    if (url && url.includes('cloudinary.com')) {
      return url.replace('/upload/', '/upload/w_300,h_220,c_fill,g_auto,q_auto,f_auto/');
    }
    return url;
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '24px', width: '100%', maxWidth: '550px', maxHeight: '80vh', overflowY: 'auto', padding: '25px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
        
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: '#1e293b', border: 'none', color: '#94a3b8', fontSize: '1.2rem', width: '35px', height: '35px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✖</button>
        
        <h3 style={{ color: 'white', margin: '0 0 5px 0', fontSize: '1.5rem', fontWeight: 'bold' }}>
          {albumModalMode === 'upload' ? t('modalUploadTitle') : t('modalSwapTitle')}
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: '1.4' }}>
          {albumModalMode === 'upload' ? t('modalUploadDesc') : t('modalSwapDesc')}
        </p>
        
        {/* 🎯 INTILLIGENS UX-ZÓNA: Ha tölt a háttér, azonnal mutatjuk a spinnert a modalban */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', width: '100%' }}>
            <div className="modal-data-spinner" />
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '15px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
              {t('loading') || 'Képtár szinkronizálása...'}
            </p>
          </div>
        ) : !swapAlbumPhotos || swapAlbumPhotos.length === 0 ? (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: '30px', background: '#1e293b30', borderRadius: '16px', border: '1px dashed #334155' }}>
            Nincsenek képek a galériádban.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
            {swapAlbumPhotos.map((p, idx) => {
              const pastMatch = albumModalMode === 'swap' ? pastEntriesMap.get(p.file_url) : null;
              
              return (
                <div 
                  key={p.id || idx} 
                  onClick={async () => {
                    if (albumModalMode === 'upload') {
                      if (!window.confirm(t('msgUploadConfirm'))) return;
                      setIsUploading(true);
                      onClose();
                      try {
                        const selectRes = await fetch(`${BACKEND_URL}/api/weekly/upload-existing`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ topicId: topic.id, userEmail: user.email, userName: user.name, fileUrl: p.file_url })
                        });
                        if (selectRes.ok) {
                          alert(t('msgUploadSuccess'));
                          fetchCurrentTopic(false);
                        } else {
                          const err = await selectRes.json(); alert(err.error);
                        }
                      } catch (e) {
                        alert(t('msgUploadError'));
                      } finally {
                        setIsUploading(false);
                      }
                    } else {
                      if (pastMatch) {
                        onClose(); 
                        handleSwapBackSubmit(pastMatch.id || pastMatch._id); 
                      } else {
                        handleSelectPhotoForSwap(p.file_url); 
                      }
                    }
                  }}
                  style={{ 
                    background: '#1e293b', borderRadius: '14px', overflow: 'hidden', 
                    border: pastMatch ? '2px solid #0284c7' : '2px solid #334155', 
                    cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', position: 'relative' 
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = pastMatch ? '#38bdf8' : '#f43f5e'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = pastMatch ? '#0284c7' : '#334155'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <div style={{ width: '100%', height: '115px', backgroundColor: '#000', overflow: 'hidden', position: 'relative' }}>
                    <img src={getOptimizedThumbnail(p.file_url)} alt="Gallery asset" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    
                    {pastMatch && (
                      <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: 'white', fontWeight: 'bold', fontSize: '0.65rem', padding: '4px 8px', borderRadius: '6px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', border: '1px solid #38bdf840' }}>
                        {t('modalBadgeSwapBack')}
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', background: '#090d16', borderTop: '1px solid #232d3f', fontWeight: 'bold' }}>
                    <span style={{ color: '#fbbf24' }}>⭐ {pastMatch ? pastMatch.likes_count : (p.totalLikes || 0)}</span>
                    <span style={{ color: '#38bdf8' }}>👁️ {pastMatch ? pastMatch.views_count : (p.totalViews || 0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL SPINNER STYLING GENERATOR */}
      <style>{`
        .modal-data-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(56, 189, 248, 0.1);
          border-left-color: #38bdf8;
          border-radius: 50%;
          animation: modalFloatCircle 0.8s linear infinite;
        }
        @keyframes modalFloatCircle {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}
