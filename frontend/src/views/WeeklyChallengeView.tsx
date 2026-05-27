import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';

interface WeeklyChallengeViewProps {
  user: any;
  setFullscreenData: (data: any) => void;
}

export default function WeeklyChallengeView({ user, setFullscreenData }: WeeklyChallengeViewProps) {
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState<any>(null);
  const [myEntry, setMyEntry] = useState<any>(null);
  const [myVoteCount, setMyVoteCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Értékelő (Párbaj) állapotok
  const [voteEntry, setVoteEntry] = useState<any>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [noMoreEntries, setNoMoreEntries] = useState(false);

  // Feltöltés állapotok
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Alapadatok lekérése
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Következő szavazható kép lekérése
  const fetchNextVote = async (topicId: number) => {
    setIsVoting(true);
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
    } catch (e) {
      console.error(e);
    } finally {
      setIsVoting(false);
    }
  };

  useEffect(() => {
    fetchCurrentTopic();
  }, []);

  // Szavazat leadása
  const handleVote = async (type: 'like' | 'pass') => {
    if (!voteEntry || !topic) return;
    
    // Optikai visszajelzés (gyors eltűnés)
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
      }
    } catch (e) {
      alert('Hálózati hiba a szavazásnál!');
      fetchNextVote(topic.id); // Töltse be az újat hibánál is
    }
  };

  // Kép feltöltése
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadFile(file);
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
        fetchCurrentTopic(); // Frissítjük a nézetet
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (e) {
      alert("Feltöltési hiba!");
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <div style={{ color: '#94a3b8', textAlign: 'center', padding: '50px' }}>⏳ Adatok betöltése...</div>;

  if (!topic) return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😴</div>
      <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>Jelenleg nincs aktív heti kihívás!</h2>
      <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Látogass vissza később, amint az adminisztrátorok meghirdetik a legújabb témát.</p>
    </div>
  );

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* FEJLÉC */}
      <div style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', padding: '30px', borderRadius: '16px', marginBottom: '30px', color: 'white', boxShadow: '0 10px 25px rgba(249, 115, 22, 0.3)', position: 'relative', overflow: 'hidden' }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '2rem' }}>🔥 Heti Kihívás: {topic.title}</h2>
        <p style={{ margin: '0 0 15px 0', fontSize: '1.1rem', opacity: 0.9 }}>{topic.description}</p>
        <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.2)', padding: '5px 15px', borderRadius: '50px', fontSize: '0.9rem', fontWeight: 'bold' }}>
          ⏳ Határidő: {new Date(topic.end_date).toLocaleDateString('hu-HU')}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
        
        {/* BAL OLDAL: PÁRBAJ ÉS FELTÖLTÉS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Szavazó / Párbaj modul */}
          <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '1.4rem' }}>⚔️ Képpárbaj</h3>
            
            {myVoteCount < 10 && (
              <div style={{ width: '100%', background: '#ef444420', color: '#ef4444', padding: '10px', borderRadius: '8px', border: '1px solid #ef444450', marginBottom: '15px', fontSize: '0.9rem', textAlign: 'center' }}>
                Kérlek értékelj még <b>{10 - myVoteCount}</b> képet, hogy a te fotód is részt vegyen a versenyben!
              </div>
            )}

            {noMoreEntries ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', background: '#0f172a', borderRadius: '12px', width: '100%' }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎉</div>
                <h4 style={{ color: '#10b981', margin: '0 0 10px 0' }}>Minden képet értékeltél!</h4>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>Nincs több új fotó. Látogass vissza később, hátha töltenek fel újat a többiek!</p>
              </div>
            ) : voteEntry ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* A titkos fotó */}
                <div 
                  style={{ width: '100%', height: '350px', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-in' }}
                  onClick={() => setFullscreenData({url: getImageUrl(voteEntry.drive_file_id, voteEntry.file_url), title: 'Heti Kihívás Fotó'})}
                >
                  <img src={getImageUrl(voteEntry.drive_file_id, voteEntry.file_url)} alt="Szavazás" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
                
                {/* Gombok */}
                <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
                  <button 
                    onClick={() => handleVote('pass')}
                    style={{ flex: 1, padding: '15px', background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '100px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', transition: 'transform 0.1s' }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(0.95)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    ⏭️ Tovább
                  </button>
                  <button 
                    onClick={() => handleVote('like')}
                    style={{ flex: 1, padding: '15px', background: 'linear-gradient(to right, #f97316, #ef4444)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', transition: 'transform 0.1s', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)' }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    🔥 Lenyűgöző!
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ color: '#94a3b8' }}>Kép betöltése...</div>
            )}
          </div>

          {/* Saját feltöltés modul */}
          <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#f8fafc', fontSize: '1.4rem' }}>📸 Saját Nevezésem</h3>
            
            {myEntry ? (
              <div>
                <div style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '10px' }}>✅ Már neveztél erre a hétre!</div>
                <div style={{ width: '100%', height: '200px', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={getImageUrl(myEntry.drive_file_id, myEntry.file_url)} alt="Saját kép" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '10px', borderRadius: '8px' }}>
                  <span style={{ color: '#94a3b8' }}>Megtekintések: <b style={{color: '#f8fafc'}}>{myEntry.views_count}</b></span>
                  <span style={{ color: '#94a3b8' }}>Tetszik: <b style={{color: '#f97316'}}>{myEntry.likes_count} 🔥</b></span>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '15px' }}>Tölts fel egy, az e-heti témába vágó fotót! Csak 1 képet nevezhetsz.</p>
                <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileSelect} style={{ color: '#94a3b8', marginBottom: '15px', width: '100%' }} disabled={isUploading} />
                
                {uploadPreview && (
                  <div style={{marginTop: '10px', marginBottom: '20px', textAlign: 'center'}}>
                    <img src={uploadPreview} alt="Előnézet" style={{maxHeight: '200px', borderRadius: '8px', border: '1px solid #334155'}} />
                  </div>
                )}
                
                <button onClick={handleUpload} disabled={!uploadFile || isUploading} style={{ width: '100%', background: (!uploadFile || isUploading) ? '#475569' : '#38bdf8', color: (!uploadFile || isUploading) ? '#94a3b8' : '#0f172a', border: 'none', padding: '12px', borderRadius: '8px', cursor: (!uploadFile || isUploading) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                  {isUploading ? 'Feltöltés folyamatban ⏳...' : 'Benevezem a képet 🚀'}
                </button>
              </div>
            )}
          </div>

        </div>

        {/* JOBB OLDAL: TOPLISTA */}
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #f59e0b' }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#f59e0b', fontSize: '1.4rem' }}>🏆 Heti Toplista</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0' }}>A rangsor a kapott szavazatok és a megjelenések aránya (Win Rate) alapján áll fel. Legalább 3 megtekintés szükséges a listára kerüléshez.</p>
          
          {leaderboard.length === 0 ? (
            <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Még nem érkezett elég szavazat a toplista felállításához. Légy te az első!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {leaderboard.map((entry, index) => {
                const isMe = entry.user_name === user.name;
                const winRate = Number(entry.win_rate).toFixed(0);

                return (
                  <div key={entry.id} style={{ display: 'flex', alignItems: 'center', background: isMe ? '#f59e0b20' : '#0f172a', border: isMe ? '1px solid #f59e0b50' : '1px solid #334155', padding: '10px', borderRadius: '8px' }}>
                    
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', width: '35px', color: index === 0 ? '#fbbf24' : index === 1 ? '#cbd5e1' : index === 2 ? '#d97706' : '#475569', textAlign: 'center' }}>
                      {index + 1}.
                    </div>
                    
                    <div 
                      onClick={() => setFullscreenData({url: getImageUrl(entry.drive_file_id, entry.file_url), title: `Készítő: ${entry.user_name}`})}
                      style={{ width: '50px', height: '50px', backgroundColor: '#000', borderRadius: '6px', overflow: 'hidden', margin: '0 15px', cursor: 'zoom-in', flexShrink: 0 }}
                    >
                      <img src={getImageUrl(entry.drive_file_id, entry.file_url)} alt="Top" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '0.95rem' }}>
                        {entry.user_name} {isMe && <span style={{fontSize: '0.75rem', background: '#f59e0b', color: '#0f172a', padding: '2px 6px', borderRadius: '4px', marginLeft: '5px'}}>Én</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '3px' }}>
                        {entry.views_count} megtekintés
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '1.1rem' }}>{winRate}% 🔥</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{entry.likes_count} lájk</div>
                    </div>

                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
