import React, { createContext, useState, useContext } from 'react';

// 📊 A FELÜLET STATIKUS SZÓTÁRA
// Ide gyűjtjük a gombok, feliratok fix szövegeit. Nyugodtan bővíthetjük később!
const translations = {
  hu: {
    // Navigációs fülek (WeeklyChallengeView)
    tabChallenges: '🏆 Kihívások',
    tabUpcoming: '⏳ Közelgő ligák',
    tabPast: '📜 Befejezett ligák',
    tabAlbum: '🖼️ Képcsarnok',
    tabStats: '🏆 Dicsőségfalam',
    tabHof: '👑 Mesterek csarnoka',
    btnRules: '📖 Játékszabályok & Rangok',
    
    // Kártya feliratok
    typeBlitz: '🔴 Villámfutam',
    typeMaster: '🔵 Mesterfutam',
    statusMaster: '🚀 Képmester vagy',
    statusEntered: '🚀 Neveztél',
    statusNotEntered: '⏳ Még nem neveztél',
    timeLeft: '⏳ Hátralévő idő:',
    photographers: 'fotós',
    unvoted: 'értékelendő',
    loading: '⏳ Betöltés...',

    // 🎯 ÚJ: FEJLÉC / MENÜPONTOK
    navHome: '🏠 Főoldal',
    navArena: '🏆 Mesterek ligája',
    navContests: '📝 Pályázatok',
    navClub: '👥 Fotóklub',
    navInternational: '🌐 Nemzetközi szalonok',
    navMap: '🌍 Helyszínek',
    navAdmin: '⚙️ Admin',
    
    // Pályázatok almenü
    subClubContests: 'Klubom aktív pályázatai',
    subOpenContests: 'Nyílt aktív pályázatok',
    subClosedContests: 'Lezárult pályázatok',
    
    // Fotóklub almenü
    subClubNews: 'Klub Hírek',
    subClubNights: 'Klubestek',
    subClubHomeworks: 'Házi feladatok',
    
    // Nemzetközi almenü
    subSalonsList: '🌐 Szalonok listája',
    subFiap: '🏅 FIAP Követő',
    subMafosz: 'MAFOSZ Követő',
    
    // Admin almenü
    subLeaderClub: '🛡️ Klubom adatai',
    subManageContests: 'Pályázatok kezelése',
    subManageMeetings: 'Klubestek kezelése',
    subManageHomeworks: 'Házi feladatok kezelése',
    subManageWeekly: 'Kihívások kezelése',
    subManageSettings: 'Kategóriák és Díjak',
    subManageSalons: 'Szalonok kezelése',
    subManageUsers: 'Felhasználók',
    subManageClubs: 'Fotóklubok',
    
    // Felhasználói fiók almenü
    subProfile: '👤 Profilom',
    subPortfolio: '🖼️ Saját Portfólió',
    subPackages: '💎 Tárhelycsomagom',
    subSupport: '✉️ Support & Segítség',
    subLogout: '🚪 Kijelentkezés',

    dashWelcome: 'Üdvözlünk',
    dashSupportNotice: 'Ha valami nem megfelelően működik, a support részen kapcsolatba léphetsz a fejlesztővel!',
    dashPremiumBadge: '⭐ Aktív Prémium Tag',
    dashAlertsTitle: '🔔 Aktuális Események & Értesítések',
    dashSyncing: '⏳ Adatok szinkronizálása a szerverrel...',
    dashSyncNotice: '(Ha régen voltál itt, a szerver felébresztése eltarthat pár másodpercig)',
    dashAlertsError: '❌ Nem sikerült betölteni az értesítéseket.',
    dashReload: 'Újratöltés',
    dashNewNews: 'Új Klub Hír!',
    dashLocation: 'Helyszín',
    dashHomework: 'Házi feladat',
    dashActiveContest: 'Aktív Pályázat',
    dashNoAlerts: 'Jelenleg nincs új értesítésed vagy határidős feladatod. Nyugalom van! ☕',

    tileWeeklyTitle: 'Kihívások',
    tileWeeklyDesc: 'Tölts fel az aktuális napi, vagy heti témában, szavazz mások képeire és kerülj a toplista élére!',
    tileContestsTitle: 'Nyílt Pályázatok',
    tileContestsDesc: 'Vegyél részt a közösségi vagy zártkörű házi fotópályázatokon.',
    tilePortfolioTitle: 'Saját Portfólió',
    tilePortfolioDesc: 'Töltsd fel és menedzseld a saját fotóidat, nézd meg az eredményeidet, vagy akár kérj AI elemzést.',
    tileMapTitle: 'Fotós Helyszínek',
    tileMapDesc: 'Fedezz fel új fotós helyeket a térképen, vagy oszd meg a sajátjaidat!',
    tileProgressTitle: 'Minősítések (FIAP/MAFOSZ)',
    tileProgressDesc: 'Kövesd nyomon az elfogadásaidat, generálj FIAP kompatibilis Excel táblát.',
    tileSalonsTitle: 'Nemzetközi Szalonok',
    tileSalonsDesc: 'Böngéssz az aktuális FIAP, MAFOSZ, PSA, vagy klub szalonok között, nevezd be a fotóidat pályázatokra.',
    tileClubTitle: 'Fotóklub Élet',
    tileClubDesc: 'Klubestek, találkozók, feladatok, vagy klub portfólió válogatás egy helyen.',
    tileAdminTitle: 'Adminisztráció',
    tileAdminDesc: 'Pályázatok, klubestek, felhasználók és szalonok kezelése.'
  },
  en: {
    // Navigációs fülek (WeeklyChallengeView)
    tabChallenges: '🏆 Challenges',
    tabUpcoming: '⏳ Upcoming Leagues',
    tabPast: '📜 Past Leagues',
    tabAlbum: '🖼️ Photo Arena',
    tabStats: '🏆 My Trophies',
    tabHof: '👑 Hall of Fame',
    btnRules: '📖 Rules & Ranks',
    
    // Kártya feliratok
    typeBlitz: '🔴 Blitz Match',
    typeMaster: '🔵 Master Match',
    statusMaster: '🚀 You are the Master',
    statusEntered: '🚀 Entered',
    statusNotEntered: '⏳ Not Entered Yet',
    timeLeft: '⏳ Time Left:',
    photographers: 'photographers',
    unvoted: 'to review',
    loading: '⏳ Loading...',

    // 🎯 ÚJ: FEJLÉC / MENÜPONTOK ANGOLUL
    navHome: '🏠 Home',
    navArena: '🏆 Masters League',
    navContests: '📝 Contests',
    navClub: '👥 Photo Club',
    navInternational: '🌐 Intl. Salons',
    navMap: '🌍 Map Spots',
    navAdmin: '⚙️ Admin',
    
    // Pályázatok almenü
    subClubContests: 'My Club Active Contests',
    subOpenContests: 'Open Active Contests',
    subClosedContests: 'Closed Contests',
    
    // Fotóklub almenü
    subClubNews: 'Club News',
    subClubNights: 'Club Nights',
    subClubHomeworks: 'Homeworks',
    
    // Nemzetközi almenü
    subSalonsList: '🌐 Salons List',
    subFiap: '🏅 FIAP Tracker',
    subMafosz: 'MAFOSZ Tracker',
    
    // Admin almenü
    subLeaderClub: '🛡️ My Club Data',
    subManageContests: 'Manage Contests',
    subManageMeetings: 'Manage Club Nights',
    subManageHomeworks: 'Manage Homeworks',
    subManageWeekly: 'Manage Challenges',
    subManageSettings: 'Categories & Awards',
    subManageSalons: 'Manage Salons',
    subManageUsers: 'Users',
    subManageClubs: 'Photo Clubs',
    
    // Felhasználói fiók almenü
    subProfile: '👤 My Profile',
    subPortfolio: '🖼️ My Portfolio',
    subPackages: '💎 My Storage',
    subSupport: '✉️ Support & Help',
    subLogout: '🚪 Logout',

    dashWelcome: 'Welcome',
    dashSupportNotice: 'If something is not working properly, you can contact the developer in the support section!',
    dashPremiumBadge: '⭐ Active Premium Member',
    dashAlertsTitle: '🔔 Current Events & Notifications',
    dashSyncing: '⏳ Syncing data with the server...',
    dashSyncNotice: '(If you haven\'t been here in a while, waking up the server might take a few seconds)',
    dashAlertsError: '❌ Failed to load notifications.',
    dashReload: 'Reload',
    dashNewNews: 'New Club News!',
    dashLocation: 'Location',
    dashHomework: 'Homework',
    dashActiveContest: 'Active Contest',
    dashNoAlerts: 'You currently have no new notifications or deadline tasks. All quiet! ☕',

    // Főoldal Csempék EN
    tileWeeklyTitle: 'Challenges',
    tileWeeklyDesc: 'Upload for the current daily or weekly theme, vote on others\' photos, and reach the top of the leaderboard!',
    tileContestsTitle: 'Open Contests',
    tileContestsDesc: 'Participate in community or private local photo contests.',
    tilePortfolioTitle: 'My Portfolio',
    tilePortfolioDesc: 'Upload and manage your own photos, view your results, or even request an AI analysis.',
    tileMapTitle: 'Photo Locations',
    tileMapDesc: 'Discover new photography spots on the map or share your own!',
    tileProgressTitle: 'Distinctions (FIAP/MAFOSZ)',
    tileProgressDesc: 'Track your acceptances and generate a FIAP-compatible Excel sheet.',
    tileSalonsTitle: 'International Salons',
    tileSalonsDesc: 'Browse through current FIAP, MAFOSZ, PSA, or club salons, and enter your photos into contests.',
    tileClubTitle: 'Photo Club Life',
    tileClubDesc: 'Club nights, meetings, tasks, or club portfolio selections all in one place.',
    tileAdminTitle: 'Administration',
    tileAdminDesc: 'Manage contests, club nights, users, and salons.'
  }
};

type Language = 'hu' | 'en';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof typeof translations.hu) => string;
}

const LanguageContext = createContext<LanguageContextType>({} as LanguageContextType);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 🎯 JAVÍTVA: Ha nincs elmentve semmi, kényszerítve a magyar (hu) az alapértelmezett!
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_lang');
    if (saved === 'hu' || saved === 'en') return saved;
    return 'hu'; 
  });

  const setLang = (newLang: Language) => {
    localStorage.setItem('app_lang', newLang);
    setLangState(newLang);
  };

  const t = (key: keyof typeof translations.hu) => {
    return translations[lang]?.[key] || translations['hu'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
