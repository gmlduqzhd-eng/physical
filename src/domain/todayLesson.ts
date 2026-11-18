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
export interface TodayRun {plan:TodayPlan;index:number;startedAt:number;stageStartedAt:number;results:TodayStageResult[];finishedAt?:number}

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

/** sessionStorage에서 읽은 값이 올바른 진행 상태인지 확인한다(새로고침 이어 하기). */
export function parseRun(raw:unknown):TodayRun|null{
 if(!raw||typeof raw!=='object')return null;
 const r=raw as Partial<TodayRun>;
 const p=r.plan as Partial<TodayPlan>|undefined;
 if(!p||!Array.isArray(p.stages)||!p.stages.length||typeof p.seed!=='number'||!p.settings)return null;
 if(typeof r.index!=='number'||r.index<0||r.index>p.stages.length)return null;
 if(typeof r.startedAt!=='number'||typeof r.stageStartedAt!=='number'||!Array.isArray(r.results))return null;
 if(r.results.length!==Math.min(r.index,p.stages.length))return null;
 const kinds:TodayStageKind[]=['warmup','main','cooldown','reflect'];
 for(const s of p.stages){if(!s||!kinds.includes(s.kind as TodayStageKind)||typeof s.minutes!=='number'||typeof s.title!=='string')return null;if(s.gameId!==undefined&&!BY_ID.has(s.gameId)&&!READY_SIGNATURE_GAMES.some(g=>g.id===s.gameId))return null;}
 return r as TodayRun;
}
export const formatSeconds=(sec:number)=>sec<60?`${sec}초`:`${Math.floor(sec/60)}분${sec%60?` ${sec%60}초`:''}`;
