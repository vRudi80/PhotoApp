import React, { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL } from '../utils/constants';
import VideoLoader from '../components/VideoLoader';
import { useLanguage } from '../context/LanguageContext';
import { Trophy, Star, Timer, Sparkles, CheckCircle2, XCircle, AlertCircle, HelpCircle, History, Calendar, ShoppingCart, Ticket } from 'lucide-react';

const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('photoAppToken');
  return { ...(token ? { 'Authorization': `Bearer ${token}` } : {}), ...extraHeaders };
};

type QuizPhase = 'INTRO' | 'LOADING' | 'PLAYING' | 'SUMMARY' | 'ALREADY_PLAYED';

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

  const currentQuestion = questions[currentIdx];

  // Szinkronizáljuk az összes adatot a belépő pultnál
  const fetchMyHistory = async () => {
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

  useEffect(() => {
    if (phase === 'INTRO') {
      fetchMyHistory();
    }
  }, [phase]);

  // IDŐZÍTŐ MOTOR
  useEffect(() => {
    if (phase !== 'PLAYING' || !currentQuestion) return;
    const timerKey = `photo_quiz_target_${currentQuestion.id}`;
    let targetTime = Number(sessionStorage.getItem(timerKey));
    if (!targetTime) { targetTime = Date.now() + 20500; sessionStorage.setItem(timerKey, String(targetTime)); }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((targetTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) { clearInterval(interval); sessionStorage.removeItem(timerKey); handleSelectOption(''); }
    }, 250);
    return () => clearInterval(interval);
  }, [phase, currentIdx, currentQuestion?.id]);

  // KUPON VÁSÁRLÁSA 5 PONTÉRT
  const handleBuyToken = async () => {
    if (isBuying) return;
    setIsBuying(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/quiz/buy-token`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setQuizBalance(data.newQuizBalance);
        alert("🎉 Sikeres vásárlás! 1 db Extra Kvíz Kupon hozzáadva a tárcádhoz.");
      } else {
        const err = await res.json();
        alert(`❌ Sikertelen vásárlás: ${err.error || 'Nincs elég pontod.'}`);
      }
    } catch (e) {
      alert("Hálózati hiba történt.");
    } finally {
      setIsBuying(false);
    }
  };

  const handleStartQuiz = async () => {
    setPhase('LOADING');
    try {
      const res = await fetch(`${BACKEND_URL}/api/quiz/questions`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.alreadyPlayed) { 
          setPhase('ALREADY_PLAYED'); 
        } else {
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
    if (currentQuestion) sessionStorage.removeItem(`photo_quiz_target_${currentQuestion.id}`);
    
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
      
      {/* ── A: INTRO PANEL + SMART KUPON RENDSZER ── */}
      {phase === 'INTRO' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', padding: '40px 30px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <Trophy size={48} color="#f59e0b" style={{ margin: '0 auto 15px auto', display: 'block' }} />
            <h2 style={{ color: '#f8fafc', fontSize: '1.75rem', fontWeight: '800', margin: '0 0 10px 0' }}>{lang === 'en' ? 'LensMaster Daily Quiz' : 'LensMaster Napi Kvíz'}</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '20px' }}>
              {lang === 'en' ? 'Test your photography knowledge! Earn up to 50 spendable Arena Points daily!' : 'Tedd próbára a fotós tudásod és gyűjts akár 50 elkölthető Aréna pontot naponta!'}
            </p>

            {/* Vizuális Kupon pult információk */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
              <span style={{ padding: '6px 14px', borderRadius: '20px', background: alreadyPlayedToday ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', color: alreadyPlayedToday ? '#f87171' : '#34d399', fontSize: '0.85rem', fontWeight: 'bold', border: alreadyPlayedToday ? '1px solid #ef444430' : '1px solid #10b98130' }}>
                {alreadyPlayedToday ? (lang === 'en' ? 'Free daily: Claimed ❌' : 'Mai ingyenes kör: Felhasználva ❌') : (lang === 'en' ? 'Free daily: Available  🟢' : 'Mai ingyenes kör: Elérhető 🟢')}
              </span>
              <span style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(245,158,11,0.08)', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid #f59e0b30', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Ticket size={14} /> {lang === 'en' ? `Extra Coupons: ${quizBalance} db` : `Ráadás Kuponjaid: ${quizBalance} db`}
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', smDirection: 'row', justifyContent: 'center', gap: '12px', maxWidth: '500px', margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: historyList.length > 0 ? '1fr 1.2fr' : '1fr', gap: '12px', width: '100%' }}>
                {historyList.length > 0 && (
                  <button onClick={() => setShowHistory(!showHistory)} style={{ background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <History size={16} /> {showHistory ? (lang === 'en' ? 'Hide Log' : 'Napló bezárása') : (lang === 'en' ? 'My History' : 'Kvíznaplóm')}
                  </button>
                )}
                
                {/* Dinamikus indító-vásárló gomb */}
                {alreadyPlayedToday && quizBalance === 0 ? (
                  <button onClick={handleBuyToken} disabled={isBuying} style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 15px rgba(37,99,235,0.2)' }}>
                    <ShoppingCart size={16} /> {isBuying ? 'Vásárlás... ⏳' : (lang === 'en' ? 'Buy Kupon (5p) 🪙' : 'Kupon vásárlása (5 pont) 🪙')}
                  </button>
                ) : (
                  <button onClick={handleStartQuiz} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(245,158,11,0.2)' }}>
                    {alreadyPlayedToday ? (lang === 'en' ? 'Play Extra Round 🚀' : 'Ráadás kör indítása 🚀') : (lang === 'en' ? 'Start Free Quiz 🚀' : 'Kihívás Indítása 🚀')}
                  </button>
                )}
              </div>

              {alreadyPlayedToday && quizBalance > 0 && (
                <button onClick={handleBuyToken} disabled={isBuying} style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #334155', padding: '10px', borderRadius: '8px', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', marginTop: '5px' }}>
                  ➕ {lang === 'en' ? 'Buy another Coupon (+1 Kupon / 5p)' : 'További Kupon vásárlása (+1 Kupon / 5 pont)'}
                </button>
              )}
            </div>
          </div>

          {/* SAJÁT HISTÓRIA TÁBLÁZAT */}
          {showHistory && historyList.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', padding: '25px', borderRadius: '12px' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#f1f5f9', fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} color="#38bdf8" /> {lang === 'en' ? 'Your Quiz Log' : 'Saját Kvíz Teljesítmény-Napló'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {historyList.map(item => (
                  <div key={item.id} style={{ background: '#0f172a50', border: '1px solid var(--border-main)', padding: '14px 18px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                      <Calendar size={14} color="#64748b" /> <span>{item.date?.split(' ')[0]}</span>
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
        </div>
      )}

      {/* ── B: LOADING PANEL ── */}
      {phase === 'LOADING' && (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <VideoLoader />
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '15px' }}>{lang === 'en' ? 'Securing transaction...' : 'Tranzakció biztosítása és kiértékelés...'}</p>
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
            <h2 style={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: '900' }}>{lang === 'en' ? 'Quiz Completed!' : 'Gratulálunk, Kvíz Teljesítve!'}</h2>
            <div style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: '25px' }}>
              {lang === 'en' ? 'Your Score' : 'Elért eredményed'}: <strong style={{ color: '#38bdf8' }}>{rewardData.score} / 1000 pont</strong>
            </div>

            <div style={{ background: '#0f172a', border: '1px solid var(--border-main)', borderRadius: '10px', padding: '18px', maxWidth: '500px', margin: '0 auto 25px auto', textAlign: 'left', fontSize: '0.88rem', lineHeight: '1.6' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#38bdf8', fontWeight: '800', textTransform: 'uppercase', fontSize: '0.78rem' }}>📊 Eredményed részletes összetétele:</h4>
              <div style={{ color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🎯 Találati arány:</span><strong style={{ color: '#10b981' }}>{rewardData.score / 100} / {questions.length} helyes</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>✨ Kvíz alappontszám:</span><strong style={{ color: '#f8fafc' }}>{rewardData.score} pont</strong></div>
                <div style={{ width: '100%', height: '1px', background: '#334155', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fbbf24', fontSize: '1rem', fontWeight: 'bold' }}>
                  <span>🪙 Levásárolható jutalom:</span><span>+{rewardData.pointsAwarded}p</span>
                </div>
              </div>
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
