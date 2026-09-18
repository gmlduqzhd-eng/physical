import { useState, useEffect, useCallback, useRef } from 'react';
import { Shield } from 'lucide-react';
import { sfxTap, sfxSuccess, sfxFail, sfxWhoosh } from '../../../../application/soundEffects';
import type { SyncAction } from '../../../../application/useSyncQueue';

interface Props {
  groupId: string;
  enqueueAction: (action: SyncAction) => void;
}

type Lane = 'left' | 'center' | 'right';
const LANES: Lane[] = ['left', 'center', 'right'];

export const SpikeBlockWall = ({ groupId, enqueueAction }: Props) => {
  const [round, setRound] = useState(1);
  const [spikeLane, setSpikeLane] = useState<Lane>('center');
  const [isSpiking, setIsSpiking] = useState(false);
  const [blockedLanes, setBlockedLanes] = useState<Lane[]>(['left', 'center']);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>('상대 스파이커가 도약합니다! 블로킹 위치를 잡으세요.');
  const [finished, setFinished] = useState(false);
  const resolveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockedLanesRef = useRef<Lane[]>(['left', 'center']);
  const scoreRef = useRef(0);

  const finishGame = useCallback((finalScore?: number) => {
    setFinished(true);
    sfxSuccess();
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: finalScore ?? scoreRef.current },
      timestamp: Date.now(),
    });
  }, [enqueueAction, groupId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const target = LANES[Math.floor(Math.random() * LANES.length)];
      setSpikeLane(target);
      setIsSpiking(true);
      sfxWhoosh();
      resolveTimeoutRef.current = setTimeout(() => {
        const blocked = blockedLanesRef.current.includes(target);
        if (blocked) {
          sfxSuccess();
          scoreRef.current += 50;
          setScore(scoreRef.current);
          setFeedback('✋ 완벽한 셧다운 블로킹 차단! (+50점)');
        } else {
          sfxFail();
          setFeedback(`💥 스파이크 허용! (${target === 'left' ? '왼쪽' : target === 'center' ? '중앙' : '오른쪽'} 코트)`);
        }
        advanceTimeoutRef.current = setTimeout(() => {
          if (round >= 5) finishGame(scoreRef.current);
          else {
            setIsSpiking(false);
            setFeedback('상대 스파이커가 도약합니다! 블로킹 위치를 잡으세요.');
            setRound(r => r + 1);
          }
        }, 1000);
      }, 700);
    }, 1400);

    return () => {
      clearTimeout(timer);
      if (resolveTimeoutRef.current) clearTimeout(resolveTimeoutRef.current);
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    };
  }, [finishGame, round]);

  const toggleLane = (lane: Lane) => {
    if (isSpiking || finished) return;
    sfxTap();
    setBlockedLanes(prev => {
      let next: Lane[];
      if (prev.includes(lane)) {
        // 최소 1개는 유지
        if (prev.length <= 1) return prev;
        next = prev.filter(l => l !== lane);
      } else {
        // 최대 2인 블로킹
        if (prev.length >= 2) {
          next = [prev[1], lane];
        } else {
          next = [...prev, lane];
        }
      }
      blockedLanesRef.current = next;
      return next;
    });
  };

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-400" />
          <span className="text-white font-bold text-lg">스파이크 블로킹 월</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">세트 {round}/5</span>
          <span className="text-indigo-400 font-mono font-bold text-lg">{score}점</span>
        </div>
      </div>

      {/* 배구 코트 & 네트 시각화 */}
      <div className="relative w-full h-72 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 rounded-2xl overflow-hidden border-2 border-indigo-500/40 p-3 flex flex-col justify-between shadow-inner">
        {/* 상대 코트 (상단) 및 스파이커 */}
        <div className="w-full flex justify-around items-center pt-2">
          {LANES.map(lane => (
            <div key={lane} className="flex flex-col items-center w-24">
              {isSpiking && spikeLane === lane ? (
                <div className="text-4xl animate-bounce">🏐</div>
              ) : (
                <div className="text-2xl opacity-40">👤</div>
              )}
              <span className="text-[10px] text-slate-400 mt-1">
                {lane === 'left' ? '레프트' : lane === 'center' ? '센터' : '라이트'}
              </span>
            </div>
          ))}
        </div>

        {/* 배구 네트 */}
        <div className="w-full h-8 bg-white/10 border-y-2 border-dashed border-white/60 flex items-center justify-center my-auto">
          <span className="text-[10px] text-slate-300 font-bold tracking-widest">━━━━━━━ VOLLEYBALL NET ━━━━━━━</span>
        </div>

        {/* 우리 진영 블로커 벽 (2명) */}
        <div className="w-full flex justify-around items-center pb-2">
          {LANES.map(lane => {
            const isBlocked = blockedLanes.includes(lane);
            return (
              <div
                key={lane}
                onClick={() => toggleLane(lane)}
                className={`w-24 py-3 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${isBlocked ? 'bg-indigo-600/60 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-105' : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:border-slate-500'}`}
              >
                <span className="text-2xl">{isBlocked ? '🙋‍♂️' : '⚪'}</span>
                <span className="text-xs font-bold mt-1">{isBlocked ? '블로킹' : '비움'}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-sm font-bold text-center text-yellow-300 min-h-[24px]">
        {feedback}
      </div>

      {/* 포메이션 제어 안내 버튼 */}
      <div className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-center text-xs text-slate-300">
        위의 세 자리 중 <span className="text-indigo-400 font-bold">2개 자리</span>를 터치하여 2인 블로킹 벽을 세우세요!
      </div>
    </div>
  );
};
