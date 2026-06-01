import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';

interface WeeklyChallengeViewProps {
  user: any;
  setFullscreenData: (data: any) => void;
}

export default function WeeklyChallengeView({ user, setFullscreenData }: WeeklyChallengeViewProps) {
  const [subTab, setSubTab] = useState<'current' | 'upcoming' | 'past' | 'my_stats'>('current');
  const [loading, setLoading] = useState(true);
  
  const [topic, setTopic] = useState<any>(null);
  const [myEntry, setMyEntry] = useState<any>(null);
  const [myVoteCount, setMyVoteCount] = useState(0);
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

  const [myStats, setMyStats] = useState<{podiums: any, history: any[]} | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const fetchCurrentTopic = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/current?userEmail=${user.email}`);
      if (res.ok) {
        const data = await res.json();
        setTopic(data.topic);
        setMyEntry(data.myEntry);
        setMyVoteCount(data.myVoteCount);
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
        if (data.entry) { setVoteEntry(data.entry); setNoMoreEntries(false); } 
        else { setVoteEntry(null); setNoMoreEntries(true); }
      }
    } catch (e) { console.error(e); }
  };

  const fetchMyStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/my-stats?userEmail=${user.email}`);
      if (res.ok) setMyStats(await res.json());
    } catch (error) { console.error(error); } 
    finally { setIsLoadingStats(false); }
  };

  useEffect(() => {
    if (subTab === 'current') fetchCurrentTopic();
    else if (subTab === 'upcoming') fetch(`${BACKEND_URL}/api/weekly/upcoming`).then(res => res.json()).then(data => setUpcomingTopics(data)).catch(console.error);
    else if (subTab === 'past') fetch(`${BACKEND_URL}/api/weekly/past`).then(res => res.json()).then(data => setPastTopics(data)).catch(console.error);
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: oldEntryId, userEmail: user.email, voteType: type })
      });
      if (res.ok) {
        setMyVoteCount(prev => prev + 1);
        fetchNextVote(topic.id);
        fetchCurrentTopic(); 
      }
    } catch (e) { fetchNextVote(topic.id); }
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
      formData.append('photo', uploadFile); formData.append('topicId', topic.id.toString()); formData.append('userEmail', user.email); formData.append('userName', user.name);
      const res = await fetch(`${BACKEND_URL}/api/weekly/upload`, { method: 'POST', body: formData });
      if (res.ok) { alert('Sikeres nevezés!'); setUploadFile(null); setUploadPreview(null); fetchCurrentTopic(); } 
      else { const err = await res.json(); alert(err.error); }
    } catch (e) { alert("Feltöltési hiba!"); }
    finally { setIsUploading(false); }
  };

  // --- JAVÍTOTT ENERGIA RENDSZER ---
  const BASE_EXPOSURE = 10; // Mindenki kap 10 ingyen megjelenést az indulásnál!
  const exposureEarned = BASE_EXPOSURE + (myVoteCount * 2);
  const viewsRemaining = myEntry ? (exposureEarned - myEntry.views_count) : 0;

  let totalLikes = 0;
  let totalViews = 0;
  let top10Count = 0;
  let top20Count = 0;
  let podiumCount = 0;

  if (myStats) {
    totalLikes = myStats.history.reduce((sum, e) => sum + e.likes, 0);
    totalViews = myStats.history.reduce((sum, e) => sum + e.views, 0);
    podiumCount = myStats.podiums.first + myStats.podiums.second + myStats.podiums.third;

    myStats.history.forEach(e => {
      const percentile = e.rank / e.total_entries;
      if (percentile <= 0.1 && e.rank > 3) top10Count++; 
      if (percentile > 0.1 && percentile <= 0.2) top20Count++;
    });
  }

  const getLevel = (likes: number) => {
    if (likes < 20) return { name: 'Újonc 🌱', nextAt: 20, color: '#94a3b8' };
    if (likes < 100) return { name: 'Felfedezett 📸', nextAt: 100, color: '#38bdf8' };
    if (likes < 300) return { name: 'Haladó ⭐', nextAt: 300, color: '#10b981' };
    if (likes < 800) return { name: 'Profi 🏅', nextAt: 800, color: '#f59e0b' };
    return { name: 'Guru 👑', nextAt: null, color: '#fbbf24' };
  };

  const currentLevel = getLevel(totalLikes);
  const progressPercent = currentLevel.nextAt ? (totalLikes / currentLevel.nextAt) * 100 : 100;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', background: '#1e293b', padding: '8px', borderRadius: '12px', border: '1px solid #334155', width: 'fit-content', flexWrap: 'wrap' }}>
        <button onClick={() => setSubTab('current')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'current' ? '#f97316' : 'transparent', color: 'white', transition: 'all 0.2s' }}>⚔️ Aktuális Párbaj</button>
        <button onClick={() => setSubTab('upcoming')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'upcoming' ? '#f59e0b' : 'transparent', color: 'white', transition: 'all 0.2s' }}>⏳ Hamarosan</button>
        <button onClick={() => setSubTab('past')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'past' ? '#3b82f6' : 'transparent', color: 'white', transition: 'all 0.2s' }}>📜 Archívum</button>
        <button onClick={() => { setSubTab('my_stats'); fetchMyStats(); }} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'my_stats' ? '#8b5cf6' : 'transparent', color: 'white', transition: 'all 0.2s' }}>🏆 Eredményeim</button>
      </div>

      {/* 1. FÜL: AKTUÁLIS */}
      {subTab === 'current' && (
        <>
          {loading ? (
            <div style={{ color: '#94a3b8', textAlign: 'center', padding: '50px' }}>⏳ Betöltés...</div>
          ) : !topic ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😴</div>
              <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>Jelenleg nincs aktív heti kihívás!</h2>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '1.4rem' }}>🔥 Téma: {topic.title}</h3>
                  <p style={{ margin: '0 0 20px 0', color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>{topic.description}</p>
                  
                  {/* JAVÍTOTT ÉS FINOMÍTOTT ÜZENETEK */}
                  {!myEntry ? (
                    <div style={{ width: '100%', background: '#3b82f620', color: '#3b82f6', padding: '12px', borderRadius: '8px', border: '1px solid #3b82f650', marginBottom: '15px', fontSize: '0.9rem', textAlign: 'center' }}>Még nem neveztél fotót. Töltsd fel a képedet, és azonnal kapsz {BASE_EXPOSURE} ingyenes megjelenést!</div>
                  ) : viewsRemaining <= 0 ? (
                    <div style={{ width: '100%', background: '#ef444420', color: '#ef4444', padding: '12px', borderRadius: '8px', border: '1px solid #ef444450', marginBottom: '15px', fontSize: '0.9rem', textAlign: 'center' }}>⚠️ <b>Kifogytál az energiából!</b> A képed hátrasorolódott. Értékelj másokat, hogy újra a lista elejére kerülj!</div>
                  ) : (
                    <div style={{ width: '100%', background: '#10b98120', color: '#10b981', padding: '12px', borderRadius: '8px', border: '1px solid #10b98150', marginBottom: '15px', fontSize: '0.9rem', textAlign: 'center' }}>🚀 A képed pörög a rendszerben! <b>Még {viewsRemaining} kiemelt megjelenésed</b> van.</div>
                  )}

                  {!myEntry ? (
                  <div style={{ padding: '30px 20px', textAlign: 'center', background: '#0f172a', borderRadius: '12px', width: '100%', border: '1px dashed #f59e0b' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🛑</div>
                    <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>Nincs szavazati jogod!</h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>A szavazáshoz és mások képeinek értékeléséhez előbb nevezned kell egy saját fotóval!</p>
                  </div>
                ) : noMoreEntries ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', background: '#0f172a', borderRadius: '12px', width: '100%' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎉</div>
                    <h4 style={{ color: '#10b981', margin: '0 0 10px 0' }}>Mindent értékeltél!</h4>
                  </div>
                ) : voteEntry ? (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div onClick={() => setFullscreenData({url: getImageUrl(voteEntry.drive_file_id, voteEntry.file_url), title: 'Heti Kihívás'})} style={{ width: '100%', height: '350px', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-in' }}>
                        <img src={getImageUrl(voteEntry.drive_file_id, voteEntry.file_url)} alt="Szavazás" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
                        <button onClick={() => handleVote('pass')} style={{ flex: 1, padding: '15px', background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '100px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}>⏭️ Nem tetszik</button>
                        <button onClick={() => handleVote('like')} style={{ flex: 1, padding: '15px', background: 'linear-gradient(to right, #f97316, #ef4444)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)' }}>🔥 Tetszik!</button>
                      </div>
                    </div>
                  ) : <div style={{ color: '#94a3b8' }}>Kép betöltése...</div>}
                </div>

                <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#f8fafc', fontSize: '1.4rem' }}>📸 Saját Nevezésem</h3>
                  {myEntry ? (
                    <div>
                      <div style={{ width: '100%', height: '200px', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={getImageUrl(myEntry.drive_file_id, myEntry.file_url)} alt="Saját" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                      <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '15px', borderRadius: '8px', borderLeft: viewsRemaining <= 0 ? '4px solid #ef4444' : '4px solid #10b981' }}>
                        <div style={{ textAlign: 'center' }}><div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Nézettség</div><div style={{ color: '#f8fafc', fontSize: '1.2rem', fontWeight: 'bold' }}>{myEntry.views_count}</div></div>
                        <div style={{ textAlign: 'center' }}><div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Kapott Lájk</div><div style={{ color: '#f97316', fontSize: '1.2rem', fontWeight: 'bold' }}>{myEntry.likes_count} 🔥</div></div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileSelect} style={{ color: '#94a3b8', marginBottom: '15px', width: '100%' }} disabled={isUploading} />
                      {uploadPreview && <div style={{marginBottom: '20px', textAlign: 'center'}}><img src={uploadPreview} alt="Preview" style={{maxHeight: '200px', borderRadius: '8px'}} /></div>}
                      <button onClick={handleUpload} disabled={!uploadFile || isUploading} style={{ width: '100%', background: (!uploadFile || isUploading) ? '#475569' : '#38bdf8', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>{isUploading ? 'Feltöltés...' : 'Nevezés elküldése 🚀'}</button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #f59e0b' }}>
                <h3 style={{ margin: '0 0 5px 0', color: '#f59e0b', fontSize: '1.4rem' }}>🏆 Jelenlegi Állás (Vak Lista)</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0' }}>A taktikázás elkerülése végett a többi versenyző fotója és neve a párbaj lezárásáig <b>titkosítva</b> van! Így látod a mezőnyt, de senki sem tud célzottan leszavazni másokat.</p>
                
                {leaderboard.length === 0 ? <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Még senki sem töltött fel képet.</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {
                    [...leaderboard].sort((a, b) => {
                      if (b.likes_count !== a.likes_count) return b.likes_count - a.likes_count;
                      return a.views_count - b.views_count;
                    }).map((entry, index) => {
                      const isMe = entry.user_email === user.email;
                      const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#e2e8f0' : index === 2 ? '#cd7f32' : '#64748b';
                      
                      return (
                        <div key={entry.id} style={{ display: 'flex', alignItems: 'center', background: isMe ? '#f59e0b20' : '#0f172a', border: isMe ? '1px solid #f59e0b50' : '1px solid #334155', padding: '10px', borderRadius: '8px', opacity: isMe ? 1 : 0.8 }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', width: '35px', color: rankColor, textAlign: 'center' }}>{index + 1}.</div>
                          
                          {/* Mások képe homályosítva, saját kép éles. Máséra nem lehet rákattintani! */}
                          <div 
                            onClick={() => isMe ? setFullscreenData({url: getImageUrl(entry.drive_file_id, entry.file_url), title: entry.user_name}) : null} 
                            style={{ width: '50px', height: '50px', backgroundColor: '#000', borderRadius: '6px', overflow: 'hidden', margin: '0 15px', cursor: isMe ? 'zoom-in' : 'default', flexShrink: 0 }}
                          >
                            <img 
                              src={getImageUrl(entry.drive_file_id, entry.file_url)} 
                              alt="Top" 
                              style={{ 
                                width: '100%', height: '100%', objectFit: 'cover', 
                                filter: isMe ? 'none' : 'blur(8px) grayscale(70%)', 
                                transform: isMe ? 'none' : 'scale(1.2)' // A scale eltünteti a blur fehér széleit
                              }} 
                            />
                          </div>
                          
                          <div style={{ flex: 1 }}>
                            {/* Név elrejtése */}
                            <div style={{ color: isMe ? '#f8fafc' : '#94a3b8', fontWeight: 'bold', fontStyle: isMe ? 'normal' : 'italic' }}>
                              {isMe ? entry.user_name : 'Titkosított ellenfél'}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Nézettség: {entry.views_count}</div>
                          </div>
                          
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: isMe ? '#f97316' : '#94a3b8', fontWeight: 'bold', fontSize: '1.4rem' }}>{entry.likes_count} 🔥</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
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
              <div key={t.id} style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid #475569', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🗓️</div>
                <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '1.2rem' }}>{t.title}</h4>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: '0 0 15px 0', flex: 1 }}>{t.description}</p>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', background: '#0f172a', padding: '10px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                  ⏳ Kezdés: {new Date(t.start_date).toLocaleDateString('hu-HU')}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. FÜL: ARCHÍVUM */}
      {subTab === 'past' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr md:350px', gap: '30px' }}>
          <div style={{ background: '#1e293b', borderRadius: '16px', padding: '20px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#60a5fa' }}>Lezárult hetek</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pastTopics.map(t => (
                <div key={t.id} onClick={() => loadPastHistoryList(t.id)} style={{ padding: '12px', background: selectedPastTopicId === t.id ? '#3b82f620' : '#0f172a', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', color: 'white' }}>{t.title}</div>
              ))}
            </div>
          </div>
          <div style={{ background: '#1e293b', borderRadius: '16px', padding: '20px', border: '1px solid #3b82f6' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#3b82f6' }}>🏅 Végeleges Dobogó</h3>
            {[...pastLeaderboard].sort((a, b) => {
              if (b.likes_count !== a.likes_count) return b.likes_count - a.likes_count;
              return a.views_count - b.views_count;
            }).map((entry, index) => (
              <div key={entry.id} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', width: '30px', color: index === 0 ? '#fbbf24' : '#94a3b8' }}>{index + 1}.</div>
                <img src={getImageUrl(entry.drive_file_id, entry.file_url)} alt="Top" style={{ width: '45px', height: '45px', borderRadius: '4px', margin: '0 10px', objectFit: 'cover' }} />
                <div style={{ flex: 1, color: 'white' }}>{entry.user_name}</div><div style={{ color: '#f97316', fontWeight: 'bold' }}>{entry.likes_count} 🔥</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- 4. FÜL: GURUSHOTS STÍLUSÚ TRÓFEATEREM --- */}
      {subTab === 'my_stats' && myStats && (
        <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
          
          {isLoadingStats ? (
            <div style={{ color: '#94a3b8', textAlign: 'center', padding: '50px' }}>⏳ Statisztikák betöltése...</div>
          ) : !myStats ? (
            <div style={{ color: '#ef4444', textAlign: 'center', padding: '20px' }}>Nem sikerült betölteni az adatokat.</div>
          ) : (
            <>
              {/* FELHASZNÁLÓ SZINTJE ÉS PROGRESS BAR */}
              <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: `1px solid ${currentLevel.color}`, marginBottom: '30px', textAlign: 'center' }}>
                <h3 style={{ color: '#94a3b8', margin: '0 0 5px 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px' }}>Jelenlegi Státuszod a lezárt párbajok alapján</h3>
                <h1 style={{ color: currentLevel.color, margin: '0 0 15px 0', fontSize: '2.5rem' }}>{currentLevel.name}</h1>
                
                <div style={{ width: '100%', maxWidth: '500px', background: '#0f172a', height: '12px', borderRadius: '10px', margin: '0 auto', overflow: 'hidden' }}>
                  <div style={{ width: `${progressPercent}%`, background: currentLevel.color, height: '100%', transition: 'width 1s ease-in-out' }}></div>
                </div>
                {currentLevel.nextAt ? (
                  <div style={{ color: '#cbd5e1', fontSize: '0.85rem', marginTop: '10px' }}>
                    Még <b>{currentLevel.nextAt - totalLikes} Lájk</b> kell a következő szinthez!
                  </div>
                ) : (
                  <div style={{ color: '#fbbf24', fontSize: '0.85rem', marginTop: '10px' }}>Elérted a maximális szintet! Te vagy a Fotós Guru!</div>
                )}
              </div>

              {/* ÖSSZESÍTETT STATISZTIKÁK ÉS PLECSNIK */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#f97316' }}>{totalLikes}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Összes Kapott Lájk</div>
                </div>
                <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#38bdf8' }}>{totalViews}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Összes Megtekintés</div>
                </div>
                <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #fbbf24' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#fbbf24' }}>{podiumCount}</div>
                  <div style={{ color: '#fbbf24', fontSize: '0.8rem', textTransform: 'uppercase' }}>Dobogós Helyezés</div>
                </div>
                <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #a855f7' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#a855f7' }}>{top10Count}</div>
                  <div style={{ color: '#a855f7', fontSize: '0.8rem', textTransform: 'uppercase' }}>Top 10% Plecsni</div>
                </div>
                <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #10b981' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#10b981' }}>{top20Count}</div>
                  <div style={{ color: '#10b981', fontSize: '0.8rem', textTransform: 'uppercase' }}>Top 20% Plecsni</div>
                </div>
              </div>

              {/* RÉSZLETES ELŐZMÉNYEK KÉPEKKEL (JAVÍTVA: EREDETI KÉP BETÖLTÉSE) */}
              <h3 style={{ color: '#f8fafc', marginBottom: '15px' }}>📸 Korábbi Pályaművek ({myStats.history.length})</h3>
              
              {myStats.history.length === 0 ? (
                <div style={{ color: '#94a3b8', background: '#1e293b', padding: '30px', borderRadius: '12px', textAlign: 'center' }}>Még nem vettél részt egyetlen lezárult kihívásban sem.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {myStats.history.map((entry, idx) => {
                    const percentile = entry.rank / entry.total_entries;
                    let badge = '';
                    let badgeColor = '#334155';
                    if (entry.rank <= 3) { badge = '🏆 Dobogós'; badgeColor = '#fbbf24'; }
                    else if (percentile <= 0.1) { badge = '⭐ Top 10%'; badgeColor = '#a855f7'; }
                    else if (percentile <= 0.2) { badge = '✨ Top 20%'; badgeColor = '#10b981'; }

                    return (
                      <div key={idx} style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${badgeColor}`, transition: 'transform 0.2s', cursor: 'pointer' }}
                           onClick={() => setFullscreenData({url: getImageUrl(entry.drive_file_id, entry.file_url), title: entry.topic_title})}>
                        
                        <div style={{ position: 'relative', height: '200px' }}>
                          {/* JAVÍTVA: A drive_file_id most már átadódik az img-nek! */}
                          <img src={getImageUrl(entry.drive_file_id, entry.file_url)} alt="Pályamű" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          
                          <div style={{ position: 'absolute', top: '10px', left: '10px', background: badgeColor, color: badgeColor === '#fbbf24' ? 'black' : 'white', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem', boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>
                            {badge || `${entry.rank}. Hely`}
                          </div>
                        </div>

                        <div style={{ padding: '15px' }}>
                          <h4 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '1.1rem' }}>{entry.topic_title}</h4>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px' }}>
                            <span>Mezőny: {entry.total_entries} kép</span>
                            <span style={{color: '#f8fafc'}}>Helyezés: <b>{entry.rank}.</b></span>
                          </div>
                          <div style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{color: '#f97316', fontWeight: 'bold'}}>🔥 {entry.likes}</span>
                            <span style={{color: '#38bdf8'}}>👁️ {entry.views}</span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}
