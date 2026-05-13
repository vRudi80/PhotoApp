interface SalonsViewProps {
  salonSearch: string;
  setSalonSearch: (val: string) => void;
  searchedSalons: any[];
  setSelectedSalon: (salon: any) => void;
  userEntrySalonIds: number[]; // ÚJ PROP: Szalon ID-k, amikben a usernek van nevezése
}

export default function SalonsView({ salonSearch, setSalonSearch, searchedSalons, setSelectedSalon, userEntrySalonIds }: SalonsViewProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
      {searchedSalons.map((s) => {
        const hasEntered = userEntrySalonIds.includes(s.id);
        const isEnded = new Date(s.end_date) < new Date(new Date().setHours(0,0,0,0));

        return (
          <div key={s.id} onClick={() => setSelectedSalon(s)} style={{ position: 'relative', cursor: 'pointer', background: '#1e293b', borderRadius: '16px', border: hasEntered ? '2px solid #10b981' : '1px solid #334155', overflow: 'hidden', transition: 'transform 0.2s', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
            
            {/* ÚJ: NEVEZVE BADGE */}
            {hasEntered && (
              <div style={{ position: 'absolute', top: '0', right: '0', background: '#10b981', color: '#0f172a', padding: '4px 12px', fontSize: '0.75rem', fontWeight: 'bold', borderBottomLeftRadius: '12px', zIndex: 5, boxShadow: '-2px 2px 5px rgba(0,0,0,0.2)' }}>
                ✓ NEVEZVE
              </div>
            )}

            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {s.patron_details?.map((p: any) => (
                  <span key={p.name} style={{ background: '#8b5cf615', color: '#a78bfa', padding: '3px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', border: '1px solid #8b5cf630' }}>
                    {p.name} {p.number ? `[${p.number}]` : ''} 
                  </span>
                ))}
              </div>

              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: hasEntered ? '#10b981' : '#f8fafc' }}>{s.name}</h3>
              
              {/* ... Többi kártya tartalom ... */}
            </div>
          </div>
        );
      })}
    </div>
  );
}
