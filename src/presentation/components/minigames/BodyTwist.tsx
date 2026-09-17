import { useState, useRef } from 'react';
import { sfxCoin, sfxSuccess } from '../../../application/soundEffects';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

export const BodyTwist = ({ groupId, enqueueAction }: Props) => {
  const [direction, setDirection] = useState<'LEFT' | 'RIGHT'>('LEFT');
  const [count, setCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const countRef = useRef(0);
  const TARGET = 10;

  const handleTwist = (dir: 'LEFT' | 'RIGHT') => {
    if (finished || dir !== direction) return;
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
      setDirection(dir === 'LEFT' ? 'RIGHT' : 'LEFT');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-indigo-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none text-white">
      <div className="text-indigo-300 font-bold text-sm mb-1">{count} / {TARGET} 회</div>
      <h1 className="text-3xl font-black mb-2 text-center">🔄 몸 비틀기!</h1>
      <p className="text-indigo-200 text-xs mb-8 text-center">허리를 좌우로 비틀면서 지시된 방향을 터치하세요!</p>

      <div className="text-8xl mb-6 animate-pulse">
        {direction === 'LEFT' ? '⬅️' : '➡️'}
      </div>

      <div className="text-2xl font-black mb-8 text-indigo-300">
        {direction === 'LEFT' ? '왼쪽으로 비틀기!' : '오른쪽으로 비틀기!'}
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-6">
        <button
          onClick={() => handleTwist('LEFT')}
          disabled={finished || direction !== 'LEFT'}
          className={`py-8 rounded-2xl font-black text-xl flex flex-col items-center justify-center transition-all ${
            direction === 'LEFT'
              ? 'bg-gradient-to-r from-blue-500 to-indigo-500 ring-4 ring-white shadow-2xl scale-105 active:scale-95'
              : 'bg-slate-800 opacity-40'
          }`}
        >
          <span className="text-3xl mb-1">👈</span>
          좌측 터치
        </button>

        <button
          onClick={() => handleTwist('RIGHT')}
          disabled={finished || direction !== 'RIGHT'}
          className={`py-8 rounded-2xl font-black text-xl flex flex-col items-center justify-center transition-all ${
            direction === 'RIGHT'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 ring-4 ring-white shadow-2xl scale-105 active:scale-95'
              : 'bg-slate-800 opacity-40'
          }`}
        >
          <span className="text-3xl mb-1">👉</span>
          우측 터치
        </button>
      </div>

      <div className="w-full max-w-xs h-3 bg-indigo-900 rounded-full overflow-hidden border border-indigo-800">
        <div
          className="h-full bg-indigo-400 transition-all"
          style={{ width: `${(count / TARGET) * 100}%` }}
        />
      </div>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center">
          <div className="text-5xl font-black text-emerald-400 mb-2">🎉 완벽한 트위스트!</div>
          <p className="text-xl text-white font-bold mb-4">+500점 획득</p>
        </div>
      )}
    </div>
  );
};
