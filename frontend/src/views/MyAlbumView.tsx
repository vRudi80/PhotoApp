import { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';

interface MyAlbumViewProps {
  user: any;
  setFullscreenData: (data: {url: string, title?: string}) => void;
}

export default function MyAlbumView({ user, setFullscreenData }: MyAlbumViewProps) {
  const [photos, setPhotos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Feltöltés state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Szerkesztés state
  const [editingPhotoId, setEditingPhotoId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  
  // ÚJ: Külön state a szerkesztés mentésének idejére, hogy látszódjon a töltés!
  const [updatingPhotoId, setUpdatingPhotoId] = useState<number | null>(null);

  const fetchMyPhotos = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/my-album?userEmail=${user.email}`);
      if (res.ok) setPhotos(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPhotos();
  }, [user.email]);

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
    
    // BEKAPCSOLJUK A TÖLTÉS JELZŐT
    setUpdatingPhotoId(photoId); 
    
    try {
      const formData = new FormData();
      formData.append('title', editTitle);
      formData.append('userEmail', user.email);
      
      if (editFile) {
        formData.append('photo', editFile);
      }

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
      // KIKAPCSOLJUK A TÖLTÉS JELZŐT (sikeres és sikertelen ágon is)
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
      <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '20px' }}>
        Töltsd fel ide a legjobb fotóidat! Később ezekből a képekből tudsz majd válogatni a Nemzetközi Szalonokra történő nevezéseknél.
      </p>

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
      ) : photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#0f172a', borderRadius: '12px', border: '1px dashed #334155', color: '#94a3b8' }}>
          Még nem töltöttél fel egyetlen képet sem.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
          {photos.map(photo => {
            const imageUrl = getImageUrl(photo.drive_file_id, photo.file_url);
            const isUpdatingThis = updatingPhotoId === photo.id; // Éppen ezt frissítjük-e?

            return (
              <div key={photo.id} style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155', display: 'flex', flexDirection: 'column', opacity: isUpdatingThis ? 0.6 : 1, transition: 'opacity 0.3s' }}>
                <div style={{ height: '200px', width: '100%', background: '#0f172a', cursor: 'zoom-in' }} onClick={() => setFullscreenData({url: imageUrl, title: photo.title})}>
                  <img src={imageUrl} alt={photo.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                      <button 
                        onClick={() => handleUpdatePhoto(photo.id)} 
                        disabled={isUpdatingThis}
                        style={{ flex: 1, background: isUpdatingThis ? '#475569' : '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', cursor: isUpdatingThis ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                      >
                        {isUpdatingThis ? 'Mentés ⏳...' : 'Mentés'}
                      </button>
                      <button 
                        onClick={() => { setEditingPhotoId(null); setEditFile(null); }} 
                        disabled={isUpdatingThis}
                        style={{ flex: 1, background: 'transparent', color: isUpdatingThis ? '#94a3b8' : '#ef4444', border: `1px solid ${isUpdatingThis ? '#94a3b8' : '#ef4444'}`, padding: '6px', borderRadius: '4px', cursor: isUpdatingThis ? 'not-allowed' : 'pointer' }}
                      >
                        Mégse
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f8fafc', marginBottom: '15px', wordBreak: 'break-word' }}>{photo.title}</div>
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
