import type { ExpeditionRecord } from './expeditionRules.js';
export interface GameResultDetails {
  learning?:{confirmed:number;total:number;source:'safety'};
  completion?:'complete'|'partial';
  participation?:'performed'|'observed'|'rested';
  course?:{sourceId:string;targetId:string;sourceName:string;targetName:string;version:1};
  activity?:{gameId:string;specId:string;soloPreview:boolean;rounds:ExpeditionRecord[]};
  ratings?: number[];
  criteria?: string[];
  selfReflection?: string;
  totalTime?: number;
  metrics?: Record<string, string>;
}

export function normalizeGameResultDetails(value: unknown): GameResultDetails | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const data = value as Record<string, unknown>;
  const result: GameResultDetails = {};
  if(data.learning&&typeof data.learning==='object'){const v=data.learning as Record<string,unknown>;if(v.source==='safety'&&Number.isInteger(v.confirmed)&&Number.isInteger(v.total)&&Number(v.confirmed)>=0&&Number(v.confirmed)<=Number(v.total)&&Number(v.total)<=10)result.learning={confirmed:Number(v.confirmed),total:Number(v.total),source:'safety'};}
  if(data.completion==='complete'||data.completion==='partial')result.completion=data.completion;
  if(['performed','observed','rested'].includes(String(data.participation)))result.participation=data.participation as GameResultDetails['participation'];
  if(data.course&&typeof data.course==='object'&&!Array.isArray(data.course)){const c=data.course as Record<string,unknown>;if(c.version===1&&typeof c.sourceId==='string'&&/^[a-z0-9_-]{1,100}$/.test(c.sourceId)&&typeof c.targetId==='string'&&/^[a-z0-9_-]{1,100}$/.test(c.targetId)&&typeof c.sourceName==='string'&&typeof c.targetName==='string')result.course={sourceId:c.sourceId,targetId:c.targetId,sourceName:c.sourceName.slice(0,100),targetName:c.targetName.slice(0,100),version:1};}
  if(data.activity && typeof data.activity==='object' && !Array.isArray(data.activity)){
    const activity=data.activity as Record<string,unknown>;
    if(typeof activity.gameId==='string'&&/^exp-(phone|tablet)-\d{2}$/.test(activity.gameId)&&typeof activity.specId==='string'&&/^[ST]\d{2}$/.test(activity.specId)&&Array.isArray(activity.rounds)){
      const rounds=activity.rounds.filter((record):record is ExpeditionRecord=>{
        if(!record||typeof record!=='object')return false;
        const r=record as Record<string,unknown>;
        return Number.isInteger(r.round)&&Number(r.round)>0&&Number(r.round)<=12&&typeof r.kind==='string'&&['self-report','peer-report'].includes(String(r.source))
          &&Array.isArray(r.participants)&&r.participants.length<=4&&r.participants.every(n=>Number.isInteger(n)&&n>=1&&n<=4)
          &&Array.isArray(r.counts)&&r.counts.length<=10&&r.counts.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100)
          &&Array.isArray(r.checks)&&r.checks.length<=16&&r.checks.every(s=>typeof s==='string'&&s.length<=300)
          &&Array.isArray(r.answer)&&r.answer.length<=16&&r.answer.every(s=>typeof s==='string'&&s.length<=100)
          &&typeof r.correct==='boolean'&&typeof r.elapsedMs==='number'&&Number.isFinite(r.elapsedMs)&&r.elapsedMs>=0&&r.elapsedMs<=7200000
          &&(r.arrivals===undefined||(Array.isArray(r.arrivals)&&r.arrivals.length<=4&&r.arrivals.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=-1&&n<=7200000)));
      }).slice(0,12).map(r=>({round:r.round,kind:r.kind.slice(0,50),source:r.source,participants:[...r.participants],counts:[...r.counts],checks:[...r.checks],answer:[...r.answer],correct:r.correct,elapsedMs:r.elapsedMs,...(['complete','partial','rest','observe'].includes(String(r.outcome))?{outcome:r.outcome}:{}),...(typeof r.alternative==='boolean'?{alternative:r.alternative}:{}),...(typeof r.gentle==='boolean'?{gentle:r.gentle}:{}),...(r.arrivals?{arrivals:[...r.arrivals]}:{})}));
      result.activity={gameId:activity.gameId,specId:activity.specId,soloPreview:activity.soloPreview===true,rounds};
    }
  }
  if (Array.isArray(data.ratings) && data.ratings.length <= 20 && data.ratings.every(n => Number.isInteger(n) && n >= 1 && n <= 5)) result.ratings = data.ratings;
  if (Array.isArray(data.criteria) && data.criteria.every(s => typeof s === 'string')) result.criteria = data.criteria.slice(0, 20).map(s => s.slice(0, 100));
  if (typeof data.selfReflection === 'string') result.selfReflection = data.selfReflection.slice(0, 500);
  if (typeof data.totalTime === 'number' && Number.isFinite(data.totalTime) && data.totalTime >= 0) result.totalTime = Math.round(data.totalTime);
  if (data.metrics && typeof data.metrics === 'object' && !Array.isArray(data.metrics)) {
    result.metrics = Object.fromEntries(Object.entries(data.metrics).filter(([, v]) => typeof v === 'string').slice(0, 10).map(([k, v]) => [k.slice(0, 100), (v as string).slice(0, 200)]));
  }
  return Object.keys(result).length ? result : undefined;
}

export const earnsParticipationReward=(score:number,details?:GameResultDetails)=>details?.participation?details.participation==='performed':score>0;

export const participationKind=(details?:GameResultDetails)=>details?.participation==='observed'?'observed':details?.participation==='rested'?'rested':'performed';
export function classroomResultScore(score:number,details?:GameResultDetails){return details?.participation==='observed'||details?.participation==='rested'?0:Math.max(0,Math.round(score));}
export const canReportCompletion=(details?:GameResultDetails)=>details?.completion!=='partial'&&participationKind(details)==='performed';

export function expressionAssessment(steps:{title:string}[],rubric:{criterion:string;desc:string}[],performed:number[]){const indexes=[...new Set(performed)].filter(i=>Number.isInteger(i)&&i>=0&&i<steps.length).sort((a,b)=>a-b);return indexes.length===steps.length?rubric:indexes.map(i=>({criterion:`${i+1}단계 · ${steps[i].title}`,desc:'참여한 이 단계에서 편한 동작으로 고른 모양·박자·의도를 표현했나요? 크기나 신체 조건을 비교하지 않아요.'}));}
