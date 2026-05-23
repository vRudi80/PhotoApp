import React, { useState } from 'react';
import { BACKEND_URL } from '../utils/constants';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSuccess: () => void; // Frissíti a statisztikákat import után
}

export default function ExcelImportModal({ isOpen, onClose, user, onSuccess }: ExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<any[]>([]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return alert('Kérlek válassz ki egy Excel fájlt!');
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userEmail', user.email);

      const res = await fetch(`${BACKEND_URL}/api/import/excel-analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Hiba a feldolgozás során');
      }

      const data = await res.json();
      setAnalyzedData(data.map((item: any) => ({ ...item, skip: item.status === 'duplicate' })));
    } catch (err: any) {
      alert(`Hiba: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTitleChange = (index: number, newTitle: string) => {
    const newData = [...analyzedData];
    newData[index].title = newTitle;
    setAnalyzedData(newData);
  };

  const toggleSkip = (index: number) => {
    const newData = [...analyzedData];
    if (newData[index].status === 'duplicate') {
      alert('Duplikált eredményeket a rendszer biztonsági okokból nem enged importálni.');
      return;
    }
    newData[index].skip = !newData[index].skip;
    setAnalyzedData(newData);
  };

  const handleImport = async () => {
    const itemsToImport = analyzedData.filter(item => !item.skip);
    if (itemsToImport.length === 0) return alert('Nincs kiválasztva importálható sor!');
    
    setIsImporting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/import/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.email,
          userName: user.name,
          items: itemsToImport
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Hiba az importálás során');
      }

      alert('🎉 Sikeres importálás!');
      setAnalyzedData([]);
      setFile(null);
      onSuccess(); // Frissíti a szülő komponenst
      onClose();
    } catch (err: any) {
      alert(`Hiba: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}>
      <div style={{ background: '#0f172a', borderRadius: '16px', border: '1px solid #334155', width: '100%', maxWidth: '1000px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Fejléc */}
        <div style={{ padding: '20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b' }}>
          <h2 style={{ margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📊</span> Okos Excel Importálás (AI)
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Tartalom */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {analyzedData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
                Töltsd fel az Excel táblázatodat (.xlsx, .xls), az AI pedig normalizálja és ellenőrzi a meglévő adataiddal!
              </p>
              <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} style={{ marginBottom: '20px', color: '#f8fafc' }} />
              <br />
              <button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing || !file}
                style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: isAnalyzing || !file ? 'not-allowed' : 'pointer', opacity: isAnalyzing || !file ? 0.5 : 1 }}
              >
                {isAnalyzing ? '🤖 AI Elemzés folyamatban...' : 'Táblázat Elemzése'}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '15px', color: '#94a3b8', fontSize: '0.9rem' }}>
                <strong>Színkódok:</strong> <br/>
                <span style={{ color: '#10b981' }}>Zöld:</span> Minden adat megvan. | 
                <span style={{ color: '#f59e0b' }}> Sárga:</span> A kép vagy a szalon hiányzik, de a rendszer létrehozza. | 
                <span style={{ color: '#64748b' }}> Szürke:</span> Már importálva van (duplikált).
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                  <thead>
                    <tr style={{ background: '#1e293b', borderBottom: '2px solid #334155' }}>
                      <th style={{ padding: '10px' }}>Import</th>
                      <th style={{ padding: '10px' }}>Kép Címe (Szerkeszthető)</th>
                      <th style={{ padding: '10px' }}>Szalon Neve</th>
                      <th style={{ padding: '10px' }}>FIAP / MAFOSZ</th>
                      <th style={{ padding: '10px' }}>Eredmény</th>
                      <th style={{ padding: '10px' }}>Státusz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyzedData.map((item, idx) => {
                      const isDup = item.status === 'duplicate';
                      const isMissing = item.status === 'missing_photo' || item.status === 'missing_salon' || item.status === 'missing_both';
                      const color = isDup ? '#64748b' : (isMissing ? '#f59e0b' : '#10b981');

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #334155', opacity: item.skip ? 0.5 : 1 }}>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <input type="checkbox" checked={!item.skip} onChange={() => toggleSkip(idx)} disabled={isDup} style={{ width: '18px', height: '18px' }} />
                          </td>
                          <td style={{ padding: '10px' }}>
                            <input 
                              type="text" 
                              value={item.title || ''} 
                              onChange={(e) => handleTitleChange(idx, e.target.value)}
                              disabled={isDup}
                              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #475569', background: '#1e293b', color: '#f8fafc' }}
                            />
                          </td>
                          <td style={{ padding: '10px', color: '#cbd5e1' }}>{item.salonName || '-'}</td>
                          <td style={{ padding: '10px', color: '#cbd5e1' }}>{item.fiapNumber || '-'}</td>
                          <td style={{ padding: '10px', color: '#cbd5e1', fontWeight: 'bold' }}>{item.award || '-'}</td>
                          <td style={{ padding: '10px', color: color, fontSize: '0.85rem' }}>
                            {item.warnings && item.warnings.length > 0 ? item.warnings.join(' | ') : 'Minden adat megtalálva.'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Lábjegyzet gombokkal */}
        {analyzedData.length > 0 && (
          <div style={{ padding: '20px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end', gap: '15px', background: '#1e293b' }}>
            <button onClick={() => setAnalyzedData([])} style={{ background: 'transparent', border: '1px solid #64748b', color: '#cbd5e1', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>Mégsem</button>
            <button onClick={handleImport} disabled={isImporting} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: isImporting ? 'not-allowed' : 'pointer' }}>
              {isImporting ? '⏳ Importálás folyamatban...' : 'Kijelöltek Importálása'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
