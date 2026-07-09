import React, { useState, useEffect, useMemo } from 'react';
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
import AdminBannedEmailsView  from './views/admin/AdminBannedEmailsView'; 
import ContestsView from './views/ContestsView';
import MyAlbumView from './views/MyAlbumView'; 
import MyArenaAlbumView from './views/MyArenaAlbumView'; 
import AdminSettingsView from './views/admin/AdminSettingsView';
import FiapProgressView from './views/FiapProgressView';
import SessionGuard from './components/SessionGuard';
import MapSpotsView from './views/MapSpotsView';
import DashboardView from './views/DashboardView';
import WeeklyChallengeView from './views/WeeklyChallengeView';
import AdminWeeklyView from './views/admin/AdminWeeklyView';
import ClubNewsView from './views/ClubNewsView';
import ProfileView from './views/ProfileView';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import TicketsView from './views/TicketsView';
import LeaderClubView from './views/LeaderClubView';
import PodcastView from './views/PodcastView';
import AdminPointsDashboard from './views/admin/AdminPointsDashboard'; 
import ForumView from './views/ForumView'; 
import AdminQuizView from './views/admin/AdminQuizView';
import QuizView from './views/QuizView';

// Témakezelő környezet
import { ThemeProvider } from './context/ThemeContext'; 

import MarketplaceRoot from './components/marketplace/MarketplaceRoot';
import MafoszProgressView from './views/MafoszProgressView'; 
import PackagesView from './components/PackagesView'; 

// Nyelvi provider környezet behívása a Splash-hez
import { LanguageProvider, useLanguage } from './context/LanguageContext';

// Régi domain átirányítása a fájl legtetején
if (typeof window !== 'undefined' && window.location.hostname.includes('kepolvasok.guru')) {
  window.location.replace(
    'https://photawesome.com' + window.location.pathname + window.location.search
  );
}

// ====================================================================
// 🚀 GLOBÁLIS ANTI-FREEZE & AUTO-RETRY MOTOR INTELLIGENS ADAT-SZŰRŐVEL
// ====================================================================
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;

  const triggerDashboardFallback = () => {
    if (window.location.pathname !== '/dashboard' && window.location.pathname !== '/') {
      console.error("🔄 Kritikus szerverhiba észlelve. Kimenekítés a Dashboardra...");
      window.location.href = '/dashboard';
    } else {
      const lastReload = sessionStorage.getItem('last_fallback_reload');
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 10000) {
        sessionStorage.setItem('last_fallback_reload', String(now));
        console.error("🔄 Főoldali hálózati hiba, teljes felület kényszerített újraindítása...");
        window.location.reload();
      }
    }
  };

  window.fetch = async function (input, init) {
    // Kinyerjük a kérés pontos URL címét stringként
    let requestUrl = '';
    if (typeof input === 'string') {
      requestUrl = input;
    } else if (input instanceof URL) {
      requestUrl = input.href;
    } else if (input && (input as any).url) {
      requestUrl = (input as any).url;
    }

    // 🎯 CRITICAL MOBIL JAVÍTÁS: Csak a saját backend API hívásainkat interceptáljuk!
    // Ha a kérés külső assetre, harmadik félre (pl. Google GSI stíluslapra) irányul, 
    // teljesen békén hagyjuk, így az html-to-image hibái nem fagyasztják le az alkalmazást.
    const isBackendCall = requestUrl.includes('/api/') || requestUrl.includes(BACKEND_URL) || requestUrl.startsWith('/');
    const isGoogleAuthAsset = requestUrl.includes('google.com') || requestUrl.includes('accounts.google.com');

    if (!isBackendCall || isGoogleAuthAsset) {
      return originalFetch(input, init);
    }

    let retries = 3;     
    let delay = 600;     

    while (retries > 0) {
      try {
        const response = await originalFetch(input, init);
        
        if (response.status >= 500) {
          if (retries > 1) {
            retries--;
            console.warn(`⚠️ Időleges szerverhiba (${response.status}). Újrapróbálkozás... Hátralévő kísérlet: ${retries}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; 
          } else {
            triggerDashboardFallback();
            return response;
          }
        }
        
        return response; 
      } catch (error) {
        retries--;
        if (retries === 0) {
          triggerDashboardFallback();
          throw error;
        }
        
        console.warn(`⚠️ Hálózati hiba lépett fel. Újrapróbálkozás... Hátralévő kísérlet: ${retries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return originalFetch(input, init);
  };
}

// 🎯 KÖZPONTI AUTH FEJLÉC GENERÁTOR VÉDETT VÉGPONTOKHOZ
const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('photoAppToken');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

function MainContent() {
  const [user, setUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [targetMapSpotId, setTargetMapSpotId] = useState<number | null>(null);
  const [clubs, setClubs] = useState<any[]>([]);

  // CINEMATIC SPLASH SCREEN ÁLLAPOTOK
  const { lang, t } = useLanguage();
  const [showSplash, setShowSplash] = useState(true);
  const [animateOut, setAnimateOut] = useState(false);

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
  
  const [salonSearch, setSalonSearch] = useState('');
  const [selectedSalon, setSelectedSalon] = useState<any>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.substring(1) || 'dashboard'; 

  const setActiveTab = (tab: string) => {
    navigate(`/${tab}`);
  };

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
  const [newSponsorClub, setNewSponsorClub] = useState('');

  const [newEntryFee, setNewEntryFee] = useState<number | string>(0);
  const [newFeeCurrency, setNewFeeCurrency] = useState('HUF');

  const [editContestId, setEditContestId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editCats, setEditCats] = useState('');
  const [editRestrictedClub, setEditRestrictedClub] = useState(''); 
  const [editSponsorClub, setEditSponsorClub] = useState('');

  const [editEntryFee, setEditEntryFee] = useState<number | string>(0);
  const [editFeeCurrency, setEditFeeCurrency] = useState('HUF');
  const [editCategorySettings, setEditCategorySettings] = useState<Record<string, any>>({});

  const [meetingSearch, setMeetingSearch] = useState(''); 
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

  const fetchData = async (retryCount = 0) => {
    const token = localStorage.getItem('photoAppToken');
    if (!token) {
      setIsInitialLoading(false);
      return;
    }
    if (retryCount === 0) setIsInitialLoading(true);
    try {
      const [
        resUsers, resClubs, resContests, resJury, resMeetings, 
        resHw, resCountries, resCats, resPatrons, resSalons, resPayments
      ] = await Promise.all([
        fetch(`${BACKEND_URL}/api/users`, { headers: getAuthHeaders() }),
        fetch(`${BACKEND_URL}/api/clubs`, { headers: getAuthHeaders() }),
        fetch(`${BACKEND_URL}/api/contests`, { headers: getAuthHeaders() }),
        fetch(`${BACKEND_URL}/api/jury`, { headers: getAuthHeaders() }),
        fetch(`${BACKEND_URL}/api/meetings`, { headers: getAuthHeaders() }),
        fetch(`${BACKEND_URL}/api/homeworks`, { headers: getAuthHeaders() }),
        fetch(`${BACKEND_URL}/api/countries`, { headers: getAuthHeaders() }),
        fetch(`${BACKEND_URL}/api/categories`, { headers: getAuthHeaders() }),
        fetch(`${BACKEND_URL}/api/patrons`, { headers: getAuthHeaders() }),
        fetch(`${BACKEND_URL}/api/salons`, { headers: getAuthHeaders() }),
        fetch(`${BACKEND_URL}/api/contest-payments`, { headers: getAuthHeaders() })
      ]);

      if (resUsers.status === 403 || resClubs.status === 403 || resMeetings.status === 403) {
        localStorage.removeItem('photoAppToken');
        localStorage.removeItem('user');
        setUser(null);
        setIsInitialLoading(false);
        setIsAuthLoading(false);
        alert("Ez a fiók biztonsági okokból véglegesen ki lett tiltva az Arénából!");
        return;
      }

      if (!resUsers.ok || !resContests.ok || !resMeetings.ok || !resHw.ok) throw new Error("Hiba");

      if (resUsers.ok) { const d = await resUsers.json(); setAllUsers(Array.isArray(d) ? d : []); }
      if (resClubs.ok) { const d = await resClubs.json(); setClubs(Array.isArray(d) ? d : []); }
      if (resContests.ok) { const d = await resContests.json(); setContests(Array.isArray(d) ? d : []); }
      if (resJury.ok) { const d = await resJury.json(); setJuryList(Array.isArray(d) ? d : []); }
      if (resMeetings.ok) { const d = await resMeetings.json(); setMeetings(Array.isArray(d) ? d : []); }
      if (resHw.ok) { const d = await resHw.json(); setHomeworks(Array.isArray(d) ? d : []); }
      if (resCountries.ok) { const d = await resCountries.json(); setCountries(Array.isArray(d) ? d : []); }
      if (resCats.ok) { const d = await resCats.json(); setAllCategories(Array.isArray(d) ? d : []); }
      if (resPatrons.ok) { const d = await resPatrons.json(); setPatrons(Array.isArray(d) ? d : []); }
      if (resSalons.ok) { const d = await resSalons.json(); setSalons(Array.isArray(d) ? d : []); }
      if (resPayments && resPayments.ok) { const d = await resPayments.json(); setContestPayments(Array.isArray(d) ? d : []); }

      setIsInitialLoading(false); 
    } catch (e) { 
      if (retryCount < 3) setTimeout(() => fetchData(retryCount + 1), 1500); 
      else { setIsInitialLoading(false); alert("Átmeneti hálózati hiba!"); }
    }
  };
  
  const fetchMyEntries = async (email: string) => {
    if (!email || email === 'undefined' || email === 'null' || email.trim() === '') return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/my-entries?userEmail=${encodeURIComponent(email)}`, { headers: getAuthHeaders() });
      if (res.ok) { const d = await res.json(); setMyEntries(Array.isArray(d) ? d : []); }
      
      const resHw = await fetch(`${BACKEND_URL}/api/my-homework-entries?userEmail=${encodeURIComponent(email)}`, { headers: getAuthHeaders() });
      if (resHw.ok) { const d = await resHw.json(); setMyHomeworkEntries(Array.isArray(d) ? d : []); }
      
      const resSalons = await fetch(`${BACKEND_URL}/api/my-salon-entries-status?userEmail=${encodeURIComponent(email)}`, { headers: getAuthHeaders() });
      if (resSalons.ok) { const d = await resSalons.json(); setUserEntrySalonIds(Array.isArray(d) ? d : []); }
      
      const resJudged = await fetch(`${BACKEND_URL}/api/my-judged-contests?userEmail=${encodeURIComponent(email)}`, { headers: getAuthHeaders() });
      if (resJudged.ok) { const d = await resJudged.json(); setMyJudgedContests(Array.isArray(d) ? d : []); }
    } catch (e) { console.error("Hiba a nevezések letöltésekor:", e); }
  };
  
  const fetchClubHomeworkEntries = async (clubId: number, email: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/homework-entries/club/${clubId}?userEmail=${email}`, { headers: getAuthHeaders() });
      if (res.ok) { const d = await res.json(); setClubHomeworkEntries(Array.isArray(d) ? d : []); }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('photoAppToken');
      
      if (!storedToken) {
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthLoading(false);
        setIsInitialLoading(false);
        return;
      }

      try {
        const decoded: any = jwtDecode(storedToken);
        
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('photoAppToken');
          localStorage.removeItem('user');
          setUser(null);
          setIsAuthLoading(false);
          setIsInitialLoading(false);
          return;
        }

        const res = await fetch(`${BACKEND_URL}/api/auth/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: decoded.email, name: decoded.name, sub: decoded.sub })
        });

        if (res.status === 403) {
          localStorage.removeItem('photoAppToken');
          localStorage.removeItem('user');
          setUser(null);
          setIsAuthLoading(false);
          setIsInitialLoading(false);
          alert("Ez a fiók biztonsági okokból véglegesen ki lett tiltva!");
          return;
        }

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
          
          localStorage.setItem('user', JSON.stringify(fullUser));
          setUser(fullUser);
          setIsAuthLoading(false);
          
          await fetchData();
          await fetchMyEntries(decoded.email);
        } else {
          setUser(decoded);
          setIsAuthLoading(false);
          await fetchData();
          await fetchMyEntries(decoded.email);
        }
      } catch (e) {
        console.error("Munkamenet ellenőrzési hiba:", e);
        localStorage.removeItem('photoAppToken');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthLoading(false);
        setIsInitialLoading(false);
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    const silentAuthSync = async () => {
      const storedToken = localStorage.getItem('photoAppToken');
      if (!storedToken) return;

      try {
        const decoded: any = jwtDecode(storedToken);
        if (decoded.exp * 1000 < Date.now()) return;

        const res = await fetch(`${BACKEND_URL}/api/auth/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: decoded.email, name: decoded.name, sub: decoded.sub })
        });

        if (res.status === 403) {
          localStorage.removeItem('photoAppToken');
          localStorage.removeItem('user');
          setUser(null);
          window.location.reload();
          return;
        }

        if (res.ok) {
          const authData = await res.json();
          setUser((prev: any) => prev ? {
            ...prev,
            isPremium: authData.isPremium,
            is_premium: authData.isPremium,
            premiumLevel: authData.premiumLevel,
            premium_level: authData.premiumLevel,
            premiumUntil: authData.premiumUntil
          } : prev);
        }

        const usersRes = await fetch(`${BACKEND_URL}/api/users`, {
          headers: getAuthHeaders()
        });
        
        if (usersRes.status === 403) return;

        if (usersRes.ok) {
          const freshAllUsers = await usersRes.json();
          setAllUsers(Array.isArray(freshAllUsers) ? freshAllUsers : []); 
        }
      } catch (error) {
        console.error('Háttér-szinkronizációs hiba:', error);
      }
    };

    const handleVisibilityChange = () => { if (document.visibilityState === 'visible') silentAuthSync(); };
    window.addEventListener('focus', silentAuthSync);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => { document.removeEventListener('visibilitychange', handleVisibilityChange); window.removeEventListener('focus', silentAuthSync); };
  }, []);

  useEffect(() => {
    if (!isInitialLoading && !isAuthLoading) {
      setAnimateOut(true);
      const timer = setTimeout(() => { setShowSplash(false); }, 600);
      return () => clearTimeout(timer);
    }
  }, [isInitialLoading, isAuthLoading]);

  const currentDbUser = Array.isArray(allUsers) ? allUsers.find(u => u.email === user?.email) : null;
  const isLeader = currentDbUser?.club_role === 'leader' || currentDbUser?.club_role === 'deputy';

  useEffect(() => {
    if (activeTab === 'club_homeworks' && currentDbUser) {
      const club = Array.isArray(clubs) ? clubs.find(c => c.name === currentDbUser.club_name) : null;
      if (club) fetchClubHomeworkEntries(club.id, user.email);
    }
  }, [activeTab, currentDbUser, clubs, user]);

  const handleDeleteHwEntry = async (entryId: number) => {
    if (!window.confirm("Biztosan törlöd ezt a feltöltést?")) return;
    const res = await fetch(`${BACKEND_URL}/api/homework-entries/${entryId}`, { method: 'DELETE', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ userEmail: user.email }) });
    if (res.ok) { fetchMyEntries(user.email); const club = Array.isArray(clubs) ? clubs.find(c => c.name === currentDbUser?.club_name) : null; if (club) fetchClubHomeworkEntries(club.id, user.email); }
  };

  const handleToggleLike = async (entryId: number) => {
    const res = await fetch(`${BACKEND_URL}/api/homework-entries/${entryId}/like`, { method: 'POST', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ userEmail: user.email }) });
    if (res.ok) { const club = Array.isArray(clubs) ? clubs.find(c => c.name === currentDbUser?.club_name) : null; if (club) fetchClubHomeworkEntries(club.id, user.email); }
  };

  const handleLoginSuccess = async (credential: string) => {
    localStorage.setItem('photoAppToken', credential);
    const decoded: any = jwtDecode(credential);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/sync`, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ email: decoded.email, name: decoded.name, sub: decoded.sub }) 
      });
      if (res.ok) {
        const data = await res.json();
        const freshUser = { 
          ...decoded, 
          isPremium: data.isPremium, 
          is_premium: data.isPremium,
          premiumUntil: data.premiumUntil, 
          premiumLevel: data.premiumLevel,
          premium_level: data.premiumLevel
        };
        setUser(freshUser);
        localStorage.setItem('user', JSON.stringify(freshUser)); 
      } else {
        setUser(decoded); localStorage.setItem('user', JSON.stringify(decoded));
      }
    } catch (e) {
      setUser(decoded); localStorage.setItem('user', JSON.stringify(decoded));
    }
    fetchData(); fetchMyEntries(decoded.email);
    setActiveTab('dashboard');
  };

  const handlePayContestFee = async (contestId: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/create-contest-payment`, {
        method: 'POST', headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userEmail: user.email, contestId: contestId, returnUrl: window.location.origin })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Hiba a fizetés indításakor.');
    } catch (e) { alert('Hálózati hiba a Stripe elérésekor!'); }
  };

  const handleAddClub = async () => { if (!newClubName) return; const res = await fetch(`${BACKEND_URL}/api/clubs`, { method: 'POST', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ name: newClubName }) }); if (res.ok) { setNewClubName(''); fetchData(); } };
  const handleDeleteClub = async (id: number) => { if (!window.confirm("Biztosan törlöd ezt a klubot?")) return; const res = await fetch(`${BACKEND_URL}/api/clubs/${id}`, { method: 'DELETE', headers: getAuthHeaders() }); if (res.ok) fetchData(); };
  
  const handleUpdateClub = async (id: number, name: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/clubs/${id}`, { method: 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ name }) });
      if (res.ok) { fetchData(); alert('Klub neve sikeresen frissítve!'); }
    } catch (e) { alert('Hálózati hiba történt!'); }
  };

  const saveUserClub = async (email: string) => { 
    const clubName = userClubEdits[email] !== undefined ? userClubEdits[email] : (Array.isArray(allUsers) ? (allUsers.find(u => u.email === email)?.club_name || '') : ''); 
    const clubRole = userRoleEdits[email] !== undefined ? userRoleEdits[email] : (Array.isArray(allUsers) ? (allUsers.find(u => u.email === email)?.club_role || 'member') : 'member');
    const matchedClub = Array.isArray(clubs) ? clubs.find(c => c.name === clubName) : null;
    const clubId = matchedClub ? matchedClub.id : null;

    const res = await fetch(`${BACKEND_URL}/api/users/${email}`, { method: 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ clubName, clubRole, clubId }) }); 
    if (res.ok) { alert("Sikeres mentés!"); fetchData(); } 
  };
  
  const handleCreateContest = async () => { 
    if (!newTitle || !newStart || !newEnd || !newCats) return alert("Cím, dátumok és kategóriák kötelezőek!"); 
    let finalRestrictedClubId: number | null = null;
    if (user.email === ADMIN_EMAIL) { finalRestrictedClubId = newRestrictedClub ? Number(newRestrictedClub) : null; } 
    else { finalRestrictedClubId = currentDbUser?.club_id || null; if (!finalRestrictedClubId) return alert("Hiba: Nem vagy klubhoz rendelve!"); }

    const res = await fetch(`${BACKEND_URL}/api/contests`, { method: 'POST', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ title: newTitle, description: newDesc, startDate: newStart, endDate: newEnd, categories: newCats, restrictedClubId: finalRestrictedClubId, sponsorClubId: newSponsorClub ? Number(newSponsorClub) : null, entryFee: newEntryFee, feeCurrency: newFeeCurrency, categorySettings: newCategorySettings }) }); 
    if (res.ok) { setNewTitle(''); setNewDesc(''); setNewStart(''); setNewEnd(''); setNewCats(''); setNewRestrictedClub(''); setNewSponsorClub(''); setNewEntryFee(0); setNewFeeCurrency('HUF'); fetchData(); alert("Pályázat sikeresen kiírva! 🚀"); }
  };

  const startEdit = (contest: any) => { 
    setEditContestId(contest.id); setEditTitle(contest.title); setEditDesc(contest.description); setEditCats(contest.categories || ''); setEditRestrictedClub(contest.restricted_club_id ? String(contest.restricted_club_id) : ''); setEditSponsorClub(contest.sponsor_club_id ? String(contest.sponsor_club_id) : ''); setEditEntryFee(contest.entry_fee || 0); setEditFeeCurrency(contest.fee_currency || 'HUF');
    const formatDate = (dateStr: string | null) => { if (!dateStr) return ''; return dateStr.replace('Z', '').substring(0, 16); }; 
    try { setEditCategorySettings(typeof contest.category_settings === 'string' ? JSON.parse(contest.category_settings) : (contest.category_settings || {})); } catch(e) { setEditCategorySettings({}); }
    setEditStart(formatDate(contest.start_date)); setEditEnd(formatDate(contest.end_date)); 
  };

  const handleUpdateContest = async () => { 
    const res = await fetch(`${BACKEND_URL}/api/contests/${editContestId}`, { method: 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ title: editTitle, description: editDesc, startDate: editStart || null, endDate: editEnd || null, categories: editCats, restrictedClubId: editRestrictedClub ? Number(editRestrictedClub) : null, sponsorClubId: editSponsorClub ? Number(editSponsorClub) : null, entryFee: editEntryFee, feeCurrency: editFeeCurrency, categorySettings: editCategorySettings }) }); 
    if (res.ok) { setEditContestId(null); setEditSponsorClub(''); fetchData(); alert("Pályázat sikeresen frissítve!"); } 
  };

  const handleAddJury = async (contestId: number) => { if (!selectedJuryEmail) return; const res = await fetch(`${BACKEND_URL}/api/jury`, { method: 'POST', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ contestId, userEmail: selectedJuryEmail }) }); if (res.ok) { setSelectedJuryEmail(''); fetchData(); } };
  const handleRemoveJury = async (contestId: number, email: string) => { const res = await fetch(`${BACKEND_URL}/api/jury`, { method: 'DELETE', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ contestId, userEmail: email }) }); if (res.ok) fetchData(); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { setUploadFile(file); setUploadPreview(URL.createObjectURL(file)); } };
  
  const handleUpload = async (contestId: number) => { 
    if (!uploadFile || !uploadTitle || !uploadCategory) return alert("Minden kötelező!"); 
    setIsUploading(true); 
    try { 
      const formData = new FormData(); 
      formData.append('contestId', String(contestId)); formData.append('userEmail', user.email); formData.append('userName', user.name); formData.append('title', uploadTitle); formData.append('category', uploadCategory); formData.append('acceptedTerms', '1'); formData.append('acceptedTermsAt', new Date().toISOString()); formData.append('photo', uploadFile); 
      const res = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', headers: getAuthHeaders(), body: formData }); 
      if (res.ok) { alert("Sikeres nevezés! A jognyilatkozatot és a technikai validációt rögzítettük."); setActiveUploadContest(null); setUploadFile(null); setUploadPreview(null); setUploadTitle(''); setUploadCategory(''); fetchMyEntries(user.email); } 
    } catch (error) { alert("Hálózati hiba történt a feltöltés közben!"); } finally { setIsUploading(false); } 
  };

  const handleUpdateEntryTitle = async (entryId: number) => { 
    if (!editEntryTitle) return alert('A cím nem lehet üres!'); 
    const res = await fetch(`${BACKEND_URL}/api/entries/${entryId}`, { method: 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ title: editEntryTitle, userEmail: user.email }) }); 
    if (res.ok) { setEditingEntryId(null); fetchMyEntries(user.email); }
  };

  const handleDeleteContestEntry = async (entryId: number) => { 
    if (!window.confirm("Biztosan törlöd?")) return; 
    const res = await fetch(`${BACKEND_URL}/api/entries/${entryId}`, { method: 'DELETE', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ userEmail: user.email }) }); 
    if (res.ok) fetchMyEntries(user.email); 
  };

  const startJudging = async (contestId: number) => { const res = await fetch(`${BACKEND_URL}/api/jury-entries/${contestId}?userEmail=${user.email}`, { headers: getAuthHeaders() }); if (res.ok) { setUnvotedEntries(await res.json()); setJudgingContestId(contestId); setCurrentScore(''); } };
  const submitVote = async () => { 
    const score = Number(currentScore); 
    if (score < 0 || score > 100 || currentScore === '') return alert("0 és 100 közötti pontszámot adj meg!"); 
    const res = await fetch(`${BACKEND_URL}/api/vote`, { method: 'POST', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ entryId: unvotedEntries[0].id, juryEmail: user.email, score }) }); 
    if (res.ok) { setUnvotedEntries(prev => prev.slice(1)); setCurrentScore(''); if (unvotedEntries.length === 1) { fetchMyEntries(user.email); fetchData(); } } 
  };
  const loadResults = async (contestId: number) => { const res = await fetch(`${BACKEND_URL}/api/results/${contestId}`, { headers: getAuthHeaders() }); if (res.ok) { setContestResults(await res.json()); setViewResultsContestId(contestId); } };
  const loadStats = async (contestId: number) => { const res = await fetch(`${BACKEND_URL}/api/admin/stats/${contestId}`, { headers: getAuthHeaders() }); if (res.ok) { setContestStats(await res.json()); setViewStatsContestId(contestId); } };
  const handleDeleteContest = async (id: number) => { if (!window.confirm("❗ BIZTOSAN TÖRLÖD ezt a pályázatot?")) return; const res = await fetch(`${BACKEND_URL}/api/contests/${id}`, { method: 'DELETE', headers: getAuthHeaders() }); if (res.ok) fetchData(); };
  const loadJuryProgress = async (contestId: number) => { const res = await fetch(`${BACKEND_URL}/api/admin/jury-stats/${contestId}`, { headers: getAuthHeaders() }); if (res.ok) { setJuryProgressData(await res.json()); setViewJuryProgressId(contestId); } };
  
  const filteredContests = Array.isArray(contests) ? contests.filter(contest => {
    const isRestricted = contest.restricted_club && contest.restricted_club.trim() !== '';
    const now = new Date(); const start = contest.start_date ? new Date(contest.start_date) : new Date(0); const end = contest.end_date ? new Date(contest.end_date) : new Date(0); const isEnded = now > end && start.getFullYear() > 1970;
    const isUserJuryForThisContest = Array.isArray(juryList) ? juryList.some(j => j.contest_id === contest.id && j.user_email === user?.email) : false;
    if (activeTab === 'admin_contests') return true; 
    if (activeTab === 'contests_closed') { if (!isEnded) return false; if (isRestricted && contest.restricted_club !== currentDbUser?.club_name && !isUserJuryForThisContest) return false; return true; }
    if (activeTab === 'contests_club_active') return (isRestricted && contest.restricted_club === currentDbUser?.club_name && !isEnded) || isUserJuryForThisContest;
    if (activeTab === 'contests_open_active') return !isRestricted && !isEnded;
    return false;
  }) : [];

  const myClubMeetings = Array.isArray(meetings) ? meetings.filter(m => m.club_name === currentDbUser?.club_name) : [];
  const searchedMeetings = myClubMeetings.filter(m => !meetingSearch || m.topic.toLowerCase().includes(meetingSearch.toLowerCase()) || (m.description && m.description.toLowerCase().includes(meetingSearch.toLowerCase())));
  const adminMeetings = user?.email === ADMIN_EMAIL ? (Array.isArray(meetings) ? meetings : []) : myClubMeetings;
  const myClubHomeworks = Array.isArray(homeworks) ? homeworks.filter(h => h.club_name === currentDbUser?.club_name) : [];
  const adminHomeworks = user?.email === ADMIN_EMAIL ? (Array.isArray(homeworks) ? homeworks : []) : myClubHomeworks;
  const sortedSalons = Array.isArray(salons) ? [...salons].sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime()) : [];

  const headerUser = useMemo(() => {
    if (!user) return null;
    if (!currentDbUser) return user;
    return { ...user, name: currentDbUser.name || user.name, is_premium: currentDbUser.is_premium, isPremium: currentDbUser.is_premium === 1, premium_until: currentDbUser.premium_until, club_name: currentDbUser.club_name, club_id: currentDbUser.club_id, club_role: currentDbUser.club_role };
  }, [user, currentDbUser]);

  return (
    <>
      {fullscreenData && (
        <FullscreenModal data={fullscreenData} onClose={() => setFullscreenData(null)} entryList={fullscreenData._entryList} currentIndex={fullscreenData._currentIndex} onNavigate={fullscreenData._onNavigate} onToggleLike={fullscreenData._onToggleLike} />
      )}
      {selectedSalon && <SalonModal salon={selectedSalon} user={user} onClose={() => setSelectedSalon(null)} />}
      {activeVideo && <VideoModal videoUrl={activeVideo} onClose={() => setActiveVideo(null)} />}

      {showSplash ? (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#090d16', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 999999, opacity: animateOut ? 0 : 1, transition: 'opacity 0.6s cubic-bezier(0.25, 1, 0.5, 1)', pointerEvents: 'none' }}>
          <div style={{ width: '90%', maxWidth: '580px', aspectRatio: '16/9', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.06)', background: '#000', position: 'relative' }}>
            <video src={lang === 'en' ? '/splash_en.mp4' : '/splash_hu.mp4'} autoPlay muted playsInline loop style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ marginTop: '30px', textAlign: 'center', animation: 'appSplashPulse 1.8s infinite' }}>
            <h4 style={{ color: '#f8fafc', fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 6px 0', letterSpacing: '0.5px' }}>{lang === 'en' ? 'Launching System...' : 'Rendszer indítása...'}</h4>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>{lang === 'en' ? 'Launching System...' : 'Adatok és biztonságos munkamenetek szinkronizálása'}</p>
          </div>
        </div>
      ) : null}

      {!user ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div className="app-container" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-title)', fontFamily: 'Inter, sans-serif' }}>
          <Header user={headerUser} isLeader={!!isLeader} activeTab={activeTab} setActiveTab={setActiveTab} dropdownOpen={dropdownOpen} setDropdownOpen={setDropdownOpen} onLogout={() => { localStorage.removeItem('photoAppToken'); localStorage.removeItem('user'); setUser(null); }} />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardView user={headerUser} isLeader={!!isLeader} setActiveTab={setActiveTab} setTargetMapSpotId={setTargetMapSpotId} />} />
              <Route path="/weekly_challenge" element={<WeeklyChallengeView user={user} setFullscreenData={setFullscreenData} />} />
              <Route path="/profile" element={<ProfileView user={currentDbUser} setUser={setUser} fetchData={fetchData} />} />
              <Route path="/tickets" element={<TicketsView user={currentDbUser} />} />
              <Route path="/packages" element={<PackagesView user={user} />} />
              <Route path="/marketplace" element={<MarketplaceRoot user={headerUser} />} />
              <Route path="/map_spots" element={<MapSpotsView user={user} setFullscreenData={setFullscreenData} targetMapSpotId={targetMapSpotId} setTargetMapSpotId={setTargetMapSpotId} />} />
              <Route path="/club_news" element={<ForumView user={user} currentDbUser={currentDbUser} mode="club" />} />
              <Route path="/public_news" element={<ForumView user={user} currentDbUser={currentDbUser} mode="public" />} />

              <Route path="/my_album" element={<MyAlbumView user={user} setFullscreenData={setFullscreenData} />} />
              <Route path="/arena_album" element={<MyArenaAlbumView user={user} setFullscreenData={setFullscreenData} />} /> 
              <Route path="/fiap_progress" element={<FiapProgressView user={user} allUsers={allUsers} />} />
              <Route path="/mafosz_progress" element={<MafoszProgressView user={user} allUsers={allUsers} />} />
              <Route path="/salons" element={<SalonsView salonSearch={salonSearch} setSalonSearch={setSalonSearch} searchedSalons={sortedSalons} setSelectedSalon={setSelectedSalon} userEntrySalonIds={userEntrySalonIds} user={user} BACKEND_URL={BACKEND_URL} />} />
              <Route path="/club_nights" element={<ClubNightsView currentDbUser={currentDbUser} meetingSearch={meetingSearch} setMeetingSearch={setMeetingSearch} searchedMeetings={searchedMeetings} setActiveVideo={setActiveVideo} />} />
              <Route path="/leader_club" element={isLeader ? <LeaderClubView user={user} BACKEND_URL={BACKEND_URL} /> : <Navigate to="/dashboard" replace />} />
          <Route path="/podcast" element={<PodcastView />} />
{/* 🎯 ÚJ: A játékos Kvízfelület élesítése a routerben */}
<Route path="/quiz" element={<QuizView user={headerUser} />} />

              <Route path="/admin_quiz" element={user?.email === ADMIN_EMAIL ? <AdminQuizView /> : <Navigate to="/dashboard" />} />

              <Route path="/admin_clubs" element={user?.email === ADMIN_EMAIL ? <AdminClubsView clubs={clubs} newClubName={newClubName} setNewClubName={setNewClubName} handleAddClub={handleAddClub} handleDeleteClub={handleDeleteClub} handleUpdateClub={handleUpdateClub} /> : <Navigate to="/dashboard" />} />
              <Route path="/admin_users" element={user?.email === ADMIN_EMAIL ? <AdminUsersView allUsers={allUsers} clubs={clubs} userClubEdits={userClubEdits} setUserClubEdits={setUserClubEdits} userRoleEdits={userRoleEdits} setUserRoleEdits={setUserRoleEdits} saveUserClub={saveUserClub} /> : <Navigate to="/dashboard" />} />
              <Route path="/admin_weekly" element={user?.email === ADMIN_EMAIL ? <AdminWeeklyView /> : <Navigate to="/dashboard" />} />
              <Route path="/admin_weekly" element={user?.email === ADMIN_EMAIL ? <AdminWeeklyView /> : <Navigate to="/dashboard" />} />
              <Route path="/admin_points" element={user?.email === ADMIN_EMAIL ? <AdminPointsDashboard /> : <Navigate to="/dashboard" />} />
              <Route path="/admin_settings" element={user?.email === ADMIN_EMAIL ? <AdminSettingsView /> : <Navigate to="/dashboard" />} />
              <Route path="/admin_salons" element={user?.email === ADMIN_EMAIL ? <AdminSalonsView salons={salons} countries={countries} allCategories={allCategories} patrons={patrons} BACKEND_URL={BACKEND_URL} fetchData={fetchData} setSelectedSalon={setSelectedSalon} /> : <Navigate to="/dashboard" />} />
              <Route path="/admin_banned_emails" element={user?.email === ADMIN_EMAIL ? <AdminBannedEmailsView /> : <Navigate to="/dashboard" />} /> 
              <Route path="/admin_meetings" element={(user?.email === ADMIN_EMAIL || isLeader) ? <AdminMeetingsView user={user} currentDbUser={currentDbUser} clubs={clubs} meetings={meetings} allUsers={allUsers} adminMeetings={adminMeetings} fetchData={fetchData} /> : <Navigate to="/dashboard replace" />} />
              <Route path="/admin_homeworks" element={(user?.email === ADMIN_EMAIL || isLeader) ? <AdminHomeworksView user={user} currentDbUser={currentDbUser} clubs={clubs} adminHomeworks={adminHomeworks} fetchData={fetchData} /> : <Navigate to="/dashboard replace" />} />

              {['/contests_open_active', '/contests_club_active', '/contests_closed'].map(path => (
                <Route key={path} path={path} element={
                  <ContestsView 
                    activeTab={activeTab} user={user} currentDbUser={currentDbUser} isLeader={!!isLeader} clubs={clubs} allUsers={allUsers} filteredContests={filteredContests} myEntries={myEntries} juryList={juryList} newTitle={newTitle} setNewTitle={setNewTitle} newDesc={newDesc} setNewDesc={setNewDesc} newStart={newStart} setNewStart={setNewStart} newEnd={newEnd} setNewEnd={setNewEnd} newCats={newCats} setNewCats={setNewCats} newRestrictedClub={newRestrictedClub} setNewRestrictedClub={setNewRestrictedClub} myJudgedContests={myJudgedContests} newEntryFee={newEntryFee} setNewEntryFee={setNewEntryFee} newFeeCurrency={newFeeCurrency} setNewFeeCurrency={setNewFeeCurrency} editEntryFee={editEntryFee} setEditEntryFee={setEditEntryFee} editFeeCurrency={editFeeCurrency} setEditFeeCurrency={setEditFeeCurrency} contestPayments={contestPayments} handlePayContestFee={handlePayContestFee} handleCreateContest={handleCreateContest} editContestId={editContestId} setEditContestId={setEditContestId} editTitle={editTitle} setEditTitle={setEditTitle} editDesc={editDesc} setEditDesc={setEditDesc} editStart={editStart} setEditStart={setEditStart} editEnd={editEnd} setEditEnd={setEditEnd} editCats={editCats} setEditCats={setEditCats} editRestrictedClub={editRestrictedClub} setEditRestrictedClub={setEditRestrictedClub} startEdit={startEdit} handleUpdateContest={handleUpdateContest} handleDeleteContest={handleDeleteContest} viewStatsContestId={viewStatsContestId} setViewStatsContestId={setViewStatsContestId} contestStats={contestStats} loadStats={loadStats} viewJuryProgressId={viewJuryProgressId} setViewJuryProgressId={setViewJuryProgressId} juryProgressData={juryProgressData} loadJuryProgress={loadJuryProgress} manageJuryContestId={manageJuryContestId} setManageJuryContestId={setManageJuryContestId} selectedJuryEmail={selectedJuryEmail} setSelectedJuryEmail={setSelectedJuryEmail} handleAddJury={handleAddJury} handleRemoveJury={handleRemoveJury} viewResultsContestId={viewResultsContestId} setViewResultsContestId={setViewResultsContestId} contestResults={contestResults} loadResults={loadResults} activeUploadContest={activeUploadContest} setActiveUploadContest={setActiveUploadContest} uploadTitle={uploadTitle} setUploadTitle={setUploadTitle} uploadCategory={uploadCategory} setUploadCategory={setUploadCategory} uploadPreview={uploadPreview} setUploadPreview={setUploadPreview} isUploading={isUploading} handleFileSelect={handleFileSelect} handleUpload={handleUpload} judgingContestId={judgingContestId} setJudgingContestId={setJudgingContestId} unvotedEntries={unvotedEntries} currentScore={currentScore} setCurrentScore={setCurrentScore} startJudging={startJudging} 
                    submitVote={submitVote} 
                    editingEntryId={editingEntryId} setEditingEntryId={setEditingEntryId} editEntryTitle={editEntryTitle} setEditEntryTitle={setEditEntryTitle} handleUpdateEntryTitle={handleUpdateEntryTitle} 
                    handleDeleteEntry={handleDeleteContestEntry} 
                    setFullscreenData={setFullscreenData} newCategorySettings={newCategorySettings} setNewCategorySettings={setNewCategorySettings} editCategorySettings={editCategorySettings} setEditCategorySettings={setEditCategorySettings} newSponsorClub={newSponsorClub} setNewSponsorClub={setNewSponsorClub} editSponsorClub={editSponsorClub} setEditSponsorClub={setEditSponsorClub} setActiveTab={setActiveTab} 
                  />
                } />
              ))}

              <Route path="/admin_contests" element={
                (user?.email === ADMIN_EMAIL || isLeader) ? (
                  <ContestsView 
                    activeTab={activeTab} user={user} currentDbUser={currentDbUser} isLeader={!!isLeader} clubs={clubs} allUsers={allUsers} filteredContests={filteredContests} myEntries={myEntries} juryList={juryList} newTitle={newTitle} setNewTitle={setNewTitle} newDesc={newDesc} setNewDesc={setNewDesc} newStart={newStart} setNewStart={setNewStart} newEnd={newEnd} setNewEnd={setNewEnd} newCats={newCats} setNewCats={setNewCats} newRestrictedClub={newRestrictedClub} setNewRestrictedClub={setNewRestrictedClub} myJudgedContests={myJudgedContests} newEntryFee={newEntryFee} setNewEntryFee={setNewEntryFee} newFeeCurrency={newFeeCurrency} setNewFeeCurrency={setNewFeeCurrency} editEntryFee={editEntryFee} setEditEntryFee={setEditEntryFee} editFeeCurrency={editFeeCurrency} setEditFeeCurrency={setEditFeeCurrency} contestPayments={contestPayments} handlePayContestFee={handlePayContestFee} handleCreateContest={handleCreateContest} editContestId={editContestId} setEditContestId={setEditContestId} editTitle={editTitle} setEditTitle={setEditTitle} editDesc={editDesc} setEditDesc={setEditDesc} editStart={editStart} setEditStart={setEditStart} editEnd={editEnd} setEditEnd={setEditEnd} editCats={editCats} setEditCats={setEditCats} editRestrictedClub={editRestrictedClub} setEditRestrictedClub={setEditRestrictedClub} startEdit={startEdit} handleUpdateContest={handleUpdateContest} handleDeleteContest={handleDeleteContest} viewStatsContestId={viewStatsContestId} setViewStatsContestId={setViewStatsContestId} contestStats={contestStats} loadStats={loadStats} viewJuryProgressId={viewJuryProgressId} setViewJuryProgressId={setViewJuryProgressId} juryProgressData={juryProgressData} loadJuryProgress={loadJuryProgress} manageJuryContestId={manageJuryContestId} setManageJuryContestId={setManageJuryContestId} selectedJuryEmail={selectedJuryEmail} setSelectedJuryEmail={setSelectedJuryEmail} handleAddJury={handleAddJury} handleRemoveJury={handleRemoveJury} viewResultsContestId={viewResultsContestId} setViewResultsContestId={setViewResultsContestId} contestResults={contestResults} loadResults={loadResults} activeUploadContest={activeUploadContest} setActiveUploadContest={setActiveUploadContest} uploadTitle={uploadTitle} setUploadTitle={setUploadTitle} uploadCategory={uploadCategory} setUploadCategory={setUploadCategory} uploadPreview={uploadPreview} setUploadPreview={setUploadPreview} isUploading={isUploading} handleFileSelect={handleFileSelect} handleUpload={handleUpload} judgingContestId={judgingContestId} setJudgingContestId={setJudgingContestId} unvotedEntries={unvotedEntries} currentScore={currentScore} setCurrentScore={setCurrentScore} startJudging={startJudging} 
                    submitVote={submitVote} 
                    editingEntryId={editingEntryId} setEditingEntryId={setEditingEntryId} editEntryTitle={editEntryTitle} setEditEntryTitle={setEditEntryTitle} handleUpdateEntryTitle={handleUpdateEntryTitle} 
                    handleDeleteEntry={handleDeleteContestEntry} 
                    setFullscreenData={setFullscreenData} newCategorySettings={newCategorySettings} setNewCategorySettings={setNewCategorySettings} editCategorySettings={editCategorySettings} setEditCategorySettings={setEditCategorySettings} newSponsorClub={newSponsorClub} setNewSponsorClub={setNewSponsorClub} editSponsorClub={editSponsorClub} setEditSponsorClub={setEditSponsorClub} setActiveTab={setActiveTab} 
                  />
                ) : <Navigate to="/dashboard" replace />
              } />

              <Route path="/club_homeworks" element={<ClubHomeworksView user={user} currentDbUser={currentDbUser} myClubHomeworks={myClubHomeworks} myHomeworkEntries={myHomeworkEntries} clubHomeworkEntries={clubHomeworkEntries} isLeader={!!isLeader} setFullscreenData={setFullscreenData} fetchMyEntries={fetchMyEntries} fetchClubHomeworkEntries={fetchClubHomeworkEntries} clubs={clubs} onToggleLike={handleToggleLike} handleToggleLike={handleToggleLike} />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
          <SessionGuard logoutUser={() => { localStorage.removeItem('photoAppToken'); localStorage.removeItem('user'); setUser(null); }} />
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <LanguageProvider>
          <BrowserRouter>
            <MainContent />
          </BrowserRouter>
        </LanguageProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
