import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EMPTY_PROGRESS, type ClassProgress } from '../src/domain/classProgress';
import { DEFAULT_TODAY, mainCandidates } from '../src/domain/todayLesson';
import { buildWeekPlan, weekKeyOf, weekRows, WEEK_HEADERS } from '../src/domain/weekPlan';
import { buildTermSummary, termMeta, termRows } from '../src/domain/termSummary';

const mains = mainCandidates(DEFAULT_TODAY.grade, DEFAULT_TODAY.space).map(g => g.id);
const at = (day: number) => new Date(2026, 10, day, 10).getTime();
function progress(plays: [string, number][], votes: [string, 'up' | 'down', number][]): ClassProgress {
  return { version: 2, plays: plays.map(([id, d], i) => ({ id, at: at(d), play: `p${i}` })), votes: votes.map(([id, vote, d], i) => ({ id, vote, at: at(d), play: `v${i}` })), reasons: [] };
}

test('week plan: same week and settings give the same plan; each lesson has all four stages', () => {
  const a = buildWeekPlan(DEFAULT_TODAY, 3, EMPTY_PROGRESS, '2026-11-23'), b = buildWeekPlan(DEFAULT_TODAY, 3, EMPTY_PROGRESS, '2026-11-23');
  assert.deepEqual(a.lessons.map(l => l.mainId), b.lessons.map(l => l.mainId));
  assert.equal(a.lessons.length, 3);
  for (const l of a.lessons) assert.deepEqual(l.plan.stages.map(s => s.kind), ['warmup', 'main', 'cooldown', 'reflect']);
  assert.equal(new Set(a.lessons.map(l => l.mainId)).size, Math.min(3, mains.length), 'no repeats while candidates remain');
  assert.notDeepEqual(buildWeekPlan(DEFAULT_TODAY, 3, EMPTY_PROGRESS, '2026-11-23', 1).lessons.map(l => l.mainId).join(), '', 'shuffle still yields a plan');
});
test('week plan follows class reactions: liked first, disliked last', () => {
  assert.ok(mains.length >= 3, 'needs at least three main games for this test');
  const [liked, disliked] = mains;
  const p = progress([[liked, 2], [liked, 3], [disliked, 4], [disliked, 5]], [[liked, 'up', 2], [liked, 'up', 3], [disliked, 'down', 4], [disliked, 'down', 5]]);
  const plan = buildWeekPlan(DEFAULT_TODAY, mains.length, p, '2026-11-23');
  assert.equal(plan.lessons[0].mainId, liked);
  assert.equal(plan.lessons[0].reason, 'liked');
  assert.equal(plan.lessons.at(-1)!.mainId, disliked);
  assert.equal(plan.lessons.at(-1)!.reason, 'retry');
  assert.ok(plan.lessons.slice(1, -1).every(l => l.reason === 'new'));
  const rows = weekRows(plan);
  assert.equal(rows[0].length, WEEK_HEADERS.length);
  assert.equal(rows[0][0], '1차시');
});
test('week key is the Monday of that week', () => {
  assert.equal(weekKeyOf(new Date(2026, 10, 25, 9).getTime()), '2026-11-23');
  assert.equal(weekKeyOf(new Date(2026, 10, 29, 23).getTime()), '2026-11-23');
  assert.equal(weekKeyOf(new Date(2026, 10, 30, 0).getTime()), '2026-11-30');
});
test('term summary counts days, plays, domains and loved activities', () => {
  const p = progress([['a', 2], ['a', 2], ['b', 9], ['c', 9]], [['a', 'up', 2], ['a', 'up', 2], ['b', 'down', 9], ['b', 'down', 9]]);
  const domain = (id: string) => ({ a: '운동', b: '표현' } as Record<string, string>)[id];
  const s = buildTermSummary(p, [{ kind: 'play', date: '2026-11-02' }, { kind: 'sports', date: '2026-11-09' }], domain);
  assert.equal(s.from, '2026-11-02'); assert.equal(s.to, '2026-11-09');
  assert.equal(s.days, 2); assert.equal(s.plays, 4); assert.equal(s.stamps, 2);
  assert.deepEqual(s.domains, [{ name: '운동', plays: 2 }, { name: '그 밖', plays: 1 }, { name: '표현', plays: 1 }]);
  assert.deepEqual(s.loved.map(a => a.id), ['a']);
  assert.deepEqual(termRows(s, id => id.toUpperCase(), domain)[0], ['A', '운동', 2, 2, 0]);
  assert.deepEqual(termMeta(s, '5학년 2반', id => id.toUpperCase())[0], ['반', '5학년 2반']);
  const empty = buildTermSummary(EMPTY_PROGRESS, [], domain);
  assert.equal(empty.from, null); assert.equal(empty.plays, 0);
});
test('screens are wired: /week route, link from today, ?main= opens that lesson, term tab', () => {
  assert.match(readFileSync('src/App.tsx', 'utf8'), /<Route path="\/week" element=\{<WeekPlanPage\/>\} \/>/);
  const today = readFileSync('src/presentation/TodayLesson.tsx', 'utf8');
  assert.match(today, /to="\/week" data-week-link/);
  assert.match(today, /params\.get\('main'\)/);
  assert.match(readFileSync('src/presentation/ClassProgressPage.tsx', 'utf8'), /tab==='term'\?<TermSummaryTab className=\{className\}\/>/);
});
