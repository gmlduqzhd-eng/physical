import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomBytes,scryptSync } from 'node:crypto';
import teacher from '../api/teacher';
import studio from '../server/studioHandler';

test('Google login uses verified identities, scoped cookies, revocation and no token disclosure',async()=>{
 const before={...process.env},actual=globalThis.fetch;const uid='5c8c5015-f4b8-4ef6-8ce6-465ec41d333a';let enabled=true;let providerCalls=0;
 const salt=randomBytes(16).toString('hex');Object.assign(process.env,{NODE_ENV:'production',TEACHER_ACCESS_HASH:salt+':'+scryptSync('synthetic-shared-teacher',salt,64).toString('hex'),TEACHER_SESSION_SECRET:'synthetic-session-secret-not-real-123456',VITE_SUPABASE_URL:'https://synthetic-api.example',VITE_SUPABASE_ANON_KEY:'synthetic-key',CLASSROOM_TEACHER_BOOTSTRAP:'synthetic-bootstrap-not-real-123456',STUDIO_LIMIT_URL:'https://synthetic-api.example',STUDIO_LIMIT_KEY:'synthetic-key',STUDIO_LIMIT_SECRET:'synthetic-limit-secret-not-real-123456'});
 const main=createServer((req,res)=>{void teacher(req,res);}),ai=createServer((req,res)=>{void studio(req,res);});
 await new Promise<void>(r=>main.listen(0,'127.0.0.1',r));await new Promise<void>(r=>ai.listen(0,'127.0.0.1',r));
 const mainUrl=`http://127.0.0.1:${(main.address() as {port:number}).port}`,aiUrl=`http://127.0.0.1:${(ai.address() as {port:number}).port}`;
 process.env.APP_ORIGIN=mainUrl;process.env.STUDIO_ORIGIN=aiUrl;delete process.env.VERCEL_URL;
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input));
  if(url.origin==='https://synthetic-api.example'){
   if(url.pathname==='/auth/v1/user')return new Response(JSON.stringify({id:uid,email_confirmed_at:new Date().toISOString(),is_anonymous:false,identities:[{provider:'google'}]}));
   if(url.pathname==='/auth/v1/settings')return new Response(JSON.stringify({external:{google:true}}));
   if(url.pathname.endsWith('/teacher_account'))return new Response(JSON.stringify({id:uid,enabled,version:1,role:'teacher'}));
   if(url.pathname.endsWith('/teacher_login_attempt'))return new Response(JSON.stringify({allowed:true,retrySeconds:0}));
   if(url.pathname.endsWith('/studio_limit_request'))return new Response(JSON.stringify({allowed:true,retrySeconds:0,reason:'accepted'}));
   if(url.pathname.endsWith('/check_teacher_account'))return new Response(JSON.stringify({enabled,role:'teacher'}));
   if(url.pathname.endsWith('/check_shared_teacher_access'))return new Response('true');
   if(url.pathname.endsWith('/check_shared_teacher_login'))return new Response('false');
   throw Error('Unexpected RPC');
  }
  if(url.hostname==='generativelanguage.googleapis.com'){providerCalls++;throw Error('No model call in account tests');}
  return actual(input,init);
 };
 const body={accessToken:'synthetic-google-access-token-123456',adultTeacher:true};
 const post=(base:string,service:string,action:string,origin=base)=>actual(base+`/api/${service}?action=`+action,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  for(const [base,service] of [[mainUrl,'teacher'],[aiUrl,'studio']]){
   const status=await actual(base+`/api/${service}?action=status`);assert.equal((await status.json()).legacyLoginEnabled,false);
   const shared=await actual(base+`/api/${service}?action=login`,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({code:'synthetic-shared-teacher',adultTeacher:true})});assert.equal(shared.status,401);
  }
  assert.equal((await post(mainUrl,'teacher','google-login','https://foreign.example')).status,403);
  const login=await post(mainUrl,'teacher','google-login');assert.equal(login.status,200);const response=await login.json();assert.deepEqual(response,{authenticated:true});
  const mainCookie=login.headers.get('set-cookie')!.split(';')[0];assert.match(mainCookie,/^physical_teacher=/);assert(!mainCookie.includes('test-access'));
  const aiLogin=await post(aiUrl,'studio','google-login');assert.equal(aiLogin.status,200);assert.deepEqual(await aiLogin.json(),{authenticated:true});const aiCookie=aiLogin.headers.get('set-cookie')!.split(';')[0];assert.match(aiCookie,/^physical_studio=/);
  enabled=false;
  const expired=await actual(mainUrl+'/api/teacher?action=status',{headers:{Cookie:mainCookie}});assert.equal((await expired.json()).authenticated,false);
  const revoked=await actual(aiUrl+'/api/studio?action=generate',{method:'POST',headers:{Cookie:aiCookie,Origin:aiUrl,'Content-Type':'application/json'},body:'{}'});assert.equal(revoked.status,401);
  assert.equal((await post(aiUrl,'studio','google-login')).status,403);
  const signup=await post(mainUrl,'teacher','account-signup');assert.equal(signup.status,401);assert.equal(providerCalls,0);
 }finally{
  globalThis.fetch=actual;await Promise.all([new Promise<void>(r=>main.close(()=>r())),new Promise<void>(r=>ai.close(()=>r()))]);for(const key of Object.keys(process.env))if(!(key in before))delete process.env[key];Object.assign(process.env,before);
 }
});
