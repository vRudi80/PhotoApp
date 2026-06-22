import React, { useMemo, useState, useRef } from 'react';
import { getImageUrl } from '../../utils/helpers';
import { BACKEND_URL } from '../../utils/constants';
import exifr from 'exifr';

// 🎯 Nyelvi kontextus aktiválása
import { useLanguage } from '../../context/LanguageContext';

// 🏎️ KLIELEGÁNS TÖMÖRÍTŐ MOTOR
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
      };
    };
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🎯 HELYI PREVIEW ÁLLAPOTOK
  const [previewPhoto, setPreviewPhoto] = useState<any | null>(null);
  const [isLocalProcessing, setIsLocalProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🏎️ Hash-Map optimalizálás az egyezésekhez
  const pastEntriesMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(myPastEntries)) {
      myPastEntries.forEach(entry => { if (entry.file_url) map.set(entry.file_url, entry); });
    }
    return map;
  }, [myPastEntries]);

  // Cloudinary Thumbnail optimalizálás
  const getOptimizedThumbnail = (rawUrl: string) => {
    const url = getImageUrl(null, rawUrl);
    if (url && url.includes('cloudinary.com')) {
      return url.replace('/upload/', '/upload/w_300,h_220,c_fill,g_auto,q_auto,f_auto/');
    }
    return url;
  };

  // ➕ DIREKT TALLÓZÁS INTEGRÁCIÓ ÉS EXIF KIBÁNYÁSZÁS
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
      } catch (err) { console.log("Nincs EXIF adat"); }

      let finalFile = rawFile;
      if (rawFile.size > 1.5 * 1024 * 1024) {
        finalFile = await compressImageOnClient(rawFile);
      }

      setPreviewPhoto({
        isLocal: true,
        file: finalFile,
        file_url: URL.createObjectURL(finalFile),
        exif: { camera, lens, shutter, iso, aperture, software }
      });
      setIsLocalProcessing(false);
    }
  };

  // VÉGLEGESÍTÉS (BEKÜLDÉS / CSERE) MOTOR
  const handleConfirmAction = async () => {
    if (!previewPhoto) return;
    setIsSubmitting(true);

    try {
      if (previewPhoto.isLocal) {
        // 1. TISZTA TALLÓZOTT FÁJL FELKÜLDÉSE FORMDATA-VAL
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
        // 2. MEGLÉVŐ GALÉRIÁS KÉP FELHASZNÁLÁSA
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '24px', width: '100%', maxWidth: '550px', maxHeight: '85vh', overflowY: 'auto', padding: '25px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
        
        <button onClick={cleanAndClose} style={{ position: 'absolute', top: '20px', right: '20px', background: '#1e293b', border: 'none', color: '#94a3b8', fontSize: '1.2rem', width: '35px', height: '35px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>✖</button>
        
        <input type="file" ref={fileInputRef} accept="image/jpeg, image/png, image/webp" style={{ display: 'none' }} onChange={handleLocalFileSelect} />

        {/* ── NÉZET A: SZÍNHÁZ / NAGY MÉRETŰ ELŐNÉZET MODUS ── */}
        {previewPhoto ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.2s ease' }}>
            <h3 style={{ color: 'white', margin: 0, fontSize: '1.3rem', fontWeight: 'bold' }}>🔎 {t('roomPreviewLabel') || 'Nevezési előnézet'}</h3>
            
            <div style={{ width: '100%', height: '260px', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #334155' }}>
              <img src={previewPhoto.isLocal ? previewPhoto.file_url : getImageUrl(null, previewPhoto.file_url)} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>

            {/* EXIF Pecsét az előnézet alatt */}
            {previewPhoto.exif && (
              <div style={{ background: '#1e293b70', padding: '14px', borderRadius: '12px', border: '1px solid #334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📷 Gép: <b>{previewPhoto.exif.camera}</b></div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📐 Optika: <b>{previewPhoto.exif.lens}</b></div>
                <div>⏱️ Záridő: <b>{previewPhoto.exif.shutter}</b></div>
                <div>💎 ISO: <b>{previewPhoto.exif.iso}</b></div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button disabled={isSubmitting} onClick={() => setPreviewPhoto(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', fontWeight: 'bold', cursor: 'pointer' }}>
                ⬅ {t('viewBackBtn') || 'Vissza'}
              </button>
              <button disabled={isSubmitting} onClick={handleConfirmAction} style={{ flex: 2, padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.25)' }}>
                {isSubmitting ? '⏳ Processing...' : (albumModalMode === 'upload' ? 'Megerősítés: Nevezés 🚀' : 'Megerősítés: Csere 🔄')}
              </button>
            </div>
          </div>
        ) : (
          /* ── NÉZET B: KLASSZIKUS ALBUM RÁCS VÁLASZTÓ ── */
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
                
                {/* ➕ SPECIÁLIS TALLÓZÓ KÁRTYA (MINDIG AZ ELSŐ) */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ background: '#0f172a', borderRadius: '14px', border: '2px dashed #f59e0b50', height: '153px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.background = '#1e293b40'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = '#f59e0b50'; e.currentTarget.style.background = '#0f172a'; }}
                >
                  <div style={{ fontSize: '1.8rem' }}>📁</div>
                  <span style={{ color: '#fbbf24', fontSize: '0.78rem', fontWeight: 'bold', textAlign: 'center', padding: '0 10px' }}>Új kép tallózása</span>
                </div>

                {swapAlbumPhotos.map((p, idx) => {
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
                        <img src={getOptimizedThumbnail(p.file_url)} alt="Gallery asset" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
        @keyframes modalFloatCircle {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
