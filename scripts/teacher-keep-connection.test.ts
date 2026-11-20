import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { AUTH_KEY, KEEP_UNTIL_KEY, KEPT_AUTH_KEY, TEACHER_KEEP_MS, createTeacherAuthStorage, isGoogleTeacherSession } from '../src/data/teacherAuthStorage';
import { ABSOLUTE_SECONDS, authConfigured, codeConfigured, cookie, newSession, sessionDetails } from '../server/teacherSession';
import teacher from '../api/teacher';

function memory() {
  const make = () => { const data = new Map<string, string>(); return { data, get: (k: string) => data.get(k) ?? null, set: (k: string, v: string) => { data.set(k, v); }, remove: (k: string) => { data.delete(k); } }; };
  return { local: make(), session: make() };
}
const google = JSON.stringify({ access_token: 'a', user: { id: 'u', is_anonymous: false, app_metadata: { provider: 'google' } } });
const googleNext = JSON.stringify({ access_token: 'b', user: { id: 'u', is_anonymous: false, identities: [{ provider: 'google' }] } });
const anonymous = JSON.stringify({ access_token: 'c', user: { id: 's', is_anonymous: true } });
const reqWith = (value: string) => ({ headers: { cookie: value } }) as never;
const maxAge = (header: string) => Number(/Max-Age=(\d+)/.exec(header)?.[1]);

test('Google 연결은 기본으로 이 탭에만 두고, 30일 유지를 고르면 이 기기에 30일 둔다(학생 익명 세션은 절대 오래 두지 않음)', () => {
  let now = 1_000_000;
  const store = memory();
  const auth = createTeacherAuthStorage(store, () => now);
  assert.equal(isGoogleTeacherSession(google), true);
  assert.equal(isGoogleTeacherSession(anonymous), false);
  assert.equal(isGoogleTeacherSession('not json'), false);
  // 기본: 탭에만.
  auth.setItem(AUTH_KEY, google);
  assert.equal(store.session.data.get(AUTH_KEY), google);
  assert.equal(store.local.data.size, 0);
  // 서버가 30일 로그인을 받아 준 뒤: 기기로 옮긴다.
  assert.equal(auth.keepOnDevice(), true);
  assert.equal(store.session.data.has(AUTH_KEY), false);
  assert.equal(store.local.data.get(KEPT_AUTH_KEY), google);
  assert.equal(Number(store.local.data.get(KEEP_UNTIL_KEY)), now + TEACHER_KEEP_MS);
  // 탭을 닫고 새 탭(탭 저장소 비어 있음)을 열어도 그대로 읽힌다 → 익명으로 바뀌지 않는다.
  store.session.data.clear();
  assert.equal(auth.getItem(AUTH_KEY), google);
  // 토큰이 새로 고쳐지면 기기 쪽을 바꾼다.
  auth.setItem(AUTH_KEY, googleNext);
  assert.equal(store.local.data.get(KEPT_AUTH_KEY), googleNext);
  // 익명 세션은 30일 유지 중이어도 기기에 두지 않는다.
  auth.setItem(AUTH_KEY, anonymous);
  assert.equal(store.local.data.get(KEPT_AUTH_KEY), googleNext);
  assert.equal(store.session.data.get(AUTH_KEY), anonymous);
  // 다른 키(PKCE 확인값 등)는 늘 탭에만.
  auth.setItem(AUTH_KEY + '-code-verifier', 'v');
  assert.equal(store.session.data.get(AUTH_KEY + '-code-verifier'), 'v');
  // 30일이 지나면 기기에 둔 연결을 지운다.
  now += TEACHER_KEEP_MS + 1;
  assert.equal(auth.getItem(AUTH_KEY), anonymous);
  assert.equal(store.local.data.size, 0);
});

test('로그아웃·30일 유지 끄고 다시 로그인하면 기기에 둔 Google 연결이 남지 않는다', () => {
  const store = memory();
  const auth = createTeacherAuthStorage(store, () => 5_000);
  auth.setItem(AUTH_KEY, google); auth.keepOnDevice();
  auth.removeItem(AUTH_KEY);
  assert.equal(store.local.data.size, 0, 'signOut이 기기 쪽도 지운다');
  // 30일 유지 중에 다시 로그인(새 세션이 기기 쪽에 들어감) → 30일 유지를 끄면 지금 탭으로 옮기고 기기 쪽은 지운다.
  auth.setItem(AUTH_KEY, google); auth.keepOnDevice();
  auth.setItem(AUTH_KEY, googleNext);
  auth.forgetOnDevice();
  assert.equal(store.local.data.size, 0);
  assert.equal(store.session.data.get(AUTH_KEY), googleNext, '지금 탭은 계속 로그인돼 있다');
  // 30일 유지 중 다시 로그인하며 또 30일 유지를 고르면 기한이 새로 잡힌다.
  auth.setItem(AUTH_KEY, google); auth.keepOnDevice(); auth.setItem(AUTH_KEY, googleNext);
  assert.equal(auth.keepOnDevice(), true);
  // 이상한 기한 값(미래로 너무 먼 값)은 지운다.
  store.local.set(KEEP_UNTIL_KEY, String(5_000 + TEACHER_KEEP_MS * 3));
  assert.equal(auth.keepUntil(), 0);
  assert.equal(store.local.data.size, 0);
  // 공용 기기 보호: 이 키들은 '기기 정보 지우기'(physical_ 접두어)로 함께 지워진다.
  for (const key of [KEEP_UNTIL_KEY, KEPT_AUTH_KEY]) assert.match(key, /^physical_/);
});

test('교사 쿠키는 갱신해도 처음 로그인부터 30일을 넘지 않고, 예전 공유 코드 설정이 없어도 Google 로그인은 그대로다', () => {
  const before = { ...process.env };
  delete process.env.TEACHER_ACCESS_HASH;
  process.env.TEACHER_SESSION_SECRET = 'synthetic-session-secret-not-real-123456';
  try {
    assert.equal(authConfigured(), true, '공유 코드 해시를 지워도 세션 확인은 된다');
    assert.equal(codeConfigured(), false);
    const fresh = sessionDetails(reqWith('physical_teacher=' + newSession('physical_teacher', 'acct:n', true)));
    assert.ok(fresh && Math.abs(fresh.issued - Date.now()) < 5000);
    // 29일 전에 로그인한 세션을 갱신하면 하루만 남는다.
    const issued = Date.now() - 29 * 24 * 3600 * 1000;
    const renewed = sessionDetails(reqWith('physical_teacher=' + newSession('physical_teacher', 'acct:n', true, issued)))!;
    assert.equal(renewed.issued, issued);
    assert.ok(renewed.expires <= issued + ABSOLUTE_SECONDS * 1000);
    assert.ok(renewed.expires - Date.now() <= 24 * 3600 * 1000 + 1000);
    assert.ok(maxAge(cookie('x', false, 'physical_teacher', true, (issued + ABSOLUTE_SECONDS * 1000 - Date.now()) / 1000)) <= 24 * 3600 + 1);
    // 30일이 지난 세션은 갱신해도 바로 만료된다.
    const old = Date.now() - 31 * 24 * 3600 * 1000;
    assert.equal(sessionDetails(reqWith('physical_teacher=' + newSession('physical_teacher', 'acct:n', true, old))), null);
    // 미래의 처음 로그인 시각은 지금으로 맞춘다.
    assert.ok(sessionDetails(reqWith('physical_teacher=' + newSession('physical_teacher', 'acct:n', true, Date.now() + 3600_000)))!.issued <= Date.now());
  } finally { for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key]; Object.assign(process.env, before); }
});

test('서버 로그인은 살아 있는데 이 탭의 Google 연결이 익명·다른 계정이면 409 reconnect로 알린다', async () => {
  const before = { ...process.env }, actual = globalThis.fetch; const uid = '5c8c5015-f4b8-4ef6-8ce6-465ec41d333a';
  Object.assign(process.env, { NODE_ENV: 'production', TEACHER_SESSION_SECRET: 'synthetic-session-secret-not-real-123456', VITE_SUPABASE_URL: 'https://synthetic-api.example', VITE_SUPABASE_ANON_KEY: 'synthetic-key', CLASSROOM_TEACHER_BOOTSTRAP: 'synthetic-bootstrap-not-real-1234567890' });
  delete process.env.TEACHER_ACCESS_HASH;
  const server = createServer((req, res) => { void teacher(req, res); });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`; process.env.APP_ORIGIN = base; delete process.env.VERCEL_URL;
  let tokenUser = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin === 'https://synthetic-api.example') {
      if (url.pathname === '/auth/v1/user') return new Response(JSON.stringify({ id: tokenUser, aud: 'authenticated', email_confirmed_at: new Date().toISOString(), is_anonymous: tokenUser !== uid, identities: [{ provider: 'google' }], app_metadata: {}, user_metadata: {}, created_at: '' }), { headers: { 'Content-Type': 'application/json' } });
      if (url.pathname.endsWith('/check_teacher_account')) return new Response(JSON.stringify({ enabled: true }), { headers: { 'Content-Type': 'application/json' } });
      if (url.pathname.endsWith('/authorize_classroom_teacher')) return new Response('null', { headers: { 'Content-Type': 'application/json' } });
      throw Error('Unexpected RPC ' + url.pathname);
    }
    return actual(input, init);
  };
  const issued = Date.now() - 29.5 * 24 * 3600 * 1000;
  const teacherCookie = 'physical_teacher=' + newSession('physical_teacher', `acct:${uid}:1:${'a'.repeat(36)}`, true, issued);
  const authorize = () => actual(base + '/api/teacher?action=classroom-authorize', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', Cookie: teacherCookie }, body: JSON.stringify({ accessToken: 'synthetic-anonymous-access-token-123' }) });
  try {
    const mismatch = await authorize();
    assert.equal(mismatch.status, 409);
    const body = await mismatch.json();
    assert.equal(body.reconnect, true); assert.match(body.error, /다시 연결/);
    tokenUser = uid;
    const ok = await authorize();
    assert.equal(ok.status, 200);
    // 갱신된 쿠키도 처음 로그인부터 30일 안에서 끝난다(반나절 남음).
    assert.ok(maxAge(ok.headers.get('set-cookie')!) <= 13 * 3600);
  } finally {
    globalThis.fetch = actual; await new Promise<void>(r => server.close(() => r()));
    for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key]; Object.assign(process.env, before);
  }
});

test('화면: 30일 유지는 기본으로 꺼져 있고, 끊긴 연결은 다시 연결 버튼으로 안내하며, 수업 준비실 버튼은 멈추지 않는다', () => {
  assert.match(readFileSync('src/application/teacherLoginPrefs.ts', 'utf8'), /readStorage\(STAY_KEY\) === '1'/);
  const guard = readFileSync('src/presentation/components/TeacherAuthGuard.tsx', 'utf8');
  assert.match(guard, /TeacherReconnectError/); assert.match(guard, /Google로 다시 연결/);
  assert.match(guard, /<h1[^>]*>\{setup \? '교사 접근 코드 처음 설정' : '선생님 로그인'\}<\/h1>/);
  const form = readFileSync('src/presentation/components/TeacherAccountForm.tsx', 'utf8');
  assert.match(form, /체크하면 ‘Google로 계속하기’를 누를 수 있어요/);
  assert.match(readFileSync('src/presentation/components/TeacherAccountForm.css', 'utf8'), /\.ai-check\{min-height:48px/);
  const entry = readFileSync('src/presentation/TeacherStudioEntry.tsx', 'utf8');
  assert.match(entry, /'pageshow'/);
  assert.match(readFileSync('src/application/teacherGoogle.ts', 'utf8'), /keepTeacherConnection\(remember\)/);
  for (const file of ['api/teacher.ts', 'server/studioHandler.ts', 'server/teacherAccounts.ts', 'teacher-studio/Studio.tsx', 'scripts/dev-studio-api.ts'])
    assert.doesNotMatch(readFileSync(file, 'utf8'), /legacyLoginEnabled|legacyTeacherLoginEnabled|legacyTeacherEnabled/, file);
});
