import { useState, useEffect, useRef, useCallback } from 'react';
import { Shield } from 'lucide-react';
import { sfxTap, sfxSuccess, sfxFail } from '../../../../application/soundEffects';
import type { SyncAction } from '../../../../application/useSyncQueue';

interface Props {
  groupId: string;
  enqueueAction: (action: SyncAction) => void;
}

export const TacticalGridSlide = ({ groupId, enqueueAction }: Props) => {
  const [round, setRound] = useState(1);
  const [strikerPos, setStrikerPos] = useState(() => ({ row: 0, col: Math.floor(Math.random() * 3) }));
  const [defenders, setDefenders] = useState<number[]>([4, 7]); // tile indices (0 to 8)
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>('공격수의 슛 코스를 예측하여 수비수를 배치하세요!');
  const [roundTime, setRoundTime] = useState(5);
  const [finished, setFinished] = useState(false);
  const defendersRef = useRef<number[]>([4, 7]);
  const scoreRef = useRef(0);
  const targetColRef = useRef(strikerPos.col);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishGame = useCallback(() => {
    setFinished(true);
    sfxSuccess();
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: scoreRef.current },
      timestamp: Date.now(),
    });
  }, [enqueueAction, groupId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRoundTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          const blocked = defendersRef.current.some(idx => idx % 3 === targetColRef.current);
          if (blocked) {
            sfxSuccess();
            scoreRef.current += 50;
            setScore(scoreRef.current);
            setFeedback('🛡️ 슛 궤적 완벽 차단! 블록 성공 (+50점)');
          } else {
            sfxFail();
            setFeedback('⚽ 수비 빈틈으로 실점 허용!');
          }
          advanceTimeoutRef.current = setTimeout(() => {
            if (round >= 4) {
              finishGame();
            } else {
              const nextCol = Math.floor(Math.random() * 3);
              targetColRef.current = nextCol;
              setStrikerPos({ row: 0, col: nextCol });
              setRoundTime(5);
              setFeedback('공격수의 슛 코스를 예측하여 수비수를 배치하세요!');
              setRound(r => r + 1);
            }
          }, 1200);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    };
  }, [finishGame, round]);

  const handleTileClick = (idx: number) => {
    if (finished) return;
    sfxTap();
    setDefenders(prev => {
      let next: number[];
      if (prev.includes(idx)) {
        next = prev.filter(i => i !== idx);
      } else {
        if (prev.length >= 2) {
          next = [prev[1], idx]; // 최대 2명 유지
        } else {
          next = [...prev, idx];
        }
      }
      defendersRef.current = next;
      return next;
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
            <span className="text-pink-300 font-bold">{strikerPos.col === 0 ? '왼쪽' : strikerPos.col === 1 ? '중앙' : '오른쪽'} 돌파!</span>
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
