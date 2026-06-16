import React, { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL } from '../../../utils/constants';
import { getImageUrl } from '../../../utils/helpers';
import { useLanguage } from '../../../context/LanguageContext';

interface PastArchiveProps {
  topicId?: number;
  onOpenDetails?: (entry: any) => void;
}

export default function PastArchive({ topicId: externalTopicId, onOpenDetails }: PastArchiveProps) {
  const { t, lang } = useLanguage();
  
  const [pastTopics, setPastTopics] = useState<any[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [pastLeaderboard, setPastLeaderboard] = useState<any[]>([]);
  const [clubLeaderboard, setClubLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);

  // 1. Múltbéli témák betöltése az archívum legördülő menühöz
  useEffect(() => {
    const fetchPastTopics = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/weekly/past`);
        if (res.ok) {
          const data = await res.json();
          setPastTopics(data);
          if (data.length > 0 && !externalTopicId) {
            setSelectedTopicId(data[0].id);
          }
        }
      } catch (e) {
        console.error("Hiba a múltbéli témák lekérésekor:", e);
      }
    };
    fetchPastTopics();
  }, [externalTopicId]);

  useEffect(() => {
    if (externalTopicId) {
      setSelectedTopicId(externalTopicId);
    }
  }, [externalTopicId]);

  // 2. Kiválasztott archív szoba adatainak betöltése
  useEffect(() => {
    if (!selectedTopicId) return;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/weekly/history/${selectedTopicId}`);
        if (res.ok) {
          const data = await res.json();
          setPastLeaderboard(data.leaderboard || []);
          setClubLeaderboard(data.clubLeaderboard || []);
        }
      } catch (e) {
        console.error("Hiba a történeti adatok betöltésekor:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [selectedTopicId]);

  // 🛡️ BIZTONSÁGI PAJZS: Megnézzük, hogy az új hibrid rendszer szerint kell-e renderelnünk
  const isNewSystem = Array.isArray(pastLeaderboard) && pastLeaderboard.length > 0 && pastLeaderboard[0]?.fair_score !== undefined;

  // Szigorúan rendezett toplista a dobogóhoz és a kártyához
  const sortedEntries = useMemo(() => {
    if (!Array.isArray(pastLeaderboard)) return [];
    return [...pastLeaderboard].sort((a, b) => {
      const scoreA = a.fair_score !== undefined ? Number(a.fair_score) : Number(a?.likes_count || 0);
      const scoreB = b.fair_score !== undefined ? Number(b.fair_score) : Number(b?.likes_count || 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (Number(a?.views_count || 0)) - (Number(b?.views_count || 0));
    });
  }, [pastLeaderboard]);

  // 📊 ASZINKRON, CORS-VÉDETT PRÉMIUM 1:1 FACEBOOK KÁRTYA GENERÁTOR MOTOR
  const generateFacebookCard = async () => {
    if (sortedEntries.length === 0) return;
    setIsGeneratingCard(true);

    const currentTopic = pastTopics.find(t => t.id === selectedTopicId);
    const topicTitle = lang === 'en' && currentTopic?.title_en ? currentTopic.title_en : (currentTopic?.title || 'Kihívás');
    
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1200; // Perfect 1:1 Square Aspect Ratio
    const ctx = canvas.getContext('2d');
    if (!ctx) { setIsGeneratingCard(false); return; }

    // Kép-betöltő ígéret CORS védelemmel felszerelve
    const loadImageAsync = (url: string): Promise<HTMLImageElement | null> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
      });
    };

    // A top 3 helyezett fotóinak letöltése a háttérben
    const [img1, img2, img3] = await Promise.all([
      sortedEntries[0] ? loadImageAsync(getImageUrl(sortedEntries[0].drive_file_id, sortedEntries[0].file_url)) : Promise.resolve(null),
      sortedEntries[1] ? loadImageAsync(getImageUrl(sortedEntries[1].drive_file_id, sortedEntries[1].file_url)) : Promise.resolve(null),
      sortedEntries[2] ? loadImageAsync(getImageUrl(sortedEntries[2].drive_file_id, sortedEntries[2].file_url)) : Promise.resolve(null),
    ]);

    // 1. Alap háttér megrajzolása
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, 1200, 1200);

    // Kétoldali masszív prémium arany sávok leképzése (image_2.png alapján)
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(0, 0, 35, 1200);
    ctx.fillRect(1165, 0, 35, 1200);

    // 2. FELSŐ REKLÁMSZÖVEGEK ÉS KIHÍVÁS CÍME
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillText('✨ PHOTAWESOME.COM KIHÍVÁS EREDMÉNYEK ✨', 600, 95);
    ctx.letterSpacing = '0px'; // Reset

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 68px sans-serif';
    ctx.fillText(topicTitle, 600, 185);

    // „A GYŐZTESEK! 🏆” Kapszula plecsni megrajzolása
    ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(470, 225, 260, 48, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('A GYŐZTESEK! 🏆', 600, 256);

    // 3. PODIUM OSZLOP ÉS FOTÓ RAJZOLÓ ENGINE
    const drawPodiumColumn = (
      entry: any, 
      img: HTMLImageElement | null, 
      rank: number, 
      x: number, 
      imgTopY: number, 
      blockColors: { top: string; bottom: string; text: string; stroke: string },
      emoji: string
    ) => {
      if (!entry) return;

      const size = 260; // Fix fotó szélesség és magasság
      const blockTopY = imgTopY + size + 15;
      const blockHeight = 960 - blockTopY;

      // A) Kirajzoljuk a lekerekített fotót
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x - (size / 2), imgTopY, size, size, 24);
      ctx.clip();
      if (img) {
        ctx.drawImage(img, x - (size / 2), imgTopY, size, size);
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x - (size / 2), imgTopY, size, size);
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText('📷', x, imgTopY + (size / 2) + 15);
      }
      ctx.restore();

      // Fotó keretezése
      ctx.strokeStyle = blockColors.stroke;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(x - (size / 2), imgTopY, size, size, 24);
      ctx.stroke();

      // B) Kirajzoljuk az alatta elhelyezkedő fizikai pultot/oszlopot
      const grad = ctx.createLinearGradient(x, blockTopY, x, 960);
      grad.addColorStop(0, blockColors.top);
      grad.addColorStop(1, blockColors.bottom);
      ctx.fillStyle = grad;
      
      ctx.beginPath();
      ctx.roundRect(x - (size / 2), blockTopY, size, blockHeight, 20);
      ctx.fill();

      // Szövegezés az oszlop belsejében
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px sans-serif';
      let name = entry.user_name || 'Alkotó';
      if (name.length > 16) name = name.substring(0, 14) + '...';
      ctx.fillText(name, x, blockTopY + 55);

      // Pontszám
      ctx.fillStyle = blockColors.text;
      ctx.font = 'bold 22px sans-serif';
      const scoreText = entry.fair_score !== undefined ? `${entry.fair_score} FP` : `${entry.likes_count || 0} ⭐`;
      ctx.fillText(scoreText, x, blockTopY + 105);

      // Helyezés sáv
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 28px sans-serif';
      ctx.fillText(`${emoji} ${rank}. HELY`, x, blockTopY + blockHeight - 35);
    };

    // 🥈 2. HELYEZETT (BAL OLDAL - Közepesen magas)
    drawPodiumColumn(sortedEntries[1], img2, 2, 260, 440, {
      top: '#1e293b', bottom: '#0f172a', text: '#cbd5e1', stroke: '#cbd5e1'
    }, '🥈');

    // 👑 1. HELYEZETT (KÖZÉPSŐ OSZLOP - A legmagasabb + Korona)
    if (sortedEntries[0]) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = '50px sans-serif';
      ctx.fillText('👑', 600, 320); // Lebegő korona az első helyezett felett
      
      drawPodiumColumn(sortedEntries[0], img1, 1, 600, 340, {
        top: '#fbbf24', bottom: '#d97706', text: '#ffffff', stroke: '#fbbf24'
      }, '🥇');
    }

    // 🥉 3. HELYEZETT (JOBB OLDAL - Alacsony)
    drawPodiumColumn(sortedEntries[2], img3, 3, 940, 500, {
      top: '#451a03', bottom: '#1c0d02', text: '#fca5a5', stroke: '#cd7f32'
    }, '🥉');

    // 4. ALSÓ FOOTER SÁV (Vizuális lezárás)
    ctx.fillStyle = '#475569';
    ctx.font = '500 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Csatlakozz a kihívásokhoz: photawesome.com', 75, 1135);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('✨ PhotAwesome Arena ✨', 1125, 1135);

    // Kép letöltése kliensoldalon
    const link = document.createElement('a');
    link.download = `arena_${selectedTopicId}_dobogo.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
    
    setIsGeneratingCard(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%', maxWidth: '1000px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* SELEKTOR ÉS MEGOSZTÓ SÁV */}
      <div style={{ background: '#1e293b', padding: '15px 20px', borderRadius: '16px', border: '1px solid #334155', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
        {!externalTopicId && pastTopics.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <label style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 'bold' }}>
              {t('archiveSelectChallenge') || 'Kihívás kiválasztása:'}
            </label>
            <select 
              value={selectedTopicId || ''} 
              onChange={(e) => setSelectedTopicId(Number(e.target.value))}
              style={{ background: '#0f172a', color: 'white', border: '1px solid #475569', padding: '10px 15px', borderRadius: '10px', fontSize: '0.95rem', outline: 'none', cursor: 'pointer', minWidth: '250px' }}
            >
              {pastTopics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {lang === 'en' && topic.title_en ? topic.title_en : topic.title}
                </option>
              ))}
            </select>
          </div>
        ) : <div />}

        {/* 📊 FACEBOOK EXPORT GOMB */}
        {sortedEntries.length > 0 && (
          <button 
            onClick={generateFacebookCard}
            disabled={isGeneratingCard}
            style={{ background: 'linear-gradient(135deg, #1877f2, #166fe5)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.9rem', cursor: isGeneratingCard ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(24,119,242,0.3)', transition: 'all 0.2s', opacity: isGeneratingCard ? 0.6 : 1 }}
          >
            {isGeneratingCard ? '⏳ Generálás...' : '📊 Kártya generálása Facebookra'}
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '50px', fontSize: '1.1rem', fontWeight: 'bold' }}>⏳ Adatok betöltése...</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', width: '100%' }}>
          
          {/* BAL OLDAL: EGYÉNI RANGSOR PANEL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: '1.8', minWidth: '280px' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#f8fafc', fontSize: '1.5rem', fontWeight: 'bold' }}>
              🏆 Egyéni Rangsor
            </h3>

            {sortedEntries.length === 0 ? (
              <div style={{ background: '#1e293b', padding: '40px 20px', borderRadius: '16px', color: '#64748b', textAlign: 'center', border: '1px dashed #334155', width: '100%' }}>
                Nem találtunk értékelhető nevezést ebben a fordulóban.
              </div>
            ) : (
              <>
                {/* 👑 FEJLESZTETT VIZUÁLIS DOBOGÓ A KEZELŐFELÜLETEN */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '15px', background: 'rgba(15, 23, 42, 0.3)', padding: '25px 15px', borderRadius: '24px', border: '1px solid #334155', width: '100%', boxSizing: 'border-box', marginBottom: '5px', flexWrap: 'nowrap', overflowX: 'auto' }}>
                  
                  {/* 🥈 2. HELYEZETT */}
                  {sortedEntries[1] && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: '#1e293b', border: '2px solid #cbd5e1', borderRadius: '16px', padding: '12px 10px', width: '100%', maxWidth: '145px', height: '145px', justifyContent: 'flex-end', position: 'relative', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                      <div style={{ position: 'absolute', top: '-14px', background: '#cbd5e1', color: '#0f172a', fontWeight: '900', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem' }}>2</div>
                      <img src={getImageUrl(sortedEntries[1]?.drive_file_id, sortedEntries[1]?.file_url)} alt="" style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '50%', border: '1px solid #cbd5e1' }} />
                      <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.82rem', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{sortedEntries[1].user_name}</div>
                      <div style={{ color: '#fbbf24', fontWeight: '900', fontSize: '0.95rem' }}>{sortedEntries[1].fair_score !== undefined ? `${sortedEntries[1].fair_score} FP` : `${sortedEntries[1].likes_count} ⭐`}</div>
                    </div>
                  )}

                  {/* 👑 1. HELYEZETT */}
                  {sortedEntries[0] && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: '#1e293b', border: '2px solid #fbbf24', borderRadius: '16px', padding: '15px 12px', width: '100%', maxWidth: '165px', height: '175px', justifyContent: 'flex-end', position: 'relative', boxShadow: '0 8px 25px rgba(251,191,36,0.15)', zIndex: 2 }}>
                      <div style={{ position: 'absolute', top: '-22px', fontSize: '1.5rem' }}>👑</div>
                      <div style={{ position: 'absolute', top: '-14px', background: '#fbbf24', color: '#0f172a', fontWeight: '900', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>1</div>
                      <img src={getImageUrl(sortedEntries[0]?.drive_file_id, sortedEntries[0]?.file_url)} alt="" style={{ width: '55px', height: '55px', objectFit: 'cover', borderRadius: '50%', border: '2px solid #fbbf24' }} />
                      <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{sortedEntries[0].user_name}</div>
                      <div style={{ color: '#fbbf24', fontWeight: '900', fontSize: '1.1rem' }}>{sortedEntries[0].fair_score !== undefined ? `${sortedEntries[0].fair_score} FP` : `${sortedEntries[0].likes_count} ⭐`}</div>
                    </div>
                  )}

                  {/* 🥉 3. HELYEZETT */}
                  {sortedEntries[2] && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: '#1e293b', border: '2px solid #cd7f32', borderRadius: '16px', padding: '12px 10px', width: '100%', maxWidth: '135px', height: '130px', justifyContent: 'flex-end', position: 'relative', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                      <div style={{ position: 'absolute', top: '-14px', background: '#cd7f32', color: 'white', fontWeight: '900', borderRadius: '50%', width: '24px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem' }}>3</div>
                      <img src={getImageUrl(sortedEntries[2]?.drive_file_id, sortedEntries[2]?.file_url)} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '50%', border: '1px solid #cd7f32' }} />
                      <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.78rem', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{sortedEntries[2].user_name}</div>
                      <div style={{ color: '#fbbf24', fontWeight: '900', fontSize: '0.9rem' }}>{sortedEntries[2].fair_score !== undefined ? `${sortedEntries[2].fair_score} FP` : `${sortedEntries[2].likes_count} ⭐`}</div>
                    </div>
                  )}

                </div>

                {/* GÖRDÍTHETŐ LISTASOROK */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sortedEntries.map((entry, index) => {
                    const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#cbd5e1' : index === 2 ? '#cd7f32' : '#64748b';
                    
                    return (
                      <div 
                        key={entry.id || index} 
                        onClick={() => onOpenDetails && onOpenDetails(entry)}
                        style={{ display: 'flex', alignItems: 'center', background: '#1e293b', border: '1px solid #334155', padding: '16px 20px', borderRadius: '16px', transition: 'all 0.2s', cursor: onOpenDetails ? 'pointer' : 'default', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                        onMouseEnter={(e) => { if(onOpenDetails) e.currentTarget.style.borderColor = '#475569'; }}
                        onMouseLeave={(e) => { if(onOpenDetails) e.currentTarget.style.borderColor = '#334155'; }}
                      >
                        <div style={{ fontSize: '1.6rem', fontWeight: '900', width: '45px', color: rankColor, textAlign: 'left', fontFamily: 'monospace' }}>
                          {index + 1}.
                        </div>

                        <div style={{ width: '60px', height: '60px', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '18px', border: '1px solid #475569', flexShrink: 0 }}>
                          <img src={getImageUrl(entry?.drive_file_id, entry?.file_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0, paddingRight: '15px' }}>
                          <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.user_name}
                          </div>
                          
                          {entry.club_name && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                              <span style={{ color: '#10b981', fontSize: '0.82rem', fontWeight: '600' }}>
                                🛡️ {entry.club_name}
                              </span>
                            </div>
                          )}

                          <div style={{ fontSize: '0.8rem', color: entry.archive_likes > 0 ? '#f43f5e' : '#64748b', fontWeight: '600', marginTop: '4px' }}>
                            ❤️ {entry.archive_likes || 0} utólagos dicséret
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', minWidth: '95px', flexShrink: 0 }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fbbf24' }}>
                            {entry.fair_score !== undefined ? `${entry.fair_score} FP` : `${entry.likes_count || 0} ⭐`}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'normal', marginTop: '2px', fontFamily: 'monospace' }}>
                            {entry.fair_score !== undefined ? `${entry.likes_count || 0} ⭐ | ` : ''}{entry.views_count || 0} 👁️
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* JOBB OLDAL: KLUB RANGSOR PANEL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: '1', minWidth: '280px' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#10b981', fontSize: '1.5rem', fontWeight: 'bold' }}>
              🛡️ Klub Rangsor
            </h3>

            {!Array.isArray(clubLeaderboard) || clubLeaderboard.length === 0 ? (
              <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', color: '#64748b', textAlign: 'center', border: '1px dashed #334155' }}>
                Nem indultak klubtagok ebben a kihívásban.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {clubLeaderboard.map((club, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: '1px solid #059669', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: '900', width: '35px', color: index === 0 ? '#fbbf24' : '#cbd5e1', textAlign: 'center' }}>
                      {index + 1}.
                    </div>
                    <div style={{ flex: 1, marginLeft: '12px', minWidth: 0 }}>
                      <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {club?.club_name || 'Ismeretlen Klub'}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '2px' }}>
                        {club?.members_counted || 0} tag pontszáma
                      </div>
                    </div>
                    
                    <div style={{ color: '#10b981', fontWeight: '900', fontSize: '1.3rem', flexShrink: 0, marginLeft: '10px' }}>
                      {club?.total_score || 0} {isNewSystem ? 'FP' : '⭐'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
