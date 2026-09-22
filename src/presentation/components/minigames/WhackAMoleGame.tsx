import { useState, useEffect } from 'react';
import { sfxCoin } from '../../../application/soundEffects';

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
          setWon(false);
          enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 0 }, timestamp: Date.now() });
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
    sfxCoin();
    setHits(h => {
      if (h >= 15) return 15;
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
          <span className="text-cyan-300 text-sm font-bold">잡은 횟수</span>
          <span className="text-white text-2xl font-black">{hits} / 15</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-cyan-300 text-sm font-bold">남은 시간</span>
          <span className="text-white text-2xl font-black">{timeLeft}초</span>
        </div>
      </div>

      <h1 className="text-3xl font-black text-white mb-2 text-center relative z-10">🐹 두더지 잡기!</h1>
      <p className="text-white font-bold mb-8 text-center relative z-10">구멍에서 쏙 올라오는 두더지를 빠르게 터치하세요!</p>
      
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm relative z-10 aspect-square bg-emerald-900/60 p-4 rounded-3xl border-2 border-emerald-700 shadow-2xl">
        {Array.from({ length: 9 }).map((_, i) => {
          const isActive = activeMole === i;
          return (
            <button
              key={i}
              onMouseDown={() => handleWhack(i)}
              onTouchStart={() => handleWhack(i)}
              className={`rounded-2xl transition-all duration-100 flex flex-col items-center justify-center relative overflow-hidden border-2 ${
                isActive
                  ? 'bg-amber-900/80 border-amber-400 scale-100 shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                  : 'bg-amber-950/40 border-emerald-800/60 scale-95'
              }`}
            >
              {/* 두더지 굴 입구 타원 */}
              <div className="absolute bottom-1 w-12 h-4 bg-black/60 rounded-full border border-amber-950"></div>
              {isActive ? (
                <div className="flex flex-col items-center animate-bounce z-10">
                  <span className="text-5xl drop-shadow-lg">🐹</span>
                  <span className="text-[10px] font-black text-amber-200 bg-amber-950/80 px-1.5 rounded -mt-1 border border-amber-500/50">두더지!</span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-black/40 border border-amber-900/30 flex items-center justify-center">
                  <span className="text-xs text-amber-600/40 font-mono">🕳️</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className={`text-6xl font-black mb-4 ${won ? 'text-cyan-300' : 'text-red-500'}`}>
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
