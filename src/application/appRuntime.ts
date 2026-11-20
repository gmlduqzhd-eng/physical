/**
 * 앱이 켜질 때 한 번 하는 일.
 *
 * 1) 서비스워커에게 '이 화면이 벌써 받은 파일'을 알려 준다. 서비스워커는 처음 화면과 학생 화면만 미리 받고
 *    나머지는 쓸 때 받는다. 처음 연 화면은 서비스워커가 일하기 전에 받았으므로, 이름을 알려 줘야 오프라인에서도 열린다.
 * 2) 잡히지 않은 오류를 콘솔에 남긴다. 아직 오류를 서버로 모으지는 않는다(개인정보 검토와 새 서버 함수가 필요해서).
 *    수업 중 TV나 학생 폰에서 문제가 생기면 개발자 도구의 콘솔에서 '[땀방울]'로 찾을 수 있다.
 */

/** 같은 주소의 /assets·/images 파일만 고른다. */
export function loadedAppFiles(names: readonly string[], origin: string): string[] {
  const out = new Set<string>();
  for (const name of names) {
    let url: URL;
    try { url = new URL(name, origin); } catch { continue; }
    if (url.origin !== origin || url.search) continue;
    if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/images/')) out.add(url.href);
  }
  return [...out];
}

function shareLoadedFiles() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || typeof performance === 'undefined') return;
  const send = () => {
    void navigator.serviceWorker.ready.then(registration => {
      const names = performance.getEntriesByType('resource').map(entry => entry.name);
      const urls = loadedAppFiles(names, window.location.origin);
      if (urls.length) registration.active?.postMessage({ type: 'cache-loaded', urls });
    }).catch(() => {});
  };
  // 첫 화면이 다 그려진 뒤에 보낸다. 화면에 필요한 파일과 다투지 않게 하려는 것.
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => void }).requestIdleCallback;
  const later = () => (idle ? idle(send, { timeout: 10_000 }) : window.setTimeout(send, 3_000));
  if (document.readyState === 'complete') later(); else window.addEventListener('load', later, { once: true });
}

function describe(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  try { return typeof value === 'string' ? value : JSON.stringify(value); } catch { return String(value); }
}

function logUncaughtErrors() {
  window.addEventListener('error', event => {
    // 그림·스크립트 파일을 못 받은 것은 각 화면이 따로 알려 준다.
    if (!(event instanceof ErrorEvent)) return;
    console.error('[땀방울] 잡히지 않은 오류', window.location.pathname, describe(event.error ?? event.message));
  });
  window.addEventListener('unhandledrejection', event => {
    console.error('[땀방울] 처리되지 않은 비동기 오류', window.location.pathname, describe(event.reason));
  });
}

let started = false;
export function startAppRuntime() {
  if (started || typeof window === 'undefined') return;
  started = true;
  logUncaughtErrors();
  shareLoadedFiles();
}
