/**
 * 우리 반 반응(👍/👎)과 반 원정 지도. 화면·저장소와 상관없는 순수 함수만 둔다.
 * 기록은 이 기기의 localStorage에만 남는다(학생 이름 없이 활동 id와 시각만).
 */
export type Vote='up'|'down';
/**
 * play: 한 판을 가리키는 id(게임을 시작할 때 만든다). 반응은 이 id로 판에 붙는다.
 * 예전 기록에는 play가 없을 수 있다(그때는 시각으로 판을 가른다).
 */
export interface PlayEntry {id:string;at:number;play?:string}
export interface VoteEntry {id:string;at:number;vote:Vote;play?:string}
/**
 * 반응의 이유(여러 개 고를 수 있음). 👍/👎 뒤에 골라도 되고 안 골라도 된다.
 * vote: 이 이유를 보여 주는 반응. 👍에는 좋은 이유만, 👎에는 고칠 이유만 보여 준다.
 * 예전 기록(👍에 고른 '너무 쉬웠어요' 등)도 그대로 읽고 센다.
 */
export type ReasonId='hard'|'long'|'boring'|'confusing'|'easy'|'loved'|'right'|'again';
export const REASONS:readonly {id:ReasonId;label:string;negative:boolean;vote:Vote}[]=[
 {id:'hard',label:'어려웠어요',negative:true,vote:'down'},{id:'long',label:'길었어요',negative:true,vote:'down'},
 {id:'boring',label:'지루했어요',negative:true,vote:'down'},{id:'confusing',label:'헷갈렸어요',negative:true,vote:'down'},
 {id:'easy',label:'너무 쉬웠어요',negative:true,vote:'down'},
 {id:'loved',label:'학생들이 좋아했어요',negative:false,vote:'up'},{id:'right',label:'딱 알맞았어요',negative:false,vote:'up'},
 {id:'again',label:'또 하고 싶어요',negative:false,vote:'up'},
];
/** 이 반응(👍/👎)에서 고를 수 있는 이유. */
export const reasonsForVote=(vote:Vote)=>REASONS.filter(r=>r.vote===vote);
export const REASON_LABEL=Object.fromEntries(REASONS.map(r=>[r.id,r.label])) as Record<ReasonId,string>;
const REASON_IDS=new Set<string>(REASONS.map(r=>r.id));
export const MAX_NOTE=80;
/** 한 판에 남긴 이유와 한 줄 메모(판 id마다 하나). */
export interface ReasonEntry {id:string;at:number;play:string;reasons:ReasonId[];note?:string}
/**
 * version 2: 반응 이유(reasons)를 더했다. version 1 기록은 이유가 없는 기록으로 그대로 읽는다.
 */
export interface ClassProgress {version:2;plays:PlayEntry[];votes:VoteEntry[];reasons:ReasonEntry[]}

export const EMPTY_PROGRESS:ClassProgress={version:2,plays:[],votes:[],reasons:[]};
/** 저장 크기를 묶어 둔다(한 학기 넉넉히). 넘치면 오래된 것부터 지운다. */
export const MAX_ENTRIES=2000;

const isId=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=80;
const isTime=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>0;
const isPlayId=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=64;
const withPlay=<T extends object>(base:T,play:unknown):T&{play?:string}=>isPlayId(play)?{...base,play}:base;
/** 저장된 값을 검사해 읽는다. 깨졌거나 모양이 다르면 빈 기록. */
/** 메모: 제어 문자를 빼고 한 줄로 줄여 80자까지. 비면 undefined. */
export function cleanNote(v:unknown):string|undefined{
 if(typeof v!=='string')return undefined;
 // eslint-disable-next-line no-control-regex -- 저장값에서 제어 문자를 지운다
 const t=v.replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,MAX_NOTE);
 return t||undefined;
}
const cleanReasons=(v:unknown):ReasonId[]=>Array.isArray(v)?[...new Set(v.filter((x):x is ReasonId=>typeof x==='string'&&REASON_IDS.has(x)))]:[];
function parseReason(x:unknown):ReasonEntry|null{
 if(!x||typeof x!=='object')return null;
 const r=x as Partial<ReasonEntry>;
 if(!isId(r.id)||!isTime(r.at)||!isPlayId(r.play))return null;
 const reasons=cleanReasons(r.reasons),note=cleanNote(r.note);
 if(!reasons.length&&!note)return null;
 return note?{id:r.id,at:r.at,play:r.play,reasons,note}:{id:r.id,at:r.at,play:r.play,reasons};
}
export function parseProgress(raw:unknown):ClassProgress{
 if(!raw||typeof raw!=='object')return {...EMPTY_PROGRESS,plays:[],votes:[],reasons:[]};
 const r=raw as {plays?:unknown;votes?:unknown;reasons?:unknown};
 const plays=Array.isArray(r.plays)?r.plays.filter((p):p is PlayEntry=>!!p&&isId((p as PlayEntry).id)&&isTime((p as PlayEntry).at)).map(p=>withPlay({id:p.id,at:p.at},(p as PlayEntry).play)):[];
 const votes=Array.isArray(r.votes)?r.votes.filter((v):v is VoteEntry=>!!v&&isId((v as VoteEntry).id)&&isTime((v as VoteEntry).at)&&((v as VoteEntry).vote==='up'||(v as VoteEntry).vote==='down')).map(v=>withPlay({id:v.id,at:v.at,vote:v.vote},(v as VoteEntry).play)):[];
 const reasons=Array.isArray(r.reasons)?r.reasons.map(parseReason).filter((x):x is ReasonEntry=>!!x):[];
 return {version:2,plays:plays.slice(-MAX_ENTRIES),votes:votes.slice(-MAX_ENTRIES),reasons:reasons.slice(-MAX_ENTRIES)};
}
/**
 * 한 판(play)의 이유와 메모를 바꾼다. 이유도 메모도 비면 그 판의 이유 기록을 지운다.
 * 판 id가 없으면(예전 화면) 남기지 않는다: 이유는 늘 판에 붙어야 앞 판과 섞이지 않는다.
 */
export function setReasons(p:ClassProgress,id:string,play:string,reasons:readonly ReasonId[],note:string|undefined,at:number):ClassProgress{
 if(!isId(id)||!isPlayId(play)||!isTime(at))return p;
 const rest=p.reasons.filter(x=>x.play!==play);
 const clean=cleanReasons(reasons),n=cleanNote(note);
 if(!clean.length&&!n)return {...p,reasons:rest};
 return {...p,reasons:[...rest,n?{id,at,play,reasons:clean,note:n}:{id,at,play,reasons:clean}].slice(-MAX_ENTRIES)};
}
export const reasonsOf=(p:ClassProgress,play:string|undefined):ReasonEntry|null=>play?[...p.reasons].reverse().find(x=>x.play===play)??null:null;

export function addPlay(p:ClassProgress,id:string,at:number,play?:string):ClassProgress{
 if(!isId(id)||!isTime(at))return p;
 if(isPlayId(play)&&p.plays.some(x=>x.play===play))return p; // 같은 판을 두 번 세지 않는다
 return {...p,plays:[...p.plays,withPlay({id,at},play)].slice(-MAX_ENTRIES)};
}
/**
 * 반응 남기기. 한 판에 한 표.
 * play(판 id)가 있으면 그 판의 반응만 바꾼다. 그래서 기록하기 전에 누른 반응이 앞 판의 반응을 덮어쓰지 않는다.
 * play가 없으면(예전 방식) 같은 활동의 마지막 판 시각 이후 반응을 바꾼다.
 */
export function setVote(p:ClassProgress,id:string,vote:Vote,at:number,play?:string):ClassProgress{
 if(!isId(id)||!isTime(at))return p;
 if(isPlayId(play)){
  const votes=p.votes.filter(v=>v.play!==play);
  return {...p,votes:[...votes,{id,at,vote,play}].slice(-MAX_ENTRIES)};
 }
 const lastPlay=Math.max(0,...p.plays.filter(x=>x.id===id).map(x=>x.at));
 const votes=p.votes.filter(v=>!(v.id===id&&!v.play&&v.at>=lastPlay));
 return {...p,votes:[...votes,{id,at,vote}].slice(-MAX_ENTRIES)};
}
/** 이 판(play)에 남긴 반응. play가 없으면 이 활동의 가장 최근 판에 남긴 반응. */
export function currentVote(p:ClassProgress,id:string,play?:string):Vote|null{
 if(isPlayId(play))return [...p.votes].reverse().find(x=>x.play===play)?.vote??null;
 const lastPlay=Math.max(0,...p.plays.filter(x=>x.id===id).map(x=>x.at));
 const v=[...p.votes].reverse().find(x=>x.id===id&&!x.play&&x.at>=lastPlay);
 return v?.vote??null;
}
/** 기록하지 않은 판에 남긴 반응인지(판 id가 있는데 그 판이 기록에 없음). */
/**
 * 오늘 수업 끝 화면에서 한 활동의 반응을 붙일 판 id.
 * 수업 중(since~until)에 이 활동을 기록한 판이 있으면 가장 마지막 판 id를, 없으면 기록 없이 반응만 남긴 마지막 판 id를 쓴다.
 * 그래서 게임 결과 화면에서 이미 누른 반응이 그대로 보이고, 다시 눌러도 같은 판의 반응을 바꿀 뿐 새 표가 쌓이지 않는다.
 */
export function lessonPlayId(p:ClassProgress,id:string,since:number,until:number):string|undefined{
 const inLesson=(x:{id:string;at:number;play?:string})=>x.id===id&&!!x.play&&x.at>=since&&x.at<=until;
 return [...p.plays].reverse().find(inLesson)?.play??[...p.votes].reverse().find(inLesson)?.play;
}
export const isUnrecordedVote=(p:ClassProgress,v:VoteEntry)=>!!v.play&&!p.plays.some(x=>x.play===v.play);

export interface ReactionRow {id:string;plays:number;up:number;down:number;/** 👍 비율(반응이 없으면 null) */ ratio:number|null;lastAt:number;/** 그중 기록하지 않은 판에 남긴 반응 수(👍·👎에는 들어 있음) */ unrecorded:number}
export function reactionRows(p:ClassProgress):ReactionRow[]{
 const by=new Map<string,ReactionRow>();
 const row=(id:string)=>{let r=by.get(id);if(!r){r={id,plays:0,up:0,down:0,ratio:null,lastAt:0,unrecorded:0};by.set(id,r);}return r;};
 const recorded=new Set(p.plays.map(x=>x.play).filter(Boolean));
 for(const x of p.plays){const r=row(x.id);r.plays++;r.lastAt=Math.max(r.lastAt,x.at);}
 for(const v of p.votes){const r=row(v.id);if(v.vote==='up')r.up++;else r.down++;if(v.play&&!recorded.has(v.play))r.unrecorded++;r.lastAt=Math.max(r.lastAt,v.at);}
 for(const r of by.values())r.ratio=r.up+r.down?r.up/(r.up+r.down):null;
 return [...by.values()].sort((a,b)=>b.plays-a.plays||(b.ratio??-1)-(a.ratio??-1)||a.id.localeCompare(b.id));
}
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

/**
 * 두 기록 합치기(같은 판·같은 반응은 한 번만). 저장에 실패한 탭이 다른 탭의 기록을 잃지 않게 쓴다.
 * 판 id가 있는 반응은 판마다 더 늦게 남긴 쪽을 남긴다.
 */
export function mergeProgress(a:ClassProgress,b:ClassProgress):ClassProgress{
 const playKey=(x:PlayEntry)=>x.play?`p:${x.play}`:`t:${x.id}:${x.at}`;
 const plays=new Map<string,PlayEntry>();
 for(const x of [...a.plays,...b.plays])if(!plays.has(playKey(x)))plays.set(playKey(x),x);
 const voteKey=(v:VoteEntry)=>v.play?`p:${v.play}`:`t:${v.id}:${v.at}`;
 const votes=new Map<string,VoteEntry>();
 for(const v of [...a.votes,...b.votes]){const k=voteKey(v),old=votes.get(k);if(!old||v.at>=old.at)votes.set(k,v);}
 const byTime=<T extends {at:number}>(xs:T[])=>xs.sort((x,y)=>x.at-y.at).slice(-MAX_ENTRIES);
 const reasons=new Map<string,ReasonEntry>();
 for(const x of [...a.reasons,...b.reasons]){const old=reasons.get(x.play);if(!old||x.at>=old.at)reasons.set(x.play,x);}
 return {version:2,plays:byTime([...plays.values()]),votes:byTime([...votes.values()]),reasons:byTime([...reasons.values()])};
}

/** 활동마다 모은 이유. ratio는 reactionRows와 같은 👍 비율. */
export interface ReasonRow {id:string;counts:Record<ReasonId,number>;/** 이유나 메모를 남긴 판 수 */ answered:number;/** 이 활동의 메모 전부(최근 것부터). 화면은 앞의 몇 개만 보여 준다. */ notes:{at:number;note:string;play:string}[];plays:number;up:number;down:number;ratio:number|null;hint:string|null}
const zero=():Record<ReasonId,number>=>({hard:0,long:0,boring:0,confusing:0,easy:0,loved:0,right:0,again:0});
/** 이 수 이상 모이면 그 이유를 '많다'고 본다(한두 번으로 판단하지 않게). */
export const MIN_REASON_COUNT=2;
/**
 * 이유로 고른 다음 할 일. 같은 👎라도 '헷갈렸어요'가 많으면 게임을 빼기보다 안내를 고쳐야 한다.
 * 앞에 있는 것일수록 먼저 본다.
 */
export const REASON_HINTS:readonly {reason:ReasonId;hint:string}[]=[
 {reason:'confusing',hint:'안내 보강 필요 (규칙·시범을 더 쉽게)'},
 {reason:'hard',hint:'쉬운 단계 필요 (속도·동작을 낮추기)'},
 {reason:'long',hint:'시간 줄이기 (라운드를 짧게)'},
 {reason:'easy',hint:'어려운 단계 필요 (속도·규칙 카드 늘리기)'},
 {reason:'boring',hint:'변형 필요 (새 규칙 카드) · 계속 지루하면 보관함 후보'},
 {reason:'loved',hint:'좋아했어요 · 대표로 두거나 올리기'},
 {reason:'again',hint:'또 하고 싶어해요 · 대표로 두거나 올리기'},
];
export function reasonHint(counts:Record<ReasonId,number>):string|null{
 return REASON_HINTS.find(h=>counts[h.reason]>=MIN_REASON_COUNT)?.hint??null;
}
export function reasonRows(p:ClassProgress):ReasonRow[]{
 const reactions=new Map(reactionRows(p).map(r=>[r.id,r]));
 const by=new Map<string,ReasonRow>();
 for(const x of p.reasons){
  let r=by.get(x.id);
  if(!r){const re=reactions.get(x.id);r={id:x.id,counts:zero(),answered:0,notes:[],plays:re?.plays??0,up:re?.up??0,down:re?.down??0,ratio:re?.ratio??null,hint:null};by.set(x.id,r);}
  r.answered++;for(const id of x.reasons)r.counts[id]++;
  if(x.note)r.notes.push({at:x.at,note:x.note,play:x.play});
 }
 for(const r of by.values()){r.notes.sort((a,b)=>b.at-a.at);r.hint=reasonHint(r.counts);}
 return [...by.values()].sort((a,b)=>b.answered-a.answered||a.id.localeCompare(b.id));
}
/** 이유마다 많이 나온 활동(문제 이유만, 많은 순). '헷갈렸어요가 많은 게임' 같은 목록. */
export interface TopProblem {reason:ReasonId;label:string;games:{id:string;count:number}[]}
export function topProblems(p:ClassProgress,limit=3):TopProblem[]{
 const rows=reasonRows(p);
 return REASONS.filter(r=>r.negative).map(r=>({reason:r.id,label:r.label,games:rows.filter(x=>x.counts[r.id]>=MIN_REASON_COUNT).map(x=>({id:x.id,count:x.counts[r.id]})).sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id)).slice(0,limit)}))
  .filter(t=>t.games.length).sort((a,b)=>b.games[0].count-a.games[0].count);
}
/** 내보내기 표의 줄(활동 이름은 바깥에서 붙인다). */
export const REASON_EXPORT_HEADERS=['활동','기록한 판','👍','👎','👍 비율',...REASONS.map(r=>r.label),'다음 할 일','최근 메모'];
export function reasonExportRows(p:ClassProgress,nameOf:(id:string)=>string):(string|number)[][]{
 return reasonRows(p).map(r=>[nameOf(r.id),r.plays,r.up,r.down,r.ratio===null?'반응 없음':`${Math.round(r.ratio*100)}%`,...REASONS.map(x=>r.counts[x.id]),r.hint??'-',r.notes.map(n=>n.note).join(' / ')||'-']);
}
/** 요약에 넣는 메모·활동 수. 넘치면 '외 N개'로 알린다. */
export const SUMMARY_NOTES=20,SUMMARY_ACTIVITIES=30;
/** 공유용 짧은 요약(메신저에 붙여 넣기 좋게). 학생 이름 없이 활동·숫자·선생님 메모만. */
export function shareSummary(p:ClassProgress,nameOf:(id:string)=>string,now=new Date()):string{
 const rows=reasonRows(p),reactions=reactionRows(p),problems=topProblems(p);
 const lines=[`[땀방울 원정대 · 우리 반 반응 요약 ${now.toLocaleDateString('ko-KR')}]`,`기록한 판 ${p.plays.length}판 · 반응 ${p.votes.length}개 · 이유 ${p.reasons.length}개`];
 if(problems.length){lines.push('','많이 나온 문제');for(const t of problems)lines.push(`- ${t.label}: ${t.games.map(g=>`${nameOf(g.id)}(${g.count})`).join(', ')}`);}
 const loved=rows.filter(r=>r.counts.loved>=MIN_REASON_COUNT);
 if(loved.length)lines.push('','학생들이 좋아한 활동',...loved.map(r=>`- ${nameOf(r.id)}(${r.counts.loved})`));
 const withHint=rows.filter(r=>r.hint);
 if(withHint.length)lines.push('','다음 할 일',...withHint.map(r=>`- ${nameOf(r.id)}: ${r.hint}`));
 const notes=rows.flatMap(r=>r.notes.map(n=>({...n,id:r.id}))).sort((a,b)=>b.at-a.at);
 if(notes.length){
  lines.push('','최근 메모',...notes.slice(0,SUMMARY_NOTES).map(n=>`- ${nameOf(n.id)}: ${n.note}`));
  if(notes.length>SUMMARY_NOTES)lines.push(`- 외 ${notes.length-SUMMARY_NOTES}개 (전체는 '내보내기' 파일에 있어요)`);
 }
 // 활동마다 판 수와 👍/👎 수: 어떤 게임을 고치거나 늘릴지 정할 때 가장 먼저 보는 숫자.
 lines.push('','활동별 반응 (판 수 · 👍 · 👎)');
 if(reactions.length){
  lines.push(...reactions.slice(0,SUMMARY_ACTIVITIES).map(r=>`- ${nameOf(r.id)}: ${r.plays}판 · 👍 ${r.up} · 👎 ${r.down}${r.ratio===null?'':` (👍 ${Math.round(r.ratio*100)}%)`}`));
  if(reactions.length>SUMMARY_ACTIVITIES)lines.push(`- 외 ${reactions.length-SUMMARY_ACTIVITIES}개 활동`);
 }else lines.push('- 아직 기록이 없어요');
 return lines.join('\n');
}
