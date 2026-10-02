import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { readStorage, writeStorage, removeStorage } from '../../application/browserStorage';

interface TeacherAuthGuardProps {
  children: React.ReactNode;
}

export const TeacherAuthGuard: React.FC<TeacherAuthGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSettingNewPin, setIsSettingNewPin] = useState<boolean>(false);
  const [newPin, setNewPin] = useState<string>('');
  const [currentPin, setCurrentPin] = useState('');

  const defaultPin = readStorage('teacher_master_pin') || '1234';

  useEffect(() => {
    const authStatus = readStorage('teacher_session_auth', 'session');
    if (authStatus === defaultPin) {
      setIsAuthenticated(true);
    }
    const invalidate = (event: StorageEvent) => {
      if (event.key === 'teacher_master_pin') {
        removeStorage('teacher_session_auth', 'session');
        setIsAuthenticated(false);
      }
    };
    window.addEventListener('storage', invalidate);
    return () => window.removeEventListener('storage', invalidate);
  }, [defaultPin]);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === defaultPin) {
      writeStorage('teacher_session_auth', defaultPin, 'session');
      setIsAuthenticated(true);
      setErrorMsg(null);
    } else {
      setErrorMsg('비밀번호(PIN)가 일치하지 않습니다.');
      setPin('');
    }
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPin !== defaultPin) {
      setErrorMsg('현재 교사 PIN이 일치하지 않습니다.');
      return;
    }
    if (/^\d{4,8}$/.test(newPin)) {
      if (!writeStorage('teacher_master_pin', newPin)) {
        setErrorMsg('이 브라우저에서 PIN을 저장할 수 없습니다. 저장 권한을 확인해주세요.');
        return;
      }
      removeStorage('teacher_session_auth', 'session');
      alert('이 기기의 교사 PIN이 변경되었습니다. 새 PIN으로 로그인해주세요.');
      setIsSettingNewPin(false);
      setNewPin('');
      setCurrentPin('');
      setErrorMsg(null);
    } else {
      setErrorMsg('PIN은 4~8자리 숫자여야 합니다.');
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative backdrop-blur-xl">
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 text-slate-400 hover:text-white flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 허브로
        </button>

        <div className="flex flex-col items-center text-center mt-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">교사용 화면 잠금</h2>
          <p className="text-sm text-slate-400 mt-2">
            이 기기의 교사 화면을 열려면<br />
            교사 PIN을 입력해 주세요. PIN은 기기별로 저장됩니다.
          </p>
        </div>

        {!isSettingNewPin ? (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                교사 PIN {defaultPin === '1234' ? '(초기값: 1234)' : ''}
              </label>
              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="4자리 숫자 입력"
                  className="w-full px-4 py-3.5 bg-slate-950 border border-slate-700 rounded-xl text-center text-2xl tracking-[0.5em] font-mono font-bold text-cyan-400 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  autoFocus
                />
                <KeyRound className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {errorMsg && (
              <p className="text-sm text-red-400 font-medium text-center animate-shake">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" /> 잠금 해제 및 수업 입장
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => { setIsSettingNewPin(true); setErrorMsg(null); }}
                className="text-xs text-slate-500 hover:text-slate-300 underline"
              >
                교사 전용 PIN 번호 변경하기
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleChangePin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2">현재 교사 PIN</label>
              <input type="password" inputMode="numeric" maxLength={8} value={currentPin} onChange={e => setCurrentPin(e.target.value)} placeholder="현재 PIN 입력" className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-center text-xl font-mono text-cyan-400" />
            </div>
            {errorMsg && <p role="alert" className="text-sm text-red-400 text-center">{errorMsg}</p>}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2">새 교사 PIN (4자리 이상)</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="새 PIN 입력"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-center text-xl font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsSettingNewPin(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm"
              >
                취소
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm shadow-md"
              >
                변경 저장
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
