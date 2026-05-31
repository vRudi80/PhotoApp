import React, { useState } from 'react';
import { BACKEND_URL, ADMIN_EMAIL } from '../../utils/constants';

// JAVÍTVA: A propok listája letisztult, csak a globális adatok kellenek!
interface AdminHomeworksViewProps {
  user: any;
  currentDbUser: any;
  clubs: any[];
  adminHomeworks: any[];
  fetchData: () => void;
}

export default function AdminHomeworksView({
  user, currentDbUser, clubs, adminHomeworks, fetchData
}: AdminHomeworksViewProps) {

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

  // ==============================================================
  // 1. HELYI ÁLLAPOTOK (Ezek költöztek ide az App.tsx-ből)
  // ==============================================================
  const [editHwId, setEditHwId] = useState<number | null>(null);
  const [hwClubId, setHwClubId] = useState('');
  const [hwTopic, setHwTopic] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwDeadline, setHwDeadline] = useState('');
  const [hwMaxImages, setHwMaxImages] = useState<number>(4);

  // ==============================================================
  // 2. FÜGGVÉNYEK (Ide költöztek az App.tsx-ből)
  // ==============================================================
  const clearHwForm = () => { 
    setEditHwId(null); 
    setHwClubId(''); 
    setHwTopic(''); 
    setHwDesc(''); 
    setHwDeadline(''); 
    setHwMaxImages(4); 
  };

  const startEditHw = (h: any) => { 
    setEditHwId(h.id); 
    setHwClubId(h.club_id.toString()); 
    setHwTopic(h.topic); 
    setHwDesc(h.description || ''); 
    setHwMaxImages(h.max_images || 4); 
    
    const formatDate = (dateStr: string) => { 
      if (!dateStr) return '';
      return dateStr.replace('Z', '').substring(0, 16); 
    }; 
    
    setHwDeadline(formatDate(h.deadline)); 
  };

  const handleSaveHw = async () => { 
    const finalClubId = user?.email !== ADMIN_EMAIL ? clubs.find(c => c.name === currentDbUser?.club_name)?.id : hwClubId; 
    if (!finalClubId || !hwTopic || !hwDeadline) return alert("Klub, Téma és Határidő kötelező!"); 
    
    try { 
      const url = editHwId ? `${BACKEND_URL}/api/homeworks/${editHwId}` : `${BACKEND_URL}/api/homeworks`; 
      const method = editHwId ? 'PUT' : 'POST'; 
      const res = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ clubId: finalClubId, topic: hwTopic, description: hwDesc, deadline: hwDeadline, maxImages: hwMaxImages }) 
      }); 
      
      if (res.ok) { 
        alert(editHwId ? "Házi feladat frissítve!" : "Házi feladat létrehozva!"); 
        clearHwForm(); 
        fetchData(); 
      } else alert("Hiba történt!"); 
    } catch (e) { alert("Hálózati hiba!"); } 
  };

  const handleDeleteHw = async (id: number) => { 
    if (!window.confirm("Biztosan törlöd ezt a házi feladatot? A hozzá tartozó összes kép is törlődik!")) return; 
    const res = await fetch(`${BACKEND_URL}/api/homeworks/${id}`, { method: 'DELETE' }); 
    if (res.ok) fetchData(); 
  };

  // ==============================================================
  // 3. RENDERELÉS
  // ==============================================================
  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b' }}>📝 Házi Feladatok Kezelése</h2>
      
      <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #f59e0b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: '#f59e0b' }}>{editHwId ? '✏️ Házi Feladat Szerkesztése' : '➕ Új Házi Feladat Kiírása'}</h3>
          {editHwId && <button onClick={clearHwForm} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}>Mégse / Új létrehozása</button>}
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {user.email === ADMIN_EMAIL ? (
            <div style={{flex: '1 1 200px'}}>
              <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Melyik klubnak?</label>
              <select value={hwClubId} onChange={e => setHwClubId(e.target.value)} style={inputStyle}>
                <option value="">-- Válassz Klubot --</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          ) : (
            <div style={{flex: '1 1 200px'}}>
              <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Klub</label>
              <div style={{...inputStyle, background: '#334155', color: '#94a3b8'}}>{currentDbUser?.club_name}</div>
            </div>
          )}
          <div style={{flex: '1 1 200px'}}>
            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Feltöltési Határidő</label>
            <input type="datetime-local" value={hwDeadline} onChange={e => setHwDeadline(e.target.value)} style={inputStyle} />
          </div>
          <div style={{flex: '1 1 100px'}}>
            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Max. kép / fő</label>
            <input type="number" min="1" value={hwMaxImages} onChange={e => setHwMaxImages(Number(e.target.value))} style={inputStyle} />
          </div>
        </div>

        <input placeholder="Házi feladat Témája (pl.: Őszi színek, Minimál)" value={hwTopic} onChange={e => setHwTopic(e.target.value)} style={inputStyle} />
        <textarea placeholder="Leírás, instrukciók a klubtagoknak..." value={hwDesc} onChange={e => setHwDesc(e.target.value)} style={{...inputStyle, minHeight: '80px'}} />
        
        <button onClick={handleSaveHw} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          {editHwId ? 'Frissítés' : 'Mentés és Kiírás'}
        </button>
      </div>

      <h3 style={{ color: '#f8fafc' }}>Klubod Házi Feladatai</h3>
      <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
        {adminHomeworks.length === 0 ? <div style={{padding: '20px', color: '#94a3b8', textAlign: 'center'}}>Nincs megjeleníthető feladat.</div> : null}
        {adminHomeworks.map((h, i) => {
          
          const safeDeadlineStr = h.deadline.replace('Z', ''); 
          const deadlineDate = new Date(safeDeadlineStr);
          const isPast = new Date() > deadlineDate;

          return (
            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: i < adminHomeworks.length - 1 ? '1px solid #334155' : 'none', background: i % 2 === 0 ? '#0f172a' : 'transparent', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: '#38bdf8' }}>{h.topic}</div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Klub: {h.club_name} | Határidő: {deadlineDate.toLocaleString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })} | Max: {h.max_images || 4} kép
                  <span style={{ color: isPast ? '#ef4444' : '#10b981', fontWeight: 'bold', marginLeft: '10px' }}>
                    ({isPast ? 'Lezárult' : 'Aktív'})
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={() => startEditHw(h)} style={{ background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>Szerkeszt</button>
                <button onClick={() => handleDeleteHw(h.id)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>Töröl</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
