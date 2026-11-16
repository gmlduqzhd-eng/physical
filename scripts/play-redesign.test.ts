import test from 'node:test';import assert from 'node:assert/strict';
import {cooperativeMapOrder,mapAgreement,mapBrief,mapGestures} from '../src/domain/cooperativeMap';
import {makePlayRecipe,parsePlayRecipe,playRecipeHash,playRecipeLink,PRIMARY_EXPERIENCES,STARTER_RECIPES} from '../src/domain/playRecipes';
import {DEFAULT_WORKSHOP} from '../src/domain/expeditionWorkshop';
import {FLAGSHIP_IDS} from '../src/domain/flagship';
import {movementRoleSeats} from '../src/domain/movementRoles';
import {sharedScreenCue} from '../src/domain/sharedScreen';
import {savePublicSetupReturn,takePublicSetupReturn} from '../src/domain/publicLessonTransfer';

test('six map permutations and carrying agreements require independent information',()=>{
 const routes=new Set<string>();for(let seed=0;seed<24;seed++){
  const order=cooperativeMapOrder(seed),signals=mapGestures(seed);routes.add(order.join('-'));assert.equal(new Set(order).size,3);
  assert.equal(mapBrief(0,6,seed).signals,undefined);assert.equal(mapBrief(1,6,seed).signals,undefined);assert.deepEqual(mapBrief(2,6,seed).signals,signals);
  for(let phase=0;phase<3;phase++){assert(mapAgreement(order[phase],signals[phase],phase,seed));assert(!mapAgreement(order[(phase+1)%3],signals[phase],phase,seed));assert(!mapAgreement(order[phase],signals[(phase+1)%3],phase,seed));}
 }assert.equal(routes.size,6);
});
test('small groups have enough information and explicit teacher path choices stay intact',()=>{
 for(let seed=0;seed<12;seed++){
  assert.equal(mapBrief(0,1,seed).role,'combined');assert.equal(mapBrief(0,1,seed).signals?.length,3);
  assert.equal(mapBrief(0,2,seed).signals?.length,3);assert.equal(mapBrief(1,2,seed).role,'last');
  assert.deepEqual(cooperativeMapOrder(seed,'river-tower-forest'),['river','tower','forest']);assert.deepEqual(cooperativeMapOrder(seed,'tower-forest-river'),['tower','forest','river']);
 }
});
test('shared recipes round-trip only public configuration, with old five-minute lessons supported',()=>{
 for(const game of FLAGSHIP_IDS)for(const minutes of [5,10,20,35,40,90]){
  const recipe=makePlayRecipe(game,4,minutes),encoded=playRecipeHash(recipe);assert.deepEqual(parsePlayRecipe(encoded),recipe);assert.equal(new URL(playRecipeLink('https://physical-pi.vercel.app',recipe)).pathname,'/lessons');
 }
 const original=structuredClone(DEFAULT_WORKSHOP);original.packageMinutes=null;assert.equal(makePlayRecipe('expedition-map',4,20,original).settings.packageMinutes,null);
 assert.equal(PRIMARY_EXPERIENCES.length,2,'the retired co-steering ship is no longer offered');assert.equal(STARTER_RECIPES.length,2);
});
test('tampered share links cannot carry student, room, token or recovery data',()=>{
 const recipe=makePlayRecipe('expedition-map');
 for(const key of ['room','roomId','studentNumber','nickname','score','accessToken','recoveryKey','teacher_id'])assert.equal(parsePlayRecipe('#recipe='+encodeURIComponent(JSON.stringify({...recipe,[key]:'synthetic-private-value'}))),null);
 assert.equal(parsePlayRecipe('#recipe='+encodeURIComponent(JSON.stringify({...recipe,settings:{...recipe.settings,token:'synthetic'}}))),null);
 for(const change of [{groups:0},{groups:21},{minutes:4},{minutes:91},{game:'javascript:alert(1)'},{v:2}])assert.equal(parsePlayRecipe('#recipe='+encodeURIComponent(JSON.stringify({...recipe,...change}))),null);
 for(const value of ['#recipe=%','javascript:alert(1)','#recipe='+('x'.repeat(4001))])assert.equal(parsePlayRecipe(value),null);
 assert.throws(()=>playRecipeLink('javascript:alert(1)',recipe));assert.throws(()=>playRecipeLink('https://user:pass@example.com',recipe));
});
test('public recipe survives the explicit Google return without private auth persistence',()=>{
 const saved=new Map<string,string>(),oldStorage=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage'),oldLocation=Object.getOwnPropertyDescriptor(globalThis,'location'),recipe=makePlayRecipe('expedition-loop',3,20);
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>saved.set(k,v),removeItem:(k:string)=>saved.delete(k)}});
 Object.defineProperty(globalThis,'location',{configurable:true,value:{pathname:'/teacher/setup',search:'',hash:playRecipeHash(recipe),origin:'https://physical-pi.vercel.app'}});
 try{savePublicSetupReturn();assert.equal(saved.size,1);assert.equal(takePublicSetupReturn(),'/teacher/setup'+playRecipeHash(recipe));assert.equal(saved.size,0);assert.equal(takePublicSetupReturn(),null);}finally{if(oldStorage)Object.defineProperty(globalThis,'sessionStorage',oldStorage);else Reflect.deleteProperty(globalThis,'sessionStorage');if(oldLocation)Object.defineProperty(globalThis,'location',oldLocation);else Reflect.deleteProperty(globalThis,'location');}
});
test('each rotating seat has concrete actions and an accessible alternative',()=>{
 for(const game of FLAGSHIP_IDS)for(let members=2;members<=6;members++)for(let round=0;round<members;round++){
  const seats=movementRoleSeats(game,members,round);assert.equal(seats.length,members);assert.equal(new Set(seats.map(s=>s.seat)).size,members);
  assert(seats.every(s=>s.role.length>0&&s.action.length>8&&s.alternative.length>8));
  if(members>2)assert.notEqual(seats[0].role,movementRoleSeats(game,members,(round+1)%members)[0].role);
 }
});
test('shared-screen cues distinguish waiting from moving and support seated participation',()=>{
 let moving=0,waiting=0;for(let round=0;round<3;round++)for(let t=0;t<20000;t+=3000){const c=sharedScreenCue('signals',round,t,false);if(c.active){moving++;assert(c.title.startsWith('출동!'));}else{waiting++;assert(!c.title.startsWith('출동!'));}}
 assert(moving>0&&waiting>0);const small=Array.from({length:8},(_,i)=>sharedScreenCue('signals',0,i*3000,true).title);assert(small.some(c=>c.includes('무릎')));assert(small.every(c=>!c.includes('발 번갈아')));
 assert.equal(sharedScreenCue('rhythm',0,0,false).active,true);assert.equal(sharedScreenCue('rhythm',0,600,false).active,false);
});
test('every shared-screen cue names the movement it shows, and an empty beat shows rest',()=>{
 const label:Record<string,string>={open:'손바닥 펴기',wings:'팔 작게 펼치기',step:'제자리 발 번갈아 디디기',knees:'양손 무릎 가볍게 짚기'};
 for(const id of ['signals','rhythm','relay'] as const)for(const seated of [false,true])for(let round=0;round<3;round++)for(let t=0;t<20000;t+=300){
  const cue=sharedScreenCue(id,round,t,seated);
  if(cue.move==='rest'){assert.equal(id,'rhythm');assert.equal(cue.active,false);assert.equal(cue.title,'편하게 쉬는 박자');}
  else assert(cue.title.endsWith(label[cue.move]),`${id} ${cue.title} shows ${cue.move}`);
  assert.notEqual(cue.move,seated?'step':'knees');
 }
});
