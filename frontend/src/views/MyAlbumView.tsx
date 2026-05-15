import { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';

interface MyAlbumViewProps {
  user: any;
  setFullscreenData: (data: {url: string, title?: string}) => void;
}

export default function MyAlbumView({ user, setFullscreenData }: MyAlbumViewProps) {
  const [photos, setPhotos] = useState<any[]>([]);
  const [photoResults, setPhotoResults] = useState<any[]>([]); // ÚJ: Eredmények state-je
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); // ÚJ: Keresési állapot
  
  // Feltöltés state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Szerkesztés state
  const [editingPhotoId, setEditingPhotoId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [updatingPhotoId, setUpdatingPhotoId] = useState<number | null>(null);

  const fetchMyPhotos = async () => {
    try {
      // Képek lekérése
      const res = await fetch(`${BACKEND_URL}/api/my-album?userEmail=${user.email}`);
      if (res.ok) setPhotos(await res.json());

      // ÚJ: Eredmények lekérése
      const resResults = await fetch(`${BACKEND_URL}/api/my-portfolio-results?userEmail=${user.email}`);
      if (resResults.ok) setPhotoResults(await resResults.json());

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPhotos();
  }, [user.email]);

  // ÚJ: Keresés és szűrés logika
  const filteredPhotos = useMemo(() => {
    return photos.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [photos, searchTerm]);

  // ÚJ: Kiszámolja az összesített díjakat a felső statisztikához
  const awardsSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    photoResults.forEach(r => {
      if (r.award_name) {
        counts[r.award_name] = (counts[r.award_name] || 0) + 1;
      }
    });
    // Rendezzük csökkenő sorrendbe darabszám alapján
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [photoResults]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle) return alert("Kép és cím megadása kötelező!");
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', uploadFile);
      formData.append('userEmail', user.email);
      formData.append('userName', user.name);
      formData.append('title', uploadTitle);

      const res = await fetch(`${BACKEND_URL}/api/my-album/upload`, { method: 'POST', body: formData });
      if (res.ok) {
        setUploadFile(null);
        setUploadPreview(null);
        setUploadTitle('');
        fetchMyPhotos();
      } else {
        const err = await res.json();
        alert(`Hiba: ${err.error}`);
      }
    } catch (error) {
      alert("Hálózati hiba a feltöltésnél.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdatePhoto = async (photoId: number) => {
    if (!editTitle) return alert('A cím nem lehet üres!');
    setUpdatingPhotoId(photoId); 
    try {
      const formData = new FormData();
      formData.append('title', editTitle);
      formData.append('userEmail', user.email);
      if (editFile) formData.append('photo', editFile);

      const res = await fetch(`${BACKEND_URL}/api/my-album/${photoId}`, {
        method: 'PUT',
        body: formData
      });

      if (res.ok) {
        setEditingPhotoId(null);
        setEditFile(null);
        fetchMyPhotos();
      } else {
        const err = await res.json();
        alert(`Hiba a frissítésekor: ${err.error || 'Ismeretlen hiba'}`);
      }
    } catch (e) {
      alert('Hálózati hiba!');
    } finally {
      setUpdatingPhotoId(null);
    }
  };

  const handleDelete = async (photoId: number) => {
    if (!window.confirm("Biztosan törlöd ezt a képet a portfóliódból? (Ez a már leadott pályázatokat is érintheti!)")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/my-album/${photoId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email })
      });
      if (res.ok) fetchMyPhotos();
    } catch (e) {
      alert('Hálózati hiba!');
    }
  };

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px', color: '#60a5fa' }}>
        <span style={{ fontSize: '2.5rem' }}>🖼️</span> Saját Képalbum (Portfólió)
      </h2>

      {/* ÚJ: STATISZTIKA ÉS KERESŐ SÁV */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '15px 20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #334155', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981' }}>{photos.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Összes kép</div>
          </div>
          {searchTerm && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#38bdf8' }}>{filteredPhotos.length}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Találat</div>
            </div>
          )}
        </div>
        <input 
          type="text" 
          placeholder="🔍 Keresés a képeid között..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ padding: '8px 15px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: 'white', minWidth: '250px' }}
        />
      </div>

      <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '20px' }}>
        Töltsd fel ide a legjobb fotóidat! Később ezekből a képekből tudsz majd válogatni a Nemzetközi Szalonokra történő nevezéseknél.
      </p>

      {/* ÚJ: Eredmények Összesítő Blokkjának Megjelenítése */}
      {awardsSummary.length > 0 && (
        <div style={{ background: 'linear-gradient(to right, #0f172a, #1e293b)', padding: '20px', borderRadius: '12px', border: '1px solid #f59e0b50', marginBottom: '30px' }}>
          <h3 style={{ marginTop: 0, color: '#f59e0b', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🏆 Dicsőségfal – Eddig Elért Eredményeid
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {awardsSummary.map(([awardName, count]) => (
              <div key={awardName} style={{ background: '#f59e0b20', border: '1px solid #f59e0b80', color: '#f8fafc', padding: '8px 15px', borderRadius: '100px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                <span style={{ color: '#f59e0b', marginRight: '5px' }}>{count}x</span> {awardName}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feltöltő doboz */}
      <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '30px', border: '1px solid #38bdf840' }}>
        <h3 style={{marginTop: 0, color: '#38bdf8', fontSize: '1.2rem'}}>Új kép hozzáadása az albumhoz</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 300px' }}>
            <input placeholder="Kép címe (Ezzel nevezel majd)" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} style={inputStyle} disabled={isUploading} />
            <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileSelect} style={{ color: '#94a3b8', width: '100%' }} disabled={isUploading} />
          </div>
          <div style={{ flex: '1 1 150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <button onClick={handleUpload} disabled={isUploading || !uploadFile} style={{ width: '100%', height: '100%', minHeight: '50px', background: isUploading ? '#475569' : (uploadFile ? '#10b981' : '#334155'), color: uploadFile ? 'white' : '#94a3b8', border: 'none', padding: '12px', borderRadius: '8px', cursor: isUploading || !uploadFile ? 'not-allowed' : 'pointer', fontWeight: 'bold', transition: 'background 0.3s' }}>
               {isUploading ? 'Feltöltés ⏳...' : 'Feltöltés 🚀'}
             </button>
          </div>
        </div>
        {uploadPreview && <div style={{marginTop: '15px', textAlign: 'center'}}><img src={uploadPreview} alt="Előnézet" style={{maxHeight: '200px', borderRadius: '8px', border: '2px solid #334155'}} /></div>}
      </div>

      {/* Képek listája */}
      {isLoading ? (
        <div style={{ color: '#60a5fa', textAlign: 'center', padding: '2rem' }}>Képek betöltése...</div>
      ) : filteredPhotos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#0f172a', borderRadius: '12px', border: '1px dashed #334155', color: '#94a3b8' }}>
          {searchTerm ? 'Nincs találat erre a névre.' : 'Még nem töltöttél fel egyetlen képet sem.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredPhotos.map(photo => {
            const imageUrl = getImageUrl(photo.drive_file_id, photo.file_url);
            const isUpdatingThis = updatingPhotoId === photo.id;
            
            // ÚJ: A képhez tartozó eredmények kiválogatása
            const currentPhotoResults = photoResults.filter(r => r.portfolio_id === photo.id);

            // ÚJ: MEGKÜLÖNBÖZTETÉS: Award vs Acceptance
            const hasAward = currentPhotoResults.some(r => r.award_name && r.award_name.toLowerCase() !== 'acceptance');
            const hasAcceptance = currentPhotoResults.some(r => r.award_name && r.award_name.toLowerCase() === 'acceptance');

            // Keret és stílus dinamikusan
            let borderColor = '#334155';
            let borderWeight = '1px';
            
            if (hasAward) {
              borderColor = '#f59e0b'; // Arany/Borostyán díjakhoz
              borderWeight = '3px';
            } else if (hasAcceptance) {
              borderColor = '#10b981'; // Zöld elfogadáshoz
              borderWeight = '2px';
            }

            return (
              <div key={photo.id} style={{ 
                background: '#1e293b', 
                borderRadius: '12px', 
                overflow: 'hidden', 
                border: `${borderWeight} solid ${borderColor}`, 
                display: 'flex', 
                flexDirection: 'column', 
                opacity: isUpdatingThis ? 0.6 : 1, 
                transition: 'all 0.3s ease',
                boxShadow: hasAward ? '0 0 15px rgba(245, 158, 11, 0.2)' : 'none'
              }}>
                <div style={{ height: '200px', width: '100%', background: '#0f172a', cursor: 'zoom-in', position: 'relative' }} onClick={() => setFullscreenData({url: imageUrl, title: photo.title})}>
                  <img src={imageUrl} alt={photo.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  
                  {/* ÚJ: Kis badge a kép sarkába a gyors azonosításhoz */}
                  {hasAward && <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#f59e0b', color: '#0f172a', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', zIndex: 5, boxShadow: '-2px 2px 5px rgba(0,0,0,0.4)' }}>AWARD</div>}
                  {!hasAward && hasAcceptance && <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', zIndex: 5, boxShadow: '-2px 2px 5px rgba(0,0,0,0.4)' }}>ACC</div>}
                </div>
                
                {editingPhotoId === photo.id ? (
                  <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input 
                      value={editTitle} 
                      onChange={e => setEditTitle(e.target.value)} 
                      placeholder="Kép címe" 
                      disabled={isUpdatingThis}
                      style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #38bdf8', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} 
                    />
                    
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Kép cseréje (opcionális):</div>
                    <input 
                      type="file" 
                      accept="image/jpeg, image/png, image/webp" 
                      onChange={e => setEditFile(e.target.files?.[0] || null)} 
                      disabled={isUpdatingThis}
                      style={{ fontSize: '0.8rem', color: '#cbd5e1' }} 
                    />

                    <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                      <button onClick={() => handleUpdatePhoto(photo.id)} disabled={isUpdatingThis} style={{ flex: 1, background: isUpdatingThis ? '#475569' : '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', cursor: isUpdatingThis ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                        {isUpdatingThis ? 'Mentés ⏳...' : 'Mentés'}
                      </button>
                      <button onClick={() => { setEditingPhotoId(null); setEditFile(null); }} disabled={isUpdatingThis} style={{ flex: 1, background: 'transparent', color: isUpdatingThis ? '#94a3b8' : '#ef4444', border: `1px solid ${isUpdatingThis ? '#94a3b8' : '#ef4444'}`, padding: '6px', borderRadius: '4px', cursor: isUpdatingThis ? 'not-allowed' : 'pointer' }}>Mégse</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f8fafc', marginBottom: '10px', wordBreak: 'break-word' }}>{photo.title}</div>
                    
                    {/* Eredmények listázása a kép alatt - Színezve! */}
                    {currentPhotoResults.length > 0 && (
                      <div style={{ marginBottom: '15px', padding: '10px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                        <div style={{ fontSize: '0.8rem', color: '#60a5fa', marginBottom: '8px', fontWeight: 'bold' }}>🎖️ Eredmények szalonokban:</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {currentPhotoResults.map((res, i) => (
                            <div key={i} style={{ 
                              fontSize: '0.8rem', 
                              color: res.award_name && res.award_name.toLowerCase() !== 'acceptance' ? '#f59e0b' : '#cbd5e1', 
                              lineHeight: '1.3' 
                            }}>
                              <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>{res.salon_name}</span>
                              <br/>
                              {res.award_name ? <span style={{ fontWeight: res.award_name.toLowerCase() !== 'acceptance' ? 'bold' : 'normal' }}>{res.award_name}</span> : null}
                              {res.achieved_score !== null ? (
                                <span style={{ color: '#94a3b8', marginLeft: res.award_name ? '5px' : '0' }}>
                                  ({res.achieved_score} / {res.acceptance_score || '?'})
                                </span>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                      <button onClick={() => { setEditingPhotoId(photo.id); setEditTitle(photo.title); setEditFile(null); }} style={{ flex: 1, background: '#38bdf820', color: '#38bdf8', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>Szerkeszt</button>
                      <button onClick={() => handleDelete(photo.id)} style={{ flex: 1, background: '#ef444420', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>Törlés</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
