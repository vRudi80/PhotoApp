import { useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

const GOOGLE_CLIENT_ID = "197361744572-ih728hq5jft3fqfd1esvktvrd8i97kcp.apps.googleusercontent.com";
const BACKEND_URL = "https://photoapp-backend-m4d1.onrender.com"; // <-- NE FELEJTSD EL ÁTÍRNI!
const ADMIN_EMAIL = "kovari.rudolf@gmail.com"; 

function App() {
  const [user, setUser] = useState<any>(null);
  const [contests, setContests] = useState<any[]>([]);
  const [myEntries, setMyEntries] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [juryList, setJuryList] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  
  const [adminView, setAdminView] = useState<'contests' | 'users' | 'clubs'>('contests');
  const [userClubEdits, setUserClubEdits] = useState<Record<string, string>>({});
  const [newClubName, setNewClubName] = useState('');

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newCats, setNewCats] = useState('');
  const [newRestrictedClub, setNewRestrictedClub] = useState(''); 

  const [editContestId, setEditContestId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editCats, setEditCats] = useState('');
  const [editRestrictedClub, setEditRestrictedClub] = useState(''); 

  const [activeUploadContest, setActiveUploadContest] = useState<number | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editEntryTitle, setEditEntryTitle] = useState('');

  const [manageJuryContestId, setManageJuryContestId] = useState<number | null>(null);
  const [selectedJuryEmail, setSelectedJuryEmail] = useState('');

  const [judgingContestId, setJudgingContestId] = useState<number | null>(null);
  const [unvotedEntries, setUnvotedEntries] = useState<any[]>([]);
  const [currentScore, setCurrentScore] = useState<number | ''>('');
  
  const [viewResultsContestId, setViewResultsContestId] = useState<number | null>(null);
  const [contestResults, setContestResults] = useState<any[]>([]);
  const [viewStatsContestId, setViewStatsContestId] = useState<number | null>(null);
  const [contestStats, setContestStats] = useState<any[]>([]);

  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const resContests = await fetch(`${BACKEND_URL}/api/contests`);
      if (resContests.ok) setContests(await resContests.json());
      const resJury = await fetch(`${BACKEND_URL}/api/jury`);
      if (resJury.ok) setJuryList(await resJury.json());
      const resUsers = await fetch(`${BACKEND_URL}/api/users`);
      if (resUsers.ok) setAllUsers(await resUsers.json());
      const resClubs = await fetch(`${BACKEND_URL}/api/clubs`);
      if (resClubs.ok) setClubs(await resClubs.json());
    } catch (e) { console.error(e); }
  };

  const fetchMyEntries = async (email: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/my-entries?userEmail=${email}`);
      if (res.ok) setMyEntries(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
    const storedToken = localStorage.getItem('photoAppToken');
    if (storedToken) {
      try {
        const decoded: any = jwtDecode(storedToken);
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('photoAppToken');
        } else {
          setUser(decoded);
          fetchMyEntries(decoded.email);
        }
      } catch (e) {
        localStorage.removeItem('photoAppToken');
      }
    }
  }, []);

  const handleLoginSuccess = async (credential: string) => {
    localStorage.setItem('photoAppToken', credential);
    const decoded: any = jwtDecode(credential);
    setUser(decoded);
    await fetch(`${BACKEND_URL}/api/auth/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: decoded.email, name: decoded.name, sub: decoded.sub }) });
    fetchData(); fetchMyEntries(decoded.email);
  };

  const handleAddClub = async () => {
    if (!newClubName) return;
    const res = await fetch(`${BACKEND_URL}/api/clubs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newClubName }) });
    if (res.ok) { setNewClubName(''); fetchData(); }
  };

  const handleDeleteClub = async (id: number) => {
    if (!window.confirm("Biztosan törlöd ezt a klubot?")) return;
    const res = await fetch(`${BACKEND_URL}/api/clubs/${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
  };

  const saveUserClub = async (email: string) => {
    const clubName = userClubEdits[email] !== undefined ? userClubEdits[email] : (allUsers.find(u => u.email === email)?.club_name || '');
    const res = await fetch(`${BACKEND_URL}/api/users/${email}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clubName }) });
    if (res.ok) { alert("Sikeres mentés!"); fetchData(); }
  };

  const handleCreateContest = async () => {
    if (!newTitle || !newStart || !newEnd || !newCats) return alert("Cím, dátumok és kategóriák kötelezőek!");
    const res = await fetch(`${BACKEND_URL}/api/contests`, { 
      method: 'POST', headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ title: newTitle, description: newDesc, startDate: newStart, endDate: newEnd, categories: newCats, restrictedClub: newRestrictedClub }) 
    });
    if (res.ok) { setNewTitle(''); setNewDesc(''); setNewStart(''); setNewEnd(''); setNewCats(''); setNewRestrictedClub(''); fetchData(); }
  };

  const startEdit = (contest: any) => {
    setEditContestId(contest.id); setEditTitle(contest.title); setEditDesc(contest.description); setEditCats(contest.categories || ''); setEditRestrictedClub(contest.restricted_club || '');
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '';
      try { const d = new Date(dateStr); if (isNaN(d.getTime()) || d.getFullYear() <= 1970) return ''; return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16); } catch (e) { return ''; }
    };
    setEditStart(formatDate(contest.start_date)); setEditEnd(formatDate(contest.end_date));
  };

  const handleUpdateContest = async () => {
    const res = await fetch(`${BACKEND_URL}/api/contests/${editContestId}`, { 
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ title: editTitle, description: editDesc, startDate: editStart || null, endDate: editEnd || null, categories: editCats, restrictedClub: editRestrictedClub }) 
    });
    if (res.ok) { setEditContestId(null); fetchData(); alert("Pályázat sikeresen frissítve!"); }
  };

  const handleAddJury = async (contestId: number) => {
    if (!selectedJuryEmail) return;
    const res = await fetch(`${BACKEND_URL}/api/jury`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contestId, userEmail: selectedJuryEmail }) });
    if (res.ok) { setSelectedJuryEmail(''); fetchData(); }
  };

  const handleRemoveJury = async (contestId: number, email: string) => {
    const res = await fetch(`${BACKEND_URL}/api/jury`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contestId, userEmail: email }) });
    if (res.ok) fetchData();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setUploadFile(file); setUploadPreview(URL.createObjectURL(file)); }
  };

  const handleUpload = async (contestId: number) => {
    if (!uploadFile || !uploadTitle || !uploadCategory) return alert("Minden kötelező!");
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', uploadFile); formData.append('contestId', String(contestId)); formData.append('userEmail', user.email); formData.append('userName', user.name); formData.append('title', uploadTitle); formData.append('category', uploadCategory);
      const res = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: formData });
      if (res.ok) { alert("Feltöltve!"); setActiveUploadContest(null); setUploadFile(null); setUploadPreview(null); setUploadTitle(''); setUploadCategory(''); fetchMyEntries(user.email); } 
      else { const err = await res.json(); alert(`Hiba: ${err.error}`); }
    } catch (error) { alert("Hiba"); } finally { setIsUploading(false); }
  };

  const handleUpdateEntryTitle = async (entryId: number) => {
    if (!editEntryTitle) return alert('A cím nem lehet üres!');
    const res = await fetch(`${BACKEND_URL}/api/entries/${entryId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editEntryTitle, userEmail: user.email })
    });
    if (res.ok) { setEditingEntryId(null); fetchMyEntries(user.email); }
    else alert('Hiba a cím frissítésekor!');
  };

  const handleDeleteEntry = async (entryId: number) => {
    if (!window.confirm("Biztosan törlöd?")) return;
    const res = await fetch(`${BACKEND_URL}/api/entries/${entryId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEmail: user.email }) });
    if (res.ok) fetchMyEntries(user.email);
  };

  const startJudging = async (contestId: number) => {
    const res = await fetch(`${BACKEND_URL}/api/jury-entries/${contestId}?userEmail=${user.email}`);
    if (res.ok) { setUnvotedEntries(await res.json()); setJudgingContestId(contestId); setCurrentScore(''); }
  };

  const submitVote = async () => {
    const score = Number(currentScore);
    if (score < 0 || score > 100 || currentScore === '') return alert("0 és 100 közötti pontszámot adj meg!");
    const res = await fetch(`${BACKEND_URL}/api/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entryId: unvotedEntries[0].id, juryEmail: user.email, score }) });
    if (res.ok) { setUnvotedEntries(prev => prev.slice(1)); setCurrentScore(''); }
  };

  const loadResults = async (contestId: number) => {
    const res = await fetch(`${BACKEND_URL}/api/results/${contestId}`);
    if (res.ok) { setContestResults(await res.json()); setViewResultsContestId(contestId); }
  };

  const loadStats = async (contestId: number) => {
    const res = await fetch(`${BACKEND_URL}/api/admin/stats/${contestId}`);
    if (res.ok) { setContestStats(await res.json()); setViewStatsContestId(contestId); }
  };

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {fullscreenImage && (
        <div onClick={() => setFullscreenImage(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out' }}>
          <img src={fullscreenImage} alt="Teljes képernyő" style={{ maxHeight: '95vh', maxWidth: '95vw', objectFit: 'contain' }} />
          <div style={{ position: 'absolute', top: '20px', right: '30px', color: 'white', fontSize: '2rem', fontWeight: 'bold' }}>×</div>
        </div>
      )}

      {/* --- KÜLÖNVÁLASZTOTT LOGINKÉPERNYŐ (HA NINCS BEJELENTKEZVE) --- */}
      {!user ? (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          backgroundColor: '#0f172a',
          // Prémium fotós háttérkép egy sötét ráhúzással
          backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.95)), url("https://images.unsplash.com/photo-1452860606245-08befc0ff44b?q=80&w=2070&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily: 'Inter, sans-serif',
          overflow: 'hidden'
        }}>
          {/* Ambient háttérfények */}
          <div style={{ position: 'absolute', top: '10%', left: '15%', width: '400px', height: '400px', background: '#38bdf8', filter: 'blur(150px)', opacity: 0.2, borderRadius: '50%' }}></div>
          <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: '400px', height: '400px', background: '#8b5cf6', filter: 'blur(150px)', opacity: 0.2, borderRadius: '50%' }}></div>

          {/* Glassmorphism kártya */}
          <div style={{
            position: 'relative',
            zIndex: 10,
            background: 'rgba(30, 41, 59, 0.4)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            padding: '4rem 3rem',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            maxWidth: '550px',
            width: '90%',
            textAlign: 'center'
          }}>
            {/* Kamera Ikon/Logo */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)', padding: '16px', borderRadius: '50%', boxShadow: '0 10px 25px -5px rgba(56, 189, 248, 0.4)' }}>
                 <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                   <circle cx="12" cy="13" r="4"></circle>
                 </svg>
              </div>
            </div>

            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: '#f8fafc', lineHeight: '1.2' }}>
              Képolvasók
            </h1>
            <h2 style={{ fontSize: '1.4rem', margin: '0 0 2rem 0', background: 'linear-gradient(to right, #38bdf8, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '600' }}>
              Fotópályázati Platform
            </h2>
            
            <p style={{ fontSize: '1.1rem', color: '#cbd5e1', marginBottom: '3rem', lineHeight: '1.6', fontWeight: '400' }}>
              Egy sokoldalú rendszer, amely minden igényt kiszolgál. Legyen szó zártkörű házi versenyről vagy országos megmérettetésről – itt mindent egy helyen kezelhetsz.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '50px', display: 'inline-block', border: '1px solid rgba(255,255,255,0.1)' }}>
                <GoogleLogin 
                  onSuccess={(res) => handleLoginSuccess(res.credential!)} 
                  shape="pill" 
                  size="large" 
                  theme="filled_black" 
                  text="continue_with" 
                />
              </div>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                Biztonságos belépés Google fiókkal
              </span>
            </div>
          </div>
        </div>
      ) : (
        // --- BELSŐ FELÜLET (BEJELENTKEZÉS UTÁN) ---
        <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
          
          <header style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', position: 'sticky', top: 0, zIndex: 10 }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              {user?.email === ADMIN_EMAIL && (
                <div style={{ background: '#0f172a', padding: '5px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexWrap: 'wrap' }}>
                  <button onClick={() => setAdminView('contests')} style={{ background: adminView === 'contests' ? '#38bdf8' : 'transparent', color: adminView === 'contests' ? '#0f172a' : '#94a3b8', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Pályázatok</button>
                  <button onClick={() => setAdminView('users')} style={{ background: adminView === 'users' ? '#38bdf8' : 'transparent', color: adminView === 'users' ? '#0f172a' : '#94a3b8', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Felhasználók</button>
                  <button onClick={() => setAdminView('clubs')} style={{ background: adminView === 'clubs' ? '#38bdf8' : 'transparent', color: adminView === 'clubs' ? '#0f172a' : '#94a3b8', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Klubok</button>
                </div>
              )}
            </div> 
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontWeight: 500 }}>{user.name}</span>
              <button onClick={() => { googleLogout(); localStorage.removeItem('photoAppToken'); setUser(null); }} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>Kijelentkezés</button>
            </div>
          </header>

          <main style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
            {adminView === 'clubs' && user.email === ADMIN_EMAIL ? (
               <div>
                 <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#38bdf8' }}>🏷️ Fotóklubok Kezelése</h2>
                 <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #334155', display: 'flex', gap: '10px' }}>
                    <input placeholder="Új fotóklub neve..." value={newClubName} onChange={e => setNewClubName(e.target.value)} style={{...inputStyle, marginBottom: 0}} />
                    <button onClick={handleAddClub} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Hozzáadás</button>
                 </div>
                 <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
                   {clubs.length === 0 ? <div style={{padding: '20px', color: '#94a3b8', textAlign: 'center'}}>Még nincs egyetlen klub sem rögzítve.</div> : null}
                   {clubs.map((c, index) => (
                     <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: index < clubs.length - 1 ? '1px solid #334155' : 'none', background: index % 2 === 0 ? '#0f172a' : 'transparent' }}>
                       <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{c.name}</div>
                       <button onClick={() => handleDeleteClub(c.id)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>Törlés</button>
                     </div>
                   ))}
                 </div>
               </div>
            ) : adminView === 'users' && user.email === ADMIN_EMAIL ? (
              <div>
                 <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#38bdf8' }}>👥 Felhasználók és Klubtagságok</h2>
                 <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
                   {allUsers.map((u, index) => (
                     <div key={u.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: index < allUsers.length - 1 ? '1px solid #334155' : 'none', background: index % 2 === 0 ? '#0f172a' : 'transparent' }}>
                       <div>
                         <div style={{ fontWeight: 'bold' }}>{u.name}</div>
                         <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{u.email}</div>
                       </div>
                       <div style={{ display: 'flex', gap: '10px' }}>
                         <select 
                           value={userClubEdits[u.email] !== undefined ? userClubEdits[u.email] : (u.club_name || '')} 
                           onChange={e => setUserClubEdits({...userClubEdits, [u.email]: e.target.value})} 
                           style={{ padding: '8px', borderRadius: '6px', background: '#1e293b', border: '1px solid #475569', color: 'white', width: '250px' }} 
                         >
                           <option value="">-- Független / Nem klubtag --</option>
                           {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                         </select>
                         <button onClick={() => saveUserClub(u.email)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>Mentés</button>
                       </div>
                     </div>
                   ))}
                 </div>
              </div>
            ) : (
              <>
                {user.email === ADMIN_EMAIL && (
                  <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #38bdf8' }}>
                    <h3 style={{ marginTop: 0, color: '#38bdf8' }}>⚙️ Új Pályázat Létrehozása</h3>
                    <input placeholder="Pályázat címe" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={inputStyle} />
                    <textarea placeholder="Leírás" value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{...inputStyle, minHeight: '60px'}} />
                    <div style={{display: 'flex', gap: '10px'}}><div style={{flex: 1}}><label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Kezdés</label><input type="datetime-local" value={newStart} onChange={e => setNewStart(e.target.value)} style={inputStyle} /></div><div style={{flex: 1}}><label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Befejezés</label><input type="datetime-local" value={newEnd} onChange={e => setNewEnd(e.target.value)} style={inputStyle} /></div></div>
                    <input placeholder="Kategóriák (pl: Természet, Portré)" value={newCats} onChange={e => setNewCats(e.target.value)} style={inputStyle} />
                    <select value={newRestrictedClub} onChange={e => setNewRestrictedClub(e.target.value)} style={{...inputStyle, border: '1px solid #f59e0b'}}>
                      <option value="">🔓 Nyilvános pályázat (Bárki nevezhet)</option>
                      {clubs.map(c => <option key={c.id} value={c.name}>🔒 Zártkörű: {c.name}</option>)}
                    </select>
                    <button onClick={handleCreateContest} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Létrehozás</button>
                  </div>
                )}

                <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Aktuális Fotópályázatok</h2>
                
                {contests.map(contest => {
                  const currentDbUser = allUsers.find(u => u.email === user.email);
                  const isRestricted = contest.restricted_club && contest.restricted_club.trim() !== '';
                  
                  if (isRestricted && user.email !== ADMIN_EMAIL && currentDbUser?.club_name !== contest.restricted_club) {
                    return null;
                  }

                  const now = new Date();
                  const start = contest.start_date ? new Date(contest.start_date) : new Date(0);
                  const end = contest.end_date ? new Date(contest.end_date) : new Date(0);
                  const isStarted = now >= start;
                  const isEnded = now > end && start.getFullYear() > 1970;
                  const isActive = isStarted && !isEnded;
                  
                  const categories = contest.categories ? contest.categories.split(',').map((c:string) => c.trim()).filter(Boolean) : [];
                  const contestJury = juryList.filter(j => j.contest_id === contest.id);
                  const isUserJury = contestJury.some(j => j.user_email === user.email);

                  const myContestEntries = myEntries.filter(e => e.contest_id === contest.id);
                  const categoryCounts: Record<string, number> = {};
                  categories.forEach((cat: string) => categoryCounts[cat] = 0);
                  myContestEntries.forEach(entry => { if (categoryCounts[entry.category] !== undefined) categoryCounts[entry.category]++; });

                  return (
                    <div key={contest.id} style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: isActive ? '1px solid #10b981' : isEnded ? '1px solid #ef4444' : '1px solid #475569', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', position: 'relative' }}>
                      
                      {isRestricted && (
                        <div style={{ position: 'absolute', top: '-12px', left: '20px', background: '#f59e0b', color: '#0f172a', padding: '4px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                          🔒 Zártkörű: {contest.restricted_club}
                        </div>
                      )}

                      {manageJuryContestId === contest.id ? (
                         <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px' }}>
                            <h4 style={{marginTop: 0, color: '#a78bfa'}}>⚖️ Zsűri kezelése</h4>
                            <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}><select value={selectedJuryEmail} onChange={e => setSelectedJuryEmail(e.target.value)} style={{...inputStyle, marginBottom: 0}}><option value="">-- Válassz usert --</option>{allUsers.filter(u => !contestJury.some(j => j.user_email === u.email)).map(u => (<option key={u.email} value={u.email}>{u.name} ({u.email})</option>))}</select><button onClick={() => handleAddJury(contest.id)} style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer' }}>Hozzáadás</button></div>
                            <ul style={{ padding: 0, listStyle: 'none' }}>{contestJury.map(jury => <li key={jury.user_email} style={{ display: 'flex', justifyContent: 'space-between', background: '#1e293b', padding: '10px', borderRadius: '6px', marginBottom: '5px' }}><span>{allUsers.find(u => u.email === jury.user_email)?.name || jury.user_email}</span><button onClick={() => handleRemoveJury(contest.id, jury.user_email)} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}>Töröl</button></li>)}</ul>
                            <button onClick={() => setManageJuryContestId(null)} style={{ marginTop: '10px', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', padding: '5px 15px', borderRadius: '6px', cursor: 'pointer' }}>Vissza</button>
                         </div>

                      ) : viewStatsContestId === contest.id ? (
                        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, color: '#38bdf8' }}>📊 Nevezési Statisztika: {contest.title}</h3>
                            <button onClick={() => setViewStatsContestId(null)} style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #475569', padding: '5px 15px', borderRadius: '6px', cursor: 'pointer' }}>Bezár</button>
                          </div>
                          {contestStats.length === 0 ? (
                            <p style={{ color: '#94a3b8' }}>Még nem érkezett nevezés ehhez a pályázathoz.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                              {Object.entries(contestStats.reduce((acc, curr) => {
                                if (!acc[curr.user_email]) acc[curr.user_email] = { name: curr.user_name, cats: [] };
                                acc[curr.user_email].cats.push({ cat: curr.category, count: curr.image_count });
                                return acc;
                              }, {} as Record<string, any>)).map(([email, data]: any) => (
                                <div key={email} style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
                                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#f8fafc', marginBottom: '5px' }}>{data.name}</div>
                                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '15px' }}>{email}</div>
                                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {data.cats.map((c: any) => (
                                      <span key={c.cat} style={{ background: '#38bdf820', color: '#38bdf8', padding: '6px 12px', borderRadius: '100px', fontSize: '0.85rem' }}>{c.cat}: <strong style={{color: '#f8fafc'}}>{c.count} db</strong></span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      ) : editContestId === contest.id ? (
                        <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px' }}>
                          <h4 style={{marginTop: 0, color: '#f59e0b'}}>Pályázat Szerkesztése</h4>
                          <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={inputStyle} />
                          <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{...inputStyle, minHeight: '60px'}} />
                          <div style={{display: 'flex', gap: '10px'}}>
                            <div style={{flex: 1}}><label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Kezdés</label><input type="datetime-local" value={editStart} onChange={e => setEditStart(e.target.value)} style={inputStyle} /></div>
                            <div style={{flex: 1}}><label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Befejezés</label><input type="datetime-local" value={editEnd} onChange={e => setEditEnd(e.target.value)} style={inputStyle} /></div>
                          </div>
                          <input value={editCats} onChange={e => setEditCats(e.target.value)} style={inputStyle} />
                          <select value={editRestrictedClub} onChange={e => setEditRestrictedClub(e.target.value)} style={{...inputStyle, border: '1px solid #f59e0b'}}>
                            <option value="">🔓 Nyilvános pályázat (Bárki nevezhet)</option>
                            {clubs.map(c => <option key={c.id} value={c.name}>🔒 Zártkörű: {c.name}</option>)}
                          </select>
                          <div style={{display: 'flex', gap: '10px'}}>
                            <button onClick={handleUpdateContest} style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>Mentés</button>
                            <button onClick={() => setEditContestId(null)} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>Mégse</button>
                          </div>
                        </div>
                      ) : judgingContestId === contest.id ? (
                        <div style={{ background: '#0f172a', padding: '30px', borderRadius: '12px', textAlign: 'center', border: '1px solid #334155' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #1e293b', paddingBottom: '15px' }}>
                             <h3 style={{ color: '#f59e0b', margin: 0, fontSize: '1.4rem' }}>🏅 Zsűrizés folyamatban</h3>
                             <span style={{ background: '#1e293b', padding: '6px 15px', borderRadius: '100px', fontSize: '0.9rem', color: '#94a3b8' }}>Hátralévő: {unvotedEntries.length} db</span>
                          </div>
                          
                          {unvotedEntries.length > 0 ? (
                            <div>
                              {(() => {
                                const currentEntry = unvotedEntries[0];
                                const imageUrl = currentEntry.drive_file_id ? `https://lh3.googleusercontent.com/d/${currentEntry.drive_file_id}` : currentEntry.file_url;
                                return (
                                  <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px' }}>
                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '1.6rem', color: '#f8fafc' }}>{currentEntry.title || "Névtelen kép"}</h4>
                                    <div style={{ display: 'inline-block', background: '#38bdf820', color: '#38bdf8', padding: '6px 16px', borderRadius: '100px', fontSize: '0.9rem', marginBottom: '25px', fontWeight: 'bold' }}>Kategória: {currentEntry.category || "Ismeretlen"}</div>
                                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', marginBottom: '30px', minHeight: '350px', background: '#0f172a', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
                                      <img src={imageUrl} alt={currentEntry.title} onClick={() => setFullscreenImage(imageUrl)} style={{ maxHeight: '600px', maxWidth: '100%', objectFit: 'contain', cursor: 'zoom-in', width: '100%' }} />
                                    </div>
                                    <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '20px', border: '1px solid #334155', flexWrap: 'wrap', justifyContent: 'center' }}>
                                      <label style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#94a3b8' }}>Pontszám:</label>
                                      <input type="number" min="0" max="100" placeholder="0-100" value={currentScore} onChange={e => setCurrentScore(e.target.value ? Number(e.target.value) : '')} style={{ width: '120px', padding: '15px', fontSize: '1.5rem', textAlign: 'center', backgroundColor: '#1e293b', border: '2px solid #f59e0b', color: 'white', borderRadius: '8px', outline: 'none' }} />
                                      <button onClick={submitVote} style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '15px 30px', fontSize: '1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Értékelem</button>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <div style={{ padding: '40px 0' }}>
                              <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🎉</div>
                              <h2 style={{ color: '#10b981', margin: '0 0 10px 0' }}>Minden képet értékeltél!</h2>
                              <button onClick={() => setJudgingContestId(null)} style={{ background: 'transparent', color: '#38bdf8', border: '1px solid #38bdf8', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginTop: '25px' }}>Vissza a pályázatokhoz</button>
                            </div>
                          )}
                        </div>
                      ) : viewResultsContestId === contest.id ? (
                         <div style={{ background: '#0f172a', padding: '20px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '20px' }}>
                              <h3 style={{ margin: 0, color: '#10b981' }}>🏆 Végeredmény: {contest.title}</h3>
                              <button onClick={() => setViewResultsContestId(null)} style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #475569', padding: '5px 15px', borderRadius: '6px', cursor: 'pointer' }}>Bezár</button>
                            </div>
                            {categories.map((cat: string) => {
                              const catResults = contestResults.filter(r => r.category === cat);
                              if (catResults.length === 0) return null;
                              return (
                                <div key={cat} style={{ marginBottom: '30px' }}>
                                  <h4 style={{ color: '#38bdf8', borderBottom: '2px solid #38bdf8', display: 'inline-block', paddingBottom: '5px' }}>{cat}</h4>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {catResults.map((res, index) => (
                                      <div key={res.id} style={{ display: 'flex', alignItems: 'center', background: '#1e293b', padding: '10px', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', width: '40px', color: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#475569' }}>#{index + 1}</div>
                                        <img src={res.drive_file_id ? `https://lh3.googleusercontent.com/d/${res.drive_file_id}` : res.file_url} alt="Kép" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', marginRight: '15px', cursor: 'pointer' }} onClick={() => setFullscreenImage(res.drive_file_id ? `https://lh3.googleusercontent.com/d/${res.drive_file_id}` : res.file_url)} />
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontWeight: 'bold' }}>{res.title}</div>
                                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Készítő: {res.user_name} ({res.user_email})</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981' }}>{res.total_score} pont</div>
                                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{res.vote_count} szavazat</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                         </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <h3 style={{ margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: isRestricted ? '10px' : '0' }}>
                                {contest.title}
                                <button onClick={() => loadStats(contest.id)} style={{ background: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>📊 Nevezők</button>
                                {user.email === ADMIN_EMAIL && (
                                  <>
                                    <button onClick={() => startEdit(contest)} style={{ background: 'transparent', border: '1px solid #f59e0b', color: '#f59e0b', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>Szerkesztés</button>
                                    <button onClick={() => setManageJuryContestId(contest.id)} style={{ background: 'transparent', border: '1px solid #8b5cf6', color: '#8b5cf6', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>Zsűri ({contestJury.length})</button>
                                    {isEnded && <button onClick={() => loadResults(contest.id)} style={{ background: '#10b981', border: 'none', color: 'white', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>🏆 Eredmények</button>}
                                  </>
                                )}
                              </h3>
                              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 15px 0', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{contest.description}</p>
                            </div>
                            <span style={{ padding: '6px 12px', borderRadius: '100px', fontSize: '0.8rem', background: isActive ? '#10b98120' : isEnded ? '#ef444420' : '#f59e0b20', color: isActive ? '#10b981' : isEnded ? '#ef4444' : '#f59e0b', fontWeight: 'bold' }}>
                              {isActive ? 'Aktív Pályázat' : isEnded ? 'Lezárult' : 'Hamarosan indul'}
                            </span>
                          </div>
                          <p style={{fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 15px 0'}}>📅 {start.getFullYear() > 1970 ? `${start.toLocaleDateString()} - ${end.toLocaleDateString()}` : 'Nincs dátum megadva'}</p>

                          {contestJury.length > 0 && (
                            <div style={{ fontSize: '0.85rem', color: '#a78bfa', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span>⚖️ <strong>Zsűri:</strong> {contestJury.map(j => allUsers.find(u => u.email === j.user_email)?.name || j.user_email).join(', ')}</span>
                            </div>
                          )}

                          {isUserJury && (
                            <div style={{ background: 'linear-gradient(to right, #f59e0b20, #0f172a)', borderLeft: '4px solid #f59e0b', color: '#f8fafc', padding: '15px 20px', borderRadius: '0 8px 8px 0', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <strong style={{ color: '#f59e0b', fontSize: '1.1rem' }}>🏅 Zsűritag vagy!</strong>
                                <div style={{ fontSize: '0.9rem', marginTop: '5px', color: '#cbd5e1' }}>{isActive ? 'A pontozás a pályázat lezárulta után indul.' : isEnded ? 'A pályázat lezárult, kezdheted a pontozást!' : 'A pályázat még nem indult el.'}</div>
                              </div>
                              {isEnded && (
                                <button onClick={() => startJudging(contest.id)} style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.3)' }}>Értékelés Indítása</button>
                              )}
                            </div>
                          )}

                          {isActive && !isUserJury && activeUploadContest !== contest.id && (
                            <button onClick={() => { setActiveUploadContest(contest.id); setUploadCategory(''); }} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '15px' }}>+ Új Kép Nevezése</button>
                          )}

                          {activeUploadContest === contest.id && (
                            <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #38bdf840' }}>
                              <h4 style={{marginTop: 0, color: '#38bdf8', fontSize: '1.2rem'}}>Kép feltöltése</h4>
                              <input placeholder="Kép címe" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} style={inputStyle} disabled={isUploading} />
                              <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} style={inputStyle} disabled={isUploading}><option value="">-- Válassz kategóriát --</option>{categories.map((cat: string) => { const count = categoryCounts[cat] || 0; return <option key={cat} value={cat} disabled={count >= 4}>{cat} ({count}/4 feltöltve)</option>; })}</select>
                              <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileSelect} style={{ color: '#94a3b8', marginBottom: '15px', width: '100%' }} disabled={isUploading} />
                              {uploadPreview && <div style={{marginTop: '10px', marginBottom: '20px', textAlign: 'center'}}><img src={uploadPreview} alt="Előnézet" style={{maxHeight: '300px', borderRadius: '8px', border: '2px solid #334155'}} /></div>}
                              <div style={{display: 'flex', gap: '10px'}}><button onClick={() => handleUpload(contest.id)} disabled={isUploading} style={{ flex: 1, background: isUploading ? '#475569' : '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: isUploading ? 'not-allowed' : 'pointer', fontWeight: 'bold', transition: 'background 0.3s' }}>{isUploading ? 'Feltöltés ⏳...' : 'Beküldés 🚀'}</button><button onClick={() => { setActiveUploadContest(null); setUploadPreview(null); }} disabled={isUploading} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '12px', borderRadius: '8px', cursor: isUploading ? 'not-allowed' : 'pointer' }}>Mégse</button></div>
                            </div>
                          )}

                          {myContestEntries.length > 0 && (
                            <div style={{ marginTop: '30px', borderTop: '1px solid #334155', paddingTop: '20px' }}>
                              <h4 style={{margin: '0 0 20px 0', fontSize: '1.2rem'}}>Saját Nevezéseid</h4>
                              {categories.map((cat: string) => {
                                const catEntries = myContestEntries.filter(e => e.category === cat);
                                if (catEntries.length === 0) return null;
                                return (
                                  <div key={cat} style={{ marginBottom: '25px' }}>
                                    <h5 style={{ color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: '8px', marginTop: 0, fontSize: '1.1rem' }}>{cat} <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>({catEntries.length}/4)</span></h5>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
                                      {catEntries.map(entry => {
                                        const imageUrl = entry.drive_file_id ? `https://lh3.googleusercontent.com/d/${entry.drive_file_id}` : entry.file_url;
                                        return (
                                          <div key={entry.id} style={{ background: '#0f172a', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                                            <img src={imageUrl} alt={entry.title} onClick={() => setFullscreenImage(imageUrl)} style={{ width: '100%', height: '140px', objectFit: 'cover', backgroundColor: '#1e293b', cursor: 'zoom-in' }} />
                                            
                                            {editingEntryId === entry.id ? (
                                              <div style={{ padding: '12px' }}>
                                                <input 
                                                  value={editEntryTitle} 
                                                  onChange={e => setEditEntryTitle(e.target.value)} 
                                                  style={{ width: '100%', padding: '6px', marginBottom: '10px', backgroundColor: '#1e293b', border: '1px solid #38bdf8', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} 
                                                />
                                                <div style={{ display: 'flex', gap: '5px' }}>
                                                  <button onClick={() => handleUpdateEntryTitle(entry.id)} style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Mentés</button>
                                                  <button onClick={() => setEditingEntryId(null)} style={{ flex: 1, background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Mégse</button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div style={{ padding: '12px' }}>
                                                <div style={{ fontSize: '1rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#f8fafc' }}>{entry.title}</div>
                                                {!isEnded && (
                                                  <div style={{ display: 'flex', gap: '5px', marginTop: '12px' }}>
                                                    <button onClick={() => { setEditingEntryId(entry.id); setEditEntryTitle(entry.title); }} style={{ flex: 1, background: '#38bdf820', color: '#38bdf8', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Szerkeszt</button>
                                                    <button onClick={() => handleDeleteEntry(entry.id)} style={{ flex: 1, background: '#ef444420', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Törlés</button>
                                                  </div>
                                                )}
                                              </div>
                                            )}

                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </main>
        </div>
      )}
    </GoogleOAuthProvider>
  );
}

export default App;
