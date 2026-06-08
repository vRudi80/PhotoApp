import React from 'react';

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
  
  if (!activeShareData) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '340px', marginBottom: '15px', alignItems: 'center' }}>
        <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 'bold' }}>📱 Trófeakártya Előnézet</span>
        <button onClick={onClose} style={{ background: '#1e293b', border: 'none', color: '#ef4444', padding: '6px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Mégse ✕</button>
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
          <div style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '3px', textTransform: 'uppercase' }}>📸 kepolvasok.guru</div>
          <div style={{ color: '#64748b', fontSize: '0.65rem', marginTop: '2px', letterSpacing: '1px' }}>PÁRBAJ TRÓFEA</div>
        </div>

        <div style={{ 
          width: '100%', height: '200px', borderRadius: '16px', border: '2px solid #fbbf24', 
          boxShadow: '0 8px 25px rgba(0,0,0,0.5)', zIndex: 10, display: 'flex', alignItems: 'center', 
          justifyContent: 'center', position: 'relative', boxSizing: 'border-box', backgroundColor: '#000',
          backgroundImage: shareBase64 ? `url(${shareBase64})` : 'none',
          backgroundRepeat: 'no-repeat', backgroundPosition: 'center center', backgroundSize: 'contain'
        }}>
          {loadingShareImg && <div style={{ color: '#64748b', fontSize: '0.85rem' }}>⏳ Kép előkészítése...</div>}
          {!shareBase64 && !loadingShareImg && <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>⚠️ Kép betöltési hiba</div>}
        </div>

        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <div style={{ fontSize: '2.5rem', margin: 0, lineHeight: 1 }}>🏆</div>
          <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: '900', margin: '6px 0 2px 0' }}>
            {activeShareData?.user_name || user?.name || 'Fotóművész'}
          </h2>
          <div style={{ background: 'linear-gradient(90deg, transparent, #fbbf2430, transparent)', color: '#fbbf24', padding: '4px 20px', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.05rem', letterSpacing: '1px' }}>
            {activeShareData.rank}. HELYEZÉS
          </div>
        </div>

        <div style={{ width: '100%', background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '14px', border: '1px solid #23293f', zIndex: 10, boxSizing: 'border-box' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>Kihívás témája:</div>
          <div style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 'bold', margin: '2px 0 10px 0', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            "{activeShareData.topic_title}"
          </div>
          
          <div style={{ display: 'flex', width: '100%', borderTop: '1px solid #23293f', paddingTop: '10px' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>Közösségi Értékelés</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f97316' }}>{activeShareData.likes || 0} ⭐</div>
            </div>
            <div style={{ width: '1px', background: '#23293f' }}></div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>Összes Nevező</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#38bdf8' }}>{activeShareData.total_entries || 0} fotó</div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <div style={{ fontSize: '0.65rem', color: '#475569' }}>Játssz Te is következő párbajban:</div>
          <div style={{ color: '#38bdf8', fontWeight: 'bold', marginTop: '1px', fontSize: '0.8rem' }}>kepolvasok.guru</div>
        </div>
      </div>

      <button 
        onClick={handleExecuteShare}
        disabled={isGeneratingImage || loadingShareImg}
        style={{ width: '100%', maxWidth: '340px', marginTop: '15px', background: isGeneratingImage || loadingShareImg ? '#334155' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: isGeneratingImage || loadingShareImg ? '#64748b' : 'white', border: 'none', padding: '14px', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 'bold', cursor: isGeneratingImage || loadingShareImg ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 10px 25px rgba(29,78,216,0.3)' }}
      >
        {isGeneratingImage ? '⏳ Trófea mentése...' : '📱 Kártya Megosztása / Mentése 🚀'}
      </button>
    </div>
  );
}
