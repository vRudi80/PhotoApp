import React, { useState, useEffect } from 'react';
import { getImageUrl } from '../utils/helpers';
import { BACKEND_URL } from '../utils/constants';

// 🎯 Nyelvi kontextus aktiválása
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
  
  // 🎯 JAVÍTVA: A hook-ot a komponens legtetejére tettem az early return elé, így a hatókör mindenki számára nyitott!
  const { t, lang } = useLanguage();
// 🎯 KULCSFONTOSSÁGÚ JAVÍTÁS: Függőben lévő tagok kizárása a házi feladatokból
  if (!currentDbUser?.club_name || currentDbUser?.club_role === 'pending') {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>
          {currentDbUser?.club_role === 'pending' ? 'Jelentkezésed jóváhagyásra vár' : 'Nincs klubtagságod'}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
          A klub belső fotós feladatainak eléréséhez és a képleadásokhoz meg kell várnod a vezető hivatalos visszaigazolását.
        </p>
      </div>
    );
  }
  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

  // ==============================================================
  // 1. HELYI ÁLLAPOTOK
  // ==============================================================
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
  
  const [editingHwEntryId, setEditingHwEntryId] = useState<number | null>(null);
  const [editHwEntryTitle, setEditHwEntryTitle] = useState('');

  // Tárhely és AI használat követéséhez szükséges állapotok
  const [userStorage, setUserStorage] = useState({ count: 0, bytes: 0 });
  const [aiUsageCount, setAiUsageCount] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

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
  const [activeClubs, setActiveClubs] = useState<any[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);

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

  if (!currentDbUser?.club_name) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>Nem vagy klubhoz rendelve</h2>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>A klubod feladatainak megtekintéséhez kérjük, vedd fel a kapcsolatot egy adminisztrátorral. - kovari.rudolf@gmail.com</p>
      </div>
    );
  }

  // ==============================================================
  // 2. FÜGGVÉNYEK
  // ==============================================================
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

      const res = await fetch(`${BACKEND_URL}/api/upload-homework`, { method: 'POST', body: formData });
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
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: editHwEntryTitle, userEmail: user.email }) 
    });
    if (res.ok) { 
      setEditingHwEntryId(null); 
      fetchMyEntries(user.email); 
      const club = clubs.find(c => c.name === currentDbUser?.club_name); 
      if (club) fetchClubHomeworkEntries(club.id, user.email);
    } else alert('Hiba a cím frissítésekor!');
  };

  const handleLocalDeleteHwEntry = async (entryId: number) => {
    if (!window.confirm("Biztosan véglegesen törölni szeretnéd ezt a beküldött fotódat?")) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/homework-entries/${entryId}?userEmail=${encodeURIComponent(user.email)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`${BACKEND_URL}/api/homework-entries/${entryId}/toggle-select`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLocalSelections(prev => ({ ...prev, [entryId]: data.is_selected === 1 }));
      }
    } catch (e) { console.error('Hiba a kiválasztáskor:', e); }
  };

  const handleDownloadAllSelected = async (homeworkEntries: any[], currentHw: any) => {
    // Kiszűrjük a kiválasztott képeket
    const selectedEntries = homeworkEntries.filter(entry => 
      localSelections[entry.id] !== undefined ? localSelections[entry.id] : (entry.is_selected === 1)
    );

    if (selectedEntries.length === 0) {
      alert("Nincs kiválasztott kép ebben a feladatban, amit le lehetne tölteni!");
      return;
    }

    const confirmMessage = `Biztosan le szeretnéd tölteni a feladat mind a(z) ${selectedEntries.length} db kiválasztott képét egyetlen közös .ZIP fájlban?\n\n(A szerver a háttérben letölti és becsomagolja a képeket, ez eltarthat pár másodpercig.)`;

    if (!window.confirm(confirmMessage)) return;

    try {
      // 🎯 JAVÍTVA: A paraméterként kapott objektumból olvassuk ki a témát
      const res = await fetch(`${BACKEND_URL}/api/homework/download-zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: selectedEntries,
          topic: currentHw.topic
        })
      });

      if (!res.ok) throw new Error("Szerveroldali hiba történt a tömörítés során.");

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = downloadUrl;
      
      // 🎯 JAVÍTVA: Itt is a biztonságos paramétert használjuk a fájlnévhez
      const safeTopic = (currentHw.topic || 'valogatas').replace(/[^a-zA-Z0-9-_]/g, '_');
      downloadAnchor.setAttribute('download', `${safeTopic}_portfolio_valogatas.zip`);
      
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      
      URL.revokeObjectURL(downloadUrl);

    } catch (e) {
      alert("Hiba történt a tömeges ZIP letöltés közben. Kérlek ellenőrizd a szerver kapcsolatot!");
      console.error(e);
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
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <span style={{ fontSize: '2.5rem' }}>📝</span> Házi Feladatok: {currentDbUser.club_name}
      </h2>

      <div style={{ marginBottom: '25px', display: 'flex', gap: '15px', alignItems: 'center', background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
        <input type="text" placeholder="🔍 Keresés feladat címében vagy leírásában..." value={hwSearch} onChange={e => setHwSearch(e.target.value)} style={{ flex: 1, padding: '12px 15px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: 'white', outline: 'none', fontSize: '1rem' }} />
      </div>

      {filteredHomeworks.length === 0 ? (
        <div style={{ padding: '20px', color: '#94a3b8', textAlign: 'center', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
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

          return (
            <div key={hw.id} style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: isPast ? '1px solid #475569' : '1px solid #10b981', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', position: 'relative', transition: 'all 0.3s ease' }}>
              
              <div className="contest-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '1.5rem', color: isPast ? '#cbd5e1' : '#f8fafc' }}>{hw.topic}</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '0 0 15px 0', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{hw.description}</p>
                </div>
                <span style={{ background: isPast ? '#ef444420' : '#10b98120', color: isPast ? '#ef4444' : '#10b981', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {isPast ? 'Lezárult' : 'Aktív Feltöltés'}
                </span>
              </div>
              
              <p style={{fontSize: '0.85rem', color: '#f59e0b', margin: '0 0 15px 0', fontWeight: 'bold'}}>
                ⏰ Határidő: {deadlineDate.toLocaleString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })} | Maximum {maxImages} kép
              </p>

              <button onClick={() => toggleExpand(hw.id)} style={{ width: '100%', background: isExpanded ? '#334155' : '#0f172a', color: isExpanded ? '#94a3b8' : '#38bdf8', border: '1px solid #334155', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}>
                {isExpanded ? '▲ Részletek és Galéria elrejtése' : `▼ ${isPast ? 'Eredmények és Galéria megtekintése' : 'Kép feltöltése és Galéria megtekintése'}`}
              </button>

              {isExpanded && (
                <div style={{ marginTop: '20px', animation: 'fadeIn 0.3s ease-out' }}>
                  
                  {isLeader && (
                    <div style={{ marginBottom: '20px', padding: '20px', background: '#0f172a', borderRadius: '12px', border: '1px solid #f59e0b50' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1px' }}>📊 Klub Portfólió Válogatás (Vezetői Nézet)</h4>
                        
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <button 
  onClick={() => handleDownloadAllSelected(hwEntriesForAllRaw, hw)}
  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#0f172a', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 10px rgba(245,158,11,0.2)', transition: 'all 0.2s' }}
>
  📦 Összes kiválasztott letöltése ({totalSelectedInHw})
                          </button>
                          <div style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b98150', padding: '4px 12px', borderRadius: '100px', fontWeight: 'bold', fontSize: '0.85rem' }}>✅ Összes kiválasztva: {totalSelectedInHw} kép</div>
                        </div>
                      </div>

                      {sortedUploaders.length === 0 ? (
                        <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Még nem érkezett feltöltés a klubtagoktól.</div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                                <th style={{ padding: '8px' }}>Szerző neve</th><th style={{ padding: '8px', textAlign: 'center' }}>Feltöltött</th><th style={{ padding: '8px' }}>Beküldött képek (Lájk / Státusz)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedUploaders.map(name => {
                                const userEntries = uploaderStats[name];
                                return (
                                  <tr key={name} style={{ borderBottom: '1px solid #1e293b' }}>
                                    <td style={{ padding: '12px 8px', color: '#f8fafc', fontWeight: 'bold' }}>{name}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'center', color: userEntries.length >= maxImages ? '#10b981' : '#cbd5e1' }}>{userEntries.length} / {maxImages}</td>
                                    <td style={{ padding: '12px 8px' }}>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {userEntries.map((entry, i) => (
                                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: entry.isSelected ? '#10b98120' : '#1e293b', border: entry.isSelected ? '1px solid #10b98150' : '1px solid #334155', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem' }}>
                                            <span style={{ color: '#e2e8f0', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.title}</span>
                                            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>❤️ {entry.likes}</span>
                                            {entry.isSelected && <span title="Kiválasztva" style={{ color: '#10b981' }}>✅</span>}
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
                    <button onClick={() => { setActiveUploadHw(hw.id); setHwUploadTitle(''); setHwUploadPreview(null); }} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '15px', width: '100%' }}>+ Kép Feltöltése ({myEntries.length}/{maxImages})</button>
                  )}
                  
                  {!isPast && myEntries.length >= maxImages && (
                    <div style={{ padding: '10px', background: '#10b98120', color: '#10b981', borderRadius: '8px', marginBottom: '15px', fontWeight: 'bold', textAlign: 'center' }}>🎉 Elérted a maximális {maxImages} feltöltést!</div>
                  )}

                  {activeUploadHw === hw.id && (
                    <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #38bdf840' }}>
                      <h4 style={{marginTop: 0, color: '#38bdf8', fontSize: '1.2rem'}}>Házi feladat feltöltése</h4>
                      <input placeholder="Kép címe" value={hwUploadTitle} onChange={e => setHwUploadTitle(e.target.value)} style={inputStyle} disabled={isHwUploading} />
                      <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleHwFileSelect} style={{ color: '#94a3b8', marginBottom: '15px', width: '100%' }} disabled={isHwUploading} />
                      {hwUploadPreview && <div style={{marginTop: '10px', marginBottom: '20px', textAlign: 'center'}}><img src={hwUploadPreview} alt="Előnézet" style={{maxHeight: '300px', borderRadius: '8px', border: '2px solid #334155'}} /></div>}
                      <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                        <button onClick={() => handleUploadHw(hw.id)} disabled={isHwUploading} style={{ flex: '1 1 150px', background: isHwUploading ? '#475569' : '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: isHwUploading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>{isHwUploading ? 'Feltöltés ⏳...' : 'Beküldés 🚀'}</button>
                        <button onClick={() => { setActiveUploadHw(null); setHwUploadPreview(null); }} disabled={isHwUploading} style={{ flex: '1 1 100px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '12px', borderRadius: '8px', cursor: isHwUploading ? 'not-allowed' : 'pointer' }}>Mégse</button>
                      </div>
                    </div>
                  )}

                  {myEntries.length > 0 && (
                    <div style={{ marginTop: '20px', borderTop: '1px solid #334155', paddingTop: '20px' }}>
                      <h4 style={{margin: '0 0 15px 0', fontSize: '1.1rem', color: '#cbd5e1'}}>Saját beküldött képeid</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
                        {myEntries.map((entry, index) => {
                          const imageUrl = getImageUrl(entry.drive_file_id, entry.file_url);
                          return (
                            <div key={entry.id} style={{ background: '#0f172a', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
                              
                              <div style={{ height: '140px', width: '100%', background: '#000000', cursor: 'zoom-in' }} onClick={() => openGalleryModal(entry, myEntries, index)}>
                                <img src={imageUrl} alt={entry.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              </div>
                              
                              {editingHwEntryId === entry.id ? (
                                <div style={{ padding: '12px' }}>
                                  <input value={editHwEntryTitle} onChange={e => setEditHwEntryTitle(e.target.value)} style={{ width: '100%', padding: '6px', marginBottom: '10px', backgroundColor: '#1e293b', border: '1px solid #38bdf8', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
                                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                    <button onClick={() => handleUpdateHwEntryTitle(entry.id)} style={{ flex: '1 1 100%', background: '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Mentés</button>
                                    <button onClick={() => setEditingHwEntryId(null)} style={{ flex: '1 1 100%', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Mégse</button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ padding: '12px' }}>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#f8fafc' }}>{entry.title}</div>
                                  {!isPast && (
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                                      <button onClick={() => { setEditingHwEntryId(entry.id); setEditHwEntryTitle(entry.title); }} style={{ flex: '1 1 45%', background: '#38bdf820', color: '#38bdf8', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Szerkeszt</button>
                                      <button onClick={() => handleLocalDeleteHwEntry(entry.id)} style={{ flex: '1 1 45%', background: '#ef444420', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Törlés</button>
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
                    <div style={{ marginTop: '30px', borderTop: isLeader ? '2px dashed #f59e0b' : '1px solid #334155', paddingTop: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
                        <div>
                          <h4 style={{margin: '0 0 5px 0', fontSize: '1.2rem', color: isLeader ? '#f59e0b' : '#38bdf8'}}>{isLeader ? '👑 Vezetői Galéria: Eredmények' : '📸 Klub Galéria: Eredmények'}</h4>
                          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Kattints a képre a galéria nézethez (lapozáshoz). Két nézet között is válthatsz!</p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <button onClick={() => { if (isFilterActive) setFilterSelectedHwIds(prev => prev.filter(id => id !== hw.id)); else setFilterSelectedHwIds(prev => [...prev, hw.id]); }} style={{ background: isFilterActive ? '#10b981' : '#1e293b', color: isFilterActive ? '#0f172a' : '#cbd5e1', border: isFilterActive ? 'none' : '1px solid #475569', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', transition: 'all 0.2s' }}>{isFilterActive ? '✅ Csak kiválasztottak (Mutasd mind)' : '🔍 Csak kiválasztottak mutatása'}</button>
                          <button onClick={() => { if (isSortedByLikes) setSortedHwIds(prev => prev.filter(id => id !== hw.id)); else setSortedHwIds(prev => [...prev, hw.id]); }} style={{ background: isSortedByLikes ? '#ef4444' : '#1e293b', color: isSortedByLikes ? '#ffffff' : '#cbd5e1', border: isSortedByLikes ? 'none' : '1px solid #475569', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', transition: 'all 0.2s' }}>{isSortedByLikes ? '❤️ Népszerűség szerint (Váltás Névsorra)' : '👤 Névsor szerint (Váltás Népszerűségre)'}</button>
                        </div>
                      </div>
                      
                      {displayEntries.length === 0 ? (
                        <p style={{ color: '#94a3b8' }}>{isFilterActive ? 'Nincs megjeleníthető kiválasztott kép.' : 'Még senki nem töltött fel képet ehhez a feladathoz.'}</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
                          {displayEntries.map((entry, index) => {
                            const imageUrl = getImageUrl(entry.drive_file_id, entry.file_url);
                            const isSelected = localSelections[entry.id] !== undefined ? localSelections[entry.id] : (entry.is_selected === 1);

                            return (
                              <div key={entry.id} style={{ position: 'relative', background: '#0f172a', borderRadius: '8px', overflow: 'hidden', border: isSelected ? '2px solid #10b981' : (isLeader ? '1px solid #f59e0b50' : '1px solid #334155'), display: 'flex', flexDirection: 'column', transition: 'border 0.2s' }}>
                                
                                {isSelected && (
                                  <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#10b981', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>✅ Kiválasztva</div>
                                )}

                                <div style={{ height: '160px', width: '100%', background: '#000000', cursor: 'zoom-in' }} onClick={() => openGalleryModal(entry, displayEntries, index)}>
                                  <img src={imageUrl} alt={entry.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>
                                
                                <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#f8fafc' }}>{entry.title}</div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>Készítő: {entry.user_name}</div>
                                    <button onClick={(e) => { e.stopPropagation(); handleToggleLike(entry.id); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', borderRadius: '50px', backgroundColor: entry.user_liked ? '#ef444420' : 'transparent', transition: 'background 0.2s' }}>
                                      <span style={{ fontSize: '1rem', color: entry.user_liked ? '#ef4444' : '#cbd5e1' }}>{entry.user_liked ? '❤️' : '🤍'}</span>
                                      <span style={{ color: entry.user_liked ? '#ef4444' : '#94a3b8', fontSize: '0.85rem', fontWeight: 'bold' }}>{entry.like_count || 0}</span>
                                    </button>
                                  </div>
                                </div>
                                
                                {isLeader && (
                                  <div style={{ display: 'flex', borderTop: '1px solid #f59e0b40' }}>
                                    <button onClick={() => handleToggleSelect(entry.id)} style={{ flex: 1, background: isSelected ? '#10b98120' : 'transparent', color: isSelected ? '#10b981' : '#94a3b8', border: 'none', padding: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>{isSelected ? '❌ Kivesz' : '✅ Kiválaszt'}</button>
                                    <div style={{ width: '1px', background: '#f59e0b40' }}></div>
                                    <a href={entry.drive_file_id ? `https://docs.google.com/uc?export=download&id=${entry.drive_file_id}` : entry.file_url} target="_blank" rel="noreferrer" title="Eredeti felbontású kép letöltése" style={{ flex: 1, textAlign: 'center', background: '#f59e0b15', color: '#f59e0b', padding: '8px', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 'bold', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#f59e0b30'} onMouseOut={e => e.currentTarget.style.background = '#f59e0b15'}>⬇️ Letöltés</a>
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
