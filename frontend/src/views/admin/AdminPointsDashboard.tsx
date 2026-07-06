import React, { useState } from 'react';
import { BACKEND_URL, ADMIN_EMAIL } from '../../utils/constants';

// Letisztult Lucide ikonok az admin panelhez
import { ShieldAlert, User, Coins, FileText, Sparkles } from 'lucide-react';

interface AdminPointsDashboardProps {
  onSuccessNotification?: () => void; // Opcionális frissítő funkció
}

export default function AdminPointsDashboard({ onSuccessNotification }: AdminPointsDashboardProps) {
  const [targetEmail, setTargetEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [reasonHu, setReasonHu] = useState('');
  const [reasonEn, setReasonEn] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputStyle = { width: '100%', padding: '12px', marginBottom: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '10px', boxSizing: 'border-box' as const, fontSize: '0.92rem', outline: 'none' };

  const getAdminAuthHeaders = () => {
    const token = localStorage.getItem('photoAppToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

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
        headers: getAdminAdminAuthHeaders(),
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
        // Kiürítjük az űrlapot a következő művelethez
        setTargetEmail('');
        setAmount('');
        setReasonHu('');
        setReasonEn('');
        if (onSuccessNotification) onSuccessNotification();
      } else {
        alert(data.error || "Hiba történt a mentés során.");
      }
    } catch (error) {
      alert("Hálózati hiba lépett fel.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #fbbf24', boxShadow: '0 10px 30px rgba(251,191,36,0.05)', marginTop: '10px' }}>
      
      <h3 style={{ margin: '0 0 5px 0', color: '#fbbf24', fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ShieldAlert size={20} /> Adminisztrátori Pontmódosítás (God Mode)
      </h3>
      <p style={{ margin: '0 0 20px 0', color: '#94a3b8', fontSize: '0.85rem' }}>
        Főadminisztrátori jogkör. Manuálisan írhatsz jóvá vagy vonhatsz le pontokat bármelyik regisztrált felhasználótól. Pozitív szám (pl. <span style={{color:'#10b981', fontWeight:'bold'}}>50</span>) hozzáad, negatív szám (pl. <span style={{color:'#ef4444', fontWeight:'bold'}}>-30</span>) levon.
      </p>

      <form onSubmit={handleAdminSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '5px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}><User size={12} /> Felhasználó Email Címe</label>
            <input type="email" value={targetEmail} onChange={e => setTargetEmail(e.target.value)} placeholder="pelda.user@gmail.com" style={inputStyle} disabled={isSubmitting} required />
          </div>
          
          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}><Coins size={12} /> Pontváltozás Mennyisége</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="pl. 100 vagy -50" style={inputStyle} disabled={isSubmitting} required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}><FileText size={12} /> Magyar indoklás (Megjelenik a user pontnaplójában)</label>
            <input type="text" value={reasonHu} onChange={e => setReasonHu(e.target.value)} placeholder="pl. Aranyecset különdíj jutalom ✨" style={inputStyle} disabled={isSubmitting} />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}><FileText size={12} /> Angol indoklás (English version for logs)</label>
            <input type="text" value={reasonEn} onChange={e => setReasonEn(e.target.value)} placeholder="e.g. Special award bonus ✨" style={inputStyle} disabled={isSubmitting} />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting || !targetEmail.trim() || !amount}
          style={{ width: '100%', background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: (isSubmitting || !targetEmail.trim() || !amount) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', marginTop: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Sparkles size={14} /> {isSubmitting ? 'Tranzakció könyvelése... ⏳' : 'Művelet Végrehajtása és Naplózása ⚡'}
        </button>
      </form>

    </div>
  );
}
