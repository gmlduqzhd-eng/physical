/**
 * 학생 앱에서 이미 Google로 로그인한 선생님이 수업 준비실로 넘어올 때 쓰는 연결(src/application/studioHandoff.ts 참고).
 * 주소에는 토큰이 없다. `#from-app`이면 주소를 바로 지우고, 자기를 연 창에게만 "준비됐어요(nonce)"를 보낸 뒤
 * 학생 앱 주소에서, 자기를 연 그 창이, 같은 nonce로 보낸 토큰만 받는다.
 */
export const APP_ORIGIN = import.meta.env?.DEV ? 'http://127.0.0.1:5173' : 'https://physical-pi.vercel.app';
export const HANDOFF_READY = 'physical-studio-ready';
export const HANDOFF_TOKEN = 'physical-studio-handoff';
const TOKEN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/** 받은 메시지가 기다리던 토큰이면 토큰을, 아니면 null. */
export function parseHandoffMessage(data: unknown, nonce: string): string | null {
  if (!data || typeof data !== 'object') return null;
  const message = data as { type?: unknown; nonce?: unknown; token?: unknown };
  if (message.type !== HANDOFF_TOKEN || message.nonce !== nonce || typeof message.token !== 'string') return null;
  const token = message.token;
  return token.length >= 20 && token.length <= 8192 && TOKEN.test(token) ? token : null;
}

type HandoffWindow = {
  location: { hash: string; pathname: string; search: string };
  history: { replaceState: (data: unknown, unused: string, url: string) => void };
  opener: { postMessage: (message: unknown, targetOrigin: string) => void } | null;
  addEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void;
  removeEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void;
  crypto: { getRandomValues: (array: Uint8Array) => Uint8Array };
};

function newNonce(win: HandoffWindow) {
  return Array.from(win.crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 학생 앱에서 열렸으면 토큰을 기다렸다가 돌려준다. 그렇지 않으면 바로 null.
 * 예전 방식의 `#handoff=…` 주소로 들어오면 주소만 지우고 쓰지 않는다.
 */
export function receiveStudioHandoff(win: HandoffWindow = window as unknown as HandoffWindow, appOrigin = APP_ORIGIN, timeoutMs = 8000): Promise<string | null> {
  const { hash, pathname, search } = win.location;
  if (hash.includes('handoff=')) { win.history.replaceState(null, '', pathname + search); return Promise.resolve(null); }
  if (hash !== '#from-app') return Promise.resolve(null);
  win.history.replaceState(null, '', pathname + search);
  const opener = win.opener;
  if (!opener) return Promise.resolve(null);
  const nonce = newNonce(win);
  return new Promise(resolve => {
    const done = (token: string | null) => {
      win.removeEventListener('message', onMessage);
      clearTimeout(timer);
      try { win.opener = null; } catch { /* 일부 브라우저는 opener를 바꿀 수 없다. */ }
      resolve(token);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== appOrigin || event.source !== opener) return;
      const data = event.data as { type?: unknown; nonce?: unknown } | null;
      if (!data || data.type !== HANDOFF_TOKEN || data.nonce !== nonce) return;
      done(parseHandoffMessage(data, nonce));
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    win.addEventListener('message', onMessage);
    // 학생 앱 주소로만 보낸다. 다른 사이트가 이 탭을 열었으면 브라우저가 이 메시지를 버린다.
    try { opener.postMessage({ type: HANDOFF_READY, nonce }, appOrigin); } catch { done(null); }
  });
}
