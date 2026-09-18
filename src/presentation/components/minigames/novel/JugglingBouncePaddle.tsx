import { useState, useEffect, useRef } from 'react';
import { Trophy } from 'lucide-react';
import { sfxTap, sfxSuccess, sfxPop, sfxFail } from '../../../../application/soundEffects';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

interface Ball {
  x: number; // 0 to 100%
  y: number; // 0 to 100%
  vx: number;
  vy: number;
  color: string;
}

export const JugglingBouncePaddle = ({ groupId, enqueueAction }: Props) => {
  const [paddleX, setPaddleX] = useState(50); // paddle center 0 to 100%
  const [bounces, setBounces] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [balls, setBalls] = useState<Ball[]>([
    { x: 30, y: 15, vx: 0.8, vy: 1.2, color: 'text-amber-400' },
    { x: 70, y: 30, vx: -0.9, vy: 1.5, color: 'text-cyan-400' },
  ]);
  const [finished, setFinished] = useState(false);

  const paddleRef = useRef(50);
  const ballsRef = useRef(balls);
  const bouncesRef = useRef(0);

  useEffect(() => {
    // 공 물리 업데이트 루프
    const anim = setInterval(() => {
      setBalls(prevBalls => {
        const nextBalls = prevBalls.map(b => {
          let nx = b.x + b.vx;
          let ny = b.y + b.vy;
          let nvx = b.vx;
          let nvy = b.vy;

          // 좌우 벽 바운스
          if (nx <= 5 || nx >= 95) {
            nvx = -nvx;
            nx = Math.max(5, Math.min(95, nx));
          }

          // 천장 바운스
          if (ny <= 5) {
            nvy = Math.abs(nvy);
          }

          // 패들 충돌 판정 (y >= 82% 이고 x가 패들 폭 ±16% 이내)
          const pX = paddleRef.current;
          if (ny >= 82 && ny <= 88 && Math.abs(nx - pX) <= 18) {
            nvy = -Math.abs(nvy) * 1.02; // 위로 튕겨 올림
            bouncesRef.current += 1;
            setBounces(bouncesRef.current);
            sfxPop();
          }

          // 바닥 추락 시 리셋
          if (ny >= 98) {
            ny = 10;
            nx = 20 + Math.random() * 60;
            nvy = 1.2;
            sfxFail();
          }

          return { ...b, x: nx, y: ny, vx: nvx, vy: nvy };
        });

        ballsRef.current = nextBalls;
        return nextBalls;
      });
    }, 35);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          clearInterval(anim);
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(anim);
      clearInterval(timer);
    };
  }, []);

  const finishGame = () => {
    setFinished(true);
    sfxSuccess();
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: Math.min(250, bouncesRef.current * 10) },
      timestamp: Date.now(),
    });
  };

  const movePaddle = (dir: 'left' | 'right') => {
    if (finished) return;
    sfxTap();
    setPaddleX(p => {
      const next = dir === 'left' ? Math.max(15, p - 12) : Math.min(85, p + 12);
      paddleRef.current = next;
      return next;
    });
  };

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" />
          <span className="text-white font-bold text-lg">저글링 바운스 컨트롤러</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-amber-400 font-mono font-bold text-lg">{timeLeft}s</span>
          <span className="text-emerald-400 font-mono font-bold text-lg">{bounces}회 바운스</span>
        </div>
      </div>

      {/* 저글링 바운스 아레나 */}
      <div className="relative w-full h-80 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-inner flex flex-col justify-between p-2 my-2">
        {/* 떨어지는 저글링 공 2개 */}
        {balls.map((b, idx) => (
          <div
            key={idx}
            className={`absolute text-3xl transition-transform ease-linear duration-75 ${b.color}`}
            style={{ left: `calc(${b.x}% - 14px)`, top: `calc(${b.y}% - 14px)` }}
          >
            🎾
          </div>
        ))}

        {/* 바닥 바운스 패들 */}
        <div
          className="absolute bottom-6 h-4 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.8)] transition-all ease-out duration-75"
          style={{ left: `calc(${paddleX}% - 40px)`, width: '80px' }}
        />
      </div>

      {/* 패들 좌우 이동 버튼 */}
      <div className="grid grid-cols-2 gap-4 w-full mt-2">
        <button
          onClick={() => movePaddle('left')}
          disabled={finished}
          className="py-6 bg-gradient-to-br from-indigo-600 to-blue-700 hover:brightness-110 active:scale-95 text-white font-black text-xl rounded-2xl shadow-lg border border-indigo-400/40"
        >
          ◀ 왼쪽 이동
        </button>

        <button
          onClick={() => movePaddle('right')}
          disabled={finished}
          className="py-6 bg-gradient-to-br from-blue-600 to-cyan-700 hover:brightness-110 active:scale-95 text-white font-black text-xl rounded-2xl shadow-lg border border-cyan-400/40"
        >
          오른쪽 이동 ▶
        </button>
      </div>

      <p className="text-xs text-slate-400 text-center mt-2">
        떨어지는 테니스공이 바닥에 닿기 전에 노란색 패들로 튕겨 올리세요!
      </p>
    </div>
  );
};
