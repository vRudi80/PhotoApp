import React, { useState, useEffect } from 'react';
import { BACKEND_URL, ADMIN_EMAIL } from '../../utils/constants';

// Letisztult Lucide ikonok az admin panelhez
import { 
  ShieldAlert, 
  User, 
  Coins, 
  FileText, 
  Sparkles, 
  Search, 
  History, 
  X, 
  ArrowUpRight, 
  ArrowDownLeft,
  Users
} from 'lucide-react';

export default function AdminPointsDashboard() {
  // Űrlap állapotok
  const [targetEmail, setTargetEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [reasonHu, setReasonHu] = useState('');
  const [reasonEn, setReasonEn] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Táblázat és kereső állapotok
  const [usersList, setUsersList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Kiválasztott felhasználó történeti ablak (Modal) állapotok
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [userLedger, setUserLedger] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const inputStyle = { width: '100%', padding: '12px', marginBottom: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '10px', boxSizing: 'border-box' as const, fontSize: '0.92rem', outline: 'none' };

  const getAdminAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
    const token = localStorage.getItem('photoAppToken');
    return {
      'Authorization': `Bearer ${token}`,
      ...extraHeaders
    };
  };

  // 📥 1. Felhasználók listájának betöltése a táblázatba
  const fetchUsersPoints = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users-points`, {
        headers: getAdminAuthHeaders()
      });
      if (res.ok) {
        setUsersList(await res.json());
      }
    } catch (e) {
      console.error("Nem sikerült betölteni az admin listát:", e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsersPoints();
  }, []);

  // 📜 2. Egy adott felhasználó tranzakciós naplójának betöltése
  const fetchUserLedger = async (email: string, name: string) => {
    setSelectedUserEmail(email);
    setSelectedUserName(name);
    setLoadingLedger(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/user-ledger?targetEmail=${encodeURIComponent(email)}`, {
        headers: getAdminAuthHeaders()
      });
      if (res.ok) {
        setUserLedger(await res.json());
      }
    } catch (e) {
      console.error("Nem sikerült betölteni a user naplót:", e);
    } finally {
      setLoadingLedger(false);
    }
  };

  // ⚡ 3. Pontmódosítás beküldése
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmail.trim() || !amount) return alert("Az email és a pontmennyiség megadása kötelező!");
    
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount === 0) return alert("Kérlek valós, nullától eltérő számot adj meg!");

    if (!window.confirm(`Biztosan módosítani akarod ${targetEmail.trim()} egyenlegét ${numAmount > 0 ? '+' : ''}${numAmount} ponttal?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/adjust-points`, {
        method: 'POST',
        headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          targetEmail: targetEmail.trim().toLowerCase(),
          amount: numAmount,
          reasonHu: reasonHu.trim() || undefined,
          reasonEn: reasonEn.trim() || undefined
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Sikeres adminisztrátori pontmódosítás!");
        setTargetEmail('');
        setAmount('');
        setReasonHu('');
        setReasonEn('');
        fetchUsersPoints(); // 🔄 Azonnal frissítjük a lenti táblázatot is a friss egyenlegekkel!
      } else {
        alert(data.error || "Hiba történt a mentés során.");
      }
    } catch (error) {
      alert("Hálózati hiba lépett fel.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔍 Szűrés a keresősáv alapján (Név vagy Email egyezés)
  const filteredUsers = usersList.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', width: '100%', boxSizing: 'border-box', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* 👑 PANEL A: KÉZI PONT JÓVÁHAGYÁS / LEVONÁS FORM */}
      <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #fbbf24', boxShadow: '0 10px 30px rgba(251,191,36,0.02)' }}>
        <h3 style={{ margin: '0 0 5px 0', color: '#fbbf24', fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={20} /> Adminisztrátori Pontmódosítás (God Mode)
        </h3>
        <p style={{ margin: '0 0 20px 0', color: '#94a3b8', fontSize: '0.85rem' }}>
          Manuális egyenlegkorrekció. Pozitív szám hozzáad, negatív szám levon. A megadott indoklás azonnal bekerül a felhasználó személyes pontnaplójába.
        </p>

        <form onSubmit={handleAdminSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}><User size={12} /> Felhasználó Email Címe</label>
              <input type="email" value={targetEmail} onChange={e => setTargetEmail(e.target.value)} placeholder="pelda.user@gmail.com" style={inputStyle} disabled={isSubmitting} required />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}><Coins size={12} /> Pontváltozás Mennyisége</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="pl. 100 vagy -50" style={inputStyle} disabled={isSubmitting} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}><FileText size={12} /> Magyar indoklás (Pontnapló bejegyzés)</label>
              <input type="text" value={reasonHu} onChange={e => setReasonHu(e.target.value)} placeholder="pl. Aranyecset különdíj jutalom ✨" style={inputStyle} disabled={isSubmitting} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}><FileText size={12} /> Angol indoklás (English log version)</label>
              <input type="text" value={reasonEn} onChange={e => setReasonEn(e.target.value)} placeholder="e.g. Special award bonus ✨" style={inputStyle} disabled={isSubmitting} />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting || !targetEmail.trim() || !amount} style={{ width: '100%', background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', marginTop: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Sparkles size={14} /> {isSubmitting ? 'Tranzakció könyvelése... ⏳' : 'Művelet Végrehajtása és Élesítése ⚡'}
          </button>
        </form>
      </div>

      {/* 📊 PANEL B: FELHASZNÁLÓI ADATTÁR & AKTUÁLIS EGYENLEGEK TÁBLÁZATA */}
      <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="#38bdf8" /> Közösségi Pontegyenlegek Nyilvántartása
            </h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Kattints a sor végén lévő ikonra a felhasználó részletes tranzakciós múltjának megtekintéséhez.</p>
          </div>

          {/* Élő kereső sáv */}
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <input type="text" placeholder="Keresés névre vagy emailre..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '8px 12px 8px 36px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }} />
            <Search size={14} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>

        {/* Görgethető Adattáblázat */}
        <div style={{ overflowX: 'auto', border: '1px solid #223147', borderRadius: '12px', background: '#0f172a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#131b2e', borderBottom: '1px solid #223147', color: '#94a3b8' }}>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Fotós neve</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>E-mail cím</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold', textAlign: 'center' }}>Aktuális egyenleg</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold', textAlign: 'center' }}>Műveletek</th>
              </tr>
            </thead>
            <tbody>
              {loadingUsers && usersList.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Felhasználói bázis elemzése... ⏳</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincs a keresési feltételnek megfelelő fotós.</td></tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.email} style={{ borderBottom: '1px solid #1e293b', transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1e293b80'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '12px 16px', color: '#f8fafc', fontWeight: '600' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>👤</div>
                        )}
                        <span>{u.name || 'Anonim Tag'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace' }}>{u.email}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#fbbf24', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                      {u.points_balance} p
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button 
                        onClick={() => { fetchUserLedger(u.email, u.name || 'Anonim Tag'); }}
                        style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.78rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', transition: 'all 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(56,189,248,0.1)'}
                      >
                        <History size={12} /> Napló megnyitása
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📜 MODAL ABLAK: HISTÓRIKUS TRANZAKCIÓS NAPLÓ (KIZÁRÓLAG HA VAN KIVÁLASZTOTT USER) */}
      {selectedUserEmail && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(9,13,22,0.85)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', padding: '24px', position: 'relative', boxSizing: 'border-box', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            
            {/* Bezáró X gomb */}
            <button onClick={() => setSelectedUserEmail(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'var(--text-body)', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </button>

            <h3 style={{ color: 'var(--text-title)', margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} color="#fbbf24" /> Ponttörténeti Napló
            </h3>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontFamily: 'monospace', marginBottom: '20px', borderBottom: '1px dashed var(--border-main)', paddingBottom: '10px' }}>
              Tag: <span style={{ color: '#fff', fontWeight: 'bold' }}>{selectedUserName}</span> ({selectedUserEmail})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loadingLedger ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '30px' }}>Könyvelési tételek beolvasása... ⏳</div>
              ) : userLedger.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '30px' }}>Ezen a számlán még nem történt pontmozgás.</div>
              ) : (
                userLedger.map((tx) => {
                  const isPositive = tx.points_changed > 0;
                  return (
                    <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyValue: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-main)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div style={{ background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: isPositive ? '#10b981' : '#ef4444', padding: '6px', borderRadius: '50%', display: 'flex', flexShrink: 0 }}>
                          {isPositive ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ color: 'var(--text-title)', fontSize: '0.85rem', fontWeight: '600', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tx.description_hu || 'Adminisztrátori korrekció'}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', marginTop: '1.5px' }}>{tx.date} • Új egyenleg: {tx.balance_after}p</span>
                        </div>
                      </div>
                      <span style={{ color: isPositive ? '#10b981' : '#ef4444', fontWeight: '800', fontSize: '0.9rem', fontFamily: 'monospace', marginLeft: '10px', flexShrink: 0 }}>
                        {isPositive ? '+' : ''}{tx.points_changed}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
