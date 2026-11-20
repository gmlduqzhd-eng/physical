import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { parseStudioHandoff, takeStudioHandoff } from '../teacher-studio/studioHandoff';
import { handoffToken, studioUrl } from '../src/application/studioHandoff';

const jwt = 'eyJhbGciOiJIUzI1NiJ9.' + 'eyJzdWIiOiJ0ZWFjaGVyIn0' + '.c2lnbmF0dXJlLXNpZ25hdHVyZQ';

test('학생 앱은 Google 교사 세션만 # 뒤에 넘기고, 익명(학생) 세션은 넘기지 않는다', () => {
  const user = { id: 'u', aud: 'authenticated', created_at: '', app_metadata: { provider: 'google' }, user_metadata: {}, is_anonymous: false };
  assert.equal(handoffToken({ access_token: jwt, user } as never), jwt);
  assert.equal(handoffToken({ access_token: jwt, user: { ...user, app_metadata: {}, identities: [{ provider: 'google' }] } } as never), jwt);
  assert.equal(handoffToken({ access_token: jwt, user: { ...user, is_anonymous: true } } as never), null);
  assert.equal(handoffToken({ access_token: jwt, user: { ...user, app_metadata: { provider: 'email' }, identities: [] } } as never), null);
  assert.equal(handoffToken(null), null);
  const url = studioUrl(jwt, 'https://studio.example');
  assert.equal(new URL(url).search, '', '토큰은 서버로 가는 주소(쿼리)에 넣지 않는다');
  assert.equal(new URL(url).hash, '#handoff=' + jwt);
  assert.equal(studioUrl(null, 'https://studio.example'), 'https://studio.example/');
});

test('수업 준비실은 # 토큰을 읽자마자 주소에서 지우고, 모양이 이상하면 쓰지 않는다', () => {
  assert.equal(parseStudioHandoff('#handoff=' + jwt), jwt);
  for (const bad of ['', '#', '#handoff=', '#handoff=short', '#handoff=a.b', '#handoff=' + 'a.b.' + 'c'.repeat(9000), '?handoff=' + jwt, '#handoff=' + jwt.replace('.', '<'), '#handoff=' + jwt + '%20x'])
    assert.equal(parseStudioHandoff(bad), null, bad.slice(0, 30));
  const calls: string[] = [];
  const win = { location: { hash: '#handoff=' + jwt, pathname: '/', search: '' }, history: { replaceState: (_: unknown, __: string, url: string) => { calls.push(url); } } };
  assert.equal(takeStudioHandoff(win), jwt);
  assert.deepEqual(calls, ['/'], '토큰이 뒤로 가기·북마크에 남지 않게 바로 지운다');
  const plain = { ...win, location: { hash: '#top', pathname: '/', search: '' } };
  assert.equal(takeStudioHandoff(plain), null);
  assert.deepEqual(calls, ['/']);
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
    assert.equal(status.legacyLoginEnabled, false);
    validToken = false;
    assert.equal((await post('google-login', { accessToken: jwt, adultTeacher: true })).status, 401, '만료·가짜 토큰은 받지 않는다');
    assert.equal((await post('login', { code: 'x'.repeat(20), adultTeacher: true })).status, 410);
  } finally {
    globalThis.fetch = actualFetch;
    server.close();
    process.env = original;
  }
});
