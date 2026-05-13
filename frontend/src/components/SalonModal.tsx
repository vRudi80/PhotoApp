import { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { getFlagEmoji, getImageUrl } from '../utils/helpers';

interface SalonModalProps {
  salon: any;
  user: any; // ÚJ: Át kell adnunk a usert, hogy tudjuk, ki nevez!
  onClose: () => void;
}

export default function SalonModal({ salon, user, onClose }: SalonModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [myEntries, setMyEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isEnded = new Date(salon.end_date) < new Date(new Date().setHours(0,0,0,0));

  const loadSubmissionData = async () => {
    setIsLoading(true);
    try {
      // 1. Lekérjük a user teljes portfólióját
      const portRes = await fetch(`${BACKEND_URL}/api/my-album?userEmail=${user.email}`);
      if (portRes.ok) setPortfolio(await portRes.json());

      // 2. Lekérjük a már leadott nevezéseket erre a szalonra
      const entryRes = await fetch(`${BACKEND_URL}/api/salon-entries/${salon.id}?userEmail=${user.email}`);
      if (entryRes.ok) setMyEntries(await entryRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSubmitting) loadSubmissionData();
  }, [isSubmitting]);

  const handleEntrySubmit = async (portfolioId: number, category: string) => {
    if (!category) return alert("Válassz kategóriát!");
    try {
      const res = await fetch(`${BACKEND_URL}/api/salon-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId: salon.id, userEmail: user.email, portfolioId, category })
      });
      if (res.ok) {
        loadSubmissionData(); // Frissítjük a listát
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

  if (!salon) return null;

  return (
    <div onClick={(e) => { if(e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div style={{ background: '#1e293b', border: '1px solid #60a5fa', borderRadius: '16px', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer', fontWeight: 'bold', zIndex: 10 }}>×</button>
        
        <div style={{ padding: '30px' }}>
          
          {/* Vissza gomb, ha épp nevezünk */}
          {isSubmitting ? (
            <div>
              <button onClick={() => setIsSubmitting(false)} style={{ background: 'transparent', color: '#60a5fa', border: 'none', padding: '0 0 20px 0', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                ← Vissza a szalon részleteihez
              </button>
              
              <h2 style={{ color: '#f8fafc', margin: '0 0 10px 0' }}>Nevezés: {salon.name}</h2>
              <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Válassz a saját portfóliódból, és oszd be őket a megfelelő kategóriákba!</p>
              
              {isLoading ? (
                <div style={{ color: '#60a5fa', padding: '20px', textAlign: 'center' }}>Adatok betöltése...</div>
              ) : portfolio.length === 0 ? (
                <div style={{ background: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px dashed #334155', textAlign: 'center', color: '#cbd5e1' }}>
                  A portfóliód jelenleg üres. Előbb tölts fel képeket a "Saját Képalbum" menüpontban!
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                  {portfolio.map(photo => {
                    const imageUrl = getImageUrl(photo.drive_file_id, photo.file_url);
                    // Megnézzük, hogy ez a kép be van-e már küldve ide
                    const submittedEntry = myEntries.find(e => e.id === photo.id); 

                    return (
                      <div key={photo.id} style={{ background: '#0f172a', borderRadius: '12px', overflow: 'hidden', border: submittedEntry ? '2px solid #10b981' : '1px solid #334155' }}>
                        <div style={{ height: '150px', width: '100%', background: '#1e293b' }}>
                          <img src={imageUrl} alt={photo.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: submittedEntry ? 0.8 : 1 }} />
                        </div>
                        <div style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '0.9rem', marginBottom: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{photo.title}</div>
                          
                          {submittedEntry ? (
                            <div>
                              <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold', marginBottom: '8px' }}>✅ Nevezve: {submittedEntry.category}</div>
                              <button onClick={() => handleEntryRemove(submittedEntry.entry_id)} style={{ width: '100%', background: '#ef444420', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Visszavonás</button>
                            </div>
                          ) : (
                            <div>
                              <select id={`cat-select-${photo.id}`} style={{ width: '100%', padding: '6px', marginBottom: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '4px', fontSize: '0.8rem' }}>
                                <option value="">-- Kategória --</option>
                                {salon.categories?.map((c: string) => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <button onClick={() => {
                                const selectEl = document.getElementById(`cat-select-${photo.id}`) as HTMLSelectElement;
                                handleEntrySubmit(photo.id, selectEl.value);
                              }} style={{ width: '100%', background: '#38bdf8', color: '#0f172a', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Beküldés</button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            // Eredeti szalon részletek...
            <>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
                {salon.patron_details && salon.patron_details.length > 0 ? (
                  salon.patron_details.map((p: any) => <span key={p.name} style={{ background: '#a78bfa20', color: '#a78bfa', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid #a78bfa50' }}>{p.name} {p.number ? `(${p.number})` : ''}</span>)
                ) : (
                  <span style={{ background: '#334155', color: '#94a3b8', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>Független Pályázat</span>
                )}
                {salon.is_circuit === 1 && <span style={{ background: '#f59e0b20', color: '#f59e0b', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid #f59e0b50' }}>Körverseny</span>}
              </div>
              
              <h2 style={{ color: '#f8fafc', fontSize: '1.8rem', margin: '0 0 15px 0', lineHeight: '1.3' }}>{salon.name}</h2>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', color: '#94a3b8', marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #334155' }}>
                <span>{salon.country_code ? getFlagEmoji(salon.country_code) : '🏳️'}</span>
                <span style={{ fontWeight: 'bold', color: '#cbd5e1' }}>{salon.country_hun}</span>
                <span>•</span>
                <span>{salon.submission_type === 'online' ? '💻 Online leadás' : '🖼️ Papírkép'}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' }}>Feltöltési Határidő</div>
                  <div style={{ fontSize: '1.2rem', color: isEnded ? '#94a3b8' : '#ef4444', fontWeight: 'bold' }}>{new Date(salon.end_date).toLocaleDateString('hu-HU', {year: 'numeric', month: 'long', day: 'numeric'})}</div>
                </div>
                {salon.results_date && (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' }}>Eredményhirdetés</div>
                    <div style={{ fontSize: '1.2rem', color: '#f8fafc', fontWeight: 'bold' }}>{new Date(salon.results_date).toLocaleDateString('hu-HU', {year: 'numeric', month: 'long', day: 'numeric'})}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' }}>Nevezési díj</div>
                  <div style={{ fontSize: '1.2rem', color: '#10b981', fontWeight: 'bold' }}>{salon.fee_amount && salon.fee_amount > 0 ? `${salon.fee_amount} ${salon.fee_currency}` : 'Ingyenes'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' }}>Díjak száma</div>
                  <div style={{ fontSize: '1.2rem', color: '#f59e0b', fontWeight: 'bold' }}>{salon.awards_count || 0} db</div>
                </div>
              </div>

              {/* ÚJ GOMB: NEVEZÉS INDÍTÁSA */}
              <button 
                onClick={() => setIsSubmitting(true)}
                disabled={isEnded}
                style={{ width: '100%', background: isEnded ? '#334155' : '#38bdf8', color: isEnded ? '#94a3b8' : '#0f172a', border: 'none', padding: '15px', borderRadius: '8px', cursor: isEnded ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '30px', transition: 'transform 0.2s', boxShadow: isEnded ? 'none' : '0 4px 15px -3px rgba(56, 189, 248, 0.4)' }}
              >
                {isEnded ? 'A határidő lejárt' : 'Képek Nevezése a Portfóliómból 🚀'}
              </button>

              {/* ... Többi részlet (Készpénz, Körverseny, Kategóriák, Website) marad a régi ... */}
              {salon.cash_prize && (
                <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #10b98150', marginBottom: '30px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '5px' }}>💰 Pénznyeremény</div>
                  <div style={{ color: '#f8fafc' }}>{salon.cash_prize}</div>
                </div>
              )}

              {salon.categories && salon.categories.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '10px' }}>Kategóriák</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {salon.categories.map((c: string) => (
                      <span key={c} style={{ background: '#38bdf815', color: '#38bdf8', padding: '6px 12px', borderRadius: '100px', fontSize: '0.9rem', border: '1px solid #38bdf830' }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {salon.website && (
                <a href={salon.website} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', background: '#60a5fa', color: '#0f172a', textDecoration: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', transition: 'background 0.2s', marginTop: '20px' }}>
                  Ugrás a hivatalos weboldalra 🚀
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
