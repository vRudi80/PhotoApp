import React, { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL, ADMIN_EMAIL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';

// Nyelvi és téma kontextusok aktiválása
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

// Letisztult Lucide ikonok
import { 
  MessageSquare, 
  Send, 
  Heart, 
  Trash2, 
  Plus, 
  Edit3, 
  ArrowLeft, 
  Lock, 
  User, 
  Calendar,
  Camera,
  X,
  ImageIcon,
  Save
} from 'lucide-react';

interface ForumViewProps {
  user: any;           
  currentDbUser: any;  
  mode?: 'club' | 'public';
}

export default function ForumView({ user, currentDbUser, mode = 'club' }: ForumViewProps) {
  const { t, lang } = useLanguage();
  
  let isLight = false;
  try {
    const themeContext = useTheme();
    if (themeContext) isLight = themeContext.theme === 'light';
  } catch (e) {}

  // ==============================================================
  // ÁLLAPOTOK KEZELÉSE
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
  const [categoryDescInput, setCategoryDescInput] = useState('');

  // Új poszt indítása
  const [isPosting, setIsPosting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isPublicPost, setIsPublicPost] = useState(false); 
  const [postFile, setPostFile] = useState<File | null>(null);
  const [postPreview, setPostPreview] = useState<string | null>(null);
  const [isUploadingThread, setIsUploadingThread] = useState(false);

  // Meglévő poszt inline szerkesztése
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);

  // Olvasók és kommentek
  const [readers, setReaders] = useState<any[]>([]);
  const [showReaders, setShowReaders] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [commentPreview, setCommentPreview] = useState<string | null>(null);
  const [isCommenting, setIsCommenting] = useState(false);
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

  const getLocalAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
    const token = localStorage.getItem('photoAppToken');
    return { 
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...extraHeaders 
    };
  };

  // ==============================================================
  // ADATOK SYNC MOTORJA
  // ==============================================================
  useEffect(() => {
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
  }, [currentDbUser?.club_name]);

  const fetchCategories = async () => {
    try {
      let url = `${BACKEND_URL}/api/forum/categories?mode=${mode}&userEmail=${user.email}`;
      if (clubId) url += `&clubId=${clubId}`;
      
      const res = await fetch(url, { headers: getLocalAuthHeaders() });
      if (res.ok) setCategories(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (currentDbUser?.club_name && clubId === null) return;
    fetchCategories();
  }, [clubId, mode, currentDbUser?.club_name]);

  const fetchPosts = async () => {
    if (!selectedCategoryId) return;
    setIsLoading(true);
    try {
      let url = `${BACKEND_URL}/api/forum/categories/${selectedCategoryId}/posts?mode=${mode}&userEmail=${user.email}`;
      if (clubId) url += `&clubId=${clubId}`;
      
      const res = await fetch(url, { headers: getLocalAuthHeaders() });
      if (res.ok) setPosts(await res.json());
    } catch (e) {
      console.error("Nem sikerült betölteni az admin listát:", e);
    } finally {
      setLoadingUsers(false); 
      setPosts([]); 
    }
  };

  const syncCurrentPosts = async () => {
    if (!selectedCategoryId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/posts?categoryId=${selectedCategoryId}`, { headers: getAdminAuthHeaders() });
      if (res.ok) setPosts(await res.json());
    } catch(e){}
  };

  useEffect(() => {
    if (selectedCategoryId !== null) {
      setLoadingUsers(true);
      fetch(`${BACKEND_URL}/api/posts?categoryId=${selectedCategoryId}`, { headers: getAdminAuthHeaders() })
        .then(res => res.json())
        .then(data => { setPosts(Array.isArray(data) ? data : []); setLoadingUsers(false); })
        .catch(() => { setPosts([]); setLoadingUsers(false); });
    }
  }, [selectedCategoryId]);

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryNameInput.trim()) return alert("A név kötelező!");
    try {
      const isEditing = editingCategoryId !== null;
      const url = isEditing 
        ? `${BACKEND_URL}/api/admin/forum-categories/${editingCategoryId}`
        : `${BACKEND_URL}/api/admin/forum-categories`;
      
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name: categoryNameInput.trim(), description: categoryDescInput.trim(), mode })
      });
      if (res.ok) {
        alert(isLight ? "Sikeres mentés!" : "Sikeres mentés! ✨");
        setIsAddingCategory(false); setEditingCategoryId(null);
        setCategoryNameInput(''); setCategoryDescInput('');
        fetchCategories();
      }
    } catch (e) {}
  };

  const fetchCategoriesOnly = async () => {
    try {
      let url = `${BACKEND_URL}/api/forum/categories?mode=${mode}&userEmail=${user.email}`;
      if (clubId) url += `&clubId=${clubId}`;
      const res = await fetch(url, { headers: getLocalAuthHeaders() });
      if (res.ok) setCategories(await res.json());
    } catch(e){}
  };

  const handlePostThreadSubmit = async () => {
    if (!newTitle.trim() || !newContent.trim()) return alert("Minden mezőt tölts ki!");
    setIsUploadingThread(true);
    const formData = new FormData();
    formData.append('categoryId', String(selectedCategoryId));
    formData.append('title', newTitle.trim());
    formData.append('content', newContent.trim());
    formData.append('userEmail', user.email);
    formData.append('userName', user.name);
    if (postFile) formData.append('photo', postFile);

    try {
      const res = await fetch(`${BACKEND_URL}/api/posts`, { method: 'POST', headers: getLocalAuthHeaders(), body: formData });
      if (res.ok) {
        setNewTitle(''); setNewContent(''); setPostFile(null); setPostPreview(null); setIsPosting(false);
        syncCurrentPosts();
      }
    } catch (e) {} finally { setIsUploadingThread(false); }
  };

  const handleLikePost = async (postId: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/posts/${postId}/like`, {
        method: 'POST',
        headers: getLocalAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userEmail: user.email })
      });
      if (res.ok) {
        syncCurrentPosts();
      }
    } catch(e){}
  };

  const handleCommentSubmit = async (postId: number) => {
    if (!newComment.trim() && !commentFile) return;
    setIsCommenting(true);
    const formData = new FormData();
    formData.append('userEmail', user.email);
    formData.append('userName', user.name);
    formData.append('commentText', newComment.trim());
    if (commentFile) formData.append('photo', commentFile);

    try {
      const res = await fetch(`${BACKEND_URL}/api/posts/${postId}/comments`, { method: 'POST', headers: getLocalAuthHeaders(), body: formData });
      if (res.ok) {
        setNewComment(''); setCommentFile(null); setCommentPreview(null);
        const cRes = await fetch(`${BACKEND_URL}/api/posts/${postId}/comments`, { headers: getLocalAuthHeaders() });
        if (cRes.ok) setComments(await cRes.json());
      }
    } catch (e) {} finally { setIsCommenting(false); }
  };


  const setLoadingUsers = (val: boolean) => { setIsLoading(val); };
  const getAdminAuthHeaders = (extra: any = {}) => getLocalAuthHeaders(extra);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* KATEGÓRIÁK FŐOLDAL */}
      {selectedCategoryId === null ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
            <h2 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '15px', color: 'var(--text-title)' }}>
              <span style={{ fontSize: '2.5rem' }}>🏛️</span> {mode === 'public' ? 'Nyilvános Fotós Fórum' : `Klub Fórum: ${currentDbUser?.club_name}`}
            </h2>
            {isAdmin && (
              <button 
                onClick={() => { setIsAddingCategory(!isAddingCategory); setEditingCategoryId(null); setCategoryNameInput(''); setCategoryDescInput(''); }}
                style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> Új Fórumcsoport
              </button>
            )}
          </div>

          {isAdmin && isAddingCategory && (
            <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '2px solid #10b981', marginBottom: '25px' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#10b981' }}>{editingCategoryId ? 'Fórumcsoport szerkesztése' : 'Új fórumcsoport létrehozása'}</h3>
              <input placeholder="Fórumcsoport neve..." value={categoryNameInput} onChange={e => setCategoryNameInput(e.target.value)} style={inputStyle} />
              <input placeholder="Rövid egyéni magyarázat szövege..." value={categoryDescInput} onChange={e => setCategoryDescInput(e.target.value)} style={inputStyle} />
              <button onClick={handleCategorySubmit} style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                💾 Mentés és Aktiválás
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {categories.map(cat => (
              <div 
                key={cat.id} 
                onClick={() => setSelectedCategoryId(cat.id)}
                title={cat.description || 'Szabad eszmecsere és témanyitás'} // 🎯 ÚJ: Natív HTML Tooltip támogatás lebegéskor
                style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-main)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    {/* Bal oszlop: Fix Ikon */}
                    <div style={{ background: cat.id === 1 ? 'rgba(245,158,11,0.1)' : 'rgba(56,189,248,0.1)', color: cat.id === 1 ? '#f59e0b' : '#38bdf8', padding: '12px', borderRadius: '10px', flexShrink: 0 }}>
                      {cat.id === 1 ? <Lock size={24} /> : <MessageSquare size={24} />}
                    </div>
                    
                    {/* Középső oszlop: Szöveges blokk reszponzív töréssel */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-title)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                          {cat.name}
                        </span>
                        {Number(cat.unread_count) > 0 && (
                          <span style={{ background: '#ef4444', color: 'white', fontSize: '0.68rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold', flexShrink: 0, lineHeight: '1.2' }}>
                            {cat.unread_count} új
                          </span>
                        )}
                      </h3>
                      {/* 🎯 JAVÍTVA: No-wrap helyett maximum 2 soros intelligens CSS törés (WebkitLineClamp) */}
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.4' }}>
                        {cat.description || 'Szabad eszmecsere és témanyitás'}
                      </p>
                    </div>
                  </div>

                  {/* Jobb oszlop: Adminisztrátori zóna */}
                  {isAdmin && (
                    <div style={{ marginLeft: '10px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => { setEditingCategoryId(cat.id); setCategoryNameInput(cat.name); setCategoryDescInput(cat.description || ''); setIsAddingCategory(true); }} 
                        style={{ background: 'rgba(245,158,11,0.06)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.12)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,158,11,0.06)'}
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>
                  )}

                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        
        /* TÉMÁK ÉS POSZTOK LISTÁJA ORIGINAL STILUSHOZ HŰEN */
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
            <button 
              onClick={() => { setSelectedCategoryId(null); setPosts([]); setExpandedPostId(null); setIsPosting(false); fetchCategories(); }}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={16} /> Vissza a csoportokhoz
            </button>

            {(selectedCategoryId !== 1 || isLeader) && (
              <button 
                onClick={() => setIsPosting(!isPosting)}
                style={{ background: isPosting ? '#ef4444' : '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {isPosting ? '✖ Mégse' : '✍️ Új téma indítása'}
              </button>
            )}
          </div>

          {isPosting && (
            <div style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '12px', border: '2px solid #38bdf8', marginBottom: '25px' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#38bdf8' }}>Új beszélgetés indítása</h3>
              <input placeholder="A beszélgetés címe / témája..." value={newTitle} onChange={e => setNewTitle(e.target.value)} style={inputStyle} disabled={isUploadingThread} />
              <textarea placeholder="Fejtsd ki bővebben a mondandódat..." value={newContent} onChange={e => setNewContent(e.target.value)} style={{ ...inputStyle, minHeight: '120px' }} disabled={isUploadingThread} />
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: 'var(--text-title)' }}>🏞️ Fotó csatolása (opcionális):</label>
                <input type="file" accept="image/*" onChange={e => {
                  const f = e.target.files?.[0];
                  if(f) { setPostFile(f); setPostPreview(URL.createObjectURL(f)); }
                }} style={{ color: 'var(--text-muted)' }} disabled={isUploadingThread} />
                {postPreview && (
                  <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                    <img src={postPreview} alt="" style={{ maxHeight: '120px', borderRadius: '6px' }} />
                    <button onClick={() => { setPostFile(null); setPostPreview(null); }} style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer' }}>✕</button>
                  </div>
                )}
              </div>

              <button onClick={handlePostThreadSubmit} disabled={isUploadingThread} style={{ width: '100%', background: '#38bdf8', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                {isUploadingThread ? '⏳ Közzététel...' : '🚀 Téma indítása'}
              </button>
            </div>
          )}

          {/* 🎯 JAVÍTVA: loading helyett az isLoading állapotváltozóra lett cserélve a hiba kiküszöbölésére */}
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', width: '100%' }}>
              <div style={{ color: 'var(--text-muted)' }}>Fórum szálak betöltése... ⏳</div>
            </div>
          ) : posts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-main)' }}>
              Ebben a kategóriában még senki sem indított beszélgetést. Legyél te az első!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {posts.map(post => {
                const isExpanded = expandedPostId === post.id;
                return (
                  <div key={post.id} style={{ background: 'var(--bg-card)', borderRadius: '12px', border: isExpanded ? '1px solid #38bdf8' : '1px solid var(--border-main)', overflow: 'hidden' }}>
                    <div onClick={() => handleExpandPost(post.id)} style={{ padding: '20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '500', color: 'var(--text-title)' }}>{post.user_name}</span> • {new Date(post.created_at).toLocaleDateString('hu-HU')}
                        </div>
                        <h3 style={{ margin: 0, color: isExpanded ? '#38bdf8' : 'var(--text-title)', fontSize: '1.15rem', fontWeight: '700' }}>{post.title}</h3>
                      </div>
                      <div style={{ color: 'var(--text-muted)' }}>{isExpanded ? '▲' : '▼'}</div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid var(--border-main)' }}>
                        <p style={{ color: 'var(--text-body)', lineHeight: '1.6', fontSize: '0.95rem', whiteSpace: 'pre-wrap', marginTop: '15px' }}>{post.content}</p>
                        {post.file_url && (
                          <div style={{ marginTop: '15px', maxWidth: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-main)' }}>
                            <img src={getImageUrl(post.drive_file_id, post.file_url)} alt="" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }} />
                          </div>
                        )}
                        
                        {/* AKCIÓK */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                          <button onClick={() => handleLikePost(post.id)} style={{ background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                            <Heart size={12} fill="#ef4444" /> {post.likes_count || 0} Kedvelés
                          </button>
                          {(isAdmin || post.user_email === user?.email) && (
                            <button onClick={() => handleDeletePost(post.id)} style={{ background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>Törlés</button>
                          )}
                        </div>

                        {/* KOMMENTEK FOLYAM */}
                        <div style={{ background: 'var(--bg-main)', borderRadius: '8px', padding: '15px', marginTop: '20px' }}>
                          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <input type="text" placeholder="Szólj hozzá a témához..." value={newComment} onChange={e => setNewComment(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-title)', outline: 'none' }} />
                            <button onClick={() => handleCommentSubmit(post.id)} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '0 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Küldés</button>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {comments.map(c => (
                              <div key={c.id} style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-main)', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '4px' }}>
                                  <span>{c.user_name}</span>
                                  <span style={{ color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString('hu-HU')}</span>
                                </div>
                                <div style={{ color: 'var(--text-body)' }}>{c.comment_text}</div>
                              </div>
                            ))}
                            {comments.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Még nincs hozzászólás.</div>}
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
        .forum-posts-flow { width: 100%; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
