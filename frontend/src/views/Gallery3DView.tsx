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
  Navigation, BookOpen, UserCheck, MessageSquare, Send, X, Clock,
  Share2, Palette, Layers, Award, Maximize2
} from 'lucide-react';

const ROBOTO_FONT_URL = "https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff";

const GALLERY_THEMES: Record<string, {
  name: string;
  icon: string;
  wallColor: string;
  floorColor: string;
  ceilingColor: string;
  skirtingColor: string;
  pillarColor: string;
  frameColor: string;
  passColor: string;
  lightColor: string;
}> = {
  modern: {
    name: 'Modern Sötét',
    icon: '🏢',
    wallColor: '#1e293b',
    floorColor: '#0f172a',
    ceilingColor: '#020617',
    skirtingColor: '#334155',
    pillarColor: '#0f172a',
    frameColor: '#090d16',
    passColor: '#f8fafc',
    lightColor: '#ffffff',
  },
  classic: {
    name: 'Klasszikus Elegáns',
    icon: '🏛️',
    wallColor: '#e2e8f0',
    floorColor: '#78350f',
    ceilingColor: '#f8fafc',
    skirtingColor: '#451a03',
    pillarColor: '#cbd5e1',
    frameColor: '#451a03',
    passColor: '#fef3c7',
    lightColor: '#fffbeb',
  },
  warm: {
    name: 'Meleg Hangulatú',
    icon: '🕯️',
    wallColor: '#3f2d20',
    floorColor: '#271910',
    ceilingColor: '#170e0a',
    skirtingColor: '#5c4033',
    pillarColor: '#271910',
    frameColor: '#170e0a',
    passColor: '#fff7ed',
    lightColor: '#ffedd5',
  },
  industrial: {
    name: 'Loft / Betonszürke',
    icon: '🧱',
    wallColor: '#475569',
    floorColor: '#334155',
    ceilingColor: '#0f172a',
    skirtingColor: '#1e293b',
    pillarColor: '#1e293b',
    frameColor: '#020617',
    passColor: '#f8fafc',
    lightColor: '#f1f5f9',
  }
};

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
  controlsRef,
  photoCount
}: { 
  moveState: { forward: boolean; back: boolean; left: boolean; right: boolean }; 
  controlsRef: React.RefObject<any>;
  photoCount: number;
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

      let minZ = -3.5;
      let maxZ = 7.5;
      let minX = -8.5;
      let maxX = 8.5;

      if (photoCount > 10) minZ = -17.5;
      if (photoCount > 20) { minX = -18.5; maxX = 18.5; }

      camera.position.x = THREE.MathUtils.clamp(camera.position.x, minX, maxX);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, minZ, maxZ);
      camera.position.y = 0.6;

      if (controlsRef.current) {
        controlsRef.current.target.add(moveDelta);
        controlsRef.current.update();
      }
    }
  });

  return null;
}

function ArtworkFrame({ position, rotation, url, title, themeConfig, onClick }: any) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [dims, setDims] = useState<{ pWidth: number; pHeight: number }>({ pWidth: 2.8, pHeight: 1.9 });

  useEffect(() => {
    if (!url) return;
    let isMounted = true;
    let currentTexture: THREE.Texture | null = null;

    const applyTextureWithAspect = (loaded: THREE.Texture) => {
      if (!isMounted) {
        loaded.dispose();
        return;
      }
      loaded.colorSpace = THREE.SRGBColorSpace;
      currentTexture = loaded;

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

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(url, (loaded) => applyTextureWithAspect(loaded));

    return () => { 
      isMounted = false; 
      if (currentTexture) currentTexture.dispose();
    };
  }, [url]);

  const { pWidth, pHeight } = dims;
  const frameWidth = pWidth + 0.35;
  const frameHeight = pHeight + 0.35;
  const passWidth = pWidth + 0.18;
  const passHeight = pHeight + 0.18;
  const labelYPosition = -(frameHeight / 2 + 0.18);

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[frameWidth, frameHeight, 0.06]} />
        <meshStandardMaterial color={themeConfig.frameColor} roughness={0.3} />
      </mesh>
      
      <mesh position={[0, 0, 0.061]}>
        <planeGeometry args={[passWidth, passHeight]} />
        <meshStandardMaterial color={themeConfig.passColor} roughness={0.9} />
      </mesh>

      <mesh onClick={onClick} position={[0, 0, 0.065]} style={{ cursor: 'pointer' }}>
        <planeGeometry args={[pWidth, pHeight]} />
        {texture ? <meshBasicMaterial map={texture} /> : <meshStandardMaterial color="#334155" />}
      </mesh>

      <group position={[0, labelYPosition, 0.065]}>
        <mesh position={[0, 0, -0.005]}>
          <planeGeometry args={[Math.max(1.8, pWidth * 0.8), 0.28]} />
          <meshStandardMaterial color={themeConfig.skirtingColor} roughness={0.5} />
        </mesh>
        <Text 
          font={ROBOTO_FONT_URL}
          fontSize={0.13} 
          color="#ffffff" 
          anchorX="center" 
          anchorY="middle" 
          maxWidth={pWidth * 0.75}
        >
          {title || 'Fotómű'}
        </Text>
      </group>
    </group>
  );
}

function GalleryRoom({ photos, themeName, onSelectPhoto }: { photos: any[]; themeName?: string; onSelectPhoto: (p: any) => void }) {
  const theme = GALLERY_THEMES[themeName || 'modern'] || GALLERY_THEMES.modern;
  const count = photos.length;

  const wallPositions: [number, number, number][] = [
    [-6, 1.20, -4.96], [6, 1.20, -4.96],
    [-9.96, 1.20, -2], [-9.96, 1.20, 2.5], [-9.96, 1.20, 6.5],
    [9.96, 1.20, -2],  [9.96, 1.20, 2.5],  [9.96, 1.20, 6.5],
    [-5, 1.20, 8.96],  [5, 1.20, 8.96],

    [-6, 1.20, -18.96], [0, 1.20, -18.96], [6, 1.20, -18.96],
    [-9.96, 1.20, -9],  [-9.96, 1.20, -13], [-9.96, 1.20, -17],
    [9.96, 1.20, -9],   [9.96, 1.20, -13],  [9.96, 1.20, -17],
    [-6.5, 1.20, -5.04],

    [-19.96, 1.20, -14], [-19.96, 1.20, -8], [-19.96, 1.20, -2], [-19.96, 1.20, 4],
    [19.96, 1.20, -14],  [19.96, 1.20, -8],  [19.96, 1.20, -2],  [19.96, 1.20, 4],
    [-15, 1.20, -18.96], [15, 1.20, -18.96]
  ];

  const wallRotations: [number, number, number][] = [
    [0, 0, 0], [0, 0, 0],
    [0, Math.PI / 2, 0], [0, Math.PI / 2, 0], [0, Math.PI / 2, 0],
    [0, -Math.PI / 2, 0], [0, -Math.PI / 2, 0], [0, -Math.PI / 2, 0],
    [0, Math.PI, 0], [0, Math.PI, 0],

    [0, 0, 0], [0, 0, 0], [0, 0, 0],
    [0, Math.PI / 2, 0], [0, Math.PI / 2, 0], [0, Math.PI / 2, 0],
    [0, -Math.PI / 2, 0], [0, -Math.PI / 2, 0], [0, -Math.PI / 2, 0],
    [0, Math.PI, 0],

    [0, Math.PI / 2, 0], [0, Math.PI / 2, 0], [0, Math.PI / 2, 0], [0, Math.PI / 2, 0],
    [0, -Math.PI / 2, 0], [0, -Math.PI / 2, 0], [0, -Math.PI / 2, 0], [0, -Math.PI / 2, 0],
    [0, 0, 0], [0, 0, 0]
  ];

  return (
    <>
      <ambientLight intensity={1.1} />
      <pointLight position={[0, 4.2, 2]} intensity={22} distance={25} color={theme.lightColor} decay={1.5} />
      {count > 10 && <pointLight position={[0, 4.2, -12]} intensity={22} distance={25} color={theme.lightColor} decay={1.5} />}
      {count > 20 && (
        <>
          <pointLight position={[-15, 4.2, -5]} intensity={18} distance={25} color={theme.lightColor} decay={1.5} />
          <pointLight position={[15, 4.2, -5]} intensity={18} distance={25} color={theme.lightColor} decay={1.5} />
        </>
      )}

      {/* TEREM ELEMEK */}
      <mesh position={[0, -1.05, 2]}><boxGeometry args={[20, 0.1, 14]} /><meshStandardMaterial color={theme.floorColor} roughness={0.25} metalness={0.15} /></mesh>
      <mesh position={[0, 5.05, 2]}><boxGeometry args={[20, 0.1, 14]} /><meshStandardMaterial color={theme.ceilingColor} roughness={0.8} /></mesh>

      <mesh position={[0, 2.0, count > 10 ? -19.05 : -5.05]}><boxGeometry args={[20, 6, 0.1]} /><meshStandardMaterial color={theme.wallColor} roughness={0.65} /></mesh>
      <mesh position={[-10.05, 2.0, count > 10 ? -5 : 2]}><boxGeometry args={[0.1, 6, count > 10 ? 28 : 14]} /><meshStandardMaterial color={theme.wallColor} roughness={0.65} /></mesh>
      <mesh position={[10.05, 2.0, count > 10 ? -5 : 2]}><boxGeometry args={[0.1, 6, count > 10 ? 28 : 14]} /><meshStandardMaterial color={theme.wallColor} roughness={0.65} /></mesh>
      <mesh position={[0, 2.0, 9.05]}><boxGeometry args={[20, 6, 0.1]} /><meshStandardMaterial color={theme.wallColor} roughness={0.65} /></mesh>

      {count > 10 && (
        <>
          <mesh position={[0, -1.05, -12]}><boxGeometry args={[20, 0.1, 14]} /><meshStandardMaterial color={theme.floorColor} roughness={0.25} metalness={0.15} /></mesh>
          <mesh position={[0, 5.05, -12]}><boxGeometry args={[20, 0.1, 14]} /><meshStandardMaterial color={theme.ceilingColor} roughness={0.8} /></mesh>
          <mesh position={[-6.5, 2.0, -5.0]}><boxGeometry args={[7, 6, 0.15]} /><meshStandardMaterial color={theme.wallColor} roughness={0.65} /></mesh>
          <mesh position={[6.5, 2.0, -5.0]}><boxGeometry args={[7, 6, 0.15]} /><meshStandardMaterial color={theme.wallColor} roughness={0.65} /></mesh>
          <mesh position={[0, 4.2, -5.0]}><boxGeometry args={[6, 1.6, 0.15]} /><meshStandardMaterial color={theme.wallColor} roughness={0.65} /></mesh>
        </>
      )}

      {count > 20 && (
        <>
          <mesh position={[-15, -1.05, -5]}><boxGeometry args={[10, 0.1, 28]} /><meshStandardMaterial color={theme.floorColor} roughness={0.25} metalness={0.15} /></mesh>
          <mesh position={[-20.05, 2.0, -5]}><boxGeometry args={[0.1, 6, 28]} /><meshStandardMaterial color={theme.wallColor} roughness={0.65} /></mesh>
          <mesh position={[15, -1.05, -5]}><boxGeometry args={[10, 0.1, 28]} /><meshStandardMaterial color={theme.floorColor} roughness={0.25} metalness={0.15} /></mesh>
          <mesh position={[20.05, 2.0, -5]}><boxGeometry args={[0.1, 6, 28]} /><meshStandardMaterial color={theme.wallColor} roughness={0.65} /></mesh>
        </>
      )}

      {/* FOTÓK ELHELYEZÉSE */}
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
            themeConfig={theme}
            onClick={() => onSelectPhoto({ ...photo, file_url: photoUrl })}
          />
        );
      })}
    </>
  );
}

// ====================================================================
// 🚀 FŐ 3D TÁRLATOK BÖNGÉSZŐ ÉS NYILVÁNOS STANDALONE MÓD
// ====================================================================
export default function Gallery3DView({ user }: { user?: any }) {
  const { lang } = useLanguage();
  const [viewMode, setMode] = useState<'DIRECTORY' | 'VIEW_3D' | 'EDIT'>('DIRECTORY');
  const [loading, setLoading] = useState(true);
  const [isPublicMode, setIsPublicMode] = useState(false);

  const [allGalleries, setAllGalleries] = useState<any[]>([]);
  const [activeGallery, setActiveGallery] = useState<any | null>(null);

  const [editingGalleryId, setEditingGalleryId] = useState<number | null>(null);
  const [galleryTitle, setGalleryTitle] = useState('Saját Virtuális Kiállításom');
  const [galleryTheme, setGalleryTheme] = useState<string>('modern');
  const [visibility, setVisibility] = useState<'public' | 'club'>('public');
  const [maxAllowedPhotos, setMaxAllowedPhotos] = useState<number>(10);

  const [myPortfolioPhotos, setMyPortfolioPhotos] = useState<any[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<any[]>([]);
  const [activePhotoModal, setActivePhotoModal] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [showInteractionsModal, setShowInteractionsModal] = useState(false);
  const [guestbookEntries, setGuestbookEntries] = useState<any[]>([]);
  const [visitorsList, setVisitorsList] = useState<any[]>([]);

  const controlsRef = useRef<any>(null);
  const [moveState, setMoveState] = useState({ forward: false, back: false, left: false, right: false });

  // 🎯 MEGOSZTOTT LINK / NYILVÁNOS VENDÉG MÓD DETEKTÁLÁSA
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetId = urlParams.get('id');

    // Ha nincs bejelentkezett user VAGY egyedi id van a hivatkozásban:
    if (targetId && (!user || urlParams.get('public') === 'true')) {
      setIsPublicMode(true);
      setLoading(true);

      fetch(`${BACKEND_URL}/api/public/3d-gallery/${targetId}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setActiveGallery(data);
            setMode('VIEW_3D');
          } else {
            alert(data.error || 'A kiállítás nem található.');
          }
        })
        .catch(err => console.error("Hiba a public tárlat töltésekor:", err))
        .finally(() => setLoading(false));
    } else {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, portfolioRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/3d-galleries`, { headers: getAuthHeaders() }),
        fetch(`${BACKEND_URL}/api/my-album?userEmail=${encodeURIComponent(user?.email || '')}`, { headers: getAuthHeaders() })
      ]);

      let loadedGalleries: any[] = [];
      if (listRes.ok) {
        loadedGalleries = await listRes.json();
        setAllGalleries(loadedGalleries);
      }
      if (portfolioRes.ok) setMyPortfolioPhotos(await portfolioRes.json());

      const urlParams = new URLSearchParams(window.location.search);
      const targetId = urlParams.get('id');
      if (targetId && loadedGalleries.length > 0) {
        const targetGal = loadedGalleries.find((g: any) => String(g.id) === String(targetId));
        if (targetGal) handleOpen3D(targetGal);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen3D = async (gal: any) => {
    setActiveGallery(gal);
    setMode('VIEW_3D');

    if (user) {
      try {
        await fetch(`${BACKEND_URL}/api/3d-gallery/${gal.id}/visit`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
      } catch (e) {}
    }
  };

  const handleShareGallery = (galId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const shareUrl = `${window.location.origin}/3d_gallery?id=${galId}&public=true`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => alert(lang === 'en' ? 'Direct public link copied! 📋' : '📋 Egyedi nyilvános megosztási link másolva a vágólapra!'))
        .catch(() => prompt(lang === 'en' ? 'Copy this link:' : 'Másold ki a hivatkozást:', shareUrl));
    } else {
      prompt(lang === 'en' ? 'Copy this link:' : 'Másold ki a hivatkozást:', shareUrl);
    }
  };

  if (loading) return <VideoLoader />;

  return (
    <div style={{ width: '100%', maxWidth: isPublicMode ? '100vw' : '1200px', margin: '0 auto', padding: isPublicMode ? '0' : '10px' }}>
      
      {/* FEJLÉC (KIZÁRÓLAG BEJELENTKEZETT FELHASZNÁLÓKNAK JELENIK MEG!) */}
      {!isPublicMode && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-main)', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Box size={28} /> {viewMode === 'VIEW_3D' ? activeGallery?.title : 'Virtuális 3D Tárlatok'}
            </h2>
            <small style={{ color: 'var(--text-muted)' }}>
              {viewMode === 'VIEW_3D' ? `Kiállító: ${activeGallery?.photographer_name}` : 'Böngéssz a fotóművészek kiállítótermeiben'}
            </small>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {viewMode === 'VIEW_3D' && activeGallery && (
              <button 
                onClick={() => handleShareGallery(activeGallery.id)} 
                style={{ background: 'var(--bg-main)', color: '#38bdf8', border: '1px solid var(--border-main)', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Share2 size={16} /> Megosztási Link Másolása
              </button>
            )}

            {viewMode !== 'DIRECTORY' && (
              <button onClick={() => setMode('DIRECTORY')} style={{ background: 'var(--bg-main)', color: 'var(--text-title)', border: '1px solid var(--border-main)', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowLeft size={16} /> Vissza a Katalógushoz
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. 3D MEGTEKINTŐ NÉZET (TELJES KÉPERNYŐS A VENDÉGEKNEK) */}
      {viewMode === 'VIEW_3D' && activeGallery && (
        <div style={{ 
          width: '100%', 
          height: isPublicMode ? '100vh' : '650px', 
          background: '#020617', 
          borderRadius: isPublicMode ? '0' : '12px', 
          overflow: 'hidden', 
          position: 'relative', 
          border: isPublicMode ? 'none' : '1px solid var(--border-main)' 
        }}>
          
          <Canvas camera={{ position: [0, 0.6, 5], fov: 60 }}>
            <WalkingController moveState={moveState} controlsRef={controlsRef} photoCount={activeGallery.photos?.length || 10} />
            <GalleryRoom 
              photos={activeGallery.photos || []} 
              themeName={activeGallery.theme} 
              onSelectPhoto={(p) => setActivePhotoModal(p)} 
            />
            <OrbitControls 
              ref={controlsRef} 
              target={[0, 0.6, 0]}
              enableZoom={false} 
              enablePan={false} 
              maxPolarAngle={Math.PI / 2 + 0.05} 
              minPolarAngle={Math.PI / 6} 
            />
          </Canvas>

          {/* KIÁLLÍTÁS CÍME ÉS FOTÓMŰVÉSZ BANNER (STANDALONE VENDÉG MÓDBAN IS MEGJELENIK) */}
          <div style={{ position: 'absolute', top: '15px', left: '15px', background: 'rgba(9, 13, 22, 0.85)', padding: '12px 20px', borderRadius: '12px', color: 'white', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#a78bfa', fontWeight: '900' }}>{activeGallery.title}</h3>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '2px' }}>
              Kiállító fotóművész: <b>{activeGallery.photographer_name}</b>
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: '15px', left: '15px', background: 'rgba(9, 13, 22, 0.85)', padding: '10px 16px', borderRadius: '8px', color: 'white', fontSize: '0.8rem', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a78bfa', fontWeight: 'bold' }}>
              <Navigation size={14} /> <span>Irányítás & Séta:</span>
            </div>
            <div>⌨️ <b>W, A, S, D / Nyilak:</b> Séta a teremben</div>
            <div>🖱️ <b>Egér / Érintés:</b> Forgás | 🖼️ <b>Kattints a képre</b> a nagyításhoz!</div>
          </div>

          <div style={{ position: 'absolute', bottom: '15px', right: '15px', display: 'grid', gridTemplateColumns: 'repeat(3, 44px)', gap: '6px', background: 'rgba(9, 13, 22, 0.85)', padding: '10px', borderRadius: '12px', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div></div>
            <button onMouseDown={() => setMoveState(p => ({ ...p, forward: true }))} onMouseUp={() => setMoveState(p => ({ ...p, forward: false }))} onTouchStart={() => setMoveState(p => ({ ...p, forward: true }))} onTouchEnd={() => setMoveState(p => ({ ...p, forward: false }))} style={{ width: '44px', height: '44px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowUp size={20} /></button>
            <div></div>
            <button onMouseDown={() => setMoveState(p => ({ ...p, left: true }))} onMouseUp={() => setMoveState(p => ({ ...p, left: false }))} onTouchStart={() => setMoveState(p => ({ ...p, left: true }))} onTouchEnd={() => setMoveState(p => ({ ...p, left: false }))} style={{ width: '44px', height: '44px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={20} /></button>
            <button onMouseDown={() => setMoveState(p => ({ ...p, back: true }))} onMouseUp={() => setMoveState(p => ({ ...p, back: false }))} onTouchStart={() => setMoveState(p => ({ ...p, back: true }))} onTouchEnd={() => setMoveState(p => ({ ...p, back: false }))} style={{ width: '44px', height: '44px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowDown size={20} /></button>
            <button onMouseDown={() => setMoveState(p => ({ ...p, right: true }))} onMouseUp={() => setMoveState(p => ({ ...p, right: false }))} onTouchStart={() => setMoveState(p => ({ ...p, right: true }))} onTouchEnd={() => setMoveState(p => ({ ...p, right: false }))} style={{ width: '44px', height: '44px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={20} style={{ transform: 'rotate(180deg)' }} /></button>
          </div>
        </div>
      )}

      {/* 🎯 ULTRA-NAGY KÉPERNYŐS LIGHTBOX MODÁL A KÉPEKRE KATTINTVA */}
      {activePhotoModal && (
        <div 
          onClick={() => setActivePhotoModal(null)} 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(2, 6, 23, 0.95)', 
            backdropFilter: 'blur(12px)', 
            zIndex: 999999, 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <button 
            onClick={() => setActivePhotoModal(null)}
            style={{ 
              position: 'absolute', 
              top: '20px', 
              right: '20px', 
              background: 'rgba(255,255,255,0.15)', 
              color: 'white', 
              border: '1px solid rgba(255,255,255,0.3)', 
              borderRadius: '50%', 
              width: '44px', 
              height: '44px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              zIndex: 1000000 
            }}
          >
            <X size={24} />
          </button>

          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxWidth: '95vw', 
              maxHeight: '85vh', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <img 
              src={resolvePhotoUrl(activePhotoModal)} 
              alt={activePhotoModal.title || ''} 
              style={{ 
                maxWidth: '95vw', 
                maxHeight: '80vh', 
                objectFit: 'contain', 
                borderRadius: '8px', 
                boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
                border: '1px solid rgba(255,255,255,0.1)'
              }} 
            />

            <h2 style={{ color: '#f8fafc', margin: '16px 0 0 0', fontSize: '1.4rem', fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
              {activePhotoModal.title || 'Cím nélküli alkotás'}
            </h2>
          </div>
        </div>
      )}

    </div>
  );
}
