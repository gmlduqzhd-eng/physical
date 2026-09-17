import { useState, useEffect, useRef } from 'react';
import { sfxCoin } from '../../../application/soundEffects';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

export const PunchCounter = ({ groupId, enqueueAction }: Props) => {
  const [punches, setPunches] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [finished, setFinished] = useState(false);
  const [flash, setFlash] = useState(false);
  const punchRef = useRef(0);
  const cooldown = useRef(false);

  useEffect(() => {
    const handler = (e: DeviceMotionEvent) => {
      if (cooldown.current) return;
      const a = e.acceleration;
      if (!a) return;
      const forward = Math.abs(a.z ?? 0);
      if (forward > 10) {
        cooldown.current = true;
        sfxCoin();
        setPunches(p => { const n = p + 1; punchRef.current = n; return n; });
        setFlash(true);
        setTimeout(() => { setFlash(false); cooldown.current = false; }, 300);
      }
    };
    window.addEventListener('devicemotion', handler);
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); setFinished(true); enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: punchRef.current * 20 }, timestamp: Date.now() }); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { window.removeEventListener('devicemotion', handler); clearInterval(timer); };
  }, []);

  return (
    <div className={`min-h-[100dvh] bg-red-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none transition-colors ${flash ? '!bg-red-800' : ''}`}>
      <div className="flex justify-between w-full max-w-sm mb-6 relative z-10">
        <div><span className="text-red-400 text-sm font-bold">펀치</span><div className="text-white text-3xl font-black">{punches}</div></div>
        <div className="text-right"><span className="text-red-400 text-sm font-bold">남은 시간</span><div className={`text-3xl font-black ${timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}>{timeLeft}초</div></div>
      </div>
      <span className={`text-8xl mb-4 transition-transform ${flash ? 'scale-125 rotate-12' : ''}`}>🥊</span>
      <h1 className="text-3xl font-black text-white mb-2 text-center">에어 펀치!</h1>
      <p className="text-red-300 font-bold text-center text-sm">폰을 들고 허공에 주먹을 뻗으세요!</p>
      <div className="w-full max-w-xs h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mt-6">
        <div className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all" style={{ width: `${Math.min(100, punches * 3)}%` }} />
      </div>
      {finished && <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center"><div className="text-6xl font-black text-red-400 mb-4">{punches}회!</div><p className="text-xl text-white font-bold">+{punches * 20}점</p></div>}
    </div>
  );
};
