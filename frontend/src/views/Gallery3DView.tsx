import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Navigation, BookOpen, MessageSquare, Send, X, Clock,
  Share2, Palette, Layers, Award, Calendar, RefreshCw, UploadCloud, Search, Filter
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
    icon: '',
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
    icon: '',
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
    icon: '',
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
    icon: '',
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
  const token = localStorage.getItem('photoAppToken') || localStorage.getItem('token') || localStorage.getItem('authToken');
  return {
    ...(token ? { 'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

const resolvePhotoUrl = (photo: any) => {
  if (!photo) return '';
  return getImageUrl(photo.drive_file_id, photo.file_url) || photo.file_url || '';
};

// 🎯 GOLYÓÁLLÓ EGYEDI KÉP-AZONOSÍTÓ GENERÁTOR
const getPhotoKey = (p: any) => {
  if (!p) return '';

  // 1. Elsődlegesen Google Drive ID ellenőrzése
  let driveId = p.drive_file_id || p.driveFileId;
  if (driveId && String(driveId).trim().length > 5) {
    return `drive_${String(driveId).trim()}`;
  }

  // 2. Másodlagosan URL kiértékelés (Google Drive kód kinyerése URL-ből ha van)
  const rawUrl = p.file_url || p.fileUrl || p.url || '';
  if (rawUrl && String(rawUrl).trim().length > 0) {
    const urlStr = String(rawUrl).trim();
    
    const driveMatch = urlStr.match(/\/d\/([a-zA-Z0-9_-]{10,})/) || urlStr.match(/id=([a-zA-Z0-9_-]{10,})/);
    if (driveMatch && driveMatch[1]) {
      return `drive_${driveMatch[1]}`;
    }

    // Cloudinary és egyéb webes URL-ek tisztítása (Verziószám és protokoll levágása)
    let clean = urlStr
      .replace(/^https?:\/\//i, '')
      .split('?')[0]
      .replace(/\/v\d+\//, '/')
      .toLowerCase()
      .trim();

    if (clean.length > 0) {
      return `url_${clean}`;
    }
  }

  // 3. Harmadlagosan adatbázis rekord azonosító
  if (p.id) return `id_${p.id}`;

  return '';
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

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    loader.load(url, (loaded) => {
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
    });

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
        <meshStandardMaterial color={themeConfig?.frameColor || '#090d16'} roughness={0.3} />
      </mesh>
      
      <mesh position={[0, 0, 0.061]}>
        <planeGeometry args={[passWidth, passHeight]} />
        <meshStandardMaterial color={themeConfig?.passColor || '#f8fafc'} roughness={0.9} />
      </mesh>

      <mesh onClick={onClick} position={[0, 0, 0.065]} style={{ cursor: 'pointer' }}>
        <planeGeometry args={[pWidth, pHeight]} />
        {texture ? <meshBasicMaterial map={texture} /> : <meshStandardMaterial color="#1e293b" />}
      </mesh>

      <group position={[0, labelYPosition, 0.065]}>
        <mesh position={[0, 0, -0.005]}>
          <planeGeometry args={[Math.max(1.8, pWidth * 0.8), 0.28]} />
          <meshStandardMaterial color={themeConfig?.skirtingColor || '#334155'} roughness={0.5} />
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
  const safePhotos = Array.isArray(photos) ? photos : [];
  const count = safePhotos.length;

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

      {safePhotos.map((photo, i) => {
        if (i >= wallPositions.length) return null;
        const photoUrl = photo.resolvedBase64Url || resolvePhotoUrl(photo);
        return (
          <ArtworkFrame
            key={photo.id || photo.drive_file_id || photoUrl || i}
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

  // KÖZVETLEN FOTÓ FELTÖLTÉS A PORTFÓLIÓBA
  const [inlineUploadTitle, setInlineUploadTitle] = useState('');
  const [inlineUploadFile, setInlineUploadFile] = useState<File | null>(null);
  const [inlineUploadPreview, setInlineUploadPreview] = useState<string | null>(null);
  const [isInlineUploading, setIsInlineUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // KERESŐ A PORTFÓLIÓ FOTÓKHOZ
  const [portfolioSearchTerm, setPortfolioSearchTerm] = useState('');

  // SZŰRŐ CSAK A KIJELÖLT KÉPEKRE A SZERKESZTŐBEN
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const [showInteractionsModal, setShowInteractionsModal] = useState(false);
  const [guestbookEntries, setGuestbookEntries] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [guestAuthorName, setGuestAuthorName] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);

  const [isPreloading, setIsPreloading] = useState<boolean>(false);
  const [preloadProgress, setPreloadProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  const controlsRef = useRef<any>(null);
  const [moveState, setMoveState] = useState({ forward: false, back: false, left: false, right: false });

  const userEmail = user?.email;

  const preloadGalleryPhotos = async (photos: any[]) => {
    const safePhotos = Array.isArray(photos) ? photos : [];
    if (safePhotos.length === 0) return [];

    setIsPreloading(true);
    setPreloadProgress({ current: 0, total: safePhotos.length });

    let loadedCount = 0;

    const preloaded = await Promise.all(
      safePhotos.map(async (photo) => {
        const rawUrl = resolvePhotoUrl(photo);
        const driveId = photo.drive_file_id;

        let proxyQuery = '';
        if (driveId) proxyQuery = `fileId=${encodeURIComponent(driveId)}`;
        else if (rawUrl) proxyQuery = `url=${encodeURIComponent(rawUrl)}`;

        let base64Url = rawUrl;
        if (proxyQuery) {
          try {
            const res = await fetch(`${BACKEND_URL}/api/public/image-proxy?${proxyQuery}`);
            if (res.ok) {
              const data = await res.json();
              if (data.base64) base64Url = data.base64;
            }
          } catch (e) {
            console.warn("Preload proxy hiba:", e);
          }
        }

        loadedCount++;
        setPreloadProgress({ current: loadedCount, total: safePhotos.length });

        return {
          ...photo,
          resolvedBase64Url: base64Url
        };
      })
    );

    setIsPreloading(false);
    return preloaded;
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetToken = urlParams.get('token') || urlParams.get('id');

    if (targetToken && (!userEmail || urlParams.get('public') === 'true')) {
      setIsPublicMode(true);
      setLoading(true);

      fetch(`${BACKEND_URL}/api/public/3d-gallery/${targetToken}`)
        .then(res => res.json())
        .then(async data => {
          if (data && !data.error) {
            setLoading(false);
            const preloadedPhotos = await preloadGalleryPhotos(data.photos || []);
            setActiveGallery({ ...data, photos: preloadedPhotos });
            setMode('VIEW_3D');
            loadInteractionsPublic(targetToken);
          } else {
            alert(data?.error || 'A kiállítás nem található vagy lejárt.');
            setMode('DIRECTORY');
            setLoading(false);
          }
        })
        .catch(err => {
          console.error("Hiba a public tárlat töltésekor:", err);
          setLoading(false);
        });
    } else {
      loadData();
    }
  }, [userEmail]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, portfolioRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/3d-galleries`, { headers: getAuthHeaders() }),
        fetch(`${BACKEND_URL}/api/my-album?userEmail=${encodeURIComponent(userEmail || '')}`, { headers: getAuthHeaders() })
      ]);

      let loadedGalleries: any[] = [];
      if (listRes.ok) {
        const data = await listRes.json();
        loadedGalleries = Array.isArray(data) ? data : [];
        setAllGalleries(loadedGalleries);
      } else {
        setAllGalleries([]);
      }

      if (portfolioRes.ok) {
        const pData = await portfolioRes.json();
        setMyPortfolioPhotos(Array.isArray(pData) ? pData : []);
      }

      const urlParams = new URLSearchParams(window.location.search);
      const targetToken = urlParams.get('token') || urlParams.get('id');
      if (targetToken && loadedGalleries.length > 0) {
        const targetGal = loadedGalleries.find((g: any) => String(g.share_token) === String(targetToken) || String(g.id) === String(targetToken));
        if (targetGal && !targetGal.is_expired) handleOpen3D(targetGal);
      }

    } catch (e) {
      console.error(e);
      setAllGalleries([]);
    } finally {
      setLoading(false);
    }
  };

  const loadInteractions = async (galleryId: number) => {
    setIsLoadingInteractions(true);
    setGuestbookEntries([]);
    try {
      const res = await fetch(`${BACKEND_URL}/api/3d-gallery/${galleryId}/interactions`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setGuestbookEntries(data.guestbook || []);
      }
    } catch (e) {
    } finally {
      setIsLoadingInteractions(false);
    }
  };

  const loadInteractionsPublic = async (token: string) => {
    setIsLoadingInteractions(true);
    setGuestbookEntries([]);
    try {
      const res = await fetch(`${BACKEND_URL}/api/public/3d-gallery/${token}/interactions`);
      if (res.ok) {
        const data = await res.json();
        setGuestbookEntries(data.guestbook || []);
      }
    } catch (e) {
    } finally {
      setIsLoadingInteractions(false);
    }
  };

  const handleOpen3D = async (gal: any) => {
    if (gal.is_expired) {
      alert("Ez a kiállítás lejárt! Hosszabbítsd meg 100 pontért az újraaktiváláshoz.");
      return;
    }
    const preloadedPhotos = await preloadGalleryPhotos(gal.photos || []);
    setActiveGallery({ ...gal, photos: preloadedPhotos });
    setMode('VIEW_3D');

    if (user) {
      try {
        await fetch(`${BACKEND_URL}/api/3d-gallery/${gal.id}/visit`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
      } catch (e) {}
      loadInteractions(gal.id);
    } else {
      loadInteractionsPublic(gal.share_token || gal.id);
    }
  };

  const handleExtendGallery = async (gal: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Biztosan meghosszabbítod ezt a 3D kiállítást 1 hónappal 100 pontért?\n(Cím: ${gal.title})`)) {
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/premium/3d-gallery/${gal.id}/extend`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Kiállítás sikeresen meghosszabbítva!');
        loadData();
      } else {
        alert(data.error || 'Hiba a hosszabbítás során.');
      }
    } catch (err) {
      alert('Hálózati hiba a hosszabbításkor.');
    }
  };

  const handlePostGuestbook = async () => {
    if (!newCommentText.trim() || !activeGallery) return;
    setIsPostingComment(true);

    try {
      if (user) {
        const res = await fetch(`${BACKEND_URL}/api/3d-gallery/${activeGallery.id}/guestbook`, {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ comment_text: newCommentText })
        });
        if (res.ok) {
          setNewCommentText('');
          loadInteractions(activeGallery.id);
        }
      } else {
        const tokenVal = activeGallery.share_token || activeGallery.id;
        const res = await fetch(`${BACKEND_URL}/api/public/3d-gallery/${tokenVal}/guestbook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment_text: newCommentText, guest_name: guestAuthorName || 'Vendég' })
        });
        if (res.ok) {
          setNewCommentText('');
          loadInteractionsPublic(tokenVal);
        }
      }
    } catch (e) {
      alert('Hiba a bejegyzés elküldésekor.');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleShareGallery = (gal: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const tokenVal = gal.share_token || gal.id;
    const shareUrl = `${window.location.origin}/3d_gallery?token=${tokenVal}&public=true`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => alert(lang === 'en' ? 'Public link copied!' : 'Titkosított megosztási link másolva a vágólapra!'))
        .catch(() => prompt(lang === 'en' ? 'Copy this link:' : 'Másold ki a hivatkozást:', shareUrl));
    } else {
      prompt(lang === 'en' ? 'Copy this link:' : 'Másold ki a hivatkozást:', shareUrl);
    }
  };

  const handleStartNewGallery = () => {
    setEditingGalleryId(null);
    setGalleryTitle('Új Virtuális Kiállításom');
    setGalleryTheme('modern');
    setVisibility('public');
    setMaxAllowedPhotos(10);
    setSelectedPhotos([]);
    setPortfolioSearchTerm('');
    setShowSelectedOnly(false);
    setMode('EDIT');
  };

  const handleEditGallery = (gal: any) => {
    setEditingGalleryId(gal.id);
    setGalleryTitle(gal.title || 'Virtuális Kiállítás');
    setGalleryTheme(gal.theme || 'modern');
    setVisibility(gal.visibility || 'public');
    const pCount = gal.photos?.length || 0;
    setMaxAllowedPhotos(pCount > 20 ? 30 : pCount > 10 ? 20 : 10);
    setSelectedPhotos(gal.photos || []);
    setPortfolioSearchTerm('');
    setShowSelectedOnly(false);
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
        alert('Tárlat törölve.');
        loadData();
      }
    } catch (e) {
      alert('Hálózati hiba.');
    }
  };

  const toggleSelectPhoto = (photo: any) => {
    const photoKey = getPhotoKey(photo);
    if (!photoKey) return;

    const isAlreadySelected = selectedPhotos.some(p => getPhotoKey(p) === photoKey);

    if (isAlreadySelected) {
      setSelectedPhotos(prev => prev.filter(p => getPhotoKey(p) !== photoKey));
    } else {
      if (selectedPhotos.length >= maxAllowedPhotos) {
        return alert(`A jelenleg kiválasztott csomagban legfeljebb ${maxAllowedPhotos} fotót választhatsz ki! Válts nagyobb csomagra fentebb, ha többet szeretnél.`);
      }
      const photoUrl = resolvePhotoUrl(photo);
      const initialTitle = photo.title || photo.title_hu || '';
      setSelectedPhotos(prev => [...prev, { 
        id: photo.id, 
        drive_file_id: photo.drive_file_id || photo.driveFileId || '', 
        file_url: photoUrl, 
        title: initialTitle 
      }]);
    }
  };

  const updatePhotoTitle = (photoKey: string, newTitle: string) => {
    setSelectedPhotos(prev => prev.map(p => getPhotoKey(p) === photoKey ? { ...p, title: newTitle } : p));
  };

  // KÖZVETLEN FELTÖLTÉS A PORTFÓLIÓBA A TÁRLATSZERKESZTŐBŐL
  const handleInlineUploadToPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineUploadFile || !inlineUploadTitle.trim()) {
      return alert('Kérlek add meg a kép címét és válaszd ki a fotó fájlt!');
    }

    setIsInlineUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', inlineUploadFile);
      formData.append('userEmail', user?.email || '');
      formData.append('userName', user?.name || '');
      formData.append('title', inlineUploadTitle.trim());

      const res = await fetch(`${BACKEND_URL}/api/my-album/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      if (res.ok) {
        const uploadedData = await res.json();
        
        // Portfólió frissítése a háttérben
        const portfolioRes = await fetch(`${BACKEND_URL}/api/my-album?userEmail=${encodeURIComponent(user?.email || '')}`, { headers: getAuthHeaders() });
        if (portfolioRes.ok) {
          const freshPortfolio = await portfolioRes.json();
          setMyPortfolioPhotos(Array.isArray(freshPortfolio) ? freshPortfolio : []);
          
          const newPhoto = freshPortfolio.find((p: any) => p.file_url === uploadedData.file_url || p.title === inlineUploadTitle.trim()) || uploadedData;
          
          if (newPhoto) {
            if (selectedPhotos.length < maxAllowedPhotos) {
              const photoUrl = resolvePhotoUrl(newPhoto);
              setSelectedPhotos(prev => [...prev, { 
                id: newPhoto.id, 
                drive_file_id: newPhoto.drive_file_id || newPhoto.driveFileId || '', 
                file_url: photoUrl, 
                title: inlineUploadTitle.trim() 
              }]);
              alert('Kép sikeresen feltöltve a Portfóliódba és hozzáadva a 3D kiállításhoz!');
            } else {
              alert(`Kép sikeresen feltöltve a Portfóliódba! Viszont a 3D kiállításod megtelt (Max. ${maxAllowedPhotos} kép), így a kiállításba nem került be automatikusan.`);
            }
          }
        }

        setInlineUploadFile(null);
        setInlineUploadPreview(null);
        setInlineUploadTitle('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Hiba a kép feltöltése során.');
      }
    } catch (err) {
      alert('Hálózati hiba a feltöltéskor.');
    } finally {
      setIsInlineUploading(false);
    }
  };

  const handleSave = async () => {
    if (selectedPhotos.length === 0) return alert('Kérlek válassz ki legalább 1 fotót!');

    setIsSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/premium/3d-gallery/save`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id: editingGalleryId, title: galleryTitle, theme: galleryTheme, visibility, photos: selectedPhotos })
      });

      const data = await res.json();

      if (res.ok) {
        await loadData();
        setMode('DIRECTORY');
        if (data.deductedPoints > 0) {
          alert(`Kiállítás elmentve! ${data.deductedPoints} pont levonásra került a számládról.`);
        } else {
          alert('Kiállítás sikeresen elmentve!');
        }
      } else {
        alert(data.error || 'Hiba a mentés során.');
      }
    } catch (e) {
      alert('Hálózati hiba.');
    } finally {
      setIsSaving(false);
    }
  };

  // 🎯 GOLYÓÁLLÓ KLIENSOLDALI SZŰRÉS (Összefésüli a portfóliót és a kiválasztott képeket)
  const filteredPortfolioPhotos = useMemo(() => {
    const combinedMap = new Map<string, any>();

    (myPortfolioPhotos || []).forEach(p => {
      const k = getPhotoKey(p);
      if (k) combinedMap.set(k, p);
    });

    (selectedPhotos || []).forEach(sp => {
      const k = getPhotoKey(sp);
      if (k && !combinedMap.has(k)) {
        combinedMap.set(k, sp);
      }
    });

    let list = Array.from(combinedMap.values());

    if (showSelectedOnly) {
      const selectedKeys = new Set(selectedPhotos.map(p => getPhotoKey(p)).filter(Boolean));
      list = list.filter(photo => selectedKeys.has(getPhotoKey(photo)));
    }

    if (!portfolioSearchTerm.trim()) return list;
    const term = portfolioSearchTerm.toLowerCase();
    return list.filter((photo: any) => 
      (photo.title && String(photo.title).toLowerCase().includes(term)) ||
      (photo.title_hu && String(photo.title_hu).toLowerCase().includes(term)) ||
      (photo.ai_tags && String(photo.ai_tags).toLowerCase().includes(term)) ||
      (photo.tags && String(photo.tags).toLowerCase().includes(term))
    );
  }, [myPortfolioPhotos, portfolioSearchTerm, showSelectedOnly, selectedPhotos]);

  const safeGalleries = Array.isArray(allGalleries) ? allGalleries : [];
  const activeGalleriesList = safeGalleries.filter(g => !g.is_expired);
  const expiredGalleriesList = safeGalleries.filter(g => g.is_expired);

  if (loading) return <VideoLoader />;

  const progressPercent = preloadProgress.total > 0 ? Math.min(100, Math.round((preloadProgress.current / preloadProgress.total) * 100)) : 100;

  const formatDateString = (dStr: string | null) => {
    if (!dStr) return '-';
    try {
      return new Date(dStr).toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
      return dStr;
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: isPublicMode ? '100vw' : '1200px', margin: '0 auto', padding: isPublicMode ? '0' : '10px' }}>
      
      {!isPublicMode && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-main)', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Box size={28} /> {viewMode === 'VIEW_3D' ? activeGallery?.title : 'Virtuális 3D Tárlatok'}
            </h2>
            <small style={{ color: 'var(--text-muted)' }}>
              {viewMode === 'VIEW_3D' ? `Kiállító: ${activeGallery?.photographer_name || 'Fotóművész'}` : 'Böngéssz a fotóművészek kiállítótermeiben'}
            </small>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {viewMode === 'VIEW_3D' && activeGallery && (
              <>
                <button 
                  onClick={() => handleShareGallery(activeGallery)} 
                  style={{ background: 'var(--bg-main)', color: '#38bdf8', border: '1px solid var(--border-main)', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Share2 size={16} /> Megosztási Link
                </button>

                <button 
                  onClick={() => {
                    if (activeGallery) {
                      if (user) {
                        loadInteractions(activeGallery.id);
                      } else {
                        loadInteractionsPublic(activeGallery.share_token || activeGallery.id);
                      }
                    }
                    setShowInteractionsModal(true);
                  }} 
                  style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <BookOpen size={16} /> Vendégkönyv ({guestbookEntries.length})
                </button>
              </>
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
              <button 
                onClick={() => window.location.href = '/packages'}
                title="Kattints ide a prémium csomagok megtekintéséhez!"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.25))', 
                  color: '#fbbf24', 
                  border: '1px solid rgba(251,191,36,0.4)', 
                  padding: '8px 14px', 
                  borderRadius: '8px', 
                  fontSize: '0.8rem', 
                  fontWeight: 'bold', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Sparkles size={14} /> Saját 3D kiállítás a Prémium tagoknak ➔
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. KATALÓGUS NÉZET */}
      {viewMode === 'DIRECTORY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* AKTÍV KIÁLLÍTÁSOK */}
          <div>
            <h3 style={{ color: '#f8fafc', margin: '0 0 16px 0', fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={20} color="#38bdf8" /> Aktív 3D Kiállítások
            </h3>

            {activeGalleriesList.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-main)', color: 'var(--text-muted)' }}>
                <h4 style={{ color: 'var(--text-title)', margin: '0 0 6px 0' }}>Még nincsenek aktív publikált kiállítások.</h4>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Légy te az első, aki berendezi a virtuális 3D tárlatát!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {activeGalleriesList.map((gal) => {
                  if (!gal) return null;
                  const photoList = Array.isArray(gal.photos) ? gal.photos : [];
                  const coverUrl = resolvePhotoUrl(photoList[0]);
                  const isMine = (gal.user_email && user?.email && gal.user_email.toLowerCase() === user.email.toLowerCase()) || user?.isAdmin;
                  const themeObj = GALLERY_THEMES[gal.theme || 'modern'] || GALLERY_THEMES.modern;
                  const photoCount = photoList.length;

                  return (
                    <div key={gal.id || Math.random()} style={{ background: 'var(--bg-card)', border: isMine ? '2px solid #a78bfa' : '1px solid var(--border-main)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      
                      <div style={{ height: '180px', background: '#090d16', position: 'relative' }}>
                        <img src={coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        
                        <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}>
                          <span style={{ background: 'rgba(15,23,42,0.85)', padding: '3px 8px', borderRadius: '20px', fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Eye size={12} color="#38bdf8" /> {gal.visitor_count || 0}
                          </span>
                          <span style={{ background: 'rgba(15,23,42,0.85)', padding: '3px 8px', borderRadius: '20px', fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MessageSquare size={12} color="#a78bfa" /> {gal.comment_count || 0}
                          </span>
                        </div>

                        <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
                          <span style={{ background: 'rgba(15,23,42,0.85)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', color: '#a78bfa' }}>
                            {themeObj?.name}
                          </span>
                          <span style={{ background: 'rgba(15,23,42,0.85)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', color: gal.visibility === 'club' ? '#f59e0b' : '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {gal.visibility === 'club' ? <><Users size={12} /> Klub</> : <><Globe size={12} /> Publikus</>}
                          </span>
                        </div>

                        <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(15,23,42,0.9)', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', color: '#f59e0b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Layers size={12} /> {photoCount} Fotó
                        </div>

                        {gal.expires_at && (
                          <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(15,23,42,0.9)', padding: '3px 10px', borderRadius: '6px', fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={11} color="#10b981" /> Lejár: {formatDateString(gal.expires_at)}
                          </div>
                        )}
                      </div>

                      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-title)', fontSize: '1.2rem' }}>{gal.title || '3D Tárlat'}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <img src={gal.avatar_url || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23475569'><circle cx='12' cy='8' r='4'/><path d='M12 14c-6.1 0-10 4-10 4v2h20v-2s-3.9-4-10-4z'/></svg>"} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-title)' }}>{gal.photographer_name || 'Fotóművész'}</div>
                              {gal.club_name && <div style={{ fontSize: '0.75rem', color: '#10b981' }}>{gal.club_name}</div>}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={() => handleOpen3D(gal)}
                              style={{ flex: 1, background: '#a78bfa', color: '#0f172a', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                              <Eye size={16} /> Bejárás ({photoCount} kép)
                            </button>

                            <button 
                              onClick={(e) => handleShareGallery(gal, e)} 
                              style={{ background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: '#38bdf8', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Share2 size={16} />
                            </button>
                          </div>

                          {isMine && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <button onClick={() => handleEditGallery(gal)} style={{ flex: 1, background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: '#38bdf8', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <Edit3 size={14} /> Szerkesztés
                              </button>
                              <button onClick={(e) => handleExtendGallery(gal, e)} style={{ flex: 1, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} title="Meghosszabbítás +1 hónappal 100 pontért">
                                <RefreshCw size={14} /> +1hó (100p)
                              </button>
                              <button onClick={() => handleDeleteGallery(gal.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Trash2 size={14} />
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

          {/* LEJÁRT / INAKTÍV TÁRLATOK (CSAK A TULAJDONOSNAK) */}
          {expiredGalleriesList.length > 0 && (
            <div style={{ borderTop: '1px dashed var(--border-main)', paddingTop: '24px', marginTop: '10px' }}>
              <h3 style={{ color: '#ef4444', margin: '0 0 16px 0', fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} color="#ef4444" /> Lejárt / Inaktív Tárlatjaim (Csak te látod)
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {expiredGalleriesList.map((gal) => {
                  const photoList = Array.isArray(gal.photos) ? gal.photos : [];
                  const coverUrl = resolvePhotoUrl(photoList[0]);

                  return (
                    <div key={gal.id} style={{ background: 'var(--bg-card)', border: '2px solid #ef4444', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: 0.95 }}>
                      <div style={{ height: '160px', background: '#090d16', position: 'relative' }}>
                        <img src={coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.6)' }} />
                        <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#ef4444', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          🔴 LEJÁRT
                        </div>
                        <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(15,23,42,0.9)', padding: '3px 10px', borderRadius: '6px', fontSize: '0.72rem', color: '#f87171', fontWeight: 'bold' }}>
                          Lejárt: {formatDateString(gal.expires_at)}
                        </div>
                      </div>

                      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-title)', fontSize: '1.1rem' }}>{gal.title}</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0 0 12px 0' }}>
                            Ez a kiállítás lejárt, így jelenleg a látogatók nem érhetik el.
                          </p>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={(e) => handleExtendGallery(gal, e)}
                            style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.9rem' }}
                          >
                            <RefreshCw size={16} /> Újraaktiválás 100 pontért
                          </button>
                          <button 
                            onClick={() => handleDeleteGallery(gal.id)} 
                            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* 2. 3D MEGTEKINTŐ NÉZET */}
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

          {isPreloading && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: '#020617',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#a78bfa', fontSize: '1.4rem', fontWeight: 900 }}>
                Kiállítás Berendezése...
              </h3>
              <p style={{ margin: '0 0 20px 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                Fotók előkészítése ({preloadProgress.current} / {preloadProgress.total})
              </p>

              <div style={{ width: '260px', height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, #a78bfa, #38bdf8)',
                  transition: 'width 0.2s ease-out'
                }} />
              </div>
            </div>
          )}
          
          <Canvas camera={{ position: [0, 0.6, 5], fov: 60 }}>
            <WalkingController moveState={moveState} controlsRef={controlsRef} photoCount={Array.isArray(activeGallery.photos) ? activeGallery.photos.length : 10} />
            <GalleryRoom 
              photos={Array.isArray(activeGallery.photos) ? activeGallery.photos : []} 
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

          <div style={{ position: 'absolute', top: '15px', left: '15px', background: 'rgba(9, 13, 22, 0.85)', padding: '12px 20px', borderRadius: '12px', color: 'white', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#a78bfa', fontWeight: '900' }}>{activeGallery.title}</h3>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '2px' }}>
              Kiállító fotóművész: <b>{activeGallery.photographer_name || 'Fotóművész'}</b>
            </div>
          </div>

          <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => {
                if (activeGallery) {
                  if (user) {
                    loadInteractions(activeGallery.id);
                  } else {
                    loadInteractionsPublic(activeGallery.share_token || activeGallery.id);
                  }
                }
                setShowInteractionsModal(true);
              }} 
              style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(139,92,246,0.4)', backdropFilter: 'blur(6px)' }}
            >
              <BookOpen size={16} /> Vendégkönyv ({guestbookEntries.length})
            </button>
          </div>

          <div style={{ position: 'absolute', bottom: '15px', left: '15px', background: 'rgba(9, 13, 22, 0.85)', padding: '10px 16px', borderRadius: '8px', color: 'white', fontSize: '0.8rem', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a78bfa', fontWeight: 'bold' }}>
              <Navigation size={14} /> <span>Irányítás & Séta:</span>
            </div>
            <div><b>W, A, S, D / Nyilak:</b> Séta a teremben</div>
            <div><b>Egér / Érintés:</b> Forgás | <b>Kattints a képre</b> a nagyításhoz!</div>
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

      {/* VENDÉGKÖNYV MODÁL */}
      {showInteractionsModal && (
        <div onClick={() => setShowInteractionsModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', width: '100%', maxWidth: '650px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1rem' }}><MessageSquare size={18} color="#a78bfa" /> Kiállítási Vendégkönyv ({guestbookEntries.length})</span>
              </div>
              <button onClick={() => setShowInteractionsModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {!user && (
                <input 
                  type="text" 
                  placeholder="Neved / Beceneved (opcionális)..." 
                  value={guestAuthorName} 
                  onChange={e => setGuestAuthorName(e.target.value)} 
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', outline: 'none', fontSize: '0.9rem' }} 
                />
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" placeholder="Írj a vendégkönyvbe..." value={newCommentText} onChange={e => setNewCommentText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handlePostGuestbook(); }} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', outline: 'none' }} />
                <button onClick={handlePostGuestbook} disabled={isPostingComment || !newCommentText.trim()} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Send size={16} /> Küldés</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                {isLoadingInteractions ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#a78bfa', fontSize: '0.95rem' }}>
                    Vendégkönyvi bejegyzések betöltése...
                  </div>
                ) : guestbookEntries.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Még nincsenek bejegyzések. Írj te először a vendégkönyvbe!
                  </div>
                ) : (
                  guestbookEntries.map((e) => (
                    <div key={e.id} style={{ background: 'var(--bg-main)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-main)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '0.9rem', color: '#38bdf8' }}>{e.user_name}</strong>
                        <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          {new Date(e.created_at).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </small>
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-body)', fontSize: '0.88rem', lineHeight: '1.4' }}>{e.comment_text}</p>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 3. SZERKESZTŐ MÓD */}
      {viewMode === 'EDIT' && (
        <div style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '12px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* PUBLIKÁLÁS GOMB ÉS VEZÉRLŐSÁV A SZERKESZTŐ TETEJÉN */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '16px 20px', borderRadius: '10px', border: '1px solid var(--border-main)', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                onClick={() => setMode('DIRECTORY')} 
                style={{ background: 'transparent', border: '1px solid var(--border-main)', color: 'var(--text-muted)', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={16} /> Mégse
              </button>
              <span style={{ color: 'var(--text-title)', fontWeight: 'bold', fontSize: '1.05rem' }}>
                {editingGalleryId ? 'Kiállítás Szerkesztése' : 'Új Kiállítás Létrehozása'}
              </span>
            </div>

            <button 
              onClick={handleSave} 
              disabled={isSaving || selectedPhotos.length === 0} 
              style={{ background: selectedPhotos.length > 0 ? '#10b981' : 'var(--border-main)', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: selectedPhotos.length > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: selectedPhotos.length > 0 ? '0 4px 15px rgba(16,185,129,0.3)' : 'none' }}
            >
              <Save size={18} /> {isSaving ? 'Mentés...' : '3D Kiállítás Publikálása'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text-title)', fontWeight: 'bold', marginBottom: '8px' }}>Kiállítás Címe:</label>
              <input type="text" value={galleryTitle} onChange={e => setGalleryTitle(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', fontSize: '1rem', outline: 'none' }} />
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-title)', fontWeight: 'bold', marginBottom: '8px' }}>Láthatóság:</label>
              <select value={visibility} onChange={e => setVisibility(e.target.value as any)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', fontSize: '1rem', outline: 'none' }}>
                <option value="public">Publikus (Mindenki láthatja)</option>
                <option value="club">Klub (Csak a fotóklubom tagjai)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--text-title)', fontWeight: 'bold', marginBottom: '10px' }}>
              <Award size={16} inline /> Válassz Kiállítási Csomagot (Fotók száma & Tér):
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
              <div onClick={() => { setMaxAllowedPhotos(10); if (selectedPhotos.length > 10) setSelectedPhotos(prev => prev.slice(0, 10)); }} style={{ padding: '16px', borderRadius: '10px', border: maxAllowedPhotos === 10 ? '2px solid #a78bfa' : '1px solid var(--border-main)', background: maxAllowedPhotos === 10 ? 'rgba(167,139,250,0.1)' : 'var(--bg-main)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ color: 'var(--text-title)', fontSize: '1.05rem' }}>Alap Galéria</strong>
                  <span style={{ background: '#10b98120', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>0 Pont / Ingyenes</span>
                </div>
                <small style={{ color: 'var(--text-muted)' }}>1 Terem • Max. 10 fotó elhelyezése</small>
              </div>

              <div onClick={() => { setMaxAllowedPhotos(20); }} style={{ padding: '16px', borderRadius: '10px', border: maxAllowedPhotos === 20 ? '2px solid #a78bfa' : '1px solid var(--border-main)', background: maxAllowedPhotos === 20 ? 'rgba(167,139,250,0.1)' : 'var(--bg-main)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ color: 'var(--text-title)', fontSize: '1.05rem' }}>Kétszárnyú Tárlat</strong>
                  <span style={{ background: '#f59e0b20', color: '#f59e0b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>200 Pont</span>
                </div>
                <small style={{ color: 'var(--text-muted)' }}>2 Terem (Átjáróval) • Max. 20 fotó</small>
              </div>

              <div onClick={() => { setMaxAllowedPhotos(30); }} style={{ padding: '16px', borderRadius: '10px', border: maxAllowedPhotos === 30 ? '2px solid #a78bfa' : '1px solid var(--border-main)', background: maxAllowedPhotos === 30 ? 'rgba(167,139,250,0.1)' : 'var(--bg-main)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ color: 'var(--text-title)', fontSize: '1.05rem' }}>Nagy Kiállítócsarnok</strong>
                  <span style={{ background: '#ef444420', color: '#ef4444', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>400 Pont</span>
                </div>
                <small style={{ color: 'var(--text-muted)' }}>3 Múzeumi Szárny • Max. 30 fotó</small>
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--text-title)', fontWeight: 'bold', marginBottom: '10px' }}>
              <Palette size={16} inline /> Kiállítóterem Stílusa & Hangulata:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {Object.keys(GALLERY_THEMES).map((key) => {
                const theme = GALLERY_THEMES[key];
                const isSelected = galleryTheme === key;
                return (
                  <div key={key} onClick={() => setGalleryTheme(key)} style={{ padding: '14px', borderRadius: '10px', border: isSelected ? '2px solid #a78bfa' : '1px solid var(--border-main)', background: isSelected ? 'rgba(167,139,250,0.1)' : 'var(--bg-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <strong style={{ color: 'var(--text-title)', fontSize: '0.9rem' }}>{theme.name}</strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* KÖZVETLEN FELTÖLTÉS A PORTFÓLIÓBA */}
          <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(56,189,248,0.3)' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#38bdf8', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UploadCloud size={20} /> Új fotó feltöltése a Portfóliódba közvetlenül innen
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 14px 0' }}>
              Nem kell átmenned a Portfólió menüpontba: töltsd fel a képedet itt, és a rendszer automatikusan beteszi a portfóliódba és kiválasztja ehhez a 3D kiállításhoz!
            </p>

            <form onSubmit={handleInlineUploadToPortfolio} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', color: 'var(--text-title)', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>Fotó Címe *</label>
                <input 
                  type="text" 
                  value={inlineUploadTitle} 
                  onChange={e => setInlineUploadTitle(e.target.value)} 
                  placeholder="pl. Naplemente a tengeren" 
                  required 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-title)', outline: 'none' }}
                />
              </div>

              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', color: 'var(--text-title)', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>Kép kiválasztása *</label>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setInlineUploadFile(file);
                      setInlineUploadPreview(URL.createObjectURL(file));
                    }
                  }} 
                  required 
                  style={{ width: '100%', color: 'var(--text-title)', fontSize: '0.85rem' }}
                />
              </div>

              <button 
                type="submit" 
                disabled={isInlineUploading || !inlineUploadFile || !inlineUploadTitle.trim()} 
                style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', height: '40px', opacity: isInlineUploading || !inlineUploadFile ? 0.6 : 1 }}
              >
                {isInlineUploading ? 'Feltöltés...' : 'Kép feltöltése & Hozzáadása'}
              </button>
            </form>

            {inlineUploadPreview && (
              <div style={{ marginTop: '12px', textAlign: 'left' }}>
                <img src={inlineUploadPreview} alt="" style={{ height: '80px', borderRadius: '6px', border: '1px solid var(--border-main)' }} />
              </div>
            )}
          </div>

          {/* PORTFÓLIÓ FOTÓK SZEKCIÓ KERESŐVEL ÉS SZŰRŐVEL */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
              <div>
                <h3 style={{ color: 'var(--text-title)', margin: 0, fontSize: '1.15rem' }}>Válassz ki fotókat a Portfóliódból:</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                  Kiválasztva: <b style={{ color: selectedPhotos.length >= maxAllowedPhotos ? '#ef4444' : '#10b981' }}>{selectedPhotos.length}</b> / {maxAllowedPhotos} fotó
                  {selectedPhotos.length >= maxAllowedPhotos && (
                    <span style={{ color: '#ef4444', marginLeft: '10px', fontWeight: 'bold' }}>⚠️ A kiállításod megtelt! Új kép kiválasztásához törölj egyet a kijelöltek közül.</span>
                  )}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* SZŰRŐ GOMB A KIVÁLASZTOTT KÉPEKRE */}
                <button 
                  type="button"
                  onClick={() => setShowSelectedOnly(prev => !prev)}
                  style={{
                    background: showSelectedOnly ? '#10b981' : 'var(--bg-main)',
                    color: showSelectedOnly ? '#ffffff' : 'var(--text-title)',
                    border: `1px solid ${showSelectedOnly ? '#10b981' : 'var(--border-main)'}`,
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Filter size={15} /> {showSelectedOnly ? 'Összes fotó mutatása' : `Kiválasztottak (${selectedPhotos.length})`}
                </button>

                {/* KERESŐ SÁV A FOTÓKHOZ */}
                <div style={{ position: 'relative', minWidth: '240px' }}>
                  <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    placeholder="🔍 Keresés cím vagy AI tag alapján..." 
                    value={portfolioSearchTerm} 
                    onChange={e => setPortfolioSearchTerm(e.target.value)} 
                    style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', outline: 'none', fontSize: '0.88rem', boxSizing: 'border-box' }} 
                  />
                </div>
              </div>
            </div>
            
            {myPortfolioPhotos.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', background: 'var(--bg-main)', borderRadius: '8px', border: '1px dashed var(--border-main)', color: 'var(--text-muted)' }}>Még nincs feltöltött fotód a Portfóliódban. Tölts fel egyet fentebb!</div>
            ) : filteredPortfolioPhotos.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', background: 'var(--bg-main)', borderRadius: '8px', border: '1px dashed var(--border-main)', color: 'var(--text-muted)' }}>
                {showSelectedOnly ? 'Egyetlen fotó sincs még kiválasztva a 3D kiállításhoz.' : 'Egyetlen fotó sem felel meg a keresési feltételnek.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
                {filteredPortfolioPhotos.map((photo, idx) => {
                  const photoKey = getPhotoKey(photo);
                  const selectedObj = selectedPhotos.find(p => getPhotoKey(p) === photoKey);
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

      {/* LIGHTBOX MODÁL */}
      {activePhotoModal && (
        <div 
          onClick={() => setActivePhotoModal(null)} 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(2, 6, 23, 0.96)', 
            backdropFilter: 'blur(12px)', 
            zIndex: 999999, 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: '10px',
            boxSizing: 'border-box'
          }}
        >
          <button 
            onClick={() => setActivePhotoModal(null)}
            style={{ 
              position: 'absolute', 
              top: '15px', 
              right: '15px', 
              background: 'rgba(0, 0, 0, 0.6)', 
              color: 'white', 
              border: '1px solid rgba(255,255,255,0.3)', 
              borderRadius: '50%', 
              width: '48px', 
              height: '48px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              zIndex: 1000000 
            }}
          >
            <X size={28} />
          </button>

          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              width: '98vw', 
              height: '96vh', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            <img 
              src={resolvePhotoUrl(activePhotoModal)} 
              alt={activePhotoModal.title || ''} 
              style={{ 
                width: '100%',
                height: '100%',
                maxWidth: '98vw', 
                maxHeight: '92vh', 
                objectFit: 'contain', 
                borderRadius: '4px', 
                boxShadow: '0 25px 60px rgba(0,0,0,0.9)'
              }} 
            />

            {activePhotoModal.title && (
              <h2 style={{ 
                color: '#f8fafc', 
                margin: '8px 0 0 0', 
                fontSize: '1.2rem', 
                fontWeight: 800, 
                textShadow: '0 2px 10px rgba(0,0,0,0.9)',
                textAlign: 'center'
              }}>
                {activePhotoModal.title}
              </h2>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
