import { useState, useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const StopwatchGame = ({ groupId, enqueueAction }: Props) => {
  const [running, setRunning] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const [finished, setFinished] = useState(false);
  const [diff, setDiff] = useState<number | null>(null);
  const lockRef = useRef(false);

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 10);

    return () => clearInterval(interval);
  }, [running]);

  const handleStop = () => {
    if (lockRef.current || !running) return;
    lockRef.current = true;
    
    setRunning(false);
    setFinished(true);
    
    const finalElapsed = Date.now() - startTimeRef.current;
    setElapsed(finalElapsed);
    
    const timeDiff = Math.abs(finalElapsed - 7000);
    setDiff(timeDiff);

    if (timeDiff <= 200) {
      enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 500 }, timestamp: Date.now() });
    } else if (timeDiff <= 500) {
      enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 200 }, timestamp: Date.now() });
    }
  };

  const isPerfect = diff !== null && diff <= 200;
  const isGood = diff !== null && diff > 200 && diff <= 500;
  
  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none">
      <div className="absolute inset-0 bg-cyan-900/10"></div>
      
      <LucideIcons.Timer className={`w-24 h-24 ${finished ? (isPerfect ? 'text-emerald-400' : isGood ? 'text-yellow-400' : 'text-red-500') : 'text-cyan-400 animate-pulse'} mb-8 relative z-10`} />

      <h1 className="text-4xl font-black text-white mb-2 text-center relative z-10">스탑워치 눈치 게임</h1>
      <p className="text-cyan-200 font-bold mb-12 text-center relative z-10">마음속으로 숫자를 세어<br/><span className="text-yellow-300">정확히 7.00초</span>에 멈추세요!</p>
      
      <div className="text-8xl font-black text-white mb-12 relative z-10 font-mono tracking-tighter">
        {running && elapsed > 2000 ? (
          <span className="text-slate-500">?.??</span>
        ) : (
          (elapsed / 1000).toFixed(2)
        )}
      </div>

      {!finished ? (
        <button 
          onClick={handleStop}
          className="w-full max-w-xs py-6 bg-red-600 hover:bg-red-500 rounded-3xl font-black text-3xl text-white shadow-[0_10px_0_rgba(153,27,27,1)] active:shadow-[0_0px_0_rgba(153,27,27,1)] active:translate-y-[10px] transition-all relative z-10"
        >
          STOP!
        </button>
      ) : (
        <div className="flex flex-col items-center relative z-10 mt-8">
          <div className={`text-5xl font-black mb-4 ${isPerfect ? 'text-emerald-400' : isGood ? 'text-yellow-400' : 'text-red-500'}`}>
            {isPerfect ? 'PERFECT!' : isGood ? 'GOOD!' : 'FAIL...'}
          </div>
          <div className="text-xl text-white font-bold">
            오차: {(diff! / 1000).toFixed(2)}초
          </div>
          <div className="text-lg text-cyan-300 mt-2 font-bold">
            {isPerfect ? '+500점 획득!' : isGood ? '+200점 획득!' : '점수 획득 실패'}
          </div>
        </div>
      )}
    </div>
  );
};
