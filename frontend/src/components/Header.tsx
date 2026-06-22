import { useState, useEffect } from 'react';
import { googleLogout } from '@react-oauth/google';
import { ADMIN_EMAIL, BACKEND_URL } from '../utils/constants';

// 🎯 Behozzuk a kétnyelvű logókat a headerhez is
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

  // Aktiváljuk a nyelvi kontextust és a t() fordító függvényt
  const { lang, setLang, t } = useLanguage();

  // 🎯 Meghatározzuk, hogy épp melyik logót kell mutatni
  const currentLogo = lang === 'en' ? logoEn : logoHu;

  // 10 percenként csendben leellenőrzi, van-e új üzenet
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

  // 🎯 REUSABLE LOGO BLOCK
  const LogoBrandBlock = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          style={{ height: '24px', width: 'auto', objectFit: 'contain' }} 
        />
      </div>
      <div style={{ fontWeight: '900', color: '#f8fafc', fontSize: '1.3rem', letterSpacing: '-0.5px' }}>
        Phot<span style={{ background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Awesome</span>
      </div>
    </div>
  );

  return (
    <header className="app-header">
      
      <style>{`
        .header-desktop-brand-wrapper {
          display: flex;
          align-items: center;
          margin-right: 20px;
        }
        @media (max-width: 991px) {
          .header-desktop-brand-wrapper {
            display: none !important;
          }
        }
      `}</style>
      
      {/* A: MOBIL FELÜLETŰ FELSŐ SÁV */}
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
          {/* FŐ NAVIGÁCIÓ */}
          <div className="nav-item-container" style={{ zIndex: 50 }}>
            <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleNavClick('dashboard')}>
              <span>{t('navHome')}</span>
            </button>
          </div>

          <div className="nav-item-container" style={{ zIndex: 50 }}>
            <button className={`nav-btn ${activeTab === 'weekly_challenge' ? 'active' : ''}`} style={{ color: '#f97316' }} onClick={() => handleNavClick('weekly_challenge')}>
              <span>{t('navArena')}</span>
            </button>
          </div>

          <div className="nav-item-container" style={{ zIndex: dropdownOpen === 'contests' ? 60 : 50 }}>
            <button className={`nav-btn ${dropdownOpen === 'contests' || activeTab.startsWith('contests_') ? 'active' : ''}`} onClick={() => setDropdownOpen(dropdownOpen === 'contests' ? null : 'contests')}>
              <span>{t('navContests')}</span> <span>▾</span>
            </button>
            {dropdownOpen === 'contests' && (
              <div className="dropdown-menu">
                <button className={`drop-item ${activeTab === 'contests_club_active' ? 'active' : ''}`} onClick={() => handleNavClick('contests_club_active')}>{t('subClubContests')}</button>
                <button className={`drop-item ${activeTab === 'contests_open_active' ? 'active' : ''}`} onClick={() => handleNavClick('contests_open_active')}>{t('subOpenContests')}</button>
                <button className={`drop-item ${activeTab === 'contests_closed' ? 'active' : ''}`} onClick={() => handleNavClick('contests_closed')}>{t('subClosedContests')}</button>
              </div>
            )}
          </div>
          
          <div className="nav-item-container" style={{ zIndex: dropdownOpen === 'club' ? 60 : 50 }}>
            <button className={`nav-btn ${dropdownOpen === 'club' || activeTab.startsWith('club_') ? 'active' : ''}`} onClick={() => setDropdownOpen(dropdownOpen === 'club' ? null : 'club')}>
              <span>{t('navClub')}</span> <span>▾</span>
            </button>
            {dropdownOpen === 'club' && (
              <div className="dropdown-menu">
                <button className={`drop-item ${activeTab === 'club_news' ? 'active' : ''}`} onClick={() => handleNavClick('club_news')}>{t('subClubNews')}</button>
                <button className={`drop-item ${activeTab === 'club_nights' ? 'active' : ''}`} onClick={() => handleNavClick('club_nights')}>{t('subClubNights')}</button>
                <button className={`drop-item ${activeTab === 'club_homeworks' ? 'active' : ''}`} onClick={() => handleNavClick('club_homeworks')}>{t('subClubHomeworks')}</button>
              </div>
            )}
          </div>

          <div className="nav-item-container" style={{ zIndex: dropdownOpen === 'international' ? 60 : 50 }}>
            <button className={`nav-btn ${dropdownOpen === 'international' || ['salons', 'fiap_progress', 'mafosz_progress'].includes(activeTab) ? 'active' : ''}`} style={{ color: '#60a5fa' }} onClick={() => setDropdownOpen(dropdownOpen === 'international' ? null : 'international')}>
              <span>{t('navInternational')}</span> <span>▾</span>
            </button>
            {dropdownOpen === 'international' && (
              <div className="dropdown-menu">
                <button className={`drop-item ${activeTab === 'salons' ? 'active' : ''}`} onClick={() => handleNavClick('salons')}>{t('subSalonsList')}</button>
                <button className={`drop-item ${activeTab === 'fiap_progress' ? 'active' : ''}`} onClick={() => handleNavClick('fiap_progress')}>{t('subFiap')}</button>
                <button className={`drop-item ${activeTab === 'mafosz_progress' ? 'active' : ''}`} onClick={() => handleNavClick('mafosz_progress')}>
                  <img src="https://flagcdn.com/16x12/hu.png" width="16" height="12" alt="HU" style={{ marginRight: '8px', borderRadius: '2px', verticalAlign: 'middle', display: 'inline-block' }} />
                  {t('subMafosz')}
                </button>
              </div>
            )}
          </div>

          <div className="nav-item-container" style={{ zIndex: 50 }}>
              <button className={`nav-btn ${activeTab === 'map_spots' ? 'active' : ''}`} style={{ color: '#10b981' }} onClick={() => handleNavClick('map_spots')}>
                <span>{t('navMap')}</span>
              </button>
          </div>

          {/* === PIACTÉR GOMB === */}
          <div className="nav-item-container" style={{ zIndex: 50 }}>
              <button 
                className={`nav-btn ${activeTab.startsWith('marketplace') ? 'active' : ''}`} 
                style={{ color: '#ec4899' }} 
                onClick={() => handleNavClick('marketplace')}
              >
                <span>🛒 {t('navMarketplace') || 'Piactér'}</span>
              </button>
          </div>
          {(user?.email === ADMIN_EMAIL || isLeader) && (
            <div className="nav-item-container" style={{ zIndex: dropdownOpen === 'admin' ? 60 : 50 }}>
              <button className={`nav-btn ${dropdownOpen === 'admin' || activeTab.startsWith('admin_') || activeTab === 'leader_club' ? 'active' : ''}`} style={{ color: '#ef4444' }} onClick={() => setDropdownOpen(dropdownOpen === 'admin' ? null : 'admin')}>
                <span>{t('navAdmin')}</span> <span>▾</span>
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

        {/* FIÓK MENÜ (JOBB OLDAL) */}
        <div className="user-group" style={{ display: 'flex', alignItems: 'center', gap: '15px', position: 'relative' }}>
          
          {/* Nyelvválasztó */}
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
          
          <div className="nav-item-container" style={{ zIndex: dropdownOpen === 'user_account' ? 70 : 50 }}>
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
              <span>▾</span>
            </button>

            {dropdownOpen === 'user_account' && (
              <div className="dropdown-menu" style={{ right: 0, left: 'auto', minWidth: '220px' }}>
                <button className={`drop-item ${activeTab === 'profile' ? 'active' : ''}`} style={{ color: '#14b8a6' }} onClick={() => handleNavClick('profile')}>{t('subProfile')}</button>
                <button className={`drop-item ${activeTab === 'my_album' ? 'active' : ''}`} style={{ color: '#f59e0b' }} onClick={() => handleNavClick('my_album')}>{t('subPortfolio')}</button>
                <button className={`drop-item ${activeTab === 'packages' ? 'active' : ''}`} style={{ color: '#8b5cf6' }} onClick={() => handleNavClick('packages')}>{t('subPackages')}</button>
                
                <button className={`drop-item ${activeTab === 'tickets' ? 'active' : ''}`} style={{ color: '#f43f5e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => handleNavClick('tickets')}>
                  <span>{t('subSupport')}</span>
                  {unreadTicketsCount > 0 && (
                    <span style={{ background: '#ef4444', color: 'white', fontSize: '0.7rem', padding: '2px 7px', borderRadius: '100px', fontWeight: 'bold', boxShadow: '0 0 8px #ef4444' }}>
                      {unreadTicketsCount}
                    </span>
                  )}
                </button>

                {/* 🎯 FIXÁLVA: Dupla felkiáltójellel kényszerítjük a tiszta logikai (boolean) kiértékelést */}
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
