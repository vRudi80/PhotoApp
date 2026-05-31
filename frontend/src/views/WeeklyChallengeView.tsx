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

  // --- GURUSHOTS LÁTHATÓSÁG MATEK ---
  const exposureEarned = myVoteCount * 2; // Minden szavazatért 2 megjelenést kap
  const viewsRemaining = myEntry ? (exposureEarned - myEntry.views_count) : 0;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', background: '#1e293b', padding: '8px', borderRadius: '12px', border: '1px solid #334155', width: 'fit-content', flexWrap: 'wrap' }}>
        <button onClick={() => setSubTab('current')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'current' ? '#f97316' : 'transparent', color: 'white', transition: 'all 0.2s' }}>⚔️ Aktuális Párbaj</button>
        <button onClick={() => setSubTab('upcoming')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'upcoming' ? '#f59e0b' : 'transparent', color: 'white', transition: 'all 0.2s' }}>⏳ Hamarosan indul</button>
        <button onClick={() => setSubTab('past')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'past' ? '#3b82f6' : 'transparent', color: 'white', transition: 'all 0.2s' }}>📜 Archívum</button>
        <button onClick={() => { setSubTab('my_stats'); fetchMyStats(); }} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'my_stats' ? '#10b981' : 'transparent', color: 'white', transition: 'all 0.2s' }}>🏆 Trófeaterem</button>
      </div>

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
                
                {/* PÁRBAJ ÉS MOTIVÁCIÓ */}
                <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '1.4rem' }}>🔥 Téma: {topic.title}</h3>
                  <p style={{ margin: '0 0 20px 0', color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>{topic.description}</p>
                  
                  {/* LÁTHATÓSÁGI MÉRŐ ÜZENETEK */}
                  {!myEntry ? (
                    <div style={{ width: '100%', background: '#3b82f620', color: '#3b82f6', padding: '12px', borderRadius: '8px', border: '1px solid #3b82f650', marginBottom: '15px', fontSize: '0.9rem', textAlign: 'center' }}>
                      Még nem neveztél fotót. Töltsd fel a képedet, hogy elkezdhess láthatóságot gyűjteni!
                    </div>
                  ) : viewsRemaining <= 0 ? (
                    <div style={{ width: '100%', background: '#ef444420', color: '#ef4444', padding: '12px', borderRadius: '8px', border: '1px solid #ef444450', marginBottom: '15px', fontSize: '0.9rem', textAlign: 'center' }}>
                      ⚠️ <b>Láthatatlanná váltál!</b> A gépezet megállt, jelenleg senki sem látja a képed. Szavazz másokra, hogy újra visszakerülj a körforgásba!
                    </div>
                  ) : (
                    <div style={{ width: '100%', background: '#10b98120', color: '#10b981', padding: '12px', borderRadius: '8px', border: '1px solid #10b98150', marginBottom: '15px', fontSize: '0.9rem', textAlign: 'center' }}>
                      🚀 A képed pörög a rendszerben! Jelenleg <b>még {viewsRemaining} garantált megjelenésed</b> van a korábbi szavazataid miatt.
                    </div>
                  )}

                  {noMoreEntries ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', background: '#0f172a', borderRadius: '12px', width: '100%' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎉</div>
                      <h4 style={{ color: '#10b981', margin: '0 0 10px 0' }}>Mindent értékeltél!</h4>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>Látogass vissza később, ha feltöltenek új fotókat!</p>
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
                        <button onClick={() => handleVote('pass')} style={{ flex: 1, padding: '15px', background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '100px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}>⏭️ Tovább</button>
                        <button onClick={() => handleVote('like')} style={{ flex: 1, padding: '15px', background: 'linear-gradient(to right, #f97316, #ef4444)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)' }}>🔥 Tetszik!</button>
                      </div>
                    </div>
                  ) : <div style={{ color: '#94a3b8' }}>Kép betöltése...</div>}
                </div>

                {/* SAJÁT NEVEZÉS */}
                <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#f8fafc', fontSize: '1.4rem' }}>📸 Saját Nevezésem</h3>
                  {myEntry ? (
                    <div>
                      <div style={{ width: '100%', height: '200px', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={getImageUrl(myEntry.drive_file_id, myEntry.file_url)} alt="Saját" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                      <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '15px', borderRadius: '8px', borderLeft: viewsRemaining <= 0 ? '4px solid #ef4444' : '4px solid #10b981' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Nézettség</div>
                          <div style={{ color: '#f8fafc', fontSize: '1.2rem', fontWeight: 'bold' }}>{myEntry.views_count}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Kapott Lájk</div>
                          <div style={{ color: '#f97316', fontSize: '1.2rem', fontWeight: 'bold' }}>{myEntry.likes_count} 🔥</div>
                        </div>
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

              {/* ÚJ TOPLISTA MODUL */}
              <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #f59e0b' }}>
                <h3 style={{ margin: '0 0 5px 0', color: '#f59e0b', fontSize: '1.4rem' }}>🏆 Jelenlegi Rangsor</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0' }}>
                  Az nyer, aki a legtöbb lájkot kapja! A trükk? A képedet pontosan annyiszor mutatja meg a gép másoknak, ahány képet TE értékeltél! Ha nem szavazol, a képed láthatatlan marad.
                </p>
                
                {leaderboard.length === 0 ? (
                  <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Még senki sem töltött fel képet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {leaderboard.map((entry, index) => {
                      const isMe = entry.user_email === user.email;
                      const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#e2e8f0' : index === 2 ? '#cd7f32' : '#64748b';

                      return (
                        <div key={entry.id} style={{ display: 'flex', alignItems: 'center', background: isMe ? '#f59e0b20' : '#0f172a', border: isMe ? '1px solid #f59e0b50' : '1px solid #334155', padding: '10px', borderRadius: '8px' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', width: '35px', color: rankColor, textAlign: 'center' }}>{index + 1}.</div>
                          <div onClick={() => setFullscreenData({url: getImageUrl(entry.drive_file_id, entry.file_url), title: entry.user_name})} style={{ width: '50px', height: '50px', backgroundColor: '#000', borderRadius: '6px', overflow: 'hidden', margin: '0 15px', cursor: 'zoom-in', flexShrink: 0 }}><img src={getImageUrl(entry.drive_file_id, entry.file_url)} alt="Top" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
                          
                          <div style={{ flex: 1 }}>
                            <div style={{ color: '#f8fafc', fontWeight: 'bold' }}>{entry.user_name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Nézettség: {entry.views_count}</div>
                          </div>
                          
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '1.4rem' }}>{entry.likes_count} 🔥</div>
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
          {upcomingTopics.map(t => (
            <div key={t.id} style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid #475569' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🗓️</div>
              <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>{t.title}</h4>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>{t.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* 3. FÜL: ARCHÍVUM */}
      {subTab === 'past' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr md:350px', gap: '30px' }}>
          <div style={{ background: '#1e293b', borderRadius: '16px', padding: '20px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#60a5fa' }}>Lezárult hetek</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pastTopics.map(t => (
                <div key={t.id} onClick={() => loadPastHistoryList(t.id)} style={{ padding: '12px', background: selectedPastTopicId === t.id ? '#3b82f620' : '#0f172a', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', color: 'white' }}>
                  {t.title}
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#1e293b', borderRadius: '16px', padding: '20px', border: '1px solid #3b82f6' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#3b82f6' }}>🏅 Végeleges Dobogó</h3>
            {pastLeaderboard.map((entry, index) => (
              <div key={entry.id} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', width: '30px', color: index === 0 ? '#fbbf24' : '#94a3b8' }}>{index + 1}.</div>
                <img src={getImageUrl(entry.drive_file_id, entry.file_url)} alt="Top" style={{ width: '45px', height: '45px', borderRadius: '4px', margin: '0 10px', objectFit: 'cover' }} />
                <div style={{ flex: 1, color: 'white' }}>{entry.user_name}</div>
                <div style={{ color: '#f97316', fontWeight: 'bold' }}>{entry.likes_count} 🔥</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. FÜL: TRÓFEATEREM */}
      {subTab === 'my_stats' && myStats && (
        <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '30px' }}>
            <div style={{ flex: '1 1 120px', background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white' }}>{myStats.podiums.first}</div>
              <div style={{ color: '#fffbeb', fontWeight: 'bold' }}>1. Hely</div>
            </div>
            <div style={{ flex: '1 1 120px', background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white' }}>{myStats.podiums.second}</div>
              <div style={{ color: '#f8fafc', fontWeight: 'bold' }}>2. Hely</div>
            </div>
            <div style={{ flex: '1 1 120px', background: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white' }}>{myStats.podiums.third}</div>
              <div style={{ color: '#fffbeb', fontWeight: 'bold' }}>3. Hely</div>
            </div>
          </div>

          <h3 style={{ color: '#38bdf8', marginBottom: '15px' }}>📸 Korábbi Pályaműveid ({myStats.history.length} db)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {myStats.history.map((entry, idx) => (
              <div key={idx} style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
                <div style={{ position: 'relative', height: '200px' }}>
                  <img src={getImageUrl(undefined, entry.file_url)} alt="Pályamű" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#0f172a90', color: 'white', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold' }}>
                    {entry.rank}. Hely
                  </div>
                </div>
                <div style={{ padding: '15px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#f8fafc' }}>{entry.topic_title}</h4>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>👍 {entry.likes} Lájk / 👁️ {entry.views} Megtekintés</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
