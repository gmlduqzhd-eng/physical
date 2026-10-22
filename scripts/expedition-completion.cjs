const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
require('tsx/cjs');
const {EXPEDITION_GAMES}=require('../src/domain/expeditionGames.ts');
const {getMergedGame}=require('../src/domain/gameLifecycle.ts');
const {isRevampedExpedition}=require('../src/domain/expeditionRevamps.ts');
const {createExpeditionRound}=require('../src/domain/expeditionRules.ts');
const {EXPRESSION_GAMES}=require('../src/presentation/components/minigames/expression/expressionGamesData.ts');
const base=process.env.AUDIT_URL||'http://127.0.0.1:5175',engine=process.env.BROWSER_ENGINE==='webkit'?webkit:chromium;
const out=path.resolve(process.env.AUDIT_OUTPUT||'test-results/expedition-completion');fs.mkdirSync(out,{recursive:true});
const subset=process.env.SPECS?process.env.SPECS.split(','):undefined;
const games=EXPEDITION_GAMES.filter(g=>!subset||subset.includes(g.spec));
const report={base,engine:engine.name(),scope:'UI completion with virtual time; manual entries are fixtures, not proof of physical activity.',cases:[]};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const browser=await engine.launch({headless:true,...(engine===chromium?{channel:process.env.BROWSER_CHANNEL||'chrome'}:{})});
 try{for(const game of games){
  const viewport=process.env.AUDIT_VIEWPORT?{width:Number(process.env.AUDIT_VIEWPORT.split('x')[0]),height:Number(process.env.AUDIT_VIEWPORT.split('x')[1])}:game.spec[0]==='S'?{width:320,height:568}:{width:1024,height:768};
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true});const page=await context.newPage();page.setDefaultTimeout(3000);
  const item={spec:game.spec,id:game.id,kind:game.kind,viewport,status:'running',errors:[],serverCalls:[]};
  page.on('pageerror',e=>item.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/Cannot update|Maximum update|Too many re-renders|Uncaught/.test(m.text()))item.errors.push(m.text());});
  await page.route('**/*.supabase.co/**',route=>{item.serverCalls.push(route.request().url());return route.fulfill({status:503,body:'{}'});});
  const advance=async ms=>{if(process.env.FAST_CLOCK==='1'&&engine===chromium)await page.clock.fastForward(ms);else await page.clock.runFor(ms);await sleep(25);};
  const tap=async locator=>{await locator.evaluate(e=>e.scrollIntoView({block:'center'}));await locator.tap({timeout:2500});await sleep(30);};
  const layout=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');
  try{
   await page.clock.install();await page.goto(base+'/solo/play/'+game.id,{waitUntil:'domcontentloaded'});
   await page.getByRole('button',{name:'활동 시작',exact:true}).waitFor({timeout:15000});await page.clock.pauseAt(await page.evaluate(()=>new Date(Date.now()+1000).toISOString()));await tap(page.getByRole('button',{name:'활동 시작',exact:true}));if(await page.getByRole('button',{name:'기본 활동 시작',exact:true}).count())await tap(page.getByRole('button',{name:'기본 활동 시작',exact:true}));
   if(game.kind==='A'){
    await tap(page.getByRole('button',{name:/준비 완료/}));
    for(const step of EXPRESSION_GAMES.find(g=>g.id===game.id).steps){await advance(1000);await tap(page.locator('.gameplay-content').getByRole('button',{name:/다음 단계|활동 마치고 평가하기/}));}
    for(const rating of await page.getByRole('button',{name:/ 3점$/}).all())await tap(rating);
    await layout();await tap(page.getByRole('button',{name:/평가 완료 및 활동 결과 보기/}));
   }else{
    await page.locator('[data-phase="ready"]').waitFor();await page.evaluate(()=>{Math.random=()=>.42;});
    const players=Number(process.env.PARTICIPANTS)||game.players;
    if(players!==game.players)await page.getByRole('combobox',{name:'참여 인원',exact:true}).selectOption(String(players));
    await tap(page.getByRole('button',{name:'원정 시작',exact:true}));
    const revamped=isRevampedExpedition(game.id);
    if(revamped){
     await page.getByRole('heading',{name:'먼저 8초만 연습해요',exact:true}).waitFor();
     await tap(page.getByRole('button',{name:'점수 없는 연습 시작',exact:true}));
     await advance(1000);await advance(5000);await advance(8000);
     for(let grace=0;grace<3&&!(await page.getByRole('button',{name:'첫 작전 시작',exact:true}).count());grace++)await advance(2000);
     assert.equal(await page.locator('.game-result-overlay').count(),0,'rehearsal cannot score');
     await tap(page.getByRole('button',{name:'첫 작전 시작',exact:true}));
    }
    for(let r=0;r<game.rounds;r++){
     const plan=createExpeditionRound(game,r,players,()=>.42);
     const prefix=plan.secret?5:3;for(let s=0;s<prefix;s++)await advance(1000);
     await page.locator('[data-phase="active"]').waitFor();await layout();
     if(process.env.CAPTURE_STAGES==='1'&&r===0)await page.screenshot({path:path.join(out,game.spec+'-active.png'),fullPage:true});
     if(plan.secret)assert.equal(await page.locator('.expedition-pattern').count(),0,'memory cues are hidden during activity');
     if(plan.timing==='estimate'){await advance(plan.targetSeconds*1000);await tap(page.getByRole('button',{name:'지금 끝내기',exact:true}));}
     else if(plan.timing==='lap'){await advance(12000);await tap(page.getByRole('button',{name:'왕복 도착 기록',exact:true}));}
     else if(plan.timing==='arrival'){await advance(12000);for(let i=1;i<=players;i++)await tap(page.getByRole('button',{name:i+'번 도착 확인',exact:true}));}
     else for(const step of plan.steps)await advance(step.seconds*1000);
     // Browser task/effect scheduling can start an interval just after the final
     // virtual tick. Allow bounded clock ticks, never invoke a completion hook.
     for(let grace=0;grace<3&&await page.locator('[data-phase="active"]').count();grace++)await advance(1000);
     await page.locator('[data-phase="record"]').waitFor();await layout();
     if(process.env.CAPTURE_STAGES==='1'&&r===0)await page.screenshot({path:path.join(out,game.spec+'-record.png'),fullPage:true});
     if(revamped)await tap(page.getByText('세부 기록 직접 입력 · 일부 성공도 기록',{exact:true}));
     const finish=page.getByRole('button',{name:r+1<game.rounds?'기록하고 다음 라운드':'기록하고 원정 마치기',exact:true});
     await tap(finish);await page.getByRole('alert').waitFor();assert.equal(await page.locator('.game-result-overlay').count(),0,'timer alone cannot submit a result');
     let answer=plan.allocation?plan.allocation.counts.map(String):plan.kind==='unique'?plan.question.options.slice(0,players):plan.kind==='choice'?[plan.question.options[0]]:plan.question?.answer||[];
     if(plan.question){for(const value of answer)await tap(page.locator('.expedition-record').getByRole('button',{name:value,exact:true}));}
     if(plan.secret)await tap(page.getByRole('button',{name:'정답 확인',exact:true}));
     if(plan.allocation)for(let i=0;i<answer.length;i++)await page.getByRole('spinbutton',{name:plan.allocation.labels[i]+' 인원',exact:true}).fill(answer[i]);
     for(const target of plan.targets)await page.getByRole('spinbutton',{name:target.label,exact:true}).fill(String(target.goal));
     for(let i=1;i<=players;i++)await tap(page.getByRole('button',{name:i+'번 확인 전',exact:true}));
     for(const checkbox of await page.locator('.expedition-check input').all())await checkbox.check();
     if(revamped&&r>0)await tap(page.getByRole('button',{name:'모든 목표와 역할을 직접 확인했어요',exact:true}));else await tap(finish);
    }
   }
   await page.locator('.game-result-overlay').waitFor();await layout();
   const profile=()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('physical_player_profile')));
   let saved=await profile();assert.equal(saved.totalPlays,1);assert.equal(saved.recentGames[0].gameType,getMergedGame(game.id)?.target||game.id);assert(Number.isFinite(saved.recentGames[0].score));if(getMergedGame(game.id))assert.equal(saved.recentGames[0].details.metrics['변형 ID'],game.id);
   if(game.kind==='B'){const a=saved.recentGames[0].details.activity;assert.equal(a.gameId,game.id);assert.equal(a.specId,game.spec);assert.equal(a.rounds.length,game.rounds);assert.equal(a.soloPreview,true);assert(a.rounds.every(r=>r.source==='self-report'));}
   await advance(15000);assert.equal((await profile()).totalPlays,1);item.score=saved.recentGames[0].score;
   await page.screenshot({path:path.join(out,game.spec+'-result.png')});
   await tap(page.getByRole('button',{name:'다시 하기',exact:true}));await page.getByRole('button',{name:'활동 시작',exact:true}).waitFor();assert.equal((await profile()).totalPlays,1);
   await tap(page.getByRole('button',{name:'활동 목록으로',exact:true}));await page.waitForURL('**/solo');await page.getByRole('heading',{name:'혼자 해보기',exact:true}).waitFor();
   assert.deepEqual(item.errors,[]);assert.deepEqual(item.serverCalls,[]);item.status='pass';item.resultOnce=true;item.replay=true;item.returnToCatalog=true;
  }catch(e){item.status='fail';item.error=e.message;await page.screenshot({path:path.join(out,game.spec+'-failure.png'),fullPage:true}).catch(()=>{});}
  report.cases.push(item);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(item.status.toUpperCase()+' '+game.spec+' '+(item.error||item.score));await context.close();
 }}finally{await browser.close();}
 report.summary={total:report.cases.length,passed:report.cases.filter(c=>c.status==='pass').length,failed:report.cases.filter(c=>c.status==='fail').length};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(report.summary);if(report.summary.failed)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
