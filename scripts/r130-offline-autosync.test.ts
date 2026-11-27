import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { EMPTY_SYNC, contentKey, decideSync, isEmptyBackup, parseSyncRecord } from '../src/domain/cloudSync';

const read = (p: string) => readFileSync(p, 'utf8');
const cls = (journey: number, plays = 0) => ({ id: 'default', name: '우리 반', progress: { version: 2, plays: Array.from({ length: plays }, (_, i) => ({ id: 'a', at: i, play: 'p' + i })), votes: [], reasons: [] }, journey: Array.from({ length: journey }, () => ({ kind: 'play', date: '2026-11-01' })) });

test('record screens are precached; the whole app is listed for the offline button', () => {
  const cfg = read('vite.config.ts');
  assert.match(cfg, /WeekPlanPage\|ClassJourney\|ClassProgressPage\|GamePlayPage/);
  assert.match(cfg, /'sw-all\.json'/);
  const sw = read('public/sw.js');
  assert.match(sw, /const ALL_LIST_URL = '\/sw-all\.json'/);
  assert.match(sw, /if \(await cache\.match\(OFFLINE_ALL_URL\)\)/, 'a new deploy refetches everything once the teacher asked');
  for (const page of ['src/presentation/WeekPlanPage.tsx', 'src/presentation/ClassTools.tsx']) assert.match(read(page), /<OfflineReady\/>/);
  assert.match(read('src/presentation/components/OfflineReady.tsx'), /인터넷 없이 쓰기 준비/);
});

test('the service worker fetches every screen on request, reports progress, and keeps them after an update', async () => {
  const origin = 'https://physical.test';
  const key = (v: string | { url: string }) => new URL(typeof v === 'string' ? v : v.url, origin).href;
  const store = new Map<string, Response>();
  const cache = {
    async put(k: string | { url: string }, v: Response) { store.set(key(k), v.clone()); },
    async match(k: string | { url: string }) { return store.get(key(k))?.clone(); },
    async keys() { return [...store.keys()].map(url => ({ url })); },
    async delete(k: string | { url: string }) { return store.delete(key(k)); },
  };
  const caches = { async open() { return cache; }, async keys() { return ['physical-v3']; }, async delete() { return true; } };
  let all = ['/assets/a-1.js', '/assets/b-1.js', '/assets/c-1.css'];
  let broken = '';
  const fetched: string[] = [];
  const network = async (r: string | { url: string }) => {
    const url = key(r); fetched.push(url);
    if (url === origin + '/') return new Response('<html><script src="/assets/index-1.js"></script></html>', { headers: { 'Content-Type': 'text/html' } });
    if (url === origin + '/sw-precache.json') return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
    if (url === origin + '/sw-all.json') return new Response(JSON.stringify(all), { headers: { 'Content-Type': 'application/json' } });
    if (broken && url.endsWith(broken)) return new Response('', { status: 404 });
    return new Response('bytes', { headers: { 'Content-Type': 'text/javascript' } });
  };
  const listeners: Record<string, (event: unknown) => void> = {};
  vm.runInNewContext(read('public/sw.js'), {
    self: { location: { origin }, addEventListener(n: string, h: (e: unknown) => void) { listeners[n] = h; }, async skipWaiting() {}, clients: { async claim() {} } },
    fetch: network, caches, URL, Response, Promise, Set, JSON, Date,
  });
  const run = async (name: string) => { let task: Promise<unknown> | undefined; listeners[name]({ waitUntil(p: Promise<unknown>) { task = p; } }); await task; };
  await run('install'); await run('activate');
  assert.ok(!fetched.includes(origin + '/sw-all.json'), 'the whole app is not fetched unless asked');
  const ask = async () => {
    const replies: { type: string; done?: number; total?: number; failed?: number }[] = [];
    let task: Promise<unknown> | undefined;
    listeners.message({ data: { type: 'cache-all' }, ports: [{ postMessage: (m: never) => replies.push(JSON.parse(JSON.stringify(m))) }], waitUntil(p: Promise<unknown>) { task = p; } });
    await task; return replies;
  };
  broken = 'b-1.js';
  let replies = await ask();
  assert.deepEqual(replies.at(-1), { type: 'cache-all-done', total: 3, failed: 1 });
  assert.ok(!store.has(origin + '/__sw-offline-all'), 'a partial download is not marked ready');
  broken = '';
  replies = await ask();
  assert.deepEqual(replies.filter(r => r.type === 'cache-all-progress').map(r => r.done), [1, 2, 3]);
  assert.deepEqual(replies.at(-1), { type: 'cache-all-done', total: 3, failed: 0 });
  assert.ok(store.has(origin + '/__sw-offline-all'));
  // A new deployment: install fetches its whole list, and activate keeps those files.
  all = ['/assets/a-2.js', '/assets/d-2.js'];
  await run('install'); await run('activate');
  assert.ok(store.has(origin + '/assets/d-2.js'), 'the new deployment is ready offline too');
  assert.ok(!store.has(origin + '/assets/b-1.js'), 'files of the old deployment are dropped');
});

test('auto upload: same, upload, ask on conflict, offer to load on an empty device', () => {
  const one = { classes: [cls(1)] }, two = { classes: [cls(2)] }, other = { classes: [cls(5)] }, empty = { classes: [cls(0)] };
  // The key ignores property order (the database reorders it) and when it was saved.
  const reordered = { classes: [Object.fromEntries(Object.entries(cls(1)).reverse())] } as typeof one;
  assert.equal(contentKey(reordered), contentKey(one));
  assert.notEqual(contentKey(one), contentKey(two));
  assert.equal(isEmptyBackup(empty), true); assert.equal(isEmptyBackup(one), false);
  assert.equal(isEmptyBackup({ classes: [cls(0), { ...cls(0), id: 'b' }] }), false, 'two classes are worth keeping');
  const local = (b: typeof one) => ({ key: contentKey(b), empty: isEmptyBackup(b) });
  const server = (b: typeof one | null, at: string | null) => ({ key: b ? contentKey(b) : null, at });
  assert.equal(decideSync(EMPTY_SYNC, local(one), server(one, 't1')), 'same');
  assert.equal(decideSync(EMPTY_SYNC, local(one), server(null, null)), 'upload');
  // Synced at t1, then this device changed and nobody else uploaded: upload.
  assert.equal(decideSync({ key: contentKey(one), serverAt: 't1' }, local(two), server(one, 't1')), 'upload');
  // Another device uploaded something else after t1: ask.
  assert.equal(decideSync({ key: contentKey(one), serverAt: 't1' }, local(two), server(other, 't2')), 'conflict');
  // A first-time device with records and an account that already has different records: ask.
  assert.equal(decideSync(EMPTY_SYNC, local(two), server(other, 't2')), 'conflict');
  // An empty device never uploads; it offers the account's records instead.
  assert.equal(decideSync(EMPTY_SYNC, local(empty), server(other, 't2')), 'offer-load');
  assert.equal(decideSync(EMPTY_SYNC, local(empty), server(null, null)), 'skip-empty');
  assert.deepEqual(parseSyncRecord({ key: 'k', serverAt: 1, off: 'yes', dismissedAt: 't' }), { key: 'k', serverAt: null, off: undefined, dismissedAt: 't' });
  assert.deepEqual(parseSyncRecord('x'), EMPTY_SYNC);
});

test('auto upload is wired in: started only with a teacher login, with a switch and a prompt', () => {
  const main = read('src/main.tsx');
  assert.match(main, /if \(sessionStorage\.getItem\('physical_supabase_auth'\) \|\| localStorage\.getItem\('physical_supabase_auth'\)\) void import\('\.\/application\/cloudAutoSync'\)/);
  const sync = read('src/application/cloudAutoSync.ts');
  assert.match(sync, /if\(!force&&key===rec\.key\)return 'same';/, 'no server call while nothing changed');
  assert.match(sync, /600_000/, 'backs off when the server lacks the feature');
  assert.match(read('src/presentation/components/ClassSwitcher.tsx'), /data-class-cloud-auto/);
  assert.match(read('src/presentation/ClassProgressPage.tsx'), /<CloudSyncPrompt\/>/);
  assert.match(read('src/presentation/WeekPlanPage.tsx'), /<CloudSyncPrompt\/>/);
  assert.match(read('scripts/records-account-e2e.cjs'), /PASS auto upload/);
});
