const fs = require('fs');
const path = require('path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const repo = path.resolve(__dirname, '..');
const localRequire = createRequire(path.join(repo, 'package.json'));
const { chromium } = localRequire(process.env.PLAYWRIGHT_MODULE || 'playwright');
const work = process.env.TEST_OUTPUT_DIR || path.join(repo, 'test-results', 'game-catalog');
fs.mkdirSync(work, { recursive: true });
const base = process.argv[2] || 'http://127.0.0.1:5173';
const testSubset = process.argv[3] ? process.argv[3].split(',') : null;
const report = { base, started: new Date().toISOString(), cases: [] };
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
      require(name) { if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name + '.ts')); return localRequire(name); },
    }, { filename });
    return exports;
  }
  return load(path.join(repo, 'src/domain/gamesData.ts')).GAMES.map(game => ({ type: game.type, name: game.name }));
}
(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
  activeBrowser = browser;
  const allGames = readGameInventory();
  if (testSubset) {
    const unknown = testSubset.filter(type => !allGames.some(game => game.type === type));
    if (unknown.length) throw new Error('Unknown catalog game types: ' + unknown.join(', '));
  }
  fs.writeFileSync(path.join(work, 'game-catalog-inventory.json'), JSON.stringify(allGames, null, 2));
  const games = testSubset ? allGames.filter(game => testSubset.includes(game.type)) : allGames;
  console.log('Catalog games: ' + games.length);
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    let active;
    page.on('pageerror', error => active?.pageErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') active?.consoleErrors.push(message.text()); });
    page.on('dialog', dialog => dialog.dismiss());
    for (const game of games) {
      active = { game: game.type, name: game.name, viewport: viewport.width, pageErrors: [], consoleErrors: [], status: 'pass' };
      try {
        await page.goto(base + '/play/' + encodeURIComponent(game.type), { waitUntil: 'domcontentloaded' });
        const normal = page.getByRole('button').filter({ hasText: '×1.0 배율' });
        await normal.waitFor({ state: 'visible', timeout: 15000 });
        await normal.click();
        const skip = page.getByRole('button', { name: /준비 완료/ });
        await skip.waitFor({ state: 'visible', timeout: 5000 });
        await skip.click();
        await page.waitForTimeout(350);
        active.layout = await page.evaluate(() => ({
          width: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          text: document.body.innerText.slice(0, 160),
          visibleButtons: [...document.querySelectorAll('button')].filter(button => button.getBoundingClientRect().width > 0).length,
          overflowing: [...document.querySelectorAll('body *')].filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && (rect.left < -2 || rect.right > window.innerWidth + 2) && getComputedStyle(el).position !== 'absolute';
          }).slice(0, 8).map(el => ({ tag: el.tagName, className: String(el.className).slice(0, 100), width: Math.round(el.getBoundingClientRect().width) })),
        }));
        if (active.pageErrors.length || active.layout.documentWidth > viewport.width + 2 || !active.layout.text.trim() || active.layout.text.includes('존재하지 않는 게임')) {
          active.status = 'fail';
          await page.screenshot({ path: path.join(work, `catalog-fail-${viewport.width}-${game.type}.png`), fullPage: true });
        }
      } catch (error) { active.status = 'fail'; active.error = error.message; }
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
  fs.writeFileSync(path.join(work, 'game-catalog-smoke-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ total: report.cases.length, passed: report.passed, failed: report.failed }));
  process.exitCode = report.failed ? 1 : 0;
})().catch(async error => { console.error(error); await activeBrowser?.close(); process.exitCode = 1; });
