import React, { useState } from 'react';
import { BACKEND_URL } from '../utils/constants';

interface PackagesViewProps {
  user: any;
}

export default function PackagesView({ user }: PackagesViewProps) {
  const [isLoading, setIsLoading] = useState(false);

  // BIZTONSÁGI JAVÍTÁS: Ha a user prémium, de még nem szinkronizált le a szintje, akkor alapból 1-es.
  let premiumLevel = user?.premiumLevel || user?.premium_level || 0;
  if ((user?.isPremium || user?.is_premium) && premiumLevel === 0) {
    premiumLevel = 1;
  }

  const handleSubscribe = async (tier: 'basic' | 'pro') => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email, tier })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      alert('Hiba történt a fizetés indításakor.');
    } finally {
      setIsLoading(false);
    }
  };

  const Feature = ({ text }: { text: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', color: '#cbd5e1' }}>
      <span style={{ color: '#10b981' }}>✔️</span> {text}
    </div>
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '2.5rem', textAlign: 'center', color: '#f8fafc', marginBottom: '10px' }}>Válaszd ki a számodra megfelelő csomagot</h2>
      <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '1.1rem', marginBottom: '40px' }}>Aktiválj Prémium fiókot, hogy korlátlanul élvezhesd a platform összes funkcióját!</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', justifyContent: 'center' }}>
        
        {/* ALAP CSOMAG */}
        <div style={{ flex: '1 1 300px', background: '#1e293b', border: premiumLevel === 1 ? '2px solid #38bdf8' : '1px solid #334155', borderRadius: '16px', padding: '30px', position: 'relative' }}>
          {premiumLevel === 1 && <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#38bdf8', color: '#0f172a', padding: '4px 15px', borderRadius: '100px', fontWeight: 'bold', fontSize: '0.8rem' }}>JELENLEGI CSOMAGOD</div>}
          <h3 style={{ fontSize: '1.5rem', color: '#38bdf8', marginTop: 0 }}>Alap Prémium</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white', marginBottom: '5px' }}>1 000 Ft <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 'normal' }}>/ hó</span></div>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '25px', minHeight: '40px' }}>Tökéletes választás feltörekvő fotósoknak és hobbistáknak.</p>
          
          <div style={{ marginBottom: '30px' }}>
            <Feature text="1 GB Portfólió Tárhely (kb. 300 kép)" />
            <Feature text="Mesterséges Intelligencia Zsűri (AI)" />
            <Feature text="FIAP/MAFOSZ Statisztikák, szintek" />
            <Feature text="FIAP excel export" />
            <Feature text="Nemzetközi,- és hazai szalonok információi" />
          </div>

          {premiumLevel === 1 ? (
            <button disabled style={{ width: '100%', padding: '12px', background: '#0f172a', color: '#94a3b8', borderRadius: '8px', border: '1px solid #334155', fontWeight: 'bold' }}>Aktív</button>
          ) : (
            <button onClick={() => handleSubscribe('basic')} disabled={isLoading} style={{ width: '100%', padding: '12px', background: '#38bdf8', color: '#0f172a', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>{isLoading ? '⏳...' : premiumLevel === 2 ? 'Váltás erre' : 'Előfizetés (7 nap ingyen)'}</button>
          )}
        </div>

        {/* PRO CSOMAG */}
        <div style={{ flex: '1 1 300px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: premiumLevel === 2 ? '2px solid #f59e0b' : '2px solid #6366f1', borderRadius: '16px', padding: '30px', position: 'relative', boxShadow: '0 10px 30px rgba(99, 102, 241, 0.2)' }}>
          {premiumLevel === 2 ? (
            <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#f59e0b', color: '#0f172a', padding: '4px 15px', borderRadius: '100px', fontWeight: 'bold', fontSize: '0.8rem' }}>JELENLEGI CSOMAGOD</div>
          ) : (
            <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#6366f1', color: 'white', padding: '4px 15px', borderRadius: '100px', fontWeight: 'bold', fontSize: '0.8rem' }}>PROFI FOTÓSOKNAK</div>
          )}
          
          <h3 style={{ fontSize: '1.5rem', color: '#818cf8', marginTop: 0 }}>Pro Prémium</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white', marginBottom: '5px' }}>2 490 Ft <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 'normal' }}>/ hó</span></div>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '25px', minHeight: '40px' }}>Hatalmas tárhely aktívan szalonozó fotóművészek számára.</p>
          
          <div style={{ marginBottom: '30px' }}>
            <Feature text="5 GB Portfólió Tárhely (kb. 1500 kép)" />
            <Feature text="Minden funkció az Alap csomagból" />
            <Feature text="Nincs aggodalom a betelt tárhely miatt" />
            <Feature text="Kiemelt technikai támogatás" />
          </div>

          {premiumLevel === 2 ? (
            <button disabled style={{ width: '100%', padding: '12px', background: '#0f172a', color: '#94a3b8', borderRadius: '8px', border: '1px solid #334155', fontWeight: 'bold' }}>Aktív</button>
          ) : (
            <button onClick={() => handleSubscribe('pro')} disabled={isLoading} style={{ width: '100%', padding: '12px', background: '#6366f1', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)' }}>{isLoading ? '⏳...' : 'Bővítés (Upgrade)'}</button>
          )}
        </div>

      </div>
    </div>
  );
}
