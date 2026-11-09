import {parseLoginConditions} from '../teacher-studio/loginConditions';
import test from 'node:test';
import assert from 'node:assert/strict';
import { isFreshClassroomRecord,CLASSROOM_STORAGE_TTL,cleanClassroomStorage } from '../src/application/storageRetention';
import { activeTeacherSession,googleTeacherLogin,TeacherAccountError,sharedTeacherLoginAttempt } from '../server/teacherAccounts';
import { requestStudio,StudioRequestError } from '../teacher-studio/studioRequest';
import { activityFingerprint } from '../src/domain/activityReview';
import { AVAILABLE_GAMES } from '../src/domain/gamesData';

test('classroom records expire after eight hours and reject future/corrupt timestamps',()=>{
 const now=Date.now();assert(isFreshClassroomRecord(now,now));
 for(const stamp of [now-CLASSROOM_STORAGE_TTL,now-CLASSROOM_STORAGE_TTL-1,now+60001,NaN,Infinity,'today',undefined])assert.equal(isFreshClassroomRecord(stamp,now),false);
});
test('persistent classroom receipts are purged while fresh tab records and unrelated apps survive',()=>{
 const make=()=>{const data=new Map<string,string>();return {data,get length(){return data.size;},key(i:number){return [...data.keys()][i]??null;},getItem(k:string){return data.get(k)??null;},removeItem(k:string){data.delete(k);}};};
 const local=make(),session=make();const original=globalThis.window;
 local.data.set('physical_guided_receipt_old',JSON.stringify({updatedAt:Date.now()}));local.data.set('other_app','keep');
 session.data.set('physical_sync_action_fresh',JSON.stringify({timestamp:Date.now()}));session.data.set('physical_guided_receipt_expired',JSON.stringify({updatedAt:Date.now()-CLASSROOM_STORAGE_TTL-1}));
 Object.assign(globalThis,{window:{localStorage:local,sessionStorage:session}});
 try{cleanClassroomStorage();assert.equal(local.data.size,1);assert.equal(local.data.get('other_app'),'keep');assert.equal(session.data.size,1);assert(session.data.has('physical_sync_action_fresh'));}finally{Object.assign(globalThis,{window:original});}
});
test('Google identity and account state are verified without storing provider tokens in app cookies',async()=>{
 const originalFetch=globalThis.fetch,originalEnv={...process.env};const uid='5c8c5015-f4b8-4ef6-8ce6-465ec41d333a';let enabled=false,checks=0,googleIdentity=true;
 process.env.VITE_SUPABASE_URL='https://synthetic-accounts.example';process.env.VITE_SUPABASE_ANON_KEY='synthetic-public-key';process.env.CLASSROOM_TEACHER_BOOTSTRAP='synthetic-bootstrap-not-real-123456789';
 globalThis.fetch=async(url,init)=>{
  const path=new URL(String(url)).pathname;assert(!String(url).includes('synthetic-password-1234'));
  if(path==='/auth/v1/user')return new Response(JSON.stringify({id:uid,email_confirmed_at:new Date().toISOString(),is_anonymous:false,identities:[{provider:googleIdentity?'google':'email'}]}));
  if(path==='/rest/v1/rpc/teacher_account'){assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer synthetic-google-access-token-123456');return new Response(JSON.stringify({id:uid,enabled,version:3,role:'teacher'}));}
  if(path==='/rest/v1/rpc/check_teacher_account'){checks++;assert.equal(JSON.parse(String(init?.body)).teacher_uuid,uid);return new Response(JSON.stringify({enabled}));}
  if(path==='/rest/v1/rpc/teacher_login_attempt')return new Response(JSON.stringify({allowed:false,retrySeconds:120}));
  throw Error('Unexpected external request');
 };
 try{
  await assert.rejects(googleTeacherLogin({accessToken:'synthetic-google-access-token-123456',adultTeacher:true}),e=>e instanceof TeacherAccountError&&e.status===403);
  enabled=true;const account=await googleTeacherLogin({accessToken:'synthetic-google-access-token-123456',adultTeacher:true});assert('nonce' in account);if(!('nonce' in account))throw Error('No nonce');
  assert.match(account.nonce!,/^acct:/);assert(!account.nonce!.includes('fixture-access'));assert(await activeTeacherSession(account.nonce!));enabled=false;assert.equal(await activeTeacherSession(account.nonce!),false);assert.equal(checks,2);
  assert.deepEqual(await sharedTeacherLoginAttempt('synthetic-ip'),{allowed:false,retrySeconds:120});
  googleIdentity=false;await assert.rejects(googleTeacherLogin({accessToken:'synthetic-google-access-token-123456',adultTeacher:true}),e=>e instanceof TeacherAccountError&&e.status===401);googleIdentity=true;
  await assert.rejects(googleTeacherLogin({accessToken:'synthetic-google-access-token-123456',adultTeacher:true,role:'admin'}),e=>e instanceof TeacherAccountError&&e.status===422);
 }finally{globalThis.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in originalEnv))delete process.env[key];Object.assign(process.env,originalEnv);}
});
test('account validation fails closed when the approval backend is unavailable',async()=>{
 const original=globalThis.fetch,originalEnv={...process.env};process.env.VITE_SUPABASE_URL='https://synthetic-accounts.example';process.env.VITE_SUPABASE_ANON_KEY='synthetic-public-key';process.env.CLASSROOM_TEACHER_BOOTSTRAP='synthetic-bootstrap-not-real-123456789';
 globalThis.fetch=async()=>{throw Error('private-diagnostic');};
 try{await assert.rejects(activeTeacherSession('acct:5c8c5015-f4b8-4ef6-8ce6-465ec41d333a:3:'+ 'a'.repeat(36)),e=>e instanceof TeacherAccountError&&e.status===503&&!e.message.includes('private-diagnostic'));}finally{globalThis.fetch=original;for(const key of Object.keys(process.env))if(!(key in originalEnv))delete process.env[key];Object.assign(process.env,originalEnv);}
});
test('AI wait honors Retry-After and cancellation without automatic retry',async()=>{
 let calls=0;const mock:typeof fetch=async()=>{calls++;return new Response(JSON.stringify({error:'Busy'}),{status:429,headers:{'Retry-After':'37'}});};
 await assert.rejects(requestStudio('generate',{},mock),e=>e instanceof StudioRequestError&&e.retrySeconds===37);assert.equal(calls,1);
 const controller=new AbortController();controller.abort();const aborted:typeof fetch=async(_url,options)=>{options?.signal?.throwIfAborted();throw Error('Request should not continue');};
 await assert.rejects(requestStudio('generate',{},aborted,controller.signal),{name:'AbortError'});
});
test('activity review fingerprints change when instructions or safety change',async()=>{
 const game=AVAILABLE_GAMES[0],hash=await activityFingerprint(game);assert.match(hash,/^[a-f0-9]{64}$/);
 assert.notEqual(await activityFingerprint({...game,desc:game.desc+' changed'}),hash);
 assert.notEqual(await activityFingerprint({...game,safetyTips:['changed safety']}),hash);
 assert.equal(await activityFingerprint(game),hash);
});

test('OAuth restores only public teaching conditions for ten minutes, never private records or drafts',()=>{
 const now=Date.now();const form={task:'recommend',activityId:null,grade:'3~4학년군',goal:'협동과 소통',place:'체육관',device:'태블릿 PC',deviceCount:'모둠별 1대',minutes:40,groupSize:6,classSize:24,consent:true,adultTeacher:true};
 const stored={expires:now+600000,form,step:2,chosen:true};assert.equal(parseLoginConditions(JSON.stringify(stored),now)?.step,2);
 assert.equal(parseLoginConditions(JSON.stringify({...stored,expires:now}),now),null);
 assert.equal(parseLoginConditions(JSON.stringify({...stored,form:{...form,studentName:'must-not-persist'}}),now),null);
 assert.equal(parseLoginConditions(JSON.stringify({...stored,form:{...form,task:'next'}}),now),null);
});
