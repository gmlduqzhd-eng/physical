import { useState, useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

const COLORS = [
  { name: 'Red', bg: 'bg-red-500', activeBg: 'bg-red-300', shadow: 'shadow-[0_0_30px_rgba(239,68,68,0.8)]' },
  { name: 'Blue', bg: 'bg-blue-500', activeBg: 'bg-blue-300', shadow: 'shadow-[0_0_30px_rgba(59,130,246,0.8)]' },
  { name: 'Green', bg: 'bg-emerald-500', activeBg: 'bg-emerald-300', shadow: 'shadow-[0_0_30px_rgba(16,185,129,0.8)]' },
  { name: 'Yellow', bg: 'bg-yellow-500', activeBg: 'bg-yellow-300', shadow: 'shadow-[0_0_30px_rgba(234,179,8,0.8)]' },
];

export const MemoryGame = ({ groupId, enqueueAction }: Props) => {
  const [phase, setPhase] = useState<'memorize' | 'input' | 'success' | 'fail'>('memorize');
  const [sequence, setSequence] = useState<number[]>([]);
  const [userInputs, setUserInputs] = useState<number[]>([]);
  const [activeColorIndex, setActiveColorIndex] = useState<number | null>(null);
  const lockRef = useRef(false);

  useEffect(() => {
    // Generate sequence
    const seq = Array.from({ length: 5 }, () => Math.floor(Math.random() * 4));
    setSequence(seq);

    // Play sequence
    let step = 0;
    const interval = setInterval(() => {
      if (step >= seq.length) {
        clearInterval(interval);
        setActiveColorIndex(null);
        setPhase('input');
        return;
      }
      
      // Flash color
      setActiveColorIndex(seq[step]);
      
      // Turn off color after 400ms
      setTimeout(() => {
        setActiveColorIndex(null);
      }, 400);

      step++;
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleColorTap = (index: number) => {
    if (phase !== 'input') return;

    const newInputs = [...userInputs, index];
    setUserInputs(newInputs);

    // Flash tapped color briefly
    setActiveColorIndex(index);
    setTimeout(() => setActiveColorIndex(null), 200);

    // Check correctness
    const currentStep = newInputs.length - 1;
    if (newInputs[currentStep] !== sequence[currentStep]) {
      setPhase('fail');
      return;
    }

    if (newInputs.length === sequence.length) {
      if (lockRef.current) return;
      lockRef.current = true;
      setPhase('success');
      enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 500 }, timestamp: Date.now() });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none">
      <LucideIcons.Brain className="w-16 h-16 text-indigo-400 mb-4 relative z-10" />
      <h1 className="text-3xl font-black text-white mb-2 text-center relative z-10">메모리 컬러 패턴</h1>
      
      <p className="text-slate-300 font-bold mb-12 text-center relative z-10 h-6">
        {phase === 'memorize' && '색상이 반짝이는 순서를 기억하세요!'}
        {phase === 'input' && '기억한 순서대로 터치하세요!'}
        {phase === 'success' && '정답입니다! +500점'}
        {phase === 'fail' && '틀렸습니다!'}
      </p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm relative z-10 aspect-square">
        {COLORS.map((c, i) => {
          const isActive = activeColorIndex === i;
          return (
            <button
              key={i}
              onClick={() => handleColorTap(i)}
              disabled={phase !== 'input'}
              className={`rounded-2xl transition-all duration-200 ${isActive ? c.activeBg : c.bg} ${isActive ? c.shadow : ''} ${isActive ? 'scale-105' : 'scale-100'} ${phase === 'input' ? 'active:scale-95' : ''}`}
            />
          );
        })}
      </div>

      <div className="mt-12 flex gap-2">
        {sequence.map((_, i) => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full transition-colors ${i < userInputs.length ? (phase === 'fail' && i === userInputs.length - 1 ? 'bg-red-500' : 'bg-emerald-400') : 'bg-slate-700'}`}
          />
        ))}
      </div>
      
      {(phase === 'success' || phase === 'fail') && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className={`text-6xl font-black mb-4 ${phase === 'success' ? 'text-emerald-400' : 'text-red-500'}`}>
            {phase === 'success' ? 'SUCCESS!' : 'FAIL...'}
          </div>
          <p className="text-xl text-white font-bold">
            {phase === 'success' ? '+500점 획득!' : '순서를 틀렸습니다.'}
          </p>
        </div>
      )}
    </div>
  );
};
