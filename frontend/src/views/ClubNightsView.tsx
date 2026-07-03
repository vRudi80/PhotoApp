import React from 'react';
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

  // Karantén fék: Ha nincs klubja, VAGY a tagsága még csak függőben (pending) van, lezárjuk a képernyőt!
  const isPending = currentDbUser?.club_role === 'pending';
  const hasNoClub = !currentDbUser?.club_name || isPending;

  return (
    <div style={{ width: '100%', animation: 'fadeIn 0.4s ease-out' }}>
       {hasNoClub ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-main)', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontWeight: '700' }}>
            {isPending ? 'Jelentkezésed jóváhagyásra vár' : 'Nem vagy klubhoz rendelve'}
          </h2>
          <p style={{ color: 'var(--text-body)', fontSize: '1.1rem', maxWidth: '540px', margin: '0 auto' }}>
            A klubod eseményeinek és belső klubestjeinek megtekintéséhez kérjük, vedd fel a kapcsolatot egy adminisztrátorral. - kovari.rudolf@gmail.com
          </p>
        </div>
      ) : (
        <>
          {/* Felső sáv keresővel */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
            <h2 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '15px', color: 'var(--text-title)', fontWeight: '700', letterSpacing: '-0.5px' }}>
              <span style={{ fontSize: '2.5rem' }}>📅</span> Klubestek: {currentDbUser.club_name}
            </h2>
            <input 
              type="text" 
              placeholder="🔍 Keresés téma vagy leírás alapján..." 
              value={meetingSearch} 
              onChange={e => setMeetingSearch(e.target.value)} 
              style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-title)', minWidth: '280px', outline: 'none', fontSize: '0.95rem', transition: 'border-color 0.15s' }} 
            />
          </div>
          
          {/* Események listája */}
          {searchedMeetings.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', fontStyle: 'italic', padding: '20px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border-main)', textAlign: 'center' }}>
              Nincs a keresésnek megfelelő klubest.
            </p>
          ) : (
            <div style={{ maxHeight: '76vh', overflowY: 'auto', paddingRight: '5px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', paddingBottom: '20px' }}>
                {searchedMeetings.map(meet => {
                  const meetDateObj = new Date(meet.meeting_date);
                  const isPast = meetDateObj < new Date(new Date().setHours(0,0,0,0));
                  
                  return (
                    <div key={meet.id} style={{ height: '450px', background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-main)', boxShadow: '0 10px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', transition: 'transform 0.15s ease-in-out' }}>
                      
                      {/* Borítókép réteg */}
                      <div style={{ height: '180px', flexShrink: 0, background: 'var(--bg-main)', position: 'relative' }}>
                        {meet.drive_file_id || meet.file_url ? (
                          <img src={getImageUrl(meet.drive_file_id, meet.file_url)} alt={meet.topic} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isPast ? 0.5 : 1 }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContext: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--bg-card), var(--bg-main))', color: 'var(--text-muted)', fontSize: '4rem', opacity: 0.3 }}>📷</div>
                        )}
                        
                        {/* Dátum kártya plecsni */}
                        <div className="contest-badge" style={{ position: 'absolute', top: '15px', right: '15px', background: 'var(--bg-card)', backdropFilter: 'blur(8px)', padding: '6px 12px', color: isPast ? 'var(--text-muted)' : '#38bdf8', border: '1px solid var(--border-main)', borderRadius: '6px', textAlign: 'center', lineHeight: '1.1', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: '700', opacity: 0.6, letterSpacing: '0.5px' }}>{meetDateObj.getFullYear()}</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', marginTop: '3px' }}>{meetDateObj.toLocaleDateString('hu-HU', { month: 'short' }).replace('.', '')}</span>
                          <span style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '2px', color: 'var(--text-title)' }}>{meetDateObj.getDate()}</span>
                        </div>

                        {meet.video_link && (
                          <div 
                            onClick={() => setActiveVideo(meet.video_link)}
                            style={{ position: 'absolute', bottom: '15px', right: '15px', background: '#ef4444', color: 'white', padding: '8px 16px', borderRadius: '100px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(239,68,68,0.3)', transition: 'transform 0.1s' }}
                          >
                            ▶️ Videó
                          </div>
                        )}
                      </div>

                      {/* Szöveges tartalom réteg */}
                      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', gap: '12px', flexShrink: 0, fontWeight: '600' }}>
                          <span>⏰ {meet.meeting_time.substring(0,5)}</span>
                          {isPast && <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Lezajlott</span>}
                        </div>
                        
                        <h3 
                          title={meet.topic} 
                          style={{ margin: '0 0 10px 0', color: isPast ? 'var(--text-muted)' : 'var(--text-title)', fontSize: '1.2rem', fontWeight: '700', flexShrink: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.35' }}
                        >
                          {meet.topic}
                        </h3>
                        
                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '15px', paddingRight: '5px' }}>
                          <p style={{ color: 'var(--text-body)', fontSize: '0.9rem', margin: 0, lineHeight: '1.55', whiteSpace: 'pre-wrap' }}>
                            {meet.description}
                          </p>
                        </div>

                        {/* Helyszín info sáv */}
                        <div style={{ background: 'var(--bg-main)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          <div style={{ fontSize: '1.3rem' }}>{meet.location_type === 'online' ? '💻' : '📍'}</div>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.3px' }}>{meet.location_type === 'online' ? 'Online találkozó' : 'Fizikai helyszín'}</div>
                            {meet.location_type === 'online' ? (
                              isPast ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>A találkozó véget ért</div>
                              ) : (
                                <a title={meet.location_details} href={meet.location_details} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.85rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Csatlakozás a híváshoz →</a>
                              )
                            ) : (
                              <div title={meet.location_details || 'Helyszín később...'} style={{ color: 'var(--text-title)', fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meet.location_details || 'Helyszín később...'}</div>
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
