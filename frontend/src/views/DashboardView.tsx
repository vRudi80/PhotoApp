import React, { useState, useEffect } from 'react';
import { BACKEND_URL, ADMIN_EMAIL } from '../utils/constants';
import VideoLoader from '../components/VideoLoader';
import { useFetch } from '../hooks/useFetch';

// Nyelvi kontextus betöltése
import { useLanguage } from '../context/LanguageContext';

interface DashboardViewProps {
  user: any;
  isLeader: boolean;
  setActiveTab: (tab: string) => void;
  setTargetMapSpotId?: (id: number | null) => void;
}

export default function DashboardView({ user, isLeader, setActiveTab, setTargetMapSpotId }: DashboardViewProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const { t, lang } = useLanguage();

  // 👑 Az új, stabil adatletöltő motor futtatása
  const { 
    data: alerts, 
    loading: isLoadingAlerts, 
    error: fetchError, 
    refetch 
  } = useFetch<any>(`${BACKEND_URL}/api/dashboard-alerts?userEmail=${user?.email}`, {
    enabled: !!user?.email,
    timeoutMs: 5000 
  });

  // Memóriából betöltjük a bezárt értesítéseket
  useEffect(() => {
    const stored = localStorage.getItem('dismissed_alerts');
    if (stored) setDismissedAlerts(JSON.parse(stored));
  }, []);

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
                  {t(tile.titleKey as any) || (tile as any).fallbackTitle}
                </h3>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.4' }}>
                  {t(tile.descKey as any) || (tile as any).fallbackDesc}
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
            {totalAlertsCount > 0 && !isLoadingAlerts && !fetchError && (
              <span style={{ background: '#ef444420', color: '#f87171', fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '100px' }}>
                {totalAlertsCount} új
              </span>
            )}
          </div>

          {isLoadingAlerts ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', width: '100%' }}>
              <VideoLoader />
            </div>
          ) : fetchError || !alerts ? (
            <div style={{ color: '#ef4444', fontSize: '0.88rem', padding: '20px', background: 'rgba(239,68,68,0.05)', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>⚠️ Kapcsolati hiba történt.</p>
              <button onClick={refetch} style={{ background: '#ef444420', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)', padding: '6px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                Frissítés 🔄
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              {/* 📰 CIKKEK ÉS HÍREK */}
              {visibleNews.map((news: any) => (
                <div key={`news_${news.id}`} onClick={() => handleNewsClick(news.id)} className="stream-alert-row" style={{ borderLeft: '4px solid #ef4444' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 'bold', color: 'white' }}>{news.title}</span>
                  </div>
                </div>
              ))}

              {/* 💬 KOMMENTEK */}
              {visibleComments.map((comment: any) => (
                <div key={`com_${comment.comment_id}`} onClick={() => handleMapCommentClick(comment.location_id, comment.comment_id)} className="stream-alert-row" style={{ borderLeft: '4px solid #10b981' }}>
                  <span style={{ color: '#cbd5e1' }}>💬 <b>{comment.user_name}</b> új megjegyzést fűzött hozzá: <b style={{color: '#38bdf8'}}>{comment.location_title}</b></span>
                </div>
              ))}

              {/* KIHÍVÁSOK */}
              {visibleWeekly.length > 0 && (
                <div onClick={() => setActiveTab('weekly_challenge')} className="stream-alert-row" style={{ borderLeft: '4px solid #f97316' }}>
                  <span style={{ color: '#fbbf24' }}>⚔️ Aktív Aréna fordulók zajlanak! Kattints a leadáshoz vagy szavazáshoz.</span>
                </div>
              )}

              {/* 📸 HÁZI FELADATOK */}
              {visibleHomeworks.map((hw: any) => (
                <div key={`hw_${hw.id}`} onClick={() => setActiveTab('club_homeworks')} className="stream-alert-row" style={{ borderLeft: '4px solid #06b6d4' }}>
                  <span style={{ color: '#cbd5e1' }}>📝 Új házi feladat: <b>{hw.topic}</b> (Határidő: {hw.deadline})</span>
                </div>
              ))}

              {/* 🏆 HIVATALOS PÁLYÁZATOK */}
              {visibleContests.map((contest: any) => (
                <div key={`contest_${contest.id}`} onClick={() => setActiveTab('contests_open')} className="stream-alert-row" style={{ borderLeft: '4px solid #8b5cf6' }}>
                  <span style={{ color: '#cbd5e1' }}>🏆 Új pályázat nyílt: <b>{contest.title}</b></span>
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
        .stream-alert-row { background: #0f172a; border: 1px solid #223147; padding: 12px; border-radius: 10px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; }
        .stream-alert-row:hover { background: #1e293b; border-color: #38bdf8; }
        @keyframes dashFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 1024px) {
          .dashboard-flex-layout { grid-template-columns: 1fr; }
          .dashboard-alerts-section { grid-column: span 1fr; width: 100%; }
          .dashboard-alerts-section { order: -1; }
        }
      `}</style>
    </div>
  );
}
