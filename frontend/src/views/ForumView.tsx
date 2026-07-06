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

  // 🎯 JAVÍTVA: Opcionális silent paraméter az ugrálások és villanások megszüntetésére
  const fetchPosts = async (silent = false) => {
    if (!selectedCategoryId) return;
    if (!silent) setIsLoading(true);
    try {
      let url = `${BACKEND_URL}/api/forum/categories/${selectedCategoryId}/posts?mode=${mode}&userEmail=${user.email}`;
      if (clubId) url += `&clubId=${clubId}`;
      
      const res = await fetch(url, { headers: getLocalAuthHeaders() });
      if (res.ok) setPosts(await res.json());
    } catch (e) { console.error("Fórum posztok letöltési hiba:", e); }
    finally { if (!silent) setIsLoading(false); }
  };

  useEffect(() => {
    if (selectedCategoryId && (currentDbUser?.club_name && clubId === null ? false : true)) {
      fetchPosts(false);
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
        fetchPosts(false);
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
        fetchPosts(true);
      } else {
        const err = await res.json();
        alert(err.error || "Hiba történt.");
      }
    } catch (e) { alert("Hálózati hiba."); }
  };

  // 🎯 JAVÍTVA: Csendes frissítés (true) a témalájkok villanásmentesítésére
  const handleLikePost = async (postId: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/forum/posts/${postId}/like`, {
        method: 'POST',
        headers: getLocalAuthHeaders({ 'Content-Type': 'application/json' })
      });
      if (res.ok) {
        fetchPosts(true); 
      }
    } catch (e) { console.error("Lájk hálózati hiba:", e); }
  };

  // 🎯 ÚJ: Villanásmentes komment-lájkolás kezelő
  const handleLikeComment = async (commentId: number, postId: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/forum/comments/${commentId}/like`, {
        method: 'POST',
        headers: getLocalAuthHeaders({ 'Content-Type': 'application/json' })
      });
      if (res.ok) {
        // Csendben, ugrálás nélkül újratöltjük csak a hozzászólás folyamot
        const cRes = await fetch(`${BACKEND_URL}/api/news/${postId}/comments`, { headers: getLocalAuthHeaders() });
        if (cRes.ok) setComments(await cRes.json());
      }
    } catch (e) { console.error("Komment lájk hiba:", e); }
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
        fetchPosts(false);
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {categories.map(cat => (
              <div 
                key={cat.id} 
                onClick={() => setSelectedCategoryId(cat.id)}
                title={cat.description || 'Szabad eszmecsere és témanyitás'} 
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
        
        /* TÉMÁK ÉS POSZTOK LISTÁJA */
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

          {/* Új téma beküldő panel */}
          {isPosting && (
            <div style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '12px', border: '2px solid #38bdf8', marginBottom: '25px' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#38bdf8' }}>Új beszélgetés indítása</h3>
              <input placeholder="A téma tömör címe..." value={newTitle} onChange={e => setNewTitle(e.target.value)} style={inputStyle} disabled={isUploadingThread} />
              <textarea placeholder="Fejtsd ki a gondolataidat bővebben..." value={newContent} onChange={e => setNewContent(e.target.value)} style={{ ...inputStyle, minHeight: '140px' }} disabled={isUploadingThread} />
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: 'var(--text-title)' }}>🏞️ Illusztráció vagy fotó csatolása (opcionális):</label>
                <input type="file" accept="image/*" onChange={e => {
                  const f = e.target.files?.[0];
                  if(f) { setPostFile(f); setPostPreview(URL.createObjectURL(f)); }
                }} style={{ color: 'var(--text-muted)' }} disabled={isUploadingThread} />
                {postPreview && (
                  <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                    <img src={postPreview} alt="" style={{ maxHeight: '150px', borderRadius: '8px', border: '1px solid var(--border-main)' }} />
                    <button onClick={() => { setPostFile(null); setPostPreview(null); }} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12}/></button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', userSelect: 'none' }}>
                <input type="checkbox" id="publicPostCheck" checked={isPublicPost} onChange={e => setIsPublicPost(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} disabled={isUploadingThread} />
                <label htmlFor="publicPostCheck" style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer' }}>
                  📢 Legyen nyilvános (nem klubtagok és külső látogatók is olvashatják a közlemények között)
                </label>
              </div>

              <button onClick={handlePostThread} disabled={isUploadingThread} style={{ width: '100%', background: '#38bdf8', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '8px', cursor: isUploadingThread ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
                {isUploadingThread ? '⏳ Kép feltöltése...' : '🚀 Téma közzététele'}
              </button>
            </div>
          )}

          {isLoading ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>Témák rendezése folyamatban... ⏳</div>
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
                    
                    {/* FEJLÉC SZEKCIÓ */}
                    <div onClick={() => handleExpandPost(post.id)} style={{ padding: '20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isExpanded ? 'var(--bg-main)' : 'transparent' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          {isUnread && <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 'bold' }}>ÚJ</span>}
                          
                          {post.is_public === 1 ? (
                            <span style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 'bold' }}>📢 NYILVÁNOS</span>
                          ) : (
                            <span style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 'bold' }}>🔒 SAJÁT KLUB</span>
                          )}
                          
                          {post.file_url && <span style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><ImageIcon size={10}/> FOTÓVAL</span>}
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {new Date(post.created_at).toLocaleDateString('hu-HU')}</span>
                          
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {post.avatar_url ? (
                              <img src={post.avatar_url} alt="" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-main)' }} />
                            ) : (
                              <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', border: '1px solid var(--border-main)' }}>👤</div>
                            )}
                            <span style={{ fontWeight: '500', color: 'var(--text-title)' }}>{post.author_name || post.user_name}</span>
                            {mode === 'public' && <b style={{ color: '#38bdf8', fontSize: '0.85rem' }}>(🏛️ {post.club_name || 'Független'})</b>}
                          </span>
                        </div>

                        <h3 style={{ margin: 0, color: isExpanded ? '#38bdf8' : 'var(--text-title)', fontSize: '1.15rem', fontWeight: '700' }}>{post.title}</h3>
                      </div>
                      <div style={{ fontSize: '1.2rem', color: isUnread ? '#ef4444' : 'var(--text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</div>
                    </div>

                    {/* LENYITOTT RÉSZ */}
                    {isExpanded && (
                      <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid var(--border-main)', animation: 'fadeIn 0.3s ease-out' }}>
                        
                        <p style={{ color: 'var(--text-body)', lineHeight: '1.6', fontSize: '0.95rem', whiteSpace: 'pre-wrap', marginTop: '15px' }}>{post.content}</p>
                        
                        {post.file_url && (
                          <div style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-main)', marginBottom: '20px', width: 'fit-content', backgroundColor: '#000' }}>
                            <img src={getImageUrl(post.drive_file_id, post.file_url)} alt="" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} />
                          </div>
                        )}

                        {/* INTERAKTÍV AKCIÓGOMBOK PANELSORA */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed var(--border-main)', flexWrap: 'wrap', alignItems: 'center' }}>
                          
                          <button 
                            onClick={() => handleLikePost(post.id)} 
                            style={{ background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}
                          >
                            <Heart size={12} fill="#ef4444" /> {post.likes_count || 0} Kedvelés
                          </button>

                          {isLeader && (
                            <button onClick={() => fetchReaders(post.id)} style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem' }}>
                              👁️ {showReaders ? 'Olvasók elrejtése' : 'Kik olvasták el?'}
                            </button>
                          )}
                          
                          {(isAdmin || post.author_email === user?.email || post.user_email === user?.email) && (
                            <button 
                              onClick={() => handleStartEditPost(post)} 
                              style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Edit3 size={12} /> Szerkesztés
                            </button>
                          )}
                          {(isAdmin || post.author_email === user?.email || post.user_email === user?.email) && (
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

                        {/* HOZZÁSZÓLÁSOK FOLYAM */}
                        <div style={{ background: 'var(--bg-main)', borderRadius: '12px', padding: '15px', marginTop: '25px', border: '1px solid var(--border-main)' }}>
                          <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            💬 Hozzászólások <span style={{ background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '50px', fontSize: '0.75rem', border: '1px solid var(--border-main)' }}>{comments.length}</span>
                          </h4>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px', maxHeight: '400px', overflowY: 'auto' }}>
                            {comments.map(c => (
                              <div key={c.id} style={{ background: 'var(--bg-card)', padding: '12px 15px', borderRadius: '8px', border: '1px solid var(--border-main)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {c.avatar_url ? (
                                      <img src={c.avatar_url} alt="" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-main)' }} />
                                    ) : (
                                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>👤</div>
                                    )}
                                    <b style={{ color: '#38bdf8', fontSize: '0.85rem' }}>{c.user_name}</b>
                                  </div>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(c.created_at).toLocaleDateString('hu-HU')}</span>
                                </div>
                                
                                <div style={{ color: 'var(--text-body)', fontSize: '0.95rem', lineHeight: '1.4', marginBottom: c.file_url ? '10px' : 0, paddingLeft: '30px' }}>{c.comment_text}</div>
                                
                                {c.file_url && (
                                  <div style={{ maxWidth: '250px', maxHeight: '180px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-main)', backgroundColor: '#000', marginLeft: '30px' }}>
                                    <img src={getImageUrl(c.drive_file_id, c.file_url)} alt="" style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }} />
                                  </div>
                                )}

                                {/* 🎯 ÚJ: Villanásmentes lájk gomb integráció a hozzászólásokhoz */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                                  <button 
                                    onClick={() => handleLikeComment(c.id, post.id)}
                                    title={lang === 'en' ? 'Like this comment (+1 point to author)' : 'Kedvelem ezt a hozzászólást (+1 pont a szerzőnek)'}
                                    style={{ background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 'bold', transition: 'all 0.1s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.04)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <Heart size={10} fill="#ef4444" /> {c.likes_count || 0}
                                  </button>
                                </div>
                              </div>
                            ))}
                            {comments.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Még nincs hozzászólás. Indítsd el a vitát!</div>}
                          </div>

                          {commentPreview && (
                            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '10px', marginLeft: '38px' }}>
                              <img src={commentPreview} alt="" style={{ maxHeight: '60px', borderRadius: '6px', border: '1px solid #38bdf850' }} />
                              <button onClick={() => { setCommentFile(null); setCommentPreview(null); }} style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            {currentDbUser?.avatar_url ? (
                              <img src={currentDbUser.avatar_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-main)', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', border: '1px solid var(--border-main)', flexShrink: 0 }}>👤</div>
                            )}

                            <label style={{ cursor: isCommenting ? 'not-allowed' : 'pointer', fontSize: '1.2rem', background: 'var(--bg-card)', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-main)', width: '38px', height: '36px', boxSizing: 'border-box' }} title="Fotó csatolása">
                              <Camera size={16} color="var(--text-title)" />
                              <input type="file" accept="image/*" onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) { setCommentFile(f); setCommentPreview(URL.createObjectURL(f)); }
                              }} style={{ display: 'none' }} disabled={isCommenting} />
                            </label>

                            <input 
                              type="text" 
                              placeholder={commentFile ? "Írj leírást a csatolt képhez..." : "Írd le a véleményed, meglátásod..."} 
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment(post.id); }}
                              style={{ flex: 1, padding: '10px 15px', borderRadius: '20px', border: '1px solid var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-title)', outline: 'none' }}
                              disabled={isCommenting}
                            />
                            <button 
                              onClick={() => handlePostComment(post.id)}
                              disabled={(!newComment.trim() && !commentFile) || isCommenting}
                              style={{ background: (newComment.trim() || commentFile) ? '#38bdf8' : 'var(--border-main)', color: '#0f172a', border: 'none', padding: '0 20px', borderRadius: '20px', cursor: (newComment.trim() || commentFile) ? 'pointer' : 'not-allowed', fontWeight: 'bold', height: '38px' }}
                            >
                              {isCommenting ? '⏳' : 'Küldés'}
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
        .forum-posts-flow { width: 100%; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
