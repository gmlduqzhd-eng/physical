// Run against the Vite development server. No classroom data is created.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const repo = path.resolve(__dirname, '..');
const localRequire = createRequire(path.join(repo, 'package.json'));
const { chromium } = localRequire(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ts = localRequire('typescript');
const base = process.argv[2] || 'http://127.0.0.1:5173';
const results = [];
let activeBrowser;

async function main() {
  const drawing = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(repo, 'src/presentation/components/minigames/common/drawingScores.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, drawing);
  const { calculateCircleScore, calculateTraceScore } = drawing.exports;
  const circle = Array.from({ length: 73 }, (_, index) => ({ x: 100 + 70 * Math.cos(index / 72 * Math.PI * 2), y: 100 + 70 * Math.sin(index / 72 * Math.PI * 2) }));
  assert(calculateCircleScore(circle) >= 470);
  assert.equal(calculateCircleScore(Array.from({ length: 80 }, (_, i) => ({ x: 10 + i % 2, y: 10 + i % 3 }))), 0);
  assert(calculateCircleScore(Array.from({ length: 80 }, (_, i) => ({ x: i * 2, y: 30 }))) < 100);
  const square = [[15, 15], [85, 15], [85, 85], [15, 85]];
  const traced = square.flatMap(([x, y], index) => Array.from({ length: 21 }, (_, step) => ({ x: x + (square[(index + 1) % 4][0] - x) * step / 20, y: y + (square[(index + 1) % 4][1] - y) * step / 20 })));
  assert.equal(calculateTraceScore(traced, square), 500);
  assert.equal(calculateTraceScore(Array.from({ length: 100 }, () => ({ x: 50, y: 50 })), square), 0);
  results.push('drawing scores reward closed outlines and reject tiny wiggles and center scribbles');

  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
  activeBrowser = browser;
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(base);
  await page.clock.install();
  async function mount(file, exported, props = {}) {
    await page.evaluate(async ({ file, exported, props }) => {
      window.__fixtureRoot?.unmount();
      document.getElementById('fixture')?.remove();
      const reactModule = await import('/node_modules/.vite/deps/react.js');
      const React = reactModule.default || reactModule;
      const domModule = await import('/node_modules/.vite/deps/react-dom_client.js');
      const { createRoot } = domModule.default || domModule;
      // Use Vite's exact router module URL so both roots share the same context.
      const layoutSource = await (await fetch('/src/presentation/components/minigames/common/PhysicalActivityLayout.tsx')).text();
      const routerUrl = layoutSource.match(/from\s+["']([^"']*react-router-dom[^"']*)["']/)?.[1];
      const { BrowserRouter } = await import(routerUrl || '/node_modules/.vite/deps/react-router-dom.js');
      const component = (await import('/src/presentation/components/minigames/' + file))[exported];
      const fixture = document.createElement('div');
      fixture.id = 'fixture';
      fixture.style.cssText = 'position:fixed;inset:0;overflow:auto;z-index:2147483647;background:#020617';
      document.body.append(fixture);
      window.__gameActions = [];
      const enqueueAction = action => window.__gameActions.push(action);
      window.__fixtureRoot = createRoot(fixture);
      const onComplete = amount => window.__gameActions.push({ payload: { amount } });
      window.__fixtureRoot.render(React.createElement(React.StrictMode, null, React.createElement(BrowserRouter, null, React.createElement(component, { groupId: 'fixture', enqueueAction, onComplete, ...props }))));
    }, { file, exported, props });
    await page.waitForTimeout(30);
  }
  const actions = () => page.evaluate(() => window.__gameActions.map(action => action.payload.amount));
  const fixture = page.locator('#fixture');
  async function advance(seconds) {
    for (let i = 0; i < seconds; i++) {
      await page.clock.runFor(1000);
      await page.waitForTimeout(5);
    }
  }
  async function check(name, callback) {
    const before = pageErrors.length;
    await callback();
    assert.deepEqual(pageErrors.slice(before), [], name + ': browser exceptions');
    results.push(name);
    console.log('PASS', name);
  }

  await check('simultaneous multi-touch scores all 8 rounds exactly once including the last 50 points', async () => {
    await mount('MultiTouch.tsx', 'MultiTouch');
    for (let round = 1; round <= 8; round++) {
      await fixture.locator('button[aria-label]').evaluateAll(buttons => {
        for (const button of buttons) {
          button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true }));
          button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true }));
        }
      });
      await advance(1);
    }
    assert.deepEqual(await actions(), [400]);
  });

  await check('skipping animal missions does not award skipped completion points', async () => {
    await mount('AnimalMove.tsx', 'AnimalMove');
    await fixture.getByRole('button', { name: /패스/ }).click();
    for (let i = 0; i < 4; i++) await fixture.getByRole('button', { name: /완료/ }).click();
    assert.deepEqual(await actions(), [400]);
  });

  await check('red-light elimination submits zero once and never later submits the timed score', async () => {
    await mount('RedGreenLight.tsx', 'RedGreenLight');
    await fixture.locator(':scope > div').dispatchEvent('pointerdown');
    await page.clock.runFor(2100);
    await page.waitForTimeout(20);
    assert((await fixture.innerText()).includes('STOP!'));
    await fixture.locator(':scope > div').dispatchEvent('pointerdown');
    await fixture.locator(':scope > div').dispatchEvent('pointerdown');
    await advance(25);
    assert.deepEqual(await actions(), [0]);
  });

  await check('freeze elimination cancels all remaining rounds and rewards', async () => {
    await mount('FreezeGame.tsx', 'FreezeGame');
    for (let i = 0; i < 6 && !(await fixture.innerText()).includes('얼음!!'); i++) await advance(1);
    assert((await fixture.innerText()).includes('얼음!!'));
    await page.evaluate(() => {
      const event = new Event('devicemotion');
      Object.defineProperty(event, 'accelerationIncludingGravity', { value: { x: 30, y: 0, z: 0 } });
      window.dispatchEvent(event);
      window.dispatchEvent(event);
    });
    await advance(40);
    assert.deepEqual(await actions(), [0]);
    assert((await fixture.innerText()).includes('탈락!'));
  });

  await check('scream timer waits for start and touch fallback finishes exactly once', async () => {
    await mount('ScreamGame.tsx', 'ScreamGame');
    await advance(15);
    assert.deepEqual(await actions(), []);
    assert((await fixture.innerText()).includes('10초'));
    await fixture.getByRole('button', { name: '화면 터치로 시작하기' }).click();
    await fixture.getByRole('button', { name: /연타/ }).evaluate(button => { for (let i = 0; i < 20; i++) button.click(); });
    await advance(15);
    assert.deepEqual(await actions(), [500]);
  });

  await check('late microphone permission after leaving stops the newly returned media stream', async () => {
    await page.evaluate(() => {
      window.__stoppedTracks = 0;
      window.__originalGetUserMedia = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = () => new Promise(resolve => { window.__resolveMicrophone = resolve; });
    });
    await mount('ScreamGame.tsx', 'ScreamGame');
    await fixture.getByRole('button', { name: '마이크로 시작하기' }).click();
    await page.waitForFunction(() => typeof window.__resolveMicrophone === 'function');
    await page.evaluate(() => {
      window.__fixtureRoot.unmount();
      window.__resolveMicrophone({ getTracks: () => [{ stop: () => { window.__stoppedTracks++; } }] });
    });
    await page.waitForTimeout(30);
    assert.equal(await page.evaluate(() => window.__stoppedTracks), 1);
    assert.deepEqual(await actions(), []);
    await page.evaluate(() => { navigator.mediaDevices.getUserMedia = window.__originalGetUserMedia; });
  });

  await check('4-7-8 breathing keeps all phase durations in StrictMode and supports another complete run', async () => {
    await mount('curriculum/ExerciseGames.tsx', 'BreathPacer478');
    await advance(56);
    assert.deepEqual(await actions(), []);
    await advance(1);
    assert.deepEqual(await actions(), [500]);
    await fixture.getByRole('button', { name: '다시 도전하기' }).click();
    await advance(57);
    assert.deepEqual(await actions(), [500, 500]);
  });

  await check('campfire breathing completes three 12-second cycles exactly once in StrictMode', async () => {
    await mount('novel/CampfireBreath.tsx', 'CampfireBreath');
    await advance(35);
    assert.deepEqual(await actions(), []);
    await advance(1);
    assert.deepEqual(await actions(), [150]);
    await advance(20);
    assert.deepEqual(await actions(), [150]);
  });

  await check('drawn-circle feedback locks each round and pending finish is canceled on exit', async () => {
    await mount('CircleDraw.tsx', 'CircleDraw');
    async function draw() {
      await fixture.locator('div.touch-none').evaluate(canvas => {
        const bounds = canvas.getBoundingClientRect();
        canvas.setPointerCapture = () => {};
        const dispatch = (type, angle) => canvas.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, isPrimary: true, clientX: bounds.left + bounds.width / 2 + 70 * Math.cos(angle), clientY: bounds.top + bounds.height / 2 + 70 * Math.sin(angle) }));
        dispatch('pointerdown', 0);
        for (let i = 1; i <= 72; i++) dispatch('pointermove', i / 72 * Math.PI * 2);
        dispatch('pointerup', Math.PI * 2);
      });
      await page.waitForTimeout(10);
    }
    await draw();
    const first = await fixture.innerText();
    await draw();
    assert.equal(await fixture.innerText(), first);
    await advance(2);
    await draw();
    await advance(2);
    await draw();
    await page.evaluate(() => window.__fixtureRoot.unmount());
    await advance(2);
    assert.deepEqual(await actions(), []);
  });

  await check('late dance confirmation advances one round rather than also advancing at the deadline', async () => {
    // Only 100ms separates the late tap from the 3s deadline, so stop real time from leaking into the fake clock.
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    try {
      await mount('DancePose.tsx', 'DancePose');
      await page.clock.runFor(2900);
      await page.waitForTimeout(10);
      // Click immediately: Playwright's actionability wait (~200ms on the pulsing pose) can cross the 3s deadline.
      await fixture.getByRole('button', { name: /포즈 완료/ }).evaluate(button => button.click());
      await page.clock.runFor(200);
      await page.waitForTimeout(10);
      assert((await fixture.innerText()).includes('1/8'));
      await page.clock.runFor(400);
      await page.waitForTimeout(10);
      assert((await fixture.innerText()).includes('2/8'));
    } finally {
      await page.clock.resume();
    }
  });

  await check('expression automatic timer visits every step in StrictMode without skipping a step', async () => {
    const game = {
      name: '테스트 표현', emoji: '🌱', desc: '테스트', devices: ['스마트폰'], playMode: '개인',
      achievement: { code: 'TEST', title: '테스트', desc: '테스트' },
      steps: Array.from({ length: 3 }, (_, i) => ({ stepNum: i + 1, title: '단계 제목 ' + (i + 1), durationSeconds: 2, guide: '안내', actionTip: '동작' })),
      rubric: [{ criterion: '표현', desc: '평가' }],
    };
    await mount('common/ExpressionActivityLayout.tsx', 'ExpressionActivityLayout', { game });
    await advance(3);
    assert((await fixture.innerText()).includes('단계 제목 1'));
    await advance(2);
    assert((await fixture.innerText()).includes('단계 제목 2'));
    await advance(2);
    assert((await fixture.innerText()).includes('단계 제목 3'));
    await advance(2);
    assert(!(await fixture.innerText()).includes('단계 제목 3'));
    assert.deepEqual(await actions(), []);
  });

  await check('tilt race earns one star per approach with StrictMode and ignores null sensor values', async () => {
    await mount('TiltRace.tsx', 'TiltRace');
    for (let i = 0; i < 6; i++) await fixture.getByRole('button', { name: /오른쪽/ }).click();
    assert((await fixture.innerText()).includes('⭐ ×1'));
    await page.evaluate(() => {
      const event = new Event('deviceorientation');
      Object.defineProperty(event, 'gamma', { value: null });
      for (let i = 0; i < 20; i++) window.dispatchEvent(event);
    });
    assert((await fixture.innerText()).includes('⭐ ×1'));
    await advance(20);
    assert.deepEqual(await actions(), [50]);
  });

  await check('sound goalball accepts one block per cue and includes the last round score', async () => {
    await page.evaluate(() => { window.__originalRandom = Math.random; Math.random = () => 0.4; });
    await mount('novel/SoundGoalball.tsx', 'SoundGoalball');
    for (let round = 0; round < 4; round++) {
      await fixture.getByRole('button', { name: /소리 듣기 시작/ }).evaluate(button => { button.click(); button.click(); });
      await advance(2);
      await fixture.getByRole('button', { name: /중앙 막기/ }).evaluate(button => { button.click(); button.click(); });
      await advance(2);
    }
    assert.deepEqual(await actions(), [200]);
    await page.evaluate(() => { Math.random = window.__originalRandom; });
  });

  await check('tactical defense resolves four rounds once each rather than duplicating score and advances', async () => {
    await page.evaluate(() => { window.__originalRandom = Math.random; Math.random = () => 0.4; });
    await mount('novel/TacticalGridSlide.tsx', 'TacticalGridSlide');
    for (let round = 1; round <= 4; round++) {
      assert((await fixture.innerText()).includes('라운드 ' + round + '/4'));
      await advance(5);
      await advance(2);
    }
    assert.deepEqual(await actions(), [200]);
    await advance(10);
    assert.deepEqual(await actions(), [200]);
    await page.evaluate(() => { Math.random = window.__originalRandom; });
  });

  await check('pulse detective retains the post-exercise measurement stage after the workout timer', async () => {
    await mount('PulseDetective.tsx', 'PulseDetective');
    await fixture.getByRole('button', { name: /활동 시작하기/ }).click();
    await advance(3);
    await fixture.getByRole('button', { name: /15초 측정 타이머 시작/ }).click();
    await advance(15);
    await fixture.locator('input[type="number"]').fill('18');
    await fixture.getByRole('button', { name: '입력 완료', exact: true }).click();
    await fixture.getByRole('button', { name: /30초.*시작/ }).click();
    await advance(30);
    assert((await fixture.innerText()).includes('운동 직후 맥박 측정'));
    assert.equal(await fixture.locator('input[type="number"]').count(), 0);
    await fixture.getByRole('button', { name: /직후 맥박 측정 시작/ }).click();
    await advance(15);
    assert((await fixture.innerText()).includes('운동 직후 15초 맥박 입력'));
  });

  await check('changing YouTube video recreates the destroyed player mount and keeps the selected speed', async () => {
    await page.evaluate(() => {
      window.__videoMounts = [];
      window.YT = { Player: function(mount, config) {
        if (!mount?.isConnected) throw new Error('YouTube mount was destroyed');
        const entry = { videoId: config.videoId, speed: null };
        window.__videoMounts.push(entry);
        this.setPlaybackRate = speed => { entry.speed = speed; };
        this.getCurrentTime = () => 0;
        this.destroy = () => mount.remove();
        config.events.onReady({ target: this });
      } };
    });
    await mount('common/YouTubeExpressionPlayer.tsx', 'YouTubeExpressionPlayer');
    await fixture.getByRole('button', { name: '0.75x', exact: true }).click();
    await fixture.getByRole('button', { name: '영상 변경' }).click();
    await fixture.locator('input[type="text"]').fill('https://youtu.be/abcdefghijk');
    await fixture.getByRole('button', { name: '적용', exact: true }).click();
    await page.waitForTimeout(30);
    const mounts = await page.evaluate(() => window.__videoMounts);
    assert.equal(mounts.at(-1).videoId, 'abcdefghijk');
    assert.equal(mounts.at(-1).speed, 0.75);
    assert(mounts.length >= 2);
    await page.evaluate(() => { delete window.YT; });
  });

  await page.evaluate(() => window.__fixtureRoot?.unmount());
  await browser.close();
  console.log(JSON.stringify({ checks: results.length, passed: results }));
}
main().catch(async error => { console.error(error); await activeBrowser?.close(); process.exitCode = 1; });
