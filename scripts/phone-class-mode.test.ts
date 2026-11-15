import test from 'node:test';
import assert from 'node:assert/strict';
import {PHONE_PLAYS} from '../src/domain/phonePlayCatalog';
import {classOutcomeResult,classPhaseMs,classRoundView,classTaskSeconds,classMovementSeconds,CLASS_TASK_SECONDS,CLASS_DEFAULT_SECONDS} from '../src/domain/phoneClassMode';
import {normalizeGameResultDetails,canReportCompletion,classroomResultScore,earnsParticipationReward} from '../src/domain/gameResultDetails';

test('every one of the 59 plays has a brief and readable signals for all three tasks in whole-class mode',()=>{
 assert.equal(PHONE_PLAYS.length,59);
 for(const play of PHONE_PLAYS)for(const level of ['쉬운 방법','기본 방법','추가 도전'])for(const seated of [false,true])for(const round of [0,1,2]){
  const view=classRoundView(play,round,level,seated);
  assert(view.brief.trim().length>0,`${play.id} brief`);assert(view.cues.length>0,`${play.id} cues`);
  for(const cue of view.cues){assert.equal(typeof cue,'string');assert(cue.trim().length>0&&!cue.includes('undefined'),`${play.id} round ${round} cue`);}
 }
});
test('task time is one of the offered lengths and movement time is three tasks',()=>{
 for(const seconds of CLASS_TASK_SECONDS){assert.equal(classTaskSeconds(seconds),seconds);assert.equal(classMovementSeconds(seconds),seconds*3);assert.equal(classPhaseMs('active',seconds,false),seconds*1000);}
 assert.equal(classTaskSeconds(7),CLASS_DEFAULT_SECONDS);assert.equal(classTaskSeconds(Number.NaN),CLASS_DEFAULT_SECONDS);
 assert(classPhaseMs('brief',45,true)>classPhaseMs('brief',45,false),'a memory task shows its order longer');assert.equal(classPhaseMs('record',45,false),0);
 assert(classMovementSeconds(CLASS_DEFAULT_SECONDS)>72,'the default must move longer than the 72 seconds of the device flow');
});
test('one class confirmation records a result; resting or partial participation never reports completion',()=>{
 const play=PHONE_PLAYS[0],run={taskSeconds:45,seated:false,level:'기본 방법',movedMs:135000};
 const all=classOutcomeResult(play,'all',run),some=classOutcomeResult(play,'some',run),rest=classOutcomeResult(play,'rest',run);
 assert.equal(all.amount,300);assert.equal(some.amount,150);assert.equal(rest.amount,0);
 assert.deepEqual(normalizeGameResultDetails(all.details)?.criteria,play.rounds);assert.equal(all.details.totalTime,135);
 assert(canReportCompletion(all.details));assert(!canReportCompletion(some.details));assert(!canReportCompletion(rest.details));
 assert(earnsParticipationReward(all.amount,all.details));assert(!earnsParticipationReward(rest.amount,rest.details));assert.equal(classroomResultScore(300,rest.details),0);
 assert.equal(classOutcomeResult(play,'all',{...run,movedMs:9e9}).details.totalTime,135,'recorded movement never exceeds the three tasks');
 assert.equal(all.details.metrics!['참여 방식'],'반 전체 · 교사 화면 1대');
});
