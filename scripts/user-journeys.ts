import {chromium,type Page} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {makeQuestRound,safeRoute} from '../src/domain/movementQuests';
const base=process.argv[2]||'http://127.0.0.1:4173',out=path.resolve(process.env.TEST_OUTPUT_DIR||'../../outputs/journeys/local');fs.mkdirSync(out,{recursive:true});
const report:{base:string;cases:unknown[];errors:string[]}={base,cases:[],errors:[]};
const browser=await chromium.launch({channel:'chrome',headless:true});
const click=(p:Page,name:string)=>p.getByRole('button',{name,exact:true}).click();
async function complete(p:Page){
 await click(p,'활동 시작');if(await p.getByRole('button',{name:'기본 활동 시작',exact:true}).count())await click(p,'기본 활동 시작');await click(p,'작전 살펴보기');
 const phase=(name:string)=>p.locator(`[data-quest][data-phase="${name}"]`).waitFor();
 const select=async(round:number)=>{const plan=makeQuestRound('zigzag',round,{gentle:true,seated:false,practice:true,players:3});const choice=plan.choices.find(c=>!c.path||safeRoute(c.path,plan.blocked!))!;await p.getByRole('button',{name:new RegExp('^'+choice.label)}).click();};
 const run=async()=>{await p.clock.runFor(250);await p.clock.fastForward(3100);await phase('active');await p.clock.runFor(250);await p.clock.fastForward(300000);await phase('record');};
 await select(0);await click(p,'동작 연습하기');await run();await click(p,'연습 마치고 첫 작전으로');
 for(let round=0;round<3;round++){await phase('plan');await select(round);await click(p,'기기 놓고 작전 시작');await run();await click(p,`달성했어요 · ${round===2?'원정 마치기':'다음 작전'}`);}
 await p.locator('.game-result-overlay').waitFor();
}
try{for(const width of [360,390,1440]){
 const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<700,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push(e.message));await page.clock.install();
 await page.goto(base+'/');await page.locator('a[href="/solo"]').first().click();await page.getByRole('link',{name:'내 활동 기록',exact:true}).click();await page.getByText('아직 완료한 활동이 없어요.',{exact:false}).waitFor();await page.getByRole('link',{name:'활동 목록으로',exact:true}).click();
 const search=page.getByRole('searchbox');await search.fill('  신호등  ');assert.equal(await page.locator('[data-game-card="red_green"]').count(),1);
 await search.fill('두 발 균형 항로');assert.equal(await page.locator('[data-game-card="one_leg"]').count(),1);await page.locator('[data-game-card="one_leg"]').getByRole('link',{name:'체험하기',exact:true}).click();await click(page,'활동 시작');await page.locator('[data-consolidated] summary').click();await page.getByRole('heading',{name:'두 발 균형 항로',exact:true}).waitFor();await page.locator('[data-variant-option="tilt_balance"]').click();await page.getByRole('button',{name:'활동 목록으로',exact:true}).click();assert.equal(await page.getByRole('searchbox').inputValue(),'두 발 균형 항로');
 await click(page,'검색·조건 초기화');await search.fill('갈림길 보급');await page.locator('[data-game-card="zigzag"]').getByRole('link',{name:'체험하기',exact:true}).click();await complete(page);await page.getByRole('button',{name:/😐 보통/}).click();await click(page,'내 활동 기록 확인');
 const record=page.locator('[data-game-record="zigzag"]');await record.waitFor();assert.match(await record.innerText(),/300점/);assert.match(await record.innerText(),/운동 자각도: 3 \/ 5/);await record.locator('summary').click();assert.match(await record.innerText(),/작전 달성/);await page.reload();await record.waitFor();assert.equal(await page.locator('[data-game-record]').count(),1);await page.screenshot({path:path.join(out,'records-'+width+'.png'),fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.getByRole('link',{name:'별명·배지 보기'}).click();await page.locator('#hub-panel-records').waitFor({state:'visible'});await page.locator('#hub-panel-records [data-game-record="zigzag"]').waitFor();
 await page.goto(base+'/hub?q=갈림길');await page.locator('[data-game-card="zigzag"]').getByRole('link',{name:'이 활동으로 수업 준비',exact:true}).click();assert.equal(new URL(page.url()).searchParams.get('game'),'zigzag');await page.getByLabel('교사 접근 코드',{exact:true}).waitFor();
 report.cases.push({width,status:'pass',flow:'home → search current/legacy names → select course → return keeps search → complete → RPE → recent details → reload → teacher preparation link'});await context.close();console.log('PASS public journey',width);
 }
 assert.deepEqual(report.errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
}finally{await browser.close();}
