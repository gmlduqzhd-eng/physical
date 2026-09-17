import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../data/supabase';
import { QrCode, Loader2 } from 'lucide-react';

export const QuickJoin = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const roomId = searchParams.get('room') || '';
  const groupName = searchParams.get('group') || '';

  const [studentName, setStudentName] = useState(() => localStorage.getItem('physical_student_name') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roomName, setRoomName] = useState('');

  useEffect(() => {
    if (!roomId) return;
    supabase.from('game_rooms').select('name').eq('id', roomId).single()
      .then(({ data }) => { if (data) setRoomName(data.name); });
  }, [roomId]);

  if (!roomId || !groupName) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6 font-sans text-slate-900">
        <QrCode className="w-20 h-20 text-slate-300 mb-4" />
        <h1 className="text-2xl font-black mb-2">잘못된 QR 코드입니다</h1>
        <p className="text-slate-500 mb-6 text-center">방 정보 또는 모둠 정보가 누락되었습니다.<br/>선생님에게 올바른 QR 코드를 요청하세요.</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-cyan-600 text-white rounded-xl font-bold">
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');

    // 모둠 접속 처리
    const { data: groupData, error: groupError } = await supabase
      .from('room_groups')
      .select('id')
      .eq('room_id', roomId)
      .eq('group_name', groupName)
      .single();

    let groupId: string;
    const avatar = 'Smile';

    if (groupError || !groupData) {
      const { data: newGroup, error: insertError } = await supabase
        .from('room_groups')
        .insert([{ room_id: roomId, group_name: groupName, avatar }])
        .select('id')
        .single();

      if (insertError || !newGroup) {
        setError('모둠 접속에 실패했습니다. 다시 시도해주세요.');
        setLoading(false);
        return;
      }
      groupId = newGroup.id;
    } else {
      groupId = groupData.id;
    }

    localStorage.setItem('physical_student_name', studentName.trim());
    localStorage.setItem('physical_student_role', 'novice');
    localStorage.setItem('physical_last_room', roomId);
    localStorage.setItem('physical_last_group', groupId);
    localStorage.setItem('physical_last_group_name', groupName);

    navigate(`/mobile/${roomId}/${groupId}`);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center pt-20 pb-20 px-6 font-sans text-slate-900">
      <div className="w-16 h-16 rounded-full bg-cyan-100 flex items-center justify-center mb-4">
        <QrCode className="w-8 h-8 text-cyan-600" />
      </div>
      <h1 className="text-3xl font-black text-cyan-600 mb-1">땀방울 원정대</h1>
      <p className="text-slate-500 font-bold mb-2">{roomName || '게임 입장'}</p>
      <div className="px-4 py-2 bg-cyan-50 border border-cyan-200 rounded-full text-cyan-700 font-bold text-sm mb-8">
        📋 {groupName}
      </div>

      <form onSubmit={handleJoin} className="w-full max-w-sm bg-white rounded-2xl p-6 border border-slate-200 shadow-xl flex flex-col gap-5">
        <div>
          <label className="block text-slate-700 text-sm font-bold mb-2">이름을 입력하세요</label>
          <input
            type="text"
            placeholder="예: 홍길동"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            maxLength={10}
            autoFocus
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-slate-900 text-lg font-bold text-center focus:outline-none focus:border-cyan-500"
          />
        </div>

        {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> 입장 중...</> : '🚀 바로 입장하기'}
        </button>
      </form>

      <button onClick={() => navigate('/')} className="mt-6 text-slate-400 text-sm font-bold hover:text-slate-600">
        직접 PIN 번호로 입장하기 →
      </button>
    </div>
  );
};
