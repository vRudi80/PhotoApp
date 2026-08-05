import React, { useState, useEffect } from 'react';
import { BACKEND_URL, ADMIN_EMAIL } from '../utils/constants';
import VideoLoader from '../components/VideoLoader';

// Lucide ikonok importálása
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
  MessageCircleQuestion,
  Clock,
  Sparkles,
  Smile,
  ChevronRight
} from 'lucide-react';

// Saját háttérkép importálása
import heroCameraImg from './hero_camera.jpg';

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
      document.documentElement.style.backgroundColor = 'var(--bg-main)';
      document.body.style.backgroundColor = 'var(--bg-main)';
    }
    const stored = localStorage.getItem('dismissed_alerts');
    if (stored) setDismissedAlerts(JSON.parse(stored));
  }, []);

  const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
    const token = localStorage.getItem('photoAppToken');
    return {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...extraHeaders
    };
  };

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
          signal: controller.signal,
          headers: getAuthHeaders()
        });
        if (timeoutId) clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`Szerver hiba: ${res.status}`);
        if (isMounted) setAlerts(await res.json());
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
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
        if (isMounted) {
          setIsLoadingAlerts(false);
        }
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
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userEmail: user.email })
      }).catch(err => console.error(err));
    }
  };

  const handleNewsClick = (newsId: number, isPublic?: number) => {
    const alertKey = `news_${newsId}`;
    const newDismissed = [...dismissedAlerts, alertKey];
    setDismissedAlerts(newDismissed);
    localStorage.setItem('dismissed_alerts', JSON.stringify(newDismissed));
    
    fetch(`${BACKEND_URL}/api/news/${newsId}/read`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ userEmail: user.email })
    }).catch(err => console.error(err));
    
    setActiveTab(isPublic === 1 ? 'public_news' : 'club_news');
  };

  const handleForumClick = (postId: number, isPublic?: number) => {
    const alertKey = `forum_${postId}`;
    const newDismissed = [...dismissedAlerts, alertKey];
    setDismissedAlerts(newDismissed);
    localStorage.setItem('dismissed_alerts', JSON.stringify(newDismissed));
    
    fetch(`${BACKEND_URL}/api/news/${postId}/read`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ userEmail: user.email })
    }).catch(err => console.error(err));
    
    setActiveTab(isPublic === 1 ? 'public_news' : 'club_news');
  };

  const handleMapCommentClick = (locationId: number, commentId: number) => {
    const alertKey = `com_${commentId}`;
    const newDismissed = [...dismissedAlerts, alertKey];
    setDismissedAlerts(newDismissed);
    localStorage.setItem('dismissed_alerts', JSON.stringify(newDismissed));
    
    fetch(`${BACKEND_URL}/api/locations/comments/${commentId}/read`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ userEmail: user.email })
    }).catch(err => console.error(err));
    if (setTargetMapSpotId) setTargetMapSpotId(locationId);
    setActiveTab('map_spots');
  };

  const tiles = [
    { id: 'weekly_challenge', icon: Flame, color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', titleKey: 'tileWeeklyTitle', descKey: 'tileWeeklyDesc', tab: 'weekly_challenge' },
    { id: 'quiz', icon: MessageCircleQuestion, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)', titleKey: 'titleQuiz', descKey: 'titleQuizDesc', tab: 'quiz' },
    { id: 'contests', icon: FileText, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', titleKey: 'tileContestsTitle', descKey: 'tileContestsDesc', tab: 'contests_open_active' },
    { id: 'my_album', icon: ImageIcon, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', titleKey: 'tilePortfolioTitle', descKey: 'tilePortfolioDesc', tab: 'my_album' },
    { id: 'map_spots', icon: MapPin, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', titleKey: 'tileMapTitle', descKey: 'tileMapDesc', tab: 'map_spots' },
    { id: 'progress', icon: Trophy, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', titleKey: 'tileProgressTitle', descKey: 'tileProgressDesc', tab: 'fiap_progress' },
    { id: 'salons', icon: Globe, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', titleKey: 'tileSalonsTitle', descKey: 'tileSalonsDesc', tab: 'salons' },
    { id: 'club', icon: Users, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', titleKey: 'tileClubLifeTitle', descKey: 'tileClubDesc', tab: 'club_nights' },
    { id: 'podcast', icon: Mic, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', titleKey: 'tilePodcastTitle', descKey: 'tilePodcastDesc', tab: 'podcast', fallbackTitle: 'Podcast', fallbackDesc: lang === 'en' ? 'Watch and listen to the latest media episodes!' : 'Nézd és hallgasd a legfrissebb adásokat közvetlenül itt!' }
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
  const visibleForum = alerts?.unreadForum?.filter((f: any) => !dismissedAlerts.includes(`forum_${f.id}`) && checkClubAccess(f)) || [];
  const visibleComments = alerts?.mapComments?.filter((c: any) => !dismissedAlerts.includes(`com_${c.comment_id}`)) || [];
  const visibleWeekly = Array.isArray(alerts?.weekly) ? alerts.weekly : [];
  const visibleHomeworks = alerts?.homeworks?.filter((hw: any) => checkClubAccess(hw)) || [];
  const visibleContests = alerts?.contests?.filter((contest: any) => {
    const contestClubId = contest.restricted_club_id ? Number(contest.restricted_club_id) : 0;
    return contestClubId === 0 || contestClubId === Number(user?.club_id);
  }) || [];

  const totalAlertsCount = visibleNews.length + visibleForum.length + visibleComments.length + (visibleWeekly.length > 0 ? 1 : 0) + visibleHomeworks.length + visibleContests.length;

  return (
    <div 
      className="dashboard-global-bleed-wrapper" 
      style={{ 
        width: '100%', 
        minHeight: '100vh', 
        padding: '20px 15px 60px 15px', 
        boxSizing: 'border-box',
        position: 'relative',
        background: `
          radial-gradient(circle at 50% 10%, rgba(168, 85, 247, 0.25) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(249, 115, 22, 0.18) 0%, transparent 50%),
          linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, var(--bg-main) 100%),
          url(${heroCameraImg}) center/cover no-repeat fixed
        `
      }}
    >
      <div className="dashboard-outer-container" style={{ animation: 'dashFadeIn 0.4s ease-out', width: '100%', maxWidth: '1140px', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* ── BARÁTSÁGOS HERO ÜDVÖZLŐ BANNER ── */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '20px',
          padding: '24px 28px',
          marginBottom: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 30px rgba(168, 85, 247, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: 'rgba(168, 85, 247, 0.18)',
              color: '#e9d5ff',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginBottom: '8px'
            }}>
              <Smile size={14} color="#c084fc" /> {lang === 'en' ? 'Welcome back!' : 'Jó újra látni!'}
            </div>

            <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: '#ffffff', fontWeight: '900', letterSpacing: '-0.5px' }}>
              {t('dashWelcome', 'Üdvözlünk')}, <span style={{ background: 'linear-gradient(135deg, #38bdf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.name}</span>! 👋
            </h1>
            
            <p style={{ margin: '6px 0 0 0', color: '#cbd5e1', fontSize: '0.92rem', opacity: 0.9 }}>
              {lang === 'en' ? 'Explore your photo universe, check events or try our new features below.' : 'Böngéssz a funkciók között, próbáld ki a legújabb 3D tárlatot vagy nézd meg az aktuális kihívásokat!'}
            </p>
          </div>

          {(user?.isPremium || user?.is_premium) ? (
            <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.3))', border: '1px solid rgba(16,185,129,0.4)', padding: '8px 16px', borderRadius: '30px', color: '#34d399', fontWeight: 'bold', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}>
              <Sparkles size={16} /> {t('dashPremiumBadge', '✨ PRÉMIUM TAG')}
            </div>
          ) : (
            <button 
              onClick={() => window.location.href = '/packages'}
              style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(245,158,11,0.28))', border: '1px solid rgba(251,191,36,0.4)', padding: '8px 16px', borderRadius: '30px', color: '#fbbf24', fontWeight: 'bold', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s ease' }}
            >
              <Sparkles size={16} /> {lang === 'en' ? 'Get Premium Access ➔' : 'Válts Prémiumra ➔'}
            </button>
          )}
        </div>

        {/* ── FŐ ELRENDEZÉS: KÁRTYÁK & ÉRTESÍTÉSEK ── */}
        <div className="dashboard-flex-layout">
          
          {/* CSEMPE MATRIX */}
          <div className="dashboard-tiles-section">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {tiles.map((tile) => (
                <div 
                  key={tile.id} 
                  className="dashboard-bento-card" 
                  onClick={() => setActiveTab(tile.tab)}
                  style={{ 
                    background: 'rgba(15, 23, 42, 0.72)', 
                    backdropFilter: 'blur(12px)',
                    borderRadius: '16px', 
                    padding: '20px', 
                    cursor: 'pointer', 
                    border: '1px solid rgba(255, 255, 255, 0.12)', 
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.3)' 
                  }}
                >
                  <div>
                    <div style={{ 
                      width: '44px', 
                      height: '44px', 
                      borderRadius: '12px', 
                      background: tile.bg, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      marginBottom: '14px' 
                    }}>
                      <tile.icon size={22} color={tile.color} strokeWidth={2.4} />
                    </div>

                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: '#ffffff', fontWeight: '800', letterSpacing: '-0.3px' }}>
                      {t(tile.titleKey as any) || (tile as any).fallbackTitle}
                    </h3>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.83rem', lineHeight: '1.45' }}>
                      {t(tile.descKey as any) || (tile as any).fallbackDesc}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '14px', color: tile.color, fontSize: '0.78rem', fontWeight: '700' }}>
                    <span>{lang === 'en' ? 'Open' : 'Megnyitás'}</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              ))}

              {(user?.email === ADMIN_EMAIL || isLeader) && (
                <div 
                  className="dashboard-bento-card admin-bento-card" 
                  onClick={() => setActiveTab(ADMIN_EMAIL === user?.email ? 'admin_contests' : 'admin_meetings')}
                  style={{ 
                    background: 'rgba(239, 68, 68, 0.08)', 
                    backdropFilter: 'blur(12px)',
                    borderRadius: '16px', 
                    padding: '20px', 
                    cursor: 'pointer', 
                    border: '1px dashed rgba(239, 68, 68, 0.4)', 
                    transition: 'all 0.2s ease', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between' 
                  }}
                >
                  <div>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                      <Settings size={22} color="#ef4444" strokeWidth={2.4} />
                    </div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: '#fca5a5', fontWeight: '800' }}>
                      {t('tileAdminTitle')}
                    </h3>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.83rem', lineHeight: '1.45' }}>
                      {t('tileAdminDesc')}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '14px', color: '#ef4444', fontSize: '0.78rem', fontWeight: '700' }}>
                    <span>{lang === 'en' ? 'Admin Desk' : 'Kezelőpult'}</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ÉRTESÍTÉSI OLDALSÁV */}
          <div className="dashboard-alerts-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <Bell size={16} color="#a855f7" /> {t('dashAlertsTitle', 'Események & Értesítések')}
              </h2>
              {totalAlertsCount > 0 && (
                <span style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#ffffff', fontSize: '0.72rem', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}>
                  {totalAlertsCount} {lang === 'en' ? 'new' : 'új'}
                </span>
              )}
            </div>

            {isLoadingAlerts ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 10px', gap: '12px', width: '100%' }}>
                <VideoLoader />
                <div style={{ textAlign: 'center' }}>
                  <h4 style={{ color: '#cbd5e1', margin: 0, fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {lang === 'en' ? '⚡ Synchronizing data...' : '⚡ Adatok szinkronizálása...'}
                  </h4>
                </div>
              </div>
            ) : !alerts ? (
              <div style={{ color: '#fca5a5', fontSize: '0.82rem', padding: '14px', background: 'rgba(239,68,68,0.1)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
                {t('dashAlertsError', 'Hiba történt a betöltéskor.')}
                <button onClick={() => window.location.reload()} style={{ background: 'transparent', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '10px' }}>
                  <RefreshCw size={12} /> {t('dashReload', 'Frissítés')}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {visibleNews.map((news: any) => {
                  const isForumPost = news.category_id && Number(news.category_id) > 1;
                  return (
                    <div key={`news_${news.id}`} onClick={() => handleNewsClick(news.id, news.is_public)} className="stream-alert-row" style={{ borderLeft: isForumPost ? '4px solid #38bdf8' : '4px solid #ef4444' }}>
                      <div className="stream-alert-content">
                        <div className="stream-alert-header-meta">
                          {isForumPost ? <MessageSquare size={12} color="#38bdf8" /> : <Newspaper size={12} color="#ef4444" />}
                          <span>{isForumPost ? 'FÓRUM' : 'HÍR'}</span>
                        </div>
                        <h4 className="stream-alert-title">{news.title}</h4>
                      </div>
                    </div>
                  );
                })}

                {visibleForum.map((post: any) => (
                  <div key={`forum_${post.id}`} onClick={() => handleForumClick(post.id, post.is_public)} className="stream-alert-row" style={{ borderLeft: '4px solid #38bdf8' }}>
                    <div className="stream-alert-content">
                      <div className="stream-alert-header-meta">
                        <MessageSquare size={12} color="#38bdf8" /> <span>FÓRUM</span>
                      </div>
                      <h4 className="stream-alert-title">{post.title}</h4>
                    </div>
                  </div>
                ))}

                {visibleComments.map((comment: any) => (
                  <div key={`com_${comment.comment_id}`} onClick={() => handleMapCommentClick(comment.location_id, comment.comment_id)} className="stream-alert-row" style={{ borderLeft: '4px solid #10b981' }}>
                    <button className="stream-dismiss-cross" onClick={(e) => handleDismissAlert(e, `com_${comment.comment_id}`, 'map_comment', comment.comment_id)}><X size={14} /></button>
                    <div className="stream-alert-content">
                      <div className="stream-alert-header-meta">
                        <MessageSquare size={12} color="#10b981" /> <span>KOMMENT</span> • <span>{comment.user_name}</span>
                      </div>
                      <h4 className="stream-alert-title">{t('dashLocation', 'Helyszín')}: {comment.location_title}</h4>
                    </div>
                  </div>
                ))}

                {visibleWeekly.length > 0 && (
                  <div onClick={() => setActiveTab('weekly_challenge')} className="stream-alert-row" style={{ borderLeft: '4px solid #f97316' }}>
                    <div className="stream-alert-content">
                      <div className="stream-alert-header-meta">
                        <Flame size={12} color="#f97316" /> <span>ARÉNA</span> • <span style={{ color: '#34d399' }}>Aktív</span>
                      </div>
                      <h4 className="stream-alert-title">
                        {lang === 'en' ? `There are ${visibleWeekly.length} active arena challenges!` : `Jelenleg ${visibleWeekly.length} db nyitott aréna kihívás vár!`}
                      </h4>
                    </div>
                  </div>
                )}
                
                {visibleHomeworks.map((hw: any) => (
                  <div key={`hw_${hw.id}`} onClick={() => setActiveTab('club_homeworks')} className="stream-alert-row" style={{ borderLeft: '4px solid #06b6d4' }}>
                    <div className="stream-alert-content">
                      <div className="stream-alert-header-meta">
                        <Clock size={12} color="#06b6d4" /> <span>HÁZI FELADAT</span> • <span>{formatDate(hw.deadline)}</span>
                      </div>
                      <h4 className="stream-alert-title">{hw.topic}</h4>
                    </div>
                  </div>
                ))}

                {visibleContests.map((contest: any) => (
                  <div key={`cont_${contest.id}`} onClick={() => setActiveTab('contests_open_active')} className="stream-alert-row" style={{ borderLeft: '4px solid #38bdf8' }}>
                    <div className="stream-alert-content">
                      <div className="stream-alert-header-meta">
                        <Trophy size={12} color="#38bdf8" /> <span>PÁLYÁZAT</span> • <span>Lejár: {formatDate(contest.end_date)}</span>
                      </div>
                      <h4 className="stream-alert-title">{contest.title}</h4>
                    </div>
                  </div>
                ))}

                {totalAlertsCount === 0 && (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '24px 12px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px', border: '1px dashed rgba(255, 255, 255, 0.15)' }}>
                    ☕ {t('dashNoAlerts', 'Minden feladatod naprakész.')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* ── CSS STÍLUSOK & LÁTVÁNYOS INTERAKCIÓK ── */}
      <style>{`
        .dashboard-flex-layout { 
          display: grid; 
          grid-template-columns: 1.4fr 1fr; 
          gap: 20px; 
          width: 100%; 
        }
        
        .dashboard-alerts-section { 
          background: rgba(15, 23, 42, 0.72); 
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.12); 
          border-radius: 20px; 
          padding: 20px; 
          box-shadow: 0 8px 25px rgba(0,0,0,0.3); 
          align-self: start; 
          box-sizing: border-box; 
        }

        .dashboard-bento-card:hover { 
          transform: translateY(-4px);
          border-color: rgba(168, 85, 247, 0.5) !important; 
          box-shadow: 0 12px 30px rgba(168, 85, 247, 0.2) !important;
          background: rgba(15, 23, 42, 0.88) !important;
        }

        .stream-alert-row { 
          background: rgba(15, 23, 42, 0.85); 
          border: 1px solid rgba(255, 255, 255, 0.1); 
          border-radius: 12px; 
          padding: 12px 14px; 
          cursor: pointer; 
          position: relative; 
          transition: all 0.2s ease-in-out; 
          display: flex; 
          align-items: flex-start; 
        }

        .stream-alert-row:hover { 
          background: rgba(30, 41, 59, 0.95); 
          transform: translateX(3px);
          border-color: rgba(255, 255, 255, 0.25); 
        }

        .stream-alert-content { flex: 1; min-width: 0; }

        .stream-alert-header-meta { 
          display: flex; 
          align-items: center; 
          gap: 6px; 
          font-size: 0.68rem; 
          font-weight: 800; 
          color: #94a3b8; 
          margin-bottom: 4px; 
          letter-spacing: 0.5px; 
          text-transform: uppercase; 
        }

        .stream-alert-title { 
          margin: 0; 
          color: #ffffff; 
          font-size: 0.88rem; 
          font-weight: 700; 
          line-height: 1.35; 
          white-space: normal !important; 
          word-break: break-word; 
        }

        .stream-dismiss-cross { 
          position: absolute; 
          top: 10px; 
          right: 10px; 
          background: transparent; 
          border: none; 
          color: #94a3b8; 
          cursor: pointer; 
          padding: 2px; 
          border-radius: 50%;
          transition: color 0.15s ease;
        }

        .stream-dismiss-cross:hover {
          color: #f87171;
        }

        @keyframes dashFadeIn { 
          from { opacity: 0; transform: translateY(6px); } 
          to { opacity: 1; transform: translateY(0); } 
        }

        @media (max-width: 1060px) { 
          .dashboard-flex-layout { 
            grid-template-columns: 1fr !important; 
            gap: 24px !important; 
          } 
          .dashboard-alerts-section { 
            order: -1; 
            width: 100% !important; 
          } 
        }
      `}</style>
    </div>
  );
}
