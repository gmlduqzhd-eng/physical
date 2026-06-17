import React, { useState, useRef, useEffect } from 'react';
import { useGameLogic } from '../application/useGameLogic';
import { useGameTimer } from '../application/useGameTimer';
import { useSyncQueue } from '../application/useSyncQueue';
import { useAudio } from '../application/useAudio';
import { Shield, Zap, CheckCircle, Lock, Clock, ShoppingCart, AlertTriangle, Fingerprint, Footprints, Activity, Users, Flame } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../data/supabase';

interface MissionDef {
  amount: number;
  cooldown: number;
  title: string;
  desc: string;
  icon: any;
  color: string;
  bg: string;
}

const MISSIONS: MissionDef[] = [
  { amount: 10, cooldown: 1, title: '제자리 잔발뛰기', desc: '10초간 전력으로 제자리 뛰기', icon: Footprints, color: 'text-cyan-400', bg: 'bg-cyan-950/40 border-cyan-900' },
  { amount: 20, cooldown: 2, title: '정확한 스쿼트', desc: '허리를 펴고 스쿼트 5회', icon: Activity, color: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-900' },
  { amount: 40, cooldown: 3, title: '등 맞대고 일어서기', desc: '조원 2명 등 맞대고 앉았다 일어서기', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-900' },
  { amount: 50, cooldown: 3, title: '버피 테스트', desc: '가슴이 닿게 버피 테스트 5회', icon: Flame, color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-900' },
  { amount: 80, cooldown: 5, title: '코어 플랭크', desc: '전원 바닥에 엎드려 플랭크 10초 유지', icon: Shield, color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-900' },
  { amount: 100, cooldown: 5, title: '만세 점프', desc: '전원 손잡고 만세하며 5번 점프', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-900' }
];

export const MobileMissionView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { scores, gameControl } = useGameLogic();
  const { isTimeUp, mins, secs } = useGameTimer(gameControl);
  const { enqueueAction } = useSyncQueue();
  const { playBeep, playVictory } = useAudio();

  const [cooldown, setCooldown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [maxCooldownTime, setMaxCooldownTime] = useState(1);
  const [activeTab, setActiveTab] = useState<'mission' | 'shop'>('mission');
  const [holdProgress, setHoldProgress] = useState(0);
  
  // 낙관적 UI 상태
  const [optimisticOffset, setOptimisticOffset] = useState(0);
  const [clicks, setClicks] = useState<{id: number, x:number, y:number, val:number}[]>([]);
  
  const holdInterval = useRef<any>(null);
  const myGroup = scores.find(s => s.id === id);

  // 플레이 시 브금 및 오디오 문맥 활성화
  useEffect(() => {
    const init = () => playBeep();
    window.addEventListener('touchstart', init, { once: true });
    return () => window.removeEventListener('touchstart', init);
  }, [playBeep]);

  const isBossMode = myGroup ? myGroup.score >= 800 && !myGroup.is_defused : false;
  const isLocked = isTimeUp || gameControl?.status !== 'playing' || myGroup?.is_hacked || gameControl?.current_event === 'tsunami';
  const hasBuff = myGroup?.item_buff_until ? new Date(myGroup.item_buff_until).getTime() > Date.now() : false;

  // 서버 점수 동기화 시 낙관적 오프셋 리셋
  useEffect(() => {
    setOptimisticOffset(0);
  }, [myGroup?.score]);

  // 부드러운 쿨다운 타이머
  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setTimeout(() => setCooldownTime(c => c - 50), 50);
      return () => clearTimeout(timer);
    } else {
      setCooldown(false);
    }
  }, [cooldownTime]);

  const handleMissionComplete = (amount: number, cdSecs: number, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (isLocked || cooldown || !id) return;
    
    // 즉각적인 시각 피드백 (낙관적 UI)
    playBeep();
    setCooldown(true);
    setCooldownTime(cdSecs * 1000);
    setMaxCooldownTime(cdSecs * 1000);
    
    const actualAmount = hasBuff ? amount * 2 : amount;
    setOptimisticOffset(prev => prev + actualAmount);

    // 터치 좌표 기반 + 점수 애니메이션
    let x = 0; let y = 0;
    if ('touches' in e) {
      x = e.touches[0].clientX; y = e.touches[0].clientY;
    } else {
      x = (e as React.MouseEvent).clientX; y = (e as React.MouseEvent).clientY;
    }
    const clickId = Date.now() + Math.random();
    setClicks(prev => [...prev, { id: clickId, x, y, val: actualAmount }]);
    setTimeout(() => {
      setClicks(prev => prev.filter(c => c.id !== clickId));
    }, 800);

    // 서버 전송 (백그라운드)
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id, amount },
      timestamp: Date.now()
    });
  };

  const buyBuff = async () => {
    if (!myGroup || !id) return;
    if (myGroup.score < 200) return alert('점수가 부족합니다!');
    if (hasBuff) return alert('이미 버프가 적용 중입니다!');
    if(window.confirm('200점을 소모하여 1분간 점수 2배 버프를 구매하시겠습니까?')) {
      await supabase.rpc('buy_buff', { row_id: id });
      playBeep();
    }
  };

  // 보스 모드가 아닐 때 (또는 초기화 되었을 때) 찌꺼기 타이머와 게이지 강제 리셋
  useEffect(() => {
    if (!isBossMode) {
      setHoldProgress(0);
      if (holdInterval.current) {
        clearInterval(holdInterval.current);
        holdInterval.current = null;
      }
    }
  }, [isBossMode]);

  if (!id || !myGroup) return <div className="min-h-screen bg-slate-900 text-white flex justify-center items-center">로딩중...</div>;

  const startHold = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (isLocked || holdProgress >= 100 || holdInterval.current) return;
    
    playBeep();
    holdInterval.current = setInterval(() => {
      setHoldProgress(p => {
        if(p >= 100) {
          clearInterval(holdInterval.current);
          holdInterval.current = null;
          // 보스 해체 점수 전송 (여기서는 가짜 이벤트 전송 방지용으로 빈 껍데기만 넘김)
          enqueueAction({
            id: Math.random().toString(),
            type: 'INCREMENT_SCORE',
            payload: { id, amount: 200 },
            timestamp: Date.now()
          });
          playVictory();
          return 100;
        }
        return p + 2; // 100ms * 50 = 5초
      });
    }, 100);
  };

  const stopHold = () => {
    if (holdInterval.current) {
      clearInterval(holdInterval.current);
      holdInterval.current = null;
    }
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

  const displayScore = myGroup.score + optimisticOffset;

  return (
    <div className={`min-h-[100dvh] ${gameControl?.current_event === 'tsunami' ? 'bg-blue-950' : 'bg-slate-950'} text-white flex flex-col relative overflow-hidden select-none`}>
      {/* 플로팅 터치 애니메이션 */}
      {clicks.map(c => (
        <div key={c.id} className="absolute z-50 animate-float font-black text-3xl text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" style={{ left: c.x, top: c.y }}>
          +{c.val}
        </div>
      ))}

      {gameControl?.current_event === 'tsunami' && (
        <div className="absolute inset-0 bg-blue-600/20 animate-pulse z-0 pointer-events-none"></div>
      )}
      
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border bg-slate-900/80 border-slate-700 text-slate-300 pointer-events-none">
        <Clock className="w-4 h-4" /> <span className="font-mono">{mins}:{secs}</span>
      </div>

      <div className="flex-1 p-5 flex flex-col z-10 mt-12 overflow-y-auto">
        {/* Score Display */}
        <div className="shrink-0 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 mb-4 flex flex-col items-center shadow-2xl relative overflow-hidden transition-all">
          {hasBuff && <div className="absolute inset-0 bg-yellow-500/10 animate-pulse"></div>}
          <span className="text-slate-400 font-bold tracking-widest text-xs mb-1">
            현재 에너지 충전율 {hasBuff && <span className="text-yellow-400 ml-2">X2 버프 중!</span>}
          </span>
          <span className={`text-6xl font-black font-mono transition-transform ${optimisticOffset > 0 ? 'scale-110 text-cyan-300' : 'text-white'}`}>
            {displayScore}
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="shrink-0 flex gap-2 mb-4">
          <button onClick={() => setActiveTab('mission')} className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 ${activeTab === 'mission' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            <Shield className="w-5 h-5" /> 체육 미션
          </button>
          <button onClick={() => setActiveTab('shop')} className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 ${activeTab === 'shop' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            <ShoppingCart className="w-5 h-5" /> 상점
          </button>
        </div>

        {/* Action Area */}
        <div className="flex-1 flex flex-col relative min-h-0">
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
                className="w-full h-full relative bg-slate-900 border-2 border-red-500/50 rounded-3xl flex flex-col items-center justify-center overflow-hidden touch-none"
                onTouchStart={startHold} onTouchEnd={stopHold} onMouseDown={startHold} onMouseUp={stopHold} onMouseLeave={stopHold}
              >
                <div className="absolute bottom-0 left-0 right-0 bg-red-500/30 transition-all duration-100 ease-linear" style={{ height: `${holdProgress}%` }}></div>
                <Fingerprint className={`w-32 h-32 mb-6 z-10 ${holdProgress > 0 ? 'text-red-400 animate-ping' : 'text-slate-600'}`} />
                <p className="z-10 font-black text-2xl text-white mb-2">최종 해체 모드</p>
                <p className="z-10 text-sm text-slate-400 font-bold">조원 전원이 손을 대고 5초간 꾹 누르세요!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 overflow-y-auto pb-4 custom-scrollbar pr-2 h-full">
                {MISSIONS.map((m, i) => (
                  <button 
                    key={i}
                    onTouchStart={(e) => handleMissionComplete(m.amount, m.cooldown, e)}
                    onMouseDown={(e) => handleMissionComplete(m.amount, m.cooldown, e)}
                    disabled={isLocked || cooldown} 
                    className={`w-full shrink-0 relative group p-4 border rounded-2xl flex items-center justify-between transition-transform active:scale-95 touch-none ${m.bg}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full bg-slate-950/50 flex items-center justify-center border border-white/10 ${m.color}`}>
                        <m.icon className="w-6 h-6" />
                      </div>
                      <div className="text-left flex flex-col justify-center">
                        <div className={`font-black text-lg ${m.color}`}>{m.title}</div>
                        <div className="text-xs text-slate-400 font-bold mt-0.5">{m.desc}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`font-black text-2xl ${m.color}`}>+{m.amount}</span>
                      <span className="text-[10px] text-slate-500 font-bold mt-1">대기 {m.cooldown}초</span>
                    </div>

                    {/* Button Cooldown Overlay */}
                    {cooldown && (
                      <div className="absolute inset-0 bg-slate-950/60 rounded-2xl overflow-hidden backdrop-blur-[1px]">
                        <div className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-50 ease-linear" style={{ width: `${(cooldownTime / maxCooldownTime) * 100}%` }}></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="p-5 bg-slate-900 border border-purple-500/30 rounded-2xl flex justify-between items-center shrink-0">
              <div>
                <p className="font-bold text-purple-400 mb-1 text-lg">점수 2배 부스터 (1분)</p>
                <p className="text-sm text-slate-400 font-bold">모든 획득 에너지가 2배가 됩니다.</p>
              </div>
              <button onClick={buyBuff} disabled={hasBuff || myGroup.score < 200} className={`px-6 py-4 rounded-xl font-black text-lg transition-transform active:scale-95 ${myGroup.score >= 200 && !hasBuff ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'bg-slate-800 text-slate-500'}`}>
                200점
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
