import React, { useState } from 'react';
import MarketplaceList from './MarketplaceList';
import MarketplaceAdForm from './MarketplaceAdForm';

// Típus a lehetséges nézeteknek (később bővítheted pl. 'details' nézettel is)
type MarketplaceView = 'list' | 'create';

interface MarketplaceRootProps {
  user: { email: string };
}

export default function MarketplaceRoot({ user }: MarketplaceRootProps) {
  // Alapértelmezetten a hirdetések listáját mutatjuk
  const [view, setView] = useState<MarketplaceView>('list');

  return (
    <div className="marketplace-container" style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#0b0f19' }}>
      
      {view === 'list' && (
        <MarketplaceList 
          user={user} 
          // Átadunk egy funkciót a listának, amivel át tud váltani az űrlapra
          onNavigateToCreate={() => setView('create')} 
        />
      )}

      {view === 'create' && (
        <MarketplaceAdForm 
          user={user} 
          // Ha az űrlapon a Mégsem-re nyom, vagy kész a hirdetés, visszavisszük a listába
          onCancel={() => setView('list')} 
        />
      )}

    </div>
  );
}
