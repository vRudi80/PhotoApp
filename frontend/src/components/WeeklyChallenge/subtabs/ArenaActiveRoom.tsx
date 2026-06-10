import React from 'react';
import { getImageUrl } from '../../../utils/helpers';

interface ArenaActiveRoomProps {
  topic: any;
  timeLeft: string;
  isMaster: boolean;
  exposureColor: string;
  exposurePercentage: number;
  exposureLabel: string;
  myEntry: any;
  voteEntry: any;
  noMoreEntries: boolean;
  masterVotesLeft: number;
  userPower: any;
  swapBalance: number;
  myPastEntries: any[];
  leaderboard: any[];
  currentClubLeaderboard: any[];
  user: any;
  isUploading: boolean;
  uploadPreview: string | null;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpload: () => void;
  isLoadingSwapAlbum: boolean;
  isSwapping: boolean;
  swapPreview: string | null;
  handleSwapFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSwapSubmit: () => void;
  onOpenAlbumForUpload: () => void;
  onOpenAlbumForSwap: () => void;
  handleVote: (type: 'pass' | 'super' | 'brilliant' | 'master') => void;
  handleOffTopicReport: (id: number) => void;
  handleSwapBackSubmit: (id: number) => void;
  setFullscreenData: (data: any) => void;
  handleImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export default function ArenaActiveRoom({
  topic, timeLeft, isMaster, exposureColor, exposurePercentage, exposureLabel,
  myEntry, voteEntry, noMoreEntries, masterVotesLeft, userPower, swapBalance,
  myPastEntries, leaderboard, currentClubLeaderboard, user,
  isUploading, uploadPreview, handleFileSelect, handleUpload, isLoadingSwapAlbum,
  isSwapping, swapPreview, handleSwapFileSelect, handleSwapSubmit,
  onOpenAlbumForUpload, onOpenAlbumForSwap,
  handleVote, handleOffTopicReport, handleSwapBackSubmit,
  setFullscreenData, handleImageError
}: ArenaActiveRoomProps) {

  // 🛡️ Szigorú aszinkron védelmi vonal (Megakadályozza a fehér képernyőt)
  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];
  const safeClubLeaderboard = Array.isArray(currentClubLeaderboard) ? currentClubLeaderboard : [];
  const safePastEntries = Array.isArray(myPastEntries) ? myPastEntries : [];
  const safeUserPower = userPower || { super: 1, brilliant: 2 };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '30px', animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* ── BAL OLDALI OSZLOP ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        {/* TÉMA INFÓ */}
        <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '30px', borderRadius: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '8rem', opacity: 0.05 }}>🔥</div>
          
          {/* 👑 JAVÍTVA: A cím mellé flex elrendezéssel bekerült az aktuális Képmester jelvénye */}
          <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '1.8rem', textAlign: 'center', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span>{topic?.title || 'Kihívás szoba'}</span>
            {(topic?.master_name || topic?.master_email) && (
              <span style={{ fontSize: '0.85rem', color: '#a78bfa', background: '#a78bfa15', padding: '5px 14px', borderRadius: '10px', border: '1px solid #a78bfa30', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                👑 Képmester: {topic.master_name || topic.master_email}
              </span>
            )}
          </h3>
          
          <p style={{ margin: '0 0 20px 0', color: '#cbd5e1', fontSize: '0.95rem', textAlign: 'center', zIndex: 1, lineHeight: '1.6' }}>{topic?.description || ''}</p>
          
          {/* 🏆 🔥 DINAMIKUS CSATATÉR FŐDÍJ BANNER */}
          <div style={{ width: '100%', background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(16, 185, 129, 0.05))', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '12px 20px', borderRadius: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', zIndex: 1, boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <span style={{ fontSize: '1.3rem' }}>🏆</span>
            <div style={{ textAlign: 'center', fontSize: '0.9rem', lineHeight: '1.4' }}>
              <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>FŐDÍJ AZ 1. HELYÉRT:</span>{' '}
              <strong style={{ color: '#4ade80' }}>1 HÉT INGYEN ALAP PRÉMIUM</strong>{' '}
              <span style={{ color: '#cbd5e1' }}>+ 3 db Joker Csere! 💎</span>
            </div>
          </div>

          <div style={{ background: '#00000080', padding: '15px 30px', borderRadius: '100px', border: '1px solid #ef444450', backdropFilter: 'blur(10px)', zIndex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', marginBottom: '5px' }}>Hátralévő Idő</div>
            <div style={{ color: '#f8fafc', fontSize: '1.5rem', fontWeight: '900', fontFamily: 'monospace', letterSpacing: '1px' }}>{timeLeft || 'Számítás...'}</div>
          </div>
        </div>
        
        {/* LÁTHATÓSÁGI MÉRŐ */}
        {!isMaster && (
          <div style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', padding: '25px 15px', borderRadius: '24px', border: `1px solid ${exposureColor || '#ef4444'}40`, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: `0 10px 40px -10px ${exposureColor || '#ef4444'}30`, transition: 'all 0.5s ease' }}>
            <h4 style={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 15px 0', fontSize: '0.85rem', textAlign: 'center' }}>Láthatósági Mérő</h4>
            
            <div style={{ position: 'relative', width: '100%', maxWidth: '240px', margin: '0 auto' }}>
              <svg viewBox="0 0 200 120" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1e293b" strokeWidth="16" strokeLinecap="round" />
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={exposureColor || '#ef4444'} strokeWidth="16" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - (exposurePercentage || 0)} />
              </svg>
              
              <div style={{ position: 'absolute', bottom: '15px', left: '0', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '2.8rem', fontWeight: '900', color: exposureColor || '#ef4444', lineHeight: '1' }}>
                  {Math.round(exposurePercentage || 0)}<span style={{ fontSize: '1.2rem' }}>%</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#f8fafc', textTransform: 'uppercase', marginTop: '5px', letterSpacing: '2px' }}>
                  {exposureLabel || 'Alacsony'}
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '15px 0 0 0', textAlign: 'center', lineHeight: '1.6' }}>
              {!myEntry ? 'Töltsd felt a képedet az induláshoz, és kapsz 10 alap energiát!' : voteEntry ? '⚡ Új fotó érkezett az Arénába (vagy valaki Jokert használt)! Értékelt, hogy a mérőd újra maxon pörögjön!' : '🔥 A képed a maximumon pörög! Jelenleg nincs több értékelhető kép az Arénában.'}
            </p>
          </div>
        )}

        {/* ÉRTÉKELŐ ARÉNA PULT */}
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '1.4rem' }}>⚔️ Értékelő Aréna</h3>
          
          {(!myEntry && !isMaster) ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: '#0f172a', borderRadius: '166px', border: '2px dashed #f59e0b' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>🛑</div>
              <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0', fontSize: '1.3rem' }}>Nincs szavazati jogod!</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>A küzdelembe való belépéshez először be kell nevezned egy saját fotóval!</p>
            </div>
          ) : noMoreEntries ? (
            <div style={{ padding: '50px 20px', textAlign: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '16px', border: '1px solid #10b981' }}>
              <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🎉</div>
              <h4 style={{ color: '#10b981', margin: '0 0 10px 0', fontSize: '1.5rem' }}>Mindent értékeltél!</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>Várj, amíg a többiek is töltenek fel új képeket.</p>
            </div>
          ) : voteEntry ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div onClick={() => setFullscreenData({url: getImageUrl(voteEntry?.drive_file_id, voteEntry?.file_url), title: 'Kihívás'})} style={{ width: '100%', height: '380px', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-in', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }}>
                <img src={getImageUrl(voteEntry?.drive_file_id, voteEntry?.file_url)} alt="Szavazás" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={handleImageError} />
              </div>
              
              {voteEntry?.off_topic_count > 0 && (
                <div style={{ background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b40', padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '15px', display: 'inline-flex', alignItems: 'center', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                  ⚠️ {voteEntry.off_topic_count} játékos szerint ez a kép Off-Topic vagy AI generált!
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '12px', width: '100%', flexDirection: 'column' }}>
                {isMaster && masterVotesLeft > 0 && (
                  <button 
                    onClick={() => handleVote('master')} 
                    style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #fbbf24, #d97706)', color: '#0f172a', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 15px rgba(251,191,36,0.4)', marginBottom: '6px' }}
                  >
                    👑 Képmester Különdíj (+10 pont) <br/>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.8 }}>Még {masterVotesLeft} db szavazatod maradt</span>
                  </button>
                )}

                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <button onClick={() => handleVote('super')} style={{ flex: 1, padding: '15px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                    ✨ Szuper <br/><span style={{fontSize: '0.8rem', fontWeight: 'normal'}}>+{safeUserPower.super} pont</span>
                  </button>
                  <button onClick={() => handleVote('brilliant')} style={{ flex: 1, padding: '15px', background: 'linear-gradient(135deg, #f97316, #ef4444)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                    🔥 Zseniális <br/><span style={{fontSize: '0.8rem', fontWeight: 'normal'}}>+{safeUserPower.brilliant} pont</span>
                  </button>
                </div>
                <button onClick={() => handleVote('pass')} style={{ width: '100%', padding: '12px', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '14px', fontSize: '0.95rem', cursor: 'pointer' }}>
                  ⏭️ Nem tetszik (0 pont)
                </button>
                <button 
                  onClick={() => handleOffTopicReport(voteEntry?.id)}
                  style={{ width: '100%', padding: '10px 20px', background: '#ef444410', color: '#ef4444', border: '1px solid #ef444430', borderRadius: '14px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                >
                  ⚠️ Off-Topic/AI gyanús Jelentés
                </button>
              </div>
            </div>
          ) : <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Kép betöltése...</div>}
        </div>
      </div>

      {/* ── JOBB OLDALI OSZLOP ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        {/* SAJÁT NEVEZÉS */}
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.4rem' }}>📸 Saját Nevezésem</h3>
            <span style={{ fontSize: '0.85rem', background: '#be123c30', color: '#fb7185', border: '1px solid #be123c60', padding: '4px 12px', borderRadius: '50px', fontWeight: 'bold' }}>
              🃏 Joker cserék: {swapBalance} db
            </span>
          </div>

          {isMaster ? (
            <div style={{ padding: '30px 15px', background: 'linear-gradient(135deg, #4c1d9520, #1e1b4b40)', border: '1px solid #a78bfa40', borderRadius: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>👑</div>
              <h4 style={{ color: '#a78bfa', margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 'bold' }}>Te vagy a Képmester!</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, lineHeight: '1.6' }}>
                Ebben a futamban te lettél felkérve a képmesternek! Saját alkotással nem nevezhetsz, cserébe kapsz 5 darab, egyenként **+10 pontot** érő Különdíjat, amit a szavazás során oszthatsz szét a kedvenc képeid között.
              </p>
            </div>
          ) : myEntry ? (
            <div>
              <div style={{ width: '100%', height: '220px', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)' }}>
                <img src={getImageUrl(myEntry?.drive_file_id, myEntry?.file_url)} alt="Saját" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={handleImageError} />
              </div>
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${exposureColor || '#ef4444'}` }}>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Eredmény</div><div style={{ color: '#f59e0b', fontSize: '1.5rem', fontWeight: '900' }}>{myEntry?.likes_count || 0} ⭐</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Nézettség</div><div style={{ color: '#38bdf8', fontSize: '1.5rem', fontWeight: '900' }}>{myEntry?.views_count || 0} 👁️</div></div>
              </div>

              {myEntry?.off_topic_count > 0 && (
                <div style={{ background: 'linear-gradient(90deg, #ef444415, transparent)', borderLeft: '4px solid #ef4444', padding: '15px', borderRadius: '0 12px 12px 0', marginTop: '15px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                  <b style={{ color: '#ef4444', display: 'block', marginBottom: '4px', fontSize: '0.95rem' }}>
                    🚫 Figyelmeztetés: Tématévesztés gyanúja!
                  </b>
                  A képedet eddig <b>{myEntry.off_topic_count} fotóstársad</b> jelentette off-topicnak vagy gyanúsan AI-al generáltnak. Kérlek ügyelj a pontos témára, illetve ne használj AI fotót!
                </div>
              )}

              {swapBalance > 0 ? (
                <div style={{ marginTop: '25px', background: 'linear-gradient(135deg, #4c1d9520, #be123c20)', padding: '20px', borderRadius: '16px', border: '1px solid #be123c50' }}>
                  <h5 style={{ margin: '0 0 10px 0', color: '#f43f5e', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>🔄 Új Fotó Feltöltése & Csere</h5>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 15px 0', lineHeight: '1.5' }}>Rosszul megy a szekér? Tölts fel egy vadonatúj fotót 1 cserepontért! Az új kép 0 pontról indul, de a mostani képedet sem veszíted el.</p>
                  <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileSelect} style={{ color: '#cbd5e1', marginBottom: '15px', fontSize: '0.9rem' }} disabled={isSwapping} />
                  {swapPreview && <div style={{marginBottom: '15px', display: 'flex', justifyContent: 'center'}}><img src={swapPreview} alt="Swap preview" style={{maxHeight: '120px', borderRadius: '8px', border: '2px solid #e11d48'}} /></div>}
                  <button onClick={handleSwapSubmit} disabled={!uploadPreview || isSwapping} style={{ width: '100%', background: !uploadPreview ? '#334155' : 'linear-gradient(135deg, #e11d48, #be123c)', color: !uploadPreview ? '#94a3b8' : 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: !uploadPreview ? 'not-allowed' : 'pointer' }}>
                    {isSwapping ? 'Csere folyamatban...' : 'Joker Elköltése Tallózással 🔄'}
                  </button>

                  <div style={{ marginTop: '18px', borderTop: '1px solid #be123c40', paddingTop: '15px', textAlign: 'center' }}>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 10px 0' }}>VAGY elhasználhatsz 1 Jokert egy már meglévő albumképedre:</p>
                    <button 
                      disabled={isSwapping || isLoadingSwapAlbum}
                      onClick={onOpenAlbumForSwap}
                      style={{ width: '100%', background: '#1e293b', border: '1px solid #f43f5e', color: '#f43f5e', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}
                    >
                      {isLoadingSwapAlbum ? '⏳ Képtár betöltése...' : '🖼️ Joker Csere az Aréna Képtárból'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '25px', background: '#0f172a', padding: '15px', borderRadius: '12px', color: '#64748b', fontSize: '0.9rem', textAlign: 'center', border: '1px dashed #475569' }}>
                  🔒 Elfogytak a globális Joker cseréid! Teljesíts jól feladatokat extra pontokért.
                </div>
              )}

              {safePastEntries.length > 0 && (
                <div style={{ marginTop: '25px', borderTop: '1px dashed #334155', paddingTop: '20px' }}>
                  <h5 style={{ margin: '0 0 12px 0', color: '#38bdf8', fontSize: '1.05rem' }}>↩️ Korábbi fotóid ebben a fordulóban</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {safePastEntries.map((past, pIdx) => (
                      <div key={pIdx} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '8px', borderRadius: '12px', border: '1px solid #1e293b' }}>
                        <img src={getImageUrl(past?.drive_file_id, past?.file_url)} alt="Past" style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '6px' }} onError={handleImageError} />
                        <div style={{ flex: 1, marginLeft: '10px' }}>
                          <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Eltárolt korábbi állás:</div>
                          <div style={{ fontSize: '0.9rem', color: '#fbbf24', fontWeight: 'bold' }}>{past?.likes_count || 0} ⭐ <span style={{ color: '#64748b', fontWeight: 'normal', fontSize: '0.75rem' }}>({past?.views_count || 0} 👁️)</span></div>
                        </div>
                        <button 
                          onClick={() => handleSwapBackSubmit(past.id)}
                          disabled={swapBalance < 1}
                          style={{ background: swapBalance < 1 ? '#1e293b' : 'linear-gradient(135deg, #0284c7, #0369a1)', color: swapBalance < 1 ? '#475569' : 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: swapBalance < 1 ? 'not-allowed' : 'pointer' }}
                        >
                          ↩️ Visszaaktiválás
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px dashed #38bdf8' }}>
                <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileSelect} style={{ color: '#cbd5e1', marginBottom: '15px', width: '100%', fontSize: '0.9rem' }} disabled={isUploading} />
                {uploadPreview && <div style={{marginBottom: '20px', display: 'flex', justifyContent: 'center'}}><img src={uploadPreview} alt="Preview" style={{maxHeight: '200px', borderRadius: '12px', boxShadow: '0 5px 15px rgba(0,0,0,0.5)'}} /></div>}
                <button onClick={handleUpload} disabled={!uploadPreview || isUploading} style={{ width: '100%', background: (!uploadPreview || isUploading) ? '#334155' : 'linear-gradient(135deg, #0ea5e9, #2563eb)', color: (!uploadPreview || isUploading) ? '#94a3b8' : 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  {isUploading ? 'Feltöltés...' : 'Nevezés és Indulás 🚀'}
                </button>

                <div style={{ marginTop: '15px', borderTop: '1px solid #334155', paddingTop: '15px', textAlign: 'center' }}>
                  <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 10px 0' }}>VAGY választhatsz egy meglévő fotót az albumodból:</p>
                  <button 
                    disabled={isUploading || isLoadingSwapAlbum}
                    onClick={onOpenAlbumForUpload}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #14b8a6', color: '#14b8a6', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    🖼️ Választás az Aréna Képtárból
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* KLUBOK CSATÁJA */}
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #10b981', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, color: '#10b981', fontSize: '1.4rem' }}>🛡️ Klubok Ligája</h3>
            <span style={{ fontSize: '0.8rem', background: '#ef4444', color: 'white', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold', boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)' }}>ÉLŐ</span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>A 3 legjobb klubtag megmérettetése alapján.</p>
          
          {safeClubLeaderboard.length === 0 ? <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px', background: '#0f172a', borderRadius: '16px' }}>Még nincs rangsorolt klub.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {safeClubLeaderboard.map((club, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: '1px solid #059669', padding: '12px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '900', width: '35px', color: index === 0 ? '#fbbf24' : '#cbd5e1', textAlign: 'center' }}>{index + 1}.</div>
                  <div style={{ flex: 1, marginLeft: '10px' }}>
                    <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>{club?.club_name || 'Ismeretlen Klub'}</div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{club?.members_counted || 0} aktív tag</div>
                  </div>
                  <div style={{ color: '#10b981', fontWeight: '900', fontSize: '1.4rem' }}>{club?.total_score || 0} ⭐</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* VAK TOPLISTA */}
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #f59e0b', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#f59e0b', fontSize: '1.4rem' }}>🏆 Vak Toplista</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>A taktikázás elkerülése végett az ellenfelek kiléte titkos!</p>
          
          {safeLeaderboard.length === 0 ? <div style={{ color: '#94a3b8', textAlign: 'center', padding: '30px', background: '#0f172a', borderRadius: '16px' }}>Még üres az Aréna.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[...safeLeaderboard].sort((a, b) => {
                const likesA = Number(a?.likes_count || 0);
                const likesB = Number(b?.likes_count || 0);
                const viewsA = Number(a?.views_count || 0);
                const viewsB = Number(b?.views_count || 0);
                if (likesB !== likesA) return likesB - likesA;
                return viewsA - viewsB;
              }).map((entry, index) => {
                const isMe = entry?.user_email === user?.email;
                const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#e2e8f0' : index === 2 ? '#cd7f32' : '#64748b';
                
                return (
                  <div key={entry?.id || index} style={{ display: 'flex', alignItems: 'center', background: isMe ? 'linear-gradient(90deg, #f59e0b20, #0f172a)' : '#0f172a', border: isMe ? '1px solid #f59e0b50' : '1px solid #334155', padding: '12px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', width: '35px', color: rankColor, textAlign: 'center' }}>{index + 1}.</div>
                    <div onClick={() => isMe ? setFullscreenData({url: getImageUrl(entry?.drive_file_id, entry?.file_url), title: entry?.user_name || ''}) : null} style={{ width: '55px', height: '55px', backgroundColor: '#000', borderRadius: '10px', overflow: 'hidden', margin: '0 15px', cursor: isMe ? 'zoom-in' : 'default', flexShrink: 0, position: 'relative' }}>
                      <img src={getImageUrl(entry?.drive_file_id, entry?.file_url)} alt="Top" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isMe ? 'none' : 'blur(6px) contrast(120%) saturation(150%)', transform: isMe ? 'none' : 'scale(1.2)' }} onError={handleImageError} />
                      {!isMe && (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '1.5rem', opacity: 0.8 }}>🔒</span>
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: isMe ? '#f8fafc' : '#94a3b8', fontWeight: 'bold', fontStyle: isMe ? 'normal' : 'italic', fontSize: '1.05rem' }}>
                        {isMe ? (entry?.user_name || 'Én') : 'Titkosított ellenfél'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Nézettség: {entry?.views_count || 0}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: isMe ? '#f97316' : '#94a3b8', fontWeight: '900', fontSize: '1.5rem' }}>{entry?.likes_count || 0} ⭐</div>
                    </div>
                  </div>
                );
              }).slice(0, 15)}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
