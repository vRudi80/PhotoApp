import { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/constants';

// A FIAP hivatalos követelményei (NFIAP -> EFIAP/p)
const FIAP_LEVELS = [
  { id: 'NFIAP', name: 'Novice FIAP', req: { acceptances: 25, countries: 5, works: 10 }, color: '#ec4899' }, // Rózsaszín
  { id: 'AFIAP', name: 'Artist FIAP', req: { acceptances: 75, countries: 15, works: 20 }, color: '#10b981' }, // Zöld
  { id: 'EFIAP', name: 'Excellence FIAP', req: { acceptances: 200, countries: 20, works: 40 }, color: '#ef4444' }, // Piros
  { id: 'EFIAP/b', name: 'Excellence Bronze', req: { acceptances: 400, countries: 25, works: 80 }, color: '#b45309' }, // Bronz
  { id: 'EFIAP/s', name: 'Excellence Silver', req: { acceptances: 600, countries: 30, works: 130 }, color: '#94a3b8' }, // Ezüst
  { id: 'EFIAP/g', name: 'Excellence Gold', req: { acceptances: 900, countries: 35, works: 200 }, color: '#eab308' }, // Arany
  { id: 'EFIAP/p', name: 'Excellence Platinum', req: { acceptances: 1200, countries: 40, works: 300 }, color: '#334155' } // Platina
];

export default function FiapProgressView({ user }: { user: any }) {
  const [stats, setStats] = useState({ acceptances: 0, countries: 0, works: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/fiap-progress?userEmail=${user.email}`);
        if (res.ok) setStats(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProgress();
  }, [user.email]);

  // Kiszámoljuk, mi a jelenlegi szintje, és mi a következő cél
  let currentLevel = null;
  let nextLevel = FIAP_LEVELS[0];

  for (let i = 0; i < FIAP_LEVELS.length; i++) {
    const lvl = FIAP_LEVELS[i];
    if (stats.acceptances >= lvl.req.acceptances && stats.countries >= lvl.req.countries && stats.works >= lvl.req.works) {
      currentLevel = lvl;
      nextLevel = FIAP_LEVELS[i + 1] || null; // Ha már platina, nincs feljebb ebben a nézetben
    } else {
      break;
    }
  }

  // Progress Bar komponens (hogy ne ismételjük a kódot)
  const ProgressBar = ({ label, current, required, color }: any) => {
    const percent = Math.min(100, Math.round((current / required) * 100));
    const isCompleted = current >= required;
    
    return (
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 'bold' }}>
          <span>{label}</span>
          <span style={{ color: isCompleted ? '#10b981' : '#f8fafc' }}>
            {current} / {required} {isCompleted && '✅'}
          </span>
        </div>
        <div style={{ width: '100%', height: '12px', background: '#334155', borderRadius: '100px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${percent}%`, background: isCompleted ? '#10b981' : color, transition: 'width 1s ease-in-out' }}></div>
        </div>
      </div>
    );
  };

  if (isLoading) return <div style={{ color: '#60a5fa', textAlign: 'center', padding: '2rem' }}>FIAP statisztikák számolása...</div>;

  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px', color: '#60a5fa' }}>
        <span style={{ fontSize: '2.5rem' }}>🏅</span> FIAP Minősítés Követő
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '30px' }}>
        Kövesd nyomon automatikusan, hogyan haladsz a hivatalos Nemzetközi Fotóművészeti Szövetség (FIAP) minősítési rendszereiben! A rendszer a rögzített elfogadásaid alapján számol.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
        
        {/* Jelenlegi státusz kártya */}
        <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '30px', borderRadius: '16px', border: `2px solid ${currentLevel ? currentLevel.color : '#334155'}`, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '1rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '10px' }}>Jelenlegi Minősítésed</div>
          <div style={{ fontSize: '3rem', fontWeight: '900', color: currentLevel ? currentLevel.color : '#cbd5e1', marginBottom: '10px' }}>
            {currentLevel ? currentLevel.id : 'Még nincs'}
          </div>
          <div style={{ fontSize: '1.2rem', color: '#f8fafc' }}>
            {currentLevel ? currentLevel.name : 'Vágj bele a szalonozásba!'}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '30px' }}>
            <div style={{ background: '#1e293b', padding: '10px 15px', borderRadius: '8px', border: '1px solid #475569' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#38bdf8' }}>{stats.acceptances}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Elfogadás</div>
            </div>
            <div style={{ background: '#1e293b', padding: '10px 15px', borderRadius: '8px', border: '1px solid #475569' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#a78bfa' }}>{stats.countries}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Ország</div>
            </div>
            <div style={{ background: '#1e293b', padding: '10px 15px', borderRadius: '8px', border: '1px solid #475569' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f472b6' }}>{stats.works}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Mű (Kép)</div>
            </div>
          </div>
        </div>

        {/* Következő cél kártya */}
        {nextLevel ? (
          <div style={{ background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '1rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px' }}>Következő Cél: <span style={{ color: nextLevel.color, fontWeight: 'bold' }}>{nextLevel.id}</span></div>
            
            <ProgressBar label="Összes Elfogadás" current={stats.acceptances} required={nextLevel.req.acceptances} color="#38bdf8" />
            <ProgressBar label="Különböző Országok" current={stats.countries} required={nextLevel.req.countries} color="#a78bfa" />
            <ProgressBar label="Különböző Művek" current={stats.works} required={nextLevel.req.works} color="#f472b6" />

            <div style={{ marginTop: '20px', padding: '15px', background: '#0f172a', borderRadius: '8px', fontSize: '0.85rem', color: '#94a3b8', borderLeft: `3px solid ${nextLevel.color}` }}>
              💡 <b>Tipp:</b> A szabályzat alapján két sikeres minősítés kérelme között legalább egy évnek kell eltelnie.
            </div>
          </div>
        ) : (
          <div style={{ background: 'linear-gradient(135deg, #10b981, #047857)', padding: '30px', borderRadius: '16px', color: 'white', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🏆</div>
            <h3 style={{ fontSize: '1.5rem', margin: '0 0 10px 0' }}>Minden szintet elértél!</h3>
            <p style={{ opacity: 0.9 }}>Gratulálunk! Elérted a Platina fokozatot. A Gyémánt és Mester fokozatok kérelmezéséhez egyedi portfólió benyújtása szükséges a FIAP felületén.</p>
          </div>
        )}

      </div>
    </div>
  );
}
