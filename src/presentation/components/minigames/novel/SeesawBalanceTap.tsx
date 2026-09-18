import { useState, useEffect, useRef } from 'react';
import { Scale, AlertTriangle } from 'lucide-react';
import { sfxSuccess, sfxPop, sfxFail } from '../../../../application/soundEffects';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const SeesawBalanceTap = ({ groupId, enqueueAction }: Props) => {
  const [tiltAngle, setTiltAngle] = useState(0); // -30 (left drop) to +30 (right drop)
  const [ballPos, setBallPos] = useState(0); // -100 to +100
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [fallOff, setFallOff] = useState(false);
  const [finished, setFinished] = useState(false);

  const tiltRef = useRef(0);
  const ballPosRef = useRef(0);
  const ballVelRef = useRef(0);
  const fallRef = useRef(false);

  useEffect(() => {
    // 물리 업데이트 루프
    const physics = setInterval(() => {
      if (fallRef.current) return;

      // 시소에 자연스러운 약간의 불균형 흔들림
      tiltRef.current += (Math.random() - 0.5) * 1.2;
      tiltRef.current = Math.max(-25, Math.min(25, tiltRef.current));
      setTiltAngle(tiltRef.current);

      // 구슬 가속도 (기울기 각도에 비례)
      ballVelRef.current += tiltRef.current * 0.08;
      ballPosRef.current += ballVelRef.current;
      setBallPos(ballPosRef.current);

      // 구슬이 중앙 안전 구역(±30)에 있으면 점수 획득
      if (Math.abs(ballPosRef.current) <= 30) {
        setScore(s => s + 1);
      }

      // 구슬 추락 판정 (±90 초과)
      if (Math.abs(ballPosRef.current) >= 90) {
        fallRef.current = true;
        setFallOff(true);
        sfxFail();
        setTimeout(() => {
          ballPosRef.current = 0;
          ballVelRef.current = 0;
          tiltRef.current = 0;
          fallRef.current = false;
          setFallOff(false);
          setBallPos(0);
          setTiltAngle(0);
        }, 1200);
      }
    }, 50);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          clearInterval(physics);
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(physics);
      clearInterval(timer);
    };
  }, []);

  const finishGame = () => {
    setFinished(true);
    sfxSuccess();
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: Math.min(250, score) },
      timestamp: Date.now(),
    });
  };

  const handlePump = (side: 'left' | 'right') => {
    if (fallOff || finished) return;
    sfxPop();
    // 해당 방향을 위로 밀어올림 (왼쪽 펌프는 시소를 오른쪽으로 기울이고, 오른쪽 펌프는 왼쪽으로 기울임)
    const delta = side === 'left' ? 6 : -6;
    tiltRef.current = Math.max(-25, Math.min(25, tiltRef.current + delta));
    setTiltAngle(tiltRef.current);
  };

  const isCentered = Math.abs(ballPos) <= 30;

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <Scale className="w-6 h-6 text-emerald-400" />
          <span className="text-white font-bold text-lg">균형 시소 버티기</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-mono font-bold text-lg">{timeLeft}s</span>
          <span className="text-yellow-400 font-mono font-bold text-lg">{score}점</span>
        </div>
      </div>

      {/* 시소 및 밸런스 구슬 시각화 */}
      <div className="relative w-full h-72 bg-gradient-to-b from-slate-950 via-teal-950 to-slate-900 rounded-3xl overflow-hidden border-2 border-emerald-500/40 p-4 flex flex-col items-center justify-between shadow-2xl my-2">
        <div className="text-xs text-emerald-300 font-bold bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
          중심 유지 상태: {isCentered ? '🟢 안전' : '🔴 미끄러짐 주의!'}
        </div>

        {/* 시소 지지대 및 시소 널판 */}
        <div className="relative w-full h-32 flex items-center justify-center my-auto">
          {/* 시소 널판 */}
          <div
            className="relative w-72 h-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 rounded-full shadow-lg transition-transform ease-out duration-75 flex items-center justify-center"
            style={{ transform: `rotate(${tiltAngle}deg)` }}
          >
            {/* 가운데 안전 보금자리 마커 */}
            <div className="w-20 h-full bg-emerald-600/60 rounded-full border border-emerald-300 pointer-events-none" />

            {/* 굴러다니는 구슬 */}
            <div
              className={`absolute -top-7 text-3xl transition-transform ease-out duration-75 ${fallOff ? 'animate-bounce opacity-30' : ''}`}
              style={{ transform: `translateX(${ballPos * 1.2}px)` }}
            >
              ⚽
            </div>
          </div>

          {/* 중앙 삼각형 받침대 */}
          <div className="absolute top-16 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[40px] border-b-slate-600 drop-shadow-lg" />
        </div>

        {fallOff && (
          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-center p-4">
            <AlertTriangle className="w-10 h-10 text-amber-400 mb-2 animate-bounce" />
            <span className="text-white font-black text-lg">공이 시소 밖으로 떨어졌습니다!</span>
            <span className="text-xs text-slate-400 mt-1">곧 중앙으로 다시 올립니다...</span>
          </div>
        )}
      </div>

      {/* 좌 / 우 시소 올리기 펌프 버튼 */}
      <div className="grid grid-cols-2 gap-4 w-full mt-2">
        <button
          onClick={() => handlePump('left')}
          disabled={fallOff || finished}
          className="py-6 bg-gradient-to-br from-emerald-600 to-teal-700 hover:brightness-110 active:scale-95 text-white font-black text-xl rounded-2xl shadow-xl border-2 border-emerald-300/40 flex flex-col items-center justify-center gap-1"
        >
          <span>⬆️ 왼쪽 올리기</span>
        </button>

        <button
          onClick={() => handlePump('right')}
          disabled={fallOff || finished}
          className="py-6 bg-gradient-to-br from-teal-600 to-cyan-700 hover:brightness-110 active:scale-95 text-white font-black text-xl rounded-2xl shadow-xl border-2 border-cyan-300/40 flex flex-col items-center justify-center gap-1"
        >
          <span>오른쪽 올리기 ⬆️</span>
        </button>
      </div>

      <p className="text-xs text-slate-400 text-center mt-2">
        공이 시소 밖으로 떨어지지 않게 좌우 버튼을 톡톡 눌러 가운데 초록 영역을 지켜주세요!
      </p>
    </div>
  );
};
