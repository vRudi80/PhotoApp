import React, { createContext, useState, useContext } from 'react';

// 📊 A FELÜLET STATIKUS SZÓTÁRA
// Ide gyűjtjük a gombok, feliratok fix szövegeit. Nyugodtan bővíthetjük később!
const translations = {
  hu: {
    // Navigációs fülek
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
  },
  en: {
    // Navigációs fülek
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
