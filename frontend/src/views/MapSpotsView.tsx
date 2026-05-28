import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BACKEND_URL, ADMIN_EMAIL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapSpotsViewProps {
  user: any;
  setFullscreenData: (data: any) => void;
}

function MapClickHandler({ onMapClick }: { onMapClick: (latlng: any) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function MapCameraController({ targetPosition }: { targetPosition: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (targetPosition) {
      map.flyTo(targetPosition, 13, { duration: 1.5 }); 
    }
  }, [targetPosition, map]);
  return null;
}

// ==========================================
// --- ÚJ: Dedikált Marker Komponens a Ghost Popup hiba ellen (React-módszer) ---
// ==========================================
function SpotMarker({ loc, isOwnOrAdmin, handleMarkerDragEnd, handleToggleLike, handleStartEdit, handleDeleteLocation, setFullscreenData }: any) {
  const markerRef = useRef<any>(null);
  
  // A VÉGSŐ MEGOLDÁS: A React-et használjuk arra, hogy a bezáráskor megsemmisítse a tartalmat
  const [isOpen, setIsOpen] = useState(false);

  const imageUrl = getImageUrl(loc.drive_file_id, loc.file_url);
  const hasLiked = loc.user_liked === 1;

  return (
    <Marker 
      ref={markerRef}
      position={[loc.lat, loc.lng]}
      draggable={isOwnOrAdmin}
      eventHandlers={{
        dragend: (e) => handleMarkerDragEnd(loc.id, e),
        popupopen: () => {
          setIsOpen(true); // Engedélyezzük a Reactnek, hogy megépítse a HTML-t
        },
        popupclose: () => {
          setIsOpen(false); // A React azonnal letörli a láthatatlan elemeket, nincs szellem-ablak!
          
          // Biztosíték a mozgathatóság (drag) újraindítására
          if (markerRef.current && isOwnOrAdmin) {
            markerRef.current.dragging.disable();
            setTimeout(() => {
              if (markerRef.current) markerRef.current.dragging.enable();
            }, 50);
          }
        }
      }}
    >
      <Popup>
        {/* TRÜKK: Csak akkor rajzoljuk ki a képet és a gombokat, ha a popup NYITVA van */}
        {isOpen ? (
          <div style={{ width: '230px', textAlign: 'center', fontFamily: 'sans-serif' }}>
            <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '6px', color: '#0f172a' }}>{loc.title}</strong>
            
            <div 
              onClick={(e) => {
                e.stopPropagation(); 
                e.preventDefault();
                setFullscreenData({url: imageUrl, title: loc.title});
              }}
              style={{ width: '100%', height: '120px', backgroundColor: '#f1f5f9', borderRadius: '6px', overflow: 'hidden', cursor: 'zoom-in', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <img src={imageUrl} alt={loc.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
            
            <p style={{ fontSize: '0.85rem', color: '#334155', margin: '0 0 10px 0', textAlign: 'left', maxHeight: '80px', overflowY: 'auto', lineHeight: '1.4' }}>
              {loc.description}
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', background: '#f8fafc', padding: '6px', borderRadius: '6px' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); handleToggleLike(loc.id); }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '50px', backgroundColor: hasLiked ? '#ef444415' : 'transparent' }}
              >
                <span style={{ fontSize: '1.1rem' }}>{hasLiked ? '❤️' : '🤍'}</span>
                <span style={{ fontWeight: 'bold', color: hasLiked ? '#ef4444' : '#64748b', fontSize: '0.85rem' }}>{loc.like_count || 0}</span>
              </button>

              {isOwnOrAdmin && (
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleStartEdit(loc); }}
                    title="Helyszín szerkesztése"
                    style={{ background: '#f59e0b20', color: '#d97706', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                  >
                    Szerkeszt
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteLocation(loc.id); }}
                    title="Helyszín törlése"
                    style={{ background: '#ef444420', color: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                  >
                    Töröl
                  </button>
                </div>
              )}
            </div>
            
            {isOwnOrAdmin && (
              <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginBottom: '5px', fontWeight: 'bold' }}>
                ✋ A gombostűt megfogva odébb húzhatod!
              </div>
            )}
            
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '6px', textAlign: 'left' }}>
              Felfedező: <b style={{color: '#475569'}}>{loc.user_name}</b><br/>
              Naptár: {new Date(loc.created_at).toLocaleDateString('hu-HU')}
            </div>
          </div>
        ) : (
          // Ha nincs nyitva, egy üres láthatatlan 1 pixeles divet adunk vissza
          <div style={{ width: '1px', height: '1px' }}></div>
        )}
      </Popup>
    </Marker>
  );
}

// ==========================================
// --- FŐ KOMPONENS ---
// ==========================================
export default function MapSpotsView({ user, setFullscreenData }: MapSpotsViewProps) {
  const [locations, setLocations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState<any[]>([]);
  const [mapTargetPosition, setMapTargetPosition] = useState<[number, number] | null>(null);

  const [newSpotLatLng, setNewSpotLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [editingSpot, setEditingSpot] = useState<any | null>(null);

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

  const isAdmin = user?.email === ADMIN_EMAIL; 

  const fetchLocations = async (search = '') => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/locations?search=${encodeURIComponent(search)}&userEmail=${user.email}`);
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (e) {
      console.error('Hiba a helyszínek betöltésekor', e);
    }
  };

  useEffect(() => {
    fetchLocations(searchQuery);
  }, [searchQuery]);

  const handleCitySearch = async () => {
    if (!citySearch.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(citySearch)}&limit=5`);
      const data = await res.json();
      setCityResults(data);
      if (data.length === 0) alert("Nem található ilyen nevű település vagy hely!");
    } catch (e) {
      console.error("Geocoding hiba:", e);
    }
  };

  const handleSelectCity = (lat: string, lon: string) => {
    setMapTargetPosition([parseFloat(lat), parseFloat(lon)]);
    setCityResults([]); 
    setCitySearch(''); 
  };

  const handleMapClick = (latlng: {lat: number, lng: number}) => {
    setEditingSpot(null);
    setNewSpotLatLng(latlng);
    setUploadTitle('');
    setUploadDesc('');
    setUploadFile(null);
    setUploadPreview(null);
  };

  const handleStartEdit = (loc: any) => {
    setNewSpotLatLng(null);
    setEditingSpot(loc);
    setUploadTitle(loc.title);
    setUploadDesc(loc.description);
    setUploadFile(null);
    setUploadPreview(getImageUrl(loc.drive_file_id, loc.file_url));
    setMapTargetPosition([loc.lat, loc.lng]); 
  };

  const handleMarkerDragEnd = async (id: number, e: any) => {
    const marker = e.target;
    const position = marker.getLatLng();
    const safeLat = position.lat.toFixed(8);
    const safeLng = position.lng.toFixed(8);

    // JAVÍTÁS: Azonnali React state frissítés, hogy a memóriában is az új helyén legyen a marker!
    setLocations(prev => prev.map(loc => loc.id === id ? { ...loc, lat: parseFloat(safeLat), lng: parseFloat(safeLng) } : loc));
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.email,
          isAdmin: isAdmin,
          lat: safeLat,
          lng: safeLng
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Hiba: ${err.error || 'Mentés sikertelen!'}`);
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

    try {
      if (editingSpot) {
        const res = await fetch(`${BACKEND_URL}/api/locations/${editingSpot.id}`, {
          method: 'PUT',
          body: formData
        });
        if (res.ok) {
          alert('Helyszín sikeresen frissítve!');
          setEditingSpot(null);
          fetchLocations(searchQuery);
        }
      } else if (newSpotLatLng) {
        formData.append('userName', user.name || user.email);
        formData.append('lat', newSpotLatLng.lat.toString());
        formData.append('lng', newSpotLatLng.lng.toString());

        const res = await fetch(`${BACKEND_URL}/api/locations`, {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          alert('Helyszín sikeresen rögzítve!');
          setNewSpotLatLng(null);
          fetchLocations(searchQuery);
        }
      }
    } catch (e) {
      alert("Hálózati hiba!");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteLocation = async (id: number) => {
    if (!window.confirm("Biztosan törölni szeretnéd ezt a fotós helyszínt?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/locations/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email })
      });
      if (res.ok) {
        alert("Helyszín sikeresen törölve!");
        fetchLocations(searchQuery);
      }
    } catch (e) {
      alert("Hiba a törlés során.");
    }
  };

  const handleToggleLike = async (id: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/locations/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email })
      });
      if (res.ok) {
        fetchLocations(searchQuery); 
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ fontSize: '2rem', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🌍 Fotós Helyszínek
        </h2>
        <div style={{ background: '#10b98120', color: '#10b981', padding: '8px 15px', borderRadius: '8px', border: '1px solid #10b98150', fontWeight: 'bold' }}>
          💡 Tipp: A saját gombostűidet megfoghatod és odébb húzhatod a finomhangoláshoz!
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        
        <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
          <label style={{ color: '#38bdf8', fontWeight: 'bold', display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>🔍 Meglévő fotós helyszínek szűrése</label>
          <input 
            type="text" 
            placeholder="Keresés névben, leírásban (pl. 'Urbex')..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: 'white', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155', position: 'relative' }}>
          <label style={{ color: '#f59e0b', fontWeight: 'bold', display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>✈️ Ugrás településre / címre</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="Város, utca (pl. Budapest)" 
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCitySearch(); }}
              style={{ flex: 1, padding: '10px 15px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: 'white', outline: 'none', boxSizing: 'border-box' }}
            />
            <button 
              onClick={handleCitySearch}
              style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Ugrás
            </button>
          </div>

          {cityResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: '15px', right: '15px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', zIndex: 1000, marginTop: '5px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
              {cityResults.map((res, i) => (
                <div 
                  key={i} 
                  onClick={() => handleSelectCity(res.lat, res.lon)}
                  style={{ padding: '10px 15px', borderBottom: '1px solid #1e293b', cursor: 'pointer', transition: 'background 0.2s', color: '#cbd5e1', fontSize: '0.9rem' }}
                  onMouseOver={e => e.currentTarget.style.background = '#1e293b'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  📍 {res.display_name}
                </div>
              ))}
              <div 
                onClick={() => setCityResults([])}
                style={{ padding: '8px', textAlign: 'center', background: '#ef444420', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
              >
                ✖ Bezárás
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
        
        {(newSpotLatLng || editingSpot) && (
          <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: editingSpot ? '2px solid #f59e0b' : '2px solid #38bdf8', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: editingSpot ? '#f59e0b' : '#38bdf8' }}>
                {editingSpot ? `✏️ "${editingSpot.title}" szerkesztése` : '📍 Új Helyszín Rögzítése'}
              </h3>
              <button onClick={() => { setNewSpotLatLng(null); setEditingSpot(null); }} style={{ background: 'transparent', color: '#94a3b8', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
            </div>

            <input placeholder="Helyszín neve (pl. Prédikálószék kilátó)" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} style={inputStyle} disabled={isUploading} />
            <textarea placeholder="Leírás: Miért jó ez a hely? Mikor érdemes idejönni? Hol lehet parkolni?" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} style={{...inputStyle, minHeight: '80px'}} disabled={isUploading} />
            
            <label style={{fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '5px'}}>
              {editingSpot ? 'Fotó cseréje (Opcionális)' : 'Helyszín fotója (Kötelező)'}
            </label>
            <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileSelect} style={{ color: '#94a3b8', marginBottom: '15px', width: '100%' }} disabled={isUploading} />
            
            {uploadPreview && (
              <div style={{marginTop: '10px', marginBottom: '20px', textAlign: 'center'}}>
                <img src={uploadPreview} alt="Előnézet" style={{maxHeight: '200px', borderRadius: '8px', border: '1px solid #334155'}} />
              </div>
            )}
            
            <button onClick={handleSaveSpot} disabled={isUploading} style={{ width: '100%', background: editingSpot ? '#f59e0b' : '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: isUploading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              {isUploading ? 'Mentés folyamatban ⏳...' : editingSpot ? 'Változtatások mentése 💾' : 'Helyszín Mentése 🚀'}
            </button>
          </div>
        )}

        <div style={{ height: '650px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155', zIndex: 1 }}>
          <MapContainer center={[47.4979, 19.0402]} zoom={7} style={{ height: '100%', width: '100%' }}>
            
            <MapCameraController targetPosition={mapTargetPosition} />

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapClickHandler onMapClick={handleMapClick} />

            {/* JAVÍTÁS: Átadtuk a ciklust az új SpotMarker komponensnek */}
            {locations.map((loc) => {
              const isOwnOrAdmin = loc.user_email === user.email || isAdmin; 
              return (
                <SpotMarker 
                  key={loc.id} 
                  loc={loc} 
                  isOwnOrAdmin={isOwnOrAdmin}
                  handleMarkerDragEnd={handleMarkerDragEnd}
                  handleToggleLike={handleToggleLike}
                  handleStartEdit={handleStartEdit}
                  handleDeleteLocation={handleDeleteLocation}
                  setFullscreenData={setFullscreenData}
                />
              )
            })}
          </MapContainer>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
