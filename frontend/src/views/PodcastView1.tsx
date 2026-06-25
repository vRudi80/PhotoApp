import React, { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL } from '../utils/constants';
import VideoLoader from '../components/VideoLoader';
import { useLanguage } from '../context/LanguageContext';

export default function PodcastView() {
  const { lang } = useLanguage();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/podcast`)
      .then(res => res.json())
      .then(data => {
        setVideos(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error("Hiba a podcastok betöltésekor:", err))
      .finally(() => setLoading(false));
  }, []);

  // Azonnali, dinamikus keresés a címben és a leírásban egyszerre
  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      const query = searchQuery.toLowerCase();
      return (
        (video.title && video.title.toLowerCase().includes(query)) ||
        (video.description && video.description.toLowerCase().includes(query))
      );
    });
  }, [videos, searchQuery]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(lang === 'en' ? 'en-US' : 'hu-HU', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  if (loading) return <div style={{ padding: '80px 0' }}><VideoLoader /></div>;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', width: '100%', boxSizing: 'border-box' }}>
      
      {/* CÍMSOR ÉS REZSPONZÍV KERESŐSÁV SZAKASZ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingBottom: '15px', borderBottom: '1px solid #334155', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ margin: '0 0 5px 0', fontSize: '2rem', color: '#f8fafc', fontWeight: '800' }}>🎙️ {lang === 'en' ? 'Podcast Channel' : 'Képolvasók Podcast'}</h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
            {lang === 'en' ? 'Watch the latest episodes directly inside the portal!' : 'Nézd a legfrissebb adásokat közvetlenül a portálon belül!'}
          </p>
        </div>
        
        <input 
          type="text" 
          placeholder={lang === 'en' ? 'Search episodes...' : 'Keresés az adások között...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '10px 16px', width: '100%', maxWidth: '300px', backgroundColor: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '12px', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s' }}
          onFocus={(e) => e.currentTarget.style.borderColor = '#38bdf8'}
          onBlur={(e) => e.currentTarget.style.borderColor = '#334155'}
        />
      </div>

      {/* CSODÁS BENTO GALÉRIA RÁCS */}
      {filteredVideos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', fontStyle: 'italic' }}>
          🔍 {lang === 'en' ? 'No episodes found matching this query.' : 'Nem találtunk adást ezzel a kifejezéssel.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' }}>
          {filteredVideos.map((video) => (
            <div 
              key={video.id}
              onClick={() => setActiveVideoId(video.id)}
              className="podcast-bento-card"
              style={{ background: '#1e293b', borderRadius: '20px', overflow: 'hidden', border: '1px solid #334155', cursor: 'pointer', transition: 'all 0.2s ease-in-out', display: 'flex', flexDirection: 'column' }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#38bdf8'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = '#334155'; }}
            >
              {/* KÉP/BORÍTÓ SÁV LEJÁTSZÁS OVERLAY-JEL */}
              <div style={{ width: '100%', aspectRatio: '16/9', backgroundColor: '#000', position: 'relative', overflow: 'hidden' }}>
                <img src={video.thumbnail} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="play-overlay">
                  <div style={{ margin: 'auto', background: 'rgba(249, 115, 22, 0.95)', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
                    <span style={{ color: 'white', fontSize: '1.2rem', marginLeft: '3px' }}>▶</span>
                  </div>
                </div>
              </div>

              {/* SZÖVEGES RÉSZLETEK */}
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', marginBottom: '6px' }}>📅 {formatDate(video.publishedAt)}</div>
                  <h4 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '1.05rem', fontWeight: '700', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {video.title}
                  </h4>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {video.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* HELYBEN MEGNYÍLÓ SÖTÉT MOZI MODAL LEJÁTSZÓ */}
      {activeVideoId && (
        <div 
          onClick={() => setActiveVideoId(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', boxSizing: 'border-box' }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '850px', aspectRatio: '16/9', background: '#000', borderRadius: '24px', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
          >
            <iframe 
              src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1`}
              title="YouTube video player" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              allowFullScreen
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
