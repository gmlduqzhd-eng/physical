import { useState, useEffect } from 'react';
import { useGameLogic } from '../application/useGameLogic';
import { Shield, Clock, AlertTriangle } from 'lucide-react';

export const ScoreBoard = () => {
  const { scores, gameControl } = useGameLogic();
  const [timeLeft, setTimeLeft] = useState<number>(300); // 기본 5분 = 300초

  useEffect(() => {
    if (!gameControl) return;

    const interval = setInterval(() => {
      if (gameControl.status === 'playing' && gameControl.started_at) {
        const start = new Date(gameControl.started_at).getTime();
        const now = new Date().getTime();
        const elapsed = Math.floor((now - start) / 1000);
        
        let remaining = 300 - elapsed + gameControl.global_time_modifier;
        if (remaining < 0) remaining = 0;
        setTimeLeft(remaining);
      } else if (!gameControl.started_at) {
        // 게임 시작 전
        let remaining = 300 + gameControl.global_time_modifier;
        if (remaining < 0) remaining = 0;
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameControl]);

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');
  
  // 1분 이하 시 폭탄 점멸 효과
  const isDanger = timeLeft > 0 && timeLeft <= 60; 

  return (
    <div className={`min-h-screen font-sans overflow-hidden relative transition-colors duration-1000 ${isDanger ? 'bg-red-950' : 'bg-slate-950'} text-white`}>
      {/* Background Cyberpunk grid & glowing effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      
      {/* Danger Animation Overlay */}
      {isDanger && (
        <div className="absolute inset-0 bg-red-600/10 mix-blend-overlay animate-[pulse_1s_ease-in-out_infinite]"></div>
      )}

      <header className="relative z-10 flex justify-between items-center px-12 py-8 bg-slate-900/50 backdrop-blur-md border-b border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
        <div className="flex items-center gap-4">
          <Shield className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
          <h1 className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-lg">
            폭탄 해체 작전
          </h1>
        </div>
        <div className={`flex items-center gap-6 px-8 py-4 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.3)] border ${isDanger ? 'bg-red-700/80 border-red-400 animate-[pulse_1s_infinite]' : 'bg-red-950/40 border-red-500/50'}`}>
          <Clock className={`w-8 h-8 ${isDanger ? 'text-white' : 'text-red-500'}`} />
          <span className={`text-5xl font-bold font-mono tracking-wider ${isDanger ? 'text-white' : 'text-red-400'}`}>
            {mins}:{secs}
          </span>
        </div>
      </header>

      <main className="relative z-10 p-12 grid grid-cols-2 lg:grid-cols-4 gap-8">
        {scores.length === 0 ? (
          <div className="col-span-full text-center py-20 text-slate-500 text-2xl">
            모둠 데이터 대기 중...
          </div>
        ) : (
          scores.map((score, index) => (
            <div 
              key={score.id} 
              className={`flex flex-col bg-slate-900/80 backdrop-blur border-2 rounded-2xl p-6 transition-all duration-500 ${
                score.is_defused 
                  ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]' 
                  : index === 0 
                    ? 'border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.3)] transform -translate-y-2' 
                    : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-slate-200">{score.group_name}</h2>
                {score.is_defused ? (
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm font-bold rounded border border-emerald-500/50">
                    해체 완료
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm font-bold rounded border border-yellow-500/50 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> 진행 중
                  </span>
                )}
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center py-8">
                <span className="text-6xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
                  {score.score}
                </span>
                <span className="text-slate-500 mt-2 font-medium tracking-widest">SCORE</span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-3 mb-2 overflow-hidden border border-slate-700">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${score.is_defused ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`} 
                  style={{ width: `${Math.min(100, (score.score / 500) * 100)}%` }}
                ></div>
              </div>
              <div className="text-right text-xs text-slate-500 font-mono">
                {score.score} / 500
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};
