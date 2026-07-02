import React, { useState, useEffect, useRef } from 'react';
import BattlePlanner from './BattlePlanner';
import { BACKEND_URL } from '../../../utils/constants';

// Behozzuk a nyelvi kontextust
import { useLanguage } from '../../../context/LanguageContext';

// Professzionális Lucide ikonok importálása az AI-sallangok ellen
import { 
  Calendar, 
  Clock, 
  User, 
  Hourglass, 
  Plus, 
  X, 
  AlertCircle, 
  CalendarClock,
  Flame,
  Zap,
  CheckCircle2
} from 'lucide-react';

// 🕒 1. ÖNÁLLÓ, ULTRASTABIL DOM-ALAPÚ VISSZASZÁMLÁLÓ (🎯 JAVÍTVA: Hatókörök és változók szinkronizálva)
function UpcomingCountdown({ startDate, lang, t }: { startDate: string; lang: string; t: any }) {
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!startDate) return;
    const standardized = String(startDate).replace(' ', 'T').split('.')[0];
    const targetMillis = new Date(standardized).getTime();

    const updateTextDirectly = () => {
      if (!elementRef.current) return;

      const now = new Date().getTime();
      const difference = targetMillis - now;

      if (difference <= 0) {
        elementRef.current.innerText = lang === 'en' ? 'Starting soon...' : 'Azonnal indul...';
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      if (lang === 'en') {
        elementRef.current.innerText = days > 0 
          ? `${days}d ${hours}h ${minutes}m ${seconds}s` 
          : `${hours}h ${minutes}m ${seconds}s`;
      } else {
        elementRef.current.innerText = days > 0 
          ? `${days}n ${hours}ó ${minutes}p ${seconds}mp` 
          : `${hours}ó ${minutes}p ${seconds}mp`;
      }
    };

    updateTextDirectly();
    const interval = setInterval(updateTextDirectly, 1000);

    return () => clearInterval(interval);
  }, [startDate, lang]);

  return (
    <div style={{ 
      width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
      background: 'rgba(56,189,248,0.04)', padding: '10px 12px', borderRadius: '4px', 
      border: '1px solid rgba(56,189,248,0.15)', boxSizing: 'border-box'
    }}>
      <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 'bold', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px', textTransform: 'uppercase' }}>
        <Clock size={12} /> {t ? t('roomTimeLeftLabel') : 'INDULÁS:'}
      </span>
      <span ref={elementRef} style={{ color: '#fff', fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 'bold' }}>---</span>
    </div>
  );
}

interface UpcomingChallengesProps {
  upcomingTopics: any[];
  getTopicType: (startDate: string, endDate: string) => 'daily' | 'weekly';
  handleImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  user: any;
}

// ⚡ 2. FŐKOMPONENS
export default function UpcomingChallenges({
  upcomingTopics,
  getTopicType,
  handleImageError,
  user
}: UpcomingChallengesProps) {
  const { t, lang } = useLanguage();
  const [showPlanner, setShowPlanner] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);

  const safeUpcomingTopics = Array.isArray(upcomingTopics) ? upcomingTopics : [];

  const formatDateTime = (dateString: string) => {
    const standardized = String(dateString).replace(' ', 'T').split('.')[0];
    const d = new Date(standardized);
    const currentLocale = lang === 'en' ? 'en-US' : 'hu-HU';
    return {
      date: d.toLocaleDateString(currentLocale, { year: 'numeric', month: 'short', day: 'numeric' }),
      time: d.toLocaleTimeString(currentLocale, { hour: '2-digit', minute: '2-digit' })
    };
  };

  const handleApplyMaster = async (topicId: number) => {
    if (!user?.email) return alert(t('msgLoginRequired'));
    if (!window.confirm(t('msgApplyConfirm'))) return;

    setApplyingId(topicId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/apply-master`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, userEmail: user.email })
      });

      if (res.ok) {
        alert(t('msgApplySuccess'));
        window.location.reload(); 
      } else {
        const err = await res.json();
        alert(err.error || t('msgProposalError'));
      }
    } catch (e) {
      alert(t('msgNetworkError'));
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 🧭 TOP IRÁNYÍTÓ SÁV */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#131b2e', padding: '16px 20px', borderRadius: '8px', border: '1px solid #222f47', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ color: 'white', margin: 0, fontSize: '1.1rem', fontWeight: '600', letterSpacing: '-0.2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarClock size={16} color="#fbbf24" /> {t('upTitle')}
          </h3>
          <p style={{ color: '#64748b', margin: '3px 0 0 0', fontSize: '0.82rem' }}>
            {t('upDesc')}
          </p>
        </div>
        
        <button
          onClick={() => setShowPlanner(!showPlanner)}
          style={{ padding: '8px 16px', borderRadius: '4px', border: showPlanner ? '1px solid #ef4444' : '1px solid #222f47', background: showPlanner ? 'rgba(239,68,68,0.05)' : '#f97316', color: showPlanner ? '#f87171' : 'white', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.15s ease', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          {showPlanner ? <X size={14} /> : <Plus size={14} />}
          {showPlanner ? t('upClosePlanner') : t('upOpenPlanner')}
        </button>
      </div>

      {/* 🛠️ LENYÍLÓ CSATATERVEZŐ PANEL */}
      {showPlanner && (
        <div style={{ animation: 'fadeIn 0.3s ease-out', borderBottom: '1px dashed #222f47', paddingBottom: '20px' }}>
          <BattlePlanner user={user} onSuccess={() => setShowPlanner(false)} />
        </div>
      )}

      {/* 📜 KÖZELGŐ CSATÁK RÁCSRENDSZERE */}
      <div>
        {safeUpcomingTopics.length === 0 ? (
          <div style={{ color: '#475569', textAlign: 'center', padding: '50px 20px', background: '#131b2e', borderRadius: '8px', border: '1px solid #222f47', fontSize: '0.85rem', fontStyle: 'italic' }}>
            {t('upEmpty')}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
            {safeUpcomingTopics.map(tData => {
              const isDaily = getTopicType(tData.start_date, tData.end_date) === 'daily';
              const hasMaster = tData.master_name || tData.master_email;
              const isPendingMe = tData.pending_master_email === user?.email;
              
              const startFormat = formatDateTime(tData.start_date);
              const endFormat = formatDateTime(tData.end_date);

              const displayTitle = lang === 'en' && tData.title_en ? tData.title_en : tData.title;
              const displayDesc = lang === 'en' && tData.description_en ? tData.description_en : tData.description;

              return (
                <div key={tData.id} style={{ background: '#131b2e', padding: '20px', borderRadius: '8px', border: '1px solid #222f47', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', justifyContent: 'space-between' }} className="upcoming-challenge-card">
                  <div>
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ background: isDaily ? 'rgba(239,68,68,0.08)' : 'rgba(56,189,248,0.08)', color: isDaily ? '#f87171' : '#38bdf8', border: `1px solid ${isDaily ? 'rgba(239,68,68,0.2)' : 'rgba(56,189,248,0.2)'}`, padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 'bold' }}>
                        {isDaily ? t('upDaily') : t('upWeekly')}
                      </span>
                    </div>
                  
                    {tData.cover_url && (
                      <div style={{ width: '100%', height: '140px', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px', border: '1px solid #222f47', backgroundColor: '#090d16' }}>
                        <img src={tData.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleImageError} />
                      </div>
                    )}

                    {tData.cover_author && (
                      <div style={{ color: '#475569', fontSize: '0.72rem', fontStyle: 'italic', marginTop: '-8px', marginBottom: '12px', textAlign: 'right', paddingRight: '2px' }}>
                        {t('upCoverAuthor')}{tData.cover_author}
                      </div>
                    )}

                    <h4 style={{ color: '#fbbf24', margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: '600', letterSpacing: '-0.2px' }}>{displayTitle}</h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 16px 0', lineHeight: '1.45' }}>{displayDesc}</p>
                  </div>
                  
                  <div>
                    {/* CSATABÍRÓ / KÉPMESTER STATUS BLOKK */}
                    {hasMaster ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#a78bfa', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(167,139,250,0.06)', padding: '5px 10px', borderRadius: '4px', border: '1px solid rgba(167,139,250,0.15)', marginBottom: '12px', width: 'fit-content' }}>
                        <User size={12} />
                        <span>{t('upMaster')}</span>
                        <span style={{ color: '#e9d5ff' }}>{tData.master_name || tData.master_email}</span>
                      </div>
                    ) : tData.pending_master_email ? (
                      <div style={{ background: isPendingMe ? 'rgba(234,179,8,0.06)' : 'rgba(34,47,71,0.2)', border: `1px solid ${isPendingMe ? 'rgba(234,179,8,0.2)' : '#222f47'}`, color: isPendingMe ? '#eab308' : '#64748b', padding: '8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        {isPendingMe ? <Zap size={12} /> : <Hourglass size={12} />}
                        {isPendingMe ? t('upPendingMe') : t('upPendingOther')}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApplyMaster(tData.id)}
                        disabled={applyingId === tData.id}
                        style={{ width: '100%', padding: '8px', background: 'transparent', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.82rem', cursor: 'pointer', marginBottom: '12px', transition: 'all 0.15s ease', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        className="upcoming-apply-btn"
                      >
                        <CheckCircle2 size={12} />
                        {applyingId === tData.id ? t('upProcessing') : t('upApplyBtn')}
                      </button>
                    )}

                    {/* 🕒 IDŐZÍTŐ PANEL */}
                    <div style={{ background: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #222f47', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      
                      {/* Visszaszámláló – 🎯 JAVÍTVA: Átadva a hiányzó t fordító függvény! */}
                      <UpcomingCountdown startDate={tData.start_date} lang={lang} t={t} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                        <span style={{ color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>{t('upStart')}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#cbd5e1', fontWeight: '600' }}>{startFormat.date}</span>
                          <span style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', padding: '1px 5px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{startFormat.time}</span>
                        </div>
                      </div>
                      
                      <div style={{ height: '1px', background: '#222f47', width: '100%' }}></div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                        <span style={{ color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>{t('upEnd')}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>{endFormat.date}</span>
                          <span style={{ background: 'rgba(239,68,68,0.06)', color: '#f87171', padding: '1px 5px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{endFormat.time}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .upcoming-challenge-card:hover {
          border-color: #475569 !important;
          transform: translateY(-2px);
          transition: all 0.2s ease-in-out;
        }
        .upcoming-apply-btn:hover {
          background: rgba(16, 185, 129, 0.04) !important;
          border-color: #10b981 !important;
        }
      `}</style>
    </div>
  );
}
