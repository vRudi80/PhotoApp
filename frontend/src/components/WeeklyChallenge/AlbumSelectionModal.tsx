import React, { useMemo, useState, useRef, useEffect } from 'react';
import { getImageUrl } from '../../utils/helpers';
import { BACKEND_URL } from '../../utils/constants';
import exifr from 'exifr';

// 🎯 Nyelvi kontextus aktiválása
import { useLanguage } from '../../context/LanguageContext';

// 🏎️ GOLYÓÁLLÓ KLIIENSOLDALI KÉPTÖMÖRÍTŐ MOTOR
const compressImageOnClient = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_SIZE = 1920;
            if (width > height) {
              if (width > MAX_SIZE) { height = Math.round((height * MAX_SIZE) / width); width = MAX_SIZE; }
            } else {
              if (height > MAX_SIZE) { width = Math.round((width * MAX_SIZE) / height); height = MAX_SIZE; }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg', lastModified: Date.now() }));
              } else { resolve(file); }
            }, 'image/jpeg', 0.82);
          } catch (e) {
            resolve(file); // Hiba esetén az eredeti fájlt adjuk vissza, nem fagyasztjuk le az UI-t
          }
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    } catch (err) {
      resolve(file);
    }
  });
};

interface AlbumSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  albumModalMode: 'upload' | 'swap';
  swapAlbumPhotos: any[];
  myPastEntries: any[];
  topic: any;
  user: any;
  isLoading: boolean;
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [previewPhoto, setPreviewPhoto] = useState<any | null>(null);
  const [isLocalProcessing, setIsLocalProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // LUSTA LAPOZÓ RENDSZER (Fokozatos 12-es lépték)
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    if (isOpen) {
      setVisibleCount(12);
    }
  }, [isOpen]);

  // 🛡️ SECURITY LOCK: ESC Letiltása
  useEffect(() => {
    if (!isOpen) return;
    const preventEscClose = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', preventEscClose, true);
    return () => window.removeEventListener('keydown', preventEscClose, true);
  }, [isOpen]);

  const handleModalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 80) {
      triggerLoadMore();
    }
  };

  const triggerLoadMore = () => {
    if (visibleCount < swapAlbumPhotos.length) {
      setVisibleCount(prev => prev + 12);
    }
  };

  const pastEntriesMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(myPastEntries)) {
      myPastEntries.forEach(entry => { if (entry.file_url) map.set(entry.file_url, entry); });
    }
    return map;
  }, [myPastEntries]);

  const getOptimizedThumbnail = (rawUrl: string) => {
    const url = getImageUrl(null, rawUrl);
    if (url && url.includes('cloudinary.com')) {
      return url.replace('/upload/', '/upload/w_300,h_220,c_fill,g_auto,q_auto,f_auto/');
    }
    return url;
  };

  // ➕ TALLÓZOTT FÁJL FELDOLGOZÁSA ÉS KORREKT ADAT-KIBÁNYÁSZÁSA
  const handleLocalFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const rawFile = e.target.files[0];
      setIsLocalProcessing(true);
      
      let camera = '-', lens = '-', shutter = '-', iso = '-', aperture = '-', software = '-';
      try {
        const exifData = await exifr.parse(rawFile);
        if (exifData) {
          if (exifData.Model) {
            const makePrefix = exifData.Make && !exifData.Model.startsWith(exifData.Make) ? `${exifData.Make} ` : '';
            camera = `${makePrefix}${exifData.Model}`;
          } else if (exifData.Make) { camera = exifData.Make; }
          lens = exifData.LensModel || '-';
          if (exifData.ExposureTime) {
            shutter = exifData.ExposureTime < 1 ? `1/${Math.round(1 / exifData.ExposureTime)}s` : `${exifData.ExposureTime}s`;
          }
          iso = exifData.ISO ? String(exifData.ISO) : '-';
          aperture = exifData.FNumber ? `f/${exifData.FNumber}` : '-';
          software = exifData.Software || '-';
        }
      } catch (err) { console.log("Nincs EXIF pecsét vagy hiba történt az olvasásakor."); }

      let finalFile = rawFile;
      try {
        if (rawFile.size > 1.5 * 1024 * 1024) {
          finalFile = await compressImageOnClient(rawFile);
        }
      } catch (compressErr) { console.error("Biztonsági mentés: Eredeti fájl megtartva."); }

      setPreviewPhoto({
        isLocal: true,
        file: finalFile,
        file_url: URL.createObjectURL(finalFile),
        exif: { camera, lens, shutter, iso, aperture, software }
      });
      
      setIsLocalProcessing(false);
      e.target.value = ''; // 🌟 ALAPHELYZET: Kiürítjük a natív értéket a re-select javításához!
    }
  };

  const handleConfirmAction = async () => {
    if (!previewPhoto) return;
    setIsSubmitting(true);

    try {
      if (previewPhoto.isLocal) {
        const formData = new FormData();
        formData.append('photo', previewPhoto.file);
        formData.append('userEmail', user.email);
        formData.append('topicId', topic.id.toString());
        formData.append('userName', user.name || user.email);
        formData.append('camera', previewPhoto.exif.camera);
        formData.append('lens', previewPhoto.exif.lens);
        formData.append('shutter', previewPhoto.exif.shutter);
        formData.append('iso', previewPhoto.exif.iso);
        formData.append('aperture', previewPhoto.exif.aperture);
        formData.append('software', previewPhoto.exif.software);

        const endpoint = albumModalMode === 'upload' ? 'upload' : 'swap';
        const res = await fetch(`${BACKEND_URL}/api/weekly/${endpoint}`, { method: 'POST', body: formData });
        if (res.ok) {
          alert(t('msgUploadSuccess') || "Sikeres mentés!");
          cleanAndClose();
        } else {
          const err = await res.json(); alert(err.error || "Hiba");
        }
      } else {
        if (previewPhoto.isPastMatch) {
          handleSwapBackSubmit(previewPhoto.pastMatchId);
          cleanAndClose();
        } else {
          const endpoint = albumModalMode === 'upload' ? 'upload-existing' : 'swap-existing';
          const res = await fetch(`${BACKEND_URL}/api/weekly/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topicId: topic.id, userEmail: user.email, userName: user.name, fileUrl: previewPhoto.file_url })
          });
          if (res.ok) {
            alert(t('msgUploadSuccess') || "Sikeres rögzítés!");
            cleanAndClose();
          } else {
            const err = await res.json(); alert(err.error);
          }
        }
      }
    } catch (e) {
      alert("Hálózati hiba!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cleanAndClose = () => {
    if (previewPhoto?.isLocal && previewPhoto.file_url) {
      URL.revokeObjectURL(previewPhoto.file_url);
    }
    setPreviewPhoto(null);
    onClose();
    fetchCurrentTopic(false);
  };

  if (!isOpen) return null;

  const renderedPhotos = swapAlbumPhotos.slice(0, visibleCount);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
      <div 
        ref={scrollAreaRef}
        onScroll={previewPhoto ? undefined : handleModalScroll}
        style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '24px', width: '100%', maxWidth: '550px', maxHeight: '82vh', overflowY: 'auto', padding: '25px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}
      >
        
        {/* ── NÉZET A: THEATER / PREVIEW MODUS ── */}
        {previewPhoto ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.15s ease' }}>
            <h3 style={{ color: 'white', margin: 0, fontSize: '1.3rem', fontWeight: 'bold' }}>🔎 {t('roomPreviewLabel') || 'Nevezési előnézet'}</h3>
            
            <div style={{ width: '100%', height: '260px', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #334155' }}>
              <img src={previewPhoto.isLocal ? previewPhoto.file_url : getImageUrl(null, previewPhoto.file_url)} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>

            {previewPhoto.exif && (
              <div style={{ background: '#1e293b70', padding: '14px', borderRadius: '12px', border: '1px solid #334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📷 Gép: <b>{previewPhoto.exif.camera}</b></div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📐 Optika: <b>{previewPhoto.exif.lens}</b></div>
                <div>⏱️ Záridő: <b>{previewPhoto.exif.shutter}</b></div>
                <div>💎 ISO: <b>{previewPhoto.exif.iso}</b></div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button disabled={isSubmitting} onClick={() => setPreviewPhoto(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>
                ⬅ {t('modalBackToAlbum')}
              </button>
              <button disabled={isSubmitting} onClick={handleConfirmAction} style={{ flex: 1.6, padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.25)', fontSize: '0.9rem' }}>
                {isSubmitting ? '⏳ Processing...' : 'Megerősítés ✔'}
              </button>
            </div>
          </div>
        ) : (
          /* ── NÉZET B: ALBUM GRID ── */
          <>
            <h3 style={{ color: 'white', margin: '0 0 5px 0', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {albumModalMode === 'upload' ? t('modalUploadTitle') : t('modalSwapTitle')}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: '1.4' }}>
              {albumModalMode === 'upload' ? t('modalUploadDesc') : t('modalSwapDesc')}
            </p>
            
            {isLoading || isLocalProcessing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', width: '100%' }}>
                <div className="modal-data-spinner" />
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '15px', fontWeight: 'bold' }}>{isLocalProcessing ? 'Fájl elemzése és tömörítése...' : t('loading')}</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '15px' }}>
                  
                  {/* 🎯 JAVÍTVA: Biztonságos és törhetetlen láthatatlan overlay input struktúra */}
                  <div 
                    style={{ position: 'relative', background: '#0f172a', borderRadius: '14px', border: '2px dashed #f59e0b50', height: '153px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', overflow: 'hidden' }}
                    className="upload-overlay-card-wrapper"
                  >
                    <input 
                      type="file" 
                      accept="image/jpeg, image/png, image/webp" 
                      onChange={handleLocalFileSelect}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} 
                    />
                    <div style={{ fontSize: '1.8rem' }}>📁</div>
                    <span style={{ color: '#fbbf24', fontSize: '0.78rem', fontWeight: 'bold', textAlign: 'center', padding: '0 10px' }}>Új kép tallózása</span>
                  </div>

                  {/* KÉPRÁCS HÁLÓ */}
                  {renderedPhotos.map((p, idx) => {
                    const pastMatch = albumModalMode === 'swap' ? pastEntriesMap.get(p.file_url) : null;
                    return (
                      <div 
                        key={p.id || idx} 
                        onClick={() => setPreviewPhoto({
                          isLocal: false,
                          file_url: p.file_url,
                          isPastMatch: !!pastMatch,
                          pastMatchId: pastMatch ? pastMatch.id : null,
                          exif: p.camera ? { camera: p.camera, lens: p.lens || '-', shutter: p.shutter || '-', iso: p.iso || '-' } : null
                        })}
                        style={{ 
                          background: '#1e293b', borderRadius: '14px', overflow: 'hidden', 
                          border: pastMatch ? '2px solid #0284c7' : '2px solid #334155', 
                          cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', position: 'relative' 
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = pastMatch ? '#38bdf8' : '#f43f5e'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = pastMatch ? '#0284c7' : '#334155'; e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        <div style={{ width: '100%', height: '115px', backgroundColor: '#000', overflow: 'hidden', position: 'relative' }}>
                          <img src={getOptimizedThumbnail(p.file_url)} alt="Gallery asset" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                          {pastMatch && (
                            <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: 'white', fontWeight: 'bold', fontSize: '0.65rem', padding: '4px 8px', borderRadius: '6px' }}>
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

                {/* INTERAKTÍV KATTINTHATÓ PAGING SÁV */}
                {visibleCount < swapAlbumPhotos.length && (
                  <div 
                    onClick={triggerLoadMore}
                    style={{ textAlign: 'center', color: '#38bdf8', fontSize: '0.85rem', padding: '16px 0', fontStyle: 'italic', fontWeight: 'bold', cursor: 'pointer', background: 'rgba(56,189,248,0.05)', borderRadius: '12px', marginTop: '15px', border: '1px solid rgba(56,189,248,0.15)', userSelect: 'none', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.12)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(56,189,248,0.05)'}
                  >
                    ✨ {t('modalLoadMore') || 'További képek betöltése...'}
                  </div>
                )}

                {/* BEZÁRÁS SÁV */}
                <div style={{ marginTop: '25px', borderTop: '1px solid #223147', paddingTop: '15px' }}>
                  <button onClick={cleanAndClose} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#1e293b', color: '#f43f5e', border: '1px solid #be123c40', fontWeight: 'bold', cursor: 'pointer' }}>
                    Mégse / Bezárás
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <style>{`
        .modal-data-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(56, 189, 248, 0.1);
          border-left-color: #38bdf8;
          border-radius: 50%;
          animation: modalFloatCircle 0.8s linear infinite;
        }
        .upload-overlay-card-wrapper:hover {
          background: #1e293b40 !important;
          border-color: #f59e0b !important;
        }
        @keyframes modalFloatCircle {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
