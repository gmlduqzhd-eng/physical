import { useState, useEffect, useRef, useCallback } from 'react';
import { sfxCoin, hapticTap, sfxTimerTick, sfxUrgentWarning } from '../../../application/soundEffects';
import { BiomechanicalMotionDetector } from '../../../application/motionFilter';
import { useWakeLock } from '../../../application/useWakeLock';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

export const JumpDetector = ({ groupId, enqueueAction }: Props) => {
  const [jumps, setJumps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [finished, setFinished] = useState(false);
  const [lastJump, setLastJump] = useState(false);
  const [cheatWarning, setCheatWarning] = useState(false);

  const jumpsRef = useRef(0);
  const cooldown = useRef(false);
  const detectorRef = useRef<BiomechanicalMotionDetector>(
    new BiomechanicalMotionDetector({
      minIntervalMs: 400, // 점프 후 착지 물리적 최소 주기
      threshold: 8.5,     // 유효 체중 부하 가속도 변화량
      maxFrequencyPerSec: 3 // 초당 3회 초과 시 손목 털기 편법 감지
    })
  );

  useWakeLock(true);

  const doJump = useCallback(() => {
    if (cooldown.current || finished) return;
    cooldown.current = true;
    sfxCoin();
    hapticTap();
    setJumps(j => {
      const n = j + 1;
      jumpsRef.current = n;
      return n;
    });
    setLastJump(true);
    setTimeout(() => {
      setLastJump(false);
      cooldown.current = false;
    }, 400);
  }, [finished]);

  useEffect(() => {
    const handler = (e: DeviceMotionEvent) => {
      if (cooldown.current || finished) return;
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc) return;

      const x = acc.x ?? 0;
      const y = acc.y ?? 0;
      const z = acc.z ?? 0;

      const result = detectorRef.current.evaluateMotion(x, y, z);
      if (result.isValid) {
        doJump();
      } else if (result.reason === 'cheat_shake') {
        setCheatWarning(true);
        setTimeout(() => setCheatWarning(false), 1200);
      }
    };

    window.addEventListener('devicemotion', handler);
    return () => {
      window.removeEventListener('devicemotion', handler);
    };
  }, [doJump, finished]);

  useEffect(() => {
    let lastWarnSec = -1;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setFinished(true);
          enqueueAction({
            id: Math.random().toString(),
            type: 'INCREMENT_SCORE',
            payload: { id: groupId, amount: jumpsRef.current * 30 },
            timestamp: Date.now()
          });
          return 0;
        }
        const next = prev - 1;
        if (next > 0 && next < 10 && next !== lastWarnSec) {
          lastWarnSec = next;
          sfxTimerTick(next);
          if (next === 3) sfxUrgentWarning();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [groupId, enqueueAction]);

  return (
    <div 
      onClick={doJump}
      className={`min-h-[100dvh] bg-blue-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none transition-colors cursor-pointer ${lastJump ? '!bg-cyan-900' : ''}`}
    >
      <div className="flex justify-between w-full max-w-sm mb-6 relative z-10">
        <div><span className="text-blue-400 text-sm font-bold">점프 횟수</span><div className="text-white text-3xl font-black">{jumps}</div></div>
        <div className="text-right"><span className="text-blue-400 text-sm font-bold">남은 시간</span><div className={`text-3xl font-black ${timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}>{timeLeft}초</div></div>
      </div>

      <span className={`text-8xl mb-4 transition-transform ${lastJump ? 'scale-125 -translate-y-8' : ''}`}>🦘</span>
      <h1 className="text-3xl font-black text-white mb-2 text-center">점프왕!</h1>
      <p className="text-blue-300 font-bold mb-4 text-center text-sm">폰을 들고 제자리 점프하거나 화면을 탭하세요!</p>

      {cheatWarning && (
        <div className="p-2.5 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 font-bold text-xs mb-3 animate-bounce">
          ⚠️ 손만 가볍게 흔들면 카운트되지 않아요! 높이 점프하세요!
        </div>
      )}

      <div className="w-full max-w-xs h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative z-10">
        <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all" style={{ width: `${Math.min(100, jumps * 5)}%` }} />
      </div>
      <p className="text-blue-500 text-xs mt-2 font-bold">안티 치팅 가속도 필터 작동 중 • 화면 터치 지원</p>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center animate-in fade-in">
          <div className="text-6xl font-black text-cyan-400 mb-4">{jumps}회 점프!</div>
          <p className="text-xl text-white font-bold">+{jumps * 30}점 획득 완료</p>
        </div>
      )}
    </div>
  );
};
