import test from 'node:test';
import assert from 'node:assert/strict';
import { generateStudioAdvice } from '../server/geminiStudio.js';
import { studioFailureDiagnostics } from '../server/studioHandler.js';

const input = { task:'participation',activityId:'space-occupier',grade:'3~4학년군',goal:'협동과 소통',place:'체육관',device:'태블릿 PC',deviceCount:'모둠별 1대',minutes:40,groupSize:6,classSize:24,consent:true,adultTeacher:true };
const output = { title:'교사 검토용 활동 안내',recommendations:[],sections:['오늘의 몸 미션','역할 바꾸기','기다리는 동안'].map(heading=>({heading,minutes:null,content:'친구와 역할을 번갈아 맡아 활동해 보세요.',citations:[{sourceId:'space-occupier:description:0'}]})),safety:[],teacherChecks:['현장의 참여 조건을 확인했나요?'] };

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
      assert.equal(calls,mode==='quota'?1:2,mode);
      assert(signals.every(Boolean));
    }
  } finally {globalThis.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in originalEnv))delete process.env[key];Object.assign(process.env,originalEnv);}
});

test('diagnostics omit provider bodies, names, prompts and arbitrary issue paths',()=>{
  const secret='do-not-log-secret-or-student';
  const diagnostic=studioFailureDiagnostics({name:secret,message:secret,responseBody:secret,statusCode:400,cause:{name:'ZodError',issues:[{code:secret,path:['sections',0,'content',secret]}],message:secret}});
  assert.equal(JSON.stringify(diagnostic).includes(secret),false);
  assert.deepEqual(diagnostic,[{kind:'unknown',status:400},{kind:'ZodError',issues:['sections.#.content.?']}]);
});
