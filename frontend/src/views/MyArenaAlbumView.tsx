import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';

export default function MyArenaAlbumView({ user, setFullscreenData }: { user: any; setFullscreenData: (data: any) => void }) {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);

  const fetchAlbum = async () => {
    try {
      // ⚡ JAVÍTVA: Az új, elszeparált arénás album végpontot hívjuk!
      const res = await fetch(`${BACKEND_URL}/api/weekly/my-album?userEmail=${user?.email}`);
      if (res.ok) setPhotos(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user?.email) fetchAlbum(); }, [user]);

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('photo', e.target.files[0]);
    formData.append('userEmail', user.email);

    try {
      // ⚡ JAVÍTVA: Az új, elszeparált arénás feltöltő végpontot hívjuk!
      const res = await fetch(`${BACKEND_URL}/api/weekly/my-album/upload`, { method: 'POST', body: formData });
      if (res.ok) {
        alert('🎉 Kép sikeresen rögzítve az Aréna albumodban!');
        fetchAlbum();
      }
    } catch (err) { alert('Hiba a feltöltéskor'); }
    finally { setUploading(false); }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', maxWidth: '1200px', margin: '0 auto', padding: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ color: 'white', margin: 0, fontSize: '1.8rem' }}>⚔️ Aréna Képtáram</h2>
          <p style={{ color: '#94a3b8', margin: '5px 0 0 0' }}>A párbajokra feltöltött összes fotód és azok harci statisztikái.</p>
        </div>
        <label style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', color: 'white', padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold', cursor: uploading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)', display: 'inline-block' }}>
          {uploading ? '🚀 Feldolgozás...' : '➕ Új fotó az albumba'}
          <input type="file" accept="image/*" onChange={handleDirectUpload} style={{ display: 'none' }} disabled={uploading} />
        </label>
      </div>

      {loading ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '50px' }}>⏳ Album rendezése...</div>
      ) : photos.length === 0 ? (
        <div style={{ padding: '50px', background: '#1e293b', borderRadius: '20px', textAlign: 'center', border: '1px dashed #334155' }}>
          <p style={{ color: '#94a3b8', margin: 0 }}>Még teljesen üres az Aréna albumod. Tölts fel képeket vagy nevezz be egy párbajba!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px' }}>
          {photos.map((photo) => (
            <div key={photo.id} style={{ background: '#1e293b', borderRadius: '16px', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 8px 20px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative', height: '180px', backgroundColor: '#000', overflow: 'hidden' }}>
                <img src={getImageUrl(null, photo.file_url)} alt="Album" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} onClick={() => setFullscreenData({ url: getImageUrl(null, photo.file_url), title: 'Aréna fotó' })} />
                {photo.history?.some((h: any) => h.is_active) && (
                  <span style={{ position: 'absolute', top: '10px', left: '10px', background: '#ef4444', color: 'white', fontWeight: 'bold', fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px' }}>⚔️ Harcban van</span>
                )}
              </div>
              <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1', background: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginBottom: '10px' }}>
                  <span style={{ color: '#f97316', fontWeight: 'bold' }}>⭐ {photo.totalLikes} pont</span>
                  <span style={{ color: '#38bdf8' }}>👁️ {photo.totalViews}</span>
                </div>
                <button onClick={() => setSelectedPhoto(photo)} style={{ width: '100%', background: '#334155', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  📊 Eredmények ({photo.history?.length || 0})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: RÉSZLETES PÁRBAJ TÖRTÉNET */}
      {selectedPhoto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ background: '#0f172a', padding: '30px', borderRadius: '24px', border: '1px solid #475569', width: '100%', maxWidth: '500px', position: 'relative' }}>
            <button onClick={() => setSelectedPhoto(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            <h3 style={{ margin: '0 0 15px 0', color: 'white' }}>📈 Fotó Karrier Jelentés</h3>
            <div style={{ width: '100%', height: '160px', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', backgroundColor: '#000' }}>
              <img src={getImageUrl(null, selectedPhoto.file_url)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <h4 style={{ color: '#94a3b8', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '10px' }}>Megvívott Csaták listája:</h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedPhoto.history?.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, fontStyle: 'italic' }}>Ez a kép még nem vett részt egyetlen éles párbajban sem.</p>
              ) : selectedPhoto.history.map((h: any, i: number) => (
                <div key={i} style={{ background: '#1e293b', padding: '12px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>{h.topic_title}</div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Státusz: {h.is_active ? '🔥 Futó párbaj' : '🔒 Lezárult'}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    <span style={{ color: '#f97316' }}>{h.likes_count} ⭐</span>
                    <span style={{ color: '#38bdf8', fontSize: '0.8rem', marginLeft: '8px' }}>({h.views_count} 👁️)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
