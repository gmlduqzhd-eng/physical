// Complete games through their public UI. Virtual time accelerates waiting only;
// no React state, scoring callback or completion handler is modified.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('tsx/cjs');
const { GAMES } = require('../src/domain/gamesData.ts');
const { EXPRESSION_GAMES } = require('../src/presentation/components/minigames/expression/expressionGamesData.ts');
const base = process.env.AUDIT_URL || 'http://127.0.0.1:5175';
const output = path.resolve(process.env.AUDIT_OUTPUT || 'test-results/solo-completion');
const subset = process.env.GAMES ? process.env.GAMES.split(',') : null;
const expressions = new Map(EXPRESSION_GAMES.map(game => [game.id, game]));
const games = GAMES.filter(game => (!subset || subset.includes(game.type)) && (!process.env.FAMILY || process.env.FAMILY !== 'expression' || expressions.has(game.type))).filter((_,index)=>!process.env.SHARD_TOTAL || index % Number(process.env.SHARD_TOTAL) === Number(process.env.SHARD_INDEX));
const report = { base, scope: 'UI completion, one local result, no late duplicate, replay and return. Virtual timers; sensor/microphone fallbacks, not physical-device evidence.', cases: [] };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
fs.mkdirSync(output, { recursive: true });
const save = () => fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
async function run() {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
  try {
    for (const game of games) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      page.setDefaultTimeout(1500);
      const item = { id: game.type, name: game.name, status: 'running', errors: [], actions: [], virtualMs: 0 };
      const started = Date.now();
      page.on('pageerror', error => item.errors.push(error.stack || error.message));
      page.on('console', message => { if(message.type()==='error' && /Cannot update a component|Maximum update depth|Too many re-renders|React error/.test(message.text())) item.errors.push(message.text()); });
      page.on('dialog', dialog => dialog.dismiss());
      const content = page.locator('.gameplay-content');
      const finished = async () => await page.locator('.game-result-overlay').count() > 0;
      const advance = async ms => { await page.clock.runFor(ms); item.virtualMs += ms; await sleep(8); };
      const tap = async (locator, label = '') => {
        if (await finished()) return false;
        if (!await locator.count() || !await locator.isVisible() || !await locator.isEnabled()) return false;
        try { const name = label || (await locator.textContent())?.trim().slice(0, 70) || 'tap'; await locator.evaluate(el => el.scrollIntoView({block:'center'})); const b=await locator.boundingBox(); await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2); item.actions.push(name); return true; }
        catch { return false; }
      };
      const button = regex => content.getByRole('button', { name: regex }).first();
      const circle = async (locator, turns = 1) => {
        const box = await locator.boundingBox(); if (!box) return;
        const cx = box.x + box.width / 2, cy = box.y + box.height / 2, r = Math.min(box.width, box.height) * .36;
        await page.mouse.move(cx + r, cy); await page.mouse.down();
        for (let step = 1; step <= 36 * turns; step++) await page.mouse.move(cx + r * Math.cos(step / 36 * Math.PI * 2), cy + r * Math.sin(step / 36 * Math.PI * 2));
        await page.mouse.up(); item.actions.push('pointer rotation ' + turns);
      };
      try {
        if (game.type === 'fate_card') await page.addInitScript(() => { Math.random = () => 0; });
        await page.clock.install();
        await page.goto(base + '/solo/play/' + game.type, { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: '활동 시작', exact: true }).waitFor({ timeout: 15000 });
        await page.clock.pauseAt(new Date(Date.now() + 100));
        await page.getByRole('button', { name: '활동 시작', exact: true }).tap();
        await sleep(30);
        const skip = page.getByRole('button', { name: /준비 완료/ });
        if (await skip.count()) await skip.tap();
        await sleep(30);
        await content.waitFor({ state: 'visible' });
        const intro = button(/활동 시작하기/);
        if (await intro.count()) { await tap(intro); for (let n = 0; n < 4; n++) await advance(1000); }

        if (expressions.has(game.type)) {
          item.stepsVisited = [];
          for (const step of expressions.get(game.type).steps) {
            item.stepsVisited.push(step.title);
            await advance(1000);
            assert.ok(await tap(button(/다음 단계|활동 마치고 평가하기/)), 'step button: ' + step.title);
          }
          for (const rating of await content.getByRole('button', { name: / 3점$/ }).all()) await tap(rating);
          const reflection = content.locator('textarea');
          if (await reflection.count()) await reflection.fill('예시 체험에서 동작 순서와 표현 방법을 돌아봤어요.');
          assert.ok(await tap(button(/평가 완료 및 활동 결과 보기/)), 'rubric submission');
        } else if (['plank', 'one_leg'].includes(game.type)) {
          const box = await content.locator('h1').boundingBox();
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          for (let n = 0; n < 32 && !await finished(); n++) await advance(1000);
          await page.mouse.up(); item.actions.push('continuous surface hold');
        } else if (game.type === 'reaction') {
          await tap(content.locator('h1'));
          for(let n=0;n<65 && !await content.getByText('지금!', {exact:true}).count();n++) await advance(100);
          await tap(content.locator('h1'));
        } else if (game.type === 'mobility-joint-circle') {
          await circle(content.locator('.touch-none'), 4);
        } else if (game.type === 'ribbon-wave-stream') {
          await circle(content.locator('.touch-none'), 6);
        } else if (game.type === 'shadow-pose-sculpture') {
          const ranges=content.locator('input[type="range"]');
          for(const [i,ratio] of [[0,.5],[1,.375]]) {const b=await ranges.nth(i).boundingBox();await page.touchscreen.tap(b.x+b.width*ratio,b.y+b.height/2);}
          await tap(button(/목표 자세 일치/));
        } else if (game.type === 'step-mania-4lane') {
          for(let n=0;n<12&&!await finished();n++){await tap(content.locator('button.animate-pulse'));await advance(550);}
        } else if (game.type === 'volleyball-apex-set') {
          for(let n=0;n<300&&!await finished();n++) { await advance(40); const hit=button(/지금 정점 스파이크/); if(await hit.count()) await tap(hit); }
        } else if (game.type === 'slingshot-archery') {
          const surface = content.locator('.touch-none'); const b = await surface.boundingBox();
          for(let n=0;n<5;n++) {
            await page.mouse.move(b.x+b.width/2,b.y+b.height-80); await page.mouse.down();
            await page.mouse.move(b.x+b.width/2,b.y+b.height-24,{steps:12}); await sleep(15); await page.mouse.up(); await advance(1500);
          }
        } else if (game.type === 'posture-spine-align') {
          for(const range of await content.locator('input[type="range"]').all()) { await range.focus(); await page.keyboard.press('Home'); for(let n=0;n<40;n++) await page.keyboard.press('ArrowRight'); }
          await tap(button(/바른 자세 확인/));
        } else if (game.type === 'pulse-zone-target') {
          for(let n=0;n<30&&!await finished();n++){await tap(button(/❤️/));await advance(430);}
        } else if (game.type === 'cpr-compression-110') {
          for(let n=0;n<32&&!await finished();n++){await tap(button(/깍지 끼고/));await advance(550);}
        } else if (game.type === 'eccentric-isom-push') {
          const b=await button(/힘 조절하기/).boundingBox(); await page.mouse.move(b.x+b.width/2,b.y+b.height/2); await page.mouse.down(); await advance(1000);
          // Power rises 4 per 50ms and falls 6 per 50ms. Keep it near 80.
          for(let n=0;n<100&&!await finished();n++){await page.mouse.up();await advance(100);await page.mouse.down();await advance(150);}
          await page.mouse.move(5, 5); await page.mouse.up();
        } else if (game.type === 'fate_card') {
          await tap(content.locator('button').nth(1), 'losing card (-300)');
        } else if (game.type === 'stopwatch') {
          await advance(7000); await tap(button(/^STOP!$/));
        } else if (game.type === 'number_grid') {
          for (let n = 1; n <= 9; n++) await tap(content.getByRole('button', { name: String(n), exact: true }));
        } else if (game.type === 'memory') {
          const names = ['Red', 'Blue', 'Green', 'Yellow']; const sequence = [];
          for (let n = 0; n < 5; n++) { await advance(1000); const tiles = await content.locator('[data-game-color="memory-tile"]').evaluateAll(els => els.map(el => ({ name: el.getAttribute('aria-label'), active: el.classList.contains('scale-105') }))); sequence.push(tiles.find(tile => tile.active)?.name); }
          await advance(1000);
          for (const name of sequence) { assert.ok(names.includes(name), 'visible memory cue'); await tap(content.getByRole('button', { name, exact: true })); await advance(250); }
        } else if (game.type === 'card_match') {
          const cards = content.locator('.grid.grid-cols-4 button'); const known = new Map(), matched = new Set();
          for (let tries = 0; tries < 80 && matched.size < 12; tries++) {
            const i = [...Array(12).keys()].find(n => !matched.has(n));
            await tap(cards.nth(i)); const face = (await cards.nth(i).innerText()).trim(); known.set(i, face);
            const j = [...known.keys()].find(n => n !== i && !matched.has(n) && known.get(n) === face) ?? [...Array(12).keys()].find(n => n !== i && !matched.has(n) && !known.has(n)) ?? [...Array(12).keys()].find(n => n !== i && !matched.has(n));
            await tap(cards.nth(j)); const other = (await cards.nth(j).innerText()).trim(); known.set(j, other);
            if (face === other) { matched.add(i); matched.add(j); }
            else await advance(700);
          }
        } else if (['circle_draw', 'trace_shape'].includes(game.type)) {
          for (let n = 0; n < 3; n++) { await circle(content.locator('.touch-none').first()); await advance(1400); }
        } else if (game.type === 'multi_touch') {
          const client = await context.newCDPSession(page);
          for (let n = 0; n < 8 && !await finished(); n++) {
            const points = await content.locator('button[aria-label]').evaluateAll(els => els.map((el,id) => { const r=el.getBoundingClientRect(); return { x:r.x+r.width/2,y:r.y+r.height/2,id }; }));
            await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
            await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            item.actions.push('simultaneous touch ' + points.length); await advance(1000);
          }
        } else if (game.type === 'speed_circle') {
          await circle(content.locator('.touch-none').first(), 11); await advance(1500);
        }

        // Timed games are exercised through available controls while each timer
        // advances one second, allowing React's normal effects to settle.
        let roundRobin = 0;
        const deny = /다시|재도전|초기화|나가기|홈으로|목록|돌아가기|이전|일시|멈춤|영상|유튜브|성취|음악|마이크|센서 권한|권한 요청|안내 보기|규칙 보기/;
        for (let tick = 0; tick < 240 && !await finished(); tick++) {
          if (game.type === 'pulse-detective') {
            for (const input of await content.locator('input[type="number"]').all()) await input.fill('20');
          }
          const entries = await content.locator('button:visible:not(:disabled)').evaluateAll(els => els.map((el,index) => ({ index, text: (el.innerText || el.getAttribute('aria-label') || '').trim(), className: el.className })));
          const allowed = entries.filter(e => !deny.test(e.text));
          const priority = allowed.filter(e => /시작|다음|완료|제출|확정|골인|확인|기록|굴리기|던지기|발사|공격|점프|스매시|열기|돌리기|[1-5]점$/.test(e.text));
          const choice = priority[roundRobin % Math.max(1, priority.length)] || allowed[roundRobin % Math.max(1, allowed.length)];
          if (choice && !(game.type === 'shuttle-run-beep' && tick > 10)) { await tap(content.locator('button:visible:not(:disabled)').nth(choice.index), choice.text); roundRobin++; }
          if (['jump','squat','run','punch','arm_raise','wave','target'].includes(game.type)) await tap(content.locator('h1').first(), 'touch fallback surface');
          if (tick === 1 && ['plank','one_leg','tilt_balance'].includes(game.type)) {
            const hold = content.locator('button').filter({ hasText: /유지|버티|누르|HOLD/ }).first();
            if (await hold.count()) { const box=await hold.boundingBox(); if(box){await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down(); for(let n=0;n<25&&!await finished();n++)await advance(1000);await page.mouse.up();item.actions.push('held control');} }
          }
          await advance(1000);
          if (Date.now() - started > 65000) break;
        }
        if (!await finished()) throw new Error('Completion not reached. UI: ' + (await content.innerText()).slice(-1600));
        await sleep(30);
        const profile = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('physical_player_profile') || 'null'));
        const before = await profile();
        assert.equal(before?.totalPlays, 1, 'one result');
        assert.equal(before?.recentGames?.[0]?.gameType, game.type, 'correct game result');
        assert.ok(Number.isFinite(before.recentGames[0].score), 'finite score');
        item.score = before.recentGames[0].score;
        await advance(15000);
        assert.equal((await profile()).totalPlays, 1, 'no late duplicate');
        await page.screenshot({ path: path.join(output, game.type + '-result.png') });
        const cooldown = page.getByRole('dialog', {name:'쿨다운과 심박수 회복 루틴'});
        if(await cooldown.count()) await cooldown.getByRole('button', {name:/닫기|건너뛰기|완료/}).last().tap();
        await page.getByRole('button', { name: '다시 하기', exact: true }).tap();
        await page.getByRole('button', { name: '활동 시작', exact: true }).waitFor();
        assert.equal((await profile()).totalPlays, 1, 'replay preparation does not save');
        await page.getByRole('button', { name: '활동 목록으로', exact: true }).tap();
        await page.waitForURL('**/solo');
        await page.getByRole('heading', { name: '혼자 해보기', exact: true }).waitFor();
        if(game.type === 'fate_card') {
          await page.clock.resume(); await page.reload(); await page.getByRole('heading', {name:'혼자 해보기',exact:true}).waitFor({timeout:15000});
          const reloaded=await profile(); assert.equal(reloaded.totalPlays,1); assert.equal(reloaded.recentGames[0].score,-300);
          item.survivesReload=true;
        }
        assert.deepEqual(item.errors, [], 'no browser exceptions');
        item.status = 'pass'; item.replay = true; item.returnToCatalog = true;
      } catch (error) {
        item.status = 'fail'; item.error = error.message;
        await page.screenshot({ path: path.join(output, game.type + '-failure.png'), fullPage: true }).catch(() => {});
      } finally {
        item.wallMs = Date.now() - started; report.cases.push(item); save();
        console.log((item.status === 'pass' ? 'PASS ' : 'FAIL ') + game.type + (item.status === 'pass' ? ' score=' + item.score : ' ' + item.error.slice(0, 240)));
        await context.close();
      }
    }
  } finally { await browser.close(); }
  report.summary = { total: report.cases.length, passed: report.cases.filter(c => c.status === 'pass').length, failed: report.cases.filter(c => c.status === 'fail').length }; save();
  console.log(JSON.stringify(report.summary));
  if (report.summary.failed) process.exitCode = 1;
}
run().catch(error => { console.error(error); process.exit(1); });
