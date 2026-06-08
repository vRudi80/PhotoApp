import React from 'react';

interface UpcomingChallengesProps {
  upcomingTopics: any[];
  getTopicType: (startDate: string, endDate: string) => 'daily' | 'weekly';
  handleImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export default function UpcomingChallenges({
  upcomingTopics,
  getTopicType,
  handleImageError
}: UpcomingChallengesProps) {
  
  if (!upcomingTopics || upcomingTopics.length === 0) {
    return (
      <div style={{ color: '#94a3b8', textAlign: 'center', padding: '60px', background: '#1e293b', borderRadius: '24px', border: '1px solid #334155', animation: 'fadeIn 0.4s ease-out' }}>
        Nincs betárazva elkövetkező téma.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', animation: 'fadeIn 0.4s ease-out' }}>
      {upcomingTopics.map(t => {
        const isDaily = getTopicType(t.start_date, t.end_date) === 'daily';
        
        return (
          <div 
            key={t.id} 
            style={{ background: 'linear-gradient(180deg, #1e293b, #0f172a)', padding: '25px', borderRadius: '24px', border: '1px solid #475569', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}
          >
            <div style={{ marginBottom: '10px' }}>
              <span style={{ background: isDaily ? '#ef444420' : '#3b82f620', color: isDaily ? '#f87171' : '#60a5fa', border: `1px solid ${isDaily ? '#ef444450' : '#3b82f650'}`, padding: '4px 12px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                {isDaily ? '🔴 Napi Kihívás' : '🔵 Heti Kihívás'}
              </span>
            </div>
          
            {/* 🖼️ Prémium borítókép elmosott háttérfolyamattal */}
            {t.cover_url && (
              <div style={{ width: '100%', height: '150px', borderRadius: '14px', overflow: 'hidden', marginBottom: '15px', border: '1px solid #334155', position: 'relative', backgroundColor: '#090d16' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${t.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(12px) brightness(0.5)', transform: 'scale(1.1)' }}></div>
                <img src={t.cover_url} alt="" style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', zIndex: 1 }} onError={handleImageError} />
              </div>
            )}

            {t.cover_author && (
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic', marginTop: '-10px', marginBottom: '15px', textAlign: 'right', paddingRight: '5px' }}>
                📸 Borítókép: {t.cover_author}
              </div>
            )}

            <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '1.4rem' }}>{t.title}</h4>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', margin: '0 0 20px 0', flex: 1, lineHeight: '1.6' }}>{t.description}</p>
            
            {(t.master_name || t.master_email) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a78bfa', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '15px', background: '#a78bfa10', padding: '8px 14px', borderRadius: '10px', border: '1px solid #a78bfa20', width: 'fit-content' }}>
                <span>👑 Párbajmester:</span>
                <span style={{ color: '#e9d5ff', fontWeight: 'bold' }}>{t.master_name || t.master_email}</span>
              </div>
            )}

            <div style={{ color: '#38bdf8', fontSize: '0.9rem', background: '#0f172a', padding: '15px', borderRadius: '12px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #38bdf840' }}>
              ⏳ Start: {new Date(t.start_date).toLocaleDateString('hu-HU')}
            </div>
          </div>
        );
      })}
    </div>
  );
}
