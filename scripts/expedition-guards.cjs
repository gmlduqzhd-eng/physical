// Browser lifecycle and invalid-input regression checks. No physical motion is inferred.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.AUDIT_URL||'http://127.0.0.1:5175';
const out=path.resolve(process.env.AUDIT_OUTPUT||'test-results/expedition-guards');
async function main(){
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
 const report={base,checks:[],errors:[],scope:'Virtual-clock browser regressions; manual entries are test fixtures.'};
 try{
  const context=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true});
  await context.addInitScript(()=>{
   navigator.mediaDevices.getUserMedia=()=>{throw Error('Unexpected camera/microphone request');};
   if(window.DeviceMotionEvent)window.DeviceMotionEvent.requestPermission=()=>{throw Error('Unexpected motion permission request');};
  });
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.route('**/*.supabase.co/**',()=>{throw Error('Unexpected classroom request');});
  const advance=async ms=>{await page.clock.runFor(ms);await new Promise(resolve=>setTimeout(resolve,30));};
  // Use a real event and public controls, without replacing component state/callbacks.
  const tap=async name=>{const b=page.getByRole('button',{name,exact:true});await b.evaluate(e=>e.scrollIntoView({block:'center'}));await b.tap();};
  const open=async id=>{await page.goto(base+'/solo/play/'+id);await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>new Date(Date.now()+1000).toISOString()));await tap('활동 시작');};
  const saved=()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('physical_player_profile'))?.totalPlays||0);
  await open('exp-phone-29');await tap('원정 시작');await advance(3000);
  await page.locator('[data-phase="active"]').waitFor();await tap('일시정지');await page.clock.runFor(20000);
  await page.locator('[data-phase="active"]').waitFor();await tap('계속하기');await page.clock.runFor(2000);await tap('지금 끝내기');
  const timeText=await page.locator('.expedition-record').innerText();assert(/앱에 기록한 시간: 2(?:\.\d+)?초/.test(timeText),timeText);
  assert.equal(await saved(),0);await tap('이번 라운드 다시 하기');await page.locator('[data-phase="countdown"]').waitFor();
  await page.clock.runFor(3000);await page.locator('[data-phase="active"]').waitFor();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.getByRole('button',{name:'계속하기',exact:true}).waitFor();await page.clock.runFor(20000);await page.locator('[data-phase="active"]').waitFor();
  await page.evaluate(()=>{delete document.hidden;});await tap('준비로 돌아가기');assert.equal(await saved(),0);
  report.checks.push('pause excludes paused time','hidden page pauses','round retry resets stage','unfinished round never saves');
  await open('exp-phone-06');await tap('원정 시작');await tap('점수 없는 연습 시작');await advance(3000);await advance(8000);await tap('첫 작전 시작');
  for(let round=0;round<3;round++){
   await page.clock.runFor(3000);await page.clock.runFor(20000);await page.locator('[data-phase="record"]').waitFor();
   await page.getByText('세부 기록 직접 입력 · 일부 성공도 기록',{exact:true}).click();
   const finish=round<2?'기록하고 다음 라운드':'기록하고 원정 마치기';await tap(finish);await page.getByRole('alert').waitFor();
   await page.getByRole('spinbutton',{name:'안내된 구간을 수행한 수',exact:true}).fill('-1');await tap('1');await tap('1');await tap('1번 확인 전');await tap(finish);await page.getByRole('alert').waitFor();
   await page.getByRole('spinbutton',{name:'안내된 구간을 수행한 수',exact:true}).fill('1');
   await page.getByRole('combobox',{name:'기록 확인 방식',exact:true}).selectOption('peer-report');await tap(finish);
  }
  await page.locator('.game-result-overlay').waitFor();const profile=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('physical_player_profile')));
  assert.equal(profile.recentGames[0].score,0);assert.equal(profile.totalPlays,1);assert(profile.recentGames[0].details.activity.rounds.every(r=>r.correct===false&&r.source==='peer-report'));
  await page.clock.runFor(20000);assert.equal(await saved(),1);
  report.checks.push('blank/missing participation blocked','negative counts blocked','wrong math is recorded as failed, not success','peer report persists','completion saves once');
  await open('exp-tablet-40');await tap('원정 시작');await page.clock.runFor(3000);for(let i=0;i<3;i++)await page.clock.runFor(10000);
  await page.locator('[data-phase="record"]').waitFor();await tap('1번 표식');assert(await page.locator('.expedition-choices').getByRole('button',{name:'1번 표식',exact:true}).isDisabled());
  await tap('기록 지우기');assert(await page.locator('.expedition-choices').getByRole('button',{name:'1번 표식',exact:true}).isEnabled());
  await tap('이번 라운드 다시 하기');await page.locator('[data-phase="countdown"]').waitFor();assert.equal(await saved(),1);
  await tap('준비로 돌아가기');await tap('원정 시작');await page.locator('[data-phase="countdown"]').waitFor();
  await tap('활동 목록으로');await page.waitForURL('**/solo');await page.clock.runFor(200000);assert.equal(await saved(),1);
  report.checks.push('receiving spot cannot be reused','clear answer restores available spots','exit cancels activity without result');
  assert.deepEqual(report.errors,[]);report.status='pass';console.log(JSON.stringify(report));
 }finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
}
main().catch(e=>{console.error(e);process.exit(1);});
