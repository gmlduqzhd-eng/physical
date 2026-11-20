/**
 * 학생 앱 → 교사 수업 준비실(다른 주소) 로그인 넘겨주기.
 *
 * 주소에는 아무 토큰도 싣지 않는다(방문 기록·동기화 기록에 남지 않게).
 * 1. 선생님이 '수업 준비실 열기'를 누르면 새 탭으로 `수업 준비실/#from-app`을 연다.
 * 2. 수업 준비실은 주소를 바로 지우고, 자기를 연 창(이 앱)에게만 "준비됐어요(nonce)"를 보낸다.
 * 3. 이 앱은 보낸 곳이 수업 준비실 주소이고 방금 연 그 창일 때만, 같은 nonce와 함께 Google 교사 토큰을
 *    postMessage로 수업 준비실 주소에만 보낸다.
 * 4. 수업 준비실은 보낸 곳이 이 앱 주소이고 자기를 연 창이며 nonce가 같을 때만 받아, 기존 google-login 검증으로
 *    자기 쿠키(2시간)를 받는다. 다른 사이트가 수업 준비실을 열어도 이 앱 주소가 아니라서 받지 않는다(로그인 CSRF 방지).
 * 세션이 없거나 익명(학생) 세션이면 토큰 없이 답한다 → 수업 준비실에서 Google 로그인.
 */
import type { Session } from '@supabase/supabase-js';

export const STUDIO_ORIGIN = import.meta.env?.DEV ? 'http://127.0.0.1:5174' : 'https://physical-teacher-studio.vercel.app';
export const HANDOFF_READY = 'physical-studio-ready';
export const HANDOFF_TOKEN = 'physical-studio-handoff';
export const HANDOFF_HASH = '#from-app';
const NONCE = /^[a-f0-9]{32}$/;

/** 넘겨줄 수 있는 교사 Google 세션인지 확인한다. 익명(학생) 세션은 절대 넘기지 않는다. */
export function handoffToken(session: Pick<Session, 'access_token' | 'user'> | null | undefined): string | null {
  const user = session?.user;
  if (!session?.access_token || !user || user.is_anonymous) return null;
  const google = user.app_metadata?.provider === 'google' || (user.identities ?? []).some(identity => identity.provider === 'google');
  return google ? session.access_token : null;
}

/** 수업 준비실 주소. 넘겨주기를 쓸 때만 `#from-app`(토큰 아님)을 붙인다. */
export function studioUrl(withHandoff: boolean, origin = STUDIO_ORIGIN) {
  return origin + '/' + (withHandoff ? HANDOFF_HASH : '');
}

/** 수업 준비실이 보낸 "준비됐어요"에서 nonce만 꺼낸다. */
export function readyNonce(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const { type, nonce } = data as { type?: unknown; nonce?: unknown };
  return type === HANDOFF_READY && typeof nonce === 'string' && NONCE.test(nonce) ? nonce : null;
}

/** 만료가 2분 안쪽이면 새로 받아 둔다. 실패하면 null(수업 준비실에서 Google 로그인). */
export async function currentHandoffToken(): Promise<string | null> {
  try {
    const { supabase } = await import('../data/supabase');
    let session = (await supabase.auth.getSession()).data.session;
    if (session && (session.expires_at ?? 0) * 1000 < Date.now() + 120_000) session = (await supabase.auth.refreshSession()).data.session;
    return handoffToken(session);
  } catch { return null; }
}

type OpenerWindow = Pick<Window, 'open' | 'addEventListener' | 'removeEventListener'>;

/**
 * 새 탭으로 수업 준비실을 열고, 그 탭이 "준비됐어요"라고 하면 한 번만 토큰을 보낸다.
 * 팝업이 막히면 false(호출한 쪽이 토큰 없이 같은 탭으로 연다). 1분이 지나면 더 듣지 않는다.
 */
export function openStudioWithHandoff(win: OpenerWindow = window, token: () => Promise<string | null> = currentHandoffToken, origin = STUDIO_ORIGIN): boolean {
  const pending = token();
  const child = win.open(studioUrl(true, origin), '_blank');
  if (!child) return false;
  const stop = () => { win.removeEventListener('message', onMessage as EventListener); clearTimeout(timer); };
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== origin || event.source !== child) return;
    const nonce = readyNonce(event.data);
    if (!nonce) return;
    stop();
    void pending.then(value => { try { child.postMessage({ type: HANDOFF_TOKEN, nonce, token: value }, origin); } catch { /* 탭이 닫혔으면 할 일이 없다. */ } });
  };
  const timer = setTimeout(stop, 60_000);
  win.addEventListener('message', onMessage as EventListener);
  return true;
}
