import { useEffect, useState, type ReactNode } from 'react';
import { FlowShell } from '../FlowShell';
import '../ActivityLibrary.css';
import './TeacherAuthGuard.css';
import { removeStorage } from '../../application/browserStorage';
import { teacherStatus } from '../../application/teacherSession';
import { ensureClassroomTeacher } from '../../data/supabase';
export function TeacherLogin({ onLogin }: { onLogin: () => void }) {
  const [code, setCode] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState(false);
  useEffect(() => { let active = true; teacherStatus().then(s => { if (active) setSetup(!s.configured && s.localSetup); }).catch(() => {}); return () => { active = false; }; }, []);
  return <section className="teacher-login rounded-2xl border border-slate-300 bg-white p-5 text-slate-900 max-w-xl mx-auto">
    <h2 className="text-xl font-bold">{setup ? '교사 접근 코드 처음 설정' : '교사 인증'}</h2>
    <p className="text-sm my-3">{setup ? '선생님만 알 수 있는 12자 이상의 접근 코드를 정해 주세요. OpenAI API 키와는 다른 비밀번호입니다.' : '기본 PIN은 없습니다. 관리자가 설정한 접근 코드를 사용하세요.'} 코드는 브라우저에 저장하지 않으며, 인증은 최대 2시간 유지됩니다.</p>
    <form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try {
      const res = await fetch(`/api/teacher?action=${setup ? 'setup' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const body = await res.json(); if (!res.ok) throw new Error(body.error ?? '인증 실패'); setCode(''); onLogin();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '인증 서버에 연결할 수 없습니다.'); } finally { setBusy(false); } }}>
      <label className="block font-bold">교사 접근 코드<input className="block w-full border rounded-xl p-3 mt-2" type="password" autoComplete="current-password" aria-describedby="teacher-code-help" minLength={12} maxLength={128} value={code} onChange={e => setCode(e.target.value)} required /></label>
      <p id="teacher-code-help" className="mt-2 text-sm text-slate-600">코드는 엽쌤에게 문의하세요</p>
      <button disabled={busy} className="mt-3 rounded-xl bg-cyan-700 text-white px-5 py-3 font-bold">{busy ? '확인 중…' : setup ? '접근 코드 설정하고 시작' : '교사 인증하기'}</button>
    </form>{error && <p role="alert" className="text-red-700 mt-3">{error}</p>}
  </section>;
}
export function TeacherAuthGuard({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false); const [error, setError] = useState('');
  useEffect(() => { removeStorage('teacher_master_pin'); removeStorage('teacher_session_auth', 'session'); let active = true;
    teacherStatus().then(async s => { if (s.authenticated) await ensureClassroomTeacher(); if (active) setAuthenticated(s.authenticated); }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : '교사 인증 서버와 접근 코드를 설정해 주세요.'); }); return () => { active = false; };
  }, []);
  return authenticated ? <>{children}</> : <FlowShell utilities className="teacher-auth" back="/teacher" backLabel="교사 시작 화면">{error && <p role="status">{error}</p>}<TeacherLogin onLogin={() => { void ensureClassroomTeacher().then(()=>setAuthenticated(true)).catch(cause=>setError(cause instanceof Error?cause.message:'수업방 인증 실패')); }} /><p className="teacher-auth-note">교사 인증 후에도 DB에서 방 소유권과 권한 만료를 확인합니다. 기존에 소유자 없이 만들어진 방은 자동으로 가져오지 않습니다.</p></FlowShell>;
}
