import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/constants';

// Letisztult Lucide ikonok a bolthoz
import { 
  Coins, 
  ShoppingBag, 
  History, 
  RefreshCw, 
  Crown, 
  Award, 
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';

interface PointsWalletAndStoreProps {
  user: any;
  currentDbUser: any;
  refreshUserObj: () => void; // Függvény, amivel a főoldalon frissíteni tudod a bejelentkezett user adatait (hogy változzon a pontszáma)
}

export default function PointsWalletAndStore({ user, currentDbUser, refreshUserObj }: PointsWalletAndStoreProps) {
  const [ledger, setLedger] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [isBuying, setIsBuying] = useState<string | null>(null);

  const getLocalAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
    const token = localStorage.getItem('photoAppToken');
    return { 
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...extraHeaders 
    };
  };

  // 📜 1. A tranzakciós napló lekérése a backendről
  const fetchMyLedger = async () => {
    setLoadingLedger(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/store/my-ledger`, {
        headers: getLocalAuthHeaders()
      });
      if (res.ok) {
        setLedger(await res.json());
      }
    } catch (e) {
      console.error("Nem sikerült betölteni a pontnaplót:", e);
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      fetchMyLedger();
    }
  }, [user?.email, currentDbUser?.points_balance]);

  // 🛒 2. Vásárlási művelet kezelése (Joker csere vagy Prémium)
  const handlePurchase = async (endpoint: 'buy-swap' | 'buy-premium', itemKey: string) => {
    if (isBuying) return;
    setIsBuying(itemKey);

    try {
      const res = await fetch(`${BACKEND_URL}/api/store/${endpoint}`, {
        method: 'POST',
        headers: getLocalAuthHeaders({ 'Content-Type': 'application/json' })
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Sikeres vásárlás!");
        fetchMyLedger();   // Frissítjük a helyi tranzakciós listát
        refreshUserObj();  // 🔄 Kilőjük a szülő frissítést, hogy a profil fejlécében is átíródjon az egyenleg!
      } else {
        alert(data.error || "Hiba történt a vásárlás során.");
      }
    } catch (e) {
      alert("Hálózati hiba történt.");
    } finally {
      setIsBuying(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', width: '100%', boxSizing: 'border-box' }}>
      
      {/* FEJLÉC SZEKCIÓ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', p: '12px', borderRadius: '12px', color: '#0f172a', display: 'flex', padding: '12px' }}>
          <Coins size={28} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-title)', fontWeight: '800' }}>PhotAwesome Pontrendszer</h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>Gyűjts pontokat az aktivitásaiddal, és váltsd be őket prémium kiváltságokra!</p>
        </div>
      </div>

      {/* KÉTOSZLOPOS ELRENDEZÉS (TÁRCA + BOLT) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px', alignItems: 'start' }}>
        
        {/* 💳 BAL OLDAL: AKTUÁLIS EGYENLEG ÉS TRANZAKCIÓS MÚLT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Bento kártya: Aktuális egyenleg */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Elérhető egyenleged</span>
              <h3 style={{ margin: '5px 0 0 0', fontSize: '2.5rem', fontWeight: '900', color: '#fbbf24', fontFamily: 'monospace', lineHeight: '1' }}>
                {currentDbUser?.points_balance ?? 0} <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>PONT</span>
              </h3>
            </div>
            <div style={{ fontSize: '3rem', opacity: 0.15, color: '#fbbf24' }}>🪙</div>
          </div>

          {/* Bento kártya: Tranzakció történet */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={16} color="var(--text-muted)" /> Pontnapló (Utolsó mozgások)
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
              {loadingLedger && ledger.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>Könyvelés ellenőrzése...</div>
              ) : ledger.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>Még nem történt pontmozgás a számládon.</div>
              ) : (
                ledger.map((tx) => {
                  const isPositive = tx.points_changed > 0;
                  return (
                    <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-main)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div style={{ background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: isPositive ? '#10b981' : '#ef4444', padding: '6px', borderRadius: '50%', display: 'flex', flexShrink: 0 }}>
                          {isPositive ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ color: 'var(--text-title)', fontSize: '0.85rem', fontWeight: '600', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tx.description_hu}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', marginTop: '1px' }}>{tx.date} • Egyenleg: {tx.balance_after}p</span>
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

        {/* 🛍️ JOBB OLDAL: A DIGITÁLIS PONTBOLT (STORE) */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={18} color="#38bdf8" /> Elérhető Kiváltságok Boltja
          </h4>

          {/* 1. TERMÉK: Joker Csere */}
          <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-main)', borderRadius: '10px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '1.2rem' }}>🃏</span>
                <strong style={{ color: 'var(--text-title)', fontSize: '0.95rem' }}>1 db Joker Csere Kupon</strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>Lehetővé teszi, hogy lecseréld egy már beküldött képedet az aktív Aréna futamban.</p>
            </div>
            <button 
              onClick={() => handlePurchase('buy-swap', 'swap')}
              disabled={isBuying !== null || (currentDbUser?.points_balance ?? 0) < 50}
              style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.85rem', cursor: (isBuying !== null || (currentDbUser?.points_balance ?? 0) < 50) ? 'not-allowed' : 'pointer', opacity: (currentDbUser?.points_balance ?? 0) < 50 ? 0.5 : 1, transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '90px' }}
            >
              <span>{isBuying === 'swap' ? '⏳' : 'Beváltás'}</span>
              <span style={{ fontSize: '0.7rem', fontWeight: '800', marginTop: '2px', opacity: 0.8 }}>50 Pont</span>
            </button>
          </div>

          {/* 2. TERMÉK: 7 Nap Prémium */}
          <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-main)', borderRadius: '10px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Crown size={16} color="#fbbf24" fill="#fbbf24" />
                <strong style={{ color: 'var(--text-title)', fontSize: '0.95rem' }}>7 Napos Prémium Tagság</strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>Teljes hozzáférés a korlátlan AI képelemzésekhez, extra tárhelyhez és exkluzív toplistákhoz.</p>
            </div>
            <button 
              onClick={() => handlePurchase('buy-premium', 'premium')}
              disabled={isBuying !== null || (currentDbUser?.points_balance ?? 0) < 200}
              style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', color: '#0f172a', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.85rem', cursor: (isBuying !== null || (currentDbUser?.points_balance ?? 0) < 200) ? 'not-allowed' : 'pointer', opacity: (currentDbUser?.points_balance ?? 0) < 200 ? 0.5 : 1, transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '90px' }}
            >
              <span>{isBuying === 'premium' ? '⏳' : 'Beváltás'}</span>
              <span style={{ fontSize: '0.7rem', fontWeight: '800', marginTop: '2px', opacity: 0.8 }}>200 Pont</span>
            </button>
          </div>

          {/* REJTETT MARKETING SZEKCIÓ A BOLT ALJÁN */}
          <div style={{ borderTop: '1px dashed var(--border-main)', paddingTop: '15px', display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', fontSize: '0.78rem', fontWeight: 'bold' }}>
            <Sparkles size={14} />
            <span>Hamarosan újabb beváltási lehetőségek érkeznek (AI csomagok, egyedi profilkeretek)!</span>
          </div>

        </div>

      </div>

    </div>
  );
}
