/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../data/supabase';
import type { GameRoom, MissionTemplate, RoomGroup } from '../domain/types';
import { ShieldAlert, Play, Pause, RotateCcw, Waves, Bug, Plus, Key, Clock, Home } from 'lucide-react';
import { TemplateBuilder } from './TemplateBuilder';
import { useGameTimer } from '../application/useGameTimer';
import * as LucideIcons from 'lucide-react';

const QUIZ_LIST = [
  { question: "다음 중 달리기 전 가장 알맞은 준비운동은?", options: ["가만히 누워있기", "가볍게 걷기와 스트레칭", "전력 질주하기", "물 1리터 원샷하기"], answer: 1, reward: 300 },
  { question: "농구공을 튀기면서 이동하는 기술의 이름은?", options: ["패스", "슈팅", "드리블", "블로킹"], answer: 2, reward: 300 },
  { question: "플랭크 운동은 주로 우리 몸의 어느 부위를 단련할까요?", options: ["코어(복부/허리)", "종아리", "손목", "목"], answer: 0, reward: 300 },
  { question: "다음 중 유산소 운동이 아닌 것은?", options: ["자전거 타기", "수영", "역도(무거운 바벨 들기)", "오래 달리기"], answer: 2, reward: 300 }
];

export const AdminControlPanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState<'rooms' | 'templates' | 'create_template'>('rooms');
  const navigate = useNavigate();
  
  // Data
  const [templates, setTemplates] = useState<MissionTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<MissionTemplate | null>(null);
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  
  // Selected Room Data
  const [roomGroups, setRoomGroups] = useState<RoomGroup[]>([]);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [announcementText, setAnnouncementText] = useState('');

  const { mins, secs, isDanger } = useGameTimer(currentRoom);

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

  useEffect(() => {
    fetchTemplates();
    fetchRooms();
  }, []);

  const [prevSelectedRoomId, setPrevSelectedRoomId] = useState(selectedRoomId);
  if (selectedRoomId !== prevSelectedRoomId) {
    setPrevSelectedRoomId(selectedRoomId);
    if (!selectedRoomId) {
      setCurrentRoom(null);
      setRoomGroups([]);
    }
  }

  useEffect(() => {
    if (selectedRoomId) {
      fetchRoomDetails(selectedRoomId);
      
      const channelName = `admin_room_groups_${selectedRoomId}`;
      const sub = supabase.channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_groups', filter: `room_id=eq.${selectedRoomId}` }, () => {
          fetchRoomDetails(selectedRoomId);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${selectedRoomId}` }, () => {
          fetchRoomDetails(selectedRoomId);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(sub);
      };
    }
  }, [selectedRoomId]);

  const createRoom = async (templateId: string) => {
    // eslint-disable-next-line react-hooks/purity
    const pin = Math.floor(1000 + Math.random() * 9000).toString(); // 4자리 랜덤 핀
    const name = prompt('새로운 방의 이름을 입력하세요', '오늘의 원정대');
    if (!name) return;
    
    await supabase.from('game_rooms').insert([{ pin_code: pin, name, template_id: templateId }]);
    fetchRooms();
  };

  // --- Room Control Actions ---
  const handleStatusChange = async (status: 'playing' | 'paused') => {
    if (!currentRoom) return;
    if (status === 'playing') {
      const updates: Record<string, string> = { status: 'playing' };
      if (!currentRoom.started_at) updates.started_at = new Date().toISOString();
      await supabase.from('game_rooms').update(updates).eq('id', currentRoom.id);
    } else {
      await supabase.from('game_rooms').update({ status: 'paused' }).eq('id', currentRoom.id);
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

  const sendAnnouncement = async () => {
    if (!currentRoom) return;
    if (!announcementText.trim()) return;
    await supabase.from('game_rooms').update({ announcement: announcementText.trim() }).eq('id', currentRoom.id);
  };

  const clearAnnouncement = async () => {
    if (!currentRoom) return;
    setAnnouncementText('');
    await supabase.from('game_rooms').update({ announcement: null }).eq('id', currentRoom.id);
  };

  const roomGroupsRef = useRef(roomGroups);
  useEffect(() => {
    roomGroupsRef.current = roomGroups;
  }, [roomGroups]);

  useEffect(() => {
    if (!currentRoom) return;
    
    // Boss HP tracking
    const bossHpRef = { current: currentRoom.boss_hp || 10000 };
    
    const channel = supabase.channel(`room:${currentRoom.id}:global`)
      .on('broadcast', { event: 'boss_damage' }, (e) => {
        bossHpRef.current -= (e.payload.amount || 1);
      }).subscribe();
      
    const interval = setInterval(() => {
      if (currentRoom.status === 'boss_raid') {
        supabase.from('game_rooms').update({ boss_hp: bossHpRef.current }).eq('id', currentRoom.id).then();
        if (bossHpRef.current <= 0) {
          supabase.from('game_rooms').update({ status: 'playing', boss_hp: null, boss_max_hp: null }).eq('id', currentRoom.id).then();
          alert('🎉 보스 레이드 토벌 성공! 모든 학생들의 화면이 원래대로 돌아갑니다.');
        }
      }
    }, 1000);

    const defenseInterval = setInterval(() => {
      if (currentRoom.status === 'defense') {
        roomGroupsRef.current.forEach((g: RoomGroup) => {
          supabase.rpc('increment_score', { row_id: g.id, amount: -5 }).then();
        });
      }
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      clearInterval(defenseInterval);
    };
  }, [currentRoom]);

  const sendMinigame = async () => {
    if (!currentRoom) return;
    const randomQuiz = QUIZ_LIST[Math.floor(Math.random() * QUIZ_LIST.length)];
    await supabase.from('game_rooms').update({ active_minigame: randomQuiz }).eq('id', currentRoom.id);
    alert('돌발 퀴즈가 발송되었습니다!');
  };

  const clearMinigame = async () => {
    if (!currentRoom) return;
    await supabase.from('game_rooms').update({ active_minigame: null }).eq('id', currentRoom.id);
  };

  const toggleHack = async (groupId: string, isHacked: boolean) => {
    await supabase.from('room_groups').update({ is_hacked: !isHacked }).eq('id', groupId);
  };

  const toggleZombie = async (groupId: string, currentBadges: string[]) => {
    const isZombie = currentBadges?.includes('zombie');
    const newBadges = isZombie ? (currentBadges || []).filter(b => b !== 'zombie') : [...(currentBadges || []), 'zombie'];
    await supabase.from('room_groups').update({ badges: newBadges }).eq('id', groupId);
  };

  const handleReset = async () => {
    if(!currentRoom) return;
    if(window.confirm('정말 이 방의 데이터를 초기화하시겠습니까?')) {
      await supabase.from('game_rooms').update({ status: 'waiting', global_time_modifier: 0, started_at: null, active_minigame: null, announcement: null }).eq('id', currentRoom.id);
      await supabase.from('room_groups').update({ score: 0, is_defused: false, is_hacked: false, item_buff_until: null, is_blinded_until: null, completed_missions: [], badges: [], stats: {} }).eq('room_id', currentRoom.id);
    }
  };

  const handleEndGame = async () => {
    if(!currentRoom) return;
    if(window.confirm('정말 게임을 종료하고 결과 발표 화면을 띄우시겠습니까? 모든 참가자의 조작이 멈추고 시상식 화면으로 넘어갑니다.')) {
      await supabase.from('game_rooms').update({ status: 'finished' }).eq('id', currentRoom.id);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || '4321';
    if (passwordInput === adminPassword) {
      setIsAuthenticated(true);
    } else {
      alert('비밀번호가 틀렸습니다.');
      setPasswordInput('');
    }
  };

  const handleCleanupRooms = async () => {
    if (!window.confirm('정말 24시간이 지난 오래된 방들을 모두 삭제하시겠습니까? (이 작업은 되돌릴 수 없습니다)')) return;
    
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from('game_rooms').delete().lt('created_at', yesterday);
      if (error) throw error;
      
      alert('오래된 방 정리가 완료되었습니다.');
      fetchRooms();
      if (selectedRoomId) {
        const stillExists = rooms.find(r => r.id === selectedRoomId && new Date(r.created_at || '').getTime() > new Date(yesterday).getTime());
        if (!stillExists) setSelectedRoomId(null);
      }
    } catch (err) {
      console.error(err);
      alert('방 정리 중 오류가 발생했습니다.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans relative">
        <button onClick={() => navigate('/')} className="absolute top-6 left-6 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors">
          <Home className="w-4 h-4"/> 홈으로 돌아가기
        </button>
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-6 max-w-sm w-full">
          <div className="flex flex-col items-center mb-2">
            <ShieldAlert className="w-16 h-16 text-cyan-600 mb-4" />
            <h1 className="text-2xl font-black text-slate-900">교사 제어 패널</h1>
            <p className="text-slate-500 mt-2">비밀번호를 입력하세요.</p>
          </div>
          <input 
            type="password" 
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            placeholder="비밀번호 4자리"
            className="w-full bg-slate-50 border border-slate-300 p-4 rounded-xl text-center text-xl tracking-[0.5em] focus:outline-none focus:border-cyan-500 text-slate-900"
          />
          <button type="submit" className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-lg">
            접속하기
          </button>
        </form>
      </div>
    );
  }

  const pendingApprovals: { group: RoomGroup, mission: import('../domain/types').MissionButton }[] = [];
  if (currentRoom) {
    const template = templates.find(t => t.id === currentRoom.template_id);
    if (template) {
      roomGroups.forEach(group => {
        if (group.pending_missions && group.pending_missions.length > 0) {
          group.pending_missions.forEach(missionId => {
            const m = template.buttons.find((btn: import('../domain/types').MissionButton) => btn.id === missionId);
            if (m) {
              pendingApprovals.push({ group, mission: m as import('../domain/types').MissionButton });
            }
          });
        }
      });
    }
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 p-6 md:p-10 font-sans pb-20">
      <div className="max-w-4xl mx-auto space-y-6 relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 mb-8">
          <h1 className="text-3xl font-black flex items-center gap-3 text-cyan-600">
            <ShieldAlert className="w-10 h-10 text-cyan-500" /> 땀방울 원정대 - 교사 제어 패널
          </h1>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors">
            <Home className="w-4 h-4"/> 홈으로 돌아가기
          </button>
        </div>

        {activeTab !== 'create_template' && (
          <div className="flex gap-4 border-b border-slate-300 pb-2 mb-6 overflow-x-auto">
            <button onClick={() => setActiveTab('rooms')} className={`shrink-0 font-bold px-4 py-2 ${activeTab === 'rooms' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-slate-500 hover:text-slate-700'}`}>방 관리 (Rooms)</button>
            <button onClick={() => setActiveTab('templates')} className={`shrink-0 font-bold px-4 py-2 ${activeTab === 'templates' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-slate-500 hover:text-slate-700'}`}>템플릿 관리</button>
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
              <p className="text-slate-600">등록된 템플릿 목록입니다. 이 템플릿들을 기반으로 새로운 방을 만들 수 있습니다.</p>
              <button onClick={() => { setEditingTemplate(null); setActiveTab('create_template'); }} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold flex items-center gap-2">
                <Plus className="w-4 h-4"/> 새 템플릿 만들기
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(t => (
                <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{t.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">버튼 개수: {t.buttons.length}개</p>
                    </div>
                    <button 
                      onClick={() => { setEditingTemplate(t); setActiveTab('create_template'); }} 
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-300 transition-colors"
                    >
                      수정
                    </button>
                  </div>
                  <button onClick={() => createRoom(t.id)} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center justify-center gap-2">
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
                <div key={r.id} onClick={() => setSelectedRoomId(r.id)} className="bg-white shadow-sm p-5 rounded-xl border border-slate-200 hover:border-cyan-500 cursor-pointer transition-colors">
                  <h3 className="font-bold text-xl mb-1 flex items-center gap-2 text-slate-900"><Key className="w-5 h-5 text-yellow-500"/> {r.pin_code}</h3>
                  <p className="text-slate-700 font-bold">{r.name}</p>
                  <p className="text-sm text-slate-500 mt-2">상태: {r.status}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex justify-end border-t border-slate-200 pt-6">
                <button 
                  onClick={handleCleanupRooms}
                  className="px-4 py-2 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 rounded-lg text-sm font-bold border border-slate-200 transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> 오래된 방 데이터 정리 (24시간 경과)
                </button>
              </div>
          </div>
        )}

        {activeTab === 'rooms' && selectedRoomId && currentRoom && (
          <div className="space-y-6">
            <button onClick={() => setSelectedRoomId(null)} className="text-cyan-600 font-bold hover:underline mb-4 inline-block">&larr; 방 목록으로 돌아가기</button>
            
            <div className="bg-white shadow-sm p-4 rounded-xl flex justify-between items-center border border-slate-200">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{currentRoom.name}</h2>
                <p className="text-cyan-600 font-bold mt-1">접속 핀 번호: {currentRoom.pin_code}</p>
              </div>
            </div>

            <div className="bg-white shadow-sm p-4 rounded-xl border border-slate-200">
              <h2 className="text-lg font-bold text-slate-700 mb-2">실시간 라이브 공지 발송</h2>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={announcementText}
                  onChange={e => setAnnouncementText(e.target.value)}
                  placeholder="학생들 기기 상단에 띄울 공지사항을 입력하세요..."
                  className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                  onKeyDown={e => e.key === 'Enter' && sendAnnouncement()}
                />
                <button 
                  onClick={sendAnnouncement}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-bold transition-colors"
                >
                  공지 띄우기
                </button>
                <button 
                  onClick={clearAnnouncement}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold border border-slate-200 transition-colors"
                >
                  공지 내리기
                </button>
              </div>
              {currentRoom.announcement && (
                <div className="mt-3 p-3 bg-cyan-50 border border-cyan-200 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-cyan-800 font-bold">
                    📢 현재 공지 중: <span className="font-normal">{currentRoom.announcement}</span>
                  </p>
                </div>
              )}
            </div>

            {pendingApprovals.length > 0 && (
              <div className="bg-red-50 shadow-sm p-4 rounded-xl border border-red-200">
                <h2 className="text-lg font-bold text-red-900 flex items-center gap-2 mb-4">
                  <LucideIcons.AlertCircle className="w-5 h-5" /> 승인 대기 중인 임무 ({pendingApprovals.length}건)
                </h2>
                <div className="flex flex-col gap-2">
                  {pendingApprovals.map((req, idx) => (
                    <div key={`${req.group.id}-${req.mission.id}-${idx}`} className="bg-white p-3 rounded-lg border border-red-200 flex justify-between items-center shadow-sm">
                      <div>
                        <span className="font-black text-slate-800 mr-2">[{req.group.group_name}]</span>
                        <span className="text-slate-600 font-bold">{req.mission.title}</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={async () => {
                            const newPending = req.group.pending_missions?.filter(id => id !== req.mission.id) || [];
                            const newCompleted = [...(req.group.completed_missions || []), req.mission.id];
                            await supabase.from('room_groups').update({ 
                              pending_missions: newPending, 
                              completed_missions: newCompleted,
                              score: req.group.score + req.mission.amount
                            }).eq('id', req.group.id);
                          }}
                          className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-bold text-sm shadow-sm"
                        >
                          승인 (점수 지급)
                        </button>
                        <button 
                          onClick={async () => {
                            const newPending = req.group.pending_missions?.filter(id => id !== req.mission.id) || [];
                            await supabase.from('room_groups').update({ pending_missions: newPending }).eq('id', req.group.id);
                          }}
                          className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded font-bold text-sm shadow-sm"
                        >
                          반려
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-indigo-50 shadow-sm p-4 rounded-xl border border-indigo-200">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                  <LucideIcons.Gamepad2 className="w-5 h-5" /> 돌발 팝업 게임 (퀴즈) 발송
                </h2>
                {currentRoom.active_minigame && (
                  <span className="px-3 py-1 bg-indigo-200 text-indigo-800 text-xs font-bold rounded-full animate-pulse">
                    퀴즈 진행 중!
                  </span>
                )}
              </div>
              <p className="text-sm text-indigo-700 mb-4">버튼을 누르면 학생들 화면을 덮는 객관식 퀴즈 팝업이 나타납니다. (선착순 정답 조 300점 획득)</p>
              <div className="flex gap-2">
                <button 
                  onClick={sendMinigame}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-black transition-colors shadow-sm flex items-center gap-2"
                >
                  <LucideIcons.Send className="w-5 h-5" /> 랜덤 체육 퀴즈 발송
                </button>
                <button 
                  onClick={clearMinigame}
                  className="bg-white hover:bg-indigo-100 text-indigo-600 px-4 py-3 rounded-xl font-bold border border-indigo-200 transition-colors"
                >
                  강제 종료 / 내리기
                </button>
              </div>
            </div>
            
            <div className="bg-yellow-50 shadow-sm p-4 rounded-xl border border-yellow-200 mt-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-yellow-900 flex items-center gap-2">
                  <LucideIcons.Tags className="w-5 h-5" /> 상점 플래시 세일 (50% 할인)
                </h2>
                {currentRoom.flash_sale && (
                  <span className="px-3 py-1 bg-yellow-200 text-yellow-800 text-xs font-bold rounded-full animate-pulse">
                    세일 진행 중!
                  </span>
                )}
              </div>
              <p className="text-sm text-yellow-700 mb-4">상점의 모든 아이템 가격이 50% 할인되며, 학생들에게 알림이 갑니다.</p>
              <div className="flex gap-2">
                <button 
                  onClick={async () => {
                    await supabase.from('game_rooms').update({ flash_sale: !currentRoom.flash_sale }).eq('id', currentRoom.id);
                  }}
                  className={`px-6 py-3 rounded-xl font-black transition-colors shadow-sm flex items-center gap-2 ${currentRoom.flash_sale ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-white border border-yellow-300 text-yellow-700 hover:bg-yellow-100'}`}
                >
                  <LucideIcons.Zap className="w-5 h-5" /> {currentRoom.flash_sale ? '플래시 세일 종료' : '플래시 세일 시작'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 통제 영역 */}
              <div className="bg-white/90 p-6 rounded-2xl border border-slate-200 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-slate-700">방 상태 통제</h2>
                    <div className={`flex items-center gap-2 font-mono text-xl font-bold px-3 py-1.5 rounded-lg border shadow-sm ${isDanger ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-white text-slate-900 border-slate-200'}`}>
                      <Clock className="w-5 h-5" /> {mins}:{secs}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 flex flex-col gap-2">
                      <button onClick={triggerTsunami} className={`flex-1 py-4 flex flex-col items-center justify-center gap-2 rounded-xl font-bold transition-all ${currentRoom.status === 'tsunami' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] animate-pulse' : 'bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200'}`}>
                        <Waves className="w-6 h-6" />
                        {currentRoom.status === 'tsunami' ? '해일 경보 해제' : '해일 경보 발동'}
                      </button>
                      <button onClick={async () => {
                        if (currentRoom.status === 'boss_raid') {
                          await supabase.from('game_rooms').update({ status: 'playing', boss_hp: null, boss_max_hp: null }).eq('id', currentRoom.id);
                        } else {
                          await supabase.from('game_rooms').update({ status: 'boss_raid', boss_hp: 10000, boss_max_hp: 10000 }).eq('id', currentRoom.id);
                        }
                      }} className={`flex-1 py-4 flex flex-col items-center justify-center gap-2 rounded-xl font-bold transition-all ${currentRoom.status === 'boss_raid' ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] animate-pulse' : 'bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200'}`}>
                        <LucideIcons.Swords className="w-6 h-6" />
                        {currentRoom.status === 'boss_raid' ? '보스 레이드 종료' : '보스 레이드 시작!'}
                      </button>
                      <button onClick={async () => {
                        if (currentRoom.status === 'mafia') {
                          await supabase.from('game_rooms').update({ status: 'playing' }).eq('id', currentRoom.id);
                          await supabase.from('room_groups').update({ spy_device_id: null }).eq('room_id', currentRoom.id);
                        } else {
                          await supabase.from('game_rooms').update({ status: 'mafia' }).eq('id', currentRoom.id);
                        }
                      }} className={`flex-1 py-4 flex flex-col items-center justify-center gap-2 rounded-xl font-bold transition-all ${currentRoom.status === 'mafia' ? 'bg-red-900 text-red-100 shadow-[0_0_20px_rgba(153,27,27,0.4)] animate-pulse' : 'bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200'}`}>
                        <LucideIcons.UserX className="w-6 h-6" />
                        {currentRoom.status === 'mafia' ? '마피아 게임 종료' : '스파이/마피아 발동'}
                      </button>
                    </div>
                    
                    <div className="flex-1 flex flex-col gap-2">
                      <button onClick={async () => {
                        const newStatus = currentRoom.status === 'time_attack' ? 'playing' : 'time_attack';
                        await supabase.from('game_rooms').update({ status: newStatus }).eq('id', currentRoom.id);
                      }} className={`flex-1 py-4 flex flex-col items-center justify-center gap-2 rounded-xl font-bold transition-all ${currentRoom.status === 'time_attack' ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse' : 'bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200'}`}>
                        <Clock className="w-6 h-6" />
                        {currentRoom.status === 'time_attack' ? '타임어택 종료' : '타임어택 모드'}
                      </button>
                      <button onClick={async () => {
                        const newStatus = currentRoom.status === 'defense' ? 'playing' : 'defense';
                        await supabase.from('game_rooms').update({ status: newStatus }).eq('id', currentRoom.id);
                      }} className={`flex-1 py-4 flex flex-col items-center justify-center gap-2 rounded-xl font-bold transition-all ${currentRoom.status === 'defense' ? 'bg-orange-600 text-white shadow-[0_0_20px_rgba(234,88,12,0.4)] animate-pulse' : 'bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200'}`}>
                        <ShieldAlert className="w-6 h-6" />
                        {currentRoom.status === 'defense' ? '방어전 종료' : '진지 방어전 시작'}
                      </button>
                      <button onClick={async () => {
                        const newStatus = currentRoom.status === 'zombie' ? 'playing' : 'zombie';
                        await supabase.from('game_rooms').update({ status: newStatus }).eq('id', currentRoom.id);
                      }} className={`flex-1 py-4 flex flex-col items-center justify-center gap-2 rounded-xl font-bold transition-all ${currentRoom.status === 'zombie' ? 'bg-stone-800 text-green-400 shadow-[0_0_20px_rgba(74,222,128,0.4)] animate-pulse' : 'bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200'}`}>
                        <LucideIcons.Ghost className="w-6 h-6" />
                        {currentRoom.status === 'zombie' ? '좀비 사태 진압' : '좀비 바이러스 살포!'}
                      </button>
                    </div>
                    <div className="flex-1 flex flex-col justify-center gap-2">
                      <button onClick={() => handleStatusChange('playing')} className={`py-3 flex items-center justify-center gap-2 rounded-xl font-bold transition-all ${currentRoom.status === 'playing' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        <Play className="w-5 h-5" /> 타이머 시작
                      </button>
                      <button onClick={() => handleStatusChange('paused')} className={`py-3 flex items-center justify-center gap-2 rounded-xl font-bold transition-all ${currentRoom.status === 'paused' ? 'bg-yellow-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        <Pause className="w-5 h-5" /> 일시 정지
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 font-bold mb-2">타이머 시간 조절 (현재 시간에 추가/차감)</p>
                  <div className="grid grid-cols-5 gap-2 w-full">
                    <button onClick={() => handleTimeModifier(-60)} className="py-2.5 bg-red-50 text-red-600 rounded-lg font-bold border border-red-200 text-sm hover:bg-red-100 transition-colors">-1분</button>
                    <button onClick={() => handleTimeModifier(-30)} className="py-2.5 bg-red-50 text-red-600 rounded-lg font-bold border border-red-200 text-sm hover:bg-red-100 transition-colors">-30초</button>
                    <button onClick={() => handleTimeModifier(30)} className="py-2.5 bg-cyan-50 text-cyan-600 rounded-lg font-bold border border-cyan-200 text-sm hover:bg-cyan-100 transition-colors">+30초</button>
                    <button onClick={() => handleTimeModifier(60)} className="py-2.5 bg-cyan-50 text-cyan-600 rounded-lg font-bold border border-cyan-200 text-sm hover:bg-cyan-100 transition-colors">+1분</button>
                    <button onClick={() => handleTimeModifier(300)} className="py-2.5 bg-cyan-50 text-cyan-600 rounded-lg font-bold border border-cyan-200 text-sm hover:bg-cyan-100 transition-colors">+5분</button>
                  </div>
                </div>
              </div>

              {/* 모둠 통제 보드 */}
              <div className="bg-white/90 p-6 rounded-2xl border border-slate-200 shadow-xl">
                <h2 className="text-lg font-bold text-slate-700 mb-4">접속한 모둠 ({roomGroups.length}팀)</h2>
                <div className="grid grid-cols-2 gap-4">
                  {roomGroups.map(s => (
                    <div key={s.id} className={`p-4 rounded-xl border flex flex-col items-center gap-2 ${s.is_hacked ? 'bg-red-50 border-red-300 animate-pulse' : 'bg-slate-50 border-slate-300'}`}>
                      <div className="flex justify-between w-full items-center">
                        <span className="font-bold text-slate-900">{s.group_name}</span>
                      </div>
                      <div className="text-2xl font-mono font-black text-cyan-600">{s.score}</div>
                      <div className="flex gap-2 w-full mt-2">
                        <button onClick={() => toggleHack(s.id, !!s.is_hacked)} className={`flex-1 py-1.5 rounded text-sm font-bold flex items-center justify-center gap-1 ${s.is_hacked ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
                          <Bug className="w-4 h-4" /> {s.is_hacked ? '해킹 해제' : '해킹 침투'}
                        </button>
                        <button onClick={() => toggleZombie(s.id, s.badges || [])} className={`flex-1 py-1.5 rounded text-sm font-bold flex items-center justify-center gap-1 ${s.badges?.includes('zombie') ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
                          <LucideIcons.Ghost className="w-4 h-4" /> 좀비 모드
                        </button>
                      </div>
                    </div>
                  ))}
                  {roomGroups.length === 0 && <p className="text-slate-500 col-span-2">아직 접속한 모둠이 없습니다.</p>}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button onClick={handleEndGame} className="px-6 py-4 bg-yellow-500 hover:bg-yellow-400 text-yellow-900 font-black text-lg rounded-xl w-full flex justify-center items-center gap-2 transition-colors shadow-lg border border-yellow-400 animate-pulse">
                <LucideIcons.Trophy className="w-6 h-6" /> 게임 강제 종료 및 최종 결과 발표 띄우기!
              </button>
              
              <button onClick={handleReset} className="px-6 py-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold rounded-xl w-full flex justify-center items-center gap-2 transition-colors">
                <RotateCcw className="w-5 h-5" /> 이 방의 모든 데이터 초기화
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
