import { useState, useEffect, useRef, useCallback } from 'react';
import { Smile } from 'lucide-react';
import { sfxSuccess, sfxPop, sfxFail } from '../../../../application/soundEffects';
import type { SyncAction } from '../../../../application/useSyncQueue';

interface Props {
  groupId: string;
  enqueueAction: (action: SyncAction) => void;
}

type BodyPart = 'head' | 'shoulders' | 'knees' | 'toes';
const BODY_PART_IDS: BodyPart[] = ['head', 'shoulders', 'knees', 'toes'];

const BODY_PARTS: { id: BodyPart; label: string; emoji: string; color: string }[] = [
  { id: 'head', label: '머리', emoji: '🧢', color: 'from-amber-500 to-orange-600' },
  { id: 'shoulders', label: '어깨', emoji: '👕', color: 'from-cyan-500 to-blue-600' },
  { id: 'knees', label: '무릎', emoji: '👖', color: 'from-emerald-500 to-teal-600' },
  { id: 'toes', label: '발', emoji: '👟', color: 'from-rose-500 to-pink-600' },
];

export const HeadShouldersKnees = ({ groupId, enqueueAction }: Props) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [currentTarget, setCurrentTarget] = useState<BodyPart>(() => BODY_PART_IDS[Math.floor(Math.random() * BODY_PART_IDS.length)]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);

  const pickNextTarget = useCallback(() => {
    setCurrentTarget(BODY_PART_IDS[Math.floor(Math.random() * BODY_PART_IDS.length)]);
  }, []);

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
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [finishGame, pickNextTarget]);

  const handleTouchPart = (part: BodyPart) => {
    if (finished) return;
    if (part === currentTarget) {
      // 정답!
      sfxPop();
      const add = 20;
      setScore(s => {
        const next = s + add;
        scoreRef.current = next;
        return next;
      });
      setFeedback('✨ 딩동댕! 정확한 신체 부위 터치!');
      pickNextTarget();
    } else {
      sfxFail();
      setFeedback('😅 다시 찾아보세요!');
    }
    setTimeout(() => setFeedback(null), 500);
  };

  const targetObj = BODY_PARTS.find(p => p.id === currentTarget)!;

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <Smile className="w-6 h-6 text-yellow-400" />
          <span className="text-white font-bold text-lg">머리 어깨 무릎 발 바디 비트</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-yellow-400 font-mono font-bold text-lg">{timeLeft}s</span>
          <span className="text-emerald-400 font-mono font-bold text-lg">{score}점</span>
        </div>
      </div>

      {/* 목표 신체 부위 지시 카드 */}
      <div className="w-full bg-slate-900 border-2 border-yellow-400/50 rounded-2xl p-4 text-center my-2 shadow-xl">
        <span className="text-xs text-yellow-300 font-bold">지금 짚어야 할 신체 부위:</span>
        <div className="text-4xl font-black text-white mt-1 flex items-center justify-center gap-2">
          <span>{targetObj.emoji}</span>
          <span className="underline decoration-yellow-400">{targetObj.label}</span>
        </div>
        <div className="text-xs text-slate-400 mt-1">우리 몸의 해당 부위를 만지며 화면을 터치하세요!</div>
      </div>

      {feedback && (
        <div className="text-sm font-bold text-center text-yellow-300 animate-bounce">
          {feedback}
        </div>
      )}

      {/* 4대 신체 부위 대형 터치 패널 (1~2학년 친화형) */}
      <div className="grid grid-cols-2 gap-3.5 w-full my-2">
        {BODY_PARTS.map(part => (
          <button
            key={part.id}
            onClick={() => handleTouchPart(part.id)}
            disabled={finished}
            className={`py-6 rounded-2xl bg-gradient-to-br ${part.color} hover:brightness-110 active:scale-95 text-white font-black text-xl shadow-xl border-2 border-white/20 flex flex-col items-center justify-center gap-2 transition-transform`}
          >
            <span className="text-4xl">{part.emoji}</span>
            <span>{part.label}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-400 text-center mt-2">
        💡 머리-어깨-무릎-발! 제시되는 신체 부위 버튼을 노래하듯 신나게 터치하세요!
      </p>
    </div>
  );
};
