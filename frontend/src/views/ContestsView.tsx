import { useState, useEffect } from 'react';
import { ADMIN_EMAIL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';

interface ContestsViewProps {
  activeTab: string;
  user: any;
  currentDbUser: any;
  isLeader: boolean;
  clubs: any[];
  allUsers: any[];
  filteredContests: any[];
  myEntries: any[];
  juryList: any[];
  
  // New contest form
  newTitle: string; setNewTitle: (v: string) => void;
  newDesc: string; setNewDesc: (v: string) => void;
  newStart: string; setNewStart: (v: string) => void;
  newEnd: string; setNewEnd: (v: string) => void;
  newCats: string; setNewCats: (v: string) => void;
  newRestrictedClub: string; setNewRestrictedClub: (v: string) => void;
  newEntryFee: number | string; setNewEntryFee: (v: number | string) => void; // ÚJ!
  newFeeCurrency: string; setNewFeeCurrency: (v: string) => void; // ÚJ!
  handleCreateContest: () => void;
  
  // Edit contest form
  editContestId: number | null; setEditContestId: (v: number | null) => void;
  editTitle: string; setEditTitle: (v: string) => void;
  editDesc: string; setEditDesc: (v: string) => void;
  editStart: string; setEditStart: (v: string) => void;
  editEnd: string; setEditEnd: (v: string) => void;
  editCats: string; setEditCats: (v: string) => void;
  editRestrictedClub: string; setEditRestrictedClub: (v: string) => void;
  editEntryFee: number | string; setEditEntryFee: (v: number | string) => void; // ÚJ!
  editFeeCurrency: string; setEditFeeCurrency: (v: string) => void; // ÚJ!
  startEdit: (c: any) => void;
  handleUpdateContest: () => void;
  handleDeleteContest: (id: number) => void;

  // Stats & Progress
  viewStatsContestId: number | null; setViewStatsContestId: (v: number | null) => void;
  contestStats: any[]; loadStats: (id: number) => void;
  viewJuryProgressId: number | null; setViewJuryProgressId: (v: number | null) => void;
  juryProgressData: any; loadJuryProgress: (id: number) => void;

  // Jury config
  manageJuryContestId: number | null; setManageJuryContestId: (v: number | null) => void;
  selectedJuryEmail: string; setSelectedJuryEmail: (v: string) => void;
  handleAddJury: (id: number) => void;
  handleRemoveJury: (id: number, email: string) => void;

  // Results
  viewResultsContestId: number | null; setViewResultsContestId: (v: number | null) => void;
  contestResults: any[]; loadResults: (id: number) => void;

  // Uploading
  activeUploadContest: number | null; setActiveUploadContest: (v: number | null) => void;
  uploadTitle: string; setUploadTitle: (v: string) => void;
  uploadCategory: string; setUploadCategory: (v: string) => void;
  uploadPreview: string | null; setUploadPreview: (v: string | null) => void;
  isUploading: boolean;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpload: (id: number) => void;

  // Judging
  judgingContestId: number | null; setJudgingContestId: (v: number | null) => void;
  unvotedEntries: any[];
  currentScore: number | ''; setCurrentScore: (v: number | '') => void;
  startJudging: (id: number) => void;
  submitVote: () => void;

  // Entry Management
  editingEntryId: number | null; setEditingEntryId: (v: number | null) => void;
  editEntryTitle: string; setEditEntryTitle: (v: string) => void;
  handleUpdateEntryTitle: (id: number) => void;
  handleDeleteEntry: (id: number) => void;

  setFullscreenData: (data: {url: string, title?: string} | null) => void;

  // ÚJ: Fizetések kezelése
  contestPayments: any[];
  handlePayContestFee: (contestId: number) => void;
}

export default function ContestsView(props: ContestsViewProps) {
  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

  const [isSubmittingVote, setIsSubmittingVote] = useState(false);

  useEffect(() => {
    setIsSubmittingVote(false);
  }, [props.unvotedEntries, props.currentScore]);

  return (
    <>
      {props.activeTab === 'contests_club_active' && !props.currentDbUser?.club_name && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>Nem vagy klubhoz rendelve</h2>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>A klubod belső pályázatainak megtekintéséhez kérjük, vedd fel a kapcsolatot egy adminisztrátorral.</p>
        </div>
      )}

      {!(props.activeTab === 'contests_club_active' && !props.currentDbUser?.club_name) && (
        <>
          {((props.activeTab === 'admin_contests' && props.user.email === ADMIN_EMAIL) || 
            (props.activeTab === 'contests_club_active' && props.isLeader)) && (
            
            <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #f59e0b' }}>
              <h3 style={{ marginTop: 0, color: '#f59e0b' }}>
                {props.user.email === ADMIN_EMAIL ? '⚙️ Globális Pályázat Létrehozása (Admin)' : `📝 Új Belső Pályázat Kiírása (${props.currentDbUser?.club_name})`}
              </h3>
              <input placeholder="Pályázat címe" value={props.newTitle} onChange={e => props.setNewTitle(e.target.value)} style={inputStyle} />
              <textarea placeholder="Leírás / Szabályzat" value={props.newDesc} onChange={e => props.setNewDesc(e.target.value)} style={{...inputStyle, minHeight: '60px'}} />
              
                            <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                <div style={{flex: '1 1 200px'}}><label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Kezdés</label><input type="datetime-local" value={props.newStart} onChange={e => props.setNewStart(e.target.value)} style={inputStyle} /></div>
                <div style={{flex: '1 1 200px'}}><label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Befejezés</label><input type="datetime-local" value={props.newEnd} onChange={e => props.setNewEnd(e.target.value)} style={inputStyle} /></div>
              </div>

              {/* ÚJ: Pályázati díj beállítása */}
              <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '5px'}}>

                <div style={{flex: '1 1 200px'}}>
                  <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Nevezési díj (0 = Ingyenes)</label>
                  <input type="number" min="0" value={props.newEntryFee} onChange={e => props.setNewEntryFee(e.target.value)} style={inputStyle} />
                </div>
                <div style={{flex: '1 1 200px'}}>
                  <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Pénznem</label>
                  <select value={props.newFeeCurrency} onChange={e => props.setNewFeeCurrency(e.target.value)} style={inputStyle}>
                    <option value="HUF">HUF (Forint)</option>
                    <option value="EUR">EUR (Euró)</option>
                  </select>
                </div>
              </div>

              <input placeholder="Kategóriák (pl: Természet, Portré, Kreatív) - vesszővel elválasztva" value={props.newCats} onChange={e => props.setNewCats(e.target.value)} style={inputStyle} />
              
              {props.user.email === ADMIN_EMAIL ? (
                <select value={props.newRestrictedClub} onChange={e => props.setNewRestrictedClub(e.target.value)} style={{...inputStyle, border: '1px solid #f59e0b'}}>
                  <option value="">🔓 Nyilvános pályázat (Bárki nevezhet)</option>
                  {props.clubs.map(c => <option key={c.id} value={c.name}>🔒 Zártkörű: {c.name}</option>)}
                </select>
              ) : (
                <div style={{ padding: '10px', background: '#0f172a', borderRadius: '6px', color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '15px', border: '1px solid #334155' }}>
                  🔒 Láthatóság: <strong>Kizárólag a(z) {props.currentDbUser?.club_name} tagjai nevezhetnek.</strong>
                </div>
              )}
              
              <button onClick={props.handleCreateContest} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Pályázat Kiírása 🚀</button>
            </div>
          )}

          <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>
            {props.activeTab === 'admin_contests' ? 'Összes Pályázat (Admin)' : props.activeTab === 'contests_club_active' ? `Klubom Aktív Pályázatai (${props.currentDbUser?.club_name})` : props.activeTab === 'contests_closed' ? 'Lezárult Pályázatok' : 'Nyílt Aktív Fotópályázatok'}
          </h2>
          
          {props.filteredContests.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>Jelenleg nincsenek pályázatok ebben a kategóriában.</p>
          ) : (
            props.filteredContests.map(contest => {
              const now = new Date();
              const start = contest.start_date ? new Date(contest.start_date) : new Date(0);
              const end = contest.end_date ? new Date(contest.end_date) : new Date(0);
              const isStarted = now >= start;
              const isEnded = now > end && start.getFullYear() > 1970;
              const isActive = isStarted && !isEnded;
              
              const categories = contest.categories ? contest.categories.split(',').map((c:string) => c.trim()).filter(Boolean) : [];
              const contestJury = props.juryList.filter(j => j.contest_id === contest.id);
              const isUserJury = contestJury.some(j => j.user_email === props.user.email);

              const myContestEntries = props.myEntries.filter(e => e.contest_id === contest.id);
              const categoryCounts: Record<string, number> = {};
              categories.forEach((cat: string) => categoryCounts[cat] = 0);
              myContestEntries.forEach(entry => { if (categoryCounts[entry.category] !== undefined) categoryCounts[entry.category]++; });

              const canManageContest = props.user.email === ADMIN_EMAIL || (props.isLeader && contest.restricted_club === props.currentDbUser?.club_name);
              const expectedVotes = (contest.entry_count || 0) * (contest.jury_count || 0);
              const isJudgingComplete = contest.entry_count > 0 ? (expectedVotes > 0 && contest.vote_count >= expectedVotes) : true;
              
              const badgeText = isActive ? 'Aktív Pályázat' : isEnded ? (isJudgingComplete ? 'Lezárult' : 'Zsűrizés alatt') : 'Hamarosan indul';
              const badgeColor = isActive ? '#10b981' : isEnded ? (isJudgingComplete ? '#ef4444' : '#a78bfa') : '#f59e0b';
              const badgeBg = isActive ? '#10b98120' : isEnded ? (isJudgingComplete ? '#ef444420' : '#a78bfa20') : '#f59e0b20';

              // ÚJ: Fizetési státusz ellenőrzése ehhez a pályázathoz
              const entryFee = contest.entry_fee || 0;
              const isFeeRequired = entryFee > 0;
              const hasPaid = (props.contestPayments || []).some(p => p.contest_id === contest.id && p.user_email === props.user.email);

              return (
                <div key={contest.id} style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: `1px solid ${badgeColor}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', position: 'relative' }}>
                  
                  {contest.restricted_club && (
                    <div style={{ position: 'absolute', top: '-12px', left: '20px', background: '#f59e0b', color: '#0f172a', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                      🔒 Zártkörű: {contest.restricted_club}
                    </div>
                  )}

                  {props.viewJuryProgressId === contest.id ? (
                    <div style={{ background: '#0f172a', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #a78bfa' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, color: '#a78bfa' }}>📈 Zsűrizés állása: {contest.title}</h3>
                        <button onClick={() => props.setViewJuryProgressId(null)} style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #475569', padding: '5px 15px', borderRadius: '6px', cursor: 'pointer' }}>Bezár</button>
                      </div>
                      <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '1.1rem' }}>
                        Összes beküldött kép: <strong style={{color: '#f8fafc'}}>{props.juryProgressData.total_entries} db</strong>
                      </div>
                      {props.juryProgressData.stats.length === 0 ? (
                        <p style={{ color: '#94a3b8' }}>Nincs zsűritag kijelölve.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          {props.juryProgressData.stats.map((stat: any) => {
                            const userObj = props.allUsers.find(u => u.email === stat.user_email);
                            const name = userObj ? userObj.name : stat.user_email;
                            const remaining = props.juryProgressData.total_entries - stat.voted_count;
                            const percent = props.juryProgressData.total_entries > 0 ? Math.round((stat.voted_count / props.juryProgressData.total_entries) * 100) : 0;
                            
                            return (
                              <div key={stat.user_email} style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                  <strong style={{ color: '#f8fafc' }}>{name}</strong>
                                  <span style={{ color: remaining <= 0 ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
                                    {remaining <= 0 ? 'Kész' : `${remaining} kép van hátra`}
                                  </span>
                                </div>
                                <div style={{ width: '100%', background: '#0f172a', borderRadius: '100px', height: '10px', overflow: 'hidden' }}>
                                  <div style={{ width: `${percent}%`, background: remaining <= 0 ? '#10b981' : '#a78bfa', height: '100%', transition: 'width 0.3s' }}></div>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '8px', textAlign: 'right' }}>
                                  {stat.voted_count} / {props.juryProgressData.total_entries} értékelve
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : props.manageJuryContestId === contest.id ? (
                      <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px' }}>
                        <h4 style={{marginTop: 0, color: '#a78bfa'}}>⚖️ Zsűri kezelése</h4>
                        <div style={{display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap'}}>
                          <select value={props.selectedJuryEmail} onChange={e => props.setSelectedJuryEmail(e.target.value)} style={{...inputStyle, marginBottom: 0, flex: '1 1 200px'}}>
                            <option value="">-- Válassz usert --</option>
                            {props.allUsers.filter(u => !contestJury.some(j => j.user_email === u.email)).map(u => (<option key={u.email} value={u.email}>{u.name} ({u.email})</option>))}
                          </select>
                          <button onClick={() => props.handleAddJury(contest.id)} style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer' }}>Hozzáadás</button>
                        </div>
                        <ul style={{ padding: 0, listStyle: 'none' }}>
                          {contestJury.map(jury => <li key={jury.user_email} style={{ display: 'flex', justifyContent: 'space-between', background: '#1e293b', padding: '10px', borderRadius: '6px', marginBottom: '5px' }}><span>{props.allUsers.find(u => u.email === jury.user_email)?.name || jury.user_email}</span><button onClick={() => props.handleRemoveJury(contest.id, jury.user_email)} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}>Töröl</button></li>)}
                        </ul>
                        <button onClick={() => props.setManageJuryContestId(null)} style={{ marginTop: '10px', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', padding: '5px 15px', borderRadius: '6px', cursor: 'pointer' }}>Vissza</button>
                      </div>
                  ) : props.viewStatsContestId === contest.id ? (
                    <div style={{ background: '#0f172a', padding: '20px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, color: '#38bdf8' }}>📊 Nevezési Statisztika: {contest.title}</h3>
                        <button onClick={() => props.setViewStatsContestId(null)} style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #475569', padding: '5px 15px', borderRadius: '6px', cursor: 'pointer' }}>Bezár</button>
                      </div>
                      {props.contestStats.length === 0 ? (
                        <p style={{ color: '#94a3b8' }}>Még nem érkezett nevezés ehhez a pályázathoz.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          {Object.entries(props.contestStats.reduce((acc, curr) => {
                            if (!acc[curr.user_email]) acc[curr.user_email] = { name: curr.user_name, cats: [] };
                            acc[curr.user_email].cats.push({ cat: curr.category, count: curr.image_count });
                            return acc;
                          }, {} as Record<string, any>)).map(([email, data]: any) => {
                            // ÚJ: Fizetési állapot ellenőrzése az adminként vizsgált tagnál
                            const userHasPaid = (props.contestPayments || []).some(p => p.contest_id === contest.id && p.user_email === email);
                            
                            return (
                              <div key={email} style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#f8fafc', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                  <span>{data.name}</span>
                                  {isFeeRequired && (
                                    <span style={{ fontSize: '0.85rem', color: userHasPaid ? '#10b981' : '#f59e0b', background: userHasPaid ? '#10b98120' : '#f59e0b20', padding: '4px 8px', borderRadius: '4px', border: `1px solid ${userHasPaid ? '#10b98150' : '#f59e0b50'}` }}>
                                      {userHasPaid ? '✅ Befizetve' : '⏳ Nincs fizetve'}
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                  {data.cats.map((c: any) => (
                                    <span key={c.cat} style={{ background: '#38bdf820', color: '#38bdf8', padding: '6px 12px', borderRadius: '100px', fontSize: '0.85rem' }}>{c.cat}: <strong style={{color: '#f8fafc'}}>{c.count} db</strong></span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : props.editContestId === contest.id ? (
                    <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px' }}>
                      <h4 style={{marginTop: 0, color: '#f59e0b'}}>Pályázat Szerkesztése</h4>
                      <input value={props.editTitle} onChange={e => props.setEditTitle(e.target.value)} style={inputStyle} />
                      <textarea value={props.editDesc} onChange={e => props.setEditDesc(e.target.value)} style={{...inputStyle, minHeight: '60px'}} />
                      
                      <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                        <div style={{flex: '1 1 200px'}}><label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Kezdés</label><input type="datetime-local" value={props.editStart} onChange={e => props.setEditStart(e.target.value)} style={inputStyle} /></div>
                        <div style={{flex: '1 1 200px'}}><label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Befejezés</label><input type="datetime-local" value={props.editEnd} onChange={e => props.setEditEnd(e.target.value)} style={inputStyle} /></div>
                      </div>

                      {/* ÚJ: Pályázati díj módosítása */}
                      <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '5px'}}>
                        <div style={{flex: '1 1 200px'}}>
                          <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Nevezési díj (0 = Ingyenes)</label>
                          <input type="number" min="0" value={props.editEntryFee} onChange={e => props.setEditEntryFee(e.target.value)} style={inputStyle} />
                        </div>
                        <div style={{flex: '1 1 200px'}}>
                          <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Pénznem</label>
                          <select value={props.editFeeCurrency} onChange={e => props.setEditFeeCurrency(e.target.value)} style={inputStyle}>
                            <option value="HUF">HUF (Forint)</option>
                            <option value="EUR">EUR (Euró)</option>
                          </select>
                        </div>
                      </div>

                      <input value={props.editCats} onChange={e => props.setEditCats(e.target.value)} style={inputStyle} />
                      <select value={props.editRestrictedClub} onChange={e => props.setEditRestrictedClub(e.target.value)} style={{...inputStyle, border: '1px solid #f59e0b'}}>
                        <option value="">🔓 Nyilvános pályázat (Bárki nevezhet)</option>
                        {props.clubs.map(c => <option key={c.id} value={c.name}>🔒 Zártkörű: {c.name}</option>)}
                      </select>
                      <div style={{display: 'flex', gap: '10px'}}>
                        <button onClick={props.handleUpdateContest} style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>Mentés</button>
                        <button onClick={() => props.setEditContestId(null)} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>Mégse</button>
                      </div>
                    </div>

                  ) : props.judgingContestId === contest.id ? (
                    <>
                      <div style={{ background: '#0f172a', padding: '25px', borderRadius: '12px', textAlign: 'center', border: '2px solid #f59e0b' }}>
                        <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '1.4rem' }}>⚖️ Zsűrizés megnyitva teljes képernyőn!</h4>
                        <p style={{ color: '#94a3b8', margin: '0 0 20px 0' }}>Az értékelő pult egy új felugró ablakban nyílt meg. Ha véletlenül bezártad, de még maradt értékelendő kép, frissítsd az oldalt vagy kattints a gombra.</p>
                        <button onClick={() => props.setJudgingContestId(null)} style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef4444', padding: '10px 25px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                          Zsűrizés megszakítása
                        </button>
                      </div>

                      <div style={{ position: 'fixed', inset: 0, backgroundColor: '#0f172a', zIndex: 10000, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '15px 30px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                            <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              ⚖️ Zsűrizés: {contest.title}
                            </h3>
                            <div style={{ background: '#0f172a', border: '1px solid #334155', padding: '5px 15px', borderRadius: '100px', color: '#94a3b8', fontWeight: 'bold' }}>
                              Még értékelésre vár: <span style={{ color: '#38bdf8', fontSize: '1.1rem', marginLeft: '5px' }}>{props.unvotedEntries.length} db</span>
                            </div>
                          </div>
                          <button onClick={() => props.setJudgingContestId(null)} style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef4444', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.2s' }}>
                            Szünet / Kilépés
                          </button>
                        </div>

                        {props.unvotedEntries.length > 0 ? (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            {(() => {
                              const currentEntry = props.unvotedEntries[0];
                              const imageUrl = getImageUrl(currentEntry.drive_file_id, currentEntry.file_url);
                              return (
                                <div key={currentEntry.id} style={{ flex: 1, background: '#000000', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', overflow: 'hidden' }}>
                                  <img 
                                    src={imageUrl} 
                                    alt="Nevezett kép" 
                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                                  />
                                </div>
                              );
                            })()}

                            <div style={{ background: '#1e293b', padding: '25px 40px', borderTop: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '30px', flexWrap: 'wrap' }}>
                              <div style={{ flex: '1', minWidth: '250px' }}>
                                <div style={{ fontSize: '1.5rem', color: '#f8fafc', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '8px' }}>
                                  {props.unvotedEntries[0].title || 'Névtelen kép'}
                                </div>
                                <div style={{ display: 'inline-block', background: '#38bdf820', color: '#38bdf8', padding: '4px 12px', borderRadius: '100px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                  Kategória: {props.unvotedEntries[0].category || 'Ismeretlen'}
                                </div>
                              </div>

                              <div style={{ flex: '2', minWidth: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '20px' }}>
                                  <span style={{ color: '#94a3b8', fontWeight: 'bold', fontSize: '1.3rem' }}>0</span>
                                  <input 
                                      type="range" 
                                      min="0" max="100" 
                                      value={props.currentScore === '' ? 0 : props.currentScore} 
                                      onChange={e => props.setCurrentScore(Number(e.target.value))}
                                      style={{ flex: 1, cursor: 'pointer', height: '10px', accentColor: '#f59e0b' }}
                                  />
                                  <span style={{ color: '#94a3b8', fontWeight: 'bold', fontSize: '1.3rem' }}>100</span>
                                </div>
                                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Húzd a csúszkát, vagy kattints a mezőbe a gépeléshez!</div>
                              </div>

                              <div style={{ flex: '1', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px', minWidth: '250px' }}>
                                <input 
                                  type="number" 
                                  min="0" max="100" 
                                  placeholder="Pont"
                                  value={props.currentScore}
                                  onChange={e => props.setCurrentScore(e.target.value ? Number(e.target.value) : '')}
                                  onKeyDown={e => { 
                                    if(e.key === 'Enter' && props.currentScore !== '' && !isSubmittingVote) {
                                      setIsSubmittingVote(true);
                                      props.submitVote();
                                    } 
                                  }}
                                  style={{ width: '110px', fontSize: '2.5rem', padding: '10px', textAlign: 'center', background: '#0f172a', border: '3px solid #f59e0b', color: '#f59e0b', borderRadius: '12px', fontWeight: 'bold', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}
                                />
                                <button 
                                  onClick={() => {
                                    setIsSubmittingVote(true);
                                    props.submitVote();
                                  }}
                                  disabled={props.currentScore === '' || isSubmittingVote}
                                  style={{ background: props.currentScore === '' || isSubmittingVote ? '#475569' : '#10b981', color: props.currentScore === '' || isSubmittingVote ? '#94a3b8' : '#0f172a', border: 'none', padding: '20px 30px', borderRadius: '12px', fontSize: '1.4rem', fontWeight: 'bold', cursor: props.currentScore === '' || isSubmittingVote ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: props.currentScore === '' || isSubmittingVote ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.4)' }}
                                >
                                  {isSubmittingVote ? '⏳...' : 'Tovább 🚀'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#0f172a' }}>
                            <div style={{ fontSize: '6rem', marginBottom: '20px' }}>🎉</div>
                            <h2 style={{ color: '#10b981', fontSize: '2.5rem', margin: '0 0 15px 0' }}>Minden képet értékeltél!</h2>
                            <p style={{ color: '#94a3b8', fontSize: '1.2rem', marginBottom: '30px' }}>Köszönjük a munkádat! A zsűrizés állását az admin felületen követheted.</p>
                            <button onClick={() => props.setJudgingContestId(null)} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '15px 30px', borderRadius: '8px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}>
                              Vissza a pályázatokhoz
                            </button>
                          </div>
                        )}
                      </div>
                    </>

                  ) : props.viewResultsContestId === contest.id ? (
                      <div style={{ background: '#0f172a', padding: '20px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '20px' }}>
                          <h3 style={{ margin: '0', color: '#10b981' }}>🏆 Végeredmény: {contest.title}</h3>
                          <button onClick={() => props.setViewResultsContestId(null)} style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #475569', padding: '5px 15px', borderRadius: '6px', cursor: 'pointer' }}>Bezár</button>
                        </div>
                        {categories.map((cat: string) => {
                          const catResults = props.contestResults.filter(r => r.category === cat);
                          if (catResults.length === 0) return null;
                          return (
                            <div key={cat} style={{ marginBottom: '30px' }}>
                              <h4 style={{ color: '#38bdf8', borderBottom: '2px solid #38bdf8', display: 'inline-block', paddingBottom: '5px' }}>{cat}</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {catResults.map((res, index) => (
                                  <div key={res.id} style={{ display: 'flex', alignItems: 'center', background: '#1e293b', padding: '10px', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', width: '40px', color: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#475569' }}>#{index + 1}</div>
                                    <img src={getImageUrl(res.drive_file_id, res.file_url)} alt="Kép" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', marginRight: '15px', cursor: 'pointer' }} onClick={() => props.setFullscreenData({url: getImageUrl(res.drive_file_id, res.file_url), title: res.title})} />
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: 'bold' }}>{res.title}</div>
                                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Készítő: {res.user_name} ({res.user_email})</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981' }}>{res.total_score} pont</div>
                                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{res.vote_count} szavazat</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                  ) : (
                    <>
                      <div className="contest-header">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', paddingTop: contest.restricted_club ? '10px' : '0' }}>
                            <h3 style={{ margin: '0' }}>{contest.title}</h3>
                            <span className="contest-badge" style={{ background: badgeBg, color: badgeColor, marginLeft: '10px' }}>{badgeText}</span>
                            {/* ÚJ: Fizetős jelvény megjelenítése a cím mellett */}
                            {isFeeRequired && (
                              <span style={{ background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b50', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', marginLeft: '10px' }}>
                                💎 {entryFee} {contest.fee_currency}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '10px' }}>
                            {canManageContest && (
                              <>
                                <button onClick={() => props.loadStats(contest.id)} style={{ background: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>📊 Nevezők</button>
                                {contestJury.length > 0 && (
                                  <button onClick={() => props.loadJuryProgress(contest.id)} style={{ background: 'transparent', border: '1px solid #a78bfa', color: '#a78bfa', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>📈 Zsűrizés állása</button>
                                )}
                                {props.user.email === ADMIN_EMAIL && props.activeTab === 'admin_contests' && (
                                  <>
                                    <button onClick={() => props.startEdit(contest)} style={{ background: 'transparent', border: '1px solid #f59e0b', color: '#f59e0b', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>Szerkesztés</button>
                                    <button onClick={() => props.setManageJuryContestId(contest.id)} style={{ background: 'transparent', border: '1px solid #8b5cf6', color: '#8b5cf6', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>Zsűri ({contestJury.length})</button>
                                    <button onClick={() => props.handleDeleteContest(contest.id)} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>Törlés</button>
                                  </>
                                )}
                              </>
                            )}
                            {isEnded && contest.entry_count > 0 && (canManageContest || isJudgingComplete) && (
                              <button onClick={() => props.loadResults(contest.id)} style={{ background: '#10b981', border: 'none', color: 'white', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>🏆 Eredmények</button>
                            )}
                          </div>
                          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '10px 0 15px 0', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{contest.description}</p>
                        </div>
                      </div>
                      <p style={{fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 15px 0'}}>📅 {start.getFullYear() > 1970 ? `${start.toLocaleDateString()} - ${end.toLocaleDateString()}` : 'Nincs dátum megadva'}</p>

                      {contestJury.length > 0 && (
                        <div style={{ fontSize: '0.85rem', color: '#a78bfa', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span>⚖️ <strong>Zsűri:</strong> {contestJury.map(j => props.allUsers.find(u => u.email === j.user_email)?.name || j.user_email).join(', ')}</span>
                        </div>
                      )}

                      {isUserJury && (
                        <div style={{ background: 'linear-gradient(to right, #f59e0b20, #0f172a)', borderLeft: '4px solid #f59e0b', color: '#f8fafc', padding: '15px 20px', borderRadius: '0 8px 8px 0', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                          <div>
                            <strong style={{ color: '#f59e0b', fontSize: '1.1rem' }}>🏅 Zsűritag vagy!</strong>
                            <div style={{ fontSize: '0.9rem', marginTop: '5px', color: '#cbd5e1' }}>{isActive ? 'A pontozás a pályázat lezárulta után indul.' : isEnded ? 'A pályázat lezárult, kezdheted a pontozást!' : 'A pályázat még nem indult el.'}</div>
                          </div>
                          {isEnded && (
                            <button onClick={() => props.startJudging(contest.id)} style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.3)' }}>Értékelés Indítása</button>
                          )}
                        </div>
                      )}

                      {isActive && !isUserJury && props.activeUploadContest !== contest.id && (
                        <button onClick={() => { props.setActiveUploadContest(contest.id); props.setUploadCategory(''); }} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '15px' }}>+ Új Kép Nevezése</button>
                      )}

                      {props.activeUploadContest === contest.id && (
                        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #38bdf840' }}>
                          <h4 style={{marginTop: 0, color: '#38bdf8', fontSize: '1.2rem'}}>Kép feltöltése</h4>
                          <input placeholder="Kép címe" value={props.uploadTitle} onChange={e => props.setUploadTitle(e.target.value)} style={inputStyle} disabled={props.isUploading} />
                          <select value={props.uploadCategory} onChange={e => props.setUploadCategory(e.target.value)} style={inputStyle} disabled={props.isUploading}>
                            <option value="">-- Válassz kategóriát --</option>
                            {categories.map((cat: string) => { 
                              const count = categoryCounts[cat] || 0; 
                              return <option key={cat} value={cat} disabled={count >= 4}>{cat} ({count}/4 feltöltve)</option>; 
                            })}
                          </select>
                          <input type="file" accept="image/jpeg, image/png, image/webp" onChange={props.handleFileSelect} style={{ color: '#94a3b8', marginBottom: '15px', width: '100%' }} disabled={props.isUploading} />
                          {props.uploadPreview && <div style={{marginTop: '10px', marginBottom: '20px', textAlign: 'center'}}><img src={props.uploadPreview} alt="Előnézet" style={{maxHeight: '300px', borderRadius: '8px', border: '2px solid #334155'}} /></div>}
                          <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                            <button onClick={() => props.handleUpload(contest.id)} disabled={props.isUploading} style={{ flex: '1 1 150px', background: props.isUploading ? '#475569' : '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: props.isUploading ? 'not-allowed' : 'pointer', fontWeight: 'bold', transition: 'background 0.3s' }}>{props.isUploading ? 'Feltöltés ⏳...' : 'Beküldés 🚀'}</button>
                            <button onClick={() => { props.setActiveUploadContest(null); props.setUploadPreview(null); }} disabled={props.isUploading} style={{ flex: '1 1 100px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '12px', borderRadius: '8px', cursor: props.isUploading ? 'not-allowed' : 'pointer' }}>Mégse</button>
                          </div>
                        </div>
                      )}

                      {/* ÚJ: FIZETÉSI BLOKK FELHASZNÁLÓKNAK */}
                      {myContestEntries.length > 0 && isFeeRequired && !hasPaid && (
                        <div style={{ background: '#f59e0b20', border: '1px solid #f59e0b', padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                          <div>
                            <strong style={{ color: '#f59e0b', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>⚠️ Nevezési díj fizetése szükséges</strong>
                            <div style={{ color: '#cbd5e1', fontSize: '0.95rem', marginTop: '8px', lineHeight: '1.5' }}>
                              Látjuk, hogy töltöttél fel képeket! A képeid azonban csak a nevezési díj beérkezése után kerülnek a zsűri elé.<br/>
                              Fizetendő összeg: <strong style={{color: '#f8fafc', fontSize: '1.1rem'}}>{entryFee} {contest.fee_currency}</strong>
                            </div>
                          </div>
                          <button onClick={() => props.handlePayContestFee(contest.id)} style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '12px 25px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            💳 Fizetés (Stripe)
                          </button>
                        </div>
                      )}

                      {/* ÚJ: SIKERES FIZETÉS JELZÉSE */}
                      {myContestEntries.length > 0 && isFeeRequired && hasPaid && (
                        <div style={{ background: '#10b98120', border: '1px solid #10b98150', padding: '12px 20px', borderRadius: '8px', marginBottom: '20px', color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{fontSize: '1.2rem'}}>✅</span> Nevezési díj sikeresen befizetve! A képeid érvényesek és a zsűri elé kerülnek.
                        </div>
                      )}

                      {myContestEntries.length > 0 && (
                        <div style={{ marginTop: '30px', borderTop: '1px solid #334155', paddingTop: '20px' }}>
                          <h4 style={{margin: '0 0 20px 0', fontSize: '1.2rem'}}>Saját Nevezéseid</h4>
                          {categories.map((cat: string) => {
                            const catEntries = myContestEntries.filter(e => e.category === cat);
                            if (catEntries.length === 0) return null;
                            return (
                              <div key={cat} style={{ marginBottom: '25px' }}>
                                <h5 style={{ color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: '8px', marginTop: 0, fontSize: '1.1rem' }}>{cat} <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>({catEntries.length}/4)</span></h5>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
                                  {catEntries.map(entry => {
                                    const imageUrl = getImageUrl(entry.drive_file_id, entry.file_url);
                                    return (
                                      <div key={entry.id} style={{ background: '#0f172a', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                                        <img src={imageUrl} alt={entry.title} onClick={() => props.setFullscreenData({url: imageUrl, title: entry.title})} style={{ width: '100%', height: '140px', objectFit: 'cover', backgroundColor: '#1e293b', cursor: 'zoom-in' }} />
                                        
                                        {props.editingEntryId === entry.id ? (
                                          <div style={{ padding: '12px' }}>
                                            <input 
                                              value={props.editEntryTitle} 
                                              onChange={e => props.setEditEntryTitle(e.target.value)} 
                                              style={{ width: '100%', padding: '6px', marginBottom: '10px', backgroundColor: '#1e293b', border: '1px solid #38bdf8', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} 
                                            />
                                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                              <button onClick={() => props.handleUpdateEntryTitle(entry.id)} style={{ flex: '1 1 100%', background: '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Mentés</button>
                                              <button onClick={() => props.setEditingEntryId(null)} style={{ flex: '1 1 100%', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Mégse</button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div style={{ padding: '12px' }}>
                                            <div style={{ fontSize: '1rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#f8fafc' }}>{entry.title}</div>
                                            {!isEnded && (
                                              <div style={{ display: 'flex', gap: '5px', marginTop: '12px', flexWrap: 'wrap' }}>
                                                <button onClick={() => { props.setEditingEntryId(entry.id); props.setEditEntryTitle(entry.title); }} style={{ flex: '1 1 45%', background: '#38bdf820', color: '#38bdf8', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Szerkeszt</button>
                                                <button onClick={() => props.handleDeleteEntry(entry.id)} style={{ flex: '1 1 45%', background: '#ef444420', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Törlés</button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </>
      )}
    </>
  );
}
