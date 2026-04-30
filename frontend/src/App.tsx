import { useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

const GOOGLE_CLIENT_ID = "197361744572-ih728hq5jft3fqfd1esvktvrd8i97kcp.apps.googleusercontent.com";
const BACKEND_URL = "https://photoapp-backend-m4d1.onrender.com"; // <-- ÁTÍRNI!
const ADMIN_EMAIL = "kovari.rudolf@gmail.com"; 

function App() {
  const [user, setUser] = useState<any>(null);
  const [contests, setContests] = useState<any[]>([]);
  const [myEntries, setMyEntries] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [juryList, setJuryList] = useState<any[]>([]);
  
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newCats, setNewCats] = useState('');

  const [editContestId, setEditContestId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editCats, setEditCats] = useState('');

  const [activeUploadContest, setActiveUploadContest] = useState<number | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [manageJuryContestId, setManageJuryContestId] = useState<number | null>(null);
  const [selectedJuryEmail, setSelectedJuryEmail] = useState('');

  // --- ÚJ ÁLLAPOTOK A ZSŰRIZÉSHEZ ÉS EREDMÉNYEKHEZ ---
  const [judgingContestId, setJudgingContestId] = useState<number | null>(null);
  const [unvotedEntries, setUnvotedEntries] = useState<any[]>([]);
  const [currentScore, setCurrentScore] = useState<number | ''>('');
  
  const [viewResultsContestId, setViewResultsContestId] = useState<number | null>(null);
  const [contestResults, setContestResults] = useState<any[]>([]);

  // Teljes képernyős kép állapota
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const resContests = await fetch(`${BACKEND_URL}/api/contests`);
      if (resContests.ok) setContests(await resContests.json());
      const resJury = await fetch(`${BACKEND_URL}/api/jury`);
      if (resJury.ok) setJuryList(await resJury.json());
      const resUsers = await fetch(`${BACKEND_URL}/api/users`);
      if (resUsers.ok) setAllUsers(await resUsers.json());
    } catch (e) { console.error(e); }
  };

  const fetchMyEntries = async (email: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/my-entries?userEmail=${email}`);
      if (res.ok) setMyEntries(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleLoginSuccess = async (credential: string) => {
    const decoded: any = jwtDecode(credential);
    setUser(decoded);
    await fetch(`${BACKEND_URL}/api/auth/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: decoded.email, name: decoded.name, sub: decoded.sub }) });
    fetchData(); fetchMyEntries(decoded.email);
  };

  // --- ALAP FUNKCIÓK ---
  const handleCreateContest = async () => {
    if (!newTitle || !newStart || !newEnd || !newCats) return alert("Minden mezőt ki kell tölteni!");
    const res = await fetch(`${BACKEND_URL}/api/contests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle, description: newDesc, startDate: newStart, endDate: newEnd, categories: newCats }) });
    if (res.ok) { setNewTitle(''); setNewDesc(''); setNewStart(''); setNewEnd(''); setNewCats(''); fetchData(); }
  };

  const startEdit = (contest: any) => {
    setEditContestId(contest.id); setEditTitle(contest.title); setEditDesc(contest.description); setEditCats(contest.categories || '');
    setEditStart(contest.start_date ? new Date(new Date(contest.start_date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16) : '');
    setEditEnd(contest.end_date ? new Date(new Date(contest.end_date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16) : '');
  };

  const handleUpdateContest = async () => {
    const res = await fetch(`${BACKEND_URL}/api/contests/${editContestId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: editTitle, description: editDesc, startDate: editStart, endDate: editEnd, categories: editCats }) });
    if (res.ok) { setEditContestId(null); fetchData(); }
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

  const handleDeleteEntry = async (entryId: number) => {
    if (!window.confirm("Biztosan törlöd?")) return;
    const res = await fetch(`${BACKEND_URL}/api/entries/${entryId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEmail: user.email }) });
    if (res.ok) fetchMyEntries(user.email);
  };

  // --- ÚJ: ZSŰRI ÉS EREDMÉNY FUNKCIÓK ---
  const startJudging = async (contestId: number) => {
    const res = await fetch(`${BACKEND_URL}/api/jury-entries/${contestId}?userEmail=${user.email}`);
    if (res.ok) {
      setUnvotedEntries(await res.json());
      setJudgingContestId(contestId);
      setCurrentScore('');
    }
  };

  const submitVote = async () => {
    const score = Number(currentScore);
    if (score < 0 || score > 100 || currentScore === '') return alert("0 és 100 közötti pontszámot adj meg!");
    const currentEntry = unvotedEntries[0];
    const res = await fetch(`${BACKEND_URL}/api/vote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId: currentEntry.id, juryEmail: user.email, score })
    });
    if (res.ok) {
      setUnvotedEntries(prev => prev.slice(1)); // Levesszük a listáról, jöhet a következő
      setCurrentScore('');
    }
  };

  const loadResults = async (contestId: number) => {
    const res = await fetch(`${BACKEND_URL}/api/results/${contestId}`);
    if (res.ok) {
      setContestResults(await res.json());
      setViewResultsContestId(contestId);
    }
  };
  // ------------------------------------

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      
      {/* TELJES KÉPERNYŐS NÉZET (MODAL) */}
      {fullscreenImage && (
        <div onClick={() => setFullscreenImage(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out' }}>
          <img src={fullscreenImage} alt="Teljes képernyő" style={{ maxHeight: '95vh', maxWidth: '95vw', objectFit: 'contain' }} />
          <div style={{ position: 'absolute', top: '20px', right: '30px', color: 'white', fontSize: '2rem', fontWeight: 'bold' }}>&times;</div>
        </div>
      )}

      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
        <header style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#38bdf8' }}>📸 PhotoContest</h1>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span>{user.name}</span>
              <button onClick={() => { googleLogout(); setUser(null); }} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Kijelentkezés</button>
            </div>
          ) : <GoogleLogin onSuccess={(res) => handleLoginSuccess(res.credential!)} />}
        </header>

        <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
          {!user ? <h2 style={{textAlign: 'center', marginTop: '3rem'}}>Lépj be a pályázatokhoz!</h2> : (
            <>
              {user.email === ADMIN_EMAIL && (
                <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #38bdf8' }}>
                  <h3 style={{ marginTop: 0, color: '#38bdf8' }}>⚙️ Új Pályázat</h3>
                  <input placeholder="Pályázat címe" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={inputStyle} />
                  <textarea placeholder="Leírás" value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{...inputStyle, minHeight: '60px'}} />
                  <div style={{display: 'flex', gap: '10px'}}><div style={{flex: 1}}><label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Kezdés</label><input type="datetime-local" value={newStart} onChange={e => setNewStart(e.target.value)} style={inputStyle} /></div><div style={{flex: 1}}><label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Befejezés</label><input type="datetime-local" value={newEnd} onChange={e => setNewEnd(e.target.value)} style={inputStyle} /></div></div>
                  <input placeholder="Kategóriák (pl: Természet, Portré)" value={newCats} onChange={e => setNewCats(e.target.value)} style={inputStyle} />
                  <button onClick={handleCreateContest} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Létrehozás</button>
                </div>
              )}

              <h2>Fotópályázatok</h2>
              {contests.map(contest => {
                const now = new Date();
                const start = contest.start_date ? new Date(contest.start_date) : new Date(0);
                const end = contest.end_date ? new Date(contest.end_date) : new Date(0);
                const isStarted = now >= start;
                const isEnded = now > end && start.getFullYear() > 1970; // Csak akkor lejárt, ha volt érvényes dátuma
                const isActive = isStarted && !isEnded;
                
                const categories = contest.categories ? contest.categories.split(',').map((c:string) => c.trim()).filter(Boolean) : [];
                const contestJury = juryList.filter(j => j.contest_id === contest.id);
                const isUserJury = contestJury.some(j => j.user_email === user.email);

                const myContestEntries = myEntries.filter(e => e.contest_id === contest.id);
                const categoryCounts: Record<string, number> = {};
                categories.forEach((cat: string) => categoryCounts[cat] = 0);
                myContestEntries.forEach(entry => { if (categoryCounts[entry.category] !== undefined) categoryCounts[entry.category]++; });

                return (
                  <div key={contest.id} style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: isActive ? '1px solid #10b981' : isEnded ? '1px solid #ef4444' : '1px solid #475569' }}>
                    
                    {manageJuryContestId === contest.id ? (
                      /* ZSŰRI KEZELŐ */
                       <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px' }}>
                          <h4 style={{marginTop: 0, color: '#a78bfa'}}>⚖️ Zsűri kezelése</h4>
                          <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}><select value={selectedJuryEmail} onChange={e => setSelectedJuryEmail(e.target.value)} style={{...inputStyle, marginBottom: 0}}><option value="">-- Válassz usert --</option>{allUsers.filter(u => !contestJury.some(j => j.user_email === u.email)).map(u => (<option key={u.email} value={u.email}>{u.name} ({u.email})</option>))}</select><button onClick={() => handleAddJury(contest.id)} style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer' }}>Hozzáadás</button></div>
                          <ul style={{ padding: 0, listStyle: 'none' }}>{contestJury.map(jury => <li key={jury.user_email} style={{ display: 'flex', justifyContent: 'space-between', background: '#1e293b', padding: '10px', borderRadius: '6px', marginBottom: '5px' }}><span>{allUsers.find(u => u.email === jury.user_email)?.name || jury.user_email}</span><button onClick={() => handleRemoveJury(contest.id, jury.user_email)} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}>Töröl</button></li>)}</ul>
                          <button onClick={() => setManageJuryContestId(null)} style={{ marginTop: '10px', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', padding: '5px 15px', borderRadius: '6px', cursor: 'pointer' }}>Vissza</button>
                       </div>
                    ) : judgingContestId === contest.id ? (
                      /* ZSŰRIZÉSI FELÜLET */
                      <div style={{ background: '#0f172a', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                        <h3 style={{ color: '#f59e0b', marginTop: 0 }}>🏅 Zsűrizés folyamatban</h3>
                        
                        {unvotedEntries.length > 0 ? (
                          <div>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>Hátralévő képek: {unvotedEntries.length} db</p>
                            
                            {/* Anonim kép */}
                            {(() => {
                              const currentEntry = unvotedEntries[0];
                              const imageUrl = currentEntry.drive_file_id ? `https://drive.google.com/thumbnail?id=${currentEntry.drive_file_id}&sz=w800` : currentEntry.file_url;
                              return (
                                <>
                                  <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <img 
                                      src={imageUrl} 
                                      alt="Értékelendő" 
                                      onClick={() => setFullscreenImage(imageUrl)}
                                      style={{ maxHeight: '400px', maxWidth: '100%', borderRadius: '8px', border: '2px solid #334155', cursor: 'zoom-in', objectFit: 'contain' }} 
                                    />
                                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', padding: '5px 10px', borderRadius: '6px', fontSize: '0.8rem', pointerEvents: 'none' }}>
                                      🔍 Kattints a nagyításhoz
                                    </div>
                                  </div>
                                  
                                  <h4 style={{ margin: '15px 0 5px 0', fontSize: '1.2rem' }}>{currentEntry.title}</h4>
                                  <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '20px' }}>Kategória: {currentEntry.category}</div>
                                  
                                  <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', display: 'inline-block' }}>
                                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Pontszám (0 - 100)</label>
                                    <input 
                                      type="number" min="0" max="100" 
                                      value={currentScore} onChange={e => setCurrentScore(e.target.value ? Number(e.target.value) : '')} 
                                      style={{ width: '100px', padding: '10px', fontSize: '1.2rem', textAlign: 'center', backgroundColor: '#0f172a', border: '2px solid #f59e0b', color: 'white', borderRadius: '6px', marginRight: '10px' }} 
                                    />
                                    <button onClick={submitVote} style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '12px 25px', fontSize: '1.1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Szavazok</button>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <div style={{ padding: '30px 0' }}>
                            <h2 style={{ color: '#10b981' }}>🎉 Minden képet értékeltél!</h2>
                            <p style={{ color: '#94a3b8' }}>Köszönjük a munkádat.</p>
                            <button onClick={() => setJudgingContestId(null)} style={{ background: 'transparent', color: '#38bdf8', border: '1px solid #38bdf8', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginTop: '20px' }}>Vissza a pályázatokhoz</button>
                          </div>
                        )}
                      </div>
                    ) : viewResultsContestId === contest.id ? (
                       /* EREDMÉNYEK (ADMIN) */
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
                                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', width: '40px', color: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#475569' }}>
                                        #{index + 1}
                                      </div>
                                      <img src={res.drive_file_id ? `https://drive.google.com/thumbnail?id=${res.drive_file_id}&sz=w200` : res.file_url} alt="Kép" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', marginRight: '15px', cursor: 'pointer' }} onClick={() => setFullscreenImage(res.drive_file_id ? `https://drive.google.com/thumbnail?id=${res.drive_file_id}&sz=w800` : res.file_url)} />
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
                      /* NORMÁL NÉZET */
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h3 style={{ margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {contest.title}
                              {user.email === ADMIN_EMAIL && (
                                <>
                                  {!isEnded && <button onClick={() => startEdit(contest)} style={{ background: 'transparent', border: '1px solid #f59e0b', color: '#f59e0b', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>Szerkesztés</button>}
                                  <button onClick={() => setManageJuryContestId(contest.id)} style={{ background: 'transparent', border: '1px solid #8b5cf6', color: '#8b5cf6', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>Zsűri ({contestJury.length})</button>
                                  {isEnded && <button onClick={() => loadResults(contest.id)} style={{ background: '#10b981', border: 'none', color: 'white', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>🏆 Eredmények</button>}
                                </>
                              )}
                            </h3>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 15px 0' }}>{contest.description}</p>
                          </div>
                          <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', background: isActive ? '#10b98120' : isEnded ? '#ef444420' : '#f59e0b20', color: isActive ? '#10b981' : isEnded ? '#ef4444' : '#f59e0b' }}>
                            {isActive ? 'Aktív Pályázat' : isEnded ? 'Lezárult' : 'Hamarosan indul'}
                          </span>
                        </div>
                        <p style={{fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 15px 0'}}>📅 {start.getFullYear() > 1970 ? `${start.toLocaleDateString()} - ${end.toLocaleDateString()}` : 'Nincs dátum'}</p>

                        {/* ZSŰRI ÜZENET ÉS GOMB */}
                        {isUserJury && (
                          <div style={{ background: '#f59e0b20', border: '1px solid #f59e0b', color: '#f59e0b', padding: '15px', borderRadius: '6px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong>🏅 Zsűritag vagy!</strong>
                              <div style={{ fontSize: '0.85rem', marginTop: '5px' }}>
                                {isActive ? 'A pontozás a pályázat lezárulta után (a befejezés dátumát követően) indul.' : isEnded ? 'A pályázat lezárult, kezdheted a pontozást!' : 'A pályázat még nem indult el.'}
                              </div>
                            </div>
                            {isEnded && (
                              <button onClick={() => startJudging(contest.id)} style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Értékelés Indítása
                              </button>
                            )}
                          </div>
                        )}

                        {isActive && !isUserJury && activeUploadContest !== contest.id && (
                          <button onClick={() => { setActiveUploadContest(contest.id); setUploadCategory(''); }} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '15px' }}>+ Új Kép Nevezése</button>
                        )}

                        {activeUploadContest === contest.id && (
                          <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                            <h4 style={{marginTop: 0, color: '#38bdf8'}}>Kép feltöltése</h4>
                            <input placeholder="Kép címe" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} style={inputStyle} disabled={isUploading} />
                            <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} style={inputStyle} disabled={isUploading}><option value="">-- Válassz kategóriát --</option>{categories.map((cat: string) => { const count = categoryCounts[cat] || 0; return <option key={cat} value={cat} disabled={count >= 4}>{cat} ({count}/4 feltöltve)</option>; })}</select>
                            <input type="file" accept="image/*" onChange={handleFileSelect} style={{ color: '#94a3b8', marginBottom: '10px' }} disabled={isUploading} />
                            {uploadPreview && <div style={{marginTop: '10px', marginBottom: '15px', textAlign: 'center'}}><img src={uploadPreview} alt="Előnézet" style={{maxHeight: '200px', borderRadius: '8px', border: '2px solid #334155'}} /></div>}
                            <div style={{display: 'flex', gap: '10px'}}><button onClick={() => handleUpload(contest.id)} disabled={isUploading} style={{ flex: 1, background: isUploading ? '#475569' : '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: isUploading ? 'not-allowed' : 'pointer' }}>{isUploading ? 'Feltöltés ⏳...' : 'Beküldés 🚀'}</button><button onClick={() => { setActiveUploadContest(null); setUploadPreview(null); }} disabled={isUploading} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '10px', borderRadius: '6px', cursor: isUploading ? 'not-allowed' : 'pointer' }}>Mégse</button></div>
                          </div>
                        )}

                        {myContestEntries.length > 0 && (
                          <div style={{ marginTop: '20px', borderTop: '1px solid #334155', paddingTop: '15px' }}>
                            <h4 style={{margin: '0 0 15px 0'}}>Saját Nevezéseid</h4>
                            {categories.map((cat: string) => {
                              const catEntries = myContestEntries.filter(e => e.category === cat);
                              if (catEntries.length === 0) return null;
                              return (
                                <div key={cat} style={{ marginBottom: '20px' }}>
                                  <h5 style={{ color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: '5px', marginTop: 0 }}>{cat} ({catEntries.length}/4)</h5>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
                                    {catEntries.map(entry => {
                                      const imageUrl = entry.drive_file_id ? `https://drive.google.com/thumbnail?id=${entry.drive_file_id}&sz=w800` : entry.file_url;
                                      return (
                                        <div key={entry.id} style={{ background: '#0f172a', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
                                          <img src={imageUrl} alt={entry.title} onClick={() => setFullscreenImage(imageUrl)} style={{ width: '100%', height: '120px', objectFit: 'cover', backgroundColor: '#1e293b', cursor: 'zoom-in' }} />
                                          <div style={{ padding: '10px' }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.title}</div>
                                            {!isEnded && <button onClick={() => handleDeleteEntry(entry.id)} style={{ width: '100%', background: '#ef444420', color: '#ef4444', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', marginTop: '10px' }}>Törlés</button>}
                                          </div>
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
    </GoogleOAuthProvider>
  );
}

export default App;
