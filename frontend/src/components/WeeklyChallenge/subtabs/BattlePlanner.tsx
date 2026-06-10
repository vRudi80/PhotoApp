import React, { useState } from 'react';
import { BACKEND_URL } from '../../../utils/constants';

// 🎯 ÚJ IMPORT: Behozzuk a nyelvi kontextust
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
  const [titleEn, setTitleEn] = useState(''); // 🎯 ÚJ STATE AZ ANGOL CÍMNEK
  const [description, setDescription] = useState('');
  const [descriptionEn, setDescriptionEn] = useState(''); // 🎯 ÚJ STATE AZ ANGOL LEÍRÁSNAK
  const [coverAuthor, setCoverAuthor] = useState('');
  const [masterName, setMasterName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 🎯 Aktiváljuk a nyelvi hookot
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
      preview && URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(finalFile));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !startDate || !endDate) return alert(t('msgFillAllFields'));

    setSubmitting(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('title_en', titleEn); // 🎯 ÚJ: Küldjük az angol címet
    formData.append('description', description);
    formData.append('description_en', descriptionEn); // 🎯 ÚJ: Küldjük az angol leírást
    formData.append('cover_author', coverAuthor);
    formData.append('master_name', masterName);
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
        setTitle(''); setTitleEn(''); setDescription(''); setDescriptionEn(''); setCoverAuthor(''); setMasterName('');
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
    <div style={{ maxWidth: '600px', margin: '0 auto', background: '#1e293b', padding: '30px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.4)', animation: 'fadeIn 0.3s ease-out' }}>
      <h2 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '1.6rem', fontWeight: 'bold' }}>{t('planTitle')}</h2>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 25px 0', lineHeight: '1.5' }}>{t('planDesc')}</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <label style={{ color: '#cbd5e1', display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 'bold' }}>{t('planLabelTitle')}</label>
          <input type="text" placeholder={t('planPlaceholderTitle')} value={title} onChange={e => setTitle(e.target.value)} required style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', color: 'white', outline: 'none' }} />
        </div>

        {/* 🎯 ÚJ MEZŐ: ANGOL CÍM (Kékebb kerettel vizuálisan elkülönítve) */}
        <div>
          <label style={{ color: '#38bdf8', display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 'bold' }}>{t('planLabelTitleEn')}</label>
          <input type="text" placeholder={t('planPlaceholderTitleEn')} value={titleEn} onChange={e => setTitleEn(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #38bdf840', borderRadius: '10px', color: 'white', outline: 'none' }} />
        </div>

        <div>
          <label style={{ color: '#cbd5e1', display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 'bold' }}>{t('planLabelDesc')}</label>
          <textarea rows={4} placeholder={t('planPlaceholderDesc')} value={description} onChange={e => setDescription(e.target.value)} required style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', color: 'white', outline: 'none', resize: 'none' }} />
        </div>

        {/* 🎯 ÚJ MEZŐ: ANGOL LEÍRÁS */}
        <div>
          <label style={{ color: '#38bdf8', display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 'bold' }}>{t('planLabelDescEn')}</label>
          <textarea rows={4} placeholder={t('planPlaceholderDescEn')} value={descriptionEn} onChange={e => setDescriptionEn(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #38bdf840', borderRadius: '10px', color: 'white', outline: 'none', resize: 'none' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ color: '#cbd5e1', display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 'bold' }}>{t('planLabelStart')}</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', color: 'white', outline: 'none' }} />
          </div>
          <div>
            <label style={{ color: '#cbd5e1', display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 'bold' }}>{t('planLabelEnd')}</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', color: 'white', outline: 'none' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ color: '#cbd5e1', display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 'bold' }}>{t('planLabelMaster')}</label>
            <input type="text" placeholder={t('planPlaceholderMaster')} value={masterName} onChange={e => setMasterName(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', color: 'white', outline: 'none' }} />
          </div>
          <div>
            <label style={{ color: '#cbd5e1', display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 'bold' }}>{t('planLabelAuthor')}</label>
            <input type="text" placeholder={t('planPlaceholderAuthor')} value={coverAuthor} onChange={e => setCoverAuthor(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', color: 'white', outline: 'none' }} />
          </div>
        </div>

        <div>
          <label style={{ color: '#cbd5e1', display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 'bold' }}>{t('planLabelCover')}</label>
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ color: '#94a3b8', fontSize: '0.9rem' }} />
          {preview && (
            <div style={{ marginTop: '15px', height: '140px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #334155' }}>
              <img src={preview} alt={t('planPreviewAlt')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
        </div>

        <button type="submit" disabled={submitting} style={{ width: '100%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#0f172a', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(245,158,11,0.3)', marginTop: '10px' }}>
          {submitting ? t('planSubmitting') : t('planSubmitBtn')}
        </button>
      </form>
    </div>
  );
}
