import { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL } from '../../utils/constants';

interface AdminUsersViewProps {
  allUsers: any[];
  clubs: any[];
  userClubEdits: Record<string, string>;
  setUserClubEdits: (edits: any) => void;
  userRoleEdits: Record<string, string>;
  setUserRoleEdits: (edits: any) => void;
  saveUserClub: (email: string) => void;
}

export default function AdminUsersView({ 
  allUsers, 
  clubs, 
  userClubEdits, 
  setUserClubEdits, 
  userRoleEdits, 
  setUserRoleEdits, 
  saveUserClub 
}: AdminUsersViewProps) {
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // Tárhely statisztikák állapota
  const [storageStats, setStorageStats] = useState<Record<string, { count: number, bytes: number }>>({});
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Adatok lekérése a backendről
  useEffect(() => {
    const fetchStorageStats = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/user-storage-stats`);
        if (res.ok) {
          const data = await res.json();
          const statsMap: Record<string, { count: number, bytes: number }> = {};
          data.forEach((stat: any) => {
            statsMap[stat.user_email] = { 
              count: stat.total_photos || 0, 
              bytes: Number(stat.total_bytes) || 0 
            };
          });
          setStorageStats(statsMap);
        }
      } catch (e) {
        console.error("Nem sikerült betölteni a tárhely statisztikákat", e);
      } finally {
        setIsLoadingStats(false);
      }
    };
    fetchStorageStats();
  }, []);

  // Bájtok emberi (MB/GB) formátummá alakítása
  const formatExactStorage = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 MB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 🎯 ÚJ: INTELLIGENS KERESŐ ÉS UTOLSÓ BELÉPÉS SZERINTI CSÖKKENŐ RENDEZŐ MOTOR
  const processedUsers = useMemo(() => {
    // 1. Első lépésként lefuttatjuk a meglévő keresési szűrést
    const filtered = allUsers.filter(u => 
      (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.club_name && u.club_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // 2. Második lépésben időbélyeg alapján csökkenő sorrendbe (legfrissebb előre) rendezzük
    return [...filtered].sort((a, b) => {
      const timeA = a.last_login ? new Date(a.last_login).getTime() : 0;
      const timeB = b.last_login ? new Date(b.last_login).getTime() : 0;
      return timeB - timeA; // timeB - timeA = legújabb belépés kerül a lista tetejére
    });
  }, [allUsers, searchTerm]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString('hu-HU', { 
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b' }}>👥 Felhasználók és Tárhely Kezelése</h2>
      
      {/* Statisztika és Kereső sáv */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '15px 20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #334155', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f59e0b' }}>{allUsers.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Regisztrált</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981' }}>{allUsers.filter(u => u.is_premium === 1).length}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Prémium Tag</div>
          </div>
        </div>
        
        <input 
          type="text" 
          placeholder="🔍 Keresés név, email vagy klub alapján..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ padding: '8px 15px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: 'white', minWidth: '350px', outline: 'none' }}
        />
      </div>

      {/* Felhasználók táblázata */}
      <div style={{ overflowX: 'auto', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
          <thead>
            <tr style={{ background: '#0f172a', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '15px', borderBottom: '1px solid #334155' }}>Felhasználó</th>
              <th style={{ padding: '15px', borderBottom: '1px solid #334155' }}>Klub és Szerepkör</th>
              <th style={{ padding: '15px', borderBottom: '1px solid #334155', textAlign: 'center' }}>Tárhely Foglalás</th>
              <th style={{ padding: '15px', borderBottom: '1px solid #334155' }}>Aktivitás & AI</th>
              <th style={{ padding: '15px', borderBottom: '1px solid #334155', textAlign: 'right' }}>Művelet</th>
            </tr>
          </thead>
          <tbody>
            {/* 🎯 JAVÍTVA: Most már az intelligensen rendezett 'processedUsers' listát képezzük le */}
            {processedUsers.map((u, index) => {
              const originalClub = u.club_name || '';
              const originalRole = u.club_role || 'member';
              const currentClubValue = userClubEdits[u.email] !== undefined ? userClubEdits[u.email] : originalClub;
              const currentRoleValue = userRoleEdits[u.email] !== undefined ? userRoleEdits[u.email] : originalRole;
              const hasChanges = currentClubValue !== originalClub || currentRoleValue !== originalRole;
              
              const isPremium = u.is_premium === 1;
              const hasExpiredPremium = u.is_premium === 0 && u.premium_until;

              // Tárhely adatok kiolvasása
              const userStats = storageStats[u.email] || { count: 0, bytes: 0 };
              const isHeavyUser = userStats.count > 50;

              return (
                <tr key={index} style={{ borderBottom: '1px solid #334155', backgroundColor: index % 2 === 0 ? 'transparent' : '#0f172a50', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#33415550'} onMouseOut={e => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'transparent' : '#0f172a50'}>
                  
                  {/* 1. Név és Email */}
                  <td style={{ padding: '15px' }}>
                    <div style={{ fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}>{u.name || 'Nincs név megadva'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{u.email}</div>
                    <div style={{ marginTop: '8px' }}>
                      {isPremium ? (
                        <span style={{ background: '#10b98120', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>👑 Prémium ({formatDate(u.premium_until)})</span>
                      ) : hasExpiredPremium ? (
                        <span style={{ background: '#ef444420', color: '#ef4444', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>⏳ Lejárt</span>
                      ) : (
                        <span style={{ background: '#334155', color: '#94a3b8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>⚪ Ingyenes</span>
                      )}
                    </div>
                  </td>
                  
                  {/* 2. Klubtagság beállítása */}
                  <td style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <select 
                        value={currentClubValue} 
                        onChange={(e) => setUserClubEdits({...userClubEdits, [u.email]: e.target.value})} 
                        style={{ padding: '6px', borderRadius: '4px', background: '#0f172a', color: 'white', border: '1px solid #475569', fontSize: '0.85rem' }}
                      >
                        <option value="">-- Nincs Klub --</option>
                        {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                      
                      <select 
                        value={currentRoleValue} 
                        onChange={(e) => setUserRoleEdits({...userRoleEdits, [u.email]: e.target.value})} 
                        style={{ padding: '6px', borderRadius: '4px', background: '#0f172a', color: 'white', border: '1px solid #475569', fontSize: '0.85rem' }}
                      >
                        <option value="member">Tag</option>
                        <option value="deputy">Helyettes</option>
                        <option value="leader">Vezető</option>
                      </select>
                    </div>
                  </td>

                  {/* 3. Tárhely Foglalás */}
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    {isLoadingStats ? (
                      <span style={{ color: '#64748b' }}>⏳...</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                        <span style={{ 
                          background: isHeavyUser ? '#ef444420' : '#38bdf820', 
                          color: isHeavyUser ? '#ef4444' : '#38bdf8', 
                          padding: '4px 10px', 
                          borderRadius: '100px', 
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          border: `1px solid ${isHeavyUser ? '#ef4444' : '#38bdf8'}`
                        }}>
                          📸 {userStats.count} kép
                        </span>
                        <span style={{ color: isHeavyUser ? '#ef4444' : '#a78bfa', fontWeight: 'bold', fontSize: '0.9rem' }}>
                          💾 {formatExactStorage(userStats.bytes)}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* 4. Statisztikák (AI és Utolsó belépés) */}
                  <td style={{ padding: '15px' }}>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '4px' }} title="Elemzett képek száma">
                      🤖 AI Elemzés: <span style={{ fontWeight: 'bold', color: u.ai_usage_count > 0 ? '#38bdf8' : '#64748b' }}>{u.ai_usage_count || 0} db</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Belépett:<br/>{formatDate(u.last_login)}
                    </div>
                  </td>

                  {/* 5. Mentés gomb */}
                  <td style={{ padding: '15px', textAlign: 'right' }}>
                    {hasChanges && (
                      <button 
                        onClick={() => saveUserClub(u.email)} 
                        style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: 'transform 0.1s' }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        Mentés
                      </button>
                    )}
                  </td>

                </tr>
              )
            })}
            
            {/* 🎯 JAVÍTVA: A hosszt is a processedUsers alapján ellenőrizzük */}
            {processedUsers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                  Nincs találat a keresésre.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
