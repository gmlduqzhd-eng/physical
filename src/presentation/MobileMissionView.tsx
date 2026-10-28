import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, CircleHelp, MonitorSmartphone, Sun } from 'lucide-react';
import { HeaderToolbar } from './components/HeaderToolbar';
import { useGameLogic } from '../application/useGameLogic';
import { useGameTimer } from '../application/useGameTimer';
import { useSyncQueue } from '../application/useSyncQueue';
import { useAudio } from '../application/useAudio';
import { useOutdoorMode } from '../application/useOutdoorMode';
import { useWakeLock } from '../application/useWakeLock';
import { GameIcons as LucideIcons } from './icons';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { MiniGameOverlay } from './components/minigames/MiniGameOverlay';
import { WaitingScreen } from './components/WaitingScreen';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../data/supabase';
import { resolveGuidedGameType } from '../domain/guidedMission';
import { useGuidedSubmission } from '../application/useGuidedSubmission';
import { GUIDED_REFLECTIONS } from '../domain/guidedReflection';
import { readStorage, writeStorage, removeStorage } from '../application/browserStorage';
import { sfxWhistle } from '../application/soundEffects';
import './MobileMissionView.css';

function StudentRoomHeader() {
  return <header className="student-classroom-header"><HeaderToolbar><Link className="icon-toolbar-action" to="/lobby" title="학생 입장으로"><ArrowLeft aria-hidden="true"/><span>학생 입장으로</span></Link><Link className="icon-toolbar-action" to="/manual" title="이용 안내"><CircleHelp aria-hidden="true"/><span>이용 안내</span></Link></HeaderToolbar></header>;
}

const SHOP_ITEMS = [
  { id: 'double', name: '점수 2배 물약', cost: 200, desc: '1분간 원정대 미션 점수가 2배가 됩니다.', icon: LucideIcons.Zap, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  { id: 'cooldown', name: '쿨다운 감소 포션', cost: 150, desc: '모든 미션의 대기 시간이 50% 줄어듭니다! (영구)', icon: LucideIcons.Clock, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { id: 'bonus', name: '보너스 요정', cost: 150, desc: '미션을 완료할 때마다 +10점의 보너스가 추가됩니다! (영구)', icon: LucideIcons.Gift, color: 'text-pink-600', bg: 'bg-pink-50 border-pink-200' },
  { id: 'donate', name: '기부 천사', cost: 100, desc: '현재 꼴등 조에게 200점을 응원 선물로 보냅니다! (나는 100점 소모)', icon: LucideIcons.HeartHandshake, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  { id: 'steal', name: '도둑 고양이', cost: 150, desc: '현재 1등 조의 점수를 100점 가져옵니다!', icon: LucideIcons.Ghost, color: 'text-slate-600', bg: 'bg-slate-100 border-slate-300' },
  { id: 'time', name: '시간술사의 시계', cost: 200, desc: '학급 전체의 게임 남은 시간을 30초 늘려줍니다!', icon: LucideIcons.Clock, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
  { id: 'blind', name: '먹물 공격', cost: 200, desc: '현재 1등 조의 화면을 15초간 시커멓게 가립니다!', icon: LucideIcons.EyeOff, color: 'text-stone-600', bg: 'bg-stone-100 border-stone-300' },
  { id: 'tsunami', name: '해킹 스크립트', cost: 300, desc: '가장 점수가 높은 조의 미션 화면을 일시 잠금 상태로 만듭니다!', icon: LucideIcons.TerminalSquare, color: 'text-red-700', bg: 'bg-red-100 border-red-300' }
];

export const MobileMissionView = () => {
  const { roomId, groupId } = useParams<{ roomId: string, groupId: string }>();
  const navigate = useNavigate();
  const { scores, gameRoom, template, loading: roomLoading, error: roomError, refresh: refreshRoom } = useGameLogic(roomId);
  const guidedEntry = template && Array.isArray(template.buttons) ? template.buttons.map(mission => ({ mission, gameType: resolveGuidedGameType(gameRoom?.name, template.name, template.buttons, mission.id) })).find(entry => entry.gameType) : undefined;
  const guidedSubmission = useGuidedSubmission(guidedEntry ? roomId ?? null : null, guidedEntry ? groupId ?? null : null, guidedEntry?.mission.id ?? null);
  const { isTimeUp, mins, secs } = useGameTimer(gameRoom);
  const { enqueueAction, isOnline, queueLength, isSyncing, storageAvailable, syncWarning } = useSyncQueue();
  const { playBeep, playVictory } = useAudio();
  const { isOutdoorMode, toggleOutdoorMode } = useOutdoorMode();
  const { isActive: isWakeLockActive } = useWakeLock(true);
  const [isStandMode, setIsStandMode] = useState(() => readStorage('physical_stand_mode') === 'true');
  const [studentName] = useState(() => readStorage('physical_student_name') || '');
  const [showFlash, setShowFlash] = useState(false);
  const [helpBusy, setHelpBusy] = useState(false);
  const [helpError, setHelpError] = useState('');

  const isWhistleActive = gameRoom?.announcement === 'WHISTLE';
  const toggleHelp = async (requesting: boolean) => {
    if (!groupId || helpBusy) return;
    setHelpBusy(true); setHelpError('');
    try {
      const result = await supabase.rpc('set_classroom_help', { row_id: groupId, requesting });
      if (result.error || result.data !== true) throw Error('도움 요청을 전달하지 못했어요. 연결을 확인하고 다시 눌러 주세요.');
      refreshRoom();
    } catch (cause) { setHelpError(cause instanceof Error ? cause.message : '도움 요청에 실패했어요.'); }
    finally { setHelpBusy(false); }
  };
  const whistlePlayedRef = useRef(false);

  useEffect(() => {
    if (isWhistleActive && !whistlePlayedRef.current) {
      sfxWhistle();
      try { 
        navigator?.vibrate?.([300, 100, 300, 100, 600]); 
      } catch { /* ignore */ }
      whistlePlayedRef.current = true;
    } else if (!isWhistleActive) {
      whistlePlayedRef.current = false;
    }
  }, [isWhistleActive]);

  const toggleStandMode = () => {
    setIsStandMode(prev => {
      const next = !prev;
      writeStorage('physical_stand_mode', String(next));
      return next;
    });
  };

  const [combo, setCombo] = useState(0);
  const [lastMissionTime, setLastMissionTime] = useState(0);

  const [cooldownTime, setCooldownTime] = useState(0);
  const cooldown = cooldownTime > 0;
  const [maxCooldownTime, setMaxCooldownTime] = useState(1);
  const [activeTab, setActiveTab] = useState<'mission' | 'shop'>('mission');
  const [clicks, setClicks] = useState<{id: number, x:number, y:number, val:number}[]>([]);

  const [hasCooldown, setHasCooldown] = useState(() => readStorage(`has_cooldown_${roomId}_${groupId}`) === 'true');
  const [hasBonus, setHasBonus] = useState(() => readStorage(`has_bonus_${roomId}_${groupId}`) === 'true');
  
  const myGroup = scores.find(s => s.id === groupId);

  const [deviceId] = useState(() => Math.random().toString(36).substring(2));
  const joinTimeRef = useRef(Date.now());

  const activeStatuses = ['playing', 'boss_raid', 'time_attack', 'defense', 'mafia'];
  const isLocked = isTimeUp || !activeStatuses.includes(gameRoom?.status || '') || myGroup?.is_hacked || (Boolean(roomError) && isOnline) || isWhistleActive;
  const hasBuff = myGroup?.item_buff_until ? new Date(myGroup.item_buff_until).getTime() > Date.now() : false;

  const highestScore = scores.length > 0 ? Math.max(...scores.map(s => s.score)) : 0;
  const isLowest = scores.length > 1 && myGroup && scores.every(s => myGroup.score <= s.score);
  const isComebackActive = isLowest && (highestScore - (myGroup?.score || 0) >= 500);

  const isSpy = myGroup?.spy_device_id === deviceId;

  const pendingBossDamage = useRef(0);
  const bossDamageBatch = useRef<{ id: string; amount: number; retryAt: number } | null>(null);
  const bossDamageInFlight = useRef(false);
  const [bossSyncError, setBossSyncError] = useState<string | null>(null);
  useEffect(() => {
    if (gameRoom?.status !== 'boss_raid') {
      pendingBossDamage.current = 0; bossDamageBatch.current = null; setBossSyncError(null);
    }
  }, [roomId, gameRoom?.status]);
  useEffect(() => {
    if (!roomId || gameRoom?.status !== 'boss_raid' || isLocked) return;
    let active = true;
    const interval = window.setInterval(async () => {
      if (bossDamageInFlight.current || !navigator.onLine) return;
      if (!bossDamageBatch.current && pendingBossDamage.current > 0) {
        const amount = Math.min(1000000, pendingBossDamage.current);
        pendingBossDamage.current -= amount;
        bossDamageBatch.current = { id: crypto.randomUUID(), amount, retryAt: 0 };
      }
      const batch = bossDamageBatch.current;
      if (!batch || batch.retryAt > Date.now()) return;
      bossDamageInFlight.current = true;
      try {
        const result = await supabase.rpc('apply_classroom_boss_damage', { room_uuid: roomId, amount: batch.amount, action_id: batch.id });
        if (result.error) throw result.error;
        if (bossDamageBatch.current?.id === batch.id) bossDamageBatch.current = null;
        if (active) setBossSyncError(null);
      } catch {
        batch.retryAt = Date.now() + 2000;
        if (active) setBossSyncError('보스 공격을 저장하고 있습니다. 연결이 복구되면 다시 전송합니다.');
      } finally { bossDamageInFlight.current = false; }
    }, 250);
    return () => { active = false; window.clearInterval(interval); };
  }, [roomId, gameRoom?.status, isLocked]);

  const handleBossTap = (event: React.PointerEvent) => {
    event.preventDefault();
    if (isLocked) return;
    pendingBossDamage.current += 1;
    const clickId = Date.now() + Math.random();
    setClicks(previous => [...previous, { id: clickId, x: event.clientX, y: event.clientY, val: -1 }]);
    setTimeout(() => setClicks(previous => previous.filter(click => click.id !== clickId)), 800);
    navigator.vibrate?.(20);
  };

  const handleMissionComplete = async (mission: import('../domain/types').MissionButton, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!groupId || isLocked || cooldown) return;
    if (mission.prerequisiteMissionId && !myGroup?.completed_missions?.includes(mission.prerequisiteMissionId)) {
      alert('이전 단계 미션을 먼저 완료해야 합니다!');
      return;
    }

    if (navigator.vibrate) navigator.vibrate(50);
    playBeep();
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 400);
    const cdSecs = mission.cooldown ?? 5;
    const feverActive = hasBuff && gameRoom?.announcement?.startsWith('🔥 [FEVER TIME]');
    const finalCdSecs = feverActive ? 0 : hasCooldown ? cdSecs / 2 : cdSecs;
    setCooldownTime(finalCdSecs * 1000);
    setMaxCooldownTime(finalCdSecs * 1000);
    
    let actualAmount = hasBuff ? mission.amount * 2 : mission.amount;
    if (isComebackActive) actualAmount *= 2;
    if (hasBonus) actualAmount += 10;
    
    const now = Date.now();
    let currentCombo = combo;
    if (now - lastMissionTime < 8000) {
      currentCombo += 1;
      setCombo(currentCombo);
    } else {
      currentCombo = 1;
      setCombo(1);
    }
    setLastMissionTime(now);

    const comboBonus = currentCombo > 1 ? currentCombo * 10 : 0;
    actualAmount += comboBonus;

    if (isSpy && gameRoom?.status === 'mafia') {
      actualAmount = -Math.abs(actualAmount);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }

    let x = window.innerWidth / 2; let y = window.innerHeight / 2;
    if ('touches' in e && (e as React.TouchEvent).touches && (e as React.TouchEvent).touches.length > 0) {
      x = (e as React.TouchEvent).touches[0].clientX; y = (e as React.TouchEvent).touches[0].clientY;
    } else if ('clientX' in e) {
      x = (e as React.MouseEvent).clientX; y = (e as React.MouseEvent).clientY;
    }
    const clickId = Date.now() + Math.random();
    setClicks(prev => [...prev, { id: clickId, x, y, val: actualAmount }]);
    setTimeout(() => {
      setClicks(prev => prev.filter(c => c.id !== clickId));
    }, 800);

    if (gameRoom?.active_minigame?.type === 'bomb' && gameRoom.active_minigame.holderId === groupId) {
      const otherGroups = scores.filter(s => s.id !== groupId);
      if (otherGroups.length > 0) {
        const nextTarget = otherGroups[Math.floor(Math.random() * otherGroups.length)];
        const effect=await supabase.rpc('classroom_effect',{room_uuid:gameRoom.id,effect:'bomb_pass',target_uuid:nextTarget.id});
        if(effect.error || !effect.data) return;
        alert(`💣 폭탄을 [${nextTarget.group_name}] 조에게 넘겼습니다!`);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      }
    }

    if (gameRoom?.status === 'boss_raid' && gameRoom.boss_hp) {
      await supabase.rpc('damage_classroom_boss', { room_uuid: gameRoom.id, amount: Math.abs(actualAmount) });
      const dmgClickId = Date.now() + Math.random();
      setClicks(prev => [...prev, { id: dmgClickId, x: window.innerWidth/2, y: 100, val: -Math.abs(actualAmount) }]);
      setTimeout(() => setClicks(prev => prev.filter(c => c.id !== dmgClickId)), 800);
    }

    enqueueAction({
      id: crypto.randomUUID(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId as string, amount: actualAmount }, 
      timestamp: Date.now()
    });

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

  const handleTreasureFound = async (treasureId: string) => {
    if (isLocked || !groupId || !myGroup) return;
    const foundTreasures = (myGroup.stats?.found_treasures as string[]) || [];
    if (foundTreasures.includes(treasureId)) {
      alert('❌ 우리 조가 이미 획득한 보물입니다!');
      return;
    }

    const newStats = { ...myGroup.stats, found_treasures: [...foundTreasures, treasureId] };
    await supabase.from('room_groups').update({ stats: newStats }).eq('id', groupId);

    playVictory();
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 300]);

    if (treasureId === 'TREASURE_SCORE_500') {
      enqueueAction({ id: crypto.randomUUID(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 500 }, timestamp: Date.now() });
      alert('🎉 보물상자 발견! 500점 획득!');
    } else if (treasureId === 'TREASURE_SCORE_1000') {
      enqueueAction({ id: crypto.randomUUID(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 1000 }, timestamp: Date.now() });
      alert('🎉 대박 보물 발견! 1000점 획득!');
    } else if (treasureId === 'TREASURE_ITEM_DOUBLE') {
      const result = await supabase.from('room_groups').update({ item_buff_until: new Date(Date.now() + 60000).toISOString() }).eq('id', groupId);
      if (result.error) return alert('물약 저장에 실패했습니다. 다시 시도해주세요.');
      alert('🎉 점수 2배 물약 획득! 1분간 점수가 2배가 됩니다.');
    } else if (treasureId === 'TREASURE_ITEM_COOLDOWN') {
      setHasCooldown(true); writeStorage(`has_cooldown_${roomId}_${groupId}`, 'true');
      alert('🎉 쿨다운 감소 버프 획득!');
    } else if (treasureId === 'TREASURE_ITEM_BONUS') {
      setHasBonus(true); writeStorage(`has_bonus_${roomId}_${groupId}`, 'true');
      alert('🎉 보너스 요정 획득!');
    } else if (treasureId === 'TREASURE_BOMB_DEFUSE') {
      await supabase.from('room_groups').update({ is_hacked: false }).eq('id', groupId);
      alert('🎉 해킹 복구 킷 획득! 상태 이상이 회복되었습니다.');
    } else {
      alert('알 수 없는 보물입니다.');
    }
  };

  const handleTreasureFoundRef = useRef(handleTreasureFound);
  useEffect(() => { handleTreasureFoundRef.current = handleTreasureFound; });

  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (showScanner) {
      if (!document.getElementById('reader')) return;
      let handled = false;
      const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scanner.render(
        (decodedText) => {
          if (handled) return;
          handled = true;
          void scanner.clear().catch(() => {});
          setShowScanner(false);
          
          if (decodedText.startsWith('TREASURE_')) {
            setTimeout(() => handleTreasureFoundRef.current(decodedText), 100);
            return;
          }

          const mission = template?.buttons?.find((m: import('../domain/types').MissionButton) => m.id === decodedText);
          if (mission) {
             const fakeEvent = { preventDefault: () => {}, clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 };
             setTimeout(() => handleMissionCompleteRef.current(mission as import('../domain/types').MissionButton, fakeEvent as unknown as React.MouseEvent), 100);
          } else {
             alert('❌ 게임에 등록되지 않은 QR 코드입니다.');
          }
        },
        () => {}
      );
      return () => { scanner.clear().catch(()=>{}); };
    }
  }, [showScanner, template]);

  useEffect(() => {
    if (gameRoom && gameRoom.status === 'waiting') {
      removeStorage(`has_cooldown_${roomId}_${groupId}`);
      removeStorage(`has_bonus_${roomId}_${groupId}`);
      setHasCooldown(false);
      setHasBonus(false);
    }
  }, [gameRoom, gameRoom?.status, roomId, groupId]);

  const presenceContext = useRef({ gameRoom, scores });
  useEffect(() => { presenceContext.current = { gameRoom, scores }; }, [gameRoom, scores]);

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
      const deviceIds: string[] = [];

      for (const key of keys) {
        const presenceData = state[key][0] as Record<string, unknown>;
        if (presenceData?.deviceId) deviceIds.push(presenceData.deviceId as string);
      }

      deviceIds.sort();
      if (deviceIds[0] === myDeviceId && presenceContext.current.gameRoom?.status === 'mafia') {
        const myGroupNow = presenceContext.current.scores.find(group => group.id === groupId);
        if (myGroupNow && !myGroupNow.spy_device_id && deviceIds.length > 0) {
          const randomSpy = deviceIds[Math.floor(Math.random() * deviceIds.length)];
          supabase.from('room_groups').update({ spy_device_id: randomSpy }).eq('id', groupId).then();
        }
      }
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ deviceId: myDeviceId, joined_at: myJoinTime });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, groupId, deviceId]);

  useEffect(() => {
    const init = () => playBeep();
    window.addEventListener('touchstart', init, { once: true });
    return () => window.removeEventListener('touchstart', init);
  }, [playBeep]);

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
  }, [myGroup, groupId]);

  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setTimeout(() => setCooldownTime(c => c - 50), 50);
      return () => clearTimeout(timer);
    }
  }, [cooldownTime]);

  const buyItem = async (item: typeof SHOP_ITEMS[0]) => {
    if (isLocked || !isOnline || queueLength > 0 || !myGroup || !groupId) return alert('게임 진행 중이며 점수 동기화가 완료된 상태에서 구매해주세요.');
    if ((item.id === 'cooldown' && hasCooldown) || (item.id === 'bonus' && hasBonus)) return alert('이미 보유한 아이템입니다.');
    const others = scores.filter(group => group.id !== groupId);
    if (['donate', 'steal', 'blind', 'tsunami'].includes(item.id) && others.length === 0) return alert('다른 모둠이 참여한 뒤 이용해주세요.');
    if (item.id === 'donate' && scores.every(group => myGroup.score <= group.score)) return alert('우리 조가 꼴등입니다. 점수는 차감되지 않았습니다.');
    if (['steal', 'blind', 'tsunami'].includes(item.id) && scores.every(group => myGroup.score >= group.score)) return alert('우리 조가 이미 1등입니다. 점수는 차감되지 않았습니다.');
    const currentScore = myGroup.score;
    const actualCost = gameRoom?.flash_sale ? Math.floor(item.cost / 2) : item.cost;

    const trackPurchase = async () => {
      const currentStats = myGroup.stats || {};
      const newStats = { ...currentStats, items_bought: (currentStats.items_bought || 0) + 1 };
      await supabase.from('room_groups').update({ stats: newStats }).eq('id', groupId);
    };

    if (item.id === 'double') {
      if (currentScore < actualCost) return alert('점수가 부족합니다!');
      if (hasBuff) return alert('이미 버프가 적용 중입니다!');
      if(window.confirm(`${actualCost}점을 소모하여 [${item.name}]을(를) 구매하시겠습니까?`)) {
        const { data, error } = await supabase.rpc('purchase_classroom_buff', { row_id: groupId });
        if (error || !data) return alert('물약 구매에 실패했습니다. 잔액이나 적용 중인 물약을 확인해주세요.');
        playBeep();
        await trackPurchase();
      }
      return;
    }

    if (currentScore < actualCost) return alert('점수가 부족합니다!');
    if (!window.confirm(`${actualCost}점을 소모하여 [${item.name}]을(를) 구매하시겠습니까?`)) return;

    if (['donate','steal','time','blind'].includes(item.id)) {
      const target=item.id==='time'?null:scores.filter(g=>g.id!==groupId).sort((a,b)=>item.id==='donate'?a.score-b.score:b.score-a.score)[0]?.id;
      const result=await supabase.rpc('classroom_effect',{room_uuid:roomId,effect:item.id,target_uuid:target,player_role:'novice'});
      if(result.error || !result.data) return alert('수업 상태·점수·참여 권한을 확인하세요.');
      await trackPurchase();playBeep();return;
    }
    if (item.id !== 'tsunami') {
      enqueueAction({ id: crypto.randomUUID(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: -actualCost }, timestamp: Date.now() });
      playBeep();
      await trackPurchase();
    }

    if (item.id === 'cooldown') {
      setHasCooldown(true); writeStorage(`has_cooldown_${roomId}_${groupId}`, 'true');
    } else if (item.id === 'bonus') {
      setHasBonus(true); writeStorage(`has_bonus_${roomId}_${groupId}`, 'true');
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
        await trackPurchase();
      }
    }
  };

  const buyVaccine = async () => {
    if (!myGroup || !groupId) return;
    const currentScore = myGroup.score;
    if (currentScore < 50) return alert('점수가 부족합니다!');
    if (!window.confirm('50점을 소모하여 해킹을 즉시 복구하시겠습니까?')) return;
    enqueueAction({ id: crypto.randomUUID(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: -50 }, timestamp: Date.now() });
    await supabase.from('room_groups').update({ is_hacked: false }).eq('id', groupId);
    playBeep();
  };

  if (!groupId || !myGroup || !template || (roomError && isOnline)) return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-6 gap-4 text-center">
      <p role={roomError ? 'alert' : undefined}>{roomError || (roomLoading ? '수업 정보를 불러오는 중...' : !myGroup ? '모둠 정보가 없습니다. PIN으로 다시 입장해주세요.' : '등록된 미션이 없습니다. 선생님에게 템플릿을 확인해달라고 요청해주세요.')}</p>
      {!roomLoading && <button onClick={refreshRoom} className="py-3 px-5 rounded-xl bg-cyan-600 text-white font-bold">다시 시도</button>}
      <button onClick={() => navigate('/lobby')} className="py-3 px-5 rounded-xl bg-slate-200 font-bold">PIN으로 다시 입장</button>
      {!storageAvailable && queueLength > 0 && <p className="text-rose-600">이 브라우저는 점수를 기기에 저장할 수 없습니다. 동기화가 끝날 때까지 화면을 닫지 마세요.</p>}
    </div>
  );

  // 대기 화면 — 게임 시작 전
  if (gameRoom?.status === 'waiting' || gameRoom?.status === 'paused') {
    return <WaitingScreen myGroup={myGroup} scores={scores} template={template} studentName={studentName} gameRoom={gameRoom} helpControl={guidedEntry && gameRoom.status === 'paused' ? <><button type="button" disabled={helpBusy} aria-pressed={Boolean(myGroup.help_requested_at)} onClick={() => void toggleHelp(!myGroup.help_requested_at)} className="w-full py-3 rounded-xl border border-amber-400 bg-amber-50 text-amber-900 font-bold">{myGroup.help_requested_at ? '도움 요청 취소하기' : '🙋 선생님, 도움이 필요해요'}</button>{helpError && <p role="alert" className="text-sm text-red-700 mt-2">{helpError}</p>}</> : undefined} />;
  }

  // 🌊 해일 경보 — 학생 스마트폰 전체 조작 잠금 및 대피 안내
  if (gameRoom?.status === 'tsunami') {
    return (
      <div className="min-h-[100dvh] bg-blue-950 text-white flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden animate-in fade-in duration-200">
        <div className="absolute inset-0 bg-blue-600/30 animate-pulse pointer-events-none"></div>
        <LucideIcons.Waves className="w-28 h-28 text-blue-400 mb-6 animate-bounce relative z-10 drop-shadow-[0_0_20px_rgba(96,165,250,0.5)]" />
        <span className="px-4 py-1.5 rounded-full bg-blue-500/30 text-cyan-300 font-black text-sm uppercase tracking-widest mb-3 border border-blue-400/50 relative z-10 shadow-lg">
          🌊 긴급 상황 경보
        </span>
        <h1 className="text-4xl sm:text-5xl font-black mb-4 leading-tight text-white relative z-10 tracking-tight">
          해일 경보 발령!
        </h1>
        <p className="text-lg text-blue-200 max-w-sm font-bold relative z-10 leading-relaxed">
          스마트폰 조작이 일시 잠금되었습니다.<br />
          즉시 매트 위(안전구역)로 대피하십시오!
        </p>
      </div>
    );
  }

  if (gameRoom?.status === 'finished') {
    const sortedScores = [...scores].sort((a, b) => b.score - a.score);
    const myRank = sortedScores.findIndex(s => s.id === groupId) + 1;
    const isMVP = myRank === 1;

    return (
      <div className="student-classroom-finished min-h-[100dvh] bg-slate-900 flex flex-col items-center relative overflow-y-auto text-white">
        <StudentRoomHeader/>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/20 via-transparent to-transparent animate-[pulse_3s_ease-in-out_infinite]"></div>
        
        {isMVP ? (
          <LucideIcons.Crown className="w-32 h-32 text-yellow-400 mb-4 animate-bounce relative z-10 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
        ) : (
          <LucideIcons.Medal className="w-24 h-24 text-slate-400 mb-4 relative z-10" />
        )}
        
        <h1 className="student-finished-title text-4xl font-black mb-2 text-center relative z-10">게임 종료!</h1>
        <p className="text-xl font-bold mb-8 text-slate-300 relative z-10">최종 순위: {myRank}위</p>
        
        <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/20 w-full max-w-md shadow-2xl flex flex-col items-center relative z-10 mb-8">
          <span className="text-6xl font-black font-mono text-yellow-400 mb-6">{myGroup?.score ?? 0}점</span>
          <div className="text-center font-bold text-slate-500 text-sm mt-4 pb-12">
            {guidedEntry?'오늘 수업이 끝났어요. 선생님의 마무리 안내를 들어요.':'선생님이 시작 버튼을 누를 때까지 대기하세요.'}
          </div>
        </div>

        {/* 펫 시스템 UI */}
        {myGroup && (
          <div className="fixed bottom-24 right-4 z-40 flex flex-col items-center gap-1">
            <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold shadow-sm border border-slate-200 text-slate-800">
              {myGroup.completed_missions?.length >= 20 ? '🔥 불사조' : 
               myGroup.completed_missions?.length >= 10 ? '🐔 닭' : 
               myGroup.completed_missions?.length >= 5 ? '🐥 병아리' : '🥚 알'}
            </div>
            <div className="text-4xl filter drop-shadow-md animate-bounce">
              {myGroup.completed_missions?.length >= 20 ? '🔥' : 
               myGroup.completed_missions?.length >= 10 ? '🐔' : 
               myGroup.completed_missions?.length >= 5 ? '🐥' : '🥚'}
            </div>
          </div>
        )}

        {guidedEntry&&<button disabled={queueLength>0} onClick={()=>navigate('/records?'+new URLSearchParams({returnTo:`/mobile/${roomId}/${groupId}`}))} className="px-8 py-4 bg-cyan-700 rounded-2xl font-bold text-lg relative z-10 disabled:opacity-50">내 활동 기록 확인</button>}
        <button onClick={() => navigate('/')} className="mt-8 px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-white font-bold text-lg transition-colors border border-slate-700 relative z-10 shadow-xl">처음으로 돌아가기</button>
      </div>
    );
  }

  if (gameRoom?.active_minigame) {
    return (
      <>
        <MiniGameOverlay 
          gameRoom={gameRoom} 
          groupId={groupId} 
          template={template} 
          handleMissionComplete={handleMissionComplete} 
          setShowScanner={setShowScanner} 
          enqueueAction={enqueueAction} 
          playVictory={playVictory} 
        />
        {showScanner && (
          <div className="fixed inset-0 z-[10000] bg-black flex flex-col">
            <div className="flex justify-between items-center p-4 bg-slate-900">
              <span className="text-white font-bold">QR 미션 스캐너</span>
              <button onClick={() => setShowScanner(false)} className="text-white bg-slate-700 px-3 py-1 rounded font-bold text-sm">닫기</button>
            </div>
            <div id="reader" className="flex-1 w-full bg-black" style={{ minHeight: '300px' }}></div>
          </div>
        )}
      </>
    );
  }

  const isBlinded = myGroup?.is_blinded_until ? new Date(myGroup.is_blinded_until).getTime() > Date.now() : false;
  if (isBlinded) {
    return (
      <div className="min-h-[100dvh] bg-stone-950 flex flex-col items-center justify-center p-6 relative overflow-hidden pointer-events-none z-[9999]">
        <LucideIcons.EyeOff className="w-32 h-32 text-stone-800 mb-8 animate-pulse" />
        <h1 className="text-5xl font-black text-stone-600 mb-4 text-center">먹물 공격!</h1>
        <p className="text-stone-500 font-bold mt-4 text-lg">잠시 후 시야가 회복됩니다...</p>
      </div>
    );
  }

  const displayScore = myGroup?.score ?? 0;
  if (guidedEntry && roomId && groupId) {
    const { mission: guidedMission, gameType: guidedGameType } = guidedEntry;
    const completed = myGroup?.completed_missions?.includes(guidedMission.id);
    const canPlay = gameRoom?.status === 'playing' && !isTimeUp && !isWhistleActive;
    return <main className="student-guided-room min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col items-center">
      <StudentRoomHeader/>
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <p className="text-sm font-bold text-cyan-700">땀방울 원정대 · 우리 모둠</p>
        <h1 className="text-3xl font-black mt-2">{myGroup?.group_name || '모둠 활동'}</h1>
        <p className="text-slate-600 mt-2">{gameRoom?.name} · 남은 시간 {mins}:{secs}</p>
        <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-5 mt-6">
          <p className="text-sm font-bold text-cyan-800">오늘의 활동</p>
          <h2 className="text-xl font-black mt-2">{guidedMission.title}</h2>
          <p className="text-sm text-slate-700 mt-2">{guidedMission.desc}</p>
          <p className="text-sm text-slate-600 mt-3">게임을 끝내면 모둠 점수가 즉시 반영돼요.</p>
        </div>
        <div role="status" className="mt-5 text-center font-bold text-slate-700">{isWhistleActive ? '선생님을 바라보고 안내를 들어 주세요.' : completed ? `활동 완료! · 모둠 ${displayScore}점` : `모둠 점수 ${displayScore}점`}</div>
        <button type="button" disabled={helpBusy} aria-pressed={Boolean(myGroup?.help_requested_at)} onClick={() => void toggleHelp(!myGroup?.help_requested_at)} className={`w-full mt-4 py-3 rounded-xl border font-bold ${myGroup?.help_requested_at ? 'bg-amber-50 border-amber-400 text-amber-900' : 'bg-white border-slate-300 text-slate-700'}`}>{myGroup?.help_requested_at ? '도움 요청 취소하기' : '🙋 선생님, 도움이 필요해요'}</button>
        {myGroup?.help_requested_at && <p role="status" className="text-sm text-amber-800 mt-2 text-center">선생님 화면에 우리 모둠의 요청이 표시돼요.</p>}
        {helpError && <p role="alert" className="text-sm text-red-700 mt-2">{helpError}</p>}
        {guidedSubmission.receipt && !guidedSubmission.receipt.completed && <p role="status" className="mt-2 text-center text-sm text-cyan-800">{guidedSubmission.isOnline ? '완료 기록을 저장하고 있어요.' : '연결되면 완료 기록을 자동으로 저장할게요.'}</p>}
        {guidedSubmission.receipt?.completed && <fieldset className="mt-5 border-t border-slate-200 pt-4"><legend className="font-bold text-sm">오늘 잘한 움직임 하나</legend><div className="grid gap-2 mt-2">{GUIDED_REFLECTIONS.map(choice => <button type="button" key={choice.value} aria-pressed={guidedSubmission.receipt?.reflection === choice.value} onClick={() => guidedSubmission.chooseReflection(choice.value)} className={`rounded-xl border p-3 text-left text-sm ${guidedSubmission.receipt?.reflection === choice.value ? 'border-cyan-600 bg-cyan-50' : 'border-slate-200'}`}>{choice.label}</button>)}</div><p role="status" className="text-xs text-slate-600 mt-2">{guidedSubmission.receipt.reflection ? guidedSubmission.receipt.saved ? '선생님 화면에 저장했어요.' : '선택을 저장하고 있어요.' : '한 가지만 골라 주세요.'}</p></fieldset>}
        <button className="w-full mt-5 py-4 bg-cyan-700 text-white rounded-xl font-black text-lg disabled:bg-slate-300" disabled={!canPlay} onClick={() => navigate(`/play/${encodeURIComponent(guidedGameType!)}?room=${encodeURIComponent(roomId)}&group=${encodeURIComponent(groupId)}&guided=1&mission=${encodeURIComponent(guidedMission.id)}`)}>{completed ? '다시 도전하기 →' : '게임 시작 →'}</button>
        <button type="button" disabled={queueLength>0} onClick={()=>navigate('/records?'+new URLSearchParams({returnTo:`/mobile/${roomId}/${groupId}`}))} className="w-full mt-3 py-3 rounded-xl border border-slate-300 font-bold disabled:opacity-50">내 활동 기록 확인</button>
        <p className="text-xs text-slate-500 mt-4 text-center">활동 전 주변 공간과 기기를 확인하고, 몸 상태에 맞게 참여해요.</p>
      </div>
    </main>;
  }

  if (myGroup?.is_hacked) {
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
    <div className={`min-h-[100dvh] flex flex-col relative overflow-hidden select-none mobile-mission-root ${
      isStandMode ? 'bg-black text-amber-300' : isOutdoorMode ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* 화면 플래시 효과 */}
      {showFlash && <div className="fixed inset-0 z-[200] bg-cyan-400 animate-screen-flash" />}

      {/* 🚨 교사 호루라기/휘슬 전원 집중 모달 */}
      {isWhistleActive && (
        <div className="fixed inset-0 z-[9999] bg-red-600/95 text-white flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-200 backdrop-blur-md">
          <div className="w-24 h-24 rounded-full bg-white text-red-600 flex items-center justify-center mb-6 animate-bounce shadow-2xl">
            <LucideIcons.Volume2 className="w-14 h-14" />
          </div>
          <span className="px-4 py-1.5 rounded-full bg-white/20 text-yellow-300 font-black text-sm uppercase tracking-widest mb-3 border border-white/30">
            📢 체육관 전체 집중 신호
          </span>
          <h1 className="text-4xl sm:text-5xl font-black mb-4 leading-tight drop-shadow-lg">
            선생님을<br/>바라보세요!
          </h1>
          <p className="text-lg text-red-100 max-w-sm font-bold">
            호루라기가 울렸습니다.<br/>하던 활동을 멈추고 교사의 지시에 집중하세요.
          </p>
        </div>
      )}

      {/* 상단 퀵 컨트롤 (스탠드 모드 + 야외 모드) */}
      <div className="sticky top-0 z-50 p-3 bg-[var(--forest-bg)] border-b border-[var(--forest-line)]">
        <HeaderToolbar><button className="icon-toolbar-action" type="button" onClick={toggleStandMode} title="스탠드 모드" aria-pressed={isStandMode}><MonitorSmartphone aria-hidden="true"/><span>스탠드 모드</span></button><button className="icon-toolbar-action" type="button" onClick={toggleOutdoorMode} title="야외 시인성 모드" aria-pressed={isOutdoorMode}><Sun aria-hidden="true"/><span>야외 시인성 모드</span></button></HeaderToolbar>
        {isWakeLockActive && <span className="block text-xs text-center mt-1" role="status">🔆 화면 꺼짐 방지 활성</span>}
      </div>

      {syncWarning && <p role="status" className="mx-4 p-3 bg-amber-100 text-amber-900 rounded-xl text-xs">{syncWarning}</p>}
      {!storageAvailable && queueLength > 0 && <p role="alert" className="mx-4 p-3 bg-rose-100 text-rose-800 rounded-xl text-xs">기기에 점수를 저장할 수 없습니다. 동기화가 끝날 때까지 화면을 닫지 마세요.</p>}
      {/* 🌟 학급 전체 피버타임 및 긴급 공지 띠 배너 */}
      {gameRoom?.announcement && gameRoom.announcement !== 'WHISTLE' && (
        <div className="mx-4 mt-2 mb-1 p-2.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg animate-pulse border border-yellow-300">
          <LucideIcons.Sparkles className="w-4 h-4 fill-slate-950" />
          <span>{gameRoom.announcement}</span>
        </div>
      )}
      {combo > 1 && (
        <div className="absolute top-1/4 right-8 z-40 transform rotate-12 animate-bounce flex flex-col items-center pointer-events-none">
          <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 drop-shadow-lg italic">
            {combo} COMBO!
          </span>
          <span className="text-xl font-bold text-yellow-300 drop-shadow-md">+ {combo * 10} 보너스!</span>
        </div>
      )}

      {clicks.map(c => (
        <div key={c.id} className="absolute z-50 animate-float font-black text-4xl text-cyan-600 drop-shadow-[0_0_10px_rgba(255,255,255,1)]" style={{ left: c.x, top: c.y }}>
          {c.val > 0 ? `+${c.val}` : c.val}
        </div>
      ))}

      {gameRoom?.status === 'boss_raid' && (
        <div className="mx-4 mt-2 mb-2 p-3 bg-gradient-to-r from-red-950 via-slate-900 to-red-950 rounded-2xl border-2 border-red-500 shadow-xl text-white relative z-20">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <LucideIcons.Swords className="w-6 h-6 text-red-400 animate-pulse" />
              <div>
                <h3 className="font-black text-sm text-red-200">체육관 거대 보스 레이드</h3>
                <p className="text-[10px] text-red-300/80">미션 완수 시 대량 피해! 화면 탭으로 직접 타격!</p>
              </div>
            </div>
            <button
              onPointerDown={handleBossTap}
              className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg border border-red-400 shrink-0 flex items-center gap-1.5 transition-all"
            >
              <LucideIcons.Flame className="w-4 h-4 text-yellow-300 animate-bounce" /> 직접 타격! (-1)
            </button>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-5 border border-slate-700 overflow-hidden relative shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-red-400 transition-all duration-300"
              style={{ width: `${Math.max(0, ((gameRoom.boss_hp || 0) / (gameRoom.boss_max_hp || 1)) * 100)}%` }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center text-white font-black text-[11px] font-mono text-shadow">
              {gameRoom.boss_hp?.toLocaleString() ?? 0} / {gameRoom.boss_max_hp?.toLocaleString() ?? 0}
            </div>
          </div>
          {bossSyncError && <p role="alert" className="text-amber-300 text-[10px] mt-1 text-center font-bold">{bossSyncError}</p>}
        </div>
      )}
      
      <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 pointer-events-none">
        <div className={`status-badge flex items-center gap-2 rounded-full border shadow-sm transition-all ${
          isStandMode
            ? 'px-4 py-2 bg-amber-400 text-slate-950 border-amber-300 font-mono text-2xl font-black shadow-lg shadow-amber-400/20'
            : isOutdoorMode
            ? 'px-3 py-1.5 bg-black/80 border-slate-700 text-white text-xs font-bold'
            : 'px-3 py-1.5 bg-white/80 backdrop-blur-sm border-slate-200 text-slate-700 text-xs font-bold'
        }`}>
          <LucideIcons.Clock className={isStandMode ? 'w-6 h-6 text-slate-950' : 'w-4 h-4'} /> <span className="font-mono">{mins}:{secs}</span>
        </div>
        {!isOnline && (
          <div className="status-badge flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border bg-orange-100/90 backdrop-blur-sm border-orange-300 text-orange-800 shadow-sm animate-pulse">
            <LucideIcons.WifiOff className="w-4 h-4" /> <span>오프라인 ({queueLength}개 대기 중)</span>
          </div>
        )}
        {isOnline && isSyncing && (
          <div className="status-badge flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border bg-cyan-100/90 backdrop-blur-sm border-cyan-300 text-cyan-800 shadow-sm">
            <LucideIcons.RefreshCw className="w-4 h-4 animate-spin" /> <span>동기화 중...</span>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 flex flex-col z-10 mt-12 overflow-y-auto custom-scrollbar">
        <div className={`score-card shrink-0 rounded-3xl p-5 mb-4 flex flex-col items-center shadow-xl relative overflow-hidden transition-all ${
          isStandMode
            ? 'bg-slate-950 border-4 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.25)]'
            : isOutdoorMode
            ? 'bg-black/80 border-2 border-cyan-600'
            : 'bg-white border border-slate-200'
        }`}>
          {hasBuff && <div className="absolute inset-0 bg-yellow-100/30 animate-pulse"></div>}
          <span className={`score-label font-bold tracking-widest text-sm mb-1 relative z-10 ${
            isStandMode ? 'text-amber-300 font-black' : isOutdoorMode ? 'text-slate-300' : 'text-slate-500'
          }`}>
            {studentName ? `${studentName} 요원 (${myGroup?.group_name})` : `${myGroup?.group_name || '우리 모둠'} 점수`} {hasBuff && <span className="text-yellow-400 ml-2">X2 버프 중!</span>}
          </span>
          <span className={`score-value font-black font-mono transition-transform relative z-10 ${
            isStandMode ? 'text-amber-400 text-8xl drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]' : isOutdoorMode ? 'text-cyan-400 text-7xl' : 'text-slate-900 text-7xl'
          }`}>
            {displayScore}
          </span>
          
          <div className="flex gap-2 mt-3 relative z-10">
            {hasCooldown && <span className="px-2 py-1 bg-blue-900/50 text-blue-400 border border-blue-700 rounded text-xs font-bold">쿨다운 단축</span>}
            {hasBonus && <span className="px-2 py-1 bg-pink-900/50 text-pink-400 border border-pink-700 rounded text-xs font-bold">보너스 요정</span>}
          </div>
        </div>

        <div className="flex flex-col relative">
          {showScanner && (
            <div className="absolute inset-0 z-50 bg-black flex flex-col rounded-3xl overflow-hidden">
              <div className="flex justify-between items-center p-4 bg-slate-900">
                <span className="text-white font-bold">QR 미션 스캐너</span>
                <button onClick={() => setShowScanner(false)} className="text-white bg-slate-700 px-3 py-1 rounded font-bold text-sm">닫기</button>
              </div>
              <div id="reader" className="flex-1 w-full bg-black" style={{ minHeight: '300px' }}></div>
            </div>
          )}
          {isLocked && !myGroup?.is_hacked && (
            <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center border border-slate-200 shadow-sm">
              <LucideIcons.Lock className="w-10 h-10 text-slate-400 mb-2" />
              <p className="text-red-500 font-bold text-center text-lg">
                {isWhistleActive ? '🚨 호루라기 집중 신호 대기 중' : '미션 진행 상태가 아닙니다'}
              </p>
            </div>
          )}

          {activeTab === 'mission' ? (
            <div className="flex flex-col gap-3 pb-32">
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
                const isCompleted = myGroup?.completed_missions?.includes(m.id);
                return (
                  <button 
                    key={m.id || i}
                    onClick={(e) => {
                      if (m.gameType && roomId && groupId) {
                        navigate(`/play/${encodeURIComponent(m.gameType)}?room=${encodeURIComponent(roomId)}&group=${encodeURIComponent(groupId)}&guided=1&mission=${encodeURIComponent(m.id)}`);
                        return;
                      }
                      if (cooldown) { if (navigator.vibrate) navigator.vibrate([30, 30, 30]); return; }
                      handleMissionComplete(m, e);
                    }}
                    disabled={isLocked}
                    className={`mission-btn w-full shrink-0 relative group p-4 border rounded-2xl flex items-center justify-between transition-transform active:scale-95 touch-manipulation shadow-sm hover:shadow-md ${isOutdoorMode ? 'bg-slate-900 border-slate-700' : `bg-white ${m.bg}`}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-full bg-white flex items-center justify-center border border-slate-100 shadow-sm ${m.color}`}>
                        <IconComp className="w-8 h-8" />
                      </div>
                      <div className="text-left flex flex-col justify-center">
                        <div className={`mission-title font-black text-xl flex items-center gap-2 ${isOutdoorMode ? 'text-white' : m.color}`}>
                          {m.title}
                          {isCompleted && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200">수행 완료</span>}
                        </div>
                        <div className={`mission-desc text-sm font-bold mt-0.5 ${isOutdoorMode ? 'text-slate-400' : 'text-slate-500'}`}>{m.desc}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`mission-amount font-black ${m.gameType ? 'text-base' : 'text-3xl'} ${isOutdoorMode ? 'text-cyan-400' : m.color}`}>{m.gameType ? isCompleted ? '다시 시작 →' : '게임 시작 →' : `+${m.amount}`}</span>
                      <span className="text-xs text-slate-400 font-bold mt-1">{m.gameType ? `완료 시 점수 즉시 반영` : `대기 ${m.cooldown}초`}</span>
                    </div>

                    {cooldown && (
                      <div className={`cooldown-overlay absolute inset-0 rounded-2xl overflow-hidden backdrop-blur-sm z-10 ${isOutdoorMode ? 'bg-black/70' : 'bg-white/70'}`}>
                        <div className="absolute bottom-0 left-0 h-1 bg-slate-400 transition-all duration-50 ease-linear" style={{ width: `${(cooldownTime / maxCooldownTime) * 100}%` }}></div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto pb-32 custom-scrollbar pr-2 h-full">
              {gameRoom?.flash_sale && (
                <div className="bg-yellow-50 border-2 border-yellow-400 p-3 rounded-2xl animate-pulse shadow-sm flex items-center justify-center gap-2">
                  <LucideIcons.Zap className="w-5 h-5 text-yellow-600" />
                  <span className="font-black text-yellow-800">플래시 세일! 전 품목 50% 할인 중!</span>
                </div>
              )}
              {SHOP_ITEMS.map((item) => {
                const actualCost = gameRoom?.flash_sale ? Math.floor(item.cost / 2) : item.cost;
                return (
                  <div key={item.id} className={`p-4 border rounded-2xl flex justify-between items-center shrink-0 shadow-sm ${isOutdoorMode ? 'bg-slate-900 border-slate-700' : `bg-white ${item.bg}`}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border shadow-sm ${isOutdoorMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-100'} ${item.color}`}>
                        <item.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className={`font-black text-lg flex items-center gap-2 ${isOutdoorMode ? 'text-white' : item.color}`}>
                          {item.name}
                          {gameRoom?.flash_sale && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full whitespace-nowrap">SALE</span>}
                        </p>
                        <p className={`text-xs font-bold break-keep pr-2 ${isOutdoorMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.desc}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => buyItem(item)} 
                      disabled={displayScore < actualCost || (item.id === 'double' && hasBuff)} 
                      className={`shrink-0 px-4 py-3 rounded-xl font-black text-base transition-transform active:scale-95 flex flex-col items-center justify-center ${displayScore >= actualCost ? 'bg-purple-600 text-white shadow-md hover:bg-purple-500' : (isOutdoorMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400')}`}
                    >
                      {gameRoom?.flash_sale && <span className="text-[10px] line-through opacity-70 leading-none">{item.cost}</span>}
                      <span className="leading-none">{actualCost}점</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 🚨 체육관 소음 극복을 위한 비주얼 스트로브 플래시 오버레이 */}
      {isWhistleActive && (
        <div className="fixed inset-0 z-50 pointer-events-none bg-red-600/35 animate-ping border-[12px] border-red-500" />
      )}

      {/* 하단 고정 탭바 */}
      <div className={`tab-bar fixed bottom-0 left-0 right-0 z-50 flex gap-2 p-3 border-t shadow-lg safe-area-bottom ${isOutdoorMode ? 'bg-black/95 border-slate-800' : 'bg-white/95 backdrop-blur-md border-slate-200'}`}>
        <button onClick={() => setActiveTab('mission')} className={`tab-btn flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-1.5 transition-all ${activeTab === 'mission' ? `tab-active ${isOutdoorMode ? 'bg-cyan-700 text-white' : 'bg-cyan-600 text-white shadow-md'}` : `tab-inactive ${isOutdoorMode ? 'bg-slate-800 border border-slate-700 text-slate-400' : 'bg-slate-50 border border-slate-200 text-slate-500'}`}`}>
          <LucideIcons.Shield className="w-4 h-4" /> <span className="text-xs">미션</span>
        </button>
        <button onClick={() => setActiveTab('shop')} className={`tab-btn flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-1.5 transition-all ${activeTab === 'shop' ? `tab-active ${isOutdoorMode ? 'bg-purple-700 text-white' : 'bg-purple-600 text-white shadow-md'}` : `tab-inactive ${isOutdoorMode ? 'bg-slate-800 border border-slate-700 text-slate-400' : 'bg-slate-50 border border-slate-200 text-slate-500'}`}`}>
          <LucideIcons.ShoppingCart className="w-4 h-4" /> <span className="text-xs">상점</span>
        </button>
      </div>
    </div>
  );
};
