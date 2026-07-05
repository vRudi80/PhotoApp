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
  ImageIcon
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

  // Új poszt indítása
  const [isPosting, setIsPosting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isPublicPost, setIsPublicPost] = useState(false); 
  const [postFile, setPostFile] = useState<File | null>(null);
  const [postPreview, setPostPreview] = useState<string | null>(null);
  const [isUploadingThread, setIsUploadingThread] = useState(false);

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

  // 🎯 FRISSÍTVE: Kategóriák betöltése paraméterezve a pontos számláláshoz
  const fetchCategories = async () => {
    try {
      let url = `${BACKEND_URL}/api/forum/categories?mode=${mode}&userEmail=${user.email}`;
      if (mode === 'club' && clubId) url += `&clubId=${clubId}`;
      
      const res = await fetch(url, { headers: getLocalAuthHeaders() });
      if (res.ok) setCategories(await res.json());
    } catch (e) { console.error(e); }
  };

  // 🎯 FRISSÍTVE: Reaktív betöltés a clubId feloldása után
  useEffect(() => {
    if (mode === 'public' || (mode === 'club' && clubId !== null)) {
      fetchCategories();
    }
  }, [clubId, mode]);

  const fetchPosts = async () => {
    if (!selectedCategoryId) return;
    setIsLoading(true);
    try {
      let url = `${BACKEND_URL}/api/forum/categories/${selectedCategoryId}/posts?mode=${mode}&userEmail=${user.email}`;
      if (mode === 'club' && clubId) url += `&clubId=${clubId}`;
      
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
  // MŰVELETEK (KATEGÓRIA, POSZT, KOMMENT)
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
      }
    } catch (e) { alert("Hiba történt."); }
  };

  const handleExpandPost = async (postId: number) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }
    setExpandedPostId(postId);
    setShowReaders(false);
    setCommentFile(null);
    setCommentPreview(null);
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

    setIsUploadingThread(true);
    const formData = new FormData();
    formData.append('clubId', mode === 'club' ? String(clubId) : '');
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
      }
    } catch (e) { alert("Sikertelen közzététel."); }
    finally { setIsUploadingThread(false); }
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
                onClick={() => { setIsAddingCategory(!isAddingCategory); setEditingCategoryId(null); setCategoryNameInput(''); }}
                style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> Új Fórumcsoport
              </button>
            )}
          </div>

          {isAdmin && isAddingCategory && (
            <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '2px solid #10b981', marginBottom: '25px' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#10b981' }}>{editingCategoryId ? 'Fórumcsoport átnevezése' : 'Új fórumcsoport létrehozása'}</h3>
              <input placeholder="Kategória neve..." value={categoryNameInput} onChange={e => setCategoryNameInput(e.target.value)} style={inputStyle} />
              <button onClick={handleSaveCategory} style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                💾 Mentés és Aktiválás
              </button>
            </div>
          )}

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
                    {/* 🎯 JAVÍTVA: Beágyazva a reaktív olvasatlan-jelvény a kategória neve mellé! */}
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-title)', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{cat.name}</span>
                      {Number(cat.unread_count) > 0 && (
                        <span style={{ background: '#ef4444', color: 'white', fontSize: '0.68rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold', display: 'inline-block', lineHeight: '1.2' }}>
                          {cat.unread_count} új
                        </span>
                      )}
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {cat.id === 1 ? 'Kizárólag vezetőségi hirdetmények' : 'Szabad eszmecsere és témanyitás'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        
        /* TÉMÁK ÉS POSZTOK LISTÁJA */
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
            {/* 🎯 JAVÍTVA: Visszalépéskor azonnal meghívjuk a fetchCategories() függvényt, így azonnal frissül a főoldali számláló! */}
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
                  📢 Legyen nyilvános (minden Aréna tag láthatja kívülről is)
                </label>
              </div>

              <button onClick={handlePostThread} disabled={isUploadingThread} style={{ width: '100%', background: '#38bdf8', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '8px', cursor: isUploadingThread ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
                {isUploadingThread ? '⏳ Kép feltöltése a Drive-ra...' : '🚀 Téma közzététele'}
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
                          {post.file_url && <span style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><ImageIcon size={10}/> FOTÓVAL</span>}
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {new Date(post.created_at).toLocaleDateString('hu-HU')}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {post.author_name} {mode === 'public' && <b style={{ color: '#38bdf8' }}>(🏛️ {post.club_name})</b>}</span>
                        </div>
                        <h3 style={{ margin: 0, color: isExpanded ? '#38bdf8' : 'var(--text-title)', fontSize: '1.15rem', fontWeight: '700' }}>{post.title}</h3>
                      </div>
                      <div style={{ fontSize: '1.2rem', color: isUnread ? '#ef4444' : 'var(--text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid var(--border-main)', animation: 'fadeIn 0.3s ease-out' }}>
                        <p style={{ color: 'var(--text-body)', lineHeight: '1.6', fontSize: '1rem', whiteSpace: 'pre-wrap', marginTop: '20px', marginBottom: '20px' }}>{post.content}</p>
                        
                        {post.file_url && (
                          <div style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-main)', marginBottom: '20px', width: 'fit-content', backgroundColor: '#000' }}>
                            <img src={getImageUrl(post.drive_file_id, post.file_url)} alt="" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} />
                          </div>
                        )}

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

                        {/* HOZZÁSZÓLÁSOK FOLYAM */}
                        <div style={{ background: 'var(--bg-main)', borderRadius: '12px', padding: '15px', marginTop: '25px', border: '1px solid var(--border-main)' }}>
                          <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            💬 Hozzászólások <span style={{ background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '50px', fontSize: '0.75rem', border: '1px solid var(--border-main)' }}>{comments.length}</span>
                          </h4>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px', maxHeight: '400px', overflowY: 'auto' }}>
                            {comments.map(c => (
                              <div key={c.id} style={{ background: 'var(--bg-card)', padding: '12px 15px', borderRadius: '8px', border: '1px solid var(--border-main)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                  <b style={{ color: '#38bdf8', fontSize: '0.85rem' }}>{c.user_name}</b>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(c.created_at).toLocaleDateString('hu-HU')}</span>
                                </div>
                                <div style={{ color: 'var(--text-body)', fontSize: '0.95rem', lineHeight: '1.4', marginBottom: c.file_url ? '10px' : 0 }}>{c.comment_text}</div>
                                
                                {c.file_url && (
                                  <div style={{ maxWidth: '250px', maxHeight: '180px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-main)', backgroundColor: '#000' }}>
                                    <img src={getImageUrl(c.drive_file_id, c.file_url)} alt="" style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }} />
                                  </div>
                                )}
                              </div>
                            ))}
                            {comments.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Még nincs hozzászólás. Indítsd el a vitát!</div>}
                          </div>

                          {commentPreview && (
                            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '10px' }}>
                              <img src={commentPreview} alt="" style={{ maxHeight: '60px', borderRadius: '6px', border: '1px solid #38bdf850' }} />
                              <button onClick={() => { setCommentFile(null); setCommentPreview(null); }} style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
