import React, { useState } from 'react';
import { BACKEND_URL } from '../../../utils/constants';

// Behozzuk a nyelvi kontextust
import { useLanguage } from '../../../context/LanguageContext';

interface BattlePlannerProps {
  user: any;
  onSuccess: () => void;
}

// ⚡ BÖNGÉSZŐS KÉPTÖMÖRÍTŐ MOTOR (Max 1920px, 80% minőség - Borítóképekhez optimalizálva)
const compressImageOnClient = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
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

  // Aktiváljuk a nyelvi hookot
  const { t } = useLanguage();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const rawFile = e.target.files[0];
      
      let finalFile = rawFile;
      if (rawFile.size > 2 * 1024 * 1024) {
        console.log("⚡ Óriás borítókép észlelve, kliens oldali zsugorítás indul...");
        finalFile = await compressImageOnClient(rawFile);
        console.log(`💪 Borító tömörítve: ${(rawFile.size / 1024 / 1024).toFixed(2)}MB -> ${(finalFile.size / 1024 / 1024).toFixed(2)}MB`);
      }

      setCoverFile(finalFile);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(finalFile));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !startDate || !endDate) return alert(t('msgFillAllFields'));

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
    if (coverFile) formData.append('cover', coverFile);

    try {
      const res = await fetch(`${BACKEND_URL}/api/weekly/propose`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        alert(t('msgProposalSuccess'));
        setTitle(''); setTitleEn(''); setDescription(''); setDescriptionEn(''); setCoverAuthor(''); 
        setIsMaster(false); 
        setStartDate(''); setEndDate(''); setCoverFile(null); setPreview(null);
        onSuccess(); 
      } else {
        alert(t('msgProposalError'));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '580px', margin: '0 auto', background: '#131b2e', padding: '24px', borderRadius: '8px', border: '1px solid #222f47', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', animation: 'fadeIn 0.3s ease-out' }}>
      <h2 style={{ color: '#fbbf24', margin: '0 0 4px 0', fontSize: '1.3rem', fontWeight: '700', letterSpacing: '-0.3px' }}>{t('planTitle')}</h2>
      <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0 0 20px 0', lineHeight: '1.45' }}>{t('planDesc')}</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ color: '#cbd5e1', display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: '600' }}>{t('planLabelTitle')}</label>
          <input type="text" placeholder={t('planPlaceholderTitle')} value={title} onChange={e => setTitle(e.target.value)} required style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #222f47', borderRadius: '4px', color: 'white', outline: 'none', fontSize: '0.88rem', boxSizing: 'border-box' }} />
        </div>

        {/* 🎯 ANGOL CÍM (Letisztult, professzionális szegélyhangolás) */}
        <div>
          <label style={{ color: '#38bdf8', display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: '600' }}>{t('planLabelTitleEn')}</label>
          <input type="text" placeholder={t('planPlaceholderTitleEn')} value={titleEn} onChange={e => setTitleEn(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '4px', color: 'white', outline: 'none', fontSize: '0.88rem', boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ color: '#cbd5e1', display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: '600' }}>{t('planLabelDesc')}</label>
          <textarea rows={3} placeholder={t('planPlaceholderDesc')} value={description} onChange={e => setDescription(e.target.value)} required style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #222f47', borderRadius: '4px', color: 'white', outline: 'none', resize: 'none', fontSize: '0.88rem', boxSizing: 'border-box', lineHeight: '1.45' }} />
        </div>

        {/* 🎯 ANGOL LEÍRÁS */}
        <div>
          <label style={{ color: '#38bdf8', display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: '600' }}>{t('planLabelDescEn')}</label>
          <textarea rows={3} placeholder={t('planPlaceholderDescEn')} value={descriptionEn} onChange={e => setDescriptionEn(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '4px', color: 'white', outline: 'none', resize: 'none', fontSize: '0.88rem', boxSizing: 'border-box', lineHeight: '1.45' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ color: '#cbd5e1', display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: '600' }}>{t('planLabelStart')}</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #222f47', borderRadius: '4px', color: 'white', outline: 'none', fontSize: '0.88rem', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ color: '#cbd5e1', display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: '600' }}>{t('planLabelEnd')}</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #222f47', borderRadius: '4px', color: 'white', outline: 'none', fontSize: '0.88rem', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ color: '#cbd5e1', display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: '600' }}>{t('planLabelMaster')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#0f172a', border: '1px solid #222f47', borderRadius: '4px', height: '40px', boxSizing: 'border-box' }}>
              <input 
                type="checkbox" 
                id="isMasterCheckbox"
                checked={isMaster} 
                onChange={e => setIsMaster(e.target.checked)} 
                style={{ width: '16px', height: '16px', accentColor: '#f97316', cursor: 'pointer', margin: 0 }}
              />
              <label htmlFor="isMasterCheckbox" style={{ color: '#64748b', fontSize: '0.82rem', cursor: 'pointer', userSelect: 'none', fontWeight: '500' }}>
                {t('planCheckMasterMe') || 'Szeretnék én lenni'}
              </label>
            </div>
          </div>
          <div>
            <label style={{ color: '#cbd5e1', display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: '600' }}>{t('planLabelAuthor')}</label>
            <input type="text" placeholder={t('planPlaceholderAuthor')} value={coverAuthor} onChange={e => setCoverAuthor(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #222f47', borderRadius: '4px', color: 'white', outline: 'none', fontSize: '0.88rem', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div>
          <label style={{ color: '#cbd5e1', display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: '600' }}>{t('planLabelCover')}</label>
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ color: '#64748b', fontSize: '0.82rem', display: 'block', cursor: 'pointer' }} />
          {preview && (
            <div style={{ marginTop: '12px', height: '130px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #222f47', backgroundColor: '#090d16' }}>
              <img src={preview} alt={t('planPreviewAlt')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
        </div>

        {/* Teli szilárd narancssárga gomb színátmenetek helyett */}
        <button type="submit" disabled={submitting} style={{ width: '100%', background: '#f97316', color: 'white', border: 'none', padding: '12px', borderRadius: '4px', fontSize: '0.95rem', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.15s ease', marginTop: '6px', boxSizing: 'border-box' }} className="battle-submit-btn">
          {submitting ? t('planSubmitting') : t('planSubmitBtn')}
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
