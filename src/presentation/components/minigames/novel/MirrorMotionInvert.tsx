import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { sfxSuccess, sfxPop, sfxFail } from '../../../../application/soundEffects';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

type MotionSide = 'left-arm' | 'right-arm' | 'left-leg' | 'right-leg';

const MOTIONS: { id: MotionSide; label: string; desc: string; emoji: string }[] = [
  { id: 'left-arm', label: '화면의 왼쪽 팔', desc: '거울 속 왼쪽 손을 마주보고 터치!', emoji: '🙋‍♂️' },
  { id: 'right-arm', label: '화면의 오른쪽 팔', desc: '거울 속 오른쪽 손을 마주보고 터치!', emoji: '🙋‍♀️' },
  { id: 'left-leg', label: '화면의 왼쪽 다리', desc: '거울 속 왼쪽 발을 마주보고 터치!', emoji: '🦵' },
  { id: 'right-leg', label: '화면의 오른쪽 다리', desc: '거울 속 오른쪽 발을 마주보고 터치!', emoji: '🦶' },
];

export const MirrorMotionInvert = ({ groupId, enqueueAction }: Props) => {
  const [currentMotion, setCurrentMotion] = useState<MotionSide>('left-arm');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    pickNext();
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
  }, []);

  const pickNext = () => {
    const list: MotionSide[] = ['left-arm', 'right-arm', 'left-leg', 'right-leg'];
    const next = list[Math.floor(Math.random() * list.length)];
    setCurrentMotion(next);
  };

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

  const handleChoice = (side: MotionSide) => {
    if (finished) return;
    if (side === currentMotion) {
      sfxPop();
      const add = 25;
      setScore(s => s + add);
      setFeedback('🪞 딩동댕! 완벽한 거울 대칭 포즈!');
      pickNext();
    } else {
      sfxFail();
      setFeedback('반대쪽입니다! 거울 속 모습을 다시 보세요.');
    }
    setTimeout(() => setFeedback(null), 500);
  };

  const targetMotion = MOTIONS.find(m => m.id === currentMotion)!;

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <Eye className="w-6 h-6 text-cyan-400" />
          <span className="text-white font-bold text-lg">거울 모드 동작 반전</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 font-mono font-bold text-lg">{timeLeft}s</span>
          <span className="text-emerald-400 font-mono font-bold text-lg">{score}점</span>
        </div>
      </div>

      {/* 거울 프레임 시각화 */}
      <div className="relative w-full h-72 bg-gradient-to-b from-slate-900 via-cyan-950 to-slate-950 rounded-3xl overflow-hidden border-4 border-cyan-400/60 p-4 flex flex-col items-center justify-between shadow-2xl my-2">
        <div className="text-xs text-cyan-300 font-bold bg-cyan-900/60 px-3 py-1 rounded-full border border-cyan-500/40">
          거울 속 친구의 동작
        </div>

        {/* 거울 속 아바타 */}
        <div className="text-6xl my-auto animate-pulse flex flex-col items-center">
          <span>{targetMotion.emoji}</span>
          <span className="text-sm font-black text-white mt-2 bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-700">
            {targetMotion.label} 들어올림!
          </span>
        </div>

        {feedback && (
          <div className="text-xs font-bold text-yellow-300 animate-bounce">
            {feedback}
          </div>
        )}
      </div>

      {/* 대칭 선택 버튼 4종 (팔 / 다리) */}
      <div className="grid grid-cols-2 gap-3 w-full mt-2">
        {MOTIONS.map(m => (
          <button
            key={m.id}
            onClick={() => handleChoice(m.id)}
            disabled={finished}
            className="py-5 bg-gradient-to-br from-cyan-600 to-blue-700 hover:brightness-110 active:scale-95 text-white font-black text-base rounded-2xl shadow-lg border border-cyan-300/40 flex items-center justify-center gap-2"
          >
            <span className="text-2xl">{m.emoji}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-400 text-center mt-2">
        거울을 보듯 화면 속 친구가 움직인 쪽을 찾아 재빠르게 터치하세요!
      </p>
    </div>
  );
};
