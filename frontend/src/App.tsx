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

  const fetchContests = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/contests`);
      if (res.ok) setContests(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchMyEntries = async (email: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/my-entries?userEmail=${email}`);
      if (res.ok) setMyEntries(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchContests(); }, []);

  const handleLoginSuccess = async (credential: string) => {
    const decoded: any = jwtDecode(credential);
    setUser(decoded);
    await fetch(`${BACKEND_URL}/api/auth/sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: decoded.email, name: decoded.name, sub: decoded.sub })
    });
    fetchMyEntries(decoded.email);
  };

  const handleCreateContest = async () => {
    if (!newTitle || !newStart || !newEnd || !newCats) return alert("Minden mezőt ki kell tölteni!");
    const res = await fetch(`${BACKEND_URL}/api/contests`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, description: newDesc, startDate: newStart, endDate: newEnd, categories: newCats })
    });
    if (res.ok) {
      setNewTitle(''); setNewDesc(''); setNewStart(''); setNewEnd(''); setNewCats('');
      fetchContests(); alert("Pályázat létrehozva!");
    }
  };

  const startEdit = (contest: any) => {
    setEditContestId(contest.id);
    setEditTitle(contest.title);
    setEditDesc(contest.description);
    setEditCats(contest.categories || '');
    setEditStart(contest.start_date ? new Date(new Date(contest.start_date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16) : '');
    setEditEnd(contest.end_date ? new Date(new Date(contest.end_date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16) : '');
  };

  const handleUpdateContest = async () => {
    const res = await fetch(`${BACKEND_URL}/api/contests/${editContestId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, description: editDesc, startDate: editStart, endDate: editEnd, categories: editCats })
    });
    if (res.ok) {
      setEditContestId(null); fetchContests(); alert("Pályázat sikeresen frissítve!");
    } else alert("Hiba a mentéskor!");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setUploadFile(file); setUploadPreview(URL.createObjectURL(file)); }
  };

  const handleUpload = async (contestId: number) => {
    if (!uploadFile || !uploadTitle || !uploadCategory) return alert("Cím, Kategória és Kép kötelező!");
    const formData = new FormData();
    formData.append('photo', uploadFile); formData.append('contestId', String(contestId));
    formData.append('userEmail', user.email); formData.append('userName', user.name);
    formData.append('title', uploadTitle); formData.append('category', uploadCategory);

    const res = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: formData });
    if (res.ok) {
      alert("Kép sikeresen feltöltve!");
      setActiveUploadContest(null); setUploadFile(null); setUploadPreview(null); setUploadTitle(''); setUploadCategory('');
      fetchMyEntries(user.email);
    } else { const err = await res.json(); alert(`Hiba: ${err.error}`); }
  };

  const handleDeleteEntry = async (entryId: number) => {
    if (!window.confirm("Biztosan törlöd ezt a képet?")) return;
    const res = await fetch(`${BACKEND_URL}/api/entries/${entryId}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEmail: user.email })
    });
    if (res.ok) { alert("Kép törölve!"); fetchMyEntries(user.email); }
  };

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
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
                  <h3 style={{ marginTop: 0, color: '#38bdf8' }}>⚙️ Új Pályázat Létrehozása</h3>
                  <input placeholder="Pályázat címe" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={inputStyle} />
                  <textarea placeholder="Leírás" value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{...inputStyle, minHeight: '60px'}} />
                  <div style={{display: 'flex', gap: '10px'}}>
                    <div style={{flex: 1}}><label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Kezdés</label><input type="datetime-local" value={newStart} onChange={e => setNewStart(e.target.value)} style={inputStyle} /></div>
                    <div style={{flex: 1}}><label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Befejezés</label><input type="datetime-local" value={newEnd} onChange={e => setNewEnd(e.target.value)} style={inputStyle} /></div>
                  </div>
                  <input placeholder="Kategóriák (pl: Természet, Portré)" value={newCats} onChange={e => setNewCats(e.target.value)} style={inputStyle} />
                  <button onClick={handleCreateContest} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Létrehozás</button>
                </div>
              )}

              <h2>Aktuális Fotópályázatok</h2>
              {contests.map(contest => {
                const now = new Date();
                const start = contest.start_date ? new Date(contest.start_date) : new Date(0);
                const end = contest.end_date ? new Date(contest.end_date) : new Date(0);
                const isActive = now >= start && now <= end;
                
                // Kategóriák letisztítása (szóközök levágása)
                const categories = contest.categories ? contest.categories.split(',').map((c:string) => c.trim()).filter(Boolean) : [];
                const myContestEntries = myEntries.filter(e => e.contest_id === contest.id);

                // Kategóriánkénti darabszám kiszámolása a legördülő menühöz
                const categoryCounts: Record<string, number> = {};
                categories.forEach((cat: string) => categoryCounts[cat] = 0);
                myContestEntries.forEach(entry => {
                  if (categoryCounts[entry.category] !== undefined) categoryCounts[entry.category]++;
                });

                return (
                  <div key={contest.id} style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: isActive ? '1px solid #10b981' : '1px solid #475569' }}>
                    {editContestId === contest.id ? (
                      <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px' }}>
                        <h4 style={{marginTop: 0, color: '#f59e0b'}}>Pályázat Szerkesztése</h4>
                        <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={inputStyle} />
                        <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{...inputStyle, minHeight: '60px'}} />
                        <div style={{display: 'flex', gap: '10px'}}>
                          <div style={{flex: 1}}><label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Kezdés</label><input type="datetime-local" value={editStart} onChange={e => setEditStart(e.target.value)} style={inputStyle} /></div>
                          <div style={{flex: 1}}><label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Befejezés</label><input type="datetime-local" value={editEnd} onChange={e => setEditEnd(e.target.value)} style={inputStyle} /></div>
                        </div>
                        <input value={editCats} onChange={e => setEditCats(e.target.value)} style={inputStyle} />
                        <div style={{display: 'flex', gap: '10px'}}>
                          <button onClick={handleUpdateContest} style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>Mentés</button>
                          <button onClick={() => setEditContestId(null)} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>Mégse</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h3 style={{ margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {contest.title}
                              {user.email === ADMIN_EMAIL && (
                                <button onClick={() => startEdit(contest)} style={{ background: 'transparent', border: '1px solid #f59e0b', color: '#f59e0b', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>Szerkesztés</button>
                              )}
                            </h3>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 15px 0' }}>{contest.description}</p>
                          </div>
                          <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', background: isActive ? '#10b98120' : '#ef444420', color: isActive ? '#10b981' : '#ef4444' }}>
                            {isActive ? 'Aktív Pályázat' : 'Lezárult'}
                          </span>
                        </div>
                        <p style={{fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 15px 0'}}>
                          📅 {start.getFullYear() > 1970 ? `${start.toLocaleDateString()} - ${end.toLocaleDateString()}` : 'Nincs dátum megadva'}
                        </p>

                        {isActive && activeUploadContest !== contest.id && (
                          <button onClick={() => { setActiveUploadContest(contest.id); setUploadCategory(''); }} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '15px' }}>
                            + Új Kép Nevezése
                          </button>
                        )}

                        {activeUploadContest === contest.id && (
                          <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                            <h4 style={{marginTop: 0, color: '#38bdf8'}}>Kép feltöltése</h4>
                            <input placeholder="Kép címe" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} style={inputStyle} />
                            
                            {/* KATEGÓRIA VÁLASZTÓ LÁTHATÓ LIMITTEL */}
                            <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} style={inputStyle}>
                              <option value="">-- Válassz kategóriát --</option>
                              {categories.map((cat: string) => {
                                const count = categoryCounts[cat] || 0;
                                return (
                                  <option key={cat} value={cat} disabled={count >= 4}>
                                    {cat} ({count}/4 feltöltve)
                                  </option>
                                );
                              })}
                            </select>

                            <input type="file" accept="image/*" onChange={handleFileSelect} style={{ color: '#94a3b8', marginBottom: '10px' }} />
                            {uploadPreview && (
                              <div style={{marginTop: '10px', marginBottom: '15px', textAlign: 'center'}}>
                                <img src={uploadPreview} alt="Előnézet" style={{maxHeight: '200px', borderRadius: '8px', border: '2px solid #334155'}} />
                              </div>
                            )}
                            <div style={{display: 'flex', gap: '10px'}}>
                              <button onClick={() => handleUpload(contest.id)} style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>Beküldés 🚀</button>
                              <button onClick={() => { setActiveUploadContest(null); setUploadPreview(null); }} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>Mégse</button>
                            </div>
                          </div>
                        )}

                        {/* GALÉRIA KATEGÓRIÁNKÉNT CSOPORTOSÍTVA */}
                        {myContestEntries.length > 0 && (
                          <div style={{ marginTop: '20px', borderTop: '1px solid #334155', paddingTop: '15px' }}>
                            <h4 style={{margin: '0 0 15px 0'}}>Saját Nevezéseid</h4>
                            
                            {categories.map((cat: string) => {
                              const catEntries = myContestEntries.filter(e => e.category === cat);
                              if (catEntries.length === 0) return null;
                              
                              return (
                                <div key={cat} style={{ marginBottom: '20px' }}>
                                  <h5 style={{ color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: '5px', marginTop: 0 }}>
                                    {cat} ({catEntries.length}/4)
                                  </h5>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
                                    {catEntries.map(entry => {
                                      const imageUrl = entry.drive_file_id ? `https://drive.google.com/uc?export=view&id=${entry.drive_file_id}` : entry.file_url;
                                      return (
                                        <div key={entry.id} style={{ background: '#0f172a', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
                                          <a href={entry.file_url} target="_blank" rel="noreferrer">
                                            <img src={imageUrl} alt={entry.title} style={{ width: '100%', height: '120px', objectFit: 'cover', backgroundColor: '#1e293b' }} />
                                          </a>
                                          <div style={{ padding: '10px' }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.title}</div>
                                            <button onClick={() => handleDeleteEntry(entry.id)} style={{ width: '100%', background: '#ef444420', color: '#ef4444', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', marginTop: '10px' }}>
                                              Törlés
                                            </button>
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
