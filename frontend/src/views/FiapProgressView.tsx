import { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL, ADMIN_EMAIL } from '../utils/constants'; // JAVÍTÁS: Importáljuk az ADMIN_EMAIL-t!
import { getImageUrl } from '../utils/helpers';
import PremiumPaywall from './PremiumPaywall'; 
import { getFlagImageUrl } from '../utils/helpers';

const FIAP_LEVELS = [
  { id: 'NFIAP', name: 'Novice FIAP', req: { acceptances: 25, countries: 5, works: 10 }, color: '#ec4899' },
  { id: 'AFIAP', name: 'Artist FIAP', req: { acceptances: 75, countries: 15, works: 20 }, color: '#10b981' },
  { id: 'EFIAP', name: 'Excellence FIAP', req: { acceptances: 200, countries: 20, works: 40 }, color: '#ef4444' },
  { id: 'EFIAP/b', name: 'Excellence Bronze', req: { acceptances: 400, countries: 25, works: 80 }, color: '#b45309' },
  { id: 'EFIAP/s', name: 'Excellence Silver', req: { acceptances: 600, countries: 30, works: 130 }, color: '#94a3b8' },
  { id: 'EFIAP/g', name: 'Excellence Gold', req: { acceptances: 900, countries: 35, works: 200 }, color: '#eab308' },
  { id: 'EFIAP/p', name: 'Excellence Platinum', req: { acceptances: 1200, countries: 40, works: 300 }, color: '#334155' }
];

// JAVÍTÁS: Kiegészítjük a Props interface-t, hogy fogadhassa az összes usert is
interface FiapProgressViewProps {
  user: any;
  allUsers?: any[]; // Az App.tsx-ben átadott lista az adminoknak
}

export default function FiapProgressView({ user, allUsers = [] }: FiapProgressViewProps) {
  const [stats, setStats] = useState({ acceptances: 0, countries: 0, works: 0 });
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');

  // --- ÚJ JAVÍTÁS: Kijelölt email állapot, alapból a saját (bejelentkezett) usere ---
  const [selectedEmail, setSelectedEmail] = useState(user?.email || '');

  // Ha esetleg megváltozik a propból kapott user (pl. kijelentkezik / bejelentkezik)
  useEffect(() => {
    if (user?.email) setSelectedEmail(user.email);
  }, [user]);

  useEffect(() => {
    if (!user || !user.is_premium) {
      setIsLoading(false);
      return;
    }

    const fetchProgress = async () => {
      setIsLoading(true); // Újratöltéskor mutassunk egy kis töltés ikont
      try {
        // JAVÍTÁS: Most már a selectedEmail változót küldjük a backendnek!
        const [resStats, resEntries] = await Promise.all([
          fetch(`${BACKEND_URL}/api/fiap-progress?userEmail=${selectedEmail}`),
          fetch(`${BACKEND_URL}/api/fiap-entries?userEmail=${selectedEmail}`)
        ]);

        if (resStats.ok) setStats(await resStats.json());
        if (resEntries.ok) setEntries(await resEntries.json());
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProgress();
  }, [user, selectedEmail]); // A lekérdezés lefut, ha a selectedEmail megváltozik!

  const filteredEntries = useMemo(() => {
    if (!searchTerm) return entries;
    const lowerTerm = searchTerm.toLowerCase();
    
    return entries.filter(entry => 
      (entry.photo_title && entry.photo_title.toLowerCase().includes(lowerTerm)) ||
      (entry.salon_name && entry.salon_name.toLowerCase().includes(lowerTerm)) ||
      (entry.country && entry.country.toLowerCase().includes(lowerTerm)) ||
      (entry.fiap_number && entry.fiap_number.toLowerCase().includes(lowerTerm)) ||
      (entry.award && entry.award.toLowerCase().includes(lowerTerm))
    );
  }, [entries, searchTerm]);

  if (!user || !user.is_premium) {
    return (
      <div>
        <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px', color: '#60a5fa' }}>
          <span style={{ fontSize: '2.5rem' }}>🏅</span> FIAP Minősítés Követő
        </h2>
        <PremiumPaywall user={user} />
      </div>
    );
  }

  let currentLevel = null;
  let nextLevel = FIAP_LEVELS[0];

  for (let i = 0; i < FIAP_LEVELS.length; i++) {
    const lvl = FIAP_LEVELS[i];
    if (stats.acceptances >= lvl.req.acceptances && stats.countries >= lvl.req.countries && stats.works >= lvl.req.works) {
      currentLevel = lvl;
      nextLevel = FIAP_LEVELS[i + 1] || null;
    } else {
      break;
    }
  }

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

  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px', color: '#60a5fa' }}>
        <span style={{ fontSize: '2.5rem' }}>🏅</span> FIAP Minősítés Követő
      </h2>

      {/* --- ÚJ JAVÍTÁS: ADMIN LEGÖRDÜLŐ MENÜ (Ha ő az admin) --- */}
      {user.email === ADMIN_EMAIL && allUsers.length > 0 && (
        <div style={{ marginBottom: '30px', padding: '20px', background: '#1e293b', borderRadius: '12px', border: '2px solid #f59e0b', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>👑</span>
            <label style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '1.1rem' }}>
              Admin Nézet: Válassz felhasználót az adatok ellenőrzéséhez
            </label>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '15px', marginTop: 0 }}>
            Itt megtekintheted a migrált adatokat bármelyik fotós nevében anélkül, hogy be kellene jelentkezned a jelszavukkal.
          </p>
          <select 
            value={selectedEmail} 
            onChange={(e) => setSelectedEmail(e.target.value)}
            style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #475569', fontSize: '1rem', cursor: 'pointer', outline: 'none' }}
          >
            <option value={user.email}>-- Saját adataim megtekintése --</option>
            {allUsers
              .filter(u => u.email !== user.email)
              // Név szerinti ábécé sorrendbe rendezve
              .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
              .map(u => (
                <option key={u.email} value={u.email}>
                  {u.name} ({u.email})
                </option>
            ))}
          </select>
        </div>
      )}

      {/* --- Ha kiválasztott valakit, aki épp töltődik --- */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#60a5fa' }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px', animation: 'spin 2s linear infinite' }}>⏳</div>
          <h3>FIAP statisztikák betöltése...</h3>
        </div>
      ) : (
        <>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '30px' }}>
            {selectedEmail === user.email 
              ? 'Kövesd nyomon automatikusan, hogyan haladsz a hivatalos Nemzetközi Fotóművészeti Szövetség (FIAP) minősítési rendszereiben!' 
              : `Jelenleg ${allUsers.find(u => u.email === selectedEmail)?.name || selectedEmail} adatait vizsgálod.`}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '40px' }}>
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

            {nextLevel ? (
              <div style={{ background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '1rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px' }}>Következő Cél: <span style={{ color: nextLevel.color, fontWeight: 'bold' }}>{nextLevel.id}</span></div>
                <ProgressBar label="Összes Elfogadás" current={stats.acceptances} required={nextLevel.req.acceptances} color="#38bdf8" />
                <ProgressBar label="Különböző Országok" current={stats.countries} required={nextLevel.req.countries} color="#a78bfa" />
                <ProgressBar label="Különböző Művek" current={stats.works} required={nextLevel.req.works} color="#f472b6" />
              </div>
            ) : (
              <div style={{ background: 'linear-gradient(135deg, #10b981, #047857)', padding: '30px', borderRadius: '16px', color: 'white', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🏆</div>
                <h3 style={{ fontSize: '1.5rem', margin: '0 0 10px 0' }}>Minden szintet elértél!</h3>
                <p style={{ opacity: 0.9 }}>Gratulálunk! Elérted a Platina fokozatot. A Gyémánt és Mester fokozatokhoz egyedi portfólió benyújtása szükséges a FIAP felületén.</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #334155', paddingBottom: '15px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h3 style={{ fontSize: '1.5rem', color: '#f8fafc', margin: '0 0 5px 0' }}>
                Tételes FIAP Eredmények (Részletes lista)
              </h3>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                {searchTerm ? `Keresési találat: ${filteredEntries.length} / ${entries.length} sor` : `Összesen: ${entries.length} sor`}
              </div>
            </div>
            
            <input 
              type="text" 
              placeholder="🔍 Keresés (cím, szalon, ország, FIAP szám, díj)..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: 'white', minWidth: '320px', outline: 'none' }}
            />
          </div>

          {entries.length === 0 ? (
            <div style={{ padding: '20px', color: '#94a3b8', textAlign: 'center', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
              Még nincsenek hitelesített FIAP eredmények ehhez a felhasználóhoz.
            </div>
          ) : filteredEntries.length === 0 ? (
            <div style={{ padding: '40px', color: '#94a3b8', textAlign: 'center', background: '#0f172a', borderRadius: '12px', border: '1px dashed #334155' }}>
              Nincs a keresésnek megfelelő találat.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                <thead>
                  <tr style={{ background: '#0f172a', borderBottom: '2px solid #334155' }}>
                    <th style={{ padding: '15px', color: '#94a3b8', fontWeight: 'bold' }}>Kép címe</th>
                    <th style={{ padding: '15px', color: '#94a3b8', fontWeight: 'bold' }}>Szalon neve</th>
                    <th style={{ padding: '15px', color: '#94a3b8', fontWeight: 'bold' }}>Ország</th>
                    <th style={{ padding: '15px', color: '#94a3b8', fontWeight: 'bold' }}>FIAP szám</th>
                    <th style={{ padding: '15px', color: '#94a3b8', fontWeight: 'bold' }}>Eredmény</th>
                    <th style={{ padding: '15px', color: '#94a3b8', fontWeight: 'bold', textAlign: 'center' }}>Digitális</th>
                    <th style={{ padding: '15px', color: '#94a3b8', fontWeight: 'bold', textAlign: 'center' }}>Print</th>
                    <th style={{ padding: '15px', color: '#94a3b8', fontWeight: 'bold', textAlign: 'center' }}>Fotó</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry, idx) => {
                    const isAcceptance = entry.award.toLowerCase() === 'acceptance';
                    const isOnline = entry.submission_type === 'online';
                    
                  return (
                      <tr key={idx} style={{ borderBottom: '1px solid #334155', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#0f172a'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '12px 15px', color: '#f8fafc', fontWeight: 'bold' }}>{entry.photo_title}</td>
                        <td style={{ padding: '12px 15px', color: '#cbd5e1' }}>{entry.salon_name}</td>
                        <td style={{ padding: '12px 15px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {getFlagImageUrl(entry.country_code) ? (
                              <img 
                                src={getFlagImageUrl(entry.country_code)} 
                                alt={entry.country || 'Zászló'} 
                                style={{ width: '20px', height: 'auto', borderRadius: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }} 
                              />
                            ) : (
                              '🏳️'
                            )}
                            <span>{entry.country}</span>
                          </span>
                        </td>
                        <td style={{ padding: '12px 15px', color: '#38bdf8', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{entry.fiap_number}</td>
                        <td style={{ padding: '12px 15px', color: isAcceptance ? '#10b981' : '#f59e0b', fontWeight: isAcceptance ? 'normal' : 'bold' }}>
                          {entry.award}
                        </td>
                        <td style={{ padding: '12px 15px', textAlign: 'center', color: isOnline ? '#10b981' : '#475569' }}>
                          {isOnline ? '✔️' : '-'}
                        </td>
                        <td style={{ padding: '12px 15px', textAlign: 'center', color: !isOnline ? '#10b981' : '#475569' }}>
                          {!isOnline ? '✔️' : '-'}
                        </td>
                        <td style={{ padding: '8px 15px', textAlign: 'center' }}>
                          <img 
                            src={getImageUrl(entry.drive_file_id, entry.file_url)} 
                            alt={entry.photo_title} 
                            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #475569' }} 
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
