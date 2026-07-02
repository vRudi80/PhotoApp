import React, { useState, useEffect } from 'react';
import { BACKEND_URL, ADMIN_EMAIL } from '../utils/constants';
import VideoLoader from '../components/VideoLoader';

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

  // Memóriából betöltjük a bezárt értesítéseket
  useEffect(() => {
    const stored = localStorage.getItem('dismissed_alerts');
    if (stored) setDismissedAlerts(JSON.parse(stored));
  }, []);

  // Értesítések szinkronizálása hálózati lógás elleni védelemmel
  useEffect(() => {
    let isMounted = true;

    const fetchAlerts = async () => {
      if (!user?.email) {
        if (isMounted) setIsLoadingAlerts(false);
        return;
      } 

      setIsLoadingAlerts(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 5000);

      try {
        const res = await fetch(`${BACKEND_URL}/api/dashboard-alerts?userEmail=${user.email}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Szerver hiba státusz: ${res.status}`);
        }

        if (isMounted) {
          setAlerts(await res.json());
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('Hiba az értesítések letöltésekor:', err);

        if (isMounted) {
          const lastAutoReload = sessionStorage.getItem('last_dashboard_auto_reload');
          const now = Date.now();

          if (!lastAutoReload || now - Number(lastAutoReload) > 10000) {
            sessionStorage.setItem('last_dashboard_auto_reload', String(now));
            window.location.reload();
            return;
          }
          setAlerts(null);
        }
      } finally {
        if (isMounted) setIsLoadingAlerts(false);
      }
    };

    fetchAlerts();

    return () => {
      isMounted = false;
    };
  }, [user?.email]);


  const handleDismissAlert = (e: React.MouseEvent, alertKey: string, type?: string, id?: number) => {
    e.stopPropagation(); 
    const newDismissed = [...dismissedAlerts, alertKey];
    setDismissedAlerts(newDismissed);
    localStorage.setItem('dismissed_alerts', JSON.stringify(newDismissed));

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
    const newDismissed = [...dismissedAlerts, alertKey];
    setDismissedAlerts(newDismissed);
    localStorage.setItem('dismissed_alerts', JSON.stringify(newDismissed));

    fetch(`${BACKEND_URL}/api/news/${newsId}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: user.email })
    }).catch(err => console.error(err));

    setActiveTab('club_news');
  };

  const handleMapCommentClick = (locationId: number, commentId: number) => {
    const alertKey = `com_${commentId}`;
    const newDismissed = [...dismissedAlerts, alertKey];
    setDismissedAlerts(newDismissed);
    localStorage.setItem('dismissed_alerts', JSON.stringify(newDismissed));
    
    fetch(`${BACKEND_URL}/api/locations/comments/${commentId}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: user.email })
    }).catch(err => console.error(err));

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
    { id: 'club', icon: '👥', color: '#06b6d4', titleKey: 'tileClubLifeTitle', descKey: 'tileClubDesc', tab: 'club_nights' },
    { 
      id: 'podcast', 
      icon: '🎙️', 
      color: '#f43f5e', 
      titleKey: 'tilePodcastTitle', 
      descKey: 'tilePodcastDesc', 
      tab: 'podcast',
      fallbackTitle: 'Podcast',
      fallbackDesc: lang === 'en' ? 'Watch and listen to the latest media episodes!' : 'Nézd és hallgasd a legfrissebb adásokat közvetlenül itt!'
    }
  ];

  const adminTile = { id: 'admin', icon: '⚙️', color: '#ef4444', titleKey: 'tileAdminTitle', descKey: 'tileAdminDesc', tab: (user?.email === ADMIN_EMAIL) ? 'admin_contests' : 'admin_meetings' };
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString(lang === 'en' ? 'en-US' : 'hu-HU', { month: 'short', day: 'numeric' });

  const checkClubAccess = (item: any) => {
    const itemClubName = item.club_name || item.restricted_club;
    const itemClubId = item.club_id || item.restricted_club_id;
    const hasRestriction = (itemClubName && itemClubName.trim() !== '') || (itemClubId && itemClubId !== 0);
    if (!hasRestriction) return true; 
    if (!user?.club_name && !user?.club_id) return false;
    const nameMatch = itemClubName && user?.club_name && itemClubName.trim() === user.club_name.trim();
    const idMatch = itemClubId && user?.club_id && Number(itemClubId) === Number(user.club_id);
    return !!(nameMatch || idMatch);
  };

  const visibleNews = alerts?.unreadNews?.filter((n: any) => !dismissedAlerts.includes(`news_${n.id}`) && checkClubAccess(n)) || [];
  const visibleComments = alerts?.mapComments?.filter((c: any) => !dismissedAlerts.includes(`com_${c.comment_id}`)) || [];
  const visibleWeekly = Array.isArray(alerts?.weekly) ? alerts.weekly : [];
  const visibleHomeworks = alerts?.homeworks?.filter((hw: any) => checkClubAccess(hw)) || [];
  
  const visibleContests = alerts?.contests?.filter((contest: any) => {
    const contestClubId = contest.restricted_club_id ? Number(contest.restricted_club_id) : 0;
    if (contestClubId === 0) return true;
    const userClubId = user?.club_id ? Number(user.club_id) : null;
    return contestClubId === userClubId;
  }) || [];

  const totalAlertsCount = visibleNews.length + visibleComments.length + (visibleWeekly.length > 0 ? 1 : 0) + visibleHomeworks.length + visibleContests.length;

  return (
    <div className="dashboard-outer-container" style={{ animation: 'dashFadeIn 0.4s ease-out', width: '100%', maxWidth: '1180px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* FELSŐ ÜDVÖZLŐ SÁV */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #334155', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem', color: '#f8fafc', fontWeight: '800', letterSpacing: '-0.5px' }}>
          {t('dashWelcome', 'Üdvözlünk')}, <span style={{ color: '#38bdf8' }}>{user?.name}</span>!
        </h1>
        {(user?.isPremium || user?.is_premium) && (
          <div style={{ background: '#10b98120', border: '1px solid #10b98140', padding: '5px 14px', borderRadius: '100px', color: '#10b981', fontWeight: 'bold', fontSize: '0.8rem', letterSpacing: '0.5px' }}>
            {t('dashPremiumBadge', '✨ PRÉMIUM')}
          </div>
        )}
      </div>

      <div className="dashboard-flex-layout">
        
        {/* BAL OLDAL: NAVIGÁCIÓS CSEMPÉK */}
        <div className="dashboard-tiles-section">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
            {tiles.map((tile) => (
              <div 
                key={tile.id}
                className="dashboard-bento-card"
                onClick={() => setActiveTab(tile.tab)}
                style={{ 
                  background: '#1e293b', 
                  borderRadius: '14px', 
                  padding: '16px 18px', 
                  cursor: 'pointer', 
                  border: '1px solid #334155',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '70px', height: '70px', background: tile.color, opacity: 0.05, filter: 'blur(20px)', borderRadius: '50%' }}></div>
                <div>
                  <div style={{ fontSize: '1.6rem', marginBottom: '8px', display: 'inline-flex', background: `${tile.color}12`, padding: '8px', borderRadius: '10px', border: `1px solid ${tile.color}20` }}>
                    {tile.icon}
                  </div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: '#f8fafc', fontWeight: 'bold', letterSpacing: '-0.3px' }}>
                    {t(tile.titleKey as any) || (tile as any).fallbackTitle}
                  </h3>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem', lineHeight: '1.35' }}>
                    {t(tile.descKey as any) || (tile as any).fallbackDesc}
                  </p>
                </div>
              </div>
            ))}

            {(user?.email === ADMIN_EMAIL || isLeader) && (
              <div 
                className="dashboard-bento-card admin-bento-card"
                onClick={() => setActiveTab(adminTile.tab)}
                style={{ 
                  background: '#1e293b', 
                  borderRadius: '14px', 
                  padding: '16px 18px', 
                  cursor: 'pointer', 
                  border: `1px dashed ${adminTile.color}40`,
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '1.6rem', marginBottom: '8px', display: 'inline-flex', background: `${adminTile.color}12`, padding: '8px', borderRadius: '10px', border: `1px solid ${adminTile.color}20` }}>
                    {adminTile.icon}
                  </div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: adminTile.color, fontWeight: 'bold', letterSpacing: '-0.3px' }}>
                    {t(adminTile.titleKey as any)}
                  </h3>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem', lineHeight: '1.35' }}>
                    {t(adminTile.descKey as any)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* JOBB OLDAL: ÉRTESÍTÉSI KÖZPONT */}
        <div className="dashboard-alerts-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '0.88rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
               {t('dashAlertsTitle', 'Események & Értesítések')}
            </h2>
            {totalAlertsCount > 0 && (
              <span style={{ background: '#ef444420', color: '#f87171', fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '100px' }}>
                {totalAlertsCount} {lang === 'en' ? 'new' : 'új'}
              </span>
            )}
          </div>

          {isLoadingAlerts ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 10px', gap: '15px', width: '100%' }}>
              <VideoLoader />
              <div style={{ textAlign: 'center', animation: 'arenaPulse 2s infinite' }}>
                <h4 style={{ color: '#f59e0b', margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>
                  {lang === 'en' ? '⚡ Synchronizing data...' : '⚡ Adatok szinkronizálása...'}
                </h4>
              </div>
              <style>{`@keyframes arenaPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }`}</style>
            </div>
          ) : !alerts ? (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', padding: '15px', background: 'rgba(239,68,68,0.04)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.15)', textAlign: 'center' }}>
              {t('dashAlertsError', 'Hiba történt a betöltéskor.')}
              <button onClick={() => window.location.reload()} style={{ background: '#ef444415', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '3px 10px', borderRadius: '6px', cursor: 'pointer', marginLeft: '10px', fontSize: '0.72rem', fontWeight: 'bold' }}>
                {t('dashReload', 'Frissítés')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              
              {/* 📰 CIKKEK ÉS HÍREK */}
              {visibleNews.map((news: any) => (
                <div key={`news_${news.id}`} onClick={() => handleNewsClick(news.id)} className="stream-alert-row" style={{ borderLeft: '4px solid #ef4444' }}>
                  <div className="stream-alert-content">
                    <div className="stream-alert-header-meta">
                      <span style={{ color: '#ef4444' }}>📰 HÍR</span>
                    </div>
                    <h4 className="stream-alert-title">{news.title}</h4>
                  </div>
                </div>
              ))}

              {/* 💬 HOZZÁSZÓLÁSOK */}
              {visibleComments.map((comment: any) => (
                <div key={`com_${comment.comment_id}`} onClick={() => handleMapCommentClick(comment.location_id, comment.comment_id)} className="stream-alert-row" style={{ borderLeft: '4px solid #10b981' }}>
                  <button className="stream-dismiss-cross" onClick={(e) => handleDismissAlert(e, `com_${comment.comment_id}`, 'map_comment', comment.comment_id)}>✖</button>
                  <div className="stream-alert-content">
                    <div className="stream-alert-header-meta">
                      <span style={{ color: '#10b981' }}>💬 TÉRKÉP MEGJELENÉS</span>
                      <span className="stream-alert-dot">•</span>
                      <span>{comment.user_name}</span>
                    </div>
                    <h4 className="stream-alert-title">{t('dashLocation', 'Helyszín')}: {comment.location_title}</h4>
                  </div>
                </div>
              ))}

              {/* 🎙️ ARÉNA FUTAMOK SZÁMLÁLÓJA */}
              {visibleWeekly.length > 0 && (
                <div onClick={() => setActiveTab('weekly_challenge')} className="stream-alert-row" style={{ borderLeft: '4px solid #f97316' }}>
                  <div className="stream-alert-content">
                    <div className="stream-alert-header-meta">
                      <span style={{ color: '#f97316' }}>🎙️ {lang === 'en' ? 'CHALLENGES' : 'KIHÍVÁSOK'}</span>
                      <span className="stream-alert-dot">•</span>
                      <span style={{ color: '#10b981' }}>{lang === 'en' ? 'Active Leagues' : 'Aktív futamok'}</span>
                    </div>
                    <h4 className="stream-alert-title">
                      {lang === 'en' 
                        ? `There are ${visibleWeekly.length} active arena challenges open right now!` 
                        : `Jelenleg ${visibleWeekly.length} db nyitott aréna kihívás várja a fotóidat!`}
                    </h4>
                  </div>
                </div>
              )}

              {/* 📸 HÁZI FELADATOK */}
              {visibleHomeworks.map((hw: any) => (
                <div key={`hw_${hw.id}`} onClick={() => setActiveTab('club_homeworks')} className="stream-alert-row" style={{ borderLeft: '4px solid #06b6d4' }}>
                  <div className="stream-alert-content">
                    <div className="stream-alert-header-meta">
                      <span style={{ color: '#06b6d4' }}>📸 HÁZI FELADAT</span>
                      <span className="stream-alert-dot">•</span>
                      <span style={{ color: '#64748b' }}>⏳ {formatDate(hw.deadline)}</span>
                    </div>
                    <h4 className="stream-alert-title">{hw.topic}</h4>
                  </div>
                </div>
              ))}

              {/* 🏆 HIVATALOS PÁLYÁZATOK */}
              {visibleContests.map((contest: any) => (
                <div key={`cont_${contest.id}`} onClick={() => setActiveTab('contests_open_active')} className="stream-alert-row" style={{ borderLeft: '4px solid #8b5cf6' }}>
                  <div className="stream-alert-content">
                    <div className="stream-alert-header-meta">
                      <span style={{ color: '#8b5cf6' }}>🏆 FOTÓPÁLYÁZAT</span>
                      <span className="stream-alert-dot">•</span>
                      <span style={{ color: '#64748b' }}>⏳ Lejár: {formatDate(contest.end_date)}</span>
                    </div>
                    <h4 className="stream-alert-title">{contest.title}</h4>
                  </div>
                </div>
              ))}

              {totalAlertsCount === 0 && (
                <div style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic', padding: '25px 10px', textAlign: 'center', background: '#1e293b40', borderRadius: '12px', border: '1px dashed #334155' }}>
                  {t('dashNoAlerts', 'Minden feladatod naprakész, nincs új értesítés.')}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── 🎯 BRUTÁLISAN BIZTOSÍTOTT RESZPONZÍV STYLING REGETEG ── */}
      <style>{`
        /* Globális Reset beépítése a fehér szélek ellen */
        .dashboard-outer-container {
          box-sizing: border-box;
        }

        /* Bento Grid 2-hasábos alap elrendezése */
        .dashboard-flex-layout { 
          display: grid; 
          grid-template-columns: 1.4fr 1fr; 
          gap: 16px; 
          width: 100%; 
        }
        
        .dashboard-tiles-section { width: 100%; }
        .dashboard-alerts-section { 
          background: #1e293b; 
          border: 1px solid #334155; 
          border-radius: 16px; 
          padding: 16px; 
          box-shadow: 0 4px 20px rgba(0,0,0,0.15); 
          align-self: start;
        }

        .dashboard-bento-card:hover { 
          transform: translateY(-3px); 
          box-shadow: 0 8px 20px rgba(0,0,0,0.3); 
          border-color: #475569; 
          background: #223147 !important; 
        }
        
        .admin-bento-card:hover { 
          border-color: #ef4444 !important; 
          background: rgba(239, 68, 68, 0.04) !important; 
        }

        .stream-alert-row { 
          background: #0f172a; 
          border: 1px solid #223147; 
          border-radius: 10px; 
          padding: 10px 14px; 
          cursor: pointer; 
          position: relative; 
          transition: all 0.15s ease-in-out; 
          display: flex; 
          align-items: start; 
        }
        .stream-alert-row:hover { transform: translateX(2px); background: #131e33; border-color: #334155; }
        .stream-alert-content { flex: 1; min-width: 0; }
        .stream-alert-header-meta { display: flex; align-items: center; gap: 6px; font-size: 0.65rem; font-weight: 800; color: #94a3b8; margin-bottom: 4px; letter-spacing: 0.5px; flex-wrap: wrap; }
        .stream-alert-dot { color: #223147; }
        .stream-alert-title { margin: 0; color: #f8fafc; font-size: 0.88rem; font-weight: 600; line-height: 1.35; white-space: normal !important; word-break: break-word; }
        .stream-dismiss-cross { position: absolute; top: 10px; right: 10px; background: transparent; border: none; color: #475569; cursor: pointer; font-size: 0.75rem; padding: 2px; transition: color 0.1s; }
        .stream-dismiss-cross:hover { color: #f8fafc; }
        
        @keyframes dashFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        
        /* 🎯 JAVÍTVA: Szabályos, törhetetlen reszponzív 1-hasábos nézet mobilra */
        @media (max-width: 900px) {
          .dashboard-flex-layout { 
            grid-template-columns: 1fr !important; 
            gap: 16px !important;
          }
          .dashboard-alerts-section { 
            order: -1; /* Mobilnézetben az értesítések ugranak legfelülre */
            width: 100%;
            box-sizing: border-box;
          }
        }
      `}</style>
    </div>
  );
}
