const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.AUDIT_URL || 'http://127.0.0.1:5173';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const passed = [];
  async function check(type, run) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.clock.install();
      await page.goto(`${base}/play/${type}`);
      await page.getByRole('button', { name: /활동 시작/ }).click();
      await page.getByRole('button', { name: /준비 완료/ }).click();
      await page.clock.pauseAt(new Date(Date.now() + 100));
      const advance = async ms => { await page.clock.runFor(ms); await new Promise(resolve => setTimeout(resolve, 10)); };
      const finished = async () => {
        const skip = page.getByRole('button', { name: /화면 게임으로만 기록/ });
        if (await skip.count()) await skip.evaluate(el => el.click());
        return (await page.locator('body').innerText()).includes('화면 게임 점수');
      };
      await run(page, advance, finished);
      assert.deepEqual(errors, [], `${type}: browser errors`);
      passed.push(type);
    } finally { await context.close(); }
  }
  try {
    await check('jump', async (page, advance) => {
      await page.evaluate(() => window.dispatchEvent(new DeviceMotionEvent('devicemotion', { accelerationIncludingGravity: { x: null, y: null, z: null } })));
      await advance(1000);
      assert.match(await page.locator('.gameplay-content').innerText(), /점프 횟수\s*0/);
      await page.locator('.gameplay-content h1').click();
      assert.match(await page.locator('.gameplay-content').innerText(), /점프 횟수\s*1/);
    });
    await check('cpr-compression-110', async (page, advance, finished) => {
      const press = () => page.getByRole('button', { name: /깍지 끼고/ }).click();
      for (let i = 0; i < 31; i++) { await press(); await advance(100); }
      assert.equal(await finished(), false, 'rapid tapping must not earn CPR completion');
      await advance(450);
      for (let i = 0; i < 31 && !await finished(); i++) { await press(); await advance(550); }
      assert.equal(await finished(), true, 'valid consecutive beats must complete');
      await page.getByRole('button', { name: /게임 상세 결과 보기/ }).click();
      assert.match(await page.locator('body').innerText(), /CPR 박자 연습 완료/);
      await page.getByRole('button', { name: /다시|재도전/ }).first().click();
      assert.match(await page.locator('body').innerText(), /배율/);
    });
    await check('pulse-zone-target', async (page, advance, finished) => {
      const tap = () => page.getByRole('button', { name: /^❤️$/ }).click();
      for (let i = 0; i < 3; i++) { await tap(); await advance(450); }
      for (let i = 0; i < 7; i++) await advance(1000);
      assert.equal(await finished(), false, 'idle time must not count as sustained beats');
      for (let i = 0; i < 22 && !await finished(); i++) { await tap(); await advance(450); }
      assert.equal(await finished(), true);
    });
    for (const type of ['mobility-joint-circle', 'ribbon-wave-stream']) await check(type, async (page, advance, finished) => {
      const bounds = await page.locator('div.touch-none').last().boundingBox();
      const cx = bounds.x + bounds.width / 2, cy = bounds.y + bounds.height / 2;
      await page.mouse.move(cx, cy); await page.mouse.down();
      for (let i = 0; i < 100; i++) await page.mouse.move(cx + i % 2 * 4, cy);
      await page.mouse.up();
      assert.equal(await finished(), false, 'small wiggles must not count as circles');
      await page.mouse.move(cx + bounds.width * .34, cy); await page.mouse.down();
      for (let i = 1; i <= 210; i++) {
        const angle = i * Math.PI * 2 / 65;
        await page.mouse.move(cx + bounds.width * .34 * Math.cos(angle), cy + bounds.height * .34 * Math.sin(angle));
      }
      await page.mouse.up(); await advance(10);
      assert.equal(await finished(), true, 'three full rotations must complete');
    });
    await check('plank', async (page, advance, finished) => {
      await page.mouse.move(195, 450); await page.mouse.down();
      for (let i = 0; i < 4; i++) await advance(1000);
      await page.mouse.up();
      assert.match(await page.locator('.gameplay-content').innerText(), /0초/);
      assert.equal(await finished(), false);
      await page.mouse.down();
      for (let i = 0; i < 31; i++) await advance(1000);
      assert.equal(await finished(), true);
      await page.mouse.up();
    });
    await check('seed_sprout', async (page, advance, finished) => {
      assert.equal(await page.getByText('3', { exact: true }).count(), 0, 'outer preparation must not lead to another countdown');
      for (let i = 0; i < 10; i++) {
        const next = page.getByRole('button', { name: /다음 단계|활동 마치고 평가하기/ });
        if (!await next.count()) break;
        await next.click();
      }
      const submit = page.getByRole('button', { name: '평가 완료 및 활동 결과 보기' });
      assert.equal(await submit.isEnabled(), false);
      assert.equal(await page.locator('input[type=text]').inputValue(), '');
      for (const star of await page.getByRole('button', { name: / 4점$/ }).all()) await star.click();
      await page.locator('input[type=text]').fill('동작을 더 크게 표현했어요');
      await submit.click();
      assert.equal(await finished(), true);
      assert.match(await page.locator('body').innerText(), /동작을 더 크게 표현했어요/);
      await advance(50);
      // Player profile is stored in sessionStorage (privacyKind redirects private keys)
      const profile = await page.evaluate(() => JSON.parse(sessionStorage.getItem('physical_player_profile') || localStorage.getItem('physical_player_profile')));
      assert.equal(profile.totalPlays, 1);
      assert(profile.recentGames[0].details.ratings.every(rating => rating === 4));
      assert.equal(profile.recentGames[0].details.selfReflection, '동작을 더 크게 표현했어요');
      await page.reload();
      const restored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('physical_player_profile') || localStorage.getItem('physical_player_profile')));
      assert.deepEqual(restored.recentGames[0].details, profile.recentGames[0].details);
    });
    await check('stopwatch', async (page, advance, finished) => {
      await advance(1450);
      await page.getByRole('button', { name: 'STOP!' }).click();
      assert.equal(await finished(), true);
      assert.match(await page.locator('body').innerText(), /멈춘 시간/);
      assert.match(await page.locator('body').innerText(), /오차/);
    });
    console.log(JSON.stringify({ passed, errors: [] }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
