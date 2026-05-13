import { ADMIN_EMAIL } from '../../utils/constants';

interface AdminHomeworksViewProps {
  user: any;
  currentDbUser: any;
  clubs: any[];
  adminHomeworks: any[];
  // Form state
  editHwId: number | null;
  hwClubId: string; setHwClubId: (val: string) => void;
  hwTopic: string; setHwTopic: (val: string) => void;
  hwDesc: string; setHwDesc: (val: string) => void;
  hwDeadline: string; setHwDeadline: (val: string) => void;
  hwMaxImages: number; setHwMaxImages: (val: number) => void;
  // Handlers
  clearHwForm: () => void;
  handleSaveHw: () => void;
  startEditHw: (h: any) => void;
  handleDeleteHw: (id: number) => void;
}

export default function AdminHomeworksView({
  user, currentDbUser, clubs, adminHomeworks, editHwId, hwClubId, setHwClubId,
  hwTopic, setHwTopic, hwDesc, setHwDesc, hwDeadline, setHwDeadline,
  hwMaxImages, setHwMaxImages, clearHwForm, handleSaveHw, startEditHw, handleDeleteHw
}: AdminHomeworksViewProps) {

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

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
          const isPast = new Date() > new Date(h.deadline);
          return (
            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: i < adminHomeworks.length - 1 ? '1px solid #334155' : 'none', background: i % 2 === 0 ? '#0f172a' : 'transparent', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: '#38bdf8' }}>{h.topic}</div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Klub: {h.club_name} | Határidő: {new Date(h.deadline).toLocaleString()} | Max: {h.max_images || 4} kép
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
