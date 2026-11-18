import {AVAILABLE_GAMES,type GameDef} from './gamesData';
import {activityFit,FIT_SPACES,type FitSpace} from './activityFit';
import {READY_SIGNATURE_GAMES,type SignatureGameDef} from './signatureGames';

/**
 * '오늘 수업' 40분 묶음: 준비운동 → 대표 게임(본게임) → 정리운동 → 돌아보기를 학년·공간·시간에 맞춰 한 번에 짠다.
 * 화면과 상관없는 순수 함수만 둔다. 같은 설정과 같은 seed면 늘 같은 묶음이 나온다.
 */
export type TodayGrade='1~2학년'|'3~4학년군'|'5~6학년군';
export const TODAY_GRADES:readonly {id:TodayGrade;label:string}[]=[{id:'1~2학년',label:'1~2학년'},{id:'3~4학년군',label:'3~4학년'},{id:'5~6학년군',label:'5~6학년'}];
export const TODAY_SPACES:readonly FitSpace[]=FIT_SPACES;
export const TODAY_MINUTES=[30,40,45] as const;
export type TodayMinutes=typeof TODAY_MINUTES[number];
export const TODAY_TEAMS=[2,3,4] as const;

export interface TodaySettings {grade:TodayGrade;space:FitSpace;minutes:TodayMinutes;teams:number;mainId?:string}
export const DEFAULT_TODAY:TodaySettings={grade:'3~4학년군',space:FIT_SPACES[0],minutes:40,teams:2};

export type TodayStageKind='warmup'|'main'|'cooldown'|'reflect';
export const STAGE_LABEL:Record<TodayStageKind,string>={warmup:'준비운동',main:'본게임',cooldown:'정리운동',reflect:'돌아보기'};
export interface TodayStage {kind:TodayStageKind;minutes:number;title:string;
 /** 활동 화면으로 여는 단계의 활동 id. 돌아보기는 없다. */ gameId?:string;emoji:string;
 /** 이 단계에서 선생님이 읽어 줄 한 줄 안내. */ note:string}
export interface TodayPlan {settings:TodaySettings;seed:number;stages:TodayStage[];reflection:string}

/** 단계별 시간(분). 본게임이 가장 길고, 총합은 늘 고른 시간과 같다. */
export const STAGE_MINUTES:Record<TodayMinutes,Record<TodayStageKind,number>>={
 30:{warmup:5,main:18,cooldown:5,reflect:2},
 40:{warmup:6,main:25,cooldown:6,reflect:3},
 45:{warmup:7,main:28,cooldown:7,reflect:3},
};

/** 준비운동 후보: 반 전체가 TV 한 대로 바로 할 수 있는 짧은 신체 놀이. */
export const WARMUP_IDS=['phone-play-010','phone-play-031','phone-play-066','phone-play-104','phone-play-102','weather_dance','seed_sprout'] as const;
/** 정리운동 후보: 숨을 고르고 몸을 천천히 푸는 활동. */
export const COOLDOWN_IDS=['phone-play-093','phone-play-094','phone-play-097','phone-play-099','breath-pacer-478','stretch'] as const;

const SIG_SPACE:Record<FitSpace,readonly string[]>={[FIT_SPACES[0]]:['교실'],[FIT_SPACES[1]]:['체육관','다목적실'],[FIT_SPACES[2]]:['운동장']};

const BY_ID=new Map(AVAILABLE_GAMES.map(g=>[g.type,g]));
const fitsGrade=(g:GameDef,grade:TodayGrade)=>!g.grades?.length||g.grades.includes(grade);
const fitsSpace=(g:GameDef,space:FitSpace)=>activityFit(g).spaces.includes(space);
/** 준비·정리운동 후보 가운데 학년과 공간이 맞는 활동. */
export function stageCandidates(kind:'warmup'|'cooldown',grade:TodayGrade,space:FitSpace):GameDef[]{
 const ids=kind==='warmup'?WARMUP_IDS:COOLDOWN_IDS;
 return ids.map(id=>BY_ID.get(id)).filter((g):g is GameDef=>!!g&&fitsGrade(g,grade)&&fitsSpace(g,space));
}
/** 본게임 후보: 학년과 공간이 맞는 대표 게임. */
export function mainCandidates(grade:TodayGrade,space:FitSpace):SignatureGameDef[]{
 return READY_SIGNATURE_GAMES.filter(g=>g.grades.includes(grade)&&g.spaces.some(s=>SIG_SPACE[space].includes(s)));
}

/** seed로 고르는 작은 난수(같은 seed면 같은 결과). */
const pick=<T,>(list:readonly T[],seed:number,salt:number):T|undefined=>{
 if(!list.length)return undefined;
 let x=(seed^Math.imul(salt+1,0x9e3779b1))>>>0;x=Math.imul(x^(x>>>16),0x45d9f3b)>>>0;x=(x^(x>>>16))>>>0;
 return list[x%list.length];
};

export const DEFAULT_REFLECTION='오늘 가장 즐거웠던 순간은 언제였나요? 친구에게 고마웠던 일을 하나 말해 볼까요?';

export function buildTodayPlan(settings:TodaySettings,seed:number):TodayPlan{
 const {grade,space,minutes}=settings;
 const m=STAGE_MINUTES[minutes];
 const warm=pick(stageCandidates('warmup',grade,space),seed,1)??BY_ID.get('stretch');
 const cool=pick(stageCandidates('cooldown',grade,space),seed,3)??BY_ID.get('stretch');
 const mains=mainCandidates(grade,space);
 const main=(settings.mainId?mains.find(g=>g.id===settings.mainId):undefined)??pick(mains,seed,2)??READY_SIGNATURE_GAMES[0];
 const reflection=main?.reflection||DEFAULT_REFLECTION;
 const stages:TodayStage[]=[];
 if(warm)stages.push({kind:'warmup',minutes:m.warmup,title:warm.name,gameId:warm.type,emoji:warm.emoji||'🔥',note:'몸을 깨워요. 넓게 흩어져 천천히 시작해요.'});
 if(main)stages.push({kind:'main',minutes:m.main,title:main.name,gameId:main.id,emoji:main.emoji,note:`${main.oneLine} 시간이 남으면 '한 판 더'로 이어 해요.`});
 if(cool)stages.push({kind:'cooldown',minutes:m.cooldown,title:cool.name,gameId:cool.type,emoji:cool.emoji||'🌙',note:'숨을 고르고 몸을 천천히 풀어요.'});
 stages.push({kind:'reflect',minutes:m.reflect,title:'오늘 수업 돌아보기',emoji:'💬',note:reflection});
 return {settings,seed,stages,reflection};
}

/** 단계 하나의 결과: 다 했어요 / 건너뛰었어요. 걸린 시간(초)을 함께 남긴다. */
export interface TodayStageResult {status:'done'|'skipped';seconds:number}
/**
 * recordsSince: 이 수업의 판·반응을 찾을 때 쓰는 시작 시각. '이어 하기'로 startedAt(표시용)을 당겨도 처음 시작한 때를 지킨다.
 * stagePlays: 끝 화면에서 단계마다 반응을 붙일 판 id. 한 번 정하면 그대로 두어, 다시 누르거나 새로고침해도 같은 판의 반응만 바뀐다.
 */
export interface TodayRun {plan:TodayPlan;index:number;startedAt:number;stageStartedAt:number;results:TodayStageResult[];finishedAt?:number;recordsSince?:number;stagePlays?:string[]}
/** 이 수업의 판·반응을 찾는 시작 시각. */
export const recordsSince=(run:TodayRun)=>run.recordsSince??run.startedAt;

export function startRun(plan:TodayPlan,now:number):TodayRun{return {plan,index:0,startedAt:now,stageStartedAt:now,results:[]};}
/** 지금 단계를 마치고(또는 건너뛰고) 다음 단계로 간다. 마지막 단계 뒤에는 finishedAt이 생긴다. */
export function advanceRun(run:TodayRun,status:'done'|'skipped',now:number):TodayRun{
 if(run.finishedAt!==undefined||run.index>=run.plan.stages.length)return run;
 const seconds=Math.max(0,Math.round((now-run.stageStartedAt)/1000));
 const results=[...run.results,{status,seconds}];
 const index=run.index+1;
 return {...run,index,results,stageStartedAt:now,finishedAt:index>=run.plan.stages.length?now:undefined};
}
export const currentStage=(run:TodayRun):TodayStage|undefined=>run.finishedAt===undefined?run.plan.stages[run.index]:undefined;
/** 활동 화면 주소. 활동을 마치고 나가면 '오늘 수업'으로 돌아온다. */
export function stagePath(stage:TodayStage,teams:number):string|undefined{
 if(!stage.gameId)return undefined;
 const q=new URLSearchParams({returnTo:'/today'});
 if(stage.kind==='main')q.set('teams',String(teams));
 return `/play/${stage.gameId}?${q.toString()}`;
}

const isTime=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>0;
/** sessionStorage에서 읽은 값이 올바른 진행 상태인지 확인한다(새로고침 이어 하기). */
export function parseRun(raw:unknown):TodayRun|null{
 if(!raw||typeof raw!=='object')return null;
 const r=raw as Partial<TodayRun>;
 const p=r.plan as Partial<TodayPlan>|undefined;
 if(!p||!Array.isArray(p.stages)||!p.stages.length||typeof p.seed!=='number'||!p.settings)return null;
 if(typeof r.index!=='number'||!Number.isInteger(r.index)||r.index<0||r.index>p.stages.length)return null;
 if(!isTime(r.startedAt)||!isTime(r.stageStartedAt)||!Array.isArray(r.results))return null;
 if(r.results.length!==r.index)return null;
 if(!r.results.every(x=>!!x&&(x.status==='done'||x.status==='skipped')&&typeof x.seconds==='number'&&Number.isFinite(x.seconds)&&x.seconds>=0))return null;
 // 끝 표시와 단계 위치가 서로 맞아야 한다: 마지막 단계 뒤면 끝난 수업, 아니면 진행 중.
 if(r.finishedAt!==undefined&&(!isTime(r.finishedAt)||r.finishedAt<r.startedAt))return null;
 if(r.recordsSince!==undefined&&(!isTime(r.recordsSince)||r.recordsSince>r.startedAt))return null;
 if(r.stagePlays!==undefined&&(!Array.isArray(r.stagePlays)||r.stagePlays.length!==p.stages.length||!r.stagePlays.every(x=>typeof x==='string'&&x.length<=64)))return null;
 if((r.index===p.stages.length)!==(r.finishedAt!==undefined))return null;
 const st=p.settings as Partial<TodaySettings>;
 if(!TODAY_GRADES.some(g=>g.id===st.grade)||!TODAY_SPACES.includes(st.space as FitSpace)||!(TODAY_MINUTES as readonly number[]).includes(st.minutes as number))return null;
 if(typeof st.teams!=='number'||!(TODAY_TEAMS as readonly number[]).includes(st.teams))return null;
 if(st.mainId!==undefined&&typeof st.mainId!=='string')return null;
 const kinds:TodayStageKind[]=['warmup','main','cooldown','reflect'];
 for(const s of p.stages){if(!s||!kinds.includes(s.kind as TodayStageKind)||typeof s.minutes!=='number'||!Number.isFinite(s.minutes)||s.minutes<=0||typeof s.title!=='string')return null;if(s.gameId!==undefined&&!BY_ID.has(s.gameId)&&!READY_SIGNATURE_GAMES.some(g=>g.id===s.gameId))return null;}
 return r as TodayRun;
}
export const formatSeconds=(sec:number)=>sec<60?`${sec}초`:`${Math.floor(sec/60)}분${sec%60?` ${sec%60}초`:''}`;

/** 두 시각이 같은 날(이 기기의 지역 날짜)인지. */
export const sameLocalDay=(a:number,b:number)=>new Date(a).toDateString()===new Date(b).toDateString();
/** 다른 날 시작한 수업인지(교실 PC 탭을 켜 둔 채 다음 날 연 경우). */
export const isStaleRun=(run:TodayRun,now:number)=>!sameLocalDay(run.startedAt,now);
/**
 * 어제 수업을 오늘 이어 한다. 이미 한 단계의 걸린 시간은 그대로 두고, 밤사이 흐른 시간은 빼서
 * 지금 단계는 지금부터, 전체 시간은 한 단계들의 합부터 다시 센다('1400분' 같은 값이 나오지 않게).
 */
export function resumeRun(run:TodayRun,now:number):TodayRun{
 const spent=run.results.reduce((a,r)=>a+r.seconds,0)*1000;
 // 한 단계를 아주 오래 띄워 둔 수업도 오늘 수업으로 보이게, 표시용 시작 시각은 오늘 0시보다 앞서지 않는다(이어 하기 안내가 되풀이되지 않게).
 const day=new Date(now);day.setHours(0,0,0,0);
 return {...run,recordsSince:recordsSince(run),startedAt:Math.max(now-spent,day.getTime()),stageStartedAt:now};
}
/** 수업에 걸린 시간(초): 단계마다 걸린 시간의 합. 밤사이 흐른 시간은 들어가지 않는다. */
export const runSeconds=(run:TodayRun)=>run.results.reduce((a,r)=>a+r.seconds,0);

/**
 * 끝 화면에 보여 줄 단계 결과.
 * - played: 활동을 열어 결과까지 기록했어요(돌아보기는 '마치기'를 누르면 played)
 * - passed: 활동을 열지 않았거나 기록 없이 '다음 단계'로 넘겼어요
 * - skipped: 건너뛰었어요
 * recorded(gameId): 수업 시간 안에 그 활동을 기록한 판이 있는지.
 */
export type StageOutcome='played'|'passed'|'skipped';
export function stageOutcomes(run:TodayRun,recorded:(gameId:string)=>boolean):StageOutcome[]{
 return run.plan.stages.map((s,i)=>{
  const r=run.results[i];
  // 결과를 기록한 활동은 '건너뛰기'로 나갔어도 한 것으로 본다.
  if(s.gameId&&recorded(s.gameId))return 'played';
  if(!r||r.status==='skipped')return 'skipped';
  return s.gameId?'passed':'played';
 });
}

/** 끝 화면 반응 칸의 판 id(그 활동에 남긴 판이 없을 때). 같은 수업·같은 단계면 늘 같아서 새로고침해도 표가 두 번 쌓이지 않는다. */
export const summaryPlayId=(run:TodayRun,index:number)=>`today-${recordsSince(run).toString(36)}-${index}`;
/**
 * 끝 화면에서 단계마다 반응을 붙일 판 id를 한 번 정한다(이미 정했으면 그대로).
 * lookup(gameId): 수업 중 그 활동에 남긴 판(기록한 판, 없으면 반응만 누른 판). 없으면 이 수업·이 단계로 정해지는 id.
 * 돌아보기처럼 활동이 없는 단계는 빈 문자열.
 */
export function bindStagePlays(run:TodayRun,lookup:(gameId:string)=>string|undefined):TodayRun{
 if(run.stagePlays?.length===run.plan.stages.length)return run;
 return {...run,stagePlays:run.plan.stages.map((s,i)=>s.gameId?lookup(s.gameId)??summaryPlayId(run,i):'')};
}
