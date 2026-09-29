import React, { useState, useEffect, useRef } from 'react';
import { sfxCountdown, sfxSuccess, hapticTap, hapticHeavy } from '../../../application/soundEffects';
import { FastForward, Smartphone, Volume2 } from 'lucide-react';

interface ReadyCountdownOverlayProps {
  onComplete: () => void;
  message?: string;
  seconds?: number;
}

export const ReadyCountdownOverlay: React.FC<ReadyCountdownOverlayProps> = ({
  onComplete,
  message = '스마트폰을 바닥에 두거나 주머니에 넣으세요!',
  seconds = 3,
}) => {
  const [count, setCount] = useState(seconds);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    sfxCountdown();
    hapticTap();

    const interval = window.setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          sfxSuccess();
          hapticHeavy();
          setTimeout(() => {
            onCompleteRef.current();
          }, 300);
          return 0;
        }
        sfxCountdown();
        hapticTap();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center select-none animate-in fade-in duration-200">
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold mb-6">
        <Smartphone className="w-4 h-4 animate-bounce" />
        <span>움직임 준비 카운트다운</span>
      </div>

      <div className="relative mb-6 flex items-center justify-center">
        <div className="absolute w-44 h-44 rounded-full bg-cyan-500/20 animate-ping pointer-events-none" />
        <div className="w-40 h-40 rounded-full border-4 border-cyan-400 bg-slate-900/90 shadow-[0_0_50px_rgba(6,182,212,0.4)] flex items-center justify-center">
          <span className="text-8xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-200 to-cyan-400 animate-scale-pulse">
            {count > 0 ? count : 'GO!'}
          </span>
        </div>
      </div>

      <h2 className="text-2xl font-black text-white mb-2">
        {count > 0 ? '운동 준비!' : '출발!'}
      </h2>
      <p className="text-slate-300 text-sm max-w-xs mb-8 font-medium">
        {message}
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            sfxSuccess();
            onCompleteRef.current();
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs active:scale-95 transition-all shadow-md"
        >
          <FastForward className="w-4 h-4 text-cyan-400" />
          <span>준비 완료 (건너뛰기)</span>
        </button>
      </div>

      <div className="mt-8 flex items-center gap-1.5 text-slate-500 text-xs font-medium">
        <Volume2 className="w-3.5 h-3.5" />
        <span>소리를 켜면 신호음이 함께 들립니다</span>
      </div>
    </div>
  );
};
