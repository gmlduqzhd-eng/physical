import { useState, useEffect, useRef } from 'react';
interface Props { groupId: string; enqueueAction: (a: any) => void; }
export const OneLegBalance = ({ groupId, enqueueAction }: Props) => {
  const [holdTime, setHoldTime] = useState(0); const [stable, setStable] = useState(false); const [finished, setFinished] = useState(false);
  const holdRef = useRef(0); const TARGET = 20;
  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      const beta = e.beta ?? 0; const gamma = e.gamma ?? 0;
      setStable(Math.abs(gamma) < 15 && Math.abs(beta - 45) < 20);
    };
    window.addEventListener('deviceorientation', handler);
    const timer = setInterval(() => {
      if (finished) return;
      setHoldTime(prev => { if (!stable) return prev;
        const next = prev + 1; holdRef.current = next;
        if (next >= TARGET) { setFinished(true); enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 500 }, timestamp: Date.now() }); }
        return next; });
    }, 1000);
    return () => { window.removeEventListener('deviceorientation', handler); clearInterval(timer); };
  }, [stable, finished]);
  return (
    <div className={`min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none transition-colors ${stable ? 'bg-emerald-950' : 'bg-orange-950'}`}>
      <h1 className="text-3xl font-black text-white mb-2 text-center">🦩 한 발 서기</h1>
      <p className="text-slate-300 font-bold mb-6 text-center text-sm">폰을 들고 한 발로 서세요!</p>
      <span className="text-8xl mb-4">🦩</span>
      <div className="text-7xl font-black text-white mb-4">{holdTime}<span className="text-3xl">초</span></div>
      <div className="w-full max-w-xs h-5 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mb-4">
        <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all" style={{ width: `${(holdTime / TARGET) * 100}%` }} />
      </div>
      <p className={`font-black text-lg ${stable ? 'text-emerald-400' : 'text-orange-400'}`}>{stable ? '✅ 안정적!' : '⚠️ 흔들려요!'}</p>
      {finished && <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center"><div className="text-5xl font-black text-emerald-400 mb-4">{holdTime}초 성공!</div><p className="text-xl text-white font-bold">+500점</p></div>}
    </div>);
};
