import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {SAFETY_LESSON_IDS,SAFETY_LESSONS} from '../src/domain/safetyLessons';

const base=process.argv[2]||'http://127.0.0.1:5173';
const out=path.resolve(process.env.TEST_OUTPUT_DIR||'test-results/safety-lessons');mkdirSync(out,{recursive:true});
const report:{base:string;cases:unknown[];errors:string[];writes:string[]}={base,cases:[],errors:[],writes:[]};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const width of [320,1024])for(const id of SAFETY_LESSON_IDS){
  const context=await browser.newContext({viewport:{width,height:800},reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if((u.hostname.endsWith('.supabase.co')||u.pathname.startsWith('/api/'))&&!['GET','HEAD','OPTIONS'].includes(r.method())){report.writes.push(u.pathname);return route.abort();}return route.continue();});
  const button=(name:string)=>page.getByRole('button',{name,exact:true});
  try{
   const response=await page.goto(base+'/solo/play/'+id,{waitUntil:'networkidle'});assert.equal(response?.status(),200);
   await button('활동 시작').click();await page.locator('[data-safety][data-phase="intro"]').waitFor();
   assert.equal(await page.locator('.mq-heading h1').innerText(),SAFETY_LESSONS[id].name);
   await button('안전 상황 살펴보기').click();
   for(let i=0;i<3;i++){
    const scenario=SAFETY_LESSONS[id].scenarios[i];
    await button(scenario.choices.find(c=>c.id!==scenario.answer)!.label).click();await page.getByRole('alert').waitFor();
    await page.locator('[data-safety][data-phase="scenario"]').waitFor();
    assert.equal(await page.locator('.game-result-overlay').count(),0);
    await button(scenario.choices.find(c=>c.id===scenario.answer)!.label).click();
    await button('교실 역할 표현으로').click();
    const complete=button(`${width===320?'말·손짓으로 표현했어요':'읽고 설명을 확인했어요'} · ${i===2?'학습 마치기':'다음 상황'}`);
    assert(await complete.isDisabled());
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('physical_player_profile')),null,'no automatic save');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no overflow');
    if(i===0)await page.screenshot({path:path.join(out,`${id}-${width}-rehearsal.png`),fullPage:true});
    await page.getByRole('checkbox').check();await complete.click();
   }
   await page.locator('.game-result-overlay').waitFor();
   const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('physical_player_profile')!));
   assert.equal(saved.totalPlays,1);assert.equal(saved.recentGames[0].gameType,id);assert.equal(saved.recentGames[0].score,300);assert.match(saved.recentGames[0].details.metrics['점수 기준'],/역량 평가 아님/);
   await button('다시 하기').click();await button('활동 시작').click();await page.locator('[data-safety][data-phase="intro"]').waitFor();
   assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('physical_player_profile')!).totalPlays),1);
   report.cases.push({id,width,status:'pass'});console.log('PASS',id,width);
  }catch(e){await page.screenshot({path:path.join(out,`${id}-${width}-failure.png`),fullPage:true});throw e;}finally{await context.close();}
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.writes,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.cases.length}));
}finally{await browser.close();}
