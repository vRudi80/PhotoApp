import { useState, useMemo } from 'react';
import { getFlagEmoji } from '../utils/helpers';

interface SalonsViewProps {
  salonSearch: string;
  setSalonSearch: (val: string) => void;
  searchedSalons: any[];
  setSelectedSalon: (salon: any) => void;
  userEntrySalonIds: number[]; 
}

export default function SalonsView({
  salonSearch,
  setSalonSearch,
  searchedSalons,
  setSelectedSalon,
  userEntrySalonIds
}: SalonsViewProps) {
  
  const [showOnlyMyEntries, setShowOnlyMyEntries] = useState(false);

  // ÚJ: SZALON STATISZTIKA SZÁMÍTÁSA
  const stats = useMemo(() => {
    // Csak azokat a szalonokat nézzük, amikben van nevezésed
    const myParticipatedSalons = searchedSalons.filter(s => userEntrySalonIds.includes(s.id));
    
    let fiap = 0, psa = 0, club = 0;
    
    myParticipatedSalons.forEach(s => {
      const patrons = s.patron_details?.map((p: any) => p.name.toUpperCase()) || [];
      if (patrons.some((p: string) => p.includes('FIAP'))) fiap++;
      if (patrons.some((p: string) => p.includes('PSA'))) psa++;
      if (patrons.some((p: string) => p.includes('CLUB') || p.includes('KLUB') || p.includes('MAFOSZ'))) club++;
    });

    return { total: myParticipatedSalons.length, fiap, psa, club };
  }, [searchedSalons, userEntrySalonIds]);

  const displaySalons = searchedSalons.filter(s => {
    if (showOnlyMyEntries && !userEntrySalonIds.includes(s.id)) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '15px', color: '#60a5fa' }}>
          <span style={{ fontSize: '2.5rem' }}>🌐</span> Nemzetközi Szalonok
        </h2>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            onClick={() => setShowOnlyMyEntries(!showOnlyMyEntries)}
            style={{ padding: '10px 15px', borderRadius: '8px', border: showOnlyMyEntries ? '1px solid #10b981' : '1px solid #334155', background: showOnlyMyEntries ? '#10b98120' : '#1e293b', color: showOnlyMyEntries ? '#10b981' : '#cbd5e1', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {showOnlyMyEntries ? '✅ Saját nevezéseim' : '📌 Nevezéseim szűrése'}
          </button>
          
          <input 
            type="text" 
            placeholder="🔍 Keresés..." 
            value={salonSearch} 
            onChange={e => setSalonSearch(e.target.value)} 
            style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: 'white', minWidth: '250px' }} 
          />
        </div>
      </div>

      {/* ÚJ: RÉSZVÉTELI STATISZTIKA SÁV */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', flexWrap: 'wrap' }}>
        <div style={{ background: '#0f172a', padding: '10px 20px', borderRadius: '10px', border: '1px solid #334155' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', marginRight: '10px' }}>Részvételed:</span>
          <b style={{ color: '#f8fafc' }}>{stats.total} szalon</b>
        </div>
        <div style={{ background: '#0f172a', padding: '10px 20px', borderRadius: '10px', border: '1px solid #334155', color: '#38bdf8' }}>
          <b>{stats.fiap} FIAP</b>
        </div>
        <div style={{ background: '#0f172a', padding: '10px 20px', borderRadius: '10px', border: '1px solid #334155', color: '#a78bfa' }}>
          <b>{stats.psa} PSA</b>
        </div>
        <div style={{ background: '#0f172a', padding: '10px 20px', borderRadius: '10px', border: '1px solid #334155', color: '#10b981' }}>
          <b>{stats.club} Klub / Egyéb</b>
        </div>
      </div>

      {/* ... (Többi rész változatlan) */}
      {displaySalons.length === 0 ? (
        <div style={{padding: '20px', color: '#94a3b8', textAlign: 'center', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155'}}>
          Nincs megjeleníthető szalon.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {displaySalons.map((s) => {
            const isEnded = new Date(s.end_date) < new Date(new Date().setHours(0,0,0,0));
            const hasEntered = userEntrySalonIds.includes(s.id);
            return (
              <div key={s.id} onClick={() => setSelectedSalon(s)} style={{ position: 'relative', cursor: 'pointer', background: '#1e293b', borderRadius: '12px', border: hasEntered ? '2px solid #10b981' : '1px solid #334155', display: 'flex', flexDirection: 'column', overflow: 'hidden', opacity: isEnded ? 0.7 : 1 }}>
                {hasEntered && <div style={{ position: 'absolute', top: '0', right: '0', background: '#10b981', color: '#0f172a', padding: '4px 12px', fontSize: '0.75rem', fontWeight: 'bold', borderBottomLeftRadius: '12px', zIndex: 5 }}>✓ NEVEZVE</div>}
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {s.patron_details?.map((p: any) => <span key={p.name} style={{ background: '#8b5cf620', color: '#a78bfa', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>{p.name}</span>)}
                  </div>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: hasEntered ? '#10b981' : '#f8fafc' }}>{s.name}</h3>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{s.country_code ? getFlagEmoji(s.country_code) : '🏳️'} {s.country_hun}</div>
                  <div style={{ flex: 1 }}></div>
                  <div style={{ display: 'flex', background: '#0f172a', borderRadius: '8px', padding: '10px', marginTop: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase' }}>Határidő</div>
                      <div style={{ fontSize: '0.9rem', color: isEnded ? '#94a3b8' : '#ef4444', fontWeight: 'bold' }}>{new Date(s.end_date).toLocaleDateString('hu-HU')}</div>
                    </div>
                  </div>
                </div>
                <button style={{ background: '#334155', color: '#f8fafc', border: 'none', padding: '10px', width: '100%', fontWeight: 'bold' }}>Részletek</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
