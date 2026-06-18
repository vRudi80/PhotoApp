import React, { useState } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/constants';

type Category = 'camera' | 'lens' | 'lighting' | 'drone' | 'accessory' | '';
type ConditionState = 'mint' | 'excellent' | 'good' | 'heavily_used' | 'for_parts';

interface BaseData {
  category: Category;
  title: string;
  brand: string;
  modelName: string;
  conditionState: ConditionState;
  price: string;
  currency: string;
  location: string;
  description: string;
}

interface CloudinaryImage {
  url: string;
  public_id: string;
}

interface MarketplaceAdFormProps {
  user: { email: string };
  onCancel: () => void; // Kötelező visszaléptető függvény a szülőtől
}

export default function MarketplaceAdForm({ user, onCancel }: MarketplaceAdFormProps) {
  const [baseData, setBaseData] = useState<BaseData>({
    category: '', title: '', brand: '', modelName: '', conditionState: 'excellent', price: '', currency: 'HUF', location: '', description: ''
  });

  const [specificAttributes, setSpecificAttributes] = useState<Record<string, any>>({});
  const [images, setImages] = useState<CloudinaryImage[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBaseData({ ...baseData, category: e.target.value as Category });
    setSpecificAttributes({});
  };

  const handleAttrChange = (key: string, value: any) => {
    setSpecificAttributes(prev => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const file = files[0];
      // 🎯 JAVÍTVA: BACKEND_URL hozzáadva
      const { data: sigData } = await axios.get(`${BACKEND_URL}/api/marketplace/upload-signature`);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', sigData.apiKey);
      formData.append('timestamp', sigData.timestamp);
      formData.append('signature', sigData.signature);
      formData.append('folder', 'marketplace');

      const uploadRes = await axios.post(`https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`, formData);

      setImages(prev => [...prev, { url: uploadRes.data.secure_url, public_id: uploadRes.data.public_id }]);
    } catch (error) {
      console.error('Képfeltöltési hiba:', error);
      alert('Hiba történt a kép feltöltése közben.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseData.category || !baseData.title || !baseData.price) {
      alert('Kérjük, töltsd ki a kötelező mezőket (Kategória, Cím, Ár)!');
      return;
    }

    setSubmitting(true);
    try {
      // 🎯 JAVÍTVA: BACKEND_URL hozzáadva
      const response = await axios.post(`${BACKEND_URL}/api/marketplace/ads`, {
        userEmail: user?.email,
        ...baseData,
        price: parseInt(baseData.price),
        specificAttributes,
        images
      });

      if (response.data.success) {
        alert('Hirdetés sikeresen feladva!');
        onCancel(); // Sikeres feladás után visszavisz a listázáshoz
      }
    } catch (error) {
      console.error('Hirdetésfeladási hiba:', error);
      alert('Nem sikerült menteni a hirdetést.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out', maxWidth: '800px', margin: '0 auto', color: '#f8fafc', padding: '0 20px' }}>
      
      {/* FEJLÉC VISSZA GOMBBAL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h2 style={{ margin: 0, fontSize: '2rem', color: '#f8fafc' }}>➕ Új hirdetés feladása</h2>
        <button type="button" onClick={onCancel} className="btn-cancel">
          ⬅ Mégsem / Vissza
        </button>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '30px', borderRadius: '16px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* ALAPADATOK */}
          <div className="form-grid">
            <div>
              <label className="market-label">Kategória *</label>
              <select value={baseData.category} onChange={handleCategoryChange} className="market-input">
                <option value="">Válassz kategóriát...</option>
                <option value="camera">Fényképezőgép váz</option>
                <option value="lens">Objektív</option>
                <option value="lighting">Stúdiótechnika / Világítás</option>
                <option value="drone">Drón / Stabilizátor</option>
                <option value="accessory">Egyéb kiegészítő</option>
              </select>
            </div>

            <div>
              <label className="market-label">Hirdetés címe *</label>
              <input type="text" required value={baseData.title} onChange={e => setBaseData({...baseData, title: e.target.value})} placeholder="pl. Sony Alpha 7 IV megkímélt állapotban" className="market-input" />
            </div>

            <div>
              <label className="market-label">Gyártó / Márka</label>
              <input type="text" value={baseData.brand} onChange={e => setBaseData({...baseData, brand: e.target.value})} placeholder="pl. Canon, Nikon, Sony, Sigma" className="market-input" />
            </div>

            <div>
              <label className="market-label">Pontos típus / Modell</label>
              <input type="text" value={baseData.modelName} onChange={e => setBaseData({...baseData, modelName: e.target.value})} placeholder="pl. EOS R6 Mark II" className="market-input" />
            </div>

            <div>
              <label className="market-label">Állapot</label>
              <select value={baseData.conditionState} onChange={e => setBaseData({...baseData, conditionState: e.target.value as ConditionState})} className="market-input">
                <option value="mint">Újszerű / Dobozos (Mint)</option>
                <option value="excellent">Kiváló állapotú (Excellent)</option>
                <option value="good">Megkímélt / Használt (Good)</option>
                <option value="heavily_used">Erősen használt</option>
                <option value="for_parts">Hibás / Alkatrésznek</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
              <div>
                <label className="market-label">Ár *</label>
                <input type="number" required value={baseData.price} onChange={e => setBaseData({...baseData, price: e.target.value})} placeholder="Összeg" className="market-input" />
              </div>
              <div>
                <label className="market-label">Pénznem</label>
                <select value={baseData.currency} onChange={e => setBaseData({...baseData, currency: e.target.value})} className="market-input">
                  <option value="HUF">HUF</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="market-label">Helyszín / Átvétel helye</label>
              <input type="text" value={baseData.location} onChange={e => setBaseData({...baseData, location: e.target.value})} placeholder="pl. Budapest, XI. kerület / Győr" className="market-input" />
            </div>
          </div>

          {/* DINAMIKUS FOTÓS MEZŐK */}
          {baseData.category && (
            <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '20px', borderRadius: '12px', border: '1px dashed #475569' }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#38bdf8', fontSize: '1.2rem', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
                Technikai részletek ({baseData.category})
              </h3>
              
              {baseData.category === 'camera' && (
                <div className="form-grid">
                  <div>
                    <label className="market-label">Expószám</label>
                    <input type="number" value={specificAttributes.shutter_count || ''} onChange={e => handleAttrChange('shutter_count', e.target.value)} placeholder="pl. 24150" className="market-input" />
                  </div>
                  <div>
                    <label className="market-label">Szenzorméret</label>
                    <select value={specificAttributes.sensor_size || ''} onChange={e => handleAttrChange('sensor_size', e.target.value)} className="market-input">
                      <option value="">Válassz...</option>
                      <option value="full-frame">Full-Frame</option>
                      <option value="aps-c">APS-C</option>
                      <option value="m43">Micro Four Thirds (M4/3)</option>
                      <option value="medium-format">Középformátum</option>
                    </select>
                  </div>
                </div>
              )}

              {baseData.category === 'lens' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  <div>
                    <label className="market-label">Bajonett (Mount)</label>
                    <input type="text" value={specificAttributes.mount || ''} onChange={e => handleAttrChange('mount', e.target.value)} placeholder="pl. Sony E" className="market-input" />
                  </div>
                  <div>
                    <label className="market-label">Gyújtótávolság</label>
                    <input type="text" value={specificAttributes.focal_length || ''} onChange={e => handleAttrChange('focal_length', e.target.value)} placeholder="pl. 50mm" className="market-input" />
                  </div>
                  <div>
                    <label className="market-label">Szűrőmenet (mm)</label>
                    <input type="number" value={specificAttributes.filter_size || ''} onChange={e => handleAttrChange('filter_size', e.target.value)} placeholder="pl. 77" className="market-input" />
                  </div>
                </div>
              )}

              {baseData.category === 'lighting' && (
                <div className="form-grid">
                  <div>
                    <label className="market-label">Teljesítmény (W/GN)</label>
                    <input type="text" value={specificAttributes.power || ''} onChange={e => handleAttrChange('power', e.target.value)} placeholder="pl. 400W" className="market-input" />
                  </div>
                  <div>
                    <label className="market-label">Fényterelő csatlakozás</label>
                    <input type="text" value={specificAttributes.modifier_mount || ''} onChange={e => handleAttrChange('modifier_mount', e.target.value)} placeholder="pl. Bowens" className="market-input" />
                  </div>
                </div>
              )}

              {baseData.category === 'drone' && (
                <div className="form-grid">
                  <div>
                    <label className="market-label">Akku ciklusok</label>
                    <input type="number" value={specificAttributes.battery_cycles || ''} onChange={e => handleAttrChange('battery_cycles', e.target.value)} placeholder="pl. 15" className="market-input" />
                  </div>
                  <div>
                    <label className="market-label">Súly / EU Kat.</label>
                    <input type="text" value={specificAttributes.drone_class || ''} onChange={e => handleAttrChange('drone_class', e.target.value)} placeholder="pl. 249g / C0" className="market-input" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LEÍRÁS */}
          <div>
            <label className="market-label">Részletes leírás</label>
            <textarea rows={5} value={baseData.description} onChange={e => setBaseData({...baseData, description: e.target.value})} placeholder="Írd le a termék állapotát, tartozékait, esetleges hibáit..." className="market-input" style={{ resize: 'vertical' }} />
          </div>

          {/* KÉPFELTÖLTÉS */}
          <div>
            <label className="market-label">Termék fotók</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <label className="file-upload-btn">
                <span>{uploading ? 'Feltöltés... ⏳' : '📷 Fájl kiválasztása'}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} style={{ display: 'none' }} />
              </label>
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Válassz képeket az eszközről</span>
            </div>

            {/* Kép előnézet */}
            {images.length > 0 && (
              <div style={{ display: 'flex', gap: '15px', marginTop: '15px', flexWrap: 'wrap' }}>
                {images.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #334155' }}>
                    <img src={img.url} alt={`Preview ${idx}`} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                    {idx === 0 && (
                      <div style={{ position: 'absolute', bottom: 0, width: '100%', background: 'rgba(16, 185, 129, 0.9)', color: 'white', fontSize: '0.7rem', textAlign: 'center', padding: '2px 0', fontWeight: 'bold' }}>Borítókép</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BEKÜLDÉS */}
          <div>
            <button type="submit" disabled={submitting || uploading} className="market-btn-submit">
              {submitting ? 'Mentés folyamatban... ⏳' : '🚀 Hirdetés Feladása'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .market-label { display: block; color: #94a3b8; font-size: 0.9rem; margin-bottom: 8px; font-weight: 600; }
        .market-input { width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #334155; color: #f8fafc; padding: 12px 15px; border-radius: 8px; font-size: 1rem; transition: all 0.2s; }
        .market-input:focus { outline: none; border-color: #38bdf8; box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2); }
        .market-input option { background: #0f172a; color: #f8fafc; }
        .file-upload-btn { background: #334155; color: #f8fafc; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; border: 1px solid #475569; transition: all 0.2s; display: inline-block; }
        .file-upload-btn:hover { background: #475569; border-color: #94a3b8; }
        .market-btn-submit { width: 100%; background: linear-gradient(135deg, #ec4899, #be185d); color: white; border: none; padding: 15px 24px; border-radius: 12px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4); transition: all 0.2s; font-size: 1.1rem; }
        .market-btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(236, 72, 153, 0.6); }
        .market-btn-submit:disabled { background: #475569; box-shadow: none; cursor: not-allowed; color: #94a3b8; }
        .btn-cancel { background: transparent; color: #94a3b8; border: 1px solid #475569; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .btn-cancel:hover { color: #f8fafc; border-color: #94a3b8; background: #334155; }
      `}</style>
    </div>
  );
}
