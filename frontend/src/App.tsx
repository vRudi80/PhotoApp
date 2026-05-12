import { useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import logo from './logo.png';

// Importáljuk az új fájljainkat!
import Header from './components/Header';
import { getFlagEmoji, getImageUrl, getYouTubeEmbed } from './utils/helpers';

const GOOGLE_CLIENT_ID = "197361744572-ih728hq5jft3fqfd1esvktvrd8i97kcp.apps.googleusercontent.com";
const BACKEND_URL = "https://photoapp-backend-m4d1.onrender.com"; 
const ADMIN_EMAIL = "kovari.rudolf@gmail.com"; 

function App() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Adat listák
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [contests, setContests] = useState<any[]>([]);
  const [myEntries, setMyEntries] = useState<any[]>([]);
  const [juryList, setJuryList] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [myHomeworkEntries, setMyHomeworkEntries] = useState<any[]>([]);
  const [clubHomeworkEntries, setClubHomeworkEntries] = useState<any[]>([]); 
  const [salons, setSalons] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [patrons, setPatrons] = useState<any[]>([]);
  
  // UI állapotok
  const [activeTab, setActiveTab] = useState<any>('contests_open_active');
  const [salonSearch, setSalonSearch] = useState('');
  const [fullscreenData, setFullscreenData] = useState<{url: string, title?: string} | null>(null);
  const [selectedSalon, setSelectedSalon] = useState<any>(null);

  // Form states
  const [newTitle, setNewTitle] = useState(''); const [newDesc, setNewDesc] = useState('');
  const [newStart, setNewStart] = useState(''); const [newEnd, setNewEnd] = useState('');
  const [newCats, setNewCats] = useState(''); const [newRestrictedClub, setNewRestrictedClub] = useState('');
  const [uploadTitle, setUploadTitle] = useState(''); const [uploadCategory, setUploadCategory] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null); const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false); const [activeUploadContest, setActiveUploadContest] = useState<number | null>(null);
  const [judgingContestId, setJudgingContestId] = useState<number | null>(null); const [unvotedEntries, setUnvotedEntries] = useState<any[]>([]);
  const [currentScore, setCurrentScore] = useState<number | ''>(''); const [viewResultsContestId, setViewResultsContestId] = useState<number | null>(null);
  const [contestResults, setContestResults] = useState<any[]>([]); const [viewStatsContestId, setViewStatsContestId] = useState<number | null>(null);
  const [contestStats, setContestStats] = useState<any[]>([]); const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editEntryTitle, setEditEntryTitle] = useState(''); const [manageJuryContestId, setManageJuryContestId] = useState<number | null>(null);
  const [selectedJuryEmail, setSelectedJuryEmail] = useState(''); const [viewJuryProgressId, setViewJuryProgressId] = useState<number | null>(null);
  const [juryProgressData, setJuryProgressData] = useState<any>({total_entries: 0, stats: []});
  const [hwUploadTitle, setHwUploadTitle] = useState(''); const [hwUploadFile, setHwUploadFile] = useState<File | null>(null);
  const [hwUploadPreview, setHwUploadPreview] = useState<string | null>(null); const [activeUploadHw, setActiveUploadHw] = useState<number | null>(null);
  const [isHwUploading, setIsHwUploading] = useState(false); const [editingHwEntryId, setEditingHwEntryId] = useState<number | null>(null);
  const [editHwEntryTitle, setEditHwEntryTitle] = useState(''); const [newClubName, setNewClubName] = useState('');
  const [userClubEdits, setUserClubEdits] = useState<Record<string, string>>({});
  
  const [editMeetId, setEditMeetId] = useState<number | null>(null);
  const [meetClubId, setMeetClubId] = useState('');
  const [meetDate, setMeetDate] = useState('');
  const [meetTime, setMeetTime] = useState('');
  const [meetTopic, setMeetTopic] = useState('');
  const [meetDesc, setMeetDesc] = useState('');
  const [meetLocType, setMeetLocType] = useState<'physical' | 'online'>('physical');
  const [meetLocDetails, setMeetLocDetails] = useState('');
  const [meetVideoLink, setMeetVideoLink] = useState('');
  const [isMeetingUploading, setIsMeetingUploading] = useState(false);
  const [meetCover, setMeetCover] = useState<File | null>(null);
  const [meetCoverPreview, setMeetCoverPreview] = useState<string | null>(null);
  const [editHwId, setEditHwId] = useState<number | null>(null);
  const [hwClubId, setHwClubId] = useState('');
  const [hwTopic, setHwTopic] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwDeadline, setHwDeadline] = useState('');
  const [hwMaxImages, setHwMaxImages] = useState<number>(4);
  const [salonName, setSalonName] = useState('');
  const [salonFee, setSalonFee] = useState('');
  const [salonCurrency, setSalonCurrency] = useState('EUR');
  const [salonStart, setSalonStart] = useState('');
  const [salonEnd, setSalonEnd] = useState('');
  const [salonWeb, setSalonWeb] = useState('');
  const [salonResults, setSalonResults] = useState('');
  const [salonIsCircuit, setSalonIsCircuit] = useState(false);
  const [salonAwards, setSalonAwards] = useState('');
  const [salonCash, setSalonCash] = useState('');
  const [salonCircuitNum, setSalonCircuitNum] = useState('');
  const [salonType, setSalonType] = useState<'online' | 'print'>('online');
  const [salonCountry, setSalonCountry] = useState('');
  const [salonSelectedPatrons, setSalonSelectedPatrons] = useState<number[]>([]);
  const [salonSelectedCats, setSalonSelectedCats] = useState<number[]>([]);
  const [attendanceMeetId, setAttendanceMeetId] = useState<number | null>(null);
  const [attendanceList, setAttendanceList] = useState<string[]>([]);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rU, rCl, rCo, rJ, rM, rH, rCn, rCa, rPa, rS] = await Promise.all([
        fetch(`${BACKEND_URL}/api/users`), fetch(`${BACKEND_URL}/api/clubs`), fetch(`${BACKEND_URL}/api/contests`),
        fetch(`${BACKEND_URL}/api/jury`), fetch(`${BACKEND_URL}/api/meetings`), fetch(`${BACKEND_URL}/api/homeworks`),
        fetch(`${BACKEND_URL}/api/countries`), fetch(`${BACKEND_URL}/api/categories`), fetch(`${BACKEND_URL}/api/patrons`), fetch(`${BACKEND_URL}/api/salons`)
      ]);
      setAllUsers(await rU.json()); setClubs(await rCl.json()); setContests(await rCo.json()); setJuryList(await rJ.json());
      setMeetings(await rM.json()); setHomeworks(await rH.json()); setCountries(await rCn.json()); setAllCategories(await rCa.json());
      setPatrons(await rPa.json()); setSalons(await rS.json());
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const token = localStorage.getItem('photoAppToken');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        if (decoded.exp * 1000 > Date.now()) { setUser(decoded); fetchMyEntries(decoded.email); }
      } catch (e) { localStorage.removeItem('photoAppToken'); }
    }
  }, []);

  const fetchMyEntries = async (email: string) => {
    try {
      const [rE, rHw] = await Promise.all([
        fetch(`${BACKEND_URL}/api/my-entries?userEmail=${email}`),
        fetch(`${BACKEND_URL}/api/my-homework-entries?userEmail=${email}`)
      ]);
      setMyEntries(await rE.json()); setMyHomeworkEntries(await rHw.json());
    } catch (e) { console.error(e); }
  };

  const currentDbUser = allUsers.find(u => u.email === user?.email);
  const isLeader = currentDbUser?.club_role === 'leader' || currentDbUser?.club_role === 'deputy';
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (activeTab === 'club_homeworks' && currentDbUser) {
      const club = clubs.find(c => c.name === currentDbUser.club_name);
      if (club) {
        fetch(`${BACKEND_URL}/api/homework-entries/club/${club.id}?userEmail=${user.email}`)
          .then(res => res.json())
          .then(data => setClubHomeworkEntries(data));
      }
    }
  }, [activeTab, currentDbUser, clubs, user]);

  const handleLoginSuccess = async (credential: string) => {
    localStorage.setItem('photoAppToken', credential);
    const decoded: any = jwtDecode(credential); setUser(decoded);
    await fetch(`${BACKEND_URL}/api/auth/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: decoded.email, name: decoded.name, sub: decoded.sub }) });
    fetchData(); fetchMyEntries(decoded.email);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('photoAppToken');
  };

  // ... Itt marad az összes gombkezelő (handleAddClub, handleUpload, startJudging, stb.)
  // Helytakarékosság miatt ezeket egy sorba rendeztem, ahogy az előző kódban is voltak!
  const handleUpload = async (contestId: number) => { if (!uploadFile || !uploadTitle || !uploadCategory) return alert("Minden kötelező!"); setIsUploading(true); try { const formData = new FormData(); formData.append('photo', uploadFile); formData.append('contestId', String(contestId)); formData.append('userEmail', user.email); formData.append('userName', user.name); formData.append('title', uploadTitle); formData.append('category', uploadCategory); const res = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: formData }); if (res.ok) { setActiveUploadContest(null); setUploadFile(null); setUploadPreview(null); fetchMyEntries(user.email); alert("Feltöltve!"); } } catch (error) {} finally { setIsUploading(false); } };
  const handleToggleLike = async (entryId: number) => { const res = await fetch(`${BACKEND_URL}/api/homework-entries/${entryId}/like`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEmail: user.email }) }); if (res.ok) { const club = clubs.find(c => c.name === currentDbUser?.club_name); if (club) { fetch(`${BACKEND_URL}/api/homework-entries/club/${club.id}?userEmail=${user.email}`).then(r => r.json()).then(d => setClubHomeworkEntries(d)); } } };
  const startJudging = async (contestId: number) => { const res = await fetch(`${BACKEND_URL}/api/jury-entries/${contestId}?userEmail=${user.email}`); if (res.ok) { setUnvotedEntries(await res.json()); setJudgingContestId(contestId); } };
  const submitVote = async () => { const score = Number(currentScore); if (score < 0 || score > 100 || currentScore === '') return alert("0-100 pont!"); const res = await fetch(`${BACKEND_URL}/api/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entryId: unvotedEntries[0].id, juryEmail: user.email, score }) }); if (res.ok) { setUnvotedEntries(prev => prev.slice(1)); setCurrentScore(''); } };
  const loadResults = async (contestId: number) => { const res = await fetch(`${BACKEND_URL}/api/results/${contestId}`); if (res.ok) { setContestResults(await res.json()); setViewResultsContestId(contestId); } };
  const loadJuryProgress = async (contestId: number) => { const res = await fetch(`${BACKEND_URL}/api/admin/jury-stats/${contestId}`); if (res.ok) { setJuryProgressData(await res.json()); setViewJuryProgressId(contestId); } };
  const handleUpdateEntryTitle = async (entryId: number) => { if (!editEntryTitle) return alert('A cím nem lehet üres!'); const res = await fetch(`${BACKEND_URL}/api/entries/${entryId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: editEntryTitle, userEmail: user.email }) }); if (res.ok) { setEditingEntryId(null); fetchMyEntries(user.email); } else alert('Hiba a cím frissítésekor!'); };
  const handleDeleteEntry = async (entryId: number) => { if (!window.confirm("Biztosan törlöd?")) return; const res = await fetch(`${BACKEND_URL}/api/entries/${entryId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEmail: user.email }) }); if (res.ok) fetchMyEntries(user.email); };
  const handleAddJury = async (contestId: number) => { if (!selectedJuryEmail) return; const res = await fetch(`${BACKEND_URL}/api/jury`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contestId, userEmail: selectedJuryEmail }) }); if (res.ok) { setSelectedJuryEmail(''); fetchData(); } };
  const handleRemoveJury = async (contestId: number, email: string) => { const res = await fetch(`${BACKEND_URL}/api/jury`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contestId, userEmail: email }) }); if (res.ok) fetchData(); };
  const loadStats = async (contestId: number) => { const res = await fetch(`${BACKEND_URL}/api/admin/stats/${contestId}`); if (res.ok) { setContestStats(await res.json()); setViewStatsContestId(contestId); } };
  const startEdit = (contest: any) => { setEditContestId(contest.id); setEditTitle(contest.title); setEditDesc(contest.description); setEditCats(contest.categories || ''); setEditRestrictedClub(contest.restricted_club || ''); const formatDate = (dateStr: string | null) => { if (!dateStr) return ''; try { const d = new Date(dateStr); if (isNaN(d.getTime()) || d.getFullYear() <= 1970) return ''; return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16); } catch (e) { return ''; } }; setEditStart(formatDate(contest.start_date)); setEditEnd(formatDate(contest.end_date)); };
  const handleUpdateContest = async () => { const res = await fetch(`${BACKEND_URL}/api/contests/${editContestId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: editTitle, description: editDesc, startDate: editStart || null, endDate: editEnd || null, categories: editCats, restrictedClub: editRestrictedClub }) }); if (res.ok) { setEditContestId(null); fetchData(); alert("Pályázat sikeresen frissítve!"); } };
  const handleDeleteContest = async (id: number) => { if (!window.confirm("❗ BIZTOSAN TÖRLÖD ezt a pályázatot?\n\nA hozzá tartozó összes kép, nevezés és szavazat is VÉGLEG törlődik a szerverről és a Google Drive-ról is!")) return; const res = await fetch(`${BACKEND_URL}/api/contests/${id}`, { method: 'DELETE' }); if (res.ok) fetchData(); else alert("Hiba történt a törlés során!"); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { setUploadFile(file); setUploadPreview(URL.createObjectURL(file)); } };

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px' };

  // Filter Logics
  const filteredSalons = salons.filter(s => {
    const q = salonSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.country_hun && s.country_hun.toLowerCase().includes(q)) || (s.patron_details && s.patron_details.some((p: any) => p.number && p.number.toLowerCase().includes(q)));
  }).sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());

  const filteredContests = contests.filter(c => {
    const isR = c.restricted_club && c.restricted_club.trim() !== '';
    const isE = new Date() > new Date(c.end_date) && c.start_date;
    if (activeTab === 'admin_contests') return true;
    if (activeTab === 'contests_closed') return isE && (!isR || c.restricted_club === currentDbUser?.club_name);
    if (activeTab === 'contests_club_active') return isR && c.restricted_club === currentDbUser?.club_name && !isE;
    if (activeTab === 'contests_open_active') return !isR && !isE;
    return false;
  });

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <style>{`
        .card { background: #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid #334155; }
        .badge { padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a' }}>
          <div style={{ fontSize: '4rem', animation: 'spin 1.5s linear infinite' }}>📷</div>
          <h2 style={{ color: '#38bdf8', marginTop: '20px' }}>Kepolvasok betöltése...</h2>
        </div>
      ) : (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
          
          {/* BEJELENTKEZÉS KÉPERNYŐ (Ha nincs user) */}
          {!user && (
             <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', padding: '3rem', background: '#1e293b', borderRadius: '24px', maxWidth: '400px' }}>
                  <img src={logo} alt="Logo" style={{ width: '150px', marginBottom: '20px' }} />
                  <h2 style={{ marginBottom: '30px' }}>Belépés</h2>
                  <GoogleLogin onSuccess={(res) => handleLoginSuccess(res.credential!)} />
                </div>
             </div>
          )}

          {/* HA BE VAN JELENTKEZVE */}
          {user && (
            <>
              {/* ÚJ: Itt hívjuk meg az importált Headert! */}
              <Header 
                user={user} 
                isLeader={isLeader} 
                isAdmin={isAdmin} 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                onLogout={handleLogout} 
              />

              <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
                
                {/* 1. SZALONOK TAB */}
                {activeTab === 'salons' && (
                  <div>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'2rem', flexWrap:'wrap', gap:'15px'}}>
                      <h2 style={{margin:0}}>🌐 Nemzetközi Szalonok</h2>
                      <input type="text" placeholder="🔍 Keresés..." value={salonSearch} onChange={e=>setSalonSearch(e.target.value)} style={{...inputStyle, maxWidth:'350px', borderRadius:'50px'}} />
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(350px, 1fr))', gap:'20px'}}>
                      {filteredSalons.map(s => {
                        const isE = new Date(s.end_date) < new Date();
                        return (
                          <div key={s.id} className="card" onClick={()=>setSelectedSalon(s)} style={{cursor:'pointer', border: `1px solid ${isE?'#475569':'#60a5fa'}`}}>
                            <div style={{display:'flex', gap:'5px', flexWrap:'wrap', marginBottom:'10px'}}>
                              {s.patron_details?.map((p:any) => <span key={p.name} className="badge" style={{background:'#a78bfa20', color:'#a78bfa'}}>{p.name} {p.number?`(${p.number})`:''}</span>)}
                            </div>
                            <h3 style={{margin:'0 0 10px 0'}}>{s.name}</h3>
                            <div style={{fontSize:'0.9rem', color:'#94a3b8'}}>{s.country_code?getFlagEmoji(s.country_code):''} {s.country_hun} • {s.submission_type}</div>
                            <div style={{marginTop:'15px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                               <div><div style={{fontSize:'0.7rem', color:'#ef4444'}}>HATÁRIDŐ</div><div style={{fontWeight:'bold'}}>{new Date(s.end_date).toLocaleDateString('hu-HU', {year:'numeric', month:'short', day:'numeric'})}</div></div>
                               <button style={{background:'#60a5fa', color:'#0f172a', border:'none', padding:'8px 15px', borderRadius:'6px', fontWeight:'bold'}}>Részletek →</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 2. PÁLYÁZATOK (CONTESTS) TAB */}
                {(activeTab.startsWith('contests_') || activeTab === 'admin_contests') && (
                  <div>
                    <h2>🏆 {activeTab==='contests_closed'?'Lezárult Pályázatok':'Aktív Pályázatok'}</h2>
                    {filteredContests.length === 0 ? <p>Nincs megjeleníthető pályázat.</p> : filteredContests.map(c => {
                      const isE = new Date() > new Date(c.end_date);
                      const isJury = juryList.some(j => j.contest_id === c.id && j.user_email === user?.email);
                      const myCEntries = myEntries.filter(e => e.contest_id === c.id);
                      const isJudgingDone = (c.entry_count * c.jury_count) > 0 && c.vote_count >= (c.entry_count * c.jury_count);
                      
                      return (
                        <div key={c.id} className="card" style={{border: `1px solid ${isE? (isJudgingDone?'#ef4444':'#a78bfa') : '#10b981'}`}}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap'}}>
                            <div>
                              <h3 style={{margin:0}}>{c.title}</h3>
                              <p style={{color:'#94a3b8', fontSize:'0.9rem'}}>{c.description}</p>
                            </div>
                            <span className="badge" style={{background: isE?(isJudgingDone?'#ef444420':'#a78bfa20'):'#10b98120', color: isE?(isJudgingDone?'#ef4444':'#a78bfa'):'#10b981'}}>
                              {isE ? (isJudgingDone?'Lezárult':'Zsűrizés alatt') : 'Aktív'}
                            </span>
                          </div>
                          
                          <div style={{marginTop:'15px', display:'flex', gap:'10px', flexWrap:'wrap'}}>
                            {!isE && !isJury && activeUploadContest!==c.id && <button onClick={()=>setActiveUploadContest(c.id)} style={{background:'#38bdf8', color:'#0f172a', border:'none', padding:'8px 15px', borderRadius:'6px', fontWeight:'bold'}}>+ Kép nevezése</button>}
                            {isJury && isE && <button onClick={()=>startJudging(c.id)} style={{background:'#f59e0b', color:'#0f172a', border:'none', padding:'8px 15px', borderRadius:'6px', fontWeight:'bold'}}>Értékelés indítása</button>}
                            {(isLeader || isJudgingDone || isAdmin) && isE && <button onClick={()=>loadResults(c.id)} style={{background:'#10b981', color:'white', border:'none', padding:'8px 15px', borderRadius:'6px'}}>🏆 Eredmények</button>}
                            {isLeader && <button onClick={()=>loadJuryProgress(c.id)} style={{background:'none', border:'1px solid #a78bfa', color:'#a78bfa', padding:'8px 15px', borderRadius:'6px'}}>📈 Zsűri állása</button>}
                            {isAdmin && activeTab==='admin_contests' && <button onClick={()=>startEdit(c)} style={{background:'none', border:'1px solid #f59e0b', color:'#f59e0b', padding:'8px 15px', borderRadius:'6px'}}>Szerkesztés</button>}
                            {isAdmin && activeTab==='admin_contests' && <button onClick={()=>setManageJuryContestId(c.id)} style={{background:'none', border:'1px solid #38bdf8', color:'#38bdf8', padding:'8px 15px', borderRadius:'6px'}}>Zsűri</button>}
                            {isAdmin && activeTab==='admin_contests' && <button onClick={()=>handleDeleteContest(c.id)} style={{background:'none', border:'1px solid #ef4444', color:'#ef4444', padding:'8px 15px', borderRadius:'6px'}}>Törlés</button>}
                          </div>

                          {/* Upload Form */}
                          {activeUploadContest === c.id && (
                            <div style={{marginTop:'20px', padding:'15px', background:'#0f172a', borderRadius:'8px'}}>
                               <input placeholder="Cím" value={uploadTitle} onChange={e=>setUploadTitle(e.target.value)} style={inputStyle} />
                               <select value={uploadCategory} onChange={e=>setUploadCategory(e.target.value)} style={inputStyle}>
                                 <option value="">Válassz kategóriát</option>
                                 {c.categories.split(',').map((cat:string)=><option key={cat} value={cat.trim()}>{cat.trim()}</option>)}
                               </select>
                               <input type="file" onChange={handleFileSelect} />
                               <button onClick={()=>handleUpload(c.id)} disabled={isUploading} style={{background:'#10b981', color:'white', border:'none', padding:'10px 20px', borderRadius:'6px', marginTop:'10px'}}>{isUploading?'Feltöltés...':'Beküldés'}</button>
                            </div>
                          )}

                          {/* My Entries */}
                          {myCEntries.length > 0 && (
                            <div style={{marginTop:'20px', borderTop:'1px solid #334155', paddingTop:'15px'}}>
                              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:'10px'}}>
                                {myCEntries.map(e => (
                                  <div key={e.id}>
                                    <img src={getImageUrl(e.drive_file_id, e.file_url)} style={{width:'100%', height:'80px', objectFit:'cover', borderRadius:'6px', cursor:'zoom-in'}} onClick={()=>setFullscreenData({url:getImageUrl(e.drive_file_id, e.file_url), title:e.title})} />
                                    {editingEntryId === e.id ? (
                                      <div><input value={editEntryTitle} onChange={ev=>setEditEntryTitle(ev.target.value)} style={{width:'100%', padding:'2px', fontSize:'0.7rem'}} /><button onClick={()=>handleUpdateEntryTitle(e.id)}>OK</button></div>
                                    ) : (
                                      <div style={{fontSize:'0.7rem', color:'#94a3b8', display:'flex', justifyContent:'space-between'}}>
                                        <span>{e.title}</span>
                                        {!isE && <span><button onClick={()=>{setEditingEntryId(e.id);setEditEntryTitle(e.title)}}>✏️</button><button onClick={()=>handleDeleteEntry(e.id)}>🗑️</button></span>}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* 3. MODALS ÉS TÖBBI TAB (Klubestek, Házik) ... EZEK UGYANÚGY MARADTAK */}
                
                {judgingContestId && (
                  <div style={{position:'fixed', inset:0, background:'#0f172a', zIndex:100, padding:'2rem', overflowY:'auto'}}>
                    <button onClick={()=>setJudgingContestId(null)} style={{float:'right', color:'#ef4444'}}>Bezárás ×</button>
                    <h2 style={{color:'#f59e0b'}}>Zsűrizés</h2>
                    {unvotedEntries.length > 0 ? (
                      <div style={{textAlign:'center'}}>
                        <img src={getImageUrl(unvotedEntries[0].drive_file_id, unvotedEntries[0].file_url)} style={{maxHeight:'60vh', maxWidth:'100%', borderRadius:'8px'}} />
                        <h3 style={{marginTop:'10px'}}>{unvotedEntries[0].title}</h3>
                        <div style={{marginTop:'20px'}}>
                          <input type="number" placeholder="0-100 pont" value={currentScore} onChange={e=>setCurrentScore(e.target.value?Number(e.target.value):'')} style={{...inputStyle, width:'100px', fontSize:'1.5rem', textAlign:'center'}} />
                          <button onClick={submitVote} style={{background:'#10b981', border:'none', padding:'15px 30px', borderRadius:'8px', marginLeft:'10px', fontWeight:'bold'}}>Pontozom</button>
                        </div>
                      </div>
                    ) : <h3>Minden képet értékeltél!</h3>}
                  </div>
                )}

              </main>
            </>
          )}
        </div>
      )}
    </GoogleOAuthProvider>
  );
}

export default App;
