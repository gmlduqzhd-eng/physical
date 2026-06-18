import { useState, useEffect } from 'react';
import { supabase } from '../data/supabase';
import type { GameRoom, MissionTemplate, RoomGroup } from '../domain/types';
import { ShieldAlert, Play, Pause, RotateCcw, Waves, Bug, Plus, Key } from 'lucide-react';
import { TemplateBuilder } from './TemplateBuilder';

export const AdminControlPanel = () => {
  const [activeTab, setActiveTab] = useState<'rooms' | 'templates' | 'create_template'>('rooms');
  
  // Data
  const [templates, setTemplates] = useState<MissionTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<MissionTemplate | null>(null);
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  
  // Selected Room Data
  const [roomGroups, setRoomGroups] = useState<RoomGroup[]>([]);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);

  useEffect(() => {
    fetchTemplates();
    fetchRooms();
  }, []);

  useEffect(() => {
    if (selectedRoomId) {
      fetchRoomDetails(selectedRoomId);
      
      const sub = supabase.channel('admin_room_groups')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_groups', filter: `room_id=eq.${selectedRoomId}` }, () => {
          fetchRoomDetails(selectedRoomId);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${selectedRoomId}` }, () => {
          fetchRoomDetails(selectedRoomId);
        })
        .subscribe();
        
      return () => { supabase.removeChannel(sub); };
    }
  }, [selectedRoomId]);

  const fetchTemplates = async () => {
    const { data } = await supabase.from('mission_templates').select('*').order('created_at', { ascending: false });
    if (data) setTemplates(data);
  };

  const fetchRooms = async () => {
    const { data } = await supabase.from('game_rooms').select('*').order('created_at', { ascending: false });
    if (data) setRooms(data);
  };

  const fetchRoomDetails = async (id: string) => {
    const { data: room } = await supabase.from('game_rooms').select('*').eq('id', id).single();
    if (room) setCurrentRoom(room);
    
    const { data: groups } = await supabase.from('room_groups').select('*').eq('room_id', id).order('score', { ascending: false });
    if (groups) setRoomGroups(groups);
  };

  const createRoom = async (templateId: string) => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString(); // 4자리 랜덤 핀
    const name = prompt('새로운 방의 이름을 입력하세요', '체육 미션 방');
    if (!name) return;
    
    await supabase.from('game_rooms').insert([{ pin_code: pin, name, template_id: templateId }]);
    fetchRooms();
  };

  // --- Room Control Actions ---
  const handleStatusChange = async (status: 'playing' | 'paused') => {
    if (!currentRoom) return;
    if (status === 'playing') {
      await supabase.from('game_rooms').update({ status: 'playing', started_at: new Date().toISOString() }).eq('id', currentRoom.id);
    } else {
      await supabase.from('game_rooms').update({ status: 'paused', started_at: null }).eq('id', currentRoom.id);
    }
  };

  const handleTimeModifier = async (amount: number) => {
    if (!currentRoom) return;
    await supabase.from('game_rooms')
      .update({ global_time_modifier: currentRoom.global_time_modifier + amount })
      .eq('id', currentRoom.id);
  };

  const triggerTsunami = async () => {
    if (!currentRoom) return;
    const newStatus = currentRoom.status === 'tsunami' ? 'playing' : 'tsunami';
    await supabase.from('game_rooms').update({ status: newStatus }).eq('id', currentRoom.id);
  };

  const toggleHack = async (groupId: string, isHacked: boolean) => {
    await supabase.from('room_groups').update({ is_hacked: !isHacked }).eq('id', groupId);
  };

  const handleReset = async () => {
    if(!currentRoom) return;
    if(window.confirm('정말 이 방의 데이터를 초기화하시겠습니까?')) {
      await supabase.from('game_rooms').update({ status: 'paused', global_time_modifier: 0, started_at: null }).eq('id', currentRoom.id);
      await supabase.from('room_groups').update({ score: 0, is_defused: false, is_hacked: false, item_buff_until: null }).eq('room_id', currentRoom.id);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white p-6 md:p-10 font-sans pb-20">
      <div className="max-w-4xl mx-auto space-y-6 relative">
        <h1 className="text-3xl font-black flex items-center gap-3 text-cyan-400 relative z-10 mb-8">
          <ShieldAlert className="w-10 h-10 text-cyan-500" /> 교사 제어 패널
        </h1>

        {activeTab !== 'create_template' && (
          <div className="flex gap-4 border-b border-slate-700 pb-2 mb-6">
            <button onClick={() => setActiveTab('rooms')} className={`font-bold px-4 py-2 ${activeTab === 'rooms' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500'}`}>방 관리 (Rooms)</button>
            <button onClick={() => setActiveTab('templates')} className={`font-bold px-4 py-2 ${activeTab === 'templates' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500'}`}>템플릿 관리</button>
          </div>
        )}

        {activeTab === 'create_template' && (
          <TemplateBuilder 
            initialTemplate={editingTemplate}
            onBack={() => {
              setEditingTemplate(null);
              setActiveTab('templates');
            }} 
            onSuccess={() => {
              fetchTemplates();
              setEditingTemplate(null);
              setActiveTab('templates');
            }} 
          />
        )}

        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-slate-400">등록된 템플릿 목록입니다. 이 템플릿들을 기반으로 새로운 방을 만들 수 있습니다.</p>
              <button onClick={() => { setEditingTemplate(null); setActiveTab('create_template'); }} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold flex items-center gap-2">
                <Plus className="w-4 h-4"/> 새 템플릿 만들기
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(t => (
                <div key={t.id} className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-white">{t.name}</h3>
                      <p className="text-sm text-slate-400 mt-1">버튼 개수: {t.buttons.length}개</p>
                    </div>
                    <button 
                      onClick={() => { setEditingTemplate(t); setActiveTab('create_template'); }} 
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-600 transition-colors"
                    >
                      수정
                    </button>
                  </div>
                  <button onClick={() => createRoom(t.id)} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4"/> 이 템플릿으로 새 방 파기
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rooms' && !selectedRoomId && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">진행 중인 방 목록</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map(r => (
                <div key={r.id} onClick={() => setSelectedRoomId(r.id)} className="bg-slate-900 p-5 rounded-xl border border-slate-700 hover:border-cyan-500 cursor-pointer transition-colors">
                  <h3 className="font-bold text-xl mb-1 flex items-center gap-2 text-white"><Key className="w-5 h-5 text-yellow-400"/> {r.pin_code}</h3>
                  <p className="text-slate-300 font-bold">{r.name}</p>
                  <p className="text-sm text-slate-500 mt-2">상태: {r.status}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rooms' && selectedRoomId && currentRoom && (
          <div className="space-y-6">
            <button onClick={() => setSelectedRoomId(null)} className="text-cyan-400 font-bold hover:underline mb-4 inline-block">&larr; 방 목록으로 돌아가기</button>
            
            <div className="bg-slate-800 p-4 rounded-xl flex justify-between items-center border border-slate-700">
              <div>
                <h2 className="text-2xl font-black text-white">{currentRoom.name}</h2>
                <p className="text-cyan-400 font-bold mt-1">접속 핀 번호: {currentRoom.pin_code}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 통제 영역 */}
              <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-700/50 shadow-xl">
                <h2 className="text-lg font-bold text-slate-300 mb-4">방 상태 통제</h2>
                <div className="flex gap-4">
                  <button onClick={triggerTsunami} className={`flex-1 py-4 flex flex-col items-center justify-center gap-2 rounded-xl font-bold transition-all ${currentRoom.status === 'tsunami' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.6)] animate-pulse' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                    <Waves className="w-8 h-8" />
                    {currentRoom.status === 'tsunami' ? '해일 경보 해제' : '해일 경보 발동'}
                  </button>
                  <div className="flex-1 flex flex-col justify-center gap-2">
                    <button onClick={() => handleStatusChange('playing')} className={`py-3 flex items-center justify-center gap-2 rounded-xl font-bold transition-all ${currentRoom.status === 'playing' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      <Play className="w-5 h-5" /> 타이머 시작
                    </button>
                    <button onClick={() => handleStatusChange('paused')} className={`py-3 flex items-center justify-center gap-2 rounded-xl font-bold transition-all ${currentRoom.status === 'paused' ? 'bg-yellow-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      <Pause className="w-5 h-5" /> 일시 정지
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 w-full">
                  <button onClick={() => handleTimeModifier(-30)} className="flex-1 py-2 bg-red-950/50 text-red-400 rounded-lg font-bold border border-red-900/50">-30초</button>
                  <button onClick={() => handleTimeModifier(30)} className="flex-1 py-2 bg-cyan-950/50 text-cyan-400 rounded-lg font-bold border border-cyan-900/50">+30초</button>
                </div>
              </div>

              {/* 모둠 통제 보드 */}
              <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-700/50 shadow-xl">
                <h2 className="text-lg font-bold text-slate-300 mb-4">접속한 모둠 ({roomGroups.length}팀)</h2>
                <div className="grid grid-cols-2 gap-4">
                  {roomGroups.map(s => (
                    <div key={s.id} className={`p-4 rounded-xl border flex flex-col items-center gap-2 ${s.is_hacked ? 'bg-red-950/50 border-red-500 animate-pulse' : 'bg-slate-800 border-slate-700'}`}>
                      <div className="flex justify-between w-full items-center">
                        <span className="font-bold text-slate-200">{s.group_name}</span>
                      </div>
                      <div className="text-2xl font-mono font-black text-cyan-400">{s.score}</div>
                      <button onClick={() => toggleHack(s.id, !!s.is_hacked)} className={`mt-2 w-full py-1.5 rounded text-sm font-bold flex items-center justify-center gap-1 ${s.is_hacked ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                        <Bug className="w-4 h-4" /> {s.is_hacked ? '해킹 해제' : '해킹 침투'}
                      </button>
                    </div>
                  ))}
                  {roomGroups.length === 0 && <p className="text-slate-500 col-span-2">아직 접속한 모둠이 없습니다.</p>}
                </div>
              </div>
            </div>

            <button onClick={handleReset} className="px-6 py-4 bg-red-950/40 hover:bg-red-900/60 text-red-500 border border-red-900/50 font-bold rounded-xl w-full flex justify-center items-center gap-2 transition-colors">
              <RotateCcw className="w-5 h-5" /> 이 방의 모든 점수 초기화
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
