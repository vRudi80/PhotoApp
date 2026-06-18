import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/constants';

interface MarketplaceAdFormProps {
  user: { email: string };
  onCancel: () => void;
  adId?: string | number | null;
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
  const [shutterCount, setShutterCount] = useState(''); // Új mező
  
  const [images, setImages] = useState<Array<{ url: string; public_id: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (adId) {
      const fetchAdForEdit = async () => {
        try {
          const response = await axios.get(`${BACKEND_URL}/api/marketplace/ads/${adId}`);
          const ad = Array.isArray(response.data) ? response.data[0] : response.data;

          if (ad) {
            setTitle(ad.title || '');
            setBrand(ad.brand || '');
            setModelName(ad.model_name || ad.modelName || '');
            setCategory(ad.category || 'camera');
            setConditionState(ad.condition_state || ad.conditionState || 'good');
            setPrice(ad.price ? ad.price.toString() : '');
            setCurrency(ad.currency || 'HUF');
            setLocation(ad.location || '');
            setDescription(ad.description || '');
            // Rekeszszámláló kinyerése a specific_attributes-ből (ha létezik)
            if (ad.specific_attributes?.shutterCount) {
                setShutterCount(ad.specific_attributes.shutterCount);
            }
            setImages(ad.images || []); 
          }
        } catch (error) {
          console.error('Hiba a hirdetés betöltésekor:', error);
        }
      };
      fetchAdForEdit();
    }
  }, [adId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { data: sigData } = await axios.get(`${BACKEND_URL}/api/marketplace/upload-signature`, { withCredentials: true });

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
      alert('Sikertelen képfeltöltés.');
    } finally {
      setUploading(false);
    }
  };

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
    
    const payload = {
      userEmail: user.email,
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
      specificAttributes: { shutterCount } // Ide kerül a rekeszszámláló
    };

    try {
      if (adId) {
        await axios.put(`${BACKEND_URL}/api/marketplace/ads/${adId}`, payload, { withCredentials: true });
        alert('Hirdetés frissítve!');
      } else {
        await axios.post(`${BACKEND_URL}/api/marketplace/ads`, payload, { withCredentials: true });
        alert('Hirdetés feladva!');
      }
      onCancel();
    } catch (error) {
      console.error('Mentési hiba:', error);
      alert('Mentés sikertelen.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', color: '#f8fafc', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', color: '#38bdf8' }}>
          {adId ? '📝 Szerkesztés' : '➕ Új hirdetés'}
        </h1>
        <button onClick={onCancel} style={{ background: '#334155', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>
          ← Mégsem
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ background: '#1e293b', padding: '30px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ color: '#94a3b8' }}>Kategória *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155', color: 'white' }}>
              <option value="camera">Fényképezőgép váz</option>
              <option value="lens">Objektív</option>
              <option value="lighting">Stúdiótechnika</option>
              <option value="drone">Drón / Stabilizátor</option>
              <option value="accessory">Egyéb</option>
            </select>
          </div>
          <div>
            <label style={{ color: '#94a3b8' }}>Hirdetés címe *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155', color: 'white' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            <div>
                <label style={{ color: '#94a3b8' }}>Márka</label>
                <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} style={{ width: '100%', background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155', color: 'white' }} />
            </div>
            <div>
                <label style={{ color: '#94a3b8' }}>Típus/Modell</label>
                <input type="text" value={modelName} onChange={(e) => setModelName(e.target.value)} style={{ width: '100%', background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155', color: 'white' }} />
            </div>
            <div>
                <label style={{ color: '#94a3b8' }}>Rekeszszámláló (Shutter)</label>
                <input type="number" value={shutterCount} onChange={(e) => setShutterCount(e.target.value)} placeholder="pl. 12000" style={{ width: '100%', background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155', color: 'white' }} />
            </div>
        </div>

        <div>
          <label style={{ color: '#94a3b8' }}>Részletes leírás</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} style={{ width: '100%', background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155', color: 'white' }} />
        </div>

        <button type="submit" disabled={submitting} style={{ background: 'linear-gradient(135deg, #38bdf8, #6366f1)', color: 'white', padding: '14px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
          {submitting ? 'Folyamatban...' : adId ? 'Mentés' : 'Hirdetés élesítése'}
        </button>
      </form>
    </div>
  );
}
