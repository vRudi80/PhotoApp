import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/constants';

interface ClubNewsViewProps {
  user: any;
  clubId: number;
}

export default function ClubNewsView({ user, clubId }: ClubNewsViewProps) {
  const [newsList, setNewsList] = useState<any[]>([]);
  const [expandedNewsId, setExpandedNewsId] = useState<number | null>(null);
  
  // Posztolás (Csak vezető)
  const [isPosting, setIsPosting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  
  // Olvasók és Kommentek
  const [readers, setReaders] = useState<any[]>([]);
  const [showReaders, setShowReaders] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  // Jogosultság ellenőrzése: Csak a 'leader' (vagy admin) posztolhat/láthat olvasottságot
  const isLeader = user.club_role === 'leader' || user.email === 'kovari.rudolf@gmail.com'; 

  const inputStyle = { width: '100%', padding: '12px', marginBottom: '15px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '8px', boxSizing: 'border-box' as const };

  const fetchNews = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/clubs/${clubId}/news`);
      if (res.ok) setNewsList(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (clubId) fetchNews();
  }, [clubId]);

  // Hír megnyitása: Rögzíti, hogy elolvasta, majd behúzza a kommenteket
  const handleExpandNews = async (newsId: number) => {
    if (expandedNewsId === newsId) {
      setExpandedNewsId(null);
      return;
    }
    setExpandedNewsId(newsId);
    setShowReaders(false);
    
    try {
      // Olvasottság jelzése a szervernek
      await fetch(`${BACKEND_URL}/api/news/${newsId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email })
      });
      // Kommentek betöltése
      const res = await fetch(`${BACKEND_URL}/api/news/${newsId}/comments`);
      if (res.ok) setComments(await res.json());
    } catch (e) { console.error(e); }
  };

  // Vezetőknek: Kik olvasták el?
  const fetchReaders = async (newsId: number) => {
    if (showReaders) {
      setShowReaders(false);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/news/${newsId}/readers`);
      if (res.ok) {
        setReaders(await res.json());
        setShowReaders(true);
      }
    } catch (e) { console.error(e); }
  };

  const handlePostNews = async () => {
    if (!newTitle.trim() || !newContent.trim()) return alert("Cím és tartalom is kötelező!");
    try {
      const res = await fetch(`${BACKEND_URL}/api/clubs/${clubId}/news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email, userName: user.name, title: newTitle, content: newContent })
      });
      if (res.ok) {
        setNewTitle('');
        setNewContent('');
        setIsPosting(false);
        fetchNews();
      }
    } catch (e) { alert("Hiba a mentésnél!"); }
  };

  const handleDeleteNews = async (newsId: number) => {
    if (!window.confirm("Biztosan törlöd ezt a hírt? (Minden komment is elvész!)")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/news/${newsId}`, { method: 'DELETE' });
      if (res.ok) {
        setExpandedNewsId(null);
        fetchNews();
      }
    } catch (e) { alert("Törlési hiba!"); }
  };

  const handlePostComment = async (newsId: number) => {
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/news/${newsId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email, userName: user.name, commentText: newComment })
      });
      if (res.ok) {
        setNewComment('');
        const cRes = await fetch(`${BACKEND_URL}/api/news/${newsId}/comments`);
        if (cRes.ok) setComments(await cRes.json());
      }
    } catch (e) { alert("Hiba a kommentelésnél!"); }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* CÍMSOR ÉS POSZTOLÁS GOMB (VEZETŐKNEK) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ fontSize: '1.8rem', margin: 0, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
          📰 Klub Hírek & Közlemények
        </h2>
        {isLeader && (
          <button 
            onClick={() => setIsPosting(!isPosting)}
            style={{ background: isPosting ? '#ef4444' : '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isPosting ? '✖ Mégse' : '✍️ Új Hír Posztolása'}
          </button>
        )}
      </div>

      {/* ÚJ HÍR ŰRLAP */}
      {isLeader && isPosting && (
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '2px solid #10b981', marginBottom: '25px', animation: 'fadeIn 0.3s ease-out' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#10b981' }}>Közlemény írása</h3>
          <input placeholder="Hír címe (pl. Fontos változás a stúdió beosztásában!)" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={inputStyle} />
          <textarea placeholder="Írd ide a részleteket..." value={newContent} onChange={e => setNewContent(e.target.value)} style={{...inputStyle, minHeight: '120px'}} />
          <button onClick={handlePostNews} style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
            🚀 Közzététel a tagoknak
          </button>
        </div>
      )}

      {/* HÍREK LISTÁJA */}
      {newsList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', background: '#1e293b', borderRadius: '12px', color: '#94a3b8' }}>
          Jelenleg nincsenek aktív hírek ebben a klubban.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {newsList.map((news) => {
            const isExpanded = expandedNewsId === news.id;
            
            return (
              <div key={news.id} style={{ background: '#1e293b', borderRadius: '12px', border: isExpanded ? '1px solid #38bdf8' : '1px solid #334155', overflow: 'hidden', transition: 'all 0.3s' }}>
                
                {/* Hír Fejléce (Kattintható lenyitó) */}
                <div 
                  onClick={() => handleExpandNews(news.id)}
                  style={{ padding: '20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isExpanded ? '#0f172a' : 'transparent' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '5px', display: 'flex', gap: '10px' }}>
                      <span>📅 {new Date(news.created_at).toLocaleDateString('hu-HU')}</span>
                      <span>✍️ {news.author_name}</span>
                    </div>
                    <h3 style={{ margin: 0, color: isExpanded ? '#38bdf8' : '#f8fafc', fontSize: '1.2rem' }}>
                      {news.title}
                    </h3>
                  </div>
                  <div style={{ fontSize: '1.5rem', color: '#64748b', transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
                    ▼
                  </div>
                </div>

                {/* Hír Tartalma és Kommentek (Lenyitva) */}
                {isExpanded && (
                  <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid #334155', animation: 'fadeIn 0.3s ease-out' }}>
                    
                    <p style={{ color: '#cbd5e1', lineHeight: '1.6', fontSize: '1rem', whiteSpace: 'pre-wrap', marginTop: '20px' }}>
                      {news.content}
                    </p>

                    {/* Vezérlő Gombok (Olvasottság / Törlés) */}
                    {isLeader && (
                      <div style={{ display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed #334155' }}>
                        <button onClick={() => fetchReaders(news.id)} style={{ background: '#3b82f620', color: '#3b82f6', border: '1px solid #3b82f650', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          👁️ {showReaders ? 'Olvasók elrejtése' : 'Kik olvasták el?'}
                        </button>
                        <button onClick={() => handleDeleteNews(news.id)} style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444450', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          🗑️ Hír Törlése
                        </button>
                      </div>
                    )}

                    {/* Olvasók Listája (Csak vezetőnek, ha lenyitja) */}
                    {isLeader && showReaders && (
                      <div style={{ marginTop: '15px', background: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#3b82f6', fontSize: '0.9rem' }}>Ezt a hírt eddig {readers.length} tag olvasta el:</h4>
                        {readers.length === 0 ? (
                          <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Még senki sem nyitotta meg.</div>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {readers.map((r, idx) => (
                              <span key={idx} style={{ background: '#1e293b', color: '#cbd5e1', padding: '4px 10px', borderRadius: '50px', fontSize: '0.8rem', border: '1px solid #475569' }}>
                                ✓ {r.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* KOMMENTEK */}
                    <div style={{ background: '#0f172a', borderRadius: '12px', padding: '15px', marginTop: '25px', border: '1px solid #1e293b' }}>
                      <h4 style={{ margin: '0 0 15px 0', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        💬 Hozzászólások <span style={{ background: '#334155', padding: '2px 8px', borderRadius: '50px', fontSize: '0.75rem' }}>{comments.length}</span>
                      </h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px', maxHeight: '300px', overflowY: 'auto' }}>
                        {comments.length === 0 ? (
                          <div style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>Még nincs hozzászólás.</div>
                        ) : (
                          comments.map(c => (
                            <div key={c.id} style={{ background: '#1e293b', padding: '10px 15px', borderRadius: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <b style={{ color: '#38bdf8', fontSize: '0.85rem' }}>{c.user_name}</b>
                                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{new Date(c.created_at).toLocaleDateString('hu-HU')}</span>
                              </div>
                              <div style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.4' }}>{c.comment_text}</div>
                            </div>
                          ))
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                          type="text" 
                          placeholder="Írj hozzászólást..." 
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment(news.id); }}
                          style={{ flex: 1, padding: '10px 15px', borderRadius: '20px', border: '1px solid #334155', background: '#1e293b', color: 'white', outline: 'none' }}
                        />
                        <button 
                          onClick={() => handlePostComment(news.id)}
                          disabled={!newComment.trim()}
                          style={{ background: newComment.trim() ? '#38bdf8' : '#334155', color: '#0f172a', border: 'none', padding: '0 20px', borderRadius: '20px', cursor: newComment.trim() ? 'pointer' : 'not-allowed', fontWeight: 'bold', transition: 'background 0.2s' }}
                        >
                          Küldés
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
