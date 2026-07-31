import React, { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';
import VideoLoader from '../components/VideoLoader';
import { 
  Award, Upload, Star, Clock, Filter, Sparkles, CheckCircle2, 
  BookOpen, Eye, UserCheck, ChevronRight, X, ImageIcon, Calendar, History, Trophy, HelpCircle, ArrowUpDown, User, Layers 
} from 'lucide-react';

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
  const [roundsList, setRoundsList] = useState<any[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [activeRound, setActiveRound] = useState<any | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Szűrők ÉS Rendezés
  const [photoScope, setPhotoScope] = useState<'all' | 'my'>('all');
  const [isPendingOnly, setIsPendingOnly] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'members' | 'masters' | 'ai'>('members');

  const [selectedEntryModal, setSelectedEntryModal] = useState<any | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Képfeltöltés modál adatok
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [photoTitle, setPhotoTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 🔒 Karantén fék: Ha nincs klubja, VAGY a tagsága függőben van!
  const isPending = user?.club_role === 'pending';
  const hasNoClub = !user?.club_name || isPending;

  // 1. Fordulók és aktív hét betöltése
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

  // 2. A kiválasztott forduló képeinek betöltése
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
  }, [user?.club_name, user?.club_role]);

  useEffect(() => {
    if (selectedRoundId) {
      loadEntriesForRound(selectedRoundId);
    }
  }, [selectedRoundId]);

  const currentSelectedRoundObj = roundsList.find(r => r.id === selectedRoundId);

  // ⏰ LEZÁRÁS ELLENŐRZÉSE
  const isRoundClosed = useMemo(() => {
    if (!currentSelectedRoundObj) return false;
    if (selectedRoundId !== activeRound?.id) return true;
    if (currentSelectedRoundObj.status === 'closed') return true;
    if (currentSelectedRoundObj.rating_deadline) {
      return new Date() > new Date(currentSelectedRoundObj.rating_deadline);
    }
    return false;
  }, [currentSelectedRoundObj, selectedRoundId, activeRound]);

  // 💳 CSOMAG ÉS KÉPFELTÖLTÉSI LIMIT SZÁMÍTÁSA A FELUHASZNÁLÓNAK
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

  // 🏆 CSOPORTONKÉNTI RANGSOR SZÁMÍTÁS (Klubtagok, Mesterek, AI)
  const rankedEntries = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    const totalCount = entries.length;

    // AI szerinti sorrend
    const aiSorted = [...entries].sort((a, b) => (Number(b.ai_score) || 0) - (Number(a.ai_score) || 0));
    const aiRankMap = new Map<number, number>();
    aiSorted.forEach((item, idx) => aiRankMap.set(item.id, idx + 1));

    // Klubtagok szerinti sorrend
    const memberSorted = [...entries].sort((a, b) => (Number(b.avg_member_score) || 0) - (Number(a.avg_member_score) || 0));
    const memberRankMap = new Map<number, number>();
    memberSorted.forEach((item, idx) => memberRankMap.set(item.id, idx + 1));

    // Mesterek szerinti sorrend
    const masterSorted = [...entries].sort((a, b) => (Number(b.avg_master_score) || 0) - (Number(a.avg_master_score) || 0));
    const masterRankMap = new Map<number, number>();
    masterSorted.forEach((item, idx) => masterRankMap.set(item.id, idx + 1));

    return entries.map(entry => ({
      ...entry,
      totalEntriesCount: totalCount,
      aiRank: aiRankMap.get(entry.id) || totalCount,
      memberRank: memberRankMap.get(entry.id) || totalCount,
      masterRank: masterRankMap.get(entry.id) || totalCount,
    }));
  }, [entries]);

  // ⏳ ÉRTÉKELÉSRE VÁRÓ KÉPEK SZÁMA
  const unvotedCount = useMemo(() => {
    return rankedEntries.filter(e => e.user_email !== user?.email && (e.my_score === null || e.my_score === undefined)).length;
  }, [rankedEntries, user?.email]);

  // ⚡ SZŰRÉS ÉS RENDEZÉS ALAPJÁN FELDOLGOZOTT LISTA
  const sortedAndFilteredEntries = useMemo(() => {
    let list = [...rankedEntries];

    if (photoScope === 'my') {
      list = list.filter(e => e.user_email === user?.email);
    }

    if (isPendingOnly) {
      list = list.filter(e => e.user_email !== user?.email && (e.my_score === null || e.my_score === undefined));
    }

    if (categoryFilter !== 'all') {
      list = list.filter(e => {
        if (!e.ai_category) return false;
        const categoryString = String(e.ai_category);
        return categoryString.includes(categoryFilter);
      });
    }

    if (isRoundClosed) {
      list.sort((a, b) => {
        if (sortBy === 'members') return a.memberRank - b.memberRank;
        if (sortBy === 'masters') return a.masterRank - b.masterRank;
        if (sortBy === 'ai') return a.aiRank - b.aiRank;
        return 0;
      });
    }

    return list;
  }, [rankedEntries, photoScope, isPendingOnly, categoryFilter, sortBy, isRoundClosed, user?.email]);

  // ⚡ AZONNALI PONTOZÁS (OPTIMISTA FRISSÍTÉS)
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
        alert('🎉 Kép elküldve! Az AI elkészítette a szakmai elemzést.');
      } else {
        alert(data.error || 'Hiba a feltöltés során.');
      }
    } catch (err) {
      alert('Hálózati hiba.');
    } finally {
      setIsUploading(false);
    }
  };

  const isMaster = user?.is_master === 1 || user?.club_role === 'leader';
  const isCurrentActiveRoundSelected = selectedRoundId === activeRound?.id;

  const activeModalRankedEntry = useMemo(() => {
    if (!selectedEntryModal) return null;
    return rankedEntries.find(e => e.id === selectedEntryModal.id) || selectedEntryModal;
  }, [selectedEntryModal, rankedEntries]);

  if (loading) return <VideoLoader />;

  if (hasNoClub) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-main)', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', margin: '20px auto', maxWidth: '800px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontWeight: '700' }}>
          {isPending ? 'Jelentkezésed jóváhagyásra vár' : 'Nem vagy klubhoz rendelve'}
        </h2>
        <p style={{ color: 'var(--text-body)', fontSize: '1.1rem', maxWidth: '540px', margin: '0 auto' }}>
          A heti képértékelő és az AI elemzések megtekintéséhez kérjük, vedd fel a kapcsolatot egy adminisztrátorral. - kovari.rudolf@gmail.com
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '15px' }}>
      
      {/* FEJLÉC ÉS FORDULÓVÁLASZTÓ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-main)', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h2 style={{ margin: 0, fontSize: '1.6rem', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Award size={28} /> {currentSelectedRoundObj?.title || 'Klub Heti Képértékelő'}
            </h2>

            {isRoundClosed && (
              <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                Lezárult (Eredmények megtekintése)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <History size={16} color="#38bdf8" />
            <span>Forduló kiválasztása:</span>
            <select 
              value={selectedRoundId || ''} 
              onChange={e => setSelectedRoundId(Number(e.target.value))}
              style={{ background: 'var(--bg-main)', color: 'var(--text-title)', border: '1px solid var(--border-main)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', outline: 'none' }}
            >
              {roundsList.map(r => (
                <option key={r.id} value={r.id}>
                  {r.title} {r.id === activeRound?.id ? ' (Aktuális hét)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setShowHelpModal(true)} style={{ background: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa', border: '1px solid rgba(167, 139, 250, 0.3)', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={18} /> Súgó & Szabályzat
          </button>

          {onOpenCourses && (
            <button onClick={onOpenCourses} style={{ background: 'var(--bg-main)', color: '#38bdf8', border: '1px solid var(--border-main)', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={16} /> Tanfolyamok
            </button>
          )}

          {/* 🎯 FELTÖLTÉSI GOMB INAKTÍV TÁJÉKOZTATÓVAL HA ELÉRTE A LIMITET */}
          {isCurrentActiveRoundSelected && !isRoundClosed && (
            <button 
              onClick={() => {
                if (!hasReachedUploadLimit) setShowUploadModal(true);
              }}
              disabled={hasReachedUploadLimit}
              title={
                hasReachedUploadLimit
                  ? `Elérted a heti feltöltési limitet (${myUploadCount}/${maxUploads} kép). Ebben a csomagban hetente legfeljebb ${maxUploads} fotó tölthető fel. Ha többet szeretnél feltölteni, az Jobb felső menüben a nevedre kattintva/Tárhelycsomagom oldalon tudsz csomagot váltani!`
                  : `Kép feltöltése (${myUploadCount}/${maxUploads} feltöltve ezen a héten)`
              }
              style={{ 
                background: hasReachedUploadLimit ? '#334155' : '#f97316', 
                color: hasReachedUploadLimit ? '#94a3b8' : 'white', 
                border: hasReachedUploadLimit ? '1px solid #475569' : 'none', 
                padding: '10px 18px', 
                borderRadius: '8px', 
                fontWeight: 'bold', 
                cursor: hasReachedUploadLimit ? 'not-allowed' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                opacity: hasReachedUploadLimit ? 0.8 : 1,
                transition: 'all 0.2s'
              }}
            >
              <Upload size={16} /> 
              {hasReachedUploadLimit ? `Limit elérve (${myUploadCount}/${maxUploads})` : `Kép Feltöltése (${myUploadCount}/${maxUploads})`}
            </button>
          )}
        </div>
      </div>

      {/* 🎯 SZŰRŐSÁV */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', background: 'var(--bg-card)', padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border-main)', flexWrap: 'wrap' }}>
        
        {/* 1. SAJÁT FOTÓIM / ÖSSZES FOTÓ KAPCSOLÓ */}
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
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s'
          }}
        >
          {photoScope === 'my' ? <User size={16} /> : <Layers size={16} />}
          {photoScope === 'my' ? 'Saját fotóim' : 'Összes fotó'}
        </button>

        {/* 2. ÉRTÉKELÉSRE VÁRÓK GOMB */}
        <button
          onClick={() => {
            setIsPendingOnly(prev => !prev);
            if (!isPendingOnly) setPhotoScope('all');
          }}
          style={{
            background: isPendingOnly ? '#f97316' : 'var(--bg-main)',
            color: isPendingOnly ? 'white' : '#f97316',
            border: `1px solid ${isPendingOnly ? '#f97316' : 'rgba(249, 115, 22, 0.4)'}`,
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s'
          }}
        >
          Értékelésre várók ({unvotedCount})
        </button>

        <div style={{ height: '24px', width: '1px', background: 'var(--border-main)', margin: '0 4px' }} />

        {/* 3. KATEGÓRIÁK LEGÖRDÜLŐ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Kategóriák:</span>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{
              background: 'var(--bg-main)',
              color: 'var(--text-title)',
              border: '1px solid var(--border-main)',
              padding: '8px 14px',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '0.88rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">Összes kategória</option>
            <option value="portrait">Portré</option>
            <option value="color">Színes</option>
            <option value="monochrome">Monokróm</option>
            <option value="nature">Természet</option>
          </select>
        </div>

        {/* 4. SORREND LEGÖRDÜLŐ (CSAK LEZÁRÁS UTÁN LÁTHATÓ!) */}
        {isRoundClosed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowUpDown size={16} /> Sorrend:
            </span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              style={{
                background: 'var(--bg-main)',
                color: 'var(--text-title)',
                border: '1px solid #38bdf8',
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '0.88rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="members">👥 Tagok értékelése</option>
              <option value="masters">👑 Mesterek értékelése</option>
              <option value="ai">🤖 AI értékelése</option>
            </select>
          </div>
        )}

      </div>

      {/* GALÉRIA */}
      {sortedAndFilteredEntries.length === 0 ? (
        <div style={{ padding: '50px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-main)', color: 'var(--text-muted)' }}>
          {isPendingOnly 
            ? '🎉 Minden képet értékeltél ebben a fordulóban!' 
            : photoScope === 'my' 
              ? 'Még nem töltöttél fel képet ebben a fordulóban.' 
              : 'Még nincsenek feltöltött képek a megadott szűrési feltételekkel.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '20px' }}>
          {sortedAndFilteredEntries.map(entry => {
            const isMyPhoto = entry.user_email === user?.email;
            const hasVoted = entry.my_score !== null && entry.my_score !== undefined;
            const photoUrl = getImageUrl(entry.drive_file_id, entry.file_url);

            return (
              <div key={entry.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                
                <div onClick={() => setSelectedEntryModal(entry)} style={{ position: 'relative', height: '220px', background: '#000', cursor: 'pointer' }}>
                  <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  
                  {/* AI PONT JELVÉNY (CSAK LEZÁRÁS UTÁN LÁTHATÓ) */}
                  {isRoundClosed && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', color: '#fbbf24', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Sparkles size={14} /> AI: {entry.ai_score} / 100 p
                    </div>
                  )}
                </div>

                <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ margin: '0 0 2px 0', color: 'var(--text-title)', fontSize: '1.1rem' }}>{entry.title}</h3>
                    <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '10px' }}>Alkotó: {entry.user_name}</small>

                    {/* 3 OSZLOPOS HELYEZÉS ÉS ÁTLAGSÁV (CSAK LEZÁRÁS UTÁN LÁTHATÓ) */}
                    {isRoundClosed && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', background: 'var(--bg-main)', padding: '10px 6px', borderRadius: '8px', border: '1px solid var(--border-main)', textAlign: 'center', marginBottom: '12px' }}>
                        
                        {/* KLUBTAGOK */}
                        <div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 'bold', display: 'block' }}>Klubtagok</span>
                          <div style={{ color: '#38bdf8', fontWeight: '800', fontSize: '0.9rem', marginTop: '2px' }}>
                            {entry.memberRank}/{entry.totalEntriesCount}
                          </div>
                          <small style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                            {Number(entry.avg_member_score).toFixed(1)} p
                          </small>
                        </div>

                        {/* MESTEREK */}
                        <div style={{ borderLeft: '1px solid var(--border-main)', borderRight: '1px solid var(--border-main)' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 'bold', display: 'block' }}>Mesterek</span>
                          <div style={{ color: '#f59e0b', fontWeight: '800', fontSize: '0.9rem', marginTop: '2px' }}>
                            {entry.masterRank}/{entry.totalEntriesCount}
                          </div>
                          <small style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                            {Number(entry.avg_master_score).toFixed(1)} p
                          </small>
                        </div>

                        {/* AI FIAP */}
                        <div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 'bold', display: 'block' }}>AI FIAP</span>
                          <div style={{ color: '#a78bfa', fontWeight: '800', fontSize: '0.9rem', marginTop: '2px' }}>
                            {entry.aiRank}/{entry.totalEntriesCount}
                          </div>
                          <small style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                            {entry.ai_score} p
                          </small>
                        </div>

                      </div>
                    )}
                  </div>

                  {/* PONTOZÓ GOMBOK VAGY ZÁROLT STÁTUSZ */}
                  {isRoundClosed ? (
                    <div style={{ background: 'var(--bg-main)', color: 'var(--text-muted)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', textAlign: 'center', fontWeight: 'bold' }}>
                      Értékelés lezárult
                    </div>
                  ) : isMyPhoto ? (
                    <div style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', textAlign: 'center', fontWeight: 'bold' }}>
                      Saját fotó (Nem értékelheted)
                    </div>
                  ) : hasVoted ? (
                    <div style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} /> Már értékelted ({entry.my_score} pont)
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>
                        {isMaster ? 'Mester Értékelés (1 - 10 pont):' : 'Tagi Értékelés (0 - 2 pont):'}
                      </label>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {isMaster ? (
                          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                            <button key={p} onClick={() => handleRate(entry.id, p)} style={{ flex: 1, padding: '6px 0', borderRadius: '4px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>
                              {p}
                            </button>
                          ))
                        ) : (
                          [0, 1, 2].map(p => (
                            <button key={p} onClick={() => handleRate(entry.id, p)} style={{ flex: 1, padding: '8px 0', borderRadius: '6px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', fontWeight: 'bold', cursor: 'pointer' }}>
                              {p} Pont
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RÉSZLETES ELŐNÉZETI MODÁL */}
      {activeModalRankedEntry && (
        <div onClick={() => setSelectedEntryModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', padding: '25px', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '1.3rem' }}>{activeModalRankedEntry.title}</h3>
              <button onClick={() => setSelectedEntryModal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <img src={getImageUrl(activeModalRankedEntry.drive_file_id, activeModalRankedEntry.file_url)} alt="" style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', borderRadius: '8px', background: '#000', marginBottom: '15px' }} />

            {/* CSAK LEZÁRÁS UTÁN JELENNEK MEG A RÉSZLETES AI ÉRTÉKELÉSEK */}
            {isRoundClosed ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: 'var(--bg-main)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-main)', textAlign: 'center', marginBottom: '15px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold', display: 'block' }}>Klubtagok szerint</span>
                    <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '4px' }}>
                      {activeModalRankedEntry.memberRank} / {activeModalRankedEntry.totalEntriesCount}
                    </div>
                  </div>

                  <div style={{ borderLeft: '1px solid var(--border-main)', borderRight: '1px solid var(--border-main)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold', display: 'block' }}>Mesterek szerint</span>
                    <div style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '4px' }}>
                      {activeModalRankedEntry.masterRank} / {activeModalRankedEntry.totalEntriesCount}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold', display: 'block' }}>AI (FIAP) szerint</span>
                    <div style={{ color: '#a78bfa', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '4px' }}>
                      {activeModalRankedEntry.aiRank} / {activeModalRankedEntry.totalEntriesCount}
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid #a78bfa', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#a78bfa', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={16} /> AI Szakmai Értékelés (FIAP Szempontok)
                    </span>
                    <span style={{ background: '#a78bfa', color: '#0f172a', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      {activeModalRankedEntry.ai_score} / 100 Pont
                    </span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-body)', fontSize: '0.9rem', lineHeight: '1.6' }}>{activeModalRankedEntry.ai_feedback}</p>
                </div>

                {activeModalRankedEntry.course_title && (
                  <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
                    <div>
                      <small style={{ color: '#10b981', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>🎯 Az AI által javasolt klubtanfolyam fejlődéshez:</small>
                      <strong style={{ color: 'var(--text-title)', fontSize: '1rem' }}>{activeModalRankedEntry.course_title}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Ár: {activeModalRankedEntry.course_price} • {activeModalRankedEntry.course_location_detail}</div>
                    </div>
                    {onOpenCourses && (
                      <button onClick={() => { setSelectedEntryModal(null); onOpenCourses(); }} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        Megtekintés
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '15px', background: 'var(--bg-main)', borderRadius: '8px', fontSize: '0.88rem' }}>
                🔒 A részletes AI értékelések és a rangsor a heti forduló lezárultával (szerda éjfél után) válnak láthatóvá.
              </div>
            )}

          </div>
        </div>
      )}

      {/* 💡 SÚGÓ & SZABÁLYZAT MODÁL */}
      {showHelpModal && (
        <div onClick={() => setShowHelpModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '16px', padding: '30px', maxWidth: '680px', width: '100%', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-main)', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#a78bfa', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <HelpCircle size={26} /> Heti Képértékelő – Útmutató & Szabályzat
              </h3>
              <button onClick={() => setShowHelpModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: 'var(--text-body)', fontSize: '0.92rem', lineHeight: '1.6' }}>
              
              <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-main)' }}>
                <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-title)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🎯 Mi ez a funkció?
                </h4>
                A **Heti Képértékelő** a fotóklubod automatizált szakmai műhelye. Lehetővé teszi, hogy a klubtagok hetente megosszák legfrissebb képeiket, és 3 független szemszögből kaphassanak objektív visszacsatolást a fejlődésükhöz.
              </div>

              <div>
                <h4 style={{ margin: '0 0 8px 0', color: '#38bdf8', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📅 Heti Ritmus & Határidők
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><b>Képfeltöltési időszak:</b> Hétfő 00:00 – Vasárnap 24:00.</li>
                  <li><b>Értékelési időszak:</b> Hétfő 00:00 – Szerda 24:00.</li>
                  <li><b>Eredményhirdetés & Zárás:</b> Csütörtök 00:00-tól a képek archiválódnak, megjelennek az eredmények és a sorrendek.</li>
                </ul>
              </div>

              <div>
                <h4 style={{ margin: '0 0 8px 0', color: '#f59e0b', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  👥 A 3 Értékelő Csoport & Pontozás
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                  <div style={{ background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #38bdf8' }}>
                    <b style={{ color: '#38bdf8' }}>1. Klubtagok (0 – 2 pont)</b><br />
                    Minden klubtag tetszőleges számú képet értékelhet a sajátján kívül (0 = Elfogadható, 1 = Jó, 2 = Kiváló).
                  </div>

                  <div style={{ background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                    <b style={{ color: '#f59e0b' }}>2. Mesterek (1 – 10 pont)</b><br />
                    A Mesterek a klubvezető által megbízott tapasztalt fotósok és szakmai mentorok, akik 1-től 10-ig terjedő skálán adják meg a szakmai pontszámot.
                  </div>

                  <div style={{ background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #a78bfa' }}>
                    <b style={{ color: '#a78bfa' }}>3. AI Értékelő (Gemini 2.5) (10 – 100 pont)</b><br />
                    A mesterséges intelligencia a nemzetközi **FIAP photowork** szempontrendszer alapján elemzi a képet. Besorolja kategóriába (portré, színes, monokróm, természet), szöveges kritikát ír, és hiányosság esetén ajánlja a klub megfelelő tanfolyamát.
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-main)' }}>
                <h4 style={{ margin: '0 0 6px 0', color: '#10b981', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🏆 Mit jelent a helyezés (pl. 12/321)?
                </h4>
                A forduló lezárulta után a fotókártyán lévő tört számok azt mutatják meg, hogy az adott héten beküldött összes képből (pl. 321 fotóból) a fotód hányadik helyet érte el az adott csoport rangsorában:<br />
                • <b>Klubtagok szerint:</b> pl. 121 / 321<br />
                • <b>Mesterek szerint:</b> pl. 3 / 321<br />
                • <b>AI (FIAP) szerint:</b> pl. 12 / 321
              </div>

              <div>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-title)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  💳 Feltöltési Csomagkeretek
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><b>Ingyenes / Alap csomag:</b> Hetente 1 kép feltöltése.</li>
                  <li><b>Prémium 1. szint:</b> Hetente 3 kép feltöltése.</li>
                  <li><b>Prémium Pro (2. szint):</b> Hetente akár 10 kép feltöltése + FIAP felkészítő modul.</li>
                </ul>
              </div>

            </div>

            <div style={{ textAlign: 'center', marginTop: '25px', paddingTop: '15px', borderTop: '1px solid var(--border-main)' }}>
              <button onClick={() => setShowHelpModal(false)} style={{ background: '#a78bfa', color: '#0f172a', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                Értettem, bezárás
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODÁL: KÉP FELTÖLTÉSE */}
      {showUploadModal && (
        <div onClick={() => setShowUploadModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleUpload} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', padding: '25px', maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '1.3rem' }}>Kép Feltöltése a Heti Értékelőre</h3>

            <div>
              <label style={{ display: 'block', color: 'var(--text-title)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Kép Címe *</label>
              <input type="text" value={photoTitle} onChange={e => setPhotoTitle(e.target.value)} required placeholder="pl.: Hajnali csend" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', outline: 'none' }} />
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-title)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Fotó Kiválasztása *</label>
              <input type="file" accept="image/*" onChange={handleFileSelect} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)' }} />
            </div>

            {uploadPreview && (
              <div style={{ textAlign: 'center', background: '#000', borderRadius: '8px', padding: '10px' }}>
                <img src={uploadPreview} alt="Előnézet" style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px' }} />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowUploadModal(false)} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer' }}>Mégse</button>
              <button type="submit" disabled={isUploading || !uploadFile} style={{ background: '#f97316', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: isUploading || !uploadFile ? 0.6 : 1 }}>
                {isUploading ? 'Feltöltés & AI Elemzés...' : 'Beküldés & AI Elemzés'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
