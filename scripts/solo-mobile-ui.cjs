const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
require('tsx/cjs');
const {EXPRESSION_GAMES}=require('../src/presentation/components/minigames/expression/expressionGamesData.ts');
const base=process.env.AUDIT_URL||'http://127.0.0.1:5175';
const out=process.env.AUDIT_OUTPUT||'test-results/solo-mobile-ui';fs.mkdirSync(out,{recursive:true});
(async()=>{
 for(const engine of [chromium,webkit]){
 const browser=await engine.launch({headless:true,...(engine===chromium?{channel:'msedge'}:{})});
 try{for(const viewport of [{width:320,height:568},{width:667,height:375}]){
  const page=await browser.newPage({viewport,isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const tap=async locator=>{await page.waitForTimeout(250);await locator.evaluate(el=>el.scrollIntoView({block:'center'}));const p=await locator.evaluate(el=>{const r=el.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;return {x,y,hit:el.contains(document.elementFromPoint(x,y))};});assert(p.hit,'control is reachable: '+await locator.textContent());await locator.tap();await page.waitForTimeout(100);};
  const layout=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');
  await page.goto(base+'/solo/play/jump');await tap(page.getByRole('button',{name:'활동 시작',exact:true}));
  await tap(page.getByRole('button',{name:/준비 완료/}));assert.equal(await page.locator('.game-sensor-setup:visible').count(),0);await layout();
  await page.goto(base+'/solo/play/seed_sprout');await tap(page.getByRole('button',{name:'활동 시작',exact:true}));await tap(page.getByRole('button',{name:/준비 완료/}));
  await tap(page.locator('button[title="성취기준 상세 보기"]'));
  const dialog=page.getByRole('dialog',{name:'성취기준 안내'});const box=await dialog.boundingBox();assert(box.y>=68&&box.y+box.height<=viewport.height+1,'achievement dialog fits below utilities');
  await tap(dialog.getByRole('button',{name:'확인',exact:true}));
  for(const _step of EXPRESSION_GAMES.find(g=>g.id==='seed_sprout').steps)await tap(page.getByRole('button',{name:/다음 단계|활동 마치고 평가하기/}));
  await page.getByRole('button',{name:/ 3점$/}).first().waitFor();
  for(const rating of await page.getByRole('button',{name:/ 3점$/}).all()){
   const b=await rating.boundingBox();assert(b.width>=44&&b.height>=44,'rating touch target must be 44px, got '+b.width+'x'+b.height);await tap(rating);
  }
  await layout();await page.screenshot({path:out+'/'+engine.name()+'-'+viewport.width+'-rubric.png',fullPage:true});
  const input=page.locator('.gameplay-content input[type="text"]');await tap(input);await input.fill('몸을 천천히 움직이며 표현했어요.');
  await page.setViewportSize({width:viewport.width,height:320});await tap(input);await layout();
  await tap(page.getByRole('button',{name:/평가 완료 및 활동 결과 보기/}));await page.locator('.game-result-overlay').waitFor();
  await layout();await tap(page.getByRole('button',{name:'다시 하기',exact:true}));await page.getByRole('button',{name:'활동 시작',exact:true}).waitFor();
  await tap(page.getByRole('button',{name:'활동 목록으로',exact:true}));await page.waitForURL('**/solo');await layout();assert.deepEqual(errors,[]);
  console.log('PASS '+engine.name()+' '+viewport.width+' portrait/landscape, keyboard resize, rubric, result and return');await page.close();
 }}finally{await browser.close();}}
})().catch(e=>{console.error(e);process.exitCode=1;});
