import React, { useState, useEffect, useRef } from 'react';
import { ADMIN_EMAIL, BACKEND_URL } from '../utils/constants';

interface TicketsViewProps {
  user: any;
}

export default function TicketsView({ user }: TicketsViewProps) {
  const inputStyle = { width: '100%', padding: '12px', marginBottom: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '10px', boxSizing: 'border-box' as const, fontSize: '0.95rem', outline: 'none' };
  
  const isAdmin = user?.email === ADMIN_EMAIL;
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  
  // Új ticket form state
  const [subject, setSubject] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  
  // Új válasz state
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Ticketek betöltése
  const loadTickets = () => {
    fetch(`${BACKEND_URL}/api/tickets?userEmail=${user.email}&isAdmin=${isAdmin}`)
      .then(res => res.json())
      .then(data => setTickets(data || []))
      .catch(console.error);
  };

  useEffect(() => {
    loadTickets();
  }, [user]);

  // Válaszok betöltése egy kiválasztott tickethez
  useEffect(() => {
    if (selectedTicket) {
      fetch(`${BACKEND_URL}/api/tickets/${selectedTicket.id}/replies`)
        .then(res => res.json())
        .then(data => {
          setReplies(data || []);
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        })
        .catch(console.error);
    }
  }, [selectedTicket]);

  // Új ticket beküldése (User)
  const handleCreateTicket = async () => {
    if (!subject.trim() || !initialMessage.trim()) return alert('Kérlek töltsd ki a tárgyat és az üzenetet is!');
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email, userName: user.name, subject, message: initialMessage })
      });
      if (res.ok) {
        alert('🚀 Hibajegy sikeresen elküldve! Hamarosan válaszolunk.');
        setSubject('');
        setInitialMessage('');
        loadTickets();
      }
    } catch (e) { alert('Hiba történt a küldés során.'); }
  };

  // Új válasz hozzáadása a beszélgetéshez
  const handleSendReply = async () => {
    if (!replyMessage.trim()) return;
    setIsSending(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/tickets/${selectedTicket.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderEmail: user.email, senderName: user.name, message: replyMessage })
      });
      if (res.ok) {
        setReplyMessage('');
        // Ha admin válaszol, automatikuszan "folyamatban"-ra állítjuk a státuszt
        if (isAdmin && selectedTicket.status === 'open') {
          handleUpdateStatus(selectedTicket.id, 'in_progress');
        }
        // Frissítjük a chatet
        const freshRepliesRes = await fetch(`${BACKEND_URL}/api/tickets/${selectedTicket.id}/replies`);
        setReplies(await freshRepliesRes.json());
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (e) { console.error(e); } finally { setIsSending(false); }
  };

  // Státusz frissítése (Admin)
  const handleUpdateStatus = async (ticketId: number, newStatus: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
        loadTickets();
      }
    } catch (e) { console.error(e); }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { text: string, color: string, bg: string }> = {
      open: { text: 'Új bejelentés', color: '#38bdf8', bg: '#38bdf815' },
      in_progress: { text: 'Folyamatban', color: '#f59e0b', bg: '#f59e0b15' },
      closed: { text: 'Lezárva', color: '#10b981', bg: '#10b98115' }
    };
    const s = config[status] || config.open;
    return <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}30`, padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold' }}>{s.text}</span>;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedTicket ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', alignItems: 'start' }}>
      
      {/* BAL OLDAL: JELENTŐ PANEL VAGY TICKET LISTA */}
      {!selectedTicket && (
        <>
          {/* USERNEK: ÚJ TICKET NYITÁSA */}
          {!isAdmin && (
            <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#38bdf8', fontSize: '1.3rem' }}>🛠️ Új Segítségkérés indítása</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px', lineHeight: '1.5' }}>Gondod akadt a fizetéssel, a Drive-feltöltéssel vagy hibát találtál? Írd meg bátran, és az Adminisztrátor hamarosan válaszol!</p>
              <input placeholder="Hiba rövid megnevezése (Tárgy)..." value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} />
              <textarea placeholder="Részletes leírás, mi történt..." value={initialMessage} onChange={e => setInitialMessage(e.target.value)} style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }} />
              <button onClick={handleCreateTicket} style={{ width: '100%', background: 'linear-gradient(135deg, #38bdf8, #0284c7)', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Hibajegy Elküldése 🚀</button>
            </div>
          )}

          {/* LISTA SZEKCIÓ */}
          <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', gridColumn: isAdmin ? '1 / -1' : 'auto' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#cbd5e1', fontSize: '1.3rem' }}>{isAdmin ? '📂 Beérkezett Ügyfélszolgálati Jegyek' : '📜 Korábbi Hibajegyeim'}</h3>
            
            {tickets.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', margin: '20px 0' }}>Nincs aktív vagy korábbi bejelentésed.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tickets.map(t => (
                  <div key={t.id} onClick={() => setSelectedTicket(t)} style={{ background: '#0f172a', padding: '15px 20px', borderRadius: '14px', border: '1px solid #334155', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s, border-color 0.2s' }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#475569'; }} onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = '#334155'; }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '1rem', marginBottom: '4px' }}>{t.subject}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {isAdmin ? `Beküldő: ${t.user_name} (${t.user_email})` : 'Ügyfélszolgálat'} • {new Date(t.updated_at).toLocaleDateString('hu-HU')}
                      </div>
                    </div>
                    <div>{getStatusBadge(t.status)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* JOBB OLDAL / TELJES ABALAK: A CHAT DIALÓGUS */}
      {selectedTicket && (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', height: '70vh', boxShadow: '0 15px 40px rgba(0,0,0,0.4)', animation: 'fadeIn 0.2s' }}>
          
          {/* CHAT FEJLÉC */}
          <div style={{ padding: '20px 30px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', borderRadius: '24px 24px 0 0' }}>
            <div>
              <button onClick={() => { setSelectedTicket(null); loadTickets(); }} style={{ background: 'transparent', color: '#38bdf8', border: 'none', cursor: 'pointer', padding: '0 0 5px 0', fontSize: '0.9rem', fontWeight: 'bold' }}>← Vissza a listához</button>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.2rem' }}>{selectedTicket.subject}</h3>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Felhasználó: <b>{selectedTicket.user_name}</b> ({selectedTicket.user_email})</div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {getStatusBadge(selectedTicket.status)}
              
              {/* ADMIN VEZÉRLŐ GOMBOK */}
              {isAdmin && (
                <select 
                  value={selectedTicket.status} 
                  onChange={e => handleUpdateStatus(selectedTicket.id, e.target.value)}
                  style={{ background: '#1e293b', color: 'white', border: '1px solid #475569', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  <option value="open">Új / Nyitott</option>
                  <option value="in_progress">Folyamatban</option>
                  <option value="closed">Lezárva ✓</option>
                </select>
              )}
            </div>
          </div>

          {/* CHAT GÖRDÜLŐ ÜZENETEK */}
          <div style={{ flex: 1, padding: '30px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', background: '#090d16' }}>
            {replies.map(r => {
              const isMe = r.sender_email === user.email;
              return (
                <div key={r.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '4px', padding: '0 5px' }}>{r.sender_name}</div>
                  <div style={{ background: isMe ? 'linear-gradient(135deg, #38bdf8, #0284c7)' : '#1e293b', color: isMe ? '#0f172a' : '#f8fafc', padding: '12px 18px', borderRadius: isMe ? '18px 18px 0 18px' : '18px 18px 18px 0', fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                    {r.message}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#334155', marginTop: '4px', padding: '0 5px' }}>{new Date(r.created_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* CHAT BEVITELI MEZŐ ALUL */}
          {selectedTicket.status === 'closed' ? (
            <div style={{ padding: '20px', textBackground: 'center', background: '#0f172a', color: '#10b981', fontWeight: 'bold', textAlign: 'center', borderRadius: '0 0 24px 24px', borderTop: '1px solid #334155' }}>
              🔒 Ez a probléma sikeresen le lett zárva.
            </div>
          ) : (
            <div style={{ padding: '20px 30px', borderTop: '1px solid #334155', background: '#0f172a', borderRadius: '0 0 24px 24px', display: 'flex', gap: '15px', alignItems: 'center' }}>
              <input 
                placeholder="Írd meg a választ ide..." 
                value={replyMessage} 
                onChange={e => setReplyMessage(e.target.value)}
                onKeyDown={e => { if(e.key === 'Enter' && !isSending) handleSendReply(); }}
                style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                disabled={isSending}
              />
              <button 
                onClick={handleSendReply} 
                disabled={isSending || !replyMessage.trim()}
                style={{ background: (!replyMessage.trim() || isSending) ? '#334155' : '#10b981', color: (!replyMessage.trim() || isSending) ? '#64748b' : '#0f172a', border: 'none', padding: '12px 25px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {isSending ? '...' : 'Küldés ✉️'}
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
