import React, { useState, useMemo } from 'react';
import PremiumPaywall from './PremiumPaywall'; 

// 🎯 JAVÍTVA: getImageUrl szabályosan beimportálva a többi helper mellé!
import { getFlagEmoji, getFlagImageUrl, getImageUrl } from '../utils/helpers';

// Behozzuk a téma környezetet a reaktív témakezeléshez
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

  // BIZTONSÁGI VÉDŐHÁLÓ: Lekérjük az aktuális témát a reszponzív stílusokhoz
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
          {displaySalons.map((sol) => {
            const isOwnOrAdmin = myEntryIdsSet.has(Number(sol.id));
            const now = new Date(); 
            const end = sol.end_date ? new Date(sol.end_date) : new Date(0); 
            const isEnded = now > end;
            const imageUrl = getImageUrl(sol.drive_file_id, sol.file_url);

            return (
              <div 
                key={sol.id}
                onClick={() => setSelectedSalon(sol)}
                style={{ background: 'var(--bg-card)', borderRadius: '8px', overflow: 'hidden', border: isOwnOrAdmin ? '2px solid #10b981' : '1px solid var(--border-main)', boxShadow: isLight ? '0 4px 15px rgba(0,0,0,0.04)' : '0 4px 15px rgba(0,0,0,0.25)', cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease-in-out' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--text-body)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = isOwnOrAdmin ? '#10b981' : 'var(--border-main)'; }}
              >
                <div style={{ padding: '12px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: isOwnOrAdmin ? '#10b981' : 'var(--text-title)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                    {sol.title}
                  </h4>
                  {isOwnOrAdmin && (
                    <span style={{ flexShrink: 0, fontSize: '0.68rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                      ✓ NEVEZVE
                    </span>
                  )}
                </div>

                {/* 🎯 JAVÍTVA: A borítókép mostantól megkapta az intelligens Drive fallback támogatást is! */}
                <div style={{ height: '160px', backgroundColor: '#090d16', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <img src={sol.cover_url || imageUrl || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' fill='%230f172a'><rect width='100%' height='100%'/></svg>`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isEnded ? 0.5 : 1 }} />
                </div>

                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  
                  {/* PATRONOK ÉS CÍMKÉK */}
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {sol.patron_details && sol.patron_details.length > 0 ? (
                      sol.patron_details.map((p: any) => (
                        <span key={p.name} style={{ background: 'rgba(139,92,246,0.08)', color: isLight ? '#7c3aed' : '#a78bfa', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid rgba(139,92,246,0.15)', whiteSpace: 'nowrap' }}>
                          {p.name} {p.number ? `...${p.number}` : ''}
                        </span>
                      ))
                    ) : (
                      <span style={{ background: 'var(--bg-main)', color: 'var(--text-muted)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid var(--border-main)' }}>Független</span>
                    )}
                    {sol.is_circuit === 1 && <span style={{ background: 'rgba(245,158,11,0.08)', color: isLight ? '#b45309' : '#f59e0b', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid rgba(245,158,11,0.2)' }}>Körverseny</span>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-body)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {getFlagImageUrl(sol.country_code) ? (
                        <img 
                          src={getFlagImageUrl(sol.country_code)} 
                          alt="" 
                          style={{ width: '18px', height: 'auto', borderRadius: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }} 
                        />
                      ) : (
                        '🏳️'
                      )}
                      <span>{sol.country_hun}</span>
                    </span>
                    <span>•</span>
                    <span>{sol.submission_type === 'online' ? '💻 Online' : '🖼️ Papírkép'}</span>
                  </div>

                  {sol.categories && sol.categories.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '15px' }}>
                      {sol.categories.map((c: string) => (
                        <span key={c} style={{ background: 'rgba(56,189,248,0.08)', color: isLight ? '#0284c7' : '#38bdf8', padding: '3px 8px', borderRadius: '100px', fontSize: '0.75rem', border: '1px solid rgba(56,189,248,0.15)' }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ flex: 1 }}></div>

                  {/* HATÁRIDŐK PANEL */}
                  <div style={{ display: 'flex', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-main)', padding: '10px', marginBottom: '12px' }}>
                    <div style={{ flex: 1, borderRight: '1px solid var(--border-main)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Határidő</div>
                      <div style={{ fontSize: '0.92rem', color: isEnded ? 'var(--text-muted)' : '#ef4444', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        {new Date(sol.end_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ flex: 1, paddingLeft: '12px' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Nevezési díj</div>
                      <div style={{ fontSize: '0.92rem', color: '#10b981', fontWeight: 'bold' }}>
                        {sol.fee_amount && sol.fee_amount > 0 ? `${sol.fee_amount} ${sol.fee_currency}` : 'Ingyenes'}
                      </div>
                    </div>
                  </div>

                  {sol.results_date && (
                    <div style={{ padding: '0 4px', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>Értesítés:</span>
                      <span style={{ color: 'var(--text-body)', fontWeight: '500' }}>
                        {new Date(sol.results_date).toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\s/g, '')}
                      </span>
                    </div>
                  )}
                </div>

                <button 
                  style={{ background: 'var(--bg-main)', color: 'var(--text-title)', border: 'none', padding: '12px', width: '100%', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', borderTop: '1px solid var(--border-main)', transition: 'background 0.15s' }}
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
