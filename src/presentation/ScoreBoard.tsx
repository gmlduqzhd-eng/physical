import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useGameLogic } from '../application/useGameLogic';
import { useGameTimer } from '../application/useGameTimer';
import { useAudio } from '../application/useAudio';
import { Shield, Clock, AlertTriangle, Flame } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

export const ScoreBoard = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { scores, gameRoom } = useGameLogic(roomId);
  const { mins, secs, isDanger } = useGameTimer(gameRoom);
  const { playSiren } = useAudio();
  
  const sirenPlayed = useRef(false);
  const plankPlayed = useRef(false);
  
  const isTsunami = gameRoom?.status === 'tsunami';
  const isPlankEvent = mins === '01' && secs === '00' && gameRoom?.status === 'playing';

  useEffect(() => {
    if (isPlankEvent && !plankPlayed.current) {
      playSiren();
      plankPlayed.current = true;
    }
    if (isTsunami && !sirenPlayed.current) {
      playSiren();
      sirenPlayed.current = true;
    } else if (!isTsunami) {
      sirenPlayed.current = false;
    }
  }, [isPlankEvent, isTsunami, playSiren]);

  if (gameRoom?.status === 'finished') {
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const top3 = sorted.slice(0, 3);

    return (
      <div className="min-h-screen font-sans overflow-hidden relative bg-slate-900 text-white flex flex-col items-center justify-center p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/20 via-slate-900 to-slate-900 animate-[pulse_4s_ease-in-out_infinite]"></div>
        
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 mb-12 drop-shadow-lg relative z-10 tracking-widest">🏆 최종 결과 발표 🏆</h1>

        <div className="flex items-end justify-center gap-6 h-80 mb-16 relative z-10 w-full max-w-5xl mt-12">
          {/* 2nd Place */}
          {top3[1] && (
            <div className="flex flex-col items-center w-1/3">
              <div className="bg-slate-200 text-slate-800 px-4 py-2 rounded-t-xl font-black text-2xl mb-2 flex items-center gap-2 shadow-lg"><LucideIcons.Medal className="w-6 h-6 text-slate-500"/> {top3[1].group_name}</div>
              <div className="text-4xl font-mono font-bold text-slate-300 mb-4 drop-shadow-md">{top3[1].score}점</div>
              <div className="w-full bg-gradient-to-t from-slate-500 to-slate-300 h-48 rounded-t-2xl shadow-2xl flex justify-center items-start pt-6 border-t-4 border-slate-100">
                <span className="text-6xl font-black text-white/50">2</span>
              </div>
            </div>
          )}
          {/* 1st Place */}
          {top3[0] && (
            <div className="flex flex-col items-center w-1/3 z-10 -mx-4 mb-4">
              <LucideIcons.Crown className="w-20 h-20 text-yellow-400 mb-2 animate-bounce drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
              <div className="bg-yellow-400 text-yellow-900 px-6 py-3 rounded-t-xl font-black text-3xl mb-2 shadow-[0_0_20px_rgba(250,204,21,0.3)] flex items-center gap-2"><LucideIcons.Trophy className="w-8 h-8"/> {top3[0].group_name}</div>
              <div className="text-5xl font-mono font-black text-yellow-400 mb-4 drop-shadow-lg">{top3[0].score}점</div>
              <div className="w-full bg-gradient-to-t from-yellow-600 to-yellow-400 h-64 rounded-t-2xl shadow-2xl flex justify-center items-start pt-6 border-t-4 border-yellow-200">
                <span className="text-8xl font-black text-white/50">1</span>
              </div>
            </div>
          )}
          {/* 3rd Place */}
          {top3[2] && (
            <div className="flex flex-col items-center w-1/3">
              <div className="bg-orange-300 text-orange-900 px-4 py-2 rounded-t-xl font-black text-2xl mb-2 flex items-center gap-2 shadow-lg"><LucideIcons.Medal className="w-6 h-6 text-orange-700"/> {top3[2].group_name}</div>
              <div className="text-4xl font-mono font-bold text-orange-300 mb-4 drop-shadow-md">{top3[2].score}점</div>
              <div className="w-full bg-gradient-to-t from-orange-700 to-orange-400 h-40 rounded-t-2xl shadow-2xl flex justify-center items-start pt-6 border-t-4 border-orange-200">
                <span className="text-6xl font-black text-white/50">3</span>
              </div>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="w-full max-w-5xl grid grid-cols-2 md:grid-cols-3 gap-4 relative z-10">
          {sorted.map(s => (
            <div key={s.id} className="bg-white/10 backdrop-blur border border-white/20 p-5 rounded-xl flex flex-col justify-between shadow-lg">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-xl text-slate-100 flex items-center gap-2">
                  {(LucideIcons as unknown as Record<string, React.ElementType>)[s.avatar || 'Smile'] && (() => {
                    const Icon = (LucideIcons as unknown as Record<string, React.ElementType>)[s.avatar || 'Smile'];
                    return <Icon className="w-5 h-5 text-slate-400" />;
                  })()}
                  {s.group_name}
                </span>
                <span className="font-mono text-xl font-bold text-cyan-300">{s.score}점</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {s.badges && s.badges.includes('rich') && <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded text-xs font-bold border border-yellow-500/30 flex items-center gap-1 shadow-inner"><LucideIcons.Coins className="w-3 h-3"/> 만수르</span>}
                {s.badges && s.badges.includes('shopaholic') && <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-bold border border-purple-500/30 flex items-center gap-1 shadow-inner"><LucideIcons.ShoppingCart className="w-3 h-3"/> 쇼핑 중독</span>}
                {s.badges && s.badges.includes('bingo') && <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs font-bold border border-orange-500/30 flex items-center gap-1 shadow-inner"><LucideIcons.Grid className="w-3 h-3"/> 빙고 마스터</span>}
                {(!s.badges || s.badges.length === 0) && <span className="text-xs text-slate-500 italic">배지 없음</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans overflow-hidden relative transition-colors duration-1000 ${isTsunami ? 'bg-blue-100' : isDanger ? 'bg-red-50' : 'bg-slate-50'} text-slate-900`}>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      
      {isTsunami && (
        <div className="absolute inset-0 z-40 bg-blue-600/30 flex flex-col items-center justify-center animate-pulse backdrop-blur-sm">
          <AlertTriangle className="w-48 h-48 text-blue-400 mb-8" />
          <h1 className="text-8xl font-black text-slate-900 text-center drop-shadow-2xl">해일 경보 발령!</h1>
          <p className="text-4xl text-blue-200 mt-8 font-bold">즉시 매트 위(안전구역)로 대피하십시오!</p>
        </div>
      )}

      {isPlankEvent && !isTsunami && (
        <div className="absolute inset-0 z-40 bg-red-600/30 flex flex-col items-center justify-center animate-pulse backdrop-blur-sm">
          <Flame className="w-48 h-48 text-red-500 mb-8" />
          <h1 className="text-8xl font-black text-slate-900 text-center drop-shadow-2xl">코어 과부하!</h1>
          <p className="text-4xl text-yellow-300 mt-8 font-bold">전원 30초 플랭크 실시!</p>
        </div>
      )}

      <header className="relative z-10 flex justify-between items-center px-12 py-8 bg-white/80 backdrop-blur-md border-b border-cyan-200">
        <div className="flex items-center gap-4">
          <Shield className="w-12 h-12 text-cyan-400" />
          <h1 className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            {gameRoom ? gameRoom.name : '폭탄 해체 작전'}
          </h1>
        </div>

        <div className={`flex items-center gap-6 px-8 py-4 rounded-xl border ${isDanger ? 'bg-red-100 border-red-300 animate-pulse' : 'bg-white border-slate-200 shadow-sm'}`}>
          <Clock className={`w-8 h-8 ${isDanger ? 'text-white' : 'text-red-500'}`} />
          <span className={`text-5xl font-bold font-mono tracking-wider ${isDanger ? 'text-red-600' : 'text-red-500'}`}>
            {mins}:{secs}
          </span>
        </div>
      </header>

      {gameRoom?.status === 'boss_raid' && (
        <div className="relative z-10 px-12 py-6 bg-slate-900 border-b border-slate-800 shadow-xl flex flex-col items-center justify-center">
          <div className="flex items-center gap-4 mb-2">
            <LucideIcons.Swords className="w-10 h-10 text-red-500 animate-pulse" />
            <h2 className="text-3xl font-black text-white">보스 레이드: 체육관의 수호자</h2>
          </div>
          <div className="w-full max-w-4xl bg-slate-800 rounded-full h-10 border-4 border-slate-700 relative overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-1000 ease-out"
              style={{ width: `${Math.max(0, ((gameRoom.boss_hp || 0) / (gameRoom.boss_max_hp || 1)) * 100)}%` }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center text-white font-black font-mono text-xl text-shadow-sm">
              {gameRoom.boss_hp} / {gameRoom.boss_max_hp}
            </div>
          </div>
        </div>
      )}

      <main className="relative z-10 p-12 grid grid-cols-2 lg:grid-cols-3 gap-8">
        {scores.map((score) => {
          const AvatarIcon = (LucideIcons as unknown as Record<string, React.ElementType>)[score.avatar || 'Smile'] || LucideIcons.Smile;
          return (
          <div key={score.id} className={`flex flex-col bg-white/90 backdrop-blur border-2 rounded-2xl p-6 shadow-md transition-all duration-500 ${score.is_defused ? 'border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : score.is_hacked ? 'border-red-400 animate-pulse' : 'border-slate-200'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600 border border-slate-200 shadow-sm">
                  <AvatarIcon className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">{score.group_name}</h2>
              </div>
              {score.is_defused ? (
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm font-bold rounded">해체 완료</span>
              ) : score.is_hacked ? (
                <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm font-bold rounded">해킹됨</span>
              ) : (
                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm font-bold rounded">작전 중</span>
              )}
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center py-6">
              <span className={`text-6xl font-black font-mono ${score.is_hacked ? 'text-red-500 glitch-text' : 'text-transparent bg-clip-text bg-gradient-to-b from-slate-900 to-slate-500'}`}>
                {score.score}
              </span>
              <span className="text-slate-500 mt-2 font-medium text-sm">점수</span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden border border-slate-200">
              <div className={`h-full rounded-full transition-all duration-1000 ${score.is_defused ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`} style={{ width: `${Math.min(100, (score.score / 1000) * 100)}%` }}></div>
            </div>
          </div>
          );
        })}
        {scores.length === 0 && <p className="text-slate-500 col-span-full text-center text-xl">아직 접속한 모둠이 없습니다.</p>}
      </main>
    </div>
  );
};
