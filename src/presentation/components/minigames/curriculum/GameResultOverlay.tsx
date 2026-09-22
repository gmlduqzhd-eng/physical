import React from 'react';
import { RotateCcw, Home, Award } from 'lucide-react';

interface GameResultOverlayProps {
  title: string;
  subtitle?: string;
  score?: number;
  badge?: string;
  onRestart?: () => void;
  onExit?: () => void;
}

export const GameResultOverlay: React.FC<GameResultOverlayProps> = ({
  title,
  subtitle,
  score = 500,
  badge = '체육과 완주 마스터',
  onRestart,
  onExit,
}) => {
  return (
    <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 select-none">
      <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-3xl mb-4 shadow-lg shadow-amber-500/30">
          🏆
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 leading-tight">
          {title}
        </h2>

        {subtitle && (
          <p className="text-sm text-slate-300 font-medium mb-3 leading-relaxed">
            {subtitle}
          </p>
        )}

        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl px-5 py-3 mb-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <Award className="w-4 h-4" />
            <span>{badge}</span>
          </div>
          <span className="text-xl font-black text-emerald-400 font-mono">
            +{score}점
          </span>
        </div>

        <div className="flex flex-col gap-3 w-full">
          {onRestart && (
            <button
              onClick={onRestart}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 active:from-emerald-600 active:to-teal-700 text-white font-black text-base rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-98 transition-transform"
            >
              <RotateCcw className="w-5 h-5" />
              다시 도전하기
            </button>
          )}

          <button
            onClick={() => {
              if (onExit) onExit();
              else window.location.href = '/';
            }}
            className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-200 font-bold text-sm rounded-2xl border border-slate-700 flex items-center justify-center gap-2 transition-colors"
          >
            <Home className="w-4 h-4" />
            게임 목록으로 이동
          </button>
        </div>
      </div>
    </div>
  );
};
