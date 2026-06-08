import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../utils/constants';

interface ArchiveDetailModalProps {
  entry: any; // Az aktuálisan kiválasztott kép adatai
  user: any;  // Bejelentkezett felhasználó
  onClose: () => void;
  onLikeUpdate: () => void; // Frissíti a szülőt, ha változik a lájk száma
}

export default function ArchiveDetailModal({ entry, user, onClose, onLikeUpdate }: ArchiveDetailModalProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

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
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/archive/like-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: entry.id, userEmail: user?.email })
      });
      if (res.ok) {
        onLikeUpdate(); // Értesítjük az Archívumot, hogy kérje le újra a listát a friss darabszámért
      }
    } catch (e) { console.error(e); }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/archive/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: entry.id,
          userEmail: user?.email,
          userName: user?.name || 'Névtelen harcos',
          commentText: newComment
        })
      });
      if (res.ok) {
        setNewComment('');
        fetchComments(); // Frissítjük a listát
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '24px', width: '100%', maxWidth: '1100px', height: '85vh', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)' }}>
        
        {/* 🖼️ BAL OLDAL: A FOTÓ KIEMELVE */}
        <div style={{ background: '#090d16', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', position: 'relative', borderRight: '1px solid #334155' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '20px', left: '20px', background: '#1e293b', border: 'none', color: '#94a3b8', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>⬅️ Bezárás</button>
          <img src={entry.file_url} alt="" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '12px' }} />
        </div>

        {/* 💬 JOBB OLDAL: INTERAKCIÓS PANEL (Lájk + Kommentek) */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0f172a' }}>
          
          {/* FEJLÉC & UTÓLAGOS ELISMERÉS */}
          <div style={{ padding: '25px', borderBottom: '1px solid #223047', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: 'white', margin: 0, fontSize: '1.2rem' }}>Alkotó: {entry.user_name}</h3>
              <small style={{ color: '#64748b' }}>Hivatalos eredmény: {entry.likes_count} ⭐</small>
            </div>

            {/* ❤️ UTÓLAGOS LÁJK GOMB */}
            <button 
              onClick={handleLike}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: entry.has_user_liked ? 'rgba(239, 68, 68, 0.15)' : '#1e293b', border: entry.has_user_liked ? '1px solid #ef4444' : '1px solid #334155', color: entry.has_user_liked ? '#f87171' : '#cbd5e1', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <span style={{ fontSize: '1.2rem' }}>{entry.has_user_liked ? '❤️' : '🤍'}</span>
              <span>{entry.archive_likes || 0} elismerés</span>
            </button>
          </div>

          {/* GÖRGETHETŐ CHAT-FOLYAM */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h4 style={{ color: '#94a3b8', margin: '0 0 5px 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>⚔️ Törzsi Tanács eszmecseréje</h4>
            
            {loadingComments && comments.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>Gondolatok betöltése...</div>
            ) : comments.length === 0 ? (
              <div style={{ color: '#475569', textAlign: 'center', padding: '40px 20px', fontStyle: 'italic', fontSize: '0.95rem' }}>Ezen alkotás mellett még csendesen elvonult a törzs. Írd le az első gondolatot! 🪶</div>
            ) : (
              comments.map((c) => {
                const isMe = c.user_email === user?.email;
                return (
                  <div key={c.id} style={{ background: isMe ? '#1e293b' : '#1e293b60', padding: '12px 15px', borderRadius: '14px', border: isMe ? '1px solid #475569' : '1px solid #334155', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', width: 'fit-content' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginBottom: '4px' }}>
                      <strong style={{ color: isMe ? '#f59e0b' : '#38bdf8', fontSize: '0.85rem' }}>{c.user_name}</strong>
                      <small style={{ color: '#475569', fontSize: '0.75rem' }}>{new Date(c.created_at).toLocaleTimeString('hu-HU', {hour: '2-digit', minute:'2-digit'})}</small>
                    </div>
                    <p style={{ color: '#f8fafc', margin: 0, fontSize: '0.95rem', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>{c.comment_text}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* BEVITELI MEZŐ */}
          <form onSubmit={handleCommentSubmit} style={{ padding: '20px', background: '#1e293b', borderTop: '1px solid #334155', display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="Oszd meg a meglátásodat a fotóról..." 
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              style={{ flex: 1, padding: '12px 15px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '10px', outline: 'none', fontSize: '0.95rem' }}
            />
            <button 
              type="submit" 
              disabled={!newComment.trim()}
              style={{ background: !newComment.trim() ? '#334155' : 'linear-gradient(135deg, #38bdf8, #0284c7)', color: !newComment.trim() ? '#64748b' : 'white', border: 'none', padding: '0 20px', borderRadius: '10px', fontWeight: 'bold', cursor: !newComment.trim() ? 'not-allowed' : 'pointer' }}
            >
              Küldés
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
