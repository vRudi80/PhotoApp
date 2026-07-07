import React, { useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { useLanguage } from '../../context/LanguageContext';
import { BACKEND_URL } from '../../utils/constants';

interface ChallengeShareModalProps {
  topic: any;
  onClose: () => void;
}

const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('photoAppToken');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

// 🎯 JAVÍTVA: A borítókép Base64 konverzióját mostantól a saját backend proxy végzi (nem a böngésző fetch-eli
// közvetlenül CORS módban a Cloudinary/Drive szervert). Ez azért kellett, mert mobil böngészőkön (elsősorban iOS
// Safari-n) a közvetlen cross-origin fetch gyakran elhasal ITP/hálózati okokból, ami után a régi kód csendben
// visszaesett a nyers URL-re -> az így "szennyezett" (tainted) vászon miatt a legenerált megosztó kép a borítókép
// helyén üres/fekete lett, VAGY a toPng hívás egy SecurityError-ral teljesen elhasalt mobilon.
const safeImageToBase64 = async (imageUrl: string): Promise<string | null> => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/weekly/image-proxy?url=${encodeURIComponent(imageUrl)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Proxy hiba');
    const data = await res.json();
    return data.base64 as string;
  } catch (e) {
    console.error("Nem sikerült a képet Base64-re alakítani a proxyn keresztül:", e);
    return null; // 🎯 FONTOS: nem esünk vissza a nyers (cross-origin) URL-re, mert az a generált képet elrontaná
  }
};

// 🎯 ULTRA-STABIL UTILS: Kézzel alakítja át a generált base64-et Blobbá fetch() hívás nélkül.
// Ez 100%-ban megakadályozza a mobil Safari/Chrome összeomlását és az oldal újratöltését.
const safeDataURLtoBlob = (dataUrl: string) => {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

export default function ChallengeShareModal({ topic, onClose }: ChallengeShareModalProps) {
  const { t, lang } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);
  const [base64CoverUrl, setBase64CoverUrl] = useState<string | null>(null);
  const [coverLoadFailed, setCoverLoadFailed] = useState(false);

  if (!topic) return null;

  const displayTitle = lang === 'en' && topic.title_en ? topic.title_en : topic.title;
  const isDaily = topic.topic_type === 'daily' ||
    (topic.end_date && new Date(topic.end_date).getTime() - new Date(topic.start_date || Date.now()).getTime() <= 48 * 60 * 60 * 1000);

  // 🎯 JAVÍTVA: Időbélyeg alapú cache-busting kényszeríti ki a friss proxy-kérést, plusz most már azt is
  // kezeljük, ha a topic-nak nincs cover_url-je: ilyenkor nem is próbálkozunk konverzióval.
  useEffect(() => {
    setBase64CoverUrl(null);
    setCoverLoadFailed(false);
    if (topic && topic.cover_url) {
      safeImageToBase64(`${topic.cover_url}?arenaCacheBust=${Date.now()}`).then((b64) => {
        if (b64) setBase64CoverUrl(b64);
        else setCoverLoadFailed(true);
      });
    }
  }, [topic]);

  const handleExecuteShare = async () => {
    const node = document.getElementById('challenge-invite-card');
    if (!node) return;

    setIsGenerating(true);
    try {
      // 🎯 JAVÍTVA: Mielőtt lefotóznánk a kártyát, megvárjuk, hogy a borítókép <img> ténylegesen
      // dekódolva/kirajzolva legyen. Enélkül elő tudott fordulni, hogy a toPng épp akkor kapott
      // pillanatképet, amikor a kép még nem készült el, és a mentett PNG-n üres maradt a helye.
      const coverImgEl = node.querySelector('img') as HTMLImageElement | null;
      if (coverImgEl && !coverImgEl.complete) {
        await new Promise<void>((resolve) => {
          coverImgEl.onload = () => resolve();
          coverImgEl.onerror = () => resolve();
        });
      } else if (coverImgEl && typeof coverImgEl.decode === 'function') {
        try { await coverImgEl.decode(); } catch (e) { /* ignore, folytatjuk */ }
      }

      // Villámgyors hívás skipFonts jelzővel, hogy a mobil böngésző ne tiltsa le a folyamatot időtúllépés miatt
      const dataUrl = await toPng(node, { 
        quality: 0.98,
        skipFonts: true,
        cacheBust: true,
        pixelRatio: 1
      });

      const blob = safeDataURLtoBlob(dataUrl);
      const file = new File([blob], `PhotAwesome_Challenge_${topic.id}.png`, { type: 'image/png' });
      
      const shareText = lang === 'en' 
        ? `📸 Join the "${displayTitle}" photo challenge on PhotAwesome!`
        : `📸 Indulj te is a(z) "${displayTitle}" fotós kihíváson a PhotAwesome-on!`;

      // MOBIL RENDSZER-MEGOSZTÓ INDÍTÁSA
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'PhotAwesome Kihívás',
          text: shareText
        });
      } else {
        // ASZTALI GÉP FALLBACK VAGY BÖNGÉSZŐ KORLÁTOZÁS: Sima letöltés indítása
        const link = document.createElement('a');
        link.download = `PhotAwesome_Challenge_${topic.id}.png`;
        link.href = dataUrl;
        link.click();
      }
      onClose();
    } catch (e) {
      console.error("Hiba a képkészítés során, biztonsági mentés indítása:", e);
      try {
        const fallbackUrl = await toPng(node, { skipFonts: true, pixelRatio: 1 });
        const link = document.createElement('a');
        link.download = `PhotAwesome_Challenge_${topic.id}.png`;
        link.href = fallbackUrl;
        link.click();
        onClose();
      } catch (err) {
        alert('Nem sikerült legenerálni a meghívót a telefon korlátozásai miatt.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareLinkOnly = () => {
    const cleanFrontendShareUrl = `${window.location.origin}/share/challenge/${topic.id}`;
    const shareText = lang === 'en' 
      ? `📸 Join the "${displayTitle}" photo challenge!\n\nClick here to play: ${cleanFrontendShareUrl}`
      : `📸 Indulj te is a(z) "${displayTitle}" fotós kihíváson!\n\nKattints ide és játssz te is: ${cleanFrontendShareUrl}`;

    if (navigator.share) {
      navigator.share({
        title: 'PhotAwesome Kihívás',
        text: shareText
      }).catch(console.error);
    } else {
       const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(cleanFrontendShareUrl)}`;
       window.open(fbUrl, 'facebook-share-dialog', 'width=600,height=600');
    }
  };

  // 🎯 coverReady: akkor is igaz, ha a borítókép betöltése VÉGLEGESEN elhasalt (coverLoadFailed) —
  // így a "Kártya Mentése" gomb nem ragad be örökre "Loading..." állapotban, csak a kártya a
  // fallback ikonnal készül el borítókép nélkül.
  const coverReady = !topic.cover_url || !!base64CoverUrl || coverLoadFailed;
  const coverBackground = base64CoverUrl || (topic.cover_url && !coverLoadFailed ? topic.cover_url : undefined);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
      
      {/* MODAL VEZÉRLŐ FEJLÉC */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '340px', marginBottom: '15px', alignItems: 'center' }}>
        <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 'bold' }}>{lang === 'en' ? 'Challenge Preview' : 'Meghívó előnézete'}</span>
        <button type="button" onClick={onClose} style={{ background: '#1e293b', border: 'none', color: '#ef4444', padding: '6px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Mégse</button>
      </div>

      {/* 📸 A GENERÁLÓDÓ KÁRTYA */}
      <div 
        id="challenge-invite-card"
        style={{ 
          width: '340px', height: '580px', 
          background: 'linear-gradient(145deg, #0b0f19, #1e1b4b)', 
          borderRadius: '24px', padding: '25px 20px', boxSizing: 'border-box', display: 'flex', 
          flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', 
          border: `3px solid ${isDaily ? '#ef4444' : '#fbbf24'}`, 
          position: 'relative', overflow: 'hidden' 
        }}
      >
        <div style={{ position: 'absolute', top: '-100px', width: '200px', height: '200px', background: isDaily ? '#ef444415' : '#fbbf2415', filter: 'blur(50px)', borderRadius: '50%' }}></div>

        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <div style={{ color: isDaily ? '#ef4444' : '#fbbf24', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '3px', textTransform: 'uppercase' }}>📸 PhotAwesome.com</div>
          <div style={{ color: '#64748b', fontSize: '0.65rem', marginTop: '2px', letterSpacing: '1px' }}>{lang === 'en' ? 'NEW ARENA CHALLENGE' : 'ÚJ ARÉNA MEGHÍVÓ'}</div>
        </div>

        {/* 🎯 JAVÍTVA: CSS háttérkép helyett valódi <img> tag! A html-to-image (kiváltképp mobil Safarin)
            nem fotózza le megbízhatóan a CSS background-image-et — csak az élőnézetben látszott a kép,
            a legenerált/mentett PNG-n viszont üresen maradt a helye. Valódi <img>-gel ez már 100%-ban stabil. */}
        <div style={{ 
          width: '100%', height: '200px', borderRadius: '16px', border: `2px solid ${isDaily ? '#ef4444' : '#fbbf24'}`, 
          boxShadow: '0 8px 25px rgba(0,0,0,0.5)', zIndex: 10, display: 'flex', alignItems: 'center', 
          justifyContent: 'center', position: 'relative', boxSizing: 'border-box', backgroundColor: '#000',
          overflow: 'hidden'
        }}>
          {topic.cover_url && coverBackground ? (
            <img
              src={coverBackground}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: 2,
                display: 'block'
              }}
            />
          ) : (
            <div style={{ color: '#64748b', fontSize: '2.5rem', zIndex: 5 }}>
              {topic.cover_url && !coverReady ? '⏳' : '📸'}
            </div>
          )}
        </div>

        {/* Információs blokk középen */}
        <div style={{ textAlign: 'center', zIndex: 10, width: '100%' }}>
          <div style={{ fontSize: '2.5rem', margin: 0, lineHeight: 1 }}>⚔️</div>
          <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: '900', margin: '6px 0 6px 0', lineHeight: '1.3', wordBreak: 'break-word' }}>
            {displayTitle}
          </h2>
          <div style={{ background: isDaily ? 'rgba(239, 68, 68, 0.2)' : 'rgba(251, 191, 36, 0.15)', color: isDaily ? '#f87171' : '#fbbf24', padding: '4px 20px', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.05rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
             {isDaily ? (lang === 'en' ? 'Blitz Match' : 'Villámfutam') : (lang === 'en' ? 'Master Match' : 'Mesterfutam')}
          </div>
        </div>

        {/* Alsó leíró doboz */}
        <div style={{ width: '100%', background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '14px', border: '1px solid #23293f', zIndex: 10, boxSizing: 'border-box', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {lang === 'en' ? 'Tap to play & collect trophies!' : 'Csatlakozz és zsebeld be a trófeát!'}
          </div>
        </div>

        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <div style={{ color: '#38bdf8', fontWeight: 'bold', marginTop: '1px', fontSize: '0.8rem' }}>PhotAwesome.com</div>
        </div>
      </div>

      {/* AKCIÓGOMBOK ALUL */}
      <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '340px', marginTop: '15px' }}>
        <button 
          type="button"
          onClick={handleExecuteShare}
          disabled={isGenerating || !coverReady}
          style={{ flex: 1, background: (isGenerating || !coverReady) ? '#334155' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: (isGenerating || !coverReady) ? '#64748b' : 'white', border: 'none', padding: '14px', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 'bold', cursor: (isGenerating || !coverReady) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 10px 25px rgba(29,78,216,0.3)' }}
        >
          <span>{!coverReady ? '⏳ Loading...' : (isGenerating ? '⏳...' : (lang === 'en' ? '📷 Save Image' : '📷 Kártya Mentése'))}</span>
        </button>

        <button 
          type="button"
          onClick={handleShareLinkOnly}
          style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '14px', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <span>🔗 Link</span>
        </button>
      </div>

      {coverLoadFailed && (
        <div style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '10px', maxWidth: '340px', textAlign: 'center' }}>
          {lang === 'en' 
            ? '⚠️ Cover image could not be loaded — the card will be generated without it.' 
            : '⚠️ A borítóképet nem sikerült betölteni — a kártya kép nélkül készül el.'}
        </div>
      )}

    </div>
  );
}
