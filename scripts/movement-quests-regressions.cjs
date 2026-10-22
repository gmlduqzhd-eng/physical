const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:5173';
const out = path.resolve(process.env.TEST_OUTPUT_DIR || 'test-results/movement-quests');
fs.mkdirSync(out, { recursive: true });
const cases = [], errors = [], requests = [];
const liveSite = process.env.LIVE_SITE_CHECK === '1';
async function guardRemote(context) {
  await context.route('**/*', route => {
    const request = route.request();
    if (request.url().includes('.supabase.co') || request.url().startsWith(base + '/api/')) {
      requests.push({ url: new URL(request.url()).pathname, method: request.method() });
      if (liveSite) return request.method() === 'GET' ? route.continue() : route.abort('blockedbyclient');
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    return route.continue();
  });
}
const button = (page, name) => page.getByRole('button', { name, exact: true });
async function phase(page, value) {
  try { await page.locator(`[data-quest][data-phase="${value}"]`).waitFor({ timeout: 10000 }); if(process.env.DEBUG_MOVEMENT)console.log('PHASE',value); }
  catch(error) {
    console.error(await page.evaluate(() => ({ phase:document.querySelector('[data-quest]')?.getAttribute('data-phase'), hidden:document.hidden, signal:document.querySelector('.mq-signal')?.textContent })));
    await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}); throw error;
  }
}
async function launch(page, id, solo = true) {
  await page.goto(`${base}/${solo ? 'solo/play' : 'play'}/${id}`, { waitUntil: 'networkidle' });
  await button(page, '활동 시작').click();if(await button(page,'기본 활동 시작').count())await button(page,'기본 활동 시작').click(); await phase(page, 'intro');
}
async function choose(page, id, round) {
  const options = id === 'zigzag' ? ['위쪽 길','아래쪽 길','위쪽 길'] : id === 'dribble-rhythm' ? ['편한 손으로 연결','두 손 번갈아 연결','두 손 번갈아 연결'] : ['가까이서 정확하게','간격을 조금 넓혀 도전','가까이서 정확하게'];
  await page.getByRole('button', { name: new RegExp('^' + options[round]) }).click();
}
async function run(page, practice = false) {
  await button(page, practice ? '동작 연습하기' : '기기 놓고 작전 시작').click();
  await phase(page,'countdown'); await page.clock.fastForward(3100); await phase(page,'active');
  await finishActive(page);
}
async function finishActive(page) {
  // React can paint the active phase before its passive interval is installed.
  // Observe a real virtual timer tick before skipping to the end of the round.
  const before=Number(await page.locator('[data-quest]').getAttribute('data-active-ms'));
  if(process.env.DEBUG_MOVEMENT)console.log('TICK before',before);
  await page.clock.runFor(250);
  if(process.env.DEBUG_MOVEMENT)console.log('TICK after',await page.locator('[data-quest]').getAttribute('data-active-ms'));
  await page.waitForFunction(ms=>Number(document.querySelector('[data-quest]').dataset.activeMs)>ms,before);
  await page.clock.fastForward(150000); await phase(page,'record');
}
async function profile(page) { return page.evaluate(() => JSON.parse(sessionStorage.getItem('physical_player_profile') || 'null')); }
async function checkLayout(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow');
  for (const box of await page.locator('[data-quest] button:visible').evaluateAll(elements => elements.map(e => { const r=e.getBoundingClientRect(); return { width:r.width, height:r.height }; }))) assert(box.height >= 44 && box.width >= 44, 'touch target >=44px');
}
(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1024, height: 768 }]) {
      const context = await browser.newContext({ viewport, hasTouch: true, reducedMotion: 'reduce' });
      await guardRemote(context);
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.clock.install();
      for (const id of ['zigzag','dribble-rhythm','pass-gate-rescue']) {
        await launch(page,id); await checkLayout(page);
        if(id==='zigzag') await page.evaluate(()=>localStorage.setItem('physical_best_zigzag','999'));
        if (id === 'dribble-rhythm') await page.getByLabel('앉아서 팔 동작으로 참여하기').check();
        await button(page,'작전 살펴보기').click(); await phase(page,'plan');
        if (id === 'zigzag') {
          await page.getByRole('button',{ name:/^가운데 길/ }).click();
          assert(await button(page,'동작 연습하기').isDisabled(), 'blocked path cannot start');
          assert(await page.getByRole('alert').isVisible());
        }
        await choose(page,id,0);
        await page.evaluate(()=>window.scrollTo(0,0));
        await page.screenshot({ path:path.join(out,`${id}-${viewport.width}-plan.png`), fullPage:true });
        const before = await profile(page);
        await run(page,true);
        assert.equal((await profile(page))?.totalPlays, before?.totalPlays, 'rehearsal cannot save a result');
        await button(page,'연습 마치고 첫 작전으로').click();
        for (let round=0;round<3;round++) {
          await phase(page,'plan'); await choose(page,id,round);
          await button(page,'기기 놓고 작전 시작').click();
          await page.clock.fastForward(3100); await phase(page,'active');
          if (round===0) {
            const previous = await page.locator('.mq-signal').innerText();
            await button(page,'일시정지').click(); await page.clock.fastForward(8000);
            assert.match(await page.locator('.mq-signal').innerText(),/일시정지/);
            await button(page,'계속하기').click();
            await page.evaluate(() => { Object.defineProperty(document,'hidden',{ configurable:true, value:true }); document.dispatchEvent(new Event('visibilitychange')); });
            await page.clock.fastForward(8000);
            assert(await button(page,'계속하기').isVisible(), 'hidden tab pauses and requires explicit resume');
            await page.evaluate(() => { Object.defineProperty(document,'hidden',{ configurable:true, value:false }); document.dispatchEvent(new Event('visibilitychange')); });
            await button(page,'계속하기').click();
            assert.equal(await page.locator('.mq-signal').innerText(),previous, 'pause and background time excluded');
            await page.clock.runFor(100);
          }
          await finishActive(page);
          assert.equal((await profile(page))?.totalPlays,before?.totalPlays,'timer alone never saves');
          await checkLayout(page);
          if (round === 0 && id === 'zigzag') {
            await button(page,'아직이에요 · 작전 바꾸어 재도전').click(); await choose(page,id,round); await run(page);
          }
          if (round===1 && id==='dribble-rhythm') await button(page,'연습 기록으로 다음으로 · 이번 작전 0점').click();
          else await button(page,`달성했어요 · ${round===2?'원정 마치기':'다음 작전'}`).click();
        }
        await page.locator('.game-result-overlay').waitFor();
        const after=await profile(page), record=after.recentGames[0];
        assert.equal(after.totalPlays,(before?.totalPlays||0)+1,'exactly one completion');
        assert.equal(record.gameType,id,'old ID retained');
        assert.equal(record.score,id==='dribble-rhythm'?200:300);
        if(id==='zigzag') {
          assert.equal(await page.evaluate(()=>localStorage.getItem('physical_best_zigzag')),'999','legacy best is preserved');
          assert.equal(await page.evaluate(()=>localStorage.getItem('physical_best_zigzag_movement_v1')),'300','new score has a separate best');
        }
        assert.match(record.details.metrics['기록 방식'],/직접 확인/);
        assert.match(record.details.metrics['참여 방식'],/모둠 참여 미확인/);
        if(id==='zigzag') assert.equal(record.details.metrics['다시 시도'],'1회 · 감점 없음');
        if(id==='dribble-rhythm') assert.match(record.details.metrics['활동 선택'],/앉아서/);
        await page.screenshot({ path:path.join(out,`${id}-${viewport.width}-result.png`),fullPage:true });
        await button(page,'다시 하기').click(); await button(page,'활동 시작').click(); await phase(page,'intro');
        assert.equal((await profile(page)).totalPlays,after.totalPlays,'replay does not resubmit');
        await page.getByRole('button',{ name:'활동 목록으로',exact:true }).click();
        await page.waitForURL('**/solo');
        cases.push({id,viewport,status:'pass',checks:'blocked routes / rehearsal / pause / background / retry / partial / result / replay / catalog'});
      }
      await context.close();
    }
    const teamContext = await browser.newContext({viewport:{width:320,height:568},hasTouch:true});
    await guardRemote(teamContext);
    const page=await teamContext.newPage(); await page.clock.install();
    await launch(page,'pass-gate-rescue',false);
    await page.getByLabel('함께할 인원').selectOption('6'); await checkLayout(page);
    await button(page,'작전 살펴보기').click(); await choose(page,'pass-gate-rescue',0);
    assert.match(await page.locator('.mq-panel').innerText(),/6번 친구/);
    await run(page,true); await button(page,'연습 마치고 첫 작전으로').click();
    for(let round=0;round<3;round++){
      await choose(page,'pass-gate-rescue',round);
      assert.match(await page.locator('.mq-panel').innerText(),new RegExp(`시계 방향 1번째 표식: ${round+1}번 친구`));
      await run(page); await button(page,`달성했어요 · ${round===2?'원정 마치기':'다음 작전'}`).click();
    }
    assert.match((await profile(page)).recentGames[0].details.metrics['참여 방식'],/6명 함께 활동 · 직접 확인/);
    cases.push({id:'pass-gate-rescue',viewport:{width:320,height:568},status:'pass',checks:'6 players / all roles / rotating starter / direct team record'});
    await teamContext.close();
    assert.deepEqual(errors,[],'no browser exceptions');
    assert(!requests.some(r=>r.method!=='GET'),'no writes to classroom/API while testing');
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({base,liveSite,cases,errors,requests,scope:'Virtual-time browser flow only; no student movement or usability evidence. Live mode uses real site resources and GET responses; unexpected API/database writes are blocked and fail the test.'},null,2));
    console.log(JSON.stringify({passed:cases.length,errors,remoteWrites:requests.filter(r=>r.method!=='GET').length}));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
