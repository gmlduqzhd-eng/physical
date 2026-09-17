import { useState, useEffect, useRef } from 'react';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const RedGreenLight = ({ groupId, enqueueAction }: Props) => {
  const [isGreen, setIsGreen] = useState(true);
  const [score, setScore] = useState(0);
  const [eliminated, setEliminated] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);
  const isGreenRef = useRef(true);

  useEffect(() => {
    // 신호 전환 타이머
    const switchSignal = () => {
      const nextGreen = !isGreenRef.current;
      isGreenRef.current = nextGreen;
      setIsGreen(nextGreen);
      const delay = nextGreen ? (1500 + Math.random() * 2500) : (800 + Math.random() * 2000);
      return setTimeout(switchSignal, delay);
    };
    const signalTimer = switchSignal();

    // 게임 타이머
    const gameTimer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(gameTimer);
          clearTimeout(signalTimer);
          setFinished(true);
          enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: scoreRef.current * 30 }, timestamp: Date.now() });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { clearInterval(gameTimer); clearTimeout(signalTimer); };
  }, []);

  const handleTap = () => {
    if (finished || eliminated) return;

    if (isGreenRef.current) {
      setScore(s => s + 1);
      scoreRef.current += 1;
    } else {
      // 빨간불에 터치 → 탈락!
      setEliminated(true);
      enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 0 }, timestamp: Date.now() });
    }
  };

  return (
    <div
      className={`min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none transition-colors duration-200 ${isGreen ? 'bg-emerald-900' : 'bg-red-900'}`}
      onMouseDown={handleTap} onTouchStart={handleTap}
    >
      {!eliminated && !finished && (
        <>
          <div className="flex justify-between w-full max-w-sm mb-6 relative z-10">
            <div><span className="text-white/60 text-sm font-bold">점수</span><div className="text-white text-3xl font-black">{score}</div></div>
            <div className="text-right"><span className="text-white/60 text-sm font-bold">남은 시간</span><div className={`text-3xl font-black ${timeLeft <= 5 ? 'text-yellow-400' : 'text-white'}`}>{timeLeft}초</div></div>
          </div>

          <h1 className="text-3xl font-black text-white mb-4 text-center relative z-10">무궁화 꽃이 피었습니다</h1>

          <div className={`w-40 h-40 rounded-full flex items-center justify-center mb-6 relative z-10 transition-all duration-200 ${isGreen ? 'bg-emerald-500 shadow-[0_0_60px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_60px_rgba(239,68,68,0.5)]'}`}>
            <span className="text-6xl">{isGreen ? '🟢' : '🔴'}</span>
          </div>

          <p className="text-white/80 font-black text-2xl text-center relative z-10 mb-2">
            {isGreen ? '지금 터치!' : 'STOP!'}
          </p>
          <p className="text-white/40 font-bold text-sm text-center relative z-10">
            초록불일 때만 터치하세요!
          </p>
        </>
      )}

      {eliminated && (
        <div className="flex flex-col items-center justify-center">
          <span className="text-8xl mb-6">🚫</span>
          <h1 className="text-5xl font-black text-red-400 mb-4">탈락!</h1>
          <p className="text-white font-bold text-xl">빨간불에 움직였습니다!</p>
          <p className="text-red-300 font-bold mt-2">최종 점수: {score}번 성공</p>
        </div>
      )}

      {finished && !eliminated && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="text-6xl font-black text-emerald-400 mb-4">{score}번 성공!</div>
          <p className="text-xl text-white font-bold">+{score * 30}점 획득!</p>
        </div>
      )}
    </div>
  );
};
