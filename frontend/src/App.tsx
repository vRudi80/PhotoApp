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
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import TicketsView from './views/TicketsView';
import LeaderClubView from './views/LeaderClubView';

import MarketplaceRoot from './components/marketplace/MarketplaceRoot';
import MafoszProgressView from './views/MafoszProgressView'; 
import PackagesView from './components/PackagesView'; 

// Nyelvi provider környezet
import { LanguageProvider, useLanguage } from './context/LanguageContext';

function MainContent() {
  const [user, setUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [targetMapSpotId, setTargetMapSpotId] = useState<number | null>(null);
  const [clubs, setClubs] = useState<any[]>([]);

  // 🎯 CINEMATIC SPLASH SCREEN ÁLLAPOTOK
  const { lang, t } = useLanguage();
  const [showSplash, setShowSplash] = useState(true);
  const [animateOut, setAnimateOut] = useState(false);

  useEffect(() => {
    const silentAuthSync = async () => {
      const storedUserStr = localStorage.getItem('user');
      if (!storedUserStr) return;

      try {
        const localUser = JSON.parse(storedUserStr);
        if (!localUser || !localUser.email) return;

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
            is_premium: authData.isPremium,
            premiumLevel: authData.premiumLevel,
            premium_level: authData.premiumLevel,
            premiumUntil: authData.premiumUntil
          };
          
          localStorage.setItem('user', JSON.stringify(freshUser));
          setUser(freshUser); 
        }

        const usersRes = await fetch(`${BACKEND_URL}/api/users`);
        if (usersRes.ok) {
          const freshAllUsers = await usersRes.json();
          setAllUsers(freshAllUsers); 
        }

      } catch (error) {
        console.error('Csendes szinkronizációs hiba a háttérben:', error);
      }
    };

    silentAuthSync();

    const handleVisibilityChange = () => { if (document.visibilityState === 'visible') silentAuthSync(); };
    const handleFocus = () => { silentAuthSync(); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => { document.removeEventListener('visibilitychange', handleVisibilityChange); window.removeEventListener('focus', handleFocus); };
  }, []);

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
      const [
        resUsers, resClubs, resContests, resJury, resMeetings, 
        resHw, resCountries, resCats, resPatrons, resSalons, resPayments
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
        fetch(`${BACKEND_URL}/api/salons`),
        fetch(`${BACKEND_URL}/api/contest-payments`)
      ]);

      if (!resUsers.ok || !resContests.ok || !resMeetings.ok || !resHw.ok) throw new Error("Hiba");

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
      if (resPayments && resPayments.ok) setContestPayments(await resPayments.json());

      setIsInitialLoading(false); 
    } catch (e) { 
      if (retryCount < 3) setTimeout(() => fetchData(retryCount + 1), 1500); 
      else { setIsInitialLoading(false); alert("Átmeneti hálózati hiba!"); }
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
    fetchData();
    const urlParams = new URLSearchParams(window.location.search);
    const isSuccess = urlParams.get('success');

    if (isSuccess) {
      window.history.replaceState(null, '', window.location.pathname);
      alert('🎉 Sikeres aktiválás! Kérlek várj pár másodpercet...');
    }

    const storedToken = localStorage.getItem('photoAppToken');
    if (storedToken) {
      try {
        const decoded: any = jwtDecode(storedToken);
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('photoAppToken');
          setIsAuthLoading(false);
        } else {
          setTimeout(() => {
            const attemptSync = async (retry = 0) => {
              try {
                const res = await fetch(`${BACKEND_URL}/api/auth/sync`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: decoded.email, name: decoded.name, sub: decoded.sub })
                });
                if (!res.ok) throw new Error("Hiba");
                const data = await res.json();
                setUser({ 
                  ...decoded, 
                  isPremium: data.isPremium, 
                  is_premium: data.isPremium,
                  premiumUntil: data.premiumUntil, 
                  premiumLevel: data.premiumLevel,
                  premium_level: data.premiumLevel
                });
                setIsAuthLoading(false); 
              } catch (err) {
                if (retry < 3) setTimeout(() => attemptSync(retry + 1), 1500); 
                else { setUser(decoded); setIsAuthLoading(false); }
              }
            };
            attemptSync(); 
            fetchMyEntries(decoded.email);
          }, isSuccess ? 2500 : 0);
        }
      } catch (e) { localStorage.removeItem('photoAppToken'); setIsAuthLoading(false); }
    } else setIsAuthLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-disable
  }, []);

  useEffect(() => {
    if (!isInitialLoading && !isAuthLoading) {
      setAnimateOut(true);
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isInitialLoading, isAuthLoading]);

  const currentDbUser = allUsers.find(u => u.email === user?.email);
  const isLeader = currentDbUser?.club_role === 'leader' || currentDbUser?.club_role === 'deputy';
  const isPremium = currentDbUser?.stripe_status === 'active' || 
    (currentDbUser?.premium_until && new Date(currentDbUser.premium_until) > new Date());

  useEffect(() => {
    if (activeTab === 'club_homeworks' && currentDbUser) {
      const club = clubs.find(c => c.name === currentDbUser.club_name);
      if (club) fetchClubHomeworkEntries(club.id, user.email);
    }
  // eslint-disable-next-line react-hooks/exhaustive-disable
  }, [activeTab, currentDbUser, clubs, user]);

  const handleDeleteHwEntry = async (entryId: number) => {
    if (!window.confirm("Biztosan törlöd ezt a feltöltést?")) return;
    const res = await fetch(`${BACKEND_URL}/api/homework-entries/${entryId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEmail: user.email }) });
    if (res.ok) { fetchMyEntries(user.email); const club = clubs.find(c => c.name === currentDbUser?.club_name); if (club) fetchClubHomeworkEntries(club.id, user.email); }
  };

  const handleToggleLike = async (entryId: number) => {
    const res = await fetch(`${BACKEND_URL}/api/homework-entries/${entryId}/like`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEmail: user.email }) });
    if (res.ok) { const club = clubs.find(c => c.name === currentDbUser?.club_name); if (club) fetchClubHomeworkEntries(club.id, user.email); }
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email, contestId: contestId, returnUrl: window.location.origin })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Hiba a fizetés indításakor.');
    } catch (e) { alert('Hálózati hiba a Stripe elérésekor!'); }
  };

  const handleAddClub = async () => { if (!newClubName) return; const res = await fetch(`${BACKEND_URL}/api/clubs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newClubName }) }); if (res.ok) { setNewClubName(''); fetchData(); } };
  const handleDeleteClub = async (id: number) => { if (!window.confirm("Biztosan törlöd ezt a klubot?")) return; const res = await fetch(`${BACKEND_URL}/api/clubs/${id}`, { method: 'DELETE' }); if (res.ok) fetchData(); };
  
  const handleUpdateClub = async (id: number, name: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/clubs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        fetchData();
        alert('Klub neve sikeresen frissítve!');
      } else {
        alert('Hiba történt a klub frissítésekor.');
      }
    } catch (e) {
      alert('Hálózati hiba történt!');
    }
  };

  const saveUserClub = async (email: string) => { 
    const clubName = userClubEdits[email] !== undefined ? userClubEdits[email] : (allUsers.find(u => u.email === email)?.club_name || ''); 
    const clubRole = userRoleEdits[email] !== undefined ? userRoleEdits[email] : (allUsers.find(u => u.email === email)?.club_role || 'member');
    
    const matchedClub = clubs.find(c => c.name === clubName);
    const clubId = matchedClub ? matchedClub.id : null;

    const res = await fetch(`${BACKEND_URL}/api/users/${email}`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ clubName, clubRole, clubId })
    }); 
    if (res.ok) { alert("Sikeres mentés!"); fetchData(); } 
  };
  
  const handleCreateContest = async () => { 
    if (!newTitle || !newStart || !newEnd || !newCats) return alert("Cím, dátumok és kategóriák kötelezőek!"); 
    
    let finalRestrictedClubId: number | null = null;
    if (user.email === ADMIN_EMAIL) {
      finalRestrictedClubId = newRestrictedClub ? Number(newRestrictedClub) : null;
    } else {
      finalRestrictedClubId = currentDbUser?.club_id || null;
      if (!finalRestrictedClubId) return alert("Hiba: Nem vagy klubhoz rendelve!");
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
        restrictedClubId: finalRestrictedClubId,
        sponsorClubId: newSponsorClub ? Number(newSponsorClub) : null, 
        entryFee: newEntryFee, 
        feeCurrency: newFeeCurrency, 
        categorySettings: newCategorySettings 
      }) 
    }); 
    if (res.ok) { 
      setNewTitle(''); setNewDesc(''); setNewStart(''); setNewEnd(''); setNewCats(''); setNewRestrictedClub(''); setNewSponsorClub(''); setNewEntryFee(0); setNewFeeCurrency('HUF'); 
      fetchData(); 
      alert("Pályázat sikeresen kiírva! 🚀");
    } else alert("Hiba történt a mentés során.");
  };

  const startEdit = (contest: any) => { 
    setEditContestId(contest.id); 
    setEditTitle(contest.title); 
    setEditDesc(contest.description); 
    setEditCats(contest.categories || ''); 
    setEditRestrictedClub(contest.restricted_club_id ? String(contest.restricted_club_id) : ''); 
    
    setEditSponsorClub(contest.sponsor_club_id ? String(contest.sponsor_club_id) : '');

    setEditEntryFee(contest.entry_fee || 0); 
    setEditFeeCurrency(contest.fee_currency || 'HUF');
    
    const formatDate = (dateStr: string | null) => { if (!dateStr) return ''; return dateStr.replace('Z', '').substring(0, 16); }; 
    try { setEditCategorySettings(typeof contest.category_settings === 'string' ? JSON.parse(contest.category_settings) : (contest.category_settings || {})); } catch(e) { setEditCategorySettings({}); }
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
        restrictedClubId: editRestrictedClub ? Number(editRestrictedClub) : null,
        sponsorClubId: editSponsorClub ? Number(editSponsorClub) : null, 
        entryFee: editEntryFee, 
        feeCurrency: editFeeCurrency, 
        categorySettings: editCategorySettings 
      }) 
    }); 
    if (res.ok) { setEditContestId(null); setEditSponsorClub(''); fetchData(); alert("Pályázat sikeresen frissítve!"); } 
  };

  const handleAddJury = async (contestId: number) => { if (!selectedJuryEmail) return; const res = await fetch(`${BACKEND_URL}/api/jury`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contestId, userEmail: selectedJuryEmail }) }); if (res.ok) { setSelectedJuryEmail(''); fetchData(); } };
  const handleRemoveJury = async (contestId: number, email: string) => { const res = await fetch(`${BACKEND_URL}/api/jury`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contestId, userEmail: email }) }); if (res.ok) fetchData(); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { setUploadFile(file); setUploadPreview(URL.createObjectURL(file)); } };
  
  // 🎯 JAVÍTVA: Form-data sorrend és a digitális pecsétek elküldése
  const handleUpload = async (contestId: number) => { 
    if (!uploadFile || !uploadTitle || !uploadCategory) return alert("Minden kötelező!"); 
    
    setIsUploading(true); 
    try { 
      const formData = new FormData(); 
      formData.append('contestId', String(contestId)); 
      formData.append('userEmail', user.email); 
      formData.append('userName', user.name); 
      formData.append('title', uploadTitle); 
      formData.append('category', uploadCategory); 
      formData.append('acceptedTerms', '1');
      formData.append('acceptedTermsAt', new Date().toISOString());
      formData.append('photo', uploadFile); 
      
      const res = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: formData }); 
      if (res.ok) { 
        alert("Sikeres nevezés! A jognyilatkozatot és a technikai validációt rögzítettük."); 
        setActiveUploadContest(null); 
        setUploadFile(null); 
        setUploadPreview(null); 
        setUploadTitle(''); 
        setUploadCategory(''); 
        fetchMyEntries(user.email); 
      } else { 
        const err = await res.json(); 
        alert(`Hiba: ${err.error}`); 
      } 
    } catch (error) { 
      alert("Hálózati hiba történt a feltöltés közben!"); 
    } finally { 
      setIsUploading(false); 
    } 
  };

  const handleUpdateEntryTitle = async (entryId: number) => { 
    if (!editEntryTitle) return alert('A cím nem lehet üres!'); 
    const res = await fetch(`${BACKEND_URL}/api/entries/${entryId}`, { 
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: editEntryTitle, userEmail: user.email }) 
    }); 
    if (res.ok) { setEditingEntryId(null); fetchMyEntries(user.email); } else alert('Hiba a cím frissítésekor!'); 
  };

  const handleDeleteEntry = async (entryId: number) => { 
    if (!window.confirm("Biztosan törlöd?")) return; 
    const res = await fetch(`${BACKEND_URL}/api/entries/${entryId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEmail: user.email }) }); 
    if (res.ok) fetchMyEntries(user.email); 
  };

  const startJudging = async (contestId: number) => { const res = await fetch(`${BACKEND_URL}/api/jury-entries/${contestId}?userEmail=${user.email}`); if (res.ok) { setUnvotedEntries(await res.json()); setJudgingContestId(contestId); setCurrentScore(''); } };
  const submitVote = async () => { 
    const score = Number(currentScore); 
    if (score < 0 || score > 100 || currentScore === '') return alert("0 és 100 közötti pontszámot adj meg!"); 
    const res = await fetch(`${BACKEND_URL}/api/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entryId: unvotedEntries[0].id, juryEmail: user.email, score }) }); 
    if (res.ok) { setUnvotedEntries(prev => prev.slice(1)); setCurrentScore(''); if (unvotedEntries.length === 1) { fetchMyEntries(user.email); fetchData(); } } 
  };
  const loadResults = async (contestId: number) => { const res = await fetch(`${BACKEND_URL}/api/results/${contestId}`); if (res.ok) { setContestResults(await res.json()); setViewResultsContestId(contestId); } };
  const loadStats = async (contestId: number) => { const res = await fetch(`${BACKEND_URL}/api/admin/stats/${contestId}`); if (res.ok) { setContestStats(await res.json()); setViewStatsContestId(contestId); } };
  const handleDeleteContest = async (id: number) => { if (!window.confirm("❗ BIZTOSAN TÖRLÖD ezt a pályázatot?")) return; const res = await fetch(`${BACKEND_URL}/api/contests/${id}`, { method: 'DELETE' }); if (res.ok) fetchData(); else alert("Hiba történt a törlés során!"); };
  const loadJuryProgress = async (contestId: number) => { const res = await fetch(`${BACKEND_URL}/api/admin/jury-stats/${contestId}`); if (res.ok) { setJuryProgressData(await res.json()); setViewJuryProgressId(contestId); } };
  
  // 🎯 MÓDOSÍTVA: Külsős zsűritagok intelligens visszamérése
  const filteredContests = contests.filter(contest => {
    const isRestricted = contest.restricted_club && contest.restricted_club.trim() !== '';
    const now = new Date(); const start = contest.start_date ? new Date(contest.start_date) : new Date(0); const end = contest.end_date ? new Date(contest.end_date) : new Date(0); const isEnded = now > end && start.getFullYear() > 1970;
    const isUserJuryForThisContest = juryList.some(j => j.contest_id === contest.id && j.user_email === user?.email);

    if (activeTab === 'admin_contests') return true; 
    if (activeTab === 'contests_closed') { if (!isEnded) return false; if (isRestricted && contest.restricted_club !== currentDbUser?.club_name && !isUserJuryForThisContest) return false; return true; }
    if (activeTab === 'contests_club_active') return (isRestricted && contest.restricted_club === currentDbUser?.club_name && !isEnded) || isUserJuryForThisContest;
    if (activeTab === 'contests_open_active') return !isRestricted && !isEnded;
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
      (p.name && p.name.toLowerCase().includes(q)) || (p.number && p.number.toLowerCase().includes(q))
    );
    return matchName || matchPatron;
  });

  const headerUser = useMemo(() => {
    if (!user) return null;
    if (!currentDbUser) return user;
    return {
      ...user,
      name: currentDbUser.name || user.name,
      is_premium: currentDbUser.is_premium,
      isPremium: currentDbUser.is_premium === 1,
      premium_until: currentDbUser.premium_until,
      club_name: currentDbUser.club_name,
      club_role: currentDbUser.club_role
    };
  }, [user, currentDbUser]);

  return (
    <>
      {fullscreenData && (
        <FullscreenModal data={fullscreenData} onClose={() => setFullscreenData(null)} entryList={fullscreenData._entryList} currentIndex={fullscreenData._currentIndex} onNavigate={fullscreenData._onNavigate} onToggleLike={fullscreenData._onToggleLike} />
      )}
      {selectedSalon && <SalonModal salon={selectedSalon} user={user} onClose={() => setSelectedSalon(null)} />}
      {activeVideo && <VideoModal videoUrl={activeVideo} onClose={() => setActiveVideo(null)} />}

      {showSplash ? (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#090d16', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyIntent: 'center', zIndex: 999999, opacity: animateOut ? 0 : 1, transition: 'opacity 0.6s cubic-bezier(0.25, 1, 0.5, 1)', pointerEvents: 'none' }}>
          <div style={{ width: '90%', maxWidth: '580px', aspectRatio: '16/9', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.06)', background: '#000', position: 'relative' }}>
            <video src={lang === 'en' ? '/splash_en.mp4' : '/splash_hu.mp4'} autoPlay muted playsInline loop style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ marginTop: '30px', textAlign: 'center', animation: 'appSplashPulse 1.8s infinite' }}>
            <h4 style={{ color: '#f8fafc', fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 6px 0', letterSpacing: '0.5px' }}>{lang === 'en' ? 'Launching System...' : 'R
