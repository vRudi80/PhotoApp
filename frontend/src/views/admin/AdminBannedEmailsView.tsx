import React, { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL } from '../../utils/constants';
import { Ban, UserCheck, Search, ShieldAlert, Trash2 } from 'lucide-react';

interface BannedEmailRow {
  email: string;
  banned_at: string;
}

// 🎯 KÖZPONTI AUTH FEJLÉC GENERÁTOR ADMINISZTRÁCIÓS VÉGPONTOKHOZ
const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('photoAppToken');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

export default function AdminBannedEmailsView() {
  const [bannedList, setBannedList] = useState<BannedEmailRow[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputStyle = { width: '100%', padding: '10px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'var(--text-title)', borderRadius: '6px', boxSizing: 'border-box' as const, outline: 'none' };

  // Tiltólista szinkronizálása a háttérrel
  const loadBannedEmails = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/banned-emails`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setBannedList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Nem sikerült betölteni a tiltólistát", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBannedEmails();
  }, []);

  // Szűrési és kereső motor
  const filteredList = useMemo(() => {
    return bannedList.filter(item => 
      item.email.toLowerCase().includes(searchTerm.toLowerCase().trim())
    );
  }, [bannedList, searchTerm]);

  // Új tiltás rögzítése
  const handleAddBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) return alert("Kérlek, érvényes e-mail címet adj meg!");

    if (!window.confirm(`Biztosan ki szeretnéd tiltani a(z) ${newEmail} címet? Ha létezik aktív profilja, az összes személyes adata azonnal törlődik a GDPR szerint!`)) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/banned-emails`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email: newEmail.trim() })
      });

      if (res.ok) {
        alert("Fiók sikeresen feketelistára téve!");
        setNewEmail('');
        loadBannedEmails();
      } else {
        const err = await res.json();
        alert(`Hiba: ${err.error}`);
      }
    } catch (error) {
      alert("Hálózati hiba történt.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tiltás feloldása (Unban)
  const handleRemoveBan = async (email: string) => {
    if (!window.confirm(`Biztosan feloldod a(z) ${email} cím kitiltását? Ezután újra regisztrálhat az oldalra.`)) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/banned-emails/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (res.ok) {
        alert("Kitiltás sikeresen feloldva!");
        loadBannedEmails();
      } else {
        alert("Nem sikerült feloldani a kitiltást.");
      }
    } catch (error) {
      alert("Hálózati hiba.");
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* CÍMSOR ÉS ÖSSZESÍTŐ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '2rem', margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Ban size={28} /> Rendszerszintű Tiltólista
        </h2>
        <span style={{ fontSize: '0.85rem', padding: '4px 12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '100px', fontWeight: 'bold', border: '1px solid rgba(239,68,68,0.2)' }}>
          {bannedList.length} letiltott cím
        </span>
      </div>

      {/* REAKTÍV LÉTREHOZÓ PANEL */}
      <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid var(--border-main)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 15px 0', color: 'var(--text-title)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={18} color="#ef4444" /> Új e-mail cím feketelistára tétele
        </h3>
        
        <form onSubmit={handleAddBan} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px' }}>
            <input 
              type="email" 
              placeholder="Például: rosszakaró@gmail.com" 
              value={newEmail} 
              onChange={e => setNewEmail(e.target.value)} 
              style={inputStyle}
              disabled={isSubmitting}
            />
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ background: isSubmitting ? 'var(--border-main)' : '#ef4444', color: 'white', border: 'none', padding: '10px 22px', borderRadius: '6px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 'bold', transition: 'background 0.2s' }}
          >
            {isSubmitting ? 'Zárolás...' : 'Végleges Kitiltás'}
          </button>
        </form>
      </div>

      {/* KERESŐ SÁV */}
      <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-main)', marginBottom: '15px', alignItems: 'center', gap: '10px' }}>
        <Search size={16} color="var(--text-muted)" />
        <input 
          type="text" 
          placeholder="Keresés a letiltott e-mail címek között..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ ...inputStyle, border: 'none', padding: 0, backgroundColor: 'transparent' }}
        />
      </div>

      {/* TILTOTTAK TÁBLÁZATA */}
      <div style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-main)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-main)', color: 'var(--text-body)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <th style={{ padding: '15px', borderBottom: '1px solid var(--border-main)' }}>Letiltott Fiók</th>
              <th style={{ padding: '15px', borderBottom: '1px solid var(--border-main)' }}>Tiltás Időpontja</th>
              <th style={{ padding: '15px', borderBottom: '1px solid var(--border-main)', textAlign: 'right' }}>Művelet</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Adatbázis szinkronizálása...</td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincs letiltott cím a listában.</td>
              </tr>
            ) : (
              filteredList.map((item, index) => (
                <tr key={item.email} style={{ borderBottom: '1px solid var(--border-main)', background: index % 2 === 0 ? 'transparent' : 'var(--bg-main)' }}>
                  <td style={{ padding: '15px', fontWeight: 'bold', color: 'var(--text-title)' }}>{item.email}</td>
                  <td style={{ padding: '15px', color: 'var(--text-body)' }}>{item.banned_at}</td>
                  <td style={{ padding: '15px', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleRemoveBan(item.email)}
                      style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'all 0.1s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; e.currentTarget.style.color = '#10b981'; }}
                    >
                      <UserCheck size={12} /> Tiltás Feloldása
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
