import test from 'node:test';
import assert from 'node:assert/strict';
import { generateStudioAdvice, studioProviderCategory, studioRetryDelayMs, studioRetryInstruction, withStudioRecovery } from '../server/geminiStudio.js';
import { studioFailureDiagnostics } from '../server/studioHandler.js';
import { APICallError } from 'ai';

const input = { task:'participation',activityId:'space-occupier',grade:'3~4학년군',goal:'협동과 소통',place:'체육관',device:'태블릿 PC',deviceCount:'모둠별 1대',minutes:40,groupSize:6,classSize:24,consent:true,adultTeacher:true };
const output = { title:'교사 검토용 활동 안내',recommendations:[],sections:['오늘의 몸 미션','역할 바꾸기','기다리는 동안'].map(heading=>({heading,minutes:null,content:'친구와 역할을 번갈아 맡아 활동해 보세요.',citations:[{sourceId:'space-occupier:description:0'}]})),safety:[{sourceId:'space-occupier:safety:0'}],teacherChecks:['현장의 참여 조건을 확인했나요?'] };

test('missing teaching structure is repaired once without bypassing final validation', async () => {
  for (const message of ['난이도별 진행·역할·관찰 항목이 필요합니다.', '난이도별 조정 내용이 서로 같아서는 안 됩니다.', '성찰 질문은 줄바꿈으로 구분한 세 문항이어야 합니다.', '제공된 안전 원문이 누락되었습니다.', '필수 수업 인원·활동 시간이 반영되지 않았습니다.']) {
    assert.ok(studioRetryInstruction(new Error(message)));
    let calls = 0;
    await assert.rejects(withStudioRecovery(async correction => {
      calls++;
      if (calls === 2) assert.ok(correction);
      throw new Error(message);
    }, virtualRuntime()), { message });
    assert.equal(calls, 2);
  }
  assert.equal(studioRetryInstruction(new Error('원문과 일치하지 않는 근거입니다.')), null);
});

test('malformed or long Gemini output is regenerated once, while quota errors are not retried',async()=>{
  const originalFetch=globalThis.fetch, originalEnv={...process.env};
  Object.assign(process.env,{GEMINI_API_KEY:'synthetic-never-real',GEMINI_MODEL:'synthetic-model',GEMINI_PUBLIC_DATA_REVIEWED:'true'});
  try {
    for(const mode of ['malformed','long','always-invalid','transient','unavailable','quota'] as const){
      let calls=0; const signals:AbortSignal[]=[];
      globalThis.fetch=async(_url,init)=>{
        calls++; signals.push(init!.signal!);
        if(mode==='quota')return new Response(JSON.stringify({error:{code:429,message:'synthetic quota',status:'RESOURCE_EXHAUSTED'}}),{status:429,headers:{'Content-Type':'application/json'}});
        if(mode==='unavailable'||(mode==='transient'&&calls===1))return new Response(JSON.stringify({error:{code:503,message:'synthetic temporary overload',status:'UNAVAILABLE'}}),{status:503,headers:{'Content-Type':'application/json'}});
        const result=structuredClone(output);
        if(mode==='always-invalid'||(mode==='long'&&calls===1))result.sections[0].content='가'.repeat(101);
        const text=mode==='malformed'&&calls===1?'{invalid':JSON.stringify(result);
        return new Response(JSON.stringify({candidates:[{content:{role:'model',parts:[{text}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:10,totalTokenCount:20}}),{headers:{'Content-Type':'application/json'}});
      };
      if(mode==='always-invalid'||mode==='unavailable'||mode==='quota')await assert.rejects(generateStudioAdvice(input));
      else {const result=await generateStudioAdvice(input);assert.equal(result.result.sections.length,3);assert(result.result.sections.every(s=>s.content.length<=100&&s.citations.length>0));}
      assert.equal(calls,mode==='quota'?1:mode==='unavailable'?3:2,mode);
      assert(signals.every(Boolean));
    }
  } finally {globalThis.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in originalEnv))delete process.env[key];Object.assign(process.env,originalEnv);}
});

const providerError = (statusCode = 503, retryAfter?: string) => new APICallError({
  message: 'synthetic high demand; do-not-log-secret', url: 'https://generativelanguage.googleapis.com/synthetic',
  requestBodyValues: { private: 'do-not-log-secret' }, statusCode,
  responseHeaders: retryAfter ? { 'retry-after': retryAfter } : undefined,
  responseBody: 'do-not-log-secret',
});

function virtualRuntime() {
  let time = 0;
  const waits: number[] = [];
  return { waits, advance: (ms: number) => { time += ms; }, now: () => time, random: () => 0.5, sleep: async (ms: number) => { waits.push(ms); time += ms; } };
}

test('two transient failures recover with increasing delays and one shared budget', async () => {
  const runtime = virtualRuntime(); const timeouts: number[] = []; let calls = 0;
  const result = await withStudioRecovery(async (_correction, timeout) => {
    timeouts.push(timeout); if (++calls < 3) throw providerError(); return 'validated';
  }, runtime);
  assert.equal(result, 'validated'); assert.equal(calls, 3);
  assert.deepEqual(runtime.waits, [2500, 4500]);
  assert.deepEqual(timeouts, [90000, 87500, 83000]);
});

test('Retry-After, including HTTP dates, is honored without exceeding the deadline', async () => {
  assert.equal(studioRetryDelayMs(providerError(503, '12'), 1, 0, 0), 12000);
  assert.equal(studioRetryDelayMs(providerError(503, 'Thu, 01 Jan 1970 00:00:15 GMT'), 1, 0, 0), 15000);
  assert.equal(studioRetryDelayMs(providerError(503, 'invalid'), 2, 0, 0), 4000);
  for (const header of ['120', '999999999999999999999999']) {
    const runtime = virtualRuntime(); let calls = 0;
    await assert.rejects(withStudioRecovery(async () => { calls++; throw providerError(503, header); }, runtime));
    assert.equal(calls, 1); assert.deepEqual(runtime.waits, []);
  }
  const runtime = virtualRuntime(); let calls = 0;
  await assert.rejects(withStudioRecovery(async () => { calls++; runtime.advance(81000); throw providerError(); }, runtime));
  assert.equal(calls, 1); assert.deepEqual(runtime.waits, []);
});

test('quota, payment, credential, model and timeout errors are never retried', async () => {
  for (const error of [providerError(400), providerError(401), providerError(402), providerError(403), providerError(404), providerError(429), new DOMException('synthetic', 'TimeoutError')]) {
    let calls = 0; const runtime = virtualRuntime();
    await assert.rejects(withStudioRecovery(async () => { calls++; throw error; }, runtime));
    assert.equal(calls, 1); assert.deepEqual(runtime.waits, []);
  }
});

test('format repair and server retries share a three-call cap and only one format repair', async () => {
  const runtime = virtualRuntime(); const corrections: (string | null)[] = []; let calls = 0;
  await assert.rejects(withStudioRecovery(async correction => {
    corrections.push(correction); calls++;
    if (calls === 1 || calls === 3) throw new Error('근거가 없는 제안입니다.');
    throw providerError();
  }, runtime));
  assert.equal(calls, 3); assert(corrections[1]); assert.equal(corrections[2], corrections[1]);
});

test('provider overload diagnosis and retry logs never include arbitrary provider content', async () => {
  const logs: string[] = []; const original = console.info;
  console.info = (...args) => { logs.push(args.join(' ')); };
  try {
    await assert.rejects(withStudioRecovery(async () => { throw providerError(); }, virtualRuntime()));
    assert.equal(studioProviderCategory(providerError()), 'provider_overloaded');
    assert.equal(studioFailureDiagnostics(providerError())[0].category, 'provider_overloaded');
    assert.equal(logs.length, 2); assert(!logs.join('').includes('do-not-log-secret'));
  } finally { console.info = original; }
});

test('diagnostics omit provider bodies, names, prompts and arbitrary issue paths',()=>{
  const secret='do-not-log-secret-or-student';
  const diagnostic=studioFailureDiagnostics({name:secret,message:secret,responseBody:secret,statusCode:400,cause:{name:'ZodError',issues:[{code:secret,path:['sections',0,'content',secret]}],message:secret}});
  assert.equal(JSON.stringify(diagnostic).includes(secret),false);
  assert.deepEqual(diagnostic,[{kind:'unknown',status:400},{kind:'ZodError',issues:['sections.#.content.?']}]);
});
