import { useState, useEffect } from 'react';
import { Footprints } from 'lucide-react';
import { sfxSuccess, sfxPop, sfxFail } from '../../../../application/soundEffects';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

type AnimalType = 'rabbit' | 'frog' | 'kangaroo';

interface SteppingStone {
  id: number;
  animal: AnimalType;
  emoji: string;
  name: string;
}

const ANIMALS: { type: AnimalType; name: string; emoji: string; color: string }[] = [
  { type: 'rabbit', name: '토끼 (1칸 홉)', emoji: '🐰', color: 'from-pink-500 to-rose-600' },
  { type: 'frog', name: '개구리 (2칸 홉)', emoji: '🐸', color: 'from-emerald-500 to-teal-600' },
  { type: 'kangaroo', name: '캥거루 (3칸 롱점프)', emoji: '🦘', color: 'from-amber-500 to-orange-600' },
];

export const AnimalHopStep = ({ groupId, enqueueAction }: Props) => {
  const [stones, setStones] = useState<SteppingStone[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    generateTrack();
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

  const generateTrack = () => {
    const list: SteppingStone[] = [];
    for (let i = 0; i < 15; i++) {
      const a = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
      list.push({ id: i, animal: a.type, emoji: a.emoji, name: a.name });
    }
    setStones(list);
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

  const handleHop = (type: AnimalType) => {
    if (finished || currentIndex >= stones.length) return;
    const currentStone = stones[currentIndex];

    if (type === currentStone.animal) {
      // 홉 성공!
      sfxPop();
      const add = 20;
      setScore(s => s + add);
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setFeedback(`🐾 깡충! ${currentStone.name} 발자국 통과!`);

      if (nextIdx >= stones.length) {
        finishGame(score + 50);
      }
    } else {
      sfxFail();
      setFeedback('💦 발자국이 맞지 않아요! 돌다리를 잘 살펴보세요.');
    }
    setTimeout(() => setFeedback(null), 500);
  };

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <Footprints className="w-6 h-6 text-pink-400" />
          <span className="text-white font-bold text-lg">동물 발자국 깡충 스텝</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-pink-400 font-mono font-bold text-lg">{timeLeft}s</span>
          <span className="text-emerald-400 font-mono font-bold text-lg">{score}점</span>
        </div>
      </div>

      {/* 징검다리 트랙 시각화 */}
      <div className="relative w-full h-64 bg-gradient-to-b from-blue-950 via-teal-950 to-slate-950 rounded-2xl overflow-hidden border-2 border-emerald-500/40 p-3 flex flex-col justify-between shadow-inner my-2">
        <div className="flex justify-between text-xs text-emerald-300 font-bold">
          <span>징검다리 코스</span>
          <span>진행: {currentIndex} / {stones.length}</span>
        </div>

        {/* 현재 밟아야 할 동물 발자국 징검다리 */}
        <div className="flex items-center justify-center gap-3 my-auto">
          {stones.slice(currentIndex, currentIndex + 3).map((st, idx) => (
            <div
              key={st.id}
              className={`rounded-2xl border-4 p-4 flex flex-col items-center justify-center transition-all ${idx === 0 ? 'w-28 h-28 bg-emerald-600/80 border-yellow-300 scale-110 shadow-[0_0_20px_rgba(234,179,8,0.5)]' : 'w-20 h-20 bg-slate-800/60 border-slate-600 opacity-60'}`}
            >
              <span className={idx === 0 ? 'text-4xl animate-bounce' : 'text-2xl'}>{st.emoji}</span>
              <span className={`font-black mt-1 ${idx === 0 ? 'text-xs text-white' : 'text-[10px] text-slate-400'}`}>
                {st.name.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>

        <div className="text-xs font-bold text-center text-yellow-300 min-h-[18px]">
          {feedback || '첫 번째 징검다리의 동물 버튼을 눌러 점프하세요!'}
        </div>
      </div>

      {/* 3대 동물 홉 버튼 패널 */}
      <div className="grid grid-cols-3 gap-2.5 w-full mt-2">
        {ANIMALS.map(a => (
          <button
            key={a.type}
            onClick={() => handleHop(a.type)}
            disabled={finished}
            className={`py-6 rounded-2xl bg-gradient-to-br ${a.color} hover:brightness-110 active:scale-95 text-white font-black text-base shadow-xl border-2 border-white/20 flex flex-col items-center justify-center gap-1.5`}
          >
            <span className="text-3xl">{a.emoji}</span>
            <span className="text-xs">{a.name}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-400 text-center mt-2">
        앞에 나타난 동물 발자국을 확인하고 같은 동물 버튼을 눌러 강을 건너세요!
      </p>
    </div>
  );
};
