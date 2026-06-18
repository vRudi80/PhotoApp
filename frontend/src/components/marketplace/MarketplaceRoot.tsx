import React, { useState } from 'react';
import MarketplaceList from './MarketplaceList';
import MarketplaceAdForm from './MarketplaceAdForm';
import MarketplaceDetails from './MarketplaceDetails';
import MyMessages from './MyMessages'; // 👈 Importáld be az üzenetkezelőt

type MarketplaceView = 'list' | 'create' | 'details' | 'edit' | 'messages';

interface MarketplaceRootProps {
  user: {
    email: string;
    name?: string;
    [key: string]: any;
  } | null;
}

export default function MarketplaceRoot({ user }: MarketplaceRootProps) {
  const [view, setView] = useState<MarketplaceView>('list');
  const [selectedAdId, setSelectedAdId] = useState<number | string | null>(null);

  return (
    <div className="marketplace-system-root" style={{ minHeight: '100vh', backgroundColor: '#0b0f19', padding: '20px 0' }}>
      
      {/* NAVIGÁCIÓS SÁV */}
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        padding: '15px 25px', 
        background: '#1e293b', 
        borderRadius: '12px', 
        marginBottom: '30px', 
        alignItems: 'center',
        maxWidth: '1000px',
        margin: '0 auto 30px auto',
        border: '1px solid #334155'
      }}>
        <button 
          onClick={() => setView('list')} 
          style={{ background: view === 'list' ? '#38bdf8' : 'transparent', border: 'none', color: 'white', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          🏠 Piactér
        </button>
        <button 
          onClick={() => setView('messages')} 
          style={{ background: view === 'messages' ? '#38bdf8' : 'transparent', border: 'none', color: 'white', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          📩 Üzeneteim
        </button>
      </div>

      {/* 1. NÉZET: HIRDETÉSEK LISTÁJA */}
      {view === 'list' && (
        <MarketplaceList 
          user={user || { email: '' }} 
          onNavigateToCreate={() => setView('create')} 
          onNavigateToDetails={(id: any) => { 
            setSelectedAdId(id); 
            setView('details'); 
          }}
        />
      )}

      {/* 2. NÉZET: ÚJ HIRDETÉS LÉTREHOZÁSA */}
      {view === 'create' && (
        <MarketplaceAdForm 
          user={user || { email: '' }} 
          onCancel={() => setView('list')} 
        />
      )}

      {/* 3. NÉZET: RÉSZLETES ADATLAP */}
      {view === 'details' && selectedAdId !== null && (
        <MarketplaceDetails 
          adId={selectedAdId} 
          currentUser={user || { email: '' }} 
          onBack={() => setView('list')}
          onEdit={() => setView('edit')}
        />
      )}

      {/* 4. NÉZET: MEGLÉVŐ HIRDETÉS SZERKESZTÉSE */}
      {view === 'edit' && selectedAdId !== null && (
        <MarketplaceAdForm 
          user={user || { email: '' }} 
          adId={selectedAdId}
          onCancel={() => setView('details')} 
        />
      )}

      {/* 5. NÉZET: ÜZENETEK */}
      {view === 'messages' && (
        <MyMessages user={user || { email: '' }} />
      )}
    </div>
  );
}
