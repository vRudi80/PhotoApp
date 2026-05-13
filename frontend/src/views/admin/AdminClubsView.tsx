interface AdminClubsViewProps {
  clubs: any[];
  newClubName: string;
  setNewClubName: (name: string) => void;
  handleAddClub: () => void;
  handleDeleteClub: (id: number) => void;
}

export default function AdminClubsView({
  clubs, newClubName, setNewClubName, handleAddClub, handleDeleteClub
}: AdminClubsViewProps) {
  
  const inputStyle = { width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b' }}>🏷️ Fotóklubok Kezelése</h2>
      
      <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #334155', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input 
          placeholder="Új fotóklub neve..." 
          value={newClubName} 
          onChange={e => setNewClubName(e.target.value)} 
          style={{ ...inputStyle, marginBottom: 0, flex: 1, minWidth: '200px' }} 
        />
        <button onClick={handleAddClub} style={{ background: '#10b981', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Hozzáadás</button>
      </div>
      
      <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
        {clubs.map((c, index) => (
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: index < clubs.length - 1 ? '1px solid #334155' : 'none', background: index % 2 === 0 ? '#0f172a' : 'transparent' }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{c.name}</div>
            <button onClick={() => handleDeleteClub(c.id)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>Törlés</button>
          </div>
        ))}
      </div>
    </div>
  );
}
