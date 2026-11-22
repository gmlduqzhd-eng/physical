// 휴대폰·태블릿 크기에서 주요 화면이 옆으로 넘치지 않고, 오류 없이 열리는지 본다(로컬 미리보기 전용).
// 혼자 하기(/solo)는 주소에 수업방 정보가 붙어 있어도 수업 서버를 부르지 않는지도 함께 본다.
// 예전 mobile-device-audit·solo-mode-smoke가 보던 것 가운데 지금 화면에도 맞는 부분만 남겼다.
//   node scripts/mobile-layout-smoke.cjs http://127.0.0.1:4173
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const base = (process.argv[2] || process.env.AUDIT_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base)) throw new Error('로컬 미리보기 주소에서만 돌려요: ' + base);
const VIEWPORTS = [[320, 568], [360, 800], [390, 844], [430, 932], [667, 375], [844, 390], [768, 1024]];
const ROUTES = ['/', '/start-lesson', '/hub', '/today', '/tools', '/solo', '/manual', '/checks', '/checks?tab=sound', '/checks?tab=display', '/privacy', '/teacher'];

(async () => {
  const channel = process.env.BROWSER_CHANNEL;
  const browser = await chromium.launch({ headless: true, ...(channel && channel !== 'chromium' ? { channel } : {}) });
  const failures = [];
  let checked = 0;
  try {
    for (const [width, height] of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
      await context.addInitScript(() => { try { localStorage.setItem('physical_teacher_guide_seen_v1', '1'); localStorage.setItem('physical_background_music_v1', 'off'); } catch { /* 저장이 막혀도 계속 */ } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const route of ROUTES) {
        errors.length = 0;
        await page.goto(base + route, { waitUntil: 'domcontentloaded' });
        await page.locator('main, [role="main"], h1').first().waitFor({ timeout: 15000 });
        await page.waitForTimeout(250);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (overflow > 1) failures.push(`${width}x${height} ${route}: 옆으로 ${overflow}px 넘쳐요`);
        if (errors.length) failures.push(`${width}x${height} ${route}: ${errors.join(' | ')}`);
        checked++;
      }
      await context.close();
    }

    // 혼자 하기: 수업방 주소가 붙어 있어도 수업 서버(Supabase)·교사 API를 부르지 않는다.
    const solo = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const calls = [];
    await solo.route(url => /supabase\.(co|in)|\/api\/teacher/.test(url.href), route => { calls.push(route.request().method() + ' ' + route.request().url()); return route.fulfill({ status: 503, body: '{}' }); });
    const soloPage = await solo.newPage();
    const soloErrors = [];
    soloPage.on('pageerror', error => soloErrors.push(error.message));
    await soloPage.goto(base + '/solo/play/stopwatch?room=11111111-1111-4111-8111-111111111111&group=22222222-2222-4222-8222-222222222222&guided=1&mission=test');
    await soloPage.getByRole('button', { name: /시작/ }).first().waitFor({ timeout: 15000 });
    await soloPage.waitForTimeout(1500);
    assert.equal(new URL(soloPage.url()).pathname, '/solo/play/stopwatch');
    if (calls.length) failures.push('혼자 하기가 수업 서버를 불렀어요: ' + calls.slice(0, 3).join(', '));
    if (soloErrors.length) failures.push('혼자 하기 오류: ' + soloErrors.join(' | '));
    await solo.close();
  } finally { await browser.close(); }
  if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
  console.log(JSON.stringify({ base, viewports: VIEWPORTS.length, routes: ROUTES.length, checked, soloIsolated: true }));
})().catch(error => { console.error(error); process.exit(1); });
