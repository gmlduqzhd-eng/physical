import type { ExpeditionRecord } from './expeditionRules.js';
export interface GameResultDetails {
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
      }).slice(0,12).map(r=>({round:r.round,kind:r.kind.slice(0,50),source:r.source,participants:[...r.participants],counts:[...r.counts],checks:[...r.checks],answer:[...r.answer],correct:r.correct,elapsedMs:r.elapsedMs,...(r.arrivals?{arrivals:[...r.arrivals]}:{})}));
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
