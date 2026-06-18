import React, { useState, useRef, useEffect } from 'react';
import { useGameLogic } from '../application/useGameLogic';
import { useGameTimer } from '../application/useGameTimer';
import { useSyncQueue } from '../application/useSyncQueue';
import { useAudio } from '../application/useAudio';
import * as LucideIcons from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../data/supabase';

const SHOP_ITEMS = [
  { id: 'double', name: '점수 2배 물약', cost: 200, desc: '1분간 원정대 미션 점수가 2배가 됩니다.', icon: LucideIcons.Zap, color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-500/30' },
  { id: 'drone', name: '자동 채굴 드론', cost: 300, desc: '가만히 있어도 5초마다 10점씩 자동으로 오릅니다! (영구)', icon: LucideIcons.BatteryCharging, color: 'text-cyan-400', bg: 'bg-cyan-950/40 border-cyan-500/30' },
  { id: 'cooldown', name: '쿨다운 감소 포션', cost: 150, desc: '모든 미션의 대기 시간이 50% 줄어듭니다! (영구)', icon: LucideIcons.Clock, color: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-500/30' },
  { id: 'bonus', name: '보너스 요정', cost: 150, desc: '미션을 깰 때마다 +10점의 보너스가 추가됩니다! (영구)', icon: LucideIcons.Gift, color: 'text-pink-400', bg: 'bg-pink-950/40 border-pink-500/30' },
  { id: 'lucky', name: '럭키 캡슐', cost: 100, desc: '20% 확률로 400점 대박! (80%는 꽝입니다)', icon: LucideIcons.Coins, color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-500/30' },
  { id: 'allin', name: '올인(All-In) 룰렛', cost: 0, desc: '현재 점수를 전부 걸고 50% 확률로 점수 2배! 실패하면 0점...', icon: LucideIcons.Skull, color: 'text-red-400', bg: 'bg-red-950/40 border-red-500/30' },
  { id: 'donate', name: '기부 천사', cost: 100, desc: '현재 꼴등 조에게 무려 200점을 쏩니다! (나는 100점 소모)', icon: LucideIcons.HeartHandshake, color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-500/30' },
  { id: 'steal', name: '도둑 고양이', cost: 150, desc: '현재 1등 조의 점수를 몰래 100점 훔쳐옵니다!', icon: LucideIcons.Ghost, color: 'text-slate-400', bg: 'bg-slate-800/80 border-slate-500/30' },
  { id: 'time', name: '시간술사의 시계', cost: 200, desc: '학급 전체의 게임 남은 시간을 30초 늘려줍니다! (영웅 등장)', icon: LucideIcons.Clock, color: 'text-indigo-400', bg: 'bg-indigo-950/40 border-indigo-500/30' }
];

export const MobileMissionView = () => {
  const { roomId, groupId } = useParams<{ roomId: string, groupId: string }>();
  const navigate = useNavigate();
  const { scores, gameRoom, template } = useGameLogic(roomId);
  const { isTimeUp, mins, secs } = useGameTimer(gameRoom);
  const { enqueueAction } = useSyncQueue();
  const { playBeep, playVictory } = useAudio();

  const [cooldown, setCooldown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [maxCooldownTime, setMaxCooldownTime] = useState(1);
  const [activeTab, setActiveTab] = useState<'mission' | 'shop'>('mission');
  const [holdProgress, setHoldProgress] = useState(0);
  
  const [clicks, setClicks] = useState<{id: number, x:number, y:number, val:number}[]>([]);

  const [hasDrone, setHasDrone] = useState(() => localStorage.getItem('has_drone') === 'true');
  const [hasCooldown, setHasCooldown] = useState(() => localStorage.getItem('has_cooldown') === 'true');
  const [hasBonus, setHasBonus] = useState(() => localStorage.getItem('has_bonus') === 'true');
  
  const holdInterval = useRef<any>(null);
  const myGroup = scores.find(s => s.id === groupId);

  useEffect(() => {
    if (hasDrone && gameRoom?.status === 'playing') {
      const int = setInterval(() => {
        if (!groupId) return;
        enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 10 }, timestamp: Date.now() });
      }, 5000);
      return () => clearInterval(int);
    }
  }, [hasDrone, gameRoom?.status, groupId, enqueueAction]);

  useEffect(() => {
    const init = () => playBeep();
    window.addEventListener('touchstart', init, { once: true });
    return () => window.removeEventListener('touchstart', init);
  }, [playBeep]);

  const isBossMode = myGroup ? myGroup.score >= 800 && !myGroup.is_defused : false;
  const isLocked = isTimeUp || gameRoom?.status !== 'playing' || myGroup?.is_hacked;
  const hasBuff = myGroup?.item_buff_until ? new Date(myGroup.item_buff_until).getTime() > Date.now() : false;

  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setTimeout(() => setCooldownTime(c => c - 50), 50);
      return () => clearTimeout(timer);
    } else {
      setCooldown(false);
    }
  }, [cooldownTime]);

  const handleMissionComplete = (baseAmount: number, cdSecs: number, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (isLocked || cooldown || !groupId) return;
    
    playBeep();
    setCooldown(true);
    const finalCdSecs = hasCooldown ? cdSecs / 2 : cdSecs;
    setCooldownTime(finalCdSecs * 1000);
    setMaxCooldownTime(finalCdSecs * 1000);
    
    let actualAmount = hasBuff ? baseAmount * 2 : baseAmount;
    if (hasBonus) actualAmount += 10;

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

    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: hasBonus ? baseAmount + 10 : baseAmount }, 
      timestamp: Date.now()
    });
  };

  const buyItem = async (item: typeof SHOP_ITEMS[0]) => {
    if (!myGroup || !groupId) return;
    const currentScore = myGroup.score;
    
    if (item.id === 'allin') {
      if (currentScore <= 0) return alert('걸 점수가 없습니다!');
      if (!window.confirm(`정말 ${currentScore}점을 모두 걸고 올인하시겠습니까?`)) return;
      
      enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: -currentScore }, timestamp: Date.now() });
      
      if (Math.random() < 0.5) {
        setTimeout(() => {
          enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: currentScore * 2 }, timestamp: Date.now() });
          alert('🎉 대박!! 점수가 2배가 되었습니다!!');
        }, 500);
      } else {
        setTimeout(() => alert('💀 실패... 점수를 모두 잃었습니다.'), 500);
      }
      return;
    }

    if (item.id === 'double') {
      if (currentScore < item.cost) return alert('점수가 부족합니다!');
      if (hasBuff) return alert('이미 버프가 적용 중입니다!');
      if(window.confirm(`${item.cost}점을 소모하여 [${item.name}]을(를) 구매하시겠습니까?`)) {
        await supabase.rpc('buy_buff', { row_id: groupId });
        playBeep();
      }
      return;
    }

    if (currentScore < item.cost) return alert('점수가 부족합니다!');
    if (!window.confirm(`${item.cost}점을 소모하여 [${item.name}]을(를) 구매하시겠습니까?`)) return;

    enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: -item.cost }, timestamp: Date.now() });
    playBeep();

    if (item.id === 'drone') {
      setHasDrone(true); localStorage.setItem('has_drone', 'true');
    } else if (item.id === 'cooldown') {
      setHasCooldown(true); localStorage.setItem('has_cooldown', 'true');
    } else if (item.id === 'bonus') {
      setHasBonus(true); localStorage.setItem('has_bonus', 'true');
    } else if (item.id === 'lucky') {
      if (Math.random() < 0.2) {
        setTimeout(() => {
          enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 400 }, timestamp: Date.now() });
          alert('🎉 400점 대박 당첨!!');
        }, 300);
      } else {
        setTimeout(() => alert('😭 꽝입니다...'), 300);
      }
    } else if (item.id === 'donate') {
      const lowest = scores.reduce((prev, curr) => prev.score < curr.score ? prev : curr);
      if (lowest.id === groupId) {
        enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 100 }, timestamp: Date.now() });
        return alert('우리 조가 꼴등입니다! 다른 사람을 도울 여유가 없네요 ㅠㅠ');
      }
      enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: lowest.id, amount: 200 }, timestamp: Date.now() });
      alert('천사 강림! 꼴등 조에게 200점을 선물했습니다!');
    } else if (item.id === 'steal') {
      const highest = scores.reduce((prev, curr) => prev.score > curr.score ? prev : curr);
      if (highest.id === groupId) {
        enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 150 }, timestamp: Date.now() });
        return alert('우리 조가 이미 1등입니다! 훔칠 곳이 없어요.');
      }
      enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: highest.id, amount: -100 }, timestamp: Date.now() });
      setTimeout(() => {
        enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 100 }, timestamp: Date.now() });
        alert('성공! 1등 조의 점수를 100점 훔쳐왔습니다!');
      }, 500);
    } else if (item.id === 'time') {
      if (gameRoom) {
        const newMod = gameRoom.global_time_modifier + 30;
        await supabase.from('game_rooms').update({ global_time_modifier: newMod }).eq('id', gameRoom.id);
        alert('시간술사의 힘! 학급 전체 제한 시간이 30초 늘어났습니다!');
      }
    }
  };

  const buyVaccine = async () => {
    if (!myGroup || !groupId) return;
    const currentScore = myGroup.score;
    if (currentScore < 50) return alert('점수가 부족합니다!');
    if (!window.confirm('50점을 소모하여 해킹을 즉시 복구하시겠습니까?')) return;
    
    enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: -50 }, timestamp: Date.now() });
    await supabase.from('room_groups').update({ is_hacked: false }).eq('id', groupId);
    playBeep();
  };

  useEffect(() => {
    if (!isBossMode) {
      setHoldProgress(0);
      if (holdInterval.current) {
        clearInterval(holdInterval.current);
        holdInterval.current = null;
      }
    }
  }, [isBossMode]);

  if (!groupId || !myGroup || !template) return <div className="min-h-screen bg-slate-900 text-white flex justify-center items-center">데이터를 불러오는 중...</div>;

  const startHold = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (isLocked || holdProgress >= 100 || holdInterval.current) return;
    
    playBeep();
    holdInterval.current = setInterval(() => {
      setHoldProgress(p => {
        if(p >= 100) {
          clearInterval(holdInterval.current);
          holdInterval.current = null;
          enqueueAction({
            id: Math.random().toString(),
            type: 'INCREMENT_SCORE',
            payload: { id: groupId, amount: 200 },
            timestamp: Date.now()
          });
          playVictory();
          return 100;
        }
        return p + 2; 
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
        <LucideIcons.CheckCircle className="w-32 h-32 text-emerald-400 mb-8 animate-bounce relative z-10" />
        <h1 className="text-5xl font-black text-white mb-4 text-center tracking-tighter relative z-10">폭탄 해체<br/>성공!</h1>
        <button onClick={() => navigate('/')} className="px-8 py-4 bg-emerald-600 rounded-2xl text-white font-bold text-lg relative z-10">메인 화면으로</button>
      </div>
    );
  }

  const displayScore = myGroup.score;

  if (myGroup.is_hacked) {
    return (
      <div className="min-h-[100dvh] bg-red-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-red-600/30 mix-blend-color-burn animate-[pulse_0.1s_ease-in-out_infinite]"></div>
        <LucideIcons.AlertTriangle className="w-32 h-32 text-red-500 mb-8 animate-ping relative z-10" />
        <h1 className="text-5xl font-black text-red-400 mb-4 text-center relative z-10 glitch-text">시스템 해킹됨!</h1>
        <p className="text-white text-lg font-bold mb-8 text-center relative z-10">교사에게 즉시 보고하여<br/>통신망을 복구하세요!</p>
        
        <div className="relative z-10 bg-slate-900/80 p-5 rounded-2xl border border-red-500/50 flex flex-col items-center">
          <LucideIcons.ShieldAlert className="w-12 h-12 text-emerald-400 mb-3" />
          <p className="text-sm text-slate-300 mb-4 text-center">또는 백신을 구매하여<br/>즉시 해킹을 무효화할 수 있습니다.</p>
          <button onClick={buyVaccine} disabled={displayScore < 50} className={`w-full py-4 rounded-xl font-black text-lg ${displayScore >= 50 ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(52,211,153,0.4)]' : 'bg-slate-800 text-slate-500'}`}>
            백신 구매 (50점)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-[100dvh] ${gameRoom?.status === 'tsunami' ? 'bg-blue-950' : 'bg-slate-950'} text-white flex flex-col relative overflow-hidden select-none`}>
      {clicks.map(c => (
        <div key={c.id} className="absolute z-50 animate-float font-black text-4xl text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" style={{ left: c.x, top: c.y }}>
          +{c.val}
        </div>
      ))}

      {gameRoom?.status === 'tsunami' && (
        <div className="absolute inset-0 bg-blue-600/20 animate-pulse z-0 pointer-events-none"></div>
      )}
      
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border bg-slate-900/80 border-slate-700 text-slate-300 pointer-events-none">
        <LucideIcons.Clock className="w-4 h-4" /> <span className="font-mono">{mins}:{secs}</span>
      </div>

      <div className="flex-1 p-4 flex flex-col z-10 mt-12 overflow-y-auto">
        <div className="shrink-0 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 mb-4 flex flex-col items-center shadow-2xl relative overflow-hidden transition-all">
          {hasBuff && <div className="absolute inset-0 bg-yellow-500/10 animate-pulse"></div>}
          <span className="text-slate-400 font-bold tracking-widest text-sm mb-1">
            현재 에너지 충전율 {hasBuff && <span className="text-yellow-400 ml-2">X2 버프 중!</span>}
          </span>
          <span className={`text-7xl font-black font-mono transition-transform text-white`}>
            {displayScore}
          </span>
          
          <div className="flex gap-2 mt-3">
            {hasDrone && <span className="px-2 py-1 bg-cyan-900/50 text-cyan-300 rounded text-xs">드론 가동중</span>}
            {hasCooldown && <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs">쿨다운 단축</span>}
            {hasBonus && <span className="px-2 py-1 bg-pink-900/50 text-pink-300 rounded text-xs">보너스 요정</span>}
          </div>
        </div>

        <div className="shrink-0 flex gap-2 mb-4">
          <button onClick={() => setActiveTab('mission')} className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 ${activeTab === 'mission' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            <LucideIcons.Shield className="w-5 h-5" /> 땀방울 원정대 미션
          </button>
          <button onClick={() => setActiveTab('shop')} className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 ${activeTab === 'shop' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            <LucideIcons.ShoppingCart className="w-5 h-5" /> 아이템 상점
          </button>
        </div>

        <div className="flex-1 flex flex-col relative min-h-0">
          {isLocked && !myGroup.is_hacked && (
            <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center border border-slate-800">
              <LucideIcons.Lock className="w-10 h-10 text-slate-500 mb-2" />
              <p className="text-red-400 font-bold text-center text-lg">
                {gameRoom?.status === 'tsunami' ? '해일 대피 중! 미션 중단!' : '미션 진행 상태가 아닙니다'}
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
                <LucideIcons.Fingerprint className={`w-32 h-32 mb-6 z-10 ${holdProgress > 0 ? 'text-red-400 animate-ping' : 'text-slate-600'}`} />
                <p className="z-10 font-black text-3xl text-white mb-2">최종 해체 모드</p>
                <p className="z-10 text-lg text-slate-400 font-bold">조원 전원이 손을 대고 5초간 꾹 누르세요!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 overflow-y-auto pb-4 custom-scrollbar pr-2 h-full">
                {template.buttons.map((m: any, i: number) => {
                  const IconComp = (LucideIcons as any)[m.iconName] || LucideIcons.Activity;
                  return (
                    <button 
                      key={i}
                      onTouchStart={(e) => handleMissionComplete(m.amount, m.cooldown, e)}
                      onMouseDown={(e) => handleMissionComplete(m.amount, m.cooldown, e)}
                      disabled={isLocked || cooldown} 
                      className={`w-full shrink-0 relative group p-4 border rounded-2xl flex items-center justify-between transition-transform active:scale-95 touch-none ${m.bg}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-full bg-slate-950/50 flex items-center justify-center border border-white/10 ${m.color}`}>
                          <IconComp className="w-8 h-8" />
                        </div>
                        <div className="text-left flex flex-col justify-center">
                          <div className={`font-black text-xl ${m.color}`}>{m.title}</div>
                          <div className="text-sm text-slate-400 font-bold mt-0.5">{m.desc}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`font-black text-3xl ${m.color}`}>+{m.amount}</span>
                        <span className="text-xs text-slate-500 font-bold mt-1">대기 {m.cooldown}초</span>
                      </div>

                      {cooldown && (
                        <div className="absolute inset-0 bg-slate-950/60 rounded-2xl overflow-hidden backdrop-blur-[1px]">
                          <div className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-50 ease-linear" style={{ width: `${(cooldownTime / maxCooldownTime) * 100}%` }}></div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto pb-4 custom-scrollbar pr-2 h-full">
              {SHOP_ITEMS.map((item) => (
                <div key={item.id} className={`p-4 bg-slate-900 border rounded-2xl flex justify-between items-center shrink-0 ${item.bg}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full bg-slate-950/50 flex items-center justify-center border border-white/10 ${item.color}`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className={`font-black text-lg ${item.color}`}>{item.name}</p>
                      <p className="text-xs text-slate-400 font-bold break-keep pr-2">{item.desc}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => buyItem(item)} 
                    disabled={displayScore < item.cost || (item.id === 'double' && hasBuff)} 
                    className={`shrink-0 px-4 py-3 rounded-xl font-black text-base transition-transform active:scale-95 ${displayScore >= item.cost ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.4)]' : 'bg-slate-800 text-slate-500'}`}
                  >
                    {item.id === 'allin' ? '전부' : `${item.cost}점`}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
