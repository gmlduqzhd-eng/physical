import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../data/supabase';
import { createClassroom, findRoomByPin, classroomError } from '../../data/classroomRepository';
import { readStorage, writeStorage, removeStorage } from '../../application/browserStorage';
import { X, Users, Play, AlertCircle, Copy, Check, Crown, LogOut } from 'lucide-react';
import { useAudio } from '../../application/useAudio';

interface QuickPinClassroomProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: (gameType: string, context?: { roomId: string; groupId: string; pin: string }) => void;
}

interface PinRoom {
  id: string;
  pin: string;
  hostId: string;
  blueScore: number;
  whiteScore: number;
  blueGroupId: string;
  whiteGroupId: string;
  members: string[];
}

export const QuickPinClassroom: React.FC<QuickPinClassroomProps> = ({ isOpen, onClose, onStartGame }) => {
  const { playBeep } = useAudio();
  const [clientId] = useState(() => crypto.randomUUID());
  const [inputPin, setInputPin] = useState('');
  const [inRoom, setInRoom] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<PinRoom | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'blue' | 'white'>('blue');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [restoreRoomId] = useState(() => readStorage('pin_battle_current_room', 'session'));
  const [restorePin] = useState(() => readStorage('pin_battle_current_pin', 'session'));

  useEffect(() => {
    if (!restoreRoomId || !restorePin) return;
    let active = true;
    const restore = async () => {
      try {
        const room = await findRoomByPin(restorePin);
        if (room.id !== restoreRoomId || room.status === 'finished') return;
        const { data, error } = await supabase.from('room_groups').select('*').eq('room_id', room.id);
        const blue = data?.find(group => group.group_name === '청팀');
        const white = data?.find(group => group.group_name === '백팀');
        if (!active || error || !blue || !white) return;
        setCurrentRoom({ id: room.id, pin: room.pin_code, hostId: readStorage('pin_battle_host_' + room.id, 'session') === 'true' ? clientId : '', blueScore: blue.score, whiteScore: white.score, blueGroupId: blue.id, whiteGroupId: white.id, members: [clientId] });
        setInRoom(true);
      } catch { /* A removed saved battle can be replaced by a new PIN. */ }
    };
    void restore();
    return () => { active = false; };
  }, [restoreRoomId, restorePin, clientId]);

  const readBattle = async (id: string, pin: string): Promise<PinRoom> => {
    const { data, error } = await supabase.from('room_groups').select('*').eq('room_id', id);
    if (error) throw new Error('팀 정보를 불러오지 못했습니다. 연결 상태를 확인해주세요.');
    const blue = data?.find(group => group.group_name === '청팀');
    const white = data?.find(group => group.group_name === '백팀');
    if (!blue || !white) throw new Error('청백 학급 배틀 방이 아닙니다. 수업 참여는 홈의 PIN 입장을 이용해주세요.');
    return { id, pin, hostId: readStorage('pin_battle_host_' + id, 'session') === 'true' ? clientId : '', blueScore: blue.score, whiteScore: white.score, blueGroupId: blue.id, whiteGroupId: white.id, members: [clientId] };
  };

  const battleId = currentRoom?.id;
  useEffect(() => {
    if (!battleId) return;
    let active = true;
    const update = async () => {
      const [room, groups] = await Promise.all([
        supabase.from('game_rooms').select('status').eq('id', battleId).maybeSingle(),
        supabase.from('room_groups').select('id,score').eq('room_id', battleId),
      ]);
      if (!active) return;
      if (room.error || groups.error) { setErrorMsg('연결을 복구하고 있습니다. 잠시 후 다시 시도해주세요.'); return; }
      if (!room.data || room.data.status === 'finished') {
        setCurrentRoom(null); setInRoom(false); setErrorMsg('선생님이 배틀 방을 종료했습니다.'); return;
      }
      setErrorMsg(null);
      setCurrentRoom(previous => previous?.id === battleId ? { ...previous, blueScore: groups.data?.find(group => group.id === previous.blueGroupId)?.score ?? previous.blueScore, whiteScore: groups.data?.find(group => group.id === previous.whiteGroupId)?.score ?? previous.whiteScore } : previous);
    };
    const channel = supabase.channel('pin_battle_' + battleId, { config: { presence: { key: clientId } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_groups', filter: 'room_id=eq.' + battleId }, () => { void update(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms', filter: 'id=eq.' + battleId }, () => { void update(); })
      .on('presence', { event: 'sync' }, () => {
        const members = Object.keys(channel.presenceState());
        if (active) setCurrentRoom(previous => previous?.id === battleId ? { ...previous, members } : previous);
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') { void channel.track({ clientId }); void update(); }
        if (active && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) setErrorMsg('실시간 연결을 복구하고 있습니다.');
      });
    void update();
    const interval = window.setInterval(() => { if (navigator.onLine) void update(); }, 10000);
    return () => { active = false; clearInterval(interval); void supabase.removeChannel(channel); };
  }, [battleId, clientId]);

  const handleCreateRoom = async () => {
    if (busyRef.current) return;
    const teacherPin = readStorage('teacher_master_pin') || '1234';
    if (readStorage('teacher_session_auth', 'session') !== teacherPin) {
      const entered = prompt('이 기기의 교사 화면 잠금 PIN을 입력해주세요. (초기값: 1234)');
      if (entered !== teacherPin) { if (entered !== null) setErrorMsg('교사 PIN이 일치하지 않습니다.'); return; }
      writeStorage('teacher_session_auth', teacherPin, 'session');
    }
    busyRef.current = true; setBusy(true); setErrorMsg(null);
    try {
      const room = await createClassroom('청백 학급 배틀', null, ['청팀', '백팀']);
      writeStorage('pin_battle_host_' + room.id, 'true', 'session');
      const battle = await readBattle(room.id, room.pin_code);
      writeStorage('pin_battle_current_room', room.id, 'session');
      writeStorage('pin_battle_current_pin', room.pin_code, 'session');
      // Keep host controls usable when browser storage is unavailable.
      setCurrentRoom({ ...battle, hostId: clientId }); setInRoom(true); playBeep();
    } catch (cause) { setErrorMsg(classroomError(cause, '배틀 방 생성에 실패했습니다.')); }
    finally { busyRef.current = false; setBusy(false); }
  };

  const handleJoinRoom = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setErrorMsg(null);
    try {
      const room = await findRoomByPin(inputPin);
      if (room.status === 'finished') throw new Error('종료된 배틀 방입니다. 새 PIN을 요청해주세요.');
      const battle = await readBattle(room.id, room.pin_code);
      writeStorage('pin_battle_current_room', room.id, 'session');
      writeStorage('pin_battle_current_pin', room.pin_code, 'session');
      setCurrentRoom(battle); setInRoom(true); playBeep();
    } catch (cause) { setErrorMsg(classroomError(cause, '방 입장에 실패했습니다.')); }
    finally { busyRef.current = false; setBusy(false); }
  };

  const handleStartGame = async (gameType: string) => {
    if (!currentRoom || busyRef.current) return;
    busyRef.current = true; setBusy(true); setErrorMsg(null);
    try {
      const groupId = selectedTeam === 'blue' ? currentRoom.blueGroupId : currentRoom.whiteGroupId;
      playBeep(); onStartGame(gameType, { roomId: currentRoom.id, groupId, pin: currentRoom.pin }); onClose();
    } catch (cause) { setErrorMsg(classroomError(cause, '게임 시작에 실패했습니다.')); }
    finally { busyRef.current = false; setBusy(false); }
  };

  const handleLeaveRoom = () => { removeStorage('pin_battle_current_room', 'session'); removeStorage('pin_battle_current_pin', 'session'); setCurrentRoom(null); setInRoom(false); setInputPin(''); setErrorMsg(null); };
  const handleCloseRoom = async () => {
    if (!currentRoom || currentRoom.hostId !== clientId || busyRef.current) return;
    if (!confirm('배틀 방을 종료하시겠습니까? 모든 참가자가 퇴장합니다.')) return;
    busyRef.current = true; setBusy(true);
    try {
      const { error } = await supabase.from('game_rooms').update({ status: 'finished' }).eq('id', currentRoom.id);
      if (error) throw new Error('방 종료에 실패했습니다. 다시 시도해주세요.');
      handleLeaveRoom();
    } catch (cause) { setErrorMsg(classroomError(cause, '방 종료에 실패했습니다.')); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const handleCopyPin = async () => {
    if (!currentRoom) return;
    try { await navigator.clipboard.writeText(currentRoom.pin); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setErrorMsg('PIN ' + currentRoom.pin + '을 직접 복사해주세요.'); }
  };

  if (!isOpen) return null;

  const isHost = currentRoom?.hostId === clientId;
  const blueScore = currentRoom?.blueScore ?? 0;
  const whiteScore = currentRoom?.whiteScore ?? 0;
  const totalScore = blueScore + whiteScore;
  const bluePercent = totalScore === 0 ? 50 : Math.round((blueScore / totalScore) * 100);
  const whitePercent = 100 - bluePercent;
  const memberCount = currentRoom?.members.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-blue-500/40 rounded-3xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-6 text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
        >
          <X className="w-5 h-5" />
        </button>

        {!inRoom ? (
          /* 방 생성 / PIN 번호 입장 뷰 */
          <div className="text-center py-2">
            <div className="w-14 h-14 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/30">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-black mb-1">4자리 PIN 학급 배틀룸</h2>
            <p className="text-xs text-slate-400 mb-5">회원가입 없이 4자리 숫자만 치면 우리 반 대항전 시작!</p>

            {/* 에러 메시지 배너 */}
            {errorMsg && (
              <div className="bg-rose-500/15 border border-rose-500/40 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-rose-300 text-left mb-4 whitespace-pre-line leading-relaxed">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            {/* PIN 입력 폼 */}
            <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 mb-5">
              <label className="text-xs font-bold text-slate-300 block mb-2">선생님이 알려주신 PIN 입력</label>
              <input
                type="text"
                maxLength={4}
                value={inputPin}
                onChange={e => {
                  setErrorMsg(null);
                  setInputPin(e.target.value.replace(/[^0-9]/g, ''));
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleJoinRoom();
                }}
                placeholder="4자리 숫자 입력"
                className="w-full py-3 text-center text-3xl font-mono font-black tracking-widest bg-slate-950 border border-slate-700 rounded-xl text-cyan-400 focus:outline-none focus:border-cyan-400 mb-3"
              />
              <button
                onClick={handleJoinRoom}
                disabled={busy}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-black rounded-xl text-sm transition-all shadow-md shadow-cyan-500/20"
              >
                방 입장하기
              </button>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-2 text-slate-500 font-bold">또는</span></div>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={busy}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold rounded-xl text-sm border border-blue-400/30 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5"
            >
              <Crown className="w-4 h-4 text-amber-300" />
              선생님: 새로운 학급 배틀방 개설하기
            </button>
          </div>
        ) : (
          /* 실제 개설된 학급 배틀 룸 진행 뷰 */
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-cyan-400">배틀 방 번호</span>
                  {isHost && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40 font-bold">
                      방장(선생님)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-3xl font-mono font-black tracking-wider text-white">#{currentRoom?.pin}</p>
                  <button
                    onClick={handleCopyPin}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                    title="방 번호 복사"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 실제 실시간 참가자 수 */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 shadow-sm">
                <Users className="w-4 h-4 text-cyan-400" />
                <span className="font-extrabold text-cyan-300">{memberCount}</span>명 참가중
              </div>
            </div>

            {/* 선생님용 가이드 배너 */}
            {isHost && (
              <div className="bg-blue-950/40 border border-blue-500/30 p-2.5 rounded-xl text-xs text-blue-200 mb-4 flex items-center gap-2">
                <span>📢 칠판/TV에 방 번호 <b className="text-amber-300 font-mono text-sm">#{currentRoom?.pin}</b>를 안내해 주세요. 학생들이 접속하면 실시간으로 숫자가 올라갑니다.</span>
              </div>
            )}

            {/* 청팀 vs 백팀 스코어보드 (실제 0점에서 시작) */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div
                onClick={() => setSelectedTeam('blue')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedTeam === 'blue'
                    ? 'bg-blue-600/30 border-blue-400 shadow-lg shadow-blue-500/20 scale-[1.02]'
                    : 'bg-slate-800/50 border-slate-700 opacity-60 hover:opacity-80'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-blue-300">청팀 (Blue)</span>
                  {selectedTeam === 'blue' && <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-black">내 팀</span>}
                </div>
                <div className="text-3xl font-mono font-black text-blue-400">{blueScore} <span className="text-xs">점</span></div>
              </div>

              <div
                onClick={() => setSelectedTeam('white')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedTeam === 'white'
                    ? 'bg-slate-700/60 border-slate-300 shadow-lg shadow-white/10 scale-[1.02]'
                    : 'bg-slate-800/50 border-slate-700 opacity-60 hover:opacity-80'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-slate-200">백팀 (White)</span>
                  {selectedTeam === 'white' && <span className="text-[10px] bg-white text-slate-950 px-1.5 py-0.5 rounded font-black">내 팀</span>}
                </div>
                <div className="text-3xl font-mono font-black text-white">{whiteScore} <span className="text-xs">점</span></div>
              </div>
            </div>

            {/* 팀 점수 비율 게이지 */}
            <div className="bg-slate-800/80 p-3 rounded-2xl mb-4 border border-slate-700/60">
              <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1.5">
                <span className="text-blue-400">청팀 {bluePercent}%</span>
                <span>{totalScore === 0 ? '대결 시작 전' : `총 점수: ${totalScore}점`}</span>
                <span className="text-slate-200">백팀 {whitePercent}%</span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-700">
                <div
                  className="bg-blue-500 h-full transition-all duration-500"
                  style={{ width: `${bluePercent}%` }}
                />
                <div
                  className="bg-slate-200 h-full transition-all duration-500"
                  style={{ width: `${whitePercent}%` }}
                />
              </div>
            </div>

            {/* 선택된 팀에 점수 기여하기 */}
            <div className="space-y-2 mb-4">
              {errorMsg && <p role="alert" className="text-xs text-rose-300">{errorMsg}</p>}
              <p className="text-xs font-bold text-slate-400">
                선택된 <span className={selectedTeam === 'blue' ? 'text-blue-400 font-extrabold' : 'text-slate-200 font-extrabold'}>{selectedTeam === 'blue' ? '청팀' : '백팀'}</span>에 점수 기여하기
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleStartGame('reaction')} disabled={busy}
                  className="py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-white" /> 반응속도 (결과 점수 반영)
                </button>
                <button
                  onClick={() => handleStartGame('swipe')} disabled={busy}
                  className="py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-white" /> 방향 스와이프 (결과 점수 반영)
                </button>
              </div>
            </div>

            {/* 하단 제어 버튼 (나가기 / 방 종료) */}
            <div className="flex gap-2">
              <button
                onClick={handleLeaveRoom}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold rounded-xl flex items-center justify-center gap-1 border border-slate-700"
              >
                <LogOut className="w-3.5 h-3.5" /> 방 나가기
              </button>
              {isHost && (
                <button
                  onClick={handleCloseRoom}
                  className="py-2.5 px-4 bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 text-xs font-bold rounded-xl border border-rose-500/40"
                >
                  방 종료
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
