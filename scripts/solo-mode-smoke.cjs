const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('tsx/cjs');
const { GAMES } = require('../src/domain/gamesData.ts');
const base = process.env.AUDIT_URL || 'http://127.0.0.1:5175';
const output = path.resolve(process.env.AUDIT_OUTPUT || 'test-results/solo');
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => {
      localStorage.setItem('physical_sync_action_solo-test', JSON.stringify({ id: 'solo-test', type: 'INCREMENT_SCORE', payload: { id: '22222222-2222-4222-8222-222222222222', amount: 10 }, timestamp: Date.now() }));
    });
    const page = await context.newPage();
    const errors = [], serviceCalls = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*.supabase.co/**', route => { serviceCalls.push(route.request().method() + ' ' + new URL(route.request().url()).pathname); return route.fulfill({ status: 503, body: '{}' }); });
    await page.goto(base + '/');
    await page.getByRole('link', { name: /혼자서도 즐겁게/ }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    const roles = page.locator('.roles > a');
    assert.equal(await roles.count(), 3);
    const boxes = await roles.evaluateAll(items => items.map(el => ({ top: el.getBoundingClientRect().top, height: el.getBoundingClientRect().height })));
    assert.ok(boxes.every(box => Math.abs(box.top - boxes[0].top) < 2));
    await page.screenshot({ path: path.join(output, 'home-desktop.png'), fullPage: true });
    await page.getByRole('link', { name: /혼자서도 즐겁게/ }).click();
    await page.waitForURL('**/solo');
    await page.getByRole('heading', { name: '혼자 해보기', exact: true }).waitFor();
    const cards = page.locator('[data-game-card]');
    assert.equal(await cards.count(), GAMES.length);
    assert.equal(await page.getByRole('link', { name: '체험하기', exact: true }).count(), GAMES.length);
    assert.equal(await page.locator('input[inputmode="numeric"]').count(), 0);
    for (const domain of ['운동', '스포츠', '표현']) {
      await page.getByLabel('활동 영역', { exact: true }).selectOption(domain);
      assert.equal(await cards.count(), GAMES.filter(game => game.domain === domain).length);
    }
    await page.getByLabel('활동 영역', { exact: true }).selectOption('전체');
    const last = GAMES.at(-1);
    await page.getByRole('searchbox').fill(last.name);
    const lastCard = page.locator(`[data-game-card="${last.type}"]`);
    await lastCard.getByRole('link', { name: '체험하기', exact: true }).click();
    await page.getByRole('button', { name: '활동 시작', exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/solo/play/' + last.type);
    await page.getByRole('button', { name: '활동 목록으로', exact: true }).click();
    await page.waitForURL('**/solo');
    // A stale classroom queue and room query must not activate classroom scoring.
    await page.goto(base + '/solo/play/stopwatch?room=11111111-1111-4111-8111-111111111111&group=22222222-2222-4222-8222-222222222222&guided=1&mission=test');
    const start = page.getByRole('button', { name: '활동 시작', exact: true });
    await start.waitFor();
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 100));
    await start.click();
    await page.getByRole('button', { name: /준비 완료/ }).click();
    await page.getByRole('button', { name: 'STOP!', exact: true }).waitFor();
    await page.clock.runFor(7000);
    await page.getByRole('button', { name: 'STOP!', exact: true }).click();
    await page.getByText('활동을 마쳤어요!', { exact: true }).waitFor();
    assert.equal(await page.locator('.result-score-value').innerText(), '+500');
    assert.equal(await page.getByText('오늘 잘한 움직임 하나', { exact: true }).count(), 0);
    assert.ok(await page.evaluate(() => localStorage.getItem('physical_sync_action_solo-test')));
    assert.deepEqual(serviceCalls, []);
    await page.getByRole('button', { name: '활동 목록으로', exact: true }).last().click();
    await page.waitForURL('**/solo');
    await page.clock.resume();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(base + '/');
      await page.getByRole('link', { name: /혼자서도 즐겁게/ }).waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `home overflow ${width}`);
      await page.getByRole('link', { name: /혼자서도 즐겁게/ }).click();
      await page.getByRole('heading', { name: '혼자 해보기', exact: true }).waitFor();
      assert.equal(await cards.count(), GAMES.length);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `catalog overflow ${width}`);
    }
    // The same queue still submits in an actual classroom route (mock server).
    const classroom = await browser.newContext();
    await classroom.addInitScript(() => localStorage.setItem('physical_sync_action_class-test', JSON.stringify({ id: 'class-test', type: 'INCREMENT_SCORE', payload: { id: '22222222-2222-4222-8222-222222222222', amount: 10 }, timestamp: Date.now() })));
    const submissions = [];
    await classroom.route('**/*.supabase.co/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/increment_classroom_score')) { submissions.push(route.request().postDataJSON()); return route.fulfill({ status: 200, contentType: 'application/json', body: 'null' }); }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'test-only', refresh_token: 'test-only', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated' } }) });
    });
    const classroomPage = await classroom.newPage();
    await classroomPage.goto(base + '/play/stopwatch?room=11111111-1111-4111-8111-111111111111&group=22222222-2222-4222-8222-222222222222');
    await classroomPage.waitForFunction(() => localStorage.getItem('physical_sync_action_class-test') === null);
    assert.equal(submissions.length, 1); assert.equal(submissions[0].amount, 10);
    await classroom.close();
    assert.deepEqual(errors, []);
    const result = { base, games: GAMES.length, homeThreeCards: true, searchAndFilters: true, noPinOrAuth: true, noClassroomRequestsEvenWithStaleQueue: serviceCalls.length === 0, classroomSyncStillWorksWithMock: true, score500: true, mobileWidths: [390, 320], errors };
    fs.writeFileSync(path.join(output, 'solo-results.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
