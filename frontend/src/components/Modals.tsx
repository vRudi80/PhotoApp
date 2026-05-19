import { useState, useEffect } from 'react';
import { getYouTubeEmbed } from '../utils/helpers';

// Új, okosított interfész, ami már teljes listát és indexet is tud fogadni
interface FullscreenModalProps {
  data: {
    url: string;
    title?: string;
    id?: number;          // A kép azonosítója (a like miatt)
    user_liked?: boolean; // Lájkolta-e már a user?
    like_count?: number;  // Eddigi lájkok száma
  };
  onClose: () => void;
  // Opcionális paraméterek a lapozáshoz és a lájkoláshoz
  entryList?: any[];      // A teljes aktuális képlista
  currentIndex?: number;  // Hanyadik képnél járunk
  onNavigate?: (newIndex: number) => void; // Lapozó függvény
  onToggleLike?: (entryId: number) => void; // Lájkoló függvény
}

export function FullscreenModal({ data, onClose, entryList, currentIndex, onNavigate, onToggleLike }: FullscreenModalProps) {
  
  // Billentyűzet-navigáció (Jobbra-Balra nyilak és Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (entryList && onNavigate && currentIndex !== undefined) {
        if (e.key === 'ArrowRight' && currentIndex < entryList.length - 1) onNavigate(currentIndex + 1);
        if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [entryList, currentIndex, onNavigate, onClose]);

  // Kattintás a kép bal vagy jobb oldalára
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation(); // Ne záródjon be az ablak
    if (!entryList || !onNavigate || currentIndex === undefined) return;

    // Megnézzük, hogy a kép bal vagy jobb felére kattintott-e
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isRightSide = clickX > rect.width / 2;

    if (isRightSide && currentIndex < entryList.length - 1) {
      onNavigate(currentIndex + 1);
    } else if (!isRightSide && currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  };

  const hasNavigation = entryList && entryList.length > 1 && currentIndex !== undefined && onNavigate;

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out' }}>
      
      <div style={{ position: 'absolute', top: '20px', right: '30px', color: 'white', fontSize: '2rem', fontWeight: 'bold' }}>×</div>
      
      {/* Vizuális nyilak a képernyő szélén */}
      {hasNavigation && currentIndex > 0 && (
        <div style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: '3rem', pointerEvents: 'none' }}>‹</div>
      )}
      {hasNavigation && currentIndex < entryList.length - 1 && (
        <div style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: '3rem', pointerEvents: 'none' }}>›</div>
      )}

      {/* A nagy kép, aminek a bal/jobb oldalára lehet kattintani */}
      <img 
        src={data.url} 
        alt="Teljes képernyő" 
        onClick={handleImageClick}
        style={{ maxHeight: '80vh', maxWidth: '95vw', objectFit: 'contain', cursor: hasNavigation ? 'ew-resize' : 'default', userSelect: 'none' }} 
      />
      
      {/* Kép címe és Like gomb! */}
      {(data.title || data.id) && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          
          {data.title && (
            <div style={{ color: 'white', fontSize: '1.2rem', textAlign: 'center', maxWidth: '90vw', background: 'rgba(0,0,0,0.7)', padding: '10px 20px', borderRadius: '8px' }}>
              {data.title}
              {hasNavigation && <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '10px' }}>({currentIndex + 1} / {entryList.length})</span>}
            </div>
          )}

          {data.id && onToggleLike && (
            <button 
              onClick={() => onToggleLike(data.id as number)} 
              style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid #475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', borderRadius: '50px', transition: 'background 0.2s' }}
            >
              <span style={{ fontSize: '1.5rem', color: data.user_liked ? '#ef4444' : '#cbd5e1' }}>{data.user_liked ? '❤️' : '🤍'}</span>
              <span style={{ color: data.user_liked ? '#ef4444' : '#f8fafc', fontSize: '1rem', fontWeight: 'bold' }}>{data.like_count || 0}</span>
            </button>
          )}

        </div>
      )}
    </div>
  );
}

export function VideoModal({ videoUrl, onClose }: { videoUrl: string, onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: '20px', right: '30px', color: 'white', fontSize: '2rem', cursor: 'pointer', fontWeight: 'bold' }}>×</div>
      <iframe width="900" height="500" style={{ maxWidth: '95vw', maxHeight: '90vh', border: 'none', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }} src={getYouTubeEmbed(videoUrl)} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen></iframe>
    </div>
  );
}
