import {chromium,type Page} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {makeQuestRound,safeRoute} from '../src/domain/movementQuests';
// Browser → request → response contract tests. All classroom/Auth responses are
// isolated fixtures; this script never writes to the operational database.
const base=process.argv[2]||'http://127.0.0.1:4173',out=path.resolve(process.env.TEST_OUTPUT_DIR||'../../outputs/journeys/classroom-local');fs.mkdirSync(out,{recursive:true});
if(!new URL(base).hostname.match(/^(127\.0\.0\.1|localhost)$/))throw Error('Fixture authentication is only allowed on loopback.');
const browser=await chromium.launch({channel:'chrome',headless:true}),report:{cases:unknown[];errors:string[];unhandled:string[]}={cases:[],errors:[],unhandled:[]};
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
try{for(const teacherWidth of [390,1440]){
 const studentWidth=teacherWidth===390?1440:390,roomId=randomUUID(),groupId=randomUUID(),teacherId=randomUUID(),templateId=randomUUID(),missionId=randomUUID();
 let created=false,scoreCalls=0;const actions=new Set<string>();
 const room:any={id:roomId,name:'갈림길 보급 작전',teacher_id:teacherId,status:'waiting',pin_code:'12345678',template_id:templateId,global_time_modifier:2100,setup_minutes:40,goal_percent:75,created_at:new Date().toISOString(),started_at:null};
 const group:any={id:groupId,room_id:roomId,group_name:'1모둠',score:0,completed_missions:[],pending_missions:[],stats:{}};
 const template={id:templateId,name:room.name,buttons:[{id:missionId,gameType:'zigzag',title:room.name+' 활동 완료',desc:'게임을 마치고 결과를 확인해요.',requires_approval:true,amount:10,cooldown:0}]};
 const roster:any[]=[];
 const contexts=await Promise.all([teacherWidth,studentWidth].map(width=>browser.newContext({viewport:{width,height:900},hasTouch:width<700,reducedMotion:'reduce'})));
 for(const context of contexts){
  await context.route('**/api/teacher?**',async route=>route.fulfill({json:new URL(route.request().url()).searchParams.get('action')==='status'?{authenticated:true,configured:true,aiReady:false,localSetup:false}:{authorized:true}}));
  await context.route('**/*.supabase.co/**',async route=>{
   const req=route.request(),u=new URL(req.url()),body=req.postDataJSON()||{},headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS'};
   const reply=(json:any,status=200)=>route.fulfill({json,status,headers});if(req.method()==='OPTIONS')return reply({});
   if(u.pathname.startsWith('/auth/')){const user={id:teacherId,aud:'authenticated',role:'authenticated',email:'',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};const token=['e30',Buffer.from(JSON.stringify({sub:teacherId,exp:Math.floor(Date.now()/1000)+86400})).toString('base64url'),'fixture'].join('.');return reply(u.pathname.endsWith('/user')?user:{access_token:token,refresh_token:'fixture',token_type:'bearer',expires_in:86400,expires_at:Math.floor(Date.now()/1000)+86400,user});}
   if(u.pathname.includes('/rpc/')){const rpc=u.pathname.split('/').at(-1);
    if(rpc==='create_guided_classroom'){assert.equal(body.game_type,'zigzag');assert.equal(body.group_count,1);assert.equal(body.lesson_minutes,40);created=true;return reply(room);}
    if(rpc==='get_classroom_invites')return reply([{group_name:'1모둠',code:'fixture',short_pin:'2468'}]);
    if(rpc==='get_classroom_device_codes')return reply({board_code:'fixture-board',recovery_code:'fixture-recovery'});
    if(rpc==='get_classroom_roster')return reply(roster);
    if(rpc==='join_classroom_short_pin_profile'||rpc==='join_classroom_invite_profile'){if(body.entry_pin&&body.entry_pin!=='2468')return reply({error:'invalid_pin'});roster.push({group_id:groupId,student_number:body.student_number,nickname:body.nickname});return reply({room_id:roomId,group_id:groupId,group_name:'1모둠'});}
    if(rpc==='get_my_classroom_profile')return reply(roster[0]||null);
    if(rpc==='set_classroom_help'){group.help_requested_at=body.requesting?new Date().toISOString():null;return reply(true);}
    if(rpc==='increment_classroom_score'){scoreCalls++;if(!actions.has(body.action_id)){actions.add(body.action_id);group.score+=body.amount;}return reply(true);}
    if(rpc==='save_guided_reflection'){group.stats.guided_reflections={[missionId]:body.choice};return reply(true);}
    if(rpc==='submit_classroom_mission'){group.completed_missions=[missionId];return reply(true);}
    report.unhandled.push(rpc||'unknown');return reply(false,400);
   }
   const table=u.pathname.split('/').at(-1);if(req.method()==='PATCH'){const target=table==='game_rooms'?room:group;Object.assign(target,body);return reply([target]);}
   if(table==='game_rooms')return reply(u.searchParams.has('id')?room:created?[room]:[]);
   if(table==='room_groups')return reply(u.searchParams.has('id')?{completed_missions:group.completed_missions}:[group]);
   if(table==='mission_templates')return reply(u.searchParams.has('id')?template:[template]);
   report.unhandled.push(u.pathname);return reply(null,400);
  });
  await context.routeWebSocket('**/realtime/**',ws=>{ws.onMessage(data=>{try{const m=JSON.parse(String(data));if(m.event==='phx_join'||m.event==='heartbeat')ws.send(JSON.stringify({...m,event:'phx_reply',payload:{status:'ok',response:{postgres_changes:[]}}}));}catch{/* Non-JSON WebSocket heartbeat. */}});});
 }
 const teacher=await contexts[0].newPage(),student=await contexts[1].newPage();for(const p of [teacher,student]){p.setDefaultTimeout(12000);p.on('pageerror',e=>report.errors.push(e.message));}
 await teacher.goto(base+'/');await teacher.locator('a[href="/teacher"]').click();await teacher.getByRole('link',{name:/^수업 준비 시작/}).click();await teacher.getByRole('searchbox').fill('갈림길');await teacher.locator('[data-game-card="zigzag"]').getByRole('button',{name:'이 활동 선택',exact:true}).click();await teacher.getByLabel(/^모둠 수/).selectOption('1');await teacher.getByLabel('활동 시간 (분)',{exact:true}).fill('0');assert(await button(teacher,'참여 안내 준비').isDisabled());await teacher.getByLabel('활동 시간 (분)',{exact:true}).fill('40');await button(teacher,'참여 안내 준비').click();assert(await button(teacher,'수업방 만들고 참여 QR 보기').isDisabled());await teacher.getByRole('checkbox').check();await button(teacher,'수업방 만들고 참여 QR 보기').click();await teacher.getByRole('img',{name:'1모둠 입장 QR',exact:true}).waitFor();
 await student.goto(base+'/lobby?pin=2468');await student.getByLabel('학생 번호 (1~99)',{exact:true}).fill('12');await student.getByLabel('별명 (2~12자)',{exact:true}).fill('검증대원');await button(student,'우리 모둠으로 입장').click();await student.waitForURL('**/mobile/**');await student.getByText(/선생님/).first().waitFor();
 await button(teacher,'수업 시작').click();await student.reload();await button(student,'게임 시작 →').waitFor();await button(student,'🙋 선생님, 도움이 필요해요').click();assert(group.help_requested_at);await teacher.reload();await button(teacher,'도움 완료').click();assert.equal(group.help_requested_at,null);
 await button(teacher,'일시정지').click();await student.reload();await student.getByText('수업 일시 정지',{exact:true}).waitFor();await button(teacher,'수업 이어가기').click();await student.reload();await button(student,'게임 시작 →').click();await student.clock.install();await button(student,'활동 시작').click();await button(student,'기본 활동 시작').click();await button(student,'작전 살펴보기').click();
 const select=async(r:number)=>{const plan=makeQuestRound('zigzag',r,{gentle:true,seated:false,practice:true,players:3});const c=plan.choices.find(c=>!c.path||safeRoute(c.path,plan.blocked!))!;await student.getByRole('button',{name:new RegExp('^'+c.label)}).click();};
 const run=async()=>{await student.clock.runFor(250);await student.clock.fastForward(3100);await student.locator('[data-phase="active"]').waitFor();await student.clock.runFor(250);await student.clock.fastForward(50000);await student.locator('[data-phase="record"]').waitFor();};
 await select(0);await button(student,'동작 연습하기').click();await run();assert.equal(group.score,0);await button(student,'연습 마치고 첫 작전으로').click();for(let r=0;r<3;r++){await select(r);await button(student,'기기 놓고 작전 시작').click();await run();await button(student,`달성했어요 · ${r===2?'원정 마치기':'다음 작전'}`).click();}
 await student.locator('.game-result-overlay').waitFor();await student.clock.runFor(1000);await button(student,'모둠으로').click();const choices=student.locator('fieldset button');await choices.first().waitFor();await choices.first().click();await student.clock.runFor(1000);await student.getByText('선생님 화면에 저장했어요.',{exact:true}).waitFor();assert.equal(group.score,300);assert.equal(scoreCalls,1);assert.deepEqual(group.completed_missions,[missionId]);
 await button(student,'내 활동 기록 확인').click();await student.locator('[data-game-record="zigzag"]').waitFor();await student.getByRole('link',{name:'모둠으로',exact:true}).click();await button(student,'다시 도전하기 →').waitFor();assert.equal(scoreCalls,1);await teacher.reload();await teacher.getByText('등록된 모둠 1개 · 완료 모둠 1개',{exact:true}).waitFor();await teacher.locator('summary').filter({hasText:'모둠별 오늘의 회고'}).click();await teacher.getByText('아직 응답 없음',{exact:true}).waitFor({state:'hidden'});await teacher.locator('summary').filter({hasText:'모둠 점수와 추가 도구'}).click();await button(teacher,'수업 종료하기').click();await button(teacher,'수업 종료 확정').click();await teacher.getByRole('heading',{name:'오늘 수업 한눈에',exact:true}).waitFor();await teacher.screenshot({path:path.join(out,'teacher-'+teacherWidth+'.png'),fullPage:true});await student.reload();await student.getByRole('button',{name:'처음으로 돌아가기',exact:true}).waitFor();await student.getByText('오늘 수업이 끝났어요. 선생님의 마무리 안내를 들어요.',{exact:true}).waitFor();await button(student,'내 활동 기록 확인').click();await student.locator('[data-game-record="zigzag"]').waitFor();await student.getByRole('link',{name:'모둠으로',exact:true}).click();await button(student,'처음으로 돌아가기').waitFor();assert.equal(group.score,300);assert(await teacher.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert(await student.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await teacher.goto(base+'/teacher/setup?game=zigzag');await teacher.getByLabel(/^모둠 수/).waitFor();assert.equal(await teacher.getByRole('searchbox').count(),0);report.cases.push({teacherWidth,studentWidth,status:'pass',score:group.score,scoreCalls,flow:'search → prepare/validate → PIN → wait → help → pause/resume → practice → complete → group return → reflection → teacher results → end'});for(const c of contexts)await c.close();console.log('PASS classroom fixture journey',teacherWidth,studentWidth);
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.unhandled,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({...report,boundary:'isolated API fixtures; no live database writes'},null,2));
}finally{await browser.close();}
