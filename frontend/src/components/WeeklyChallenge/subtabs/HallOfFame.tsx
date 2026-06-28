import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';

interface HallOfFameUser {
  user_name: string;
  user_email: string;
  club_name: string | null;
  avatar_url: string | null;
  total_likes: number;
  first_places: number;
  podiums: number;
}

interface StatHistoryItem {
  topic_title: string;
  start_date: string;
  end_date: string;
  rank: number;
  total_entries: number;
  file_url: string;
  likes: number;
  views: number;
}

interface PlayerStats {
  podiums: { first: number; second: number; third: number };
  history: StatHistoryItem[];
}

export default function HallOfFame() {
  const { t, lang } = useLanguage();
  const [users, setUsers] = useState<HallOfFameUser[]>([]);
  const [loading, setLoading] = useState(true);

  // 🎯 ÚJ STATE-EK A JÁTÉKOS STATISZTIKA MODALHOZ
  const [selectedUser, setSelectedUser] = useState<HallOfFameUser | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    fetchHallOfFame();
  }, []);

  const fetchHallOfFame = async () => {
    try {
      const res = await axios.get('/api/weekly/hall-of-fame');
      setUsers(res.data);
    } catch (err) {
      console.error('Hiba a dicsőségfal betöltésekor:', err);
    } finally {
      setLoading(false);
    }
  };

  // 🎯 ÚJ: Játékosra kattintáskor meghívódó statisztika-lekérő függvény
  const handleUserClick = async (user: HallOfFameUser) => {
    setSelectedUser(user);
    setModalOpen(true);
    setStatsLoading(true);
    setPlayerStats(null);
    try {
      // Dinamikusan a kiválasztott játékos e-mail címét küldjük el a meglévő statisztikai API-nak!
      const res = await axios.get(`/api/weekly/my-stats?userEmail=${encodeURIComponent(user.user_email)}`);
      setPlayerStats(res.data);
    } catch (err) {
      console.error('Hiba a játékos részletes statisztikáinak lekérésekor:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px] text-slate-400">
        <div className="animate-spin rounded-full h-8 w-4 text-sky-500 mr-2 border-b-2 border-sky-500"></div>
        {lang === 'en' ? 'Loading Legends...' : 'Dicsőségcsarnok betöltése...'}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto text-slate-100">
      <h2 className="text-2xl font-bold text-slate-100 mb-2 flex items-center gap-2">
        🏆 {lang === 'en' ? 'Hall of Fame' : 'Dicsőségcsarnok'}
      </h2>
      <p className="text-slate-400 text-sm mb-6">
        {lang === 'en' ? 'Click on any player to view their detailed trophy room and past challenge results.' : 'Kattints bármelyik játékosra a részletes trófeatermének és korábbi csaták eredményeinek megtekintéséhez.'}
      </p>

      {/* RANGSOR LISTA */}
      <div className="flex flex-col gap-3">
        {users.map((user, index) => (
          <div
            key={user.user_email}
            onClick={() => handleUserClick(user)}
            className="flex items-center justify-between p-4 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-2xl cursor-pointer transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              {/* Helyezés száma */}
              <div className="w-8 text-center font-black text-lg text-slate-500 group-hover:text-sky-400 transition-colors">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
              </div>

              {/* Avatar / Profilkép */}
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shadow-inner">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.user_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-slate-500">{user.user_name[0].toUpperCase()}</span>
                )}
              </div>

              {/* Név és Klub */}
              <div>
                <div className="font-bold text-slate-200 group-hover:text-white transition-colors">{user.user_name}</div>
                <div className="text-xs text-slate-500">{user.club_name || (lang === 'en' ? 'No Club' : 'Nincs klubja')}</div>
              </div>
            </div>

            {/* Összesített Pontszámok és Plecsnik gyorsnézete */}
            <div className="flex items-center gap-6">
              <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-800/50">
                <span>🥇 {user.first_places}</span>
                <span>⭐ {user.podiums}</span>
              </div>
              <div className="text-right">
                <span className="text-sky-400 font-black text-lg">{Number(user.total_likes).toFixed(1)}</span>
                <span className="text-xs text-slate-500 font-bold ml-1">FP</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ==================================================================== */}
      // 🎯 ÚJ: DINAMIKUS JÁTÉKOS TRÓFEATEREM MODAL (POPUP)
      {/* ==================================================================== */}
      {modalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex justify-center items-center p-4 box-border animate-fade-in">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 relative shadow-2xl">
            
            {/* Bezáró gomb */}
            <button 
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 bg-slate-900 text-slate-400 hover:text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors border border-slate-800"
            >
              ✖
            </button>

            {/* Modal Fejléc: Profil adatai */}
            <div className="flex items-center gap-4 border-b border-slate-800 pb-5 mb-5">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center">
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt={selectedUser.user_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-slate-500">{selectedUser.user_name[0].toUpperCase()}</span>
                )}
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{selectedUser.user_name}</h3>
                <p className="text-xs text-sky-400 font-medium">{selectedUser.club_name || (lang === 'en' ? 'Independent Photographer' : 'Független fotós')}</p>
                <p className="text-[10px] text-slate-500 select-all mt-0.5">{selectedUser.user_email}</p>
              </div>
            </div>

            {/* Modal Törzs: Töltés vagy Adatok kirajzolása */}
            {statsLoading ? (
              <div className="flex flex-col justify-center items-center py-12 text-slate-400 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-b-transparent"></div>
                <div className="text-sm font-medium">{lang === 'en' ? 'Opening Trophy Room...' : 'Trófeaterem berendezése...'}</div>
              </div>
            ) : playerStats ? (
              <div className="flex flex-col gap-6">
                
                {/* 1. Trófeák (Podiums) Szekció */}
                <div className="grid grid-cols-3 gap-3 bg-slate-900/40 p-4 rounded-2xl border border-slate-900 text-center">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-amber-500/10">
                    <div className="text-2xl mb-1">🥇</div>
                    <div className="text-xs font-bold text-slate-400">{lang === 'en' ? '1st Places' : 'Arany'}</div>
                    <div className="text-xl font-black text-amber-400 mt-0.5">{playerStats.podiums.first}</div>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-400/10">
                    <div className="text-2xl mb-1">🥈</div>
                    <div className="text-xs font-bold text-slate-400">{lang === 'en' ? '2nd Places' : 'Ezüst'}</div>
                    <div className="text-xl font-black text-slate-300 mt-0.5">{playerStats.podiums.second}</div>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-amber-700/10">
                    <div className="text-2xl mb-1">🥉</div>
                    <div className="text-xs font-bold text-slate-400">{lang === 'en' ? '3rd Places' : 'Bronz'}</div>
                    <div className="text-xl font-black text-amber-600 mt-0.5">{playerStats.podiums.third}</div>
                  </div>
                </div>

                {/* 2. Történelem / Képek listája */}
                <div>
                  <h4 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-1.5">
                    📷 {lang === 'en' ? 'Battle History' : 'Csaták krónikája'} ({playerStats.history.length})
                  </h4>
                  
                  {playerStats.history.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6 bg-slate-900/20 rounded-xl border border-dashed border-slate-800">
                      {lang === 'en' ? 'No finalized battle data available.' : 'Még nincs lezárt csatája ebben a ligában.'}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto pr-1">
                      {playerStats.history.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-xl gap-3">
                          <div className="flex items-center gap-3">
                            {/* Csata képe */}
                            <div className="w-12 h-12 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex-shrink-0 shadow">
                              <img src={item.file_url} alt={item.topic_title} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                            </div>
                            {/* Kihívás neve és helyezés */}
                            <div>
                              <div className="text-xs font-bold text-slate-200 line-clamp-1">{item.topic_title}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                                <span>{lang === 'en' ? 'Rank:' : 'Helyezés:'} <b className={item.rank === 1 ? 'text-amber-400' : item.rank <= 3 ? 'text-slate-300' : 'text-slate-400'}>#{item.rank}</b> / {item.total_entries}</span>
                                <span>•</span>
                                <span>👁️ {item.views}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Elért Fair Score pontszám */}
                          <div className="text-right flex-shrink-0 bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800/60">
                            <span className="text-sky-400 font-extrabold text-sm">{Number(item.likes).toFixed(2)}</span>
                            <span className="text-[9px] text-slate-500 font-bold ml-0.5">FP</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <p className="text-center text-xs text-slate-500 py-6">
                {lang === 'en' ? 'Failed to load stats.' : 'Nem sikerült betölteni az adatokat.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
