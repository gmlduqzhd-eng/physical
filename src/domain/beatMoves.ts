/**
 * 8박 동작 만들기: 모둠이 4박짜리 동작 줄 두 개를 골라 8박으로 잇고, 박자에 맞춰 연습한 뒤 TV로 차례로 발표한다.
 * 동작이 맞았는지는 모둠과 선생님이 눈으로 확인한다(카메라·마이크를 쓰지 않는다).
 */
export const BEAT_CARDS=[
 {id:'clap',label:'손뼉',emoji:'👏'},
 {id:'step',label:'발 디딤',emoji:'🦶'},
 {id:'arms',label:'팔 동작',emoji:'🙌'},
 {id:'rest',label:'쉼',emoji:'·'},
] as const;
export type BeatCard=typeof BEAT_CARDS[number]['id'];
export const BEAT_GROUPS={min:2,max:8} as const;
export const BEAT_TEMPOS=[{bpm:60,label:'천천히'},{bpm:80,label:'보통'},{bpm:100,label:'빠르게'}] as const;

/** 처음 고를 때 쓰는 예시 4박 줄(모둠이 바꾼다). */
export const BEAT_STARTERS:readonly (readonly BeatCard[])[]=[
 ['clap','clap','step','rest'],['step','step','arms','rest'],['arms','clap','arms','clap'],['step','rest','step','clap'],
];
export interface BeatGroup {pattern:BeatCard[]}
export interface BeatState {groups:number;bpm:number;teams:BeatGroup[]}

const isCard=(v:unknown):v is BeatCard=>BEAT_CARDS.some(c=>c.id===v);
const starter=(g:number):BeatCard[]=>[...BEAT_STARTERS[g%BEAT_STARTERS.length],...BEAT_STARTERS[(g+1)%BEAT_STARTERS.length]];
export function newBeatState(groups=4,bpm=80):BeatState{
 const n=Math.min(BEAT_GROUPS.max,Math.max(BEAT_GROUPS.min,Math.round(groups)));
 return {groups:n,bpm:BEAT_TEMPOS.some(t=>t.bpm===bpm)?bpm:80,teams:Array.from({length:n},(_,g)=>({pattern:starter(g)}))};
}
/** g모둠의 i번째 박을 다음 카드로 바꾼다(누를 때마다 손뼉 → 발 → 팔 → 쉼). */
export function cycleBeat(s:BeatState,g:number,i:number):BeatState{
 if(!s.teams[g]||i<0||i>7)return s;
 return {...s,teams:s.teams.map((t,k)=>k!==g?t:{pattern:t.pattern.map((c,j)=>j!==i?c:BEAT_CARDS[(BEAT_CARDS.findIndex(x=>x.id===c)+1)%BEAT_CARDS.length].id)})};
}
/** 쉼만 있는 줄은 발표할 수 없다(모두가 움직일 동작이 하나는 있어야). */
export const hasMove=(p:readonly BeatCard[])=>p.some(c=>c!=='rest');
export const beatMs=(bpm:number)=>Math.round(60000/bpm);
/** 발표 순서: 모둠마다 8박을 두 번씩, 1모둠부터. tick번째 박이 어느 모둠의 몇 번째 박인지. */
export function showAt(s:BeatState,tick:number,repeats=2):{group:number;beat:number;round:number}|null{
 const per=8*repeats,group=Math.floor(tick/per);
 if(tick<0||group>=s.groups)return null;
 const inGroup=tick%per;
 return {group,beat:inGroup%8,round:Math.floor(inGroup/8)};
}
export const BEAT_REFLECTION=['박자가 맞았나요? 어디에서 빨라지거나 늦어졌나요?','모둠 친구 모두가 동작을 맡았나요?'] as const;
export function parseBeatState(raw:unknown):BeatState|null{
 if(!raw||typeof raw!=='object')return null;
 const r=raw as Partial<BeatState>;
 if(typeof r.groups!=='number'||!Number.isInteger(r.groups)||r.groups<BEAT_GROUPS.min||r.groups>BEAT_GROUPS.max)return null;
 if(!BEAT_TEMPOS.some(t=>t.bpm===r.bpm)||!Array.isArray(r.teams)||r.teams.length!==r.groups)return null;
 if(!r.teams.every(t=>t&&Array.isArray(t.pattern)&&t.pattern.length===8&&t.pattern.every(isCard)))return null;
 return {groups:r.groups,bpm:r.bpm as number,teams:r.teams.map(t=>({pattern:[...t.pattern]}))};
}
