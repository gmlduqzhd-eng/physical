import test from 'node:test';
import assert from 'node:assert/strict';
import {guidedEntries,currentGuidedEntry,withNextActivity,resolveGuidedGameType,MAX_LESSON_ACTIVITIES} from '../src/domain/guidedMission';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';
import type {MissionButton} from '../src/domain/types';

const [first,second,third]=AVAILABLE_GAMES.filter(g=>g.type.startsWith('phone-play-'));
const mission=(id:string,game:{type:string;name:string}):MissionButton=>({id,title:`${game.name} 활동 완료`,desc:'',amount:10,cooldown:0,iconName:'Flag',color:'',bg:'',requires_approval:true,gameType:game.type});
const uuid=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;

test('a room starts with one activity and the latest guided mission is the current one',()=>{
 const buttons=[mission(uuid(1),first)];
 assert.equal(guidedEntries(first.name,first.name,buttons).length,1);assert.equal(currentGuidedEntry(first.name,first.name,buttons)?.gameType,first.type);
 const next=withNextActivity(first.name,first.name,buttons,second,uuid(2));assert('buttons' in next);if(!('buttons' in next))return;
 assert.equal(next.buttons.length,2);assert.deepEqual(next.buttons[0],buttons[0],'earlier missions and their ids are kept for completion records');
 const current=currentGuidedEntry(first.name,first.name,next.buttons)!;assert.equal(current.gameType,second.type);assert.equal(current.order,2);assert.equal(current.mission.id,uuid(2));
 assert.equal(current.mission.requires_approval,true);assert.equal(resolveGuidedGameType(first.name,first.name,next.buttons,uuid(2)),second.type);
});
test('changing to the same activity, an unknown activity, a reused id or past the limit is refused',()=>{
 const buttons=[mission(uuid(1),first)];
 assert('error' in withNextActivity(first.name,first.name,buttons,first,uuid(2)));
 assert('error' in withNextActivity(first.name,first.name,buttons,{type:'not-a-game',name:'x'},uuid(2)));
 assert('error' in withNextActivity(first.name,first.name,buttons,second,uuid(1)));
 assert('error' in withNextActivity(first.name,first.name,buttons,second,'javascript:alert(1)'));
 assert('error' in withNextActivity(first.name,first.name,[],second,uuid(2)),'a room without a guided mission cannot change activity');
 let list=buttons;for(let i=2;i<=MAX_LESSON_ACTIVITIES;i++){const r=withNextActivity(first.name,first.name,list,i%2?first:second,uuid(i));assert('buttons' in r);if('buttons' in r)list=r.buttons;}
 assert.equal(list.length,MAX_LESSON_ACTIVITIES);assert('error' in withNextActivity(first.name,first.name,list,third,uuid(99)));
 const back=withNextActivity(first.name,first.name,[mission(uuid(1),first),mission(uuid(2),second)],first,uuid(3));assert('buttons' in back,'returning to an earlier activity is a new mission');
});
test('a legacy room recognised by name keeps its first activity when a second one is added',()=>{
 const legacy:MissionButton={id:uuid(1),title:`${first.name} 활동 완료`,desc:'',amount:10,cooldown:0,iconName:'Flag',color:'',bg:'',requires_approval:true};
 assert.equal(guidedEntries(first.name,first.name,[legacy])[0].gameType,first.type);
 const next=withNextActivity(first.name,first.name,[legacy],second,uuid(2));assert('buttons' in next);if(!('buttons' in next))return;
 assert.equal(next.buttons[0].gameType,first.type);assert.deepEqual(guidedEntries(first.name,first.name,next.buttons).map(e=>e.gameType),[first.type,second.type]);
 assert.equal(legacy.gameType,undefined,'the input is not mutated');
});
