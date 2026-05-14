import { useState, useEffect, useCallback } from 'react';
import { BACKEND_URL } from '../../utils/constants';

export default function AdminSettingsView() {
  const [categories, setCategories] = useState<any[]>([]);
  const [awards, setAwards] = useState<any[]>([]);
  
  // Kategória űrlap
  const [catName, setCatName] = useState('');
  const [catHunName, setCatHunName] = useState('');
  const [editCatId, setEditCatId] = useState<number | null>(null);

  // Díj űrlap
  const [awardName, setAwardName] = useState('');
  const [editAwardId, setEditAwardId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [catRes, awardRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/categories`),
        fetch(`${BACKEND_URL}/api/awards`)
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (awardRes.ok) setAwards(await awardRes.json());
    } catch (e) { console.error("Hiba az adatok betöltésekor", e); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // --- Kategória funkciók ---
  const handleSaveCategory = async () => {
    if (!catName || !catHunName) return alert("Angol és magyar név is kötelező!");
    const url = editCatId ? `${BACKEND_URL}/api/categories/${editCatId}` : `${BACKEND_URL}/api/categories`;
    const method = editCatId ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: catName, hunName: catHunName })
    });
    if (res.ok) {
      setCatName(''); setCatHunName(''); setEditCatId(null);
      loadData();
    } else alert("Hiba a mentésnél!");
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm("Biztosan törlöd ezt a kategóriát?")) return;
    const res = await fetch(`${BACKEND_URL}/api/categories/${id}`, { method: 'DELETE' });
    if (res.ok) loadData(); else alert("Hiba! Lehet, hogy használatban van.");
  };

  // --- Díj funkciók ---
  const handleSaveAward = async () => {
    if (!awardName) return alert("A díj neve kötelező!");
    const url = editAwardId ? `${BACKEND_URL}/api/awards/${editAwardId}` : `${BACKEND_URL}/api/awards`;
    const method = editAwardId ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ awardName })
    });
    if (res.ok) {
      setAwardName(''); setEditAwardId(null);
      loadData();
    } else alert("Hiba a mentésnél!");
  };

  const handleDeleteAward = async (id: number) => {
    if (!window.confirm("Biztosan törlöd ezt a díjat?")) return;
    const res = await fetch(`${BACKEND_URL}/api/awards/${id}`, { method: 'DELETE' });
    if (res.ok) loadData(); else alert("Hiba! Lehet, hogy használatban van.");
  };

  const inputStyle = { width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '4px' };
  const btnStyle = { background: '#10b981', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
  const cancelBtnStyle = { background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer' };

  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b' }}>⚙️ Kategóriák és Díjak Kezelése</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
        
        {/* --- KATEGÓRIÁK BLOKK --- */}
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h3 style={{ color: '#38bdf8', marginTop: 0 }}>🏷️ Kategóriák</h3>
          
          <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #475569' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#f8fafc' }}>{editCatId ? 'Kategória szerkesztése' : 'Új kategória'}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input placeholder="Nemzetközi/Angol név (pl. Nature)" value={catName} onChange={e => setCatName(e.target.value)} style={inputStyle} />
              <input placeholder="Magyar név (pl. Természet)" value={catHunName} onChange={e => setCatHunName(e.target.value)} style={inputStyle} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleSaveCategory} style={{...btnStyle, flex: 1}}>{editCatId ? 'Frissítés' : 'Hozzáadás'}</button>
                {editCatId && <button onClick={() => { setEditCatId(null); setCatName(''); setCatHunName(''); }} style={cancelBtnStyle}>Mégse</button>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categories.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '10px', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#f8fafc' }}>{c.hun_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{c.name}</div>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => { setEditCatId(c.id); setCatName(c.name); setCatHunName(c.hun_name); }} style={{ background: 'transparent', color: '#f59e0b', border: 'none', cursor: 'pointer' }}>✏️</button>
                  <button onClick={() => handleDeleteCategory(c.id)} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}>❌</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- DÍJAK BLOKK --- */}
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h3 style={{ color: '#f59e0b', marginTop: 0 }}>🏆 Díjak és Eredmények</h3>
          
          <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #475569' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#f8fafc' }}>{editAwardId ? 'Díj szerkesztése' : 'Új díj felvitele'}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input placeholder="Díj pontos neve (pl. FIAP Gold)" value={awardName} onChange={e => setAwardName(e.target.value)} style={inputStyle} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleSaveAward} style={{...btnStyle, flex: 1}}>{editAwardId ? 'Frissítés' : 'Hozzáadás'}</button>
                {editAwardId && <button onClick={() => { setEditAwardId(null); setAwardName(''); }} style={cancelBtnStyle}>Mégse</button>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
            {awards.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '10px', borderRadius: '6px' }}>
                <div style={{ fontWeight: 'bold', color: '#cbd5e1' }}>{a.award_name}</div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => { setEditAwardId(a.id); setAwardName(a.award_name); }} style={{ background: 'transparent', color: '#f59e0b', border: 'none', cursor: 'pointer' }}>✏️</button>
                  <button onClick={() => handleDeleteAward(a.id)} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}>❌</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
