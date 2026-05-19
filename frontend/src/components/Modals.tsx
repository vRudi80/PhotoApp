import { useEffect } from 'react';
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

  // Billentyűzet-navigáció (Nyilak és Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [entryList, currentIndex, onNavigate, onClose]);

  // Kép kattintás logika (Bal fél = Vissza, Jobb fél = Előre)
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation(); // Kép kattintásra ne záródjon be az ablak
    if (!hasNavigation) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isRightSide = clickX > rect.width / 2;

    if (isRightSide) goNext();
    else goPrev();
  };

  return (
    <div 
      onClick={onClose} 
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out' }}
    >
      {/* Záró X gomb */}
      <div style={{ position: 'absolute', top: '20px', right: '30px', color: 'white', fontSize: '2rem', fontWeight: 'bold', zIndex: 50, cursor: 'pointer' }}>×</div>
      
      {/* BAL LÁTHATATLAN LAPOZÓ ZÓNA (A képernyő bal 25%-a) */}
      {hasNavigation && currentIndex > 0 && (
        <div 
          onClick={(e) => { e.stopPropagation(); goPrev(); }} 
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '25%', display: 'flex', alignItems: 'center', paddingLeft: '30px', cursor: 'pointer', zIndex: 20 }}
        >
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '4rem', pointerEvents: 'none', filter: 'drop-shadow(0px 0px 5px rgba(0,0,0,0.8))' }}>‹</span>
        </div>
      )}

      {/* JOBB LÁTHATATLAN LAPOZÓ ZÓNA (A képernyő jobb 25%-a) */}
      {hasNavigation && currentIndex < entryList.length - 1 && (
        <div 
          onClick={(e) => { e.stopPropagation(); goNext(); }} 
          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '25%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '30px', cursor: 'pointer', zIndex: 20 }}
        >
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '4rem', pointerEvents: 'none', filter: 'drop-shadow(0px 0px 5px rgba(0,0,0,0.8))' }}>›</span>
        </div>
      )}

      {/* MAGA A KÉP */}
      <img 
        src={data.url} 
        alt="Teljes képernyő" 
        onClick={handleImageClick}
        style={{ maxHeight: '80vh', maxWidth: '95vw', objectFit: 'contain', zIndex: 10, cursor: hasNavigation ? 'ew-resize' : 'default', userSelect: 'none' }} 
      />
      
      {/* CÍM ÉS LIKE GOMB (Z-index 30, hogy a lapozó zónák felett legyen, ha véletlen rálógna) */}
      {(data.title || data.id) && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', zIndex: 30 }}>
          
          {data.title && (
            <div style={{ color: 'white', fontSize: '1.2rem', textAlign: 'center', maxWidth: '90vw', background: 'rgba(0,0,0,0.7)', padding: '10px 20px', borderRadius: '8px', border: '1px solid #334155' }}>
              {data.title}
              {hasNavigation && <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '10px' }}>({currentIndex + 1} / {entryList.length})</span>}
            </div>
          )}

          {data.id && onToggleLike && (
            <button 
              onClick={() => onToggleLike(data.id as number)} 
              style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid #475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', borderRadius: '50px', transition: 'background 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.9)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
            >
              <span style={{ fontSize: '1.5rem', color: data.user_liked ? '#ef4444' : '#cbd5e1' }}>{data.user_liked ? '❤️' : '🤍'}</span>
              <span style={{ color: data.user_liked ? '#ef4444' : '#f8fafc', fontSize: '1.1rem', fontWeight: 'bold' }}>{data.like_count || 0}</span>
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
