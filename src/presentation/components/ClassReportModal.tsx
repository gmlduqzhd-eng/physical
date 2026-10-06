import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useModalDialog } from '../../application/useModalDialog';
import { localDateKey } from '../../application/browserStorage';
import { buildClassReportCsv } from '../../application/classReport';
import { 
  generateNeisGroupComments, 
  generateClassGeneralComment,
  calculateKoreanByte,
  type GradeGroupKey,
  type DomainKey,
  type AchievementLevel
} from '../../application/neisGenerator';
import type { GameRoom, RoomGroup } from '../../domain/types';
import { 
  Printer, 
  Copy, 
  Check, 
  X, 
  Award, 
  Users, 
  Trophy, 
  BookOpen, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  Sparkles, 
  SlidersHorizontal,
  Edit3,
  RefreshCw
} from 'lucide-react';

interface ClassReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameRoom: GameRoom | null;
  scores: RoomGroup[];
}

export const ClassReportModal: React.FC<ClassReportModalProps> = ({
  isOpen,
  onClose,
  gameRoom,
  scores,
}) => {
  const [copiedGeneral, setCopiedGeneral] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedGroupIdx, setCopiedGroupIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'report' | 'neis'>('neis');
  const [actionError, setActionError] = useState('');

  // NEIS 세특 제어 옵션
  const [selectedGrade, setSelectedGrade] = useState<GradeGroupKey>('3~4학년군');
  const [selectedDomain, setSelectedDomain] = useState<DomainKey>('all');
  const [overrideLevels, setOverrideLevels] = useState<Record<string, AchievementLevel>>({});
  const [editedComments, setEditedComments] = useState<Record<string, string>>({});
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [editModeGroupId, setEditModeGroupId] = useState<string | null>(null);

  const dialogRef = useModalDialog(isOpen, onClose);
  const activeRef = useRef(isOpen);
  activeRef.current = isOpen;
  const copyAttemptRef = useRef(0);
  const copyTimers = useRef<{ general?: ReturnType<typeof setTimeout>; group?: ReturnType<typeof setTimeout>; all?: ReturnType<typeof setTimeout> }>({});
  const downloadUrls = useRef(new Set<string>());
  const downloadTimers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    activeRef.current = isOpen;
    const feedbackTimers = copyTimers.current;
    const pendingDownloads = downloadTimers.current;
    const pendingUrls = downloadUrls.current;
    return () => {
      activeRef.current = false;
      copyAttemptRef.current += 1;
      Object.values(feedbackTimers).forEach(clearTimeout);
      pendingDownloads.forEach(clearTimeout);
      pendingUrls.forEach(url => URL.revokeObjectURL(url));
      pendingDownloads.clear();
      pendingUrls.clear();
    };
  }, [isOpen]);

  const normalizedScores = useMemo(() => {
    return scores.map(group => ({
      ...group,
      score: Number.isFinite(group.score) ? group.score : 0,
      completed_missions: Array.isArray(group.completed_missions)
        ? [...new Set(group.completed_missions.filter(id => typeof id === 'string'))]
        : [],
    }));
  }, [scores]);

  const sortedScores = useMemo(() => {
    return [...normalizedScores].sort((a, b) => b.score - a.score);
  }, [normalizedScores]);

  const totalScore = normalizedScores.reduce((acc, s) => acc + s.score, 0);
  const avgScore = scores.length > 0 ? Math.round(totalScore / scores.length) : 0;
  const defusedCount = scores.filter(s => s.is_defused).length;
  const top1 = sortedScores[0];
  const top2 = sortedScores[1];
  const top3 = sortedScores[2];

  // 2022 개정 교육과정 연계 학급 공통 세특 문구
  const generalNeis = useMemo(() => {
    return generateClassGeneralComment(gameRoom, sortedScores, selectedGrade, selectedDomain);
  }, [gameRoom, sortedScores, selectedGrade, selectedDomain]);

  // 2022 개정 교육과정 연계 모둠별 맞춤 세특 리스트
  const neisCommentList = useMemo(() => {
    const rawList = generateNeisGroupComments(sortedScores, gameRoom, {
      gradeGroup: selectedGrade,
      domain: selectedDomain,
    });

    return rawList.map(item => {
      // 교사가 상/중/하 레벨을 수동 변경한 경우 재반영
      const currentLevel = overrideLevels[item.groupId] || item.level;
      let finalComment = editedComments[item.groupId];
      
      if (finalComment === undefined) {
        if (overrideLevels[item.groupId] && overrideLevels[item.groupId] !== item.level) {
          const regenerated = generateNeisGroupComments(sortedScores, gameRoom, {
            gradeGroup: selectedGrade,
            domain: selectedDomain,
            forceLevel: currentLevel,
          }).find(r => r.groupId === item.groupId);
          finalComment = regenerated?.comment || item.comment;
        } else {
          finalComment = item.comment;
        }
      }

      // 모둠명을 학생 이름으로 치환한 경우
      const customName = customNames[item.groupId];
      if (customName && customName.trim()) {
        finalComment = finalComment.replace(new RegExp(`'${item.groupName}' 모둠`, 'g'), `${customName} 학생`);
        finalComment = finalComment.replace(new RegExp(`'${item.groupName}'`, 'g'), customName);
      }

      return {
        ...item,
        level: currentLevel,
        comment: finalComment,
        charCount: finalComment.length,
        byteCount: calculateKoreanByte(finalComment),
      };
    });
  }, [sortedScores, gameRoom, selectedGrade, selectedDomain, overrideLevels, editedComments, customNames]);

  if (!isOpen) return null;

  const scheduleCopyReset = (kind: 'general' | 'group' | 'all') => {
    clearTimeout(copyTimers.current[kind]);
    copyTimers.current[kind] = setTimeout(() => {
      if (kind === 'general') setCopiedGeneral(false);
      else if (kind === 'all') setCopiedAll(false);
      else setCopiedGroupIdx(null);
    }, 2000);
  };

  const copyToClipboard = async (text: string, onSuccess: () => void) => {
    const attempt = ++copyAttemptRef.current;
    setActionError('');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        (dialogRef.current ?? document.body).appendChild(textArea);
        try {
          textArea.focus();
          textArea.select();
          if (!document.execCommand('copy')) throw new Error('Copy was declined.');
        } finally {
          textArea.remove();
          previousFocus?.focus();
        }
      }
      if (activeRef.current && attempt === copyAttemptRef.current) onSuccess();
    } catch {
      if (activeRef.current && attempt === copyAttemptRef.current) {
        setActionError('복사할 수 없습니다. 텍스트를 마우스로 직접 드래그하여 복사해 주세요.');
      }
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    downloadUrls.current.add(url);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    try {
      link.click();
    } finally {
      link.remove();
      const timer = setTimeout(() => {
        URL.revokeObjectURL(url);
        downloadUrls.current.delete(url);
        downloadTimers.current.delete(timer);
      }, 1000);
      downloadTimers.current.add(timer);
    }
  };

  const reportFilename = (prefix: string, extension: string) => {
    const name = Array.from(gameRoom?.name || '체육수업').map(char =>
      char.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(char) ? '_' : char
    ).join('').slice(0, 60);
    return `${prefix}_${name}_${localDateKey()}.${extension}`;
  };

  // CSV 다운로드 (2022 개정 성취기준 연계 세특 포함)
  const handleDownloadCSV = () => {
    setActionError('');
    try {
      const csvData = buildClassReportCsv(sortedScores, {
        gradeGroup: selectedGrade,
        domain: selectedDomain,
        gameRoom,
      });
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, reportFilename('2022개정_체육세특_수업결과', 'csv'));
    } catch {
      setActionError('CSV를 저장할 수 없습니다. 브라우저의 다운로드 설정을 확인해 주세요.');
    }
  };

  // 명예의 전당 포토카드 Canvas 생성 및 이미지 다운로드
  const handleDownloadPhotoCard = () => {
    setActionError('');
    if (!top1) {
      setActionError('포토카드를 만들 모둠 기록이 없습니다.');
      return;
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setActionError('이 브라우저에서는 포토카드를 만들 수 없습니다.');
        return;
      }
      const fittedText = (text: string, x: number, y: number, maxWidth: number, size: number) => {
        const line = text.replace(/\s+/g, ' ').slice(0, 80);
        while (size > 18) {
          ctx.font = `bold ${size}px sans-serif`;
          if (ctx.measureText(line).width <= maxWidth) break;
          size -= 2;
        }
        ctx.fillText(line, x, y, maxWidth);
      };
      const roundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
        if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, width, height, radius);
        else ctx.rect(x, y, width, height);
      };

      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#0284c7');
      bgGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1080);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.arc(900, 200, 300, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 땀방울 원정대 스마트 체육 수업 결과', 540, 130);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 64px sans-serif';
      fittedText(gameRoom?.name || '신체활동 미션 챌린지', 540, 220, 900, 64);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '28px sans-serif';
      ctx.fillText(new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }), 540, 280);

      // 1등 박스
      ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      roundedRect(140, 340, 800, 340, 32);
      ctx.fill();
      ctx.stroke();

      ctx.font = '72px sans-serif';
      ctx.fillText('🥇', 540, 440);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 52px sans-serif';
      fittedText(`1위 : ${top1.group_name}`, 540, 520, 740, 52);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 44px monospace';
      ctx.fillText(`${top1?.score?.toLocaleString() || 0} PTS`, 540, 590);

      // 2위
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      roundedRect(140, 720, 380, 180, 24);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 34px sans-serif';
      fittedText(`🥈 2위: ${top2?.group_name || '-'}`, 330, 800, 340, 34);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 32px monospace';
      ctx.fillText(`${top2?.score?.toLocaleString() || 0} pts`, 330, 855);

      // 3위
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      roundedRect(560, 720, 380, 180, 24);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 34px sans-serif';
      fittedText(`🥉 3위: ${top3?.group_name || '-'}`, 750, 800, 340, 34);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 32px monospace';
      ctx.fillText(`${top3?.score?.toLocaleString() || 0} pts`, 750, 855);

      ctx.fillStyle = '#64748b';
      ctx.font = '24px sans-serif';
      ctx.fillText('땀방울 원정대 • 2022 개정 초등 체육과 인터랙티브 스마트 체육', 540, 990);

      canvas.toBlob(blob => {
        if (!activeRef.current) return;
        if (!blob) {
          setActionError('포토카드 이미지를 만들 수 없습니다. 다시 시도해 주세요.');
          return;
        }
        try {
          downloadBlob(blob, reportFilename('명예의전당_포토카드', 'png'));
        } catch {
          setActionError('포토카드를 저장할 수 없습니다. 브라우저의 다운로드 설정을 확인해 주세요.');
        }
      }, 'image/png');
    } catch {
      setActionError('포토카드를 만들 수 없습니다. 다시 시도해 주세요.');
    }
  };

  // 전체 NEIS 세특 일괄 복사 (클립보드 / 나이스 / 엑셀 입력용)
  const handleCopyAllNeis = () => {
    const textBlocks: string[] = [];
    textBlocks.push(`[2022 개정 체육과 교육과정 연계 학급 공통 총평]`);
    generalNeis.lines.forEach(l => textBlocks.push(`• ${l}`));
    textBlocks.push('\n[모둠 및 학생별 세부능력 및 특기사항 평가 문구]');
    
    neisCommentList.forEach(item => {
      textBlocks.push(`\n▶ [${item.rank}위] ${item.groupName} (성취수준: ${item.level === 'high' ? '상' : item.level === 'mid' ? '중' : '하'} / ${item.standardCodes.join(', ')})`);
      textBlocks.push(item.comment);
    });

    copyToClipboard(textBlocks.join('\n'), () => {
      setCopiedAll(true);
      scheduleCopyReset('all');
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="class-report-print"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="2022 개정 체육과 수업 리포트 및 NEIS 세특 생성기"
      tabIndex={-1}
      className="fixed inset-0 z-[10010] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div className="bg-white text-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200 border border-slate-700/30">
        
        {/* 상단 툴바 */}
        <div className="print:hidden bg-slate-900 text-white px-5 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white rounded-xl shadow-inner">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">NEIS 세특 자동 완성</h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold rounded-full">
                  2022 개정 교육과정
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {gameRoom?.name || '체육 수업'} • 초등 체육과 성취기준 연계 원클릭 생성
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadCSV}
              title="2022 개정 성취기준 세특 포함 CSV 다운로드"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>CSV 저장</span>
            </button>
            <button
              onClick={handleDownloadPhotoCard}
              title="명예의 전당 포토카드 이미지 저장"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <ImageIcon className="w-4 h-4" />
              <span>포토카드</span>
            </button>
            <button
              onClick={handlePrint}
              title="인쇄 및 PDF 저장"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>인쇄 / PDF</span>
            </button>
            <button
              onClick={onClose}
              aria-label="리포트 닫기"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="print:hidden bg-slate-100 border-b border-slate-200 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('neis')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
                activeTab === 'neis'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 hover:text-slate-900 bg-white/70 hover:bg-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>📝 NEIS 세특 자동 완성 (2022 개정)</span>
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'report'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                  : 'text-slate-600 hover:text-slate-900 bg-white/70 hover:bg-white'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>📊 종합 수업 보고서</span>
            </button>
          </div>

          {activeTab === 'neis' && (
            <button
              onClick={handleCopyAllNeis}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              {copiedAll ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedAll ? '전체 세특 복사 완료!' : '📋 전체 세특 일괄 복사'}</span>
            </button>
          )}
        </div>

        {actionError && (
          <p role="alert" className="print:hidden mx-6 my-3 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            {actionError}
          </p>
        )}

        {/* 탭 1: NEIS 세특 자동 완성 */}
        {activeTab === 'neis' && (
          <div className="p-4 sm:p-8 overflow-y-auto space-y-6 select-text">
            {/* 설정 컨트롤 패널: 학년군 / 영역 / 필터 */}
            <div className="p-5 bg-gradient-to-r from-slate-50 to-indigo-50/40 rounded-2xl border border-indigo-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-xs font-black text-indigo-900 uppercase">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <span>2022 개정 체육과 성취기준 맞춤 설정</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 학년군 선택 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    적용 학년군 선택
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {(['1~2학년', '3~4학년군', '5~6학년군'] as GradeGroupKey[]).map(grade => (
                      <button
                        key={grade}
                        onClick={() => setSelectedGrade(grade)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          selectedGrade === grade
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        {grade === '1~2학년' ? '1~2학년 (즐거운 생활)' : grade}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 중점 영역 선택 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    중점 평가 영역
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { key: 'all', label: '종합/균형' },
                      { key: 'exercise', label: '🏃 운동·체력' },
                      { key: 'sports', label: '⚽ 스포츠·도전' },
                      { key: 'expression', label: '💃 표현' },
                    ].map(d => (
                      <button
                        key={d.key}
                        onClick={() => setSelectedDomain(d.key as DomainKey)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          selectedDomain === d.key
                            ? 'bg-cyan-700 text-white shadow-sm'
                            : 'bg-white text-slate-700 border border-slate-200 hover:border-cyan-300'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-indigo-100/70">
                <span>💡 2022 개정 체육과의 <strong>지식·이해, 과정·기능, 가치·태도</strong> 3차원 평가 요소가 문장에 자동 반영됩니다.</span>
                <span>NEIS 한도: 한글 500자 (1,500 Byte)</span>
              </div>
            </div>

            {/* 학급 공통 총평 카드 */}
            <div className="p-5 bg-indigo-50/70 rounded-2xl border border-indigo-200/80 space-y-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-indigo-600 text-white rounded-lg">
                    <BookOpen className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-black text-indigo-950">
                    {generalNeis.title}
                  </h3>
                </div>
                <button
                  onClick={() => copyToClipboard(generalNeis.lines.join('\n'), () => {
                    setCopiedGeneral(true);
                    scheduleCopyReset('general');
                  })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200 text-xs font-bold transition-all shadow-xs"
                >
                  {copiedGeneral ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedGeneral ? '복사 완료!' : '공통 총평 복사'}</span>
                </button>
              </div>

              <div className="bg-white p-4 rounded-xl border border-indigo-100 text-xs text-slate-700 space-y-1.5 leading-relaxed">
                {generalNeis.lines.map((line, idx) => (
                  <p key={idx} className="flex items-start gap-2">
                    <span className="text-indigo-500 font-bold">•</span>
                    <span>{line}</span>
                  </p>
                ))}
              </div>
            </div>

            {/* 모둠별 맞춤형 세특 목록 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>모둠별 2022 개정 성취기준 연계 세특 문구 ({neisCommentList.length}개 모둠)</span>
                </h3>
                <span className="text-xs text-slate-500">
                  모둠별 [상/중/하] 레벨을 클릭해 문구를 변경하거나 텍스트를 직접 수정할 수 있습니다.
                </span>
              </div>

              <div className="grid gap-4">
                {neisCommentList.map((item, idx) => {
                  const isEditing = editModeGroupId === item.groupId;
                  return (
                    <div
                      key={item.groupId}
                      className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-300 transition-all space-y-3"
                    >
                      {/* 모둠 헤더 & 레벨 선택기 */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                            item.rank === 1
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : item.rank === 2
                              ? 'bg-slate-200 text-slate-800'
                              : item.rank === 3
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {item.rank}위
                          </span>
                          
                          {/* 모둠명 또는 개별 학생 이름 입력 */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-slate-900">
                              {item.groupName}
                            </span>
                            <input
                              type="text"
                              placeholder="학생 이름(치환용)"
                              value={customNames[item.groupId] || ''}
                              onChange={(e) => setCustomNames(prev => ({ ...prev, [item.groupId]: e.target.value }))}
                              className="text-[11px] px-2 py-0.5 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:border-indigo-400 w-28 bg-slate-50"
                              title="학생 이름을 입력하면 문구 내 '모둠' 대신 '학생'으로 자동 치환됩니다"
                            />
                          </div>

                          <span className="text-xs font-mono font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md">
                            {item.score.toLocaleString()}점
                          </span>
                          <span className="text-xs text-slate-500">
                            미션 {item.missionsCount}개 완료 • {item.isDefused ? '🎉 최종 해체 성공' : '미션 진행'}
                          </span>
                        </div>

                        {/* 성취 수준 상/중/하 토글 버튼 */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                          <span className="text-[11px] font-bold text-slate-500 px-1.5">성취수준:</span>
                          {(['high', 'mid', 'low'] as AchievementLevel[]).map(lvl => (
                            <button
                              key={lvl}
                              onClick={() => {
                                setOverrideLevels(prev => ({ ...prev, [item.groupId]: lvl }));
                                // 텍스트 수정 내역 초기화하고 새 레벨 텍스트 적용
                                setEditedComments(prev => {
                                  const next = { ...prev };
                                  delete next[item.groupId];
                                  return next;
                                });
                              }}
                              className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                                item.level === lvl
                                  ? lvl === 'high'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : lvl === 'mid'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-slate-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {lvl === 'high' ? '상 (우수)' : lvl === 'mid' ? '중 (보통)' : '하 (노력)'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 성취기준 태그 */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono font-bold rounded-md border border-indigo-200">
                          {item.standardCodes.join(', ')}
                        </span>
                        <span className="text-slate-600 font-medium">
                          {item.standardTitle}
                        </span>
                      </div>

                      {/* 본문 문구 영역 (보기 / 편집 모드) */}
                      <div className="relative">
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={item.comment}
                              onChange={(e) => setEditedComments(prev => ({ ...prev, [item.groupId]: e.target.value }))}
                              rows={4}
                              className="w-full text-xs text-slate-800 p-3 bg-amber-50/50 border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 font-sans leading-relaxed"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  // 기본 생성 문구로 초기화
                                  setEditedComments(prev => {
                                    const next = { ...prev };
                                    delete next[item.groupId];
                                    return next;
                                  });
                                  setEditModeGroupId(null);
                                }}
                                className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-xs font-bold flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3" /> 원문 복원
                              </button>
                              <button
                                onClick={() => setEditModeGroupId(null)}
                                className="px-3 py-1 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700"
                              >
                                완료
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditModeGroupId(item.groupId)}
                            className="group p-3 bg-slate-50 hover:bg-indigo-50/30 rounded-xl border border-slate-200/80 cursor-pointer transition-colors relative"
                            title="클릭하여 문구를 직접 수정할 수 있습니다"
                          >
                            <p className="text-xs text-slate-800 leading-relaxed font-sans select-text">
                              {item.comment}
                            </p>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2.5 top-2.5 text-[11px] text-indigo-600 font-bold flex items-center gap-1 bg-white/90 px-2 py-0.5 rounded-md border border-indigo-200">
                              <Edit3 className="w-3 h-3" /> 직접 수정
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 하단 바: 글자수 / 바이트 / 원클릭 복사 */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                          <span>글자 수: <strong className="text-slate-800">{item.charCount}자</strong></span>
                          <span>•</span>
                          <span>바이트: <strong className="text-indigo-700">{item.byteCount} / 1,500 Byte</strong> ({Math.round((item.byteCount / 1500) * 100)}%)</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(item.comment, () => {
                              setCopiedGroupIdx(idx);
                              scheduleCopyReset('group');
                            })}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                          >
                            {copiedGroupIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedGroupIdx === idx ? 'NEIS 복사 완료!' : '원클릭 NEIS 복사'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 탭 2: 종합 수업 보고서 */}
        {activeTab === 'report' && (
          <div className="p-4 sm:p-8 overflow-y-auto space-y-6 print:p-0 print:space-y-4 font-sans text-sm">
            {/* 타이틀 */}
            <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
              <div>
                <span className="text-xs font-black text-cyan-600 tracking-wider uppercase">
                  2022 개정 초등 체육과 스마트 수업 결과 보고서
                </span>
                <h1 className="text-2xl font-black text-slate-900 mt-1">
                  {gameRoom?.name || '체육 미션 원정대 수업'}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  작성일시: {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold font-mono">
                  PIN: {gameRoom?.pin_code || '----'}
                </span>
              </div>
            </div>

            {/* 핵심 지표 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-500 font-bold block mb-1">참여 모둠</span>
                <span className="text-2xl font-black text-slate-900 font-mono">{scores.length}</span>
                <span className="text-[11px] text-slate-400 block">개 모둠</span>
              </div>
              <div className="p-3 bg-cyan-50 rounded-2xl border border-cyan-200">
                <span className="text-xs text-cyan-700 font-bold block mb-1">총 획득 점수</span>
                <span className="text-2xl font-black text-cyan-700 font-mono">{totalScore.toLocaleString()}</span>
                <span className="text-[11px] text-cyan-600 block">pts</span>
              </div>
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200">
                <span className="text-xs text-blue-700 font-bold block mb-1">모둠 평균 점수</span>
                <span className="text-2xl font-black text-blue-700 font-mono">{avgScore.toLocaleString()}</span>
                <span className="text-[11px] text-blue-600 block">pts</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="text-xs text-emerald-700 font-bold block mb-1">최종 완수율</span>
                <span className="text-2xl font-black text-emerald-700 font-mono">{defusedCount}</span>
                <span className="text-[11px] text-emerald-600 block">개 조 ({scores.length > 0 ? Math.round((defusedCount/scores.length)*100) : 0}%)</span>
              </div>
            </div>

            {/* 명예의 전당 */}
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200">
              <h3 className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5 mb-3">
                <Award className="w-4 h-4 text-amber-600" />
                오늘의 명예의 전당 (Top 3)
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/80 p-3 rounded-xl border border-amber-200 text-center">
                  <span className="text-xl">🥇</span>
                  <span className="block font-black text-sm text-slate-800 mt-1">{top1?.group_name || '-'}</span>
                  <span className="text-xs font-black font-mono text-amber-600">{top1?.score?.toLocaleString() || 0}점</span>
                </div>
                <div className="bg-white/80 p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-xl">🥈</span>
                  <span className="block font-black text-sm text-slate-800 mt-1">{top2?.group_name || '-'}</span>
                  <span className="text-xs font-black font-mono text-slate-600">{top2?.score?.toLocaleString() || 0}점</span>
                </div>
                <div className="bg-white/80 p-3 rounded-xl border border-amber-100 text-center">
                  <span className="text-xl">🥉</span>
                  <span className="block font-black text-sm text-slate-800 mt-1">{top3?.group_name || '-'}</span>
                  <span className="text-xs font-black font-mono text-amber-700">{top3?.score?.toLocaleString() || 0}점</span>
                </div>
              </div>
            </div>

            {/* 모둠별 세부 성취 결과 */}
            <div>
              <h3 className="text-xs font-black text-slate-700 uppercase flex items-center gap-1.5 mb-2">
                <Users className="w-4 h-4 text-cyan-600" />
                모둠별 활동 기록
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[440px] text-left border-collapse border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">순위</th>
                      <th className="py-2.5 px-3">모둠명</th>
                      <th className="py-2.5 px-3 text-right">최종 점수</th>
                      <th className="py-2.5 px-3 text-center">완료 미션</th>
                      <th className="py-2.5 px-3 text-center">해체 여부</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedScores.map((s, idx) => (
                      <tr key={s.id} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                        <td className="py-2 px-3 font-bold text-slate-500 font-mono">{idx + 1}위</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{s.group_name}</td>
                        <td className="py-2 px-3 font-black text-cyan-700 font-mono text-right">{s.score.toLocaleString()}</td>
                        <td className="py-2 px-3 text-center text-slate-600">{s.completed_missions?.length || 0}개</td>
                        <td className="py-2 px-3 text-center font-bold">
                          {s.is_defused ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px]">완료</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px]">미완성</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @media print {
            body { overflow: visible !important; }
            body * { visibility: hidden; }
            #class-report-print, #class-report-print * { visibility: visible; }
            #class-report-print .print\\:hidden { display: none !important; }
            #class-report-print { position: absolute !important; inset: 0 !important; padding: 0 !important; background: white !important; }
            #class-report-print div[class*="backdrop-blur"] { backdrop-filter: none !important; background: white !important; }
            #class-report-print div[class*="max-w-"] { max-width: 100% !important; box-shadow: none !important; }
            #class-report-print div[class*="overflow-"] { overflow: visible !important; }
            #class-report-print div[class*="max-h-"] { max-height: none !important; }
          }
        `}</style>
      </div>
    </div>
  );
};
