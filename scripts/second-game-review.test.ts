import test from 'node:test';
import assert from 'node:assert/strict';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';
import {catalog} from '../server/aiService';
import {EXPRESSION_GAMES} from '../src/presentation/components/minigames/expression/expressionGamesData';
import {PHONE_PLAYS,PHONE_PLAY_BY_ID,phoneRecordValid,type PhoneRecord} from '../src/domain/phonePlayCatalog';
import {phoneMemoryTask,phoneRoundCheck,phoneObservation,phoneScenario,phoneBundle} from '../src/domain/phoneTaskRules';
import {phoneRoles,phoneTeamMotion} from '../src/domain/phonePlayProgression';
import {EXPEDITION_GAMES} from '../src/domain/expeditionGames';
import {createExpeditionRound,validateExpeditionRecord,expeditionScore,type ExpeditionRecord} from '../src/domain/expeditionRules';
import {earnsParticipationReward,normalizeGameResultDetails} from '../src/domain/gameResultDetails';

test('all 37 active expression materials agree with the list and AI source',()=>{
 const active=new Set(AVAILABLE_GAMES.map(g=>g.type));const rows=EXPRESSION_GAMES.filter(g=>active.has(g.id));assert.equal(rows.length,37);
 for(const row of rows){const game=AVAILABLE_GAMES.find(g=>g.type===row.id)!,source=catalog.find(g=>g.id===row.id)!;
  assert.deepEqual(game.equipment,row.equipment,row.id);assert.deepEqual(game.safetyTips,row.safetyTips);assert.deepEqual(game.spaces,row.spaces);
  assert.equal(game.desc,row.desc);assert(source.equipment.length&&source.safety.length&&source.space.length,row.id);
 }
 const jump=catalog.find(g=>g.id==='music_jumprope')!;assert(!JSON.stringify(jump).includes('2회전'));
});
test('observation and rest never earn participation rewards, even with an old positive score',()=>{
 for(const participation of ['observed','rested'] as const){const d=normalizeGameResultDetails({participation,ratings:[0,0]})!;assert.equal(d.participation,participation);assert.equal(d.ratings,undefined);assert.equal(earnsParticipationReward(300,d),false);}
 assert(earnsParticipationReward(0,{participation:'performed'}));assert(!earnsParticipationReward(0));assert(earnsParticipationReward(10));
});
test('all 100 phone activities allow truthful rest or observation without fabricated movement',()=>{
 assert.equal(PHONE_PLAYS.length,100);
 for(const p of PHONE_PLAYS)for(const outcome of ['rest','observe'] as const){const record:PhoneRecord={round:0,outcome,elapsedMs:0,count:0,answer:[],participants:[]};assert(phoneRecordValid(p,record,3),p.id);assert(!phoneRecordValid(p,{...record,count:1},3));assert(!phoneRecordValid(p,{...record,participants:[1]},3));}
});
test('missing, reverse and fill memory games require their own actual answers',()=>{
 const missing=PHONE_PLAY_BY_ID.get('phone-play-006')!,reverse=PHONE_PLAY_BY_ID.get('phone-play-014')!,fill=PHONE_PLAY_BY_ID.get('phone-play-033')!;
 const m=phoneMemoryTask(missing,1);assert.deepEqual(m.expected,[m.base[1]]);assert(m.shown[1].includes('빈칸'));assert.equal(m.expected.length,1);
 const r=phoneMemoryTask(reverse,0);assert.deepEqual(r.expected,[...r.base].reverse());assert.notDeepEqual(r.expected,r.base);
 const f=phoneMemoryTask(fill,0,false,false,'멈춤');assert.equal(f.expected.length,4);assert.equal(f.expected[3],'멈춤');
 const record:PhoneRecord={round:0,outcome:'complete',elapsedMs:fill.seconds*1000,count:0,answer:f.expected,participants:[1],fill:'멈춤'};assert(phoneRecordValid(fill,record,1));assert(!phoneRecordValid(fill,{...record,answer:f.expected.slice(0,3)},1));
});
test('movie confirmation concerns this scene, and edited creation roles retain the chosen sequence',()=>{
 const p=PHONE_PLAY_BY_ID.get('phone-play-029')!,chosen=[p.cues[2],p.cues[0]];
 assert(phoneRoundCheck(p,0).includes(p.rounds[0]));assert(!phoneRoundCheck(p,0).includes('세 장면'));
 for(const role of phoneRoles(p,2,0,chosen))assert(role.role.includes(chosen.join(' → ')));
 assert.notDeepEqual(phoneRoles(p,2,0,chosen),phoneRoles(p,2,1,chosen));
});
test('team games show concrete shared motions and rotate the signal reader',()=>{
 const rows=PHONE_PLAYS.filter(p=>p.kind==='team');assert.equal(rows.length,19);
 for(const p of rows){const a=phoneRoles(p,3,0),b=phoneRoles(p,3,1);assert.notDeepEqual(a,b,p.id);if(p.id!=='phone-play-008')assert(a.every(role=>role.role.includes(phoneTeamMotion(p,0))),p.id);}
});
test('paired counting carries one remainder and personal counts must add to the recorded total',()=>{
 assert.deepEqual(phoneBundle(5,0),{count:2,remainder:1});assert.deepEqual(phoneBundle(4,1),{count:2,remainder:1});assert.deepEqual(phoneBundle(3,1),{count:2,remainder:0});
 const p=PHONE_PLAY_BY_ID.get('phone-play-061')!,r:PhoneRecord={round:0,outcome:'complete',elapsedMs:p.seconds*1000,count:6,answer:[],participants:[1,2,3],goals:[1,2,3],individual:[1,2,3]};assert(phoneRecordValid(p,r,3));assert(!phoneRecordValid(p,{...r,count:7},3));assert(!phoneRecordValid(p,{...r,individual:[6]},3));assert(!phoneRecordValid(p,{...r,goals:[3,3,3]},3));
});
test('observation measures are game-specific and decision circumstances change each round',()=>{
 assert.equal(phoneObservation(PHONE_PLAY_BY_ID.get('phone-play-017')!).label,'두 팔의 높이 관찰');
 assert.notEqual(phoneObservation(PHONE_PLAY_BY_ID.get('phone-play-017')!).label,phoneObservation(PHONE_PLAY_BY_ID.get('phone-play-091')!).label);
 for(const p of PHONE_PLAYS.filter(p=>p.kind==='decision'))assert.equal(new Set([0,1,2].map(i=>phoneScenario(p,i))).size,3);
});
test('all 34 active expedition games accept zero-score quiet records and preserve alternatives',()=>{
 const active=new Set(AVAILABLE_GAMES.map(g=>g.type)),rows=EXPEDITION_GAMES.filter(g=>g.kind==='B'&&active.has(g.id));assert.equal(rows.length,34);
 for(const g of rows){const plan=createExpeditionRound(g,0,g.players,()=>.42);for(const outcome of ['rest','observe'] as const){const r:ExpeditionRecord={round:1,kind:plan.kind,source:'self-report',participants:[],counts:plan.targets.map(()=>0),checks:[],answer:[],correct:false,elapsedMs:0,outcome,alternative:true,gentle:true};assert.equal(validateExpeditionRecord(plan,r,g.players),null,g.id);assert.equal(expeditionScore([r],[plan]),0);const d=normalizeGameResultDetails({participation:'rested',activity:{gameId:g.id,specId:g.spec,soloPreview:true,rounds:[r]}})!;assert.equal(d.activity!.rounds[0].outcome,outcome);assert.equal(d.activity!.rounds[0].alternative,true);assert.equal(d.activity!.rounds[0].gentle,true);}}
});
test('partial expedition participation is allowed and capped, without passing full participation checks',()=>{
 const g=EXPEDITION_GAMES.find(g=>g.spec==='T41')!,plan=createExpeditionRound(g,0,4,()=>.42);const r:ExpeditionRecord={round:1,kind:plan.kind,source:'peer-report',participants:[1],counts:plan.targets.map(t=>t.goal),checks:[],answer:[],correct:true,elapsedMs:1000,outcome:'partial'};
 assert.equal(validateExpeditionRecord(plan,r,4),null);assert(expeditionScore([r],[plan])<=50);assert(validateExpeditionRecord(plan,{...r,outcome:'complete'},4));assert(validateExpeditionRecord(plan,{...r,participants:[]},4));
});


import {rescueInputMode,shipExchangeReady,shadowTiming} from '../src/domain/flagshipParticipation';
import {LEVEL_RULES} from '../src/domain/expeditionWorkshop';
test('an assisted rescue history cannot become camera-only by switching the final input',()=>{
 assert.equal(rescueInputMode(false,false),'camera');assert.equal(rescueInputMode(false,true),'assisted');assert.equal(rescueInputMode(true,false),'assisted');assert.equal(rescueInputMode(true,true),'assisted');
});
test('both ship devices must claim the opposite axes before confirming exchange',()=>{
 const axes=[{claimed:true},{claimed:true}];assert(!shipExchangeReady(0,0,axes));assert(!shipExchangeReady(0,-1,axes));assert(!shipExchangeReady(0,1,[{claimed:false},{claimed:true}]));assert(shipExchangeReady(0,1,axes));assert(shipExchangeReady(1,0,axes));assert(!shipExchangeReady(-1,0,axes));
});
test('every shadow level previews all eight samples and slow mode extends the full duration',()=>{
 for(const rules of Object.values(LEVEL_RULES)){const normal=shadowTiming(rules.shadowMs,false),slow=shadowTiming(rules.shadowMs,true);assert.equal(normal.previewMs,8*rules.shadowMs);assert.equal(slow.previewMs,normal.previewMs*1.5);assert.equal(slow.sampleMs,rules.shadowMs*1.5);}
});
