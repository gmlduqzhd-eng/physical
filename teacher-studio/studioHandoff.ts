/**
 * 학생 앱에서 이미 Google로 로그인한 선생님이 수업 준비실로 넘어올 때 쓰는 일회성 연결.
 * 학생 앱은 주소의 # 뒤(fragment)에만 Supabase 접근 토큰을 붙인다. fragment는 서버 요청·Referer로 전송되지 않는다.
 * 수업 준비실은 화면을 열자마자 주소에서 토큰을 지우고, 기존 google-login 검증으로 자기 쿠키를 받는다.
 */
const TOKEN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/** `#handoff=<토큰>`에서 토큰만 꺼낸다. 모양이 이상하면 null. */
export function parseStudioHandoff(hash: string): string | null {
  if (!hash.startsWith('#')) return null;
  const token = new URLSearchParams(hash.slice(1)).get('handoff');
  if (!token || token.length < 20 || token.length > 8192 || !TOKEN.test(token)) return null;
  return token;
}

type HandoffWindow = { location: { hash: string; pathname: string; search: string }; history: { replaceState: (data: unknown, unused: string, url: string) => void } };

/** 주소에 토큰이 있으면 바로 지우고(뒤로 가기·새로고침·북마크에도 남지 않게) 돌려준다. */
export function takeStudioHandoff(win: HandoffWindow = window): string | null {
  const { hash, pathname, search } = win.location;
  if (!hash.includes('handoff=')) return null;
  win.history.replaceState(null, '', pathname + search);
  return parseStudioHandoff(hash);
}
