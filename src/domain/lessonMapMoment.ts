import {MAP_TILES,mapView,type ClassProgress,type MapView} from './classProgress';

/** 수업 끝 화면의 '지도 칸이 열렸어요' 장면에 쓸 값. */
export interface LessonMapMoment {
 /** 이번 수업에서 기록한 판 수(= 새로 연 칸 수). */ gained:number;
 /** 지금 지도. */ view:MapView;
 /** 이번 수업에서 새로 열린 칸 번호(지금 바퀴에 보이는 것만). */ fresh:number[];
 /** 이번 수업 중 지도 한 바퀴를 다 돌았으면 true. */ wrapped:boolean;
 /** 화면에 크게 보여 줄 한 줄. */ line:string;
}

/** 이번 수업(since~until)에 기록한 판으로 지도 칸이 몇 칸 열렸는지 계산한다. 기록한 판이 없으면 null(장면을 띄우지 않는다). */
export function lessonMapMoment(p:ClassProgress,since:number,until:number):LessonMapMoment|null{
 const gained=p.plays.filter(x=>x.at>=since&&x.at<=until).length;
 if(gained<=0)return null;
 const view=mapView(p);
 const wrapped=gained>view.opened;
 const from=wrapped?0:view.opened-gained;
 const fresh=Array.from({length:Math.max(0,view.opened-from)},(_,i)=>from+i);
 const line=wrapped
  ?`지도를 한 바퀴 다 돌았어요! 새 지도 ${view.opened}/${MAP_TILES}칸`
  :`지도 칸이 ${gained}칸 열렸어요!`;
 return {gained,view,fresh,wrapped,line};
}

/** 장면을 보여 주는 시간(밀리초). */
export const MAP_MOMENT_MS=3200;
