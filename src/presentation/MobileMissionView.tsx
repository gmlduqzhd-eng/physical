/* eslint-disable react-hooks/purity, react-hooks/set-state-in-effect */
import React, { useState, useRef, useEffect } from 'react';
import { useGameLogic } from '../application/useGameLogic';
import { useGameTimer } from '../application/useGameTimer';
import { useSyncQueue } from '../application/useSyncQueue';
import { useAudio } from '../application/useAudio';
import * as LucideIcons from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../data/supabase';

const SHOP_ITEMS = [
  { id: 'double', name: '점수 2배 물약', cost: 200, desc: '1분간 원정대 미션 점수가 2배가 됩니다.', icon: LucideIcons.Zap, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  { id: 'drone', name: '자동 채굴 드론', cost: 300, desc: '가만히 있어도 5초마다 10점씩 자동으로 오릅니다! (영구)', icon: LucideIcons.BatteryCharging, color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200' },
  { id: 'cooldown', name: '쿨다운 감소 포션', cost: 150, desc: '모든 미션의 대기 시간이 50% 줄어듭니다! (영구)', icon: LucideIcons.Clock, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { id: 'bonus', name: '보너스 요정', cost: 150, desc: '미션을 깰 때마다 +10점의 보너스가 추가됩니다! (영구)', icon: LucideIcons.Gift, color: 'text-pink-600', bg: 'bg-pink-50 border-pink-200' },
  { id: 'lucky', name: '럭키 캡슐', cost: 100, desc: '20% 확률로 400점 대박! (80%는 꽝입니다)', icon: LucideIcons.Coins, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
  { id: 'allin', name: '올인(All-In) 룰렛', cost: 0, desc: '현재 점수를 전부 걸고 50% 확률로 점수 2배! 실패하면 0점...', icon: LucideIcons.Skull, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  { id: 'donate', name: '기부 천사', cost: 100, desc: '현재 꼴등 조에게 무려 200점을 쏩니다! (나는 100점 소모)', icon: LucideIcons.HeartHandshake, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  { id: 'steal', name: '도둑 고양이', cost: 150, desc: '현재 1등 조의 점수를 몰래 100점 훔쳐옵니다!', icon: LucideIcons.Ghost, color: 'text-slate-600', bg: 'bg-slate-100 border-slate-300' },
  { id: 'time', name: '시간술사의 시계', cost: 200, desc: '학급 전체의 게임 남은 시간을 30초 늘려줍니다! (영웅 등장)', icon: LucideIcons.Clock, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
  { id: 'blind', name: '먹물 공격', cost: 200, desc: '현재 1등 조의 화면을 15초간 시커멓게 가립니다!', icon: LucideIcons.EyeOff, color: 'text-stone-600', bg: 'bg-stone-100 border-stone-300' },
  { id: 'tsunami', name: '해킹 스크립트', cost: 300, desc: '가장 점수가 높은 조에게 해킹 공격을 가하여 미션을 잠금 상태로 만듭니다!', icon: LucideIcons.TerminalSquare, color: 'text-red-700', bg: 'bg-red-100 border-red-300' }
];

export const MobileMissionView = () => {
  const { roomId, groupId } = useParams<{ roomId: string, groupId: string }>();
  const navigate = useNavigate();
  const { scores, gameRoom, template } = useGameLogic(roomId);
  const { isTimeUp, mins, secs } = useGameTimer(gameRoom);
  const { enqueueAction, isOnline, queueLength, isSyncing } = useSyncQueue();
  const { playBeep, playVictory, playSiren } = useAudio();

  const [cooldownTime, setCooldownTime] = useState(0);
  const cooldown = cooldownTime > 0;
  const [maxCooldownTime, setMaxCooldownTime] = useState(1);
  const [activeTab, setActiveTab] = useState<'mission' | 'shop' | 'bingo'>('mission');
  const [holdProgress, setHoldProgress] = useState(0);
  
  const [clicks, setClicks] = useState<{id: number, x:number, y:number, val:number}[]>([]);

  const [hasDrone, setHasDrone] = useState(() => localStorage.getItem(`has_drone_${roomId}_${groupId}`) === 'true');
  const [hasCooldown, setHasCooldown] = useState(() => localStorage.getItem(`has_cooldown_${roomId}_${groupId}`) === 'true');
  const [hasBonus, setHasBonus] = useState(() => localStorage.getItem(`has_bonus_${roomId}_${groupId}`) === 'true');
  
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMotionPenalty = useRef<number>(0);
  const activeDefuseCountRef = useRef(0);
  const myGroup = scores.find(s => s.id === groupId);

  const [deviceId] = useState(() => Math.random().toString(36).substring(2));
  const joinTimeRef = useRef(Date.now());

  const [activeDevicesCount, setActiveDevicesCount] = useState(0);

  const isBossMode = myGroup ? myGroup.score >= 800 && !myGroup.is_defused : false;
  const isLocked = isTimeUp || gameRoom?.status !== 'playing' || myGroup?.is_hacked;
  const hasBuff = myGroup?.item_buff_until ? new Date(myGroup.item_buff_until).getTime() > Date.now() : false;

  const highestScore = scores.length > 0 ? Math.max(...scores.map(s => s.score)) : 0;
  const isLowest = scores.length > 1 && myGroup && scores.every(s => myGroup.score <= s.score);
  const isComebackActive = isLowest && (highestScore - (myGroup?.score || 0) >= 500);

  const isZombie = myGroup?.badges?.includes('zombie') || false;
  const isSpy = myGroup?.spy_device_id === deviceId;
  const mySurvivorCode = myGroup?.id.substring(0, 4).toUpperCase() || '';
  const [infectCode, setInfectCode] = useState('');

  const globalChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const globalChannel = supabase.channel(`room:${roomId}:global`);
    globalChannel.subscribe();
    globalChannelRef.current = globalChannel;
    return () => { supabase.removeChannel(globalChannel); globalChannelRef.current = null; };
  }, [roomId]);

  const handleInfect = async () => {
    if (!infectCode || infectCode.length !== 4 || !groupId) return;
    const targetGroup = scores.find(s => s.id.substring(0,4).toUpperCase() === infectCode.toUpperCase() && s.id !== groupId);
    if (!targetGroup) {
      alert('유효하지 않은 코드이거나 존재하지 않는 생존자입니다.');
      return;
    }
    if (targetGroup.badges?.includes('zombie')) {
      alert('해당 생존자는 이미 감염되었습니다.');
      return;
    }

    const newBadges = [...(targetGroup.badges || []), 'zombie'];
    await supabase.from('room_groups').update({ badges: newBadges }).eq('id', targetGroup.id);
    
    enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 500 }, timestamp: Date.now() });
    enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: targetGroup.id, amount: -300 }, timestamp: Date.now() });

    alert(`🧟 [${targetGroup.group_name}] 조를 감염시켰습니다! 보너스 500점 획득!`);
    setInfectCode('');
  };

  const handleMissionComplete = async (mission: import('../domain/types').MissionButton, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    // Check prerequisite
    if (mission.prerequisiteMissionId && !myGroup?.completed_missions?.includes(mission.prerequisiteMissionId)) {
      alert('이전 단계 미션을 먼저 완료해야 합니다!');
      return;
    }
    
    // Check zombie vaccine
    if (gameRoom?.status === 'zombie' && isLocked) {
       if (!mission.isVaccine) {
          alert('좀비에게 감염되었습니다! 백신 QR코드만 스캔할 수 있습니다.');
          return;
       } else {
          alert('백신을 투여하여 감염에서 회복되었습니다!');
          await supabase.from('room_groups').update({ is_hacked: false, is_defused: false }).eq('id', groupId);
       }
    } else if (isLocked || cooldown || !groupId) {
       return;
    }

    if (mission.requires_approval) {
      if (myGroup?.pending_missions?.includes(mission.id)) {
        return alert('이미 승인 대기 중입니다!');
      }
      const newPending = [...(myGroup?.pending_missions || []), mission.id];
      await supabase.from('room_groups').update({ pending_missions: newPending }).eq('id', groupId);
      alert('선생님 승인 대기 중입니다! 선생님이 승인하면 점수가 반영됩니다.');
      return;
    }

    const MotionEvent = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof MotionEvent.requestPermission === 'function') {
      MotionEvent.requestPermission().catch(() => {});
    }
    
    if (navigator.vibrate) navigator.vibrate(50);
    playBeep();
    const cdSecs = mission.cooldown || 5;
    const finalCdSecs = hasCooldown ? cdSecs / 2 : cdSecs;
    setCooldownTime(finalCdSecs * 1000);
    setMaxCooldownTime(finalCdSecs * 1000);
    
    let actualAmount = hasBuff ? mission.amount * 2 : mission.amount;
    if (isComebackActive) actualAmount *= 2;
    if (hasBonus) actualAmount += 10;
    
    if (isSpy && gameRoom?.status === 'mafia') {
      actualAmount = -Math.abs(actualAmount);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }

    let x = 0; let y = 0;
    if ('touches' in e) {
      x = (e as React.TouchEvent).touches[0].clientX; y = (e as React.TouchEvent).touches[0].clientY;
    } else if ('clientX' in e) {
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
      payload: { id: groupId as string, amount: actualAmount }, 
      timestamp: Date.now()
    });

    // Handle completed missions and laps (Time Attack / Story mode)
    if (mission.id && !myGroup?.completed_missions?.includes(mission.id)) {
      const newCompleted = [...(myGroup?.completed_missions || []), mission.id];
      const allVisibleMissions = template?.buttons?.filter((m: import('../domain/types').MissionButton) => !m.isHidden).map((m: import('../domain/types').MissionButton) => m.id) || [];
      const isLapComplete = allVisibleMissions.length > 0 && allVisibleMissions.every((id: string) => newCompleted.includes(id));

      if (gameRoom?.status === 'time_attack' && isLapComplete) {
        const currentLaps = myGroup?.stats?.laps || 0;
        await supabase.from('room_groups').update({ 
          completed_missions: [], 
          stats: { ...(myGroup?.stats || {}), laps: currentLaps + 1 }
        }).eq('id', groupId);
        alert(`🎉 랩(Lap) ${currentLaps + 1} 완성! 서킷 1바퀴를 완주했습니다!`);
        playVictory();
      } else {
        await supabase.from('room_groups').update({ completed_missions: newCompleted }).eq('id', groupId);
      }
    }
  };

  const handleMissionCompleteRef = useRef(handleMissionComplete);
  useEffect(() => { handleMissionCompleteRef.current = handleMissionComplete; });

  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scanner.render(
        (decodedText) => {
          scanner.clear();
          setShowScanner(false);
          const mission = template?.buttons?.find((m: import('../domain/types').MissionButton) => m.id === decodedText);
          if (mission) {
             const fakeEvent = { preventDefault: () => {}, clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 };
             // Use a small delay so scanner modal closes before processing
             setTimeout(() => handleMissionCompleteRef.current(mission as import('../domain/types').MissionButton, fakeEvent as unknown as React.MouseEvent), 100);
          } else {
             alert('❌ 게임에 등록되지 않은 QR 코드입니다.');
          }
        },
        () => {} // ignore frame errors
      );
      return () => { scanner.clear().catch(()=>{}); };
    }
  }, [showScanner, template]); // handleMissionCompleteRef doesn't change, so we don't restart scanner

  const handleBingoComplete = async (missionId: string, baseAmount: number, isCoop: boolean) => {
    if (!myGroup || !groupId) return;
    const currentCompleted = myGroup.completed_missions || [];
    if (currentCompleted.includes(missionId)) return;

    const mission = template?.buttons?.find((b: import('../domain/types').MissionButton) => b.id === missionId);
    if (mission?.requires_approval && !isCoop) {
      if (myGroup?.pending_missions?.includes(missionId)) {
        return alert('이미 승인 대기 중입니다!');
      }
      const newPending = [...(myGroup?.pending_missions || []), missionId];
      await supabase.from('room_groups').update({ pending_missions: newPending }).eq('id', groupId);
      alert('선생님 승인 대기 중입니다! 선생님이 승인하면 빙고판에 반영됩니다.');
      return;
    }

    if (isCoop && activeDevicesCount > 1) {
      // 협동 미션 체크(단순화): 동시에 누르고 있다고 가정
    }

    const newCompleted = [...currentCompleted, missionId];
    await supabase.from('room_groups').update({ completed_missions: newCompleted }).eq('id', groupId);

    const getLines = (completedIds: string[]) => {
      if (!template?.buttons) return 0;
      const board = template.buttons.slice(0, 9).map((m: import('../domain/types').MissionButton) => completedIds.includes(m.id));
      const lines = [
        [0,1,2], [3,4,5], [6,7,8],
        [0,3,6], [1,4,7], [2,5,8],
        [0,4,8], [2,4,6]
      ];
      return lines.filter(line => line.every(idx => board[idx])).length;
    };

    const oldLines = getLines(currentCompleted);
    const newLines = getLines(newCompleted);

    let totalAward = baseAmount;
    if (newLines > oldLines) {
      const bonus = (newLines - oldLines) * 1000;
      totalAward += bonus;
      alert(`🎉 빙고 완성!! 보너스 ${bonus}점 획득!`);
      
      const currentBadges = myGroup.badges || [];
      if (newLines >= 1 && !currentBadges.includes('bingo')) {
        await supabase.from('room_groups').update({ badges: [...currentBadges, 'bingo'] }).eq('id', groupId);
        setTimeout(() => alert('🏆 업적 달성: [빙고 마스터] - 빙고 1줄 완성!'), 500);
      }
    }

    enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: totalAward }, timestamp: Date.now() });
    playVictory();
  };

  const handleBingoCompleteRef = useRef(handleBingoComplete);
  useEffect(() => { handleBingoCompleteRef.current = handleBingoComplete; });

  const handleCoopTouchStart = async (missionId: string) => {
    if (channelRef.current) {
      await channelRef.current.track({ deviceId, joined_at: joinTimeRef.current, pressingCoop: missionId });
    }
  };

  const handleCoopTouchEnd = async () => {
    if (channelRef.current) {
      await channelRef.current.track({ deviceId, joined_at: joinTimeRef.current, pressingCoop: null });
    }
  };

  useEffect(() => {
    if (gameRoom && gameRoom.status === 'waiting') {
      localStorage.removeItem(`has_drone_${roomId}_${groupId}`);
      localStorage.removeItem(`has_cooldown_${roomId}_${groupId}`);
      localStorage.removeItem(`has_bonus_${roomId}_${groupId}`);
      setHasDrone(false);
      setHasCooldown(false);
      setHasBonus(false);
    }
  }, [gameRoom, gameRoom?.status, roomId, groupId]);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const coopTriggered = useRef(false);

  useEffect(() => {
    if (!roomId || !groupId) return;
    
    const myDeviceId = deviceId;
    const myJoinTime = joinTimeRef.current;
    
    const channel = supabase.channel(`presence_room_${roomId}_group_${groupId}`, {
      config: { presence: { key: myDeviceId } }
    });
    
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const keys = Object.keys(state);
      setActiveDevicesCount(keys.length);

      let pressingCount = 0;
      let targetMissionId: string | null = null;
      let defusePressingCount = 0;
      
      const deviceIds: string[] = [];

      for (const key of keys) {
        const presenceData = state[key][0] as Record<string, unknown>;
        if (presenceData?.deviceId) deviceIds.push(presenceData.deviceId as string);
        if (presenceData?.pressingCoop) {
          pressingCount++;
          targetMissionId = presenceData.pressingCoop as string;
        }
        if (presenceData?.pressingDefuse) {
          defusePressingCount++;
        }
      }
      activeDefuseCountRef.current = defusePressingCount;

      deviceIds.sort();
      if (deviceIds[0] === deviceId && gameRoom?.status === 'mafia') {
        const myGroupNow = scores.find(s => s.id === groupId);
        if (myGroupNow && !myGroupNow.spy_device_id && deviceIds.length > 0) {
          const randomSpy = deviceIds[Math.floor(Math.random() * deviceIds.length)];
          supabase.from('room_groups').update({ spy_device_id: randomSpy }).eq('id', groupId).then();
        }
      }

      if (pressingCount >= 2 && targetMissionId && !coopTriggered.current) {
        coopTriggered.current = true;
        handleBingoCompleteRef.current(targetMissionId, 500, true);
        playVictory();
        alert('🎉 깍두기 크로스 성공! 2명이 동시에 눌러 미션이 완료되었습니다!');
      }
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ deviceId: myDeviceId, joined_at: myJoinTime, pressingCoop: null });
      }
    });

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, groupId]);

  useEffect(() => {
    if (hasDrone && gameRoom?.status === 'playing' && !isTimeUp) {
      const int = setInterval(() => {
        if (!groupId) return;
        enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 10 }, timestamp: Date.now() });
      }, 5000);
      return () => clearInterval(int);
    }
  }, [hasDrone, gameRoom?.status, isTimeUp, groupId, enqueueAction]);

  useEffect(() => {
    const init = () => playBeep();
    window.addEventListener('touchstart', init, { once: true });
    return () => window.removeEventListener('touchstart', init);
  }, [playBeep]);

  // 1. 무궁화 꽃이 피었습니다 (디바이스 모션 감지)
  useEffect(() => {
    if (gameRoom?.status !== 'tsunami') return;

    const handleMotion = (event: DeviceMotionEvent) => {
      if (Date.now() - lastMotionPenalty.current < 3000) return; // 3초 쿨다운

      const { x, y, z } = event.acceleration || {};
      const threshold = 15; // Threshold (감도)
      if (x != null && y != null && z != null) {
        if (Math.abs(x) > threshold || Math.abs(y) > threshold || Math.abs(z) > threshold) {
          lastMotionPenalty.current = Date.now();
          if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
          playSiren();
          
          if (groupId) {
            enqueueAction({
              id: Math.random().toString(),
              type: 'INCREMENT_SCORE',
              payload: { id: groupId, amount: -50 },
              timestamp: Date.now()
            });
            setClicks(prev => [...prev, { id: Date.now(), x: window.innerWidth/2, y: window.innerHeight/2, val: -50 }]);
            setTimeout(() => {
              setClicks(prev => prev.filter(c => c.val !== -50));
            }, 800);
          }
        }
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [gameRoom?.status, groupId, enqueueAction, playSiren]);



  useEffect(() => {
    if (!myGroup || !groupId) return;
    const currentBadges = myGroup.badges || [];
    const newBadges = [...currentBadges];
    let updated = false;

    if (myGroup.score >= 3000 && !currentBadges.includes('rich')) {
      newBadges.push('rich');
      updated = true;
      setTimeout(() => alert('🏆 업적 달성: [만수르] - 3000점 돌파!'), 100);
    }

    const itemsBought = myGroup.stats?.items_bought || 0;
    if (itemsBought >= 5 && !currentBadges.includes('shopaholic')) {
      newBadges.push('shopaholic');
      updated = true;
      setTimeout(() => alert('🏆 업적 달성: [쇼핑 중독] - 아이템 5회 구매!'), 100);
    }

    if (updated) {
      supabase.from('room_groups').update({ badges: newBadges }).eq('id', groupId).then();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myGroup?.score, myGroup?.stats, myGroup?.badges, groupId]);

  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setTimeout(() => setCooldownTime(c => c - 50), 50);
      return () => clearTimeout(timer);
    }
  }, [cooldownTime]);





  const buyItem = async (item: typeof SHOP_ITEMS[0]) => {
    if (!myGroup || !groupId) return;
    const currentScore = myGroup.score;
    const actualCost = gameRoom?.flash_sale && item.id !== 'allin' ? Math.floor(item.cost / 2) : item.cost;

    const trackPurchase = async () => {
      const currentStats = myGroup.stats || {};
      const newStats = { ...currentStats, items_bought: (currentStats.items_bought || 0) + 1 };
      await supabase.from('room_groups').update({ stats: newStats }).eq('id', groupId);
    };
    
    if (item.id === 'allin') {
      if (currentScore <= 0) return alert('걸 점수가 없습니다!');
      if (!window.confirm(`정말 ${currentScore}점을 모두 걸고 올인하시겠습니까?`)) return;
      
      enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: -currentScore }, timestamp: Date.now() });
      trackPurchase();

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
      if (currentScore < actualCost) return alert('점수가 부족합니다!');
      if (hasBuff) return alert('이미 버프가 적용 중입니다!');
      if(window.confirm(`${actualCost}점을 소모하여 [${item.name}]을(를) 구매하시겠습니까?`)) {
        await supabase.rpc('buy_buff', { row_id: groupId });
        if (gameRoom?.flash_sale) {
          enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: item.cost - actualCost }, timestamp: Date.now() });
        }
        playBeep();
        trackPurchase();
      }
      return;
    }

    if (currentScore < actualCost) return alert('점수가 부족합니다!');
    if (!window.confirm(`${actualCost}점을 소모하여 [${item.name}]을(를) 구매하시겠습니까?`)) return;

    enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: -actualCost }, timestamp: Date.now() });
    playBeep();
    trackPurchase();

    if (item.id === 'drone') {
      setHasDrone(true); localStorage.setItem(`has_drone_${roomId}_${groupId}`, 'true');
    } else if (item.id === 'cooldown') {
      setHasCooldown(true); localStorage.setItem(`has_cooldown_${roomId}_${groupId}`, 'true');
    } else if (item.id === 'bonus') {
      setHasBonus(true); localStorage.setItem(`has_bonus_${roomId}_${groupId}`, 'true');
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
    } else if (item.id === 'blind') {
      const highest = scores.reduce((prev, curr) => prev.score > curr.score ? prev : curr);
      if (highest.id === groupId) {
        enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 200 }, timestamp: Date.now() });
        return alert('우리 조가 이미 1등입니다! 공격할 대상이 없습니다.');
      }
      const blindedUntil = new Date(Date.now() + 15000).toISOString();
      await supabase.from('room_groups').update({ is_blinded_until: blindedUntil }).eq('id', highest.id);
      alert('성공! 1등 조의 화면에 먹물을 뿌렸습니다!');
    } else if (item.id === 'tsunami') {
      const highest = scores.reduce((prev, curr) => prev.score > curr.score ? prev : curr);
      if (highest.id === groupId) {
        return alert('우리 조가 이미 1등입니다! 해킹 대상을 찾을 수 없습니다.');
      }
      const { error } = await supabase.rpc('attack_group', {
        attacker_id: groupId,
        target_id: highest.id,
        cost: actualCost
      });
      if (error) {
        alert('공격 실패: ' + error.message);
      } else {
        alert('성공! 1등 조의 화면을 해킹하여 잠금 상태로 만들었습니다!');
        trackPurchase();
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
        clearInterval(holdInterval.current as number);
        holdInterval.current = null;
      }
    }
  }, [isBossMode]);

  useEffect(() => {
    if (gameRoom?.status === 'tsunami') {
      if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
    }
  }, [gameRoom?.status]);

  if (!groupId || !myGroup || !template) return <div className="min-h-screen bg-slate-50 text-slate-900 flex justify-center items-center">데이터를 불러오는 중...</div>;

  if (gameRoom?.status === 'finished') {
    // Sort scores to find rank
    const sortedScores = [...scores].sort((a, b) => b.score - a.score);
    const myRank = sortedScores.findIndex(s => s.id === groupId) + 1;
    const isMVP = myRank === 1;

    return (
      <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/20 via-transparent to-transparent animate-[pulse_3s_ease-in-out_infinite]"></div>
        
        {isMVP ? (
          <LucideIcons.Crown className="w-32 h-32 text-yellow-400 mb-4 animate-bounce relative z-10 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
        ) : (
          <LucideIcons.Medal className="w-24 h-24 text-slate-400 mb-4 relative z-10" />
        )}
        
        <h1 className="text-4xl font-black mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 relative z-10">게임 종료!</h1>
        <p className="text-xl font-bold mb-8 text-slate-300 relative z-10">최종 순위: {myRank}위</p>
        
        <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/20 w-full max-w-md shadow-2xl flex flex-col items-center relative z-10">
          <span className="text-slate-400 font-bold mb-1">우리 모둠 최종 점수</span>
          <span className="text-6xl font-black font-mono text-yellow-400 mb-6">{myGroup.score}점</span>
          
          {myGroup.badges && myGroup.badges.length > 0 ? (
            <div className="w-full">
              <span className="text-sm font-bold text-slate-400 mb-3 block text-center border-t border-white/10 pt-4">획득한 업적 배지</span>
              <div className="flex gap-2 flex-wrap justify-center">
                {myGroup.badges.includes('rich') && <span className="px-3 py-1.5 bg-yellow-500/20 text-yellow-300 rounded-full font-bold border border-yellow-500/30 text-sm flex items-center gap-1 shadow-inner"><LucideIcons.Coins className="w-4 h-4"/> 만수르</span>}
                {myGroup.badges.includes('shopaholic') && <span className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-full font-bold border border-purple-500/30 text-sm flex items-center gap-1 shadow-inner"><LucideIcons.ShoppingCart className="w-4 h-4"/> 쇼핑 중독</span>}
                {myGroup.badges.includes('bingo') && <span className="px-3 py-1.5 bg-orange-500/20 text-orange-300 rounded-full font-bold border border-orange-500/30 text-sm flex items-center gap-1 shadow-inner"><LucideIcons.Grid className="w-4 h-4"/> 빙고 마스터</span>}
              </div>
            </div>
          ) : (
            <div className="w-full text-center border-t border-white/10 pt-4">
              <span className="text-sm font-bold text-slate-500 block">획득한 배지가 없습니다.</span>
            </div>
          )}
        </div>
        <button onClick={() => navigate('/')} className="mt-8 px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-white font-bold text-lg transition-colors border border-slate-700 relative z-10 shadow-xl">처음으로 돌아가기</button>
      </div>
    );
  }

  const startHold = async (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (isLocked || holdProgress >= 100 || holdInterval.current) return;
    
    if (navigator.vibrate) navigator.vibrate(50);
    playBeep();

    if (channelRef.current) {
      await channelRef.current.track({ deviceId, joined_at: joinTimeRef.current, pressingDefuse: true });
    }

    holdInterval.current = setInterval(() => {
      // 다중 홀드 체크 (접속한 모든 인원이 누르고 있어야 진행, 혼자일 때는 혼자서 가능)
      if (activeDevicesCount > 1 && activeDefuseCountRef.current < activeDevicesCount) {
        return; // 팀원이 모두 누르지 않으면 게이지 멈춤
      }

      setHoldProgress(p => {
        if(p >= 100) {
          clearInterval(holdInterval.current as number);
          holdInterval.current = null;
          enqueueAction({
            id: Math.random().toString(),
            type: 'INCREMENT_SCORE',
            payload: { id: groupId, amount: 2000 },
            timestamp: Date.now()
          });
          supabase.from('room_groups').update({ is_defused: true }).eq('id', groupId).then();
          playVictory();
          if (channelRef.current) channelRef.current.track({ deviceId, joined_at: joinTimeRef.current, pressingDefuse: false });
          return 100;
        }
        return p + 2; 
      });
    }, 100);
  };

  const stopHold = async () => {
    if (holdInterval.current) {
      clearInterval(holdInterval.current);
      holdInterval.current = null;
    }
    if(holdProgress < 100) setHoldProgress(0);
    if (channelRef.current) {
      await channelRef.current.track({ deviceId, joined_at: joinTimeRef.current, pressingDefuse: false });
    }
  };

  if (gameRoom?.active_minigame) {
    const quiz = gameRoom.active_minigame;
    return (
      <div className="min-h-[100dvh] bg-indigo-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none">
        <div className="absolute inset-0 bg-indigo-600/20 animate-pulse mix-blend-screen"></div>
        <LucideIcons.Gamepad2 className="w-24 h-24 text-indigo-400 mb-6 animate-bounce relative z-10" />
        <h1 className="text-4xl font-black text-white mb-2 text-center relative z-10">돌발 체육 퀴즈!</h1>
        <p className="text-indigo-300 font-bold mb-8 text-center relative z-10">가장 먼저 맞추는 조가 {quiz.reward}점을 차지합니다!</p>
        
        <div className="bg-white/10 backdrop-blur border border-white/20 p-6 rounded-2xl w-full max-w-md relative z-10 mb-6 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6 text-center leading-relaxed">{quiz.question}</h2>
          <div className="flex flex-col gap-3">
            {quiz.options.map((opt: string, idx: number) => (
              <button 
                key={idx}
                onClick={async () => {
                  if (idx === quiz.answer) {
                    enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: quiz.reward }, timestamp: Date.now() });
                    await supabase.from('game_rooms').update({ active_minigame: null }).eq('id', gameRoom.id);
                    playVictory();
                    alert(`🎉 정답입니다! ${quiz.reward}점 획득!`);
                  } else {
                    alert('❌ 오답입니다! 다른 조에게 기회가 넘어갑니다.');
                  }
                }}
                className="w-full p-4 bg-white/5 hover:bg-white/20 border border-white/20 rounded-xl text-white font-bold text-lg text-left transition-colors"
              >
                {idx + 1}. {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

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

  const isBlinded = myGroup.is_blinded_until ? new Date(myGroup.is_blinded_until).getTime() > Date.now() : false;
  if (isBlinded) {
    return (
      <div className="min-h-[100dvh] bg-stone-950 flex flex-col items-center justify-center p-6 relative overflow-hidden pointer-events-none z-[9999]">
        <LucideIcons.EyeOff className="w-32 h-32 text-stone-800 mb-8 animate-pulse" />
        <h1 className="text-5xl font-black text-stone-600 mb-4 text-center">먹물 공격!</h1>
        <p className="text-stone-500 font-bold mt-4 text-lg">잠시 후 시야가 회복됩니다...</p>
      </div>
    );
  }



  const displayScore = myGroup.score;

  if (myGroup.is_hacked) {
    return (
      <div className="min-h-[100dvh] bg-red-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-red-100/50 mix-blend-multiply animate-[pulse_0.1s_ease-in-out_infinite]"></div>
        <LucideIcons.AlertTriangle className="w-32 h-32 text-red-600 mb-8 animate-ping relative z-10" />
        <h1 className="text-5xl font-black text-red-600 mb-4 text-center relative z-10 glitch-text">시스템 해킹됨!</h1>
        <p className="text-slate-800 text-lg font-bold mb-8 text-center relative z-10">교사에게 즉시 보고하여<br/>통신망을 복구하세요!</p>
        
        <div className="relative z-10 bg-white/90 p-5 rounded-2xl border border-red-200 shadow-xl flex flex-col items-center">
          <LucideIcons.ShieldAlert className="w-12 h-12 text-emerald-500 mb-3" />
          <p className="text-sm text-slate-600 mb-4 text-center">또는 백신을 구매하여<br/>즉시 해킹을 무효화할 수 있습니다.</p>
          <button onClick={buyVaccine} disabled={displayScore < 50} className={`w-full py-4 rounded-xl font-black text-lg ${displayScore >= 50 ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
            백신 구매 (50점)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-[100dvh] ${gameRoom?.status === 'tsunami' ? 'bg-blue-100' : 'bg-slate-50'} text-slate-900 flex flex-col relative overflow-hidden select-none`}>
      {gameRoom?.announcement && (
        <div className="w-full z-50 bg-cyan-600 text-white font-bold py-2 px-4 shadow-md flex items-center justify-center gap-2">
          <span>📢</span>
          <span>{gameRoom.announcement}</span>
        </div>
      )}
      {gameRoom?.status === 'defense' && (
        <div className="w-full z-40 bg-orange-600 text-white font-black py-2 px-4 shadow-md flex items-center justify-center gap-2 animate-pulse">
          <LucideIcons.ShieldAlert className="w-5 h-5" />
          <span>진지 방어전 발동! (2초마다 -5점씩 차감 중)</span>
        </div>
      )}
      {isComebackActive && (
        <div className="w-full z-40 bg-orange-500 text-white font-black py-2 px-4 shadow-md flex items-center justify-center gap-2 animate-pulse">
          <LucideIcons.Flame className="w-5 h-5" />
          <span>역전 찬스 발동 중! (모든 획득 점수 2배)</span>
        </div>
      )}
      {clicks.map(c => (
        <div key={c.id} className="absolute z-50 animate-float font-black text-4xl text-cyan-600 drop-shadow-[0_0_10px_rgba(255,255,255,1)]" style={{ left: c.x, top: c.y }}>
          {c.val > 0 ? `+${c.val}` : c.val}
        </div>
      ))}

      {gameRoom?.status === 'boss_raid' && (
        <div 
          className="absolute inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 touch-none"
          onTouchStart={(e) => {
            if (globalChannelRef.current) {
              globalChannelRef.current.send({ type: 'broadcast', event: 'boss_damage', payload: { amount: 1 } });
            }
            const x = e.touches[0].clientX; const y = e.touches[0].clientY;
            const clickId = Date.now() + Math.random();
            setClicks(prev => [...prev, { id: clickId, x, y, val: -1 }]);
            setTimeout(() => { setClicks(prev => prev.filter(c => c.id !== clickId)); }, 800);
            if (navigator.vibrate) navigator.vibrate(20);
          }}
          onMouseDown={(e) => {
            if (globalChannelRef.current) {
              globalChannelRef.current.send({ type: 'broadcast', event: 'boss_damage', payload: { amount: 1 } });
            }
            const x = e.clientX; const y = e.clientY;
            const clickId = Date.now() + Math.random();
            setClicks(prev => [...prev, { id: clickId, x, y, val: -1 }]);
            setTimeout(() => { setClicks(prev => prev.filter(c => c.id !== clickId)); }, 800);
          }}
        >
          <LucideIcons.Swords className="w-32 h-32 text-red-500 mb-8 animate-bounce" />
          <h1 className="text-4xl font-black text-white mb-2">보스 레이드 발동!</h1>
          <p className="text-red-300 font-bold mb-10 text-center">전체 조가 협력하여 보스를 물리치세요!<br/>화면을 미친듯이 탭하세요!</p>
          
          <div className="w-full bg-slate-800 rounded-full h-8 border-2 border-slate-700 overflow-hidden relative">
            <div 
              className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
              style={{ width: `${Math.max(0, ((gameRoom.boss_hp || 0) / (gameRoom.boss_max_hp || 1)) * 100)}%` }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center text-white font-black text-sm text-shadow">
              {gameRoom.boss_hp?.toLocaleString()} / {gameRoom.boss_max_hp?.toLocaleString()}
            </div>
          </div>
          
          <p className="text-slate-500 text-sm mt-8 animate-pulse">마구마구 터치하세요!</p>
        </div>
      )}

      {gameRoom?.status === 'tsunami' && (
        <div className="absolute inset-0 bg-blue-500/10 animate-pulse z-0 pointer-events-none"></div>
      )}
      
      <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border bg-white/80 backdrop-blur-sm border-slate-200 text-slate-700 shadow-sm">
          <LucideIcons.Clock className="w-4 h-4" /> <span className="font-mono">{mins}:{secs}</span>
        </div>
        {!isOnline && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border bg-orange-100/90 backdrop-blur-sm border-orange-300 text-orange-800 shadow-sm animate-pulse">
            <LucideIcons.WifiOff className="w-4 h-4" /> <span>오프라인 ({queueLength}개 대기 중)</span>
          </div>
        )}
        {isOnline && isSyncing && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border bg-cyan-100/90 backdrop-blur-sm border-cyan-300 text-cyan-800 shadow-sm">
            <LucideIcons.RefreshCw className="w-4 h-4 animate-spin" /> <span>동기화 중...</span>
          </div>
        )}
      </div>

      {!isZombie && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border bg-white/80 backdrop-blur-sm border-emerald-200 text-emerald-700 pointer-events-none shadow-sm">
          <LucideIcons.Fingerprint className="w-4 h-4" /> <span className="font-mono">코드: {mySurvivorCode}</span>
        </div>
      )}

      <div className="flex-1 p-4 flex flex-col z-10 mt-12 overflow-y-auto">
        {isZombie && (
          <div className="shrink-0 bg-emerald-900 text-white p-4 mb-4 rounded-2xl border border-emerald-500 shadow-lg shadow-emerald-900/50 animate-pulse relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
            <h3 className="font-black text-xl flex items-center gap-2 mb-2 relative z-10"><LucideIcons.Ghost className="text-emerald-400" /> 좀비 모드 활성화!</h3>
            <p className="text-xs text-emerald-200 mb-3 relative z-10">생존자 조의 4자리 코드를 입력하여 바이러스를 전파하세요! (성공시 +500점)</p>
            <div className="flex gap-2 relative z-10">
              <input 
                type="text" 
                maxLength={4}
                placeholder="생존자 코드 (4자리)" 
                className="flex-1 bg-black/50 border border-emerald-700 text-emerald-400 font-bold px-3 py-2 rounded-xl text-center uppercase focus:outline-none focus:border-emerald-400"
                onChange={(e) => setInfectCode(e.target.value.toUpperCase())}
                value={infectCode}
              />
              <button onClick={handleInfect} className="bg-emerald-600 hover:bg-emerald-500 font-black px-5 rounded-xl active:scale-95 transition-all shadow-md">감염</button>
            </div>
          </div>
        )}

        <div className={`shrink-0 bg-white border border-slate-200 rounded-3xl p-5 mb-4 flex flex-col items-center shadow-xl relative overflow-hidden transition-all ${isZombie ? 'opacity-80' : ''}`}>
          {hasBuff && <div className="absolute inset-0 bg-yellow-100 animate-pulse"></div>}
          <span className="text-slate-500 font-bold tracking-widest text-sm mb-1 relative z-10">
            현재 에너지 충전율 {hasBuff && <span className="text-yellow-600 ml-2">X2 버프 중!</span>}
          </span>
          <span className={`text-7xl font-black font-mono transition-transform text-slate-900 relative z-10`}>
            {displayScore}
          </span>
          
          <div className="flex gap-2 mt-3 relative z-10">
            {hasDrone && <span className="px-2 py-1 bg-cyan-50 text-cyan-600 border border-cyan-200 rounded text-xs font-bold">드론 가동중</span>}
            {hasCooldown && <span className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs font-bold">쿨다운 단축</span>}
            {hasBonus && <span className="px-2 py-1 bg-pink-50 text-pink-600 border border-pink-200 rounded text-xs font-bold">보너스 요정</span>}
          </div>
        </div>

        <div className="shrink-0 flex gap-2 mb-4">
          <button onClick={() => setActiveTab('mission')} className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all ${activeTab === 'mission' ? 'bg-cyan-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500'}`}>
            <LucideIcons.Shield className="w-5 h-5" /> 미션
          </button>
          <button onClick={() => setActiveTab('bingo')} className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all ${activeTab === 'bingo' ? 'bg-orange-500 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500'}`}>
            <LucideIcons.Grid className="w-5 h-5" /> 빙고
          </button>
          <button onClick={() => setActiveTab('shop')} className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all ${activeTab === 'shop' ? 'bg-purple-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500'}`}>
            <LucideIcons.ShoppingCart className="w-5 h-5" /> 상점
          </button>
        </div>

        <div className="flex-1 flex flex-col relative min-h-0">
          {showScanner && (
            <div className="absolute inset-0 z-50 bg-black flex flex-col rounded-3xl overflow-hidden">
              <div className="flex justify-between items-center p-4 bg-slate-900">
                <span className="text-white font-bold">QR 미션 스캐너</span>
                <button onClick={() => setShowScanner(false)} className="text-white bg-slate-700 px-3 py-1 rounded font-bold text-sm">닫기</button>
              </div>
              <div id="reader" className="flex-1 w-full bg-black" style={{ minHeight: '300px' }}></div>
            </div>
          )}
          {isLocked && !myGroup.is_hacked && (
            <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center border border-slate-200 shadow-sm">
              <LucideIcons.Lock className="w-10 h-10 text-slate-400 mb-2" />
              <p className="text-red-500 font-bold text-center text-lg">
                {gameRoom?.status === 'tsunami' ? '해일 대피 중! 미션 중단!' : '미션 진행 상태가 아닙니다'}
              </p>
            </div>
          )}

          {activeTab === 'mission' ? (
            isBossMode ? (
              <div 
                className="w-full h-full relative bg-white border-2 border-red-300 shadow-xl rounded-3xl flex flex-col items-center justify-center overflow-hidden touch-none"
                onTouchStart={startHold} onTouchEnd={stopHold} onMouseDown={startHold} onMouseUp={stopHold} onMouseLeave={stopHold}
              >
                <div className="absolute bottom-0 left-0 right-0 bg-red-100 transition-all duration-100 ease-linear" style={{ height: `${holdProgress}%` }}></div>
                <LucideIcons.Fingerprint className={`w-32 h-32 mb-6 z-10 ${holdProgress > 0 ? 'text-red-500 animate-ping' : 'text-slate-300'}`} />
                <p className="z-10 font-black text-3xl text-slate-900 mb-2">최종 해체 모드</p>
                <p className="z-10 text-lg text-slate-500 font-bold">조원 전원이 손을 대고 5초간 꾹 누르세요!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 overflow-y-auto pb-4 custom-scrollbar pr-2 h-full">
                <button
                  onClick={() => setShowScanner(true)}
                  disabled={isLocked || cooldown}
                  className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 mb-1 active:scale-95 transition-transform shadow-md"
                >
                  <LucideIcons.Camera className="w-5 h-5" /> QR 코드 미션 스캔 카메라 열기
                </button>
                {isSpy && gameRoom?.status === 'mafia' && (
                  <div className="w-full bg-red-900 text-red-100 p-4 rounded-2xl shadow-md border border-red-500 mb-2 animate-pulse">
                    <h3 className="font-black text-xl flex items-center gap-2 mb-1"><LucideIcons.UserX className="w-6 h-6" /> 당신은 스파이입니다!</h3>
                    <p className="text-sm">조원들 몰래 방해 공작을 수행하세요. 일반 미션 버튼을 누르면 점수가 깎입니다!</p>
                  </div>
                )}
                {template.buttons.filter((m: import('../domain/types').MissionButton) => {
                  if (m.isHidden) return false;
                  if (m.prerequisiteMissionId && !myGroup?.completed_missions?.includes(m.prerequisiteMissionId)) return false;
                  return true;
                }).map((m: import('../domain/types').MissionButton, i: number) => {
                  const IconComp = (LucideIcons as unknown as Record<string, React.ElementType>)[m.iconName] || LucideIcons.Activity;
                  const isPending = myGroup?.pending_missions?.includes(m.id);
                  return (
                    <button 
                      key={m.id || i}
                      onTouchStart={(e) => handleMissionComplete(m, e)}
                      onMouseDown={(e) => handleMissionComplete(m, e)}
                      disabled={isLocked || cooldown || isPending} 
                      className={`w-full shrink-0 relative group p-4 border rounded-2xl flex items-center justify-between transition-transform active:scale-95 touch-none bg-white shadow-sm hover:shadow-md ${m.bg}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-full bg-white flex items-center justify-center border border-slate-100 shadow-sm ${m.color}`}>
                          {isPending ? <LucideIcons.Clock className="w-8 h-8 text-yellow-500 animate-pulse" /> : <IconComp className="w-8 h-8" />}
                        </div>
                        <div className="text-left flex flex-col justify-center">
                          <div className={`font-black text-xl flex items-center gap-2 ${m.color}`}>
                            {m.title}
                            {m.requires_approval && !isPending && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full border border-red-200">승인필요</span>}
                            {isPending && <span className="text-[10px] bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded-full border border-yellow-200">대기 중</span>}
                          </div>
                          <div className="text-sm text-slate-500 font-bold mt-0.5">{m.desc}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`font-black text-3xl ${m.color}`}>+{m.amount}</span>
                        <span className="text-xs text-slate-400 font-bold mt-1">대기 {m.cooldown}초</span>
                      </div>

                      {cooldown && (
                        <div className="absolute inset-0 bg-white/70 rounded-2xl overflow-hidden backdrop-blur-sm z-10">
                          <div className="absolute bottom-0 left-0 h-1 bg-slate-400 transition-all duration-50 ease-linear" style={{ width: `${(cooldownTime / maxCooldownTime) * 100}%` }}></div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          ) : activeTab === 'bingo' ? (
            <div className="flex flex-col gap-2 h-full pb-4">
              <div className="bg-orange-100 border border-orange-200 rounded-xl p-3 mb-2 flex justify-between items-center">
                <span className="text-orange-800 font-bold text-sm">3x3 빙고 보드! 가로, 세로, 대각선 완성 시 보너스 1000점!</span>
                <span className="text-xs bg-orange-200 text-orange-900 px-2 py-1 rounded-full font-black">현재 {activeDevicesCount}명 접속 중</span>
              </div>
              <div className="grid grid-cols-3 gap-2 flex-1">
                {template?.buttons?.slice(0, 9).map((m: import('../domain/types').MissionButton, i: number) => {
                  const isCompleted = myGroup?.completed_missions?.includes(m.id);
                  const IconComp = (LucideIcons as unknown as Record<string, React.ElementType>)[m.iconName] || LucideIcons.Activity;
                  const isCoopTile = i === 4; // 정중앙은 협동 타일
                  
                  return (
                    <button
                      key={m.id}
                      disabled={isCompleted || isLocked}
                      onClick={() => {
                        if (!isCoopTile || activeDevicesCount <= 1) {
                          handleBingoComplete(m.id, m.amount, isCoopTile);
                        }
                      }}
                      onTouchStart={() => isCoopTile && activeDevicesCount > 1 && handleCoopTouchStart(m.id)}
                      onTouchEnd={() => isCoopTile && activeDevicesCount > 1 && handleCoopTouchEnd()}
                      onMouseDown={() => isCoopTile && activeDevicesCount > 1 && handleCoopTouchStart(m.id)}
                      onMouseUp={() => isCoopTile && activeDevicesCount > 1 && handleCoopTouchEnd()}
                      className={`relative flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-transform active:scale-95 ${isCompleted ? 'bg-slate-200 border-slate-300 opacity-50' : m.bg + ' border-transparent shadow-sm'}`}
                    >
                      {isCoopTile && !isCompleted && (
                        <span className="absolute top-2 right-2 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                      )}
                      <IconComp className={`w-8 h-8 mb-2 ${isCompleted ? 'text-slate-400' : m.color}`} />
                      <span className={`text-[10px] font-bold text-center leading-tight ${isCompleted ? 'text-slate-500' : m.color}`}>{m.title}</span>
                      {isCompleted && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <LucideIcons.CheckCircle className="w-16 h-16 text-emerald-500 drop-shadow-lg" />
                        </div>
                      )}
                      {isCoopTile && !isCompleted && (
                        <div className="absolute bottom-1 w-full text-center text-[9px] font-black text-red-500">협동!</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto pb-4 custom-scrollbar pr-2 h-full">
              {gameRoom?.flash_sale && (
                <div className="bg-yellow-50 border-2 border-yellow-400 p-3 rounded-2xl animate-pulse shadow-sm flex items-center justify-center gap-2">
                  <LucideIcons.Zap className="w-5 h-5 text-yellow-600" />
                  <span className="font-black text-yellow-800">플래시 세일! 전 품목 50% 할인 중!</span>
                </div>
              )}
              {SHOP_ITEMS.map((item) => {
                const actualCost = gameRoom?.flash_sale && item.id !== 'allin' ? Math.floor(item.cost / 2) : item.cost;
                return (
                  <div key={item.id} className={`p-4 bg-white border rounded-2xl flex justify-between items-center shrink-0 shadow-sm ${item.bg}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center border border-slate-100 shadow-sm ${item.color}`}>
                        <item.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className={`font-black text-lg flex items-center gap-2 ${item.color}`}>
                          {item.name}
                          {gameRoom?.flash_sale && item.id !== 'allin' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full whitespace-nowrap">SALE</span>}
                        </p>
                        <p className="text-xs text-slate-500 font-bold break-keep pr-2">{item.desc}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => buyItem(item)} 
                      disabled={displayScore < actualCost || (item.id === 'double' && hasBuff)} 
                      className={`shrink-0 px-4 py-3 rounded-xl font-black text-base transition-transform active:scale-95 flex flex-col items-center justify-center ${displayScore >= actualCost ? 'bg-purple-600 text-white shadow-md hover:bg-purple-500' : 'bg-slate-100 text-slate-400'}`}
                    >
                      {item.id === 'allin' ? '전부' : (
                        <>
                          {gameRoom?.flash_sale && <span className="text-[10px] line-through opacity-70 leading-none">{item.cost}</span>}
                          <span className="leading-none">{actualCost}점</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
