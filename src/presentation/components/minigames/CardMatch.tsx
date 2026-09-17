import { useState, useRef } from 'react';
import { sfxClick, sfxCoin } from '../../../application/soundEffects';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

const EMOJIS = ['🏀', '⚽', '🎾', '🏐', '🏈', '🥎'];

export const CardMatch = ({ groupId, enqueueAction }: Props) => {
  const [cards] = useState(() => {
    const pairs = EMOJIS.slice(0, 6);
    const deck = [...pairs, ...pairs];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  });
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [finished, setFinished] = useState(false);
  const lockRef = useRef(false);

  const handleFlip = (index: number) => {
    if (lockRef.current || flipped.includes(index) || matched.has(index) || finished) return;
    sfxClick();

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      lockRef.current = true;

      if (cards[newFlipped[0]] === cards[newFlipped[1]]) {
        // 매치!
        sfxCoin();
        const newMatched = new Set(matched);
        newMatched.add(newFlipped[0]);
        newMatched.add(newFlipped[1]);
        setMatched(newMatched);
        setFlipped([]);
        lockRef.current = false;

        if (newMatched.size === cards.length) {
          setFinished(true);
          const score = Math.max(0, 600 - (moves + 1) * 30);
          enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: score }, timestamp: Date.now() });
        }
      } else {
        setTimeout(() => {
          setFlipped([]);
          lockRef.current = false;
        }, 600);
      }
    }
  };

  return (
    <div className="min-h-[100dvh] bg-violet-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none">
      <div className="absolute inset-0 bg-purple-500/5"></div>
      
      <h1 className="text-3xl font-black text-white mb-2 text-center relative z-10">짝 맞추기</h1>
      <p className="text-violet-300 font-bold mb-2 text-center relative z-10 text-sm">같은 그림의 카드 짝을 찾으세요!</p>
      <div className="text-violet-400 font-bold mb-6 text-center relative z-10">시도 횟수: {moves}회</div>

      <div className="grid grid-cols-4 gap-2.5 w-full max-w-xs relative z-10">
        {cards.map((emoji, i) => {
          const isFlipped = flipped.includes(i) || matched.has(i);
          return (
            <button
              key={i}
              onClick={() => handleFlip(i)}
              className={`aspect-square rounded-xl text-3xl font-bold flex items-center justify-center transition-all duration-200 ${
                matched.has(i) ? 'bg-emerald-600/50 border-2 border-emerald-400 scale-90' :
                isFlipped ? 'bg-white border-2 border-violet-300' :
                'bg-violet-700 border-2 border-violet-600 hover:bg-violet-600 active:scale-95'
              }`}
            >
              {isFlipped ? emoji : '❓'}
            </button>
          );
        })}
      </div>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="text-5xl font-black text-violet-400 mb-4">CLEAR!</div>
          <p className="text-white font-bold text-lg">{moves + 1}번 만에 완성!</p>
          <p className="text-violet-300 font-bold mt-2">+{Math.max(0, 600 - (moves + 1) * 30)}점 획득!</p>
        </div>
      )}
    </div>
  );
};
