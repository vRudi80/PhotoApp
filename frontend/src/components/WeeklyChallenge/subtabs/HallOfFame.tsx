import React, { useState } from 'react';
import { getImageUrl } from '../../../utils/helpers';

interface HallOfFameProps {
  isLoadingHof: boolean;
  hallOfFame: any[];
  user: any;
  getLevelDetails: (likes: number, victories: number) => { name: string; color: string; bg: string };
}

// 🛡️ Biztonságos, virtuális DOM-barát klublogó kezelő (Átköltöztetve ide)
function ClubLogo({ driveId, logoUrl }: { driveId: any; logoUrl: any }) {
  const [isError, setIsError] = useState(false);
  if (isError || (!driveId && !logoUrl)) {
    return <span style={{ fontSize: '1.1rem' }}>🛡️</span>;
  }
  return (
    <img 
      src={getImageUrl(driveId, logoUrl)} 
      alt="" 
      style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'contain', backgroundColor: '#0f172a', border: '1px solid #10b98130', display: 'inline-block' }} 
      onError={() => setIsError(true)} 
    />
  );
}

export default function HallOfFame({ isLoadingHof, hallOfFame, user, getLevelDetails }: HallOfFameProps) {
  
  if (isLoadingHof) {
    return <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>⏳ A pódium összeállítása...</div>;
  }

  if (!hallOfFame || hallOfFame.length === 0) {
    return <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>Még egyetlen fotós sem gyűjtött pontot. Legyél te az első!</div>;
  }

  return (
    <div style={{ background: '#1e293b', padding: '30px', borderRadius: '24px', border: '1px solid #fbbf2440', boxShadow: '0 10px 40px rgba(0,0,0,0.4)', animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ color: '#fbbf24', margin: 0, fontSize: '1.8rem', fontWeight: '900' }}>👑 Globális Fotós Dicsőségfal</h2>
        <p style={{ color: '#94a3b8', margin: '5px 0 0 0' }}>A közösség összesített ranglistája az éles és lezárult arénákban gyűjtött csillagok alapján.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {hallOfFame.map((row, index) => {
          const isMe = row.user_email === user?.email;
          const likes = Number(row.total_likes) || 0;
          const level = getLevelDetails(likes, 0); 
          
          const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#cbd5e1' : index === 2 ? '#b45309' : '#64748b';
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;

          return (
            <div 
              key={row.user_email || index} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                background: isMe ? 'linear-gradient(90deg, #fbbf2415, #0f172a)' : '#0f172a', 
                border: isMe ? '1px solid #fbbf2460' : '1px solid #334155', 
                padding: '16px 20px', 
                borderRadius: '16px',
                boxShadow: isMe ? '0 0 20px #fbbf2415' : 'none',
                transition: 'transform 0.2s'
              }}
            >
              <div style={{ fontSize: '1.4rem', fontWeight: '900', width: '45px', color: rankColor, textAlign: 'center' }}>
                {medal}
              </div>

              <div style={{ flex: 1, marginLeft: '10px' }}>
                <div style={{ color: isMe ? '#fbbf24' : 'white', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {row.user_name} {isMe && <span style={{ fontSize: '0.75rem', background: '#fbbf24', color: '#0f172a', padding: '2px 8px', borderRadius: '10px', fontWeight: '900' }}>TE VAGY</span>}
                </div>
                {row.club_name && (
                  <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ClubLogo driveId={row.drive_logo_id} logoUrl={row.logo_url} />
                    <span>{row.club_name}</span>
                  </div>
                )}
              </div>

              <div style={{ marginRight: '20px' }}>
                <span style={{ color: level.color, background: level.bg, border: `1px solid ${level.color}40`, padding: '6px 16px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {level.name}
                </span>
              </div>

              <div style={{ textAlign: 'right', minWidth: '80px' }}>
                <div style={{ color: '#fbbf24', fontWeight: '900', fontSize: '1.4rem' }}>{likes} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#64748b' }}>⭐</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
