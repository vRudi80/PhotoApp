import { useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
// Beimportáljuk a logót közvetlenül a mappából
import logo from './logo.png';

const GOOGLE_CLIENT_ID = "197361744572-ih728hq5jft3fqfd1esvktvrd8i97kcp.apps.googleusercontent.com";
const BACKEND_URL = "https://photoapp-backend-m4d1.onrender.com"; 
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

  // ... (többi segédfüggvény: handleAddClub, handleDeleteClub, stb. változatlanul marad)
  const handleAddClub = async () => { if (!newClubName) return; const res = await fetch(`${BACKEND_URL}/api/clubs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newClubName }) }); if (res.ok) { setNewClubName(''); fetchData(); } };
  const handleDeleteClub = async (id: number) => { if (!window.confirm("Biztosan törlöd ezt a klubot?")) return; const res = await fetch(`${BACKEND_URL}/api/clubs/${id}`, { method: 'DELETE' }); if (res.ok) fetchData(); };
  const saveUserClub = async (email: string) => { const clubName = userClubEdits[email] !== undefined ? userClubEdits[email] : (allUsers.find(u => u.email === email)?.club_name || ''); const res = await fetch(`${BACKEND_URL}/api/users/${email}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clubName }) }); if (res.ok) { alert("Sikeres mentés!"); fetchData(); } };
  const handleCreateContest = async () => { if (!newTitle || !newStart || !newEnd || !newCats) return alert("Cím, dátumok és kategóriák kötelezőek!"); const res = await fetch(`${BACKEND_URL}/api/contests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle, description: newDesc, startDate: newStart, endDate: newEnd, categories: newCats, restrictedClub: newRestrictedClub }) }); if (res.ok) { setNewTitle(''); setNewDesc(''); setNewStart(''); setNewEnd(''); setNewCats(''); setNewRestrictedClub(''); fetchData(); } };
  const startEdit = (contest: any) => { setEditContestId(contest.id); setEditTitle(contest.title); setEditDesc(contest.description); setEditCats(contest.categories || ''); setEditRestrictedClub(contest.restricted_club || ''); const formatDate = (dateStr: string | null) => { if (!dateStr) return ''; try { const d = new Date(dateStr); if (isNaN(d.getTime()) || d.getFullYear() <= 1970) return ''; return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16); } catch (e) { return ''; } }; setEditStart(formatDate(contest.start_date)); setEditEnd(formatDate(contest.end_date)); };
  const handleUpdateContest = async () => { const res = await fetch(`${BACKEND_URL}/api/contests/${editContestId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: editTitle, description: editDesc, startDate: editStart || null, endDate: editEnd || null, categories: editCats, restrictedClub: editRestrictedClub }) }); if (res.ok) { setEditContestId(null); fetchData(); alert("Pályázat sikeresen frissítve!"); } };
  const handleAddJury = async (contestId: number) => { if (!selectedJuryEmail) return; const res = await fetch(`${BACKEND_URL}/api/jury`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contestId, userEmail: selectedJuryEmail }) }); if (res.ok) { setSelectedJuryEmail(''); fetchData(); } };
  const handleRemoveJury = async (contestId: number, email: string) => { const res = await fetch(`${BACKEND_URL}/api/jury`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contestId, userEmail: email }) }); if (res.ok) fetchData(); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { setUploadFile(file); setUploadPreview(URL.createObjectURL(file)); } };
  const handleUpload = async (contestId: number) => { if (!uploadFile || !uploadTitle || !uploadCategory) return alert("Minden kötelező!"); setIsUploading(true); try { const formData = new FormData(); formData.append('photo', uploadFile); formData.append('contestId', String(contestId)); formData.append('userEmail', user.email); formData.append('userName', user.name); formData.append('title', uploadTitle); formData.append('category', uploadCategory); const res = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: formData }); if (res.ok) { alert("Feltöltve!"); setActiveUploadContest(null); setUploadFile(null); setUploadPreview(null); setUploadTitle(''); setUploadCategory(''); fetchMyEntries(user.email); } else { const err = await res.json(); alert(`Hiba: ${err.error}`); } } catch (error) { alert("Hiba"); } finally { setIsUploading(false); } };
  const handleUpdateEntryTitle = async (entryId: number) => { if (!editEntryTitle) return alert('A cím nem lehet üres!'); const res = await fetch(`${BACKEND_URL}/api/entries/${entryId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: editEntryTitle, userEmail: user.email }) }); if (res.ok) { setEditingEntryId(null); fetchMyEntries(user.email); } else alert('Hiba a cím frissítésekor!'); };
  const handleDeleteEntry = async (entryId: number) => { if (!window.confirm("Biztosan törlöd?")) return; const res = await fetch(`${BACKEND_URL}/api/entries/${entryId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEmail: user.email }) }); if (res.ok) fetchMyEntries(user.email); };
  const startJudging = async (contestId: number) => { const res = await fetch(`${BACKEND_URL}/api/jury-entries/${contestId}?userEmail=${user.email}`); if (res.ok) { setUnvotedEntries(await res.json()); setJudgingContestId(contestId); setCurrentScore(''); } };
  const submitVote = async () => { const score = Number(currentScore); if (score < 0 || score > 100 || currentScore === '') return alert("0 és 100 közötti pontszámot adj meg!"); const res = await fetch(`${BACKEND_URL}/api/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entryId: unvotedEntries[0].id, juryEmail: user.email, score }) }); if (res.ok) { setUnvotedEntries(prev => prev.slice(1)); setCurrentScore(''); } };
  const loadResults = async (contestId: number) => { const res = await fetch(`${BACKEND_URL}/api/results/${contestId}`); if (res.ok) { setContestResults(await res.json()); setViewResultsContestId(contestId); } };
  const loadStats = async (contestId: number) => { const res = await fetch(`${BACKEND_URL}/api/admin/stats/${contestId}`); if (res.ok) { setContestStats(await res.json()); setViewStatsContestId(contestId); } };

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {fullscreenImage && (
        <div onClick={() => setFullscreenImage(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out' }}>
          <img src={fullscreenImage} alt="Teljes képernyő" style={{ maxHeight: '95vh', maxWidth: '95vw', objectFit: 'contain' }} />
          <div style={{ position: 'absolute', top: '20px', right: '30px', color: 'white', fontSize: '2rem', fontWeight: 'bold' }}>×</div>
        </div>
      )}

      {!user ? (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', backgroundColor: '#0f172a',
          backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.98)), url("https://images.unsplash.com/photo-1452860606245-08befc0ff44b?q=80&w=2070&auto=format&fit=crop")',
          backgroundSize: 'cover', backgroundPosition: 'center', fontFamily: 'Inter, sans-serif', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '10%', left: '15%', width: '400px', height: '400px', background: '#00a693', filter: 'blur(150px)', opacity: 0.15, borderRadius: '50%' }}></div>
          <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: '400px', height: '400px', background: '#d32f2f', filter: 'blur(150px)', opacity: 0.15, borderRadius: '50%' }}></div>

          <div style={{
            position: 'relative', zIndex: 10, background: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            padding: '4rem 2.5rem', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            maxWidth: '500px', width: '90%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            {/* Itt hivatkozunk a beimportált logóra */}
            <img src={logo} alt="Képolvasók Fotóklub Egyesület" style={{ width: '100%', maxWidth: '300px', marginBottom: '2.5rem' }} />
            
            <p style={{ fontSize: '1.05rem', color: '#cbd5e1', marginBottom: '3rem', lineHeight: '1.6' }}>
              Egy sokoldalú rendszer, amely minden igényt kiszolgál. Legyen szó zártkörű házi versenyről vagy nemzetközi eseményről – itt mindent egy felületen kezelhetsz.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <GoogleLogin onSuccess={(res) => handleLoginSuccess(res.credential!)} shape="pill" size="large" theme="filled_black" />
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Belépés Google fiókkal</span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
          <header style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', position: 'sticky', top: 0, zIndex: 10 }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              {user?.email === ADMIN_EMAIL && (
                <div style={{ background: '#0f172a', padding: '5px', borderRadius: '8px', border: '1px solid #334155', display: 'flex' }}>
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
            {/* ... A kód többi része: klubok, felhasználók, pályázatok kezelése ... */}
            {/* (Ez a rész változatlan marad az előző verzióhoz képest) */}
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
                         <select value={userClubEdits[u.email] !== undefined ? userClubEdits[u.email] : (u.club_name || '')} onChange={e => setUserClubEdits({...userClubEdits, [u.email]: e.target.value})} style={{ padding: '8px', borderRadius: '6px', background: '#1e293b', border: '1px solid #475569', color: 'white', width: '250px' }}>
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
                  if (isRestricted && user.email !== ADMIN_EMAIL && currentDbUser?.club_name !== contest.restricted_club) return null;
                  const now = new Date(); const start = contest.start_date ? new Date(contest.start_date) : new Date(0); const end = contest.end_date ? new Date(contest.end_date) : new Date(0); const isStarted = now >= start; const isEnded = now > end && start.getFullYear() > 1970; const isActive = isStarted && !isEnded;
                  const categories = contest.categories ? contest.categories.split(',').map((c:string) => c.trim()).filter(Boolean) : [];
                  const contestJury = juryList.filter(j => j.contest_id === contest.id); const isUserJury = contestJury.some(j => j.user_email === user.email);
                  const myContestEntries = myEntries.filter(e => e.contest_id === contest.id); const categoryCounts: Record<string, number> = {}; categories.forEach((cat: string) => categoryCounts[cat] = 0); myContestEntries.forEach(entry => { if (categoryCounts[entry.category] !== undefined) categoryCounts[entry.category]++; });
                  return (
                    <div key={contest.id} style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: isActive ? '1px solid #10b981' : isEnded ? '1px solid #ef4444' : '1px solid #475569', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', position: 'relative' }}>
                      {isRestricted && <div style={{ position: 'absolute', top: '-12px', left: '20px', background: '#f59e0b', color: '#0f172a', padding: '4px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 'bold' }}>🔒 Zártkörű: {contest.restricted_club}</div>}
                      {manageJuryContestId === contest.id ? (
                         <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px' }}>
                            <h4 style={{marginTop: 0, color: '#a78bfa'}}>⚖️ Zsűri kezelése</h4>
                            <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}><select value={selectedJuryEmail} onChange={e => setSelectedJuryEmail(e.target.value)} style={{...inputStyle, marginBottom: 0}}><option value="">-- Válassz usert --</option>{allUsers.filter(u => !contestJury.some(j => j.user_email === u.email)).map(u => (<option key={u.email} value={u.email}>{u.name} ({u.email})</option>))}</select><button onClick={() => handleAddJury(contest.id)} style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer' }}>Hozzáadás</button></div>
                            <ul style={{ padding: 0, listStyle: 'none' }}>{contestJury.map(jury => <li key={jury.user_email} style={{ display: 'flex', justifyContent: 'space-between', background: '#1e293b', padding: '10px', borderRadius: '6px', marginBottom: '5px' }}><span>{allUsers.find(u => u.email === jury.user_email)?.name || jury.user_email}</span><button onClick={() => handleRemoveJury(contest.id, jury.user_email)} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}>Töröl</button></li>)}</ul>
                            <button onClick={() => setManageJuryContestId(null)} style={{ marginTop: '10px', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', padding: '5px 15px', borderRadius: '6px', cursor: 'pointer' }}>Vissza</button>
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
                              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 15px 0', whiteSpace: 'pre-wrap' }}>{contest.description}</p>
                            </div>
                            <span style={{ padding: '6px 12px', borderRadius: '100px', fontSize: '0.8rem', background: isActive ? '#10b98120' : isEnded ? '#ef444420' : '#f59e0b20', color: isActive ? '#10b981' : isEnded ? '#ef4444' : '#f59e0b', fontWeight: 'bold' }}>
                              {isActive ? 'Aktív' : isEnded ? 'Lezárult' : 'Hamarosan'}
                            </span>
                          </div>
                          {isActive && !isUserJury && activeUploadContest !== contest.id && (
                            <button onClick={() => { setActiveUploadContest(contest.id); setUploadCategory(''); }} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '15px' }}>+ Új Kép Nevezése</button>
                          )}
                          {/* (Feltöltő felület és saját nevezések listája itt folytatódik...) */}
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
