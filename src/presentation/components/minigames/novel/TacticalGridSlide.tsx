import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { sfxTap, sfxSuccess, sfxFail } from '../../../../application/soundEffects';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const TacticalGridSlide = ({ groupId, enqueueAction }: Props) => {
  const [round, setRound] = useState(1);
  const [strikerPos, setStrikerPos] = useState({ row: 0, col: 1 }); // striker starts at top
  const [defenders, setDefenders] = useState<number[]>([4, 7]); // tile indices (0 to 8)
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [roundTime, setRoundTime] = useState(5);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    // 새 라운드: 공격수 위치 랜덤
    const targetCol = Math.floor(Math.random() * 3);
    setStrikerPos({ row: 0, col: targetCol });
    setRoundTime(5);
    setFeedback('공격수의 슛 코스를 예측하여 수비수를 배치하세요!');

    const timer = setInterval(() => {
      setRoundTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          evaluateDefense(targetCol);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [round]);

  const finishGame = (finalScore?: number) => {
    setFinished(true);
    sfxSuccess();
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: finalScore !== undefined ? finalScore : score },
      timestamp: Date.now(),
    });
  };

  const evaluateDefense = (targetCol: number) => {
    // 수비수 중 하나라도 targetCol 열에 배치되어 있으면 블록 성공!
    // (열 인덱스: 0, 1, 2)
    const blocked = defenders.some(idx => idx % 3 === targetCol);

    if (blocked) {
      sfxSuccess();
      const add = 50;
      setScore(s => s + add);
      setFeedback('🛡️ 슛 궤적 완벽 차단! 블록 성공 (+50점)');
    } else {
      sfxFail();
      setFeedback('⚽ 수비 빈틈으로 실점 허용!');
    }

    setTimeout(() => {
      if (round >= 4) {
        finishGame(score + (blocked ? 50 : 0));
      } else {
        setRound(r => r + 1);
      }
    }, 1200);
  };

  const handleTileClick = (idx: number) => {
    if (finished) return;
    sfxTap();
    setDefenders(prev => {
      if (prev.includes(idx)) {
        return prev.filter(i => i !== idx);
      } else {
        if (prev.length >= 2) {
          return [prev[1], idx]; // 최대 2명 유지
        }
        return [...prev, idx];
      }
    });
  };

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-emerald-400" />
          <span className="text-white font-bold text-lg">수비 포메이션 슬라이더</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">라운드 {round}/4</span>
          <span className="text-emerald-400 font-mono font-bold text-lg">{score}점</span>
        </div>
      </div>

      {/* 상대 공격수 공격 코스 예고 */}
      <div className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 flex items-center justify-between my-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏃‍♂️</span>
          <div className="text-xs">
            <span className="text-slate-400">침투 공격수: </span>
            <span className="text-rose-400 font-bold">{strikerPos.col === 0 ? '왼쪽' : strikerPos.col === 1 ? '중앙' : '오른쪽'} 돌파!</span>
          </div>
        </div>
        <div className="text-sm font-mono font-bold text-yellow-300">
          남은 시간: {roundTime}s
        </div>
      </div>

      {/* 3x3 전술 보드 */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[320px] aspect-square bg-slate-900/90 border-2 border-emerald-500/40 rounded-2xl p-4 shadow-xl my-2">
        {Array.from({ length: 9 }).map((_, idx) => {
          const isDefender = defenders.includes(idx);
          const isStrikerPath = idx % 3 === strikerPos.col;

          return (
            <button
              key={idx}
              onClick={() => handleTileClick(idx)}
              className={`rounded-xl border-2 flex flex-col items-center justify-center transition-all ${isDefender ? 'bg-emerald-600 border-emerald-300 text-white shadow-lg scale-105' : isStrikerPath ? 'bg-rose-950/30 border-dashed border-rose-500/40 text-slate-400' : 'bg-slate-800/60 border-slate-700 text-slate-500 hover:border-slate-500'}`}
            >
              {isDefender ? (
                <div className="text-3xl">🛡️</div>
              ) : isStrikerPath && idx < 3 ? (
                <div className="text-xl opacity-60">⚽</div>
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-600" />
              )}
            </button>
          );
        })}
      </div>

      <div className="text-xs font-bold text-center text-yellow-300 min-h-[20px]">
        {feedback}
      </div>

      <p className="text-xs text-slate-400 text-center mt-2">
        💡 침투하는 공격수의 길목(세로 열)에 수비수 2명을 배치하여 패스 길을 차단하세요!
      </p>
    </div>
  );
};
