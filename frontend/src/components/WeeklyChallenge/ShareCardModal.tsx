import React from 'react';

// Behozzuk a nyelvi kontextust
import { useLanguage } from '../../context/LanguageContext';

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
  
  const { t, lang } = useLanguage();

  if (!activeShareData) return null;

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

  const resolvedImageUrl = shareBase64;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(9,13,22,0.92)', backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto', boxSizing: 'border-box' }}>
      
      {/* 🧭 TOP PREVIEW VEZÉRLŐ SÁV */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '340px', marginBottom: '10px', alignItems: 'center', boxSizing: 'border-box' }}>
        <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('sharePreviewTitle')}</span>
        <button 
          onClick={onClose} 
          style={{ background: '#222f47', border: '1px solid #334155', color: '#f87171', padding: '5px 10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'all 0.1s' }}
          className="share-modal-cancel-btn"
        >
          <X size={12} /> {t('shareCancelBtn')}
        </button>
      </div>

      {/* 🏆 A TRÓFEAKÁRTYA PLAKÁT – Mobilra méretezve, de rögzített kiexportált képaránnyal */}
      <div 
        id="share-card-node"
        style={{ 
          width: '100%', maxWidth: '340px', minHeight: '520px', background: '#131b2e', 
          borderRadius: '8px', padding: '18px 16px', boxSizing: 'border-box', display: 'flex', 
          flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #fbbf24', 
          position: 'relative', overflow: 'hidden', boxShadow: '0 15px 35px rgba(0,0,0,0.5)', gap: '10px'
        }}
      >
        <div style={{ textAlign: 'center', zIndex: 10, width: '100%' }}>
          <div style={{ color: '#fbbf24', fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '4px', wordBreak: 'break-word' }}><Camera size={10} /> PhotAwesome.com</div>
          <div style={{ color: '#475569', fontSize: '0.6rem', marginTop: '2px', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 'bold', wordBreak: 'break-word' }}>{t('shareTrophySubtitle')}</div>
        </div>

        {/* FOTÓ DOBOZ SZOFTVERES KERETTEL */}
        <div style={{ 
          width: '100%', height: '180px', borderRadius: '4px', border: '1px solid #222f47', 
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)', zIndex: 10, display: 'flex', alignItems: 'center', 
          justifyContent: 'center', position: 'relative', boxSizing: 'border-box', backgroundColor: '#090d16',
          overflow: 'hidden', flexShrink: 0
        }}>
          {loadingShareImg && (
            <div style={{ position: 'absolute', color: '#475569', fontSize: '0.78rem', zIndex: 5, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Loader2 size={12} style={{ animation: 'modalFloatCircle 0.8s linear infinite' }} /> {t('sharePreparingImage')}
            </div>
          )}
          
          {resolvedImageUrl ? (
            <img 
              src={resolvedImageUrl} 
              alt="Trophy submission" 
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }} 
            />
          ) : (
            !loadingShareImg && <div style={{ color: '#ef4444', fontSize: '0.78rem', zIndex: 5 }}>{t('shareImageError')}</div>
          )}
        </div>

        {/* KÖZÉPSŐ RANG SZEKCIÓ */}
        <div style={{ textAlign: 'center', zIndex: 10, width: '100%' }}>
          <Trophy size={28} color="#fbbf24" style={{ margin: '0 auto 4px auto', display: 'block' }} />
          <h2 style={{ color: 'white', fontSize: '1.1rem', fontWeight: '600', margin: '2px 0 4px 0', letterSpacing: '-0.3px', wordBreak: 'break-word', lineHeight: '1.25' }}>
            {activeShareData?.user_name || user?.name || t('sharePhotographer')}
          </h2>
          <div style={{ background: 'rgba(251,191,36,0.06)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', padding: '3px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.88rem', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word' }}>
            {displayRank}
          </div>
        </div>

        {/* TÉMA ÉS STATISZTIKAI BOX */}
        <div style={{ width: '100%', background: '#0f172a', padding: '10px', borderRadius: '4px', border: '1px solid #222f47', zIndex: 10, boxSizing: 'border-box' }}>
          <div style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', fontWeight: 'bold' }}>{t('shareTopicLabel')}</div>
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '600', margin: '2px 0 8px 0', textAlign: 'center', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: '1.3' }}>
            "{displayTopicTitle}"
          </div>
          
          <div style={{ display: 'flex', width: '100%', borderTop: '1px solid #222f47', paddingTop: '8px' }}>
            <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: '1px', fontWeight: 'bold' }}>{t('shareCommunityRating')}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f97316', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Star size={11} fill="#f97316" /> {activeShareData.likes || 0}</div>
            </div>
            <div style={{ width: '1px', background: '#222f47' }}></div>
            <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: '1px', fontWeight: 'bold' }}>{t('shareTotalEntriesLabel')}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ImageIcon size={11} /> {activeShareData.total_entries || 0}</div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <div style={{ fontSize: '0.6rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>{t('sharePlayNext')}</div>
          <div style={{ color: '#38bdf8', fontWeight: 'bold', marginTop: '1px', fontSize: '0.72rem' }}>PhotAwesome.com</div>
        </div>
      </div>

      {/* LETÖLTÉS / MEGOSZTÁS AKCIÓGOMB */}
      <button 
        onClick={handleExecuteShare}
        disabled={isGeneratingImage || loadingShareImg}
        style={{ width: '100%', maxWidth: '340px', marginTop: '10px', background: isGeneratingImage || loadingShareImg ? '#222f47' : '#f97316', color: isGeneratingImage || loadingShareImg ? '#475569' : 'white', border: 'none', padding: '10px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold', cursor: isGeneratingImage || loadingShareImg ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'background 0.15s ease', boxSizing: 'border-box' }}
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
