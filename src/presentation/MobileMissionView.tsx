import { useState } from 'react';
import { useGameLogic } from '../application/useGameLogic';
import { useGameTimer } from '../application/useGameTimer';
import { useSyncQueue } from '../application/useSyncQueue';
import { Shield, Zap, WifiOff, Wifi, Anchor, Brain, Flame, CheckCircle, Lock, Clock } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

export const MobileMissionView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { scores, gameControl } = useGameLogic();
  const { isTimeUp, mins, secs, isDanger } = useGameTimer(gameControl);
  const { isOnline, queueLength, enqueueAction } = useSyncQueue();

  const [cooldown, setCooldown] = useState(false);

  const myGroup = scores.find(s => s.id === id);

  const handleMissionComplete = (amount: number) => {
    if (!id || cooldown || isTimeUp || gameControl?.status !== 'playing') return;
    
    setCooldown(true);
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id, amount },
      timestamp: Date.now()
    });

    // 3초 쿨다운
    setTimeout(() => {
      setCooldown(false);
    }, 3000);
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

  // 1000점 달성 (해체 완료) 화면
  if (myGroup.is_defused) {
    return (
      <div className="min-h-[100dvh] bg-emerald-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent animate-[pulse_2s_ease-in-out_infinite]"></div>
        <CheckCircle className="w-32 h-32 text-emerald-400 mb-8 animate-bounce relative z-10" />
        <h1 className="text-5xl font-black text-white mb-4 text-center tracking-tighter relative z-10">폭탄 해체<br/>성공!</h1>
        <p className="text-emerald-300 text-xl font-bold mb-12 relative z-10">여수 바다를 지켜냈습니다!</p>
        <button onClick={() => navigate('/')} className="px-8 py-4 bg-emerald-600 rounded-2xl text-white font-bold text-lg shadow-[0_0_20px_rgba(5,150,105,0.4)] relative z-10">
          메인 화면으로
        </button>
      </div>
    );
  }

  const isLocked = isTimeUp || gameControl?.status !== 'playing';

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col relative overflow-hidden">
      {/* 미니 타이머 추가 */}
      <div className={`absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${isTimeUp ? 'bg-red-950/80 border-red-500 text-red-400' : isDanger ? 'bg-red-900/50 border-red-500 text-red-400 animate-pulse' : 'bg-slate-900/80 border-slate-700 text-slate-300'}`}>
        <Clock className="w-4 h-4" />
        <span className="font-mono tracking-wider">{mins}:{secs}</span>
      </div>

      <div className={`absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${isOnline ? 'bg-emerald-950/50 border-emerald-500 text-emerald-400' : 'bg-red-950/50 border-red-500 text-red-400'}`}>
        {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
        {isOnline ? 'Online' : `Offline (Queue: ${queueLength})`}
      </div>

      <div className="flex-1 p-6 flex flex-col">
        <div className="flex flex-col items-center mb-6 mt-6">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)] mb-3">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
            {myGroup.group_name} 작전본부
          </h1>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-6 flex flex-col items-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <span className="text-slate-400 font-bold tracking-widest text-xs mb-1">현재 에너지 충전율</span>
          <span className="text-6xl font-black font-mono text-white">{myGroup.score}</span>
        </div>

        {/* Action Area */}
        <div className="mt-auto pb-4 flex flex-col gap-3 relative">
          
          {(isLocked || cooldown) && (
            <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center border border-slate-800">
              <Lock className="w-10 h-10 text-slate-500 mb-2" />
              <p className="text-slate-400 font-bold text-sm">
                {cooldown ? '에너지 전송 중... (3초 대기)' : '미션 진행 상태가 아닙니다'}
              </p>
            </div>
          )}

          <button onClick={() => handleMissionComplete(10)} disabled={isLocked || cooldown} className="w-full relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-100 transition duration-200"></div>
            <div className="relative w-full py-3 bg-slate-900 border border-slate-700 rounded-2xl flex items-center justify-between px-5">
              <div className="flex items-center gap-3">
                <div className="bg-cyan-500/20 p-2 rounded-lg"><Anchor className="w-5 h-5 text-cyan-400" /></div>
                <div className="text-left">
                  <div className="text-base font-bold text-white tracking-wide">진입로 확보</div>
                  <div className="text-[11px] text-slate-400">장애물 수거 완료</div>
                </div>
              </div>
              <span className="text-lg font-black text-cyan-400">+10</span>
            </div>
          </button>

          <button onClick={() => handleMissionComplete(50)} disabled={isLocked || cooldown} className="w-full relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl blur opacity-20 group-hover:opacity-100 transition duration-200"></div>
            <div className="relative w-full py-3 bg-slate-900 border border-slate-700 rounded-2xl flex items-center justify-between px-5">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/20 p-2 rounded-lg"><Zap className="w-5 h-5 text-emerald-400" /></div>
                <div className="text-left">
                  <div className="text-base font-bold text-white tracking-wide">에너지 충전</div>
                  <div className="text-[11px] text-slate-400">단체 스쿼트 10회</div>
                </div>
              </div>
              <span className="text-lg font-black text-emerald-400">+50</span>
            </div>
          </button>

          <button onClick={() => handleMissionComplete(100)} disabled={isLocked || cooldown} className="w-full relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-100 transition duration-200"></div>
            <div className="relative w-full py-3 bg-slate-900 border border-slate-700 rounded-2xl flex items-center justify-between px-5">
              <div className="flex items-center gap-3">
                <div className="bg-purple-500/20 p-2 rounded-lg"><Brain className="w-5 h-5 text-purple-400" /></div>
                <div className="text-left">
                  <div className="text-base font-bold text-white tracking-wide">암호 해독</div>
                  <div className="text-[11px] text-slate-400">협동 퍼즐 조립</div>
                </div>
              </div>
              <span className="text-lg font-black text-purple-400">+100</span>
            </div>
          </button>

          <button onClick={() => handleMissionComplete(200)} disabled={isLocked || cooldown} className="w-full relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur opacity-20 group-hover:opacity-100 transition duration-200"></div>
            <div className="relative w-full py-3 bg-slate-900 border border-slate-700 rounded-2xl flex items-center justify-between px-5">
              <div className="flex items-center gap-3">
                <div className="bg-red-500/20 p-2 rounded-lg"><Flame className="w-5 h-5 text-red-400" /></div>
                <div className="text-left">
                  <div className="text-base font-bold text-white tracking-wide">코어 밸런스</div>
                  <div className="text-[11px] text-slate-400">천으로 공 튕기기</div>
                </div>
              </div>
              <span className="text-lg font-black text-red-400">+200</span>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
};
