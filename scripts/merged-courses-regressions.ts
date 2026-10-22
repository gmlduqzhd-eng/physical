import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {MERGED_GAMES} from '../src/domain/gameLifecycle';
import {makeMergedMovementRound,MERGED_MOVEMENT_IDS} from '../src/domain/mergedMovementVariants';
import {EXPRESSION_GAMES} from '../src/presentation/components/minigames/expression/expressionGamesData';
const base=process.argv[2]||'http://127.0.0.1:4173',out=path.resolve(process.env.TEST_OUTPUT_DIR||'test-results/merged-courses');mkdirSync(out,{recursive:true});
const report:{base:string;cases:unknown[];errors:string[];writes:string[]}={base,cases:[],errors:[],writes:[]};
const subset=process.env.MERGED_IDS?.split(',');
const games=MERGED_GAMES.filter(g=>g.stage===2&&(!subset||subset.includes(g.id)));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(let n=0;n<games.length;n++){
 const g=games[n],width=n%2?1024:390,seated=width===1024,context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(g.id+': '+e.message));
 await context.addInitScript(({id,name})=>{sessionStorage.setItem('physical_private_expires',String(Date.now()+8*60*60*1000));localStorage.setItem('physical_best_'+id,'9999');sessionStorage.setItem('physical_player_profile',JSON.stringify({nickname:'기존 활동 보존',totalScore:42,totalPlays:2,createdAt:1,highScores:{[id]:9999},playCounts:{[id]:2},recentGames:[{gameType:id,gameName:name,score:42,playedAt:1,rpe:4}]}));},{id:g.id,name:g.name});
 await page.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if((u.hostname.endsWith('.supabase.co')||u.pathname.startsWith('/api/'))&&!['GET','HEAD','OPTIONS'].includes(r.method())){report.writes.push(u.pathname);return route.abort();}return route.continue();});
 const button=(name:string)=>page.getByRole('button',{name,exact:true}),advance=async(ms:number)=>{await page.clock.runFor(200);await page.clock.fastForward(ms);};
 try{
  await page.clock.install();await page.goto(base+'/solo/play/'+g.id,{waitUntil:'domcontentloaded'});await button('활동 시작').click();
  const movement=MERGED_MOVEMENT_IDS.includes(g.id);
  if(movement){
   const settings={gentle:true,seated,practice:true,players:2};
   await page.locator(`[data-movement-variant="${g.id}"][data-phase="intro"]`).waitFor();if(seated)await page.getByLabel('앉아서 팔 동작으로 참여하기').check();
   await button('작전 살펴보기').click();
   const choose=async()=>page.getByRole('button',{name:/^가까운 범위/}).click();
   const phase=(p:string)=>page.locator(`[data-movement-variant][data-phase="${p}"]`).waitFor();
   const finish=async()=>{if(await page.locator('[data-phase="preview"]').count()){await advance(7500);await phase('countdown');}await advance(3500);await phase('active');await advance(100000);await phase('record');};
   await choose();await button('동작 연습하기').click();await finish();assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('physical_player_profile')!).totalPlays),2);await button('연습 마치고 첫 작전으로').click();
   for(let round=0;round<3;round++){
    await choose();await button('기기 놓고 작전 시작').click();await finish();
    const p=makeMergedMovementRound(g.id,round,settings,'close');
    if(p.question){await button(`달성했어요 · ${round===2?'원정 마치기':'다음 작전'}`).click();await page.getByRole('alert').waitFor();for(const answer of p.question.answer)await button(answer).click();}
    await button(`달성했어요 · ${round===2?'원정 마치기':'다음 작전'}`).click();
   }
  }else{
   const expression=EXPRESSION_GAMES.find(e=>e.id===g.id)!;assert(expression);
   for(let i=0;i<4;i++)await advance(1000);
   for(const step of expression.steps){assert(step.title);await advance(1000);await page.getByRole('button',{name:/다음 단계|활동 마치고 평가하기/}).click();}
   const done=page.getByRole('button',{name:/평가 완료 및 활동 결과 보기/});assert(await done.isDisabled());
   for(const rating of await page.getByRole('button',{name:/ 5점$/}).all())await rating.click();await done.click();
  }
  await page.locator('.game-result-overlay').waitFor();
  const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('physical_player_profile')!));assert.equal(saved.totalPlays,3);assert.equal(saved.recentGames[0].gameType,g.target);assert.equal(saved.recentGames[0].details.course.sourceId,g.id);assert.equal(saved.recentGames[0].score,movement?300:100);assert.equal(saved.recentGames[1].gameType,g.id);assert.equal(saved.recentGames[1].gameName,g.name);assert.equal(saved.recentGames[1].score,42);assert.equal(saved.recentGames[1].rpe,4);assert.equal(saved.highScores[g.id],9999);assert.equal(saved.highScores[`${g.target}::variant::${g.id}`],movement?300:100);assert.equal(saved.playCounts[g.id],2);assert.equal(await page.evaluate(id=>localStorage.getItem('physical_best_'+id),g.id),'9999');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(n%10===0)await page.screenshot({path:path.join(out,g.id+'.png'),fullPage:true,timeout:15000});
  await button('다시 하기').click();await button('활동 시작').click();assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('physical_player_profile')!).totalPlays),3);
  report.cases.push({id:g.id,target:g.target,width,status:'pass',historyPreserved:true});console.log('PASS',g.id);
 }catch(e){await page.screenshot({path:path.join(out,g.id+'-failure.png'),fullPage:true,timeout:15000}).catch(()=>{});writeFileSync(path.join(out,'partial-report.json'),JSON.stringify(report,null,2));throw e;}finally{await context.close();}
 }assert.deepEqual(report.errors,[]);assert.deepEqual(report.writes,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.cases.length}));}finally{await browser.close();}
