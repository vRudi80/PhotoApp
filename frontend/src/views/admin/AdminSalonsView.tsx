import { getFlagEmoji } from '../../utils/helpers';

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
  toggleArrayItem: (arr: number[], setArr: Function, id: number) => void;
  
  handleSaveSalon: () => void;
  sortedSalons: any[];
  setSelectedSalon: (salon: any) => void;
  handleDeleteSalon: (id: number) => void;
}

export default function AdminSalonsView({
  editSalonId, startEditSalon, clearSalonForm,
  salonName, setSalonName, salonType, setSalonType, salonCountry, setSalonCountry, countries,
  salonFee, setSalonFee, salonCurrency, setSalonCurrency, salonWeb, setSalonWeb,
  salonStart, setSalonStart, salonEnd, setSalonEnd, salonResults, setSalonResults,
  salonIsCircuit, setSalonIsCircuit, salonCircuitNum, setSalonCircuitNum,
  salonAwards, setSalonAwards, salonCash, setSalonCash, allCategories, salonSelectedCats,
  setSalonSelectedCats, patrons, salonSelectedPatrons, setSalonSelectedPatrons,
  toggleArrayItem, handleSaveSalon, sortedSalons, setSelectedSalon, handleDeleteSalon
}: AdminSalonsViewProps) {

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

  // JAVÍTÁS: Kategóriák ABC sorrendbe rendezése (magyar név, vagy angol név alapján)
  const sortedCategories = [...allCategories].sort((a, b) => {
    const nameA = a.hun_name || a.name || '';
    const nameB = b.hun_name || b.name || '';
    return nameA.localeCompare(nameB, 'hu'); // Magyar ábécé szerinti rendezés
  });

  // JAVÍTÁS: Patronáló szervezetek ABC sorrendbe rendezése
  const sortedPatrons = [...patrons].sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });

  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b' }}>🌐 Nemzetközi Szalonok Kezelése</h2>
      
      <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #f59e0b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, color: '#f59e0b' }}>{editSalonId ? '✏️ Szalon Szerkesztése' : '➕ Új Szalon Létrehozása'}</h3>
          {editSalonId && (
            <button onClick={clearSalonForm} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
              Mégse / Új létrehozása
            </button>
          )}
        </div>
        
        <input placeholder="Szalon hivatalos neve" value={salonName} onChange={e => setSalonName(e.target.value)} style={inputStyle} />
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{flex: '1 1 200px'}}>
            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Feltöltés / Beadási forma</label>
            <select value={salonType} onChange={e => setSalonType(e.target.value as any)} style={inputStyle}>
              <option value="online">Online (Digitális)</option>
              <option value="print">Print (Papírkép)</option>
            </select>
          </div>
          <div style={{flex: '1 1 200px'}}>
            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Házigazda ország</label>
            <select value={salonCountry} onChange={e => setSalonCountry(e.target.value)} style={inputStyle}>
              <option value="">-- Válassz országot --</option>
              {countries.map(c => {
                const flag = getFlagEmoji(c.country_code);
                return (
                  <option key={c.id} value={c.id}>{flag ? `${flag} ` : ''}{c.country_hun}</option>
                );
              })}
            </select>
          </div>
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

        {/* JAVÍTÁS: Az azonosító mező most mindig látszik! */}
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

        {/* JAVÍTÁS: Kategóriák rendezve */}
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

        {/* JAVÍTÁS: Patronok rendezve */}
        // Az AdminSalonsView-n belül a patronok listázása:
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
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '5px' }}>
                Zárás: {new Date(s.end_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })} | {s.country_code && getFlagEmoji(s.country_code) ? `${getFlagEmoji(s.country_code)} ` : ''}{s.country_hun}
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
