import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap } from 'lucide-react';
import { sfxTap, sfxSuccess, sfxFail, sfxWhoosh } from '../../../../application/soundEffects';
import type { SyncAction } from '../../../../application/useSyncQueue';

interface Props {
  groupId: string;
  enqueueAction: (action: SyncAction) => void;
}

export const DoubleUnderRope = ({ groupId, enqueueAction }: Props) => {
  const [ropeAngle, setRopeAngle] = useState(0); // 0 to 360 degrees
  const [jumps, setJumps] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const angleRef = useRef(0);
  const tapTimesRef = useRef<number[]>([]);
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
    // 줄넘기 회전 애니메이션
    const anim = setInterval(() => {
      const next = (angleRef.current + 8) % 360;
      angleRef.current = next;
      setRopeAngle(next);

      // 바닥 통과점 (160도 ~ 200도): 이 순간 점프 중이어야 함
      if (next >= 170 && next <= 185) {
        sfxWhoosh();
      }
    }, 25);

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

  const handleTap = () => {
    if (finished) return;
    const now = Date.now();
    sfxTap();

    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length > 2) {
      tapTimesRef.current.shift();
    }

    // 2연속 탭 간격 체크 (따닥! 180ms ~ 280ms 이내 더블 탭)
    if (tapTimesRef.current.length === 2) {
      const diff = tapTimesRef.current[1] - tapTimesRef.current[0];
      const curAngle = angleRef.current;

      // 줄이 아래쪽 통과 구간(120도 ~ 240도)에 도달했을 때 2단 탭 성공
      if (diff <= 320 && curAngle >= 100 && curAngle <= 260) {
        sfxSuccess();
        const newCombo = combo + 1;
        setCombo(newCombo);
        const add = 25 + newCombo * 5;
        scoreRef.current += add;
        setJumps(j => j + 1);
        setFeedback(`⚡ 따닥! 쌩쌩이(2단뛰기) 성공! (+${add}점)`);
        tapTimesRef.current = [];
      } else if (diff > 320) {
        // 단발 탭 (줄에 걸림)
        sfxFail();
        setCombo(0);
        setFeedback('⚠️ 박자가 느렸습니다! 따닥! 더블 탭하세요.');
      }
    }
    setTimeout(() => setFeedback(null), 600);
  };

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-400" />
          <span className="text-white font-bold text-lg">이단 줄넘기 더블 탭</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-yellow-400 font-mono font-bold text-lg">{timeLeft}s</span>
          <span className="text-emerald-400 font-mono font-bold text-lg">{jumps}회 쌩쌩이</span>
        </div>
      </div>

      {/* 가상 줄넘기 시각화 */}
      <div className="relative w-full h-72 bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 rounded-2xl overflow-hidden border-2 border-yellow-500/40 shadow-inner flex flex-col items-center justify-center p-4 my-2">
        {/* 줄넘기 선수 */}
        <div className="text-6xl mb-2 z-10 animate-bounce">
          🏃
        </div>

        {/* 회전하는 줄넘기 궤적 */}
        <div
          className="absolute w-44 h-56 rounded-full border-4 border-yellow-400/80 transition-transform ease-linear shadow-[0_0_15px_rgba(250,204,21,0.6)]"
          style={{ transform: `rotate(${ropeAngle}deg) scaleY(${Math.cos((ropeAngle * Math.PI) / 180)})` }}
        />

        {feedback && (
          <div className="absolute bottom-4 bg-slate-900/90 border border-yellow-400 px-3 py-1 rounded-full text-center text-xs text-yellow-300 font-bold animate-bounce">
            {feedback}
          </div>
        )}

        <div className="absolute top-3 left-4 text-xs font-mono text-cyan-300">
          연속 콤보: {combo}x
        </div>
      </div>

      {/* 점프 탭 버튼 */}
      <button
        onClick={handleTap}
        disabled={finished}
        className="w-full py-7 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-2xl rounded-2xl shadow-2xl border-2 border-yellow-300 transition-all flex flex-col items-center justify-center gap-1"
      >
        <span>따닥! 더블 탭 점프 🦘</span>
        <span className="text-xs text-slate-900 font-bold">줄이 발밑을 지날 때 빠르게 2번 연속 터치하세요!</span>
      </button>
    </div>
  );
};
