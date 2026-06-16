import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../utils/constants';

// 🎯 Nyelvi kontextus betöltése a nemzetközi működéshez
import { useLanguage } from '../../context/LanguageContext';

interface ArchiveDetailModalProps {
  entry: any;
  userEmail: string;
  userName: string;
  onClose: () => void;
  onLikeUpdate: () => void;
}

// ── 🛡️ Globális kép-helyreállító motor a törések ellen ──
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.src = 'https://via.placeholder.com/400x300/1e293b/64748b?text=Image+not+found';
};

export default function ArchiveDetailModal({ entry, userEmail, userName, onClose, onLikeUpdate }: ArchiveDetailModalProps) {
  const { t } = useLanguage();

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // ⚡ LOKÁLIS MEMÓRIA: Szigorúan csak az archív szíveket (archive_likes) vesszük alapul
  const [likesCount, setLikesCount] = useState<number>(Number(entry?.archive_likes) || 0);
  const [isLiked, setIsLiked] = useState<boolean>(entry?.has_user_liked === 1 || entry?.has_user_liked === true);

  // Biztonsági háló: Ha a beküldött entry megváltozik, szinkronizálunk
  useEffect(() => {
    setLikesCount(Number(entry?.archive_likes) || 0);
    setIsLiked(entry?.has_user_liked === 1 || entry?.has_user_liked === true);
  }, [entry]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/archive/comments/${entry.id}`);
      if (res.ok) setComments(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingComments(false); }
  };

  useEffect(() => {
    if (entry?.id) fetchComments();
  }, [entry?.id]);

  const handleLike = async () => {
    if (!userEmail) {
      alert("❌ Hiba: A rendszer nem azonosította a profilodat! Jelentkezz be újra.");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/archive/like-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: entry.id, userEmail: userEmail })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIsLiked(data.liked);
          setLikesCount(prev => data.liked ? prev + 1 : Math.max(0, prev - 1));
          onLikeUpdate(); 
        }
      } else {
        const errData = await res.json();
        alert(errData.error || "Hiba történt a lájkolás közben.");
      }
    } catch (e) { 
      alert("Hálózati hiba a lájk elküldésekor.");
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!userEmail) return alert("❌ Hiba: Kommenteléshez be kell jelentkezned!");

    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/archive/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: entry.id,
          userEmail: userEmail,
          userName: userName,
          commentText: newComment
        })
      });
      
      if (res.ok) {
        setNewComment('');
        fetchComments(); 
      } else {
        const errData = await res.json();
        alert(errData.error || "Hiba történt a komment elküldésekor.");
      }
    } catch (e) { 
      alert("Hálózati hiba a komment elküldésekor.");
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(9, 13, 22, 0.95)', backdropFilter: 'blur(20px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
      
      {/* 🎯 ULTRA-STABIL FÜGGŐLEGES SZÍNHÁZ SZELEKTOROK - JAVÍTVA KÓDÜTKÖZÉS ELLEN */}
      <style>{`
        .theater-modal-card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 24px;
          width: 100%;
          max-width: 1000px;
          height: 90vh;
          max-height: 90dvh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8);
        }

        .theater-photo-section {
          background: #090d16;
          flex: 1.5;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          position: relative;
          min-height: 0;
          border-bottom: 1px solid #232f46;
        }

        .theater-archive-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        .theater-info-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #0f172a;
          min-height: 0;
        }

        .theater-header-row {
          padding: 20px 25px;
          border-bottom: 1px solid #223047;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-shrink: 0;
          width: 100%;
          box-sizing: border-box;
        }

        .theater-comments-flow {
          flex: 1;
          overflow-y: auto;
          padding: 20px 25px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #090d1620;
        }
      `}</style>

      {/* FŐ KÁRTYA CONTAINER */}
      <div className="theater-modal-card">
        
        {/* 1. FELSŐ RÉSZ: FOTÓ PANEL */}
        <div className="theater-photo-section">
          <button onClick={onClose} style={{ position: 'absolute', top: '20px', left: '20px', background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '8px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', zIndex: 10, transition: 'all 0.2s', fontSize: '0.85rem' }}>⬅️ Bezárás</button>
          <img className="theater-archive-img" src={entry.file_url} alt="" onError={handleImageError} />
        </div>

        {/* 2. ALSÓ RÉSZ: ADATOK ÉS CSEVEGÉS */}
        <div className="theater-info-section">
          
          {/* Hivatalos reszponzív fejlécsor */}
          <div className="theater-header-row">
            
            {/* 💥 JAVÍTVA: Szigorú fentről lefelé építkező elrendezés (Név ➔ Klub ➔ Pontszám) */}
            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
              
              {/* Név önállóan, fixen egy sorban, levágás-védelemmel */}
              <h3 style={{ color: '#38bdf8', margin: 0, fontSize: '1.45rem', fontWeight: 'bold', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                {entry.user_name}
              </h3>
              
              {/* Klubjelvény közvetlenül a név alatt */}
              {entry.club_name && (
                <div style={{ display: 'flex', width: 'auto', flexShrink: 0 }}>
                  <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold', background: '#10b98115', padding: '5px 12px', borderRadius: '6px', border: '1px solid #10b98130', display: 'inline-block' }}>
                    🛡️ {entry.club_name}
                  </span>
                </div>
              )}
              
              {/* Versenyeredmény */}
              <div style={{ color: '#64748b', fontSize: '0.88rem', fontWeight: 'bold', marginTop: '2px' }}>
                Eredmény: <span style={{ color: '#f59e0b' }}>{entry.likes_count} ⭐</span>
              </div>
            </div>

            {/* Elismerés (Lájk) gomb a jobb szélen */}
            <button 
              onClick={handleLike}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isLiked ? 'rgba(239, 68, 68, 0.15)' : '#1e293b', border: isLiked ? '1px solid #ef4444' : '1px solid #334155', color: isLiked ? '#f87171' : '#cbd5e1', padding: '12px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0, fontSize: '0.92rem' }}
            >
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{isLiked ? '❤️' : '🤍'}</span>
              <span>{likesCount} elismerés</span>
            </button>
          </div>

          {/* Gördíthető kommentfolyam */}
          <div className="theater-comments-flow">
            <h4 style={{ color: '#64748b', margin: '0 0 4px 0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>⚔️ Eszmecsere</h4>
            
            {loadingComments && comments.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '15px', fontSize: '0.9rem' }}>Gondolatok betöltése...</div>
            ) : comments.length === 0 ? (
              <div style={{ color: '#475569', textAlign: 'center', padding: '30px 20px', fontStyle: 'italic', fontSize: '0.95rem' }}>Írd le az első gondolatot a fotóról! 🪶</div>
            ) : (
              comments.map((c) => {
                const isMe = c.user_email === userEmail;
                return (
                  <div key={c.id} style={{ background: isMe ? '#1e293b' : '#1e293b50', padding: '10px 14px', borderRadius: '12px', border: isMe ? '1px solid #475569' : '1px solid #334155', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', width: 'fit-content', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '25px', marginBottom: '3px', alignItems: 'center' }}>
                      <strong style={{ color: isMe ? '#f59e0b' : '#38bdf8', fontSize: '0.8rem', fontWeight: 'bold' }}>{c.user_name}</strong>
                      <small style={{ color: '#475569', fontSize: '0.7rem', fontFamily: 'monospace' }}>{new Date(c.created_at).toLocaleTimeString('hu-HU', {hour: '2-digit', minute:'2-digit'})}</small>
                    </div>
                    <p style={{ color: '#cbd5e1', margin: 0, fontSize: '0.9rem', lineHeight: '1.4', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.comment_text}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Kommentküldő űrlap legalsó fix sorban */}
          <form onSubmit={handleCommentSubmit} style={{ padding: '15px 20px', background: '#1e293b', borderTop: '1px solid #334155', display: 'flex', gap: '10px', flexShrink: 0 }}>
            <input 
              type="text" 
              placeholder="Oszd meg a meglátásodat a fotóról..." 
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              style={{ flex: 1, padding: '12px 15px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '10px', outline: 'none', fontSize: '0.92rem' }}
            />
            <button 
              type="submit" 
              disabled={!newComment.trim()}
              style={{ background: !newComment.trim() ? '#334155' : 'linear-gradient(135deg, #38bdf8, #0284c7)', color: !newComment.trim() ? '#64748b' : 'white', border: 'none', padding: '0 25px', borderRadius: '10px', fontWeight: 'bold', cursor: !newComment.trim() ? 'not-allowed' : 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}
            >
              Küldés
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
