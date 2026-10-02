import { useState, useEffect, useRef } from 'react';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

export const TiltBalance = ({ groupId, enqueueAction }: Props) => {
  const [ballX, setBallX] = useState(50);
  const [ballY, setBallY] = useState(50);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);
  const finishedRef = useRef(false);
  const balancedRef = useRef(false);
  const hasSensorRef = useRef(false);
  const pointerHoldingRef = useRef(false);

  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      if (finishedRef.current || pointerHoldingRef.current || e.beta === null || e.gamma === null) return;
      hasSensorRef.current = true;
      const gamma = e.gamma ?? 0; // left-right tilt
      const beta = e.beta ?? 0;   // front-back tilt
      const newX = Math.max(5, Math.min(95, 50 + gamma * 1.5));
      const newY = Math.max(5, Math.min(95, 50 + (beta - 45) * 1.5));
      setBallX(newX);
      setBallY(newY);
      balancedRef.current = newX > 30 && newX < 70 && newY > 30 && newY < 70;
    };
    window.addEventListener('deviceorientation', handler);
    const scoreTimer = setInterval(() => {
      if (finishedRef.current || !balancedRef.current || (!hasSensorRef.current && !pointerHoldingRef.current)) return;
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }, 50);
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { window.removeEventListener('deviceorientation', handler); clearInterval(timer); clearInterval(scoreTimer); };
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && !finished) {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setFinished(true);
      enqueueAction({
        id: Math.random().toString(),
        type: 'INCREMENT_SCORE',
        payload: { id: groupId, amount: Math.floor(scoreRef.current / 2) },
        timestamp: Date.now()
      });
    }
  }, [timeLeft, finished, groupId, enqueueAction]);

  const inZone = ballX > 30 && ballX < 70 && ballY > 30 && ballY < 70;
  const moveByPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerHoldingRef.current || finishedRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, (e.clientX - rect.left) / rect.width * 100));
    const y = Math.max(5, Math.min(95, (e.clientY - rect.top) / rect.height * 100));
    setBallX(x); setBallY(y);
    balancedRef.current = x > 30 && x < 70 && y > 30 && y < 70;
  };

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none">
      <div className="flex justify-between w-full max-w-sm mb-4 relative z-10">
        <div><span className="text-cyan-400 text-sm font-bold">안정 점수</span><div className="text-white text-2xl font-black">{score}</div></div>
        <div className="text-right"><span className="text-cyan-400 text-sm font-bold">남은 시간</span><div className={`text-2xl font-black ${timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}>{timeLeft}초</div></div>
      </div>
      <h1 className="text-2xl font-black text-white mb-2 text-center relative z-10">⚖️ 균형 잡기</h1>
      <p className="text-slate-400 font-bold mb-4 text-center text-xs relative z-10">폰을 수평으로 유지하거나 화면의 중앙을 누르고 버티세요!</p>
      <div className="relative w-72 h-72 max-w-full bg-slate-800 rounded-3xl border-2 border-slate-700 overflow-hidden z-10 touch-none"
        onPointerDown={e => { if (finishedRef.current) return; pointerHoldingRef.current = true; e.currentTarget.setPointerCapture(e.pointerId); moveByPointer(e); }}
        onPointerMove={moveByPointer}
        onPointerUp={() => { pointerHoldingRef.current = false; balancedRef.current = false; }}
        onPointerCancel={() => { pointerHoldingRef.current = false; balancedRef.current = false; }}>
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
