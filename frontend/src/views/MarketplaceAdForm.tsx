import React, { useState } from 'react';
import axios from 'axios';

// ==========================================
// TYPESCRIPT INTERFACES (TÍPUSDEFINÍCIÓK)
// ==========================================
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

export default function MarketplaceAdForm({ user }: { user: { email: string } }) {
  // Alapadatok state
  const [baseData, setBaseData] = useState<BaseData>({
    category: '',
    title: '',
    brand: '',
    modelName: '',
    conditionState: 'excellent',
    price: '',
    currency: 'HUF',
    location: '',
    description: ''
  });

  // Dinamikus JSON attribútumok (Fotós specifikus mezők)
  const [specificAttributes, setSpecificAttributes] = useState<Record<string, any>>({});
  const [images, setImages] = useState<CloudinaryImage[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Kategóriaváltás kezelése (üríti a specifikus mezőket, hogy ne keveredjenek)
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBaseData({ ...baseData, category: e.target.value as Category });
    setSpecificAttributes({});
  };

  // Dinamikus mezők értékváltozásának kezelése
  const handleAttrChange = (key: string, value: any) => {
    setSpecificAttributes(prev => ({ ...prev, [key]: value }));
  };

  // Képfeltöltés Cloudinary-ra (Backend aláírással)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      // Csak az első kijelölt fájlt töltjük fel most (bővíthető loop-ra)
      const file = files[0];
      
      // 1. Aláírás kérése a backendtől
      const { data: sigData } = await axios.get('/api/marketplace/upload-signature');

      // 2. FormData összeállítása a Cloudinary-nak
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', sigData.apiKey);
      formData.append('timestamp', sigData.timestamp);
      formData.append('signature', sigData.signature);
      formData.append('folder', 'marketplace');

      // 3. Közvetlen feltöltés a Cloudinary API-ra
      const uploadRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`,
        formData
      );

      setImages(prev => [...prev, {
        url: uploadRes.data.secure_url,
        public_id: uploadRes.data.public_id
      }]);
    } catch (error) {
      console.error('Képfeltöltési hiba:', error);
      alert('Hiba történt a kép feltöltése közben.');
    } finally {
      setUploading(false);
    }
  };

  // Hirdetés mentése (Beküldés a backendre)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseData.category || !baseData.title || !baseData.price) {
      alert('Kérjük, töltsd ki a kötelező mezőket (Kategória, Cím, Ár)!');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post('/api/marketplace/ads', {
        userEmail: user?.email,
        ...baseData,
        price: parseInt(baseData.price),
        specificAttributes,
        images
      });

      if (response.data.success) {
        alert('Hirdetés sikeresen feladva!');
        // Itt átirányíthatod a felhasználót a listázásra vagy a saját hirdetéseihez
      }
    } catch (error) {
      console.error('Hirdetésfeladási hiba:', error);
      alert('Nem sikerült menteni a hirdetést.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Új hirdetés feladása</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 1. SZEKCIÓ: ALAPADATOK */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Kategória *</label>
            <select 
              value={baseData.category} 
              onChange={handleCategoryChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Válassz kategóriát...</option>
              <option value="camera">Fényképezőgép váz</option>
              <option value="lens">Objektív</option>
              <option value="lighting">Stúdiótechnika / Világítás</option>
              <option value="drone">Drón / Stabilizátor</option>
              <option value="accessory">Egyéb kiegészítő</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Hirdetés címe *</label>
            <input 
              type="text"
              required
              value={baseData.title}
              onChange={e => setBaseData({...baseData, title: e.target.value})}
              placeholder="pl. Sony Alpha 7 IV megkímélt állapotban"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Gyártó / Márka</label>
            <input 
              type="text"
              value={baseData.brand}
              onChange={e => setBaseData({...baseData, brand: e.target.value})}
              placeholder="pl. Canon, Nikon, Sony, Sigma"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Pontos típus / Modell</label>
            <input 
              type="text"
              value={baseData.modelName}
              onChange={e => setBaseData({...baseData, modelName: e.target.value})}
              placeholder="pl. EOS R6 Mark II"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Állapot</label>
            <select 
              value={baseData.conditionState} 
              onChange={e => setBaseData({...baseData, conditionState: e.target.value as ConditionState})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="mint">Újszerű / Dobozos (Mint)</option>
              <option value="excellent">Kiváló állapotú (Excellent)</option>
              <option value="good">Megkímélt / Használt (Good)</option>
              <option value="heavily_used">Erősen használt</option>
              <option value="for_parts">Hibás / Alkatrésznek</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Ár *</label>
              <input 
                type="number"
                required
                value={baseData.price}
                onChange={e => setBaseData({...baseData, price: e.target.value})}
                placeholder="Összeg"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Pénznem</label>
              <select 
                value={baseData.currency}
                onChange={e => setBaseData({...baseData, currency: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="HUF">HUF</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Helyszín / Átvétel helye</label>
            <input 
              type="text"
              value={baseData.location}
              onChange={e => setBaseData({...baseData, location: e.target.value})}
              placeholder="pl. Budapest, XI. kerület / Győr"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* 2. SZEKCIÓ: DINAMIKUS FOTÓS MEZŐK */}
        {baseData.category && (
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200 space-y-4">
            <h3 className="text-md font-semibold text-gray-700 border-b pb-2">Technikai részletek ({baseData.category})</h3>
            
            {/* KAMERA MEZŐK */}
            {baseData.category === 'camera' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Expószám / Tükörfelcsapás számláló</label>
                  <input 
                    type="number"
                    value={specificAttributes.shutter_count || ''}
                    onChange={e => handleAttrChange('shutter_count', e.target.value)}
                    placeholder="pl. 24150"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Szenzorméret</label>
                  <select 
                    value={specificAttributes.sensor_size || ''} 
                    onChange={e => handleAttrChange('sensor_size', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  >
                    <option value="">Válassz...</option>
                    <option value="full-frame">Full-Frame</option>
                    <option value="aps-c">APS-C</option>
                    <option value="m43">Micro Four Thirds (M4/3)</option>
                    <option value="medium-format">Középformátum (Medium Format)</option>
                  </select>
                </div>
              </div>
            )}

            {/* OBJEKTÍV MEZŐK */}
            {baseData.category === 'lens' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Bajonett / Csatlakozás (Mount)</label>
                  <input 
                    type="text"
                    value={specificAttributes.mount || ''}
                    onChange={e => handleAttrChange('mount', e.target.value)}
                    placeholder="pl. Sony E, Canon RF, Nikon Z"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Gyújtótávolság</label>
                  <input 
                    type="text"
                    value={specificAttributes.focal_length || ''}
                    onChange={e => handleAttrChange('focal_length', e.target.value)}
                    placeholder="pl. 50mm / 24-70mm"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Szűrőmenet mérete (mm)</label>
                  <input 
                    type="number"
                    value={specificAttributes.filter_size || ''}
                    onChange={e => handleAttrChange('filter_size', e.target.value)}
                    placeholder="pl. 77"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
              </div>
            )}

            {/* VILÁGÍTÁS MEZŐK */}
            {baseData.category === 'lighting' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Teljesítmény (W / Kulcsszám)</label>
                  <input 
                    type="text"
                    value={specificAttributes.power || ''}
                    onChange={e => handleAttrChange('power', e.target.value)}
                    placeholder="pl. 400W / GN60"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Fényterelő csatlakozás</label>
                  <input 
                    type="text"
                    value={specificAttributes.modifier_mount || ''}
                    onChange={e => handleAttrChange('modifier_mount', e.target.value)}
                    placeholder="pl. Bowens, Elinchrom, Gyári"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
              </div>
            )}

            {/* DRÓN / STABILIZÁTOR MEZŐK */}
            {baseData.category === 'drone' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Akkumulátor ciklusok száma</label>
                  <input 
                    type="number"
                    value={specificAttributes.battery_cycles || ''}
                    onChange={e => handleAttrChange('battery_cycles', e.target.value)}
                    placeholder="pl. 15"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Súly / EU Kategória</label>
                  <input 
                    type="text"
                    value={specificAttributes.drone_class || ''}
                    onChange={e => handleAttrChange('drone_class', e.target.value)}
                    placeholder="pl. 249g / C0 osztály"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. SZEKCIÓ: LEÍRÁS */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Részletes leírás</label>
          <textarea
            rows={4}
            value={baseData.description}
            onChange={e => setBaseData({...baseData, description: e.target.value})}
            placeholder="Írd le a termék állapotát, tartozékait, esetleges hibáit..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        {/* 4. SZEKCIÓ: CLOUDINARY KÉPFELTÖLTÉS */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Termék fotók</label>
          <div className="flex items-center space-x-4">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {uploading && <span className="text-sm text-indigo-600 animate-pulse">Feltöltés a Cloudinary-ra... ⏳</span>}
          </div>

          {/* Kép előnézeti galéria */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            {images.map((img, idx) => (
              <div key={idx} className="relative group border rounded-md overflow-hidden bg-gray-100 h-24 flex items-center justify-center">
                <img src={img.url} alt={`Preview ${idx}`} className="object-cover h-full w-full" />
                {idx === 0 && (
                  <span className="absolute bottom-0 inset-x-0 bg-black bg-opacity-60 text-white text-[10px] text-center py-0.5 font-semibold">
                    Borítókép
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* BEKÜLDÉS GOMB */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
          >
            {submitting ? 'Mentés folyamatban... ⏳' : 'Hirdetés Feladása'}
          </button>
        </div>

      </form>
    </div>
  );
}
