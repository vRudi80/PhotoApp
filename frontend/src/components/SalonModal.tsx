import { getFlagEmoji } from '../utils/helpers';

interface SalonModalProps {
  salon: any;
  onClose: () => void;
}

export default function SalonModal({ salon, onClose }: SalonModalProps) {
  if (!salon) return null;

  return (
    <div onClick={(e) => { if(e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div style={{ background: '#1e293b', border: '1px solid #60a5fa', borderRadius: '16px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        
        <div style={{ padding: '30px' }}>
         <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
            {salon.patron_details && salon.patron_details.length > 0 ? (
              salon.patron_details.map((p: any) => <span key={p.name} style={{ background: '#a78bfa20', color: '#a78bfa', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid #a78bfa50' }}>{p.name} {p.number ? `(${p.number})` : ''}</span>)
            ) : (
              <span style={{ background: '#334155', color: '#94a3b8', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>Független Pályázat</span>
            )}
            {salon.is_circuit === 1 && <span style={{ background: '#f59e0b20', color: '#f59e0b', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid #f59e0b50' }}>Körverseny</span>}
          </div>
          
          <h2 style={{ color: '#f8fafc', fontSize: '1.8rem', margin: '0 0 15px 0', lineHeight: '1.3' }}>{salon.name}</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', color: '#94a3b8', marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #334155' }}>
            <span>{salon.country_code ? getFlagEmoji(salon.country_code) : '🏳️'}</span>
            <span style={{ fontWeight: 'bold', color: '#cbd5e1' }}>{salon.country_hun}</span>
            <span>•</span>
            <span>{salon.submission_type === 'online' ? '💻 Online leadás' : '🖼️ Papírkép'}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' }}>Feltöltési Határidő</div>
              <div style={{ fontSize: '1.2rem', color: '#ef4444', fontWeight: 'bold' }}>{new Date(salon.end_date).toLocaleDateString('hu-HU', {year: 'numeric', month: 'long', day: 'numeric'})}</div>
            </div>
            {salon.results_date && (
              <div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' }}>Eredményhirdetés</div>
                <div style={{ fontSize: '1.2rem', color: '#f8fafc', fontWeight: 'bold' }}>{new Date(salon.results_date).toLocaleDateString('hu-HU', {year: 'numeric', month: 'long', day: 'numeric'})}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' }}>Nevezési díj</div>
              <div style={{ fontSize: '1.2rem', color: '#10b981', fontWeight: 'bold' }}>{salon.fee_amount && salon.fee_amount > 0 ? `${salon.fee_amount} ${salon.fee_currency}` : 'Ingyenes'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' }}>Díjak száma</div>
              <div style={{ fontSize: '1.2rem', color: '#f59e0b', fontWeight: 'bold' }}>{salon.awards_count || 0} db</div>
            </div>
          </div>

          {salon.cash_prize && (
            <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #10b98150', marginBottom: '30px' }}>
              <div style={{ fontSize: '0.8rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '5px' }}>💰 Pénznyeremény</div>
              <div style={{ color: '#f8fafc' }}>{salon.cash_prize}</div>
            </div>
          )}

          {salon.circuit_number && (
            <div style={{ marginBottom: '30px' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '5px' }}>Körverseny azonosító(k)</div>
              <div style={{ color: '#cbd5e1' }}>{salon.circuit_number}</div>
            </div>
          )}

          {salon.categories && salon.categories.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <div style={{ fontSize: '0.8rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '10px' }}>Kategóriák</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {salon.categories.map((c: string) => (
                  <span key={c} style={{ background: '#38bdf815', color: '#38bdf8', padding: '6px 12px', borderRadius: '100px', fontSize: '0.9rem', border: '1px solid #38bdf830' }}>{c}</span>
                ))}
              </div>
            </div>
          )}

          {salon.website && (
            <a href={salon.website} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', background: '#60a5fa', color: '#0f172a', textDecoration: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', transition: 'background 0.2s', marginTop: '20px' }}>
              Ugrás a hivatalos weboldalra 🚀
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
