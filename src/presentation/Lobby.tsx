import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../data/supabase';
import * as LucideIcons from 'lucide-react';

const AVATAR_OPTIONS = ['Smile', 'Star', 'Zap', 'Flame', 'Ghost', 'Rocket', 'Crown', 'Heart'];

export const Lobby = () => {
  const [pinCode, setPinCode] = useState('');
  const [groupName, setGroupName] = useState('1모둠');
  const [avatar, setAvatar] = useState('Smile');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCode) {
      setError('핀 번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');

    // 1. 방 존재 여부 확인
    const cleanedPin = pinCode.trim();
    const { data: roomData, error: roomError } = await supabase
      .from('game_rooms')
      .select('id')
      .eq('pin_code', cleanedPin)
      .single();

    if (roomError || !roomData) {
      setError('존재하지 않는 핀 번호입니다.');
      setLoading(false);
      return;
    }

    const roomId = roomData.id;

    // 2. 모둠 접속 처리 (Upsert or Insert)
    const { data: groupData, error: groupError } = await supabase
      .from('room_groups')
      .select('id')
      .eq('room_id', roomId)
      .eq('group_name', groupName)
      .single();

    let groupId: string;

    if (groupError || !groupData) {
      // 그룹이 없으면 생성
      const { data: newGroup, error: insertError } = await supabase
        .from('room_groups')
        .insert([{ room_id: roomId, group_name: groupName, avatar }])
        .select('id')
        .single();
      
      if (insertError || !newGroup) {
        setError('모둠 생성에 실패했습니다.');
        setLoading(false);
        return;
      }
      groupId = newGroup.id;
    } else {
      groupId = groupData.id;
      await supabase.from('room_groups').update({ avatar }).eq('id', groupId);
    }

    // 접속 성공 시 이동
    navigate(`/mobile/${roomId}/${groupId}`);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center pt-16 pb-20 px-6 gap-6 text-slate-900 font-sans overflow-y-auto">
      <h1 className="text-4xl font-black text-cyan-600 mb-2">땀방울 원정대</h1>
      <p className="text-slate-600 mb-8 text-center">선생님이 알려주신 핀 번호와<br/>우리 모둠을 선택하고 입장하세요!</p>
      
      <form onSubmit={handleJoin} className="w-full max-w-sm bg-white rounded-2xl p-6 border border-slate-200 shadow-xl flex flex-col gap-5">
        <div>
          <label className="block text-slate-700 text-sm font-bold mb-2">핀 번호 (PIN)</label>
          <input 
            type="text" 
            placeholder="예: 1234" 
            value={pinCode}
            onChange={(e) => setPinCode(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-slate-900 text-xl font-mono text-center tracking-[0.5em] focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-slate-700 text-sm font-bold mb-2">우리 모둠</label>
          <select 
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-slate-900 text-lg focus:outline-none focus:border-cyan-500"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
              <option key={num} value={`${num}모둠`}>{num}모둠</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-700 text-sm font-bold mb-2">모둠 아바타</label>
          <div className="grid grid-cols-4 gap-2">
            {AVATAR_OPTIONS.map(opt => {
              const Icon = (LucideIcons as unknown as Record<string, React.ElementType>)[opt] || LucideIcons.Smile;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAvatar(opt)}
                  className={`p-3 rounded-xl flex justify-center items-center border transition-all ${
                    avatar === opt 
                      ? 'bg-cyan-100 border-cyan-500 text-cyan-600 shadow-sm scale-105' 
                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xl transition-colors mt-2"
        >
          {loading ? '입장 중...' : '입장하기'}
        </button>
      </form>

      <div className="w-full max-w-sm mt-8 flex flex-col gap-3">
        <Link to="/manual" className="w-full py-3 bg-cyan-50 rounded-xl text-center font-bold hover:bg-cyan-100 text-cyan-600 transition-colors text-sm border border-cyan-200 shadow-sm">
          📖 땀방울 원정대 사용 설명서
        </Link>
        <Link to="/admin" className="w-full py-3 bg-white rounded-xl text-center font-bold hover:bg-slate-50 text-slate-600 transition-colors text-sm border border-slate-200 shadow-sm">
          ⚙️ 교사 제어 패널 (관리자)
        </Link>
        <Link to="/kiosk" className="w-full py-3 bg-cyan-100 rounded-xl text-center font-black hover:bg-cyan-200 text-cyan-800 transition-colors text-sm border border-cyan-300 shadow-sm">
          🏃‍♂️ 공용 패드 (릴레이 스테이션) 모드 입장
        </Link>
        <Link to="/board/b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22" className="w-full py-3 bg-white rounded-xl text-center font-bold hover:bg-slate-50 text-slate-600 transition-colors text-sm border border-slate-200 shadow-sm">
          🖥️ 테스트 방 전광판 보기
        </Link>
      </div>

      <p className="mt-8 text-sm text-slate-400 font-bold">
        ⓒ2026. 엽쌤 All rights reserved.
      </p>
    </div>
  );
};
