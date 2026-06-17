import { useState, useRef, useEffect } from 'react';
import { useGameLogic } from '../application/useGameLogic';
import { useGameTimer } from '../application/useGameTimer';
import { useSyncQueue } from '../application/useSyncQueue';
import { useAudio } from '../application/useAudio';
import { Shield, Zap, Anchor, Brain, CheckCircle, Lock, Clock, ShoppingCart, AlertTriangle, Fingerprint } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../data/supabase';

export const MobileMissionView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { scores, gameControl } = useGameLogic();
  const { isTimeUp, mins, secs } = useGameTimer(gameControl);
  const { enqueueAction } = useSyncQueue();
  const { playBeep, playVictory } = useAudio();

  const [cooldown, setCooldown] = useState(false);
  const [activeTab, setActiveTab] = useState<'mission' | 'shop'>('mission');
  const [holdProgress, setHoldProgress] = useState(0);
  
  const holdInterval = useRef<any>(null);
  const myGroup = scores.find(s => s.id === id);

  // 플레이 시 브금 및 오디오 문맥 활성화
  useEffect(() => {
    const init = () => playBeep();
    window.addEventListener('touchstart', init, { once: true });
    return () => window.removeEventListener('touchstart', init);
  }, [playBeep]);

  if (!id || !myGroup) return <div className="min-h-screen bg-slate-900 text-white flex justify-center items-center">로딩중...</div>;

  const isLocked = isTimeUp || gameControl?.status !== 'playing' || myGroup.is_hacked || gameControl?.current_event === 'tsunami';
  const hasBuff = myGroup.item_buff_until && new Date(myGroup.item_buff_until).getTime() > Date.now();
  const isBossMode = myGroup.score >= 800 && !myGroup.is_defused;

  const handleMissionComplete = (amount: number) => {
    if (isLocked || cooldown) return;
    
    playBeep();
    setCooldown(true);
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id, amount },
      timestamp: Date.now()
    });

    setTimeout(() => setCooldown(false), 3000);
  };

  const buyBuff = async () => {
    if (myGroup.score < 200) return alert('점수가 부족합니다!');
    if (hasBuff) return alert('이미 버프가 적용 중입니다!');
    if(window.confirm('200점을 소모하여 1분간 점수 2배 버프를 구매하시겠습니까?')) {
      await supabase.rpc('buy_buff', { row_id: id });
      playBeep();
    }
  };

  const startHold = () => {
    if (isLocked) return;
    if (holdProgress >= 100) return;
    holdInterval.current = setInterval(() => {
      setHoldProgress(p => {
        if(p >= 100) {
          clearInterval(holdInterval.current);
          handleMissionComplete(200); // Boss Defused!
          playVictory();
          return 100;
        }
        return p + 2; // 100ms * 50 = 5초
      });
    }, 100);
  };

  const stopHold = () => {
    clearInterval(holdInterval.current);
    if(holdProgress < 100) setHoldProgress(0);
  };

  if (myGroup.is_defused) {
    return (
      <div className="min-h-[100dvh] bg-emerald-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent animate-[pulse_2s_ease-in-out_infinite]"></div>
        <CheckCircle className="w-32 h-32 text-emerald-400 mb-8 animate-bounce relative z-10" />
        <h1 className="text-5xl font-black text-white mb-4 text-center tracking-tighter relative z-10">폭탄 해체<br/>성공!</h1>
        <button onClick={() => navigate('/')} className="px-8 py-4 bg-emerald-600 rounded-2xl text-white font-bold text-lg relative z-10">메인 화면으로</button>
      </div>
    );
  }

  // 글리치(해킹) 화면 연출
  if (myGroup.is_hacked) {
    return (
      <div className="min-h-[100dvh] bg-red-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-red-600/30 mix-blend-color-burn animate-[pulse_0.1s_ease-in-out_infinite]"></div>
        <AlertTriangle className="w-32 h-32 text-red-500 mb-8 animate-ping relative z-10" />
        <h1 className="text-4xl font-black text-red-400 mb-4 text-center relative z-10 glitch-text">시스템 해킹됨!</h1>
        <p className="text-white text-lg font-bold mb-12 text-center relative z-10">교사에게 즉시 보고하여<br/>통신망을 복구하세요!</p>
      </div>
    );
  }

  return (
    <div className={`min-h-[100dvh] ${gameControl?.current_event === 'tsunami' ? 'bg-blue-950' : 'bg-slate-950'} text-white flex flex-col relative overflow-hidden`}>
      {gameControl?.current_event === 'tsunami' && (
        <div className="absolute inset-0 bg-blue-600/20 animate-pulse z-0"></div>
      )}
      
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border bg-slate-900/80 border-slate-700 text-slate-300">
        <Clock className="w-4 h-4" /> <span className="font-mono">{mins}:{secs}</span>
      </div>

      <div className="flex-1 p-6 flex flex-col z-10 mt-12">
        {/* Score Display */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-6 flex flex-col items-center shadow-2xl relative overflow-hidden">
          {hasBuff && <div className="absolute inset-0 bg-yellow-500/10 animate-pulse"></div>}
          <span className="text-slate-400 font-bold tracking-widest text-xs mb-1">현재 에너지 충전율 {hasBuff && <span className="text-yellow-400 ml-2">X2 버프 중!</span>}</span>
          <span className="text-6xl font-black font-mono text-white">{myGroup.score}</span>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('mission')} className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 ${activeTab === 'mission' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            <Shield className="w-5 h-5" /> 미션
          </button>
          <button onClick={() => setActiveTab('shop')} className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 ${activeTab === 'shop' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            <ShoppingCart className="w-5 h-5" /> 상점
          </button>
        </div>

        {/* Action Area */}
        <div className="mt-auto pb-4 flex flex-col gap-3 relative">
          {isLocked && !myGroup.is_hacked && (
            <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center border border-slate-800">
              <Lock className="w-10 h-10 text-slate-500 mb-2" />
              <p className="text-red-400 font-bold text-center">
                {gameControl?.current_event === 'tsunami' ? '해일 대피 중! 미션 중단!' : '미션 진행 상태가 아닙니다'}
              </p>
            </div>
          )}

          {activeTab === 'mission' ? (
            isBossMode ? (
              <div 
                className="w-full relative h-64 bg-slate-900 border-2 border-red-500/50 rounded-3xl flex flex-col items-center justify-center overflow-hidden select-none"
                onTouchStart={startHold} onTouchEnd={stopHold} onMouseDown={startHold} onMouseUp={stopHold} onMouseLeave={stopHold}
              >
                <div className="absolute bottom-0 left-0 right-0 bg-red-500/30 transition-all duration-100 ease-linear" style={{ height: `${holdProgress}%` }}></div>
                <Fingerprint className={`w-24 h-24 mb-4 z-10 ${holdProgress > 0 ? 'text-red-400 animate-ping' : 'text-slate-600'}`} />
                <p className="z-10 font-bold text-lg text-white">최종 해체 모드</p>
                <p className="z-10 text-xs text-slate-400">조원 전원이 손을 대고 5초간 유지하세요</p>
              </div>
            ) : (
              <>
                <button onClick={() => handleMissionComplete(10)} disabled={isLocked || cooldown} className="w-full relative group py-3 bg-slate-900 border border-slate-700 rounded-2xl flex items-center justify-between px-5">
                  <div className="flex items-center gap-3">
                    <Anchor className="w-6 h-6 text-cyan-400" />
                    <div className="text-left"><div className="font-bold">진입로 확보</div></div>
                  </div>
                  <span className="font-black text-cyan-400">+10</span>
                </button>
                <button onClick={() => handleMissionComplete(50)} disabled={isLocked || cooldown} className="w-full relative group py-3 bg-slate-900 border border-slate-700 rounded-2xl flex items-center justify-between px-5">
                  <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 text-emerald-400" />
                    <div className="text-left"><div className="font-bold">에너지 충전</div></div>
                  </div>
                  <span className="font-black text-emerald-400">+50</span>
                </button>
                <button onClick={() => handleMissionComplete(100)} disabled={isLocked || cooldown} className="w-full relative group py-3 bg-slate-900 border border-slate-700 rounded-2xl flex items-center justify-between px-5">
                  <div className="flex items-center gap-3">
                    <Brain className="w-6 h-6 text-purple-400" />
                    <div className="text-left"><div className="font-bold">암호 해독</div></div>
                  </div>
                  <span className="font-black text-purple-400">+100</span>
                </button>
              </>
            )
          ) : (
            <div className="p-4 bg-slate-900 border border-purple-500/30 rounded-2xl flex justify-between items-center">
              <div>
                <p className="font-bold text-purple-400 mb-1">점수 2배 부스터 (1분)</p>
                <p className="text-xs text-slate-400">모든 획득 에너지가 2배가 됩니다.</p>
              </div>
              <button onClick={buyBuff} disabled={hasBuff || myGroup.score < 200} className={`px-4 py-2 rounded-xl font-bold ${myGroup.score >= 200 && !hasBuff ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                200점
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
