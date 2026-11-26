// 우리 반 기록 기능을 실제 브라우저에서 눌러 본다: 반 관리, 반별 기록, 보관·가져오기, 여러 차시 계획과 고정, 학기 정리, 보관 알림, 들어가는 길.
// 쓰는 법: node scripts/records-e2e.cjs [baseUrl]   (기본 http://127.0.0.1:4173, CI가 쓰는 `vite preview` 포트)
// 서버는 쓰지 않는다(모두 이 브라우저의 저장소). 장면마다 새 브라우저 창(빈 저장소)에서 시작한다.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const repo = path.resolve(__dirname, '..');
const { chromium } = createRequire(path.join(repo, 'package.json'))(process.env.PLAYWRIGHT_MODULE || 'playwright');

const base = (process.argv[2] || 'http://127.0.0.1:4173').replace(/\/$/, '');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'records-e2e-'));
const JOURNEY = 'physical_class_journey_v1', PROGRESS = 'physical_class_progress_v1', MARK = 'physical_class_backup_mark_v1';
// 반을 바꾸면 화면이 그 반으로 다시 그려지며 관리 칸이 닫힌다. 닫혀 있을 때만 연다.
const openPanel = async page => { if (!(await page.locator('.class-switcher-panel').count())) await page.click('.class-switcher-toggle'); await page.waitForSelector('.class-switcher-panel'); };
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

async function scene(browser, name, viewport, run) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try { await run(page); assert.deepEqual(errors, [], 'page errors'); console.log(`PASS ${name}`); }
  catch (error) { await page.screenshot({ path: path.join(tmp, `${name.replace(/\W+/g, '-')}.png`) }).catch(() => {}); throw new Error(`${name}: ${error.message}`); }
  finally { await context.close(); }
}
const wide = { width: 1280, height: 900 }, phone = { width: 360, height: 780 };

(async () => {
  const browser = await chromium.launch({ ...(process.env.BROWSER_CHANNEL && process.env.BROWSER_CHANNEL !== 'chromium' ? { channel: process.env.BROWSER_CHANNEL } : {}), headless: true });
  try {
    await scene(browser, 'classes: old records stay, new class is separate, delete removes its records', wide, async p => {
      await p.goto(base + '/journey');
      await p.evaluate(key => localStorage.setItem(key, JSON.stringify([{ kind: 'play', date: '2026-11-01' }, { kind: 'sports', date: '2026-11-02' }])), JOURNEY);
      await p.reload({ waitUntil: 'networkidle' });
      assert.equal(await p.textContent('h1'), '우리 반 원정 지도');
      assert.match(await p.textContent('.journey-status'), /도장 2 \/ 28/);
      await p.click('.class-switcher-toggle'); await p.fill('[data-class-new]', '5학년 2반'); await p.click('[data-class-add]');
      await p.waitForFunction(() => document.querySelector('h1').textContent === '5학년 2반 원정 지도');
      assert.match(await p.textContent('.journey-status'), /도장 0 \/ 28/);
      await p.click('.journey-go'); assert.match(await p.textContent('.journey-status'), /도장 1 \/ 28/);
      await p.selectOption('[data-class-select]', 'default');
      await p.waitForFunction(() => document.querySelector('h1').textContent === '우리 반 원정 지도');
      assert.match(await p.textContent('.journey-status'), /도장 2 \/ 28/);
      await p.selectOption('[data-class-select]', { label: '5학년 2반' });
      await p.waitForFunction(() => document.querySelector('h1').textContent === '5학년 2반 원정 지도');
      await openPanel(p); await p.click('[data-class-delete]'); await p.click('[data-class-delete-yes]');
      assert.equal(await p.locator('[data-class-select] option').count(), 1);
      assert.equal(await p.evaluate(() => Object.keys(localStorage).filter(key => key.includes('::')).length), 0, 'class data removed');
    });

    await scene(browser, 'backup: download, wipe, restore, reject foreign file', wide, async p => {
      await p.goto(base + '/journey');
      await p.evaluate(key => localStorage.setItem(key, JSON.stringify([{ kind: 'play', date: '2026-11-01' }])), JOURNEY);
      await p.reload({ waitUntil: 'networkidle' });
      await p.click('.class-switcher-toggle'); await p.fill('[data-class-new]', '6학년 1반'); await p.click('[data-class-add]');
      await p.waitForFunction(() => document.querySelector('h1').textContent === '6학년 1반 원정 지도');
      await p.click('.journey-go'); await p.click('.journey-go');
      await openPanel(p);
      const [download] = await Promise.all([p.waitForEvent('download'), p.click('[data-class-backup]')]);
      const file = path.join(tmp, 'backup.json'); await download.saveAs(file);
      const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
      assert.equal(saved.kind, 'physical-class-backup');
      assert.deepEqual(saved.classes.map(c => [c.name, c.journey.length]), [['우리 반', 1], ['6학년 1반', 2]]);
      await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle' });
      assert.equal(await p.locator('[data-class-select] option').count(), 1);
      await openPanel(p); await p.setInputFiles('[data-class-file]', file);
      await p.waitForSelector('[data-class-restore-yes]');
      assert.match(await p.textContent('.class-switcher-confirm'), /우리 반: 0판 · 도장 1개 \/ 6학년 1반: 0판 · 도장 2개/);
      await p.click('[data-class-restore-yes]');
      await p.waitForFunction(() => document.querySelector('h1').textContent === '6학년 1반 원정 지도');
      assert.match(await p.textContent('.journey-status'), /도장 2 \/ 28/);
      const bad = path.join(tmp, 'bad.json'); fs.writeFileSync(bad, '{"hello":1}');
      await openPanel(p); await p.setInputFiles('[data-class-file]', bad);
      await p.waitForFunction(() => /기록 파일이 아니에요/.test(document.querySelector('.class-switcher').textContent));
      assert.match(await p.textContent('.journey-status'), /도장 2 \/ 28/, 'a foreign file changes nothing');
    });

    await scene(browser, 'week plan: build, pin, keep order, mark done, unpin follows reactions', wide, async p => {
      await p.goto(base + '/start-lesson', { waitUntil: 'networkidle' });
      await p.click('[data-start-week]'); await p.waitForURL(/\/week$/); await p.waitForSelector('.week-lesson');
      assert.equal(await p.locator('.week-lesson').count(), 3);
      await p.click('[data-week-count="6"]'); assert.equal(await p.locator('.week-lesson').count(), 6);
      await p.click('[data-week-count="3"]');
      const ids = await p.$$eval('.week-lesson', els => els.map(el => el.dataset.weekLesson));
      await p.click('[data-week-pin]'); await p.waitForSelector('[data-week-pinned]');
      assert.match(await p.textContent('[data-week-pinned]'), /마친 차시는 0 \/ 3/);
      assert.equal(await p.locator('[data-week-count]').count(), 0, 'choosers hidden while pinned');
      await p.evaluate(({ key, id }) => { const now = Date.now() + 1000; localStorage.setItem(key, JSON.stringify({ version: 2, plays: [{ id, at: now, play: 'a' }], votes: [{ id, vote: 'up', at: now, play: 'a' }, { id, vote: 'up', at: now, play: 'b' }], reasons: [] })); }, { key: PROGRESS, id: ids[1] });
      await p.reload({ waitUntil: 'networkidle' }); await p.waitForSelector('[data-week-pinned]');
      assert.deepEqual(await p.$$eval('.week-lesson', els => els.map(el => el.dataset.weekLesson)), ids, 'order unchanged while pinned');
      assert.deepEqual(await p.$$eval('.week-lesson', els => els.map(el => el.dataset.done || '')), ['', 'yes', '']);
      await p.click('[data-week-unpin]'); await p.waitForSelector('[data-week-pin]');
      assert.equal(await p.getAttribute('.week-lesson', 'data-week-lesson'), ids[1], 'liked activity comes first');
      assert.match(await p.textContent('.week-lesson .week-reason'), /반응이 좋았어요/);
      await p.click('.week-lesson .week-open'); await p.waitForURL(/\/today\?main=/);
    });

    await scene(browser, 'term summary and backup nudge', wide, async p => {
      await p.goto(base + '/class-progress');
      await p.evaluate(key => { const now = Date.now(); localStorage.setItem(key, JSON.stringify({ version: 2, plays: Array.from({ length: 10 }, (_, i) => ({ id: 'sig-boss-raid', at: now - (i < 5 ? 86400000 : 0) - i, play: 'p' + i })), votes: [{ id: 'sig-boss-raid', vote: 'up', at: now, play: 'p0' }, { id: 'sig-boss-raid', vote: 'up', at: now, play: 'p1' }], reasons: [] })); }, PROGRESS);
      await p.goto(base + '/class-progress?tab=term', { waitUntil: 'networkidle' });
      assert.equal((await p.textContent('[data-term-plays]')).trim(), '10판');
      assert.equal((await p.textContent('[data-term-days]')).trim(), '2일');
      await p.waitForSelector('[data-backup-nudge]');
      assert.match(await p.textContent('[data-backup-nudge]'), /10판 쌓였는데 아직 보관한 적이 없어요/);
      assert.match(await p.textContent('[data-storage-note]'), /이 기기에만 저장돼요/);
      await p.click('[data-backup-nudge-later]'); assert.equal(await p.locator('[data-backup-nudge]').count(), 0);
      await p.evaluate(key => localStorage.removeItem(key), MARK); await p.reload({ waitUntil: 'networkidle' }); await p.waitForSelector('[data-backup-nudge]');
      const [download] = await Promise.all([p.waitForEvent('download'), p.click('[data-backup-nudge-save]')]); await download.path();
      await p.waitForFunction(() => !document.querySelector('[data-backup-nudge]'));
      await p.evaluate(key => { const mark = JSON.parse(localStorage.getItem(key)); mark.cloudAt = Date.now(); localStorage.setItem(key, JSON.stringify(mark)); }, MARK);
      await p.reload({ waitUntil: 'networkidle' });
      assert.match(await p.textContent('[data-storage-note]'), /선생님 계정에도 .*올린 한 벌이 있어요/);
    });

    await scene(browser, 'ways in: tools, manual, today', wide, async p => {
      await p.goto(base + '/tools', { waitUntil: 'networkidle' });
      assert.deepEqual(await p.$$eval('[data-tools-records] a', links => links.map(a => a.getAttribute('href'))), ['/class-progress', '/class-progress?tab=term', '/journey', '/week']);
      await p.goto(base + '/manual', { waitUntil: 'networkidle' });
      assert.equal(await p.locator('[data-manual-records] h4').count(), 4);
      await p.goto(base + '/today', { waitUntil: 'networkidle' });
      assert.equal(await p.locator('[data-class-switcher]').count(), 0, 'class picker hidden with a single class');
      assert.equal(await p.locator('[data-week-link]').count(), 1);
    });

    await scene(browser, 'phone width: no sideways overflow', phone, async p => {
      for (const route of ['/tools', '/week', '/manual', '/class-progress', '/class-progress?tab=term', '/journey']) {
        await p.goto(base + route, { waitUntil: 'networkidle' });
        if (route === '/class-progress') await p.click('.class-switcher-toggle');
        assert.ok(await noOverflow(p), `overflow on ${route}`);
      }
    });
    console.log(JSON.stringify({ passed: 6 }));
  } finally { await browser.close(); }
})().catch(error => { console.error('FAIL', error.message, `(screenshots: ${tmp})`); process.exit(1); });
