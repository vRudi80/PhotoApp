import React from 'react';
import { ADMIN_EMAIL } from '../utils/constants';

interface DashboardViewProps {
  user: any;
  isLeader: boolean;
  setActiveTab: (tab: string) => void;
}

export default function DashboardView({ user, isLeader, setActiveTab }: DashboardViewProps) {
  
  // A csempék adatai (Ikon, Szín, Cím, Leírás, és hogy hova ugorjon)
  const tiles = [
    {
      id: 'weekly_challenge',
      icon: '🔥',
      color: '#f97316', // Narancssárga
      title: 'Heti Kihívás (Párbaj)',
      desc: 'Tölts fel az aktuális heti témában, szavazz mások képeire és kerülj a toplista élére!',
      tab: 'weekly_challenge'
    },
    {
      id: 'contests',
      icon: '📝',
      color: '#8b5cf6', // Lila
      title: 'Nyílt Pályázatok',
      desc: 'Vegyél részt a közösségi vagy zártkörű házi fotópályázatokon.',
      tab: 'contests_open_active'
    },
    {
      id: 'my_album',
      icon: '🖼️',
      color: '#f59e0b', // Sárga
      title: 'Saját Portfólió',
      desc: 'Töltsd fel és menedzseld a saját fotóidat, nézd meg az eredményeidet, vagy akár kérj AI elemzést.',
      tab: 'my_album'
    },
    {
      id: 'map_spots',
      icon: '🌍',
      color: '#10b981', // Zöld
      title: 'Fotós Helyszínek',
      desc: 'Fedezz fel új fotós helyeket a térképen, vagy oszd meg a sajátjaidat!',
      tab: 'map_spots'
    },
    {
      id: 'progress',
      icon: '🏆',
      color: '#f43f5e', // Pirosas/Rózsaszín
      title: 'Minősítések (FIAP/MAFOSZ)',
      desc: 'Kövesd nyomon az elfogadásaidat, generálj FIAP kompatibilis Excel táblát.',
      tab: 'fiap_progress'
    },
    {
      id: 'salons',
      icon: '🌐',
      color: '#3b82f6', // Kék
      title: 'Nemzetközi Szalonok',
      desc: 'Böngéssz az aktuális FIAP, MAFOSZ, PSA, vagy klub szalonok között, nevezd be a fotóidat pályázatokra.',
      tab: 'salons'
    },
    
    {
      id: 'club',
      icon: '👥',
      color: '#06b6d4', // Türkiz
      title: 'Fotóklub Élet',
      desc: 'Klubestek, találkozók, feladatok, vagy klub portfólió válogatás egy helyen.',
      tab: 'club_nights'
    }
  ];

  // Admin / Vezetői csempe (Csak nekik jelenik meg)
  const adminTile = {
    id: 'admin',
    icon: '⚙️',
    color: '#ef4444',
    title: 'Adminisztráció',
    desc: 'Pályázatok, klubestek, felhasználók és szalonok kezelése.',
    tab: (user?.email === ADMIN_EMAIL) ? 'admin_contests' : 'admin_meetings'
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Üdvözlő fejléc */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '30px', borderRadius: '16px', border: '1px solid #334155', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5rem', color: '#f8fafc' }}>
            Üdvözlünk, <span style={{ color: '#38bdf8' }}>{user.name}</span>! 👋
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '1.1rem' }}>
            Válaszd ki, hogy melyik modult szeretnéd használni ma.
          </p>
        </div>
        {(user?.isPremium || user?.is_premium) && (
          <div style={{ background: '#10b98120', border: '1px solid #10b981', padding: '10px 20px', borderRadius: '100px', color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⭐</span> Aktív Prémium Tag
          </div>
        )}
      </div>

      {/* Csempék (Grid hálózat) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {tiles.map((tile) => (
          <div 
            key={tile.id}
            className="dashboard-tile"
            onClick={() => setActiveTab(tile.tab)}
            style={{ 
              background: '#1e293b', 
              borderRadius: '16px', 
              padding: '25px', 
              cursor: 'pointer', 
              border: '1px solid #334155',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Finom színes háttérfény az ikon mögött */}
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: tile.color, opacity: 0.1, filter: 'blur(30px)', borderRadius: '50%' }}></div>
            
            <div style={{ fontSize: '3rem', marginBottom: '15px', display: 'inline-block', background: `${tile.color}20`, padding: '15px', borderRadius: '12px', border: `1px solid ${tile.color}40` }}>
              {tile.icon}
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', color: '#f8fafc' }}>{tile.title}</h3>
            <p style={{ margin: 0, color: '#94a3b8', lineHeight: '1.5' }}>{tile.desc}</p>
          </div>
        ))}

        {/* Extra Admin Csempe */}
        {(user?.email === ADMIN_EMAIL || isLeader) && (
          <div 
            className="dashboard-tile admin-tile"
            onClick={() => setActiveTab(adminTile.tab)}
            style={{ 
              background: '#1e293b', 
              borderRadius: '16px', 
              padding: '25px', 
              cursor: 'pointer', 
              border: `1px dashed ${adminTile.color}60`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '15px', display: 'inline-block', background: `${adminTile.color}20`, padding: '15px', borderRadius: '12px', border: `1px solid ${adminTile.color}40` }}>
              {adminTile.icon}
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', color: adminTile.color }}>{adminTile.title}</h3>
            <p style={{ margin: 0, color: '#94a3b8', lineHeight: '1.5' }}>{adminTile.desc}</p>
          </div>
        )}

      </div>

      <style>{`
        .dashboard-tile:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 30px rgba(0,0,0,0.3);
          border-color: #475569;
        }
        .admin-tile:hover {
          border-color: #ef4444 !important;
          background: #ef444410 !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
