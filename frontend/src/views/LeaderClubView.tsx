import React, { useState, useEffect } from 'react';
import { getImageUrl } from '../utils/helpers';

interface LeaderClubViewProps {
  user: any;
  BACKEND_URL: string;
}

export default function LeaderClubView({ user, BACKEND_URL }: LeaderClubViewProps) {
  const [club, setClub] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [clubNameInput, setClubNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const inputStyle = { width: '100%', padding: '12px', marginBottom: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '8px', boxSizing: 'border-box' as const, outline: 'none', fontSize: '0.95rem' };

  const fetchClubData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/my-club?userEmail=${user.email}`);
      if (res.ok) {
        const data = await res.json();
        setClub(data.club);
        setMembers(data.members || []);
        setClubNameInput(data.club?.name || ''); 
      }
    } catch (e) {
      console.error("Hiba a klub betöltésekor", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email) fetchClubData();
  }, [user]);

  const handleUpdateName = async () => {
    if (!clubNameInput.trim()) return alert("A klub neve nem lehet üres!");
    if (clubNameInput.trim() === club?.name) return;

    setIsSavingName(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/my-club/update-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId: club.id, newClubName: clubNameInput, userEmail: user.email }) 
      });
      if (res.ok) {
        alert("🎉 Klubnév sikeresen megváltoztatva!");
        fetchClubData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Hiba történt a név módosítása során.");
      }
    } catch (e) {
      alert("Hálózati hiba!");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile || !club) return;
    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);
      formData.append('clubId', club.id.toString());
      formData.append('userEmail', user.email);

      const res = await fetch(`${BACKEND_URL}/api/my-club/logo`, { method: 'POST', body: formData });
      if (res.ok) {
        alert("📸 Hivatalos klublogó sikeresen frissítve!");
        setLogoFile(null);
        setLogoPreview(null);
        fetchClubData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Hiba a logó feltöltésekor.");
      }
    } catch (e) {
      alert("Hálózati hiba feltöltéskor!");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  if (isLoading) {
    return <div style={{ color: '#0ea5e9', padding: '40px', textAlign: 'center' }}>⏳ Klub törzsadatok szinkronizálása...</div>;
  }

  if (!club) {
    return <div style={{ color: '#ef4444', padding: '20px', textAlign: 'center' }}>❌ Nem található klub ehhez a profilhoz.</div>;
  }

  const logoUrl = getImageUrl(club.drive_logo_id, club.logo_url);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#0ea5e9', fontWeight: '900' }}>🛡️ Vezetőségi Műszerfal ({club.name})</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px', marginBottom: '30px' }}>
        
        {/* KLUB ALAPADATOK */}
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '20px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.25rem' }}>✏️ Klub alapbeállítások</h3>
          
          <div>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Fotóklub megnevezése</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" value={clubNameInput} onChange={e => setClubNameInput(e.target.value)} style={inputStyle} disabled={isSavingName} />
              <button onClick={handleUpdateName} disabled={isSavingName || clubNameInput.trim() === club.name} style={{ background: '#0ea5e9', color: 'white', border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                {isSavingName ? '...' : 'Mentés'}
              </button>
            </div>
            <small style={{ color: '#64748b', marginTop: '5px', display: 'block' }}>⚠️ Figyelem: A név módosításával az összes tag profilja automatikusan frissül az új klubnévre!</small>
          </div>
        </div>

        {/* LOGÓ KEZELÉSE */}
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '20px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.25rem' }}>🖼️ Hivatalos klublogó</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: '#0f172a', padding: '15px', borderRadius: '12px' }}>
            <div style={{ width: '70px', height: '70px', background: '#1e293b', borderRadius: '10px', overflow: 'hidden', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {logoPreview ? (
                <img src={logoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : club.drive_logo_id ? (
                <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '2rem', margin: 'auto' }}>🛡️</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <input type="file" accept="image/png, image/jpeg" onChange={handleLogoChange} style={{ color: '#94a3b8', fontSize: '0.85rem', width: '100%' }} disabled={isUploadingLogo} />
              {logoFile && (
                <button onClick={handleUploadLogo} disabled={isUploadingLogo} style={{ marginTop: '10px', background: '#10b981', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>
                  {isUploadingLogo ? 'Feltöltés...' : 'Logó mentése 💾'}
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* TÉTELES TAGLISTA */}
      <h3 style={{ color: '#f8fafc', marginBottom: '15px', fontSize: '1.3rem', fontWeight: 'bold' }}>👥 Regisztrált klubtagok jegyzéke ({members.length} fő)</h3>
      <div style={{ background: '#1e293b', borderRadius: '18px', overflow: 'hidden', border: '1px solid #334155' }}>
        {members.map((m, i) => (
          <div key={m.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: i < members.length - 1 ? '1px solid #334155' : 'none', background: i % 2 === 0 ? '#0f172a' : 'transparent' }}>
            <div>
              <div style={{ fontWeight: 'bold', color: 'white', fontSize: '1.05rem' }}>{m.name}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>{m.email}</div>
            </div>
            <div>
              <span style={{ 
                background: m.club_role === 'leader' ? '#fbbf2420' : m.club_role === 'deputy' ? '#38bdf820' : '#334155', 
                color: m.club_role === 'leader' ? '#fbbf24' : m.club_role === 'deputy' ? '#38bdf8' : '#cbd5e1', 
                padding: '4px 12px', 
                borderRadius: '50px', 
                fontSize: '0.8rem', 
                fontWeight: 'bold', 
                border: m.club_role === 'leader' ? '1px solid #fbbf2440' : m.club_role === 'deputy' ? '1px solid #38bdf840' : '1px solid transparent' 
              }}>
                {m.club_role === 'leader' ? '👑 Klubvezető' : m.club_role === 'deputy' ? '⭐ Helyettes' : 'Fotóstag'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
