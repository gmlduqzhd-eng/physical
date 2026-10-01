import React, { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<'report' | 'neis' | 'photocard'>('report');

  if (!isOpen) return null;

  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const totalScore = scores.reduce((acc, s) => acc + s.score, 0);
  const avgScore = scores.length > 0 ? Math.round(totalScore / scores.length) : 0;
  const defusedCount = scores.filter(s => s.is_defused).length;
  const top1 = sortedScores[0];
  const top2 = sortedScores[1];
  const top3 = sortedScores[2];

  // 나이스(NEIS) 생활기록부 공통 추천 서술형 문구
  const generalNeisComments = [
    `[협동 및 문제해결] 모둠원 간의 적극적인 의사소통과 전략적 역할 분담을 통해 다양한 체육 신체활동 미션을 성실히 완수함.`,
    `[건강 및 체력] 지속적인 신체 움직임과 인터랙티브 체력 측정 활동에 자발적으로 참여하며, 높은 근지구력과 순발력을 발휘함.`,
    `[스포츠맨십 및 규칙 준수] 스마트 체육 환경에서 안전 수칙을 준수하고 상대 모둠과 상호 격려하며 페어플레이 정신을 모범적으로 실천함.`
  ];

  // 모둠별 개별 특기사항 생성
  const generateGroupNeis = (group: RoomGroup, rank: number) => {
    if (rank === 1) {
      return `'${group.group_name}' 모둠의 리더십과 뛰어난 순발력을 바탕으로 전체 활동 1위(${group.score.toLocaleString()}점)를 달성함. 모둠원의 움직임을 조율하고 미션 해결 전략을 주도적으로 제시하는 탁월한 경기 운영 능력을 보임.`;
    } else if (rank === 2 || rank === 3) {
      return `'${group.group_name}' 모둠원과 긴밀히 소통하며 꾸준한 지구력으로 상위권(${group.score.toLocaleString()}점)을 기록함. 위기 상황에서도 포기하지 않고 끝까지 동료를 격려하는 우수한 협동심을 나타냄.`;
    } else {
      return `'${group.group_name}' 모둠 활동에 적극적으로 참여하여 ${group.completed_missions?.length || 0}개의 미션을 성실히 완수함. 신체활동의 기본 규칙을 충실히 지키며 긍정적인 체육 참여 태도를 형성함.`;
    }
  };

  const copyToClipboard = async (text: string, onSuccess: () => void) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      onSuccess();
    } catch {
      // ignore
    }
  };

  // CSV 다운로드 기능
  const handleDownloadCSV = () => {
    const headers = ['순위', '모둠명', '최종점수', '완료미션수', '해체성공여부', 'NEIS추천세특'];
    const rows = sortedScores.map((s, idx) => [
      `${idx + 1}위`,
      `"${s.group_name}"`,
      s.score,
      s.completed_missions?.length || 0,
      s.is_defused ? '성공' : '미완성',
      `"${generateGroupNeis(s, idx + 1)}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `체육수업_결과보고서_${gameRoom?.name || '기록'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 명예의 전당 포토카드 Canvas 생성 및 이미지 다운로드
  const handleDownloadPhotoCard = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
    ctx.fillText(gameRoom?.name || '신체활동 미션 챌린지', 540, 220);

    // 날짜
    ctx.fillStyle = '#94a3b8';
    ctx.font = '28px sans-serif';
    ctx.fillText(new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }), 540, 280);

    // 1등 박스
    ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(140, 340, 800, 340, 32);
    ctx.fill();
    ctx.stroke();

    ctx.font = '72px sans-serif';
    ctx.fillText('🥇', 540, 440);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText(`1위 : ${top1?.group_name || '챔피언 모둠'}`, 540, 520);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 44px monospace';
    ctx.fillText(`${top1?.score?.toLocaleString() || 0} PTS`, 540, 590);

    // 2등, 3등 박스
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;

    // 2위
    ctx.beginPath();
    ctx.roundRect(140, 720, 380, 180, 24);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(`🥈 2위: ${top2?.group_name || '-'}`, 330, 800);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 32px monospace';
    ctx.fillText(`${top2?.score?.toLocaleString() || 0} pts`, 330, 855);

    // 3위
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(560, 720, 380, 180, 24);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(`🥉 3위: ${top3?.group_name || '-'}`, 750, 800);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 32px monospace';
    ctx.fillText(`${top3?.score?.toLocaleString() || 0} pts`, 750, 855);

    // 하단 카피라이트
    ctx.fillStyle = '#64748b';
    ctx.font = '24px sans-serif';
    ctx.fillText('땀방울 원정대 • 2022 개정 초등 체육과 인터랙티브 스마트 체육', 540, 990);

    // 이미지 저장 트리거
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `명예의전당_포토카드_${gameRoom?.name || '체육'}.png`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white text-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* 상단 툴바 */}
        <div className="print:hidden bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg">
              <Trophy className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-black">수업 결과 및 성취도 리포트</h2>
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
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="print:hidden bg-slate-100 border-b border-slate-200 px-6 py-2 flex gap-2">
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
            NEIS 생활기록부 세특 생성기
          </button>
        </div>

        {/* 1. 종합 보고서 탭 */}
        {activeTab === 'report' && (
          <div className="p-8 overflow-y-auto space-y-6 print:p-0 print:space-y-4 font-sans text-sm">
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
            <div className="grid grid-cols-4 gap-3 text-center">
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
                모둠별 세부 성취 결과
              </h3>
              <table className="w-full text-left border-collapse border border-slate-200 rounded-xl overflow-hidden text-xs">
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
        )}

        {/* 2. NEIS 생활기록부 세특 탭 */}
        {activeTab === 'neis' && (
          <div className="p-8 overflow-y-auto space-y-6">
            {/* 공통 추천 문구 */}
            <div className="p-5 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-indigo-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  학급 전체 공통 특기사항 추천 문구
                </h3>
                <button
                  onClick={() => copyToClipboard(generalNeisComments.join('\n\n'), () => {
                    setCopiedGeneral(true);
                    setTimeout(() => setCopiedGeneral(false), 2000);
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
                모둠별 맞춤형 관찰평가 세특 서술문
              </h3>
              <div className="grid gap-3">
                {sortedScores.map((group, idx) => {
                  const text = generateGroupNeis(group, idx + 1);
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
                          setTimeout(() => setCopiedGroupIdx(null), 2000);
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
            body * { visibility: hidden; }
            .print\\:hidden { display: none !important; }
            .fixed { position: static !important; background: white !important; }
            div[class*="backdrop-blur"] { backdrop-filter: none !important; background: white !important; }
            div[class*="max-w-"] { max-width: 100% !important; box-shadow: none !important; }
            div[class*="overflow-y-auto"] { overflow: visible !important; }
            div[class*="max-h-"] { max-height: none !important; }
            .fixed * { visibility: visible; }
          }
        `}</style>
      </div>
    </div>
  );
};
