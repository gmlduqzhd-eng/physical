/**
 * 선생님 로그인을 덜 번거롭게 하는 기기 설정. 개인정보(이메일·이름)는 저장하지 않는다.
 * - 교사 확인 체크를 이 기기에서 한 번 했는지
 * - 이 기기에서 Google 로그인을 한 적 있는지(있으면 계정 고르기 창을 건너뛴다)
 * 두 값 모두 `physical_` 접두어라 '기기 정보 지우기'로 함께 지워진다.
 */
import { readStorage, removeStorage, writeStorage } from './browserStorage';

const CONFIRMED_KEY = 'physical_teacher_confirmed_v1';
const GOOGLE_USED_KEY = 'physical_google_used_v1';
const RETURN_KEY = 'physical_teacher_login_return_v1';

export function teacherConfirmedOnDevice(): boolean { return readStorage(CONFIRMED_KEY) === '1'; }
export function rememberTeacherConfirmed() { writeStorage(CONFIRMED_KEY, '1'); }
export function forgetTeacherConfirmed() { removeStorage(CONFIRMED_KEY); }

export function googleUsedOnDevice(): boolean { return readStorage(GOOGLE_USED_KEY) === '1'; }
export function rememberGoogleUsed() { writeStorage(GOOGLE_USED_KEY, '1'); }

/** Google 계정 고르기 창을 띄울지: 처음 로그인하거나, 선생님이 다른 계정을 고르겠다고 했을 때만. */
export function shouldChooseGoogleAccount(chooseAccount: boolean, usedBefore: boolean): boolean {
  return chooseAccount || !usedBefore;
}

/**
 * 로그인 뒤 돌아갈 주소로 쓸 수 있는지 확인한다. 같은 사이트 안의 경로만 받는다.
 * `//evil.com`, `http:`, `javascript:`, 역슬래시, 제어 문자, 로그인 콜백 자체는 거절한다.
 */
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 300) return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  if (value.includes('\\') || [...value].some(ch => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127)) return null;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  let url: URL;
  try { url = new URL(value, 'https://app.invalid'); } catch { return null; }
  if (url.origin !== 'https://app.invalid') return null;
  if (url.pathname === '/teacher/google-callback' || url.pathname === '/google-callback') return null;
  return url.pathname + url.search;
}

export function saveLoginReturn(path: string) {
  const safe = safeReturnPath(path);
  if (!safe) { removeStorage(RETURN_KEY, 'session'); return; }
  writeStorage(RETURN_KEY, JSON.stringify({ path: safe, expiresAt: Date.now() + 10 * 60 * 1000 }), 'session');
}

export function takeLoginReturn(): string | null {
  const raw = readStorage(RETURN_KEY, 'session');
  removeStorage(RETURN_KEY, 'session');
  if (!raw || raw.length > 600) return null;
  try {
    const data = JSON.parse(raw) as { path?: unknown; expiresAt?: unknown };
    if (typeof data.expiresAt !== 'number' || data.expiresAt < Date.now() || data.expiresAt > Date.now() + 10 * 60 * 1000) return null;
    return safeReturnPath(data.path);
  } catch { return null; }
}
