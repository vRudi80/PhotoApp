import { ADMIN_EMAIL } from '../../utils/constants';

interface AdminMeetingsViewProps {
  user: any;
  currentDbUser: any;
  clubs: any[];
  meetings: any[];
  allUsers: any[];
  adminMeetings: any[];
  // Form state
  editMeetId: number | null;
  meetClubId: string; setMeetClubId: (val: string) => void;
  meetDate: string; setMeetDate: (val: string) => void;
  meetTime: string; setMeetTime: (val: string) => void;
  meetTopic: string; setMeetTopic: (val: string) => void;
  meetDesc: string; setMeetDesc: (val: string) => void;
  meetLocType: 'physical' | 'online'; setMeetLocType: (val: 'physical' | 'online') => void;
  meetLocDetails: string; setMeetLocDetails: (val: string) => void;
  meetVideoLink: string; setMeetVideoLink: (val: string) => void;
  meetCoverPreview: string | null;
  isMeetingUploading: boolean;
  // Handlers
  clearMeetingForm: () => void;
  handleMeetingCoverSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveMeeting: () => void;
  startEditMeeting: (m: any) => void;
  handleDeleteMeeting: (id: number) => void;
  // Attendance
  attendanceMeetId: number | null; setAttendanceMeetId: (id: number | null) => void;
  attendanceList: string[];
  openAttendance: (id: number) => void;
  toggleAttendance: (email: string) => void;
  saveAttendance: () => void;
}

export default function AdminMeetingsView({
  user, currentDbUser, clubs, meetings, allUsers, adminMeetings,
  editMeetId, meetClubId, setMeetClubId, meetDate, setMeetDate, meetTime, setMeetTime,
  meetTopic, setMeetTopic, meetDesc, setMeetDesc, meetLocType, setMeetLocType,
  meetLocDetails, setMeetLocDetails, meetVideoLink, setMeetVideoLink, meetCoverPreview,
  isMeetingUploading, clearMeetingForm, handleMeetingCoverSelect, handleSaveMeeting,
  startEditMeeting, handleDeleteMeeting, attendanceMeetId, setAttendanceMeetId,
  attendanceList, openAttendance, toggleAttendance, saveAttendance
}: AdminMeetingsViewProps) {

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b' }}>📅 Klubestek Kezelése</h2>
      
      {attendanceMeetId ? (
        <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '12px', border: '1px solid #38bdf8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#38bdf8' }}>✅ Jelenléti ív</h3>
            <button onClick={() => setAttendanceMeetId(null)} style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #475569', padding: '5px 15px', borderRadius: '6px', cursor: 'pointer' }}>Bezár</button>
          </div>
          {(() => {
            const meet = meetings.find(m => m.id === attendanceMeetId);
            const clubUsers = allUsers.filter(u => u.club_name === meet?.club_name);
            return (
              <>
                {clubUsers.length === 0 ? <p>Nincsenek tagok ebben a klubban.</p> : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                    {clubUsers.map(u => (
                      <label key={u.email} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#0f172a', padding: '10px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #334155' }}>
                        <input type="checkbox" checked={attendanceList.includes(u.email)} onChange={() => toggleAttendance(u.email)} style={{ width: '20px', height: '20px' }} />
                        <span>{u.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                <button onClick={saveAttendance} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Jelenlét Mentése</button>
              </>
            );
          })()}
        </div>
      ) : (
        <>
          <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, color: '#f59e0b' }}>{editMeetId ? '✏️ Klubest Szerkesztése' : '➕ Új Klubest Meghirdetése'}</h3>
              {editMeetId && <button onClick={clearMeetingForm} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}>Mégse / Új létrehozása</button>}
            </div>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {user.email === ADMIN_EMAIL ? (
                <div style={{flex: '1 1 200px'}}>
                  <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Melyik klubnak?</label>
                  <select value={meetClubId} onChange={e => setMeetClubId(e.target.value)} style={inputStyle}>
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
              
              <div style={{flex: '1 1 120px'}}>
                <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Dátum</label>
                <input type="date" value={meetDate} onChange={e => setMeetDate(e.target.value)} style={inputStyle} />
              </div>
              <div style={{flex: '1 1 120px'}}>
                <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Időpont</label>
                <input type="time" value={meetTime} onChange={e => setMeetTime(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <input placeholder="Klubest Témája (pl.: Portréfotózás alapjai)" value={meetTopic} onChange={e => setMeetTopic(e.target.value)} style={inputStyle} />
            <textarea placeholder="Részletes leírás, program..." value={meetDesc} onChange={e => setMeetDesc(e.target.value)} style={{...inputStyle, minHeight: '80px'}} />
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{flex: '1 1 150px'}}>
                <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Helyszín típusa</label>
                <select value={meetLocType} onChange={e => setMeetLocType(e.target.value as any)} style={inputStyle}>
                  <option value="physical">Fizikai Helyszín</option>
                  <option value="online">Online Link</option>
                </select>
              </div>
              <div style={{flex: '2 1 200px'}}>
                <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Cím vagy Csatlakozási Link</label>
                <input placeholder={meetLocType === 'online' ? "https://meet..." : "1051 Budapest..."} value={meetLocDetails} onChange={e => setMeetLocDetails(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{fontSize:'0.8rem', color:'#ef4444', fontWeight: 'bold'}}>🎥 YouTube Videó Link (Visszanézéshez - Opcionális)</label>
              <input placeholder="https://www.youtube.com/watch?v=..." value={meetVideoLink} onChange={e => setMeetVideoLink(e.target.value)} style={{...inputStyle, border: '1px solid #ef444450'}} />
            </div>

            <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Opcionális borítókép</label>
            <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleMeetingCoverSelect} style={{ color: '#94a3b8', marginBottom: '15px', width: '100%' }} disabled={isMeetingUploading} />
            {meetCoverPreview && <div style={{marginTop: '10px', marginBottom: '20px'}}><img src={meetCoverPreview} alt="Előnézet" style={{maxHeight: '150px', borderRadius: '8px', border: '1px solid #334155'}} /></div>}

            <button onClick={handleSaveMeeting} disabled={isMeetingUploading} style={{ background: isMeetingUploading ? '#475569' : '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: isMeetingUploading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              {isMeetingUploading ? 'Mentés folyamatban...' : editMeetId ? 'Klubest Frissítése' : 'Klubest Létrehozása'}
            </button>
          </div>

          <h3 style={{ color: '#f8fafc' }}>Rögzített Klubestek</h3>
          <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
            {adminMeetings.length === 0 ? <div style={{padding: '20px', color: '#94a3b8', textAlign: 'center'}}>Nincs megjeleníthető klubest.</div> : null}
            {adminMeetings.map((m, i) => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: i < adminMeetings.length - 1 ? '1px solid #334155' : 'none', background: i % 2 === 0 ? '#0f172a' : 'transparent', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#38bdf8' }}>{new Date(m.meeting_date).toLocaleDateString()} {m.meeting_time.substring(0,5)} - {m.topic}</div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    Klub: {m.club_name} 
                    {m.video_link && <span style={{ color: '#ef4444', marginLeft: '10px' }}>▶️ Van videó</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => openAttendance(m.id)} style={{ background: '#38bdf820', color: '#38bdf8', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Jelenlét</button>
                  <button onClick={() => startEditMeeting(m)} style={{ background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>Szerkeszt</button>
                  <button onClick={() => handleDeleteMeeting(m.id)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>Töröl</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
