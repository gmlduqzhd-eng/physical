import {config} from 'dotenv';
import {createClient} from '@supabase/supabase-js';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

if(process.env.CLASSROOM_LIVE_TEST!=='1')throw Error('Explicit isolated live-fixture opt-in required');
config({path:'.env.local',quiet:true});
assert.equal(new URL(process.env.VITE_SUPABASE_URL!).hostname,'tjrrtgdhtjdkofwqnxnz.supabase.co');
const studentCount=Number(process.env.JOIN_STUDENT_COUNT||40);
assert(Number.isInteger(studentCount)&&studentCount>=4&&studentCount<=70);
let transportHandshakeRetries=0;
// Windows curl verifies against the OS certificate store; requests really run
// concurrently and no credentials are written to files or process arguments.
const httpsFetch:typeof fetch=async(input,init)=>{
 const request=new Request(input,init);assert.equal(new URL(request.url).protocol,'https:');
 const lines=['silent','show-error','ssl-revoke-best-effort','max-time = 45','url = '+JSON.stringify(request.url),'request = '+JSON.stringify(request.method),'write-out = "\\n%{http_code}"'];
 request.headers.forEach((v,k)=>lines.push('header = '+JSON.stringify(k+': '+v)));
 if(!['GET','HEAD'].includes(request.method))lines.push('data = '+JSON.stringify(await request.text()));
 let output:string;
 for(let attempt=0;;attempt++){
  const result=await new Promise<{code:number|null;out:string;err:string}>((resolve,reject)=>{const child=spawn('curl.exe',['--config','-'],{windowsHide:true});let out='',err='';child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);child.on('error',reject);child.on('close',code=>resolve({code,out,err}));child.stdin.end(lines.join('\n'));});
  // This Windows handshake failure occurs before any HTTP request is sent.
  // Never replay a request after an HTTP response or an ambiguous disconnect.
  if(result.code===35&&result.err.includes('failed to receive handshake')&&attempt<2){transportHandshakeRetries++;continue;}
  if(result.code!==0)throw Error('Verified HTTPS transport failed (curl '+result.code+')');
  output=result.out;break;
 }
 const split=output.lastIndexOf('\n'),status=Number(output.slice(split+1));
 return new Response(status===204?null:output.slice(0,split),{status,headers:{'content-type':'application/json'}});
};
const client=()=>createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_ANON_KEY!,{global:{fetch:httpsFetch},auth:{persistSession:false,autoRefreshToken:false}});
const must=(r:any)=>{if(r.error)throw Error(r.error.code+': '+r.error.message);return r.data;};
const run=randomUUID(),teacher=client(),students=Array.from({length:studentCount},()=>client());
const out=process.env.TEST_OUTPUT_DIR||'../../outputs/classroom-concurrency';fs.mkdirSync(out,{recursive:true});
const fixturePath='../prepared/concurrency-fixture.json',controlPath='../prepared/concurrency-control.json';
fs.rmSync(controlPath,{force:true});
const report:any={run,students:studentCount,started:new Date().toISOString(),cases:[],errors:[]};
const ids:string[]=[];let room:any,browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
const saveFixture=()=>fs.writeFileSync(fixturePath,JSON.stringify({run,teacherId:ids[0],userIds:ids,roomId:room?.id,templateId:room?.template_id}));
const wait=async(flag:string)=>{console.log('WAIT',flag);const until=Date.now()+15*60*1000;while(Date.now()<until){try{if(JSON.parse(fs.readFileSync(controlPath,'utf8'))[flag])return;}catch{ /* Operator has not supplied the phase flag yet. */ }await new Promise(r=>setTimeout(r,1000));}throw Error('Operator phase timed out: '+flag);};
const record=(name:string,data:object={})=>{report.cases.push({name,...data});console.log('PASS',name,JSON.stringify(data));};
const together=async(tasks:Promise<unknown>[])=>{
 const results=await Promise.allSettled(tasks);
 const failed=results.find(r=>r.status==='rejected');
 // Drain every in-flight write before deleting the fixture on failure.
 if(failed?.status==='rejected')throw failed.reason;
};
try{
 const login=must(await teacher.auth.signInAnonymously({options:{data:{physical_test_run:run}}}));ids.push(login.user.id);saveFixture();console.log('FIXTURE',JSON.stringify({run,teacherId:ids[0]}));
 await wait('teacherReady');
 room=must(await teacher.rpc('create_guided_classroom',{room_name:`[검증 전용] ${studentCount}명 동시 입장`,game_type:'zigzag',group_count:2,lesson_minutes:40,target_percent:75}));saveFixture();
 const invites=must(await teacher.rpc('get_classroom_invites',{room_uuid:room.id}));assert.equal(invites.length,2);
 const pending:number[]=[];const authStart=performance.now();
 await Promise.all(students.map(async(c,i)=>{const r=await c.auth.signInAnonymously({options:{data:{physical_test_run:run}}});if(r.error){pending.push(i);report.errors.push({phase:'baseline-auth',status:r.error.status,code:r.error.code});}else ids.push(r.data.user!.id);}));saveFixture();
 record(`${studentCount} simultaneous fresh authentication requests`,{success:studentCount-pending.length,limited:pending.length,elapsedMs:Math.round(performance.now()-authStart)});
 if(process.env.JOIN_EXPECT_AUTH_PASS==='1')assert.equal(pending.length,0,'Every fresh session must authenticate without rate-limit errors');
 if(pending.length){await wait('authLimitReady');await Promise.all(pending.map(async i=>{const data=must(await students[i].auth.signInAnonymously({options:{data:{physical_test_run:run}}}));ids.push(data.user.id);}));saveFixture();}
 assert.equal(ids.length,studentCount+1);record(`${studentCount} independent student sessions available`);
 const pin=(i:number,code=invites[i%2].short_pin,number=i+1)=>students[i].rpc('join_classroom_short_pin_profile',{entry_pin:code,student_number:number,nickname:'검증'+(i+1)});
 const qr=(i:number,code=invites[i%2].code,number=i+1)=>students[i].rpc('join_classroom_invite_profile',{room_uuid:room.id,group_name:invites[i%2].group_name,invite_code:code,student_number:number,nickname:'검증'+(i+1)});
 if(process.env.JOIN_EXPECT_BASELINE==='1'){
  const results=[];for(let n=0;n<15;n++)results.push(must(await pin(0)));
  assert.equal(results[12].error,'rate_limited');record('reproduced valid re-entry blocked at attempt 13',{error:results[12].error});
  await wait('migrationReady');
 }
 const joinStart=performance.now();
 await together(students.map(async(_,i)=>{const r=must(await(i%2?qr(i):pin(i)));assert.equal(r.room_id,room.id);assert(!r.error,JSON.stringify(r));}));
 record(`${studentCount} simultaneous student joins`,{pin:Math.ceil(studentCount/2),qr:Math.floor(studentCount/2),elapsedMs:Math.round(performance.now()-joinStart)});
 let roster=must(await teacher.rpc('get_classroom_roster',{room_uuid:room.id}));assert.equal(roster.length,studentCount);assert.equal(new Set(roster.map((r:any)=>r.student_number)).size,studentCount);record(`${studentCount} distinct student records and numbers retained`);
 for(let n=0;n<20;n++){assert(!must(await pin(0)).error);assert(!must(await qr(1)).error);}record('20 valid PIN re-entries and 20 valid QR re-entries do not lock out');
 // Valid credentials plus a profile conflict must not consume guess allowance.
 for(let n=0;n<15;n++)assert.equal(must(await pin(2,invites[0].short_pin,1)).error,'number_taken');
 assert(!must(await pin(2)).error);record('15 student-number corrections do not block valid entry');
 // A nonexistent QR cannot accidentally match another real classroom.
 const failed=await Promise.all(Array.from({length:20},()=>qr(3,'invalid-test-invite')));
 assert.equal(failed.filter(r=>must(r).error==='invalid_invite').length,12);
 assert.equal(failed.filter(r=>must(r).error==='rate_limited').length,8);
 assert(!must(await qr(3)).error);record('concurrent invalid guesses limited to 12; existing member can re-enter own group');
 assert.equal(must(await students[3].rpc('join_classroom_invite_profile',{room_uuid:room.id,group_name:invites[0].group_name,invite_code:invites[0].code,student_number:4,nickname:'검증4'})).error,'rate_limited');record('locked user cannot bypass limit for another group');
 browser=await chromium.launch({channel:'chrome',headless:true});
 for(const [index,width]of [390,1440].entries()){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700}),page=await context.newPage();page.on('pageerror',e=>report.errors.push({phase:'browser',message:e.message}));
  await page.route('**/auth/v1/signup',async route=>{const body=route.request().postDataJSON();await route.continue({postData:JSON.stringify({...body,data:{...body.data,physical_test_run:run}})});});
  page.on('response',async response=>{if(response.url().endsWith('/auth/v1/signup')&&response.ok()){const body=await response.json();if(body.user?.id){ids.push(body.user.id);saveFixture();}}});
  const invite=invites[index];const base=process.env.AUDIT_URL||'https://physical-pi.vercel.app';
  await page.goto(index?base+'/join?'+new URLSearchParams({room:room.id,group:invite.group_name})+'#'+new URLSearchParams({code:invite.code}):base+'/lobby?pin='+invite.short_pin);
  await page.getByLabel('학생 번호 (1~99)',{exact:true}).fill(String(71+index));await page.getByLabel('별명 (2~12자)',{exact:true}).fill('화면검증'+index);
  await page.getByRole('button',{name:/우리 모둠으로 입장|참여하기/}).click();await page.waitForURL('**/mobile/**');await page.getByText('화면검증'+index,{exact:false}).first().waitFor();
  await page.screenshot({path:out+'/student-'+width+'.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));record('real production student UI join',{width,method:index?'QR':'PIN'});await context.close();
 }
 roster=must(await teacher.rpc('get_classroom_roster',{room_uuid:room.id}));assert.equal(roster.length,studentCount+2);record('browser entries also persisted',{rosterCount:roster.length});
 assert.equal(report.errors.filter((e:any)=>e.phase!=='baseline-auth').length,0);report.passed=true;
}catch(error){report.passed=false;report.failure=error instanceof Error?error.message:String(error);process.exitCode=1;}
finally{
 if(browser)await browser.close();if(room){must(await teacher.from('game_rooms').delete().eq('id',room.id));must(await teacher.from('mission_templates').delete().eq('id',room.template_id));}
 await Promise.all([teacher,...students].map(async c=>{await c.rpc('logout_classroom');await c.auth.signOut({scope:'local'});}));
 report.roomCleanup=true;report.transportHandshakeRetries=transportHandshakeRetries;report.finished=new Date().toISOString();fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log('RESULT',JSON.stringify({passed:report.passed,failure:report.failure,roomCleanup:report.roomCleanup,transportHandshakeRetries}));
}
