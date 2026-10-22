import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PHONE_PLAY_BY_ID,phoneSequence} from '../src/domain/phonePlayCatalog';
const base=process.argv[2]||'http://127.0.0.1:4173',out='../../outputs/phone-plays/guards';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),page=await context.newPage();
const report:any={base,cases:[],errors:[],writes:[]};page.on('pageerror',e=>report.errors.push(e.message));
await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(u.hostname.endsWith('.supabase.co')&&!['GET','HEAD','OPTIONS'].includes(r.method())){report.writes.push(u.pathname);return route.abort();}return route.continue();});
const b=(name:string)=>page.getByRole('button',{name,exact:true}),phase=(p:string)=>page.locator(`[data-phone-play][data-phase="${p}"]`).waitFor();
const advance=async()=>{await phase('countdown');await page.clock.fastForward(4100);await page.clock.runFor(200);await phase('active');await page.clock.fastForward(26000);await page.clock.runFor(200);await phase('record');};
const checks=async()=>{const c=page.locator('.phone-play input[type=checkbox]');for(let i=0;i<await c.count();i++)await c.nth(i).check();};
try{
 await page.clock.install();await page.goto(base+'/solo/play/phone-play-015');await b('활동 시작').click();await page.getByLabel('도전 방법',{exact:true}).selectOption('쉬운 방법');await b('놀이 방법 익히기').click();assert.equal(await page.locator('.pp-panel ol li').count(),2);await b('짧게 연습하기').click();await advance();await b('연습 마치고 첫 과제로').click();
 for(let r=0;r<3;r++){
  await b('폰 내려놓고 활동 시작').click();await phase('countdown');await page.clock.fastForward(4100);await page.clock.runFor(200);await phase('active');
  if(r===0){await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});const at=await page.locator('[data-phone-play]').getAttribute('data-active-ms');await page.clock.fastForward(30000);assert.equal(await page.locator('[data-phone-play]').getAttribute('data-active-ms'),at);await page.evaluate(()=>{Reflect.deleteProperty(document,'hidden');document.dispatchEvent(new Event('visibilitychange'));});await b('이어서 하기').click();report.cases.push('background visibility pauses without granting time');}
  await page.clock.fastForward(26000);await page.clock.runFor(200);await phase('record');await checks();const sequence=phoneSequence(PHONE_PLAY_BY_ID.get('phone-play-015')!,r,true);
  for(const cue of r===0?[...sequence].reverse():sequence)await b(cue).click();
  const full=b(r===2?'목표 확인 · 놀이 마치기':'목표 확인 · 다음 과제로');
  if(r===0){assert(await full.isDisabled());await b('도전한 만큼 기록 · 다음 과제로').click();report.cases.push('incorrect remembered sequence permits a labeled partial record, never full credit');}else await full.click();
 }
 await page.locator('.game-result-overlay').waitFor();const profile=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('physical_player_profile')!));assert.equal(profile.totalPlays,1);assert.equal(profile.recentGames[0].score,250);report.cases.push('easy two-step memory records 50+100+100 exactly once');
 await page.goto(base+'/solo/play/phone-play-053');await b('활동 시작').click();await b('놀이 방법 익히기').click();await b('짧게 연습하기').click();await advance();await b('연습 마치고 첫 과제로').click();await b('폰 내려놓고 활동 시작').click();await advance();await checks();
 await page.getByLabel('완성한 묶음 수 (0~99)',{exact:true}).fill('-1');assert(await b('목표 확인 · 다음 과제로').isDisabled());assert(await b('도전한 만큼 기록 · 다음 과제로').isDisabled());await page.getByLabel('완성한 묶음 수 (0~99)',{exact:true}).fill('0');assert(await b('목표 확인 · 다음 과제로').isDisabled());assert(await b('도전한 만큼 기록 · 다음 과제로').isEnabled());await b('활동 목록으로 돌아가기').click();assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('physical_player_profile')!).totalPlays),1);report.cases.push('invalid counts are blocked; leaving unfinished activity creates no result');
 await page.goto(base+'/');await page.getByRole('link',{name:'준비물 없는 놀이 찾기'}).click();assert(new URL(page.url()).searchParams.get('collection')==='phone');assert((await page.locator('body').innerText()).includes('100가지'));await page.screenshot({path:out+'/collection-mobile.png',fullPage:true});report.cases.push('home discovery links to all 100 filtered phone-only activities');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.writes,[]);report.passed=true;
}finally{await browser.close();fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
