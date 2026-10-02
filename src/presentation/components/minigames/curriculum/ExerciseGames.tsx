import { useGameScoreSubmission } from '../common/useGameScoreSubmission';
import { useGameTimeouts } from '../common/useGameTimeouts';
import React, { useState, useEffect, useRef } from 'react';
import { sfxCoin, sfxSuccess, sfxPop, sfxTap, hapticTap } from '../../../../application/soundEffects';
import { GameResultOverlay } from './GameResultOverlay';

interface GameProps {
  groupId: string;
  enqueueAction: (a: any) => void;
  onExit?: () => void;
}

/* =========================================================================
   1. 🌬️ breath-pacer-478 (4-7-8 자율신경 이완 페이서)
   ========================================================================= */
export const BreathPacer478: React.FC<GameProps> = ({ groupId, enqueueAction: queueAction, onExit }) => {
  const scheduleTimeout = useGameTimeouts();
  const [enqueueAction, resetScoreSubmission] = useGameScoreSubmission(queueAction);
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [cycle, setCycle] = useState(1);
  const [countdown, setCountdown] = useState(4);
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  const handleRestart = () => {
    resetScoreSubmission();
    finishedRef.current = false;
    setPhase('inhale');
    setCycle(1);
    setCountdown(4);
    setFinished(false);
  };

  useEffect(() => {
    if (finished) return;
    const timer = scheduleTimeout(() => {
        if (countdown <= 1) {
          if (phase === 'inhale') {
            setPhase('hold');
            sfxTap();
            setCountdown(7);
          } else if (phase === 'hold') {
            setPhase('exhale');
            sfxTap();
            setCountdown(8);
          } else {
            if (cycle >= 3) {
              if (!finishedRef.current) {
                finishedRef.current = true;
                setFinished(true);
                sfxSuccess();
                enqueueAction({
                  id: Math.random().toString(),
                  type: 'INCREMENT_SCORE',
                  payload: { id: groupId, amount: 500 },
                  timestamp: Date.now()
                });
              }
              setCountdown(0);
              return;
            }
            setCycle(cycle + 1);
            setPhase('inhale');
            sfxCoin();
            setCountdown(4);
          }
        } else {
          setCountdown(countdown - 1);
        }
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, phase, cycle, finished, groupId, enqueueAction, scheduleTimeout]);

  return (
    <div className="min-h-[100dvh] bg-teal-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <span className="text-sm font-bold text-teal-300 bg-teal-900/80 px-3 py-1 rounded-full mb-3">
        사이클 {cycle} / 3
      </span>
      <h1 className="text-2xl font-black mb-1">🌬️ 4-7-8 자율신경 이완 호흡</h1>
      <p className="text-xs text-teal-200 mb-8 text-center max-w-xs">
        가슴을 펴고 화면의 원이 커지고 작아지는 리듬에 맞춰 숨을 쉬세요.
      </p>

      <div className="relative w-64 h-64 flex items-center justify-center mb-8">
        <div
          className={`absolute rounded-full transition-all ease-in-out duration-1000 ${
            phase === 'inhale'
              ? 'w-60 h-60 bg-teal-400/40 border-4 border-teal-300 shadow-[0_0_50px_rgba(45,212,191,0.5)]'
              : phase === 'hold'
              ? 'w-60 h-60 bg-amber-400/30 border-4 border-amber-300 shadow-[0_0_40px_rgba(251,191,36,0.5)] animate-pulse'
              : 'w-24 h-24 bg-sky-500/20 border-4 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.3)]'
          }`}
        />
        <div className="relative z-10 flex flex-col items-center">
          <span className="text-xl font-black uppercase tracking-wider text-teal-100 mb-1">
            {phase === 'inhale' ? '들이마시기 (코)' : phase === 'hold' ? '숨 멈추기' : '길게 내쉬기 (입)'}
          </span>
          <span className="text-6xl font-black font-mono">{countdown}</span>
        </div>
      </div>

      <div className="text-center text-xs text-teal-300/80">
        4초 코로 흡기 → 7초 편안히 멈춤 → 8초 입으로 후~ 날숨
      </div>

      {finished && (
        <GameResultOverlay
          title="🌿 심신 이완 완주!"
          subtitle="4-7-8 자율신경 조절 호흡을 마스터했습니다."
          score={500}
          badge="자율신경 호흡 마스터"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   2. 👁️ peripheral-vision-360 (360° 주변시야 동체인식)
   ========================================================================= */
export const PeripheralVision360: React.FC<GameProps> = ({ groupId, enqueueAction: queueAction, onExit }) => {
  const [enqueueAction, resetScoreSubmission] = useGameScoreSubmission(queueAction);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [activeDirection, setActiveDirection] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);

  const DIRS = ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️'];

  const spawnTarget = () => {
    const next = Math.floor(Math.random() * 8);
    setActiveDirection(next);
  };

  const handleRestart = () => {
    resetScoreSubmission();
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(20);
    setFinished(false);
    spawnTarget();
  };

  useEffect(() => {
    spawnTarget();
  }, []);

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          setFinished(true);
          sfxSuccess();
          enqueueAction({
            id: Math.random().toString(),
            type: 'INCREMENT_SCORE',
            payload: { id: groupId, amount: Math.max(200, scoreRef.current * 40) },
            timestamp: Date.now()
          });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [finished, groupId, enqueueAction]);

  const handleHit = (idx: number) => {
    if (finished) return;
    if (idx === activeDirection) {
      sfxCoin();
      hapticTap();
      setScore(s => s + 1);
      scoreRef.current += 1;
      spawnTarget();
    } else {
      sfxPop();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <div className="flex justify-between w-full max-w-sm mb-4">
        <div><span className="text-slate-400 text-xs font-bold">감지 횟수</span><div className="text-2xl font-black">{score}회</div></div>
        <div className="text-right"><span className="text-slate-400 text-xs font-bold">남은 시간</span><div className="text-2xl font-black text-cyan-400">{timeLeft}초</div></div>
      </div>

      <h1 className="text-xl font-black mb-1">👁️ 360° 주변시야 동체인식</h1>
      <p className="text-xs text-slate-400 mb-6 text-center">
        중앙 십자(+)를 똑바로 쳐다본 채, 외곽에서 깜빡이는 방향을 즉각 터치하세요!
      </p>

      <div className="relative w-72 h-72 rounded-full border-2 border-slate-800 bg-slate-900/60 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-cyan-950 border-2 border-cyan-400/80 flex items-center justify-center text-cyan-300 text-xl font-black shadow-[0_0_20px_rgba(34,211,238,0.4)]">
          +
        </div>

        {DIRS.map((dir, idx) => {
          const angle = (idx * 45 - 90) * (Math.PI / 180);
          const r = 108;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          const isActive = activeDirection === idx;

          return (
            <button
              key={idx}
              onClick={() => handleHit(idx)}
              style={{ transform: `translate(${x}px, ${y}px)` }}
              className={`absolute w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black transition-all ${
                isActive
                  ? 'bg-amber-400 text-amber-950 scale-125 ring-4 ring-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.9)] animate-pulse'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {dir}
            </button>
          );
        })}
      </div>

      {finished && (
        <GameResultOverlay
          title={`👁️ ${score}회 동체 포착!`}
          subtitle="주변시야 및 시각 신경 반응 협응 능력이 뛰어납니다."
          score={Math.max(200, score * 40)}
          badge="동체시력 에이스"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   3. 🏃 shuttle-run-beep (셔틀런 삑 비트 인터벌)
   ========================================================================= */
export const ShuttleRunBeep: React.FC<GameProps> = ({ groupId, enqueueAction: queueAction, onExit }) => {
  const [enqueueAction, resetScoreSubmission] = useGameScoreSubmission(queueAction);
  const [level, setLevel] = useState(1);
  const [shuttleCount, setShuttleCount] = useState(0);
  const [runnerPos, setRunnerPos] = useState<'A' | 'B'>('A');
  const [timeLeftInLap, setTimeLeftInLap] = useState(3.0);
  const [finished, setFinished] = useState(false);
  const countRef = useRef(0);

  const LAP_TIME = Math.max(1.2, 3.2 - level * 0.2);

  const handleRestart = () => {
    resetScoreSubmission();
    countRef.current = 0;
    setLevel(1);
    setShuttleCount(0);
    setRunnerPos('A');
    setTimeLeftInLap(3.0);
    setFinished(false);
  };

  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => {
      setTimeLeftInLap(t => {
        if (t <= 0.1) {
          sfxPop();
          setFinished(true);
          enqueueAction({
            id: Math.random().toString(),
            type: 'INCREMENT_SCORE',
            payload: { id: groupId, amount: Math.max(200, countRef.current * 50) },
            timestamp: Date.now()
          });
          return 0;
        }
        return Number((t - 0.1).toFixed(1));
      });
    }, 100);
    return () => clearInterval(interval);
  }, [finished, LAP_TIME, groupId, enqueueAction]);

  const handleRunLap = () => {
    if (finished) return;
    sfxCoin();
    hapticTap();
    const nextCount = shuttleCount + 1;
    setShuttleCount(nextCount);
    countRef.current = nextCount;
    setRunnerPos(p => (p === 'A' ? 'B' : 'A'));
    setTimeLeftInLap(LAP_TIME);

    if (nextCount % 3 === 0) {
      setLevel(l => l + 1);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-indigo-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <div className="flex justify-between w-full max-w-sm mb-4">
        <div><span className="text-indigo-300 text-xs font-bold">단계 / 랩</span><div className="text-2xl font-black">{level}단계 ({shuttleCount}회)</div></div>
        <div className="text-right"><span className="text-indigo-300 text-xs font-bold">남은 랩 시간</span><div className="text-3xl font-black font-mono text-amber-400">{timeLeftInLap}s</div></div>
      </div>

      <h1 className="text-xl font-black mb-1">🏃 왕복오래달리기 셔틀 삑!</h1>
      <p className="text-xs text-indigo-200 mb-8 text-center max-w-xs">
        삑! 신호음이 울리기 전에 반대편 콘으로 달려가 터치하세요! 속도가 빨라집니다.
      </p>

      <div className="w-full max-w-sm h-36 bg-indigo-900/60 border-2 border-indigo-700 rounded-3xl p-4 flex items-center justify-between relative mb-8">
        <div className={`w-14 h-24 rounded-2xl flex flex-col items-center justify-center font-black ${runnerPos === 'A' ? 'bg-amber-400 text-amber-950 shadow-lg scale-105' : 'bg-slate-800 text-slate-400'}`}>
          <span>🚩</span>
          <span className="text-xs">A 콘</span>
        </div>

        <div className={`transition-all duration-300 text-4xl ${runnerPos === 'A' ? '-translate-x-12' : 'translate-x-12'}`}>
          🏃‍♂️💨
        </div>

        <div className={`w-14 h-24 rounded-2xl flex flex-col items-center justify-center font-black ${runnerPos === 'B' ? 'bg-amber-400 text-amber-950 shadow-lg scale-105' : 'bg-slate-800 text-slate-400'}`}>
          <span>🚩</span>
          <span className="text-xs">B 콘</span>
        </div>
      </div>

      <button
        onClick={handleRunLap}
        className="w-full max-w-xs py-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xl rounded-2xl shadow-xl active:scale-95 transition-transform"
      >
        {runnerPos === 'A' ? '👉 B콘으로 전력 질주!' : '👈 A콘으로 전력 질주!'}
      </button>

      {finished && (
        <GameResultOverlay
          title={`🏃 ${shuttleCount}회 완주 달성!`}
          subtitle={`심폐지구력 레벨 ${level}단계까지 페이스를 유지했습니다.`}
          score={Math.max(200, shuttleCount * 50)}
          badge="셔틀런 지구력 철인"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   4. 🧘 mobility-joint-circle (관절 가동성 스무스 서클)
   ========================================================================= */
export const MobilityJointCircle: React.FC<GameProps> = ({ groupId, enqueueAction: queueAction, onExit }) => {
  const [enqueueAction, resetScoreSubmission] = useGameScoreSubmission(queueAction);
  const [progress, setProgress] = useState(0);
  const [finished, setFinished] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  const isDragging = useRef(false);

  const handleRestart = () => {
    resetScoreSubmission();
    setProgress(0);
    setCurrentAngle(0);
    setFinished(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || finished) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    const normalized = (angle + 360) % 360;
    setCurrentAngle(normalized);

    setProgress(p => {
      const next = p + 2.5;
      if (next >= 100) {
        setFinished(true);
        sfxSuccess();
        enqueueAction({
          id: Math.random().toString(),
          type: 'INCREMENT_SCORE',
          payload: { id: groupId, amount: 500 },
          timestamp: Date.now()
        });
        return 100;
      }
      return next;
    });
  };

  return (
    <div className="min-h-[100dvh] bg-emerald-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <h1 className="text-2xl font-black mb-1">🧘 관절 가동성 스무스 서클</h1>
      <p className="text-xs text-emerald-300 mb-6 text-center max-w-xs">
        발목이나 손목을 원을 그리듯 화면의 원 궤적을 손가락으로 부드럽게 3바퀴 회전하세요!
      </p>

      <div
        onPointerDown={e => { if (finished) return; e.currentTarget.setPointerCapture(e.pointerId); isDragging.current = true; sfxTap(); }}
        onPointerCancel={() => { isDragging.current = false; }}
        onPointerUp={() => { isDragging.current = false; }}
        onPointerMove={handlePointerMove}
        className="relative w-64 h-64 rounded-full border-4 border-dashed border-emerald-500/60 bg-emerald-900/40 flex items-center justify-center cursor-pointer touch-none shadow-2xl mb-8"
      >
        <div className="text-center pointer-events-none">
          <div className="text-4xl mb-1">🦶</div>
          <div className="text-xs font-bold text-emerald-200">가동성 궤적 회전</div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{Math.floor(progress)}%</div>
        </div>

        <div
          style={{
            transform: `rotate(${currentAngle}deg) translate(116px) rotate(-${currentAngle}deg)`
          }}
          className="absolute w-10 h-10 rounded-full bg-emerald-400 border-4 border-white shadow-[0_0_20px_rgba(52,211,153,0.8)] pointer-events-none"
        />
      </div>

      <div className="w-full max-w-xs h-3 bg-emerald-900 rounded-full overflow-hidden border border-emerald-700">
        <div className="h-full bg-emerald-400 transition-all duration-75" style={{ width: `${progress}%` }} />
      </div>

      {finished && (
        <GameResultOverlay
          title="🎉 관절 가동성 100% 달성!"
          subtitle="부드러운 관절 가동 범위를 회복하여 부상을 예방합니다."
          score={500}
          badge="관절 유연성 마스터"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   5. ⚖️ foot-center-balance (족저압 무게중심 센서)
   ========================================================================= */
export const FootCenterBalance: React.FC<GameProps> = ({ groupId, enqueueAction: queueAction, onExit }) => {
  const [enqueueAction, resetScoreSubmission] = useGameScoreSubmission(queueAction);
  const scheduleTimeout = useGameTimeouts();
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [stableTime, setStableTime] = useState(0);
  const [finished, setFinished] = useState(false);
  const TARGET_SEC = 10;

  const handleRestart = () => {
    resetScoreSubmission();
    finishedRef.current = false;
    setStableTime(0);
    setPosX(0);
    setPosY(0);
    setFinished(false);
  };

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const gamma = Math.max(-25, Math.min(25, e.gamma ?? 0));
      const beta = Math.max(-25, Math.min(25, (e.beta ?? 45) - 45));
      setPosX(gamma * 3.5);
      setPosY(beta * 3.5);
    };
    window.addEventListener('deviceorientation', handleOrientation);

    const simTimer = setInterval(() => {
      setPosX(x => Math.max(-70, Math.min(70, x + (Math.random() * 20 - 10))));
      setPosY(y => Math.max(-70, Math.min(70, y + (Math.random() * 20 - 10))));
    }, 400);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      clearInterval(simTimer);
    };
  }, []);

  const isCentered = Math.abs(posX) < 25 && Math.abs(posY) < 25;
  const isCenteredRef = useRef(false);
  isCenteredRef.current = isCentered;
  const finishedRef = useRef(false);

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => {
      if (isCenteredRef.current && !finishedRef.current) {
        setStableTime(t => {
          const next = t + 1;
          if (next >= TARGET_SEC && !finishedRef.current) {
            finishedRef.current = true;
            scheduleTimeout(() => {
              setFinished(true);
              sfxSuccess();
              enqueueAction({
                id: Math.random().toString(),
                type: 'INCREMENT_SCORE',
                payload: { id: groupId, amount: 500 },
                timestamp: Date.now()
              });
            }, 0);
          }
          return Math.min(TARGET_SEC, next);
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [finished, groupId, enqueueAction, scheduleTimeout]);

  return (
    <div className="min-h-[100dvh] bg-blue-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <h1 className="text-2xl font-black mb-1">⚖️ 족저압 무게중심 센서</h1>
      <p className="text-xs text-blue-300 mb-6 text-center max-w-xs">
        양 발바닥의 중심을 정중앙 그린 서클에 맞추고 10초간 균형을 유지하세요! (기기 기울기 또는 터치 드래그)
      </p>

      <div
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          setPosX(Math.max(-65, Math.min(65, e.clientX - cx)));
          setPosY(Math.max(-65, Math.min(65, e.clientY - cy)));
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) {
            const rect = e.currentTarget.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            setPosX(Math.max(-65, Math.min(65, e.clientX - cx)));
            setPosY(Math.max(-65, Math.min(65, e.clientY - cy)));
          }
        }}
        className="relative w-64 h-64 rounded-3xl bg-slate-900 border-4 border-blue-700/80 flex items-center justify-center overflow-hidden mb-4 shadow-2xl cursor-pointer touch-none"
      >
        <div className="absolute w-full h-[2px] bg-blue-700/40" />
        <div className="absolute h-full w-[2px] bg-blue-700/40" />
        <div className={`w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center ${isCentered ? 'bg-emerald-500/20 border-emerald-400' : 'border-blue-500/40'}`}>
          <span className="text-xs font-bold text-emerald-300 font-mono">TARGET</span>
        </div>

        <div
          style={{ transform: `translate(${posX}px, ${posY}px)` }}
          className={`absolute w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform duration-100 ${
            isCentered ? 'bg-emerald-400 text-emerald-950 scale-110' : 'bg-red-500 text-white'
          }`}
        >
          🦶
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setPosX(0); setPosY(0); }}
          className="px-4 py-2 bg-blue-800/80 hover:bg-blue-700 rounded-xl text-xs font-bold text-white border border-blue-600 active:scale-95 transition-transform"
        >
          🎯 정중앙 맞추기
        </button>
      </div>

      <div className="text-4xl font-black font-mono mb-2">
        {stableTime} / {TARGET_SEC}초
      </div>
      <div className={`text-xs font-bold ${isCentered ? 'text-emerald-400' : 'text-amber-400'}`}>
        {isCentered ? '✅ 중심 유지 중! 버티세요!' : '⚠️ 중심이 벗어났습니다! 스마트폰을 수평으로 조절하거나 중앙을 터치하세요!'}
      </div>

      {finished && (
        <GameResultOverlay
          title="🏆 평형성 완벽 유지!"
          subtitle="고유수용성 감각과 신체 정렬 중심축을 성공적으로 지켜냈습니다."
          score={500}
          badge="균형 감각 스페셜리스트"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   6. ⚡ agility-dot-drill (5점 닷 드릴 풋워크 시퀀서)
   ========================================================================= */
export const AgilityDotDrill: React.FC<GameProps> = ({ groupId, enqueueAction: queueAction, onExit }) => {
  const [enqueueAction, resetScoreSubmission] = useGameScoreSubmission(queueAction);
  const [round, setRound] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const TOTAL_ROUNDS = 6;

  const PATTERNS = [
    [1, 2, 3, 4, 5],
    [4, 5, 3, 1, 2],
    [1, 5, 3, 2, 4],
  ];

  const currentPattern = PATTERNS[round % PATTERNS.length];

  const handleRestart = () => {
    resetScoreSubmission();
    setRound(0);
    setCurrentStep(0);
    setFinished(false);
  };

  const handleDotClick = (dotId: number) => {
    if (finished) return;
    if (dotId === currentPattern[currentStep]) {
      sfxTap();
      hapticTap();
      if (currentStep + 1 >= currentPattern.length) {
        sfxCoin();
        if (round + 1 >= TOTAL_ROUNDS) {
          setFinished(true);
          sfxSuccess();
          enqueueAction({
            id: Math.random().toString(),
            type: 'INCREMENT_SCORE',
            payload: { id: groupId, amount: 500 },
            timestamp: Date.now()
          });
        } else {
          setRound(r => r + 1);
          setCurrentStep(0);
        }
      } else {
        setCurrentStep(s => s + 1);
      }
    } else {
      sfxPop();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-amber-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <div className="flex justify-between w-full max-w-sm mb-4">
        <div><span className="text-amber-300 text-xs font-bold">라운드</span><div className="text-2xl font-black">{round + 1} / {TOTAL_ROUNDS}</div></div>
        <div className="text-right"><span className="text-amber-300 text-xs font-bold">다음 밟을 발판</span><div className="text-2xl font-black text-amber-400">{currentPattern[currentStep]}번 닷!</div></div>
      </div>

      <h1 className="text-2xl font-black mb-1">⚡ 5점 닷 드릴 풋워크</h1>
      <p className="text-xs text-amber-200 mb-6 text-center max-w-xs">
        빛나는 번호 발판을 발로 밟듯 빠르게 순서대로 터치하세요!
      </p>

      <div className="w-72 h-72 bg-amber-900/60 border-4 border-amber-600 rounded-3xl p-6 grid grid-cols-3 grid-rows-3 gap-3 mb-6 shadow-2xl">
        <button onClick={() => handleDotClick(1)} className={`rounded-2xl font-black text-xl flex items-center justify-center ${currentPattern[currentStep] === 1 ? 'bg-amber-400 text-amber-950 ring-4 ring-white animate-bounce' : 'bg-slate-800 text-slate-400'}`}>1</button>
        <div />
        <button onClick={() => handleDotClick(2)} className={`rounded-2xl font-black text-xl flex items-center justify-center ${currentPattern[currentStep] === 2 ? 'bg-amber-400 text-amber-950 ring-4 ring-white animate-bounce' : 'bg-slate-800 text-slate-400'}`}>2</button>
        <div />
        <button onClick={() => handleDotClick(3)} className={`rounded-2xl font-black text-xl flex items-center justify-center ${currentPattern[currentStep] === 3 ? 'bg-amber-400 text-amber-950 ring-4 ring-white animate-bounce' : 'bg-slate-800 text-slate-400'}`}>3</button>
        <div />
        <button onClick={() => handleDotClick(4)} className={`rounded-2xl font-black text-xl flex items-center justify-center ${currentPattern[currentStep] === 4 ? 'bg-amber-400 text-amber-950 ring-4 ring-white animate-bounce' : 'bg-slate-800 text-slate-400'}`}>4</button>
        <div />
        <button onClick={() => handleDotClick(5)} className={`rounded-2xl font-black text-xl flex items-center justify-center ${currentPattern[currentStep] === 5 ? 'bg-amber-400 text-amber-950 ring-4 ring-white animate-bounce' : 'bg-slate-800 text-slate-400'}`}>5</button>
      </div>

      {finished && (
        <GameResultOverlay
          title="⚡ 번개 풋워크 완주!"
          subtitle="정확하고 빠른 발놀림으로 6개 라운드의 닷 드릴을 통과했습니다."
          score={500}
          badge="민첩성 풋워크 왕"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   7. 💪 eccentric-isom-push (등척성 파워 게이지 홀드)
   ========================================================================= */
export const EccentricIsomPush: React.FC<GameProps> = ({ groupId, enqueueAction: queueAction, onExit }) => {
  const [enqueueAction, resetScoreSubmission] = useGameScoreSubmission(queueAction);
  const scheduleTimeout = useGameTimeouts();
  const [power, setPower] = useState(0);
  const [holdSec, setHoldSec] = useState(0);
  const [finished, setFinished] = useState(false);
  const isPressing = useRef(false);

  const handleRestart = () => {
    resetScoreSubmission();
    finishedRef.current = false;
    isPressing.current = false;
    setPower(0);
    setHoldSec(0);
    setFinished(false);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setPower(p => {
        if (isPressing.current) {
          return Math.min(100, p + 4);
        } else {
          return Math.max(0, p - 6);
        }
      });
    }, 50);
    return () => clearInterval(timer);
  }, []);

  const inTargetZone = power >= 75 && power <= 90;
  const inTargetZoneRef = useRef(false);
  inTargetZoneRef.current = inTargetZone;
  const finishedRef = useRef(false);

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => {
      if (inTargetZoneRef.current && !finishedRef.current) {
        setHoldSec(s => {
          const next = s + 1;
          if (next >= 8 && !finishedRef.current) {
            finishedRef.current = true;
            scheduleTimeout(() => {
              setFinished(true);
              sfxSuccess();
              enqueueAction({
                id: Math.random().toString(),
                type: 'INCREMENT_SCORE',
                payload: { id: groupId, amount: 500 },
                timestamp: Date.now()
              });
            }, 0);
          }
          return Math.min(8, next);
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [finished, groupId, enqueueAction, scheduleTimeout]);

  return (
    <div className="min-h-[100dvh] bg-stone-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <h1 className="text-2xl font-black mb-1">💪 등척성 파워 게이지 홀드</h1>
      <p className="text-xs text-stone-300 mb-6 text-center max-w-xs">
        양손을 가슴 앞에서 서로 맞대고 밀며, 녹색 목표 존(75~90%)에 정확히 힘을 유지하세요!
      </p>

      <div className="relative w-28 h-64 bg-slate-900 border-4 border-stone-700 rounded-3xl overflow-hidden p-2 flex flex-col justify-end mb-6 shadow-2xl">
        <div className="absolute left-2 right-2 bottom-[75%] top-[10%] bg-emerald-500/30 border-2 border-emerald-400 rounded-xl flex items-center justify-center">
          <span className="text-[10px] font-black text-emerald-300">목표 힘 존</span>
        </div>

        <div
          style={{ height: `${power}%` }}
          className={`w-full rounded-xl transition-all duration-75 ${
            inTargetZone ? 'bg-gradient-to-t from-emerald-500 to-green-400 shadow-[0_0_20px_rgba(52,211,153,0.8)]' : 'bg-gradient-to-t from-amber-600 to-orange-500'
          }`}
        />
      </div>

      <div className="text-4xl font-black font-mono mb-6">
        {holdSec} / 8초 버팀
      </div>

      <button
        onPointerDown={() => { isPressing.current = true; sfxTap(); }}
        onPointerUp={() => { isPressing.current = false; }}
        onPointerLeave={() => { isPressing.current = false; }}
        onPointerCancel={() => { isPressing.current = false; }}
        className="w-full max-w-xs py-6 bg-gradient-to-r from-red-600 to-rose-600 active:from-red-700 active:to-rose-700 rounded-3xl text-xl font-black shadow-2xl active:scale-95 transition-all touch-none"
      >
        ✊ 꾹 눌러서 힘 조절하기!
      </button>

      {finished && (
        <GameResultOverlay
          title="🦾 8초 파워 홀드 성공!"
          subtitle="등척성 근력과 근지구력 게이지를 목표 영역에 정확히 통제했습니다."
          score={500}
          badge="등척성 코어 마스터"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   8. 🧗 posture-spine-align (척추 중립 정렬 축 얼라인)
   ========================================================================= */
export const PostureSpineAlign: React.FC<GameProps> = ({ groupId, enqueueAction: queueAction, onExit }) => {
  const [enqueueAction, resetScoreSubmission] = useGameScoreSubmission(queueAction);
  const [headOffset, setHeadOffset] = useState(-30);
  const [shoulderOffset, setShoulderOffset] = useState(25);
  const [pelvisOffset, setPelvisOffset] = useState(-20);
  const [finished, setFinished] = useState(false);

  const isAligned = Math.abs(headOffset) < 8 && Math.abs(shoulderOffset) < 8 && Math.abs(pelvisOffset) < 8;

  const handleRestart = () => {
    resetScoreSubmission();
    setHeadOffset(-30);
    setShoulderOffset(25);
    setPelvisOffset(-20);
    setFinished(false);
  };

  const handleFinish = () => {
    if (!isAligned || finished) return;
    setFinished(true);
    sfxSuccess();
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: 500 },
      timestamp: Date.now()
    });
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <h1 className="text-2xl font-black mb-1">🧗 척추 중립 정렬 축 얼라인</h1>
      <p className="text-xs text-slate-400 mb-6 text-center max-w-xs">
        귀-어깨-골반이 일직선이 되도록 슬라이더를 움직여 바른 자세 축을 완성하세요!
      </p>

      <div className="relative w-64 h-64 bg-slate-900 rounded-3xl border-2 border-slate-700 flex items-center justify-center mb-6 overflow-hidden">
        <div className="absolute h-full w-1 bg-emerald-500/40" />

        <div style={{ transform: `translate(${headOffset}px, -70px)` }} className="absolute w-10 h-10 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-xs font-black text-amber-950 shadow-md">
          머리
        </div>
        <div style={{ transform: `translate(${shoulderOffset}px, -10px)` }} className="absolute w-12 h-10 rounded-2xl bg-cyan-400 border-2 border-white flex items-center justify-center text-xs font-black text-cyan-950 shadow-md">
          어깨
        </div>
        <div style={{ transform: `translate(${pelvisOffset}px, 60px)` }} className="absolute w-14 h-10 rounded-2xl bg-indigo-400 border-2 border-white flex items-center justify-center text-xs font-black text-indigo-950 shadow-md">
          골반
        </div>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold w-12">머리 위치</span>
          <input type="range" min="-40" max="40" value={headOffset} onChange={e => setHeadOffset(Number(e.target.value))} className="flex-1 accent-amber-400" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold w-12">어깨 위치</span>
          <input type="range" min="-40" max="40" value={shoulderOffset} onChange={e => setShoulderOffset(Number(e.target.value))} className="flex-1 accent-cyan-400" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold w-12">골반 위치</span>
          <input type="range" min="-40" max="40" value={pelvisOffset} onChange={e => setPelvisOffset(Number(e.target.value))} className="flex-1 accent-indigo-400" />
        </div>
      </div>

      <button
        onClick={handleFinish}
        disabled={!isAligned}
        className={`w-full max-w-xs py-4 rounded-2xl font-black text-lg transition-all ${
          isAligned ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-xl animate-bounce' : 'bg-slate-800 text-slate-500'
        }`}
      >
        {isAligned ? '✨ 완벽한 바른 자세 확인!' : '중립 축을 일직선으로 맞추세요'}
      </button>

      {finished && (
        <GameResultOverlay
          title="🧘 척추 중립 정렬 완성!"
          subtitle="머리-어깨-골반을 중립 축에 정렬하는 바른 신체 자세를 익혔습니다."
          score={500}
          badge="바른 자세 지킴이"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   9. 💓 pulse-zone-target (목표 심박수 트레이닝 존)
   ========================================================================= */
export const PulseZoneTarget: React.FC<GameProps> = ({ groupId, enqueueAction: queueAction, onExit }) => {
  const [enqueueAction, resetScoreSubmission] = useGameScoreSubmission(queueAction);
  const scheduleTimeout = useGameTimeouts();
  const [bpm, setBpm] = useState(80);
  const [inTargetSec, setInTargetSec] = useState(0);
  const [finished, setFinished] = useState(false);
  const tapTimes = useRef<number[]>([]);

  const handleRestart = () => {
    resetScoreSubmission();
    finishedRef.current = false;
    setBpm(80);
    setInTargetSec(0);
    tapTimes.current = [];
    setFinished(false);
  };

  const handleHeartTap = () => {
    if (finished) return;
    sfxTap();
    hapticTap();
    const now = Date.now();
    tapTimes.current.push(now);
    if (tapTimes.current.length > 5) tapTimes.current.shift();

    if (tapTimes.current.length >= 3) {
      const diffs: number[] = [];
      for (let i = 1; i < tapTimes.current.length; i++) {
        diffs.push(tapTimes.current[i] - tapTimes.current[i - 1]);
      }
      const avgInterval = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const calculatedBpm = Math.min(190, Math.max(60, Math.round(60000 / avgInterval)));
      setBpm(calculatedBpm);
    }
  };

  const isTargetZone = bpm >= 130 && bpm <= 150;
  const isTargetZoneRef = useRef(false);
  isTargetZoneRef.current = isTargetZone;
  const finishedRef = useRef(false);

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => {
      if (isTargetZoneRef.current && !finishedRef.current) {
        setInTargetSec(s => {
          const next = s + 1;
          if (next >= 6 && !finishedRef.current) {
            finishedRef.current = true;
            scheduleTimeout(() => {
              setFinished(true);
              sfxSuccess();
              enqueueAction({
                id: Math.random().toString(),
                type: 'INCREMENT_SCORE',
                payload: { id: groupId, amount: 500 },
                timestamp: Date.now()
              });
            }, 0);
          }
          return Math.min(6, next);
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [finished, groupId, enqueueAction, scheduleTimeout]);

  return (
    <div className="min-h-[100dvh] bg-rose-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <h1 className="text-2xl font-black mb-1">💓 목표 심박수 트레이닝 존</h1>
      <p className="text-xs text-rose-300 mb-6 text-center max-w-xs">
        유산소 지방 연소 존(130~150 BPM)에 맞추어 심장 버튼을 일정한 박자로 탭하세요!
      </p>

      <div className="relative w-64 h-64 rounded-full border-4 border-rose-700 bg-rose-900/60 flex flex-col items-center justify-center mb-6 shadow-2xl">
        <button
          onClick={handleHeartTap}
          className="text-7xl mb-2 active:scale-90 transition-transform cursor-pointer"
        >
          ❤️
        </button>
        <div className="text-5xl font-black font-mono tracking-tight">{bpm} <span className="text-lg">BPM</span></div>
        <div className="text-xs font-bold text-rose-300 mt-1">목표: 130 ~ 150 BPM</div>
      </div>

      <div className="text-3xl font-black font-mono mb-2">
        {inTargetSec} / 6초 유지
      </div>
      <div className={`text-xs font-bold ${isTargetZone ? 'text-emerald-400' : 'text-amber-300'}`}>
        {isTargetZone ? '🔥 완벽한 유산소 운동 존! 템포 유지!' : bpm < 130 ? '⬆️ 더 빠르게 탭하여 심박수를 올리세요!' : '⬇️ 너무 빠릅니다! 템포를 살짝 늦추세요!'}
      </div>

      {finished && (
        <GameResultOverlay
          title="🫀 유산소 심박 타깃존 완주!"
          subtitle="130~150 BPM 유산소 영역에 도달하여 인터벌 심폐 능력을 강화했습니다."
          score={500}
          badge="심박 인터벌 트레이너"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   10. 🧩 cross-lateral-brain (좌우 교차 크로스 브레인짐)
   ========================================================================= */
export const CrossLateralBrain: React.FC<GameProps> = ({ groupId, enqueueAction: queueAction, onExit }) => {
  const [enqueueAction, resetScoreSubmission] = useGameScoreSubmission(queueAction);
  const [leftAction, setLeftAction] = useState<'tap' | 'hold'>('tap');
  const [rightAction, setRightAction] = useState<'tap' | 'hold'>('hold');
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const switchBrainMissions = () => {
    const isSwap = Math.random() > 0.5;
    setLeftAction(isSwap ? 'hold' : 'tap');
    setRightAction(isSwap ? 'tap' : 'hold');
  };

  const handleRestart = () => {
    resetScoreSubmission();
    setScore(0);
    setFinished(false);
    switchBrainMissions();
  };

  const handleCheck = () => {
    if (finished) return;
    sfxCoin();
    hapticTap();
    const nextScore = score + 1;
    setScore(nextScore);
    if (nextScore >= 5) {
      setFinished(true);
      sfxSuccess();
      enqueueAction({
        id: Math.random().toString(),
        type: 'INCREMENT_SCORE',
        payload: { id: groupId, amount: 500 },
        timestamp: Date.now()
      });
    } else {
      switchBrainMissions();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-purple-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <h1 className="text-2xl font-black mb-1">🧩 좌우 교차 브레인짐</h1>
      <p className="text-xs text-purple-300 mb-6 text-center max-w-xs">
        왼손은 톡톡 탭하고 오른손은 꾹 누르는 좌우 비대칭 협응으로 양뇌를 깨우세요!
      </p>

      <div className="flex gap-4 w-full max-w-sm mb-8">
        <div className="flex-1 bg-purple-900/60 border-2 border-purple-600 rounded-3xl p-4 flex flex-col items-center text-center">
          <span className="text-xs font-bold text-purple-300 mb-2">왼손 미션</span>
          <div className="text-4xl mb-2">{leftAction === 'tap' ? '👆' : '✊'}</div>
          <span className="text-sm font-black text-amber-300">{leftAction === 'tap' ? '3번 톡톡 탭!' : '꾹 누르고 있기!'}</span>
        </div>

        <div className="flex-1 bg-purple-900/60 border-2 border-purple-600 rounded-3xl p-4 flex flex-col items-center text-center">
          <span className="text-xs font-bold text-purple-300 mb-2">오른손 미션</span>
          <div className="text-4xl mb-2">{rightAction === 'tap' ? '👆' : '✊'}</div>
          <span className="text-sm font-black text-amber-300">{rightAction === 'tap' ? '3번 톡톡 탭!' : '꾹 누르고 있기!'}</span>
        </div>
      </div>

      <button
        onClick={handleCheck}
        className="w-full max-w-xs py-5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-transform"
      >
        양손 협응 완료! ({score} / 5)
      </button>

      {finished && (
        <GameResultOverlay
          title="🧠 양뇌 교차 협응 성공!"
          subtitle="좌우 비대칭 운동 신경 전달로 두뇌 집중력을 극대화했습니다."
          score={500}
          badge="브레인짐 마스터"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};
