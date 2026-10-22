import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {PHONE_PLAYS,phonePlayerRange,phoneSequence,phoneTarget} from '../src/domain/phonePlayCatalog';
const base=process.argv[2]||'http://127.0.0.1:5173',out=path.resolve(process.env.TEST_OUTPUT_DIR||'test-results/phone-play');fs.mkdirSync(out,{recursive:true});
const selected=process.argv[3]?PHONE_PLAYS.filter(p=>process.argv[3].split(',').includes(p.id)):PHONE_PLAYS;
const widths=(process.env.TEST_WIDTHS||'390,1440').split(',').map(Number);
const report:{base:string;cases:unknown[];errors:string[];writes:string[];passed?:boolean}={base,cases:[],errors:[],writes:[]};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<700,reducedMotion:'reduce'});
  await context.route('**/*',route=>{const r=route.request(),url=new URL(r.url());if((url.hostname.endsWith('.supabase.co')||url.pathname.startsWith('/api/'))&&!['GET','HEAD','OPTIONS'].includes(r.method())){report.writes.push(url.pathname);return route.abort();}return route.continue();});
  for(const p of selected){
   const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(p.id+': '+e.message));await page.clock.install();
   const phase=(value:string)=>page.locator(`[data-phone-play][data-phase="${value}"]`).waitFor(),button=(name:string)=>page.getByRole('button',{name,exact:true});
   try{
    await page.goto(base+(width===390?'/solo/play/':'/play/')+p.id,{waitUntil:'networkidle'});
    const before=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('physical_player_profile')||'{"totalPlays":0}').totalPlays);
    await button('활동 시작').click();await phase('intro');
    assert.equal(await page.locator('.phone-play h1').innerText(),p.name);
    if(width>700)await page.getByLabel('앉아서 참여하기',{exact:true}).check();
    const easy=process.env.TEST_EASY==='1';if(easy)await page.getByLabel('도전 방법',{exact:true}).selectOption('쉬운 방법');
    if(width>700&&process.env.TEST_PLAYERS&&p.players==='모둠')await page.getByLabel('함께할 인원',{exact:true}).selectOption(process.env.TEST_PLAYERS);
    if(p.id===selected[0].id)await page.screenshot({path:path.join(out,`intro-${width}.png`),fullPage:true});
    await button('놀이 방법 익히기').click();await phase('plan');
    const choose=async()=>{if(p.kind==='decision'){await button(p.options![1]).click();assert(await button('짧게 연습하기').isDisabled()||await button('폰 내려놓고 활동 시작').isDisabled());await button(p.options![0]).click();}};
    const run=async(practice:boolean,round=0)=>{
     await phase('countdown');await page.clock.fastForward(4100);await page.clock.runFor(200);await phase('active');
     if(p.id===selected[0].id&&!practice){await button('잠깐 쉬기').click();const at=await page.locator('[data-phone-play]').getAttribute('data-active-ms');await page.clock.runFor(10000);assert.equal(await page.locator('[data-phone-play]').getAttribute('data-active-ms'),at);await button('이어서 하기').click();}
     if(!practice&&width>700&&process.env.TEST_PLAYERS&&p.players==='모둠'){
      const leaders=new Set<number>();for(let n=0;n<Number(process.env.TEST_PLAYERS);n++){leaders.add(Number(await page.locator('[data-phone-leader]').getAttribute('data-phone-leader')));if(n<Number(process.env.TEST_PLAYERS)-1){await page.clock.fastForward(6000);await page.clock.runFor(100);}}
      assert.equal(leaders.size,Number(process.env.TEST_PLAYERS),'every shared-device participant receives a lead turn');
     }
     if(p.kind==='memory')assert(!(await page.locator('.pp-signal').innerText()).includes(phoneSequence(p,0).join(' → ')));
     if(p.kind==='estimate'&&!practice){const at=Number(await page.locator('[data-phone-play]').getAttribute('data-active-ms'));await page.clock.runFor(Math.max(0,phoneTarget(round)*1000-at));await button('멈췄어요 · 시간 확인').click();}
     else {await page.clock.fastForward((practice?8:p.seconds)*1000+500);await page.clock.runFor(200);}
     await phase('record');
    };
    await choose();await button('짧게 연습하기').click();await run(true);
    assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('physical_player_profile')||'{"totalPlays":0}').totalPlays),before);
    await button('연습 마치고 첫 과제로').click();
    for(let round=0;round<3;round++){
     await phase('plan');if(p.kind==='decision')await button(p.options![0]).click();await button('폰 내려놓고 활동 시작').click();await run(false,round);
     const finish=button(round===2?'목표 확인 · 놀이 마치기':'목표 확인 · 다음 과제로');assert(await finish.isDisabled(),'timer must not grant a completion');
     if(p.kind==='memory'){for(const cue of phoneSequence(p,round,easy))await button(cue).click();}
     if(p.kind==='count')await page.getByLabel('완성한 묶음 수 (0~99)',{exact:true}).fill('4');
     const checks=page.locator('.phone-play input[type="checkbox"]');for(let i=0;i<await checks.count();i++)await checks.nth(i).check();
     assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('physical_player_profile')||'{"totalPlays":0}').totalPlays),before);
     assert(await finish.isEnabled());
     if(round===2)await finish.evaluate(b=>{(b as HTMLButtonElement).click();(b as HTMLButtonElement).click();});else await finish.click();
    }
    await page.locator('.game-result-overlay').waitFor();
    const profile=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('physical_player_profile')!));assert.equal(profile.totalPlays,before+1);assert.equal(profile.recentGames[0].score,300);assert.equal(profile.recentGames[0].gameType,p.id);assert.equal(profile.recentGames[0].details.criteria.length,3);
    assert.match(profile.recentGames[0].details.metrics['참여 방식'],width===390&&phonePlayerRange(p).min>1?/혼자 규칙 연습/:new RegExp(`^${width===390?1:process.env.TEST_PLAYERS&&p.players==='모둠'?Number(process.env.TEST_PLAYERS):phonePlayerRange(p).min}명`));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(p.id===selected[0].id||p.kind==='memory')await page.screenshot({path:path.join(out,`${p.id}-${width}.png`),fullPage:true});
    if(p.id===selected[0].id){await page.goto(base+'/records');const record=page.locator(`[data-game-record="${p.id}"]`).first();await record.waitFor();await record.getByText('상세 결과 확인',{exact:true}).click();assert((await record.innerText()).includes('직접 확인'));}
    report.cases.push({id:p.id,kind:p.kind,width,score:300,practiceNoAward:true,duplicatePrevented:true,detailsSaved:true});console.log('PASS',p.id,width);
   }catch(error){await page.screenshot({path:path.join(out,p.id+'-failure.png'),fullPage:true});throw error;}finally{await page.close();}
  }
  const catalog=await context.newPage();await catalog.goto(base+(width===390?'/solo':'/hub')+'?collection=phone');await catalog.getByRole('group',{name:'준비물 없는 놀이 고르기'}).waitFor();
  await catalog.getByLabel('놀이 분류',{exact:true}).selectOption('반응·민첩성');assert(await catalog.locator('[data-game-card]').count()>0);await catalog.getByLabel('참여 인원',{exact:true}).selectOption('모둠');
  const count=await catalog.locator('[data-game-card]').count();const cards=count?await catalog.locator('[data-game-card]').first().getAttribute('data-game-card'):null;if(!count)await catalog.getByRole('status').filter({hasText:'맞는 활동이 없어요'}).waitFor();report.cases.push({width,catalogFilters:true,filteredExample:cards});await catalog.screenshot({path:path.join(out,`catalog-${width}.png`),fullPage:true});await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.writes,[]);report.passed=true;
}finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
