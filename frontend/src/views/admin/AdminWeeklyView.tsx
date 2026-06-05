import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../utils/constants';

export default function AdminWeeklyView() {
  const [topics, setTopics] = useState<any[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 🛡️ ÚJ ÁLLAPOTOK: A duplikált IP-cím alapú gyanús tevékenységekhez
  const [suspiciousActivities, setSuspiciousActivities] = useState<any[]>([]);
  const [loadingSuspicious, setLoadingSuspicious] = useState(false);

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

  const fetchTopics = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly-topics`);
      if (res.ok) setTopics(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  // 🛡️ ÚJ FUNKCIÓ: Gyanús tevékenységek lekérése a backendről
  const fetchSuspicious = async () => {
    setLoadingSuspicious(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly/suspicious`);
      if (res.ok) setSuspiciousActivities(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSuspicious(false);
    }
  };

  const handleDisqualify = async (topicId: number, userEmail: string, userName: string) => {
    if (!window.confirm(`❗ Biztosan törlöd ${userName} (${userEmail}) nevezését ebből a fordulóból? A képe és a pontjai végleg elvesznek!`)) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly/disqualify?topicId=${topicId}&userEmail=${userEmail}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert("Sikeresen eltávolítva a versenyből!");
        fetchSuspicious(); // Azonnal frissítjük a piros gyanús panelt
        fetchTopics();     // Frissítjük a naptárat is
      } else {
        alert("Hiba történt a törlés során.");
      }
    } catch (e) {
      alert("Hálózati hiba!");
    }
  };
  
  // MÓDOSÍTVA: Betöltéskor a témák naptára mellett a gyanús szűrést is elindítjuk
  useEffect(() => {
    fetchTopics();
    fetchSuspicious();
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
        fetchSuspicious(); // Mentés után frissítjük a gyanús listát is biztonságból
      } else alert("Hiba a mentés során.");
    } catch (e) {
      alert("Hálózati hiba!");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("❗ BIZTOSAN TÖRLÖD? Minden hozzátartozó kép és szavazat is törlődik végleg!")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly-topics/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTopics();
        fetchSuspicious();
      }
    } catch (e) {
      alert("Hiba!");
    }
  };

  const getTopicStatus = (sDateStr: string, eDateStr: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const start = new Date(sDateStr);
    start.setHours(0,0,0,0);
    const end = new Date(eDateStr);
    end.setHours(23,59,59,999);

    if (today > end) return { label: 'LEZÁRULT', color: '#94a3b8', bg: 'transparent' };
    if (today < start) return { label: 'JÖVŐBELI', color: '#f59e0b', bg: '#f59e0b15' };
    return { label: 'AKTÍV', color: '#10b981', bg: '#10b98115' };
  };

  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b' }}>🔥 Heti Kihívások (Párbaj) Kezelése</h2>
      <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
        A system automatikusan aktiválja azokat a témákat, amiknek a mai dátum a kezdő- és végdátuma közé esik!
      </p>

      {/* 🚨 ÚJ: GYANÚS TEVÉKENYSÉGEK (IP DUPLIKÁCIÓ DETEKTÁLÓ) PANEL */}
      <div style={{ backgroundColor: '#1e1b4b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: suspiciousActivities.length > 0 ? '2px solid #ef4444' : '1px solid #334155', boxShadow: suspiciousActivities.length > 0 ? '0 0 15px rgba(239,68,68,0.2)' : 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: suspiciousActivities.length > 0 ? '#f87171' : '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {suspiciousActivities.length > 0 ? '🚨 Gyanús Tevékenységek Detektálva!' : '🛡️ Rendszerbiztonság rendben'}
          </h3>
          <button onClick={fetchSuspicious} style={{ background: '#334155', color: '#cbd5e1', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
            {loadingSuspicious ? 'Frissítés...' : '🔄 Ellenőrzés futtatása'}
          </button>
        </div>

        {suspiciousActivities.length === 0 ? (
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem', fontStyle: 'italic' }}>
            Jelenleg nincs olyan hálózati IP-cím, amiről egyszerre több felhasználó nevezett volna ugyanabba a párbajba.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '10px', marginTop: '5px' }}>
                  {act.suspect_list.split(' || ').map((suspect: string, sIdx: number) => {
                    // Trükk: Szétválasztjuk a nevet és az emailt, amit a GROUP_CONCAT összefűzött
                    // suspect formátuma: "Kovács Péter (email@gmail.com)"
                    const namePart = suspect.split(' (')[0];
                    const emailPart = suspect.includes('(') ? suspect.split('(')[1].replace(')', '') : '';

                    return (
                      <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '6px 12px', borderRadius: '6px', border: '1px solid #334155' }}>
                        <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>• {suspect}</span>
                        <button 
                          onClick={() => handleDisqualify(act.topic_id, emailPart, namePart)}
                          style={{ background: '#ef444420', color: '#f87171', border: '1px solid #ef444450', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', transition: 'all 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.background = '#ef444440'}
                          onMouseOut={e => e.currentTarget.style.background = '#ef444420'}
                        >
                          🗑️ Nevezés Törlése
                        </button>
                      </div>
                    );
                  })}
                </div>
            ))}
          </div>
        )}
      </div>

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
            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Kezdés (Ettől a naptól Aktív)</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Zárás (Eddig a napig Aktív)</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <button onClick={handleSave} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
          {editId ? 'Változtatások Mentése' : 'Téma Mentése a Naptárba'}
        </button>
      </div>

      {/* TÉMÁK LISTÁJA */}
      <h3 style={{ color: '#f8fafc' }}>Kihívások Naptára</h3>
      <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
        {topics.length === 0 ? <div style={{padding: '20px', color: '#94a3b8', textAlign: 'center'}}>Nincs még téma felvíve.</div> : null}
        {topics.map((t, i) => {
          const status = getTopicStatus(t.start_date, t.end_date);
          return (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: i < topics.length - 1 ? '1px solid #334155' : 'none', background: status.bg, flexWrap: 'wrap', gap: '15px' }}>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {t.title} 
                  <span style={{ background: status.color, color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px' }}>
                    {status.label}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '5px' }}>
                  {new Date(t.start_date).toLocaleDateString('hu-HU')} - {new Date(t.end_date).toLocaleDateString('hu-HU')}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                <button onClick={() => startEdit(t)} style={{ background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Szerkeszt</button>
                <button onClick={() => handleDelete(t.id)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Töröl</button>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  );
}
