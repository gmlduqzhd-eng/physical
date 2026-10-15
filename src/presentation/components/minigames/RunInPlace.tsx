import { useGameTimeouts } from './common/useGameTimeouts';
import { useState, useEffect, useRef, useCallback } from 'react';
import { sfxClick, sfxCoin, sfxUrgentWarning } from '../../../application/soundEffects';
import { BiomechanicalMotionDetector } from '../../../application/motionFilter';
import { ShieldAlert, Zap, Flame, Footprints } from 'lucide-react';

interface Props {
  groupId: string;
  enqueueAction: (a: any) => void;
}

export const RunInPlace = ({ groupId, enqueueAction }: Props) => {
  const scheduleTimeout = useGameTimeouts();
  const [steps, setSteps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [finished, setFinished] = useState(false);
  const [cheatWarning, setCheatWarning] = useState(false);
  const [cadenceStatus, setCadenceStatus] = useState<'slow' | 'perfect' | 'sprint'>('slow');

  const stepsRef = useRef(0);
  const cooldown = useRef(false);
  const finishedRef = useRef(false);
  const lastStepTime = useRef(0);

  // 생체역학적 제자리 달리기 센서 필터 (안티 치팅)
  const detectorRef = useRef<BiomechanicalMotionDetector>(
    new BiomechanicalMotionDetector({
      minIntervalMs: 240, // 인간 달리기 한 걸음당 최소 물리 시간 (분당 약 250보 상한)
      threshold: 6.5,     // 실제 무릎 올리기 및 발구름 시 발생하는 유효 가속도 임계값
      maxFrequencyPerSec: 4.5, // 손목만 짤짤 흔드는 편법 차단
    })
  );

  const doStep = useCallback((source: 'motion' | 'tap') => {
    if (cooldown.current || finishedRef.current) return;
    cooldown.current = true;

    const now = performance.now();
    const interval = now - lastStepTime.current;
    lastStepTime.current = now;

    // 케이던스 판정 (적정 달리기 리듬: 280~450ms 간격)
    if (interval >= 260 && interval <= 480) {
      setCadenceStatus('perfect');
    } else if (interval < 260) {
      setCadenceStatus('sprint');
    } else {
      setCadenceStatus('slow');
    }

    if (source === 'motion') {
      sfxCoin();
    } else {
      sfxClick();
    }

    setSteps(s => {
      const n = s + 1;
      stepsRef.current = n;
      return n;
    });

    scheduleTimeout(() => {
      cooldown.current = false;
    }, 200);
  }, [scheduleTimeout]);

  useEffect(() => {
    const handler = (e: DeviceMotionEvent) => {
      if (cooldown.current || finishedRef.current) return;
      const a = e.accelerationIncludingGravity;
      if (!a || ![a.x, a.y, a.z].every(value => typeof value === 'number' && Number.isFinite(value))) return;

      const x = a.x!;
      const y = a.y!;
      const z = a.z!;

      const evalResult = detectorRef.current.evaluateMotion(x, y, z);
      if (evalResult.isValid) {
        doStep('motion');
      } else if (evalResult.reason === 'cheat_shake') {
        sfxUrgentWarning();
        setCheatWarning(true);
        scheduleTimeout(() => setCheatWarning(false), 1200);
      }
    };

    window.addEventListener('devicemotion', handler);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.removeEventListener('devicemotion', handler);
      clearInterval(timer);
    };
  }, [scheduleTimeout, doStep]);

  useEffect(() => {
    if (timeLeft === 0 && !finished) {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setFinished(true);
      enqueueAction({
        id: Math.random().toString(),
        type: 'INCREMENT_SCORE',
        payload: { id: groupId, amount: stepsRef.current * 10 },
        timestamp: Date.now(),
      });
    }
  }, [timeLeft, finished, groupId, enqueueAction]);

  const triggerStep = () => {
    doStep('tap');
  };

  return (
    <div
      onClick={triggerStep}
      className="min-h-[100dvh] bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none cursor-pointer"
    >
      {/* 안티 치팅 경고 알림 토스트 */}
      {cheatWarning && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-red-600/95 border-2 border-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-white text-sm font-black animate-bounce">
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <span>⚠️ 바른 자세로 제자리에서 뛰어주세요! 손목만 흔들면 카운트되지 않습니다.</span>
        </div>
      )}

      {/* 상단 스코어보드 */}
      <div className="flex justify-between w-full max-w-sm mb-6 relative z-10">
        <div className="flex flex-col">
          <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
            <Footprints className="w-4 h-4" /> 유효 걸음수
          </span>
          <div className="text-white text-4xl font-black font-mono">{steps}</div>
        </div>

        {/* 케이던스 리듬 상태 */}
        <div className="flex flex-col items-center justify-center">
          <div className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 ${
            cadenceStatus === 'perfect'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-400'
              : cadenceStatus === 'sprint'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            <Flame className="w-3.5 h-3.5 fill-current" />
            {cadenceStatus === 'perfect' ? 'PERFECT RHYTHM!' : cadenceStatus === 'sprint' ? 'FAST SPRINT!' : 'PACE UP!'}
          </div>
        </div>

        <div className="text-right">
          <span className="text-emerald-400 text-xs font-bold">남은 시간</span>
          <div className={`text-4xl font-black font-mono ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            {timeLeft}초
          </div>
        </div>
      </div>

      {/* 러닝 캐릭터 애니메이션 */}
      <div className="relative my-4">
        <span className={`inline-block text-8xl transition-transform duration-100 ${steps % 2 === 0 ? '-rotate-12 scale-105' : 'rotate-12 scale-105'}`}>
          🏃
        </span>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-black/40 rounded-full blur-sm" />
      </div>

      <h1 className="text-3xl font-black text-white mb-2 text-center flex items-center justify-center gap-2">
        <Zap className="w-7 h-7 text-amber-400 fill-current" /> 제자리 달리기!
      </h1>
      <p className="text-emerald-300 font-semibold mb-4 text-center text-xs sm:text-sm max-w-xs leading-relaxed">
        폰을 손에 쥐고 <strong>무릎을 허리 높이까지 힘차게 올리며</strong> 제자리에서 달려주세요!
      </p>

      {/* 목표치 게이지 바 */}
      <div className="w-full max-w-xs h-3.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-150"
          style={{ width: `${Math.min(100, (steps / 50) * 100)}%` }}
        />
      </div>
      <div className="flex justify-between w-full max-w-xs text-[11px] text-slate-400 font-bold mt-1.5 px-1">
        <span>목표: 50걸음</span>
        <span>{Math.min(100, Math.round((steps / 50) * 100))}% 달성</span>
      </div>

      <div className="mt-6 text-[11px] text-slate-500 font-medium">
        🛡️ 스마트 생체역학 센서로 실제 무릎 도약만 판정합니다 (단순 터치도 가능)
      </div>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 text-center">
          <div className="text-6xl font-black text-emerald-400 mb-2">{steps}걸음!</div>
          <p className="text-2xl text-white font-extrabold mb-1">+{steps * 10}점 획득</p>
          <p className="text-sm text-slate-400 mt-2">심폐지구력과 하지 근지구력을 훌륭하게 단련했습니다!</p>
        </div>
      )}
    </div>
  );
};
