import { useState, useEffect, useRef } from 'react';
import { sfxCoin } from '../../../application/soundEffects';
interface Props { groupId: string; enqueueAction: (a: any) => void; }
export const WaveCounter = ({ groupId, enqueueAction }: Props) => {
  const [waves, setWaves] = useState(0); const [timeLeft, setTimeLeft] = useState(15); const [finished, setFinished] = useState(false);
  const wavesRef = useRef(0); const prevX = useRef(0); const dir = useRef<'left'|'right'|null>(null); const cooldown = useRef(false);
  useEffect(() => {
    const handler = (e: DeviceMotionEvent) => { if (cooldown.current) return; const x = e.accelerationIncludingGravity?.x ?? 0;
      if (dir.current === null && Math.abs(x) > 5) dir.current = x > 0 ? 'right' : 'left';
      if (dir.current === 'right' && x < -5) { dir.current = 'left'; cooldown.current = true; sfxCoin(); setWaves(w => { const n = w + 1; wavesRef.current = n; return n; }); setTimeout(() => { cooldown.current = false; }, 200); }
      if (dir.current === 'left' && x > 5) { dir.current = 'right'; cooldown.current = true; sfxCoin(); setWaves(w => { const n = w + 1; wavesRef.current = n; return n; }); setTimeout(() => { cooldown.current = false; }, 200); }
      prevX.current = x; };
    window.addEventListener('devicemotion', handler);
    const timer = setInterval(() => { setTimeLeft(prev => { if (prev <= 1) { clearInterval(timer); setFinished(true); enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: wavesRef.current * 15 }, timestamp: Date.now() }); return 0; } return prev - 1; }); }, 1000);
    return () => { window.removeEventListener('devicemotion', handler); clearInterval(timer); };
  }, []);
  return (
    <div className="min-h-[100dvh] bg-pink-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none">
      <div className="flex justify-between w-full max-w-sm mb-6 relative z-10">
        <div><span className="text-rose-300 text-sm font-bold">흔들기</span><div className="text-white text-3xl font-black">{waves}</div></div>
        <div className="text-right"><span className="text-rose-300 text-sm font-bold">남은 시간</span><div className={`text-3xl font-black ${timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}>{timeLeft}초</div></div>
      </div>
      <span className={`text-8xl mb-4 ${waves % 2 === 0 ? '-rotate-12' : 'rotate-12'} transition-transform`}>👋</span>
      <h1 className="text-3xl font-black text-white mb-2 text-center">좌우 흔들기!</h1>
      <p className="text-rose-200 font-bold text-center text-sm">폰을 좌우로 크게 흔드세요!</p>
      {finished && <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center"><div className="text-6xl font-black text-rose-300 mb-4">{waves}회!</div><p className="text-xl text-white font-bold">+{waves * 15}점</p></div>}
    </div>);
};
