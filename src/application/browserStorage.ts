type StorageKind = 'local' | 'session';
const sessionFallback = new Map<string, string | null>();
const privateKeys = ['physical_supabase_auth', 'physical_student_name', 'physical_student_role', 'physical_last_room', 'physical_last_group', 'physical_last_group_name', 'physical_player_profile'];
let fallbackExpires = Date.now() + 8 * 60 * 60 * 1000;
function privacyKind(key: string, kind: StorageKind): StorageKind {
  if (!privateKeys.includes(key)) return kind;
  if (fallbackExpires <= Date.now()) { privateKeys.forEach(k => sessionFallback.delete(`session:${k}`)); fallbackExpires = Date.now() + 8 * 60 * 60 * 1000; }
  try {
    // Do not migrate old names or histories on shared school devices.
    window.localStorage.removeItem(key);
    const expiry = Number(window.sessionStorage.getItem('physical_private_expires') ?? 0);
    if (!expiry || expiry <= Date.now()) {
      privateKeys.forEach(k => { window.sessionStorage.removeItem(k); sessionFallback.delete(`session:${k}`); });
      window.sessionStorage.setItem('physical_private_expires', String(Date.now() + 8 * 60 * 60 * 1000));
    }
  } catch { /* Storage fallback is only in memory. */ }
  return 'session';
}

export function purgeLegacyPersonalData() {
  try { [...privateKeys, 'teacher_master_pin', 'teacher_session_auth'].forEach(key => window.localStorage.removeItem(key)); window.sessionStorage.removeItem('teacher_session_auth'); } catch { /* Denied storage contains no accessible local state. */ }
}

// Private browsing and embedded browsers can deny storage even when the API exists.
export function readStorage(key: string, kind: StorageKind = 'local'): string | null {
  kind = privacyKind(key, kind);
  const fallbackKey = `${kind}:${key}`;
  if (sessionFallback.has(fallbackKey)) return sessionFallback.get(fallbackKey) ?? null;
  try {
    return (kind === 'session' ? window.sessionStorage : window.localStorage).getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string, kind: StorageKind = 'local'): boolean {
  kind = privacyKind(key, kind);
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
  kind = privacyKind(key, kind);
  try {
    (kind === 'session' ? window.sessionStorage : window.localStorage).removeItem(key);
    sessionFallback.delete(`${kind}:${key}`);
  } catch {
    sessionFallback.set(`${kind}:${key}`, null);
  }
}

export function clearDeviceInformation() {
  sessionFallback.clear();
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (let index = storage.length - 1; index >= 0; index--) {
      const key = storage.key(index);
      if (key && /^(physical_|teacher_|pin_battle_)/.test(key)) storage.removeItem(key);
    }
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
