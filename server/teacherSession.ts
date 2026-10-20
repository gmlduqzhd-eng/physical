import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

const lifetime = 2 * 60 * 60;
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
export function newSession(scope = 'physical_teacher') {
  const payload = Buffer.from(JSON.stringify({ expires: Date.now() + lifetime * 1000, nonce: randomBytes(18).toString('hex') })).toString('base64url');
  return `${payload}.${mac(payload, scope)}`;
}
export function session(req: IncomingMessage, scope = 'physical_teacher'): string | null {
  if (!authConfigured()) return null;
  const token = (req.headers.cookie ?? '').split(';').map(s => s.trim()).find(s => s.startsWith(scope + '='))?.slice(scope.length + 1);
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !equal(mac(payload, scope), signature)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof parsed.expires !== 'number' || parsed.expires < Date.now() || parsed.expires > Date.now() + lifetime * 1000) return null;
    return parsed.nonce;
  } catch { return null; }
}
export function cookie(token: string, logout = false, scope = 'physical_teacher') {
  return `${scope}=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${logout ? 0 : lifetime}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
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
