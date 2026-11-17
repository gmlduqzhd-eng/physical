import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PHONE_PLAYS} from '../src/domain/phonePlayCatalog';
import {classRoundView} from '../src/domain/phoneClassMode';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';
import {EXPRESSION_GAMES} from '../src/presentation/components/minigames/expression/expressionGamesData';
import {LAYOUTS} from '../src/domain/layoutDiagrams';
import {FLAGSHIPS} from '../src/domain/flagship';
import {liveActivityId} from '../src/domain/gameLifecycle';
import {liveRecommendations} from '../src/domain/activityShelves';

test('the class TV gets the same choices list on every render, so cues and voice are not restarted every tick',()=>{
 for(const p of PHONE_PLAYS)for(const seated of [false,true]){const a=classRoundView(p,0,'기본 방법',seated).choices,b=classRoundView(p,0,'기본 방법',seated).choices;assert.equal(a,b,`${p.id} seated=${seated}`);}
});
test('fitness-type recommendations open live activities under their current names',()=>{
 const text=readFileSync('src/presentation/components/PhysicalMbtiTest.tsx','utf8');
 const listed=[...text.matchAll(/\{ name: '([^']+)', type: '([^']+)' \}/g)].map(m=>({name:m[1],type:m[2]}));assert(listed.length>=12);
 const live=liveRecommendations(listed);
 for(const r of live){const g=AVAILABLE_GAMES.find(x=>x.type===r.type);assert(g,r.type);assert.equal(r.name,g!.name);}
 assert.equal(new Set(live.map(r=>r.type)).size,live.length);
 assert(live.some(r=>r.type==='red_green'),'retired reaction games lead to their replacement');
 assert.equal(liveActivityId('run'),'shuttle-run-beep');assert.equal(liveActivityId('red_green'),'red_green');
 const admin=readFileSync('src/presentation/AdminControlPanel.tsx','utf8');assert.doesNotMatch(admin,/숲 소리 정리 쉼터/);
});
test('grades agree for expression expeditions, the freeze step holds, diagram labels match the rules, and the boss says what it needs',()=>{
 for(const g of EXPRESSION_GAMES.filter(e=>e.id.startsWith('exp-'))){const def=AVAILABLE_GAMES.find(x=>x.type===g.id);if(def)assert.deepEqual(g.grades,def.grades,g.id);}
 const freeze=EXPRESSION_GAMES.find(g=>g.id==='musical_freeze')!.sound;assert(freeze?.kind==='freeze'&&freeze.holdStep===1);
 assert(LAYOUTS['exp-tablet-37'].labels.every(l=>/첫째|둘째/.test(l)));
 assert.match(FLAGSHIPS.find(f=>f.id==='expedition-boss')!.desc,/화면 터치만으로/);
});
