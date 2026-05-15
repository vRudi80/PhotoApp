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

  const filteredPhotos = useMemo(() => {
    return photos.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [photos, searchTerm]);

  const awardsSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    photoResults.forEach(r => { if (r.award_name) counts[r.award_name] = (counts[r.award_name] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [photoResults]);

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

  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px', color: '#60a5fa' }}>
        <span style={{ fontSize: '2.5rem' }}>🖼️</span> Saját Képalbum (Portfólió)
      </h2>

      {/* Statisztika és kereső */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '15px 20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #334155', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981' }}>{photos.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Összes kép</div>
          </div>
        </div>
        <input 
          type="text" 
          placeholder="🔍 Keresés a képeid között..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ padding: '8px 15px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: 'white', minWidth: '250px' }}
        />
      </div>

      {/* Képek listája */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {filteredPhotos.map(photo => {
          const imageUrl = getImageUrl(photo.drive_file_id, photo.file_url);
          const isUpdatingThis = updatingPhotoId === photo.id;
          
          // Eredmények lekérése ehhez a képhez
          const currentPhotoResults = photoResults.filter(r => r.portfolio_id === photo.id);
          
          // MEGKÜLÖNBÖZTETÉS: Award vs Acceptance
          const hasAward = currentPhotoResults.some(r => r.award_name && r.award_name.toLowerCase() !== 'acceptance');
          const hasAcceptance = currentPhotoResults.some(r => r.award_name && r.award_name.toLowerCase() === 'acceptance');

          // Keret színe: Arany díjhoz, Zöld sima elfogadáshoz, alap szürke egyébként
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
                
                {/* Kis badge a kép sarkába a gyors azonosításhoz */}
                {hasAward && <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#f59e0b', color: '#0f172a', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>AWARD</div>}
                {!hasAward && hasAcceptance && <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>ACC</div>}
              </div>

              <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f8fafc', marginBottom: '10px' }}>{photo.title}</div>
                  
                  {currentPhotoResults.length > 0 && (
                    <div style={{ marginBottom: '15px', padding: '10px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 'bold', marginBottom: '5px' }}>🎖️ Eredmények:</div>
                      {currentPhotoResults.map((res, i) => (
                        <div key={i} style={{ 
                          fontSize: '0.75rem', 
                          color: res.award_name.toLowerCase() !== 'acceptance' ? '#f59e0b' : '#cbd5e1',
                          fontWeight: res.award_name.toLowerCase() !== 'acceptance' ? 'bold' : 'normal'
                        }}>
                          <b>{res.salon_name}</b>: {res.award_name}
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
    </div>
  );
}
