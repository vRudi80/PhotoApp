import { getImageUrl } from '../utils/helpers';

interface ClubNightsViewProps {
  currentDbUser: any;
  meetingSearch: string;
  setMeetingSearch: (val: string) => void;
  searchedMeetings: any[];
  setActiveVideo: (url: string) => void;
}

export default function ClubNightsView({
  currentDbUser,
  meetingSearch,
  setMeetingSearch,
  searchedMeetings,
  setActiveVideo
}: ClubNightsViewProps) {
  return (
    <div>
      {!currentDbUser?.club_name ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>Nem vagy klubhoz rendelve</h2>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>A klubod eseményeinek megtekintéséhez kérjük, vedd fel a kapcsolatot egy adminisztrátorral.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
            <h2 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '2.5rem' }}>📅</span> Klubestek: {currentDbUser.club_name}
            </h2>
            <input 
              type="text" 
              placeholder="🔍 Keresés téma vagy leírás alapján..." 
              value={meetingSearch} 
              onChange={e => setMeetingSearch(e.target.value)} 
              style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: 'white', minWidth: '280px', outline: 'none' }} 
            />
          </div>
          
          {searchedMeetings.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Nincs a keresésnek megfelelő klubest.</p>
          ) : (
            <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {searchedMeetings.map(meet => {
                  const meetDateObj = new Date(meet.meeting_date);
                  const isPast = meetDateObj < new Date(new Date().setHours(0,0,0,0));
                  
                  return (
                    <div key={meet.id} style={{ height: '450px', background: '#1e293b', borderRadius: '16px', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
                      
                      <div style={{ height: '180px', flexShrink: 0, background: '#0f172a', position: 'relative' }}>
                        {meet.drive_file_id || meet.file_url ? (
                          <img src={getImageUrl(meet.drive_file_id, meet.file_url)} alt={meet.topic} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isPast ? 0.6 : 1 }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#334155', fontSize: '4rem' }}>📷</div>
                        )}
                        
                        <div className="contest-badge" style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(5px)', padding: '6px 10px', color: isPast ? '#94a3b8' : '#38bdf8', border: `1px solid ${isPast ? '#334155' : '#38bdf850'}`, textAlign: 'center', lineHeight: '1.1', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.65rem', opacity: 0.7, letterSpacing: '1px' }}>{meetDateObj.getFullYear()}</span>
                          <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', marginTop: '2px' }}>{meetDateObj.toLocaleDateString('hu-HU', { month: 'short' }).replace('.', '')}</span>
                          <span style={{ fontSize: '1.6rem', marginTop: '2px' }}>{meetDateObj.getDate()}</span>
                        </div>

                        {meet.video_link && (
                          <div 
                            onClick={() => setActiveVideo(meet.video_link)}
                            style={{ position: 'absolute', bottom: '15px', right: '15px', background: '#ef4444', color: 'white', padding: '8px 15px', borderRadius: '100px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 4px 6px rgba(0,0,0,0.5)' }}
                          >
                            ▶️ Videó
                          </div>
                        )}
                      </div>

                      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px', display: 'flex', gap: '15px', flexShrink: 0 }}>
                          <span>⏰ {meet.meeting_time.substring(0,5)}</span>
                          {isPast && <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Lezajlott</span>}
                        </div>
                        
                        <h3 style={{ margin: '0 0 10px 0', color: isPast ? '#cbd5e1' : '#f8fafc', fontSize: '1.4rem', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {meet.topic}
                        </h3>
                        
                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '15px', paddingRight: '5px' }}>
                          <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                            {meet.description}
                          </p>
                        </div>

                        <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          <div style={{ fontSize: '1.5rem' }}>{meet.location_type === 'online' ? '💻' : '📍'}</div>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>{meet.location_type === 'online' ? 'Online találkozó' : 'Fizikai helyszín'}</div>
                            {meet.location_type === 'online' ? (
                              isPast ? (
                                <div style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>A találkozó véget ért</div>
                              ) : (
                                <a href={meet.location_details} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Csatlakozás a híváshoz →</a>
                              )
                            ) : (
                              <div style={{ color: '#f8fafc', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meet.location_details || 'Helyszín később...'}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
