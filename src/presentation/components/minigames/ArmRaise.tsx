import { useState, useEffect, useRef } from 'react';
import { sfxCoin } from '../../../application/soundEffects';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

export const ArmRaise = ({ groupId, enqueueAction }: Props) => {
  const [count, setCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [finished, setFinished] = useState(false);
  const [isUp, setIsUp] = useState(false);
  const countRef = useRef(0);
  const wasDown = useRef(true);

  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      const beta = e.beta ?? 0;
      if (beta < -30 && wasDown.current) {
        // 팔을 위로 올림
        setIsUp(true);
        wasDown.current = false;
        sfxCoin();
        setCount(c => { const n = c + 1; countRef.current = n; return n; });
      }
      if (beta > 30) {
        setIsUp(false);
        wasDown.current = true;
      }
    };
    window.addEventListener('deviceorientation', handler);
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); setFinished(true); enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: countRef.current * 30 }, timestamp: Date.now() }); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { window.removeEventListener('deviceorientation', handler); clearInterval(timer); };
  }, []);

  return (
    <div className={`min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none transition-colors ${isUp ? 'bg-yellow-900' : 'bg-orange-950'}`}>
      <div className="flex justify-between w-full max-w-sm mb-6 relative z-10">
        <div><span className="text-orange-400 text-sm font-bold">횟수</span><div className="text-white text-3xl font-black">{count}</div></div>
        <div className="text-right"><span className="text-orange-400 text-sm font-bold">남은 시간</span><div className={`text-3xl font-black ${timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}>{timeLeft}초</div></div>
      </div>
      <span className={`text-8xl mb-4 transition-transform duration-300 ${isUp ? '-translate-y-12 scale-110' : ''}`}>🙌</span>
      <h1 className="text-3xl font-black text-white mb-2 text-center">하늘 높이!</h1>
      <p className="text-orange-300 font-bold text-center text-sm">{isUp ? '⬆️ 올렸어요! 다시 내리세요!' : '⬇️ 팔을 하늘 높이 올리세요!'}</p>
      {finished && <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center"><div className="text-6xl font-black text-orange-400 mb-4">{count}회!</div><p className="text-xl text-white font-bold">+{count * 30}점</p></div>}
    </div>
  );
};
