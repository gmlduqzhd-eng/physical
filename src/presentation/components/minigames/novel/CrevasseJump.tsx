import { useState, useRef, useEffect } from 'react';
import { Snowflake } from 'lucide-react';
import { sfxWhoosh, sfxSuccess, sfxFail } from '../../../../application/soundEffects';
import type { SyncAction } from '../../../../application/useSyncQueue';

interface Props {
  groupId: string;
  enqueueAction: (action: SyncAction) => void;
}

export const CrevasseJump = ({ groupId, enqueueAction }: Props) => {
  const [round, setRound] = useState(1);
  const [targetGap, setTargetGap] = useState(() => 45 + Math.floor(Math.random() * 8)); // target power required (30 ~ 75%)
  const [charge, setCharge] = useState(0); // 0 to 100%
  const [jumping, setJumping] = useState(false);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const isCharging = useRef(false);
  const chargeRef = useRef(0);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jumpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (animRef.current) clearInterval(animRef.current);
    if (jumpTimeoutRef.current) clearTimeout(jumpTimeoutRef.current);
    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
  }, []);

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

  const handleChargeStart = () => {
    if (jumping || finished) return;
    isCharging.current = true;
    chargeRef.current = 0;
    setCharge(0);

    animRef.current = setInterval(() => {
      chargeRef.current = Math.min(100, chargeRef.current + 3);
      setCharge(chargeRef.current);
    }, 30);
  };

  const handleChargeRelease = () => {
    if (!isCharging.current || jumping || finished) return;
    isCharging.current = false;
    if (animRef.current) clearInterval(animRef.current);
    executeJump(chargeRef.current);
  };

  const executeJump = (finalCharge: number) => {
    setJumping(true);
    sfxWhoosh();

    const diff = finalCharge - targetGap;
    // 오차 범위: ±8% 이내 완벽 착지
    jumpTimeoutRef.current = setTimeout(() => {
      if (Math.abs(diff) <= 8) {
        sfxSuccess();
        const add = 80;
        setScore(s => s + add);
        setFeedback('🎯 빙판 중앙에 완벽 착지 성공! (+80점)');
      } else if (diff < -8) {
        sfxFail();
        setFeedback('💦 도약 힘 부족! 크레바스 직전에 아슬아슬하게 매달림 (+20점)');
        setScore(s => s + 20);
      } else {
        sfxFail();
        setFeedback('💨 너무 세게 뛰어 빙판을 지나쳤습니다 (+15점)');
        setScore(s => s + 15);
      }

      resultTimeoutRef.current = setTimeout(() => {
        setJumping(false);
        setCharge(0);
        setFeedback(null);
        if (round >= 4) {
          finishGame(score + (Math.abs(diff) <= 8 ? 80 : diff < -8 ? 20 : 15));
        } else {
          const nextRound = round + 1;
          setTargetGap(35 + (nextRound * 10) + Math.floor(Math.random() * 8));
          setRound(nextRound);
        }
      }, 1000);
    }, 600);
  };

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <Snowflake className="w-6 h-6 text-cyan-300 animate-spin-slow" />
          <span className="text-white font-bold text-lg">빙판 크레바스 점프</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">라운드 {round}/4</span>
          <span className="text-cyan-300 font-mono font-bold text-lg">{score}점</span>
        </div>
      </div>

      {/* 빙판 크레바스 지형 시각화 */}
      <div className="relative w-full h-60 bg-gradient-to-b from-sky-950 via-slate-900 to-blue-950 rounded-2xl overflow-hidden border-2 border-cyan-400/40 p-4 flex flex-col justify-between shadow-inner">
        <div className="text-xs text-cyan-200 font-bold flex items-center justify-between">
          <span>🚩 도약 빙판</span>
          <span className="text-amber-300">목표 착지점: {targetGap}m</span>
        </div>

        {/* 심연 크레바스 절벽 그래픽 */}
        <div className="relative w-full h-24 flex items-center justify-between my-auto">
          {/* 출발 빙하 */}
          <div className="w-20 h-16 bg-gradient-to-b from-cyan-100 to-blue-300 rounded-lg shadow-lg flex items-center justify-center">
            <span className={`text-3xl transition-transform ${jumping ? 'translate-x-32 -translate-y-8 duration-500' : ''}`}>
              🧗
            </span>
          </div>

          {/* 크레바스 깊은 틈새 */}
          <div className="flex-1 h-14 mx-3 bg-slate-950 rounded-lg border border-cyan-900/60 flex items-center justify-center">
            <span className="text-[10px] text-cyan-500 font-mono">깊은 빙하 균열 (크레바스)</span>
          </div>

          {/* 착지 빙하 */}
          <div className="w-24 h-16 bg-gradient-to-b from-cyan-100 to-blue-300 rounded-lg shadow-lg flex items-center justify-center border-2 border-amber-400">
            <span className="text-xs text-blue-950 font-black">🎯 착지 구역</span>
          </div>
        </div>

        {feedback && (
          <div className="text-center font-bold text-xs text-yellow-300 bg-slate-900/80 py-1 rounded-lg">
            {feedback}
          </div>
        )}
      </div>

      {/* 도약 파워 충전 바 */}
      <div className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 my-2">
        <div className="flex justify-between text-xs text-slate-300 mb-1">
          <span>충전 파워</span>
          <span className="text-cyan-400 font-bold">{Math.round(charge)}% (목표: {targetGap}%)</span>
        </div>
        <div className="relative w-full bg-slate-800 rounded-full h-4 overflow-hidden">
          {/* 목표 안착 구간 표시 */}
          <div
            className="absolute top-0 bottom-0 bg-emerald-500/50 border-x-2 border-emerald-400"
            style={{ left: `${targetGap - 8}%`, width: '16%' }}
          />
          <div
            className="bg-gradient-to-r from-blue-500 via-cyan-400 to-amber-400 h-full transition-all duration-75"
            style={{ width: `${charge}%` }}
          />
        </div>
      </div>

      {/* 충전 & 릴리즈 버튼 */}
      <button
        onPointerDown={handleChargeStart}
        onPointerUp={handleChargeRelease}
        onPointerLeave={handleChargeRelease}
        disabled={jumping || finished}
        className="w-full py-6 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:brightness-110 active:brightness-125 text-white font-black text-xl rounded-2xl shadow-xl border-2 border-cyan-300 transition-all flex flex-col items-center justify-center gap-1 touch-none"
      >
        <span className="text-xl">꾹 눌러 힘 충전 ➔ 손 떼서 점프!</span>
        <span className="text-xs text-cyan-200 font-normal">게이지가 초록색 목표 구간에 도달했을 때 손을 떼세요.</span>
      </button>
    </div>
  );
};
