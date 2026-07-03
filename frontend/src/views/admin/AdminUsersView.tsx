import { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL } from '../../utils/constants';

interface AdminUsersViewProps {
  allUsers: any[]; // Megmarad a prop kompatibilitás miatt
  clubs: any[];
  userClubEdits: Record<string, string>;
  setUserClubEdits: (edits: any) => void;
  userRoleEdits: Record<string, string>;
  setUserRoleEdits: (edits: any) => void;
  saveUserClub: (email: string) => void;
}

// 🎯 KÖZPONTI AUTH FEJLÉC GENERÁTOR ADMINISZTRÁCIÓS VÉGPONTOKHOZ
const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('photoAppToken');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

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
  
  // Helyi felhasználói lista
  const [localUsers, setLocalUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Tárhely statisztikák állapota
  const [storageStats, setStorageStats] = useState<Record<string, { count: number, bytes: number }>>({});
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // 📧 E-MAIL KÜLDŐ ÁLLAPOTOK
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const silhouetteAvatar = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23475569'><circle cx='12' cy='8' r='4'/><path d='M12 14c-6.1 0-10 4-10 4v2h20v-2s-3.9-4-10-4z'/></svg>";

  // Felhasználók közvetlen lekérése hitelesítve
  const loadFreshUsersList = async () => {
    try {
      // 🎯 JAVÍTVA: Az admin exkluzív felhasználói lista lekérése tokenesítve lett
      const res = await fetch(`${BACKEND_URL}/api/admin/exclusive-users`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setLocalUsers(data || []);
      } else {
        setLocalUsers(allUsers || []);
      }
    } catch (e) {
      setLocalUsers(allUsers || []);
    } final {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadFreshUsersList();
    
    const fetchStorageStats = async () => {
      try {
        // 🎯 JAVÍTVA: A tárhely-statisztikák lekérése megkapta a biztonsági tokent
        const res = await fetch(`${BACKEND_URL}/api/admin/user-storage-stats`, {
          headers: getAuthHeaders()
        });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const formatExactStorage = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 MB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // INTELLIGENS KERESŐ ÉS RENDEZŐ MOTOR
  const processedUsers = useMemo(() => {
    const filtered = localUsers.filter(u => 
      (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.club_name && u.club_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return [...filtered].sort((a, b) => {
      const timeA = a.last_login ? new Date(a.last_login).getTime() : 0;
      const timeB = b.last_login ? new Date(b.last_login).getTime() : 0;
      return timeB - timeA; 
    });
  }, [localUsers, searchTerm]);

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

  const handleLocalSave = async (email: string) => {
    try {
      const chosenClub = userClubEdits[email];
      const chosenRole = userRoleEdits[email];

      await saveUserClub(email);

      setLocalUsers(prevUsers => 
        prevUsers.map(item => 
          item.email === email 
            ? { 
                ...item, 
                club_name: chosenClub !== undefined ? chosenClub : item.club_name, 
                club_role: chosenRole !== undefined ? chosenRole : item.club_role 
              }
            : item
        )
      );

      setUserClubEdits((prev: any) => {
        const next = { ...prev };
        delete next[email];
        return next;
      });

      setUserRoleEdits((prev: any) => {
        const next = { ...prev };
        delete next[email];
        return next;
      });

      setTimeout(() => {
        loadFreshUsersList();
      }, 1000);

    } catch (error) {
      console.error("Hiba történt a felhasználó mentése során:", error);
      alert("Nem sikerült elmenteni a módosításokat.");
    }
  };

  // 📧 E-MAIL KÜLDŐ FÜGGVÉNY
  const handleSendBulkEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      return alert("Kérlek, töltsd ki a tárgyat és az üzenetet is!");
    }

    if (!window.confirm(`Biztosan elküldöd ezt az e-mailt a listában szereplő ${processedUsers.length} felhasználónak?`)) {
      return;
    }

    setIsSendingEmail(true);
    try {
      const targetEmails = processedUsers.map(u => u.email).filter(Boolean);

      // 🎯 JAVÍTVA: A tömeges hírlevélküldés biztonságosan, hitelesített fejlécekkel fut ki
      const res = await fetch(`${BACKEND_URL}/api/admin/send-bulk-email`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          emails: targetEmails,
          subject: emailSubject,
          body: emailBody
        })
      });

      if (res.ok) {
        alert("🎉 Az e-mailek sikeresen elküldve!");
        setIsEmailModalOpen(false);
        setEmailSubject('');
        setEmailBody('');
      } else {
        const err = await res.json();
        alert(`❌ Hiba történt: ${err.error || 'Ismeretlen hiba'}`);
      }
    } catch (error) {
      alert("❌ Hálózati hiba történt a küldés során!");
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '2rem', margin: 0, color: '#f59e0b' }}>👥 Felhasználók és Tárhely Kezelése</h2>
        
        <button 
          onClick={() => setIsEmailModalOpen(true)}
          style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
        >
          📧 E-mail küldése
        </button>
      </div>
      
      {/* Statisztika és Kereső sáv */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '15px 20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #334155', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f59e0b' }}>{localUsers.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Összes regisztrált</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#38bdf8' }}>{processedUsers.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Aktuális lista (címzettek)</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981' }}>{localUsers.filter(u => u.is_premium === 1).length}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Prémium Tag</div>
          </div>
        </div>
        
        <input 
          type="text" 
          placeholder="🔍 Szűrés név, email vagy klub alapján..." 
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
            {isLoadingUsers ? (
              <tr>
                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontWeight: 'bold' }}>
                  ⏳ Felhasználói adatbázis szinkronizálása...
                </td>
              </tr>
            ) : (
              processedUsers.map((u, index) => {
                const originalClub = u.club_name || '';
                const originalRole = u.club_role || 'member';
                const currentClubValue = userClubEdits[u.email] !== undefined ? userClubEdits[u.email] : originalClub;
                const currentRoleValue = userRoleEdits[u.email] !== undefined ? userRoleEdits[u.email] : originalRole;
                const hasChanges = currentClubValue !== originalClub || currentRoleValue !== originalRole;
                
                const isPremium = u.is_premium === 1;
                const hasExpiredPremium = u.is_premium === 0 && u.premium_until;

                const userStats = storageStats[u.email] || { count: 0, bytes: 0 };
                const isHeavyUser = userStats.count > 50;

                return (
                  <tr key={index} style={{ borderBottom: '1px solid #334155', backgroundColor: index % 2 === 0 ? 'transparent' : '#0f172a50', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#33415550'} onMouseOut={e => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'transparent' : '#0f172a50'}>
                    
                    {/* 1. Név, Email és Profilkép */}
                    <td style={{ padding: '15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <img 
                          src={u.avatar_url || silhouetteAvatar} 
                          alt="" 
                          style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #475569', backgroundColor: '#090d16', flexShrink: 0 }}
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = silhouetteAvatar; }}
                        />
                        
                        <div>
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
                        </div>
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

                    {/* 4. Statisztikák */}
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
                          onClick={() => handleLocalSave(u.email)} 
                          style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: 'all 0.1s' }}
                        >
                          Mentés
                        </button>
                      )}
                    </td>

                  </tr>
                );
              })
            )}
            
            {!isLoadingUsers && processedUsers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                  Nincs találat a keresésre.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 📧 E-MAIL KÜLDŐ MODAL */}
      {isEmailModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
          <div style={{ background: '#1e293b', width: '100%', maxWidth: '600px', borderRadius: '16px', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden', animation: 'fadeIn 0.2s ease-out' }}>
            
            {/* Fejléc */}
            <div style={{ background: '#0f172a', padding: '20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '1.25rem' }}>📧 Rendszer E-mail Küldése</h3>
              <button 
                onClick={() => setIsEmailModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {/* Tartalom */}
            <div style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div style={{ background: '#3b82f615', border: '1px solid #3b82f630', padding: '12px', borderRadius: '8px', color: '#93c5fd', fontSize: '0.9rem' }}>
                Az üzenetet a jelenleg leszűrt listában szereplő <b>{processedUsers.length} felhasználó</b> fogja megkapni rejtett másolatként (BCC).
              </div>

              <div>
                <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>Tárgy:</label>
                <input 
                  type="text"
                  placeholder="Pl.: Új funkciók az oldalon! / Fontos karbantartás"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>Üzenet (HTML engedélyezett):</label>
                <textarea 
                  placeholder="Írd ide az e-mail szövegét..."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white', outline: 'none', minHeight: '200px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            {/* Gombok */}
            <div style={{ background: '#0f172a', padding: '20px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
              <button 
                onClick={() => setIsEmailModalOpen(false)}
                style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                disabled={isSendingEmail}
              >
                Mégse
              </button>
              <button 
                onClick={handleSendBulkEmail}
                disabled={isSendingEmail}
                style={{ padding: '10px 20px', background: isSendingEmail ? '#475569' : '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: isSendingEmail ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {isSendingEmail ? '⏳ Küldés folyamatban...' : '🚀 E-mailek elküldése'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
