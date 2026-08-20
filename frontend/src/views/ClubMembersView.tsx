import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface ClubMembersViewProps {
  user: any;
  allUsers: any[];
}

export default function ClubMembersView({ user, allUsers }: ClubMembersViewProps) {
  const { lang } = useLanguage();
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
        color: '#f59e0b'
      };
    }
    if (role === 'deputy') {
      return {
        text: 'Helyettes',
        color: '#a78bfa'
      };
    }
    return {
      text: 'Klubtag',
      color: '#10b981'
    };
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px 16px', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.8rem', color: '#f59e0b', margin: 0, fontWeight: '800' }}>
          👥 {userClub ? `${userClub} — Tagok` : (lang === 'en' ? 'Club Members' : 'Klubtagok')}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
          {lang === 'en' ? 'Active members of your photo club' : 'A fotóklubod aktív tagjai és elérhetőségei'}
        </p>
      </div>

      {!userClub ? (
        <div style={{ background: '#1e293b', padding: '30px', borderRadius: '12px', border: '1px solid #334155', textAlign: 'center', color: '#94a3b8' }}>
          Nem vagy még tagja egyetlen fotóklubnak sem.
        </div>
      ) : activeClubMembers.length === 0 ? (
        <div style={{ background: '#1e293b', padding: '30px', borderRadius: '12px', border: '1px solid #334155', textAlign: 'center', color: '#94a3b8' }}>
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
                  background: '#1e293b',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '1px solid #334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                }}
              >
                {/* PROFILKÉP ÉS NÉV */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <img 
                    src={avatar} 
                    alt="" 
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = silhouetteAvatar; }}
                    style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${roleBadge.color}`, flexShrink: 0, backgroundColor: '#090d16' }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {member.name || 'Névtelen Tag'}
                    </h4>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: roleBadge.color, 
                      fontWeight: '600',
                      display: 'inline-block',
                      marginTop: '2px'
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
                      style={{ width: '65px', height: '60px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#ffffff', padding: '3px' }}
                    />
                    <a 
                      href={website} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ color: '#38bdf8', fontSize: '0.7rem', textDecoration: 'none', fontWeight: 'bold' }}
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
