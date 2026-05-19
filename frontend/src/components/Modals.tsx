import { useState, useEffect } from 'react';
import { getYouTubeEmbed } from '../utils/helpers';

interface FullscreenModalProps {
  data: {
    url: string;
    title?: string;
    id?: number;          
    user_liked?: boolean; 
    like_count?: number;  
  };
  onClose: () => void;
  entryList?: any[];      
  currentIndex?: number;  
  onNavigate?: (newIndex: number) => void; 
  onToggleLike?: (entryId: number) => void; 
}

export function FullscreenModal({ data, onClose, entryList, currentIndex, onNavigate, onToggleLike }: FullscreenModalProps) {
  
  const hasNavigation = entryList && entryList.length > 1 && currentIndex !== undefined && onNavigate;

  // Navigációs segédfüggvények
  const goPrev = () => {
    if (hasNavigation && currentIndex > 0) onNavigate(currentIndex - 1);
  };

  const goNext = () => {
    if (hasNavigation && currentIndex < entryList.length - 1) onNavigate(currentIndex + 1);
  };

  // Billentyűzet-navigáció (Nyilak és Escape) asztali géphez
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [entryList, currentIndex, onNavigate, onClose]);

  // Kép kattintás logika asztali géphez (Bal fél = Vissza, Jobb fél = Előre)
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation(); 
    if (!hasNavigation) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isRightSide = clickX > rect.width / 2;

    if (isRightSide) goNext();
    else goPrev();
  };

  // --- ÚJ: MOBILOS GESZTUSOK (SWIPE) ---
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStart.x;
    const deltaY = touchEndY - touchStart.y;
    
    // Ha vízszintesen jobban húzta, mint függőlegesen -> Lapozás
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > 40 && hasNavigation) { // Legalább 40px húzás kell
        if (deltaX > 0) goPrev(); // Jobbra húzás (Előző kép)
        else goNext(); // Balra húzás (Következő kép)
      }
    } else {
      // Ha függőlegesen jobban húzta -> Bezárás
      if (deltaY > 50) { // Legalább 50px-t lehúzta
        onClose();
      }
    }
    setTouchStart(null);
  };

  return (
    <div 
      onClick={onClose} 
      onTouchStart={handleTouchStart} // Mobilos érintés figyelése
      onTouchEnd={handleTouchEnd}     // Mobilos húzás befejezése
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out', touchAction: 'none' }}
    >
      {/* JAVÍTOTT: Óriási, könnyen eltalálható, kerek bezáró gomb */}
      <div 
        onClick={onClose}
        style={{ position: 'absolute', top: '15px', right: '15px', width: '48px', height: '48px', backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(5px)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '2rem', fontWeight: 'bold', zIndex: 50, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
      >
        ×
      </div>
      
      {/* BAL LÁTHATATLAN LAPOZÓ ZÓNA (asztali gépekhez) */}
      {hasNavigation && currentIndex > 0 && (
        <div 
          onClick={(e) => { e.stopPropagation(); goPrev(); }} 
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '25%', display: 'flex', alignItems: 'center', paddingLeft: '20px', cursor: 'pointer', zIndex: 20 }}
        >
          <span className="hide-on-mobile" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '4rem', pointerEvents: 'none', filter: 'drop-shadow(0px 0px 5px rgba(0,0,0,0.8))' }}>‹</span>
        </div>
      )}

      {/* JOBB LÁTHATATLAN LAPOZÓ ZÓNA (asztali gépekhez) */}
      {hasNavigation && currentIndex < entryList.length - 1 && (
        <div 
          onClick={(e) => { e.stopPropagation(); goNext(); }} 
          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '25%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '20px', cursor: 'pointer', zIndex: 20 }}
        >
          <span className="hide-on-mobile" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '4rem', pointerEvents: 'none', filter: 'drop-shadow(0px 0px 5px rgba(0,0,0,0.8))' }}>›</span>
        </div>
      )}

      {/* MAGA A KÉP */}
      <img 
        src={data.url} 
        alt="Teljes képernyő" 
        onClick={handleImageClick}
        style={{ maxHeight: '75vh', maxWidth: '95vw', objectFit: 'contain', zIndex: 10, cursor: hasNavigation ? 'ew-resize' : 'default', userSelect: 'none', pointerEvents: 'auto' }} 
      />
      
      {/* CÍM ÉS LIKE GOMB */}
      {(data.title || data.id) && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', zIndex: 30 }}>
          
          {data.title && (
            <div style={{ color: 'white', fontSize: '1.1rem', textAlign: 'center', maxWidth: '90vw', background: 'rgba(0,0,0,0.7)', padding: '12px 20px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 6px rgba(0,0,0,0.5)' }}>
              {data.title}
              {hasNavigation && <span style={{ fontSize: '0.85rem', color: '#94a3b8', marginLeft: '10px' }}>({currentIndex + 1} / {entryList.length})</span>}
            </div>
          )}

          {data.id && onToggleLike && (
            <button 
              onClick={() => onToggleLike(data.id as number)} 
              style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid #475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 25px', borderRadius: '50px', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}
            >
              <span style={{ fontSize: '1.8rem', color: data.user_liked ? '#ef4444' : '#cbd5e1', filter: data.user_liked ? 'drop-shadow(0 0 5px rgba(239, 68, 68, 0.5))' : 'none' }}>{data.user_liked ? '❤️' : '🤍'}</span>
              <span style={{ color: data.user_liked ? '#ef4444' : '#f8fafc', fontSize: '1.2rem', fontWeight: 'bold' }}>{data.like_count || 0}</span>
            </button>
          )}

        </div>
      )}

      {/* Egy kis CSS trükk, hogy mobilon ne zavarjanak a nyilak, ott úgyis a húzást (swipe) használják */}
      <style>{`
        @media (max-width: 768px) {
          .hide-on-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export function VideoModal({ videoUrl, onClose }: { videoUrl: string, onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div 
        onClick={onClose}
        style={{ position: 'absolute', top: '15px', right: '15px', width: '48px', height: '48px', backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(5px)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '2rem', fontWeight: 'bold', zIndex: 50, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)' }}
      >
        ×
      </div>
      <iframe width="900" height="500" style={{ maxWidth: '95vw', maxHeight: '90vh', border: 'none', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }} src={getYouTubeEmbed(videoUrl)} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen></iframe>
    </div>
  );
}
