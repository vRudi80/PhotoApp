import React, { useState, useEffect } from 'react';
import { getImageUrl } from '../utils/helpers';

interface LeaderClubViewProps {
  user: any; // Az App.tsx-ből érkező bejelentkezett felhasználó objektum
  BACKEND_URL: string; // Az API kiszolgáló elérése
}

export default function LeaderClubView({ user, BACKEND_URL }: LeaderClubViewProps) {
  const [clubData, setClubData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'roster' | 'admin' | 'settings'>('roster');
  const [loading, setLoading] = useState(true);

  // ✏️ Klub név és Logó állapotok (Beállítások fülhöz)
  const [clubNameInput, setClubNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // 📅 Dátumszerkesztési állapotok (Tagnyilvántartás fülhöz)
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [startDateEdit, setStartDateEdit] = useState('');
  const [endDateEdit, setEndDateEdit] = useState('');

  // 💵 Tagdíj könyvelés állapotok (Modal ablakhoz)
  const [paymentModalUser, setPaymentModalUser] = useState<any | null>(null);
  const [payYear, setPayYear] = useState(new Date().getFullYear());
  const [payFee, setPayFee] = useState(12000);
  const [payPaid, setPayPaid] = useState(12000);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  const inputStyle = { width: '100%', padding: '12px', marginBottom: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '8px', boxSizing: 'border-box' as const, outline: 'none', fontSize: '0.95rem' };

  // 🔄 Adatletöltő motor
  const loadClubAndAdminRecords = async () => {
    if (!user?.email) return;
    try {
      const resData = await fetch(`${BACKEND_URL}/api/my-club?userEmail=${user.email}`);
      if (resData.ok) {
        const d = await resData.json();
        setClubData(d.club);
        setClubNameInput(d.club?.name || '');
        
        const resAdmin = await fetch(`${BACKEND_URL}/api/my-club/admin-records?clubId=${d.club.id}&userEmail=${user.email}`);
        if (resAdmin.ok) {
          const adminData = await resAdmin.json();
          setMembers(adminData.members || []);
          setPayments(adminData.payments || []);
        }
      }
    } catch (e) { 
      console.error("Hiba az adatok letöltésekor:", e); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    loadClubAndAdminRecords(); 
  }, [user?.email, BACKEND_URL]);

  // ✏️ 1. Funkció: Klub nevének mentése
  const handleNameSave = async () => {
    if (!clubNameInput.trim()) return alert('A klub neve nem lehet üres!');
    setIsSavingName(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/my-club/update-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId: clubData.id, newClubName: clubNameInput.trim(), userEmail: user.email })
      });
      if (res.ok) {
        alert('Klub neve sikeresen frissítve! 🎉');
        loadClubAndAdminRecords();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Módosítás elutasítva (${res.status}): ${err.error || 'Ismeretlen hiba'}`);
      }
    } catch (e) { alert('Hálózati hiba a név mentésekor!'); }
    finally { setIsSavingName(false); }
  };

  // 📸 2. Funkció: Logó kezelése
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return alert('Kérlek, válassz ki egy fájlt előbb!');
    setIsUploadingLogo(true);
    const formData = new FormData();
    formData.append('logo', logoFile);
    formData.append('clubId', clubData.id);
    formData.append('userEmail', user.email);

    try {
      const res = await fetch(`${BACKEND_URL}/api/my-club/logo`, { method: 'POST', body: formData });
      if (res.ok) {
        alert('Klub logó sikeresen feltöltve a Google Drive-ra! 📸');
        setLogoFile(null);
        loadClubAndAdminRecords();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Logó feltöltés sikertelen (${res.status}): ${err.error || 'Szerver hiba'}`);
      }
    } catch (e) { alert('Hálózati hiba a logó feltöltésekor!'); }
    finally { setIsUploadingLogo(false); }
  };

  // 📅 3. Funkció: Tagsági dátumok inline mentése (HIBAKERESŐVEL MEGERŐSÍTVE)
  const handleSaveDates = async (targetEmail: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/my-club/member/update-dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId: clubData.id,
          leaderEmail: user.email,
          targetEmail,
          membershipStart: startDateEdit || null,
          membershipEnd: endDateEdit || null
        })
      });
      
      if (res.ok) {
        setEditingEmail(null);
        loadClubAndAdminRecords();
      } else {
        // 🎯 HA A RENDELES SZERVER HIBÁT DOB, EZ AZ ÁG AZONNAL KIÍRJA A PONTOS OKOT!
        const errData = await res.json().catch(() => ({}));
        alert(`❌ Mentési hiba (Szerver kód: ${res.status}):\n${errData.error || 'A végpont nem található vagy az adatbázis elutasította a dátum formátumot.'}`);
      }
    } catch (e) { 
      alert("💥 Kritikus hálózati hiba: A szerver nem elérhető vagy megszakadt a kapcsolat."); 
    }
  };

  // 💵 4. Funkció: Tagdíj befizetés elküldése
  const handleLogPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/api/my-club/member/log-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId: clubData.id,
          leaderEmail: user.email,
          targetEmail: paymentModalUser.email,
          fiscalYear: payYear,
          feeAmount: payFee,
          paidAmount: payPaid,
          paymentDate: payDate
        })
      });
      if (res.ok) {
        setPaymentModalUser(null);
        loadClubAndAdminRecords();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Könyvelési hiba (${res.status}): ${err.error || 'Szerver elutasítás'}`);
      }
    } catch (e) { alert("Hiba a könyvelés során!"); }
  };

  const currentEffectiveLogo = logoFile ? logoPreview : getImageUrl(clubData?.drive_logo_id, clubData?.logo_url);

  if (loading) return <div style={{ color: 'white', padding: '20px' }}>⏳ Adatok és nyilvántartások egyeztetése...</div>;
  if (!clubData) return <div style={{ color: '#ef4444', padding: '20px' }}>❌ Nincs klubvezetői jogosultságod vagy nem tartozol fotóklubhoz.</div>;

  return (
    <div style={{ padding: '20px', color: 'white', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#f59e0b' }}>🏰 {clubData.name} – Vezetői Adminisztráció</h2>

      {/* Navigációs fülek */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '10px', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('roster')} style={{ padding: '10px 20px', background: activeTab === 'roster' ? '#38bdf8' : 'transparent', color: activeTab === 'roster' ? '#0f172a' : 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>👥 Aktív Tagok</button>
        <button onClick={() => setActiveTab('admin')} style={{ padding: '10px 20px', background: activeTab === 'admin' ? '#f59e0b' : 'transparent', color: activeTab === 'admin' ? '#0f172a' : 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>💼 Tagnyilvántartás & Tagdíjak</button>
        <button onClick={() => setActiveTab('settings')} style={{ padding: '10px 20px', background: activeTab === 'settings' ? '#a78bfa' : 'transparent', color: activeTab === 'settings' ? '#0f172a' : 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>⚙️ Klub Beállítások</button>
      </div>

      {/* 1. FÜL: AKTÍV TAGLISTA */}
      {activeTab === 'roster' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {members.filter(m => m.is_currently_here === 1).map(m => (
            <div key={m.email} style={{ background: '#1e293b', padding: '15px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #334155' }}>
              <div>
                <strong style={{ fontSize: '1.1rem', color: '#f8fafc' }}>{m.name}</strong>
                <span style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: '10px' }}>({m.email})</span>
              </div>
              <span style={{ background: '#0f172a', padding: '4px 14px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#38bdf8', border: '1px solid #223147' }}>{m.club_role || 'tag'}</span>
            </div>
          ))}
        </div>
      )}

      {/* 2. FÜL: TAGNYILVÁNTARTÁS ÉS TAGDÍJAK */}
      {activeTab === 'admin' && (
        <div style={{ overflowX: 'auto', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px' }}>Tag / Státusz</th>
                <th style={{ padding: '12px' }}>Klubtagság Ideje</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Idei Egyenleg ({new Date().getFullYear()})</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Műveletek</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => {
                const isEditing = editingEmail === m.email;
                const currentYear = new Date().getFullYear();
                const userPay = payments.find(p => p.user_email === m.email && p.fiscal_year === currentYear);
                const debt = userPay ? Number(userPay.fee_amount) - Number(userPay.paid_amount) : 0;

                return (
                  <tr key={m.email} style={{ borderBottom: '1px solid #334155', opacity: m.is_currently_here === 1 ? 1 : 0.6 }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#f8fafc' }}>{m.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{m.email}</div>
                      <div style={{ marginTop: '4px' }}>
                        {m.is_currently_here === 1 ? (
                          <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>AKTÍV TAG</span>
                        ) : (
                          <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>KILÉPETT / EX-TAG</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>🏠 {m.shipping_address || 'Nincs postázási cím megadva'}</div>
                    </td>
                    
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <input type="date" value={startDateEdit} onChange={e => setStartDateEdit(e.target.value)} style={{ padding: '4px 8px', background: '#0f172a', color: 'white', border: '1px solid #475569', borderRadius: '4px', fontSize: '0.8rem' }} />
                          <input type="date" value={endDateEdit} onChange={e => setEndDateEdit(e.target.value)} style={{ padding: '4px 8px', background: '#0f172a', color: 'white', border: '1px solid #475569', borderRadius: '4px', fontSize: '0.8rem' }} />
                        </div>
                      ) : (
                        <div style={{ color: '#cbd5e1', lineHeight: '1.4' }}>
                          <div>📅 Be: <b>{m.membership_start || 'Ismeretlen'}</b></div>
                          {m.membership_end && <div style={{ color: '#f87171', marginTop: '4px' }}>❌ Ki: <b>{m.membership_end}</b></div>}
                        </div>
                      )}
                    </td>
                    
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {userPay ? (
                        <span style={{ color: debt > 0 ? '#fb923c' : '#10b981', fontWeight: 'bold' }}>
                          {userPay.paid_amount} / {userPay.fee_amount} Ft
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>Nincs rögzített adat</span>
                      )}
                    </td>
                    
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSaveDates(m.email)} style={{ background: '#10b981', color: 'black', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Mentés</button>
                            <button onClick={() => setEditingEmail(null)} style={{ background: '#475569', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Mégse</button>
                          </>
                        ) : (
                          <button onClick={() => { setEditingEmail(m.email); setStartDateEdit(m.membership_start === 'Ismeretlen' ? '' : m.membership_start || ''); setEndDateEdit(m.membership_end || ''); }} style={{ background: '#3b82f620', color: '#60a5fa', border: '1px solid #3b82f640', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Dátumok ✏️</button>
                        )}
                        <button onClick={() => { setPaymentModalUser(m); if(userPay) { setPayFee(userPay.fee_amount); setPayPaid(userPay.paid_amount); setPayDate(userPay.payment_date || ''); } else { setPayFee(12000); setPayPaid(0); setPayDate(new Date().toISOString().split('T')[0]); } }} style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>💵 Könyvelés</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ⚙️ 3. FÜL: KLUB BEÁLLÍTÁSOK */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '600px' }}>
          
          <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#cbd5e1', fontSize: '1.1rem' }}>✏️ Klub nevének megváltoztatása</h4>
            <input type="text" value={clubNameInput} onChange={e => setClubNameInput(e.target.value)} style={inputStyle} placeholder="Fotóklub neve..." disabled={isSavingName} />
            <button onClick={handleNameSave} disabled={isSavingName} style={{ background: '#10b981', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: isSavingName ? 'not-allowed' : 'pointer' }}>
              {isSavingName ? 'Mentés...' : 'Név frissítése ✔'}
            </button>
          </div>

          <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155' }}>
            <h4 style={{ margin: '0 0 4px 0', color: '#cbd5e1', fontSize: '1.1rem' }}>📸 Hivatalos Klub Logó</h4>
            <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '0.82rem' }}>A logó a Google Drive tárhelyedre kerül feltöltésre, és megjelenik a dicsőségcsarnokban is.</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ width: '90px', height: '90px', backgroundColor: '#0f172a', borderRadius: '12px', border: '2px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {currentEffectiveLogo ? (
                  <img src={currentEffectiveLogo} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '2rem' }}>🛡️</span>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleLogoChange} style={{ fontSize: '0.9rem', color: '#94a3b8' }} disabled={isUploadingLogo} />
            </div>

            {logoFile && (
              <button onClick={handleLogoUpload} disabled={isUploadingLogo} style={{ background: '#a78bfa', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: isUploadingLogo ? 'not-allowed' : 'pointer' }}>
                {isUploadingLogo ? 'Feltöltés...' : 'Új logó feltöltése és mentése 🚀'}
              </button>
            )}
          </div>

        </div>
      )}

      {/* 💵 FELUGRÓ KÖNYVELŐ MODAL */}
      {paymentModalUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(4px)' }}>
          <form onSubmit={handleLogPaymentSubmit} style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155', width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '1.4rem' }}>💰 Tagdíj Rögzítése</h3>
            <div style={{ fontSize: '0.95rem', color: '#e2e8f0' }}>Felhasználó: <b style={{ color: '#38bdf8' }}>{paymentModalUser.name}</b></div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>Előírt Éves Tagdíj (Ft):</label>
              <input type="number" value={payFee} onChange={e => setPayFee(Number(e.target.value))} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '6px', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>Befizetett Összeg (Ft):</label>
              <input type="number" value={payPaid} onChange={e => setPayPaid(Number(e.target.value))} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '6px', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>Adózási / Fiskális Év:</label>
              <input type="number" value={payYear} onChange={e => setPayYear(Number(e.target.value))} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '6px', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>Befizetés Napja:</label>
              <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '6px', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" onClick={() => setPaymentModalUser(null)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #475569', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Mégse</button>
              <button type="submit" style={{ padding: '10px 20px', background: '#10b981', color: '#0f172a', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Mentés</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
