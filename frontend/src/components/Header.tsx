import { useState } from 'react';
import { googleLogout } from '@react-oauth/google';
import { ADMIN_EMAIL, BACKEND_URL } from '../utils/constants';

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

  // SEGÉDFÜGGVÉNY: A Stripe Ügyfélkapu indítása
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
          
          <div className="nav-item-container" style={{ zIndex: 50 }}>
            <button className={`nav-btn ${activeTab === 'fiap_progress' ? 'active' : ''}`} style={{ color: '#f472b6' }} onClick={() => handleNavClick('fiap_progress')}>
              <span>🏅 FIAP Minősítések</span>
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

        {/* --- FELHASZNÁLÓI BLOKK (ÚJ, KÉTSOROS ELRENDEZÉS) --- */}
        <div className="user-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
          
          {/* 1. FELSŐ SOR: Név, Csillag, Vezetőség */}
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

          {/* 2. ALSÓ SOR: Prémium Kezelés és Kijelentkezés gombok */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            
            {(user?.isPremium || user?.is_premium) && (
              <button 
                onClick={handleManageSubscription}
                style={{ background: '#1e293b', color: '#10b981', border: '1px solid #10b98150', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold', transition: 'background 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = '#10b98120'}
                onMouseOut={e => e.currentTarget.style.background = '#1e293b'}
              >
                👑 Prémium Kezelés
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
