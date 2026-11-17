/**
 * 우리 반 반응(👍/👎)과 반 원정 지도. 화면·저장소와 상관없는 순수 함수만 둔다.
 * 기록은 이 기기의 localStorage에만 남는다(학생 이름 없이 활동 id와 시각만).
 */
export type Vote='up'|'down';
export interface PlayEntry {id:string;at:number}
export interface VoteEntry {id:string;at:number;vote:Vote}
export interface ClassProgress {version:1;plays:PlayEntry[];votes:VoteEntry[]}

export const EMPTY_PROGRESS:ClassProgress={version:1,plays:[],votes:[]};
/** 저장 크기를 묶어 둔다(한 학기 넉넉히). 넘치면 오래된 것부터 지운다. */
export const MAX_ENTRIES=2000;

const isId=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=80;
const isTime=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>0;
/** 저장된 값을 검사해 읽는다. 깨졌거나 모양이 다르면 빈 기록. */
export function parseProgress(raw:unknown):ClassProgress{
 if(!raw||typeof raw!=='object')return {...EMPTY_PROGRESS,plays:[],votes:[]};
 const r=raw as {plays?:unknown;votes?:unknown};
 const plays=Array.isArray(r.plays)?r.plays.filter((p):p is PlayEntry=>!!p&&isId((p as PlayEntry).id)&&isTime((p as PlayEntry).at)).map(p=>({id:p.id,at:p.at})):[];
 const votes=Array.isArray(r.votes)?r.votes.filter((v):v is VoteEntry=>!!v&&isId((v as VoteEntry).id)&&isTime((v as VoteEntry).at)&&((v as VoteEntry).vote==='up'||(v as VoteEntry).vote==='down')).map(v=>({id:v.id,at:v.at,vote:v.vote})):[];
 return {version:1,plays:plays.slice(-MAX_ENTRIES),votes:votes.slice(-MAX_ENTRIES)};
}

export function addPlay(p:ClassProgress,id:string,at:number):ClassProgress{
 if(!isId(id)||!isTime(at))return p;
 return {...p,plays:[...p.plays,{id,at}].slice(-MAX_ENTRIES)};
}
/**
 * 반응 남기기. 같은 활동의 가장 최근 판(마지막 기록 이후)에 이미 반응했으면 그 반응을 바꾼다.
 * 한 판에 한 표: 마지막 판 시각 이후의 반응만 덮어쓴다.
 */
export function setVote(p:ClassProgress,id:string,vote:Vote,at:number):ClassProgress{
 if(!isId(id)||!isTime(at))return p;
 const lastPlay=Math.max(0,...p.plays.filter(x=>x.id===id).map(x=>x.at));
 const votes=p.votes.filter(v=>!(v.id===id&&v.at>=lastPlay));
 return {...p,votes:[...votes,{id,at,vote}].slice(-MAX_ENTRIES)};
}
/** 이 활동의 가장 최근 판에 남긴 반응(없으면 null). */
export function currentVote(p:ClassProgress,id:string):Vote|null{
 const lastPlay=Math.max(0,...p.plays.filter(x=>x.id===id).map(x=>x.at));
 const v=[...p.votes].reverse().find(x=>x.id===id&&x.at>=lastPlay);
 return v?.vote??null;
}

export interface ReactionRow {id:string;plays:number;up:number;down:number;/** 👍 비율(반응이 없으면 null) */ ratio:number|null;lastAt:number}
export function reactionRows(p:ClassProgress):ReactionRow[]{
 const by=new Map<string,ReactionRow>();
 const row=(id:string)=>{let r=by.get(id);if(!r){r={id,plays:0,up:0,down:0,ratio:null,lastAt:0};by.set(id,r);}return r;};
 for(const x of p.plays){const r=row(x.id);r.plays++;r.lastAt=Math.max(r.lastAt,x.at);}
 for(const v of p.votes){const r=row(v.id);if(v.vote==='up')r.up++;else r.down++;r.lastAt=Math.max(r.lastAt,v.at);}
 for(const r of by.values())r.ratio=r.up+r.down?r.up/(r.up+r.down):null;
 return [...by.values()].sort((a,b)=>b.plays-a.plays||(b.ratio??-1)-(a.ratio??-1)||a.id.localeCompare(b.id));
}
/** 보관함으로 보낼 후보: 대표 게임인데 3판 이상 했고 👍 비율이 40% 미만. */
/** 추천에 필요한 최소 판 수와 반응 수. 한두 번의 반응으로 대표 게임을 내리거나 올리지 않게 넉넉히 잡는다. */
export const MIN_PLAYS_FOR_SUGGESTION=5;
export const MIN_DOWN_FOR_ARCHIVE=2;
export const MIN_UP_FOR_FEATURED=3;
export const ARCHIVE_RATIO=0.4,FEATURED_RATIO=0.8;
/** 화면에 그대로 보여 줄 규칙(숫자는 위 상수와 같다). */
export const SUGGESTION_RULES={
 archive:`대표 게임 가운데 ${MIN_PLAYS_FOR_SUGGESTION}판 이상 했고, 👎가 ${MIN_DOWN_FOR_ARCHIVE}번 이상이며, 👍가 반응의 ${ARCHIVE_RATIO*100}%보다 적은 게임`,
 featured:`보관함 활동 가운데 ${MIN_PLAYS_FOR_SUGGESTION}판 이상 했고, 👍가 ${MIN_UP_FOR_FEATURED}번 이상이며, 👍가 반응의 ${FEATURED_RATIO*100}% 이상인 활동`,
 note:'추천일 뿐이에요. 실제로 대표 게임을 바꾸는 것은 선생님이 정해요.',
} as const;
/** 보관함으로 보낼 후보: 대표 게임 중 충분히 해 봤고 👎가 분명한 것. */
export function archiveCandidates(rows:ReactionRow[],isFeatured:(id:string)=>boolean):ReactionRow[]{
 return rows.filter(r=>isFeatured(r.id)&&r.plays>=MIN_PLAYS_FOR_SUGGESTION&&r.down>=MIN_DOWN_FOR_ARCHIVE&&r.ratio!==null&&r.ratio<ARCHIVE_RATIO);
}
/** 대표로 올릴 후보: 보관함 활동 중 충분히 해 봤고 👍가 분명한 것. */
export function featuredCandidates(rows:ReactionRow[],isFeatured:(id:string)=>boolean):ReactionRow[]{
 return rows.filter(r=>!isFeatured(r.id)&&r.plays>=MIN_PLAYS_FOR_SUGGESTION&&r.up>=MIN_UP_FOR_FEATURED&&r.ratio!==null&&r.ratio>=FEATURED_RATIO);
}

export const MAP_TILES=30;
export const MAP_REGIONS=[
 {from:0,name:'출발 마을',icon:'🏡'},{from:5,name:'숲속 길',icon:'🌲'},{from:10,name:'시냇물 다리',icon:'🌉'},
 {from:15,name:'바람 언덕',icon:'⛰️'},{from:20,name:'모래 사막',icon:'🏜️'},{from:25,name:'별빛 성',icon:'🏰'},
] as const;
export const regionOf=(tile:number)=>[...MAP_REGIONS].reverse().find(r=>tile>=r.from)!;
export interface MapView {total:number;lap:number;opened:number;tiles:{index:number;open:boolean;region:string;icon:string}[];current:{name:string;icon:string};nextRegion:{name:string;icon:string;left:number}|null}
export function mapView(p:ClassProgress):MapView{
 const total=p.plays.length,lap=Math.floor(total/MAP_TILES)+1,opened=total%MAP_TILES;
 const tiles=Array.from({length:MAP_TILES},(_,index)=>{const r=regionOf(index);return {index,open:index<opened,region:r.name,icon:r.icon};});
 const cur=regionOf(Math.max(0,opened-1)),next=MAP_REGIONS.find(r=>r.from>=opened&&r.from>0);
 return {total,lap,opened,tiles,current:{name:cur.name,icon:cur.icon},nextRegion:next?{name:next.name,icon:next.icon,left:next.from-opened+1}:null};
}

/** 그 주 월요일 0시(지역 시간). */
export function weekStart(at:number):number{const d=new Date(at);d.setHours(0,0,0,0);const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return d.getTime();}
export interface WeekCompare {thisWeek:number;lastWeek:number;diff:number;line:string}
export function weekCompare(p:ClassProgress,now:number):WeekCompare{
 const start=weekStart(now),prev=weekStart(start-1);
 const thisWeek=p.plays.filter(x=>x.at>=start&&x.at<=now).length,lastWeek=p.plays.filter(x=>x.at>=prev&&x.at<start).length,diff=thisWeek-lastWeek;
 const line=!lastWeek&&!thisWeek?'이번 주 첫 판을 시작해요!':!lastWeek?`이번 주 ${thisWeek}판 했어요.`:diff>0?`지난주보다 ${diff}판 더 했어요!`:diff===0?'지난주와 같은 판 수예요.':`지난주보다 ${-diff}판 적어요. 한 판 더 해 볼까요?`;
 return {thisWeek,lastWeek,diff,line};
}

export interface ClassBadge {id:string;icon:string;name:string;desc:string;earned:boolean}
const PLAY_MILESTONES:[number,string,string][]=[[1,'🌱','첫 걸음'],[5,'🥾','꾸준한 탐험대'],[10,'🧭','길잡이 반'],[20,'⛰️','언덕을 넘은 반'],[30,'🏰','지도 완성'],[50,'🌟','전설의 원정대']];
const VARIETY_MILESTONES:[number,string,string][]=[[5,'🎨','다섯 가지 놀이'],[10,'🌈','열 가지 놀이']];
export function classBadges(p:ClassProgress):ClassBadge[]{
 const total=p.plays.length,distinct=new Set(p.plays.map(x=>x.id)).size;
 return [
  ...PLAY_MILESTONES.map(([n,icon,name])=>({id:`plays-${n}`,icon,name,desc:`${n}판 마치기`,earned:total>=n})),
  ...VARIETY_MILESTONES.map(([n,icon,name])=>({id:`variety-${n}`,icon,name,desc:`서로 다른 활동 ${n}개 하기`,earned:distinct>=n})),
 ];
}
/** 이번 판으로 새로 받은 배지(앞의 기록과 비교). */
export function newBadges(before:ClassProgress,after:ClassProgress):ClassBadge[]{
 const had=new Set(classBadges(before).filter(b=>b.earned).map(b=>b.id));
 return classBadges(after).filter(b=>b.earned&&!had.has(b.id));
}
