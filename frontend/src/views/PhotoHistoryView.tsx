import React, { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL } from '../utils/constants';
import VideoLoader from '../components/VideoLoader';
import PremiumPaywall from './PremiumPaywall'; 
import { useLanguage } from '../context/LanguageContext';
import { Search, Camera, BookOpen, Layers, Maximize2, Sparkles } from 'lucide-react';

const getAuthHeaders = () => {
  const token = localStorage.getItem('photoAppToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export default function PhotoHistoryView({ user }: { user: any }) {
  const { lang } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Prémium hozzáférés ellenőrzése (hasonlóan a MyAlbumView-hoz)
  const hasPremiumAccess = user && (user.isPremium || user.is_premium);

  useEffect(() => {
    if (!hasPremiumAccess) {
      setIsLoading(false);
      return;
    }

    fetch(`${BACKEND_URL}/api/premium/photo-history?lang=${lang}`, { headers: getAuthHeaders() })
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(err => console.error("Hiba az enciklopédia letöltésekor:", err))
      .finally(() => setIsLoading(false));
  }, [user, lang, hasPremiumAccess]);

  // Szupergyors kliensoldali keresőművelet
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item => 
      (item.photographer && item.photographer.toLowerCase().includes(term)) ||
      (item.title && item.title.toLowerCase().includes(term)) ||
      (item.explanation && item.explanation.toLowerCase().includes(term))
    );
  }, [items, searchTerm]);

  if (!hasPremiumAccess) {
    return (
      <div style={{ padding: '10px' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px', color: '#a78bfa' }}>
          <Sparkles color="#fbbf24" fill="#fbbf24" size={28} /> {lang === 'en' ? 'History Masters Gallery' : 'Fotóművészeti Nagyok Galériája'}
        </h2>
        <PremiumPaywall user={user} />
      </div>
    );
  }

  if (isLoading) return <VideoLoader />;

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* FEJLÉC ÉS KERESŐ SÁV */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-main)', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={24} /> {lang === 'en' ? 'Masters of Photography' : 'Fotóművészeti Mesterkártyák'}
          </h2>
          <small style={{ color: 'var(--text-muted)' }}>{lang === 'en' ? `Exclusive archive: ${items.length} historical masterpieces` : `Exkluzív tudásbázis: ${items.length} történelmi mestermű egy helyen`}</small>
        </div>

        <div style={{ position: 'relative', minWidth: '280px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder={lang === 'en' ? "Search photographer, artwork..." : "🔍 Keresés fotósra, műre, kontextusra..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 15px 10px 38px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* ALBUM RÁCSRENDSZER (GRID) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
        {filteredItems.map(item => (
          <div key={item.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
            
            {/* KÉPTÉR LIGHTBOX ÉS NAGYÍTÁS FUNKCIÓVAL */}
            <div 
              onClick={() => setLightboxImage(item.image_url)}
              style={{ height: '220px', width: '100%', background: '#000', position: 'relative', overflow: 'hidden', cursor: 'zoom-in' }}
              className="group"
            >
              <img src={item.image_url} alt={item.photographer} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                <Maximize2 color="white" size={20} />
              </div>
            </div>

            {/* ADATLAP SZAKMAI LEÍRÁSSAL */}
            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <div>
                <span style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Camera size={16} color="#a78bfa" /> {item.photographer}
                </span>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: '1.4' }}>
                  {item.title}
                </p>
              </div>

              <div style={{ height: '1px', background: 'var(--border-main)' }} />

              <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #a78bfa', fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-body)', flex: 1, maxHeight: '120px', overflowY: 'auto' }}>
                <div style={{ color: '#a78bfa', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <BookOpen size={12} /> {lang === 'en' ? 'Historical context' : 'Történelmi kontextus'}
                </div>
                {item.explanation || (lang === 'en' ? 'No archival description available.' : 'Ehhez a mesterműhöz nincs archív leírás rögzítve.')}
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* HA NINCS TALÁLAT */}
      {filteredItems.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-main)', fontStyle: 'italic' }}>
          {lang === 'en' ? 'No master kards match your search term.' : 'Egyetlen mesterkártya sem felel meg a keresési feltételeknek.'}
        </div>
      )}

      {/* BEÉPÍTETT LIGHTBOX KÉPNAGYÍTÓ MODAL */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, cursor: 'zoom-out' }}
        >
          <img src={lightboxImage} alt="Large historical preview" style={{ maxWidth: '92%', maxHeight: '92%', objectFit: 'contain', borderRadius: '6px', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)' }} />
        </div>
      )}

    </div>
  );
}
