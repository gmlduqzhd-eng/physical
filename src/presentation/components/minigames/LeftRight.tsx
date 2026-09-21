import { useState, useEffect, useRef } from 'react';
import { sfxClick, sfxPop } from '../../../application/soundEffects';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const LeftRight = ({ groupId, enqueueAction }: Props) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [finished, setFinished] = useState(false);
  const [targetSide, setTargetSide] = useState<'left' | 'right'>('left');
  const [targetEmoji, setTargetEmoji] = useState('🏀');
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  const scoreRef = useRef(0);

  const EMOJIS = ['🏀', '⚽', '🎾', '🏐', '🏈', '🥊', '⛳', '🎯', '🏸', '🥏'];

  const nextTarget = () => {
    setTargetSide(Math.random() > 0.5 ? 'left' : 'right');
    setTargetEmoji(EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
  };

  useEffect(() => {
    nextTarget();
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setFinished(true);
          enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: scoreRef.current * 40 }, timestamp: Date.now() });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTap = (side: 'left' | 'right') => {
    if (finished) return;
    if (side === targetSide) {
      setScore(s => s + 1);
      scoreRef.current += 1;
      sfxClick();
      setFlash('correct');
    } else {
      sfxPop();
      setFlash('wrong');
    }
    setTimeout(() => setFlash(null), 100);
    nextTarget();
  };

  return (
    <div className={`min-h-[100dvh] bg-indigo-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none transition-colors duration-75 ${flash === 'correct' ? '!bg-emerald-950' : flash === 'wrong' ? '!bg-red-950' : ''}`}>
      <div className="flex justify-between w-full max-w-sm mb-6 relative z-10">
        <div><span className="text-blue-300 text-sm font-bold">점수</span><div className="text-white text-3xl font-black">{score}</div></div>
        <div className="text-right"><span className="text-blue-300 text-sm font-bold">남은 시간</span><div className={`text-3xl font-black ${timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}>{timeLeft}초</div></div>
      </div>

      <h1 className="text-3xl font-black text-white mb-2 text-center relative z-10">좌우 반사신경</h1>
      <p className="text-blue-200 font-bold mb-8 text-center relative z-10 text-sm">공이 나타난 쪽 버튼을 터치하세요!</p>

      {/* 타겟 표시 영역 */}
      <div className="flex w-full max-w-sm gap-4 mb-10 relative z-10" style={{ height: 120 }}>
        <div className="flex-1 bg-indigo-900/50 rounded-2xl border-2 border-indigo-800 flex items-center justify-center">
          {targetSide === 'left' && <span className="text-6xl animate-bounce">{targetEmoji}</span>}
        </div>
        <div className="flex-1 bg-indigo-900/50 rounded-2xl border-2 border-indigo-800 flex items-center justify-center">
          {targetSide === 'right' && <span className="text-6xl animate-bounce">{targetEmoji}</span>}
        </div>
      </div>

      {/* 좌우 버튼 */}
      <div className="flex w-full max-w-sm gap-4 relative z-10">
        <button
          onMouseDown={() => handleTap('left')}
          onTouchStart={(e) => { e.preventDefault(); handleTap('left'); }}
          className="flex-1 py-10 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-2xl text-white font-black text-2xl shadow-[0_6px_0_rgba(29,78,216,1)] active:shadow-none active:translate-y-[6px] transition-all"
        >
          ◀ 왼쪽
        </button>
        <button
          onMouseDown={() => handleTap('right')}
          onTouchStart={(e) => { e.preventDefault(); handleTap('right'); }}
          className="flex-1 py-10 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 rounded-2xl text-white font-black text-2xl shadow-[0_6px_0_rgba(194,65,12,1)] active:shadow-none active:translate-y-[6px] transition-all"
        >
          오른쪽 ▶
        </button>
      </div>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="text-6xl font-black text-blue-300 mb-4">{score}번 성공!</div>
          <p className="text-xl text-white font-bold">+{score * 40}점 획득!</p>
        </div>
      )}
    </div>
  );
};
