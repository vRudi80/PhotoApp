import { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import { GOOGLE_CLIENT_ID, BACKEND_URL, ADMIN_EMAIL } from './utils/constants';
import { getFlagEmoji, getImageUrl, getYouTubeEmbed } from './utils/helpers';
import LoginScreen from './components/LoginScreen';
import { FullscreenModal, VideoModal } from './components/Modals';
import Header from './components/Header';
import SalonModal from './components/SalonModal';
import './App.css';

function App() {
  const [user, setUser] = useState<any>(null);
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
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [countries, setCountries] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [patrons, setPatrons] = useState<any[]>([]);
  
  const [salonName, setSalonName] = useState('');
  const [salonFee, setSalonFee] = useState('');
  const [salonSearch, setSalonSearch] = useState('');
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

  const [selectedSalon, setSelectedSalon] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'contests_open_active' | 'contests_club_active' | 'contests_closed' | 'club_nights' | 'club_homeworks' | 'salons' | 'admin_contests' | 'admin_users' | 'admin_clubs' | 'admin_meetings' | 'admin_homeworks' | 'admin_salons'>('contests_open_active');
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
  const [meetingSearch, setMeetingSearch] = useState(''); 

  const [editHwId, setEditHwId] = useState<number | null>(null);
  const [hwClubId, setHwClubId] = useState('');
  const [hwTopic, setHwTopic] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwDeadline, setHwDeadline] = useState('');
  const [hwMaxImages, setHwMaxImages] = useState<number>(4);
  
  const [activeUploadHw, setActiveUploadHw] = useState<number | null>(null);
  const [hwUploadFile, setHwUploadFile] = useState<File | null>(null);
  const [hwUploadPreview, setHwUploadPreview] = useState<string | null>(null);
  const [hwUploadTitle, setHwUploadTitle] = useState('');
  const [isHwUploading, setIsHwUploading] = useState(false);
  
  const [editingHwEntryId, setEditingHwEntryId] = useState<number | null>(null);
  const [editHwEntryTitle, setEditHwEntryTitle] = useState('');

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

  const [viewJuryProgressId, setViewJuryProgressId] = useState<number | null>(null);
  const [juryProgressData, setJuryProgressData] = useState<{total_entries: number, stats: any[]}>({total_entries: 0, stats: []});

  const [fullscreenData, setFullscreenData] = useState<{url: string, title?: string} | null>(null);

  const fetchData = async () => {
    setIsInitialLoading(true);
    try {
      const [
        resUsers, resClubs, resContests, resJury, resMeetings, 
        resHw, resCountries, resCats, resPatrons, resSalons
      ] = await Promise.all([
        fetch(`${BACKEND_URL}/api/users`),
        fetch(`${BACKEND_URL}/api/clubs`),
        fetch(`${BACKEND_URL}/api/contests`),
        fetch(`${BACKEND_URL}/api/jury`),
        fetch(`${BACKEND_URL}/api/meetings`),
        fetch(`${BACKEND_URL}/api/homeworks`),
        fetch(`${BACKEND_URL}/api/countries`),
        fetch(`${BACKEND_URL}/api/categories`),
        fetch(`${BACKEND_URL}/api/patrons`),
        fetch(`${BACKEND_URL}/api/salons`)
      ]);

      if (resUsers.ok) setAllUsers(await resUsers.json());
      if (resClubs.ok) setClubs(await resClubs.json());
      if (resContests.ok) setContests(await resContests.json());
      if (resJury.ok) setJuryList(await resJury.json());
      if (resMeetings.ok) setMeetings(await resMeetings.json());
      if (resHw.ok) setHomeworks(await resHw.json());
      if (resCountries.ok) setCountries(await resCountries.json());
      if (resCats.ok) setAllCategories(await resCats.json());
      if (resPatrons.ok) setPatrons(await resPatrons.json());
      if (resSalons.ok) setSalons(await resSalons.json());

    } catch (e) { 
      console.error("Hiba az adatok lekérésekor:", e); 
    } finally {
      setIsInitialLoading(false);
    }
  };
  
  const fetchMyEntries = async (email: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/my-entries?userEmail=${email}`);
      if (res.ok) setMyEntries(await res.json());
      const resHw = await fetch(`${BACKEND_URL}/api/my-homework-entries?userEmail=${email}`);
      if (resHw.ok) setMyHomeworkEntries(await resHw.json());
    } catch (e) { console.error(e); }
  };

  const fetchClubHomeworkEntries = async (clubId: number, email: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/homework-entries/club/${clubId}?userEmail=${email}`);
      if (res.ok) setClubHomeworkEntries(await res.json());
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
      } catch (e) { localStorage.removeItem('photoAppToken'); }
    }
  }, []);

  const currentDbUser = allUsers.find(u => u.email === user?.email);
  const isLeader = currentDbUser?.club_role === 'leader' || currentDbUser?.club_role === 'deputy';

  useEffect(() => {
    if (activeTab === 'club_homeworks' && currentDbUser) {
      const club = clubs.find(c => c.name === currentDbUser.club_name);
      if (club) fetchClubHomeworkEntries(club.id, user.email);
    }
  }, [activeTab, currentDbUser, clubs, user]);

  const handleLoginSuccess = async (credential: string) => {
    localStorage.setItem('photoAppToken', credential);
    const decoded: any = jwtDecode(credential);
    setUser(decoded);
    await fetch(`${BACKEND_URL}/api/auth/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: decoded.email, name: decoded.name, sub: decoded.sub }) });
    fetchData(); fetchMyEntries(decoded.email);
  };

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
  const handleDeleteContest = async (id: number) => { if (!window.confirm("❗ BIZTOSAN TÖRLÖD ezt a pályázatot?\n\nA hozzá tartozó összes kép, nevezés és szavazat is VÉGLEG törlődik a szerverről és a Google Drive-ról is!")) return; const res = await fetch(`${BACKEND_URL}/api/contests/${id}`, { method: 'DELETE' }); if (res.ok) fetchData(); else alert("Hiba történt a törlés során!"); };
  const loadJuryProgress = async (contestId: number) => { const res = await fetch(`${BACKEND_URL}/api/admin/jury-stats/${contestId}`); if (res.ok) { setJuryProgressData(await res.json()); setViewJuryProgressId(contestId); } };
  
  const handleMeetingCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { setMeetCover(file); setMeetCoverPreview(URL.createObjectURL(file)); } };
  const startEditMeeting = (m: any) => { setEditMeetId(m.id); setMeetClubId(m.club_id.toString()); setMeetDate(m.meeting_date.split('T')[0]); setMeetTime(m.meeting_time.substring(0, 5)); setMeetTopic(m.topic); setMeetDesc(m.description || ''); setMeetLocType(m.location_type); setMeetLocDetails(m.location_details || ''); setMeetVideoLink(m.video_link || ''); setMeetCover(null); setMeetCoverPreview(null); };
  const clearMeetingForm = () => { setEditMeetId(null); setMeetClubId(''); setMeetDate(''); setMeetTime(''); setMeetTopic(''); setMeetDesc(''); setMeetLocDetails(''); setMeetVideoLink(''); setMeetCover(null); setMeetCoverPreview(null); };
  const handleSaveMeeting = async () => { const finalClubId = user.email !== ADMIN_EMAIL ? clubs.find(c => c.name === currentDbUser?.club_name)?.id : meetClubId; if (!finalClubId || !meetDate || !meetTime || !meetTopic) return alert("Klub, Dátum, Időpont és Téma kötelező!"); setIsMeetingUploading(true); try { const formData = new FormData(); formData.append('clubId', finalClubId.toString()); formData.append('date', meetDate); formData.append('time', meetTime); formData.append('topic', meetTopic); formData.append('description', meetDesc); formData.append('locationType', meetLocType); formData.append('locationDetails', meetLocDetails); formData.append('videoLink', meetVideoLink); if (meetCover) formData.append('coverPhoto', meetCover); const url = editMeetId ? `${BACKEND_URL}/api/meetings/${editMeetId}` : `${BACKEND_URL}/api/meetings`; const method = editMeetId ? 'PUT' : 'POST'; const res = await fetch(url, { method, body: formData }); if (res.ok) { alert(editMeetId ? "Klubest frissítve!" : "Klubest sikeresen létrehozva!"); clearMeetingForm(); fetchData(); } else { const err = await res.json(); alert(`Hiba: ${err.error}`); } } catch (error) { alert("Hálózati hiba!"); } finally { setIsMeetingUploading(false); } };
  const handleDeleteMeeting = async (id: number) => { if (!window.confirm("Biztosan törlöd ezt a klubestet?")) return; const res = await fetch(`${BACKEND_URL}/api/meetings/${id}`, { method: 'DELETE' }); if (res.ok) fetchData(); };
  const openAttendance = async (meetId: number) => { setAttendanceMeetId(meetId); const res = await fetch(`${BACKEND_URL}/api/attendance/${meetId}`); if (res.ok) setAttendanceList(await res.json()); };
  const toggleAttendance = (email: string) => { setAttendanceList(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]); };
  const saveAttendance = async () => { if (!attendanceMeetId) return; const res = await fetch(`${BACKEND_URL}/api/attendance/${attendanceMeetId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emails: attendanceList }) }); if (res.ok) { alert("Jelenléti ív mentve!"); setAttendanceMeetId(null); } };
  const getYouTubeEmbed = (url: string) => { const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/); return match ? `https://www.youtube.com/embed/${match[1]}` : url; };

  const clearHwForm = () => { setEditHwId(null); setHwClubId(''); setHwTopic(''); setHwDesc(''); setHwDeadline(''); setHwMaxImages(4); };
  const startEditHw = (h: any) => { setEditHwId(h.id); setHwClubId(h.club_id.toString()); setHwTopic(h.topic); setHwDesc(h.description || ''); setHwMaxImages(h.max_images || 4); const formatDate = (dateStr: string) => { try { const d = new Date(dateStr); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16); } catch (e) { return ''; } }; setHwDeadline(formatDate(h.deadline)); };
  const handleSaveHw = async () => { const finalClubId = user.email !== ADMIN_EMAIL ? clubs.find(c => c.name === currentDbUser?.club_name)?.id : hwClubId; if (!finalClubId || !hwTopic || !hwDeadline) return alert("Klub, Téma és Határidő kötelező!"); try { const url = editHwId ? `${BACKEND_URL}/api/homeworks/${editHwId}` : `${BACKEND_URL}/api/homeworks`; const method = editHwId ? 'PUT' : 'POST'; const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clubId: finalClubId, topic: hwTopic, description: hwDesc, deadline: hwDeadline, maxImages: hwMaxImages }) }); if (res.ok) { alert(editHwId ? "Házi feladat frissítve!" : "Házi feladat létrehozva!"); clearHwForm(); fetchData(); } else alert("Hiba történt!"); } catch (e) { alert("Hálózati hiba!"); } };
  const handleDeleteHw = async (id: number) => { if (!window.confirm("Biztosan törlöd ezt a házi feladatot? A hozzá tartozó összes kép is törlődik!")) return; const res = await fetch(`${BACKEND_URL}/api/homeworks/${id}`, { method: 'DELETE' }); if (res.ok) fetchData(); };
  const handleHwFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { setHwUploadFile(file); setHwUploadPreview(URL.createObjectURL(file)); } };
  
  const handleUploadHw = async (homeworkId: number) => {
    if (!hwUploadFile || !hwUploadTitle) return alert("Kép és cím megadása kötelező!");
    setIsHwUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', hwUploadFile);
      formData.append('homeworkId', String(homeworkId));
      formData.append('userEmail', user.email);
      formData.append('userName', user.name);
      formData.append('title', hwUploadTitle);

      const res = await fetch(`${BACKEND_URL}/api/upload-homework`, { method: 'POST', body: formData });
      if (res.ok) { 
        alert("Feltöltve!"); setActiveUploadHw(null); setHwUploadFile(null); setHwUploadPreview(null); setHwUploadTitle(''); fetchMyEntries(user.email); 
        const club = clubs.find(c => c.name === currentDbUser?.club_name); if (club) fetchClubHomeworkEntries(club.id, user.email);
      } else { 
        const err = await res.json(); alert(`Hiba: ${err.error}`); 
      }
    } catch (error) { alert("Hiba a feltöltésnél"); } finally { setIsHwUploading(false); }
  };

  const handleUpdateHwEntryTitle = async (entryId: number) => {
    if (!editHwEntryTitle) return alert('A cím nem lehet üres!');
    const res = await fetch(`${BACKEND_URL}/api/homework-entries/${entryId}`, { 
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: editHwEntryTitle, userEmail: user.email }) 
    });
    if (res.ok) { 
      setEditingHwEntryId(null); 
      fetchMyEntries(user.email); 
      const club = clubs.find(c => c.name === currentDbUser?.club_name); if (club) fetchClubHomeworkEntries(club.id, user.email);
    } else alert('Hiba a cím frissítésekor!');
  };

  const handleDeleteHwEntry = async (entryId: number) => {
    if (!window.confirm("Biztosan törlöd ezt a feltöltést?")) return;
    const res = await fetch(`${BACKEND_URL}/api/homework-entries/${entryId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEmail: user.email }) });
    if (res.ok) {
      fetchMyEntries(user.email);
      const club = clubs.find(c => c.name === currentDbUser?.club_name); if (club) fetchClubHomeworkEntries(club.id, user.email);
    }
  };

  const handleToggleLike = async (entryId: number) => {
    const res = await fetch(`${BACKEND_URL}/api/homework-entries/${entryId}/like`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEmail: user.email })
    });
    if (res.ok) {
      const club = clubs.find(c => c.name === currentDbUser?.club_name); 
      if (club) fetchClubHomeworkEntries(club.id, user.email);
    }
  };

  const clearSalonForm = () => { setSalonName(''); setSalonFee(''); setSalonCurrency('EUR'); setSalonStart(''); setSalonEnd(''); setSalonWeb(''); setSalonResults(''); setSalonIsCircuit(false); setSalonAwards(''); setSalonCash(''); setSalonCircuitNum(''); setSalonType('online'); setSalonCountry(''); setSalonSelectedPatrons([]); setSalonSelectedCats([]); };
  const handleSaveSalon = async () => { if (!salonName || !salonEnd) return alert("A Szalon neve és a záródátum megadása kötelező!"); try { const payload = { name: salonName, feeAmount: salonFee, feeCurrency: salonCurrency, startDate: salonStart, endDate: salonEnd, website: salonWeb, resultsDate: salonResults, isCircuit: salonIsCircuit, awardsCount: salonAwards, cashPrize: salonCash, circuitNumber: salonCircuitNum, submissionType: salonType, hostCountryId: salonCountry, patronIds: salonSelectedPatrons, categoryIds: salonSelectedCats }; const res = await fetch(`${BACKEND_URL}/api/salons`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (res.ok) { alert("Szalon sikeresen hozzáadva!"); clearSalonForm(); fetchData(); } else alert("Hiba a mentés során."); } catch (e) { alert("Hálózati hiba!"); } };
  const handleDeleteSalon = async (id: number) => { if(!window.confirm("Biztosan törlöd ezt a Szalont?")) return; const res = await fetch(`${BACKEND_URL}/api/salons/${id}`, { method: 'DELETE' }); if(res.ok) fetchData(); };
  const toggleArrayItem = (arr: number[], setArr: Function, id: number) => { if (arr.includes(id)) setArr(arr.filter(item => item !== id)); else setArr([...arr, id]); };

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };
  const navBtnStyle = { background: 'transparent', color: '#f8fafc', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '5px' };
  const dropdownStyle = { position: 'absolute' as const, top: '100%', left: 0, marginTop: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', minWidth: '220px', display: 'flex', flexDirection: 'column' as const };
  const dropItemStyle = { background: 'transparent', color: '#cbd5e1', border: 'none', padding: '12px 15px', textDecoration: 'none', textAlign: 'left' as const, cursor: 'pointer', width: '100%', borderBottom: '1px solid #334155', fontSize: '0.95rem' };

  const filteredContests = contests.filter(contest => {
    const isRestricted = contest.restricted_club && contest.restricted_club.trim() !== '';
    const now = new Date();
    const start = contest.start_date ? new Date(contest.start_date) : new Date(0);
    const end = contest.end_date ? new Date(contest.end_date) : new Date(0);
    const isEnded = now > end && start.getFullYear() > 1970;

    if (activeTab === 'admin_contests') return true; 

    if (activeTab === 'contests_closed') {
       if (!isEnded) return false;
       if (isRestricted && contest.restricted_club !== currentDbUser?.club_name) return false;
       return true;
    }

    if (activeTab === 'contests_club_active') {
       return isRestricted && contest.restricted_club === currentDbUser?.club_name && !isEnded;
    }

    if (activeTab === 'contests_open_active') {
       return !isRestricted && !isEnded;
    }

    return false;
  });

  const myClubMeetings = meetings.filter(m => m.club_name === currentDbUser?.club_name);
  const searchedMeetings = myClubMeetings.filter(m => {
    if (!meetingSearch) return true;
    const q = meetingSearch.toLowerCase();
    return m.topic.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q));
  });
  const adminMeetings = user?.email === ADMIN_EMAIL ? meetings : meetings.filter(m => m.club_name === currentDbUser?.club_name);

  const myClubHomeworks = homeworks.filter(h => h.club_name === currentDbUser?.club_name);
  const adminHomeworks = user?.email === ADMIN_EMAIL ? homeworks : homeworks.filter(h => h.club_name === currentDbUser?.club_name);

  const sortedSalons = [...salons].sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());

  const searchedSalons = sortedSalons.filter(s => {
    if (!salonSearch) return true;
    const q = salonSearch.toLowerCase();
    const matchName = s.name.toLowerCase().includes(q);
    const matchPatron = s.patron_details && s.patron_details.some((p: any) => 
      (p.name && p.name.toLowerCase().includes(q)) || 
      (p.number && p.number.toLowerCase().includes(q))
    );
    return matchName || matchPatron;
  });

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>

      {fullscreenData && <FullscreenModal data={fullscreenData} onClose={() => setFullscreenData(null)} />}
      {selectedSalon && <SalonModal salon={selectedSalon} onClose={() => setSelectedSalon(null)} />}
      {activeVideo && <VideoModal videoUrl={activeVideo} onClose={() => setActiveVideo(null)} />}

      {!user ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
          
          <Header 
            user={user} 
            isLeader={!!isLeader} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            dropdownOpen={dropdownOpen} 
            setDropdownOpen={setDropdownOpen} 
            onLogout={() => { localStorage.removeItem('photoAppToken'); setUser(null); }} 
          />

          <main className="main-container">
            {isInitialLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: '#60a5fa' }}>
                <div style={{ fontSize: '3rem', marginBottom: '20px', animation: 'spin 2s linear infinite' }}>⏳</div>
                <h2>Adatok szinkronizálása a szerverrel...</h2>
              </div>
            ) : (
              <>
                {activeTab === 'admin_clubs' && user.email === ADMIN_EMAIL && (
                   <div>
                     <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b' }}>🏷️ Fotóklubok Kezelése</h2>
                     <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #334155', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <input placeholder="Új fotóklub neve..." value={newClubName} onChange={e => setNewClubName(e.target.value)} style={{...inputStyle, marginBottom: 0, flex: 1, minWidth: '200px'}} />
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
                         <div key={u.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: index < allUsers.length - 1 ? '1px solid #334155' : 'none', background: index % 2 === 0 ? '#0f172a' : 'transparent', flexWrap: 'wrap', gap: '15px' }}>
                           <div>
                             <div style={{ fontWeight: 'bold' }}>{u.name}</div>
                             <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{u.email}</div>
                             <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                               🕒 Utolsó belépés: {u.last_login ? new Date(u.last_login).toLocaleString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Ismeretlen'}
                             </div>
                           </div>
                           <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                             <select value={userClubEdits[u.email] !== undefined ? userClubEdits[u.email] : (u.club_name || '')} onChange={e => setUserClubEdits({...userClubEdits, [u.email]: e.target.value})} style={{ padding: '8px', borderRadius: '6px', background: '#1e293b', border: '1px solid #475569', color: 'white', width: '200px', margin: 0 }}>
                               <option value="">-- Nincs klubja --</option>
                               {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                             </select>
                             <select value={userRoleEdits[u.email] !== undefined ? userRoleEdits[u.email] : (u.club_role || 'member')} onChange={e => setUserRoleEdits({...userRoleEdits, [u.email]: e.target.value})} style={{ padding: '8px', borderRadius: '6px', background: '#1e293b', border: '1px solid #475569', color: 'white', width: '150px', margin: 0 }}>
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                            <h3 style={{ margin: 0, color: '#f59e0b' }}>{editMeetId ? '✏️ Klubest Szerkesztése' : '➕ Új Klubest Meghirdetése'}</h3>
                            {editMeetId && <button onClick={clearMeetingForm} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}>Mégse / Új létrehozása</button>}
                          </div>
                          
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {user.email === ADMIN_EMAIL ? (
                              <div style={{flex: '1 1 200px'}}>
                                <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Melyik klubnak?</label>
                                <select value={meetClubId} onChange={e => setMeetClubId(e.target.value)} style={inputStyle}>
                                  <option value="">-- Válassz Klubot --</option>
                                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                              </div>
                            ) : (
                              <div style={{flex: '1 1 200px'}}>
                                <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Klub</label>
                                <div style={{...inputStyle, background: '#334155', color: '#94a3b8'}}>{currentDbUser?.club_name}</div>
                              </div>
                            )}
                            
                            <div style={{flex: '1 1 120px'}}>
                              <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Dátum</label>
                              <input type="date" value={meetDate} onChange={e => setMeetDate(e.target.value)} style={inputStyle} />
                            </div>
                            <div style={{flex: '1 1 120px'}}>
                              <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Időpont</label>
                              <input type="time" value={meetTime} onChange={e => setMeetTime(e.target.value)} style={inputStyle} />
                            </div>
                          </div>

                          <input placeholder="Klubest Témája (pl.: Portréfotózás alapjai)" value={meetTopic} onChange={e => setMeetTopic(e.target.value)} style={inputStyle} />
                          <textarea placeholder="Részletes leírás, program..." value={meetDesc} onChange={e => setMeetDesc(e.target.value)} style={{...inputStyle, minHeight: '80px'}} />
                          
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <div style={{flex: '1 1 150px'}}>
                              <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Helyszín típusa</label>
                              <select value={meetLocType} onChange={e => setMeetLocType(e.target.value as any)} style={inputStyle}>
                                <option value="physical">Fizikai Helyszín</option>
                                <option value="online">Online Link</option>
                              </select>
                            </div>
                            <div style={{flex: '2 1 200px'}}>
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
                            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: i < adminMeetings.length - 1 ? '1px solid #334155' : 'none', background: i % 2 === 0 ? '#0f172a' : 'transparent', flexWrap: 'wrap', gap: '10px' }}>
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

                {activeTab === 'admin_homeworks' && (user.email === ADMIN_EMAIL || isLeader) && (
                  <div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b' }}>📝 Házi Feladatok Kezelése</h2>
                    
                    <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #f59e0b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0, color: '#f59e0b' }}>{editHwId ? '✏️ Házi Feladat Szerkesztése' : '➕ Új Házi Feladat Kiírása'}</h3>
                        {editHwId && <button onClick={clearHwForm} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}>Mégse / Új létrehozása</button>}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {user.email === ADMIN_EMAIL ? (
                          <div style={{flex: '1 1 200px'}}>
                            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Melyik klubnak?</label>
                            <select value={hwClubId} onChange={e => setHwClubId(e.target.value)} style={inputStyle}>
                              <option value="">-- Válassz Klubot --</option>
                              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                        ) : (
                          <div style={{flex: '1 1 200px'}}>
                            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Klub</label>
                            <div style={{...inputStyle, background: '#334155', color: '#94a3b8'}}>{currentDbUser?.club_name}</div>
                          </div>
                        )}
                        <div style={{flex: '1 1 200px'}}>
                          <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Feltöltési Határidő</label>
                          <input type="datetime-local" value={hwDeadline} onChange={e => setHwDeadline(e.target.value)} style={inputStyle} />
                        </div>
                        <div style={{flex: '1 1 100px'}}>
                          <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Max. kép / fő</label>
                          <input type="number" min="1" value={hwMaxImages} onChange={e => setHwMaxImages(Number(e.target.value))} style={inputStyle} />
                        </div>
                      </div>

                      <input placeholder="Házi feladat Témája (pl.: Őszi színek, Minimál)" value={hwTopic} onChange={e => setHwTopic(e.target.value)} style={inputStyle} />
                      <textarea placeholder="Leírás, instrukciók a klubtagoknak..." value={hwDesc} onChange={e => setHwDesc(e.target.value)} style={{...inputStyle, minHeight: '80px'}} />
                      
                      <button onClick={handleSaveHw} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                        {editHwId ? 'Frissítés' : 'Mentés és Kiírás'}
                      </button>
                    </div>

                    <h3 style={{ color: '#f8fafc' }}>Klubod Házi Feladatai</h3>
                    <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
                      {adminHomeworks.length === 0 ? <div style={{padding: '20px', color: '#94a3b8', textAlign: 'center'}}>Nincs megjeleníthető feladat.</div> : null}
                      {adminHomeworks.map((h, i) => {
                        const isPast = new Date() > new Date(h.deadline);
                        return (
                          <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: i < adminHomeworks.length - 1 ? '1px solid #334155' : 'none', background: i % 2 === 0 ? '#0f172a' : 'transparent', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                              <div style={{ fontWeight: 'bold', color: '#38bdf8' }}>{h.topic}</div>
                              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                Klub: {h.club_name} | Határidő: {new Date(h.deadline).toLocaleString()} | Max: {h.max_images || 4} kép
                                <span style={{ color: isPast ? '#ef4444' : '#10b981', fontWeight: 'bold', marginLeft: '10px' }}>
                                  ({isPast ? 'Lezárult' : 'Aktív'})
                               </span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button onClick={() => startEditHw(h)} style={{ background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>Szerkeszt</button>
                              <button onClick={() => handleDeleteHw(h.id)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>Töröl</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'admin_salons' && user.email === ADMIN_EMAIL && (
                  <div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b' }}>🌐 Nemzetközi Szalonok Kezelése</h2>
                    
                    <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #f59e0b' }}>
                      <h3 style={{ margin: '0 0 15px 0', color: '#f59e0b' }}>➕ Új Szalon Létrehozása</h3>
                      
                      <input placeholder="Szalon hivatalos neve" value={salonName} onChange={e => setSalonName(e.target.value)} style={inputStyle} />
                      
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{flex: '1 1 200px'}}>
                          <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Feltöltés / Beadási forma</label>
                          <select value={salonType} onChange={e => setSalonType(e.target.value as any)} style={inputStyle}>
                            <option value="online">Online (Digitális)</option>
                            <option value="print">Print (Papírkép)</option>
                          </select>
                        </div>
                        <div style={{flex: '1 1 200px'}}>
                          <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Házigazda ország</label>
                          <select value={salonCountry} onChange={e => setSalonCountry(e.target.value)} style={inputStyle}>
                            <option value="">-- Válassz országot --</option>
                            {countries.map(c => {
                              const flag = getFlagEmoji(c.country_code);
                              return (
                                <option key={c.id} value={c.id}>{flag ? `${flag} ` : ''}{c.country_hun}</option>
                              );
                            })}
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{flex: '1 1 150px'}}>
                          <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Nevezési díj (Pl: 20)</label>
                          <input type="number" value={salonFee} onChange={e => setSalonFee(e.target.value)} style={inputStyle} />
                        </div>
                        <div style={{flex: '1 1 100px'}}>
                          <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Pénznem</label>
                          <select value={salonCurrency} onChange={e => setSalonCurrency(e.target.value)} style={inputStyle}>
                            <option value="EUR">EUR</option>
                            <option value="USD">USD</option>
                            <option value="HUF">HUF</option>
                            <option value="GBP">GBP</option>
                          </select>
                        </div>
                        <div style={{flex: '1 1 250px'}}>
                          <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Weboldal URL (https://...)</label>
                          <input type="url" value={salonWeb} onChange={e => setSalonWeb(e.target.value)} style={inputStyle} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{flex: '1 1 150px'}}>
                          <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Kezdés (Opcionális)</label>
                          <input type="date" value={salonStart} onChange={e => setSalonStart(e.target.value)} style={inputStyle} />
                        </div>
                        <div style={{flex: '1 1 150px'}}>
                          <label style={{fontSize:'0.8rem', color:'#ef4444', fontWeight: 'bold'}}>Zárás (Határidő)</label>
                          <input type="date" value={salonEnd} onChange={e => setSalonEnd(e.target.value)} style={{...inputStyle, border: '1px solid #ef4444'}} />
                        </div>
                        <div style={{flex: '1 1 150px'}}>
                          <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Eredményhirdetés</label>
                          <input type="date" value={salonResults} onChange={e => setSalonResults(e.target.value)} style={inputStyle} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start', background: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '15px' }}>
                        <div style={{flex: '1 1 100%'}}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#f8fafc', fontWeight: 'bold' }}>
                            <input type="checkbox" checked={salonIsCircuit} onChange={e => setSalonIsCircuit(e.target.checked)} style={{ width: '20px', height: '20px' }} />
                            Körverseny (Circuit)
                          </label>
                        </div>
                        {salonIsCircuit && (
                          <div style={{flex: '1 1 100%', marginTop: '10px'}}>
                            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Körverseny azonosító (pl. FIAP 2023/081-084)</label>
                            <input placeholder="Azonosítók..." value={salonCircuitNum} onChange={e => setSalonCircuitNum(e.target.value)} style={{...inputStyle, marginBottom: 0}} />
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                        <div style={{flex: '1 1 150px'}}>
                          <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Kiosztott díjak száma</label>
                          <input type="number" value={salonAwards} onChange={e => setSalonAwards(e.target.value)} style={inputStyle} />
                        </div>
                        <div style={{flex: '1 1 300px'}}>
                          <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Készpénzes nyeremény (Opcionális)</label>
                          <input placeholder="pl: 1000 EUR a legjobb fotónak" value={salonCash} onChange={e => setSalonCash(e.target.value)} style={inputStyle} />
                        </div>
                      </div>

                      <div style={{ marginBottom: '15px', padding: '15px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                        <label style={{fontSize:'0.9rem', color:'#38bdf8', fontWeight: 'bold', display: 'block', marginBottom: '10px'}}>Kategóriák (Válassz ki többet is)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                          {allCategories.map(cat => (
                            <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: salonSelectedCats.includes(cat.id) ? '#38bdf820' : 'transparent', color: salonSelectedCats.includes(cat.id) ? '#38bdf8' : '#cbd5e1', padding: '5px 10px', borderRadius: '100px', cursor: 'pointer', border: `1px solid ${salonSelectedCats.includes(cat.id) ? '#38bdf8' : '#475569'}` }}>
                              <input type="checkbox" checked={salonSelectedCats.includes(cat.id)} onChange={() => toggleArrayItem(salonSelectedCats, setSalonSelectedCats, cat.id)} style={{ display: 'none' }} />
                              {cat.hun_name || cat.name}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: '20px', padding: '15px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                        <label style={{fontSize:'0.9rem', color:'#a78bfa', fontWeight: 'bold', display: 'block', marginBottom: '10px'}}>Patronáló Szervezetek (FIAP, PSA, stb.)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                          {patrons.map(p => (
                            <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: salonSelectedPatrons.includes(p.id) ? '#a78bfa20' : 'transparent', color: salonSelectedPatrons.includes(p.id) ? '#a78bfa' : '#cbd5e1', padding: '5px 10px', borderRadius: '100px', cursor: 'pointer', border: `1px solid ${salonSelectedPatrons.includes(p.id) ? '#a78bfa' : '#475569'}` }}>
                              <input type="checkbox" checked={salonSelectedPatrons.includes(p.id)} onChange={() => toggleArrayItem(salonSelectedPatrons, setSalonSelectedPatrons, p.id)} style={{ display: 'none' }} />
                              {p.name}
                            </label>
                          ))}
                        </div>
                      </div>

                      <button onClick={handleSaveSalon} style={{ background: '#10b981', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '1.1rem' }}>
                        Szalon Mentése és Kiírása
                      </button>
                    </div>

                    <h3 style={{ color: '#f8fafc' }}>Adatbázisban lévő Szalonok</h3>
                    <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
                      {sortedSalons.length === 0 ? <div style={{padding: '20px', color: '#94a3b8', textAlign: 'center'}}>Még nincs egyetlen szalon sem felvéve.</div> : null}
                      {sortedSalons.map((s, i) => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: i < sortedSalons.length - 1 ? '1px solid #334155' : 'none', background: i % 2 === 0 ? '#0f172a' : 'transparent', flexWrap: 'wrap', gap: '10px' }}>
                          
                          <div style={{ cursor: 'pointer' }} onClick={() => setSelectedSalon(s)}>
                            <div style={{ fontWeight: 'bold', color: '#60a5fa', fontSize: '1.1rem' }}>{s.name}</div>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '5px' }}>
                              Zárás: {new Date(s.end_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })} | {s.country_code && getFlagEmoji(s.country_code) ? `${getFlagEmoji(s.country_code)} ` : ''}{s.country_hun}
                            </div>
                          </div>
                          <div>
                            <button onClick={() => handleDeleteSalon(s.id)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Törlés</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'salons' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
                      <h2 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '15px', color: '#60a5fa' }}>
                        <span style={{ fontSize: '2.5rem' }}>🌐</span> Nemzetközi Fotóművészeti Szalonok
                      </h2>
                      <input 
                        type="text" 
                        placeholder="🔍 Keresés név vagy azonosító (pl. 2026/081)..." 
                        value={salonSearch} 
                        onChange={e => setSalonSearch(e.target.value)} 
                        style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: 'white', minWidth: '300px', outline: 'none' }} 
                      />
                    </div>
                    
                    <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '20px' }}>
                      Böngéssz a hazai és nemzetközi fotópályázatok között. Kattints a szalon nevére vagy a "Részletek" gombra a pontos kiírás, kategóriák és díjazás megtekintéséhez!
                    </p>

                    {searchedSalons.length === 0 ? (
                      <div style={{padding: '20px', color: '#94a3b8', textAlign: 'center', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155'}}>
                        {salonSearch ? 'Nincs a keresésnek megfelelő szalon.' : 'Jelenleg nincs megjeleníthető szalon az adatbázisban.'}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                        {searchedSalons.map((s) => {
                          const isEnded = new Date(s.end_date) < new Date(new Date().setHours(0,0,0,0));
                          
                          return (
                            <div 
                              key={s.id} 
                              onClick={() => setSelectedSalon(s)}
                              style={{ cursor: 'pointer', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', overflow: 'hidden', opacity: isEnded ? 0.7 : 1, transition: 'transform 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)' }} 
                              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-3px)'} 
                              onMouseOut={e => e.currentTarget.style.transform = 'none'}
                            >
                              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', flex: 1 }}>
                                    {s.patron_details && s.patron_details.length > 0 ? (
                                      s.patron_details.map((p: any) => (
                                        <span key={p.name} style={{ background: '#8b5cf620', color: '#a78bfa', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid #8b5cf650', whiteSpace: 'nowrap' }}>
                                          {p.name} {p.number ? `(${p.number})` : ''}
                                        </span>
                                      ))
                                    ) : (
                                      <span style={{ background: '#334155', color: '#cbd5e1', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>Független</span>
                                    )}
                                    {s.is_circuit === 1 && <span style={{ background: '#f59e0b20', color: '#f59e0b', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid #f59e0b50' }}>Körverseny</span>}
                                  </div>
                                  
                                  <div style={{ textAlign: 'right', marginLeft: '10px' }}>
                                    <div style={{ fontSize: '0.7rem', color: isEnded ? '#94a3b8' : '#ef4444', textTransform: 'uppercase', fontWeight: 'bold' }}>Határidő</div>
                                    <div style={{ fontSize: '1rem', color: isEnded ? '#94a3b8' : '#f8fafc', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                      {new Date(s.end_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </div>
                                  </div>
                                </div>

                                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.3rem', color: '#f8fafc', lineHeight: '1.3' }}>
                                  {s.name}
                                </h3>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '15px' }}>
                                  <span style={{fontWeight: 'bold', color: '#cbd5e1'}}>{s.country_code ? getFlagEmoji(s.country_code) : '🏳️'} {s.country_hun}</span>
                                  <span>•</span>
                                  <span>{s.submission_type === 'online' ? '💻 Online leadás' : '🖼️ Papírkép'}</span>
                                </div>

                                {s.categories && s.categories.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '15px' }}>
                                    {s.categories.map((c: string) => (
                                      <span key={c} style={{ background: '#38bdf815', color: '#38bdf8', padding: '3px 8px', borderRadius: '100px', fontSize: '0.75rem', border: '1px solid #38bdf830' }}>
                                        {c}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                <div style={{ flex: 1 }}></div>

                                <div style={{ display: 'flex', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155', padding: '12px', marginBottom: '12px' }}>
                                  <div style={{ flex: 1, borderRight: '1px solid #334155' }}>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Nevezési díj</div>
                                    <div style={{ fontSize: '1rem', color: '#10b981', fontWeight: 'bold' }}>
                                      {s.fee_amount && s.fee_amount > 0 ? `${s.fee_amount} ${s.fee_currency}` : 'Ingyenes'}
                                    </div>
                                  </div>
                                  <div style={{ flex: 1, paddingLeft: '12px' }}>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Díjak száma</div>
                                    <div style={{ fontSize: '1rem', color: '#f59e0b', fontWeight: 'bold' }}>
                                      {s.awards_count || 0} db
                                    </div>
                                  </div>
                                </div>

                                {s.results_date && (
                                  <div style={{ marginBottom: '5px', padding: '0 5px' }}>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>Eredményhirdetés</div>
                                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                                      {new Date(s.results_date).toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\s/g, '')}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <button 
                                style={{ background: '#334155', color: '#f8fafc', border: 'none', padding: '12px', width: '100%', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', borderTop: '1px solid #475569', transition: 'background 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.background = '#475569'}
                                onMouseOut={e => e.currentTarget.style.background = '#334155'}
                              >
                                Részletek megtekintése {isEnded ? '(Lezárult)' : ''}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

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
                          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                              {searchedMeetings.map(meet => {
                                const meetDateObj = new Date(meet.meeting_date);
                                const isPast = meetDateObj < new Date(new Date().setHours(0,0,0,0));
                                
                                return (
                                  <div key={meet.id} style={{ height: '450px', background: '#1e293b', borderRadius: '16px', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
                                    
                                    <div style={{ height: '180px', flexShrink: 0, background: '#0f172a', position: 'relative' }}>
                                      {meet.drive_file_id || meet.file_url ? (
                                        <img src={getImageUrl(meet.drive_file_id, meet.file_url)} alt={meet.topic} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isPast ? 0.6 : 1 }} />
                                      ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#334155', fontSize: '4rem' }}>📷</div>
                                      )}
                                      
                                      <div className="contest-badge" style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(5px)', padding: '6px 10px', color: isPast ? '#94a3b8' : '#38bdf8', border: `1px solid ${isPast ? '#334155' : '#38bdf850'}`, textAlign: 'center', lineHeight: '1.1', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.65rem', opacity: 0.7, letterSpacing: '1px' }}>{meetDateObj.getFullYear()}</span>
                                        <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', marginTop: '2px' }}>{meetDateObj.toLocaleDateString('hu-HU', { month: 'short' }).replace('.', '')}</span>
                                        <span style={{ fontSize: '1.6rem', marginTop: '2px' }}>{meetDateObj.getDate()}</span>
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

                                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px', display: 'flex', gap: '15px', flexShrink: 0 }}>
                                        <span>⏰ {meet.meeting_time.substring(0,5)}</span>
                                        {isPast && <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Lezajlott</span>}
                                      </div>
                                      
                                      <h3 style={{ margin: '0 0 10px 0', color: isPast ? '#cbd5e1' : '#f8fafc', fontSize: '1.4rem', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {meet.topic}
                                      </h3>
                                      
                                      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '15px', paddingRight: '5px' }}>
                                        <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                          {meet.description}
                                        </p>
                                      </div>

                                      <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                        <div style={{ fontSize: '1.5rem' }}>{meet.location_type === 'online' ? '💻' : '📍'}</div>
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>{meet.location_type === 'online' ? 'Online találkozó' : 'Fizikai helyszín'}</div>
                                          {meet.location_type === 'online' ? (
                                            isPast ? (
                                              <div style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>A találkozó véget ért</div>
                                            ) : (
                                              <a href={meet.location_details} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Csatlakozás a híváshoz →</a>
                                            )
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

                {activeTab === 'club_homeworks' && (
                  <div>
                    {!currentDbUser?.club_name ? (
                      <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
                        <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>Nem vagy klubhoz rendelve</h2>
                        <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>A klubod feladatainak megtekintéséhez kérjük, vedd fel a kapcsolatot egy adminisztrátorral.</p>
                      </div>
                    ) : (
                      <>
                        <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <span style={{ fontSize: '2.5rem' }}>📝</span> Házi Feladatok: {currentDbUser.club_name}
                        </h2>

                        {myClubHomeworks.length === 0 ? (
                          <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Jelenleg nincs kiírva házi feladat.</p>
                        ) : (
                          myClubHomeworks.map(hw => {
                            const isPast = new Date() > new Date(hw.deadline);
                            const myEntries = myHomeworkEntries.filter(e => e.homework_id === hw.id);
                            const hwEntriesForAll = clubHomeworkEntries.filter(e => e.homework_id === hw.id);
                            
                            const maxImages = hw.max_images || 4;

                            const uploaderStats = hwEntriesForAll.reduce((acc, curr) => {
                               if (!acc[curr.user_name]) acc[curr.user_name] = 0;
                               acc[curr.user_name]++;
                               return acc;
                            }, {} as Record<string, number>);

                            return (
                              <div key={hw.id} style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: isPast ? '1px solid #475569' : '1px solid #10b981', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', position: 'relative' }}>
                                
                                <div className="contest-header">
                                  <div>
                                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.5rem', color: isPast ? '#cbd5e1' : '#f8fafc' }}>{hw.topic}</h3>
                                    <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '0 0 15px 0', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{hw.description}</p>
                                  </div>
                                  <span className="contest-badge" style={{ background: isPast ? '#ef444420' : '#10b98120', color: isPast ? '#ef4444' : '#10b981' }}>
                                    {isPast ? 'Lezárult' : 'Aktív Feltöltés'}
                                  </span>
                                </div>
                                <p style={{fontSize: '0.85rem', color: '#f59e0b', margin: '0 0 15px 0', fontWeight: 'bold'}}>⏰ Határidő: {new Date(hw.deadline).toLocaleString()} | Maximum {maxImages} kép</p>

                                {isLeader && (
                                  <div style={{ marginTop: '15px', marginBottom: '20px', padding: '15px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px' }}>📊 Feltöltések eddig (Vezetői infó)</h4>
                                    {Object.keys(uploaderStats).length === 0 ? (
                                      <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Még nem érkezett feltöltés a klubtagoktól.</div>
                                    ) : (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {Object.entries(uploaderStats).map(([name, count]) => (
                                          <span key={name} style={{ background: '#1e293b', border: '1px solid #475569', color: '#cbd5e1', padding: '6px 12px', borderRadius: '100px', fontSize: '0.85rem' }}>
                                            {name}: <strong style={{ color: count >= maxImages ? '#10b981' : '#f8fafc' }}>{count}/{maxImages}</strong>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {!isPast && activeUploadHw !== hw.id && myEntries.length < maxImages && (
                                  <button onClick={() => { setActiveUploadHw(hw.id); setHwUploadTitle(''); setHwUploadPreview(null); setHwUploadFile(null); }} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '15px' }}>+ Kép Feltöltése ({myEntries.length}/{maxImages})</button>
                                )}
                                
                                {!isPast && myEntries.length >= maxImages && (
                                  <div style={{ padding: '10px', background: '#10b98120', color: '#10b981', borderRadius: '8px', marginBottom: '15px', fontWeight: 'bold' }}>🎉 Elérted a maximális {maxImages} feltöltést!</div>
                                )}

                                {activeUploadHw === hw.id && (
                                  <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #38bdf840' }}>
                                    <h4 style={{marginTop: 0, color: '#38bdf8', fontSize: '1.2rem'}}>Házi feladat feltöltése</h4>
                                    <input placeholder="Kép címe" value={hwUploadTitle} onChange={e => setHwUploadTitle(e.target.value)} style={inputStyle} disabled={isHwUploading} />
                                    <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleHwFileSelect} style={{ color: '#94a3b8', marginBottom: '15px', width: '100%' }} disabled={isHwUploading} />
                                    {hwUploadPreview && <div style={{marginTop: '10px', marginBottom: '20px', textAlign: 'center'}}><img src={hwUploadPreview} alt="Előnézet" style={{maxHeight: '300px', borderRadius: '8px', border: '2px solid #334155'}} /></div>}
                                    <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                                      <button onClick={() => handleUploadHw(hw.id)} disabled={isHwUploading} style={{ flex: '1 1 150px', background: isHwUploading ? '#475569' : '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: isHwUploading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>{isHwUploading ? 'Feltöltés ⏳...' : 'Beküldés 🚀'}</button>
                                      <button onClick={() => { setActiveUploadHw(null); setHwUploadPreview(null); }} disabled={isHwUploading} style={{ flex: '1 1 100px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '12px', borderRadius: '8px', cursor: isHwUploading ? 'not-allowed' : 'pointer' }}>Mégse</button>
                                    </div>
                                  </div>
                                )}

                                {myEntries.length > 0 && (
                                  <div style={{ marginTop: '20px', borderTop: '1px solid #334155', paddingTop: '20px' }}>
                                    <h4 style={{margin: '0 0 15px 0', fontSize: '1.1rem', color: '#cbd5e1'}}>Saját beküldött képeid</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
                                      {myEntries.map(entry => {
                                        const imageUrl = getImageUrl(entry.drive_file_id, entry.file_url);
                                        return (
                                          <div key={entry.id} style={{ background: '#0f172a', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
                                            <img src={imageUrl} alt={entry.title} onClick={() => setFullscreenData({url: imageUrl, title: entry.title})} style={{ width: '100%', height: '100px', objectFit: 'cover', cursor: 'zoom-in' }} />
                                            
                                            {editingHwEntryId === entry.id ? (
                                              <div style={{ padding: '12px' }}>
                                                <input 
                                                  value={editHwEntryTitle} 
                                                  onChange={e => setEditHwEntryTitle(e.target.value)} 
                                                  style={{ width: '100%', padding: '6px', marginBottom: '10px', backgroundColor: '#1e293b', border: '1px solid #38bdf8', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} 
                                                />
                                                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                                  <button onClick={() => handleUpdateHwEntryTitle(entry.id)} style={{ flex: '1 1 100%', background: '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Mentés</button>
                                                  <button onClick={() => setEditingHwEntryId(null)} style={{ flex: '1 1 100%', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Mégse</button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div style={{ padding: '12px' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#f8fafc' }}>{entry.title}</div>
                                                {!isPast && (
                                                  <div style={{ display: 'flex', gap: '5px', marginTop: '12px', flexWrap: 'wrap' }}>
                                                    <button onClick={() => { setEditingHwEntryId(entry.id); setEditHwEntryTitle(entry.title); }} style={{ flex: '1 1 45%', background: '#38bdf820', color: '#38bdf8', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Szerkeszt</button>
                                                    <button onClick={() => handleDeleteHwEntry(entry.id)} style={{ flex: '1 1 45%', background: '#ef444420', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Törlés</button>
                                                  </div>
                                                )}
                                              </div>
                                            )}

                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                                {isPast && (
                                  <div style={{ marginTop: '30px', borderTop: isLeader ? '2px dashed #f59e0b' : '1px solid #334155', paddingTop: '20px' }}>
                                    <h4 style={{margin: '0 0 5px 0', fontSize: '1.2rem', color: isLeader ? '#f59e0b' : '#38bdf8'}}>
                                      {isLeader ? '👑 Vezetői Galéria: Összes beküldött kép' : '📸 Klub Galéria: Beküldött képek'}
                                    </h4>
                                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '15px' }}>Kattints a képre a teljes méretű megtekintéshez és a cím elolvasásához.</p>
                                    
                                    {hwEntriesForAll.length === 0 ? (
                                      <p style={{ color: '#94a3b8' }}>Még senki nem töltött fel képet ehhez a feladathoz.</p>
                                    ) : (
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
                                        {hwEntriesForAll.map(entry => {
                                          const imageUrl = getImageUrl(entry.drive_file_id, entry.file_url);
                                          return (
                                            <div key={entry.id} style={{ background: '#0f172a', borderRadius: '8px', overflow: 'hidden', border: isLeader ? '1px solid #f59e0b50' : '1px solid #334155' }}>
                                              <img src={imageUrl} alt={entry.title} onClick={() => setFullscreenData({url: imageUrl, title: entry.title})} style={{ width: '100%', height: '140px', objectFit: 'cover', cursor: 'zoom-in' }} />
                                              <div style={{ padding: '12px' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#f8fafc' }}>{entry.title}</div>
                                                
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>Készítő: {entry.user_name}</div>
                                                  
                                                  <button onClick={(e) => { e.stopPropagation(); handleToggleLike(entry.id); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', borderRadius: '50px', backgroundColor: entry.user_liked ? '#ef444420' : 'transparent', transition: 'background 0.2s' }}>
                                                    <span style={{ fontSize: '1rem', color: entry.user_liked ? '#ef4444' : '#cbd5e1' }}>{entry.user_liked ? '❤️' : '🤍'}</span>
                                                    <span style={{ color: entry.user_liked ? '#ef4444' : '#94a3b8', fontSize: '0.85rem', fontWeight: 'bold' }}>{entry.like_count || 0}</span>
                                                  </button>
                                                </div>

                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}

                              </div>
                            );
                          })
                        )}
                      </>
                    )}
                  </div>
                )}

                {['contests_open_active', 'contests_club_active', 'contests_closed', 'admin_contests'].includes(activeTab) && (
                  <>
                    {activeTab === 'contests_club_active' && !currentDbUser?.club_name && (
                       <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                         <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
                         <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>Nem vagy klubhoz rendelve</h2>
                         <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>A klubod belső pályázatainak megtekintéséhez kérjük, vedd fel a kapcsolatot egy adminisztrátorral.</p>
                       </div>
                    )}

                    {!(activeTab === 'contests_club_active' && !currentDbUser?.club_name) && (
                      <>
                        {activeTab === 'admin_contests' && user.email === ADMIN_EMAIL && (
                          <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #f59e0b' }}>
                            <h3 style={{ marginTop: 0, color: '#f59e0b' }}>⚙️ Új Pályázat Létrehozása</h3>
                            <input placeholder="Pályázat címe" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={inputStyle} />
                            <textarea placeholder="Leírás" value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{...inputStyle, minHeight: '60px'}} />
                            <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                              <div style={{flex: '1 1 200px'}}><label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Kezdés</label><input type="datetime-local" value={newStart} onChange={e => setNewStart(e.target.value)} style={inputStyle} /></div>
                              <div style={{flex: '1 1 200px'}}><label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Befejezés</label><input type="datetime-local" value={newEnd} onChange={e => setNewEnd(e.target.value)} style={inputStyle} /></div>
                            </div>
                            <input placeholder="Kategóriák (pl: Természet, Portré) - vesszővel elválasztva" value={newCats} onChange={e => setNewCats(e.target.value)} style={inputStyle} />
                            <select value={newRestrictedClub} onChange={e => setNewRestrictedClub(e.target.value)} style={{...inputStyle, border: '1px solid #f59e0b'}}>
                              <option value="">🔓 Nyilvános pályázat (Bárki nevezhet)</option>
                              {clubs.map(c => <option key={c.id} value={c.name}>🔒 Zártkörű: {c.name}</option>)}
                            </select>
                            <button onClick={handleCreateContest} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Létrehozás</button>
                          </div>
                        )}

                        <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>
                          {activeTab === 'admin_contests' ? 'Összes Pályázat (Admin)' : activeTab === 'contests_club_active' ? `Klubom Aktív Pályázatai (${currentDbUser?.club_name})` : activeTab === 'contests_closed' ? 'Lezárult Pályázatok' : 'Nyílt Aktív Fotópályázatok'}
                        </h2>
                        
                        {filteredContests.length === 0 ? (
                           <p style={{ color: '#94a3b8' }}>Jelenleg nincsenek pályázatok ebben a kategóriában.</p>
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

                            const canManageContest = user.email === ADMIN_EMAIL || (isLeader && contest.restricted_club === currentDbUser?.club_name);
                            const expectedVotes = (contest.entry_count || 0) * (contest.jury_count || 0);
                            const isJudgingComplete = contest.entry_count > 0 ? (expectedVotes > 0 && contest.vote_count >= expectedVotes) : true;
                            
                            const badgeText = isActive ? 'Aktív Pályázat' : isEnded ? (isJudgingComplete ? 'Lezárult' : 'Zsűrizés alatt') : 'Hamarosan indul';
                            const badgeColor = isActive ? '#10b981' : isEnded ? (isJudgingComplete ? '#ef4444' : '#a78bfa') : '#f59e0b';
                            const badgeBg = isActive ? '#10b98120' : isEnded ? (isJudgingComplete ? '#ef444420' : '#a78bfa20') : '#f59e0b20';

                            return (
                              <div key={contest.id} style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: `1px solid ${badgeColor}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', position: 'relative' }}>
                                
                                {contest.restricted_club && (
                                  <div className="contest-badge" style={{ position: 'absolute', top: '-12px', left: '20px', background: '#f59e0b', color: '#0f172a', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                    🔒 Zártkörű: {contest.restricted_club}
                                  </div>
                                )}

                                {viewJuryProgressId === contest.id ? (
                                  <div style={{ background: '#0f172a', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #a78bfa' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '20px' }}>
                                      <h3 style={{ margin: 0, color: '#a78bfa' }}>📈 Zsűrizés állása: {contest.title}</h3>
                                      <button onClick={() => setViewJuryProgressId(null)} style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #475569', padding: '5px 15px', borderRadius: '6px', cursor: 'pointer' }}>Bezár</button>
                                    </div>
                                    <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '1.1rem' }}>
                                      Összes beküldött kép: <strong style={{color: '#f8fafc'}}>{juryProgressData.total_entries} db</strong>
                                    </div>
                                    {juryProgressData.stats.length === 0 ? (
                                      <p style={{ color: '#94a3b8' }}>Nincs zsűritag kijelölve.</p>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {juryProgressData.stats.map((stat: any) => {
                                          const userObj = allUsers.find(u => u.email === stat.user_email);
                                          const name = userObj ? userObj.name : stat.user_email;
                                          const remaining = juryProgressData.total_entries - stat.voted_count;
                                          const percent = juryProgressData.total_entries > 0 ? Math.round((stat.voted_count / juryProgressData.total_entries) * 100) : 0;
                                          
                                          return (
                                            <div key={stat.user_email} style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <strong style={{ color: '#f8fafc' }}>{name}</strong>
                                                <span style={{ color: remaining <= 0 ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
                                                  {remaining <= 0 ? 'Kész' : `${remaining} kép van hátra`}
                                                </span>
                                              </div>
                                              <div style={{ width: '100%', background: '#0f172a', borderRadius: '100px', height: '10px', overflow: 'hidden' }}>
                                                <div style={{ width: `${percent}%`, background: remaining <= 0 ? '#10b981' : '#a78bfa', height: '100%', transition: 'width 0.3s' }}></div>
                                              </div>
                                              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '8px', textAlign: 'right' }}>
                                                {stat.voted_count} / {juryProgressData.total_entries} értékelve
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                ) : manageJuryContestId === contest.id ? (
                                   <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px' }}>
                                      <h4 style={{marginTop: 0, color: '#a78bfa'}}>⚖️ Zsűri kezelése</h4>
                                      <div style={{display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap'}}><select value={selectedJuryEmail} onChange={e => setSelectedJuryEmail(e.target.value)} style={{...inputStyle, marginBottom: 0, flex: '1 1 200px'}}><option value="">-- Válassz usert --</option>{allUsers.filter(u => !contestJury.some(j => j.user_email === u.email)).map(u => (<option key={u.email} value={u.email}>{u.name} ({u.email})</option>))}</select><button onClick={() => handleAddJury(contest.id)} style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer' }}>Hozzáadás</button></div>
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
                                    <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                                      <div style={{flex: '1 1 200px'}}><label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Kezdés</label><input type="datetime-local" value={editStart} onChange={e => setEditStart(e.target.value)} style={inputStyle} /></div>
                                      <div style={{flex: '1 1 200px'}}><label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Befejezés</label><input type="datetime-local" value={editEnd} onChange={e => setEditEnd(e.target.value)} style={inputStyle} /></div>
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
                                       <span className="contest-badge" style={{ background: '#1e293b', color: '#94a3b8' }}>Hátralévő: {unvotedEntries.length} db</span>
                                    </div>
                                    
                                    {unvotedEntries.length > 0 ? (
                                      <div>
                                        {(() => {
                                          const currentEntry = unvotedEntries[0];
                                          const imageUrl = getImageUrl(currentEntry.drive_file_id, currentEntry.file_url);
                                          return (
                                            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px' }}>
                                              <h4 style={{ margin: '0 0 10px 0', fontSize: '1.6rem', color: '#f8fafc' }}>{currentEntry.title || "Névtelen kép"}</h4>
                                              <div style={{ display: 'inline-block', background: '#38bdf820', color: '#38bdf8', padding: '6px 16px', borderRadius: '100px', fontSize: '0.9rem', marginBottom: '25px', fontWeight: 'bold' }}>Kategória: {currentEntry.category || "Ismeretlen"}</div>
                                              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', marginBottom: '30px', minHeight: '350px', background: '#0f172a', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
                                                <img src={imageUrl} alt={currentEntry.title} onClick={() => setFullscreenData({url: imageUrl, title: currentEntry.title})} style={{ maxHeight: '600px', maxWidth: '100%', objectFit: 'contain', cursor: 'zoom-in', width: '100%' }} />
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
                                                  <img src={getImageUrl(res.drive_file_id, res.file_url)} alt="Kép" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', marginRight: '15px', cursor: 'pointer' }} onClick={() => setFullscreenData({url: getImageUrl(res.drive_file_id, res.file_url), title: res.title})} />
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
                                    <div className="contest-header">
                                      <div>
                                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', paddingTop: contest.restricted_club ? '10px' : '0' }}>
                                          <h3 style={{ margin: '0' }}>
                                            {contest.title}
                                          </h3>
                                          
                                          <span className="contest-badge" style={{ background: badgeBg, color: badgeColor, marginLeft: '10px' }}>
                                            {badgeText}
                                          </span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '10px' }}>
                                          {canManageContest && (
                                            <>
                                              <button onClick={() => loadStats(contest.id)} style={{ background: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>📊 Nevezők</button>
                                              {contestJury.length > 0 && (
                                                <button onClick={() => loadJuryProgress(contest.id)} style={{ background: 'transparent', border: '1px solid #a78bfa', color: '#a78bfa', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>📈 Zsűrizés állása</button>
                                              )}
                                              {user.email === ADMIN_EMAIL && activeTab === 'admin_contests' && (
                                                <>
                                                  <button onClick={() => startEdit(contest)} style={{ background: 'transparent', border: '1px solid #f59e0b', color: '#f59e0b', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>Szerkesztés</button>
                                                  <button onClick={() => setManageJuryContestId(contest.id)} style={{ background: 'transparent', border: '1px solid #8b5cf6', color: '#8b5cf6', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>Zsűri ({contestJury.length})</button>
                                                  <button onClick={() => handleDeleteContest(contest.id)} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>Törlés</button>
                                                </>
                                              )}
                                            </>
                                          )}
                                          {isEnded && contest.entry_count > 0 && (canManageContest || isJudgingComplete) && (
                                            <button onClick={() => loadResults(contest.id)} style={{ background: '#10b981', border: 'none', color: 'white', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>🏆 Eredmények</button>
                                          )}
                                        </div>

                                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '10px 0 15px 0', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{contest.description}</p>
                                      </div>
                                    </div>
                                    <p style={{fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 15px 0'}}>📅 {start.getFullYear() > 1970 ? `${start.toLocaleDateString()} - ${end.toLocaleDateString()}` : 'Nincs dátum megadva'}</p>

                                    {contestJury.length > 0 && (
                                      <div style={{ fontSize: '0.85rem', color: '#a78bfa', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span>⚖️ <strong>Zsűri:</strong> {contestJury.map(j => allUsers.find(u => u.email === j.user_email)?.name || j.user_email).join(', ')}</span>
                                      </div>
                                    )}

                                    {isUserJury && (
                                      <div style={{ background: 'linear-gradient(to right, #f59e0b20, #0f172a)', borderLeft: '4px solid #f59e0b', color: '#f8fafc', padding: '15px 20px', borderRadius: '0 8px 8px 0', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
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
                                        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}><button onClick={() => handleUpload(contest.id)} disabled={isUploading} style={{ flex: '1 1 150px', background: isUploading ? '#475569' : '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: isUploading ? 'not-allowed' : 'pointer', fontWeight: 'bold', transition: 'background 0.3s' }}>{isUploading ? 'Feltöltés ⏳...' : 'Beküldés 🚀'}</button><button onClick={() => { setActiveUploadContest(null); setUploadPreview(null); }} disabled={isUploading} style={{ flex: '1 1 100px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '12px', borderRadius: '8px', cursor: isUploading ? 'not-allowed' : 'pointer' }}>Mégse</button></div>
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
                                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
                                                {catEntries.map(entry => {
                                                  const imageUrl = getImageUrl(entry.drive_file_id, entry.file_url);
                                                  return (
                                                    <div key={entry.id} style={{ background: '#0f172a', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                                                      <img src={imageUrl} alt={entry.title} onClick={() => setFullscreenData({url: imageUrl, title: entry.title})} style={{ width: '100%', height: '140px', objectFit: 'cover', backgroundColor: '#1e293b', cursor: 'zoom-in' }} />
                                                      
                                                      {editingEntryId === entry.id ? (
                                                        <div style={{ padding: '12px' }}>
                                                          <input 
                                                            value={editEntryTitle} 
                                                            onChange={e => setEditEntryTitle(e.target.value)} 
                                                            style={{ width: '100%', padding: '6px', marginBottom: '10px', backgroundColor: '#1e293b', border: '1px solid #38bdf8', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} 
                                                          />
                                                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                                            <button onClick={() => handleUpdateEntryTitle(entry.id)} style={{ flex: '1 1 100%', background: '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Mentés</button>
                                                            <button onClick={() => setEditingEntryId(null)} style={{ flex: '1 1 100%', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Mégse</button>
                                                          </div>
                                                        </div>
                                                      ) : (
                                                        <div style={{ padding: '12px' }}>
                                                          <div style={{ fontSize: '1rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#f8fafc' }}>{entry.title}</div>
                                                          {!isEnded && (
                                                            <div style={{ display: 'flex', gap: '5px', marginTop: '12px', flexWrap: 'wrap' }}>
                                                              <button onClick={() => { setEditingEntryId(entry.id); setEditEntryTitle(entry.title); }} style={{ flex: '1 1 45%', background: '#38bdf820', color: '#38bdf8', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Szerkeszt</button>
                                                              <button onClick={() => handleDeleteEntry(entry.id)} style={{ flex: '1 1 45%', background: '#ef444420', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Törlés</button>
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
              </>
            )}
          </main>
        </div>
      )}
    </GoogleOAuthProvider>
  );
}

export default App;
