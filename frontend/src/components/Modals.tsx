import { getFlagEmoji, getYouTubeEmbed } from '../utils/helpers';

export function FullscreenModal({ data, onClose }: { data: {url: string, title?: string}, onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out' }}>
      <div style={{ position: 'absolute', top: '20px', right: '30px', color: 'white', fontSize: '2rem', fontWeight: 'bold' }}>×</div>
      <img src={data.url} alt="Teljes képernyő" style={{ maxHeight: '85vh', maxWidth: '95vw', objectFit: 'contain' }} />
      {data.title && (
        <div style={{ marginTop: '15px', color: 'white', fontSize: '1.2rem', textAlign: 'center', maxWidth: '90vw', background: 'rgba(0,0,0,0.5)', padding: '10px 20px', borderRadius: '8px' }}>
          {data.title}
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
