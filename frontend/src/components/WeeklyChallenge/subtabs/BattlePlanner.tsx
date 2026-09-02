import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../../utils/constants';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';

import { 
  Swords, 
  FileText, 
  Calendar, 
  User, 
  Image as ImageIcon, 
  Upload,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface BattlePlannerProps {
  user: any;
  onSuccess: () => void;
}

const compressImageOnClient = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      console.warn("⚡ Képtömörítés túllépte az időkorlátot, az eredeti nyers képet használjuk.");
      resolve(file);
    }, 2500);

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onerror = () => {
      clearTimeout(timeoutId);
      resolve(file);
    };

    reader.onload = (event) => {
      const img = new window.Image();
      
      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve(file);
      };

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1920;

          if (width > height) {
            if (width > MAX_SIZE) { height = Math.round((height * MAX_SIZE) / width); width = MAX_SIZE; }
          } else {
            if (height > MAX_SIZE) { width = Math.round((width * MAX_SIZE) / height); height = MAX_SIZE; }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            clearTimeout(timeoutId);
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file); 
            }
          }, 'image/jpeg', 0.8); 
        } catch (e) {
          clearTimeout(timeoutId);
          resolve(file);
        }
      };
    };
  });
};

export default function BattlePlanner({ user, onSuccess }: BattlePlannerProps) {
  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState(''); 
  const [description, setDescription] = useState('');
  const [descriptionEn, setDescriptionEn] = useState(''); 
  const [coverAuthor, setCoverAuthor] = useState('');
  const [isMaster, setIsMaster] = useState(false); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Saját javaslatok állapota
  const [myProposals, setMyProposals] = useState<any[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);

  const { t, lang } = useLanguage();

  let isLight = false;
  try {
    const themeContext = useTheme();
    if (themeContext) {
      isLight = themeContext.theme === 'light';
    }
  } catch (e) {}

  const fetchMyProposals = async () => {
    if (!user?.email) return;
    setLoadingProposals(true);
    try {
      const token = localStorage.getItem('photoAppToken');
      const res = await fetch(`${BACKEND_URL}/api/weekly/my-proposals?userEmail=${encodeURIComponent(user.email)}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMyProposals(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Hiba a javaslatok betöltésekor:", e);
    } finally {
      setLoadingProposals(false);
    }
  };

  useEffect(() => {
    fetchMyProposals();
  }, [user?.email]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const rawFile = e.target.files[0];
      
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(rawFile));
      setCoverFile(rawFile);

      if (rawFile.size > 2 * 1024 * 1024) {
        try {
          const finalFile = await compressImageOnClient(rawFile);
          setCoverFile(finalFile);
          if (preview) URL.revokeObjectURL(preview);
          setPreview(URL.createObjectURL(finalFile));
        } catch (compressErr) {
          console.error("Hiba a tömörítés során:", compressErr);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🎯 Borítókép készítője most már SZIEN KÖTELEZŐ!
    if (!title.trim() || !description.trim() || !startDate || !endDate || !coverFile || !coverAuthor.trim()) {
      return alert(lang === 'en' ? "Please fill in all required fields, including the Cover Author!" : "Minden kötelező mezőt ki kell tölteni (beleértve a Borítókép készítőjét is)!");
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('title_en', titleEn.trim()); 
    formData.append('description', description.trim());
    formData.append('description_en', descriptionEn.trim()); 
    formData.append('cover_author', coverAuthor.trim());
    
    // 🎯 Képmesterként az e-mail címet küldjük el
    const computedMasterEmail = isMaster ? (user?.email || '') : '';
    formData.append('master_name', computedMasterEmail);
    
    formData.append('start_date', startDate);
    formData.append('end_date', endDate);
    formData.append('userEmail', user?.email || '');
    formData.append('cover', coverFile);

    try {
      const token = localStorage.getItem('photoAppToken');

      const res = await fetch(`${BACKEND_URL}/api/weekly/propose`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });
      if (res.ok) {
        alert(t('msgProposalSuccess'));
        setTitle(''); setTitleEn(''); setDescription(''); setDescriptionEn(''); setCoverAuthor(''); 
        setIsMaster(false); 
        setStartDate(''); setEndDate(''); setCoverFile(null); setPreview(null);
        fetchMyProposals(); // Újratölti a listát
        onSuccess(); 
      } else {
        const errData = await res.json();
        alert(errData.error || t('msgProposalError'));
      }
    } catch (error) {
      console.error("Hiba a csatiterv beküldésekor:", error);
      alert(t('msgNetworkError'));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusInfo = (status: string) => {
    if (status === 'approved') {
      return { label: lang === 'en' ? 'Approved' : 'Elfogadva', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', icon: <CheckCircle size={13} /> };
    }
    if (status === 'rejected') {
      return { label: lang === 'en' ? 'Rejected' : 'Elutasítva', color: '#f87171', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', icon: <XCircle size={13} /> };
    }
    return { label: lang === 'en' ? 'Pending Review' : 'Bírálatra vár', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.3)', icon: <Clock size={13} /> };
  };

  const labelStyle = {
    color: 'var(--text-title)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px',
    fontSize: '0.8rem',
    fontWeight: '600'
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--bg-main)',
    border: '1px solid var(--border-main)',
    borderRadius: '4px',
    color: 'var(--text-title)',
    outline: 'none',
    fontSize: '0.85rem',
    boxSizing: 'border-box' as const
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '580px', margin: '0 auto' }}>
      
      {/* ➕ ÚJ JÁTÉK ŰRLAP */}
      <div style={{ width: '100%', background: 'var(--bg-card)', padding: '18px', borderRadius: '8px', border: '1px solid var(--border-main)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', animation: 'fadeIn 0.3s ease-out', boxSizing: 'border-box' }}>
        <h2 style={{ color: 'var(--text-title)', margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: '700', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px', wordBreak: 'break-word' }}>
          <Swords size={20} color="#f97316" /> {t('planTitle')}
        </h2>
        <p style={{ color: 'var(--text-body)', fontSize: '0.8rem', margin: '0 0 16px 0', lineHeight: '1.4', wordBreak: 'break-word' }}>{t('planDesc')}</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
          <div>
            <label style={labelStyle}>
              <FileText size={14} color="var(--text-muted)" /> {t('planLabelTitle')} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input type="text" placeholder={t('planPlaceholderTitle')} value={title} onChange={e => setTitle(e.target.value)} required style={inputStyle} />
          </div>

          <div>
            <label style={{ ...labelStyle, color: isLight ? '#0284c7' : '#38bdf8' }}>
              <FileText size={14} /> {t('planLabelTitleEn')}
            </label>
            <input type="text" placeholder={t('planPlaceholderTitleEn')} value={titleEn} onChange={e => setTitleEn(e.target.value)} style={{ ...inputStyle, border: isLight ? '1px solid rgba(2,132,199,0.3)' : '1px solid rgba(56,189,248,0.25)' }} />
          </div>

          <div>
            <label style={labelStyle}>
              <FileText size={14} color="var(--text-muted)" /> {t('planLabelDesc')} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea rows={3} placeholder={t('planPlaceholderDesc')} value={description} onChange={e => setDescription(e.target.value)} required style={{ ...inputStyle, resize: 'none', lineHeight: '1.4' }} />
          </div>

          <div>
            <label style={{ ...labelStyle, color: isLight ? '#0284c7' : '#38bdf8' }}>
              <FileText size={14} /> {t('planLabelDescEn')}
            </label>
            <textarea rows={3} placeholder={t('planPlaceholderDescEn')} value={descriptionEn} onChange={e => setDescriptionEn(e.target.value)} style={{ ...inputStyle, border: isLight ? '1px solid rgba(2,132,199,0.3)' : '1px solid rgba(56,189,248,0.25)', resize: 'none', lineHeight: '1.4' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <div>
              <label style={labelStyle}>
                <Calendar size={14} color="var(--text-muted)" /> {t('planLabelStart')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>
                <Calendar size={14} color="var(--text-muted)" /> {t('planLabelEnd')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} required style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <div>
              <label style={labelStyle}>
                <User size={14} color="var(--text-muted)" /> {t('planLabelMaster')}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', borderRadius: '4px', height: '38px', boxSizing: 'border-box' }}>
                <input 
                  type="checkbox" 
                  id="isMasterCheckbox"
                  checked={isMaster} 
                  onChange={e => setIsMaster(e.target.checked)} 
                  style={{ width: '16px', height: '16px', accentColor: '#f97316', cursor: 'pointer', margin: 0, flexShrink: 0 }}
                />
                <label htmlFor="isMasterCheckbox" style={{ color: 'var(--text-body)', fontSize: '0.8rem', cursor: 'pointer', userSelect: 'none', fontWeight: '500', wordBreak: 'break-word' }}>
                  {t('planCheckMasterMe') || 'Szeretnék én lenni'}
                </label>
              </div>
            </div>

            {/* 🎯 BORÍTÓKÉP KÉSZÍTŐJE KÖTELEZŐ MEZŐ */}
            <div>
              <label style={labelStyle}>
                <User size={14} color="var(--text-muted)" /> {t('planLabelAuthor')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input 
                type="text" 
                placeholder={t('planPlaceholderAuthor')} 
                value={coverAuthor} 
                onChange={e => setCoverAuthor(e.target.value)} 
                required
                style={inputStyle} 
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>
              <ImageIcon size={14} color="var(--text-muted)" /> {t('planLabelCover')} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input type="file" accept="image/*" onChange={handleFileChange} required style={{ color: 'var(--text-body)', fontSize: '0.8rem', display: 'block', cursor: 'pointer', width: '100%' }} />
            {preview && (
              <div style={{ marginTop: '10px', height: '120px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-main)', backgroundColor: 'var(--bg-main)' }}>
                <img src={preview} alt={t('planPreviewAlt')} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>

          <button type="submit" disabled={submitting} style={{ width: '100%', background: '#f97316', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.15s ease', marginTop: '4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} className="battle-submit-btn">
            <Upload size={14} />
            <span>{submitting ? t('planSubmitting') : t('planSubmitBtn')}</span>
          </button>
        </form>
      </div>

      {/* 📋 SAJÁT BEKÜLDÖTT JÁTÉKOK STÁTUSZ SZERINT */}
      <div style={{ width: '100%', background: 'var(--bg-card)', padding: '18px', borderRadius: '8px', border: '1px solid var(--border-main)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
        <h3 style={{ color: 'var(--text-title)', margin: '0 0 12px 0', fontSize: '1.05rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📋 {lang === 'en' ? 'My Game Proposals' : 'Saját Beküldött Játékaim'}
        </h3>

        {loadingProposals ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '10px 0' }}>
            ⏳ {lang === 'en' ? 'Loading proposals...' : 'Javaslatok betöltése...'}
          </div>
        ) : myProposals.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '10px 0' }}>
            {lang === 'en' ? 'You have not submitted any game proposals yet.' : 'Még nem küldtél be egyetlen játékjavaslatot sem.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {myProposals.map((item) => {
              const statusInfo = getStatusInfo(item.status);

              return (
                <div 
                  key={item.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    background: 'var(--bg-main)', 
                    padding: '10px 12px', 
                    borderRadius: '6px', 
                    border: '1px solid var(--border-main)' 
                  }}
                >
                  {/* Borítókép miniatűr */}
                  <div style={{ width: '50px', height: '50px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, background: '#000' }}>
                    {item.cover_url ? (
                      <img src={item.cover_url} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.7rem' }}>🖼️</div>
                    )}
                  </div>

                  {/* Részletek */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-title)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </div>
                    
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <span>📷 {item.cover_author || 'Nincs megadva'}</span>
                      {item.master_email && <span>👑 Csatabíró: {item.master_email}</span>}
                    </div>
                  </div>

                  {/* Státusz jelvény */}
                  <span 
                    style={{ 
                      background: statusInfo.bg, 
                      color: statusInfo.color, 
                      border: `1px solid ${statusInfo.border}`, 
                      padding: '4px 10px', 
                      borderRadius: '50px', 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0
                    }}
                  >
                    {statusInfo.icon}
                    <span>{statusInfo.label}</span>
                  </span>

                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .battle-submit-btn:hover {
          background: #ea580c !important;
        }
      `}</style>
    </div>
  );
}
