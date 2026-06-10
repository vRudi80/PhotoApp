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
    subLogout: '🚪 Kijelentkezés'
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
    subLogout: '🚪 Logout'
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
