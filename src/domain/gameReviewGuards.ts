// Monotonic visible/signal time only; missing frames never consume a target.
export function createActiveClock(start:number){let previous=start,elapsed=0;return {sample(now:number,blocked:boolean){const delta=Math.max(0,now-previous);previous=now;if(!blocked)elapsed+=delta;return elapsed;}};}
