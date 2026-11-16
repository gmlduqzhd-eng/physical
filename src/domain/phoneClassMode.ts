import type {GameResultDetails} from './gameResultDetails.js';
import {phoneSequence,type PhonePlay} from './phonePlayCatalog.js';
import {phoneRoles,phoneRoundCues,phoneTeamMotion} from './phonePlayProgression.js';
import {phoneFillOptions,phoneMemoryTask} from './phoneTaskRules.js';

// Whole-class mode for the 100 no-equipment plays: one teacher screen, no student devices.
export const CLASS_TASK_SECONDS=[30,45,60,90] as const;
export const CLASS_DEFAULT_SECONDS=45;
export const CLASS_COUNTDOWN_MS=3000;
export const CLASS_BRIEF_MS=6000;
export const CLASS_MEMORY_BRIEF_MS=9000;
export const CLASS_CUE_MS=6000;
export type ClassOutcome='all'|'some'|'rest';
export const classTaskSeconds=(value:number)=>(CLASS_TASK_SECONDS as readonly number[]).includes(value)?value:CLASS_DEFAULT_SECONDS;
/** 기억 놀이와 고를 것이 있는 판단 놀이는 안내 시간을 길게 둔다. */
export function classPhaseMs(phase:string,taskSeconds:number,memory:boolean){
 return phase==='countdown'?CLASS_COUNTDOWN_MS:phase==='brief'?(memory?CLASS_MEMORY_BRIEF_MS:CLASS_BRIEF_MS):phase==='active'?classTaskSeconds(taskSeconds)*1000:0;
}
/** Movement time of the three tasks, which is what the class actually spends moving. */
export const classMovementSeconds=(taskSeconds:number)=>classTaskSeconds(taskSeconds)*3;
/**
 * One confirmation for the whole class. It keeps the existing scale (100 per task, 50 for a partial task)
 * and never reports completion for a class that rested or only partly took part.
 */
export function classOutcomeResult(play:PhonePlay,outcome:ClassOutcome,run:{taskSeconds:number;seated:boolean;level:string;movedMs:number}):{amount:number;details:GameResultDetails}{
 const seconds=classTaskSeconds(run.taskSeconds),moved=Math.max(0,Math.min(Math.round(run.movedMs/1000),seconds*3));
 const amount=outcome==='all'?300:outcome==='some'?150:0;
 return {amount,details:{
  completion:outcome==='all'?'complete':'partial',
  participation:outcome==='rest'?'observed':'performed',
  criteria:[...play.rounds],
  totalTime:moved,
  metrics:{
   '놀이 분류':play.category,
   '참여 방식':'반 전체 · 교사 화면 1대',
   '과제 시간':`과제마다 ${seconds}초 · 실제 진행 ${moved}초`,
   '참여 동작':`${run.seated?'앉은 동작':'기본 움직임'} · ${run.level}`,
   '수행 확인':outcome==='all'?'교사가 반 전체 참여를 확인 · 자동 측정 아님':outcome==='some'?'교사가 일부 참여를 확인 · 자동 측정 아님':'휴식·관찰로 기록',
  },
 }};
}
/**
 * What the big screen shows for one task: a short brief before it starts and the signals that rotate while the class moves.
 * It follows the same rules as the device flow, so a play means the same thing in both.
 */
export function classRoundView(play:PhonePlay,round:number,level:string,seated:boolean):{brief:string;cues:string[];memory:boolean;choices:string[]}{
 const easy=level==='쉬운 방법',hard=level==='추가 도전',isMemory=play.kind==='memory';
 const memory=phoneMemoryTask(play,round,easy,hard,play.id==='phone-play-033'?phoneFillOptions(round)[0]:'');
 // 큰 글씨 안내는 음성이 읽는 과제 이름과 같게 한다. 기억 놀이는 기억할 순서를 보여 준다.
 const brief=isMemory?memory.base.join(' → '):seated?play.seated:play.rounds[Math.min(round,play.rounds.length-1)];
 const cues=seated?[play.seated]
  :play.kind==='team'?[play.id==='phone-play-008'?phoneRoles(play,3,round).map(r=>`${r.seat}번 ${r.role}`).join(' · '):phoneTeamMotion(play,round)]
  :isMemory?(play.id==='phone-play-006'?memory.shown:play.id==='phone-play-003'?phoneSequence(play,round,easy,hard).map(c=>`새 신호: ${c} · 앞 신호의 동작을 해요`):easy?[`순서: ${memory.base.join(' → ')}`,memory.rule]:[memory.rule])
  :phoneRoundCues(play,round,level);
 // 판단 놀이는 고를 것을 시작 전에 보여 주고, 반 전체가 손을 들어 고른다.
 const choices=play.kind==='decision'&&!seated?play.options??[]:[];
 return {brief,cues,memory:isMemory,choices};
}
