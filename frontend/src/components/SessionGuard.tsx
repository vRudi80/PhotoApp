import { useEffect, useState, useCallback } from 'react';

interface SessionGuardProps {
  logoutUser: () => void; // A függvény, ami kijelentkezteti a usert (pl. setUser(null))
  timeoutMinutes?: number; // Mennyi idő után lépjen ki (alapértelmezés: 60 perc)
}

export default function SessionGuard({ logoutUser, timeoutMinutes = 60 }: SessionGuardProps) {
  const [showWarning, setShowWarning] = useState(false);
  
  // Időzítők milliszekundumban
  const SESSION_TIMEOUT = timeoutMinutes * 60 * 1000; 
  const WARNING_TIME = 5 * 60 * 1000; // 5 perccel a lejárat előtt szól

  const resetTimer = useCallback(() => {
    // Ha már kint van a figyelmeztetés, egy sima egérmozgás ne tüntesse el,
    // csak ha rákattint a "Maradok" gombra!
    if (showWarning) return; 

    // Töröljük az előző időzítőket
    const highestId = window.setTimeout(() => {
      for (let i = highestId; i >= 0; i--) {
        window.clearTimeout(i);
      }
    }, 0);

    // 1. Figyelmeztetés beállítása (pl. az 55. percben)
    setTimeout(() => {
      setShowWarning(true);
    }, SESSION_TIMEOUT - WARNING_TIME);

    // 2. Kíméletlen kiléptetés beállítása (a 60. percben)
    setTimeout(() => {
      logoutUser();
    }, SESSION_TIMEOUT);
    
  }, [showWarning, logoutUser, SESSION_TIMEOUT, WARNING_TIME]);

  useEffect(() => {
    // Figyeljük a felhasználó minden létező rezdülését
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    const handleActivity = () => resetTimer();
    
    events.forEach(event => window.addEventListener(event, handleActivity));
    resetTimer(); // Rendszer indítása

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [resetTimer]);

  if (!showWarning) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ background: '#1e293b', padding: '30px', borderRadius: '16px', border: '2px solid #f59e0b', textAlign: 'center', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)', animation: 'popIn 0.3s ease-out' }}>
        <div style={{ fontSize: '4rem', marginBottom: '15px' }}>⏳</div>
        <h3 style={{ color: '#f8fafc', margin: '0 0 10px 0', fontSize: '1.5rem' }}>Hamarosan lejár a munkameneted!</h3>
        <p style={{ color: '#94a3b8', marginBottom: '25px', lineHeight: '1.5' }}>
          Biztonsági okokból a rendszer automatikusan kilépteti az inaktív felhasználókat. Szeretnéd meghosszabbítani a munkamenetet?
        </p>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => { setShowWarning(false); resetTimer(); }} 
            style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'transform 0.1s' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Igen, maradok!
          </button>
          <button 
            onClick={logoutUser} 
            style={{ flex: 1, background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
          >
            Kijelentkezés
          </button>
        </div>
      </div>
      
      {/* Egy kis CSS animáció a felugró ablaknak */}
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
