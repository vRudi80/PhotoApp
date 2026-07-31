import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/constants';
import { 
  BookOpen, Plus, Trash2, MapPin, Video, User, DollarSign, 
  Sparkles, CheckCircle2, ArrowLeft 
} from 'lucide-react';

interface ClubCoursesViewProps {
  user: any;
  onBack?: () => void;
}

const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('photoAppToken');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

export default function ClubCoursesView({ user, onBack }: ClubCoursesViewProps) {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Új tanfolyam form adatok
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructor, setInstructor] = useState('');
  const [price, setPrice] = useState('Ingyenes');
  const [locationType, setLocationType] = useState<'online' | 'offline'>('online');
  const [locationDetail, setLocationDetail] = useState('');
  const [errorCategory, setErrorCategory] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/club-courses`, { headers: getAuthHeaders() });
      if (res.ok) setCourses(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCourses(); }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert('A tanfolyam címe kötelező!');

    setIsSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/club-courses`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          title, description, instructor, price,
          locationType, locationDetail, errorCategory
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        setTitle(''); setDescription(''); setInstructor(''); setLocationDetail('');
        loadCourses();
        alert('🎉 Tanfolyam sikeresen rögzítve!');
      } else {
        const data = await res.json();
        alert(data.error || 'Hiba a mentés során.');
      }
    } catch (err) {
      alert('Hálózati hiba.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a tanfolyamot?')) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/club-courses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) loadCourses();
    } catch (e) {
      alert('Hiba a törlésnél.');
    }
  };

  const isLeaderOrDeputy = user?.club_role === 'leader' || user?.club_role === 'deputy' || user?.isAdmin;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '15px' }}>
      
      {/* FEJLÉC */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-main)', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button onClick={onBack} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}>
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookOpen size={26} /> Fotóklub Tanfolyamok & Műhelyek
            </h2>
            <small style={{ color: 'var(--text-muted)' }}>Szakmai fejlődés és képzés a klubodban</small>
          </div>
        </div>

        {isLeaderOrDeputy && (
          <button onClick={() => setShowAddModal(true)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Új Tanfolyam Indítása
          </button>
        )}
      </div>

      {/* TANFOLYAMOK LISTÁJA */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>Betöltés...</div>
      ) : courses.length === 0 ? (
        <div style={{ padding: '50px 20px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-main)', color: 'var(--text-muted)' }}>
          <h3>Jelenleg nincsenek meghirdetett tanfolyamok a klubodban.</h3>
          <p>Keresd a klubvezetődet az új képzési alkalmakért!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {courses.map(c => (
            <div key={c.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {c.location_type === 'online' ? <Video size={12} /> : <MapPin size={12} />}
                    {c.location_type === 'online' ? 'Online Műhely' : 'Személyes Jelenléti'}
                  </span>

                  <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1rem' }}>{c.price}</span>
                </div>

                <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-title)', fontSize: '1.2rem' }}>{c.title}</h3>
                <p style={{ color: 'var(--text-body)', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '15px' }}>{c.description}</p>

                {c.instructor && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={14} color="#a78bfa" /> Oktató: <b style={{ color: 'var(--text-title)' }}>{c.instructor}</b>
                  </div>
                )}

                {c.location_detail && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} color="#f59e0b" /> Helyszín / Link: <span style={{ color: 'var(--text-title)' }}>{c.location_detail}</span>
                  </div>
                )}
              </div>

              {isLeaderOrDeputy && (
                <div style={{ borderTop: '1px solid var(--border-main)', marginTop: '15px', paddingTop: '12px', textAlign: 'right' }}>
                  <button onClick={() => handleDelete(c.id)} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Trash2 size={14} /> Törlés
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODÁL: ÚJ TANFOLYAM FELVITEL */}
      {showAddModal && (
        <div onClick={() => setShowAddModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleCreateCourse} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', padding: '25px', maxWidth: '550px', width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '1.3rem' }}>Új Klubtanfolyam Hozzáadása</h3>

            <div>
              <label style={{ display: 'block', color: 'var(--text-title)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Tanfolyam Címe *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="pl.: Portré világítástechnika haladóknak" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', outline: 'none' }} />
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-title)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Rövid Leírás</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Mivel fogunk foglalkozni a képzésen..." style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', outline: 'none' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-title)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Oktató Neve</label>
                <input type="text" value={instructor} onChange={e => setInstructor(e.target.value)} placeholder="pl.: Kovács Péter" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-title)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Ár / Részvétel</label>
                <input type="text" value={price} onChange={e => setPrice(e.target.value)} placeholder="pl.: Ingyenes vagy 5000 Ft" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', outline: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-title)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Típus</label>
                <select value={locationType} onChange={e => setLocationType(e.target.value as any)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', outline: 'none' }}>
                  <option value="online">Online (Zoom/Meet)</option>
                  <option value="offline">Személyes helyszín</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-title)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>AI Fejlesztési Kategória</label>
                <select value={errorCategory} onChange={e => setErrorCategory(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', outline: 'none' }}>
                  <option value="general">Általános alapok</option>
                  <option value="vilagitas">Világítástechnika</option>
                  <option value="kompozicio">Kompozíció</option>
                  <option value="portre">Portréfotózás</option>
                  <option value="utomunka">Utómunka & Lightroom</option>
                  <option value="termeszet">Természetfotózás</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-title)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Helyszín részletei / Online Link</label>
              <input type="text" value={locationDetail} onChange={e => setLocationDetail(e.target.value)} placeholder="pl.: https://zoom.us/j/... vagy Klubterem, Művház" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-main)', background: 'var(--bg-main)', color: 'var(--text-title)', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer' }}>Mégse</button>
              <button type="submit" disabled={isSaving} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>{isSaving ? 'Mentés...' : 'Tanfolyam Rögzítése'}</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
