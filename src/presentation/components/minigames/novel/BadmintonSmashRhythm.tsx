import { useGameTimeouts } from '../common/useGameTimeouts';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap } from 'lucide-react';
import { sfxWhoosh, sfxSuccess, sfxPop, sfxFail } from '../../../../application/soundEffects';
import type { SyncAction } from '../../../../application/useSyncQueue';

interface Props {
  groupId: string;
  enqueueAction: (action: SyncAction) => void;
}

export const BadmintonSmashRhythm = ({ groupId, enqueueAction }: Props) => {
  const scheduleTimeout = useGameTimeouts();
  const [shuttleY, setShuttleY] = useState(0); // 0 (top) to 100 (bottom hit box at 80%)
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [hitEffect, setHitEffect] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  // --- 센서 관련 상태 ---
  const [sensorActive, setSensorActive] = useState(false);
  const [sensorFlash, setSensorFlash] = useState(false);
  const sensorActiveRef = useRef(false);
  const flashTimerRef = useRef<number | null>(null);

  const shuttleRef = useRef(0);
  const speedRef = useRef(2.2);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const finishedRef = useRef(false);
  /** 센서 쿨다운: 500ms 사이 중복 감지 방지 */
  const sensorCooldownRef = useRef(0);

  useEffect(() => { finishedRef.current = finished; }, [finished]);
  useEffect(() => { comboRef.current = combo; }, [combo]);

  const finishGame = useCallback(() => {
    setFinished(true);
    sfxSuccess();
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: Math.min(250, scoreRef.current) },
      timestamp: Date.now(),
    });
  }, [enqueueAction, groupId]);

  useEffect(() => {
    const anim = setInterval(() => {
      let next = shuttleRef.current + speedRef.current;
      if (next >= 100) {
        // 놓침 (Miss)
        sfxFail();
        setCombo(0);
        setHitEffect('MISS!');
        scheduleTimeout(() => setHitEffect(null), 400);
        next = 0;
        speedRef.current = 2.0 + Math.random() * 1.5;
      }
      shuttleRef.current = next;
      setShuttleY(next);
    }, 30);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          clearInterval(anim);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(anim);
      clearInterval(timer);
    };
  }, [scheduleTimeout]);

  useEffect(() => {
    if (timeLeft === 0 && !finished) {
      finishGame();
    }
  }, [timeLeft, finished, finishGame]);

  const handleSmash = useCallback(() => {
    if (finishedRef.current) return;
    const y = shuttleRef.current;
    // 히트 박스 위치: 70% ~ 88%
    if (y >= 75 && y <= 85) {
      // 퍼펙트 스매시!
      sfxSuccess();
      const newCombo = comboRef.current + 1;
      setCombo(newCombo);
      const add = 40 + newCombo * 5;
      setScore(s => {
        const next = s + add;
        scoreRef.current = next;
        return next;
      });
      setHitEffect(`⚡ PERFECT SMASH! (+${add})`);
      shuttleRef.current = 0;
      speedRef.current = 2.2 + Math.random() * 1.5;
    } else if (y >= 65 && y <= 92) {
      // 굿 리턴
      sfxPop();
      setCombo(c => c + 1);
      const add = 20;
      setScore(s => {
        const next = s + add;
        scoreRef.current = next;
        return next;
      });
      setHitEffect('🏸 GOOD RETURN! (+20)');
      shuttleRef.current = 0;
      speedRef.current = 2.0 + Math.random() * 1.5;
    } else {
      // 헛스윙
      sfxWhoosh();
      setCombo(0);
      setHitEffect('💨 TOO EARLY!');
    }

    scheduleTimeout(() => setHitEffect(null), 500);
  }, [scheduleTimeout]);

  // --- devicemotion 센서 등록 (가속도 z 스파이크 감지) ---
  useEffect(() => {
    const handleMotion = (e: DeviceMotionEvent) => {
      const rawZ = e.acceleration?.z ?? e.accelerationIncludingGravity?.z;
      if (typeof rawZ !== 'number' || !Number.isFinite(rawZ)) return;
      if (!sensorActiveRef.current) {
        sensorActiveRef.current = true;
        setSensorActive(true);
      }
      const accZ = rawZ;
      const now = Date.now();

      // 쿨다운 체크 (500ms)
      if (now - sensorCooldownRef.current < 500) return;
      if (finishedRef.current) return;

      // 스매시 감지: |acc.z| 스파이크 > 10
      if (Math.abs(accZ) > 10) {
        sensorCooldownRef.current = now;
        setSensorFlash(true);
        handleSmash();
        if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
        flashTimerRef.current = window.setTimeout(() => setSensorFlash(false), 300);
      }
    };

    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', handleMotion);
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
    };
  }, [handleSmash]);

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex flex-wrap justify-between items-center gap-2 px-2">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-400" />
          <span className="text-white font-bold text-lg">셔틀콕 스매시 리듬</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/40 text-white">
            {sensorActive ? '🟢 센서 활성' : '🔴 터치 모드'}
          </span>
          <span className="text-yellow-400 font-mono font-bold text-lg">{timeLeft}s</span>
          <span className="text-emerald-400 font-mono font-bold text-lg">{score}점</span>
        </div>
      </div>

      {/* 센서 스매시 감지 플래시 */}
      {sensorActive && sensorFlash && (
        <div className="w-full text-center py-1 bg-yellow-500/30 rounded-lg text-xs font-black text-yellow-300 animate-pulse">
          💥 스매시 동작 감지!
        </div>
      )}

      {/* 리듬 레인 및 판정 영역 */}
      <div className="relative w-full h-80 bg-gradient-to-b from-slate-950 via-teal-950 to-slate-900 rounded-2xl overflow-hidden border-2 border-teal-500/40 shadow-inner flex flex-col items-center justify-between p-4 my-2">
        {/* 네트 라인 */}
        <div className="absolute top-10 w-full h-1 bg-white/20 border-t border-dashed border-white/40" />

        {/* 떨어지는 셔틀콕 */}
        <div
          className="absolute text-4xl transition-all duration-75 flex flex-col items-center"
          style={{ top: `${shuttleY}%` }}
        >
          <span>🏸</span>
        </div>

        {/* 하단 히트 박스 (판정선: 75% ~ 85%) */}
        <div className="absolute bottom-12 w-full px-6 flex items-center justify-center">
          <div className="w-full h-14 rounded-xl border-2 border-dashed border-yellow-400 bg-yellow-500/20 flex items-center justify-between px-4">
            <span className="text-xs text-yellow-300 font-bold">SMASH ZONE</span>
            <span className="text-xs text-yellow-300 font-bold">SMASH ZONE</span>
          </div>
        </div>

        {hitEffect && (
          <div className="absolute top-1/2 -translate-y-1/2 text-center text-lg font-black text-yellow-300 bg-slate-950/80 px-4 py-2 rounded-xl border border-yellow-400 animate-bounce">
            {hitEffect}
          </div>
        )}

        <div className="absolute top-2 left-3 text-xs font-mono text-cyan-300">
          콤보: {combo}x
        </div>
      </div>

      {/* 스매시 타격 버튼 — 센서 활성 시 축소 폴백 */}
      <button
        onClick={handleSmash}
        disabled={finished}
        className={`w-full bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-600 hover:brightness-110 active:scale-95 text-slate-950 font-black rounded-2xl shadow-xl border-2 border-yellow-300 transition-all flex items-center justify-center gap-2 ${
          sensorActive ? 'py-3 text-lg max-w-[240px] mx-auto' : 'py-6 text-2xl'
        }`}
      >
        <span>{sensorActive ? '🏸 터치 폴백 (스윙)' : '🏸 스매시 스윙! (SWING)'}</span>
      </button>

      <p className="text-xs text-slate-400 text-center mt-2">
        {sensorActive
          ? '💡 폰을 잡고 실제 스매시 동작(내려치기)을 해보세요! 버튼은 보조 입력입니다.'
          : '셔틀콕이 노란색 타격 상자에 들어왔을 때 정확하게 스윙 버튼을 누르세요!'}
      </p>
    </div>
  );
};
