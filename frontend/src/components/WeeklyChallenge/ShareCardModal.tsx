import React from 'react';

// Behozzuk a nyelvi kontextust
import { useLanguage } from '../../context/LanguageContext';

// 🎯 ÚJ: Professzionális Lucide Ikonok importálása az AI-sallangok ellen
import { 
  X, 
  Trophy, 
  Star, 
  Eye, 
  Image as ImageIcon, 
  Share2, 
  Download,
  Sparkles,
  Camera,
  Loader2
} from 'lucide-react';

interface ShareCardModalProps {
  activeShareData: any;
  onClose: () => void;
  user: any;
  shareBase64: string | null;
  loadingShareImg: boolean;
  isGeneratingImage: boolean;
  handleExecuteShare: () => void;
}

export default function ShareCardModal({
  activeShareData, onClose, user, shareBase64, loadingShareImg, isGeneratingImage, handleExecuteShare
}: ShareCardModalProps) {
  
  // Aktiváljuk a fordítót (t) és a nyelvet (lang)
  const { t, lang } = useLanguage();

  if (!activeShareData) return null;

  // Segédfüggvény az angol sorszámnevekhez (1st, 2nd, 3rd, 4th...)
  const getOrdinalSuffix = (i: number) => {
    if (lang === 'hu') return `${i}.`;
    const j = i % 10, k = i % 100;
    if (j === 1 && k !== 11) return `${i}ST`;
    if (j === 2 && k !== 12) return `${i}ND`;
    if (j === 3 && k !== 13) return `${i}RD`;
    return `${i}TH`;
  };

  const displayRank = lang === 'en' 
    ? `${getOrdinalSuffix(activeShareData.rank)}${t('shareRankSuffix')}`
    : `${activeShareData.rank}${t('shareRankSuffix')}`;

  const displayTopicTitle = lang === 'en' && activeShareData.topic_title_en 
    ? activeShareData.topic_title_en 
    : activeShareData.topic_title;

  // 🎯 JAVÍTVA: KIZÁRÓLAG a base64-esített képet engedjük a kártyába — a korábbi
  // `shareBase64 || activeShareData.file_url || activeShareData.imageUrl` lánc a nyers, cross-origin
  // URL-re esett vissza, amitől a toPng "szennyezett vászon" (tainted canvas) hibát dobott, vagy a
  // legenerált kép a fotó helyén üres maradt. Ha nincs base64, inkább a hibaüzenetet mutatjuk a
  // kártyán, mint egy garantáltan hibás exportot.
  const resolvedImageUrl = shareBase64;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(9,13,22,0.92)', backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
      
      {/* 🧭 TOP PREVIEW VEZÉRLŐ SÁV */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '340px', marginBottom: '12px', alignItems: 'center' }}>
        <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('sharePreviewTitle')}</span>
        <button 
          onClick={onClose} 
          style={{ background: '#222f47', border: '1px solid #334155', color: '#f87171', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'all 0.1s' }}
          className="share-modal-cancel-btn"
        >
          <X size={12} /> {t('shareCancelBtn')}
        </button>
      </div>

      {/* 🏆 A TRÓFEAKÁRTYA PLAKÁT – Rögzített méretek a html-to-image letöltéshez */}
      <div 
        id="share-card-node"
        style={{ 
          width: '340px', height: '580px', background: '#131b2e', 
          borderRadius: '8px', padding: '24px 20px', boxSizing: 'border-box', display: 'flex', 
          flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #fbbf24', 
          position: 'relative', overflow: 'hidden', boxShadow: '0 15px 35px rgba(0,0,0,0.5)'
        }}
      >
        {/* 🎯 JAVÍTVA: Az összes homályos AI színes fényfolt és Glow teljesen eltávolítva */}
        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <div style={{ color: '#fbbf24', fontSize: '0.72rem', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Camera size={10} /> PhotAwesome.com</div>
          <div style={{ color: '#475569', fontSize: '0.62rem', marginTop: '2px', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 'bold' }}>{t('shareTrophySubtitle')}</div>
        </div>

        {/* FOTÓ DOBOZ SZOFTVERES KERETTEL */}
        <div style={{ 
          width: '100%', height: '200px', borderRadius: '4px', border: '1px solid #222f47', 
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)', zIndex: 10, display: 'flex', alignItems: 'center', 
          justifyContent: 'center', position: 'relative', boxSizing: 'border-box', backgroundColor: '#090d16',
          overflow: 'hidden'
        }}>
          {loadingShareImg && (
            <div style={{ position: 'absolute', color: '#475569', fontSize: '0.8rem', zIndex: 5, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Loader2 size={12} style={{ animation: 'modalFloatCircle 0.8s linear infinite' }} /> {t('sharePreparingImage')}
            </div>
          )}
          
          {resolvedImageUrl ? (
            <img 
              src={resolvedImageUrl} 
              alt="Trophy submission" 
              style={{ width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }} 
            />
          ) : (
            !loadingShareImg && <div style={{ color: '#ef4444', fontSize: '0.8rem', zIndex: 5 }}>{t('shareImageError')}</div>
          )}
        </div>

        {/* KÖZÉPSŐ RANG SZEKCIÓ – Letisztult solid tónusokkal */}
        <div style={{ textAlign: 'center', zIndex: 10, width: '100%' }}>
          <Trophy size={32} color="#fbbf24" style={{ margin: '0 auto 6px auto', display: 'block' }} />
          <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: '600', margin: '4px 0 6px 0', letterSpacing: '-0.3px' }}>
            {activeShareData?.user_name || user?.name || t('sharePhotographer')}
          </h2>
          <div style={{ background: 'rgba(251,191,36,0.06)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', padding: '4px 16px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.95rem', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'inline-block' }}>
            {displayRank}
          </div>
        </div>

        {/* TÉMA ÉS STATISZTIKAI BOX */}
        <div style={{ width: '100%', background: '#0f172a', padding: '12px', borderRadius: '4px', border: '1px solid #222f47', zIndex: 10, boxSizing: 'border-box' }}>
          <div style={{ fontSize: '0.68rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', fontWeight: 'bold' }}>{t('shareTopicLabel')}</div>
          <div style={{ fontSize: '0.92rem', color: '#cbd5e1', fontWeight: '600', margin: '2px 0 10px 0', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            "{displayTopicTitle}"
          </div>
          
          <div style={{ display: 'flex', width: '100%', borderTop: '1px solid #222f47', paddingTop: '10px' }}>
            <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: '#475569', marginBottom: '2px', fontWeight: 'bold' }}>{t('shareCommunityRating')}</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#f97316', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Star size={12} fill="#f97316" /> {activeShareData.likes || 0}</div>
            </div>
            <div style={{ width: '1px', background: '#222f47' }}></div>
            <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: '#475569', marginBottom: '2px', fontWeight: 'bold' }}>{t('shareTotalEntriesLabel')}</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ImageIcon size={12} /> {activeShareData.total_entries || 0}</div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <div style={{ fontSize: '0.62rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>{t('sharePlayNext')}</div>
          <div style={{ color: '#38bdf8', fontWeight: 'bold', marginTop: '1px', fontSize: '0.75rem' }}>PhotAwesome.com</div>
        </div>
      </div>

      {/* LETÖLTÉS / MEGOSZTÁS AKCIÓGOMB – Szoftveres solid narancs stílusban */}
      <button 
        onClick={handleExecuteShare}
        disabled={isGeneratingImage || loadingShareImg}
        style={{ width: '100%', maxWidth: '340px', marginTop: '12px', background: isGeneratingImage || loadingShareImg ? '#222f47' : '#f97316', color: isGeneratingImage || loadingShareImg ? '#475569' : 'white', border: 'none', padding: '12px', borderRadius: '4px', fontSize: '0.95rem', fontWeight: 'bold', cursor: isGeneratingImage || loadingShareImg ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'background 0.15s ease' }}
        className="share-modal-submit-btn"
      >
        <Share2 size={14} />
        <span>{isGeneratingImage ? t('shareSavingTrophy') : t('shareSaveBtn')}</span>
      </button>

      <style>{`
        .share-modal-cancel-btn:hover {
          background: #2d3d5a !important;
        }
        .share-modal-submit-btn:not(:disabled):hover {
          background: #ea580c !important;
        }
        @keyframes modalFloatCircle {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
