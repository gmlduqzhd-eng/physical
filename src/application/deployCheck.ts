/**
 * 화면 파일(청크)을 못 받았을 때 새로고침할지 정한다.
 *
 * 예전에는 vite:preloadError가 나면 무조건 새로고침했다. 그러면
 * - 인터넷이 끊긴 기기(서비스워커가 없는 첫 방문, 사생활 보호 모드, 서비스워커를 막은 학교 기기)는
 *   새로고침하자마자 브라우저의 '인터넷 없음' 페이지로 바뀌어, 놀이 오류 화면과 '오늘 수업' 막대가 사라졌다.
 * - 잠깐 끊긴 것뿐인데도 늘 화면 전체를 새로 불렀다.
 * 그래서 새로 배포되어 예전 파일이 없어진 경우에만 새로고침하고, 나머지는 놀이 오류 화면이 맡게 한다.
 */

/** HTML 안의 앱 시작 스크립트 주소(예: /assets/index-abc123.js, 개발 중에는 /src/main.tsx). */
export function entryScriptFrom(html: string): string | null {
  const tags = html.match(/<script\b[^>]*\btype=["']module["'][^>]*>/gi) ?? [];
  for (const tag of tags) {
    const src = /\bsrc=["']([^"']+)["']/i.exec(tag)?.[1];
    if (src && !src.includes('@vite/client')) return src.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  }
  return null;
}

/** 지금 열린 페이지의 앱 시작 스크립트 주소. */
export function currentEntryScript(doc: Document = document): string | null {
  return entryScriptFrom(Array.from(doc.querySelectorAll('script[type="module"][src]')).map(s => s.outerHTML).join(''));
}

export type ReloadDecision = 'reload' | 'stay';

/**
 * 새로고침할지 정한다.
 * - 인터넷이 끊겨 있으면 절대 새로고침하지 않는다(브라우저 오류 페이지가 된다).
 * - 서버의 index.html을 캐시 없이 받아 시작 스크립트가 바뀌었을 때(새 배포)만 새로고침한다.
 * - index.html을 못 받으면(끊김·서버 오류) 그대로 둔다.
 * - 어느 한쪽 주소를 알 수 없으면 예전처럼 새로고침한다.
 */
export async function decideReloadAfterChunkError(options: {
  online: boolean;
  current: string | null;
  fetchIndex: () => Promise<string>;
}): Promise<ReloadDecision> {
  if (!options.online) return 'stay';
  let html: string;
  try { html = await options.fetchIndex(); } catch { return 'stay'; }
  const latest = entryScriptFrom(html);
  if (!latest || !options.current) return 'reload';
  return latest === options.current ? 'stay' : 'reload';
}

const RELOAD_KEY = 'physical_reloaded_for_update';

/** 60초 안에 두 번 새로고침하지 않게 막는다. 새로고침해도 되면 true. */
export function claimReloadSlot(now = Date.now(), storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeSession()): boolean {
  try {
    const last = Number(storage?.getItem(RELOAD_KEY) || 0);
    if (now - last < 60_000) return false;
    storage?.setItem(RELOAD_KEY, String(now));
  } catch { /* 저장소를 못 쓰면 막지 않는다. */ }
  return true;
}

function safeSession(): Storage | null { try { return sessionStorage; } catch { return null; } }
