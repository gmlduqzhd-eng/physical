type StorageKind = 'local' | 'session';
const sessionFallback = new Map<string, string | null>();

// Private browsing and embedded browsers can deny storage even when the API exists.
export function readStorage(key: string, kind: StorageKind = 'local'): string | null {
  const fallbackKey = `${kind}:${key}`;
  if (sessionFallback.has(fallbackKey)) return sessionFallback.get(fallbackKey) ?? null;
  try {
    return (kind === 'session' ? window.sessionStorage : window.localStorage).getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string, kind: StorageKind = 'local'): boolean {
  try {
    (kind === 'session' ? window.sessionStorage : window.localStorage).setItem(key, value);
    sessionFallback.delete(`${kind}:${key}`);
    return true;
  } catch {
    sessionFallback.set(`${kind}:${key}`, value);
    return false;
  }
}

export function removeStorage(key: string, kind: StorageKind = 'local'): void {
  try {
    (kind === 'session' ? window.sessionStorage : window.localStorage).removeItem(key);
    sessionFallback.delete(`${kind}:${key}`);
  } catch {
    sessionFallback.set(`${kind}:${key}`, null);
  }
}

export function readJsonStorage(key: string, kind: StorageKind = 'local'): unknown {
  try {
    const raw = readStorage(key, kind);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function nonnegativeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.min(value, Number.MAX_SAFE_INTEGER)
    : fallback;
}

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
