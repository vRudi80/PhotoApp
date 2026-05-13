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
import SalonsView from './views/SalonsView';
import ClubNightsView from './views/ClubNightsView';
import ClubHomeworksView from './views/ClubHomeworksView';
import AdminClubsView from './views/admin/AdminClubsView';
import AdminUsersView from './views/admin/AdminUsersView';
import AdminMeetingsView from './views/admin/AdminMeetingsView';
import AdminHomeworksView from './views/admin/AdminHomeworksView';
import AdminSalonsView from './views/admin/AdminSalonsView';
import ContestsView from './views/ContestsView';

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
  <AdminClubsView 
    clubs={clubs} 
    newClubName={newClubName} 
    setNewClubName={setNewClubName} 
    handleAddClub={handleAddClub} 
    handleDeleteClub={handleDeleteClub} 
  />
)}

{activeTab === 'admin_users' && user.email === ADMIN_EMAIL && (
  <AdminUsersView 
    allUsers={allUsers} 
    clubs={clubs} 
    userClubEdits={userClubEdits} 
    setUserClubEdits={setUserClubEdits} 
    userRoleEdits={userRoleEdits} 
    setUserRoleEdits={setUserRoleEdits} 
    saveUserClub={saveUserClub} 
  />
)}

                {activeTab === 'admin_meetings' && (user.email === ADMIN_EMAIL || isLeader) && (
  <AdminMeetingsView 
    user={user} currentDbUser={currentDbUser} clubs={clubs} meetings={meetings} 
    allUsers={allUsers} adminMeetings={adminMeetings} editMeetId={editMeetId} 
    meetClubId={meetClubId} setMeetClubId={setMeetClubId} meetDate={meetDate} 
    setMeetDate={setMeetDate} meetTime={meetTime} setMeetTime={setMeetTime} 
    meetTopic={meetTopic} setMeetTopic={setMeetTopic} meetDesc={meetDesc} 
    setMeetDesc={setMeetDesc} meetLocType={meetLocType} setMeetLocType={setMeetLocType} 
    meetLocDetails={meetLocDetails} setMeetLocDetails={setMeetLocDetails} 
    meetVideoLink={meetVideoLink} setMeetVideoLink={setMeetVideoLink} 
    meetCoverPreview={meetCoverPreview} isMeetingUploading={isMeetingUploading} 
    clearMeetingForm={clearMeetingForm} handleMeetingCoverSelect={handleMeetingCoverSelect} 
    handleSaveMeeting={handleSaveMeeting} startEditMeeting={startEditMeeting} 
    handleDeleteMeeting={handleDeleteMeeting} attendanceMeetId={attendanceMeetId} 
    setAttendanceMeetId={setAttendanceMeetId} attendanceList={attendanceList} 
    openAttendance={openAttendance} toggleAttendance={toggleAttendance} 
    saveAttendance={saveAttendance}
  />
)}

                {activeTab === 'admin_homeworks' && (user.email === ADMIN_EMAIL || isLeader) && (
  <AdminHomeworksView 
    user={user} currentDbUser={currentDbUser} clubs={clubs} adminHomeworks={adminHomeworks}
    editHwId={editHwId} hwClubId={hwClubId} setHwClubId={setHwClubId}
    hwTopic={hwTopic} setHwTopic={setHwTopic} hwDesc={hwDesc} setHwDesc={setHwDesc}
    hwDeadline={hwDeadline} setHwDeadline={setHwDeadline} hwMaxImages={hwMaxImages}
    setHwMaxImages={setHwMaxImages} clearHwForm={clearHwForm} handleSaveHw={handleSaveHw}
    startEditHw={startEditHw} handleDeleteHw={handleDeleteHw}
  />
)}
               {activeTab === 'admin_salons' && user.email === ADMIN_EMAIL && (
  <AdminSalonsView 
    salonName={salonName} setSalonName={setSalonName}
    salonType={salonType} setSalonType={setSalonType}
    salonCountry={salonCountry} setSalonCountry={setSalonCountry}
    countries={countries} salonFee={salonFee} setSalonFee={setSalonFee}
    salonCurrency={salonCurrency} setSalonCurrency={setSalonCurrency}
    salonWeb={salonWeb} setSalonWeb={setSalonWeb}
    salonStart={salonStart} setSalonStart={setSalonStart}
    salonEnd={salonEnd} setSalonEnd={setSalonEnd}
    salonResults={salonResults} setSalonResults={setSalonResults}
    salonIsCircuit={salonIsCircuit} setSalonIsCircuit={setSalonIsCircuit}
    salonCircuitNum={salonCircuitNum} setSalonCircuitNum={setSalonCircuitNum}
    salonAwards={salonAwards} setSalonAwards={setSalonAwards}
    salonCash={salonCash} setSalonCash={setSalonCash}
    allCategories={allCategories} salonSelectedCats={salonSelectedCats}
    setSalonSelectedCats={setSalonSelectedCats} patrons={patrons}
    salonSelectedPatrons={salonSelectedPatrons} setSalonSelectedPatrons={setSalonSelectedPatrons}
    toggleArrayItem={toggleArrayItem} handleSaveSalon={handleSaveSalon}
    sortedSalons={sortedSalons} setSelectedSalon={setSelectedSalon}
    handleDeleteSalon={handleDeleteSalon}
  />
)}

                {activeTab === 'salons' && (
  <SalonsView 
    salonSearch={salonSearch} 
    setSalonSearch={setSalonSearch} 
    searchedSalons={searchedSalons} 
    setSelectedSalon={setSelectedSalon} 
  />
)}

               {activeTab === 'club_nights' && (
  <ClubNightsView 
    currentDbUser={currentDbUser} 
    meetingSearch={meetingSearch} 
    setMeetingSearch={setMeetingSearch} 
    searchedMeetings={searchedMeetings} 
    setActiveVideo={setActiveVideo} 
  />
)}

               {activeTab === 'club_homeworks' && (
  <ClubHomeworksView 
    currentDbUser={currentDbUser}
    myClubHomeworks={myClubHomeworks}
    myHomeworkEntries={myHomeworkEntries}
    clubHomeworkEntries={clubHomeworkEntries}
    isLeader={!!isLeader}
    activeUploadHw={activeUploadHw}
    setActiveUploadHw={setActiveUploadHw}
    hwUploadTitle={hwUploadTitle}
    setHwUploadTitle={setHwUploadTitle}
    isHwUploading={isHwUploading}
    hwUploadPreview={hwUploadPreview}
    setHwUploadPreview={setHwUploadPreview}
    handleHwFileSelect={handleHwFileSelect}
    handleUploadHw={handleUploadHw}
    setFullscreenData={setFullscreenData}
    editingHwEntryId={editingHwEntryId}
    setEditingHwEntryId={setEditingHwEntryId}
    editHwEntryTitle={editHwEntryTitle}
    setEditHwEntryTitle={setEditHwEntryTitle}
    handleUpdateHwEntryTitle={handleUpdateHwEntryTitle}
    handleDeleteHwEntry={handleDeleteHwEntry}
    handleToggleLike={handleToggleLike}
  />
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
