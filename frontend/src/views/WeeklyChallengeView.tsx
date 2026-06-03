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
  
  // ÚJ: Párhuzamos párbajok kezeléséhez szükséges extra állapotok
  const [activeTopics, setActiveTopics] = useState<any[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);

  const [topic, setTopic] = useState<any>(null);
  const [myEntry, setMyEntry] = useState<any>(null);
  const [myVoteCount, setMyVoteCount] = useState(0);
  const [votableEntries, setVotableEntries] = useState(1);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const [upcomingTopics, setUpcomingTopics] = useState<any[]>([]);
  const [pastTopics, setPastTopics] = useState<any[]>([]);
  const [selectedPastTopicId, setSelectedPastTopicId] = useState<number | null>(null);
  const [pastLeaderboard, setPastLeaderboard] = useState<any[]>([]);
  const [pastClubLeaderboard, setPastClubLeaderboard] = useState<any[]>([]);
  const [currentClubLeaderboard, setCurrentClubLeaderboard] = useState<any[]>([]);

  const [voteEntry, setVoteEntry] = useState<any>(null);
  const [noMoreEntries, setNoMoreEntries] = useState(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [swapFile, setSwapFile] = useState<File | null>(null);
  const [swapPreview, setSwapPreview] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);

  const [myStats, setMyStats] = useState<{podiums: any, history: any[]} | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const [timeLeft, setTimeLeft] = useState<string>('');

  // JAVÍTVA: Dinamikus lekérdezés: ha van kijelölt ID, az Arénát tölti, ha nincs, a listát!
  const fetchCurrentTopic = async () => {
    setLoading(true);
    try {
      const url = selectedTopicId 
        ? `${BACKEND_URL}/api/weekly/current?userEmail=${user.email}&topicId=${selectedTopicId}`
        : `${BACKEND_URL}/api/weekly/current?userEmail=${user.email}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (!selectedTopicId) {
          setActiveTopics(data.activeTopics || []);
        } else {
          setTopic(data.topic);
          setMyEntry(data.myEntry);
          setMyVoteCount(data.myVoteCount);
          setVotableEntries(data.votableEntries || 1);
          setLeaderboard(data.leaderboard || []);
          setCurrentClubLeaderboard(data.clubLeaderboard || []);
          if (data.topic) fetchNextVote(data.topic.id);
        }
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
      if (res.ok) {
          const data = await res.json();
          if (data && data.history && data.podiums) {
             setMyStats(data);
          } else {
             setMyStats({ podiums: { first: 0, second: 0, third: 0 }, history: [] });
          }
      }
    } catch (error) { console.error(error); } 
    finally { setIsLoadingStats(false); }
  };

  useEffect(() => {
    if (subTab === 'current') {
      fetchCurrentTopic();
      fetchMyStats();
    }
    else if (subTab === 'upcoming') fetch(`${BACKEND_URL}/api/weekly/upcoming`).then(res => res.json()).then(data => setUpcomingTopics(data || [])).catch(console.error);
    else if (subTab === 'past') fetch(`${BACKEND_URL}/api/weekly/past`).then(res => res.json()).then(data => setPastTopics(data || [])).catch(console.error);
  }, [subTab, selectedTopicId]);

  useEffect(() => {
    if (!topic || !topic.end_date) {
      setTimeLeft('Ismeretlen dátum');
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(topic.end_date.replace(' ', 'T')); 
      
      if (isNaN(end.getTime())) {
        setTimeLeft('Hibás dátum');
        return false;
      }

      end.setHours(23, 59, 59, 999);
      const distance = end.getTime() - now;

      if (distance < 0) {
        setTimeLeft('Párbaj Lezárult!');
        return false;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
      const seconds = Math.floor((distance % (1000 * 60)) / 1000).toString().padStart(2, '0');

      setTimeLeft(`${days} nap ${hours}:${minutes}:${seconds}`);
      return true;
    };

    const isActive = calculateTimeLeft();
    if (!isActive) return;

    const interval = setInterval(() => {
      const stillActive = calculateTimeLeft();
      if (!stillActive) clearInterval(interval);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [topic]);

  const loadPastHistoryList = async (topicId: number) => {
    setSelectedPastTopicId(topicId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/history/${topicId}`);
      if (res.ok) {
        const data = await res.json();
        setPastLeaderboard(data.leaderboard || []);
        setPastClubLeaderboard(data.clubLeaderboard || []);
      }
    } catch (e) { console.error(e); }
  };

  const handleOffTopicReport = async (entryId: number) => {
    if (!window.confirm("Biztosan jelented ezt a képet, mert nem illik a témához?")) return;
    
    setVoteEntry(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/report-off-topic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, userEmail: user.email })
      });
      
      if (res.ok) {
        alert("🚫 Jelentve! A kép eltűnt a párbajodból.");
        setMyVoteCount(prev => prev + 1);
        if (topic) {
          fetchNextVote(topic.id);
          fetchCurrentTopic(); 
        }
      }
    } catch (e) {
      alert("Hiba a jelentés során.");
      if (topic) fetchNextVote(topic.id);
    }
  };
  
  const handleVote = async (type: 'pass' | 'super' | 'brilliant') => {
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
    } catch (e) { if(topic) fetchNextVote(topic.id); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadFile(file); uploadPreview && URL.revokeObjectURL(uploadPreview); setUploadPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !topic) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', uploadFile); formData.append('topicId', topic.id.toString()); formData.append('userEmail', user.email); formData.append('userName', user.name);
      const res = await fetch(`${BACKEND_URL}/api/weekly/upload`, { method: 'POST', body: formData });
      if (res.ok) { alert('🎉 Sikeres nevezés! Irány szavazni!'); setUploadFile(null); setUploadPreview(null); fetchCurrentTopic(); } 
      else { const err = await res.json(); alert(err.error); }
    } catch (e) { alert("Feltöltési hiba!"); }
    finally { setIsUploading(false); }
  };

  const handleSwapFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSwapFile(file); swapPreview && URL.revokeObjectURL(swapPreview); setSwapPreview(URL.createObjectURL(file));
    }
  };

  const handleSwapSubmit = async () => {
    if (!swapFile || !topic) return;
    if (!window.confirm("⚠️ Biztosan lecseréled a képedet? Az eddig gyűjtött pontjaid elvesznek és nulláról indulnak, de a láthatóságod megmarad!")) return;
    setIsSwapping(true);
    try {
      const formData = new FormData();
      formData.append('photo', swapFile); formData.append('topicId', topic.id.toString()); formData.append('userEmail', user.email); formData.append('userName', user.name);
      const res = await fetch(`${BACKEND_URL}/api/weekly/swap`, { method: 'POST', body: formData });
      if (res.ok) { alert('🔄 Kép sikeresen lecserélve! Újra indul a harc!'); setSwapFile(null); setSwapPreview(null); fetchCurrentTopic(); } 
      else { const err = await res.json(); alert(err.error); }
    } catch (e) { alert("Hiba a csere során!"); }
    finally { setIsSwapping(false); }
  };

  let totalLikes = 0; let totalViews = 0; let top10Count = 0; let top20Count = 0; let podiumCount = 0;
  if (myStats && myStats.history) {
    totalLikes = myStats.history.reduce((sum, e) => sum + e.likes, 0); 
    totalViews = myStats.history.reduce((sum, e) => sum + e.views, 0); 
    podiumCount = myStats.podiums.first + myStats.podiums.second + myStats.podiums.third;
    myStats.history.forEach(e => { const percentile = e.rank / e.total_entries; if (percentile <= 0.1 && e.rank > 3) top10Count++; if (percentile > 0.1 && percentile <= 0.2) top20Count++; });
  }

  const getVotePower = (likes: number) => {
    if (likes < 20) return { super: 1, brilliant: 2 };
    if (likes < 100) return { super: 2, brilliant: 3 };
    if (likes < 300) return { super: 2, brilliant: 4 };
    if (likes < 800) return { super: 3, brilliant: 5 };
    return { super: 4, brilliant: 6 };
  };
  const myPower = getVotePower(totalLikes);

  const BASE_EXPOSURE = 10;
  const exposureEarned = BASE_EXPOSURE + (myVoteCount * 2);
  const viewsRemaining = myEntry ? (exposureEarned - myEntry.views_count) : 0;
  const exposurePercentage = myEntry ? Math.min(100, Math.max(0, (viewsRemaining / 15) * 100)) : 0;

  let exposureColor = '#ef4444';
  let exposureLabel = viewsRemaining <= 0 ? 'Láthatatlan (0%)' : 'Alacsony';
  if (exposurePercentage >= 80) { exposureColor = '#10b981'; exposureLabel = 'Maximális'; } 
  else if (exposurePercentage >= 40) { exposureColor = '#f59e0b'; exposureLabel = 'Közepes'; }

  const getLevel = (likes: number) => {
    if (likes < 20) return { name: 'Újonc 🌱', nextAt: 20, color: '#94a3b8' };
    if (likes < 100) return { name: 'Felfedezett 📸', nextAt: 100, color: '#38bdf8' };
    if (likes < 300) return { name: 'Haladó ⭐', nextAt: 300, color: '#10b981' };
    if (likes < 800) return { name: 'Profi 🏅', nextAt: 800, color: '#f59e0b' };
    return { name: 'Guru 👑', nextAt: null, color: '#fbbf24' };
  };
  const currentLevel = getLevel(totalLikes);
  const progressPercent = currentLevel.nextAt ? (totalLikes / currentLevel.nextAt) * 100 : 100;

  const handleImageError = (e: any) => {
    e.currentTarget.src = 'https://via.placeholder.com/400x300/1e293b/64748b?text=Kép+nem+található';
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '10px', background: '#0f172a', padding: '10px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', width: 'fit-content', flexWrap: 'wrap', border: '1px solid #1e293b' }}>
          <button onClick={() => { setSubTab('current'); setSelectedTopicId(null); }} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'current' ? 'linear-gradient(135deg, #f97316, #ef4444)' : 'transparent', color: subTab === 'current' ? 'white' : '#94a3b8', transition: 'all 0.3s', boxShadow: subTab === 'current' ? '0 4px 15px rgba(239,68,68,0.4)' : 'none' }}>⚔️ Aréna</button>
          <button onClick={() => setSubTab('upcoming')} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'upcoming' ? '#334155' : 'transparent', color: subTab === 'upcoming' ? 'white' : '#94a3b8', transition: 'all 0.3s' }}>⏳ Hamarosan</button>
          <button onClick={() => setSubTab('past')} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'past' ? '#334155' : 'transparent', color: subTab === 'past' ? 'white' : '#94a3b8', transition: 'all 0.3s' }}>📜 Archívum</button>
          <button onClick={() => { setSubTab('my_stats'); fetchMyStats(); }} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: subTab === 'my_stats' ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'transparent', color: subTab === 'my_stats' ? 'white' : '#94a3b8', transition: 'all 0.3s', boxShadow: subTab === 'my_stats' ? '0 4px 15px rgba(139,92,246,0.4)' : 'none' }}>🏆 Trófeaterem</button>
        </div>
        
        <button onClick={() => setShowHelp(true)} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #38bdf8', cursor: 'pointer', fontWeight: 'bold', background: '#0f172a', color: '#38bdf8', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(56,189,248,0.2)' }}>
          <span style={{ fontSize: '1.2rem' }}>📖</span> Játékszabályok & Rangok
        </button>
      </div>

      {subTab === 'current' && (
        <>
          {/* ÚJ NÉZET: Ha nincs kiválasztva konkrét párbaj, kilistázzuk a párhuzamos kihívásokat */}
          {selectedTopicId === null ? (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ color: 'white', margin: 0, fontSize: '1.8rem' }}>🔥 Aktuális Kihívások</h2>
                <p style={{ color: '#94a3b8', margin: '5px 0 0 0' }}>Válassz egyet az alábbi futó párbajok közül, és lépj be a küzdelembe!</p>
              </div>

              {loading ? (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '50px' }}>⏳ Betöltés...</div>
              ) : activeTopics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'linear-gradient(180deg, #1e293b, #0f172a)', borderRadius: '24px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>😴</div>
                  <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '2rem' }}>Jelenleg nincs egyetlen aktív párbaj sem!</h2>
                  <p style={{ color: '#94a3b8' }}>Pihenj meg, hamarosan új kihívás érkezik.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px', marginTop: '20px' }}>
                  {activeTopics.map((t) => {
                    // Kiszámoljuk, napi vagy heti kihívás-e az időtartam alapján
                    const durationDays = Math.ceil((new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) / (1000 * 60 * 60 * 24));
                    const isDaily = durationDays <= 2;

                    return (
                      <div 
                        key={t.id} 
                        onClick={() => setSelectedTopicId(t.id)}
                        style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', borderRadius: '20px', border: '1px solid #334155', padding: '25px', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 10px 25px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', position: 'relative' }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = isDaily ? '#ef4444' : '#3b82f6'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#334155'; }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                          <span style={{ background: isDaily ? '#ef444420' : '#3b82f620', color: isDaily ? '#f87171' : '#60a5fa', border: `1px solid ${isDaily ? '#ef444450' : '#3b82f650'}`, padding: '4px 12px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                            {isDaily ? '🔴 Napi Pörgős' : '🔵 Heti Klasszikus'}
                          </span>
                          <span style={{ color: t.hasEntered ? '#10b981' : '#f59e0b', fontSize: '0.85rem', fontWeight: 'bold' }}>
                            {t.hasEntered ? '🚀 Neveztél' : '⏳ Még nem neveztél'}
                          </span>
                        </div>

                        <h3 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '1.4rem', fontWeight: 'bold' }}>{t.title}</h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 20px 0', lineHeight: '1.5', flex: 1 }}>{t.description}</p>
                        
                        <div style={{ background: '#00000040', padding: '10px 15px', borderRadius: '10px', fontSize: '0.85rem', color: '#cbd5e1', textAlign: 'center', border: '1px solid #1e293b' }}>
                          📅 Záróra: {new Date(t.end_date).toLocaleDateString('hu-HU')} 23:59
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ARÉNA SZÓBA: Ha van kiválasztott ID, betölti a megszokott egyedi arénát */
            <div>
              <div style={{ marginBottom: '20px' }}>
                <button 
                  onClick={() => { setSelectedTopicId(null); setTopic(null); }} 
                  style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '8px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', transition: 'all 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#334155'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#1e293b'}
                >
                  ⬅️ Vissza a kihívásokhoz
                </button>
              </div>

              {loading && !topic ? (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '50px' }}>⏳ Aréna betöltése...</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '30px' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    
                    <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '30px', borderRadius: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '8rem', opacity: 0.05 }}>🔥</div>
                      <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '1.8rem', textAlign: 'center', zIndex: 1 }}>{topic.title}</h3>
                      <p style={{ margin: '0 0 20px 0', color: '#cbd5e1', fontSize: '0.95rem', textAlign: 'center', zIndex: 1, lineHeight: '1.6' }}>{topic.description}</p>
                      
                      <div style={{ background: '#00000080', padding: '15px 30px', borderRadius: '100px', border: '1px solid #ef444450', backdropFilter: 'blur(10px)', zIndex: 1 }}>
                        <div style={{ fontSize: '0.75rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', marginBottom: '5px' }}>Hátralévő Idő</div>
                        <div style={{ color: '#f8fafc', fontSize: '1.5rem', fontWeight: '900', fontFamily: 'monospace', letterSpacing: '1px' }}>{timeLeft || 'Számítás...'}</div>
                      </div>
                    </div>
                    
                    <div style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', padding: '25px 15px', borderRadius: '24px', border: `1px solid ${exposureColor}40`, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: `0 10px 40px -10px ${exposureColor}30`, transition: 'all 0.5s ease' }}>
                      <h4 style={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 15px 0', fontSize: '0.85rem', textAlign: 'center' }}>Láthatósági Mérő</h4>
                      
                      <div style={{ position: 'relative', width: '100%', maxWidth: '240px', margin: '0 auto' }}>
                        <svg viewBox="0 0 200 120" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
                          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1e293b" strokeWidth="16" strokeLinecap="round" />
                          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={exposureColor} strokeWidth="16" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - exposurePercentage} style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s', filter: `drop-shadow(0 0 8px ${exposureColor}90)` }} />
                        </svg>
                        
                        <div style={{ position: 'absolute', bottom: '15px', left: '0', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ fontSize: '2.8rem', fontWeight: '900', color: exposureColor, lineHeight: '1', textShadow: `0 0 20px ${exposureColor}60`, transition: 'color 0.5s' }}>
                            {Math.round(exposurePercentage)}<span style={{ fontSize: '1.2rem' }}>%</span>
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#f8fafc', textTransform: 'uppercase', marginTop: '5px', letterSpacing: '2px' }}>
                            {exposureLabel}
                          </div>
                        </div>
                      </div>

                      <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '15px 0 0 0', textAlign: 'center', lineHeight: '1.6' }}>
                        {!myEntry ? 'Töltsd fel a képedet az induláshoz, és kapsz 10 alap energiát!' : exposurePercentage >= 80 ? '🔥 A képed a maximumon pörög! Jelenleg nincs más dolgod.' : '⚡ Értékelj másokat, töltsd fel a mérőt és kerülj az élre!'}
                      </p>
                    </div>

                    <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                      <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '1.4rem' }}>⚔️ Értékelő Aréna</h3>
                      {!myEntry ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center', background: '#0f172a', borderRadius: '16px', border: '2px dashed #f59e0b' }}>
                          <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>🛑</div>
                          <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '1.3rem' }}>Nincs szavazati jogod!</h4>
                          <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>A küzdelembe való belépéshez először be kell nevezned egy saját fotóval!</p>
                        </div>
                      ) : noMoreEntries ? (
                        <div style={{ padding: '50px 20px', textAlign: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '16px', border: '1px solid #10b981' }}>
                          <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🎉</div>
                          <h4 style={{ color: '#10b981', margin: '0 0 10px 0', fontSize: '1.5rem' }}>Mindent értékeltél!</h4>
                          <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>Várj, amíg a többiek is töltenek fel új képeket.</p>
                        </div>
                      ) : voteEntry ? (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div onClick={() => setFullscreenData({url: getImageUrl(voteEntry.drive_file_id, voteEntry.file_url), title: 'Kihívás'})} style={{ width: '100%', height: '380px', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-in', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }}>
                            <img src={getImageUrl(voteEntry.drive_file_id, voteEntry.file_url)} alt="Szavazás" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={handleImageError} />
                          </div>
                          
                          {voteEntry.off_topic_count > 0 && (
                            <div style={{ background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b40', padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '15px', display: 'inline-flex', alignItems: 'center', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                              ⚠️ {voteEntry.off_topic_count} játékos szerint ez a kép Off-Topic!
                            </div>
                          )}
                          
                          <div style={{ display: 'flex', gap: '12px', width: '100%', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                              <button onClick={() => handleVote('super')} style={{ flex: 1, padding: '15px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)' }}>
                                ✨ Szuper <br/><span style={{fontSize: '0.8rem', fontWeight: 'normal'}}>+{myPower.super} pont</span>
                              </button>
                              <button onClick={() => handleVote('brilliant')} style={{ flex: 1, padding: '15px', background: 'linear-gradient(135deg, #f97316, #ef4444)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)' }}>
                                🔥 Zseniális <br/><span style={{fontSize: '0.8rem', fontWeight: 'normal'}}>+{myPower.brilliant} pont</span>
                              </button>
                            </div>
                            <button onClick={() => handleVote('pass')} style={{ width: '100%', padding: '12px', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '14px', fontSize: '0.95rem', cursor: 'pointer' }}>
                              ⏭️ Nem tetszik (0 pont)
                            </button>
                            <button 
                              onClick={() => handleOffTopicReport(voteEntry.id)}
                              style={{ width: '100%', padding: '10px 20px', background: '#ef444410', color: '#ef4444', border: '1px solid #ef444430', borderRadius: '14px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                            >
                              ⚠️ Off-Topic Jelentés
                            </button>
                          </div>
                        </div>
                      ) : <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Kép betöltése...</div>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    
                    <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                      <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '1.4rem' }}>📸 Saját Nevezésem</h3>
                      {myEntry ? (
                        <div>
                          <div style={{ width: '100%', height: '220px', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)' }}>
                            <img src={getImageUrl(myEntry.drive_file_id, myEntry.file_url)} alt="Saját" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={handleImageError} />
                          </div>
                          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${exposureColor}` }}>
                            <div style={{ textAlign: 'center' }}><div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '5px' }}>Eredmény</div><div style={{ color: '#f59e0b', fontSize: '1.5rem', fontWeight: '900' }}>{myEntry.likes_count} ⭐</div></div>
                            <div style={{ textAlign: 'center' }}><div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '5px' }}>Nézettség</div><div style={{ color: '#38bdf8', fontSize: '1.5rem', fontWeight: '900' }}>{myEntry.views_count} 👁️</div></div>
                          </div>

                          {myEntry.off_topic_count > 0 && (
                            <div style={{ background: 'linear-gradient(90deg, #ef444415, transparent)', borderLeft: '4px solid #ef4444', padding: '15px', borderRadius: '0 12px 12px 0', marginTop: '15px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                              <strong style={{ color: '#ef4444', display: 'block', marginBottom: '4px', fontSize: '0.95rem' }}>
                                🚫 Figyelmeztetés: Tématévesztés gyanúja!
                              </strong>
                              A képedet eddig <b>{myEntry.off_topic_count} fotóstársad</b> jelentette off-topicnak. Kérlek ügyelj a pontos illeszkedésre, vagy használd az alábbi képcsere modult!
                            </div>
                          )}

                          {myEntry.swapped === 0 ? (
                            <div style={{ marginTop: '25px', background: 'linear-gradient(135deg, #4c1d9520, #be123c20)', padding: '20px', borderRadius: '16px', border: '1px solid #be123c50' }}>
                              <h5 style={{ margin: '0 0 10px 0', color: '#f43f5e', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>🃏 Joker: Taktikai Képcsere</h5>
                              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 15px 0', lineHeight: '1.5' }}>Rosszul teljesít a képed? Ebben a párbajban egyszer lecserélheted! A pontjaid nullázódnak, de az energiád megmarad.</p>
                              <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleSwapFileSelect} style={{ color: '#cbd5e1', marginBottom: '15px', fontSize: '0.85rem', width: '100%', padding: '10px', background: '#0f172a', borderRadius: '8px' }} disabled={isSwapping} />
                              {swapPreview && <div style={{marginBottom: '15px', display: 'flex', justifyContent: 'center'}}><img src={swapPreview} alt="Swap preview" style={{maxHeight: '120px', borderRadius: '8px', border: '2px solid #e11d48'}} /></div>}
                              <button onClick={handleSwapSubmit} disabled={!swapFile || isSwapping} style={{ width: '100%', background: !swapFile ? '#334155' : 'linear-gradient(135deg, #e11d48, #be123c)', color: !swapFile ? '#94a3b8' : 'white', border: 'none', padding: '12px', borderRadius: '12px', cursor: !swapFile ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1rem', boxShadow: swapFile ? '0 4px 15px rgba(225, 29, 72, 0.4)' : 'none' }}>
                                {isSwapping ? 'Csere folyamatban...' : 'Joker Felhasználása 🔄'}
                              </button>
                            </div>
                          ) : (
                            <div style={{ marginTop: '25px', background: '#0f172a', padding: '15px', borderRadius: '12px', color: '#64748b', fontSize: '0.9rem', textAlign: 'center', border: '1px dashed #475569' }}>
                              🔒 Ebben a párbajban már elhasználtad a Joker kártyádat.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px dashed #38bdf8' }}>
                            <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileSelect} style={{ color: '#cbd5e1', marginBottom: '15px', width: '100%', fontSize: '0.9rem' }} disabled={isUploading} />
                            {uploadPreview && <div style={{marginBottom: '20px', display: 'flex', justifyContent: 'center'}}><img src={uploadPreview} alt="Preview" style={{maxHeight: '200px', borderRadius: '12px', boxShadow: '0 5px 15px rgba(0,0,0,0.5)'}} /></div>}
                            <button onClick={handleUpload} disabled={!uploadFile || isUploading} style={{ width: '100%', background: (!uploadFile || isUploading) ? '#334155' : 'linear-gradient(135deg, #0ea5e9, #2563eb)', color: (!uploadFile || isUploading) ? '#94a3b8' : 'white', border: 'none', padding: '14px', borderRadius: '12px', cursor: !uploadFile ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: uploadFile ? '0 5px 20px rgba(14, 165, 233, 0.4)' : 'none' }}>
                              {isUploading ? 'Feltöltés...' : 'Nevezés és Indulás 🚀'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ÉLŐ KLUBOK CSATÁJA */}
                    <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #10b981', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ margin: 0, color: '#10b981', fontSize: '1.4rem' }}>🛡️ Klubok Csatája</h3>
                        <span style={{ fontSize: '0.8rem', background: '#ef4444', color: 'white', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold', boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)' }}>ÉLŐ</span>
                      </div>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>A 3 legjobb klubtag megmérettetése alapján.</p>
                      
                      {(!currentClubLeaderboard || currentClubLeaderboard.length === 0) ? <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px', background: '#0f172a', borderRadius: '16px' }}>Még nincs rangsorolt klub.</div> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {currentClubLeaderboard.map((club, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: '1px solid #059669', padding: '12px', borderRadius: '12px' }}>
                              <div style={{ fontSize: '1.5rem', fontWeight: '900', width: '35px', color: index === 0 ? '#fbbf24' : '#cbd5e1', textAlign: 'center' }}>{index + 1}.</div>
                              <div style={{ flex: 1, marginLeft: '10px' }}>
                                <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>{club.club_name}</div>
                                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{club.members_counted} aktív tag</div>
                              </div>
                              <div style={{ color: '#10b981', fontWeight: '900', fontSize: '1.4rem' }}>{club.total_score} ⭐</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* VAK TOPLISTA */}
                    <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #f59e0b', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                      <h3 style={{ margin: '0 0 10px 0', color: '#f59e0b', fontSize: '1.4rem' }}>🏆 Vak Toplista</h3>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>A taktikázás elkerülése végett az ellenfelek kiléte titkos!</p>
                      
                      {(!leaderboard || leaderboard.length === 0) ? <div style={{ color: '#94a3b8', textAlign: 'center', padding: '30px', background: '#0f172a', borderRadius: '16px' }}>Még üres az Aréna.</div> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {[...leaderboard].sort((a, b) => {
                            if (b.likes_count !== a.likes_count) return b.likes_count - a.likes_count;
                            return a.views_count - b.views_count;
                          }).map((entry, index) => {
                            const isMe = entry.user_email === user.email;
                            const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#e2e8f0' : index === 2 ? '#cd7f32' : '#64748b';
                            
                            return (
                              <div key={entry.id} style={{ display: 'flex', alignItems: 'center', background: isMe ? 'linear-gradient(90deg, #f59e0b20, #0f172a)' : '#0f172a', border: isMe ? '1px solid #f59e0b50' : '1px solid #334155', padding: '12px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: '900', width: '35px', color: rankColor, textAlign: 'center' }}>{index + 1}.</div>
                                <div onClick={() => isMe ? setFullscreenData({url: getImageUrl(entry.drive_file_id, entry.file_url), title: entry.user_name}) : null} style={{ width: '55px', height: '55px', backgroundColor: '#000', borderRadius: '10px', overflow: 'hidden', margin: '0 15px', cursor: isMe ? 'zoom-in' : 'default', flexShrink: 0, position: 'relative' }}>
                                  <img src={getImageUrl(entry.drive_file_id, entry.file_url)} alt="Top" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isMe ? 'none' : 'blur(6px) contrast(120%) saturation(150%)', transform: isMe ? 'none' : 'scale(1.2)' }} onError={handleImageError} />
                                  {!isMe && (
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <span style={{ fontSize: '1.5rem', opacity: 0.8 }}>🔒</span>
                                    </div>
                                  )}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ color: isMe ? '#f8fafc' : '#94a3b8', fontWeight: 'bold', fontStyle: isMe ? 'normal' : 'italic', fontSize: '1.05rem' }}>
                                    {isMe ? entry.user_name : 'Titkosított ellenfél'}
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Nézettség: {entry.views_count}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ color: isMe ? '#f97316' : '#94a3b8', fontWeight: '900', fontSize: '1.5rem' }}>{entry.likes_count} ⭐</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {subTab === 'upcoming' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
          {(!upcomingTopics || upcomingTopics.length === 0) ? (
            <div style={{ color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center', padding: '60px', background: '#1e293b', borderRadius: '24px', border: '1px solid #334155' }}>Nincs betárazva elkövetkező téma.</div>
          ) : (
            upcomingTopics.map(t => (
              <div key={t.id} style={{ background: 'linear-gradient(180deg, #1e293b, #0f172a)', padding: '25px', borderRadius: '24px', border: '1px solid #475569', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🗓️</div>
                <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '1.4rem' }}>{t.title}</h4>
                <p style={{ color: '#cbd5e1', fontSize: '0.95rem', margin: '0 0 20px 0', flex: 1, lineHeight: '1.6' }}>{t.description}</p>
                <div style={{ color: '#38bdf8', fontSize: '0.9rem', background: '#0f172a', padding: '15px', borderRadius: '12px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #38bdf840' }}>
                  ⏳ Start: {new Date(t.start_date).toLocaleDateString('hu-HU')}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {subTab === 'past' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr md:350px', gap: '30px' }}>
          
          <div style={{ background: '#1e293b', borderRadius: '24px', padding: '25px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#60a5fa', fontSize: '1.4rem' }}>📚 Lezárult hetek</h3>
            {(!pastTopics || pastTopics.length === 0) ? <div style={{color: '#94a3b8', textAlign: 'center'}}>Nincs lezáradt kihívás.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pastTopics.map(t => (
                  <div key={t.id} onClick={() => loadPastHistoryList(t.id)} style={{ padding: '15px 20px', background: selectedPastTopicId === t.id ? 'linear-gradient(90deg, #3b82f640, #0f172a)' : '#0f172a', border: selectedPastTopicId === t.id ? '1px solid #3b82f6' : '1px solid #334155', borderRadius: '12px', cursor: 'pointer', color: 'white', fontWeight: selectedPastTopicId === t.id ? 'bold' : 'normal', transition: 'all 0.2s' }}>
                    {t.title}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            <div style={{ background: '#1e293b', borderRadius: '24px', padding: '25px', border: '1px solid #10b981', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 5px 0', color: '#10b981', fontSize: '1.4rem' }}>🛡️ Klubok Csatája</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0 0 20px 0' }}>Csak a 3 legjobb klubtag pontja számít!</p>
              
              {selectedPastTopicId && (!pastClubLeaderboard || pastClubLeaderboard.length === 0) && <div style={{color: '#94a3b8', textAlign: 'center', padding: '10px'}}>Nincs résztvevő klub.</div>}
              {!selectedPastTopicId && <div style={{color: '#94a3b8', textAlign: 'center', padding: '10px'}}>Válassz egy témát a listából.</div>}
              
              {pastClubLeaderboard && pastClubLeaderboard.map((club, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '15px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #059669' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '900', width: '35px', color: index === 0 ? '#fbbf24' : '#cbd5e1', textAlign: 'center' }}>{index + 1}.</div>
                  <div style={{ flex: 1, marginLeft: '10px' }}>
                    <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>{club.club_name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{club.members_counted} tag pontja alapján</div>
                  </div>
                  <div style={{ color: '#10b981', fontWeight: '900', fontSize: '1.4rem' }}>{club.total_score} ⭐</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#1e293b', borderRadius: '24px', padding: '25px', border: '1px solid #3b82f6', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#3b82f6', fontSize: '1.4rem' }}>🏅 Egyéni Végeredmény</h3>
              
              {!selectedPastTopicId && <div style={{color: '#94a3b8', textAlign: 'center', padding: '10px'}}>Válassz egy témát a listából.</div>}
              
              {pastLeaderboard && [...pastLeaderboard].sort((a, b) => {
                if (b.likes_count !== a.likes_count) return b.likes_count - a.likes_count;
                return a.views_count - b.views_count;
              }).map((entry, index) => (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '12px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: '900', width: '35px', color: index === 0 ? '#fbbf24' : '#94a3b8', textAlign: 'center' }}>{index + 1}.</div>
                  <img src={getImageUrl(entry.drive_file_id, entry.file_url)} alt="Top" style={{ width: '50px', height: '50px', borderRadius: '8px', margin: '0 15px', objectFit: 'cover' }} onError={handleImageError} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: 'bold' }}>{entry.user_name}</div>
                    {entry.club_name && <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold' }}>🛡️ {entry.club_name}</div>}
                  </div>
                  <div style={{ color: '#f97316', fontWeight: '900', fontSize: '1.2rem' }}>{entry.likes_count} ⭐</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {subTab === 'my_stats' && (
        <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
          {isLoadingStats && (!myStats || myStats.history.length === 0) ? (
            <div style={{ color: '#94a3b8', textAlign: 'center', padding: '50px' }}>⏳ Statisztikák betöltése...</div>
          ) : !myStats ? (
            <div style={{ color: '#ef4444', textAlign: 'center', padding: '20px' }}>Nem sikerült betölteni az adatokat.</div>
          ) : (
            <>
              <div style={{ background: 'linear-gradient(180deg, #1e293b, #0f172a)', padding: '40px 25px', borderRadius: '24px', border: `1px solid ${currentLevel.color}50`, marginBottom: '40px', textAlign: 'center', boxShadow: `0 10px 40px -10px ${currentLevel.color}40`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-50px', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', background: `${currentLevel.color}20`, filter: 'blur(80px)', borderRadius: '50%' }}></div>
                <h3 style={{ color: '#94a3b8', margin: '0 0 10px 0', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '3px', position: 'relative', zIndex: 1 }}>Jelenlegi Státuszod</h3>
                <h1 style={{ color: currentLevel.color, margin: '0 0 20px 0', fontSize: '3.5rem', fontWeight: '900', textShadow: `0 0 20px ${currentLevel.color}60`, position: 'relative', zIndex: 1 }}>{currentLevel.name}</h1>
                
                <div style={{ width: '100%', maxWidth: '600px', background: '#0f172a', height: '16px', borderRadius: '10px', margin: '0 auto', overflow: 'hidden', border: '1px solid #334155', position: 'relative', zIndex: 1 }}>
                  <div style={{ width: `${progressPercent}%`, background: `linear-gradient(90deg, transparent, ${currentLevel.color})`, height: '100%', boxShadow: `0 0 10px ${currentLevel.color}` }}></div>
                </div>
                {currentLevel.nextAt ? (
                  <div style={{ color: '#cbd5e1', fontSize: '0.9rem', marginTop: '15px', position: 'relative', zIndex: 1 }}>
                    Még <b style={{color: 'white', fontSize: '1.1rem'}}>{currentLevel.nextAt - totalLikes} Rangpont</b> kell a következő szinthez!
                  </div>
                ) : (
                  <div style={{ color: '#fbbf24', fontSize: '1rem', marginTop: '15px', fontWeight: 'bold', position: 'relative', zIndex: 1 }}>Elérted a maximális szintet! Te vagy a Fotós Guru!</div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #334155', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#f97316', marginBottom: '5px' }}>{totalLikes}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Összes Szerzett Pont</div>
                </div>
                <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #334155', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#38bdf8', marginBottom: '5px' }}>{totalViews}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Összes Megtekintés</div>
                </div>
                <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #fbbf24', boxShadow: '0 10px 20px rgba(251,191,36,0.1)' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fbbf24', marginBottom: '5px' }}>{podiumCount}</div>
                  <div style={{ color: '#fbbf24', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Dobogós Helyezés</div>
                </div>
                <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #a855f7', boxShadow: '0 10px 20px rgba(168,85,247,0.1)' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#a855f7', marginBottom: '5px' }}>{top10Count}</div>
                  <div style={{ color: '#a855f7', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Top 10% Plecsni</div>
                </div>
                <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #10b981', boxShadow: '0 10px 20px rgba(16,185,129,0.1)' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10b981', marginBottom: '5px' }}>{top20Count}</div>
                  <div style={{ color: '#10b981', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Top 20% Plecsni</div>
                </div>
              </div>

              <h3 style={{ color: '#f8fafc', marginBottom: '20px', fontSize: '1.5rem' }}>📸 Korábbi Pályaművek ({myStats.history.length})</h3>
              
              {myStats.history.length === 0 ? (
                <div style={{ color: '#94a3b8', background: '#1e293b', padding: '40px', borderRadius: '20px', textAlign: 'center', border: '1px dashed #334155' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📸</div>
                  <h4 style={{ color: '#f8fafc', margin: '0 0 10px 0', fontSize: '1.2rem' }}>Még nincs befejezett kihívásod!</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>Vegyél részt a kihívásokban, és itt fognak megjelenni a korábbi eredményeid.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' }}>
                  {myStats.history.map((entry, idx) => {
                    const percentile = entry.rank / entry.total_entries;
                    let badge = ''; let badgeColor = '#334155';
                    if (entry.rank <= 3) { badge = '🏆 Dobogós'; badgeColor = '#fbbf24'; }
                    else if (percentile <= 0.1) { badge = '⭐ Top 10%'; badgeColor = '#a855f7'; }
                    else if (percentile <= 0.2) { badge = '✨ Top 20%'; badgeColor = '#10b981'; }

                    return (
                      <div key={idx} style={{ background: '#1e293b', borderRadius: '20px', overflow: 'hidden', border: `1px solid ${badgeColor}`, cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }} onClick={() => setFullscreenData({url: getImageUrl(entry.drive_file_id, entry.file_url), title: entry.topic_title})} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div style={{ position: 'relative', height: '220px' }}>
                          <img src={getImageUrl(entry.drive_file_id, entry.file_url)} alt="Pályamű" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleImageError} />
                          <div style={{ position: 'absolute', top: '15px', left: '15px', background: badgeColor, color: badgeColor === '#fbbf24' ? 'black' : 'white', padding: '6px 16px', borderRadius: '100px', fontWeight: '900', fontSize: '0.9rem', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
                            {badge || `${entry.rank}. Hely`}
                          </div>
                        </div>
                        <div style={{ padding: '20px' }}>
                          <h4 style={{ margin: '0 0 15px 0', color: '#f8fafc', fontSize: '1.2rem' }}>{entry.topic_title}</h4>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '12px' }}>
                            <span>Mezőny: {entry.total_entries} kép</span>
                            <span style={{color: '#f8fafc'}}>Helyezés: <b>{entry.rank}.</b></span>
                          </div>
                          <div style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span style={{color: '#f97316', fontWeight: '900'}}>⭐ {entry.likes} pont</span>
                            <span style={{color: '#38bdf8', fontWeight: 'bold'}}>👁️ {entry.views}</span>
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

      {showHelp && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '24px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
            
            <button onClick={() => setShowHelp(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: '#1e293b', border: 'none', color: '#94a3b8', fontSize: '1.5rem', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✖</button>
            
            <h2 style={{ color: '#f8fafc', margin: '0 0 25px 0', fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>📖 Útmutató az Arénához</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #f59e0b' }}>
                <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '1.1rem' }}>⚡ Láthatósági Mérő (Az Energia)</h4>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                  Amikor feltöltöd a képed, kapsz energiát. Valahányszor a gép megmutatja a képed valakinek, ez az energia csökken. Új energiát úgy szerezhetsz, ha értékelsz más fotókat. Tartsd a mérőt a Zöld zónában!
                </p>
              </div>

              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #e11d48' }}>
                <h4 style={{ color: '#e11d48', margin: '0 0 10px 0', fontSize: '1.1rem' }}>🃏 Joker: Taktikai Képcsere</h4>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                  Úgy érzed, rossz képet töltöttél fel, és lemaradtál a pontversenyben? Minden párbajban <b>egyszer</b> kijátszhatod a Jokert! A lecserélt fotóddal a pontjaid lenullázódnak, de a megkeresett Láthatóságod megmarad.
                </p>
              </div>

              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #38bdf8' }}>
                <h4 style={{ color: '#38bdf8', margin: '0 0 15px 0', fontSize: '1.1rem' }}>⭐ Ranglétra és Szavazati Erő</h4>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', margin: '0 0 15px 0' }}>
                  Nem minden szavazat ér ugyanannyit! Ahogy halmozod a pontokat a kihívások során, a rangod növekszik. Minél magasabb a rangod, annál <b>több pontot adsz</b> másoknak, amikor értékeled őket!
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { name: 'Újonc 🌱', req: '0 - 19 pont', power: '✨ +1 / 🔥 +2', color: '#94a3b8' },
                    { name: 'Felfedezett 📸', req: '20 - 99 pont', power: '✨ +2 / 🔥 +3', color: '#38bdf8' },
                    { name: 'Haladó ⭐', req: '100 - 299 pont', power: '✨ +2 / 🔥 +4', color: '#10b981' },
                    { name: 'Profi 🏅', req: '300 - 799 pont', power: '✨ +3 / 🔥 +5', color: '#f59e0b' },
                    { name: 'Guru 👑', req: '800+ pont', power: '✨ +4 / 🔥 +6', color: '#fbbf24' }
                  ].map((rank, i) => {
                    const isMyRank = currentLevel && currentLevel.name === rank.name;
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: isMyRank ? `${rank.color}20` : '#0f172a', border: isMyRank ? `1px solid ${rank.color}` : '1px solid #334155', borderRadius: '8px' }}>
                        <div>
                          <div style={{ color: rank.color, fontWeight: 'bold', fontSize: '1rem' }}>{rank.name} {isMyRank && <span style={{fontSize: '0.75rem', background: rank.color, color: '#000', padding: '2px 6px', borderRadius: '10px', marginLeft: '5px'}}>TE VAGY</span>}</div>
                          <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Szükséges: {rank.req}</div>
                        </div>
                        <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#f8fafc', fontSize: '0.9rem' }}>
                          {rank.power}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
