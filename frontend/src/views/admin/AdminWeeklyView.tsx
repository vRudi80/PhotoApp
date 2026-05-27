import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../utils/constants';

export default function AdminWeeklyView() {
  const [topics, setTopics] = useState<any[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

  const fetchTopics = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly-topics`);
      if (res.ok) setTopics(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const clearForm = () => {
    setEditId(null);
    setTitle('');
    setDesc('');
    setStartDate('');
    setEndDate('');
  };

  const startEdit = (t: any) => {
    setEditId(t.id);
    setTitle(t.title);
    setDesc(t.description || '');
    setStartDate(t.start_date ? t.start_date.split('T')[0] : '');
    setEndDate(t.end_date ? t.end_date.split('T')[0] : '');
  };

  const handleSave = async () => {
    if (!title || !startDate || !endDate) return alert("Cím és dátumok kötelezőek!");
    try {
      const url = editId ? `${BACKEND_URL}/api/admin/weekly-topics/${editId}` : `${BACKEND_URL}/api/admin/weekly-topics`;
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: desc, startDate, endDate })
      });
      if (res.ok) {
        alert("Sikeresen mentve!");
        clearForm();
        fetchTopics();
      } else alert("Hiba a mentés során.");
    } catch (e) {
      alert("Hálózati hiba!");
    }
  };

  const handleActivate = async (id: number) => {
    if (!window.confirm("Biztosan aktiválod ezt a témát? A korábbi aktív téma lezárul.")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly-topics/${id}/activate`, { method: 'POST' });
      if (res.ok) fetchTopics();
    } catch (e) {
      alert("Hiba!");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("❗ BIZTOSAN TÖRLÖD? Minden hozzátartozó kép és szavazat is törlődik végleg!")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly-topics/${id}`, { method: 'DELETE' });
      if (res.ok) fetchTopics();
    } catch (e) {
      alert("Hiba!");
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b' }}>🔥 Heti Kihívások (Párbaj) Kezelése</h2>

      {/* LÉTREHOZÓ / SZERKESZTŐ ŰRLAP */}
      <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #f97316' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: '#f97316' }}>{editId ? '✏️ Téma Szerkesztése' : '➕ Új Téma Kiírása'}</h3>
          {editId && <button onClick={clearForm} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}>Mégse / Új létrehozása</button>}
        </div>

        <input placeholder="A téma címe (pl. Tavaszi Fények)" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
        <textarea placeholder="Rövid leírás, útmutató a fotósoknak..." value={desc} onChange={e => setDesc(e.target.value)} style={{...inputStyle, minHeight: '80px'}} />
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Kezdés</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Zárás (Határidő)</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <button onClick={handleSave} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
          {editId ? 'Változtatások Mentése' : 'Téma Létrehozása'}
        </button>
      </div>

      {/* TÉMÁK LISTÁJA */}
      <h3 style={{ color: '#f8fafc' }}>Eddigi Témák</h3>
      <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
        {topics.length === 0 ? <div style={{padding: '20px', color: '#94a3b8', textAlign: 'center'}}>Nincs még téma.</div> : null}
        {topics.map((t, i) => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: i < topics.length - 1 ? '1px solid #334155' : 'none', background: t.is_active ? '#f9731620' : (i % 2 === 0 ? '#0f172a' : 'transparent'), flexWrap: 'wrap', gap: '15px' }}>
            
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', color: t.is_active ? '#f97316' : '#60a5fa', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {t.title} 
                {t.is_active && <span style={{ background: '#f97316', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px' }}>AKTÍV</span>}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '5px' }}>
                {new Date(t.start_date).toLocaleDateString('hu-HU')} - {new Date(t.end_date).toLocaleDateString('hu-HU')}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {!t.is_active && (
                <button onClick={() => handleActivate(t.id)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Aktivál</button>
              )}
              <button onClick={() => startEdit(t)} style={{ background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Szerkeszt</button>
              <button onClick={() => handleDelete(t.id)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Töröl</button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
