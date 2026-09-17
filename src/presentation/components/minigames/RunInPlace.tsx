import { useState, useEffect, useRef } from 'react';
import { sfxClick } from '../../../application/soundEffects';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

export const RunInPlace = ({ groupId, enqueueAction }: Props) => {
  const [steps, setSteps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [finished, setFinished] = useState(false);
  const stepsRef = useRef(0);
  const lastMag = useRef(0);
  const rising = useRef(false);
  const cooldown = useRef(false);

  useEffect(() => {
    const handler = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || cooldown.current) return;
      const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);
      if (!rising.current && mag > 13) { rising.current = true; }
      if (rising.current && mag < 8) {
        rising.current = false;
        cooldown.current = true;
        sfxClick();
        setSteps(s => { const n = s + 1; stepsRef.current = n; return n; });
        setTimeout(() => { cooldown.current = false; }, 200);
      }
      lastMag.current = mag;
    };
    window.addEventListener('devicemotion', handler);
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); setFinished(true); enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: stepsRef.current * 10 }, timestamp: Date.now() }); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { window.removeEventListener('devicemotion', handler); clearInterval(timer); };
  }, []);

  const triggerStep = () => {
    if (finished) return;
    sfxClick();
    setSteps(s => { const n = s + 1; stepsRef.current = n; return n; });
  };

  return (
    <div 
      onClick={triggerStep}
      className="min-h-[100dvh] bg-green-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none cursor-pointer"
    >
      <div className="flex justify-between w-full max-w-sm mb-6 relative z-10">
        <div><span className="text-green-400 text-sm font-bold">걸음수</span><div className="text-white text-3xl font-black">{steps}</div></div>
        <div className="text-right"><span className="text-green-400 text-sm font-bold">남은 시간</span><div className={`text-3xl font-black ${timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}>{timeLeft}초</div></div>
      </div>
      <span className={`text-8xl mb-4 ${steps % 2 === 0 ? '-rotate-12' : 'rotate-12'} transition-transform`}>🏃</span>
      <h1 className="text-3xl font-black text-white mb-2 text-center">제자리 달리기!</h1>
      <p className="text-green-300 font-bold mb-4 text-center text-sm">폰을 손에 들고 제자리에서 뛰거나 화면을 연타하세요!</p>
      <div className="w-full max-w-xs h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
        <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all" style={{ width: `${Math.min(100, steps * 2)}%` }} />
      </div>
      <p className="text-green-500 text-xs mt-2 font-bold">목표: 50걸음! (화면 어디든 터치 가능)</p>
      {finished && <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center"><div className="text-6xl font-black text-green-400 mb-4">{steps}걸음!</div><p className="text-xl text-white font-bold">+{steps * 10}점</p></div>}
    </div>
  );
};
