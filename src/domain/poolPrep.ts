/**
 * 생존수영 '수영장 가기 전': 선생님이 학교·시설 안내를 확인해 적은 내용으로 TV 확인 질문과 인쇄용 참관 과제를 만든다.
 * 실제 안내(장소·이동·시설 규칙)는 학교마다 달라서 앱이 정해 두지 않는다. 학생 이름은 받지 않는다.
 */
export interface PoolPrep {date:string;place:string;travel:string;items:string[];promises:string[]}
export const POOL_DEFAULT_ITEMS=['수영복','수모(수영 모자)','물안경','수건','갈아입을 옷과 젖은 옷 담을 봉투'] as const;
export const EMPTY_POOL:PoolPrep={date:'',place:'',travel:'',items:[...POOL_DEFAULT_ITEMS],promises:[]};
const MAX_TEXT=80,MAX_LINES=10;
const clean=(v:unknown)=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,MAX_TEXT):'';
const lines=(v:unknown)=>Array.isArray(v)?v.map(clean).filter(Boolean).slice(0,MAX_LINES):[];
export function parsePoolPrep(raw:unknown):PoolPrep{
 if(!raw||typeof raw!=='object')return EMPTY_POOL;
 const r=raw as Record<string,unknown>;
 return {date:clean(r.date),place:clean(r.place),travel:clean(r.travel),items:Array.isArray(r.items)?lines(r.items):[...POOL_DEFAULT_ITEMS],promises:lines(r.promises)};
}
/** 여러 줄 글을 줄 목록으로(빈 줄은 뺀다). */
export const splitLines=(text:string)=>lines(text.split('\n'));
/** TV에서 함께 확인할 질문. 선생님이 적은 내용으로만 만든다(적지 않은 칸은 묻지 않는다). */
export function poolQuestions(p:PoolPrep):{q:string;a:string}[]{
 const out:{q:string;a:string}[]=[];
 if(p.date||p.place)out.push({q:'언제, 어디로 가나요?',a:[p.date,p.place].filter(Boolean).join(' · ')});
 if(p.travel)out.push({q:'어떻게 이동하나요? 이동할 때 지킬 약속은?',a:p.travel});
 if(p.items.length)out.push({q:'꼭 챙길 준비물은 무엇인가요?',a:p.items.join(', ')});
 p.promises.forEach((x,i)=>out.push({q:`우리 학교 약속 ${i+1}. 무엇일까요?`,a:x}));
 out.push({q:'친구가 물에서 힘들어 보이면 어떻게 하나요?',a:'물에 들어가지 않고, 크게 알리고 선생님·안전요원에게 바로 알려요.'});
 return out;
}
