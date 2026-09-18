import { useState, useRef, useEffect } from 'react';
import { Compass, CheckCircle2 } from 'lucide-react';
import { sfxSuccess, sfxPop, sfxFail } from '../../../../application/soundEffects';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

interface TargetQuest {
  angle: number;
  label: string;
  direction: string;
}

const QUESTS: TargetQuest[] = [
  { angle: 45, label: '북동쪽 봉우리 (45°)', direction: 'NE' },
  { angle: 180, label: '남쪽 베이스캠프 (180°)', direction: 'S' },
  { angle: 270, label: '서쪽 계곡 탈출로 (270°)', direction: 'W' },
  { angle: 120, label: '동남쪽 비상 대피소 (120°)', direction: 'SE' },
  { angle: 315, label: '북서쪽 조난 신호탑 (315°)', direction: 'NW' },
];

export const CompassAzimuth = ({ groupId, enqueueAction }: Props) => {
  const [round, setRound] = useState(0);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const dialRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const currentQuest = QUESTS[round % QUESTS.length];

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [round]);

  const finishGame = (finalScore?: number) => {
    setFinished(true);
    const earned = finalScore !== undefined ? finalScore : score;
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: earned },
      timestamp: Date.now(),
    });
  };

  const calculateAngle = (clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rad = Math.atan2(clientY - centerY, clientX - centerX);
    let deg = Math.round((rad * 180) / Math.PI) + 90;
    if (deg < 0) deg += 360;
    setCurrentAngle(deg % 360);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    calculateAngle(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    calculateAngle(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const handleLockIn = () => {
    if (finished) return;
    const target = currentQuest.angle;
    const diff = Math.min(Math.abs(currentAngle - target), 360 - Math.abs(currentAngle - target));

    if (diff <= 8) {
      // 대성공 (퍼펙트)
      sfxSuccess();
      const add = 100;
      setScore(s => s + add);
      setFeedback('🎯 완벽한 방위각 조준! (+100점)');
    } else if (diff <= 18) {
      // 성공
      sfxPop();
      const add = 60;
      setScore(s => s + add);
      setFeedback('👍 양호한 방향! (+60점)');
    } else {
      sfxFail();
      setFeedback(`❌ 각도 오차 (${diff}°)! 다시 확인하세요.`);
    }

    setTimeout(() => {
      setFeedback(null);
      if (round + 1 >= 5) {
        finishGame(score + (diff <= 8 ? 100 : diff <= 18 ? 60 : 0));
      } else {
        setRound(r => r + 1);
        setCurrentAngle(0);
      }
    }, 800);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 min-h-[600px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center mb-3 px-2">
        <div className="flex items-center gap-2">
          <Compass className="w-6 h-6 text-amber-400 animate-spin-slow" />
          <span className="text-white font-bold text-lg">나침반 방위각 마스터</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">R {Math.min(round + 1, 5)}/5</span>
          <span className="text-amber-400 font-mono font-bold text-lg">{timeLeft}s</span>
          <span className="text-cyan-400 font-mono font-bold text-lg">{score}점</span>
        </div>
      </div>

      {/* 목표 방위 카드 */}
      <div className="w-full bg-slate-800/80 border border-amber-500/30 rounded-xl p-3 text-center mb-4">
        <span className="text-xs text-amber-400/80 font-medium">탐험 목표 방위</span>
        <div className="text-xl text-white font-black">{currentQuest.label}</div>
        <div className="text-xs text-slate-400 mt-0.5">다이얼을 돌려 각도 {currentQuest.angle}°에 맞추세요!</div>
      </div>

      {/* 나침반 인터랙션 다이얼 */}
      <div
        ref={dialRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-64 h-64 rounded-full border-4 border-slate-700 bg-slate-900 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing touch-none my-2"
      >
        {/* 방위 눈금 표기 */}
        <div className="absolute top-2 text-xs font-bold text-red-500">N (0°)</div>
        <div className="absolute right-2 text-xs font-bold text-slate-400">E (90°)</div>
        <div className="absolute bottom-2 text-xs font-bold text-slate-400">S (180°)</div>
        <div className="absolute left-2 text-xs font-bold text-slate-400">W (270°)</div>

        {/* 목표 각도 고스트 마커 */}
        <div
          className="absolute w-full h-full pointer-events-none flex items-start justify-center transition-all duration-300"
          style={{ transform: `rotate(${currentQuest.angle}deg)` }}
        >
          <div className="w-2 h-6 bg-amber-400/60 rounded-full mt-1 animate-pulse" />
        </div>

        {/* 회전 자침 (나침반 바늘) */}
        <div
          className="absolute w-full h-full pointer-events-none flex items-center justify-center transition-transform ease-out duration-75"
          style={{ transform: `rotate(${currentAngle}deg)` }}
        >
          <div className="w-3 h-28 flex flex-col justify-between items-center">
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[45px] border-b-red-500 drop-shadow-md" />
            <div className="w-3 h-3 bg-white rounded-full z-10 border-2 border-slate-800" />
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[45px] border-t-slate-400 drop-shadow-md" />
          </div>
        </div>

        <div className="absolute bottom-16 bg-slate-800/90 text-cyan-400 font-mono text-xs px-2 py-0.5 rounded-full border border-slate-600">
          현재: {currentAngle}°
        </div>
      </div>

      {feedback && (
        <div className="text-center font-bold text-sm text-yellow-300 my-2 animate-bounce">
          {feedback}
        </div>
      )}

      {/* 방위각 고정 버튼 */}
      <button
        onClick={handleLockIn}
        disabled={finished}
        className="w-full mt-3 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-lg rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
      >
        <CheckCircle2 className="w-5 h-5" />
        방위각 조준 확인 (Lock)
      </button>

      <p className="text-xs text-slate-400 text-center mt-2">
        나침반 테두리를 손가락이나 마우스로 둥글게 밀어서 바늘을 돌려보세요!
      </p>
    </div>
  );
};
