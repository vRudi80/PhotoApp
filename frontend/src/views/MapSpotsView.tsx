import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BACKEND_URL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';

// Javítás a Leaflet beépített ikonjainak megjelenítési hibájára React-ben
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

// Segéd komponens, ami érzékeli a térképre kattintást
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
  
  // Feltöltés állapota
  const [newSpotLatLng, setNewSpotLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

  const fetchLocations = async (search = '') => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/locations?search=${encodeURIComponent(search)}`);
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
    setNewSpotLatLng(latlng);
    setUploadTitle('');
    setUploadDesc('');
    setUploadFile(null);
    setUploadPreview(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadFile(file);
      setUploadPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadSpot = async () => {
    if (!uploadTitle || !uploadDesc || !uploadFile || !newSpotLatLng) {
      return alert("Kérlek adj meg címet, leírást és egy fotót!");
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('photo', uploadFile);
    formData.append('userEmail', user.email);
    formData.append('userName', user.name || user.email);
    formData.append('lat', newSpotLatLng.lat.toString());
    formData.append('lng', newSpotLatLng.lng.toString());
    formData.append('title', uploadTitle);
    formData.append('description', uploadDesc);

    try {
      const res = await fetch(`${BACKEND_URL}/api/locations`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        alert('Helyszín sikeresen rögzítve!');
        setNewSpotLatLng(null);
        fetchLocations(searchQuery);
      } else {
        const err = await res.json();
        alert(`Hiba: ${err.error}`);
      }
    } catch (e) {
      alert("Hálózati hiba!");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ fontSize: '2rem', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🌍 Fotós Helyszínek (Spot Finder)
        </h2>
        <div style={{ background: '#10b98120', color: '#10b981', padding: '8px 15px', borderRadius: '8px', border: '1px solid #10b98150', fontWeight: 'bold' }}>
          💡 Tipp: Kattints bárhova a térképen egy új helyszín hozzáadásához!
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
        
        {/* ÚJ HELYSZÍN ŰRLAP (Ha a térképre kattintottak) */}
        {newSpotLatLng && (
          <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '2px solid #38bdf8', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#38bdf8' }}>📍 Új Helyszín Rögzítése</h3>
              <button onClick={() => setNewSpotLatLng(null)} style={{ background: 'transparent', color: '#94a3b8', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
            </div>
            
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '15px' }}>
              Koordináták: {newSpotLatLng.lat.toFixed(5)}, {newSpotLatLng.lng.toFixed(5)}
            </p>

            <input placeholder="Helyszín neve (pl. Prédikálószék kilátó)" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} style={inputStyle} disabled={isUploading} />
            <textarea placeholder="Leírás: Miért jó ez a hely? Mikor érdemes idejönni? Hol lehet parkolni?" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} style={{...inputStyle, minHeight: '80px'}} disabled={isUploading} />
            
            <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileSelect} style={{ color: '#94a3b8', marginBottom: '15px', width: '100%' }} disabled={isUploading} />
            
            {uploadPreview && (
              <div style={{marginTop: '10px', marginBottom: '20px', textAlign: 'center'}}>
                <img src={uploadPreview} alt="Előnézet" style={{maxHeight: '200px', borderRadius: '8px', border: '1px solid #334155'}} />
              </div>
            )}
            
            <div style={{display: 'flex', gap: '10px'}}>
              <button onClick={handleUploadSpot} disabled={isUploading} style={{ flex: 1, background: isUploading ? '#475569' : '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: isUploading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                {isUploading ? 'Feltöltés folyamatban ⏳...' : 'Helyszín Mentése 🚀'}
              </button>
            </div>
          </div>
        )}

        {/* TÉRKÉP */}
        <div style={{ height: '600px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155', zIndex: 1 }}>
          <MapContainer center={[47.4979, 19.0402]} zoom={7} style={{ height: '100%', width: '100%' }}>
            {/* OpenStreetMap ingyenes és szép térkép rétege */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapClickHandler onMapClick={handleMapClick} />

            {locations.map((loc) => {
              const imageUrl = getImageUrl(loc.drive_file_id, loc.file_url);
              return (
                <Marker key={loc.id} position={[loc.lat, loc.lng]}>
                  <Popup>
                    <div style={{ width: '220px', textAlign: 'center' }}>
                      <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '8px', color: '#0f172a' }}>{loc.title}</strong>
                      
                      <div 
                        onClick={() => setFullscreenData({url: imageUrl, title: loc.title})}
                        style={{ width: '100%', height: '120px', backgroundColor: '#f1f5f9', borderRadius: '6px', overflow: 'hidden', cursor: 'zoom-in', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <img src={imageUrl} alt={loc.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                      
                      <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 10px 0', textAlign: 'left', maxHeight: '80px', overflowY: 'auto' }}>
                        {loc.description}
                      </p>
                      
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                        Felfedező: <b>{loc.user_name}</b><br/>
                        {new Date(loc.created_at).toLocaleDateString('hu-HU')}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
