import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
if (process.env.CLASSROOM_LIVE_TEST !== '1') throw new Error('Explicit CLASSROOM_LIVE_TEST=1 is required for isolated live fixtures.');
const base = process.env.AUDIT_URL || 'https://physical-pi.vercel.app';
const out = process.env.AUDIT_OUTPUT || 'test-results/concurrency';
fs.mkdirSync(out,{recursive:true});
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(s=>s.includes('=')).map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1).replace(/^['"]|['"]$/g,'')]}));
assert.equal(new URL(env.VITE_SUPABASE_URL).hostname,'tjrrtgdhtjdkofwqnxnz.supabase.co');
const db=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
const must = r=>{if(r.error)throw new Error(r.error.code+': '+r.error.message);return r.data;};
const summary = values=>{const sorted=[...values].sort((a,b)=>a-b);return {minMs:Math.round(sorted[0]),medianMs:Math.round(sorted[Math.floor(sorted.length/2)]),p95Ms:Math.round(sorted[Math.ceil(sorted.length*.95)-1]),maxMs:Math.round(sorted.at(-1))};};
const report={base,users:20,started:new Date().toISOString(),cases:[],errors:[],httpErrors:[],cleanup:false};
let browser,template,room;
const clients=[];
try {
  for (const route of ['/','/hub']) {
    const timings=await Promise.all(Array.from({length:20},async()=>{const start=performance.now();const r=await fetch(base+route);assert.equal(r.status,200);await r.text();return performance.now()-start;}));
    report.cases.push({test:'20 simultaneous HTTP visits',route,...summary(timings)});
  }
  template=must(await db.from('mission_templates').insert({name:'Codex isolated 20-user audit '+Date.now(),buttons:[{id:'load-test',title:'동시 접속 검증 미션',amount:10,cooldown:1,desc:'Generated test fixture',iconName:'Activity',color:'text-cyan-700',bg:'bg-cyan-50'}]}).select('id').single());
  for (let i=0;i<20;i++) {
    const r=await db.from('game_rooms').insert({name:'Codex isolated 20-user audit',pin_code:String(Math.floor(1000+Math.random()*9000)),template_id:template.id,status:'playing',started_at:new Date().toISOString(),global_time_modifier:1800}).select('id,pin_code').single();
    if(r.error?.code==='23505')continue;room=must(r);break;
  }
  assert(room);
  const groups=must(await db.from('room_groups').insert([1,2,3,4].map(n=>({room_id:room.id,group_name:`${n}모둠`}))).select('id,group_name'));
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  await Promise.all(Array.from({length:20},async(_,i)=>{
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await context.addInitScript(()=>localStorage.setItem('physical_background_music_v1','off'));
    const page=await context.newPage();
    const client={context,page,index:i,readRequests:0,readsByTable:{},joinMs:0,hubMs:0};clients.push(client);
    page.on('pageerror',e=>report.errors.push({client:i,error:e.message}));
    page.on('request',r=>{if(r.method()==='GET' && r.url().includes('/rest/v1/')) {client.readRequests++;const table=new URL(r.url()).pathname.split('/').at(-1);client.readsByTable[table]=(client.readsByTable[table]||0)+1;}});
    page.on('response',r=>{if(r.status()>=400&&r.url().includes('supabase.co'))report.httpErrors.push({client:i,status:r.status(),path:new URL(r.url()).pathname});});
    const hubStart=performance.now();
    await page.goto(base+'/hub',{waitUntil:'domcontentloaded'});
    await page.getByRole('searchbox',{name:'게임 검색'}).waitFor({timeout:60000});
    client.hubMs=performance.now()-hubStart;
    await page.getByRole('searchbox').fill('스탑워치');
    assert.equal(await page.locator('[data-game-card]').count(),1);
    await page.goto(base+'/lobby',{waitUntil:'domcontentloaded'});
    await page.getByPlaceholder('예: 1234').fill(room.pin_code);
    await page.getByPlaceholder('예: 홍길동').fill(`검증${i+1}`);
    await page.locator('select').selectOption(`${i%4+1}모둠`);
    client.start=performance.now();
  }));
  report.cases.push({test:'20 independent mobile browsers load interactive hub',...summary(clients.map(c=>c.hubMs))});
  // Begin all 20 joins together after every client has loaded the form.
  await Promise.all(clients.map(async client=>{
    const start=performance.now();
    await client.page.getByRole('button',{name:'입장하기',exact:true}).tap();
    await client.page.getByRole('button').filter({hasText:'동시 접속 검증 미션'}).waitFor({timeout:60000});
    client.joinMs=performance.now()-start;
  }));
  report.cases.push({test:'20 independent mobile browsers join a real classroom',...summary(clients.map(c=>c.joinMs))});
  await new Promise(r=>setTimeout(r,3000));
  const snapshots=clients.map(c=>c.readRequests);
  const start=performance.now();
  await Promise.all(clients.map(c=>c.page.getByRole('button').filter({hasText:'동시 접속 검증 미션'}).tap()));
  let finalGroups;
  const end=Date.now()+45000;
  do {finalGroups=must(await db.from('room_groups').select('score').eq('room_id',room.id));if(finalGroups.every(g=>g.score===50))break;await new Promise(r=>setTimeout(r,250));}while(Date.now()<end);
  assert(finalGroups.every(g=>g.score===50),'20 actions must award 200 total with no lost increments');
  report.cases.push({test:'20 simultaneous mission completions',saveMs:Math.round(performance.now()-start),totalScore:finalGroups.reduce((n,g)=>n+g.score,0)});
  await new Promise(r=>setTimeout(r,3500));
  report.cases.push({test:'read requests during 20 mission burst',requests:clients.reduce((n,c,i)=>n+c.readRequests-snapshots[i],0)});
  const pauseStart=performance.now();
  must(await db.from('game_rooms').update({status:'paused',started_at:null}).eq('id',room.id));
  const propagation=await Promise.all(clients.map(async c=>{await c.page.getByText('수업 일시 정지',{exact:true}).waitFor({timeout:20000});return performance.now()-pauseStart;}));
  report.cases.push({test:'teacher pause reaches all 20 browsers',...summary(propagation)});
  await clients[0].page.screenshot({path:`${out}/student-20-users.png`});
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);
  report.passed=true;
} catch(e) {report.passed=false;report.failure=e.message;process.exitCode=1;} finally {
  if(browser)await browser.close();
  if(room)must(await db.from('game_rooms').delete().eq('id',room.id));
  if(template)must(await db.from('mission_templates').delete().eq('id',template.id));
  report.cleanup=true;report.finished=new Date().toISOString();
  fs.writeFileSync(`${out}/results.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}
