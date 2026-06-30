import { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const WhackAMoleGame = ({ groupId, enqueueAction }: Props) => {
  const [hits, setHits] = useState(0);
  const [activeMole, setActiveMole] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [finished, setFinished] = useState(false);
  const [won, setWon] = useState(false);

  useEffect(() => {
    if (finished) return;

    // Timer
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setFinished(true);
          setWon(false); // Finished by time -> fail (since win triggers earlier if they hit 15)
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Mole Spawner
    const moleInterval = setInterval(() => {
      const r = Math.floor(Math.random() * 9);
      setActiveMole(r);
      
      // Hide mole quickly to make it hard
      setTimeout(() => setActiveMole(null), 700);
    }, 800);

    return () => {
      clearInterval(timer);
      clearInterval(moleInterval);
    };
  }, [finished]);

  const handleWhack = (index: number) => {
    if (finished || index !== activeMole) return;

    // Hit successful
    setActiveMole(null); // Hide immediately
    setHits(h => {
      const next = h + 1;
      if (next >= 15) {
        setFinished(true);
        setWon(true);
        enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 500 }, timestamp: Date.now() });
      }
      return next;
    });
  };

  return (
    <div className="min-h-[100dvh] bg-emerald-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none">
      <div className="absolute inset-0 bg-emerald-500/10 animate-pulse"></div>
      
      <div className="flex justify-between w-full max-w-sm mb-6 relative z-10">
        <div className="flex flex-col">
          <span className="text-emerald-400 text-sm font-bold">잡은 횟수</span>
          <span className="text-white text-2xl font-black">{hits} / 15</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-emerald-400 text-sm font-bold">남은 시간</span>
          <span className="text-white text-2xl font-black">{timeLeft}초</span>
        </div>
      </div>

      <h1 className="text-3xl font-black text-white mb-2 text-center relative z-10">두더지 잡기!</h1>
      <p className="text-emerald-200 font-bold mb-8 text-center relative z-10">화면에 나타나는 별을 빠르게 터치하세요!</p>
      
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm relative z-10 aspect-square bg-emerald-900/50 p-3 rounded-2xl border border-emerald-800">
        {Array.from({ length: 9 }).map((_, i) => {
          const isActive = activeMole === i;
          return (
            <button
              key={i}
              onMouseDown={() => handleWhack(i)}
              onTouchStart={() => handleWhack(i)}
              className={`rounded-xl transition-all duration-75 flex items-center justify-center ${isActive ? 'bg-yellow-400 scale-100' : 'bg-emerald-950 scale-90 opacity-50'}`}
            >
              {isActive && <LucideIcons.Star className="w-12 h-12 text-yellow-900 animate-spin-slow" />}
            </button>
          );
        })}
      </div>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className={`text-6xl font-black mb-4 ${won ? 'text-emerald-400' : 'text-red-500'}`}>
            {won ? 'CLEAR!' : 'FAIL...'}
          </div>
          <p className="text-xl text-white font-bold">
            {won ? '+500점 획득!' : '목표 달성에 실패했습니다.'}
          </p>
        </div>
      )}
    </div>
  );
};
