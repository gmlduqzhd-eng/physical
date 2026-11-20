/**
 * 선생님 Google 연결(Supabase 세션)을 어디에 둘지 정한다.
 *
 * - 기본: 이 탭에만(sessionStorage). 학생·공용 기기의 익명 세션도 늘 여기에 둔다.
 * - 선생님이 '이 기기에서 30일 동안 로그인 유지'를 골랐을 때만: Google 교사 세션을 이 기기(localStorage)에
 *   30일 동안 둔다. 서버 로그인 쿠키도 같은 30일이라, 탭을 닫았다 열어도 반 만들기·관리를 바로 쓸 수 있다.
 * - 로그아웃(signOut)·'기기 정보 지우기'·30일이 지나면 함께 지워진다(키가 physical_로 시작한다).
 * - 익명(학생) 세션은 절대 기기에 오래 두지 않는다.
 */
export const AUTH_KEY = 'physical_supabase_auth';
export const KEEP_UNTIL_KEY = 'physical_teacher_keep_until_v1';
export const KEPT_AUTH_KEY = 'physical_teacher_auth_v1';
export const TEACHER_KEEP_MS = 30 * 24 * 60 * 60 * 1000;

export interface KeyValueStore {
  local: { get(key: string): string | null; set(key: string, value: string): void; remove(key: string): void };
  session: { get(key: string): string | null; set(key: string, value: string): void; remove(key: string): void };
}

/** Google로 로그인한 실제 선생님 세션인지(익명 학생 세션이 아닌지). */
export function isGoogleTeacherSession(value: string | null): boolean {
  if (!value || value.length > 20000) return false;
  try {
    const user = (JSON.parse(value) as { user?: { is_anonymous?: unknown; app_metadata?: { provider?: unknown }; identities?: { provider?: unknown }[] } })?.user;
    if (!user || user.is_anonymous === true) return false;
    return user.app_metadata?.provider === 'google' || (Array.isArray(user.identities) && user.identities.some(identity => identity?.provider === 'google'));
  } catch { return false; }
}

export function createTeacherAuthStorage(store: KeyValueStore, now: () => number = Date.now) {
  /** 30일 유지가 켜져 있으면 끝나는 시각, 아니면 0. 기한이 지났거나 이상한 값이면 지운다. */
  const keepUntil = () => {
    const raw = store.local.get(KEEP_UNTIL_KEY);
    if (raw === null) return 0;
    const until = Number(raw);
    if (!Number.isFinite(until) || until <= now() || until > now() + TEACHER_KEEP_MS + 60_000) {
      store.local.remove(KEEP_UNTIL_KEY); store.local.remove(KEPT_AUTH_KEY);
      return 0;
    }
    return until;
  };
  return {
    keepUntil,
    getItem(key: string): string | null {
      if (key === AUTH_KEY && keepUntil()) {
        const kept = store.local.get(KEPT_AUTH_KEY);
        if (kept) return kept;
      }
      return store.session.get(key);
    },
    setItem(key: string, value: string) {
      // 토큰이 새로 고쳐질 때도 같은 곳에 둔다. 익명 세션은 30일 유지 중이어도 이 탭에만 둔다.
      if (key === AUTH_KEY && keepUntil() && isGoogleTeacherSession(value)) {
        store.local.set(KEPT_AUTH_KEY, value);
        store.session.remove(key);
        return;
      }
      store.session.set(key, value);
    },
    removeItem(key: string) {
      // 로그아웃: 기기에 둔 선생님 연결과 30일 표시를 함께 지운다.
      if (key === AUTH_KEY) { store.local.remove(KEPT_AUTH_KEY); store.local.remove(KEEP_UNTIL_KEY); }
      store.session.remove(key);
    },
    /** 서버가 30일 로그인을 받아 준 뒤 부른다. 이 탭의 Google 세션을 기기로 옮긴다. */
    keepOnDevice() {
      // 이미 30일 유지 중에 다시 로그인했으면 새 세션은 기기 쪽에 들어가 있다.
      const current = store.session.get(AUTH_KEY) ?? store.local.get(KEPT_AUTH_KEY);
      if (!isGoogleTeacherSession(current)) return false;
      store.local.set(KEEP_UNTIL_KEY, String(now() + TEACHER_KEEP_MS));
      store.local.set(KEPT_AUTH_KEY, current!);
      store.session.remove(AUTH_KEY);
      return true;
    },
    /** 30일 유지를 고르지 않고 로그인했을 때: 기기에 둔 연결은 지우고, 지금 탭의 연결만 남긴다. */
    forgetOnDevice() {
      const kept = store.local.get(KEPT_AUTH_KEY);
      if (kept && isGoogleTeacherSession(kept)) store.session.set(AUTH_KEY, kept);
      store.local.remove(KEEP_UNTIL_KEY); store.local.remove(KEPT_AUTH_KEY);
    },
  };
}
