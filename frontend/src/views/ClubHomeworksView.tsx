import React, { useState, useEffect } from 'react';
import { getImageUrl } from '../utils/helpers';
import { BACKEND_URL } from '../utils/constants';

import { useLanguage } from '../context/LanguageContext';

interface ClubHomeworksViewProps {
  user: any; 
  currentDbUser: any;
  myClubHomeworks: any[];
  myHomeworkEntries: any[];
  clubHomeworkEntries: any[];
  isLeader: boolean;
  setFullscreenData: (data: any) => void; 
  handleToggleLike: (entryId: number) => void;
  fetchMyEntries: (email: string) => void; 
  fetchClubHomeworkEntries: (clubId: number, email: string) => void; 
  clubs: any[]; 
}

export default function ClubHomeworksView({
  user, currentDbUser, myClubHomeworks, myHomeworkEntries, clubHomeworkEntries,
  isLeader, setFullscreenData, handleToggleLike, fetchMyEntries, fetchClubHomeworkEntries, clubs
}: ClubHomeworksViewProps) {
  
  const { t, lang } = useLanguage();
  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const, fontSize: '0.88rem' };

  const [activeClubs, setActiveClubs] = useState<any[]>([]);
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [sortedHwIds, setSortedHwIds] = useState<number[]>([]);
  const [expandedHwIds, setExpandedHwIds] = useState<number[]>([]);
  const [hwSearch, setHwSearch] = useState('');
  const [filterSelectedHwIds, setFilterSelectedHwIds] = useState<number[]>([]);
  const [localSelections, setLocalSelections] = useState<Record<number, boolean>>({});

  const [activeUploadHw, setActiveUploadHw] = useState<number | null>(null);
  const [hwUploadFile, setHwUploadFile] = useState<File | null>(null);
  const [hwUploadPreview, setHwUploadPreview] = useState<string | null>(null);
  const [hwUploadTitle, setHwUploadTitle] = useState('');
  const [isHwUploading, setIsHwUploading] = useState(false);
  
  const [downloadingHwId, setDownloadingHwId] = useState<number | null>(null);

  const [editingHwEntryId, setEditingHwEntryId] = useState<number | null>(null);
  const [editHwEntryTitle, setEditHwEntryTitle] = useState('');

  const [userStorage, setUserStorage] = useState({ count: 0, bytes: 0 });
  const [aiUsageCount, setAiUsageCount] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
    const token = localStorage.getItem('photoAppToken');
    return {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...extraHeaders
    };
  };

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/clubs/active-only`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => setActiveClubs(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error("Hiba az aktív klubok lekérésekor:", err);
        setActiveClubs([]);
      });
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    
    const fetchUserStats = async () => {
      setIsLoadingStats(true);
      try {
        const resStorage = await fetch(`${BACKEND_URL}/api/admin/user-storage-stats`, { headers: getAuthHeaders() });
        if (resStorage.ok) {
          const allStats = await resStorage.json();
          if (Array.isArray(allStats)) {
            const myStats = allStats.find((s: any) => s.user_email === user.email);
            if (myStats) {
              setUserStorage({
                count: myStats.total_photos || 0,
                bytes: Number(myStats.total_bytes) || 0
              });
            }
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

  const loadPendingMembers = () => {
    const matchedClub = activeClubs.find(c => c.name === user?.club_name);
    const effectiveClubId = user?.club_id || matchedClub?.id;

    if (isLeader && effectiveClubId) {
      fetch(`${BACKEND_URL}/api/clubs/pending-members?clubId=${effectiveClubId}`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => setPendingMembers(Array.isArray(data) ? data : []))
        .catch(console.error);
    }
  };

  useEffect(() => {
    if (activeClubs.length > 0) {
      loadPendingMembers();
    }
  }, [user, isLeader, activeClubs]);

  if (!currentDbUser?.club_name || currentDbUser?.club_role === 'pending') {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', boxSizing: 'border-box', width: '100%' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0', wordBreak: 'break-word', fontSize: '1.4rem' }}>
          {currentDbUser?.club_role === 'pending' ? 'Jelentkezésed jóváhagyásra vár' : 'Nincs klubtagságod'}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5', wordBreak: 'break-word' }}>
          A klub belső fotós feladatainak eléréséhez és a képleadásokhoz meg kell várnod a vezető hivatalos visszaigazolását.
        </p>
      </div>
    );
  }

  const handleHwFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const file = e.target.files?.[0]; 
    if (file) { setHwUploadFile(file); setHwUploadPreview(URL.createObjectURL(file)); } 
  };

  const handleUploadHw = async (homeworkId: number) => {
    if (!hwUploadFile || !hwUploadTitle) return alert("Kép és cím megadása kötelező!");
    setIsHwUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', hwUploadFile);
      formData.append('homeworkId', String(homeworkId));
      formData.append('userEmail', user.email);
      formData.append('userName', user.name);
      formData.append('title', hwUploadTitle);

      const res = await fetch(`${BACKEND_URL}/api/upload-homework`, { 
        method: 'POST', 
        headers: getAuthHeaders(),
        body: formData 
      });
      if (res.ok) { 
        alert("Feltöltve!"); 
        setActiveUploadHw(null); setHwUploadFile(null); setHwUploadPreview(null); setHwUploadTitle(''); 
        fetchMyEntries(user.email); 
        const club = clubs.find(c => c.name === currentDbUser?.club_name); 
        if (club) fetchClubHomeworkEntries(club.id, user.email);
      } else { 
        const err = await res.json(); alert(`Hiba: ${err.error}`); 
      }
    } catch (error) { alert("Hiba a feltöltésnél"); } finally { setIsHwUploading(false); }
  };

  const handleUpdateHwEntryTitle = async (entryId: number) => {
    if (!editHwEntryTitle) return alert('A cím nem lehet üres!');
    const res = await fetch(`${BACKEND_URL}/api/homework-entries/${entryId}`, { 
      method: 'PUT', 
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }), 
      body: JSON.stringify({ title: editHwEntryTitle, userEmail: user.email }) 
    });
    if (res.ok) { 
      setEditingHwEntryId(null); 
      fetchMyEntries(user.email); 
      const club = clubs.find(c => c.name === currentDbUser?.club_name); 
      if (club) fetchClubHomeworkEntries(club.id, user.email);
    } else alert('Hiba a cím frissítésekor!');
  };

  const handleLocalDeleteHwEntry = async (entryId: number) => {
    if (!window.confirm("Biztosan végleg törölni szeretnéd ezt a beküldött fotódat?")) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/homework-entries/${entryId}?userEmail=${encodeURIComponent(user.email)}`, {
        method: 'DELETE',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userEmail: user.email })
      });

      if (res.ok) {
        alert("📸 Kép sikeresen eltávolítva a házi feladatból!");
        fetchMyEntries(user.email); 
        const club = clubs.find(c => c.name === currentDbUser?.club_name); 
        if (club) fetchClubHomeworkEntries(club.id, user.email);
      } else {
        const err = await res.json();
        alert(`Hiba a törlés során: ${err.error}`);
      }
    } catch (e) {
      alert("Hálózati hiba történt a törlés közben.");
    }
  };

  const handleToggleSelect = async (entryId: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/homework-entries/${entryId}/toggle-select`, { 
        method: 'POST',
        headers: getAuthHeaders() 
      });
      if (res.ok) {
        const data = await res.json();
        setLocalSelections(prev => ({ ...prev, [entryId]: data.is_selected === 1 }));
      }
    } catch (e) { console.error('Hiba a kiválasztáskor:', e); }
  };

  const handleDownloadAllSelected = async (homeworkEntries: any[], currentHw: any) => {
    const selectedEntries = homeworkEntries.filter(entry => 
      localSelections[entry.id] !== undefined ? localSelections[entry.id] : (entry.is_selected === 1)
    );

    if (selectedEntries.length === 0) {
      return alert('Nincs kiválasztott kép a tömörítéshez.');
    }

    setDownloadingHwId(currentHw.id);

    try {
      const topicName = currentHw?.topic || 'valogatas';
      
      const res = await fetch(`${BACKEND_URL}/api/homework/download-zip`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          entries: selectedEntries,
          topic: topicName,
          clubId: currentDbUser?.club_id
        })
      });

      if (!res.ok) throw new Error("Szerveroldali hiba történt a tömörítés során.");

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = downloadUrl;
      
      const safeTopicName = topicName.replace(/[^a-zA-Z0-9-_]/g, '_');
      downloadAnchor.setAttribute('download', `${safeTopicName}_portfolio_valogatas.zip`);
      
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      
      URL.revokeObjectURL(downloadUrl);

    } catch (e) {
      alert("Hiba történt a tömeges ZIP letöltés közben. Kérlek ellenőrizd a szerver kapcsolatot!");
      console.error(e);
    } finally {
      setDownloadingHwId(null);
    }
  };
  
  const openGalleryModal = (clickedEntry: any, allEntries: any[], index: number) => {
    setFullscreenData({
      url: getImageUrl(clickedEntry.drive_file_id, clickedEntry.file_url),
      title: `${clickedEntry.title} (${clickedEntry.user_name})`,
      id: clickedEntry.id,
      user_liked: clickedEntry.user_liked,
      like_count: clickedEntry.like_count,
      _entryList: allEntries,
      _currentIndex: index,
      _onNavigate: (newIndex: number) => { openGalleryModal(allEntries[newIndex], allEntries, newIndex); },
      _onToggleLike: (entryId: number) => {
        handleToggleLike(entryId);
        setFullscreenData((prev: any) => ({
          ...prev, user_liked: !prev.user_liked, like_count: prev.user_liked ? Math.max(0, (prev.like_count || 0) - 1) : (prev.like_count || 0) + 1
        }));
      }
    });
  };

  const toggleExpand = (id: number) => setExpandedHwIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const filteredHomeworks = myClubHomeworks.filter(hw => {
    if (!hwSearch) return true;
    const q = hwSearch.toLowerCase();
    return hw.topic.toLowerCase().includes(q) || (hw.description && hw.description.toLowerCase().includes(q));
  });

  return (
    <div style={{ width: '100%', maxWidth: '100vw', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px', wordBreak: 'break-word' }}>
        <span>📝</span> Házi Feladatok: {currentDbUser.club_name}
      </h2>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', background: '#1e293b', padding: '12px', borderRadius: '12px', border: '1px solid #334155', boxSizing: 'border-box', width: '100%' }}>
        <input type="text" placeholder="🔍 Keresés feladat címében vagy leírásában..." value={hwSearch} onChange={e => setHwSearch(e.target.value)} style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: 'white', outline: 'none', fontSize: '0.88rem', boxSizing: 'border-box', width: '100%' }} />
      </div>

      {filteredHomeworks.length === 0 ? (
        <div style={{ padding: '20px', color: '#94a3b8', textAlign: 'center', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', fontSize: '0.9rem' }}>
          {hwSearch ? 'Nincs a keresésnek megfelelő házi feladat.' : 'Jelenleg nincs kiírva házi feladat.'}
        </div>
      ) : (
        filteredHomeworks.map(hw => {
          const safeDeadlineStr = hw.deadline.replace('Z', ''); 
          const deadlineDate = new Date(safeDeadlineStr);
          const isPast = new Date() > deadlineDate;
          
          const myEntries = clubHomeworkEntries.filter(e => e.homework_id === hw.id && e.user_email === user.email);
          const hwEntriesForAllRaw = clubHomeworkEntries.filter(e => e.homework_id === hw.id);
          
          const isSortedByLikes = sortedHwIds.includes(hw.id);
          const isExpanded = expandedHwIds.includes(hw.id);
          const isFilterActive = filterSelectedHwIds.includes(hw.id);

          const finalEntriesForAll = [...hwEntriesForAllRaw].sort((a, b) => {
            if (isSortedByLikes) {
              if ((b.like_count || 0) !== (a.like_count || 0)) {
                return (b.like_count || 0) - (a.like_count || 0);
              }
            }
            const nameA = a.user_name || '';
            const nameB = b.user_name || '';
            return nameA.localeCompare(nameB);
          });

          const displayEntries = isFilterActive 
            ? finalEntriesForAll.filter(entry => localSelections[entry.id] !== undefined ? localSelections[entry.id] : (entry.is_selected === 1))
            : finalEntriesForAll;
          
          const maxImages = hw.max_images || 4;

          const uploaderStats: Record<string, any[]> = {};
          let totalSelectedInHw = 0;

          hwEntriesForAllRaw.forEach(entry => {
             const userName = entry.user_name || 'Ismeretlen';
             if (!uploaderStats[userName]) uploaderStats[userName] = [];
             
             const isSelected = localSelections[entry.id] !== undefined ? localSelections[entry.id] : (entry.is_selected === 1);
             if (isSelected) totalSelectedInHw++;

             uploaderStats[userName].push({ title: entry.title, likes: entry.like_count || 0, isSelected: isSelected });
          });

          const sortedUploaders = Object.keys(uploaderStats).sort((a, b) => a.localeCompare(b));
          const isDownloadingThis = downloadingHwId === hw.id;

          return (
            <div key={hw.id} style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '14px', marginBottom: '16px', border: isPast ? '1px solid #475569' : '1px solid #10b981', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', position: 'relative', transition: 'all 0.3s ease', boxSizing: 'border-box', width: '100%' }}>
              
              <div className="contest-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', color: isPast ? '#cbd5e1' : '#f8fafc', wordBreak: 'break-word' }}>{hw.topic}</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '0 0 12px 0', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{hw.description}</p>
                </div>
                <span style={{ background: isPast ? '#ef444420' : '#10b98120', color: isPast ? '#ef4444' : '#10b981', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  {isPast ? 'Lezárult' : 'Aktív Feltöltés'}
                </span>
              </div>
              
              <p style={{fontSize: '0.8rem', color: '#f59e0b', margin: '0 0 12px 0', fontWeight: 'bold', wordBreak: 'break-word'}}>
                ⏰ Határidő: {deadlineDate.toLocaleString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })} | Max. {maxImages} kép
              </p>

              <button onClick={() => toggleExpand(hw.id)} style={{ width: '100%', background: isExpanded ? '#334155' : '#0f172a', color: isExpanded ? '#94a3b8' : '#38bdf8', border: '1px solid #334155', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                {isExpanded ? '▲ Részletek és Galéria elrejtése' : `▼ ${isPast ? 'Eredmények és Galéria megtekintése' : 'Kép feltöltése és Galéria megtekintése'}`}
              </button>

              {isExpanded && (
                <div style={{ marginTop: '16px', animation: 'fadeIn 0.3s ease-out' }}>
                  
                  {isLeader && (
                    <div style={{ marginBottom: '16px', padding: '14px', background: '#0f172a', borderRadius: '12px', border: '1px solid #f59e0b50', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📊 Klub Portfólió Válogatás (Vezetői Nézet)</h4>
                        
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          
                          <button 
                            onClick={() => handleDownloadAllSelected(hwEntriesForAllRaw, hw)}
                            disabled={isDownloadingThis || totalSelectedInHw === 0}
                            style={{ 
                              background: isDownloadingThis ? '#475569' : 'linear-gradient(135deg, #f59e0b, #d97706)', 
                              color: isDownloadingThis ? '#cbd5e1' : '#0f172a', 
                              border: 'none', 
                              padding: '6px 12px', 
                              borderRadius: '6px', 
                              fontWeight: 'bold', 
                              fontSize: '0.8rem', 
                              cursor: (isDownloadingThis || totalSelectedInHw === 0) ? 'not-allowed' : 'pointer', 
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            {isDownloadingThis 
                              ? `⏳ Csomagolás... (${totalSelectedInHw})` 
                              : `📦 Letöltés (${totalSelectedInHw})`}
                          </button>

                          <div style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b98150', padding: '3px 10px', borderRadius: '100px', fontWeight: 'bold', fontSize: '0.78rem' }}>Kiválasztva: {totalSelectedInHw}</div>
                        </div>
                      </div>

                      {sortedUploaders.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Még nem érkezett feltöltés a klubtagoktól.</div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                                <th style={{ padding: '6px' }}>Szerző</th><th style={{ padding: '6px', textAlign: 'center' }}>db</th><th style={{ padding: '6px' }}>Képek</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedUploaders.map(name => {
                                const userEntries = uploaderStats[name];
                                return (
                                  <tr key={name} style={{ borderBottom: '1px solid #1e293b' }}>
                                    <td style={{ padding: '8px 6px', color: '#f8fafc', fontWeight: 'bold', wordBreak: 'break-word' }}>{name}</td>
                                    <td style={{ padding: '8px 6px', textAlign: 'center', color: userEntries.length >= maxImages ? '#10b981' : '#cbd5e1' }}>{userEntries.length}/{maxImages}</td>
                                    <td style={{ padding: '8px 6px' }}>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {userEntries.map((entry, i) => (
                                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: entry.isSelected ? '#10b98120' : '#1e293b', border: entry.isSelected ? '1px solid #10b98150' : '1px solid #334155', padding: '3px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                                            <span style={{ color: '#e2e8f0', maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.title}</span>
                                            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>❤️{entry.likes}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {!isPast && activeUploadHw !== hw.id && myEntries.length < maxImages && (
                    <button onClick={() => { setActiveUploadHw(hw.id); setHwUploadTitle(''); setHwUploadPreview(null); }} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '12px', width: '100%', fontSize: '0.88rem' }}>+ Kép Feltöltése ({myEntries.length}/{maxImages})</button>
                  )}
                  
                  {!isPast && myEntries.length >= maxImages && (
                    <div style={{ padding: '8px', background: '#10b98120', color: '#10b981', borderRadius: '8px', marginBottom: '12px', fontWeight: 'bold', textAlign: 'center', fontSize: '0.85rem' }}>🎉 Elérted a maximális {maxImages} feltöltést!</div>
                  )}

                  {activeUploadHw === hw.id && (
                    <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #38bdf840', boxSizing: 'border-box' }}>
                      <h4 style={{marginTop: 0, color: '#38bdf8', fontSize: '1rem', marginBottom: '10px'}}>Házi feladat feltöltése</h4>
                      <input placeholder="Kép címe" value={hwUploadTitle} onChange={e => setHwUploadTitle(e.target.value)} style={inputStyle} disabled={isHwUploading} />
                      <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleHwFileSelect} style={{ color: '#94a3b8', marginBottom: '12px', width: '100%', fontSize: '0.8rem' }} disabled={isHwUploading} />
                      
                      {/* 🎯 JAVÍTVA: ReferrerPolicy hozzáadva a feltöltési előnézethez */}
                      {hwUploadPreview && <div style={{marginTop: '8px', marginBottom: '16px', textAlign: 'center'}}><img src={hwUploadPreview} alt="Előnézet" referrerPolicy="no-referrer" style={{maxHeight: '220px', borderRadius: '8px', border: '2px solid #334155'}} /></div>}
                      
                      <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                        <button onClick={() => handleUploadHw(hw.id)} disabled={isHwUploading} style={{ flex: '1 1 140px', background: isHwUploading ? '#475569' : '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: isHwUploading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>{isHwUploading ? 'Feltöltés...' : 'Beküldés 🚀'}</button>
                        <button onClick={() => { setActiveUploadHw(null); setHwUploadPreview(null); }} disabled={isHwUploading} style={{ flex: '1 1 90px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '10px', borderRadius: '8px', cursor: isHwUploading ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}>Mégse</button>
                      </div>
                    </div>
                  )}

                  {myEntries.length > 0 && (
                    <div style={{ marginTop: '16px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
                      <h4 style={{margin: '0 0 12px 0', fontSize: '1rem', color: '#cbd5e1'}}>Saját beküldött képeid</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                        {myEntries.map((entry, index) => {
                          const imageUrl = getImageUrl(entry.drive_file_id, entry.file_url);
                          return (
                            <div key={entry.id} style={{ background: '#0f172a', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
                              
                              <div style={{ height: '120px', width: '100%', background: '#000000', cursor: 'zoom-in' }} onClick={() => openGalleryModal(entry, myEntries, index)}>
                                {/* 🎯 JAVÍTVA: ReferrerPolicy hozzáadva a saját képekhez */}
                                <img src={imageUrl} alt={entry.title} referrerPolicy="no-referrer" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              </div>
                              
                              {editingHwEntryId === entry.id ? (
                                <div style={{ padding: '8px' }}>
                                  <input value={editHwEntryTitle} onChange={e => setEditHwEntryTitle(e.target.value)} style={{ width: '100%', padding: '6px', marginBottom: '8px', backgroundColor: '#1e293b', border: '1px solid #38bdf8', color: 'white', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.8rem' }} />
                                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    <button onClick={() => handleUpdateHwEntryTitle(entry.id)} style={{ flex: '1 1 100%', background: '#10b981', color: 'white', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Mentés</button>
                                    <button onClick={() => setEditingHwEntryId(null)} style={{ flex: '1 1 100%', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Mégse</button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ padding: '8px' }}>
                                  <div style={{ fontSize: '0.82rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#f8fafc' }}>{entry.title}</div>
                                  {!isPast && (
                                    <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                                      <button onClick={() => { setEditingHwEntryId(entry.id); setEditHwEntryTitle(entry.title); }} style={{ flex: '1 1 45%', background: '#38bdf820', color: '#38bdf8', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem' }}>Szerkeszt</button>
                                      <button onClick={() => handleLocalDeleteHwEntry(entry.id)} style={{ flex: '1 1 45%', background: '#ef444420', color: '#ef4444', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem' }}>Törlés</button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {isPast && (
                    <div style={{ marginTop: '20px', borderTop: isLeader ? '2px dashed #f59e0b' : '1px solid #334155', paddingTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                        <div>
                          <h4 style={{margin: '0 0 4px 0', fontSize: '1.05rem', color: isLeader ? '#f59e0b' : '#38bdf8'}}>{isLeader ? '👑 Vezetői Galéria: Eredmények' : '📸 Klub Galéria: Eredmények'}</h4>
                          <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0, wordBreak: 'break-word' }}>Kattints a képre a galéria nézethez. Két nézet között is válthatsz!</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button onClick={() => { if (isFilterActive) setFilterSelectedHwIds(prev => prev.filter(id => id !== hw.id)); else setFilterSelectedHwIds(prev => [...prev, hw.id]); }} style={{ background: isFilterActive ? '#10b981' : '#1e293b', color: isFilterActive ? '#0f172a' : '#cbd5e1', border: isFilterActive ? 'none' : '1px solid #475569', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>{isFilterActive ? '✅ Csak kiválasztottak' : '🔍 Csak kiválasztottak'}</button>
                          <button onClick={() => { if (isSortedByLikes) setSortedHwIds(prev => prev.filter(id => id !== hw.id)); else setSortedHwIds(prev => [...prev, hw.id]); }} style={{ background: isSortedByLikes ? '#ef4444' : '#1e293b', color: isSortedByLikes ? '#ffffff' : '#cbd5e1', border: isSortedByLikes ? 'none' : '1px solid #475569', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>{isSortedByLikes ? '❤️ Lájk szerint' : '👤 Névsor szerint'}</button>
                        </div>
                      </div>
                      
                      {displayEntries.length === 0 ? (
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{isFilterActive ? 'Nincs megjeleníthető kiválasztott kép.' : 'Még senki nem töltött fel képet ehhez a feladathoz.'}</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                          {displayEntries.map((entry, index) => {
                            const imageUrl = getImageUrl(entry.drive_file_id, entry.file_url);
                            const isSelected = localSelections[entry.id] !== undefined ? localSelections[entry.id] : (entry.is_selected === 1);

                            return (
                              <div key={entry.id} style={{ position: 'relative', background: '#0f172a', borderRadius: '8px', overflow: 'hidden', border: isSelected ? '2px solid #10b981' : (isLeader ? '1px solid #f59e0b50' : '1px solid #334155'), display: 'flex', flexDirection: 'column' }}>
                                
                                {isSelected && (
                                  <div style={{ position: 'absolute', top: '8px', left: '8px', background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', zIndex: 10 }}>✅ Kiválasztva</div>
                                )}

                                <div style={{ height: '130px', width: '100%', background: '#000000', cursor: 'zoom-in' }} onClick={() => openGalleryModal(entry, displayEntries, index)}>
                                  {/* 🎯 JAVÍTVA: ReferrerPolicy hozzáadva az összes kluber eredmény képhez */}
                                  <img src={imageUrl} alt={entry.title} referrerPolicy="no-referrer" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>
                                
                                <div style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                  <div style={{ fontSize: '0.82rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#f8fafc' }}>{entry.title}</div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{entry.user_name}</div>
                                    <button onClick={(e) => { e.stopPropagation(); handleToggleLike(entry.id); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 6px', borderRadius: '50px', backgroundColor: entry.user_liked ? '#ef444420' : 'transparent' }}>
                                      <span style={{ fontSize: '0.85rem', color: entry.user_liked ? '#ef4444' : '#cbd5e1' }}>{entry.user_liked ? '❤️' : '🤍'}</span>
                                      <span style={{ color: entry.user_liked ? '#ef4444' : '#94a3b8', fontSize: '0.78rem', fontWeight: 'bold' }}>{entry.like_count || 0}</span>
                                    </button>
                                  </div>
                                </div>
                                
                                {isLeader && (
                                  <div style={{ display: 'flex', borderTop: '1px solid #f59e0b40' }}>
                                    <button onClick={() => handleToggleSelect(entry.id)} style={{ flex: 1, background: isSelected ? '#10b98120' : 'transparent', color: isSelected ? '#10b981' : '#94a3b8', border: 'none', padding: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>{isSelected ? '❌ Kivesz' : '✅ Kiválaszt'}</button>
                                    <div style={{ width: '1px', background: '#f59e0b40' }}></div>
                                    <a href={entry.drive_file_id ? `https://docs.google.com/uc?export=download&id=${entry.drive_file_id}` : entry.file_url} target="_blank" rel="noreferrer" title="Eredeti felbontású kép letöltése" style={{ flex: 1, textAlign: 'center', background: '#f59e0b15', color: '#f59e0b', padding: '6px', fontSize: '0.75rem', textDecoration: 'none', fontWeight: 'bold' }}>⬇️ Letöltés</a>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
