import { useState, useEffect, useRef } from 'react';
import { Trophy, FastForward, RotateCcw } from 'lucide-react';
import { sfxSuccess, sfxFail } from '../../../../application/soundEffects';
import type { SyncAction } from '../../../../application/useSyncQueue';

interface Props {
  groupId: string;
  enqueueAction: (action: SyncAction) => void;
}

interface PlayScenario {
  title: string;
  desc: string;
  throwSpeed: '빠름' | '보통' | '느림';
  ballLocation: '외야 펜스 깊은 곳' | '내야 근처 얕은 뜬공' | '외야수 정면 중견수 앞';
  correctChoice: 'sprint' | 'slide' | 'return';
  solutionReason: string;
}

const SCENARIOS: PlayScenario[] = [
  {
    title: '1. 우익수 키를 넘기는 깊은 장타!',
    desc: '외야수가 공을 펜스에서 줍는 중입니다. 3루를 돌아 홈까지 질주할 기회!',
    throwSpeed: '느림',
    ballLocation: '외야 펜스 깊은 곳',
    correctChoice: 'sprint',
    solutionReason: '송구가 늦으므로 전력 질주로 홈 득점을 노려야 합니다!',
  },
  {
    title: '2. 2루수 뒤 얕은 텍사스성 뜬공!',
    desc: '2루수가 즉시 포구하여 3루로 날카로운 송구를 던졌습니다!',
    throwSpeed: '빠름',
    ballLocation: '내야 근처 얕은 뜬공',
    correctChoice: 'return',
    solutionReason: '송구가 매우 빠르므로 무리하지 않고 2루로 즉시 귀루해야 아웃을 면합니다!',
  },
  {
    title: '3. 좌중간 애매한 안타! 3루 접전!',
    desc: '외야수 송구가 3루수 키높이로 빠르게 날아오고 있습니다! 태그를 피해야 합니다!',
    throwSpeed: '보통',
    ballLocation: '외야수 정면 중견수 앞',
    correctChoice: 'slide',
    solutionReason: '태그를 피하기 위해 낮은 자세로 헤드퍼스트 슬라이딩을 감행해야 합니다!',
  },
  {
    title: '4. 중견수 앞 땅볼 안타, 중계 플레이 연결!',
    desc: '유격수가 공을 이어받아 3루로 던지려 합니다. 거리가 아슬아슬합니다.',
    throwSpeed: '보통',
    ballLocation: '외야수 정면 중견수 앞',
    correctChoice: 'slide',
    solutionReason: '수비수 태그 손길을 피해 발끝 슬라이딩으로 세이프!',
  },
];

export const BaseRunningDecide = ({ groupId, enqueueAction }: Props) => {
  const nextRoundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [waiting, setWaiting] = useState(false);

  const current = SCENARIOS[index % SCENARIOS.length];

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

  const handleDecision = (choice: 'sprint' | 'slide' | 'return') => {
    if (waiting || finished) return;
    setWaiting(true);

    if (choice === current.correctChoice) {
      sfxSuccess();
      const add = 50;
      setScore(s => s + add);
      setFeedback(`⚡ 세이프(SAFE)! ${current.solutionReason} (+50점)`);
    } else {
      sfxFail();
      setFeedback(`❌ 아웃(OUT)! ${current.solutionReason}`);
    }

    nextRoundTimeoutRef.current = setTimeout(() => {
      setWaiting(false);
      setFeedback(null);
      if (index + 1 >= SCENARIOS.length) {
        finishGame(score + (choice === current.correctChoice ? 50 : 0));
      } else {
        setIndex(i => i + 1);
      }
    }, 1200);
  };

  useEffect(() => () => {
    if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
  }, []);

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <FastForward className="w-6 h-6 text-amber-400" />
          <span className="text-white font-bold text-lg">야구/티볼 주루 판단</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">이닝 {index + 1}/4</span>
          <span className="text-amber-400 font-mono font-bold text-lg">{score}점</span>
        </div>
      </div>

      {/* 야구 그라운드 및 주루 상황 카드 */}
      <div className="w-full bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-4 shadow-xl my-2 flex flex-col justify-between">
        <div>
          <span className="text-xs text-amber-400 font-bold">경기 상황 분석</span>
          <div className="text-lg font-black text-white mt-1">{current.title}</div>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">{current.desc}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 my-4">
          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400">타구 낙하 지점</span>
            <div className="text-xs font-bold text-cyan-300">{current.ballLocation}</div>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400">수비 송구 속도</span>
            <div className={`text-xs font-bold ${current.throwSpeed === '빠름' ? 'text-rose-400' : current.throwSpeed === '보통' ? 'text-amber-400' : 'text-emerald-400'}`}>
              {current.throwSpeed}
            </div>
          </div>
        </div>

        <div className="text-3xl text-center py-2 animate-pulse">
          ⚾ 💨 🏃‍♂️
        </div>
      </div>

      {feedback && (
        <div className="text-center font-bold text-xs text-yellow-300 bg-slate-900/90 py-2 px-3 rounded-xl border border-yellow-500/40 my-1">
          {feedback}
        </div>
      )}

      {/* 주루 전술 3선택 버튼 */}
      <div className="flex flex-col gap-2.5 w-full mt-2">
        <button
          onClick={() => handleDecision('sprint')}
          disabled={waiting || finished}
          className="py-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 active:scale-98 text-white font-black text-base rounded-xl shadow-lg border border-emerald-400/40 flex items-center justify-center gap-2"
        >
          <FastForward className="w-5 h-5" />
          <span>전력 질주! 다음 베이스로 달리기 (Sprint)</span>
        </button>

        <button
          onClick={() => handleDecision('slide')}
          disabled={waiting || finished}
          className="py-4 bg-gradient-to-r from-amber-600 to-orange-700 hover:brightness-110 active:scale-98 text-white font-black text-base rounded-xl shadow-lg border border-amber-400/40 flex items-center justify-center gap-2"
        >
          <Trophy className="w-5 h-5" />
          <span>태그 회피! 낮은 슬라이딩 (Slide)</span>
        </button>

        <button
          onClick={() => handleDecision('return')}
          disabled={waiting || finished}
          className="py-4 bg-gradient-to-r from-rose-600 to-red-700 hover:brightness-110 active:scale-98 text-white font-black text-base rounded-xl shadow-lg border border-rose-400/40 flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          <span>위험 감지! 원래 베이스로 귀루 (Return)</span>
        </button>
      </div>
    </div>
  );
};
