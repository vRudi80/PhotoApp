import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { BACKEND_URL } from '../utils/constants';
import { useLanguage } from '../context/LanguageContext';
import VideoLoader from '../components/VideoLoader';
import { Box, Save, ArrowLeft, Layers, CheckCircle2 } from 'lucide-react';

const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('photoAppToken');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

// ====================================================================
// 🖼️ GOLYÓÁLLÓ 3D KÉPKERET SPOTLIGHT-TAL ÉS CORS-TEXTÚRA TÖLTŐVEL
// ====================================================================
function ArtworkFrame({ position, rotation, url, title, onClick }: any) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!url) return;
    let isMounted = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    
    loader.load(
      url,
      (loadedTexture) => {
        if (isMounted) {
          loadedTexture.colorSpace = THREE.SRGBColorSpace;
          setTexture(loadedTexture);
        }
      },
      undefined,
      (err) => {
        console.warn("⚠️ 3D Textúra betöltési hiba:", url, err);
        if (isMounted) setHasError(true);
      }
    );
    return () => { isMounted = false; };
  }, [url]);

  return (
    <group position={position} rotation={rotation}>
      {/* Külső Fa/Fém Keret */}
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[3.4, 2.4, 0.06]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} />
      </mesh>
      
      {/* Fehér Passepartout (Képráma) */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[3.2, 2.2]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} />
      </mesh>

      {/* A Fotó felülete */}
      <mesh onClick={onClick} position={[0, 0, 0.005]} style={{ cursor: 'pointer' }}>
        <planeGeometry args={[2.9, 1.9]} />
        {texture ? (
          <meshBasicMaterial map={texture} />
        ) : (
          <meshStandardMaterial color={hasError ? "#ef4444" : "#334155"} />
        )}
      </mesh>

      {/* Célzott Reflektorfény a kép felett */}
      <spotLight
        position={[0, 1.8, 1.2]}
        target-position={[0, 0, 0]}
        intensity={3.0}
        angle={0.6}
        penumbra={0.4}
        color="#fffbeb"
      />

      {/* Címke a kép alatt */}
      <Text position={[0, -1.35, 0.01]} fontSize={0.14} color="#e2e8f0" anchorX="center" anchorY="top">
        {title || 'Fotómű'}
      </Text>
    </group>
  );
}

// ====================================================================
// 🏛️ 3D GALÉRIATEREM (Szuper világítással és elegáns kiállítóteremmel)
// ====================================================================
function GalleryRoom({ photos, onSelectPhoto }: { photos: any[]; onSelectPhoto: (p: any) => void }) {
  const wallPositions: [number, number, number][] = [
    [-6, 0.5, -4.9], [0, 0.5, -4.9], [6, 0.5, -4.9],   // Hátsó fal
    [-9.9, 0.5, -1], [-9.9, 0.5, 3],                  // Bal fal
    [9.9, 0.5, -1], [9.9, 0.5, 3],                    // Jobb fal
    [-6, 0.5, 8.9], [0, 0.5, 8.9], [6, 0.5, 8.9]       // Első fal
  ];

  const wallRotations: [number, number, number][] = [
    [0, 0, 0], [0, 0, 0], [0, 0, 0],                  // Hátsó
    [0, Math.PI / 2, 0], [0, Math.PI / 2, 0],          // Bal
    [0, -Math.PI / 2, 0], [0, -Math.PI / 2, 0],        // Jobb
    [0, Math.PI, 0], [0, Math.PI, 0], [0, Math.PI, 0]  // Első
  ];

  return (
    <>
      {/* Környezeti és Irányított Fények */}
      <ambientLight intensity={1.2} />
      <directionalLight position={[0, 10, 10]} intensity={1.8} />
      <directionalLight position={[0, 10, -10]} intensity={1.2} />

      {/* Elegáns Parketta Padló */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 2]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} />
      </mesh>

      {/* Sötét Selyem Mennyezet */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4.5, 2]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#020617" />
      </mesh>

      {/* Kiállító Falak (Világos galéria szürke) */}
      <mesh position={[0, 1.75, -5]}>
        <planeGeometry args={[20, 11]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      <mesh position={[-10, 1.75, 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[20, 11]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      <mesh position={[10, 1.75, 2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[20, 11]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>

      {/* Képek kirakása a falakra */}
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
// 🚀 FŐ GALÉRIA NÉZET ÉS SZERKESZTŐ
// ====================================================================
export default function Gallery3DView({ user }: { user: any }) {
  const { lang } = useLanguage();
  const [mode, setMode] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [loading, setLoading] = useState(true);
  const [galleryTitle, setGalleryTitle] = useState('Saját Virtuális Kiállításom');
  const [savedPhotos, setSavedPhotos] = useState<any[]>([]);
  const [myAlbumPhotos, setMyAlbumPhotos] = useState<any[]>([]);
  
  const [selectedPhotos, setSelectedPhotos] = useState<any[]>([]);
  const [activePhotoModal, setActivePhotoModal] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [galRes, albumRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/premium/3d-gallery/my`, { headers: getAuthHeaders() }),
          fetch(`${BACKEND_URL}/api/weekly/my-album?userEmail=${encodeURIComponent(user?.email || '')}`, { headers: getAuthHeaders() })
        ]);

        if (galRes.ok) {
          const galData = await galRes.json();
          if (galData.gallery) {
            setGalleryTitle(galData.gallery.title || 'Saját Virtuális Kiállításom');
            const photosFromDb = galData.gallery.photos || [];
            setSavedPhotos(photosFromDb);
            setSelectedPhotos(photosFromDb);
          }
        }

        if (albumRes.ok) {
          const albumData = await albumRes.json();
          setMyAlbumPhotos(Array.isArray(albumData) ? albumData : []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user]);

  const toggleSelectPhoto = (photo: any) => {
    const isAlreadySelected = selectedPhotos.some(
      p => (p.id && photo.id && String(p.id) === String(photo.id)) || p.file_url === photo.file_url
    );

    if (isAlreadySelected) {
      setSelectedPhotos(prev => prev.filter(
        p => !((p.id && photo.id && String(p.id) === String(photo.id)) || p.file_url === photo.file_url)
      ));
    } else {
      if (selectedPhotos.length >= 10) {
        return alert(lang === 'en' ? 'Maximum 10 photos allowed!' : 'Legfeljebb 10 fotót választhatsz ki a kiállításra!');
      }
      setSelectedPhotos(prev => [...prev, photo]);
    }
  };

  const handleSave = async () => {
    if (selectedPhotos.length === 0) {
      return alert(lang === 'en' ? 'Please select at least 1 photo!' : 'Kérlek válassz ki legalább 1 fotót!');
    }

    setIsSaving(true);
    const safeTitle = galleryTitle.trim() || (lang === 'en' ? 'My 3D Exhibition' : 'Saját Virtuális Kiállításom');

    try {
      const res = await fetch(`${BACKEND_URL}/api/premium/3d-gallery/save`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ title: safeTitle, theme: 'modern', photos: selectedPhotos })
      });

      if (res.ok) {
        setSavedPhotos(selectedPhotos);
        setMode('VIEW');
        alert(lang === 'en' ? 'Virtual Gallery saved successfully! 🎉' : '🎉 Virtuális galéria sikeresen elmentve!');
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || (lang === 'en' ? 'Failed to save gallery.' : 'Nem sikerült elmenteni a galériát.'));
      }
    } catch (e) {
      console.error(e);
      alert(lang === 'en' ? 'Network error during save.' : 'Hálózati hiba a mentés során.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <VideoLoader />;

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '10px' }}>
      
      {/* FEJLÉC */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-main)', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Box size={28} /> {galleryTitle}
          </h2>
          <small style={{ color: 'var(--text-muted)' }}>3D Virtuális Tárlat • {savedPhotos.length} kiállított alkotás</small>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {mode === 'VIEW' ? (
            <button onClick={() => setMode('EDIT')} style={{ background: '#f97316', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} /> Tárlat Szerkesztése
            </button>
          ) : (
            <button onClick={() => setMode('VIEW')} style={{ background: 'var(--bg-main)', color: 'var(--text-title)', border: '1px solid var(--border-main)', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowLeft size={16} /> Vissza a 3D Nézetre
            </button>
          )}
        </div>
      </div>

      {/* SZERKESZTŐ MÓD */}
      {mode === 'EDIT' ? (
        <div style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '12px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-title)', fontWeight: 'bold', marginBottom: '8px' }}>Kiállítás Neve:</label>
            <input type="text" value={galleryTitle} onChange={e => setGalleryTitle(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', fontSize: '1rem', outline: 'none' }} />
          </div>

          <div>
            <h3 style={{ color: 'var(--text-title)', marginBottom: '6px' }}>Válassz ki legfeljebb 10 fotót az albumodból:</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>Kiválasztva: {selectedPhotos.length} / 10</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
              {myAlbumPhotos.map((photo, idx) => {
                const isSelected = selectedPhotos.some(
                  p => (p.id && photo.id && String(p.id) === String(photo.id)) || p.file_url === photo.file_url
                );
                return (
                  <div key={photo.id || photo.file_url || idx} onClick={() => toggleSelectPhoto(photo)} style={{ position: 'relative', height: '120px', borderRadius: '8px', overflow: 'hidden', border: isSelected ? '3px solid #10b981' : '1px solid var(--border-main)', cursor: 'pointer' }}>
                    <img src={photo.file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {isSelected && (
                      <div style={{ position: 'absolute', top: '6px', right: '6px', background: '#10b981', color: 'white', borderRadius: '50%', padding: '2px' }}>
                        <CheckCircle2 size={18} />
                      </div>
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
      ) : (
        /* 3D KANVÁS MEGJELENÍTŐ */
        <div style={{ width: '100%', height: '600px', background: '#020617', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-main)' }}>
          {savedPhotos.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <h3>Még nem rendezted be a virtuális tárlatodat!</h3>
              <p>Kattints a "Tárlat Szerkesztése" gombra és válaszd ki a kiállítani kívánt képeidet.</p>
            </div>
          ) : (
            <>
              <Canvas camera={{ position: [0, 0.5, 6], fov: 60 }}>
                <GalleryRoom photos={savedPhotos} onSelectPhoto={(p) => setActivePhotoModal(p)} />
                <OrbitControls enableZoom={true} maxPolarAngle={Math.PI / 2} minDistance={1} maxDistance={9} target={[0, 0.5, 0]} />
              </Canvas>

              <div style={{ position: 'absolute', bottom: '15px', left: '15px', background: 'rgba(9, 13, 22, 0.85)', padding: '8px 15px', borderRadius: '8px', color: 'white', fontSize: '0.8rem', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                💡 <b>Nézelődés:</b> Húzd az egeret / ujjadat a forgáshoz! Kattints egy képre a részletekért.
              </div>
            </>
          )}
        </div>
      )}

      {/* RÁKÖZELÍTŐ MODÁL A KÉPRE KATTINTVA */}
      {activePhotoModal && (
        <div onClick={() => setActivePhotoModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', padding: '20px', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
            <img src={activePhotoModal.file_url} alt="" style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '8px', marginBottom: '15px' }} />
            <h3 style={{ color: 'var(--text-title)', margin: '0 0 5px 0' }}>{activePhotoModal.title || 'Cím nélküli alkotás'}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Kiállító: {user?.name}</p>
            <button onClick={() => setActivePhotoModal(null)} style={{ marginTop: '15px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Bezárás</button>
          </div>
        </div>
      )}

    </div>
  );
}
