export class StudioRequestError extends Error {
  status: number;
  retrySeconds: number;
  constructor(status: number, message: string, retrySeconds = 0) {
    super(message);
    this.name = 'StudioRequestError';
    this.status = status;
    this.retrySeconds = retrySeconds;
  }
}

export function studioSessionExpired(error: unknown) {
  return error instanceof StudioRequestError && error.status === 401;
}

export async function requestStudio(action: string, body?: unknown, fetcher: typeof fetch = fetch, signal?: AbortSignal) {
  const requestSignal=signal?AbortSignal.any([signal,AbortSignal.timeout(105000)]):AbortSignal.timeout(105000);
  const res = await fetcher('/api/studio?action=' + action, body === undefined
    ? { signal: requestSignal }
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: requestSignal });
  const data = await res.json();
  if (!res.ok) throw new StudioRequestError(res.status, typeof data.error === 'string' ? data.error : '연결 실패', Math.min(86400,Math.max(0,Number(res.headers.get('Retry-After'))||0)));
  return data;
}
