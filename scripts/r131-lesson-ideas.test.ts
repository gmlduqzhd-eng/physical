import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { completeTurn, finishedCount, isFinished, newRopeState, parseRopeState, remaining, roleOf, setGroupTarget, stopAt, turnLine } from '../src/domain/ropeRelay';
import { CLASSROOM_SPACE, buildTodayPlan, mainCandidates, parseRun, rainCandidates, startRun, advanceRun, swapToClassroom, DEFAULT_TODAY } from '../src/domain/todayLesson';
import { SPORT_SERIES, markLesson, nextLesson, parseSeriesProgress, seriesFromQuery, seriesLessonPath } from '../src/domain/sportSeries';
import { CLASS_TOOLS } from '../src/domain/classTools';

const read = (p: string) => readFileSync(p, 'utf8');

test('rope relay: a stop keeps the count, a success rotates roles, a group finishes after every member', () => {
  let s = newRopeState(3, 4, 5);
  assert.equal(remaining(s, 0), 5);
  s = stopAt(s, 0, 3); assert.equal(remaining(s, 0), 2); assert.equal(s.teams[0].stops, 1);
  s = stopAt(s, 0, 1); assert.equal(s.teams[0].done, 3, 'a smaller count never goes backwards');
  s = stopAt(s, 0, 5); assert.equal(s.teams[0].turn, 1, 'reaching the target completes the turn'); assert.equal(s.teams[0].done, 0);
  assert.deepEqual([0, 1, 2, 3].map(m => roleOf(4, 1, m)), ['연습', '도전', '세기', '기록']);
  assert.equal(turnLine(s, 0), '2번째 도전 · 다음 3번째');
  for (let i = 0; i < 3; i++) s = completeTurn(s, 0);
  assert.ok(isFinished(s, 0)); assert.equal(remaining(s, 0), 0); assert.equal(finishedCount(s), 1);
  assert.equal(completeTurn(s, 0), s, 'a finished group does not move');
  s = setGroupTarget(stopAt(s, 1, 4), 1, 3); assert.equal(s.teams[1].target, 3); assert.equal(s.teams[1].done, 2, 'a lower target keeps the count below it');
  assert.deepEqual(parseRopeState(JSON.parse(JSON.stringify(s))), s);
  assert.equal(parseRopeState({ ...s, teams: s.teams.slice(1) }), null);
  assert.equal(parseRopeState({ ...s, motion: 'x' }), null);
  assert.equal(newRopeState(99, 1, 0).groups, 8);
});

test('rope relay is a class tool, linked from today, with print board and no student names', () => {
  assert.equal(CLASS_TOOLS[0].id, 'rope-relay');
  const tools = read('src/presentation/ClassTools.tsx');
  assert.match(tools, /'rope-relay':RopeRelay/);
  assert.match(tools, /writeStorage\(ROPE_KEY,JSON\.stringify\(state\),'session'\)/, 'kept in this tab only');
  assert.match(tools, /종이 표시판 인쇄/);
  assert.match(read('src/presentation/TodayLesson.tsx'), /to="\/tools\?tool=rope-relay" data-rope-link/);
  assert.match(read('src/presentation/ClassTools.css'), /body\.rope-printing \.rope-print/);
});

test('rainy day: swap the main game mid-lesson, keep finished stages, record where it came from', () => {
  const plan = buildTodayPlan({ ...DEFAULT_TODAY, space: '체육관·강당' as never }, 7);
  if (!plan.stages.some(s => s.kind === 'main')) return;
  let run = startRun(plan, 1_000_000);
  const list = rainCandidates(run);
  assert.ok(list.length >= 2 && list.length <= 3);
  assert.ok(list.every(g => mainCandidates(plan.settings.grade, CLASSROOM_SPACE).some(c => c.id === g.id)));
  assert.equal(rainCandidates(run).map(g => g.id).join(), list.map(g => g.id).join(), 'same lesson, same order');
  run = advanceRun(run, 'done', 1_200_000); // 준비운동 마침
  const warm = run.plan.stages[0];
  const swapped = swapToClassroom(run, list[0].id);
  const main = swapped.plan.stages.find(s => s.kind === 'main')!;
  assert.equal(main.gameId, list[0].id); assert.match(main.note, /교실이 좁으면/);
  assert.deepEqual(swapped.plan.stages[0], warm, 'a finished stage is left as it was');
  assert.equal(swapped.plan.settings.space, CLASSROOM_SPACE);
  assert.equal(swapped.rainFrom, plan.stages.find(s => s.kind === 'main')!.gameId);
  assert.deepEqual(rainCandidates(swapped), [], 'no second swap once in the classroom');
  assert.equal(swapToClassroom(run, 'sig-not-a-game'), run);
  assert.ok(parseRun(JSON.parse(JSON.stringify(swapped))), 'the swapped lesson survives a reload');
  assert.equal(parseRun({ ...swapped, rainFrom: 'nope' }), null);
  // 본게임을 마친 뒤에는 바꾸지 않는다
  assert.deepEqual(rainCandidates(advanceRun(run, 'done', 1_300_000)), []);
});

test('badminton series: three lessons in order, per-class progress, safe query parsing', () => {
  const series = SPORT_SERIES.find(s => s.id === 'badminton-3')!;
  assert.deepEqual(series.lessons.map(l => [l.no, l.level]), [[1, 'easy'], [2, 'basic'], [3, 'basic']]);
  for (const l of series.lessons) { assert.equal(l.rules.length, 3); assert.ok(l.watch.length > 10); assert.ok(l.repeatIf.length > 10); }
  let p = markLesson({}, 'badminton-3', 2, true);
  assert.equal(nextLesson(p, series)!.no, 1);
  p = markLesson(p, 'badminton-3', 1, true); assert.equal(nextLesson(p, series)!.no, 3);
  p = markLesson(markLesson(p, 'badminton-3', 3, true), 'badminton-3', 9, true); assert.equal(nextLesson(p, series), null); assert.deepEqual(p['badminton-3'], [1, 2, 3]);
  assert.deepEqual(markLesson(markLesson({}, 'badminton-3', 1, true), 'badminton-3', 1, false), {});
  assert.deepEqual(parseSeriesProgress({ 'badminton-3': [3, 1, 1, 'x', 7], other: [1] }), { 'badminton-3': [1, 3] });
  assert.equal(seriesLessonPath(series, 2), '/sports/badminton?series=badminton-3&lesson=2');
  assert.equal(seriesFromQuery('badminton', 'badminton-3', '2')!.lesson.no, 2);
  assert.equal(seriesFromQuery('soccer', 'badminton-3', '2'), null);
  assert.equal(seriesFromQuery('badminton', 'badminton-3', '4'), null);
  assert.match(read('src/application/classRosterStore.ts'), /'physical_sport_series_v1'\] as const/, 'deleted with the class');
  assert.match(read('src/presentation/WeekPlanPage.tsx'), /<SportSeriesCard classId=\{classId\}\/>/);
  assert.match(read('src/presentation/SportsClassroom.tsx'), /series\?\.lesson\.level\?\?saved\?\.level/);
  assert.match(read('.github/workflows/checks.yml'), /npm run test:lesson-ideas/);
});
