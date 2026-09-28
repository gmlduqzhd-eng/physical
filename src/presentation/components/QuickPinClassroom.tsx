import React, { useState, useEffect, useCallback } from 'react';
import { X, Users, Play, AlertCircle, Copy, Check, Crown, LogOut } from 'lucide-react';
import { useAudio } from '../../application/useAudio';

interface QuickPinClassroomProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: (gameType: string) => void;
}

interface PinRoom {
  pin: string;
  createdAt: number;
  hostId: string;
  blueScore: number;
  whiteScore: number;
  members: string[];
}

const STORAGE_KEY = 'dambang_pin_battles_v1';
const CHANNEL_NAME = 'dambang_pin_battle_sync';

// 로컬스토리지 방 목록 가져오기 (6시간 지난 방 자동 정리)
const getStoredRooms = (): Record<string, PinRoom> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: Record<string, PinRoom> = JSON.parse(raw);
    const now = Date.now();
    const validRooms: Record<string, PinRoom> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (now - v.createdAt < 6 * 3600 * 1000) {
        validRooms[k] = v;
      }
    }
    return validRooms;
  } catch {
    return {};
  }
};

const saveStoredRooms = (rooms: Record<string, PinRoom>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
  } catch (e) {
    console.warn('Failed to save pin rooms', e);
  }
};

export const QuickPinClassroom: React.FC<QuickPinClassroomProps> = ({ isOpen, onClose, onStartGame }) => {
  const { playBeep } = useAudio();

  // 브라우저 탭 고유 클라이언트 ID 생성
  const [clientId] = useState<string>(() => {
    try {
      let id = sessionStorage.getItem('pin_battle_client_id');
      if (!id) {
        id = 'user_' + Math.random().toString(36).substring(2, 9);
        sessionStorage.setItem('pin_battle_client_id', id);
      }
      return id;
    } catch {
      return 'user_client';
    }
  });

  const [inputPin, setInputPin] = useState<string>('');
  const [inRoom, setInRoom] = useState<boolean>(false);
  const [currentRoom, setCurrentRoom] = useState<PinRoom | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'blue' | 'white'>('blue');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // 실시간 동기화 채널 (BroadcastChannel)
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    const channel = new BroadcastChannel(CHANNEL_NAME);

    channel.onmessage = (event: MessageEvent) => {
      const { type, pin, room, team, points, targetClientId } = event.data || {};

      if (type === 'ROOM_CREATED' && room) {
        // 새 방 개설 알림
      }

      if (currentRoom && currentRoom.pin === pin) {
        if (type === 'JOIN' && targetClientId) {
          setCurrentRoom(prev => {
            if (!prev) return null;
            if (prev.members.includes(targetClientId)) return prev;
            return {
              ...prev,
              members: [...prev.members, targetClientId]
            };
          });
        } else if (type === 'SCORE_UPDATE') {
          setCurrentRoom(prev => {
            if (!prev) return null;
            return {
              ...prev,
              blueScore: team === 'blue' ? prev.blueScore + points : prev.blueScore,
              whiteScore: team === 'white' ? prev.whiteScore + points : prev.whiteScore
            };
          });
        } else if (type === 'ROOM_CLOSED') {
          alert('방장(선생님)이 배틀 방을 종료했습니다.');
          setInRoom(false);
          setCurrentRoom(null);
        }
      }
    };

    // 다른 탭에서의 localStorage 변경 감지
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && currentRoom) {
        const rooms = getStoredRooms();
        if (rooms[currentRoom.pin]) {
          setCurrentRoom(rooms[currentRoom.pin]);
        }
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      channel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [currentRoom]);

  // 방 개설 (선생님)
  const handleCreateRoom = useCallback(() => {
    setErrorMsg(null);
    const rooms = getStoredRooms();

    // 중복 없는 4자리 핀 생성
    let newPin = '';
    for (let i = 0; i < 10; i++) {
      const candidate = Math.floor(1000 + Math.random() * 9000).toString();
      if (!rooms[candidate]) {
        newPin = candidate;
        break;
      }
    }
    if (!newPin) newPin = Math.floor(1000 + Math.random() * 9000).toString();

    const newRoom: PinRoom = {
      pin: newPin,
      createdAt: Date.now(),
      hostId: clientId,
      blueScore: 0,
      whiteScore: 0,
      members: [clientId]
    };

    rooms[newPin] = newRoom;
    saveStoredRooms(rooms);

    try {
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage({ type: 'ROOM_CREATED', room: newRoom });
        channel.close();
      }
    } catch {
      // 브로드캐스트 미지원 또는 실패 무시
    }

    setCurrentRoom(newRoom);
    setInRoom(true);
    playBeep();
  }, [clientId, playBeep]);

  // 방 입장 (학생)
  const handleJoinRoom = useCallback(() => {
    setErrorMsg(null);
    const trimmed = inputPin.trim();

    if (trimmed.length !== 4) {
      setErrorMsg('4자리 숫자 방 번호(PIN)를 정확히 입력해 주세요.');
      return;
    }

    const rooms = getStoredRooms();
    const foundRoom = rooms[trimmed];

    // 방이 존재하지 않는 경우 확실하게 차단!
    if (!foundRoom) {
      setErrorMsg(`개설되지 않았거나 종료된 방 번호(#${trimmed})입니다.\n선생님께서 먼저 '학급 배틀방 개설하기'로 방을 열었는지 확인해 주세요.`);
      return;
    }

    // 참가자 목록에 내 clientId 등록
    if (!foundRoom.members.includes(clientId)) {
      foundRoom.members.push(clientId);
      rooms[trimmed] = foundRoom;
      saveStoredRooms(rooms);

      try {
        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel(CHANNEL_NAME);
          channel.postMessage({ type: 'JOIN', pin: trimmed, targetClientId: clientId });
          channel.close();
        }
      } catch {
        // 브로드캐스트 미지원 또는 실패 무시
      }
    }

    setCurrentRoom(foundRoom);
    setInRoom(true);
    playBeep();
  }, [inputPin, clientId, playBeep]);

  // 점수 기여
  const handleAddScore = useCallback((points: number) => {
    if (!currentRoom) return;
    playBeep();

    const rooms = getStoredRooms();
    const room = rooms[currentRoom.pin] || currentRoom;

    const updatedRoom: PinRoom = {
      ...room,
      blueScore: selectedTeam === 'blue' ? room.blueScore + points : room.blueScore,
      whiteScore: selectedTeam === 'white' ? room.whiteScore + points : room.whiteScore
    };

    rooms[currentRoom.pin] = updatedRoom;
    saveStoredRooms(rooms);
    setCurrentRoom(updatedRoom);

    try {
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage({
          type: 'SCORE_UPDATE',
          pin: currentRoom.pin,
          team: selectedTeam,
          points
        });
        channel.close();
      }
    } catch {
      // 브로드캐스트 실패 무시
    }
  }, [currentRoom, selectedTeam, playBeep]);

  // 방 나가기
  const handleLeaveRoom = () => {
    if (currentRoom) {
      const rooms = getStoredRooms();
      if (rooms[currentRoom.pin]) {
        rooms[currentRoom.pin].members = rooms[currentRoom.pin].members.filter(m => m !== clientId);
        saveStoredRooms(rooms);
      }
    }
    setInRoom(false);
    setCurrentRoom(null);
    setInputPin('');
    setErrorMsg(null);
  };

  // 방 종료 (선생님 권한)
  const handleCloseRoom = () => {
    if (!currentRoom) return;
    if (confirm(`정말 #${currentRoom.pin} 배틀 방을 종료하시겠습니까? 모든 참가자가 퇴장됩니다.`)) {
      const rooms = getStoredRooms();
      delete rooms[currentRoom.pin];
      saveStoredRooms(rooms);

      try {
        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel(CHANNEL_NAME);
          channel.postMessage({ type: 'ROOM_CLOSED', pin: currentRoom.pin });
          channel.close();
        }
      } catch {
        // 브로드캐스트 미지원 또는 실패 무시
      }

      setInRoom(false);
      setCurrentRoom(null);
      setInputPin('');
      setErrorMsg(null);
    }
  };

  const handleCopyPin = () => {
    if (!currentRoom) return;
    navigator.clipboard?.writeText(currentRoom.pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <div className="bg-slate-900 border border-blue-500/40 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
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
              <p className="text-xs font-bold text-slate-400">
                선택된 <span className={selectedTeam === 'blue' ? 'text-blue-400 font-extrabold' : 'text-slate-200 font-extrabold'}>{selectedTeam === 'blue' ? '청팀' : '백팀'}</span>에 점수 기여하기
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    handleAddScore(20);
                    onStartGame('reaction');
                    onClose();
                  }}
                  className="py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-white" /> 반응속도 (+20P)
                </button>
                <button
                  onClick={() => {
                    handleAddScore(20);
                    onStartGame('swipe');
                    onClose();
                  }}
                  className="py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-white" /> 방향 스와이프 (+20P)
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
