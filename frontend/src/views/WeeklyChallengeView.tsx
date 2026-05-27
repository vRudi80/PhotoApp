import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';

interface WeeklyChallengeViewProps {
  user: any;
  setFullscreenData: (data: any) => void;
}

export default function WeeklyChallengeView({ user, setFullscreenData }: WeeklyChallengeViewProps) {
  const [subTab, setSubTab] = useState<'current' | 'upcoming' | 'past'>('current');
  const [loading, setLoading] = useState(true);
  
  const [topic, setTopic] = useState<any>(null);
  const [myEntry, setMyEntry] = useState<any>(null);
  
  // Szavazási adatok
  const [myVoteCount, setMyVoteCount] = useState(0);
  const [requiredVotes, setRequiredVotes] = useState(3); 
  const [votableEntries, setVotableEntries] = useState(1); // Összes szavazható kép

  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const [upcomingTopics, setUpcomingTopics] = useState<any[]>([]);
  const [pastTopics, setPastTopics] = useState<any[]>([]);
  const [selectedPastTopicId, setSelectedPastTopicId] = useState<number | null>(null);
  const [pastLeaderboard, setPastLeaderboard] = useState<any[]>([]);
  const [loadingPastHistory, setLoadingPastHistory] = useState(false);

  const [voteEntry, setVoteEntry] = useState<any>(null);
  const [noMoreEntries, setNoMoreEntries] = useState(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchCurrentTopic = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/current?userEmail=${user.email}`);
      if (res.ok) {
        const data = await res.json();
        setTopic(data.topic);
        setMyEntry(data.myEntry);
        setMyVoteCount(data.myVoteCount);
        setRequiredVotes(data.requiredVotes || 0); 
        setVotableEntries(data.votableEntries || 1);
        setLeaderboard(data.leaderboard);
        if (data.topic) fetchNextVote(data.topic.id);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchNextVote = async (topicId: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/next-vote?topicId=${topicId}&userEmail=${user.email}`);
      if (res.ok) {
        const data = await res.json();
        if (data.entry) {
          setVoteEntry(data.entry);
          setNoMoreEntries(false);
        } else {
          setVoteEntry(null);
          setNoMoreEntries(true);
        }
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (subTab === 'current') {
      fetchCurrentTopic();
    } else if (subTab === 'upcoming') {
      fetch(`${BACKEND_URL}/api/weekly/upcoming`).then(res => res.json()).then(data => setUpcomingTopics(data)).catch(console.error);
    } else if (subTab === 'past') {
      fetch(`${BACKEND_URL}/api/weekly/past`).then(res => res.json()).then(data => setPastTopics(data)).catch(console.error);
    }
  }, [subTab]);

  const loadPastHistoryList = async (topicId: number) => {
    setSelectedPastTopicId(topicId);
    setLoadingPastHistory(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/history/${topicId}`);
      if (res.ok) setPastLeaderboard(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingPastHistory(false); }
  };

  const handleVote = async (type: 'like' | 'pass') => {
    if (!voteEntry || !topic) return;
    const oldEntryId = voteEntry.id;
    setVoteEntry(null); 
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: oldEntryId, userEmail: user.email, voteType: type })
      });
      if (res.ok) {
        setMyVoteCount(prev => prev + 1);
        fetchNextVote(topic.id);
        fetchCurrentTopic(); // Frissítjük, hogy élben lássuk a pontjaink emelkedését
      }
    } catch (e) {
      fetchNextVote(topic.id);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadFile(file);
      uploadPreview && URL.revokeObjectURL(uploadPreview);
      setUploadPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !topic) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', uploadFile);
      formData.append('topicId', topic.id.toString());
      formData.append('userEmail', user.email);
      formData.append('userName', user.name);

      const res = await fetch(`${BACKEND_URL}/api/weekly/upload`, { method: 'POST', body: formData });
      if (res.ok) {
        alert('Kép sikeresen benevezve a párbajra!');
        setUploadFile(null);
        setUploadPreview(null);
        fetchCurrentTopic(); 
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (e) { alert("Feltöltési hiba!"); }
    finally { setIsUploading(false); }
  };

  // Dinamikus változók a figyelmeztetésekhez
  const isLocked = myVoteCount < requiredVotes;
  const missingVotesForMaxBonus = votableEntries - myVoteCount;

  const validEntries = leaderboard.filter(e => e.user_vote_count >= requiredVotes);
  const invalidEntries = leaderboard.filter(e => e.user_vote_count < requiredVotes);
  const finalLeaderboard = [...validEntries, ...invalidEntries];

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', background: '#1e293b', padding: '8px', borderRadius: '12px', border: '1px solid #334155', width: 'fit-content' }}>
        <button onClick={() => setSubTab('current')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'current' ? '#f97316' : 'transparent', color: 'white', transition: 'all 0.2s' }}>⚔️ Aktuális Párbaj</button>
        <button onClick={() => setSubTab('upcoming')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'upcoming' ? '#f59e0b' : 'transparent', color: 'white', transition: 'all 0.2s' }}>⏳ Hamarosan indul</button>
        <button onClick={() => setSubTab('past')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'past' ? '#3b82f6' : 'transparent', color: 'white', transition: 'all 0.2s' }}>📜 Archívum</button>
      </div>

      {subTab === 'current' && (
        <>
          {loading ? (
            <div style={{ color: '#94a3b8', textAlign: 'center', padding: '50px' }}>⏳ Betöltés...</div>
          ) : !topic ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😴</div>
              <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>Jelenleg nincs aktív heti kihívás!</h2>
              <p style={{ color: '#94a3b8' }}>Válts át a "Hamarosan indul" fülre, hogy megnézd a következő feladatokat!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* PÁRBAJ MODUL */}
                <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '1.4rem' }}>🔥 Téma: {topic.title}</h3>
                  <p style={{ margin: '0 0 20px 0', color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>{topic.description}</p>
                  
                  {/* MOTIVÁCIÓS ÜZENETEK (3 fázisú) */}
                  {isLocked ? (
                    <div style={{ width: '100%', background: '#ef444420', color: '#ef4444', padding: '12px', borderRadius: '8px', border: '1px solid #ef444450', marginBottom: '15px', fontSize: '0.9rem', textAlign: 'center' }}>
                      Értékelj még <b>{requiredVotes - myVoteCount}</b> képet, hogy levettük a lakatot és felkerülj a Toplistára!
                    </div>
                  ) : missingVotesForMaxBonus > 0 ? (
                    <div style={{ width: '100%', background: '#10b98120', color: '#10b981', padding: '12px', borderRadius: '8px', border: '1px solid #10b98150', marginBottom: '15px', fontSize: '0.9rem', textAlign: 'center' }}>
                      Érvényes vagy, de pontokat vesztesz! Értékelj még <b>{missingVotesForMaxBonus} új képet</b>, hogy visszaszerezd a maximális (20/20) aktivitási pontodat!
                    </div>
                  ) : (
                    <div style={{ width: '100%', background: '#f59e0b20', color: '#f59e0b', padding: '12px', borderRadius: '8px', border: '1px solid #f59e0b50', marginBottom: '15px', fontSize: '0.9rem', textAlign: 'center' }}>
                      🏆 Elérted a maximális aktivitást (20/20 pont)!
                    </div>
                  )}

                  {noMoreEntries ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', background: '#0f172a', borderRadius: '12px', width: '100%' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎉</div>
                      <h4 style={{ color: '#10b981', margin: '0 0 10px 0' }}>Minden elérhető képet értékeltél!</h4>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>Látogass vissza később, ha töltenek fel új fotókat!</p>
                    </div>
                  ) : voteEntry ? (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div 
                        style={{ width: '100%', height: '350px', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-in' }}
                        onClick={() => setFullscreenData({url: getImageUrl(voteEntry.drive_file_id, voteEntry.file_url), title: 'Heti Kihívás'})}
                      >
                        <img src={getImageUrl(voteEntry.drive_file_id, voteEntry.file_url)} alt="Szavazás" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
                        <button onClick={() => handleVote('pass')} style={{ flex: 1, padding: '15px', background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '100px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', transition: 'transform 0.1s' }} onMouseOver={e=>e.currentTarget.style.transform='scale(0.95)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>⏭️ Tovább</button>
                        <button onClick={() => handleVote('like')} style={{ flex: 1, padding: '15px', background: 'linear-gradient(to right, #f97316, #ef4444)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)', transition: 'transform 0.1s' }} onMouseOver={e=>e.currentTarget.style.transform='scale(1.05)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>🔥 Tetszik!</button>
                      </div>
                    </div>
                  ) : <div style={{ color: '#94a3b8' }}>Kép betöltése...</div>}
                </div>

                <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#f8fafc', fontSize: '1.4rem' }}>📸 Saját Nevezésem</h3>
                  {myEntry ? (
                    <div>
                      <div style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '10px' }}>✅ Sikeresen benevezve!</div>
                      <div style={{ width: '100%', height: '200px', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={getImageUrl(myEntry.drive_file_id, myEntry.file_url)} alt="Saját" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                      <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '10px', borderRadius: '8px' }}>
                        <span style={{ color: '#94a3b8' }}>Nézettség: <b style={{color: '#f8fafc'}}>{myEntry.views_count}</b></span>
                        <span style={{ color: '#94a3b8' }}>Lájkok: <b style={{color: '#f97316'}}>{myEntry.likes_count} 🔥</b></span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileSelect} style={{ color: '#94a3b8', marginBottom: '15px', width: '100%' }} disabled={isUploading} />
                      {uploadPreview && (
                        <div style={{marginBottom: '20px', textAlign: 'center'}}><img src={uploadPreview} alt="Preview" style={{maxHeight: '200px', borderRadius: '8px'}} /></div>
                      )}
                      <button onClick={handleUpload} disabled={!uploadFile || isUploading} style={{ width: '100%', background: (!uploadFile || isUploading) ? '#475569' : '#38bdf8', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        {isUploading ? 'Feltöltés...' : 'Nevezés elküldése 🚀'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* TOPLISTA MODUL */}
              <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #f59e0b' }}>
                <h3 style={{ margin: '0 0 5px 0', color: '#f59e0b', fontSize: '1.4rem' }}>🏆 Heti Toplista (Max 100 pt)</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0' }}>
                  A végső pontszám összetétele: <b>Fotó minősége (Max 80 pt)</b> + <b>Aktivitás (Max 20 pt)</b>. Az aktivitási pontod csökken, ha új fotók érkeznek a rendszerbe és nem értékeled őket!
                </p>
                
                {finalLeaderboard.length === 0 ? (
                  <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Nincs még elég szavazat.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {finalLeaderboard.map((entry, index) => {
                      const isMe = entry.user_email === user.email;
                      const hasEnoughVotes = entry.user_vote_count >= requiredVotes;
                      const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#e2e8f0' : index === 2 ? '#cd7f32' : '#64748b';

                      return (
                        <div key={entry.id} style={{ display: 'flex', alignItems: 'center', background: hasEnoughVotes ? (isMe ? '#f59e0b20' : '#0f172a') : '#0f172a50', border: hasEnoughVotes ? (isMe ? '1px solid #f59e0b50' : '1px solid #334155') : '1px dashed #ef444450', padding: '10px', borderRadius: '8px', opacity: hasEnoughVotes ? 1 : 0.6 }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', width: '35px', color: hasEnoughVotes ? rankColor : '#94a3b8', textAlign: 'center' }}>{hasEnoughVotes ? `${index + 1}.` : '🔒'}</div>
                          <div onClick={() => setFullscreenData({url: getImageUrl(entry.drive_file_id, entry.file_url), title: entry.user_name})} style={{ width: '50px', height: '50px', backgroundColor: '#000', borderRadius: '6px', overflow: 'hidden', margin: '0 15px', cursor: 'zoom-in', flexShrink: 0 }}><img src={getImageUrl(entry.drive_file_id, entry.file_url)} alt="Top" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
                          
                          <div style={{ flex: 1 }}>
                            <div style={{ color: '#f8fafc', fontWeight: 'bold' }}>{entry.user_name}</div>
                            <div style={{ fontSize: '0.8rem', color: hasEnoughVotes ? '#94a3b8' : '#ef4444' }}>
                              {hasEnoughVotes ? `${entry.views_count} megtekintés` : 'Lusta szavazó (Kizárva)'}
                            </div>
                          </div>
                          
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '1.2rem' }}>{Number(entry.total_score).toFixed(1)} Pt 🔥</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              Minőség: {Number(entry.quality_score).toFixed(1)} | Aktivitás: {Number(entry.activity_score).toFixed(1)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* 2. FÜL: HAMAROSAN INDUL */}
      {subTab === 'upcoming' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {upcomingTopics.length === 0 ? (
            <div style={{ color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center', padding: '40px', background: '#1e293b', borderRadius: '12px' }}>Nincs betárazva elkövetkező téma.</div>
          ) : (
            upcomingTopics.map(t => (
              <div key={t.id} style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid #475569' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🗓️</div>
                <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '1.2rem' }}>{t.title}</h4>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: '0 0 15px 0', minHeight: '45px' }}>{t.description}</p>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', background: '#0f172a', padding: '8px', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                  ⏳ Kezdés: {new Date(t.start_date).toLocaleDateString('hu-HU')}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. FÜL: KORÁBBI EREDMÉNYEK (ARCHÍVUM) */}
      {subTab === 'past' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr md:350px', gap: '30px', alignItems: 'flex-start' }}>
          <div style={{ background: '#1e293b', borderRadius: '16px', padding: '20px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#60a5fa' }}>Lezárult hetek</h3>
            {pastTopics.length === 0 ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Még nincs korábbi lezárt verseny.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pastTopics.map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => loadPastHistoryList(t.id)}
                    style={{ padding: '12px 15px', background: selectedPastTopicId === t.id ? '#3b82f620' : '#0f172a', border: selectedPastTopicId === t.id ? '1px solid #3b82f6' : '1px solid #334155', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <b style={{ color: '#f8fafc' }}>{t.title}</b>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Vége: {new Date(t.end_date).toLocaleDateString('hu-HU')}</div>
                    </div>
                    <span style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '0.85rem' }}>Eredmények ➔</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: '#1e293b', borderRadius: '16px', padding: '20px', border: '1px solid #3b82f6' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#3b82f6' }}>🏅 Végeleges Dobogó</h3>
            {selectedPastTopicId === null ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 10px' }}>Válassz ki egy lezárult témát a bal oldali listából a végeredmény megtekintéséhez!</div>
            ) : loadingPastHistory ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>⏳ Toplista betöltése...</div>
            ) : pastLeaderboard.length === 0 ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Erre a hétre nem érkezett érvényes szavazat.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pastLeaderboard.map((entry, index) => {
                  const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#e2e8f0' : index === 2 ? '#cd7f32' : '#64748b';
                  return (
                    <div key={entry.id} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold', width: '30px', color: rankColor, textAlign: 'center' }}>{index + 1}.</div>
                      <div onClick={() => setFullscreenData({url: getImageUrl(entry.drive_file_id, entry.file_url), title: entry.user_name})} style={{ width: '45px', height: '45px', borderRadius: '4px', overflow: 'hidden', margin: '0 12px', cursor: 'zoom-in' }}><img src={getImageUrl(entry.drive_file_id, entry.file_url)} alt="Top" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '0.9rem' }}>{entry.user_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{entry.views_count} nézettség</div>
                      </div>
                      <div style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '1rem' }}>{Number((entry.likes_count / entry.views_count)*100).toFixed(0)}%</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
