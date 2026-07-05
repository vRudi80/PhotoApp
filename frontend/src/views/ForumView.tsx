import React, { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL, ADMIN_EMAIL } from '../utils/constants';

// Nyelvi és téma kontextusok aktiválása
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

// Letisztult Lucide ikonok a modern fórum hangulathoz
import { 
  MessageSquare, 
  Send, 
  Heart, 
  Eye, 
  Trash2, 
  Plus, 
  Edit3, 
  Folder, 
  ArrowLeft, 
  Lock, 
  Globe, 
  User, 
  Calendar 
} from 'lucide-react';

interface ForumViewProps {
  user: any;           
  currentDbUser: any;  
  mode?: 'club' | 'public';
}

export default function ForumView({ user, currentDbUser, mode = 'club' }: ForumViewProps) {
  const { t, lang } = useLanguage();
  
  // Téma detektálása
  let isLight = false;
  try {
    const themeContext = useTheme();
    if (themeContext) isLight = themeContext.theme === 'light';
  } catch (e) {}

  // ==============================================================
  // 1. ÁLLAPOTOK KEZELÉSE
  // ==============================================================
  const [clubId, setClubId] = useState<number | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  
  // Kategória menedzsment (Admin)
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');

  // Új poszt indítása
  const [isPosting, setIsPosting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isPublicPost, setIsPublicPost] = useState(false); 

  // Olvasók és kommentek
  const [readers, setReaders] = useState<any[]>([]);
  const [showReaders, setShowReaders] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const isLeader = currentDbUser?.club_role === 'leader' || currentDbUser?.club_role === 'deputy' || isAdmin;

  const inputStyle = { 
    width: '100%', 
    padding: '12px', 
    marginBottom: '15px', 
    backgroundColor: 'var(--bg-main)', 
    border: '1px solid var(--border-main)', 
    color: 'var(--text-title)', 
    borderRadius: '8px', 
    boxSizing: 'border-box' as const,
    outline: 'none'
  };

  // 🎯 JAVÍTVA: Mostantól szabályosan fogadja és fűzi össze az extra Content-Type fejléceket!
  const getLocalAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
    const token = localStorage.getItem('photoAppToken');
    return { 
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...extraHeaders 
    };
  };

  // ==============================================================
  // 2. ADATOK SYNC MOTORJA
  // ==============================================================
  
  // Klub ID szinkronizálása
  useEffect(() => {
    if (mode === 'public') return; 
    const fetchClubId = async () => {
      if (!currentDbUser?.club_name) return;
      try {
        const res = await fetch(`${BACKEND_URL}/api/clubs`, { headers: getLocalAuthHeaders() });
        if (res.ok) {
          const clubs = await res.json();
          if (Array.isArray(clubs)) {
            const myClub = clubs.find((c: any) => c.name === currentDbUser.club_name);
            if (myClub) setClubId(myClub.id);
          }
        }
      } catch (e) { console.error(e); }
    };
    fetchClubId();
  }, [currentDbUser?.club_name, mode]);

  // Kategóriák betöltése
  const fetchCategories = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/forum/categories`, { headers: getLocalAuthHeaders() });
      if (res.ok) setCategories(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Bejegyzések betöltése kategória alapján
  const fetchPosts = async () => {
    if (!selectedCategoryId) return;
    setIsLoading(true);
    try {
      let url = `${BACKEND_URL}/api/forum/categories/${selectedCategoryId}/posts?mode=${mode}&userEmail=${user.email}`;
      if (mode === 'club' && clubId) {
        url += `&clubId=${clubId}`;
      }
      const res = await fetch(url, { headers: getLocalAuthHeaders() });
      if (res.ok) setPosts(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (selectedCategoryId && (mode === 'public' || (mode === 'club' && clubId !== null))) {
      fetchPosts();
    }
  }, [selectedCategoryId, clubId, mode]);

  // ==============================================================
  // 3. ADMIN KATEGÓRIA MŰVELETEK
  // ==============================================================
  const handleSaveCategory = async () => {
    if (!categoryNameInput.trim()) return alert("A név nem lehet üres!");
    try {
      const method = editingCategoryId ? 'PUT' : 'POST';
      const url = editingCategoryId 
        ? `${BACKEND_URL}/api/forum/categories/${editingCategoryId}`
        : `${BACKEND_URL}/api/forum/categories`;

      const res = await fetch(url, {
        method,
        headers: getLocalAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name: categoryNameInput.trim() })
      });

      if (res.ok) {
        setCategoryNameInput('');
        setIsAddingCategory(false);
        setEditingCategoryId(null);
        fetchCategories();
      } else {
        const errData = await res.json();
        alert(errData.error || "Sikertelen kategória mentés.");
      }
    } catch (e) { alert("Hiba a kategória mentésekor."); }
  };

  // ==============================================================
  // 4. FÓRUM BEJEGYZÉS ÉS KOMMENT MŰVELETEK
  // ==============================================================
  const handleExpandPost = async (postId: number) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }
    setExpandedPostId(postId);
    setShowReaders(false);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_read: 1 } : p));

    try {
      await fetch(`${BACKEND_URL}/api/news/${postId}/read`, {
        method: 'POST',
        headers: getLocalAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userEmail: user.email })
      });
      const res = await fetch(`${BACKEND_URL}/api/news/${postId}/comments`, { headers: getLocalAuthHeaders() });
      if (res.ok) setComments(await res.json());
    } catch (e) { console.error(e); }
  };

  const handlePostThread = async () => {
    if (!selectedCategoryId) return;
    if (!newTitle.trim() || !newContent.trim()) return alert("Minden mező kitöltése kötelező!");

    try {
      const res = await fetch(`${BACKEND_URL}/api/forum/categories/${selectedCategoryId}/posts`, {
        method: 'POST',
        headers: getLocalAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          clubId: mode === 'club' ? clubId : null,
          userEmail: user.email,
          userName: user.name,
          title: newTitle,
          content: newContent,
          isPublic: isPublicPost
        })
      });

      if (res.ok) {
        setNewTitle('');
        setNewContent('');
        setIsPosting(false);
        fetchPosts();
      } else {
        const err = await res.json();
        alert(err.error || "Hiba a posztolás során.");
      }
    } catch (e) { alert("Sikertelen közzététel."); }
  };

  const handlePostComment = async (postId: number) => {
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/news/${postId}/comments`, {
        method: 'POST',
        headers: getLocalAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userEmail: user.email, userName: user.name, commentText: newComment })
      });
      if (res.ok) {
        setNewComment('');
        const cRes = await fetch(`${BACKEND_URL}/api/news/${postId}/comments`, { headers: getLocalAuthHeaders() });
        if (cRes.ok) setComments(await cRes.json());
      }
    } catch (e) { alert("Hiba a hozzászólásnál."); }
  };

  const handleDeletePost = async (postId: number) => {
    if (!window.confirm("Biztosan törlöd ezt a témát? Minden hozzászólás törlődni fog!")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/news/${postId}`, { method: 'DELETE', headers: getLocalAuthHeaders() });
      if (res.ok) {
        setExpandedPostId(null);
        fetchPosts();
      }
    } catch (e) { alert("Törlési hiba."); }
  };

  const fetchReaders = async (postId: number) => {
    if (showReaders) return setShowReaders(false);
    try {
      const res = await fetch(`${BACKEND_URL}/api/news/${postId}/readers`, { headers: getLocalAuthHeaders() });
      if (res.ok) {
        setReaders(await res.json());
        setShowReaders(true);
      }
    } catch (e) { console.error(e); }
  };

  // ==============================================================
  // 5. RENDERING SZŰRŐK ÉS NÉZETEK
  // ==============================================================
  if (mode === 'club' && (!currentDbUser?.club_name || currentDbUser?.club_role === 'pending')) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-main)' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>
          {currentDbUser?.club_role === 'pending' ? 'Jelentkezésed jóváhagyásra vár' : 'Nincs klubtagságod'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          A belső klubfórum és bejelentések megtekintéséhez meg kell várnod, amíg a klubvezető jóváhagyja a tagságodat.
        </p>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* KATEGÓRIÁK FŐOLDAL */}
      {selectedCategoryId === null ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
            <h2 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '15px', color: 'var(--text-title)' }}>
              <span style={{ fontSize: '2.5rem' }}>🏛️</span> {mode === 'public' ? 'Nyilvános Fotós Fórum' : `Klub Fórum: ${currentDbUser?.club_name}`}
            </h2>
            {isAdmin && (
              <button 
                onClick={() => { setIsAddingCategory(!isAddingCategory); setEditingCategoryId(null); setCategoryNameInput(''); }}
                style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> Új Fórumcsoport
              </button>
            )}
          </div>

          {/* Kategória hozzáadás/szerkesztés panel (Admin) */}
          {isAdmin && isAddingCategory && (
            <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '2px solid #10b981', marginBottom: '25px' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#10b981' }}>{editingCategoryId ? 'Fórumcsoport átnevezése' : 'Új fórumcsoport létrehozása'}</h3>
              <input placeholder="Kategória neve (pl. Analóg Fotográfia, Technikai Segítség)..." value={categoryNameInput} onChange={e => setCategoryNameInput(e.target.value)} style={inputStyle} />
              <button onClick={handleSaveCategory} style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                💾 Mentés és Aktiválás
              </button>
            </div>
          )}

          {/* Kategória lista */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {categories.map(cat => (
              <div 
                key={cat.id} 
                onClick={() => setSelectedCategoryId(cat.id)}
                style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-main)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div style={{ background: cat.id === 1 ? 'rgba(245,158,11,0.1)' : 'rgba(56,189,248,0.1)', color: cat.id === 1 ? '#f59e0b' : '#38bdf8', padding: '12px', borderRadius: '10px' }}>
                    {cat.id === 1 ? <Lock size={24} /> : <MessageSquare size={24} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-title)', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {cat.id === 1 ? 'Kizárólag vezetőségi hirdetmények' : 'Szabad eszmecsere és témanyitás'}
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setEditingCategoryId(cat.id); setCategoryNameInput(cat.name); setIsAddingCategory(true); }} style={{ background: 'transparent', color: '#f59e0b', border: 'none', cursor: 'pointer' }}><Edit3 size={16} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        
        /* TÉMÁK ÉS POSZTOK LISTÁJA KATEGÓRIÁN BELÜL */
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
            <button 
              onClick={() => { setSelectedCategoryId(null); setPosts([]); setExpandedPostId(null); setNewTitle(''); setNewContent(''); setIsPosting(false); }}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={16} /> Vissza a csoportokhoz
            </button>

            {/* Írási jogok szűrése */}
            {(selectedCategoryId !== 1 || isLeader) && (
              <button 
                onClick={() => setIsPosting(!isPosting)}
                style={{ background: isPosting ? '#ef4444' : '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {isPosting ? '¼ Mégse' : '✍️ Új téma indítása'}
              </button>
            )}
          </div>

          {/* Új téma beküldő panel */}
          {isPosting && (
            <div style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '12px', border: '2px solid #38bdf8', marginBottom: '25px' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#38bdf8' }}>Új beszélgetés indítása</h3>
              <input placeholder="A téma tömör címe..." value={newTitle} onChange={e => setNewTitle(e.target.value)} style={inputStyle} />
              <textarea placeholder="Fejtsd ki a gondolataidat bővebben..." value={newContent} onChange={e => setNewContent(e.target.value)} style={{ ...inputStyle, minHeight: '140px' }} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', userSelect: 'none' }}>
                <input type="checkbox" id="publicPostCheck" checked={isPublicPost} onChange={e => setIsPublicPost(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <label htmlFor="publicPostCheck" style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer' }}>
                  📢 Legyen nyilvános (minden Aréna tag láthatja kívülről is)
                </label>
              </div>

              {/* 🎯 JAVÍTVA: handleThreadSubmit átírva a valódi handlePostThread belső függvényre! */}
              <button onClick={handlePostThread} style={{ width: '100%', background: '#38bdf8', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
                🚀 Téma közzététele
              </button>
            </div>
          )}

          {isLoading ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>Témák rendezése folyamatban...</div>
          ) : posts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-main)' }}>
              Ebben a kategóriában még senki sem indított beszélgetést. Legyél te az első!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {posts.map(post => {
                const isExpanded = expandedPostId === post.id;
                const isUnread = !post.is_read || post.is_read === 0;

                return (
                  <div key={post.id} style={{ background: 'var(--bg-card)', borderRadius: '12px', border: isExpanded ? '1px solid #38bdf8' : (isUnread ? '1px solid #ef444450' : '1px solid var(--border-main)'), overflow: 'hidden', transition: 'all 0.2s' }}>
                    <div onClick={() => handleExpandPost(post.id)} style={{ padding: '20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isExpanded ? 'var(--bg-main)' : 'transparent' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          {isUnread && <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 'bold' }}>ÚJ</span>}
                          {post.is_public === 1 && <span style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 'bold' }}>📢 NYILVÁNOS</span>}
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {new Date(post.created_at).toLocaleDateString('hu-HU')}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {post.author_name} {mode === 'public' && <b style={{ color: '#38bdf8' }}>(🏛️ {post.club_name})</b>}</span>
                        </div>
                        <h3 style={{ margin: 0, color: isExpanded ? '#38bdf8' : 'var(--text-title)', fontSize: '1.15rem', fontWeight: '700' }}>{post.title}</h3>
                      </div>
                      <div style={{ fontSize: '1.2rem', color: isUnread ? '#ef4444' : 'var(--text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid var(--border-main)', animation: 'fadeIn 0.3s ease-out' }}>
                        <p style={{ color: 'var(--text-body)', lineHeight: '1.6', fontSize: '1rem', whiteSpace: 'pre-wrap', marginTop: '20px' }}>{post.content}</p>
                        
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed var(--border-main)' }}>
                          {isLeader && (
                            <button onClick={() => fetchReaders(post.id)} style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem' }}>
                              👁️ {showReaders ? 'Olvasók elrejtése' : 'Kik olvasták el?'}
                            </button>
                          )}
                          {(isAdmin || post.author_email === user.email) && (
                            <button onClick={() => handleDeletePost(post.id)} style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Trash2 size={12} /> Törlés
                            </button>
                          )}
                        </div>

                        {showReaders && isLeader && (
                          <div style={{ marginTop: '15px', background: 'var(--bg-main)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-main)' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#3b82f6', fontSize: '0.9rem' }}>Ezt a témát eddig {readers.length} tag nyitotta meg:</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                              {readers.map((r, idx) => <span key={idx} style={{ background: 'var(--bg-card)', color: 'var(--text-title)', padding: '4px 10px', borderRadius: '50px', fontSize: '0.8rem', border: '1px solid var(--border-main)' }}>✓ {r.name}</span>)}
                              {readers.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Még senki sem nyitotta meg.</div>}
                            </div>
                          </div>
                        )}

                        {/* HOZZÁSZÓLÁSOK */}
                        <div style={{ background: 'var(--bg-main)', borderRadius: '12px', padding: '15px', marginTop: '25px', border: '1px solid var(--border-main)' }}>
                          <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            💬 Hozzászólások <span style={{ background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '50px', fontSize: '0.75rem', border: '1px solid var(--border-main)' }}>{comments.length}</span>
                          </h4>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px', maxHeight: '300px', overflowY: 'auto' }}>
                            {comments.map(c => (
                              <div key={c.id} style={{ background: 'var(--bg-card)', padding: '12px 15px', borderRadius: '8px', border: '1px solid var(--border-main)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                  <b style={{ color: '#38bdf8', fontSize: '0.85rem' }}>{c.user_name}</b>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(c.created_at).toLocaleDateString('hu-HU')}</span>
                                </div>
                                <div style={{ color: 'var(--text-body)', fontSize: '0.95rem', lineHeight: '1.4' }}>{c.comment_text}</div>
                              </div>
                            ))}
                            {comments.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Még nincs hozzászólás. Indítsd el a vitát!</div>}
                          </div>

                          <div style={{ display: 'flex', gap: '10px' }}>
                            <input 
                              type="text" 
                              placeholder="Írd le a véleményed, meglátásod..." 
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment(post.id); }}
                              style={{ flex: 1, padding: '10px 15px', borderRadius: '20px', border: '1px solid var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-title)', outline: 'none' }}
                            />
                            <button 
                              onClick={() => handlePostComment(post.id)}
                              disabled={!newComment.trim()}
                              style={{ background: newComment.trim() ? '#38bdf8' : 'var(--border-main)', color: '#0f172a', border: 'none', padding: '0 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
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
