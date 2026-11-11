import test from 'node:test';
import assert from 'node:assert/strict';
import {PHONE_PLAY_BY_ID,phoneRecordValid} from '../src/domain/phonePlayCatalog';
import {phoneMemoryTask,phoneFillOptions} from '../src/domain/phoneTaskRules';
import {classroomResultScore,canReportCompletion,expressionAssessment,normalizeGameResultDetails} from '../src/domain/gameResultDetails';
import {recordCounts,type PlayerProfile} from '../src/application/usePlayerProfile';
import {isPrivateDeviceKey,writeStorage,readStorage} from '../src/application/browserStorage';
import {createActiveClock} from '../src/domain/gameReviewGuards';
import {SAFETY_LESSON_IDS,SAFETY_LESSONS,safetyScenarios,safetyLessonResult} from '../src/domain/safetyLessons';

test('played game types use the same private session and expiry protection',()=>{
 assert(isPrivateDeviceKey('physical_played_games'));
 const local=new Map<string,string>(),session=new Map<string,string>();const storage=(map:Map<string,string>)=>({get length(){return map.size},key:(i:number)=>[...map.keys()][i],getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>map.set(k,v),removeItem:(k:string)=>map.delete(k)});
 const previous=globalThis.window,realNow=Date.now;let now=realNow();Date.now=()=>now;Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:storage(local),sessionStorage:storage(session)}});
 try{local.set('physical_played_games','["legacy"]');assert.equal(readStorage('physical_played_games'),null);writeStorage('physical_played_games','["current"]');assert(!local.has('physical_played_games'));now+=9*3600000;assert.equal(readStorage('physical_played_games'),null);}finally{Date.now=realNow;Object.defineProperty(globalThis,'window',{configurable:true,value:previous});}
});
test('tail relay shows exactly the order it later checks at every level',()=>{
 const p=PHONE_PLAY_BY_ID.get('phone-play-012')!;for(const easy of [true,false])for(const challenge of [false,true])for(let round=0;round<3;round++){const task=phoneMemoryTask(p,round,easy,challenge);assert.deepEqual(task.base,task.expected);assert.deepEqual(task.shown,task.expected);assert(task.prompt.includes(String(task.expected.length)));}assert.equal(phoneMemoryTask(p,0).expected.length,2);
});
test('four-beat fill remains four beats at easy level and offers the advertised pause',()=>{
 const p=PHONE_PLAY_BY_ID.get('phone-play-033')!;for(let round=0;round<3;round++)for(const fill of phoneFillOptions(round)){const task=phoneMemoryTask(p,round,true,false,fill);assert.equal(task.expected.length,4);assert.equal(task.base.length,3);assert.equal(task.expected.at(-1),fill);assert(phoneRecordValid(p,{round,outcome:'complete',elapsedMs:p.seconds*1000,count:0,participants:[1],answer:task.expected,easy:true,fill},1));}assert.deepEqual(phoneFillOptions(0),['멈춤']);
});
test('lost signals, pause and hidden time cannot consume shadow samples',()=>{
 const clock=createActiveClock(0);assert.equal(clock.sample(500,false),500);assert.equal(clock.sample(5500,true),500);assert.equal(clock.sample(10500,true),500);assert.equal(clock.sample(11000,false),1000);assert.equal(clock.sample(10900,false),1000);
});
test('partial zero-score work stays zero in a classroom and cannot claim full completion',()=>{
 const d={participation:'performed' as const,completion:'partial' as const};assert.equal(classroomResultScore(0,d),0);assert.equal(classroomResultScore(-300,d),0);assert.equal(canReportCompletion(d),false);assert.equal(classroomResultScore(50,d),50);assert.equal(classroomResultScore(300,{participation:'observed'}),0);assert(canReportCompletion({participation:'performed',completion:'complete'}));
});
test('record counts distinguish quiet results and preserve unknown older totals honestly',()=>{
 const profile={totalPlays:4,recentGames:[{details:{participation:'observed'}},{details:{participation:'rested'}},{details:{participation:'performed'}}]} as unknown as PlayerProfile;assert.deepEqual(recordCounts(profile),{performed:1,observed:1,rested:1,other:1});assert.deepEqual(recordCounts({...profile,participationCounts:{performed:2,observed:1,rested:1}}),{performed:2,observed:1,rested:1,other:0});
});
test('only performed expression steps receive partial assessment criteria',()=>{
 const steps=[{title:'준비 박자'},{title:'연결 동작'},{title:'마무리'}],rubric=[{criterion:'전체 조화',desc:'전체 흐름'}];assert.deepEqual(expressionAssessment(steps,rubric,[]),[]);const partial=expressionAssessment(steps,rubric,[1]);assert.equal(partial.length,1);assert.match(partial[0].criterion,/연결 동작/);assert(!partial[0].criterion.includes('준비'));assert.deepEqual(expressionAssessment(steps,rubric,[0,1,2]),rubric);
});
test('observation can skip private feelings but must acknowledge the comparison process',()=>{
 const p=PHONE_PLAY_BY_ID.get('phone-play-017')!,r={round:0,outcome:'complete' as const,elapsedMs:p.seconds*1000,count:0,answer:[],participants:[1,2]};assert(!phoneRecordValid(p,r,2));for(const comparison of ['compared','uncertain','skip'] as const)assert(phoneRecordValid(p,{...r,comparison},2));
});
test('all five alternative safety sets keep the reviewed choices and reasons',()=>{
 for(const id of SAFETY_LESSON_IDS){const variants=safetyScenarios(id,'alternate');assert.equal(variants.length,3);for(let i=0;i<3;i++){assert.notEqual(variants[i].situation,SAFETY_LESSONS[id].scenarios[i].situation);assert.deepEqual(variants[i].choices,SAFETY_LESSONS[id].scenarios[i].choices);assert.equal(variants[i].explanation,SAFETY_LESSONS[id].scenarios[i].explanation);}const result=safetyLessonResult(id,variants.map((s,i)=>({scenario:i,answer:s.answer,mode:'read' as const})),10,'alternate')!;assert.equal(result.details.participation,'observed');assert.deepEqual(normalizeGameResultDetails(result.details)?.learning,{confirmed:3,total:3,source:'safety'});assert.equal(classroomResultScore(result.amount,result.details),0);}
});
