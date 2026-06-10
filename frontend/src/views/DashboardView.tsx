import React, { useState, useEffect } from 'react';
import { BACKEND_URL, ADMIN_EMAIL } from '../utils/constants';

// 🎯 ÚJ IMPORT: Behozzuk a nyelvi kontextust
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

  // 🎯 ÚJ: Aktiváljuk a fordítót (t) és a nyelvet (lang)
  const { t, lang } = useLanguage();

  // 1. Memóriából betöltjük a korábban "ikszelt" értesítéseket
  useEffect(() => {
    const stored = localStorage.getItem('dismissed_alerts');
    if (stored) setDismissedAlerts(JSON.parse(stored));
  }, []);

  // 2. Értesítések lekérése
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

  // --- ÉRTESÍTÉSEK KEZELÉSE ---

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

  // 🎯 JAVÍTVA: A csempék címeit és leírásait kulcsalapúra cseréltük a szótárhoz
  const tiles = [
    { id: 'weekly_challenge', icon: '🔥', color: '#f97316', titleKey: 'tileWeeklyTitle', descKey: 'tileWeeklyDesc', tab: 'weekly_challenge' },
    { id: 'contests', icon: '📝', color: '#8b5cf6', titleKey: 'tileContestsTitle', descKey: 'tileContestsDesc', tab: 'contests_open_active' },
    { id: 'my_album', icon: '🖼️', color: '#f59e0b', titleKey: 'tilePortfolioTitle', descKey: 'tilePortfolioDesc', tab: 'my_album' },
    { id: 'map_spots', icon: '🌍', color: '#10b981', titleKey: 'tileMapTitle', descKey: 'tileMapDesc', tab: 'map_spots' },
    { id: 'progress', icon: '🏆', color: '#f43f5e', titleKey: 'tileProgressTitle', descKey: 'tileProgressDesc', tab: 'fiap_progress' },
    { id: 'salons', icon: '🌐', color: '#3b82f6', titleKey: 'tileSalonsTitle', descKey: 'tileSalonsDesc', tab: 'salons' },
    { id: 'club', icon: '👥', color: '#06b6d4', titleKey: 'tileClubLifeTitle', titleKeyFallback: 'tileClubTitle', descKey: 'tileClubDesc', tab: 'club_nights' }
  ];

  const adminTile = { id: 'admin', icon: '⚙️', color: '#ef4444', titleKey: 'tileAdminTitle', descKey: 'tileAdminDesc', tab: (user?.email === ADMIN_EMAIL) ? 'admin_contests' : 'admin_meetings' };

  // 🎯 JAVÍTVA: Dinamikus, nyelv-specifikus dátumformázás (hu-HU vs en-US)
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString(lang === 'en' ? 'en-US' : 'hu-HU', { month: 'short', day: 'numeric' });

  const visibleNews = alerts?.unreadNews?.filter((n: any) => !dismissedAlerts.includes(`news_${n.id}`)) || [];
  const visibleComments = alerts?.mapComments?.filter((c: any) => !dismissedAlerts.includes(`com_${c.comment_id}`)) || [];
  const visibleWeekly = Array.isArray(alerts?.weekly) ? alerts.weekly : [];
  const visibleHomeworks = alerts?.homeworks || [];
  const visibleContests = alerts?.contests || [];

  const hasAnyVisibleAlerts = visibleNews.length > 0 || visibleComments.length > 0 || visibleWeekly.length > 0 || visibleHomeworks.length > 0 || visibleContests.length > 0;

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Üdvözlő fejléc */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '30px', borderRadius: '16px', border: '1px solid #334155', marginBottom: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5rem', color: '#f8fafc' }}>
            {t('dashWelcome')}, <span style={{ color: '#38bdf8' }}>{user.name}</span>! 👋
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '1.1rem' }}>
            {t('dashSupportNotice')}
          </p>
        </div>
        {(user?.isPremium || user?.is_premium) && (
          <div style={{ background: '#10b98120', border: '1px solid #10b981', padding: '10px 20px', borderRadius: '100px', color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {t('dashPremiumBadge')}
          </div>
        )}
      </div>

      {/* --- ÉRTESÍTÉSI KÖZPONT --- */}
      <div style={{ marginBottom: '35px', minHeight: '130px' }}>
        <h2 style={{ fontSize: '1.2rem', color: '#cbd5e1', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {t('dashAlertsTitle')}
        </h2>
        
        {isLoadingAlerts ? (
          <div style={{ color: '#94a3b8', fontSize: '0.95rem', fontStyle: 'italic', padding: '25px', background: '#1e293b', borderRadius: '12px', border: '1px dashed #475569', textAlign: 'center', animation: 'pulse 2s infinite' }}>
            {t('dashSyncing')} <br/>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('dashSyncNotice')}</span>
          </div>
        ) : !alerts ? (
          <div style={{ color: '#ef4444', fontSize: '0.95rem', padding: '20px', background: '#ef444410', borderRadius: '12px', border: '1px solid #ef444450', textAlign: 'center' }}>
            {t('dashAlertsError')}
            <button onClick={() => window.location.reload()} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', marginLeft: '10px', fontWeight: 'bold' }}>
              {t('dashReload')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'thin', scrollbarColor: '#475569 transparent' }} className="custom-scrollbar">
            
            {visibleNews.map((news: any) => (
              <div key={`news_${news.id}`} onClick={() => handleNewsClick(news.id)} className="alert-card" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))', border: '1px solid #ef444450', borderLeft: '4px solid #ef4444' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📰</div>
                <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '2px', textTransform: 'uppercase' }}>{t('dashNewNews')}</div>
                <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{news.title}</h4>
              </div>
            ))}

            {visibleComments.map((comment: any) => (
              <div key={`com_${comment.comment_id}`} onClick={() => handleMapCommentClick(comment.location_id, comment.comment_id)} className="alert-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))', border: '1px solid #10b98150', borderLeft: '4px solid #10b981' }}>
                <button className="dismiss-btn" onClick={(e) => handleDismissAlert(e, `com_${comment.comment_id}`, 'map_comment', comment.comment_id)}>✖</button>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💬</div>
                <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '2px', textTransform: 'uppercase' }}>
                  {lang === 'en' ? `Map: ${comment.user_name} commented` : `Térkép: ${comment.user_name} írt`}
                </div>
                <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('dashLocation')}: {comment.location_title}</h4>
              </div>
            ))}

            {visibleWeekly.map((w: any) => {
              const displayWTitle = lang === 'en' && w.title_en ? w.title_en : w.title;
              return (
                <div key={`weekly_${w.id}`} onClick={() => setActiveTab('weekly_challenge')} className="alert-card" style={{ background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(249, 115, 22, 0.05))', border: '1px solid #f9731650', borderLeft: '4px solid #f97316' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔥</div>
                  <div style={{ color: '#f97316', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '2px', textTransform: 'uppercase' }}>{displayWTitle}</div>
                  <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>({lang === 'en' ? 'until ' : ''}{formatDate(w.end_date)})</h4>
                </div>
              );
            })}

            {visibleHomeworks.map((hw: any) => (
              <div key={`hw_${hw.id}`} onClick={() => setActiveTab('club_homeworks')} className="alert-card" style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(6, 182, 212, 0.05))', border: '1px solid #06b6d450', borderLeft: '4px solid #06b6d4' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📸</div>
                <div style={{ color: '#06b6d4', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '2px', textTransform: 'uppercase' }}>{t('dashHomework')} ({lang === 'en' ? 'until ' : ''}{formatDate(hw.deadline)})</div>
                <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hw.topic}</h4>
              </div>
            ))}

            {visibleContests.map((contest: any) => (
              <div key={`cont_${contest.id}`} onClick={() => setActiveTab('contests_open_active')} className="alert-card" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))', border: '1px solid #8b5cf650', borderLeft: '4px solid #8b5cf6' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🏆</div>
                <div style={{ color: '#8b5cf6', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '2px', textTransform: 'uppercase' }}>{t('dashActiveContest')} ({lang === 'en' ? 'until ' : ''}{formatDate(contest.end_date)})</div>
                <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contest.title}</h4>
              </div>
            ))}

            {!hasAnyVisibleAlerts && (
              <div style={{ color: '#64748b', fontSize: '0.95rem', fontStyle: 'italic', padding: '10px 0', width: '100%', textAlign: 'center' }}>
                {t('dashNoAlerts')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Csempék (Grid hálózat - lefordítva) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {tiles.map((tile) => (
          <div 
            key={tile.id}
            className="dashboard-tile"
            onClick={() => setActiveTab(tile.tab)}
            style={{ 
              background: '#1e293b', 
              borderRadius: '16px', 
              padding: '25px', 
              cursor: 'pointer', 
              border: '1px solid #334155',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: tile.color, opacity: 0.1, filter: 'blur(30px)', borderRadius: '50%' }}></div>
            
            <div style={{ fontSize: '3rem', marginBottom: '15px', display: 'inline-block', background: `${tile.color}20`, padding: '15px', borderRadius: '12px', border: `1px solid ${tile.color}40` }}>
              {tile.icon}
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', color: '#f8fafc' }}>
              {t(tile.titleKey as any)}
            </h3>
            <p style={{ margin: 0, color: '#94a3b8', lineHeight: '1.5' }}>
              {t(tile.descKey as any)}
            </p>
          </div>
        ))}

        {(user?.email === ADMIN_EMAIL || isLeader) && (
          <div 
            className="dashboard-tile admin-tile"
            onClick={() => setActiveTab(adminTile.tab)}
            style={{ 
              background: '#1e293b', 
              borderRadius: '16px', 
              padding: '25px', 
              cursor: 'pointer', 
              border: `1px dashed ${adminTile.color}60`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '15px', display: 'inline-block', background: `${adminTile.color}20`, padding: '15px', borderRadius: '12px', border: `1px solid ${adminTile.color}40` }}>
              {adminTile.icon}
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', color: adminTile.color }}>
              {t(adminTile.titleKey as any)}
            </h3>
            <p style={{ margin: 0, color: '#94a3b8', lineHeight: '1.5' }}>
              {t(adminTile.descKey as any)}
            </p>
          </div>
        )}

      </div>

      <style>{`
        .dashboard-tile:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 30px rgba(0,0,0,0.3);
          border-color: #475569;
        }
        .admin-tile:hover {
          border-color: #ef4444 !important;
          background: #ef444410 !important;
        }
        
        .alert-card {
          min-width: 220px;
          max-width: 280px;
          padding: 15px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease-out;
          flex-shrink: 0;
          position: relative;
        }
        .alert-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.25);
          filter: brightness(1.2);
        }

        .dismiss-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 1.1rem;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .dismiss-btn:hover {
          background: rgba(255,255,255,0.1);
          color: #f8fafc;
        }

        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; border-radius: 10px; }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
