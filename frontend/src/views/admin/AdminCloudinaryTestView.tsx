import React, { useState } from 'react';
import { BACKEND_URL } from '../../utils/constants';

export default function AdminCloudinaryTestView() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState<any | null>(null);

  const inputStyle = { width: '100%', padding: '12px', marginBottom: '15px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '8px' };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResultData(null); // Régi eredmény törlése
    }
  };

  const handleUploadTest = async () => {
    if (!file) return alert('Kérlek válassz ki egy képet!');
    setLoading(true);

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/test-cloudinary`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setResultData(data);
        alert('🎉 Felhő alapú feltöltés sikeres!');
      } else {
        const errData = await res.json();
        alert(`Csődöt mondott: ${errData.error || 'Ismeretlen hiba'}`);
      }
    } catch (e) {
      alert('Hálózati hiba történt a backend felé.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      <h2 style={{ fontSize: '2rem', color: '#a78bfa', marginBottom: '10px' }}>🧪 Cloudinary CDN Sebesség Teszt</h2>
      <p style={{ color: '#94a3b8', marginBottom: '25px' }}>
        Ez egy zárt adminisztrátori felület. Itt ellenőrizheted, hogyan mennek át a fotók a Google Drive helyett a Cloudinary felhőjébe.
      </p>

      <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '20px', border: '1px solid #334155' }}>
        <label style={{ color: '#cbd5e1', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Válassz ki egy teszt fotót</label>
        <input type="file" accept="image/*" onChange={handleFileChange} style={inputStyle} disabled={loading} />

        {preview && !resultData && (
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '5px' }}>Lokális előnézet (még nincs feltöltve):</p>
            <img src={preview} alt="Preview" style={{ maxHeight: '200px', borderRadius: '12px', border: '2px dashed #475569' }} />
          </div>
        )}

        <button 
          onClick={handleUploadTest} 
          disabled={!file || loading}
          style={{ width: '100%', padding: '14px', background: !file ? '#334155' : 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: !file ? 'not-allowed' : 'pointer', fontSize: '1rem', transition: 'all 0.2s' }}
        >
          {loading ? '🚀 Küldés a felhőbe...' : 'Feltöltés Indítása 🚀'}
        </button>
      </div>

      {/* 📊 A CLOUDINARY-TŐL VISSZAKAPOTT ADATOK KIJELZÉSE */}
      {resultData && (
        <div style={{ marginTop: '30px', backgroundColor: '#0f172a', padding: '25px', borderRadius: '20px', border: '1px solid #a78bfa50' }}>
          <h3 style={{ color: '#10b981', margin: '0 0 15px 0' }}>✅ Sikeres válasz a Cloudinary-től:</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '20px' }}>
            <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px' }}> Formátum: <b style={{ color: '#38bdf8' }}>{resultData.format}</b></div>
            <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px' }}> Méret: <b style={{ color: '#38bdf8' }}>{(resultData.bytes / 1024).toFixed(1)} KB</b></div>
            <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px' }}> Felbontás: <b style={{ color: '#38bdf8' }}>{resultData.width}x{resultData.height} px</b></div>
            <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px' }}> Folder: <b style={{ color: '#a78bfa' }}>fotoklub_tesztek</b></div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '5px' }}>Generált Szupergyors CDN URL címed:</label>
            <input type="text" readOnly value={resultData.secure_url} style={{ ...inputStyle, border: '1px solid #10b98140', color: '#10b981', fontFamily: 'monospace', fontSize: '0.85rem' }} onClick={(e) => (e.target as HTMLInputElement).select()} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px' }}>Éles kép közvetlenül a Cloudinary hálózatáról:</p>
            <img src={resultData.secure_url} alt="Cloudinary CDN" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '2px solid #10b981' }} />
          </div>
        </div>
      )}
    </div>
  );
}
