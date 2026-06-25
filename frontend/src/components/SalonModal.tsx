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
  const [resultsEdit, setResultsEdit] = useState<Record<number, { awardId: string, achieved: string, acceptance: string }>>({});

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
      if (res.ok) loadSubmissionData();
      else { const err = await res.json(); alert(err.error); }
    } catch (e) { alert("Hálózati hiba!"); }
  };

  // 🎯 GOLYÓÁLLÓ JAVÍTVA: Az email címet törzsből query paraméterbe mozgattuk át,
  // kiküszöbölve a felhős szerverek DELETE-body csonkítási problémáját.
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
      if (res.ok) { alert("Eredmény sikeresen elmentve!"); loadSubmissionData(); }
      else alert("Hiba az eredmény mentésekor!");
    } catch (e) { alert("Hálózati hiba!"); }
  };

  // GYORSÍTÓTÁR a myEntries ellenőrzéséhez (O(1) komplexitás O(N) helyett!)
  const submittedIds = useMemo(() => new Set(myEntries.map(e => e.id)), [myEntries]);

  // PORTFÓLIÓ RENDEZÉSE (A Te saját, jól működő kódod optimalizálva!)
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

  // RÖGZÍTETT EREDMÉNYEK RENDEZÉSE (Valós ID-k alapján, csökkenő sorrendben)
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
              
              {/* Saját nevezések szekció (Eredmény rögzítéssel) */}
              {sortedEntries.length > 0 && (
                <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #10b98150', marginBottom: '30px' }}>
                  <h3 style={{ color: '#10b981', fontSize: '1.1rem', marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    ✅ Rögzített képeid ({sortedEntries.length} db)
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
                    {sortedEntries.map(entry => {
                      const editState = resultsEdit[entry.entry_id] || { awardId: '', achieved: '', acceptance: '' };
                      const hasAward = entry.award_id !== null && entry.award_id !== undefined && Number(entry.award_id) !== 15 && Number(entry.award_id) !== 0;

                      return (
                        <div key={entry.entry_id} style={{ position: 'relative', background: '#1e293b', borderRadius: '8px', overflow: 'hidden', border: hasAward ? '2px solid #f59e0b' : '1px solid #334155' }}>
                          <img src={getImageUrl(entry.drive_file_id, entry.file_url)} alt={entry.title} loading="lazy" style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                          
                          <div style={{ padding: '10px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#f8fafc', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.title}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '10px' }}>Kategória: {entry.category}</div>
                            
                            <div style={{ background: '#0f172a', padding: '8px', borderRadius: '6px', border: '1px solid #475569' }}>
                              <div style={{ fontSize: '0.7rem', color: '#60a5fa', marginBottom: '5px', fontWeight: 'bold' }}>Eredmény rögzítése:</div>
                              
                              <div style={{ display: 'flex', gridTemplateColumns: '1fr 1fr', gap: '6px 15px', color: '#94a3b8', width: '100%' }}>
                                <div> {t('mapExifCamera')} <b style={{ color: entry.exif?.isLegacy ? '#475569' : '#f8fafc', display: 'block', overflowWrap: 'break-word' }}>{entry.exif?.camera}</b></div>
                                <div> {t('mapExifLens')} <b style={{ color: entry.exif?.isLegacy ? '#475569' : '#f8fafc', display: 'block', overflowWrap: 'break-word' }}>{entry.exif?.lens}</b></div>
                                <div> {t('roomShutterIso')} <b style={{ color: entry.exif?.isLegacy ? '#475569' : '#38bdf8', display: 'block' }}>{entry.exif?.shutter} / {entry.exif?.iso}</b></div>
                                <div> {t('roomSoftware')} <b style={{ color: entry.exif?.isLegacy ? '#475569' : '#a78bfa', display: 'block', overflowWrap: 'break-word' }}>{entry.exif?.software}</b></div>
                              </div>
                            </div>
                          </div>
                          <div className="batch-vote-responsive-buttons">
                            {[
                              { type: 'pass', label: t('roomVotePass').split(' ')[0], score: '0 pont', bg: '#334155' },
                              { type: 'super', label: t('roomVoteSuper'), score: `+${userPower?.super} pont`, bg: '#1e3a8a' },
                              { type: 'brilliant', label: t('roomVoteBrilliant'), score: `+${userPower.brilliant} pont`, bg: '#f97316' },
                              ...(isMaster ? [{ type: 'master', label: t('statusMaster'), score: '+10 pont', bg: '#fbbf24' }] : [])
                            ].map(btn => {
                              const isCurrentActive = selectedVote === btn.type;
                              return (
                                <button key={btn.type} onClick={() => setPendingVotes(prev => ({ ...prev, [entry.id]: btn.type as any }))} style={{ padding: '6px 10px', borderRadius: '10px', border: isCurrentActive ? `2px solid white` : '1px solid #334155', background: isCurrentActive ? btn.bg : 'transparent', color: isCurrentActive ? 'white' : '#94a3b8', fontWeight: 'bold', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '80px', flex: '1 1 calc(33.33% - 8px)', transition: 'all 0.1s' }}>
                                  <span>{btn.label}</span>
                                  <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{btn.score}</span>
                                </button>
                              );
                            })}
                            <button onClick={() => handleOffTopicReport(entry.id)} style={{ padding: '6px 10px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'transparent', color: '#ef4444', fontWeight: 'bold', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '80px', flex: '1 1 calc(100% - 8px)' }}>
                              <span>{t('roomReportBtn').split(' ')[0]}</span>
                              <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>AI / Off-Topic</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div style={{ marginTop: '35px', borderTop: '1px solid #334155', paddingTop: '25px', textAlign: 'center' }}>
                <button onClick={handleBatchSubmit} disabled={isSubmittingBatch || Object.keys(pendingVotes).length < batchVoteEntries.length} style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: Object.keys(pendingVotes).length === batchVoteEntries.length ? 'linear-gradient(135deg, #10b981, #059669)' : '#334155', color: Object.keys(pendingVotes).length === batchVoteEntries.length ? 'white' : '#64748b', fontSize: '1.2rem', fontWeight: '900', cursor: Object.keys(pendingVotes).length === batchVoteEntries.length ? 'pointer' : 'not-allowed', boxShadow: Object.keys(pendingVotes).length === batchVoteEntries.length ? '0 10px 25px rgba(16,185,129,0.3)' : 'none', transition: 'all 0.3s' }}>
                  {isSubmittingBatch ? '⏳ Processing...' : `${t('roomBatchSubmitBtn')} (${Object.keys(pendingVotes).length} / ${batchVoteEntries.length})`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 🎚️ JOBB HASÁB: STATISZTIKÁK ÉS RANGSOROK */}
      <div className="arena-layout-column-side">
        
        {/* SAJÁT NEVEZÉS SZEKCIÓ */}
        <div className="arena-responsive-card" style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.4rem', fontWeight: 'bold' }}> {t('roomMyEntry')}</h3>
            <span style={{ fontSize: '0.85rem', background: '#be123c30', color: '#fb7185', border: '1px solid #be123c60', padding: '4px 12px', borderRadius: '50px', fontWeight: 'bold' }}>
              {t('roomJokerSwaps').replace('{count}', String(swapBalance))}
            </span>
          </div>

          {isMaster ? (
            <div style={{ padding: '30px 15px', background: 'linear-gradient(135deg, #4c1d9520, #1e1b4b40)', border: '1px solid #a78bfa40', borderRadius: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>👑</div>
              <h4 style={{ color: '#a78bfa', margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 'bold' }}>{t('roomYouAreMaster')}</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, lineHeight: '1.6' }}>{t('roomYouAreMasterDesc')}</p>
            </div>
          ) : myEntry ? (
            <div>
              <div style={{ width: '100%', height: '220px', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)' }}>
                <img src={getImageUrl(myEntry?.drive_file_id, myEntry?.file_url)} alt="My submission" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={handleImageError} />
              </div>
              
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${exposureColor || '#ef4444'}` }}>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#f59e0b', fontSize: '1.5rem', fontWeight: '900' }}>{myEntry?.likes_count || 0} ⭐</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#38bdf8', fontSize: '1.5rem', fontWeight: '900' }}>{myEntry?.views_count || 0} 👁️</div></div>
              </div>

              {swapBalance > 0 ? (
                <div style={{ marginTop: '25px', background: 'linear-gradient(145deg, #4c1d9515, #be123c15)', padding: '20px', borderRadius: '18px', border: '1px solid #be123c30', textAlign: 'center' }}>
                  <h5 style={{ margin: '0 0 8px 0', color: '#f43f5e', fontSize: '1.1rem', fontWeight: 'bold' }}>{t('roomSwapTitle')}</h5>
                  <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '0 0 15px 0', lineHeight: '1.4' }}>{t('roomSwapDesc')}</p>
                  
                  <button disabled={isSwapping || isLoadingSwapAlbum} onClick={onOpenAlbumForSwap} style={{ width: '100%', maxWidth: '280px', margin: '0 auto', background: 'linear-gradient(135deg, #e11d48, #be123c)', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(225,29,72,0.2)', display: 'block' }}>
                    🔄 {t('roomSwapGalleryBtn')}
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: '25px', padding: '15px', background: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>
                  {t('msgNoSwapsLeft')}
                </div>
              )}

              {myPastEntries && myPastEntries.length > 0 && (
                <div style={{ marginTop: '25px' }}>
                  <h4 style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {t('roomPastEntriesTitle', 'Korábbi verzióid ebben a futamban')}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {myPastEntries.map((past) => (
                      <div key={past.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0f172a', padding: '8px 12px', borderRadius: '10px', border: '1px solid #223147' }}>
                        <img src={getImageUrl(past.drive_file_id, past.file_url)} alt="" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', color: '#f8fafc', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{past.title}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {past.likes_count} ⭐ • {past.views_count} 👁️ • Váltás #{past.swapped}
                          </div>
                        </div>
                        <button disabled={isSwapping || swapBalance < 1} onClick={() => handleSwapBackSubmit(past.id)} style={{ padding: '6px 12px', background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b50', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                          {t('btnSwapBack', 'Visszaváltás')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ width: '100%', padding: '40px 20px', background: '#0f172a', borderRadius: '16px', border: '2px dashed #334155', textAlign: 'center', marginBottom: '25px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🖼️</div>
                <h3 style={{ color: '#cbd5e1', margin: '0 0 8px 0' }}>{t('roomNoEntryTitle')}</h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '280px', margin: '0 auto 20px auto' }}>{t('roomNoEntryDesc')}</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '240px', margin: '0 auto' }}>
                  <button onClick={() => { setAlbumModalMode('upload'); setShowSwapAlbumModal(true); }} style={{ width: '100%', padding: '10px 16px', background: 'linear-gradient(135deg, #38bdf8, #0284c7)', color: '#0f172a', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}>
                    📥 {t('roomBtnSelectFromAlbum')}
                  </button>
                  
                  <label style={{ width: '100%', boxSizing: 'border-box', padding: '10px 16px', background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', display: 'block', textAlign: 'center' }}>
                    📷 {t('roomBtnUploadNewFile')}
                    <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileSelect} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              {uploadPreview && (
                <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #223147', animation: 'fadeIn 0.2s ease' }}>
                  <h4 style={{ color: 'white', margin: '0 0 15px 0', fontSize: '1rem', fontWeight: 'bold' }}>{t('roomUploadPreviewTitle')}</h4>
                  <div style={{ width: '100%', height: '200px', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                    <img src={uploadPreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>

                  {uploadCamera && (
                    <div style={{ background: '#1e293b50', padding: '12px', borderRadius: '10px', border: '1px solid #223147', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 15px', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '15px' }}>
                      <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>📷 {t('mapExifCamera')} <b>{uploadCamera}</b></div>
                      <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>📐 {t('mapExifLens')} <b>{uploadLens || '-'}</b></div>
                      <div>⏱️ {t('roomShutterIso').split(' / ')[0]} <b>{uploadShutter || '-'}</b></div>
                      <div>💎 ISO: <b>{uploadIso || '-'}</b></div>
                    </div>
                  )}

                  <button disabled={isUploading} onClick={handleUpload} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                    {isUploading ? '⏳ Uploading...' : t('btnSubmitEntry')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {!isMaster && (
          <div className="arena-responsive-card" style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Láthatósági Index</h4>
            <div style={{ position: 'relative', width: '100%', maxWidth: '180px', height: '105px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <svg viewBox="0 0 200 120" style={{ width: '100%', height: 'auto', display: 'block' }}>
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#0f172a" strokeWidth="16" strokeLinecap="round" />
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={exposureColor || '#ef4444'} strokeWidth="16" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - (exposurePercentage || 0)} style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
              </svg>
              <div style={{ position: 'absolute', bottom: '5px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.7rem', fontWeight: '900', color: '#f8fafc', letterSpacing: '-0.5px' }}>{Math.round(exposurePercentage || 0)}%</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 'bold', color: exposureColor, textTransform: 'uppercase', marginTop: '2px' }}>{getTranslatedExposureLabel(exposureLabel)}</div>
              </div>
            </div>
          </div>
        )}

        <div className="arena-responsive-card" style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #1e293b', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#10b981', fontSize: '1.3rem', fontWeight: 'bold' }}> {t('roomClubLeague')}</h3>
            <span style={{ fontSize: '0.75rem', background: '#ef4444', color: 'white', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold' }}>{t('roomLiveBadge')}</span>
          </div>
          {safeClubLeaderboard.length === 0 ? (
            <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px', background: '#0f172a', borderRadius: '16px' }}>{t('roomNoClubsYet')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {safeClubLeaderboard.map((club, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '12px', borderRadius: '12px', border: '1px solid #223147' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: '900', width: '25px', color: index === 0 ? '#fbbf24' : '#cbd5e1', textAlign: 'center' }}>{index + 1}</div>
                  <div style={{ flex: 1, marginLeft: '10px', minWidth: 0 }}>
                    <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{club?.club_name || 'Unknown Club'}</div>
                  </div>
                  <div style={{ color: '#10b981', fontWeight: '900', fontSize: '1.1rem' }}>{club?.total_score || 0} FP</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="arena-responsive-card" style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #1e293b', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#f59e0b', fontSize: '1.3rem', fontWeight: 'bold' }}>📊 {t('roomBlindLeaderboard')}</h3>
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 15px 0', lineHeight: '1.4' }}>{t('roomBlindLeaderboardDesc')}</p>
          {safeLeaderboard.length === 0 ? (
            <div style={{ color: '#94a3b8', textAlign: 'center', padding: '30px', background: '#0f172a', borderRadius: '16px' }}>{t('roomArenaEmpty')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[...safeLeaderboard].sort((a, b) => (b.fair_score || b.likes_count || 0) - (a.fair_score || a.likes_count || 0)).map((entry, index) => {
                const isMe = entry?.user_email === user?.email;
                const showUnblinded = isMe || isMaster; 
                const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#cd7f32' : '#475569';
                return (
                  <div key={entry?.id || index} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: isMe ? '1px solid #f59e0b50' : '1px solid #223147', padding: '10px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: '900', width: '25px', color: rankColor, textAlign: 'center' }}>{index + 1}</div>
                    <div onClick={() => showUnblinded ? setFullscreenData({url: getImageUrl(entry?.drive_file_id, entry?.file_url), title: entry?.user_name || ''}) : null} style={{ width: '40px', height: '40px', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', margin: '0 10px', cursor: showUnblinded ? 'zoom-in' : 'default', position: 'relative' }}>
                      <img src={getImageUrl(entry?.drive_file_id, entry?.file_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: showUnblinded ? 'none' : 'blur(4px)' }} onError={handleImageError} loading="lazy" />
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: isMe ? '#f8fafc' : '#94a3b8', fontWeight: 'bold', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {showUnblinded ? (entry?.user_name || '') : t('roomEncryptedOpponent')}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                        {t('roomViews') || 'Nézettség'}: {entry?.views_count || 0}
                        {entry.votes_cast !== undefined && (
                          <span> • {lang === 'en' ? 'Voted' : 'Szavazott'}: <strong style={{ color: Number(entry.votes_cast) === 0 ? '#ef4444' : '#38bdf8' }}>{entry.votes_cast} db</strong></span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right', minWidth: '90px' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: isMe ? '#f97316' : '#fbbf24' }}>
                        {entry.fair_score !== undefined ? `${entry.fair_score} FP` : `${entry.likes_count || 0} ⭐`}
                      </div>
                      {entry.fair_score !== undefined && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>
                          {entry.likes_count || 0} ⭐
                        </div>
                      )}
                    </div>
                  </div>
                );
              }).slice(0, 15)}
            </div>
          )}
        </div>
      </div>

      {/* INSPECTOR MODÁL */}
      {selectedExifPhoto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,13,22,0.96)', backdropFilter: 'blur(20px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#1e293b', width: '100%', maxWidth: '1000px', maxHeight: '90vh', borderRadius: '24px', border: '1px solid #475569', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, color: 'white', fontSize: '1.3rem', fontWeight: 'bold' }}> {t('roomInspectorTitle')}</h4>
              <button onClick={() => setSelectedExifPhoto(null)} style={{ background: '#334155', color: '#cbd5e1', border: 'none', width: '36px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ flex: 1, backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src={selectedExifPhoto.file_url} alt="" style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain' }} loading="lazy" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
