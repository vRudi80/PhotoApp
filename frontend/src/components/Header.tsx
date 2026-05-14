import { useState } from 'react';
import { googleLogout } from '@react-oauth/google';
import { ADMIN_EMAIL } from '../utils/constants';

interface HeaderProps {
  user: any;
  isLeader: boolean;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  dropdownOpen: 'contests' | 'club' | 'admin' | null;
  setDropdownOpen: (open: 'contests' | 'club' | 'admin' | null) => void;
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

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setDropdownOpen(null);
    setIsMobileMenuOpen(false); 
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
          
          <div className="nav-item-container" style={{ zIndex: dropdownOpen === 'contests' ? 60 : 50 }}>
            <button className={`nav-btn ${dropdownOpen === 'contests' || activeTab.startsWith('contests_') ? 'active' : ''}`} onClick={() => setDropdownOpen(dropdownOpen === 'contests' ? null : 'contests')}>
              <span>Pályázatok</span> <span>▾</span>
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
              <span>Saját klubom</span> <span>▾</span>
            </button>
            {dropdownOpen === 'club' && (
              <div className="dropdown-menu">
                <button className={`drop-item ${activeTab === 'club_nights' ? 'active' : ''}`} onClick={() => handleNavClick('club_nights')}>Klubestek</button>
                <button className={`drop-item ${activeTab === 'club_homeworks' ? 'active' : ''}`} onClick={() => handleNavClick('club_homeworks')}>Házi feladatok</button>
              </div>
            )}
          </div>

          <div className="nav-item-container" style={{ zIndex: 50 }}>
            <button className={`nav-btn ${activeTab === 'salons' ? 'active' : ''}`} style={{ color: '#60a5fa' }} onClick={() => handleNavClick('salons')}>
              <span>🌐 Nemzetközi Szalonok</span>
            </button>
          </div>

          <div className="nav-item-container" style={{ zIndex: 50 }}>
              <button className={`nav-btn ${activeTab === 'my_album' ? 'active' : ''}`} style={{ color: '#10b981' }} onClick={() => handleNavClick('my_album')}>
                <span>🖼️ Saját Képalbum</span>
              </button>
          </div>
          
          {(user?.email === ADMIN_EMAIL || isLeader) && (
            <div className="nav-item-container" style={{ zIndex: dropdownOpen === 'admin' ? 60 : 50 }}>
              <button className={`nav-btn ${dropdownOpen === 'admin' || activeTab.startsWith('admin_') ? 'active' : ''}`} style={{ color: '#f59e0b' }} onClick={() => setDropdownOpen(dropdownOpen === 'admin' ? null : 'admin')}>
                <span>⚙️ Adminisztráció</span> <span>▾</span>
              </button>
              {dropdownOpen === 'admin' && (
                <div className="dropdown-menu">
                  {user?.email === ADMIN_EMAIL && <button className={`drop-item ${activeTab === 'admin_contests' ? 'active' : ''}`} style={{ color: activeTab === 'admin_contests' ? '#f59e0b' : ''}} onClick={() => handleNavClick('admin_contests')}>Pályázatok kezelése</button>}
                  <button className={`drop-item ${activeTab === 'admin_meetings' ? 'active' : ''}`} style={{ color: activeTab === 'admin_meetings' ? '#f59e0b' : ''}} onClick={() => handleNavClick('admin_meetings')}>Klubestek kezelése</button>
                  <button className={`drop-item ${activeTab === 'admin_homeworks' ? 'active' : ''}`} style={{ color: activeTab === 'admin_homeworks' ? '#f59e0b' : ''}} onClick={() => handleNavClick('admin_homeworks')}>Házi feladatok kezelése</button>
                  
                  {/* Itt van a jó helyén a Kategóriák és Díjak! */}
                  {user?.email === ADMIN_EMAIL && (
                    <button 
                      className={`drop-item ${activeTab === 'admin_settings' ? 'active' : ''}`} 
                      style={{ color: activeTab === 'admin_settings' ? '#f59e0b' : ''}} 
                      onClick={() => handleNavClick('admin_settings')}
                    >
                      Kategóriák és Díjak
                    </button>
                  )}
                  
                  {user?.email === ADMIN_EMAIL && <button className={`drop-item ${activeTab === 'admin_salons' ? 'active' : ''}`} style={{ color: activeTab === 'admin_salons' ? '#f59e0b' : ''}} onClick={() => handleNavClick('admin_salons')}>Szalonok kezelése</button>}
                  {user?.email === ADMIN_EMAIL && <button className={`drop-item ${activeTab === 'admin_users' ? 'active' : ''}`} style={{ color: activeTab === 'admin_users' ? '#f59e0b' : ''}} onClick={() => handleNavClick('admin_users')}>Felhasználók</button>}
                  {user?.email === ADMIN_EMAIL && <button className={`drop-item ${activeTab === 'admin_clubs' ? 'active' : ''}`} style={{ color: activeTab === 'admin_clubs' ? '#f59e0b' : ''}} onClick={() => handleNavClick('admin_clubs')}>Fotóklubok</button>}
                </div>
              )}
            </div>
          )}
        </div> 

        <div className="user-group">
          <span style={{ fontWeight: 500, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
            {user.name} 
            {isLeader && <span style={{fontSize:'0.7rem', background:'#f59e0b20', color:'#f59e0b', padding:'2px 6px', borderRadius:'4px', marginLeft:'8px'}}>Vezetőség</span>}
          </span>
          <button onClick={() => { googleLogout(); onLogout(); }} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Kijelentkezés</button>
        </div>
      </div>
    </header>
  );
}
