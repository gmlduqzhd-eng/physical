import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { chunkUrlFrom, retryableLoad, retryUrl, setRetryImporterForTest } from '../src/application/lazyWithRetry';
import { forgetLastEntry, lastEntryFor, rememberLastEntry, RESUME_WINDOW_MS, resumeLabel } from '../src/application/lastStudentEntry';
import { rememberStudentIdentity } from '../src/application/studentIdentity';
import { playErrorActive, playErrorCleared, playErrorShown } from '../src/application/playErrorSignal';

const read = (file: string) => readFileSync(file, 'utf8');
const chunkError = (url: string) => new TypeError(`Failed to fetch dynamically imported module: ${url}`);

test('a failed game file is fetched again from a fresh address after a retry is prepared', async () => {
  const url = 'https://physical.test/assets/GamePlayPage-abc123.js';
  assert.equal(chunkUrlFrom(chunkError(url)), url);
  assert.equal(chunkUrlFrom(new Error('Importing a module script failed.')), null, 'Safari gives no address');
  assert.match(retryUrl(url, 2), /^https:\/\/physical\.test\/assets\/GamePlayPage-abc123\.js\?retry=2-/);
  const imported: string[] = [];
  setRetryImporterForTest(async next => { imported.push(next); return { Page: 'fresh' }; });
  try {
    let calls = 0;
    // The browser remembers the failed address, so the plain import keeps failing.
    const load = retryableLoad(async () => { calls++; throw chunkError(url); }, (m: { Page: string }) => m.Page);
    await assert.rejects(load.load(), /dynamically imported module/);
    assert.equal(load.failed(), true);
    assert.equal(imported.length, 0, 'the first failure is reported as is (main.tsx may reload for a new deploy)');
    assert.equal(load.prepareRetry(), true);
    assert.equal(await load.load(), 'fresh');
    assert.equal(calls, 2);
    assert.equal(imported.length, 1);
    assert.match(imported[0], /\?retry=1-/);
    assert.equal(load.failed(), false);
    assert.equal(load.prepareRetry(), false, 'nothing to retry after a success');
  } finally { setRetryImporterForTest(null); }
});

test('ordinary errors inside a game are not treated as a missing file', async () => {
  const load = retryableLoad(async () => { throw new TypeError("Cannot read properties of undefined (reading 'x')"); }, (m: unknown) => m);
  await assert.rejects(load.load(), /Cannot read properties/);
  assert.equal(load.failed(), false);
  assert.equal(load.prepareRetry(), false);
});

test('retries happen only when asked, never while drawing (no endless reload loop)', () => {
  const lazy = read('src/application/lazyWithRetry.ts');
  const component = lazy.slice(lazy.indexOf('function RetryableLazy'));
  assert.doesNotMatch(component.slice(0, component.indexOf('}')), /prepareRetry|make\(|useState/, 'rendering must not create a new lazy');
  const boundary = read('src/components/PlayErrorBoundary.tsx');
  assert.match(boundary, /componentWillUnmount\(\) \{[\s\S]*?resetFailedLazies\(\)/, 'leaving the error screen prepares a fresh load');
  assert.match(boundary, /if \(chunk\) resetFailedLazies\(\)/, "'다시 열기' prepares a fresh load");
  assert.match(boundary, /window\.location\.reload\(\)/, 'a second failure or an unknown address still reloads');
  assert.match(read('src/App.tsx'), /const GamePlayPage = lazyWithRetry\(\(\) => import\('\.\/presentation\/GamePlayPage'\), m => m\.GamePlayPage\);/);
  assert.match(read('src/main.tsx'), /vite:preloadError/, 'the one-time reload after a deploy stays');
});

test('the first-visit guide waits while the game shows an error screen', () => {
  assert.equal(playErrorActive(), false);
  playErrorShown(); assert.equal(playErrorActive(), true);
  playErrorCleared(); assert.equal(playErrorActive(), false);
  playErrorCleared(); assert.equal(playErrorActive(), false, 'never goes below zero');
  const guide = read('src/presentation/components/TeacherQuickGuide.tsx');
  assert.match(guide, /useSyncExternalStore\(subscribePlayError,playErrorActive/);
  assert.match(guide, /const open=wanted&&\(force\|\|!playError\)/);
});

test('resume names the student, and is offered only for the same class within 4 hours', () => {
  const now = Date.UTC(2026, 10, 19, 1, 0, 0);
  forgetLastEntry();
  assert.equal(lastEntryFor('room-1', '1모둠', now), null);
  rememberStudentIdentity({ number: 3, nickname: '바람' });
  rememberLastEntry({ room_id: 'room-1', group_id: 'g-1', group_name: '1모둠' }, now);
  const entry = lastEntryFor('room-1', '1모둠', now + 60_000);
  assert.deepEqual(entry, { room: 'room-1', group: 'g-1', groupName: '1모둠', number: '3', nickname: '바람' });
  assert.equal(resumeLabel(entry!), '3번 바람');
  assert.equal(lastEntryFor('room-2', '1모둠', now), null, 'another class');
  assert.equal(lastEntryFor('room-1', '2모둠', now), null, 'another group');
  assert.equal(lastEntryFor('room-1', '1모둠', now + RESUME_WINDOW_MS + 1), null, 'older than the 4-hour class session');
  forgetLastEntry();
  assert.equal(lastEntryFor('room-1', '1모둠', now), null);
  const join = read('src/presentation/QuickJoin.tsx');
  assert.match(join, /학생으로 이어가기/);
  assert.match(join, /다른 학생으로 들어가기/);
  assert.doesNotMatch(join, /아까 들어온 그대로/);
});

test('music that the browser blocked says so instead of claiming it plays', () => {
  const music = read('src/application/BackgroundMusicContext.tsx');
  assert.match(music, /NotAllowedError"\) setBlocked\(true\)/);
  assert.match(music, /blocked: enabled && blocked/);
  const header = read('src/presentation/components/HeaderUtilities.tsx');
  assert.match(header, /music\.blocked \? '음악 다시 켜기'/);
  assert.match(header, /if \(music\.blocked\) \{ music\.resume\(\); return; \}/);
});

test('the service worker precaches only the first font pieces and caches rare-letter pieces on first use', async () => {
  const origin = 'https://physical.test';
  const stores = new Map<string, Map<string, Response>>();
  const key = (value: string | { url: string }) => new URL(typeof value === 'string' ? value : value.url, origin).href;
  const caches = {
    async open(name: string) {
      if (!stores.has(name)) stores.set(name, new Map());
      const values = stores.get(name)!;
      return { async put(k: string | { url: string }, v: Response) { values.set(key(k), v.clone()); }, async match(k: string | { url: string }) { return values.get(key(k))?.clone(); },
        async keys() { return [...values.keys()].map(url => ({ url })); }, async delete(k: string | { url: string }) { return values.delete(key(k)); } };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name: string) { return stores.delete(name); },
  };
  // An old build's font piece left in the cache.
  await (await caches.open('physical-v3')).put(origin + '/fonts/ForestSans-rest.00000000.woff2', new Response('old'));
  const fetched: string[] = [];
  const network = async (request: string | { url: string }) => {
    const url = key(request); fetched.push(url);
    if (url === origin + '/') return new Response('<html><head><link rel="stylesheet" href="/assets/index-v1.css"></head><body><script src="/assets/index-v1.js"></script></body></html>', { headers: { 'Content-Type': 'text/html' } });
    if (url === origin + '/assets/index-v1.css') return new Response("@font-face{src:url('/fonts/ForestSans-rest.ba061988.woff2')}@font-face{src:url('/fonts/ForestSans-ks.f89a7bc0.woff2')}@font-face{src:url('/fonts/ForestSans-app.054f710b.woff2')}", { headers: { 'Content-Type': 'text/css' } });
    return new Response('bytes ' + url);
  };
  const listeners: Record<string, (event: unknown) => void> = {};
  vm.runInNewContext(read('public/sw.js'), {
    self: { location: { origin }, addEventListener(name: string, handler: (event: unknown) => void) { listeners[name] = handler; }, async skipWaiting() {}, clients: { async claim() {} } },
    fetch: network, caches, URL, Response, Promise, Set, JSON,
  });
  const run = async (name: string) => { let task: Promise<unknown> | undefined; listeners[name]({ waitUntil(p: Promise<unknown>) { task = p; } }); await task; };
  await run('install'); await run('activate');
  const cache = stores.get('physical-v3')!;
  assert.ok(cache.has(origin + '/fonts/ForestSans-app.054f710b.woff2'), 'first piece is precached');
  assert.ok(!cache.has(origin + '/fonts/ForestSans-rest.ba061988.woff2'), 'rare-letter piece is not precached');
  assert.ok(!cache.has(origin + '/fonts/ForestSans-ks.f89a7bc0.woff2'), 'everyday-Hangul piece is not precached');
  assert.ok(!fetched.includes(origin + '/fonts/ForestSans-rest.ba061988.woff2'));
  assert.ok(!cache.has(origin + '/fonts/ForestSans-rest.00000000.woff2'), "an older build's piece is dropped on activate");
  // First use caches the piece; afterwards it is served from the cache without the network.
  const respond = async (url: string) => { let task: Promise<Response> | undefined; listeners.fetch({ request: { url, method: 'GET', destination: 'font' }, respondWith(p: Promise<Response>) { task = p; } }); return task!; };
  const rest = origin + '/fonts/ForestSans-rest.ba061988.woff2';
  assert.equal((await respond(rest)).status, 200);
  assert.ok(cache.has(rest));
  const before = fetched.length;
  assert.equal(await (await respond(rest)).text(), 'bytes ' + rest);
  assert.equal(fetched.length, before, 'hashed font pieces are cache-first');
  // A later activate keeps the piece the current CSS still names.
  await run('activate');
  assert.ok(cache.has(rest));
});

test('hashed files are cached long by the host, and the font script leaves no __pycache__', () => {
  const vercel = JSON.parse(read('vercel.json')) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
  const rule = (source: string) => vercel.headers.find(h => h.source === source)?.headers.find(h => h.key === 'Cache-Control')?.value;
  assert.equal(rule('/assets/(.*)'), 'public, max-age=31536000, immutable');
  assert.equal(rule('/fonts/:piece([^/]+\\.[0-9a-f]{8}\\.woff2)'), 'public, max-age=31536000, immutable');
  const script = read('scripts/subset-fonts.py');
  assert.match(script, /sys\.dont_write_bytecode = True/);
  assert.match(read('.gitignore'), /__pycache__\//);
});
