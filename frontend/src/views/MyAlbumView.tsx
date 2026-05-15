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
  const [searchTerm, setSearchTerm] = useState(''); // ÚJ: Keresési állapot

  // ... (Feltöltés és szerkesztés állapotok változatlanok)
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingPhotoId, setEditingPhotoId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [updatingPhotoId, setUpdatingPhotoId] = useState<number | null>(null);

  const fetchMyPhotos = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/my-album?userEmail=${user.email}`);
      if (res.ok) setPhotos(await res.json());
      const resResults = await fetch(`${BACKEND_URL}/api/my-portfolio-results?userEmail=${user.email}`);
      if (resResults.ok) setPhotoResults(await resResults.json());
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchMyPhotos(); }, [user.email]);

  // ÚJ: Keresés és szűrés logika
  const filteredPhotos = useMemo(() => {
    return photos.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [photos, searchTerm]);

  const awardsSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    photoResults.forEach(r => { if (r.award_name) counts[r.award_name] = (counts[r.award_name] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [photoResults]);

  // ... (handleUpload, handleUpdatePhoto, handleDelete függvények változatlanok)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setUploadFile(file); setUploadPreview(URL.createObjectURL(file)); }
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
      if (res.ok) { setUploadFile(null); setUploadPreview(null); setUploadTitle(''); fetchMyPhotos(); }
    } catch (error) { alert("Hálózati hiba."); } finally { setIsUploading(false); }
  };

  const handleUpdatePhoto = async (photoId: number) => {
    if (!editTitle) return alert('A cím nem lehet üres!');
    setUpdatingPhotoId(photoId); 
    try {
      const formData = new FormData();
      formData.append('title', editTitle);
      formData.append('userEmail', user.email);
      if (editFile) formData.append('photo', editFile);
      const res = await fetch(`${BACKEND_URL}/api/my-album/${photoId}`, { method: 'PUT', body: formData });
      if (res.ok) { setEditingPhotoId(null); setEditFile(null); fetchMyPhotos(); }
    } catch (e) { alert('Hálózati hiba!'); } finally { setUpdatingPhotoId(null); }
  };

  const handleDelete = async (photoId: number) => {
    if (!window.confirm("Biztosan törlöd?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/my-album/${photoId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEmail: user.email }) });
      if (res.ok) fetchMyPhotos();
    } catch (e) { alert('Hálózati hiba!'); }
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

      {awardsSummary.length > 0 && (
        <div style={{ background: 'linear-gradient(to right, #0f172a, #1e293b)', padding: '20px', borderRadius: '12px', border: '1px solid #f59e0b50', marginBottom: '30px' }}>
          <h3 style={{ marginTop: 0, color: '#f59e0b', fontSize: '1.2rem' }}>🏆 Dicsőségfal</h3>
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
        <h3 style={{marginTop: 0, color: '#38bdf8', fontSize: '1.2rem'}}>Új kép hozzáadása</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 300px' }}>
            <input placeholder="Kép címe" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} style={inputStyle} disabled={isUploading} />
            <input type="file" accept="image/*" onChange={handleFileSelect} style={{ color: '#94a3b8', width: '100%' }} disabled={isUploading} />
          </div>
          <button onClick={handleUpload} disabled={isUploading || !uploadFile} style={{ flex: '1 1 150px', background: isUploading ? '#475569' : (uploadFile ? '#10b981' : '#334155'), color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isUploading ? 'Feltöltés...' : 'Feltöltés 🚀'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ color: '#60a5fa', textAlign: 'center', padding: '2rem' }}>Betöltés...</div>
      ) : filteredPhotos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#0f172a', borderRadius: '12px', border: '1px dashed #334155', color: '#94a3b8' }}>
          {searchTerm ? 'Nincs találat erre a névre.' : 'Még nem töltöttél fel egyetlen képet sem.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredPhotos.map(photo => {
            const imageUrl = getImageUrl(photo.drive_file_id, photo.file_url);
            const isUpdatingThis = updatingPhotoId === photo.id;
            const currentPhotoResults = photoResults.filter(r => r.portfolio_id === photo.id);
            return (
              <div key={photo.id} style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155', display: 'flex', flexDirection: 'column', opacity: isUpdatingThis ? 0.6 : 1 }}>
                <div style={{ height: '200px', width: '100%', background: '#0f172a', cursor: 'zoom-in' }} onClick={() => setFullscreenData({url: imageUrl, title: photo.title})}>
                  <img src={imageUrl} alt={photo.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f8fafc', marginBottom: '10px' }}>{photo.title}</div>
                    {currentPhotoResults.length > 0 && (
                      <div style={{ marginBottom: '15px', padding: '10px', background: '#0f172a', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 'bold' }}>🎖️ Eredmények:</div>
                        {currentPhotoResults.map((res, i) => (
                          <div key={i} style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                            <b>{res.salon_name}</b>: {res.award_name} ({res.achieved_score}/{res.acceptance_score})
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                      <button onClick={() => { setEditingPhotoId(photo.id); setEditTitle(photo.title); }} style={{ flex: 1, background: '#38bdf820', color: '#38bdf8', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Szerkeszt</button>
                      <button onClick={() => handleDelete(photo.id)} style={{ flex: 1, background: '#ef444420', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Törlés</button>
                    </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
