import { useState, useEffect, useRef } from 'react';
import { sfxPop, sfxCoin } from '../../../application/soundEffects';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

export const FreezeGame = ({ groupId, enqueueAction }: Props) => {
  const [phase, setPhase] = useState<'move' | 'freeze'>('move');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [finished, setFinished] = useState(false);
  const [eliminated, setEliminated] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const scoreRef = useRef(0);
  const phaseRef = useRef<'move' | 'freeze'>('move');
  const TOTAL_ROUNDS = 6;

  useEffect(() => {
    if (round > TOTAL_ROUNDS) {
      setFinished(true);
      enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: scoreRef.current }, timestamp: Date.now() });
      return;
    }
    phaseRef.current = 'move';
    setPhase('move');
    setShakeCount(0);
    const moveTime = 2000 + Math.random() * 3000;
    const freezeTimer = setTimeout(() => {
      phaseRef.current = 'freeze';
      setPhase('freeze');
      setTimeout(() => {
        sfxCoin();
        setScore(s => { const n = s + 50; scoreRef.current = n; return n; });
        setRound(r => r + 1);
      }, 2000);
    }, moveTime);
    return () => clearTimeout(freezeTimer);
  }, [round]);

  useEffect(() => {
    const handler = (e: DeviceMotionEvent) => {
      if (eliminated || finished) return;
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);
      if (phaseRef.current === 'move' && mag > 12) {
        setShakeCount(s => s + 1);
      }
      if (phaseRef.current === 'freeze' && mag > 14) {
        setEliminated(true);
        sfxPop();
        enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: scoreRef.current }, timestamp: Date.now() });
      }
    };
    window.addEventListener('devicemotion', handler);
    return () => window.removeEventListener('devicemotion', handler);
  }, [eliminated, finished]);

  return (
    <div className={`min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none transition-colors duration-300 ${phase === 'move' ? 'bg-green-900' : 'bg-blue-950'}`}>
      <div className="text-white font-bold text-sm mb-2">{round}/{TOTAL_ROUNDS} 라운드 | 점수: {score}</div>
      <h1 className="text-3xl font-black text-white mb-4 text-center">🧊 얼음 땡!</h1>
      {!eliminated && !finished && (
        <>
          <span className="text-8xl mb-4">{phase === 'move' ? '💃' : '🧊'}</span>
          <div className={`text-4xl font-black mb-4 ${phase === 'move' ? 'text-green-300 animate-bounce' : 'text-blue-300'}`}>
            {phase === 'move' ? '움직여! 🏃' : '얼음!! 🧊'}
          </div>
          <p className="text-white/60 font-bold text-sm text-center">
            {phase === 'move' ? '폰을 들고 제자리에서 움직이세요!' : '절대 움직이지 마세요!'}
          </p>
          {phase === 'move' && <div className="text-green-400 font-bold mt-4">움직임 감지: {shakeCount}회</div>}
        </>
      )}
      {eliminated && <div className="text-center"><span className="text-8xl block mb-4">😵</span><div className="text-4xl font-black text-red-400 mb-2">탈락!</div><p className="text-white font-bold">얼음인데 움직였어요!</p></div>}
      {finished && <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center"><div className="text-5xl font-black text-cyan-400 mb-4">{score}점!</div><p className="text-xl text-white font-bold">생존 완료!</p></div>}
    </div>
  );
};
