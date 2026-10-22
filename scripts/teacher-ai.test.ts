import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomBytes, scryptSync } from 'node:crypto';
import handler from '../api/teacher';
import { candidates, catalog, generateAdvice, sources, validateOutput } from '../server/aiService';
import { authConfigured, cookie, newSession, session, verifyCode } from '../server/teacherSession';
import { inputSchema, nextChallenge, type TeacherInput, type TeacherOutput } from '../src/domain/teacherAi';
import { readStorage, writeStorage, clearDeviceInformation } from '../src/application/browserStorage';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { publicAiError } from '../server/aiErrors';

const base: TeacherInput = { task: 'recommend', activityId: null, grade: '3~4학년군', goal: '협동과 소통', place: '체육관', device: '태블릿 PC', deviceCount: '모둠별 1대', minutes: 40, groupSize: 6, activityMinutes: 10, classSize: 24, weather: '제약 없음', observations: [], aggregate: null, consent: true };
const headings: Record<string, string[]> = { difficulty: ['기초', '보통', '도전'], plan: ['도입', '준비운동', '본활동', '정리', '안전 지도'], mission: ['협동 목표', '역할과 진행', '완료 확인'], observation: ['관찰 요약', '다음 차시 아이디어'], group: ['모둠 결과 요약', '활동 조정안'], reflection: ['성찰 질문'], safety: [] };
// Explicit test fixture, never part of the app or a substitute for a model result.
function fixture(input: TeacherInput): TeacherOutput {
  const material = sources(input); const first = material[0];
  const cite = (game = first) => ({ activityId: game.id, field: 'description' as const, quote: game.description });
  return { title: '테스트 전용 교사 검토 초안', recommendations: ['recommend', 'alternative'].includes(input.task) ? material.slice(0, 3).map(game => ({ activityId: game.id, reason: '협동 목표를 위한 역할 분담 제안입니다.', citations: [cite(game)] })) : [],
    sections: (headings[input.task] ?? []).map((heading, i) => ({ heading, minutes: input.task === 'plan' ? [5, 5, 23, 5, 2][i] : null, content: input.task === 'difficulty' ? [
      '진행: 교사가 안내한 역할에 따라 서로 다른 섬을 맡도록 제안합니다.\n역할: 수행자와 관찰자가 자신의 차례를 확인합니다.\n관찰: 학생이 맡은 섬과 역할을 설명하는지 살펴봅니다.',
      '진행: 모둠이 협의하여 서로 다른 섬을 맡도록 제안합니다.\n역할: 학생들이 수행자와 관찰자를 교대합니다.\n관찰: 학생들이 동료의 의견을 듣고 차례를 바꾸는지 살펴봅니다.',
      '진행: 모둠이 배치 방법을 선택하고 실행 뒤 함께 조정하도록 제안합니다.\n역할: 학생들이 역할 교대 방법도 함께 정합니다.\n관찰: 학생들이 서로의 의견을 반영하여 방법을 수정하는지 살펴봅니다.',
    ][i] : input.task === 'reflection' ? '오늘 어떤 움직임이 즐거웠나요?\n친구와 역할을 어떻게 나누었나요?\n다음에는 어떤 방법으로 함께 참여하고 싶나요?' : heading === '관찰 요약' ? '교사가 선택한 관찰 항목: '+input.observations.join(' · ')+'. 구체적인 장면·학생별 수행은 제공되지 않았습니다.' : heading === '모둠 결과 요약' ? '교사가 입력한 범주: '+input.aggregate!.groups+' / '+input.aggregate!.participants+' / '+input.aggregate!.completion+' / '+input.aggregate!.cooperation+'. 개인·모둠별 결과는 제공되지 않았습니다.' : heading === '안전 지도' ? '아래 원문 안전 항목과 현장 조건을 교사가 확인합니다.' : '교사가 설명하고 모둠 역할을 교대하는 수업 방식 제안입니다.', citations: [cite()] })),
    safety: first.safety.slice(0, 2).map(quote => ({ activityId: first.id, quote })), teacherChecks: ['교사가 현장 조건과 참여 의사를 확인했나요?'] };
}
test('strict privacy boundary rejects names, room IDs, free text and individual histories', () => {
  for (const key of ['studentName', 'nickname', 'studentNumber', 'roomId', 'notes', 'records', 'face', 'phone']) assert.equal(inputSchema.safeParse({ ...base, [key]: 'personal-data' }).success, false);
  assert.equal(inputSchema.safeParse({ ...base, goal: '홍길동의 기록을 분석' }).success, false);
  assert.equal(inputSchema.safeParse({ ...base, minutes: 0 }).success, false);
  assert.equal(inputSchema.safeParse({ ...base, aggregate: { groups: '1모둠', participants: '2명' } }).success, false);
});
test('billing/permission/timeout errors are actionable without reflecting provider secrets or prompt contents', () => {
  const raw = { statusCode: 429, responseBody: JSON.stringify({ error: { code: 'credit_balance_exhausted', message: 'PRIVATE-PAYLOAD-DO-NOT-REFLECT' } }) };
  const result = publicAiError(raw); assert.equal(result?.status, 402); assert.match(result!.error, /크레딧/); assert.equal(JSON.stringify(result).includes('PRIVATE'), false);
  assert.match(publicAiError({ statusCode: 403 })!.error, /권한/);
  assert.equal(publicAiError({ name: 'TimeoutError' })?.status, 504);
  assert.equal(publicAiError(new Error('PRIVATE')), null);
});
test('recommendation preconditions respect known grade, space, device placement and duration', () => {
  const result = candidates(base); assert.ok(result.length >= 3);
  for (const item of result) { assert.ok(item.grades.includes(base.grade)); assert.ok(item.devices.includes(base.device)); assert.ok(!item.space.length || item.space.includes(base.place)); assert.ok(item.duration === null || item.duration <= base.minutes); }
});

test('selected activities cannot contradict known grade or space before generation', async () => {
 const input={...base,task:'plan' as const,activityId:'space-occupier'};
 await assert.rejects(generateAdvice({...input,grade:'1~2학년'}),/조건에 맞는 활동/);
 await assert.rejects(generateAdvice({...input,place:'좁은 실내 공간'}),/조건에 맞는 활동/);
});

test('small or inconsistent group aggregates are rejected before any provider connection', async () => {
  const group={...base,task:'group' as const,activityId:'space-occupier',aggregate:{groups:'3~5모둠' as const,participants:'모둠당 5~8명' as const,completion:'절반 정도 완료' as const,cooperation:'관찰 부족' as const}};
  for(const patch of [{groupSize:4},{classSize:12},{classSize:60},{groupSize:9},{aggregate:{...group.aggregate,groups:'6모둠 이상' as const}}])await assert.rejects(generateAdvice({...group,...patch}),/조건에 맞는/);
});
test('all nine server tasks accept grounded fixtures in a 40 minute group lesson', () => {
  for (const task of ['recommend', 'difficulty', 'plan', 'safety', 'mission', 'observation', 'group', 'alternative', 'reflection'] as TeacherInput['task'][]) {
    const input = { ...base, task, activityId: ['recommend', 'alternative'].includes(task) ? null : 'space-occupier', aggregate: task==='group'?{groups:'3~5모둠' as const,participants:'모둠당 5~8명' as const,completion:'절반 정도 완료' as const,cooperation:'관찰 부족' as const}:null };
  const output=fixture(input);if(task==='mission')output.sections[0].content+=' 6명 모둠의 10분 활동 제안.';
    assert.doesNotThrow(() => validateOutput(output, input));
  }
});
test('reject invented activities, false quotations, duplicate recommendations and new safety thresholds', () => {
  let output = fixture(base); output.recommendations[0].activityId = 'invented'; assert.throws(() => validateOutput(output, base));
  output = fixture(base); output.recommendations[0].citations[0].quote = '없는 원문'; assert.throws(() => validateOutput(output, base));
  output = fixture(base); output.recommendations[1] = output.recommendations[0]; assert.throws(() => validateOutput(output, base));
  output = fixture(base); output.safety.push({ activityId: catalog[0].id, quote: '무조건 안전합니다.' }); assert.throws(() => validateOutput(output, base));
  output = fixture(base); output.recommendations[0].reason = '안전 거리 2m를 확보'; assert.throws(() => validateOutput(output, base));
});
test('lesson draft requires all five phases and exact requested duration', () => {
  const input = { ...base, task: 'plan' as const, activityId: 'space-occupier' }; const result = fixture(input);
  result.sections[2].minutes = 30; assert.throws(() => validateOutput(result, input));
  result.sections.pop(); assert.throws(() => validateOutput(result, input));
});

test('difficulty adjustments require distinct progress, role and observation guidance at each level', () => {
  const input = { ...base, task: 'difficulty' as const, activityId: 'space-occupier' };
  const result = fixture(input);
  assert.doesNotThrow(() => validateOutput(result, input));
  for (const content of ['진행: 역할을 바꿉니다.\n역할: 수행자와 관찰자', '진행: 역할을 바꿉니다.\n역할: 수행자와 관찰자\n관찰:', '역할: 수행자와 관찰자\n진행: 역할을 바꿉니다.\n관찰: 차례를 확인하는 행동']) {
    const invalid = fixture(input); invalid.sections[0].content = content;
    assert.throws(() => validateOutput(invalid, input), /진행·역할·관찰/);
  }
  result.sections[1].content = result.sections[0].content.replace(/\n/g, '\n\n');
  assert.throws(() => validateOutput(result, input), /서로 같아서는/);
});

test('reflection requires three separate questions and available safety source material cannot be omitted', () => {
  const reflection = { ...base, task: 'reflection' as const, activityId: 'space-occupier' };
  for (const count of [1, 2, 4]) {
    const result = fixture(reflection); result.sections[0].content = Array.from({ length: count }, (_, index) => `${index + 1}. 어떤 활동을 함께 했나요?`).join('\n');
    assert.throws(() => validateOutput(result, reflection), /세 문항/);
  }
  assert.doesNotThrow(() => validateOutput(fixture(reflection), reflection));
  const safety = { ...base, task: 'safety' as const, activityId: 'space-occupier' };
  const result = fixture(safety); result.safety = [];
  const material = sources(safety);
  assert.ok(material[0].safety.length > 0);
  assert.throws(() => validateOutput(result, safety), /안전 원문이 누락/);
  // Activities without a safety source must not receive an invented citation.
  assert.doesNotThrow(() => validateOutput(result, safety, material.map(game => ({ ...game, safety: [] }))));
});
test('private next-challenge records never need an AI call, and insufficient effort evidence does not promote', () => {
  assert.match(nextChallenge([], 'jump'), /부족/);
  const records = [3, 2, 1].map(score => ({ gameType: 'jump', score }));
  assert.match(nextChallenge(records, 'jump'), /유지/);
  assert.match(nextChallenge(records.map(r => ({ ...r, rpe: 4 })), 'jump'), /기초/);
  assert.match(nextChallenge(records.map(r => ({ ...r, rpe: 2 })), 'jump'), /검토/);
  assert.match(nextChallenge([3,5,1].map(score=>({gameType:'jump',score,rpe:2})), 'jump'), /보통 수준 유지/);
});

test('unobserved classroom scenes and invented group outcomes are rejected', () => {
  for (const task of ['observation','group'] as const) {
    const input={...base,task,activityId:'space-occupier',observations:['협동이 활발함'] as TeacherInput['observations'],aggregate:{groups:'3~5모둠',participants:'모둠당 5~8명',completion:'절반 정도 완료',cooperation:'관찰 부족'} as TeacherInput['aggregate']};
    const result=fixture(input);result.sections[0].content='학생들이 콘을 모으며 전략을 공유한 장면이 관찰되었습니다.';
    assert.throws(()=>validateOutput(result,input));
  }
});
test('SDK request uses direct OpenAI Responses, store false and the strict non-personal payload', async () => {
  const original = globalThis.fetch;
  process.env.OPENAI_API_KEY = 'test-only-never-real'; process.env.OPENAI_MODEL = 'test-fixture-model'; process.env.AI_PRIVACY_REVIEWED = 'true';
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++; assert.equal(String(url), 'https://api.openai.com/v1/responses');
    const body = JSON.parse(String(init?.body)); assert.equal(body.store, false); assert.equal(body.model, 'test-fixture-model');
    const serialized = JSON.stringify(body); for (const key of ['studentName', 'nickname', 'roomId', 'playedAt', 'recentGames']) assert.equal(serialized.includes(key), false);
    return new Response(JSON.stringify({ id: 'resp_test', object: 'response', created_at: 1, status: 'completed', model: 'test-fixture-model', output: [{ id: 'msg_test', type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: JSON.stringify(fixture(base)), annotations: [] }] }], usage: { input_tokens: 100, output_tokens: 100, total_tokens: 200 } }), { headers: { 'content-type': 'application/json' } });
  };
  try { const result = await generateAdvice(base); assert.equal(result.result.recommendations.length, 3); assert.equal(calls, 1);
    await assert.rejects(generateAdvice({ ...base, nickname: 'private' })); assert.equal(calls, 1);
  } finally { globalThis.fetch = original; delete process.env.OPENAI_API_KEY; delete process.env.OPENAI_MODEL; delete process.env.AI_PRIVACY_REVIEWED; }
});
test('server cookie authenticates, rejects forged/expired sessions, CSRF, weak code and missing key', async () => {
  const salt = randomBytes(16).toString('hex'); const code = 'test-code-for-unit-tests-only';
  process.env.TEACHER_ACCESS_HASH = salt + ':' + scryptSync(code, salt, 64).toString('hex'); process.env.TEACHER_SESSION_SECRET = randomBytes(48).toString('hex'); process.env.APP_ORIGIN = 'http://127.0.0.1:5173';
  assert.ok(authConfigured()); assert.equal(verifyCode('1234'), false); assert.ok(verifyCode(code));
  const token = newSession(); assert.ok(session({ headers: { cookie: cookie(token) } } as never)); assert.equal(session({ headers: { cookie: cookie(token + 'forged') } } as never), null);
  const server = createServer((req, res) => { void handler(req, res); }); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port; const url = `http://127.0.0.1:${port}/api/teacher?action=`;
  const headers = { 'Content-Type': 'application/json', origin: process.env.APP_ORIGIN };
  try {
    let res = await fetch(url + 'generate', { method: 'POST', headers, body: JSON.stringify(base) }); assert.equal(res.status, 401);
    res = await fetch(url + 'login', { method: 'POST', headers: { ...headers, origin: 'https://evil.example' }, body: JSON.stringify({ code }) }); assert.equal(res.status, 403);
    res = await fetch(url + 'login', { method: 'POST', headers, body: JSON.stringify({ code: '1234' }) }); assert.equal(res.status, 401);
    res = await fetch(url + 'login', { method: 'POST', headers, body: JSON.stringify({ code }) }); assert.equal(res.status, 200); const cookies = res.headers.get('set-cookie')!; assert.match(cookies, /HttpOnly/); assert.match(cookies, /SameSite=Strict/);
    res = await fetch(url + 'status', { headers: { cookie: cookies } }); assert.equal((await res.json()).authenticated, true);
    res = await fetch(url + 'generate', { method: 'POST', headers: { ...headers, cookie: cookies }, body: JSON.stringify(base) }); assert.equal(res.status, 503);
    const text = await res.text(); assert.equal(text.includes('test-only'), false);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); delete process.env.TEACHER_ACCESS_HASH; delete process.env.TEACHER_SESSION_SECRET; }
});
test('private browser fields remove legacy persistent values and expire after eight hours', () => {
  const store = () => { const map = new Map<string, string>(); return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => map.set(k, v), removeItem: (k: string) => map.delete(k), key: (i: number) => [...map.keys()][i], get length() { return map.size; } }; };
  const localStorage = store(), sessionStorage = store();
  Object.assign(globalThis, { window: { localStorage, sessionStorage } });
  localStorage.setItem('physical_student_name', 'old-name'); assert.equal(readStorage('physical_student_name'), null); assert.equal(localStorage.getItem('physical_student_name'), null);
  writeStorage('physical_student_name', '익명 원정대원'); assert.equal(localStorage.getItem('physical_student_name'), null); assert.equal(sessionStorage.getItem('physical_student_name'), '익명 원정대원');
  sessionStorage.setItem('physical_private_expires', String(Date.now() - 1)); assert.equal(readStorage('physical_student_name'), null);
  writeStorage('physical_player_profile', '{}'); clearDeviceInformation(); assert.equal(readStorage('physical_player_profile'), null);
});
test('local-only first setup and masked-key saving require origin, a strong code and an authenticated cookie', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'physical-ai-test-'));
  const child = spawn(process.execPath, [resolve('node_modules/tsx/dist/cli.mjs'), resolve('scripts/dev-api.ts')], { cwd, env: { ...process.env, DEV_API_PORT: '0', OPENAI_API_KEY: '', TEACHER_ACCESS_HASH: '', TEACHER_SESSION_SECRET: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const url = await new Promise<string>((resolveUrl, reject) => {
      const timer = setTimeout(() => reject(new Error('Test API startup timeout')), 10000);
      child.stdout.on('data', data => { const match = String(data).match(/http:\/\/127\.0\.0\.1:\d+/); if (match) { clearTimeout(timer); resolveUrl(match[0] + '/api/teacher?action='); } });
      child.on('error', reject);
    });
    const headers = { 'Content-Type': 'application/json', origin: 'http://127.0.0.1:5173' };
    let res = await fetch(url + 'configure-ai', { method: 'POST', headers, body: JSON.stringify({ apiKey: 'sk-fake-test-fixture-never-a-real-key', privacyReviewed: false }) }); assert.equal(res.status, 403);
    res = await fetch(url + 'setup', { method: 'POST', headers, body: JSON.stringify({ code: '1234' }) }); assert.equal(res.status, 400);
    res = await fetch(url + 'setup', { method: 'POST', headers, body: JSON.stringify({ code: 'test-only-classroom-code' }) }); assert.equal(res.status, 200);
    const authCookie = res.headers.get('set-cookie')!;
    res = await fetch(url + 'setup', { method: 'POST', headers, body: JSON.stringify({ code: 'another-test-classroom-code' }) }); assert.equal(res.status, 403);
    res = await fetch(url + 'configure-ai', { method: 'POST', headers: { ...headers, cookie: authCookie, origin: 'https://evil.example' }, body: '{}' }); assert.equal(res.status, 403);
    const fake = 'sk-fake-test-fixture-never-a-real-key';
    res = await fetch(url + 'configure-ai', { method: 'POST', headers: { ...headers, cookie: authCookie }, body: JSON.stringify({ apiKey: fake, privacyReviewed: false }) }); assert.equal(res.status, 200); assert.equal((await res.text()).includes(fake), false);
    const file = await readFile(join(cwd, '.env.ai.local'), 'utf8'); assert.ok(file.includes('AI_PRIVACY_REVIEWED=false'));
    res = await fetch(url + 'status', { headers: { cookie: authCookie } }); const status = await res.json(); assert.equal(status.authenticated, true); assert.equal(status.aiReady, false); assert.equal(JSON.stringify(status).includes(fake), false);
    // Local env changes take effect without restarting; no remote model call is made.
    res = await fetch(url + 'configure-ai', { method: 'POST', headers: { ...headers, cookie: authCookie }, body: JSON.stringify({ apiKey: fake, privacyReviewed: true }) }); assert.equal(res.status, 200);
    res = await fetch(url + 'status', { headers: { cookie: authCookie } }); assert.equal((await res.json()).aiReady, true);
  } finally { child.kill(); }
});
