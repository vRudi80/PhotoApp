import { useState, useEffect, useRef } from 'react';
import { googleLogout } from '@react-oauth/google';
import { ADMIN_EMAIL, BACKEND_URL } from '../utils/constants';

// Behozzuk a kétnyelvű logókat a headerhez is
import logoHu from './logo_hu2.png'; 
import logoEn from './logo_en2.png';

// Behozzuk a nyelvi hookot
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  user: any;
  isLeader: boolean;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  dropdownOpen: string | null; 
  setDropdownOpen: (open: string | null) => void;
  onLogout: () => void;
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
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadTicketsCount, setUnreadTicketsCount] = useState(0);
  const isAdminUser = user?.email === ADMIN_EMAIL;
  
  const headerRef = useRef<HTMLDivElement>(null);

  // Aktiváljuk a nyelvi kontextust
  const { lang, setLang, t } = useLanguage();

  // Meghatározzuk, hogy épp melyik logót kell mutatni
  const currentLogo = lang === 'en' ? logoEn : logoHu;

  // 10 percenként ellenőrzi az új üzeneteket
  useEffect(() => {
    if (!user?.email) return;
    const checkUnread = () => {
      fetch(`${BACKEND_URL}/api/tickets/unread-count?userEmail=${user.email}&isAdmin=${isAdminUser}`)
        .then(res => res.json())
        .then(data => setUnreadTicketsCount(data.count || 0))
        .catch(console.error);
    };
    
    checkUnread();
    const interval = setInterval(checkUnread, 600000);
    return () => clearInterval(interval);
  }, [user, activeTab, isAdminUser]);

  // Külső kattintásra bezáródó dropdown menük
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setDropdownOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setDropdownOpen]);
  
  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setDropdownOpen(null);
    setIsMobileMenuOpen(false); 
  };

  const handleManageSubscription = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/create-portal-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Hiba az ügyfélkapu megnyitásakor.');
      }
    } catch (e) {
      alert('Hálózati hiba!');
    }
  };

  // KÖZÖS LOGÓ BLOKK
  const LogoBrandBlock = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
      <div style={{ 
        background: 'rgba(30, 41, 59, 0.7)', 
        padding: '5px 6px', 
        borderRadius: '10px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
      }}>
        <img 
          src={currentLogo} 
          alt="PhotAwesome" 
          style={{ height: '22px', width: 'auto', objectFit: 'contain' }} 
        />
      </div>
      <div style={{ fontWeight: '900', color: '#f8fafc', fontSize: '1.2rem', letterSpacing: '-0.5px' }}>
        Phot<span style={{ background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Awesome</span>
      </div>
    </div>
  );

  return (
    <header ref={headerRef} className="app-header" style={{ position: 'relative', zIndex: 1000, width: '100%', background: '#1e293b', borderBottom: '1px solid #334155', boxSizing: 'border-box' }}>
      
      <style>{`
        /* ── 🎯 FELSŐ KATEGÓRIÁS ASZTALI SZABÁLYZAT ── */
        @media (min-width: 992px) {
          .app-header {
            padding: 0 24px !important;
            height: 64px;
            display: flex !important;
            align-items: center;
          }
          .mobile-header-top {
            display: none !important; /* Asztali gépen elrejtjük a mobil fejlécet */
          }
          .header-nav-container {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            gap: 15px;
          }
          .nav-group {
            display: flex !important;
            align-items: center;
            gap: 6px;
            flex: 1;
            justify-content: center;
          }
          .header-desktop-brand-wrapper {
            display: flex !important;
            align-items: center;
          }
          .dropdown-menu {
            position: absolute;
            top: 100%;
            left: 0;
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 6px;
            min-width: 180px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          }
        }

        /* ── 🎯 KEDVEZŐTLEN KÖZTES ZÓNA VÉDELME (992px - 1200px) ── */
        @media (min-width: 992px) and (max-width: 1200px) {
          .app-header {
            padding: 0 12px !important;
          }
          .nav-group {
            gap: 2px !important; /* Összehúzzuk a gombokat, hogy ne törjenek meg */
          }
          .nav-btn {
            padding: 6px 8px !important;
            font-size: 0.85rem !important;
          }
          .user-group {
            gap: 8px !important;
          }
        }
        
        /* ── 🎯 GOLYÓÁLLÓ MOBIL NÉZET SZABÁLYZAT (max-width: 991px) ── */
        @media (max-width: 991px) {
          .mobile-header-top {
            display: flex !important;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            padding: 12px 20px;
            box-sizing: border-box;
            height: 60px;
            background: #1e293b;
          }
          .hamburger-btn {
            background: #334155;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 1.2rem;
            cursor: pointer;
            font-weight: bold;
          }
          .header-nav-container {
            display: none;
            flex-direction: column;
            width: 100%;
            background: #1e293b;
            border-top: 1px solid #334155;
            padding: 15px 20px;
            box-sizing: border-box;
            gap: 15px;
          }
          .header-nav-container.mobile-open {
            display: flex !important; /* Lenyílik, ha a hamburger gombra kattintanak */
          }
          .nav-group {
            display: flex;
            flex-direction: column;
            width: 100%;
            gap: 8px;
          }
          .nav-item-container {
            width: 100%;
            position: relative;
          }
          .nav-btn {
            width: 100% !important;
            text-align: left !important;
            justify-content: space-between;
            padding: 12px 16px !important;
            background: #0f172a !important;
            border-radius: 10px !important;
          }
          .user-group {
            display: flex;
            flex-direction: column;
            width: 100%;
            gap: 12px;
            padding-top: 15px;
            border-top: 1px solid #334155;
          }
          .dropdown-menu {
            position: static !important;
            width: 100% !important;
            background: #0f172a !important;
            box-shadow: none !important;
            margin-top: 4px;
            border-radius: 10px !important;
            padding: 4px !important;
            box-sizing: border-box;
          }
        }
        
        /* Globális gomb finomítások */
        .nav-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 8px 14px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.92rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          transition: all 0.2s ease-in-out;
        }
        .nav-btn.active, .nav-btn:hover {
          background: rgba(255, 255, 255, 0.04);
          color: #f8fafc;
        }
        .dropdown-menu {
          display: flex;
          flex-direction: column;
          gap: 2px;
          z-index: 99999;
        }
        .drop-item {
          width: 100%;
          text-align: left;
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .drop-item:hover, .drop-item.active {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }
      `}</style>
      
      {/* A: MOBIL MEGJELENÉSŰ FELSŐ FIX SÁV */}
      <div className="mobile-header-top">
        <LogoBrandBlock />
        <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? '✕' : '≡'}
        </button>
      </div>

      {/* B: ASZTALI / LENYÍLÓ NAVIGÁCIÓS PANEL */}
      <div className={`header-nav-container ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        
        <div className="header-desktop-brand-wrapper">
          <LogoBrandBlock />
        </div>

        <div className="nav-group">
          {/* 1. KEZDŐLAP */}
          <div className="nav-item-container">
            <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleNavClick('dashboard')}>
              <span>{t('navHome')}</span>
            </button>
          </div>

          {/* 2. FOTÓS ARÉNA */}
          <div className="nav-item-container">
            <button className={`nav-btn ${activeTab === 'weekly_challenge' ? 'active' : ''}`} style={{ color: activeTab === 'weekly_challenge' ? '#f97316' : '#94a3b8' }} onClick={() => handleNavClick('weekly_challenge')}>
              <span>{t('navArena')}</span>
            </button>
          </div>

          {/* 3. PÁLYÁZATOK DROPDOWN */}
          <div className="nav-item-container">
            <button 
              className={`nav-btn ${dropdownOpen === 'contests' || activeTab.startsWith('contests_') || ['salons', 'fiap_progress', 'mafosz_progress'].includes(activeTab) ? 'active' : ''}`} 
              style={{ color: (activeTab.startsWith('contests_') || ['salons', 'fiap_progress', 'mafosz_progress'].includes(activeTab)) ? '#60a5fa' : '#94a3b8' }}
              onClick={() => setDropdownOpen(dropdownOpen === 'contests' ? null : 'contests')}
            >
              <span>{t('navContests')}</span> <span>▼</span>
            </button>
            {dropdownOpen === 'contests' && (
              <div className="dropdown-menu">
                <button className={`drop-item ${activeTab === 'contests_club_active' ? 'active' : ''}`} onClick={() => handleNavClick('contests_club_active')}>{t('subClubContests')}</button>
                <button className={`drop-item ${activeTab === 'contests_open_active' ? 'active' : ''}`} onClick={() => handleNavClick('contests_open_active')}>{t('subOpenContests')}</button>
                <button className={`drop-item ${activeTab === 'contests_closed' ? 'active' : ''}`} onClick={() => handleNavClick('contests_closed')}>{t('subClosedContests')}</button>
                <div style={{ height: '1px', backgroundColor: '#334155', margin: '5px 0' }}></div>
                <button className={`drop-item ${activeTab === 'salons' ? 'active' : ''}`} style={{ color: '#38bdf8' }} onClick={() => handleNavClick('salons')}>🌐 {t('subSalonsList')}</button>
                <button className={`drop-item ${activeTab === 'fiap_progress' ? 'active' : ''}`} onClick={() => handleNavClick('fiap_progress')}>🏅 {t('subFiap')}</button>
                <button className={`drop-item ${activeTab === 'mafosz_progress' ? 'active' : ''}`} onClick={() => handleNavClick('mafosz_progress')}>
                  <img src="https://flagcdn.com/16x12/hu.png" width="16" height="12" alt="HU" style={{ marginRight: '8px', borderRadius: '2px', verticalAlign: 'middle', display: 'inline-block' }} />
                  {t('subMafosz')}
                </button>
              </div>
            )}
          </div>
          
          {/* 4. KLUBÉLET DROPDOWN */}
          <div className="nav-item-container">
            <button className={`nav-btn ${dropdownOpen === 'club' || activeTab.startsWith('club_') || activeTab === 'public_news' ? 'active' : ''}`} onClick={() => setDropdownOpen(dropdownOpen === 'club' ? null : 'club')}>
              <span>{t('navClub')}</span> <span>▼</span>
            </button>
            {dropdownOpen === 'club' && (
              <div className="dropdown-menu">
                <button className={`drop-item ${activeTab === 'club_news' ? 'active' : ''}`} onClick={() => handleNavClick('club_news')}>{t('subClubNews')}</button>
                <button className={`drop-item ${activeTab === 'club_nights' ? 'active' : ''}`} onClick={() => handleNavClick('club_nights')}>{t('subClubNights')}</button>
                <button className={`drop-item ${activeTab === 'club_homeworks' ? 'active' : ''}`} onClick={() => handleNavClick('club_homeworks')}>{t('subClubHomeworks')}</button>
              </div>
            )}
          </div>

          {/* 5. FELFEDEZÉS DROPDOWN */}
          <div className="nav-item-container">
            <button 
              className={`nav-btn ${dropdownOpen === 'explore' || ['podcast', 'map_spots'].includes(activeTab) || activeTab.startsWith('marketplace') ? 'active' : ''}`}
              style={{ color: ['podcast', 'map_spots'].includes(activeTab) || activeTab.startsWith('marketplace') ? '#ec4899' : '#94a3b8' }}
              onClick={() => setDropdownOpen(dropdownOpen === 'explore' ? null : 'explore')}
            >
              <span>{t('navExplore')}</span>  <span>▼</span>
            </button>
            {dropdownOpen === 'explore' && (
              <div className="dropdown-menu">
                <button className={`drop-item ${activeTab === 'podcast' ? 'active' : ''}`} style={{ color: '#f43f5e' }} onClick={() => handleNavClick('podcast')}>🎙️ Podcast</button>
                <button className={`drop-item ${activeTab.startsWith('marketplace') ? 'active' : ''}`} style={{ color: '#e0f2fe' }} onClick={() => handleNavClick('marketplace')}>🛒 {t('navMarketplace') || 'Piactér'}</button>
                <button className={`drop-item ${activeTab === 'map_spots' ? 'active' : ''}`} style={{ color: '#10b981' }} onClick={() => handleNavClick('map_spots')}>🗺️ {t('navMap')}</button>
              </div>
            )}
          </div>

          {/* 5.1. HÍREK CSATORNA */}
          <div className="nav-item-container">
            <button className={`nav-btn ${activeTab === 'public_news' ? 'active' : ''}`} style={{ color: '#38bdf8', fontWeight: 'bold' }} onClick={() => handleNavClick('public_news')}>📰 {lang === 'en' ? 'News' : 'Hírek'}</button>
          </div>
          
          {/* 6. ADMIN PANEL */}
          {(user?.email === ADMIN_EMAIL || isLeader) && (
            <div className="nav-item-container">
              <button className={`nav-btn ${dropdownOpen === 'admin' || activeTab.startsWith('admin_') || activeTab === 'leader_club' ? 'active' : ''}`} style={{ color: '#ef4444' }} onClick={() => setDropdownOpen(dropdownOpen === 'admin' ? null : 'admin')}>
                <span>{t('navAdmin')}</span> <span>▼</span>
              </button>
              {dropdownOpen === 'admin' && (
                <div className="dropdown-menu">
                  {isLeader && (
                    <button className={`drop-item ${activeTab === 'leader_club' ? 'active' : ''}`} style={{ color: '#0ea5e9', fontWeight: 'bold' }} onClick={() => handleNavClick('leader_club')}>{t('subLeaderClub')}</button>
                  )}
                  {user?.email === ADMIN_EMAIL && <button className={`drop-item ${activeTab === 'admin_contests' ? 'active' : ''}`} style={{ color: activeTab === 'admin_contests' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_contests')}>{t('subManageContests')}</button>}
                  <button className={`drop-item ${activeTab === 'admin_meetings' ? 'active' : ''}`} style={{ color: activeTab === 'admin_meetings' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_meetings')}>{t('subManageMeetings')}</button>
                  <button className={`drop-item ${activeTab === 'admin_homeworks' ? 'active' : ''}`} style={{ color: activeTab === 'admin_homeworks' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_homeworks')}>{t('subManageHomeworks')}</button>
                  {user?.email === ADMIN_EMAIL && <button className={`drop-item ${activeTab === 'admin_weekly' ? 'active' : ''}`} style={{ color: activeTab === 'admin_weekly' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_weekly')}>{t('subManageWeekly')}</button>}
                  {user?.email === ADMIN_EMAIL && <button className={`drop-item ${activeTab === 'admin_settings' ? 'active' : ''}`} style={{ color: '#ef4444' }} onClick={() => handleNavClick('admin_settings')}>{t('subManageSettings')}</button>}
                  {user?.email === ADMIN_EMAIL && <button className={`drop-item ${activeTab === 'admin_salons' ? 'active' : ''}`} style={{ color: activeTab === 'admin_salons' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_salons')}>{t('subManageSalons')}</button>}
                  {user?.email === ADMIN_EMAIL && <button className={`drop-item ${activeTab === 'admin_users' ? 'active' : ''}`} style={{ color: activeTab === 'admin_users' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_users')}>{t('subManageUsers')}</button>}
                  {user?.email === ADMIN_EMAIL && <button className={`drop-item ${activeTab === 'admin_clubs' ? 'active' : ''}`} style={{ color: activeTab === 'admin_clubs' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_clubs')}>{t('subManageClubs')}</button>}
                </div>
              )}
            </div>
          )}
        </div> 

        {/* FIÓK MENÜ ÉS NYELVVÁLASZTÓ */}
        <div className="user-group" style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0 }}>
          
          {/* Lenyitható Nyelvválasztó */}
          <div style={{ display: 'flex', gap: '4px', background: '#1e293b', padding: '3px', borderRadius: '10px', border: '1px solid #334155' }}>
            <button onClick={() => setLang('hu')} style={{ background: lang === 'hu' ? 'linear-gradient(135deg, #f97316, #ef4444)' : 'transparent', color: lang === 'hu' ? 'white' : '#94a3b8', border: 'none', padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <img src="https://flagcdn.com/16x12/hu.png" width="16" height="12" alt="HU" style={{ borderRadius: '2px', display: 'block', objectFit: 'cover' }} />
              <span style={{ fontSize: '0.75rem' }}>HU</span>
            </button>
            <button onClick={() => setLang('en')} style={{ background: lang === 'en' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'transparent', color: lang === 'en' ? 'white' : '#94a3b8', border: 'none', padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <img src="https://flagcdn.com/16x12/gb.png" width="16" height="12" alt="EN" style={{ borderRadius: '2px', display: 'block', objectFit: 'cover' }} />
              <span style={{ fontSize: '0.75rem' }}>EN</span>
            </button>
          </div>
          
          <div className="nav-item-container">
            <button 
              className={`nav-btn ${dropdownOpen === 'user_account' || ['profile', 'my_album', 'packages', 'tickets'].includes(activeTab) ? 'active' : ''}`} 
              style={{ color: '#14b8a6', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={() => setDropdownOpen(dropdownOpen === 'user_account' ? null : 'user_account')}
            >
              <span>👤 {user?.name || user?.user_name || 'Fotós'}</span>
              {!!(user?.isPremium || user?.is_premium) && <span title="Prémium Tag" style={{ fontSize: '1.1rem' }}>⭐</span>}
              {isLeader && (
                <span style={{ fontSize: '0.65rem', background: '#f59e0b20', color: '#f59e0b', padding: '2px 6px', borderRadius: '4px', border: '1px solid #f59e0b50', fontWeight: 'bold' }}>
                  Vezetőség
                </span>
              )}
              <span>▼</span>
            </button>

            {dropdownOpen === 'user_account' && (
              <div className="dropdown-menu" style={{ right: 0, left: 'auto', minWidth: '220px' }}>
                <button className="drop-item" style={{ color: '#14b8a6', backgroundColor: activeTab === 'profile' ? 'rgba(255,255,255,0.05)' : 'transparent' }} onClick={() => handleNavClick('profile')}>{t('subProfile')}</button>
                <button className="drop-item" style={{ color: '#f59e0b', backgroundColor: activeTab === 'my_album' ? 'rgba(255,255,255,0.05)' : 'transparent' }} onClick={() => handleNavClick('my_album')}>{t('subPortfolio')}</button>
                <button className="drop-item" style={{ color: '#8b5cf6', backgroundColor: activeTab === 'packages' ? 'rgba(255,255,255,0.05)' : 'transparent' }} onClick={() => handleNavClick('packages')}>{t('subPackages')}</button>
                
                <button className="drop-item" style={{ color: '#f43f5e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: activeTab === 'tickets' ? 'rgba(255,255,255,0.05)' : 'transparent' }} onClick={() => handleNavClick('tickets')}>
                  <span>{t('subSupport')}</span>
                  {unreadTicketsCount > 0 && (
                    <span style={{ background: '#ef4444', color: 'white', fontSize: '0.7rem', padding: '2px 7px', borderRadius: '100px', fontWeight: 'bold', boxShadow: '0 0 8px #ef4444' }}>
                      {unreadTicketsCount}
                    </span>
                  )}
                </button>

                {!!(user?.isPremium || user?.is_premium) && (
                  <button onClick={handleManageSubscription} style={{ color: '#10b981', fontWeight: 'bold' }} className="drop-item">
                    💳 Stripe Ügyfélkapu
                  </button>
                )}

                <div style={{ height: '1px', backgroundColor: '#334155', margin: '6px 0' }}></div>

                <button className="drop-item" style={{ color: '#ef4444' }} onClick={() => { googleLogout(); onLogout(); }}>
                  {t('subLogout')}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
