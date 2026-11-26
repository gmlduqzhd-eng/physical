// 선생님 계정 기능을 실제 브라우저에서 눌러 본다: 계정에 올리기·가져오기, 서버에 기능이 없을 때, 익명 횟수 끄기, 관리자 통계 표.
// 쓰는 법: node scripts/records-account-e2e.cjs [baseUrl]   (기본 http://127.0.0.1:4174, 가짜 Supabase 주소로 만든 dist-journeys 빌드)
// Supabase와 /api/teacher 응답은 모두 이 파일 안의 가짜 응답이다. 실제 데이터베이스에는 아무것도 닿지 않는다.
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const repo = path.resolve(__dirname, '..');
const { chromium } = createRequire(path.join(repo, 'package.json'))(process.env.PLAYWRIGHT_MODULE || 'playwright');

const base = (process.argv[2] || 'http://127.0.0.1:4174').replace(/\/$/, '');
if (!/^(127\.0\.0\.1|localhost)$/.test(new URL(base).hostname)) throw Error('Fixture authentication is only allowed on loopback.');
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };

/** 가짜 서버 한 대(브라우저 창 여러 개가 함께 쓴다). */
function fakeServer() {
  const server = { payload: null, updatedAt: null, recordCalls: [], statCalls: [], summaryDays: [], missing: false };
  server.attach = async (context, signedIn) => {
    // 가짜 선생님 세션(익명 아님). 로그인하지 않은 창에는 넣지 않는다.
    if (signedIn) await context.addInitScript(() => {
      const expires = Math.floor(Date.now() / 1000) + 3600;
      sessionStorage.setItem('physical_private_expires', String(Date.now() + 3600e3));
      sessionStorage.setItem('physical_supabase_auth', JSON.stringify({ access_token: 'fixture-token', refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600, expires_at: expires, user: { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'teacher@example.test', is_anonymous: false, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } }));
    });
    await context.route('**/api/teacher?**', route => route.fulfill({ json: { authenticated: signedIn, configured: true } }));
    await context.route('**/*.supabase.co/**', async route => {
      const request = route.request(), rpc = new URL(request.url()).pathname.split('/').at(-1);
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: cors, body: '' });
      const body = request.postDataJSON() || {}, reply = (json, status = 200) => route.fulfill({ status, headers: cors, json });
      if (rpc === 'count_activity_play') { server.statCalls.push(body); return reply({}); }
      if (rpc === 'teacher_class_records') {
        if (server.missing) return reply({ code: 'PGRST202', message: 'function not found' }, 404);
        server.recordCalls.push(body);
        if (body.next_payload) { server.payload = body.next_payload; server.updatedAt = new Date().toISOString(); }
        return reply({ payload: server.payload, updatedAt: server.updatedAt });
      }
      if (rpc === 'teacher_account') return reply({ enabled: true, role: 'admin' });
      if (rpc === 'teacher_members') return reply({ members: [], total: 0 });
      if (rpc === 'activity_play_summary') { server.summaryDays.push(body.days); return reply([{ activityId: 'sig-boss-raid', plays: 42 }, { activityId: 'unknown-x', plays: 3 }]); }
      return reply({});
    });
  };
  return server;
}

(async () => {
  const browser = await chromium.launch({ ...(process.env.BROWSER_CHANNEL && process.env.BROWSER_CHANNEL !== 'chromium' ? { channel: process.env.BROWSER_CHANNEL } : {}), headless: true });
  const errors = [];
  const open = async (server, signedIn) => { const context = await browser.newContext({ viewport: { width: 1280, height: 900 } }); await server.attach(context, signedIn); const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message)); return { context, page }; };
  try {
    const server = fakeServer();
    // 로그인하지 않으면 계정 줄이 없다
    let { context, page: p } = await open(server, false);
    await p.goto(base + '/class-progress', { waitUntil: 'networkidle' }); await p.click('.class-switcher-toggle'); await p.waitForTimeout(600);
    assert.equal(await p.locator('[data-class-cloud]').count(), 0);
    assert.equal(server.recordCalls.length, 0, 'no account calls without a teacher session');
    await context.close(); console.log('PASS signed out: no account row');

    // 로그인: 올리기
    ({ context, page: p } = await open(server, true));
    await p.goto(base + '/journey', { waitUntil: 'networkidle' });
    await p.evaluate(() => localStorage.setItem('physical_class_journey_v1', JSON.stringify([{ kind: 'play', date: '2026-11-01' }])));
    await p.goto(base + '/class-progress', { waitUntil: 'networkidle' }); await p.click('.class-switcher-toggle');
    await p.waitForSelector('[data-class-cloud]'); assert.match(await p.textContent('[data-class-cloud]'), /아직 없어요/);
    await p.click('[data-class-cloud-save]');
    await p.waitForFunction(() => /계정에 올렸어요/.test(document.querySelector('.class-switcher').textContent));
    assert.equal(server.payload.kind, 'physical-class-backup'); assert.equal(server.payload.classes[0].journey.length, 1);
    assert.deepEqual(Object.keys(server.payload).sort(), ['classes', 'current', 'kind', 'savedAt', 'version'], 'only the backup fields are uploaded');
    assert.match(await p.textContent('[data-class-cloud]'), /마지막으로 올린 때/);
    assert.match(await p.textContent('[data-storage-note]'), /선생님 계정에도/);
    await context.close(); console.log('PASS upload to account');

    // 다른 기기(빈 저장소)에서 가져오기
    ({ context, page: p } = await open(server, true));
    await p.goto(base + '/class-progress', { waitUntil: 'networkidle' }); await p.click('.class-switcher-toggle'); await p.waitForSelector('[data-class-cloud]');
    await p.click('[data-class-cloud-load]'); await p.waitForSelector('[data-class-restore-yes]');
    assert.match(await p.textContent('.class-switcher-confirm'), /도장 1개/);
    await p.click('[data-class-restore-yes]');
    await p.goto(base + '/journey', { waitUntil: 'networkidle' }); assert.match(await p.textContent('.journey-status'), /도장 1 \/ 28/);
    console.log('PASS load on another device');

    // 서버에 기능이 없으면 계정 줄만 숨고 나머지는 그대로
    server.missing = true;
    await p.goto(base + '/class-progress', { waitUntil: 'networkidle' }); await p.click('.class-switcher-toggle'); await p.waitForTimeout(800);
    assert.equal(await p.locator('[data-class-cloud]').count(), 0); assert.equal(await p.locator('[data-class-backup]').count(), 1);
    server.missing = false; console.log('PASS server without the feature: file backup still offered');

    // 익명 횟수 끄기
    await p.goto(base + '/privacy', { waitUntil: 'networkidle' }); assert.equal(await p.isChecked('[data-stats-toggle]'), true);
    await p.uncheck('[data-stats-toggle]'); assert.equal(await p.evaluate(() => localStorage.getItem('physical_stats_off_v1')), '1');
    await p.check('[data-stats-toggle]'); assert.equal(await p.evaluate(() => localStorage.getItem('physical_stats_off_v1')), null);
    console.log('PASS anonymous count switch');

    // 관리자 통계 표
    await p.goto(base + '/teacher/members', { waitUntil: 'networkidle' }); await p.waitForSelector('[data-activity-stats] table');
    const rows = await p.$$eval('[data-activity-stats] tbody tr', trs => trs.map(tr => tr.textContent));
    assert.match(rows[0], /1.*우리 반 보스전.*42/); assert.match(rows[1], /unknown-x.*3/);
    assert.match(await p.textContent('[data-activity-stats]'), /모두 45판 · 활동 2가지/);
    await p.getByRole('button', { name: '최근 7일' }).click(); await p.waitForFunction(() => document.querySelector('[data-activity-stats] table'));
    await p.waitForTimeout(300); assert.deepEqual(server.summaryDays, [30, 7]);
    await context.close(); console.log('PASS admin activity counts');

    assert.deepEqual(errors, [], 'page errors');
    console.log(JSON.stringify({ passed: 6 }));
  } finally { await browser.close(); }
})().catch(error => { console.error('FAIL', error.message); process.exit(1); });
