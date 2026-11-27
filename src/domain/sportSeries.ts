/**
 * 종목 연속 차시: 같은 종목의 기능을 여러 차시에 걸쳐 쉬운 것부터 이어 연습한다.
 * 차시마다 종목 교실 한 차시(준비운동 → 미션 → 준비·안전 → 경기 → 시상 → 돌아보기)를 그 차시의 규칙 수준으로 연다.
 * 규칙과 관찰 문장은 이 앱이 직접 쓴 것이다.
 */
export type SeriesLevel='easy'|'basic'|'hard';
export interface SeriesLesson {
 no:number;title:string;
 /** 종목 교실에서 고를 규칙 수준. */ level:SeriesLevel;
 /** 이번 차시에 할 것 3줄(종목 교실 화면 위 띠에도 보인다). */ rules:readonly [string,string,string];
 /** 선생님이 이번 차시에 지켜볼 동작 한 가지. */ watch:string;
 /** 다시 할지 고르는 기준(어려워하는 반은 이 차시를 한 번 더). */ repeatIf:string;
}
export interface SportSeries {id:string;sport:string;name:string;icon:string;summary:string;lessons:readonly SeriesLesson[]}

export const SPORT_SERIES:readonly SportSeries[]=[
 {id:'badminton-3',sport:'badminton',name:'배드민턴 3차시',icon:'🏸',summary:'셔틀 다루기 → 서브와 짝 랠리 → 간단한 2대2 경기',lessons:[
  {no:1,title:'셔틀과 친해지기',level:'easy',
   rules:['풍선이나 셔틀을 라켓(또는 책)으로 혼자 위로 톡톡 쳐 올려요.','열 번이 되면 짝과 마주 보고 부드럽게 주고받아요.','떨어뜨려도 괜찮아요. 주운 자리에서 다시 시작해요.'],
   watch:'라켓 면이 하늘을 보게 하고, 팔 전체가 아니라 손목으로 가볍게 치는가',
   repeatIf:'혼자 쳐 올리기가 다섯 번을 넘기 어려우면 1차시를 한 번 더 해요.'},
  {no:2,title:'서브와 짝 랠리',level:'basic',
   rules:['서브는 허리 아래에서 위로, 짝이 받기 쉬운 곳으로 보내요.','짝과 주고받은 횟수를 함께 세요. 우리 짝 최고 기록을 넘겨 봐요.','세게 치기보다 오래 이어 가기가 목표예요.'],
   watch:'셔틀이 오기 전에 발을 먼저 옮겨 셔틀 아래로 들어가는가',
   repeatIf:'짝 랠리가 다섯 번 이어지지 않는 짝이 많으면 2차시를 한 번 더 해요.'},
  {no:3,title:'간단한 규칙의 2대2',level:'basic',
   rules:['두 명이 한 팀. 바닥에 줄이나 테이프를 놓아 네트로 써요.','떨어뜨리면 상대 팀 1점, 점수가 날 때마다 서브를 번갈아 해요.','7점을 먼저 내면 끝. 끝나면 상대 팀과 인사하고 짝을 바꿔요.'],
   watch:'짝과 "내가!" 하고 말로 신호를 주고받아 겹치지 않게 움직이는가',
   repeatIf:'경기보다 랠리가 어려우면 7점 대신 "다섯 번 주고받으면 1점"으로 바꿔요.'},
 ]},
];
export const SERIES_BY_ID=new Map(SPORT_SERIES.map(s=>[s.id,s]));

/** 반마다 마친 차시 번호(이 기기에만). */
export type SeriesProgress=Record<string,number[]>;
export function parseSeriesProgress(raw:unknown):SeriesProgress{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
 const out:SeriesProgress={};
 for(const [id,v] of Object.entries(raw as Record<string,unknown>)){
  const series=SERIES_BY_ID.get(id);
  if(!series||!Array.isArray(v))continue;
  const nos=[...new Set(v.filter((n):n is number=>typeof n==='number'&&series.lessons.some(l=>l.no===n)))].sort((a,b)=>a-b);
  if(nos.length)out[id]=nos;
 }
 return out;
}
export function markLesson(p:SeriesProgress,seriesId:string,no:number,done:boolean):SeriesProgress{
 const series=SERIES_BY_ID.get(seriesId);
 if(!series?.lessons.some(l=>l.no===no))return p;
 const set=new Set(p[seriesId]??[]);if(done)set.add(no);else set.delete(no);
 const next={...p};if(set.size)next[seriesId]=[...set].sort((a,b)=>a-b);else delete next[seriesId];
 return next;
}
/** 다음에 할 차시: 아직 안 한 첫 차시(모두 했으면 null). */
export function nextLesson(p:SeriesProgress,series:SportSeries):SeriesLesson|null{
 return series.lessons.find(l=>!(p[series.id]??[]).includes(l.no))??null;
}
/** 종목 교실로 여는 주소(규칙 수준과 차시 띠가 함께 열린다). */
export const seriesLessonPath=(series:SportSeries,no:number)=>`/sports/${series.sport}?${new URLSearchParams({series:series.id,lesson:String(no)}).toString()}`;
/** 주소에서 차시를 읽는다. 종목이 다르거나 없는 차시면 null. */
export function seriesFromQuery(sport:string,seriesId:string|null,lesson:string|null):{series:SportSeries;lesson:SeriesLesson}|null{
 const series=seriesId?SERIES_BY_ID.get(seriesId):undefined;
 const l=series?.lessons.find(x=>String(x.no)===lesson);
 return series&&l&&series.sport===sport?{series,lesson:l}:null;
}
