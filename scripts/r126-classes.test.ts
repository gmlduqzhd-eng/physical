import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_CLASS_ID, EMPTY_ROSTER, MAX_CLASSES, addClass, classStorageKey, currentClass, parseRoster, removeClass, renameClass, selectClass } from '../src/domain/classRoster';
import { BACKUP_KIND, backupSummary, buildBackup, parseBackup } from '../src/domain/classBackup';

test('default class keeps the old storage place; other classes get their own', () => {
  assert.equal(classStorageKey('physical_class_progress_v1', DEFAULT_CLASS_ID), 'physical_class_progress_v1');
  assert.equal(classStorageKey('physical_class_progress_v1', 'ab12cd34'), 'physical_class_progress_v1::ab12cd34');
});
test('add, rename, select and remove classes', () => {
  let r = addClass(EMPTY_ROSTER, '  5학년   2반 ', 'aaaa1111');
  assert.equal(currentClass(r).name, '5학년 2반');
  r = addClass(r, '6학년 1반', 'bbbb2222');
  assert.equal(r.classes.length, 3);
  assert.equal(addClass(r, '', 'cccc3333'), r, 'empty name is ignored');
  assert.equal(addClass(r, '중복', 'aaaa1111'), r, 'duplicate id is ignored');
  r = renameClass(r, 'aaaa1111', '5-2');
  assert.equal(r.classes[1].name, '5-2');
  r = selectClass(r, 'aaaa1111');
  r = removeClass(r, 'aaaa1111');
  assert.equal(r.current, DEFAULT_CLASS_ID, 'removing the chosen class falls back to the default');
  assert.equal(removeClass(r, DEFAULT_CLASS_ID), r, 'the default class cannot be removed');
});
test('roster from storage is not trusted', () => {
  const r = parseRoster({ classes: [{ id: '../x', name: 'bad' }, { id: 'ok123', name: '3반' }, { id: 'ok123', name: 'dup' }, { id: 'default', name: '담임 반' }, null, { id: 'noname', name: '   ' }], current: 'nope' });
  assert.deepEqual(r.classes.map(c => c.id), [DEFAULT_CLASS_ID, 'ok123']);
  assert.equal(r.classes[0].name, '담임 반');
  assert.equal(r.current, DEFAULT_CLASS_ID);
  const many = parseRoster({ classes: Array.from({ length: 40 }, (_, i) => ({ id: `c${i}`, name: `${i}반` })) });
  assert.equal(many.classes.length, MAX_CLASSES);
});
test('backup round-trips every class and rejects other files', () => {
  const roster = addClass(EMPTY_ROSTER, '5학년 2반', 'aaaa1111');
  const data: Record<string, { progress: unknown; journey: unknown }> = {
    default: { progress: { version: 2, plays: [{ id: 'sig-boss-raid', at: 1000, play: 'p1' }], votes: [], reasons: [] }, journey: [{ kind: 'play', date: '2026-11-01' }] },
    aaaa1111: { progress: null, journey: [{ kind: 'sports', date: '2026-11-02' }, { kind: 'bad', date: 'x' }] },
  };
  const backup = buildBackup(roster, id => data[id], '2026-11-24T00:00:00.000Z');
  assert.equal(backup.kind, BACKUP_KIND);
  const parsed = parseBackup(JSON.parse(JSON.stringify(backup)));
  assert.ok(parsed);
  assert.equal(parsed.roster.current, 'aaaa1111');
  assert.equal(parsed.data.get('default')!.progress.plays.length, 1);
  assert.equal(parsed.data.get('aaaa1111')!.journey.length, 1, 'bad stamps are dropped');
  assert.match(backupSummary(parsed), /우리 반: 1판 · 도장 1개 \/ 5학년 2반: 0판 · 도장 1개/);
  assert.equal(parseBackup({ kind: 'something-else', version: 1, classes: [] }), null);
  assert.equal(parseBackup({ kind: BACKUP_KIND, version: 99, classes: [] }), null, 'newer file versions are refused');
  assert.equal(parseBackup('text'), null);
});
test('records, journey and feedback follow the chosen class', () => {
  const store = readFileSync('src/application/classProgressStore.ts', 'utf8');
  assert.match(store, /const storageKey=\(\)=>classKey\(CLASS_PROGRESS_KEY\)/);
  assert.match(store, /onClassChange\(\(\)=>\{memory=EMPTY_PROGRESS/);
  assert.match(readFileSync('src/presentation/ClassJourney.tsx', 'utf8'), /<JourneyOf key=\{roster\.current\}/);
  assert.match(readFileSync('src/presentation/components/ClassFeedbackSlot.tsx', 'utf8'), /data-feedback-class/);
  assert.match(readFileSync('src/presentation/TodayLesson.tsx', 'utf8'), /<ClassSwitcher manage=\{false\}\/>/);
});
