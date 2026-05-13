interface AdminUsersViewProps {
  allUsers: any[];
  clubs: any[];
  userClubEdits: Record<string, string>;
  setUserClubEdits: (edits: Record<string, string>) => void;
  userRoleEdits: Record<string, string>;
  setUserRoleEdits: (edits: Record<string, string>) => void;
  saveUserClub: (email: string) => void;
}

export default function AdminUsersView({
  allUsers, clubs, userClubEdits, setUserClubEdits, userRoleEdits, setUserRoleEdits, saveUserClub
}: AdminUsersViewProps) {
  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b' }}>👥 Felhasználók és Szerepkörök</h2>
      
      <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
        {allUsers.map((u, index) => (
          <div key={u.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: index < allUsers.length - 1 ? '1px solid #334155' : 'none', background: index % 2 === 0 ? '#0f172a' : 'transparent', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>{u.name}</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{u.email}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                🕒 Utolsó belépés: {u.last_login ? new Date(u.last_login).toLocaleString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Ismeretlen'}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select 
                value={userClubEdits[u.email] !== undefined ? userClubEdits[u.email] : (u.club_name || '')} 
                onChange={e => setUserClubEdits({...userClubEdits, [u.email]: e.target.value})} 
                style={{ padding: '8px', borderRadius: '6px', background: '#1e293b', border: '1px solid #475569', color: 'white', width: '200px', margin: 0 }}
              >
                <option value="">-- Nincs klubja --</option>
                {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              
              <select 
                value={userRoleEdits[u.email] !== undefined ? userRoleEdits[u.email] : (u.club_role || 'member')} 
                onChange={e => setUserRoleEdits({...userRoleEdits, [u.email]: e.target.value})} 
                style={{ padding: '8px', borderRadius: '6px', background: '#1e293b', border: '1px solid #475569', color: 'white', width: '150px', margin: 0 }}
              >
                <option value="member">Klubtag</option>
                <option value="leader">Klubvezető</option>
                <option value="deputy">Vezető helyettes</option>
              </select>
              
              <button onClick={() => saveUserClub(u.email)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>Mentés</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
