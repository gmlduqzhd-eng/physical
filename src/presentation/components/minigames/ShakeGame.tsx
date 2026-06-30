import { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const ShakeGame = ({ groupId, enqueueAction }: Props) => {
  const [progress, setProgress] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [won, setWon] = useState(false);

  useEffect(() => {
    if (finished) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setFinished(true);
          setWon(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const handleMotion = (event: DeviceMotionEvent) => {
      if (finished) return;
      const y = event.acceleration?.y || 0;
      const x = event.acceleration?.x || 0;
      
      // If shaken hard enough
      if (Math.abs(y) > 15 || Math.abs(x) > 15) {
        handleProgress(2);
      }
    };

    window.addEventListener('devicemotion', handleMotion);

    return () => {
      clearInterval(timer);
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [finished]);

  const handleProgress = (amount: number = 5) => {
    if (finished) return;
    
    setProgress((p) => {
      if (p >= 100) return 100;
      const next = p + amount;
      if (next >= 100) {
        setFinished(true);
        setWon(true);
        submitScore();
        return 100;
      }
      return next;
    });
  };

  const submitScore = () => {
    enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 500 }, timestamp: Date.now() });
  };

  return (
    <div 
      className="min-h-[100dvh] bg-yellow-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none" 
      onTouchStart={() => handleProgress(5)} 
      onMouseDown={() => handleProgress(5)}
    >
      <div className="absolute inset-0 bg-yellow-500/10 animate-pulse"></div>
      
      <div className="text-white text-2xl font-bold mb-2 relative z-10">남은 시간</div>
      <div className="text-6xl font-black text-yellow-400 mb-8 relative z-10 font-mono">
        {timeLeft}초
      </div>

      <LucideIcons.BatteryCharging className={`w-32 h-32 ${progress > 80 ? 'text-emerald-400' : progress > 40 ? 'text-yellow-400' : 'text-red-500'} mb-8 relative z-10 ${progress > 0 ? 'animate-bounce' : ''}`} />

      <h1 className="text-4xl font-black text-white mb-2 text-center relative z-10">바운스 충전!</h1>
      <p className="text-yellow-200 font-bold mb-12 text-center relative z-10">스마트폰을 위아래로 흔들거나<br/>화면을 미친듯이 연타해서 100%를 만드세요!</p>
      
      <div className="w-full max-w-sm h-16 bg-black/50 rounded-2xl border-4 border-yellow-700 relative overflow-hidden z-10 mb-8 flex items-center justify-center p-1">
        <div 
          className="absolute left-1 top-1 bottom-1 bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 rounded-xl transition-all duration-100 ease-out"
          style={{ width: `calc(${progress}% - 8px)` }}
        ></div>
        <span className="relative z-20 text-white font-black text-2xl drop-shadow-md">
          {Math.floor(progress)}%
        </span>
      </div>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className={`text-6xl font-black mb-4 ${won ? 'text-emerald-400' : 'text-red-500'}`}>
            {won ? 'CHARGE COMPLETE!' : 'FAILED...'}
          </div>
          <p className="text-xl text-white font-bold">
            {won ? '+500점 획득!' : '충전에 실패했습니다.'}
          </p>
        </div>
      )}
    </div>
  );
};
