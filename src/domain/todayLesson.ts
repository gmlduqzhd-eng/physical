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
export const COOLDOWN_IDS=['phone-play-093','phone-play-094','phone-play-097','phone-play-099','stretch'] as const;

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

/** 기기 시계 기준 오늘 날짜 키(예: 2026-11-22). */
export function localDayKey(now:number):string{const d=new Date(now);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

/**
 * 같은 날·같은 설정이면 늘 같은 수업 계획이 나오게 하는 씨앗값.
 * 집에서 미리 본 계획과 교실에서 여는 계획이 같다. 바꾸고 싶으면 '다른 활동으로'(shuffle+1)로만 바꾼다.
 */
export function todaySeed(day:string,settings:TodaySettings,shuffle=0):number{
 const text=`${day}|${settings.grade}|${settings.space}|${settings.minutes}|${settings.teams}|${shuffle}`;
 let h=2166136261;
 for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
 return (h>>>0)%1e9;
}

/** 저장해 둔 '오늘 수업' 설정을 읽는다. 알 수 없는 값은 기본값으로 돌린다(본게임 고르기는 저장하지 않는다). */
export function parseTodaySettings(raw:unknown):TodaySettings{
 const v=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>;
 const grade=TODAY_GRADES.some(g=>g.id===v.grade)?v.grade as TodayGrade:DEFAULT_TODAY.grade;
 const space=(TODAY_SPACES as readonly unknown[]).includes(v.space)?v.space as FitSpace:DEFAULT_TODAY.space;
 const minutes=(TODAY_MINUTES as readonly unknown[]).includes(v.minutes)?v.minutes as TodayMinutes:DEFAULT_TODAY.minutes;
 const teams=(TODAY_TEAMS as readonly unknown[]).includes(v.teams)?v.teams as number:DEFAULT_TODAY.teams;
 return {grade,space,minutes,teams};
}

/** 단계 하나의 결과: 다 했어요 / 건너뛰었어요. 걸린 시간(초)을 함께 남긴다. */
export interface TodayStageResult {status:'done'|'skipped';seconds:number}
/**
 * recordsSince: 이 수업의 판·반응을 찾을 때 쓰는 시작 시각. '이어 하기'로 startedAt(표시용)을 당겨도 처음 시작한 때를 지킨다.
 * stagePlays: 끝 화면에서 단계마다 반응을 붙일 판 id. 한 번 정하면 그대로 두어, 다시 누르거나 새로고침해도 같은 판의 반응만 바뀐다.
 * extraMains: 본게임 단계에서 '다른 대표 게임으로 한 판 더'로 연 대표 게임(연 순서대로, 겹치지 않게). 이 게임들도 본게임으로 친다.
 * extraPlays: 끝 화면에서 extraMains마다 반응을 붙일 판 id(extraMains와 같은 순서·같은 길이).
 */
export interface TodayRun {plan:TodayPlan;index:number;startedAt:number;stageStartedAt:number;results:TodayStageResult[];finishedAt?:number;recordsSince?:number;stagePlays?:string[];extraMains?:string[];extraPlays?:string[];
 /** 비가 와서 교실로 바꾼 수업이면 원래 본게임 id(끝 화면에 '교실로 바꿨어요'를 적는다). */ rainFrom?:string}
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

/** '한 판 더'로 열 수 있는 대표 게임 수의 상한(저장 값이 끝없이 길어지지 않게). */
export const MAX_EXTRA_MAINS=6;
const isMainId=(id:unknown):id is string=>typeof id==='string'&&READY_SIGNATURE_GAMES.some(g=>g.id===id);
/** 본게임 단계에서 다른 대표 게임으로 한 판 더 할 때 그 게임을 수업에 적어 둔다(이미 있거나 본게임 단계가 아니면 그대로). */
export function addExtraMain(run:TodayRun,gameId:string):TodayRun{
 const stage=currentStage(run);
 const extras=run.extraMains??[];
 if(stage?.kind!=='main'||gameId===stage.gameId||!isMainId(gameId)||extras.includes(gameId)||extras.length>=MAX_EXTRA_MAINS)return run;
 return {...run,extraMains:[...extras,gameId]};
}
/** i번째 단계에서 한 활동들: 본게임은 계획한 게임 + '한 판 더'로 연 다른 대표 게임. */
export function stageGameIds(run:TodayRun,i:number):string[]{
 const s=run.plan.stages[i];
 if(!s?.gameId)return [];
 return s.kind==='main'?[s.gameId,...(run.extraMains??[])]:[s.gameId];
}
/** 지금 단계의 활동인지(본게임 단계면 '한 판 더'로 연 다른 대표 게임도). */
export function isStageGame(run:TodayRun,gameId:string):boolean{
 if(run.finishedAt!==undefined)return false;
 return stageGameIds(run,run.index).includes(gameId);
}
const SIG_NAME=new Map<string,SignatureGameDef>(READY_SIGNATURE_GAMES.map(g=>[g.id,g]));
/**
 * 단계 이름: 본게임에 다른 대표 게임을 더 했으면 '신호 대장 + 우리 반 보스전'처럼 함께 적는다.
 * shown(gameId): 실제로 한(기록했거나 반응을 남긴) 게임만 이름에 넣는다. '한 판 더' 링크를 눌렀다가 바로 나온 게임은 빼려고 쓴다.
 */
export function stageTitle(run:TodayRun,i:number,shown:(gameId:string)=>boolean=()=>true):string{
 const s=run.plan.stages[i];
 if(!s)return '';
 const extras=s.kind==='main'?(run.extraMains??[]).filter(shown):[];
 if(!extras.length)return s.title;
 return [s.title,...extras.map(id=>SIG_NAME.get(id)?.name??id)].join(' + ');
}
/**
 * i번째 단계의 시간 창(ms). 단계마다 남긴 걸린 시간을 지금 단계 시작 시각에서 거꾸로 빼서 구한다(1초 반올림 여유를 둔다).
 * 지금 단계는 끝이 없다(Infinity). 아직 오지 않은 단계는 null.
 * '이어 하기'로 하루를 넘긴 수업은 지난 단계의 창이 오늘로 옮겨져 잡히므로, 시작은 recordsSince보다 앞서지 않게만 맞춘다.
 */
export function stageWindow(run:TodayRun,i:number):{from:number;to:number}|null{
 if(i<0||i>=run.plan.stages.length||i>run.index)return null;
 const back=(k:number)=>run.results.slice(k,run.index).reduce((a,r)=>a+r.seconds,0)*1000;
 const from=Math.max(recordsSince(run),run.stageStartedAt-back(i)-1000);
 if(i===run.index)return {from,to:Infinity};
 return {from,to:from+(run.results[i]?.seconds??0)*1000+2000};
}
/**
 * 수업 중 활동 목록에서 직접 연 다른 대표 게임도, 본게임 단계 시간 안에 기록했으면 '한 판 더'로 한 게임처럼 센다.
 * (그래야 단계 화면의 'N판 했어요'와 끝 화면의 단계 이름·반응 칸이 같은 판을 센다.) 새로 찾은 게임이 없으면 같은 객체를 돌려준다.
 */
export function withRecordedExtras(run:TodayRun,plays:readonly {id:string;at:number}[]):TodayRun{
 const m=run.plan.stages.findIndex(s=>s.kind==='main');
 const stage=run.plan.stages[m],win=stageWindow(run,m);
 if(!stage||!win)return run;
 const extras=[...(run.extraMains??[])],before=extras.length;
 for(const x of [...plays].sort((a,b)=>a.at-b.at)){
  if(x.at<win.from||x.at>win.to||x.id===stage.gameId||!isMainId(x.id)||extras.includes(x.id)||extras.length>=MAX_EXTRA_MAINS)continue;
  extras.push(x.id);
 }
 return extras.length===before?run:{...run,extraMains:extras};
}
/** 게임 id의 이름과 그림(끝 화면 반응 칸 제목). */
export const mainGameLabel=(id:string)=>{const g=SIG_NAME.get(id);return g?`${g.emoji} ${g.name}`:id;};

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
 if(r.extraMains!==undefined&&(!Array.isArray(r.extraMains)||r.extraMains.length>MAX_EXTRA_MAINS||!r.extraMains.every(isMainId)||new Set(r.extraMains).size!==r.extraMains.length))return null;
 if(r.extraPlays!==undefined&&(!Array.isArray(r.extraPlays)||r.extraPlays.length!==(r.extraMains?.length??0)||!r.extraPlays.every(x=>typeof x==='string'&&x.length>0&&x.length<=64)))return null;
 if(r.rainFrom!==undefined&&!isMainId(r.rainFrom))return null;
 if((r.index===p.stages.length)!==(r.finishedAt!==undefined))return null;
 const st=p.settings as Partial<TodaySettings>;
 if(!TODAY_GRADES.some(g=>g.id===st.grade)||!TODAY_SPACES.includes(st.space as FitSpace)||!(TODAY_MINUTES as readonly number[]).includes(st.minutes as number))return null;
 if(typeof st.teams!=='number'||!(TODAY_TEAMS as readonly number[]).includes(st.teams))return null;
 if(st.mainId!==undefined&&typeof st.mainId!=='string')return null;
 const kinds:TodayStageKind[]=['warmup','main','cooldown','reflect'];
 for(const s of p.stages){if(!s||!kinds.includes(s.kind as TodayStageKind)||typeof s.minutes!=='number'||!Number.isFinite(s.minutes)||s.minutes<=0||typeof s.title!=='string')return null;if(s.gameId!==undefined&&!BY_ID.has(s.gameId)&&!READY_SIGNATURE_GAMES.some(g=>g.id===s.gameId))return null;}
 return r as TodayRun;
}
/** 수업 순서 줄에 적는 계획 시간. 준비·정리운동은 한 번이 2~3분이라 되풀이해야 계획 시간이 찬다는 것을 함께 알린다. */
export function stagePlanText(stage:TodayStage):string{
 if(stage.kind==='main')return `여러 판 · 약 ${stage.minutes}분`;
 if(stage.kind==='reflect')return `약 ${stage.minutes}분`;
 return `2~3번 되풀이 · 약 ${stage.minutes}분`;
}
/** 지금 단계를 시작한 지 몇 분째인지(1분째부터 센다). */
export const stageMinute=(run:TodayRun,now:number)=>Math.max(1,Math.floor(Math.max(0,now-run.stageStartedAt)/60000)+1);
/** 본게임 단계에서 '다른 대표 게임으로 한 판 더'에 보여 줄 게임(지금 게임 빼고, 학년·공간이 맞는 것). */
export function otherMains(run:TodayRun,limit=3):SignatureGameDef[]{
 const stage=currentStage(run);
 if(stage?.kind!=='main')return [];
 const {grade,space}=run.plan.settings;
 return mainCandidates(grade,space).filter(g=>g.id!==stage.gameId).slice(0,limit);
}
/* ── 비 오는 날: 진행 중인 수업을 실내로 ── */
export const CLASSROOM_SPACE:FitSpace=FIT_SPACES[0];
export const GYM_SPACE:FitSpace=FIT_SPACES[1];
const mainIndexOf=(run:TodayRun)=>run.plan.stages.findIndex(s=>s.kind==='main');
/** 수업 시작부터 지난 시간을 빼고 남은 계획 시간(분). */
export const remainingMinutes=(run:TodayRun,now:number)=>Math.max(0,Math.round(run.plan.settings.minutes-(now-run.startedAt)/60000));
/** 옮겨 갈 수 있는 실내: 운동장이면 체육관·강당 또는 교실, 체육관이면 교실. 본게임을 마쳤으면 없다. */
export function rainTargets(run:TodayRun):FitSpace[]{
 const at=mainIndexOf(run);
 if(run.finishedAt!==undefined||at<0||run.index>at)return [];
 const {space}=run.plan.settings;
 return space===FIT_SPACES[2]?[GYM_SPACE,CLASSROOM_SPACE]:space===GYM_SPACE?[CLASSROOM_SPACE]:[];
}
/**
 * 그 공간으로 옮길 때 보여 줄 대표 게임(2~3개). 같은 수업이면 늘 같은 순서로 보여 준다(seed로 돌린다).
 */
export function rainCandidates(run:TodayRun,space:FitSpace=CLASSROOM_SPACE,limit=3):SignatureGameDef[]{
 if(!rainTargets(run).includes(space))return [];
 const current=run.plan.stages[mainIndexOf(run)].gameId;
 const list=mainCandidates(run.plan.settings.grade,space).filter(g=>g.id!==current);
 if(!list.length)return [];
 const shift=run.plan.seed%list.length;
 return [...list.slice(shift),...list.slice(0,shift)].slice(0,limit);
}
/**
 * 남은 단계를 그 공간용으로 바꾼다: 본게임은 고른 대표 게임으로, 아직 안 한 준비·정리운동은 그 공간에 맞지 않으면 맞는 것으로.
 * 이미 마친 단계와 돌아보기, '한 판 더'로 한 게임 기록은 그대로 둔다.
 */
export function swapToSpace(run:TodayRun,gameId:string,space:FitSpace):TodayRun{
 if(!rainCandidates(run,space,99).some(g=>g.id===gameId))return run;
 const sig=READY_SIGNATURE_GAMES.find(g=>g.id===gameId)!;
 const {grade}=run.plan.settings,at=mainIndexOf(run),from=run.plan.stages[at].gameId;
 const stages=run.plan.stages.map((s,i)=>{
  if(i<run.index)return s;
  if(i===at)return {...s,title:sig.name,gameId:sig.id,emoji:sig.emoji,note:space===CLASSROOM_SPACE?`${sig.oneLine} 교실이 좁으면: ${sig.seatedNote}`:sig.oneLine};
  if((s.kind==='warmup'||s.kind==='cooldown')&&s.gameId&&i!==run.index){
   const g=BY_ID.get(s.gameId);
   if(g&&fitsSpace(g,space))return s;
   const alt=stageCandidates(s.kind,grade,space)[0];
   return alt?{...s,title:alt.name,gameId:alt.type,emoji:alt.emoji||s.emoji}:s;
  }
  return s;
 });
 return {...run,rainFrom:run.rainFrom??from,plan:{...run.plan,settings:{...run.plan.settings,space,mainId:sig.id},stages}};
}
export const swapToClassroom=(run:TodayRun,gameId:string)=>swapToSpace(run,gameId,CLASSROOM_SPACE);
/** 수업 중에 여는 대표 게임 주소(끝나면 '오늘 수업'으로 돌아온다). */
export const mainPath=(gameId:string,teams:number)=>`/play/${gameId}?${new URLSearchParams({returnTo:'/today',teams:String(teams)}).toString()}`;
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
  // 결과를 기록한 활동은 '건너뛰기'로 나갔어도 한 것으로 본다(본게임은 '한 판 더'로 한 다른 대표 게임도).
  if(stageGameIds(run,i).some(recorded))return 'played';
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
 const extras=run.extraMains??[];
 const stagesBound=run.stagePlays?.length===run.plan.stages.length;
 const extrasBound=(run.extraPlays?.length??0)===extras.length;
 if(stagesBound&&extrasBound)return run;
 return {...run,
  stagePlays:stagesBound?run.stagePlays:run.plan.stages.map((s,i)=>s.gameId?lookup(s.gameId)??summaryPlayId(run,i):''),
  ...(extras.length?{extraPlays:extrasBound?run.extraPlays:extras.map((id,k)=>run.extraPlays?.[k]??lookup(id)??extraPlayId(run,k))}:{})};
}
/** '한 판 더'로 한 다른 대표 게임에 남긴 판이 없을 때 쓰는 반응 칸 id(같은 수업·같은 순서면 늘 같다). */
export const extraPlayId=(run:TodayRun,k:number)=>`today-${recordsSince(run).toString(36)}-x${k}`;
