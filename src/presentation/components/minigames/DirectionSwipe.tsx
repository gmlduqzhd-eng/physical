import { useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { sfxWhoosh, sfxPop } from '../../../application/soundEffects';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

type Dir = 'up' | 'down' | 'left' | 'right';

const DIRS: Dir[] = ['up', 'down', 'left', 'right'];
const ICONS = { up: ArrowUp, down: ArrowDown, left: ArrowLeft, right: ArrowRight };
const COLORS = { up: 'text-cyan-400', down: 'text-orange-400', left: 'text-emerald-400', right: 'text-purple-400' };

export const DirectionSwipe = ({ groupId, enqueueAction }: Props) => {
  const [score, setScore] = useState(0);
  const [current, setCurrent] = useState<Dir>('up');
  const [timeLeft, setTimeLeft] = useState(15);
  const [finished, setFinished] = useState(false);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  const scoreRef = useRef(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);

  useEffect(() => {
    setCurrent(DIRS[Math.floor(Math.random() * 4)]);
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setFinished(true);
          enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: scoreRef.current * 50 }, timestamp: Date.now() });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (finished) return;
    const dx = e.changedTouches[0].clientX - startXRef.current;
    const dy = e.changedTouches[0].clientY - startYRef.current;
    processSwipe(dx, dy);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (finished) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;
    processSwipe(dx, dy);
  };

  const processSwipe = (dx: number, dy: number) => {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDx < 30 && absDy < 30) return; // too short

    let swiped: Dir;
    if (absDx > absDy) {
      swiped = dx > 0 ? 'right' : 'left';
    } else {
      swiped = dy > 0 ? 'down' : 'up';
    }

    if (swiped === current) {
      setScore(s => s + 1);
      scoreRef.current += 1;
      sfxWhoosh();
      setFlash('correct');
    } else {
      sfxPop();
      setFlash('wrong');
    }
    setTimeout(() => setFlash(null), 200);
    setCurrent(DIRS[Math.floor(Math.random() * 4)]);
  };

  const Icon = ICONS[current];

  return (
    <div
      className={`min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none transition-colors duration-100 ${flash === 'correct' ? '!bg-emerald-900' : flash === 'wrong' ? '!bg-red-900' : ''}`}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}
    >
      <div className="flex justify-between w-full max-w-sm mb-8 relative z-10">
        <div><span className="text-slate-400 text-sm font-bold">점수</span><div className="text-white text-3xl font-black">{score}</div></div>
        <div className="text-right"><span className="text-slate-400 text-sm font-bold">남은 시간</span><div className={`text-3xl font-black ${timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}>{timeLeft}초</div></div>
      </div>

      <h1 className="text-3xl font-black text-white mb-4 text-center relative z-10">방향 스와이프</h1>
      <p className="text-slate-400 font-bold mb-12 text-center relative z-10">화살표 방향으로 스와이프하세요!</p>

      <div className={`w-40 h-40 rounded-3xl bg-slate-800 border-4 border-slate-700 flex items-center justify-center relative z-10 mb-8 ${flash === 'correct' ? '!border-emerald-400 !bg-emerald-900/50' : flash === 'wrong' ? '!border-red-500 !bg-red-900/50' : ''}`}>
        <Icon className={`w-24 h-24 ${COLORS[current]}`} />
      </div>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="text-6xl font-black text-cyan-400 mb-4">{score}회 성공!</div>
          <p className="text-xl text-white font-bold">+{score * 50}점 획득!</p>
        </div>
      )}
    </div>
  );
};
