import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SAFETY_LESSON_IDS,SAFETY_LESSONS,safetyLessonResult} from '../src/domain/safetyLessons';
import {GAMES} from '../src/domain/gamesData';
import {LESSON_GAME_CATALOG} from '../src/data/lessonGameCatalog';
import {gameBestStorageKey,QUEST_IDS} from '../src/domain/movementQuests';
import {REVAMPED_EXPEDITION_IDS} from '../src/domain/expeditionRevamps';
import {getPhysicalActivityPlan} from '../src/domain/physicalActivityPlans';
import {normalizeGameResultDetails} from '../src/domain/gameResultDetails';

test('five safety lessons have sourced scenarios, classroom alternatives and consistent catalog entries',()=>{
 for(const id of SAFETY_LESSON_IDS){
  const spec=SAFETY_LESSONS[id];assert.equal(spec.scenarios.length,3);assert(spec.boundary&&spec.equipment.length&&spec.sources.length);
  assert.equal(GAMES.find(g=>g.type===id)?.name,spec.name);assert.equal(LESSON_GAME_CATALOG.find(g=>g.id===id)?.title,spec.name);assert.equal(getPhysicalActivityPlan(id).title,spec.name);
  assert.notEqual(gameBestStorageKey(id),`physical_best_${id}`);
  for(const scenario of spec.scenarios){assert.equal(scenario.choices.filter(c=>c.id===scenario.answer).length,1);assert(scenario.explanation&&scenario.rehearsal);}
  for(const source of spec.sources)assert.equal(new URL(source.url).protocol,'https:');
 }
});
test('wrong answers, missing scenarios and malformed records never complete safety learning',()=>{
 for(const id of SAFETY_LESSON_IDS){
  const good=SAFETY_LESSONS[id].scenarios.map((s,i)=>({scenario:i,answer:s.answer,mode:'read' as const}));
  const result=safetyLessonResult(id,good,30)!;assert.equal(result.amount,300);assert.deepEqual(normalizeGameResultDetails(result.details)?.metrics,result.details.metrics);
  assert.equal(safetyLessonResult(id,good.slice(0,2),30),null);
  assert.equal(safetyLessonResult(id,good.map((r,i)=>i===1?{...r,answer:'rethink'}:r),30),null);
  assert.equal(safetyLessonResult(id,good.map(r=>({...r,scenario:0})),30),null);
  assert.equal(safetyLessonResult(id,good,NaN),null);
  assert.equal(safetyLessonResult(id,good.map(r=>({...r,mode:'roleplay' as const})),30)?.amount,300);
 }
});
test('all 61 redesign candidates are implemented once and all original 225 game IDs remain',()=>{
 const audit=JSON.parse(readFileSync(new URL('../docs/game-review-225-2026-10-22.json',import.meta.url),'utf8'));
 const implemented=[...QUEST_IDS,...REVAMPED_EXPEDITION_IDS,...SAFETY_LESSON_IDS];assert.equal(implemented.length,61);assert.equal(new Set(implemented).size,61);
 assert.deepEqual(new Set(implemented),new Set(audit.rows.filter((r:{decision:string})=>r.decision==='개편').map((r:{id:string})=>r.id)));
 assert.equal(GAMES.length,225);assert.equal(new Set(GAMES.map(g=>g.type)).size,225);
});
