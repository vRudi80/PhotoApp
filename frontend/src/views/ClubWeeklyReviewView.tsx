import React, { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';
import VideoLoader from '../components/VideoLoader';
import { useLanguage } from '../context/LanguageContext';

interface ClubWeeklyReviewProps {
  user: any;
  onOpenCourses?: () => void;
}

const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('photoAppToken');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

export default function ClubWeeklyReviewView({ user, onOpenCourses }: ClubWeeklyReviewProps) {
  const { t } = useLanguage();

  const [roundsList, setRoundsList] = useState<any[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [activeRound, setActiveRound] = useState<any | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isMasterState, setIsMasterState] = useState<boolean>(false);

  const [photoScope, setPhotoScope] = useState<'all' | 'my'>('all');
  const [isPendingOnly, setIsPendingOnly] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'overall' | 'members' | 'masters' | 'ai'>('overall');

  const [selectedEntryModal, setSelectedEntryModal] = useState<any | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [photoTitle, setPhotoTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const isPending = user?.club_role === 'pending';
  const hasNoClub = !user?.club_name || isPending;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedEntryModal(null);
        setShowHelpModal(false);
        setShowUploadModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadRounds = async () => {
    if (hasNoClub) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const activeRes = await fetch(`${BACKEND_URL}/api/club-review/active-round`, { headers: getAuthHeaders() });
      let currentActive = null;
      if (activeRes.ok) {
        const activeData = await activeRes.json();
        currentActive = activeData.round;
        setActiveRound(currentActive);

        setIsMasterState(Boolean(activeData.isMaster || user?.is_master == 1 || user?.club_role === 'leader' || user?.isAdmin));
      }

      const roundsRes = await fetch(`${BACKEND_URL}/api/club-review/rounds`, { headers: getAuthHeaders() });
      if (roundsRes.ok) {
        const roundsData = await roundsRes.json();
        setRoundsList(roundsData);

        if (currentActive?.id) {
          setSelectedRoundId(currentActive.id);
        } else if (roundsData.length > 0) {
          setSelectedRoundId(roundsData[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadEntriesForRound = async (roundId: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/club-review/entries/${roundId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        setEntries(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { 
    loadRounds(); 
  }, [user?.club_name, user?.club_role, user?.is_master]);

  useEffect(() => {
    if (selectedRoundId) {
      loadEntriesForRound(selectedRoundId);
    }
  }, [selectedRoundId]);

  const currentSelectedRoundObj = roundsList.find(r => r.id === selectedRoundId);

  const isUploadClosed = useMemo(() => {
    if (!currentSelectedRoundObj?.upload_deadline) return false;
    return new Date() > new Date(currentSelectedRoundObj.upload_deadline);
  }, [currentSelectedRoundObj]);

  const isRoundClosed = useMemo(() => {
    if (!currentSelectedRoundObj) return false;
    if (currentSelectedRoundObj.status === 'closed') return true;
    if (currentSelectedRoundObj.rating_deadline) {
      return new Date() > new Date(currentSelectedRoundObj.rating_deadline);
    }
    return false;
  }, [currentSelectedRoundObj]);

  const myUploadCount = useMemo(() => {
    return entries.filter(e => e.user_email === user?.email).length;
  }, [entries, user?.email]);

  const maxUploads = useMemo(() => {
    const isPremium = Number(user?.is_premium) === 1 || user?.is_premium === true;
    const premLevel = Number(user?.premium_level || 0);
    if (isPremium) {
      return premLevel >= 2 ? 10 : 3;
    }
    return 1;
  }, [user?.is_premium, user?.premium_level]);

  const hasReachedUploadLimit = myUploadCount >= maxUploads;

  const unvotedCount = useMemo(() => {
    return entries.filter(e => e.user_email !== user?.email && (e.my_score === null || e.my_score === undefined)).length;
  }, [entries, user?.email]);

  const categoryCounts = useMemo(() => {
    let baseList = [...entries];
    if (photoScope === 'my') {
      baseList = baseList.filter(e => e.user_email === user?.email);
    }
    if (isPendingOnly && !isRoundClosed) {
      baseList = baseList.filter(e => e.user_email !== user?.email && (e.my_score === null || e.my_score === undefined));
    }

    return {
      all: baseList.length,
      portrait: baseList.filter(e => String(e.ai_category || '').includes('portrait')).length,
      color: baseList.filter(e => String(e.ai_category || '').includes('color')).length,
      monochrome: baseList.filter(e => String(e.ai_category || '').includes('monochrome')).length,
      nature: baseList.filter(e => String(e.ai_category || '').includes('nature')).length,
    };
  }, [entries, photoScope, isPendingOnly, isRoundClosed, user?.email]);

  const sortedAndFilteredEntries = useMemo(() => {
    let list = [...entries];

    if (photoScope === 'my') {
      list = list.filter(e => e.user_email === user?.email);
    }

    if (isPendingOnly && !isRoundClosed) {
      list = list.filter(e => e.user_email !== user?.email && (e.my_score === null || e.my_score === undefined));
    }

    if (categoryFilter !== 'all') {
      list = list.filter(e => {
        if (!e.ai_category) return false;
        return String(e.ai_category).includes(categoryFilter);
      });
    }

    if (isRoundClosed) {
      list.sort((a, b) => {
        if (sortBy === 'overall') return (a.overallRank || 999) - (b.overallRank || 999);
        if (sortBy === 'members') return (a.memberRank || 999) - (b.memberRank || 999);
        if (sortBy === 'masters') return (a.masterRank || 999) - (b.masterRank || 999);
        if (sortBy === 'ai') return (a.aiRank || 999) - (b.aiRank || 999);
        return 0;
      });
    }

    return list;
  }, [entries, photoScope, isPendingOnly, categoryFilter, sortBy, isRoundClosed, user?.email]);

  const handleRate = async (entryId: number, score: number) => {
    setEntries(prev => prev.map(item => 
      item.id === entryId ? { ...item, my_score: score } : item
    ));

    try {
      const res = await fetch(`${BACKEND_URL}/api/club-review/rate`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ entryId, score })
      });

      if (res.ok) {
        if (selectedRoundId) loadEntriesForRound(selectedRoundId);
        if (selectedEntryModal && selectedEntryModal.id === entryId) {
          setSelectedEntryModal((prev: any) => ({ ...prev, my_score: score }));
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Hiba a pontozás során.');
        if (selectedRoundId) loadEntriesForRound(selectedRoundId);
      }
    } catch (e) {
      alert('Hálózati hiba.');
      if (selectedRoundId) loadEntriesForRound(selectedRoundId);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoTitle.trim() || !uploadFile) {
      return alert('Kérlek add meg a kép címét és válaszd ki a fotó fájlt!');
    }

    const targetRoundId = selectedRoundId || activeRound?.id;
    if (!targetRoundId) {
      return alert('Hiba: Nem található kijelölt heti forduló!');
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('roundId', String(targetRoundId));
      formData.append('title', photoTitle);
      formData.append('photo', uploadFile);

      const res = await fetch(`${BACKEND_URL}/api/club-review/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setShowUploadModal(false);
        setPhotoTitle('');
        setUploadFile(null);
        setUploadPreview(null);
        if (selectedRoundId) loadEntriesForRound(selectedRoundId);
        alert('Kép elküldve! Az AI elkészítette a szakmai elemzést.');
      } else {
        alert(data.error || 'Hiba a feltöltés során.');
      }
    } catch (err) {
      alert('Hálózati hiba.');
    } finally {
      setIsUploading(false);
    }
  };

  const checkIsMaster = isMasterState || user?.is_master == 1 || user?.is_master === true || user?.club_role === 'leader' || user?.isAdmin;
  const isCurrentActiveRoundSelected = selectedRoundId === activeRound?.id;

  const activeModalRankedEntry = useMemo(() => {
    if (!selectedEntryModal) return null;
    return entries.find(e => e.id === selectedEntryModal.id) || selectedEntryModal;
  }, [selectedEntryModal, entries]);

  if (loading) return <VideoLoader />;

  if (hasNoClub) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-main)', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', margin: '20px auto', maxWidth: '800px', boxSizing: 'border-box' }}>
        <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontWeight: '700', wordBreak: 'break-word' }}>
          {isPending ? 'Jelentkezésed jóváhagyásra vár' : t('contNoClubTitle')}
        </h2>
        <p style={{ color: 'var(--text-body)', fontSize: '1rem', maxWidth: '540px', margin: '0 auto', lineHeight: '1.5' }}>
          A heti képértékelő és az AI elemzések megtekintéséhez kérjük, vedd fel a kapcsolatot egy adminisztrátorral. - kovari.rudolf@gmail.com
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '10px', boxSizing: 'border-box', width: '100%' }}>
      
      {/* FEJLÉC ÉS FORDULÓVÁLASZTÓ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-main)', marginBottom: '16px', flexWrap: 'wrap', gap: '12px', boxSizing: 'border-box', width: '100%' }}>
        <div style={{ flex: '1 1 280px', minWidth: 0, maxWidth: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 'clamp(1.2rem, 4vw, 1.6rem)', color: '#a78bfa', wordBreak: 'break-word', maxWidth: '100%' }}>
              {currentSelectedRoundObj?.title || t('reviewTitle')}
            </h2>

            {isRoundClosed && (
              <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                {t('reviewClosedBadge')}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', width: '100%' }}>
            <span style={{ whiteSpace: 'nowrap' }}>{t('reviewSelectRound')}</span>
            <select 
              value={selectedRoundId || ''} 
              onChange={e => setSelectedRoundId(Number(e.target.value))}
              style={{ 
                background: 'var(--bg-main)', 
                color: 'var(--text-title)', 
                border: '1px solid var(--border-main)', 
                padding: '6px 10px', 
                borderRadius: '6px', 
                fontSize: '0.85rem', 
                fontWeight: 'bold', 
                outline: 'none',
                maxWidth: '100%',
                flex: '1 1 auto'
              }}
            >
              {roundsList.map(r => {
                const now = new Date();
                const isUploadEnded = r.upload_deadline ? now > new Date(r.upload_deadline) : false;
                const isRoundEnded = r.status === 'closed' || (r.rating_deadline ? now > new Date(r.rating_deadline) : false);

                let statusLabel = '';
                if (isUploadEnded && !isRoundEnded) {
                  statusLabel = ' (Értékelési időszak)';
                } else if (r.id === activeRound?.id) {
                  statusLabel = ' (Aktuális hét)';
                }

                return (
                  <option key={r.id} value={r.id}>
                    {r.title}{statusLabel}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', width: '100%', justifyContent: 'flex-start' }}>
          
          {(user?.isAdmin || user?.email === 'kovari.rudolf@gmail.com') && (
            <button 
              onClick={async () => {
                if (!selectedRoundId) return alert('Válassz ki egy fordulót!');
                const confirmSend = window.confirm('Elküldjük a Heti Értékelő összefoglaló teszt e-mailjét A SAJÁT CÍMEDRE? (Senki más nem kapja meg)');
                if (!confirmSend) return;

                try {
                  const res = await fetch(`${BACKEND_URL}/api/club-review/send-test-email`, {
                    method: 'POST',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ roundId: selectedRoundId, forceTop3: true })
                  });

                  const data = await res.json();
                  if (res.ok) {
                    alert(`${data.message}`);
                  } else {
                    alert(`Hiba: ${data.error}`);
                  }
                } catch (e) {
                  alert('Hálózati hiba a teszt e-mail küldésekor.');
                }
              }}
              style={{ 
                background: 'rgba(56, 189, 248, 0.15)', 
                color: '#38bdf8', 
                border: '1px solid rgba(56, 189, 248, 0.3)', 
                padding: '8px 14px', 
                borderRadius: '8px', 
                fontWeight: 'bold', 
                cursor: 'pointer', 
                fontSize: '0.85rem'
              }}
            >
              Teszt E-mail
            </button>
          )}

          <button onClick={() => setShowHelpModal(true)} style={{ background: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa', border: '1px solid rgba(167, 139, 250, 0.3)', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>
            {t('reviewBtnHelp')}
          </button>

          {onOpenCourses && (
            <button onClick={onOpenCourses} style={{ background: 'var(--bg-main)', color: '#38bdf8', border: '1px solid var(--border-main)', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>
              {t('reviewBtnCourses')}
            </button>
          )}

          {isCurrentActiveRoundSelected && !isUploadClosed && (
            <button 
              onClick={() => {
                if (!hasReachedUploadLimit) setShowUploadModal(true);
              }}
              disabled={hasReachedUploadLimit}
              style={{ 
                background: hasReachedUploadLimit ? '#334155' : '#f97316', 
                color: hasReachedUploadLimit ? '#94a3b8' : 'white', 
                border: hasReachedUploadLimit ? '1px solid #475569' : 'none', 
                padding: '8px 16px', 
                borderRadius: '8px', 
                fontWeight: 'bold', 
                cursor: hasReachedUploadLimit ? 'not-allowed' : 'pointer', 
                fontSize: '0.88rem',
                opacity: hasReachedUploadLimit ? 0.8 : 1
              }}
            >
              {hasReachedUploadLimit ? `${t('reviewBtnUploadLimit')} (${myUploadCount}/${maxUploads})` : `${t('reviewBtnUpload')} (${myUploadCount}/${maxUploads})`}
            </button>
          )}

          {isUploadClosed && !isRoundClosed && (
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
              Feltöltés lezárult
            </div>
          )}
        </div>
      </div>

      {/* SZŰRŐSÁV */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', background: 'var(--bg-card)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-main)', flexWrap: 'wrap', boxSizing: 'border-box', width: '100%' }}>
        
        <button
          onClick={() => {
            const nextScope = photoScope === 'all' ? 'my' : 'all';
            setPhotoScope(nextScope);
            if (nextScope === 'my') setIsPendingOnly(false);
          }}
          style={{
            background: photoScope === 'my' ? '#a78bfa' : 'var(--bg-main)',
            color: photoScope === 'my' ? '#0f172a' : 'var(--text-title)',
            border: '1px solid var(--border-main)',
            padding: '8px 14px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          {photoScope === 'my' ? t('reviewScopeMy') : t('reviewScopeAll')}
        </button>

        {!isRoundClosed && (
          <button
            onClick={() => {
              setIsPendingOnly(prev => !prev);
              if (!isPendingOnly) setPhotoScope('all');
            }}
            style={{
              background: isPendingOnly ? '#f97316' : 'var(--bg-main)',
              color: isPendingOnly ? 'white' : '#f97316',
              border: `1px solid ${isPendingOnly ? '#f97316' : 'rgba(249, 115, 22, 0.4)'}`,
              padding: '8px 14px',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            {t('reviewPendingCount').replace('{count}', String(unvotedCount))}
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Kategória:</span>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{
              background: 'var(--bg-main)',
              color: 'var(--text-title)',
              border: '1px solid var(--border-main)',
              padding: '6px 10px',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer',
              maxWidth: '160px'
            }}
          >
            <option value="all">{t('reviewCatAll')} ({categoryCounts.all})</option>
            <option value="portrait">{t('reviewCatPortrait')} ({categoryCounts.portrait})</option>
            <option value="color">{t('reviewCatColor')} ({categoryCounts.color})</option>
            <option value="monochrome">{t('reviewCatMonochrome')} ({categoryCounts.monochrome})</option>
            <option value="nature">{t('reviewCatNature')} ({categoryCounts.nature})</option>
          </select>
        </div>

        {isRoundClosed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#f97316', whiteSpace: 'nowrap' }}>
              Rendezés:
            </span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              style={{
                background: 'var(--bg-main)',
                color: 'var(--text-title)',
                border: '1px solid #f97316',
                padding: '6px 10px',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer',
                maxWidth: '180px'
              }}
            >
              <option value="overall">Összesített</option>
              <option value="members">Klubtagok</option>
              <option value="masters">Mesterek</option>
              <option value="ai">AI pontszám</option>
            </select>
          </div>
        )}

      </div>

      {/* GALÉRIA */}
      {sortedAndFilteredEntries.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-main)', color: 'var(--text-muted)' }}>
          {isPendingOnly && !isRoundClosed
            ? t('reviewEmptyPending')
            : photoScope === 'my' 
              ? t('reviewEmptyMy') 
              : t('reviewEmptyFilter')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '16px', boxSizing: 'border-box', width: '100%' }}>
          {sortedAndFilteredEntries.map((entry, index) => {
            const isMyPhoto = entry.user_email === user?.email;
            const hasVoted = entry.my_score !== null && entry.my_score !== undefined;
            const photoUrl = getImageUrl(entry.drive_file_id, entry.file_url);

            const isTop1 = isRoundClosed && index === 0;
            const isTop2 = isRoundClosed && index === 1;
            const isTop3 = isRoundClosed && index === 2;

            let cardBorder = '1px solid var(--border-main)';
            let cardShadow = 'none';

            if (isTop1) {
              cardBorder = '2px solid #f59e0b';
              cardShadow = '0 0 15px rgba(245, 158, 11, 0.35)';
            } else if (isTop2) {
              cardBorder = '2px solid #cbd5e1';
              cardShadow = '0 0 15px rgba(203, 213, 225, 0.3)';
            } else if (isTop3) {
              cardBorder = '2px solid #d97706';
              cardShadow = '0 0 15px rgba(217, 119, 6, 0.3)';
            }

            return (
              <div 
                key={entry.id} 
                style={{ 
                  background: 'var(--bg-card)', 
                  border: cardBorder, 
                  boxShadow: cardShadow,
                  borderRadius: '12px', 
                  overflow: 'hidden', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                  width: '100%',
                  maxWidth: '100%'
                }}
              >
                
                <div onClick={() => setSelectedEntryModal(entry)} style={{ position: 'relative', height: '210px', background: '#000', cursor: 'pointer', overflow: 'hidden' }}>
                  <img src={photoUrl} alt={entry.title} referrerPolicy="no-referrer" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  
                  {isRoundClosed && index < 3 && (
                    <div style={{ 
                      position: 'absolute', 
                      top: '10px', 
                      left: '10px', 
                      background: isTop1 ? '#f59e0b' : isTop2 ? '#cbd5e1' : '#d97706', 
                      color: isTop1 ? '#0f172a' : isTop2 ? '#0f172a' : '#ffffff', 
                      padding: '4px 10px', 
                      borderRadius: '20px', 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold', 
                      boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
                      zIndex: 2 
                    }}>
                      {index + 1}. Helyezett
                    </div>
                  )}

                  {(isRoundClosed || isMyPhoto) && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', color: '#fbbf24', fontWeight: 'bold', zIndex: 2 }}>
                      AI: {entry.ai_score} / 100 p
                    </div>
                  )}
                </div>

                <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', width: '100%', minWidth: 0 }}>
                  <div style={{ width: '100%', minWidth: 0 }}>
                    <h3 style={{ margin: '0 0 2px 0', color: 'var(--text-title)', fontSize: '1rem', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{entry.title}</h3>
                    <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontSize: '0.8rem', wordBreak: 'break-word' }}>{t('archivePhotographer')}: {entry.user_name}</small>

                    {isRoundClosed && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2px', background: 'var(--bg-main)', padding: '8px 2px', borderRadius: '8px', border: '1px solid var(--border-main)', textAlign: 'center', marginBottom: '10px', boxSizing: 'border-box', width: '100%' }}>
                        
                        <div style={{ padding: '2px', overflow: 'hidden' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem', fontWeight: 'bold', display: 'block', whiteSpace: 'nowrap' }}>Tagok</span>
                          <div style={{ color: '#38bdf8', fontWeight: '800', fontSize: '0.8rem', marginTop: '2px' }}>
                            {entry.memberRank}/{entry.totalEntriesCount}
                          </div>
                          <small style={{ color: 'var(--text-muted)', fontSize: '0.6rem', display: 'block' }}>
                            {Number(entry.avg_member_score).toFixed(1)}p
                          </small>
                        </div>

                        <div style={{ borderLeft: '1px solid var(--border-main)', borderRight: '1px solid var(--border-main)', padding: '2px', overflow: 'hidden' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem', fontWeight: 'bold', display: 'block', whiteSpace: 'nowrap' }}>Mesterek</span>
                          <div style={{ color: '#f59e0b', fontWeight: '800', fontSize: '0.8rem', marginTop: '2px' }}>
                            {entry.masterRank}/{entry.totalEntriesCount}
                          </div>
                          <small style={{ color: 'var(--text-muted)', fontSize: '0.6rem', display: 'block' }}>
                            {Number(entry.avg_master_score).toFixed(1)}p
                          </small>
                        </div>

                        <div style={{ borderRight: '1px solid var(--border-main)', padding: '2px', overflow: 'hidden' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem', fontWeight: 'bold', display: 'block', whiteSpace: 'nowrap' }}>AI</span>
                          <div style={{ color: '#a78bfa', fontWeight: '800', fontSize: '0.8rem', marginTop: '2px' }}>
                            {entry.aiRank}/{entry.totalEntriesCount}
                          </div>
                          <small style={{ color: 'var(--text-muted)', fontSize: '0.6rem', display: 'block' }}>
                            {entry.ai_score}p
                          </small>
                        </div>

                        <div style={{ background: 'rgba(249, 115, 22, 0.12)', borderRadius: '4px', padding: '2px', overflow: 'hidden' }}>
                          <span style={{ color: '#f97316', fontSize: '0.62rem', fontWeight: 'bold', display: 'block', whiteSpace: 'nowrap' }}>Összes</span>
                          <div style={{ color: '#f97316', fontWeight: '800', fontSize: '0.82rem', marginTop: '2px' }}>
                            {entry.overallRank}/{entry.totalEntriesCount}
                          </div>
                          <small style={{ color: '#f97316', fontSize: '0.6rem', display: 'block' }}>
                            {Number(entry.combinedScore || 0).toFixed(0)}%
                          </small>
                        </div>

                      </div>
                    )}
                  </div>

                  {isRoundClosed ? (
                    <div style={{ background: 'var(--bg-main)', color: 'var(--text-muted)', padding: '6px', borderRadius: '6px', fontSize: '0.78rem', textAlign: 'center', fontWeight: 'bold' }}>
                      {t('reviewStatusClosed')}
                    </div>
                  ) : isMyPhoto ? (
                    <div style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', padding: '6px', borderRadius: '6px', fontSize: '0.78rem', textAlign: 'center', fontWeight: 'bold' }}>
                      {t('reviewStatusOwn')}
                    </div>
                  ) : hasVoted ? (
                    <div style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem', textAlign: 'center', fontWeight: 'bold' }}>
                      {t('reviewStatusVoted').replace('{score}', String(entry.my_score))}
                    </div>
                  ) : (
                    <div style={{ width: '100%' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold' }}>
                        {checkIsMaster ? 'Mester Pont (1 - 10):' : 'Tagi Pont (0 - 2):'}
                      </label>

                      {checkIsMaster ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', width: '100%' }}>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                            <button key={p} onClick={() => handleRate(entry.id, p)} style={{ padding: '6px 0', borderRadius: '4px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>
                              {p}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                          {[0, 1, 2].map(p => (
                            <button key={p} onClick={() => handleRate(entry.id, p)} style={{ flex: 1, padding: '6px 0', borderRadius: '6px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>
                              {p} p
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODÁL KÉP RÉSZLETEK */}
      {activeModalRankedEntry && (() => {
        const isMyModalPhoto = activeModalRankedEntry.user_email === user?.email;
        const canShowAi = isRoundClosed || isMyModalPhoto;

        return (
          <div onClick={() => setSelectedEntryModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.95)', backdropFilter: 'blur(12px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px', boxSizing: 'border-box' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '16px', padding: '16px', maxWidth: '1000px', width: '100%', maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 25px 60px rgba(0,0,0,0.9)', position: 'relative', boxSizing: 'border-box' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-main)', paddingBottom: '10px', flexShrink: 0 }}>
                <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '1.1rem', fontWeight: 800, wordBreak: 'break-word', paddingRight: '10px' }}>{activeModalRankedEntry.title}</h3>
                <button 
                  onClick={() => setSelectedEntryModal(null)} 
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    border: 'none', 
                    color: '#ffffff', 
                    cursor: 'pointer', 
                    borderRadius: '50%', 
                    width: '32px', 
                    height: '32px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '1rem', 
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#020617', borderRadius: '10px', padding: '8px', boxSizing: 'border-box', overflow: 'hidden', flexShrink: 0 }}>
                <img 
                  src={getImageUrl(activeModalRankedEntry.drive_file_id, activeModalRankedEntry.file_url)} 
                  alt={activeModalRankedEntry.title} 
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '50vh', 
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain', 
                    borderRadius: '6px',
                    display: 'block'
                  }} 
                />
              </div>

              {isRoundClosed && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', background: 'var(--bg-main)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-main)', textAlign: 'center', boxSizing: 'border-box', width: '100%' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 'bold', display: 'block' }}>Klubtagok</span>
                    <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '0.95rem', marginTop: '2px' }}>
                      {activeModalRankedEntry.memberRank}/{activeModalRankedEntry.totalEntriesCount}
                    </div>
                  </div>

                  <div style={{ borderLeft: '1px solid var(--border-main)', borderRight: '1px solid var(--border-main)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 'bold', display: 'block' }}>Mesterek</span>
                    <div style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '0.95rem', marginTop: '2px' }}>
                      {activeModalRankedEntry.masterRank}/{activeModalRankedEntry.totalEntriesCount}
                    </div>
                  </div>

                  <div style={{ borderRight: '1px solid var(--border-main)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 'bold', display: 'block' }}>AI</span>
                    <div style={{ color: '#a78bfa', fontWeight: 'bold', fontSize: '0.95rem', marginTop: '2px' }}>
                      {activeModalRankedEntry.aiRank}/{activeModalRankedEntry.totalEntriesCount}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(249, 115, 22, 0.12)', borderRadius: '4px', padding: '2px' }}>
                    <span style={{ color: '#f97316', fontSize: '0.65rem', fontWeight: 'bold', display: 'block' }}>Összes</span>
                    <div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '0.95rem', marginTop: '2px' }}>
                      {activeModalRankedEntry.overallRank}/{activeModalRankedEntry.totalEntriesCount}
                    </div>
                  </div>
                </div>
              )}

              {canShowAi ? (
                <>
                  <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid #a78bfa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ color: '#a78bfa', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        AI Szakmai Értékelés (FIAP)
                      </span>
                      <span style={{ background: '#a78bfa', color: '#0f172a', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {activeModalRankedEntry.ai_score} / 100 P
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-body)', fontSize: '0.85rem', lineHeight: '1.5', wordBreak: 'break-word' }}>{activeModalRankedEntry.ai_feedback}</p>
                  </div>

                  {activeModalRankedEntry.course_title && (
                    <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div>
                        <small style={{ color: '#10b981', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Javasolt klubtanfolyam:</small>
                        <strong style={{ color: 'var(--text-title)', fontSize: '0.9rem' }}>{activeModalRankedEntry.course_title}</strong>
                      </div>
                      {onOpenCourses && (
                        <button onClick={() => { setSelectedEntryModal(null); onOpenCourses(); }} style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          Megtekintés
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px', background: 'var(--bg-main)', borderRadius: '8px', fontSize: '0.82rem' }}>
                  A részletes AI értékelések a heti forduló lezárultával válnak láthatóvá.
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* SÚGÓ MODÁL */}
      {showHelpModal && (
        <div onClick={() => setShowHelpModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px', boxSizing: 'border-box' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '16px', padding: '20px', maxWidth: '680px', width: '100%', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-main)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#a78bfa', fontSize: '1.2rem' }}>
                {t('reviewHelpTitle')}
              </h3>
              <button onClick={() => setShowHelpModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text-body)', fontSize: '0.88rem', lineHeight: '1.5' }}>
              <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-main)' }}>
                <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-title)', fontSize: '0.98rem' }}>
                  {t('reviewHelpWhatTitle')}
                </h4>
                {t('reviewHelpWhatDesc')}
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', color: '#38bdf8', fontSize: '0.95rem' }}>
                  {t('reviewHelpScheduleTitle')}
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li>{t('reviewHelpSchedule1')}</li>
                  <li>{t('reviewHelpSchedule2')}</li>
                  <li>{t('reviewHelpSchedule3')}</li>
                </ul>
              </div>

              <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-main)' }}>
                <h4 style={{ margin: '0 0 6px 0', color: '#10b981', fontSize: '0.98rem' }}>
                  {t('reviewHelpRankTitle')}
                </h4>
                {t('reviewHelpRankDesc')}
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--border-main)' }}>
              <button onClick={() => setShowHelpModal(false)} style={{ background: '#a78bfa', color: '#0f172a', border: 'none', padding: '8px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                {t('reviewHelpGotIt')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODÁL: KÉP FELTÖLTÉSE */}
      {showUploadModal && (
        <div onClick={() => setShowUploadModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px', boxSizing: 'border-box' }}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleUpload} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', padding: '20px', maxWidth: '480px', width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
            <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '1.2rem' }}>{t('reviewBtnUpload')}</h3>

            <div>
              <label style={{ display: 'block', color: 'var(--text-title)', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>Kép Címe *</label>
              <input type="text" value={photoTitle} onChange={e => setPhotoTitle(e.target.value)} required placeholder="pl.: Hajnali csend" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-title)', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>Fotó Kiválasztása *</label>
              <input type="file" accept="image/*" onChange={handleFileSelect} required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', fontSize: '0.8rem', boxSizing: 'border-box' }} />
            </div>

            {uploadPreview && (
              <div style={{ textAlign: 'center', background: '#000', borderRadius: '8px', padding: '8px' }}>
                <img src={uploadPreview} alt="Előnézet" referrerPolicy="no-referrer" crossOrigin="anonymous" style={{ maxHeight: '160px', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px' }} />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button type="button" onClick={() => setShowUploadModal(false)} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Mégse</button>
              <button type="submit" disabled={isUploading || !uploadFile} style={{ background: '#f97316', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: isUploading || !uploadFile ? 0.6 : 1, fontSize: '0.85rem' }}>
                {isUploading ? 'Feltöltés...' : 'Beküldés & AI'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
