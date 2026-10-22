import {config} from 'dotenv';
import {createClient} from '@supabase/supabase-js';
import {chromium} from 'playwright';
import {windowsHttpsFetch} from './windowsHttpsFetch';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import assert from 'node:assert/strict';
if(process.env.CLASSROOM_LIVE_TEST!=='1')throw Error('Explicit isolated live-fixture opt-in required');
config({path:'.env.local',quiet:true});assert.equal(new URL(process.env.VITE_SUPABASE_URL!).hostname,'tjrrtgdhtjdkofwqnxnz.supabase.co');
const base='https://physical-pi.vercel.app',out='../../outputs/phone-plays/live';fs.mkdirSync(out,{recursive:true});
const run=randomUUID(),fixture='../prepared/phone-live-fixture.json',control='../prepared/phone-live-control.json';fs.rmSync(control,{force:true});
const teacher=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_ANON_KEY!,{global:{fetch:windowsHttpsFetch},auth:{persistSession:false,autoRefreshToken:false}});
const must=(r:any)=>{if(r.error)throw Error(r.error.code+': '+r.error.message);return r.data;};
const login=must(await teacher.auth.signInAnonymously({options:{data:{physical_test_run:run}}}));
const ids=[login.user.id],rooms:any[]=[],report:any={run,base,cases:[],errors:[]};
const saveFixture=()=>fs.writeFileSync(fixture,JSON.stringify({run,teacherId:ids[0],userIds:ids,rooms:rooms.map(r=>({roomId:r.id,templateId:r.template_id}))}));saveFixture();console.log('FIXTURE',JSON.stringify({run,teacherId:ids[0]}));
const wait=async(flag:string)=>{console.log('WAIT',flag);const until=Date.now()+25*60*1000;while(Date.now()<until){try{if(JSON.parse(fs.readFileSync(control,'utf8'))[flag])return;}catch{/* Waiting for deployment/setup phase. */}await new Promise(r=>setTimeout(r,1000));}throw Error('Phase timed out: '+flag);};
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try{
 await wait('representativesReady');browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:900},hasTouch:true}),page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.clock.install();
 await page.route('**/auth/v1/signup',async route=>{const body=route.request().postDataJSON();await route.continue({postData:JSON.stringify({...body,data:{...body.data,physical_test_run:run}})});});
 page.on('response',async response=>{if(response.url().endsWith('/auth/v1/signup')&&response.ok()){const b=await response.json();if(b.user?.id){ids.push(b.user.id);saveFixture();}}});
 for(const [index,game]of ['phone-play-001','phone-play-065'].entries()){
  if(index)await wait('allGamesReady');
  await page.setViewportSize({width:index?1440:390,height:900});
  const room=must(await teacher.rpc('create_guided_classroom',{room_name:'[검증 전용] 준비물 없는 놀이 '+(index+1),game_type:game,group_count:1,lesson_minutes:40,target_percent:75}));rooms.push(room);saveFixture();
  const invite=must(await teacher.rpc('get_classroom_invites',{room_uuid:room.id}))[0],group=must(await teacher.from('room_groups').select('*').eq('room_id',room.id).single());
  const template=must(await teacher.from('mission_templates').select('buttons').eq('id',room.template_id).single()),mission=template.buttons[0].id;
  await page.goto(index?base+'/join?'+new URLSearchParams({room:room.id,group:group.group_name})+'#'+new URLSearchParams({code:invite.code}):base+'/lobby?pin='+invite.short_pin);
  await page.getByLabel('학생 번호 (1~99)',{exact:true}).fill('91');await page.getByLabel('별명 (2~12자)',{exact:true}).fill('놀이검증');await page.getByRole('button',{name:/우리 모둠으로 입장|참여하기/}).click();await page.waitForURL('**/mobile/**');
  must(await teacher.from('game_rooms').update({status:'playing',started_at:new Date().toISOString()}).eq('id',room.id));await page.reload();await page.getByRole('button',{name:'게임 시작 →',exact:true}).click();
  await page.getByRole('button',{name:'활동 시작',exact:true}).click();await page.locator('[data-phone-play]').waitFor();
  const button=(name:string)=>page.getByRole('button',{name,exact:true}),phase=(p:string)=>page.locator(`[data-phone-play][data-phase="${p}"]`).waitFor();
  await button('놀이 방법 익히기').click();await button('짧게 연습하기').click();await phase('countdown');await page.clock.fastForward(4100);await page.clock.runFor(200);await phase('active');await page.clock.fastForward(8500);await page.clock.runFor(200);await phase('record');assert.equal(must(await teacher.from('room_groups').select('score').eq('id',group.id).single()).score,0);await button('연습 마치고 첫 과제로').click();
  for(let n=0;n<3;n++){
   await button('폰 내려놓고 활동 시작').click();await phase('countdown');await page.clock.fastForward(4100);await page.clock.runFor(200);await phase('active');await page.clock.fastForward(40000);await page.clock.runFor(200);await phase('record');
   const checks=page.locator('.phone-play input[type=checkbox]');for(let i=0;i<await checks.count();i++)await checks.nth(i).check();await button(n===2?'목표 확인 · 놀이 마치기':'목표 확인 · 다음 과제로').click();
  }
  await page.locator('.game-result-overlay').waitFor();await page.clock.runFor(1500);await button('모둠으로').click();await page.locator('fieldset button').first().waitFor();await page.locator('fieldset button').first().click();await page.clock.runFor(1500);await page.getByText('선생님 화면에 저장했어요.',{exact:true}).waitFor();
  const saved=must(await teacher.from('room_groups').select('score,completed_missions,stats').eq('id',group.id).single());assert.equal(saved.score,300);assert(saved.completed_missions.includes(mission));assert(saved.stats.guided_reflections[mission]);assert.equal(must(await teacher.rpc('get_classroom_roster',{room_uuid:room.id})).length,1);
  await page.reload();await page.getByRole('button',{name:'다시 도전하기 →',exact:true}).waitFor();assert.equal(must(await teacher.from('room_groups').select('score').eq('id',group.id).single()).score,300);await page.screenshot({path:out+`/stage-${index+1}.png`,fullPage:true});
  report.cases.push({game,width:index?1440:390,method:index?'QR':'PIN',score:300,practiceNoAward:true,completed:true,reflectionSaved:true,rosterSaved:true,reloadNoDuplicate:true});fs.writeFileSync(out+'/progress.json',JSON.stringify(report,null,2));console.log('PASS live phase',index+1);
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.passed=false;report.failure=error instanceof Error?error.message:String(error);process.exitCode=1;}
finally{
 if(browser)await browser.close();for(const room of rooms){must(await teacher.from('game_rooms').delete().eq('id',room.id));must(await teacher.from('mission_templates').delete().eq('id',room.template_id));}await teacher.rpc('logout_classroom');await teacher.auth.signOut({scope:'local'});report.roomCleanup=true;fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log('RESULT',JSON.stringify({passed:report.passed,failure:report.failure,roomCleanup:true}));
}
