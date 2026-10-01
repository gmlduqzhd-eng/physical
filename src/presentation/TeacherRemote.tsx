import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../data/supabase';
import type { GameRoom, RoomGroup } from '../domain/types';
import { useGameTimer } from '../application/useGameTimer';
import { sfxWhistle, sfxTap, sfxSuccess, sfxClick, hapticHeavy, hapticDouble } from '../application/soundEffects';
import {
  Volume2, Play, Pause, Plus, Minus, Zap, Waves, Skull, ShieldAlert,
  Send, ExternalLink, ArrowLeft, RefreshCw, Trophy, Users, Sparkles
} from 'lucide-react';

const QUICK_ANNOUNCEMENTS = [
  '📢 선생님 앞으로 모이세요!',
  '🧘 전원 바닥에 착석!',
  '🏃 1번 콘 앞으로 집합!',
  '💧 수분 섭취 및 숨고르기!',
  '🧹 활동 마무리 및 장비 정리!',
  '🤝 상대 모둠과 하이파이브!',
];

export const TeacherRemote: React.FC = () => {
  const { roomId: paramRoomId } = useParams<{ roomId?: string }>();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(paramRoomId || null);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [roomGroups, setRoomGroups] = useState<RoomGroup[]>([]);
  const [announcementInput, setAnnouncementInput] = useState('');
  const [isWhistling, setIsWhistling] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const { mins, secs, isDanger } = useGameTimer(currentRoom);

  // 피드백 토스트 알림
  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 2000);
  };

  // 방 목록 가져오기
  const fetchRooms = React.useCallback(async () => {
    const { data } = await supabase
      .from('game_rooms')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data && data.length > 0) {
      setRooms(data);
      if (!selectedRoomId) {
        setSelectedRoomId(data[0].id);
      }
    }
  }, [selectedRoomId]);

  // 선택된 방 세부 정보 가져오기
  const fetchRoomDetails = React.useCallback(async (id: string) => {
    const { data: room } = await supabase.from('game_rooms').select('*').eq('id', id).single();
    if (room) {
      setCurrentRoom(room);
      setIsWhistling(room.announcement === 'WHISTLE');
    }

    const { data: groups } = await supabase
      .from('room_groups')
      .select('*')
      .eq('room_id', id)
      .order('score', { ascending: false });
    if (groups) setRoomGroups(groups);
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    if (selectedRoomId) {
      fetchRoomDetails(selectedRoomId);

      const channel = supabase
        .channel(`remote_room_${selectedRoomId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${selectedRoomId}` }, (payload) => {
          if (payload.new) {
            const updated = payload.new as GameRoom;
            setCurrentRoom(updated);
            setIsWhistling(updated.announcement === 'WHISTLE');
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_groups', filter: `room_id=eq.${selectedRoomId}` }, () => {
          fetchRoomDetails(selectedRoomId);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedRoomId, fetchRoomDetails]);

  // --- 1. 원터치 휘슬 (집중 모드) ---
  const handleToggleWhistle = async () => {
    if (!currentRoom) return;
    sfxWhistle();
    hapticHeavy();

    if (!isWhistling) {
      setIsWhistling(true);
      await supabase.from('game_rooms').update({ announcement: 'WHISTLE' }).eq('id', currentRoom.id);
      showFeedback('📢 휘슬 발동! 학생 화면 집중 잠금');
    } else {
      setIsWhistling(false);
      await supabase.from('game_rooms').update({ announcement: null }).eq('id', currentRoom.id);
      showFeedback('✅ 집중 해제! 게임 화면 복귀');
    }
  };

  // --- 2. 타이머 및 상태 제어 ---
  const handleStatusChange = async (status: 'playing' | 'paused') => {
    if (!currentRoom) return;
    sfxTap();
    hapticDouble();
    const updates: Record<string, string> = { status };
    if (status === 'playing' && !currentRoom.started_at) {
      updates.started_at = new Date().toISOString();
    }
    await supabase.from('game_rooms').update(updates).eq('id', currentRoom.id);
    showFeedback(status === 'playing' ? '▶️ 수업 시작 / 재개' : '⏸️ 수업 일시 정지');
  };

  const handleTimeModifier = async (amount: number) => {
    if (!currentRoom) return;
    sfxClick();
    const newMod = (currentRoom.global_time_modifier || 0) + amount;
    await supabase.from('game_rooms').update({ global_time_modifier: newMod }).eq('id', currentRoom.id);
    showFeedback(amount > 0 ? `⏱️ +${amount}초 연장` : `⏱️ ${amount}초 단축`);
  };

  // --- 3. 긴급 이벤트 발동 ---
  const handleTriggerEvent = async (type: 'tsunami' | 'boss_raid' | 'zombie' | 'buff' | 'underdog' | 'fever' | 'finish') => {
    if (!currentRoom) return;
    sfxSuccess();
    hapticHeavy();

    if (type === 'tsunami') {
      const nextStatus = currentRoom.status === 'tsunami' ? 'playing' : 'tsunami';
      await supabase.from('game_rooms').update({ status: nextStatus }).eq('id', currentRoom.id);
      showFeedback(nextStatus === 'tsunami' ? '🌊 지진·해일 경보 발동!' : '🌊 해일 상황 종료');
    } else if (type === 'boss_raid') {
      const nextStatus = currentRoom.status === 'boss_raid' ? 'playing' : 'boss_raid';
      await supabase.from('game_rooms').update({
        status: nextStatus,
        boss_hp: nextStatus === 'boss_raid' ? 10000 : null,
        boss_max_hp: nextStatus === 'boss_raid' ? 10000 : null,
      }).eq('id', currentRoom.id);
      showFeedback(nextStatus === 'boss_raid' ? '👹 보스 레이드 소환!' : '👹 보스 레이드 종료');
    } else if (type === 'zombie') {
      const nextStatus = currentRoom.status === 'zombie' ? 'playing' : 'zombie';
      await supabase.from('game_rooms').update({ status: nextStatus }).eq('id', currentRoom.id);
      showFeedback(nextStatus === 'zombie' ? '🧟 좀비 바이러스 살포!' : '🧟 좀비 모드 종료');
    } else if (type === 'buff') {
      // 전 모둠 1분간 점수 2배
      const buffUntil = new Date(Date.now() + 60000).toISOString();
      await supabase.from('room_groups').update({ item_buff_until: buffUntil }).eq('room_id', currentRoom.id);
      showFeedback('⚡ 전원 1분간 점수 2배 버프 지급!');
    } else if (type === 'underdog') {
      // 하위 50% 모둠 역전 찬스 (점수 3배 버프)
      if (roomGroups.length >= 2) {
        const sorted = [...roomGroups].sort((a, b) => b.score - a.score);
        const halfIdx = Math.floor(sorted.length / 2);
        const underdogs = sorted.slice(halfIdx);
        const buffUntil = new Date(Date.now() + 90000).toISOString();
        for (const u of underdogs) {
          await supabase.from('room_groups').update({ item_buff_until: buffUntil }).eq('id', u.id);
        }
        await supabase.from('game_rooms').update({ announcement: '🌟 언더독 역전 찬스 발동! 하위 모둠 1분 30초간 점수 3배!' }).eq('id', currentRoom.id);
        showFeedback('🌟 언더독 역전 골든벨 발동!');
      } else {
        showFeedback('모둠이 2개 이상일 때 발동 가능합니다.');
      }
    } else if (type === 'fever') {
      // 학급 전체 초특급 피버 타임
      const buffUntil = new Date(Date.now() + 60000).toISOString();
      await supabase.from('room_groups').update({ item_buff_until: buffUntil }).eq('room_id', currentRoom.id);
      await supabase.from('game_rooms').update({ announcement: '🔥 [FEVER TIME] 전원 1분간 점수 2배 + 쿨다운 삭제!' }).eq('id', currentRoom.id);
      showFeedback('🔥 학급 전체 피버 타임 발동!');
    } else if (type === 'finish') {
      if (confirm('게임을 종료하고 전광판 시상대 결과를 발표하시겠습니까?')) {
        await supabase.from('game_rooms').update({ status: 'finished' }).eq('id', currentRoom.id);
        showFeedback('🏆 게임 종료 및 결과 발표!');
      }
    }
  };

  // --- 4. 공지사항 전송 ---
  const handleSendAnnouncement = async (text: string) => {
    if (!currentRoom || !text.trim()) return;
    sfxClick();
    await supabase.from('game_rooms').update({ announcement: text.trim() }).eq('id', currentRoom.id);
    setAnnouncementInput('');
    showFeedback(`📢 공지 전송: "${text.slice(0, 15)}..."`);
  };

  const handleClearAnnouncement = async () => {
    if (!currentRoom) return;
    sfxClick();
    await supabase.from('game_rooms').update({ announcement: null }).eq('id', currentRoom.id);
    showFeedback('공지사항을 지웠습니다.');
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col font-sans select-none pb-12">
      {/* 액션 피드백 토스트 */}
      {actionFeedback && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-cyan-500 text-slate-950 px-5 py-2.5 rounded-full font-black text-sm shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
          {actionFeedback}
        </div>
      )}

      {/* 상단 미니 헤더 */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800/60"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>관리자 PC</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
            📱 교사 스마트 리모컨
          </span>
          {currentRoom && (
            <button
              onClick={() => window.open(`/board/${currentRoom.id}`, '_blank')}
              className="p-1.5 text-slate-400 hover:text-cyan-400"
              title="전광판 새창 열기"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 학급 방 선택 */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center gap-2">
        <label htmlFor="room-select" className="text-xs font-bold text-slate-400 shrink-0">대상 학급:</label>
        <select
          id="room-select"
          aria-label="대상 학급 선택"
          value={selectedRoomId || ''}
          onChange={(e) => setSelectedRoomId(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-cyan-500"
        >
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} (PIN: {r.pin_code}) [{r.status}]
            </option>
          ))}
        </select>
        <button
          onClick={() => fetchRooms()}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300"
          title="새로고침"
          aria-label="새로고침"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <main className="flex-1 px-4 py-4 space-y-4 max-w-lg mx-auto w-full">
        {/* 현황 카드 (타이머 & 상태) */}
        <div className={`p-4 rounded-2xl border-2 transition-all shadow-lg ${isDanger ? 'bg-red-950/40 border-red-500/60' : 'bg-slate-900 border-slate-800'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-400 tracking-wider">
              {currentRoom?.name || '학급을 선택하세요'}
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase ${
              currentRoom?.status === 'playing' ? 'bg-emerald-500/20 text-emerald-400' :
              currentRoom?.status === 'paused' ? 'bg-amber-500/20 text-amber-400' :
              currentRoom?.status === 'finished' ? 'bg-purple-500/20 text-purple-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {currentRoom?.status || 'UNKNOWN'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="font-mono font-black text-4xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-400">
              {mins}:{secs}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>{roomGroups.length}개 모둠 접속</span>
            </div>
          </div>
        </div>

        {/* 🚨 핵심 1: 원터치 휘슬 버튼 (대형 터치) */}
        <div className="relative">
          <button
            onClick={handleToggleWhistle}
            className={`w-full py-6 rounded-3xl font-black text-xl flex flex-col items-center justify-center gap-2 shadow-2xl transition-all active:scale-95 border-4 ${
              isWhistling
                ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-slate-950 border-amber-300 animate-pulse shadow-amber-500/40'
                : 'bg-gradient-to-b from-red-600 to-rose-700 text-white border-red-400 shadow-red-600/40 hover:brightness-110'
            }`}
          >
            <div className="flex items-center gap-2">
              <Volume2 className="w-8 h-8 animate-bounce" />
              <span>{isWhistling ? '✅ 집중 해제 (게임 재개)' : '🚨 원터치 휘슬! (전원 집중)'}</span>
            </div>
            <span className="text-xs font-semibold opacity-90">
              {isWhistling ? '현재 학생 기기가 모두 잠금 상태입니다 (터치하여 해제)' : '체육관 전체 호루라기 소리와 함께 학생 화면 즉시 정지'}
            </span>
          </button>
        </div>

        {/* ⏱️ 핵심 2: 타이머 빠른 제어 */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="text-xs font-black text-slate-400 flex items-center gap-1.5 uppercase">
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            수업 진행 및 시간 통제
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleStatusChange('playing')}
              className="py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 shadow-md"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>수업 시작 / 재개</span>
            </button>
            <button
              onClick={() => handleStatusChange('paused')}
              className="py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 shadow-md"
            >
              <Pause className="w-4 h-4 fill-white" />
              <span>일시 정지</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            <button
              onClick={() => handleTimeModifier(-30)}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95"
            >
              <Minus className="w-3 h-3" /> 30초
            </button>
            <button
              onClick={() => handleTimeModifier(30)}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95"
            >
              <Plus className="w-3 h-3" /> 30초
            </button>
            <button
              onClick={() => handleTimeModifier(60)}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95"
            >
              <Plus className="w-3 h-3" /> 1분
            </button>
            <button
              onClick={() => handleTimeModifier(180)}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95"
            >
              <Plus className="w-3 h-3" /> 3분
            </button>
          </div>
        </div>

        {/* ⚡ 핵심 3: 즉각 이벤트 트리거 */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="text-xs font-black text-slate-400 flex items-center gap-1.5 uppercase">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            수업 긴급 이벤트 발동
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleTriggerEvent('fever')}
              className="py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-md text-white font-black animate-pulse"
            >
              <Sparkles className="w-4 h-4 fill-white" />
              <span>전체 피버 타임 (1분)</span>
            </button>
            <button
              onClick={() => handleTriggerEvent('underdog')}
              className="py-3 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-md text-slate-950 font-black"
            >
              <Trophy className="w-4 h-4 fill-slate-950" />
              <span>언더독 역전 찬스</span>
            </button>
            <button
              onClick={() => handleTriggerEvent('buff')}
              className="py-3 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-md text-slate-950 font-black"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>전원 2배 버프 (1분)</span>
            </button>
            <button
              onClick={() => handleTriggerEvent('tsunami')}
              className="py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-md"
            >
              <Waves className="w-4 h-4" />
              <span>해일 플랭크 경보</span>
            </button>
            <button
              onClick={() => handleTriggerEvent('boss_raid')}
              className="py-3 bg-gradient-to-r from-rose-700 to-red-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-md"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>보스 레이드 소환</span>
            </button>
            <button
              onClick={() => handleTriggerEvent('zombie')}
              className="py-3 bg-gradient-to-r from-emerald-700 to-teal-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-md"
            >
              <Skull className="w-4 h-4" />
              <span>좀비 바이러스 살포</span>
            </button>
          </div>

          <button
            onClick={() => handleTriggerEvent('finish')}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-purple-300 rounded-xl font-black text-xs flex items-center justify-center gap-2 active:scale-95"
          >
            <Trophy className="w-4 h-4 text-purple-400" />
            <span>수업 종료 및 전광판 시상대 발표</span>
          </button>
        </div>

        {/* 📢 핵심 4: 빠른 공지사항 전송 */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-400 flex items-center gap-1.5 uppercase">
              <Send className="w-3.5 h-3.5 text-cyan-400" />
              학생 전체 긴급 공지
            </h3>
            {currentRoom?.announcement && currentRoom.announcement !== 'WHISTLE' && (
              <button
                onClick={handleClearAnnouncement}
                className="text-[11px] text-red-400 hover:underline"
              >
                공지 삭제
              </button>
            )}
          </div>

          {/* 프리셋 칩 */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ANNOUNCEMENTS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendAnnouncement(q)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold active:scale-95 border border-slate-700/60"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="직접 공지 내용 입력..."
              value={announcementInput}
              onChange={(e) => setAnnouncementInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendAnnouncement(announcementInput)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => handleSendAnnouncement(announcementInput)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold text-xs shrink-0 active:scale-95"
            >
              전송
            </button>
          </div>
        </div>

        {/* 실시간 모둠 순위 미리보기 */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <h3 className="text-xs font-black text-slate-400 mb-2 uppercase">
            실시간 모둠 순위 현황
          </h3>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {roomGroups.map((g, idx) => (
              <div key={g.id} className="flex items-center justify-between px-3 py-2 bg-slate-800/60 rounded-xl text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] ${
                    idx === 0 ? 'bg-yellow-400 text-slate-950' :
                    idx === 1 ? 'bg-slate-300 text-slate-950' :
                    idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="font-bold text-slate-200">{g.group_name}</span>
                </div>
                <span className="font-mono font-black text-cyan-400">{g.score}점</span>
              </div>
            ))}
            {roomGroups.length === 0 && (
              <p className="text-center text-xs text-slate-500 py-3">접속한 모둠이 없습니다.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
