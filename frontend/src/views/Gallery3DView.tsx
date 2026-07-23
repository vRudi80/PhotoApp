import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { BACKEND_URL } from '../utils/constants';
import { useLanguage } from '../context/LanguageContext';
import VideoLoader from '../components/VideoLoader';
import { Box, Save, ArrowLeft, Layers, CheckCircle2, Globe, Users, Sparkles, Eye, Edit3 } from 'lucide-react';

const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('photoAppToken');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

// ====================================================================
// 🖼️ 3D KÉPKERET SPOTLIGHT-TAL ÉS EGYEDI CÍMMEL
// ====================================================================
function ArtworkFrame({ position, rotation, url, title, onClick }: any) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!url) return;
    let isMounted = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(url, (loaded) => {
      if (isMounted) {
        loaded.colorSpace = THREE.SRGBColorSpace;
        setTexture(loaded);
      }
    });
    return () => { isMounted = false; };
  }, [url]);

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[3.4, 2.4, 0.06]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} />
      </mesh>
      
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[3.2, 2.2]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} />
      </mesh>

      <mesh onClick={onClick} position={[0, 0, 0.005]} style={{ cursor: 'pointer' }}>
        <planeGeometry args={[2.9, 1.9]} />
        {texture ? <meshBasicMaterial map={texture} /> : <meshStandardMaterial color="#334155" />}
      </mesh>

      <spotLight position={[0, 1.8, 1.2]} target-position={[0, 0, 0]} intensity={3.0} angle={0.6} penumbra={0.4} color="#fffbeb" />

      <Text position={[0, -1.35, 0.01]} fontSize={0.14} color="#e2e8f0" anchorX="center" anchorY="top">
        {title || 'Fotómű'}
      </Text>
    </group>
  );
}

// ====================================================================
// 🏛️ 3D GALÉRIATEREM
// ====================================================================
function GalleryRoom({ photos, onSelectPhoto }: { photos: any[]; onSelectPhoto: (p: any) => void }) {
  const wallPositions: [number, number, number][] = [
    [-6, 0.5, -4.9], [0, 0.5, -4.9], [6, 0.5, -4.9],
    [-9.9, 0.5, -1], [-9.9, 0.5, 3],
    [9.9, 0.5, -1], [9.9, 0.5, 3],
    [-6, 0.5, 8.9], [0, 0.5, 8.9], [6, 0.5, 8.9]
  ];

  const wallRotations: [number, number, number][] = [
    [0, 0, 0], [0, 0, 0], [0, 0, 0],
    [0, Math.PI / 2, 0], [0, Math.PI / 2, 0],
    [0, -Math.PI / 2, 0], [0, -Math.PI / 2, 0],
    [0, Math.PI, 0], [0, Math.PI, 0], [0, Math.PI, 0]
  ];

  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[0, 10, 10]} intensity={1.8} />
      <directionalLight position={[0, 10, -10]} intensity={1.2} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 2]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4.5, 2]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#020617" />
      </mesh>

      <mesh position={[0, 1.75, -5]}><planeGeometry args={[20, 11]} /><meshStandardMaterial color="#334155" roughness={0.8} /></mesh>
      <mesh position={[-10, 1.75, 2]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[20, 11]} /><meshStandardMaterial color="#334155" roughness={0.8} /></mesh>
      <mesh position={[10, 1.75, 2]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[20, 11]} /><meshStandardMaterial color="#334155" roughness={0.8} /></mesh>

      {photos.map((photo, i) => {
        if (i >= wallPositions.length) return null;
        return (
          <ArtworkFrame
            key={photo.id || photo.file_url || i}
            position={wallPositions[i]}
            rotation={wallRotations[i]}
            url={photo.file_url}
            title={photo.title}
            onClick={() => onSelectPhoto(photo)}
          />
        );
      })}
    </>
  );
}

// ====================================================================
// 🚀 FŐ 3D TÁRLATOK VÉGZŐDÉS
// ====================================================================
export default function Gallery3DView({ user }: { user: any }) {
  const { lang } = useLanguage();
  const [viewMode, setMode] = useState<'DIRECTORY' | 'VIEW_3D' | 'EDIT'>('DIRECTORY');
  const [loading, setLoading] = useState(true);

  // Tárlatok katalógusa
  const [allGalleries, setAllGalleries] = useState<any[]>([]);
  const [activeGallery, setActiveGallery] = useState<any | null>(null);

  // Szerkesztő állapotok
  const [galleryTitle, setGalleryTitle] = useState('Saját Virtuális Kiállításom');
  const [visibility, setVisibility] = useState<'public' | 'club'>('public');
  const [myAlbumPhotos, setMyAlbumPhotos] = useState<any[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<any[]>([]);
  const [activePhotoModal, setActivePhotoModal] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Összes elérhető tárlat és saját adatok betöltése
  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, myGalRes, albumRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/3d-galleries`, { headers: getAuthHeaders() }),
        fetch(`${BACKEND_URL}/api/premium/3d-gallery/my`, { headers: getAuthHeaders() }),
        fetch(`${BACKEND_URL}/api/weekly/my-album?userEmail=${encodeURIComponent(user?.email || '')}`, { headers: getAuthHeaders() })
      ]);

      if (listRes.ok) {
        setAllGalleries(await listRes.json());
      }

      if (myGalRes.ok) {
        const myData = await myGalRes.json();
        if (myData.gallery) {
          setGalleryTitle(myData.gallery.title || 'Saját Virtuális Kiállításom');
          setVisibility(myData.gallery.visibility || 'public');
          setSelectedPhotos(myData.gallery.photos || []);
        }
      }

      if (albumRes.ok) {
        setMyAlbumPhotos(await albumRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  // Kép kiválasztása / Címek kezelése
  const toggleSelectPhoto = (photo: any) => {
    const isSelected = selectedPhotos.some(p => p.file_url === photo.file_url);
    if (isSelected) {
      setSelectedPhotos(prev => prev.filter(p => p.file_url !== photo.file_url));
    } else {
      if (selectedPhotos.length >= 10) {
        return alert(lang === 'en' ? 'Maximum 10 photos allowed!' : 'Legfeljebb 10 fotót választhatsz ki!');
      }
      setSelectedPhotos(prev => [...prev, { ...photo, title: photo.title || '' }]);
    }
  };

  const updatePhotoTitle = (fileUrl: string, newTitle: string) => {
    setSelectedPhotos(prev => prev.map(p => p.file_url === fileUrl ? { ...p, title: newTitle } : p));
  };

  // Mentés
  const handleSave = async () => {
    if (selectedPhotos.length === 0) {
      return alert(lang === 'en' ? 'Please select at least 1 photo!' : 'Kérlek válassz ki legalább 1 fotót!');
    }

    setIsSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/premium/3d-gallery/save`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ title: galleryTitle, theme: 'modern', visibility, photos: selectedPhotos })
      });

      if (res.ok) {
        await loadData();
        setMode('DIRECTORY');
        alert(lang === 'en' ? 'Exhibition published! 🎉' : '🎉 Kiállítás sikeresen publikálva!');
      }
    } catch (e) {
      alert('Hiba a mentés során.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <VideoLoader />;

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '10px' }}>
      
      {/* FEJLÉC ÉS MÓDVÁLTÓ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-main)', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Box size={28} /> {viewMode === 'VIEW_3D' ? activeGallery?.title : 'Virtuális 3D Tárlatok'}
          </h2>
          <small style={{ color: 'var(--text-muted)' }}>
            {viewMode === 'VIEW_3D' ? `Kiállító: ${activeGallery?.photographer_name}` : 'Böngéssz a fotóművészek kiállítótermeiben'}
          </small>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {viewMode !== 'DIRECTORY' && (
            <button onClick={() => setMode('DIRECTORY')} style={{ background: 'var(--bg-main)', color: 'var(--text-title)', border: '1px solid var(--border-main)', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowLeft size={16} /> Vissza a Katalógushoz
            </button>
          )}

          {user?.is_premium || user?.isPremium ? (
            viewMode !== 'EDIT' && (
              <button onClick={() => setMode('EDIT')} style={{ background: '#f97316', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={16} /> Saját Tárlatom Szerkesztése
              </button>
            )
          ) : (
            <div style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', padding: '8px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} /> Saját 3D kiállítás a Prémium tagoknak
            </div>
          )}
        </div>
      </div>

      {/* 1. KATALÓGUS NÉZET */}
      {viewMode === 'DIRECTORY' && (
        <div>
          {allGalleries.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-main)', color: 'var(--text-muted)' }}>
              <h3>Még nincsenek publikált kiállítások.</h3>
              <p>Légy te az első, aki berendezi a virtuális 3D tárlatát!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {allGalleries.map((gal) => (
                <div key={gal.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  
                  {/* Előnézeti Borítókép */}
                  <div style={{ height: '180px', background: '#090d16', position: 'relative' }}>
                    <img src={gal.photos?.[0]?.file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    
                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(15,23,42,0.85)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', color: gal.visibility === 'club' ? '#f59e0b' : '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {gal.visibility === 'club' ? <><Users size={12} /> Klub Szféra</> : <><Globe size={12} /> Publikus</>}
                    </div>
                  </div>

                  {/* Információk */}
                  <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-title)', fontSize: '1.2rem' }}>{gal.title}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <img src={gal.avatar_url || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23475569'><circle cx='12' cy='8' r='4'/><path d='M12 14c-6.1 0-10 4-10 4v2h20v-2s-3.9-4-10-4z'/></svg>"} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-title)' }}>{gal.photographer_name}</div>
                          {gal.club_name && <div style={{ fontSize: '0.75rem', color: '#10b981' }}>{gal.club_name}</div>}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => { setActiveGallery(gal); setMode('VIEW_3D'); }}
                      style={{ width: '100%', background: '#a78bfa', color: '#0f172a', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <Eye size={16} /> 3D Tárlat Bejárása ({gal.photos?.length || 0} kép)
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. 3D MEGTEKINTŐ NÉZET */}
      {viewMode === 'VIEW_3D' && activeGallery && (
        <div style={{ width: '100%', height: '600px', background: '#020617', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-main)' }}>
          <Canvas camera={{ position: [0, 0.5, 6], fov: 60 }}>
            <GalleryRoom photos={activeGallery.photos || []} onSelectPhoto={(p) => setActivePhotoModal(p)} />
            <OrbitControls enableZoom={true} maxPolarAngle={Math.PI / 2} minDistance={1} maxDistance={9} target={[0, 0.5, 0]} />
          </Canvas>

          <div style={{ position: 'absolute', bottom: '15px', left: '15px', background: 'rgba(9, 13, 22, 0.85)', padding: '8px 15px', borderRadius: '8px', color: 'white', fontSize: '0.8rem', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            💡 <b>Nézelődés:</b> Húzd az egeret / ujjadat a forgáshoz! Kattints egy képre a részletekért.
          </div>
        </div>
      )}

      {/* 3. SZERKESZTŐ MÓD */}
      {viewMode === 'EDIT' && (
        <div style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '12px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text-title)', fontWeight: 'bold', marginBottom: '8px' }}>Kiállítás Címe:</label>
              <input type="text" value={galleryTitle} onChange={e => setGalleryTitle(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', fontSize: '1rem', outline: 'none' }} />
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-title)', fontWeight: 'bold', marginBottom: '8px' }}>Láthatósági Szféra:</label>
              <select value={visibility} onChange={e => setVisibility(e.target.value as any)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', fontSize: '1rem', outline: 'none' }}>
                <option value="public">🌐 Publikus (Mindenki láthatja)</option>
                <option value="club">👥 Klub Szféra (Csak a fotóklubom tagjai)</option>
              </select>
            </div>
          </div>

          <div>
            <h3 style={{ color: 'var(--text-title)', marginBottom: '6px' }}>Válassz ki legfeljebb 10 fotót az albumodból és adj nekik címet:</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>Kiválasztva: {selectedPhotos.length} / 10</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
              {myAlbumPhotos.map((photo, idx) => {
                const selectedObj = selectedPhotos.find(p => p.file_url === photo.file_url);
                const isSelected = !!selectedObj;

                return (
                  <div key={photo.id || photo.file_url || idx} style={{ background: 'var(--bg-main)', border: isSelected ? '2px solid #10b981' : '1px solid var(--border-main)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div onClick={() => toggleSelectPhoto(photo)} style={{ position: 'relative', height: '120px', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer' }}>
                      <img src={photo.file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {isSelected && (
                        <div style={{ position: 'absolute', top: '6px', right: '6px', background: '#10b981', color: 'white', borderRadius: '50%', padding: '2px' }}>
                          <CheckCircle2 size={18} />
                        </div>
                      )}
                    </div>

                    {/* EGYEDI KÉPCÍM MEGADÁSA A 3D KIÁLLÍTÁSHOZ */}
                    {isSelected && (
                      <input 
                        type="text" 
                        placeholder="Kép címe a 3D teremben..." 
                        value={selectedObj.title || ''} 
                        onChange={e => updatePhotoTitle(photo.file_url, e.target.value)} 
                        style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-title)', fontSize: '0.82rem', outline: 'none' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={handleSave} disabled={isSaving || selectedPhotos.length === 0} style={{ background: selectedPhotos.length > 0 ? '#10b981' : 'var(--border-main)', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: selectedPhotos.length > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Save size={18} /> {isSaving ? 'Mentés...' : '3D Kiállítás Publikálása'}
          </button>
        </div>
      )}

      {/* RÁKÖZELÍTŐ MODÁL A KÉPRE KATTINTVA */}
      {activePhotoModal && (
        <div onClick={() => setActivePhotoModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', padding: '20px', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
            <img src={activePhotoModal.file_url} alt="" style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '8px', marginBottom: '15px' }} />
            <h3 style={{ color: 'var(--text-title)', margin: '0 0 5px 0' }}>{activePhotoModal.title || 'Cím nélküli alkotás'}</h3>
            <button onClick={() => setActivePhotoModal(null)} style={{ marginTop: '15px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Bezárás</button>
          </div>
        </div>
      )}

    </div>
  );
}
