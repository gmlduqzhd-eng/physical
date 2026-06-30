import { useState, useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import type { GameRoom } from '../../../domain/types';

interface Props {
  gameRoom: GameRoom;
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const TelepathyGame = ({ gameRoom, groupId, enqueueAction }: Props) => {
  const [diff, setDiff] = useState<number | null>(null);
  const lockRef = useRef(false);
  const [timeLeft, setTimeLeft] = useState<string>('0.00');
  const minigame = gameRoom.active_minigame;

  useEffect(() => {
    const target = minigame.target_time || Date.now() + 5000;
    
    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = target - now;
      
      if (remaining > 0) {
        setTimeLeft((remaining / 1000).toFixed(2));
      } else {
        setTimeLeft('0.00');
        if (diff === null && remaining < -2000) {
          // Missed it completely
          setDiff(9999);
        }
      }
    }, 10);

    return () => clearInterval(timer);
  }, [minigame.target_time, diff]);

  const handleTap = () => {
    if (lockRef.current) return;
    lockRef.current = true;
    
    const target = minigame.target_time || Date.now();
    const currentDiff = Math.abs(Date.now() - target);
    setDiff(currentDiff);

    if (currentDiff <= 300) {
      enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 500 }, timestamp: Date.now() });
    } else if (currentDiff <= 1000) {
      enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 100 }, timestamp: Date.now() });
    }
  };

  const isPerfect = diff !== null && diff <= 300;
  const isGood = diff !== null && diff > 300 && diff <= 1000;

  return (
    <div className="min-h-[100dvh] bg-indigo-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none" onTouchStart={handleTap} onMouseDown={handleTap}>
      <div className="absolute inset-0 bg-indigo-500/10 animate-pulse"></div>
      
      <LucideIcons.Wifi className={`w-32 h-32 ${diff === null ? 'text-indigo-400 animate-pulse' : isPerfect ? 'text-emerald-400' : isGood ? 'text-yellow-400' : 'text-red-500'} mb-8 relative z-10`} />

      <h1 className="text-4xl font-black text-white mb-2 text-center relative z-10">텔레파시 동기화</h1>
      <p className="text-indigo-200 font-bold mb-12 text-center relative z-10">타이머가 정확히 0.00이 되는 순간 터치하세요!</p>
      
      {diff === null ? (
        <div className="text-8xl font-black text-white mb-12 relative z-10 font-mono tracking-tighter">
          {timeLeft}
        </div>
      ) : (
        <div className="flex flex-col items-center relative z-10 mb-12">
          <div className={`text-6xl font-black mb-4 ${isPerfect ? 'text-emerald-400' : isGood ? 'text-yellow-400' : 'text-red-500'}`}>
            {isPerfect ? 'PERFECT!' : isGood ? 'GOOD' : 'FAIL'}
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            오차: {(diff / 1000).toFixed(2)}초
          </div>
          <div className="text-lg text-indigo-300 mt-2 font-bold">
            {isPerfect ? '+500점 획득!' : isGood ? '+100점 획득!' : '점수 획득 실패'}
          </div>
        </div>
      )}
      
      <div className="absolute bottom-10 text-indigo-300/50 text-sm font-bold">
        {diff === null ? '준비하시고...' : '잠시 후 화면이 닫힙니다'}
      </div>
    </div>
  );
};
