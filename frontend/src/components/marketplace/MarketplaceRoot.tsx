import React, { useState } from 'react';
import MarketplaceList from './MarketplaceList';
import MarketplaceAdForm from './MarketplaceAdForm';

type MarketplaceView = 'list' | 'create';

interface MarketplaceRootProps {
  user: { email: string };
}

export default function MarketplaceRoot({ user }: MarketplaceRootProps) {
  const [view, setView] = useState<MarketplaceView>('list');

  return (
    <div className="marketplace-system-root" style={{ minHeight: '100vh', backgroundColor: '#0b0f19', padding: '20px 0' }}>
      {view === 'list' && (
        <MarketplaceList 
          user={user} 
          onNavigateToCreate={() => setView('create')} 
        />
      )}

      {view === 'create' && (
        <MarketplaceAdForm 
          user={user} 
          onCancel={() => setView('list')} 
        />
      )}
    </div>
  );
}
