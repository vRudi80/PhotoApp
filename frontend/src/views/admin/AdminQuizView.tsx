import React, { useState } from 'react';
import exifr from 'exifr';
import { BACKEND_URL } from '../../utils/constants';

// 🎯 KÖZPONTI AUTH FEJLÉC GENERÁTOR ADMIN VÉGPONTOKHOZ
const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('photoAppToken');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

export default function AdminQuizView() {
  const [type, setType] = useState<'exif' | 'composition' | 'history'>('exif');
  const [imageUrl, setImageUrl] = useState('');
  const [questionHu, setQuestionHu] = useState('');
  const [questionEn, setQuestionEn] = useState('');
  
  // Opciók állapota
  const [optionsHu, setOptionsHu] = useState<string[]>(['', '', '', '']);
  const [optionsEn, setOptionsEn] = useState<string[]>(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [exifTarget, setExifTarget] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // 🎯 REJTETT EXIF HELPER: Ha az admin feltölt egy mintaképet, helyben kinyerjük belőle a rekeszt/záridőt
  const handleExifAutoDetect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const exifData = await exifr.parse(file);
        if (exifData && type === 'exif') {
          if (exifData.FNumber) {
            setExifTarget(`f/${exifData.FNumber}`);
            // Automatikusan felkínáljuk opcióként is, hogy gyorsítsuk a munkát
            setOptionsHu([`f/${exifData.FNumber}`, 'f/2.8', 'f/5.6', 'f/11']);
            setOptionsEn([`f/${exifData.FNumber}`, 'f/2.8', 'f/5.6', 'f/11']);
          }
        }
      } catch (err) {
        console.error("Nem sikerült EXIF-et olvasni a fájlból", err);
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
      // Ha a nyelv megegyezik (pl. számok vagy EXIF), szinkronizáljuk az angollal automatikusan
      if (type === 'exif') {
        const nextEn = [...optionsEn];
        nextEn[index] = value;
        setOptionsEn(nextEn);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl || !questionHu || !questionEn) return alert("Minden kötelező mezőt tölts ki!");
    if (optionsHu.some(o => !o.trim()) || optionsEn.some(o => !o.trim())) return alert("Minden opciót tölts ki!");

    setIsSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/quiz/add`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          type, imageUrl, questionHu, questionEn, optionsHu, optionsEn, correctOption, exifTarget
        })
      });

      if (res.ok) {
        alert("🎉 Kérdés sikeresen hozzáadva a kvízbázishoz!");
        // Form alaphelyzetbe állítása
        setQuestionHu(''); setQuestionEn('');
        setOptionsHu(['', '', '', '']); setOptionsEn(['', '', '', '']);
        setImageUrl(''); setExifTarget('');
      } else {
        const err = await res.json();
        alert(`❌ Hiba: ${err.error}`);
      }
    } catch (error) {
      alert("Hálózati hiba történt a mentés során!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', background: '#1e293b', padding: '30px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
      <h2 style={{ color: '#f59e0b', margin: '0 0 20px 0', fontSize: '1.75rem' }}>🛠️ Új Kvízkérdés Hozzáadása</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Kérdés Típusa */}
        <div>
          <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>Kérdés Kategória:</label>
          <select value={type} onChange={e => setType(e.target.value as any)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white', outline: 'none' }}>
            <option value="exif">EXIF Adat Tippelés</option>
            <option value="composition">Kompozíciós Szabályok</option>
            <option value="history">Fotótörténet & Híres Képek</option>
          </select>
        </div>

        {/* Kép URL megadása */}
        <div>
          <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>Illusztráció Kép URL (Cloudinary link):</label>
          <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://res.cloudinary.com/..." style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
          
          {type === 'exif' && (
            <div style={{ marginTop: '10px', background: '#0f172a50', padding: '10px', borderRadius: '6px', border: '1px dashed #475569' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>💡 EXIF Auto-Detect (Opcionális segéd): töltsd fel a képet helyben az értékek kiolvasásához:</span>
              <input type="file" accept="image/*" onChange={handleExifAutoDetect} style={{ fontSize: '0.8rem', color: '#94a3b8' }} />
            </div>
          )}
        </div>

        {/* Magyar és Angol Kérdések */}
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

        {/* Opciók szerkesztése */}
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

        {/* EXIF Célérték (Csak EXIF típusnál) */}
        {type === 'exif' && (
          <div>
            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>Helyes EXIF Karakterlánc (Ellenőrzéshez):</label>
            <input type="text" value={exifTarget} onChange={e => setExifTarget(e.target.value)} placeholder="Pl.: f/1.4 vagy 1/250s" style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        )}

        {/* Mentés Gomb */}
        <button type="submit" disabled={isSubmitting} style={{ background: isSubmitting ? '#475569' : 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: isSubmitting ? 'not-allowed' : 'pointer', transition: 'all 0.15s', textAlign: 'center', marginTop: '10px' }}>
          {isSubmitting ? 'Mentés folyamatban... ⏳' : '🚀 Kérdés Mentése a Kvízbázisba'}
        </button>

      </form>
    </div>
  );
}
