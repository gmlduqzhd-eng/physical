import React, { useState } from 'react';
import type { GameRoom, RoomGroup } from '../../domain/types';
import { Printer, Copy, Check, X, Award, Users, Trophy, BookOpen } from 'lucide-react';

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
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const totalScore = scores.reduce((acc, s) => acc + s.score, 0);
  const avgScore = scores.length > 0 ? Math.round(totalScore / scores.length) : 0;
  const defusedCount = scores.filter(s => s.is_defused).length;
  const top1 = sortedScores[0];
  const top2 = sortedScores[1];
  const top3 = sortedScores[2];

  // 나이스(NEIS) 생활기록부 추천 서술형 문구
  const generatedComments = [
    `[협동 및 문제해결] 모둠원 간의 적극적인 의사소통과 전략적 역할 분담을 통해 다양한 체육 신체활동 미션을 성실히 완수함.`,
    `[건강 및 체력] 지속적인 신체 움직임과 인터랙티브 체력 측정 활동에 자발적으로 참여하며, 높은 근지구력과 순발력을 발휘함.`,
    `[스포츠맨십 및 규칙 준수] 스마트 체육 환경에서 안전 수칙을 준수하고 상대 모둠과 상호 격려하며 즐겁게 수업에 임함.`
  ];

  const handleCopyComments = async () => {
    const text = generatedComments.join('\n\n');
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback or ignore
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white text-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* 상단 툴바 (화면 표시용) */}
        <div className="print:hidden bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg">
              <Trophy className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-black">수업 결과 및 성취도 리포트</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>인쇄 / PDF 저장</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="닫기"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 인쇄 본문 (Report Printable Content) */}
        <div className="p-8 overflow-y-auto space-y-6 print:p-0 print:space-y-4 font-sans text-sm">
          {/* 타이틀 헤더 */}
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

          {/* 핵심 지표 통계 */}
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
              <span className="text-xs text-emerald-700 font-bold block mb-1">최종 해체 모둠</span>
              <span className="text-2xl font-black text-emerald-700 font-mono">{defusedCount}</span>
              <span className="text-[11px] text-emerald-600 block">개 조 ({scores.length > 0 ? Math.round((defusedCount/scores.length)*100) : 0}%)</span>
            </div>
          </div>

          {/* 명예의 전당 Top 3 */}
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

          {/* 모둠별 종합 결과 테이블 */}
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

          {/* 나이스(NEIS) 생활기록부 추천 문구 */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                학교생활기록부 관찰평가 추천 서술형 문구
              </h3>
              <button
                onClick={handleCopyComments}
                className="print:hidden flex items-center gap-1 text-[11px] font-bold text-cyan-700 hover:text-cyan-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? '복사됨!' : '문구 복사'}</span>
              </button>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside bg-white p-3 rounded-xl border border-slate-200">
              {generatedComments.map((c, i) => (
                <li key={i} className="leading-relaxed">{c}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* 인쇄 스타일 */}
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print\\:hidden { display: none !important; }
            .fixed { position: static !important; background: white !important; }
            div[class*="backdrop-blur"] { backdrop-filter: none !important; background: white !important; }
            div[class*="max-w-3xl"] { max-width: 100% !important; box-shadow: none !important; }
            div[class*="overflow-y-auto"] { overflow: visible !important; }
            div[class*="max-h-"] { max-height: none !important; }
            .fixed * { visibility: visible; }
          }
        `}</style>
      </div>
    </div>
  );
};
