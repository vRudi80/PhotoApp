import React, { useState, useMemo } from 'react';
import PremiumPaywall from './PremiumPaywall'; 
import { getFlagImageUrl } from '../utils/helpers';

// 🎯 Behozzuk a téma környezetet a reaktív témakezeléshez
import { useTheme } from '../context/ThemeContext';

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

  // 🎯 BIZTONSÁGI VÉDŐHÁLÓ: Lekérjük az aktuális témát a reszponzív stílusokhoz
  let isLight = false;
  try {
    const themeContext = useTheme();
    if (themeContext) {
      isLight = themeContext.theme === 'light';
    }
  } catch (e) {}

  // ID-k egységesítése szám formátumra egy Set-ben
  const myEntryIdsSet = useMemo(() => {
    return new Set((userEntrySalonIds || []).map(id => Number(id)));
  }, [userEntrySalonIds]);

  // SZALON STATISZTIKA SZÁMÍTÁSA
  const stats = useMemo(() => {
    const myParticipatedSalons = searchedSalons.filter(s => myEntryIdsSet.has(Number(s.id)));
    let fiap = 0, psa = 0, club = 0;
    
    myParticipatedSalons.forEach(s => {
      const patrons = s.patron_details?.map((p: any) => p.name.toUpperCase()) || [];
      if (patrons.some((p: string) => p.includes('FIAP'))) fiap++;
      if (patrons.some((p: string) => p.includes('PSA'))) psa++;
      if (patrons.some((p: string) => p.includes('CLUB') || p.includes('MAFOSZ'))) club++;
    });

    return { total: myParticipatedSalons.length, fiap, psa, club };
  }, [searchedSalons, myEntryIdsSet]);

  // Szűrés a kapcsoló alapján
  const displaySalons = searchedSalons.filter(s => {
    if (showOnlyMyEntries && !myEntryIdsSet.has(Number(s.id))) return false;
    return true;
  });

  // --- HA NEM PRÉMIUM A USER, CSAK A KÁRTYÁT MUTATJUK (Korai kilépés) ---
  if (!user || !user.is_premium) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
          <h2 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '15px', color: 'var(--text-title)' }}>
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
        <h2 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '15px', color: isLight ? 'var(--text-title)' : '#60a5fa' }}>
          <span style={{ fontSize: '2.5rem' }}>🌐</span> Nemzetközi Fotóművészeti Szalonok
        </h2>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Szűrőgomb a saját nevezésekhez */}
          <button 
            onClick={() => setShowOnlyMyEntries(!showOnlyMyEntries)}
            style={{ padding: '10px 15px', borderRadius: '8px', border: showOnlyMyEntries ? '1px solid #10b981' : '1px solid var(--border-main)', background: showOnlyMyEntries ? 'rgba(16,185,129,0.12)' : 'var(--bg-card)', color: showOnlyMyEntries ? '#10b981' : 'var(--text-body)', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
          >
            {showOnlyMyEntries ? '✅ Csak a saját nevezéseim' : '📌 Saját nevezéseim szűrése'}
          </button>
          
          <input 
            type="text" 
            placeholder="🔍 Keresés név vagy azonosító (pl. 2026/081)..." 
            value={salonSearch} 
            onChange={e => setSalonSearch(e.target.value)} 
            style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-title)', minWidth: '300px', outline: 'none' }} 
          />
        </div>
      </div>
      
      {/* RÉSZVÉTELI STATISZTIKA SÁV */}
      {userEntrySalonIds && userEntrySalonIds.length > 0 && (
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--bg-main)', padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border-main)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginRight: '10px' }}>Részvételed:</span>
            <b style={{ color: 'var(--text-title)' }}>{stats.total} szalon</b>
          </div>
          <div style={{ background: 'var(--bg-main)', padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border-main)', color: isLight ? '#0284c7' : '#38bdf8' }}>
            <b>{stats.fiap} FIAP</b>
          </div>
          <div style={{ background: 'var(--bg-main)', padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border-main)', color: isLight ? '#7c3aed' : '#a78bfa' }}>
            <b>{stats.psa} PSA</b>
          </div>
          <div style={{ background: 'var(--bg-main)', padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border-main)', color: '#10b981' }}>
            <b>{stats.club} Klub / Egyéb</b>
          </div>
        </div>
      )}

      <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '20px' }}>
        Böngéssz a hazai és nemzetközi fotópályázatok között. Kattints a szalon nevére vagy a "Részletek" gombra a pontos kiírás, kategóriák és díjazás megtekintéséhez!
      </p>

      {displaySalons.length === 0 ? (
        <div style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-main)' }}>
          {salonSearch || showOnlyMyEntries ? 'Nincs a keresésnek vagy szűrésnek megfelelő szalon.' : 'Jelenleg nincs megjeleníthető szalon az adatbázisban.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {displaySalons.map((s) => {
            const isEnded = new Date(s.end_date) < new Date(new Date().setHours(0,0,0,0));
            const hasEntered = myEntryIdsSet.has(Number(s.id));
            
            return (
              <div 
                key={s.id} 
                onClick={() => setSelectedSalon(s)}
                style={{ position: 'relative', cursor: 'pointer', background: 'var(--bg-card)', borderRadius: '12px', border: hasEntered ? '2px solid #10b981' : '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', overflow: 'hidden', opacity: isEnded ? 0.7 : 1, transition: 'transform 0.2s', boxShadow: isLight ? '0 4px 6px -1px rgba(0,0,0,0.05)' : '0 4px 6px -1px rgba(0,0,0,0.3)' }} 
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
                          <span key={p.name} style={{ background: 'rgba(139,92,246,0.08)', color: isLight ? '#7c3aed' : '#a78bfa', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid rgba(139,92,246,0.15)', whiteSpace: 'nowrap' }}>
                            {p.name} {p.number ? `[${p.number}]` : ''}
                          </span>
                        ))
                      ) : (
                        <span style={{ background: 'var(--bg-main)', color: 'var(--text-muted)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid var(--border-main)' }}>Független</span>
                      )}
                      {s.is_circuit === 1 && <span style={{ background: 'rgba(245,158,11,0.08)', color: isLight ? '#b45309' : '#f59e0b', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid rgba(245,158,11,0.2)' }}>Körverseny</span>}
                    </div>
                  </div>

                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1.3rem', color: hasEntered ? '#10b981' : 'var(--text-title)', lineHeight: '1.3' }}>
                    {s.name}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-body)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {getFlagImageUrl(s.country_code) ? (
                        <img 
                          src={getFlagImageUrl(s.country_code)} 
                          alt={s.country_hun || 'Zászló'} 
                          style={{ width: '20px', height: 'auto', borderRadius: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }} 
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
                        <span key={c} style={{ background: 'rgba(56,189,248,0.08)', color: isLight ? '#0284c7' : '#38bdf8', padding: '3px 8px', borderRadius: '100px', fontSize: '0.75rem', border: '1px solid rgba(56,189,248,0.15)' }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ flex: 1 }}></div>

                  {/* EREDETI KÉPMEGJELENÍTŐ LOGIKA VISSZAÁLLÍTVA */}
                  <div style={{ display: 'flex', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-main)', padding: '12px', marginBottom: '12px' }}>
                    <div style={{ flex: 1, borderRight: '1px solid var(--border-main)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Határidő</div>
                      <div style={{ fontSize: '1rem', color: isEnded ? 'var(--text-muted)' : '#ef4444', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        {new Date(s.end_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ flex: 1, paddingLeft: '12px' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Nevezési díj</div>
                      <div style={{ fontSize: '1rem', color: '#10b981', fontWeight: 'bold' }}>
                        {s.fee_amount && s.fee_amount > 0 ? `${s.fee_amount} ${s.fee_currency}` : 'Ingyenes'}
                      </div>
                    </div>
                  </div>

                  {s.results_date && (
                    <div style={{ marginBottom: '5px', padding: '0 4px' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Eredményhirdetés</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-body)' }}>
                        {new Date(s.results_date).toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\s/g, '')}
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  style={{ background: 'var(--bg-main)', color: 'var(--text-title)', border: 'none', padding: '12px', width: '100%', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', borderTop: '1px solid var(--border-main)', transition: 'background 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--hover-overlay)'}
                  onMouseOut={e => e.currentTarget.style.background = 'var(--bg-main)'}
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
