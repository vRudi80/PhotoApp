import { useState, useMemo } from 'react';
import { getFlagEmoji } from '../utils/helpers';
import PremiumPaywall from './PremiumPaywall'; // ÚJ: Beimportáljuk a fizetőfalat ide is!
import { getFlagImageUrl } from '../utils/helpers';

interface SalonsViewProps {
  salonSearch: string;
  setSalonSearch: (val: string) => void;
  searchedSalons: any[];
  setSelectedSalon: (salon: any) => void;
  userEntrySalonIds: number[]; 
  user: any;           
  BACKEND_URL: string; 
}

export default function SalonsView({
  salonSearch,
  setSalonSearch,
  searchedSalons,
  setSelectedSalon,
  userEntrySalonIds,
  user,                
  BACKEND_URL          
}: SalonsViewProps) {
  
  // Állapot a saját nevezések szűréséhez
  const [showOnlyMyEntries, setShowOnlyMyEntries] = useState(false);

  // SZALON STATISZTIKA SZÁMÍTÁSA
  const stats = useMemo(() => {
    const myParticipatedSalons = searchedSalons.filter(s => userEntrySalonIds.includes(s.id));
    let fiap = 0, psa = 0, club = 0;
    
    myParticipatedSalons.forEach(s => {
      const patrons = s.patron_details?.map((p: any) => p.name.toUpperCase()) || [];
      if (patrons.some((p: string) => p.includes('FIAP'))) fiap++;
      if (patrons.some((p: string) => p.includes('PSA'))) psa++;
      if (patrons.some((p: string) => p.includes('CLUB') || p.includes('MAFOSZ'))) club++;
    });

    return { total: myParticipatedSalons.length, fiap, psa, club };
  }, [searchedSalons, userEntrySalonIds]);

  // Szűrjük a listát a kapcsoló alapján is
  const displaySalons = searchedSalons.filter(s => {
    if (showOnlyMyEntries && !userEntrySalonIds.includes(s.id)) return false;
    return true;
  });

  // --- HA NEM PRÉMIUM A USER, CSAK A KÁRTYÁT MUTATJUK (Korai kilépés - Sokkal tisztább!) ---
  if (!user || !user.is_premium) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
          <h2 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '15px', color: '#60a5fa' }}>
            <span style={{ fontSize: '2.5rem' }}>🌐</span> Nemzetközi Fotóművészeti Szalonok
          </h2>
        </div>
        <PremiumPaywall user={user} />
      </div>
    );
  }

  // --- INNENTŐL CSAK A PRÉMIUM FELHASZNÁLÓK LÁTJÁK A TARTALMOT ---
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '15px', color: '#60a5fa' }}>
          <span style={{ fontSize: '2.5rem' }}>🌐</span> Nemzetközi Fotóművészeti Szalonok
        </h2>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Szűrőgomb a saját nevezésekhez */}
          <button 
            onClick={() => setShowOnlyMyEntries(!showOnlyMyEntries)}
            style={{ padding: '10px 15px', borderRadius: '8px', border: showOnlyMyEntries ? '1px solid #10b981' : '1px solid #334155', background: showOnlyMyEntries ? '#10b98120' : '#1e293b', color: showOnlyMyEntries ? '#10b981' : '#cbd5e1', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
          >
            {showOnlyMyEntries ? '✅ Csak a saját nevezéseim' : '📌 Saját nevezéseim szűrése'}
          </button>
          
          <input 
            type="text" 
            placeholder="🔍 Keresés név vagy azonosító (pl. 2026/081)..." 
            value={salonSearch} 
            onChange={e => setSalonSearch(e.target.value)} 
            style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: 'white', minWidth: '300px', outline: 'none' }} 
          />
        </div>
      </div>
      
      {/* RÉSZVÉTELI STATISZTIKA SÁV */}
      {userEntrySalonIds.length > 0 && (
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
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
      )}

      <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '20px' }}>
        Böngéssz a hazai és nemzetközi fotópályázatok között. Kattints a szalon nevére vagy a "Részletek" gombra a pontos kiírás, kategóriák és díjazás megtekintéséhez!
      </p>

      {displaySalons.length === 0 ? (
        <div style={{padding: '20px', color: '#94a3b8', textAlign: 'center', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155'}}>
          {salonSearch || showOnlyMyEntries ? 'Nincs a keresésnek vagy szűrésnek megfelelő szalon.' : 'Jelenleg nincs megjeleníthető szalon az adatbázisban.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {displaySalons.map((s) => {
            const isEnded = new Date(s.end_date) < new Date(new Date().setHours(0,0,0,0));
            const hasEntered = userEntrySalonIds.includes(s.id);
            
            return (
              <div 
                key={s.id} 
                onClick={() => setSelectedSalon(s)}
                style={{ position: 'relative', cursor: 'pointer', background: '#1e293b', borderRadius: '12px', border: hasEntered ? '2px solid #10b981' : '1px solid #334155', display: 'flex', flexDirection: 'column', overflow: 'hidden', opacity: isEnded ? 0.7 : 1, transition: 'transform 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)' }} 
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-3px)'} 
                onMouseOut={e => e.currentTarget.style.transform = 'none'}
              >
                {/* NEVEZVE BADGE */}
                {hasEntered && (
                  <div style={{ position: 'absolute', top: '0', right: '0', background: '#10b981', color: '#0f172a', padding: '4px 12px', fontSize: '0.75rem', fontWeight: 'bold', borderBottomLeftRadius: '12px', zIndex: 5, boxShadow: '-2px 2px 5px rgba(0,0,0,0.2)' }}>
                    ✓ NEVEZVE
                  </div>
                )}

                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', flex: 1, paddingRight: hasEntered ? '70px' : '0' }}>
                      {s.patron_details && s.patron_details.length > 0 ? (
                        s.patron_details.map((p: any) => (
                          <span key={p.name} style={{ background: '#8b5cf620', color: '#a78bfa', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid #8b5cf650', whiteSpace: 'nowrap' }}>
                            {p.name} {p.number ? `[${p.number}]` : ''}
                          </span>
                        ))
                      ) : (
                        <span style={{ background: '#334155', color: '#cbd5e1', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>Független</span>
                      )}
                      {s.is_circuit === 1 && <span style={{ background: '#f59e0b20', color: '#f59e0b', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid #f59e0b50' }}>Körverseny</span>}
                    </div>
                  </div>

                 <h3 style={{ margin: '0 0 10px 0', fontSize: '1.3rem', color: hasEntered ? '#10b981' : '#f8fafc', lineHeight: '1.3' }}>
  {s.name}
</h3>

<div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '15px' }}>
  {/* JAVÍTOTT RÉSZ: Szép, inline-flex elrendezés a kép alapú zászlóval */}
  <span style={{ fontWeight: 'bold', color: '#cbd5e1', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
    {getFlagImageUrl(s.country_code) ? (
      <img 
        src={getFlagImageUrl(s.country_code)} 
        alt={s.country_hun || 'Zászló'} 
        style={{ width: '20px', height: 'auto', borderRadius: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }} 
      />
    ) : (
      '🏳️'
    )}
    <span>{s.country_hun}</span>
  </span>
  
  <span>•</span>
  <span>{s.submission_type === 'online' ? '💻 Online leadás' : '🖼️ Papírkép'}</span>
</div>
                  {s.categories && s.categories.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '15px' }}>
                      {s.categories.map((c: string) => (
                        <span key={c} style={{ background: '#38bdf815', color: '#38bdf8', padding: '3px 8px', borderRadius: '100px', fontSize: '0.75rem', border: '1px solid #38bdf830' }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ flex: 1 }}></div>

                  <div style={{ display: 'flex', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155', padding: '12px', marginBottom: '12px' }}>
                    <div style={{ flex: 1, borderRight: '1px solid #334155' }}>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Határidő</div>
                      <div style={{ fontSize: '1rem', color: isEnded ? '#94a3b8' : '#ef4444', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        {new Date(s.end_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ flex: 1, paddingLeft: '12px' }}>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Nevezési díj</div>
                      <div style={{ fontSize: '1rem', color: '#10b981', fontWeight: 'bold' }}>
                        {s.fee_amount && s.fee_amount > 0 ? `${s.fee_amount} ${s.fee_currency}` : 'Ingyenes'}
                      </div>
                    </div>
                  </div>

                  {s.results_date && (
                    <div style={{ marginBottom: '5px', padding: '0 5px' }}>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>Eredményhirdetés</div>
                      <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                        {new Date(s.results_date).toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\s/g, '')}
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  style={{ background: '#334155', color: '#f8fafc', border: 'none', padding: '12px', width: '100%', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', borderTop: '1px solid #475569', transition: 'background 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = '#475569'}
                  onMouseOut={e => e.currentTarget.style.background = '#334155'}
                >
                  Részletek megtekintése {isEnded ? '(Lezárult)' : ''}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
