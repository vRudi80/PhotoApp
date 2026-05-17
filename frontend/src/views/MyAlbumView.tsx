import { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';

interface MyAlbumViewProps {
  user: any;
  setFullscreenData: (data: {url: string, title?: string}) => void;
}

export default function MyAlbumView({ user, setFullscreenData }: MyAlbumViewProps) {
  const [photos, setPhotos] = useState<any[]>([]);
  const [photoResults, setPhotoResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Állapot a prémium jogosultság követésére
  const [isPremiumAccess, setIsPremiumAccess] = useState<boolean>(true);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [editingPhotoId, setEditingPhotoId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [updatingPhotoId, setUpdatingPhotoId] = useState<number | null>(null);

  const [analyzingPhotoId, setAnalyzingPhotoId] = useState<number | null>(null);

  const fetchMyPhotos = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/my-album?userEmail=${user.email}`);
      
      // HA 403-AS HIBÁT KAPUNK, AKKOR A USER NEM PRÉMIUM
      if (res.status === 403) {
        setIsPremiumAccess(false);
        setIsLoading(false);
        return;
      }

      if (res.ok) {
        setPhotos(await res.json());
        const resResults = await fetch(`${BACKEND_URL}/api/my-portfolio-results?userEmail=${user.email}`);
        if (resResults.ok) setPhotoResults(await resResults.json());
        setIsPremiumAccess(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPhotos();
  }, [user.email]);

  // Stripe fizetés indítása
  const handleSubscribe = async () => {
    setIsCheckoutLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email })
      });
      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Hiba a fizetési oldal betöltésekor: ' + data.error);
      }
    } catch (e) {
      alert('Hálózati hiba a fizetés indításakor!');
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const filteredPhotos = useMemo(() => {
    return photos.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [photos, searchTerm]);

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
      }
    } catch (e) {
      alert('Hálózati hiba!');
    } finally {
      setUpdatingPhotoId(null);
    }
  };

const handleDelete = async (photoId: number) => {
    if (!window.confirm("Biztosan törlöd?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/my-album/${photoId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email })
      });
      
      if (res.ok) {
        fetchMyPhotos();
      } else {
        alert("Hálózat túlterhelt vagy hiba a Google Drive-val. Kérlek, próbáld újra pár másodperc múlva!");
      }
    } catch (e) {
      alert("Hálózat túlterhelt vagy hiba a Google Drive-val. Kérlek, próbáld újra pár másodperc múlva!");
    }
  };

  const handleAnalyzePhoto = async (photoId: number) => {
    setAnalyzingPhotoId(photoId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/my-album/${photoId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        fetchMyPhotos();
      } else {
        alert(`Szerver hiba:\n\n${data.error || 'Ismeretlen hiba történt'}`);
      }
    } catch (e: any) {
      alert(`Hálózati hiba: ${e.message}`);
    } finally {
      setAnalyzingPhotoId(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
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
        alert("Hálózat túlterhelt vagy hiba a Google Drive-val. Kérlek, próbáld újra pár másodperc múlva!");
      }
    } catch (error) {
      alert("Hálózat túlterhelt vagy hiba a Google Drive-val. Kérlek, próbáld újra pár másodperc múlva!");
    } finally {
      setIsUploading(false);
    }
  };

  // ==========================================
  // HA NINCS JOGOSULTSÁGA, A FIZETŐFALAT (PAYWALL) MUTATJUK
  // ==========================================
  if (!isPremiumAccess && !isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '20px' }}>
        <div style={{ background: '#1e293b', border: '1px solid #38bdf850', borderRadius: '16px', padding: '40px', maxWidth: '600px', width: '100%', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🚀</div>
          <h2 style={{ fontSize: '2rem', color: '#f8fafc', margin: '0 0 15px 0' }}>Válts Prémiumra!</h2>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '30px' }}>
            A Saját Képalbum, a nemzetközi FIAP statisztikák és a profi <b>AI Képelemző zsűri</b> használata Prémium előfizetéshez kötött.
          </p>
          
          <div style={{ textAlign: 'left', background: '#0f172a', padding: '20px', borderRadius: '12px', marginBottom: '30px', border: '1px solid #334155' }}>
            <h4 style={{ color: '#38bdf8', marginTop: 0, marginBottom: '15px' }}>Mit tartalmaz a csomag?</h4>
            <ul style={{ color: '#cbd5e1', lineHeight: '2', margin: 0, paddingLeft: '20px' }}>
              <li>Korlátlan képfeltöltés a portfóliódba</li>
              <li>Személyes AI zsűri értékelések (FIAP/PSA kategória ajánlásokkal)</li>
              <li>Automatikus FIAP minősítés és elfogadás-követés</li>
              <li>Nevezések egy kattintással a nemzetközi szalonokba</li>
            </ul>
          </div>

          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981', marginBottom: '20px' }}>
            1.000 Ft <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 'normal' }}>/ hónap</span>
          </div>

          <button 
            onClick={handleSubscribe} 
            disabled={isCheckoutLoading}
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', border: 'none', padding: '15px 30px', borderRadius: '50px', fontSize: '1.2rem', fontWeight: 'bold', cursor: isCheckoutLoading ? 'not-allowed' : 'pointer', width: '100%', transition: 'transform 0.2s', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)' }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isCheckoutLoading ? '⏳ Átirányítás a biztonságos fizetéshez...' : '🔒 Biztonságos Fizetés Indítása'}
          </button>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '15px' }}>
            A fizetést a Stripe dolgozza fel. Bármikor lemondható.
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // HA PRÉMIUM, AKKOR A NORMÁL KÉPALBUMOT MUTATJUK
  // ==========================================
  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px', color: '#60a5fa' }}>
        <span style={{ fontSize: '2.5rem' }}>🖼️</span> Saját Képalbum (Portfólió)
      </h2>

      {/* KÉPFELTÖLTÉS ŰRLAP DOBOZ */}
      <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #38bdf850' }}>
        <h3 style={{ marginTop: 0, color: '#38bdf8', fontSize: '1.2rem' }}>📤 Új fotó hozzáadása a portfólióhoz</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 250px' }}>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Fénykép címe</label>
            <input 
              type="text" 
              placeholder="Pl. Magányos fa a ködben" 
              value={uploadTitle} 
              onChange={e => setUploadTitle(e.target.value)} 
              style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: '1 1 250px' }}>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Fájl kiválasztása</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleFileChange} 
              style={{ width: '100%', color: '#cbd5e1', fontSize: '0.9rem' }}
            />
          </div>
          <button 
            onClick={handleUpload} 
            disabled={isUploading} 
            style={{ background: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: isUploading ? 'not-allowed' : 'pointer', fontWeight: 'bold', height: '42px' }}
          >
            {isUploading ? '⏳ Feltöltés...' : '🚀 Kép Feltöltése'}
          </button>
        </div>
        {uploadPreview && (
          <div style={{ marginTop: '15px' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '5px' }}>Kiválasztott kép előnézete:</div>
            <img src={uploadPreview} alt="Preview" style={{ maxHeight: '120px', borderRadius: '6px', border: '1px solid #334155', objectFit: 'contain' }} />
          </div>
        )}
      </div>

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {filteredPhotos.map(photo => {
          const imageUrl = getImageUrl(photo.drive_file_id, photo.file_url);
          const isUpdatingThis = updatingPhotoId === photo.id;
          const isAnalyzingThis = analyzingPhotoId === photo.id;
          
          const currentPhotoResults = photoResults.filter(r => r.portfolio_id === photo.id);

          const entryCount = currentPhotoResults.length;
          const awardCount = currentPhotoResults.filter(r => r.award_name && r.award_name.toLowerCase() !== 'acceptance').length;
          const acceptanceCount = currentPhotoResults.filter(r => r.award_name && r.award_name.toLowerCase() === 'acceptance').length;

          const hasAward = awardCount > 0;
          const hasAcceptance = acceptanceCount > 0;

          let borderColor = '#334155';
          let borderWeight = '1px';
          
          if (hasAward) {
            borderColor = '#f59e0b';
            borderWeight = '3px';
          } else if (hasAcceptance) {
            borderColor = '#10b981';
            borderWeight = '2px';
          }

          let aiData = null;
          let isJson = false;
          if (photo.ai_tags) {
            try {
              aiData = JSON.parse(photo.ai_tags);
              isJson = true;
            } catch (e) {
              isJson = false;
            }
          }

          return (
            <div key={photo.id} style={{ 
              background: '#1e293b', 
              borderRadius: '12px', 
              overflow: 'hidden', 
              border: `${borderWeight} solid ${borderColor}`, 
              display: 'flex', 
              flexDirection: 'column', 
              opacity: isUpdatingThis || isAnalyzingThis ? 0.6 : 1, 
              transition: 'all 0.3s ease',
              boxShadow: hasAward ? '0 0 15px rgba(245, 158, 11, 0.2)' : 'none'
            }}>
              <div style={{ height: '200px', width: '100%', background: '#0f172a', cursor: 'zoom-in', position: 'relative' }} onClick={() => setFullscreenData({url: imageUrl, title: photo.title})}>
                <img src={imageUrl} alt={photo.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                
                {hasAward && <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#f59e0b', color: '#0f172a', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', zIndex: 5, boxShadow: '-2px 2px 5px rgba(0,0,0,0.4)' }}>AWARD</div>}
                {!hasAward && hasAcceptance && <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', zIndex: 5, boxShadow: '-2px 2px 5px rgba(0,0,0,0.4)' }}>ACC</div>}
              </div>
              
              <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f8fafc', marginBottom: '5px', wordBreak: 'break-word' }}>{photo.title}</div>
                
                {entryCount > 0 && (
                  <div style={{ display: 'flex', gap: '10px', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '12px', fontWeight: 'bold' }}>
                    <span title="Összes nevezés">📁 {entryCount}</span>
                    {awardCount > 0 && <span style={{ color: '#f59e0b' }} title="Díjak száma">🏆 {awardCount} award</span>}
                    {acceptanceCount > 0 && <span style={{ color: '#10b981' }} title="Elfogadások száma">✅ {acceptanceCount} acc</span>}
                  </div>
                )}

                {photo.ai_tags && (
                  <div style={{ marginBottom: '15px', padding: '12px', background: '#38bdf810', borderRadius: '8px', border: '1px solid #38bdf830' }}>
                    <div style={{ fontSize: '0.75rem', color: '#38bdf8', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold' }}>🤖 AI Zsűri Értékelése:</div>
                    
                    {isJson && aiData ? (
                      <>
                        <p style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: '1.5', margin: '0 0 12px 0', fontStyle: 'italic' }}>
                          "{aiData.evaluation}"
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {aiData.tags && aiData.tags.split(',').map((tag: string, idx: number) => (
                            <span key={idx} style={{ fontSize: '0.7rem', color: '#94a3b8', background: '#0f172a', padding: '2px 6px', borderRadius: '4px', border: '1px solid #334155' }}>
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {photo.ai_tags.split(',').map((tag: string, idx: number) => (
                          <span key={idx} style={{ fontSize: '0.75rem', color: '#cbd5e1', background: '#0f172a', padding: '2px 6px', borderRadius: '4px' }}>
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {editingPhotoId === photo.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input 
                      value={editTitle} 
                      onChange={e => setEditTitle(e.target.value)} 
                      style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #38bdf8', color: 'white', borderRadius: '4px' }} 
                      placeholder="Új cím..."
                    />
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={e => setEditFile(e.target.files ? e.target.files[0] : null)} 
                      style={{ color: '#cbd5e1', fontSize: '0.8rem', padding: '4px 0' }} 
                    />
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => handleUpdatePhoto(photo.id)} style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Mentés</button>
                      <button onClick={() => { setEditingPhotoId(null); setEditFile(null); }} style={{ flex: 1, background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}>Mégse</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {currentPhotoResults.length > 0 && (
                      <div style={{ marginBottom: '15px', padding: '10px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                        <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginBottom: '8px', fontWeight: 'bold' }}>🎖️ Eredmények szalonokban:</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {currentPhotoResults.map((res, i) => {
                            const isAcc = res.award_name && res.award_name.toLowerCase() === 'acceptance';
                            return (
                              <div key={i} style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.3' }}>
                                <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>{res.salon_name}</span>
                                <br/>
                                {res.award_name && (
                                  <span style={{ color: isAcc ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
                                    {res.award_name}
                                  </span>
                                )}
                                {res.achieved_score !== null && (
                                  <span style={{ color: '#94a3b8', marginLeft: '5px' }}>
                                    ({res.achieved_score} / {res.acceptance_score || '?'})
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <button 
                        onClick={() => handleAnalyzePhoto(photo.id)} 
                        disabled={isAnalyzingThis}
                        style={{ width: '100%', background: '#8b5cf620', color: '#a78bfa', border: '1px solid #8b5cf6', padding: '8px', borderRadius: '6px', cursor: isAnalyzingThis ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}
                      >
                        {isAnalyzingThis ? '⏳ Elemzés folyamatban...' : (photo.ai_tags ? '🤖 AI Újraelemzés' : '🤖 AI Elemzés (Zsűri értékelés)')}
                      </button>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => { setEditingPhotoId(photo.id); setEditTitle(photo.title); }} style={{ flex: 1, background: '#38bdf820', color: '#38bdf8', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>Szerkeszt</button>
                        <button onClick={() => handleDelete(photo.id)} style={{ flex: 1, background: '#ef444420', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>Törlés</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
