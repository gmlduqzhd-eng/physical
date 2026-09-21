import { useState, useRef } from 'react';
import { sfxCoin, sfxPop } from '../../../application/soundEffects';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const CoinFlip = ({ groupId, enqueueAction }: Props) => {
  const [round, setRound] = useState(1);
  const [streak, setStreak] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [prediction, setPrediction] = useState<'heads' | 'tails' | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [finished, setFinished] = useState(false);
  const lockRef = useRef(false);
  const totalScoreRef = useRef(0);

  const handlePredict = (pred: 'heads' | 'tails') => {
    if (spinning || finished || lockRef.current) return;
    lockRef.current = true;
    setPrediction(pred);
    setSpinning(true);

    const coinResult: 'heads' | 'tails' = Math.random() > 0.5 ? 'heads' : 'tails';

    setTimeout(() => {
      setResult(coinResult);
      setSpinning(false);

      const correct = pred === coinResult;
      if (correct) {
        sfxCoin();
        const bonus = (streak + 1) * 50;
        setStreak(s => s + 1);
        setTotalScore(s => s + bonus);
        totalScoreRef.current += bonus;
      } else {
        sfxPop();
        setStreak(0);
      }

      if (round >= 7) {
        setFinished(true);
        enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: totalScoreRef.current }, timestamp: Date.now() });
      } else {
        setTimeout(() => {
          setRound(r => r + 1);
          setResult(null);
          setPrediction(null);
          lockRef.current = false;
        }, 1200);
      }
    }, 800);
  };

  return (
    <div className="min-h-[100dvh] bg-amber-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none">
      <div className="absolute inset-0 bg-yellow-500/5"></div>
      
      <div className="flex justify-between w-full max-w-sm mb-6 relative z-10">
        <div><span className="text-yellow-300 text-sm font-bold">라운드</span><div className="text-white text-2xl font-black">{round}/7</div></div>
        <div className="text-center"><span className="text-yellow-300 text-sm font-bold">연속 정답</span><div className="text-yellow-400 text-2xl font-black">🔥 {streak}</div></div>
        <div className="text-right"><span className="text-yellow-300 text-sm font-bold">총 점수</span><div className="text-white text-2xl font-black">{totalScore}</div></div>
      </div>

      <h1 className="text-3xl font-black text-white mb-2 text-center relative z-10">동전 뒤집기</h1>
      <p className="text-yellow-200 font-bold mb-8 text-center relative z-10 text-sm">앞/뒤를 예측하세요! 연속 정답 시 배율 증가!</p>

      {/* 동전 */}
      <div className={`w-36 h-36 rounded-full flex items-center justify-center mb-8 relative z-10 border-4 transition-all duration-300 ${spinning ? 'animate-spin border-amber-400 bg-amber-700' : result ? 'border-amber-300 bg-gradient-to-br from-amber-400 to-yellow-600' : 'border-amber-600 bg-gradient-to-br from-amber-500 to-yellow-700'}`}>
        {spinning ? (
          <span className="text-5xl">🪙</span>
        ) : result ? (
          <span className="text-4xl font-black text-amber-900">{result === 'heads' ? '앞' : '뒤'}</span>
        ) : (
          <span className="text-5xl">🪙</span>
        )}
      </div>

      {/* 결과 표시 */}
      {result && !spinning && (
        <div className={`text-2xl font-black mb-6 relative z-10 ${prediction === result ? 'text-emerald-400' : 'text-red-500'}`}>
          {prediction === result ? `정답! +${streak * 50}점` : '오답!'}
        </div>
      )}

      {/* 예측 버튼 */}
      {!finished && !spinning && !result && (
        <div className="flex gap-4 w-full max-w-xs relative z-10">
          <button onClick={() => handlePredict('heads')} className="flex-1 py-6 bg-amber-600 hover:bg-amber-500 rounded-2xl text-white font-black text-xl shadow-[0_6px_0_rgba(146,64,14,1)] active:shadow-none active:translate-y-[6px] transition-all">
            앞면 😊
          </button>
          <button onClick={() => handlePredict('tails')} className="flex-1 py-6 bg-slate-600 hover:bg-slate-500 rounded-2xl text-white font-black text-xl shadow-[0_6px_0_rgba(51,65,85,1)] active:shadow-none active:translate-y-[6px] transition-all">
            뒷면 🔮
          </button>
        </div>
      )}

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="text-6xl font-black text-yellow-300 mb-4">총 {totalScore}점!</div>
          <p className="text-white font-bold text-lg">{totalScore >= 300 ? '대박! 예언가!' : totalScore > 0 ? '나쁘지 않아요!' : '운이 따라주지 않았네요...'}</p>
        </div>
      )}
    </div>
  );
};
