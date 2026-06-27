import React from 'react';

// 🎯 Behozzuk a nyelvi kontextust
import { useLanguage } from '../../context/LanguageContext';

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

  // 🇬🇧 Segédfüggvény az angol sorszámnevekhez (1st, 2nd, 3rd, 4th...)
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

  // 🎯 DINAMIKUS KÉP-UTVONAL MEGHATÁROZÁS: Ha van base64 generálva (letöltéshez), azt használjuk, egyébként a nyers fotó URL-jét
  const resolvedImageUrl = shareBase64 || activeShareData.file_url || activeShareData.imageUrl;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '340px', marginBottom: '15px', alignItems: 'center' }}>
        <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 'bold' }}>{t('sharePreviewTitle')}</span>
        <button onClick={onClose} style={{ background: '#1e293b', border: 'none', color: '#ef4444', padding: '6px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{t('shareCancelBtn')}</button>
      </div>

      <div 
        id="share-card-node"
        style={{ 
          width: '340px', height: '580px', background: 'linear-gradient(145deg, #0b0f19, #1e1b4b)', 
          borderRadius: '24px', padding: '25px 20px', boxSizing: 'border-box', display: 'flex', 
          flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', border: '3px solid #fbbf24', 
          position: 'relative', overflow: 'hidden' 
        }}
      >
        <div style={{ position: 'absolute', top: '-100px', width: '200px', height: '200px', background: '#fbbf2415', filter: 'blur(50px)', borderRadius: '50%' }}></div>

        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <div style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '3px', textTransform: 'uppercase' }}>📸 PhotAwesome.com</div>
          <div style={{ color: '#64748b', fontSize: '0.65rem', marginTop: '2px', letterSpacing: '1px' }}>{t('shareTrophySubtitle')}</div>
        </div>

        {/* 🎯 JAVÍTVA: A képkeret most már rugalmasan beolvassa a resolvedImageUrl változót és egy HTML5 <img> taggel jeleníti meg a fotót */}
        <div style={{ 
          width: '100%', height: '200px', borderRadius: '16px', border: '2px solid #fbbf24', 
          boxShadow: '0 8px 25px rgba(0,0,0,0.5)', zIndex: 10, display: 'flex', alignItems: 'center', 
          justifyContent: 'center', position: 'relative', boxSizing: 'border-box', backgroundColor: '#000',
          overflow: 'hidden'
        }}>
          {loadingShareImg && (
            <div style={{ position: 'absolute', color: '#64748b', fontSize: '0.85rem', zIndex: 5 }}>
              {t('sharePreparingImage')}
            </div>
          )}
          
          {resolvedImageUrl ? (
            <img 
              src={resolvedImageUrl} 
              alt="Trophy submission" 
              style={{ width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }} 
            />
          ) : (
            !loadingShareImg && <div style={{ color: '#ef4444', fontSize: '#0.85rem', zIndex: 5 }}>{t('shareImageError')}</div>
          )}
        </div>

        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <div style={{ fontSize: '2.5rem', margin: 0, lineHeight: 1 }}>🏆</div>
          <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: '900', margin: '6px 0 2px 0' }}>
            {activeShareData?.user_name || user?.name || t('sharePhotographer')}
          </h2>
          <div style={{ background: 'linear-gradient(90deg, transparent, #fbbf2430, transparent)', color: '#fbbf24', padding: '4px 20px', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.05rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {displayRank}
          </div>
        </div>

        <div style={{ width: '100%', background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '14px', border: '1px solid #23293f', zIndex: 10, boxSizing: 'border-box' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>{t('shareTopicLabel')}</div>
          <div style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 'bold', margin: '2px 0 10px 0', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            "{displayTopicTitle}"
          </div>
          
          <div style={{ display: 'flex', width: '100%', borderTop: '1px solid #23293f', paddingTop: '10px' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>{t('shareCommunityRating')}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f97316' }}>{activeShareData.likes || 0} ⭐</div>
            </div>
            <div style={{ width: '1px', background: '#23293f' }}></div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>{t('shareTotalEntriesLabel')}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#38bdf8' }}>{activeShareData.total_entries || 0}{t('sharePhotosCount')}</div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <div style={{ fontSize: '0.65rem', color: '#475569' }}>{t('sharePlayNext')}</div>
          <div style={{ color: '#38bdf8', fontWeight: 'bold', marginTop: '1px', fontSize: '0.8rem' }}>PhotAwesome.com</div>
        </div>
      </div>

      <button 
        onClick={handleExecuteShare}
        disabled={isGeneratingImage || loadingShareImg}
        style={{ width: '100%', maxWidth: '340px', marginTop: '15px', background: isGeneratingImage || loadingShareImg ? '#334155' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: isGeneratingImage || loadingShareImg ? '#64748b' : 'white', border: 'none', padding: '14px', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 'bold', cursor: isGeneratingImage || loadingShareImg ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 10px 25px rgba(29,78,216,0.3)' }}
      >
        {isGeneratingImage ? t('shareSavingTrophy') : t('shareSaveBtn')}
      </button>
    </div>
  );
}
