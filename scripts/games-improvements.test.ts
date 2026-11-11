import test from 'node:test';
import assert from 'node:assert/strict';
import {AVAILABLE_GAMES,GAMES,hasAntiCheatSensor} from '../src/domain/gamesData';
import {MERGED_GAMES,getRemovedGame,mergedGameUrl} from '../src/domain/gameLifecycle';
import {EXPRESSION_GAMES} from '../src/presentation/components/minigames/expression/expressionGamesData';
import {PHONE_PLAYS,phoneRecordValid} from '../src/domain/phonePlayCatalog';
import {phoneMemoryTask} from '../src/domain/phoneTaskRules';
import {phoneRoles,phoneRoundCues,phoneStrategies,phoneNextHint} from '../src/domain/phonePlayProgression';
import {EXPEDITION_BY_ID} from '../src/domain/expeditionGames';
import {isRevampedExpedition} from '../src/domain/expeditionRevamps';
import {FLAGSHIP_IDS,type ExpeditionSnapshot} from '../src/domain/flagship';
import {expeditionNextStep,rhythmTimingHint} from '../src/domain/expeditionGuidance';
import {readStorage,writeStorage,isPrivateDeviceKey,deviceStorageGeneration,clearDeviceInformation} from '../src/application/browserStorage';

test('all 214 current activities and 111 retained course addresses remain distinct and routable',()=>{
 assert.equal(AVAILABLE_GAMES.length,214);assert.equal(GAMES.length,331);assert.equal(new Set(GAMES.map(g=>g.type)).size,331);assert.equal(MERGED_GAMES.length,111);
 for(const game of MERGED_GAMES){assert(AVAILABLE_GAMES.some(g=>g.type===game.target));assert(mergedGameUrl('/play/'+game.id,game.id,'?room=retained','')?.includes('variant='+game.id));}
 assert(getRemovedGame('coin_flip'));assert(AVAILABLE_GAMES.every(g=>!hasAntiCheatSensor(g.type)));
});
test('shared device scores, badges and totals expire together; old permanent records are never imported',()=>{
 const make=()=>{const map=new Map<string,string>();return {get length(){return map.size;},key:(i:number)=>[...map.keys()][i]??null,getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);},clear:()=>map.clear()};};
 const previous=globalThis.window,realNow=Date.now;let clock=realNow()+1000;Date.now=()=>clock;
 const local=make(),session=make();Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:local,sessionStorage:session,dispatchEvent:()=>true}});
 try{
  const keys=['physical_best_stretch','physical_best_jump_movement_v1','physical_best_memory::variant::card_match','physical_badges','physical_total_plays'];
  local.setItem(keys[0],'previous-student');assert.equal(readStorage(keys[0]),null);
  for(const key of keys){assert(isPrivateDeviceKey(key));writeStorage(key,'current-tab');assert.equal(local.getItem(key),null);assert.equal(readStorage(key),'current-tab');}
  const generation=deviceStorageGeneration();clock+=9*3600000;
  for(const key of keys)assert.equal(readStorage(key),null,key);assert(deviceStorageGeneration()>generation);
  writeStorage('physical_music_enabled','true');clearDeviceInformation();assert.equal(readStorage(keys[0]),null);
 }finally{Date.now=realNow;Object.defineProperty(globalThis,'window',{configurable:true,value:previous});}
});
test('denied browser storage keeps game records only in bounded memory',()=>{
 const previous=globalThis.window,realNow=Date.now;let clock=realNow()+40*3600000;Date.now=()=>clock;
 const blocked={getItem(){throw Error('denied');},setItem(){throw Error('denied');},removeItem(){throw Error('denied');}};
 Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:blocked,sessionStorage:blocked}});
 try{writeStorage('physical_best_phone-play-001','local-only');assert.equal(readStorage('physical_best_phone-play-001'),'local-only');clock+=9*3600000;assert.equal(readStorage('physical_best_phone-play-001'),null);}finally{Date.now=realNow;Object.defineProperty(globalThis,'window',{configurable:true,value:previous});}
});
test('expression guides remove the reviewed tumbling, running, neck wrapping and forced contact instructions',()=>{
 const active=new Set(AVAILABLE_GAMES.map(g=>g.type)),games=EXPRESSION_GAMES.filter(g=>active.has(g.id));assert.equal(games.length,37);
 const positive=/공중제비 후|목 뒤에 대고|팔짱을 끼고|회전 질주|머리를 땅에 대며|높은 점프와 빠른 2회전|방향을 불규칙하게 바꾸며 달려|교실의 빈 공간을 자유롭게 가속하며 달립|빠른 비트에 맞추어 폭격|한 바퀴 돌고 안전하게 낚아챕/;
 for(const game of games)for(const step of game.steps){assert(!positive.test(step.title+' '+step.guide+' '+step.actionTip),game.id);assert(step.durationSeconds>0&&step.guide);}
 const ribbon=games.find(g=>g.id==='ribbon_gymnast')!;assert(ribbon.steps[2].guide.includes('손에 잡은 채'));
});
test('every phone activity exposes distinct round goals, concrete cues and bounded roles for every supported group size',()=>{
 for(const play of PHONE_PLAYS)for(let round=0;round<3;round++){
  const plans=phoneStrategies(play,round);assert.equal(new Set(plans.map(p=>p.id)).size,3);assert(plans.every(p=>p.guide));
  for(const level of ['쉬운 방법','기본 방법','추가 도전']){const cues=phoneRoundCues(play,round,level);assert(cues.length>0&&cues.every(Boolean));}
  for(let players=1;players<=6;players++){const roles=phoneRoles(play,players,round);assert.equal(roles.length,players);assert.equal(new Set(roles.map(r=>r.seat)).size,players);assert(roles.every(r=>r.role));}
  assert(phoneNextHint(play,'partial',round).includes(play.easy));
 }
 const play=PHONE_PLAYS.find(p=>p.id==='phone-play-008')!;assert.notDeepEqual(phoneRoles(play,6,0),phoneRoles(play,6,1));
});
test('creative choices change active sequences; strategy choices select the actual smaller or seated alternative',()=>{
 for(const p of PHONE_PLAYS.filter(p=>p.kind==='create')){const chosen=[p.cues[1],p.cues[0]];assert.deepEqual(phoneRoundCues(p,0,'기본 방법',chosen),chosen);}
 for(const p of PHONE_PLAYS.filter(p=>p.kind==='decision')){assert.deepEqual(phoneRoundCues(p,1,'기본 방법',[],'seated'),[p.seated]);assert.equal(phoneRoundCues(p,1,'기본 방법',[],'small')[0],p.easy);assert.notEqual(phoneStrategies(p,0)[0].id,phoneStrategies(p,1)[0].id);}
});
test('memory challenge uses four concrete items and validates the sequence shown before movement',()=>{
 for(const p of PHONE_PLAYS.filter(p=>p.kind==='memory')){const task=phoneMemoryTask(p,0,false,true),answer=task.expected;assert.equal(task.base.length,p.id==='phone-play-033'?3:4);const record={round:0,outcome:'complete' as const,elapsedMs:p.seconds*1000,count:0,participants:[1],answer,challenge:true};assert(phoneRecordValid(p,record,1));assert(!phoneRecordValid(p,{...record,answer:[]},1));}
});
test('all 34 standalone expeditions provide rehearsal, relaxed pacing and alternatives',()=>{
 const games=AVAILABLE_GAMES.filter(g=>EXPEDITION_BY_ID.get(g.type)?.kind==='B');assert.equal(games.length,34);for(const g of games)assert(isRevampedExpedition(g.type),g.type);
});
test('six flagship guides reflect actual waiting, voting, control and finishing states',()=>{
 const group={id:'group',name:'모둠',visited:[],vote:null,done:false,ship:{checkpoint:0},axes:[],loop:[],quality:0};
 const s={groupId:'group',phase:0,status:'playing',groups:[group]} as unknown as ExpeditionSnapshot;
 for(const game of FLAGSHIP_IDS){const hint=expeditionNextStep(s,game);assert(hint.title&&hint.instruction);assert.match(expeditionNextStep({...s,status:'paused'},game).title,/선생님/);}
 const voted={...s,groups:[{...group,visited:['forest'],vote:'forest'},{...group,id:'second',vote:null}]} as unknown as ExpeditionSnapshot;
 assert.match(expeditionNextStep(voted,'expedition-map').title,/1모둠/);assert.match(expeditionNextStep({...s,phase:3},'expedition-boss').title,/세 관문/);
 assert.match(rhythmTimingHint([100,1300,2500,3700],[1,0,1,0,1,0,1,0]),/늦/);assert.match(rhythmTimingHint([0,1,2,3,4],[1,0,1,0,1,0,1,0]),/입력이 많/);
});
