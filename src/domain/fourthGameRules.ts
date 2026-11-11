export function axisOccupied(axis:{claimed:boolean;mine:boolean;at:number},serverNow:number){return axis.claimed&&!axis.mine&&serverNow-axis.at<10000;}
export const bossReflectionChoices=(games:readonly string[])=>[
 ...(games.includes('expedition-map')?['단서를 말·몸짓으로 전했어요']:[]),
 ...(games.includes('expedition-ship')?['조종 축과 역할을 바꾸었어요']:[]),
 ...(games.includes('expedition-rescue')?['바람을 보고 구조 작전을 조절했어요']:[]),
 ...(games.includes('expedition-shadow')?['움직임 경로를 기억하고 연결했어요']:[]),
 ...(games.includes('expedition-loop')?['동작과 박자를 연결했어요']:[]),
 '쉬는 친구를 기다리고 작은 동작으로 도왔어요'];
export function rhythmWindow(beat:number,start:number,count:number){return start+(beat-start+1)%count;}
export const stretchCompletion=(performed:boolean[])=>performed.length>0&&performed.every(Boolean)?'complete' as const:'partial' as const;
export const validPhoneFill=(fill:string,options:string[])=>options.includes(fill);
export const activityRoomPaused=(status:string)=>status!=='playing';
export function paceExpeditionSteps<T extends {steps:{seconds:number}[]}>(plans:T[],factor:number):T[]{const safe=[1,1.3,1.6].includes(factor)?factor:1;return plans.map(p=>({...p,steps:p.steps.map(step=>({...step,seconds:Math.ceil(step.seconds*safe)}))}));}
export function safetyChoiceOrder<T>(choices:readonly T[],seed:number,index:number,review:boolean):T[]{return (seed+index+(review?1:0))%2?[...choices].reverse():[...choices];}
export function classroomResultMessage({quiet,partial,queue,online,warning,score}:{quiet:boolean;partial:boolean;queue:number;online:boolean;warning:string;score:number}){
 if(quiet)return '휴식·관찰은 이 기기에 기록하며 수행 완료나 모둠 점수로 제출하지 않아요.';
 const prefix=partial?'일부 수행 기록이며 완료 신고는 보내지 않아요. ':'';
 if(warning)return prefix+warning;
 if(queue>0)return prefix+(online?'참여 기록을 보관했고 서버로 전송 중이에요.':'참여 기록을 보관했어요. 인터넷 연결이 돌아오면 다시 전송해요.');
 return prefix+(score>0?'서버가 점수 요청을 접수했어요. 교사 확인이 필요한 수업은 승인 후 반영돼요.':'0점 참여 기록을 이 기기에 남겼어요.');
}
