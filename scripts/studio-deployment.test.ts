import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomBytes, scryptSync } from 'node:crypto';
import handler from '../server/studioHandler.js';
import { newSession } from '../server/teacherSession.js';
import { sources } from '../server/aiService.js';

test('online studio enforces adult auth, scoped sessions, origin, size and server-managed keys', async () => {
  const original = { ...process.env };
  const salt = randomBytes(16).toString('hex');
  process.env.TEACHER_ACCESS_HASH = salt + ':' + scryptSync('synthetic-teacher-code', salt, 64).toString('hex');
  process.env.TEACHER_SESSION_SECRET = randomBytes(40).toString('hex');
  process.env.GEMINI_API_KEY = 'synthetic-test-never-sent';
  process.env.GEMINI_MODEL = 'synthetic-model';
  process.env.GEMINI_PUBLIC_DATA_REVIEWED = 'true';
  process.env.NODE_ENV = 'production';
  process.env.STUDIO_LIMIT_URL = 'https://synthetic-limiter.example';
  process.env.STUDIO_LIMIT_KEY = 'synthetic-key';
  process.env.STUDIO_LIMIT_SECRET = 'synthetic-limiter-secret-not-real-123456';
  delete process.env.VERCEL_URL;
  const server = createServer((req, res) => { void handler(req, res); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  process.env.STUDIO_ORIGIN = url;
  const post = (action: string, body: unknown, token?: string, origin = url) => fetch(url + '/api/studio?action=' + action, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...(token ? { Cookie: 'physical_studio=' + token } : {}) }, body: JSON.stringify(body),
  });
  const actualFetch = globalThis.fetch;
  let limiterMode: 'allow' | 'deny' | 'offline' = 'allow';
  globalThis.fetch = async (request, init) => {
    if (String(request).startsWith('https://synthetic-limiter.example/')) {
      if (limiterMode === 'offline') throw new Error('synthetic-private-error');
      return new Response(JSON.stringify(limiterMode === 'deny' ? { allowed: false, retrySeconds: 37, reason: 'minute' } : { allowed: true, retrySeconds: 0, reason: JSON.parse(String(init?.body)).request_kind === 'release' ? 'released' : 'accepted' }));
    }
    return actualFetch(request, init);
  };
  try {
    const status = await fetch(url + '/api/studio?action=status');
    assert.deepEqual(await status.json(), { authenticated: false, configured: true, aiReady: true, model: 'synthetic-model', localSetup: false });
    assert.equal(status.headers.get('cache-control'), 'no-store');
    assert.equal((await post('generate', {})).status, 401);
    assert.equal((await post('generate', {}, newSession())).status, 401);
    assert.equal((await post('generate', {}, newSession('physical_studio'), 'https://untrusted.example')).status, 403);
    assert.equal((await post('login', { code: 'synthetic-teacher-code', adultTeacher: false })).status, 422);
    assert.equal((await post('login', { code: 'incorrect-test-code', adultTeacher: true })).status, 401);
    const login = await post('login', { code: 'synthetic-teacher-code', adultTeacher: true });
    assert.equal(login.status, 200);
    assert.match(login.headers.get('set-cookie')!, /HttpOnly; SameSite=Strict; Path=\/api; Max-Age=7200; Secure/);
    const token = newSession('physical_studio');
    assert.equal((await post('configure', { apiKey: 'must-never-be-saved' }, token)).status, 404);
    assert.equal((await post('generate', { studentName: 'synthetic-private-field' }, token)).status, 422);
    assert.equal((await post('generate', { notes: 'x'.repeat(9000) }, token)).status, 413);
    const input = {task:'reflection',activityId:'space-occupier',grade:'3~4학년군',goal:'협동과 소통',place:'체육관',device:'태블릿 PC',deviceCount:'모둠별 1대',minutes:40,groupSize:6,classSize:24,consent:true,adultTeacher:true} as const;
    const selected = sources(input as never)[0];
    const successFixture = {
      title: '합성 검증용 성찰 질문: 실제 AI 생성 아님', recommendations: [],
      sections: [{ heading: '성찰 질문', minutes: null, content: '열린 섬을 고를 때 무엇을 살펴보았나요?\n친구와 이동할 위치를 어떻게 의논했나요?\n다시 활동한다면 어떤 역할을 해 보고 싶나요?', citations: [{ sourceId: selected.id + ':description:0' }] }],
      safety: selected.safety.slice(0, 2).map((_, index) => ({ sourceId: selected.id + ':safety:' + index })),
      teacherChecks: ['교사가 현장 조건을 확인했나요?'],
    };
    const originalFetch = globalThis.fetch; let providerCalls = 0; let providerUnavailable = false;
    globalThis.fetch = async (request, init) => {
      if (String(request).startsWith('https://generativelanguage.googleapis.com/')) {
        providerCalls++;
        if (!providerUnavailable) return new Response(JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(successFixture) }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 100, totalTokenCount: 200 } }), { headers: { 'Content-Type': 'application/json' } });
        return new Response(JSON.stringify({error:{code:503,message:'synthetic-private-provider-body',status:'UNAVAILABLE'}}),{status:503,headers:{'Content-Type':'application/json'}});
      }
      return originalFetch(request, init);
    };
    try {
      const generated = await post('generate', input, token);
      assert.equal(generated.status, 200);
      const generatedBody = await generated.json();
      assert.equal(generatedBody.result.sections[0].content.split('\n').length, 3);
      assert.deepEqual(generatedBody.result.safety, selected.safety.slice(0, 2).map(quote => ({ activityId: selected.id, quote })));
      assert.equal(providerCalls, 1);
      providerCalls = 0; limiterMode = 'deny';
      const denied = await post('generate', input, token);
      assert.equal(denied.status, 429); assert.equal(denied.headers.get('retry-after'), '37'); assert.equal(providerCalls, 0);
      limiterMode = 'offline';
      const unavailableLimiter = await post('generate', input, token);
      assert.equal(unavailableLimiter.status, 503); assert(!((await unavailableLimiter.text()).includes('synthetic-private-error'))); assert.equal(providerCalls, 0);
      limiterMode = 'allow';
      providerUnavailable = true; providerCalls = 0;
      const unavailable = await post('generate', {task:'participation',activityId:'space-occupier',grade:'3~4학년군',goal:'협동과 소통',place:'체육관',device:'태블릿 PC',deviceCount:'모둠별 1대',minutes:40,groupSize:6,classSize:24,consent:true,adultTeacher:true}, token);
      assert.equal(unavailable.status,503);
      const message=await unavailable.text();assert.match(message,/일시적으로 혼잡/);assert(!message.includes('synthetic-private-provider-body'));assert.equal(providerCalls,3);
    } finally { globalThis.fetch = originalFetch; }
    const logout = await post('logout', {}, token);
    assert.equal(logout.status, 200); assert.match(logout.headers.get('set-cookie')!, /Max-Age=0/);
  } finally {
    globalThis.fetch = actualFetch;
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
    Object.assign(process.env, original);
  }
});
