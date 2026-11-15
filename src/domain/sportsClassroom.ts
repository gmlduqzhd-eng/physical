import {SPORT_EVENT_DATA} from './sportsClassroomData.js';

/** 종목 교실: 종목마다 교실·강당에서 바로 하는 리드업 게임 하나와 수업 여섯 단계. */
export type SportGroup='target'|'net'|'combat'|'record'|'race'|'art';
export type SportGrade='1-2'|'3-4'|'5-6';
export interface SportEvent {
 id:string; group:SportGroup; name:string; sub:string; icon:string; guide:string; missionTitle:string;
 gear:string[]; rules:string[]; easy:[string,string][]; easyTip:string; hard:string[]; safety:string[];
 roles:[string,number][]; mode:'score'|'time'; values?:number[]; unit?:string; btnLabel?:string; timers:number[];
 warmup:[string,string][]; place:string[]; grades:SportGrade[]; lowGear:boolean; quiet:boolean; goal:string; reflect:string;
 lowerWins?:boolean; penalty?:number;
}
export const SPORT_GROUPS:Record<SportGroup,string>={target:'표적·타겟형',net:'네트·필드형',combat:'투기·경쟁형',record:'기록·체력형',race:'레이스·릴레이형',art:'표현·예술형'};
export const SPORT_EVENTS:readonly SportEvent[]=SPORT_EVENT_DATA;
export const SPORT_BY_ID:ReadonlyMap<string,SportEvent>=new Map(SPORT_EVENTS.map(e=>[e.id,e]));
/** 준비물이 간단하고 교실·강당에서 바로 할 수 있는 종목. */
export const RECOMMENDED_SPORTS:readonly string[]=['archery','basketball','badminton','soccer','taekwondo','weightlifting','relay','breaking'];

export const SPORT_FILTERS=[
 {id:'recommended',label:'추천'},{id:'classroom',label:'교실'},{id:'hall',label:'강당·운동장'},{id:'lowgear',label:'도구 간단'},{id:'quiet',label:'조용히'},{id:'all',label:'전체'},
] as const;
export type SportFilter=typeof SPORT_FILTERS[number]['id'];
export function filterSports(filter:SportFilter,grade:SportGrade|'all'='all'):SportEvent[]{
 return SPORT_EVENTS.filter(e=>(grade==='all'||e.grades.includes(grade))&&(
  filter==='recommended'?RECOMMENDED_SPORTS.includes(e.id):filter==='classroom'?e.place.includes('교실'):filter==='hall'?e.place.some(p=>p==='강당'||p==='운동장'):filter==='lowgear'?e.lowGear:filter==='quiet'?e.quiet:true));
}

export const LESSON_STAGES=[
 {id:'warmup',label:'준비운동'},{id:'mission',label:'오늘의 미션'},{id:'ready',label:'준비·안전'},{id:'match',label:'경기'},{id:'award',label:'시상'},{id:'reflect',label:'돌아보기'},
] as const;
export type LessonStage=typeof LESSON_STAGES[number]['id'];

export const TEAM_NAMES=['청팀','홍팀','황팀','녹팀'] as const;
export const TEAM_COLORS=['#2563eb','#dc2626','#ca8a04','#15803d'] as const;
export type Medal='gold'|'silver'|'bronze';
export const MEDAL_LABEL:Record<Medal,string>={gold:'금',silver:'은',bronze:'동'};
/** 점수 경기는 점수, 시간 경기는 걸린 초(벌칙 포함). 아직 기록이 없는 팀은 null. */
export type TeamResult={team:number;value:number|null};

/**
 * 순위와 메달. 점수 경기는 높은 점수가(타수 경기는 낮은 점수가), 시간 경기는 짧은 시간이 앞선다.
 * 같은 기록은 같은 순위·같은 메달을 받고 다음 순위는 그만큼 건너뛴다. 기록이 없는 팀은 순위에 넣지 않는다.
 */
export function rankTeams(event:Pick<SportEvent,'mode'|'lowerWins'>,results:readonly TeamResult[]):{team:number;value:number;rank:number;medal:Medal|null}[]{
 const lower=event.mode==='time'||event.lowerWins===true;
 const done=results.filter((r):r is {team:number;value:number}=>r.value!==null&&Number.isFinite(r.value)).sort((a,b)=>lower?a.value-b.value:b.value-a.value);
 return done.map((r,i)=>{const rank=done.findIndex(o=>o.value===r.value)+1;void i;return {...r,rank,medal:rank===1?'gold':rank===2?'silver':rank===3?'bronze':null};});
}
export function formatResult(event:Pick<SportEvent,'mode'|'unit'>,value:number):string{
 if(event.mode!=='time')return `${value}${event.unit??'점'}`;
 const total=Math.max(0,Math.round(value*10)/10),m=Math.floor(total/60),s=total-m*60;return m?`${m}분 ${s.toFixed(1)}초`:`${s.toFixed(1)}초`;
}

/** 우리 반 종합 메달: 수업마다 시상한 메달을 팀별로 더한다. 금, 은, 동 순으로 겨룬다. */
export type MedalTally=Record<string,{gold:number;silver:number;bronze:number}>;
export function addMedals(tally:MedalTally,awards:readonly {team:number;medal:Medal|null}[]):MedalTally{
 const next:MedalTally=Object.fromEntries(Object.entries(tally).map(([k,v])=>[k,{...v}]));
 for(const a of awards){if(!a.medal||!TEAM_NAMES[a.team])continue;const name=TEAM_NAMES[a.team];next[name]??={gold:0,silver:0,bronze:0};next[name][a.medal]++;}
 return next;
}
export function medalStandings(tally:MedalTally):{team:string;gold:number;silver:number;bronze:number}[]{
 return Object.entries(tally).map(([team,m])=>({team,...m})).filter(m=>m.gold+m.silver+m.bronze>0).sort((a,b)=>b.gold-a.gold||b.silver-a.silver||b.bronze-a.bronze||a.team.localeCompare(b.team,'ko'));
}
export function parseMedalTally(value:unknown):MedalTally{
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 const out:MedalTally={};
 for(const name of TEAM_NAMES){const v=(value as Record<string,unknown>)[name];if(!v||typeof v!=='object')continue;const m=v as Record<string,unknown>;const n=(x:unknown)=>Number.isInteger(x)&&Number(x)>=0&&Number(x)<=999?Number(x):0;out[name]={gold:n(m.gold),silver:n(m.silver),bronze:n(m.bronze)};}
 return out;
}
