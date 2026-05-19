import { useState, useEffect, useRef } from 'react';
import { BACKEND_URL } from '../../utils/constants';
import { getFlagImageUrl } from '../../utils/helpers'; // JAVÍTÁS: A képi zászlót importáljuk az emojik helyett!

interface AdminSalonsViewProps {
  editSalonId: number | null;
  startEditSalon: (salon: any) => void;
  clearSalonForm: () => void;

  salonName: string; setSalonName: (val: string) => void;
  salonType: 'online' | 'print'; setSalonType: (val: 'online' | 'print') => void;
  salonCountry: string; setSalonCountry: (val: string) => void;
  countries: any[];
  salonFee: string; setSalonFee: (val: string) => void;
  salonCurrency: string; setSalonCurrency: (val: string) => void;
  salonWeb: string; setSalonWeb: (val: string) => void;
  salonStart: string; setSalonStart: (val: string) => void;
  salonEnd: string; setSalonEnd: (val: string) => void;
  salonResults: string; setSalonResults: (val: string) => void;
  salonIsCircuit: boolean; setSalonIsCircuit: (val: boolean) => void;
  salonCircuitNum: string; setSalonCircuitNum: (val: string) => void;
  salonAwards: string; setSalonAwards: (val: string) => void;
  salonCash: string; setSalonCash: (val: string) => void;
  
  allCategories: any[];
  salonSelectedCats: number[]; setSalonSelectedCats: (val: number[]) => void;
  patrons: any[];
  salonSelectedPatrons: number[]; setSalonSelectedPatrons: (val: number[]) => void;
  
  salonPatronNumbers: Record<number, string>;
  setSalonPatronNumbers: (val: Record<number, string>) => void;

  toggleArrayItem: (arr: number[], setArr: Function, id: number) => void;
  
  handleSaveSalon: () => void;
  sortedSalons: any[];
  setSelectedSalon: (salon: any) => void;
  handleDeleteSalon: (id: number) => void;
  
  fetchAdminSalons?: () => void; 
}

export default function AdminSalonsView({
  editSalonId, startEditSalon, clearSalonForm,
  salonName, setSalonName, salonType, setSalonType, salonCountry, setSalonCountry, countries,
  salonFee, setSalonFee, salonCurrency, setSalonCurrency, salonWeb, setSalonWeb,
  salonStart, setSalonStart, salonEnd, setSalonEnd, salonResults, setSalonResults,
  salonIsCircuit, setSalonIsCircuit, salonCircuitNum, setSalonCircuitNum,
  salonAwards, setSalonAwards, salonCash, setSalonCash, allCategories, salonSelectedCats,
  setSalonSelectedCats, patrons, salonSelectedPatrons, setSalonSelectedPatrons,
  salonPatronNumbers, setSalonPatronNumbers,
  toggleArrayItem, handleSaveSalon, sortedSalons, setSelectedSalon, handleDeleteSalon, fetchAdminSalons
}: AdminSalonsViewProps) {

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

  // --- ÚJ: KERESHETŐ ORSZÁGVÁLASZTÓ ÁLLAPOTAI ---
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Zárjuk be a legördülőt, ha mellékattintanak
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCountries = countries.filter(c => 
    c.country_hun.toLowerCase().includes(countrySearch.toLowerCase()) || 
    c.country.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const selectedCountryObj = countries.find(c => c.id.toString() === salonCountry);
  // --------------------------------------------------

  const sortedCategories = [...allCategories].sort((a, b) => {
    const nameA = a.hun_name || a.name || '';
    const nameB = b.hun_name || b.name || '';
    return nameA.localeCompare(nameB, 'hu'); 
  });

  const sortedPatrons = [...patrons].sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });

  const [scrapedSalons, setScrapedSalons] = useState<any[]>(() => {
    const saved = localStorage.getItem('scrapedSalonsData');
    return saved ? JSON.parse(saved) : [];
  });
  const [isScraping, setIsScraping] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    localStorage.setItem('scrapedSalonsData', JSON.stringify(scrapedSalons));
  }, [scrapedSalons]);

  const handleScrapeFiap = async () => {
    setIsScraping(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/scrape-fiap`);
      if (res.ok) {
        const data = await res.json();
        setScrapedSalons(data); 
        if (data.length === 0) alert("Nem találtam új adatokat a myfiap.net-en (vagy mindegyik már az adatbázisodban van).");
      } else {
        const errorData = await res.json();
        alert(`Szerver hiba:\n\n${errorData.error || res.statusText}`);
      }
    } catch (e: any) {
      alert(`Hálózati hiba a kapcsolat során. Fut a backend?`);
    } finally {
      setIsScraping(false);
    }
  };

  const handleImportSalons = async () => {
    if (scrapedSalons.length === 0) return;
    setIsImporting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/import-fiap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonsToImport: scrapedSalons })
      });
      
      if (res.ok) {
        const result = await res.json();
        alert(`Sikeresen importálva ${result.count} db új nemzetközi szalon!`);
        setScrapedSalons([]); 
        if (fetchAdminSalons) fetchAdminSalons();
      } else {
        alert("Hiba a szerver oldalon az importálás során.");
      }
    } catch (e) {
      alert("Hálózati hiba importáláskor!");
    } finally {
      setIsImporting(false);
    }
  };

  const formatDateForInput = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  const handleRemoveScraped = (index: number) => {
    setScrapedSalons(prev => prev.filter((_, i) => i !== index));
  };

  const handleLoadToForm = (item: any, index: number) => {
    clearSalonForm();
    
    const todayStr = new Date().toISOString().split('T')[0];
    setSalonStart(todayStr); 
    
    setSalonName(item.name);
    setSalonType(item.submission_type);
    setSalonWeb(item.website || '');
    if (item.fee) setSalonFee(item.fee);
    setSalonEnd(formatDateForInput(item.end_date_raw));
    setSalonIsCircuit(item.is_circuit === 1);

    const matchedCountry = countries.find(c => 
      c.country?.toLowerCase() === item.country?.toLowerCase() || 
      c.country_hun?.toLowerCase() === item.country?.toLowerCase()
    );
    if (matchedCountry) {
      setSalonCountry(matchedCountry.id.toString());
      setCountrySearch(''); // Keresőmező nullázása az átemeléskor
    }

    setSalonPatronNumbers({ 1: item.fiap_number });
    setSalonSelectedPatrons([1]);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b' }}>🌐 Nemzetközi Szalonok Kezelése</h2>
      
      <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #3b82f650' }}>
        <h3 style={{ marginTop: 0, color: '#60a5fa' }}>🤖 FIAP Robot - Automata betöltés myfiap.net-ről</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '15px' }}>A gomb megnyomásával a rendszer átnézi a myfiap.net hivatalos listáját.</p>
        
        <button onClick={handleScrapeFiap} disabled={isScraping} style={{ background: '#3b82f6', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: isScraping ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
          {isScraping ? '⏳ Adatok letöltése folyamatban...' : '🌐 Új Pályázatok Keresése (myfiap.net)'}
        </button>

        {scrapedSalons.length > 0 && (
          <div style={{ marginTop: '20px', background: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ color: '#10b981', margin: 0 }}>Talált szalonok ({scrapedSalons.length} db):</h4>
              <button onClick={handleImportSalons} disabled={isImporting} style={{ background: '#10b981', color: 'white', padding: '8px 15px', borderRadius: '6px', border: 'none', cursor: isImporting ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                {isImporting ? '⏳...' : '🚀 Összes listában maradt importálása'}
              </button>
            </div>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {scrapedSalons.map((s, i) => (
                <div key={i} style={{ background: '#1e293b', padding: '10px', marginBottom: '10px', borderRadius: '6px', borderLeft: '4px solid #38bdf8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <b style={{ color: '#38bdf8' }}>{s.fiap_number}</b> - 
                      <span style={{ color: '#f8fafc', fontWeight: 'bold', margin: '0 5px' }}>{s.name}</span> 
                      ({s.country}) 
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '4px' }}>
                        Határidő: {s.end_date_raw} | Web: {s.website || 'Nincs adat'} | Díj: {s.fee ? `${s.fee} EUR` : 'Nincs adat'}<br/>
                        <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>
                          Kategóriák info: {s.categories && s.categories.length > 0 ? s.categories.join(', ') : 'Nincs adat'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleLoadToForm(s, i)} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        ✏️ Átemelés űrlapba
                      </button>
                      <button onClick={() => handleRemoveScraped(i)} style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        🗑️ Törlés
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #f59e0b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, color: '#f59e0b' }}>{editSalonId ? '✏️ Szalon Szerkesztése' : '➕ Kézi Szalon Létrehozása'}</h3>
          {editSalonId && (
            <button onClick={clearSalonForm} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
              Mégse / Új létrehozása
            </button>
          )}
        </div>
        
        <input placeholder="Szalon hivatalos neve" value={salonName} onChange={e => setSalonName(e.target.value)} style={inputStyle} />
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{flex: '1 1 200px'}}>
            <label style={{fontSize:'0.8rem', color:'#94a3b8', display: 'block', marginBottom: '5px'}}>Feltöltés / Beadási forma</label>
            <select value={salonType} onChange={e => setSalonType(e.target.value as any)} style={inputStyle}>
              <option value="online">Online (Digitális)</option>
              <option value="print">Print (Papírkép)</option>
            </select>
          </div>
          
          {/* --- JAVÍTOTT RÉSZ: KERESHETŐ ORSZÁG LEGÖRDÜLŐ --- */}
          <div style={{flex: '1 1 200px', position: 'relative'}} ref={dropdownRef}>
            <label style={{fontSize:'0.8rem', color:'#94a3b8', display: 'block', marginBottom: '5px'}}>Házigazda ország</label>
            
            <div 
              onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
              style={{ ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              {selectedCountryObj ? (
                <>
                  <img src={getFlagImageUrl(selectedCountryObj.country_code)} alt="Zászló" style={{ width: '20px', height: '15px', objectFit: 'cover', borderRadius: '2px' }} />
                  <span>{selectedCountryObj.country_hun}</span>
                </>
              ) : (
                <span style={{ color: '#94a3b8' }}>-- Válassz országot --</span>
              )}
            </div>

            {isCountryDropdownOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', zIndex: 50, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                <div style={{ padding: '10px', borderBottom: '1px solid #334155' }}>
                  <input 
                    type="text" 
                    placeholder="🔍 Keresés országra..." 
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #475569', color: 'white', borderRadius: '4px', outline: 'none' }}
                  />
                </div>
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  {filteredCountries.length === 0 ? (
                    <div style={{ padding: '10px', color: '#94a3b8', textAlign: 'center', fontSize: '0.85rem' }}>Nincs találat.</div>
                  ) : (
                    filteredCountries.map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => {
                          setSalonCountry(c.id.toString());
                          setIsCountryDropdownOpen(false);
                          setCountrySearch('');
                        }}
                        style={{ padding: '10px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s', borderBottom: '1px solid #1e293b' }}
                        onMouseOver={e => e.currentTarget.style.background = '#1e293b'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <img src={getFlagImageUrl(c.country_code)} alt="Zászló" style={{ width: '24px', height: '18px', objectFit: 'cover', borderRadius: '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                        <span style={{ color: '#f8fafc' }}>{c.country_hun}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          {/* ----------------------------------------------- */}

        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{flex: '1 1 150px'}}>
            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Nevezési díj (Pl: 20)</label>
            <input type="number" value={salonFee} onChange={e => setSalonFee(e.target.value)} style={inputStyle} />
          </div>
          <div style={{flex: '1 1 100px'}}>
            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Pénznem</label>
            <select value={salonCurrency} onChange={e => setSalonCurrency(e.target.value)} style={inputStyle}>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="HUF">HUF</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div style={{flex: '1 1 250px'}}>
            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Weboldal URL (https://...)</label>
            <input type="url" value={salonWeb} onChange={e => setSalonWeb(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{flex: '1 1 150px'}}>
            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Kezdés (Opcionális)</label>
            <input type="date" value={salonStart} onChange={e => setSalonStart(e.target.value)} style={inputStyle} />
          </div>
          <div style={{flex: '1 1 150px'}}>
            <label style={{fontSize:'0.8rem', color:'#ef4444', fontWeight: 'bold'}}>Zárás (Határidő)</label>
            <input type="date" value={salonEnd} onChange={e => setSalonEnd(e.target.value)} style={{...inputStyle, border: '1px solid #ef4444'}} />
          </div>
          <div style={{flex: '1 1 150px'}}>
            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Eredményhirdetés</label>
            <input type="date" value={salonResults} onChange={e => setSalonResults(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start', background: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '15px' }}>
          <div style={{flex: '1 1 100%', marginBottom: '10px'}}>
            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Szalon / Körverseny azonosítója (pl. FIAP 2024/001)</label>
            <input placeholder="Azonosító számok..." value={salonCircuitNum} onChange={e => setSalonCircuitNum(e.target.value)} style={{...inputStyle, marginBottom: 0}} />
          </div>
          <div style={{flex: '1 1 100%'}}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#f8fafc', fontWeight: 'bold' }}>
              <input type="checkbox" checked={salonIsCircuit} onChange={e => setSalonIsCircuit(e.target.checked)} style={{ width: '20px', height: '20px' }} />
              Ez a szalon egy Körverseny (Circuit) része
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
          <div style={{flex: '1 1 150px'}}>
            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Kiosztott díjak száma</label>
            <input type="number" value={salonAwards} onChange={e => setSalonAwards(e.target.value)} style={inputStyle} />
          </div>
          <div style={{flex: '1 1 300px'}}>
            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Készpénzes nyeremény (Opcionális)</label>
            <input placeholder="pl: 1000 EUR a legjobb fotónak" value={salonCash} onChange={e => setSalonCash(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: '15px', padding: '15px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
          <label style={{fontSize:'0.9rem', color:'#38bdf8', fontWeight: 'bold', display: 'block', marginBottom: '10px'}}>Kategóriák (Válassz ki többet is)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {sortedCategories.map(cat => (
              <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: salonSelectedCats.includes(cat.id) ? '#38bdf820' : 'transparent', color: salonSelectedCats.includes(cat.id) ? '#38bdf8' : '#cbd5e1', padding: '5px 10px', borderRadius: '100px', cursor: 'pointer', border: `1px solid ${salonSelectedCats.includes(cat.id) ? '#38bdf8' : '#475569'}` }}>
                <input type="checkbox" checked={salonSelectedCats.includes(cat.id)} onChange={() => toggleArrayItem(salonSelectedCats, setSalonSelectedCats, cat.id)} style={{ display: 'none' }} />
                {cat.hun_name || cat.name}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px', padding: '15px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
          <label style={{fontSize:'0.9rem', color:'#a78bfa', fontWeight: 'bold', display: 'block', marginBottom: '10px'}}>Patronáló Szervezetek és Egyedi Azonosítók</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sortedPatrons.map(p => {
              const isSelected = salonSelectedPatrons.includes(p.id);
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', minWidth: '120px' }}>
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => toggleArrayItem(salonSelectedPatrons, setSalonSelectedPatrons, p.id)} 
                    />
                    <span style={{ color: isSelected ? '#a78bfa' : '#cbd5e1' }}>{p.name}</span>
                  </label>
                  
                  {isSelected && (
                    <input 
                      placeholder={`${p.name} azonosító (pl. 2024/123)`}
                      value={salonPatronNumbers[p.id] || ''} 
                      onChange={e => setSalonPatronNumbers({...salonPatronNumbers, [p.id]: e.target.value})}
                      style={{ ...inputStyle, marginBottom: 0, padding: '5px 10px', flex: 1, maxWidth: '300px', fontSize: '0.85rem' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button onClick={handleSaveSalon} style={{ background: '#10b981', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '1.1rem' }}>
          {editSalonId ? 'Szalon Frissítése' : 'Szalon Mentése és Kiírása'}
        </button>
      </div>

      <h3 style={{ color: '#f8fafc' }}>Adatbázisban lévő Szalonok</h3>
      <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
        {sortedSalons.length === 0 ? <div style={{padding: '20px', color: '#94a3b8', textAlign: 'center'}}>Még nincs egyetlen szalon sem felvéve.</div> : null}
        {sortedSalons.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: i < sortedSalons.length - 1 ? '1px solid #334155' : 'none', background: i % 2 === 0 ? '#0f172a' : 'transparent', flexWrap: 'wrap', gap: '10px' }}>
            
            <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => setSelectedSalon(s)}>
              <div style={{ fontWeight: 'bold', color: '#60a5fa', fontSize: '1.1rem' }}>{s.name}</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>Zárás: {new Date(s.end_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })} | </span>
                
                {/* JAVÍTÁS: Zászló képpel az alsó listában is! */}
                {s.country_code && getFlagImageUrl(s.country_code) && (
                  <img src={getFlagImageUrl(s.country_code)} alt="flag" style={{ width: '16px', borderRadius: '2px' }} />
                )}
                <span>{s.country_hun}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button onClick={() => startEditSalon(s)} style={{ background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Szerkeszt</button>
              <button onClick={() => handleDeleteSalon(s.id)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Törlés</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
