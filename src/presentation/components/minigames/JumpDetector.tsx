import { useState, useEffect, useRef } from 'react';
import { sfxCoin } from '../../../application/soundEffects';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

export const JumpDetector = ({ groupId, enqueueAction }: Props) => {
  const [jumps, setJumps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [finished, setFinished] = useState(false);
  const [lastJump, setLastJump] = useState(false);
  const jumpsRef = useRef(0);
  const prevAcc = useRef(0);
  const cooldown = useRef(false);

  useEffect(() => {
    const handler = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc || cooldown.current) return;
      const y = acc.y ?? 0;
      const delta = Math.abs(y - prevAcc.current);
      prevAcc.current = y;
      if (delta > 15) {
        cooldown.current = true;
        sfxCoin();
        setJumps(j => { const n = j + 1; jumpsRef.current = n; return n; });
        setLastJump(true);
        setTimeout(() => { setLastJump(false); cooldown.current = false; }, 600);
      }
    };
    window.addEventListener('devicemotion', handler);
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); setFinished(true); enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: jumpsRef.current * 30 }, timestamp: Date.now() }); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { window.removeEventListener('devicemotion', handler); clearInterval(timer); };
  }, []);

  return (
    <div className={`min-h-[100dvh] bg-blue-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none transition-colors ${lastJump ? '!bg-cyan-900' : ''}`}>
      <div className="flex justify-between w-full max-w-sm mb-6 relative z-10">
        <div><span className="text-blue-400 text-sm font-bold">점프 횟수</span><div className="text-white text-3xl font-black">{jumps}</div></div>
        <div className="text-right"><span className="text-blue-400 text-sm font-bold">남은 시간</span><div className={`text-3xl font-black ${timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}>{timeLeft}초</div></div>
      </div>
      <span className={`text-8xl mb-4 transition-transform ${lastJump ? 'scale-125 -translate-y-8' : ''}`}>🦘</span>
      <h1 className="text-3xl font-black text-white mb-2 text-center">점프왕!</h1>
      <p className="text-blue-300 font-bold mb-4 text-center text-sm">폰을 들고 제자리에서 점프하세요!</p>
      <div className="w-full max-w-xs h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative z-10">
        <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all" style={{ width: `${Math.min(100, jumps * 5)}%` }} />
      </div>
      <p className="text-blue-500 text-xs mt-2 font-bold">목표: 20회 점프!</p>
      {finished && <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center"><div className="text-6xl font-black text-cyan-400 mb-4">{jumps}회 점프!</div><p className="text-xl text-white font-bold">+{jumps * 30}점</p></div>}
    </div>
  );
};
