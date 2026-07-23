import React, { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL } from '../../utils/constants';
import VideoLoader from '../../components/VideoLoader';
import { 
  Users, 
  Search, 
  AlertTriangle, 
  ThumbsDown, 
  ThumbsUp, 
  PieChart, 
  ShieldAlert,
  ArrowRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';

const getAuthHeaders = () => {
  const token = localStorage.getItem('photoAppToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export default function AdminVoterAnalysisView() {
  const [activeTab, setActiveTab] = useState<'VOTERS' | 'MATRIX'>('VOTERS');
  const [loading, setLoading] = useState(true);
  const [voterStats, setVoterStats] = useState<any[]>([]);
  const [biasMatrix, setBiasMatrix] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [matrixFilter, setBiasFilter] = useState<'ALL' | 'ALWAYS_PASS' | 'ALWAYS_LIKE'>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, matrixRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/admin/weekly/voter-stats`, { headers: getAuthHeaders() }),
        fetch(`${BACKEND_URL}/api/admin/weekly/voter-bias-matrix`, { headers: getAuthHeaders() })
      ]);

      if (statsRes.ok) setVoterStats(await statsRes.json());
      if (matrixRes.ok) setBiasMatrix(await matrixRes.json());
    } catch (e) {
      console.error("Hiba a szavazati adatok betöltésekor:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Szűrt szavazói lista
  const filteredVoters = useMemo(() => {
    if (!searchTerm.trim()) return voterStats;
    const term = searchTerm.toLowerCase();
    return voterStats.filter(v => 
      v.voter_name?.toLowerCase().includes(term) || 
      v.voter_email?.toLowerCase().includes(term) ||
      v.club_name?.toLowerCase().includes(term)
    );
  }, [voterStats, searchTerm]);

  // Szűrt kapcsolat mátrix (Mindig lepontozza / Mindig felpontozza)
  const filteredMatrix = useMemo(() => {
    let list = biasMatrix;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(m => 
        m.voter_name?.toLowerCase().includes(term) || 
        m.voter_email?.toLowerCase().includes(term) ||
        m.author_name?.toLowerCase().includes(term) ||
        m.author_email?.toLowerCase().includes(term)
      );
    }

    if (matrixFilter === 'ALWAYS_PASS') {
      return list.filter(m => Number(m.pass_rate_percent) === 100);
    }
    if (matrixFilter === 'ALWAYS_LIKE') {
      return list.filter(m => Number(m.pass_rate_percent) === 0);
    }

    return list;
  }, [biasMatrix, searchTerm, matrixFilter]);

  if (loading) return <VideoLoader />;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', color: 'var(--text-title)' }}>
      
      {/* FEJLÉC */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-main)', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={28} /> Szavazói Viselkedés & Anomália Analitika
          </h2>
          <small style={{ color: 'var(--text-muted)' }}>Exkluzív admin felület a lepontozási és felpontozási mintázatok kiszűrésére</small>
        </div>

        <button onClick={loadData} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-main)', color: 'var(--text-title)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} /> Adatok frissítése
        </button>
      </div>

      {/* FÜLEK ÉS KERESŐSÁV */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '10px', background: 'var(--bg-card)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-main)' }}>
          <button 
            onClick={() => setActiveTab('VOTERS')}
            style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: activeTab === 'VOTERS' ? '#ef4444' : 'transparent', color: activeTab === 'VOTERS' ? 'white' : 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Users size={16} /> Szavazók Általános Szigorúsága
          </button>
          <button 
            onClick={() => setActiveTab('MATRIX')}
            style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: activeTab === 'MATRIX' ? '#ef4444' : 'transparent', color: activeTab === 'MATRIX' ? 'white' : 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <AlertTriangle size={16} /> Célzott Párhuzamok & Célpontok
          </button>
        </div>

        <div style={{ position: 'relative', minWidth: '280px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="🔍 Keresés névre vagy emailre..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-title)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1. TAB: SZAVAZÓK ÁLTALÁNOS SZIGORÚSÁGA */}
      {/* ==================================================================== */}
      {activeTab === 'VOTERS' && (
        <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-main)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-main)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '14px' }}>Szavazó Fotós</th>
                <th style={{ padding: '14px', textAlign: 'center' }}>Összes Szavazat</th>
                <th style={{ padding: '14px', textAlign: 'center' }}>PASS (Lepontozás)</th>
                <th style={{ padding: '14px', textAlign: 'center' }}>Szuper / Ragyogó / Mester</th>
                <th style={{ padding: '14px', textAlign: 'center' }}>PASS Arány %</th>
              </tr>
            </thead>
            <tbody>
              {filteredVoters.map((v, i) => {
                const passRatio = Number(v.pass_ratio_percent || 0);
                let badgeColor = '#10b981'; // Normális / Pozitív
                if (passRatio > 60) badgeColor = '#f59e0b'; // Szigorú
                if (passRatio > 80) badgeColor = '#ef4444'; // Extrém lepontozó!

                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-main)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--text-title)' }}>{v.voter_name}</div>
                      <small style={{ color: 'var(--text-muted)' }}>{v.voter_email}</small>
                      {v.club_name && <div style={{ fontSize: '0.75rem', color: '#10b981' }}>{v.club_name}</div>}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 'bold' }}>{v.total_votes_cast} db</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#ef4444', fontWeight: 'bold' }}>{v.pass_count} db</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#38bdf8', fontWeight: 'bold' }}>
                      {Number(v.super_count || 0) + Number(v.brilliant_count || 0) + Number(v.master_count || 0)} db
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{ background: `${badgeColor}20`, color: badgeColor, border: `1px solid ${badgeColor}50`, padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.82rem' }}>
                        {passRatio.toFixed(1)}% PASS
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. TAB: CÉLZOTT PÁRHUZAMOK (KI KIT PONTOZ LE / FEL RENDSZERESEN) */}
      {/* ==================================================================== */}
      {activeTab === 'MATRIX' && (
        <div>
          {/* Mátrix Szűrőgombok */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button 
              onClick={() => setBiasFilter('ALL')}
              style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--border-main)', background: matrixFilter === 'ALL' ? 'var(--bg-card)' : 'transparent', color: 'var(--text-title)', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Összes kapcsolat ({biasMatrix.length})
            </button>
            <button 
              onClick={() => setBiasFilter('ALWAYS_PASS')}
              style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #ef4444', background: matrixFilter === 'ALWAYS_PASS' ? 'rgba(239,68,68,0.15)' : 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ThumbsDown size={14} /> Csak a 100% Lepontozások
            </button>
            <button 
              onClick={() => setBiasFilter('ALWAYS_LIKE')}
              style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #10b981', background: matrixFilter === 'ALWAYS_LIKE' ? 'rgba(16,185,129,0.15)' : 'transparent', color: '#10b981', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ThumbsUp size={14} /> Csak a 100% Felpontozások
            </button>
          </div>

          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-main)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-main)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px' }}>Szavazó (Aki a pontot adta)</th>
                  <th style={{ padding: '14px', textAlign: 'center' }}>Irány</th>
                  <th style={{ padding: '14px' }}>Kép Alkutója (Aki a pontot kapta)</th>
                  <th style={{ padding: '14px', textAlign: 'center' }}>Összes Találkozás</th>
                  <th style={{ padding: '14px', textAlign: 'center' }}>Lepontozás (PASS)</th>
                  <th style={{ padding: '14px', textAlign: 'center' }}>Gyűjtött Minta</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatrix.map((m, i) => {
                  const passRatio = Number(m.pass_rate_percent || 0);
                  const is100Pass = passRatio === 100;
                  const is100Positive = passRatio === 0;

                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-main)', background: is100Pass ? 'rgba(239,68,68,0.03)' : is100Positive ? 'rgba(16,185,129,0.03)' : 'transparent' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-title)' }}>{m.voter_name}</div>
                        <small style={{ color: 'var(--text-muted)' }}>{m.voter_email}</small>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <ArrowRight size={16} />
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-title)' }}>{m.author_name}</div>
                        <small style={{ color: 'var(--text-muted)' }}>{m.author_email}</small>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 'bold' }}>
                        {m.total_interactions} alkalom
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <b style={{ color: passRatio > 50 ? '#ef4444' : '#10b981' }}>{m.pass_count} PASS</b> / {m.positive_count} Pozitív
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {is100Pass && (
                          <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <ThumbsDown size={12} /> 100% Lepontozó!
                          </span>
                        )}
                        {is100Positive && (
                          <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <ThumbsUp size={12} /> 100% Felpontozó!
                          </span>
                        )}
                        {!is100Pass && !is100Positive && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Vegyes szavazatok</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
