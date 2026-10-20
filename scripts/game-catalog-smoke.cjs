const fs = require('fs');
const path = require('path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const repo = path.resolve(__dirname, '..');
const localRequire = createRequire(path.join(repo, 'package.json'));
const { chromium, webkit, devices } = localRequire(process.env.PLAYWRIGHT_MODULE || 'playwright');
const work = process.env.TEST_OUTPUT_DIR || path.join(repo, 'test-results', 'game-catalog');
fs.mkdirSync(work, { recursive: true });
const base = process.argv[2] || 'http://127.0.0.1:5173';
const testSubset = process.argv[3] ? process.argv[3].split(',') : null;
const engine = process.env.BROWSER_ENGINE || 'chromium';
if (!['chromium', 'webkit'].includes(engine)) throw new Error('BROWSER_ENGINE must be chromium or webkit');
const report = { base, engine, started: new Date().toISOString(), scope: 'Catalog launch, real basic touch input, layout and return navigation; physical sensors and full game completion are not covered', cases: [] };
let activeBrowser;
function readGameInventory() {
  const ts = localRequire('typescript');
  const modules = new Map();
  function load(filename) {
    filename = path.resolve(filename);
    if (modules.has(filename)) return modules.get(filename);
    const exports = {};
    modules.set(filename, exports);
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText, {
      exports,
      require(name) { if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name.replace(/\.js$/, '') + '.ts')); return localRequire(name); },
    }, { filename });
    return exports;
  }
  return load(path.join(repo, 'src/domain/gamesData.ts')).GAMES.map(game => ({ type: game.type, name: game.name }));
}
(async () => {
  const browser = await (engine === 'webkit' ? webkit.launch({ headless: true }) : chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true }));
  activeBrowser = browser;
  const allGames = readGameInventory();
  if (testSubset) {
    const unknown = testSubset.filter(type => !allGames.some(game => game.type === type));
    if (unknown.length) throw new Error('Unknown catalog game types: ' + unknown.join(', '));
  }
  fs.writeFileSync(path.join(work, 'game-catalog-inventory.json'), JSON.stringify(allGames, null, 2));
  const games = testSubset ? allGames.filter(game => testSubset.includes(game.type)) : allGames;
  console.log('Catalog games: ' + games.length);
  const requestedViewport = process.env.CATALOG_VIEWPORT?.match(/^(\d+)x(\d+)$/);
  if (process.env.CATALOG_VIEWPORT && !requestedViewport) throw new Error('CATALOG_VIEWPORT must look like 390x844');
  const viewports = requestedViewport ? [{ width: Number(requestedViewport[1]), height: Number(requestedViewport[2]) }]
    : process.env.MOBILE_ONLY === '1' ? [{ width: 390, height: 844 }] : [{ width: 390, height: 844 }, { width: 1440, height: 900 }];
  for (const viewport of viewports) {
    const mobile = process.env.MOBILE_ONLY === '1' || viewport.width < 768;
    const device = mobile ? devices[engine === 'webkit' ? 'iPhone 13' : 'Pixel 7'] : {};
    const context = await browser.newContext({ ...device, viewport, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    const activate = (locator, timeout = 8000) => mobile ? locator.tap({ timeout }) : locator.click({ timeout });
    const touchGameControl = async locator => {
      if (!mobile) return activate(locator);
      // Moving game targets need a real coordinate tap: waiting for an animated
      // target to become stable would never finish. Verify the hit target first.
      await locator.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
      const target = await locator.evaluate(element => {
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
        return { x, y, reachable: element.contains(document.elementFromPoint(x, y)) };
      });
      if (!target.reachable) throw new Error('Game control is covered by another element');
      await page.touchscreen.tap(target.x, target.y);
    };
    let active;
    page.on('pageerror', error => active?.pageErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') active?.consoleErrors.push(message.text()); });
    page.on('dialog', dialog => dialog.dismiss());
    for (const game of games) {
      active = { game: game.type, name: game.name, engine, viewport, mobile, pageErrors: [], consoleErrors: [], status: 'pass' };
      try {
        await page.goto(base + '/play/' + encodeURIComponent(game.type), { waitUntil: 'domcontentloaded' });
        const normal = page.getByRole('button').filter({ hasText: '×1.0 배율' });
        await normal.waitFor({ state: 'visible', timeout: 15000 });
        await activate(normal);
        const skip = page.getByRole('button', { name: /준비 완료/ });
        if (await skip.count()) await activate(skip);
        else {
          await activate(page.getByRole('button', { name: /활동 시작하기/ }));
          await page.waitForTimeout(3300);
        }
        await page.locator('.gameplay-content').waitFor({ state: 'visible' });
        await page.waitForTimeout(350);
        active.layout = await page.evaluate(expectedWidth => ({
          width: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          text: document.body.innerText.slice(0, 160),
          visibleButtons: [...document.querySelectorAll('button')].filter(button => button.getBoundingClientRect().width > 0).length,
          overflowing: [...document.querySelectorAll('body *')].filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && (rect.left < -2 || rect.right > expectedWidth + 2) && getComputedStyle(el).position !== 'absolute';
          }).slice(0, 8).map(el => ({ tag: el.tagName, className: String(el.className).slice(0, 100), width: Math.round(el.getBoundingClientRect().width) })),
        }), viewport.width);
        // A real touch reaches a game control. This intentionally does not replace
        // game-specific completion or sensor tests with synthetic events.
        const controls = page.locator('.gameplay-content button:visible:not(:disabled)');
        for (const control of await controls.all()) {
          const name = (await control.innerText()).trim() || await control.getAttribute('aria-label') || '';
          if (/^\[|홈으로|나가기|돌아가기|다시|초기화|마이크|영상|유튜브|센서 권한/.test(name)) continue;
          await touchGameControl(control);
          active.touch = { target: name || 'unlabelled game button', outcome: 'activated' };
          await page.waitForTimeout(150);
          break;
        }
        if (!active.touch && /화면.*(?:탭|터치)/.test(await page.locator('.gameplay-content').innerText())) {
          const touchHeading = page.locator('.gameplay-content h1:visible').first();
          if (await touchHeading.count()) {
            await activate(touchHeading);
            active.touch = { target: 'game surface heading', outcome: 'activated' };
            await page.waitForTimeout(150);
          }
        }
        if (!active.touch) active.touch = { outcome: 'no standalone button; launch and navigation checked' };
        active.afterTouchWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        if (active.pageErrors.length || active.layout.documentWidth > viewport.width + 2 || active.afterTouchWidth > viewport.width + 2 || !active.layout.text.trim() || active.layout.text.includes('존재하지 않는 게임')) {
          active.status = 'fail';
          await page.screenshot({ path: path.join(work, `catalog-fail-${engine}-${viewport.width}-${game.type}.png`), fullPage: true });
        }
        const activityDialog = page.locator('[role="dialog"][aria-labelledby="activity-check-title"]');
        if (await activityDialog.count()) await activate(activityDialog.getByRole('button', { name: '활동 목록으로' }));
        else {
        const finishedHome = page.getByRole('button', { name: '활동 목록으로' }).or(page.getByRole('button', { name: '홈으로', exact: true }));
        try {
          await activate(finishedHome.last(), 2000);
        } catch (error) {
          // A game can finish while the toolbar tap is in flight. Select the new
          // result screen's home button instead of the now-covered toolbar.
          if (!await page.getByText('화면 게임 점수 · 신체 활동 증거 아님', { exact: true }).isVisible()) throw error;
          await activate(finishedHome.last());
        }
        }
        await page.waitForURL(url => url.pathname === '/hub', { timeout: 10000 });
        await page.getByRole('heading', { name: /어떤 활동을 해 볼까요|땀방울 원정대/ }).first().waitFor({ state: 'visible', timeout: 10000 });
        active.returnToHub = true;
        if (active.pageErrors.length) active.status = 'fail';
      } catch (error) { active.status = 'fail'; active.error = error.message; }
      active.criticalConsoleErrors = active.consoleErrors.filter(message => /Uncaught error|Unable to preload|Failed to fetch dynamically imported module|ChunkLoadError|ErrorBoundary/.test(message));
      if (active.criticalConsoleErrors.length) active.status = 'fail';
      if (active.error || active.criticalConsoleErrors.length) await page.screenshot({ path: path.join(work, `catalog-fail-${engine}-${viewport.width}-${game.type}.png`), fullPage: true }).catch(() => {});
      report.cases.push(active);
      if (active.status === 'fail') console.log('FAIL ' + viewport.width + ' ' + game.type + ' ' + JSON.stringify({ errors: active.pageErrors, error: active.error, layout: active.layout }));
      if (report.cases.length % 20 === 0) console.log('Checked ' + report.cases.length + ', failures ' + report.cases.filter(test => test.status === 'fail').length);
      fs.writeFileSync(path.join(work, 'game-catalog-smoke-report.json'), JSON.stringify(report, null, 2));
    }
    await context.close();
  }
  await browser.close();
  report.finished = new Date().toISOString();
  report.passed = report.cases.filter(test => test.status === 'pass').length;
  report.failed = report.cases.filter(test => test.status === 'fail').length;
  report.pageErrors = report.cases.reduce((total, test) => total + test.pageErrors.length, 0);
  report.consoleErrors = report.cases.reduce((total, test) => total + test.consoleErrors.length, 0);
  fs.writeFileSync(path.join(work, 'game-catalog-smoke-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ total: report.cases.length, passed: report.passed, failed: report.failed }));
  process.exitCode = report.failed ? 1 : 0;
})().catch(async error => { console.error(error); await activeBrowser?.close(); process.exitCode = 1; });
