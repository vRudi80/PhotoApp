import React, { useState } from 'react';
import { toPng } from 'html-to-image';
import { useLanguage } from '../../context/LanguageContext';

interface ChallengeShareModalProps {
  topic: any;
  onClose: () => void;
}

export default function ChallengeShareModal({ topic, onClose }: ChallengeShareModalProps) {
  const { t, lang } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);

  if (!topic) return null;

  const displayTitle = lang === 'en' && topic.title_en ? topic.title_en : topic.title;
  const isDaily = topic.topic_type === 'daily' || (topic.end_date && new Date(topic.end_date).getTime() - new Date(topic.start_date || Date.now()).getTime() <= 48 * 60 * 60 * 1000);

  // 🎯 KORSZERŰSÍTETT MENTÉSI FUNKCIÓ (Minden hibalehetőséget kiküszöbölve)
  const handleDownloadImage = async () => {
    const node = document.getElementById('challenge-invite-card');
    if (!node) return;

    setIsGenerating(true);
    try {
      // Magas minőségű renderelés fix paraméterekkel, betűtípus-szűréssel
      const dataUrl = await toPng(node, { 
        cacheBust: true, 
        quality: 1.0, 
        pixelRatio: 2,
        skipFonts: true, 
        fetchRequestInit: { cache: 'no-cache' } 
      });

      const link = document.createElement('a');
      link.download = `PhotAwesome_Challenge_${topic.id}.png`;
      link.href = dataUrl;
      link.click();
      
      alert(lang === 'en' ? '✅ Image downloaded to your device!' : '✅ A meghívó kép sikeresen elmentve az eszközödre!');
    } catch (e) {
      console.error("Képmentési hiba:", e);
      alert('Hiba történt a kép elkészítésekor. Próbáld újra!');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
      
      {/* FEJLÉC PULT */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '380px', marginBottom: '15px', alignItems: 'center' }}>
        <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 'bold' }}>{lang === 'en' ? 'Challenge Invite Card' : 'Meghívó kártya generálása'}</span>
        <button onClick={onClose} style={{ background: '#1e293b', border: 'none', color: '#ef4444', padding: '6px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Mégse</button>
      </div>

      {/* 📸 A GENERÁLÓDÓ KÁRTYA (Fixált, CSS-biztos struktúra) */}
      <div 
        id="challenge-invite-card"
        style={{ 
          width: '380px', 
          height: '520px', 
          // 🎯 JAVÍTVA: Elmosott háttér-blob helyett egy tiszta, beépített radiális fény-átmenetet használunk, amit a képmentő motor tökéletesen le tud renderelni
          background: isDaily 
            ? 'radial-gradient(circle at top, rgba(239, 68, 68, 0.15) 0%, #0f172a 70%)' 
            : 'radial-gradient(circle at top, rgba(59, 130, 246, 0.15) 0%, #0f172a 70%)',
          backgroundColor: '#0f172a',
          borderRadius: '24px', 
          padding: '30px 25px', 
          boxSizing: 'border-box', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          border: `3px solid ${isDaily ? '#ef4444' : '#3b82f6'}`, 
          position: 'relative', 
          overflow: 'hidden'
        }}
      >
        {/* Kártya Fejléce */}
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{ color: isDaily ? '#f87171' : '#60a5fa', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '3px', textTransform: 'uppercase' }}>
            PHOTAWESOME.COM
          </div>
          <div style={{ color: 'white', fontSize: '1.25rem', fontWeight: 'bold', marginTop: '4px' }}>
            {lang === 'en' ? 'New Photo Challenge!' : 'Új Fotós Kihívás!'}
          </div>
        </div>

        {/* Borítókép Keret */}
        <div style={{ 
          width: '100%', 
          height: '190px', 
          borderRadius: '16px', 
          border: `2px solid ${isDaily ? '#ef444450' : '#3b82f650'}`, 
          backgroundColor: '#000', 
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
        }}>
          {topic.cover_url ? (
            <img 
              // 🎯 JAVÍTVA: A URL végére fűzött frissítési kulcs (?cb=...) kényszeríti a böngészőt, hogy a cache-t megkerülve, tiszta CORS engedélyekkel olvassa be a képet a mentéshez!
              src={`${topic.cover_url}?cb=photawesome_share`} 
              alt="" 
              crossOrigin="anonymous"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>📸</div>
          )}
        </div>

        {/* Cím és Kategória szekció (Fix magasságú elrendezéssel a torzulások ellen) */}
        <div style={{ textAlign: 'center', width: '100%', padding: '5px 0' }}>
          <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '900', margin: '0 0 12px 0', lineHeight: '1.25', wordBreak: 'break-word' }}>
            {displayTitle}
          </h2>
          <div style={{ display: 'inline-block', background: isDaily ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)', color: isDaily ? '#f87171' : '#38bdf8', padding: '6px 18px', borderRadius: '50px', fontWeight: 'bold', fontSize: '0.85rem', border: `1px solid ${isDaily ? '#ef444440' : '#38bdf840'}` }}>
             {isDaily ? (lang === 'en' ? '🔴 Blitz Match' : '🔴 Villámfutam') : (lang === 'en' ? '🔵 Master Match' : '🔵 Mesterfutam')}
          </div>
        </div>

        {/* Alsó felirat sáv */}
        <div style={{ width: '100%', background: 'rgba(0,0,0,0.35)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', boxSizing: 'border-box', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {lang === 'en' ? 'Join the game now!' : 'Csatlakozz a játékhoz!'}
          </div>
        </div>
      </div>

      {/* MŰVELETI GOMBOK PANELJE */}
      <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '380px', marginTop: '20px' }}>
        
        {/* 1. Kép letöltése */}
        <button 
          onClick={handleDownloadImage}
          disabled={isGenerating}
          style={{ flex: 1, background: isGenerating ? '#334155' : '#10b981', color: isGenerating ? '#64748b' : 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 'bold', cursor: isGenerating ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', boxShadow: '0 8px 15px rgba(16,185,129,0.2)' }}
        >
          <span style={{ fontSize: '1.2rem' }}>⬇️</span>
          <span>{isGenerating ? '⏳...' : (lang === 'en' ? 'Download Image' : 'Kép Letöltése')}</span>
        </button>

        {/* 2. Link megosztása */}
        <button 
          onClick={() => {
            const shareText = lang === 'en' 
              ? `📸 Join the "${displayTitle}" photo challenge!\n\nClick here to play: ${window.location.origin}/weekly_challenge`
              : `📸 Indulj te is a(z) "${displayTitle}" fotós kihíváson!\n\nKattints ide és játssz te is: ${window.location.origin}/weekly_challenge`;
            
            if (navigator.share) {
              navigator.share({ title: 'PhotAwesome Kihívás', text: shareText }).catch(console.error);
            } else {
               const cleanFrontendShareUrl = `${window.location.origin}/share/challenge/${topic.id}`; 
               const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(cleanFrontendShareUrl)}`;
               window.open(fbUrl, 'facebook-share-dialog', 'width=600,height=600');
            }
          }}
          style={{ flex: 1, background: '#3b82f6', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', boxShadow: '0 8px 15px rgba(59,130,246,0.2)' }}
        >
          <span style={{ fontSize: '1.2rem' }}>🔗</span>
          <span>{lang === 'en' ? 'Share Link' : 'Link Megosztása'}</span>
        </button>
      </div>

    </div>
  );
}
