import { useState, useEffect, useRef, useCallback } from 'react';
import { Tent, Hammer } from 'lucide-react';
import { sfxTap, sfxSuccess, sfxFail, sfxPop } from '../../../../application/soundEffects';
import type { SyncAction } from '../../../../application/useSyncQueue';

interface Props {
  groupId: string;
  enqueueAction: (action: SyncAction) => void;
}

export const TentPegHammer = ({ groupId, enqueueAction }: Props) => {
  const [pegIndex, setPegIndex] = useState(1); // 1, 2, 3 pegs
  const [pegDepth, setPegDepth] = useState(0); // 0% to 100%
  const [sliderPos, setSliderPos] = useState(50); // 0 to 100%
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [finished, setFinished] = useState(false);
  const [hitFeedback, setHitFeedback] = useState<string | null>(null);

  const sliderRef = useRef(50);
  const dirRef = useRef(1);
  const scoreRef = useRef(0);

  const finishGame = useCallback((bonus = 0) => {
    setFinished(true);
    const finalScore = scoreRef.current + bonus;
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: finalScore },
      timestamp: Date.now(),
    });
  }, [enqueueAction, groupId]);

  // 슬라이더 진자 운동
  useEffect(() => {
    const animInterval = setInterval(() => {
      let next = sliderRef.current + dirRef.current * 3;
      if (next >= 96) {
        next = 96;
        dirRef.current = -1;
      } else if (next <= 4) {
        next = 4;
        dirRef.current = 1;
      }
      sliderRef.current = next;
      setSliderPos(next);
    }, 25);

    const gameTimer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(gameTimer);
          clearInterval(animInterval);
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(animInterval);
      clearInterval(gameTimer);
    };
  }, [finishGame]);

  const handleHammerHit = () => {
    if (finished) return;
    const pos = sliderRef.current;
    // 그린 타격 존: 40% ~ 60%
    if (pos >= 42 && pos <= 58) {
      // 퍼펙트 임팩트!
      sfxTap();
      const newDepth = pegDepth + 34;
      setScore(s => {
        const next = s + 50;
        scoreRef.current = next;
        return next;
      });
      setHitFeedback('🔨 쾅! 퍼펙트 임팩트 (+50점)');

      if (newDepth >= 100) {
        sfxSuccess();
        if (pegIndex >= 3) {
          // 3개 팩 모두 고정 완료!
          setPegDepth(100);
          setHitFeedback('⛺ 모든 텐트 팩 완벽 고정 완료!');
          finishGame(50);
          return;
        } else {
          setPegIndex(p => p + 1);
          setPegDepth(0);
        }
      } else {
        setPegDepth(newDepth);
      }
    } else if (pos >= 25 && pos <= 75) {
      // 굿 임팩트
      sfxPop();
      const newDepth = pegDepth + 18;
      setScore(s => {
        const next = s + 25;
        scoreRef.current = next;
        return next;
      });
      setHitFeedback('👍 탁! 유효 타격 (+25점)');
      if (newDepth >= 100) {
        sfxSuccess();
        if (pegIndex >= 3) {
          setPegDepth(100);
          finishGame(25);
          return;
        } else {
          setPegIndex(p => p + 1);
          setPegDepth(0);
        }
      } else {
        setPegDepth(newDepth);
      }
    } else {
      // 빗맞음 (Miss)
      sfxFail();
      setHitFeedback('💨 빗맞음! 중심에 맞춰 망치를 내리치세요.');
    }

    setTimeout(() => setHitFeedback(null), 700);
  };

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <Tent className="w-6 h-6 text-emerald-400" />
          <span className="text-white font-bold text-lg">텐트 팩 해머링</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">팩 {pegIndex}/3</span>
          <span className="text-amber-400 font-mono font-bold text-lg">{timeLeft}s</span>
          <span className="text-emerald-400 font-mono font-bold text-lg">{score}점</span>
        </div>
      </div>

      {/* 캠핑 텐트와 지면 팩 상태 */}
      <div className="relative w-full h-56 bg-gradient-to-b from-slate-900 via-emerald-950 to-amber-950 rounded-2xl overflow-hidden border-2 border-emerald-500/40 p-4 flex flex-col items-center justify-between shadow-inner">
        <div className="text-5xl mt-2 animate-pulse">⛺</div>

        {/* 바닥 지면과 팩 박힘 깊이 */}
        <div className="w-full flex flex-col items-center">
          <div className="relative w-16 h-20 flex flex-col items-center justify-end">
            <div
              className="w-4 bg-slate-300 border-2 border-slate-600 rounded-t-sm shadow-md transition-all duration-200"
              style={{ height: `${Math.max(15, 60 - (pegDepth * 0.45))}px` }}
            >
              <div className="w-6 h-2 bg-amber-600 -ml-1 rounded-t" />
            </div>
          </div>
          <div className="w-full h-4 bg-amber-900 border-t-2 border-amber-700 rounded-b flex items-center justify-center">
            <span className="text-[10px] text-amber-300/80 font-bold">깊이: {Math.min(100, Math.round(pegDepth))}%</span>
          </div>
        </div>
      </div>

      {/* 임팩트 타이밍 바 */}
      <div className="w-full my-2 bg-slate-900 border border-slate-700 rounded-2xl p-4">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>MISS</span>
          <span className="text-emerald-400 font-bold">임팩트 존 (HIT)</span>
          <span>MISS</span>
        </div>

        <div className="relative w-full h-8 bg-slate-800 rounded-xl overflow-hidden border border-slate-600 flex items-center">
          {/* 가운데 유효 구간 (25% ~ 75%) */}
          <div className="absolute left-[25%] w-[50%] h-full bg-yellow-500/20" />
          {/* 퍼펙트 존 (42% ~ 58%) */}
          <div className="absolute left-[42%] w-[16%] h-full bg-emerald-500/40 border-x-2 border-emerald-400" />

          {/* 움직이는 망치 조준선 */}
          <div
            className="absolute w-4 h-full bg-white shadow-[0_0_10px_white] rounded-sm transition-all ease-linear"
            style={{ left: `calc(${sliderPos}% - 8px)` }}
          />
        </div>
      </div>

      <div className="text-sm font-bold text-center text-yellow-300 min-h-[24px]">
        {hitFeedback || '조준선이 가운데 초록색 영역에 올 때 망치를 치세요!'}
      </div>

      {/* 해머 타격 버튼 */}
      <button
        onClick={handleHammerHit}
        disabled={finished}
        className="w-full py-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xl rounded-2xl shadow-xl border-2 border-emerald-300 transition-all flex items-center justify-center gap-2"
      >
        <Hammer className="w-7 h-7" />
        <span>망치 내려치기 (HAMMER HIT!)</span>
      </button>

      <p className="text-xs text-slate-400 text-center mt-2">
        💡 좌우로 움직이는 조준선이 정중앙 녹색 구간에 왔을 때 쾅! 내려치세요.
      </p>
    </div>
  );
};
