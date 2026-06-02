import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { BACKEND_URL, ADMIN_EMAIL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';

// ==========================================
// 🔑 A Google Maps API kulcsod
// ==========================================
const GOOGLE_MAPS_API_KEY = "AIzaSyDakZMXvQgw523qNu9htsvW5J2gPPdZUUM";

const containerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 47.4979, lng: 19.0402 };

interface MapSpotsViewProps {
  user: any;
  setFullscreenData: (data: any) => void;
  targetMapSpotId?: number | null;
  setTargetMapSpotId?: (id: number | null) => void;import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { BACKEND_URL, ADMIN_EMAIL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';
import exifr from 'exifr'; // <-- ÚJ: Az EXIF adatok kiolvasásához!

// ==========================================
// 🔑 A Google Maps API kulcsod
// ==========================================
const GOOGLE_MAPS_API_KEY = "AIzaSyDakZMXvQgw523qNu9htsvW5J2gPPdZUUM";

const containerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 47.4979, lng: 19.0402 };

interface MapSpotsViewProps {
  user: any;
  setFullscreenData: (data: any) => void;
  targetMapSpotId?: number | null;
  setTargetMapSpotId?: (id: number | null) => void;
}

export default function MapSpotsView({ user, setFullscreenData, targetMapSpotId, setTargetMapSpotId }: MapSpotsViewProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const [map, setMap] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState<any[]>([]);
  
  const [mapTargetPosition, setMapTargetPosition] = useState<{lat: number, lng: number}>(defaultCenter);
  const [mapZoom, setMapZoom] = useState<number>(7);

  const [newSpotLatLng, setNewSpotLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [editingSpot, setEditingSpot] = useState<any | null>(null);
  const [activeSpot, setActiveSpot] = useState<any | null>(null);

  const [mapTheme, setMapTheme] = useState<'roadmap' | 'hybrid'>('roadmap');

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [commentPreview, setCommentPreview] = useState<string | null>(null);

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [uploadMonth, setUploadMonth] = useState('');
  const [uploadTimeOfDay, setUploadTimeOfDay] = useState('');
  const [uploadCamera, setUploadCamera] = useState('');
  const [uploadLens, setUploadLens] = useState('');

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };
  const isAdmin = user?.email === ADMIN_EMAIL; 

  const fetchLocations = async (search = '') => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/locations?search=${encodeURIComponent(search)}&userEmail=${user.email}`);
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
        setActiveSpot(prev => {
          if (!prev) return null;
          const updatedSpot = data.find((d: any) => d.id === prev.id);
          return updatedSpot ? updatedSpot : prev;
        });
      }
    } catch (e) { console.error(e); }
  };

  const fetchComments = async (locationId: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/locations/${locationId}/comments`);
      if (res.ok) setComments(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (map && mapTargetPosition) {
      map.panTo(mapTargetPosition);
    }
  }, [mapTargetPosition, map]);

  useEffect(() => {
    if (targetMapSpotId && locations.length > 0) {
      const spotToOpen = locations.find(loc => loc.id === targetMapSpotId);
      if (spotToOpen) {
        setActiveSpot(spotToOpen);
        const pos = { lat: parseFloat(spotToOpen.lat), lng: parseFloat(spotToOpen.lng) };
        setMapTargetPosition(pos);
        setMapZoom(14);
        if (setTargetMapSpotId) setTargetMapSpotId(null); 
      }
    }
  }, [targetMapSpotId, locations, map]);
  
  useEffect(() => { fetchLocations(searchQuery); }, [searchQuery]);

  useEffect(() => {
    if (activeSpot) { fetchComments(activeSpot.id); } 
    else { setComments([]); setNewComment(''); setCommentFile(null); setCommentPreview(null); }
  }, [activeSpot?.id]);

  const handleCitySearch = async () => {
    if (!citySearch.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(citySearch)}&limit=5`);
      const data = await res.json();
      setCityResults(data);
      if (data.length === 0) alert("Nem található ilyen hely!");
    } catch (e) { console.error(e); }
  };

  const handleSelectCity = (lat: string, lon: string) => {
    setMapTargetPosition({ lat: parseFloat(lat), lng: parseFloat(lon) });
    setMapZoom(13);
    setCityResults([]); 
    setCitySearch(''); 
  };

  const handleMapClick = (e: any) => {
    if (!e.latLng) return;
    const clickedLat = e.latLng.lat();
    const clickedLng = e.latLng.lng();

    setEditingSpot(null);
    setNewSpotLatLng({ lat: clickedLat, lng: clickedLng });
    setUploadTitle('');
    setUploadDesc('');
    setUploadFile(null);
    setUploadPreview(null);
    setActiveSpot(null); 
    setUploadMonth('');
    setUploadTimeOfDay('');
    setUploadCamera('');
    setUploadLens('');
  };

  const handleStartEdit = (loc: any) => {
    setNewSpotLatLng(null);
    setActiveSpot(null); 
    setEditingSpot(loc);
    setUploadTitle(loc.title);
    setUploadDesc(loc.description);
    setUploadFile(null);
    setUploadPreview(getImageUrl(loc.drive_file_id, loc.file_url));
    setMapTargetPosition({ lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) });
    setMapZoom(14);
    setUploadMonth(loc.photo_month || '');
    setUploadTimeOfDay(loc.photo_time_of_day || '');
    setUploadCamera(loc.camera || '');
    setUploadLens(loc.lens || '');
  };

  const handleMarkerDragEnd = async (id: number, e: any) => {
    if (!e.latLng) return;

    const currentSpot = locations.find(loc => loc.id === id);
    const spotTitle = currentSpot ? `"${currentSpot.title}"` : 'ezt a helyszínt';

    if (!window.confirm(`Biztosan át szeretnéd mozgatni ${spotTitle} gombostűjét az új koordinátákra?`)) {
      fetchLocations(searchQuery);
      return;
    }

    const safeLat = e.latLng.lat().toFixed(8);
    const safeLng = e.latLng.lng().toFixed(8);

    setLocations(prev => prev.map(loc => loc.id === id ? { ...loc, lat: safeLat, lng: safeLng } : loc));
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email, isAdmin: isAdmin, lat: safeLat, lng: safeLng })
      });
      if (!res.ok) { 
        alert('Mentés sikertelen!'); 
        fetchLocations(searchQuery); 
      }
    } catch (error) { 
      alert("Hálózati hiba!"); 
      fetchLocations(searchQuery); 
    }
  };

  // JAVÍTVA: AUTOMATIKUS EXIF ADATOLVASÁS KÉPVÁLASZTÁSKOR!
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadFile(file);
      setUploadPreview(URL.createObjectURL(file));

      // Csak új rögzítésnél vagy tiszta feltöltésnél írjuk felül (szerkesztésnél ne bántsa a már meglévőt)
      try {
        const exifData = await exifr.parse(file, ['Make', 'Model', 'LensModel', 'DateTimeOriginal']);
        
        if (exifData) {
          // 1. Kamera váz összeállítása (pl. Sony + ILCE-7M4 -> Sony ILCE-7M4)
          if (exifData.Model) {
            const makePrefix = exifData.Make && !exifData.Model.startsWith(exifData.Make) ? `${exifData.Make} ` : '';
            setUploadCamera(`${makePrefix}${exifData.Model}`);
          }

          // 2. Objektív modell
          if (exifData.LensModel) {
            setUploadLens(exifData.LensModel);
          }

          // 3. Dátum elemzése (Hónap és Napszak becslése)
          if (exifData.DateTimeOriginal) {
            const photoDate = new Date(exifData.DateTimeOriginal);
            
            // Hónap beállítása magyarul
            const months = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];
            setUploadMonth(months[photoDate.getMonth()]);

            // Napszak megtippelése az óra alapján
            const hour = photoDate.getHours();
            if (hour >= 5 && hour < 8) {
              setUploadTimeOfDay('Napkelte / Aranyóra');
            } else if (hour >= 8 && hour < 17) {
              setUploadTimeOfDay('Napközben');
            } else if (hour >= 17 && hour < 21) {
              setUploadTimeOfDay('Naplemente / Kékóra');
            } else {
              setUploadTimeOfDay('Éjszaka / Tejút');
            }
          }
        }
      } catch (exifError) {
        // Ha nincs EXIF metaadat a képben (pl. Facebookról mentett vagy lebutított kép), csendben üresen hagyja a mezőket
        console.log("A kép nem tartalmaz olvasható EXIF metaadatokat.");
      }
    }
  };

  const handleSaveSpot = async () => {
    if (!uploadTitle || !uploadDesc) return alert("Kérlek adj meg címet és leírást!");
    if (!editingSpot && !uploadFile) return alert("Fotó feltöltése kötelező új helyszínnél!");

    setIsUploading(true);
    const formData = new FormData();
    if (uploadFile) formData.append('photo', uploadFile);
    formData.append('userEmail', user.email);
    formData.append('title', uploadTitle);
    formData.append('description', uploadDesc);
    formData.append('photoMonth', uploadMonth);
    formData.append('photoTimeOfDay', uploadTimeOfDay);
    formData.append('camera', uploadCamera);
    formData.append('lens', uploadLens);

    try {
      if (editingSpot) {
        const res = await fetch(`${BACKEND_URL}/api/locations/${editingSpot.id}`, { method: 'PUT', body: formData });
        if (res.ok) { alert('Helyszín frissítve!'); setEditingSpot(null); fetchLocations(searchQuery); }
      } else if (newSpotLatLng) {
        formData.append('userName', user.name || user.email);
        formData.append('lat', newSpotLatLng.lat.toString());
        formData.append('lng', newSpotLatLng.lng.toString());
        const res = await fetch(`${BACKEND_URL}/api/locations`, { method: 'POST', body: formData });
        if (res.ok) { alert('Helyszín rögzítve!'); setNewSpotLatLng(null); fetchLocations(searchQuery); }
      }
    } catch (e) { alert("Hálózati hiba!"); } finally { setIsUploading(false); }
  };

  const handleDeleteLocation = async (id: number) => {
    if (!window.confirm("Biztosan törölni szeretnéd ezt a fotós helyszínt?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/locations/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email })
      });
      if (res.ok) { alert("Helyszín törölve!"); setActiveSpot(null); fetchLocations(searchQuery); }
    } catch (e) { alert("Hiba a törlés során."); }
  };

  const handleToggleLike = async (id: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/locations/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email })
      });
      if (res.ok) fetchLocations(searchQuery); 
    } catch (e) { console.error(e); }
  };

  const handlePostComment = async () => {
    if ((!newComment.trim() && !commentFile) || !activeSpot) return;
    setIsCommenting(true);

    const formData = new FormData();
    formData.append('userEmail', user.email);
    formData.append('userName', user.name);
    formData.append('commentText', newComment.trim());
    if (commentFile) formData.append('photo', commentFile);

    try {
      const res = await fetch(`${BACKEND_URL}/api/locations/${activeSpot.id}/comments`, { method: 'POST', body: formData });
      if (res.ok) {
        setNewComment('');
        setCommentFile(null);
        setCommentPreview(null);
        fetchComments(activeSpot.id);
      }
    } catch (e) { alert("Hiba a komment elküldésekor!"); }
    finally { setIsCommenting(false); }
  };

  const onLoad = useCallback((mapInstance: any) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleZoomChanged = () => {
    if (map) {
      setMapZoom(map.getZoom());
    }
  };

  if (!isLoaded) {
    return <div style={{ color: '#94a3b8', padding: '40px', textAlign: 'center', background: '#1e293b', borderRadius: '12px' }}>📡 Google Maps kapcsolat felépítése...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ fontSize: '2rem', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>🌍 Fotós Helyszínek</h2>
        <div style={{ background: '#10b98120', color: '#10b981', padding: '8px 15px', borderRadius: '8px', border: '1px solid #10b98150', fontWeight: 'bold' }}>💡 Tipp: Kattints a térképre bárhol egy új gombostű lehelyezéséhez!</div>
      </div>

      {/* SZŰRŐK ÉS KERESŐK */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
          <label style={{ color: '#38bdf8', fontWeight: 'bold', display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>🔍 Meglévő fotós helyszínek szűrése</label>
          <input type="text" placeholder="Keresés névben, leírásban..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155', position: 'relative' }}>
          <label style={{ color: '#f59e0b', fontWeight: 'bold', display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>✈️ Ugrás településre / címre</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="Város, utca (pl. Budapest)" value={citySearch} onChange={(e) => setCitySearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCitySearch(); }} style={{ flex: 1, padding: '10px 15px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={handleCitySearch} style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Ugrás</button>
          </div>
          {cityResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: '15px', right: '15px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', zIndex: 1000, marginTop: '5px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
              {cityResults.map((res, i) => (
                <div key={i} onClick={() => handleSelectCity(res.lat, res.lon)} style={{ padding: '10px 15px', borderBottom: '1px solid #1e293b', cursor: 'pointer', transition: 'background 0.2s', color: '#cbd5e1', fontSize: '0.9rem' }} onMouseOver={e => e.currentTarget.style.background = '#1e293b'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>📍 {res.display_name}</div>
              ))}
              <div onClick={() => setCityResults([])} style={{ padding: '8px', textAlign: 'center', background: '#ef444420', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>✖ Bezárás</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
        
        {/* FORM PANEL */}
        {(newSpotLatLng || editingSpot) && (
          <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: editingSpot ? '2px solid #f59e0b' : '2px solid #38bdf8', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: editingSpot ? '#f59e0b' : '#38bdf8' }}>{editingSpot ? `✏️ "${editingSpot.title}" szerkesztése` : '📍 Új Helyszín Rögzítése'}</h3>
              <button onClick={() => { setNewSpotLatLng(null); setEditingSpot(null); }} style={{ background: 'transparent', color: '#94a3b8', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
            </div>
            
            <input placeholder="Helyszín neve (pl. Prédikálószék kilátó)" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} style={inputStyle} disabled={isUploading} />
            <textarea placeholder="Leírás: Miért jó ez a hely?" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} style={{...inputStyle, minHeight: '80px'}} disabled={isUploading} />
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px', background: '#1e293b30', padding: '15px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>📅 Készítés hónapja</label>
                <select value={uploadMonth} onChange={e => setUploadMonth(e.target.value)} style={{...inputStyle, marginBottom: 0}} disabled={isUploading}>
                  <option value="">-- Nincs megadva --</option>
                  {['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>☀️ Készítés napszakja</label>
                <select value={uploadTimeOfDay} onChange={e => setUploadTimeOfDay(e.target.value)} style={{...inputStyle, marginBottom: 0}} disabled={isUploading}>
                  <option value="">-- Nincs megadva --</option>
                  {['Napkelte / Aranyóra', 'Napközben', 'Naplemente / Kékóra', 'Éjszaka / Tejút'].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>📷 Fényképezőgép váz</label>
                <input placeholder="pl. Sony A7 IV" value={uploadCamera} onChange={e => setUploadCamera(e.target.value)} style={{...inputStyle, marginBottom: 0}} disabled={isUploading} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#a855f7', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>🔭 Használt Objektív</label>
                <input placeholder="pl. 16-35mm nagylátószög" value={uploadLens} onChange={e => setUploadLens(e.target.value)} style={{...inputStyle, marginBottom: 0}} disabled={isUploading} />
              </div>
            </div>

            <label style={{fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '5px'}}>{editingSpot ? 'Fotó cseréje (Opcionális)' : 'Helyszín fotója (Kötelező)'}</label>
            <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileSelect} style={{ color: '#94a3b8', marginBottom: '15px', width: '100%' }} disabled={isUploading} />
            {uploadPreview && (
              <div style={{marginTop: '10px', marginBottom: '20px', textAlign: 'center'}}><img src={uploadPreview} alt="Előnézet" style={{maxHeight: '200px', borderRadius: '8px', border: '1px solid #334155'}} /></div>
            )}
            <button onClick={handleSaveSpot} disabled={isUploading} style={{ width: '100%', background: editingSpot ? '#f59e0b' : '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: isUploading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>{isUploading ? 'Mentés...' : editingSpot ? 'Mentés 💾' : 'Mentés 🚀'}</button>
          </div>
        )}

        {/* TÉRKÉP MÓD VÁLTÓ */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-10px', zIndex: 10 }}>
          <div style={{ background: '#1e293b', padding: '4px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', gap: '4px' }}>
            <button onClick={() => setMapTheme('roadmap')} style={{ background: mapTheme === 'roadmap' ? '#0f172a' : 'transparent', color: mapTheme === 'roadmap' ? '#38bdf8' : '#64748b', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>🗺️ Utcatérkép</button>
            <button onClick={() => setMapTheme('hybrid')} style={{ background: mapTheme === 'hybrid' ? '#f8fafc' : 'transparent', color: mapTheme === 'hybrid' ? '#0f172a' : '#64748b', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>🛰️ Műholdas Hibrid</button>
          </div>
        </div>

        {/* GOOGLE MAPS PANEL */}
        <div style={{ position: 'relative', height: '650px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
          
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={mapTargetPosition}
            zoom={mapZoom}
            onClick={handleMapClick}
            mapTypeId={mapTheme}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onZoomChanged={handleZoomChanged}
            options={{
              streetViewControl: false,
              fullscreenControl: false,
              mapTypeControl: false
            }}
          >
            {newSpotLatLng && (
              <MarkerF position={newSpotLatLng} />
            )}

            {locations.map((loc) => {
              const isOwnOrAdmin = loc.user_email === user.email || isAdmin; 
              const pos = { lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) };
              return (
                <MarkerF 
                  key={loc.id} 
                  position={pos}
                  draggable={isOwnOrAdmin}
                  onDragEnd={(e) => handleMarkerDragEnd(loc.id, e)}
                  onClick={() => setActiveSpot(loc)}
                />
              )
            })}
          </GoogleMap>

          {/* LEBEGŐ SIDEBAR KÁRTYA */}
          {activeSpot && (() => {
            const isOwnOrAdmin = activeSpot.user_email === user.email || isAdmin;
            const hasLiked = activeSpot.user_liked === 1;
            const imageUrl = getImageUrl(activeSpot.drive_file_id, activeSpot.file_url);

            return (
              <div style={{ position: 'absolute', top: '15px', right: '15px', width: '340px', maxHeight: '620px', display: 'flex', flexDirection: 'column', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid #334155', borderRadius: '16px', zIndex: 1000, boxShadow: '0 15px 30px rgba(0,0,0,0.5)', animation: 'slideIn 0.3s ease-out' }}>
                
                <div style={{ padding: '15px 15px 0 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '1.2rem', lineHeight: '1.3', paddingRight: '10px' }}>{activeSpot.title}</h3>
                  <button onClick={() => setActiveSpot(null)} style={{ background: '#334155', color: '#cbd5e1', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✖</button>
                </div>

                <div style={{ padding: '0 15px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div onClick={() => setFullscreenData({url: imageUrl, title: activeSpot.title})} style={{ width: '100%', height: '160px', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', cursor: 'zoom-in', flexShrink: 0, border: '1px solid #475569' }}>
                    <img src={imageUrl} alt={activeSpot.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>{activeSpot.description}</p>

                  {/* TIPIKUS EXIF ADATOK */}
                  {(activeSpot.photo_month || activeSpot.photo_time_of_day || activeSpot.camera || activeSpot.lens) && (
                    <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>📸 Környezet & Exif tippek</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                        {activeSpot.photo_month && <div style={{ background: '#1e293b', padding: '6px 10px', borderRadius: '6px', color: '#cbd5e1' }}>📅 <b>{activeSpot.photo_month}</b></div>}
                        {activeSpot.photo_time_of_day && <div style={{ background: '#1e293b', padding: '6px 10px', borderRadius: '6px', color: '#cbd5e1' }}>☀️ <b>{activeSpot.photo_time_of_day}</b></div>}
                        {activeSpot.camera && <div style={{ background: '#1e293b', padding: '6px 10px', borderRadius: '6px', color: '#cbd5e1', gridColumn: '1 / -1' }}>📷 Gép: <b>{activeSpot.camera}</b></div>}
                        {activeSpot.lens && <div style={{ background: '#1e293b', padding: '6px 10px', borderRadius: '6px', color: '#cbd5e1', gridColumn: '1 / -1' }}>🔭 Üveg: <b>{activeSpot.lens}</b></div>}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '10px', borderRadius: '8px' }}>
                    <button onClick={() => handleToggleLike(activeSpot.id)} style={{ background: hasLiked ? '#ef444420' : '#334155', border: hasLiked ? '1px solid #ef444450' : '1px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '50px', transition: 'all 0.2s' }}>
                      <span style={{ fontSize: '1.2rem' }}>{hasLiked ? '❤️' : '🤍'}</span>
                      <span style={{ fontWeight: 'bold', color: hasLiked ? '#ef4444' : '#94a3b8' }}>{activeSpot.like_count || 0} Kedvelés</span>
                    </button>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'right', lineHeight: '1.2' }}>Felfedező:<br/><b style={{color: '#94a3b8'}}>{activeSpot.user_name}</b></div>
                  </div>

                  {isOwnOrAdmin && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => handleStartEdit(activeSpot)} style={{ flex: 1, background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b50', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>Szerkesztés</button>
                      <button onClick={() => handleDeleteLocation(activeSpot.id)} style={{ flex: 1, background: '#ef444420', color: '#ef4444', border: '1px solid #ef444450', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>Törlés</button>
                    </div>
                  )}

                  {/* HOZZÁSZÓLÁSOK LISTÁJA */}
                  <div style={{ borderTop: '1px solid #334155', paddingTop: '12px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>💬 Hozzászólások <span style={{ background: '#334155', padding: '2px 8px', borderRadius: '50px', fontSize: '0.75rem' }}>{comments.length}</span></h4>
                    {comments.length === 0 ? (
                      <div style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '15px' }}>Még senki sem szólt hozzá.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                        {comments.map(c => (
                          <div key={c.id} style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <b style={{ color: '#38bdf8', fontSize: '0.85rem' }}>{c.user_name}</b>
                              <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{new Date(c.created_at).toLocaleDateString('hu-HU')}</span>
                            </div>
                            <div style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.4' }}>{c.comment_text}</div>
                            {c.file_url && (
                              <div onClick={() => setFullscreenData({url: getImageUrl(c.drive_file_id, c.file_url), title: `${c.user_name} fotós tippje`})} style={{ marginTop: '8px', width: '100%', maxHeight: '130px', backgroundColor: '#000', borderRadius: '6px', overflow: 'hidden', cursor: 'zoom-in', border: '1px solid #232f46' }}>
                                <img src={getImageUrl(c.drive_file_id, c.file_url)} alt="Komment fotó" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ÚJ KOMMENT */}
                <div style={{ padding: '15px', borderTop: '1px solid #1e293b', background: '#0f172a', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                  {commentPreview && (
                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '10px', animation: 'fadeIn 0.2s' }}>
                      <img src={commentPreview} alt="Csatolt fotó" style={{ maxHeight: '60px', borderRadius: '6px', border: '1px solid #38bdf850' }} />
                      <button onClick={() => { setCommentFile(null); setCommentPreview(null); }} style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✕</button>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ cursor: 'pointer', fontSize: '1.2rem', background: '#1e293b', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #334155', width: '36px', height: '36px', boxSizing: 'border-box' }} title="Fotó csatolása">
                      📷
                      <input type="file" accept="image/jpeg, image/png, image/webp" onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const file = e.target.files[0]; setCommentFile(file); setCommentPreview(URL.createObjectURL(file));
                        }
                      }} style={{ display: 'none' }} disabled={isCommenting} />
                    </label>

                    <input type="text" placeholder={commentFile ? "Írj hozzá szöveget (opcionális)..." : "Írj egy tippet vagy kérdést..."} value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment(); }} style={{ flex: 1, padding: '8px 12px', borderRadius: '20px', border: '1px solid #334155', background: '#1e293b', color: 'white', outline: 'none', fontSize: '0.9rem' }} />
                    <button onClick={handlePostComment} disabled={(!newComment.trim() && !commentFile) || isCommenting} style={{ background: (newComment.trim() || commentFile) ? '#38bdf8' : '#334155', color: '#0f172a', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: (newComment.trim() || commentFile) ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>➤</button>
                  </div>
                </div>

              </div>
            );
          })()}

        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}
}

export default function MapSpotsView({ user, setFullscreenData, targetMapSpotId, setTargetMapSpotId }: MapSpotsViewProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const [map, setMap] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState<any[]>([]);
  
  const [mapTargetPosition, setMapTargetPosition] = useState<{lat: number, lng: number}>(defaultCenter);
  const [mapZoom, setMapZoom] = useState<number>(7);

  const [newSpotLatLng, setNewSpotLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [editingSpot, setEditingSpot] = useState<any | null>(null);
  const [activeSpot, setActiveSpot] = useState<any | null>(null);

  const [mapTheme, setMapTheme] = useState<'roadmap' | 'hybrid'>('roadmap');

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [commentPreview, setCommentPreview] = useState<string | null>(null);

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [uploadMonth, setUploadMonth] = useState('');
  const [uploadTimeOfDay, setUploadTimeOfDay] = useState('');
  const [uploadCamera, setUploadCamera] = useState('');
  const [uploadLens, setUploadLens] = useState('');

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };
  const isAdmin = user?.email === ADMIN_EMAIL; 

  const fetchLocations = async (search = '') => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/locations?search=${encodeURIComponent(search)}&userEmail=${user.email}`);
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
        setActiveSpot(prev => {
          if (!prev) return null;
          const updatedSpot = data.find((d: any) => d.id === prev.id);
          return updatedSpot ? updatedSpot : prev;
        });
      }
    } catch (e) { console.error(e); }
  };

  const fetchComments = async (locationId: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/locations/${locationId}/comments`);
      if (res.ok) setComments(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (map && mapTargetPosition) {
      map.panTo(mapTargetPosition);
    }
  }, [mapTargetPosition, map]);

  useEffect(() => {
    if (targetMapSpotId && locations.length > 0) {
      const spotToOpen = locations.find(loc => loc.id === targetMapSpotId);
      if (spotToOpen) {
        setActiveSpot(spotToOpen);
        const pos = { lat: parseFloat(spotToOpen.lat), lng: parseFloat(spotToOpen.lng) };
        setMapTargetPosition(pos);
        setMapZoom(14);
        if (setTargetMapSpotId) setTargetMapSpotId(null); 
      }
    }
  }, [targetMapSpotId, locations, map]);
  
  useEffect(() => { fetchLocations(searchQuery); }, [searchQuery]);

  useEffect(() => {
    if (activeSpot) { fetchComments(activeSpot.id); } 
    else { setComments([]); setNewComment(''); setCommentFile(null); setCommentPreview(null); }
  }, [activeSpot?.id]);

  const handleCitySearch = async () => {
    if (!citySearch.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(citySearch)}&limit=5`);
      const data = await res.json();
      setCityResults(data);
      if (data.length === 0) alert("Nem található ilyen hely!");
    } catch (e) { console.error(e); }
  };

  const handleSelectCity = (lat: string, lon: string) => {
    setMapTargetPosition({ lat: parseFloat(lat), lng: parseFloat(lon) });
    setMapZoom(13);
    setCityResults([]); 
    setCitySearch(''); 
  };

  const handleMapClick = (e: any) => {
    if (!e.latLng) return;
    const clickedLat = e.latLng.lat();
    const clickedLng = e.latLng.lng();

    setEditingSpot(null);
    setNewSpotLatLng({ lat: clickedLat, lng: clickedLng });
    setUploadTitle('');
    setUploadDesc('');
    setUploadFile(null);
    setUploadPreview(null);
    setActiveSpot(null); 
    setUploadMonth('');
    setUploadTimeOfDay('');
    setUploadCamera('');
    setUploadLens('');
  };

  const handleStartEdit = (loc: any) => {
    setNewSpotLatLng(null);
    setActiveSpot(null); 
    setEditingSpot(loc);
    setUploadTitle(loc.title);
    setUploadDesc(loc.description);
    setUploadFile(null);
    setUploadPreview(getImageUrl(loc.drive_file_id, loc.file_url));
    setMapTargetPosition({ lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) });
    setMapZoom(14);
    setUploadMonth(loc.photo_month || '');
    setUploadTimeOfDay(loc.photo_time_of_day || '');
    setUploadCamera(loc.camera || '');
    setUploadLens(loc.lens || '');
  };

  // JAVÍTVA: Megerősítés kérése áthúzáskor + Mégse esetén pozíció visszaállítása
  const handleMarkerDragEnd = async (id: number, e: any) => {
    if (!e.latLng) return;

    const currentSpot = locations.find(loc => loc.id === id);
    const spotTitle = currentSpot ? `"${currentSpot.title}"` : 'ezt a helyszínt';

    if (!window.confirm(`Biztosan át szeretnéd mozgatni ${spotTitle} gombostűjét az új koordinátákra?`)) {
      // Ha mégsem akarja, újratöltjük az adatbázisból, így a marker visszaugrik a régi helyére
      fetchLocations(searchQuery);
      return;
    }

    const safeLat = e.latLng.lat().toFixed(8);
    const safeLng = e.latLng.lng().toFixed(8);

    // Ha rányomott, hogy OK, akkor frissítjük a lokális state-et és küldjük a backendre
    setLocations(prev => prev.map(loc => loc.id === id ? { ...loc, lat: safeLat, lng: safeLng } : loc));
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email, isAdmin: isAdmin, lat: safeLat, lng: safeLng })
      });
      if (!res.ok) { 
        alert('Mentés sikertelen!'); 
        fetchLocations(searchQuery); 
      }
    } catch (error) { 
      alert("Hálózati hiba!"); 
      fetchLocations(searchQuery); 
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadFile(file);
      setUploadPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveSpot = async () => {
    if (!uploadTitle || !uploadDesc) return alert("Kérlek adj meg címet és leírást!");
    if (!editingSpot && !uploadFile) return alert("Fotó feltöltése kötelező új helyszínnél!");

    setIsUploading(true);
    const formData = new FormData();
    if (uploadFile) formData.append('photo', uploadFile);
    formData.append('userEmail', user.email);
    formData.append('title', uploadTitle);
    formData.append('description', uploadDesc);
    formData.append('photoMonth', uploadMonth);
    formData.append('photoTimeOfDay', uploadTimeOfDay);
    formData.append('camera', uploadCamera);
    formData.append('lens', uploadLens);

    try {
      if (editingSpot) {
        const res = await fetch(`${BACKEND_URL}/api/locations/${editingSpot.id}`, { method: 'PUT', body: formData });
        if (res.ok) { alert('Helyszín frissítve!'); setEditingSpot(null); fetchLocations(searchQuery); }
      } else if (newSpotLatLng) {
        formData.append('userName', user.name || user.email);
        formData.append('lat', newSpotLatLng.lat.toString());
        formData.append('lng', newSpotLatLng.lng.toString());
        const res = await fetch(`${BACKEND_URL}/api/locations`, { method: 'POST', body: formData });
        if (res.ok) { alert('Helyszín rögzítve!'); setNewSpotLatLng(null); fetchLocations(searchQuery); }
      }
    } catch (e) { alert("Hálózati hiba!"); } finally { setIsUploading(false); }
  };

  const handleDeleteLocation = async (id: number) => {
    if (!window.confirm("Biztosan törölni szeretnéd ezt a fotós helyszínt?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/locations/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email })
      });
      if (res.ok) { alert("Helyszín törölve!"); setActiveSpot(null); fetchLocations(searchQuery); }
    } catch (e) { alert("Hiba a törlés során."); }
  };

  const handleToggleLike = async (id: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/locations/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email })
      });
      if (res.ok) fetchLocations(searchQuery); 
    } catch (e) { console.error(e); }
  };

  const handlePostComment = async () => {
    if ((!newComment.trim() && !commentFile) || !activeSpot) return;
    setIsCommenting(true);

    const formData = new FormData();
    formData.append('userEmail', user.email);
    formData.append('userName', user.name);
    formData.append('commentText', newComment.trim());
    if (commentFile) formData.append('photo', commentFile);

    try {
      const res = await fetch(`${BACKEND_URL}/api/locations/${activeSpot.id}/comments`, { method: 'POST', body: formData });
      if (res.ok) {
        setNewComment('');
        setCommentFile(null);
        setCommentPreview(null);
        fetchComments(activeSpot.id);
      }
    } catch (e) { alert("Hiba a komment elküldésekor!"); }
    finally { setIsCommenting(false); }
  };

  const onLoad = useCallback((mapInstance: any) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleZoomChanged = () => {
    if (map) {
      setMapZoom(map.getZoom());
    }
  };

  if (!isLoaded) {
    return <div style={{ color: '#94a3b8', padding: '40px', textAlign: 'center', background: '#1e293b', borderRadius: '12px' }}>📡 Google Maps kapcsolat felépítése...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ fontSize: '2rem', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>🌍 Fotós Helyszínek</h2>
        <div style={{ background: '#10b98120', color: '#10b981', padding: '8px 15px', borderRadius: '8px', border: '1px solid #10b98150', fontWeight: 'bold' }}>💡 Tipp: Kattints a térképre bárhol egy új gombostű lehelyezéséhez!</div>
      </div>

      {/* SZŰRŐK ÉS KERESŐK */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
          <label style={{ color: '#38bdf8', fontWeight: 'bold', display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>🔍 Meglévő fotós helyszínek szűrése</label>
          <input type="text" placeholder="Keresés névben, leírásban..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155', position: 'relative' }}>
          <label style={{ color: '#f59e0b', fontWeight: 'bold', display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>✈️ Ugrás településre / címre</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="Város, utca (pl. Budapest)" value={citySearch} onChange={(e) => setCitySearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCitySearch(); }} style={{ flex: 1, padding: '10px 15px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={handleCitySearch} style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Ugrás</button>
          </div>
          {cityResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: '15px', right: '15px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', zIndex: 1000, marginTop: '5px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
              {cityResults.map((res, i) => (
                <div key={i} onClick={() => handleSelectCity(res.lat, res.lon)} style={{ padding: '10px 15px', borderBottom: '1px solid #1e293b', cursor: 'pointer', transition: 'background 0.2s', color: '#cbd5e1', fontSize: '0.9rem' }} onMouseOver={e => e.currentTarget.style.background = '#1e293b'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>📍 {res.display_name}</div>
              ))}
              <div onClick={() => setCityResults([])} style={{ padding: '8px', textAlign: 'center', background: '#ef444420', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>✖ Bezárás</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
        
        {/* FORM PANEL */}
        {(newSpotLatLng || editingSpot) && (
          <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: editingSpot ? '2px solid #f59e0b' : '2px solid #38bdf8', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: editingSpot ? '#f59e0b' : '#38bdf8' }}>{editingSpot ? `✏️ "${editingSpot.title}" szerkesztése` : '📍 Új Helyszín Rögzítése'}</h3>
              <button onClick={() => { setNewSpotLatLng(null); setEditingSpot(null); }} style={{ background: 'transparent', color: '#94a3b8', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
            </div>
            
            <input placeholder="Helyszín neve (pl. Prédikálószék kilátó)" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} style={inputStyle} disabled={isUploading} />
            <textarea placeholder="Leírás: Miért jó ez a hely?" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} style={{...inputStyle, minHeight: '80px'}} disabled={isUploading} />
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px', background: '#1e293b30', padding: '15px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>📅 Készítés hónapja</label>
                <select value={uploadMonth} onChange={e => setUploadMonth(e.target.value)} style={{...inputStyle, marginBottom: 0}} disabled={isUploading}>
                  <option value="">-- Nincs megadva --</option>
                  {['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>☀️ Készítés napszakja</label>
                <select value={uploadTimeOfDay} onChange={e => setUploadTimeOfDay(e.target.value)} style={{...inputStyle, marginBottom: 0}} disabled={isUploading}>
                  <option value="">-- Nincs megadva --</option>
                  {['Napkelte / Aranyóra', 'Napközben', 'Naplemente / Kékóra', 'Éjszaka / Tejút'].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>📷 Fényképezőgép váz</label>
                <input placeholder="pl. Sony A7 IV" value={uploadCamera} onChange={e => setUploadCamera(e.target.value)} style={{...inputStyle, marginBottom: 0}} disabled={isUploading} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#a855f7', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>🔭 Használt Objektív</label>
                <input placeholder="pl. 16-35mm nagylátószög" value={uploadLens} onChange={e => setUploadLens(e.target.value)} style={{...inputStyle, marginBottom: 0}} disabled={isUploading} />
              </div>
            </div>

            <label style={{fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '5px'}}>{editingSpot ? 'Fotó cseréje (Opcionális)' : 'Helyszín fotója (Kötelező)'}</label>
            <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileSelect} style={{ color: '#94a3b8', marginBottom: '15px', width: '100%' }} disabled={isUploading} />
            {uploadPreview && (
              <div style={{marginTop: '10px', marginBottom: '20px', textAlign: 'center'}}><img src={uploadPreview} alt="Előnézet" style={{maxHeight: '200px', borderRadius: '8px', border: '1px solid #334155'}} /></div>
            )}
            <button onClick={handleSaveSpot} disabled={isUploading} style={{ width: '100%', background: editingSpot ? '#f59e0b' : '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: isUploading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>{isUploading ? 'Mentés...' : editingSpot ? 'Mentés 💾' : 'Mentés 🚀'}</button>
          </div>
        )}

        {/* TÉRKÉP MÓD VÁLTÓ */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-10px', zIndex: 10 }}>
          <div style={{ background: '#1e293b', padding: '4px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', gap: '4px' }}>
            <button onClick={() => setMapTheme('roadmap')} style={{ background: mapTheme === 'roadmap' ? '#0f172a' : 'transparent', color: mapTheme === 'roadmap' ? '#38bdf8' : '#64748b', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>🗺️ Utcatérkép</button>
            <button onClick={() => setMapTheme('hybrid')} style={{ background: mapTheme === 'hybrid' ? '#f8fafc' : 'transparent', color: mapTheme === 'hybrid' ? '#0f172a' : '#64748b', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>🛰️ Műholdas Hibrid</button>
          </div>
        </div>

        {/* GOOGLE MAPS PANEL */}
        <div style={{ position: 'relative', height: '650px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
          
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={mapTargetPosition}
            zoom={mapZoom}
            onClick={handleMapClick}
            mapTypeId={mapTheme}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onZoomChanged={handleZoomChanged}
            options={{
              streetViewControl: false,
              fullscreenControl: false,
              mapTypeControl: false
            }}
          >
            {/* Új lehelyezendő marker előnézete */}
            {newSpotLatLng && (
              <MarkerF position={newSpotLatLng} />
            )}

            {/* Meglévő mentett helyszínek */}
            {locations.map((loc) => {
              const isOwnOrAdmin = loc.user_email === user.email || isAdmin; 
              const pos = { lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) };
              return (
                <MarkerF 
                  key={loc.id} 
                  position={pos}
                  draggable={isOwnOrAdmin}
                  onDragEnd={(e) => handleMarkerDragEnd(loc.id, e)}
                  onClick={() => setActiveSpot(loc)}
                />
              )
            })}
          </GoogleMap>

          {/* LEBEGŐ SIDEBAR KÁRTYA */}
          {activeSpot && (() => {
            const isOwnOrAdmin = activeSpot.user_email === user.email || isAdmin;
            const hasLiked = activeSpot.user_liked === 1;
            const imageUrl = getImageUrl(activeSpot.drive_file_id, activeSpot.file_url);

            return (
              <div style={{ position: 'absolute', top: '15px', right: '15px', width: '340px', maxHeight: '620px', display: 'flex', flexDirection: 'column', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid #334155', borderRadius: '16px', zIndex: 1000, boxShadow: '0 15px 30px rgba(0,0,0,0.5)', animation: 'slideIn 0.3s ease-out' }}>
                
                <div style={{ padding: '15px 15px 0 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '1.2rem', lineHeight: '1.3', paddingRight: '10px' }}>{activeSpot.title}</h3>
                  <button onClick={() => setActiveSpot(null)} style={{ background: '#334155', color: '#cbd5e1', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✖</button>
                </div>

                <div style={{ padding: '0 15px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div onClick={() => setFullscreenData({url: imageUrl, title: activeSpot.title})} style={{ width: '100%', height: '160px', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', cursor: 'zoom-in', flexShrink: 0, border: '1px solid #475569' }}>
                    <img src={imageUrl} alt={activeSpot.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>{activeSpot.description}</p>

                  {/* TIPIKUS EXIF ADATOK */}
                  {(activeSpot.photo_month || activeSpot.photo_time_of_day || activeSpot.camera || activeSpot.lens) && (
                    <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>📸 Környezet & Exif tippek</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                        {activeSpot.photo_month && <div style={{ background: '#1e293b', padding: '6px 10px', borderRadius: '6px', color: '#cbd5e1' }}>📅 <b>{activeSpot.photo_month}</b></div>}
                        {activeSpot.photo_time_of_day && <div style={{ background: '#1e293b', padding: '6px 10px', borderRadius: '6px', color: '#cbd5e1' }}>☀️ <b>{activeSpot.photo_time_of_day}</b></div>}
                        {activeSpot.camera && <div style={{ background: '#1e293b', padding: '6px 10px', borderRadius: '6px', color: '#cbd5e1', gridColumn: '1 / -1' }}>📷 Gép: <b>{activeSpot.camera}</b></div>}
                        {activeSpot.lens && <div style={{ background: '#1e293b', padding: '6px 10px', borderRadius: '6px', color: '#cbd5e1', gridColumn: '1 / -1' }}>🔭 Üveg: <b>{activeSpot.lens}</b></div>}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '10px', borderRadius: '8px' }}>
                    <button onClick={() => handleToggleLike(activeSpot.id)} style={{ background: hasLiked ? '#ef444420' : '#334155', border: hasLiked ? '1px solid #ef444450' : '1px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '50px', transition: 'all 0.2s' }}>
                      <span style={{ fontSize: '1.2rem' }}>{hasLiked ? '❤️' : '🤍'}</span>
                      <span style={{ fontWeight: 'bold', color: hasLiked ? '#ef4444' : '#94a3b8' }}>{activeSpot.like_count || 0} Kedvelés</span>
                    </button>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'right', lineHeight: '1.2' }}>Felfedező:<br/><b style={{color: '#94a3b8'}}>{activeSpot.user_name}</b></div>
                  </div>

                  {isOwnOrAdmin && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => handleStartEdit(activeSpot)} style={{ flex: 1, background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b50', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>Szerkesztés</button>
                      <button onClick={() => handleDeleteLocation(activeSpot.id)} style={{ flex: 1, background: '#ef444420', color: '#ef4444', border: '1px solid #ef444450', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>Törlés</button>
                    </div>
                  )}

                  {/* HOZZÁSZÓLÁSOK LISTÁJA */}
                  <div style={{ borderTop: '1px solid #334155', paddingTop: '12px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>💬 Hozzászólások <span style={{ background: '#334155', padding: '2px 8px', borderRadius: '50px', fontSize: '0.75rem' }}>{comments.length}</span></h4>
                    {comments.length === 0 ? (
                      <div style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '15px' }}>Még senki sem szólt hozzá.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                        {comments.map(c => (
                          <div key={c.id} style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <b style={{ color: '#38bdf8', fontSize: '0.85rem' }}>{c.user_name}</b>
                              <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{new Date(c.created_at).toLocaleDateString('hu-HU')}</span>
                            </div>
                            <div style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.4' }}>{c.comment_text}</div>
                            {c.file_url && (
                              <div onClick={() => setFullscreenData({url: getImageUrl(c.drive_file_id, c.file_url), title: `${c.user_name} fotós tippje`})} style={{ marginTop: '8px', width: '100%', maxHeight: '130px', backgroundColor: '#000', borderRadius: '6px', overflow: 'hidden', cursor: 'zoom-in', border: '1px solid #232f46' }}>
                                <img src={getImageUrl(c.drive_file_id, c.file_url)} alt="Komment fotó" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ÚJ KOMMENT */}
                <div style={{ padding: '15px', borderTop: '1px solid #1e293b', background: '#0f172a', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                  {commentPreview && (
                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '10px', animation: 'fadeIn 0.2s' }}>
                      <img src={commentPreview} alt="Csatolt fotó" style={{ maxHeight: '60px', borderRadius: '6px', border: '1px solid #38bdf850' }} />
                      <button onClick={() => { setCommentFile(null); setCommentPreview(null); }} style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✕</button>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ cursor: 'pointer', fontSize: '1.2rem', background: '#1e293b', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #334155', width: '36px', height: '36px', boxSizing: 'border-box' }} title="Fotó csatolása">
                      📷
                      <input type="file" accept="image/jpeg, image/png, image/webp" onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const file = e.target.files[0]; setCommentFile(file); setCommentPreview(URL.createObjectURL(file));
                        }
                      }} style={{ display: 'none' }} disabled={isCommenting} />
                    </label>

                    <input type="text" placeholder={commentFile ? "Írj hozzá szöveget (opcionális)..." : "Írj egy tippet vagy kérdést..."} value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment(); }} style={{ flex: 1, padding: '8px 12px', borderRadius: '20px', border: '1px solid #334155', background: '#1e293b', color: 'white', outline: 'none', fontSize: '0.9rem' }} />
                    <button onClick={handlePostComment} disabled={(!newComment.trim() && !commentFile) || isCommenting} style={{ background: (newComment.trim() || commentFile) ? '#38bdf8' : '#334155', color: '#0f172a', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: (newComment.trim() || commentFile) ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>➤</button>
                  </div>
                </div>

              </div>
            );
          })()}

        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}
