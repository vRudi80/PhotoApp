import React, { useState } from 'react';
import { getImageUrl } from '../../../utils/helpers';
import ArchiveDetailModal from '../ArchiveDetailModal'; 

// 🎯 ÚJ IMPORT: Behozzuk a nyelvi kontextust
import { useLanguage } from '../../../context/LanguageContext';

interface PastArchiveProps {
  pastTopics: any[];
  selectedPastTopicId: number | null;
  loadPastHistoryList: (id: number) => void;
  pastClubLeaderboard: any[];
  pastLeaderboard: any[];
  getTopicType: (start: string, end: string) => 'daily' | 'weekly';
  handleImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  setFullscreenData: (data: any) => void;
  user: any; 
}

export default function PastArchive({
  pastTopics, selectedPastTopicId, loadPastHistoryList,
  pastClubLeaderboard, pastLeaderboard, getTopicType,
  handleImageError, setFullscreenData, user
}: PastArchiveProps) {

  // 🎯 ÚJ: Aktiváljuk a fordítót (t) és a nyelv-figyelőt (lang)
  const { t, lang } = useLanguage();

  const [activeArchiveEntry, setActiveArchiveEntry] = useState<any | null>(null);

  const currentModalEntry = activeArchiveEntry
    ? (pastLeaderboard.find(x => x.id === activeArchiveEntry.id) || activeArchiveEntry)
    : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* 📜 BAL OLDALSÁV: BEFEJEZETT CSATÁK MENETRENDJE */}
      <div style={{ background: '#1e293b', borderRadius: '24px', padding: '25px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', height: 'fit-content' }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#60a5fa', fontSize: '1.4rem', fontWeight: 'bold' }}>{t('archiveTitle')}</h3>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem', lineHeight: '1.4' }}>{t('archiveNotice')}</p>
        {(!pastTopics || pastTopics.length === 0) ? (
          <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '15px' }}>{t('archiveEmpty')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
            {pastTopics.map(tRow => {
              const isDaily = getTopicType(tRow.start_date, tRow.end_date) === 'daily';
              return (
                <div 
                  key={tRow.id} 
                  onClick={() => loadPastHistoryList(tRow.id)} 
                  style={{ 
                    padding: '15px 20px', 
                    background: selectedPastTopicId === tRow.id ? 'linear-gradient(90deg, #3b82f640, #0f172a)' : '#0f172a', 
                    border: selectedPastTopicId === tRow.id ? '1px solid #3b82f6' : '1px solid #334155', 
                    borderRadius: '12px', cursor: 'pointer', color: 'white', 
                    fontWeight: selectedPastTopicId === tRow.id ? 'bold' : 'normal', transition: 'all 0.2s' 
                  }}
                >
                  {isDaily ? '🔴 ' : '🔵 '} {lang === 'en' && tRow.title_en ? tRow.title_en : tRow.title}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* 📊 JOBB OLDALSÁV: RÉSZLETES HADJELENTÉSEK */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* CSATA BORÍTÓKÉP BANNER */}
        {selectedPastTopicId && (() => {
          const matchedTopic = pastTopics.find(x => x.id === selectedPastTopicId);
          if (matchedTopic && matchedTopic.cover_url) {
            return (
              <div>
                <div style={{ width: '100%', height: '200px', borderRadius: '24px', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 10px 25px rgba(0,0,0,0.4)', position: 'relative', backgroundColor: '#090d16' }}>
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${matchedTopic.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(15px) brightness(0.5)', transform: 'scale(1.1)' }}></div>
                  <img src={matchedTopic.cover_url} alt="" style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', zIndex: 1 }} onError={handleImageError} />
                </div>
                {matchedTopic.cover_author && (
                  <div style={{ color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic', marginTop: '5px', textAlign: 'right', paddingRight: '10px' }}>
                    {t('archiveCoverAuthor')}{matchedTopic.cover_author}
                  </div>
                )}
              </div>
            );
          }
          return null;
        })()}

        {/* KLUBOK CSATÁJA RANGLISTA */}
        <div style={{ background: '#1e293b', borderRadius: '24px', padding: '25px', border: '1px solid #10b981', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, color: '#10b981', fontSize: '1.4rem', fontWeight: 'bold' }}>{t('archiveClubLeague')}</h3>
            {selectedPastTopicId && (() => {
              const matchedTopic = pastTopics.find(x => x.id === selectedPastTopicId);
              if (!matchedTopic) return null;
              const isDaily = getTopicType(matchedTopic.start_date, matchedTopic.end_date) === 'daily';
              return (
                <span style={{ fontSize: '0.75rem', background: isDaily ? '#ef444420' : '#3b82f620', color: isDaily ? '#f87171' : '#60a5fa', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold', border: `1px solid ${isDaily ? '#ef444450' : '#3b82f650'}` }}>
                  {isDaily ? t('archiveBlitz') : t('archiveMaster')}
                </span>
              );
            })()}
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0 0 20px 0' }}>{t('archiveClubLeagueDesc')}</p>
          
          {selectedPastTopicId && (!pastClubLeaderboard || pastClubLeaderboard.length === 0) && <div style={{ color: '#94a3b8', textAlign: 'center', padding: '10px' }}>{t('archiveNoClubs')}</div>}
          {!selectedPastTopicId && <div style={{ color: '#94a3b8', textAlign: 'center', padding: '10px' }}>{t('archiveSelectChallenge')}</div>}
          
          {pastClubLeaderboard && pastClubLeaderboard.map((club, index) => {
            const clubMembers = pastLeaderboard
              .filter(entry => entry?.club_name === club?.club_name)
              .sort((a, b) => Number(b?.likes_count || 0) - Number(a?.likes_count || 0));

            return (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '15px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #059669' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '900', width: '35px', color: index === 0 ? '#fbbf24' : '#cbd5e1', textAlign: 'center' }}>{index + 1}.</div>
                  <div style={{ flex: 1, marginLeft: '10px' }}>
                    <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>{club?.club_name || t('archiveUnknownClub')}</div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{club?.members_counted || 0}{t('archiveBasedOnPoints')}</div>
                  </div>
                  <div style={{ color: '#10b981', fontWeight: '900', fontSize: '1.4rem' }}>{club?.total_score || 0} ⭐</div>
                </div>

                <details style={{ marginTop: '10px', borderTop: '1px dashed #334155', paddingTop: '8px' }}>
                  <summary style={{ fontSize: '0.8rem', color: '#38bdf8', cursor: 'pointer', outline: 'none', userSelect: 'none' }}>
                    {t('archiveMemberIndividualScore').replace('{count}', String(clubMembers.length))}
                  </summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', paddingLeft: '10px' }}>
                    {clubMembers.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>{t('archiveNoMemberPoints')}</span>
                    ) : (
                      clubMembers.map((m, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1' }}>
                          <span>👤 {m.user_name}</span>
                          <span style={{ fontWeight: 'bold', color: '#fbbf24' }}>{m.likes_count || 0} ⭐</span>
                        </div>
                      ))
                    )}
                  </div>
                </details>
              </div>
            );
          })}
        </div>

        {/* EGYÉNI VÉGEREDMÉNY (RANGSOR) */}
        <div style={{ background: '#1e293b', borderRadius: '24px', padding: '25px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#3b82f6', fontSize: '1.4rem', fontWeight: 'bold' }}>{t('archiveIndividualRanking')}</h3>
          
          {!selectedPastTopicId && <div style={{ color: '#94a3b8', textAlign: 'center', padding: '10px' }}>{t('archiveSelectMatch')}</div>}
          
          {pastLeaderboard && [...pastLeaderboard].sort((a, b) => {
            const likesA = Number(a?.likes_count || 0);
            const likesB = Number(b?.likes_count || 0);
            const viewsA = Number(a?.views_count || 0);
            const viewsB = Number(b?.views_count || 0);
            if (likesB !== likesA) return likesB - likesA;
            return viewsA - viewsB;
          }).map((entry, index) => (
            <div key={entry?.id || index} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '12px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: '900', width: '35px', color: index === 0 ? '#fbbf24' : index === 1 ? '#e2e8f0' : index === 2 ? '#cd7f32' : '#64748b', textAlign: 'center' }}>{index + 1}.</div>
              
              <div style={{ position: 'relative', cursor: 'zoom-in' }} onClick={() => setActiveArchiveEntry(entry)}>
                <img 
                  src={getImageUrl(entry?.drive_file_id, entry?.file_url)} 
                  alt="Submission" 
                  style={{ width: '55px', height: '55px', borderRadius: '8px', margin: '0 15px', objectFit: 'cover' }} 
                  onError={handleImageError} 
                />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ color: 'white', fontWeight: 'bold' }}>{entry?.user_name || t('archivePhotographer')}</div>
                {entry?.club_name && <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold' }}>🛡️ {entry.club_name}</div>}
                
                <div style={{ fontSize: '0.75rem', color: entry?.has_user_liked ? '#f87171' : '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: entry?.has_user_liked ? 'bold' : 'normal' }}>
                  <span>{entry?.has_user_liked ? '❤️' : '🤍'}</span> 
                  <span>{entry?.archive_likes || 0}{t('archivePostPraises')}</span>
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#f97316', fontWeight: '900', fontSize: '1.2rem' }}>{entry?.likes_count || 0} ⭐</div>
                <small style={{ color: '#475569', fontSize: '0.7rem' }}>{entry?.views_count || 0} 👁️</small>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* 💬 INTERAKTÍV KIBESZÉLŐ MODÁL RENDERELÉSE */}
      {currentModalEntry && (
        <ArchiveDetailModal
          entry={currentModalEntry}
          userEmail={user?.email || user?.userEmail || ''} 
          userName={user?.name || user?.userName || t('archiveNomadWarrior')} 
          onClose={() => setActiveArchiveEntry(null)}
          onLikeUpdate={() => {
            if (selectedPastTopicId) {
              loadPastHistoryList(selectedPastTopicId);
            }
          }}
        />
      )}

    </div>
  );
}
