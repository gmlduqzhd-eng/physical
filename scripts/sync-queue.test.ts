import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SYNC_WARNING, canEnqueue, dueAction, failedAction, parseSyncQueue, retryDelayMs, settleSyncAction, splitExpired, type SyncAction } from '../src/application/syncQueueLogic';

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 22, 3, 0, 0);
const action = (id: string, extra: Partial<SyncAction> = {}): SyncAction => ({ id, type: 'INCREMENT_SCORE', payload: { id: 'group-1', amount: 10 }, timestamp: NOW, ...extra });

test('parseSyncQueue keeps only well-formed, fresh, unique score actions', () => {
  const good = action('a');
  const parsed = parseSyncQueue([
    good,
    action('a'), // 같은 id는 한 번만
    { ...action('b'), type: 'OTHER' },
    { ...action('c'), payload: { id: 'group-1', amount: 1.5 } },
    { ...action('d'), payload: { id: 'group-1', amount: 2_000_000 } },
    { ...action('e'), payload: { id: 7, amount: 1 } },
    action('f', { timestamp: NOW - 9 * HOUR }), // 8시간이 지난 것
    action('g', { timestamp: NOW + 5 * 60_000 }), // 시계가 5분 앞선 것
    action('x'.repeat(129)),
    null, 'text', 3,
    action('h', { payload: { id: 'group-2', amount: -50, activityId: 'zigzag' } }),
  ], NOW);
  assert.deepEqual(parsed.map(item => item.id), ['a', 'h']);
  assert.deepEqual(parseSyncQueue('not an array', NOW), []);
  assert.deepEqual(parseSyncQueue(undefined, NOW), []);
});

test('retry waits 2s, 4s, 8s, 16s and then never more than 30s', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 20].map(retryDelayMs), [2000, 4000, 8000, 16000, 30000, 30000, 30000]);
  assert.equal(retryDelayMs(0), 2000);
});

test('a failed send keeps the action and schedules the next try (fake clock)', () => {
  mock.timers.enable({ apis: ['Date'], now: NOW });
  try {
    const first = failedAction(action('a'));
    assert.equal(first.retryCount, 1);
    assert.equal(first.nextRetryAt, NOW + 2000);
    // 아직 때가 아니면 남은 시간만큼 기다린다.
    assert.deepEqual(dueAction([first]), { action: first, delay: 2000 });
    mock.timers.tick(1500);
    assert.equal(dueAction([first])?.delay, 500);
    mock.timers.tick(500);
    assert.equal(dueAction([first])?.delay, 0);
    const second = failedAction(first);
    assert.equal(second.retryCount, 2);
    assert.equal(second.nextRetryAt, NOW + 2000 + 4000);
    assert.equal(second.id, 'a'); // 같은 id로 다시 보내야 서버가 한 번만 반영한다
    assert.equal(second.timestamp, NOW);
  } finally { mock.timers.reset(); }
});

test('dueAction picks the action whose retry time comes first; new actions go first', () => {
  const waiting = action('late', { retryCount: 3, nextRetryAt: NOW + 8000 });
  const sooner = action('soon', { retryCount: 1, nextRetryAt: NOW + 2000 });
  const fresh = action('new');
  assert.equal(dueAction([waiting, sooner], NOW)?.action.id, 'soon');
  assert.deepEqual(dueAction([waiting, sooner, fresh], NOW), { action: fresh, delay: 0 });
  assert.equal(dueAction([], NOW), null);
});

test('settleSyncAction: saved clears the notice, pending and obsolete leave the queue with a notice', async () => {
  const calls: string[] = [];
  const save = (result: 'saved' | 'pending' | 'obsolete' | 'retry') => async (item: SyncAction) => { calls.push(item.id); return result; };
  assert.deepEqual(await settleSyncAction(action('a'), save('saved')), { done: true, warning: null });
  assert.deepEqual(await settleSyncAction(action('b'), save('pending')), { done: true, warning: SYNC_WARNING.pending });
  assert.deepEqual(await settleSyncAction(action('c'), save('obsolete')), { done: true, warning: SYNC_WARNING.obsolete });
  assert.deepEqual(calls, ['a', 'b', 'c']);
});

test('settleSyncAction: a retry answer or a thrown error keeps the action with backoff', async () => {
  const retried = await settleSyncAction(action('a'), async () => 'retry', () => NOW);
  assert.deepEqual(retried, { done: false, failed: action('a', { retryCount: 1, nextRetryAt: NOW + 2000 }) });
  const thrown = await settleSyncAction(action('b', { retryCount: 4, nextRetryAt: NOW }), async () => { throw new Error('offline'); }, () => NOW);
  assert.deepEqual(thrown, { done: false, failed: action('b', { retryCount: 5, nextRetryAt: NOW + 30000 }) });
});

test('scores older than 8 hours are separated so the student can be told', () => {
  const old = action('old', { timestamp: NOW - 8 * HOUR - 1 });
  const edge = action('edge', { timestamp: NOW - 8 * HOUR + 1000 });
  const { fresh, expired } = splitExpired([old, edge, action('now')], NOW);
  assert.deepEqual(expired.map(item => item.id), ['old']);
  assert.deepEqual(fresh.map(item => item.id), ['edge', 'now']);
  assert.match(SYNC_WARNING.expired(expired.length), /점수 1개는 보내지 못했어요/);
});

test('the same action id is never queued twice', () => {
  const queue = [action('a')];
  assert.equal(canEnqueue(queue, action('a'), NOW), false);
  assert.equal(canEnqueue(queue, action('b'), NOW), true);
  assert.equal(canEnqueue(queue, { ...action('c'), payload: { id: 'g', amount: Number.NaN } }, NOW), false);
  assert.equal(canEnqueue(queue, action('d', { timestamp: NOW - 9 * HOUR }), NOW), false);
});

test('the hook warns before leaving with unsent scores and no longer listens to cross-tab storage events', () => {
  const hook = readFileSync('src/application/useSyncQueue.ts', 'utf8');
  assert.match(hook, /window\.addEventListener\('beforeunload', warn\)/);
  assert.match(hook, /const hasPending = enabled && queue\.length > 0;/);
  assert.doesNotMatch(hook, /addEventListener\('storage'/);
  // 잘 보내면 앞서 띄운 안내를 지우고, 오래된 점수를 버릴 때는 알린다.
  assert.match(hook, /setSyncWarning\(outcome\.warning\)/);
  assert.match(hook, /setSyncWarning\(SYNC_WARNING\.expired\(expired\.length\)\)/);
});
