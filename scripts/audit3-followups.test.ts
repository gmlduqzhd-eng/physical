import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AVAILABLE_GAMES,GAMES} from '../src/domain/gamesData';
import {PHONE_PLAYS} from '../src/domain/phonePlayCatalog';
import {lessonPresets} from '../src/domain/lessonPresets';
import {matchesActivitySearch} from '../src/domain/activitySearch';
import {AI_EXCLUDED_SAFETY_IDS,liveRecommendations} from '../src/domain/activityShelves';
import {catalog,isAiEligible} from '../server/aiService';
import type {GameRoom,MissionTemplate} from '../src/domain/types';

const live=new Set(AVAILABLE_GAMES.map(g=>g.type));
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('the teacher AI never uses the emergency and first-aid lessons, whatever they are called now',()=>{
 for(const id of AI_EXCLUDED_SAFETY_IDS){const item=catalog.find(g=>g.id===id);assert(item,id);assert.equal(isAiEligible(item),false,id);}
 assert(catalog.filter(isAiEligible).length>=catalog.length-AI_EXCLUDED_SAFETY_IDS.length-2,'other activities stay available');
});

test('a past lesson made with a merged or cleaned activity comes back as the activity used now',()=>{
 for(const [old,now] of [['reaction','red_green'],['expedition-ship','expedition-map']] as const){
  const name=GAMES.find(g=>g.type===old)?.name??old;
  const template={id:'t',name,buttons:[{id:'m',title:`${name} 활동 완료`,desc:'',amount:10,cooldown:0,iconName:'Flag',color:'',bg:'',requires_approval:true,gameType:old}]} as MissionTemplate;
  const room={id:'r',template_id:'t',name,status:'finished',global_time_modifier:2100,setup_minutes:30,goal_percent:75} as GameRoom;
  const [preset]=lessonPresets([room],[template],[{room_id:'r'}]);
  assert.equal(preset?.game.type,now,old);
 }
});

test('the station circuit opens four different activities that are still in use, with matching words',()=>{
 const source=read('src/presentation/components/StationCircuitMode.tsx');
 const ids=[...source.matchAll(/targetGame: '([^']+)'/g)].map(m=>m[1]);
 assert.equal(ids.length,4);assert.equal(new Set(ids).size,4);
 for(const id of ids)assert(live.has(id),id);
 assert.doesNotMatch(source,/플랭크|350ms|스와이프|수평/);
 assert.match(source,/role="dialog"/);
});

test('the 3-minute challenge launches and checks the same live activity',()=>{
 const source=read('src/presentation/components/DailyStreakModal.tsx');
 assert.match(source,/onLaunchGame\('red_green'\)/);assert.match(source,/record\.gameType==='red_green'/);
 assert(live.has('red_green'));
});

test('old names still find the activity that replaced them',()=>{
 for(const [query,id] of [['플랭크','plank'],['양손 터치','rhythm_clapping'],['우주선','expedition-map']] as const)
  assert(AVAILABLE_GAMES.some(g=>g.type===id&&matchesActivitySearch(g,query)),query);
});

test('every no-equipment space choice finds at least one play',()=>{
 const source=read('src/presentation/ActivityLibrary.tsx');
 const order=JSON.parse(source.match(/const SPACE_ORDER=(\[[^\]]+\])/)![1].replace(/'/g,'"')) as string[];
 const offered=order.filter(v=>PHONE_PLAYS.some(p=>p.space===v));
 assert(offered.length>=2);for(const v of offered)assert(PHONE_PLAYS.some(p=>p.space===v),v);
});

test('every physical type keeps three different live recommendations',()=>{
 const source=read('src/presentation/components/PhysicalMbtiTest.tsx');
 const blocks=[...source.matchAll(/recommendedGames: \[([\s\S]*?)\]/g)].map(m=>[...m[1].matchAll(/type: '([^']+)'/g)].map(x=>({name:'',type:x[1]})));
 assert.equal(blocks.length,4);
 for(const list of blocks)assert.equal(liveRecommendations(list).length,3,JSON.stringify(list));
});

test('screens do not show raw particle markers like 은(는) next to activity names',()=>{
 for(const path of ['src/presentation/GuidedClassroomControl.tsx','src/presentation/components/minigames/common/ConsolidatedActivity.tsx','src/presentation/ScoreBoard.tsx','src/presentation/MobileMissionView.tsx'])
  assert.doesNotMatch(read(path),/은\(는\)|\(으\)로|을\(를\)|이\(가\)/,path);
 assert.doesNotMatch(read('src/presentation/TeacherHome.tsx'),/교실·모둠 한 대·교실|대표 원정 6개/);
});
