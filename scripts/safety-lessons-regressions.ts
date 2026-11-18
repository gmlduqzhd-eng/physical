import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {SAFETY_LESSON_IDS,SAFETY_LESSONS} from '../src/domain/safetyLessons';

const base=process.argv[2]||'http://127.0.0.1:5173';
const out=path.resolve(process.env.TEST_OUTPUT_DIR||'test-results/safety-lessons');mkdirSync(out,{recursive:true});
const report:{base:string;cases:unknown[];errors:string[];writes:string[]}={base,cases:[],errors:[],writes:[]};
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
try{
 for(const width of [320,1024])for(const id of SAFETY_LESSON_IDS){
  const context=await browser.newContext({viewport:{width,height:800},reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if((u.hostname.endsWith('.supabase.co')||u.pathname.startsWith('/api/'))&&!['GET','HEAD','OPTIONS'].includes(r.method())){
    // Supabase RPC는 읽기도 POST로 보낸다. 인자 없는 점검 기록 조회(activity_review_records)는 읽기라 쓰기로 세지 않는다.
    const readRpc=u.pathname==='/rest/v1/rpc/activity_review_records'&&['','{}'].includes((r.postData()||'').trim());
    if(!readRpc)report.writes.push(u.pathname);return route.abort();}return route.continue();});
  const button=(name:string)=>page.getByRole('button',{name,exact:true});
  try{
   const response=await page.goto(base+'/solo/play/'+id,{waitUntil:'networkidle'});assert.equal(response?.status(),200);
   // 안전 학습 화면이 바로 열린다(예전의 '시작 · 바로 시작' 준비 화면은 없어졌다). 남아 있으면 누른다.
   if(await button('시작 · 바로 시작').count())await button('시작 · 바로 시작').click();await page.locator('[data-safety][data-phase="intro"]').waitFor();
   assert.equal(await page.locator('.mq-heading h1').innerText(),SAFETY_LESSONS[id].name);
   await button('시작 · 안전 상황 살펴보기').click();
   for(let i=0;i<3;i++){
    const scenario=SAFETY_LESSONS[id].scenarios[i];
    await button(scenario.choices.find(c=>c.id!==scenario.answer)!.label).click();await page.getByRole('alert').waitFor();
    await page.locator('[data-safety][data-phase="scenario"]').waitFor();
    assert.equal(await page.locator('.game-result-overlay').count(),0);
    await button(scenario.choices.find(c=>c.id===scenario.answer)!.label).click();
    // 한 상황은 두 번 누르면 끝난다: 안전한 선택 → 표현했어요/읽고 확인했어요.
    const complete=button(`${width===320?'말·손짓으로 표현했어요':'읽고 설명을 확인했어요'} · ${i===2?'학습 정리':'다음 상황'}`);
    assert(await complete.isEnabled());
    assert.equal(await page.getByRole('checkbox').count(),0,'no confirmation checkboxes');
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('physical_player_profile')),null,'no automatic save');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no overflow');
    if(i===0)await page.screenshot({path:path.join(out,`${id}-${width}-rehearsal.png`),fullPage:true});
    await complete.click();
   }
   await button('세 상황의 학습 결과 기록하기').click();
   await page.locator('.game-result-overlay').waitFor();
   const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('physical_player_profile')!));
   assert.equal(saved.totalPlays,1);assert.equal(saved.recentGames[0].gameType,id);// 읽기만 한 학습은 '지켜봄(observed)'으로 남아 점수는 0이다(GamePlayPage quietRecord). 역할 표현은 300점.
   assert.equal(saved.recentGames[0].score,width===320?300:0);assert.equal(saved.recentGames[0].details.participation,width===320?'performed':'observed');assert.match(saved.recentGames[0].details.metrics['점수 기준'],/역량 평가 아님/);
   await button('다시 하기').click();if(await button('시작 · 바로 시작').count())await button('시작 · 바로 시작').click();await page.locator('[data-safety][data-phase="intro"]').waitFor();
   assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('physical_player_profile')!).totalPlays),1);
   report.cases.push({id,width,status:'pass'});console.log('PASS',id,width);
  }catch(e){await page.screenshot({path:path.join(out,`${id}-${width}-failure.png`),fullPage:true});throw e;}finally{await context.close();}
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.writes,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.cases.length}));
}finally{await browser.close();}
