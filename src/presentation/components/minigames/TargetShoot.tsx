import { useState, useEffect, useRef } from 'react';
import { sfxTap } from '../../../application/soundEffects';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const TargetShoot = ({ groupId, enqueueAction }: Props) => {
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [ringSize, setRingSize] = useState(200);
  const [finished, setFinished] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const animRef = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const lockRef = useRef(false);

  const shrinkRing = () => {
    setRingSize(prev => {
      if (prev <= 10) return 200; // reset
      return prev - 1.5;
    });
    animRef.current = requestAnimationFrame(shrinkRing);
  };

  useEffect(() => {
    animRef.current = requestAnimationFrame(shrinkRing);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [round]);

  const handleShoot = () => {
    if (finished || lockRef.current) return;
    lockRef.current = true;
    sfxTap();

    if (animRef.current) cancelAnimationFrame(animRef.current);

    // 링이 작을수록 높은 점수
    const pts = ringSize <= 30 ? 100 : ringSize <= 60 ? 70 : ringSize <= 100 ? 40 : ringSize <= 150 ? 20 : 10;
    setLastScore(pts);
    setScore(s => s + pts);
    scoreRef.current += pts;

    if (round >= 5) {
      setFinished(true);
      enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: scoreRef.current }, timestamp: Date.now() });
    } else {
      setTimeout(() => {
        setRound(r => r + 1);
        setRingSize(200);
        setLastScore(null);
        lockRef.current = false;
      }, 800);
    }
  };

  const ringColor = ringSize <= 30 ? 'border-red-500 shadow-red-500/50' : ringSize <= 60 ? 'border-orange-500 shadow-orange-500/30' : ringSize <= 100 ? 'border-yellow-500' : 'border-cyan-500';

  return (
    <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none" onClick={handleShoot}>
      <div className="flex justify-between w-full max-w-sm mb-6 relative z-10">
        <div><span className="text-slate-400 text-sm font-bold">라운드</span><div className="text-white text-2xl font-black">{round}/5</div></div>
        <div className="text-right"><span className="text-slate-400 text-sm font-bold">총 점수</span><div className="text-cyan-400 text-2xl font-black">{score}</div></div>
      </div>

      <h1 className="text-3xl font-black text-white mb-2 text-center relative z-10">🎯 타겟 조준</h1>
      <p className="text-slate-400 font-bold mb-10 text-center relative z-10 text-sm">줄어드는 원이 가장 작을 때 터치하세요!</p>

      <div className="relative w-52 h-52 flex items-center justify-center z-10 mb-8">
        {/* 동심원 가이드 */}
        <div className="absolute w-52 h-52 rounded-full border border-slate-800" />
        <div className="absolute w-36 h-36 rounded-full border border-slate-800" />
        <div className="absolute w-20 h-20 rounded-full border border-slate-800" />
        <div className="absolute w-6 h-6 rounded-full bg-red-500" />
        
        {/* 줄어드는 링 */}
        <div
          className={`absolute rounded-full border-4 ${ringColor} transition-colors duration-100`}
          style={{ width: ringSize, height: ringSize, boxShadow: ringSize <= 30 ? '0 0 20px rgba(239,68,68,0.5)' : 'none' }}
        />
      </div>

      {lastScore !== null && !finished && (
        <div className={`text-3xl font-black relative z-10 animate-bounce ${lastScore >= 70 ? 'text-emerald-400' : lastScore >= 40 ? 'text-yellow-400' : 'text-slate-400'}`}>
          +{lastScore}점!
        </div>
      )}

      {!finished && lastScore === null && (
        <p className="text-slate-500 text-sm font-bold animate-pulse relative z-10">화면을 터치하여 조준!</p>
      )}

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="text-6xl font-black text-cyan-400 mb-4">총 {score}점!</div>
          <p className="text-white font-bold text-lg">{score >= 400 ? 'PERFECT AIM!' : score >= 250 ? 'GREAT SHOT!' : 'KEEP PRACTICING!'}</p>
        </div>
      )}
    </div>
  );
};
