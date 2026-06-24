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

  // Memóriából betöltjük a bezárt értesítéseket
  useEffect(() => {
    const stored = localStorage.getItem('dismissed_alerts');
    if (stored) setDismissedAlerts(JSON.parse(stored));
  }, []);

  // Értesítések szinkronizálása
  useEffect(() => {
    let isMounted = true;

    const fetchAlerts = async () => {
      setIsLoadingAlerts(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/dashboard-alerts?userEmail=${user?.email}`);
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
    { id: 'club', icon: '👥', color: '#06b6d4', titleKey: 'tileClubLifeTitle', descKey: 'tileClubDesc', tab: 'club_nights' }
  ];

  const adminTile = { id: 'admin', icon: '⚙️', color: '#ef4444', titleKey: 'tileAdminTitle', descKey: 'tileAdminDesc', tab: (user?.email === ADMIN_EMAIL) ? 'admin_contests' : 'admin_meetings' };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString(lang === 'en' ? 'en-US' : 'hu-HU', { month: 'short', day: 'numeric' });

  // ── 🎯 UNIVERZÁLIS KLUB-BIZTONSÁGI SZŰRŐ MOTOR ──
  const checkClubAccess = (item: any) => {
    const itemClubName = item.club_name || item.restricted_club;
    const itemClubId = item.club_id || item.restricted_club_id;
    
    const hasRestriction = (itemClubName && itemClubName.trim() !== '') || (itemClubId && itemClubId !== 0);
    if (!hasRestriction) return true; // Nyilvános tartalom, mindenki láthatja
    
    // Ha van korlátozás, de a felhasználónak nincs semmilyen klubja, azonnal elrejtjük
    if (!user?.club_name && !user?.club_id) return false;
    
    // Ellenőrizzük az egyezést név vagy számszerű azonosító alapján is
    const nameMatch = itemClubName && user?.club_name && itemClubName.trim() === user.club_name.trim();
    const idMatch = itemClubId && user?.club_id && Number(itemClubId) === Number(user.club_id);
    
    return !!(nameMatch || idMatch);
  };

  // Alkalmazzuk a szűrőt az összes beérkező adatcsoportra
  const visibleNews = alerts?.unreadNews?.filter((n: any) => !dismissedAlerts.includes(`news_${n.id}`) && checkClubAccess(n)) || [];
  const visibleComments = alerts?.mapComments?.filter((c: any) => !dismissedAlerts.includes(`com_${c.comment_id}`)) || [];
  const visibleWeekly = Array.isArray(alerts?.weekly) ? alerts.weekly : [];
  const visibleHomeworks = alerts?.homeworks?.filter((hw: any) => checkClubAccess(hw)) || [];
  const visibleContests = alerts?.contests?.filter((contest: any) => checkClubAccess(contest)) || [];

  const totalAlertsCount = visibleNews.length + visibleComments.length + visibleWeekly.length + visibleHomeworks.length + visibleContests.length;

  return (
    <div style={{ animation: 'dashFadeIn 0.4s ease-out' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid #334155', flexWrap: 'wrap', gap: '15px' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#f8fafc', fontWeight: '800' }}>
          {t('dashWelcome', 'Üdvözlünk')}, <span style={{ color: '#38bdf8' }}>{user?.name}</span>!
        </h1>
        {(user?.isPremium || user?.is_premium) && (
          <div style={{ background: '#10b98120', border: '1px solid #10b98140', padding: '6px 16px', borderRadius: '100px', color: '#10b981', fontWeight: 'bold', fontSize: '0.85rem' }}>
            {t('dashPremiumBadge', '✨ PRÉMIUM')}
          </div>
        )}
      </div>

      <div className="dashboard-flex-layout">
        
        {/* BAL OLDAL: NAVIGÁCIÓS CSEMPÉK */}
        <div className="dashboard-tiles-section">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {tiles.map((tile) => (
              <div 
                key={tile.id}
                className="dashboard-bento-card"
                onClick={() => setActiveTab(tile.tab)}
                style={{ 
                  background: '#1e293b', 
                  borderRadius: '16px', 
                  padding: '20px', 
                  cursor: 'pointer', 
                  border: '1px solid #334155',
                  transition: 'all 0.2s ease-in-out',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: tile.color, opacity: 0.06, filter: 'blur(25px)', borderRadius: '50%' }}></div>
                <div style={{ fontSize: '2rem', marginBottom: '12px', display: 'inline-block', background: `${tile.color}15`, padding: '10px', borderRadius: '10px', border: `1px solid ${tile.color}25` }}>
                  {tile.icon}
                </div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: '#f8fafc', fontWeight: 'bold' }}>
                  {t(tile.titleKey as any)}
                </h3>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.4' }}>
                  {t(tile.descKey as any)}
                </p>
              </div>
            ))}

            {(user?.email === ADMIN_EMAIL || isLeader) && (
              <div 
                className="dashboard-bento-card admin-bento-card"
                onClick={() => setActiveTab(adminTile.tab)}
                style={{ 
                  background: '#1e293b', 
                  borderRadius: '16px', 
                  padding: '20px', 
                  cursor: 'pointer', 
                  border: `1px dashed ${adminTile.color}50`,
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '12px', display: 'inline-block', background: `${adminTile.color}15`, padding: '10px', borderRadius: '10px', border: `1px solid ${adminTile.color}25` }}>
                  {adminTile.icon}
                </div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: adminTile.color, fontWeight: 'bold' }}>
                  {t(adminTile.titleKey as any)}
                </h3>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.4' }}>
                  {t(adminTile.descKey as any)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* JOBB OLDAL: ÉRTESÍTÉSI KÖZPONT */}
        <div className="dashboard-alerts-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
               {t('dashAlertsTitle', 'Események & Értesítések')}
            </h2>
            {totalAlertsCount > 0 && (
              <span style={{ background: '#ef444420', color: '#f87171', fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '100px' }}>
                {totalAlertsCount} új
              </span>
            )}
          </div>
          
          {isLoadingAlerts ? (
            <div style={{ color: '#64748b', fontSize: '0.88rem', padding: '30px 15px', background: '#1e293b', borderRadius: '16px', border: '1px dashed #334155', textAlign: 'center', animation: 'dashPulse 2s infinite' }}>
              {t('dashSyncing', 'Értesítések szinkronizálása...')}
            </div>
          ) : !alerts ? (
            <div style={{ color: '#ef4444', fontSize: '0.88rem', padding: '20px', background: '#ef444405', borderRadius: '16px', border: '1px solid #ef444425', textAlign: 'center' }}>
              {t('dashAlertsError', 'Hiba történt a betöltéskor.')}
              <button onClick={() => window.location.reload()} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '2px 8px', borderRadius: '6px', cursor: 'pointer', marginLeft: '10px', fontSize: '0.75rem' }}>
                {t('dashReload', 'Frissítés')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
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

              {/* ⚔️ ARÉNA AKTÍV LIGÁK */}
              {visibleWeekly.map((w: any) => {
                const displayWTitle = lang === 'en' && w.title_en ? w.title_en : w.title;
                return (
                  <div key={`weekly_${w.id}`} onClick={() => setActiveTab('weekly_challenge')} className="stream-alert-row" style={{ borderLeft: '4px solid #f97316' }}>
                    <div className="stream-alert-content">
                      <div className="stream-alert-header-meta">
                        <span style={{ color: '#f97316' }}>⚔️ ARÉNA FUTAM</span>
                        <span className="stream-alert-dot">•</span>
                        <span style={{ color: '#64748b' }}>⏳ Zárlat: {formatDate(w.end_date)}</span>
                      </div>
                      <h4 className="stream-alert-title">{displayWTitle}</h4>
                    </div>
                  </div>
                );
              })}

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
                <div style={{ color: '#64748b', fontSize: '0.88rem', fontStyle: 'italic', padding: '30px 10px', textAlign: 'center', background: '#1e293b40', borderRadius: '14px', border: '1px dashed #334155' }}>
                  {t('dashNoAlerts', 'Minden feladatod naprakész, nincs új értesítés.')}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      <style>{`
        .dashboard-flex-layout { display: grid; grid-template-columns: repeat(12, 1fr); gap: 20px; width: 100%; }
        .dashboard-tiles-section { grid-column: span 8; }
        .dashboard-alerts-section { grid-column: span 4; background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .dashboard-bento-card:hover { transform: translateY(-3px); box-shadow: 0 12px 24px rgba(0,0,0,0.3); border-color: #475569; background: #233147 !important; }
        .admin-bento-card:hover { border-color: #ef4444 !important; background: rgba(239, 68, 68, 0.05) !important; }
        .stream-alert-row { background: #0f172a; border: 1px solid #223147; border-radius: 12px; padding: 14px 16px; cursor: pointer; position: relative; transition: all 0.15s ease-in-out; display: flex; align-items: start; }
        .stream-alert-row:hover { transform: translateX(2px); background: #141e33; border-color: #334155; }
        .stream-alert-content { flex: 1; min-width: 0; }
        .stream-alert-header-meta { display: flex; align-items: center; gap: 6px; font-size: 0.68rem; font-weight: 800; color: #94a3b8; margin-bottom: 6px; letter-spacing: 0.5px; flex-wrap: wrap; }
        .stream-alert-dot { color: #334155; }
        .stream-alert-title { margin: 0; color: #f8fafc; font-size: 0.92rem; font-weight: 600; line-height: 1.4; white-space: normal !important; word-break: break-word; }
        .stream-dismiss-cross { position: absolute; top: 12px; right: 12px; background: transparent; border: none; color: #475569; cursor: pointer; font-size: 0.8rem; padding: 2px; transition: color 0.1s; }
        .stream-dismiss-cross:hover { color: #f8fafc; }
        @keyframes dashFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dashPulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
        @media (max-width: 1024px) {
          .dashboard-flex-layout { grid-template-columns: 1fr; }
          .dashboard-tiles-section, .dashboard-alerts-section { grid-column: span 1fr; width: 100%; }
          .dashboard-alerts-section { order: -1; }
        }
      `}</style>
    </div>
  );
}
