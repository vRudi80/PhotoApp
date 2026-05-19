import { useState, useEffect, useCallback, useMemo } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';

interface SalonModalProps {
  salon: any;
  user: any;
  onClose: () => void;
}

export default function SalonModal({ salon, user, onClose }: SalonModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [myEntries, setMyEntries] = useState<any[]>([]);
  const [awards, setAwards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // ÚJ: Kereső a portfólióhoz
  const [searchQuery, setSearchQuery] = useState('');

  const [resultsEdit, setResultsEdit] = useState<Record<number, { awardId: string, achieved: string, acceptance: string }>>({});

  // Lejárt-e a határidő (de most már NEM blokkol, csak figyelmeztet!)
  const isPastDeadline = new Date(salon.end_date) < new Date(new Date().setHours(0,0,0,0));

  const loadSubmissionData = useCallback(async () => {
    setIsLoading(true);
    try {
      const portRes = await fetch(`${BACKEND_URL}/api/my-album?userEmail=${user.email}`);
      if (portRes.ok) setPortfolio(await portRes.json());

      const entryRes = await fetch(`${BACKEND_URL}/api/salon-entries/${salon.id}?userEmail=${user.email}`);
      if (entryRes.ok) {
        const entries = await entryRes.json();
        setMyEntries(entries);
        
        const initialEdits: any = {};
        entries.forEach((e: any) => {
          initialEdits[e.entry_id] = {
            awardId: e.award_id ? String(e.award_id) : '',
            achieved: e.achieved_score !== null ? String(e.achieved_score) : '',
            acceptance: e.acceptance_score !== null ? String(e.acceptance_score) : ''
          };
        });
        setResultsEdit(initialEdits);
      }

      const awardsRes = await fetch(`${BACKEND_URL}/api/awards`);
      if (awardsRes.ok) setAwards(await awardsRes.json());

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [salon.id, user.email]);

  useEffect(() => {
    loadSubmissionData();
  }, [loadSubmissionData]);

  const handleEntrySubmit = async (portfolioId: number, category: string) => {
    if (!category) return alert("Válassz kategóriát!");
    try {
      const res = await fetch(`${BACKEND_URL}/api/salon-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId: salon.id, userEmail: user.email, portfolioId, category })
      });
      if (res.ok) {
        loadSubmissionData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (e) {
      alert("Hálózati hiba!");
    }
  };

  const handleEntryRemove = async (entryId: number) => {
    if (!window.confirm("Biztosan törlöd ezt az archivált/leadott nevezést?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/salon-entries/${entryId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email })
      });
      if (res.ok) loadSubmissionData();
    } catch (e) {
      alert("Hálózati hiba!");
    }
  };

  const handleSaveResult = async (entryId: number) => {
    const edit = resultsEdit[entryId];
    try {
      const res = await fetch(`${BACKEND_URL}/api/salon-entries/${entryId}/results`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          awardId: edit.awardId ? Number(edit.awardId) : null,
          achievedScore: edit.achieved ? Number(edit.achieved) : null,
          acceptanceScore: edit.acceptance ? Number(edit.acceptance) : null,
          userEmail: user.email
        })
      });
      if (res.ok) {
        alert("Eredmény sikeresen elmentve!");
        loadSubmissionData();
      } else {
        alert("Hiba az eredmény mentésekor!");
      }
    } catch (e) {
      alert("Hálózati hiba!");
    }
  };

  // ÚJ 1: Okoskereső szűrése a portfólióhoz (Cím és AI Tagek alapján)
  const filteredPortfolio = useMemo(() => {
    if (!searchQuery) return portfolio;
    const lowerQuery = searchQuery.toLowerCase();
    return portfolio.filter(p => {
      const matchTitle = p.title && p.title.toLowerCase().includes(lowerQuery);
      const matchTags = p.ai_tags && p.ai_tags.toLowerCase().includes(lowerQuery);
      return matchTitle || matchTags;
    });
  }, [portfolio, searchQuery]);

 // ÚJ 2: Már leadott képek okos sorrendezése (Súlyozott pontozással a valós adatbázis ID-k alapján)
  const sortedEntries = useMemo(() => {
    // Biztonsági ellenőrzés: ha a lista véletlenül nem tömb, ne omoljon össze
    if (!myEntries || !Array.isArray(myEntries)) return [];

    return [...myEntries].sort((a, b) => {
      
      const calculateScore = (entry: any) => {
        let score = 0;
        
        // 1. Biztonságos számmá alakítás (a NULL, undefined és üres string kezelése)
        const awardId = (entry.award_id !== null && entry.award_id !== undefined && entry.award_id !== '') 
          ? Number(entry.award_id) 
          : null;

        // 2. Díjak és elfogadások pontozása
        // Ha van értékelés, és az nem 15 (elutasított), és nem 0
        if (awardId !== null && awardId !== 15 && awardId !== 0) {
          if (awardId === 1) {
            score += 1; // Sima elfogadás (Acceptance)
          } else {
            score += 3; // Valódi díj (PSA Silver, stb.) - Nagyobb súlyt kap!
          }
        }

        // 3. Ha esetleg nincs award_id megadva, de a pontok be vannak írva (és nem 15-ös)
        const hasScores = entry.achieved_score !== null && entry.achieved_score !== '' && 
                          entry.acceptance_score !== null && entry.acceptance_score !== '';
                          
        if (hasScores && awardId !== 15) {
          const achieved = Number(entry.achieved_score);
          const acceptance = Number(entry.acceptance_score);
          // Ha elérte a határt, és még nem kapott pontot fentebb
          if (achieved >= acceptance && score === 0) {
            score += 1; 
          }
        }

        return score;
      };

      // Csökkenő sorrend (a legtöbb pontot kapott képek kerülnek legelőre)
      return calculateScore(b) - calculateScore(a);
    });
  }, [myEntries]);

      // Csökkenő sorrendbe rendezzük a pontszámok alapján (legtöbb pont van legelöl)
      return calculateScore(b) - calculateScore(a);
    });
  }, [myEntries]);

  if (!salon) return null;

  return (
    <div onClick={(e) => { if(e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div style={{ background: '#1e293b', border: '1px solid #60a5fa', borderRadius: '16px', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer', fontWeight: 'bold', zIndex: 10 }}>×</button>
        
        <div style={{ padding: '30px' }}>
          
          {isSubmitting ? (
            /* --- NEVEZÉSI FELÜLET (Portfólió választó AI Keresővel) --- */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <button onClick={() => setIsSubmitting(false)} style={{ background: 'transparent', color: '#60a5fa', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  ← Vissza a részletekhez
                </button>
                
                <input 
                  type="text" 
                  placeholder="🔍 Keresés cím, AI tag vagy értékelés alapján..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1, minWidth: '250px', padding: '8px 15px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white' }}
                />
              </div>
              
              <h2 style={{ color: '#f8fafc', margin: '0 0 10px 0' }}>Képek kiválasztása</h2>
              <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
                {isPastDeadline ? "Visszamenőleges archiválás a saját portfóliódból:" : "Válassz a saját portfóliódból a nevezéshez:"}
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                {filteredPortfolio.map(photo => {
                  const imageUrl = getImageUrl(photo.drive_file_id, photo.file_url);
                  const submittedEntry = myEntries.find(e => e.id === photo.id); 

                  return (
                    <div key={photo.id} style={{ background: '#0f172a', borderRadius: '12px', overflow: 'hidden', border: submittedEntry ? '2px solid #10b981' : '1px solid #334155' }}>
                      <div style={{ height: '140px', width: '100%', background: '#1e293b' }}>
                        <img src={imageUrl} alt={photo.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: submittedEntry ? 0.6 : 1 }} />
                      </div>
                      <div style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '0.85rem', marginBottom: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{photo.title}</div>
                        {submittedEntry ? (
                          <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>✅ {isPastDeadline ? 'Archiválva ide' : 'Már nevezve ide'}</div>
                        ) : (
                          <select id={`cat-select-${photo.id}`} style={{ width: '100%', padding: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '4px', fontSize: '0.8rem' }} onChange={(e) => handleEntrySubmit(photo.id, e.target.value)}>
                            <option value="">-- Hozzáadás kategóriához --</option>
                            {salon.categories?.map((c: string) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                  )
                })}
                {filteredPortfolio.length === 0 && <p style={{ color: '#94a3b8' }}>Nincs a keresésnek megfelelő kép.</p>}
              </div>
            </div>
          ) : (
            /* --- FŐ ADATLAP + NEVEZÉSEK ÖSSZEGZÉSE --- */
            <>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
                {salon.patron_details && salon.patron_details.length > 0 ? (
                  salon.patron_details.map((p: any) => <span key={p.name} style={{ background: '#a78bfa20', color: '#a78bfa', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid #a78bfa50' }}>{p.name}</span>)
                ) : null}
                {salon.is_circuit === 1 && <span style={{ background: '#f59e0b20', color: '#f59e0b', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid #f59e0b50' }}>Körverseny</span>}
                {isPastDeadline && <span style={{ background: '#ef444420', color: '#ef4444', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid #ef444450' }}>Lezárult (Archívum)</span>}
              </div>
              
              <h2 style={{ color: '#f8fafc', fontSize: '1.8rem', margin: '0 0 15px 0' }}>{salon.name}</h2>
              
              {/* Saját nevezések szekció (Eredmény rögzítéssel) */}
              {sortedEntries.length > 0 && (
                <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #10b98150', marginBottom: '30px' }}>
                  <h3 style={{ color: '#10b981', fontSize: '1.1rem', marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    ✅ Rögzített képeid ({sortedEntries.length} db)
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
                    {sortedEntries.map(entry => {
                      const editState = resultsEdit[entry.entry_id] || { awardId: '', achieved: '', acceptance: '' };
                      const hasAward = entry.award_id !== null && entry.award_id !== undefined;

                      return (
                        <div key={entry.entry_id} style={{ position: 'relative', background: '#1e293b', borderRadius: '8px', overflow: 'hidden', border: hasAward ? '2px solid #f59e0b' : '1px solid #334155' }}>
                          <img src={getImageUrl(entry.drive_file_id, entry.file_url)} alt={entry.title} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                          
                          <div style={{ padding: '10px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#f8fafc', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.title}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '10px' }}>Kategória: {entry.category}</div>
                            
                            {/* --- EREDMÉNY RÖGZÍTŐ BLOKK --- */}
                            <div style={{ background: '#0f172a', padding: '8px', borderRadius: '6px', border: '1px solid #475569' }}>
                              <div style={{ fontSize: '0.7rem', color: '#60a5fa', marginBottom: '5px', fontWeight: 'bold' }}>Eredmény rögzítése:</div>
                              
                              <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
                                <input 
                                  type="number" 
                                  placeholder="Elért pont" 
                                  value={editState.achieved}
                                  onChange={e => setResultsEdit({...resultsEdit, [entry.entry_id]: {...editState, achieved: e.target.value}})}
                                  style={{ width: '50%', padding: '4px', fontSize: '0.75rem', background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '4px' }}
                                />
                                <input 
                                  type="number" 
                                  placeholder="Elfogadási határ" 
                                  value={editState.acceptance}
                                  onChange={e => setResultsEdit({...resultsEdit, [entry.entry_id]: {...editState, acceptance: e.target.value}})}
                                  style={{ width: '50%', padding: '4px', fontSize: '0.75rem', background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '4px' }}
                                />
                              </div>

                              <select 
                                value={editState.awardId}
                                onChange={e => setResultsEdit({...resultsEdit, [entry.entry_id]: {...editState, awardId: e.target.value}})}
                                style={{ width: '100%', padding: '5px', fontSize: '0.75rem', background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '4px', marginBottom: '8px' }}
                              >
                                <option value="">Nincs díj / Elutasítva</option>
                                {awards.map(a => (
                                  <option key={a.id} value={a.id}>{a.award_name}</option>
                                ))}
                              </select>

                              <button 
                                onClick={() => handleSaveResult(entry.entry_id)}
                                style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                              >
                                Eredmény Mentése
                              </button>
                            </div>

                            <button onClick={() => handleEntryRemove(entry.entry_id)} style={{ position: 'absolute', top: '5px', right: '5px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>×</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Nevezés / Archiválás gomb */}
              <button 
                onClick={() => setIsSubmitting(true)}
                style={{ width: '100%', background: isPastDeadline ? '#475569' : '#38bdf8', color: isPastDeadline ? '#e2e8f0' : '#0f172a', border: 'none', padding: '15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '30px', transition: 'background 0.2s' }}
              >
                {isPastDeadline ? 'Képek Visszamenőleges Archiválása 📁' : sortedEntries.length > 0 ? 'További képek nevezése...' : 'Képek Nevezése a Portfóliómból 🚀'}
              </button>

              {/* Szalon adatok... */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Határidő</div>
                  <div style={{ fontSize: '1.2rem', color: isPastDeadline ? '#94a3b8' : '#ef4444', fontWeight: 'bold' }}>{new Date(salon.end_date).toLocaleDateString('hu-HU')}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Díj</div>
                  <div style={{ fontSize: '1.2rem', color: '#10b981', fontWeight: 'bold' }}>{salon.fee_amount > 0 ? `${salon.fee_amount} ${salon.fee_currency}` : 'Ingyenes'}</div>
                </div>
              </div>

              {salon.website && (
                <a href={salon.website} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', background: '#60a5fa', color: '#0f172a', textDecoration: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>
                  Hivatalos weboldal megnyitása 🌐
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
