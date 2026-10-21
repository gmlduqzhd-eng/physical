import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sfxPop, sfxSuccess, hapticTap, hapticHeavy } from '../../../application/soundEffects';

// ─── 챌린지 타입 정의 ───

type ChallengeType = 'shake' | 'jump' | 'tilt' | 'tap';

interface ChallengeConfig {
  type: ChallengeType;
  emoji: string;
  title: string;
  instruction: string;
  /** 100%로 간주하는 목표값 */
  goal: number;
}

const SENSOR_CHALLENGES: ChallengeConfig[] = [
  {
    type: 'shake',
    emoji: '📳',
    title: '흔들기 챌린지',
    instruction: '5초간 폰을 힘차게 흔드세요!',
    goal: 100, // 누적 shake intensity (임의 단위)
  },
  {
    type: 'jump',
    emoji: '🦘',
    title: '점프 챌린지',
    instruction: '3번 점프하세요!',
    goal: 3,
  },
  {
    type: 'tilt',
    emoji: '↔️',
    title: '기울기 챌린지',
    instruction: '폰을 좌우로 3번 기울이세요!',
    goal: 3,
  },
];

const TAP_FALLBACK: ChallengeConfig = {
  type: 'tap',
  emoji: '👆',
  title: '탭 챌린지',
  instruction: '화면을 10번 빠르게 탭하세요!',
  goal: 10,
};

const DURATION_SEC = 5;

// ─── 멀티플라이어 계산 ───

function computeMultiplier(progress: number): number {
  if (progress >= 1.0) return 1.3;
  if (progress >= 0.7) return 1.2;
  if (progress >= 0.3) return 1.1;
  return 1.0;
}

// ─── 센서 사용 가능 여부 ───

function hasSensors(): boolean {
  return (
    typeof window !== 'undefined' &&
    (typeof window.DeviceMotionEvent !== 'undefined' ||
      typeof window.DeviceOrientationEvent !== 'undefined')
  );
}

// ─── 컴포넌트 ───

interface MotionBoosterProps {
  /** Called when booster is completed (score multiplier: 1.0 to 1.5) */
  onComplete: (multiplier: number) => void;
  /** Called if user skips the booster */
  onSkip: () => void;
}

export const MotionBoosterChallenge: React.FC<MotionBoosterProps> = ({ onComplete, onSkip }) => {
  // ─── 챌린지 선택 (센서 미지원 시 탭 폴백) ───
  const [challenge] = useState<ChallengeConfig>(() => {
    if (!hasSensors()) return TAP_FALLBACK;
    return SENSOR_CHALLENGES[Math.floor(Math.random() * SENSOR_CHALLENGES.length)];
  });

  const [phase, setPhase] = useState<'ready' | 'active' | 'done'>('ready');
  const [timeLeft, setTimeLeft] = useState(DURATION_SEC);
  const [displayProgress, setDisplayProgress] = useState(0); // 0‑1 비율
  const [resultMultiplier, setResultMultiplier] = useState(1.0);

  // 콜백 안정 참조
  const onCompleteRef = useRef(onComplete);
  const onSkipRef = useRef(onSkip);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onSkipRef.current = onSkip; }, [onSkip]);

  // 가변 누적 상태 (렌더 디커플링)
  const accumulatorRef = useRef(0);
  const lastPopTimeRef = useRef(0);
  const finishedRef = useRef(false);

  // 점프 감지 쿨다운
  const lastJumpRef = useRef(0);
  // 기울기 감지 상태
  const tiltSideRef = useRef<'left' | 'right' | null>(null);

  // ─── 시작 ───
  const handleStart = useCallback(() => {
    setPhase('active');
  }, []);

  // ─── 타이머 + 디스플레이 갱신 (~10fps) ───
  useEffect(() => {
    if (phase !== 'active') return;

    const startTime = Date.now();

    const interval = window.setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, DURATION_SEC - elapsed);
      setTimeLeft(Math.ceil(remaining));

      const progress = Math.min(accumulatorRef.current / challenge.goal, 1.5);
      setDisplayProgress(progress);

      if (remaining <= 0) {
        clearInterval(interval);
        if (!finishedRef.current) {
          finishedRef.current = true;
          const mult = computeMultiplier(progress);
          setResultMultiplier(mult);
          setPhase('done');
          sfxSuccess();
          hapticHeavy();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [phase, challenge.goal]);

  // ─── 센서 리스너: 흔들기 ───
  useEffect(() => {
    if (phase !== 'active' || challenge.type !== 'shake') return;

    const handler = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity ?? e.acceleration;
      if (!acc) return;
      const { x, y, z } = acc;
      if (x == null || y == null || z == null) return;

      const magnitude = Math.sqrt(x * x + y * y + z * z);
      // 중력(~9.8)을 빼서 순수 shake 강도만 누적
      const shakeIntensity = Math.max(0, magnitude - 9.8);
      accumulatorRef.current += shakeIntensity * 0.3; // 스케일 조정

      // 피드백 사운드 (매 0.2초 최대 1회)
      const now = Date.now();
      if (shakeIntensity > 2 && now - lastPopTimeRef.current > 200) {
        lastPopTimeRef.current = now;
        sfxPop();
        hapticTap();
      }
    };

    window.addEventListener('devicemotion', handler);
    return () => window.removeEventListener('devicemotion', handler);
  }, [phase, challenge.type]);

  // ─── 센서 리스너: 점프 ───
  useEffect(() => {
    if (phase !== 'active' || challenge.type !== 'jump') return;

    const handler = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const y = acc.y;
      if (y == null) return;

      const now = Date.now();
      // y축 가속도 스파이크 > 12 + 400ms 쿨다운
      if (Math.abs(y) > 12 && now - lastJumpRef.current > 400) {
        lastJumpRef.current = now;
        accumulatorRef.current += 1;
        sfxPop();
        hapticTap();
      }
    };

    window.addEventListener('devicemotion', handler);
    return () => window.removeEventListener('devicemotion', handler);
  }, [phase, challenge.type]);

  // ─── 센서 리스너: 기울기 ───
  useEffect(() => {
    if (phase !== 'active' || challenge.type !== 'tilt') return;

    const handler = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma;
      if (gamma == null) return;

      // gamma > +30° → 오른쪽, gamma < -30° → 왼쪽
      if (gamma > 30 && tiltSideRef.current !== 'right') {
        if (tiltSideRef.current === 'left') {
          // 왼쪽 → 오른쪽 전환 = 1회 기울기 완료
          accumulatorRef.current += 1;
          sfxPop();
          hapticTap();
        }
        tiltSideRef.current = 'right';
      } else if (gamma < -30 && tiltSideRef.current !== 'left') {
        if (tiltSideRef.current === 'right') {
          // 오른쪽 → 왼쪽 전환 = 1회 기울기 완료
          accumulatorRef.current += 1;
          sfxPop();
          hapticTap();
        }
        tiltSideRef.current = 'left';
      }
    };

    window.addEventListener('deviceorientation', handler);
    return () => window.removeEventListener('deviceorientation', handler);
  }, [phase, challenge.type]);

  // ─── 완료 화면 자동 닫기 ───
  useEffect(() => {
    if (phase !== 'done') return;
    const t = window.setTimeout(() => {
      onCompleteRef.current(resultMultiplier);
    }, 1800);
    return () => clearTimeout(t);
  }, [phase, resultMultiplier]);

  // ─── 탭 핸들러 (폴백 + 탭 챌린지) ───
  const handleTap = useCallback(() => {
    if (phase !== 'active' || challenge.type !== 'tap') return;
    accumulatorRef.current += 1;
    sfxPop();
    hapticTap();
  }, [phase, challenge.type]);

  // ─── SVG 진행 링 계산 ───
  const ringRadius = 58;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - Math.min(displayProgress, 1));

  // ─── 렌더 ───
  return (
    <div
      className="fixed inset-0 z-[10006] bg-slate-950/95 backdrop-blur-lg flex flex-col items-center justify-center p-4 text-white text-center select-none animate-in fade-in duration-300"
      onTouchStart={challenge.type === 'tap' ? handleTap : undefined}
      onClick={challenge.type === 'tap' ? handleTap : undefined}
    >
      {/* ─── READY 화면 ─── */}
      {phase === 'ready' && (
        <div className="flex flex-col items-center gap-6 max-w-xs">
          <div className="text-6xl animate-bounce">{challenge.emoji}</div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-300">
            🚀 보너스 부스터!
          </h2>
          <p className="text-slate-300 text-sm font-medium leading-relaxed">
            미니 챌린지를 완료하면{' '}
            <span className="text-emerald-400 font-black">점수 보너스</span>를 받을 수 있어요!
          </p>
          <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-4 w-full">
            <p className="text-lg font-bold text-cyan-300 mb-1">{challenge.title}</p>
            <p className="text-sm text-slate-400">{challenge.instruction}</p>
          </div>
          <button
            onClick={handleStart}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black rounded-2xl text-lg shadow-lg shadow-cyan-500/30 active:scale-95 transition-all"
          >
            시작하기! 💪
          </button>
          <button
            onClick={() => onSkipRef.current()}
            className="text-slate-500 hover:text-slate-300 text-xs font-medium py-2 transition-colors"
          >
            건너뛰기 →
          </button>
        </div>
      )}

      {/* ─── ACTIVE 챌린지 화면 ─── */}
      {phase === 'active' && (
        <div className="flex flex-col items-center gap-4">
          {/* 카운트다운 배지 */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>남은 시간: {timeLeft}초</span>
          </div>

          {/* 프로그레스 링 + 이모지 */}
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 128 128">
              {/* 배경 트랙 */}
              <circle
                cx="64"
                cy="64"
                r={ringRadius}
                fill="none"
                stroke="rgb(30 41 59)"
                strokeWidth="8"
              />
              {/* 진행 트랙 */}
              <circle
                cx="64"
                cy="64"
                r={ringRadius}
                fill="none"
                stroke={displayProgress >= 1 ? 'rgb(52 211 153)' : 'rgb(6 182 212)'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                className="transition-all duration-150"
              />
            </svg>
            <span
              className={`text-5xl ${
                displayProgress >= 1 ? 'animate-bounce' : 'animate-pulse'
              }`}
            >
              {challenge.emoji}
            </span>
          </div>

          {/* 진행률 텍스트 */}
          <div className="text-center">
            <p className="text-3xl font-black font-mono">
              <span className={displayProgress >= 1 ? 'text-emerald-400' : 'text-cyan-300'}>
                {Math.min(Math.round(displayProgress * 100), 150)}%
              </span>
            </p>
            <p className="text-sm text-slate-400 font-medium mt-1">{challenge.instruction}</p>
          </div>

          {/* 응원 메시지 */}
          <p className="text-lg font-bold text-amber-300 animate-pulse">
            {displayProgress >= 1
              ? '🎉 완벽해요! 계속 가세요!'
              : displayProgress >= 0.5
                ? '💪 잘하고 있어요!'
                : '🔥 힘내세요!'}
          </p>

          {/* 건너뛰기 */}
          <button
            onClick={() => {
              if (!finishedRef.current) {
                finishedRef.current = true;
                onSkipRef.current();
              }
            }}
            className="text-slate-600 hover:text-slate-400 text-xs font-medium mt-2 transition-colors"
          >
            건너뛰기 →
          </button>
        </div>
      )}

      {/* ─── DONE 결과 화면 ─── */}
      {phase === 'done' && (
        <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
          <div className="text-6xl">
            {resultMultiplier >= 1.3
              ? '🏆'
              : resultMultiplier >= 1.2
                ? '🎉'
                : resultMultiplier >= 1.1
                  ? '👍'
                  : '✨'}
          </div>
          <h2 className="text-2xl font-black">
            {resultMultiplier >= 1.2 ? '대단해요!' : '수고했어요!'}
          </h2>
          <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl px-8 py-4">
            <p className="text-sm text-slate-400 mb-1">점수 보너스</p>
            <p className="text-4xl font-black font-mono text-emerald-400">
              ×{resultMultiplier.toFixed(1)}
            </p>
          </div>
          <p className="text-sm text-slate-500">잠시 후 결과가 반영됩니다…</p>
        </div>
      )}
    </div>
  );
};
