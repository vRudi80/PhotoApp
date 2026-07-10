import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BACKEND_URL } from '../utils/constants';
import VideoLoader from '../components/VideoLoader';
import { useLanguage } from '../context/LanguageContext';
import { Trophy, Star, Timer, Sparkles } from 'lucide-react';

const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('photoAppToken');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

// 🎯 MATEMATIKAI FÁZISOK ÁLLAPOTGÉPE
type QuizPhase = 'INTRO' | 'LOADING' | 'PLAYING' | 'SUMMARY' | 'ALREADY_PLAYED';

export default function QuizView({ user }: { user: any }) {
  const { lang, t } = useLanguage();
  
  const [phase, setPhase] = useState<QuizPhase>('INTRO');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  
  // Felhasználó által választott opciók gyűjtőtára: { [questionId]: 'A' }
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(20); 
  const [rewardData, setResultData] = useState<{ pointsAwarded: number; score: number } | null>(null);

  // ⏱️ UNIX IDŐBÉLYEG REFERENCIA HELYI REFRESH PAJZSNAK
  const targetEndTimeRef = useRef<number>(0);

  // 📡 JÁTÉK INDÍTÁSA
  const handleStartQuiz = async () => {
    setPhase('LOADING');
    try {
      const res = await fetch(`${BACKEND_URL}/api/quiz/questions`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.alreadyPlayed) {
          setPhase('ALREADY_PLAYED');
        } else {
          setQuestions(data.questions || []);
          setCurrentIdx(0);
          setSelectedAnswers({});
          
          // Beállítjuk a precíz lejárati időbélyeget: Jelenlegi pillanat + 20.5 másodperc puffer
          targetEndTimeRef.current = Date.now() + 20500;
          setTimeLeft(20);
          setPhase('PLAYING');
        }
      } else {
        alert("Nem sikerült elindítani a kvízt. Próbáld újra később!");
        setPhase('INTRO');
      }
    } catch (e) {
      alert("Hálózati hiba történt.");
      setPhase('INTRO');
    }
  };

  const currentQuestion = questions[currentIdx];

  // Biztonságos nyelvi kérdésparzer
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

  // 🎯 GOLYÓÁLLÓ IDŐBÉLYEG ALAPÚ VISSZASZÁMLÁLÓ (Kiküszöböli a háttér-fagyásokat)
  useEffect(() => {
    if (phase !== 'PLAYING') return;

    // Minden kérdésváltáskor élesítjük a céldátumot
    targetEndTimeRef.current = Date.now() + 20500;
    setTimeLeft(20);

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = targetEndTimeRef.current - now;
      const remaining = Math.max(0, Math.ceil(diff / 1000));
      
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        // Időtúllépés esetén üres stringet küldünk be válaszként automatikusan
        handleSelectOption('');
      }
    }, 250); // 4Hz-es mintavételezés a tökéletesen egyenletes működésért

    return () => clearInterval(interval);
  }, [phase, currentIdx]);

  // 📡 JÁTÉK LEZÁRÁSA ÉS SZERVEROLDALI KIÉRTÉKELÉS INDÍTÁSA
  const handleFinalSubmit = async (finalAnswers: Record<number, string>) => {
    setPhase('LOADING');
    try {
      const res = await fetch(`${BACKEND_URL}/api/quiz/submit`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          answers: finalAnswers,
          userEmail: user?.email || ''
        })
      });

      if (res.ok) {
        const data = await res.json();
        setResultData(data);
        setPhase('SUMMARY');
      } else {
        alert("Sikertelen beküldés.");
        setPhase('INTRO');
      }
    } catch (e) {
      setPhase('INTRO');
    }
  };

  // 🎮 AZONNALI, AKASZTÁSMENTES OPCIÓ-KIVÁLASZTÓ LÉPTETŐ
  const handleSelectOption = (letter: string) => {
    if (phase !== 'PLAYING' || isSubmitting) return;

    // Elmentjük a válaszát az aktuális kép ID-jéhez rendelve
    const nextAnswers = { ...selectedAnswers, [currentQuestion.id]: letter };
    setSelectedAnswers(nextAnswers);

    // Azonnali ugrás a következő kérdésre, nincsenek késleltető Timeoutok!
    const nextIndex = currentIdx + 1;
    if (nextIndex < questions.length) {
      setCurrentIdx(nextIndex);
    } else {
      // Ez volt az utolsó feladvány, indítjuk a szerveroldali biztonságos feldolgozást
      handleFinalSubmit(nextAnswers);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', boxSizing: 'border-box', padding: '10px' }}>
      
      {/* ── A: INTRO PANEL ── */}
      {phase === 'INTRO' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', padding: '40px 30px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
          <Trophy size={48} color="#f59e0b" style={{ margin: '0 auto 15px auto', display: 'block' }} />
          <h2 style={{ color: '#f8fafc', fontSize: '1.75rem', fontWeight: '800', margin: '0 0 10px 0' }}>
            {lang === 'en' ? 'LensMaster Daily Quiz' : 'LensMaster Napi Kvíz'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', maxWidth: '500px', margin: '0 auto 25px auto' }}>
            {lang === 'en' 
              ? 'Test your photography knowledge! 10 questions, 20 seconds each. Earn up to 50 Arena Points daily!' 
              : 'Tedd próbára a fotós és technikai tudásod! 10 kérdés, kérdésenként 20 másodperc. Gyűjts akár 50 Aréna pontot naponta!'}
          </p>
          <button onClick={handleStartQuiz} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#0f172a', border: 'none', padding: '12px 32px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(245,158,11,0.3)' }}>
            {lang === 'en' ? 'Start Challenge 🚀' : 'Kihívás Indítása 🚀'}
          </button>
        </div>
      )}

      {/* ── B: LOADING PANEL ── */}
      {phase === 'LOADING' && (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <VideoLoader />
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '15px', animation: 'arenaPulse 2s infinite' }}>
            {lang === 'en' ? 'Analyzing Submissions Secrely...' : 'Biztonságos kiértékelés folyamatban...'}
          </p>
        </div>
      )}

      {/* ── C: AKTÍV JÁTÉKTÉR ── */}
      {phase === 'PLAYING' && parsedQuestion && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--border-main)' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 'bold' }}>
              📋 {lang === 'en' ? 'Question' : 'Kérdés'}: <span style={{ color: '#38bdf8' }}>{currentIdx + 1} / {questions.length}</span>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: timeLeft <= 5 ? '#ef4444' : '#10b981', fontSize: '0.9rem', fontWeight: 'bold' }}>
              <Timer size={14} /> <span>{timeLeft}s</span>
            </div>
          </div>

          <div style={{ width: '100%', height: '4px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${(timeLeft / 20) * 100}%`, height: '100%', background: timeLeft <= 5 ? '#ef4444' : 'linear-gradient(90deg, #38bdf8, #10b981)', transition: 'width 0.25s linear' }} />
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '260px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border-main)' }}>
              <img 
                src={currentQuestion.image_url} 
                alt="Quiz illustration" 
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' fill='%230f172a'><rect width='100%' height='100%'/><text x='50%' y='50%' fill='%23334155' font-family='sans-serif' font-size='14' text-anchor='middle'>📸 PhotAwesome Arena Quiz</text></svg>`;
                }}
              />
            </div>
            
            <div style={{ padding: '24px 20px' }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '1.2rem', fontWeight: '700', lineHeight: '1.4' }}>
                {parsedQuestion.title}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {['A', 'B', 'C', 'D'].map((letter, i) => {
                  const optionText = parsedQuestion.opts[i];
                  if (!optionText) return null;

                  return (
                    <button
                      key={letter}
                      onClick={() => handleSelectOption(letter)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: '#0f172a50', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-body)', fontSize: '0.92rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.1s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.background = 'rgba(56,189,248,0.02)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-main)'; e.currentTarget.style.background = '#0f172a50'; }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '6px', background: '#1e293b', color: 'white', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {letter}
                      </span>
                      <span style={{ flex: 1, textAlign: 'left' }}>{optionText}</span>
                    </button>
                  );
                })}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── D: JUTALOMÖSSZEGZŐ SUMMARY PANEL ── */}
      {phase === 'SUMMARY' && rewardData && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid #fbbf24', padding: '40px 30px', borderRadius: '12px', textAlign: 'center', boxShadow: '0px 10px 30px rgba(251,191,36,0.15)' }}>
          <Sparkles size={48} color="#fbbf24" style={{ margin: '0 auto 15px auto', display: 'block' }} />
          <h2 style={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: '900', margin: '0 0 5px 0' }}>
            {lang === 'en' ? 'Quiz Completed!' : 'Gratulálunk, Kvíz Teljesítve!'}
          </h2>
          <div style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: '25px' }}>
            {lang === 'en' ? 'Your Score' : 'Elért eredményed'}: <strong style={{ color: '#38bdf8' }}>{rewardData.score} / 1000 pont</strong>
          </div>

          <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
            <div style={{ background: 'rgba(251,191,36,0.1)', padding: '8px', borderRadius: '50%' }}>🪙</div>
            <div style={{ textAlign: 'left' }}>
              <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '1.1rem', display: 'block' }}>+{rewardData.pointsAwarded} Pont</span>
              <small style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 'bold' }}>JÓVÁÍRVA AZ EGYENLEGEDEN</small>
            </div>
          </div>

          <button onClick={() => setPhase('INTRO')} style={{ width: '100%', background: 'transparent', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            {lang === 'en' ? 'Close Panel' : 'Kvízpult Bezárása'}
          </button>
        </div>
      )}

      {/* ── E: CHEAT PROTECTION KAPU ── */}
      {phase === 'ALREADY_PLAYED' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid #ef4444', padding: '40px 30px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 10px 25px rgba(239,68,68,0.1)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⏳</div>
          <h3 style={{ color: '#f87171', fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 10px 0' }}>
            {lang === 'en' ? 'Challenge Already Completed' : 'A mai kihívást már teljesítetted!'}
          </h3>
          <p style={{ color: 'var(--text-body)', fontSize: '0.88rem', lineHeight: '1.5', maxWidth: '450px', margin: '0 auto 20px auto' }}>
            {lang === 'en' 
              ? 'To keep the competition fair, the LensMaster Quiz can only be played once a day for points. Come back tomorrow for a fresh set of questions!' 
              : 'A verseny tisztaságának megőrzése érdekében a napi kvízt naponta csak egyszer játszhatod le pontokért. Várunk vissza holnap egy teljesen friss kérdéscsomaggal!'}
          </p>
          <button onClick={() => setPhase('INTRO')} style={{ background: '#222f47', border: '1px solid var(--border-main)', color: 'white', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            Vissza a pultra
          </button>
        </div>
      )}

    </div>
  );
}
