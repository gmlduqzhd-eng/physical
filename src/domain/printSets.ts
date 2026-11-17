import {SAFETY_LESSONS,isSafetyLessonId} from './safetyLessons.js';

/** 인쇄용 표식·카드. 선생님이 직접 만들어야 했던 숫자·모양·색 표식과 안전 수업 카드를 A4로 뽑는다. */
export interface PrintCard {big:string;label?:string;color?:string;text?:string}
export interface PrintSet {id:string;title:string;note:string;cards:PrintCard[];size:'big'|'card'}
const COLOR={빨강:'#c62828',파랑:'#1565c0',노랑:'#b8860b',초록:'#2e7d32',보라:'#6a1b9a',주황:'#d84315'} as const;
const numbers=(n:number):PrintCard[]=>Array.from({length:n},(_,i)=>({big:String(i+1)}));
const BASE_SETS:PrintSet[]=[
 {id:'numbers9',title:'번호 표식 1~9',note:'3줄 × 3칸으로 놓아요. 막힌 길 피해 가기에 써요.',cards:numbers(9),size:'big'},
 {id:'numbers8',title:'숫자 카드 1~8',note:'바닥에 한 줄로 1m씩 띄워 놓아요. 모둠 숫자 사다리에 써요.',cards:numbers(8),size:'big'},
 {id:'numbers6',title:'번호 표식 1~6',note:'숫자 암호 우편·빈 섬 탐사대에 써요.',cards:numbers(6),size:'big'},
 {id:'numbers4',title:'번호 자리 1~4',note:'콘 순서 맞추기의 번호 자리에 써요.',cards:numbers(4),size:'big'},
 {id:'shapes4',title:'색·모양 표식 4개',note:'기억의 발자국·모양 순서 기억해 걷기·색과 글자 갈림길에 써요.',cards:[{big:'●',label:'빨강',color:COLOR.빨강},{big:'▲',label:'파랑',color:COLOR.파랑},{big:'■',label:'노랑',color:COLOR.노랑},{big:'◆',label:'초록',color:COLOR.초록}],size:'big'},
 {id:'spots6',title:'우리 자리 찾기 표식 6개',note:'2줄 × 3칸, 1.5m씩 띄워 놓아요.',cards:[{big:'●',label:'빨강',color:COLOR.빨강},{big:'▲',label:'파랑',color:COLOR.파랑},{big:'■',label:'노랑',color:COLOR.노랑},{big:'◆',label:'초록',color:COLOR.초록},{big:'★',label:'보라',color:COLOR.보라},{big:'♥',label:'주황',color:COLOR.주황}],size:'big'},
];
const PICTURES:Record<string,PrintCard[]>={
 'aed-defibrillator-pad':[{big:'⚡',label:'AED(자동심장충격기)'},{big:'🔘',label:'전원 버튼'},{big:'🩹',label:'패드 붙이기'},{big:'✋',label:'모두 손 떼기'},{big:'📞',label:'119 신고'}],
 'rice-treatment-firstaid':[{big:'✋',label:'멈추기'},{big:'🧺',label:'수건'},{big:'🧊',label:'얼음팩'},{big:'🧑‍🏫',label:'어른에게 알리기'},{big:'🏥',label:'보건실'}],
 'cpr-compression-110':[{big:'👀',label:'주변 살피기'},{big:'📞',label:'119 신고'},{big:'⚡',label:'AED 가져오기'},{big:'🧑‍🏫',label:'어른 부르기'}],
 'water-rescue-throw':[{big:'🛟',label:'구명환 던지기'},{big:'🗣️',label:'큰 소리로 알리기'},{big:'🚫',label:'물에 들어가지 않기'},{big:'📞',label:'119 신고'}],
 'heatwave-pm25-shield':[{big:'🌡️',label:'폭염 경보'},{big:'😷',label:'미세먼지 나쁨'},{big:'🏫',label:'실내로 옮기기'},{big:'💧',label:'물 마시기'},{big:'🌳',label:'그늘에서 쉬기'}],
};
/** 안전 수업 한 개의 카드: 그림 카드와 상황 카드(상황·두 선택지). */
export function safetyPrintSet(id:string):PrintSet|null{
 if(!isSafetyLessonId(id))return null;const lesson=SAFETY_LESSONS[id];
 return {id,title:`${lesson.name} 카드`,note:'그림 카드는 역할극에서 가리키는 데 쓰고, 상황 카드는 모둠마다 한 장씩 나눠 읽어요.',size:'card',
  cards:[...(PICTURES[id]??[]),...lesson.scenarios.map(s=>({big:'?',label:s.title,text:`${s.situation}\n① ${s.choices[0].label}\n② ${s.choices[1].label}`}))]};
}
export function printSet(id:string|null|undefined):PrintSet|null{return BASE_SETS.find(s=>s.id===id)??safetyPrintSet(id??'');}
export const PRINT_SET_IDS=BASE_SETS.map(s=>s.id);
/** 활동마다 필요한 인쇄물. 준비 안내 옆에 링크로 보여 준다. */
export const PRINT_FOR_ACTIVITY:Record<string,string>={
 zigzag:'numbers9','exp-tablet-07':'numbers8','exp-phone-06':'numbers6','space-occupier':'numbers6','exp-tablet-35':'numbers4',
 'exp-phone-05':'shapes4',memory:'shapes4','exp-tablet-06':'shapes4','exp-tablet-01':'spots6',
 'cpr-compression-110':'cpr-compression-110','aed-defibrillator-pad':'aed-defibrillator-pad','water-rescue-throw':'water-rescue-throw','heatwave-pm25-shield':'heatwave-pm25-shield','rice-treatment-firstaid':'rice-treatment-firstaid',
};
export const printHref=(activity:string)=>PRINT_FOR_ACTIVITY[activity]?`/print?set=${PRINT_FOR_ACTIVITY[activity]}`:null;
