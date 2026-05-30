import { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import { GOOGLE_CLIENT_ID, BACKEND_URL, ADMIN_EMAIL } from './utils/constants';
import { getImageUrl } from './utils/helpers';
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
import MyAlbumView from './views/MyAlbumView';
import AdminSettingsView from './views/admin/AdminSettingsView';
import FiapProgressView from './views/FiapProgressView';
import SessionGuard from './components/SessionGuard';
import MapSpotsView from './views/MapSpotsView';
import DashboardView from './views/DashboardView';
import WeeklyChallengeView from './views/WeeklyChallengeView';
import AdminWeeklyView from './views/admin/AdminWeeklyView';
import ClubNewsView from './views/ClubNewsView';
import MafoszProgressView from './views/MafoszProgressView'; 
import PackagesView from './components/PackagesView'; 

function App() {
  const [user, setUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [targetMapSpotId, setTargetMapSpotId] = useState<number | null>(null);
  const [clubs, setClubs] = useState<any[]>([]);

  const [salonPatronNumbers, setSalonPatronNumbers] = useState<Record<number, string>>({});
  const [userEntrySalonIds, setUserEntrySalonIds] = useState<number[]>([]);
  
  const [contestPayments, setContestPayments] = useState<any[]>([]);
  const [myJudgedContests, setMyJudgedContests] = useState<any[]>([]);
  
  const [contests, setContests] = useState<any[]>([]);
  const [myEntries, setMyEntries] = useState<any[]>([]);
  const [juryList, setJuryList] = useState<any[]>([]);
  
  const [meetings, setMeetings] = useState<any[]>([]);
  
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [myHomeworkEntries, setMyHomeworkEntries] = useState<any[]>([]);
  const [clubHomeworkEntries, setClubHomeworkEntries] = useState<any[]>([]); 
  
  const [salons, setSalons] = useState<any[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
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
  const [editSalonId, setEditSalonId] = useState<number | null>(null);
  
  const [selectedSalon, setSelectedSalon] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [dropdownOpen, setDropdownOpen] = useState<'contests' | 'club' | 'admin' | 'progress' | null>(null);

  const [userClubEdits, setUserClubEdits] = useState<Record<string, string>>({});
  const [userRoleEdits, setUserRoleEdits] = useState<Record<string, string>>({});
  const [newClubName, setNewClubName] = useState('');

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategorySettings, setNewCategorySettings] = useState<Record<string, any>>({});

  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newCats, setNewCats] = useState('');
  const [newRestrictedClub, setNewRestrictedClub] = useState(''); 
  
  const [newEntryFee, setNewEntryFee] = useState<number | string>(0);
  const [newFeeCurrency, setNewFeeCurrency] = useState('HUF');

  const [editContestId, setEditContestId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editCats, setEditCats] = useState('');
  const [editRestrictedClub, setEditRestrictedClub] = useState(''); 

  const [editEntryFee, setEditEntryFee] = useState<number | string>(0);
  const [editFeeCurrency, setEditFeeCurrency] = useState('HUF');
  const [editCategorySettings, setEditCategorySettings] = useState<Record<string, any>>({});

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

  const [fullscreenData, setFullscreenData] = useState<any>(null);

  // ==========================================
  // --- INAKTIVITÁS FIGYELŐ (AUTO-LOGOUT) ---
  // ==========================================
  useEffect(() => {
    if (!user) return; 

    const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 perc
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        localStorage.removeItem('photoAppToken');
        setUser(null);
        alert("Biztonsági okokból automatikusan kijelentkeztettünk az inaktivitás miatt.");
      }, INACTIVITY_LIMIT_MS);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    
    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      clearTimeout(timeoutId);
    };
  }, [user]);

  // ==========================================
  // --- ABLAK FÓKUSZ ÉS ADATFRISSÍTÉS ---
  // ==========================================
  useEffect(() => {
    if (!user) return;

    const handleFocus = () => {
      fetch(`${BACKEND_URL}/api/auth/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, name: user.name, sub: user.sub || user.googleId || 'silent-sync' })
      }).then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            setUser((prev: any) => ({
              ...prev,
              isPremium: data.isPremium,
              premiumLevel: data.premiumLevel,
              premiumUntil: data.premiumUntil
            }));
          }
        }).catch(console.error);

      fetchData(); 
      fetchMyEntries(user.email);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const successContest = urlParams.get('success_contest');
    if (successContest) {
      alert('🎉 Sikeres nevezési díj fizetés! A képeid érvényesek és a zsűri elé kerülnek.');
      window.history.replaceState({}, document.title, window.location.pathname + '?tab=contests_open_active');
      setActiveTab('contests_open_active'); 
    }
  }, []);

  const fetchData = async (retryCount = 0) => {
    if (retryCount === 0) setIsInitialLoading(true);
    try {
      const [resUsers, resClubs] = await Promise.all([
        fetch(`${BACKEND_URL}/api/users`),
        fetch(`${BACKEND_URL}/api/clubs`),
      ]);

      if (!resUsers.ok) throw new Error("Adatbázis hiba");

      if (resUsers.ok) setAllUsers(await resUsers.json());
      if (resClubs.ok) setClubs(await resClubs.json());

      setIsInitialLoading(false); 

      Promise.all([
        fetch(`${BACKEND_URL}/api/contests`).then(r => r.ok && r.json().then(setContests)),
        fetch(`${BACKEND_URL}/api/jury`).then(r => r.ok && r.json().then(setJuryList)),
        fetch(`${BACKEND_URL}/api/meetings`).then(r => r.ok && r.json().then(setMeetings)),
        fetch(`${BACKEND_URL}/api/homeworks`).then(r => r.ok && r.json().then(setHomeworks)),
        fetch(`${BACKEND_URL}/api/countries`).then(r => r.ok && r.json().then(setCountries)),
        fetch(`${BACKEND_URL}/api/categories`).then(r => r.ok && r.json().then(setAllCategories)),
        fetch(`${BACKEND_URL}/api/patrons`).then(r => r.ok && r.json().then(setPatrons)),
        fetch(`${BACKEND_URL}/api/salons`).then(r => r.ok && r.json().then(setSalons)),
        fetch(`${BACKEND_URL}/api/contest-payments`).then(r => r.ok && r.json().then(setContestPayments))
      ]).catch(e => console.error("Háttér letöltési hiba:", e));

    } catch (e) { 
      console.error("Adatlekérési hiba, újrapróbálkozás...", e); 
      if (retryCount < 3) {
        setTimeout(() => fetchData(retryCount + 1), 1500); 
      } else {
        setIsInitialLoading(false);
        alert("Átmeneti hálózati hiba történt az adatbázisban. Kérlek frissítsd az oldalt (F5)!");
      }
    }
  };
  
  const fetchMyEntries = async (email: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/my-entries?userEmail=${email}`);
      if (res.ok) setMyEntries(await res.json());
      
      const resHw = await fetch(`${BACKEND_URL}/api/my-homework-entries?userEmail=${email}`);
      if (resHw.ok) setMyHomeworkEntries(await resHw.json());
      
      const resSalons = await fetch(`${BACKEND_URL}/api/my-salon-entries-status?userEmail=${email}`);
      if (resSalons.ok) setUserEntrySalonIds(await resSalons.json());

      const resJudged = await fetch(`${BACKEND_URL}/api/my-judged-contests?userEmail=${email}`);
      if (resJudged.ok) setMyJudgedContests(await resJudged.json());
    } catch (e) { console.error(e); }
  };
  
  const fetchClubHomeworkEntries = async (clubId: number, email: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/homework-entries/club/${clubId}?userEmail=${email}`);
      if (res.ok) setClubHomeworkEntries(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isSuccess = urlParams.get('success');

    if (isSuccess) {
      window.history.replaceState(null, '', window.location.pathname);
      alert('🎉 Sikeres aktiválás! Kérlek várj pár másodpercet, amíg a rendszer frissíti a fiókodat...');
    }

    const storedToken = localStorage.getItem('photoAppToken');
    if (storedToken) {
      try {
        const decoded: any = jwtDecode(storedToken);
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('photoAppToken');
          setIsAuthLoading(false);
        } else {
          setUser(decoded);
          setIsAuthLoading(false);

          const delay = isSuccess ? 2500 : 0;
          setTimeout(() => {
            fetch(`${BACKEND_URL}/api/auth/sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: decoded.email, name: decoded.name, sub: decoded.sub })
            })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if(data) {
                    setUser((prev: any) => ({
                        ...prev,
                        isPremium: data.isPremium,
                        is_premium: data.isPremium,
                        premiumUntil: data.premiumUntil,
                        premiumLevel: data.premiumLevel,
                        premium_level: data.premiumLevel
                    }));
                }
            })
            .catch(err => console.error("Sync hiba:", err));

            fetchMyEntries(decoded.email);
            fetchData();
          }, delay);
        }
      } catch (e) { 
        localStorage.removeItem('photoAppToken'); 
        setIsAuthLoading(false);
      }
    } else {
      setIsAuthLoading(false);
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
    
    fetch(`${BACKEND_URL}/api/auth/sync`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ email: decoded.email, name: decoded.name, sub: decoded.sub }) 
    })
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data) {
        setUser((prev: any) => ({
          ...prev,
          isPremium: data.isPremium,
          is_premium: data.isPremium, 
          premiumUntil: data.premiumUntil,
          premiumLevel: data.premiumLevel,
          premium_level: data.premiumLevel
        }));
      }
    })
    .catch(console.error);
    
    fetchMyEntries(decoded.email);
    fetchData(); 
  };

  const handlePayContestFee = async (contestId: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/create-contest-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userEmail: user.email, 
          contestId: contestId,
          returnUrl: window.location.origin
        })
      });
      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Hiba a fizetés indításakor.');
      }
    } catch (e) {
      alert('Hálózati hiba a Stripe elérésekor!');
    }
  };

  const handleAddClub = async () => { if (!newClubName) return; const res = await fetch(`${BACKEND_URL}/api/clubs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newClubName }) }); if (res.ok) { setNewClubName(''); fetchData(); } };
  const handleDeleteClub = async (id: number) => { if (!window.confirm("Biztosan törlöd ezt a klubot?")) return; const res = await fetch(`${BACKEND_URL}/api/clubs/${id}`, { method: 'DELETE' }); if (res.ok) fetchData(); };
  
  const saveUserClub = async (email: string) => { 
    const clubName = userClubEdits[email] !== undefined ? userClubEdits[email] : (allUsers.find(u => u.email === email)?.club_name || ''); 
    const clubRole = userRoleEdits[email] !== undefined ? userRoleEdits[email] : (allUsers.find(u => u.email === email)?.club_role || 'member');
    const res = await fetch(`${BACKEND_URL}/api/users/${email}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clubName, clubRole }) }); 
    if (res.ok) { alert("Sikeres mentés!"); fetchData(); } 
  };
  
  const handleCreateContest = async () => { 
    if (!newTitle || !newStart || !newEnd || !newCats) return alert("Cím, dátumok és kategóriák kötelezőek!"); 

    let finalRestrictedClub = newRestrictedClub;
    if (user.email !== ADMIN_EMAIL) {
      finalRestrictedClub = currentDbUser?.club_name || '';
      if (!finalRestrictedClub) {
        return alert("Hiba: Nem vagy klubhoz rendelve, így nem írhatsz ki pályázatot!");
      }
    }

    const res = await fetch(`${BACKEND_URL}/api/contests`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        title: newTitle, 
        description: newDesc, 
        startDate: newStart, 
        endDate: newEnd, 
        categories: newCats, 
        restrictedClub: finalRestrictedClub,
        entryFee: newEntryFee,
        feeCurrency: newFeeCurrency,
        categorySettings: newCategorySettings
      }) 
    }); 

    if (res.ok) { 
      setNewTitle(''); setNewDesc(''); setNewStart(''); setNewEnd(''); setNewCats(''); setNewRestrictedClub(''); 
      setNewEntryFee(0); setNewFeeCurrency('HUF'); 
      fetchData(); 
      alert("Pályázat sikeresen kiírva! 🚀");
    } else {
      alert("Hiba történt a mentés során.");
    }
  };

  const startEdit = (contest: any) => { 
    setEditContestId(contest.id); 
    setEditTitle(contest.title); 
    setEditDesc(contest.description); 
    setEditCats(contest.categories || ''); 
    setEditRestrictedClub(contest.restricted_club || ''); 
    setEditEntryFee(contest.entry_fee || 0);
    setEditFeeCurrency(contest.fee_currency || 'HUF');
    
    const formatDate = (dateStr: string | null) => { 
      if (!dateStr) return ''; 
      return dateStr.replace('Z', '').substring(0, 16);
    }; 
    try {
      setEditCategorySettings(typeof contest.category_settings === 'string' ? JSON.parse(contest.category_settings) : (contest.category_settings || {}));
    } catch(e) { setEditCategorySettings({}); }

    setEditStart(formatDate(contest.start_date)); 
    setEditEnd(formatDate(contest.end_date)); 
  };

  const handleUpdateContest = async () => { 
    const res = await fetch(`${BACKEND_URL}/api/contests/${editContestId}`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        title: editTitle, 
        description: editDesc, 
        startDate: editStart || null, 
        endDate: editEnd || null, 
        categories: editCats, 
        restrictedClub: editRestrictedClub,
                entryFee: editEntryFee,
        feeCurrency: editFeeCurrency,
        categorySettings: editCategorySettings
      }) 
    }); 
    if (res.ok) { 
      setEditContestId(null); 
      fetchData(); 
      alert("Pályázat sikeresen frissítve!"); 
    } 
  };

  const handleAddJury = async (contestId: number) => { if (!selectedJuryEmail) return; const res = await fetch(`${BACKEND_URL}/api/jury`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contestId, userEmail: selectedJuryEmail }) }); if (res.ok) { setSelectedJuryEmail(''); fetchData(); } };
  const handleRemoveJury = async (contestId: number, email: string) => { const res = await fetch(`${BACKEND_URL}/api/jury`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contestId, userEmail: email }) }); if (res.ok) fetchData(); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { setUploadFile(file); setUploadPreview(URL.createObjectURL(file)); } };
  
  const handleUpload = async (contestId: number) => { 
    if (!uploadFile || !uploadTitle || !uploadCategory) return alert("Minden kötelező!"); 
    setIsUploading(true); 
    try { 
      const formData = new FormData(); 
      formData.append('photo', uploadFile); 
      formData.append('contestId', String(contestId)); 
      formData.append('userEmail', user.email); 
      formData.append('userName', user.name); 
      formData.append('title', uploadTitle); 
      formData.append('category', uploadCategory); 
      const res = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: formData }); 
      if (res.ok) { 
        alert("Feltöltve!"); setActiveUploadContest(null); setUploadFile(null); setUploadPreview(null); setUploadTitle(''); setUploadCategory(''); fetchMyEntries(user.email); 
      } else { 
        const err = await res.json(); alert(`Hiba: ${err.error}`); 
      } 
    } catch (error) { 
      alert("Hiba"); 
    } finally { 
      setIsUploading(false); 
    } 
  };

  const handleUpdateEntryTitle = async (entryId: number) => { if (!editEntryTitle) return alert('A cím nem lehet üres!'); const res = await fetch(`${BACKEND_URL}/api/entries/${entryId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: editEntryTitle, userEmail: user.email }) }); if (res.ok) { setEditingEntryId(null); fetchMyEntries(user.email); } else alert('Hiba a cím frissítésekor!'); };
  const handleDeleteEntry = async (entryId: number) => { if (!window.confirm("Biztosan törlöd?")) return; const res = await fetch(`${BACKEND_URL}/api/entries/${entryId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEmail: user.email }) }); if (res.ok) fetchMyEntries(user.email); };
  const startJudging = async (contestId: number) => { const res = await fetch(`${BACKEND_URL}/api/jury-entries/${contestId}?userEmail=${user.email}`); if (res.ok) { setUnvotedEntries(await res.json()); setJudgingContestId(contestId); setCurrentScore(''); } };
  const submitVote = async () => { 
    const score = Number(currentScore); 
    if (score < 0 || score > 100 || currentScore === '') return alert("0 és 100 közötti pontszámot adj meg!"); 
    const res = await fetch(`${BACKEND_URL}/api/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entryId: unvotedEntries[0].id, juryEmail: user.email, score }) }); 
    
    if (res.ok) { 
      setUnvotedEntries(prev => prev.slice(1)); 
      setCurrentScore(''); 
      if (unvotedEntries.length === 1) { 
        fetchMyEntries(user.email);
        fetchData(); 
      }
    } 
  };
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

  const clearHwForm = () => { setEditHwId(null); setHwClubId(''); setHwTopic(''); setHwDesc(''); setHwDeadline(''); setHwMaxImages(4); };
  const startEditHw = (h: any) => { 
    setEditHwId(h.id); 
    setHwClubId(h.club_id.toString()); 
    setHwTopic(h.topic); 
    setHwDesc(h.description || ''); 
    setHwMaxImages(h.max_images || 4); 
    
    const formatDate = (dateStr: string) => { 
      if (!dateStr) return '';
      return dateStr.replace('Z', '').substring(0, 16); 
    }; 
    
    setHwDeadline(formatDate(h.deadline)); 
  };

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

  const clearSalonForm = () => { 
    setEditSalonId(null); 
    setSalonName(''); setSalonFee(''); setSalonCurrency('EUR'); setSalonStart(''); 
    setSalonEnd(''); setSalonWeb(''); setSalonResults(''); setSalonIsCircuit(false); 
    setSalonAwards(''); setSalonCash(''); setSalonCircuitNum(''); setSalonType('online'); 
    setSalonCountry(''); setSalonSelectedPatrons([]); setSalonSelectedCats([]); 
    setSalonPatronNumbers({});
  };

  const startEditSalon = (salon: any) => {
    setEditSalonId(salon.id);
    setSalonName(salon.name || '');
    setSalonType(salon.submission_type || 'online');
    setSalonCountry(salon.host_country_id?.toString() || '');
    setSalonFee(salon.fee_amount?.toString() || '');
    setSalonCurrency(salon.fee_currency || 'EUR');
    setSalonWeb(salon.website || '');
    
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '';
      try { return new Date(dateStr).toISOString().slice(0, 10); } catch(e) { return ''; }
    };
    
    setSalonStart(formatDate(salon.start_date));
    setSalonEnd(formatDate(salon.end_date));
    setSalonResults(formatDate(salon.results_date));
    setSalonIsCircuit(salon.is_circuit === 1);
    setSalonCircuitNum(salon.circuit_number || '');
    setSalonAwards(salon.awards_count?.toString() || '');
    setSalonCash(salon.cash_prize || '');

    if (salon.categories && allCategories.length > 0) {
      const catIds = allCategories.filter((c:any) => salon.categories.includes(c.name) || salon.categories.includes(c.hun_name)).map((c:any) => c.id);
      setSalonSelectedCats(catIds);
    } else setSalonSelectedCats([]);

    if (salon.patron_details && patrons.length > 0) {
      const pIds: number[] = [];
      const pNumbers: Record<number, string> = {};
      salon.patron_details.forEach((p: any) => {
        const patronObj = patrons.find(pat => pat.name === p.name);
        if (patronObj) {
          pIds.push(patronObj.id);
          pNumbers[patronObj.id] = p.number || '';
        }
      });
      setSalonSelectedPatrons(pIds);
      setSalonPatronNumbers(pNumbers);
    } else {
      setSalonSelectedPatrons([]);
      setSalonPatronNumbers({});
    }
  };

  const handleSaveSalon = async () => { 
    if (!salonName || !salonEnd) return alert("A Szalon neve és a záródátum megadása kötelező!"); 
    try { 
      const patronsData = salonSelectedPatrons.map(id => ({
        id: id,
        number: salonPatronNumbers[id] || ''
      }));

      const payload = { 
        name: salonName, feeAmount: salonFee, feeCurrency: salonCurrency, startDate: salonStart, 
        endDate: salonEnd, website: salonWeb, resultsDate: salonResults, isCircuit: salonIsCircuit, 
        awardsCount: salonAwards, cashPrize: salonCash, circuitNumber: salonCircuitNum, 
        submissionType: salonType, hostCountryId: salonCountry, 
        patronsData: patronsData,
        categoryIds: salonSelectedCats 
      }; 
      
      const url = editSalonId ? `${BACKEND_URL}/api/salons/${editSalonId}` : `${BACKEND_URL}/api/salons`;
      const method = editSalonId ? 'PUT' : 'POST';

      const res = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      }); 
      
      if (res.ok) { 
        alert(editSalonId ? "Szalon sikeresen frissítve!" : "Szalon sikeresen hozzáadva!"); 
        clearSalonForm(); 
        fetchData(); 
      } else alert("Hiba a mentés során."); 
    } catch (e) { alert("Hálózati hiba!"); } 
  };

  const handleDeleteSalon = async (id: number) => { if(!window.confirm("Biztosan törlöd ezt a Szalont?")) return; const res = await fetch(`${BACKEND_URL}/api/salons/${id}`, { method: 'DELETE' }); if(res.ok) fetchData(); };
  const toggleArrayItem = (arr: number[], setArr: Function, id: number) => { if (arr.includes(id)) setArr(arr.filter(item => item !== id)); else setArr([...arr, id]); };

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
      {fullscreenData && (
        <FullscreenModal 
          data={fullscreenData} 
          onClose={() => setFullscreenData(null)} 
          entryList={fullscreenData._entryList} 
          currentIndex={fullscreenData._currentIndex} 
          onNavigate={fullscreenData._onNavigate} 
          onToggleLike={fullscreenData._onToggleLike} 
        />
      )}
      
      {selectedSalon && <SalonModal salon={selectedSalon} user={user} onClose={() => setSelectedSalon(null)} />}
      {activeVideo && <VideoModal videoUrl={activeVideo} onClose={() => setActiveVideo(null)} />}

      {(isInitialLoading || isAuthLoading) ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#0f172a', color: '#60a5fa', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px', animation: 'spin 2s linear infinite' }}>⏳</div>
          <h2 style={{ color: '#f8fafc', margin: '0 0 10px 0' }}>Rendszer indítása...</h2>
          <p style={{ color: '#94a3b8' }}>Kérlek várj, amíg az adatok és jogosultságok szinkronizálódnak.</p>
        </div>
      ) : !user ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div className="app-container" style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
          
          <Header 
            user={user} 
            isLeader={!!isLeader} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            dropdownOpen={dropdownOpen} 
            setDropdownOpen={setDropdownOpen} 
            onLogout={() => { localStorage.removeItem('photoAppToken'); setUser(null); }} 
          />
          
          <main className="app-main">
            {activeTab === 'dashboard' && (
              <DashboardView 
                user={user} 
                isLeader={!!isLeader} 
                setActiveTab={setActiveTab}
                setTargetMapSpotId={setTargetMapSpotId}
              />
            )}

            {activeTab === 'weekly_challenge' && (
                <WeeklyChallengeView user={user} setFullscreenData={setFullscreenData} />
              )}
            
            {activeTab === 'packages' && (
              <PackagesView user={user} />
            )}

            {activeTab === 'map_spots' && (
              <MapSpotsView 
              user={user} 
              setFullscreenData={setFullscreenData}
              targetMapSpotId={targetMapSpotId} 
              setTargetMapSpotId={setTargetMapSpotId}
                />
            )}
            {activeTab === 'club_news' && (
              <ClubNewsView 
                user={user} 
                currentDbUser={currentDbUser} 
              />
            )}
            {activeTab === 'my_album' && (
              <MyAlbumView 
                user={user} 
                setFullscreenData={setFullscreenData} 
              />
            )}

            {activeTab === 'fiap_progress' && (
              <FiapProgressView user={user} allUsers={allUsers} />
            )}

            {activeTab === 'mafosz_progress' && (
              <MafoszProgressView user={user} allUsers={allUsers} />
            )}

            {activeTab === 'admin_clubs' && user.email === ADMIN_EMAIL && (
              <AdminClubsView 
                clubs={clubs} newClubName={newClubName} setNewClubName={setNewClubName} 
                handleAddClub={handleAddClub} handleDeleteClub={handleDeleteClub} 
              />
            )}

            {activeTab === 'admin_users' && user.email === ADMIN_EMAIL && (
              <AdminUsersView 
                allUsers={allUsers} clubs={clubs} userClubEdits={userClubEdits} 
                setUserClubEdits={setUserClubEdits} userRoleEdits={userRoleEdits} 
                setUserRoleEdits={setUserRoleEdits} saveUserClub={saveUserClub} 
              />
            )}
            {activeTab === 'admin_weekly' && user.email === ADMIN_EMAIL && (
              <AdminWeeklyView />
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
                salonPatronNumbers={salonPatronNumbers} setSalonPatronNumbers={setSalonPatronNumbers}
                toggleArrayItem={toggleArrayItem} handleSaveSalon={handleSaveSalon}
                sortedSalons={sortedSalons} setSelectedSalon={setSelectedSalon}
                handleDeleteSalon={handleDeleteSalon}
                editSalonId={editSalonId} startEditSalon={startEditSalon} clearSalonForm={clearSalonForm}
              />
            )}

            {activeTab === 'admin_settings' && user.email === ADMIN_EMAIL && (
              <AdminSettingsView />
            )}
            
            {activeTab === 'salons' && (
                <SalonsView 
                  salonSearch={salonSearch}
                  setSalonSearch={setSalonSearch}
                  searchedSalons={searchedSalons}
                  setSelectedSalon={setSelectedSalon}
                  userEntrySalonIds={userEntrySalonIds}
                  user={user}
                  BACKEND_URL={BACKEND_URL} 
                />
            )}

            {activeTab === 'club_nights' && (
              <ClubNightsView 
                currentDbUser={currentDbUser} meetingSearch={meetingSearch} 
                setMeetingSearch={setMeetingSearch} searchedMeetings={searchedMeetings} 
                setActiveVideo={setActiveVideo} 
              />
            )}

            {activeTab === 'club_homeworks' && (
              <ClubHomeworksView 
                currentDbUser={currentDbUser} myClubHomeworks={myClubHomeworks}
                myHomeworkEntries={myHomeworkEntries} clubHomeworkEntries={clubHomeworkEntries}
                isLeader={!!isLeader} activeUploadHw={activeUploadHw}
                setActiveUploadHw={setActiveUploadHw} hwUploadTitle={hwUploadTitle}
                setHwUploadTitle={setHwUploadTitle} isHwUploading={isHwUploading}
                hwUploadPreview={hwUploadPreview} setHwUploadPreview={setHwUploadPreview}
                handleHwFileSelect={handleHwFileSelect} handleUploadHw={handleUploadHw}
                setFullscreenData={setFullscreenData} editingHwEntryId={editingHwEntryId}
                setEditingHwEntryId={setEditingHwEntryId} editHwEntryTitle={editHwEntryTitle}
                setEditHwEntryTitle={setEditHwEntryTitle} handleUpdateHwEntryTitle={handleUpdateHwEntryTitle}
                handleDeleteHwEntry={handleDeleteHwEntry} handleToggleLike={handleToggleLike}
              />
            )}

            {['contests_open_active', 'contests_club_active', 'contests_closed', 'admin_contests'].includes(activeTab) && (
              <ContestsView
                activeTab={activeTab} user={user} currentDbUser={currentDbUser} isLeader={!!isLeader}
                clubs={clubs} allUsers={allUsers} filteredContests={filteredContests}
                myEntries={myEntries} juryList={juryList} newTitle={newTitle}
                setNewTitle={setNewTitle} newDesc={newDesc} setNewDesc={setNewDesc}
                newStart={newStart} setNewStart={setNewStart} newEnd={newEnd}
                setNewEnd={setNewEnd} newCats={newCats} setNewCats={setNewCats}
                newRestrictedClub={newRestrictedClub} setNewRestrictedClub={setNewRestrictedClub}
                myJudgedContests={myJudgedContests}
                
                newEntryFee={newEntryFee} setNewEntryFee={setNewEntryFee}
                newFeeCurrency={newFeeCurrency} setNewFeeCurrency={setNewFeeCurrency}
                editEntryFee={editEntryFee} setEditEntryFee={setEditEntryFee}
                editFeeCurrency={editFeeCurrency} setEditFeeCurrency={setEditFeeCurrency}
                contestPayments={contestPayments} handlePayContestFee={handlePayContestFee}
                
                handleCreateContest={handleCreateContest} editContestId={editContestId}
                setEditContestId={setEditContestId} editTitle={editTitle} setEditTitle={setEditTitle}
                editDesc={editDesc} setEditDesc={setEditDesc} editStart={editStart}
                setEditStart={setEditStart} editEnd={editEnd} setEditEnd={setEditEnd}
                editCats={editCats} setEditCats={setEditCats} editRestrictedClub={editRestrictedClub}
                setEditRestrictedClub={setEditRestrictedClub} startEdit={startEdit}
                handleUpdateContest={handleUpdateContest} handleDeleteContest={handleDeleteContest}
                viewStatsContestId={viewStatsContestId} setViewStatsContestId={setViewStatsContestId}
                contestStats={contestStats} loadStats={loadStats} viewJuryProgressId={viewJuryProgressId}
                setViewJuryProgressId={setViewJuryProgressId} juryProgressData={juryProgressData}
                loadJuryProgress={loadJuryProgress} manageJuryContestId={manageJuryContestId}
                setManageJuryContestId={setManageJuryContestId} selectedJuryEmail={selectedJuryEmail}
                setSelectedJuryEmail={setSelectedJuryEmail} handleAddJury={handleAddJury}
                handleRemoveJury={handleRemoveJury} viewResultsContestId={viewResultsContestId}
                setViewResultsContestId={setViewResultsContestId} contestResults={contestResults}
                loadResults={loadResults} activeUploadContest={activeUploadContest}
                setActiveUploadContest={setActiveUploadContest} uploadTitle={uploadTitle}
                setUploadTitle={setUploadTitle} uploadCategory={uploadCategory}
                setUploadCategory={setUploadCategory} uploadPreview={uploadPreview}
                setUploadPreview={setUploadPreview} isUploading={isUploading}
                handleFileSelect={handleFileSelect} handleUpload={handleUpload}
                judgingContestId={judgingContestId} setJudgingContestId={setJudgingContestId}
                unvotedEntries={unvotedEntries} currentScore={currentScore}
                setCurrentScore={setCurrentScore} startJudging={startJudging}
                submitVote={submitVote} editingEntryId={editingEntryId}
                setEditingEntryId={setEditingEntryId} editEntryTitle={editEntryTitle}
                setEditEntryTitle={setEditEntryTitle} handleUpdateEntryTitle={handleUpdateEntryTitle}
                handleDeleteEntry={handleDeleteEntry} setFullscreenData={setFullscreenData}
                newCategorySettings={newCategorySettings}
                setNewCategorySettings={setNewCategorySettings}
                editCategorySettings={editCategorySettings}
                setEditCategorySettings={setEditCategorySettings}
              />
            )}
          </main>
          
          <SessionGuard logoutUser={() => {
            localStorage.removeItem('photoAppToken');
            setUser(null);
          }} />
          
        </div>
      )}
    </GoogleOAuthProvider>
  );
}

export default App;

