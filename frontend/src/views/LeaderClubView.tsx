import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../../utils/constants';

interface LeaderClubViewProps {
  userEmail: string;
}

export default function LeaderClubView({ userEmail }: LeaderClubViewProps) {
  const [clubData, setClubData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'roster' | 'admin'>('roster');
  const [loading, setLoading] = useState(true);

  // Fizetés állapota
  const [paymentModalUser, setPaymentModalUser] = useState<any | null>(null);
  const [payYear, setPayYear] = useState(new Date().getFullYear());
  const [payFee, setPayFee] = useState(12000);
  const [payPaid, setPayPaid] = useState(12000);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  const loadClubAndAdminRecords = async () => {
    try {
      const resData = await fetch(`${BACKEND_URL}/api/my-club?userEmail=${userEmail}`);
      if (resData.ok) {
        const d = await resData.json();
        setClubData(d.club);
        
        const resAdmin = await fetch(`${BACKEND_URL}/api/my-club/admin-records?clubId=${d.club.id}&userEmail=${userEmail}`);
        if (resAdmin.ok) {
          const adminData = await resAdmin.json();
          setMembers(adminData.members || []);
          setPayments(adminData.payments || []);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadClubAndAdminRecords(); }, [userEmail]);

  const handleLogPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/api/my-club/member/log-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId: clubData.id,
          leaderEmail: userEmail,
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
    } catch (e) { alert("Hiba!"); }
  };

  if (loading) return <div style={{ color: 'white', padding: '20px' }}>⏳ Naplók betöltése...</div>;
  if (!clubData) return <div style={{ color: '#ef4444', padding: '20px' }}>❌ Nincs klubvezetői jogosultságod.</div>;

  return (
    <div style={{ padding: '20px', color: 'white', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#f59e0b' }}>🏰 {clubData.name} – Pénzügyi és Tagnyilvántartás</h2>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
        <button onClick={() => setActiveTab('roster')} style={{ padding: '10px 20px', background: activeTab === 'roster' ? '#38bdf8' : 'transparent', color: activeTab === 'roster' ? '#0f172a' : 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>👥 Aktív Tagok</button>
        <button onClick={() => setActiveTab('admin')} style={{ padding: '10px 20px', background: activeTab === 'admin' ? '#f59e0b' : 'transparent', color: activeTab === 'admin' ? '#0f172a' : 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>💼 Teljes Éves Tagdíj Könyv</button>
      </div>

      {/* TÁBLÁZAT */}
      <div style={{ overflowX: 'auto', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#0f172a', color: '#94a3b8', fontSize: '0.85rem' }}>
              <th style={{ padding: '12px' }}>Tag / Státusz</th>
              <th style={{ padding: '12px' }}>Klubtagság Ideje</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Idei Egyenleg ({new Date().getFullYear()})</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Művelet</th>
            </tr>
          </thead>
          <tbody>
            {members
              .filter(m => activeTab === 'roster' ? m.is_currently_here === 1 : true)
              .map(m => {
                const currentYear = new Date().getFullYear();
                const userPay = payments.find(p => p.user_email === m.email && p.fiscal_year === currentYear);
                const debt = userPay ? Number(userPay.fee_amount) - Number(userPay.paid_amount) : 0;

                return (
                  <tr key={m.email} style={{ borderBottom: '1px solid #334155', opacity: m.is_currently_here === 1 ? 1 : 0.5 }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 'bold' }}>{m.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{m.email}</div>
                      <div style={{ marginTop: '4px' }}>
                        {m.is_currently_here === 1 ? (
                          <span style={{ background: '#10b98120', color: '#10b981', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>AKTÍV TAG</span>
                        ) : (
                          <span style={{ background: '#ef444420', color: '#f87171', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>KILÉPETT / EX-TAG</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                      <div>📅 Be: {m.membership_start || 'Ismeretlen'}</div>
                      {m.membership_end && <div style={{ color: '#f87171', marginTop: '2px' }}>❌ Ki: {m.membership_end}</div>}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {userPay ? (
                        <span style={{ color: debt > 0 ? '#fb923c' : '#10b981', fontWeight: 'bold' }}>
                          {userPay.paid_amount} / {userPay.fee_amount} Ft
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Nincs könyvelve</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button onClick={() => { setPaymentModalUser(m); if(userPay) { setPayFee(userPay.fee_amount); setPayPaid(userPay.paid_amount); setPayDate(userPay.payment_date || ''); } else { setPayFee(12000); setPayPaid(0); setPayDate(new Date().toISOString().split('T')[0]); } }} style={{ background: '#f59e0b', color: 'black', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>💵 Könyvelés</button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* KÖNYVELŐ MODAL */}
      {paymentModalUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ margin: 0, color: '#f59e0b' }}>Tagdíj Rögzítése</h3>
            <div style={{ fontSize: '0.85rem' }}>Tag: <b>{paymentModalUser.name}</b></div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Előírt Éves Tagdíj (Ft):</label>
              <input type="number" value={payFee} onChange={e => setPayFee(Number(e.target.value))} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '6px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Befizetett Összeg (Ft):</label>
              <input type="number" value={payPaid} onChange={e => setPayPaid(Number(e.target.value))} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '6px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Adózási / Fiskális Év:</label>
              <input type="number" value={payYear} onChange={e => setPayYear(Number(e.target.value))} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '6px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Befizetés Napja:</label>
              <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '6px' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" onClick={() => setPaymentModalUser(null)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #475569', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>Mégse</button>
              <button type="button" onClick={handleLogPaymentSubmit} style={{ padding: '8px 16px', background: '#10b981', color: 'black', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Mentés</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
