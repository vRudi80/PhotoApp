import React, { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL, ADMIN_EMAIL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';
import PremiumPaywall from './PremiumPaywall'; 
import { getFlagImageUrl } from '../utils/helpers';
import ExcelImportModal from '../components/ExcelImportModal';

// Nyelvi kontextus aktiválása
import { useLanguage } from '../context/LanguageContext';

// 🎯 Behozzuk a téma környezetet az adaptív világos módhoz
import { useTheme } from '../context/ThemeContext';

// 🏅 Hivatalos FIAP szintek és portfólió követelmények
const FIAP_LEVELS = [
  { 
    id: 'NFIAP', 
    name: 'Novice FIAP', 
    req: { acceptances: 25, countries: 5, works: 10 }, 
    portfolio: { type: 'acceptance', minCount: 2, minCountries: 3, label: 'legalább 2 elfogadással rendelkezik 3 különböző országban' },
    color: '#ec4899' 
  },
  { 
    id: 'AFIAP', 
    name: 'Artist FIAP', 
    req: { acceptances: 75, countries: 15, works: 20 }, 
    portfolio: { type: 'acceptance', minCount: 3, minCountries: 5, label: 'legalább 3 elfogadással rendelkezik 5 különböző országban' },
    color: '#10b981' 
  },
  { 
    id: 'EFIAP', 
    name: 'Excellence FIAP', 
    req: { acceptances: 200, countries: 20, works: 40 }, 
    portfolio: { type: 'acceptance', minCount: 3, minCountries: 5, label: 'legalább 3 elfogadással rendelkezik 5 különböző országban' },
    color: '#ef4444' 
  },
  { 
    id: 'EFIAP/b', 
    name: 'Excellence Bronze', 
    req: { acceptances: 400, countries: 25, works: 80 }, 
    portfolio: { type: 'award', minCount: 1, minCountries: 5, label: 'legalább 1 díjjal (Award) rendelkezik 5 különböző országban' },
    color: '#b45309' 
  },
  { 
    id: 'EFIAP/s', 
    name: 'Excellence Silver', 
    req: { acceptances: 600, countries: 30, works: 130 }, 
    portfolio: { type: 'award', minCount: 1, minCountries: 5, label: 'legalább 1 díjjal (Award) rendelkezik 5 különböző országban' },
    color: '#94a3b8' 
  },
  { 
    id: 'EFIAP/g', 
    name: 'Excellence Gold', 
    req: { acceptances: 900, countries: 35, works: 200 }, 
    portfolio: { type: 'award', minCount: 1, minCountries: 5, label: 'legalább 1 díjjal (Award) rendelkezik 5 különböző országban' },
    color: '#eab308' 
  },
  { 
    id: 'EFIAP/p', 
    name: 'Excellence Platinum', 
    req: { acceptances: 1200, countries: 40, works: 300 }, 
    portfolio: { type: 'award', minCount: 1, minCountries: 5, label: 'legalább 1 díjjal (Award) rendelkezik 5 különböző országban' },
    color: '#334155' 
  }
];

interface FiapProgressViewProps {
  user: any;
  allUsers?: any[]; 
}

export default function FiapProgressView({ user, allUsers = [] }: FiapProgressViewProps) {
  const { t, lang } = useLanguage();
  const [stats, setStats] = useState({ acceptances: 0, countries: 0, works: 0 });
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(user?.email || '');
  const [isExporting, setIsExporting] = useState(false);

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

  // Központi helper az érvényes biztonsági token fejléc felépítéséhez
  const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
    const token = localStorage.getItem('photoAppToken');
    return {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...extraHeaders
    };
  };

  useEffect(() => {
    if (!user || !user.is_premium) {
      setIsLoading(false);
      return;
    }

    const fetchProgress = async () => {
      setIsLoading(true); 
      try {
        const [resStats, resEntries] = await Promise.all([
          fetch(`${BACKEND_URL}/api/fiap-progress?userEmail=${selectedEmail}`, { headers: getAuthHeaders() }),
          fetch(`${BACKEND_URL}/api/fiap-entries?userEmail=${selectedEmail}`, { headers: getAuthHeaders() })
        ]);

        if (resStats.ok) setStats(await resStats.json());
        if (resEntries.ok) {
          const entriesData = await resEntries.json();
          setEntries(Array.isArray(entriesData) ? entriesData : []); 
        }
      } catch (e) {
        console.error("Hiba a FIAP progress adatok letöltésekor:", e);
      } finaly {
        setIsLoading(false);
      }
    };
    
    fetchProgress();
  }, [user, selectedEmail]); 

  const handleExportFiapC = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/export-fiap-c?userEmail=${selectedEmail}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        let errMsg = 'Ismeretlen szerverhiba történt.';
        try {
          const errData = await res.json();
          if (errData.error === 'PREMIUM_REQUIRED' || errData.message) {
            errMsg = errData.message || 'Ehhez a funkcióhoz aktív Prémium előfizetés szükséges!';
          } else {
            errMsg = errData.error || errMsg;
          }
        } catch(e) {
          errMsg = `Szerver hibaoldalt küldött. Állapotkód: ${res.status}`;
        }
        throw new Error(errMsg);
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FIAP_Page_C_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`❌ Hiba az Excel letöltésekor:\n\n${e.message}`);
    } finally {
      setIsExporting(false);
    }
  };
  
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

  const qualifyingPhotosCount = useMemo(() => {
    if (!nextLevel || !nextLevel.portfolio) return 0;
    const rule = nextLevel.portfolio;

    const photoGroups: { [title: string]: { totalAcceptances: number; totalAwards: number; acceptanceCountries: Set<string>; awardCountries: Set<string> } } = {};

    entries.forEach(entry => {
      const title = entry.photo_title?.trim().toLowerCase();
      if (!title) return;

      if (!photoGroups[title]) {
        photoGroups[title] = { totalAcceptances: 0, totalAwards: 0, acceptanceCountries: new Set(), awardCountries: new Set() };
      }

      const country = entry.country?.trim().toLowerCase() || 'unknown';
      const isAward = entry.award && entry.award.toLowerCase() !== 'acceptance';

      photoGroups[title].totalAcceptances += 1;
      photoGroups[title].acceptanceCountries.add(country);

      if (isAward) {
        photoGroups[title].totalAwards += 1;
        photoGroups[title].awardCountries.add(country);
      }
    });

    return Object.values(photoGroups).filter(p => {
      if (rule.type === 'acceptance') {
        return p.totalAcceptances >= rule.minCount && p.acceptanceCountries.size >= rule.minCountries;
      } else {
        return p.totalAwards >= rule.minCount && p.awardCountries.size >= rule.minCountries;
      }
    }).length;
  }, [entries, nextLevel]);

  if (!user || !user.is_premium) {
    return (
      <div>
        <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px', color: isLight ? 'var(--text-title)' : '#60a5fa' }}>
          <span style={{ fontSize: '2.5rem' }}>🏅</span> FIAP Minősítés Követő
        </h2>
        <PremiumPaywall user={user} />
      </div>
    );
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '15px', color: isLight ? 'var(--text-title)' : '#60a5fa' }}>
          <span style={{ fontSize: '2.5rem' }}>🏅</span> FIAP Minősítés Követő
        </h2>
        
        {user.email === selectedEmail && (
          <button 
            onClick={() => setIsImportModalOpen(true)}
            style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span>📊</span> Excel Importálás (AI)
          </button>
        )}
      </div>

      {/* --- ADMIN LEGÖRDÜLŐ MENÜ – 🎯 JAVÍTVA: Adaptív színek --- */}
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
          <h3>FIAP statisztikák betöltése...</h3>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '30px' }}>
            {selectedEmail === user.email 
              ? 'Kövesd nyomon automatikusan, hogyan haladsz a hivatalos Nemzetközi Fotóművészeti Szövetség (FIAP) minősítési rendszereiben!' 
              : `Jelenleg ${allUsers.find(u => u.email === selectedEmail)?.name || selectedEmail} adatait vizsgálod.`}
          </p>

          {/* DASHBOARD KÁRTYÁK – 🎯 JAVÍTVA: Adaptív bento panel színkezelés */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '30px' }}>
            <div style={{ background: 'var(--bg-card)', padding: '30px', borderRadius: '16px', border: `2px solid ${currentLevel ? currentLevel.color : 'var(--border-main)'}`, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: isLight ? '0 4px 15px rgba(0,0,0,0.03)' : 'none' }}>
              <div style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '10px' }}>Jelenlegi Minősítésed</div>
              <div style={{ fontSize: '3rem', fontWeight: '900', color: currentLevel ? currentLevel.color : 'var(--text-muted)', marginBottom: '10px' }}>
                {currentLevel ? currentLevel.id : 'Még nincs'}
              </div>
              <div style={{ fontSize: '1.2rem', color: 'var(--text-title)' }}>
                {currentLevel ? currentLevel.name : 'Vágj bele a szalonozásba!'}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '30px' }}>
                <div style={{ background: 'var(--bg-main)', padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-main)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#38bdf8' }}>{stats.acceptances}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Elfogadás</div>
                </div>
                <div style={{ background: 'var(--bg-main)', padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-main)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#a78bfa' }}>{stats.countries}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ország</div>
                </div>
                <div style={{ background: 'var(--bg-main)', padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-main)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f472b6' }}>{stats.works}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mű (Kép)</div>
                </div>
              </div>
            </div>

            {nextLevel ? (
              <div style={{ background: 'var(--bg-card)', padding: '30px', borderRadius: '16px', border: '1px solid var(--border-main)', boxShadow: isLight ? '0 4px 15px rgba(0,0,0,0.03)' : 'none' }}>
                <div style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px' }}>Következő Cél: <span style={{ color: nextLevel.color, fontWeight: 'bold' }}>{nextLevel.id}</span></div>
                <ProgressBar label="Összes Elfogadás" current={stats.acceptances} required={nextLevel.req.acceptances} color="#38bdf8" />
                <ProgressBar label="Különböző Országok" current={stats.countries} required={nextLevel.req.countries} color="#a78bfa" />
                <ProgressBar label="Különböző Művek" current={stats.works} required={nextLevel.req.works} color="#f472b6" />
                
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed var(--border-main)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-body)', fontWeight: 'bold', marginBottom: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      📋 {lang === 'en' ? '5 Portfolio Works Rule:' : '5 db Portfólió Kép Szabály:'}
                    </span>
                    <span style={{ color: qualifyingPhotosCount >= 5 ? '#10b981' : '#f59e0b' }}>
                      {qualifyingPhotosCount} / 5 db {qualifyingPhotosCount >= 5 ? '✅' : '⏳'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4', fontStyle: 'italic' }}>
                    {lang === 'en' 
                      ? `Requirement: At least 5 unique photos must have ${nextLevel.portfolio.minCount} ${nextLevel.portfolio.type === 'acceptance' ? 'acceptances' : 'awards'} from ${nextLevel.portfolio.minCountries} different countries.` 
                      : `FIAP 1.2 f) feltétel: Legalább 5 olyan egyedi képednek kell lennie, amik közül mindegyik külön-külön ${nextLevel.portfolio.label}.`}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: 'linear-gradient(135deg, #10b981, #047857)', padding: '30px', borderRadius: '16px', color: 'white', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🏆</div>
                <h3 style={{ fontSize: '1.5rem', margin: '0 0 10px 0' }}>Minden szintet elértél!</h3>
                <p style={{ opacity: 0.9 }}>Gratulálunk! Elérted a Platina fokozatot. A Gyémánt és Mester fokozatokhoz egyedi portfólió benyújtása szükséges a FIAP felületén.</p>
              </div>
            )}
          </div>

          {/* SZABÁLYZAT PANEL */}
          <div style={{ background: 'var(--bg-card)', borderLeft: '4px solid #38bdf8', padding: '15px 20px', borderRadius: '0 12px 12px 0', marginBottom: '40px', fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: '1.5', border: '1px solid var(--border-main)', borderLeftWidth: '4px' }}>
            <strong style={{ color: isLight ? 'var(--text-title)' : '#38bdf8', display: 'block', marginBottom: '2px' }}>
              ⚠️ {lang === 'en' ? 'FIAP 2026 Regulation Notice:' : 'Hivatalos FIAP 2026-os Szabályzati Értesítés:'}
            </strong>
            {lang === 'en' 
              ? 'Starting from 2026, a single photo/work cannot have more than 10 acceptances or awards listed on the official application form. Excess acceptances for the same image will be ignored by judges.' 
              : 'A 2026. január 1-je után kiírt szalonokból egyetlen fotóhoz/műhöz legfeljebb 10 elfogadás vagy díj listázható a hivatalos pályázati nyomtatványon. Az ezen felüli extra elfogadásokat a bíráló bizottság figyelmen kívül hagyja!'}
          </div>

          {/* LISTA FEJLÉC ÉS KERESŐ */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid var(--border-main)', paddingBottom: '15px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--text-title)', margin: '0 0 5px 0' }}>
                Tételes FIAP Eredmények (Részletes lista)
              </h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {searchTerm ? `Keresési találat: ${filteredEntries.length} / ${entries.length} sor` : `Összesen: ${entries.length} sor`}
              </div>
            </div>
            
            <input 
              type="text" 
              placeholder="🔍 Keresés (cím, szalon, ország, FIAP szám, díj)..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-title)', minWidth: '320px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
            <button 
              onClick={handleExportFiapC} 
              disabled={isExporting}
              style={{ 
                background: isExporting ? 'var(--border-main)' : '#10b981', 
                color: isLight ? 'white' : '#0f172a', 
                border: 'none', 
                padding: '10px 20px', 
                borderRadius: '8px', 
                cursor: isExporting ? 'not-allowed' : 'pointer', 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s',
                boxShadow: '0 4px 6px rgba(16, 185, 129, 0.15)'
              }}
            >
              {isExporting ? '⏳ Generálás...' : '📗 Excel Export (C Lap)'}
            </button>
          </div>

          {/* TÁBLÁZAT ÉS ÜRES ÁLLAPOTOK – 🎯 JAVÍTVA: Teljesen reszponzív, téma-adaptív táblázatszerkezet */}
          {entries.length === 0 ? (
            <div style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-main)' }}>
              Még nincsenek hitelesített FIAP eredmények ehhez a felhasználóhoz.
            </div>
          ) : filteredEntries.length === 0 ? (
            <div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center', background: 'var(--bg-main)', borderRadius: '12px', border: '1px dashed var(--border-main)' }}>
              Nincs a keresésnek megfelelő találat.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-main)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border-main)' }}>
                    <th style={{ padding: '15px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Kép címe</th>
                    <th style={{ padding: '15px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Szalon neve</th>
                    <th style={{ padding: '15px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Ország</th>
                    <th style={{ padding: '15px', color: 'var(--text-muted)', fontWeight: 'bold' }}>FIAP szám</th>
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
                        <td style={{ padding: '12px 15px', color: 'var(--text-body)', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {getFlagImageUrl(entry.country_code) ? (
                              <img 
                                src={getFlagImageUrl(entry.country_code)} 
                                alt="" 
                                style={{ width: '20px', height: 'auto', borderRadius: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }} 
                              />
                            ) : (
                              '🏳️'
                            )}
                            <span>{entry.country}</span>
                          </span>
                        </td>
                        <td style={{ padding: '12px 15px', color: isLight ? '#0284c7' : '#38bdf8', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{entry.fiap_number}</td>
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

      <ExcelImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        user={user} 
        onSuccess={() => window.location.reload()} 
      />
    </div>
  );
}
