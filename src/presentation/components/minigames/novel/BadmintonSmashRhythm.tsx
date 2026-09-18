import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap } from 'lucide-react';
import { sfxWhoosh, sfxSuccess, sfxPop, sfxFail } from '../../../../application/soundEffects';
import type { SyncAction } from '../../../../application/useSyncQueue';

interface Props {
  groupId: string;
  enqueueAction: (action: SyncAction) => void;
}

export const BadmintonSmashRhythm = ({ groupId, enqueueAction }: Props) => {
  const [shuttleY, setShuttleY] = useState(0); // 0 (top) to 100 (bottom hit box at 80%)
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [hitEffect, setHitEffect] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const shuttleRef = useRef(0);
  const speedRef = useRef(2.2);
  const scoreRef = useRef(0);

  const finishGame = useCallback(() => {
    setFinished(true);
    sfxSuccess();
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: Math.min(250, scoreRef.current) },
      timestamp: Date.now(),
    });
  }, [enqueueAction, groupId]);

  useEffect(() => {
    const anim = setInterval(() => {
      let next = shuttleRef.current + speedRef.current;
      if (next >= 100) {
        // 놓침 (Miss)
        sfxFail();
        setCombo(0);
        setHitEffect('MISS!');
        setTimeout(() => setHitEffect(null), 400);
        next = 0;
        speedRef.current = 2.0 + Math.random() * 1.5;
      }
      shuttleRef.current = next;
      setShuttleY(next);
    }, 30);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          clearInterval(anim);
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(anim);
      clearInterval(timer);
    };
  }, [finishGame]);

  const handleSmash = () => {
    if (finished) return;
    const y = shuttleRef.current;
    // 히트 박스 위치: 70% ~ 88%
    if (y >= 75 && y <= 85) {
      // 퍼펙트 스매시!
      sfxSuccess();
      const newCombo = combo + 1;
      setCombo(newCombo);
      const add = 40 + newCombo * 5;
      setScore(s => {
        const next = s + add;
        scoreRef.current = next;
        return next;
      });
      setHitEffect(`⚡ PERFECT SMASH! (+${add})`);
      shuttleRef.current = 0;
      speedRef.current = 2.2 + Math.random() * 1.5;
    } else if (y >= 65 && y <= 92) {
      // 굿 리턴
      sfxPop();
      setCombo(c => c + 1);
      const add = 20;
      setScore(s => {
        const next = s + add;
        scoreRef.current = next;
        return next;
      });
      setHitEffect('🏸 GOOD RETURN! (+20)');
      shuttleRef.current = 0;
      speedRef.current = 2.0 + Math.random() * 1.5;
    } else {
      // 헛스윙
      sfxWhoosh();
      setCombo(0);
      setHitEffect('💨 TOO EARLY!');
    }

    setTimeout(() => setHitEffect(null), 500);
  };

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-400" />
          <span className="text-white font-bold text-lg">셔틀콕 스매시 리듬</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-yellow-400 font-mono font-bold text-lg">{timeLeft}s</span>
          <span className="text-emerald-400 font-mono font-bold text-lg">{score}점</span>
        </div>
      </div>

      {/* 리듬 레인 및 판정 영역 */}
      <div className="relative w-full h-80 bg-gradient-to-b from-slate-950 via-teal-950 to-slate-900 rounded-2xl overflow-hidden border-2 border-teal-500/40 shadow-inner flex flex-col items-center justify-between p-4 my-2">
        {/* 네트 라인 */}
        <div className="absolute top-10 w-full h-1 bg-white/20 border-t border-dashed border-white/40" />

        {/* 떨어지는 셔틀콕 */}
        <div
          className="absolute text-4xl transition-all duration-75 flex flex-col items-center"
          style={{ top: `${shuttleY}%` }}
        >
          <span>🏸</span>
        </div>

        {/* 하단 히트 박스 (판정선: 75% ~ 85%) */}
        <div className="absolute bottom-12 w-full px-6 flex items-center justify-center">
          <div className="w-full h-14 rounded-xl border-2 border-dashed border-yellow-400 bg-yellow-500/20 flex items-center justify-between px-4">
            <span className="text-xs text-yellow-300 font-bold">SMASH ZONE</span>
            <span className="text-xs text-yellow-300 font-bold">SMASH ZONE</span>
          </div>
        </div>

        {hitEffect && (
          <div className="absolute top-1/2 -translate-y-1/2 text-center text-lg font-black text-yellow-300 bg-slate-950/80 px-4 py-2 rounded-xl border border-yellow-400 animate-bounce">
            {hitEffect}
          </div>
        )}

        <div className="absolute top-2 left-3 text-xs font-mono text-cyan-300">
          콤보: {combo}x
        </div>
      </div>

      {/* 스매시 타격 버튼 */}
      <button
        onClick={handleSmash}
        disabled={finished}
        className="w-full py-6 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-2xl rounded-2xl shadow-xl border-2 border-yellow-300 transition-all flex items-center justify-center gap-2"
      >
        <span>🏸 스매시 스윙! (SWING)</span>
      </button>

      <p className="text-xs text-slate-400 text-center mt-2">
        셔틀콕이 노란색 타격 상자에 들어왔을 때 정확하게 스윙 버튼을 누르세요!
      </p>
    </div>
  );
};
