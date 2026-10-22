import { createClient } from '@supabase/supabase-js';
import { readStorage, writeStorage, removeStorage } from '../application/browserStorage';

// 빈 문자열이 들어가면 createClient가 아예 에러를 던져서 앱이 뻗습니다.
// 임시 올바른 URL 형태를 넣어 앱 크래시를 방지합니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: {
  storageKey: 'physical_supabase_auth', detectSessionInUrl: false,
  storage: { getItem: key => readStorage(key, 'session'), setItem: (key,value) => { writeStorage(key,value,'session'); }, removeItem: key => removeStorage(key,'session') },
} });
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
  const data = await res.json(); if (!res.ok) throw new Error(data.error ?? '교사 수업방 권한 확인에 실패했습니다.');
}
export async function endClassroomSession() {
  const current = await supabase.auth.getSession();
  if (current.data.session) await supabase.rpc('logout_classroom');
  await supabase.auth.signOut({scope:'local'});
}
