import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';

interface MyArenaAlbumViewProps {
  user: any;
  setFullscreenData: (data: any) => void;
}

export default function MyArenaAlbumView({ user, setFullscreenData }: MyArenaAlbumViewProps) {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);

  const fetchAlbum = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/my-album?userEmail=${user?.email}`);
      if (res.ok) {
        setPhotos(await res.json());
      }
    } catch (e) {
      console.error("Hiba az album betöltésekor:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbum();
  }, [user]);

  if (loading) {
    return <div style={{ color: '#94a3b8', textAlign: 'center', padding: '50px' }}>⏳ Képtárad rendezése...</div>;
  }

  if (photos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 2rem', background: '#1e293b', borderRadius: '24px', border: '1px solid #334155' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🖼️</div>
        <h3 style={{ color: 'white', fontSize: '1.5rem', margin: '0 0 10px 0' }}>Az Aréna Képtárad még üres</h3>
        <p style={{ color: '#94a3b8', margin: 0 }}>Nevezz be a futó párbajok egyikébe, és a fotóid automatikusan bekerülnek ide!</p>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ color: 'white', margin: 0, fontSize: '1.8rem', fontWeight: 'bold' }}>🖼️ Aréna Képtáram</h2>
        <p style={{ color: '#94a3b8', margin: '5px 0 0 0' }}>Az összes fotód karrierje, elért sikerei és történelme egyetlen helyen.</p>
      </div>

      {/* FOTÓ RÁCS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
        {photos.map((photo) => (
          <div 
            key={photo.id}
            style={{ background: '#1e293b', borderRadius: '16px', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 8px 20px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', position: 'relative', transition: 'transform 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {/* ⚔️ VALÓDI AKTÍV HARC BADGE */}
            {photo.isCurrentlyActive && (
              <span style={{ position: 'absolute', top: '12px', left: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontWeight: 'bold', fontSize: '0.75rem', padding: '5px 10px', borderRadius: '50px', zIndex: 10, boxShadow: '0 4px 12px rgba(16,185,129,0.5)', border: '1px solid #34d39940', animation: 'pulse 2s infinite' }}>
                ⚔️ Harcban
              </span>
            )}

            {/* ÖSSZESÍTETT TRÓFEÁK A KÁRTYÁN */}
            {(photo.firstPlaces > 0 || photo.podiums > 0) && (
              <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: '8px', zIndex: 10, display: 'flex', gap: '8px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid #334155' }}>
                {photo.firstPlaces > 0 && <span style={{ color: '#fbbf24' }}>🥇 {photo.firstPlaces}</span>}
                {photo.podiums > photo.firstPlaces && <span style={{ color: '#cbd5e1' }}>🏆 {photo.podiums - photo.firstPlaces}</span>}
              </div>
            )}

            {/* KÉP ELŐNÉZET */}
            <div style={{ width: '100%', height: '180px', backgroundColor: '#000', overflow: 'hidden', position: 'relative' }}>
              <img 
                src={getImageUrl(null, photo.file_url)} 
                alt="" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onClick={() => setFullscreenData({ url: getImageUrl(null, photo.file_url), title: 'Galéria' })}
              />
            </div>

            {/* STATISZTIKAI SÁV & RÉSZLETEK GOMB */}
            <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0f172a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '12px', fontWeight: 'bold' }}>
                <span style={{ color: '#f59e0b' }}>⭐ {photo.totalLikes || 0} pont</span>
                <span style={{ color: '#38bdf8' }}>👁️ {photo.totalViews || 0} megtek.</span>
              </div>

              <button 
                onClick={() => setSelectedPhoto(photo)}
                style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', color: '#cbd5e1', padding: '8px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.borderColor = '#64748b'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.borderColor = '#475569'; }}
              >
                📊 Részletes Statisztika ({photo.history?.length || 0})
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 📊 RÉSZLETES FOTÓ KARRIER ÉS TÖRTÉNETI MODAL */}
      {selectedPhoto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '24px', width: '100%', maxWidth: '550px', maxHeight: '85vh', overflowY: 'auto', padding: '25px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
            
            <button onClick={() => setSelectedPhoto(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: '#1e293b', border: 'none', color: '#94a3b8', fontSize: '1.2rem', width: '35px', height: '35px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', center: 'center', justifyContent: 'center' }}>✕</button>
            
            <h3 style={{ color: 'white', margin: '0 0 5px 0', fontSize: '1.4rem', fontWeight: 'bold' }}>📊 Alkotás Életútja & Sikerei</h3>
            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 20px 0' }}>Feltöltve: {new Date(selectedPhoto.created_at).toLocaleDateString('hu-HU')}</p>
            
            {/* NAGY KÉP PREVIEW A MODALBAN */}
            <div style={{ width: '100%', height: '220px', backgroundColor: '#000', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px', border: '1px solid #334155' }}>
              <img src={getImageUrl(null, selectedPhoto.file_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>

            {/* KITÜNTETÉSEK ÖSSZESÍTŐ PANELJE */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#1e293b', padding: '12px', borderRadius: '12px', border: '1px solid #fbbf2440', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem' }}>🥇</div>
                <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '2px' }}>{selectedPhoto.firstPlaces} db</div>
                <div style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Első Helyezés</div>
              </div>
              <div style={{ background: '#1e293b', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e140', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem' }}>🏆</div>
                <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '2px' }}>{selectedPhoto.podiums} db</div>
                <div style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Dobogós Hely</div>
              </div>
            </div>

            {/* PÁRBAJ ELŐZMÉNYEK LISTÁJA */}
            <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold', marginBottom: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>⚔️ Részvételi Történet ({selectedPhoto.history?.length || 0} párbaj)</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedPhoto.history.map((h: any, hIdx: number) => {
                const isLive = h.is_topic_live === 1;
                const isWinner = Number(h.entry_rank) === 1;
                const isPodium = Number(h.entry_rank) <= 3;
                
                // Művészi keret a helyezéstől függően
                let rowBorder = '1px solid #1e293b';
                let rankBadgeColor = '#64748b';
                let rankText = `${h.entry_rank}. Hely`;
                
                if (isLive) {
                  rowBorder = '1px solid #10b98140';
                  rankBadgeColor = '#10b981';
                  rankText = `Jelenleg ${h.entry_rank}.`;
                } else if (isWinner) {
                  rowBorder = '1px solid #fbbf24';
                  rankBadgeColor = '#fbbf24';
                } else if (isPodium) {
                  rowBorder = '1px solid #a855f7';
                  rankBadgeColor = '#a855f7';
                }

                return (
                  <div key={hIdx} style={{ background: '#0f172a', border: rowBorder, padding: '12px 15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, marginRight: '10px' }}>
                      <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>{h.topic_title}</div>
                      <div style={{ display: 'flex', gap: '15px', marginTop: '4px', fontSize: '0.8rem', color: '#64748b' }}>
                        <span>⭐ <b style={{ color: '#cbd5e1' }}>{h.likes_count}</b> pont</span>
                        <span>👁️ <b style={{ color: '#cbd5e1' }}>{h.views_count}</b> nézettség</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ background: `${rankBadgeColor}20`, color: rankBadgeColor, border: `1px solid ${rankBadgeColor}40`, padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', minWidth: '65px', textAlign: 'center' }}>
                        {rankText}
                      </span>
                      <small style={{ color: '#475569', fontSize: '0.7rem' }}>/{h.total_entries} képből</small>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
