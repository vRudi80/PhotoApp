import React, { useState } from 'react';

interface AdminClubsViewProps {
  clubs: any[];
  newClubName: string;
  setNewClubName: (name: string) => void;
  handleAddClub: () => void;
  handleDeleteClub: (id: number) => void;
  handleUpdateClub: (id: number, name: string) => void;
}

export default function AdminClubsView({
  clubs, newClubName, setNewClubName, handleAddClub, handleDeleteClub, handleUpdateClub
}: AdminClubsViewProps) {
  
  // Belső állapotok az inline szerkesztéshez
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const inputStyle = { 
    width: '100%', padding: '10px', backgroundColor: '#0f172a', 
    border: '1px solid #334155', color: 'white', borderRadius: '6px', 
    boxSizing: 'border-box' as const 
  };

  const startEdit = (id: number, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveEdit = (id: number) => {
    if (!editingName.trim()) return alert('A klub neve nem lehet üres!');
    handleUpdateClub(id, editingName.trim());
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b' }}>🏷️ Fotóklubok Kezelése</h2>
      
      {/* ÚJ KLUB HOZZÁADÁSA */}
      <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #334155', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input 
          placeholder="Új fotóklub neve..." 
          value={newClubName} 
          onChange={e => setNewClubName(e.target.value)} 
          style={{ ...inputStyle, marginBottom: 0, flex: 1, minWidth: '200px' }} 
        />
        <button onClick={handleAddClub} style={{ background: '#10b981', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Hozzáadás</button>
      </div>
      
      {/* KLUBOK LISTÁJA */}
      <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
        {clubs.map((c, index) => {
          const isEditing = editingId === c.id;
          
          // 🎯 KINYERÉS: Megnézzük melyik néven jön a számláló a backendről (Fallback: 0)
          const memberCount = c.member_count ?? c.user_count ?? c.users_count ?? 0;

          return (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: index < clubs.length - 1 ? '1px solid #334155' : 'none', background: index % 2 === 0 ? '#0f172a' : 'transparent', gap: '15px' }}>
              
              {isEditing ? (
                /* SZERKESZTÉSI MÓD */
                <div style={{ flex: 1, display: 'flex', gap: '10px' }}>
                  <input 
                    value={editingName} 
                    onChange={e => setEditingName(e.target.value)} 
                    style={{ ...inputStyle, padding: '6px 12px' }}
                    autoFocus
                  />
                  <button onClick={() => saveEdit(c.id)} style={{ background: '#10b981', color: '#0f172a', border: 'none', padding: '6px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Mentés</button>
                  <button onClick={cancelEdit} style={{ background: '#475569', color: 'white', border: 'none', padding: '6px 15px', borderRadius: '6px', cursor: 'pointer' }}>Mégse</button>
                </div>
              ) : (
                /* SIMA MEGJELENÍTÉSI MÓD */
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    {/* Klub neve */}
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </div>
                    
                    {/* 🎯 ÚJ: Tagok száma kis kapszula jelvényben */}
                    <span style={{ 
                      background: 'rgba(56, 189, 248, 0.1)', 
                      color: '#38bdf8', 
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      fontSize: '0.78rem', 
                      padding: '3px 10px', 
                      borderRadius: '50px', 
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      👥 {memberCount} tag
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                    <button onClick={() => startEdit(c.id, c.name)} style={{ background: '#3b82f620', color: '#3b82f6', border: '1px solid #3b82f640', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Szerkesztés ✏️</button>
                    <button onClick={() => handleDeleteClub(c.id)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>Törlés</button>
                  </div>
                </>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}
