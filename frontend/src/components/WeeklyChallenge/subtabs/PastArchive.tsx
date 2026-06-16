import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../utils/constants';
import { getImageUrl } from '../../utils/helpers';
import { useLanguage } from '../../context/LanguageContext';

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

  // Szinkron, ha külsőleg (prop-ból) kap új topicId-t az ablak
  useEffect(() => {
    if (externalTopicId) {
      setSelectedTopicId(externalTopicId);
    }
  }, [externalTopicId]);

  // 2. Kiválasztott archív szoba adatainak (egyéni és klub) betöltése
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%', maxWidth: '1000px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* ARCHÍV SZÓBA VÁLASZTÓ SÁV (Csak akkor látszik, ha nem dedikált prop-ként kapta a szoba ID-t) */}
      {!externalTopicId && pastTopics.length > 0 && (
        <div style={{ background: '#1e293b', padding: '15px 20px', borderRadius: '16px', border: '1px solid #334155', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
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
      )}

      {loading ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '50px', fontSize: '1.1rem', fontWeight: 'bold' }}>⏳ Adatok betöltése...</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', width: '100%' }}>
          
          {/* BAL OLDAL: EGYÉNI RANGSOR PANEL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: '1.8', minWidth: '280px' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#f8fafc', fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🏆 Egyéni Rangsor
            </h3>

            {!Array.isArray(pastLeaderboard) || pastLeaderboard.length === 0 ? (
              <div style={{ background: '#1e293b', padding: '40px 20px', borderRadius: '16px', color: '#64748b', textAlign: 'center', border: '1px dashed #334155', width: '100%', boxSizing: 'border-box' }}>
                Nem találtunk értékelhető nevezést ebben a fordulóban.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[...pastLeaderboard].sort((a, b) => {
                  const scoreA = a.fair_score !== undefined ? Number(a.fair_score) : Number(a?.likes_count || 0);
                  const scoreB = b.fair_score !== undefined ? Number(b.fair_score) : Number(b?.likes_count || 0);
                  
                  if (scoreB !== scoreA) return scoreB - scoreA;
                  return (Number(a?.views_count || 0)) - (Number(b?.views_count || 0));
                }).map((entry, index) => {
                  const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#cbd5e1' : index === 2 ? '#cd7f32' : '#64748b';
                  
                  return (
                    <div 
                      key={entry.id || index} 
                      onClick={() => onOpenDetails && onOpenDetails(entry)}
                      style={{ display: 'flex', alignItems: 'center', background: '#1e293b', border: '1px solid #334155', padding: '16px 20px', borderRadius: '16px', transition: 'all 0.2s', cursor: onOpenDetails ? 'pointer' : 'default', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                      onMouseEnter={(e) => { if(onOpenDetails) e.currentTarget.style.borderColor = '#475569'; }}
                      onMouseLeave={(e) => { if(onOpenDetails) e.currentTarget.style.borderColor = '#334155'; }}
                    >
                      {/* Rang sorszám */}
                      <div style={{ fontSize: '1.6rem', fontWeight: '900', width: '45px', color: rankColor, textAlign: 'left', fontFamily: 'monospace' }}>
                        {index + 1}.
                      </div>

                      {/* Kép kártya */}
                      <div style={{ width: '60px', height: '60px', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '18px', border: '1px solid #475569', flexShrink: 0 }}>
                        <img src={getImageUrl(entry?.drive_file_id, entry?.file_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>

                      {/* Alkotó adatai */}
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

                      {/* Értékelő blokk (Fair Pont vs Régi Csillagok) */}
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
                    
                    {/* 🛡️ ATOMBIZTOS KLUBEGYSÉG DETEKTOR - SOHA TÖBBÉ NEM OKOZ FEHÉR KÉPERNYŐT */}
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
