// Plays every signature TV game from the start screen to the recorded result in a real browser.
// Usage: node scripts/signature-e2e.cjs [baseUrl]   (default http://127.0.0.1:4173, the `vite preview` port CI uses)
// Checks per game and viewport: start button → demo → tutorial → play → climax → result with TV buttons and the keyboard
// (Space once in the tutorial, twice in the main game and the last round), the phases come in order,
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
// Read from the game modules so this list cannot drift: a module with `special:true` has a special move (combo gauge),
// one with `scoreButtons:false` has a read-only scoreboard (points come from the board, not the 1~4 keys).
const moduleSource = id => fs.readFileSync(path.join(repo, 'src/presentation/components/minigames/signature/modules', `${id}.tsx`), 'utf8');
const SPECIAL = new Set(GAMES.filter(id => /\bspecial:\s*true\b/.test(moduleSource(id))));
const READ_ONLY_SCORES = new Set(GAMES.filter(id => /\bscoreButtons:\s*false\b/.test(moduleSource(id))));
assert.ok(SPECIAL.size >= 1 && READ_ONLY_SCORES.size >= 1, 'module flags were read (special / scoreButtons)');
// Phase names in the order every game must pass through (src/domain/funLoop.ts FUN_PHASE_LABEL).
const PHASE_ORDER = ['연습 판', '본게임', '마지막 승부'];
const only = process.argv[3] ? process.argv[3].split(',') : null;

async function overflow(page) {
  return page.evaluate(() => ({
    x: document.documentElement.scrollWidth - innerWidth,
    y: document.documentElement.scrollHeight - innerHeight,
  }));
}

const GUIDE_KEY = 'physical_teacher_guide_seen_v1';

/** Poll until check() is true or the time runs out (no fixed sleeps for things that should happen). */
async function poll(check, timeoutMs, stepMs = 50) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    if (await check()) return true;
    if (Date.now() >= end) return false;
    await new Promise(r => setTimeout(r, stepMs));
  }
}

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

// '오늘 수업' 중 게임을 하다가 맨 위 막대의 '이 활동 마치고 다음 활동'을 누르면 확인 창이 뜹니다.
// 창이 떠 있는 동안: 게임 시간이 멈추고, Space·P·숫자 키가 게임에 닿지 않고, Esc로 닫히며 게임이 다시 움직여야 합니다.
// 연습 판만 하고 끝낸 판은 기록 버튼이 없어야 합니다.
async function lessonConfirm(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  await context.addInitScript(key => { try { localStorage.setItem(key, '1'); } catch { /* 무시 */ } }, GUIDE_KEY);
  await context.route('**/*', route => /\.supabase\.co\//.test(route.request().url()) ? route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : route.continue());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(`${base}/today`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /시작/ }).first().click();
    await page.waitForURL(/\/play\//, { timeout: 10000 });
    const bar = page.locator('.today-bar');
    await bar.waitFor({ timeout: 5000 });
    // 준비운동은 시작하지 않았으므로 묻지 않고 본게임으로 넘어갑니다.
    await bar.locator('.today-bar-next').click();
    await page.waitForURL(/\/play\/sig-/, { timeout: 10000 });
    await page.locator('.fun-intro .fun-secondary', { hasText: /시범 건너뛰고/ }).click();
    const arena = page.locator('.fun-arena');
    await arena.waitFor();
    assert.ok(await poll(async () => await arena.getAttribute('data-phase') === 'tutorial', 5000), 'lessonConfirm: tutorial started');
    const next = bar.locator('.today-bar-next');
    assert.match(await next.innerText(), /이 활동 마치고 다음 활동/, 'lessonConfirm: the bar button is lowered while playing');
    await next.click();
    const ask = page.locator('.today-bar-ask');
    await ask.waitFor({ timeout: 3000 });
    assert.equal(await ask.getAttribute('aria-modal'), 'true', 'lessonConfirm: modal dialog');
    assert.ok(await poll(async () => await arena.getAttribute('data-paused') === 'true', 3000), 'lessonConfirm: the game is paused while asking');
    assert.ok(await page.evaluate(() => !!document.activeElement?.closest('.today-bar-ask')), 'lessonConfirm: focus is inside the dialog');
    const scoreBefore = await page.locator('.fun-team-score').first().innerText();
    await page.keyboard.press('1');
    await page.keyboard.press('p');
    for (let i = 0; i < 5; i++) await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => !!document.activeElement?.closest('.today-bar-ask')), 'lessonConfirm: Tab stays inside the dialog');
    await page.waitForTimeout(300);
    assert.equal(await arena.getAttribute('data-phase'), 'tutorial', 'lessonConfirm: keys do not move the game');
    assert.equal(await arena.getAttribute('data-paused'), 'true', 'lessonConfirm: P does not resume behind the dialog');
    assert.equal(await page.locator('.fun-team-score').first().innerText(), scoreBefore, 'lessonConfirm: 1 does not score behind the dialog');
    assert.equal(await ask.count(), 1, 'lessonConfirm: the dialog stays open');
    // 확인 창이 떠 있는 동안 덮개에는 '다시 시작'이 없고 '확인 창에서 골라 주세요'만 보입니다.
    // 덮개(무대)를 마우스로 눌러도(무대 전체가 inert) 게임은 멈춘 채, 확인 창은 그대로, 초점도 창 안에 남습니다.
    const cover = page.locator('.fun-paused[data-confirming]');
    assert.equal(await cover.count(), 1, 'lessonConfirm: the confirming cover is shown behind the dialog');
    assert.equal(await page.locator('.fun-paused button').count(), 0, 'lessonConfirm: no resume button on the cover while asking');
    assert.match(await cover.innerText(), /확인 창에서 골라 주세요/, 'lessonConfirm: the cover points to the dialog');
    const coverBox = await cover.boundingBox();
    await page.mouse.click(coverBox.x + coverBox.width / 2, coverBox.y + coverBox.height * 0.6);
    await page.waitForTimeout(300);
    assert.equal(await arena.getAttribute('data-paused'), 'true', 'lessonConfirm: a mouse click on the cover does not resume behind the dialog');
    assert.ok(await page.evaluate(() => !!document.activeElement?.closest('.today-bar-ask')), 'lessonConfirm: a click on the arena keeps focus in the dialog');
    assert.equal(await arena.getAttribute('inert'), '', 'lessonConfirm: the arena is inert while the dialog is open');
    assert.equal(await ask.count(), 1, 'lessonConfirm: the dialog stays open after the click');
    await page.keyboard.press('Escape');
    await ask.waitFor({ state: 'detached', timeout: 3000 });
    assert.ok(await poll(async () => await arena.getAttribute('data-paused') === null, 3000), 'lessonConfirm: Esc resumes the game');
    assert.match(await page.evaluate(() => document.activeElement?.textContent || ''), /이 활동 마치고 다음 활동/, 'lessonConfirm: focus returns to the bar button');
    // 일시정지 덮개의 '다시 시작', 음성 설정 단추에 초점이 있으면 Space는 그 버튼을 누릅니다(게임을 넘기지 않습니다).
    await page.keyboard.press('p');
    assert.ok(await poll(async () => await arena.getAttribute('data-paused') === 'true', 3000), 'nativeSpace: P pauses');
    assert.ok(await poll(async () => await page.evaluate(() => !!document.activeElement?.closest('.fun-paused')), 3000), 'nativeSpace: focus moves to the resume button');
    await page.keyboard.press('Space');
    assert.ok(await poll(async () => await arena.getAttribute('data-paused') === null, 3000), 'nativeSpace: Space on the resume button resumes');
    assert.equal(await arena.getAttribute('data-phase'), 'tutorial', 'nativeSpace: Space on the resume button does not advance the game');
    await page.locator('.fun-head .tv-voice-more').focus();
    await page.keyboard.press('Space');
    assert.ok(await poll(async () => await page.locator('.tv-voice-panel').count() === 1, 3000), 'nativeSpace: Space opens the voice settings');
    assert.equal(await arena.getAttribute('data-phase'), 'tutorial', 'nativeSpace: Space on the voice button does not advance the game');
    await page.keyboard.press('Escape');
    // 확인 창은 '취소'에 초점을 두고 엽니다: Space를 눌러도 게임이 끝나거나 다음 활동으로 넘어가지 않습니다.
    await next.click();
    await ask.waitFor({ timeout: 3000 });
    assert.match(await page.evaluate(() => document.activeElement?.textContent || ''), /^취소$/, 'lessonConfirm: the dialog opens with focus on 취소');
    const urlBefore = page.url();
    await page.keyboard.press('Space');
    await ask.waitFor({ state: 'detached', timeout: 3000 });
    await page.waitForTimeout(300);
    assert.equal(await arena.getAttribute('data-phase'), 'tutorial', 'lessonConfirm: Space in the dialog does not end or advance the game');
    assert.equal(page.url(), urlBefore, 'lessonConfirm: Space in the dialog does not leave the activity');
    assert.equal(await page.locator('.fun-result').count(), 0, 'lessonConfirm: Space in the dialog does not open the result');
    // '결과 발표 보기'를 눌러야 결과로 갑니다.
    await next.click();
    await ask.waitFor({ timeout: 3000 });
    await ask.getByRole('button', { name: '결과 발표 보기' }).click();
    await page.locator('.fun-result').waitFor({ timeout: 5000 });
    // 연습 판에서 끝냈으므로 기록 버튼이 없습니다.
    assert.equal(await page.locator('.fun-result[data-practice]').count(), 1, 'lessonConfirm: practice-only result');
    assert.equal(await page.locator('.fun-result button', { hasText: /기록하기/ }).count(), 0, 'lessonConfirm: a practice-only round cannot be recorded');
    // 오늘 수업에서 연 게임의 결과 화면은 '오늘 수업으로' 돌아갑니다(‘활동 목록으로’가 아님).
    assert.equal(await page.locator('.fun-result button', { hasText: /^오늘 수업으로$/ }).count(), 1, 'lessonConfirm: the result goes back to 오늘 수업');
    assert.equal(await page.locator('.fun-result button', { hasText: /^활동 목록으로$/ }).count(), 0, 'lessonConfirm: no 활동 목록으로 inside a lesson');
    assert.deepEqual(errors, [], 'lessonConfirm: no page errors');
  } catch (error) {
    await page.screenshot({ path: path.join(out, 'lesson-confirm-failure.png'), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

// '■ 끝내기'는 두 번 눌러야 끝나고, 휴대폰 리모컨 창을 연 동안에는 판이 멈추고 Space로 게임이 넘어가지 않습니다.
async function controlGuards(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  await context.addInitScript(key => { try { localStorage.setItem(key, '1'); } catch { /* 무시 */ } }, GUIDE_KEY);
  await context.route('**/*', route => /\.supabase\.co\//.test(route.request().url()) ? route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : route.continue());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(`${base}/play/sig-signal-captain`, { waitUntil: 'networkidle' });
    await page.locator('.fun-intro .fun-secondary', { hasText: /시범 건너뛰고/ }).click();
    const arena = page.locator('.fun-arena');
    assert.ok(await poll(async () => await arena.getAttribute('data-phase') === 'tutorial', 5000), 'controlGuards: tutorial started');
    // 끝내기: 한 번 누르면 알리기만, 3초 안에 한 번 더 누르면 결과.
    const end = page.locator('.fun-controls button[data-command="end"]');
    await end.click();
    await page.waitForTimeout(300);
    assert.equal(await arena.getAttribute('data-phase'), 'tutorial', 'controlGuards: one press of 끝내기 does not end the round');
    assert.match(await end.innerText(), /한 번 더 누르면 끝나요/, 'controlGuards: the button asks for a second press');
    assert.equal(await page.locator('.fun-skip-hint[data-kind="end"]').count(), 1, 'controlGuards: the end hint is shown');
    assert.ok(await poll(async () => /^■ 끝내기$/.test((await end.innerText()).trim()), 4500), 'controlGuards: the second press expires after 3 seconds');
    // 리모컨 창: 본게임에서 열면 판이 멈추고, Space(초점 없음)로 넘어가지 않고, 닫으면 다시 움직입니다.
    await page.locator('.fun-controls button[data-command="next"]').click();
    assert.ok(await poll(async () => await arena.getAttribute('data-phase') === 'play', 3000), 'controlGuards: main round');
    await page.locator('.fun-remote-btn').click();
    await page.locator('.fun-remote-panel').waitFor({ timeout: 3000 });
    assert.ok(await poll(async () => await arena.getAttribute('data-paused') === 'true', 3000), 'controlGuards: the round pauses while the remote panel is open');
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    assert.equal(await arena.getAttribute('data-phase'), 'play', 'controlGuards: Space does not skip while the remote panel is open');
    // Space on the 📱 button presses the button itself (closes the panel) instead of moving the game.
    await page.locator('.fun-remote-btn').focus();
    await page.keyboard.press('Space');
    await page.locator('.fun-remote-panel').waitFor({ state: 'detached', timeout: 3000 });
    assert.equal(await arena.getAttribute('data-phase'), 'play', 'controlGuards: Space on the remote button does not skip');
    assert.ok(await poll(async () => await arena.getAttribute('data-paused') === null, 3000), 'controlGuards: closing the panel resumes the round');
    // 리모컨 창을 연 채 P로 다시 시작하면 창이 닫히고 판이 움직입니다(창 뒤에서 흐르지 않게).
    // 그 뒤 선생님이 직접 멈추고 창을 열었다 닫아도, 직접 건 일시정지는 그대로입니다.
    await page.locator('.fun-remote-btn').click();
    await page.locator('.fun-remote-panel').waitFor({ timeout: 3000 });
    assert.ok(await poll(async () => await arena.getAttribute('data-paused') === 'true', 3000), 'panelHold: opening pauses');
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('p');
    await page.locator('.fun-remote-panel').waitFor({ state: 'detached', timeout: 3000 });
    assert.ok(await poll(async () => await arena.getAttribute('data-paused') === null, 3000), 'panelHold: P with the panel open resumes and closes the panel');
    await page.keyboard.press('p');
    assert.ok(await poll(async () => await arena.getAttribute('data-paused') === 'true', 3000), 'panelHold: manual pause');
    await page.locator('.fun-remote-btn').click();
    await page.locator('.fun-remote-panel').waitFor({ timeout: 3000 });
    await page.keyboard.press('Escape');
    await page.locator('.fun-remote-panel').waitFor({ state: 'detached', timeout: 3000 });
    await page.waitForTimeout(300);
    assert.equal(await arena.getAttribute('data-paused'), 'true', 'panelHold: Esc closes the panel and keeps the teacher\'s own pause');
    await page.keyboard.press('p');
    assert.ok(await poll(async () => await arena.getAttribute('data-paused') === null, 3000), 'panelHold: P resumes');
    // 게임 중 '← 목록'은 바로 나가지 않고 묻습니다(취소에 초점, 묻는 동안 멈춤, Esc는 취소).
    await page.locator('.fun-exit').click();
    const leaveAsk = page.locator('.fun-leave-ask');
    await leaveAsk.waitFor({ timeout: 3000 });
    assert.match(await page.evaluate(() => document.activeElement?.textContent || ''), /^취소$/, 'leaveAsk: focus on 취소');
    assert.ok(await poll(async () => await arena.getAttribute('data-paused') === 'true', 3000), 'leaveAsk: the round is held while asking');
    assert.ok(page.url().includes('/play/sig-signal-captain'), 'leaveAsk: still on the game');
    await page.keyboard.press('Escape');
    await leaveAsk.waitFor({ state: 'detached', timeout: 3000 });
    assert.ok(await poll(async () => await arena.getAttribute('data-paused') === null, 3000), 'leaveAsk: Esc cancels and resumes');
    // 끝내기 두 번이면 결과 발표.
    await end.click();
    await end.click();
    await page.locator('.fun-result').waitFor({ timeout: 5000 });
    assert.equal(await page.locator('.fun-result button', { hasText: /^활동 목록으로$/ }).count(), 1, 'controlGuards: outside a lesson the result still says 활동 목록으로');
    assert.deepEqual(errors, [], 'controlGuards: no page errors');
  } catch (error) {
    await page.screenshot({ path: path.join(out, 'control-guards-failure.png'), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

// 화면 자리 약속: 나가기는 왼쪽 위, '다음'은 오른쪽 아래(그 왼쪽이 일시정지), 남은 시간 막대, 팀 모양, 차례 표시, TV 모드.
async function layoutRules(browser) {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 360, height: 640 }, { width: 844, height: 390 }]) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    await context.addInitScript(key => { try { localStorage.setItem(key, '1'); } catch { /* 무시 */ } }, GUIDE_KEY);
    await context.route('**/*', route => /\.supabase\.co\//.test(route.request().url()) ? route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : route.continue());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const tag = `layoutRules ${viewport.width}x${viewport.height}`;
    try {
      await page.goto(`${base}/play/sig-memory-relay?teams=4`, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('.fun-intro .fun-primary').count(), 1, `${tag}: one primary button on the start screen`);
      await page.locator('.fun-intro .fun-secondary', { hasText: /시범 건너뛰고/ }).click();
      const arena = page.locator('.fun-arena');
      assert.ok(await poll(async () => await arena.getAttribute('data-phase') === 'tutorial', 5000), `${tag}: tutorial started`);
      const measure = () => page.evaluate(() => {
        const box = sel => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
        const a = document.querySelector('.fun-arena');
        const buttons = [...document.querySelectorAll('.fun-controls button')].map(e => { const b = e.getBoundingClientRect(); return { c: e.dataset.command, l: b.left, t: b.top, r: b.right, b: b.bottom }; });
        return { exit: box('.fun-dock .fun-exit'), bar: box('.fun-timebar i'), barLevel: document.querySelector('.fun-timebar')?.dataset.level, buttons, overflow: a.scrollWidth - a.clientWidth,
          shapes: [...document.querySelectorAll('.fun-scoreboard .fun-team-shape')].map(e => e.textContent), turn: a.dataset.turn ?? null, chip: document.querySelector('.fun-turn-chip')?.textContent ?? '',
          turnCells: document.querySelectorAll('.fun-scoreboard li[data-turn]').length, timerRole: document.querySelector('.fun-timer')?.getAttribute('role'), primaries: document.querySelectorAll('.fun-body .fun-primary, .fun-controls button[data-tone="primary"]').length };
      });
      const check = async label => {
        const m = await measure();
        assert.ok(m.overflow <= 1, `${tag} ${label}: no horizontal overflow`);
        assert.ok(m.exit && m.exit.l < viewport.width / 3 && m.exit.t < 130, `${tag} ${label}: the leave button is top-left`);
        const next = m.buttons.find(b => b.c === 'next'), pause = m.buttons.find(b => b.c === 'pause');
        const maxRight = Math.max(...m.buttons.map(b => b.r)), maxBottom = Math.max(...m.buttons.map(b => b.b));
        assert.ok(next && next.r >= maxRight - 1 && next.b >= maxBottom - 1, `${tag} ${label}: 다음 is the bottom-right control`);
        assert.ok(pause && Math.abs(pause.t - next.t) <= 2 && pause.r <= next.l + 1 && next.l - pause.r <= 14, `${tag} ${label}: 일시정지 sits just left of 다음`);
        assert.ok(m.bar && m.bar.r - m.bar.l > 4 && m.barLevel, `${tag} ${label}: the time bar is drawn`);
        assert.equal(m.timerRole, 'timer', `${tag} ${label}: the time readout is a timer`);
        assert.deepEqual(m.shapes, ['●', '▲', '■', '◆'], `${tag} ${label}: each team has its shape`);
        assert.ok(m.turn !== null && /팀 차례/.test(m.chip) && m.turnCells === 1, `${tag} ${label}: the team whose turn it is is named and marked`);
        assert.ok(m.primaries <= 1, `${tag} ${label}: at most one primary button`);
      };
      await check('standard');
      // TV 모드: 켜면 설명 줄이 숨고, Esc로 꺼진다(열린 창이 없을 때).
      const tvButton = page.locator('.fun-dock .fun-tv-btn');
      await tvButton.click();
      assert.ok(await poll(async () => await page.evaluate(() => document.documentElement.dataset.tvMode) === 'on', 3000), `${tag}: TV mode turns on`);
      assert.equal(await tvButton.getAttribute('aria-pressed'), 'true', `${tag}: the TV mode button shows it is on`);
      assert.equal(await page.locator('.fun-arena .fun-hint').evaluateAll(list => list.filter(e => e.getClientRects().length).length), 0, `${tag}: TV mode hides the small hint line`);
      await check('tv mode');
      if (await page.evaluate(() => !!document.fullscreenElement)) await page.evaluate(() => document.exitFullscreen());
      else await page.keyboard.press('Escape');
      assert.ok(await poll(async () => await page.evaluate(() => document.documentElement.dataset.tvMode) !== 'on', 3000), `${tag}: Esc (or leaving fullscreen) turns TV mode off`);
      assert.equal(await arena.getAttribute('data-phase'), 'tutorial', `${tag}: leaving TV mode does not change the round`);
      // 결과: 주 버튼 하나, 팀 모양, 나가기는 그대로 왼쪽 위.
      const end = page.locator('.fun-controls button[data-command="end"]');
      await end.click(); await end.click();
      await page.locator('.fun-result').waitFor({ timeout: 5000 });
      assert.equal(await page.locator('.fun-result .fun-primary').count(), 1, `${tag}: one primary button on the result screen`);
      const exitBox = await page.locator('.fun-dock .fun-exit').boundingBox();
      assert.ok(exitBox && exitBox.x < viewport.width / 3 && exitBox.y < 130, `${tag}: the leave button stays top-left on the result screen`);
      assert.deepEqual(errors, [], `${tag}: no page errors`);
    } catch (error) {
      await page.screenshot({ path: path.join(out, `layout-rules-${viewport.width}-failure.png`), fullPage: true }).catch(() => {});
      throw error;
    } finally {
      await context.close();
    }
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
      // Nothing should happen here, so there is nothing to poll for: look again after a moment.
      await page.waitForTimeout(400);
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
      // Turn games can move on between the check above and the key press: retry on whichever team is on turn now.
      let scored = false;
      for (let attempt = 0; attempt < 3 && !scored; attempt++) {
        for (let t = 0; t < run.teams; t++) if (await plus.nth(t).isEnabled()) { team = t; break; }
        const before = await scoreOf(team);
        await page.keyboard.press(String(team + 1));
        scored = await poll(async () => await scoreOf(team) === before + 1, 2000);
      }
      assert.ok(scored, `${id} ${run.name}: key ${team + 1} gives that team +1`);
    }
    // Keyboard: Space is "next". The tutorial moves on with one press; the main game and the last round end the round
    // early, so the first press only shows "press once more" and the second press (within 3s) moves on.
    const phaseName = async () => (await page.locator('.fun-phase').first().innerText().catch(() => '')).trim();
    const waitPhase = async name => assert.ok(await poll(async () => await phaseName() === name, 5000), `${id} ${run.name}: reached ${name} (now ${await phaseName()})`);
    await waitPhase(PHASE_ORDER[0]);
    phases.push(await phaseName());
    await page.keyboard.press('Space');
    await waitPhase(PHASE_ORDER[1]);
    phases.push(await phaseName());
    await measure();
    await page.keyboard.press('Space');
    await page.locator('.fun-skip-hint').waitFor({ timeout: 3000 });
    assert.equal(await phaseName(), PHASE_ORDER[1], `${id} ${run.name}: one Space does not skip the main game`);
    await page.keyboard.press('Space');
    await waitPhase(PHASE_ORDER[2]);
    phases.push(await phaseName());
    await measure();
    assert.equal(await page.locator('.fun-skip-hint').count(), 0, `${id} ${run.name}: the hint clears when the phase changes`);
    await page.keyboard.press('Space');
    await page.locator('.fun-skip-hint').waitFor({ timeout: 3000 });
    assert.equal(await page.locator('.fun-result').count(), 0, `${id} ${run.name}: one Space does not end the last round`);
    await page.keyboard.press('Space');
    await page.locator('.fun-result').waitFor({ timeout: 10000 });
    assert.deepEqual(phases, PHASE_ORDER, `${id} ${run.name}: phases in order`);
    await measure();
    await page.screenshot({ path: path.join(out, `${id}-${run.name}-result.png` ) });
    // Record the play (TV button) and confirm it is stored once.
    await page.locator('.fun-result button', { hasText: /기록하기/ }).first().click();
    const playsOf = () => page.evaluate(game => {
      try { return (JSON.parse(localStorage.getItem('physical_class_progress_v1') || '{}').plays || []).filter(p => p.id === game).length; }
      catch { return -1; }
    }, id);
    await poll(async () => await playsOf() >= 1, 3000);
    assert.equal(await playsOf(), 1, `${id} ${run.name}: one recorded play`);
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
    if (!only) { await lessonConfirm(browser); console.log('PASS lesson-confirm'); }
    if (!only) { await controlGuards(browser); console.log('PASS control-guards'); }
    if (!only) { await layoutRules(browser); console.log('PASS layout-rules'); }
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
