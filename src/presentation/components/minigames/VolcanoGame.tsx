import { useState, useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import type { GameRoom } from '../../../domain/types';

interface Props {
  gameRoom: GameRoom;
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const VolcanoGame = ({ gameRoom, groupId, enqueueAction }: Props) => {
  const [taps, setTaps] = useState(0);
  const tapsRef = useRef(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);
  const minigame = gameRoom.active_minigame;

  useEffect(() => {
    const end = minigame.end_time || Date.now() + 10000;
    
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setTimeLeft(remaining);
      
      if (remaining <= 0 && !finishedRef.current) {
        clearInterval(timer);
        finishedRef.current = true;
        setFinished(true);
        // ref를 사용하여 최신 taps 값 참조
        const reward = tapsRef.current * 5;
        enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: reward }, timestamp: Date.now() });
      }
    }, 100);

    return () => clearInterval(timer);
  }, [minigame.end_time, groupId, enqueueAction]);

  const handleTap = () => {
    if (timeLeft > 0 && !finished) {
      setTaps(t => {
        const next = t + 1;
        tapsRef.current = next;
        return next;
      });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-orange-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none" onTouchStart={handleTap} onMouseDown={handleTap}>
      <div className="absolute inset-0 bg-red-600/20 animate-pulse mix-blend-screen"></div>
      
      <div className="text-white text-2xl font-bold mb-4 relative z-10">남은 시간</div>
      <div className="text-7xl font-black text-yellow-400 mb-12 relative z-10 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">
        {timeLeft}초
      </div>

      <LucideIcons.Flame className={`w-40 h-40 ${taps % 2 === 0 ? 'text-orange-500 scale-110' : 'text-red-500 scale-90'} transition-transform duration-75 relative z-10 mb-8`} />

      <h1 className="text-4xl font-black text-white mb-2 text-center relative z-10">화산 폭발!</h1>
      <p className="text-orange-300 font-bold mb-8 text-center relative z-10">화면을 빠르게 연타해서 탈출하세요!</p>
      
      <div className="text-5xl font-black text-white relative z-10">
        {taps} HIT!
      </div>
      
      <div className="absolute bottom-10 text-orange-200/50 text-sm font-bold animate-pulse">
        화면 아무 곳이나 빠르게 터치하세요
      </div>
    </div>
  );
};
