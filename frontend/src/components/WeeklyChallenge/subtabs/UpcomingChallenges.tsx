import React, { useState, useEffect } from 'react';
import BattlePlanner from './BattlePlanner';
import { BACKEND_URL } from '../../../utils/constants';

// 🎯 ÚJ IMPORT: Behozzuk a nyelvi kontextust
import { useLanguage } from '../../../context/LanguageContext';

interface UpcomingChallengesProps {
  upcomingTopics: any[];
  getTopicType: (startDate: string, endDate: string) => 'daily' | 'weekly';
  handleImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  user: any;
}

export default function UpcomingChallenges({
  upcomingTopics,
  getTopicType,
  handleImageError,
  user
}: UpcomingChallengesProps) {
  const { t, lang } = useLanguage();

  const [showPlanner, setShowPlanner] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);

  // 🕒 1. GOLYÓÁLLÓ KÖZÖS ÉLŐ IDŐBÉLYEG (A főkomponens szintjén, így sosem fagy meg)
  const [currentNow, setCurrentNow] = useState(new Date().getTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentNow(new Date().getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const safeUpcomingTopics = Array.isArray(upcomingTopics) ? upcomingTopics : [];

  // 🕒 2. IDŐZÓNA-BIZTOS HELYI IDŐ PARSER (A felhasználó helyi idejéhez igazítja a DB stringet)
  const parseToLocalMillis = (dateStr: string): number => {
    if (!dateStr) return 0;
    // Standardizáljuk a formátumot a böngészők számára (szóköz -> T csere)
    const standardized = String(dateStr).replace(' ', 'T').split('.')[0];
    return new Date(standardized).getTime();
  };

  // 🕒 3. VISSZASZÁMLÁLÓ SZÖVEG GENERÁTOR
  const getCountdownText = (startDateStr: string) => {
    const targetMillis = parseToLocalMillis(startDateStr);
    const difference = targetMillis - currentNow;

    if (difference <= 0) {
      return lang === 'en' ? 'Started! ⚔️' : 'Elindult! ⚔️';
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    if (lang === 'en') {
      return days > 0 
        ? `${days}d ${hours}h ${minutes}m ${seconds}s` 
        : `${hours}h ${minutes}m ${seconds}s`;
    } else {
      return days > 0 
        ? `${days}n ${hours}ó ${minutes}p ${seconds}mp` 
        : `${hours}ó ${minutes}p ${seconds}mp`;
    }
  };

  const formatDateTime = (dateString: string) => {
    const localMillis = parseToLocalMillis(dateString);
    const d = new Date(localMillis);
    const currentLocale = lang === 'en' ? 'en-US' : 'hu-HU';
    return {
      // JAVÍTVA: Kivettük a timeZone: 'UTC' kényszerítést, így tökéletes a szinkron a számlálóval!
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
    <div style={{ animation: 'fadeIn 0.4s ease-out', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* 🧭 TOP IRÁNYÍTÓ SÁV */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#10b98105', padding: '15px 20px', borderRadius: '16px', border: '1px dashed #334155', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h3 style={{ color: 'white', margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
            {t('upTitle')}
          </h3>
          <p style={{ color: '#64748b', margin: '2px 0 0 0', fontSize: '0.85rem' }}>
            {t('upDesc')}
          </p>
        </div>
        
        <button
          onClick={() => setShowPlanner(!showPlanner)}
          style={{ padding: '10px 20px', borderRadius: '10px', border: showPlanner ? '1px solid #ef4444' : '1px solid #f59e0b', background: showPlanner ? '#ef444420' : 'linear-gradient(135deg, #f59e0b, #d97706)', color: showPlanner ? '#f87171' : '#0f172a', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: showPlanner ? 'none' : '0 4px 12px rgba(245,158,11,0.2)' }}
        >
          {showPlanner ? t('upClosePlanner') : t('upOpenPlanner')}
        </button>
      </div>

      {/* 🛠️ LENYÍLÓ CSATATERVEZŐ PANEL */}
      {showPlanner && (
        <div style={{ animation: 'fadeIn 0.3s ease-out', borderBottom: '1px dashed #334155', paddingBottom: '30px' }}>
          <BattlePlanner user={user} onSuccess={() => setShowPlanner(false)} />
        </div>
      )}

      {/* 📜 KÖZELGŐ CSATÁK RÁCSRENDSZERE */}
      <div>
        {safeUpcomingTopics.length === 0 ? (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: '60px', background: '#1e293b', borderRadius: '24px', border: '1px solid #334155' }}>
            {t('upEmpty')}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
            {safeUpcomingTopics.map(tData => {
              const isDaily = getTopicType(tData.start_date, tData.end_date) === 'daily';
              const hasMaster = tData.master_name || tData.master_email;
              const isPendingMe = tData.pending_master_email === user?.email;
              
              const startFormat = formatDateTime(tData.start_date);
              const endFormat = formatDateTime(tData.end_date);

              const displayTitle = lang === 'en' && tData.title_en ? tData.title_en : tData.title;
              const displayDesc = lang === 'en' && tData.description_en ? tData.description_en : tData.description;

              return (
                <div key={tData.id} style={{ background: 'linear-gradient(180deg, #1e293b, #0f172a)', padding: '25px', borderRadius: '24px', border: '1px solid #475569', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 20px rgba(0,0,0,0.2)', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ background: isDaily ? '#ef444420' : '#3b82f620', color: isDaily ? '#f87171' : '#60a5fa', border: `1px solid ${isDaily ? '#ef444450' : '#3b82f650'}`, padding: '4px 12px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {isDaily ? t('upDaily') : t('upWeekly')}
                      </span>
                    </div>
                  
                    {tData.cover_url && (
                      <div style={{ width: '100%', height: '150px', borderRadius: '14px', overflow: 'hidden', marginBottom: '15px', border: '1px solid #334155', position: 'relative', backgroundColor: '#090d16' }}>
                        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${tData.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(12px) brightness(0.5)', transform: 'scale(1.1)' }}></div>
                        <img src={tData.cover_url} alt="" style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', zIndex: 1 }} onError={handleImageError} />
                      </div>
                    )}

                    {tData.cover_author && (
                      <div style={{ color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic', marginTop: '-10px', marginBottom: '15px', textAlign: 'right', paddingRight: '5px' }}>
                        {t('upCoverAuthor')}{tData.cover_author}
                      </div>
                    )}

                    <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '1.4rem', fontWeight: 'bold' }}>{displayTitle}</h4>
                    <p style={{ color: '#cbd5e1', fontSize: '0.95rem', margin: '0 0 20px 0', lineHeight: '1.6' }}>{displayDesc}</p>
                  </div>
                  
                  <div>
                    {/* 👤 JELENLEGI CSATABÍRÓ INFÓ VAGY AKCIÓGOMBOK */}
                    {hasMaster ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a78bfa', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '15px', background: '#a78bfa10', padding: '8px 14px', borderRadius: '10px', border: '1px solid #a78bfa20', width: 'fit-content' }}>
                        <span>{t('upMaster')}</span>
                        <span style={{ color: '#e9d5ff', fontWeight: 'bold' }}>{tData.master_name || tData.master_email}</span>
                      </div>
                    ) : tData.pending_master_email ? (
                      <div style={{ background: isPendingMe ? '#eab30815' : '#33415540', border: `1px solid ${isPendingMe ? '#eab30840' : '#475569'}`, color: isPendingMe ? '#f59e0b' : '#94a3b8', padding: '10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '15px' }}>
                        {isPendingMe ? t('upPendingMe') : t('upPendingOther')}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApplyMaster(tData.id)}
                        disabled={applyingId === tData.id}
                        style={{ width: '100%', padding: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', marginBottom: '15px', transition: 'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)'}
                      >
                        {applyingId === tData.id ? t('upProcessing') : t('upApplyBtn')}
                      </button>
                    )}

                    {/* 🕒 IDŐZÍTŐ PANEL INTEGRÁLT UTC VISSZASZÁMLÁLÓVAL */}
                    <div style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      
                      {/* ⏳ JAVÍTVA: Most már garantáltan folyékonyan pörög vissza, és tűpontos a matek! */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: '#f59e0b10', 
                        padding: '10px 14px', 
                        borderRadius: '10px', 
                        border: '1px solid #f59e0b30',
                        marginBottom: '10px'
                      }}>
                        <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                          {lang === 'en' ? '⏳ STARTS IN:' : '⏳ KEZDÉSIG:'}
                        </span>
                        <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '1rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                          {getCountdownText(tData.start_date)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{t('upStart')}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#38bdf8', fontSize: '0.9rem', fontWeight: 'bold' }}>{startFormat.date}</span>
                          <span style={{ background: '#38bdf820', color: '#38bdf8', padding: '2px 6px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '900' }}>{startFormat.time}</span>
                        </div>
                      </div>
                      
                      <div style={{ height: '1px', background: '#1e293b', width: '100%' }}></div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{t('upEnd')}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#f87171' }}>{endFormat.date}</span>
                          <span style={{ background: '#ef444420', color: '#f87171', padding: '2px 6px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '900' }}>{endFormat.time}</span>
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

    </div>
  );
}
