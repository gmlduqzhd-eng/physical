import React from 'react';
import { useGameLogic } from '../application/useGameLogic';
import { supabase } from '../data/supabase';
import { ShieldAlert, Play, Pause, Plus, Minus, RotateCcw } from 'lucide-react';

export const AdminControlPanel = () => {
  const { gameControl } = useGameLogic();
  
  if (!gameControl) return <div className="min-h-screen bg-slate-900 text-white p-10">데이터 로딩 중...</div>;

  const handleStatusChange = async (status: 'playing' | 'paused') => {
    const updateData: any = { status };
    if (status === 'playing' && !gameControl.started_at) {
      updateData.started_at = new Date().toISOString();
    }
    await supabase.from('game_controls').update(updateData).eq('id', 1);
  };

  const handleTimeModifier = async (amount: number) => {
    await supabase.from('game_controls')
      .update({ global_time_modifier: gameControl.global_time_modifier + amount })
      .eq('id', 1);
  };

  const handleReset = async () => {
    if(window.confirm('정말 게임을 초기화하시겠습니까? 모든 모둠의 점수와 타이머가 리셋됩니다.')) {
      await supabase.from('game_controls').update({ status: 'paused', global_time_modifier: 0, started_at: null }).eq('id', 1);
      // 개발의 편의를 위해 0점 업데이트. (실무에서는 ID를 명시하거나 rpc 일괄 업데이트 권장)
      await supabase.from('bomb_defusal_scores').update({ score: 0, is_defused: false, mission_stats: {} }).not('id', 'is', null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-slate-800 rounded-3xl p-10 border border-slate-700 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        
        <h1 className="text-3xl font-black flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500 mb-10 relative z-10">
          <ShieldAlert className="w-10 h-10 text-red-500" />
          교사 전용 제어 패널
        </h1>

        <div className="space-y-8 relative z-10">
          {/* Status Control */}
          <div className="bg-slate-900/80 p-8 rounded-2xl border border-slate-700/50 backdrop-blur">
            <h2 className="text-lg font-bold text-slate-300 mb-6">게임 진행 제어</h2>
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
          <div className="bg-slate-900/80 p-8 rounded-2xl border border-slate-700/50 backdrop-blur">
            <h2 className="text-lg font-bold text-slate-300 mb-6">시간 조작 (패널티 / 보너스)</h2>
            <div className="flex items-center gap-6">
              <button onClick={() => handleTimeModifier(-30)} className="px-6 py-4 bg-red-950/40 hover:bg-red-900/60 text-red-400 font-bold rounded-xl flex items-center gap-2 border border-red-900/50 transition-colors">
                <Minus className="w-5 h-5" /> 30초 차감
              </button>
              <div className="flex-1 text-center flex flex-col">
                <span className="text-slate-500 text-sm font-bold mb-1">현재 보정치</span>
                <span className="font-mono text-3xl font-black text-cyan-400">
                  {gameControl.global_time_modifier > 0 ? '+' : ''}{gameControl.global_time_modifier}s
                </span>
              </div>
              <button onClick={() => handleTimeModifier(30)} className="px-6 py-4 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-400 font-bold rounded-xl flex items-center gap-2 border border-cyan-900/50 transition-colors">
                <Plus className="w-5 h-5" /> 30초 연장
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-950/20 p-8 rounded-2xl border border-red-900/30 mt-12">
            <h2 className="text-red-500 font-bold mb-4 flex items-center gap-2">위험 구역 (Danger Zone)</h2>
            <button onClick={handleReset} className="px-6 py-4 bg-red-600/90 hover:bg-red-600 text-white font-bold rounded-xl w-full flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-colors">
              <RotateCcw className="w-5 h-5" /> 게임 전체 초기화 (데이터 리셋)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
