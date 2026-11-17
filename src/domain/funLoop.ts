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
 |{type:'score';team:number;delta:number}
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
export interface FunLogEntry {phase:FunPhase;text:string}
export interface FunState {
 teams:number;scores:number[];phase:FunPhase;paused:boolean;
 /** 지금 단계에서 흐른 시간(ms). */ phaseMs:number;
 timing:FunTiming;
 /** 신호 번호. 신호 간격마다 1씩 늘고, 단계가 바뀌면 0으로 돌아간다. */ cueIndex:number;cueMs:number;
 combo:number;specials:number;
 event:{kind:SurpriseKind;leftMs:number}|null;
 surprises:ScheduledSurprise[];
 /** 신호마다 얻은 점수(MVP 동작 고르기용): 'play:3'처럼 단계:신호 번호 → 점수 */
 cueHits:Record<string,number>;
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
export function scheduleSurprises(seed:number,roundSeconds:number,phase:'play'|'climax'='play'):ScheduledSurprise[]{
 const rnd=seededRandom(seed*31+(phase==='play'?7:13));
 const lengthMs=roundSeconds*1000,start=lengthMs*0.2,end=lengthMs-3000;
 if(end-start<4000)return [];
 const count=Math.floor(rnd()*3);
 const kinds=SURPRISE_KINDS.filter(k=>phase==='play'||k!=='freeze');
 const out:ScheduledSurprise[]=[];
 for(let i=0;i<count;i++){
  const atMs=Math.round(start+rnd()*(end-start));
  if(out.some(s=>Math.abs(s.atMs-atMs)<10000))continue;
  out.push({phase,atMs,kind:kinds[Math.floor(rnd()*kinds.length)]});
 }
 return out.sort((a,b)=>a.atMs-b.atMs);
}

export function createFunState(opts:{teams:number;timing:FunTiming;seed?:number;skipDemo?:boolean}):FunState{
 const teams=Math.min(4,Math.max(1,Math.round(opts.teams)));
 const seed=opts.seed??1;
 return {
  teams,scores:Array(teams).fill(0),phase:opts.skipDemo?'tutorial':'demo',paused:false,phaseMs:0,timing:opts.timing,
  cueIndex:0,cueMs:0,combo:0,specials:0,event:null,
  surprises:[...scheduleSurprises(seed,opts.timing.play,'play'),...scheduleSurprises(seed,opts.timing.climax,'climax')],
  cueHits:{},log:[],seed,endedBy:null,
 };
}

export const phaseSeconds=(s:FunState,phase:FunPhase=s.phase)=>phase==='result'?0:s.timing[phase];
/** 지금 단계의 남은 초(올림). */
export const secondsLeft=(s:FunState)=>s.phase==='result'?0:Math.max(0,Math.ceil((phaseSeconds(s)*1000-s.phaseMs)/1000));
/** 지금 신호 간격(ms). 연습 판은 느리게, '빨리빨리!' 동안은 빠르게. */
export function cueIntervalMs(s:FunState):number{
 let ms=s.timing.cueSeconds*1000;
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
 const next:FunState={...s,phase,phaseMs:0,cueIndex:0,cueMs:0,event:null,log:[...s.log,{phase,text}]};
 // 연습 판에서 누른 점수는 본게임에 들어가면 0부터 다시 센다.
 if(phase==='play')return {...next,scores:Array(s.teams).fill(0),combo:0,specials:0,cueHits:{}};
 return next;
}
const PHASE_TEXT:Record<FunPhase,string>={demo:'시범을 봐요',tutorial:'연습 판 시작',play:'본게임 시작',climax:'마지막 승부!',result:'결과 발표'};
const nextPhase=(p:FunPhase):FunPhase=>ORDER[Math.min(ORDER.length-1,ORDER.indexOf(p)+1)];

function applyScore(s:FunState,team:number,delta:number):FunState{
 if(!Number.isInteger(team)||team<0||team>=s.teams||!Number.isFinite(delta)||delta===0)return s;
 const d=Math.round(delta)*(delta>0&&s.event?.kind==='golden'?2:1);
 const scores=s.scores.map((v,i)=>i===team?v+d:v);
 const combo=d>0?Math.min(COMBO_MAX,s.combo+COMBO_PER_POINT*d):s.combo;
 const key=`${s.phase}:${s.cueIndex}`;
 const cueHits=d>0&&isScoringPhase(s)?{...s.cueHits,[key]:(s.cueHits[key]??0)+d}:s.cueHits;
 return {...s,scores,combo,cueHits};
}

export function reduce(s:FunState,cmd:FunCommand):FunState{
 if(s.phase==='result')return s;
 switch(cmd.type){
  case 'next':return enter(s,nextPhase(s.phase),PHASE_TEXT[nextPhase(s.phase)]);
  case 'end':return {...enter(s,'result',PHASE_TEXT.result),endedBy:'teacher'};
  case 'finish':return isScoringPhase(s)?{...enter(s,'result',PHASE_TEXT.result),endedBy:'goal'}:s;
  case 'pause':return s.paused?s:{...s,paused:true};
  case 'resume':return s.paused?{...s,paused:false}:s;
  case 'score':return applyScore(s,cmd.team,cmd.delta);
  case 'scoreAll':{let n=s;for(let t=0;t<s.teams;t++)n=applyScore(n,t,cmd.delta);return n;}
  case 'combo':return Number.isFinite(cmd.delta)?{...s,combo:Math.max(0,Math.min(COMBO_MAX,s.combo+Math.round(cmd.delta)))}:s;
  case 'special':return comboFull(s)?{...s,combo:0,specials:s.specials+1,log:[...s.log,{phase:s.phase,text:'필살기!'}]}:s;
  case 'event':{
   if(!SURPRISE_KINDS.includes(cmd.event)||s.phase==='demo')return s;
   return {...s,event:{kind:cmd.event,leftMs:SURPRISE_INFO[cmd.event].ms},log:[...s.log,{phase:s.phase,text:SURPRISE_INFO[cmd.event].title}]};
  }
  case 'tick':return tick(s,cmd.ms);
 }
}

function tick(s:FunState,ms:number):FunState{
 if(s.paused||s.phase==='result'||!Number.isFinite(ms)||ms<=0)return s;
 const step=Math.min(ms,1000);
 let n:FunState={...s,phaseMs:s.phaseMs+step,cueMs:s.cueMs+step};
 if(n.event){const leftMs=n.event.leftMs-step;n={...n,event:leftMs>0?{...n.event,leftMs}:null};}
 // 예약된 깜짝 이벤트
 if(isScoringPhase(n)){
  const due=n.surprises.find(x=>x.phase===n.phase&&x.atMs>s.phaseMs&&x.atMs<=n.phaseMs);
  if(due&&!n.event)n=reduce(n,{type:'event',event:due.kind});
 }
 // 얼음 동안에는 신호를 넘기지 않는다.
 if(!frozen(n)&&n.cueMs>=cueIntervalMs(n))n={...n,cueIndex:n.cueIndex+1,cueMs:0};
 if(n.phaseMs>=phaseSeconds(n)*1000){const to=nextPhase(n.phase);n=enter(n,to,PHASE_TEXT[to]);if(to==='result')n={...n,endedBy:'time'};}
 return n;
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
 winners:number[];tie:boolean;ranking:{team:number;score:number;rank:number}[];
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
 const headline=s.teams===1?`우리 반 ${s.scores[0]}점!`:tie?(max===0?'모두 함께 끝까지 했어요!':`${winners.map(i=>TEAM_NAMES[i]).join('·')} 공동 우승!`):`${TEAM_NAMES[winners[0]]} 우승!`;
 return {
  winners,tie,ranking,mvpCue:top&&(top[0]==='play'||top[0]==='climax')?{phase:top[0],index:Number(top[1])}:null,headline,
  conceptLine:`오늘 우리는 ${withParticle(game.concept,'을를')} 연습했어요.`,
  question:game.reflection,nextChallenge:game.nextChallenge,
 };
}
