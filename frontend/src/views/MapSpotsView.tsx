import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BACKEND_URL } from '../utils/constants';
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

export default function MapSpotsView({ user, setFullscreenData }: MapSpotsViewProps) {
  const [locations, setLocations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Feltöltés állapotai
  const [newSpotLatLng, setNewSpotLatLng] = useState<{lat: number, lng: number} | null>(null);
  
  // Szerkesztés állapota (Ha nem null, egy meglévő helyszínt módosítunk)
  const [editingSpot, setEditingSpot] = useState<any | null>(null);

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

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
        // SZERKESZTÉS (PUT)
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
        // ÚJ LÉTREHOZÁSA (POST)
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
    if (!window.confirm("Biztosan törölni szeretnéd ezt a fotós helyszínt? A művelet nem vonható vissza!")) return;
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
        fetchLocations(searchQuery); // Frissítjük a térképet a lájkok miatt
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ fontSize: '2rem', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🌍 Fotós Helyszínek (Spot Finder)
        </h2>
        <div style={{ background: '#10b98120', color: '#10b981', padding: '8px 15px', borderRadius: '8px', border: '1px solid #10b98150', fontWeight: 'bold' }}>
          💡 Tipp: Kattints a térképre új helyért! A sajátjaidat szerkesztheted is.
        </div>
      </div>

      <div style={{ marginBottom: '20px', background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
        <input 
          type="text" 
          placeholder="🔍 Keresés helyszínre vagy leírásra (pl. 'Balaton', 'Napkelte', 'Urbex')..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: 'white', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
        
        {/* LÉTREHOZÓ / SZERKESZTŐ PANEL */}
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

        {/* TÉRKÉP */}
        <div style={{ height: '650px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155', zIndex: 1 }}>
          <MapContainer center={[47.4979, 19.0402]} zoom={7} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapClickHandler onMapClick={handleMapClick} />

            {locations.map((loc) => {
              const imageUrl = getImageUrl(loc.drive_file_id, loc.file_url);
              const isOwn = loc.user_email === user.email;
              const hasLiked = loc.user_liked === 1;

              return (
                <Marker key={loc.id} position={[loc.lat, loc.lng]}>
                  <Popup>
                    <div style={{ width: '230px', textAlign: 'center', fontFamily: 'sans-serif' }}>
                      <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '6px', color: '#0f172a' }}>{loc.title}</strong>
                      
                      <div 
                        onClick={() => setFullscreenData({url: imageUrl, title: loc.title})}
                        style={{ width: '100%', height: '120px', backgroundColor: '#f1f5f9', borderRadius: '6px', overflow: 'hidden', cursor: 'zoom-in', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <img src={imageUrl} alt={loc.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                      
                      <p style={{ fontSize: '0.85rem', color: '#334155', margin: '0 0 10px 0', textAlign: 'left', maxHeight: '80px', overflowY: 'auto', lineHeight: '1.4' }}>
                        {loc.description}
                      </p>
                      
                      {/* INTERAKTÍV PANEL: LÁJK, SZERKESZTÉS, TÖRLÉS */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', background: '#f8fafc', padding: '6px', borderRadius: '6px' }}>
                        
                        {/* Lájk gomb */}
                        <button 
                          onClick={() => handleToggleLike(loc.id)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '50px', backgroundColor: hasLiked ? '#ef444415' : 'transparent' }}
                        >
                          <span style={{ fontSize: '1.1rem' }}>{hasLiked ? '❤️' : '🤍'}</span>
                          <span style={{ fontWeight: 'bold', color: hasLiked ? '#ef4444' : '#64748b', fontSize: '0.85rem' }}>{loc.like_count || 0}</span>
                        </button>

                        {/* Saját menedzsment gombok */}
                        {isOwn && (
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button 
                              onClick={() => handleStartEdit(loc)}
                              title="Helyszín szerkesztése"
                              style={{ background: '#f59e0b20', color: '#d97706', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                            >
                              Szerkeszt
                            </button>
                            <button 
                              onClick={() => handleDeleteLocation(loc.id)}
                              title="Helyszín törlése"
                              style={{ background: '#ef444420', color: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                            >
                              Töröl
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '6px', textAlign: 'left' }}>
                        Felfedező: <b style={{color: '#475569'}}>{isOwn ? 'Te' : loc.user_name}</b><br/>
                        Naptár: {new Date(loc.created_at).toLocaleDateString('hu-HU')}
                      </div>
                    </div>
                  </Popup>
                </Marker>
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
