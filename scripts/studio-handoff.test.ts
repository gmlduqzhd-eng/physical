import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { HANDOFF_READY, HANDOFF_TOKEN, parseHandoffMessage, receiveStudioHandoff } from '../teacher-studio/studioHandoff';
import { handoffToken, openStudioWithHandoff, readyNonce, studioUrl } from '../src/application/studioHandoff';

const jwt = 'eyJhbGciOiJIUzI1NiJ9.' + 'eyJzdWIiOiJ0ZWFjaGVyIn0' + '.c2lnbmF0dXJlLXNpZ25hdHVyZQ';
const APP = 'https://app.example', STUDIO = 'https://studio.example';
type Listener = (event: MessageEvent) => void;
function fakeWindow() {
  const listeners = new Set<Listener>();
  return { listeners, addEventListener: (_: string, l: Listener) => { listeners.add(l); }, removeEventListener: (_: string, l: Listener) => { listeners.delete(l); },
    emit: (event: Partial<MessageEvent>) => { for (const l of [...listeners]) l(event as MessageEvent); } };
}
const tick = () => new Promise(resolve => setTimeout(resolve, 5));

test('학생 앱은 Google 교사 세션만 넘기고, 익명(학생) 세션은 넘기지 않는다. 주소에는 토큰을 싣지 않는다', () => {
  const user = { id: 'u', aud: 'authenticated', created_at: '', app_metadata: { provider: 'google' }, user_metadata: {}, is_anonymous: false };
  assert.equal(handoffToken({ access_token: jwt, user } as never), jwt);
  assert.equal(handoffToken({ access_token: jwt, user: { ...user, app_metadata: {}, identities: [{ provider: 'google' }] } } as never), jwt);
  assert.equal(handoffToken({ access_token: jwt, user: { ...user, is_anonymous: true } } as never), null);
  assert.equal(handoffToken({ access_token: jwt, user: { ...user, app_metadata: { provider: 'email' }, identities: [] } } as never), null);
  assert.equal(handoffToken(null), null);
  assert.equal(studioUrl(true, STUDIO), STUDIO + '/#from-app');
  assert.equal(studioUrl(false, STUDIO), STUDIO + '/');
  assert.equal(readyNonce({ type: HANDOFF_READY, nonce: 'a'.repeat(32) }), 'a'.repeat(32));
  for (const bad of [null, 'x', { type: 'other', nonce: 'a'.repeat(32) }, { type: HANDOFF_READY, nonce: 'short' }]) assert.equal(readyNonce(bad), null);
  assert.doesNotMatch(readFileSync('src/application/studioHandoff.ts', 'utf8'), /'#handoff='/);
});

test('학생 앱은 방금 연 수업 준비실 창이, 수업 준비실 주소에서 보낸 준비 신호에만 한 번 토큰을 보낸다', async () => {
  const sent: { message: unknown; origin: string }[] = [];
  const child = { postMessage: (message: unknown, origin: string) => { sent.push({ message, origin }); } };
  let opened = '';
  const win = { ...fakeWindow(), open: (url: string) => { opened = url; return child as never; } };
  assert.equal(openStudioWithHandoff(win as never, async () => jwt, STUDIO), true);
  assert.equal(opened, STUDIO + '/#from-app');
  const nonce = 'b'.repeat(32);
  win.emit({ origin: 'https://evil.example', source: child as never, data: { type: HANDOFF_READY, nonce } });
  win.emit({ origin: STUDIO, source: {} as never, data: { type: HANDOFF_READY, nonce } });
  win.emit({ origin: STUDIO, source: child as never, data: { type: 'other', nonce } });
  await tick();
  assert.equal(sent.length, 0, '다른 사이트·다른 창·이상한 메시지에는 보내지 않는다');
  win.emit({ origin: STUDIO, source: child as never, data: { type: HANDOFF_READY, nonce } });
  win.emit({ origin: STUDIO, source: child as never, data: { type: HANDOFF_READY, nonce } });
  await tick();
  assert.deepEqual(sent, [{ message: { type: HANDOFF_TOKEN, nonce, token: jwt }, origin: STUDIO }], '한 번만, 수업 준비실 주소로만');
  assert.equal(win.listeners.size, 0);
  const blocked = { ...fakeWindow(), open: () => null };
  assert.equal(openStudioWithHandoff(blocked as never, async () => jwt, STUDIO), false, '팝업이 막히면 false');
});

test('수업 준비실은 #from-app을 바로 지우고, 학생 앱 주소·자기를 연 창·같은 nonce의 토큰만 받는다', async () => {
  const calls: string[] = [];
  const posted: { message: { type: string; nonce: string }; origin: string }[] = [];
  const opener = { postMessage: (message: { type: string; nonce: string }, origin: string) => { posted.push({ message, origin }); } };
  const base = fakeWindow();
  const win = { ...base, location: { hash: '#from-app', pathname: '/', search: '' }, history: { replaceState: (_: unknown, __: string, url: string) => { calls.push(url); } }, opener: opener as typeof opener | null, crypto: globalThis.crypto };
  const pending = receiveStudioHandoff(win as never, APP, 1000);
  assert.deepEqual(calls, ['/'], '주소는 바로 지운다');
  assert.equal(posted.length, 1); assert.equal(posted[0].origin, APP, '준비 신호는 학생 앱 주소로만');
  const nonce = posted[0].message.nonce;
  assert.match(nonce, /^[a-f0-9]{32}$/);
  base.emit({ origin: 'https://evil.example', source: opener as never, data: { type: HANDOFF_TOKEN, nonce, token: jwt } });
  base.emit({ origin: APP, source: {} as never, data: { type: HANDOFF_TOKEN, nonce, token: jwt } });
  base.emit({ origin: APP, source: opener as never, data: { type: HANDOFF_TOKEN, nonce: 'c'.repeat(32), token: jwt } });
  base.emit({ origin: APP, source: opener as never, data: { type: HANDOFF_TOKEN, nonce, token: jwt } });
  assert.equal(await pending, jwt);
  assert.equal(win.opener, null, '받은 뒤에는 학생 앱 창과의 연결을 끊는다');
  const lone = { ...fakeWindow(), location: { hash: '#from-app', pathname: '/', search: '' }, history: { replaceState: () => {} }, opener: null, crypto: globalThis.crypto };
  assert.equal(await receiveStudioHandoff(lone as never, APP, 50), null, '학생 앱에서 열리지 않았으면 기다리지 않는다');
  const oldCalls: string[] = [];
  const old = { ...fakeWindow(), location: { hash: '#handoff=' + jwt, pathname: '/', search: '' }, history: { replaceState: (_: unknown, __: string, url: string) => { oldCalls.push(url); } }, opener, crypto: globalThis.crypto };
  assert.equal(await receiveStudioHandoff(old as never, APP, 50), null, '예전 #handoff= 주소의 토큰은 쓰지 않는다');
  assert.deepEqual(oldCalls, ['/'], '예전 주소의 토큰도 바로 지운다');
  const slow = { ...fakeWindow(), location: { hash: '#from-app', pathname: '/', search: '' }, history: { replaceState: () => {} }, opener: { postMessage: () => {} }, crypto: globalThis.crypto };
  assert.equal(await receiveStudioHandoff(slow as never, APP, 20), null, '시간이 지나면 기다리지 않는다');
  for (const bad of [null, { type: HANDOFF_TOKEN, nonce, token: 'short' }, { type: HANDOFF_TOKEN, nonce, token: null }, { type: HANDOFF_TOKEN, nonce, token: jwt.replace('.', '<') }]) assert.equal(parseHandoffMessage(bad, nonce), null);
  // 수업 준비실 배포 폴더에 이 파일이 들어가야 한다.
  assert.match(readFileSync('scripts/prepare-studio-deploy.mjs', 'utf8'), /'teacher-studio\/studioHandoff\.ts'/);
  // 화면은 한 번만 보내고, 예전 공유 코드 입력 칸은 없다.
  const studio = readFileSync('teacher-studio/Studio.tsx', 'utf8');
  assert.match(studio, /handoffOnce \?\?=/);
  assert.doesNotMatch(studio, /request\('login'/);
  assert.doesNotMatch(studio, /공유 접근 코드로 인증/);
});

test('넘겨받은 Google 토큰은 수업 준비실 서버가 기존 Google 로그인과 똑같이 확인해 자기 쿠키를 준다', async () => {
  const original = { ...process.env };
  const actualFetch = globalThis.fetch;
  process.env.TEACHER_ACCESS_HASH = 'a'.repeat(32) + ':' + 'b'.repeat(128);
  process.env.TEACHER_SESSION_SECRET = randomBytes(40).toString('hex');
  process.env.NODE_ENV = 'production';
  process.env.STUDIO_LIMIT_URL = 'https://synthetic-limiter.example';
  process.env.STUDIO_LIMIT_KEY = 'synthetic-key';
  process.env.STUDIO_LIMIT_SECRET = 'synthetic-limiter-secret-not-real-123456';
  delete process.env.VITE_SUPABASE_URL; delete process.env.SUPABASE_URL; delete process.env.VERCEL_URL;
  const { default: handler } = await import('../server/studioHandler.js');
  const server = createServer((req, res) => { void handler(req, res); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  process.env.STUDIO_ORIGIN = url;
  const id = '11111111-2222-4333-8444-555555555555';
  let validToken = true;
  globalThis.fetch = async (request, init) => {
    const target = String(request);
    if (target.endsWith('/auth/v1/user')) {
      if (!validToken || new Headers(init?.headers).get('Authorization') !== 'Bearer ' + jwt) return new Response('{}', { status: 401 });
      return new Response(JSON.stringify({ id, email_confirmed_at: '2026-01-01', is_anonymous: false, identities: [{ provider: 'google' }] }));
    }
    if (target.endsWith('/rpc/teacher_account')) return new Response(JSON.stringify({ id, enabled: true, version: 1, role: 'teacher' }));
    if (target.includes('/rpc/check_teacher_account')) return new Response(JSON.stringify({ enabled: true }));
    if (target.startsWith('https://synthetic-limiter.example/')) return new Response(JSON.stringify({ allowed: true, retrySeconds: 0, reason: 'accepted' }));
    return actualFetch(request, init);
  };
  const post = (action: string, body: unknown, origin = url) => fetch(url + '/api/studio?action=' + action, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    assert.equal((await post('google-login', { accessToken: jwt, adultTeacher: true }, 'https://physical-pi.vercel.app')).status, 403, '다른 주소에서 직접 보내면 막는다');
    const login = await post('google-login', { accessToken: jwt, adultTeacher: true });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie')!;
    assert.match(cookie, /^physical_studio=/);
    assert.match(cookie, /HttpOnly; SameSite=Strict; Path=\/api; Max-Age=7200; Secure/);
    const status = await (await fetch(url + '/api/studio?action=status', { headers: { cookie: cookie.split(';')[0] } })).json();
    assert.equal(status.authenticated, true);
    assert.equal('legacyLoginEnabled' in status, false);
    validToken = false;
    assert.equal((await post('google-login', { accessToken: jwt, adultTeacher: true })).status, 401, '만료·가짜 토큰은 받지 않는다');
    assert.equal((await post('login', { code: 'x'.repeat(20), adultTeacher: true })).status, 410);
  } finally {
    globalThis.fetch = actualFetch;
    server.close();
    process.env = original;
  }
});
