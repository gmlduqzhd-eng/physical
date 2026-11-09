import test from 'node:test';
import assert from 'node:assert/strict';
import {BOSS_ROUTES,DEFAULT_WORKSHOP,LEVEL_RULES,LEVELS,SHIP_COURSES,LESSON_PACKAGES,workshopSchema,groupRhythm,expeditionRhythm,roleSeats,readinessLabel,expeditionReport} from '../src/domain/expeditionWorkshop';
import {initialShip,shipStep,rhythmScore,rescueHit} from '../src/domain/flagship';
import type {ExpeditionSnapshot} from '../src/domain/flagship';
import {lessonTransferLink,parseLessonTransfer,publicLessonSchema,savePublicSetupReturn,takePublicSetupReturn,type PublicLessonTransfer} from '../src/domain/publicLessonTransfer';

test('workshop settings accept all supported choices and reject personal/unknown or invalid inputs',()=>{
 for(const level of LEVELS)for(const route of Object.keys(BOSS_ROUTES))for(const shipCourse of Object.keys(SHIP_COURSES))assert(workshopSchema.safeParse({...DEFAULT_WORKSHOP,level,route,shipCourse}).success);
 for(const patch of [{name:'private'},{members:1},{members:6.5},{roleEvery:0},{rhythm:[0,0,0,0,0,0,0,0]},{rhythm:Array(8).fill(1)},{rhythm:[1,1,2,0,0,0,0,0]},{packageMinutes:30},{route:'https://evil.invalid'},{shipCourse:'arbitrary'}])assert(!workshopSchema.safeParse({...DEFAULT_WORKSHOP,...patch}).success);
});
test('all 2–6 seats rotate through each role once without account/person mappings',()=>{
 for(let members=2;members<=6;members++)for(let seat=0;seat<members;seat++){
  const cycle=Array.from({length:members},(_,round)=>roleSeats(members,round)[seat]);
  assert.equal(new Set(cycle.map(r=>r.role)).size,members);assert(cycle.every(r=>Object.keys(r).sort().join(',')==='role,seat'));
  assert.deepEqual(roleSeats(members,members),roleSeats(members,0));
 }
});
test('all difficulty/course combinations are reachable with bounded ship physics and distinct rules',()=>{
 assert(LEVEL_RULES.easy.radius>LEVEL_RULES.normal.radius&&LEVEL_RULES.normal.radius>LEVEL_RULES.challenge.radius);
 for(const level of LEVELS)for(const targets of Object.values(SHIP_COURSES)){
  let ship=initialShip();for(let i=0;i<4500&&ship.checkpoint<3;i++){
   const t=targets[ship.checkpoint],x=Math.max(-1,Math.min(1,(t.x-ship.x)*.12-ship.vx*.3)),y=Math.max(-1,Math.min(1,(t.y-ship.y)*.12-ship.vy*.3));
   ship=shipStep(ship,x,y,100,LEVEL_RULES[level],targets);assert(ship.x>=5&&ship.x<=95&&ship.y>=5&&ship.y<=95);
  }assert.equal(ship.checkpoint,3,level+' course');
 }
});
test('rhythm courses change real tolerance, preserve active beats and give groups distinct default parts',()=>{
 const taps=[200,1400,2600,3800];assert.equal(rhythmScore(taps,DEFAULT_WORKSHOP.rhythm,600,LEVEL_RULES.easy.tolerance).accuracy,100);
 assert.equal(rhythmScore(taps,DEFAULT_WORKSHOP.rhythm,600,LEVEL_RULES.normal.tolerance).hits,0);
 assert.notDeepEqual(groupRhythm(DEFAULT_WORKSHOP.rhythm,0),groupRhythm(DEFAULT_WORKSHOP.rhythm,1));
 for(let index=0;index<20;index++){const p=groupRhythm([1,1,0,1,0,0,0,0],index);assert.equal(p.filter(Boolean).length,3);assert.equal(p.length,8);}
});
test('all rescue difficulty targets remain reachable, while course values change matching',()=>{
 for(const level of LEVELS)for(let round=0;round<3;round++){
  let found=false;for(let a=15;a<=80&&!found;a+=2)for(let p=15;p<90&&!found;p++)found=rescueHit(a,p,round,LEVEL_RULES[level].rescueRadius);assert(found,level+' round '+round);
 }assert(LEVEL_RULES.easy.shadowRadius>LEVEL_RULES.challenge.shadowRadius);assert(LEVEL_RULES.easy.shadowHits<LEVEL_RULES.challenge.shadowHits);
});
test('lesson packages total 10/20/40 and every boss path has three unique ordered stages',()=>{
 for(const [minutes,steps] of Object.entries(LESSON_PACKAGES)){assert.equal(steps.length,4);assert.equal(steps.reduce((a,b)=>a+b,0),Number(minutes));}
 for(const path of Object.values(BOSS_ROUTES)){assert.equal(path[0],'expedition-map');assert.equal(path.length,3);assert.equal(new Set(path).size,3);}
});
test('readiness expires and reports omit names in a multiline fact-only report',()=>{
 assert.equal(readinessLabel({kind:'camera',state:'ready',at:1000},14000),'최근 신호 없음');
 const s:ExpeditionSnapshot={runId:'fixture',game:'expedition-ship',seed:0,phase:0,status:'playing',revision:1,serverTime:1000,startedAt:0,event:'calm',owner:true,groupId:'g1',clue:null,groups:[{id:'g1',name:'fixture',visited:[],vote:null,done:false,ship:initialShip(),axes:[],loop:[],quality:0,mode:'assisted'}]};s.groups[0].name='절대-내보내지-않는-모둠명';s.groups[0].done=true;
 const text=expeditionReport(s);assert(text.includes('\n'));assert(!text.includes(s.groups[0].name));assert(text.includes('버튼'));assert(text.includes('개인별 운동 능력'));
});
const publicLesson:PublicLessonTransfer={v:1,activityId:'expedition-map',grade:'3~4학년군',goal:'협동과 소통',place:'체육관',device:'태블릿 PC',minutes:40};
test('public teacher transfer roundtrips in fragment only and rejects tampering/private extras',()=>{
 const url=new URL(lessonTransferLink('https://physical-pi.vercel.app',publicLesson));assert.equal(url.search,'');assert.deepEqual(parseLessonTransfer(url.hash),publicLesson);
 for(const extra of [{student:'x'},{classSize:24},{accessToken:'x'},{draft:'x'},{activityId:'//evil.invalid'}]){
  assert.equal(publicLessonSchema.safeParse({...publicLesson,...extra}).success,false);
  assert.equal(parseLessonTransfer('#lesson='+encodeURIComponent(JSON.stringify({...publicLesson,...extra}))),null);
 }assert.equal(parseLessonTransfer('#lesson='+encodeURIComponent(JSON.stringify(publicLesson))+'&token=secret'),null);assert.equal(parseLessonTransfer('#lesson='+'x'.repeat(3000)),null);
});
test('legacy classroom patterns and new editor patterns are explicitly versioned',()=>{
 const base={game:'expedition-loop'} as ExpeditionSnapshot;
 assert.deepEqual(expeditionRhythm(base,2),[1,0,0,1,0,0,1,0]);
 base.workshop={version:0,settings:structuredClone(DEFAULT_WORKSHOP),lessonStep:0,lessonAt:0,observations:{}};
 assert.deepEqual(expeditionRhythm(base,2),[1,0,0,1,0,0,1,0]);
 base.workshop.version=1;assert.deepEqual(expeditionRhythm(base,2),[1,0,1,0,1,0,1,0]);
});
test('Google return preserves only public setup, consumes it once and rejects expired/arbitrary redirects',()=>{
 const oldLocation=Object.getOwnPropertyDescriptor(globalThis,'location'),oldStore=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');const data=new Map<string,string>();
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v),removeItem:(k:string)=>data.delete(k)}});
 Object.defineProperty(globalThis,'location',{configurable:true,value:{origin:'https://physical-pi.vercel.app',pathname:'/teacher/setup',search:'',hash:new URL(lessonTransferLink('https://physical-pi.vercel.app',publicLesson)).hash}});
 try{
  savePublicSetupReturn();assert.equal(data.size,1);const raw=[...data.values()][0];assert(!raw.includes('accessToken'));assert(takePublicSetupReturn()?.startsWith('/teacher/setup#lesson='));assert.equal(data.size,0);assert.equal(takePublicSetupReturn(),null);
  data.set('physical_teacher_public_setup_v1',JSON.stringify({expiresAt:Date.now()-1000,lesson:publicLesson,packageMinutes:null,game:null}));assert.equal(takePublicSetupReturn(),null);assert.equal(data.size,0);
  data.set('physical_teacher_public_setup_v1',JSON.stringify({expiresAt:Date.now()+10000,lesson:null,packageMinutes:null,game:null,returnTo:'https://evil.invalid'}));assert.equal(takePublicSetupReturn(),null);
 }finally{if(oldLocation)Object.defineProperty(globalThis,'location',oldLocation);else Reflect.deleteProperty(globalThis,'location');if(oldStore)Object.defineProperty(globalThis,'sessionStorage',oldStore);else Reflect.deleteProperty(globalThis,'sessionStorage');}
});
