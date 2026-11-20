import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomBytes, scryptSync } from 'node:crypto';
import teacher from '../api/teacher';
import { cookie, newSession, REMEMBER_SECONDS, sessionDetails } from '../server/teacherSession';

const maxAge = (header: string) => Number(/Max-Age=(\d+)/.exec(header)?.[1]);
const reqWith = (value: string) => ({ headers: { cookie: value } }) as never;

test('teacher cookie: 10 hours by default, 30 days only when the teacher chose to stay signed in', () => {
  const before = { ...process.env };
  const salt = randomBytes(16).toString('hex');
  Object.assign(process.env, { TEACHER_ACCESS_HASH: salt + ':' + scryptSync('synthetic-code-123', salt, 64).toString('hex'), TEACHER_SESSION_SECRET: 'synthetic-session-secret-not-real-123456' });
  try {
    assert.equal(maxAge(cookie(newSession())), 10 * 60 * 60);
    assert.equal(maxAge(cookie(newSession('physical_teacher', undefined, true), false, 'physical_teacher', true)), REMEMBER_SECONDS);
    assert.equal(REMEMBER_SECONDS, 30 * 24 * 60 * 60);
    // The studio never gets the long lifetime, even if asked.
    assert.equal(maxAge(cookie(newSession('physical_studio', undefined, true), false, 'physical_studio', true)), 2 * 60 * 60);
    assert.equal(maxAge(cookie('', true, 'physical_teacher', true)), 0);
    const long = newSession('physical_teacher', 'acct:nonce', true);
    assert.deepEqual(sessionDetails(reqWith('physical_teacher=' + long)), { nonce: 'acct:nonce', remember: true });
    assert.deepEqual(sessionDetails(reqWith('physical_teacher=' + newSession('physical_teacher', 'n2'))), { nonce: 'n2', remember: false });
    // A 30-day token cannot be replayed as a studio session (different signature scope).
    assert.equal(sessionDetails(reqWith('physical_studio=' + long), 'physical_studio'), null);
  } finally { for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key]; Object.assign(process.env, before); }
});

test('production rejects the retired shared-code login and setup; google-login honors remember', async () => {
  const before = { ...process.env }, actual = globalThis.fetch; const uid = '5c8c5015-f4b8-4ef6-8ce6-465ec41d333a';
  const salt = randomBytes(16).toString('hex');
  Object.assign(process.env, { NODE_ENV: 'production', TEACHER_ACCESS_HASH: salt + ':' + scryptSync('synthetic-shared-teacher', salt, 64).toString('hex'), TEACHER_SESSION_SECRET: 'synthetic-session-secret-not-real-123456', VITE_SUPABASE_URL: 'https://synthetic-api.example', VITE_SUPABASE_ANON_KEY: 'synthetic-key', CLASSROOM_TEACHER_BOOTSTRAP: 'synthetic-bootstrap-not-real-1234567890', LOCAL_TEACHER_SETUP: 'true' });
  const server = createServer((req, res) => { void teacher(req, res); });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`; process.env.APP_ORIGIN = base; delete process.env.VERCEL_URL;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.origin === 'https://synthetic-api.example') {
      if (url.pathname === '/auth/v1/user') return new Response(JSON.stringify({ id: uid, email_confirmed_at: new Date().toISOString(), is_anonymous: false, identities: [{ provider: 'google' }] }));
      if (url.pathname.endsWith('/teacher_account')) return new Response(JSON.stringify({ id: uid, enabled: true, version: 1, role: 'teacher' }));
      if (url.pathname.endsWith('/teacher_login_attempt')) return new Response(JSON.stringify({ allowed: true, retrySeconds: 0 }));
      if (url.pathname.endsWith('/check_teacher_account')) return new Response(JSON.stringify({ enabled: true, role: 'teacher' }));
      if (url.pathname.endsWith('/check_shared_teacher_access')) return new Response('true');
      throw Error('Unexpected RPC ' + url.pathname);
    }
    return actual(input, init);
  };
  const post = (action: string, body: unknown) => actual(base + '/api/teacher?action=' + action, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    const status = await (await actual(base + '/api/teacher?action=status')).json();
    assert.equal(status.legacyLoginEnabled, false); assert.equal(status.localSetup, false);
    for (const action of ['login', 'setup']) {
      const res = await post(action, { code: 'synthetic-shared-teacher' });
      assert.equal(res.status, 410); assert.equal(res.headers.get('set-cookie'), null);
      assert.match((await res.json()).error, /Google/);
    }
    const token = { accessToken: 'synthetic-google-access-token-123456', adultTeacher: true };
    const short = await post('google-login', token); assert.equal(short.status, 200);
    assert.equal(maxAge(short.headers.get('set-cookie')!), 10 * 60 * 60);
    const long = await post('google-login', { ...token, remember: true }); assert.equal(long.status, 200);
    const longCookie = long.headers.get('set-cookie')!; assert.equal(maxAge(longCookie), REMEMBER_SECONDS);
    assert.equal((await post('google-login', { ...token, remember: 'yes' })).status, 422);
    assert.equal((await post('google-login', { ...token, extra: 1 })).status, 422);
    const authed = await (await actual(base + '/api/teacher?action=status', { headers: { Cookie: longCookie.split(';')[0] } })).json();
    assert.equal(authed.authenticated, true);
    const out = await actual(base + '/api/teacher?action=logout', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', Cookie: longCookie.split(';')[0] }, body: '{}' });
    assert.ok(out.headers.get('set-cookie')!.split(',').every(v => /Max-Age=0/.test(v)));
  } finally {
    globalThis.fetch = actual; await new Promise<void>(r => server.close(() => r()));
    for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key]; Object.assign(process.env, before);
  }
});
