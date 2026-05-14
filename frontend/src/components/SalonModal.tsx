import { useState, useEffect, useCallback } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { getFlagEmoji, getImageUrl } from '../utils/helpers';

interface SalonModalProps {
  salon: any;
  user: any;
  onClose: () => void;
}

export default function SalonModal({ salon, user, onClose }: SalonModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [myEntries, setMyEntries] = useState<any[]>([]);
  const [awards, setAwards] = useState<any[]>([]); // ÚJ: Díjak listája
  const [isLoading, setIsLoading] = useState(false);

  // ÚJ: Állapot a képenkénti eredmények szerkesztéséhez
  const [resultsEdit, setResultsEdit] = useState<Record<number, { awardId: string, achieved: string, acceptance: string }>>({});

  const isEnded = new Date(salon.end_date) < new Date(new Date().setHours(0,0,0,0));

  // Adatok betöltése
  const loadSubmissionData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Portfólió lekérése
      const portRes = await fetch(`${BACKEND_URL}/api/my-album?userEmail=${user.email}`);
      if (portRes.ok) setPortfolio(await portRes.json());

      // 2. Már leadott nevezések lekérése
      const entryRes = await fetch(`${BACKEND_URL}/api/salon-entries/${salon.id}?userEmail=${user.email}`);
      if (entryRes.ok) {
        const entries = await entryRes.json();
        setMyEntries(entries);
        
        // Inicializáljuk a szerkesztő állapotot az adatbázisból jövő értékekkel
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

      // 3. ÚJ: Választható díjak lekérése
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
    if (!window.confirm("Biztosan visszavonod a nevezést?")) return;
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

  // ÚJ: Eredmények mentése a backend felé
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

  if (!salon) return null;

  return (
    <div onClick={(e) => { if(e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div style={{ background: '#1e293b', border: '1px solid #60a5fa', borderRadius: '16px', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer', fontWeight: 'bold', zIndex: 10 }}>×</button>
        
        <div style={{ padding: '30px' }}>
          
          {isSubmitting ? (
            /* --- NEVEZÉSI FELÜLET (Portfólió választó) --- */
            <div>
              <button onClick={() => setIsSubmitting(false)} style={{ background: 'transparent', color: '#60a5fa', border: 'none', padding: '0 0 20px 0', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                ← Vissza a szalon részleteihez
              </button>
              
              <h2 style={{ color: '#f8fafc', margin: '0 0 10px 0' }}>Képek kiválasztása</h2>
              <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Válassz a saját portfóliódból:</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                {portfolio.map(photo => {
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
                          <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>✅ Már nevezve ide</div>
                        ) : (
                          <select id={`cat-select-${photo.id}`} style={{ width: '100%', padding: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '4px', fontSize: '0.8rem' }} onChange={(e) => handleEntrySubmit(photo.id, e.target.value)}>
                            <option value="">-- Nevezés kategóriába --</option>
                            {salon.categories?.map((c: string) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* --- FŐ ADATLAP + NEVEZÉSEK ÖSSZEGZÉSE --- */
            <>
              {/* Fejléc infók... */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
                {salon.patron_details && salon.patron_details.length > 0 ? (
                  salon.patron_details.map((p: any) => <span key={p.name} style={{ background: '#a78bfa20', color: '#a78bfa', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid #a78bfa50' }}>{p.name}</span>)
                ) : null}
                {salon.is_circuit === 1 && <span style={{ background: '#f59e0b20', color: '#f59e0b', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid #f59e0b50' }}>Körverseny</span>}
              </div>
              
              <h2 style={{ color: '#f8fafc', fontSize: '1.8rem', margin: '0 0 15px 0' }}>{salon.name}</h2>
              
              {/* Saját nevezések szekció (Eredmény rögzítéssel) */}
              {myEntries.length > 0 && (
                <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #10b98150', marginBottom: '30px' }}>
                  <h3 style={{ color: '#10b981', fontSize: '1.1rem', marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    ✅ Leadott nevezéseid ({myEntries.length} db)
                  </h3>
                  
                  {/* A kártyák szélességét picit növeltem, hogy kiférjenek a beviteli mezők */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
                    {myEntries.map(entry => {
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

                            {!isEnded && (
                              <button onClick={() => handleEntryRemove(entry.entry_id)} style={{ position: 'absolute', top: '5px', right: '5px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Nevezés gomb */}
              <button 
                onClick={() => setIsSubmitting(true)}
                disabled={isEnded}
                style={{ width: '100%', background: isEnded ? '#334155' : '#38bdf8', color: isEnded ? '#94a3b8' : '#0f172a', border: 'none', padding: '15px', borderRadius: '8px', cursor: isEnded ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '30px' }}
              >
                {isEnded ? 'A határidő lejárt' : myEntries.length > 0 ? 'További képek nevezése...' : 'Képek Nevezése a Portfóliómból 🚀'}
              </button>

              {/* Szalon adatok... */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Határidő</div>
                  <div style={{ fontSize: '1.2rem', color: isEnded ? '#94a3b8' : '#ef4444', fontWeight: 'bold' }}>{new Date(salon.end_date).toLocaleDateString('hu-HU')}</div>
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
