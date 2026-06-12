import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../utils/constants';

// 🎯 ÚJ IMPORT: Behozzuk a nyelvi kontextust
import { useLanguage } from '../../context/LanguageContext';

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.src = 'https://via.placeholder.com/400x300/1e293b/64748b?text=Image+not+found';
};

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

const formatDateTimeLocal = (dateStr: string) => {
  if (!dateStr) return '';
  return dateStr.replace(' ', 'T').slice(0, 16);
};

export default function AdminWeeklyView() {
  // 🎯 ÚJ: Aktiváljuk a fordítót (t)
  const { t } = useLanguage();

  const [topics, setTopics] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]); 
  const [editId, setEditId] = useState<number | null>(null);
  
  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState(''); // 🎯 ÚJ STATE
  const [desc, setDesc] = useState('');
  const [descEn, setDescEn] = useState(''); // 🎯 ÚJ STATE
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [masterEmail, setMasterEmail] = useState(''); 

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(''); 
  const [coverUrl, setCoverUrl] = useState('');
  const [coverAuthor, setCoverAuthor] = useState('');

  const [suspiciousActivities, setSuspiciousActivities] = useState<any[]>([]);
  const [loadingSuspicious, setLoadingSuspicious] = useState(false);

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

  const fetchTopics = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly-topics`);
      if (res.ok) setTopics(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly/users`);
      if (res.ok) setUsers(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchSuspicious = async () => {
    setLoadingSuspicious(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly/suspicious`);
      if (res.ok) setSuspiciousActivities(await res.json());
    } catch (e) { console.error(e); } finally { setLoadingSuspicious(false); }
  };

  const handleDisqualify = async (topicId: number, userEmail: string, userName: string) => {
    if (!window.confirm(`❗ Biztosan törlöd ${userName} (${userEmail}) nevezését?`)) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly/disqualify?topicId=${topicId}&userEmail=${userEmail}`, { method: 'DELETE' });
      if (res.ok) { alert("Sikeresen eltávolítva!"); fetchSuspicious(); fetchTopics(); }
    } catch (e) { alert("Hálózati hiba!"); }
  };

  const handleApproveIp = async (topicId: number, userEmail: string, userName: string) => {
    if (!window.confirm(`✅ Biztosan elfogadod ${userName} (${userEmail}) nevezését legitimként ezen az IP-címen?`)) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly/approve-ip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, userEmail })
      });
      if (res.ok) {
        alert("🟢 Nevezés sikeresen jóváhagyva, az IP konfliktus feloldva!");
        fetchSuspicious();
      } else {
        alert("Hiba történt a jóváhagyás során.");
      }
    } catch (e) { alert("Hálózati hiba!"); }
  };

  const handleProposalDecision = async (topicId: number, decision: 'approved' | 'rejected') => {
    const actionText = decision === 'approved' ? 'ELFOGADOD és harcrendbe állítod' : 'ELUTASÍTOD';
    if (!window.confirm(`⚔️ Biztosan ${actionText} ezt a beküldött haditervet?`)) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/decide-proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, decision })
      });
      if (res.ok) {
        alert("✓ A döntés sikeresen rögzítve a naptárban!");
        fetchTopics();
      } else {
        alert("Hiba történt a bírálat mentése során.");
      }
    } catch (e) { alert("Hálózati hiba!"); }
  };
  
  useEffect(() => {
    fetchTopics();
    fetchUsers(); 
    fetchSuspicious();
  }, []);

  const clearForm = () => {
    setEditId(null);
    setTitle('');
    setTitleEn(''); // 🎯 ÚJ
    setDesc('');
    setDescEn(''); // 🎯 ÚJ
    setStartDate('');
    setEndDate('');
    setMasterEmail(''); 
    setCoverFile(null);
    setCoverUrl('');
    setCoverAuthor('');
    
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
    
    const fileInput = document.getElementById('cover-file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const startEdit = (tData: any) => {
    setEditId(tData.id);
    setTitle(tData.title);
    setTitleEn(tData.title_en || ''); // 🎯 ÚJ
    setDesc(tData.description || '');
    setDescEn(tData.description_en || ''); // 🎯 ÚJ
    setStartDate(tData.start_date ? formatDateTimeLocal(tData.start_date) : '');
    setEndDate(tData.end_date ? formatDateTimeLocal(tData.end_date) : '');
    setMasterEmail(tData.master_email || ''); 
    setCoverUrl(tData.cover_url || '');
    setCoverAuthor(tData.cover_author || '');
    
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
    setCoverFile(null); 
  };

  const handleSave = async () => {
    if (!title || !startDate || !endDate) return alert("Cím és dátumok kötelezőek!");
    try {
      const url = editId ? `${BACKEND_URL}/api/admin/weekly-topics/${editId}` : `${BACKEND_URL}/api/admin/weekly-topics`;
      const method = editId ? 'PUT' : 'POST';
      
      const formData = new FormData();
      formData.append('title', title);
      formData.append('title_en', titleEn); // 🎯 ÚJ: Továbbítjuk a backendnek
      formData.append('description', desc);
      formData.append('description_en', descEn); // 🎯 ÚJ: Továbbítjuk a backendnek
      formData.append('startDate', startDate);
      formData.append('endDate', endDate);
      formData.append('masterEmail', masterEmail);
      formData.append('coverAuthor', coverAuthor);
      
      if (coverUrl) formData.append('coverUrl', coverUrl);
      if (coverFile) formData.append('cover', coverFile);

      const res = await fetch(url, {
        method,
        body: formData 
      });

      if (res.ok) {
        alert("Sikeresen mentve!");
        clearForm();
        fetchTopics();
        fetchSuspicious();
      } else alert("Hiba a mentés során.");
    } catch (e) { alert("Hálózati hiba!"); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("❗ BIZTOSAN TÖRLÖD? Minden adat elvész!")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly-topics/${id}`, { method: 'DELETE' });
      if (res.ok) { fetchTopics(); fetchSuspicious(); }
    } catch (e) { alert("Hiba!"); }
  };

  // 🎯 Segédfüggvény az időzóna-eltolódás semlegesítésére (Ugyanaz, mint a játékos oldalon)
const parseAdminDateSafe = (dateStr: string) => {
  if (!dateStr) return new Date(0);
  const parts = dateStr.split(/[- :T]/);
  if (parts.length >= 5) {
    return new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
      parseInt(parts[3]),
      parseInt(parts[4]),
      parts[5] ? parseInt(parts[5]) : 0
    );
  }
  return new Date(dateStr);
};

const getTopicStatus = (statusStr: string, sDateStr: string, eDateStr: string) => {
  if (statusStr === 'pending') return { label: 'BÍRÁLATRA VÁR ⏳', color: '#eab308', bg: '#eab30810' };
  if (statusStr === 'rejected') return { label: 'ELUTASÍTVA ❌', color: '#ef4444', bg: '#ef444410' };

  const today = new Date();
  // 🎯 JAVÍTVA: Mindkét dátumot kényszerítjük a helyi időzónára, ignorálva az UTC eltolást
  const start = parseAdminDateSafe(sDateStr);
  const end = parseAdminDateSafe(eDateStr);
  
  if (today > end) return { label: 'LEZÁRULT 📜', color: '#94a3b8', bg: 'transparent' };
  if (today < start) return { label: 'BEÜTEMEZETT 📅', color: '#38bdf8', bg: '#38bdf810' };
  return { label: 'ÉLŐ FUTAM ⚔️', color: '#10b981', bg: '#10b98110' };
};


  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#f59e0b', fontWeight: 'bold' }}>⚔️ Kihívás kezelő</h2>
      <p style={{ color: '#94a3b8', marginBottom: '20px' }}>A rendszer automatikusan indítja el az elfogadott kihívásokat, amint elérkezik a kezdő dátumuk!</p>

      {/* GYANÚS TEVÉKENYSÉGEK PANEL */}
      <div style={{ backgroundColor: '#1e1b4b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: suspiciousActivities.length > 0 ? '2px solid #ef4444' : '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: suspiciousActivities.length > 0 ? '#f87171' : '#10b981', fontWeight: 'bold' }}>
            {suspiciousActivities.length > 0 ? '🚨 Gyanús Tevékenységek Detektálva!' : '🛡️ Rendszerbiztonság rendben'}
          </h3>
          <button onClick={fetchSuspicious} style={{ background: '#334155', color: '#cbd5e1', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
            {loadingSuspicious ? 'Frissítés...' : '🔄 Ellenőrzés futtatása'}
          </button>
        </div>
        {suspiciousActivities.length === 0 ? (
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem', fontStyle: 'italic' }}>Jelenleg minden tiszta.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {suspiciousActivities.map((act, index) => (
              <div key={index} style={{ background: '#0f172a', padding: '12px 15px', borderRadius: '8px', borderLeft: '4px solid #ef4444', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>⚔️ {act.topic_title}</span>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>🌐 IP: {act.ip_address}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                  {act.suspect_list.split(' || ').map((suspect: string, sIdx: number) => {
                    const namePart = suspect.split(' (')[0];
                    const emailPart = suspect.includes('(') ? suspect.split('(')[1].replace(')', '') : '';
                    return (
                      <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '6px 12px', borderRadius: '6px' }}>
                        <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>• {suspect}</span>
                        
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => handleApproveIp(act.topic_id, emailPart, namePart)} 
                            style={{ background: '#10b98120', color: '#4ade80', border: '1px solid #10b98150', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                          >
                            ✅ Elfogad
                          </button>
                          <button 
                            onClick={() => handleDisqualify(act.topic_id, emailPart, namePart)} 
                            style={{ background: '#ef444420', color: '#f87171', border: '1px solid #ef444450', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                          >
                            🗑️ Törlés
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LÉTREHOZÓ / SZERKESZTŐ ŰRLAP */}
      <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #f97316' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: '#f97316', fontWeight: 'bold' }}>{editId ? '✏️ Kihívás Szerkesztése' : '➕ Új Kihívás Kiírása'}</h3>
          {editId && <button onClick={clearForm} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Mégse</button>}
        </div>

        <input placeholder="A kihívás témája magyarul (pl. Tavaszi Fények)" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
        
        {/* 🎯 ÚJ MEZŐ: ANGOL CSATATÉMA */}
        <input placeholder={t('adminPlaceholderTitleEn')} value={titleEn} onChange={e => setTitleEn(e.target.value)} style={{ ...inputStyle, border: '1px solid #38bdf860' }} />
        
        <textarea placeholder="Leírás magyarul (Útmutató és leírás a fotósoknak...)" value={desc} onChange={e => setDesc(e.target.value)} style={{...inputStyle, minHeight: '80px'}} />
        
        {/* 🎯 ÚJ MEZŐ: ANGOL HADPARANCS */}
        <textarea placeholder={t('adminPlaceholderDescEn')} value={descEn} onChange={e => setDescEn(e.target.value)} style={{...inputStyle, minHeight: '80px', border: '1px solid #38bdf860'}} />
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>⚖️ Kijelölt Képmester (Extra pontokat osztó főbíró)</label>
          <select value={masterEmail} onChange={e => setMasterEmail(e.target.value)} style={inputStyle}>
            <option value="">-- Nincs külön képmester kijelölve (Opcionális) --</option>
            {users.map(u => <option key={u.email} value={u.email}>{u.name} ({u.email})</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '20px', padding: '15px', background: '#0f172a50', borderRadius: '10px', border: '1px dashed #334155' }}>
          <label style={{ fontSize: '0.8rem', color: '#38bdf8', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>🖼️ Kihívás Vizuális Borítóképe (Automata tömörítéssel)</label>
          <input 
            id="cover-file-input"
            type="file" 
            accept="image/*" 
            onChange={async e => { 
              if(e.target.files?.[0]) {
                const file = e.target.files[0];
                let finalFile = file;
                
                if (file.size > 2 * 1024 * 1024) {
                  console.log("⚡ Óriás borítókép észlelve az adminon, zsugorítás indul...");
                  finalFile = await compressImageOnClient(file);
                }
                setCoverFile(finalFile);
                setPreviewUrl(URL.createObjectURL(finalFile)); 
              }
            }} 
            style={inputStyle} 
          />
          
          <input 
            placeholder="Borítókép készítőjének neve (pl. Rudolf Kővári-Vágner)" 
            value={coverAuthor} 
            onChange={e => setCoverAuthor(e.target.value)} 
            style={{...inputStyle, marginTop: '5px', marginBottom: '5px'}} 
          />
          
          {previewUrl && (
            <div style={{ marginTop: '10px' }}>
              <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold' }}>✨ Új borítókép előnézet (Mentésre vár):</span>
              <img src={previewUrl} alt="Preview" style={{ width: '100%', maxHeight: '130px', objectFit: 'cover', borderRadius: '8px', marginTop: '5px', border: '1px solid #ef4444' }} />
            </div>
          )}
          
          {coverUrl && !coverFile && (
            <div style={{ marginTop: '10px' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>🖼️ Jelenleg aktív borítókép:</span>
              <img src={coverUrl} alt="Current cover" style={{ width: '100%', maxHeight: '130px', objectFit: 'cover', borderRadius: '8px', marginTop: '5px', border: '1px solid #334155' }} />
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{fontSize:'0.8rem', color:'#94a3b8', fontWeight: 'bold'}}>Hadművelet Kezdete (Óra/Perc is)</label>
            <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{fontSize:'0.8rem', color:'#94a3b8', fontWeight: 'bold'}}>Hadművelet Vége (Óra/Perc is)</label>
            <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <button onClick={handleSave} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '1rem' }}>
          {editId ? 'Változtatások Mentése és Élesítés' : 'Kihívás Mentése'}
        </button>
      </div>

      {/* TÉMÁK LISTÁJA */}
      <h3 style={{ color: '#f8fafc', marginBottom: '15px', fontSize: '1.3rem', fontWeight: 'bold' }}>📜 Kihívás tervek</h3>
      <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
        {topics.map((tData, i) => {
          const status = getTopicStatus(tData.status, tData.start_date, tData.end_date);
          const isPending = tData.status === 'pending';
          
          return (
            <div key={tData.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: i < topics.length - 1 ? '1px solid #334155' : 'none', background: status.bg, flexWrap: 'wrap', gap: '15px' }}>
              
              <div style={{ width: '70px', height: '45px', backgroundColor: '#0f172a', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #334155', flexShrink: 0 }}>
                {tData.cover_url ? (
                  <img src={tData.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleImageError} />
                ) : (
                  <span style={{ fontSize: '1.2rem', opacity: 0.4 }}>🖼️</span>
                )}
              </div>

              <div style={{ flex: 1, marginLeft: '10px' }}>
                <div style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '1.1rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {tData.title} 
                    <span style={{ background: status.color, color: status.color === '#eab308' ? '#0f172a' : '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                      {status.label}
                    </span>
                  </div>
                  {/* 🎯 JAVÍTVA: A Windows-kompatibilis, kódolt brit zászló grafika elhelyezése */}
                  {tData.title_en && (
                    <span style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 'normal', display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <img 
                        src="https://flagcdn.com/w20/gb.png" 
                        alt="🇬🇧" 
                        style={{ width: '15px', height: 'auto', borderRadius: '2px', verticalAlign: 'middle', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }} 
                      />
                      {tData.title_en}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '5px' }}>
                  {new Date(tData.start_date).toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' })} - {new Date(tData.end_date).toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' })}
                  {tData.cover_author && <span style={{color: '#38bdf8'}}> • 📸 {tData.cover_author}</span>}
                  {tData.proposed_by && <span style={{color: '#f59e0b', fontWeight: 'bold'}}> • 📜 Beküldte: {tData.proposed_by}</span>}
                </div>
                {tData.master_email && (
                  <div style={{ fontSize: '0.8rem', color: '#a78bfa', marginTop: '4px', fontWeight: 'bold' }}>
                    👑 Képmester: {tData.master_email}
                  </div>
                )}
              </div>

              {/* CSATABÍRÓI JELENTKEZÉS BÍRÁLATA AZ ADMINON */}
              {tData.pending_master_email && (
                <div style={{ background: '#eab30810', padding: '12px 18px', borderRadius: '10px', border: '1px solid #eab30840', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', width: '100%', boxSizing: 'border-box' }}>
                  <span style={{ color: '#f59e0b', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    👑 Képmesternek jelentkezett: <strong style={{color: '#fff'}}>{tData.pending_master_email}</strong>
                  </span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={async () => {
                        if(!window.confirm(`Biztosan kinevezed őt Képmesternek: ${tData.pending_master_email}?`)) return;
                        const res = await fetch(`${BACKEND_URL}/api/admin/decide-master`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ topicId: tData.id, decision: 'approved' })});
                        if(res.ok) { alert("✓ Képmester sikeresen kinevezve!"); fetchTopics(); }
                      }} 
                      style={{ background: '#10b981', color: '#0f172a', border: 'none', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
                    >
                      Elfogad
                    </button>
                    <button 
                      onClick={async () => {
                        if(!window.confirm("Elutasítod a jelentkezést?")) return;
                        const res = await fetch(`${BACKEND_URL}/api/admin/decide-master`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ topicId: tData.id, decision: 'rejected' })});
                        if(res.ok) { alert("✕ Jelentkezés elutasítva."); fetchTopics(); }
                      }} 
                      style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444450', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
                    >
                      Elutasít
                    </button>
                  </div>
                </div>
              )}

              {/* AKCIÓGOMBOK */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {isPending ? (
                  <>
                    <button 
                      onClick={() => startEdit(tData)} 
                      style={{ background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Szerkeszt
                    </button>
                    <button 
                      onClick={() => handleProposalDecision(tData.id, 'approved')} 
                      style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                    >
                      ✓ Elfogad
                    </button>
                    <button 
                      onClick={() => handleProposalDecision(tData.id, 'rejected')} 
                      style={{ background: '#ef444420', color: '#f87171', border: '1px solid #ef444450', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                    >
                      ✕ Elutasít
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(tData)} style={{ background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Szerkeszt</button>
                    <button onClick={() => handleDelete(tData.id)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Töröl</button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
