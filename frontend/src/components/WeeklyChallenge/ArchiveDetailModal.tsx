import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getImageUrl } from '../../utils/helpers';
import VideoLoader from '../../components/VideoLoader';
import { BACKEND_URL } from '../../utils/constants';

// Nyelvi kontextus aktiválása
import { useLanguage } from '../../context/LanguageContext';

// Téma környezet betöltése a reaktív színváltáshoz
import { useTheme } from '../../context/ThemeContext';

// Professzionális Lucide Ikonok importálása az AI-sallangok ellen
import { 
  ArrowLeft, 
  Crown, 
  Shield, 
  Zap, 
  Trophy, 
  Medal, 
  Camera, 
  Star,
  Eye,
  Clock,
  Layers,
  X,
  MessageSquare,
  Send,
  Heart
} from 'lucide-react';

interface ArchiveDetailModalProps {
  entry: any;
  userEmail: string;
  userName: string;
  onClose: () => void;
  onLikeUpdate: () => void;
}

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.src = 'https://via.placeholder.com/400x300/1e293b/64748b?text=Image+not+found';
};

export default function ArchiveDetailModal({ entry, userEmail, userName, onClose, onLikeUpdate }: ArchiveDetailModalProps) {
  const { t, lang } = useLanguage();

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const [likesCount, setLikesCount] = useState<number>(Number(entry?.archive_likes) || 0);
  const [isLiked, setIsLiked] = useState<boolean>(entry?.has_user_liked === 1 || entry?.has_user_liked === true);

  let isLight = false;
  try {
    const themeContext = useTheme();
    if (themeContext) {
      isLight = themeContext.theme === 'light';
    }
  } catch (e) {}

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
    <div style={{ position: 'fixed', inset: 0, background: isLight ? 'rgba(240,244,248,0.95)' : 'rgba(9, 13, 22, 0.96)', backdropFilter: 'blur(16px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
      
      <style>{`
        .theater-modal-card {
          background: var(--bg-card);
          border: 1px solid var(--border-main);
          border-radius: 8px;
          width: 100%;
          max-width: 1000px;
          height: 92vh;
          max-height: 92dvh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.2);
        }

        .theater-photo-section {
          background: #060912;
          flex: 1.2 !important; 
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          position: relative;
          min-height: 0;
          border-bottom: 1px solid var(--border-main);
        }

        .theater-archive-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 4px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        }

        .theater-info-section {
          flex: 1 !important; 
          display: flex;
          flex-direction: column;
          background: var(--bg-card);
          min-height: 0;
        }

        .theater-header-row {
          padding: 15px 25px;
          border-bottom: 1px solid var(--border-main);
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
          padding: 16px 25px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: var(--bg-main);
          min-height: 160px; 
        }
      `}</style>

      <div className="theater-modal-card">
        <div className="theater-photo-section">
          <button onClick={onClose} style={{ position: 'absolute', top: '20px', left: '20px', background: '#222f47', border: '1px solid #334155', color: '#cbd5e1', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', zIndex: 10, transition: 'all 0.15s ease', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }} className="modal-top-close-cross">
            <ArrowLeft size={14} /> {t('archiveBtnBack', 'Vissza')}
          </button>
          <img className="theater-archive-img" src={entry.file_url} alt="" onError={handleImageError} />
        </div>

        <div className="theater-info-section">
          <div className="theater-header-row">
            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <h3 style={{ color: isLight ? '#0284c7' : '#38bdf8', margin: 0, fontSize: '1.3rem', fontWeight: '700', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', letterSpacing: '-0.3px' }}>
                {entry.user_name}
              </h3>
              {entry.club_name && (
                <div style={{ display: 'flex', width: 'auto', flexShrink: 0, whiteSpace: 'nowrap', marginTop: '2px' }}>
                  <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(16,185,129,0.06)', padding: '3px 10px', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.2)', display: 'inline-block', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    {entry.club_name}
                  </span>
                </div>
              )}
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 'bold', marginTop: '4px' }}>
                {lang === 'en' ? 'Result: ' : 'Eredmény: '} <span style={{ color: '#f59e0b' }}>{entry.likes_count} ⭐</span>
              </div>
            </div>

            <button 
              onClick={handleLike}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isLiked ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-main)', border: isLiked ? '1px solid #ef4444' : '1px solid var(--border-main)', color: isLiked ? '#f87171' : 'var(--text-body)', padding: '10px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.15s ease', flexShrink: 0, fontSize: '0.88rem' }}
            >
              <Heart size={14} fill={isLiked ? '#f87171' : 'transparent'} color={isLiked ? '#f87171' : 'var(--text-body)'} />
              <span>{likesCount} {lang === 'en' ? 'appreciations' : 'elismerés'}</span>
            </button>
          </div>

          <div className="theater-comments-flow">
            <h4 style={{ color: 'var(--text-muted)', margin: '0 0 2px 0', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={12} /> {lang === 'en' ? 'DISCUSSION' : 'ESZMECSERE'}
            </h4>
            
            {loadingComments && comments.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '10px', fontSize: '0.82rem', fontStyle: 'italic' }}>Gondolatok betöltése...</div>
            ) : comments.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 20px', margin: 'auto 0', fontStyle: 'italic', fontSize: '0.88rem' }}>{lang === 'en' ? 'Write the first thought about this photo! 🪶' : 'Írd le az első gondolatot a fotóról! 🪶'}</div>
            ) : (
              comments.map((c) => {
                const isMe = c.user_email === userEmail;
                return (
                  <div key={c.id} style={{ background: isMe ? 'var(--bg-card)' : 'var(--bg-main)', padding: '10px 14px', borderRadius: '4px', border: isMe ? '1px solid var(--text-muted)' : '1px solid var(--border-main)', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', width: 'fit-content', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', marginBottom: '3px', alignItems: 'center' }}>
                      <strong style={{ color: isMe ? '#f97316' : (isLight ? '#0284c7' : '#38bdf8'), fontSize: '0.78rem', fontWeight: 'bold' }}>{c.user_name}</strong>
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.68rem', fontFamily: 'monospace' }}>{new Date(c.created_at).toLocaleTimeString(lang === 'en' ? 'en-US' : 'hu-HU', {hour: '2-digit', minute:'2-digit'})}</small>
                    </div>
                    <p style={{ color: 'var(--text-title)', margin: 0, fontSize: '0.85rem', lineHeight: '1.4', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.comment_text}</p>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleCommentSubmit} style={{ padding: '12px 20px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-main)', display: 'flex', gap: '10px', flexShrink: 0, boxSizing: 'border-box' }}>
            <input 
              type="text" 
              placeholder={lang === 'en' ? 'Share your thoughts about this photo...' : 'Oszd meg a meglátásodat a fotóról...'} 
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'var(--text-title)', borderRadius: '4px', outline: 'none', fontSize: '0.88rem' }}
            />
            <button 
              type="submit" 
              disabled={!newComment.trim()}
              style={{ background: !newComment.trim() ? 'var(--border-main)' : '#f97316', color: !newComment.trim() ? 'var(--text-muted)' : 'white', border: 'none', padding: '0 20px', borderRadius: '4px', fontWeight: 'bold', cursor: !newComment.trim() ? 'not-allowed' : 'pointer', fontSize: '0.85rem', transition: 'background 0.15s ease', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Send size={12} />
              <span>{lang === 'en' ? 'Send' : 'Küldés'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
