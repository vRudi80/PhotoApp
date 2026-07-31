import React, { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';
import VideoLoader from '../components/VideoLoader';
import { 
  Award, Upload, Star, Clock, Filter, Sparkles, CheckCircle2, 
  BookOpen, Eye, UserCheck, ChevronRight, X, ShieldAlert 
} from 'lucide-react';

interface ClubWeeklyReviewProps {
  user: any;
  onOpenCourses?: () => void;
}

const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('photoAppToken');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

export default function ClubWeeklyReviewView({ user, onOpenCourses }: ClubWeeklyReviewProps) {
  const [activeRound, setActiveRound] = useState<any | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Szűrők
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedEntryModal, setSelectedEntryModal] = useState<any | null>(null);

  // Képfeltöltés modál adatok
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [photoTitle, setPhotoTitle] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [driveFileId, setDriveFileId] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const roundRes = await fetch(`${BACKEND_URL}/api/club-review/active-round`, { headers: getAuthHeaders() });
      if (roundRes.ok) {
        const roundData = await roundRes.json();
        setActiveRound(roundData.round);

        if (roundData.round?.id) {
          const entriesRes = await fetch(`${BACKEND_URL}/api/club-review/entries/${roundData.round.id}`, { headers: getAuthHeaders() });
          if (entriesRes.ok) setEntries(await entriesRes.json());
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleRate = async (entryId: number, score: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/club-review/rate`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ entryId, score })
      });

      if (res.ok) {
        loadData();
        if (selectedEntryModal && selectedEntryModal.id === entryId) {
          setSelectedEntryModal((prev: any) => ({ ...prev, my_score: score }));
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Hiba a pontozás során.');
      }
    } catch (e) {
      alert('Hálózati hiba.');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoTitle.trim() || (!fileUrl.trim() && !driveFileId.trim())) {
      return alert('Add meg a kép címét és a kép elérését!');
    }

    setIsUploading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/club-review/upload`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          roundId: activeRound.id,
          title: photoTitle,
          fileUrl,
          driveFileId
        })
      });

      const data = await res.json();

      if (res.ok) {
        setShowUploadModal(false);
        setPhotoTitle(''); setFileUrl(''); setDriveFileId('');
        loadData();
        alert('🎉 Kép elküldve! Az AI elkészítette a szakmai elemzést.');
      } else {
        alert(data.error || 'Hiba a feltöltés során.');
      }
    } catch (err) {
      alert('Hálózati hiba.');
    } finally {
      setIsUploading(false);
    }
  };

  const filteredEntries = useMemo(() => {
    if (categoryFilter === 'all') return entries;
    return entries.filter(e => e.ai_category === categoryFilter);
  }, [entries, categoryFilter]);

  const isMaster = user?.club_role === 'master' || user?.club_role === 'leader';

  if (loading) return <VideoLoader />;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '15px' }}>
      
      {/* FEJLÉC */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-main)', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={28} /> {activeRound?.title || 'Klub Heti Képértékelő'}
          </h2>
          <small style={{ color: 'var(--text-muted)' }}>
            Feltöltés: Vasárnap éjfélig • Értékelés: Szerda éjfélig
          </small>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {onOpenCourses && (
            <button onClick={onOpenCourses} style={{ background: 'var(--bg-main)', color: '#38bdf8', border: '1px solid var(--border-main)', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={16} /> Tanfolyamok
            </button>
          )}

          <button onClick={() => setShowUploadModal(true)} style={{ background: '#f97316', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={16} /> Kép Feltöltése
          </button>
        </div>
      </div>

      {/* KATEGÓRIA SZŰRŐK */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', pb: '5px' }}>
        {[
          { id: 'all', label: 'Összes Kép' },
          { id: 'portrait', label: '👤 Portré' },
          { id: 'color', label: '🎨 Színes' },
          { id: 'monochrome', label: '🖤 Monokróm' },
          { id: 'nature', label: '🌿 Természet' }
        ].map(cat => (
          <button 
            key={cat.id} 
            onClick={() => setCategoryFilter(cat.id)}
            style={{ 
              background: categoryFilter === cat.id ? '#a78bfa' : 'var(--bg-card)', 
              color: categoryFilter === cat.id ? '#0f172a' : 'var(--text-title)', 
              border: '1px solid var(--border-main)', 
              padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' 
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* GALÉRIA */}
      {filteredEntries.length === 0 ? (
        <div style={{ padding: '50px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-main)', color: 'var(--text-muted)' }}>
          Még nincsenek feltöltött képek ebben a kategóriában.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {filteredEntries.map(entry => {
            const isMyPhoto = entry.user_email === user?.email;
            const photoUrl = getImageUrl(entry.drive_file_id, entry.file_url);

            return (
              <div key={entry.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                
                <div onClick={() => setSelectedEntryModal(entry)} style={{ position: 'relative', height: '220px', background: '#000', cursor: 'pointer' }}>
                  <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  
                  {/* AI PONT JELVÉNY */}
                  <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', color: '#fbbf24', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Sparkles size={14} /> AI: {entry.ai_score} / 100 p
                  </div>
                </div>

                <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-title)', fontSize: '1.1rem' }}>{entry.title}</h3>
                    <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '12px' }}>Alkotó: {entry.user_name}</small>

                    {/* PONTSZÁM ÖSSZESÍTŐ */}
                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', background: 'var(--bg-main)', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Tagok átlaga:</span>
                        <div style={{ color: '#38bdf8', fontWeight: 'bold' }}>{Number(entry.avg_member_score).toFixed(1)} p ({entry.member_votes_count} szavazat)</div>
                      </div>
                      <div style={{ flex: 1, borderLeft: '1px solid var(--border-main)', paddingLeft: '10px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Mesterek:</span>
                        <div style={{ color: '#f59e0b', fontWeight: 'bold' }}>{Number(entry.avg_master_score).toFixed(1)} p ({entry.master_votes_count} szavazat)</div>
                      </div>
                    </div>
                  </div>

                  {/* PONTOZÓ GOMBOK */}
                  {isMyPhoto ? (
                    <div style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', textAlign: 'center', fontWeight: 'bold' }}>
                      Saját fotó (Nem értékelheted)
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>
                        {isMaster ? 'Mester Értékelés (1 - 10 pont):' : 'Tagi Értékelés (0 - 2 pont):'}
                      </label>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {isMaster ? (
                          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                            <button key={p} onClick={() => handleRate(entry.id, p)} style={{ flex: 1, padding: '6px 0', borderRadius: '4px', border: entry.my_score === p ? '2px solid #f59e0b' : '1px solid var(--border-main)', background: entry.my_score === p ? '#f59e0b' : 'var(--bg-main)', color: entry.my_score === p ? '#0f172a' : 'var(--text-title)', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>
                              {p}
                            </button>
                          ))
                        ) : (
                          [0, 1, 2].map(p => (
                            <button key={p} onClick={() => handleRate(entry.id, p)} style={{ flex: 1, padding: '8px 0', borderRadius: '6px', border: entry.my_score === p ? '2px solid #38bdf8' : '1px solid var(--border-main)', background: entry.my_score === p ? '#38bdf8' : 'var(--bg-main)', color: entry.my_score === p ? '#0f172a' : 'var(--text-title)', fontWeight: 'bold', cursor: 'pointer' }}>
                              {p} Pont
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RÉSZLETES AI ELEMZŐ ÉS TANFOLYAM MODÁL */}
      {selectedEntryModal && (
        <div onClick={() => setSelectedEntryModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', padding: '25px', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '1.3rem' }}>{selectedEntryModal.title}</h3>
              <button onClick={() => setSelectedEntryModal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <img src={getImageUrl(selectedEntryModal.drive_file_id, selectedEntryModal.file_url)} alt="" style={{ width: '100%', maxHeight: '350px', objectFit: 'contain', borderRadius: '8px', background: '#000', marginBottom: '15px' }} />

            {/* AI KRITIKA DOBOZ */}
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid #a78bfa', marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#a78bfa', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} /> AI Szakmai Értékelés (FIAP Szempontok)
                </span>
                <span style={{ background: '#a78bfa', color: '#0f172a', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {selectedEntryModal.ai_score} / 100 Pont
                </span>
              </div>
              <p style={{ margin: 0, color: 'var(--text-body)', fontSize: '0.9rem', lineHeight: '1.6' }}>{selectedEntryModal.ai_feedback}</p>
            </div>

            {/* AJÁNLOTT KLUBTANFOLYAM KÁRTYA */}
            {selectedEntryModal.course_title && (
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
                <div>
                  <small style={{ color: '#10b981', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>🎯 Az AI által javasolt klubtanfolyam fejlődéshez:</small>
                  <strong style={{ color: 'var(--text-title)', fontSize: '1rem' }}>{selectedEntryModal.course_title}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Ár: {selectedEntryModal.course_price} • {selectedEntryModal.course_location_detail}</div>
                </div>
                {onOpenCourses && (
                  <button onClick={() => { setSelectedEntryModal(null); onOpenCourses(); }} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Megtekintés
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODÁL: KÉP FELTÖLTÉSE */}
      {showUploadModal && (
        <div onClick={() => setShowUploadModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleUpload} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', padding: '25px', maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '1.3rem' }}>Kép Feltöltése a Heti Értékelőre</h3>

            <div>
              <label style={{ display: 'block', color: 'var(--text-title)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Kép Címe *</label>
              <input type="text" value={photoTitle} onChange={e => setPhotoTitle(e.target.value)} required placeholder="pl.: Hajnali csend" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', outline: 'none' }} />
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-title)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Kép URL Hivatkozás (vagy Drive File ID)</label>
              <input type="text" value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowUploadModal(false)} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer' }}>Mégse</button>
              <button type="submit" disabled={isUploading} style={{ background: '#f97316', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>{isUploading ? 'AI Elemzés...' : 'Beküldés & AI Elemzés'}</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
