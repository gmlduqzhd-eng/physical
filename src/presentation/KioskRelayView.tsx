import {ensureClassroomTeacher} from '../data/supabase';
import React, { useState, useRef } from 'react';
import { useGameLogic } from '../application/useGameLogic';
import { useGameTimer } from '../application/useGameTimer';
import { ScoreRepository } from '../data/scoreRepository';
import { findRoomByPin, classroomError } from '../data/classroomRepository';
import type { RoomGroup } from '../domain/types';
import { GameIcons as LucideIcons } from './icons';
import { useNavigate } from 'react-router-dom';
import { CircleHelp } from 'lucide-react';
import { HeaderToolbar } from './components/HeaderToolbar';
import './StudentUi.css';

export const KioskRelayView = () => {
  const [pinCode, setPinCode] = useState('');
  const [roomId, setRoomId] = useState<string | undefined>();
  const { gameRoom: room, scores: groups, template, error: roomError, loading: roomLoading, refresh } = useGameLogic(roomId);
  const { isTimeUp } = useGameTimer(room);
  const isActive = Boolean(room && ['playing', 'boss_raid', 'time_attack', 'defense', 'zombie', 'mafia', 'tsunami'].includes(room.status) && !isTimeUp);
  const [selectedGroup, setSelectedGroup] = useState<RoomGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const submitting = useRef(false);
  // 응답만 끊긴 뒤 다시 누르면 같은 제출로 보내 점수가 두 번 들어가지 않게 한다(서버는 actionId로 한 번만 반영).
  const pendingAction = useRef<{ groupId: string; amount: number; id: string } | null>(null);
  const navigate = useNavigate();

  const handleEnterRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try { await ensureClassroomTeacher(); const found = await findRoomByPin(pinCode); setRoomId(found.id); }
    catch (cause) { setError(classroomError(cause, '방 접속에 실패했습니다.')); }
    finally { setLoading(false); }
  };

  const handleMissionComplete = async (amount: number) => {
    if (!selectedGroup || !isActive || submitting.current) return;
    submitting.current = true; setLoading(true); setError('');
    try {
      const prior = pendingAction.current;
      const action = prior && prior.groupId === selectedGroup.id && prior.amount === amount ? prior : { groupId: selectedGroup.id, amount, id: crypto.randomUUID() };
      pendingAction.current = action;
      const result = await ScoreRepository.saveScoreAction(selectedGroup.id, amount, action.id);
      if (result === 'retry') throw new Error('점수를 저장하지 못했습니다. 다시 시도해주세요.');
      pendingAction.current = null;
      if (result === 'obsolete') throw new Error('이 수업방에는 더 이상 점수를 줄 수 없어요. 수업 상태를 확인해 주세요.');
      setSuccessMsg(result === 'pending'
        ? `[${selectedGroup.group_name}] 조의 ${amount}점은 선생님이 확인하면 반영돼요. 다음 주자에게 패드를 넘기세요!`
        : `🎉 [${selectedGroup.group_name}] 조에 ${amount}점이 지급되었습니다! 다음 주자에게 패드를 넘기세요!`);
      setSelectedGroup(null); refresh();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (cause) { setError(classroomError(cause, '미션 저장에 실패했습니다.')); }
    finally { submitting.current = false; setLoading(false); }
  };

  if (!room) {
    return (
      <div className="sui-scope min-h-[100dvh] bg-slate-900 text-white flex flex-col items-center pt-24 pb-20 p-6 font-sans relative overflow-y-auto">
        <div className="absolute top-6 left-6 right-6"><HeaderToolbar><button className="icon-toolbar-action" type="button" title="홈으로" onClick={() => navigate('/')}><LucideIcons.Home aria-hidden="true"/><span>홈으로</span></button><button className="icon-toolbar-action" type="button" title="이용 안내" onClick={() => navigate('/manual')}><CircleHelp aria-hidden="true"/><span>이용 안내</span></button></HeaderToolbar></div>
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 w-full max-w-sm flex flex-col items-center">
          <LucideIcons.MonitorSmartphone className="w-20 h-20 text-cyan-400 mb-4 animate-pulse" />
          <h1 className="text-2xl font-black mb-2 text-center">공용 키오스크 스테이션 모드</h1>
          <p className="text-slate-300 text-sm mb-6 text-center break-keep">교사 인증 후 소유한 방의 8자리 PIN을 입력합니다. 여러 모둠의 점수를 기록하는 공용 기기는 교사가 관리하세요.</p>
          <form onSubmit={handleEnterRoom} className="w-full flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="PIN 번호" 
              inputMode="numeric"
              maxLength={8}
              value={pinCode}
              onChange={e => setPinCode(e.target.value.replace(/\D/g, ''))}
              className="bg-black/30 border border-white/20 px-4 py-4 rounded-xl text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-cyan-400 w-full uppercase"
            />
            <button disabled={loading} type="submit" className="ui-btn ui-btn--primary ui-btn--lg sui-block">
              {loading || (roomId && roomLoading) ? '확인 중...' : '스테이션 시작'}
            </button>
            {(error || (roomId && roomError)) && <p role="alert" className="text-rose-300 text-sm text-center">{error || roomError}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="sui-scope min-h-[100dvh] bg-slate-900 text-white p-6 pt-12 pb-24 flex flex-col items-center relative font-sans overflow-y-auto">
      <div className="w-full max-w-2xl mb-6"><HeaderToolbar><button className="icon-toolbar-action" type="button" title="홈으로" onClick={() => navigate('/')}><LucideIcons.Home aria-hidden="true"/><span>홈으로</span></button><button className="icon-toolbar-action" type="button" title="이용 안내" onClick={() => navigate('/manual')}><CircleHelp aria-hidden="true"/><span>이용 안내</span></button></HeaderToolbar></div>
      <button onClick={() => { setRoomId(undefined); setSelectedGroup(null); }} className="ui-btn ui-btn--secondary mb-4">다른 수업 입장</button>
      {(error || roomError) && <p role="alert" className="mb-4 text-rose-300">{error || roomError}</p>}
      {!isActive && <p className="mb-4 text-amber-300 font-bold">{room.status === 'finished' ? '수업이 종료되었습니다.' : isTimeUp ? '제한 시간이 끝났습니다.' : '선생님이 수업을 시작하거나 재개할 때까지 기다려주세요.'}</p>}
      {!template?.buttons.length && <p className="mb-4 text-amber-300">등록된 미션이 없습니다. 선생님에게 템플릿을 확인해달라고 요청해주세요.</p>}
      {successMsg && (
        <div className="absolute inset-0 z-50 bg-emerald-600 flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
          <LucideIcons.CheckCircle className="w-32 h-32 text-white mb-6 animate-bounce" />
          <h2 className="text-4xl font-black text-center break-keep leading-tight text-white drop-shadow-md">{successMsg}</h2>
        </div>
      )}
      
      {!selectedGroup ? (
        <div className="w-full max-w-2xl flex flex-col items-center">
          <h1 className="text-3xl font-black text-cyan-400 mb-2">🏃‍♂️ 릴레이 스테이션</h1>
          <p className="text-slate-400 font-bold mb-8 text-center text-lg">달려와서 본인의 조를 선택하고 임무를 수행하세요!</p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
            {groups.map(g => (
              <button 
                key={g.id}
                onClick={() => setSelectedGroup(g)}
                className="bg-white/10 hover:bg-white/20 border border-white/20 p-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-transform active:scale-95"
              >
                <div className="w-16 h-16 rounded-full bg-cyan-900 flex items-center justify-center border-2 border-cyan-500 text-2xl">{g.avatar}</div>
                <span className="font-black text-xl">{g.group_name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md flex flex-col items-center">
          <button onClick={() => setSelectedGroup(null)} className="ui-btn ui-btn--secondary mb-6">&larr; 조 다시 선택하기</button>
          <div className="bg-slate-800 p-6 rounded-3xl border-2 border-cyan-500 w-full shadow-2xl flex flex-col items-center shadow-cyan-900/50">
            <span className="text-cyan-400 font-bold mb-2">현재 도전자</span>
            <span className="text-3xl font-black mb-8">{selectedGroup.group_name} 조</span>
            
            <p className="text-slate-300 mb-4 font-bold text-center">아래 임무 중 하나를 완수하세요!</p>
            <div className="w-full flex flex-col gap-3">
              {template?.buttons?.slice(0, 3).map((m, i) => {
                const IconComp = (LucideIcons as unknown as Record<string, React.ElementType>)[m.iconName] || LucideIcons.Activity;
                return (
                  <button 
                    key={i}
                    onClick={() => handleMissionComplete(m.amount * 3)}
                    disabled={!isActive || loading}
                    className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 border-transparent transition-transform active:scale-95 ${m.bg} shadow-lg`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <IconComp className={`w-6 h-6 ${m.color}`} />
                      </div>
                      <div className="text-left text-slate-900">
                        <div className="font-black text-lg leading-tight">{m.title}</div>
                      </div>
                    </div>
                    <span className="font-black text-2xl text-slate-900">+{m.amount * 3}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-slate-500 mt-6 text-center">키오스크 모드에서는 기본 점수의 3배가 지급됩니다!</p>
          </div>
        </div>
      )}
    </div>
  );
};
