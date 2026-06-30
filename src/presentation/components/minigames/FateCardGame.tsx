import { useState } from 'react';
import * as LucideIcons from 'lucide-react';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

const OUTCOMES = [
  { text: '+1000점 대박!', score: 1000, icon: 'PartyPopper', color: 'text-yellow-400' },
  { text: '+300점 획득', score: 300, icon: 'ThumbsUp', color: 'text-emerald-400' },
  { text: '-300점 꽝!', score: -300, icon: 'Skull', color: 'text-red-500' }
];

export const FateCardGame = ({ groupId, enqueueAction }: Props) => {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [shuffledOutcomes] = useState(() => {
    const arr = [...OUTCOMES];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  const handleSelect = (index: number) => {
    if (selectedCard !== null) return;
    
    setSelectedCard(index);
    const outcome = shuffledOutcomes[index];
    
    enqueueAction({ 
      id: Math.random().toString(), 
      type: 'INCREMENT_SCORE', 
      payload: { id: groupId, amount: outcome.score }, 
      timestamp: Date.now() 
    });
  };

  return (
    <div className="min-h-[100dvh] bg-purple-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none">
      <div className="absolute inset-0 bg-fuchsia-900/20 animate-pulse"></div>
      
      <LucideIcons.Sparkles className="w-16 h-16 text-yellow-400 mb-6 relative z-10 animate-bounce" />
      <h1 className="text-4xl font-black text-white mb-2 text-center relative z-10">운명의 카드</h1>
      <p className="text-purple-200 font-bold mb-12 text-center relative z-10">3장의 카드 중 하나를 선택하세요.<br/>대박일까요, 쪽박일까요?</p>
      
      <div className="flex gap-4 relative z-10 w-full max-w-sm justify-center">
        {[0, 1, 2].map((i) => {
          const isSelected = selectedCard === i;
          const isRevealed = selectedCard !== null;
          const outcome = shuffledOutcomes[i];
          const IconComp = (LucideIcons as any)[outcome.icon] || LucideIcons.Star;

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={isRevealed}
              className={`relative w-24 h-36 rounded-xl transition-all duration-500 transform-gpu ${
                isRevealed ? '[transform:rotateY(180deg)]' : 'hover:scale-105 hover:-translate-y-2'
              }`}
            >
              {/* Back of Card */}
              <div className={`absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-700 rounded-xl border-2 border-purple-400 flex items-center justify-center shadow-xl transition-opacity duration-500 ${isRevealed ? 'opacity-0' : 'opacity-100'}`}>
                <span className="text-4xl">❓</span>
              </div>
              
              {/* Front of Card */}
              <div className={`absolute inset-0 bg-slate-900 rounded-xl border-2 ${isSelected ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)]' : 'border-slate-600'} flex flex-col items-center justify-center p-2 [transform:rotateY(180deg)] transition-opacity duration-500 ${isRevealed ? 'opacity-100' : 'opacity-0'}`}>
                <IconComp className={`w-8 h-8 mb-2 ${outcome.color}`} />
                <span className={`text-sm font-black text-center ${outcome.color}`}>{outcome.text}</span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedCard !== null && (
        <div className="absolute bottom-10 text-purple-200 font-bold animate-pulse">
          결과가 점수에 반영되었습니다! 잠시 후 닫힙니다...
        </div>
      )}
    </div>
  );
};
