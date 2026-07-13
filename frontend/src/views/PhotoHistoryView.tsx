import React, { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL } from '../utils/constants';
import VideoLoader from '../components/VideoLoader';
import PremiumPaywall from './PremiumPaywall';
import { useLanguage } from '../context/LanguageContext';
import { Search, Camera, BookOpen, Layers, Maximize2, Sparkles, AlertTriangle } from 'lucide-react';

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
  
  // 🎯 ÚJ: Állapot a valós hibaüzenetek (pl. Csalás elleni tiltás) transzparens kiírásához
  const [error, setError] = useState<string | null>(null);

  const hasPremiumAccess = user && (user.isPremium || user.is_premium);

  // FŐ ADATBETÖLTŐ FÜGGVÉNY
  const loadHistoryData = () => {
    // Ha a fül-szinkronizáció aktív kvízt lát, el sem indítjuk a hálózati kérést
    if (localStorage.getItem('photo_quiz_active') === 'true') {
      setError(lang === 'en' ? 'Anti-cheat protection active! Please finish your quiz first.' : 'CSALÁS ELLENI VÉDELEM: Jelenleg aktív kvízköröd van folyamatban! A puskázás elkerülése érdekében a történeti album zárolva van. Amennyiben bezártad az ablakot, nem befejezted a kvízt, akkor a rendszer 5 perc múlva oldja fel ezt az ablakot.');
      setItems([]);
      setIsLoading(false);
      return;
    }

    fetch(`${BACKEND_URL}/api/premium/photo-history?lang=${lang}`, { headers: getAuthHeaders() })
      .then(async res => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Szerveroldali hozzáférés megtagadva.");
        }
        return res.json();
      })
      .then(data => {
        setItems(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setItems([]);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!hasPremiumAccess) { setIsLoading(false); return; }
    loadHistoryData();
  }, [user, lang, hasPremiumAccess]);

  // 🎯 ÚJ: VILLÁMGYORS FÜL-KÖZI ANTI-CHEAT SZINKRONIZÁCIÓS MOTOR
  useEffect(() => {
    const runLiveTabCheck = () => {
      if (localStorage.getItem('photo_quiz_active') === 'true') {
        if (items.length > 0) {
          // Ha puskázási szándékkal hirtelen átvált az előre megnyitott fülre, azonnal megsemmisítjük a memóriát!
          setItems([]);
        }
        setError(lang === 'en' ? 'Anti-cheat protection active! Please finish your quiz first.' : '🎮 CSALÁS ELLENI VÉDELEM: Jelenleg aktív kvízköröd van folyamatban! A puskázás elkerülése érdekében az album lezárult.');
      }
    };

    // Ellenőrzés ablakfókusz és gyors belső timer alapján (ha egymás melletti ablakban csalna)
    window.addEventListener('focus', runLiveTabCheck);
    const cheatInterval = setInterval(runLiveTabCheck, 1000);

    return () => {
      window.removeEventListener('focus', runLiveTabCheck);
      clearInterval(cheatInterval);
    };
  }, [items, lang]);

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
          <Sparkles color="#fbbf24" fill="#fbbf24" size={28} /> {lang === 'en' ? 'History Gallery' : 'Fotótörténeti album'}
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
            <Layers size={24} /> {lang === 'en' ? 'Photo History Gallery' : 'Fotótörténeti album'}
          </h2>
          <small style={{ color: 'var(--text-muted)' }}>{lang === 'en' ? `Exclusive archive: ${items.length} historical masterpieces` : `Exkluzív tudásbázis: ${items.length} történelmi mestermű egy helyen`}</small>
        </div>

        {!error && (
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
        )}
      </div>

      {/* 🎯 ÚJ: HA HIBA VAN (PL. LOCK VAGY CHEAT DETECTED), EZT A PANEL JELENIK MEG A VALÓDI SZÖVEGGEL */}
      {error ? (
        <div style={{ padding: '40px 30px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', maxWidth: '600px', margin: '40px auto' }}>
          <AlertTriangle color="#ef4444" size={40} />
          <h3 style={{ margin: 0, color: '#f87171', fontSize: '1.15rem', fontWeight: 'bold' }}>Hozzáférés ideiglenesen korlátozva</h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: '1.6' }}>{error}</p>
        </div>
      ) : (
        /* ALBUM RÁCSRENDSZER */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
          {filteredItems.map(item => (
            <div key={item.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
              
              <div onClick={() => setLightboxImage(item.image_url)} style={{ height: '220px', width: '100%', background: '#000', position: 'relative', overflow: 'hidden', cursor: 'zoom-in' }}>
                <img src={item.image_url} alt={item.photographer} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                  <Maximize2 color="white" size={20} />
                </div>
              </div>

              <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div>
                  <span style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Camera size={16} color="#a78bfa" /> {item.photographer}
                  </span>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: '1.4' }}>{item.title}</p>
                </div>

                <div style={{ height: '1px', background: 'var(--border-main)' }} />

                <details style={{ background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-main)', overflow: 'hidden' }}>
                  <summary style={{ padding: '10px 12px', color: '#a78bfa', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', outline: 'none' }}>
                    <BookOpen size={12} /> {lang === 'en' ? 'Historical context' : 'Történelmi kontextus'}
                  </summary>
                  <div style={{ padding: '12px', fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-body)', borderTop: '1px solid var(--border-main)' }}>
                    {item.explanation || (lang === 'en' ? 'No archival description available.' : 'Ehhez a felvételhez nincs archív leírás rögzítve.')}
                  </div>
                </details>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* JAVÍTVA: Szövegkorrekció fotótörténeti kártyákra */}
      {!error && filteredItems.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-main)', fontStyle: 'italic' }}>
          {lang === 'en' ? 'No photo history cards match your search term.' : 'Egyetlen fotótörténeti kártya sem felel meg a keresési feltételeknek.'}
        </div>
      )}

      {lightboxImage && (
        <div onClick={() => setLightboxImage(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, cursor: 'zoom-out' }}>
          <img src={lightboxImage} alt="Large preview" style={{ maxWidth: '92%', maxHeight: '92%', objectFit: 'contain', borderRadius: '6px' }} />
        </div>
      )}

    </div>
  );
}
