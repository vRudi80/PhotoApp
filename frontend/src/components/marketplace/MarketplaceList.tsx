import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/constants';

interface AdItem {
  _id: string;
  id?: number; // MySQL ID esetén
  title: string;
  brand: string;
  modelName: string;
  price: number;
  currency: string;
  location: string;
  category: string;
  conditionState: string;
  images: Array<{ url: string; public_id: string }>;
  createdAt: string;
  advertiser_name?: string; // 👈 A backendről érkező hirdető neve
}

interface MarketplaceListProps {
  user: { email: string };
  onNavigateToCreate: () => void;
  onNavigateToDetails: (id: string | number) => void; // 👈 Új prop a megnyitáshoz
}

export default function MarketplaceList({ user, onNavigateToCreate, onNavigateToDetails }: MarketplaceListProps) {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
  try {
    setLoading(true);
    const response = await axios.get(`${BACKEND_URL}/api/marketplace/ads`);
    
    // DEBUG: Nézzük meg, mi jön a szervertől
    console.log("Szerver válasza:", response.data); 
    
    // Feltételezve, hogy a szerver közvetlenül a hirdetések tömbjét küldi:
    setAds(response.data); 
  } catch (error) {
    console.error('Hiba a hirdetések lekérésekor:', error);
  } finally {
    setLoading(false);
  }
};
  const filteredAds = ads.filter(ad => {
    const safeTitle = ad.title || '';
    const safeBrand = ad.brand || '';
    const safeModelName = ad.modelName || '';

    const matchesSearch = safeTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          safeBrand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          safeModelName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '' || ad.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getConditionLabel = (state: string) => {
    const labels: Record<string, string> = {
      mint: 'Újszerű', excellent: 'Kiváló', good: 'Megkímélt', heavily_used: 'Használt', for_parts: 'Hibás'
    };
    return labels[state] || state;
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', maxWidth: '1200px', margin: '0 auto', color: '#f8fafc', padding: '0 20px' }}>
      
      {/* FEJLÉC ÉS ÚJ HIRDETÉS GOMB */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800, background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            📸 Fotós Piactér
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#94a3b8' }}>Böngéssz a prémium használt és új felszerelések között</p>
        </div>
        
        <button onClick={onNavigateToCreate} className="market-btn-accent">
          ➕ Új hirdetés feladása
        </button>
      </div>

      {/* KERESŐ ÉS SZŰRŐ SÁV */}
      <div style={{ background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(12px)', border: '1px solid #334155', padding: '20px', borderRadius: '16px', display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="Keresés márka, típus vagy cím alapján..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="market-search-input"
        />
        <select 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="market-filter-select"
        >
          <option value="">Összes kategória</option>
          <option value="camera">Fényképezőgép váz</option>
          <option value="lens">Objektív</option>
          <option value="lighting">Stúdiótechnika</option>
          <option value="drone">Drón / Stabilizátor</option>
          <option value="accessory">Egyéb kiegészítő</option>
        </select>
      </div>

      {/* BETÖLTÉS VAGY RÁCS */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem', color: '#38bdf8' }}>Hirdetések betöltése... ⏳</div>
      ) : filteredAds.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '16px', border: '1px solid #334155', color: '#94a3b8' }}>
          Nem találtunk a keresésnek megfelelő hirdetést.
        </div>
      ) : (
        <div className="market-grid">
          {filteredAds.map((ad) => (
            /* 👈 IDE KERÜLT AZ ONCLICK KATTINTÁSRA VALÓ MEGNYITÁS (MySQL id vagy MongoDB _id támogatással) */
            <div key={ad._id} className="market-card" onClick={() => onNavigateToDetails(ad.id || ad._id)} style={{ cursor: 'pointer' }}>
             <div className="card-image-wrapper">
  {/* Itt ellenőrizzük az images tömböt ÉS a cover_image stringet is */}
  {(ad.images && ad.images.length > 0) ? (
    <img src={ad.images[0].url} alt={ad.title} className="card-image" />
  ) : (ad as any).cover_image ? (
    <img src={(ad as any).cover_image} alt={ad.title} className="card-image" />
  ) : (
    <div className="no-image">📷 Nincs kép</div>
  )}
  <span className="card-badge">{getConditionLabel(ad.conditionState)}</span>
</div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1 }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 'bold' }}>
                  {ad.brand} {ad.modelName}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', height: '2.8rem' }}>
                  {ad.title}
                </h3>
                
                {/* 👈 KIÍRJUK A FELTÖLTŐ / HIRDETŐ NEVÉT */}
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '5px' }}>
                  👤 Hirdető: <span style={{ color: '#cbd5e1' }}>{ad.advertiser_name || 'Felhasználó'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #1e293b' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#f43f5e' }}>
                    {ad.price.toLocaleString()} {ad.currency}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>📍 {ad.location || 'Országos'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .market-btn-accent { background: linear-gradient(135deg, #38bdf8, #6366f1); color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3); transition: all 0.2s; }
        .market-btn-accent:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5); }
        .market-search-input { flex: 2; min-width: 250px; background: #0f172a; border: 1px solid #334155; color: white; padding: 12px 15px; border-radius: 8px; font-size: 1rem; }
        .market-search-input:focus, .market-filter-select:focus { outline: none; border-color: #38bdf8; }
        .market-filter-select { flex: 1; min-width: 180px; background: #0f172a; border: 1px solid #334155; color: white; padding: 12px 15px; border-radius: 8px; }
        .market-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; }
        .market-card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; transition: all 0.3s; }
        .market-card:hover { transform: translateY(-5px); border-color: #475569; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
        .card-image-wrapper { position: relative; height: 180px; background: #0f172a; }
        .card-image { width: 100%; height: 100%; object-fit: cover; }
        .no-image { display: flex; align-items: center; justify-content: center; height: 100%; color: #475569; }
        .card-badge { position: absolute; top: 12px; right: 12px; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(4px); color: #f8fafc; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; border: 1px solid #334155; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
