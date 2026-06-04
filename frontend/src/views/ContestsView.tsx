import { useState, useEffect } from 'react';
import { ADMIN_EMAIL, BACKEND_URL } from '../utils/constants';
import { getImageUrl } from '../utils/helpers';
import jsPDF from 'jspdf';

interface ContestsViewProps {
  activeTab: string;
  user: any;
  currentDbUser: any;
  isLeader: boolean;
  clubs: any[];
  allUsers: any[];
  filteredContests: any[];
  myEntries: any[];
  juryList: any[];
  myJudgedContests: any[];
  
  // New contest form
  newTitle: string; setNewTitle: (v: string) => void;
  newDesc: string; setNewDesc: (v: string) => void;
  newStart: string; setNewStart: (v: string) => void;
  newEnd: string; setNewEnd: (v: string) => void;
  newCats: string; setNewCats: (v: string) => void;
  newRestrictedClub: string; setNewRestrictedClub: (v: string) => void;
  newEntryFee: number | string; setNewEntryFee: (v: number | string) => void; 
  newFeeCurrency: string; setNewFeeCurrency: (v: string) => void; 
  newCategorySettings: Record<string, any>; setNewCategorySettings: (v: Record<string, any>) => void;
  handleCreateContest: () => void;
  newSponsorClub: string; setNewSponsorClub: (v: string) => void;
  
  // Edit contest form
  editContestId: number | null; setEditContestId: (v: number | null) => void;
  editTitle: string; setEditTitle: (v: string) => void;
  editDesc: string; setEditDesc: (v: string) => void;
  editStart: string; setEditStart: (v: string) => void;
  editEnd: string; setEditEnd: (v: string) => void;
  editCats: string; setEditCats: (v: string) => void;
  editRestrictedClub: string; setEditRestrictedClub: (v: string) => void;
  editEntryFee: number | string; setEditEntryFee: (v: number | string) => void; 
  editFeeCurrency: string; setEditFeeCurrency: (v: string) => void; 
  editCategorySettings: Record<string, any>; setEditCategorySettings: (v: Record<string, any>) => void;
  startEdit: (c: any) => void;
  handleUpdateContest: () => void;
  handleDeleteContest: (id: number) => void;
  editSponsorClub: string; setEditSponsorClub: (v: string) => void;

  // Stats & Progress
  viewStatsContestId: number | null; setViewStatsContestId: (v: number | null) => void;
  contestStats: any[]; loadStats: (id: number) => void;
  viewJuryProgressId: number | null; setViewJuryProgressId: (v: number | null) => void;
  juryProgressData: any; loadJuryProgress: (id: number) => void;

  // Jury config
  manageJuryContestId: number | null; setManageJuryContestId: (v: number | null) => void;
  selectedJuryEmail: string; setSelectedJuryEmail: (v: string) => void;
  handleAddJury: (id: number) => void;
  handleRemoveJury: (id: number, email: string) => void;

  // Results
  viewResultsContestId: number | null; setViewResultsContestId: (v: number | null) => void;
  contestResults: any[]; loadResults: (id: number) => void;

  // Uploading
  activeUploadContest: number | null; setActiveUploadContest: (v: number | null) => void;
  uploadTitle: string; setUploadTitle: (v: string) => void;
  uploadCategory: string; setUploadCategory: (v: string) => void;
  uploadPreview: string | null; setUploadPreview: (v: string | null) => void;
  isUploading: boolean;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpload: (id: number) => void;

  // Judging
  judgingContestId: number | null; setJudgingContestId: (v: number | null) => void;
  unvotedEntries: any[];
  currentScore: number | ''; setCurrentScore: (v: number | '') => void;
  startJudging: (id: number) => void;
  submitVote: () => void;

  // Entry Management
  editingEntryId: number | null; setEditingEntryId: (v: number | null) => void;
  editEntryTitle: string; setEditEntryTitle: (v: string) => void;
  handleUpdateEntryTitle: (id: number) => void;
  handleDeleteEntry: (id: number) => void;

  setFullscreenData: (data: {url: string, title?: string} | null) => void;

  // Fizetések
  contestPayments: any[];
  handlePayContestFee: (contestId: number) => void;
}

export default function ContestsView(props: ContestsViewProps) {
  const inputStyle = { width: '100%', padding: '12px', marginBottom: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '10px', boxSizing: 'border-box' as const, fontSize: '0.95rem', outline: 'none' };

  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [generatingCertId, setGeneratingCertId] = useState<number | null>(null);

  useEffect(() => {
    setIsSubmittingVote(false);
  }, [props.unvotedEntries, props.currentScore]);

  const currentNewClubValue = props.clubs.find(c => String(c.id) === props.newRestrictedClub || c.name === props.newRestrictedClub)?.id || '';
  const currentEditClubValue = props.clubs.find(c => String(c.id) === props.editRestrictedClub || c.name === props.editRestrictedClub)?.id || '';

  // ====================================================================
  // 📜 JAVÍTVA: OKLEVÉL GENERÁLÓ LOGIKA NYERS BASE64 STRINGLEKÉRÉSSEL
  // ====================================================================
  const generateCertificate = async (contest: any, result: any, awardName: string, isAcceptance: boolean, contestJury: any[]) => {
    setGeneratingCertId(result.id);
    try {
      // 1. Alkotás képének letöltése
      const res = await fetch(`${BACKEND_URL}/api/image-base64/${result.drive_file_id}`);
      const data = await res.json();
      if (!data.base64) throw new Error("Hiba a kép letöltésekor");

      // 2. JAVÍTVA: Szponzor klub logó letöltése közvetlen base64 stringként (mint a fő képnél)
      let sponsorLogoBase64: string | null = null;
      const sponsorClubObj = props.clubs.find(c => Number(c.id) === Number(contest.sponsor_club_id));
      
      if (sponsorClubObj && sponsorClubObj.drive_logo_id) {
        try {
          const logoRes = await fetch(`${BACKEND_URL}/api/image-base64/${sponsorClubObj.drive_logo_id}`);
          const logoData = await logoRes.json();
          if (logoData.base64) {
            sponsorLogoBase64 = logoData.base64;
          }
        } catch (e) { 
          console.error("Nem sikerült letölteni a klublogót a PDF-hez", e); 
        }
      }

      const img = new Image();
      img.src = data.base64;
      await new Promise((resolve) => { img.onload = resolve; });

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      const fixHu = (str: string) => {
        if (!str) return '';
        return str.replace(/ő/g, 'ö').replace(/ű/g, 'ü').replace(/Ő/g, 'Ö').replace(/Ű/g, 'Ü');
      };

      // Díszkeret rajzolása
      doc.setDrawColor(217, 119, 6); 
      doc.setLineWidth(2);
      doc.rect(10, 10, 277, 190);
      doc.setLineWidth(0.5);
      doc.rect(12, 12, 273, 186);

      // JAVÍTVA: Nyers base64 stringként adjuk át a logót, így a jsPDF transzparensen és hibátlanul rendereli
      if (sponsorLogoBase64) {
        doc.addImage(sponsorLogoBase64, 'PNG', 252, 15, 22, 22);
      }

      doc.setFont("times", "bolditalic");
      doc.setFontSize(40);
      doc.setTextColor(30, 41, 59); 
      doc.text(fixHu("OKLEVÉL"), 148.5, 35, { align: "center" });

      doc.setFont("times", "normal");
      doc.setFontSize(22);
      doc.text(fixHu(contest.title), 148.5, 48, { align: "center" });

      doc.setFont("times", "bold");
      doc.setFontSize(16);
      doc.setTextColor(217, 119, 6);
      const awardText = awardName ? `Díj: ${awardName}` : 'Eredmény: Elfogadás (Acceptance)';
      doc.text(fixHu(awardText), 148.5, 60, { align: "center" });

      doc.setFont("times", "italic");
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(14);
      doc.text(fixHu(`Kategória: ${result.category}`), 148.5, 68, { align: "center" });

      const maxW = 160;
      const maxH = 90;
      let imgW = img.width;
      let imgH = img.height;
      const ratio = Math.min(maxW / imgW, maxH / imgH);
      imgW = imgW * ratio;
      imgH = imgH * ratio;
      const imgX = (297 - imgW) / 2;
      const imgY = 75;

      doc.addImage(data.base64, 'JPEG', imgX, imgY, imgW, imgH);

      doc.setFont("times", "bold");
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text(fixHu(`"${result.title}"`), 148.5, imgY + imgH + 12, { align: "center" });

      doc.setFont("times", "normal");
      doc.setFontSize(14);
      doc.text(fixHu(`Készítette: ${result.user_name}`), 148.5, imgY + imgH + 20, { align: "center" });

      // DÁTUM (KELT) GENERÁLÁSA A BAL ALSÓ SAROKBA
      doc.setFont("times", "normal");
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      const todayStr = new Date().toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.text(fixHu(`Kelt: ${todayStr}`), 20, 192);

      const juryNames = contestJury.map(j => props.allUsers.find(u => u.email === j.user_email)?.name || j.user_email).join(', ');
      doc.setFont("times", "italic");
      doc.setFontSize(12);
      doc.setTextColor(148, 163, 184);
      doc.text(fixHu(`A zsűri tagjai: ${juryNames}`), 148.5, 192, { align: "center" });

      const safeFileName = `Oklevel_${result.user_name}_${result.title}`.replace(/[^a-zA-Z0-9_áéíóúöüÁÉÍÓÚÖÜ]/g, '_');
      doc.save(`${safeFileName}.pdf`);
      
    } catch (err) {
      alert('Sajnos hiba történt az oklevél generálása közben.');
      console.error(err);
    } finally { 
      setGeneratingCertId(null);
    }
  };

  if (props.activeTab === 'contests_club_active' && !props.currentDbUser?.club_name) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'linear-gradient(180deg, #1e293b, #0f172a)', borderRadius: '24px', border: '1px solid #ef444440', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🔒</div>
        <h2 style={{ color: '#ef4444', margin: '0 0 12px 0', fontSize: '1.8rem' }}>Nem vagy klubhoz rendelve</h2>
        <p style={{ color: '#94a3b8', fontSize: '1.05rem', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
          A belső klubpályázatok eléréséhez kérjük, először válassz egy fotóklubot a <b>Profilom</b> oldalon!
        </p>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* PÁLYÁZAT KIÍRÁSA PANEL */}
      {((props.activeTab === 'admin_contests' && props.user.email === ADMIN_EMAIL) || 
        (props.activeTab === 'contests_club_active' && props.isLeader)) && (
        
        <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '24px', marginBottom: '30px', border: '1px solid #f59e0b', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#f59e0b', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {props.user.email === ADMIN_EMAIL ? '⚙️ Globális Pályázat Kiírása (Admin)' : `📝 Új Belső Pályázat Indítása (${props.currentDbUser?.club_name})`}
          </h3>
          <input placeholder="Pályázat címe" value={props.newTitle} onChange={e => props.setNewTitle(e.target.value)} style={inputStyle} />
          <textarea placeholder="Pályázati kiírás, részletes szabályzat..." value={props.newDesc} onChange={e => props.setNewDesc(e.target.value)} style={{...inputStyle, minHeight: '80px', resize: 'vertical'}} />
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '5px' }}>
            <div>
              <label style={{fontSize:'0.8rem', color:'#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '6px'}}>⏱️ Pályázat Kezdete</label>
              <input type="datetime-local" value={props.newStart} onChange={e => props.setNewStart(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:'0.8rem', color:'#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '6px'}}>⌛ Nevezési Határidő</label>
              <input type="datetime-local" value={props.newEnd} onChange={e => props.setNewEnd(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '5px' }}>
            <div>
              <label style={{fontSize:'0.8rem', color:'#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '6px'}}>🪙 Nevezési díj (0 = Ingyenes)</label>
              <input type="number" min="0" value={props.newEntryFee} onChange={e => props.setNewEntryFee(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:'0.8rem', color:'#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '6px'}}>💵 Pénznem</label>
              <select value={props.newFeeCurrency} onChange={e => props.setNewFeeCurrency(e.target.value)} style={inputStyle}>
                <option value="HUF">HUF (Forint)</option>
                <option value="EUR">EUR (Euró)</option>
              </select>
            </div>
          </div>

          <input placeholder="Kategóriák (pl: Természet, Portré, Street) - vesszővel elválasztva" value={props.newCats} onChange={e => props.setNewCats(e.target.value)} style={inputStyle} />
          
          {props.newCats.split(',').map(c => c.trim()).filter(Boolean).length > 0 && (
            <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', marginBottom: '20px', border: '1px solid #334155' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#38bdf8', fontSize: '1.1rem' }}>⚙️ Kategória Ponthatárok & Díjak</h4>
              {props.newCats.split(',').map(c => c.trim()).filter(Boolean).map(cat => (
                <div key={cat} style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px dashed #1e293b' }}>
                  <strong style={{ color: '#f8fafc', display: 'block', marginBottom: '10px', fontSize: '0.95rem' }}>✨ {cat} kategória:</strong>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <div>
                      <label style={{fontSize:'0.75rem', color:'#94a3b8'}}>Elfogadási ponthatár</label>
                      <input 
                        type="number" 
                        placeholder="Pl.: 24" 
                        value={props.newCategorySettings[cat]?.acceptanceScore || ''} 
                        onChange={e => props.newCategorySettings[cat] ? props.setNewCategorySettings({...props.newCategorySettings, [cat]: { ...props.newCategorySettings[cat], acceptanceScore: e.target.value ? Number(e.target.value) : '' }}) : props.setNewCategorySettings({...props.newCategorySettings, [cat]: { acceptanceScore: e.target.value ? Number(e.target.value) : '' }})}
                        style={{...inputStyle, marginBottom: 0, marginTop: '5px'}} 
                      />
                    </div>
                    <div>
                      <label style={{fontSize:'0.75rem', color:'#94a3b8'}}>Díjak (1., 2., 3. hely - vesszővel elválasztva)</label>
                      <input 
                        type="text" 
                        placeholder="Pl: Arany Oklevél, Ezüst, Bronz" 
                        value={props.newCategorySettings[cat]?.awardsString || ''} 
                        onChange={e => props.newCategorySettings[cat] ? props.setNewCategorySettings({...props.newCategorySettings, [cat]: { ...props.newCategorySettings[cat], awardsString: e.target.value }}) : props.setNewCategorySettings({...props.newCategorySettings, [cat]: { awardsString: e.target.value }})}
                        style={{...inputStyle, marginBottom: 0, marginTop: '5px'}} 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '15px' }}>
            <div>
              <label style={{fontSize:'0.8rem', color:'#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '6px'}}>🔒 Pályázat Láthatósága / Elérése</label>
              {props.user.email === ADMIN_EMAIL ? (
                <select 
                  value={String(currentNewClubValue)} 
                  onChange={e => props.setNewRestrictedClub(e.target.value)} 
                  style={{...inputStyle, border: '1px solid #f59e0b', cursor: 'pointer', marginBottom: 0}}
                >
                  <option value="">🔓 Nyilvános pályázat (Bárki nevezhet)</option>
                  {props.clubs.map(c => <option key={c.id} value={String(c.id)}>🔒 Zártkörű: {c.name}</option>)}
                </select>
              ) : (
                <div style={{ padding: '12px', background: '#0f172a', borderRadius: '10px', color: '#cbd5e1', fontSize: '0.95rem', border: '1px solid #334155' }}>
                  Zártkörű: <strong>{props.currentDbUser?.club_name}</strong>
                </div>
              )}
            </div>

            <div>
              <label style={{fontSize:'0.8rem', color:'#a78bfa', fontWeight: 'bold', display: 'block', marginBottom: '6px'}}>🏆 Szponzoráló Fotóklub (Oklevél logóhoz)</label>
              <select 
                value={props.newSponsorClub} 
                onChange={e => props.setNewSponsorClub(e.target.value)} 
                style={{...inputStyle, border: '1px solid #a78bfa', cursor: 'pointer', marginBottom: 0}}
              >
                <option value="">-- Nincs kiemelt szponzor klub --</option>
                {props.clubs.map(c => <option key={c.id} value={String(c.id)}>🛡️ {c.name}</option>)}
              </select>
            </div>
          </div>
          
          <button onClick={props.handleCreateContest} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.3s', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>Pályázat Kiírása 🚀</button>
        </div>
      )}

      {/* CÍMSOR */}
      <h2 style={{ fontSize: '2rem', marginBottom: '20px', color: '#f8fafc', fontWeight: '900', letterSpacing: '-0.5px' }}>
        {props.activeTab === 'admin_contests' ? '📁 Összes Pályázat Kezelése' : props.activeTab === 'contests_club_active' ? `🛡️ Klubom Aktív Pályázatai` : props.activeTab === 'contests_closed' ? '📜 Lezárult Fotópályázatok' : '🌐 Nyílt Aktív Fotópályázatok'}
      </h2>
      
      {/* PÁLYÁZATOK LISTÁJA */}
      {props.filteredContests.length === 0 ? (
        <div style={{ color: '#94a3b8', background: '#1e293b', padding: '30px', borderRadius: '16px', textAlign: 'center', border: '1px solid #334155' }}>Jelenleg nincsenek pályázatok ebben a kategóriában.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {props.filteredContests.map(contest => {
            const now = new Date();
            const start = contest.start_date ? new Date(contest.start_date) : new Date(0);
            const end = contest.end_date ? new Date(contest.end_date) : new Date(0);
            
            const isStarted = now >= start;
            const isEnded = now > end && start.getFullYear() > 1970;
            const isActive = isStarted && !isEnded;
            
            const categories = contest.categories ? contest.categories.split(',').map((c:string) => c.trim()).filter(Boolean) : [];
            const contestJury = props.juryList.filter(j => j.contest_id === contest.id);
            const isUserJury = contestJury.some(j => j.user_email === props.user.email);

            const myContestEntries = props.myEntries.filter(e => e.contest_id === contest.id);
            const categoryCounts: Record<string, number> = {};
            categories.forEach((cat: string) => categoryCounts[cat] = 0);
            myContestEntries.forEach(entry => { if (categoryCounts[entry.category] !== undefined) categoryCounts[entry.category]++; });

            const canManageContest = props.user.email === ADMIN_EMAIL || (props.isLeader && contest.restricted_club === props.currentDbUser?.club_name);
            const expectedVotes = (contest.entry_count || 0) * (contest.jury_count || 0);
            const isJudgingComplete = contest.entry_count > 0 ? (expectedVotes > 0 && contest.vote_count >= expectedVotes) : true;
            
            const badgeText = isActive ? 'Nevezés Nyitva' : isEnded ? (isJudgingComplete ? 'Lezárult' : 'Zsűrizés folyamatban') : 'Hamarosan indul';
            const badgeColor = isActive ? '#10b981' : isEnded ? (isJudgingComplete ? '#ef4444' : '#a78bfa') : '#f59e0b';
            const badgeBg = isActive ? '#10b98120' : isEnded ? (isJudgingComplete ? '#ef444420' : '#a78bfa20') : '#f59e0b20';

            const entryFee = contest.entry_fee || 0;
            const isFeeRequired = entryFee > 0;
            const hasPaid = (props.contestPayments || []).some(p => p.contest_id === contest.id && p.user_email === props.user.email);

            const myJudgeData = props.myJudgedContests?.find(j => j.contest_id === contest.id);
            const isDoneJudging = myJudgeData ? myJudgeData.voted_count >= myJudgeData.judgeable_count : false;

            const sponsorClubObj = props.clubs.find(c => Number(c.id) === Number(contest.sponsor_club_id));

            return (
              <div key={contest.id} style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '24px', border: `1px solid ${badgeColor}40`, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden' }}>
                
                {contest.restricted_club && (
                  <div style={{ position: 'absolute', top: 0, left: '25px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#0f172a', padding: '5px 14px', borderRadius: '0 0 10px 10px', fontSize: '0.75rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', letterSpacing: '0.5px' }}>
                    🔒 ZÁRTKÖRŰ: {contest.restricted_club}
                  </div>
                )}

                {/* ALSZEKCIÓK INTERFÉSZ */}
                {props.viewJuryProgressId === contest.id ? (
                  <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', marginBottom: '20px', border: '1px solid #a78bfa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0, color: '#a78bfa', fontSize: '1.2rem' }}>📈 Értékelési Folyamat állása</h3>
                      <button onClick={() => props.setViewJuryProgressId(null)} style={{ background: '#1e293b', color: '#94a3b8', border: 'none', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Bezárás</button>
                    </div>
                    <div style={{ marginBottom: '20px', color: '#94a3b8' }}>
                      Összes beérkezett pályamű: <strong style={{color: '#f8fafc'}}>{props.juryProgressData.total_entries} fotó</strong>
                    </div>
                    {props.juryProgressData.stats.length === 0 ? (
                      <p style={{ color: '#94a3b8', margin: 0 }}>Nincs hozzárendelve zsűritag.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {props.juryProgressData.stats.map((stat: any) => {
                          const userObj = props.allUsers.find(u => u.email === stat.user_email);
                          const name = userObj ? userObj.name : stat.user_email;
                          const remaining = props.juryProgressData.total_entries - stat.voted_count;
                          const percent = props.juryProgressData.total_entries > 0 ? Math.round((stat.voted_count / props.juryProgressData.total_entries) * 100) : 0;
                          
                          return (
                            <div key={stat.user_email} style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                                <strong style={{ color: '#f8fafc' }}>{name}</strong>
                                <span style={{ color: remaining <= 0 ? '#10b981' : '#f59e0b', fontWeight: 'bold', fontSize: '0.85rem', background: remaining <= 0 ? '#10b98115' : '#f59e0b15', padding: '2px 8px', borderRadius: '6px' }}>
                                  {remaining <= 0 ? '✓ Kész' : `${remaining} kép van hátra`}
                                </span>
                              </div>
                              <div style={{ width: '100%', background: '#0f172a', borderRadius: '100px', height: '8px', overflow: 'hidden' }}>
                                <div style={{ width: `${percent}%`, background: remaining <= 0 ? '#10b981' : 'linear-gradient(90deg, #a78bfa, #8b5cf6)', height: '100%' }}></div>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px', textAlign: 'right' }}>
                                {stat.voted_count} / {props.juryProgressData.total_entries} fotó pontozva ({percent}%)
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : props.manageJuryContestId === contest.id ? (
                    <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #8b5cf640' }}>
                      <h4 style={{marginTop: 0, color: '#a78bfa', fontSize: '1.2rem', marginBottom: '15px'}}>⚖️ Bírálóbizottság Összeállítása</h4>
                      <div style={{display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap'}}>
                        <select value={props.selectedJuryEmail} onChange={e => props.setSelectedJuryEmail(e.target.value)} style={{...inputStyle, marginBottom: 0, flex: '1 1 200px'}}>
                          <option value="">-- Válassz tagot a listából --</option>
                          {props.allUsers.filter(u => !contestJury.some(j => j.user_email === u.email)).map(u => (<option key={u.email} value={u.email}>{u.name} ({u.email})</option>))}
                        </select>
                        <button onClick={() => props.handleAddJury(contest.id)} style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Hozzáadás</button>
                      </div>
                      <ul style={{ padding: 0, listStyle: 'none', margin: '0 0 15px 0' }}>
                        {contestJury.map(jury => <li key={jury.user_email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '12px', borderRadius: '10px', marginBottom: '6px', border: '1px solid #334155' }}><span>{props.allUsers.find(u => u.email === jury.user_email)?.name || jury.user_email}</span><button onClick={() => props.handleRemoveJury(contest.id, jury.user_email)} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Eltávolítás ✕</button></li>)}
                      </ul>
                      <button onClick={() => props.setManageJuryContestId(null)} style={{ background: '#334155', color: '#cbd5e1', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Vissza</button>
                    </div>
                ) : props.viewStatsContestId === contest.id ? (
                  <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #38bdf840' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '1.2rem' }}>📊 Aktuális Jelentkezők Nyilvántartása</h3>
                      <button onClick={() => props.setViewStatsContestId(null)} style={{ background: '#1e293b', color: '#94a3b8', border: 'none', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer' }}>Bezárás</button>
                    </div>
                    {props.contestStats.length === 0 ? (
                      <p style={{ color: '#94a3b8', margin: 0 }}>Még nem érkezett hivatalos nevezés.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.entries(props.contestStats.reduce((acc, curr) => {
                          if (!acc[curr.user_email]) acc[curr.user_email] = { name: curr.user_name, cats: [] };
                          acc[curr.user_email].cats.push({ cat: curr.category, count: curr.image_count });
                          return acc;
                        }, {} as Record<string, any>)).map(([email, data]: any) => {
                          const userHasPaid = (props.contestPayments || []).some(p => p.contest_id === contest.id && p.user_email === email);
                          
                          return (
                            <div key={email} style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
                              <div style={{ fontWeight: 'bold', color: '#f8fafc', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <span>{data.name}</span>
                                {isFeeRequired && (
                                  <span style={{ fontSize: '0.8rem', color: userHasPaid ? '#10b981' : '#f59e0b', background: userHasPaid ? '#10b98115' : '#f59e0b15', padding: '4px 10px', borderRadius: '6px', border: `1px solid ${userHasPaid ? '#10b98140' : '#f59e0b40'}`, fontWeight: 'bold' }}>
                                    {userHasPaid ? '✓ Nevezési díj rendezve' : '⏳ Függőben lévő fizetés'}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {data.cats.map((c: any) => (
                                  <span key={c.cat} style={{ background: '#0f172a', color: '#38bdf8', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid #334155' }}>{c.cat}: <strong style={{color: '#f8fafc'}}>{c.count} db fotó</strong></span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : props.editContestId === contest.id ? (
                  <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #f59e0b40' }}>
                    <h4 style={{marginTop: 0, color: '#f59e0b', fontSize: '1.2rem', marginBottom: '15px'}}>Pályázat Paramétereinek Módosítása</h4>
                    <input value={props.editTitle} onChange={e => props.setEditTitle(e.target.value)} style={inputStyle} />
                    <textarea value={props.editDesc} onChange={e => props.setEditDesc(e.target.value)} style={{...inputStyle, minHeight: '70px'}} />
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginBottom: '5px' }}>
                      <div>
                        <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Kezdés</label>
                        <input type="datetime-local" value={props.editStart} onChange={e => props.setEditStart(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Befejezés</label>
                        <input type="datetime-local" value={props.editEnd} onChange={e => props.setEditEnd(e.target.value)} style={inputStyle} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginBottom: '5px' }}>
                      <div>
                        <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Nevezési díj</label>
                        <input type="number" min="0" value={props.editEntryFee} onChange={e => props.setEditEntryFee(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{fontSize:'0.8rem', color:'#94a3b8'}}>Pénznem</label>
                        <select value={props.editFeeCurrency} onChange={e => props.setEditFeeCurrency(e.target.value)} style={inputStyle}>
                          <option value="HUF">HUF</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </div>
                    </div>

                    <input value={props.editCats} onChange={e => props.setEditCats(e.target.value)} style={inputStyle} />
                    
                    {/* Ponthatárok és díjak szerkesztési lehetősége */}
                    {props.editCats.split(',').map(c => c.trim()).filter(Boolean).length > 0 && (
                      <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', marginBottom: '20px', border: '1px solid #334155' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#38bdf8', fontSize: '1.1rem' }}>⚙️ Kategória Ponthatárok & Díjak (Módosítás)</h4>
                        {props.editCats.split(',').map(c => c.trim()).filter(Boolean).map(cat => (
                          <div key={cat} style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px dashed #1e293b' }}>
                            <strong style={{ color: '#f8fafc', display: 'block', marginBottom: '10px', fontSize: '0.95rem' }}>✨ {cat} kategória:</strong>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                              <div>
                                <label style={{fontSize:'0.75rem', color:'#94a3b8'}}>Elfogadási ponthatár</label>
                                <input 
                                  type="number" 
                                  placeholder="Pl.: 24" 
                                  value={props.editCategorySettings[cat]?.acceptanceScore || ''} 
                                  onChange={e => props.editCategorySettings[cat] ? props.setEditCategorySettings({...props.editCategorySettings, [cat]: { ...props.editCategorySettings[cat], acceptanceScore: e.target.value ? Number(e.target.value) : '' }}) : props.setEditCategorySettings({...props.editCategorySettings, [cat]: { acceptanceScore: e.target.value ? Number(e.target.value) : '' }})}
                                  style={{...inputStyle, marginBottom: 0, marginTop: '5px'}} 
                                />
                              </div>
                              <div>
                                <label style={{fontSize:'0.75rem', color:'#94a3b8'}}>Díjak (1., 2., 3. hely - vesszővel elválasztva)</label>
                                <input 
                                  type="text" 
                                  placeholder="Pl: Arany Oklevél, Ezüst, Bronz" 
                                  value={props.editCategorySettings[cat]?.awardsString || ''} 
                                  onChange={e => props.editCategorySettings[cat] ? props.setEditCategorySettings({...props.editCategorySettings, [cat]: { ...props.editCategorySettings[cat], awardsString: e.target.value }}) : props.setEditCategorySettings({...props.editCategorySettings, [cat]: { awardsString: e.target.value }})}
                                  style={{...inputStyle, marginBottom: 0, marginTop: '5px'}} 
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginBottom: '5px' }}>
                      <div>
                        <label style={{fontSize:'0.8rem', color:'#94a3b8', display: 'block', marginBottom: '4px'}}>Pályázat Láthatósága</label>
                        <select 
                          value={String(currentEditClubValue)} 
                          onChange={e => props.setEditRestrictedClub(e.target.value)} 
                          style={{...inputStyle, border: '1px solid #f59e0b', marginBottom: 0}}
                        >
                          <option value="">🔓 Nyilvános pályázat (Bárki nevezhet)</option>
                          {props.clubs.map(c => <option key={c.id} value={String(c.id)}>🔒 Zártkörű: {c.name}</option>)}
                        </select>
                      </div>

                      <div>
                        <label style={{fontSize:'0.8rem', color:'#a78bfa', display: 'block', marginBottom: '4px'}}>Szponzoráló Fotóklub (Oklevél logóhoz)</label>
                        <select 
                          value={props.editSponsorClub} 
                          onChange={e => props.setEditSponsorClub(e.target.value)} 
                          style={{...inputStyle, border: '1px solid #a78bfa', marginBottom: 0}}
                        >
                          <option value="">-- Nincs kiemelt szponzor klub --</option>
                          {props.clubs.map(c => <option key={c.id} value={String(c.id)}>🛡️ {c.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                      <button onClick={props.handleUpdateContest} style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Változtatások mentése</button>
                      <button onClick={() => props.setEditContestId(null)} style={{ background: '#334155', color: '#cbd5e1', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer' }}>Mégse</button>
                    </div>
                  </div>
                ) : props.judgingContestId === contest.id ? (
                  <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000000', zIndex: 10000, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '15px 30px', background: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
                        <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '1.3rem' }}>⚖️ Értékelő Pult: {contest.title}</h3>
                        <span style={{ background: '#1e293b', padding: '6px 16px', borderRadius: '100px', color: '#38bdf8', fontWeight: 'bold', fontSize: '0.9rem', border: '1px solid #334155' }}>Hátralévő fotók: {props.unvotedEntries.length} db</span>
                      </div>
                      <button onClick={() => props.setJudgingContestId(null)} style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440', padding: '8px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Bezárás / Kilépés</button>
                    </div>

                    {props.unvotedEntries.length > 0 ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
                        {(() => {
                          const currentEntry = props.unvotedEntries[0];
                          const imageUrl = getImageUrl(currentEntry.drive_file_id, currentEntry.file_url);
                          return (
                            <div key={currentEntry.id} style={{ flex: 1, minHeight: 0, background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px', overflow: 'hidden' }}>
                              <img src={imageUrl} alt="Bírálat" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', boxShadow: '0 20px 50px rgba(0,0,0,0.9)' }} />
                            </div>
                          );
                        })()}

                        <div style={{ background: '#0f172a', padding: '20px 40px', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '30px', flexWrap: 'wrap', flexShrink: 0 }}>
                          <div style={{ flex: '1', minWidth: '220px' }}>
                            <div style={{ fontSize: '1.3rem', color: '#f8fafc', fontWeight: '900', marginBottom: '6px' }}>{props.unvotedEntries[0].title || 'Névtelen pályamű'}</div>
                            <span style={{ background: '#38bdf815', color: '#38bdf8', padding: '4px 12px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid #38bdf830' }}>📂 {props.unvotedEntries[0].category}</span>
                          </div>

                          <div style={{ flex: '2', minWidth: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '15px' }}>
                              <span style={{ color: '#64748b', fontWeight: 'bold' }}>0</span>
                              <input type="range" min="0" max="100" value={props.currentScore === '' ? 0 : props.currentScore} onChange={e => props.setCurrentScore(Number(e.target.value))} style={{ flex: 1, cursor: 'pointer', height: '8px', accentColor: '#f59e0b' }} />
                              <span style={{ color: '#64748b', fontWeight: 'bold' }}>100</span>
                            </div>
                          </div>

                          <div style={{ flex: '1', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', minWidth: '220px' }}>
                            <input type="number" min="0" max="100" placeholder="Pont" value={props.currentScore} onChange={e => props.setCurrentScore(e.target.value ? Number(e.target.value) : '')} onKeyDown={e => { if(e.key === 'Enter' && props.currentScore !== '' && !isSubmittingVote) { setIsSubmittingVote(true); props.submitVote(); } }} style={{ width: '100px', fontSize: '2.2rem', padding: '8px', textAlign: 'center', background: '#1e293b', border: '2px solid #f59e0b', color: '#f59e0b', borderRadius: '12px', fontWeight: '900', outline: 'none' }} />
                            <button onClick={() => { setIsSubmittingVote(true); props.submitVote(); }} disabled={props.currentScore === '' || isSubmittingVote} style={{ background: props.currentScore === '' || isSubmittingVote ? '#334155' : 'linear-gradient(135deg, #10b981, #059669)', color: props.currentScore === '' || isSubmittingVote ? '#64748b' : 'white', border: 'none', padding: '16px 32px', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 'bold', cursor: props.currentScore === '' || isSubmittingVote ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>{isSubmittingVote ? '...' : 'Mentés'}</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#0f172a' }}>
                        <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🎉</div>
                        <h2 style={{ color: '#10b981', fontSize: '2rem', margin: '0 0 10px 0' }}>Minden fotót lepontoztál!</h2>
                        <p style={{ color: '#94a3b8', marginBottom: '25px' }}>A pontjaid rögzítésre kerültek, köszönjük az értékes munkád.</p>
                        <button onClick={() => props.setJudgingContestId(null)} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '12px 25px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Vissza a listához</button>
                      </div>
                    )}
                  </div>
                ) : props.viewResultsContestId === contest.id ? (
                  <div style={{ background: '#0f172a', padding: '25px', borderRadius: '16px', border: '1px solid #10b98140' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '20px' }}>
                      <h3 style={{ margin: '0', color: '#10b981', fontSize: '1.3rem' }}>🏆 Hivatalos Végeredmény Hirdetés</h3>
                      <button onClick={() => props.setViewResultsContestId(null)} style={{ background: '#1e293b', color: '#94a3b8', border: 'none', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer' }}>Bezárás</button>
                    </div>
                    
                    {(() => {
                      let catSettings: Record<string, any> = {};
                      try { catSettings = typeof contest.category_settings === 'string' ? JSON.parse(contest.category_settings) : (contest.category_settings || {}); } catch(e) {}

                      return categories.map((cat: string) => {
                        const catResults = props.contestResults.filter(r => r.category === cat);
                        if (catResults.length === 0) return null;
                        
                        const currentCatSettings = catSettings[cat] || {};
                        const awardsArr = (currentCatSettings.awardsString || '').split(',').map((s:string) => s.trim()).filter(Boolean);
                        const accScore = currentCatSettings.acceptanceScore || 9999; 

                        return (
                          <div key={cat} style={{ marginBottom: '30px' }}>
                            <h4 style={{ color: '#38bdf8', borderBottom: '2px solid #38bdf840', display: 'inline-block', paddingBottom: '4px', marginBottom: '15px', fontSize: '1.1rem' }}>📂 {cat} szekció</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {catResults.map((res, index) => {
                                const awardName = awardsArr[index]; 
                                const isAcceptance = !awardName && res.total_score >= accScore;

                                let awardColor = '#38bdf8'; let awardBg = '#38bdf815'; let awardBorder = '#38bdf840'; let awardIcon = '🏅';
                                if (index === 0) { awardColor = '#fbbf24'; awardBg = '#fbbf2415'; awardBorder = '#fbbf2440'; awardIcon = '🥇'; } 
                                else if (index === 1) { awardColor = '#cbd5e1'; awardBg = '#cbd5e115'; awardBorder = '#cbd5e140'; awardIcon = '🥈'; } 
                                else if (index === 2) { awardColor = '#d97706'; awardBg = '#d9770615'; awardBorder = '#d9770640'; awardIcon = '🥉'; }

                                return (
                                  <div key={res.id} style={{ display: 'flex', alignItems: 'center', background: '#1e293b', padding: '12px', borderRadius: '12px', border: awardName ? `1px solid ${awardBorder}` : isAcceptance ? '1px solid #10b98130' : '1px solid transparent', gap: '15px' }}>
                                    <div style={{ fontSize: '1.3rem', fontWeight: '900', width: '35px', color: awardColor }}>#{index + 1}</div>
                                    <img src={getImageUrl(res.drive_file_id, res.file_url)} alt="Fotó" style={{ width: '55px', height: '55px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', background: '#0f172a' }} onClick={() => props.setFullscreenData({url: getImageUrl(res.drive_file_id, res.file_url), title: res.title})} />
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '1rem' }}>
                                        {res.title}
                                        {awardName && <span style={{ background: awardBg, color: awardColor, padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', border: `1px solid ${awardBorder}`, fontWeight: 'bold' }}>{awardIcon} {awardName}</span>}
                                        {isAcceptance && <span style={{ background: '#10b98115', color: '#10b981', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', border: '1px solid #10b98130', fontWeight: 'bold' }}>✓ Elfogadva</span>}
                                      </div>
                                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Fotós: {res.user_name}</div>
                                      
                                      {props.user.email === res.user_email && (awardName || isAcceptance) && (
                                        <button onClick={() => generateCertificate(contest, res, awardName || '', isAcceptance, contestJury)} disabled={generatingCertId === res.id} style={{ marginTop: '8px', background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b50', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>
                                          {generatingCertId === res.id ? '⏳ Oklevél összeállítása...' : '📜 Hivatalos Oklevél Letöltése (PDF)'}
                                        </button>
                                      )}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#10b981' }}>{res.total_score} pont</div>
                                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{res.vote_count} bírálat</div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      });
                    })()}
                  </div>
                ) : (
                  /* STANDARD KÁRTYA MEGJELENÍTÉS */
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#f8fafc', fontWeight: 'bold' }}>{contest.title}</h3>
                          <span style={{ background: badgeBg, color: badgeColor, padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${badgeColor}30` }}>{badgeText}</span>
                          {isFeeRequired && (
                            <span style={{ background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b40', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold' }}>💎 NEVEZÉSI DÍJ: {entryFee} {contest.fee_currency}</span>
                          )}
                        </div>
                        
                        {sponsorClubObj && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#0f172a50', padding: '8px 14px', borderRadius: '10px', border: '1px solid #334155', width: 'fit-content', marginTop: '12px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>🛡️ Védnök / Szponzor:</span>
                            {sponsorClubObj.drive_logo_id && (
                              <img src={getImageUrl(sponsorClubObj.drive_logo_id, sponsorClubObj.logo_url)} alt="Club Logo" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                            )}
                            <strong style={{ color: '#38bdf8', fontSize: '0.9rem' }}>{sponsorClubObj.name}</strong>
                          </div>
                        )}

                        <p style={{ color: '#cbd5e1', fontSize: '0.95rem', margin: '12px 0 0 0', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{contest.description}</p>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {canManageContest && (
                          <>
                            <button onClick={() => props.loadStats(contest.id)} style={{ background: '#0f172a', border: '1px solid #334155', color: '#cbd5e1', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>📊 Nevezők</button>
                            {contestJury.length > 0 && (
                              <button onClick={() => props.loadJuryProgress(contest.id)} style={{ background: '#0f172a', border: '1px solid #a78bfa40', color: '#a78bfa', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>📈 Zsűri Állása</button>
                            )}
                            {(props.user.email === ADMIN_EMAIL || props.isLeader) && (
                              <>
                                <button onClick={() => props.startEdit(contest)} style={{ background: '#0f172a', border: '1px solid #f59e0b40', color: '#f59e0b', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}>Módosítás ✏️</button>
                                {props.user.email === ADMIN_EMAIL && <button onClick={() => props.setManageJuryContestId(contest.id)} style={{ background: '#0f172a', border: '1px solid #8b5cf640', color: '#8b5cf6', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}>Zsűri ({contestJury.length})</button>}
                                {props.user.email === ADMIN_EMAIL && <button onClick={() => props.handleDeleteContest(contest.id)} style={{ background: '#ef444415', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Törlés</button>}
                              </>
                            )}
                          </>
                        )}
                        {isEnded && contest.entry_count > 0 && (canManageContest || isJudgingComplete) && (
                          <button onClick={() => props.loadResults(contest.id)} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontSize: '0.85rem', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>🏆 Eredményhirdetés</button>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem', color: '#94a3b8', margin: '15px 0', background: '#0f172a', padding: '10px 20px', borderRadius: '10px', border: '1px solid #334155', width: 'fit-content', flexWrap: 'wrap' }}>
                      <span>📅 Időszak: <b>{start.getFullYear() > 1970 ? `${start.toLocaleDateString()} - ${end.toLocaleDateString()}` : 'Nincs megadva'}</b></span>
                      <span>📸 Összes kép: <b>{contest.entry_count || 0} db</b></span>
                    </div>

                    {contestJury.length > 0 && (
                      <div style={{ fontSize: '0.85rem', color: '#a78bfa', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⚖️ <b>Kijelölt Zsűri:</b> {contestJury.map(j => props.allUsers.find(u => u.email === j.user_email)?.name || j.user_email).join(', ')}</span>
                      </div>
                    )}

                    {isUserJury && (
                      <div style={{ background: 'linear-gradient(90deg, #f59e0b10, transparent)', borderLeft: '4px solid #f59e0b', color: '#f8fafc', padding: '15px', borderRadius: '0 12px 12px 0', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '25px', flexWrap: 'wrap' }}>
                        <div>
                          <strong style={{ color: '#f59e0b' }}>⚖️ Zsűritagként vagy kijelölve</strong>
                          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
                            {isActive ? 'A pontozás a nevezési határidő lejárta után élesedik.' : isEnded ? (isDoneJudging ? '✓ Minden fotót pontoztál, köszönjük!' : 'A nevezés lezárult, a bírálati pult készen áll.') : 'A pályázat még nem indult el.'}
                          </div>
                        </div>
                        {isEnded && !isDoneJudging && (
                          <button onClick={() => props.startJudging(contest.id)} style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '8px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Értékelési pult megnyitása</button>
                        )}
                      </div>
                    )}

                    {isActive && !isUserJury && props.activeUploadContest !== contest.id && (
                      <button onClick={() => { props.setActiveUploadContest(contest.id); props.setUploadCategory(''); }} style={{ background: 'linear-gradient(135deg, #38bdf8, #0284c7)', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '15px', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(56,189,248,0.3)' }}>+ Új Fotó Nevezése</button>
                    )}

                    {props.activeUploadContest === contest.id && (
                      <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', marginBottom: '20px', border: '1px solid #334155' }}>
                        <h4 style={{marginTop: 0, color: '#38bdf8', fontSize: '1.1rem', marginBottom: '15px'}}>Fotómű kiválasztása és feltöltése</h4>
                        <input placeholder="A mű pontos címe..." value={props.uploadTitle} onChange={e => props.setUploadTitle(e.target.value)} style={inputStyle} disabled={props.isUploading} />
                        <select value={props.uploadCategory} onChange={e => props.setUploadCategory(e.target.value)} style={inputStyle} disabled={props.isUploading}>
                          <option value="">-- Válassz kategóriát --</option>
                          {categories.map((cat: string) => { 
                            const count = categoryCounts[cat] || 0; 
                            return <option key={cat} value={cat} disabled={count >= 4}>{cat} ({count}/4 feltöltve)</option>; 
                          })}
                        </select>
                        <input type="file" accept="image/jpeg, image/png, image/webp" onChange={props.handleFileSelect} style={{ color: '#94a3b8', marginBottom: '15px', width: '100%' }} disabled={props.isUploading} />
                        {props.uploadPreview && <div style={{marginBottom: '20px', textAlign: 'center'}}><img src={props.uploadPreview} alt="Preview" style={{maxHeight: '260px', borderRadius: '12px', border: '2px solid #334155'}} /></div>}
                        <div style={{display: 'flex', gap: '10px'}}>
                          <button onClick={() => props.handleUpload(contest.id)} disabled={props.isUploading} style={{ flex: 1, background: props.isUploading ? '#334155' : 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>{props.isUploading ? 'Fotó rögzítése a Drive-on...' : 'Feltöltés és Nevezés 🚀'}</button>
                          <button onClick={() => { props.setActiveUploadContest(null); props.setUploadPreview(null); }} disabled={props.isUploading} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef444440', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer' }}>Mégse</button>
                        </div>
                      </div>
                    )}

                    {myContestEntries.length > 0 && isFeeRequired && !hasPaid && (
                      <div style={{ background: 'linear-gradient(90deg, #f59e0b15, transparent)', border: '1px solid #f59e0b40', padding: '20px', borderRadius: '24px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        <div>
                          <strong style={{ color: '#f59e0b', fontSize: '1.1rem' }}>⚠️ Nevezési díj kiegyenlítése szükséges</strong>
                          <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: '5px 0 0 0', lineHeight: '1.5' }}>
                            Feltöltött fotóid rögzítésre kerültek, de a bírálati szakaszba csak a tranzakció sikeres lezárása után kerülhetnek.<br/>
                            Fizetendő összeg: <span style={{color: 'white', fontWeight: 'bold'}}>{entryFee} {contest.fee_currency}</span>
                          </p>
                        </div>
                        <button onClick={() => props.handlePayContestFee(contest.id)} style={{ background: '#f59e0b', color: '#0f172a', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}>💳 Biztonságos Fizetés (Stripe)</button>
                      </div>
                    )}

                    {myContestEntries.length > 0 && isFeeRequired && hasPaid && (
                      <div style={{ background: '#10b98110', border: '1px solid #10b98130', padding: '12px 20px', borderRadius: '10px', marginBottom: '20px', color: '#10b981', fontSize: '0.9rem', fontWeight: 'bold' }}>
                        ✓ Nevezési díj sikeresen rendezve a Stripe rendszerén keresztül. Fotóid érvényes!
                      </div>
                    )}

                    {/* SAJÁT NEVEZÉSEK GALÉRIA */}
                    {myContestEntries.length > 0 && (
                      <div style={{ marginTop: '25px', borderTop: '1px solid #334155', paddingTop: '25px' }}>
                        <h4 style={{margin: '0 0 20px 0', fontSize: '1.1rem', color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase'}}>Saját Nevezett Alkotásaim</h4>
                        {categories.map((cat: string) => {
                          const catEntries = myContestEntries.filter(e => e.category === cat);
                          if (catEntries.length === 0) return null;
                          return (
                            <div key={cat} style={{ marginBottom: '20px' }}>
                              <h5 style={{ color: '#38bdf8', borderBottom: '1px solid #1e293b', paddingBottom: '6px', marginTop: 0, fontSize: '1rem', fontWeight: 'bold' }}>{cat} szekció <span style={{ color: '#64748b', fontSize: '0.85rem' }}>({catEntries.length}/4)</span></h5>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
                                {catEntries.map(entry => {
                                  const imageUrl = getImageUrl(entry.drive_file_id, entry.file_url);
                                  return (
                                    <div key={entry.id} style={{ background: '#0f172a', borderRadius: '16px', overflow: 'hidden', border: '1px solid #334155' }}>
                                      <img src={imageUrl} alt={entry.title} onClick={() => props.setFullscreenData({url: imageUrl, title: entry.title})} style={{ width: '100%', height: '130px', objectFit: 'cover', cursor: 'zoom-in', background: '#1e293b' }} />
                                      
                                      {props.editingEntryId === entry.id ? (
                                        <div style={{ padding: '10px' }}>
                                          <input value={props.editEntryTitle} onChange={e => props.setEditEntryTitle(e.target.value)} style={{ width: '100%', padding: '6px', marginBottom: '8px', backgroundColor: '#1e293b', border: '1px solid #38bdf8', color: 'white', borderRadius: '6px', fontSize: '0.85rem' }} />
                                          <div style={{ display: 'flex', gap: '4px' }}>
                                            <button onClick={() => props.handleUpdateEntryTitle(entry.id)} style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>Mentés</button>
                                            <button onClick={() => props.setEditingEntryId(null)} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef444430', padding: '6px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>Mégse</button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div style={{ padding: '12px' }}>
                                          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#cbd5e1' }}>{entry.title}</div>
                                          {!isEnded && (
                                            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                                              <button onClick={() => { props.setEditingEntryId(entry.id); props.setEditEntryTitle(entry.title); }} style={{ flex: 1, background: '#1e293b', color: '#38bdf8', border: '1px solid #38bdf830', padding: '5px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Cím ✏️</button>
                                              <button onClick={() => props.handleDeleteEntry(entry.id)} style={{ background: '#ef444415', color: '#ef4444', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
