const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium, webkit, devices } = require('playwright');
const base = process.env.AUDIT_URL || 'http://127.0.0.1:5215';
const engine = process.env.MOBILE_ENGINE === 'webkit' ? webkit : chromium;
const output = process.env.AUDIT_OUTPUT || 'test-results/new-games-mobile';
fs.mkdirSync(output, { recursive: true });
const report = { base, engine: engine.name(), checks: [] };

(async () => {
  const browser = await engine.launch({ headless: true, ...(engine === chromium ? { channel: 'chrome' } : {}) });
  try {
    async function check(name, type, run, width = 390) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, userAgent: devices[engine === webkit ? 'iPhone 13' : 'Pixel 7'].userAgent });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.clock.install();
        await page.goto(`${base}/play/${type}`);
        await page.getByRole('button', { name: /표준 기록/ }).tap();
        const ownIntro = ['space-occupier', 'relay-mission-runner', 'body-rhythm-orchestrator'].includes(type);
        if (ownIntro) {
          assert.equal(await page.getByRole('button', { name: /준비 완료/ }).count(), 0, 'One preparation flow per game');
          await page.getByRole('button', { name: /활동 시작하기/ }).tap();
          await page.waitForTimeout(3300);
        } else await page.getByRole('button', { name: /준비 완료/ }).tap();
        await page.clock.pauseAt(new Date(Date.now() + 100));
        const advance = async ms => { await page.clock.runFor(ms); await new Promise(resolve => setTimeout(resolve, 40)); };
        const layout = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow');
        await run(page, advance, layout);
        await layout();
        assert.deepEqual(errors, []);
        report.checks.push({ name, passed: true });
        await page.screenshot({ path: `${output}/${engine.name()}-${type}-${width}.png`, fullPage: true });
        console.log('PASS', name);
      } catch (error) {
        await page.screenshot({ path: `${output}/failure-${engine.name()}-${type}-${width}.png`, fullPage: true });
        throw error;
      } finally { await context.close(); }
    }

    await check('missing motion values never add steps; tap, finish and replay work', 'run', async (page, advance) => {
      await page.evaluate(() => {
        const event = new Event('devicemotion');
        Object.defineProperty(event, 'accelerationIncludingGravity', { value: { x: null, y: null, z: null } });
        window.dispatchEvent(event);
      });
      await advance(300);
      assert.match(await page.locator('.gameplay-content').innerText(), /유효 걸음수\s*0/);
      await page.getByRole('heading', { name: /제자리 달리기/ }).tap();
      await advance(300);
      assert.match(await page.locator('.gameplay-content').innerText(), /유효 걸음수\s*1/);
      await advance(20500);
      await page.getByText('획득 점수', { exact: true }).waitFor();
      assert.match(await page.locator('body').innerText(), /획득 점수\s*\+10/);
      await page.getByRole('button', { name: '다시 하기', exact: true }).tap();
      await page.getByRole('button', { name: /표준 기록/ }).waitFor();
    });

    await check('target works without sensors, earns no unmeasured stability bonus and finishes', 'target', async (page, advance, layout) => {
      await page.getByText('터치 조준 모드 · 센서 대기').waitFor();
      await layout();
      await advance(1200);
      await page.getByRole('heading', { name: '표적 조준 사격' }).tap();
      const score = await page.locator('.gameplay-content').innerText();
      assert.match(score, /총 획득 점수\s*(10|20|40|70|100)점/);
      assert.doesNotMatch(score, /안정 조준 중/);
      for (let round = 2; round <= 5; round++) {
        await advance(1000);
        await page.getByRole('heading', { name: '표적 조준 사격' }).tap();
      }
      await page.getByText('획득 점수', { exact: true }).waitFor();
      await page.getByRole('button', { name: '다시 하기', exact: true }).tap();
      await page.getByRole('button', { name: /표준 기록/ }).waitFor();
    }, 320);

    await check('relay third runner holds a real ten-second mission then records all four runners', 'relay-mission-runner', async (page, advance) => {
      await page.getByRole('button', { name: /릴레이 시작!/ }).tap();
      for (let runner = 1; runner <= 4; runner++) {
        await page.getByRole('button', { name: /반환점 도착!/ }).tap();
        if (runner === 3) {
          assert.equal(await page.getByRole('button', { name: /1회 수행 완료/ }).count(), 0);
          await advance(9000);
          assert.equal(await page.getByRole('button', { name: /바통 터치!/ }).count(), 0);
          await advance(1200);
        } else {
          for (let count = 0; count < 5; count++) await page.getByRole('button', { name: /1회 수행 완료/ }).tap();
        }
        await page.getByRole('button', { name: runner < 4 ? /바통 터치!/ : /결승선 골인!/ }).tap();
      }
      await page.getByText('획득 점수', { exact: true }).waitFor();
      assert.match(await page.locator('body').innerText(), /3번 주자/);
      await page.getByRole('button', { name: '다시 하기', exact: true }).tap();
      await page.getByRole('button', { name: /표준 기록/ }).waitFor();
    });

    await check('space game five timed rounds finish once and remain replayable', 'space-occupier', async (page, advance) => {
      await page.getByRole('button', { name: /작전|라운드 시작/ }).last().tap();
      for (let round = 1; round <= 5; round++) {
        await advance(7100);
        if (round < 5) await page.getByRole('button', { name: /다음 라운드 도전/ }).tap();
      }
      await page.getByText('획득 점수', { exact: true }).waitFor();
      assert.match(await page.locator('body').innerText(), /획득 점수\s*0/);
      await page.getByRole('button', { name: '다시 하기', exact: true }).tap();
      await page.getByRole('button', { name: /표준 기록/ }).waitFor();
    });

    await check('rhythm changes cards, pauses beats and saves touch-accessible peer ratings', 'body-rhythm-orchestrator', async (page, advance, layout) => {
      const cards = () => page.locator('.gameplay-content').innerText();
      await page.getByRole('button', { name: /새 동작 조합/ }).tap();
      const first = await cards();
      await page.getByRole('button', { name: /새 동작 조합/ }).tap();
      assert.notEqual(await cards(), first);
      await page.getByRole('button', { name: /비트 틀고 연습 시작/ }).tap();
      await advance(1000);
      await page.getByRole('button', { name: /비트 일시 정지/ }).tap();
      const paused = await cards();
      await advance(2000);
      assert.equal(await cards(), paused);
      await page.getByRole('button', { name: /비트 다시 재생/ }).tap();
      await page.getByRole('button', { name: /연습 완료!/ }).tap();
      await page.getByRole('button', { name: /발표 종료!/ }).tap();
      await layout();
      for (const label of ['독창적 표현력 3점', '비트와 박자감 4점', '모둠 협동·조화 2점']) {
        const rating = page.getByRole('button', { name: label, exact: true });
        const box = await rating.boundingBox();
        assert(box.width >= 44 && box.height >= 44, 'Peer rating touch targets are 44px');
        await rating.tap();
        assert.equal(await rating.getAttribute('aria-pressed'), 'true');
      }
      await page.getByRole('button', { name: /평가 제출 및 점수 확정/ }).tap();
      await page.getByText('획득 점수', { exact: true }).waitFor();
      assert.match(await page.locator('body').innerText(), /획득 점수\s*\+180/);
      assert.match(await page.locator('body').innerText(), /칼군무 완벽/);
    }, 320);
  } finally {
    await browser.close();
    fs.writeFileSync(`${output}/${engine.name()}-results.json`, JSON.stringify(report, null, 2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
