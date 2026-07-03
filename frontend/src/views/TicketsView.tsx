import React, { useState, useEffect, useRef } from 'react';
import { ADMIN_EMAIL, BACKEND_URL } from '../utils/constants';

// Nyelvi környezet beemelése
import { useLanguage } from '../context/LanguageContext';

interface TicketsViewProps {
  user: any;
}

// KÖZPONTI AUTH FEJLÉC GENERÁTOR HELYI RENDERSZINTRE
const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('photoAppToken');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

export default function TicketsView({ user }: TicketsViewProps) {
  const { t, lang } = useLanguage();

  const inputStyle = { width: '100%', padding: '12px', marginBottom: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '10px', boxSizing: 'border-box' as const, fontSize: '0.95rem', outline: 'none' };
  
  const isAdmin = user?.email === ADMIN_EMAIL;
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  
  // 🎯 ÚJ: Betöltési állapot a villódzás és a korai hibaüzenetek ellen
  const [loading, setLoading] = useState(true);
  
  const [subject, setSubject] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Ticketek betöltése
  const loadTickets = () => {
    const token = localStorage.getItem('photoAppToken');
    if (!token || !user?.email) return;

    fetch(`${BACKEND_URL}/api/tickets`, {
      headers: getAuthHeaders()
    })
      .then(res => res.json())
      .then(data => {
        setTickets(Array.isArray(data) ? data : []);
        setLoading(false); // 🎯 Betöltés sikeresen lezárult
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!user?.email) {
      setLoading(true);
      return;
    }
    loadTickets();
  }, [user]);

  // Válaszok betöltése egy kiválasztott tickethez
  useEffect(() => {
    if (selectedTicket && user?.email) {
      fetch(`${BACKEND_URL}/api/tickets/${selectedTicket.id}/replies`, {
        headers: getAuthHeaders()
      })
        .then(res => res.json())
        .then(data => {
          setReplies(Array.isArray(data) ? data : []);
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        })
        .catch(console.error);
    }
  }, [selectedTicket, user]);

  const handleCreateTicket = async () => {
    if (!user?.email) return;
    if (!subject.trim() || !initialMessage.trim()) return alert(t('msgTicketsFillRequired'));
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/tickets`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userEmail: user.email, userName: user.name, subject, message: initialMessage })
      });
      if (res.ok) {
        alert(t('msgTicketsSubmitSuccess'));
        setSubject('');
        setInitialMessage('');
        loadTickets();
      }
    } catch (e) { alert(t('msgTicketsSubmitError')); }
  };

  const handleSendReply = async () => {
    if (!user?.email || !replyMessage.trim() || isSending) return;
    setIsSending(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/tickets/${selectedTicket.id}/replies`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ message: replyMessage })
      });
      if (res.ok) {
        setReplyMessage('');
        const freshRepliesRes = await fetch(`${BACKEND_URL}/api/tickets/${selectedTicket.id}/replies`, {
          headers: getAuthHeaders()
        });
        const freshData = await freshRepliesRes.json();
        setReplies(Array.isArray(freshData) ? freshData : []);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (e) { console.error(e); } finally { setIsSending(false); }
  };

  const handleUpdateStatus = async (ticketId: number, newStatus: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
      open: { text: t('ticketsStatusOpen'), color: '#38bdf8', bg: '#38bdf815' },
      in_progress: { text: t('ticketsStatusInProgress'), color: '#f59e0b', bg: '#f59e0b15' },
      closed: { text: t('ticketsStatusClosed'), color: '#10b981', bg: '#10b98115' }
    };
    const s = config[status] || config.open;
    return <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}30`, padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold' }}>{s.text}</span>;
  };

  // 🎯 ÚJ: Amíg nincs felhasználó vagy töltődnek a jegyek, tiszta és professzionális várakozás jön be
  if (loading) {
    return (
      <div style={{ color: '#64748b', textAlign: 'center', padding: '60px 20px', fontStyle: 'italic' }}>
        ⏳ {lang === 'en' ? 'Synchronizing tickets and secure session...' : 'Hibajegyek és biztonságos munkamenet szinkronizálása...'}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedTicket ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', alignItems: 'start' }}>
      
      {!selectedTicket && (
        <>
          {!isAdmin && (
            <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#38bdf8', fontSize: '1.3rem' }}>{t('ticketsNewTicketTitle')}</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px', lineHeight: '1.5' }}>{t('ticketsNewTicketDesc')}</p>
              <input placeholder={t('ticketsSubjectPlaceholder')} value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} />
              <textarea placeholder={t('ticketsMessagePlaceholder')} value={initialMessage} onChange={e => setInitialMessage(e.target.value)} style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }} />
              <button onClick={handleCreateTicket} style={{ width: '100%', background: 'linear-gradient(135deg, #38bdf8, #0284c7)', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>{t('ticketsSubmitBtn')}</button>
            </div>
          )}

          <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', gridColumn: isAdmin ? '1 / -1' : 'auto' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#cbd5e1', fontSize: '1.3rem' }}>{isAdmin ? t('ticketsListTitleAdmin') : t('ticketsListTitleUser')}</h3>
            
            {tickets.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', margin: '20px 0' }}>{t('ticketsEmptyList')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tickets.map(ticket => {
                const isUnreadForMe = isAdmin ? ticket.admin_unread === 1 : ticket.user_unread === 1;

                return (
                  <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} style={{ background: '#0f172a', padding: '15px 20px', borderRadius: '14px', border: isUnreadForMe ? '1px solid #f43f5e80' : '1px solid #334155', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s, border-color 0.2s' }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'none'; }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {isUnreadForMe && (
                          <span style={{ background: '#f43f5e', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('ticketsBadgeNewMessage')}</span>
                        )}
                        <div style={{ fontWeight: 'bold', color: isUnreadForMe ? '#fff' : '#f8fafc', fontSize: '1rem' }}>{ticket.subject}</div>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '5px' }}>
                        {isAdmin ? `${t('ticketsSenderLabel')}${ticket.user_name} (${ticket.user_email})` : t('ticketsSupportLabel')} • {new Date(ticket.updated_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'hu-HU')}
                      </div>
                    </div>
                    <div>{getStatusBadge(ticket.status)}</div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </>
      )}

      {selectedTicket && (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', height: '70vh', boxShadow: '0 15px 40px rgba(0,0,0,0.4)', animation: 'fadeIn 0.2s' }}>
          
          <div style={{ padding: '20px 30px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', borderRadius: '24px 24px 0 0' }}>
            <div>
              <button onClick={() => { setSelectedTicket(null); loadTickets(); }} style={{ background: 'transparent', color: '#38bdf8', border: 'none', cursor: 'pointer', padding: '0 0 5px 0', fontSize: '0.9rem', fontWeight: 'bold' }}>{t('ticketsBackBtn')}</button>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.2rem' }}>{selectedTicket.subject}</h3>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>{t('ticketsUserLabel')}<b>{selectedTicket.user_name}</b> ({selectedTicket.user_email})</div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {getStatusBadge(selectedTicket.status)}
              
              {isAdmin && (
                <select 
                  value={selectedTicket.status} 
                  onChange={e => handleUpdateStatus(selectedTicket.id, e.target.value)}
                  style={{ background: '#1e293b', color: 'white', border: '1px solid #475569', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  <option value="open">{t('ticketsOptOpen')}</option>
                  <option value="in_progress">{t('ticketsOptInProgress')}</option>
                  <option value="closed">{t('ticketsOptClosed')}</option>
                </select>
              )}
            </div>
          </div>

          <div style={{ flex: 1, padding: '30px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', background: '#090d16' }}>
            {replies.map(r => {
              const isMe = r.sender_email === user?.email;
              return (
                <div key={r.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '4px', padding: '0 5px' }}>{r.sender_name}</div>
                  <div style={{ background: isMe ? 'linear-gradient(135deg, #38bdf8, #0284c7)' : '#1e293b', color: isMe ? '#0f172a' : '#f8fafc', padding: '12px 18px', borderRadius: isMe ? '18px 18px 0 18px' : '18px 18px 18px 0', fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                    {r.message}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#334155', marginTop: '4px', padding: '0 5px' }}>{new Date(r.created_at).toLocaleTimeString(lang === 'en' ? 'en-US' : 'hu-HU', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {selectedTicket.status === 'closed' ? (
            <div style={{ padding: '20px', background: '#0f172a', color: '#10b981', fontWeight: 'bold', textAlign: 'center', borderRadius: '0 0 24px 24px', borderTop: '1px solid #334155' }}>
              {t('ticketsClosedNotice')}
            </div>
          ) : (
            <div style={{ padding: '20px 30px', borderTop: '1px solid #334155', background: '#0f172a', borderRadius: '0 0 24px 24px', display: 'flex', gap: '15px', alignItems: 'center' }}>
              <input 
                placeholder={t('ticketsReplyPlaceholder')} 
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
                {isSending ? '...' : t('ticketsSendBtn')}
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
