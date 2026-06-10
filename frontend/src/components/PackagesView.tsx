import React, { useState } from 'react';
import { BACKEND_URL } from '../utils/constants';

// 🎯 ÚJ IMPORT: Behozzuk a nyelvi kontextust
import { useLanguage } from '../context/LanguageContext';

interface PackagesViewProps {
  user: any;
}

export default function PackagesView({ user }: PackagesViewProps) {
  const [isLoading, setIsLoading] = useState(false);

  // 🎯 ÚJ: Aktiváljuk a fordítót (t)
  const { t } = useLanguage();

  // BIZTONSÁGI JAVÍTÁS: Ha a user prémium, de még nem szinkronizált le a szintje, akkor alapból 1-es.
  let premiumLevel = user?.premiumLevel || user?.premium_level || 0;
  if ((user?.isPremium || user?.is_premium) && premiumLevel === 0) {
    premiumLevel = 1;
  }

  const handleSubscribe = async (tier: 'basic' | 'pro') => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email, tier })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      alert(t('msgStripeError'));
    } finally {
      setIsLoading(false);
    }
  };

  const Feature = ({ text }: { text: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', color: '#cbd5e1' }}>
      <span style={{ color: '#10b981' }}>✔️</span> {text}
    </div>
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', animation: 'fadeIn 0.4s ease-out' }}>
      <h2 style={{ fontSize: '2.5rem', textAlign: 'center', color: '#f8fafc', marginBottom: '10px' }}>
        {t('packTitle')}
      </h2>
      <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '1.1rem', marginBottom: '40px' }}>
        {t('packSubtitle')}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', justifyContent: 'center' }}>
        
        {/* ALAP CSOMAG */}
        <div style={{ flex: '1 1 300px', background: '#1e293b', border: premiumLevel === 1 ? '2px solid #38bdf8' : '1px solid #334155', borderRadius: '16px', padding: '30px', position: 'relative' }}>
          {premiumLevel === 1 && (
            <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#38bdf8', color: '#0f172a', padding: '4px 15px', borderRadius: '100px', fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              {t('packCurrent')}
            </div>
          )}
          <h3 style={{ fontSize: '1.5rem', color: '#38bdf8', marginTop: 0 }}>{t('packBasicTitle')}</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white', marginBottom: '5px' }}>
            1 000 Ft <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 'normal' }}>{t('packMonth')}</span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '25px', minHeight: '40px' }}>{t('packBasicDesc')}</p>
          
          <div style={{ marginBottom: '30px' }}>
            <Feature text={t('packBasicF1')} />
            <Feature text={t('packBasicF2')} />
            <Feature text={t('packBasicF3')} />
            <Feature text={t('packBasicF4')} />
            <Feature text={t('packBasicF5')} />
          </div>

          {premiumLevel === 1 ? (
            <button disabled style={{ width: '100%', padding: '12px', background: '#0f172a', color: '#94a3b8', borderRadius: '8px', border: '1px solid #334155', fontWeight: 'bold' }}>
              {t('packActive')}
            </button>
          ) : (
            <button onClick={() => handleSubscribe('basic')} disabled={isLoading} style={{ width: '100%', padding: '12px', background: '#38bdf8', color: '#0f172a', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
              {isLoading ? '⏳...' : premiumLevel === 2 ? t('packSwitch') : t('packSubscribe')}
            </button>
          )}
        </div>

        {/* PRO CSOMAG */}
        <div style={{ flex: '1 1 300px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: premiumLevel === 2 ? '2px solid #f59e0b' : '2px solid #6366f1', borderRadius: '16px', padding: '30px', position: 'relative', boxShadow: '0 10px 30px rgba(99, 102, 241, 0.2)' }}>
          {premiumLevel === 2 ? (
            <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#f59e0b', color: '#0f172a', padding: '4px 15px', borderRadius: '100px', fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              {t('packCurrent')}
            </div>
          ) : (
            <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#6366f1', color: 'white', padding: '4px 15px', borderRadius: '100px', fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              {t('packProBadge')}
            </div>
          )}
          
          <h3 style={{ fontSize: '1.5rem', color: '#818cf8', marginTop: 0 }}>{t('packProTitle')}</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white', marginBottom: '5px' }}>
            2 490 Ft <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 'normal' }}>{t('packMonth')}</span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '25px', minHeight: '40px' }}>{t('packProDesc')}</p>
          
          <div style={{ marginBottom: '30px' }}>
            <Feature text={t('packProF1')} />
            <Feature text={t('packProF2')} />
            <Feature text={t('packProF3')} />
            <Feature text={t('packProF4')} />
          </div>

          {premiumLevel === 2 ? (
            <button disabled style={{ width: '100%', padding: '12px', background: '#0f172a', color: '#94a3b8', borderRadius: '8px', border: '1px solid #334155', fontWeight: 'bold' }}>
              {t('packActive')}
            </button>
          ) : (
            <button onClick={() => handleSubscribe('pro')} disabled={isLoading} style={{ width: '100%', padding: '12px', background: '#6366f1', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)' }}>
              {isLoading ? '⏳...' : t('packUpgrade')}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
