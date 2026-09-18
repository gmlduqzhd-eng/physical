import { useState, useEffect, useRef } from 'react';
import { Cloud, Plane } from 'lucide-react';
import { sfxWhoosh, sfxSuccess } from '../../../../application/soundEffects';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const AlpineGlider = ({ groupId, enqueueAction }: Props) => {
  const [altitude, setAltitude] = useState(50); // 0 (crash bottom) to 100 (crash top)
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [finished, setFinished] = useState(false);
  const [targetY, setTargetY] = useState(50); // moving thermal updraft gate

  const isHolding = useRef(false);
  const altRef = useRef(50);
  const scoreRef = useRef(0);

  useEffect(() => {
    // 타겟 기류 윈도우 무빙
    const gateTimer = setInterval(() => {
      const nextGate = 25 + Math.random() * 50; // 25 ~ 75%
      setTargetY(nextGate);
    }, 2500);

    // 물리 루프
    const physicsTimer = setInterval(() => {
      setAltitude(prev => {
        // 누르고 있으면 상승, 놓으면 중력으로 활강 하강
        let next = isHolding.current ? prev + 1.8 : prev - 1.4;
        next = Math.max(5, Math.min(95, next));
        altRef.current = next;
        return next;
      });

      // 타겟 기류존 내 체공 시 점수 가산
      if (Math.abs(altRef.current - targetY) < 18) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
      }
    }, 40);

    // 게임 타이머
    const gameTimer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(gameTimer);
          clearInterval(gateTimer);
          clearInterval(physicsTimer);
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(gameTimer);
      clearInterval(gateTimer);
      clearInterval(physicsTimer);
    };
  }, [targetY]);

  const finishGame = () => {
    setFinished(true);
    sfxSuccess();
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: Math.min(200, scoreRef.current) },
      timestamp: Date.now(),
    });
  };

  const handlePointerDown = () => {
    isHolding.current = true;
    sfxWhoosh();
  };

  const handlePointerUp = () => {
    isHolding.current = false;
  };

  const inThermalZone = Math.abs(altitude - targetY) < 18;

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <Plane className="w-6 h-6 text-sky-300 -rotate-45" />
          <span className="text-white font-bold text-lg">알프스 활강 글라이더</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sky-300 font-mono font-bold text-lg">{timeLeft}s</span>
          <span className="text-yellow-300 font-mono font-bold text-lg">{score}점</span>
        </div>
      </div>

      {/* 협곡 비행 뷰 */}
      <div className="relative w-full h-72 bg-gradient-to-b from-sky-800 via-sky-950 to-slate-900 rounded-2xl overflow-hidden border-2 border-sky-400/40 p-4 flex flex-col justify-between shadow-inner">
        {/* 상단 암벽 천장 경계 */}
        <div className="w-full h-3 bg-gradient-to-b from-stone-600 to-transparent flex items-center justify-center">
          <span className="text-[9px] text-stone-300 font-mono">▲ 협곡 천장</span>
        </div>

        {/* 상승 기류 구름 게이트 (점수 획득 존) */}
        <div
          className="absolute w-full h-16 bg-cyan-400/20 border-y border-dashed border-cyan-300/50 flex items-center justify-around transition-all duration-700 pointer-events-none"
          style={{ top: `${100 - targetY - 10}%` }}
        >
          <div className="flex items-center gap-1 text-xs text-cyan-200 font-bold animate-pulse">
            <Cloud className="w-4 h-4" />
            <span>상승 기류 (THERMAL)</span>
          </div>
        </div>

        {/* 글라이더 본체 */}
        <div
          className="absolute left-1/3 transition-all ease-out duration-75 flex items-center"
          style={{ bottom: `${altitude}%` }}
        >
          <div className="text-4xl -rotate-12 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
            🪂
          </div>
          {inThermalZone && (
            <span className="text-xs text-yellow-300 font-bold ml-1 animate-bounce">
              +1
            </span>
          )}
        </div>

        {/* 하단 설산 능선 */}
        <div className="w-full h-6 bg-gradient-to-t from-slate-200 to-transparent flex items-center justify-center">
          <span className="text-[9px] text-slate-700 font-bold font-mono">▼ 설산 능선</span>
        </div>
      </div>

      {/* 실시간 고도계 */}
      <div className="w-full flex justify-between items-center text-xs text-slate-400 px-2 my-1">
        <span>고도: {Math.round(altitude)}m</span>
        <span className={inThermalZone ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
          {inThermalZone ? '✨ 최적 상승 기류 탑승 중!' : '기류 구름 높이로 이동하세요'}
        </span>
      </div>

      {/* 상승/비행 프레스 컨트롤 패널 */}
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        disabled={finished}
        className="w-full py-8 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 active:brightness-125 text-white font-black text-xl rounded-2xl shadow-2xl border-2 border-sky-300 transition-all flex flex-col items-center justify-center gap-1 touch-none"
      >
        <span className="text-2xl">누르면 상승 ⬆️ / 떼면 하강 ⬇️</span>
        <span className="text-xs text-sky-200 font-normal">화면을 꾹 누르고 있으면 글라이더가 높이 솟아오릅니다!</span>
      </button>
    </div>
  );
};
