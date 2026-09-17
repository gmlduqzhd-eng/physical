import { useState, useEffect, useRef } from 'react';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

export const PlankHold = ({ groupId, enqueueAction }: Props) => {
  const [holdTime, setHoldTime] = useState(0);
  const [stable, setStable] = useState(false);
  const [failed, setFailed] = useState(false);
  const [finished, setFinished] = useState(false);
  const holdRef = useRef(0);
  const TARGET = 30;

  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      const beta = e.beta ?? 0;
      const gamma = e.gamma ?? 0;
      const isLevel = Math.abs(beta) < 25 && Math.abs(gamma) < 25;
      setStable(isLevel);
      if (!isLevel && holdRef.current > 3) { setFailed(true); }
    };
    window.addEventListener('deviceorientation', handler);
    const timer = setInterval(() => {
      if (failed || finished) return;
      setHoldTime(prev => {
        if (!stable) return prev;
        const next = prev + 1;
        holdRef.current = next;
        if (next >= TARGET) {
          setFinished(true);
          enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 500 }, timestamp: Date.now() });
        }
        return next;
      });
    }, 1000);
    return () => { window.removeEventListener('deviceorientation', handler); clearInterval(timer); };
  }, [stable, failed, finished]);

  useEffect(() => {
    if (failed && !finished) {
      enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: holdRef.current * 15 }, timestamp: Date.now() });
    }
  }, [failed]);

  return (
    <div className={`min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none transition-colors ${stable ? 'bg-emerald-950' : 'bg-red-950'}`}>
      <h1 className="text-3xl font-black text-white mb-2 text-center">🧘 플랭크 챌린지</h1>
      <p className="text-slate-300 font-bold mb-6 text-center text-sm">폰을 등 위에 올리고 플랭크 자세를 유지하세요!</p>
      <div className="text-8xl font-black text-white mb-4">{holdTime}<span className="text-3xl">초</span></div>
      <div className="w-full max-w-xs h-5 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mb-4">
        <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all" style={{ width: `${(holdTime / TARGET) * 100}%` }} />
      </div>
      <p className="text-sm font-bold">{failed ? '❌ 흔들렸습니다!' : stable ? '✅ 안정적! 계속 유지하세요!' : '⚠️ 수평을 유지하세요!'}</p>
      <p className="text-slate-500 text-xs mt-4 font-bold">목표: {TARGET}초</p>
      {(finished || failed) && <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center"><div className="text-5xl font-black text-emerald-400 mb-4">{holdTime}초 버팀!</div><p className="text-xl text-white font-bold">+{finished ? 500 : holdTime * 15}점</p></div>}
    </div>
  );
};
