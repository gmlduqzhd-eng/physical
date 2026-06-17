import { useEffect, useRef } from 'react';
import { useGameLogic } from '../application/useGameLogic';
import { useGameTimer } from '../application/useGameTimer';
import { useAudio } from '../application/useAudio';
import { Shield, Clock, AlertTriangle } from 'lucide-react';

export const ScoreBoard = () => {
  const { scores, gameControl } = useGameLogic();
  const { mins, secs, isDanger } = useGameTimer(gameControl);
  const { playSiren, playVictory } = useAudio();
  
  const sirenPlayed = useRef(false);
  const plankPlayed = useRef(false);
  const defusedCount = scores.filter(s => s.is_defused).length;
  
  const isTsunami = gameControl?.current_event === 'tsunami';
  const isPlankEvent = mins === '01' && secs === '00' && gameControl?.status === 'playing';

  useEffect(() => {
    // 1분 남았을 때 코어 과부하 이벤트 알림
    if (isPlankEvent && !plankPlayed.current) {
      playSiren();
      plankPlayed.current = true;
    }
    // 해일 경보 시
    if (isTsunami && !sirenPlayed.current) {
      playSiren();
      sirenPlayed.current = true;
    } else if (!isTsunami) {
      sirenPlayed.current = false;
    }
  }, [isPlankEvent, isTsunami, playSiren]);

  return (
    <div className={`min-h-screen font-sans overflow-hidden relative transition-colors duration-1000 ${isTsunami ? 'bg-blue-950' : isDanger ? 'bg-red-950' : 'bg-slate-950'} text-white`}>
      {/* Background Cyberpunk grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      
      {/* Tsunami Alert Overlay */}
      {isTsunami && (
        <div className="absolute inset-0 z-40 bg-blue-600/30 flex flex-col items-center justify-center animate-pulse backdrop-blur-sm">
          <AlertTriangle className="w-48 h-48 text-blue-400 mb-8" />
          <h1 className="text-8xl font-black text-white text-center drop-shadow-2xl">해일 경보 발령!</h1>
          <p className="text-4xl text-blue-200 mt-8 font-bold">즉시 매트 위(안전구역)로 대피하십시오!</p>
        </div>
      )}

      {/* 1 Minute Plank Event Overlay */}
      {isPlankEvent && !isTsunami && (
        <div className="absolute inset-0 z-40 bg-red-600/30 flex flex-col items-center justify-center animate-pulse backdrop-blur-sm">
          <Flame className="w-48 h-48 text-red-500 mb-8" />
          <h1 className="text-8xl font-black text-white text-center drop-shadow-2xl">코어 과부하!</h1>
          <p className="text-4xl text-yellow-300 mt-8 font-bold">전원 30초 플랭크 실시!</p>
        </div>
      )}

      <header className="relative z-10 flex justify-between items-center px-12 py-8 bg-slate-900/50 backdrop-blur-md border-b border-cyan-500/30">
        <div className="flex items-center gap-4">
          <Shield className="w-12 h-12 text-cyan-400" />
          <h1 className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            폭탄 해체 작전
          </h1>
        </div>
        
        {/* Combo Alert */}
        {gameControl?.last_score_time && new Date(gameControl.last_score_time).getTime() > Date.now() - 3000 && (
          <div className="px-6 py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500 rounded-full font-black animate-bounce text-xl">
            🔥 SYNERGY COMBO! (+20)
          </div>
        )}

        <div className={`flex items-center gap-6 px-8 py-4 rounded-xl border ${isDanger ? 'bg-red-700/80 border-red-400 animate-pulse' : 'bg-slate-900 border-slate-700'}`}>
          <Clock className={`w-8 h-8 ${isDanger ? 'text-white' : 'text-red-500'}`} />
          <span className={`text-5xl font-bold font-mono tracking-wider ${isDanger ? 'text-white' : 'text-red-400'}`}>
            {mins}:{secs}
          </span>
        </div>
      </header>

      <main className="relative z-10 p-12 grid grid-cols-2 lg:grid-cols-3 gap-8">
        {scores.map((score, index) => (
          <div key={score.id} className={`flex flex-col bg-slate-900/80 backdrop-blur border-2 rounded-2xl p-6 transition-all duration-500 ${score.is_defused ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]' : score.is_hacked ? 'border-red-500 animate-pulse' : 'border-slate-700'}`}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-slate-200">{score.group_name}</h2>
              {score.is_defused ? (
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm font-bold rounded">해체 완료</span>
              ) : score.is_hacked ? (
                <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm font-bold rounded">해킹됨</span>
              ) : (
                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm font-bold rounded">작전 중</span>
              )}
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center py-6">
              <span className={`text-6xl font-black font-mono ${score.is_hacked ? 'text-red-500 glitch-text' : 'text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400'}`}>
                {score.score}
              </span>
              <span className="text-slate-500 mt-2 font-medium text-sm">에너지</span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-3 mb-2 overflow-hidden border border-slate-700">
              <div className={`h-full rounded-full transition-all duration-1000 ${score.is_defused ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`} style={{ width: `${Math.min(100, (score.score / 1000) * 100)}%` }}></div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};
