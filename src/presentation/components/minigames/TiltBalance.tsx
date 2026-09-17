import { useState, useEffect, useRef } from 'react';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

export const TiltBalance = ({ groupId, enqueueAction }: Props) => {
  const [ballX, setBallX] = useState(50);
  const [ballY, setBallY] = useState(50);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);

  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0; // left-right tilt
      const beta = e.beta ?? 0;   // front-back tilt
      const newX = Math.max(5, Math.min(95, 50 + gamma * 1.5));
      const newY = Math.max(5, Math.min(95, 50 + (beta - 45) * 1.5));
      setBallX(newX);
      setBallY(newY);
      // 중앙 근처(30~70)에 있으면 점수 증가
      if (newX > 30 && newX < 70 && newY > 30 && newY < 70) {
        setScore(s => { const n = s + 1; scoreRef.current = n; return n; });
      }
    };
    window.addEventListener('deviceorientation', handler);
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); setFinished(true); enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: Math.floor(scoreRef.current / 2) }, timestamp: Date.now() }); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { window.removeEventListener('deviceorientation', handler); clearInterval(timer); };
  }, []);

  const inZone = ballX > 30 && ballX < 70 && ballY > 30 && ballY < 70;

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none">
      <div className="flex justify-between w-full max-w-sm mb-4 relative z-10">
        <div><span className="text-cyan-400 text-sm font-bold">안정 점수</span><div className="text-white text-2xl font-black">{score}</div></div>
        <div className="text-right"><span className="text-cyan-400 text-sm font-bold">남은 시간</span><div className={`text-2xl font-black ${timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}>{timeLeft}초</div></div>
      </div>
      <h1 className="text-2xl font-black text-white mb-2 text-center relative z-10">⚖️ 균형 잡기</h1>
      <p className="text-slate-400 font-bold mb-4 text-center text-xs relative z-10">폰을 수평으로 유지하세요! 공을 중앙에 모으세요!</p>
      <div className="relative w-72 h-72 bg-slate-800 rounded-3xl border-2 border-slate-700 overflow-hidden z-10">
        {/* 중앙 안전 영역 */}
        <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] border-2 border-dashed border-cyan-500/30 rounded-2xl" />
        <div className="absolute top-[45%] left-[45%] w-[10%] h-[10%] bg-cyan-500/20 rounded-full" />
        {/* 공 */}
        <div className={`absolute w-8 h-8 rounded-full transition-all duration-75 ${inZone ? 'bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)]' : 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]'}`}
          style={{ left: `${ballX}%`, top: `${ballY}%`, transform: 'translate(-50%,-50%)' }} />
      </div>
      <p className={`mt-4 font-black text-lg ${inZone ? 'text-cyan-400' : 'text-red-400'}`}>{inZone ? '✅ 안정!' : '⚠️ 균형을 잡으세요!'}</p>
      {finished && <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center"><div className="text-6xl font-black text-cyan-400 mb-4">{score}점!</div><p className="text-xl text-white font-bold">+{Math.floor(score / 2)}점</p></div>}
    </div>
  );
};
