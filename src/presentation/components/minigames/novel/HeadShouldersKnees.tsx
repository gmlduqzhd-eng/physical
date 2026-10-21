import { useGameTimeouts } from '../common/useGameTimeouts';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Smile } from 'lucide-react';
import { sfxSuccess, sfxPop, sfxFail } from '../../../../application/soundEffects';
import type { SyncAction } from '../../../../application/useSyncQueue';

interface Props {
  groupId: string;
  enqueueAction: (action: SyncAction) => void;
}

type BodyPart = 'head' | 'shoulders' | 'knees' | 'toes';
const BODY_PART_IDS: BodyPart[] = ['head', 'shoulders', 'knees', 'toes'];

const BODY_PARTS: { id: BodyPart; label: string; emoji: string; color: string }[] = [
  { id: 'head', label: '머리', emoji: '🧢', color: 'from-amber-500 to-orange-600' },
  { id: 'shoulders', label: '어깨', emoji: '👕', color: 'from-cyan-500 to-blue-600' },
  { id: 'knees', label: '무릎', emoji: '👖', color: 'from-emerald-500 to-teal-600' },
  { id: 'toes', label: '발', emoji: '👟', color: 'from-rose-500 to-pink-600' },
];

/** beta 각도를 BodyPart로 매핑 */
const betaToBodyPart = (beta: number): BodyPart => {
  if (beta > 60) return 'head';
  if (beta > 30) return 'shoulders';
  if (beta > 0) return 'knees';
  return 'toes';
};

export const HeadShouldersKnees = ({ groupId, enqueueAction }: Props) => {
  const scheduleTimeout = useGameTimeouts();
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [currentTarget, setCurrentTarget] = useState<BodyPart>(() => BODY_PART_IDS[Math.floor(Math.random() * BODY_PART_IDS.length)]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);

  // --- 센서 관련 상태 ---
  const [sensorActive, setSensorActive] = useState(false);
  const [currentBeta, setCurrentBeta] = useState(45);
  const [sensorZone, setSensorZone] = useState<BodyPart>('shoulders');
  const sensorActiveRef = useRef(false);
  const finishedRef = useRef(false);
  const currentTargetRef = useRef(currentTarget);
  /** 300ms 동안 같은 존에 머물렀을 때 자동 선택하기 위한 타이머 */
  const zoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastZoneRef = useRef<BodyPart | null>(null);
  /** 자동 선택 후 중복 방지 플래그 */
  const autoSelectedRef = useRef(false);

  useEffect(() => { finishedRef.current = finished; }, [finished]);
  useEffect(() => { currentTargetRef.current = currentTarget; }, [currentTarget]);

  const pickNextTarget = useCallback(() => {
    setCurrentTarget(BODY_PART_IDS[Math.floor(Math.random() * BODY_PART_IDS.length)]);
    autoSelectedRef.current = false;
  }, []);

  const finishGame = useCallback((finalScore?: number) => {
    setFinished(true);
    sfxSuccess();
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: finalScore ?? scoreRef.current },
      timestamp: Date.now(),
    });
  }, [enqueueAction, groupId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && !finished) {
      finishGame();
    }
  }, [timeLeft, finished, finishGame]);

  const handleTouchPart = useCallback((part: BodyPart) => {
    if (finishedRef.current) return;
    if (part === currentTargetRef.current) {
      // 정답!
      sfxPop();
      const add = 20;
      setScore(s => {
        const next = s + add;
        scoreRef.current = next;
        return next;
      });
      setFeedback('✨ 딩동댕! 정확한 신체 부위 터치!');
      pickNextTarget();
    } else {
      sfxFail();
      setFeedback('😅 다시 찾아보세요!');
    }
    scheduleTimeout(() => setFeedback(null), 500);
  }, [pickNextTarget, scheduleTimeout]);

  // --- deviceorientation 센서 등록 ---
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (typeof e.beta !== 'number' || !Number.isFinite(e.beta)) return;
      if (!sensorActiveRef.current) {
        sensorActiveRef.current = true;
        setSensorActive(true);
      }
      const beta = e.beta;
      setCurrentBeta(beta);

      const zone = betaToBodyPart(beta);
      setSensorZone(zone);

      // 존이 바뀌면 타이머 리셋
      if (zone !== lastZoneRef.current) {
        lastZoneRef.current = zone;
        autoSelectedRef.current = false;
        if (zoneTimerRef.current) clearTimeout(zoneTimerRef.current);

        zoneTimerRef.current = setTimeout(() => {
          if (!finishedRef.current && !autoSelectedRef.current) {
            autoSelectedRef.current = true;
            handleTouchPart(zone);
          }
        }, 300);
      }
    };

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      if (zoneTimerRef.current) clearTimeout(zoneTimerRef.current);
    };
  }, [handleTouchPart]);

  const targetObj = BODY_PARTS.find(p => p.id === currentTarget)!;

  /** beta 기울기 인디케이터를 위한 위치 계산 (-90~90 → 100%~0%) - 위쪽이 head */
  const tiltIndicatorPercent = Math.max(0, Math.min(100, 100 - ((currentBeta + 90) / 180) * 100));

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex flex-wrap justify-between items-center gap-2 px-2">
        <div className="flex items-center gap-2">
          <Smile className="w-6 h-6 text-yellow-400" />
          <span className="text-white font-bold text-lg">머리 어깨 무릎 발 바디 비트</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/40 text-white">
            {sensorActive ? '🟢 센서 활성' : '🔴 터치 모드'}
          </span>
          <span className="text-yellow-400 font-mono font-bold text-lg">{timeLeft}s</span>
          <span className="text-emerald-400 font-mono font-bold text-lg">{score}점</span>
        </div>
      </div>

      {/* 목표 신체 부위 지시 카드 */}
      <div className="w-full bg-slate-900 border-2 border-yellow-400/50 rounded-2xl p-4 text-center my-2 shadow-xl">
        <span className="text-xs text-yellow-300 font-bold">지금 짚어야 할 신체 부위:</span>
        <div className="text-4xl font-black text-white mt-1 flex items-center justify-center gap-2">
          <span>{targetObj.emoji}</span>
          <span className="underline decoration-yellow-400">{targetObj.label}</span>
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {sensorActive
            ? '폰을 들고 해당 신체 부위 높이로 움직이세요!'
            : '우리 몸의 해당 부위를 만지며 화면을 터치하세요!'}
        </div>
      </div>

      {/* 센서 기울기 인디케이터 */}
      {sensorActive && (
        <div className="w-full flex items-center gap-2 my-1">
          {/* 세로 틸트 바 */}
          <div className="relative w-8 h-32 bg-slate-800 rounded-lg overflow-hidden border border-slate-600 flex-shrink-0">
            {/* 4개 존 표시 */}
            <div className="absolute top-0 w-full h-1/4 bg-amber-600/30 border-b border-amber-500/40" />
            <div className="absolute top-1/4 w-full h-1/4 bg-cyan-600/30 border-b border-cyan-500/40" />
            <div className="absolute top-2/4 w-full h-1/4 bg-emerald-600/30 border-b border-emerald-500/40" />
            <div className="absolute top-3/4 w-full h-1/4 bg-rose-600/30" />
            {/* 현재 위치 마커 */}
            <div
              className="absolute left-0 w-full h-1 bg-white rounded-full shadow-lg transition-all duration-100"
              style={{ top: `${tiltIndicatorPercent}%` }}
            />
          </div>
          {/* 존 라벨 */}
          <div className="flex flex-col justify-between h-32 text-[10px] font-bold">
            {BODY_PARTS.map(part => (
              <div
                key={part.id}
                className={`px-2 py-1 rounded transition-all ${
                  sensorZone === part.id
                    ? 'bg-yellow-500/30 text-yellow-200 ring-1 ring-yellow-400 scale-105'
                    : 'text-slate-500'
                }`}
              >
                {part.emoji} {part.label} {sensorZone === part.id && '◀'}
              </div>
            ))}
          </div>
          <div className="text-[10px] text-slate-400 ml-auto">
            기울기: {Math.round(currentBeta)}°
          </div>
        </div>
      )}

      {feedback && (
        <div className="text-sm font-bold text-center text-yellow-300 animate-bounce">
          {feedback}
        </div>
      )}

      {/* 4대 신체 부위 대형 터치 패널 (1~2학년 친화형) — 센서 활성 시 축소 */}
      <div className={`grid grid-cols-2 gap-3.5 w-full my-2 ${sensorActive ? 'max-w-[240px]' : ''}`}>
        {BODY_PARTS.map(part => (
          <button
            key={part.id}
            onClick={() => handleTouchPart(part.id)}
            disabled={finished}
            className={`rounded-2xl bg-gradient-to-br ${part.color} hover:brightness-110 active:scale-95 text-white font-black shadow-xl border-2 border-white/20 flex flex-col items-center justify-center gap-2 transition-transform ${
              sensorActive ? 'py-3 text-sm' : 'py-6 text-xl'
            }`}
          >
            <span className={sensorActive ? 'text-2xl' : 'text-4xl'}>{part.emoji}</span>
            <span>{sensorActive ? '터치 폴백' : part.label}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-400 text-center mt-2">
        {sensorActive
          ? '💡 폰을 위아래로 움직여 신체 부위를 선택하세요! (300ms 유지 시 자동 선택)'
          : '💡 머리-어깨-무릎-발! 제시되는 신체 부위 버튼을 노래하듯 신나게 터치하세요!'}
      </p>
    </div>
  );
};
