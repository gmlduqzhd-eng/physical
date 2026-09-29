import { useState, useEffect, useRef } from 'react';
interface Props { groupId: string; enqueueAction: (a: any) => void; }
export const OneLegBalance = ({ groupId, enqueueAction }: Props) => {
  const [holdTime, setHoldTime] = useState(0);
  const [stable, setStable] = useState(false);
  const [finished, setFinished] = useState(false);
  const holdRef = useRef(0);
  const stableRef = useRef(false);
  const finishedRef = useRef(false);
  const isPointerHolding = useRef(false);
  const TARGET = 20;

  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      const beta = e.beta ?? 0;
      const gamma = e.gamma ?? 0;
      const isMotionStable = Math.abs(gamma) < 15 && Math.abs(beta - 45) < 20;
      const currentStable = isMotionStable || isPointerHolding.current;
      stableRef.current = currentStable;
      setStable(currentStable);
    };
    window.addEventListener('deviceorientation', handler);

    const timer = setInterval(() => {
      if (finishedRef.current) return;
      if (!stableRef.current) return;

      const next = holdRef.current + 1;
      holdRef.current = next;
      setHoldTime(next);

      if (next >= TARGET && !finishedRef.current) {
        finishedRef.current = true;
        setFinished(true);
        enqueueAction({
          id: Math.random().toString(),
          type: 'INCREMENT_SCORE',
          payload: { id: groupId, amount: 500 },
          timestamp: Date.now()
        });
      }
    }, 1000);

    return () => {
      window.removeEventListener('deviceorientation', handler);
      clearInterval(timer);
    };
  }, [groupId, enqueueAction]);

  const handlePointerDown = () => {
    if (finishedRef.current) return;
    isPointerHolding.current = true;
    stableRef.current = true;
    setStable(true);
  };

  const handlePointerUp = () => {
    isPointerHolding.current = false;
    stableRef.current = false;
    setStable(false);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={`min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none transition-colors cursor-pointer touch-none ${
        stable ? 'bg-emerald-950' : 'bg-orange-950'
      }`}
    >
      <h1 className="text-3xl font-black text-white mb-2 text-center">🦩 한 발 서기</h1>
      <p className="text-slate-300 font-bold mb-4 text-center text-sm">
        스마트폰을 들고 한 발로 서서 균형을 잡거나 화면을 꾹 누르고 버티세요!
      </p>
      <span className={`text-8xl mb-4 transition-transform duration-300 ${stable ? 'scale-110' : 'rotate-6'}`}>🦩</span>
      <div className="text-7xl font-black text-white mb-4 font-mono">
        {holdTime}<span className="text-3xl">초</span>
      </div>
      <div className="w-full max-w-xs h-5 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mb-4">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
          style={{ width: `${(holdTime / TARGET) * 100}%` }}
        />
      </div>
      <p className={`font-black text-lg ${stable ? 'text-cyan-300 animate-pulse' : 'text-orange-400'}`}>
        {stable ? '✅ 중심 유지 중! 버티세요!' : '⚠️ 흔들려요! 수평을 맞추거나 꾹 누르세요!'}
      </p>
      {finished && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center animate-in fade-in">
          <div className="text-5xl font-black text-cyan-300 mb-4">🏆 {holdTime}초 완벽 성공!</div>
          <p className="text-xl text-white font-bold">+500점 획득!</p>
        </div>
      )}
    </div>
  );
};
