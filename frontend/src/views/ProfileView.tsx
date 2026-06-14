import React, { useState, useEffect } from 'react';
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
  
  const [nameInput, setNameInput] = useState<string>('');
  const [isSavingName, setIsSavingName] = useState(false);

  // 🎯 Tárhely és AI használat követéséhez szükséges állapotok
  const [userStorage, setUserStorage] = useState({ count: 0, bytes: 0 });
  const [aiUsageCount, setAiUsageCount] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // 🎯 Aktiváljuk a fordítót
  const { t, lang } = useLanguage();

  const isLeader = user?.club_role === 'leader' || user?.club_role === 'deputy';

  // Alapadatok szinkronizálása a belépett felhasználóval
  useEffect(() => {
    if (user?.name) {
      setNameInput(user.name);
    }
  }, [user]);

  // 1. Csak a vezetővel rendelkező klubok betöltése a legördülő listába
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/clubs/active-only`)
      .then(res => res.json())
      .then(data => setActiveClubs(data || []))
      .catch(console.error);
  }, []);

  // 2. Felhasználó specifikus tárhely és AI statisztikák betöltése
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

  // 3. Függőben lévő tagok betöltése vezetőknek
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

  // 4. Névváltoztatás elküldése
  const handleUpdateName = async () => {
    if (!nameInput.trim()) return alert(t('msgEmptyName'));
    if (nameInput.trim() === user?.name) return alert(t('msgSameName'));

    setIsSavingName(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/update-name`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, newName: nameInput })
      });
      if (res.ok) {
        alert(t('msgNameSuccess'));
        fetchData(); 
      } else {
        const data = await res.json();
        alert(data.error || t('msgNameError'));
      }
    } catch (e) {
      alert(t('msgNetworkError'));
    } fillly: {
      setIsSavingName(false);
    }
  };

  // 5. Csatlakozási kérelem leadása
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

  // 6. Kérelem elbírálása
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

  // Segédfunkció a dinamikus klub-státusz üzenetek összerakásához
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

  // Segédfunkció: Bájtok átváltása humánus formátummá (MB/GB)
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
    } catch (e) {
      return dateStr;
    }
  };

  const isPremiumActive = user?.is_premium === 1;
  const hasExpiredPremium = user?.is_premium === 0 && user?.premium_until;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '600px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* 🎯 SZEKCIÓ 1: DIAGNOSZTIKAI ÉS FINANCIÁLIS METRIKÁK KÁRTYÁJA */}
      <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#f8fafc', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚙️</span> {t('profStatusTitle')}
        </h3>

        {/* Regisztrált e-mail (Módosíthatatlan zóna) */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
            {t('profEmailLabel')}
          </label>
          <div style={{ width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid #1e293b', color: '#64748b', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
            {user?.email}
          </div>
        </div>

        {/* Előfizetési státusz és lejárati idők monitorozása */}
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

        {/* Tárhely és AI Bento Grid statisztikák */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          
          {/* Tárhely foglalás panel */}
          <div style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', border: '1px solid #223147', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('profStorageLabel')}
            </span>
            {isLoadingStats ? (
              <span style={{ color: '#475569', fontSize: '0.9rem' }}>⏳...</span>
            ) : (
              <>
                <span style={{ color: '#38bdf8', fontSize: '1.3rem', fontWeight: '900' }}>
                  {userStorage.count} <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#64748b' }}>{t('profStorageSub')}</span>
                </span>
                <span style={{ color: '#a78bfa', fontSize: '0.9rem', fontWeight: 'bold' }}>{formatExactStorage(userStorage.bytes)}</span>
              </>
            )}
          </div>

          {/* AI képelemzés számláló panel */}
          <div style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', border: '1px solid #223147', display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('profAiLabel')}
            </span>
            <span style={{ color: aiUsageCount > 0 ? '#38bdf8' : '#64748b', fontSize: '1.3rem', fontWeight: '900', marginTop: '4px' }}>
              {aiUsageCount} <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#64748b' }}>{t('profAiSub')}</span>
            </span>
            <span style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic' }}>
              {t('profAiDesc')}
            </span>
          </div>

        </div>
      </div>
      
      {/* 👤 SZEKCIÓ 2: SZEMÉLYES ADATOK PANEL (NÉVMÓDOSÍTÁS) */}
      <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <h3 style={{ margin: '0 0 6px 0', color: '#f8fafc', fontSize: '1.25rem' }}>{t('profTitle')}</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 20px 0' }}>{t('profNotice')}</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold' }}>{t('profLabelName')}</label>
          <input 
            type="text" 
            value={nameInput} 
            onChange={e => setNameInput(e.target.value)} 
            style={{ ...inputStyle, marginBottom: '15px', border: nameInput.trim() === user?.name ? '1px solid #334155' : '1px solid #38bdf8' }} 
            placeholder={t('profPlaceholderName')}
            disabled={isSavingName}
          />
        </div>

        <button 
          onClick={handleUpdateName} 
          disabled={isSavingName || !nameInput.trim() || nameInput.trim() === user?.name} 
          style={{ 
            width: '100%', 
            background: nameInput.trim() === user?.name ? '#334155' : 'linear-gradient(135deg, #10b981, #059669)', 
            color: nameInput.trim() === user?.name ? '#64748b' : 'white', 
            border: 'none', 
            padding: '12px', 
            borderRadius: '10px', 
            fontWeight: 'bold', 
            cursor: nameInput.trim() === user?.name ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {isSavingName ? t('profSaving') : t('profSaveBtn')}
        </button>
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
