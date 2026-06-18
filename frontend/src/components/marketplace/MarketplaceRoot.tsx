import React, { useState } from 'react';
import MarketplaceList from './MarketplaceList';
import MarketplaceAdForm from './MarketplaceAdForm';
import MarketplaceDetails from './MarketplaceDetails';

type MarketplaceView = 'list' | 'create' | 'details' | 'edit';

interface MarketplaceRootProps {
  user: {
    email: string;
    name?: string;
    [key: string]: any;
  } | null;
}

export default function MarketplaceRoot({ user }: MarketplaceRootProps) {
  const [view, setView] = useState<MarketplaceView>('list');
  // Mivel a MySQL ID-k számok, de a korábbi felépítés miatt string is jöhet, támogatjuk mindkettőt
  const [selectedAdId, setSelectedAdId] = useState<number | string | null>(null);

  return (
    <div className="marketplace-system-root" style={{ minHeight: '100vh', backgroundColor: '#0b0f19', padding: '20px 0' }}>
      
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
          adId={selectedAdId} // Átadjuk a hirdetés ID-ját az űrlapnak szerkesztésre
          onCancel={() => setView('details')} 
        />
      )}
    </div>
  );
}
