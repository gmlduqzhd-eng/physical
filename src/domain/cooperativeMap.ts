import {STATION_NAMES,type Station} from './flagship.js';

export const MAP_GESTURES=[{id:'open',label:'손바닥 펴기',icon:'✋'},{id:'wings',label:'팔 작게 펼치기',icon:'↔'},{id:'knees',label:'양손 무릎 가볍게 짚기',icon:'↓'}] as const;
export type MapGesture=typeof MAP_GESTURES[number]['id'];
export type MapBrief={role:'first'|'last'|'signal'|'combined';title:string;text:string;signals?:MapGesture[]};
export type MapRules={version:2;brief:MapBrief|null;history:{station:Station;gesture:MapGesture}[]};
const ORDERS:readonly (readonly Station[])[]=[['river','tower','forest'],['tower','forest','river'],['forest','river','tower'],['river','forest','tower'],['forest','tower','river'],['tower','river','forest']];
export function cooperativeMapOrder(seed:number,override='auto'):Station[]{
 if(override==='river-tower-forest'||override==='tower-forest-river')return override.split('-') as Station[];
 return [...ORDERS[((Math.trunc(seed)%6)+6)%6]];
}
export function mapGestures(seed:number):MapGesture[]{return Array.from({length:3},(_,i)=>MAP_GESTURES[((Math.floor(seed/6)+i)%3+3)%3].id);}
export function mapBrief(index:number,teams:number,seed:number,override='auto'):MapBrief{
 const order=cooperativeMapOrder(seed,override),signals=mapGestures(seed),signalText=signals.map((id,i)=>`${i+1}번 문 ${MAP_GESTURES.find(g=>g.id===id)!.label}`).join(' → ');
 if(teams===1)return {role:'combined',title:'혼자 해 보는 연습 힌트',text:`첫 길은 ${STATION_NAMES[order[0]]}, 마지막은 ${STATION_NAMES[order[2]]}이에요. ${signalText}`,signals};
 if(index%Math.min(teams,3)===0)return {role:'first',title:'첫 길 모둠',text:`첫 길은 ${STATION_NAMES[order[0]]}이에요. 다른 모둠에게 몸짓으로 알려 줘요.${teams===2?' 몸짓 약속: '+signalText:''}`,...(teams===2?{signals}:{})};
 if(index%Math.min(teams,3)===1)return {role:'last',title:'마지막 길 모둠',text:`마지막 길은 ${STATION_NAMES[order[2]]}이에요. 첫 길을 물어보고 가운데 길을 함께 찾아요.`};
 return {role:'signal',title:'몸짓 약속 모둠',text:`길 힌트는 다른 모둠에게 물어봐요. 몸짓 약속: ${signalText}. 문마다 몸짓으로 알려 줘요.`,signals};
}
/**
 * 수업방(서버)이 보내는 힌트 글에는 예전 낱말(단서·관문·운반 약속·탐사단)이 남아 있다.
 * 화면에 보여 줄 때 1~2학년도 읽을 수 있는 말로 바꾼다. 이미 쉬운 말이면 그대로 둔다.
 */
export function easyMapWords(text:string){
 return text.replace('혼자 연결하는 연습 단서','혼자 해 보는 연습 힌트').replace('첫 길 탐사단','첫 길 모둠').replace('도착지 연결단','마지막 길 모둠').replace('운반 약속 설계단','몸짓 약속 모둠')
  .replace(/(\d)관문/g,'$1번 문').replaceAll('관문마다','문마다').replaceAll('운반 약속','몸짓 약속').replaceAll('단서','힌트').replaceAll('몸짓으로 전해요','몸짓으로 알려 줘요');
}
export function mapAgreement(station:Station,gesture:string,phase:number,seed:number,override='auto'){return station===cooperativeMapOrder(seed,override)[phase]&&gesture===mapGestures(seed)[phase];}
export const SUPPORT_CHOICES=[{id:'need-clue',label:'단서를 연결해 주세요'},{id:'need-partner',label:'역할·조작을 같이 맞춰요'},{id:'need-rhythm',label:'박자를 함께 연습해요'},{id:'offering',label:'도움을 줄 준비가 됐어요'},{id:'none',label:'지금은 괜찮아요'}] as const;
export type SupportKind=typeof SUPPORT_CHOICES[number]['id'];
