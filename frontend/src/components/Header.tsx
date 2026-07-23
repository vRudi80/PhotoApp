import { useState, useEffect, useRef } from 'react';
import { googleLogout } from '@react-oauth/google';
import { ADMIN_EMAIL, BACKEND_URL } from '../utils/constants';

import logoHu from './logo_hu2.png';
import logoEn from './logo_en2.png';

import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

import { 
  Menu, 
  X, 
  ChevronDown, 
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
  CreditCard,
  LifeBuoy,
  Home,
  Flame,
  Users,
  Sun,
  MessageCircleQuestion,
  Moon,
  ImageIcon,
  BookOpen,
  Box
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
  @media (min-width: 1060px) {
    .app-header {
      padding: 0 24px !important;
      height: 56px;
      display: flex !important;
      align-items: center;
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
    .header-desktop-brand-wrapper {
      display: flex !important;
      align-items: center;
      margin-right: 16px;
    }
    .nav-group {
      display: flex !important;
      align-items: center;
      gap: 4px;
      flex: 1;
      justify-content: center;
    }
    .dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      background: var(--bg-card, #131b2e);
      border: 1px solid var(--border-main, #222f47);
      border-radius: 6px;
      padding: 4px;
      min-width: 190px;
      box-shadow: 0 12px 30px rgba(0,0,0,0.15);
    }
  }
  
  @media (max-width: 1059px) {
    .header-desktop-brand-wrapper {
      display: none !important;
    }
    .mobile-header-top {
      display: flex !important;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      padding: 0 20px;
      box-sizing: border-box;
      height: 56px !important;
      background: var(--bg-card, #131b2e);
    }
    .hamburger-btn {
      background: var(--bg-main, #0f172a);
      color: var(--text-body, #94a3b8);
      border: 1px solid var(--border-main, #222f47);
      padding: 6px 10px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 32px;
      width: 38px;
      box-sizing: border-box;
    }
    .header-nav-container {
      display: none;
      flex-direction: column;
      position: absolute;
      top: 56px;
      left: 0;
      right: 0;
      background: var(--bg-card, #131b2e);
      border-bottom: 1px solid var(--border-main, #222f47);
      padding: 16px 20px;
      box-sizing: border-box;
      gap: 12px;
      box-shadow: 0 15px 30px rgba(0,0,0,0.2);
      z-index: 99999;
    }
    .header-nav-container.mobile-open {
      display: flex !important;
    }
    .nav-group {
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: 6px;
    }
    .nav-item-container {
      width: 100%;
    }
    .nav-btn {
      width: 100% !important;
      text-align: left !important;
      justify-content: flex-start !important;
      padding: 10px 14px !important;
      background: var(--bg-main, #0f172a) !important;
      border: 1px solid var(--border-main, #222f47) !important;
      border-radius: 6px !important;
    }
    .user-group {
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: 10px;
      padding-top: 14px;
      border-top: 1px solid var(--border-main, #222f47);
    }
    .dropdown-menu {
      position: static !important;
      width: 100% !important;
      background: var(--bg-main, #0f172a) !important;
      box-shadow: none !important;
      margin-top: 4px;
      border-radius: 6px !important;
      padding: 6px !important;
      box-sizing: border-box;
      border: 1px solid var(--border-main, #222f47);
    }
  }

  .nav-btn {
    background: transparent;
    border: none;
    color: var(--text-body, #94a3b8);
    padding: 8px 12px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.88rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    transition: all 0.15s ease-in-out;
  }
  .nav-btn.active, .nav-btn:hover {
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-title, #f8fafc);
  }
  .drop-item {
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    color: var(--text-body, #94a3b8);
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.1s;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .drop-item:hover, .drop-item.active {
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-title, #f8fafc);
  }
`;

function LogoBrandBlock({ logo } : { logo: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
      <div style={{ 
        background: 'var(--bg-main, #0f172a)', 
        padding: '5px 6px', 
        borderRadius: '6px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        border: '1px solid var(--border-main, #222f47)',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
      }}>
        <img src={logo} alt="PhotAwesome" style={{ height: '22px', width: 'auto', objectFit: 'contain' }} />
      </div>
      <div style={{ fontWeight: '800', color: 'var(--text-title, #f8fafc)', fontSize: '1.25rem', letterSpacing: '-0.5px' }}>
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

  return (
    <header ref={headerRef} className="app-header" style={{ position: 'relative', zIndex: 1000, width: '100%', background: 'var(--bg-card, #131b2e)', borderBottom: '1px solid var(--border-main, #222f47)', boxSizing: 'border-box' }}>
      
      <style>{HEADER_STYLES}</style>
      
      <div className="mobile-header-top">
        <LogoBrandBlock logo={currentLogo} />
        <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      <div className={`header-nav-container ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        
        <div className="header-desktop-brand-wrapper">
          <LogoBrandBlock logo={currentLogo} />
        </div>

        <div className="nav-group">
          <div className="nav-item-container">
            <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleNavClick('dashboard')}>
              <Home size={14} /> <span>{t('navHome')}</span>
            </button>
          </div>

          <div className="nav-item-container">
            <button className={`nav-btn ${activeTab === 'weekly_challenge' ? 'active' : ''}`} style={{ color: activeTab === 'weekly_challenge' ? '#f97316' : '' }} onClick={() => handleNavClick('weekly_challenge')}>
              <Flame size={14} /> <span>{t('navArena')}</span>
            </button>
          </div>

          <div className="nav-item-container">
            <button className={`nav-btn ${activeTab === 'quiz' ? 'active' : ''}`} style={{ color: activeTab === 'quiz' ? '#f97316' : '' }} onClick={() => handleNavClick('quiz')}>
              <MessageCircleQuestion size={14} /> <span>{t('navQuiz')}</span>
            </button>
          </div>

          {/* 🎯 ÚJ: TÁRLATOK MENTŐ GOMB A FŐMENÜBEN */}
          <div className="nav-item-container">
            <button 
              className={`nav-btn ${activeTab === '3d_gallery' ? 'active' : ''}`} 
              style={{ color: activeTab === '3d_gallery' ? '#a78bfa' : '' }} 
              onClick={() => handleNavClick('3d_gallery')}
            >
              <Box size={14} /> <span>{lang === 'en' ? 'Exhibitions' : 'Tárlatok'}</span>
            </button>
          </div>

          <div className="nav-item-container">
            <button 
              className={`nav-btn ${activeTab === 'photo_history' ? 'active' : ''}`} 
              style={{ color: activeTab === 'photo_history' ? '#38bdf8' : '' }} 
              onClick={() => handleNavClick('photo_history')}
            >
              <BookOpen size={14} /> <span>{lang === 'en' ? 'History Gallery' : 'Fotótörténeti album'}</span>
            </button>
          </div>

          <div className="nav-item-container">
            <button 
              className={`nav-btn ${dropdownOpen === 'contests' || activeTab.startsWith('contests_') || ['salons', 'fiap_progress', 'mafosz_progress'].includes(activeTab) ? 'active' : ''}`} 
              onClick={() => setDropdownOpen(dropdownOpen === 'contests' ? null : 'contests')}
            >
              <Award size={14} /> <span>{t('navContests')}</span> <ChevronDown size={12} style={{ opacity: 0.6 }} />
            </button>
            {dropdownOpen === 'contests' && (
              <div className="dropdown-menu">
                <button className="drop-item" onClick={() => handleNavClick('contests_club_active')}>{t('subClubContests')}</button>
                <button className="drop-item" onClick={() => handleNavClick('contests_open_active')}>{t('subOpenContests')}</button>
                <button className="drop-item" onClick={() => handleNavClick('contests_closed')}>{t('subClosedContests')}</button>
                <div style={{ height: '1px', backgroundColor: 'var(--border-main, #222f47)', margin: '4px 0' }}></div>
                <button className="drop-item" style={{ color: '#38bdf8' }} onClick={() => handleNavClick('salons')}><Globe size={12} /> {t('subSalonsList')}</button>
                <button className="drop-item" onClick={() => handleNavClick('fiap_progress')}><Award size={12} /> {t('subFiap')}</button>
                <button className="drop-item" onClick={() => handleNavClick('mafosz_progress')}>
                  <img src="https://flagcdn.com/16x12/hu.png" width="14" height="10" alt="HU" style={{ borderRadius: '1px', objectFit: 'cover' }} />
                  {t('subMafosz')}
                </button>
              </div>
            )}
          </div>
          
          <div className="nav-item-container">
            <button className={`nav-btn ${dropdownOpen === 'club' || activeTab.startsWith('club_') || activeTab === 'public_news' ? 'active' : ''}`} onClick={() => setDropdownOpen(dropdownOpen === 'club' ? null : 'club')}>
              <Users size={14} /> <span>{t('navClub')}</span> <ChevronDown size={12} style={{ opacity: 0.6 }} />
            </button>
            {dropdownOpen === 'club' && (
              <div className="dropdown-menu">
                <button className="drop-item" onClick={() => handleNavClick('club_news')}>{t('subClubNews')}</button>
                <button className="drop-item" onClick={() => handleNavClick('club_nights')}>{t('subClubNights')}</button>
                <button className="drop-item" onClick={() => handleNavClick('club_homeworks')}>{t('subClubHomeworks')}</button>
              </div>
            )}
          </div>

          <div className="nav-item-container">
            <button className={`nav-btn ${activeTab === 'public_news' ? 'active' : ''}`} style={{ color: '#38bdf8' }} onClick={() => handleNavClick('public_news')}>
              <Newspaper size={14} /> <span>Fórum {unreadForumCount > 0 && `(${unreadForumCount})`}</span>
            </button>
          </div>
          
          {(user?.email === ADMIN_EMAIL || isLeader) && (
            <div className="nav-item-container">
              <button className={`nav-btn ${dropdownOpen === 'admin' || activeTab.startsWith('admin_') || activeTab === 'leader_club' ? 'active' : ''}`} style={{ color: '#ef4444' }} onClick={() => setDropdownOpen(dropdownOpen === 'admin' ? null : 'admin')}>
                <ShieldAlert size={14} /> <span>{t('navAdmin')}</span> <ChevronDown size={12} style={{ opacity: 0.6 }} />
              </button>
              {dropdownOpen === 'admin' && (
                <div className="dropdown-menu">
                  {isLeader && <button className="drop-item" style={{ color: '#0ea5e9' }} onClick={() => handleNavClick('leader_club')}>{t('subLeaderClub')}</button>}
                  {user?.email === ADMIN_EMAIL && <button className="drop-item" style={{ color: activeTab === 'admin_contests' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_contests')}>{t('subManageContests')}</button>}
                  {user?.email === ADMIN_EMAIL && (
  <button 
    className="drop-item" 
    style={{ color: activeTab === 'admin_voter_analysis' ? '#ef4444' : '#f87171', fontWeight: 'bold' }} 
    onClick={() => handleNavClick('admin_voter_analysis')}
  >
    <ShieldAlert size={12} /> Szavazat Analitika
  </button>
)}

                  <button className="drop-item" style={{ color: activeTab === 'admin_meetings' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_meetings')}>{t('subManageMeetings')}</button>
                  <button className="drop-item" style={{ color: activeTab === 'admin_homeworks' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_homeworks')}>{t('subManageHomeworks')}</button>
                  {user?.email === ADMIN_EMAIL && <button className="drop-item" style={{ color: activeTab === 'admin_weekly' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_weekly')}>{t('subManageWeekly')}</button>}
                  {user?.email === ADMIN_EMAIL && <button className="drop-item" style={{ color: '#ef4444' }} onClick={() => handleNavClick('admin_settings')}>{t('subManageSettings')}</button>}
                  {user?.email === ADMIN_EMAIL && <button className="drop-item" style={{ color: activeTab === 'admin_salons' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_salons')}>{t('subManageSalons')}</button>}
                  {user?.email === ADMIN_EMAIL && <button className="drop-item" style={{ color: activeTab === 'admin_users' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_users')}>{t('subManageUsers')}</button>}
                  {user?.email === ADMIN_EMAIL && <button className="drop-item" style={{ color: '#fbbf24', fontWeight: 'bold' }} onClick={() => handleNavClick('admin_points')}>Pontrendszer</button>}
                  {user?.email === ADMIN_EMAIL && <button className="drop-item" style={{ color: '#f59e0b', fontWeight: 'bold' }} onClick={() => handleNavClick('admin_quiz')}>Kvíz Kezelése</button>}
                  {user?.email === ADMIN_EMAIL && <button className="drop-item" onClick={() => handleNavClick('admin_banned_emails')}>Tiltólista</button>}
                  {user?.email === ADMIN_EMAIL && <button className="drop-item" onClick={() => handleNavClick('admin_clubs')}>{t('subManageClubs')}</button>}
                </div>
              )}
            </div>
          )}
        </div> 

        <div className="user-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <button onClick={toggleTheme} style={{ background: 'transparent', border: '1px solid var(--border-main, #222f47)', color: 'var(--text-body, #94a3b8)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', height: '30px' }}>
            {theme === 'dark' ? <Sun size={14} color="#fbbf24" fill="#fbbf24" /> : <Moon size={14} color="#475569" />}
          </button>

          <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-main, #0f172a)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border-main, #222f47)' }}>
            <button onClick={() => setLang('hu')} style={{ background: lang === 'hu' ? 'rgba(255,255,255,0.06)' : 'transparent', color: lang === 'hu' ? 'var(--text-title, #f8fafc)' : '#64748b', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>HU</button>
            <button onClick={() => setLang('en')} style={{ background: lang === 'en' ? 'rgba(255,255,255,0.06)' : 'transparent', color: lang === 'en' ? 'var(--text-title, #f8fafc)' : '#64748b', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>EN</button>
          </div>
          
          <div className="nav-item-container">
            <button className={`nav-btn ${dropdownOpen === 'user_account' || ['profile', 'my_album', 'packages', 'tickets'].includes(activeTab) ? 'active' : ''}`} style={{ color: '#14b8a6', fontWeight: 'bold' }} onClick={() => setDropdownOpen(dropdownOpen === 'user_account' ? null : 'user_account')}>
              <User size={14} /> <span>{user?.name || user?.user_name || 'Fotós'}</span>
              <ChevronDown size={12} style={{ opacity: 0.6 }} />
            </button>

            {dropdownOpen === 'user_account' && (
              <div className="dropdown-menu" style={{ right: 0, left: 'auto', minWidth: '210px' }}>
                <button className="drop-item" style={{ color: '#14b8a6' }} onClick={() => handleNavClick('profile')}><User size={12} /> {t('subProfile')}</button>
                <button className="drop-item" style={{ color: '#f59e0b' }} onClick={() => handleNavClick('my_album')}><ImageIcon size={12} /> {t('subPortfolio')}</button>
                <button className="drop-item" style={{ color: '#8b5cf6' }} onClick={() => handleNavClick('packages')}><Award size={12} /> {t('subPackages')}</button>
                <button className="drop-item" style={{ color: '#f43f5e' }} onClick={() => handleNavClick('tickets')}><LifeBuoy size={12} /> {t('subSupport')}</button>
                <div style={{ height: '1px', backgroundColor: 'var(--border-main, #222f47)', margin: '4px 0' }}></div>
                <button className="drop-item" style={{ color: '#ef4444' }} onClick={() => { googleLogout(); onLogout(); }}><LogOut size={12} /> {t('subLogout')}</button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
