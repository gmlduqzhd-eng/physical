import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { studioInputSchema } from '../teacher-studio/domain';
import { generateStudioAdvice } from '../server/geminiStudio';
import { sources, catalog, observationSummary, groupSummary } from '../server/aiService';
import type {TeacherOutput} from '../src/domain/teacherAi';
import { cookie, newSession, session } from '../server/teacherSession';
const base = { task: 'recommend', activityId: null, grade: '3~4학년군', goal: '협동과 소통', place: '체육관', device: '태블릿 PC', deviceCount: '모둠별 1대', minutes: 40, groupSize: 6, classSize: 24, consent: true, adultTeacher: true } as const;

test('adult teacher trial permits only allowlisted conditions, coarse tags and bins', () => {
  assert.equal(studioInputSchema.safeParse(base).success, true);
  for (const key of ['studentName', 'nickname', 'studentNumber', 'notes', 'records', 'roomId', 'observations', 'aggregate', 'apiKey', 'provider']) assert.equal(studioInputSchema.safeParse({ ...base, [key]: 'private' }).success, false);
  for (const task of ['next', 'invented']) assert.equal(studioInputSchema.safeParse({ ...base, task }).success, false);
  assert.equal(studioInputSchema.safeParse({ ...base, adultTeacher: false }).success, false);
});
test('student-app cookies cannot authenticate the separate studio', () => {
  const salt = randomBytes(16).toString('hex'); process.env.TEACHER_ACCESS_HASH = salt + ':' + scryptSync('unit-test-code-only', salt, 64).toString('hex'); process.env.TEACHER_SESSION_SECRET = randomBytes(40).toString('hex');
  const studentToken = newSession();
  assert.equal(session({ headers: { cookie: cookie(studentToken, false, 'physical_studio') } } as never, 'physical_studio'), null);
  assert.ok(session({ headers: { cookie: cookie(newSession('physical_studio'), false, 'physical_studio') } } as never, 'physical_studio'));
});
test('Gemini SDK uses Google directly and never sends teacher identity, keys in body or private records', async () => {
  const original = globalThis.fetch; let calls = 0;
  process.env.GEMINI_API_KEY = 'unit-test-fake-not-a-real-google-key'; process.env.GEMINI_MODEL = 'gemini-3.8-flash'; process.env.GEMINI_PUBLIC_DATA_REVIEWED = 'true';
  const input = { ...base, weather: '제약 없음', observations: [], aggregate: null, activityMinutes: 10 };
  const material = sources(input as never);
  let fixture: unknown = { title: '테스트 자료: 실제 AI 생성 아님', recommendations: material.slice(0, 3).map(game => ({ activityId: game.id, reason: '협동을 위한 역할 교대 제안입니다.', citations: [{ activityId: game.id, field: 'description', quote: game.description }] })), sections: [], safety: [], teacherChecks: ['교사가 현장을 확인했나요?'] };
  globalThis.fetch = async (url, init) => {
    calls++; assert.match(String(url), /^https:\/\/generativelanguage.googleapis.com\/v1beta\/models\/gemini-3\.8-flash:generateContent$/);
    const body = JSON.parse(String(init?.body)); const serialized = JSON.stringify(body);
    for (const privateKey of ['adultTeacher', 'consent', 'records', 'nickname', 'roomId', 'unit-test-fake']) assert.equal(serialized.includes(privateKey), false);
    assert.equal(body.tools, undefined); assert.equal(body.cachedContent, undefined);
    assert.equal(body.generationConfig.responseMimeType, 'application/json');
    const prompt=JSON.parse(body.contents[0].parts[0].text);
    if(prompt.context.task==='group'){assert.equal('classSize' in prompt.context,false);assert.equal('groupSize' in prompt.context,false);}
    const toRef=(c:{activityId:string;field:string;quote:string})=>{const game=catalog.find(g=>g.id===c.activityId);if(!game)return{sourceId:'not-issued-reference'};const value=game[c.field as keyof typeof game];return{sourceId:c.activityId+':'+c.field+':'+(Array.isArray(value)?value.indexOf(c.quote as never):0)};};
    const f=fixture as TeacherOutput;const transport={...f,recommendations:f.recommendations.map(r=>({...r,citations:r.citations.map(toRef)})),sections:f.sections.map(s=>({...s,citations:s.citations.map(toRef)})),safety:f.safety.map(c=>toRef({...c,field:'safety'}))};
    return new Response(JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(transport) }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 100, totalTokenCount: 200 } }), { headers: { 'Content-Type': 'application/json' } });
  };
  try {
    assert.equal((await generateStudioAdvice(base)).result.recommendations.length, 3);
    const selected = sources({ ...input, task: 'difficulty', activityId: 'space-occupier' } as never)[0];
    for (const task of ['difficulty', 'plan'] as const) {
      const headings = task === 'plan' ? ['도입', '준비운동', '본활동', '정리', '안전 지도'] : ['기초', '보통', '도전'];
      fixture = { title: '테스트 자료: 실제 AI 생성 아님', recommendations: [], sections: headings.map((heading, index) => ({ heading, minutes: task === 'plan' ? [5, 5, 23, 5, 2][index] : null, content: heading === '안전 지도' ? '아래 원문 안전 항목과 현장 조건을 교사가 확인합니다.' : '역할을 교대하는 수업 방식 제안입니다.', citations: [{ activityId: selected.id, field: 'description', quote: selected.description }] })), safety: [], teacherChecks: ['현장 조건을 확인했나요?'] };
      const result = await generateStudioAdvice({ ...base, task, activityId: selected.id }); assert.equal(result.result.sections.length, headings.length);
      if (task === 'plan') assert.equal(result.result.sections.reduce((n, s) => n + (s.minutes ?? 0), 0), 40);
    }
    assert.equal(calls, 3); await assert.rejects(generateStudioAdvice({ ...base, notes: 'private' })); assert.equal(calls, 3);
    for (const task of ['safety','mission','observation','group','alternative','reflection'] as const) {
      const next = { ...input, task, activityId: task==='alternative'?null:selected.id, observations: task==='observation'?['협동이 활발함']:[], aggregate: task==='group'?{groups:'3~5모둠',participants:'모둠당 5~8명',completion:'절반 정도 완료',cooperation:'관찰 부족'}:null };
      const headings = {safety:[],mission:['협동 목표','역할과 진행','완료 확인'],observation:['관찰 요약','다음 차시 아이디어'],group:['모둠 결과 요약','활동 조정안'],alternative:[],reflection:['성찰 질문']}[task];
      fixture = { title:'테스트 전용, 실제 AI 아님',recommendations:task==='alternative'?material.slice(0,3).map(g=>({activityId:g.id,reason:'대체 활동 제안',citations:[{activityId:g.id,field:'description',quote:g.description}]})):[],sections:headings.map(heading=>({heading,minutes:null,content:heading==='관찰 요약'?observationSummary(next as never):heading==='모둠 결과 요약'?groupSummary(next as never):'교사 검토용 역할 교대 제안',citations:[{activityId:selected.id,field:'description',quote:selected.description}]})),safety:[],teacherChecks:['교사가 조건을 확인했나요?'] };
      if(task==='mission')(fixture as TeacherOutput).sections[0].content+=' 6명 모둠의 10분 활동 제안.';
      assert.equal((await generateStudioAdvice(next)).result.sections.length,headings.length);
    }
    assert.equal(calls,9);
    // A simpler provider schema does not weaken the application's final checks.
    fixture = { ...(fixture as Record<string, unknown>), title: '가'.repeat(121) };
    await assert.rejects(generateStudioAdvice({ ...base, task: 'plan', activityId: selected.id })); assert.equal(calls, 10);
    fixture={title:'테스트',recommendations:[],sections:[{heading:'성찰 질문',minutes:null,content:'질문 제안',citations:[{activityId:'invented',field:'description',quote:'없는 자료'}]}],safety:[],teacherChecks:['확인하세요.']};
    // A returned reference outside server-provided material must never be hydrated.
    await assert.rejects(generateStudioAdvice({...base,task:'reflection',activityId:selected.id}),/목록에 없는 원문 참조/);
  }
  finally { globalThis.fetch = original; delete process.env.GEMINI_API_KEY; delete process.env.GEMINI_MODEL; delete process.env.GEMINI_PUBLIC_DATA_REVIEWED; }
});
test('isolated studio server enforces teacher auth, its own origin, scoped cookie and masked server key saving', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'physical-studio-test-')); const code = 'test-teacher-code-only'; const salt = randomBytes(16).toString('hex');
  await writeFile(join(cwd, '.env.teacher.local'), `TEACHER_ACCESS_HASH=${salt}:${scryptSync(code, salt, 64).toString('hex')}\nTEACHER_SESSION_SECRET=${randomBytes(40).toString('hex')}\n`);
  const child = spawn(process.execPath, [resolve('node_modules/tsx/dist/cli.mjs'), resolve('scripts/dev-studio-api.ts')], { cwd, env: { ...process.env, STUDIO_API_PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const url = await new Promise<string>((resolveUrl, reject) => { const timer = setTimeout(() => reject(new Error('Studio startup timeout')), 10000); child.stdout.on('data', data => { const match = String(data).match(/http:\/\/127\.0\.0\.1:\d+/); if (match) { clearTimeout(timer); resolveUrl(match[0] + '/api/studio?action='); } }); child.on('error', reject); });
    const headers = { 'Content-Type': 'application/json', origin: 'http://127.0.0.1:5174' };
    const post = (action: string, body: unknown, extra = {}) => fetch(url + action, { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify(body) });
    assert.equal((await post('generate', base)).status, 401);
    assert.equal((await post('login', { code, adultTeacher: true }, { origin: 'http://127.0.0.1:5173' })).status, 403);
    assert.equal((await post('login', { code, adultTeacher: false })).status, 422);
    const login = await post('login', { code, adultTeacher: true }); assert.equal(login.status, 200); const authCookie = login.headers.get('set-cookie')!; assert.match(authCookie, /^physical_studio=/); assert.match(authCookie, /HttpOnly/);
    const invalidKey = await post('configure', { apiKey: 'Physical', publicDataReviewed: true, freeProjectConfirmed: true }, { cookie: authCookie });
    assert.equal(invalidKey.status, 400); assert.match((await invalidKey.json()).error, /실제 API 키/);
    const fake = 'AQ.' + 'fake-test-key-never-real_'.repeat(15);
    assert.equal((await post('configure', { apiKey: fake, publicDataReviewed: true, freeProjectConfirmed: false }, { cookie: authCookie })).status, 400);
    const saved = await post('configure', { apiKey: fake, publicDataReviewed: true, freeProjectConfirmed: true }, { cookie: authCookie }); assert.equal(saved.status, 200); assert.equal((await saved.text()).includes(fake), false);
    assert.ok((await readFile(join(cwd, '.env.gemini.local'), 'utf8')).includes(fake));
    const status = await (await fetch(url + 'status', { headers: { cookie: authCookie } })).json(); assert.equal(status.aiReady, true); assert.equal(JSON.stringify(status).includes(fake), false);
    assert.equal((await post('generate', { ...base, studentName: 'private' }, { cookie: authCookie })).status, 422);
    assert.equal((await fetch(url.replace('/api/studio?action=', '/api/teacher?action=status'))).status, 404);
  } finally { child.kill(); }
});
