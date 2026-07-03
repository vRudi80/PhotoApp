import React, { useMemo, useState, useRef, useEffect } from 'react';
import { getImageUrl } from '../../utils/helpers';
import { BACKEND_URL } from '../../utils/constants';
import exifr from 'exifr';

// Behozzuk a nyelvi kontextust
import { useLanguage } from '../../context/LanguageContext';

// Behozzuk a téma környezetet
import { useTheme } from '../../context/ThemeContext';

// Professzionális Lucide Ikonok importálása az AI-sallangok ellen
import { 
  FolderPlus, 
  Camera, 
  Sliders, 
  Clock, 
  Zap, 
  Star, 
  Eye, 
  Check, 
  ArrowLeft, 
  AlertCircle, 
  Loader2, 
  X,
  Image as ImageIcon
} from 'lucide-react';

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
          } catch (e) { resolve(file); }
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    } catch (err) { resolve(file); }
  });
};

function GridImage({ src, alt }: { src: string; alt: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#090d16' }}>
      {!isLoaded && (
        <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-main)', opacity: 0.6 }} />
      )}
      <img 
        src={src} 
        alt={alt} 
        onLoad={() => setIsLoaded(true)}
        loading="lazy"
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover', 
          opacity: isLoaded ? 1 : 0, 
          transition: 'opacity 0.3s ease-in-out'
        }} 
      />
    </div>
  );
}

interface AlbumSelectionModalProps {
  isOpen: boolean;
  onClose: (wasActionSubmitted?: boolean) => void;
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
  myEntry?: any;
}

// 🎯 KÖZPONTI AUTH FEJLÉC GENERÁTOR HELYI RENDERSZINTRE
const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('photoAppToken');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

export default function AlbumSelectionModal({
  isOpen, onClose, albumModalMode, swapAlbumPhotos, myPastEntries, topic, user, isLoading,
  setIsUploading, setIsSwapping, fetchCurrentTopic, handleSwapBackSubmit, handleSelectPhotoForSwap,
  myEntry
}: AlbumSelectionModalProps) {
  
  const { t } = useLanguage();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [previewPhoto, setPreviewPhoto] = useState<any | null>(null);
  const [isLocalProcessing, setIsLocalProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  // BIZTONSÁGI VÉDŐHÁLÓ: Környezeti téma lekérése
  let isLight = false;
  try {
    const themeContext = useTheme();
    if (themeContext) {
      isLight = themeContext.theme === 'light';
    }
  } catch (e) {}

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setVisibleCount(12);
    }
  }, [isOpen]);

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

  const filteredAlbumPhotos = useMemo(() => {
    if (!Array.isArray(swapAlbumPhotos)) return [];
    if (albumModalMode === 'swap' && myEntry?.file_url) {
      return swapAlbumPhotos.filter(p => p.file_url !== myEntry.file_url);
    }
    return swapAlbumPhotos;
  }, [swapAlbumPhotos, albumModalMode, myEntry?.file_url]);

  const handleModalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 120) {
      triggerLoadMore();
    }
  };

  const triggerLoadMore = () => {
    if (visibleCount < filteredAlbumPhotos.length) {
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
      } catch (err) { console.log("EXIF olvasási hiba."); }

      let finalFile = rawFile;
      try {
        if (rawFile.size > 1.5 * 1024 * 1024) {
          finalFile = await compressImageOnClient(rawFile);
        }
      } catch (compressErr) { console.error("Tömörítés kihagyva."); }

      const generatedTitle = rawFile.name.replace(/\.[^/.]+$/, "");

      setPreviewPhoto({
        isLocal: true,
        file: finalFile,
        file_url: URL.createObjectURL(finalFile),
        title: generatedTitle,
        exif: { camera, lens, shutter, iso, aperture, software }
      });
      setIsLocalProcessing(false);
      e.target.value = '';
    }
  };

  const handleConfirmAction = async () => {
    if (!previewPhoto) return;
    setIsSubmitting(true);

    try {
      if (previewPhoto.isLocal) {
        const formData = new FormData();
        formData.append('photo', previewPhoto.file);
        formData.append('userEmail', user?.email || '');
        formData.append('topicId', String(topic?.id || ''));
        formData.append('userName', user?.name || user?.email || 'Anonim');
        formData.append('camera', previewPhoto.exif?.camera || '-');
        formData.append('lens', previewPhoto.exif?.lens || '-');
        formData.append('shutter', previewPhoto.exif?.shutter || '-');
        formData.append('iso', previewPhoto.exif?.iso || '-');
        formData.append('aperture', previewPhoto.exif?.aperture || '-');
        formData.append('software', previewPhoto.exif?.software || '-');

        const endpoint = albumModalMode === 'upload' ? 'upload' : 'swap';
        
        // 🎯 JAVÍTVA: Helyi fájl feltöltése és csere hitelesített tokennel (Content-Type nélkül!)
        const res = await fetch(`${BACKEND_URL}/api/weekly/${endpoint}`, { 
          method: 'POST', 
          headers: getAuthHeaders(),
          body: formData 
        });
        if (res.ok) {
          alert(t('msgUploadSuccess') || "Sikeres mentés!");
          cleanAndClose(true);
        } else {
          const err = await res.json().catch(() => ({})); 
          alert(err.error || `Szerveroldali hiba (${res.status}) a kép mentésekor.`);
          setIsSubmitting(false);
        }
      } else {
        if (previewPhoto.isPastMatch) {
          handleSwapBackSubmit(previewPhoto.pastMatchId);
          cleanAndClose(true);
        } else {
          const endpoint = albumModalMode === 'upload' ? 'upload-existing' : 'swap-existing';
          
          const jsonPayload = {
            topicId: topic?.id || 0,
            topic_id: topic?.id || 0,
            userEmail: user?.email || '',
            user_email: user?.email || '',
            userName: user?.name || user?.email || 'Anonim',
            user_name: user?.name || user?.email || 'Anonim',
            fileUrl: previewPhoto.file_url || '',
            file_url: previewPhoto.file_url || '',
            camera: previewPhoto.exif?.camera || '-',
            lens: previewPhoto.exif?.lens || '-',
            shutter: previewPhoto.exif?.shutter || '-',
            iso: previewPhoto.exif?.iso || '-',
            aperture: previewPhoto.exif?.aperture || '-',
            software: previewPhoto.exif?.software || '-'
          };

          // 🎯 JAVÍTVA: Galériás fotó kiválasztása hitelesített tokennel és JSON fejléccel
          const res = await fetch(`${BACKEND_URL}/api/weekly/${endpoint}`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }), 
            body: JSON.stringify(jsonPayload)
          });
          
          if (res.ok) {
            alert(t('msgUploadSuccess') || "Sikeres rögzítés!");
            cleanAndClose(true);
          } else {
            const err = await res.json().catch(() => ({})); 
            alert(`Szerver elutasítás (${res.status}): ${err.error || 'A kép formátuma vagy elérése hibás.'}`);
            setIsSubmitting(false);
          }
        }
      }
    } catch (e) {
      alert("Kritikus hálózati hiba lépett fel a küldés során.");
      setIsSubmitting(false);
    }
  };

  const cleanAndClose = (wasActionSubmitted = false) => {
    if (previewPhoto?.isLocal && previewPhoto.file_url) {
      URL.revokeObjectURL(previewPhoto.file_url);
    }
    setPreviewPhoto(null);
    onClose(wasActionSubmitted); 
  };

  if (!isOpen) return null;

  const renderedPhotos = filteredAlbumPhotos.slice(0, visibleCount);

  return (
    <div 
      ref={scrollAreaRef}
      className="modal-scroll-zone"
      onScroll={previewPhoto ? undefined : handleModalScroll}
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: isLight ? 'rgba(240,244,248,0.92)' : 'rgba(9,13,22,0.92)', 
        backdropFilter: 'blur(6px)', 
        zIndex: 99999, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'flex-start', 
        padding: '40px 16px', 
        boxSizing: 'border-box',
        overflowY: 'auto', 
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <div 
        style={{ 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-main)', 
          borderRadius: '8px', 
          width: '100%', 
          maxWidth: '520px', 
          padding: '24px', 
          position: 'relative', 
          boxShadow: '0 12px 30px rgba(0,0,0,0.1)',
          margin: 'auto 0' 
        }}
      >
        
        {/* Felső abszolút bezárás gomb */}
        <button 
          onClick={() => cleanAndClose(false)} 
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: '#f43f5e', width: '28px', height: '28px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s', zIndex: 110 }}
          className="modal-top-close-cross"
          title="Bezárás"
        >
          <X size={14} />
        </button>
        
        {/* ── NÉZET A: INTELIGENS FOTÓ ELŐNÉZET / INSPECTOR ── */}
        {previewPhoto ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.15s ease' }}>
            <h3 style={{ color: 'var(--text-title)', margin: 0, fontSize: '1.15rem', fontWeight: '600', letterSpacing: '-0.2px', display: 'flex', alignItems: 'center', gap: '8px' }}><ImageIcon size={16} color="#38bdf8" /> {t('roomPreviewLabel') || 'Nevezési előnézet'}</h3>
            
            <div style={{ width: '100%', height: '250px', backgroundColor: '#090d16', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-main)' }}>
              <img src={previewPhoto.isLocal ? previewPhoto.file_url : getImageUrl(null, previewPhoto.file_url)} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>

            {previewPhoto.exif && (
              <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-main)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: '0.78rem', color: 'var(--text-body)' }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>📷 Gép:</span> <b style={{ color: 'var(--text-title)' }}>{previewPhoto.exif.camera}</b></div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>📐 Optika:</span> <b style={{ color: 'var(--text-title)' }}>{previewPhoto.exif.lens}</b></div>
                <div><span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>⏱️ Záridő:</span> <b style={{ color: '#38bdf8' }}>{previewPhoto.exif.shutter}</b></div>
                <div><span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>💎 ISO:</span> <b style={{ color: '#a78bfa' }}>{previewPhoto.exif.iso}</b></div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button disabled={isSubmitting} onClick={() => setPreviewPhoto(null)} style={{ flex: 1, padding: '10px', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-title)', border: '1px solid var(--border-main)', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <ArrowLeft size={14} /> {t('modalBackToAlbum', 'Vissza')}
              </button>
              <button disabled={isSubmitting} onClick={handleConfirmAction} style={{ flex: 1.5, padding: '10px', borderRadius: '4px', background: '#10b981', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {isSubmitting ? <Loader2 size={14} style={{ animation: 'modalFloatCircle 0.8s linear infinite' }} /> : <Check size={14} />}
                <span>{isSubmitting ? 'Processing...' : 'Megerősítés ✔'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* ── NÉZET B: PREMIÚM MÉDIA MÁTRIX RÁCS ── */
          <>
            <h3 style={{ color: 'var(--text-title)', margin: '0 0 4px 0', fontSize: '1.3rem', fontWeight: '600', letterSpacing: '-0.3px', paddingRight: '30px' }}>
              {albumModalMode === 'upload' ? t('modalUploadTitle', 'Versenynevezés') : t('modalSwapTitle', 'Joker Csere')}
            </h3>
            <p style={{ color: 'var(--text-body)', fontSize: '0.82rem', margin: '0 0 20px 0', lineHeight: '1.45' }}>
              Melyik meglévő galériás fotóddal szeretnél nevezni a mostani futamra?
            </p>
            
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 0', width: '100%', gap: '12px' }}>
                <Loader2 size={24} color="#38bdf8" style={{ animation: 'modalFloatCircle 0.8s linear infinite' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 'bold', margin: 0 }}>{t('loading', 'Betöltés...')}</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                  
                  {/* TALLÓZÓ REKASZ */}
                  <div 
                    style={{ position: 'relative', background: 'var(--bg-main)', borderRadius: '4px', border: '1px dashed rgba(249,115,22,0.3)', height: '143px', display: 'flex', flexDirection: 'column', padding: '0 10px', alignItems: 'center', justifyContent: 'center', gap: '8px', overflow: 'hidden' }}
                    className="upload-overlay-card-wrapper"
                  >
                    <input 
                      type="file" 
                      accept="image/jpeg, image/png, image/webp" 
                      onChange={handleLocalFileSelect}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} 
                    />
                    <FolderPlus size={20} color="#f97316" />
                    <span style={{ color: '#f97316', fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>Új kép feltöltése</span>
                  </div>

                  {/* KÉPMÁTRIX RÁCS */}
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
                          exif: {
                            camera: p.camera || '-',
                            lens: p.lens || '-',
                            shutter: p.shutter || '-',
                            iso: p.iso ? String(p.iso) : '-',
                            aperture: p.aperture || '-',
                            software: p.software || '-'
                          }
                        })}
                        style={{ 
                          background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden', 
                          border: pastMatch ? '1px solid #0284c7' : '1px solid var(--border-main)', 
                          cursor: 'pointer', transition: 'all 0.15s ease-in-out', display: 'flex', flexDirection: 'column', position: 'relative' 
                        }}
                        className="asset-matrix-item"
                      >
                        <div style={{ width: '100%', height: '110px', backgroundColor: '#000', overflow: 'hidden', position: 'relative' }}>
                          <GridImage src={getOptimizedThumbnail(p.file_url)} alt="Gallery asset" />
                          
                          {pastMatch && (
                            <span style={{ position: 'absolute', top: '6px', left: '6px', background: '#0284c7', color: 'white', fontWeight: 'bold', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '2px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                              {t('modalBadgeSwapBack', 'RE-SWAP')}
                            </span>
                          )}
                        </div>
                        <div style={{ padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border-main)', fontWeight: 'bold' }}>
                          <span style={{ color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Star size={10} fill="#fbbf24" /> {pastMatch ? pastMatch.likes_count : (p.totalLikes || 0)}</span>
                          <span style={{ color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Eye size={10} /> {pastMatch ? pastMatch.views_count : (p.totalViews || 0)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {renderedPhotos.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-body)', padding: '30px 15px', fontSize: '0.82rem', fontStyle: 'italic', lineHeight: '1.45', background: 'var(--bg-main)', borderRadius: '4px', marginTop: '12px', border: '1px dashed var(--border-main)' }}>
                    <AlertCircle size={20} color="var(--text-muted)" style={{ margin: '0 auto 8px auto' }} />
                    Még nincs kép a portfóliódban.<br />
                    Kattints a bal oldali <b style={{ color: '#f97316' }}>"Új kép feltöltése"</b> dobozra az első fotód tallózásához!
                  </div>
                )}

                {filteredAlbumPhotos.length > visibleCount && (
                  <div 
                    onClick={triggerLoadMore}
                    style={{ textAlign: 'center', color: '#38bdf8', fontSize: '0.8rem', padding: '10px 0', fontWeight: 'bold', cursor: 'pointer', background: 'rgba(56,189,248,0.03)', borderRadius: '4px', marginTop: '12px', border: '1px solid rgba(56,189,248,0.15)', userSelect: 'none', transition: 'all 0.1s' }}
                    className="modal-load-more-btn"
                  >
                    {t('modalLoadMore', 'További képek betöltése...')}
                  </div>
                )}

                <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-main)', paddingTop: '14px' }}>
                  <button onClick={() => cleanAndClose(false)} style={{ width: '100%', padding: '10px', borderRadius: '4px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: '#f43f5e', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} className="modal-bottom-close-btn">
                    <X size={14} /> Mégse / Bezárás
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <style>{`
        .modal-scroll-zone {
          overflow-y: auto !important;
          overscroll-behavior: contain !important;
          -webkit-overflow-scrolling: touch !important;
        }
        .modal-top-close-cross:hover {
          background: var(--hover-overlay) !important;
          border-color: var(--text-muted) !important;
        }
        .modal-bottom-close-btn:hover {
          background: var(--hover-overlay) !important;
          color: #ef4444 !important;
        }
        .upload-overlay-card-wrapper:hover {
          background: var(--hover-overlay) !important;
          border-color: #f97316 !important;
        }
        .asset-matrix-item:hover {
          border-color: var(--text-muted) !important;
          transform: translateY(-1px);
        }
        .modal-load-more-btn:hover {
          background: rgba(56,189,248,0.08) !important;
        }
        @keyframes modalFloatCircle {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
