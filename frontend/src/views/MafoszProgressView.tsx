import React, { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL, ADMIN_EMAIL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';
import PremiumPaywall from './PremiumPaywall';
import { getFlagImageUrl } from '../utils/helpers';

// Nyelvi kontextus aktiválása
import { useLanguage } from '../context/LanguageContext';

// 🎯 Behozzuk a téma környezetet a reaktív témakezeléshez
import { useTheme } from '../context/ThemeContext';

const MAFOSZ_LEVELS = [
  { id: 'A-MAFOSZ', name: 'MAFOSZ Fotóművésze', req: { acceptances: 70, works: 20, awards: 1 }, color: '#10b981' },
  { id: 'A-MAFOSZ/b', name: 'Kiváló Művész Bronz', req: { acceptances: 150, works: 30, awards: 3 }, color: '#b45309' },
  { id: 'A-MAFOSZ/s', name: 'Kiváló Művész Ezüst', req: { acceptances: 250, works: 40, awards: 5 }, color: '#94a3b8' },
  { id: 'A-MAFOSZ/g', name: 'Kiváló Művész Arany', req: { acceptances: 350, works: 50, awards: 7 }, color: '#eab308' },
  { id: 'A-MAFOSZ/p', name: 'Kiváló Művész Platina', req: { acceptances: 500, works: 60, awards: 10 }, color: '#334155' },
  { id: 'A-MAFOSZ/d1', name: 'Kiváló Művész Gyémánt', req: { acceptances: 500, works: 60, awards: 60 }, color: '#6366f1' }
];

interface MafoszProgressViewProps {
  user: any;
  allUsers?: any[]; 
}

// 🎯 KÖZPONTI AUTH FEJLÉC GENERÁTOR VÉDETT VÉGPONTOKHOZ
const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('photoAppToken');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

export default function MafoszProgressView({ user, allUsers = [] }: MafoszProgressViewProps) {
  const { t, lang } = useLanguage();
  const [stats, setStats] = useState({ acceptances: 0, works: 0, awards: 0 });
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(user?.email || '');

  // 🎯 BIZTONSÁGI VÉDŐHÁLÓ: Lekérjük az aktuális témát a reszponzív stílusokhoz
  let isLight = false;
  try {
    const themeContext = useTheme();
    if (themeContext) {
      isLight = themeContext.theme === 'light';
    }
  } catch (e) {}

  useEffect(() => {
    if (user?.email) setSelectedEmail(user.email);
  }, [user]);

  useEffect(() => {
    if (!user || !user.is_premium) {
      setIsLoading(false);
      return;
    }

    const fetchProgress = async () => {
      setIsLoading(true); 
      try {
        const [resStats, resEntries] = await Promise.all([
          fetch(`${BACKEND_URL}/api/mafosz-progress?userEmail=${selectedEmail}`, {
            headers: getAuthHeaders()
          }),
          fetch(`${BACKEND_URL}/api/mafosz-entries?userEmail=${selectedEmail}`, {
            headers: getAuthHeaders()
          })
        ]);

        if (resStats.ok) setStats(await resStats.json());
        if (resEntries.ok) setEntries(await resEntries.json());
      } catch (e) {
        console.error("Hiba a MAFOSZ adatok lekérésekor:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProgress();
  }, [user, selectedEmail]);

  const filteredEntries = useMemo(() => {
    if (!searchTerm) return entries;
    const lowerTerm = searchTerm.toLowerCase();
    
    return entries.filter(entry => 
      (entry.photo_title && entry.photo_title.toLowerCase().includes(lowerTerm)) ||
      (entry.salon_name && entry.salon_name.toLowerCase().includes(lowerTerm)) ||
      (entry.mafosz_number && entry.mafosz_number.toLowerCase().includes(lowerTerm)) ||
      (entry.award && entry.award.toLowerCase().includes(lowerTerm))
    );
  }, [entries, searchTerm]);

  if (!user || !user.is_premium) {
    return (
      <div>
        <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px', color: isLight ? 'var(--text-title)' : '#60a5fa' }}>
          <span style={{ fontSize: '2.5rem' }}>🏆</span> MAFOSZ Minősítés
        </h2>
        <PremiumPaywall user={user} />
      </div>
    );
  }

  let currentLevel = null;
  let nextLevel = MAFOSZ_LEVELS[0];

  for (let i = 0; i < MAFOSZ_LEVELS.length; i++) {
    const lvl = MAFOSZ_LEVELS[i];
    if (stats.acceptances >= lvl.req.acceptances && stats.works >= lvl.req.works && stats.awards >= lvl.req.awards) {
      currentLevel = lvl;
      nextLevel = MAFOSZ_LEVELS[i + 1] || null;
    } else {
      break;
    }
  }

  const ProgressBar = ({ label, current, required, color }: any) => {
    const percent = Math.min(100, Math.round((current / required) * 100));
    const isCompleted = current >= required;
    
    return (
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-body)', fontWeight: 'bold' }}>
          <span>{label}</span>
          <span style={{ color: isCompleted ? '#10b981' : 'var(--text-title)' }}>
            {current} / {required} {isCompleted && '✅'}
          </span>
        </div>
        <div style={{ width: '100%', height: '12px', background: isLight ? 'rgba(0,0,0,0.06)' : '#334155', borderRadius: '100px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${percent}%`, background: isCompleted ? '#10b981' : color, transition: 'width 1s ease-in-out' }}></div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px', color: isLight ? 'var(--text-title)' : '#60a5fa' }}>
        <span style={{ fontSize: '2.5rem' }}>🏆</span> MAFOSZ Minősítés Követő
      </h2>

      {/* --- ADMIN LEGÖRDÜLŐ MENÜ --- */}
      {user.email === ADMIN_EMAIL && allUsers.length > 0 && (
        <div style={{ marginBottom: '30px', padding: '20px', background: 'var(--bg-card)', borderRadius: '12px', border: '2px solid #f59e0b', boxShadow: isLight ? '0 4px 15px rgba(0,0,0,0.04)' : '0 4px 6px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>👑</span>
            <label style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '1.1rem' }}>
              Admin Nézet: Válassz felhasználót az adatok ellenőrzéséhez
            </label>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '15px', marginTop: 0 }}>
            Itt megtekintheted a migrált adatokat bármelyik fotós nevében anélkül, hogy be kellene jelentkezned a jelszavukkal.
          </p>
          <select 
            value={selectedEmail} 
            onChange={(e) => setSelectedEmail(e.target.value)}
            style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', background: 'var(--bg-main)', color: 'var(--text-title)', border: '1px solid var(--border-main)', fontSize: '1rem', cursor: 'pointer', outline: 'none' }}
          >
            <option value={user.email}>-- Saját adataim megtekintése --</option>
            {allUsers
              .filter(u => u.email !== user.email)
              .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
              .map(u => (
                <option key={u.email} value={u.email}>
                  {u.name} ({u.email})
                </option>
            ))}
          </select>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--text-title)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px', animation: 'spin 2s linear infinite' }}>⏳</div>
          <h3>MAFOSZ statisztikák betöltése...</h3>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '30px' }}>
            {selectedEmail === user.email 
              ? 'Kövesd nyomon automatikusan, hogyan haladsz a MAFOSZ hivatalos minősítési rendszereiben! (1 Díj = 2 Elfogadás)' 
              : `Jelenleg ${allUsers.find(u => u.email === selectedEmail)?.name || selectedEmail} adatait vizsgálod.`}
          </p>

          {/* DASHBOARD KÁRTYÁK */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '40px' }}>
            <div style={{ background: 'var(--bg-card)', padding: '30px', borderRadius: '16px', border: `2px solid ${currentLevel ? currentLevel.color : 'var(--border-main)'}`, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: isLight ? '0 4px 15px rgba(0,0,0,0.03)' : 'none' }}>
              <div style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '10px' }}>Jelenlegi Minősítésed</div>
              <div style={{ fontSize: '3rem', fontWeight: '900', color: currentLevel ? currentLevel.color : 'var(--text-muted)', marginBottom: '10px' }}>
                {currentLevel ? currentLevel.id : 'Még nincs'}
              </div>
              <div style={{ fontSize: '1.2rem', color: 'var(--text-title)' }}>
                {currentLevel ? currentLevel.name : 'Vágj bele a hazai pályázatokba!'}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '30px' }}>
                <div style={{ background: 'var(--bg-main)', padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-main)', minWidth: '80px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#38bdf8' }}>{stats.acceptances}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Elfogadás</div>
                </div>
                <div style={{ background: 'var(--bg-main)', padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-main)', minWidth: '80px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f472b6' }}>{stats.works}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Különböző Mű</div>
                </div>
                <div style={{ background: 'var(--bg-main)', padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-main)', minWidth: '80px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>{stats.awards}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Díjak száma</div>
                </div>
              </div>
            </div>

            {nextLevel ? (
              <div style={{ background: 'var(--bg-card)', padding: '30px', borderRadius: '16px', border: '1px solid var(--border-main)', boxShadow: isLight ? '0 4px 15px rgba(0,0,0,0.03)' : 'none' }}>
                <div style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px' }}>Következő Cél: <span style={{ color: nextLevel.color, fontWeight: 'bold' }}>{nextLevel.id}</span></div>
                <ProgressBar label="Összes Elfogadás" current={stats.acceptances} required={nextLevel.req.acceptances} color="#38bdf8" />
                <ProgressBar label="Különböző Művek" current={stats.works} required={nextLevel.req.works} color="#f472b6" />
                <ProgressBar label="Díjak száma" current={stats.awards} required={nextLevel.req.awards} color="#f59e0b" />
              </div>
            ) : (
              <div style={{ background: 'linear-gradient(135deg, #10b981, #047857)', padding: '30px', borderRadius: '16px', color: 'white', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🏆</div>
                <h3 style={{ fontSize: '1.5rem', margin: '0 0 10px 0' }}>Minden szintet elértél!</h3>
                <p style={{ opacity: 0.9 }}>Gratulálunk! Elérted a Gyémánt fokozatot, a hazai fotóművészet csúcsát!</p>
              </div>
            )}
          </div>

          {/* LISTA FEJLÉC ÉS KERESŐ */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid var(--border-main)', paddingBottom: '15px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--text-title)', margin: '0 0 5px 0' }}>
                Tételes MAFOSZ Eredmények (Részletes lista)
              </h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {searchTerm ? `Keresési találat: ${filteredEntries.length} / ${entries.length} sor` : `Összesen: ${entries.length} sor`}
              </div>
            </div>
            
            <input 
              type="text" 
              placeholder="🔍 Keresés (cím, szalon, MAFOSZ szám, díj)..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-title)', minWidth: '320px', outline: 'none' }}
            />
          </div>

          {entries.length === 0 ? (
            <div style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-main)' }}>
              Még nincsenek hitelesített MAFOSZ eredmények ehhez a felhasználóhoz.
            </div>
          ) : filteredEntries.length === 0 ? (
            <div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center', background: 'var(--bg-main)', borderRadius: '12px', border: '1px dashed var(--border-main)' }}>
              Nincs a keresésnek megfelelő találat.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-main)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border-main)' }}>
                    <th style={{ padding: '15px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Kép címe</th>
                    <th style={{ padding: '15px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Szalon neve</th>
                    <th style={{ padding: '15px', color: 'var(--text-muted)', fontWeight: 'bold' }}>MAFOSZ szám</th>
                    <th style={{ padding: '15px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Eredmény</th>
                    <th style={{ padding: '15px', color: 'var(--text-muted)', fontWeight: 'bold', textAlign: 'center' }}>Digitális</th>
                    <th style={{ padding: '15px', color: 'var(--text-muted)', fontWeight: 'bold', textAlign: 'center' }}>Print</th>
                    <th style={{ padding: '15px', color: 'var(--text-muted)', fontWeight: 'bold', textAlign: 'center' }}>Fotó</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry, idx) => {
                    const isAcceptance = entry.award?.toLowerCase() === 'acceptance';
                    const isOnline = entry.submission_type === 'online';
                    
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-main)', transition: 'background 0.1s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--hover-overlay)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '12px 15px', color: 'var(--text-title)', fontWeight: 'bold' }}>{entry.photo_title}</td>
                        <td style={{ padding: '12px 15px', color: 'var(--text-body)' }}>{entry.salon_name}</td>
                        <td style={{ padding: '12px 15px', color: '#10b981', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{entry.mafosz_number}</td>
                        <td style={{ padding: '12px 15px', color: isAcceptance ? '#10b981' : '#f59e0b', fontWeight: isAcceptance ? 'normal' : 'bold' }}>
                          {entry.award}
                        </td>
                        <td style={{ padding: '12px 15px', textAlign: 'center', color: isOnline ? '#10b981' : 'var(--text-muted)' }}>
                          {isOnline ? '✔️' : '-'}
                        </td>
                        <td style={{ padding: '12px 15px', textAlign: 'center', color: !isOnline ? '#10b981' : 'var(--text-muted)' }}>
                          {!isOnline ? '✔️' : '-'}
                        </td>
                        <td style={{ padding: '8px 15px', textAlign: 'center' }}>
                          <img 
                            src={getImageUrl(entry.drive_file_id, entry.file_url)} 
                            alt="" 
                            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-main)' }} 
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
