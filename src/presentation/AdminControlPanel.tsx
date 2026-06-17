import { useGameLogic } from '../application/useGameLogic';
import { useGameTimer } from '../application/useGameTimer';
import { supabase } from '../data/supabase';
import { ShieldAlert, Play, Pause, RotateCcw, CheckCircle, Waves, Bug } from 'lucide-react';

export const AdminControlPanel = () => {
  const { scores, gameControl } = useGameLogic();
  const { timeLeft, mins, secs, isDanger } = useGameTimer(gameControl);
  
  if (!gameControl) return <div className="min-h-screen bg-slate-900 text-white p-10 flex justify-center items-center">데이터 로딩 중...</div>;

  const handleStatusChange = async (status: 'playing' | 'paused') => {
    if (status === 'paused' && gameControl.status === 'playing') {
      const remaining = timeLeft;
      await supabase.from('game_controls').update({ 
          status: 'paused',
          started_at: null,
          global_time_modifier: remaining - 300
      }).eq('id', 1);
    } else if (status === 'playing' && gameControl.status !== 'playing') {
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

  const triggerTsunami = async () => {
    const newEvent = gameControl.current_event === 'tsunami' ? 'none' : 'tsunami';
    await supabase.from('game_controls').update({ current_event: newEvent }).eq('id', 1);
  };

  const toggleHack = async (groupId: string, isHacked: boolean) => {
    await supabase.from('bomb_defusal_scores').update({ is_hacked: !isHacked }).eq('id', groupId);
  };

  const handleReset = async () => {
    if(window.confirm('정말 게임을 초기화하시겠습니까? 모든 데이터가 리셋됩니다.')) {
      await supabase.from('game_controls').update({ status: 'paused', global_time_modifier: 0, started_at: null, current_event: 'none', last_score_time: null, last_score_group: null }).eq('id', 1);
      await supabase.from('bomb_defusal_scores').update({ score: 0, is_defused: false, is_hacked: false, item_buff_until: null }).not('id', 'is', null);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white p-6 md:p-10 font-sans pb-20">
      <div className="max-w-4xl mx-auto space-y-6 relative">
        <h1 className="text-3xl font-black flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500 relative z-10 mb-8">
          <ShieldAlert className="w-10 h-10 text-red-500" />
          교사 통제 본부
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 타이머 */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-700/50 shadow-xl flex flex-col items-center justify-center">
            <span className="text-slate-400 font-bold mb-2 text-sm">남은 작전 시간</span>
            <div className={`text-6xl font-mono font-black ${isDanger ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
              {mins}:{secs}
            </div>
            <div className="flex gap-2 mt-4 w-full">
              <button onClick={() => handleTimeModifier(-30)} className="flex-1 py-2 bg-red-950/50 text-red-400 rounded-lg font-bold border border-red-900/50">-30초</button>
              <button onClick={() => handleTimeModifier(30)} className="flex-1 py-2 bg-cyan-950/50 text-cyan-400 rounded-lg font-bold border border-cyan-900/50">+30초</button>
            </div>
          </div>

          {/* 재난 통제 */}
          <div className="md:col-span-2 bg-slate-900/80 p-6 rounded-2xl border border-slate-700/50 shadow-xl">
            <h2 className="text-lg font-bold text-slate-300 mb-4">특수 이벤트 통제</h2>
            <div className="flex gap-4">
              <button onClick={triggerTsunami} className={`flex-1 py-4 flex flex-col items-center justify-center gap-2 rounded-xl font-bold transition-all ${gameControl.current_event === 'tsunami' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.6)] animate-pulse' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                <Waves className="w-8 h-8" />
                {gameControl.current_event === 'tsunami' ? '해일 경보 해제' : '해일 경보 발동'}
              </button>
              <div className="flex-1 flex flex-col justify-center gap-2">
                <button onClick={() => handleStatusChange('playing')} className={`py-3 flex items-center justify-center gap-2 rounded-xl font-bold transition-all ${gameControl.status === 'playing' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Play className="w-5 h-5" /> 타이머 시작
                </button>
                <button onClick={() => handleStatusChange('paused')} className={`py-3 flex items-center justify-center gap-2 rounded-xl font-bold transition-all ${gameControl.status === 'paused' ? 'bg-yellow-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Pause className="w-5 h-5" /> 일시 정지
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 모둠 통제 보드 */}
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-700/50 shadow-xl">
          <h2 className="text-lg font-bold text-slate-300 mb-4">모둠별 첩자(해킹) 통제</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {scores.map(s => (
              <div key={s.id} className={`p-4 rounded-xl border flex flex-col items-center gap-2 ${s.is_defused ? 'bg-emerald-950/50 border-emerald-500' : s.is_hacked ? 'bg-red-950/50 border-red-500 animate-pulse' : 'bg-slate-800 border-slate-700'}`}>
                <div className="flex justify-between w-full items-center">
                  <span className="font-bold text-slate-200">{s.group_name}</span>
                  {s.is_defused && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                </div>
                <div className="text-2xl font-mono font-black text-cyan-400">{s.score}</div>
                {!s.is_defused && (
                  <button onClick={() => toggleHack(s.id, !!s.is_hacked)} className={`mt-2 w-full py-1.5 rounded text-sm font-bold flex items-center justify-center gap-1 ${s.is_hacked ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                    <Bug className="w-4 h-4" /> {s.is_hacked ? '해킹 해제' : '해킹 침투'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleReset} className="px-6 py-4 bg-red-950/40 hover:bg-red-900/60 text-red-500 border border-red-900/50 font-bold rounded-xl w-full flex justify-center items-center gap-2 transition-colors">
          <RotateCcw className="w-5 h-5" /> 모든 모둠 데이터 강제 초기화
        </button>
      </div>
    </div>
  );
};
