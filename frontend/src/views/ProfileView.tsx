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
  const inputStyle = { width: '100%', padding: '12px', marginBottom: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '10px', boxSizing: 'border-box' as const, fontSize: '0.95rem', outline: 'none' };

  const [activeClubs, setActiveClubs] = useState<any[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 🎯 KORSZERŰSÍTETT PROFIL ÁLLAPOTOK
  const [nameInput, setNameInput] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [associationId, setAssociationId] = useState<string>('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // 📸 PROFILKÉP ÁLLAPOTOK
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tárhely és AI használat követéséhez szükséges állapotok (MEGMARADT ✔)
  const [userStorage, setUserStorage] = useState({ count: 0, bytes: 0 });
  const [aiUsageCount, setAiUsageCount] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const { t, lang } = useLanguage();

  const isLeader = user?.club_role === 'leader' || user?.club_role === 'deputy';

  // Alapadatok folyamatos szinkronizálása a belépett felhasználóval (BŐVÍTVE ✔)
  useEffect(() => {
    if (user) {
      setNameInput(user.name || '');
      setPhone(user.phone_number || user.phone || '');
      setAddress(user.shipping_address || user.address || '');
      setAssociationId(user.association_id || '');
      setAvatarPreview(user.avatar_url || null);
    }
  }, [user]);

  // 1. Csak a vezetővel rendelkező klubok betöltése (MEGMARADT ✔)
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/clubs/active-only`)
      .then(res => res.json())
      .then(data => setActiveClubs(data || []))
      .catch(console.error);
  }, []);

  // 2. Felhasználó specifikus tárhely és AI statisztikák betöltése (MEGMARADT ✔)
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
        
        if (user.ai_usage_count !== undefined) {
          setAiUsageCount(user.ai_usage_count);
        }
      } catch (e) {
        console.error("Hiba a felhasználói statisztikák betöltésekor", e);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchUserStats();
  }, [user]);

  // 3. Függőben lévő tagok betöltése vezetőknek (MEGMARADT ✔)
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

  // 📸 PROFILKÉP AZONNALI HÁTTÉRBELI FELTÖLTÉSE UX MOTOR
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Kliensoldali azonnali gyors előnézet generálása
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
          alert(lang === 'en' ? "Profile picture updated successfully!" : "Profilkép sikeresen frissítve! 📸");
          fetchData(); // Globális állapotok újratöltése a friss kép-URL miatt
        } else {
          const err = await res.json();
          alert(err.error || "Hiba történt a profilkép feltöltése közben.");
        }
      } catch (err) {
        alert(t('msgNetworkError') || "Hálózati kommunikációs hiba lépett fel.");
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  // 4. Teljes, egyesített profil mentés az új végpontra
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

  // 5. Csatlakozási kérelem leadása (MEGMARADT ✔)
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

  // 6. Kérelem elbírálása (MEGMARADT ✔)
  const handleDecision = async (targetEmail: string, action: 'approve' | 'reject') => {
    const confirmText = action === 'approve' ? t('msgApproveConfirm') : t('msgRejectConfirm');
    if (!window.confirm(confirmText)) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/clubs/handle-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmail, action })
      });
      if (res.ok) {
        alert(action === 'approve' ? t('msgApproveSuccess') : t('msgRejectSuccess'));
        loadPendingMembers();
        fetchData();
      }
    } catch (e) { console.error(e); }
  };

  const getClubStatusMessage = () => {
    if (user?.club_role === 'pending') {
      return t('profClubPending').replace('{club}', user.club_name);
    }
    if (user?.club_name) {
      const roleText = user.club_role === 'leader' 
        ? t('roleLeader') 
        : user.club_role === 'deputy' 
          ? t('roleDeputy') 
          : t('roleMember');
      return t('profClubActive').replace('{club}', user.club_name).replace('{role}', roleText);
    }
    return t('profClubNone');
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

  const isPremiumActive = user?.is_premium === 1;
  const hasExpiredPremium = user?.is_premium === 0 && user?.premium_until;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '600px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* ── SZEKCIÓ 1: DIAGNOSZTIKAI ÉS FINANCIÁLIS METRIKÁK KÁRTYÁJA ── */}
      <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#f8fafc', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚙️</span> {t('profStatusTitle')}
        </h3>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
            {t('profEmailLabel')}
          </label>
          <div style={{ width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid #1e293b', color: '#64748b', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
            {user?.email}
          </div>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
            {t('profSubLabel')}
          </label>
          {isPremiumActive ? (
            <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), transparent)', border: '1px solid #10b981', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.1rem', display: 'block' }}>👑 Premium Member</span>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{t('profPremiumActive')}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>{t('profPremiumValid')}</span>
                <span style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '0.9rem' }}>{formatDate(user.premium_until)}</span>
              </div>
            </div>
          ) : hasExpiredPremium ? (
            <div style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.1), transparent)', border: '1px solid #ef4444', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1.1rem', display: 'block' }}>⏳ {t('profPremiumExpired')}</span>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{t('profPremiumExpiredDesc')}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>{t('profPremiumExpiredOn')}</span>
                <span style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '0.9rem' }}>{formatDate(user.premium_until)}</span>
              </div>
            </div>
          ) : (
            <div style={{ background: '#0f172a', border: '1px solid #334155', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: '#cbd5e1', fontWeight: 'bold', fontSize: '1.1rem', display: 'block' }}>⚪ {t('profFreeTier')}</span>
                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{t('profFreeTierDesc')}</span>
              </div>
              <span style={{ fontSize: '1.5rem' }}>🌱</span>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', border: '1px solid #223147', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('profStorageLabel')}</span>
            {isLoadingStats ? <span style={{ color: '#475569', fontSize: '0.9rem' }}>⏳...</span> : (
              <>
                <span style={{ color: '#38bdf8', fontSize: '1.3rem', fontWeight: '900' }}>{userStorage.count} <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#64748b' }}>{t('profStorageSub')}</span></span>
                <span style={{ color: '#a78bfa', fontSize: '0.9rem', fontWeight: 'bold' }}>{formatExactStorage(userStorage.bytes)}</span>
              </>
            )}
          </div>

          <div style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', border: '1px solid #223147', display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('profAiLabel')}</span>
            <span style={{ color: aiUsageCount > 0 ? '#38bdf8' : '#64748b', fontSize: '1.3rem', fontWeight: '900', marginTop: '4px' }}>{aiUsageCount} <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#64748b' }}>{t('profAiSub')}</span></span>
            <span style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic' }}>{t('profAiDesc')}</span>
          </div>
        </div>
      </div>
      
      {/* ── SZEKCIÓ 2: HIVATALOS ADATOK KÁRTYA ÉS PROFILKÉP PANEL ── */}
      <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <h3 style={{ margin: '0 0 4px 0', color: '#f8fafc', fontSize: '1.25rem' }}>{t('profTitle')}</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 20px 0' }}>{t('profNotice')}</p>
        
        {/* 📸 INTERAKTÍV PROFILKÉP ZÓNA (ÚJ!) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '25px', position: 'relative' }}>
          <div 
            onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
            style={{ 
              width: '110px', 
              height: '110px', 
              borderRadius: '50%', 
              backgroundColor: '#090d16', 
              border: isUploadingAvatar ? '3px dashed #38bdf8' : '3px solid #334155', 
              overflow: 'hidden', 
              cursor: isUploadingAvatar ? 'not-allowed' : 'pointer', 
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { if(!isUploadingAvatar) e.currentTarget.style.borderColor = '#38bdf8'; }}
            onMouseLeave={e => { if(!isUploadingAvatar) e.currentTarget.style.borderColor = '#334155'; }}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '2.5rem', color: '#475569' }}>👤</span>
            )}

            {/* Lebegő réteg töltés vagy hover esetére */}
            <div style={{ 
              position: 'absolute', 
              inset: 0, 
              backgroundColor: isUploadingAvatar ? 'rgba(15,23,42,0.8)' : 'rgba(15,23,42,0.4)', 
              opacity: isUploadingAvatar ? 1 : 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              transition: 'opacity 0.2s',
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: 'bold'
            }}
            className="avatar-overlay"
            onMouseEnter={e => { if(!isUploadingAvatar) e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={e => { if(!isUploadingAvatar) e.currentTarget.style.opacity = '0'; }}
            >
              {isUploadingAvatar ? '⏳...' : (lang === 'en' ? 'Change 📷' : 'Módosítás 📷')}
            </div>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarChange} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
          <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>
            {lang === 'en' ? 'Click on the avatar to upload picture' : 'Kattints a körre a kép feltöltéséhez'}
          </span>
        </div>

        <form onSubmit={handleSaveProfile}>
          {/* 1. Név mező */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold' }}>{t('profLabelName')}</label>
            <input 
              type="text" 
              value={nameInput} 
              onChange={e => setNameInput(e.target.value)} 
              style={{ ...inputStyle, border: nameInput.trim() === user?.name ? '1px solid #334155' : '1px solid #38bdf8' }} 
              placeholder={t('profPlaceholderName')}
              disabled={isSavingProfile}
            />
          </div>

          {/* 💡 Kötelező MAFOSZ sáv */}
          <div style={{ background: 'rgba(245, 158, 11, 0.04)', borderLeft: '4px solid #f59e0b', padding: '14px', borderRadius: '0 10px 10px 0', marginBottom: '20px', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5' }}>
            		📌 <b>{lang === 'en' ? 'Official Requirement:' : 'Kötelező Pályázati Adatok:'}</b>
            <br />
            {lang === 'en' 
              ? 'A contact phone number and exact shipping address are required to receive awards, physical catalogs, and medals.' 
              : 'A pontos postázási cím és telefonszám megadása kötelező a kiállítási évkönyvek, érmek és nyomtatott oklevelek kézbesítéséhez.'}
          </div>

          {/* 2. Telefonszám mező */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold' }}>{lang === 'en' ? 'Phone Number' : 'Telefonszám'}</label>
            <input 
              type="text" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              style={inputStyle} 
              placeholder="+36 30 123 4567"
              disabled={isSavingProfile}
            />
          </div>

          {/* 3. Postázási cím mező */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold' }}>{lang === 'en' ? 'Shipping / Postal Address' : 'Pontos Értesítési / Postázási Cím'}</label>
            <input 
              type="text" 
              value={address} 
              onChange={e => setAddress(e.target.value)} 
              style={inputStyle} 
              placeholder="Irányítószám, Város, Utca, Házszám"
              disabled={isSavingProfile}
            />
          </div>

          {/* 4. Igazolványszám mező */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.8rem', color: '#a78bfa', fontWeight: 'bold' }}>{lang === 'en' ? 'Association Card ID (Optional)' : 'Fotóművészeti Tagsági Igazolvány Száma (Opcionális)'}</label>
            <input 
              type="text" 
              value={associationId} 
              onChange={e => setAssociationId(e.target.value)} 
              style={inputStyle} 
              placeholder="Pl.: MAFOSZ-2026-XXXX"
              disabled={isSavingProfile}
            />
          </div>

          <button 
            type="submit"
            disabled={isSavingProfile || !nameInput.trim()} 
            style={{ 
              width: '100%', 
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)', 
              color: 'white', 
              border: 'none', 
              padding: '12px', 
              borderRadius: '10px', 
              fontWeight: 'bold', 
              cursor: isSavingProfile ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              marginTop: '5px'
            }}
          >
            {isSavingProfile ? '⏳ ' + t('profSaving') : (lang === 'en' ? 'Save Official Profile' : 'Profil Adatok Mentése ✔')}
          </button>
        </form>
      </div>

      {/* 🛡️ SZEKCIÓ 3: KLUB HOZZÁRENDELÉSI KÁRTYA */}
      <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '24px', border: '1px solid #334155' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#f8fafc', fontSize: '1.25rem' }}>{t('profClubTitle')}</h3>
        
        <div style={{ 
          background: user?.club_role === 'pending' ? '#f59e0b15' : user?.club_name ? '#10b98115' : '#0f172a', 
          color: user?.club_role === 'pending' ? '#f59e0b' : user?.club_name ? '#10b981' : '#94a3b8', 
          border: user?.club_role === 'pending' ? '1px solid #f59e0b40' : user?.club_name ? '1px solid #10b98140' : 'none',
          padding: '15px', borderRadius: '12px', lineHeight: '1.5', marginBottom: '15px', fontSize: '0.9rem' 
        }}>
          {getClubStatusMessage()}
        </div>

        {!user?.club_name && user?.club_role !== 'pending' && (
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

      {/* 👑 SZEKCIÓ 4: KLUBVEZETŐI JÓVÁHAGYÓ PANEL */}
      {isLeader && (
        <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '24px', border: '1px solid #10b981', boxShadow: '0 10px 30px rgba(16,185,129,0.1)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#10b981', fontSize: '1.25rem' }}>{t('profLeaderTitle')} ({user.club_name})</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0' }}>{t('profLeaderNotice')}</p>
          
          {pendingMembers.length === 0 ? (
            <div style={{ padding: '15px', background: '#0f172a', borderRadius: '12px', color: '#64748b', textAlign: 'center' }}>{t('profNoPending')}</div>
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

    </div>
  );
}
