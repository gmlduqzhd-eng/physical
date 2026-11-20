import { createClient } from '@supabase/supabase-js';
import { readStorage, writeStorage, removeStorage } from '../application/browserStorage';
import { createTeacherAuthStorage } from './teacherAuthStorage';

// 빈 문자열이 들어가면 createClient가 아예 에러를 던져서 앱이 뻗습니다.
// 임시 올바른 URL 형태를 넣어 앱 크래시를 방지합니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

// 선생님이 '30일 로그인 유지'를 골랐을 때만 Google 교사 세션을 이 기기에 둔다(teacherAuthStorage.ts).
// 학생 익명 세션과 그 밖의 값은 지금처럼 이 탭에만 둔다.
export const teacherAuthStorage = createTeacherAuthStorage({
  local: { get: key => readStorage(key), set: (key, value) => { writeStorage(key, value); }, remove: key => removeStorage(key) },
  session: { get: key => readStorage(key, 'session'), set: (key, value) => { writeStorage(key, value, 'session'); }, remove: key => removeStorage(key, 'session') },
});
export const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: {
  storageKey: 'physical_supabase_auth', detectSessionInUrl: false, flowType:'pkce',
  storage: { getItem: key => teacherAuthStorage.getItem(key), setItem: (key,value) => { teacherAuthStorage.setItem(key,value); }, removeItem: key => teacherAuthStorage.removeItem(key) },
} });
/** 서버의 30일 로그인과 함께 이 기기의 Google 연결도 30일 유지한다(remember=false면 이 탭에만). */
export function keepTeacherConnection(remember: boolean) {
  if (remember) teacherAuthStorage.keepOnDevice(); else teacherAuthStorage.forgetOnDevice();
}
/** 서버 로그인은 살아 있는데 이 탭의 Google 연결이 없거나 다른 계정일 때. '다시 연결' 버튼을 보여 준다. */
export class TeacherReconnectError extends Error {}
let signingIn: Promise<string> | null = null;
export function ensureClassroomUser(): Promise<string> {
  if (signingIn) return signingIn;
  signingIn = (async () => {
    const existing = await supabase.auth.getSession();
    if (existing.data.session) return existing.data.session.access_token;
    const result = await supabase.auth.signInAnonymously();
    if (result.error?.status === 429) throw new Error('같은 인터넷에서 새로 참여하는 기기의 요청이 잠시 몰렸어요. 입장 버튼을 반복해서 누르지 말고 잠시 후 다시 시도해주세요. 계속되면 선생님에게 알려주세요.');
    if (result.error || !result.data.session) throw new Error('수업 연결을 시작하지 못했어요. 인터넷 연결을 확인하고 다시 시도해주세요.');
    return result.data.session.access_token;
  })().finally(() => { signingIn = null; });
  return signingIn;
}
export async function ensureClassroomTeacher() {
  const accessToken = await ensureClassroomUser();
  const res = await fetch('/api/teacher?action=classroom-authorize', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({accessToken}) });
  // 서버가 JSON이 아닌 답(예: 점검 화면, 프록시 오류)을 주면 영어 원문 오류가 그대로 보이지 않게 우리말 안내로 바꾼다.
  const data = await res.json().catch(() => null) as { error?: unknown; reconnect?: unknown } | null;
  if (res.status === 409 && data?.reconnect === true) throw new TeacherReconnectError(typeof data.error === 'string' ? data.error : '이 화면의 Google 연결이 끊겼어요. Google로 다시 연결해 주세요.');
  if (!res.ok || !data) throw new Error(typeof data?.error === 'string' && data.error ? data.error : '선생님 수업방 권한을 확인하지 못했어요. 인터넷 연결을 확인하고 잠시 뒤 다시 해 주세요.');
}
export async function endClassroomSession() {
  const current = await supabase.auth.getSession();
  if (current.data.session) await supabase.rpc('logout_classroom');
  await supabase.auth.signOut({scope:'local'});
}
