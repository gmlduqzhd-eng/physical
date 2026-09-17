import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../data/supabase';
import { Monitor, Home } from 'lucide-react';

export const BoardEntry = () => {
  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCode.trim()) {
      setError('핀 번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');

    const { data, error: fetchError } = await supabase
      .from('game_rooms')
      .select('id')
      .eq('pin_code', pinCode.trim())
      .single();

    if (fetchError || !data) {
      setError('존재하지 않는 핀 번호입니다.');
      setLoading(false);
      return;
    }

    navigate(`/board/${data.id}`);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans relative">
      <button onClick={() => navigate('/')} className="absolute top-6 left-6 px-4 py-2 bg-white/10 border border-white/20 rounded-xl font-bold hover:bg-white/20 flex items-center gap-2 text-sm">
        <Home className="w-4 h-4" /> 홈
      </button>

      <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 w-full max-w-sm flex flex-col items-center">
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
            maxLength={6}
            value={pinCode}
            onChange={e => setPinCode(e.target.value)}
            className="bg-black/30 border border-white/20 px-4 py-4 rounded-xl text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-cyan-400 w-full uppercase"
          />
          {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}
          <button disabled={loading} type="submit" className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold text-lg transition-colors">
            {loading ? '확인 중...' : '전광판 열기'}
          </button>
        </form>
      </div>
    </div>
  );
};
