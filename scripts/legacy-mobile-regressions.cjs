// Real browser touch input for legacy games; no classroom data or physical sensors are used.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:5215';
const results = [];

async function main() {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.clock.install();
    const cdp = await page.context().newCDPSession(page);
    const touch = async (type, points) => {
      await cdp.send('Input.dispatchTouchEvent', {
        type, touchPoints: points.map(([id, x, y]) => ({ id, x, y })),
      });
      await page.waitForTimeout(30);
    };
    const fixture = page.locator('#legacy-fixture');
    async function mount(file) {
      await page.evaluate(async file => {
        window.__legacyRoot?.unmount();
        document.getElementById('legacy-fixture')?.remove();
        const react = await import('/node_modules/.vite/deps/react.js');
        const React = react.default || react;
        const dom = await import('/node_modules/.vite/deps/react-dom_client.js');
        const { createRoot } = dom.default || dom;
        const Component = (await import('/src/presentation/components/minigames/' + file + '.tsx'))[file];
        const el = document.createElement('div');
        el.id = 'legacy-fixture';
        el.style.cssText = 'position:fixed;inset:0;overflow:auto;z-index:2147483647;background:#020617';
        document.body.append(el);
        window.__legacyActions = [];
        window.__legacyRoot = createRoot(el);
        window.__legacyRoot.render(React.createElement(React.StrictMode, null,
          React.createElement(Component, { groupId: 'fixture', enqueueAction: action => window.__legacyActions.push(action.payload.amount) })));
      }, file);
      await page.waitForTimeout(30);
    }
    async function check(name, run) {
      await run();
      assert.deepEqual(errors, []);
      results.push(name);
      console.log('PASS', name);
    }
    for (const game of ['CircleDraw', 'TraceShape']) {
      await check(game + ': lifting another finger does not end the drawing; cancel discards it', async () => {
        await mount(game);
        const surface = fixture.locator('.touch-none');
        const r = await surface.boundingBox();
        const x = r.x + r.width * 0.5;
        const y = r.y + r.height * 0.3;
        await touch('touchStart', [[0, x, y]]);
        for (let n = 1; n <= 12; n++) await touch('touchMove', [[0, x + n * 3, y + n]]);
        await touch('touchStart', [[0, x + 36, y + 12], [1, x - 40, y + 20]]);
        await touch('touchEnd', [[1, x - 40, y + 20]]);
        assert(!/\+\d+점/.test(await fixture.innerText()), 'secondary release must not score the primary stroke');
        const before = await surface.locator('polyline').getAttribute('points');
        await touch('touchMove', [[0, x + 48, y + 20]]);
        assert.notEqual(await surface.locator('polyline').getAttribute('points'), before, 'primary finger should continue drawing');
        await touch('touchCancel', []);
        assert.equal(await surface.locator('polyline').count(), 0, 'cancellation clears the incomplete outline');
        await page.clock.runFor(1500);
        assert((await fixture.innerText()).includes('1/3'), 'cancellation must not advance the round');
        assert.deepEqual(await page.evaluate(() => window.__legacyActions), []);
      });
    }
    await check('SpeedCircle: primary rotation continues after a second finger is lifted', async () => {
      await mount('SpeedCircle');
      const surface = fixture.locator('.touch-none');
      const r = await surface.boundingBox();
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2, radius = r.width * 0.35;
      const point = angle => [0, cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
      await touch('touchStart', [point(0)]);
      await touch('touchStart', [point(0), [1, cx, cy]]);
      await touch('touchEnd', [[1, cx, cy]]);
      for (let n = 1; n <= 40; n++) await touch('touchMove', [point(n * Math.PI / 16)]);
      assert((await fixture.innerText()).includes('1/10 바퀴'));
      await touch('touchCancel', []);
      const before = await fixture.innerText();
      await surface.dispatchEvent('pointermove', { pointerId: 99, isPrimary: true, clientX: cx, clientY: cy });
      assert.equal(await fixture.innerText(), before);
    });
    for (const game of ['PlankHold', 'OneLegBalance']) {
      await check(game + ': another finger cannot interrupt a hold; primary cancel releases it', async () => {
        await mount(game);
        await touch('touchStart', [[0, 195, 500]]);
        await page.clock.runFor(2100);
        assert((await fixture.innerText()).includes('중심 유지 중') || game === 'PlankHold');
        await touch('touchStart', [[0, 195, 500], [1, 230, 500]]);
        await touch('touchEnd', [[1, 230, 500]]);
        const text = await fixture.innerText();
        assert(!text.includes('흔들려요') && !text.includes('중심이 흔들'), 'secondary release must not reset the primary hold');
        const holdingColor = await fixture.locator(':scope > div').getAttribute('class');
        assert(holdingColor.includes('bg-emerald-950'));
        await page.clock.runFor(1000);
        await touch('touchCancel', []);
        assert(!(await fixture.locator(':scope > div').getAttribute('class')).includes('bg-emerald-950'));
        await page.clock.runFor(31000);
        assert.deepEqual(await page.evaluate(() => window.__legacyActions), [], 'a canceled hold cannot finish in the background');
      });
    }
    await check('CircleDraw: three complete touch-drawn circles submit once and a fresh entry starts at round one', async () => {
      await mount('CircleDraw');
      const surface = fixture.locator('.touch-none');
      const r = await surface.boundingBox();
      const point = angle => [0, r.x + r.width / 2 + 90 * Math.cos(angle), r.y + r.height / 2 + 90 * Math.sin(angle)];
      for (let round = 1; round <= 3; round++) {
        await touch('touchStart', [point(0)]);
        for (let step = 1; step <= 40; step++) await touch('touchMove', [point(step / 40 * Math.PI * 2)]);
        await touch('touchEnd', []);
        await page.clock.runFor(1500);
      }
      const actions = await page.evaluate(() => window.__legacyActions);
      assert.equal(actions.length, 1);
      assert(actions[0] >= 1200 && actions[0] <= 1500);
      await page.clock.runFor(3000);
      assert.deepEqual(await page.evaluate(() => window.__legacyActions), actions);
      await mount('CircleDraw');
      assert((await fixture.innerText()).includes('1/3'));
      assert.deepEqual(await page.evaluate(() => window.__legacyActions), []);
    });
    await check('SpeedCircle: ten touch rotations finish exactly once and reset on re-entry', async () => {
      await mount('SpeedCircle');
      const r = await fixture.locator('.touch-none').boundingBox();
      const point = angle => [0, r.x + r.width / 2 + 90 * Math.cos(angle), r.y + r.height / 2 + 90 * Math.sin(angle)];
      await touch('touchStart', [point(0)]);
      for (let n = 1; n <= 178; n++) await touch('touchMove', [point(n * Math.PI / 8)]);
      await touch('touchEnd', []);
      assert((await fixture.innerText()).includes('완주!'));
      assert.deepEqual(await page.evaluate(() => window.__legacyActions), [500]);
      await page.clock.runFor(3000);
      assert.deepEqual(await page.evaluate(() => window.__legacyActions), [500]);
      await mount('SpeedCircle');
      assert((await fixture.innerText()).includes('0/10 바퀴'));
    });
    await check('PlankHold: a continuous hold completes once, and leaving cancels unfinished holds', async () => {
      await mount('PlankHold');
      await touch('touchStart', [[0, 195, 500]]);
      await page.clock.runFor(31000);
      await touch('touchEnd', []);
      assert.deepEqual(await page.evaluate(() => window.__legacyActions), [500]);
      await page.clock.runFor(31000);
      assert.deepEqual(await page.evaluate(() => window.__legacyActions), [500]);
      await mount('PlankHold');
      await touch('touchStart', [[0, 195, 500]]);
      await page.clock.runFor(2000);
      await page.evaluate(() => window.__legacyRoot.unmount());
      await touch('touchCancel', []);
      await page.clock.runFor(31000);
      assert.deepEqual(await page.evaluate(() => window.__legacyActions), []);
    });
    console.log(JSON.stringify({ checks: results.length, passed: results, errors }));
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
