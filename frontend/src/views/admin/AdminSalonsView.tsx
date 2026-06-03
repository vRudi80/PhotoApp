import React, { useState, useEffect, useRef } from 'react';
import { getFlagImageUrl } from '../../utils/helpers';

interface AdminSalonsViewProps {
  salons: any[];
  countries: any[];
  allCategories: any[];
  patrons: any[];
  BACKEND_URL: string;
  fetchData: () => void;
  setSelectedSalon: (salon: any) => void;
}

export default function AdminSalonsView({
  salons, countries, allCategories, patrons, BACKEND_URL, fetchData, setSelectedSalon
}: AdminSalonsViewProps) {

  const inputStyle = { width: '100%', padding: '12px', marginBottom: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '10px', boxSizing: 'border-box' as const, fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' };

  // --- HELYI ÁLLAPOTOK ---
  const [salonName, setSalonName] = useState('');
  const [salonFee, setSalonFee] = useState('');
  const [salonCurrency, setSalonCurrency] = useState('EUR');
  const [salonStart, setSalonStart] = useState('');
  const [salonEnd, setSalonEnd] = useState('');
  const [salonWeb, setSalonWeb] = useState('');
  const [salonResults, setSalonResults] = useState('');
  const [salonIsCircuit, setSalonIsCircuit] = useState(false);
  const [salonAwards, setSalonAwards] = useState('');
  const [salonCash, setSalonCash] = useState('');
  const [salonCircuitNum, setSalonCircuitNum] = useState('');
  const [salonType, setSalonType] = useState<'online' | 'print'>('online');
  const [salonCountry, setSalonCountry] = useState('');
  const [salonSelectedCats, setSalonSelectedCats] = useState<number[]>([]);
  const [salonSelectedPatrons, setSalonSelectedPatrons] = useState<number[]>([]);
  const [salonPatronNumbers, setSalonPatronNumbers] = useState<Record<number, string>>({});
  const [editSalonId, setEditSalonId] = useState<number | null>(null);

  // --- Kereshető országválasztó állapotok ---
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- AI / Robot által talált nyers szekciók állapotai ---
  const [specificFiapId, setSpecificFiapId] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiDetectedCats, setAiDetectedCats] = useState<string>('');

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

  const sortedSalons = [...salons].sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());

  const [scrapedSalons, setScrapedSalons] = useState<any[]>(() => {
    const saved = localStorage.getItem('scrapedSalonsData');
    return saved ? JSON.parse(saved) : [];
  });
  const [isScraping, setIsScraping] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    localStorage.setItem('scrapedSalonsData', JSON.stringify(scrapedSalons));
  }, [scrapedSalons]);

  // --- FÜGGVÉNYEK ---
  const toggleArrayItem = (arr: number[], setArr: Function, id: number) => { 
    if (arr.includes(id)) setArr(arr.filter(item => item !== id)); 
    else setArr([...arr, id]); 
  };

  const clearSalonForm = () => { 
    setEditSalonId(null); 
    setSalonName(''); setSalonFee(''); setSalonCurrency('EUR'); setSalonStart(''); 
    setSalonEnd(''); setSalonWeb(''); setSalonResults(''); setSalonIsCircuit(false); 
    setSalonAwards(''); setSalonCash(''); setSalonCircuitNum(''); setSalonType('online'); 
    setSalonCountry(''); setSalonSelectedPatrons([]); setSalonSelectedCats([]); 
    setSalonPatronNumbers({}); setAiDetectedCats('');
  };

  const startEditSalon = (salon: any) => {
    setEditSalonId(salon.id);
    setSalonName(salon.name || '');
    setSalonType(salon.submission_type || 'online');
    setSalonCountry(salon.host_country_id?.toString() || '');
    setSalonFee(salon.fee_amount?.toString() || '');
    setSalonCurrency(salon.fee_currency || 'EUR');
    setSalonWeb(salon.website || '');
    setAiDetectedCats('');
    
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '';
      try { return new Date(dateStr).toISOString().slice(0, 10); } catch(e) { return ''; }
    };
    
    setSalonStart(formatDate(salon.start_date));
    setSalonEnd(formatDate(salon.end_date));
    setSalonResults(formatDate(salon.results_date));
    setSalonIsCircuit(salon.is_circuit === 1);
    setSalonCircuitNum(salon.circuit_number || '');
    setSalonAwards(salon.awards_count?.toString() || '');
    setSalonCash(salon.cash_prize || '');

    if (salon.categories && allCategories.length > 0) {
      const catIds = allCategories.filter((c:any) => salon.categories.includes(c.name) || salon.categories.includes(c.hun_name)).map((c:any) => c.id);
      setSalonSelectedCats(catIds);
    } else setSalonSelectedCats([]);

    if (salon.patron_details && patrons.length > 0) {
      const pIds: number[] = [];
      const pNumbers: Record<number, string> = {};
      salon.patron_details.forEach((p: any) => {
        const patronObj = patrons.find(pat => pat.name === p.name);
        if (patronObj) { pIds.push(patronObj.id); pNumbers[patronObj.id] = p.number || ''; }
      });
      setSalonSelectedPatrons(pIds);
      setSalonPatronNumbers(pNumbers);
    } else { setSalonSelectedPatrons([]); setSalonPatronNumbers({}); }
  };

  // ====================================================================
  // 💾 JAVÍTVA: INTELLIGENS HIBAKEZELÉS A VALÓDI OKOK KIDERÍTÉSÉHEZ
  // ====================================================================
  const handleSaveSalon = async () => { 
    if (!salonName || !salonEnd) return alert("A Szalon neve és a záródátum megadása kötelező!"); 
    try { 
      const patronsData = salonSelectedPatrons.map(id => ({ id: id, number: salonPatronNumbers[id] || '' }));
      const payload = { 
        name: salonName, feeAmount: salonFee, feeCurrency: salonCurrency, startDate: salonStart, 
        endDate: salonEnd, website: salonWeb, resultsDate: salonResults, isCircuit: salonIsCircuit, 
        awardsCount: salonAwards, cashPrize: salonCash, circuitNumber: salonCircuitNum, 
        submissionType: salonType, hostCountryId: salonCountry, patronsData: patronsData, categoryIds: salonSelectedCats 
      }; 
      
      const url = editSalonId ? `${BACKEND_URL}/api/salons/${editSalonId}` : `${BACKEND_URL}/api/salons`;
      const method = editSalonId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); 
      
      if (res.ok) { 
        alert(editSalonId ? "Szalon sikeresen frissítve!" : "Szalon sikeresen hozzáadva!"); 
        clearSalonForm(); 
        fetchData(); 
      } else {
        // JAVÍTVA: Kiolvassuk a szerver által küldött valódi hibaüzenetet (pl. "Ezzel az azonosítóval már létezik...")
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || "Hiba történt a mentés során.");
      }
    } catch (e) { alert("Hálózati hiba lépett fel a mentés közben!"); } 
  };

  const handleAiLookup = async () => {
    if (!specificFiapId.trim()) return alert("Kérlek adj meg egy érvényes FIAP védnökségi azonosítót!");
    setIsAiLoading(true);
    clearSalonForm();

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/analyze-fiap-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fiapNumber: specificFiapId.trim() })
      });

      if (res.ok) {
        const item = await res.json();
        
        const todayStr = new Date().toISOString().split('T')[0];
        setSalonStart(todayStr); 
        setSalonName(item.name || 'Ismeretlen AI Szalon'); 
        setSalonType(item.submission_type || 'online'); 
        setSalonWeb(item.website || '');
        if (item.fee) setSalonFee(item.fee.toString());
        if (item.end_date) setSalonEnd(item.end_date);

        const isCircuitSalon = item.is_circuit === true || 
                               String(item.is_circuit).toLowerCase() === 'true' || 
                               item.is_circuit === 1 || 
                               (item.name && item.name.toLowerCase().includes('circuit'));
        
        setSalonIsCircuit(isCircuitSalon);
        setSalonCircuitNum(isCircuitSalon ? '' : (item.fiap_number || specificFiapId));

        if (item.country) {
          const matchedCountry = countries.find(c => 
            c.country?.toLowerCase() === item.country?.toLowerCase() || 
            c.country_hun?.toLowerCase() === item.country?.toLowerCase()
          );
          if (matchedCountry) { setSalonCountry(matchedCountry.id.toString()); setCountrySearch(''); }
        }

        if (item.categories) {
          setAiDetectedCats(Array.isArray(item.categories) ? item.categories.join(', ') : item.categories);
        }
        setSalonSelectedCats([]); 

        setSalonSelectedPatrons([1]);
        setSalonPatronNumbers({ 1: item.fiap_number || specificFiapId });

        alert(`🤖 Az AI sikeresen betöltötte a(z) "${item.name}" szalont! Kategória ajánlások bekészítve.`);
        setSpecificFiapId('');
        document.getElementById('salon-main-form')?.scrollIntoView({ behavior: 'smooth' });
      } else {
        const err = await res.json();
        alert(`AI hiba: ${err.error || 'Nem sikerült elemezni az azonosítót.'}`);
      }
    } catch (e) { alert("Hálózati hiba az AI keresése közben!"); } finally { setIsAiLoading(false); }
  };

  const handleImportSalons = async () => {
    if (scrapedSalons.length === 0) return;
    setIsImporting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/import-fiap`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ salonsToImport: scrapedSalons })
      });
      if (res.ok) {
        const result = await res.json();
        alert(`Sikeresen importálva ${result.count} db új nemzetközi szalon!`);
        setScrapedSalons([]); 
        fetchData();
      } else alert("Hiba az importálás során.");
    } catch (e) { alert("Hálózati hiba importáláskor!"); } finally { setIsImporting(false); }
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
    setSalonName(item.name); setSalonType(item.submission_type); setSalonWeb(item.website || '');
    if (item.fee) setSalonFee(item.fee);
    setSalonEnd(formatDateForInput(item.end_date_raw));
    
    const isCircuitSalon = item.is_circuit === 1 || 
                           item.is_circuit === true || 
                           String(item.is_circuit).toLowerCase() === 'true' ||
                           (item.name && item.name.toLowerCase().includes('circuit'));
    setSalonIsCircuit(isCircuitSalon);
    setSalonCircuitNum(isCircuitSalon ? '' : item.fiap_number);

    if (item.categories) {
      setAiDetectedCats(Array.isArray(item.categories) ? item.categories.join(', ') : item.categories);
    }
    setSalonSelectedCats([]); 

    const matchedCountry = countries.find(c => c.country?.toLowerCase() === item.country?.toLowerCase() || c.country_hun?.toLowerCase() === item.country?.toLowerCase());
    if (matchedCountry) { setSalonCountry(matchedCountry.id.toString()); setCountrySearch(''); }

    setSalonPatronNumbers({ 1: item.fiap_number });
    setSalonSelectedPatrons([1]);
    document.getElementById('salon-main-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b', fontWeight: '900' }}>🌐 Nemzetközi Szalonok Kezelése</h2>
      
      {/* 🤖 FIAP ROBOT MŰSZERFAL */}
      <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', marginBottom: '25px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <h3 style={{ marginTop: 0, color: '#60a5fa', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>🤖 FIAP Robot - Automata betöltés</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '20px', lineHeight: '1.5' }}>A rendszer képes a <b>myfiap.net</b> listájának átvizsgálására, vagy konkrét azonosító alapján AI élő Google-keresésre.</p>
        
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end', background: '#0f172a50', padding: '20px', borderRadius: '16px', border: '1px solid #334155' }}>
          
          <div style={{ flex: '1 1 300px' }}>
            <div style={{ fontWeight: 'bold', color: '#cbd5e1', marginBottom: '8px', fontSize: '0.9rem' }}>A verzió: Főoldali frissítés (Első oldal kaparása)</div>
            <button onClick={handleScrapeFiap} disabled={isScraping} style={{ width: '100%', background: isScraping ? '#334155' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: 'white', padding: '12px 24px', borderRadius: '100px', border: 'none', cursor: isScraping ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '0.9rem', transition: 'all 0.3s' }}>
              {isScraping ? '⏳ Adatok letöltése...' : '🌐 Új Pályázatok Keresése (myfiap.net)'}
            </button>
          </div>

          <div style={{ flex: '1 1 350px' }}>
            <div style={{ fontWeight: 'bold', color: '#a78bfa', marginBottom: '8px', fontSize: '0.9rem' }}>B verzió: Keresés és beemelés védnökségi szám alapján (Élő Google Keresés)</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="pl: FIAP 2026/123 vagy 2025/555" 
                value={specificFiapId} 
                onChange={e => setSpecificFiapId(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAiLookup(); }}
                disabled={isAiLoading}
                style={{ flex: 1, padding: '11px 15px', background: '#0f172a', border: '1px solid #a78bfa40', color: 'white', borderRadius: '100px', outline: 'none', fontSize: '0.9rem' }} 
              />
              <button 
                onClick={handleAiLookup} 
                disabled={isAiLoading || !specificFiapId.trim()} 
                style={{ background: (isAiLoading || !specificFiapId.trim()) ? '#334155' : 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: (isAiLoading || !specificFiapId.trim()) ? '#64748b' : 'white', border: 'none', padding: '0 22px', borderRadius: '100px', fontWeight: 'bold', cursor: (isAiLoading || !specificFiapId.trim()) ? 'not-allowed' : 'pointer', fontSize: '0.9rem', transition: 'all 0.3s', whiteSpace: 'nowrap' }}
              >
                {isAiLoading ? '⏳ AI Keresés...' : '🤖 AI Beemelés'}
              </button>
            </div>
          </div>

        </div>

        {scrapedSalons.length > 0 && (
          <div style={{ marginTop: '25px', background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <h4 style={{ color: '#10b981', margin: 0, fontSize: '1.2rem' }}>Talált szalonok ({scrapedSalons.length} db):</h4>
              <button onClick={handleImportSalons} disabled={isImporting} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: isImporting ? 'not-allowed' : 'pointer', fontWeight: 'bold', transition: 'all 0.3s' }}>
                {isImporting ? '⏳ Importálás...' : '🚀 Összes bekészített importálása'}
              </button>
            </div>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '5px' }}>
              {scrapedSalons.map((s, i) => (
                <div key={i} style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #38bdf8', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                      <span style={{ color: '#38bdf8', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1rem' }}>{s.fiap_number}</span>
                      <span style={{ color: '#f8fafc', fontWeight: 'bold', margin: '0 8px', fontSize: '1.05rem' }}>{s.name}</span> 
                      <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>({s.country})</span>
                      <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '6px', lineHeight: '1.5' }}>
                        Határidő: <b style={{color: '#cbd5e1'}}>{s.end_date_raw}</b> | Web: <span style={{color: '#60a5fa'}}>{s.website || 'Nincs'}</span> | Díj: <b>{s.fee ? `${s.fee} EUR` : 'Nincs'}</b><br/>
                        <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>Szekciók: {s.categories && s.categories.length > 0 ? s.categories.join(', ') : 'Nincs adat'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleLoadToForm(s, i)} style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>✏️ Beemelés</button>
                      <button onClick={() => handleRemoveScraped(i)} style={{ background: '#ef444415', color: '#ef4444', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>✕ Mellőz</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ➕ SZALON LÉTREHOZÁSA / SZERKESZTÉSE FORM */}
      <div id="salon-main-form" style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '24px', marginBottom: '35px', border: '1px solid #f59e0b', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '1.4rem' }}>{editSalonId ? '✏️ Kiválasztott Szalon Módosítása' : '➕ Új Kézi Szalon Kiírása'}</h3>
          {editSalonId && (
            <button onClick={clearSalonForm} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>Visszalépés új hozzáadásához ✕</button>
          )}
        </div>
        
        <input placeholder="Szalon hivatalos megnevezése" value={salonName} onChange={e => setSalonName(e.target.value)} style={inputStyle} />
        
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '5px' }}>
          <div style={{flex: '1 1 200px'}}>
            <label style={{fontSize:'0.8rem', color:'#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 'bold'}}>Beadási Formátum</label>
            <select value={salonType} onChange={e => setSalonType(e.target.value as any)} style={inputStyle}>
              <option value="online">Online (Digitális vetítés)</option>
              <option value="print">Print (Papíralapú fotográfia)</option>
            </select>
          </div>
          
          <div style={{flex: '1 1 200px', position: 'relative'}} ref={dropdownRef}>
            <label style={{fontSize:'0.8rem', color:'#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 'bold'}}>Rendező Ország</label>
            <div onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)} style={{ ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {selectedCountryObj ? (
                <>
                  <img src={getFlagImageUrl(selectedCountryObj.country_code)} alt="Flag" style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px' }} />
                  <span>{selectedCountryObj.country_hun}</span>
                </>
              ) : <span style={{ color: '#64748b' }}>-- Válassz a listából --</span>}
            </div>

            {isCountryDropdownOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', zIndex: 50, boxShadow: '0 15px 35px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
                <div style={{ padding: '10px', borderBottom: '1px solid #223147', background: '#1e293b' }}>
                  <input type="text" placeholder="🔍 Keresés ország nevére..." value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} onClick={(e) => e.stopPropagation()} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '8px', outline: 'none', fontSize: '0.9rem' }} />
                </div>
                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {filteredCountries.length === 0 ? (
                    <div style={{ padding: '12px', color: '#64748b', textAlign: 'center', fontSize: '0.85rem' }}>Nincs egyezés.</div>
                  ) : (
                    filteredCountries.map(c => (
                      <div key={c.id} onClick={() => { setSalonCountry(c.id.toString()); setIsCountryDropdownOpen(false); setCountrySearch(''); }} style={{ padding: '12px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #1e293b', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#1e293b'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <img src={getFlagImageUrl(c.country_code)} alt="Zászló" style={{ width: '22px', height: '15px', objectFit: 'cover', borderRadius: '2px' }} />
                        <span style={{ color: '#f8fafc', fontSize: '0.95rem' }}>{c.country_hun}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '5px' }}>
          <div style={{flex: '1 1 150px'}}><label style={{fontSize:'0.8rem', color:'#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 'bold'}}>Nevezési díj összege</label><input type="number" value={salonFee} onChange={e => setSalonFee(e.target.value)} style={inputStyle} /></div>
          <div style={{flex: '1 1 100px'}}>
            <label style={{fontSize:'0.8rem', color:'#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 'bold'}}>Pénznem</label>
            <select value={salonCurrency} onChange={e => setSalonCurrency(e.target.value)} style={inputStyle}>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="HUF">HUF (Ft)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
          <div style={{flex: '1 1 250px'}}><label style={{fontSize:'0.8rem', color:'#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 'bold'}}>Hivatalos Weboldal URL</label><input type="url" value={salonWeb} onChange={e => setSalonWeb(e.target.value)} style={inputStyle} /></div>
        </div>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '5px' }}>
          <div style={{flex: '1 1 150px'}}><label style={{fontSize:'0.8rem', color:'#94a3b8', display: 'block', marginBottom: '6px'}}>Kezdés</label><input type="date" value={salonStart} onChange={e => setSalonStart(e.target.value)} style={inputStyle} /></div>
          <div style={{flex: '1 1 150px'}}><label style={{fontSize:'0.8rem', color:'#ef4444', fontWeight: 'bold', display: 'block', marginBottom: '6px'}}>🔴 Határidő</label><input type="date" value={salonEnd} onChange={e => setSalonEnd(e.target.value)} style={{...inputStyle, border: '1px solid #ef4444'}} /></div>
          <div style={{flex: '1 1 150px'}}><label style={{fontSize:'0.8rem', color:'#94a3b8', display: 'block', marginBottom: '6px'}}>Értesítés napja</label><input type="date" value={salonResults} onChange={e => setSalonResults(e.target.value)} style={inputStyle} /></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#0f172a', padding: '15px 20px', borderRadius: '14px', border: '1px solid #334155', marginBottom: '15px' }}>
          <div>
            <label style={{fontSize:'0.8rem', color:'#94a3b8', display: 'block', marginBottom: '6px'}}>Szalon / Körverseny Védnökségi számai (pl. FIAP 2026/123, soraiban vesszővel)</label>
            <input placeholder="Azonosító kódok..." value={salonCircuitNum} onChange={e => setSalonCircuitNum(e.target.value)} style={{...inputStyle, marginBottom: 0}} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#f8fafc', fontWeight: 'bold', marginTop: '5px', fontSize: '0.95rem' }}>
            <input type="checkbox" checked={salonIsCircuit} onChange={e => setSalonIsCircuit(e.checked)} style={{ width: '18px', height: '18px', accentColor: '#f59e0b' }} />
            Ez a rendezvény egy Körverseny (Circuit) részét képezi
          </label>
        </div>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '5px' }}>
          <div style={{flex: '1 1 150px'}}><label style={{fontSize:'0.8rem', color:'#94a3b8', display: 'block', marginBottom: '6px'}}>Felajánlott Díjak darabszáma</label><input type="number" value={salonAwards} onChange={e => setSalonAwards(e.target.value)} style={inputStyle} /></div>
          <div style={{flex: '1 1 300px'}}><label style={{fontSize:'0.8rem', color:'#94a3b8', display: 'block', marginBottom: '6px'}}>Pénzjutalom (Különdíjak, ha vannak)</label><input placeholder="pl: 500 EUR a szalon legjobb kollekciójának" value={salonCash} onChange={e => setSalonCash(e.target.value)} style={inputStyle} /></div>
        </div>

        {/* KATEGÓRIÁK TÖBBSZÖRÖS VÁLASZTÓ PILLÉK */}
        <div style={{ marginBottom: '15px', padding: '20px', background: '#0f172a', borderRadius: '16px', border: '1px solid #334155' }}>
          <label style={{fontSize:'0.9rem', color:'#38bdf8', fontWeight: 'bold', display: 'block', marginBottom: '12px'}}>Indított Szekciók / Kategóriák</label>
          
          {aiDetectedCats && (
            <div style={{ marginBottom: '15px', padding: '12px 16px', background: '#38bdf810', border: '1px dashed #38bdf860', borderRadius: '8px', color: '#38bdf8', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🤖</span> <span><b>AI által talált szekciók (Válaszd ki őket alul kézzel):</b> <input type="text" readOnly value={aiDetectedCats} style={{ background: 'transparent', border: 'none', color: '#cbd5e1', fontStyle: 'italic', paddingLeft: '5px', outline: 'none', width: '70%', fontSize: '0.9rem' }} /></span>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {sortedCategories.map(cat => {
              const isCatSelected = salonSelectedCats.includes(cat.id);
              return (
                <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: isCatSelected ? '#38bdf820' : 'transparent', color: isCatSelected ? '#38bdf8' : '#94a3b8', padding: '6px 14px', borderRadius: '100px', cursor: 'pointer', border: `1px solid ${isCatSelected ? '#38bdf8' : '#334155'}`, fontWeight: isCatSelected ? 'bold' : 'normal', fontSize: '0.85rem', transition: 'all 0.2s' }}>
                  <input type="checkbox" checked={isCatSelected} onChange={() => toggleArrayItem(salonSelectedCats, setSalonSelectedCats, cat.id)} style={{ display: 'none' }} />
                  {isCatSelected ? '✓ ' : ''}{cat.hun_name || cat.name}
                </label>
              );
            })}
          </div>
        </div>

        {/* VÉDNÖKSÉGEK MODUL */}
        <div style={{ marginBottom: '25px', padding: '20px', background: '#0f172a', borderRadius: '16px', border: '1px solid #334155' }}>
          <label style={{fontSize:'0.9rem', color:'#a78bfa', fontWeight: 'bold', display: 'block', marginBottom: '15px'}}>Patronáló Világszervezetek engedélyei</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sortedPatrons.map(p => {
              const isSelected = salonSelectedPatrons.includes(p.id);
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', minWidth: '140px', fontSize: '0.95rem' }}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleArrayItem(salonSelectedPatrons, setSalonSelectedPatrons, p.id)} style={{accentColor: '#a78bfa', width: '16px', height: '16px'}} />
                    <span style={{ color: isSelected ? '#a78bfa' : '#cbd5e1', fontWeight: isSelected ? 'bold' : 'normal' }}>{p.name}</span>
                  </label>
                  {isSelected && (
                    <input placeholder={`${p.name} engedélyszáma (pl. FIAP 2026/555)`} value={salonPatronNumbers[p.id] || ''} onChange={e => setSalonPatronNumbers({...salonPatronNumbers, [p.id]: e.target.value})} style={{ ...inputStyle, marginBottom: 0, padding: '6px 12px', flex: 1, maxWidth: '350px', fontSize: '0.85rem', border: '1px solid #a78bfa50' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button onClick={handleSaveSalon} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '14px 25px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '1.05rem', transition: 'all 0.3s', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
          {editSalonId ? 'Módosítások Véglegesítése 💾' : 'Szalon Hivatalos Publikálása 🚀'}
        </button>
      </div>

      {/* 📁 ADATBÁZISBAN LÉVŐ SZALONOK LISTÁJA */}
      <h3 style={{ color: '#f8fafc', marginBottom: '15px', fontSize: '1.3rem', fontWeight: 'bold' }}>📁 Jegyzékben szereplő Nemzetközi Szalonok</h3>
      <div style={{ background: '#1e293b', borderRadius: '18px', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        {sortedSalons.length === 0 ? <div style={{padding: '30px', color: '#94a3b8', textAlign: 'center'}}>Még egyetlen nemzetközi verseny sincs regisztrálva a portálon.</div> : null}
        {sortedSalons.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: i < sortedSalons.length - 1 ? '1px solid #334155' : 'none', background: i % 2 === 0 ? '#0f172a' : 'transparent', flexWrap: 'wrap', gap: '15px', transition: 'background 0.2s' }}>
            <div style={{ cursor: 'pointer', flex: 1, minWidth: '220px' }} onClick={() => setSelectedSalon(s)}>
              <div style={{ fontWeight: 'bold', color: '#60a5fa', fontSize: '1.1rem' }}>{s.name}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Határidő: <b style={{color: '#cbd5e1'}}>{new Date(s.end_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })}</b></span>
                <span style={{color: '#334155'}}>|</span>
                {s.country_code && getFlagImageUrl(s.country_code) && <img src={getFlagImageUrl(s.country_code)} alt="flag" style={{ width: '16px', height: '11px', objectFit: 'cover', borderRadius: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }} />}
                <span style={{color: '#94a3b8'}}>{s.country_hun}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => startEditSalon(s)} style={{ background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b40', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: 'all 0.2s' }}>Szerkesztés</button>
              <button onClick={() => handleDeleteSalon(s.id)} style={{ background: '#ef444415', color: '#ef4444', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>Törlés</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
