import React, { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL } from '../../utils/constants';

// 🎯 Nyelvi kontextus betöltése
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
  const { t, lang } = useLanguage();

  const [topics, setTopics] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]); 
  const [editId, setEditId] = useState<number | null>(null);
  
  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState(''); 
  const [desc, setDesc] = useState('');
  const [descEn, setDescEn] = useState(''); 
  
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
    if (!window.confirm(t('adminConfirmDisqualify').replace('{name}', userName).replace('{email}', userEmail))) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly/disqualify?topicId=${topicId}&userEmail=${userEmail}`, { method: 'DELETE' });
      if (res.ok) { alert(t('msgMapDeleteSuccess')); fetchSuspicious(); fetchTopics(); }
    } catch (e) { alert(t('msgNetworkError')); }
  };

  const handleApproveIp = async (topicId: number, userEmail: string, userName: string) => {
    if (!window.confirm(t('adminConfirmApproveIp').replace('{name}', userName).replace('{email}', userEmail))) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly/approve-ip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, userEmail })
      });
      if (res.ok) {
        alert(t('adminIpResolvedSuccess'));
        fetchSuspicious();
      }
    } catch (e) { alert(t('msgNetworkError')); }
  };

  const handleProposalDecision = async (topicId: number, decision: 'approved' | 'rejected') => {
    if (!window.confirm(decision === 'approved' ? t('adminConfirmApprovePlan') : t('adminConfirmRejectPlan'))) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/decide-proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, decision })
      });
      if (res.ok) {
        alert(t('adminDecisionSaved'));
        fetchTopics();
      }
    } catch (e) { alert(t('msgNetworkError')); }
  };
  
  useEffect(() => {
    fetchTopics();
    fetchUsers(); 
    fetchSuspicious();
  }, []);

  const clearForm = () => {
    setEditId(null); setTitle(''); setTitleEn(''); setDesc(''); setDescEn('');
    setStartDate(''); setEndDate(''); setMasterEmail(''); setCoverFile(null);
    setCoverUrl(''); setCoverAuthor('');
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(''); }
    const fileInput = document.getElementById('cover-file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const startEdit = (tData: any) => {
    setEditId(tData.id);
    setTitle(tData.title);
    setTitleEn(tData.title_en || '');
    setDesc(tData.description || '');
    setDescEn(tData.description_en || '');
    setStartDate(tData.start_date ? formatDateTimeLocal(tData.start_date) : '');
    setEndDate(tData.end_date ? formatDateTimeLocal(tData.end_date) : '');
    setMasterEmail(tData.master_email || ''); 
    setCoverUrl(tData.cover_url || '');
    setCoverAuthor(tData.cover_author || '');
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(''); }
    setCoverFile(null); 
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!title || !startDate || !endDate) return alert(t('mapFillRequired'));
    try {
      const url = editId ? `${BACKEND_URL}/api/admin/weekly-topics/${editId}` : `${BACKEND_URL}/api/admin/weekly-topics`;
      const method = editId ? 'PUT' : 'POST';
      
      const formData = new FormData();
      formData.append('title', title);
      formData.append('title_en', titleEn); 
      formData.append('description', desc);
      formData.append('description_en', descEn); 
      formData.append('startDate', startDate);
      formData.append('endDate', endDate);
      formData.append('masterEmail', masterEmail);
      formData.append('coverAuthor', coverAuthor);
      
      if (coverUrl) formData.append('coverUrl', coverUrl);
      if (coverFile) formData.append('cover', coverFile);

      const res = await fetch(url, { method, body: formData });
      if (res.ok) {
        alert(t('msgMapUpdateSuccess'));
        clearForm();
        fetchTopics();
        fetchSuspicious();
      }
    } catch (e) { alert(t('msgNetworkError')); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('msgMapDeleteConfirm'))) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly-topics/${id}`, { method: 'DELETE' });
      if (res.ok) { fetchTopics(); fetchSuspicious(); }
    } catch (e) { alert(t('msgNetworkError')); }
  };

  const parseAdminDateSafe = (dateStr: string) => {
    if (!dateStr) return new Date(0);
    const parts = dateStr.split(/[- :T]/);
    if (parts.length >= 5) {
      return new Date(
        parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]),
        parseInt(parts[3]), parseInt(parts[4]), parts[5] ? parseInt(parts[5]) : 0
      );
    }
    return new Date(dateStr);
  };

  const getTopicStatus = (statusStr: string, sDateStr: string, eDateStr: string) => {
    if (statusStr === 'pending') return { label: t('adminStatusPending'), color: '#eab308', bg: '#eab30810' };
    if (statusStr === 'rejected') return { label: t('adminStatusRejected'), color: '#ef4444', bg: '#ef444410' };

    const today = new Date();
    const start = parseAdminDateSafe(sDateStr);
    const end = parseAdminDateSafe(eDateStr);
    
    if (today > end) return { label: t('adminStatusEnded'), color: '#94a3b8', bg: '#0f172a50' };
    if (today < start) return { label: t('adminStatusScheduled'), color: '#38bdf8', bg: '#38bdf810' };
    return { label: t('adminStatusLive'), color: '#10b981', bg: '#10b98115' };
  };

  // ── 📊 GANTT IDŐVONAL DINAMIKUS TENGELY SZÁMÍTÓJA ──
  const ganttTimelineBounds = useMemo(() => {
    if (topics.length === 0) return { minTime: Date.now(), maxTime: Date.now() + 86400000 * 7 };
    
    let min = Infinity;
    let max = 0;

    topics.forEach(tData => {
      const start = parseAdminDateSafe(tData.start_date).getTime();
      const end = parseAdminDateSafe(tData.end_date).getTime();
      if (start < min) min = start;
      if (end > max) max = end;
    });

    // Ha túl kicsi vagy hibás az intervallum, adunk neki egy alapértelmezett 1 hetet
    if (max <= min) max = min + 86400000 * 7;

    return { minTime: min, maxTime: max };
  }, [topics]);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#f59e0b', fontWeight: 'bold' }}>{t('adminTitle')}</h2>
      <p style={{ color: '#94a3b8', marginBottom: '25px' }}>{t('adminSubtitle')}</p>

      {/* GYANÚS TEVÉKENYSÉGEK PANEL */}
      <div style={{ backgroundColor: '#1e1b4b', padding: '1.5rem', borderRadius: '16px', marginBottom: '2.5rem', border: suspiciousActivities.length > 0 ? '2px solid #ef4444' : '1px solid #334155', boxShadow: '0 8px 25px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: suspiciousActivities.length > 0 ? '#f87171' : '#10b981', fontWeight: 'bold', fontSize: '1.2rem' }}>
            {suspiciousActivities.length > 0 ? `🚨 ${t('adminSuspiciousDetected')}` : `🛡️ ${t('adminSecurityOk')}`}
          </h3>
          <button onClick={fetchSuspicious} style={{ background: '#334155', color: '#cbd5e1', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', transition: 'all 0.2s' }}>
            {loadingSuspicious ? '...' : t('adminSecurityBtn')}
          </button>
        </div>
        {suspiciousActivities.length === 0 ? (
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem', fontStyle: 'italic' }}>{t('adminSecurityClean')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {suspiciousActivities.map((act, index) => (
              <div key={index} style={{ background: '#0f172a', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #ef4444' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>{act.topic_title}</span>
                  <span style={{ color: '#64748b', fontSize: '0.8rem', background: '#1e293b', padding: '4px 10px', borderRadius: '6px' }}>IP: {act.ip_address}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  {act.suspect_list.split(' || ').map((suspect: string, sIdx: number) => {
                    const namePart = suspect.split(' (')[0];
                    const emailPart = suspect.includes('(') ? suspect.split('(')[1].replace(')', '') : '';
                    return (
                      <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '8px 14px', borderRadius: '8px' }}>
                        <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>• {suspect}</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleApproveIp(act.topic_id, emailPart, namePart)} style={{ background: '#10b98120', color: '#4ade80', border: '1px solid #10b98140', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>{t('adminBtnApprove')}</button>
                          <button onClick={() => handleDisqualify(act.topic_id, emailPart, namePart)} style={{ background: '#ef444420', color: '#f87171', border: '1px solid #ef444450', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>{t('mapBtnDelete')}</button>
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
      <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '20px', marginBottom: '3rem', border: '1px solid #f97316', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#f97316', fontWeight: 'bold', fontSize: '1.4rem' }}>
            {editId ? `✏️ ${t('adminFormEdit')}` : `➕ ${t('adminFormNew')}`}
          </h3>
          {editId && <button onClick={clearForm} style={{ background: '#ef444420', color: '#f87171', border: '1px solid #ef444440', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('viewBackBtn')}</button>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <input placeholder="A kihívás témája magyarul (pl. Tavaszi Fények)" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
          <input placeholder="Challenge topic in English (e.g., Spring Lights)" value={titleEn} onChange={e => setTitleEn(e.target.value)} style={{ ...inputStyle, borderColor: '#38bdf860' }} />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <textarea placeholder="Leírás magyarul (Útmutató és részletek a fotósoknak...)" value={desc} onChange={e => setDesc(e.target.value)} style={{...inputStyle, minHeight: '80px'}} />
          <textarea placeholder="Description in English (Guidelines and room details...)" value={descEn} onChange={e => setDescEn(e.target.value)} style={{...inputStyle, minHeight: '80px', borderColor: '#38bdf860'}} />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '0.85rem', color: '#a78bfa', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>👑 {t('adminMasterAssign')}</label>
          <select value={masterEmail} onChange={e => setMasterEmail(e.target.value)} style={inputStyle}>
            <option value="">-- {t('adminMasterNone')} --</option>
            {users.map(u => <option key={u.email} value={u.email}>{u.name} ({u.email})</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '20px', padding: '20px', background: '#0f172a50', borderRadius: '12px', border: '1px dashed #475569' }}>
          <label style={{ fontSize: '0.85rem', color: '#38bdf8', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>🖼️ {t('adminCoverLabel')}</label>
          <input id="cover-file-input" type="file" accept="image/*" onChange={async e => { 
            if(e.target.files?.[0]) {
              const file = e.target.files[0];
              let finalFile = file;
              if (file.size > 2 * 1024 * 1024) {
                finalFile = await compressImageOnClient(file);
              }
              setCoverFile(finalFile);
              setPreviewUrl(URL.createObjectURL(finalFile)); 
            }
          }} style={inputStyle} />
          
          <input placeholder="Borítókép készítőjének neve (pl. Rudolf Kővári-Vágner)" value={coverAuthor} onChange={e => setCoverAuthor(e.target.value)} style={{...inputStyle, marginTop: '5px', marginBottom: '0'}} />
          
          {previewUrl && (
            <div style={{ marginTop: '15px' }}>
              <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold' }}>✨ {t('adminPreviewNew')}</span>
              <img src={previewUrl} alt="" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '10px', marginTop: '6px', border: '1px solid #ef4444' }} />
            </div>
          )}
          
          {coverUrl && !coverFile && (
            <div style={{ marginTop: '15px' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>🖼️ {t('adminPreviewCurrent')}</span>
              <img src={coverUrl} alt="" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '10px', marginTop: '6px', border: '1px solid #334155' }} />
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '25px' }}>
          <div>
            <label style={{fontSize:'0.85rem', color:'#cbd5e1', fontWeight: 'bold', display: 'block', marginBottom: '5px'}}>{t('adminDateStart')}</label>
            <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{fontSize:'0.85rem', color:'#cbd5e1', fontWeight: 'bold', display: 'block', marginBottom: '5px'}}>{t('adminDateEnd')}</label>
            <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <button onClick={handleSave} style={{ background: '#10b981', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '1.05rem', boxShadow: '0 4px 12px rgba(16,185,129,0.2)', transition: 'all 0.2s' }}>
          {editId ? t('adminBtnUpdate') : t('adminBtnSave')}
        </button>
      </div>

      {/* ── 📊 RAGYOGÓ GANTT IDŐVONAL ÉS ÜTEMTERV NÉZET ── */}
      <h3 style={{ color: '#f8fafc', marginBottom: '20px', fontSize: '1.4rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
        📅 {t('adminGanttTitle')}
      </h3>
      
      <div style={{ background: '#1e293b', borderRadius: '20px', border: '1px solid #334155', padding: '25px', overflowX: 'auto', boxShadow: '0 15px 35px rgba(0,0,0,0.4)', boxSizing: 'border-box' }}>
        <div style={{ minWidth: '800px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {topics.map((tData) => {
            const status = getTopicStatus(tData.status, tData.start_date, tData.end_date);
            const isPending = tData.status === 'pending';
            
            // Relatív százalékos pozicionálás számítása a sávokhoz
            const startMillis = parseAdminDateSafe(tData.start_date).getTime();
            const endMillis = parseAdminDateSafe(tData.end_date).getTime();
            
            const totalScope = ganttTimelineBounds.maxTime - ganttTimelineBounds.minTime;
            const leftPercent = ((startMillis - ganttTimelineBounds.minTime) / totalScope) * 100;
            const widthPercent = ((endMillis - startMillis) / totalScope) * 100;

            // Biztonsági korlátok a törések elkerülésére
            const safeLeft = Math.max(0, Math.min(95, leftPercent));
            const safeWidth = Math.max(5, Math.min(100 - safeLeft, widthPercent));

            return (
              <div key={tData.id} style={{ background: '#0f172a60', borderRadius: '16px', border: '1px solid #232f46', padding: '18px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* METADATA RÉSZ (Bal oldal / Felső sor) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '20px', flexWrap: 'nowrap' }}>
                  
                  <div style={{ display: 'flex', gap: '15px', flex: 1, minWidth: 0 }}>
                    {/* Kis borítókép */}
                    <div style={{ width: '80px', height: '50px', backgroundColor: '#0f172a', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #334155', flexShrink: 0 }}>
                      {tData.cover_url ? (
                        <img src={tData.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleImageError} />
                      ) : (
                        <span style={{ fontSize: '1.2rem', opacity: 0.3 }}>🖼️</span>
                      )}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <h4 style={{ margin: 0, fontWeight: 'bold', color: '#f8fafc', fontSize: '1.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tData.title}</h4>
                        <span style={{ background: status.color, color: status.color === '#eab308' ? '#0f172a' : '#fff', fontSize: '0.68rem', padding: '3px 10px', borderRadius: '6px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {status.label}
                        </span>
                      </div>

                      {/* Angol cím */}
                      {tData.title_en && (
                        <div style={{ fontSize: '0.85rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <img src="https://flagcdn.com/w20/gb.png" alt="" style={{ width: '14px', height: 'auto', borderRadius: '2px' }} />
                          <span style={{ fontStyle: 'italic' }}>{tData.title_en}</span>
                        </div>
                      )}

                      {/* Dátumok, Beküldő, Képmester füzér */}
                      <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '5px 12px', alignItems: 'center' }}>
                        <span>📅 {new Date(tData.start_date).toLocaleString(lang === 'en' ? 'en-US' : 'hu-HU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' })} - {new Date(tData.end_date).toLocaleString(lang === 'en' ? 'en-US' : 'hu-HU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' })}</span>
                        {tData.cover_author && <span style={{ color: '#38bdf8' }}>• 📸 {tData.cover_author}</span>}
                        {tData.proposed_by && <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>• 📜 {t('adminProposedBy')} {tData.proposed_by}</span>}
                        {tData.master_email && <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>• 👑 {t('statusMaster')}: {tData.master_email}</span>}
                      </div>
                    </div>
                  </div>

                  {/* AKCIÓGOMBOK (Jobb szél) */}
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {isPending ? (
                      <>
                        <button onClick={() => startEdit(tData)} style={{ background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b50', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f59e0b15'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{t('mapBtnEdit')}</button>
                        <button onClick={() => handleProposalDecision(tData.id, 'approved')} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '7px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', boxShadow: '0 4px 10px rgba(16,185,129,0.2)' }}>{t('adminBtnApprove')}</button>
                        <button onClick={() => handleProposalDecision(tData.id, 'rejected')} style={{ background: '#ef444420', color: '#f87171', border: '1px solid #ef444440', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>{t('adminBtnReject')}</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(tData)} style={{ background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b50', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>{t('mapBtnEdit')}</button>
                        <button onClick={() => handleDelete(tData.id)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>{t('roomBtnDelete')}</button>
                      </>
                    )}
                  </div>

                </div>

                {/* GANTT BAR - VIZUÁLIS IDŐVONAL SÁV */}
                <div style={{ background: '#0f172a80', height: '24px', width: '100%', borderRadius: '8px', position: 'relative', overflow: 'hidden', border: '1px solid #1e293b' }}>
                  <div 
                    style={{ 
                      position: 'absolute', 
                      left: `${safeLeft}%`, 
                      width: `${safeWidth}%`, 
                      height: '100%', 
                      background: `linear-gradient(90deg, ${status.color}80, ${status.color})`,
                      borderRadius: '6px',
                      border: `1px solid ${status.color}`,
                      boxSizing: 'border-box',
                      boxShadow: `0 0 12px ${status.color}30`,
                      transition: 'all 0.3s ease'
                    }} 
                  />
                </div>

                {/* AL-BÍRÁLAT: CSATABÍRÓI JELENTKEZÉS KÁRTYA */}
                {tData.pending_master_email && (
                  <div style={{ background: '#eab30808', padding: '10px 15px', borderRadius: '10px', border: '1px solid #eab30825', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', marginTop: '5px' }}>
                    <span style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      👑 {t('adminMasterPending')}: <strong style={{color: '#fff'}}>{tData.pending_master_email}</strong>
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={async () => {
                        if(!window.confirm(t('adminConfirmAssignMaster').replace('{email}', tData.pending_master_email))) return;
                        const res = await fetch(`${BACKEND_URL}/api/admin/decide-master`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ topicId: tData.id, decision: 'approved' })});
                        if(res.ok) { alert(t('adminMasterSuccess')); fetchTopics(); }
                      }} style={{ background: '#10b981', color: '#0f172a', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' }}>{t('adminBtnApprove')}</button>
                      <button onClick={async () => {
                        if(!window.confirm(t('adminConfirmRejectMaster'))) return;
                        const res = await fetch(`${BACKEND_URL}/api/admin/decide-master`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ topicId: tData.id, decision: 'rejected' })});
                        if(res.ok) { alert(t('adminMasterRejected')); fetchTopics(); }
                      }} style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444450', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' }}>{t('adminBtnReject')}</button>
                    </div>
                  </div>
                )}

              </div>
            );
          })}

        </div>
      </div>

    </div>
  );
}
