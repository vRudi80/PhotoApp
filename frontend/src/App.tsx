import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import { GOOGLE_CLIENT_ID, BACKEND_URL, ADMIN_EMAIL } from './utils/constants';
import { getImageUrl } from './utils/helpers';
import LoginScreen from './components/LoginScreen';
import { FullscreenModal, VideoModal } from './components/Modals';
import Header from './components/Header';
import SalonModal from './components/SalonModal';
import './App.css';
import SessionGuard from './components/SessionGuard';

const SalonsView = lazy(() => import('./views/SalonsView'));
const ClubNightsView = lazy(() => import('./views/ClubNightsView'));
const ClubHomeworksView = lazy(() => import('./views/ClubHomeworksView'));
const AdminClubsView = lazy(() => import('./views/admin/AdminClubsView'));
const AdminUsersView = lazy(() => import('./views/admin/AdminUsersView'));
const AdminMeetingsView = lazy(() => import('./views/admin/AdminMeetingsView'));
const AdminHomeworksView = lazy(() => import('./views/admin/AdminHomeworksView'));
const AdminSalonsView = lazy(() => import('./views/admin/AdminSalonsView'));
const ContestsView = lazy(() => import('./views/ContestsView'));
const MyAlbumView = lazy(() => import('./views/MyAlbumView'));
const AdminSettingsView = lazy(() => import('./views/admin/AdminSettingsView'));
const FiapProgressView = lazy(() => import('./views/FiapProgressView'));
const MapSpotsView = lazy(() => import('./views/MapSpotsView'));
const DashboardView = lazy(() => import('./views/DashboardView'));
const WeeklyChallengeView = lazy(() => import('./views/WeeklyChallengeView'));
const AdminWeeklyView = lazy(() => import('./views/admin/AdminWeeklyView'));
const ClubNewsView = lazy(() => import('./views/ClubNewsView'));
const MafoszProgressView = lazy(() => import('./views/MafoszProgressView'));
const PackagesView = lazy(() => import('./components/PackagesView'));

type NullableNumber = number | null;
type DropdownType = 'contests' | 'club' | 'admin' | 'progress' | null;
type UserType = any;
type GenericItem = any;

function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [allUsers, setAllUsers] = useState<GenericItem[]>([]);
  const [targetMapSpotId, setTargetMapSpotId] = useState<NullableNumber>(null);
  const [clubs, setClubs] = useState<GenericItem[]>([]);

  const [salonPatronNumbers, setSalonPatronNumbers] = useState<Record<number, string>>({});
  const [userEntrySalonIds, setUserEntrySalonIds] = useState<number[]>([]);

  const [contestPayments, setContestPayments] = useState<GenericItem[]>([]);
  const [myJudgedContests, setMyJudgedContests] = useState<GenericItem[]>([]);

  const [contests, setContests] = useState<GenericItem[]>([]);
  const [myEntries, setMyEntries] = useState<GenericItem[]>([]);
  const [juryList, setJuryList] = useState<GenericItem[]>([]);

  const [meetings, setMeetings] = useState<GenericItem[]>([]);

  const [homeworks, setHomeworks] = useState<GenericItem[]>([]);
  const [myHomeworkEntries, setMyHomeworkEntries] = useState<GenericItem[]>([]);
  const [clubHomeworkEntries, setClubHomeworkEntries] = useState<GenericItem[]>([]);

  const [salons, setSalons] = useState<GenericItem[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [countries, setCountries] = useState<GenericItem[]>([]);
  const [allCategories, setAllCategories] = useState<GenericItem[]>([]);
  const [patrons, setPatrons] = useState<GenericItem[]>([]);

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
  const [dropdownOpen, setDropdownOpen] = useState<DropdownType>(null);

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
  const [juryProgressData, setJuryProgressData] = useState<{ total_entries: number; stats: any[] }>({
    total_entries: 0,
    stats: []
  });

  const [fullscreenData, setFullscreenData] = useState<any>(null);

  const authSyncInFlight = useRef(false);
  const lastAuthSyncAt = useRef(0);
  const coreLoadedRef = useRef(false);
  const refLoadedRef = useRef(false);
  const adminLoadedRef = useRef(false);

  const currentDbUser = allUsers.find(u => u.email === user?.email);
  const isLeader = currentDbUser?.club_role === 'leader' || currentDbUser?.club_role === 'deputy';

  const parseJsonSafe = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const fetchCoreData = useCallback(async (signal?: AbortSignal) => {
    const [resClubs, resContests, resMeetings, resHw] = await Promise.all([
      fetch(`${BACKEND_URL}/api/clubs`, { signal }),
      fetch(`${BACKEND_URL}/api/contests`, { signal }),
      fetch(`${BACKEND_URL}/api/meetings`, { signal }),
      fetch(`${BACKEND_URL}/api/homeworks`, { signal })
    ]);

    if (!resContests.ok || !resMeetings.ok || !resHw.ok) {
      throw new Error('Core adatok betöltése sikertelen');
    }

    if (resClubs.ok) setClubs(await resClubs.json());
    if (resContests.ok) setContests(await resContests.json());
    if (resMeetings.ok) setMeetings(await resMeetings.json());
    if (resHw.ok) setHomeworks(await resHw.json());

    coreLoadedRef.current = true;
  }, []);

  const fetchReferenceData = useCallback(async (signal?: AbortSignal) => {
    if (refLoadedRef.current) return;

    const [resCountries, resCats, resPatrons, resSalons] = await Promise.all([
      fetch(`${BACKEND_URL}/api/countries`, { signal }),
      fetch(`${BACKEND_URL}/api/categories`, { signal }),
      fetch(`${BACKEND_URL}/api/patrons`, { signal }),
      fetch(`${BACKEND_URL}/api/salons`, { signal })
    ]);

    if (resCountries.ok) setCountries(await resCountries.json());
    if (resCats.ok) setAllCategories(await resCats.json());
    if (resPatrons.ok) setPatrons(await resPatrons.json());
    if (resSalons.ok) setSalons(await resSalons.json());

    refLoadedRef.current = true;
  }, []);

  const fetchAdminData = useCallback(async (signal?: AbortSignal, force = false) => {
    if (adminLoadedRef.current && !force) return;

    const [resUsers, resJury, resPayments] = await Promise.all([
      fetch(`${BACKEND_URL}/api/users`, { signal }),
      fetch(`${BACKEND_URL}/api/jury`, { signal }),
      fetch(`${BACKEND_URL}/api/contest-payments`, { signal })
    ]);

    if (resUsers.ok) setAllUsers(await resUsers.json());
    if (resJury.ok) setJuryList(await resJury.json());
    if (resPayments.ok) setContestPayments(await resPayments.json());

    adminLoadedRef.current = true;
  }, []);

  const fetchAllData = useCallback(async () => {
    setIsInitialLoading(true);
    try {
      await fetchCoreData();
      await fetchReferenceData();
      if (user?.email === ADMIN_EMAIL) {
        await fetchAdminData(undefined, true);
      }
    } catch (e) {
      console.error('Adatlekérési hiba:', e);
    } finally {
      setIsInitialLoading(false);
    }
  }, [fetchCoreData, fetchReferenceData, fetchAdminData, user?.email]);

  const fetchMyEntries = useCallback(async (email: string) => {
    try {
      const [resEntries, resHw, resSalons, resJudged] = await Promise.all([
        fetch(`${BACKEND_URL}/api/my-entries?userEmail=${email}`),
        fetch(`${BACKEND_URL}/api/my-homework-entries?userEmail=${email}`),
        fetch(`${BACKEND_URL}/api/my-salon-entries-status?userEmail=${email}`),
        fetch(`${BACKEND_URL}/api/my-judged-contests?userEmail=${email}`)
      ]);

      if (resEntries.ok) setMyEntries(await resEntries.json());
      if (resHw.ok) setMyHomeworkEntries(await resHw.json());
      if (resSalons.ok) setUserEntrySalonIds(await resSalons.json());
      if (resJudged.ok) setMyJudgedContests(await resJudged.json());
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchClubHomeworkEntries = useCallback(async (clubId: number, email: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/homework-entries/club/${clubId}?userEmail=${email}`);
      if (res.ok) setClubHomeworkEntries(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, []);

  const silentAuthSync = useCallback(async () => {
    const now = Date.now();
    if (authSyncInFlight.current) return;
    if (now - lastAuthSyncAt.current < 5000) return;

    const storedUserStr = localStorage.getItem('user');
    if (!storedUserStr) return;

    authSyncInFlight.current = true;
    lastAuthSyncAt.current = now;

    try {
      const localUser = JSON.parse(storedUserStr);
      if (!localUser?.email) return;

      const authRes = await fetch(`${BACKEND_URL}/api/auth/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: localUser.email,
          name: localUser.name,
          sub: localUser.googleId || localUser.sub || 'silent-sync'
        })
      });

      if (authRes.ok) {
        const authData = await authRes.json();
        const freshUser = {
          ...localUser,
          isPremium: authData.isPremium,
          premiumLevel: authData.premiumLevel,
          premiumUntil: authData.premiumUntil
        };

        localStorage.setItem('user', JSON.stringify(freshUser));
        setUser(prev => (prev?.email === freshUser.email ? { ...prev, ...freshUser } : prev));
      }
    } catch (error) {
      console.error('Csendes szinkronizációs hiba a háttérben:', error);
    } finally {
      authSyncInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const successContest = urlParams.get('success_contest');
    if (successContest) {
      alert('🎉 Sikeres nevezési díj fizetés! A képeid érvényesek és a zsűri elé kerülnek.');
      window.history.replaceState({}, document.title, window.location.pathname + '?tab=contests_open_active');
      setActiveTab('contests_open_active');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const init = async () => {
      setIsInitialLoading(true);
      try {
        await fetchCoreData(controller.signal);
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          console.error('Core adatbetöltési hiba:', e);
        }
      } finally {
        setIsInitialLoading(false);
      }

      setTimeout(() => {
        fetchReferenceData().catch(console.error);
      }, 0);
    };

    init();

    return () => controller.abort();
  }, [fetchCoreData, fetchReferenceData]);

  useEffect(() => {
    silentAuthSync();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        silentAuthSync();
      }
    };

    const handleFocus = () => {
      silentAuthSync();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [silentAuthSync]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isSuccess = urlParams.get('success');
    const storedToken = localStorage.getItem('photoAppToken');

    if (isSuccess) {
      window.history.replaceState(null, '', window.location.pathname);
      alert('🎉 Sikeres aktiválás! Kérlek várj pár másodpercet, amíg a rendszer frissíti a fiókodat...');
    }

    if (!storedToken) {
      setIsAuthLoading(false);
      return;
    }

    try {
      const decoded: any = jwtDecode(storedToken);

      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem('photoAppToken');
        localStorage.removeItem('user');
        setIsAuthLoading(false);
        return;
      }

      const optimisticUser = {
        ...decoded,
        isPremium: false,
        is_premium: false,
        premiumUntil: null,
        premiumLevel: null,
        premium_level: null
      };

      setUser(optimisticUser);
      localStorage.setItem('user', JSON.stringify(optimisticUser));

      const delay = isSuccess ? 2500 : 0;

      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/auth/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: decoded.email,
              name: decoded.name,
              sub: decoded.sub
            })
          });

          if (res.ok) {
            const data = await res.json();
            const fullUser = {
              ...decoded,
              isPremium: data.isPremium,
              is_premium: data.isPremium,
              premiumUntil: data.premiumUntil,
              premiumLevel: data.premiumLevel,
              premium_level: data.premiumLevel
            };

            setUser(fullUser);
            localStorage.setItem('user', JSON.stringify(fullUser));
          }

          fetchMyEntries(decoded.email);
        } catch (err) {
          console.error(err);
        } finally {
          setIsAuthLoading(false);
        }
      }, delay);

      return () => clearTimeout(timer);
    } catch (e) {
      localStorage.removeItem('photoAppToken');
      localStorage.removeItem('user');
      setIsAuthLoading(false);
    }
  }, [fetchMyEntries]);

  useEffect(() => {
    const adminTabs = [
      'admin_contests',
      'admin_users',
      'admin_clubs',
      'admin_meetings',
      'admin_homeworks',
      'admin_salons',
      'admin_settings',
      'admin_weekly'
    ];

    if (user && adminTabs.includes(activeTab)) {
      fetchAdminData().catch(console.error);
    }
  }, [activeTab, user, fetchAdminData]);

  useEffect(() => {
    const referenceTabs = [
      'salons',
      'admin_salons',
      'fiap_progress',
      'mafosz_progress',
      'packages'
    ];

    if (referenceTabs.includes(activeTab)) {
      fetchReferenceData().catch(console.error);
    }
  }, [activeTab, fetchReferenceData]);

  useEffect(() => {
    if (activeTab === 'club_homeworks' && currentDbUser && user?.email) {
      const club = clubs.find(c => c.name === currentDbUser.club_name);
      if (club) {
        fetchClubHomeworkEntries(club.id, user.email);
      }
    }
  }, [activeTab, currentDbUser, clubs, user, fetchClubHomeworkEntries]);

  const handleLoginSuccess = async (credential: string) => {
    localStorage.setItem('photoAppToken', credential);
    const decoded: any = jwtDecode(credential);

    const optimisticUser = {
      ...decoded,
      isPremium: false,
      is_premium: false,
      premiumUntil: null,
      premiumLevel: null,
      premium_level: null
    };

    setUser(optimisticUser);
    localStorage.setItem('user', JSON.stringify(optimisticUser));

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: decoded.email,
          name: decoded.name,
          sub: decoded.sub
        })
      });

      if (res.ok) {
        const data = await res.json();
        const fullUser = {
          ...decoded,
          isPremium: data.isPremium,
          is_premium: data.isPremium,
          premiumUntil: data.premiumUntil,
          premiumLevel: data.premiumLevel,
          premium_level: data.premiumLevel
        };

        setUser(fullUser);
        localStorage.setItem('user', JSON.stringify(fullUser));
      }
    } catch (e) {
      console.error(e);
    }

    fetchMyEntries(decoded.email);
    fetchCoreData().catch(console.error);
  };

  const handleLogout = () => {
    localStorage.removeItem('photoAppToken');
    localStorage.removeItem('user');
    setUser(null);
    setMyEntries([]);
    setMyHomeworkEntries([]);
    setMyJudgedContests([]);
    setUserEntrySalonIds([]);
    setActiveTab('dashboard');
  };

  const handlePayContestFee = async (contestId: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/create-contest-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.email,
          contestId,
          returnUrl: window.location.origin
        })
      });

      const data = await parseJsonSafe(res);

      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert(data?.error || 'Hiba a fizetés indításakor.');
      }
    } catch (e) {
      alert('Hálózati hiba a Stripe elérésekor!');
    }
  };

  const handleAddClub = async () => {
    if (!newClubName) return;
    const res = await fetch(`${BACKEND_URL}/api/clubs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClubName })
    });
    if (res.ok) {
      setNewClubName('');
      fetchAdminData(undefined, true).catch(console.error);
      fetchCoreData().catch(console.error);
    }
  };

  const handleDeleteClub = async (id: number) => {
    if (!window.confirm("Biztosan törlöd ezt a klubot?")) return;
    const res = await fetch(`${BACKEND_URL}/api/clubs/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchAdminData(undefined, true).catch(console.error);
      fetchCoreData().catch(console.error);
    }
  };

  const saveUserClub = async (email: string) => {
    const clubName =
      userClubEdits[email] !== undefined
        ? userClubEdits[email]
        : allUsers.find(u => u.email === email)?.club_name || '';

    const clubRole =
      userRoleEdits[email] !== undefined
        ? userRoleEdits[email]
        : allUsers.find(u => u.email === email)?.club_role || 'member';

    const res = await fetch(`${BACKEND_URL}/api/users/${email}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clubName, clubRole })
    });

    if (res.ok) {
      alert("Sikeres mentés!");
      fetchAdminData(undefined, true).catch(console.error);
    }
  };

  const handleCreateContest = async () => {
    if (!newTitle || !newStart || !newEnd || !newCats) {
      return alert("Cím, dátumok és kategóriák kötelezőek!");
    }

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
      setNewTitle('');
      setNewDesc('');
      setNewStart('');
      setNewEnd('');
      setNewCats('');
      setNewRestrictedClub('');
      setNewEntryFee(0);
      setNewFeeCurrency('HUF');
      fetchCoreData().catch(console.error);
      fetchAdminData(undefined, true).catch(console.error);
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
      setEditCategorySettings(
        typeof contest.category_settings === 'string'
          ? JSON.parse(contest.category_settings)
          : contest.category_settings || {}
      );
    } catch {
      setEditCategorySettings({});
    }

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
      fetchCoreData().catch(console.error);
      fetchAdminData(undefined, true).catch(console.error);
      alert("Pályázat sikeresen frissítve!");
    }
  };

  const handleAddJury = async (contestId: number) => {
    if (!selectedJuryEmail) return;
    const res = await fetch(`${BACKEND_URL}/api/jury`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contestId, userEmail: selectedJuryEmail })
    });
    if (res.ok) {
      setSelectedJuryEmail('');
      fetchAdminData(undefined, true).catch(console.error);
    }
  };

  const handleRemoveJury = async (contestId: number, email: string) => {
    const res = await fetch(`${BACKEND_URL}/api/jury`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contestId, userEmail: email })
    });
    if (res.ok) {
      fetchAdminData(undefined, true).catch(console.error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async (contestId: number) => {
    if (!uploadFile || !uploadTitle || !uploadCategory) {
      return alert("Minden kötelező!");
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('photo', uploadFile);
      formData.append('contestId', String(contestId));
      formData.append('userEmail', user.email);
      formData.append('userName', user.name);
      formData.append('title', uploadTitle);
      formData.append('category', uploadCategory);

      const res = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        alert("Feltöltve!");
        setActiveUploadContest(null);
        setUploadFile(null);
        setUploadPreview(null);
        setUploadTitle('');
        setUploadCategory('');
        fetchMyEntries(user.email);
      } else {
        const err = await parseJsonSafe(res);
        alert(`Hiba: ${err?.error || 'Sikertelen feltöltés'}`);
      }
    } catch {
      alert("Hiba");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateEntryTitle = async (entryId: number) => {
    if (!editEntryTitle) return alert('A cím nem lehet üres!');

    const res = await fetch(`${BACKEND_URL}/api/entries/${entryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editEntryTitle, userEmail: user.email })
    });

    if (res.ok) {
      setEditingEntryId(null);
      fetchMyEntries(user.email);
    } else {
      alert('Hiba a cím frissítésekor!');
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    if (!window.confirm("Biztosan törlöd?")) return;

    const res = await fetch(`${BACKEND_URL}/api/entries/${entryId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: user.email })
    });

    if (res.ok) {
      fetchMyEntries(user.email);
    }
  };

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
    if (score < 0 || score > 100 || currentScore === '') {
      return alert("0 és 100 közötti pontszámot adj meg!");
    }

    const res = await fetch(`${BACKEND_URL}/api/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entryId: unvotedEntries[0].id,
        juryEmail: user.email,
        score
      })
    });

    if (res.ok) {
      setUnvotedEntries(prev => prev.slice(1));
      setCurrentScore('');

      if (unvotedEntries.length === 1) {
        fetchMyEntries(user.email);
        fetchCoreData().catch(console.error);
        fetchAdminData(undefined, true).catch(console.error);
      }
    }
  };

  const loadResults = async (contestId: number) => {
    const res = await fetch(`${BACKEND_URL}/api/results/${contestId}`);
    if (res.ok) {
      setContestResults(await res.json());
      setViewResultsContestId(contestId);
    }
  };

  const loadStats = async (contestId: number) => {
    const res = await fetch(`${BACKEND_URL}/api/admin/stats/${contestId}`);
    if (res.ok) {
      setContestStats(await res.json());
      setViewStatsContestId(contestId);
    }
  };

  const handleDeleteContest = async (id: number) => {
    if (!window.confirm("❗ BIZTOSAN TÖRLÖD ezt a pályázatot?\n\nA hozzá tartozó összes kép, nevezés és szavazat is VÉGLEG törlődik a szerverről és a Google Drive-ról is!")) {
      return;
    }

    const res = await fetch(`${BACKEND_URL}/api/contests/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchCoreData().catch(console.error);
      fetchAdminData(undefined, true).catch(console.error);
    } else {
      alert("Hiba történt a törlés során!");
    }
  };

  const loadJuryProgress = async (contestId: number) => {
    const res = await fetch(`${BACKEND_URL}/api/admin/jury-stats/${contestId}`);
    if (res.ok) {
      setJuryProgressData(await res.json());
      setViewJuryProgressId(contestId);
    }
  };

  const handleMeetingCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMeetCover(file);
      setMeetCoverPreview(URL.createObjectURL(file));
    }
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
    setEditMeetId(null);
    setMeetClubId('');
    setMeetDate('');
    setMeetTime('');
    setMeetTopic('');
    setMeetDesc('');
    setMeetLocDetails('');
    setMeetVideoLink('');
    setMeetCover(null);
    setMeetCoverPreview(null);
  };

  const handleSaveMeeting = async () => {
    const finalClubId =
      user.email !== ADMIN_EMAIL
        ? clubs.find(c => c.name === currentDbUser?.club_name)?.id
        : meetClubId;

    if (!finalClubId || !meetDate || !meetTime || !meetTopic) {
      return alert("Klub, Dátum, Időpont és Téma kötelező!");
    }

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

      const url = editMeetId
        ? `${BACKEND_URL}/api/meetings/${editMeetId}`
        : `${BACKEND_URL}/api/meetings`;

      const method = editMeetId ? 'PUT' : 'POST';

      const res = await fetch(url, { method, body: formData });

      if (res.ok) {
        alert(editMeetId ? "Klubest frissítve!" : "Klubest sikeresen létrehozva!");
        clearMeetingForm();
        fetchCoreData().catch(console.error);
        fetchAdminData(undefined, true).catch(console.error);
      } else {
        const err = await parseJsonSafe(res);
        alert(`Hiba: ${err?.error || 'Sikertelen mentés'}`);
      }
    } catch {
      alert("Hálózati hiba!");
    } finally {
      setIsMeetingUploading(false);
    }
  };

  const handleDeleteMeeting = async (id: number) => {
    if (!window.confirm("Biztosan törlöd ezt a klubestet?")) return;
    const res = await fetch(`${BACKEND_URL}/api/meetings/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchCoreData().catch(console.error);
      fetchAdminData(undefined, true).catch(console.error);
    }
  };

  const openAttendance = async (meetId: number) => {
    setAttendanceMeetId(meetId);
    const res = await fetch(`${BACKEND_URL}/api/attendance/${meetId}`);
    if (res.ok) {
      setAttendanceList(await res.json());
    }
  };

  const toggleAttendance = (email: string) => {
    setAttendanceList(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const saveAttendance = async () => {
    if (!attendanceMeetId) return;

    const res = await fetch(`${BACKEND_URL}/api/attendance/${attendanceMeetId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: attendanceList })
    });

    if (res.ok) {
      alert("Jelenléti ív mentve!");
      setAttendanceMeetId(null);
    }
  };

  const clearHwForm = () => {
    setEditHwId(null);
    setHwClubId('');
    setHwTopic('');
    setHwDesc('');
    setHwDeadline('');
    setHwMaxImages(4);
  };

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

  const handleSaveHw = async () => {
    const finalClubId =
      user.email !== ADMIN_EMAIL
        ? clubs.find(c => c.name === currentDbUser?.club_name)?.id
        : hwClubId;

    if (!finalClubId || !hwTopic || !hwDeadline) {
      return alert("Klub, Téma és Határidő kötelező!");
    }

    try {
      const url = editHwId
        ? `${BACKEND_URL}/api/homeworks/${editHwId}`
        : `${BACKEND_URL}/api/homeworks`;

      const method = editHwId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId: finalClubId,
          topic: hwTopic,
          description: hwDesc,
          deadline: hwDeadline,
          maxImages: hwMaxImages
        })
      });

      if (res.ok) {
        alert(editHwId ? "Házi feladat frissítve!" : "Házi feladat létrehozva!");
        clearHwForm();
        fetchCoreData().catch(console.error);
        fetchAdminData(undefined, true).catch(console.error);
      } else {
        alert("Hiba történt!");
      }
    } catch {
      alert("Hálózati hiba!");
    }
  };

  const handleDeleteHw = async (id: number) => {
    if (!window.confirm("Biztosan törlöd ezt a házi feladatot? A hozzá tartozó összes kép is törlődik!")) {
      return;
    }

    const res = await fetch(`${BACKEND_URL}/api/homeworks/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchCoreData().catch(console.error);
      fetchAdminData(undefined, true).catch(console.error);
    }
  };

  const handleHwFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHwUploadFile(file);
      setHwUploadPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadHw = async (homeworkId: number) => {
    if (!hwUploadFile || !hwUploadTitle) {
      return alert("Kép és cím megadása kötelező!");
    }

    setIsHwUploading(true);

    try {
      const formData = new FormData();
      formData.append('photo', hwUploadFile);
      formData.append('homeworkId', String(homeworkId));
      formData.append('userEmail', user.email);
      formData.append('userName', user.name);
      formData.append('title', hwUploadTitle);

      const res = await fetch(`${BACKEND_URL}/api/upload-homework`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        alert("Feltöltve!");
        setActiveUploadHw(null);
        setHwUploadFile(null);
        setHwUploadPreview(null);
        setHwUploadTitle('');
        fetchMyEntries(user.email);

        const club = clubs.find(c => c.name === currentDbUser?.club_name);
        if (club) fetchClubHomeworkEntries(club.id, user.email);
      } else {
        const err = await parseJsonSafe(res);
        alert(`Hiba: ${err?.error || 'Sikertelen feltöltés'}`);
      }
    } catch {
      alert("Hiba a feltöltésnél");
    } finally {
      setIsHwUploading(false);
    }
  };

  const handleUpdateHwEntryTitle = async (entryId: number) => {
    if (!editHwEntryTitle) return alert('A cím nem lehet üres!');

    const res = await fetch(`${BACKEND_URL}/api/homework-entries/${entryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editHwEntryTitle,
        userEmail: user.email
      })
    });

    if (res.ok) {
      setEditingHwEntryId(null);
      fetchMyEntries(user.email);

      const club = clubs.find(c => c.name === currentDbUser?.club_name);
      if (club) fetchClubHomeworkEntries(club.id, user.email);
    } else {
      alert('Hiba a cím frissítésekor!');
    }
  };

  const handleDeleteHwEntry = async (entryId: number) => {
    if (!window.confirm("Biztosan törlöd ezt a feltöltést?")) return;

    const res = await fetch(`${BACKEND_URL}/api/homework-entries/${entryId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: user.email })
    });

    if (res.ok) {
      fetchMyEntries(user.email);
      const club = clubs.find(c => c.name === currentDbUser?.club_name);
      if (club) fetchClubHomeworkEntries(club.id, user.email);
    }
  };

  const handleToggleLike = async (entryId: number) => {
    const res = await fetch(`${BACKEND_URL}/api/homework-entries/${entryId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: user.email })
    });

    if (res.ok) {
      const club = clubs.find(c => c.name === currentDbUser?.club_name);
      if (club) fetchClubHomeworkEntries(club.id, user.email);
    }
  };

  const clearSalonForm = () => {
    setEditSalonId(null);
    setSalonName('');
    setSalonFee('');
    setSalonCurrency('EUR');
    setSalonStart('');
    setSalonEnd('');
    setSalonWeb('');
    setSalonResults('');
    setSalonIsCircuit(false);
    setSalonAwards('');
    setSalonCash('');
    setSalonCircuitNum('');
    setSalonType('online');
    setSalonCountry('');
    setSalonSelectedPatrons([]);
    setSalonSelectedCats([]);
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
      try {
        return new Date(dateStr).toISOString().slice(0, 10);
      } catch {
        return '';
      }
    };

    setSalonStart(formatDate(salon.start_date));
    setSalonEnd(formatDate(salon.end_date));
    setSalonResults(formatDate(salon.results_date));
    setSalonIsCircuit(salon.is_circuit === 1);
    setSalonCircuitNum(salon.circuit_number || '');
    setSalonAwards(salon.awards_count?.toString() || '');
    setSalonCash(salon.cash_prize || '');

    if (salon.categories && allCategories.length > 0) {
      const catIds = allCategories
        .filter((c: any) => salon.categories.includes(c.name) || salon.categories.includes(c.hun_name))
        .map((c: any) => c.id);

      setSalonSelectedCats(catIds);
    } else {
      setSalonSelectedCats([]);
    }

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
    if (!salonName || !salonEnd) {
      return alert("A Szalon neve és a záródátum megadása kötelező!");
    }

    try {
      const patronsData = salonSelectedPatrons.map(id => ({
        id,
        number: salonPatronNumbers[id] || ''
      }));

      const payload = {
        name: salonName,
        feeAmount: salonFee,
        feeCurrency: salonCurrency,
        startDate: salonStart,
        endDate: salonEnd,
        website: salonWeb,
        resultsDate: salonResults,
        isCircuit: salonIsCircuit,
        awardsCount: salonAwards,
        cashPrize: salonCash,
        circuitNumber: salonCircuitNum,
        submissionType: salonType,
        hostCountryId: salonCountry,
        patronsData,
        categoryIds: salonSelectedCats
      };

      const url = editSalonId
        ? `${BACKEND_URL}/api/salons/${editSalonId}`
        : `${BACKEND_URL}/api/salons`;

      const method = editSalonId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(editSalonId ? "Szalon sikeresen frissítve!" : "Szalon sikeresen hozzáadva!");
        clearSalonForm();
        fetchReferenceData().catch(console.error);
      } else {
        alert("Hiba a mentés során.");
      }
    } catch {
      alert("Hálózati hiba!");
    }
  };

  const handleDeleteSalon = async (id: number) => {
    if (!window.confirm("Biztosan törlöd ezt a Szalont?")) return;
    const res = await fetch(`${BACKEND_URL}/api/salons/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchReferenceData().catch(console.error);
    }
  };

  const toggleArrayItem = (arr: number[], setArr: Function, id: number) => {
    if (arr.includes(id)) {
      setArr(arr.filter(item => item !== id));
    } else {
      setArr([...arr, id]);
    }
  };

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

    if (activeTab === 'contests_open_active' || activeTab === 'dashboard') {
      if (isEnded) return false;
      if (isRestricted && contest.restricted_club !== currentDbUser?.club_name) return false;
      return true;
    }

    return true;
  });

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            user={user}
            contests={filteredContests}
            meetings={meetings}
            homeworks={homeworks}
            clubs={clubs}
            currentDbUser={currentDbUser}
            setActiveTab={setActiveTab}
          />
        );

      case 'contests_open_active':
      case 'contests_closed':
      case 'admin_contests':
        return (
          <ContestsView
            user={user}
            contests={filteredContests}
            myEntries={myEntries}
            juryList={juryList}
            myJudgedContests={myJudgedContests}
            allUsers={allUsers}
            activeTab={activeTab}
            currentDbUser={currentDbUser}
            editContestId={editContestId}
            editTitle={editTitle}
            setEditTitle={setEditTitle}
            editDesc={editDesc}
            setEditDesc={setEditDesc}
            editStart={editStart}
            setEditStart={setEditStart}
            editEnd={editEnd}
            setEditEnd={setEditEnd}
            editCats={editCats}
            setEditCats={setEditCats}
            editRestrictedClub={editRestrictedClub}
            setEditRestrictedClub={setEditRestrictedClub}
            editEntryFee={editEntryFee}
            setEditEntryFee={setEditEntryFee}
            editFeeCurrency={editFeeCurrency}
            setEditFeeCurrency={setEditFeeCurrency}
            editCategorySettings={editCategorySettings}
            setEditCategorySettings={setEditCategorySettings}
            startEdit={startEdit}
            handleUpdateContest={handleUpdateContest}
            handleDeleteContest={handleDeleteContest}
            handlePayContestFee={handlePayContestFee}
            activeUploadContest={activeUploadContest}
            setActiveUploadContest={setActiveUploadContest}
            uploadPreview={uploadPreview}
            uploadTitle={uploadTitle}
            setUploadTitle={setUploadTitle}
            uploadCategory={uploadCategory}
            setUploadCategory={setUploadCategory}
            isUploading={isUploading}
            handleFileSelect={handleFileSelect}
            handleUpload={handleUpload}
            editingEntryId={editingEntryId}
            setEditingEntryId={setEditingEntryId}
            editEntryTitle={editEntryTitle}
            setEditEntryTitle={setEditEntryTitle}
            handleUpdateEntryTitle={handleUpdateEntryTitle}
            handleDeleteEntry={handleDeleteEntry}
            manageJuryContestId={manageJuryContestId}
            setManageJuryContestId={setManageJuryContestId}
            selectedJuryEmail={selectedJuryEmail}
            setSelectedJuryEmail={setSelectedJuryEmail}
            handleAddJury={handleAddJury}
            handleRemoveJury={handleRemoveJury}
            judgingContestId={judgingContestId}
            setJudgingContestId={setJudgingContestId}
            unvotedEntries={unvotedEntries}
            currentScore={currentScore}
            setCurrentScore={setCurrentScore}
            startJudging={startJudging}
            submitVote={submitVote}
            viewResultsContestId={viewResultsContestId}
            setViewResultsContestId={setViewResultsContestId}
            contestResults={contestResults}
            loadResults={loadResults}
            viewStatsContestId={viewStatsContestId}
            setViewStatsContestId={setViewStatsContestId}
            contestStats={contestStats}
            loadStats={loadStats}
            viewJuryProgressId={viewJuryProgressId}
            setViewJuryProgressId={setViewJuryProgressId}
            juryProgressData={juryProgressData}
            loadJuryProgress={loadJuryProgress}
            newTitle={newTitle}
            setNewTitle={setNewTitle}
            newDesc={newDesc}
            setNewDesc={setNewDesc}
            newStart={newStart}
            setNewStart={setNewStart}
            newEnd={newEnd}
            setNewEnd={setNewEnd}
            newCats={newCats}
            setNewCats={setNewCats}
            newRestrictedClub={newRestrictedClub}
            setNewRestrictedClub={setNewRestrictedClub}
            newEntryFee={newEntryFee}
            setNewEntryFee={setNewEntryFee}
            newFeeCurrency={newFeeCurrency}
            setNewFeeCurrency={setNewFeeCurrency}
            newCategorySettings={newCategorySettings}
            setNewCategorySettings={setNewCategorySettings}
            handleCreateContest={handleCreateContest}
            clubs={clubs}
          />
        );

      case 'club_nights':
        return (
          <ClubNightsView
            user={user}
            meetings={meetings}
            clubs={clubs}
            currentDbUser={currentDbUser}
            isLeader={isLeader}
            editMeetId={editMeetId}
            meetClubId={meetClubId}
            setMeetClubId={setMeetClubId}
            meetDate={meetDate}
            setMeetDate={setMeetDate}
            meetTime={meetTime}
            setMeetTime={setMeetTime}
            meetTopic={meetTopic}
            setMeetTopic={setMeetTopic}
            meetDesc={meetDesc}
            setMeetDesc={setMeetDesc}
            meetLocType={meetLocType}
            setMeetLocType={setMeetLocType}
            meetLocDetails={meetLocDetails}
            setMeetLocDetails={setMeetLocDetails}
            meetVideoLink={meetVideoLink}
            setMeetVideoLink={setMeetVideoLink}
            meetCoverPreview={meetCoverPreview}
            isMeetingUploading={isMeetingUploading}
            meetingSearch={meetingSearch}
            setMeetingSearch={setMeetingSearch}
            handleMeetingCoverSelect={handleMeetingCoverSelect}
            startEditMeeting={startEditMeeting}
            clearMeetingForm={clearMeetingForm}
            handleSaveMeeting={handleSaveMeeting}
            handleDeleteMeeting={handleDeleteMeeting}
            openAttendance={openAttendance}
            setActiveVideo={setActiveVideo}
          />
        );

      case 'club_homeworks':
        return (
          <ClubHomeworksView
            user={user}
            clubs={clubs}
            currentDbUser={currentDbUser}
            isLeader={isLeader}
            homeworks={homeworks}
            myHomeworkEntries={myHomeworkEntries}
            clubHomeworkEntries={clubHomeworkEntries}
            editHwId={editHwId}
            hwClubId={hwClubId}
            setHwClubId={setHwClubId}
            hwTopic={hwTopic}
            setHwTopic={setHwTopic}
            hwDesc={hwDesc}
            setHwDesc={setHwDesc}
            hwDeadline={hwDeadline}
            setHwDeadline={setHwDeadline}
            hwMaxImages={hwMaxImages}
            setHwMaxImages={setHwMaxImages}
            clearHwForm={clearHwForm}
            startEditHw={startEditHw}
            handleSaveHw={handleSaveHw}
            handleDeleteHw={handleDeleteHw}
            activeUploadHw={activeUploadHw}
            setActiveUploadHw={setActiveUploadHw}
            hwUploadPreview={hwUploadPreview}
            hwUploadTitle={hwUploadTitle}
            setHwUploadTitle={setHwUploadTitle}
            isHwUploading={isHwUploading}
            handleHwFileSelect={handleHwFileSelect}
            handleUploadHw={handleUploadHw}
            editingHwEntryId={editingHwEntryId}
            setEditingHwEntryId={setEditingHwEntryId}
            editHwEntryTitle={editHwEntryTitle}
            setEditHwEntryTitle={setEditHwEntryTitle}
            handleUpdateHwEntryTitle={handleUpdateHwEntryTitle}
            handleDeleteHwEntry={handleDeleteHwEntry}
            handleToggleLike={handleToggleLike}
          />
        );

      case 'admin_clubs':
        return (
          <AdminClubsView
            clubs={clubs}
            newClubName={newClubName}
            setNewClubName={setNewClubName}
            handleAddClub={handleAddClub}
            handleDeleteClub={handleDeleteClub}
          />
        );

      case 'admin_users':
        return (
          <AdminUsersView
            allUsers={allUsers}
            clubs={clubs}
            userClubEdits={userClubEdits}
            setUserClubEdits={setUserClubEdits}
            userRoleEdits={userRoleEdits}
            setUserRoleEdits={setUserRoleEdits}
            saveUserClub={saveUserClub}
          />
        );

      case 'admin_meetings':
        return (
          <AdminMeetingsView
            user={user}
            clubs={clubs}
            meetings={meetings}
            editMeetId={editMeetId}
            meetClubId={meetClubId}
            setMeetClubId={setMeetClubId}
            meetDate={meetDate}
            setMeetDate={setMeetDate}
            meetTime={meetTime}
            setMeetTime={setMeetTime}
            meetTopic={meetTopic}
            setMeetTopic={setMeetTopic}
            meetDesc={meetDesc}
            setMeetDesc={setMeetDesc}
            meetLocType={meetLocType}
            setMeetLocType={setMeetLocType}
            meetLocDetails={meetLocDetails}
            setMeetLocDetails={setMeetLocDetails}
            meetVideoLink={meetVideoLink}
            setMeetVideoLink={setMeetVideoLink}
            meetCoverPreview={meetCoverPreview}
            isMeetingUploading={isMeetingUploading}
            handleMeetingCoverSelect={handleMeetingCoverSelect}
            startEditMeeting={startEditMeeting}
            clearMeetingForm={clearMeetingForm}
            handleSaveMeeting={handleSaveMeeting}
            handleDeleteMeeting={handleDeleteMeeting}
          />
        );

      case 'admin_homeworks':
        return (
          <AdminHomeworksView
            user={user}
            clubs={clubs}
            homeworks={homeworks}
            editHwId={editHwId}
            hwClubId={hwClubId}
            setHwClubId={setHwClubId}
            hwTopic={hwTopic}
            setHwTopic={setHwTopic}
            hwDesc={hwDesc}
            setHwDesc={setHwDesc}
            hwDeadline={hwDeadline}
            setHwDeadline={setHwDeadline}
            hwMaxImages={hwMaxImages}
            setHwMaxImages={setHwMaxImages}
            clearHwForm={clearHwForm}
            startEditHw={startEditHw}
            handleSaveHw={handleSaveHw}
            handleDeleteHw={handleDeleteHw}
          />
        );

      case 'admin_salons':
        return (
          <AdminSalonsView
            salons={salons}
            countries={countries}
            allCategories={allCategories}
            patrons={patrons}
            salonName={salonName}
            setSalonName={setSalonName}
            salonFee={salonFee}
            setSalonFee={setSalonFee}
            salonCurrency={salonCurrency}
            setSalonCurrency={setSalonCurrency}
            salonStart={salonStart}
            setSalonStart={setSalonStart}
            salonEnd={salonEnd}
            setSalonEnd={setSalonEnd}
            salonWeb={salonWeb}
            setSalonWeb={setSalonWeb}
            salonResults={salonResults}
            setSalonResults={setSalonResults}
            salonIsCircuit={salonIsCircuit}
            setSalonIsCircuit={setSalonIsCircuit}
            salonAwards={salonAwards}
            setSalonAwards={setSalonAwards}
            salonCash={salonCash}
            setSalonCash={setSalonCash}
            salonCircuitNum={salonCircuitNum}
            setSalonCircuitNum={setSalonCircuitNum}
            salonType={salonType}
            setSalonType={setSalonType}
            salonCountry={salonCountry}
            setSalonCountry={setSalonCountry}
            salonSelectedPatrons={salonSelectedPatrons}
            setSalonSelectedPatrons={setSalonSelectedPatrons}
            salonSelectedCats={salonSelectedCats}
            setSalonSelectedCats={setSalonSelectedCats}
            salonPatronNumbers={salonPatronNumbers}
            setSalonPatronNumbers={setSalonPatronNumbers}
            editSalonId={editSalonId}
            clearSalonForm={clearSalonForm}
            startEditSalon={startEditSalon}
            handleSaveSalon={handleSaveSalon}
            handleDeleteSalon={handleDeleteSalon}
            toggleArrayItem={toggleArrayItem}
            salonSearch={salonSearch}
            setSalonSearch={setSalonSearch}
          />
        );

      case 'salons':
        return (
          <SalonsView
            salons={salons}
            countries={countries}
            allCategories={allCategories}
            patrons={patrons}
            salonSearch={salonSearch}
            setSalonSearch={setSalonSearch}
            selectedSalon={selectedSalon}
            setSelectedSalon={setSelectedSalon}
            userEntrySalonIds={userEntrySalonIds}
            currentDbUser={currentDbUser}
          />
        );

      case 'my_album':
        return (
          <MyAlbumView
            user={user}
            myEntries={myEntries}
            myHomeworkEntries={myHomeworkEntries}
            userEntrySalonIds={userEntrySalonIds}
          />
        );

      case 'fiap_progress':
        return <FiapProgressView user={user} allUsers={allUsers} />;

      case 'mafosz_progress':
        return <MafoszProgressView user={user} allUsers={allUsers} />;

      case 'map_spots':
        return (
          <MapSpotsView
            user={user}
            targetMapSpotId={targetMapSpotId}
            setTargetMapSpotId={setTargetMapSpotId}
          />
        );

      case 'weekly_challenge':
        return <WeeklyChallengeView user={user} />;

      case 'admin_weekly':
        return <AdminWeeklyView user={user} />;

      case 'club_news':
        return <ClubNewsView user={user} currentDbUser={currentDbUser} clubs={clubs} />;

      case 'packages':
        return <PackagesView user={user} />;

      case 'admin_settings':
        return <AdminSettingsView user={user} />;

      default:
        return (
          <DashboardView
            user={user}
            contests={filteredContests}
            meetings={meetings}
            homeworks={homeworks}
            clubs={clubs}
            currentDbUser={currentDbUser}
            setActiveTab={setActiveTab}
          />
        );
    }
  };

  if (isAuthLoading) {
    return <div className="loading-screen">Azonosítás folyamatban...</div>;
  }

  if (!user) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </GoogleOAuthProvider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <SessionGuard user={user} onLogout={handleLogout}>
        <div className="app-shell">
          <Header
            user={user}
            allUsers={allUsers}
            currentDbUser={currentDbUser}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            dropdownOpen={dropdownOpen}
            setDropdownOpen={setDropdownOpen}
            onLogout={handleLogout}
          />

          <main className="main-content">
            {isInitialLoading ? (
              <div className="loading-screen">Adatok betöltése...</div>
            ) : (
              <Suspense fallback={<div className="loading-screen">Nézet betöltése...</div>}>
                {renderActiveView()}
              </Suspense>
            )}
          </main>

          {selectedSalon && (
            <SalonModal
              salon={selectedSalon}
              onClose={() => setSelectedSalon(null)}
            />
          )}

          {fullscreenData && (
            <FullscreenModal
              data={fullscreenData}
              onClose={() => setFullscreenData(null)}
              getImageUrl={getImageUrl}
            />
          )}

          {activeVideo && (
            <VideoModal
              videoUrl={activeVideo}
              onClose={() => setActiveVideo(null)}
            />
          )}
        </div>
      </SessionGuard>
    </GoogleOAuthProvider>
  );
}

export default App;
