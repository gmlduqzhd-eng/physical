import { useState, useRef } from 'react';
import { sfxCoin, sfxSuccess } from '../../../application/soundEffects';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

const ZONES = [
  { id: 0, label: '상단 구역 ⬆️', style: 'top-4 left-1/2 -translate-x-1/2 w-48 h-20 bg-blue-600' },
  { id: 1, label: '하단 구역 ⬇️', style: 'bottom-4 left-1/2 -translate-x-1/2 w-48 h-20 bg-emerald-600' },
  { id: 2, label: '좌측 구역 ⬅️', style: 'left-4 top-1/2 -translate-y-1/2 w-24 h-44 bg-amber-600' },
  { id: 3, label: '우측 구역 ➡️', style: 'right-4 top-1/2 -translate-y-1/2 w-24 h-44 bg-rose-600' },
];

export const ZoneTouch = ({ groupId, enqueueAction }: Props) => {
  const [targetZone, setTargetZone] = useState(() => Math.floor(Math.random() * 4));
  const [count, setCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const countRef = useRef(0);
  const TARGET = 10;

  const handleTouch = (zoneId: number) => {
    if (finished || zoneId !== targetZone) return;
    sfxCoin();
    const nextCount = count + 1;
    countRef.current = nextCount;
    setCount(nextCount);

    if (nextCount >= TARGET) {
      setFinished(true);
      sfxSuccess();
      enqueueAction({
        id: Math.random().toString(),
        type: 'INCREMENT_SCORE',
        payload: { id: groupId, amount: 500 },
        timestamp: Date.now()
      });
    } else {
      let nextZone = Math.floor(Math.random() * 4);
      while (nextZone === targetZone) {
        nextZone = Math.floor(Math.random() * 4);
      }
      setTargetZone(nextZone);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden z-[9999] select-none">
      <div className="text-cyan-400 font-bold text-sm mb-1">{count} / {TARGET} 완료</div>
      <h1 className="text-2xl font-black text-white mb-2 text-center">🏃‍♂️ 구역 터치 달리기</h1>
      <p className="text-slate-300 font-medium mb-6 text-center text-xs">빛나는 구역을 빠르게 터치하세요!</p>

      <div className="relative w-full max-w-sm h-96 bg-slate-900/60 rounded-3xl border border-slate-800 p-4 flex items-center justify-center">
        {ZONES.map(z => {
          const isActive = z.id === targetZone && !finished;
          return (
            <button
              key={z.id}
              onClick={() => handleTouch(z.id)}
              className={`absolute rounded-2xl font-black text-white text-sm flex items-center justify-center transition-all ${z.style} ${
                isActive ? 'ring-4 ring-white animate-pulse scale-105 shadow-2xl opacity-100' : 'opacity-30 hover:opacity-50'
              }`}
            >
              {z.label}
            </button>
          );
        })}
        <div className="text-center pointer-events-none">
          <div className="text-4xl font-black text-white mb-1">{count}</div>
          <div className="text-xs text-slate-400">터치 성공</div>
        </div>
      </div>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center">
          <div className="text-5xl font-black text-emerald-400 mb-2">🎉 완주 성공!</div>
          <p className="text-xl text-white font-bold mb-4">+500점 획득</p>
        </div>
      )}
    </div>
  );
};
