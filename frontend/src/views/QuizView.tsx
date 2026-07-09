import React, { useState, useEffect, useMemo } from 'react';
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

export default function QuizView({ user }: { user: any }) {
  const { lang, t } = useLanguage();
  
  const [quizState, setQuizState] = useState<'intro' | 'loading' | 'playing' | 'ended' | 'already_played'>('intro');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  
  // Játékmenet tiszta állapotai
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20); 
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rewardData, setResultData] = useState<{ pointsAwarded: number; score: number } | null>(null);

  // 📡 1. JÁTÉK INDÍTÁSA
  const handleStartQuiz = async () => {
    setQuizState('loading');
    try {
      const res = await fetch(`${BACKEND_URL}/api/quiz/questions`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.alreadyPlayed) {
          setQuizState('already_played');
        } else {
          setQuestions(data.questions || []);
          setCurrentIdx(0);
          setScore(0);
          setTimeLeft(20);
          setSelectedOption(null);
          setIsAnswered(false);
          setQuizState('playing');
        }
      } else {
        alert("Nem sikerült elindítani a kvízt. Próbáld újra később!");
        setQuizState('intro');
      }
    } catch (e) {
      alert("Hálózati hiba történt.");
      setQuizState('intro');
    }
  };

  const currentQuestion = questions[currentIdx];

  // Adatvédelmi védőpajzs a kérdések parzolásához
  const parsedQuestion = useMemo(() => {
    if (!currentQuestion) return null;
    const title = lang === 'en' ? currentQuestion.question_en : currentQuestion.question_hu;
    let opts: string[] = ['A', 'B', 'C', 'D'];
    
    try {
      const rawOpts = lang === 'en' ? currentQuestion.options_en : currentQuestion.options_hu;
      if (typeof rawOpts === 'string') {
        opts = JSON.parse(rawOpts);
      } else if (Array.isArray(rawOpts)) {
        opts = rawOpts;
      }
    } catch (e) {
      console.error("JSON parzolási hiba", e);
    }

    if (!Array.isArray(opts) || opts.length === 0) {
      opts = ['A', 'B', 'C', 'D'];
    }

    return { title, opts, correct: currentQuestion.correct_option };
  }, [currentQuestion, lang]);

  // 🎯 2. ATOMBIZTOS ÖNÜTEMEZŐ IDŐZÍTŐ (Felszámolja a beragadást és a fagyást)
  useEffect(() => {
    if (quizState !== 'playing' || isAnswered) return;

    // Ha lejár az idő, automatikusan elsütjük az időtúllépést üres válasszal
    if (timeLeft <= 0) {
      handleOptionClick('');
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [quizState, isAnswered, timeLeft]);

  // 📡 3. JÁTÉK VÉGE: Eredmények beküldése
  const handleSubmitResults = async (finalScore: number) => {
    setQuizState('loading');
    setIsSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/quiz/submit`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          score: finalScore,
          userEmail: user?.email
        })
      });

      if (res.ok) {
        const data = await res.json();
        setResultData(data);
        setQuizState('ended');
      } else {
        alert("Hiba történt az eredmények beküldésekor.");
        setQuizState('intro');
      }
    } catch (e) {
      console.error(e);
      setQuizState('intro');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🎯 4. KÖZPONTI LÉPTETŐ MOTOR (Side-effect mentes, teljesen lineáris struktúra)
  const moveToNextQuestion = (currentCalculatedScore: number) => {
    const nextIndex = currentIdx + 1;
    if (nextIndex < questions.length) {
      setCurrentIdx(nextIndex);
      setSelectedOption(null);
      setIsAnswered(false);
      setTimeLeft(20);
    } else {
      handleSubmitResults(currentCalculatedScore);
    }
  };

  // 🎮 5. VÁLASZ KATTINTÁS KEZELŐ
  const handleOptionClick = (optionLetter: string) => {
    if (isAnswered) return;
    
    setIsAnswered(true);
    setSelectedOption(optionLetter);

    const isCorrect = optionLetter === parsedQuestion?.correct;
    const addedScore = isCorrect ? 100 : 0;
    const nextScore = score + addedScore;
    
    // Azonnal frissítjük a helyi pontszámot
    setScore(nextScore);

    // 1.5 másodpercig villogtatjuk a neon keretet, majd robogunk tovább
    setTimeout(() => {
      moveToNextQuestion(nextScore);
    }, 1500);
  };

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', boxSizing: 'border-box', padding: '10px' }}>
      
      {/* ── A: INTRO KÉPERNYŐ ── */}
      {quizState === 'intro' && (
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
          <button onClick={handleStartQuiz} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#0f172a', border: 'none', padding: '12px 32px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(245,158,11,0.3)', transition: 'all 0.15s' }}>
            {lang === 'en' ? 'Start Challenge 🚀' : 'Kihívás Indítása 🚀'}
          </button>
        </div>
      )}

      {/* ── B: TÖLTŐKÉPERNYŐ ── */}
      {quizState === 'loading' && (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <VideoLoader />
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '15px', animation: 'arenaPulse 2s infinite' }}>
            {lang === 'en' ? 'Synchronizing Quiz Engine...' : 'Kvízmotor szinkronizálása...'}
          </p>
        </div>
      )}

      {/* ── C: JÁTÉKTÉR ── */}
      {quizState === 'playing' && parsedQuestion && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--border-main)' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 'bold' }}>
              📋 {lang === 'en' ? 'Question' : 'Kérdés'}: <span style={{ color: '#38bdf8' }}>{currentIdx + 1} / {questions.length}</span>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontSize: '0.9rem', fontWeight: '700' }}>
              <Star size={14} fill="#fbbf24" /> <span>{score} pont</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: timeLeft <= 5 ? '#ef4444' : '#10b981', fontSize: '0.9rem', fontWeight: 'bold' }}>
              <Timer size={14} /> <span>{timeLeft}s</span>
            </div>
          </div>

          <div style={{ width: '100%', height: '4px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${(timeLeft / 20) * 100}%`, height: '100%', background: timeLeft <= 5 ? '#ef4444' : 'linear-gradient(90deg, #38bdf8, #10b981)', transition: 'width 0.1s linear' }} />
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

                  let btnBg = 'rgba(255,255,255,0.02)';
                  let btnBorder = 'var(--border-main)';
                  let textColor = 'var(--text-body)';

                  if (isAnswered) {
                    if (letter === parsedQuestion.correct) {
                      btnBg = 'rgba(16,185,129,0.12)';
                      btnBorder = '#10b981';
                      textColor = '#34d399';
                    } else if (letter === selectedOption) {
                      btnBg = 'rgba(239,68,68,0.12)';
                      btnBorder = '#ef4444';
                      textColor = '#f87171';
                    }
                  }

                  return (
                    <button
                      key={letter}
                      disabled={isAnswered}
                      onClick={() => handleOptionClick(letter)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: btnBg, border: `1px solid ${btnBorder}`, borderRadius: '8px', color: textColor, fontSize: '0.92rem', fontWeight: '600', cursor: isAnswered ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '6px', background: isAnswered && letter === parsedQuestion.correct ? '#10b981' : (isAnswered && letter === selectedOption ? '#ef4444' : '#1e293b'), color: 'white', fontSize: '0.8rem', fontWeight: 'bold' }}>
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

      {/* ── D: ÖSSZEGZŐ KÁRTYA ── */}
      {quizState === 'ended' && rewardData && (
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

          <button onClick={() => setQuizState('intro')} style={{ width: '100%', background: 'transparent', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.15s' }}>
            {lang === 'en' ? 'Close Panel' : 'Kvízpult Bezárása'}
          </button>
        </div>
      )}

      {/* ── E: CHEAT PROTECTION PANEL ── */}
      {quizState === 'already_played' && (
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
          <button onClick={() => setQuizState('intro')} style={{ background: '#222f47', border: '1px solid var(--border-main)', color: 'white', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            Vissza a pultra
          </button>
        </div>
      )}

    </div>
  );
}
