import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../utils/constants';

export default function AdminWeeklyView() {
  const [topics, setTopics] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]); 
  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [masterEmail, setMasterEmail] = useState(''); 

  // ➕ ÚJ: Borítókép állapotok
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState('');

  const [suspiciousActivities, setSuspiciousActivities] = useState<any[]>([]);
  const [loadingSuspicious, setLoadingSuspicious] = useState(false);

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

  const fetchTopics = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly-topics`);
      if (res.ok) setTopics(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly/users`);
      if (res.ok) setUsers(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchSuspicious = async () => {
    setLoadingSuspicious(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly/suspicious`);
      if (res.ok) setSuspiciousActivities(await res.json());
    } catch (e) { console.error(e); } finally { setLoadingSuspicious(false); }
  };

  const handleDisqualify = async (topicId: number, userEmail: string, userName: string) => {
    if (!window.confirm(`❗ Biztosan törlöd ${userName} (${userEmail}) nevezését?`)) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly/disqualify?topicId=${topicId}&userEmail=${userEmail}`, { method: 'DELETE' });
      if (res.ok) { alert("Sikeresen eltávolítva!"); fetchSuspicious(); fetchTopics(); }
    } catch (e) { alert("Hálózati hiba!"); }
  };
  
  useEffect(() => {
    fetchTopics();
    fetchUsers(); 
    fetchSuspicious();
  }, []);

  const clearForm = () => {
    setEditId(null);
    setTitle('');
    setDesc('');
    setStartDate('');
    setEndDate('');
    setMasterEmail(''); 
    // ➕ ÚJ: Kép állapotok törlése
    setCoverFile(null);
    setCoverUrl('');
    
    // Manuálisan reseteljük a file input mezőt, ha létezik
    const fileInput = document.getElementById('cover-file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const startEdit = (t: any) => {
    setEditId(t.id);
    setTitle(t.title);
    setDesc(t.description || '');
    setStartDate(t.start_date ? t.start_date.split('T')[0] : '');
    setEndDate(t.end_date ? t.end_date.split('T')[0] : '');
    setMasterEmail(t.master_email || ''); 
    // ➕ ÚJ: Jelenlegi kép link betöltése szerkesztéshez
    setCoverUrl(t.cover_url || '');
    setCoverFile(null); 
  };

  // ⚙️ MÓDOSÍTVA: JSON helyett FormData küldése a backendnek
  const handleSave = async () => {
    if (!title || !startDate || !endDate) return alert("Cím és dátumok kötelezőek!");
    try {
      const url = editId ? `${BACKEND_URL}/api/admin/weekly-topics/${editId}` : `${BACKEND_URL}/api/admin/weekly-topics`;
      const method = editId ? 'PUT' : 'POST';
      
      // ⚡ VÁLTOZTATÁS: FormData felépítése
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', desc);
      formData.append('startDate', startDate);
      formData.append('endDate', endDate);
      formData.append('masterEmail', masterEmail);
      
      // Szerkesztésnél visszaküldjük a régi URL-t, hátha nem változott meg a kép
      if (coverUrl) formData.append('coverUrl', coverUrl);
      
      // Ha kiválasztottunk egy ÚJ fájlt a gépről, becsatoljuk
      if (coverFile) formData.append('cover', coverFile);

      const res = await fetch(url, {
        method,
        // FIGYELEM: Multipart FormData-nál TILOS beírni a headers-be a 'Content-Type'-ot, a böngésző magától beállítja!
        body: formData 
      });

      if (res.ok) {
        alert("Sikeresen mentve!");
        clearForm();
        fetchTopics();
        fetchSuspicious();
      } else alert("Hiba a mentés során.");
    } catch (e) { alert("Hálózati hiba!"); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("❗ BIZTOSAN TÖRLÖD? Minden adat elvész!")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly-topics/${id}`, { method: 'DELETE' });
      if (res.ok) { fetchTopics(); fetchSuspicious(); }
    } catch (e) { alert("Hiba!"); }
  };

  const getTopicStatus = (sDateStr: string, eDateStr: string) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const start = new Date(sDateStr); start.setHours(0,0,0,0);
    const end = new Date(eDateStr); end.setHours(23,59,59,999);
    if (today > end) return { label: 'LEZÁRULT', color: '#94a3b8', bg: 'transparent' };
    if (today < start) return { label: 'JÖVŐBELI', color: '#f59e0b', bg: '#f59e0b15' };
    return { label: 'AKTÍV', color: '#10b981', bg: '#10b98115' };
  };

  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b' }}>🔥 Heti Kihívások (Párbaj) Kezelése</h2>
      <p style={{ color: '#94a3b8', marginBottom: '20px' }}>A system automatikusan aktiválja azokat a témákat, amiknek a mai dátum a kezdő- és végdátuma közé esik!</p>

      {/* GYANÚS TEVÉKENYSÉGEK PANEL */}
      <div style={{ backgroundColor: '#1e1b4b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: suspiciousActivities.length > 0 ? '2px solid #ef4444' : '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: suspiciousActivities.length > 0 ? '#f87171' : '#10b981' }}>
            {suspiciousActivities.length > 0 ? '🚨 Gyanús Tevékenységek Detektálva!' : '🛡️ Rendszerbiztonság rendben'}
          </h3>
          <button onClick={fetchSuspicious} style={{ background: '#334155', color: '#cbd5e1', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
            {loadingSuspicious ? 'Frissítés...' : '🔄 Ellenőrzés futtatása'}
          </button>
        </div>
        {suspiciousActivities.length === 0 ? (
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem', fontStyle: 'italic' }}>Jelenleg minden tiszta.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {suspiciousActivities.map((act, index) => (
              <div key={index} style={{ background: '#0f172a', padding: '12px 15px', borderRadius: '8px', borderLeft: '4px solid #ef4444', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>⚔️ {act.topic_title}</span>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>🌐 IP: {act.ip_address}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                  {act.suspect_list.split(' || ').map((suspect: string, sIdx: number) => {
                    const namePart = suspect.split(' (')[0];
                    const emailPart = suspect.includes('(') ? suspect.split('(')[1].replace(')', '') : '';
                    return (
                      <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '6px 12px', borderRadius: '6px' }}>
                        <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>• {suspect}</span>
                        <button onClick={() => handleDisqualify(act.topic_id, emailPart, namePart)} style={{ background: '#ef444420', color: '#f87171', border: '1px solid #ef444450', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>🗑️ Törlés</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LÉTREHOZÓ / SZERKESZTŐ ŰRLAP */}
      <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #f97316' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: '#f97316' }}>{editId ? '✏️ Téma Szerkesztése' : '➕ Új Téma Kiírása'}</h3>
          {editId && <button onClick={clearForm} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}>Mégse</button>}
        </div>

        <input placeholder="A téma címe (pl. Tavaszi Fények)" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
        <textarea placeholder="Rövid leírás, útmutató a fotósoknak..." value={desc} onChange={e => setDesc(e.target.value)} style={{...inputStyle, minHeight: '80px'}} />
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>⚖️ Kijelölt Párbajmester (Speciális 10 pontos bíráló)</label>
          <select value={masterEmail} onChange={e => setMasterEmail(e.target.value)} style={inputStyle}>
            <option value="">-- Nincs külön párbajmester kijelölve (Opcionális) --</option>
            {users.map(u => <option key={u.email} value={u.email}>{u.name} ({u.email})</option>)}
          </select>
        </div>

        {/* ➕ ÚJ: BORÍTÓKÉP TALLÓZÓ MEZŐ ÉS INTUITÍV ELŐNÉZET */}
        <div style={{ marginBottom: '20px', padding: '15px', background: '#0f172a50', borderRadius: '10px', border: '1px dashed #334155' }}>
          <label style={{ fontSize: '0.8rem', color: '#38bdf8', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>🖼️ Párbaj Vizuális Borítóképe (Cloudinary automata feltöltés)</label>
          <input 
            id="cover-file-input"
            type="file" 
            accept="image/*" 
            onChange={e => { if(e.target.files?.[0]) setCoverFile(e.target.files[0]); }} 
            style={inputStyle} 
          />
          
          {/* Új, még el nem mentett kép élő előnézete */}
          {coverFile && (
            <div style={{ marginTop: '10px' }}>
              <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold' }}>✨ Új borítókép előnézet (Mentésre vár):</span>
              <img src={URL.createObjectURL(coverFile)} alt="Preview" style={{ width: '100%', maxHeight: '130px', objectFit: 'cover', borderRadius: '8px', marginTop: '5px', border: '1px solid #ef4444' }} />
            </div>
          )}
          
          {/* Már korábban mentett, létező borítókép megjelenítése */}
          {coverUrl && !coverFile && (
            <div style={{ marginTop: '10px' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>🖼️ Jelenleg aktív borítókép:</span>
              <img src={coverUrl} alt="Current cover" style={{ width: '100%', maxHeight: '130px', objectFit: 'cover', borderRadius: '8px', marginTop: '5px', border: '1px solid #334155' }} />
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Kezdés</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Zárás</label>
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
        {topics.map((t, i) => {
          const status = getTopicStatus(t.start_date, t.end_date);
          return (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: i < topics.length - 1 ? '1px solid #334155' : 'none', background: status.bg, flexWrap: 'wrap', gap: '15px' }}>
              
              {/* ➕ ÚJ: KIS BORÍTÓKÉP THUMBNAIL A LISTÁBAN AZ ÁTLÁTHATÓSÁGÉRT */}
              <div style={{ width: '70px', height: '45px', backgroundColor: '#0f172a', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #334155', flexShrink: 0 }}>
                {t.cover_url ? (
                  <img src={t.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleImageError} />
                ) : (
                  <span style={{ fontSize: '1.2rem', opacity: 0.4 }}>🖼️</span>
                )}
              </div>

              <div style={{ flex: 1, marginLeft: '5px' }}>
                <div style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {t.title} 
                  <span style={{ background: status.color, color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px' }}>{status.label}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '5px' }}>
                  {new Date(t.start_date).toLocaleDateString('hu-HU')} - {new Date(t.end_date).toLocaleDateString('hu-HU')}
                </div>
                {t.master_email && (
                  <div style={{ fontSize: '0.8rem', color: '#a78bfa', marginTop: '4px', fontWeight: 'bold' }}>
                    👑 Kijelölt Párbajmester: {t.master_email}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
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
