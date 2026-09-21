import { useState, useEffect, useRef } from 'react';
import { sfxCoin } from '../../../application/soundEffects';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

export const TiltRace = ({ groupId, enqueueAction }: Props) => {
  const [ballX, setBallX] = useState(10);
  const [targetX, setTargetX] = useState(80);
  const [collected, setCollected] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [finished, setFinished] = useState(false);
  const collectedRef = useRef(0);

  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0;
      setBallX(prev => {
        const next = Math.max(0, Math.min(100, prev + gamma * 0.3));
        if (Math.abs(next - targetX) < 10) {
          sfxCoin();
          setCollected(c => { const n = c + 1; collectedRef.current = n; return n; });
          setTargetX(Math.floor(Math.random() * 80) + 10);
        }
        return next;
      });
    };
    window.addEventListener('deviceorientation', handler);
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); setFinished(true); enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: collectedRef.current * 50 }, timestamp: Date.now() }); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { window.removeEventListener('deviceorientation', handler); clearInterval(timer); };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-sky-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none">
      <div className="flex justify-between w-full max-w-sm mb-4 relative z-10">
        <div><span className="text-cyan-300 text-sm font-bold">수집</span><div className="text-white text-2xl font-black">⭐ ×{collected}</div></div>
        <div className="text-right"><span className="text-cyan-300 text-sm font-bold">남은 시간</span><div className={`text-2xl font-black ${timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}>{timeLeft}초</div></div>
      </div>
      <h1 className="text-2xl font-black text-white mb-2 text-center relative z-10">📱 기울기 레이스</h1>
      <p className="text-cyan-200 font-bold mb-4 text-center text-xs relative z-10">폰을 좌우로 기울여 공을 별에 맞추세요!</p>
      <div className="relative w-full max-w-sm h-24 bg-slate-800 rounded-2xl border-2 border-sky-800 overflow-hidden z-10">
        <div className="absolute top-1/2 -translate-y-1/2 text-3xl transition-all duration-75" style={{ left: `${targetX}%`, transform: 'translate(-50%,-50%)' }}>⭐</div>
        <div className="absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.5)] transition-all duration-75" style={{ left: `${ballX}%`, transform: 'translate(-50%,-50%)' }} />
      </div>
      {finished && <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center"><div className="text-6xl font-black text-cyan-300 mb-4">⭐ {collected}개!</div><p className="text-xl text-white font-bold">+{collected * 50}점</p></div>}
    </div>
  );
};
