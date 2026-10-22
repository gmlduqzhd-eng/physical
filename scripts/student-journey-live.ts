import {config} from 'dotenv';
import {createClient} from '@supabase/supabase-js';
import {chromium} from 'playwright';
import {windowsHttpsFetch} from './windowsHttpsFetch';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {makeQuestRound,safeRoute} from '../src/domain/movementQuests';
if(process.env.CLASSROOM_LIVE_TEST!=='1')throw Error('Explicit live fixture opt-in required');
config({path:'.env.local',quiet:true});assert.equal(new URL(process.env.VITE_SUPABASE_URL!).hostname,'tjrrtgdhtjdkofwqnxnz.supabase.co');
const base=process.argv[2]||'https://physical-pi.vercel.app',out=path.resolve(process.env.TEST_OUTPUT_DIR||'../../outputs/journeys/live');fs.mkdirSync(out,{recursive:true});
const db=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_ANON_KEY!,{global:{fetch:windowsHttpsFetch},auth:{persistSession:false,autoRefreshToken:false}}),run=randomUUID();
const login=await db.auth.signInAnonymously({options:{data:{physical_test_run:run}}});if(login.error||!login.data.user)throw Error('Synthetic teacher fixture auth failed');
const metadata={run,teacherId:login.data.user.id};fs.writeFileSync('../prepared/journey-live-fixture.json',JSON.stringify(metadata));console.log('FIXTURE_SETUP',JSON.stringify(metadata));
const must=(r:any)=>{if(r.error)throw Error(r.error.code+': '+r.error.message);return r.data;};
let room:any,browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;const report:{base:string;cases:unknown[];errors:string[];cleanup?:boolean}={base,cases:[],errors:[]};
try{
 // Only this synthetic user receives a short fixture authorization via the
 // management connector. No application login or production PIN is bypassed.
 for(let i=0;i<60;i++){const result=await db.rpc('create_guided_classroom',{room_name:'[검증 전용] 갈림길 보급 작전',game_type:'zigzag',group_count:2,lesson_minutes:40,target_percent:75});if(!result.error){room=result.data;break;}await new Promise(r=>setTimeout(r,1000));}
 assert(room?.id,'Fixture setup authorization did not arrive');
 const groups=must(await db.from('room_groups').select('*').eq('room_id',room.id).order('group_name'));
 const invites=must(await db.rpc('get_classroom_invites',{room_uuid:room.id}));
 const template=must(await db.from('mission_templates').select('*').eq('id',room.template_id).single()),missionId=template.buttons[0].id;
 fs.writeFileSync('../prepared/journey-live-fixture.json',JSON.stringify({...metadata,roomId:room.id,templateId:room.template_id}));
 browser=await chromium.launch({channel:'chrome',headless:true});
 for(const [index,width]of [390,1440].entries()){
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<700,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>report.errors.push(e.message));
  const group=groups[index],invite=invites.find((v:any)=>v.group_name===group.group_name),button=(name:string)=>page.getByRole('button',{name,exact:true});
  if(index===0){await page.goto(base+'/lobby?pin='+invite.short_pin);}else await page.goto(base+'/join?'+new URLSearchParams({room:room.id,group:group.group_name})+'#'+new URLSearchParams({code:invite.code}));
  await page.getByLabel('학생 번호 (1~99)',{exact:true}).fill(String(index+71));await page.getByLabel('별명 (2~12자)',{exact:true}).fill('흐름검증'+index);await page.getByRole('button',{name:/우리 모둠으로 입장|참여하기/}).click();await page.waitForURL('**/mobile/**');
  if(index===0){must(await db.from('game_rooms').update({status:'playing',started_at:new Date().toISOString()}).eq('id',room.id));await page.reload();await button('게임 시작 →').waitFor();must(await db.from('game_rooms').update({status:'paused',started_at:null}).eq('id',room.id));await page.reload();await page.getByText('수업 일시 정지',{exact:true}).waitFor();must(await db.from('game_rooms').update({status:'playing',started_at:new Date().toISOString()}).eq('id',room.id));await page.reload();}
  await button('게임 시작 →').click();await page.clock.install();await button('활동 시작').click();await button('기본 활동 시작').click();await button('작전 살펴보기').click();
  const select=async(r:number)=>{const plan=makeQuestRound('zigzag',r,{gentle:true,seated:false,practice:true,players:3});const c=plan.choices.find(c=>!c.path||safeRoute(c.path,plan.blocked!))!;await page.getByRole('button',{name:new RegExp('^'+c.label)}).click();};
  const advance=async()=>{await page.clock.runFor(250);await page.clock.fastForward(3100);await page.locator('[data-phase="active"]').waitFor();await page.clock.runFor(250);await page.clock.fastForward(50000);await page.locator('[data-phase="record"]').waitFor();};
  await select(0);await button('동작 연습하기').click();await advance();assert.equal(must(await db.from('room_groups').select('score').eq('id',group.id).single()).score,0);await button('연습 마치고 첫 작전으로').click();for(let r=0;r<3;r++){await select(r);await button('기기 놓고 작전 시작').click();await advance();await button(`달성했어요 · ${r===2?'원정 마치기':'다음 작전'}`).click();}
  await page.locator('.game-result-overlay').waitFor();await page.clock.runFor(1000);await button('모둠으로').click();await page.locator('fieldset button').first().waitFor();await page.locator('fieldset button').first().click();await page.clock.runFor(1000);await page.getByText('선생님 화면에 저장했어요.',{exact:true}).waitFor();
  const saved=must(await db.from('room_groups').select('score,completed_missions,stats').eq('id',group.id).single());assert.equal(saved.score,300);assert(saved.completed_missions.includes(missionId));assert(saved.stats.guided_reflections[missionId]);await page.reload();await button('다시 도전하기 →').waitFor();assert.equal(must(await db.from('room_groups').select('score').eq('id',group.id).single()).score,300);await page.screenshot({path:path.join(out,'student-'+width+'.png'),fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));report.cases.push({width,status:'pass',join:index===0?'PIN':'QR',score:300,completed:true,reflectionSaved:true,reloadDidNotDuplicate:true});console.log('PASS live student journey',width);await context.close();
 }
 must(await db.from('game_rooms').update({status:'finished',started_at:null}).eq('id',room.id));assert.deepEqual(report.errors,[]);
}finally{
 if(browser)await browser.close();if(room){must(await db.from('game_rooms').delete().eq('id',room.id));must(await db.from('mission_templates').delete().eq('id',room.template_id));report.cleanup=true;}await db.rpc('logout_classroom');await db.auth.signOut({scope:'local'});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({...report,scope:'real production student UI → anonymous Auth → PostgREST/RPC → persisted score/completion/reflection; teacher fixture setup uses short management authorization'},null,2));
}
