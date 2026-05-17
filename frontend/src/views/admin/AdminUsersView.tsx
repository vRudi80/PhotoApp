import React, { useState } from 'react';

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

  // Keresés szűrése
  const filteredUsers = allUsers.filter(u => 
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.club_name && u.club_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Dátum formázó (Utolsó belépéshez és Prémium megújuláshoz)
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
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b' }}>👥 Felhasználók és Klubtagságok</h2>
      
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
          style={{ padding: '8px 15px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: 'white', minWidth: '250px' }}
        />
      </div>

      {/* Felhasználók táblázata */}
      <div style={{ overflowX: 'auto', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#0f172a', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '15px', borderBottom: '1px solid #334155' }}>Felhasználó</th>
              <th style={{ padding: '15px', borderBottom: '1px solid #334155' }}>Klubtagság és Szerepkör</th>
              <th style={{ padding: '15px', borderBottom: '1px solid #334155' }}>Előfizetés</th>
              <th style={{ padding: '15px', borderBottom: '1px solid #334155' }}>Statisztika</th>
              <th style={{ padding: '15px', borderBottom: '1px solid #334155' }}>Művelet</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u, index) => {
              const currentClubValue = userClubEdits[u.email] !== undefined ? userClubEdits[u.email] : (u.club_name || '');
              const currentRoleValue = userRoleEdits[u.email] !== undefined ? userRoleEdits[u.email] : (u.club_role || 'member');
              const hasChanges = userClubEdits[u.email] !== undefined || userRoleEdits[u.email] !== undefined;
              
              // Prémium státusz vizsgálata
              const isPremium = u.is_premium === 1;
              const hasExpiredPremium = u.is_premium === 0 && u.premium_until;

              return (
                <tr key={index} style={{ borderBottom: '1px solid #334155', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#33415550'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  
                  {/* 1. Név és Email */}
                  <td style={{ padding: '15px' }}>
                    <div style={{ fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}>{u.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{u.email}</div>
                  </td>
                  
                  {/* 2. Klubtagság beállítása */}
                  <td style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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

                  {/* 3. ÚJ: Előfizetés és Forduló */}
                  <td style={{ padding: '15px' }}>
                    {isPremium ? (
                      <div>
                        <div style={{ display: 'inline-block', background: '#10b98120', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '4px' }}>
                          👑 Prémium
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Forduló: {formatDate(u.premium_until).split(' ')[0]}</div>
                      </div>
                    ) : hasExpiredPremium ? (
                      <div>
                        <div style={{ display: 'inline-block', background: '#ef444420', color: '#ef4444', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '4px' }}>
                          ⏳ Lejárt
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Lejárt: {formatDate(u.premium_until).split(' ')[0]}</div>
                      </div>
                    ) : (
                      <div style={{ display: 'inline-block', background: '#334155', color: '#94a3b8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        ⚪ Ingyenes
                      </div>
                    )}
                  </td>

                  {/* 4. ÚJ: Statisztikák (AI és Utolsó belépés) */}
                  <td style={{ padding: '15px' }}>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '4px' }} title="Elemzett képek száma">
                      🤖 AI Képelemzés: <span style={{ fontWeight: 'bold', color: u.ai_usage_count > 0 ? '#38bdf8' : '#64748b' }}>{u.ai_usage_count || 0} db</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Belépett: {formatDate(u.last_login)}
                    </div>
                  </td>

                  {/* 5. Mentés gomb */}
                  <td style={{ padding: '15px' }}>
                    {hasChanges && (
                      <button 
                        onClick={() => saveUserClub(u.email)} 
                        style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                      >
                        Mentés
                      </button>
                    )}
                  </td>

                </tr>
              )
            })}
            
            {filteredUsers.length === 0 && (
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
