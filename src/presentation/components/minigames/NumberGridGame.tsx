import { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const NumberGridGame = ({ groupId, enqueueAction }: Props) => {
  const [numbers, setNumbers] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [won, setWon] = useState(false);

  useEffect(() => {
    // Generate shuffled 1 to 9
    const nums = Array.from({ length: 9 }, (_, i) => i + 1);
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    setNumbers(nums);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setFinished(true);
          setWon(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleTap = (num: number) => {
    if (finished) return;
    
    if (num === currentStep) {
      if (num === 9) {
        setFinished(true);
        setWon(true);
        enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 500 }, timestamp: Date.now() });
      } else {
        setCurrentStep(s => s + 1);
      }
    } else {
      // Penalty for wrong tap? Maybe just ignore.
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none">
      <div className="absolute inset-0 bg-red-900/10 animate-pulse"></div>
      
      <div className="flex justify-between w-full max-w-sm mb-6 relative z-10">
        <div className="flex flex-col">
          <span className="text-slate-400 text-sm font-bold">목표</span>
          <span className="text-white text-2xl font-black">{currentStep} / 9</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-slate-400 text-sm font-bold">남은 시간</span>
          <span className={`text-2xl font-black ${timeLeft <= 5 ? 'text-red-500 animate-bounce' : 'text-yellow-400'}`}>{timeLeft}초</span>
        </div>
      </div>

      <LucideIcons.ShieldAlert className="w-16 h-16 text-red-500 mb-6 relative z-10" />
      <h1 className="text-3xl font-black text-white mb-2 text-center relative z-10">순차적 암호 해제</h1>
      <p className="text-slate-300 font-bold mb-8 text-center relative z-10">1부터 9까지 순서대로 터치하세요!</p>
      
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm relative z-10 aspect-square">
        {numbers.map((num, i) => {
          const isPressed = num < currentStep;
          return (
            <button
              key={i}
              onClick={() => handleTap(num)}
              disabled={isPressed || finished}
              className={`rounded-2xl text-4xl font-black transition-all ${isPressed ? 'bg-slate-800 text-slate-700 shadow-inner' : 'bg-red-600 text-white shadow-[0_4px_0_rgba(153,27,27,1)] active:translate-y-1 active:shadow-none'}`}
            >
              {num}
            </button>
          );
        })}
      </div>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className={`text-6xl font-black mb-4 ${won ? 'text-emerald-400' : 'text-red-500'}`}>
            {won ? 'DEFUSED!' : 'BOOM!'}
          </div>
          <p className="text-xl text-white font-bold">
            {won ? '+500점 획득!' : '해체에 실패했습니다.'}
          </p>
        </div>
      )}
    </div>
  );
};
