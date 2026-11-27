import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GYM_SPACE, CLASSROOM_SPACE, DEFAULT_TODAY, buildTodayPlan, rainCandidates, rainTargets, startRun, swapToSpace, mainCandidates } from '../src/domain/todayLesson';
import { FIT_SPACES } from '../src/domain/activityFit';
import { SPORT_SERIES, seriesFromQuery } from '../src/domain/sportSeries';
import { SPORT_BY_ID } from '../src/domain/sportsClassroom';
import { challengers, everyoneChallenged, newSwapState, parseSwapState, roleOfGroup, swap } from '../src/domain/roleSwap';
import { BEAT_CARDS, cycleBeat, hasMove, newBeatState, parseBeatState, showAt } from '../src/domain/beatMoves';
import { EMPTY_POOL, parsePoolPrep, poolQuestions, splitLines } from '../src/domain/poolPrep';
import { CLASS_TOOLS } from '../src/domain/classTools';

const read = (p: string) => readFileSync(p, 'utf8');

test('rope relay folds titles, tabs and settings while running so every group fits a TV', () => {
  const tools = read('src/presentation/ClassTools.tsx');
  assert.match(tools, /const focus=started\(state\)&&!settingsOpen;/);
  assert.match(tools, /document\.body\.classList\.toggle\('tools-focus',focus\)/);
  assert.match(tools, /data-rope-settings>⚙ 설정 열기/);
  const css = read('src/presentation/ClassTools.css');
  assert.match(css, /body\.tools-focus \.class-tools\[data-tool="rope-relay"\]>\.tools-tabs/, 'only while the rope relay is the open tool');
  assert.match(css, /grid-template-columns:repeat\(var\(--rope-cols\),minmax\(0,1fr\)\)/);
});

test('rain: a field lesson can move to the gym or the classroom, a gym lesson to the classroom', () => {
  const field = startRun(buildTodayPlan({ ...DEFAULT_TODAY, space: FIT_SPACES[2] }, 3), 1);
  assert.deepEqual(rainTargets(field), [GYM_SPACE, CLASSROOM_SPACE]);
  const gymPicks = rainCandidates(field, GYM_SPACE);
  assert.ok(gymPicks.length >= 1 && gymPicks.every(g => mainCandidates(DEFAULT_TODAY.grade, GYM_SPACE).some(c => c.id === g.id)));
  const inGym = swapToSpace(field, gymPicks[0].id, GYM_SPACE);
  assert.equal(inGym.plan.settings.space, GYM_SPACE);
  assert.doesNotMatch(inGym.plan.stages.find(s => s.kind === 'main')!.note, /교실이 좁으면/);
  assert.deepEqual(rainTargets(inGym), [CLASSROOM_SPACE], 'from the gym the classroom is still possible');
  const inRoom = swapToSpace(inGym, rainCandidates(inGym, CLASSROOM_SPACE)[0].id, CLASSROOM_SPACE);
  assert.equal(inRoom.rainFrom, inGym.rainFrom, 'keeps the original main game');
  assert.deepEqual(rainTargets(inRoom), []);
  assert.match(read('src/presentation/TodayLesson.tsx'), /비가 와서 \{run\.plan\.settings\.space\} 수업으로 바꿨어요/);
});

test('three sport series follow the sports-classroom lessons they open', () => {
  assert.deepEqual(SPORT_SERIES.map(s => s.id), ['badminton-3', 'volleyball-3', 'teeball-3']);
  for (const s of SPORT_SERIES) {
    assert.ok(SPORT_BY_ID.get(s.sport), `${s.sport} exists in the sports classroom`);
    assert.deepEqual(s.lessons.map(l => l.no), [1, 2, 3]);
    for (const l of s.lessons) { assert.equal(l.rules.length, 3); assert.ok(l.watch && l.repeatIf); }
    assert.ok(seriesFromQuery(s.sport, s.id, '3'));
  }
  assert.equal(seriesFromQuery('volleyball', 'teeball-3', '1'), null);
});

test('role swap: the next groups come back on every signal, and everyone gets a turn', () => {
  let s = newSwapState(4, 1, 60);
  assert.deepEqual([0, 1, 2, 3].map(g => roleOfGroup(s, g)), ['도전', '준비', '연습', '연습']);
  s = swap(s); assert.deepEqual(challengers(s), [1]); assert.equal(roleOfGroup(s, 2), '준비');
  assert.equal(everyoneChallenged(s), false);
  s = swap(swap(s)); assert.equal(everyoneChallenged(s), true); assert.equal(s.swaps, 3);
  s = swap(s); assert.deepEqual(challengers(s), [0], 'wraps around');
  const two = swap(newSwapState(5, 2, 30)); assert.deepEqual(challengers(two), [2, 3]);
  assert.deepEqual(parseSwapState(JSON.parse(JSON.stringify(two))), two);
  assert.equal(parseSwapState({ ...two, seconds: 45 }), null);
  assert.equal(newSwapState(2, 5).active, 1);
});

test('8-beat maker: cards cycle, rest-only rows cannot be shown, the show runs groups in order twice', () => {
  let s = newBeatState(3, 80);
  assert.ok(s.teams.every(t => t.pattern.length === 8 && hasMove(t.pattern)));
  const first = s.teams[0].pattern[0];
  s = cycleBeat(s, 0, 0); assert.notEqual(s.teams[0].pattern[0], first);
  for (let i = 0; i < BEAT_CARDS.length - 1; i++) s = cycleBeat(s, 0, 0);
  assert.equal(s.teams[0].pattern[0], first, 'four presses come back to the same card');
  assert.equal(hasMove(Array(8).fill('rest')), false);
  assert.deepEqual(showAt(s, 0), { group: 0, beat: 0, round: 0 });
  assert.deepEqual(showAt(s, 9), { group: 0, beat: 1, round: 1 });
  assert.deepEqual(showAt(s, 16), { group: 1, beat: 0, round: 0 });
  assert.equal(showAt(s, 48), null);
  assert.deepEqual(parseBeatState(JSON.parse(JSON.stringify(s))), s);
  assert.equal(parseBeatState({ ...s, bpm: 70 }), null);
});

test('pool prep: questions only from what the teacher wrote, printable task, linked from safety', () => {
  assert.equal(poolQuestions(EMPTY_POOL).length, 2, 'items + the water-rescue question');
  const p = parsePoolPrep({ date: '6월 10일', place: '구민 수영장', travel: '버스', items: ['수영복', ' ', 3], promises: splitLines('호루라기에 멈춰요\n\n뛰지 않아요') });
  assert.deepEqual(p.items, ['수영복']);
  const qs = poolQuestions(p);
  assert.equal(qs.length, 6);
  assert.equal(qs[0].a, '6월 10일 · 구민 수영장');
  assert.match(qs.at(-1)!.a, /물에 들어가지 않고/);
  assert.equal(parsePoolPrep({ place: 'x'.repeat(200) }).place.length, 80);
  assert.match(read('src/App.tsx'), /path="\/safety\/pool" element=\{<PoolPrepPage\/>\}/);
  assert.match(read('src/presentation/SafetyClassroom.tsx'), /to="\/safety\/pool" data-pool-link/);
  assert.match(read('src/presentation/PoolPrepPage.tsx'), /오늘 확인한 약속 한 가지/);
  assert.match(read('src/presentation/PoolPrepPage.tsx'), /to="\/play\/water-rescue-throw"/);
});

test('new tools are registered and kept to this tab', () => {
  assert.deepEqual(CLASS_TOOLS.slice(0, 3).map(t => t.id), ['rope-relay', 'role-swap', 'beat-moves']);
  const tools = read('src/presentation/ClassTools.tsx');
  assert.match(tools, /'role-swap':RoleSwap,'beat-moves':BeatMaker/);
  assert.match(tools, /writeStorage\(SWAP_KEY,JSON\.stringify\(state\),'session'\)/);
  assert.match(tools, /writeStorage\(BEAT_KEY,JSON\.stringify\(state\),'session'\)/);
  assert.match(read('.github/workflows/checks.yml'), /npm run test:lesson-ideas/);
});
