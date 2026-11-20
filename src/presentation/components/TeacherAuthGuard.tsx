import { setMainTeacherGoogleClient } from '../../application/teacherGoogle';
import { TeacherAccountForm } from './TeacherAccountForm';
import { supabase } from '../../data/supabase';
import { useEffect, useState, type ReactNode } from 'react';
import { FlowShell } from '../FlowShell';
import '../ActivityLibrary.css';
import './TeacherAuthGuard.css';
import { removeStorage } from '../../application/browserStorage';
import { teacherStatus } from '../../application/teacherSession';
import { ensureClassroomTeacher, TeacherReconnectError } from '../../data/supabase';
import { beginTeacherGoogle } from '../../application/teacherGoogle';
import { staySignedInPreferred } from '../../application/teacherLoginPrefs';
setMainTeacherGoogleClient(supabase);
/**
 * 선생님 로그인. Google 로그인 하나만 쓴다(예전 공유 코드 로그인은 없어졌다).
 * 개발용 로컬 서버(scripts/dev-api.ts)에서만 처음 한 번 로컬 접근 코드를 정하거나 그 코드로 들어갈 수 있다.
 */
export function TeacherLogin({ onLogin }: { onLogin: () => void }) {
  const [code, setCode] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<'none' | 'setup' | 'login'>('none');
  useEffect(() => { let active = true; teacherStatus().then(s => { if (active && s.localSetup) setLocal(s.localCodeSet ? 'login' : 'setup'); }).catch(() => {}); return () => { active = false; }; }, []);
  const setup = local === 'setup';
  return <section className="teacher-login rounded-2xl border border-slate-300 bg-white p-5 text-slate-900 max-w-xl mx-auto">
    <h1 className="text-xl font-bold">{setup ? '교사 접근 코드 처음 설정' : '선생님 로그인'}</h1>
    <p className="text-sm my-3">{setup ? '선생님만 알 수 있는 12자 이상의 접근 코드를 정해 주세요. API 키와는 다른 비밀번호입니다.' : '반 만들기·관리처럼 저장이 필요한 화면은 선생님 로그인 뒤에 쓸 수 있어요.'}</p>
    {!setup&&<TeacherAccountForm endpoint="teacher"/>}
    {local!=='none'&&<div className="teacher-legacy">{!setup&&<h3>개발용 로컬 접근 코드</h3>}<form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try {
      const res = await fetch(`/api/teacher?action=${setup ? 'setup' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const body = await res.json(); if (!res.ok) throw new Error(body.error ?? '인증 실패'); setCode(''); onLogin();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '인증 서버에 연결할 수 없습니다.'); } finally { setBusy(false); } }}>
      <label className="block font-bold">교사 접근 코드<input className="block w-full border rounded-xl p-3 mt-2" type="password" autoComplete="current-password" minLength={12} maxLength={128} value={code} onChange={e => setCode(e.target.value)} required /></label>
      <button disabled={busy} className="mt-3 rounded-xl bg-cyan-700 text-white px-5 py-3 font-bold">{busy ? '확인 중…' : setup ? '접근 코드 설정하고 시작' : '교사 인증하기'}</button>
    </form></div>}{error && <p role="alert" className="text-red-700 mt-3">{error}</p>}
  </section>;
}
/**
 * 서버 로그인은 살아 있는데 이 화면의 Google 연결만 끊겼을 때(새 탭, 오래된 탭 등).
 * 이 기기에서 쓴 Google 계정으로 계정 고르기 없이 바로 다시 연결한다.
 */
export function TeacherReconnect({ message }: { message: string }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const go = async () => { setBusy(true); setError(''); try { await beginTeacherGoogle('teacher', { staySignedIn: staySignedInPreferred() }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Google 로그인 연결을 확인해 주세요.'); setBusy(false); } };
  return <section className="teacher-login rounded-2xl border border-slate-300 bg-white p-5 text-slate-900 max-w-xl mx-auto" aria-labelledby="teacher-reconnect-title">
    <h1 id="teacher-reconnect-title" className="text-xl font-bold">Google 다시 연결</h1>
    <p className="text-sm my-3">{message} 선생님 로그인은 그대로예요. 버튼 한 번이면 이 화면으로 돌아와요.</p>
    <div className="teacher-account-form"><button type="button" className="taf-google" disabled={busy} onClick={() => void go()}>{busy ? 'Google로 이동 중…' : 'Google로 다시 연결'}</button></div>
    {error && <p role="alert" className="text-red-700 mt-3">{error}</p>}
  </section>;
}
const RENEW_MS = 20 * 60 * 1000;
export function TeacherAuthGuard({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false); const [error, setError] = useState('');
  const [checking,setChecking]=useState(true);
  const [reconnect, setReconnect] = useState('');
  useEffect(() => { removeStorage('teacher_master_pin'); removeStorage('teacher_session_auth', 'session'); let active = true;
    teacherStatus().then(async s => { if (s.authenticated) await ensureClassroomTeacher(); if (active) setAuthenticated(s.authenticated); }).catch(cause => { if (active && cause instanceof TeacherReconnectError) { setReconnect(cause.message); return; } if (active) setError(cause instanceof Error ? cause.message : '교사 인증 서버와 접근 코드를 설정해 주세요.'); }).finally(()=>{if(active)setChecking(false);}); return () => { active = false; };
  }, []);
  // The server grant is short-lived. Renew it while a teacher screen stays open so a
  // lesson is never cut off, and ask for a plain re-login only when the login itself ended.
  useEffect(() => { if (!authenticated) return; let active = true, last = Date.now(), busy = false;
    const renew = async () => { if (busy || !navigator.onLine) return; busy = true;
      try { await ensureClassroomTeacher(); last = Date.now(); }
      catch (cause) { if (cause instanceof TeacherReconnectError) { if (active) { setReconnect(cause.message); setAuthenticated(false); } return; } try { const s = await teacherStatus(); if (active && !s.authenticated) { setError('교사 로그인이 만료됐어요. 다시 로그인하면 이 화면으로 돌아옵니다.'); setAuthenticated(false); } } catch { /* A network blip keeps the current screen; the next tick retries. */ } }
      finally { busy = false; } };
    const timer = window.setInterval(() => void renew(), RENEW_MS);
    const wake = () => { if (!document.hidden && Date.now() - last > RENEW_MS) void renew(); };
    document.addEventListener('visibilitychange', wake); window.addEventListener('online', wake);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', wake); window.removeEventListener('online', wake); };
  }, [authenticated]);
  if(checking)return <FlowShell utilities className="teacher-auth" back="/teacher" backLabel="교사 시작 화면"><p role="status">교사 인증을 확인하고 있어요…</p></FlowShell>;
  if (!authenticated && reconnect) return <FlowShell utilities className="teacher-auth" back="/teacher" backLabel="교사 시작 화면"><TeacherReconnect message={reconnect}/></FlowShell>;
  return authenticated ? <>{children}</> : <FlowShell utilities className="teacher-auth" back="/teacher" backLabel="교사 시작 화면">{error && <p role="status">{error}</p>}<TeacherLogin onLogin={() => { void ensureClassroomTeacher().then(()=>setAuthenticated(true)).catch(cause=>{ if (cause instanceof TeacherReconnectError) setReconnect(cause.message); else setError(cause instanceof Error?cause.message:'수업방 인증 실패'); }); }} /><p className="teacher-auth-note">교사 인증 후에도 DB에서 방 소유권과 권한 만료를 확인합니다. 기존에 소유자 없이 만들어진 방은 자동으로 가져오지 않습니다.</p></FlowShell>;
}
