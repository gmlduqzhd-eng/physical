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
// Games whose scoreboard is read-only (points come from the board, not 1~4 keys): src/presentation/components/minigames/signature/modules/*.tsx scoreButtons:false
const READ_ONLY_SCORES = new Set(['sig-move-bingo']);
const only = process.argv[3] ? process.argv[3].split(',') : null;

async function overflow(page) {
  return page.evaluate(() => ({
    x: document.documentElement.scrollWidth - innerWidth,
    y: document.documentElement.scrollHeight - innerHeight,
  }));
}

const GUIDE_KEY = 'physical_teacher_guide_seen_v1';

// 처음 쓰는 선생님 안내: 첫 방문에 한 번 뜨고, Esc로 닫히고, 다시 열어도 또 뜨지 않아야 합니다.
async function guideOnce(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(`${base}/play/sig-signal-captain`, { waitUntil: 'networkidle' });
    const backdrop = page.locator('.tqg-backdrop');
    await backdrop.waitFor({ state: 'visible', timeout: 10000 });
    await page.keyboard.press('Escape');
    await backdrop.waitFor({ state: 'detached', timeout: 5000 });
    await page.reload({ waitUntil: 'networkidle' });
    // 시작 화면이 다 그려진 뒤에도 1.5초 동안 안내가 다시 뜨지 않아야 합니다(안내는 늦게 불러오는 조각이라 바로 보면 놓칠 수 있어요).
    await page.locator('.fun-intro .fun-primary').first().waitFor({ state: 'visible', timeout: 10000 });
    for (let t = 0; t < 6; t++) {
      if (await backdrop.count()) throw new Error('guideOnce: 안내가 다시 떴어요');
      await page.waitForTimeout(250);
    }
    assert.deepEqual(errors, [], 'guideOnce: no page errors');
  } finally {
    await context.close();
  }
}

async function playOne(browser, run, id) {
  const context = await browser.newContext({ viewport: run.viewport, serviceWorkers: 'block' });
  // 첫 방문 1분 안내는 guideOnce에서 따로 확인하고, 게임 진행 검사에서는 이미 본 것으로 둡니다.
  await context.addInitScript(key => { try { localStorage.setItem(key, '1'); } catch { /* 무시 */ } }, GUIDE_KEY);
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
    await measure();
    // TV button: the first control in the teacher bar advances demo → tutorial.
    const controls = page.locator('.fun-controls button');
    await controls.first().click();
    await page.waitForTimeout(300);
    await measure();
    // Every signature game shows a scoreboard from the tutorial on, with one column per chosen team.
    const board = page.locator('.fun-scoreboard').first();
    await board.waitFor({ timeout: 5000 });
    assert.equal(await board.getAttribute('data-teams'), String(run.teams), `${id} ${run.name}: scoreboard teams`);
    assert.equal(await board.locator('.fun-team-score').count(), run.teams, `${id} ${run.name}: one score per team`);
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
    // Give a point with the keyboard (1~4 = that team +1) to a team whose TV +1 button is on (turn games allow only
    // the team on turn); the score must go up by one. Read-only boards have no ± buttons and ignore the key.
    const scoreOf = async team => Number(await board.locator('.fun-team-score').nth(team).innerText());
    if (READ_ONLY_SCORES.has(id)) {
      assert.equal(await board.locator('.fun-plus').count(), 0, `${id} ${run.name}: read-only board has no +1 buttons`);
      const before = await scoreOf(0);
      await page.keyboard.press('1');
      await page.waitForTimeout(200);
      assert.equal(await scoreOf(0), before, `${id} ${run.name}: key 1 does not change a read-only board`);
    } else {
      const plus = board.locator('.fun-plus');
      // Turn games open scoring after a short "watch first" moment (memory relay shows the order first): wait for it.
      let team = -1;
      for (let wait = 0; wait < 60 && team < 0; wait++) {
        for (let t = 0; t < run.teams; t++) if (await plus.nth(t).isEnabled()) { team = t; break; }
        if (team < 0) await page.waitForTimeout(250);
      }
      assert.ok(team >= 0, `${id} ${run.name}: some team can score in the tutorial`);
      const before = await scoreOf(team);
      await page.keyboard.press(String(team + 1));
      await page.waitForTimeout(200);
      assert.equal(await scoreOf(team), before + 1, `${id} ${run.name}: key ${team + 1} gives that team +1`);
    }
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
    if (!only) { await guideOnce(browser); console.log('PASS guide-once'); }
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
