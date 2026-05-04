import { useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
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
  const [meetings, setMeetings] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'contests_open' | 'contests_club' | 'club_nights' | 'club_homeworks' | 'admin_contests' | 'admin_users' | 'admin_clubs' | 'admin_meetings'>('contests_open');
  const [dropdownOpen, setDropdownOpen] = useState<'contests' | 'club' | 'admin' | null>(null);
  
  const [userClubEdits, setUserClubEdits] = useState<Record<string, string>>({});
  const [userRoleEdits, setUserRoleEdits] = useState<Record<string, string>>({});
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

  // --- KLUBEST ÁLLAPOTOK ---
  const [editMeetId, setEditMeetId] = useState<number | null>(null);
  const [meetClubId, setMeetClubId] = useState('');
  const [meetDate, setMeetDate] = useState('');
  const [meetTime, setMeetTime] = useState('');
  const [meetTopic, setMeetTopic] = useState('');
  const [meetDesc, setMeetDesc] = useState('');
  const [meetLocType, setMeetLocType] = useState<'physical' | 'online'>('physical');
  const [meetLocDetails, setMeetLocDetails] = useState('');
  const [meetVideoLink, setMeetVideoLink] = useState(''); 
  const [meetCover, setMeetCover] = useState<File | null>(null);
  const [meetCoverPreview, setMeetCoverPreview] = useState<string | null>(null);
  const [isMeetingUploading, setIsMeetingUploading] = useState(false);
  const [meetingSearch, setMeetingSearch] = useState(''); // ÚJ: Kereső állapota

  // --- JELENLÉTI ÍV ÉS VIDEÓ ÁLLAPOTOK ---
  const [attendanceMeetId, setAttendanceMeetId] = useState<number | null>(null);
  const [attendanceList, setAttendanceList] = useState<string[]>([]);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

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
      const resMeetings = await fetch(`${BACKEND_URL}/api/meetings`);
      if (resMeetings.ok) setMeetings(await resMeetings.json());
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

  const currentDbUser = allUsers.find(u => u.email === user?.email);
  const isLeader = currentDbUser?.club_role === 'leader' || currentDbUser?.club_role === 'deputy';

  const handleAddClub = async () => { if (!newClubName) return; const res = await fetch(`${BACKEND_URL}/api/clubs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newClubName }) }); if (res.ok) { setNewClubName(''); fetchData(); } };
  const handleDeleteClub = async (id: number) => { if (!window.confirm("Biztosan törlöd ezt a klubot?")) return; const res = await fetch(`${BACKEND_URL}/api/clubs/${id}`, { method: 'DELETE' }); if (res.ok) fetchData(); };
  
  const saveUserClub = async (email: string) => { 
    const clubName = userClubEdits[email] !== undefined ? userClubEdits[email] : (allUsers.find(u => u.email === email)?.club_name || ''); 
    const clubRole = userRoleEdits[email] !== undefined ? userRoleEdits[email] : (allUsers.find(u => u.email === email)?.club_role || 'member');
    const res = await fetch(`${BACKEND_URL}/api/users/${email}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clubName, clubRole }) }); 
    if (res.ok) { alert("Sikeres mentés!"); fetchData(); } 
  };
  
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

  const handleMeetingCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setMeetCover(file); setMeetCoverPreview(URL.createObjectURL(file)); }
  };

  const startEditMeeting = (m: any) => {
    setEditMeetId(m.id);
    setMeetClubId(m.club_id.toString());
    setMeetDate(m.meeting_date.split('T')[0]);
    setMeetTime(m.meeting_time.substring(0, 5));
    setMeetTopic(m.topic);
    setMeetDesc(m.description || '');
    setMeetLocType(m.location_type);
    setMeetLocDetails(m.location_details || '');
    setMeetVideoLink(m.video_link || '');
    setMeetCover(null);
    setMeetCoverPreview(null);
  };

  const clearMeetingForm = () => {
    setEditMeetId(null); setMeetClubId(''); setMeetDate(''); setMeetTime(''); setMeetTopic(''); setMeetDesc(''); setMeetLocDetails(''); setMeetVideoLink(''); setMeetCover(null); setMeetCoverPreview(null);
  };

  const handleSaveMeeting = async () => {
    const finalClubId = user.email !== ADMIN_EMAIL ? clubs.find(c => c.name === currentDbUser?.club_name)?.id : meetClubId;
    if (!finalClubId || !meetDate || !meetTime || !meetTopic) return alert("Klub, Dátum, Időpont és Téma kötelező!");
    
    setIsMeetingUploading(true);
    try {
      const formData = new FormData();
      formData.append('clubId', finalClubId.toString());
      formData.append('date', meetDate);
      formData.append('time', meetTime);
      formData.append('topic', meetTopic);
      formData.append('description', meetDesc);
      formData.append('locationType', meetLocType);
      formData.append('locationDetails', meetLocDetails);
      formData.append('videoLink', meetVideoLink);
      if (meetCover) formData.append('coverPhoto', meetCover);

      const url = editMeetId ? `${BACKEND_URL}/api/meetings/${editMeetId}` : `${BACKEND_URL}/api/meetings`;
      const method = editMeetId ? 'PUT' : 'POST';

      const res = await fetch(url, { method, body: formData });
      if (res.ok) { 
        alert(editMeetId ? "Klubest frissítve!" : "Klubest sikeresen létrehozva!"); 
        clearMeetingForm();
        fetchData(); 
      } else { 
        const err = await res.json(); alert(`Hiba: ${err.error}`); 
      }
    } catch (error) { alert("Hálózati hiba!"); } finally { setIsMeetingUploading(false); }
  };

  const handleDeleteMeeting = async (id: number) => {
    if (!window.confirm("Biztosan törlöd ezt a klubestet?")) return;
    const res = await fetch(`${BACKEND_URL}/api/meetings/${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
  };

  const openAttendance = async (meetId: number) => {
    setAttendanceMeetId(meetId);
    const res = await fetch(`${BACKEND_URL}/api/attendance/${meetId}`);
    if (res.ok) setAttendanceList(await res.json());
  };

  const toggleAttendance = (email: string) => {
    setAttendanceList(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  };

  const saveAttendance = async () => {
    if (!attendanceMeetId) return;
    const res = await fetch(`${BACKEND_URL}/api/attendance/${attendanceMeetId}`, { 
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emails: attendanceList }) 
    });
    if (res.ok) { alert("Jelenléti ív mentve!"); setAttendanceMeetId(null); }
  };

  const getYouTubeEmbed = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };
  const navBtnStyle = { background: 'transparent', color: '#f8fafc', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '5px' };
  const dropdownStyle = { position: 'absolute' as const, top: '100%', left: 0, marginTop: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', minWidth: '220px', display: 'flex', flexDirection: 'column' as const };
  const dropItemStyle = { background: 'transparent', color: '#cbd5e1', border: 'none', padding: '12px 15px', textAlign: 'left' as const, cursor: 'pointer', width: '100%', borderBottom: '1px solid #334155', fontSize: '0.95rem' };

  const filteredContests = contests.filter(contest => {
    const isRestricted = contest.restricted_club && contest.restricted_club.trim() !== '';
    if (activeTab === 'contests_club') return isRestricted && contest.restricted_club === currentDbUser?.club_name;
    if (activeTab === 'contests_open') return !isRestricted;
    if (activeTab === 'admin_contests') return true; 
    return false;
  });

  const myClubMeetings = meetings.filter(m => m.club_name === currentDbUser?.club_name);
  
  // ÚJ: Keresés alapján szűrt klubestek (Téma vagy Leírás)
  const searchedMeetings = myClubMeetings.filter(m => {
    if (!meetingSearch) return true;
    const q = meetingSearch.toLowerCase();
    return m.topic.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q));
  });

  const adminMeetings = user?.email === ADMIN_EMAIL ? meetings : meetings.filter(m => m.club_name === currentDbUser?.club_name);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {/* SÖTÉT GÖRGETŐSÁV STÍLUSOK (Hogy szép legyen a kártyák belseje és a konténer is) */}
      <style>{`
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); border-radius: 8px; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 8px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>

      {fullscreenImage && (
        <div onClick={() => setFullscreenImage(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out' }}>
          <img src={fullscreenImage} alt="Teljes képernyő" style={{ maxHeight: '95vh', maxWidth: '95vw', objectFit: 'contain' }} />
          <div style={{ position: 'absolute', top: '20px', right: '30px', color: 'white', fontSize: '2rem', fontWeight: 'bold' }}>×</div>
        </div>
      )}

      {activeVideo && (
        <div onClick={() => setActiveVideo(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ position: 'absolute', top: '20px', right: '30px', color: 'white', fontSize: '2rem', cursor: 'pointer', fontWeight: 'bold' }}>×</div>
          <iframe 
            width="900" 
            height="500" 
            style={{ maxWidth: '95vw', maxHeight: '90vh', border: 'none', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }} 
            src={getYouTubeEmbed(activeVideo)} 
            allow="autoplay; encrypted-media; picture-in-picture" 
            allowFullScreen>
          </iframe>
        </div>
      )}

      {!user ? (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', backgroundColor: '#0f172a',
          backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.98)), url("https://images.unsplash.com/photo-1452860606245-08befc0ff44b?q=80&w=2070&auto=format&fit=crop")',
          backgroundSize: 'cover', backgroundPosition: 'center', fontFamily: 'Inter, sans-serif', overflow: 'hidden', padding: '2rem 1rem'
        }}>
          <div style={{ position: 'absolute', top: '10%', left: '15%', width: '400px', height: '400px', background: '#00a693', filter: 'blur(150px)', opacity: 0.15, borderRadius: '50%' }}></div>
          <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: '400px', height: '400px', background: '#d32f2f', filter: 'blur(150px)', opacity: 0.15, borderRadius: '50%' }}></div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4rem', maxWidth: '1100px', width: '100%', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            
            <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
              <img src={logo} alt="Képolvasók Fotóklub" style={{ width: '100%', maxWidth: '220px', marginBottom: '1rem', filter: 'drop-shadow(0px 0px 10px rgba(255,255,255,0.3))' }} />
              
              <h1 style={{ fontSize: '2.5rem', margin: 0, color: '#f8fafc', lineHeight: '1.2', fontWeight: 800 }}>
                Fotóklub és Fotópályázat <br/>
                <span style={{ background: 'linear-gradient(to right, #38bdf8, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Kezelő Rendszer</span>
              </h1>
              <p style={{ fontSize: '1.1rem', color: '#cbd5e1', marginBottom: '1rem', lineHeight: '1.6' }}>Minden egy helyen: szervezd a fotóklubod eseményeit, indíts házi feladatokat és bonyolíts le profi fotópályázatokat egyszerűen.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', transition: 'transform 0.2s', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.transform='translateX(10px)'} onMouseOut={e => e.currentTarget.style.transform='none'}>
                  <div style={{ fontSize: '2.5rem' }}>📅</div>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1.2rem' }}>Aktív Klubélet</h3>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5' }}>Szervezz klubesteket, oszd meg a helyszíneket és írj ki házi feladatokat a tagoknak.</p>
                  </div>
                </div>
                
                <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', transition: 'transform 0.2s', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.transform='translateX(10px)'} onMouseOut={e => e.currentTarget.style.transform='none'}>
                  <div style={{ fontSize: '2.5rem' }}>🏆</div>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1.2rem' }}>Profi Pályázatkezelés</h3>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5' }}>Hozz létre zártkörű vagy nyílt versenyeket, és fogadd a nevezéseket kategóriánként.</p>
                  </div>
                </div>

                <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', transition: 'transform 0.2s', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.transform='translateX(10px)'} onMouseOut={e => e.currentTarget.style.transform='none'}>
                  <div style={{ fontSize: '2.5rem' }}>⚖️</div>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1.2rem' }}>Objektív Zsűrizés</h3>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5' }}>Vond be a zsűritagokat a kényelmes pontozási felületen, és fedezd fel a végeredményt.</p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ flex: '1 1 350px', maxWidth: '450px', width: '100%' }}>
              <div style={{
                background: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                padding: '3rem 2.5rem', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center'
              }}>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#f8fafc', fontWeight: '800' }}>Lépj be és Csatlakozz!</h2>
                <p style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: '2.5rem', lineHeight: '1.6' }}>A belépéshez nincs szükség külön regisztrációra, csak használd a meglévő Google fiókodat biztonságosan.</p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
                  <div style={{ padding: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <GoogleLogin onSuccess={(res) => handleLoginSuccess(res.credential!)} shape="pill" size="large" theme="filled_black" text="continue_with" />
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>Biztonságos belépés Google fiókkal</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
          
          <header style={{ padding: '1.2rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', position: 'sticky', top: 0, zIndex: 30 }}>
            {dropdownOpen && <div onClick={() => setDropdownOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />}

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ position: 'relative', zIndex: 50 }}>
                <button onClick={() => setDropdownOpen(dropdownOpen === 'contests' ? null : 'contests')} style={{...navBtnStyle, background: dropdownOpen === 'contests' || activeTab.startsWith('contests_') ? '#334155' : 'transparent'}}>
                  Pályázatok ▾
                </button>
                {dropdownOpen === 'contests' && (
                  <div style={dropdownStyle}>
                    <button onClick={() => { setActiveTab('contests_club'); setDropdownOpen(null); }} style={{...dropItemStyle, color: activeTab === 'contests_club' ? '#38bdf8' : '#cbd5e1'}}>Klubom pályázatai</button>
                    <button onClick={() => { setActiveTab('contests_open'); setDropdownOpen(null); }} style={{...dropItemStyle, borderBottom: 'none', color: activeTab === 'contests_open' ? '#38bdf8' : '#cbd5e1'}}>Nyílt pályázatok</button>
                  </div>
                )}
              </div>

              <div style={{ position: 'relative', zIndex: 50 }}>
                <button onClick={() => setDropdownOpen(dropdownOpen === 'club' ? null : 'club')} style={{...navBtnStyle, background: dropdownOpen === 'club' || activeTab.startsWith('club_') ? '#334155' : 'transparent'}}>
                  Saját klubom ▾
                </button>
                {dropdownOpen === 'club' && (
                  <div style={dropdownStyle}>
                    <button onClick={() => { setActiveTab('club_nights'); setDropdownOpen(null); }} style={{...dropItemStyle, color: activeTab === 'club_nights' ? '#38bdf8' : '#cbd5e1'}}>Klubestek</button>
                    <button onClick={() => { setActiveTab('club_homeworks'); setDropdownOpen(null); }} style={{...dropItemStyle, borderBottom: 'none', color: activeTab === 'club_homeworks' ? '#38bdf8' : '#cbd5e1'}}>Házi feladatok</button>
                  </div>
                )}
              </div>

              {(user?.email === ADMIN_EMAIL || isLeader) && (
                <div style={{ position: 'relative', zIndex: 50 }}>
                  <button onClick={() => setDropdownOpen(dropdownOpen === 'admin' ? null : 'admin')} style={{...navBtnStyle, color: '#f59e0b', background: dropdownOpen === 'admin' || activeTab.startsWith('admin_') ? '#334155' : 'transparent'}}>
                    ⚙️ Adminisztráció ▾
                  </button>
                  {dropdownOpen === 'admin' && (
                    <div style={dropdownStyle}>
                      {user?.email === ADMIN_EMAIL && <button onClick={() => { setActiveTab('admin_contests'); setDropdownOpen(null); }} style={{...dropItemStyle, color: activeTab === 'admin_contests' ? '#f59e0b' : '#cbd5e1'}}>Pályázatok kezelése</button>}
                      <button onClick={() => { setActiveTab('admin_meetings'); setDropdownOpen(null); }} style={{...dropItemStyle, color: activeTab === 'admin_meetings' ? '#f59e0b' : '#cbd5e1'}}>Klubestek kezelése</button>
                      {user?.email === ADMIN_EMAIL && <button onClick={() => { setActiveTab('admin_users'); setDropdownOpen(null); }} style={{...dropItemStyle, color: activeTab === 'admin_users' ? '#f59e0b' : '#cbd5e1'}}>Felhasználók</button>}
                      {user?.email === ADMIN_EMAIL && <button onClick={() => { setActiveTab('admin_clubs'); setDropdownOpen(null); }} style={{...dropItemStyle, borderBottom: 'none', color: activeTab === 'admin_clubs' ? '#f59e0b' : '#cbd5e1'}}>Fotóklubok</button>}
                    </div>
                  )}
                </div>
              )}
            </div> 

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontWeight: 500, color: '#94a3b8' }}>
                {user.name} 
                {isLeader && <span style={{fontSize:'0.7rem', background:'#f59e0b20', color:'#f59e0b', padding:'2px 6px', borderRadius:'4px', marginLeft:'8px'}}>Vezetőség</span>}
              </span>
              <button onClick={() => { googleLogout(); localStorage.removeItem('photoAppToken'); setUser(null); }} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Kijelentkezés</button>
            </div>
          </header>

          <main style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
            
            {activeTab === 'admin_clubs' && user.email === ADMIN_EMAIL && (
               <div>
                 <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b' }}>🏷️ Fotóklubok Kezelése</h2>
                 <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #334155', display: 'flex', gap: '10px' }}>
                    <input placeholder="Új fotóklub neve..." value={newClubName} onChange={e => setNewClubName(e.target.value)} style={{...inputStyle, marginBottom: 0}} />
                    <button onClick={handleAddClub} style={{ background: '#10b981', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Hozzáadás</button>
                 </div>
                 <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
                   {clubs.map((c, index) => (
                     <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: index < clubs.length - 1 ? '1px solid #334155' : 'none', background: index % 2 === 0 ? '#0f172a' : 'transparent' }}>
                       <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{c.name}</div>
                       <button onClick={() => handleDeleteClub(c.id)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>Törlés</button>
                     </div>
                   ))}
                 </div>
               </div>
            )}

            {activeTab === 'admin_users' && user.email === ADMIN_EMAIL && (
              <div>
                 <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b' }}>👥 Felhasználók és Szerepkörök</h2>
                 <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
                   {allUsers.map((u, index) => (
                     <div key={u.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: index < allUsers.length - 1 ? '1px solid #334155' : 'none', background: index % 2 === 0 ? '#0f172a' : 'transparent' }}>
                       <div>
                         <div style={{ fontWeight: 'bold' }}>{u.name}</div>
                         <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{u.email}</div>
                       </div>
                       <div style={{ display: 'flex', gap: '10px' }}>
                         <select value={userClubEdits[u.email] !== undefined ? userClubEdits[u.email] : (u.club_name || '')} onChange={e => setUserClubEdits({...userClubEdits, [u.email]: e.target.value})} style={{ padding: '8px', borderRadius: '6px', background: '#1e293b', border: '1px solid #475569', color: 'white', width: '200px' }}>
                           <option value="">-- Nincs klubja --</option>
                           {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                         </select>
                         <select value={userRoleEdits[u.email] !== undefined ? userRoleEdits[u.email] : (u.club_role || 'member')} onChange={e => setUserRoleEdits({...userRoleEdits, [u.email]: e.target.value})} style={{ padding: '8px', borderRadius: '6px', background: '#1e293b', border: '1px solid #475569', color: 'white', width: '150px' }}>
                           <option value="member">Klubtag</option>
                           <option value="leader">Klubvezető</option>
                           <option value="deputy">Vezető helyettes</option>
                         </select>
                         <button onClick={() => saveUserClub(u.email)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>Mentés</button>
                       </div>
                     </div>
                   ))}
                 </div>
              </div>
            )}

            {activeTab === 'admin_meetings' && (user.email === ADMIN_EMAIL || isLeader) && (
              <div>
                <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b' }}>📅 Klubestek Kezelése</h2>
                
                {attendanceMeetId ? (
                  <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '12px', border: '1px solid #38bdf8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0, color: '#38bdf8' }}>✅ Jelenléti ív</h3>
                      <button onClick={() => setAttendanceMeetId(null)} style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #475569', padding: '5px 15px', borderRadius: '6px', cursor: 'pointer' }}>Bezár</button>
                    </div>
                    {(() => {
                      const meet = meetings.find(m => m.id === attendanceMeetId);
                      const clubUsers = allUsers.filter(u => u.club_name === meet?.club_name);
                      return (
                        <>
                          {clubUsers.length === 0 ? <p>Nincsenek tagok ebben a klubban.</p> : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                              {clubUsers.map(u => (
                                <label key={u.email} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#0f172a', padding: '10px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #334155' }}>
                                  <input type="checkbox" checked={attendanceList.includes(u.email)} onChange={() => toggleAttendance(u.email)} style={{ width: '20px', height: '20px' }} />
                                  <span>{u.name}</span>
                                </label>
                              ))}
                            </div>
                          )}
                          <button onClick={saveAttendance} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Jelenlét Mentése</button>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <>
                    <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #f59e0b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0, color: '#f59e0b' }}>{editMeetId ? '✏️ Klubest Szerkesztése' : '➕ Új Klubest Meghirdetése'}</h3>
                        {editMeetId && <button onClick={clearMeetingForm} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}>Mégse / Új létrehozása</button>}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {user.email === ADMIN_EMAIL ? (
                          <div style={{flex: 2}}>
                            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Melyik klubnak?</label>
                            <select value={meetClubId} onChange={e => setMeetClubId(e.target.value)} style={inputStyle}>
                              <option value="">-- Válassz Klubot --</option>
                              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                        ) : (
                          <div style={{flex: 2}}>
                            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Klub</label>
                            <div style={{...inputStyle, background: '#334155', color: '#94a3b8'}}>{currentDbUser?.club_name}</div>
                          </div>
                        )}
                        
                        <div style={{flex: 1}}>
                          <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Dátum</label>
                          <input type="date" value={meetDate} onChange={e => setMeetDate(e.target.value)} style={inputStyle} />
                        </div>
                        <div style={{flex: 1}}>
                          <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Időpont</label>
                          <input type="time" value={meetTime} onChange={e => setMeetTime(e.target.value)} style={inputStyle} />
                        </div>
                      </div>

                      <input placeholder="Klubest Témája (pl.: Portréfotózás alapjai)" value={meetTopic} onChange={e => setMeetTopic(e.target.value)} style={inputStyle} />
                      <textarea placeholder="Részletes leírás, program..." value={meetDesc} onChange={e => setMeetDesc(e.target.value)} style={{...inputStyle, minHeight: '80px'}} />
                      
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{flex: 1}}>
                          <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Helyszín típusa</label>
                          <select value={meetLocType} onChange={e => setMeetLocType(e.target.value as any)} style={inputStyle}>
                            <option value="physical">Fizikai Helyszín</option>
                            <option value="online">Online Link</option>
                          </select>
                        </div>
                        <div style={{flex: 2}}>
                          <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Cím vagy Csatlakozási Link</label>
                          <input placeholder={meetLocType === 'online' ? "https://meet..." : "1051 Budapest..."} value={meetLocDetails} onChange={e => setMeetLocDetails(e.target.value)} style={inputStyle} />
                        </div>
                      </div>

                      <div style={{ marginBottom: '15px' }}>
                        <label style={{fontSize:'0.8rem', color:'#ef4444', fontWeight: 'bold'}}>🎥 YouTube Videó Link (Visszanézéshez - Opcionális)</label>
                        <input placeholder="https://www.youtube.com/watch?v=..." value={meetVideoLink} onChange={e => setMeetVideoLink(e.target.value)} style={{...inputStyle, border: '1px solid #ef444450'}} />
                      </div>

                      <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Opcionális borítókép</label>
                      <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleMeetingCoverSelect} style={{ color: '#94a3b8', marginBottom: '15px', width: '100%' }} disabled={isMeetingUploading} />
                      {meetCoverPreview && <div style={{marginTop: '10px', marginBottom: '20px'}}><img src={meetCoverPreview} alt="Előnézet" style={{maxHeight: '150px', borderRadius: '8px', border: '1px solid #334155'}} /></div>}

                      <button onClick={handleSaveMeeting} disabled={isMeetingUploading} style={{ background: isMeetingUploading ? '#475569' : '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: isMeetingUploading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                        {isMeetingUploading ? 'Mentés folyamatban...' : editMeetId ? 'Klubest Frissítése' : 'Klubest Létrehozása'}
                      </button>
                    </div>

                    <h3 style={{ color: '#f8fafc' }}>Rögzített Klubestek</h3>
                    <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
                      {adminMeetings.length === 0 ? <div style={{padding: '20px', color: '#94a3b8', textAlign: 'center'}}>Nincs megjeleníthető klubest.</div> : null}
                      {adminMeetings.map((m, i) => (
                        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: i < adminMeetings.length - 1 ? '1px solid #334155' : 'none', background: i % 2 === 0 ? '#0f172a' : 'transparent' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#38bdf8' }}>{new Date(m.meeting_date).toLocaleDateString()} {m.meeting_time.substring(0,5)} - {m.topic}</div>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                              Klub: {m.club_name} 
                              {m.video_link && <span style={{ color: '#ef4444', marginLeft: '10px' }}>▶️ Van videó</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button onClick={() => openAttendance(m.id)} style={{ background: '#38bdf820', color: '#38bdf8', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Jelenlét</button>
                            <button onClick={() => startEditMeeting(m)} style={{ background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>Szerkeszt</button>
                            <button onClick={() => handleDeleteMeeting(m.id)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>Töröl</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* --- KLUBESTEK (FELHASZNÁLÓI NÉZET - KERESŐVEL ÉS GÖRGETÉSSEL) --- */}
            {activeTab === 'club_nights' && (
              <div>
                {!currentDbUser?.club_name ? (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
                    <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>Nem vagy klubhoz rendelve</h2>
                    <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>A klubod eseményeinek megtekintéséhez kérjük, vedd fel a kapcsolatot egy adminisztrátorral.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
                      <h2 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '2.5rem' }}>📅</span> Klubestek: {currentDbUser.club_name}
                      </h2>
                      {/* ÚJ: Keresőmező */}
                      <input 
                        type="text" 
                        placeholder="🔍 Keresés téma vagy leírás alapján..." 
                        value={meetingSearch} 
                        onChange={e => setMeetingSearch(e.target.value)} 
                        style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: 'white', minWidth: '280px', outline: 'none' }} 
                      />
                    </div>
                    
                    {searchedMeetings.length === 0 ? (
                      <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Nincs a keresésnek megfelelő klubest.</p>
                    ) : (
                      /* ÚJ: Görgethető külső konténer */
                      <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                          {searchedMeetings.map(meet => {
                            const meetDateObj = new Date(meet.meeting_date);
                            const isPast = meetDateObj < new Date(new Date().setHours(0,0,0,0));
                            
                            return (
                              /* ÚJ: Fix magasságú (450px) kártya */
                              <div key={meet.id} style={{ height: '450px', background: '#1e293b', borderRadius: '16px', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
                                
                                {/* Kártya Fejléc/Borítókép (Fix 180px) */}
                                <div style={{ height: '180px', flexShrink: 0, background: '#0f172a', position: 'relative' }}>
                                  {meet.drive_file_id || meet.file_url ? (
                                    <img src={meet.drive_file_id ? `https://lh3.googleusercontent.com/d/${meet.drive_file_id}` : meet.file_url} alt={meet.topic} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isPast ? 0.6 : 1 }} />
                                  ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#334155', fontSize: '4rem' }}>📷</div>
                                  )}
                                  
                                  <div style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(5px)', padding: '8px 12px', borderRadius: '8px', color: isPast ? '#94a3b8' : '#38bdf8', fontWeight: 'bold', border: `1px solid ${isPast ? '#334155' : '#38bdf850'}`, textAlign: 'center', lineHeight: '1.2' }}>
                                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>{meetDateObj.toLocaleDateString('hu-HU', { month: 'short' })}</div>
                                    <div style={{ fontSize: '1.5rem' }}>{meetDateObj.getDate()}</div>
                                  </div>

                                  {meet.video_link && (
                                    <div 
                                      onClick={() => setActiveVideo(meet.video_link)}
                                      style={{ position: 'absolute', bottom: '15px', right: '15px', background: '#ef4444', color: 'white', padding: '8px 15px', borderRadius: '100px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 4px 6px rgba(0,0,0,0.5)' }}
                                    >
                                      ▶️ Videó
                                    </div>
                                  )}
                                </div>

                                {/* Kártya Tartalom */}
                                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px', display: 'flex', gap: '15px', flexShrink: 0 }}>
                                    <span>⏰ {meet.meeting_time.substring(0,5)}</span>
                                    {isPast && <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Lezajlott</span>}
                                  </div>
                                  
                                  <h3 style={{ margin: '0 0 10px 0', color: isPast ? '#cbd5e1' : '#f8fafc', fontSize: '1.4rem', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {meet.topic}
                                  </h3>
                                  
                                  {/* ÚJ: Görgethető leírás box */}
                                  <div style={{ flex: 1, overflowY: 'auto', marginBottom: '15px', paddingRight: '5px' }}>
                                    <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                      {meet.description}
                                    </p>
                                  </div>

                                  {/* Alsó sáv */}
                                  <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                    <div style={{ fontSize: '1.5rem' }}>{meet.location_type === 'online' ? '💻' : '📍'}</div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>{meet.location_type === 'online' ? 'Online találkozó' : 'Fizikai helyszín'}</div>
                                      {meet.location_type === 'online' ? (
                                        <a href={meet.location_details} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Csatlakozás a híváshoz →</a>
                                      ) : (
                                        <div style={{ color: '#f8fafc', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meet.location_details || 'Helyszín később...'}</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* --- HÁZI FELADATOK --- */}
            {activeTab === 'club_homeworks' && (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                 <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📝</div>
                 <h2 style={{ color: '#38bdf8', margin: '0 0 10px 0' }}>Házi feladatok</h2>
                 <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Ez a modul fejlesztés alatt áll. Itt töltheted majd fel a klub által havi szinten kiírt feladatokat.</p>
              </div>
            )}

            {/* --- PÁLYÁZATOK --- */}
            {['contests_open', 'contests_club', 'admin_contests'].includes(activeTab) && (
              <>
                {activeTab === 'contests_club' && !currentDbUser?.club_name && (
                   <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                     <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
                     <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>Nem vagy klubhoz rendelve</h2>
                     <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>A klubod belső pályázatainak megtekintéséhez kérjük, vedd fel a kapcsolatot egy adminisztrátorral.</p>
                   </div>
                )}

                {!(activeTab === 'contests_club' && !currentDbUser?.club_name) && (
                  <>
                    {activeTab === 'admin_contests' && user.email === ADMIN_EMAIL && (
                      <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #f59e0b' }}>
                        <h3 style={{ marginTop: 0, color: '#f59e0b' }}>⚙️ Új Pályázat Létrehozása</h3>
                        <input placeholder="Pályázat címe" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={inputStyle} />
                        <textarea placeholder="Leírás" value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{...inputStyle, minHeight: '60px'}} />
                        <div style={{display: 'flex', gap: '10px'}}><div style={{flex: 1}}><label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Kezdés</label><input type="datetime-local" value={newStart} onChange={e => setNewStart(e.target.value)} style={inputStyle} /></div><div style={{flex: 1}}><label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Befejezés</label><input type="datetime-local" value={newEnd} onChange={e => setNewEnd(e.target.value)} style={inputStyle} /></div></div>
                        <input placeholder="Kategóriák (pl: Természet, Portré) - vesszővel elválasztva" value={newCats} onChange={e => setNewCats(e.target.value)} style={inputStyle} />
                        <select value={newRestrictedClub} onChange={e => setNewRestrictedClub(e.target.value)} style={{...inputStyle, border: '1px solid #f59e0b'}}>
                          <option value="">🔓 Nyilvános pályázat (Bárki nevezhet)</option>
                          {clubs.map(c => <option key={c.id} value={c.name}>🔒 Zártkörű: {c.name}</option>)}
                        </select>
                        <button onClick={handleCreateContest} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Létrehozás</button>
                      </div>
                    )}

                    <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>
                      {activeTab === 'admin_contests' ? 'Összes Pályázat (Admin)' : activeTab === 'contests_club' ? `Klubom Pályázatai (${currentDbUser?.club_name})` : 'Nyílt Fotópályázatok'}
                    </h2>
                    
                    {filteredContests.length === 0 ? (
                       <p style={{ color: '#94a3b8' }}>Jelenleg nincsenek aktív pályázatok ebben a kategóriában.</p>
                    ) : (
                      filteredContests.map(contest => {
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
                            
                            {contest.restricted_club && (
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
                                    <h3 style={{ margin: '0', color: '#10b981' }}>🏆 Végeredmény: {contest.title}</h3>
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
                                    <h3 style={{ margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: contest.restricted_club ? '10px' : '0' }}>
                                      {contest.title}
                                      
                                      {user.email === ADMIN_EMAIL && activeTab === 'admin_contests' && (
                                        <>
                                          <button onClick={() => loadStats(contest.id)} style={{ background: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>📊 Nevezők</button>
                                          <button onClick={() => startEdit(contest)} style={{ background: 'transparent', border: '1px solid #f59e0b', color: '#f59e0b', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>Szerkesztés</button>
                                          <button onClick={() => setManageJuryContestId(contest.id)} style={{ background: 'transparent', border: '1px solid #8b5cf6', color: '#8b5cf6', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>Zsűri ({contestJury.length})</button>
                                        </>
                                      )}
                                      {isEnded && <button onClick={() => loadResults(contest.id)} style={{ background: '#10b981', border: 'none', color: 'white', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>🏆 Eredmények</button>}
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
                      })
                    )}
                  </>
                )}
              </>
            )}
          </main>
        </div>
      )}
    </GoogleOAuthProvider>
  );
}

export default App;
