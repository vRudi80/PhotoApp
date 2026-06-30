import React, { useState, useEffect, useMemo } from 'react';
import { getImageUrl } from '../utils/helpers';

interface LeaderClubViewProps {
  user: any; // Az App.tsx-ből érkező bejelentkezett felhasználó objektum
  BACKEND_URL: string; // Az API kiszolgáló elérése
}

export default function LeaderClubView({ user, BACKEND_URL }: LeaderClubViewProps) {
  const [clubData, setClubData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  // 🎯 KIBŐVÍTVE: Új 'report' fül hozzáadva az állapothoz
  const [activeTab, setActiveTab] = useState<'roster' | 'admin' | 'report' | 'settings'>('roster');
  const [loading, setLoading] = useState(true);

  // ✏️ Klub név és Logó állapotok
  const [clubNameInput, setClubNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // 📅 Dátumszerkesztési állapotok
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [startDateEdit, setStartDateEdit] = useState('');
  const [endDateEdit, setEndDateEdit] = useState('');

  // 💵 Tagdíj könyvelés állapotok
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

  // 🎯 DINAMIKUS MÁTRIX MOTOR: Kigyűjti az összes egyedi tárgyévet növekvő sorrendben
  const uniqueFiscalYears = useMemo(() => {
    const years = payments.map(p => p.fiscal_year);
    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) {
      years.push(currentYear); // Biztosítjuk, hogy az idei év mindig látszódjon
    }
    return Array.from(new Set(years)).sort((a, b) => a - b);
  }, [payments]);

  // 🎯 ÉVES ÖSSZESÍTŐK SZÁMÍTÁSA: Kiszámolja a teljes oszlopösszegeket a táblázat aljára
  const yearlyColumnTotals = useMemo(() => {
    const totals: { [year: number]: number } = {};
    uniqueFiscalYears.forEach(year => {
      totals[year] = payments
        .filter(p => p.fiscal_year === year)
        .reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
    });
    return totals;
  }, [uniqueFiscalYears, payments]);

  // ✏️ Klub nevének mentése
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
    } catch (e) { alert('Hiba a név mentésekor!'); }
    finally { setIsSavingName(false); }
  };

  // 📸 Logó kezelése
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return alert('Kérlek, válassz ki egy fáljt előbb!');
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
      }
    } catch (e) { alert('Hiba a logó feltöltésekor!'); }
    finally { setIsUploadingLogo(false); }
  };

  // 📅 Tagsági dátumok inline mentése
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
        const errData = await res.json().catch(() => ({}));
        alert(`❌ Mentési hiba: ${errData.error || 'Szerver hiba'}`);
      }
    } catch (e) { alert("Hálózati hiba."); }
  };

  // 💵 Tagdíj befizetés elküldése
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
      }
    } catch (e) { alert("Hiba a könyvelés során!"); }
  };

  const currentEffectiveLogo = logoFile ? logoPreview : getImageUrl(clubData?.drive_logo_id, clubData?.logo_url);

  if (loading) return <div style={{ color: 'white', padding: '20px' }}>⏳ Adatok és nyilvántartások egyeztetése...</div>;
  if (!clubData) return <div style={{ color: '#ef4444', padding: '20px' }}>❌ Nincs klubvezetői jogosultságod vagy nem tartozol fotóklubhoz.</div>;

  return (
    <div style={{ padding: '20px', color: 'white', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#f59e0b' }}>🏰 {clubData.name} – Vezetői Adminisztráció</h2>

      {/* 🧭 Navigációs fülek (Most már 4 füllel!) */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '10px', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('roster')} style={{ padding: '10px 20px', background: activeTab === 'roster' ? '#38bdf8' : 'transparent', color: activeTab === 'roster' ? '#0f172a' : 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>👥 Aktív Tagok</button>
        <button onClick={() => setActiveTab('admin')} style={{ padding: '10px 20px', background: activeTab === 'admin' ? '#f59e0b' : 'transparent', color: activeTab === 'admin' ? '#0f172a' : 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>💼 Tagnyilvántartás & Tagdíjak</button>
        <button onClick={() => setActiveTab('report')} style={{ padding: '10px 20px', background: activeTab === 'report' ? '#10b981' : 'transparent', color: activeTab === 'report' ? '#0f172a' : 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>📊 Pénzügyi Kimutatás</button>
        <button onClick={() => setActiveTab('settings')} style={{ padding: '10px 20px', background: activeTab === 'settings' ? '#a78bfa' : 'transparent', color: activeTab === 'settings' ? '#0f172a' : 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>⚙️ Klub Beállítások</button>
      </div>

      {/* 👥 1. FÜL: AKTÍV TAGLISTA */}
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

      {/* 💼 2. FÜL: RÉSZLETES TAGNYILVÁNTARTÁS ÉS TAGDÍJKÖNYV */}
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
                const userHistoryPayments = payments.filter(p => p.user_email === m.email);

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

                      {userHistoryPayments.length > 0 && (
                        <details style={{ marginTop: '12px', width: '100%', maxWidth: '320px' }}>
                          <summary style={{ fontSize: '0.78rem', color: '#38bdf8', cursor: 'pointer', outline: 'none', fontWeight: 'bold' }}>🕒 Tranzakciós Előzmények ({userHistoryPayments.length})</summary>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '6px', background: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid #233047' }}>
                            {userHistoryPayments.map(p => (
                              <div key={p.id} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                                <span>📅 {p.fiscal_year}. év:</span>
                                <span style={{ fontWeight: 'bold', color: (Number(p.fee_amount) - Number(p.paid_amount)) <= 0 ? '#10b981' : '#f97316' }}>{p.paid_amount} / {p.fee_amount} Ft</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
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
                          {m.membership_end && <div style={{ color: '#f87171', marginTop: '2px' }}>❌ Ki: <b>{m.membership_end}</b></div>}
                        </div>
                      )}
                    </td>
                    
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {userPay ? (
                        <span style={{ color: debt > 0 ? '#fb923c' : '#10b981', fontWeight: 'bold' }}>{userPay.paid_amount} / {userPay.fee_amount} Ft</span>
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
                          <button onClick={() => { setEditingEmail(m.email); setStartDateEdit(m.membership_start === 'Ismeretlen' ? '' : m.membership_start || ''); setEndDateEdit(m.membership_end || ''); }} style={{ background: '#3b82f620', color: '#60a5fa', border: '1px solid #334155', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Dátumok ✏️</button>
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

      {/* 📊 3. FÜL: PÉNZÜGYI KIMUTATÁS MATRIX (ÚJ SZEKCIÓ!) */}
      {activeTab === 'report' && (
        <div style={{ overflowX: 'auto', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#94a3b8', fontSize: '0.85rem' }}>
                <th style={{ padding: '15px', minWidth: '220px' }}>Klubtag Neve / Email címe</th>
                {uniqueFiscalYears.map(year => (
                  <th key={year} style={{ padding: '15px', textAlign: 'center', minWidth: '110px', color: '#fbbf24' }}>
                    📅 {year}. Év
                  </th>
                ))}
                <th style={{ padding: '15px', textAlign: 'right', minWidth: '120px', color: '#38bdf8' }}>Tag Összesen</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => {
                let memberTotalRowSum = 0;

                return (
                  <tr key={m.email} style={{ borderBottom: '1px solid #334155', background: m.is_currently_here === 1 ? 'transparent' : 'rgba(239, 68, 68, 0.02)' }}>
                    {/* Tag neve és státusza */}
                    <td style={{ padding: '12px 15px' }}>
                      <div style={{ fontWeight: 'bold', color: m.is_currently_here === 1 ? '#f8fafc' : '#64748b' }}>
                        {m.name} {m.is_currently_here !== 1 && <span style={{ fontSize: '0.7rem', color: '#ef4444', fontStyle: 'italic' }}>(Kilépett)</span>}
                      </div>
                      <small style={{ color: '#475569', fontSize: '0.75rem', fontFamily: 'monospace' }}>{m.email}</small>
                    </td>

                    {/* Éves cellák értékei */}
                    {uniqueFiscalYears.map(year => {
                      const matchPayment = payments.find(p => p.user_email === m.email && p.fiscal_year === year);
                      const paidVal = matchPayment ? Number(matchPayment.paid_amount || 0) : 0;
                      memberTotalRowSum += paidVal;

                      return (
                        <td key={year} style={{ padding: '12px 15px', textAlign: 'center', fontSize: '0.95rem', fontWeight: paidVal > 0 ? 'bold' : 'normal', color: paidVal > 0 ? '#10b981' : '#475569' }}>
                          {paidVal > 0 ? `${paidVal.toLocaleString()} Ft` : '-'}
                        </td>
                      );
                    })}

                    {/* Sor végi összesen (egyéni) */}
                    <td style={{ padding: '12px 15px', textAlign: 'right', fontWeight: 'bold', color: '#38bdf8', fontSize: '1rem' }}>
                      {memberTotalRowSum > 0 ? `${memberTotalRowSum.toLocaleString()} Ft` : '0 Ft'}
                    </td>
                  </tr>
                );
              })}

              {/* 📊 ALSÓ ÖSSZESÍTŐ SOR (TOTALS FOOTER) */}
              <tr style={{ background: '#0f172a', borderTop: '2px solid #475569', fontWeight: '900', fontSize: '1.05rem' }}>
                <td style={{ padding: '16px 15px', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📈 Éves Befizetések Összesen:
                </td>
                {uniqueFiscalYears.map(year => {
                  const colTotal = yearlyColumnTotals[year] || 0;
                  return (
                    <td key={year} style={{ padding: '16px 15px', textAlign: 'center', color: '#10b981' }}>
                      {colTotal > 0 ? `${colTotal.toLocaleString()} Ft` : '0 Ft'}
                    </td>
                  );
                })}
                {/* Minden év és minden tag összesített nagy egyenlege */}
                <td style={{ padding: '16px 15px', textAlign: 'right', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.05)' }}>
                  {Object.values(yearlyColumnTotals).reduce((a, b) => a + b, 0).toLocaleString()} Ft
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ⚙️ 4. FÜL: KLUB BEÁLLÍTÁSOK */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '600px' }}>
          <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#cbd5e1', fontSize: '1.1rem' }}>✏️ Klub nevének megváltoztatása</h4>
            <input type="text" value={clubNameInput} onChange={e => setClubNameInput(e.target.value)} style={inputStyle} disabled={isSavingName} />
            <button onClick={handleNameSave} disabled={isSavingName} style={{ background: '#10b981', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold' }}>
              {isSavingName ? 'Mentés...' : 'Név frissítése ✔'}
            </button>
          </div>

          <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155' }}>
            <h4 style={{ margin: '0 0 4px 0', color: '#cbd5e1', fontSize: '1.1rem' }}>📸 Hivatalos Klub Logó</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px', marginTop: '15px' }}>
              <div style={{ width: '90px', height: '90px', backgroundColor: '#0f172a', borderRadius: '12px', border: '2px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {currentEffectiveLogo ? <img src={currentEffectiveLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span>🛡️</span>}
              </div>
              <input type="file" accept="image/*" onChange={handleLogoChange} disabled={isUploadingLogo} />
            </div>
            {logoFile && (
              <button onClick={handleLogoUpload} disabled={isUploadingLogo} style={{ background: '#a78bfa', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold' }}>
                {isUploadingLogo ? 'Feltöltés...' : 'Új logó mentése 🚀'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 💵 FELUGRÓ KÖNYVELŐ MODAL */}
      {paymentModalUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(4px)' }}>
          <form onSubmit={handleLogPaymentSubmit} style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155', width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '1.4rem' }}>💰 Tagdíj Rögzítése</h3>
            <div style={{ fontSize: '0.95rem' }}>Felhasználó: <b style={{ color: '#38bdf8' }}>{paymentModalUser.name}</b></div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>Előírt Éves Tagdíj (Ft):</label>
              <input type="number" value={payFee} onChange={e => setPayFee(Number(e.target.value))} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '6px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>Befizetett Összeg (Ft):</label>
              <input type="number" value={payPaid} onChange={e => setPayPaid(Number(e.target.value))} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '6px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>Adózási / Fiskális Év:</label>
              <input type="number" value={payYear} onChange={e => setPayYear(Number(e.target.value))} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '6px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>Befizetés Napja:</label>
              <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '6px' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" onClick={() => setPaymentModalUser(null)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #475569', color: 'white', borderRadius: '6px', fontWeight: 'bold' }}>Mégse</button>
              <button type="submit" style={{ padding: '10px 20px', background: '#10b981', color: '#0f172a', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>Mentés</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
