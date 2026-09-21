import { useState, useEffect, useRef, useCallback } from 'react';
import { Waves, ArrowLeft, ArrowRight } from 'lucide-react';
import { sfxWhoosh, sfxSuccess, sfxPop, sfxFail } from '../../../../application/soundEffects';
import type { SyncAction } from '../../../../application/useSyncQueue';

interface Props {
  groupId: string;
  enqueueAction: (action: SyncAction) => void;
}

export const KayakPaddle = ({ groupId, enqueueAction }: Props) => {
  const [distance, setDistance] = useState(0); // 0 to 100 meters
  const [lastPaddle, setLastPaddle] = useState<'left' | 'right' | null>(null);
  const [lastTime, setLastTime] = useState<number>(0);
  const [tempoCombo, setTempoCombo] = useState(0);
  const [feedback, setFeedback] = useState<string>('좌/우 번갈아 노를 저으세요!');
  const [timeLeft, setTimeLeft] = useState(20);
  const [finished, setFinished] = useState(false);

  const goalDistance = 100;
  const currentRef = useRef({ distance: 0, combo: 0 });

  const finishGame = useCallback((finalDist?: number) => {
    setFinished(true);
    const d = finalDist ?? currentRef.current.distance;
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: Math.min(200, Math.round(d * 2)) },
      timestamp: Date.now(),
    });
  }, [enqueueAction, groupId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finishGame();
          return 0;
        }
        // 물살 저항 (매초 약간씩 뒤로 밀림)
        setDistance(d => Math.max(0, d - 1.5));
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [finishGame]);

  const handlePaddle = (side: 'left' | 'right') => {
    if (finished) return;
    const now = Date.now();
    const interval = now - lastTime;

    if (side === lastPaddle) {
      // 같은 쪽만 두 번 저음 -> 균형 잃음
      sfxFail();
      setTempoCombo(0);
      currentRef.current.combo = 0;
      setFeedback('⚠️ 같은 쪽만 저으면 카약이 회전합니다! 반대쪽을 저으세요.');
      setLastTime(now);
      return;
    }

    // 교차 성공: 템포 체크 (0.3s ~ 1.0s 이내 완벽한 박자)
    if (lastTime !== 0 && (interval < 250 || interval > 1200)) {
      sfxPop();
      const add = 2.5;
      const nextD = Math.min(goalDistance, distance + add);
      setDistance(nextD);
      currentRef.current.distance = nextD;
      setFeedback('🌊 타이밍 조절 필요! 일정한 리듬을 유지하세요.');
    } else {
      // 퍼펙트 스트로크
      sfxWhoosh();
      const newCombo = tempoCombo + 1;
      setTempoCombo(newCombo);
      currentRef.current.combo = newCombo;
      const boost = 4.5 + Math.min(3, newCombo * 0.5);
      const nextD = Math.min(goalDistance, distance + boost);
      setDistance(nextD);
      currentRef.current.distance = nextD;
      setFeedback(`⚡ 완벽한 노젓기! ${newCombo}콤보 가속!`);

      if (nextD >= goalDistance) {
        sfxSuccess();
        finishGame(goalDistance);
        return;
      }
    }

    setLastPaddle(side);
    setLastTime(now);
  };

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <Waves className="w-6 h-6 text-cyan-400" />
          <span className="text-white font-bold text-lg">급류 탈출 카약</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 font-mono font-bold text-lg">{timeLeft}s</span>
          <span className="text-emerald-400 font-mono font-bold text-lg">{Math.round(distance)}m / 100m</span>
        </div>
      </div>

      {/* 강줄기 트랙 & 카약 */}
      <div className="relative w-full h-56 bg-gradient-to-b from-blue-900 to-cyan-950 rounded-2xl overflow-hidden border-2 border-cyan-500/40 my-4 shadow-inner flex flex-col items-center justify-end p-4">
        {/* 흐르는 물살 효과 */}
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-300 via-transparent to-transparent animate-pulse" />

        {/* 카약 보트 */}
        <div
          className="relative transition-all duration-300 flex flex-col items-center"
          style={{ transform: `translateY(-${(distance / goalDistance) * 120}px)` }}
        >
          <div className="text-4xl animate-bounce">🛶</div>
          {lastPaddle && (
            <div className={`text-xs px-2 py-0.5 rounded-full mt-1 font-bold ${lastPaddle === 'left' ? 'text-blue-300 bg-blue-950/80 -translate-x-6' : 'text-cyan-300 bg-cyan-950/80 translate-x-6'}`}>
              {lastPaddle === 'left' ? '◀ 좌현 스트로크' : '우현 스트로크 ▶'}
            </div>
          )}
        </div>

        {/* 결승선 배너 */}
        <div className="absolute top-2 w-full flex items-center justify-center gap-1 text-xs text-amber-200 font-bold bg-yellow-950/60 py-1 border-b border-yellow-500/30">
          🏁 100m 급류 탈출 지점
        </div>
      </div>

      {/* 진행 게이지 */}
      <div className="w-full bg-slate-800 rounded-full h-3 mb-2 overflow-hidden border border-slate-700">
        <div
          className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-200"
          style={{ width: `${(distance / goalDistance) * 100}%` }}
        />
      </div>

      <div className="text-sm font-bold text-center text-cyan-300 min-h-[24px]">
        {feedback}
      </div>

      {/* 노 젓기 버튼 (좌 / 우) */}
      <div className="grid grid-cols-2 gap-4 w-full mt-4">
        <button
          onClick={() => handlePaddle('left')}
          disabled={finished}
          className={`py-6 rounded-2xl flex flex-col items-center justify-center gap-1 font-black text-lg transition-all active:scale-95 shadow-lg border-2 ${lastPaddle === 'left' ? 'bg-blue-800 border-blue-500 text-blue-200 opacity-80' : 'bg-gradient-to-br from-blue-600 to-cyan-700 border-cyan-400 text-white hover:brightness-110'}`}
        >
          <ArrowLeft className="w-7 h-7" />
          <span>왼쪽 노젓기</span>
        </button>

        <button
          onClick={() => handlePaddle('right')}
          disabled={finished}
          className={`py-6 rounded-2xl flex flex-col items-center justify-center gap-1 font-black text-lg transition-all active:scale-95 shadow-lg border-2 ${lastPaddle === 'right' ? 'bg-cyan-800 border-cyan-500 text-cyan-200 opacity-80' : 'bg-gradient-to-br from-cyan-600 to-teal-700 border-teal-400 text-white hover:brightness-110'}`}
        >
          <ArrowRight className="w-7 h-7" />
          <span>오른쪽 노젓기</span>
        </button>
      </div>

      <p className="text-xs text-slate-400 text-center mt-3">
        💡 왼쪽과 오른쪽을 쿵-짝 쿵-짝 일정한 박자로 번갈아 터치하세요!
      </p>
    </div>
  );
};
