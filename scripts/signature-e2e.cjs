// Plays every signature TV game from the start screen to the recorded result in a real browser.
// Usage: node scripts/signature-e2e.cjs [baseUrl]   (default http://127.0.0.1:4173, the `vite preview` port CI uses)
// Checks per game and viewport: start button → demo → tutorial → play → climax → result with TV buttons and the keyboard,
// no horizontal overflow (and no vertical overflow on the 1280x800 TV), the result ceremony shows, recording saves a play,
// and the page throws no errors.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const repo = path.resolve(__dirname, '..');
const { chromium } = createRequire(path.join(repo, 'package.json'))(process.env.PLAYWRIGHT_MODULE || 'playwright');

const base = process.argv[2] || 'http://127.0.0.1:4173';
const out = path.resolve(process.env.TEST_OUTPUT_DIR || path.join(repo, 'test-results', 'signature-e2e'));
fs.mkdirSync(out, { recursive: true });
// Same list as SIGNATURE_GAMES (src/domain/signatureGames.ts); kept literal so this script needs no TS loader in CI.
const GAMES = ['sig-signal-captain', 'sig-boss-raid', 'sig-move-bingo', 'sig-memory-relay', 'sig-mirror-pair', 'sig-stage-show'];
const RUNS = [
  { name: 'tv', viewport: { width: 1280, height: 800 }, teams: 4, checkVertical: true },
  { name: 'phone', viewport: { width: 390, height: 844 }, teams: 2, checkVertical: false },
];
const SPECIAL = new Set(['sig-boss-raid']); // games whose module defines a special move (src/domain/signature/*.ts)
const only = process.argv[3] ? process.argv[3].split(',') : null;

async function overflow(page) {
  return page.evaluate(() => ({
    x: document.documentElement.scrollWidth - innerWidth,
    y: document.documentElement.scrollHeight - innerHeight,
  }));
}

async function playOne(browser, run, id) {
  const context = await browser.newContext({ viewport: run.viewport, serviceWorkers: 'block' });
  // No remote backend in this test: answer Supabase calls with empty data so nothing leaves the machine.
  await context.route('**/*', route => {
    const url = route.request().url();
    if (/\.supabase\.co\//.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    return route.continue();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const phases = [];
  let worst = { x: 0, y: 0 };
  const measure = async () => { const o = await overflow(page); worst = { x: Math.max(worst.x, o.x), y: Math.max(worst.y, o.y) }; };
  try {
    await page.goto(`${base}/play/${id}`, { waitUntil: 'networkidle' });
    // Team count on the start screen ("4팀 (청팀·홍팀·황팀·녹팀)", "2팀 (…)").
    const teamButton = page.locator('.fun-choice button', { hasText: new RegExp(`^${run.teams}팀`) });
    await teamButton.first().click();
    assert.equal(await teamButton.first().getAttribute('aria-pressed'), 'true', `${id} ${run.name}: ${run.teams} teams selected`);
    // TV button: the big start button (demo first).
    await page.locator('.fun-intro .fun-primary').first().click();
    await page.locator('.fun-arena').waitFor();
    // Games with a scoreboard must show one column per chosen team.
    const board = page.locator('.fun-scoreboard').first();
    if (await board.count()) assert.equal(await board.getAttribute('data-teams'), String(run.teams), `${id} ${run.name}: scoreboard teams`);
    await measure();
    // TV button: the first control in the teacher bar advances demo → tutorial.
    const controls = page.locator('.fun-controls button');
    await controls.first().click();
    await page.waitForTimeout(300);
    await measure();
    // Only the game with a special move shows the combo gauge (boss raid); the others never offer it.
    assert.equal(await page.locator('.fun-combo').count() > 0, SPECIAL.has(id), `${id} ${run.name}: combo gauge only where a special exists`);
    // Keyboard pause: the play area becomes inert and focus lands on the resume button; P again resumes.
    await page.keyboard.press('p');
    await page.locator('.fun-paused').waitFor();
    assert.equal(await page.locator('.fun-body').getAttribute('inert'), '', `${id} ${run.name}: paused play area is inert`);
    assert.match(await page.evaluate(() => document.activeElement?.textContent || ''), /다시 시작/, `${id} ${run.name}: focus on resume`);
    await page.keyboard.press('p');
    await page.locator('.fun-paused').waitFor({ state: 'detached' });
    assert.equal(await page.locator('.fun-body').getAttribute('inert'), null, `${id} ${run.name}: resumed`);
    // Give a point with the keyboard (1 = first team +1) when the game takes scoreboard points.
    await page.keyboard.press('1');
    // Keyboard: Space is always "next". Walk the remaining phases to the result.
    for (let i = 0; i < 12; i++) {
      if (await page.locator('.fun-result').count()) break;
      const phase = await page.locator('.fun-phase').first().innerText().catch(() => '');
      if (phase && phases.at(-1) !== phase) phases.push(phase);
      await page.keyboard.press('Space');
      await page.waitForTimeout(400);
      await measure();
    }
    await page.locator('.fun-result').waitFor({ timeout: 10000 });
    await measure();
    await page.screenshot({ path: path.join(out, `${id}-${run.name}-result.png` ) });
    // Record the play (TV button) and confirm it is stored once.
    await page.locator('.fun-result button', { hasText: /기록하기/ }).first().click();
    await page.waitForTimeout(300);
    const plays = await page.evaluate(game => {
      try { return (JSON.parse(localStorage.getItem('physical_class_progress_v1') || '{}').plays || []).filter(p => p.id === game).length; }
      catch { return -1; }
    }, id);
    assert.equal(plays, 1, `${id} ${run.name}: one recorded play`);
    assert.ok(worst.x <= 1, `${id} ${run.name}: no horizontal overflow (${worst.x}px)`);
    if (run.checkVertical) assert.ok(worst.y <= 2, `${id} ${run.name}: TV fits one screen (${worst.y}px over)`);
    assert.deepEqual(errors, [], `${id} ${run.name}: no page errors`);
    return { id, run: run.name, phases, overflow: worst };
  } catch (error) {
    await page.screenshot({ path: path.join(out, `${id}-${run.name}-failure.png`), fullPage: true }).catch(() => {});
    error.message = `${id} ${run.name}: ${error.message}`;
    throw error;
  } finally {
    await context.close();
  }
}

(async () => {
  const started = Date.now();
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined, headless: true });
  const results = [];
  try {
    for (const run of RUNS) for (const id of GAMES) {
      if (only && !only.includes(id)) continue;
      const r = await playOne(browser, run, id);
      results.push(r);
      console.log('PASS', r.id, r.run, r.phases.join(' → '));
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ base, results }, null, 2));
  console.log(JSON.stringify({ passed: results.length, seconds: Math.round((Date.now() - started) / 1000) }));
})().catch(error => { console.error(error); process.exit(1); });
