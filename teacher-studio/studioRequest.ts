export class StudioRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'StudioRequestError';
    this.status = status;
  }
}

export function studioSessionExpired(error: unknown) {
  return error instanceof StudioRequestError && error.status === 401;
}

export async function requestStudio(action: string, body?: unknown, fetcher: typeof fetch = fetch) {
  const res = await fetcher('/api/studio?action=' + action, body === undefined
    ? { signal: AbortSignal.timeout(105000) }
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(105000) });
  const data = await res.json();
  if (!res.ok) throw new StudioRequestError(res.status, typeof data.error === 'string' ? data.error : '연결 실패');
  return data;
}
