import { useState, useEffect, useRef, useCallback } from 'react';
import { sfxCoin, hapticTap, sfxTimerTick, sfxUrgentWarning } from '../../../application/soundEffects';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

export const SquatCounter = ({ groupId, enqueueAction }: Props) => {
  const [squats, setSquats] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [finished, setFinished] = useState(false);
  const [phase, setPhase] = useState<'up' | 'down'>('up');
  const squatsRef = useRef(0);
  const phaseRef = useRef<'up' | 'down'>('up');
  const finishedRef = useRef(false);
  const lastZ = useRef(0);
  const lastPhaseChangeTime = useRef(Date.now());

  const completeSquat = useCallback(() => {
    phaseRef.current = 'up';
    setPhase('up');
    sfxCoin();
    hapticTap();
    setSquats(s => {
      const n = s + 1;
      squatsRef.current = n;
      return n;
    });
  }, []);

  useEffect(() => {
    const handler = (e: DeviceMotionEvent) => {
      if (finishedRef.current) return;
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const z = acc.z ?? 0;
      const now = Date.now();

      // 스쿼트 앉기 -> 일어서기는 인체 구조상 최소 600ms 이상 소요됨
      if (phaseRef.current === 'up' && z < -2 && lastZ.current >= -2) {
        if (now - lastPhaseChangeTime.current > 400) {
          phaseRef.current = 'down';
          setPhase('down');
          lastPhaseChangeTime.current = now;
        }
      }
      if (phaseRef.current === 'down' && z > 5 && lastZ.current <= 5) {
        if (now - lastPhaseChangeTime.current > 500) {
          completeSquat();
          lastPhaseChangeTime.current = now;
        }
      }
      lastZ.current = z;
    };

    window.addEventListener('devicemotion', handler);
    return () => window.removeEventListener('devicemotion', handler);
  }, [completeSquat]);

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
    if (timeLeft > 0 && timeLeft < 10) {
      sfxTimerTick(timeLeft);
      if (timeLeft === 3) sfxUrgentWarning();
    } else if (timeLeft === 0 && !finished && !finishedRef.current) {
      finishedRef.current = true;
      setFinished(true);
      enqueueAction({
        id: Math.random().toString(),
        type: 'INCREMENT_SCORE',
        payload: { id: groupId, amount: squatsRef.current * 40 },
        timestamp: Date.now()
      });
    }
  }, [timeLeft, finished, groupId, enqueueAction]);

  const triggerSquat = () => {
    if (finishedRef.current || finished) return;
    if (phaseRef.current === 'up') {
      phaseRef.current = 'down';
      setPhase('down');
    } else {
      completeSquat();
    }
  };

  return (
    <div 
      onClick={triggerSquat}
      className="min-h-[100dvh] bg-purple-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none cursor-pointer"
    >
      <div className="flex justify-between w-full max-w-sm mb-6 relative z-10">
        <div><span className="text-purple-400 text-sm font-bold">스쿼트</span><div className="text-white text-3xl font-black">{squats}</div></div>
        <div className="text-right"><span className="text-purple-400 text-sm font-bold">남은 시간</span><div className={`text-3xl font-black ${timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}>{timeLeft}초</div></div>
      </div>
      <span className={`text-8xl mb-4 transition-transform duration-300 ${phase === 'down' ? 'scale-75 translate-y-8' : 'scale-100'}`}>🏋️</span>
      <h1 className="text-3xl font-black text-white mb-2 text-center">스쿼트 챌린지</h1>
      <p className="text-purple-300 font-bold mb-4 text-center text-sm">폰을 가슴에 대고 스쿼트하거나 화면을 터치하세요!</p>
      <div className="text-2xl font-black text-purple-400">{phase === 'down' ? '⬇️ 내려가는 중... (다시 터치하여 일어나기)' : '⬆️ 올라오세요! (터치하여 앉기)'}</div>
      <p className="text-purple-400/80 text-xs mt-3 font-medium">화면 꺼짐 방지 활성 • 정상 스쿼트 템포 자동 보정</p>
      {finished && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center animate-in fade-in">
          <div className="text-6xl font-black text-purple-400 mb-4">{squats}회!</div>
          <p className="text-xl text-white font-bold">+{squats * 40}점</p>
        </div>
      )}
    </div>
  );
};
