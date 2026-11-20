import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

// The classroom teacher cookie covers a school day so a lesson never loses control mid-class.
// A teacher may choose "이 기기에서 30일 동안 로그인 유지" on a personal device; shared computers keep a school day.
// The separate AI studio keeps the short lifetime.
export const REMEMBER_SECONDS = 30 * 24 * 60 * 60;
const DAY_SECONDS = 10 * 60 * 60;
const lifetimeFor = (scope: string, remember = false) => scope === 'physical_teacher' ? (remember ? REMEMBER_SECONDS : DAY_SECONDS) : 2 * 60 * 60;
const maxLifetimeFor = (scope: string) => scope === 'physical_teacher' ? REMEMBER_SECONDS : lifetimeFor(scope);
export function authConfigured() {
  return /^[a-f0-9]{32}:[a-f0-9]{128}$/.test(process.env.TEACHER_ACCESS_HASH ?? '') && (process.env.TEACHER_SESSION_SECRET?.length ?? 0) >= 32;
}
function mac(data: string, scope = 'physical_teacher') { return createHmac('sha256', process.env.TEACHER_SESSION_SECRET!).update(scope + ':' + data).digest('base64url'); }
function equal(a: string, b: string) { const x = Buffer.from(a); const y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }
export function verifyCode(code: string) {
  if (!authConfigured() || code.length < 12 || code.length > 128) return false;
  const [salt, hash] = process.env.TEACHER_ACCESS_HASH!.split(':');
  return equal(scryptSync(code, salt, 64).toString('hex'), hash);
}
export function newSession(scope = 'physical_teacher', accountNonce?: string, remember = false) {
  const keep = remember && scope === 'physical_teacher';
  const payload = Buffer.from(JSON.stringify({ expires: Date.now() + lifetimeFor(scope, keep) * 1000, nonce: accountNonce ?? randomBytes(18).toString('hex'), ...(keep ? { remember: true } : {}) })).toString('base64url');
  return `${payload}.${mac(payload, scope)}`;
}
export function session(req: IncomingMessage, scope = 'physical_teacher'): string | null {
  return sessionDetails(req, scope)?.nonce ?? null;
}
/** The signed session and whether the teacher chose to stay signed in on this device. */
export function sessionDetails(req: IncomingMessage, scope = 'physical_teacher'): { nonce: string; remember: boolean } | null {
  if (!authConfigured()) return null;
  const token = (req.headers.cookie ?? '').split(';').map(s => s.trim()).find(s => s.startsWith(scope + '='))?.slice(scope.length + 1);
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !equal(mac(payload, scope), signature)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof parsed.expires !== 'number' || typeof parsed.nonce !== 'string' || parsed.expires < Date.now()) return null;
    const remember = parsed.remember === true && scope === 'physical_teacher';
    if (parsed.expires > Date.now() + lifetimeFor(scope, remember) * 1000 || parsed.expires > Date.now() + maxLifetimeFor(scope) * 1000) return null;
    return { nonce: parsed.nonce, remember };
  } catch { return null; }
}
export function cookie(token: string, logout = false, scope = 'physical_teacher', remember = false) {
  return `${scope}=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${logout ? 0 : lifetimeFor(scope, remember && scope === 'physical_teacher')}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

// Additional abuse control only. Production needs a shared WAF/rate limit across instances.
const attempts = new Map<string, { count: number; until: number }>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  for (const [id, entry] of attempts) if (entry.until < now) attempts.delete(id);
  const entry = attempts.get(key) ?? { count: 0, until: now + windowMs };
  entry.count++; attempts.set(key, entry);
  if (attempts.size > 2000) attempts.delete(attempts.keys().next().value!);
  return entry.count <= max;
}
