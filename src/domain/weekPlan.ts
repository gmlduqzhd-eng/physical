import {reactionRows,type ClassProgress} from './classProgress';
import {buildTodayPlan,mainCandidates,type TodayPlan,type TodaySettings} from './todayLesson';

/**
 * 여러 차시 계획: 한 번에 2~8차시의 수업(준비운동·본게임·정리운동·돌아보기)을 짠다.
 * 본게임은 우리 반 반응을 보고 고른다 — 👍가 많았던 활동과 아직 안 해 본 활동을 앞에, 👎가 많았던 활동은 뒤로.
 * 같은 주·같은 설정이면 늘 같은 계획이 나온다.
 */
export const WEEK_LESSONS=[2,3,4,6,8] as const;
export type WeekLessons=typeof WEEK_LESSONS[number];
export const DEFAULT_WEEK_LESSONS:WeekLessons=3;
export const isWeekLessons=(n:unknown):n is WeekLessons=>(WEEK_LESSONS as readonly number[]).includes(Number(n));

export type PickReason='liked'|'new'|'again'|'retry';
export const PICK_REASON_LABEL:Record<PickReason,string>={liked:'👍 반응이 좋았어요',new:'🆕 아직 안 해 본 활동',again:'🔁 한 번 해 본 활동',retry:'🔧 지난번엔 아쉬웠어요 · 규칙을 쉽게 바꿔 다시'};
export interface WeekLesson {no:number;plan:TodayPlan;mainId:string;reason:PickReason}
export interface WeekPlan {settings:TodaySettings;lessons:WeekLesson[];weekKey:string}

/** 반응이 이만큼은 쌓여야 좋다/아쉽다고 본다. */
const MIN_VOTES=2;
const reasonOf=(plays:number,up:number,down:number):PickReason=>{
 const votes=up+down;
 if(votes>=MIN_VOTES&&up/votes>=0.6)return 'liked';
 if(votes>=MIN_VOTES&&up/votes<0.4)return 'retry';
 return plays||votes?'again':'new';
};
const RANK:Record<PickReason,number>={liked:0,new:1,again:2,retry:3};

/** 그 주의 월요일 날짜(기기 시계 기준, 예: 2026-11-23). */
export function weekKeyOf(now:number):string{
 const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
const hash=(text:string)=>{let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};

export function buildWeekPlan(settings:TodaySettings,count:number,progress:ClassProgress,weekKey:string,shuffle=0):WeekPlan{
 const rows=new Map(reactionRows(progress).map(r=>[r.id,r]));
 const base=hash(`${weekKey}|${settings.grade}|${settings.space}|${settings.minutes}|${shuffle}`);
 const ranked=mainCandidates(settings.grade,settings.space).map(g=>{const r=rows.get(g.id);return {id:g.id,reason:reasonOf(r?.plays??0,r?.up??0,r?.down??0),tie:hash(`${base}|${g.id}`)};})
  .sort((a,b)=>RANK[a.reason]-RANK[b.reason]||a.tie-b.tie);
 const lessons:WeekLesson[]=[];
 for(let i=0;i<count&&ranked.length;i++){
  // 후보가 차시 수보다 적으면 앞에서부터 다시 돈다(바로 앞 차시와는 겹치지 않게).
  const picked=ranked[i%ranked.length];
  lessons.push({no:i+1,mainId:picked.id,reason:picked.reason,plan:buildTodayPlan({...settings,mainId:picked.id},(base+i*7919)%1e9)});
 }
 return {settings,lessons,weekKey};
}

/** 계획을 표로(내보내기·인쇄용). */
export const WEEK_HEADERS=['차시','준비운동','본게임','정리운동','돌아보기 질문','고른 까닭'];
export function weekRows(plan:WeekPlan):(string|number)[][]{
 const title=(p:TodayPlan,kind:string)=>{const s=p.stages.find(x=>x.kind===kind);return s?`${s.title} (${s.minutes}분)`:'-';};
 return plan.lessons.map(l=>[`${l.no}차시`,title(l.plan,'warmup'),title(l.plan,'main'),title(l.plan,'cooldown'),l.plan.reflection,PICK_REASON_LABEL[l.reason]]);
}

/**
 * 고정한 계획: '이 계획으로 정하기'를 누르면 그 주의 차시 순서를 그대로 둔다(주중에 반응을 남겨도 바뀌지 않는다).
 * 주가 바뀌면 고정은 저절로 풀린다. 반마다 따로 저장한다.
 */
export interface PinnedLesson {mainId:string;reason:PickReason;seed:number}
export interface PinnedWeek {weekKey:string;pinnedAt:number;settings:Pick<TodaySettings,'grade'|'space'|'minutes'|'teams'>;lessons:PinnedLesson[]}
const REASONS=new Set<string>(Object.keys(PICK_REASON_LABEL));
const MAX_LESSONS=Math.max(...WEEK_LESSONS);

export function pinWeek(plan:WeekPlan,now:number):PinnedWeek{
 const {grade,space,minutes,teams}=plan.settings;
 return {weekKey:plan.weekKey,pinnedAt:now,settings:{grade,space,minutes,teams},lessons:plan.lessons.map(l=>({mainId:l.mainId,reason:l.reason,seed:l.plan.seed}))};
}
/** 저장소에서 읽은 값을 믿지 않고 걸러 낸다. 이번 주 것이 아니거나 모양이 이상하면 null. */
export function parsePinnedWeek(raw:unknown,weekKey:string,parseSettings:(raw:unknown)=>TodaySettings):PinnedWeek|null{
 if(!raw||typeof raw!=='object')return null;
 const input=raw as Partial<PinnedWeek>;
 if(input.weekKey!==weekKey||!Number.isFinite(input.pinnedAt)||!Array.isArray(input.lessons))return null;
 const settings=parseSettings(input.settings),valid=new Set<string>(mainCandidates(settings.grade,settings.space).map(g=>g.id));
 const lessons=input.lessons.filter((l):l is PinnedLesson=>!!l&&typeof l==='object'&&typeof l.mainId==='string'&&valid.has(l.mainId)&&REASONS.has(String(l.reason))&&Number.isFinite(l.seed)).slice(0,MAX_LESSONS).map(l=>({mainId:l.mainId,reason:l.reason,seed:Math.abs(Math.trunc(l.seed))%1e9}));
 if(lessons.length<2)return null;
 return {weekKey,pinnedAt:Number(input.pinnedAt),settings:{grade:settings.grade,space:settings.space,minutes:settings.minutes,teams:settings.teams},lessons};
}
/** 고정한 계획을 화면에 쓸 차시 목록으로. */
export function pinnedPlan(pin:PinnedWeek):WeekPlan{
 const settings:TodaySettings={...pin.settings};
 return {settings,weekKey:pin.weekKey,lessons:pin.lessons.map((l,i)=>({no:i+1,mainId:l.mainId,reason:l.reason,plan:buildTodayPlan({...settings,mainId:l.mainId},l.seed)}))};
}
/**
 * 차시마다 마쳤는지. 고정한 뒤에 그 본게임을 기록한 판 수로 센다
 * (같은 본게임이 두 차시에 있으면 두 번째 차시는 두 번째 판부터 '완료').
 */
export function lessonsDone(pin:PinnedWeek,progress:ClassProgress):boolean[]{
 const played=new Map<string,number>();
 for(const p of progress.plays)if(p.at>=pin.pinnedAt)played.set(p.id,(played.get(p.id)??0)+1);
 const seen=new Map<string,number>();
 return pin.lessons.map(l=>{const nth=(seen.get(l.mainId)??0)+1;seen.set(l.mainId,nth);return (played.get(l.mainId)??0)>=nth;});
}
