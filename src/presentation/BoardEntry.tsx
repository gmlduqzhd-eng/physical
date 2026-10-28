import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { findRoomByPin, classroomError, joinClassroomBoard } from '../data/classroomRepository';
import { Monitor } from 'lucide-react';
import { FlowShell } from './FlowShell';

export const BoardEntry = () => {
  const [boardCode,setBoardCode]=useState('');
  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!pinCode.trim()) {
      setError('핀 번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const room = await findRoomByPin(pinCode);
      await joinClassroomBoard(room.id,boardCode);
      navigate(`/board/${room.id}`);
    } catch (cause) { setError(classroomError(cause, '방 확인에 실패했습니다.')); }
    finally { setLoading(false); }
  };

  return (
    <FlowShell utilities className="board-entry" backLabel="홈으로">

      <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 w-full max-w-sm mx-auto my-8 flex flex-col items-center">
        <Monitor className="w-20 h-20 text-cyan-400 mb-4" />
        <h1 className="text-2xl font-black mb-2 text-center">TV 전광판 모드</h1>
        <p className="text-slate-300 text-sm mb-6 text-center break-keep">
          교실 TV나 빔 프로젝터에 실시간 순위판을 띄우세요.<br/>
          선생님이 알려주신 방 PIN 번호를 입력합니다.
        </p>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input
            type="text"
            placeholder="PIN 번호"
            inputMode="numeric"
            maxLength={8}
            value={pinCode}
            onChange={e => setPinCode(e.target.value.replace(/\D/g, ''))}
            className="bg-black/30 border border-white/20 px-4 py-4 rounded-xl text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-cyan-400 w-full uppercase"
          />
          <label>전광판 전용 코드<input type="password" autoComplete="off" value={boardCode} maxLength={16} onChange={e=>setBoardCode(e.target.value)} className="w-full bg-black/30 border p-3 rounded-xl"/></label>
          {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}
          <button disabled={loading} type="submit" className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold text-lg transition-colors">
            {loading ? '확인 중...' : '전광판 열기'}
          </button>
        </form>
      </div>
    </FlowShell>
  );
};
