/**
 * 모둠 이어 넘기: 모둠원이 차례로 줄을 넘어 각자 목표 횟수를 채운다.
 * 걸려도 처음부터가 아니라 멈춘 횟수부터 이어 하고, 목표를 채우면 역할을 바꿔 다음 사람이 도전한다.
 * 학생 이름은 받지 않는다. 모둠 번호와 '몇 번째 차례'만 쓴다.
 */
export const ROPE_MOTIONS=[
 {id:'both',label:'모아 뛰기',emoji:'🪢',hint:'두 발을 모아 가볍게 뛰어요.'},
 {id:'alternate',label:'번갈아 뛰기',emoji:'🏃',hint:'달리듯 한 발씩 번갈아 넘어요.'},
 {id:'seated',label:'앉아서 팔 돌리기',emoji:'🪑',hint:'의자에 앉아 줄 없이 4박자에 맞춰 팔을 돌려요. 뛰기 어려운 친구도 같은 횟수로 인정해요.'},
] as const;
export type RopeMotion=typeof ROPE_MOTIONS[number]['id'];

export const ROPE_GROUPS={min:2,max:8} as const;
export const ROPE_MEMBERS={min:3,max:6} as const;
export const ROPE_TARGETS=[5,10,15,20,30] as const;
export const ROPE_TARGET_LIMIT={min:1,max:99} as const;

export interface RopeGroup {
 /** 이 모둠 한 사람의 목표 횟수(모둠마다 따로 조정할 수 있다). */ target:number;
 /** 지금 도전하는 차례(0부터). members와 같으면 모둠이 다 마쳤다. */ turn:number;
 /** 지금 차례에서 이어 온 횟수. */ done:number;
 /** 지금 차례에서 멈춘 횟수(다시 이어 한 번수). */ stops:number;
}
export interface RopeState {groups:number;members:number;target:number;motion:RopeMotion;teams:RopeGroup[]}

const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,Math.round(n)));
const freshGroup=(target:number):RopeGroup=>({target,turn:0,done:0,stops:0});

export function newRopeState(groups=4,members=4,target=10,motion:RopeMotion='both'):RopeState{
 const g=clamp(groups,ROPE_GROUPS.min,ROPE_GROUPS.max),m=clamp(members,ROPE_MEMBERS.min,ROPE_MEMBERS.max),t=clamp(target,ROPE_TARGET_LIMIT.min,ROPE_TARGET_LIMIT.max);
 return {groups:g,members:m,target:t,motion,teams:Array.from({length:g},()=>freshGroup(t))};
}

export const isFinished=(s:RopeState,g:number)=>s.teams[g].turn>=s.members;
export const remaining=(s:RopeState,g:number)=>isFinished(s,g)?0:s.teams[g].target-s.teams[g].done;
export const finishedCount=(s:RopeState)=>s.teams.filter((_,g)=>isFinished(s,g)).length;
export const started=(s:RopeState)=>s.teams.some(t=>t.turn>0||t.done>0||t.stops>0);

const update=(s:RopeState,g:number,f:(t:RopeGroup)=>RopeGroup):RopeState=>
 g<0||g>=s.groups||isFinished(s,g)?s:{...s,teams:s.teams.map((t,i)=>i===g?f(t):t)};

/** 도전자가 멈췄다: 모둠이 말한 '지금까지 넘은 횟수'를 적는다. 목표에 닿으면 차례를 마친 것으로 본다. */
export function stopAt(s:RopeState,g:number,count:number):RopeState{
 const t=s.teams[g];if(!t)return s;
 const reached=clamp(count,0,t.target);
 if(reached>=t.target)return completeTurn(s,g);
 return update(s,g,x=>({...x,done:Math.max(x.done,reached),stops:x.stops+1}));
}
/** 목표 횟수를 채웠다: 역할을 바꿔 다음 사람이 처음부터 도전한다. */
export function completeTurn(s:RopeState,g:number):RopeState{
 return update(s,g,x=>({...x,turn:x.turn+1,done:0,stops:0}));
}
/** 이 모둠의 목표만 바꾼다(지금 차례에서 넘은 횟수는 새 목표보다 작게 남긴다). */
export function setGroupTarget(s:RopeState,g:number,target:number):RopeState{
 const t=clamp(target,ROPE_TARGET_LIMIT.min,ROPE_TARGET_LIMIT.max);
 return update(s,g,x=>({...x,target:t,done:Math.min(x.done,t-1)}));
}

/** 차례에 따라 도는 역할: 도전 → 다음 사람이 세기 → 그다음이 기록 → 나머지는 자리에서 연습. */
export type RopeRole='도전'|'세기'|'기록'|'연습';
export const ROPE_ROLE_EMOJI:Record<RopeRole,string>={도전:'🪢',세기:'🔢',기록:'✏️',연습:'🔁'};
export function roleOf(members:number,turn:number,member:number):RopeRole{
 const d=((member-turn)%members+members)%members;
 return d===0?'도전':d===1?'세기':d===2?'기록':'연습';
}
/** 화면에 띄우는 한 줄: 몇 번째 사람이 도전 중이고 누가 다음인지(번호는 모둠 안 차례 번호). */
export function turnLine(s:RopeState,g:number):string{
 const t=s.teams[g];
 if(isFinished(s,g))return `🎉 ${s.members}명 모두 성공`;
 const next=t.turn+1<s.members?` · 다음 ${t.turn+2}번째`:' · 마지막 차례';
 return `${t.turn+1}번째 도전${next}`;
}

export function parseRopeState(raw:unknown):RopeState|null{
 if(!raw||typeof raw!=='object')return null;
 const r=raw as Partial<RopeState>;
 const int=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
 if(!int(r.groups,ROPE_GROUPS.min,ROPE_GROUPS.max)||!int(r.members,ROPE_MEMBERS.min,ROPE_MEMBERS.max)||!int(r.target,ROPE_TARGET_LIMIT.min,ROPE_TARGET_LIMIT.max))return null;
 if(!ROPE_MOTIONS.some(m=>m.id===r.motion)||!Array.isArray(r.teams)||r.teams.length!==r.groups)return null;
 const members=r.members as number;
 for(const t of r.teams){
  if(!t||typeof t!=='object')return null;
  if(!int(t.target,ROPE_TARGET_LIMIT.min,ROPE_TARGET_LIMIT.max)||!int(t.turn,0,members)||!int(t.done,0,t.target-1)||!int(t.stops,0,999))return null;
 }
 return {groups:r.groups as number,members,target:r.target as number,motion:r.motion as RopeMotion,teams:r.teams.map(t=>({target:t.target,turn:t.turn,done:t.done,stops:t.stops}))};
}
