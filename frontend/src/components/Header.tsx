import { useState, useEffect, useRef } from 'react';
import { googleLogout } from '@react-oauth/google';
import { ADMIN_EMAIL, BACKEND_URL } from '../utils/constants';

import logoHu from './logo_hu2.png';
import logoEn from './logo_en2.png';
import packageJson from '../../package.json';

import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

import { 
  Menu, 
  X, 
  Globe, 
  Award, 
  Mic, 
  ShoppingBag, 
  Map, 
  Newspaper, 
  User, 
  Sparkles, 
  Settings,
  ShieldAlert,
  LogOut,
  LifeBuoy,
  Home,
  Users,
  Sun,
  MessageCircleQuestion,
  Moon,
  ImageIcon,
  BookOpen,
  Box,
  Gamepad2,
  Smartphone,
  Calendar,
  Building2,
  Ban,
  Aperture,
  Trophy,
  MoreHorizontal,
  Mail
} from 'lucide-react';

interface HeaderProps {
  user : any;
  isLeader: boolean;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  dropdownOpen: string | null;
  setDropdownOpen: (open: string | null) => void;
  onLogout: () => void;
}

const HEADER_STYLES = `
  /* ASZTALI ELRENDEZÉS */
  @media (min-width: 1060px) {
    .app-header {
      padding: 0 20px !important;
      height: 56px;
      display: flex !important;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    .mobile-header-top {
      display: none !important;
    }
    .header-nav-container {
      display: flex !important;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }
    .center-icon-bar {
      display: flex !important;
      align-items: center;
      gap: 8px;
      justify-content: center;
      flex: 1;
    }
    .left-sidebar-panel {
      position: fixed;
      top: 56px;
      left: 0;
      width: 230px;
      height: calc(100vh - 56px);
      background: var(--bg-card, #131b2e);
      border-right: 1px solid var(--border-main, #222f47);
      padding: 20px 16px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 990;
      overflow-y: auto;
    }
    body.has-left-sidebar main {
      margin-left: 230px !important;
      transition: margin-left 0.2s ease;
    }
  }

  /* MOBIL ELRENDEZÉS */
  @media (max-width: 1059px) {
    .left-sidebar-panel {
      display: none !important;
    }
    body.has-left-sidebar main {
      margin-left: 0 !important;
    }
    .header-desktop-brand-wrapper {
      display: none !important;
    }
    .mobile-header-top {
      display: flex !important;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      padding: 0 16px;
      box-sizing: border-box;
      height: 56px !important;
      background: var(--bg-card, #131b2e);
    }
    .hamburger-btn {
      background: var(--bg-main, #0f172a);
      color: var(--text-title, #f8fafc);
      border: 1px solid var(--border-main, #222f47);
      padding: 6px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 38px;
      width: 38px;
    }
    .header-nav-container {
      display: none;
      flex-direction: column;
      position: absolute;
      top: 56px;
      left: 0;
      right: 0;
      max-height: calc(100vh - 60px);
      overflow-y: auto;
      background: var(--bg-card, #131b2e);
      border-bottom: 1px solid var(--border-main, #222f47);
      padding: 16px;
      box-sizing: border-box;
      gap: 12px;
      z-index: 99999;
    }
    .header-nav-container.mobile-open {
      display: flex !important;
    }
  }

  /* TOP IKON GOMBOK */
  .top-icon-btn {
    background: transparent;
    border: none;
    color: var(--text-body, #94a3b8);
    padding: 10px 18px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: all 0.15s ease;
    height: 48px;
  }
  .top-icon-btn:hover {
    color: var(--text-title, #f8fafc);
    background: rgba(255, 255, 255, 0.04);
  }
  .top-icon-btn.active {
    color: #38bdf8 !important;
  }
  .top-icon-btn.active::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 10%;
    right: 10%;
    height: 3px;
    background: #38bdf8;
    border-radius: 3px 3px 0 0;
    box-shadow: 0 -2px 8px rgba(56, 189, 248, 0.5);
  }

  /* PIROS ÉRTESÍTÉSI PÖTTY A TOP IKONOKON */
  .badge-dot {
    position: absolute;
    top: 8px;
    right: 12px;
    width: 8px;
    height: 8px;
    background-color: #ef4444;
    border-radius: 50%;
    border: 2px solid var(--bg-card, #131b2e);
  }

  /* SIDEBAR ALMENÜ GOMBOK */
  .sidebar-sub-item {
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    color: var(--text-body, #cbd5e1);
    padding: 9px 12px;
    border-radius: 8px;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .sidebar-sub-item:hover, .sidebar-sub-item.active {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-title, #f8fafc);
  }
  .sidebar-sub-item .red-bullet {
    color: #ef4444;
    font-size: 0.75rem;
  }
`;

function LogoBrandBlock({ logo } : { logo: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
      <div style={{ 
        background: 'var(--bg-main, #0f172a)', 
        padding: '5px 6px', 
        borderRadius: '8px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        border: '1px solid var(--border-main, #222f47)',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
      }}>
        <img src={logo} alt="PhotAwesome" style={{ height: '22px', width: 'auto', objectFit: 'contain' }} />
      </div>
      <div style={{ fontWeight: '800', color: 'var(--text-title, #f8fafc)', fontSize: '1.2rem', letterSpacing: '-0.5px' }}>
        Phot<span style={{ background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Awesome</span>
      </div>
    </div>
  );
}

export default function Header({ 
  user, 
  isLeader, 
  activeTab, 
  setActiveTab, 
  dropdownOpen, 
  setDropdownOpen, 
  onLogout 
}: HeaderProps) {
  
  const { lang, setLang, t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadTicketsCount, setUnreadTicketsCount] = useState(0);
  const [unreadForumCount, setUnreadForumCount] = useState<number>(0);

  const [apkInfo] = useState<{ tag: string; url: string }>({
    tag: `v${packageJson.version}`,
    url: 'https://github.com/vRudi80/PhotoApp/releases/latest/download/photawesome.apk'
  });

  const isAdminUser = user?.email === ADMIN_EMAIL;
  const headerRef = useRef<HTMLDivElement>(null);

  let theme = 'dark';
  let toggleTheme = () => {};
  try {
    const themeContext = useTheme();
    if (themeContext) {
      theme = themeContext.theme;
      toggleTheme = themeContext.toggleTheme;
    }
  } catch (e) {}

  const currentLogo = lang === 'en' ? logoEn : logoHu;
  const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
    const token = localStorage.getItem('photoAppToken');
    return {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...extraHeaders
    };
  };

  useEffect(() => {
    const fetchUnreadForumTotal = async () => {
      try {
        const token = localStorage.getItem('photoAppToken');
        if (!token) return;
        const res = await fetch(`${BACKEND_URL}/api/forum/unread-total`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setUnreadForumCount((await res.json()).totalUnread);
      } catch (e) {}
    };
    fetchUnreadForumTotal();
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;
    const checkUnread = () => {
      const token = localStorage.getItem('photoAppToken');
      if (!token) return;
      fetch(`${BACKEND_URL}/api/tickets/unread-count?userEmail=${user.email}&isAdmin=${isAdminUser}`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => setUnreadTicketsCount(data.count || 0))
        .catch(console.error);
    };
    checkUnread();
  }, [user?.email, activeTab, isAdminUser]);

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setDropdownOpen(null);
    setIsMobileMenuOpen(false); 
  };

  // 🎯 KATEGÓRIA MEGÁLLAPÍTÁSA AZ AKTÍV TAB ALAPJÁN
  const getActiveCategory = () => {
    if (['dashboard'].includes(activeTab)) return 'home';
    if (['weekly_challenge'].includes(activeTab)) return 'arena';
    if (['contests_open_active', 'contests_club_active', 'contests_closed', 'salons', 'fiap_progress', 'mafosz_progress'].includes(activeTab)) return 'contests';
    if (['club_members', 'club_weekly_review', 'club_courses', 'club_news', 'club_nights', 'club_homeworks', 'public_news'].includes(activeTab)) return 'club';
    if (['podcast', 'marketplace', 'map_spots', 'quiz', '3d_gallery', 'photo_history'].includes(activeTab)) return 'explore';
    if (['leader_club', 'admin_contests', 'admin_voter_analysis', 'admin_meetings', 'admin_homeworks', 'admin_weekly', 'admin_salons', 'admin_users', 'admin_points', 'admin_quiz', 'admin_banned_emails', 'admin_clubs', 'admin_settings'].includes(activeTab)) return 'leader';
    return 'home';
  };

  const activeCategory = getActiveCategory();

  // SIDEBAR OSZLOP CSÚSZTATÁS DINAMIKUS OSZTÁLYA
  useEffect(() => {
    const hasSidebar = ['contests', 'club', 'explore', 'leader'].includes(activeCategory);
    if (hasSidebar) {
      document.body.classList.add('has-left-sidebar');
    } else {
      document.body.classList.remove('has-left-sidebar');
    }
  }, [activeCategory]);

  const silhouetteAvatar = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23475569'><circle cx='12' cy='8' r='4'/><path d='M12 14c-6.1 0-10 4-10 4v2h20v-2s-3.9-4-10-4z'/></svg>";
  const avatarUrl = user?.avatar_url || user?.picture || silhouetteAvatar;

  return (
    <>
      <style>{HEADER_STYLES}</style>

      {/* TOP HEADER */}
      <header ref={headerRef} className="app-header" style={{ position: 'relative', zIndex: 1000, width: '100%', background: 'var(--bg-card, #131b2e)', borderBottom: '1px solid var(--border-main, #222f47)', boxSizing: 'border-box' }}>
        
        <div className="mobile-header-top">
          <LogoBrandBlock logo={currentLogo} />
          <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div className={`header-nav-container ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          
          <div className="header-desktop-brand-wrapper">
            <LogoBrandBlock logo={currentLogo} />
          </div>

          {/* 🎯 KÖZÉPSŐ IKON-SÁV (TOP BAR ICONS ACCORDING TO IMAGE) */}
          <div className="center-icon-bar">
            
            {/* 1. FŐOLDAL (HOME) */}
            <button 
              className={`top-icon-btn ${activeCategory === 'home' ? 'active' : ''}`} 
              onClick={() => handleNavClick('dashboard')}
              title={t('navHome')}
            >
              <Home size={22} />
            </button>

            {/* 2. MENTOR PROGRAM / TANFOLYAMOK (APERTURE) */}
            <button 
              className={`top-icon-btn ${activeTab === 'club_courses' ? 'active' : ''}`} 
              onClick={() => handleNavClick('club_courses')}
              title={lang === 'en' ? 'Mentor Program' : 'Mentor Program'}
            >
              <Aperture size={22} />
              <span className="badge-dot" />
            </button>

            {/* 3. PÁLYÁZATOK (TROPHY) */}
            <button 
              className={`top-icon-btn ${activeCategory === 'contests' ? 'active' : ''}`} 
              onClick={() => handleNavClick('contests_open_active')}
              title={t('navContests')}
            >
              <Trophy size={22} />
              <span className="badge-dot" />
            </button>

            {/* 4. JÁTÉK / ARÉNA (AWARD / BADGE) */}
            <button 
              className={`top-icon-btn ${activeCategory === 'arena' ? 'active' : ''}`} 
              onClick={() => handleNavClick('weekly_challenge')}
              title={t('navArena')}
            >
              <Award size={22} />
            </button>

            {/* 5. KLUB & FÓRUM (USERS) */}
            <button 
              className={`top-icon-btn ${activeCategory === 'club' ? 'active' : ''}`} 
              onClick={() => handleNavClick('club_members')}
              title={t('navClub')}
            >
              <Users size={22} />
            </button>

            {/* 6. ÉRDEKESSÉGEK / FELFEDEZÉS (MORE ...) */}
            <button 
              className={`top-icon-btn ${activeCategory === 'explore' ? 'active' : ''}`} 
              onClick={() => handleNavClick('podcast')}
              title={t('navExplore') || 'Érdekességek'}
            >
              <MoreHorizontal size={22} />
            </button>

            {/* 7. VEZETŐ / ADMIN (SHIELD) */}
            {(user?.email === ADMIN_EMAIL || isLeader) && (
              <button 
                className={`top-icon-btn ${activeCategory === 'leader' ? 'active' : ''}`} 
                onClick={() => handleNavClick(isLeader ? 'leader_club' : 'admin_contests')}
                style={{ color: activeCategory === 'leader' ? '#ef4444' : '#f87171' }}
                title={lang === 'en' ? 'Leader' : 'Vezető'}
              >
                <ShieldAlert size={22} />
              </button>
            )}

          </div>

          {/* JOBB OLDALI IKONOK & BEÁLLÍTÁSOK */}
          <div className="user-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            
            {/* ÜZENETEK / TÁMOGATÁS (MAIL / TICKETS) */}
            <button 
              onClick={() => handleNavClick('tickets')}
              title={t('subSupport')}
              style={{
                background: unreadTicketsCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                border: 'none',
                color: unreadTicketsCount > 0 ? '#ef4444' : 'var(--text-body, #94a3b8)',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
            >
              <Mail size={20} />
              {unreadTicketsCount > 0 && (
                <span style={{ position: 'absolute', top: '2px', right: '2px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '14px', height: '14px', fontSize: '0.65rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {unreadTicketsCount}
                </span>
              )}
            </button>

            {/* TÉMA VÁLTÓ */}
            <button onClick={toggleTheme} style={{ background: 'transparent', border: '1px solid var(--border-main, #222f47)', color: 'var(--text-body, #94a3b8)', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', height: '32px' }}>
              {theme === 'dark' ? <Sun size={14} color="#fbbf24" fill="#fbbf24" /> : <Moon size={14} color="#475569" />}
            </button>

            {/* NYELVVÁLASZTÓ */}
            <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-main, #0f172a)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-main, #222f47)' }}>
              <button onClick={() => setLang('hu')} style={{ background: lang === 'hu' ? 'rgba(255,255,255,0.08)' : 'transparent', color: lang === 'hu' ? 'var(--text-title, #f8fafc)' : '#64748b', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>HU</button>
              <button onClick={() => setLang('en')} style={{ background: lang === 'en' ? 'rgba(255,255,255,0.08)' : 'transparent', color: lang === 'en' ? 'var(--text-title, #f8fafc)' : '#64748b', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>EN</button>
            </div>

            {/* ANDROID APK */}
            <a 
              href={apkInfo.url} 
              download="photawesome.apk" 
              title={`PhotAwesome Android App (${apkInfo.tag})`}
              style={{ background: 'var(--bg-main, #0f172a)', border: '1px solid var(--border-main, #222f47)', color: '#10b981', padding: '6px 10px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Smartphone size={14} /> <span>APK ({apkInfo.tag})</span>
            </a>

            {/* PROFIL FOTÓ / DROPDOWN */}
            <div className="nav-item-container desktop-user-dropdown" style={{ position: 'relative' }}>
              <button 
                className={`top-icon-btn ${dropdownOpen === 'user_account' ? 'active' : ''}`}
                style={{ padding: '4px', height: 'auto', borderRadius: '50%' }}
                onClick={() => setDropdownOpen(dropdownOpen === 'user_account' ? null : 'user_account')}
              >
                <img 
                  src={avatarUrl} 
                  alt="" 
                  referrerPolicy="no-referrer"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = silhouetteAvatar; }}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10b981', flexShrink: 0, backgroundColor: '#090d16' }} 
                />
              </button>

              {dropdownOpen === 'user_account' && (
                <div className="dropdown-menu" style={{ right: 0, left: 'auto', minWidth: '210px', position: 'absolute', top: '100%', background: 'var(--bg-card, #131b2e)', border: '1px solid var(--border-main, #222f47)', borderRadius: '8px', padding: '6px' }}>
                  <button className="drop-item" style={{ color: '#10b981' }} onClick={() => handleNavClick('profile')}><User size={14} /> {t('subProfile')}</button>
                  <button className="drop-item" style={{ color: '#f59e0b' }} onClick={() => handleNavClick('my_album')}><ImageIcon size={14} /> {t('subPortfolio')}</button>
                  <button className="drop-item" style={{ color: '#8b5cf6' }} onClick={() => handleNavClick('packages')}><Award size={14} /> {t('subPackages')}</button>
                  <button className="drop-item" style={{ color: '#f43f5e' }} onClick={() => handleNavClick('tickets')}><LifeBuoy size={14} /> {t('subSupport')} {unreadTicketsCount > 0 && `(${unreadTicketsCount})`}</button>
                  <div style={{ height: '1px', backgroundColor: 'var(--border-main, #222f47)', margin: '4px 0' }}></div>
                  <button className="drop-item" style={{ color: '#ef4444' }} onClick={() => { googleLogout(); onLogout(); }}><LogOut size={14} /> {t('subLogout')}</button>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* 🎯 BAL OLDALI ALMENÜ SÁV (LEFT SIDEBAR PANEL ACCORDING TO IMAGE_2.PNG) */}
      {activeCategory === 'contests' && (
        <aside className="left-sidebar-panel">
          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-title, #f8fafc)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            PÁLYÁZATOK
          </div>
          <button className={`sidebar-sub-item ${activeTab === 'contests_open_active' ? 'active' : ''}`} onClick={() => handleNavClick('contests_open_active')}>
            <span className="red-bullet">●</span> Nyílt aktív pályázatok
          </button>
          <button className={`sidebar-sub-item ${activeTab === 'contests_club_active' ? 'active' : ''}`} onClick={() => handleNavClick('contests_club_active')}>
            <span className="red-bullet">●</span> Klub pályázatok
          </button>
          <button className={`sidebar-sub-item ${activeTab === 'contests_closed' ? 'active' : ''}`} onClick={() => handleNavClick('contests_closed')}>
            Lezárult pályázatok
          </button>
          <button className={`sidebar-sub-item ${activeTab === 'salons' ? 'active' : ''}`} onClick={() => handleNavClick('salons')}>
            <span className="red-bullet">●</span> Szalonok listája
          </button>
          <button className={`sidebar-sub-item ${activeTab === 'fiap_progress' ? 'active' : ''}`} onClick={() => handleNavClick('fiap_progress')}>
            FIAP Követő
          </button>
          <button className={`sidebar-sub-item ${activeTab === 'mafosz_progress' ? 'active' : ''}`} onClick={() => handleNavClick('mafosz_progress')}>
            MAFOSZ Követő
          </button>
        </aside>
      )}

      {activeCategory === 'club' && (
        <aside className="left-sidebar-panel">
          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-title, #f8fafc)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            FÓRUM & KLUB
          </div>
          <button className={`sidebar-sub-item ${activeTab === 'club_members' ? 'active' : ''}`} onClick={() => handleNavClick('club_members')}>
            <span className="red-bullet">●</span> Klubtagok
          </button>
          <button className={`sidebar-sub-item ${activeTab === 'public_news' ? 'active' : ''}`} onClick={() => handleNavClick('public_news')}>
            <span className="red-bullet">●</span> Fórum {unreadForumCount > 0 && `(${unreadForumCount})`}
          </button>
          <button className={`sidebar-sub-item ${activeTab === 'club_weekly_review' ? 'active' : ''}`} onClick={() => handleNavClick('club_weekly_review')}>
            <span className="red-bullet">●</span> Heti Képértékelő
          </button>
          <button className={`sidebar-sub-item ${activeTab === 'club_courses' ? 'active' : ''}`} onClick={() => handleNavClick('club_courses')}>
            Klubtanfolyamok
          </button>
          <button className={`sidebar-sub-item ${activeTab === 'club_news' ? 'active' : ''}`} onClick={() => handleNavClick('club_news')}>
            Klub hírek
          </button>
          <button className={`sidebar-sub-item ${activeTab === 'club_nights' ? 'active' : ''}`} onClick={() => handleNavClick('club_nights')}>
            Klubestek
          </button>
          <button className={`sidebar-sub-item ${activeTab === 'club_homeworks' ? 'active' : ''}`} onClick={() => handleNavClick('club_homeworks')}>
            Házi feladatok
          </button>
        </aside>
      )}

      {activeCategory === 'explore' && (
        <aside className="left-sidebar-panel">
          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-title, #f8fafc)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            ÉRDEKESSÉGEK
          </div>
          <button className={`sidebar-sub-item ${activeTab === 'podcast' ? 'active' : ''}`} onClick={() => handleNavClick('podcast')}>
            <Mic size={14} /> Podcast
          </button>
          <button className={`sidebar-sub-item ${activeTab === 'marketplace' ? 'active' : ''}`} onClick={() => handleNavClick('marketplace')}>
            <ShoppingBag size={14} /> Piactér
          </button>
          <button className={`sidebar-sub-item ${activeTab === 'map_spots' ? 'active' : ''}`} onClick={() => handleNavClick('map_spots')}>
            <Map size={14} /> Fotós helyszínek (Térkép)
          </button>
          <button className={`sidebar-sub-item ${activeTab === 'quiz' ? 'active' : ''}`} onClick={() => handleNavClick('quiz')}>
            <MessageCircleQuestion size={14} /> Kvíz
          </button>
          <button className={`sidebar-sub-item ${activeTab === '3d_gallery' ? 'active' : ''}`} onClick={() => handleNavClick('3d_gallery')}>
            <Box size={14} /> 3D Tárlatok
          </button>
          <button className={`sidebar-sub-item ${activeTab === 'photo_history' ? 'active' : ''}`} onClick={() => handleNavClick('photo_history')}>
            <BookOpen size={14} /> Fotótörténeti album
          </button>
        </aside>
      )}

      {activeCategory === 'leader' && (user?.email === ADMIN_EMAIL || isLeader) && (
        <aside className="left-sidebar-panel">
          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#f87171', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            VEZETŐI MENÜ
          </div>
          {isLeader && (
            <button className={`sidebar-sub-item ${activeTab === 'leader_club' ? 'active' : ''}`} onClick={() => handleNavClick('leader_club')}>
              <Users size={14} /> Klubom adatai
            </button>
          )}
          <button className={`sidebar-sub-item ${activeTab === 'admin_meetings' ? 'active' : ''}`} onClick={() => handleNavClick('admin_meetings')}>
            <Calendar size={14} /> Klubestek kezelése
          </button>
          <button className={`sidebar-sub-item ${activeTab === 'admin_homeworks' ? 'active' : ''}`} onClick={() => handleNavClick('admin_homeworks')}>
            <BookOpen size={14} /> Házi feladatok kezelése
          </button>
          {isAdminUser && (
            <>
              <button className={`sidebar-sub-item ${activeTab === 'admin_contests' ? 'active' : ''}`} onClick={() => handleNavClick('admin_contests')}>
                <Award size={14} /> Pályázatok kezelése
              </button>
              <button className={`sidebar-sub-item ${activeTab === 'admin_voter_analysis' ? 'active' : ''}`} onClick={() => handleNavClick('admin_voter_analysis')}>
                <ShieldAlert size={14} /> Szavazat analitika
              </button>
              <button className={`sidebar-sub-item ${activeTab === 'admin_weekly' ? 'active' : ''}`} onClick={() => handleNavClick('admin_weekly')}>
                <Gamepad2 size={14} /> Heti játék kezelése
              </button>
              <button className={`sidebar-sub-item ${activeTab === 'admin_salons' ? 'active' : ''}`} onClick={() => handleNavClick('admin_salons')}>
                <Globe size={14} /> Szalonok kezelése
              </button>
              <button className={`sidebar-sub-item ${activeTab === 'admin_users' ? 'active' : ''}`} onClick={() => handleNavClick('admin_users')}>
                <User size={14} /> Felhasználók kezelése
              </button>
              <button className={`sidebar-sub-item ${activeTab === 'admin_clubs' ? 'active' : ''}`} onClick={() => handleNavClick('admin_clubs')}>
                <Building2 size={14} /> Fotóklubok kezelése
              </button>
              <button className={`sidebar-sub-item ${activeTab === 'admin_points' ? 'active' : ''}`} onClick={() => handleNavClick('admin_points')}>
                <Sparkles size={14} /> Pontrendszer
              </button>
              <button className={`sidebar-sub-item ${activeTab === 'admin_quiz' ? 'active' : ''}`} onClick={() => handleNavClick('admin_quiz')}>
                <MessageCircleQuestion size={14} /> Kvíz kezelése
              </button>
              <button className={`sidebar-sub-item ${activeTab === 'admin_banned_emails' ? 'active' : ''}`} onClick={() => handleNavClick('admin_banned_emails')}>
                <Ban size={14} /> Tiltólista
              </button>
              <button className={`sidebar-sub-item ${activeTab === 'admin_settings' ? 'active' : ''}`} onClick={() => handleNavClick('admin_settings')}>
                <Settings size={14} /> Beállítások
              </button>
            </>
          )}
        </aside>
      )}
    </>
  );
}
