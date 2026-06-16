import React from 'react';
import { useGameLogic } from '../application/useGameLogic';
import { useSyncQueue } from '../application/useSyncQueue';
import { Shield, Zap, CheckCircle2, WifiOff, Wifi } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

export const MobileMissionView = () => {
  const { id } = useParams<{ id: string }>(); // 모둠 ID
  const navigate = useNavigate();
  const { scores } = useGameLogic();
  const { isOnline, queueLength, enqueueAction } = useSyncQueue();

  const myGroup = scores.find(s => s.id === id);

  const handleMissionComplete = () => {
    if (!id) return;
    
    // 네트워킹 불안정 대응을 위해 useSyncQueue의 enqueueAction 호출 (원자적 점수 증가 요청)
    enqueueAction({
      id: Math.random().toString(), // Action ID
      type: 'INCREMENT_SCORE',
      payload: { id, amount: 50 },
      timestamp: Date.now()
    });
  };

  if (!id || !myGroup) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-6">
        <h2 className="text-white text-2xl font-bold mb-4">모둠 정보를 불러오는 중입니다...</h2>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-cyan-600 rounded-xl text-white font-bold">
          메인으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col relative overflow-hidden">
      {/* Network Status Badge */}
      <div className={`absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${isOnline ? 'bg-emerald-950/50 border-emerald-500 text-emerald-400' : 'bg-red-950/50 border-red-500 text-red-400'}`}>
        {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
        {isOnline ? 'Online' : `Offline (Queue: ${queueLength})`}
      </div>

      <div className="flex-1 p-6 flex flex-col">
        {/* Header */}
        <div className="flex flex-col items-center mb-8 mt-10">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.4)] mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
            {myGroup.group_name}
          </h1>
          <p className="text-slate-400 mt-2 font-mono">해체 코드 수집 중</p>
        </div>

        {/* Score Card (Glassmorphism) */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-8 flex flex-col items-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <span className="text-slate-400 font-bold tracking-widest text-sm mb-2">CURRENT SCORE</span>
          <span className="text-7xl font-black font-mono text-white">{myGroup.score}</span>
        </div>

        {/* Action Area */}
        <div className="mt-auto pb-6">
          <button 
            onClick={handleMissionComplete}
            className="w-full relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-200"></div>
            <div className="relative w-full py-6 bg-slate-900 border border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-2">
              <Zap className="w-8 h-8 text-cyan-400" />
              <span className="text-xl font-bold text-white tracking-wide">미션 성공 (50점 획득)</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
