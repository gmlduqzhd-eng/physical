import { useState, useRef, useEffect, useCallback } from 'react';
import { sfxCoin, sfxSuccess } from '../../../application/soundEffects';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

export const BodyTwist = ({ groupId, enqueueAction }: Props) => {
  const [direction, setDirection] = useState<'LEFT' | 'RIGHT'>('LEFT');
  const [count, setCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const countRef = useRef(0);
  const TARGET = 10;

  // --- 센서 관련 상태 ---
  const [sensorActive, setSensorActive] = useState(false);
  const [currentGamma, setCurrentGamma] = useState(0);
  const sensorActiveRef = useRef(false);
  const directionRef = useRef<'LEFT' | 'RIGHT'>('LEFT');
  const finishedRef = useRef(false);
  /** 센서 state machine: 트리거 후 |gamma| < 10°로 복귀해야 다음 트리거 허용 */
  const readyForNextRef = useRef(true);

  // direction/finished를 ref에 동기화 (stale closure 방지)
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { finishedRef.current = finished; }, [finished]);

  const handleTwist = useCallback((dir: 'LEFT' | 'RIGHT') => {
    if (finishedRef.current || dir !== directionRef.current) return;
    sfxCoin();
    const nextCount = countRef.current + 1;
    countRef.current = nextCount;
    setCount(nextCount);

    if (nextCount >= TARGET) {
      finishedRef.current = true;
      setFinished(true);
      sfxSuccess();
      enqueueAction({
        id: Math.random().toString(),
        type: 'INCREMENT_SCORE',
        payload: { id: groupId, amount: 500 },
        timestamp: Date.now()
      });
    } else {
      const next = dir === 'LEFT' ? 'RIGHT' : 'LEFT';
      directionRef.current = next;
      setDirection(next);
    }
  }, [enqueueAction, groupId]);

  // --- deviceorientation 센서 등록 ---
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (typeof e.gamma !== 'number' || !Number.isFinite(e.gamma)) return;
      if (!sensorActiveRef.current) {
        sensorActiveRef.current = true;
        setSensorActive(true);
      }
      const gamma = e.gamma;
      setCurrentGamma(gamma);

      // 중립 복귀 감지
      if (Math.abs(gamma) < 10) {
        readyForNextRef.current = true;
        return;
      }

      if (!readyForNextRef.current || finishedRef.current) return;

      if (gamma < -25) {
        readyForNextRef.current = false;
        handleTwist('LEFT');
      } else if (gamma > 25) {
        readyForNextRef.current = false;
        handleTwist('RIGHT');
      }
    };

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [handleTwist]);

  /** 기울기 인디케이터 위치 (-90~90 → 0%~100%) */
  const tiltPercent = Math.max(0, Math.min(100, ((currentGamma + 90) / 180) * 100));

  return (
    <div className="min-h-[100dvh] bg-indigo-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none text-white">
      {/* 센서 상태 인디케이터 */}
      <div className="absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-full bg-black/40">
        {sensorActive ? '🟢 센서 활성' : '🔴 터치 모드'}
      </div>

      <div className="text-blue-200 font-bold text-sm mb-1">{count} / {TARGET} 회</div>
      <h1 className="text-3xl font-black mb-2 text-center">🔄 몸 비틀기!</h1>
      <p className="text-white text-xs mb-4 text-center">
        {sensorActive
          ? '폰을 좌우로 기울이며 몸을 비틀어 보세요!'
          : '허리를 좌우로 비틀면서 지시된 방향을 터치하세요!'}
      </p>

      {/* 기울기 시각 인디케이터 */}
      {sensorActive && (
        <div className="w-full max-w-xs mb-4">
          <div className="text-[10px] text-blue-300 text-center mb-1">기울기: {Math.round(currentGamma)}°</div>
          <div className="relative w-full h-4 bg-indigo-900 rounded-full overflow-hidden border border-indigo-700">
            {/* 좌측 트리거 존 */}
            <div className="absolute left-0 top-0 h-full bg-blue-800/50" style={{ width: `${((90 - 25) / 180) * 100}%` }} />
            {/* 우측 트리거 존 */}
            <div className="absolute right-0 top-0 h-full bg-purple-800/50" style={{ width: `${((90 - 25) / 180) * 100}%` }} />
            {/* 중립 존 */}
            <div className="absolute top-0 h-full bg-green-700/40"
              style={{ left: `${((90 - 10) / 180) * 100}%`, width: `${(20 / 180) * 100}%` }} />
            {/* 현재 위치 마커 */}
            <div className="absolute top-0 h-full w-1.5 bg-white rounded-full shadow-lg transition-all duration-75"
              style={{ left: `${tiltPercent}%` }} />
          </div>
        </div>
      )}

      <div className="text-8xl mb-6 animate-pulse">
        {direction === 'LEFT' ? '⬅️' : '➡️'}
      </div>

      <div className="text-2xl font-black mb-8 text-blue-200">
        {direction === 'LEFT' ? '왼쪽으로 비틀기!' : '오른쪽으로 비틀기!'}
      </div>

      {/* 터치 폴백 버튼 (센서 활성 시 축소) */}
      <div className={`grid grid-cols-2 gap-4 w-full mb-6 ${sensorActive ? 'max-w-[200px]' : 'max-w-xs'}`}>
        <button
          onClick={() => handleTwist('LEFT')}
          disabled={finished || direction !== 'LEFT'}
          className={`rounded-2xl font-black flex flex-col items-center justify-center transition-all ${
            sensorActive ? 'py-3 text-xs' : 'py-8 text-xl'
          } ${
            direction === 'LEFT'
              ? 'bg-gradient-to-r from-blue-500 to-indigo-500 ring-4 ring-white shadow-2xl scale-105 active:scale-95'
              : 'bg-slate-800 opacity-40'
          }`}
        >
          <span className={sensorActive ? 'text-lg mb-0.5' : 'text-3xl mb-1'}>👈</span>
          {sensorActive ? '터치 폴백' : '좌측 터치'}
        </button>

        <button
          onClick={() => handleTwist('RIGHT')}
          disabled={finished || direction !== 'RIGHT'}
          className={`rounded-2xl font-black flex flex-col items-center justify-center transition-all ${
            sensorActive ? 'py-3 text-xs' : 'py-8 text-xl'
          } ${
            direction === 'RIGHT'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 ring-4 ring-white shadow-2xl scale-105 active:scale-95'
              : 'bg-slate-800 opacity-40'
          }`}
        >
          <span className={sensorActive ? 'text-lg mb-0.5' : 'text-3xl mb-1'}>👉</span>
          {sensorActive ? '터치 폴백' : '우측 터치'}
        </button>
      </div>

      <div className="w-full max-w-xs h-3 bg-indigo-900 rounded-full overflow-hidden border border-indigo-800">
        <div
          className="h-full bg-indigo-400 transition-all"
          style={{ width: `${(count / TARGET) * 100}%` }}
        />
      </div>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center">
          <div className="text-5xl font-black text-emerald-400 mb-2">🎉 완벽한 트위스트!</div>
          <p className="text-xl text-white font-bold mb-4">+500점 획득</p>
        </div>
      )}
    </div>
  );
};
