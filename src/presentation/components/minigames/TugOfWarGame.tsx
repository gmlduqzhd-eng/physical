import { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import type { GameRoom } from '../../../domain/types';

interface Props {
  gameRoom: GameRoom;
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const TugOfWarGame = ({ groupId, enqueueAction }: Props) => {
  const [progress, setProgress] = useState(50); // Starts at 50, need to reach 100
  const [finished, setFinished] = useState(false);
  const [won, setWon] = useState(false);

  useEffect(() => {
    if (finished) return;

    // Enemy pulls back every 200ms
    const timer = setInterval(() => {
      setProgress(p => {
        const next = p - 1; // Enemy pulls 5 units per second
        if (next <= 0) {
          clearInterval(timer);
          setFinished(true);
          setWon(false);
          return 0;
        }
        return next;
      });
    }, 200);

    return () => clearInterval(timer);
  }, [finished]);

  const handleTap = () => {
    if (finished) return;
    
    setProgress(p => {
      const next = p + 2; // Player pulls 2 units per tap
      if (next >= 100) {
        setFinished(true);
        setWon(true);
        submitScore();
        return 100;
      }
      return next;
    });
  };

  const submitScore = async () => {
    enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 500 }, timestamp: Date.now() });
  };

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none" onTouchStart={handleTap} onMouseDown={handleTap}>
      <LucideIcons.Grab className="w-24 h-24 text-slate-400 mb-6 relative z-10 animate-bounce" />
      
      <h1 className="text-4xl font-black text-white mb-2 text-center relative z-10">스마트 줄다리기!</h1>
      <p className="text-slate-400 font-bold mb-12 text-center relative z-10">괴력을 발휘해 밧줄을 당겨오세요!</p>
      
      <div className="w-full max-w-sm h-12 bg-red-950 rounded-full border-4 border-slate-700 relative overflow-hidden z-10 mb-8 flex items-center">
        {/* Rope Center Indicator */}
        <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white/30 z-20"></div>
        
        {/* Tug Progress */}
        <div 
          className="h-full bg-gradient-to-r from-red-600 to-emerald-500 transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        ></div>
        
        {/* Flag */}
        <div 
          className="absolute text-2xl drop-shadow-md transition-all duration-75 ease-linear z-30 transform -translate-y-1"
          style={{ left: `calc(${progress}% - 15px)` }}
        >
          🚩
        </div>
      </div>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className={`text-6xl font-black mb-4 ${won ? 'text-emerald-400' : 'text-red-500'}`}>
            {won ? 'WIN!' : 'LOSE...'}
          </div>
          <p className="text-xl text-white font-bold">
            {won ? '+500점 획득!' : '밧줄을 빼앗겼습니다.'}
          </p>
        </div>
      )}

      <div className="absolute bottom-10 text-slate-500 text-sm font-bold animate-pulse">
        화면을 미친듯이 연타하세요!
      </div>
    </div>
  );
};
