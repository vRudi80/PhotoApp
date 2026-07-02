import React, { useState, useEffect } from 'react';
import { BACKEND_URL, ADMIN_EMAIL } from '../utils/constants';
import VideoLoader from '../components/VideoLoader';

// 🎯 ÚJ: Lucide ikonok importálása
import { 
  Flame, 
  FileText, 
  Image as ImageIcon, 
  MapPin, 
  Trophy, 
  Globe, 
  Users, 
  Mic, 
  Settings, 
  Bell, 
  X, 
  RefreshCw,
  MessageSquare,
  Newspaper,
  Clock
} from 'lucide-react';

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.backgroundColor = '#0f172a';
      document.body.style.backgroundColor = '#0f172a';
    }
    const stored = localStorage.getItem('dismissed_alerts');
    if (stored) setDismissedAlerts(JSON.parse(stored));
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchAlerts = async () => {
      if (!user?.email) {
        if (isMounted) setIsLoadingAlerts(false);
        return;
      } 
      setIsLoadingAlerts(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const res = await fetch(`${BACKEND_URL}/api/dashboard-alerts?userEmail=${user.email}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`Szerver hiba: ${res.status}`);
        if (isMounted) setAlerts(await res.json());
      } catch (err) {
        clearTimeout(timeoutId);
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
    { id: 'weekly_challenge', icon: Flame, color: '#f97316', titleKey: 'tileWeeklyTitle', descKey: 'tileWeeklyDesc', tab: 'weekly_challenge' },
    { id: 'contests', icon: FileText, color: '#38bdf8', titleKey: 'tileContestsTitle', descKey: 'tileContestsDesc', tab: 'contests_open_active' },
    { id: 'my_album', icon: ImageIcon, color: '#94a3b8', titleKey: 'tilePortfolioTitle', descKey: 'tilePortfolioDesc', tab: 'my_album' },
    { id: 'map_spots', icon: MapPin, color: '#10b981', titleKey: 'tileMapTitle', descKey: 'tileMapDesc', tab: 'map_spots' },
    { id: 'progress', icon: Trophy, color: '#fbbf24', titleKey: 'tileProgressTitle', descKey: 'tileProgressDesc', tab: 'fiap_progress' },
    { id: 'salons', icon: Globe, color: '#8b5cf6', titleKey: 'tileSalonsTitle', descKey: 'tileSalonsDesc', tab: 'salons' },
    { id: 'club', icon: Users, color: '#06b6d4', titleKey: 'tileClubLifeTitle', descKey: 'tileClubDesc', tab: 'club_nights' },
    { id: 'podcast', icon: Mic, color: '#ef4444', titleKey: 'tilePodcastTitle', descKey: 'tilePodcastDesc', tab: 'podcast', fallbackTitle: 'Podcast', fallbackDesc: lang === 'en' ? 'Watch and listen to the latest media episodes!' : 'Nézd és hallgasd a legfrissebb adásokat közvetlenül itt!' }
  ];

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString(lang === 'en' ? 'en-US' : 'hu-HU', { month: 'short', day: 'numeric' });

  const checkClubAccess = (item: any) => {
    const itemClubName = item.club_name || item.restricted_club;
    const itemClubId = item.club_id || item.restricted_club_id;
    if (!(itemClubName?.trim() || (itemClubId && itemClubId !== 0))) return true; 
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
    return contestClubId === 0 || contestClubId === Number(user?.club_id);
  }) || [];

  const totalAlertsCount = visibleNews.length + visibleComments.length + (visibleWeekly.length > 0 ? 1 : 0) + visibleHomeworks.length + visibleContests.length;

  return (
    <div className="dashboard-global-bleed-wrapper" style={{ width: '100%', minHeight: '100vh', backgroundColor: '#0f172a', padding: '15px', boxSizing: 'border-box' }}>
      <div className="dashboard-outer-container" style={{ animation: 'dashFadeIn 0.4s ease-out', width: '100%', maxWidth: '1140px', margin: '0 auto', boxSizing: 'border-box' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #1f2937', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc', fontWeight: '700', letterSpacing: '-0.5px' }}>
            {t('dashWelcome', 'Üdvözlünk')}, <span style={{ color: '#38bdf8' }}>{user?.name}</span>!
          </h1>
          {(user?.isPremium || user?.is_premium) && (
            <div style={{ background: '#10b98112', border: '1px solid rgba(16,185,129,0.3)', padding: '4px 12px', borderRadius: '4px', color: '#10b981', fontWeight: 'bold', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
              {t('dashPremiumBadge', '✨ PRÉMIUM')}
            </div>
          )}
        </div>

        <div className="dashboard-flex-layout">
          <div className="dashboard-tiles-section">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {tiles.map((tile) => (
                <div key={tile.id} className="dashboard-bento-card" onClick={() => setActiveTab(tile.tab)}
                  style={{ background: '#131b2e', borderRadius: '8px', padding: '18px', cursor: 'pointer', border: '1px solid #222f47', transition: 'all 0.2s ease-in-out', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={{ marginBottom: '10px' }}>
                      <tile.icon size={20} color={tile.color} strokeWidth={2.5} />
                    </div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#f8fafc', fontWeight: '600', letterSpacing: '-0.2px' }}>
                      {t(tile.titleKey as any) || (tile as any).fallbackTitle}
                    </h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem', lineHeight: '1.4' }}>
                      {t(tile.descKey as any) || (tile as any).fallbackDesc}
                    </p>
                  </div>
                </div>
              ))}

              {(user?.email === ADMIN_EMAIL || isLeader) && (
                <div className="dashboard-bento-card admin-bento-card" onClick={() => setActiveTab(ADMIN_EMAIL === user?.email ? 'admin_contests' : 'admin_meetings')}
                  style={{ background: '#131b2e', borderRadius: '8px', padding: '18px', cursor: 'pointer', border: `1px dashed rgba(239,68,68,0.4)`, transition: 'all 0.2s ease-in-out', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={{ marginBottom: '10px' }}>
                      <Settings size={20} color="#ef4444" strokeWidth={2.5} />
                    </div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#ef4444', fontWeight: '600', letterSpacing: '-0.2px' }}>
                      {t('tileAdminTitle')}
                    </h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem', lineHeight: '1.4' }}>
                      {t('tileAdminDesc')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-alerts-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <Bell size={14} /> {t('dashAlertsTitle', 'Események & Értesítések')}
              </h2>
              {totalAlertsCount > 0 && (
                <span style={{ background: '#ef444415', color: '#f87171', fontSize: '0.68rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {totalAlertsCount} {lang === 'en' ? 'new' : 'új'}
                </span>
              )}
            </div>

            {isLoadingAlerts ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 10px', gap: '12px', width: '100%' }}>
                <VideoLoader />
                <div style={{ textAlign: 'center', animation: 'arenaPulse 2s infinite' }}>
                  <h4 style={{ color: '#64748b', margin: 0, fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {lang === 'en' ? '⚡ Synchronizing data...' : '⚡ Adatok szinkronizálása...'}
                  </h4>
                </div>
              </div>
            ) : !alerts ? (
              <div style={{ color: '#ef4444', fontSize: '0.82rem', padding: '12px', background: 'rgba(239,68,68,0.02)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.1)', textAlign: 'center' }}>
                {t('dashAlertsError', 'Hiba történt a betöltéskor.')}
                <button onClick={() => window.location.reload()} style={{ background: 'transparent', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', marginLeft: '10px', fontSize: '0.7rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <RefreshCw size={12} /> {t('dashReload', 'Frissítés')}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {visibleNews.map((news: any) => (
                  <div key={`news_${news.id}`} onClick={() => handleNewsClick(news.id)} className="stream-alert-row" style={{ borderLeft: '3px solid #ef4444' }}>
                    <div className="stream-alert-content">
                      <div className="stream-alert-header-meta">
                        <Newspaper size={10} /> <span>HÍR</span>
                      </div>
                      <h4 className="stream-alert-title">{news.title}</h4>
                    </div>
                  </div>
                ))}
                {visibleComments.map((comment: any) => (
                  <div key={`com_${comment.comment_id}`} onClick={() => handleMapCommentClick(comment.location_id, comment.comment_id)} className="stream-alert-row" style={{ borderLeft: '3px solid #10b981' }}>
                    <button className="stream-dismiss-cross" onClick={(e) => handleDismissAlert(e, `com_${comment.comment_id}`, 'map_comment', comment.comment_id)}><X size={14} /></button>
                    <div className="stream-alert-content">
                      <div className="stream-alert-header-meta">
                        <MessageSquare size={10} /> <span>KOMMENT</span> • <span>{comment.user_name}</span>
                      </div>
                      <h4 className="stream-alert-title">{t('dashLocation', 'Helyszín')}: {comment.location_title}</h4>
                    </div>
                  </div>
                ))}
                {visibleWeekly.length > 0 && (
                  <div onClick={() => setActiveTab('weekly_challenge')} className="stream-alert-row" style={{ borderLeft: '3px solid #f97316' }}>
                    <div className="stream-alert-content">
                      <div className="stream-alert-header-meta">
                        <Flame size={10} /> <span>ARÉNA</span> • <span style={{ color: '#10b981' }}>Aktív</span>
                      </div>
                      <h4 className="stream-alert-title">
                        {lang === 'en' ? `There are ${visibleWeekly.length} active arena challenges!` : `Jelenleg ${visibleWeekly.length} db nyitott aréna kihívás vár!`}
                      </h4>
                    </div>
                  </div>
                )}
                {visibleHomeworks.map((hw: any) => (
                  <div key={`hw_${hw.id}`} onClick={() => setActiveTab('club_homeworks')} className="stream-alert-row" style={{ borderLeft: '3px solid #06b6d4' }}>
                    <div className="stream-alert-content">
                      <div className="stream-alert-header-meta">
                        <Clock size={10} /> <span>HÁZI FELADAT</span> • <span>{formatDate(hw.deadline)}</span>
                      </div>
                      <h4 className="stream-alert-title">{hw.topic}</h4>
                    </div>
                  </div>
                ))}
                {visibleContests.map((contest: any) => (
                  <div key={`cont_${contest.id}`} onClick={() => setActiveTab('contests_open_active')} className="stream-alert-row" style={{ borderLeft: '3px solid #38bdf8' }}>
                    <div className="stream-alert-content">
                      <div className="stream-alert-header-meta">
                        <Trophy size={10} /> <span>PÁLYÁZAT</span> • <span>Lejár: {formatDate(contest.end_date)}</span>
                      </div>
                      <h4 className="stream-alert-title">{contest.title}</h4>
                    </div>
                  </div>
                ))}
                {totalAlertsCount === 0 && (
                  <div style={{ color: '#475569', fontSize: '0.8rem', fontStyle: 'italic', padding: '20px 10px', textAlign: 'center', background: 'rgba(30,41,59,0.2)', borderRadius: '6px', border: '1px dashed #222f47' }}>
                    {t('dashNoAlerts', 'Minden feladatod naprakész.')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .dashboard-flex-layout { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; width: 100%; }
        .dashboard-alerts-section { background: #131b2e; border: 1px solid #222f47; border-radius: 8px; padding: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); align-self: start; box-sizing: border-box; }
        .dashboard-bento-card:hover { border-color: #475569; background: #18253f !important; }
        .stream-alert-row { background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 10px 14px; cursor: pointer; position: relative; transition: all 0.1s ease-in-out; display: flex; align-items: start; }
        .stream-alert-row:hover { background: #131e33; border-color: #222f47; }
        .stream-alert-content { flex: 1; min-width: 0; }
        .stream-alert-header-meta { display: flex; align-items: center; gap: 6px; font-size: 0.65rem; font-weight: 800; color: #475569; margin-bottom: 4px; letter-spacing: 0.5px; text-transform: uppercase; }
        .stream-alert-title { margin: 0; color: #cbd5e1; font-size: 0.85rem; font-weight: 600; line-height: 1.35; white-space: normal !important; word-break: break-word; }
        .stream-dismiss-cross { position: absolute; top: 10px; right: 10px; background: transparent; border: none; color: #334155; cursor: pointer; padding: 2px; }
        @keyframes dashFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 1060px) { .dashboard-flex-layout { grid-template-columns: 1fr !important; gap: 20px !important; } .dashboard-alerts-section { order: -1; width: 100% !important; } }
      `}</style>
    </div>
  );
}
