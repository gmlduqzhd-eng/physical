/**
 * 학생 앱 → 교사 수업 준비실(다른 주소) 로그인 넘겨주기.
 * 이 탭에 Google로 로그인한 교사 세션이 있으면 접근 토큰을 주소의 # 뒤에만 붙여 넘긴다.
 * (# 뒤는 서버로 전송되지 않고, 수업 준비실이 열리자마자 지운다. 수업 준비실 서버는 기존 Google 로그인과 똑같이 검증한다.)
 * 세션이 없거나 익명(학생) 세션이면 토큰 없이 연다 → 수업 준비실에서 Google 로그인.
 */
import type { Session } from '@supabase/supabase-js';

export const STUDIO_ORIGIN = import.meta.env?.DEV ? 'http://127.0.0.1:5174' : 'https://physical-teacher-studio.vercel.app';

/** 넘겨줄 수 있는 교사 Google 세션인지 확인한다. 익명(학생) 세션은 절대 넘기지 않는다. */
export function handoffToken(session: Pick<Session, 'access_token' | 'user'> | null | undefined): string | null {
  const user = session?.user;
  if (!session?.access_token || !user || user.is_anonymous) return null;
  const google = user.app_metadata?.provider === 'google' || (user.identities ?? []).some(identity => identity.provider === 'google');
  return google ? session.access_token : null;
}

export function studioUrl(token: string | null, origin = STUDIO_ORIGIN) {
  return origin + '/' + (token ? '#handoff=' + encodeURIComponent(token) : '');
}

/** 만료가 2분 안쪽이면 새로 받아 둔다. 실패해도 토큰 없이 연다. */
export async function studioHandoffUrl(): Promise<string> {
  try {
    const { supabase } = await import('../data/supabase');
    let session = (await supabase.auth.getSession()).data.session;
    if (session && (session.expires_at ?? 0) * 1000 < Date.now() + 120_000) session = (await supabase.auth.refreshSession()).data.session;
    return studioUrl(handoffToken(session));
  } catch { return studioUrl(null); }
}
