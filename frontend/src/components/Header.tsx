import { useState, useEffect } from 'react';
import { googleLogout } from '@react-oauth/google';
import { ADMIN_EMAIL, BACKEND_URL } from '../utils/constants';

// 🎯 ÚJ IMPORT: Behozzuk a nyelvi hookot
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

  // 🎯 ÚJ: Aktiváljuk a nyelvi kontextust a fejlécben
  const { lang, setLang } = useLanguage();

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
  }, [user, activeTab]);
  
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

  return (
    <header className="app-header">
      
      <div className="mobile-header-top">
        <div style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '1.2rem' }}>Fotóklub Portál</div>
        <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? '✕' : '≡'}
        </button>
      </div>

      <div className={`header-nav-container ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="nav-group">
          
          {/* ====================================================================
               FŐ NAVIGÁCIÓ (BAL OLDAL)
             ==================================================================== */}
          
          {/* 1. FŐOLDAL GOMB */}
          <div className="nav-item-container" style={{ zIndex: 50 }}>
            <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleNavClick('dashboard')}>
              <span>🏠 Főoldal</span>
            </button>
          </div>

          {/* 1b. PÁRBAJ (ARÉNA) GOMB KÖZVETLENÜL A FŐOLDAL MELLETT */}
          <div className="nav-item-container" style={{ zIndex: 50 }}>
            <button 
              className={`nav-btn ${activeTab === 'weekly_challenge' ? 'active' : ''}`} 
              style={{ color: '#f97316' }} 
              onClick={() => handleNavClick('weekly_challenge')}
            >
              <span>🏆 Mesterek ligája</span>
            </button>
          </div>

          {/* 2. PÁLYÁZATOK DROPDOWN */}
          <div className="nav-item-container" style={{ zIndex: dropdownOpen === 'contests' ? 60 : 50 }}>
            <button className={`nav-btn ${dropdownOpen === 'contests' || activeTab.startsWith('contests_') ? 'active' : ''}`} onClick={() => setDropdownOpen(dropdownOpen === 'contests' ? null : 'contests')}>
              <span>📝 Pályázatok</span> <span>▾</span>
            </button>
            {dropdownOpen === 'contests' && (
              <div className="dropdown-menu">
                <button className={`drop-item ${activeTab === 'contests_club_active' ? 'active' : ''}`} onClick={() => handleNavClick('contests_club_active')}>Klubom aktív pályázatai</button>
                <button className={`drop-item ${activeTab === 'contests_open_active' ? 'active' : ''}`} onClick={() => handleNavClick('contests_open_active')}>Nyílt aktív pályázatok</button>
                <button className={`drop-item ${activeTab === 'contests_closed' ? 'active' : ''}`} onClick={() => handleNavClick('contests_closed')}>Lezárult pályázatok</button>
              </div>
            )}
          </div>
          
          {/* 3. FOTÓKLUB DROPDOWN */}
          <div className="nav-item-container" style={{ zIndex: dropdownOpen === 'club' ? 60 : 50 }}>
            <button className={`nav-btn ${dropdownOpen === 'club' || activeTab.startsWith('club_') ? 'active' : ''}`} onClick={() => setDropdownOpen(dropdownOpen === 'club' ? null : 'club')}>
              <span>👥 Fotóklub</span> <span>▾</span>
            </button>
            {dropdownOpen === 'club' && (
              <div className="dropdown-menu">
                <button className={`drop-item ${activeTab === 'club_news' ? 'active' : ''}`} onClick={() => handleNavClick('club_news')}>Klub Hírek</button>
                <button className={`drop-item ${activeTab === 'club_nights' ? 'active' : ''}`} onClick={() => handleNavClick('club_nights')}>Klubestek</button>
                <button className={`drop-item ${activeTab === 'club_homeworks' ? 'active' : ''}`} onClick={() => handleNavClick('club_homeworks')}>Házi feladatok</button>
              </div>
            )}
          </div>

          {/* 4. INTEGRÁLT NEMZETKÖZI SZALONOK MENÜPONT */}
          <div className="nav-item-container" style={{ zIndex: dropdownOpen === 'international' ? 60 : 50 }}>
            <button 
              className={`nav-btn ${dropdownOpen === 'international' || ['salons', 'fiap_progress', 'mafosz_progress'].includes(activeTab) ? 'active' : ''}`} 
              style={{ color: '#60a5fa' }} 
              onClick={() => setDropdownOpen(dropdownOpen === 'international' ? null : 'international')}
            >
              <span>🌐 Nemzetközi szalonok</span> <span>▾</span>
            </button>
            {dropdownOpen === 'international' && (
              <div className="dropdown-menu">
                <button className={`drop-item ${activeTab === 'salons' ? 'active' : ''}`} onClick={() => handleNavClick('salons')}>🌐 Szalonok listája</button>
                <button className={`drop-item ${activeTab === 'fiap_progress' ? 'active' : ''}`} onClick={() => handleNavClick('fiap_progress')}>🏅 FIAP Követő</button>
                <button className={`drop-item ${activeTab === 'mafosz_progress' ? 'active' : ''}`} onClick={() => handleNavClick('mafosz_progress')}>
                  <img 
                    src="https://flagcdn.com/16x12/hu.png" 
                    width="16" 
                    height="12" 
                    alt="HU" 
                    style={{ marginRight: '8px', borderRadius: '2px', verticalAlign: 'middle', display: 'inline-block' }} 
                  />
                  MAFOSZ Követő
                </button>
              </div>
            )}
          </div>

          {/* 5. HELYSZÍNEK TÉRKÉP */}
          <div className="nav-item-container" style={{ zIndex: 50 }}>
              <button className={`nav-btn ${activeTab === 'map_spots' ? 'active' : ''}`} style={{ color: '#10b981' }} onClick={() => handleNavClick('map_spots')}>
                <span>🌍 Helyszínek</span>
              </button>
          </div>

          {/* 6. ADMIN DROPDOWN */}
          {(user?.email === ADMIN_EMAIL || isLeader) && (
            <div className="nav-item-container" style={{ zIndex: dropdownOpen === 'admin' ? 60 : 50 }}>
              <button className={`nav-btn ${dropdownOpen === 'admin' || activeTab.startsWith('admin_') || activeTab === 'leader_club' ? 'active' : ''}`} style={{ color: '#ef4444' }} onClick={() => setDropdownOpen(dropdownOpen === 'admin' ? null : 'admin')}>
                <span>⚙️ Admin</span> <span>▾</span>
              </button>
              {dropdownOpen === 'admin' && (
                <div className="dropdown-menu">
                  {isLeader && (
                    <button className={`drop-item ${activeTab === 'leader_club' ? 'active' : ''}`} style={{ color: '#0ea5e9', fontWeight: 'bold' }} onClick={() => handleNavClick('leader_club')}>🛡️ Klubom adatai</button>
                  )}
                  {user?.email === ADMIN_EMAIL && <button className={`drop-item ${activeTab === 'admin_contests' ? 'active' : ''}`} style={{ color: activeTab === 'admin_contests' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_contests')}>Pályázatok kezelése</button>}
                  <button className={`drop-item ${activeTab === 'admin_meetings' ? 'active' : ''}`} style={{ color: activeTab === 'admin_meetings' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_meetings')}>Klubestek kezelése</button>
                  
                  <button className={`drop-item ${activeTab === 'admin_homeworks' ? 'active' : ''}`} style={{ color: activeTab === 'admin_homeworks' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_homeworks')}>Házi feladatok kezelése</button>
                  {user?.email === ADMIN_EMAIL && <button className={`drop-item ${activeTab === 'admin_weekly' ? 'active' : ''}`} style={{ color: activeTab === 'admin_weekly' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_weekly')}>Kihívások kezelése</button>}
                  
                  {user?.email === ADMIN_EMAIL && (
                    <button className={`drop-item ${activeTab === 'admin_settings' ? 'active' : ''}`} style={{ color: activeTab === 'admin_settings' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_settings')}>Kategóriák és Díjak</button>
                  )}
                  {user?.email === ADMIN_EMAIL && <button className={`drop-item ${activeTab === 'admin_salons' ? 'active' : ''}`} style={{ color: activeTab === 'admin_salons' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_salons')}>Szalonok kezelése</button>}
                  {user?.email === ADMIN_EMAIL && <button className={`drop-item ${activeTab === 'admin_users' ? 'active' : ''}`} style={{ color: activeTab === 'admin_users' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_users')}>Felhasználók</button>}
                  {user?.email === ADMIN_EMAIL && <button className={`drop-item ${activeTab === 'admin_clubs' ? 'active' : ''}`} style={{ color: activeTab === 'admin_clubs' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_clubs')}>Fotóklubok</button>}
                </div>
              )}
            </div>
          )}
        </div> 

       {/* ====================================================================
             FIÓK MENÜ (JOBB OLDAL)
           ==================================================================== */}
        <div className="user-group" style={{ display: 'flex', alignItems: 'center', gap: '15px', position: 'relative' }}>
          
          {/* 🎯 JAVÍTVA: Szelektor helyett ultra-modern, zászló-biztos kapcsoló gombok */}
          <div style={{ display: 'flex', gap: '4px', background: '#1e293b', padding: '3px', borderRadius: '10px', border: '1px solid #334155' }}>
            <button 
              onClick={() => setLang('hu')} 
              style={{ 
                background: lang === 'hu' ? 'linear-gradient(135deg, #f97316, #ef4444)' : 'transparent', 
                color: lang === 'hu' ? 'white' : '#94a3b8', 
                border: 'none', padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px' 
              }}
            >
              🇭🇺 <span style={{ fontSize: '0.75rem' }}>HU</span>
            </button>
            <button 
              onClick={() => setLang('en')} 
              style={{ 
                background: lang === 'en' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'transparent', 
                color: lang === 'en' ? 'white' : '#94a3b8', 
                border: 'none', padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px' 
              }}
            >
              🇬🇧 <span style={{ fontSize: '0.75rem' }}>EN</span>
            </button>
          </div>
          
          <div className="nav-item-container" style={{ zIndex: dropdownOpen === 'user_account' ? 70 : 50 }}>
            <button 
              className={`nav-btn ${dropdownOpen === 'user_account' || ['profile', 'my_album', 'packages', 'tickets'].includes(activeTab) ? 'active' : ''}`} 
              style={{ color: '#14b8a6', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={() => setDropdownOpen(dropdownOpen === 'user_account' ? null : 'user_account')}
            >
              <span>👤 {user.name}</span>
              {(user?.isPremium || user?.is_premium) && <span title="Prémium Tag" style={{ fontSize: '1.1rem' }}>⭐</span>}
              {isLeader && (
                <span style={{ fontSize: '0.65rem', background: '#f59e0b20', color: '#f59e0b', padding: '2px 6px', borderRadius: '4px', border: '1px solid #f59e0b50', fontWeight: 'bold' }}>
                  Vezetőség
                </span>
              )}
              <span>▾</span>
            </button>

            {dropdownOpen === 'user_account' && (
              <div className="dropdown-menu" style={{ right: 0, left: 'auto', minWidth: '220px' }}>
                <button className={`drop-item ${activeTab === 'profile' ? 'active' : ''}`} style={{ color: '#14b8a6' }} onClick={() => handleNavClick('profile')}>👤 Profilom</button>
                <button className={`drop-item ${activeTab === 'my_album' ? 'active' : ''}`} style={{ color: '#f59e0b' }} onClick={() => handleNavClick('my_album')}>🖼️ Saját Portfólió</button>
                <button className={`drop-item ${activeTab === 'packages' ? 'active' : ''}`} style={{ color: '#8b5cf6' }} onClick={() => handleNavClick('packages')}>💎 Tárhelycsomagom</button>
                
                <button className={`drop-item ${activeTab === 'tickets' ? 'active' : ''}`} style={{ color: '#f43f5e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => handleNavClick('tickets')}>
                  <span>✉️ Support & Segítség</span>
                  {unreadTicketsCount > 0 && (
                    <span style={{ background: '#ef4444', color: 'white', fontSize: '0.7rem', padding: '2px 7px', borderRadius: '100px', fontWeight: 'bold', boxShadow: '0 0 8px #ef4444' }}>
                      {unreadTicketsCount}
                    </span>
                  )}
                </button>

                {(user?.isPremium || user?.is_premium) && (
                  <button 
                    onClick={handleManageSubscription}
                    style={{ color: '#10b981', fontWeight: 'bold' }}
                    className="drop-item"
                  >
                    💳 Stripe Ügyfélkapu
                  </button>
                )}

                <div style={{ height: '1px', backgroundColor: '#334155', margin: '6px 0' }}></div>

                <button 
                  className="drop-item" 
                  style={{ color: '#ef4444' }} 
                  onClick={() => { googleLogout(); onLogout(); }}
                >
                  🚪 Kijelentkezés
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
