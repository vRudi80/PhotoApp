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

const formatDateToMySQL = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const parseAdminDateSafe = (dateStr: string) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split(/[- :T]/);
  if (parts.length >= 5) {
    const d = new Date(
      parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]),
      parseInt(parts[3]), parseInt(parts[4]), parts[5] ? parseInt(parts[5]) : 0
    );
    if (!isNaN(d.getTime())) return d;
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
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

  const [timeWindow, setTimeWindow] = useState<'all' | 'current_month' | 'next_30'>('all');

  const [activeDrag, setActiveDrag] = useState<{
    topicId: number;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    originalStartMs: number;
    originalEndMs: number;
  } | null>(null);

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', boxSizing: 'border-box' as const };

  const getTopicStatus = (statusStr: string, sDateStr: string, eDateStr: string) => {
    if (statusStr === 'pending') return { label: t('adminStatusPending'), color: '#eab308' };
    if (statusStr === 'rejected') return { label: t('adminStatusRejected'), color: '#ef4444' };

    const today = new Date();
    const start = parseAdminDateSafe(sDateStr);
    const end = parseAdminDateSafe(eDateStr);
    
    if (today > end) return { label: t('adminStatusEnded'), color: '#94a3b8' };
    if (today < start) return { label: t('adminStatusScheduled'), color: '#38bdf8' };
    return { label: t('adminStatusLive'), color: '#10b981' };
  };

  const fetchTopics = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly-topics`);
      if (res.ok) setTopics(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
    try {
      const usersRes = await fetch(`${BACKEND_URL}/api/admin/weekly/users`);
      if (usersRes.ok) setUsers(await usersRes.json());
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
      if (res.ok) { alert(t('adminIpResolvedSuccess')); fetchSuspicious(); }
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
      if (res.ok) { alert(t('adminDecisionSaved')); fetchTopics(); }
    } catch (e) { alert(t('msgNetworkError')); }
  };
  
  const clearForm = () => {
    setEditId(null); setTitle(''); setTitleEn(''); setDesc(''); setDescEn('');
    setStartDate(''); setEndDate(''); setMasterEmail(''); setCoverFile(null); setCoverUrl(''); setCoverAuthor('');
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(''); }
    const fileInput = document.getElementById('cover-file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const startEdit = (tData: any) => {
    setEditId(tData.id); setTitle(tData.title); setTitleEn(tData.title_en || '');
    setDesc(tData.description || ''); setDescEn(tData.description_en || '');
    setStartDate(tData.start_date ? formatDateTimeLocal(tData.start_date) : '');
    setEndDate(tData.end_date ? formatDateTimeLocal(tData.end_date) : '');
    setMasterEmail(tData.master_email || ''); setCoverUrl(tData.cover_url || ''); setCoverAuthor(tData.cover_author || '');
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(''); }
    setCoverFile(null); window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!title || !startDate || !endDate) return alert(t('mapFillRequired'));
    try {
      const url = editId ? `${BACKEND_URL}/api/admin/weekly-topics/${editId}` : `${BACKEND_URL}/api/admin/weekly-topics`;
      const method = editId ? 'PUT' : 'POST';
      const formData = new FormData();
      formData.append('title', title); formData.append('title_en', titleEn); 
      formData.append('description', desc); formData.append('description_en', descEn); 
      formData.append('startDate', startDate); formData.append('endDate', endDate);
      formData.append('masterEmail', masterEmail); formData.append('coverAuthor', coverAuthor);
      if (coverUrl) formData.append('coverUrl', coverUrl);
      if (coverFile) formData.append('cover', coverFile);

      const res = await fetch(url, { method, body: formData });
      if (res.ok) { alert(t('msgMapUpdateSuccess')); clearForm(); fetchTopics(); fetchSuspicious(); }
    } catch (e) { alert(t('msgNetworkError')); }
  };

  const handleQuickGanttSave = async (tData: any) => {
    try {
      const formData = new FormData();
      formData.append('title', tData.title);
      formData.append('title_en', tData.title_en || '');
      formData.append('description', tData.description || '');
      formData.append('description_en', tData.description_en || '');
      formData.append('startDate', tData.start_date);
      formData.append('endDate', tData.end_date);
      formData.append('masterEmail', tData.master_email || '');
      formData.append('coverAuthor', tData.cover_author || '');
      
      if (tData.cover_url) {
        formData.append('coverUrl', tData.cover_url);
      }

      const res = await fetch(`${BACKEND_URL}/api/admin/weekly-topics/${tData.id}`, {
        method: 'PUT',
        body: formData
      });

      if (res.ok) {
        alert(lang === 'en' ? '🎉 Timeline period successfully updated and saved!' : '🎉 Az új időszak sikeresen elmentve az adatbázisban!');
        fetchTopics();
      } else {
        alert(t('msgNetworkError'));
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('msgMapDeleteConfirm'))) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/weekly-topics/${id}`, { method: 'DELETE' });
      if (res.ok) { fetchTopics(); fetchSuspicious(); }
    } catch (e) { alert(t('msgNetworkError')); }
  };

  const ganttCalendarData = useMemo(() => {
    let absoluteMin = Infinity;
    let absoluteMax = 0;

    topics.forEach(tData => {
      if (!tData.start_date || !tData.end_date) return;
      const start = parseAdminDateSafe(tData.start_date).getTime();
      const end = parseAdminDateSafe(tData.end_date).getTime();
      if (isNaN(start) || isNaN(end)) return;
      if (start < absoluteMin) absoluteMin = start;
      if (end > absoluteMax) absoluteMax = end;
    });

    if (absoluteMin === Infinity || absoluteMax === 0) {
      const current = new Date();
      absoluteMin = new Date(current.getFullYear(), current.getMonth(), 1).getTime();
      absoluteMax = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59).getTime();
    }

    const nowTs = Date.now();
    if (timeWindow === 'current_month') {
      const current = new Date();
      absoluteMin = new Date(current.getFullYear(), current.getMonth(), 1).getTime();
      absoluteMax = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59).getTime();
    } else if (timeWindow === 'next_30') {
      absoluteMin = nowTs;
      absoluteMax = nowTs + 86400000 * 30;
    }

    const minDate = new Date(absoluteMin);
    const dayOfMin = minDate.getDay();
    const diffToMonday = dayOfMin === 0 ? -6 : 1 - dayOfMin;
    minDate.setDate(minDate.getDate() + diffToMonday);
    minDate.setHours(0, 0, 0, 0);

    const maxDate = new Date(absoluteMax);
    const dayOfMax = maxDate.getDay();
    const diffToSunday = dayOfMax === 0 ? 0 : 7 - dayOfMax;
    maxDate.setDate(maxDate.getDate() + diffToSunday);
    maxDate.setHours(23, 59, 59, 999);

    const daysArray: Date[] = [];
    let current = new Date(minDate);
    let loopGuard = 0;
    while (current <= maxDate && loopGuard < 365) {
      daysArray.push(new Date(current));
      current.setDate(current.getDate() + 1);
      loopGuard++;
    }

    const weeks = [];
    for (let i = 0; i < daysArray.length; i += 7) {
      weeks.push(daysArray.slice(i, i + 7));
    }

    return { minTime: minDate.getTime(), maxTime: maxDate.getTime(), weeks, totalDays: daysArray.length, daysArray };
  }, [topics, timeWindow]);

  const monthsSpans = useMemo(() => {
    if (ganttCalendarData.daysArray.length === 0) return [];
    const spans: { month: number; year: number; daysCount: number }[] = [];
    let currentMonth = ganttCalendarData.daysArray[0].getMonth();
    let currentYear = ganttCalendarData.daysArray[0].getFullYear();
    let count = 0;

    ganttCalendarData.daysArray.forEach((date) => {
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) { count++; } 
      else {
        spans.push({ month: currentMonth, year: currentYear, daysCount: count });
        currentMonth = date.getMonth(); currentYear = date.getFullYear(); count = 1;
      }
    });
    spans.push({ month: currentMonth, year: currentYear, daysCount: count });
    return spans;
  }, [ganttCalendarData.daysArray]);

  const nowIndicatorPositionPx = useMemo(() => {
    const now = Date.now();
    if (now < ganttCalendarData.minTime || now > ganttCalendarData.maxTime) return null;
    const elapsedMs = now - ganttCalendarData.minTime;
    return (elapsedMs / 86400000) * 40;
  }, [ganttCalendarData]);

  // Drag & drop egérfigyelő
  useEffect(() => {
    if (!activeDrag) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - activeDrag.startX;
      const msPerPx = 86400000 / 40; 
      const deltaMs = deltaX * msPerPx;

      setTopics(prev => prev.map(topic => {
        if (topic.id !== activeDrag.topicId) return topic;

        let newStartMs = activeDrag.originalStartMs;
        let newEndMs = activeDrag.originalEndMs;

        if (activeDrag.type === 'move') {
          newStartMs += deltaMs;
          newEndMs += deltaMs;
        } else if (activeDrag.type === 'resize-start') {
          newStartMs = Math.min(activeDrag.originalEndMs - 3600000, activeDrag.originalStartMs + deltaMs);
        } else if (activeDrag.type === 'resize-end') {
          newEndMs = Math.max(activeDrag.originalStartMs + 3600000, activeDrag.originalEndMs + deltaMs);
        }

        return {
          ...topic,
          start_date: formatDateToMySQL(new Date(newStartMs)),
          end_date: formatDateToMySQL(new Date(newEndMs)),
          isGanttModified: true 
        };
      }));
    };

    const handleGlobalMouseUp = () => { setActiveDrag(null); };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [activeDrag]);

  useEffect(() => {
    fetchTopics(); fetchUsers(); fetchSuspicious();
  }, []);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#f59e0b', fontWeight: 'bold' }}>{t('adminTitle')}</h2>
      <p style={{ color: '#94a3b8', marginBottom: '25px' }}>{t('adminSubtitle')}</p>

      {/* GYANÚS TEVÉKENYSÉGEK */}
      <div style={{ backgroundColor: '#1e1b4b', padding: '1.5rem', borderRadius: '16px', marginBottom: '2.5rem', border: suspiciousActivities.length > 0 ? '2px solid #ef4444' : '1px solid #334155', boxShadow: '0 8px 25px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: suspiciousActivities.length > 0 ? '#f87171' : '#10b981', fontWeight: 'bold', fontSize: '1.2rem' }}>
            {suspiciousActivities.length > 0 ? `🚨 ${t('adminSuspiciousDetected')}` : `🛡️ ${t('adminSecurityOk')}`}
          </h3>
          <button onClick={fetchSuspicious} style={{ background: '#334155', color: '#cbd5e1', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
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

      {/* ŰRLAP PANEL */}
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
              if (file.size > 2 * 1024 * 1024) { finalFile = await compressImageOnClient(file); }
              setCoverFile(finalFile); setPreviewUrl(URL.createObjectURL(finalFile)); 
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
            <label style={{fontSize:'0.85rem', color:'#cbd5e1', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>{t('adminDateStart')}</label>
            <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{fontSize:'0.85rem', color:'#cbd5e1', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>{t('adminDateEnd')}</label>
            <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <button onClick={handleSave} style={{ background: '#10b981', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '1.05rem', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}>
          {editId ? t('adminBtnUpdate') : t('adminBtnSave')}
        </button>
      </div>

      {/* GANTT TIMELINE DASHBOARD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h3 style={{ color: '#f8fafc', margin: 0, fontSize: '1.4rem', fontWeight: 'bold' }}>📅 {t('adminGanttTitle')}</h3>
        <div style={{ display: 'flex', gap: '5px', background: '#0f172a', padding: '4px', borderRadius: '10px', border: '1px solid #334155' }}>
          <button onClick={() => setTimeWindow('all')} style={{ background: timeWindow === 'all' ? '#38bdf8' : 'transparent', color: timeWindow === 'all' ? '#0f172a' : '#94a3b8', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>{lang === 'en' ? 'Show All' : 'Mind'}</button>
          <button onClick={() => setTimeWindow('current_month')} style={{ background: timeWindow === 'current_month' ? '#38bdf8' : 'transparent', color: timeWindow === 'current_month' ? '#0f172a' : '#94a3b8', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>{lang === 'en' ? 'This Month' : 'Aktuális hónap'}</button>
          <button onClick={() => setTimeWindow('next_30')} style={{ background: timeWindow === 'next_30' ? '#38bdf8' : 'transparent', color: timeWindow === 'next_30' ? '#0f172a' : '#94a3b8', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>{lang === 'en' ? 'Next 30 Days' : 'Következő 30 nap'}</button>
        </div>
      </div>
      
      {/* NAPTÁR CANVAS REGET */}
      <div style={{ background: '#1e293b', borderRadius: '24px', border: '1px solid #334155', padding: '25px', overflowX: 'auto', boxShadow: '0 15px 35px rgba(0,0,0,0.4)', boxSizing: 'border-box' }}>
        <div style={{ width: 'max-content', display: 'flex', flexDirection: 'column', gap: '15px', position: 'relative', userSelect: activeDrag ? 'none' : 'auto' }}>
          
          {/* STICKY FEJLÉC */}
          <div style={{ display: 'grid', gridTemplateColumns: `460px ${ganttCalendarData.totalDays * 40}px`, borderBottom: '2px solid #475569', paddingBottom: '12px' }}>
            <div style={{ color: '#38bdf8', fontWeight: '900', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', paddingLeft: '14px', boxSizing: 'border-box' }}>
              {t('adminGanttChallengeColumn')}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <div style={{ display: 'flex', width: '100%', borderBottom: '1px solid rgba(71, 85, 105, 0.4)', paddingBottom: '6px' }}>
                {monthsSpans.map((span, sIdx) => {
                  const monthNamesHu = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];
                  const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                  return (
                    <div key={sIdx} style={{ width: `${span.daysCount * 40}px`, minWidth: `${span.daysCount * 40}px`, textAlign: 'center', color: '#a78bfa', fontWeight: 'black', fontSize: '0.88rem', borderLeft: '1px solid rgba(167, 139, 250, 0.25)', boxSizing: 'border-box', whiteSpace: 'nowrap', padding: '0 5px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {span.year} {lang === 'en' ? monthNamesEn[span.month] : monthNamesHu[span.month]}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', width: '100%', paddingTop: '4px' }}>
                {ganttCalendarData.daysArray.map((date, dIdx) => {
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <div key={dIdx} style={{ width: '40px', minWidth: '40px', textAlign: 'center', fontSize: '0.78rem', fontWeight: 'bold', fontFamily: 'monospace', color: isWeekend ? '#f87171' : '#cbd5e1', background: isWeekend ? 'rgba(239, 68, 68, 0.06)' : 'transparent', padding: '3px 0', borderLeft: date.getDate() === 1 ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>
                      {date.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CAMPAIGN HADITERV SOROK */}
          {topics.map((tData) => {
            const status = getTopicStatus(tData.status, tData.start_date, tData.end_date);
            const isPending = tData.status === 'pending';
            
            const startMillis = parseAdminDateSafe(tData.start_date).getTime();
            const endMillis = parseAdminDateSafe(tData.end_date).getTime();

            if (timeWindow !== 'all' && (endMillis < ganttCalendarData.minTime || startMillis > ganttCalendarData.maxTime)) {
              return null;
            }

            const leftPx = ((startMillis - ganttCalendarData.minTime) / 86400000) * 40;
            const widthPx = ((endMillis - startMillis) / 86400000) * 40;

            const visualLeftPx = Math.max(0, leftPx);
            const visualWidthPx = leftPx < 0 ? Math.max(0, widthPx + leftPx) : widthPx;
            const isCurrentlyDragging = activeDrag?.topicId === tData.id;

            // ── 🎯 🎯 JAVÍTVA: A TOOLTIPTEXT VÁLTOZÓ DEKLARÁCIÓJA VISSZAKERÜLT A MEGFELELŐ HELYRE! ──
            const tooltipStart = new Date(tData.start_date).toLocaleString(lang === 'en' ? 'en-US' : 'hu-HU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' });
            const tooltipEnd = new Date(tData.end_date).toLocaleString(lang === 'en' ? 'en-US' : 'hu-HU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' });
            const tooltipText = `${t('adminTooltipFrom') || 'Kezdet'}: ${tooltipStart} ➔ ${t('adminTooltipTo') || 'Vége'}: ${tooltipEnd}`;

            return (
              <div key={tData.id} style={{ display: 'grid', gridTemplateColumns: `460px ${ganttCalendarData.totalDays * 40}px`, alignItems: 'center', background: tData.isGanttModified ? '#10b98108' : '#0f172a30', borderRadius: '16px', border: tData.isGanttModified ? '1px solid #10b98150' : '1px solid #232f46', padding: '14px 0px', boxSizing: 'border-box' }}>
                
                <div style={{ display: 'flex', gap: '14px', paddingLeft: '14px', paddingRight: '15px', minWidth: 0, boxSizing: 'border-box', alignItems: 'center' }}>
                  <div style={{ width: '74px', height: '46px', backgroundColor: '#0f172a', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #334155', flexShrink: 0 }}>
                    {tData.cover_url ? <img src={tData.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleImageError} /> : <span style={{ fontSize: '1rem', opacity: 0.3 }}>🖼️</span>}
                  </div>

                  <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <h4 style={{ margin: 0, fontWeight: 'bold', color: '#f8fafc', fontSize: '1.05rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tData.title}</h4>
                    {tData.title_en && (
                      <div style={{ fontSize: '0.82rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <img src="https://flagcdn.com/w20/gb.png" alt="" style={{ width: '12px', height: 'auto', borderRadius: '1px' }} />
                        <span style={{ fontStyle: 'italic' }}>{tData.title_en}</span>
                      </div>
                    )}
                    <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '2px 8px', alignItems: 'center' }}>
                      <span style={{ color: status.color, fontWeight: 'bold', background: `${status.color}10`, padding: '1px 6px', borderRadius: '4px' }}>{status.label}</span>
                      {tData.proposed_by && <span style={{ color: '#f59e0b' }}>• 📜 {tData.proposed_by.split('@')[0]}</span>}
                      {tData.master_email && <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>• 👑 {tData.master_email.split('@')[0]}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      
                      {tData.isGanttModified ? (
                        <button onClick={() => handleQuickGanttSave(tData)} className="gantt-glow-save-btn" style={{ background: '#10b981', color: '#0f172a', border: 'none', padding: '3px 12px', borderRadius: '50px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'black', boxShadow: '0 0 10px #10b98180' }}>
                          💾 {lang === 'en' ? 'Save Period' : 'Dátum Mentése'}
                        </button>
                      ) : (
                        <button onClick={() => startEdit(tData)} style={{ background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b40', padding: '3px 10px', borderRadius: '50px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>{t('mapBtnEdit')}</button>
                      )}

                      {isPending ? (
                        <>
                          <button onClick={() => handleProposalDecision(tData.id, 'approved')} style={{ background: '#10b981', color: '#0f172a', border: 'none', padding: '3px 10px', borderRadius: '50px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>{t('adminBtnApprove')}</button>
                          <button onClick={() => handleProposalDecision(tData.id, 'rejected')} style={{ background: '#ef444420', color: '#f87171', border: '1px solid #ef444440', padding: '3px 10px', borderRadius: '50px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>{t('adminBtnReject')}</button>
                        </>
                      ) : (
                        <button onClick={() => handleDelete(tData.id)} style={{ background: '#ef444415', color: '#ef4444', border: 'none', padding: '3px 10px', borderRadius: '50px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>{t('roomBtnDelete')}</button>
                      )}
                    </div>
                  </div>
                </div>

                {/* JOBB CELLA */}
                <div className="gantt-bar-container" style={{ position: 'relative', width: '100%', height: '40px', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
                  
                  <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: `repeat(${ganttCalendarData.totalDays}, 1fr)`, pointerEvents: 'none', zIndex: 1 }}>
                    {ganttCalendarData.daysArray.map((date, rIdx) => {
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      return <div key={rIdx} style={{ borderLeft: '1px solid rgba(51, 65, 85, 0.12)', height: '100%', background: isWeekend ? 'rgba(239, 68, 68, 0.015)' : 'transparent' }} />;
                    })}
                  </div>

                  <div 
                    title={tooltipText} 
                    className={isCurrentlyDragging ? 'gantt-bar-dragging' : ''}
                    style={{ 
                      position: 'absolute', left: `${visualLeftPx}px`, width: `${visualWidthPx}px`, height: '24px', 
                      background: tData.isGanttModified ? 'linear-gradient(135deg, #059669, #10b981)' : status.label === t('adminStatusEnded') ? 'linear-gradient(135deg, #475569, #64748b)' : `linear-gradient(135deg, ${status.color}90, ${status.color})`,
                      borderRadius: '6px', border: tData.isGanttModified ? '1px solid #34d399' : status.label === t('adminStatusEnded') ? '1px solid #475569' : `1px solid ${status.color}`, boxSizing: 'border-box',
                      boxShadow: tData.isGanttModified ? '0 0 12px rgba(16,185,129,0.4)' : `0 3px 8px ${status.color}25`, cursor: 'move', zIndex: 2, display: 'flex', justifyContent: 'space-between', overflow: 'hidden'
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setActiveDrag({ topicId: tData.id, type: 'move', startX: e.clientX, originalStartMs: startMillis, originalEndMs: endMillis });
                    }}
                  >
                    <div 
                      className="gantt-resize-handle"
                      style={{ width: '8px', height: '100%', cursor: 'ew-resize', background: 'rgba(255,255,255,0.1)' }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setActiveDrag({ topicId: tData.id, type: 'resize-start', startX: e.clientX, originalStartMs: startMillis, originalEndMs: endMillis });
                      }}
                    />
                    <div 
                      className="gantt-resize-handle"
                      style={{ width: '8px', height: '100%', cursor: 'ew-resize', background: 'rgba(255,255,255,0.1)' }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setActiveDrag({ topicId: tData.id, type: 'resize-end', startX: e.clientX, originalStartMs: startMillis, originalEndMs: endMillis });
                      }}
                    />
                  </div>

                  {tData.pending_master_email && (
                    <div style={{ position: 'absolute', bottom: '-10px', left: `${visualLeftPx}px`, background: '#eab308', color: '#0f172a', fontSize: '0.62rem', padding: '1px 5px', borderRadius: '4px', fontWeight: 'black', zIndex: 3, boxShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
                      👑 PENDING MASTER
                    </div>
                  )}
                </div>

              </div>
            );
          })}

          {/* VÖRÖS JELZŐ CSÍK */}
          {nowIndicatorPositionPx !== null && (
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${460 + nowIndicatorPositionPx}px`, width: '2px', background: 'linear-gradient(180deg, #ef4444, #b91c1c)', zIndex: 99, pointerEvents: 'none', boxShadow: '0 0 12px #ef4444, 0 0 4px #ef4444' }}>
              <div style={{ position: 'absolute', top: '18px', left: '-5px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444', boxShadow: '0 0 10px #ef4444, inset 0 0 4px #fff' }} />
            </div>
          )}

        </div>
      </div>

      <style>{`
        .gantt-bar-container div[title]:hover::after,
        .gantt-bar-container .gantt-bar-dragging::after {
          content: attr(title); position: absolute; bottom: 140%; left: 50%; transform: translateX(-50%);
          background: #0f172a; color: #f8fafc; padding: 7px 14px; border-radius: 8px; font-size: 0.8rem;
          font-family: monospace; white-space: nowrap; border: 1px solid #475569; box-shadow: 0 8px 20px rgba(0,0,0,0.6);
          zIndex: 99999; pointer-events: none; opacity: 1 !important; visibility: visible !important; display: block !important;
        }
        .gantt-resize-handle:hover { background: rgba(255,255,255,0.3) !important; }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 5px #10b98160; }
          50% { box-shadow: 0 0 15px #10b981bb; }
          100% { box-shadow: 0 0 5px #10b98160; }
        }
        .gantt-glow-save-btn { animation: pulseGlow 1.5s infinite ease-in-out; }
      `}</style>
    </div>
  );
}
