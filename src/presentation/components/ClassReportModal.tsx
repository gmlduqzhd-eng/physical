import React, { useState, useRef, useEffect } from 'react';
import { useModalDialog } from '../../application/useModalDialog';
import { localDateKey } from '../../application/browserStorage';
import { buildClassReportCsv, recordedGroupComment } from '../../application/classReport';
import type { GameRoom, RoomGroup } from '../../domain/types';
import { Printer, Copy, Check, X, Award, Users, Trophy, BookOpen, FileSpreadsheet, Image as ImageIcon, Sparkles } from 'lucide-react';

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
  const [copiedGroupIdx, setCopiedGroupIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'report' | 'neis'>('report');
  const [actionError, setActionError] = useState('');
  const dialogRef = useModalDialog(isOpen, onClose);
  const activeRef = useRef(isOpen);
  activeRef.current = isOpen;
  const copyAttemptRef = useRef(0);
  const copyTimers = useRef<{ general?: ReturnType<typeof setTimeout>; group?: ReturnType<typeof setTimeout> }>({});
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

  if (!isOpen) return null;

  const normalizedScores = scores.map(group => ({
    ...group, score: Number.isFinite(group.score) ? group.score : 0,
    completed_missions: Array.isArray(group.completed_missions) ? [...new Set(group.completed_missions.filter(id => typeof id === 'string'))] : [],
  }));
  const sortedScores = normalizedScores.sort((a, b) => b.score - a.score);
  const totalScore = normalizedScores.reduce((acc, s) => acc + s.score, 0);
  const avgScore = scores.length > 0 ? Math.round(totalScore / scores.length) : 0;
  const defusedCount = scores.filter(s => s.is_defused).length;
  const top1 = sortedScores[0];
  const top2 = sortedScores[1];
  const top3 = sortedScores[2];

  // 나이스(NEIS) 생활기록부 공통 추천 서술형 문구
  const generalNeisComments = [
    `[점수 기록] 등록된 ${scores.length}개 모둠의 총 점수는 ${totalScore.toLocaleString()}점이며 모둠 평균은 ${avgScore.toLocaleString()}점으로 집계됨.`,
    `[미션 기록] 모둠별 완료 미션 수와 최종 해체 상태가 기록되었으며 ${defusedCount}개 모둠의 해체 성공이 확인됨.`,
    `[관찰 보완] 학생별 역할, 의사소통, 활동 태도와 신체 기능은 교사의 수업 관찰 기록을 확인하여 개별 서술을 보완할 수 있음.`
  ];

  // 모둠별 개별 특기사항 생성
  const generateGroupNeis = recordedGroupComment;

  const scheduleCopyReset = (kind: 'general' | 'group') => {
    clearTimeout(copyTimers.current[kind]);
    copyTimers.current[kind] = setTimeout(() => {
      if (kind === 'general') setCopiedGeneral(false);
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
          textArea.focus(); textArea.select();
          if (!document.execCommand('copy')) throw new Error('Copy was declined.');
        } finally { textArea.remove(); previousFocus?.focus(); }
      }
      if (activeRef.current && attempt === copyAttemptRef.current) onSuccess();
    } catch {
      if (activeRef.current && attempt === copyAttemptRef.current) setActionError('복사할 수 없습니다. 아래 문구를 선택하여 직접 복사해 주세요.');
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    downloadUrls.current.add(url);
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link);
    try { link.click(); } finally {
      link.remove();
      const timer = setTimeout(() => {
        URL.revokeObjectURL(url); downloadUrls.current.delete(url); downloadTimers.current.delete(timer);
      }, 1000);
      downloadTimers.current.add(timer);
    }
  };
  const reportFilename = (prefix: string, extension: string) => {
    const name = Array.from(gameRoom?.name || '기록').map(char => char.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(char) ? '_' : char).join('').slice(0, 60);
    return `${prefix}_${name}_${localDateKey()}.${extension}`;
  };

  // CSV 다운로드 기능
  const handleDownloadCSV = () => {
    setActionError('');
    try {
      const blob = new Blob([buildClassReportCsv(sortedScores)], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, reportFilename('체육수업_결과보고서', 'csv'));
    } catch { setActionError('CSV를 저장할 수 없습니다. 브라우저의 다운로드 설정을 확인해 주세요.'); }
  };

  // 명예의 전당 포토카드 Canvas 생성 및 이미지 다운로드
  const handleDownloadPhotoCard = () => {
    setActionError('');
    if (!top1) { setActionError('포토카드를 만들 모둠 기록이 없습니다.'); return; }
    try {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setActionError('이 브라우저에서는 포토카드를 만들 수 없습니다.'); return; }
    const fittedText = (text: string, x: number, y: number, maxWidth: number, size: number) => {
      const line = text.replace(/\s+/g, ' ').slice(0, 80);
      while (size > 18) { ctx.font = `bold ${size}px sans-serif`; if (ctx.measureText(line).width <= maxWidth) break; size -= 2; }
      ctx.fillText(line, x, y, maxWidth);
    };
    const roundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
      if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, width, height, radius);
      else ctx.rect(x, y, width, height);
    };

    // 배경 그라데이션
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.5, '#0284c7');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1080);

    // 장식 서클
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.arc(900, 200, 300, 0, Math.PI * 2);
    ctx.fill();

    // 상단 태그
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 땀방울 원정대 스마트 체육 수업 결과', 540, 130);

    // 수업 이름
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px sans-serif';
    fittedText(gameRoom?.name || '신체활동 미션 챌린지', 540, 220, 900, 64);

    // 날짜
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

    // 2등, 3등 박스
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;

    // 2위
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

    // 하단 카피라이트
    ctx.fillStyle = '#64748b';
    ctx.font = '24px sans-serif';
    ctx.fillText('땀방울 원정대 • 2022 개정 초등 체육과 인터랙티브 스마트 체육', 540, 990);

    // 이미지 저장 트리거
    canvas.toBlob(blob => {
      if (!activeRef.current) return;
      if (!blob) { setActionError('포토카드 이미지를 만들 수 없습니다. 다시 시도해 주세요.'); return; }
      try { downloadBlob(blob, reportFilename('명예의전당_포토카드', 'png')); }
      catch { setActionError('포토카드를 저장할 수 없습니다. 브라우저의 다운로드 설정을 확인해 주세요.'); }
    }, 'image/png');
    } catch { setActionError('포토카드를 만들 수 없습니다. 다시 시도해 주세요.'); }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="class-report-print" ref={dialogRef} role="dialog" aria-modal="true" aria-label="수업 기록 리포트" tabIndex={-1} className="fixed inset-0 z-[10010] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white text-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* 상단 툴바 */}
        <div className="print:hidden bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg">
              <Trophy className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-black">수업 기록 리포트</h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>CSV 다운로드</span>
            </button>
            <button
              onClick={handleDownloadPhotoCard}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <ImageIcon className="w-4 h-4" />
              <span>포토카드 저장</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>인쇄 / PDF</span>
            </button>
            <button
              onClick={onClose}
              aria-label="수업 기록 리포트 닫기"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="print:hidden bg-slate-100 border-b border-slate-200 px-4 sm:px-6 py-2 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'report' ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📊 종합 보고서
          </button>
          <button
            onClick={() => setActiveTab('neis')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === 'neis' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            NEIS 기록 확인 · 관찰 보완
          </button>
        </div>
        {actionError && <p role="alert" className="print:hidden mx-4 my-3 p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">{actionError}</p>}

        {/* 1. 종합 보고서 탭 */}
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

        {/* 2. NEIS 생활기록부 세특 탭 */}
        {activeTab === 'neis' && (
          <div className="p-4 sm:p-8 overflow-y-auto space-y-6 select-text">
            {/* 공통 추천 문구 */}
            <div className="p-5 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-black text-indigo-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  학급 전체 기록 요약과 관찰 보완
                </h3>
                <button
                  onClick={() => copyToClipboard(generalNeisComments.join('\n\n'), () => {
                    setCopiedGeneral(true);
                    scheduleCopyReset('general');
                  })}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 text-xs font-bold transition-all"
                >
                  {copiedGeneral ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedGeneral ? '복사 완료!' : '전체 복사'}</span>
                </button>
              </div>
              <ul className="space-y-2 text-xs text-slate-700 list-disc list-inside bg-white p-4 rounded-xl border border-indigo-100/60">
                {generalNeisComments.map((c, i) => (
                  <li key={i} className="leading-relaxed">{c}</li>
                ))}
              </ul>
            </div>

            {/* 모둠별 맞춤형 세특 목록 */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                모둠별 기록 요약과 교사 관찰 보완
              </h3>
              <div className="grid gap-3">
                {sortedScores.map((group, idx) => {
                  const text = generateGroupNeis(group);
                  return (
                    <div key={group.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            {idx + 1}위
                          </span>
                          <span className="text-sm font-black text-slate-900">{group.group_name}</span>
                          <span className="text-xs font-mono text-cyan-700 font-bold">({group.score.toLocaleString()}점)</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{text}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(text, () => {
                          setCopiedGroupIdx(idx);
                          scheduleCopyReset('group');
                        })}
                        className="self-end sm:self-center flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-300 text-xs font-bold transition-all shadow-sm"
                      >
                        {copiedGroupIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedGroupIdx === idx ? '복사됨' : '복사'}</span>
                      </button>
                    </div>
                  );
                })}
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
