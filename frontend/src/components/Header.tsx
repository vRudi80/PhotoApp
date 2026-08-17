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
  Box,
  Gamepad2,
  Smartphone
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
      border-radius: 8px;
      padding: 6px;
      min-width: 200px;
      box-shadow: 0 12px 30px rgba(0,0,0,0.25);
    }
    .desktop-user-dropdown {
      display: block !important;
    }
  }
  
  @media (max-width: 1059px) {
    .header-desktop-brand-wrapper {
      display: none !important;
    }
    .desktop-user-dropdown {
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
      box-sizing: border-box;
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
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
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
      border-radius: 8px !important;
    }
    .user-group {
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: 12px;
    }
    .dropdown-menu {
      position: static !important;
      width: 100% !important;
      background: var(--bg-main, #0f172a) !important;
      box-shadow: none !important;
      margin-top: 4px;
      border-radius: 8px !important;
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
    border-radius: 6px;
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
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-title, #f8fafc);
  }
  .drop-item {
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    color: var(--text-body, #94a3b8);
    padding: 9px 12px;
    border-radius: 6px;
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
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-title, #f8fafc);
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

  // 🎯 AUTOMATIKUS GITHUB RELEASE LEKÉRDEZÉS
  const [apkInfo, setApkInfo] = useState<{ tag: string; url: string }>({
    tag: 'v1.1',
    url: 'https://github.com/vRudi80/PhotoApp/releases/download/v1.1/photawesome.apk'
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

  // 🎯 LATEST RELEASE LEKÉRDEZÉSE A GITHUB API-RÓL
  useEffect(() => {
    fetch('https://api.github.com/repos/vRudi80/PhotoApp/releases/latest')
      .then(res => res.json())
      .then(data => {
        if (data && data.tag_name) {
          const apkAsset = data.assets?.find((a: any) => a.name.endsWith('.apk'));
          setApkInfo({
            tag: data.tag_name,
            url: apkAsset ? apkAsset.browser_download_url : data.html_url
          });
        }
      })
      .catch(err => console.warn('GitHub release fetch error:', err));
  }, []);

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

  const avatarUrl = user?.avatar_url || user?.picture || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23475569'><circle cx='12' cy='8' r='4'/><path d='M12 14c-6.1 0-10 4-10 4v2h20v-2s-3.9-4-10-4z'/></svg>";

  return (
    <header ref={headerRef} className="app-header" style={{ position: 'relative', zIndex: 1000, width: '100%', background: 'var(--bg-card, #131b2e)', borderBottom: '1px solid var(--border-main, #222f47)', boxSizing: 'border-box' }}>
      
      <style>{HEADER_STYLES}</style>
      
      <div className="mobile-header-top">
        <LogoBrandBlock logo={currentLogo} />
        <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div className={`header-nav-container ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        
        {/* MOBIL FEJLÉC PROFIL KÁRTYA ÉS GYORSBEÁLLÍTÁSOK */}
        <div style={{ display: isMobileMenuOpen ? 'flex' : 'none', flexDirection: 'column', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-main, #222f47)' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-main, #0f172a)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-main, #222f47)' }}>
            <img src={avatarUrl} alt="" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #10b981' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 'bold', color: 'var(--text-title, #f8fafc)', fontSize: '0.95rem', wordBreak: 'break-word' }}>{user?.name || user?.user_name || 'Fotós'}</div>
              <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: '600' }}>{user?.club_name || (lang === 'en' ? 'Active Member' : 'Aktív tag')}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button onClick={toggleTheme} style={{ background: 'var(--bg-main, #0f172a)', border: '1px solid var(--border-main, #222f47)', color: 'var(--text-body, #94a3b8)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                {theme === 'dark' ? <><Sun size={14} color="#fbbf24" fill="#fbbf24" /> Világos</> : <><Moon size={14} color="#38bdf8" /> Sötét</>}
              </button>

              <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-main, #0f172a)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-main, #222f47)' }}>
                <button onClick={() => setLang('hu')} style={{ background: lang === 'hu' ? '#a855f7' : 'transparent', color: '#ffffff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>HU</button>
                <button onClick={() => setLang('en')} style={{ background: lang === 'en' ? '#a855f7' : 'transparent', color: '#ffffff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>EN</button>
              </div>
            </div>

            {/* 🎯 DINAMIKUS VERZIÓSZÁM MOBILON */}
            <a 
              href={apkInfo.url} 
              download="photawesome.apk" 
              style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.4)', padding: '6px 12px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Smartphone size={14} /> Android App ({apkInfo.tag})
            </a>
          </div>

        </div>

        <div className="header-desktop-brand-wrapper">
          <LogoBrandBlock logo={currentLogo} />
        </div>

        <div className="nav-group">
          {/* FŐOLDAL */}
          <div className="nav-item-container">
            <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleNavClick('dashboard')}>
              <Home size={14} /> <span>{t('navHome')}</span>
            </button>
          </div>

          {/* ARÉNA / JÁTÉK */}
          <div className="nav-item-container">
            <button className={`nav-btn ${activeTab === 'weekly_challenge' ? 'active' : ''}`} style={{ color: activeTab === 'weekly_challenge' ? '#f97316' : '' }} onClick={() => handleNavClick('weekly_challenge')}>
              <Gamepad2 size={14} /> <span>{t('navArena')}</span>
            </button>
          </div>

          {/* KVÍZ */}
          <div className="nav-item-container">
            <button className={`nav-btn ${activeTab === 'quiz' ? 'active' : ''}`} style={{ color: activeTab === 'quiz' ? '#f97316' : '' }} onClick={() => handleNavClick('quiz')}>
              <MessageCircleQuestion size={14} /> <span>{t('navQuiz')}</span>
            </button>
          </div>

          {/* TÁRLATOK */}
          <div className="nav-item-container">
            <button 
              className={`nav-btn ${activeTab === '3d_gallery' ? 'active' : ''}`} 
              style={{ color: activeTab === '3d_gallery' ? '#a78bfa' : '' }} 
              onClick={() => handleNavClick('3d_gallery')}
            >
              <Box size={14} /> <span>{lang === 'en' ? 'Exhibitions' : 'Tárlatok'}</span>
            </button>
          </div>

          {/* FOTÓTÖRTÉNETI ALBUM */}
          <div className="nav-item-container">
            <button 
              className={`nav-btn ${activeTab === 'photo_history' ? 'active' : ''}`} 
              style={{ color: activeTab === 'photo_history' ? '#38bdf8' : '' }} 
              onClick={() => handleNavClick('photo_history')}
            >
              <BookOpen size={14} /> <span>{lang === 'en' ? 'History Gallery' : 'Fotótörténeti album'}</span>
            </button>
          </div>

          {/* PÁLYÁZATOK */}
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
          
          {/* KLUB */}
          <div className="nav-item-container">
            <button className={`nav-btn ${dropdownOpen === 'club' || activeTab.startsWith('club_') || activeTab === 'public_news' ? 'active' : ''}`} onClick={() => setDropdownOpen(dropdownOpen === 'club' ? null : 'club')}>
              <Users size={14} /> <span>{t('navClub')}</span> <ChevronDown size={12} style={{ opacity: 0.6 }} />
            </button>
            {dropdownOpen === 'club' && (
              <div className="dropdown-menu">
                <button className="drop-item" style={{ color: '#a78bfa', fontWeight: 'bold' }} onClick={() => handleNavClick('club_weekly_review')}>
                  <Award size={12} /> {lang === 'en' ? 'Weekly Review' : 'Heti Képértékelő'}
                </button>
                <button className="drop-item" style={{ color: '#38bdf8' }} onClick={() => handleNavClick('club_courses')}>
                  <BookOpen size={12} /> {lang === 'en' ? 'Club Courses' : 'Klubtanfolyamok'}
                </button>
                <div style={{ height: '1px', backgroundColor: 'var(--border-main, #222f47)', margin: '4px 0' }}></div>
                <button className="drop-item" onClick={() => handleNavClick('club_news')}>{t('subClubNews')}</button>
                <button className="drop-item" onClick={() => handleNavClick('club_nights')}>{t('subClubNights')}</button>
                <button className="drop-item" onClick={() => handleNavClick('club_homeworks')}>{t('subClubHomeworks')}</button>
              </div>
            )}
          </div>

          {/* FELFEDEZÉS MENÜ */}
          <div className="nav-item-container">
            <button 
              className={`nav-btn ${dropdownOpen === 'explore' || ['podcast', 'map_spots'].includes(activeTab) || activeTab.startsWith('marketplace') ? 'active' : ''}`}
              style={{ color: ['podcast', 'map_spots'].includes(activeTab) || activeTab.startsWith('marketplace') ? '#ec4899' : '' }}
              onClick={() => setDropdownOpen(dropdownOpen === 'explore' ? null : 'explore')}
            >
              <Map size={14} /> <span>{t('navExplore') || (lang === 'en' ? 'Explore' : 'Felfedezés')}</span> <ChevronDown size={12} style={{ opacity: 0.6 }} />
            </button>
            {dropdownOpen === 'explore' && (
              <div className="dropdown-menu">
                <button className="drop-item" style={{ color: '#f43f5e' }} onClick={() => handleNavClick('podcast')}><Mic size={12} /> Podcast</button>
                <button className="drop-item" style={{ color: '#38bdf8' }} onClick={() => handleNavClick('marketplace')}><ShoppingBag size={12} /> {t('navMarketplace') || (lang === 'en' ? 'Marketplace' : 'Piactér')}</button>
                <button className="drop-item" style={{ color: '#10b981' }} onClick={() => handleNavClick('map_spots')}><Map size={12} /> {t('navMap') || (lang === 'en' ? 'Photo Spots' : 'Fotós helyszínek')}</button>
              </div>
            )}
          </div>

          {/* FÓRUM */}
          <div className="nav-item-container">
            <button className={`nav-btn ${activeTab === 'public_news' ? 'active' : ''}`} style={{ color: '#38bdf8' }} onClick={() => handleNavClick('public_news')}>
              <Newspaper size={14} /> <span>Fórum {unreadForumCount > 0 && `(${unreadForumCount})`}</span>
            </button>
          </div>
          
          {/* VEZETŐ SÁV */}
          {(user?.email === ADMIN_EMAIL || isLeader) && (
            <div className="nav-item-container">
              <button className={`nav-btn ${dropdownOpen === 'admin' || activeTab.startsWith('admin_') || activeTab === 'leader_club' ? 'active' : ''}`} style={{ color: '#ef4444' }} onClick={() => setDropdownOpen(dropdownOpen === 'admin' ? null : 'admin')}>
                <ShieldAlert size={14} /> <span>{lang === 'en' ? 'Leader' : 'Vezető'}</span> <ChevronDown size={12} style={{ opacity: 0.6 }} />
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

          {/* MOBIL SAJÁT MENÜI */}
          <div style={{ display: isMobileMenuOpen ? 'flex' : 'none', flexDirection: 'column', gap: '4px', paddingTop: '10px', borderTop: '1px dashed var(--border-main, #222f47)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', padding: '0 4px 4px 4px', textTransform: 'uppercase' }}>Fiókom & Beállítások</div>
            <button className="drop-item" style={{ color: '#10b981' }} onClick={() => handleNavClick('profile')}><User size={14} /> {t('subProfile')}</button>
            <button className="drop-item" style={{ color: '#f59e0b' }} onClick={() => handleNavClick('my_album')}><ImageIcon size={14} /> {t('subPortfolio')}</button>
            <button className="drop-item" style={{ color: '#8b5cf6' }} onClick={() => handleNavClick('packages')}><Award size={14} /> {t('subPackages')}</button>
            <button className="drop-item" style={{ color: '#f43f5e' }} onClick={() => handleNavClick('tickets')}><LifeBuoy size={14} /> {t('subSupport')} {unreadTicketsCount > 0 && `(${unreadTicketsCount})`}</button>
            <button className="drop-item" style={{ color: '#ef4444', marginTop: '6px' }} onClick={() => { googleLogout(); onLogout(); }}><LogOut size={14} /> {t('subLogout')}</button>
          </div>

        </div> 

        {/* ASZTALI JOBB OLDALI ELEMEK (TÉMA, NYELV, APK, PROFIL DROPDOWN) */}
        <div className="user-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          
          {/* 🎯 DINAMIKUS VERZIÓSZÁM ASZTALI NÉZETBEN */}
          <a 
            href={apkInfo.url} 
            download="photawesome.apk" 
            title={`PhotAwesome Android App (${apkInfo.tag})`}
            style={{ background: 'var(--bg-main, #0f172a)', border: '1px solid var(--border-main, #222f47)', color: '#10b981', padding: '6px 10px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Smartphone size={14} /> <span>APK ({apkInfo.tag})</span>
          </a>

          <button onClick={toggleTheme} style={{ background: 'transparent', border: '1px solid var(--border-main, #222f47)', color: 'var(--text-body, #94a3b8)', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', height: '32px' }}>
            {theme === 'dark' ? <Sun size={14} color="#fbbf24" fill="#fbbf24" /> : <Moon size={14} color="#475569" />}
          </button>

          <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-main, #0f172a)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-main, #222f47)' }}>
            <button onClick={() => setLang('hu')} style={{ background: lang === 'hu' ? 'rgba(255,255,255,0.08)' : 'transparent', color: lang === 'hu' ? 'var(--text-title, #f8fafc)' : '#64748b', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>HU</button>
            <button onClick={() => setLang('en')} style={{ background: lang === 'en' ? 'rgba(255,255,255,0.08)' : 'transparent', color: lang === 'en' ? 'var(--text-title, #f8fafc)' : '#64748b', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>EN</button>
          </div>
          
          {/* ASZTALI PROFIL MENÜDROPDOWN */}
          <div className="nav-item-container desktop-user-dropdown" style={{ position: 'relative' }}>
            <button className={`nav-btn ${dropdownOpen === 'user_account' || ['profile', 'my_album', 'packages', 'tickets'].includes(activeTab) ? 'active' : ''}`} style={{ color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setDropdownOpen(dropdownOpen === 'user_account' ? null : 'user_account')}>
              <img src={avatarUrl} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #10b981' }} />
              <span>{user?.name || user?.user_name || 'Fotós'}</span>
              <ChevronDown size={12} style={{ opacity: 0.6 }} />
            </button>

            {dropdownOpen === 'user_account' && (
              <div className="dropdown-menu" style={{ right: 0, left: 'auto', minWidth: '210px' }}>
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
  );
}
