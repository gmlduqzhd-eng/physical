/**
 * "인터넷 없이 쓰기 준비": 이 배포의 모든 화면 묶음을 서비스워커 저장소에 받아 둔다.
 * 체육관처럼 와이파이가 없는 곳에서도, 이 기기에서 한 번도 열지 않은 화면까지 열리게 하려는 것.
 * 한 번 준비하면 새 버전이 나와도 서비스워커가 설치될 때 전체를 다시 받아 둔다(public/sw.js).
 */
export type OfflineStatus = 'unsupported' | 'ready' | 'partial';
export type OfflineProgress = { done: number; total: number };

const ALL_LIST_URL = '/sw-all.json';
const OFFLINE_ALL_URL = '/__sw-offline-all';

const supported = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof caches !== 'undefined';

/** 받아 둘 목록의 모든 파일이 이미 저장소에 있으면 'ready'. */
export async function offlineStatus(): Promise<OfflineStatus> {
  if (!supported()) return 'unsupported';
  try {
    if (!navigator.serviceWorker.controller) return 'partial';
    if (!(await caches.match(OFFLINE_ALL_URL))) return 'partial';
    const response = await fetch(ALL_LIST_URL, { cache: 'no-cache' });
    if (!response.ok) return 'ready'; // 인터넷이 없으면 표시를 믿는다
    const files = (await response.json()) as unknown;
    if (!Array.isArray(files)) return 'partial';
    for (const file of files) if (typeof file === 'string' && !(await caches.match(file))) return 'partial';
    return 'ready';
  } catch {
    // 인터넷이 끊겨 목록을 못 받으면 준비했다는 표시만 본다.
    try { return (await caches.match(OFFLINE_ALL_URL)) ? 'ready' : 'partial'; } catch { return 'partial'; }
  }
}

/** 모든 화면을 받아 둔다. 끝나면 실패한 파일 수를 돌려준다(0이면 모두 받음). */
export async function prepareOffline(onProgress: (progress: OfflineProgress) => void): Promise<{ failed: number; total: number }> {
  if (!supported()) return { failed: 1, total: 0 };
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>(resolve => setTimeout(() => resolve(null), 8000)),
  ]);
  const worker = registration?.active;
  if (!worker) return { failed: 1, total: 0 };
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve({ failed: 1, total: 0 }), 180_000);
    channel.port1.onmessage = event => {
      const data = event.data as { type?: string; done?: number; total?: number; failed?: number };
      if (data?.type === 'cache-all-progress') onProgress({ done: data.done ?? 0, total: data.total ?? 0 });
      if (data?.type === 'cache-all-done') { clearTimeout(timer); channel.port1.close(); resolve({ failed: data.failed ?? 1, total: data.total ?? 0 }); }
    };
    worker.postMessage({ type: 'cache-all' }, [channel.port2]);
  });
}
