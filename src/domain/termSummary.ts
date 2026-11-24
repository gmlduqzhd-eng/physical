import {reactionRows,type ClassProgress} from './classProgress';
import {kindCounts,type JourneyStamp} from './classJourney';

/**
 * 학기 정리 한 장: TV로 한 수업 기록(판·반응)과 원정 지도 도장을 한눈에.
 * 평가 문구를 대신 써 주지는 않는다 — 무엇을 얼마나 했는지 사실만 모은다. 학생 개인 기록은 없다.
 */
export interface TermActivity {id:string;plays:number;up:number;down:number}
export interface TermSummary {
 from:string|null;to:string|null;
 /** 기록이 있는 날 수 */ days:number;
 plays:number;votes:number;
 domains:{name:string;plays:number}[];
 activities:TermActivity[];
 /** 👍 비율이 높은 활동(반응 2개 이상) */ loved:TermActivity[];
 stamps:number;stampKinds:{label:string;count:number}[];
}
const day=(at:number)=>{const d=new Date(at);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};

export function buildTermSummary(progress:ClassProgress,stamps:readonly JourneyStamp[],domainOf:(id:string)=>string|undefined):TermSummary{
 const times=[...progress.plays.map(p=>p.at),...progress.votes.map(v=>v.at)].filter(t=>Number.isFinite(t)&&t>0).sort((a,b)=>a-b);
 const rows=reactionRows(progress);
 const byDomain=new Map<string,number>();
 for(const p of progress.plays){const name=domainOf(p.id)??'그 밖';byDomain.set(name,(byDomain.get(name)??0)+1);}
 const activities=rows.filter(r=>r.plays||r.up||r.down).map(r=>({id:r.id,plays:r.plays,up:r.up,down:r.down})).sort((a,b)=>b.plays-a.plays||b.up-a.up||a.id.localeCompare(b.id));
 const loved=activities.filter(a=>a.up+a.down>=2&&a.up/(a.up+a.down)>=0.6).sort((a,b)=>b.up-a.up||b.plays-a.plays).slice(0,5);
 return {
  from:times.length?day(times[0]):null,to:times.length?day(times[times.length-1]):null,
  days:new Set(progress.plays.map(p=>day(p.at))).size,
  plays:progress.plays.length,votes:progress.votes.length,
  domains:[...byDomain].map(([name,plays])=>({name,plays})).sort((a,b)=>b.plays-a.plays||a.name.localeCompare(b.name)),
  activities,loved,
  stamps:stamps.length,stampKinds:kindCounts(stamps).filter(k=>k.count).map(k=>({label:k.label,count:k.count})),
 };
}

export const TERM_HEADERS=['활동','영역','한 판 수','👍','👎'];
export function termRows(summary:TermSummary,nameOf:(id:string)=>string,domainOf:(id:string)=>string|undefined):(string|number)[][]{
 return summary.activities.map(a=>[nameOf(a.id),domainOf(a.id)??'그 밖',a.plays,a.up,a.down]);
}
/** 제목 아래 요약 줄([항목, 값]). */
export function termMeta(summary:TermSummary,className:string,nameOf:(id:string)=>string):[string,string][]{
 return [['반',className],['기간',summary.from?`${summary.from} ~ ${summary.to}`:'기록 없음'],['수업한 날',`${summary.days}일`],['한 판 수',`${summary.plays}판`],
  ['영역별',summary.domains.length?summary.domains.map(d=>`${d.name} ${d.plays}판`).join(' · '):'-'],
  ['반응이 좋았던 활동',summary.loved.length?summary.loved.map(a=>nameOf(a.id)).join(', '):'-'],
  ['원정 지도 도장',summary.stamps?`${summary.stamps}개 (${summary.stampKinds.map(k=>`${k.label} ${k.count}`).join(', ')})`:'0개']];
}
