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
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (selectedCategoryId && (currentDbUser?.club_name && clubId === null ? false : true)) {
      fetchPosts();
    }
  }, [selectedCategoryId, clubId, mode]);

  // ==============================================================
  // MŰVELETEK
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
        body: JSON.stringify({ 
          name: categoryNameInput.trim(),
          description: categoryDescInput.trim() || 'Szabad eszmecsere és témanyitás'
        })
      });

      if (res.ok) {
        setCategoryNameInput('');
        setCategoryDescInput('');
        setIsAddingCategory(false);
        setEditingCategoryId(null);
        fetchCategories();
      }
    } catch (e) { alert("Hiba történt."); }
  };

  const handleExpandPost = async (postId: number) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      setEditingPostId(null);
      return;
    }
    setExpandedPostId(postId);
    setEditingPostId(null);
    setShowReaders(false);
    setCommentFile(null);
    setCommentPreview(null);

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

    setIsUploadingThread(true);
    const formData = new FormData();
    
    const finalClubValue = clubId ? String(clubId) : (currentDbUser?.club_id ? String(currentDbUser.club_id) : '');
    formData.append('clubId', finalClubValue);
    
    formData.append('userEmail', user.email);
    formData.append('userName', user.name);
    formData.append('title', newTitle.trim());
    formData.append('content', newContent.trim());
    formData.append('isPublic', String(isPublicPost));
    if (postFile) formData.append('photo', postFile);

    try {
      const res = await fetch(`${BACKEND_URL}/api/forum/categories/${selectedCategoryId}/posts`, {
        method: 'POST',
        headers: getLocalAuthHeaders(),
        body: formData
      });

      if (res.ok) {
        setNewTitle('');
        setNewContent('');
        setPostFile(null);
        setPostPreview(null);
        setIsPosting(false);
        fetchPosts();
      } else {
        const err = await res.json();
        alert(err.error || "Sikertelen mentés.");
      }
    } catch (e) { alert("Sikertelen közzététel."); }
    finally { setIsUploadingThread(false); }
  };

  const handleStartEditPost = (post: any) => {
    setEditingPostId(post.id);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditIsPublic(post.is_public === 1);
  };

  const handleSavePostEdit = async (postId: number) => {
    if (!editTitle.trim() || !editContent.trim()) return alert("A mezők nem lehetnek üresek!");
    try {
      const res = await fetch(`${BACKEND_URL}/api/forum/posts/${postId}`, {
        method: 'PUT',
        headers: getLocalAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          title: editTitle.trim(),
          content: editContent.trim(),
          isPublic: editIsPublic
        })
      });

      if (res.ok) {
        setEditingPostId(null);
        fetchPosts();
      } else {
        const err = await res.json();
        alert(err.error || "Hiba történt.");
      }
    } catch (e) { alert("Hálózati hiba."); }
  };

  const handlePostComment = async (postId: number) => {
    if (!newComment.trim() && !commentFile) return;
    setIsCommenting(true);

    const formData = new FormData();
    formData.append('userEmail', user.email);
    formData.append('userName', user.name);
    formData.append('commentText', newComment.trim());
    if (commentFile) formData.append('photo', commentFile);

    try {
      const res = await fetch(`${BACKEND_URL}/api/news/${postId}/comments`, {
        method: 'POST',
        headers: getLocalAuthHeaders(),
        body: formData
      });
      if (res.ok) {
        setNewComment('');
        setCommentFile(null);
        setCommentPreview(null);
        const cRes = await fetch(`${BACKEND_URL}/api/news/${postId}/comments`, { headers: getLocalAuthHeaders() });
        if (cRes.ok) setComments(await cRes.json());
      }
    } catch (e) { alert("Hiba a hozzászólásnál."); }
    finally { setIsCommenting(false); }
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

  return (
    <div style={{ boxSizing: 'border-box' }}>
      
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
              <button onClick={handleSaveCategory} style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                💾 Mentés és Aktiválás
              </button>
            </div>
          )}

          {/* 🎯 JAVÍTVA: Biztonságos rácsszerkezet auto-fill alapokon */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {categories.map(cat => (
              <div 
                key={cat.id} 
                onClick={() => setSelectedCategoryId(cat.id)}
                style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-main)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                {/* 🎯 JAVÍTVA: Háromosztatú zárt flexbox lánc, ami megakadályozza az átfedéseket */}
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  
                  {/* Bal + Középső blokk szoros egysége */}
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    
                    {/* Bal oszlop: Ikon */}
                    <div style={{ background: cat.id === 1 ? 'rgba(245,158,11,0.1)' : 'rgba(56,189,248,0.1)', color: cat.id === 1 ? '#f59e0b' : '#38bdf8', padding: '12px', borderRadius: '10px', flexShrink: 0 }}>
                      {cat.id === 1 ? <Lock size={24} /> : <MessageSquare size={24} />}
                    </div>
                    
                    {/* Középső oszlop: Cím és leírás kényszerített törésekkel */}
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
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cat.description || 'Szabad eszmechen és témanyitás'}
                      </p>
                    </div>

                  </div>

                  {/* Jobb oszlop: Adminisztrátori szerkesztőgomb elkülönített, védett övezetben */}
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
        /* Az oldal többi része (Kihívások szobái, komment folyamok) változatlan és stabil marad */
        <>
          <div style={{ marginBottom: '20px' }}>
            <button onClick={() => setSelectedCategoryId(null)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
              {t('viewBackBtn')}
            </button>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', width: '100%' }}>
              <div style={{ color: 'var(--text-muted)' }}>Fórum szálak betöltése...</div>
            </div>
          ) : (
            <div className="forum-posts-flow">
              {/* Posztok listázása struktúra szerint */}
              {posts.map(post => (
                <div key={post.id} style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-main)', marginBottom: '16px', overflow: 'hidden' }}>
                  <div onClick={() => handleExpandPost(post.id)} style={{ padding: '20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ color: 'var(--text-title)', margin: '0 0 6px 0', fontSize: '1.15rem' }}>{post.title}</h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{post.user_name} • {new Date(post.created_at).toLocaleDateString('hu-HU')}</div>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>{expandedPostId === post.id ? '▲' : '▼'}</div>
                  </div>
                  
                  {expandedPostId === post.id && (
                    <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid var(--border-main)' }}>
                      <p style={{ color: 'var(--text-body)', lineHeight: '1.6', fontSize: '0.95rem', whiteSpace: 'pre-wrap', marginTop: '15px' }}>{post.content}</p>
                      {post.file_url && (
                        <div style={{ marginTop: '15px', maxWidth: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-main)' }}>
                          <img src={getImageUrl(post.drive_file_id, post.file_url)} alt="" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }} />
                        </div>
                      )}
                      
                      {/* KOMMENTEK ÉS AKCIÓK */}
                      <div style={{ background: 'var(--bg-main)', borderRadius: '8px', padding: '15px', marginTop: '20px' }}>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                          <input type="text" placeholder="Szólj hozzá a témához..." value={newComment} onChange={e => setNewComment(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-title)' }} />
                          <button onClick={() => handlePostComment(post.id)} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '0 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Küldés</button>
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
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
