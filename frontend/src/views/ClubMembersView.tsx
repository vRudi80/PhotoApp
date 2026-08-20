import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface ClubMembersViewProps {
  user: any;
  allUsers: any[];
}

export default function ClubMembersView({ user, allUsers }: ClubMembersViewProps) {
  const { lang } = useLanguage();
  
  let isLight = false;
  try {
    const themeContext = useTheme();
    if (themeContext) {
      isLight = themeContext.theme === 'light';
    }
  } catch (e) {}

  const silhouetteAvatar = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23475569'><circle cx='12' cy='8' r='4'/><path d='M12 14c-6.1 0-10 4-10 4v2h20v-2s-3.9-4-10-4z'/></svg>";

  const userClub = user?.club_name;

  // Csak a felhasználó klubjának AKTÍV tagjait szűrjük ki
  const activeClubMembers = (Array.isArray(allUsers) ? allUsers : []).filter(u => {
    const isSameClub = u.club_name && u.club_name === userClub;
    const isActive = !u.left_at || String(u.left_at).trim() === '';
    return isSameClub && isActive;
  });

  const getRoleBadge = (role: string) => {
    if (role === 'leader') {
      return { 
        text: 'Vezető', 
        color: isLight ? '#b45309' : '#f59e0b', 
        bg: isLight ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.15)', 
        border: '1px solid rgba(245, 158, 11, 0.3)' 
      };
    }
    if (role === 'deputy') {
      return { 
        text: 'Helyettes', 
        color: isLight ? '#7c3aed' : '#a78bfa', 
        bg: isLight ? 'rgba(124, 58, 237, 0.12)' : 'rgba(167, 139, 250, 0.15)', 
        border: '1px solid rgba(167, 139, 250, 0.3)' 
      };
    }
    return { 
      text: 'Klubtag', 
      color: isLight ? '#047857' : '#10b981', 
      bg: isLight ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.12)', 
      border: '1px solid rgba(16, 185, 129, 0.25)' 
    };
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px 16px', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.8rem', color: isLight ? '#d97706' : '#f59e0b', margin: 0, fontWeight: '800' }}>
          👥 {userClub ? `${userClub} — Tagok` : (lang === 'en' ? 'Club Members' : 'Klubtagok')}
        </h2>
        <p style={{ color: 'var(--text-body, #94a3b8)', fontSize: '0.9rem', marginTop: '4px' }}>
          {lang === 'en' ? 'Active members of your photo club' : 'A fotóklubod aktív tagjai és elérhetőségei'}
        </p>
      </div>

      {!userClub ? (
        <div style={{ background: 'var(--bg-card, #1e293b)', padding: '30px', borderRadius: '12px', border: '1px solid var(--border-main, #334155)', textAlign: 'center', color: 'var(--text-body, #94a3b8)' }}>
          Nem vagy még tagja egyetlen fotóklubnak sem.
        </div>
      ) : activeClubMembers.length === 0 ? (
        <div style={{ background: 'var(--bg-card, #1e293b)', padding: '30px', borderRadius: '12px', border: '1px solid var(--border-main, #334155)', textAlign: 'center', color: 'var(--text-body, #94a3b8)' }}>
          Még nincsenek rögzített aktív tagok ebben a klubban.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {activeClubMembers.map((member, idx) => {
            const avatar = member.avatar_url || member.picture || silhouetteAvatar;
            const hasWebsite = member.website_url && member.website_url.trim().length > 0;
            const website = hasWebsite ? (member.website_url.startsWith('http') ? member.website_url : `https://${member.website_url}`) : '';
            const roleBadge = getRoleBadge(member.club_role);

            return (
              <div 
                key={member.email || idx}
                style={{
                  background: 'var(--bg-card, #1e293b)',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '1px solid var(--border-main, #334155)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  boxShadow: isLight ? '0 4px 15px rgba(0,0,0,0.05)' : '0 4px 15px rgba(0,0,0,0.25)'
                }}
              >
                {/* PROFILKÉP ÉS NÉV */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <img 
                    src={avatar} 
                    alt="" 
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = silhouetteAvatar; }}
                    style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${roleBadge.color}`, flexShrink: 0, backgroundColor: isLight ? '#e2e8f0' : '#090d16' }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    {/* 🎯 Név kiírás automatikus soremeléssel */}
                    <h4 style={{ margin: 0, color: 'var(--text-title, #f8fafc)', fontSize: '0.95rem', fontWeight: 'bold', wordBreak: 'break-word', lineHeight: '1.25' }}>
                      {member.name || 'Névtelen Tag'}
                    </h4>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: roleBadge.color, 
                      backgroundColor: roleBadge.bg,
                      border: roleBadge.border,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      display: 'inline-block',
                      marginTop: '6px'
                    }}>
                      {roleBadge.text}
                    </span>
                  </div>
                </div>

                {/* QR KÓD (CSAK HA VAN WEBOLDAL LINK) */}
                {hasWebsite && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(website)}`} 
                      alt="QR Code" 
                      referrerPolicy="no-referrer"
                      style={{ width: '65px', height: '60px', borderRadius: '6px', border: '1px solid var(--border-main, #334155)', backgroundColor: '#ffffff', padding: '3px' }}
                    />
                    <a 
                      href={website} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ color: isLight ? '#0284c7' : '#38bdf8', fontSize: '0.7rem', textDecoration: 'none', fontWeight: 'bold' }}
                    >
                      Weboldal 🌐
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
