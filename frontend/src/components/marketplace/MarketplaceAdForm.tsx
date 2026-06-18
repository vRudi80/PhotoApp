import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/constants';

interface MarketplaceAdFormProps {
  user: { email: string };
  onCancel: () => void;
  adId?: string | number | null; // 👈 Opcionális adId a szerkesztéshez
}

export default function MarketplaceAdForm({ user, onCancel, adId }: MarketplaceAdFormProps) {
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [modelName, setModelName] = useState('');
  const [category, setCategory] = useState('camera');
  const [conditionState, setConditionState] = useState('excellent');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('HUF');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  
  // Több kép kezelése tömbként
  const [images, setImages] = useState<Array<{ url: string; public_id: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 👈 SZERKESZTÉS: Ha van adId, betöltjük a meglévő hirdetés adatait a backendről
 useEffect(() => {
  if (adId) {
    const fetchAdForEdit = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/marketplace/ads/${adId}`);
        const ad = response.data; // Közvetlenül a hirdetés objektum
        
        console.log("DEBUG - Betöltött hirdetés:", ad); // 👈 EZT NÉZD MEG A KONZOLBAN!

        // Biztonságos értékadás:
        setTitle(ad.title || '');
        setBrand(ad.brand || '');
        setModelName(ad.model_name || ad.modelName || ''); // Támogatja mindkét formátumot
        setCategory(ad.category || 'camera');
        setConditionState(ad.condition_state || ad.conditionState || 'excellent');
        setPrice(ad.price ? ad.price.toString() : '');
        setCurrency(ad.currency || 'HUF');
        setLocation(ad.location || '');
        setDescription(ad.description || '');
        
        // Képek betöltése (biztosítsd, hogy tömböt kapj)
        setImages(Array.isArray(ad.images) ? ad.images : []); 
        
      } catch (error) {
        console.error('Hiba a hirdetés betöltésekor:', error);
      }
    };
    fetchAdForEdit();
  }
}, [adId]);

  // 👈 TÖBB KÉP FELTÖLTÉSE (Cloudinary)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // MÓDOSÍTÁS: átadjuk a hitelesítést (withCredentials), hogy a backend beengedje a kérést
        const { data: sigData } = await axios.get(
          `${BACKEND_URL}/api/marketplace/upload-signature`,
          { withCredentials: true }
        );

        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', sigData.apiKey);
        formData.append('timestamp', sigData.timestamp);
        formData.append('signature', sigData.signature);
        formData.append('folder', 'marketplace');

        const uploadRes = await axios.post(`https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`, formData);

        setImages(prev => [...prev, { url: uploadRes.data.secure_url, public_id: uploadRes.data.public_id }]);
      }
    } catch (error) {
      console.error('Képfeltöltési hiba:', error);
      alert('Sikertelen képfeltöltés. Kérlek győződj meg róla, hogy be vagy jelentkezve!');
    } finally {
      setUploading(false);
    }
  };

  // Kép eltávolítása a listából
  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) {
      alert('A cím és az ár megadása kötelező!');
      return;
    }

    setSubmitting(true);
   // A MarketplaceAdForm.tsx handleSubmit függvényében:
const payload = {
  userEmail: user.email, // 👈 Ez hiányzott a PUT kérésből!
  title,
  brand,
  modelName,
  category,
  conditionState,
  price: Number(price),
  currency,
  location,
  description,
  images,
  specificAttributes: {}
};

    try {
      // PONTOSÍTOTT FELTÉTEL: Csak akkor küldünk PUT-ot, ha valós, létező ID-nk van
      if (adId && adId !== '' && adId !== null) {
        await axios.put(`${BACKEND_URL}/api/marketplace/ads/${adId}`, payload, { withCredentials: true });
        alert('Hirdetés sikeresen frissítve! 🎉');
      } else {
        // Új hirdetés feladása mindig POST a gyökér útvonalra
        await axios.post(`${BACKEND_URL}/api/marketplace/ads`, payload, { withCredentials: true });
        alert('Hirdetés sikeresen feladva! 🎉');
      }
      onCancel();
    } catch (error) {
      console.error('Hiba a küldés során:', error);
      alert('Hiba történt a mentéskor. Ellenőrizd a jogosultságokat!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', color: '#f8fafc', padding: '20px', animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#38bdf8' }}>
          {adId ? '📝 Hirdetés szerkesztése' : '➕ Új hirdetés feladása'}
        </h1>
        <button onClick={onCancel} style={{ background: '#334155', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          ← Mégsem / Vissza
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8' }}>Kategória *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '12px', borderRadius: '8px' }}>
              <option value="camera">Fényképezőgép váz</option>
              <option value="lens">Objektív</option>
              <option value="lighting">Stúdiótechnika</option>
              <option value="drone">Drón / Stabilizátor</option>
              <option value="accessory">Egyéb kiegészítő</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8' }}>Hirdetés címe *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="pl. Eladó Canon 5D Mark III" style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '12px', borderRadius: '8px' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8' }}>Gyártó / Márka</label>
            <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="pl. Canon, Nikon, Sony" style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '12px', borderRadius: '8px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8' }}>Pontos típus / Modell</label>
            <input type="text" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="pl. EOS R6 Mark II" style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '12px', borderRadius: '8px' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8' }}>Állapot</label>
            <select value={conditionState} onChange={(e) => setConditionState(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '12px', borderRadius: '8px' }}>
              <option value="mint">Újszerű (Mint)</option>
              <option value="excellent">Kiváló állapotú (Excellent)</option>
              <option value="good">Megkímélt (Good)</option>
              <option value="heavily_used">Használt (Heavily Used)</option>
              <option value="for_parts">Hibás / Alkatrésznek (For Parts)</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8' }}>Ár *</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Összeg" style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '12px', borderRadius: '8px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8' }}>Pénznem</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '12px', borderRadius: '8px' }}>
              <option value="HUF">HUF</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8' }}>📍 Helyszín (Város)</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="pl. Budapest, Szeged, Győr" style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '12px', borderRadius: '8px' }} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8' }}>Részletes leírás</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Írd le a felszerelés részleteit, esetleges hibáit, tartozékait..." style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '12px', borderRadius: '8px', resize: 'vertical', fontFamily: 'inherit' }} />
        </div>

        {/* 📷 KÉPFELTÖLTÉS SZEKCIÓ */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8' }}>Képek feltöltése (Többet is kiválaszthatsz)</label>
          <input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={uploading} style={{ display: 'block', color: '#94a3b8' }} />
          {uploading && <p style={{ color: '#38bdf8', fontSize: '0.9rem', marginTop: '5px' }}>Képek feltöltése... ⏳</p>}
          
          {/* Előnézeti kis képek listája törlés gombbal */}
          {images.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '15px' }}>
              {images.map((img, idx) => (
                <div key={idx} style={{ position: 'relative', width: '90px', height: '70px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #334155' }}>
                  <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => removeImage(idx)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(244, 63, 94, 0.8)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={submitting} style={{ background: 'linear-gradient(135deg, #38bdf8, #6366f1)', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', transition: 'opacity 0.2s' }} >
          {submitting ? 'Mentés... ⏳' : adId ? '💾 Módosítások mentése' : '🚀 Hirdetés élesítése'}
        </button>

      </form>
    </div>
  );
}
