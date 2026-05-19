import { useState } from 'react';
import { getImageUrl } from '../utils/helpers';

interface ClubHomeworksViewProps {
  currentDbUser: any;
  myClubHomeworks: any[];
  myHomeworkEntries: any[];
  clubHomeworkEntries: any[];
  isLeader: boolean;
  activeUploadHw: number | null;
  setActiveUploadHw: (id: number | null) => void;
  hwUploadTitle: string;
  setHwUploadTitle: (val: string) => void;
  isHwUploading: boolean;
  hwUploadPreview: string | null;
  setHwUploadPreview: (val: string | null) => void;
  handleHwFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUploadHw: (homeworkId: number) => void;
  setFullscreenData: (data: any) => void; // TRÜKK: any, hogy a plusz lájk adatokat is átvigye!
  editingHwEntryId: number | null;
  setEditingHwEntryId: (id: number | null) => void;
  editHwEntryTitle: string;
  setEditHwEntryTitle: (val: string) => void;
  handleUpdateHwEntryTitle: (entryId: number) => void;
  handleDeleteHwEntry: (entryId: number) => void;
  handleToggleLike: (entryId: number) => void;
}

export default function ClubHomeworksView({
  currentDbUser, myClubHomeworks, myHomeworkEntries, clubHomeworkEntries,
  isLeader, activeUploadHw, setActiveUploadHw, hwUploadTitle, setHwUploadTitle,
  isHwUploading, hwUploadPreview, setHwUploadPreview, handleHwFileSelect, handleUploadHw,
  setFullscreenData, editingHwEntryId, setEditingHwEntryId, editHwEntryTitle,
  setEditHwEntryTitle, handleUpdateHwEntryTitle, handleDeleteHwEntry, handleToggleLike
}: ClubHomeworksViewProps) {
  
  // Állapot, hogy melyik házi feladatnál kérték a népszerűségi rendezést (az ID-kat tároljuk)
  const [sortedHwIds, setSortedHwIds] = useState<number[]>([]);

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

  if (!currentDbUser?.club_name) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>Nem vagy klubhoz rendelve</h2>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>A klubod feladatainak megtekintéséhez kérjük, vedd fel a kapcsolatot egy adminisztrátorral.</p>
      </div>
    );
  }

  // Segédfüggvény a lapozás és a lájk modalnak való átadásához
  const openGalleryModal = (clickedEntry: any, allEntries: any[], index: number) => {
    setFullscreenData({
      url: getImageUrl(clickedEntry.drive_file_id, clickedEntry.file_url),
      title: `${clickedEntry.title} (${clickedEntry.user_name})`,
      id: clickedEntry.id,
      user_liked: clickedEntry.user_liked,
      like_count: clickedEntry.like_count,
      
      // A lapozáshoz szükséges plusz adatok (amit majd a fő App.tsx az új Modals.tsx-nek továbbít)
      _entryList: allEntries,
      _currentIndex: index,
      _onNavigate: (newIndex: number) => {
        const nextEntry = allEntries[newIndex];
        openGalleryModal(nextEntry, allEntries, newIndex); // Rekurzívan hívjuk a lapozásnál!
      },
      _onToggleLike: (entryId: number) => {
        handleToggleLike(entryId);
        // Frissítjük a modalban is a számot (optimizmus)
        setFullscreenData((prev: any) => ({
          ...prev,
          user_liked: !prev.user_liked,
          like_count: prev.user_liked ? Math.max(0, (prev.like_count || 0) - 1) : (prev.like_count || 0) + 1
        }));
      }
    });
  };

  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <span style={{ fontSize: '2.5rem' }}>📝</span> Házi Feladatok: {currentDbUser.club_name}
      </h2>

      {myClubHomeworks.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Jelenleg nincs kiírva házi feladat.</p>
      ) : (
        myClubHomeworks.map(hw => {
          const safeDeadlineStr = hw.deadline.replace('Z', ''); 
          const deadlineDate = new Date(safeDeadlineStr);
          const isPast = new Date() > deadlineDate;
          
          const myEntries = myHomeworkEntries.filter(e => e.homework_id === hw.id);
          const hwEntriesForAllRaw = clubHomeworkEntries.filter(e => e.homework_id === hw.id);
          
          const isSortedByLikes = sortedHwIds.includes(hw.id);

          // Rendezés: Alapból időrendben (id alapján), de ha a gombot megnyomta, akkor lájk alapján csökkenőbe
// Rendezés: Alapból NÉVSORBAN (user_name alapján), de ha a gombot megnyomta, akkor lájk alapján csökkenőbe
          const finalEntriesForAll = [...hwEntriesForAllRaw].sort((a, b) => {
            if (isSortedByLikes) {
              // Ha lájkok alapján rendezünk, a több lájkkal rendelkező jön előre
              if ((b.like_count || 0) !== (a.like_count || 0)) {
                return (b.like_count || 0) - (a.like_count || 0);
              }
            }
            // Alapértelmezett (vagy lájk-holtverseny esetén): Névsor szerint A-Z
            const nameA = a.user_name || '';
            const nameB = b.user_name || '';
            return nameA.localeCompare(nameB);
          });
          
          const maxImages = hw.max_images || 4;

          const uploaderStats = hwEntriesForAllRaw.reduce((acc, curr) => {
             if (!acc[curr.user_name]) acc[curr.user_name] = 0;
             acc[curr.user_name]++;
             return acc;
          }, {} as Record<string, number>);

          return (
            <div key={hw.id} style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: isPast ? '1px solid #475569' : '1px solid #10b981', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', position: 'relative' }}>
              
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

              {isLeader && (
                <div style={{ marginTop: '15px', marginBottom: '20px', padding: '15px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px' }}>📊 Feltöltések eddig (Vezetői infó)</h4>
                  {Object.keys(uploaderStats).length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Még nem érkezett feltöltés a klubtagoktól.</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {Object.entries(uploaderStats).map(([name, count]) => (
                        <span key={name} style={{ background: '#1e293b', border: '1px solid #475569', color: '#cbd5e1', padding: '6px 12px', borderRadius: '100px', fontSize: '0.85rem' }}>
                          {name}: <strong style={{ color: count >= maxImages ? '#10b981' : '#f8fafc' }}>{count}/{maxImages}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!isPast && activeUploadHw !== hw.id && myEntries.length < maxImages && (
                <button onClick={() => { setActiveUploadHw(hw.id); setHwUploadTitle(''); setHwUploadPreview(null); }} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '15px' }}>+ Kép Feltöltése ({myEntries.length}/{maxImages})</button>
              )}
              
              {!isPast && myEntries.length >= maxImages && (
                <div style={{ padding: '10px', background: '#10b98120', color: '#10b981', borderRadius: '8px', marginBottom: '15px', fontWeight: 'bold' }}>🎉 Elérted a maximális {maxImages} feltöltést!</div>
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
                          <img 
                            src={imageUrl} 
                            alt={entry.title} 
                            onClick={() => openGalleryModal(entry, myEntries, index)} 
                            style={{ width: '100%', height: '100px', objectFit: 'cover', cursor: 'zoom-in' }} 
                          />
                          
                          {editingHwEntryId === entry.id ? (
                            <div style={{ padding: '12px' }}>
                              <input 
                                value={editHwEntryTitle} 
                                onChange={e => setEditHwEntryTitle(e.target.value)} 
                                style={{ width: '100%', padding: '6px', marginBottom: '10px', backgroundColor: '#1e293b', border: '1px solid #38bdf8', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} 
                              />
                              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                <button onClick={() => handleUpdateHwEntryTitle(entry.id)} style={{ flex: '1 1 100%', background: '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Mentés</button>
                                <button onClick={() => setEditingHwEntryId(null)} style={{ flex: '1 1 100%', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Mégse</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ padding: '12px' }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#f8fafc' }}>{entry.title}</div>
                              {!isPast && (
                                <div style={{ display: 'flex', gap: '5px', marginTop: '12px', flexWrap: 'wrap' }}>
                                  <button onClick={() => { setEditingHwEntryId(entry.id); setEditHwEntryTitle(entry.title); }} style={{ flex: '1 1 45%', background: '#38bdf820', color: '#38bdf8', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Szerkeszt</button>
                                  <button onClick={() => handleDeleteHwEntry(entry.id)} style={{ flex: '1 1 45%', background: '#ef444420', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Törlés</button>
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
                      <h4 style={{margin: '0 0 5px 0', fontSize: '1.2rem', color: isLeader ? '#f59e0b' : '#38bdf8'}}>
                        {isLeader ? '👑 Vezetői Galéria: Eredmények' : '📸 Klub Galéria: Eredmények'}
                      </h4>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Kattints a képre a galéria nézethez (lapozáshoz). Két nézet között is válthatsz!</p>
                    </div>

                    <button 
                      onClick={() => {
                        if (isSortedByLikes) {
                          setSortedHwIds(prev => prev.filter(id => id !== hw.id));
                        } else {
                          setSortedHwIds(prev => [...prev, hw.id]);
                        }
                      }}
                      style={{ 
                        background: isSortedByLikes ? '#f59e0b' : '#1e293b', 
                        color: isSortedByLikes ? '#0f172a' : '#cbd5e1', 
                        border: isSortedByLikes ? 'none' : '1px solid #475569', 
                        padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', transition: 'all 0.2s' 
                      }}
                    >
                      {isSortedByLikes ? '❤️ Rendezve (Kattints az Időrendhez)' : '⏱️ Időrendi (Kattints a Népszerűséghez)'}
                    </button>
                  </div>
                  
                  {finalEntriesForAll.length === 0 ? (
                    <p style={{ color: '#94a3b8' }}>Még senki nem töltött fel képet ehhez a feladathoz.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
                      {finalEntriesForAll.map((entry, index) => {
                        const imageUrl = getImageUrl(entry.drive_file_id, entry.file_url);
                        return (
                          <div key={entry.id} style={{ background: '#0f172a', borderRadius: '8px', overflow: 'hidden', border: isLeader ? '1px solid #f59e0b50' : '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
                            <img 
                              src={imageUrl} 
                              alt={entry.title} 
                              onClick={() => openGalleryModal(entry, finalEntriesForAll, index)} 
                              style={{ width: '100%', height: '140px', objectFit: 'cover', cursor: 'zoom-in' }} 
                            />
                            
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
                              <a 
                                href={entry.drive_file_id ? `https://docs.google.com/uc?export=download&id=${entry.drive_file_id}` : entry.file_url}
                                target="_blank"
                                rel="noreferrer"
                                title="Eredeti felbontású kép letöltése"
                                style={{ display: 'block', textAlign: 'center', background: '#f59e0b15', color: '#f59e0b', padding: '8px', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 'bold', borderTop: '1px solid #f59e0b40', transition: 'background 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.background = '#f59e0b30'}
                                onMouseOut={e => e.currentTarget.style.background = '#f59e0b15'}
                              >
                                ⬇️ Eredeti letöltése
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          );
        })
      )}
    </div>
  );
}
