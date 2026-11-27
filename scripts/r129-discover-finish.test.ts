import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EMPTY_PROGRESS, type ClassProgress } from '../src/domain/classProgress';
import { DEFAULT_TODAY, mainCandidates, parseTodaySettings } from '../src/domain/todayLesson';
import { buildWeekPlan, lessonsDone, parsePinnedWeek, pinWeek, pinnedPlan } from '../src/domain/weekPlan';
import { NO_BACKUP, NUDGE_PLAYS, markBackedUp, markSnoozed, parseBackupMark, playsSinceBackup, shouldNudge } from '../src/domain/backupNudge';

const read = (f: string) => readFileSync(f, 'utf8');
test('new features have a way in and a manual entry', () => {
  assert.match(read('src/presentation/StartLesson.tsx'), /to="\/week" data-start-week/);
  const tools = read('src/presentation/ClassTools.tsx');
  for (const to of ['/class-progress', '/class-progress?tab=term', '/journey', '/week']) assert.ok(tools.includes(`<Link to="${to}">`), to);
  const guide = read('src/presentation/components/ManualRecordsGuide.tsx');
  for (const word of ['반 관리', '여러 차시 계획', '학기 정리', '기록 파일로 보관', '계정에 올리기']) assert.ok(guide.includes(word), word);
  assert.match(read('src/presentation/Manual.tsx'), /<ManualRecordsGuide\/>/);
});
test('admin sees anonymous activity counts', () => {
  assert.match(read('src/presentation/components/ActivityStatsCard.tsx'), /rpc\('activity_play_summary',\{days\}\)/);
  assert.match(read('src/presentation/TeacherMembers.tsx'), /\{loaded&&<ActivityStatsCard\/>\}/);
});
test('pinned week keeps its order, survives reload, and expires next week', () => {
  const plan = buildWeekPlan(DEFAULT_TODAY, 3, EMPTY_PROGRESS, '2026-11-23');
  const pin = pinWeek(plan, 1000);
  const again = parsePinnedWeek(JSON.parse(JSON.stringify(pin)), '2026-11-23', parseTodaySettings);
  assert.ok(again);
  assert.deepEqual(pinnedPlan(again).lessons.map(l => l.mainId), plan.lessons.map(l => l.mainId));
  assert.deepEqual(pinnedPlan(again).lessons.map(l => l.plan.stages.map(s => s.title)), plan.lessons.map(l => l.plan.stages.map(s => s.title)), 'same warm-up and cool-down too');
  assert.equal(parsePinnedWeek(pin, '2026-11-30', parseTodaySettings), null, 'a new week starts fresh');
  assert.equal(parsePinnedWeek({ ...pin, lessons: [{ mainId: 'nope', reason: 'new', seed: 1 }] }, '2026-11-23', parseTodaySettings), null);
  assert.equal(parsePinnedWeek('x', '2026-11-23', parseTodaySettings), null);
});
test('lessons are marked done from plays recorded after pinning', () => {
  const mains = mainCandidates(DEFAULT_TODAY.grade, DEFAULT_TODAY.space).map(g => g.id);
  const pin = { weekKey: '2026-11-23', pinnedAt: 1000, settings: DEFAULT_TODAY, lessons: [mains[0], mains[1], mains[0]].map((mainId, i) => ({ mainId, reason: 'new' as const, seed: i })) };
  const p = (plays: [string, number][]): ClassProgress => ({ version: 2, plays: plays.map(([id, at], i) => ({ id, at, play: `p${i}` })), votes: [], reasons: [] });
  assert.deepEqual(lessonsDone(pin, p([[mains[0], 500]])), [false, false, false], 'plays before pinning do not count');
  assert.deepEqual(lessonsDone(pin, p([[mains[0], 2000]])), [true, false, false]);
  assert.deepEqual(lessonsDone(pin, p([[mains[0], 2000], [mains[0], 3000], [mains[1], 4000]])), [true, true, true], 'same game twice needs two plays');
});
test('backup nudge appears after enough new plays and can be snoozed', () => {
  assert.equal(shouldNudge(NO_BACKUP, NUDGE_PLAYS - 1), false);
  assert.equal(shouldNudge(NO_BACKUP, NUDGE_PLAYS), true);
  const saved = markBackedUp(NO_BACKUP, 12, 5000, false);
  assert.equal(shouldNudge(saved, 12 + NUDGE_PLAYS - 1), false);
  assert.equal(shouldNudge(saved, 12 + NUDGE_PLAYS), true);
  assert.equal(playsSinceBackup(saved, 30), 18);
  assert.equal(playsSinceBackup(saved, 3), 0, 'cleared records never give a negative count');
  const later = markSnoozed(saved, 22);
  assert.equal(shouldNudge(later, 25), false);
  assert.equal(shouldNudge(later, 32), true);
  const cloud = markBackedUp(saved, 40, 9000, true);
  assert.equal(cloud.cloudAt, 9000);
  assert.equal(markBackedUp(cloud, 50, 9500, false).cloudAt, 9000, 'a file backup keeps the last account upload time');
  assert.deepEqual(parseBackupMark({ at: -1, plays: 'x', cloudAt: 3.7 }), { at: 0, plays: 0, cloudAt: 3, snoozedPlays: 0 });
});
test('backups are noted, and screens say where records live', () => {
  assert.match(read('src/application/classBackupStore.ts'), /noteBackedUp\(false,now\.getTime\(\)\)/);
  assert.match(read('src/application/classCloudStore.ts'), /if\(state\.status==='ready'\)noteBackedUp\(true\)/);
  assert.match(read('src/presentation/ClassProgressPage.tsx'), /<StorageNote\/><\/p>\s*<CloudSyncPrompt\/>\s*<BackupNudge\/>/);
  assert.match(read('src/presentation/ClassJourney.tsx'), /<StorageNote\/>/);
});
