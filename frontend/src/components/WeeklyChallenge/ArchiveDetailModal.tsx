import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../utils/constants';

// 🎯 ÚJ IMPORT: Behozzuk a nyelvi kontextust a nemzetközi működéshez
import { useLanguage } from '../../context/LanguageContext';

interface ArchiveDetailModalProps {
  entry: any;
  userEmail: string;
  userName: string;
  onClose: () => void;
  onLikeUpdate: () => void;
}

// ── 🛡️ JAVÍTVA: Globális kép-helyreállító motor a törések ellen ──
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.src = 'https://via.placeholder.com/400x300/1e293b/64748b?text=Image+not+found';
};

export default function ArchiveDetailModal({ entry, userEmail, userName, onClose, onLikeUpdate }: ArchiveDetailModalProps) {
  const { t } = useLanguage();

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // ⚡ LOKÁLIS MEMÓRIA: Azonnali vizuális visszajelzés a lájkokhoz
  const [likesCount, setLikesCount] = useState<number>(Number(entry?.likes_count || entry?.archive_likes) || 0);
  const [isLiked, setIsLiked] = useState<boolean>(entry?.has_user_liked === 1 || entry?.has_user_liked === true);

  // Biztonsági háló: Ha a beküldött entry megváltozik, szinkronizálunk
  useEffect(() => {
    setLikesCount(Number(entry?.likes_count || entry?.archive_likes) || 0);
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
      alert("❌ Hiba: A system nem azonosította a profilodat! Jelentkezz be újra.");
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
      
      {/* 🎯 ULTRA RESZPONZÍV STYLING INJECTOR MOBILOKHOZ ÉS ASZTALRA */}
      <style>{`
        .responsive-archive-card {
          background: #1e293b;
          border: '1px solid #334155';
          border-radius: 24px;
          width: 100%;
          max-width: 1250px;
          height: 85vh;
          display: grid;
          grid-template-columns: 1fr 400px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8);
        }

        @media (max-width: 950px) {
          .responsive-archive-card {
            grid-template-columns: 1fr !important;
            height: 90vh !important;
            height: 90dvh !important;
            overflow-y: auto !important;
          }
          .responsive-photo-box {
            border-right: none !important;
            border-bottom: 1px solid #334155 !important;
            padding: 20px !important;
            height: auto !important;
            min-height: 300px !important;
          }
          .responsive-archive-img {
            max-height: 50vh !important;
            width: auto !important;
          }
          .responsive-comment-box {
            height: auto !important;
            min-height: 450px !important;
          }
        }
      `}</style>

      {/* 1. FŐ KÁRTYA CONTAINER */}
      <div className="responsive-archive-card">
        
        {/* BAL OLDAL: FOTÓ PANEL (MOZI ÉLMÉNY) */}
        <div className="responsive-photo-box" style={{ background: '#090d16', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '30px', position: 'relative', borderRight: '1px solid #334155', height: '100%', boxSizing: 'border-box', minWidth: 0 }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '20px', left: '20px', background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '8px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', zIndex: 10, transition: 'all 0.2s', fontSize: '0.85rem' }}>⬅️ Bezárás</button>
          <img className="responsive-archive-img" src={entry.file_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} onError={handleImageError} />
        </div>

        {/* JOBB OLDAL: MEGBESZÉLŐ PANEL */}
        <div className="responsive-comment-box" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0f172a', minWidth: 0 }}>
          
          {/* Alkotói fejrész */}
          <div style={{ padding: '25px', borderBottom: '1px solid #223047', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexShrink: 0 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '1.2rem', fontWeight: 'bold', overflowWrap: 'break-word', lineHeight: '1.3' }}>
                Alkotó: {entry.user_name}
              </h3>
              <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px', fontWeight: 'bold' }}>
                Hivatalos eredmény: <span style={{ color: '#f59e0b' }}>{entry.likes_count} ⭐</span>
              </div>
            </div>

            <button 
              onClick={handleLike}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isLiked ? 'rgba(239, 68, 68, 0.15)' : '#1e293b', border: isLiked ? '1px solid #ef4444' : '1px solid #334155', color: isLiked ? '#f87171' : '#cbd5e1', padding: '10px 16px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0, fontSize: '0.88rem' }}
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{isLiked ? '❤️' : '🤍'}</span>
              <span>{likesCount}</span>
            </button>
          </div>

          {/* Gördíthető kommentfolyam */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px', background: '#090d1640' }}>
            <h4 style={{ color: '#38bdf8', margin: '0 0 5px 0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>⚔️ Eszmecsere</h4>
            
            {loadingComments && comments.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '20px', fontSize: '0.9rem' }}>Gondolatok betöltése...</div>
            ) : comments.length === 0 ? (
              <div style={{ color: '#475569', textAlign: 'center', padding: '40px 20px', fontStyle: 'italic', fontSize: '0.95rem' }}>Írd le az első gondolatot! 🪶</div>
            ) : (
              comments.map((c) => {
                const isMe = c.user_email === userEmail;
                return (
                  <div key={c.id} style={{ background: isMe ? '#1e293b' : '#1e293b60', padding: '12px 15px', borderRadius: '14px', border: isMe ? '1px solid #475569' : '1px solid #334155', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '90%', width: 'fit-content', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '25px', marginBottom: '4px', alignItems: 'center' }}>
                      <strong style={{ color: isMe ? '#f59e0b' : '#38bdf8', fontSize: '0.82rem', fontWeight: 'bold' }}>{c.user_name}</strong>
                      <small style={{ color: '#475569', fontSize: '0.72rem', fontFamily: 'monospace' }}>{new Date(c.created_at).toLocaleTimeString('hu-HU', {hour: '2-digit', minute:'2-digit'})}</small>
                    </div>
                    <p style={{ color: '#cbd5e1', margin: 0, fontSize: '0.92rem', lineHeight: '1.4', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.comment_text}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Kommentküldő űrlap */}
          <form onSubmit={handleCommentSubmit} style={{ padding: '20px', background: '#1e293b', borderTop: '1px solid #334155', display: 'flex', gap: '10px', flexShrink: 0 }}>
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
              style={{ background: !newComment.trim() ? '#334155' : 'linear-gradient(135deg, #38bdf8, #0284c7)', color: !newComment.trim() ? '#64748b' : 'white', border: 'none', padding: '0 20px', borderRadius: '10px', fontWeight: 'bold', cursor: !newComment.trim() ? 'not-allowed' : 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}
            >
              Küldés
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
