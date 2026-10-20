import { useEffect, useState } from 'react';
import type { PhysicalActivityPlan } from '../../domain/physicalActivityPlans';

export type ActivityEvidence = 'peer-report' | 'screen-only';

interface Props {
  plan: PhysicalActivityPlan;
  onFinish: (evidence: ActivityEvidence) => void;
  onExit: () => void;
}

/** A classroom routine and an honest peer report, not a movement sensor. */
export function PhysicalActivityCheck({ plan, onFinish, onExit }: Props) {
  const [turn, setTurn] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [adapted, setAdapted] = useState(false);

  useEffect(() => {
    if (startedAt === null) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [startedAt]);

  const remaining = startedAt === null ? plan.secondsPerTurn : Math.max(0, plan.secondsPerTurn - Math.floor((now - startedAt) / 1000));

  const confirmTurn = () => {
    if (remaining > 0 || startedAt === null) return;
    if (turn === 0) {
      setTurn(1);
      setStartedAt(null);
    } else {
      onFinish('peer-report');
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="activity-check-title" className="fixed inset-0 z-[10004] flex items-center justify-center overflow-y-auto bg-slate-950/95 p-4 text-white">
      <div className="my-auto w-full max-w-md rounded-3xl border border-cyan-500/40 bg-slate-900 p-5 shadow-2xl">
        <p className="mb-2 text-xs font-bold text-cyan-300">실제 활동 · {plan.idea}번 개선안</p>
        <h2 id="activity-check-title" className="mb-3 text-2xl font-black">{plan.title}</h2>
        <p className="mb-3 text-sm leading-6">{adapted ? plan.alternative : plan.activity}</p>
        <p className="mb-2 rounded-xl bg-slate-800 p-3 text-xs text-slate-200">준비: {plan.setup}<br />안전: {plan.safety}</p>
        <label className="mb-4 flex items-center gap-2 text-sm text-cyan-100">
          <input type="checkbox" checked={adapted} onChange={event => setAdapted(event.target.checked)} className="h-5 w-5 accent-cyan-500" />
          대체 동작으로 참여하기
        </label>
        <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-950 p-4 text-center">
          <p className="text-sm font-bold">{turn + 1}번 학생 활동 · 짝은 관찰하기</p>
          <p role="timer" className="my-2 text-4xl font-black text-cyan-300">{remaining}초</p>
          <p className="text-xs text-slate-400">두 학생이 각각 한 차례 참여한 뒤 짝이 기록합니다.</p>
        </div>
        {startedAt === null ? (
          <button type="button" onClick={() => { setNow(Date.now()); setStartedAt(Date.now()); }} className="w-full rounded-xl bg-cyan-600 px-4 py-3 font-bold">{turn + 1}번 학생 시작</button>
        ) : (
          <button type="button" disabled={remaining > 0} onClick={confirmTurn} className="w-full rounded-xl bg-cyan-600 px-4 py-3 font-bold disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
            {turn === 0 ? '짝이 보고 확인 · 역할 바꾸기' : '짝이 보고 확인 · 활동 기록'}
          </button>
        )}
        <p className="mt-3 text-center text-xs leading-5 text-amber-200">이 버튼은 짝의 확인 기록입니다. 기기가 신체 움직임을 측정한 결과가 아닙니다.</p>
        <button type="button" onClick={() => onFinish('screen-only')} className="mt-3 w-full rounded-xl border border-slate-600 px-4 py-3 text-sm text-slate-300">활동을 못했어요 · 화면 게임으로만 기록</button>
        <button type="button" onClick={onExit} className="mt-2 w-full px-4 py-2 text-sm text-slate-400">활동 목록으로</button>
      </div>
    </div>
  );
}
