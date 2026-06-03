import { useState } from 'react';
import { useState, useEffect } from 'react'; // <-- JAVÍTVA: Beírva a useEffect is!
import { googleLogout } from '@react-oauth/google';
import { ADMIN_EMAIL, BACKEND_URL } from '../utils/constants';

interface HeaderProps {
  user: any;
  isLeader: boolean;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  dropdownOpen: 'contests' | 'club' | 'admin' | 'progress' | null;
  setDropdownOpen: (open: 'contests' | 'club' | 'admin' | 'progress' | null) => void;
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
    const interval = setInterval(checkUnread, 600000); // 30 mp-es poll
    return () => clearInterval(interval);
  }, [user, activeTab]); // Tabváltáskor is frissít egyet azonnal
  
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
          
          {/* FŐOLDAL GOMB */}
          <div className="nav-item-container" style={{ zIndex: 50 }}>
            <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleNavClick('dashboard')}>
              <span>🏠 Főoldal</span>
            </button>
          </div>

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

          <div className="nav-item-container" style={{ zIndex: dropdownOpen === 'progress' ? 60 : 50 }}>
            <button 
              className={`nav-btn ${dropdownOpen === 'progress' || activeTab === 'fiap_progress' || activeTab === 'mafosz_progress' ? 'active' : ''}`} 
              onClick={() => setDropdownOpen(dropdownOpen === 'progress' ? null : 'progress')}
            >
              <span>🏆 Minősítések</span> <span>▾</span>
            </button>
            {dropdownOpen === 'progress' && (
              <div className="dropdown-menu">
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

          <div className="nav-item-container" style={{ zIndex: 50 }}>
              <button className={`nav-btn ${activeTab === 'salons' ? 'active' : ''}`} style={{ color: '#60a5fa' }} onClick={() => handleNavClick('salons')}>
                <span>🌐 Szalonok</span>
              </button>
          </div>

          <div className="nav-item-container" style={{ zIndex: 50 }}>
              <button className={`nav-btn ${activeTab === 'map_spots' ? 'active' : ''}`} style={{ color: '#10b981' }} onClick={() => handleNavClick('map_spots')}>
                <span>🌍 Helyszínek</span>
              </button>
          </div>

          <div className="nav-item-container" style={{ zIndex: 50 }}>
              <button className={`nav-btn ${activeTab === 'my_album' ? 'active' : ''}`} style={{ color: '#f59e0b' }} onClick={() => handleNavClick('my_album')}>
                <span>🖼️ Portfólió</span>
              </button>
          </div>

          <div className="nav-item-container" style={{ zIndex: 50 }}>
            <button className={`nav-btn ${activeTab === 'packages' ? 'active' : ''}`} style={{ color: '#8b5cf6' }} onClick={() => handleNavClick('packages')}>
              <span>💎 Tárhely</span>
            </button>
          </div>

          {/* PROFILOM GOMB */}
          <div className="nav-item-container" style={{ zIndex: 50 }}>
            <button className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`} style={{ color: '#14b8a6' }} onClick={() => handleNavClick('profile')}>
              <span>👤 Profilom</span>
            </button>
          </div>

          {/* SUPPORT GOMB PIROS ÉRTESÍTŐ KÖRREKKEL */}
          <div className="nav-item-container" style={{ zIndex: 50 }}>
            <button className={`nav-btn ${activeTab === 'tickets' ? 'active' : ''}`} style={{ color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleNavClick('tickets')}>
              <span>✉️ Support</span>
              {unreadTicketsCount > 0 && (
                <span style={{ background: '#ef4444', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '100px', display: 'inline-block', lineHeight: '1', boxShadow: '0 0 8px #ef4444' }}>
                  {unreadTicketsCount}
                </span>
              )}
            </button>
          </div>

          {/* ADMIN DROPDOWN */}
          {(user?.email === ADMIN_EMAIL || isLeader) && (
            <div className="nav-item-container" style={{ zIndex: dropdownOpen === 'admin' ? 60 : 50 }}>
              <button className={`nav-btn ${dropdownOpen === 'admin' || activeTab.startsWith('admin_') ? 'active' : ''}`} style={{ color: '#ef4444' }} onClick={() => setDropdownOpen(dropdownOpen === 'admin' ? null : 'admin')}>
                <span>⚙️ Admin</span> <span>▾</span>
              </button>
              {dropdownOpen === 'admin' && (
                <div className="dropdown-menu">
                  {user?.email === ADMIN_EMAIL && <button className={`drop-item ${activeTab === 'admin_contests' ? 'active' : ''}`} style={{ color: activeTab === 'admin_contests' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_contests')}>Pályázatok kezelése</button>}
                  <button className={`drop-item ${activeTab === 'admin_meetings' ? 'active' : ''}`} style={{ color: activeTab === 'admin_meetings' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_meetings')}>Klubestek kezelése</button>
                  <button className={`drop-item ${activeTab === 'admin_homeworks' ? 'active' : ''}`} style={{ color: activeTab === 'admin_homeworks' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_homeworks')}>Házi feladatok kezelése</button>
                  {user?.email === ADMIN_EMAIL && <button className={`drop-item ${activeTab === 'admin_weekly' ? 'active' : ''}`} style={{ color: activeTab === 'admin_weekly' ? '#ef4444' : ''}} onClick={() => handleNavClick('admin_weekly')}>Párbaj kezelése</button>}
                  
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

        <div className="user-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '1rem' }}>
              {user.name}
            </span>
            
            {(user?.isPremium || user?.is_premium) && (
              <span title="Prémium Tag" style={{ fontSize: '1.1rem' }}>⭐</span>
            )}
            
            {isLeader && (
              <span style={{ fontSize: '0.75rem', background: '#f59e0b20', color: '#f59e0b', padding: '3px 8px', borderRadius: '6px', border: '1px solid #f59e0b50', fontWeight: 'bold' }}>
                Vezetőség
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            
            {(user?.isPremium || user?.is_premium) && (
              <button 
                onClick={handleManageSubscription}
                style={{ background: '#1e293b', color: '#10b981', border: '1px solid #10b98150', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold', transition: 'background 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = '#10b98120'}
                onMouseOut={e => e.currentTarget.style.background = '#1e293b'}
              >
                👑 Előfizetés
              </button>
            )}

            <button 
              onClick={() => { googleLogout(); onLogout(); }} 
              style={{ background: 'transparent', border: '1px solid #ef444450', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', transition: 'background 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = '#ef444420'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              Kijelentkezés
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
