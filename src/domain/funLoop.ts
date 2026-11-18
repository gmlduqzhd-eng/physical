import {withParticle} from './koreanParticle.js';
/**
 * 재미 뼈대(대표 게임 공통 진행). React 없는 순수 함수만 둔다.
 *
 * 한 판의 흐름: demo(시범) → tutorial(연습 판, 점수 안 셈) → play(본게임) → climax(마지막 승부) → result(결과 발표)
 * 선생님 입력·휴대폰 리모컨·키보드는 모두 같은 FunCommand 하나로 들어와 reduce()를 지난다.
 * 시간은 {type:'tick',ms}로만 흐르므로 테스트에서 시간을 그대로 흉내 낼 수 있다.
 */
export const TEAM_NAMES=['청팀','홍팀','황팀','녹팀'] as const;
export const TEAM_COLORS=['#2563eb','#dc2626','#ca8a04','#16a34a'] as const;
export type FunPhase='demo'|'tutorial'|'play'|'climax'|'result';
export type TimedPhase=Exclude<FunPhase,'result'>;
export type SurpriseKind='golden'|'reverse'|'freeze'|'speed';
export const SURPRISE_KINDS:readonly SurpriseKind[]=['golden','reverse','freeze','speed'];
/** 게임마다 쓰는 깜짝 이벤트(본게임·마지막 승부). 빼면 예약도 안 되고 버튼·키보드·리모컨으로도 일으킬 수 없다. */
export type SurpriseAllowance=Partial<Record<'play'|'climax',readonly SurpriseKind[]>>;
/** 단계 이름(TV·리모컨이 같은 말을 쓴다). */
export const FUN_PHASE_LABEL:Readonly<Record<'demo'|'tutorial'|'play'|'climax'|'result',string>>={demo:'시범',tutorial:'연습 판',play:'본게임',climax:'마지막 승부',result:'결과 발표'};
export const SURPRISE_INFO:Readonly<Record<SurpriseKind,{title:string;text:string;icon:string;ms:number}>>={
 golden:{title:'황금 신호!',text:'지금 얻는 점수는 2배예요',icon:'🌟',ms:8000},
 reverse:{title:'거꾸로!',text:'신호와 반대로 움직여요',icon:'🔄',ms:8000},
 freeze:{title:'모두 얼음!',text:'3초 동안 그대로 멈춰요',icon:'🧊',ms:3000},
 speed:{title:'빨리빨리!',text:'신호가 두 배로 빨라져요',icon:'⚡',ms:8000},
};

/**
 * 선생님 화면·리모컨·키보드가 보내는 명령. 리모컨은 이 모양 그대로 JSON으로 보낸다(parseFunCommand로 검사).
 * - next: 다음 단계로(시범→연습→본게임→마지막 승부→결과)
 * - score: 한 팀 점수 ±, scoreAll: 모든 팀 점수 ±(예: "모두 성공")
 * - event: 깜짝 이벤트 바로 일으키기, combo: 반 전체 콤보 게이지 ±, special: 콤보가 꽉 차면 쓰는 필살기
 */
export type FunCommand=
 |{type:'next'}|{type:'pause'}|{type:'resume'}|{type:'end'}
 /** tag: 게임 화면 부품이 붙이는 출처 표시(예: 빙고 칸 차지 'cell'). 키보드·리모컨 명령에는 없다. */
 |{type:'score';team:number;delta:number;tag?:string}
 |{type:'scoreAll';delta:number}
 |{type:'event';event:SurpriseKind}
 |{type:'combo';delta:number}
 |{type:'special'}
 |{type:'tick';ms:number}
 /** 목표를 이뤄 끝남(엔진 내부용, 리모컨으로 받지 않음). */
 |{type:'finish'};

export interface FunTiming {
 /** 초 단위. demo는 시범 애니메이션 길이(건너뛸 수 있음). */
 demo:number;tutorial:number;play:number;climax:number;
 /** 신호 하나가 바뀌는 간격(초). 연습 판은 1.6배 느리게, '빨리빨리!' 동안은 절반. */
 cueSeconds:number;
}
export interface ScheduledSurprise {phase:'play'|'climax';atMs:number;kind:SurpriseKind}
export interface FunLogEntry {phase:FunPhase;text:string;
 /** 그때의 신호 번호(필살기처럼 신호 시점이 중요한 기록). */ cue?:number}
export interface FunState {
 teams:number;scores:number[];phase:FunPhase;paused:boolean;
 /** 지금 단계에서 흐른 시간(ms). */ phaseMs:number;
 timing:FunTiming;
 /** 신호 번호. 신호 간격마다 1씩 늘고, 단계가 바뀌면 0으로 돌아간다. */ cueIndex:number;cueMs:number;
 /**
  * 지금 신호의 길이(초). 신호가 시작될 때 한 번 정하고 그 신호가 끝날 때까지 바꾸지 않는다
  * (보스가 바뀌는 순간 6초↔12초로 흔들리지 않게). null이면 아직 정하지 않음, 0이면 게임 기본 간격.
  */
 cueLenSec?:number|null;
 combo:number;specials:number;
 /** 지금 깜짝 이벤트. seq는 이벤트마다 1씩 늘어난다(같은 이벤트를 두 번 알리지 않게). */
 event:{kind:SurpriseKind;leftMs:number;seq:number}|null;
 /** 지금까지 일어난 깜짝 이벤트 수(이벤트 번호). */ eventSeq:number;
 /** 다른 이벤트가 진행 중이라 미뤄 둔 예약 이벤트(끝나면 바로 일어난다). */ deferred:SurpriseKind|null;
 /** 끝난 단계마다 보여 준 신호 수(마지막 승부가 본게임 라운드를 이어 셀 때 쓴다). */ phaseCues:Partial<Record<FunPhase,number>>;
 /** true면 시범이 저절로 넘어가지 않는다(움직임 줄이기 설정: 선생님이 직접 넘긴다). */ holdDemo:boolean;
 /** 이 게임이 쓰는 깜짝 이벤트(연습 판은 본게임 목록을 따른다). */ allowedSurprises:Record<'play'|'climax',SurpriseKind[]>;
 surprises:ScheduledSurprise[];
 /** 신호마다 얻은 점수(MVP 동작 고르기용): 'play:3'처럼 단계:신호 번호 → 점수 */
 cueHits:Record<string,number>;
 /** 팀별로 얻은 점수 기록(연습 판 포함): 'play:3:1'처럼 단계:신호 번호:팀 → 점수. −1 정정은 그 팀 기록만 되돌린다. */
 teamHits:Record<string,number>;
 log:FunLogEntry[];
 seed:number;
 /** 어떻게 끝났는지: 시간이 다 됨 / 목표 달성 / 선생님이 끝냄. */
 endedBy:'time'|'goal'|'teacher'|null;
}

export const COMBO_PER_POINT=12,COMBO_MAX=100;
const ORDER:FunPhase[]=['demo','tutorial','play','climax','result'];

/** 같은 seed면 같은 수열(mulberry32). */
export function seededRandom(seed:number):()=>number{
 let a=seed>>>0;
 return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
/**
 * 본게임·마지막 승부마다 깜짝 이벤트가 0~2번 일어날 시점을 정한다.
 * 처음 20%와 마지막 3초에는 일어나지 않고, 두 이벤트 사이는 10초 이상 띄운다. '얼음'은 마지막 승부에 넣지 않는다.
 */
export function scheduleSurprises(seed:number,roundSeconds:number,phase:'play'|'climax'='play',allowed:readonly SurpriseKind[]=SURPRISE_KINDS):ScheduledSurprise[]{
 const rnd=seededRandom(seed*31+(phase==='play'?7:13));
 const lengthMs=roundSeconds*1000,start=lengthMs*0.2,end=lengthMs-3000;
 const kinds=SURPRISE_KINDS.filter(k=>(phase==='play'||k!=='freeze')&&allowed.includes(k));
 if(end-start<4000||!kinds.length)return [];
 const count=Math.floor(rnd()*3);
 const out:ScheduledSurprise[]=[];
 for(let i=0;i<count;i++){
  const atMs=Math.round(start+rnd()*(end-start));
  if(out.some(s=>Math.abs(s.atMs-atMs)<10000))continue;
  out.push({phase,atMs,kind:kinds[Math.floor(rnd()*kinds.length)]});
 }
 return out.sort((a,b)=>a.atMs-b.atMs);
}

/** 게임이 정한 목록(없으면 모두). 마지막 승부에는 '얼음'을 넣지 않는다. */
export function resolveSurprises(allow?:SurpriseAllowance):Record<'play'|'climax',SurpriseKind[]>{
 const pick=(phase:'play'|'climax')=>SURPRISE_KINDS.filter(k=>(allow?.[phase]??SURPRISE_KINDS).includes(k)&&(phase==='play'||k!=='freeze'));
 return {play:pick('play'),climax:pick('climax')};
}
/** 지금 단계에서 일으킬 수 있는 깜짝 이벤트(시범·결과는 없음, 연습 판은 본게임 목록). */
export function surprisesNow(s:FunState):SurpriseKind[]{
 if(s.phase==='climax')return s.allowedSurprises.climax;
 if(s.phase==='play'||s.phase==='tutorial')return s.allowedSurprises.play;
 return [];
}
export function createFunState(opts:{teams:number;timing:FunTiming;seed?:number;skipDemo?:boolean;holdDemo?:boolean;surprises?:SurpriseAllowance}):FunState{
 const teams=Math.min(4,Math.max(1,Math.round(opts.teams)));
 const seed=opts.seed??1;
 const allowedSurprises=resolveSurprises(opts.surprises);
 return {
  teams,scores:Array(teams).fill(0),phase:opts.skipDemo?'tutorial':'demo',paused:false,phaseMs:0,timing:opts.timing,
  cueIndex:0,cueMs:0,cueLenSec:null,combo:0,specials:0,event:null,eventSeq:0,deferred:null,phaseCues:{},holdDemo:!!opts.holdDemo,allowedSurprises,
  surprises:[...scheduleSurprises(seed,opts.timing.play,'play',allowedSurprises.play),...scheduleSurprises(seed,opts.timing.climax,'climax',allowedSurprises.climax)],
  cueHits:{},teamHits:{},log:[],seed,endedBy:null,
 };
}

export const phaseSeconds=(s:FunState,phase:FunPhase=s.phase)=>phase==='result'?0:s.timing[phase];
/** 지금 단계의 남은 초(올림). */
export const secondsLeft=(s:FunState)=>s.phase==='result'?0:Math.max(0,Math.ceil((phaseSeconds(s)*1000-s.phaseMs)/1000));
/**
 * 게임이 엔진에 건네는 선택 규칙(상태에 넣지 않는 함수라 저장·이어 하기와 상관없다).
 * cueSeconds: 지금 신호만 다른 길이로 보여 줄 때(예: '10초 달리기'는 12초). 없으면 게임 기본 간격.
 */
export interface FunHooks {cueSeconds?:(s:FunState)=>number|undefined;
 /** 지금 신호에 이 깜짝 이벤트가 맞는지(아니면 예약된 이벤트는 맞는 신호까지 미룬다). 없으면 늘 맞음. */ allowsEvent?:(s:FunState,kind:SurpriseKind)=>boolean}
/** 지금 신호 간격(ms). 연습 판은 느리게, '빨리빨리!' 동안은 빠르게. cueSeconds를 주면 그 신호만 그 길이로. */
export function cueIntervalMs(s:FunState,cueSeconds?:number):number{
 const base=typeof cueSeconds==='number'&&Number.isFinite(cueSeconds)&&cueSeconds>0?cueSeconds:s.timing.cueSeconds;
 let ms=base*1000;
 if(s.phase==='tutorial')ms*=1.6;
 if(s.event?.kind==='speed')ms/=2;
 return Math.max(1500,ms);
}
export const isScoringPhase=(s:FunState)=>s.phase==='play'||s.phase==='climax';
/** 마지막 10초 강조(마지막 승부에서만). */
export const isFinalCountdown=(s:FunState)=>s.phase==='climax'&&!s.paused&&secondsLeft(s)<=10&&secondsLeft(s)>0;
export const reversed=(s:FunState)=>s.event?.kind==='reverse';
export const frozen=(s:FunState)=>s.event?.kind==='freeze';
export const comboFull=(s:FunState)=>s.combo>=COMBO_MAX;

function enter(s:FunState,phase:FunPhase,text:string):FunState{
 // 보여 준 신호 수: 지금 신호가 한 번도 보이지 않았으면(시간 0ms에서 단계가 끝남) 세지 않는다.
 const shown=s.cueMs>0?s.cueIndex+1:s.cueIndex;
 const next:FunState={...s,phase,phaseMs:0,cueIndex:0,cueMs:0,cueLenSec:null,event:null,deferred:null,phaseCues:{...s.phaseCues,[s.phase]:shown},log:[...s.log,{phase,text}]};
 // 연습 판에서 누른 점수는 본게임에 들어가면 0부터 다시 센다.
 if(phase==='play')return {...next,scores:Array(s.teams).fill(0),combo:0,specials:0,cueHits:{},teamHits:{}};
 return next;
}
const PHASE_TEXT:Record<FunPhase,string>={demo:'시범을 봐요',tutorial:'연습 판 시작',play:'본게임 시작',climax:`${FUN_PHASE_LABEL.climax}!`,result:FUN_PHASE_LABEL.result};
const nextPhase=(p:FunPhase):FunPhase=>ORDER[Math.min(ORDER.length-1,ORDER.indexOf(p)+1)];

function applyScore(s:FunState,team:number,delta:number):FunState{
 if(!Number.isInteger(team)||team<0||team>=s.teams||!Number.isFinite(delta)||delta===0)return s;
 const d=Math.round(delta)*(delta>0&&s.event?.kind==='golden'?2:1);
 const scores=s.scores.map((v,i)=>i===team?v+d:v);
 const combo=d>0?Math.min(COMBO_MAX,s.combo+COMBO_PER_POINT*d):s.combo;
 const key=`${s.phase}:${s.cueIndex}`,tkey=`${key}:${team}`;
 let cueHits=s.cueHits,teamHits:Record<string,number>;
 if(d>0){
  teamHits={...s.teamHits,[tkey]:(s.teamHits[tkey]??0)+d};
  if(isScoringPhase(s))cueHits={...s.cueHits,[key]:(s.cueHits[key]??0)+d};
 }else{
  // −1 정정: 이 팀이 가장 최근에 얻은 신호 점수부터 되돌린다(다른 팀 기록은 그대로). 보스 HP·순서 길이도 함께 돌아간다.
  const back=takeBackTeamHits(s.teamHits,team,-d);
  teamHits=back.teamHits;
  if(back.taken.length){cueHits={...s.cueHits};for(const [k,n] of back.taken){if(!(k in cueHits))continue;cueHits[k]-=n;if(cueHits[k]<=0)delete cueHits[k];}}
 }
 return {...s,scores,combo,cueHits,teamHits};
}
/** 한 팀의 기록에서 최근 신호부터 n점을 되돌린다. taken: 되돌린 '단계:신호 번호'와 점수. */
export function takeBackTeamHits(hits:Readonly<Record<string,number>>,team:number,n:number):{teamHits:Record<string,number>;taken:[string,number][]}{
 const out={...hits},taken:[string,number][]=[];
 const mine=Object.keys(out).filter(k=>k.endsWith(`:${team}`)).sort((a,b)=>hitOrder(b)-hitOrder(a));
 for(const key of mine){
  if(n<=0)break;
  const take=Math.min(n,out[key]);out[key]-=take;n-=take;
  if(out[key]<=0)delete out[key];
  if(take>0)taken.push([key.split(':').slice(0,2).join(':'),take]);
 }
 return {teamHits:out,taken};
}
const PHASE_RANK:Record<string,number>={tutorial:0,play:1,climax:2};
const hitOrder=(key:string)=>{const [p,i]=key.split(':');return (PHASE_RANK[p]??0)*1e6+Number(i);};
/** 최근 신호부터 n점을 되돌린다. 0이 된 신호는 지운다. */
export function takeBackHits(hits:Readonly<Record<string,number>>,n:number):Record<string,number>{
 const out={...hits};
 for(const key of Object.keys(out).sort((a,b)=>hitOrder(b)-hitOrder(a))){
  if(n<=0)break;
  const take=Math.min(n,out[key]);out[key]-=take;n-=take;
  if(out[key]<=0)delete out[key];
 }
 return out;
}
/**
 * 그 신호가 나오기 바로 전의 상태(그 앞 신호들에서 얻은 점수·필살기만). 결과 화면의 'MVP 동작'처럼
 * 지난 신호를 다시 그릴 때 쓴다(보스전: 그때 싸우던 보스의 약점).
 */
export function stateBeforeCue(s:FunState,at:{phase:'tutorial'|'play'|'climax';index:number}):FunState{
 const limit=(PHASE_RANK[at.phase]??0)*1e6+at.index;
 const cueHits=Object.fromEntries(Object.entries(s.cueHits).filter(([k])=>hitOrder(k)<limit));
 // 연습 판 필살기는 본게임에 들어가며 사라지므로 세지 않는다.
 const specials=s.log.filter(e=>e.text===SPECIAL_TEXT&&e.cue!==undefined&&e.phase!=='tutorial'&&(PHASE_RANK[e.phase]??-1)*1e6+e.cue<limit).length;
 return {...s,cueHits,specials};
}
const SPECIAL_TEXT='한 방 공격!';
/** 본게임까지 갔는지(연습만 하고 끝났으면 false: 우승 팀을 정하지 않는다). */
export const reachedPlay=(s:FunState)=>s.log.some(e=>e.phase==='play');
/** 점수·이벤트를 받는 때인지: 일시정지 중·시범·결과에는 받지 않는다. */
export const acceptsPlayInput=(s:FunState)=>!s.paused&&(s.phase==='tutorial'||s.phase==='play'||s.phase==='climax');

/**
 * 게임마다 버튼에 걸어 둔 규칙(예: 기억 릴레이 '성공'은 한 차례에 한 번)을 키보드·리모컨에도 똑같이 적용하는 문지기.
 * 명령을 그대로/바꿔서 돌려주거나, 받지 않을 명령이면 null을 돌려준다.
 */
export type FunCommandGate=(s:FunState,cmd:FunCommand)=>FunCommand|null;
/** 문지기를 지난 뒤 reduce. tick·next 같은 진행 명령은 문지기를 거치지 않는다. */
export function reduceGated(s:FunState,cmd:FunCommand,gate?:FunCommandGate,hooks?:FunHooks):FunState{
 if(gate&&(cmd.type==='score'||cmd.type==='scoreAll'||cmd.type==='event'||cmd.type==='special'||cmd.type==='combo')){
  const passed=gate(s,cmd);
  return passed?reduce(s,passed,hooks):s;
 }
 return reduce(s,cmd,hooks);
}

export function reduce(s:FunState,cmd:FunCommand,hooks?:FunHooks):FunState{
 if(s.phase==='result')return s;
 switch(cmd.type){
  case 'next':return enter(s,nextPhase(s.phase),PHASE_TEXT[nextPhase(s.phase)]);
  case 'end':{
   const ended={...enter(s,'result',PHASE_TEXT.result),endedBy:'teacher' as const};
   // 연습 판·시범에서 끝내면 연습 점수는 결과에 넣지 않는다.
   return isScoringPhase(s)?ended:{...ended,scores:Array(s.teams).fill(0),cueHits:{},teamHits:{},combo:0,specials:0};
  }
  case 'finish':return isScoringPhase(s)?{...enter(s,'result',PHASE_TEXT.result),endedBy:'goal'}:s;
  case 'pause':return s.paused?s:{...s,paused:true};
  case 'resume':return s.paused?{...s,paused:false}:s;
  // 일시정지 중·시범에는 점수·이벤트·필살기를 받지 않는다(버튼이 꺼진 것과 같은 규칙).
  case 'score':return acceptsPlayInput(s)?applyScore(s,cmd.team,cmd.delta):s;
  case 'scoreAll':{if(!acceptsPlayInput(s))return s;let n=s;for(let t=0;t<s.teams;t++)n=applyScore(n,t,cmd.delta);return n;}
  case 'combo':return acceptsPlayInput(s)&&Number.isFinite(cmd.delta)?{...s,combo:Math.max(0,Math.min(COMBO_MAX,s.combo+Math.round(cmd.delta)))}:s;
  case 'special':return acceptsPlayInput(s)&&comboFull(s)?{...s,combo:0,specials:s.specials+1,log:[...s.log,{phase:s.phase,text:SPECIAL_TEXT,cue:s.cueIndex}]}:s;
  case 'event':{
   // 다른 이벤트가 진행 중이면 덮어쓰지 않는다.
   if(!surprisesNow(s).includes(cmd.event)||!acceptsPlayInput(s)||s.event)return s;
   return startEvent(s,cmd.event);
  }
  case 'tick':return tick(s,cmd.ms,hooks);
 }
}

function startEvent(s:FunState,kind:SurpriseKind):FunState{
 const seq=s.eventSeq+1;
 return {...s,eventSeq:seq,event:{kind,leftMs:SURPRISE_INFO[kind].ms,seq},log:[...s.log,{phase:s.phase,text:SURPRISE_INFO[kind].title}]};
}

function tick(s:FunState,ms:number,hooks?:FunHooks):FunState{
 if(s.paused||s.phase==='result'||!Number.isFinite(ms)||ms<=0)return s;
 // 움직임 줄이기: 시범은 선생님이 넘길 때까지 기다린다.
 if(s.phase==='demo'&&s.holdDemo)return s;
 const step=Math.min(ms,1000);
 // 얼음 동안에는 신호 시간이 흐르지 않는다(얼음이 풀리면 그 신호를 이어서 보여 준다).
 let n:FunState={...s,phaseMs:s.phaseMs+step,cueMs:s.cueMs+(frozen(s)?0:step)};
 if(n.event){const leftMs=n.event.leftMs-step;n={...n,event:leftMs>0?{...n.event,leftMs}:null};}
 // 예약된 깜짝 이벤트. 다른 이벤트가 진행 중이면 미뤘다가 끝나자마자 일으킨다(마지막 3초에는 일으키지 않음).
 // 지금 신호에 맞지 않는 이벤트(예: 숫자 카드의 '거꾸로!')도 맞는 신호가 올 때까지 미룬다.
 if(isScoringPhase(n)){
  const fits=(kind:SurpriseKind)=>hooks?.allowsEvent?.(n,kind)??true;
  const due=n.surprises.find(x=>x.phase===n.phase&&x.atMs>s.phaseMs&&x.atMs<=n.phaseMs);
  if(due){if(n.event||!fits(due.kind))n={...n,deferred:due.kind};else n=startEvent(n,due.kind);}
  else if(!n.event&&n.deferred){
   const left=phaseSeconds(n)*1000-n.phaseMs;
   if(left<=3000)n={...n,deferred:null};
   else if(fits(n.deferred))n=startEvent({...n,deferred:null},n.deferred);
  }
 }
 // 신호 길이는 그 신호가 시작될 때 한 번 정한다(신호 도중에 상태가 바뀌어도 길이는 그대로).
 // 얼음 동안에는 정하지 않는다('얼음!' 신호에는 길이가 없어 0으로 굳으면 12초 신호가 6초가 된다).
 if((n.cueLenSec===null||n.cueLenSec===undefined)&&!frozen(n)){const sec=hooks?.cueSeconds?.(n);n={...n,cueLenSec:typeof sec==='number'&&Number.isFinite(sec)&&sec>0?sec:0};}
 // 얼음 동안에는 신호를 넘기지 않는다. 넘길 때 남은 시간은 다음 신호로 이어 준다(틱이 조금씩 늦어도 신호가 밀리지 않는다).
 // 이번 틱에 단계가 끝나면 신호를 넘기지 않는다(단계 끝에서 0초짜리 신호가 '보여 준 신호'로 세지지 않게).
 if(n.phaseMs>=phaseSeconds(n)*1000){const to=nextPhase(n.phase);n=enter(n,to,PHASE_TEXT[to]);if(to==='result')n={...n,endedBy:'time'};return n;}
 if(!frozen(n)){const interval=cueIntervalMs(n,n.cueLenSec||undefined);if(n.cueMs>=interval)n={...n,cueIndex:n.cueIndex+1,cueMs:Math.min(n.cueMs-interval,interval-1),cueLenSec:null};}
 return n;
}

/**
 * 저장해 둔 진행 상태(새로고침 이어 하기)를 검사해 되살린다. 모양이 틀리거나 게임 시간이 바뀌었으면 null.
 * 되살린 판은 일시정지로 시작한다(그사이 흐른 시간은 세지 않고, 선생님이 다시 시작을 누른다).
 */
export function restoreFunState(raw:unknown,expect:{timing:FunTiming;teams:number}):FunState|null{
 if(!raw||typeof raw!=='object')return null;
 const v=raw as Partial<FunState>;
 const num=(x:unknown)=>typeof x==='number'&&Number.isFinite(x);
 const phases:FunPhase[]=['demo','tutorial','play','climax','result'];
 if(v.teams!==expect.teams||!Array.isArray(v.scores)||v.scores.length!==expect.teams||!v.scores.every(num))return null;
 if(!phases.includes(v.phase as FunPhase)||!num(v.phaseMs)||!num(v.cueIndex)||!num(v.cueMs)||!num(v.combo)||!num(v.specials)||!num(v.seed))return null;
 if(!v.timing||JSON.stringify(v.timing)!==JSON.stringify(expect.timing))return null;
 if(!v.cueHits||typeof v.cueHits!=='object'||!Object.values(v.cueHits).every(num))return null;
 if(!Array.isArray(v.log)||!v.log.every(e=>!!e&&typeof e==='object'&&phases.includes((e as FunLogEntry).phase)&&typeof (e as FunLogEntry).text==='string'))return null;
 const kinds=(x:unknown)=>Array.isArray(x)&&x.every(k=>SURPRISE_KINDS.includes(k as SurpriseKind));
 const allowed=v.allowedSurprises as unknown;
 if(!allowed||typeof allowed!=='object'||!kinds((allowed as Record<string,unknown>).play)||!kinds((allowed as Record<string,unknown>).climax))return null;
 if(!Array.isArray(v.surprises)||!v.surprises.every(x=>!!x&&typeof x==='object'&&(x.phase==='play'||x.phase==='climax')&&num(x.atMs)&&SURPRISE_KINDS.includes(x.kind)))return null;
 const teamHits=v.teamHits===undefined?{}:v.teamHits;
 if(!teamHits||typeof teamHits!=='object'||!Object.values(teamHits).every(num))return null;
 const s=v as FunState;
 return {...s,teamHits,eventSeq:num(s.eventSeq)?s.eventSeq:0,deferred:null,phaseCues:s.phaseCues&&typeof s.phaseCues==='object'?s.phaseCues:{},
  cueLenSec:null,event:null,paused:s.phase!=='demo'&&s.phase!=='result',endedBy:s.endedBy??null};
}

/** 리모컨 등 바깥에서 온 값이 올바른 명령인지 검사한다. 틀리면 null. tick은 바깥에서 받지 않는다. */
export function parseFunCommand(raw:unknown):Exclude<FunCommand,{type:'tick'}|{type:'finish'}>|null{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const v=raw as Record<string,unknown>;
 const int=(x:unknown,min:number,max:number)=>typeof x==='number'&&Number.isInteger(x)&&x>=min&&x<=max;
 switch(v.type){
  case 'next':case 'pause':case 'resume':case 'end':case 'special':return {type:v.type};
  case 'score':return int(v.team,0,3)&&int(v.delta,-5,5)&&v.delta!==0?{type:'score',team:v.team as number,delta:v.delta as number}:null;
  case 'scoreAll':return int(v.delta,-5,5)&&v.delta!==0?{type:'scoreAll',delta:v.delta as number}:null;
  case 'combo':return int(v.delta,-100,100)?{type:'combo',delta:v.delta as number}:null;
  case 'event':return SURPRISE_KINDS.includes(v.event as SurpriseKind)?{type:'event',event:v.event as SurpriseKind}:null;
  default:return null;
 }
}

export interface ResultSummary {
 winners:number[];tie:boolean;
 /** 연습 판까지만 하고 끝남: 우승 팀·순위를 보여 주지 않는다. */ practiceOnly:boolean;ranking:{team:number;score:number;rank:number}[];
 /** 점수를 가장 많이 얻은 신호(없으면 null). 모듈이 이 신호의 동작 이름을 MVP 동작으로 보여 준다. */
 mvpCue:{phase:'play'|'climax';index:number}|null;
 conceptLine:string;question:string;nextChallenge:string;
 headline:string;
}
/** 결과 발표 내용. 우승 팀(동점 포함), MVP 신호(가장 많이 성공한 신호 번호), 배운 개념, 돌아보기 질문, 다음 도전. */
export function resultSummary(s:FunState,game:{concept:string;reflection:string;nextChallenge:string}):ResultSummary{
 const max=Math.max(...s.scores);
 const winners=s.scores.map((v,i)=>v===max?i:-1).filter(i=>i>=0);
 const sorted=[...s.scores.keys()].sort((a,b)=>s.scores[b]-s.scores[a]);
 const ranking=sorted.map(team=>({team,score:s.scores[team],rank:1+s.scores.filter(v=>v>s.scores[team]).length}));
 const hits=Object.entries(s.cueHits).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
 const top=hits[0]?.[0].split(':');
 const tie=winners.length>1;
 const practiceOnly=!reachedPlay(s);
 const headline=practiceOnly?'연습만 했어요 · 본게임은 다음에 해요'
  :s.teams===1?`우리 반 ${s.scores[0]}점!`
  :tie?(max===0?(s.endedBy==='teacher'?'여기까지 함께 했어요!':'모두 함께 끝까지 했어요!'):`${winners.map(i=>TEAM_NAMES[i]).join('·')} 공동 우승!`)
  :`${TEAM_NAMES[winners[0]]} 우승!`;
 return {
  winners:practiceOnly?[]:winners,tie:practiceOnly?false:tie,practiceOnly,ranking,mvpCue:top&&(top[0]==='play'||top[0]==='climax')?{phase:top[0],index:Number(top[1])}:null,headline,
  conceptLine:`오늘 우리는 ${withParticle(game.concept,'을를')} 연습했어요.`,
  question:game.reflection,nextChallenge:game.nextChallenge,
 };
}
