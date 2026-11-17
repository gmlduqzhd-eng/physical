import type {GameResultDetails} from './gameResultDetails.js';
import {phoneSequence,type PhonePlay} from './phonePlayCatalog.js';
import {phoneRoles,phoneRoundCues,phoneTeamMotion} from './phonePlayProgression.js';
import {phoneFillOptions,phoneMemoryTask} from './phoneTaskRules.js';
import {adaptClassicPlay,classicClassCues,isClassicPlay} from './phonePlayClassicsMode.js';

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
 return phase==='rules'?CLASS_RULES_MS:phase==='countdown'?CLASS_COUNTDOWN_MS:phase==='brief'?(memory?CLASS_MEMORY_BRIEF_MS:CLASS_BRIEF_MS):phase==='active'?classTaskSeconds(taskSeconds)*1000:0;
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
/** 반 전체 진행에서 신호 하나가 화면에 머무는 시간. 걸어서 모이거나 구석으로 가는 놀이는 길게 둔다. */
export function classCueMs(id:string){return id==='phone-play-101'?12000:id==='phone-play-106'?10000:CLASS_CUE_MS;}
/** 시작 화면의 3줄 규칙을 보여 주는 단계. 역할을 정해야 하는 놀이는 교사가 누를 때까지 기다린다. */
export const CLASS_RULES_MS=10000;
export interface ClassRoundView {
 brief:string;cues:string[];memory:boolean;
 /** 판단 놀이: 반 전체에는 틀린 고를 것을 띄우지 않으므로 늘 빈 배열이다(옛 화면과 맞추려고 남겨 둔다). */ choices:readonly string[];
 /** 판단 놀이에서 화면에 보여 줄 좋은 방법 한 가지. */ plan?:string;
 /** 기억 놀이: 늘 보이는 순서와, 신호마다 지금 할 차례(순서의 몇 번째인지, 없으면 -1). */ sequence:readonly string[];steps:readonly number[];
 /** 신호마다 그 아래에 보일 규칙 한 줄. */ rules:readonly string[];
}
/**
 * What the big screen shows for one task: a short brief before it starts and the signals that rotate while the class moves.
 * It follows the same rules as the device flow, so a play means the same thing in both.
 */
/** 고를 것이 없는 놀이가 모두 같은 빈 배열을 받게 해, 화면이 다시 그려져도 안내 소리가 되풀이되지 않게 한다. */
const NO_CHOICES:readonly string[]=Object.freeze([]) as readonly string[];
const NO_STEPS:readonly number[]=Object.freeze([]) as readonly number[];
const swapSide=(text:string)=>text.replaceAll('왼','__SIDE__').replaceAll('오른','왼').replaceAll('__SIDE__','오른');
/** 과제의 규칙 한 줄(신호 아래). 정해 둔 줄이 없으면 3줄 규칙의 '어떻게'를 쓴다. */
export function classRuleLine(play:PhonePlay,round:number){const line=play.ruleLine;return typeof line==='string'?line:line?.[Math.min(2,round)]??play.rule3[1];}
/** 새와 나무: '바꿔!'가 나올 때마다 두 뜻이 바뀌므로, 신호마다 지금의 뜻을 보여 준다. */
function swapRules(cues:readonly string[]){
 // 과제마다 처음 뜻에서 시작한다(기기 진행과 같다).
 let swapped=false;
 return cues.map(c=>{if(c==='바꿔!'){swapped=!swapped;return `이제부터 ${swapped?'새=손 모으기 · 나무=팔 펴기':'새=팔 펴기 · 나무=손 모으기'}`;}return `지금: ${swapped?'새=손 모으기 · 나무=팔 펴기':'새=팔 펴기 · 나무=손 모으기'}`;});
}
/** 기억 놀이를 반 전체로 할 때: 순서는 늘 보이고, 지금 할 차례를 하나씩 짚어 준다(추가 도전은 순서를 가린다). */
function memoryView(play:PhonePlay,round:number,easy:boolean,hard:boolean,rule:string){
 const task=phoneMemoryTask(play,round,easy,hard,play.id==='phone-play-033'?phoneFillOptions(round)[0]:'');
 const base=task.base,hide=(list:string[])=>hard?list.map((_,i)=>`${i+1}번째 ?`):list;
 if(play.id==='phone-play-006'){
  const missing=round%base.length,sequence=base.map((c,i)=>i===missing?'?':c);
  return {sequence,cues:base.map((c,i)=>i===missing?'? 빠진 동작을 몸으로!':c),steps:base.map((_,i)=>i),rules:base.map((_,i)=>i===missing?'? 자리에 들어갈 동작을 기억해 몸으로 해요':rule)};
 }
 if(play.id==='phone-play-014'){
  const back=[...base].reverse(),steps=[...base.map((_,i)=>i),...base.map((_,i)=>base.length-1-i)];
  return {sequence:hide(base),cues:[...base.map((c,i)=>hard?`${i+1}번째 동작!`:c),...back.map((c,i)=>hard?`거꾸로 ${base.length-i}번째!`:`거꾸로: ${c}`)],steps,rules:steps.map((_,i)=>i<base.length?'먼저 순서대로 해요':'이제 끝에서부터 거꾸로!')};
 }
 if(play.id==='phone-play-028')return {sequence:hide(base),cues:base.map((c,i)=>hard?`${i+1}번째 동작!`:c),steps:base.map((_,i)=>i),rules:base.map(c=>swapSide(c)===c?'양손은 그대로 해요':`거울처럼 반대 손: ${swapSide(c)}`)};
 if(play.id==='phone-play-033'){const sequence=[...base,'네 번째: 내가 고른 작은 몸짓'];return {sequence:hide(sequence),cues:sequence.map((c,i)=>hard&&i<3?`${i+1}번째 동작!`:c),steps:sequence.map((_,i)=>i),rules:sequence.map((_,i)=>i===3?'멈춤이나 작은 손짓을 넣어요':rule)};}
 return {sequence:hide(base),cues:base.map((c,i)=>hard?`${i+1}번째 동작!`:c),steps:base.map((_,i)=>i),rules:base.map(c=>play.meanings?.[c]?`뜻: ${play.meanings[c]}`:rule)};
}
export function classRoundView(source:PhonePlay,round:number,level:string,seated:boolean,seed=0,cueSeconds=classCueMs(source.id)/1000,taskSeconds=CLASS_DEFAULT_SECONDS):ClassRoundView{
 // 반 전체는 인원 제한이 없으므로 큰 모둠 신호도 쓴다. 쉬운 방법이면 과제 제목도 쉬운 신호에 맞춘다.
 const play=adaptClassicPlay(source,level==='쉬운 방법',Infinity);
 const easy=level==='쉬운 방법',hard=level==='추가 도전',isMemory=play.kind==='memory',r=Math.min(round,play.rounds.length-1);
 const rule=classRuleLine(play,r),empty={sequence:NO_CHOICES,steps:NO_STEPS};
 if(seated)return {brief:play.seated,cues:[play.seated],memory:false,choices:NO_CHOICES,...empty,rules:[play.seated]};
 // 2026-11에 더한 놀이(101~106)는 과제 동안 신호가 바뀐다. 숫자·구석은 무작위, 여우는 출발선 신호를 넣는다.
 if(isClassicPlay(play.id)){
  const cues=classicClassCues(play,round,level,phoneSequence(play,round,easy),seed,16,cueSeconds,classTaskSeconds(taskSeconds));
  return {brief:play.rounds[r],cues,memory:false,choices:NO_CHOICES,...empty,rules:cues.map(()=>rule)};
 }
 if(isMemory&&play.id!=='phone-play-003'){const m=memoryView(play,round,easy,hard,rule);return {brief:m.sequence.join(' → '),cues:m.cues,memory:true,choices:NO_CHOICES,sequence:m.sequence,steps:m.steps,rules:m.rules};}
 const memory=phoneMemoryTask(play,round,easy,hard,'');
 // 큰 글씨 안내는 음성이 읽는 과제 이름과 같게 한다.
 const brief=isMemory?memory.base.join(' → '):play.rounds[r];
 const own=play.classCues?.[r];
 const cues=own?[...own]
  :play.kind==='team'?[play.id==='phone-play-008'?phoneRoles(play,3,round).map(x=>`${x.seat}번 ${x.role}`).join(' · '):phoneTeamMotion(play,round)]
  :isMemory?phoneSequence(play,round,easy,hard).map(c=>`새 신호: ${c} · 앞 신호의 동작을 해요`)
  :phoneRoundCues(play,round,level);
 // 판단 놀이는 반 전체에 틀린 방법을 크게 띄우지 않고, 좋은 방법 한 가지만 보여 준다.
 const plan=play.kind==='decision'&&play.options?play.options[0]:undefined;
 const rules=play.id==='phone-play-011'?swapRules(cues):cues.map(()=>rule);
 return {brief,cues,memory:isMemory,choices:NO_CHOICES,...(plan?{plan}:{}),...empty,rules};
}
