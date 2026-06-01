import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/constants';

interface ProfileViewProps {
  user: any;
  setUser: (user: any) => void; // Ahhoz, hogy a fő app is tudja, ha változott a klub!
}

export default function ProfileView({ user, setUser }: ProfileViewProps) {
  const [availableClubs, setAvailableClubs] = useState<any[]>([]);
  const [selectedClub, setSelectedClub] = useState(user?.club_name || '');
  const [isSaving, setIsSaving] = useState(false);

  // Betöltjük a klubokat a szerverről
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/clubs`)
      .then(res => res.json())
      .then(data => setAvailableClubs(data))
      .catch(console.error);
  }, []);

  const handleClubSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/update-club`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, clubName: selectedClub })
      });
      
      if (res.ok) {
        alert(selectedClub ? '🛡️ Sikeresen csatlakoztál a klubhoz!' : 'Kiléptél a klubból, mostantól függetlenként indulsz!');
        // Frissítjük a globális User state-et is!
        setUser({ ...user, club_name: selectedClub });
      } else {
        alert('Hiba történt a mentéskor!');
      }
    } catch (e) {
      alert('Szerver hiba történt!');
    }
    setIsSaving(false);
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', display: 'flex', flexDirection: 'column', gap: '30px', alignItems: 'center' }}>
      
      {/* FEJLÉC ÉS SZEMÉLYES ADATOK */}
      <div style={{ width: '100%', maxWidth: '600px', background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '40px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', color: 'white', marginBottom: '20px', boxShadow: '0 10px 25px rgba(56, 189, 248, 0.4)' }}>
          {user?.name?.charAt(0).toUpperCase() || '👤'}
        </div>
        <h2 style={{ color: '#f8fafc', margin: '0 0 5px 0', fontSize: '2rem' }}>{user?.name}</h2>
        <p style={{ color: '#94a3b8', margin: '0 0 20px 0', fontSize: '1rem' }}>{user?.email}</p>
        <div style={{ background: '#0f172a', padding: '10px 20px', borderRadius: '100px', border: '1px solid #334155', color: '#cbd5e1', fontSize: '0.9rem' }}>
          Jelenlegi Státusz: <b>{user?.club_name ? `🛡️ ${user.club_name}` : 'Szabadúszó (Nincs klub)'}</b>
        </div>
      </div>

      {/* KLUB CSATLAKOZÁS MODUL */}
      <div style={{ width: '100%', maxWidth: '600px', background: '#1e293b', padding: '40px', borderRadius: '24px', border: '1px solid #10b981', boxShadow: '0 10px 30px rgba(16, 185, 129, 0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>🛡️</div>
          <h3 style={{ color: '#10b981', margin: '0 0 10px 0', fontSize: '1.6rem' }}>Klubtagság Beállítása</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
            Képviseld a csapatodat a Heti Párbajokban! A szerzett pontjaiddal a klubodat is a ranglista élére repítheted. A változtatás azonnal életbe lép.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <select 
            value={selectedClub} 
            onChange={(e) => setSelectedClub(e.target.value)}
            style={{ width: '100%', padding: '16px', borderRadius: '14px', background: '#0f172a', color: 'white', border: '1px solid #334155', fontSize: '1.05rem', outline: 'none', cursor: 'pointer', appearance: 'none' }}
          >
            <option value="">-- Független fotós vagyok --</option>
            {availableClubs.map((club, i) => (
              <option key={i} value={club.name}>{club.name}</option>
            ))}
          </select>

          <button 
            onClick={handleClubSave} 
            disabled={isSaving || selectedClub === (user?.club_name || '')}
            style={{ 
              width: '100%', padding: '16px', borderRadius: '14px', border: 'none', 
              background: (isSaving || selectedClub === (user?.club_name || '')) ? '#334155' : 'linear-gradient(135deg, #10b981, #059669)', 
              color: (isSaving || selectedClub === (user?.club_name || '')) ? '#64748b' : 'white', 
              fontSize: '1.1rem', fontWeight: 'bold', 
              cursor: (isSaving || selectedClub === (user?.club_name || '')) ? 'not-allowed' : 'pointer', 
              transition: 'all 0.3s', 
              boxShadow: (selectedClub !== (user?.club_name || '') && !isSaving) ? '0 5px 20px rgba(16, 185, 129, 0.4)' : 'none' 
            }}
          >
            {isSaving ? 'Mentés folyamatban...' : (selectedClub === (user?.club_name || '') ? 'Jelenlegi Klubod' : 'Mentés és Csatlakozás 🚀')}
          </button>
        </div>
      </div>

    </div>
  );
}
