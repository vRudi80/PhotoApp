import React, { useState, useEffect } from 'react';
import { BACKEND_URL, ADMIN_EMAIL } from '../utils/constants';

interface ClubNewsViewProps {
  user: any;           
  currentDbUser: any;  
  mode?: 'club' | 'public'; 
}

export default function ClubNewsView({ user, currentDbUser, mode = 'club' }: ClubNewsViewProps) {
  const [clubId, setClubId] = useState<number | null>(null);
  
  const [newsList, setNewsList] = useState<any[]>([]);
  const [expandedNewsId, setExpandedNewsId] = useState<number | null>(null);
  
  // Posztolás
  const [isPosting, setIsPosting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isPublicNews, setIsPublicNews] = useState(false); 

  // Olvasók és Kommentek
  const [readers, setReaders] = useState<any[]>([]);
  const [showReaders, setShowReaders] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  const isLeader = currentDbUser?.club_role === 'leader' || currentDbUser?.club_role === 'deputy' || user.email === ADMIN_EMAIL; 
// 🎯 KULCSFONTOSSÁGÚ JAVÍTÁS: Ha belső klubhíreket néz, de 'pending' a státusza, lezárjuk a felületet!
  if (mode === 'club' && (!currentDbUser?.club_name || currentDbUser?.club_role === 'pending')) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>
          {currentDbUser?.club_role === 'pending' ? 'Jelentkezésed jóváhagyásra vár' : 'Nincs klubtagságod'}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
          A belső klubhírek és bejelentések megtekintéséhez meg kell várnod, amíg a klubvezető elfogadja a tagfelvételi kérelmedet.
        </p>
      </div>
    );
  }
  const inputStyle = { width: '100%', padding: '12px', marginBottom: '15px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '8px', boxSizing: 'border-box' as const };

  useEffect(() => {
    if (mode === 'public') return; 
    
    const fetchClubId = async () => {
      if (!currentDbUser?.club_name) return;
      try {
        const res = await fetch(`${BACKEND_URL}/api/clubs`);
        if (res.ok) {
          const clubs = await res.json();
          const myClub = clubs.find((c: any) => c.name === currentDbUser.club_name);
          if (myClub) setClubId(myClub.id);
        }
      } catch (e) {
        console.error("Hiba a klubok lekérésekor", e);
      }
    };
    fetchClubId();
  }, [currentDbUser?.club_name, mode]);

  const fetchNews = async () => {
    try {
      if (mode === 'public') {
        const res = await fetch(`${BACKEND_URL}/api/news/public?userEmail=${user.email}`);
        if (res.ok) setNewsList(await res.json());
        return;
      }

      if (mode === 'club' && !clubId) {
        setNewsList([]);
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/clubs/${clubId}/news?userEmail=${user.email}`);
      if (res.ok) setNewsList(await res.json());

    } catch (e) { 
      console.error("Hiba a hírek frissítésekor:", e); 
    }
  };

  useEffect(() => {
    if (mode === 'public' || (mode === 'club' && clubId !== null)) {
      fetchNews();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, mode]);

  const handleExpandNews = async (newsId: number) => {
    if (expandedNewsId === newsId) {
      setExpandedNewsId(null);
      return;
    }
    setExpandedNewsId(newsId);
    setShowReaders(false);

    setNewsList(prev => prev.map(n => n.id === newsId ? { ...n, is_read: 1 } : n));
    
    try {
      await fetch(`${BACKEND_URL}/api/news/${newsId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email })
      });
      const res = await fetch(`${BACKEND_URL}/api/news/${newsId}/comments`);
      if (res.ok) setComments(await res.json());
    } catch (e) { console.error(e); }
  };

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
    if (!clubId) return;
    if (!newTitle.trim() || !newContent.trim()) return alert("Cím és tartalom is kötelező!");
    try {
      const res = await fetch(`${BACKEND_URL}/api/clubs/${clubId}/news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email, userName: user.name, title: newTitle, content: newContent, isPublic: isPublicNews })
      });
      if (res.ok) {
        setNewTitle('');
        setNewContent('');
        setIsPublicNews(false);
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
      
      {mode === 'club' && !currentDbUser?.club_name ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>Nem vagy klubhoz rendelve</h2>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>A klubod híreinek megtekintéséhez kérjük, vedd fel a kapcsolatot egy adminisztrátorral. - kovari.rudolf@gmail.com</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
            <h2 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '2.5rem' }}>📰</span> {mode === 'public' ? 'Nyilvános Fotós Közlemények' : `Klub Hírek: ${currentDbUser.club_name}`}
            </h2>

            {mode === 'club' && isLeader && (
              <button 
                onClick={() => setIsPosting(!isPosting)}
                style={{ background: isPosting ? '#ef4444' : '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {isPosting ? '✖ Mégse' : '✍️ Új Hír Posztolása'}
              </button>
            )}
          </div>

          {mode === 'club' && isLeader && isPosting && (
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '2px solid #10b981', marginBottom: '25px', animation: 'fadeIn 0.3s ease-out' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#10b981' }}>Közlemény írása</h3>
              <input placeholder="Hír címe (pl. Fontos változás a stúdió beosztásában!)" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={inputStyle} />
              <textarea placeholder="Írd ide a részleteket..." value={newContent} onChange={e => setNewContent(e.target.value)} style={{...inputStyle, minHeight: '120px'}} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', userSelect: 'none' }}>
                <input type="checkbox" id="publicNewsCheck" checked={isPublicNews} onChange={e => setIsPublicNews(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <label htmlFor="publicNewsCheck" style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer' }}>📢 Legyen ez a hír teljesen nyilvános (minden feliratkozott tag láthatja kívülről is)</label>
              </div>

              <button onClick={handlePostNews} style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
                🚀 Közzététel a tagoknak
              </button>
            </div>
          )}

          {newsList.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '1.1rem', textAlign: 'center', padding: '40px', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
              {mode === 'public' ? 'Jelenleg nincsenek nyilvános közlemények a rendszerben.' : 'Jelenleg nincsenek aktív hírek ebben a klubban.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {newsList.map((news) => {
                const isExpanded = expandedNewsId === news.id;
                const isUnread = !news.is_read || news.is_read === 0;
                
                return (
                  <div key={news.id} style={{ background: '#1e293b', borderRadius: '12px', border: isExpanded ? '1px solid #38bdf8' : (isUnread ? '1px solid #ef444450' : '1px solid #334155'), overflow: 'hidden', transition: 'all 0.3s', position: 'relative' }}>
                    
                    <div 
                      onClick={() => handleExpandNews(news.id)}
                      style={{ padding: '20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isExpanded ? '#0f172a' : 'transparent' }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          {isUnread && (
                            <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                              ÚJ HÍR
                            </span>
                          )}
                          {news.is_public === 1 && (
                            <span style={{ background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                              📢 NYILVÁNOS
                            </span>
                          )}
                          <span>📅 {new Date(news.created_at).toLocaleDateString('hu-HU')}</span>
                          <span>✍️ {news.author_name} {mode === 'public' && <b style={{ color: '#38bdf8' }}>(🏛️ {news.club_name})</b>}</span>
                        </div>
                        <h3 style={{ margin: 0, color: isExpanded ? '#38bdf8' : (isUnread ? '#f8fafc' : '#cbd5e1'), fontSize: '1.2rem', transition: 'color 0.2s' }}>
                          {news.title}
                        </h3>
                      </div>
                      <div style={{ fontSize: '1.5rem', color: isUnread ? '#ef4444' : '#64748b', transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
                        ▼
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid #334155', animation: 'fadeIn 0.3s ease-out' }}>
                        
                        <p style={{ color: '#cbd5e1', lineHeight: '1.6', fontSize: '1rem', whiteSpace: 'pre-wrap', marginTop: '20px' }}>
                          {news.content}
                        </p>

                        {/* 🎯 JAVÍTVA: Az egész gomb- és olvasó-szekciót elrejtjük a sima felhasználók elől */}
                        {isLeader && (
                          <>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed #334155' }}>
                              <button onClick={() => fetchReaders(news.id)} style={{ background: '#3b82f620', color: '#3b82f6', border: '1px solid #3b82f650', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                👁️ {showReaders ? 'Olvasók elrejtése' : 'Kik olvasták el?'}
                              </button>
                              {mode === 'club' && (
                                <button onClick={() => handleDeleteNews(news.id)} style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444450', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                  🗑️ Hír Törlése
                                </button>
                              )}
                            </div>

                            {showReaders && (
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
                          </>
                        )}

                        {/* HOZZÁSZÓLÁSOK (Mindenki számára elérhető) */}
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
                              style={{ background: newComment.trim() ? '#38bdf8' : '#334155', color: '#0f172a', border: 'none', padding: '0 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s' }}
                            >
                              Küldés
                            </button>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
