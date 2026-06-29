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

  const handleGenerateAndShare = async () => {
    const node = document.getElementById('challenge-invite-card');
    if (!node) return;

    setIsGenerating(true);
    try {
      // 🎯 Bővített paraméterek a CORS hibák és font összeomlások elkerülésére
      const dataUrl = await toPng(node, { 
        cacheBust: true, 
        quality: 1.0, 
        pixelRatio: 2,
        skipFonts: true, // Megakadályozza a fontok miatti hibákat
        fetchRequestInit: { cache: 'no-cache' } // Segít a képek friss letöltésében
      });
      
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `PhotAwesome_Challenge_${topic.id}.png`, { type: 'image/png' });
      
      const shareText = lang === 'en' 
        ? `📸 Join the "${displayTitle}" photo challenge!\n\nClick here to play: ${window.location.origin}/weekly_challenge`
        : `📸 Indulj te is a(z) "${displayTitle}" fotós kihíváson!\n\nKattints ide és játssz te is: ${window.location.origin}/weekly_challenge`;

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'PhotAwesome Kihívás',
          text: shareText
        });
      } else {
        const link = document.createElement('a');
        link.download = `PhotAwesome_Challenge_${topic.id}.png`;
        link.href = dataUrl;
        link.click();
        
        alert(lang === 'en' ? 'Image downloaded! You can now attach it to your Facebook post.' : 'A meghívó kép letöltve! Most már csatolhatod a Facebook posztodhoz.');
      }
    } catch (e) {
      console.error("Kép generálási hiba:", e);
      alert('Hiba történt a kép elkészítésekor. Ellenőrizd, hogy a böngésződ nem blokkolja-e a letöltéseket!');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '380px', marginBottom: '15px', alignItems: 'center' }}>
        <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 'bold' }}>{lang === 'en' ? 'Challenge Invite Card' : 'Meghívó kártya generálása'}</span>
        <button onClick={onClose} style={{ background: '#1e293b', border: 'none', color: '#ef4444', padding: '6px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Mégse</button>
      </div>

      {/* 📸 A GENERÁLÓDÓ KÁRTYA (Ezt menti le képként) */}
      <div 
        id="challenge-invite-card"
        style={{ 
          width: '380px', height: '500px', background: 'linear-gradient(145deg, #0f172a, #1e293b)', 
          borderRadius: '24px', padding: '25px', boxSizing: 'border-box', display: 'flex', 
          flexDirection: 'column', alignItems: 'center', border: `3px solid ${isDaily ? '#ef4444' : '#3b82f6'}`, 
          position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' 
        }}
      >
        {/* Háttér effektus */}
        <div style={{ position: 'absolute', top: '-100px', width: '250px', height: '250px', background: isDaily ? '#ef444420' : '#3b82f620', filter: 'blur(60px)', borderRadius: '50%' }}></div>

        {/* Fejléc */}
        <div style={{ textAlign: 'center', zIndex: 10, width: '100%', marginBottom: '20px' }}>
          <div style={{ color: isDaily ? '#f87171' : '#60a5fa', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '3px', textTransform: 'uppercase' }}>
            PHOTAWESOME.COM
          </div>
          <div style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold', marginTop: '5px' }}>
            {lang === 'en' ? 'New Photo Challenge!' : 'Új Fotós Kihívás!'}
          </div>
        </div>

        {/* Borítókép */}
        {/* Borítókép */}
        <div style={{ 
          width: '100%', height: '180px', borderRadius: '16px', border: `2px solid ${isDaily ? '#ef4444' : '#3b82f6'}`, 
          boxShadow: '0 8px 25px rgba(0,0,0,0.5)', zIndex: 10, backgroundColor: '#000', overflow: 'hidden', marginBottom: '20px'
        }}>
          {topic.cover_url ? (
            <img 
              src={topic.cover_url} 
              alt="Cover" 
              crossOrigin="anonymous" /* 🎯 EZ A KULCS A BIZTONSÁGI HIBA ELLEN! */
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>📸</div>
          )}
        </div>

        {/* Kihívás Címe */}
        <div style={{ textAlign: 'center', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%' }}>
          <h2 style={{ color: 'white', fontSize: '1.6rem', fontWeight: '900', margin: '0 0 10px 0', lineHeight: '1.2' }}>
            {displayTitle}
          </h2>
          <div style={{ display: 'inline-block', background: isDaily ? '#ef444420' : '#3b82f620', color: isDaily ? '#f87171' : '#38bdf8', padding: '6px 16px', borderRadius: '50px', fontWeight: 'bold', fontSize: '0.9rem', border: `1px solid ${isDaily ? '#ef4444' : '#38bdf8'}` }}>
             {isDaily ? (lang === 'en' ? '🔴 Blitz Match' : '🔴 Villámfutam') : (lang === 'en' ? '🔵 Master Match' : '🔵 Mesterfutam')}
          </div>
        </div>

        {/* Lábjegyzet CTA */}
        <div style={{ width: '100%', background: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '14px', border: '1px solid #334155', zIndex: 10, boxSizing: 'border-box', textAlign: 'center', marginTop: '10px' }}>
          <div style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {lang === 'en' ? 'Join the game now!' : 'Csatlakozz a játékhoz!'}
          </div>
        </div>
      </div>

      <button 
        onClick={handleGenerateAndShare}
        disabled={isGenerating}
        style={{ width: '100%', maxWidth: '380px', marginTop: '20px', background: isGenerating ? '#334155' : 'linear-gradient(135deg, #10b981, #059669)', color: isGenerating ? '#64748b' : 'white', border: 'none', padding: '16px', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 'bold', cursor: isGenerating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 10px 25px rgba(16,185,129,0.3)' }}
      >
        {isGenerating ? '⏳ Generálás...' : (lang === 'en' ? '📲 Download & Share' : '📲 Kép Letöltése és Megosztás')}
      </button>
    </div>
  );
}
