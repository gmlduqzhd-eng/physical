import test from 'node:test';
import assert from 'node:assert/strict';
import {EXPEDITION_GAMES} from '../src/domain/expeditionGames';
import {EXPEDITION_CLARITY} from '../src/domain/expeditionClarity';
import {createExpeditionRound,SPOT_MARKS} from '../src/domain/expeditionRules';
import {isAvailableGame} from '../src/domain/gameLifecycle';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';

const active=EXPEDITION_GAMES.filter(g=>g.kind==='B'&&isAvailableGame(g.id));
test('every offered tool-using expedition lists items with quantities and describes success in plain words',()=>{
 assert.equal(active.length,26);
 for(const g of active){
  const c=EXPEDITION_CLARITY[g.id];assert(c,`${g.id} has classroom guidance`);
  assert.deepEqual(g.equipment,c.equipment);assert(g.desc.includes('성공:'),g.id);
  assert.doesNotMatch(g.desc,/한다\.|제시한다|생성한다|표시하지 않는다/,`${g.id} desc is written for teachers, not as a spec`);
  for(const item of g.equipment)assert.match(item,/\d|1인당|짝당|모둠당|코스 1개당|도구 없이|접시콘/,`${g.id}: '${item}' says how many`);
  assert(!g.equipment.includes('바닥 테이프 또는 색 표식')&&!g.equipment.includes('표식'),`${g.id} no longer uses the copied template`);
  const def=AVAILABLE_GAMES.find(x=>x.type===g.id)!;assert.deepEqual(def.grades,c.grades);assert.equal(def.name,c.name??def.name);
 }
});
test('rules match their guidance: places by colour and shape, the colour rule only in round 3, longer segments with gear',()=>{
 const find=(id:string)=>EXPEDITION_GAMES.find(g=>g.id===id)!;
 const spots=createExpeditionRound(find('exp-tablet-01'),0,4,()=>.3).roles.map(r=>r.split(': ')[1]);
 assert(spots.every(s=>(SPOT_MARKS as readonly string[]).includes(s))&&new Set(spots).size===4);assert(!spots.join().includes('행'));
 const stroop=find('exp-tablet-06');assert.deepEqual([0,1,2].map(r=>createExpeditionRound(stroop,r,4).wordCue!.rule),['글자의 뜻','글자의 뜻','글자의 색']);
 const sort=find('exp-tablet-37');assert.deepEqual([0,1,2].map(r=>createExpeditionRound(sort,r,4).steps[0].instruction.includes('모양')),[false,false,true]);
 for(const g of active.filter(g=>g.minSeconds))for(let r=0;r<g.rounds;r++)for(const step of createExpeditionRound(g,r,g.players).steps)if(!step.beats)assert(step.seconds>=g.minSeconds!,`${g.id} round ${r}`);
 assert.doesNotMatch(createExpeditionRound(find('exp-tablet-02'),2,4).steps.map(s=>s.instruction).join(),/마름모|대형/);
});
