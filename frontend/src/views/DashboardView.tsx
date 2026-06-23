import React, { useState, useEffect } from 'react';
import { BACKEND_URL, ADMIN_EMAIL } from '../utils/constants';

// Nyelvi kontextus betöltése
import { useLanguage } from '../context/LanguageContext';

interface DashboardViewProps {
  user: any;
  isLeader: boolean;
  setActiveTab: (tab: string) => void;
  setTargetMapSpotId?: (id: number | null) => void;
}

export default function DashboardView({ user, isLeader, setActiveTab, setTargetMapSpotId }: DashboardViewProps) {
  const [alerts, setAlerts] = useState<any>(null);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const { t, lang } = useLanguage();

  // 1. Mentett értesítések betöltése memory-ból
  useEffect(() => {
    const stored = localStorage.getItem('dismissed_alerts');
    if (stored) setDismissedAlerts(JSON.parse(stored));
  }, []);

  // 2. Adatok szinkronizálása
  useEffect(() => {
    let isMounted = true;
    const fetchAlerts = async () => {
      setIsLoadingAlerts(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/dashboard-alerts?userEmail=${user.email}`);
        if (res.ok && isMounted) {
          setAlerts(await res.json());
        } else if (isMounted) {
          setAlerts(null);
        }
      } catch (e) {
        console.error("Hiba az értesítések lekérésekor", e);
        if (isMounted) setAlerts(null);
      } finally {
        if (isMounted) setIsLoadingAlerts(false);
      }
    };

    if (user?.email) fetchAlerts();
    return () => { isMounted = false; };
  }, [user?.email]);

  const handleDismissAlert = (e: React.MouseEvent, alertKey: string, type?: string, id?: number) => {
    e.stopPropagation(); // Megakadályozzuk, hogy a kártyára kattintás is lefusson
    const updated = [...dismissedAlerts, alertKey];
    setDismissedAlerts(updated);
    localStorage.setItem('dismissed_alerts', JSON.stringify(updated));

    if (type === 'map_comment' && id) {
      fetch(`${BACKEND_URL}/api/locations/comments/${id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email })
      }).catch(err => console.error(err));
    }
  };

  const handleNewsClick = (newsId: number) => {
    const alertKey = `news_${newsId}`;
    handleDismissAlert({ stopPropagation: () => {} } as any, alertKey);
    fetch(`${BACKEND_URL}/api/news/${newsId}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: user.email })
    }).catch(err => console.error(err));
    setActiveTab('club_news');
  };

  const handleMapCommentClick = (locationId: number, commentId: number) => {
    const alertKey = `com_${commentId}`;
    handleDismissAlert({ stopPropagation: () => {} } as any, alertKey);
    if (setTargetMapSpotId) setTargetMapSpotId(locationId);
    setActiveTab('map_spots');
  };

  const tiles = [
    { id: 'weekly_challenge', icon: '🔥', color: '#f97316', titleKey: 'tileWeeklyTitle', descKey: 'tileWeeklyDesc', tab: 'weekly_challenge' },
    { id: 'contests', icon: '📝', color: '#8b5cf6', titleKey: 'tileContestsTitle', descKey: 'tileContestsDesc', tab: 'contests_open_active' },
    { id: 'my_album', icon: '🖼️', color: '#f59e0b', titleKey: 'tilePortfolioTitle', descKey: 'tilePortfolioDesc', tab: 'my_album' },
    { id: 'map_spots', icon: '🌍', color: '#10b981', titleKey: 'tileMapTitle', descKey: 'tileMapDesc', tab: 'map_spots' },
    { id: 'progress', icon: '🏆', color: '#f43f5e', titleKey: 'tileProgressTitle', descKey: 'tileProgressDesc', tab: 'fiap_progress' },
    { id: 'salons', icon: '🌐', color: '#3b82f6', titleKey: 'tileSalonsTitle', descKey: 'tileSalonsDesc', tab: 'salons' },
    { id: 'club', icon: '👥', color: '#06b6d4', titleKey: 'tileClubLifeTitle', descKey: 'tileClubDesc', tab: 'club_nights' }
  ];

  const adminTile = { id: 'admin', icon: '⚙️', color: '#ef4444', titleKey: 'tileAdminTitle', descKey: 'tileAdminDesc', tab: (user?.email === ADMIN_EMAIL) ? 'admin_contests' : 'admin_meetings' };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString(lang === 'en' ? 'en-US' : 'hu-HU', { month: 'short', day: 'numeric' });

  // Szűrt értesítési listák
  const visibleNews = alerts?.unreadNews?.filter((n: any) => !dismissedAlerts.includes(`news_${n.id}`)) || [];
  const visibleComments = alerts?.mapComments?.filter((c: any) => !dismissedAlerts.includes(`com_${c.comment_id}`)) || [];
  const visibleWeekly = Array.isArray(alerts?.weekly) ? alerts.weekly : [];
  const visibleHomeworks = alerts?.homeworks || [];
  const visibleTranslations = alerts?.contests || [];

  const totalAlertsCount = visibleNews.length + visibleComments.length + visibleWeekly.length + visibleHomeworks.length + visibleTranslations.length;

  return (
    <div className="dashboard-main-wrapper" style={{ animation: 'dashboardFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      
      {/* ── 🌟 MODERN GRADIENT ÜDVÖZLŐSÁV ── */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #090d16 100%)', padding: '35px 40px', borderRadius: '24px', border: '1px solid #334155', marginBottom: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '25px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '250px', height: '240px', background: '#38bdf8', opacity: 0.04, filter: 'blur(60px)', borderRadius: '50%' }}></div>
        <div style={{ zIndex: 1 }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '2.4rem', color: '#f8fafc', fontWeight: '900', letterSpacing: '-0.5px' }}>
            {t('dashWelcome')}, <span style={{ background: 'linear-gradient(90deg, #38bdf8, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '900' }}>{user.name}</span>! 👋
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '1.05rem', fontWeight: '500' }}>
            {t('dashSupportNotice') || 'Örömmel látunk újra a klub pultjánál. Íme az aktuális fejlemények:'}
          </p>
        </div>
        {(user?.isPremium || user?.is_premium) && (
          <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(4, 120, 87, 0.25))', border: '1px solid rgba(16,185,129,0.4)', padding: '12px 28px', borderRadius: '100px', color: '#34d399', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', letterSpacing: '0.5px', boxShadow: '0 4px 15px rgba(16,185,129,0.15)', zIndex: 1 }}>
            ✨ {t('dashPremiumBadge', 'PRÉMIUM TAG')}
          </div>
        )}
      </div>

      {/* ── 📊 ASZIMMETRIKUS WORKSPACE BENTO GRID LAYOUT ── */}
      <div className="dashboard-bento-layout">
        
        {/* BAL OSZLOP: NAVIGÁCIÓS CSEMPÉK (BENTO GRID SZERKEZET) */}
        <div className="bento-left-column">
          <div className="bento-tiles-grid">
            {tiles.map((tile) => (
              <div 
                key={tile.id}
                className="dashboard-bento-tile"
                onClick={() => setActiveTab(tile.tab)}
                style={{ 
                  background: '#1e293b', 
                  borderRadius: '20px', 
                  padding: '30px', 
                  cursor: 'pointer', 
                  border: '1px solid #334155',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '160px'
                }}
              >
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '90px', height: '90px', background: tile.color, opacity: 0.08, filter: 'blur(25px)', borderRadius: '50%' }}></div>
                
                <div style={{ fontSize: '2rem', display: 'inline-flex', background: `${tile.color}15`, padding: '12px', borderRadius: '14px', border: `1px solid ${tile.color}25`, width: 'fit-content', marginBottom: '20px' }}>
                  {tile.icon}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', color: '#f8fafc', fontWeight: 'bold' }}>
                    {t(tile.titleKey as any)}
                  </h3>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.5' }}>
                    {t(tile.descKey as any)}
                  </p>
                </div>
              </div>
            ))}

            {/* ADMIN CSEMPÉD JAVÍTOTT INTEGRÁCIÓJA */}
            {(user?.email === ADMIN_EMAIL || isLeader) && (
              <div 
                className="dashboard-bento-tile admin-tile"
                onClick={() => setActiveTab(adminTile.tab)}
                style={{ 
                  background: 'rgba(239, 68, 68, 0.02)', 
                  borderRadius: '20px', 
                  padding: '30px', 
                  cursor: 'pointer', 
                  border: `1px dashed rgba(239, 68, 68, 0.4)`,
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '160px'
                }}
              >
                <div style={{ fontSize: '2rem', display: 'inline-flex', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(239, 68, 68, 0.2)', width: 'fit-content', marginBottom: '20px' }}>
                  {adminTile.icon}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', color: '#f87171', fontWeight: 'bold' }}>
                    {t(adminTile.titleKey as any)}
                  </h3>
                  <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.88rem', lineHeight: '1.5' }}>
                    {t(adminTile.descKey as any)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* JOBB OSZLOP: VERTKÁLIS ÉLŐ ÉRTESÍTÉSI HÍRFOLYAM (LIVE FEED SIDEBAR) */}
        <div className="bento-right-sidebar">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ fontSize: '1.05rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚡ {t('dashAlertsTitle', 'Élő Értesítési Központ')}
            </h2>
            {totalAlertsCount > 0 && (
              <span style={{ background: '#ef444415', color: '#f87171', fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 10px', borderRadius: '100px', border: '1px solid #ef444430' }}>
                {totalAlertsCount} új
              </span>
            )}
          </div>

          <div className="alert-stream-container">
            {isLoadingAlerts ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: '#1e293b', borderRadius: '16px', border: '1px dashed #334155', color: '#64748b', textAlign: 'center' }}>
                <div className="dash-stream-spinner" />
                <span style={{ fontSize: '0.85rem', marginTop: '12px', fontWeight: 'bold' }}>{t('dashSyncing', 'Aréna szinkronizálása...')}</span>
              </div>
            ) : !alerts ? (
              <div style={{ color: '#ef4444', fontSize: '0.88rem', padding: '20px', background: '#ef444405', borderRadius: '16px', border: '1px solid #ef444425', textAlign: 'center' }}>
                {t('dashAlertsError', 'Nem sikerült betölteni a hírfolyamot.')}
                <button onClick={() => window.location.reload()} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '3px 10px', borderRadius: '6px', cursor: 'pointer', marginLeft: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  {t('dashReload', 'Frissítés')}
                </button>
              </div>
            ) : (
              <div className="alert-stream-box">
                
                {/* 📰 HÍREK */}
                {visibleNews.map((news: any) => (
                  <div key={`news_${news.id}`} onClick={() => handleNewsClick(news.id)} className="stream-feed-card type-news">
                    <div className="feed-card-indicator" style={{ backgroundColor: '#ef4444' }} />
                    <span className="feed-card-badge" style={{ color: '#ef4444', background: '#ef444415' }}>📰 HÍR</span>
                    <h4 className="feed-card-title">{news.title}</h4>
                    <span className="feed-card-action">Megtekintés →</span>
                  </div>
                ))}

                {/* 💬 HOZZÁSZÓLÁSOK */}
                {visibleComments.map((comment: any) => (
                  <div key={`com_${comment.comment_id}`} onClick={() => handleMapCommentClick(comment.location_id, comment.comment_id)} className="stream-feed-card type-comment">
                    <div className="feed-card-indicator" style={{ backgroundColor: '#10b981' }} />
                    <button className="feed-dismiss-x" onClick={(e) => handleDismissAlert(e, `com_${comment.comment_id}`, 'map_comment', comment.comment_id)}>✖</button>
                    <span className="feed-card-badge" style={{ color: '#10b981', background: '#10b98115' }}>💬 TÉRKÉP</span>
                    <p style={{ margin: '0 0 6px 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
                      <b>{comment.user_name}</b> új helyszínt vagy tippet osztott meg:
                    </p>
                    <h4 className="feed-card-title">{comment.location_title}</h4>
                  </div>
                ))}

                {/* 🔥 ARÉNA AKTÍV LIGÁK */}
                {visibleWeekly.map((w: any) => {
                  const displayWTitle = lang === 'en' && w.title_en ? w.title_en : w.title;
                  return (
                    <div key={`weekly_${w.id}`} onClick={() => setActiveTab('weekly_challenge')} className="stream-feed-card type-arena">
                      <div className="feed-card-indicator" style={{ backgroundColor: '#f97316' }} />
                      <span className="feed-card-badge" style={{ color: '#f97316', background: '#f9731615' }}>⚔️ ARÉNA</span>
                      <h4 className="feed-card-title">{displayWTitle}</h4>
                      <div className="feed-card-date">⏳ {t('dashActiveUntil', 'Lejár')}: {formatDate(w.end_date)}</div>
                    </div>
                  );
                })}

                {/* 📸 HÁZI FELADATOK */}
                {visibleHomeworks.map((hw: any) => (
                  <div key={`hw_${hw.id}`} onClick={() => setActiveTab('club_homeworks')} className="stream-feed-card type-homework">
                    <div className="feed-card-indicator" style={{ backgroundColor: '#06b6d4' }} />
                    <span className="feed-card-badge" style={{ color: '#06b6d4', background: '#06b6d415' }}>📸 KLUB FELADAT</span>
                    <h4 className="feed-card-title">{hw.topic}</h4>
                    <div className="feed-card-date">⏳ {t('dashDeadline', 'Határidő')}: {formatDate(hw.deadline)}</div>
                  </div>
                ))}

                {/* 🏆 HIVATALOS PÁLYÁZATOK */}
                {visibleTranslations.map((contest: any) => (
                  <div key={`cont_${contest.id}`} onClick={() => setActiveTab('contests_open_active')} className="stream-feed-card type-contest">
                    <div className="feed-card-indicator" style={{ backgroundColor: '#8b5cf6' }} />
                    <span className="feed-card-badge" style={{ color: '#8b5cf6', background: '#8b5cf615' }}>🏆 PÁLYÁZAT</span>
                    <h4 className="feed-card-title">{contest.title}</h4>
                    <div className="feed-card-date">⏳ {t('dashDeadline', 'Nevezési zárlat')}: {formatDate(contest.end_date)}</div>
                  </div>
                ))}

                {totalAlertsCount === 0 && (
                  <div style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic', padding: '40px 10px', textAlign: 'center', background: '#1e293b40', borderRadius: '16px', border: '1px dashed #334155' }}>
                    ✨ {t('dashNoAlerts', 'Minden feladatod naprakész, nincs új értesítés.')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── 🎯 ULTRASTABIL STYLING KÖNYVTÁR ── */}
      <style>{`
        .dashboard-bento-layout {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 25px;
          width: 100%;
          align-items: start;
        }
        .bento-left-column {
          grid-column: span 8;
        }
        .bento-right-sidebar {
          grid-column: span 4;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 20px;
          padding: 25px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }
        .bento-tiles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 20px;
        }
        .dashboard-bento-tile:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 30px rgba(0,0,0,0.4);
          border-color: #475569 !important;
          background: #223147 !important;
        }
        .admin-tile:hover {
          border-color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.05) !important;
        }
        
        /* Élő Hírfolyam Stream Kártyák stílusa */
        .alert-stream-box {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 520px;
          overflow-y: auto;
          padding-right: 4px;
          scrollbar-width: thin;
          scrollbar-color: #334155 transparent;
        }
        .alert-stream-box::-webkit-scrollbar {
          width: 4px;
        }
        .alert-stream-box::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 10px;
        }
        .stream-feed-card {
          background: #0f172a;
          border: 1px solid #223147;
          border-radius: 14px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }
        .stream-feed-card:hover {
          transform: translateX(3px);
          border-color: #475569;
          background: #141f36;
        }
        .feed-card-indicator {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
        }
        .feed-card-badge {
          font-size: 0.68rem;
          font-weight: 900;
          padding: 2px 8px;
          border-radius: 4px;
          display: inline-block;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        .feed-card-title {
          margin: 0 0 4px 0;
          color: #f8fafc;
          font-size: 0.92rem;
          font-weight: bold;
          line-height: 1.4;
        }
        .feed-card-date {
          font-size: 0.78rem;
          color: #64748b;
          font-weight: 500;
        }
        .feed-card-action {
          font-size: 0.78rem;
          color: #38bdf8;
          font-weight: bold;
          display: block;
          margin-top: 5px;
        }
        .feed-dismiss-x {
          position: absolute;
          top: 12px;
          right: 12px;
          background: transparent;
          border: none;
          color: #475569;
          cursor: pointer;
          font-size: 0.85rem;
          transition: color 0.15s;
        }
        .feed-dismiss-x:hover {
          color: #f8fafc;
        }

        .dash-stream-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(56, 189, 248, 0.1);
          border-left-color: #38bdf8;
          border-radius: 50%;
          animation: dashCircleRot 0.8s linear infinite;
        }

        @keyframes dashboardFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dashCircleRot {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* 📱 MOBIL SPELICIKUS NÉZET: Összeomlik egyetlen tiszta oszlopba */
        @media (max-width: 1024px) {
          .dashboard-bento-layout {
            grid-template-columns: 1fr;
          }
          .bento-left-column, .bento-right-sidebar {
            grid-column: span 1fr;
            width: 100%;
          }
          .bento-right-sidebar {
            order: -1; /* Mobilon az értesítések ugranak legfelülre, hogy scannerebb legyen */
          }
        }
      `}</style>
    </div>
  );
}
