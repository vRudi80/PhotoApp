import React, { useState, useEffect, useRef } from 'react';
import { BACKEND_URL } from '../utils/constants';

// 🎯 Nyelvi kontextus aktiválása
import { useLanguage } from '../context/LanguageContext';

interface ProfileViewProps {
  user: any; // Ez az adatbázisból jövő currentDbUser az App.tsx-ből
  setUser: (u: any) => void;
  fetchData: () => void;
}

export default function ProfileView({ user, setUser, fetchData }: ProfileViewProps) {
  const inputStyle = { width: '100%', padding: '12px', marginBottom: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '10px', boxSizing: 'border-box' as const, fontSize: '0.95rem', outline: 'none', transition: 'border 0.2s' };

  const [activeClubs, setActiveClubs] = useState<any[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 🎯 PROFIL ÁLLAPOTOK
  const [nameInput, setNameInput] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [associationId, setAssociationId] = useState<string>('');
  const [membershipStart, setMembershipStart] = useState<string>('');
  const [membershipEnd, setMembershipEnd] = useState<string>('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // 📸 PROFILKÉP ÁLLAPOTOK
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tárhely és AI használat követése
  const [userStorage, setUserStorage] = useState({ count: 0, bytes: 0 });
  const [aiUsageCount, setAiUsageCount] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const { t, lang } = useLanguage();

  const isLeader = user?.club_role === 'leader' || user?.club_role === 'deputy';

  // 🔄 Profiladatok és a naplózott tagsági dátumok szinkronizálása
  const loadFreshProfile = async () => {
    if (!user?.email) return;
    try {
      // 1. Felhasználói alapadatok lekérése
      const res = await fetch(`${BACKEND_URL}/api/users/${user.email}`);
      if (res.ok) {
        const freshData = await res.json();
        setNameInput(freshData.name || '');
        setPhone(freshData.phone_number || freshData.phone || '');
        setAddress(freshData.shipping_address || freshData.address || '');
        setAssociationId(freshData.association_id || '');
        if (freshData.avatar_url) {
          setAvatarPreview(freshData.avatar_url);
        }
        if (freshData.ai_usage_count !== undefined) {
          setAiUsageCount(freshData.ai_usage_count);
        }
      }

      // 2. 🎯 JAVÍTVA: Közvetlenül a tagsági napló API-ból húzzuk be a dátumokat!
      const resDates = await fetch(`${BACKEND_URL}/api/profile/active-membership?userEmail=${user.email}`);
      if (resDates.ok) {
        const datesData = await resDates.json();
        setMembershipStart(datesData.membership_start || '');
        setMembershipEnd(datesData.membership_end || '');
      }

    } catch (e) {
      console.error("Nem sikerült szinkronizálni a profilképet és adatokat:", e);
    }
  };

  useEffect(() => {
    if (user?.email) {
      loadFreshProfile();
    }
  }, [user?.email]);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/clubs/active-only`)
      .then(res => res.json())
      .then(data => setActiveClubs(data || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    
    const fetchUserStats = async () => {
      setIsLoadingStats(true);
      try {
        const resStorage = await fetch(`${BACKEND_URL}/api/admin/user-storage-stats`);
        if (resStorage.ok) {
          const allStats = await resStorage.json();
          const myStats = allStats.find((s: any) => s.user_email === user.email);
          if (myStats) {
            setUserStorage({
              count: myStats.total_photos || 0,
              bytes: Number(myStats.total_bytes) || 0
            });
          }
        }
        if (user?.ai_usage_count !== undefined) {
          setAiUsageCount(user.ai_usage_count);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingStats(false);
      }
    };
    fetchUserStats();
  }, [user]);

  const loadPendingMembers = () => {
    const matchedClub = activeClubs.find(c => c.name === user?.club_name);
    const effectiveClubId = user?.club_id || matchedClub?.id;
    if (isLeader && effectiveClubId) {
      fetch(`${BACKEND_URL}/api/clubs/pending-members?clubId=${effectiveClubId}`)
        .then(res => res.json())
        .then(data => setPendingMembers(data || []))
        .catch(console.error);
    }
  };

  useEffect(() => {
    loadPendingMembers();
  }, [user, isLeader, activeClubs]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      setAvatarPreview(URL.createObjectURL(file));
      setIsUploadingAvatar(true);

      const formData = new FormData();
      formData.append('avatar', file);

      try {
        const res = await fetch(`${BACKEND_URL}/api/users/${user.email}/avatar`, {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const responseData = await res.json();
          if (responseData.avatar_url) {
            setAvatarPreview(responseData.avatar_url);
            setUser({ ...user, avatar_url: responseData.avatar_url });
          }
          alert(lang === 'en' ? "Profile picture updated successfully!" : "Profilkép sikeresen frissítve! 📸");
          loadFreshProfile();
          fetchData(); 
        } else {
          const err = await res.json();
          alert(err.error || "Hiba történt a profilkép feltöltése közben.");
          loadFreshProfile();
        }
      } catch (err) {
        alert(t('msgNetworkError') || "Hálózati hiba lépett fel.");
        loadFreshProfile();
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return alert(t('msgEmptyName') || "A név megadása kötelező!");

    setIsSavingProfile(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/${user.email}/extended-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.trim(),
          phone_number: phone.trim(),
          shipping_address: address.trim(),
          association_id: associationId.trim()
        })
      });

      if (res.ok) {
        alert(lang === 'en' ? "Profile successfully updated!" : "Profil adatok sikeresen frissítve! 🚀");
        loadFreshProfile();
        fetchData(); 
      } else {
        const err = await res.json();
        alert(err.error || "Hiba a mentés során");
      }
    } catch (e) {
      alert(t('msgNetworkError'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleJoinClub = async () => {
    if (!selectedClubId) return alert(t('msgSelectClubError'));
    const targetClub = activeClubs.find(c => String(c.id) === selectedClubId);
    if (!targetClub) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/clubs/join-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email, clubId: targetClub.id, clubName: targetClub.name })
      });
      if (res.ok) {
        alert(lang === 'en' ? `✉️ Request sent to the leadership of "${targetClub.name}"!` : `✉️ Kérelem elküldve a(z) "${targetClub.name}" vezetőségének!`);
        fetchData();
      }
    } catch (e) { alert(t('msgNetworkError')); }
    finally { setIsSubmitting(false); }
  };

  const handleDecision = async (targetEmail: string, action: 'approve' | 'reject') => {
    const confirmText = action === 'approve' ? t('msgApproveConfirm') : t('msgRejectConfirm');
    if (!window.confirm(confirmText)) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/clubs/handle-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmail, action, clubId: user?.club_id, clubName: user?.club_name })
      });
      if (res.ok) {
        alert(action === 'approve' ? t('msgApproveSuccess') : t('msgRejectSuccess'));
        loadPendingMembers();
        fetchData();
      }
    } catch (e) { console.error(e); }
  };

  const getRoleText = (role: string) => {
    return role === 'leader' ? t('roleLeader') : role === 'deputy' ? t('roleDeputy') : t('roleMember');
  };

  const formatExactStorage = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 MB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString(lang === 'en' ? 'en-US' : 'hu-HU', { 
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
      });
    } catch (e) { return dateStr; }
  };

  const getClubStatusMessage = () => {
    if (user?.club_role === 'pending') {
      return t('profClubPending').replace('{club}', user?.club_name || '');
    }
    if (user?.club_name) {
      const roleText = user?.club_role === 'leader' ? t('roleLeader') : user?.club_role === 'deputy' ? t('roleDeputy') : t('roleMember');
      return t('profClubActive').replace('{club}', user.club_name).replace('{role}', roleText);
    }
    return t('profClubNone');
  };

  const isPremiumActive = user?.is_premium === 1;
  const hasExpiredPremium = user?.is_premium === 0 && user?.premium_until;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', maxWidth: '900px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* 👑 SZEKCIÓ 1: KIEMELT PROFIL KÁRTYA (FEJLÉC PANEL) */}
      <div style={{ backgroundColor: '#1e293b', padding: '25px 30px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '25px', flexWrap: 'wrap' }}>
        
        {/* Profilkép kör */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div 
            onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
            style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#090d16', border: isUploadingAvatar ? '3px dashed #38bdf8' : '3px solid #475569', overflow: 'hidden', cursor: isUploadingAvatar ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.4)', position: 'relative' }}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '2.2rem', color: '#475569' }}>👤</span>
            )}
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', transition: 'all 0.2s' }} onMouseEnter={e => { if(!isUploadingAvatar) e.currentTarget.style.opacity = '1'; }} onMouseLeave={e => { if(!isUploadingAvatar) e.currentTarget.style.opacity = '0'; }}>
              {isUploadingAvatar ? '⏳' : 'CSERE 📷'}
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" style={{ display: 'none' }} />
        </div>

        {/* Név, email és Prémium plecsni egymás alatt */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '1.7rem', color: '#f8fafc', fontWeight: '900' }}>{nameInput || user?.name || 'Anonim Tag'}</h2>
          <div style={{ fontSize: '0.9rem', color: '#64748b', fontFamily: 'monospace', fontWeight: 'bold' }}>{user?.email}</div>
          
          <div style={{ marginTop: '12px' }}>
            {isPremiumActive ? (
              <span style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '4px 14px', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}>👑 PRÉMIUM TAG ({formatDate(user?.premium_until)})</span>
            ) : hasExpiredPremium ? (
              <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 14px', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 'bold' }}>⏳ LEJÁRT PREM ({formatDate(user?.premium_until)})</span>
            ) : (
              <span style={{ background: '#334155', color: '#94a3b8', padding: '4px 14px', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 'bold' }}>🌱 INGYENES HOZZÁFÉRÉS</span>
            )}
          </div>
        </div>
      </div>

      {/* 👥 KÉTOSZLOPOS BENTO-GRID LAYOUT */}
      <div className="profile-bento-grid">
        
        {/* BAL OSZLOP: HIVATALOS ADATLAP FORM */}
        <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#f8fafc', fontSize: '1.2rem', fontWeight: 'bold' }}>📝 Személyes Adatok Frissítése</h3>
          
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{t('profLabelName')}</label>
              <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)} style={inputStyle} placeholder={t('profPlaceholderName')} disabled={isSavingProfile} />

              <label style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Telefonszám</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} placeholder="+36 30 123 4567" disabled={isSavingProfile} />

              <label style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Értesítési / Postázási Cím</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} style={inputStyle} placeholder="Irányítószám, Város, Utca, Házszám" disabled={isSavingProfile} />

              <label style={{ fontSize: '0.8rem', color: '#a78bfa', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Igazolványszám (Opcionális)</label>
              <input type="text" value={associationId} onChange={e => setAssociationId(e.target.value)} style={inputStyle} placeholder="FP-XXXX" disabled={isSavingProfile} />
            </div>

            <button type="submit" disabled={isSavingProfile || !nameInput.trim()} style={{ width: '100%', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: isSavingProfile ? 'not-allowed' : 'pointer', transition: 'all 0.2s', marginTop: '10px' }}>
              {isSavingProfile ? 'Mentés...' : 'Változtatások Mentése ✔'}
            </button>
          </form>
        </div>

       {/* JOBB OSZLOP: KLUBTAGSÁG ÉS MŰSZAKI METRIKÁK */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* 🏛️ MODUL: FOTÓKLUB TAGSÁGI ADATLAP */}
          <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#38bdf8', fontSize: '1.2rem', fontWeight: 'bold' }}>🏛️ {t('profClubTitle')}</h3>
            
            {/* 🎯 JAVÍTVA: Csak akkor mutatjuk a teljes tagsági kártyát, ha a klub_role NEM pending! */}
            {user?.club_name && user?.club_role !== 'pending' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#0f172a', padding: '15px', borderRadius: '14px', border: '1px solid rgba(56, 189, 248, 0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: '#64748b' }}>Fotóklub:</span>
                  <strong style={{ color: 'white' }}>{user.club_name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: '#64748b' }}>Beosztás:</span>
                  <span style={{ background: '#38bdf820', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>{getRoleText(user?.club_role || 'member')}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderTop: '1px dashed #223147', paddingTop: '8px', marginTop: '4px' }}>
                  <span style={{ color: '#64748b' }}>Tagság ideje:</span>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                    {membershipStart || 'Nincs rögzítve'} — {membershipEnd || 'Folyamatos'}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                {/* Itt most már tökéletesen lefut a függőben lévő kérelem üzenete! */}
                <div style={{ background: '#0f172a', padding: '12px', borderRadius: '10px', color: '#94a3b8', fontSize: '0.88rem', marginBottom: '15px', fontStyle: 'italic' }}>
                  {getClubStatusMessage()}
                </div>
                {user?.club_role !== 'pending' && (
                  <>
                    <select value={selectedClubId} onChange={e => setSelectedClubId(e.target.value)} style={inputStyle}>
                      <option value="">{t('profSelectClub')}</option>
                      {activeClubs.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                    </select>
                    <button onClick={handleJoinClub} disabled={isSubmitting} style={{ width: '100%', background: 'linear-gradient(135deg, #38bdf8, #0284c7)', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                      {t('profSendRequest')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 📊 MODUL: RENDSZER STATISZTIKÁK */}
          <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ background: '#0f172a', padding: '14px', borderRadius: '12px', border: '1px solid #223147', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>{t('profStorageLabel')}</span>
              {isLoadingStats ? <span style={{ color: '#475569', fontSize: '0.85rem' }}>⏳</span> : (
                <>
                  <span style={{ color: '#38bdf8', fontSize: '1.25rem', fontWeight: '900' }}>{userStorage.count} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#64748b' }}>db kép</span></span>
                  <span style={{ color: '#a78bfa', fontSize: '0.85rem', fontWeight: 'bold' }}>{formatExactStorage(userStorage.bytes)}</span>
                </>
              )}
            </div>

            <div style={{ background: '#0f172a', padding: '14px', borderRadius: '12px', border: '1px solid #223147', display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>{t('profAiLabel')}</span>
              <span style={{ color: aiUsageCount > 0 ? '#38bdf8' : '#64748b', fontSize: '1.25rem', fontWeight: '900' }}>{aiUsageCount} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#64748b' }}>elemzés</span></span>
              <span style={{ fontSize: '0.65rem', color: '#475569', fontStyle: 'italic', marginTop: '2px' }}>EXIF pajzs védelem</span>
            </div>
          </div>

        </div>
      </div>

      {/* 👑 SZEKCIÓ 3: KLUBVEZETŐI JÓVÁHAGYÓ PANEL */}
      {isLeader && (
        <div style={{ backgroundColor: '#1e293b', padding: '25px 30px', borderRadius: '24px', border: '1px solid #10b981', boxShadow: '0 10px 30px rgba(16,185,129,0.08)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#10b981', fontSize: '1.25rem', fontWeight: 'bold' }}>{t('profLeaderTitle')} ({user?.club_name || ''})</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0' }}>{t('profLeaderNotice')}</p>
          
          {pendingMembers.length === 0 ? (
            <div style={{ padding: '12px', background: '#0f172a', borderRadius: '12px', color: '#475569', textAlign: 'center', fontStyle: 'italic', fontSize: '0.9rem' }}>{t('profNoPending')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingMembers.map(m => (
                <div key={m.email} style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <strong style={{ color: 'white', display: 'block' }}>{m.name}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{m.email}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleDecision(m.email, 'approve')} style={{ background: '#10b981', color: '#0f172a', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{t('profApprove')}</button>
                    <button onClick={() => handleDecision(m.email, 'reject')} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef444440', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>{t('profReject')}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 🎯 SZEKCIÓ 4: TÖRTÉNETI PÉNZÜGYI PANEL */}
      <UserMembershipAndPaymentsBlock userEmail={user?.email || ''} />

      {/* ── 🎯 RESPONSIVE GRID CSS STYLING ── */}
      <style>{`
        .profile-bento-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 25px;
          width: 100%;
        }
        @media (min-width: 768px) {
          .profile-bento-grid {
            grid-template-columns: 1.1fr 1fr !important;
          }
        }
      `}</style>

    </div>
  );
}

// 💳 HOISTED AL-KOMPONENS: ÉVES TAGDÍJAK ÉS HISTÓRIKUS BEFIZETÉSEK
function UserMembershipAndPaymentsBlock({ userEmail }: { userEmail: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) return;
    fetch(`${BACKEND_URL}/api/profile/my-payments?userEmail=${userEmail}`)
      .then(res => res.json())
      .then(data => {
        setHistory(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userEmail]);

  if (!userEmail) return null;
  if (loading) return <div style={{ color: '#64748b', fontSize: '0.85rem', padding: '15px', textAlign: 'center' }}>⏳ Pénzügyi múlt szinkronizálása...</div>;

  return (
    <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#fbbf24', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        💳 Éves Tagdíjak & Befizetések Előzményei
      </h3>
      
      {history.length === 0 ? (
        <div style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic', padding: '10px 0' }}>
          Még nincs könyvelt tagdíj-befizetésed a rendszerben.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {history.map((row, index) => {
            const isSettled = Number(row.outstanding_balance) <= 0;
            return (
              <div key={index} style={{ background: '#0f172a', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${isSettled ? '#10b98130' : '#f9731630'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#f8fafc' }}>{row.fiscal_year}. Éves Tagdíj</div>
                  <div style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 'bold', marginTop: '3px' }}>🏛️ {row.target_club_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                    {row.payment_date ? `Könyvelve: ${row.payment_date}` : 'Még nincs könyvelt dátum'}
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: '900', color: isSettled ? '#10b981' : '#f97316' }}>
                    {row.paid_amount} / {row.fee_amount} Ft
                  </div>
                  {!isSettled && (
                    <small style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: 'bold', display: 'block', marginTop: '2px' }}>
                      Hátralék: {row.outstanding_balance} Ft
                    </small>
                  )}
                  {isSettled && (
                    <small style={{ color: '#10b981', fontSize: '0.72rem', fontWeight: 'bold', display: 'block', marginTop: '2px' }}>
                      ✓ Rendezve
                    </small>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
