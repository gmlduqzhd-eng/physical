import test from 'node:test';
import assert from 'node:assert/strict';
import {PHONE_CATEGORIES,PHONE_PLAYS,phonePlayerRange,phoneRecordValid,phoneSequence,type PhoneRecord} from '../src/domain/phonePlayCatalog';
import {GAMES,AVAILABLE_GAMES} from '../src/domain/gamesData';
import {LESSON_GAME_CATALOG} from '../src/data/lessonGameCatalog';
import {matchesActivitySearch} from '../src/domain/activitySearch';
import {normalizeGameResultDetails} from '../src/domain/gameResultDetails';
import {resolveGuidedGameType} from '../src/domain/guidedMission';
import {mergedGameUrl,getRemovedGame} from '../src/domain/gameLifecycle';

test('every released play has distinct instructions, three real tasks, and a coherent classroom catalog',()=>{
 assert.equal(PHONE_PLAYS.length,Number(process.env.PHONE_EXPECTED_COUNT||8));
 assert.equal(new Set(PHONE_PLAYS.map(p=>p.id)).size,PHONE_PLAYS.length);
 assert.equal(new Set(PHONE_PLAYS.map(p=>p.rules.join('|'))).size,PHONE_PLAYS.length);
 assert.deepEqual(new Set(PHONE_PLAYS.map(p=>p.category)),new Set(PHONE_CATEGORIES));
 for(const p of PHONE_PLAYS){
  assert.equal(p.rules.length,3,p.id);assert.equal(p.rounds.length,3,p.id);assert.equal(new Set(p.rounds).size,3,p.id);
  assert(p.goal.length>=15&&p.seated.length>=12&&p.check.length>=12,p.id);assert(p.cues.length>=3&&p.cues.length<=4,p.id);
  if(p.kind==='memory')assert.equal(new Set(p.cues).size,p.cues.length,p.id);
  if(p.kind==='decision')assert.equal(p.options?.length,3,p.id);
  assert.equal(GAMES.filter(g=>g.type===p.id).length,1,p.id);assert(AVAILABLE_GAMES.some(g=>g.type===p.id));
  const lesson=LESSON_GAME_CATALOG.filter(g=>g.id===p.id);assert.equal(lesson.length,1,p.id);assert.deepEqual(lesson[0].recommendedPlayers,phonePlayerRange(p));assert.equal(lesson[0].intensity,p.intensity);
  assert(matchesActivitySearch(GAMES.find(g=>g.type===p.id)!,'준비물 없이 '+p.category));
  assert.equal(resolveGuidedGameType(p.name,p.name,[{id:'verified',title:'활동',amount:300,requires_approval:true,gameType:p.id}], 'verified'),p.id);
 }
});
test('elapsed time never substitutes for participation; invalid memory, counts, or repeated participants cannot earn full records',()=>{
 for(const p of PHONE_PLAYS){const players=phonePlayerRange(p).min;
  const record:PhoneRecord={round:0,outcome:'complete',elapsedMs:p.kind==='estimate'?8000:p.seconds*1000,count:4,answer:p.kind==='memory'?phoneSequence(p,0):[],participants:Array.from({length:players},(_,i)=>i+1)};
  assert(phoneRecordValid(p,record,players),p.id);
  assert(!phoneRecordValid(p,{...record,elapsedMs:0},players));assert(!phoneRecordValid(p,{...record,participants:[]},players));assert(!phoneRecordValid(p,{...record,participants:[1,1]},players));assert(!phoneRecordValid(p,{...record,count:-1},players));assert(!phoneRecordValid(p,{...record,count:100},players));
  if(p.kind==='memory')assert(!phoneRecordValid(p,{...record,answer:[]},players));
  if(p.kind==='count')assert(!phoneRecordValid(p,{...record,count:0},players));
  const details=normalizeGameResultDetails({metrics:{'놀이 분류':p.category,'수행 확인':'직접 확인 · 자동 측정 아님','1차 과제':p.rounds[0]},criteria:p.rounds,totalTime:72});assert.equal(details?.criteria?.length,3);
 }
});
test('old activity identifiers, redirects, and recorded details remain readable',()=>{
 assert(GAMES.some(g=>g.type==='zigzag'));assert.equal(getRemovedGame('coin_flip')?.id,'coin_flip');
 assert.match(mergedGameUrl('/play/exp-phone-01','exp-phone-01','?room=old','')!,/zigzag\?room=old&variant=exp-phone-01/);
 assert.equal(normalizeGameResultDetails({course:{sourceId:'exp-phone-01',targetId:'zigzag',sourceName:'이전 코스',targetName:'기존 활동',version:1},metrics:{'이전 기록':'유지'}})?.course?.sourceId,'exp-phone-01');
});
