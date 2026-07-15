import React, { useState } from 'react';
import { BACKEND_URL } from '../../../utils/constants';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';

// 🎯 JAVÍTVA: Az Image ikont átneveztük ImageIcon-ra, így nem ütközik a natív böngészős Image objektummal!
import { 
  Swords, 
  FileText, 
  Calendar, 
  User, 
  Image as ImageIcon, 
  Upload 
} from 'lucide-react';

interface BattlePlannerProps {
  user: any;
  onSuccess: () => void;
}

// ⚡ BÖNGÉSZŐS KÉPTÖMÖRÍTŐ MOTOR (Max 1920px, 80% minőség - Golyóálló védelemmel)
const compressImageOnClient = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    // 🎯 IDŐTÚLLÉPÉSI VÉDŐHÁLÓ: Ha 2.5 másodpercen belül bármiért elakadna, engedje át a nyers képet, ne fagyassza le az oldalt!
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
      // 🎯 JAVÍTVA: window.Image-ként hivatkozunk rá, így 100%, hogy a böngésző natív képdekódolóját hívjuk meg
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

  const { t } = useLanguage();

  let isLight = false;
  try {
    const themeContext = useTheme();
    if (themeContext) {
      isLight = themeContext.theme === 'light';
    }
  } catch (e) {}

  // 🎯 JAVÍTVA: Azonnali kép-előnézet generálás, háttérben futó aszinkron tömörítéssel
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const rawFile = e.target.files[0];
      
      // 1. Azonnal megmutatjuk az előnézetet a nyers képből, hogy a felhasználó lássa a sikeres választást!
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(rawFile));
      setCoverFile(rawFile); // Beállítjuk alapértelmezettnek a nyers képet

      // 2. Ha a kép nagyobb mint 2MB, elindítjuk a háttértömörítést
      if (rawFile.size > 2 * 1024 * 1024) {
        try {
          console.log("⚡ Óriás borítókép észlelve, kliens oldali zsugorítás indul...");
          const finalFile = await compressImageOnClient(rawFile);
          
          setCoverFile(finalFile);
          if (preview) URL.revokeObjectURL(preview);
          setPreview(URL.createObjectURL(finalFile));
          console.log(`💪 Tömörítés sikeres!`);
        } catch (compressErr) {
          console.error("Hiba a tömörítés során, az eredeti képfájlt használjuk tovább:", compressErr);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !description || !startDate || !endDate || !coverFile) {
      return alert(t('msgFillAllFields'));
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('title_en', titleEn); 
    formData.append('description', description);
    formData.append('description_en', descriptionEn); 
    formData.append('cover_author', coverAuthor);
    
    const computedMasterName = isMaster ? (user?.name || user?.email || '') : '';
    formData.append('master_name', computedMasterName);
    
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

  const labelStyle = {
    color: 'var(--text-title)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px',
    fontSize: '0.82rem',
    fontWeight: '600'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-main)',
    border: '1px solid var(--border-main)',
    borderRadius: '4px',
    color: 'var(--text-title)',
    outline: 'none',
    fontSize: '0.88rem',
    boxSizing: 'border-box' as const
  };

  return (
    <div style={{ maxWidth: '580px', margin: '0 auto', background: 'var(--bg-card)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-main)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', animation: 'fadeIn 0.3s ease-out' }}>
      <h2 style={{ color: 'var(--text-title)', margin: '0 0 4px 0', fontSize: '1.3rem', fontWeight: '700', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Swords size={22} color="#f97316" /> {t('planTitle')}
      </h2>
      <p style={{ color: 'var(--text-body)', fontSize: '0.82rem', margin: '0 0 20px 0', lineHeight: '1.45' }}>{t('planDesc')}</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={labelStyle}>
            <FileText size={14} color="var(--text-muted)" /> {t('planLabelTitle')}
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
            <FileText size={14} color="var(--text-muted)" /> {t('planLabelDesc')}
          </label>
          <textarea rows={3} placeholder={t('planPlaceholderDesc')} value={description} onChange={e => setDescription(e.target.value)} required style={{ ...inputStyle, resize: 'none', lineHeight: '1.45' }} />
        </div>

        <div>
          <label style={{ ...labelStyle, color: isLight ? '#0284c7' : '#38bdf8' }}>
            <FileText size={14} /> {t('planLabelDescEn')}
          </label>
          <textarea rows={3} placeholder={t('planPlaceholderDescEn')} value={descriptionEn} onChange={e => setDescriptionEn(e.target.value)} style={{ ...inputStyle, border: isLight ? '1px solid rgba(2,132,199,0.3)' : '1px solid rgba(56,189,248,0.25)', resize: 'none', lineHeight: '1.45' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>
              <Calendar size={14} color="var(--text-muted)" /> {t('planLabelStart')}
            </label>
            <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>
              <Calendar size={14} color="var(--text-muted)" /> {t('planLabelEnd')}
            </label>
            <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} required style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>
              <User size={14} color="var(--text-muted)" /> {t('planLabelMaster')}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', borderRadius: '4px', height: '40px', boxSizing: 'border-box' }}>
              <input 
                type="checkbox" 
                id="isMasterCheckbox"
                checked={isMaster} 
                onChange={e => setIsMaster(e.target.checked)} 
                style={{ width: '16px', height: '16px', accentColor: '#f97316', cursor: 'pointer', margin: 0 }}
              />
              <label htmlFor="isMasterCheckbox" style={{ color: 'var(--text-body)', fontSize: '0.82rem', cursor: 'pointer', userSelect: 'none', fontWeight: '500' }}>
                {t('planCheckMasterMe') || 'Szeretnék én lenni'}
              </label>
            </div>
          </div>
          <div>
            <label style={labelStyle}>
              <User size={14} color="var(--text-muted)" /> {t('planLabelAuthor')}
            </label>
            <input type="text" placeholder={t('planPlaceholderAuthor')} value={coverAuthor} onChange={e => setCoverAuthor(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>
            {/* 🎯 JAVÍTVA: Az átnevezett Lucide ikont használjuk az ütközés ellen */}
            <ImageIcon size={14} color="var(--text-muted)" /> {t('planLabelCover')} <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
          </label>
          <input type="file" accept="image/*" onChange={handleFileChange} required style={{ color: 'var(--text-body)', fontSize: '0.82rem', display: 'block', cursor: 'pointer' }} />
          {preview && (
            <div style={{ marginTop: '12px', height: '130px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-main)', backgroundColor: 'var(--bg-main)' }}>
              <img src={preview} alt={t('planPreviewAlt')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
        </div>

        <button type="submit" disabled={submitting} style={{ width: '100%', background: '#f97316', color: 'white', border: 'none', padding: '12px', borderRadius: '4px', fontSize: '0.95rem', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.15s ease', marginTop: '6px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} className="battle-submit-btn">
          <Upload size={16} />
          <span>{submitting ? t('planSubmitting') : t('planSubmitBtn')}</span>
        </button>
      </form>

      <style>{`
        .battle-submit-btn:hover {
          background: #ea580c !important;
        }
      `}</style>
    </div>
  );
}
