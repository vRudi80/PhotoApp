import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/constants';

interface ProfileViewProps {
  user: any; // Ez az adatbázisból jövő currentDbUser az App.tsx-ből
  setUser: (u: any) => void;
  fetchData: () => void;
}

export default function ProfileView({ user, setUser, fetchData }: ProfileViewProps) {
  const inputStyle = { width: '100%', padding: '12px', marginBottom: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '10px', boxSizing: 'border-box' as const, fontSize: '0.95rem' };

  const [activeClubs, setActiveClubs] = useState<any[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLeader = user?.club_role === 'leader' || user?.club_role === 'deputy';

  // 1. Csak a vezetővel rendelkező klubok betöltése a legördülő listába
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/clubs/active-only`)
      .then(res => res.json())
      .then(data => setActiveClubs(data || []))
      .catch(console.error);
  }, []);

  // 2. Ha klubvezető az illető, betöltjük a klubjához tartozó jelentkezőket
  const loadPendingMembers = () => {
    if (isLeader && user?.club_id) {
      fetch(`${BACKEND_URL}/api/clubs/pending-members?clubId=${user.club_id}`)
        .then(res => res.json())
        .then(data => setPendingMembers(data || []))
        .catch(console.error);
    }
  };

  useEffect(() => {
    loadPendingMembers();
  }, [user, isLeader]);

  // 3. Csatlakozási kérelem leadása
  const handleJoinClub = async () => {
    if (!selectedClubId) return alert('Kérlek válassz egy fotóklubot!');
    const targetClub = activeClubs.find(c => String(c.id) === selectedClubId);
    if (!targetClub) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/clubs/join-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email, clubId: targetClub.id, clubName: targetClub.name })
      });
      if (res.ok) {
        alert(`✉️ Kérelem elküldve a(z) "${targetClub.name}" vezetőségének!`);
        fetchData(); // App.tsx adatok újratöltése
      }
    } catch (e) { alert('Hiba történt.'); }
    finally { setIsSubmitting(false); }
  };

  // 4. Kérelem elbírálása (Vezetői akció)
  const handleDecision = async (targetEmail: string, action: 'approve' | 'reject') => {
    const text = action === 'approve' ? 'Befogadod a tagot a klubba?' : 'Biztosan elutasítod a jelentkezést?';
    if (!window.confirm(text)) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/clubs/handle-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmail, action })
      });
      if (res.ok) {
        alert(action === 'approve' ? '✅ Tag sikeresen felvéve!' : '❌ Jelentkezés elutasítva.');
        loadPendingMembers();
        fetchData();
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* KLUB HOZZÁRENDELÉSI KÁRTYA */}
      <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '24px', border: '1px solid #334155' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#f8fafc' }}>🛡️ Fotóklub tagság beállítása</h3>
        
        {/* ÁLLAPOTOK KEZELÉSE */}
        {user?.club_role === 'pending' ? (
          <div style={{ background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b40', padding: '15px', borderRadius: '12px', lineHeight: '1.5', marginBottom: '15px' }}>
            ⏳ Csatlakozási kérelem elküldve a(z) <b>{user.club_name}</b> klubhoz. <br/>
            A klub vezetőjének vagy helyettesének jóváhagyására várunk. Addig a belső felületek zárolva maradnak.
          </div>
        ) : user?.club_name ? (
          <div style={{ background: '#10b98115', color: '#10b981', border: '1px solid #10b98140', padding: '15px', borderRadius: '12px', marginBottom: '15px' }}>
            ✓ Aktív tagja vagy a(z) <b>{user.club_name}</b> fotóklubnak ({user.club_role === 'leader' ? 'Klubvezető' : user.club_role === 'deputy' ? 'Helyettes' : 'Klubtag'} rangban).
          </div>
        ) : (
          <div style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '15px' }}>
            Jelenleg nem tartozol egyetlen klubhoz sem. Válassz az alábbi, aktív vezetőséggel rendelkező klubok közül!
          </div>
        )}

        {/* KLUBVÁLASZTÓ LISTA (Csak ha nincs elfogadott vagy függőben lévő klubja) */}
        {!user?.club_name && user?.club_role !== 'pending' && (
          <>
            <select value={selectedClubId} onChange={e => setSelectedClubId(e.target.value)} style={inputStyle}>
              <option value="">-- Válassz fotóklubot --</option>
              {activeClubs.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
            <button onClick={handleJoinClub} disabled={isSubmitting} style={{ width: '100%', background: 'linear-gradient(135deg, #38bdf8, #0284c7)', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
              Csatlakozási kérelem elküldése ✉️
            </button>
          </>
        )}
      </div>

      {/* KLUBVEZETŐI JÓVÁHAGYÓ PANEL (Csak vezetőknek ugrik fel) */}
      {isLeader && (
        <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '24px', border: '1px solid #10b981', boxShadow: '0 10px 30px rgba(16,185,129,0.1)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#10b981' }}>👑 Tagfelvételi Kérelmek ({user.club_name})</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0' }}>Az alábbi fotósok szeretnének csatlakozni a klubodhoz. Az elbírálás után azonnali hozzáférést kapnak.</p>
          
          {pendingMembers.length === 0 ? (
            <div style={{ padding: '15px', background: '#0f172a', borderRadius: '12px', color: '#64748b', textAlign: 'center' }}>Nincs függőben lévő jelentkezés.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingMembers.map(m => (
                <div key={m.email} style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <strong style={{ color: 'white', display: 'block' }}>{m.name}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{m.email}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleDecision(m.email, 'approve')} style={{ background: '#10b981', color: '#0f172a', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Befogadás ✓</button>
                    <button onClick={() => handleDecision(m.email, 'reject')} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef444440', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Elutasítás</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
