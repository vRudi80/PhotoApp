import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: { name: string; color: string; bg: string };
}

export default function HelpModal({ isOpen, onClose, currentLevel }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box', animation: 'fadeIn 0.2s ease-out' }}>
      <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '24px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
        
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: '#1e293b', border: 'none', color: '#94a3b8', fontSize: '1.5rem', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✖</button>
        
        <h2 style={{ color: '#f8fafc', margin: '0 0 25px 0', fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>📖 Útmutató az Arénához</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #f59e0b' }}>
            <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '1.1rem' }}>⚡ Láthatósági Mérő (Az Energia)</h4>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
              Amikor feltöltöd a képed, kapsz energiát. Valahányszor a gép megmutatja a képed valakinek, ez az energia csökken. Új energiát úgy szerezhetsz, ha értékelsz más fotókat. Tartsd a mérőt a Zöld zónában!
            </p>
          </div>

          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #e11d48' }}>
            <h4 style={{ color: '#e11d48', margin: '0 0 10px 0', fontSize: '1.1rem' }}>🃏 Joker: Taktikai Képcsere</h4>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
              Úgy érzed, rossz képet töltöttél fel, és lemaradtál a pontversenyben? Minden párbajban <b>egyszer</b> kijátszhatod a Jokert! A lecserélt fotóddal a pontjaid lenullázódnak, de a megkeresett Láthatóságod megmarad.
            </p>
          </div>

          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #a78bfa' }}>
            <h4 style={{ color: '#a78bfa', margin: '0 0 10px 0', fontSize: '1.1rem' }}>👑 Ki az a Párbajmester?</h4>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
              Minden kihívásnak van egy kijelölt Párbajmestere, aki a forduló szakmai házigazdája és főbírálója. Mivel ő felügyeli a küzdelmet, saját alkotással <b>nem nevezhet</b> az adott játékban. Cserébe kap 5 darab exkluzív Párbajmester szavazatot, amelyek egyenként fixen <b>+10 pontot</b> érnek, így hatalmas hatalom van a kezében a kedvenc képei felemelésére!
            </p>
          </div>

          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #fbbf24' }}>
            <h4 style={{ color: '#fbbf24', margin: '0 0 10px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>🏆 Dobogós Nyeremények & Extra Cserék</h4>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
              A párbajok lezárulásakor a mezőny legkiemelkedőbb fotóművészei értékes **globális Joker cseréket és exkluzív hozzáférést** kapnak jutalmul, amiket szabadon felhasználhatnak:
            </p>
            <ul style={{ color: '#f8fafc', fontSize: '0.9rem', margin: '10px 0 0 0', paddingLeft: '20px', lineHeight: '1.8' }}>
              {/* 👑 FRISSÍTVE: A dicsőséges 1. hely prémium jutalmának feltüntetése */}
              <li>🥇 <b>1. Helyezett (Győztes):</b> <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>+3 db</span> globális Joker csere <span style={{ color: '#4ade80', fontWeight: '900' }}>+ 1 HÉT ALAP PRÉMIUM ELŐFIZETÉS</span> teljesen ingyen, kártyaadatok nélkül!</li>
              <li>🥈 <b>2. Helyezett:</b> <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>+2 db</span> profil szintű Joker csere</li>
              <li>🥉 <b>3. Helyezett:</b> <span style={{ color: '#cd7f32', fontWeight: 'bold' }}>+1 db</span> profil szintű Joker csere</li>
            </ul>
          </div>
          
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #38bdf8' }}>
            <h4 style={{ color: '#38bdf8', margin: '0 0 15px 0', fontSize: '1.1rem' }}>⭐ Ranglétra és Szavazati Erő</h4>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', margin: '0 0 15px 0' }}>
              Nem minden szavazat ér ugyanannyit! Ahogy halmozod a pontokat és győzelmeket, a rangod növekszik. Minél magasabb a rangod, annál több pontot adsz másoknak! <b style={{ color: '#fb7185' }}>💡 Minden szintlépésért a rendszer azonnal +10 db ajándék Joker cserével jutalmaz meg!</b>
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { name: 'Újonc 🌱', req: '0 - 29 pont', power: '✨ +1 / 🔥 +2', color: '#94a3b8' },
                { name: 'Bojtár 🪶', req: '30 - 99 pont', power: '✨ +2 / 🔥 +3', color: '#cbd5e1' },
                { name: 'Nyomolvasó 🎯', req: '100 - 249 pont', power: '✨ +2 / 🔥 +4', color: '#38bdf8' },
                { name: 'Íjász 🏹', req: '250 - 499 pont', power: '✨ +3 / 🔥 +5', color: '#60a5fa' },
                { name: 'Lovas 🐎', req: '500 - 799 pont ÉS 1+ győzelem', power: '✨ +3 / 🔥 +6', color: '#10b981' },
                { name: 'Sólyom 🦅', req: '800 - 1299 pont ÉS 2+ győzelem', power: '✨ +4 / 🔥 +7', color: '#059669' },
                { name: 'Vitéz ⚔️', req: '1300 - 1999 pont ÉS 3+ győzelem', power: '✨ +4 / 🔥 +8', color: '#a78bfa' },
                { name: 'Bajnok 🛡️', req: '2000 - 3199 pont ÉS 5+ győzelem', power: '✨ +5 / 🔥 +10', color: '#ec4899' },
                { name: 'Törzsfő ⭐', req: '3200 - 4799 pont ÉS 7+ győzelem', power: '✨ +5 / 🔥 +12', color: '#f59e0b' },
                { name: 'Hadúr 🔱', req: '4800 - 6999 pont ÉS 9+ győzelem', power: '✨ +6 / 🔥 +14', color: '#eab308' },
                { name: 'Táltos 🔥', req: '7000 - 9999 pont ÉS 12+ győzelem', power: '✨ +7 / 🔥 +17', color: '#ef4444' },
                { name: 'Fejedelem 👑', req: '10000+ pont ÉS 15+ győzelem', power: '✨ +8 / 🔥 +20', color: '#fbbf24' }
              ].map((rank, i) => {
                const isMyRank = currentLevel && currentLevel.name === rank.name;
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: isMyRank ? `${rank.color}20` : '#0f172a', border: isMyRank ? `1px solid ${rank.color}` : '1px solid #334155', borderRadius: '8px' }}>
                    <div>
                      <div style={{ color: rank.color, fontWeight: 'bold', fontSize: '1rem' }}>{rank.name} {isMyRank && <span style={{fontSize: '0.75rem', background: rank.color, color: '#000', padding: '2px 6px', borderRadius: '10px', marginLeft: '5px'}}>TE VAGY</span>}</div>
                      <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Szükséges: {rank.req}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#f8fafc', fontSize: '0.9rem' }}>
                      {rank.power}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
