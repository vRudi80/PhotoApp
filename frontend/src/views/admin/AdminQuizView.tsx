import React, { useState, useEffect } from 'react';
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
  
  // Fájl és előnézet állapotok
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [questionHu, setQuestionHu] = useState('');
  const [questionEn, setQuestionEn] = useState('');
  
  const [optionsHu, setOptionsHu] = useState<string[]>(['', '', '', '']);
  const [optionsEn, setOptionsEn] = useState<string[]>(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [exifTarget, setExifTarget] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🎯 ÚJ: Szerkesztési üzemmód állapotai
  const [editingId, setEditingId] = useState<number | null>(null);
  const [existingQuestions, setExistingQuestions] = useState<any[]>([]);
  const [currentQuestionsImageUrl, setCurrentImageUrl] = useState('');

  // Kérdésbank szinkronizálása a háttérből
  const fetchAllQuestions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/quiz/questions`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setExistingQuestions(await res.json());
      }
    } catch (e) {
      console.error("Hiba a kérdések listázásakor", e);
    }
  };

  useEffect(() => {
    fetchAllQuestions();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));

      if (type === 'exif') {
        try {
          const exifData = await exifr.parse(file);
          if (exifData && exifData.FNumber) {
            const detectedAperture = `f/${exifData.FNumber}`;
            setExifTarget(detectedAperture);
            setOptionsHu([detectedAperture, 'f/2.8', 'f/5.6', 'f/11']);
            setOptionsEn([detectedAperture, 'f/2.8', 'f/5.6', 'f/11']);
          }
        } catch (err) {}
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

  // 🎯 ÚJ: SZERKESZTÉSI MÓD ELINDÍTÁSA (Adatok betöltése a formba)
  const handleStartEdit = (q: any) => {
    setEditingId(q.id);
    setType(q.type);
    setQuestionHu(q.question_hu);
    setQuestionEn(q.question_en);
    setCorrectOption(q.correct_option);
    setExifTarget(q.exif_target_value || '');
    setCurrentImageUrl(q.image_url);
    setPreviewUrl(q.image_url); // Megjelenítjük a meglévő képet előnézetként
    setSelectedFile(null); // Nem kötelező új fájlt választani

    try {
      setOptionsHu(typeof q.options_hu === 'string' ? JSON.parse(q.options_hu) : q.options_hu);
      setOptionsEn(typeof q.options_en === 'string' ? JSON.parse(q.options_en) : q.options_en);
    } catch (e) {
      setOptionsHu(['', '', '', '']);
      setOptionsEn(['', '', '', '']);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Felgördítünk az űrlaphoz
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setQuestionHu(''); setQuestionEn('');
    setOptionsHu(['', '', '', '']); setOptionsEn(['', '', '', '']);
    setSelectedFile(null); if (previewUrl && !currentQuestionsImageUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null); setExifTarget(''); setCurrentImageUrl('');
  };

  // 🎯 ÚJ: KÉRDÉS TÖRÖLVE A RENDZERBŐL
  const handleDeleteQuestion = async (id: number) => {
    if (!window.confirm("Biztosan véglegesen törlöd ezt a kérdést és a hozzá tartozó fotót?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/quiz/delete/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        alert("Kérdés sikeresen eltávolítva!");
        fetchAllQuestions();
        if (editingId === id) handleCancelEdit();
      }
    } catch (e) {
      alert("Hálózati hiba a törlés során.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId && !selectedFile) return alert("Kérlek, válassz ki egy fotót!");
    if (!questionHu || !questionEn) return alert("Minden kérdés mezőt tölts ki!");

    setIsSubmitting(true);

    const formData = new FormData();
    if (selectedFile) formData.append('photo', selectedFile);
    formData.append('type', type);
    formData.append('questionHu', questionHu);
    formData.append('questionEn', questionEn);
    formData.append('optionsHu', JSON.stringify(optionsHu));
    formData.append('optionsEn', JSON.stringify(optionsEn));
    formData.append('correctOption', correctOption);
    formData.append('exifTarget', exifTarget);
    formData.append('currentImageUrl', currentQuestionsImageUrl);

    const endpoint = editingId 
      ? `${BACKEND_URL}/api/admin/quiz/update/${editingId}`
      : `${BACKEND_URL}/api/admin/quiz/add`;

    try {
      const res = await fetch(endpoint, {
        method: editingId ? 'PUT' : 'POST',
        headers: getAuthHeaders(), 
        body: formData
      });

      if (res.ok) {
        alert(editingId ? "🎉 Módosítások sikeresen elmentve!" : "🎉 Új kérdés sikeresen hozzáadva!");
        handleCancelEdit();
        fetchAllQuestions();
      } else {
        const err = await res.json();
        alert(`❌ Hiba: ${err.error}`);
      }
    } catch (error) {
      alert("❌ Hiba történt a mentési folyamat közben.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* 🛠️ PANEL 1: ADATBEVITELI ŰRLAP (ADD / EDIT) */}
      <div style={{ background: '#1e293b', padding: '30px', borderRadius: '12px', border: editingId ? '2px solid #f59e0b' : '1px solid #334155', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
        <h2 style={{ color: editingId ? '#f59e0b' : '#38bdf8', margin: '0 0 20px 0', fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {editingId ? `📝 Kérdés Szerkesztése (ID: #${editingId})` : '✨ Új Kérdés és Fotó Feltöltése'}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>Kérdés Kategória:</label>
            <select value={type} onChange={e => setType(e.target.value as any)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white', outline: 'none' }}>
              <option value="exif">EXIF Adat Tippelés</option>
              <option value="composition">Kompozíciós Szabályok</option>
              <option value="history">Fotótörténet & Híres Képek</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>
              {editingId ? 'Fotó lecserélése (Hagyd üresen, ha megmarad a régi):' : 'Illusztráció Fotó Feltöltése:'}
            </label>
            <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #475569', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ color: '#94a3b8', fontSize: '0.9rem', width: '100%' }} />
              {previewUrl && (
                <div style={{ width: '100%', height: '160px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #334155', background: '#000' }}>
                  <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>Kérdés (HU):</label>
              <textarea rows={3} value={questionHu} onChange={e => setQuestionHu(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>Kérdés (EN):</label>
              <textarea rows={3} value={questionEn} onChange={e => setQuestionEn(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '10px', fontWeight: 'bold', fontSize: '0.9rem' }}>Lehetséges Válaszok és Helyes Opció:</label>
            {['A', 'B', 'C', 'D'].map((opt, idx) => (
              <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <input type="radio" name="correctOption" checked={correctOption === opt} onChange={() => setCorrectOption(opt as any)} />
                <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>{opt}:</span>
                <input type="text" value={optionsHu[idx] || ''} onChange={e => handleOptionChange(idx, e.target.value, false)} placeholder="Magyar válasz" style={{ flex: 1, padding: '8px 12px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: 'white', outline: 'none' }} />
                <input type="text" value={optionsEn[idx] || ''} onChange={e => handleOptionChange(idx, e.target.value, true)} placeholder="Angol válasz" style={{ flex: 1, padding: '8px 12px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: 'white', outline: 'none' }} />
              </div>
            ))}
          </div>

          {type === 'exif' && (
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>Helyes EXIF Karakterlánc:</label>
              <input type="text" value={exifTarget} onChange={e => setExifTarget(e.target.value)} placeholder="Pl.: f/1.4" style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            {editingId && (
              <button type="button" onClick={handleCancelEdit} style={{ flex: 1, background: '#334155', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                Mégse / Elvetés
              </button>
            )}
            <button type="submit" disabled={isSubmitting} style={{ flex: 2, background: editingId ? '#f59e0b' : 'linear-gradient(135deg, #38bdf8, #2563eb)', color: editingId ? '#0f172a' : 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
              {isSubmitting ? 'Mentés... ⏳' : (editingId ? '💾 Módosítások Véglegesítése' : '🚀 Kérdés Mentése')}
            </button>
          </div>
        </form>
      </div>

      {/* 📊 PANEL 2: MEGLÉVŐ KÉRDÉSEK TÁBLÁZATOS LISTÁJA */}
      <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#cbd5e1' }}>📋 Jelenlegi Kérdésbank ({existingQuestions.length} db feladvány)</h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                <th style={{ padding: '12px' }}>Fotó</th>
                <th style={{ padding: '12px' }}>Kategória & Kérdés</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Helyes Tipp</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Műveletek</th>
              </tr>
            </thead>
            <tbody>
              {existingQuestions.map((q, idx) => (
                <tr key={q.id} style={{ borderBottom: '1px solid #334155', background: idx % 2 === 0 ? 'transparent' : '#0f172a30' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ width: '50px', height: '50px', background: '#000', borderRadius: '4px', overflow: 'hidden', border: '1px solid #475569' }}>
                      <img src={q.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  </td>
                  <td style={{ padding: '12px', color: '#f8fafc' }}>
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: q.type === 'exif' ? '#38bdf820' : (q.type === 'composition' ? '#10b98120' : '#a78bfa20'), color: q.type === 'exif' ? '#38bdf8' : (q.type === 'composition' ? '#10b981' : '#a78bfa'), fontWeight: 'bold', marginRight: '6px' }}>
                      {q.type.toUpperCase()}
                    </span>
                    <strong style={{ display: 'block', marginTop: '4px', fontSize: '0.88rem' }}>{q.question_hu}</strong>
                    <small style={{ color: '#94a3b8', fontStyle: 'italic' }}>{q.question_en}</small>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#fbbf24', fontWeight: 'bold', fontSize: '1rem' }}>
                    {q.correct_option} {q.exif_target_value ? `(${q.exif_target_value})` : ''}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button onClick={() => handleLocalSave ? handleStartEdit(q) : null} style={{ background: '#3b82f620', color: '#38bdf8', border: '1px solid #3b82f640', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        Szerkesztés
                      </button>
                      <button onClick={() => handleDeleteQuestion(q.id)} style={{ background: '#ef444420', color: '#f87171', border: '1px solid #ef444440', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        Törlés
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {existingQuestions.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>A kérdésbank jelenleg üres. Hozz létre egyet felül!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
