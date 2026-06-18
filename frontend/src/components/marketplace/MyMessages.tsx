import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/constants';

export default function MyMessages({ user }: { user: any }) {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/marketplace/messages`, { withCredentials: true });
        setMessages(res.data.data);
      } catch (err) {
        console.error("Hiba az üzenetek betöltésekor:", err);
      }
    };
    fetchMessages();
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', color: 'white', padding: '20px' }}>
      <h2 style={{ color: '#38bdf8' }}>📩 Üzeneteim</h2>
      {messages.length === 0 ? <p>Még nincs üzeneted.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>Hirdetés: {msg.ad_title}</p>
              <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#94a3b8' }}>
                {msg.sender_email === user.email ? 'Kinek: ' : 'Kitől: '} 
                {msg.sender_email === user.email ? msg.receiver_email : msg.sender_email}
              </p>
              <div style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', marginTop: '5px' }}>
                {msg.message}
              </div>
              <small style={{ color: '#64748b' }}>{new Date(msg.created_at).toLocaleString()}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
