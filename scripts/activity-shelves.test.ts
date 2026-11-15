import test from 'node:test';
import assert from 'node:assert/strict';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';
import {CORE_ACTIVITY_IDS,CORE_ACTIVITIES,SIMILAR_TO,UNDERSTANDING_IDS,activityShelf,isMovementActivity,similarRepresentative,shelfLabel} from '../src/domain/activityShelves';

const available=new Set(AVAILABLE_GAMES.map(g=>g.type));
test('every shelf entry is an available activity and no activity sits on two shelves',()=>{
 for(const id of [...CORE_ACTIVITY_IDS,...SIMILAR_TO.keys(),...SIMILAR_TO.values(),...UNDERSTANDING_IDS])assert(available.has(id),id);
 assert.equal(new Set(CORE_ACTIVITY_IDS).size,CORE_ACTIVITY_IDS.length);assert.equal(new Set(UNDERSTANDING_IDS).size,UNDERSTANDING_IDS.length);
 for(const id of CORE_ACTIVITY_IDS){assert(!SIMILAR_TO.has(id),id+' is core and similar');assert(!UNDERSTANDING_IDS.includes(id),id+' is core and understanding');assert.equal(activityShelf(id),'core');}
 assert.equal(CORE_ACTIVITIES.length,CORE_ACTIVITY_IDS.length);assert(CORE_ACTIVITIES.length>=45&&CORE_ACTIVITIES.length<=65);
});
test('a similar activity points at a representative that is itself shown, never at another hidden one',()=>{
 for(const [id,target] of SIMILAR_TO){assert.notEqual(id,target);assert(!SIMILAR_TO.has(target),`${id} → ${target} chains`);assert.equal(similarRepresentative(id)?.type,target);if(activityShelf(id)==='similar')assert(shelfLabel(id).startsWith('비슷한 활동: ')&&shelfLabel(id).length>8,id);else assert.equal(activityShelf(id),'understanding',id);}
 assert.equal(SIMILAR_TO.size,19);
});
test('every available activity has exactly one shelf and the counts add up',()=>{
 const count={core:0,more:0,similar:0,understanding:0};for(const g of AVAILABLE_GAMES)count[activityShelf(g.type)]++;
 assert.equal(count.core+count.more+count.similar+count.understanding,AVAILABLE_GAMES.length);assert.equal(count.core,CORE_ACTIVITY_IDS.length);assert.equal(count.understanding,UNDERSTANDING_IDS.length);
 assert.equal(count.similar,[...SIMILAR_TO.keys()].filter(id=>!UNDERSTANDING_IDS.includes(id)).length,'an activity that is both similar and understanding counts as understanding');
});
test('understanding activities are not counted as movement time',()=>{
 for(const id of UNDERSTANDING_IDS)assert(!isMovementActivity(AVAILABLE_GAMES.find(g=>g.type===id)!),id);
 assert(isMovementActivity(AVAILABLE_GAMES.find(g=>g.type==='red_green')!));assert.equal(shelfLabel('red_green'),'');
});
test('the solo list holds only activities for one person and leaves pair, group and flagship activities out',async()=>{
 const {SOLO_ACTIVITIES,isSoloActivity}=await import('../src/domain/activityShelves');
 assert(SOLO_ACTIVITIES.length>60&&SOLO_ACTIVITIES.length<AVAILABLE_GAMES.length);
 for(const game of SOLO_ACTIVITIES)assert.equal(game.activityType,'개인',game.type);
 for(const game of AVAILABLE_GAMES.filter(g=>g.activityType==='짝'||g.activityType==='모둠'))assert(!isSoloActivity(game),game.type);
 assert(!SOLO_ACTIVITIES.some(g=>g.type.startsWith('expedition-')),'flagship expeditions need a group');
 assert(SOLO_ACTIVITIES.some(g=>g.type==='stretch')&&SOLO_ACTIVITIES.some(g=>g.type==='phone-play-001'));
});
