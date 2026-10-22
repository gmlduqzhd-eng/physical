import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GAMES } from '../src/domain/gamesData';
import { LESSON_GAME_CATALOG } from '../src/data/lessonGameCatalog';
import { getPhysicalActivityPlan } from '../src/domain/physicalActivityPlans';
import { normalizeGameResultDetails } from '../src/domain/gameResultDetails';
import { gameBestStorageKey, makeQuestRound, questAccurate, questDuration, questCue, questResult, safeRoute, QUEST_IDS, QUEST_META, PILOT_QUEST_IDS } from '../src/domain/movementQuests';
import type { QuestId, QuestSettings, QuestRecord } from '../src/domain/movementQuests';

const settings: QuestSettings = { seated: false, gentle: true, practice: true, players: 3 };
function records(id: QuestId, config = settings): QuestRecord[] {
  return [0, 1, 2].map(round => {
    const plan = makeQuestRound(id, round, config);
    const choice = plan.choices.find(c => (!plan.decision||c.id===plan.decision.answer)&&(!c.path || safeRoute(c.path, plan.blocked!)))!;
    const picked=makeQuestRound(id,round,config,choice.id);
    return { round, choice: choice.id, outcome: 'complete', activeMs: picked.timing ? picked.timing.targetSeconds*1000 : questDuration(picked), retries: 0, ...(picked.question?{answer:picked.question.answer}:{}) };
  });
}
test('every delivery map has a reachable route and blocks the advertised square', () => {
  for (let round = 0; round < 3; round++) {
    const plan = makeQuestRound('zigzag', round, settings);
    assert(plan.choices.some(c => safeRoute(c.path!, plan.blocked!)));
    assert(plan.choices.some(c => !safeRoute(c.path!, plan.blocked!)));
    for (const c of plan.choices.filter(c => safeRoute(c.path!, plan.blocked!))) {
      const picked = makeQuestRound('zigzag', round, settings, c.id);
      assert.equal(picked.cues[0], '7번');
      assert.match(picked.cues[4], /3번 · 보급품 집기/);
      assert.match(picked.cues.at(-1)!, /7번 · 기지 도착/);
    }
  }
  assert(!safeRoute([6, 2], 4)); assert(!safeRoute([6, 3, 0, 1, 2], 1));
});
test('waiting, an unfinished round, blocked paths and malformed records never award completion', () => {
  for (const id of QUEST_IDS) {
    assert.equal(questResult(id, settings, []), null);
    assert.equal(questResult(id, settings, records(id).slice(0, 2)), null);
    const short = records(id); short[0].activeMs = 0; assert.equal(questResult(id, settings, short), null);
    const invalid = records(id); invalid[0].activeMs = NaN; assert.equal(questResult(id, settings, invalid), null);
    const duplicate = records(id); duplicate[1].round = 0; assert.equal(questResult(id, settings, duplicate), null);
    const choice = records(id); choice[0].choice = 'not-a-choice'; assert.equal(questResult(id, settings, choice), null);
  }
  const blocked = records('zigzag'); blocked[0].choice = 'middle'; assert.equal(questResult('zigzag', settings, blocked), null);
});
test('practice, seated and slow variants retain the same score; partial work is recorded at zero', () => {
  for (const id of QUEST_IDS) for (const seated of [false, true]) for (const gentle of [false, true]) {
    const config = { ...settings, seated, gentle };
    const result = questResult(id, config, records(id, config))!;
    assert.equal(result.amount, 300); assert.match(result.details.metrics!['기록 방식'], /직접 확인/);
    assert.match(result.details.metrics!['참여 방식'], /모둠 참여 미확인/);
    assert.deepEqual(normalizeGameResultDetails(result.details)?.metrics, result.details.metrics);
    const partial = records(id, config); partial[0].outcome = 'partial'; partial[1].retries = 3;
    assert.equal(questResult(id, config, partial)?.amount, 200);
  }
});
test('rhythm and passing choices change the actual action and rotate all roles', () => {
  const steady = makeQuestRound('dribble-rhythm', 1, settings, 'steady');
  const switching = makeQuestRound('dribble-rhythm', 1, settings, 'switch');
  assert.notDeepEqual(steady.cues, switching.cues);
  assert.equal(switching.cues.length, 8);
  assert.match(questCue(switching, switching.cueMs * 4), /왼손/);
  assert.match(makeQuestRound('dribble-rhythm', 2, settings).cues[4], /옆으로/);
  for (let players = 2; players <= 6; players++) for (let round = 0; round < 3; round++) {
    const team = makeQuestRound('pass-gate-rescue', round, { ...settings, players, practice: false });
    assert.equal(team.roles?.length, players); assert.equal(team.cues.length, players * 2);
    assert.match(team.roles![0], new RegExp(`${round % players + 1}번 친구`));
  }
});
test('old IDs, lesson recommendations and preparation text resolve to the same new activity', () => {
  for (const id of QUEST_IDS) {
    assert.equal(GAMES.find(g => g.type === id)?.name, QUEST_META[id].name);
    assert.equal(LESSON_GAME_CATALOG.find(g => g.id === id)?.title, QUEST_META[id].name);
    assert.equal(getPhysicalActivityPlan(id).title, QUEST_META[id].name);
    assert.notEqual(gameBestStorageKey(id), `physical_best_${id}`, 'legacy best scores remain separate');
  }
  assert.equal(gameBestStorageKey('stretch'), 'physical_best_stretch');
});
test('the audit covers all 225 original games exactly once with evidence and valid merge destinations', () => {
  const report = JSON.parse(readFileSync(new URL('../docs/game-review-225-2026-10-22.json', import.meta.url), 'utf8'));
  assert.equal(report.rows.length, 225); assert.equal(new Set(report.rows.map((r: { id: string }) => r.id)).size, 225);
  assert.deepEqual(new Set(report.rows.map((r: { id: string }) => r.id)), new Set(GAMES.map(g => g.type)));
  for (const row of report.rows) {
    assert(row.reason && row.next && row.evidence.file && row.evidence.line > 0 && row.evidence.observation);
    if (row.target) assert(['유지', '개편'].includes(report.rows.find((r: { id: string }) => r.id === row.target).decision));
  }
});
test('all 58 remaining redesign candidates are assigned exactly one release priority',()=>{
  const audit=JSON.parse(readFileSync(new URL('../docs/game-review-225-2026-10-22.json',import.meta.url),'utf8'));
  const roadmap=JSON.parse(readFileSync(new URL('../docs/game-revamp-roadmap.json',import.meta.url),'utf8'));
  const planned=roadmap.batches.flatMap((batch:{ids:string[]})=>batch.ids);
  assert.equal(planned.length,58);assert.equal(new Set(planned).size,58);
  assert.deepEqual(new Set(planned),new Set(audit.rows.filter((g:{id:string;decision:string})=>g.decision==='개편'&&!(PILOT_QUEST_IDS as readonly string[]).includes(g.id)).map((g:{id:string})=>g.id)));
});
test('memory and hidden-clock activities reject incorrect claims and preserve their distinct feedback',()=>{
  const p=makeQuestRound('memory',2,settings,'easy');
  assert.equal(p.preview?.length,4);assert.equal(p.question?.answer.length,4);
  assert(!questAccurate(p,{answer:[],activeMs:questDuration(p)}));
  assert(questAccurate(p,{answer:p.question!.answer,activeMs:questDuration(p)}));
  const time=makeQuestRound('stopwatch',0,settings,'easy');
  assert(questAccurate(time,{activeMs:8000}));assert(!questAccurate(time,{activeMs:20000}));
  const failed=records('stopwatch');failed[0].activeMs=20000;
  assert.equal(questResult('stopwatch',settings,failed),null);
});


test('sports decisions must match the situation and change across rounds; tool trials remain physical',()=>{
 for(const id of ['base-running-decide','badminton-drop-clear','tabletennis-spin-read'] as const){
  const first=makeQuestRound(id,0,settings),second=makeQuestRound(id,1,settings);
  assert(first.decision&&second.decision);assert.notEqual(first.decision.answer,second.decision.answer);
  const wrong=records(id);wrong[0].choice=first.choices.find(c=>c.id!==first.decision!.answer)!.id;
  assert.equal(questResult(id,settings,wrong),null);
 }
 for(const id of ['target','slingshot-archery','basketball-free-throw','shuttle-run-beep'] as const){
  assert.notDeepEqual(makeQuestRound(id,0,settings,'near').cues,makeQuestRound(id,0,settings,'far').cues);
 }
});
