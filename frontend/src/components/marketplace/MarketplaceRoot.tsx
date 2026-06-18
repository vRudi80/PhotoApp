import React, { useState } from 'react';
import MarketplaceList from './MarketplaceList';
import MarketplaceAdForm from './MarketplaceAdForm';
import MarketplaceDetails from './MarketplaceDetails'; // Új komponens

type MarketplaceView = 'list' | 'create' | 'details' | 'edit';

export default function MarketplaceRoot({ user }: { user: any }) {
  const [view, setView] = useState<MarketplaceView>('list');
  const [selectedAdId, setSelectedAdId] = useState<number | null>(null);

  return (
    <div className="marketplace-root">
      {view === 'list' && (
        <MarketplaceList 
          user={user} 
          onNavigateToCreate={() => setView('create')} 
          onNavigateToDetails={(id) => { setSelectedAdId(id); setView('details'); }}
        />
      )}

      {view === 'create' && (
        <MarketplaceAdForm 
          user={user} 
          onCancel={() => setView('list')} 
        />
      )}

      {view === 'details' && selectedAdId && (
        <MarketplaceDetails 
          adId={selectedAdId} 
          currentUser={user} 
          onBack={() => setView('list')}
          onEdit={() => setView('edit')}
        />
      )}

      {view === 'edit' && selectedAdId && (
        <MarketplaceAdForm 
          user={user} 
          adId={selectedAdId} // Átadjuk az ID-t, hogy tudja: SZERKESZTÉS van
          onCancel={() => setView('details')} 
        />
      )}
    </div>
  );
}
