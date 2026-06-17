import { useGameLogic } from '../application/useGameLogic';
import { useGameTimer } from '../application/useGameTimer';
import { supabase } from '../data/supabase';
import { ShieldAlert, Play, Pause, Plus, Minus, RotateCcw, Clock, CheckCircle } from 'lucide-react';

export const AdminControlPanel = () => {
  const { scores, gameControl } = useGameLogic();
  const { timeLeft, mins, secs, isDanger } = useGameTimer(gameControl);
  
  if (!gameControl) return <div className="min-h-screen bg-slate-900 text-white p-10 flex justify-center items-center">데이터 로딩 중...</div>;

  const handleStatusChange = async (status: 'playing' | 'paused') => {
    if (status === 'paused' && gameControl.status === 'playing') {
      // 멈출 때 남은 시간을 계산하여 보정치에 넣고 시작 시간을 날림
      const remaining = timeLeft;
      await supabase.from('game_controls').update({ 
          status: 'paused',
          started_at: null,
          global_time_modifier: remaining - 300
      }).eq('id', 1);
    } else if (status === 'playing' && gameControl.status !== 'playing') {
      // 재개할 때 현재 시간을 다시 시작 시간으로 지정
      await supabase.from('game_controls').update({ 
          status: 'playing',
          started_at: new Date().toISOString()
      }).eq('id', 1);
    }
  };

  const handleTimeModifier = async (amount: number) => {
    await supabase.from('game_controls')
      .update({ global_time_modifier: gameControl.global_time_modifier + amount })
      .eq('id', 1);
  };

  const handleReset = async () => {
    if(window.confirm('정말 게임을 초기화하시겠습니까? 모든 모둠의 점수와 타이머가 5분으로 리셋됩니다.')) {
      await supabase.from('game_controls').update({ status: 'paused', global_time_modifier: 0, started_at: null }).eq('id', 1);
      await supabase.from('bomb_defusal_scores').update({ score: 0, is_defused: false, mission_stats: {} }).not('id', 'is', null);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white p-6 md:p-10 font-sans pb-20">
      <div className="max-w-3xl mx-auto space-y-6 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        
        <h1 className="text-3xl font-black flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500 relative z-10 mb-8">
          <ShieldAlert className="w-10 h-10 text-red-500" />
          교사 전용 통제 패널
        </h1>

        {/* 미니 현황판 및 타이머 (신규) */}
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-700/50 backdrop-blur shadow-2xl relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="flex flex-col items-center">
            <span className="text-slate-400 font-bold mb-2 text-sm tracking-widest">남은 작전 시간</span>
            <div className="flex items-center gap-3">
              <Clock className={`w-8 h-8 ${isDanger ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`} />
              <div className={`text-6xl font-mono font-black tracking-widest ${isDanger ? 'text-red-400' : 'text-white'}`}>
                {mins}:{secs}
              </div>
            </div>
          </div>
          
          <div className="flex-1 w-full flex gap-2 flex-wrap justify-end">
            {scores.map(s => (
              <div key={s.id} className={`px-4 py-2.5 rounded-xl border text-sm font-bold flex items-center gap-2 ${s.is_defused ? 'bg-emerald-900/40 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
                {s.group_name} 
                {s.is_defused ? <CheckCircle className="w-4 h-4" /> : <span className="font-mono opacity-50 ml-1">{s.score}</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6 relative z-10">
          {/* Status Control */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-700/50 backdrop-blur">
            <h2 className="text-lg font-bold text-slate-300 mb-4">게임 진행 제어</h2>
            <div className="flex gap-4">
              <button onClick={() => handleStatusChange('playing')} className={`flex-1 py-4 flex items-center justify-center gap-2 rounded-xl font-bold text-lg transition-all ${gameControl.status === 'playing' ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(5,150,105,0.4)] border border-emerald-500' : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'}`}>
                <Play className="w-6 h-6" /> 시작 / 재개
              </button>
              <button onClick={() => handleStatusChange('paused')} className={`flex-1 py-4 flex items-center justify-center gap-2 rounded-xl font-bold text-lg transition-all ${gameControl.status === 'paused' ? 'bg-yellow-600 text-white shadow-[0_0_20px_rgba(202,138,4,0.4)] border border-yellow-500' : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'}`}>
                <Pause className="w-6 h-6" /> 일시 정지
              </button>
            </div>
          </div>

          {/* Time Modifier */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-700/50 backdrop-blur">
            <h2 className="text-lg font-bold text-slate-300 mb-4">시간 조작 (패널티 / 보너스)</h2>
            <div className="flex items-center gap-4">
              <button onClick={() => handleTimeModifier(-30)} className="px-6 py-4 bg-red-950/40 hover:bg-red-900/60 text-red-400 font-bold rounded-xl flex items-center gap-2 border border-red-900/50 transition-colors">
                <Minus className="w-5 h-5" /> 30초 차감
              </button>
              <div className="flex-1 text-center flex flex-col">
                <span className="text-slate-500 text-sm font-bold mb-1">현재 보정치 누적</span>
                <span className="font-mono text-2xl font-black text-cyan-400">
                  {gameControl.global_time_modifier > 0 ? '+' : ''}{gameControl.global_time_modifier}s
                </span>
              </div>
              <button onClick={() => handleTimeModifier(30)} className="px-6 py-4 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-400 font-bold rounded-xl flex items-center gap-2 border border-cyan-900/50 transition-colors">
                <Plus className="w-5 h-5" /> 30초 연장
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-950/20 p-6 rounded-2xl border border-red-900/30 mt-8">
            <h2 className="text-red-500 font-bold mb-4 flex items-center gap-2">위험 구역 (Danger Zone)</h2>
            <button onClick={handleReset} className="px-6 py-4 bg-red-600/90 hover:bg-red-600 text-white font-bold rounded-xl w-full flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-colors">
              <RotateCcw className="w-5 h-5" /> 게임 전체 초기화 (데이터 및 타이머 리셋)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
