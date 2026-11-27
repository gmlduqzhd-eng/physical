// 보고서에서 가져온 세 가지를 실제 브라우저에서 눌러 본다: 모둠 이어 넘기, 비 오는 날 교실로 바꾸기, 배드민턴 3차시.
// 쓰는 법: node scripts/lesson-ideas-e2e.cjs [baseUrl] [screenshotDir]   (기본 http://127.0.0.1:4173)
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const repo = path.resolve(__dirname, '..');
const { chromium } = createRequire(path.join(repo, 'package.json'))(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = (process.argv[2] || 'http://127.0.0.1:4173').replace(/\/$/, '');
const shots = process.argv[3];
// 처음 여는 선생님 화면에 뜨는 1분 안내를 닫는다.
const closeGuide = async page => { const b = page.locator('.tqg-backdrop'); if (await b.isVisible().catch(() => false)) { await page.keyboard.press('Escape'); await b.waitFor({ state: 'detached', timeout: 5000 }); } };
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

async function scene(browser, name, viewport, run) {
  const context = await browser.newContext({ viewport }); const page = await context.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try { await run(page); assert.deepEqual(errors, [], 'page errors'); console.log(`PASS ${name}`); }
  finally { await context.close(); }
}
(async () => {
  const browser = await chromium.launch({ ...(process.env.BROWSER_CHANNEL && process.env.BROWSER_CHANNEL !== 'chromium' ? { channel: process.env.BROWSER_CHANNEL } : {}), headless: true });
  try {
    await scene(browser, 'rope relay: stop, continue from the count, rotate roles, restore after reload', { width: 1280, height: 900 }, async p => {
      await p.goto(base + '/today', { waitUntil: 'networkidle' }); await p.waitForTimeout(800); await closeGuide(p);
      await p.click('[data-rope-link]'); await p.waitForURL(/tool=rope-relay/);
      await p.selectOption('[data-rope-target]', '5');
      const team = n => `[data-rope-team="${n}"]`;
      assert.equal(await p.locator('.rope-team').count(), 4);
      assert.equal((await p.textContent(`${team(1)} [data-rope-left]`)).trim(), '5');
      assert.match(await p.textContent(`${team(1)} .rope-roles`), /1🪢 도전2🔢 세기3✏️ 기록4🔁 연습/);
      await p.click(`${team(1)} [data-rope-stop]`); await p.click(`${team(1)} [data-rope-count="3"]`);
      assert.equal((await p.textContent(`${team(1)} [data-rope-left]`)).trim(), '2', 'continues from the count it stopped at');
      assert.match(await p.textContent(team(1)), /3회부터 이어서/);
      // 다시 멈추면 지난 횟수보다 작은 수는 고를 수 없다
      await p.click(`${team(1)} [data-rope-stop]`); assert.equal(await p.locator(`${team(1)} [data-rope-count="2"]`).count(), 0);
      await p.click(`${team(1)} [data-rope-count="4"]`);
      await p.click(`${team(1)} [data-rope-complete]`);
      assert.equal((await p.textContent(`${team(1)} [data-rope-left]`)).trim(), '5', 'next member starts fresh');
      assert.match(await p.textContent(`${team(1)} .rope-head`), /2번째 도전 · 다음 3번째/);
      assert.match(await p.textContent(`${team(1)} .rope-roles`), /2🪢 도전3🔢 세기4✏️ 기록/);
      await p.click('[data-rope-undo]'); assert.match(await p.textContent(`${team(1)} .rope-head`), /1번째 도전/); await p.click(`${team(1)} [data-rope-complete]`);
      // 모둠 목표 조정
      await p.click(`${team(2)} [aria-label="2모둠 목표 줄이기"]`); assert.equal((await p.textContent(`${team(2)} [data-rope-left]`)).trim(), '4');
      // 새로고침해도 이어진다
      await p.reload({ waitUntil: 'networkidle' }); await p.click('text=이어서 하기');
      assert.match(await p.textContent(`${team(1)} .rope-head`), /2번째 도전/);
      for (let i = 0; i < 4; i++) await p.click(`${team(3)} [data-rope-complete]`);
      assert.equal(await p.getAttribute(team(3), 'data-done'), 'yes');
      assert.match(await p.textContent('[data-rope-summary]'), /완료한 모둠 1 \/ 4/);
      if (shots) await p.screenshot({ path: path.join(shots, 'rope-relay.png'), fullPage: true });
      await p.click('[data-rope-reset]'); assert.match(await p.textContent('[data-rope-summary]'), /완료한 모둠 0 \/ 4/);
      assert.equal(await p.evaluate(() => sessionStorage.getItem('physical_tools_rope_v1')), null, 'cleared at the end of class');
    });

    await scene(browser, 'rope relay at phone width: no sideways overflow', { width: 360, height: 780 }, async p => {
      await p.goto(base + '/tools?tool=rope-relay', { waitUntil: 'networkidle' });
      await p.click('[data-rope-team="1"] [data-rope-stop]');
      assert.ok(await noOverflow(p));
    });

    await scene(browser, 'rainy day: swap the main game to a classroom one mid-lesson', { width: 1280, height: 900 }, async p => {
      await p.goto(base + '/today', { waitUntil: 'networkidle' }); await p.waitForTimeout(800); await closeGuide(p);
      await p.click('button[aria-pressed] >> text=체육관');
      await p.click('.today-primary'); await p.waitForURL(/\/play\//);
      await p.goto(base + '/today', { waitUntil: 'networkidle' });
      await p.waitForSelector('[data-rain-open]'); await p.click('[data-rain-open]');
      const picks = await p.locator('[data-rain-pick]').count();
      assert.ok(picks >= 2 && picks <= 3, `two or three classroom games (${picks})`);
      assert.match(await p.textContent('[data-rain-swap]'), /남은 시간 약 \d+분/);
      assert.match(await p.textContent('[data-rain-swap]'), /좁은 교실/);
      const id = await p.getAttribute('[data-rain-pick]', 'data-rain-pick'); const name = (await p.textContent('[data-rain-pick] b')).trim();
      await p.click('[data-rain-pick]');
      assert.equal(await p.locator('[data-rain-swap]').count(), 0, 'no second swap once in the classroom');
      assert.match(await p.textContent('.today-stages'), new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(3)));
      const saved = await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.startsWith('physical_today_run')) || 'null') || sessionStorage.getItem(Object.keys(sessionStorage).find(k => k.startsWith('physical_today_run'))) || 'null'));
      if (saved) { assert.equal(saved.plan.settings.space, '교실'); assert.ok(saved.rainFrom); assert.equal(saved.plan.stages.find(s => s.kind === 'main').gameId, id); }
      // 끝까지 넘기면 끝 화면에 교실로 바꿨다고 적힌다
      for (let i = 0; i < 6 && !(await p.locator('[data-rain-done]').count()); i++) { const next = p.locator('button', { hasText: /다음 단계|오늘 수업 마치기/ }).first(); if (await next.count()) await next.click(); else break; await p.waitForTimeout(200); }
      await p.waitForSelector('[data-rain-done]'); assert.match(await p.textContent('[data-rain-done]'), /원래 본게임/);
    });

    await scene(browser, 'badminton 3 lessons: open in order, banner, finish, next lesson', { width: 1280, height: 900 }, async p => {
      await p.goto(base + '/week', { waitUntil: 'networkidle' });
      await p.click('[data-series-open="badminton-3"]');
      assert.equal(await p.locator('[data-series-lesson]').count(), 3);
      assert.equal(await p.getAttribute('[data-series-lesson="1"]', 'data-next'), 'yes');
      await p.click('[data-series-go="2"]'); await p.waitForURL(/\/sports\/badminton\?series=badminton-3&lesson=2/);
      assert.match(await p.textContent('[data-series-banner]'), /배드민턴 3차시 · 2차시/);
      assert.match(await p.textContent('[data-series-banner]'), /지켜볼 동작/);
      await p.click('.sports-stages li:nth-child(2) button');
      assert.match(await p.textContent('.sports-filters button[aria-pressed="true"]'), /기본 규칙/);
      await p.click('.sports-stages li:last-child button');
      await p.click('[data-series-finish]');
      assert.match(await p.textContent('[data-series-finished]'), /다음 차시: 3차시/);
      await p.goto(base + '/week', { waitUntil: 'networkidle' }); await p.click('[data-series-open="badminton-3"]');
      assert.equal(await p.getAttribute('[data-series-lesson="2"]', 'data-done'), 'yes');
      assert.equal(await p.getAttribute('[data-series-lesson="1"]', 'data-next'), 'yes', 'lesson 1 is still next until marked');
      await p.click('[data-series-done="1"]'); assert.equal(await p.getAttribute('[data-series-lesson="3"]', 'data-next'), 'yes');
      if (shots) await p.screenshot({ path: path.join(shots, 'badminton-series.png'), fullPage: true });
      await p.goto(base + '/sports/badminton?series=badminton-3&lesson=1', { waitUntil: 'networkidle' });
      await p.click('.sports-stages li:nth-child(2) button');
      assert.match(await p.textContent('.sports-filters button[aria-pressed="true"]'), /쉽게/);
      // 다른 종목 주소에 붙이면 띠가 나오지 않는다
      await p.goto(base + '/sports/soccer?series=badminton-3&lesson=1', { waitUntil: 'networkidle' });
      assert.equal(await p.locator('[data-series-banner]').count(), 0);
    });
    console.log(JSON.stringify({ passed: 4 }));
  } finally { await browser.close(); }
})().catch(error => { console.error('FAIL', error.message); process.exit(1); });
