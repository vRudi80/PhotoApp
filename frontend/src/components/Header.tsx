import { useState } from 'react';
import { googleLogout } from '@react-oauth/google';

interface HeaderProps {
  user: any;
  isLeader: boolean;
  isAdmin: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Header({ user, isLeader, isAdmin, activeTab, setActiveTab, onLogout }: HeaderProps) {
  // A lenyíló menü állapota már csak ezen a komponensen belül létezik!
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const navBtnStyle = { background: 'transparent', color: '#f8fafc', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '5px', transition: 'background 0.2s' };
  const dropItemStyle = { background: 'transparent', color: '#cbd5e1', border: 'none', padding: '12px 15px', textAlign: 'left' as const, cursor: 'pointer', width: '100%', borderBottom: '1px solid #334155', fontSize: '0.95rem', transition: 'background 0.2s' };

  return (
    <header className="app-header">
      {dropdownOpen && <div onClick={() => setDropdownOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />}

      <div className="nav-group">
        
        {/* PÁLYÁZATOK */}
        <div className="nav-item-container" style={{ zIndex: dropdownOpen === 'contests' ? 60 : 50 }}>
          <button className={`nav-btn ${dropdownOpen === 'contests' || activeTab.startsWith('contests_') ? 'active' : ''}`} onClick={() => setDropdownOpen(dropdownOpen === 'contests' ? null : 'contests')}>
            <span>Pályázatok</span> <span>▾</span>
          </button>
          {dropdownOpen === 'contests' && (
            <div className="dropdown-menu">
              <button className={`drop-item ${activeTab === 'contests_club_active' ? 'active' : ''}`} onClick={() => { setActiveTab('contests_club_active'); setDropdownOpen(null); }}>Klubom aktív pályázatai</button>
              <button className={`drop-item ${activeTab === 'contests_open_active' ? 'active' : ''}`} onClick={() => { setActiveTab('contests_open_active'); setDropdownOpen(null); }}>Nyílt aktív pályázatok</button>
              <button className={`drop-item ${activeTab === 'contests_closed' ? 'active' : ''}`} onClick={() => { setActiveTab('contests_closed'); setDropdownOpen(null); }}>Lezárult pályázatok</button>
            </div>
          )}
        </div>

        {/* SAJÁT KLUBOM */}
        <div className="nav-item-container" style={{ zIndex: dropdownOpen === 'club' ? 60 : 50 }}>
          <button className={`nav-btn ${dropdownOpen === 'club' || activeTab.startsWith('club_') ? 'active' : ''}`} onClick={() => setDropdownOpen(dropdownOpen === 'club' ? null : 'club')}>
            <span>Saját klubom</span> <span>▾</span>
          </button>
          {dropdownOpen === 'club' && (
            <div className="dropdown-menu">
              <button className={`drop-item ${activeTab === 'club_nights' ? 'active' : ''}`} onClick={() => { setActiveTab('club_nights'); setDropdownOpen(null); }}>Klubestek</button>
              <button className={`drop-item ${activeTab === 'club_homeworks' ? 'active' : ''}`} onClick={() => { setActiveTab('club_homeworks'); setDropdownOpen(null); }}>Házi feladatok</button>
            </div>
          )}
        </div>

        {/* SZALONOK */}
        <div className="nav-item-container" style={{ zIndex: 50 }}>
          <button className={`nav-btn ${activeTab === 'salons' ? 'active' : ''}`} style={{ color: '#60a5fa' }} onClick={() => { setActiveTab('salons'); setDropdownOpen(null); }}>
            <span>🌐 Nemzetközi Szalonok</span>
          </button>
        </div>

        {/* ADMINISZTRÁCIÓ */}
        {(isAdmin || isLeader) && (
          <div className="nav-item-container" style={{ zIndex: dropdownOpen === 'admin' ? 60 : 50 }}>
            <button className={`nav-btn ${dropdownOpen === 'admin' || activeTab.startsWith('admin_') ? 'active' : ''}`} style={{ color: '#f59e0b' }} onClick={() => setDropdownOpen(dropdownOpen === 'admin' ? null : 'admin')}>
              <span>⚙️ Adminisztráció</span> <span>▾</span>
            </button>
            {dropdownOpen === 'admin' && (
              <div className="dropdown-menu">
                {isAdmin && <button className={`drop-item ${activeTab === 'admin_contests' ? 'active' : ''}`} style={{ color: activeTab === 'admin_contests' ? '#f59e0b' : ''}} onClick={() => { setActiveTab('admin_contests'); setDropdownOpen(null); }}>Pályázatok kezelése</button>}
                <button className={`drop-item ${activeTab === 'admin_meetings' ? 'active' : ''}`} style={{ color: activeTab === 'admin_meetings' ? '#f59e0b' : ''}} onClick={() => { setActiveTab('admin_meetings'); setDropdownOpen(null); }}>Klubestek kezelése</button>
                <button className={`drop-item ${activeTab === 'admin_homeworks' ? 'active' : ''}`} style={{ color: activeTab === 'admin_homeworks' ? '#f59e0b' : ''}} onClick={() => { setActiveTab('admin_homeworks'); setDropdownOpen(null); }}>Házi feladatok kezelése</button>
                {isAdmin && <button className={`drop-item ${activeTab === 'admin_salons' ? 'active' : ''}`} style={{ color: activeTab === 'admin_salons' ? '#f59e0b' : ''}} onClick={() => { setActiveTab('admin_salons'); setDropdownOpen(null); }}>Szalonok kezelése</button>}
                {isAdmin && <button className={`drop-item ${activeTab === 'admin_users' ? 'active' : ''}`} style={{ color: activeTab === 'admin_users' ? '#f59e0b' : ''}} onClick={() => { setActiveTab('admin_users'); setDropdownOpen(null); }}>Felhasználók</button>}
                {isAdmin && <button className={`drop-item ${activeTab === 'admin_clubs' ? 'active' : ''}`} style={{ color: activeTab === 'admin_clubs' ? '#f59e0b' : ''}} onClick={() => { setActiveTab('admin_clubs'); setDropdownOpen(null); }}>Fotóklubok</button>}
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
    </header>
  );
}
