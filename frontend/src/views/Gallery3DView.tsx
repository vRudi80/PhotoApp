import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { BACKEND_URL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';
import { useLanguage } from '../context/LanguageContext';
import VideoLoader from '../components/VideoLoader';
import { 
  Box, Save, ArrowLeft, CheckCircle2, Globe, Users, 
  Sparkles, Eye, Edit3, Trash2, PlusCircle, ArrowUp, ArrowDown, 
  Navigation, BookOpen, UserCheck, MessageSquare, Send, X, Clock 
} from 'lucide-react';

const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('photoAppToken');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

const resolvePhotoUrl = (photo: any) => {
  if (!photo) return '';
  return getImageUrl(photo.drive_file_id, photo.file_url) || photo.file_url || '';
};

const getPhotoIdentifier = (p: any) => {
  if (p.id) return `id_${p.id}`;
  return `url_${resolvePhotoUrl(p)}`;
};

function WalkingController({ 
  moveState, 
  controlsRef 
}: { 
  moveState: { forward: boolean; back: boolean; left: boolean; right: boolean }; 
  controlsRef: React.RefObject<any> 
}) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    const moveSpeed = 4.5 * delta;
    const forwardVec = new THREE.Vector3();
    camera.getWorldDirection(forwardVec);
    forwardVec.y = 0;
    forwardVec.normalize();

    const sideVec = new THREE.Vector3();
    sideVec.crossVectors(camera.up, forwardVec).normalize();

    const moveDelta = new THREE.Vector3();

    if (moveState.forward) moveDelta.addScaledVector(forwardVec, moveSpeed);
    if (moveState.back) moveDelta.addScaledVector(forwardVec, -moveSpeed);
    if (moveState.left) moveDelta.addScaledVector(sideVec, moveSpeed);
    if (moveState.right) moveDelta.addScaledVector(sideVec, -moveSpeed);

    if (moveDelta.lengthSq() > 0) {
      camera.position.add(moveDelta);
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -8.5, 8.5);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -3.5, 7.5);
      camera.position.y = 0.6;

      if (controlsRef.current) {
        controlsRef.current.target.add(moveDelta);
        controlsRef.current.update();
      }
    }
  });

  return null;
}

function ArtworkFrame({ position, rotation, url, title, onClick }: any) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [dims, setDims] = useState<{ pWidth: number; pHeight: number }>({ pWidth: 2.8, pHeight: 1.9 });

  useEffect(() => {
    if (!url) return;
    let isMounted = true;

    const applyTextureWithAspect = (loaded: THREE.Texture) => {
      if (!isMounted) return;
      loaded.colorSpace = THREE.SRGBColorSpace;

      const img = loaded.image;
      if (img && img.width && img.height) {
        const aspect = img.width / img.height;
        let w = 2.8;
        let h = 1.9;

        if (aspect >= 1) {
          w = 2.8;
          h = w / aspect;
          if (h > 2.2) { h = 2.2; w = h * aspect; }
        } else {
          h = 2.4;
          w = h * aspect;
          if (w > 2.0) { w = 2.0; h = w / aspect; }
        }
        setDims({ pWidth: w, pHeight: h });
      }
      setTexture(loaded);
    };

    const loadTextureWithFallback = async () => {
      let targetUrl = url;
      const isDrive = url.includes('drive.google.com') || url.includes('googleusercontent.com') || url.includes('uc?export=download');

      if (isDrive) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/weekly/image-proxy?url=${encodeURIComponent(url)}`, {
            headers: getAuthHeaders()
          });
          if (res.ok) {
            const data = await res.json();
            if (data.base64) targetUrl = data.base64;
          }
        } catch (e) {}
      }

      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');

      loader.load(
        targetUrl,
        (loaded) => applyTextureWithAspect(loaded),
        undefined,
        async () => {
          if (!isDrive) {
            try {
              const res = await fetch(`${BACKEND_URL}/api/weekly/image-proxy?url=${encodeURIComponent(url)}`, {
                headers: getAuthHeaders()
              });
              if (res.ok) {
                const data = await res.json();
                if (data.base64 && isMounted) {
                  loader.load(data.base64, (fallbackLoaded) => applyTextureWithAspect(fallbackLoaded));
                }
              }
            } catch (err) {}
          }
        }
      );
    };

    loadTextureWithFallback();
    return () => { isMounted = false; };
  }, [url]);

  const { pWidth, pHeight } = dims;
  const frameWidth = pWidth + 0.35;
  const frameHeight = pHeight + 0.35;
  const passWidth = pWidth + 0.18;
  const passHeight = pHeight + 0.18;

  const labelYPosition = -(frameHeight / 2 + 0.22);

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[frameWidth, frameHeight, 0.06]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} />
      </mesh>
      
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[passWidth, passHeight]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} />
      </mesh>

      <mesh onClick={onClick} position={[0, 0, 0.005]} style={{ cursor: 'pointer' }}>
        <planeGeometry args={[pWidth, pHeight]} />
        {texture ? <meshBasicMaterial map={texture} /> : <meshStandardMaterial color="#334155" />}
      </mesh>

      <spotLight
        position={[0, frameHeight / 2 + 0.5, 1.2]}
        target-position={[0, 0, 0]}
        intensity={3.5}
        angle={0.65}
        penumbra={0.4}
        color="#fffbeb"
      />

      <group position={[0, labelYPosition, 0.01]}>
        <mesh position={[0, 0, -0.005]}>
          <planeGeometry args={[Math.max(1.8, pWidth * 0.8), 0.3]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
        <Text fontSize={0.13} color="#f8fafc" anchorX="center" anchorY="middle" maxWidth={pWidth * 0.75}>
          {title || 'Fotómű'}
        </Text>
      </group>
    </group>
  );
}

function GalleryRoom({ photos, onSelectPhoto }: { photos: any[]; onSelectPhoto: (p: any) => void }) {
  const wallPositions: [number, number, number][] = [
    [-6, 0.85, -4.9], [0, 0.85, -4.9], [6, 0.85, -4.9],
    [-9.9, 0.85, -1], [-9.9, 0.85, 3],
    [9.9, 0.85, -1], [9.9, 0.85, 3],
    [-6, 0.85, 8.9], [0, 0.85, 8.9], [6, 0.85, 8.9]
  ];

  const wallRotations: [number, number, number][] = [
    [0, 0, 0], [0, 0, 0], [0, 0, 0],
    [0, Math.PI / 2, 0], [0, Math.PI / 2, 0],
    [0, -Math.PI / 2, 0], [0, -Math.PI / 2, 0],
    [0, Math.PI, 0], [0, Math.PI, 0], [0, Math.PI, 0]
  ];

  return (
    <>
      <ambientLight intensity={1.3} />
      <directionalLight position={[0, 10, 10]} intensity={1.8} />
      <directionalLight position={[0, 10, -10]} intensity={1.2} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.0, 2]}>
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
        const photoUrl = resolvePhotoUrl(photo);
        return (
          <ArtworkFrame
            key={photo.id || photoUrl || i}
            position={wallPositions[i]}
            rotation={wallRotations[i]}
            url={photoUrl}
            title={photo.title}
            onClick={() => onSelectPhoto({ ...photo, file_url: photoUrl })}
          />
        );
      })}
    </>
  );
}

export default function Gallery3DView({ user }: { user: any }) {
  const { lang } = useLanguage();
  const [viewMode, setMode] = useState<'DIRECTORY' | 'VIEW_3D' | 'EDIT'>('DIRECTORY');
  const [loading, setLoading] = useState(true);

  const [allGalleries, setAllGalleries] = useState<any[]>([]);
  const [activeGallery, setActiveGallery] = useState<any | null>(null);

  const [editingGalleryId, setEditingGalleryId] = useState<number | null>(null);
  const [galleryTitle, setGalleryTitle] = useState('Saját Virtuális Kiállításom');
  const [visibility, setVisibility] = useState<'public' | 'club'>('public');
  const [myPortfolioPhotos, setMyPortfolioPhotos] = useState<any[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<any[]>([]);
  const [activePhotoModal, setActivePhotoModal] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 🎯 VENDÉGKÖNYV ÉS LÁTOGATÓI JEGYZÉK ÁLLAPOTOK
  const [showInteractionsModal, setShowInteractionsModal] = useState(false);
  const [interactionTab, setInteractionTab] = useState<'GUESTBOOK' | 'VISITORS'>('GUESTBOOK');
  const [guestbookEntries, setGuestbookEntries] = useState<any[]>([]);
  const [visitorsList, setVisitorsList] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  const controlsRef = useRef<any>(null);
  const [moveState, setMoveState] = useState({ forward: false, back: false, left: false, right: false });

  useEffect(() => {
    if (viewMode !== 'VIEW_3D') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') setMoveState(p => ({ ...p, forward: true }));
      if (code === 'KeyS' || code === 'ArrowDown') setMoveState(p => ({ ...p, back: true }));
      if (code === 'KeyA' || code === 'ArrowLeft') setMoveState(p => ({ ...p, left: true }));
      if (code === 'KeyD' || code === 'ArrowRight') setMoveState(p => ({ ...p, right: true }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') setMoveState(p => ({ ...p, forward: false }));
      if (code === 'KeyS' || code === 'ArrowDown') setMoveState(p => ({ ...p, back: false }));
      if (code === 'KeyA' || code === 'ArrowLeft') setMoveState(p => ({ ...p, left: false }));
      if (code === 'KeyD' || code === 'ArrowRight') setMoveState(p => ({ ...p, right: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [viewMode]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, portfolioRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/3d-galleries`, { headers: getAuthHeaders() }),
        fetch(`${BACKEND_URL}/api/my-album?userEmail=${encodeURIComponent(user?.email || '')}`, { headers: getAuthHeaders() })
      ]);

      if (listRes.ok) setAllGalleries(await listRes.json());
      if (portfolioRes.ok) setMyPortfolioPhotos(await portfolioRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  // 🎯 LÁTOGATÁS RÖGZÍTÉSE ÉS INTERAKCIÓK BETÖLTÉSE
  const loadInteractions = async (galleryId: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/3d-gallery/${galleryId}/interactions`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setGuestbookEntries(data.guestbook || []);
        setVisitorsList(data.visitors || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpen3D = async (gal: any) => {
    setActiveGallery(gal);
    setMode('VIEW_3D');

    // Rögzítjük a látogatást
    try {
      await fetch(`${BACKEND_URL}/api/3d-gallery/${gal.id}/visit`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
    } catch (e) {}

    loadInteractions(gal.id);
  };

  // Új bejegyzés írása a Vendégkönyvbe
  const handlePostGuestbook = async () => {
    if (!newCommentText.trim() || !activeGallery) return;
    setIsPostingComment(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/3d-gallery/${activeGallery.id}/guestbook`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ comment_text: newCommentText })
      });

      if (res.ok) {
        setNewCommentText('');
        loadInteractions(activeGallery.id);
      }
    } catch (e) {
      alert('Hiba a bejegyzés elküldésekor.');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleStartNewGallery = () => {
    setEditingGalleryId(null);
    setGalleryTitle('Új Virtuális Kiállításom');
    setVisibility('public');
    setSelectedPhotos([]);
    setMode('EDIT');
  };

  const handleEditGallery = (gal: any) => {
    setEditingGalleryId(gal.id);
    setGalleryTitle(gal.title || 'Virtuális Kiállítás');
    setVisibility(gal.visibility || 'public');
    setSelectedPhotos(gal.photos || []);
    setMode('EDIT');
  };

  const handleDeleteGallery = async (galId: number) => {
    if (!window.confirm("Biztosan törölni szeretnéd ezt a 3D kiállítást?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/premium/3d-gallery/${galId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        alert('Tárlat törölve! 🗑️');
        loadData();
      }
    } catch (e) {
      alert('Hálózati hiba.');
    }
  };

  const toggleSelectPhoto = (photo: any) => {
    const photoKey = getPhotoIdentifier(photo);
    const isAlreadySelected = selectedPhotos.some(p => getPhotoIdentifier(p) === photoKey);

    if (isAlreadySelected) {
      setSelectedPhotos(prev => prev.filter(p => getPhotoIdentifier(p) !== photoKey));
    } else {
      if (selectedPhotos.length >= 10) {
        return alert(lang === 'en' ? 'Maximum 10 photos allowed!' : 'Legfeljebb 10 fotót választhatsz ki!');
      }
      const photoUrl = resolvePhotoUrl(photo);
      const initialTitle = photo.title || photo.title_hu || '';
      setSelectedPhotos(prev => [...prev, { id: photo.id, drive_file_id: photo.drive_file_id, file_url: photoUrl, title: initialTitle }]);
    }
  };

  const updatePhotoTitle = (photoKey: string, newTitle: string) => {
    setSelectedPhotos(prev => prev.map(p => getPhotoIdentifier(p) === photoKey ? { ...p, title: newTitle } : p));
  };

  const handleSave = async () => {
    if (selectedPhotos.length === 0) return alert(lang === 'en' ? 'Please select at least 1 photo!' : 'Kérlek válassz ki legalább 1 fotót!');
    setIsSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/premium/3d-gallery/save`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id: editingGalleryId, title: galleryTitle, theme: 'modern', visibility, photos: selectedPhotos })
      });
      if (res.ok) {
        await loadData();
        setMode('DIRECTORY');
        alert('🎉 Kiállítás elmentve!');
      }
    } catch (e) {
      alert('Hálózati hiba.');
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
            <Box size={28} /> {viewMode === 'VIEW_3D' ? activeGallery?.title : 'Virtuális 3D Tárlatok'}
          </h2>
          <small style={{ color: 'var(--text-muted)' }}>
            {viewMode === 'VIEW_3D' ? `Kiállító: ${activeGallery?.photographer_name}` : 'Böngéssz a fotóművészek kiállítótermeiben'}
          </small>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {viewMode === 'VIEW_3D' && (
            <button 
              onClick={() => setShowInteractionsModal(true)} 
              style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <BookOpen size={16} /> Vendégkönyv & Látogatók
            </button>
          )}

          {viewMode !== 'DIRECTORY' && (
            <button onClick={() => setMode('DIRECTORY')} style={{ background: 'var(--bg-main)', color: 'var(--text-title)', border: '1px solid var(--border-main)', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowLeft size={16} /> Vissza a Katalógushoz
            </button>
          )}

          {user?.is_premium || user?.isPremium ? (
            viewMode === 'DIRECTORY' && (
              <button onClick={handleStartNewGallery} style={{ background: '#f97316', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={16} /> Új 3D Tárlat Létrehozása
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
              {allGalleries.map((gal) => {
                const coverUrl = resolvePhotoUrl(gal.photos?.[0]);
                const isMine = gal.user_email === user?.email;

                return (
                  <div key={gal.id} style={{ background: 'var(--bg-card)', border: isMine ? '2px solid #a78bfa' : '1px solid var(--border-main)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    
                    <div style={{ height: '180px', background: '#090d16', position: 'relative' }}>
                      <img src={coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      
                      {/* STATISZTIKAI JELVÉNYEK */}
                      <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}>
                        <span style={{ background: 'rgba(15,23,42,0.85)', padding: '3px 8px', borderRadius: '20px', fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Eye size={12} color="#38bdf8" /> {gal.visitor_count || 0}
                        </span>
                        <span style={{ background: 'rgba(15,23,42,0.85)', padding: '3px 8px', borderRadius: '20px', fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MessageSquare size={12} color="#a78bfa" /> {gal.comment_count || 0}
                        </span>
                      </div>

                      <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(15,23,42,0.85)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', color: gal.visibility === 'club' ? '#f59e0b' : '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {gal.visibility === 'club' ? <><Users size={12} /> Klub Szféra</> : <><Globe size={12} /> Publikus</>}
                      </div>
                    </div>

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

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button 
                          onClick={() => handleOpen3D(gal)}
                          style={{ width: '100%', background: '#a78bfa', color: '#0f172a', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                          <Eye size={16} /> 3D Tárlat Bejárása ({gal.photos?.length || 0} kép)
                        </button>

                        {isMine && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleEditGallery(gal)} style={{ flex: 1, background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: '#38bdf8', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <Edit3 size={14} /> Szerkesztés
                            </button>
                            <button onClick={() => handleDeleteGallery(gal.id)} style={{ flex: 1, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <Trash2 size={14} /> Törlés
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. 3D MEGTEKINTŐ NÉZET VALÓDI SÉTA ELEMEKKEL */}
      {viewMode === 'VIEW_3D' && activeGallery && (
        <div style={{ width: '100%', height: '620px', background: '#020617', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-main)' }}>
          
          <Canvas camera={{ position: [0, 0.6, 5], fov: 60 }}>
            <WalkingController moveState={moveState} controlsRef={controlsRef} />
            <GalleryRoom photos={activeGallery.photos || []} onSelectPhoto={(p) => setActivePhotoModal(p)} />
            <OrbitControls 
              ref={controlsRef} 
              target={[0, 0.6, 0]}
              enableZoom={false} 
              enablePan={false} 
              maxPolarAngle={Math.PI / 2 + 0.05} 
              minPolarAngle={Math.PI / 6} 
            />
          </Canvas>

          {/* ÚTMUTATÓ LENT BALRA */}
          <div style={{ position: 'absolute', bottom: '15px', left: '15px', background: 'rgba(9, 13, 22, 0.85)', padding: '10px 16px', borderRadius: '8px', color: 'white', fontSize: '0.8rem', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a78bfa', fontWeight: 'bold' }}>
              <Navigation size={14} /> <span>Irányítás & Séta:</span>
            </div>
            <div>⌨️ <b>W, A, S, D / Nyilak:</b> Séta a teremben</div>
            <div>🖱️ <b>Egér / Érintés:</b> Forgás és nézelődés</div>
          </div>

          {/* MOBIL SÉTA GOMBOK */}
          <div style={{ position: 'absolute', bottom: '15px', right: '15px', display: 'grid', gridTemplateColumns: 'repeat(3, 44px)', gap: '6px', background: 'rgba(9, 13, 22, 0.85)', padding: '10px', borderRadius: '12px', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div></div>
            <button 
              onMouseDown={() => setMoveState(p => ({ ...p, forward: true }))} 
              onMouseUp={() => setMoveState(p => ({ ...p, forward: false }))}
              onTouchStart={() => setMoveState(p => ({ ...p, forward: true }))} 
              onTouchEnd={() => setMoveState(p => ({ ...p, forward: false }))}
              style={{ width: '44px', height: '44px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowUp size={20} />
            </button>
            <div></div>

            <button 
              onMouseDown={() => setMoveState(p => ({ ...p, left: true }))} 
              onMouseUp={() => setMoveState(p => ({ ...p, left: false }))}
              onTouchStart={() => setMoveState(p => ({ ...p, left: true }))} 
              onTouchEnd={() => setMoveState(p => ({ ...p, left: false }))}
              style={{ width: '44px', height: '44px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowLeft size={20} />
            </button>

            <button 
              onMouseDown={() => setMoveState(p => ({ ...p, back: true }))} 
              onMouseUp={() => setMoveState(p => ({ ...p, back: false }))}
              onTouchStart={() => setMoveState(p => ({ ...p, back: true }))} 
              onTouchEnd={() => setMoveState(p => ({ ...p, back: false }))}
              style={{ width: '44px', height: '44px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowDown size={20} />
            </button>

            <button 
              onMouseDown={() => setMoveState(p => ({ ...p, right: true }))} 
              onMouseUp={() => setMoveState(p => ({ ...p, right: false }))}
              onTouchStart={() => setMoveState(p => ({ ...p, right: true }))} 
              onTouchEnd={() => setMoveState(p => ({ ...p, right: false }))}
              style={{ width: '44px', height: '44px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowLeft size={20} style={{ transform: 'rotate(180deg)' }} />
            </button>
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
            <h3 style={{ color: 'var(--text-title)', marginBottom: '6px' }}>Válassz ki legfeljebb 10 fotót a Portfóliódból:</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>Kiválasztva: {selectedPhotos.length} / 10</p>
            
            {myPortfolioPhotos.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', background: 'var(--bg-main)', borderRadius: '8px', border: '1px dashed var(--border-main)', color: 'var(--text-muted)' }}>
                Még nincs feltöltött fotód a Portfóliódban.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
                {myPortfolioPhotos.map((photo, idx) => {
                  const photoKey = getPhotoIdentifier(photo);
                  const selectedObj = selectedPhotos.find(p => getPhotoIdentifier(p) === photoKey);
                  const isSelected = !!selectedObj;

                  return (
                    <div key={photo.id || photoKey || idx} style={{ background: 'var(--bg-main)', border: isSelected ? '2px solid #10b981' : '1px solid var(--border-main)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div onClick={() => toggleSelectPhoto(photo)} style={{ position: 'relative', height: '130px', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', background: '#000' }}>
                        <img src={resolvePhotoUrl(photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        {isSelected && (
                          <div style={{ position: 'absolute', top: '6px', right: '6px', background: '#10b981', color: 'white', borderRadius: '50%', padding: '2px' }}>
                            <CheckCircle2 size={18} />
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <input 
                          type="text" 
                          placeholder="Kép címe a 3D teremben..." 
                          value={selectedObj.title || ''} 
                          onChange={e => updatePhotoTitle(photoKey, e.target.value)} 
                          style={{ padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-title)', fontSize: '0.82rem', outline: 'none' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button onClick={handleSave} disabled={isSaving || selectedPhotos.length === 0} style={{ background: selectedPhotos.length > 0 ? '#10b981' : 'var(--border-main)', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: selectedPhotos.length > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Save size={18} /> {isSaving ? 'Mentés...' : '3D Kiállítás Publikálása'}
          </button>
        </div>
      )}

      {/* 🎯 VENDÉGKÖNYV ÉS LÁTOGATÓI JEGYZÉK MODÁL */}
      {showInteractionsModal && (
        <div onClick={() => setShowInteractionsModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', width: '100%', maxWidth: '650px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Fejléc és Fülek */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setInteractionTab('GUESTBOOK')}
                  style={{ background: interactionTab === 'GUESTBOOK' ? '#8b5cf6' : 'transparent', color: interactionTab === 'GUESTBOOK' ? 'white' : 'var(--text-muted)', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}
                >
                  <MessageSquare size={16} /> Vendégkönyv ({guestbookEntries.length})
                </button>
                <button 
                  onClick={() => setInteractionTab('VISITORS')}
                  style={{ background: interactionTab === 'VISITORS' ? '#38bdf8' : 'transparent', color: interactionTab === 'VISITORS' ? 'white' : 'var(--text-muted)', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}
                >
                  <UserCheck size={16} /> Látogatási Jegyzék ({visitorsList.length})
                </button>
              </div>

              <button onClick={() => setShowInteractionsModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* FŐ TARTALMI ZÓNA */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {/* TAB 1: VENDÉGKÖNYV */}
              {interactionTab === 'GUESTBOOK' && (
                <>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="text" 
                      placeholder="Írj a vendégkönyvbe (érzékelések, gratuláció...)" 
                      value={newCommentText}
                      onChange={e => setNewCommentText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handlePostGuestbook(); }}
                      style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', outline: 'none' }}
                    />
                    <button 
                      onClick={handlePostGuestbook}
                      disabled={isPostingComment || !newCommentText.trim()}
                      style={{ background: '#10b981', color: 'white', border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Send size={16} /> Küldés
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                    {guestbookEntries.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                        Még senki nem írt a vendégkönyvbe. Légy te az első!
                      </div>
                    ) : (
                      guestbookEntries.map((e) => (
                        <div key={e.id} style={{ background: 'var(--bg-main)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-main)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <img src={e.avatar_url || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23475569'><circle cx='12' cy='8' r='4'/><path d='M12 14c-6.1 0-10 4-10 4v2h20v-2s-3.9-4-10-4z'/></svg>"} alt="" style={{ width: '24px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                              <strong style={{ fontSize: '0.9rem', color: 'var(--text-title)' }}>{e.user_name}</strong>
                              {e.club_name && <small style={{ color: '#10b981', fontSize: '0.75rem' }}>({e.club_name})</small>}
                            </div>
                            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              {new Date(e.created_at).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </small>
                          </div>
                          <p style={{ margin: 0, color: 'var(--text-body)', fontSize: '0.88rem', lineHeight: '1.4' }}>{e.comment_text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* TAB 2: LÁTOGATÁSI JEGYZÉK */}
              {interactionTab === 'VISITORS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {visitorsList.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                      Még senki sem látogatta meg ezt a kiállítást.
                    </div>
                  ) : (
                    visitorsList.map((v, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={v.avatar_url || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23475569'><circle cx='12' cy='8' r='4'/><path d='M12 14c-6.1 0-10 4-10 4v2h20v-2s-3.9-4-10-4z'/></svg>"} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 'bold', color: 'var(--text-title)' }}>{v.user_name}</div>
                            {v.club_name && <div style={{ fontSize: '0.75rem', color: '#10b981' }}>{v.club_name}</div>}
                          </div>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {new Date(v.visited_at).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* RÁKÖZELÍTŐ MODÁL A KÉPRE KATTINTVA */}
      {activePhotoModal && (
        <div onClick={() => setActivePhotoModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', padding: '20px', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
            <img src={resolvePhotoUrl(activePhotoModal)} alt="" style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '8px', marginBottom: '15px' }} />
            <h3 style={{ color: 'var(--text-title)', margin: '0 0 5px 0' }}>{activePhotoModal.title || 'Cím nélküli alkotás'}</h3>
            <button onClick={() => setActivePhotoModal(null)} style={{ marginTop: '15px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Bezárás</button>
          </div>
        </div>
      )}

    </div>
  );
}
