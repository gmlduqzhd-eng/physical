import { useState, useEffect, useRef } from 'react';
import { sfxCoin, sfxSuccess, sfxPop, sfxTap, hapticTap } from '../../../../application/soundEffects';

interface GameProps {
  groupId: string;
  enqueueAction: (a: any) => void;
  onExit?: () => void;
}

/* =========================================================================
   1. 🌬️ breath-pacer-478 (4-7-8 자율신경 이완 페이서)
   ========================================================================= */
export const BreathPacer478 = ({ groupId, enqueueAction }: GameProps) => {
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [cycle, setCycle] = useState(1);
  const [countdown, setCountdown] = useState(4);
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          if (phase === 'inhale') {
            setPhase('hold');
            sfxTap();
            return 7;
          } else if (phase === 'hold') {
            setPhase('exhale');
            sfxTap();
            return 8;
          } else {
            if (cycle >= 3) {
              clearInterval(timer);
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
              return 0;
            }
            setCycle(cy => cy + 1);
            setPhase('inhale');
            sfxCoin();
            return 4;
          }
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, cycle, finished, groupId, enqueueAction]);

  return (
    <div className="min-h-[100dvh] bg-teal-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <span className="text-sm font-bold text-teal-300 bg-teal-900/80 px-3 py-1 rounded-full mb-3">
        사이클 {cycle} / 3
      </span>
      <h1 className="text-2xl font-black mb-1">🌬️ 4-7-8 자율신경 이완 호흡</h1>
      <p className="text-xs text-teal-200 mb-8 text-center max-w-xs">
        가슴을 펴고 화면의 원이 커지고 작아지는 리듬에 맞춰 숨을 쉬세요.
      </p>

      {/* 호흡 펄스 원 */}
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
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="text-5xl font-black text-emerald-400 mb-2">🌿 심신 이완 완료!</div>
          <p className="text-lg text-white font-bold mb-4">+500점 획득 (건강 자율신경 회복)</p>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   2. 👁️ peripheral-vision-360 (360° 주변시야 동체인식)
   ========================================================================= */
export const PeripheralVision360 = ({ groupId, enqueueAction }: GameProps) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [activeDirection, setActiveDirection] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);

  // 8방향 시계방향: 0:상, 1:우상, 2:우, 3:우하, 4:하, 5:좌하, 6:좌, 7:좌상
  const DIRS = ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️'];

  const spawnTarget = () => {
    const next = Math.floor(Math.random() * 8);
    setActiveDirection(next);
  };

  useEffect(() => {
    spawnTarget();
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          setFinished(true);
          sfxSuccess();
          enqueueAction({
            id: Math.random().toString(),
            type: 'INCREMENT_SCORE',
            payload: { id: groupId, amount: scoreRef.current * 40 },
            timestamp: Date.now()
          });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

      {/* 8방향 360도 원형 나침반 터치 그리드 */}
      <div className="relative w-72 h-72 rounded-full border-2 border-slate-800 bg-slate-900/60 flex items-center justify-center">
        {/* 정중앙 고정 시선 타깃 */}
        <div className="w-16 h-16 rounded-full bg-cyan-950 border-2 border-cyan-400/80 flex items-center justify-center text-cyan-300 text-xl font-black shadow-[0_0_20px_rgba(34,211,238,0.4)]">
          +
        </div>

        {DIRS.map((dir, idx) => {
          const angle = (idx * 45 - 90) * (Math.PI / 180);
          const r = 108; // 반지름
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
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="text-5xl font-black text-cyan-400 mb-2">{score}회 감지!</div>
          <p className="text-lg text-white font-bold mb-4">+{score * 40}점 획득 (주변시야 탁월)</p>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   3. 🏃 shuttle-run-beep (셔틀런 삑 비트 인터벌)
   ========================================================================= */
export const ShuttleRunBeep = ({ groupId, enqueueAction }: GameProps) => {
  const [level, setLevel] = useState(1);
  const [shuttleCount, setShuttleCount] = useState(0);
  const [runnerPos, setRunnerPos] = useState<'A' | 'B'>('A');
  const [timeLeftInLap, setTimeLeftInLap] = useState(3.0);
  const [finished, setFinished] = useState(false);
  const countRef = useRef(0);

  // 단계별 셔틀 주행 시간 (초) - 점점 빨라짐
  const LAP_TIME = Math.max(1.2, 3.2 - level * 0.2);

  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => {
      setTimeLeftInLap(t => {
        if (t <= 0.1) {
          // 삑 소리 발생 및 실패 체크 (시간 초과)
          sfxPop();
          setFinished(true);
          enqueueAction({
            id: Math.random().toString(),
            type: 'INCREMENT_SCORE',
            payload: { id: groupId, amount: countRef.current * 50 },
            timestamp: Date.now()
          });
          return 0;
        }
        return Number((t - 0.1).toFixed(1));
      });
    }, 100);
    return () => clearInterval(interval);
  }, [finished, LAP_TIME]);

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

      {/* 20m 셔틀런 코트 비주얼 */}
      <div className="w-full max-w-sm h-36 bg-indigo-900/60 border-2 border-indigo-700 rounded-3xl p-4 flex items-center justify-between relative mb-8">
        <div className={`w-14 h-24 rounded-2xl flex flex-col items-center justify-center font-black ${runnerPos === 'A' ? 'bg-amber-400 text-amber-950 shadow-lg scale-105' : 'bg-slate-800 text-slate-400'}`}>
          <span>🚩</span>
          <span className="text-xs">A 콘</span>
        </div>

        {/* 러너 애니메이션 */}
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
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="text-5xl font-black text-amber-400 mb-2">{shuttleCount}회 완주!</div>
          <p className="text-lg text-white font-bold mb-4">+{shuttleCount * 50}점 (심폐지구력 레벨 {level})</p>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   4. 🧘 mobility-joint-circle (관절 가동성 스무스 서클)
   ========================================================================= */
export const MobilityJointCircle = ({ groupId, enqueueAction }: GameProps) => {
  const [progress, setProgress] = useState(0);
  const [finished, setFinished] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  const isDragging = useRef(false);

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
        onPointerDown={() => { isDragging.current = true; sfxTap(); }}
        onPointerUp={() => { isDragging.current = false; }}
        onPointerMove={handlePointerMove}
        className="relative w-64 h-64 rounded-full border-4 border-dashed border-emerald-500/60 bg-emerald-900/40 flex items-center justify-center cursor-pointer touch-none shadow-2xl mb-8"
      >
        <div className="text-center pointer-events-none">
          <div className="text-4xl mb-1">🦶</div>
          <div className="text-xs font-bold text-emerald-200">가동성 궤적 회전</div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{Math.floor(progress)}%</div>
        </div>

        {/* 궤적 추적 핸들러 포인트 */}
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
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="text-5xl font-black text-emerald-400 mb-2">🎉 관절 가동성 완성!</div>
          <p className="text-lg text-white font-bold mb-4">+500점 획득 (유연성 & 부상 예방)</p>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   5. ⚖️ foot-center-balance (족저압 무게중심 센서)
   ========================================================================= */
export const FootCenterBalance = ({ groupId, enqueueAction }: GameProps) => {
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [stableTime, setStableTime] = useState(0);
  const [finished, setFinished] = useState(false);
  const TARGET_SEC = 10;

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const gamma = Math.max(-25, Math.min(25, e.gamma ?? 0));
      const beta = Math.max(-25, Math.min(25, (e.beta ?? 45) - 45));
      setPosX(gamma * 3.5);
      setPosY(beta * 3.5);
    };
    window.addEventListener('deviceorientation', handleOrientation);

    // 디바이스 센서 미지원 시 자동 미세 진동 시뮬레이션
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

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => {
      if (isCentered) {
        setStableTime(t => {
          const next = t + 1;
          if (next >= TARGET_SEC) {
            setFinished(true);
            sfxSuccess();
            enqueueAction({
              id: Math.random().toString(),
              type: 'INCREMENT_SCORE',
              payload: { id: groupId, amount: 500 },
              timestamp: Date.now()
            });
          }
          return next;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isCentered, finished]);

  return (
    <div className="min-h-[100dvh] bg-blue-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <h1 className="text-2xl font-black mb-1">⚖️ 족저압 무게중심 센서</h1>
      <p className="text-xs text-blue-300 mb-6 text-center max-w-xs">
        양 발바닥의 중심을 정중앙 그린 서클에 맞추고 10초간 균형을 유지하세요!
      </p>

      {/* 십자 무게중심 판 */}
      <div className="relative w-64 h-64 rounded-3xl bg-slate-900 border-4 border-blue-700/80 flex items-center justify-center overflow-hidden mb-6 shadow-2xl">
        <div className="absolute w-full h-[2px] bg-blue-700/40" />
        <div className="absolute h-full w-[2px] bg-blue-700/40" />
        {/* 중앙 목표 서클 */}
        <div className={`w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center ${isCentered ? 'bg-emerald-500/20 border-emerald-400' : 'border-blue-500/40'}`}>
          <span className="text-xs font-bold text-emerald-300 font-mono">TARGET</span>
        </div>

        {/* 무게중심 볼 */}
        <div
          style={{ transform: `translate(${posX}px, ${posY}px)` }}
          className={`absolute w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform duration-100 ${
            isCentered ? 'bg-emerald-400 text-emerald-950 scale-110' : 'bg-red-500 text-white'
          }`}
        >
          🦶
        </div>
      </div>

      <div className="text-4xl font-black font-mono mb-2">
        {stableTime} / {TARGET_SEC}초
      </div>
      <div className={`text-xs font-bold ${isCentered ? 'text-emerald-400' : 'text-amber-400'}`}>
        {isCentered ? '✅ 중심 유지 중! 버티세요!' : '⚠️ 중심이 벗어났습니다! 스마트폰을 수평으로 조절하세요!'}
      </div>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="text-5xl font-black text-emerald-400 mb-2">🏆 평형성 완벽 마스터!</div>
          <p className="text-lg text-white font-bold mb-4">+500점 획득 (고유수용성 감각)</p>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   6. ⚡ agility-dot-drill (5점 닷 드릴 풋워크 시퀀서)
   ========================================================================= */
export const AgilityDotDrill = ({ groupId, enqueueAction }: GameProps) => {
  const [round, setRound] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const TOTAL_ROUNDS = 6;

  // 닷 드릴 패턴: 1:좌상, 2:우상, 3:중앙, 4:좌하, 5:우하
  const PATTERNS = [
    [1, 2, 3, 4, 5],
    [4, 5, 3, 1, 2],
    [1, 5, 3, 2, 4],
  ];

  const currentPattern = PATTERNS[round % PATTERNS.length];

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

      {/* 5점 주사위형 닷 드릴 매트 */}
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
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="text-5xl font-black text-amber-400 mb-2">⚡ 초고속 풋워크 클리어!</div>
          <p className="text-lg text-white font-bold mb-4">+500점 획득 (민첩성 최고 등급)</p>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   7. 💪 eccentric-isom-push (등척성 파워 게이지 홀드)
   ========================================================================= */
export const EccentricIsomPush = ({ groupId, enqueueAction }: GameProps) => {
  const [power, setPower] = useState(0);
  const [holdSec, setHoldSec] = useState(0);
  const [finished, setFinished] = useState(false);
  const isPressing = useRef(false);

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

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => {
      if (inTargetZone) {
        setHoldSec(s => {
          const next = s + 1;
          if (next >= 8) {
            setFinished(true);
            sfxSuccess();
            enqueueAction({
              id: Math.random().toString(),
              type: 'INCREMENT_SCORE',
              payload: { id: groupId, amount: 500 },
              timestamp: Date.now()
            });
          }
          return next;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [inTargetZone, finished]);

  return (
    <div className="min-h-[100dvh] bg-stone-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <h1 className="text-2xl font-black mb-1">💪 등척성 파워 게이지 홀드</h1>
      <p className="text-xs text-stone-300 mb-6 text-center max-w-xs">
        양손을 가슴 앞에서 서로 맞대고 밀며, 녹색 목표 존(75~90%)에 정확히 힘을 유지하세요!
      </p>

      {/* 수직 게이지 바 */}
      <div className="relative w-28 h-64 bg-slate-900 border-4 border-stone-700 rounded-3xl overflow-hidden p-2 flex flex-col justify-end mb-6 shadow-2xl">
        {/* 목표 존 (75% ~ 90%) */}
        <div className="absolute left-2 right-2 bottom-[75%] top-[10%] bg-emerald-500/30 border-2 border-emerald-400 rounded-xl flex items-center justify-center">
          <span className="text-[10px] font-black text-emerald-300">목표 힘 존</span>
        </div>

        {/* 현재 파워 바 */}
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
        className="w-full max-w-xs py-6 bg-gradient-to-r from-red-600 to-rose-600 active:from-red-700 active:to-rose-700 rounded-3xl text-xl font-black shadow-2xl active:scale-95 transition-all"
      >
        ✊ 꾹 눌러서 힘 조절하기!
      </button>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="text-5xl font-black text-emerald-400 mb-2">🦾 근지구력 파워 마스터!</div>
          <p className="text-lg text-white font-bold mb-4">+500점 획득 (근신경 제어력)</p>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   8. 🧗 posture-spine-align (척추 중립 정렬 축 얼라인)
   ========================================================================= */
export const PostureSpineAlign = ({ groupId, enqueueAction }: GameProps) => {
  const [headOffset, setHeadOffset] = useState(-30);
  const [shoulderOffset, setShoulderOffset] = useState(25);
  const [pelvisOffset, setPelvisOffset] = useState(-20);
  const [finished, setFinished] = useState(false);

  const isAligned = Math.abs(headOffset) < 8 && Math.abs(shoulderOffset) < 8 && Math.abs(pelvisOffset) < 8;

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

      {/* 척추 중심선 시각화 */}
      <div className="relative w-64 h-64 bg-slate-900 rounded-3xl border-2 border-slate-700 flex items-center justify-center mb-6 overflow-hidden">
        {/* 기준 수직선 (초록색 타깃) */}
        <div className="absolute h-full w-1 bg-emerald-500/40" />

        {/* 머리 노드 */}
        <div style={{ transform: `translate(${headOffset}px, -70px)` }} className="absolute w-10 h-10 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-xs font-black text-amber-950 shadow-md">
          머리
        </div>
        {/* 어깨 노드 */}
        <div style={{ transform: `translate(${shoulderOffset}px, -10px)` }} className="absolute w-12 h-10 rounded-2xl bg-cyan-400 border-2 border-white flex items-center justify-center text-xs font-black text-cyan-950 shadow-md">
          어깨
        </div>
        {/* 골반 노드 */}
        <div style={{ transform: `translate(${pelvisOffset}px, 60px)` }} className="absolute w-14 h-10 rounded-2xl bg-indigo-400 border-2 border-white flex items-center justify-center text-xs font-black text-indigo-950 shadow-md">
          골반
        </div>
      </div>

      {/* 슬라이더 컨트롤러 */}
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
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="text-5xl font-black text-emerald-400 mb-2">🧘 척추 정렬 완료!</div>
          <p className="text-lg text-white font-bold mb-4">+500점 획득 (평생 바른 자세 습관)</p>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   9. 💓 pulse-zone-target (목표 심박수 트레이닝 존)
   ========================================================================= */
export const PulseZoneTarget = ({ groupId, enqueueAction }: GameProps) => {
  const [bpm, setBpm] = useState(80);
  const [inTargetSec, setInTargetSec] = useState(0);
  const [finished, setFinished] = useState(false);
  const tapTimes = useRef<number[]>([]);

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

  // 목표 존: 130 ~ 150 BPM (유산소 타깃 존)
  const isTargetZone = bpm >= 130 && bpm <= 150;

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => {
      if (isTargetZone) {
        setInTargetSec(s => {
          const next = s + 1;
          if (next >= 6) {
            setFinished(true);
            sfxSuccess();
            enqueueAction({
              id: Math.random().toString(),
              type: 'INCREMENT_SCORE',
              payload: { id: groupId, amount: 500 },
              timestamp: Date.now()
            });
          }
          return next;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isTargetZone, finished]);

  return (
    <div className="min-h-[100dvh] bg-rose-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <h1 className="text-2xl font-black mb-1">💓 목표 심박수 트레이닝 존</h1>
      <p className="text-xs text-rose-300 mb-6 text-center max-w-xs">
        유산소 지방 연소 존(130~150 BPM)에 맞추어 심장 버튼을 일정한 박자로 탭하세요!
      </p>

      {/* 심박수 표시기 */}
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
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="text-5xl font-black text-rose-400 mb-2">🫀 유산소 존 트레이닝 성공!</div>
          <p className="text-lg text-white font-bold mb-4">+500점 획득 (체력 운동 계획 역량)</p>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   10. 🧩 cross-lateral-brain (좌우 교차 크로스 브레인짐)
   ========================================================================= */
export const CrossLateralBrain = ({ groupId, enqueueAction }: GameProps) => {
  const [leftAction, setLeftAction] = useState<'tap' | 'hold'>('tap');
  const [rightAction, setRightAction] = useState<'tap' | 'hold'>('hold');
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);

  const switchBrainMissions = () => {
    const isSwap = Math.random() > 0.5;
    setLeftAction(isSwap ? 'hold' : 'tap');
    setRightAction(isSwap ? 'tap' : 'hold');
  };

  const handleCheck = () => {
    if (finished) return;
    sfxCoin();
    hapticTap();
    const nextScore = score + 1;
    setScore(nextScore);
    scoreRef.current = nextScore;
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
        {/* 왼손 영역 */}
        <div className="flex-1 bg-purple-900/60 border-2 border-purple-600 rounded-3xl p-4 flex flex-col items-center text-center">
          <span className="text-xs font-bold text-purple-300 mb-2">왼손 미션</span>
          <div className="text-4xl mb-2">{leftAction === 'tap' ? '👆' : '✊'}</div>
          <span className="text-sm font-black text-amber-300">{leftAction === 'tap' ? '3번 톡톡 탭!' : '꾹 누르고 있기!'}</span>
        </div>

        {/* 오른손 영역 */}
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
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="text-5xl font-black text-purple-300 mb-2">🧠 양뇌 신경망 활성화!</div>
          <p className="text-lg text-white font-bold mb-4">+500점 획득 (복합 신체 협응력)</p>
        </div>
      )}
    </div>
  );
};
