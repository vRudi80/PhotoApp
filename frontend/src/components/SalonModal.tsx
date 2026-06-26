import { useState, useEffect, useCallback, useMemo } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { getImageUrl, getFlagImageUrl } from '../utils/helpers';

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
  
  const [searchQuery, setSearchQuery] = useState('');
  // 🎯 MÓDOSÍTVA: A resultsEdit állapottípus kiegészítve customAward mezővel
  const [resultsEdit, setResultsEdit] = useState<Record<number, { awardId: string, achieved: string, acceptance: string, customAward: string }>>({});

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
          // 🎯 MÓDOSÍTVA: Betöltjük a meglévő egyedi díjat (custom_award) is a háttérből
          initialEdits[e.entry_id] = {
            awardId: e.award_id ? String(e.award_id) : '',
            achieved: e.achieved_score !== null ? String(e.achieved_score) : '',
            acceptance: e.acceptance_score !== null ? String(e.acceptance_score) : '',
            customAward: e.custom_award || ''
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
      if (res.ok) loadSubmissionData();
      else { const err = await res.json(); alert(err.error); }
    } catch (e) { alert("Hálózati hiba!"); }
  };

  // 🎯 FIXÁLVA: Biztonságos DELETE kérés query paraméterrel a Vercel body-csonkítása ellen
  const handleEntryRemove = async (entryId: number) => {
    if (!window.confirm("Biztosan törlöd ezt az archivált/leadott nevezést?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/salon-entries/${entryId}?userEmail=${encodeURIComponent(user.email)}`, {
        method: 'DELETE'
      });
      if (res.ok) loadSubmissionData();
    } catch (e) { alert("Hálózati hiba!"); }
  };

  const handleSaveResult = async (entryId: number) => {
    // Biztonsági mentés üres mezők esetére
    const edit = resultsEdit[entryId] || { awardId: '', achieved: '', acceptance: '', customAward: '' };
    try {
      const res = await fetch(`${BACKEND_URL}/api/salon-entries/${entryId}/results`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          awardId: edit.awardId ? Number(edit.awardId) : null,
          achievedScore: edit.achieved ? Number(edit.achieved) : null,
          acceptanceScore: edit.acceptance ? Number(edit.acceptance) : null,
          customAward: edit.customAward || null, // 🎯 ÚJ: Átküldjük az egyedi beírt díj nevét a backendnek
          userEmail: user.email
        })
      });
      if (res.ok) { alert("Eredmény sikeresen elmentve!"); loadSubmissionData(); }
      else alert("Hiba az eredmény mentésekor!");
    } catch (e) { alert("Hálózati hiba!"); }
  };

  // GYORSÍTÓTÁR a myEntries ellenőrzéséhez (O(1) komplexitás)
  const submittedIds = useMemo(() => new Set(myEntries.map(e => e.portfolio_id)), [myEntries]);

  // PORTFÓLIÓ RENDEZÉSE
  const filteredPortfolio = useMemo(() => {
    let result = [...portfolio];
    
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(p => {
        const matchTitle = p.title && p.title.toLowerCase().includes(lowerQuery);
        const matchTags = p.ai_tags && p.ai_tags.toLowerCase().includes(lowerQuery);
        return matchTitle || matchTags;
      });
    }

    return result.sort((a, b) => {
      const getGlobalScore = (photo: any) => {
        const awards = Number(photo.award_count || photo.awards || photo.total_awards || 0);
        const acceptances = Number(photo.acceptance_count || photo.acceptances || photo.total_acceptances || 0);
        return (awards * 3) + acceptances;
      };

      const scoreA = getGlobalScore(a);
      const scoreB = getGlobalScore(b);

      if (scoreB === scoreA) return b.id - a.id;
      return scoreB - scoreA;
    });
  }, [portfolio, searchQuery]);

  // RÖGZÍTETT EREDMÉNYEK RENDEZÉSE
  const sortedEntries = useMemo(() => {
    if (!myEntries || !Array.isArray(myEntries)) return [];
    return [...myEntries].sort((a, b) => {
      const calculateScore = (entry: any) => {
        let score = 0;
        const awardId = (entry.award_id !== null && entry.award_id !== undefined && entry.award_id !== '') ? Number(entry.award_id) : null;
        if (awardId !== null && awardId !== 15 && awardId !== 0) {
          score += (awardId === 1) ? 1 : 3;
        }
        const hasScores = entry.achieved_score !== null && entry.achieved_score !== '' && entry.acceptance_score !== null && entry.acceptance_score !== '';
        if (hasScores && awardId !== 15) {
          if (Number(entry.achieved_score) >= Number(entry.acceptance_score) && score === 0) {
            score += 1; 
          }
        }
        return score;
      };
      return calculateScore(b) - calculateScore(a);
    });
  }, [myEntries]);

  if (!salon) return null;

  return (
    <div onClick={(e) => { if(e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div style={{ background: '#1e293b', border: '1px solid #60a5fa', borderRadius: '16px', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer', fontWeight: 'bold', zIndex: 10 }}>×</button>
        
        <div style={{ padding: '30px' }}>
          
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 0', color: '#38bdf8' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '15px', animation: 'spin 2s linear infinite' }}>⏳</div>
              <h3 style={{ color: '#f8fafc', margin: 0 }}>Adatok betöltése...</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '5px' }}>Kis türelmet, a rendszer rendezi az eredményeidet.</p>
            </div>
          ) : isSubmitting ? (
            /* --- NEVEZÉSI FELÜLET --- */
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
                {isPastDeadline ? "Visszamenőleges archiválás a saját portfóliódból (eddigi sikerek szerint rendezve):" : "Válassz a saját portfóliódból a nevezéshez (eddigi sikerek szerint rendezve):"}
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                {filteredPortfolio.map(photo => {
                  const imageUrl = getImageUrl(photo.drive_file_id, photo.file_url);
                  const isSubmitted = submittedIds.has(photo.id); 

                  return (
                    <div key={photo.id} style={{ background: '#0f172a', borderRadius: '12px', overflow: 'hidden', border: isSubmitted ? '2px solid #10b981' : '1px solid #334155' }}>
                      <div style={{ height: '140px', width: '100%', background: '#1e293b' }}>
                        <img src={imageUrl} alt={photo.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isSubmitted ? 0.6 : 1 }} />
                      </div>
                      <div style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '0.85rem', marginBottom: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{photo.title}</div>
                        {isSubmitted ? (
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
            /* --- FŐ ADATLAP --- */
            <>
              {/* Fejléc - Jelvények */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
                {salon.patron_details && salon.patron_details.length > 0 ? (
                  salon.patron_details.map((p: any) => (
                    <span key={p.name} style={{ background: '#a78bfa20', color: '#a78bfa', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid #a78bfa50' }}>
                      {p.name} {p.number ? `[${p.number}]` : ''}
                    </span>
                  ))
                ) : null}
                {salon.is_circuit === 1 && <span style={{ background: '#f59e0b20', color: '#f59e0b', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid #f59e0b50' }}>Körverseny</span>}
                {isPastDeadline && <span style={{ background: '#ef444420', color: '#ef4444', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid #ef444450' }}>Lezárult (Archívum)</span>}
              </div>
              
              <h2 style={{ color: '#f8fafc', fontSize: '1.8rem', margin: '0 0 15px 0' }}>{salon.name}</h2>

              {/* RÉSZLETES INFORMÁCIÓS BLOKK */}
              <div style={{ background: '#0f172a', padding: '20px', borderRadius: '10px', border: '1px solid #334155', marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between' }}>
                  <div style={{ flex: '1 1 150px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 'bold' }}>Rendező Ország</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontWeight: 'bold', fontSize: '0.95rem' }}>
                      {getFlagImageUrl(salon.country_code) ? (
                        <img src={getFlagImageUrl(salon.country_code)} alt="flag" style={{ width: '22px', borderRadius: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }} />
                      ) : '🌐'}
                      <span>{salon.country_hun || salon.country || 'Nemzetközi'}</span>
                    </div>
                  </div>
                  <div style={{ flex: '1 1 150px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 'bold' }}>Leadás Típusa</div>
                    <div style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '0.95rem' }}>
                      {salon.submission_type === 'online' ? '💻 Online feltöltés' : '🖼️ Papírképes leadás'}
                    </div>
                  </div>
                  <div style={{ flex: '1 1 150px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 'bold' }}>Körverseny?</div>
                    <div style={{ color: salon.is_circuit === 1 ? '#f59e0b' : '#f8fafc', fontWeight: 'bold', fontSize: '0.95rem' }}>
                      {salon.is_circuit === 1 ? '🔄 Igen, több szalon' : '❌ Nem (Szimpla)'}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '5px', paddingTop: '15px', borderTop: '1px solid #1e293b' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold' }}>Választható Kategóriák ({salon.categories?.length || 0})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {salon.categories && salon.categories.length > 0 ? (
                      salon.categories.map((cat: string, idx: number) => (
                        <span key={idx} style={{ background: '#1e293b', border: '1px solid #38bdf850', color: '#38bdf8', padding: '4px 12px', borderRadius: '15px', fontSize: '0.85rem' }}>{cat}</span>
                      ))
                    ) : (
                      <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Nincsenek kategóriák megadva</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Saját nevezések szekció */}
              {sortedEntries.length > 0 && (
                <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #10b98150', marginBottom: '30px' }}>
                  <h3 style={{ color: '#10b981', fontSize: '1.1rem', marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    ✅ Rögzített képeid ({sortedEntries.length} db)
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
                    {sortedEntries.map(entry => {
                      // 🎯 MÓDOSÍTVA: Az editState-be bekerült az üres customAward alapállapot is
                      const editState = resultsEdit[entry.entry_id] || { awardId: '', achieved: '', acceptance: '', customAward: '' };
                      const hasAward = entry.award_id !== null && entry.award_id !== undefined && Number(entry.award_id) !== 15 && Number(entry.award_id) !== 0;

                      return (
                        <div key={entry.entry_id} style={{ position: 'relative', background: '#1e293b', borderRadius: '8px', overflow: 'hidden', border: hasAward ? '2px solid #f59e0b' : '1px solid #334155' }}>
                          <img src={getImageUrl(entry.drive_file_id, entry.file_url)} alt={entry.title} loading="lazy" style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                          
                          <div style={{ padding: '10px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#f8fafc', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.title}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '10px' }}>Kategória: {entry.category}</div>
                            
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
                                  placeholder="Elfogadás (pl. 20)" 
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
                                {awards.map(a => <option key={a.id} value={a.id}>{a.award_name}</option>)}
                              </select>

                              {/* 🎯 ÚJ JAVÍTOTT BEVITELI MEZŐ: Csak akkor ugrik fel, ha a user díjat választ (nem üres, nem Acceptance [1] és nem Elutasított/Nincs díj [15]) */}
                              {editState.awardId !== '' && editState.awardId !== '1' && editState.awardId !== '15' && (
                                <input 
                                  type="text" 
                                  placeholder="Kézi díj név (pl. FIAP Gold Medal)" 
                                  value={editState.customAward || ''}
                                  onChange={e => setResultsEdit({...resultsEdit, [entry.entry_id]: {...editState, customAward: e.target.value}})}
                                  style={{ width: '100%', padding: '5px', fontSize: '0.75rem', background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '4px', marginBottom: '8px', boxSizing: 'border-box' }}
                                />
                              )}

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

              <button 
                onClick={() => setIsSubmitting(true)}
                style={{ width: '100%', background: isPastDeadline ? '#475569' : '#38bdf8', color: isPastDeadline ? '#e2e8f0' : '#0f172a', border: 'none', padding: '15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '30px', transition: 'background 0.2s' }}
              >
                {isPastDeadline ? 'Képek Visszamenőleges Archiválása 📁' : sortedEntries.length > 0 ? 'További képek nevezése...' : 'Képek Nevezése a Portfóliómból 🚀'}
              </button>

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
