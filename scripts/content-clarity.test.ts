import test from 'node:test';
import assert from 'node:assert/strict';
import {EXPRESSION_GAMES} from '../src/presentation/components/minigames/expression/expressionGamesData';
import {EXPRESSION_CLARITY} from '../src/presentation/components/minigames/expression/expressionClarity';
import {QUEST_META} from '../src/domain/movementQuests';
import {QUEST_CLARITY} from '../src/domain/questClarity';
import {SAFETY_LESSONS} from '../src/domain/safetyLessons';
import {isAvailableGame} from '../src/domain/gameLifecycle';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';

const text=(id:string)=>{const g=EXPRESSION_GAMES.find(x=>x.id===id)!;return [g.name,g.desc,...g.steps.flatMap(s=>[s.title,s.guide,s.actionTip??'']),...g.rubric.flatMap(r=>[r.criterion,r.desc]),...(g.equipment??[])].join(' ');};
test('expression names, steps, rubrics and gear agree with each other',()=>{
 for(const id of Object.keys(EXPRESSION_CLARITY))assert(isAvailableGame(id),`${id} is still offered`);
 assert.doesNotMatch(text('music_jumprope'),/줄이 바닥|줄을 내려놓/,'no rope in a rope-free game');
 assert.match(text('talchum_korea'),/손수건/);assert.match(text('talchum_korea'),/오금질\)|\(오금질/);
 assert.doesNotMatch(text('ganggangsullae'),/손을 따뜻하게 잡고/);assert.match(text('ganggangsullae'),/느리게.*보통.*빠르게/);
 assert.doesNotMatch(text('element_forces'),/Texture|4원소/);
 assert.doesNotMatch(text('body_sculpture'),/이어붙어|숨을 멈추/);
 assert.doesNotMatch(text('rhythm_clapping'),/8박자 콤보/);
 assert.match(text('cheerleading_team'),/하이 V/);
 assert.doesNotMatch(text('taebo_fitness'),/턱을 치는|130 BPM/);
 assert.doesNotMatch(text('kpop_easy_challenge'),/정면 카메라/);
 assert.doesNotMatch(text('sound_painter'),/눈을 지그시 감고|돕니다/);
 assert(EXPRESSION_GAMES.find(g=>g.id==='flashmob_creator')!.steps.reduce((n,s)=>n+s.durationSeconds,0)>=120,'a flash mob gets time to build up');
 for(const g of EXPRESSION_GAMES.filter(g=>g.sound?.kind==='beat'))assert.equal((g.sound as {bpm:number[]}).bpm.length,g.steps.length,`${g.id}: one tempo per step`);
 for(const g of EXPRESSION_GAMES.filter(g=>g.sound?.kind==='tones'))assert.equal((g.sound as {tones:string[]}).tones.length,g.steps.length,`${g.id}: one sound per step`);
});
test('quest gear says how many and names say what children do',()=>{
 for(const [id,c] of Object.entries(QUEST_CLARITY)){assert(isAvailableGame(id),id);const m=QUEST_META[id as keyof typeof QUEST_META];if(c.equipment){assert.deepEqual(m.equipment,c.equipment);assert(m.setup.startsWith(c.equipment[0]));}if(c.name)assert.equal(AVAILABLE_GAMES.find(g=>g.type===id)!.name,c.name);}
 assert.doesNotMatch(QUEST_META['relay-mission-runner'].name,/기기 없는/);
 assert(!QUEST_META['base-running-decide'].equipment!.some(e=>e.includes('수비 위치 카드')));
});
test('safety lessons use words children understand',()=>{
 const all=Object.values(SAFETY_LESSONS).flatMap(l=>l.scenarios.flatMap(s=>[s.situation,s.explanation,...s.choices.map(c=>c.label)])).join(' ');
 assert.doesNotMatch(all,/심장 리듬을 분석|NHS|변형·감각 이상/);
});
