import { useGameTimeouts } from './common/useGameTimeouts';
import { useState, useEffect, useRef } from 'react';
import { sfxTap, sfxSuccess, sfxCoin } from '../../../application/soundEffects';
import { Crosshair, Shield, Activity, Sparkles } from 'lucide-react';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const TargetShoot = ({ groupId, enqueueAction }: Props) => {
  const scheduleTimeout = useGameTimeouts();
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [ringSize, setRingSize] = useState(200);
  const [finished, setFinished] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [isStable, setIsStable] = useState(false);
  const [hasMotion, setHasMotion] = useState(false);

  const animRef = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const lockRef = useRef(false);
  const lastAccel = useRef<{ x: number; y: number; z: number } | null>(null);

  // 몸통 및 손목 흔들림 감지 (양손 파지 및 코어 안정화 훈련)
  useEffect(() => {
    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc || ![acc.x, acc.y, acc.z].every(value => typeof value === 'number' && Number.isFinite(value))) return;
      const current = { x: acc.x!, y: acc.y!, z: acc.z! };
      setHasMotion(true);
      if (!lastAccel.current) {
        lastAccel.current = current;
        return;
      }

      const dx = Math.abs((acc.x ?? 0) - lastAccel.current.x);
      const dy = Math.abs((acc.y ?? 0) - lastAccel.current.y);
      const dz = Math.abs((acc.z ?? 0) - lastAccel.current.z);
      const tremor = dx + dy + dz;

      // 흔들림이 크면 조준 불안정 상태
      setIsStable(tremor < 2.8);

      lastAccel.current = current;
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, []);

  useEffect(() => {
    let previousFrame: number | undefined;
    const shrinkRing = (timestamp: number) => {
      const elapsed = previousFrame === undefined ? 0 : Math.min(100, timestamp - previousFrame);
      previousFrame = timestamp;
      setRingSize(prev => prev <= 10 ? 200 : Math.max(10, prev - elapsed * 0.09));
      animRef.current = requestAnimationFrame(shrinkRing);
    };
    animRef.current = requestAnimationFrame(shrinkRing);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [round]);

  const handleShoot = () => {
    if (finished || lockRef.current) return;
    lockRef.current = true;
    sfxTap();

    if (animRef.current) cancelAnimationFrame(animRef.current);

    // 링이 작을수록 높은 기본 점수
    let basePts = ringSize <= 30 ? 100 : ringSize <= 60 ? 70 : ringSize <= 100 ? 40 : ringSize <= 150 ? 20 : 10;

    // 기마자세 코어 안정화 보너스 (+20점)
    if (hasMotion && isStable && basePts >= 40) {
      basePts += 20;
      sfxCoin();
    }

    setLastScore(basePts);
    setScore(s => s + basePts);
    scoreRef.current += basePts;

    if (round >= 5) {
      setFinished(true);
      sfxSuccess();
      enqueueAction({
        id: Math.random().toString(),
        type: 'INCREMENT_SCORE',
        payload: { id: groupId, amount: scoreRef.current },
        timestamp: Date.now(),
      });
    } else {
      scheduleTimeout(() => {
        setRound(r => r + 1);
        setRingSize(200);
        setLastScore(null);
        lockRef.current = false;
      }, 900);
    }
  };

  const ringColor = ringSize <= 30
    ? 'border-red-500 shadow-red-500/50'
    : ringSize <= 60
    ? 'border-orange-500 shadow-orange-500/30'
    : ringSize <= 100
    ? 'border-amber-400'
    : 'border-cyan-400';

  return (
    <div
      className="min-h-[100dvh] bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none cursor-pointer"
      onClick={handleShoot}
    >
      {/* 상단 라운드 및 스코어 */}
      <div className="flex justify-between w-full max-w-sm mb-4 relative z-10">
        <div>
          <span className="text-slate-400 text-xs font-bold">표적 격발 라운드</span>
          <div className="text-white text-2xl font-black font-mono">{round} / 5</div>
        </div>
        <div className="text-right">
          <span className="text-slate-400 text-xs font-bold">총 획득 점수</span>
          <div className="text-cyan-400 text-2xl font-black font-mono">{score}점</div>
        </div>
      </div>

      {/* 신체 자세 가이드 인디케이터 */}
      <div className="w-full max-w-sm bg-slate-900/80 border border-slate-800 rounded-xl p-3 mb-6 relative z-10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-300">신체 자세: 기마자세 홀드</span>
        </div>
        <div className={`px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center gap-1 ${
          isStable
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
            : 'bg-amber-500/20 text-amber-300 border border-amber-400/50 animate-pulse'
        }`}>
          <Activity className="w-3 h-3" />
          {!hasMotion ? '터치 조준 모드 · 센서 대기' : isStable ? '안정 조준 중 (+20점 보너스)' : '자세 불안정! 몸을 고정하세요'}
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-black text-white mb-1 text-center relative z-10 flex items-center justify-center gap-2">
        <Crosshair className="w-7 h-7 text-red-500 animate-pulse" /> 표적 조준 사격
      </h1>
      <p className="text-slate-400 font-medium mb-8 text-center relative z-10 text-xs sm:text-sm max-w-xs">
        무릎을 살짝 굽혀 <strong>기마자세</strong>를 취하고, 조준선이 중심에 모일 때 터치하세요!
      </p>

      {/* 동심원 타겟 과녁 판 */}
      <div className="relative w-56 h-56 flex items-center justify-center z-10 mb-6">
        <div className="absolute w-56 h-56 rounded-full border border-slate-700/60 bg-slate-950/40" />
        <div className="absolute w-44 h-44 rounded-full border border-slate-700/80 bg-slate-900/30" />
        <div className="absolute w-28 h-28 rounded-full border border-slate-600/90 bg-slate-900/60" />
        <div className="absolute w-12 h-12 rounded-full border-2 border-red-500/80 bg-red-950/80 flex items-center justify-center">
          <span className="w-3 h-3 rounded-full bg-red-500" />
        </div>

        {/* 십자선 가이드 */}
        <div className="absolute w-full h-[1px] bg-slate-700/50 pointer-events-none" />
        <div className="absolute h-full w-[1px] bg-slate-700/50 pointer-events-none" />

        {/* 줄어드는 조준 링 */}
        <div
          className={`absolute rounded-full border-4 ${ringColor} transition-colors duration-100 ${
            !isStable ? 'translate-x-1 translate-y-1' : ''
          }`}
          style={{
            width: ringSize,
            height: ringSize,
            boxShadow: ringSize <= 30 ? '0 0 25px rgba(239,68,68,0.7)' : 'none',
          }}
        />
      </div>

      {lastScore !== null && !finished && (
        <div className={`text-3xl font-black relative z-10 animate-bounce flex items-center gap-1.5 ${
          lastScore >= 80 ? 'text-emerald-400' : lastScore >= 40 ? 'text-amber-400' : 'text-slate-400'
        }`}>
          <Sparkles className="w-6 h-6" /> +{lastScore}점 획득!
        </div>
      )}

      {!finished && lastScore === null && (
        <p className="text-cyan-400 text-xs sm:text-sm font-bold animate-pulse relative z-10">
          호흡을 멈추고 링이 가장 작아질 때 터치!
        </p>
      )}

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center backdrop-blur-md p-6 text-center">
          <div className="text-6xl font-black text-cyan-400 mb-2">{score}점!</div>
          <p className="text-white font-extrabold text-xl mb-1">
            {score >= 450 ? 'PERFECT SNIPER! 🏆' : score >= 300 ? 'GREAT STABILITY! ⭐' : 'GOOD ATTEMPT! 👍'}
          </p>
          <p className="text-xs text-slate-400 max-w-xs mt-2 leading-relaxed">
            기술형 표적 스포츠(양궁·사격)의 핵심인 신체 중심 제어와 호흡 조절 능력을 훌륭하게 수행했습니다.
          </p>
        </div>
      )}
    </div>
  );
};
