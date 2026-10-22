import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { makeQuestRound, QUEST_IDS, QUEST_META, safeRoute } from '../src/domain/movementQuests';
import type { QuestId } from '../src/domain/movementQuests';

const base=process.argv[2]||'http://127.0.0.1:5173';
const ids=(process.argv[3]?.split(',')||[...QUEST_IDS]) as QuestId[];
const out=path.resolve(process.env.TEST_OUTPUT_DIR||'test-results/quest-rollout');mkdirSync(out,{recursive:true});
const report:{base:string;cases:unknown[];errors:string[];writes:string[]}={base,cases:[],errors:[],writes:[]};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const width of (process.env.TEST_WIDTHS?.split(',').map(Number)||[390,1024])){
  const context=await browser.newContext({viewport:{width,height:width===390?844:768},hasTouch:true,reducedMotion:'reduce'});
  await context.route('**/*',route=>{
   const r=route.request(),u=new URL(r.url());
   if((u.hostname.endsWith('.supabase.co')||u.pathname.startsWith('/api/'))&&!['GET','HEAD','OPTIONS'].includes(r.method())){report.writes.push(u.pathname);return route.abort();}
   return route.continue();
  });
  for(const id of ids){
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push(id+': '+e.message));
   await page.clock.install();
   const phase=(p:string)=>page.locator(`[data-quest][data-phase="${p}"]`).waitFor();
   const button=(name:string)=>page.getByRole('button',{name,exact:true});
   const tick=async()=>{await page.clock.runFor(250);await page.waitForFunction(()=>Number(document.querySelector('[data-quest]')?.getAttribute('data-active-ms'))>0);};
   const finish=async(practice:boolean)=>{
    let answer:string[]=[];
    const ph=await page.locator('[data-quest]').getAttribute('data-phase');
    if(ph==='preview'){
     answer=(await page.locator('.mq-signal strong').innerText()).split(' → ');
     await tick();await page.clock.fastForward(10000);await phase('countdown');
    }
    await tick();await page.clock.fastForward(3100);await phase('active');await tick();
    if(id==='stopwatch'&&!practice){
     const target=Number((await page.locator('.mq-signal p').innerText()).match(/(\d+)초/)![1]);
     const active=Number(await page.locator('[data-quest]').getAttribute('data-active-ms'));
     await page.clock.fastForward(Math.max(0,target*1000-active));await button('목표 시간이 된 것 같아요').click();
    }else await page.clock.fastForward(300000);
    await phase('record');return answer;
   };
   try{
    const response=await page.goto(base+'/solo/play/'+id,{waitUntil:'networkidle'});assert.equal(response?.status(),200);
    await button('활동 시작').click();await phase('intro');
    assert.equal(await page.locator('.mq-heading h1').innerText(),QUEST_META[id].name);
    if(width===1024)await page.getByLabel('앉아서 팔 동작으로 참여하기').check();
    await button('작전 살펴보기').click();
    const choose=async(round:number)=>{
     const plan=makeQuestRound(id,round,{gentle:true,seated:width===1024,practice:true,players:3});
     const c=plan.choices.find(c=>(!plan.decision||c.id===plan.decision.answer)&&(!c.path||safeRoute(c.path,plan.blocked!)))!;
     if(plan.decision&&round===0){
      const wrong=plan.choices.find(c=>c.id!==plan.decision!.answer)!;
      await page.getByRole('button',{name:new RegExp('^'+wrong.label)}).click();
      assert(await page.locator('.mq-primary').isDisabled());await page.getByRole('alert').waitFor();
     }
     await page.getByRole('button',{name:new RegExp('^'+c.label)}).click();
    };
    await choose(0);await button('동작 연습하기').click();await finish(true);
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('physical_player_profile')),null);
    await button('연습 마치고 첫 작전으로').click();
    for(let round=0;round<3;round++){
     await phase('plan');await choose(round);await button('기기 놓고 작전 시작').click();
     const answer=await finish(false);
     assert.equal(await page.evaluate(()=>sessionStorage.getItem('physical_player_profile')),null,'no auto award');
     for(const value of answer)await button(value).click();
     const reflection=makeQuestRound(id,round,{gentle:true,seated:width===1024,practice:true,players:3}).reflection;
     if(reflection&&width===390)await button(reflection.options[0]).click();
     await button(`달성했어요 · ${round===2?'원정 마치기':'다음 작전'}`).click();
    }
    await page.locator('.game-result-overlay').waitFor();
    const profile=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('physical_player_profile')!));
    assert.equal(profile.totalPlays,1);assert.equal(profile.recentGames[0].score,300);assert.equal(profile.recentGames[0].gameType,id);
    if(makeQuestRound(id,0,{gentle:true,seated:false,practice:true,players:3}).reflection){if(width===390)assert(profile.recentGames[0].details.metrics['느낌 돌아보기']);else assert(!profile.recentGames[0].details.metrics['느낌 돌아보기']);}
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(width===390)await page.screenshot({path:path.join(out,id+'-result.png'),fullPage:true});
    await button('다시 하기').click();await button('활동 시작').click();await phase('intro');
    assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('physical_player_profile')!).totalPlays),1);
    report.cases.push({id,width,status:'pass'});console.log('PASS',id,width);
   }catch(e){await page.screenshot({path:path.join(out,id+'-failure.png'),fullPage:true});throw e;}
   finally{await page.close();}
  }
  await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.writes,[]);
 writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.cases.length}));
}finally{await browser.close();}
