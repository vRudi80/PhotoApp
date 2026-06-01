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

  // Hibrid ID-szűrő a zökkenőmentes átálláshoz (Felismeri a nevet és az ID-t is!)
  const currentNewClubValue = props.clubs.find(c => String(c.id) === props.newRestrictedClub || c.name === props.newRestrictedClub)?.id || '';
  const currentEditClubValue = props.clubs.find(c => String(c.id) === props.editRestrictedClub || c.name === props.editRestrictedClub)?.id || '';

  const generateCertificate = async (contest: any, result: any, awardName: string, isAcceptance: boolean, contestJury: any[]) => {
    setGeneratingCertId(result.id);
    try {
      const res = await fetch(`${BACKEND_URL}/api/image-base64/${result.drive_file_id}`);
      const data = await res.json();
      if (!data.base64) throw new Error("Hiba a kép download közben");

      const img = new Image();
      img.src = data.base64;
      await new Promise((resolve) => { img.onload = resolve; });

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      const fixHu = (str: string) => {
        if (!str) return '';
        return str.replace(/ő/g, 'ö').replace(/ű/g, 'ü').replace(/Ő/g, 'Ö').replace(/Ű/g, 'Ü');
      };

      doc.setDrawColor(217, 119, 6); 
      doc.setLineWidth(2);
      doc.rect(10, 10, 277, 190);
      doc.setLineWidth(0.5);
      doc.rect(12, 12, 273, 186);

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

      const juryNames = contestJury.map(j => props.allUsers.find(u => u.email ===
