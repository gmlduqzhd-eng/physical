const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
process.env.TZ = 'Asia/Seoul';
const repo = process.argv[2] || path.resolve(__dirname, '..');
const ts = createRequire(path.join(repo, 'package.json'))('typescript');
const fixedTime = new Date('2026-10-02T00:30:00+09:00').getTime();
class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [fixedTime])); } static now() { return fixedTime; } }
let active;
const hooks = {
  useState(initial) {
    const index = active.cursor++;
    const actor = active;
    if (!(index in actor.states)) actor.states[index] = typeof initial === 'function' ? initial() : initial;
    return [actor.states[index], next => { actor.states[index] = typeof next === 'function' ? next(actor.states[index]) : next; }];
  },
  useRef(initial) {
    const index = active.cursor++;
    if (!(index in active.states)) active.states[index] = { current: initial };
    return active.states[index];
  },
  useCallback(fn) { return fn; },
  useEffect(fn, dependencies) {
    const index = active.cursor++;
    const previous = active.effects[index];
    if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i])) {
      active.queue.push(() => { previous?.cleanup?.(); active.effects[index] = { dependencies, cleanup: fn() }; });
    }
  },
};
function actor(hook) {
  const state = { states: [], effects: [], cursor: 0, queue: [] };
  return { render() { active = state; state.cursor = 0; state.queue = []; const result = hook(); for (const effect of state.queue) effect(); return result; } };
}
const data = new Map();
let storageDenied = false;
const storage = {
  getItem(key) { if (storageDenied) throw new Error('Storage denied'); return data.get(key) ?? null; },
  setItem(key, value) { if (storageDenied) throw new Error('Storage denied'); data.set(key, value); },
  removeItem(key) { if (storageDenied) throw new Error('Storage denied'); data.delete(key); },
};
const browser = { localStorage: storage, sessionStorage: storage, isSecureContext: true };
const modules = new Map();
function load(filename) {
  filename = path.resolve(repo, filename);
  if (modules.has(filename)) return modules.get(filename);
  const exports = {};
  modules.set(filename, exports);
  const context = {
    exports, window: browser, localStorage: storage, sessionStorage: storage, Date: FixedDate, console,
    require(name) { if (name === 'react') return hooks; if (name.startsWith('.')) return load(path.join(path.dirname(filename), name + '.ts')); throw new Error(name); },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context, { filename });
  return exports;
}
let checks = 0;
function check(name, callback) { callback(); checks++; console.log('PASS', name); }

async function main() {
  const helpers = load('src/application/browserStorage.ts');
  const profiles = load('src/application/usePlayerProfile.ts');
  const streaks = load('src/application/useDailyStreak.ts');
  const pets = load('src/application/useTamagotchi.ts');
  const motion = load('src/application/useMotionPermission.ts');
  const sound = load('src/application/soundEffects.ts');
  const report = load('src/application/classReport.ts');
  const parseCsv = source => {
    const rows = []; let row = [], field = '', quoted = false;
    source = source.replace(/^\uFEFF/, '');
    for (let i = 0; i < source.length; i++) {
      const char = source[i];
      if (char === '"') {
        if (quoted && source[i + 1] === '"') { field += '"'; i++; }
        else quoted = !quoted;
      } else if (char === ',' && !quoted) { row.push(field); field = ''; }
      else if (char === '\n' && !quoted) { row.push(field); rows.push(row); row = []; field = ''; }
      else if (char !== '\r' || quoted) field += char;
    }
    row.push(field); rows.push(row); return rows;
  };
  check('CSV round-trips quoted and multiline names and disarms spreadsheet formulas', () => {
    const groups = ['모둠 "따옴표", 쉼표\n다음 줄', '=HYPERLINK("https://example.test")', ' +1+2', '-5+4', '@SUM(A1:A2)'].map((name, index) =>
      ({ group_name: name, score: index === 0 ? -10 : 100, completed_missions: ['a', 'a', 'b'], is_defused: false }));
    const parsed = parseCsv(report.buildClassReportCsv(groups));
    assert.equal(parsed.length, groups.length + 2);
    const targetRow = parsed.find(r => r[1] === groups[0].group_name);
    assert(targetRow, 'target row found');
    assert.equal(targetRow[2], '-10'); assert.equal(targetRow[3], '2');
    for (let i = 1; i < groups.length; i++) {
      const disarmed = parsed.find(r => r[1] === "'" + groups[i].group_name);
      assert(disarmed, 'disarmed formula row found for ' + groups[i].group_name);
    }
    assert(parsed.slice(0, -1).every(row => row.length === 11));
  });
  check('activity summaries describe recorded facts rather than inventing student traits', () => {
    const text = report.recordedGroupComment({ group_name: '모둠', score: 321, completed_missions: ['one'], is_defused: true });
    assert.match(text, /321점/); assert.match(text, /미션 1개/); assert.match(text, /교사 관찰 기록/);
    assert(!/리더십|근지구력|동료를 격려|우수한 협동심/.test(text));
  });
  check('Korean early-morning stamps use October 2 rather than UTC October 1', () => assert.equal(helpers.localDateKey(), '2026-10-02'));
  check('corrupt profile schemas recover without unsafe arrays or RPE values', () => {
    for (const value of [null, [], 'bad', { nickname: '' }]) assert.equal(profiles.normalizePlayerProfile(value), null);
    const clean = profiles.normalizePlayerProfile({ nickname: '대원', totalPlays: '10', highScores: [], recentGames: [{ gameType: 'reaction', gameName: '반응', score: 10, playedAt: 100, rpe: {}, difficulty: {} }] });
    assert.equal(clean.totalPlays, 0); assert.equal(clean.recentGames[0].rpe, undefined); assert.equal(clean.recentGames[0].difficulty, undefined);
  });
  check('blocked storage does not prevent creating a profile or finishing a game', () => {
    storageDenied = true;
    const player = actor(profiles.usePlayerProfile); let view = player.render();
    view.createProfile('나'); view = player.render(); view.addGameResult('reaction', '반응', 17);
    view = player.render(); assert.equal(view.profile.totalScore, 17); assert.equal(view.profile.totalPlays, 1);
    assert.equal(actor(profiles.usePlayerProfile).render().profile.totalScore, 17);
    view.addGameResult('reaction', '반응', NaN); assert.equal(player.render().profile.totalPlays, 1);
    view.resetProfile(); assert.equal(player.render().hasProfile, false);
    storageDenied = false;
  });
  check('quota write fallback overrides stale stored data until a write succeeds', () => {
    data.set('quota_setting', 'old'); storageDenied = true;
    assert.equal(helpers.writeStorage('quota_setting', 'new'), false);
    storageDenied = false; assert.equal(helpers.readStorage('quota_setting'), 'new');
    assert.equal(helpers.writeStorage('quota_setting', 'saved'), true);
    assert.equal(data.get('quota_setting'), 'saved');
  });
  check('RPE feedback remains attached to the previous game after replay result', () => {
    data.delete('physical_player_profile');
    const player = actor(profiles.usePlayerProfile); let view = player.render();
    view.addGameResult('reaction', '반응', 17); view = player.render();
    view.updateLatestRpe('reaction', 4); view = player.render();
    view.addGameResult('reaction', '반응', 30); view = player.render();
    assert.equal(view.profile.recentGames[1].rpe, 4); assert.equal(view.profile.recentGames[0].rpe, undefined);
    assert.equal(JSON.parse(data.get('physical_player_profile')).recentGames[1].rpe, 4);
  });
  check('daily completion is idempotent and consecutive local days preserve streak', () => {
    data.set('dambang_daily_streak_v1', JSON.stringify({ currentStreak: 6, bestStreak: 6, lastCompletedDate: '2026-10-01', history: ['2026-10-01'], points: 600 }));
    const streak = actor(streaks.useDailyStreak); let view = streak.render();
    view.completeTodayMission(100); view.completeTodayMission(100); view = streak.render();
    assert.equal(view.streakData.currentStreak, 7); assert.equal(view.streakData.points, 700); assert.equal(view.isTodayCompleted(), true);
    assert.equal(JSON.parse(data.get('dambang_daily_streak_v1')).lastCompletedDate, '2026-10-02');
  });
  check('missed day resets displayed streak; corrupt histories remain usable', () => {
    data.set('dambang_daily_streak_v1', JSON.stringify({ currentStreak: 10, lastCompletedDate: '2026-09-29', history: null, points: 'bad' }));
    const view = actor(streaks.useDailyStreak).render(); assert.equal(view.streakData.currentStreak, 0); assert.equal(view.streakData.points, 0);
  });
  check('rapid pet purchases charge once and cannot bypass required level', () => {
    data.delete('dambang_tamagotchi_v1');
    const pet = actor(pets.useTamagotchi); let view = pet.render();
    const cap = pets.TAMAGOTCHI_ITEMS.find(item => item.id === 'cap');
    const crown = pets.TAMAGOTCHI_ITEMS.find(item => item.id === 'crown');
    assert.equal(view.buyItem(cap), true); assert.equal(view.buyItem(cap), false); assert.equal(view.buyItem(crown), false);
    view = pet.render(); assert.equal(view.state.coins, 250);
    view.addXpAndCoins(10000, 20); view = pet.render(); assert.equal(view.level, 10); assert.equal(view.currentLevelXp, 100);
  });
  check('corrupt pet inventory/equipment is normalized', () => {
    const state = pets.normalizeTamagotchiState({ xp: -1, coins: 'bad', inventory: null, equippedHat: 'unknown' });
    assert.equal(state.xp, 120); assert.equal(state.coins, 350); assert.equal(state.equippedHat, ''); assert(Array.isArray(state.inventory));
  });
  let requests = [];
  browser.DeviceMotionEvent = { requestPermission: () => { requests.push('motion'); return Promise.resolve('granted'); } };
  browser.DeviceOrientationEvent = { requestPermission: () => { requests.push('orientation'); return Promise.resolve('granted'); } };
  const permission = actor(motion.useMotionPermission); const permissionView = permission.render();
  storageDenied = true;
  const permissionResult = permissionView.requestPermission();
  check('iOS motion and orientation APIs both invoked before awaiting', () => assert.equal(requests.join(','), 'motion,orientation'));
  assert.equal(await permissionResult, true); assert.equal(permission.render().isGranted, true); checks++; console.log('PASS blocked storage preserves granted sensor permission');
  storageDenied = false;
  delete browser.DeviceMotionEvent; delete browser.DeviceOrientationEvent;
  assert.equal(await actor(motion.useMotionPermission).render().requestPermission(), false); checks++; console.log('PASS unsupported sensors cannot report permission as granted');
  check('unsupported audio never throws from game sounds', () => { for (const name of ['unlockAudio', 'sfxTap', 'sfxPop', 'sfxDirectionalBell', 'sfxUrgentWarning', 'startBgm', 'stopBgm']) sound[name](0); });

  const listeners = {};
  const cachesByName = new Map();
  const origin = 'https://physical.test';
  const cacheKey = value => new URL(typeof value === 'string' ? value : value.url, origin).href;
  const cacheApi = {
    async open(name) {
      if (!cachesByName.has(name)) cachesByName.set(name, new Map());
      const values = cachesByName.get(name);
      return { async put(key, value) { values.set(cacheKey(key), value.clone()); }, async match(key) { return values.get(cacheKey(key))?.clone(); } };
    },
    async keys() { return [...cachesByName.keys()]; },
    async delete(name) { return cachesByName.delete(name); },
  };
  await cacheApi.open('physical-v2'); await cacheApi.open('another-app-cache');
  let offline = false;
  let shellVersion = 1;
  const network = async request => {
    if (offline) throw new Error('Offline');
    const url = cacheKey(request);
    if (url === origin + '/' || /\/games/.test(url)) return new Response(`<html><head><link rel="stylesheet" href="/assets/index-v${shellVersion}.css"></head><body>shell ${shellVersion}<script src="/assets/index-v${shellVersion}.js"></script></body></html>`, { headers: { 'Content-Type': 'text/html' } });
    if (url === origin + '/assets/index-v1.js') return new Response('import("./hub-v1.js"); const dependencies = ["assets/play-v1.js"];');
    if (url === origin + '/assets/index-v1.css') return new Response('@font-face { src: url("/fonts/MapleStory.ttf"); }');
    return new Response('asset ' + url);
  };
  vm.runInNewContext(fs.readFileSync(path.join(repo, 'public/sw.js'), 'utf8'), {
    self: { location: { origin }, addEventListener(name, handler) { listeners[name] = handler; }, async skipWaiting() {}, clients: { async claim() {} } },
    fetch: network, caches: cacheApi, URL, Response, Promise,
  });
  const lifecycle = async name => { let task; listeners[name]({ waitUntil(promise) { task = promise; } }); await task; };
  const fetchWorker = async request => { let task; listeners.fetch({ request, respondWith(promise) { task = promise; } }); return task; };
  await lifecycle('install'); await lifecycle('activate');
  check('install precaches entry JS/CSS and only removes this app old caches', () => {
    const cache = cachesByName.get('physical-v3'); assert(cache.has(origin + '/assets/index-v1.js')); assert(cache.has(origin + '/assets/index-v1.css'));
    assert(!cachesByName.has('physical-v2')); assert(cachesByName.has('another-app-cache'));
  });
  check('install follows lazy route dependencies and CSS fonts before going offline', () => {
    const cache = cachesByName.get('physical-v3');
    assert(cache.has(origin + '/assets/hub-v1.js'));
    assert(cache.has(origin + '/assets/play-v1.js'));
    assert(cache.has(origin + '/fonts/MapleStory.ttf'));
  });
  offline = true;
  assert.match(await (await fetchWorker({ url: origin + '/games/reaction', method: 'GET', mode: 'navigate' })).text(), /shell 1/);
  assert.equal((await fetchWorker({ url: origin + '/assets/index-v1.js', method: 'GET', destination: 'script' })).status, 200);
  checks++; console.log('PASS offline deep navigation and entry JS reload from cached app');
  offline = false; shellVersion = 2;
  await fetchWorker({ url: origin + '/games', method: 'GET', mode: 'navigate' });
  offline = true;
  assert.match(await (await fetchWorker({ url: origin + '/games/next', method: 'GET', mode: 'navigate' })).text(), /shell 2/);
  checks++; console.log('PASS latest successful navigation refreshes offline app shell');
  assert.equal(await fetchWorker({ url: 'https://external.test/rest/v1/game_rooms', method: 'GET', destination: '' }), undefined);
  assert.equal(await fetchWorker({ url: origin + '/api/private', method: 'GET', destination: '' }), undefined);
  checks++; console.log('PASS classroom and API responses bypass app cache');
  assert.equal((await fetchWorker({ url: origin + '/assets/missing.js', method: 'GET', destination: 'script' })).status, 503);
  checks++; console.log('PASS missing offline assets return valid Response rather than undefined');
  console.log(`Runtime regressions: ${checks} passed`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
