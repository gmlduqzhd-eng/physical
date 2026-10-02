import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../data/supabase';
import { findRoomByPin, joinClassroomGroup, classroomError } from '../data/classroomRepository';
import { readStorage, writeStorage, removeStorage } from '../application/browserStorage';
import { RotateCcw } from 'lucide-react';


export const Lobby = () => {
  const [pinCode, setPinCode] = useState('');
  const [studentName, setStudentName] = useState(() => readStorage('physical_student_name') || '');
  const [groupName, setGroupName] = useState('1모둠');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 이전 접속 정보 확인
  const lastRoom = readStorage('physical_last_room');
  const lastGroup = readStorage('physical_last_group');
  const lastGroupName = readStorage('physical_last_group_name');
  const lastName = readStorage('physical_student_name');

  const handleResume = async () => {
    if (lastRoom && lastGroup) {
      if (loading) return;
      setLoading(true); setError('');
      try {
        const { data, error: lookupError } = await supabase.from('room_groups').select('id').eq('room_id', lastRoom).eq('id', lastGroup).maybeSingle();
        if (lookupError) throw new Error('이전 수업을 확인할 수 없습니다. 연결 상태를 확인해주세요.');
        if (!data) {
          ['physical_last_room', 'physical_last_group', 'physical_last_group_name'].forEach(key => removeStorage(key));
          throw new Error('이전 수업이 삭제되었습니다. 새 PIN으로 입장해주세요.');
        }
        navigate(`/mobile/${lastRoom}/${lastGroup}`);
      } catch (cause) { setError(classroomError(cause, '이전 수업 접속에 실패했습니다.')); }
      finally { setLoading(false); }
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!pinCode) {
      setError('핀 번호를 입력해주세요.');
      return;
    }
    if (!studentName.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const room = await findRoomByPin(pinCode);
      const groupId = await joinClassroomGroup(room.id, groupName);
      writeStorage('physical_student_name', studentName.trim());
      writeStorage('physical_student_role', 'novice');
      writeStorage('physical_last_room', room.id);
      writeStorage('physical_last_group', groupId);
      writeStorage('physical_last_group_name', groupName);
      navigate(`/mobile/${room.id}/${groupId}`);
    } catch (cause) { setError(classroomError(cause, '입장에 실패했습니다. 다시 시도해주세요.')); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center pt-12 pb-20 px-6 gap-4 text-slate-900 font-sans overflow-y-auto">
      <h1 className="text-4xl font-black text-cyan-600 mb-1">땀방울 원정대</h1>
      <p className="text-slate-600 mb-4 text-center">선생님이 알려주신 핀 번호와<br/>우리 모둠을 선택하고 입장하세요!</p>

      {/* 이전 수업 이어하기 버튼 */}
      {lastRoom && lastGroup && lastName && (
        <button
          onClick={handleResume}
          disabled={loading}
          className="w-full max-w-sm py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all active:scale-95"
        >
          <RotateCcw className="w-5 h-5" />
          이전 수업 이어하기 ({lastName} / {lastGroupName})
        </button>
      )}
      
      <form onSubmit={handleJoin} className="w-full max-w-sm bg-white rounded-2xl p-6 border border-slate-200 shadow-xl flex flex-col gap-5">
        <div>
          <label className="block text-slate-700 text-sm font-bold mb-2">핀 번호 (PIN)</label>
          <input 
            type="text" 
            inputMode="numeric"
            maxLength={4}
            placeholder="예: 1234" 
            value={pinCode}
            onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-slate-900 text-xl font-mono text-center tracking-[0.5em] focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-slate-700 text-sm font-bold mb-2">본인 이름 (활동명)</label>
          <input 
            type="text" 
            placeholder="예: 홍길동" 
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            maxLength={10}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-slate-900 text-lg font-bold text-center focus:outline-none focus:border-cyan-500"
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

        {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xl transition-colors mt-2"
        >
          {loading ? '입장 중...' : '입장하기'}
        </button>
      </form>

      <div className="w-full max-w-sm mt-6 flex flex-col gap-3">
        <Link to="/manual" className="w-full py-3 bg-cyan-50 rounded-xl text-center font-bold hover:bg-cyan-100 text-cyan-600 transition-colors text-sm border border-cyan-200 shadow-sm">
          📖 땀방울 원정대 사용 설명서
        </Link>
        <Link to="/admin" className="w-full py-3 bg-white rounded-xl text-center font-bold hover:bg-slate-50 text-slate-600 transition-colors text-sm border border-slate-200 shadow-sm">
          ⚙️ 교사 제어 패널 (관리자)
        </Link>
        <Link to="/kiosk" className="w-full py-4 bg-cyan-100 rounded-xl text-center font-black hover:bg-cyan-200 text-cyan-800 transition-colors border-2 border-cyan-300 shadow-sm flex items-center justify-center gap-2">
          🏃‍♂️ 공용 패드 (릴레이 스테이션) 모드
        </Link>
        <Link to="/board" className="w-full py-3 bg-white rounded-xl text-center font-bold hover:bg-slate-50 text-slate-600 transition-colors text-sm border border-slate-200 shadow-sm">
          🖥️ TV 전광판 열기 (PIN 입력)
        </Link>
      </div>

      <p className="mt-6 text-sm text-slate-400 font-bold">
        ⓒ2026. 엽쌤 All rights reserved.
      </p>
    </div>
  );
};
