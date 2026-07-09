import React, { useState } from 'react';
import exifr from 'exifr';
import { BACKEND_URL } from '../../utils/constants';

const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('photoAppToken');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

export default function AdminQuizView() {
  const [type, setType] = useState<'exif' | 'composition' | 'history'>('exif');
  
  // Feltöltendő fájl és előnézet állapota
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [questionHu, setQuestionHu] = useState('');
  const [questionEn, setQuestionEn] = useState('');
  
  const [optionsHu, setOptionsHu] = useState<string[]>(['', '', '', '']);
  const [optionsEn, setOptionsEn] = useState<string[]>(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [exifTarget, setExifTarget] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🎯 INTELLIGENS FÁJLKEZELŐ: Élő előnézet + EXIF auto-fill egy lépésben!
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Előnézet generálása a memóriában
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));

      // Ha EXIF módban vagyunk, azonnal megpróbáljuk kiolvasni az értékeket
      if (type === 'exif') {
        try {
          const exifData = await exifr.parse(file);
          if (exifData) {
            if (exifData.FNumber) {
              const detectedAperture = `f/${exifData.FNumber}`;
              setExifTarget(detectedAperture);
              setOptionsHu([detectedAperture, 'f/2.8', 'f/5.6', 'f/11']);
              setOptionsEn([detectedAperture, 'f/2.8', 'f/5.6', 'f/11']);
            } else if (exifData.ExposureTime) {
              const shutterFraction = exifData.ExposureTime < 1 ? `1/${Math.round(1 / exifData.ExposureTime)}s` : `${exifData.ExposureTime}s`;
              setExifTarget(shutterFraction);
            }
          }
        } catch (err) {
          console.warn("Nem található beágyazott EXIF adat ebben a fájlban.");
        }
      }
    }
  };

  const handleOptionChange = (index: number, value: string, isEn: boolean) => {
    if (isEn) {
      const next = [...optionsEn];
      next[index] = value;
      setOptionsEn(next);
    } else {
      const next = [...optionsHu];
      next[index] = value;
      setOptionsHu(next);
      if (type === 'exif') {
        const nextEn = [...optionsEn];
        nextEn[index] = value;
        setOptionsEn(nextEn);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return alert("Kérlek, válassz ki egy fotót a feltöltéshez!");
    if (!questionHu || !questionEn) return alert("Minden kérdés mezőt tölts ki!");
    if (optionsHu.some(o => !o.trim()) || optionsEn.some(o => !o.trim())) return alert("Minden válaszlehetőséget tölts ki!");

    setIsSubmitting(true);

    // 🎯 JAVÍTVA: FormData-ba pakoljuk az adatokat a bináris fájlátvitel miatt
    const formData = new FormData();
    formData.append('photo', selectedFile);
    formData.append('type', type);
    formData.append('questionHu', questionHu);
    formData.append('questionEn', questionEn);
    formData.append('optionsHu', JSON.stringify(optionsHu));
    formData.append('optionsEn', JSON.stringify(optionsEn));
    formData.append('correctOption', correctOption);
    formData.append('exifTarget', exifTarget);

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/quiz/add`, {
        method: 'POST',
        // FONTOS: FormData küldésekor TILOS 'Content-Type'-ot megadni a fejlécekben,
        // mert a böngészőnek magának kell legenerálnia a boundary határvonalakat!
        headers: getAuthHeaders(), 
        body: formData
      });

      if (res.ok) {
        alert("🎉 Kérdés és fotó sikeresen elmentve!");
        setQuestionHu(''); setQuestionEn('');
        setOptionsHu(['', '', '', '']); setOptionsEn(['', '', '', '']);
        setSelectedFile(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null);
        setExifTarget('');
      } else {
        const err = await res.json();
        alert(`❌ Hiba történt: ${err.error}`);
      }
    } catch (error) {
      alert("❌ Szerver vagy hálózati hiba történt a feltöltés közben.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', background: '#1e293b', padding: '30px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
      <h2 style={{ color: '#f59e0b', margin: '0 0 20px 0', fontSize: '1.75rem' }}>🛠️ Új Kvízkérdés és Fotó Feltöltése</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Kategória */}
        <div>
          <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>Kérdés Kategória:</label>
          <select value={type} onChange={e => { setType(e.target.value as any); setSelectedFile(null); if(previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white', outline: 'none' }}>
            <option value="exif">EXIF Adat Tippelés</option>
            <option value="composition">Kompozíciós Szabályok</option>
            <option value="history">Fotótörténet & Híres Képek</option>
          </select>
        </div>

        {/* Fotó kiválasztás és Élő előnézet */}
        <div>
          <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>Illusztráció Fotó Kiválasztása:</label>
          <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #475569', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <input type="file" accept="image/*" onChange={handleFileChange} style={{ color: '#94a3b8', fontSize: '0.9rem', width: '100%' }} />
            
            {previewUrl && (
              <div style={{ width: '100%', maxHeight: '200px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #334155', background: '#000', marginTop: '5px' }}>
                <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '200px', objectFit: 'contain', display: 'block' }} />
              </div>
            )}
          </div>
        </div>

        {/* Kérdések */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>Kérdés (HU):</label>
            <textarea rows={3} value={questionHu} onChange={e => setQuestionHu(e.target.value)} placeholder="Pl.: Milyen kompozíciós elvet követ ez a fotó?" style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
          </div>
          <div>
            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>Kérdés (EN):</label>
            <textarea rows={3} value={questionEn} onChange={e => setQuestionEn(e.target.value)} placeholder="Pl.: What compositional rule is shown in this picture?" style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
          </div>
        </div>

        {/* Válaszok */}
        <div>
          <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '10px', fontWeight: 'bold', fontSize: '0.9rem' }}>Lehetséges Válaszok és Helyes Opció:</label>
          {['A', 'B', 'C', 'D'].map((opt, idx) => (
            <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <input type="radio" name="correctOption" checked={correctOption === opt} onChange={() => setCorrectOption(opt as any)} style={{ cursor: 'pointer' }} />
              <span style={{ fontWeight: 'bold', color: '#f59e0b', fontSize: '0.9rem' }}>{opt}:</span>
              <input type="text" value={optionsHu[idx]} onChange={e => handleOptionChange(idx, e.target.value, false)} placeholder={`Opció ${opt} (HU)`} style={{ flex: 1, padding: '8px 12px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: 'white', outline: 'none', fontSize: '0.85rem' }} />
              <input type="text" value={optionsEn[idx]} onChange={e => handleOptionChange(idx, e.target.value, true)} placeholder={`Opció ${opt} (EN)`} style={{ flex: 1, padding: '8px 12px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: 'white', outline: 'none', fontSize: '0.85rem' }} />
            </div>
          ))}
        </div>

        {type === 'exif' && (
          <div>
            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>Helyes EXIF Karakterlánc (Ellenőrzéshez):</label>
            <input type="text" value={exifTarget} onChange={e => setExifTarget(e.target.value)} placeholder="Pl.: f/1.4 vagy 1/250s" style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        )}

        {/* Mentés */}
        <button type="submit" disabled={isSubmitting} style={{ background: isSubmitting ? '#475569' : 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: isSubmitting ? 'not-allowed' : 'pointer', transition: 'all 0.15s', textAlign: 'center', marginTop: '10px' }}>
          {isSubmitting ? 'Fotó feltöltése és mentése... ⏳' : '🚀 Kérdés és Fotó Mentése'}
        </button>

      </form>
    </div>
  );
}
