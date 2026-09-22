import { useState, useEffect, useRef } from 'react';
import { sfxCoin, hapticTap, sfxTimerTick, sfxUrgentWarning } from '../../../application/soundEffects';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

export const SquatCounter = ({ groupId, enqueueAction }: Props) => {
  const [squats, setSquats] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [finished, setFinished] = useState(false);
  const [phase, setPhase] = useState<'up' | 'down'>('up');
  const squatsRef = useRef(0);
  const lastZ = useRef(0);

  useEffect(() => {
    const handler = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const z = acc.z ?? 0;
      if (phase === 'up' && z < -2 && lastZ.current >= -2) { setPhase('down'); }
      if (phase === 'down' && z > 5 && lastZ.current <= 5) {
        setPhase('up');
        sfxCoin();
        hapticTap();
        setSquats(s => { const n = s + 1; squatsRef.current = n; return n; });
      }
      lastZ.current = z;
    };
    window.addEventListener('devicemotion', handler);
    let lastWarnSec = -1;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); setFinished(true); enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: squatsRef.current * 40 }, timestamp: Date.now() }); return 0; }
        const next = prev - 1;
        if (next > 0 && next < 10 && next !== lastWarnSec) {
          lastWarnSec = next;
          sfxTimerTick(next);
          if (next === 3) sfxUrgentWarning();
        }
        return next;
      });
    }, 1000);
    return () => { window.removeEventListener('devicemotion', handler); clearInterval(timer); };
  }, [phase]);

  const triggerSquat = () => {
    if (finished) return;
    if (phase === 'up') {
      setPhase('down');
    } else {
      setPhase('up');
      sfxCoin();
      hapticTap();
      setSquats(s => { const n = s + 1; squatsRef.current = n; return n; });
    }
  };

  return (
    <div 
      onClick={triggerSquat}
      className="min-h-[100dvh] bg-purple-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none cursor-pointer"
    >
      <div className="flex justify-between w-full max-w-sm mb-6 relative z-10">
        <div><span className="text-purple-400 text-sm font-bold">스쿼트</span><div className="text-white text-3xl font-black">{squats}</div></div>
        <div className="text-right"><span className="text-purple-400 text-sm font-bold">남은 시간</span><div className={`text-3xl font-black ${timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}>{timeLeft}초</div></div>
      </div>
      <span className={`text-8xl mb-4 transition-transform duration-300 ${phase === 'down' ? 'scale-75 translate-y-8' : 'scale-100'}`}>🏋️</span>
      <h1 className="text-3xl font-black text-white mb-2 text-center">스쿼트 챌린지</h1>
      <p className="text-purple-300 font-bold mb-4 text-center text-sm">폰을 가슴에 대고 스쿼트하거나 화면을 터치하세요!</p>
      <div className="text-2xl font-black text-purple-400">{phase === 'down' ? '⬇️ 내려가는 중... (다시 터치하여 일어나기)' : '⬆️ 올라오세요! (터치하여 앉기)'}</div>
      {finished && <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center"><div className="text-6xl font-black text-purple-400 mb-4">{squats}회!</div><p className="text-xl text-white font-bold">+{squats * 40}점</p></div>}
    </div>
  );
};
