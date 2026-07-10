import React, { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL } from '../utils/constants';
import VideoLoader from '../components/VideoLoader';
import { useLanguage } from '../context/LanguageContext';
import { Trophy, Star, Timer, Sparkles, CheckCircle2, XCircle, AlertCircle, HelpCircle, History, Calendar, ShoppingCart, Ticket, Award } from 'lucide-react';

const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('photoAppToken');
  return { ...(token ? { 'Authorization': `Bearer ${token}` } : {}), ...extraHeaders };
};

type QuizPhase = 'INTRO' | 'LOADING' | 'PLAYING' | 'SUMMARY' | 'ALREADY_PLAYED';
type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly';

export default function QuizView({ user }: { user: any }) {
  const { lang, t } = useLanguage();
  
  const [phase, setPhase] = useState<QuizPhase>('INTRO');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(20); 
  const [rewardData, setResultData] = useState<{ pointsAwarded: number; score: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState<Record<number, string>>({});

  // Kvíztörténet és Kuponrendszer állapotai
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [quizBalance, setQuizBalance] = useState(0);
  const [alreadyPlayedToday, setAlreadyPlayedToday] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  // 🎯 ÚJ: Ranglista állapotok
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>('daily');
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const currentQuestion = questions[currentIdx];

  // Alapadatok szinkronizálása
  const fetchMyThemeData = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/quiz/my-history`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data.history || []);
        setQuizBalance(data.quizBalance || 0);
        setAlreadyPlayedToday(data.alreadyPlayedToday || false);
      }
    } catch (e) { console.error(e); }
  };

  // 🎯 ÚJ: Ranglista adatok lekérése a szerverről
  const fetchLeaderboard = async (period: LeaderboardPeriod) => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/quiz/leaderboard?period=${period}`, { headers: getAuthHeaders() });
      if (res.ok) {
        setLeaderboardData(await res.json());
      }
    } catch (e) { console.error(e); }
    finally { setLoadingLeaderboard(false); }
  };

  useEffect(() => {
    if (phase === 'INTRO') {
      fetchMyThemeData();
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'INTRO' && showLeaderboard) {
      fetchLeaderboard(leaderboardPeriod);
    }
  }, [showLeaderboard, leaderboardPeriod, phase]);

  // rAF ALAPÚ MEGSZAKÍTHATATLAN ÓRAMOTOR
  useEffect(() => {
    if (phase !== 'PLAYING' || !currentQuestion) return;

    const timerKey = `photo_quiz_end_${currentQuestion.id}`;
    let targetTime = Number(sessionStorage.getItem(timerKey));

    if (!targetTime) {
      targetTime = Date.now() + 20400;
      sessionStorage.setItem(timerKey, String(targetTime));
    }

    let rafId: number;
    let intervalId: ReturnType<typeof setInterval>;
    let finished = false;

    const updateClock = () => {
      const now = Date.now();
      const diff = targetTime - now;
      const remaining = Math.max(0, Math.ceil(diff / 1000));

      setTimeLeft(remaining);

      if (diff <= 0 && !finished) {
        finished = true;
        sessionStorage.removeItem(timerKey);
        handleSelectOption('');
      }
    };

    const tick = () => {
      updateClock();
      if (!finished) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    intervalId = setInterval(updateClock, 250);

    const forceSync = () => updateClock();
    document.addEventListener('visibilitychange', forceSync);
    window.addEventListener('focus', forceSync);

    updateClock();

    return () => {
      finished = true;
      cancelAnimationFrame(rafId);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', forceSync);
      window.removeEventListener('focus', forceSync);
    };
  }, [phase, currentIdx, currentQuestion?.id]);

  // KUPON VÁSÁRLÁSA
  const handleBuyToken = async () => {
    if (isBuying) return;
    setIsBuying(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/quiz/buy-token`, { method: 'POST', headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setQuizBalance(data.newQuizBalance);
        alert("🎉 Sikeres vásárlás! 1 db Extra Kvíz Kupon jóváírva.");
      } else {
        const err = await res.json();
        alert(`❌ Sikertelen vásárlás: ${err.error || 'Fedezethiány.'}`);
      }
    } catch (e) { alert("Hálózati hiba."); }
    finally { setIsBuying(false); }
  };

  const handleStartQuiz = async () => {
    setPhase('LOADING');
    try {
      const res = await fetch(`${BACKEND_URL}/api/quiz/questions`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.alreadyPlayed) { setPhase('ALREADY_PLAYED'); } 
        else {
          try { Object.keys(sessionStorage).forEach(k => { if(k.startsWith('photo_quiz_end_')) sessionStorage.removeItem(k); }); } catch(e){}
          setQuestions(data.questions || []);
          setCurrentIdx(0); setSelectedAnswers({}); setCorrectAnswers({}); setTimeLeft(20);
          setPhase('PLAYING');
        }
      } else { setPhase('INTRO'); }
    } catch (e) { setPhase('INTRO'); }
  };

  const parsedQuestion = useMemo(() => {
    if (!currentQuestion) return null;
    const title = lang === 'en' ? currentQuestion.question_en : currentQuestion.question_hu;
    let opts: string[] = ['A', 'B', 'C', 'D'];
    try {
      const rawOpts = lang === 'en' ? currentQuestion.options_en : currentQuestion.options_hu;
      if (typeof rawOpts === 'string') opts = JSON.parse(rawOpts);
      else if (Array.isArray(rawOpts)) opts = rawOpts;
    } catch (e) {}
    if (!Array.isArray(opts) || opts.length === 0) opts = ['A', 'B', 'C', 'D'];
    return { title, opts };
  }, [currentQuestion, lang]);

  const handleFinalSubmit = async (finalAnswers: Record<number, string>) => {
    setPhase('LOADING');
    setIsSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/quiz/submit`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ answers: finalAnswers, userEmail: user?.email || '' })
      });
      if (res.ok) {
        const data = await res.json();
        setResultData(data);
        setCorrectAnswers(data.correctAnswers || {});
        setPhase('SUMMARY');
      } else { alert("Hiba a mentés közben."); setPhase('INTRO'); }
    } catch (e) { setPhase('INTRO'); } 
    finally { setIsSubmitting(false); }
  };

  const handleSelectOption = (letter: string) => {
    if (phase !== 'PLAYING' || isSubmitting) return;
    if (currentQuestion) sessionStorage.removeItem(`photo_quiz_end_${currentQuestion.id}`);
    
    const nextAnswers = { ...selectedAnswers, [currentQuestion.id]: letter };
    setSelectedAnswers(nextAnswers);

    const nextIndex = currentIdx + 1;
    if (nextIndex < questions.length) setCurrentIdx(nextIndex);
    else handleFinalSubmit(nextAnswers);
  };

  const getReadableOptionText = (letter: string, rawOptions: any) => {
    if (!letter || letter === '') return lang === 'en' ? 'Timeout' : 'Időtúllépés';
    try {
      const opts = typeof rawOptions === 'string' ? JSON.parse(rawOptions) : rawOptions;
      const idx = letter.charCodeAt(0) - 65;
      if (Array.isArray(opts) && opts[idx]) return `${letter}: ${opts[idx]}`;
    } catch(e){}
    return letter;
  };

  return (
    <div style={{ width: '100%', maxWidth: '850px', margin: '0 auto', boxSizing: 'border-box', padding: '10px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* ── A: INTRO PANEL ── */}
      {phase === 'INTRO' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', padding: '40px 30px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <Trophy size={48} color="#f59e0b" style={{ margin: '0 auto 15px auto', display: 'block' }} />
            <h2 style={{ color: '#f8fafc', fontSize: '1.75rem', fontWeight: '800', margin: '0 0 10px 0' }}>{lang === 'en' ? 'Daily Quiz' : 'Napi Kvíz'}</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '20px' }}>
              {lang === 'en' ? 'Test your photography knowledge! Earn up to 50 spendable Arena Points daily!' : 'Tedd próbára a fotós tudásod és gyűjts akár 50 elkölthető Aréna pontot naponta!'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
              <span style={{ padding: '6px 14px', borderRadius: '20px', background: alreadyPlayedToday ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', color: alreadyPlayedToday ? '#f87171' : '#34d399', fontSize: '0.85rem', fontWeight: 'bold', border: alreadyPlayedToday ? '1px solid #ef444430' : '1px solid #10b98130' }}>
                {alreadyPlayedToday ? (lang === 'en' ? 'Free daily: Claimed ❌' : 'Mai ingyenes kör: Felhasználva ❌') : (lang === 'en' ? 'Free daily: Available 🟢' : 'Mai ingyenes kör: Elérhető 🟢')}
              </span>
              <span style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(245,158,11,0.08)', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid #f59e0b30', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Ticket size={14} /> {lang === 'en' ? `Extra Coupons: ${quizBalance} db` : `Ráadás Kuponjaid: ${quizBalance} db`}
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px', width: '100%', flexWrap: 'wrap' }}>
                <button onClick={() => { setShowHistory(!showHistory); setShowLeaderboard(false); }} style={{ flex: 1, minWidth: '130px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <History size={16} /> {showHistory ? 'Bezárás' : 'Kvíznaplóm'}
                </button>
                
                {/* 🎯 ÚJ: Ranglista váltó gomb */}
                <button onClick={() => { setShowLeaderboard(!showLeaderboard); setShowHistory(false); }} style={{ flex: 1, minWidth: '130px', background: '#1e293b', color: '#fbbf24', border: '1px solid #b4530940', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Award size={16} /> {showLeaderboard ? 'Bezárás' : 'Dicsőséglista'}
                </button>

                {alreadyPlayedToday && quizBalance === 0 ? (
                  <button onClick={handleBuyToken} disabled={isBuying} style={{ flex: 1.5, minWidth: '180px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <ShoppingCart size={16} /> {isBuying ? 'Vásárlás...' : 'Kupon vásárlása (5p) 🪙'}
                  </button>
                ) : (
                  <button onClick={handleStartQuiz} style={{ flex: 1.5, minWidth: '180px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    {alreadyPlayedToday ? 'Ráadás kör indítása 🚀' : 'Kihívás Indítása 🚀'}
                  </button>
                )}
              </div>

              {alreadyPlayedToday && quizBalance > 0 && (
                <button onClick={handleBuyToken} disabled={isBuying} style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #334155', padding: '8px', borderRadius: '8px', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer', marginTop: '4px' }}>
                  ➕ Újabb Kupon vásárlása (5 pont)
                </button>
              )}
            </div>
          </div>

          {/* HISTÓRIA LISTA */}
          {showHistory && historyList.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', padding: '25px', borderRadius: '12px' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#f1f5f9', fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} color="#38bdf8" /> Szaját Kvíz Teljesítmény-Napló
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {historyList.map(item => (
                  <div key={item.id} style={{ background: '#0f172a50', border: '1px solid var(--border-main)', padding: '14px 18px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                      <Calendar size={14} color="#64748b" /> <span>{item.date}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', fontWeight: 'bold' }}>
                      <span style={{ color: '#38bdf8' }}>🎯 {item.score} pont</span>
                      <span style={{ color: '#10b981' }}>🪙 +{item.points_awarded}p</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🎯 ÚJ: STRUKTURÁLT, IDŐZÍTETT DICSŐSÉGLISTA PANEL */}
          {showLeaderboard && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', padding: '25px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-main)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, color: '#fbbf24', fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} /> Toplista
                </h3>
                
                {/* Al-idősáv választó fülek */}
                <div style={{ display: 'inline-flex', background: '#0f172a', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-main)' }}>
                  {(['daily', 'weekly', 'monthly'] as const).map(p => (
                    <button key={p} onClick={() => setLeaderboardPeriod(p)} style={{ padding: '6px 14px', background: leaderboardPeriod === p ? 'var(--bg-card)' : 'transparent', color: leaderboardPeriod === p ? '#fbbf24' : '#64748b', border: 'none', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.1s' }}>
                      {p === 'daily' ? 'Napi' : p === 'weekly' ? 'Heti' : 'Havi'}
                    </button>
                  ))}
                </div>
              </div>

              {loadingLeaderboard ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Betöltés... ⏳</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {leaderboardData.map((row, index) => {
                    const correctCount = Math.round(row.best_score / 100);
                    const percentage = Math.round(row.best_score / 10);
                    
                    return (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0f172a30', border: '1px solid var(--border-main)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.88rem' }}>
                        {/* Helyezés */}
                        <span style={{ width: '24px', textAlign: 'center', fontWeight: 'bold', color: index === 0 ? '#fbbf24' : index === 1 ? '#cbd5e1' : index === 2 ? '#d97706' : '#475569' }}>
                          #{index + 1}
                        </span>
                        
                        {/* Avatar */}
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', background: '#1e293b', flexShrink: 0, border: '1px solid var(--border-main)' }}>
                          <img src={row.avatar_url || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='%23475569'><circle cx='16' cy='16' r='16'/></svg>`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        </div>

                        {/* Név és Klub */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ display: 'block', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</strong>
                          {row.club_name && <small style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>🏰 {row.club_name}</small>}
                        </div>

                        {/* Arány és Százalék */}
                        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <span style={{ color: '#cbd5e1', fontSize: '0.82rem', fontFamily: 'monospace' }}>{correctCount} / 10</span>
                          <span style={{ color: '#38bdf8', fontWeight: 'bold', minWidth: '45px', textAlign: 'right' }}>{percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                  {leaderboardData.length === 0 && (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: '#64748b', fontStyle: 'italic', fontSize: '0.85rem' }}>Ebben az időszakban még senki sem küldött be kvízt. Legyél te az első!</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── B: LOADING PANEL ── */}
      {phase === 'LOADING' && (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <VideoLoader />
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '15px' }}>Tranzakció biztosítása és kiértékelés...</p>
        </div>
      )}

      {/* ── C: AKTÍV JÁTÉKTÉR ── */}
      {phase === 'PLAYING' && parsedQuestion && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--border-main)' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 'bold' }}>📋 Kérdés: <span style={{ color: '#38bdf8' }}>{currentIdx + 1} / {questions.length}</span></span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: timeLeft <= 5 ? '#ef4444' : '#10b981', fontSize: '0.9rem', fontWeight: 'bold' }}><Timer size={14} /> <span>{timeLeft}s</span></div>
          </div>
          <div style={{ width: '100%', height: '4px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${(timeLeft / 20) * 100}%`, height: '100%', background: timeLeft <= 5 ? '#ef4444' : 'linear-gradient(90deg, #38bdf8, #10b981)' }} />
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '260px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={currentQuestion.image_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /></div>
            <div style={{ padding: '24px 20px' }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '1.2rem', fontWeight: '700' }}>{parsedQuestion.title}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {['A', 'B', 'C', 'D'].map((letter, i) => {
                  const optionText = parsedQuestion.opts[i];
                  if (!optionText) return null;
                  return (
                    <button key={letter} onClick={() => handleSelectOption(letter)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: '#0f172a50', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-body)', fontWeight: '600', cursor: 'pointer' }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '6px', background: '#1e293b', color: 'white', fontSize: '0.8rem', fontWeight: 'bold' }}>{letter}</span>
                      <span style={{ flex: 1, textAlign: 'left' }}>{optionText}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── D: JUTALOM ÉS SZAKMAI ELLENŐRZŐ PANEL ── */}
      {phase === 'SUMMARY' && rewardData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid #fbbf24', padding: '40px 30px', borderRadius: '12px', textAlign: 'center', boxShadow: '0px 10px 30px rgba(251,191,36,0.15)' }}>
            <Sparkles size={48} color="#fbbf24" style={{ margin: '0 auto 15px auto', display: 'block' }} />
            <h2 style={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: '900' }}>Gratulálunk, Kvíz Teljesítve!</h2>
            <div style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: '25px' }}>
              Elért eredményed: <strong style={{ color: '#38bdf8' }}>{rewardData.score} / 1000 pont</strong>
            </div>

            <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #fbbf2450', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '25px' }}>
              <span style={{ color: '#fbbf24', fontWeight: '900', fontSize: '1.4rem' }}>+{rewardData.pointsAwarded} Elkölthető Aréna Pont</span>
              <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold' }}>🟢 SIKERESEN JÓVÁÍRVA A JOKER CSERÉKHEZ!</span>
            </div>

            <button onClick={() => setPhase('INTRO')} style={{ width: '100%', maxWidth: '300px', margin: '0 auto', background: 'transparent', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Bezárás és Visszatérés</button>
          </div>

          {/* SZAKMAI KIÉRTÉKELŐ TUDÁSTÁR */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', padding: '30px', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#f1f5f9', fontSize: '1.2rem', fontWeight: '800', borderBottom: '1px solid var(--border-main)', paddingBottom: '12px' }}>🔍 Szakmai Értékelő & Hibajegyzék</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {questions.map((q, idx) => {
                const userAnsLetter = selectedAnswers[q.id] || '';
                const correctAnsLetter = correctAnswers[q.id] || 'A';
                const isCorrect = String(userAnsLetter).toUpperCase() === String(correctAnsLetter).toUpperCase();
                const rawOptions = lang === 'en' ? q.options_en : q.options_hu;
                const explanationText = lang === 'en' ? q.explanation_en : q.explanation_hu;

                return (
                  <div key={q.id} style={{ background: '#0f172a50', padding: '18px', borderRadius: '10px', border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}` }}>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      <div 
                        onClick={() => setLightboxImage(q.image_url)}
                        style={{ width: '60px', height: '60px', background: '#000', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, cursor: 'pointer', transition: 'transform 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        title="Kattints a nagyításhoz"
                      >
                        <img src={q.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 6px 0', color: '#f8fafc', fontSize: '0.92rem', fontWeight: '700' }}>{idx + 1}. {lang === 'en' ? q.question_en : q.question_hu}</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                          <span style={{ color: isCorrect ? '#10b981' : '#f87171', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                            {isCorrect ? <CheckCircle2 size={13} /> : <XCircle size={13} />} Te tipped: {getReadableOptionText(userAnsLetter, rawOptions)}
                          </span>
                          {!isCorrect && (
                            <span style={{ color: '#38bdf8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <AlertCircle size={13} /> Helyes megoldás: {getReadableOptionText(correctAnsLetter, rawOptions)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {explanationText && explanationText.trim() !== '' && (
                      <div style={{ marginTop: '14px', background: 'rgba(245,158,11,0.04)', borderLeft: '3px solid #f59e0b', padding: '10px 14px', borderRadius: '0 6px 6px 0', fontSize: '0.84rem', lineHeight: '1.5', color: '#cbd5e1' }}>
                        <div style={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: '4px', fontSize: '0.78rem', textTransform: 'uppercase' }}>💡 Szakmai háttér & Kontextus:</div>
                        {explanationText}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {phase === 'ALREADY_PLAYED' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid #ef4444', padding: '40px 30px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⏳</div>
          <h3 style={{ color: '#f87171', fontSize: '1.3rem', fontWeight: 'bold' }}>A mai kihívást már teljesítetted!</h3>
          <button onClick={() => setPhase('INTRO')} style={{ background: '#222f47', border: '1px solid var(--border-main)', color: 'white', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', marginTop: '15px' }}>Bezárás</button>
        </div>
      )}

      {/* NAGYÍTÁST VÉGZŐ LIGHTBOX MODAL OVERLAY */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, cursor: 'zoom-out' }}
        >
          <img src={lightboxImage} alt="Large preview" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
      )}

    </div>
  );
}
