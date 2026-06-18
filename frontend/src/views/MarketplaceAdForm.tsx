import React, { useState } from 'react';
import axios from 'axios'; // vagy az általad használt API hívó

export default function MarketplaceAdForm({ user }) {
  const [baseData, setBaseData] = useState({
    category: '',
    title: '',
    brand: '',
    modelName: '',
    price: '',
    description: ''
  });

  const [specificAttributes, setSpecificAttributes] = useState({});
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Kategória váltás kezelése
  const handleCategoryChange = (e) => {
    setBaseData({ ...baseData, category: e.target.value });
    setSpecificAttributes({}); // Töröljük a régi specifikus mezőket
  };

  // Képfeltöltés közvetlenül a Cloudinary-ra
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      // 1. Aláírás lekérése a saját backendünkről
      const { data: sigData } = await axios.get('/api/marketplace/upload-signature');
      
      // 2. FormData összeállítása a Cloudinary-nak
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', sigData.apiKey);
      formData.append('timestamp', sigData.timestamp);
      formData.append('signature', sigData.signature);
      formData.append('folder', 'marketplace');

      // 3. Küldés a Cloudinary API-ra
      const uploadRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`,
        formData
      );

      // 4. A sikeresen feltöltött kép mentése a state-be
      setImages(prev => [...prev, {
        url: uploadRes.data.secure_url,
        public_id: uploadRes.data.public_id
      }]);
    } catch (error) {
      console.error('Képfeltöltési hiba:', error);
      alert('Sikertelen képfeltöltés!');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="marketplace-form-container">
      <h2>Új hirdetés feladása</h2>
      
      {/* Alapadatok */}
      <select value={baseData.category} onChange={handleCategoryChange}>
        <option value="">Válassz kategóriát...</option>
        <option value="camera">Fényképezőgép váz</option>
        <option value="lens">Objektív</option>
        <option value="drone">Drón</option>
      </select>

      {/* DINAMIKUS MEZŐK */}
      {baseData.category === 'camera' && (
        <div className="dynamic-fields">
          <input 
            type="number" 
            placeholder="Expószám (Shutter count)" 
            onChange={(e) => setSpecificAttributes({...specificAttributes, shutter_count: e.target.value})}
          />
          <select onChange={(e) => setSpecificAttributes({...specificAttributes, sensor_size: e.target.value})}>
            <option value="">Szenzorméret</option>
            <option value="full-frame">Full-Frame</option>
            <option value="aps-c">APS-C</option>
          </select>
        </div>
      )}

      {baseData.category === 'lens' && (
        <div className="dynamic-fields">
          <input 
            type="text" 
            placeholder="Bajonett (pl. Canon RF, Sony E)" 
            onChange={(e) => setSpecificAttributes({...specificAttributes, mount: e.target.value})}
          />
        </div>
      )}

      {/* Képfeltöltő */}
      <div className="image-upload-section">
        <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
        {uploading && <span>Feltöltés folyamatban... ⏳</span>}
        
        <div className="image-preview">
          {images.map((img, idx) => (
            <img key={idx} src={img.url} alt={`Feltöltött kép ${idx+1}`} width={100} />
          ))}
        </div>
      </div>
      
      {/* Mentés gomb (A teljes state elküldése a /api/marketplace/ads végpontra) */}
      <button onClick={() => console.log('Itt megy a backendre az összes adat:', { ...baseData, specificAttributes, images })}>
        Hirdetés Feladása
      </button>
    </div>
  );
}
