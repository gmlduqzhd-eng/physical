import React, { useState } from 'react';
import { supabase } from '../data/supabase';
import type { GameRoom, RoomGroup, MissionTemplate } from '../domain/types';
import * as LucideIcons from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const KioskRelayView = () => {
  const [pinCode, setPinCode] = useState('');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [groups, setGroups] = useState<RoomGroup[]>([]);
  const [template, setTemplate] = useState<MissionTemplate | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<RoomGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  const handleEnterRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: rooms } = await supabase.from('game_rooms').select('*').eq('pin_code', pinCode).single();
    if (!rooms) {
      alert('방을 찾을 수 없습니다.');
      setLoading(false);
      return;
    }
    setRoom(rooms as GameRoom);
    
    if (rooms.template_id) {
      const { data: t } = await supabase.from('mission_templates').select('*').eq('id', rooms.template_id).single();
      if (t) setTemplate(t as MissionTemplate);
    }

    const { data: groupData } = await supabase.from('room_groups').select('*').eq('room_id', rooms.id).order('group_name');
    if (groupData) setGroups(groupData as RoomGroup[]);
    
    setLoading(false);
  };

  const handleMissionComplete = async (amount: number) => {
    if (!selectedGroup) return;
    
    // give points via rpc or just direct update for simplicity, since it's a relay kiosk
    // Actually, incrementing score directly in JS is prone to race conditions if not using RPC.
    // Let's use RPC if possible, but we don't have an increment_score RPC.
    // Instead we can just do a standard read/write, since Kiosk is used sequentially!
    const { data } = await supabase.from('room_groups').select('score').eq('id', selectedGroup.id).single();
    if (data) {
      await supabase.from('room_groups').update({ score: data.score + amount }).eq('id', selectedGroup.id);
    }
    
    setSuccessMsg(`🎉 [${selectedGroup.group_name}] 조에 ${amount}점이 지급되었습니다! 다음 주자에게 패드를 넘기세요!`);
    setSelectedGroup(null);
    
    setTimeout(() => {
      setSuccessMsg('');
    }, 5000);
  };

  if (!room) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 text-white flex flex-col items-center pt-24 pb-20 p-6 font-sans relative overflow-y-auto">
        <button onClick={() => navigate('/')} className="absolute top-6 left-6 px-4 py-2 bg-white/10 text-white border border-white/20 rounded-xl font-bold hover:bg-white/20 flex items-center gap-2">
          <LucideIcons.Home className="w-5 h-5"/> 홈
        </button>
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 w-full max-w-sm flex flex-col items-center">
          <LucideIcons.MonitorSmartphone className="w-20 h-20 text-cyan-400 mb-4 animate-pulse" />
          <h1 className="text-2xl font-black mb-2 text-center">공용 키오스크 스테이션 모드</h1>
          <p className="text-slate-300 text-sm mb-6 text-center break-keep">선생님이 알려주신 방 PIN 번호를 입력하여 공용 패드 모드로 진입하세요.</p>
          <form onSubmit={handleEnterRoom} className="w-full flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="PIN 번호" 
              maxLength={6}
              value={pinCode}
              onChange={e => setPinCode(e.target.value)}
              className="bg-black/30 border border-white/20 px-4 py-4 rounded-xl text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-cyan-400 w-full uppercase"
            />
            <button disabled={loading} type="submit" className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold text-lg transition-colors">
              {loading ? '확인 중...' : '스테이션 시작'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-900 text-white p-6 pt-12 pb-24 flex flex-col items-center relative font-sans overflow-y-auto">
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
          <button onClick={() => setSelectedGroup(null)} className="mb-6 px-4 py-2 bg-white/10 rounded-full text-slate-300 font-bold hover:bg-white/20">&larr; 조 다시 선택하기</button>
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
            <p className="text-xs text-slate-500 mt-6 text-center">키오스크 모드에서는 기본 점수의 3배가 지급됩니다!</p>
          </div>
        </div>
      )}
    </div>
  );
};
