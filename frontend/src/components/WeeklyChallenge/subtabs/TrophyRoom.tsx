import React from 'react';
import { getImageUrl } from '../../../utils/helpers';

interface TrophyRoomProps {
  isLoadingStats: boolean;
  myStats: { podiums: any; history: any[] } | null;
  userTotalLikes: number;
  userVictories: number;
  swapBalance: number;
  myReferralCode: string;
  referredBy: string | null;
  referralInput: string;
  setReferralInput: (val: string) => void;
  isClaimingReferral: boolean;
  handleClaimReferral: () => void;
  setActiveShareData: (entry: any) => void;
  setFullscreenData: (data: any) => void;
  getLevelDetails: (likes: number, victories: number) => { name: string; color: string; bg: string };
  getTopicType: (start: string, end: string) => 'daily' | 'weekly';
  handleImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export default function TrophyRoom({
  isLoadingStats, myStats, userTotalLikes, userVictories, swapBalance,
  myReferralCode, referredBy, referralInput, setReferralInput,
  isClaimingReferral, handleClaimReferral, setActiveShareData, setFullscreenData,
  getLevelDetails, getTopicType, handleImageError
}: TrophyRoomProps) {

  if (isLoadingStats && (!myStats || myStats.history.length === 0)) {
    return <div style={{ color: '#94a3b8', textAlign: 'center', padding: '50px' }}>⏳ Statisztikák betöltése...</div>;
  }

  if (!myStats) {
    return <div style={{ color: '#ef4444', textAlign: 'center', padding: '20px' }}>Nem sikerült betölteni az adatokat.</div>;
  }

  // 📊 NOMÁD RANG-PROGRESSZIÓ SZÁMÍTÓ ENGINE (Kiszervezve a fő fájlból)
  const currentLevel = getLevelDetails(userTotalLikes, userVictories);
  const thresholds = [
    { name: 'Újonc 🌱', min: 0, max: 30, vic: 0 },
    { name: 'Bojtár 🪶', min: 30, max: 100, vic: 0 },
    { name: 'Nyomolvasó 🎯', min: 100, max: 250, vic: 0 },
    { name: 'Íjász 🏹', min: 250, max: 500, vic: 0 },
    { name: 'Lovas 🐎', min: 500, max: 800, vic: 1 },
    { name: 'Sólyom 🦅', min: 800, max: 1300, vic: 2 },
    { name: 'Vitéz ⚔️', min: 1300, max: 2000, vic: 3 },
    { name: 'Bajnok 🛡️', min: 2000, max: 3200, vic: 5 },
    { name: 'Törzsfő ⭐', min: 3200, max: 4800, vic: 7 },
    { name: 'Hadúr 🔱', min: 4800, max: 7000, vic: 9 },
    { name: 'Táltos 🔥', min: 7000, max: 10000, vic: 12 },
    { name: 'Fejedelem 👑', min: 10000, max: Infinity, vic: 15 }
  ];

  const currentRankIndex = thresholds.findIndex(t => t.name === currentLevel.name);
  const currentBracket = thresholds[currentRankIndex];

  let progressPercent = 100;
  let levelHelpText = "Elérted a maximális szintet! Te vagy a Fotós Fejedelem! 👑";

  if (currentBracket && currentBracket.max !== Infinity) {
    const range = currentBracket.max - currentBracket.min;
    const currentProgress = userTotalLikes - currentBracket.min;
    progressPercent = Math.min(100, Math.max(0, (currentProgress / range) * 100));

    if (userTotalLikes < currentBracket.max) {
      levelHelpText = `Még ${currentBracket.max - userTotalLikes} Rangpont (lajk) szükséges a következő szinthez!`;
    } else if (currentBracket.vic && userVictories < currentBracket.vic) {
      levelHelpText = `🔒 Megvannak a pontjaid, de még ${currentBracket.vic - userVictories} db Aréna Győzelem (🥇) szükséges a szintlépéshez!`;
    } else {
      levelHelpText = "Gratulálunk! Minden feltétel teljesítve a szintlépéshez!";
    }
  }

  // Statisztikai összesítések
  const totalViews = myStats.history?.reduce((sum, e) => sum + (Number(e?.views) || 0), 0) || 0;
  const podiumCount = Number(myStats.podiums?.second || 0) + Number(myStats.podiums?.third || 0);
  
  let top10Count = 0;
  let top20Count = 0;
  if (myStats.history) {
    myStats.history.forEach(e => {
      const entriesCount = Number(e?.total_entries) || 1;
      const percentile = (Number(e?.rank) || 1) / entriesCount;
      if (percentile <= 0.1 && (Number(e?.rank) || 0) > 3) top10Count++;
      if (percentile > 0.1 && percentile <= 0.2) top20Count++;
    });
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
      {/* Szint progressziós banner */}
      <div style={{ background: 'linear-gradient(180deg, #1e293b, #0f172a)', padding: '40px 25px', borderRadius: '24px', border: `1px solid ${currentLevel.color}50`, marginBottom: '40px', textAlign: 'center', boxShadow: `0 10px 40px -10px ${currentLevel.color}40`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-50px', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', background: `${currentLevel.color}20`, filter: 'blur(80px)', borderRadius: '50%' }}></div>
        <h3 style={{ color: '#94a3b8', margin: '0 0 10px 0', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '3px', position: 'relative', zIndex: 1 }}>Jelenlegi Státuszod</h3>
        <h1 style={{ color: currentLevel.color, margin: '0 0 20px 0', fontSize: '3.5rem', fontWeight: '900', textShadow: `0 0 20px ${currentLevel.color}60`, position: 'relative', zIndex: 1 }}>{currentLevel.name}</h1>
        
        <div style={{ width: '100%', maxWidth: '600px', background: '#0f172a', height: '16px', borderRadius: '10px', margin: '0 auto', overflow: 'hidden', border: '1px solid #334155', position: 'relative', zIndex: 1 }}>
          <div style={{ width: `${progressPercent}%`, background: `linear-gradient(90deg, transparent, ${currentLevel.color})`, height: '100%' }}></div>
        </div>
        
        <div style={{ color: currentLevel.name === 'Fejedelem 👑' ? '#fbbf24' : '#cbd5e1', fontSize: currentLevel.name === 'Fejedelem 👑' ? '1rem' : '0.9rem', marginTop: '15px', position: 'relative', zIndex: 1, fontWeight: currentLevel.name === 'Fejedelem 👑' ? 'bold' : 'normal' }}>
          {levelHelpText}
        </div>
      </div>

      {/* Stat rács */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #334155', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#f97316', marginBottom: '5px' }}>{userTotalLikes}</div>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Összes Szerzett Pont</div>
        </div>
        <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #be123c', boxShadow: '0 10px 20px rgba(190,18,60,0.1)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fb7185', marginBottom: '5px' }}>{swapBalance} db</div>
          <div style={{ color: '#fb7185', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Elkölthető Joker Csere</div>
        </div>
        <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #334155', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#38bdf8', marginBottom: '5px' }}>{totalViews}</div>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Összes Megtekintés</div>
        </div>
        <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #fbbf24', boxShadow: '0 10px 20px rgba(251,191,36,0.1)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fbbf24', marginBottom: '5px' }}>{podiumCount}</div>
          <div style={{ color: '#fbbf24', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Dobogós Helyezés</div>
        </div>
        <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #a855f7', boxShadow: '0 10px 20px rgba(168,85,247,0.1)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#a855f7', marginBottom: '5px' }}>{top10Count}</div>
          <div style={{ color: '#a855f7', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Top 10% Plecsni</div>
        </div>
        <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', textAlign: 'center', border: '1px solid #10b981', boxShadow: '0 10px 20px rgba(16,185,129,0.1)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10b981', marginBottom: '5px' }}>{top20Count}</div>
          <div style={{ color: '#10b981', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Top 20% Plecsni</div>
        </div>
      </div>

      {/* Ajánlórendszer panelek */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginBottom: '40px' }}>
        <div style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', padding: '25px', borderRadius: '24px', border: '1px solid #38bdf840', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#38bdf8', fontSize: '1.2rem' }}>🎁 Hívj meg egy barátot!</h4>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>
            Oszd meg a kódodat egy fotós ismerősöddel! Ha regisztrál a portálra ÉS megadja a kódod, te **azonnal +10 db Joker cserét** kapsz a globális egyenlegedhez.
          </p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#0f172a', padding: '12px 20px', borderRadius: '12px', border: '1px dashed #38bdf860' }}>
            <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 'bold' }}>KÓDOD:</span>
            <strong style={{ color: 'white', fontSize: '1.3rem', fontFamily: 'monospace', letterSpacing: '1px', flex: 1 }}>{myReferralCode}</strong>
            <button 
              onClick={() => { navigator.clipboard.writeText(myReferralCode); alert("📋 Meghívó kód a vágólapra másolva!"); }}
              style={{ background: '#38bdf820', color: '#38bdf8', border: '1px solid #38bdf840', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Másolás
            </button>
          </div>
        </div>

        <div style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', padding: '25px', borderRadius: '24px', border: '1px solid #10b98140', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#10b981', fontSize: '1.2rem' }}>🤝 Téged ki hívott meg?</h4>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              Ha egy barátod ajánlására regisztráltál a Fotóklub Portálra, add meg az ő személyes kódját, hogy megkapja érte a megérdemelt jutalom cseréit!
            </p>
          </div>
          
          {!referredBy ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Pl.: REF-A1B2C3" 
                value={referralInput}
                onChange={e => setReferralInput(e.target.value)}
                disabled={isClaimingReferral}
                style={{ flex: 1, padding: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '12px', fontSize: '1rem', outline: 'none', textTransform: 'uppercase', fontFamily: 'monospace' }} 
              />
              <button 
                onClick={handleClaimReferral}
                disabled={!referralInput.trim() || isClaimingReferral}
                style={{ background: !referralInput.trim() || isClaimingReferral ? '#334155' : 'linear-gradient(135deg, #10b981, #059669)', color: !referralInput.trim() || isClaimingReferral ? '#64748b' : 'white', border: 'none', padding: '0 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {isClaimingReferral ? '...' : 'Beküldés'}
              </button>
            </div>
          ) : (
            <div style={{ background: '#10b98110', border: '1px solid #10b98130', padding: '12px', borderRadius: '12px', color: '#10b981', fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center' }}>
              ✓ Sikeresen rögzítetted a meghívásodat! Köszönjük.
            </div>
          )}
        </div>
      </div>

      {/* Korábbi pályaművek kártyái */}
      <h3 style={{ color: '#f8fafc', marginBottom: '20px', fontSize: '1.5rem' }}>📸 Korábbi Pályaművek ({myStats.history?.length || 0})</h3>
      
      {myStats.history?.length === 0 ? (
        <div style={{ color: '#94a3b8', background: '#1e293b', padding: '40px', borderRadius: '20px', textAlign: 'center', border: '1px dashed #334155' }}>
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📸</div>
          <h4 style={{ color: '#f8fafc', margin: '0 0 10px 0', fontSize: '1.2rem' }}>Még nincs befejezett kihívásod!</h4>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>Vegyél részt a kihívásokban, és itt fognak megjelenni a korábbi eredményeid.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' }}>
          {myStats.history?.map((entry: any, idx: number) => {
            const totalEntries = Number(entry?.total_entries) || 1;
            const percentile = (Number(entry?.rank) || 1) / totalEntries;
            let badge = ''; let badgeColor = '#334155';
            if ((Number(entry?.rank) || 0) <= 3) { badge = '🏆 Dobogós'; badgeColor = '#fbbf24'; }
            else if (percentile <= 0.1) { badge = '⭐ Top 10%'; badgeColor = '#a855f7'; }
            else if (percentile <= 0.2) { badge = '✨ Top 20%'; badgeColor = '#10b981'; }

            const isDaily = getTopicType(entry?.start_date, entry?.end_date) === 'daily';

            return (
              <div key={idx} style={{ background: '#1e293b', borderRadius: '20px', overflow: 'hidden', border: `1px solid ${badgeColor}`, transition: 'transform 0.2s', boxShadow: '0 10px 20px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', height: '220px' }}>
                  <img src={getImageUrl(entry?.drive_file_id, entry?.file_url)} alt="Pályamű" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} onClick={() => setFullscreenData({url: getImageUrl(entry?.drive_file_id, entry?.file_url), title: entry?.topic_title || ''})} onError={handleImageError} />
                  <div style={{ position: 'absolute', top: '15px', left: '15px', background: badgeColor, color: badgeColor === '#fbbf24' ? 'black' : 'white', padding: '6px 16px', borderRadius: '100px', fontWeight: '900', fontSize: '0.9rem' }}>
                    {badge || `${entry?.rank}. Hely`}
                  </div>
                  <div style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', color: isDaily ? '#f87171' : '#60a5fa', padding: '4px 12px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${isDaily ? '#ef444450' : '#3b82f650'}` }}>
                    {isDaily ? '🔴 Napi' : '🔵 Heti'}
                  </div>
                </div>
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: '0 0 15px 0', color: '#f8fafc', fontSize: '1.2rem' }}>{entry?.topic_title}</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '12px' }}>
                      <span>Mezőny: {entry?.total_entries || 0} kép</span>
                      <span style={{color: '#f8fafc'}}>Helyezés: <b>{entry?.rank || 0}.</b></span>
                    </div>
                    <div style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '15px' }}>
                      <span style={{color: '#f97316', fontWeight: '900'}}>⭐ {entry?.likes || 0} pont</span>
                      <span style={{color: '#38bdf8', fontWeight: 'bold'}}>👁️ {entry?.views || 0}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveShareData(entry)}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #14b8a6, #0d9488)', color: 'white', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(20,184,166,0.2)' }}
                  >
                    🚀 Eredmény megosztása
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
