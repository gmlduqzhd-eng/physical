/**
 * 역할 교대: 모둠이 차례로 '도전 → 쉬기(안전 구역 연습) → 준비'를 돌며, 신호마다 기다리던 모둠이 도전으로 돌아온다.
 * 역할이 특정 모둠에 고정되지 않게 하고, 모든 모둠이 한 번 이상 도전했는지 보여 준다. 점수는 반 전체 교대 횟수만 센다.
 */
export const SWAP_GROUPS={min:2,max:8} as const;
export const SWAP_SECONDS=[30,60,90,120] as const;
export type SwapRole='도전'|'준비'|'연습';
export const SWAP_ROLE_TEXT:Record<SwapRole,{emoji:string;hint:string}>={
 도전:{emoji:'🎯',hint:'도전 구역에서 활동해요'},
 준비:{emoji:'🔜',hint:'다음 신호에 들어가요. 줄을 서서 기다려요'},
 연습:{emoji:'🔁',hint:'안전 구역에서 같은 동작을 연습해요'},
};
export interface SwapState {
 groups:number;
 /** 한 번에 도전하는 모둠 수. */ active:number;
 /** 한 번 도전하는 시간(초). */ seconds:number;
 /** 지금까지 바꾼 횟수(반 전체 점수). */ swaps:number;
 /** 한 번 이상 도전한 모둠 번호(0부터). */ challenged:number[];
}
const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,Math.round(n)));
export function newSwapState(groups=4,active=1,seconds=60):SwapState{
 const g=clamp(groups,SWAP_GROUPS.min,SWAP_GROUPS.max),a=clamp(active,1,Math.max(1,g-1));
 const s=(SWAP_SECONDS as readonly number[]).includes(seconds)?seconds:60;
 return {groups:g,active:a,seconds:s,swaps:0,challenged:Array.from({length:a},(_,i)=>i)};
}
/** 지금 도전하는 모둠: 교대할 때마다 active칸씩 앞으로 돈다. */
export function challengers(s:SwapState,swaps=s.swaps):number[]{
 return Array.from({length:s.active},(_,i)=>(swaps*s.active+i)%s.groups);
}
export function roleOfGroup(s:SwapState,g:number):SwapRole{
 if(challengers(s).includes(g))return '도전';
 if(challengers(s,s.swaps+1).includes(g))return '준비';
 return '연습';
}
export function swap(s:SwapState):SwapState{
 const next={...s,swaps:s.swaps+1};
 return {...next,challenged:[...new Set([...s.challenged,...challengers(next)])].sort((a,b)=>a-b)};
}
export const everyoneChallenged=(s:SwapState)=>s.challenged.length>=s.groups;
export function parseSwapState(raw:unknown):SwapState|null{
 if(!raw||typeof raw!=='object')return null;
 const r=raw as Partial<SwapState>;
 const int=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
 if(!int(r.groups,SWAP_GROUPS.min,SWAP_GROUPS.max))return null;
 const g=r.groups as number;
 if(!int(r.active,1,Math.max(1,g-1))||!(SWAP_SECONDS as readonly number[]).includes(r.seconds as number)||!int(r.swaps,0,9999))return null;
 if(!Array.isArray(r.challenged)||!r.challenged.every(x=>int(x,0,g-1)))return null;
 return {groups:g,active:r.active as number,seconds:r.seconds as number,swaps:r.swaps as number,challenged:[...new Set(r.challenged as number[])].sort((a,b)=>a-b)};
}
