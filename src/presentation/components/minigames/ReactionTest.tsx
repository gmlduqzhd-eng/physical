import { useState, useRef, useEffect } from 'react';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const ReactionTest = ({ groupId, enqueueAction }: Props) => {
  const [phase, setPhase] = useState<'ready' | 'wait' | 'go' | 'done' | 'too_early'>('ready');
  const [reactionTime, setReactionTime] = useState(0);
  const goTimeRef = useRef(0);
  const timerRef = useRef<any>(null);

  const startRound = () => {
    setPhase('wait');
    const delay = 2000 + Math.random() * 4000; // 2~6초 랜덤 대기
    timerRef.current = setTimeout(() => {
      goTimeRef.current = Date.now();
      setPhase('go');
    }, delay);
  };

  const handleTap = () => {
    if (phase === 'ready') {
      startRound();
    } else if (phase === 'wait') {
      clearTimeout(timerRef.current);
      setPhase('too_early');
    } else if (phase === 'go') {
      const time = Date.now() - goTimeRef.current;
      setReactionTime(time);
      setPhase('done');
      const score = time <= 200 ? 500 : time <= 300 ? 300 : time <= 500 ? 100 : 0;
      enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: score }, timestamp: Date.now() });
    } else if (phase === 'too_early') {
      setPhase('ready');
    } else if (phase === 'done') {
      // do nothing, result overlay handles it
    }
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const bgColor = phase === 'wait' ? 'bg-red-600' : phase === 'go' ? 'bg-emerald-500' : phase === 'too_early' ? 'bg-yellow-600' : 'bg-slate-900';

  return (
    <div className={`min-h-[100dvh] ${bgColor} flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none transition-colors duration-100`} onMouseDown={handleTap} onTouchStart={handleTap}>
      {phase === 'ready' && (
        <>
          <span className="text-7xl mb-6">⚡</span>
          <h1 className="text-4xl font-black text-white mb-3 text-center">반응속도 테스트</h1>
          <p className="text-slate-300 font-bold text-center text-lg">화면을 터치하면 시작됩니다</p>
          <p className="text-slate-500 font-bold mt-4 text-center text-sm">화면이 초록색으로 바뀌는 순간<br/>최대한 빨리 터치하세요!</p>
        </>
      )}
      {phase === 'wait' && (
        <>
          <h1 className="text-5xl font-black text-white mb-4 text-center">기다리세요...</h1>
          <p className="text-red-200 font-bold text-center text-lg">초록색이 될 때까지<br/>절대 터치하지 마세요!</p>
        </>
      )}
      {phase === 'go' && (
        <>
          <h1 className="text-6xl font-black text-white mb-4 text-center animate-pulse">지금!</h1>
          <p className="text-emerald-100 font-bold text-center text-2xl">빨리 터치하세요!</p>
        </>
      )}
      {phase === 'too_early' && (
        <>
          <span className="text-7xl mb-4">😬</span>
          <h1 className="text-4xl font-black text-white mb-3 text-center">너무 빨랐어요!</h1>
          <p className="text-yellow-200 font-bold text-center">터치해서 다시 시도하세요</p>
        </>
      )}
      {phase === 'done' && (
        <div className="flex flex-col items-center">
          <span className="text-7xl mb-4">{reactionTime <= 200 ? '🏆' : reactionTime <= 300 ? '⚡' : reactionTime <= 500 ? '👍' : '🐢'}</span>
          <h1 className="text-3xl font-black text-white mb-2">반응 시간</h1>
          <div className={`text-8xl font-black font-mono mb-2 ${reactionTime <= 200 ? 'text-emerald-400' : reactionTime <= 300 ? 'text-cyan-400' : reactionTime <= 500 ? 'text-yellow-400' : 'text-red-500'}`}>
            {reactionTime}<span className="text-3xl">ms</span>
          </div>
          <p className="text-slate-400 font-bold">{reactionTime <= 200 ? 'PERFECT! +500점' : reactionTime <= 300 ? 'GREAT! +300점' : reactionTime <= 500 ? 'GOOD! +100점' : 'SLOW... +0점'}</p>
        </div>
      )}
    </div>
  );
};
