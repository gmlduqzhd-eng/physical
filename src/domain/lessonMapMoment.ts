import {MAP_TILES,mapView,type ClassProgress,type MapView} from './classProgress';

/** 수업 끝 화면의 '지도 칸이 열렸어요' 장면에 쓸 값. */
export interface LessonMapMoment {
 /** 이번 수업에서 기록한 판 수(= 새로 연 칸 수). */ gained:number;
 /** 화면에 그릴 지도. 이번 수업으로 한 바퀴를 딱 채웠으면 빈 새 지도 대신 가득 찬 지도를 보여 준다. */ view:MapView;
 /** 이번 수업에서 새로 열린 칸 번호(보여 주는 지도에서). */ fresh:number[];
 /** 이번 수업 중 지도 한 바퀴를 다 돌았으면 true. */ wrapped:boolean;
 /** 이번 수업으로 한 바퀴를 딱 채웠으면 true(새 지도는 아직 0칸). */ full:boolean;
 /** 화면에 크게 보여 줄 한 줄. */ line:string;
}

/** 이번 수업(since~until)에 기록한 판으로 지도 칸이 몇 칸 열렸는지 계산한다. 기록한 판이 없으면 null(장면을 띄우지 않는다). */
export function lessonMapMoment(p:ClassProgress,since:number,until:number):LessonMapMoment|null{
 const gained=p.plays.filter(x=>x.at>=since&&x.at<=until).length;
 if(gained<=0)return null;
 const now=mapView(p);
 const wrapped=gained>now.opened;
 // 한 바퀴를 딱 채운 경우(새 지도 0칸): 빈 지도 대신 다 채운 지도와, 이번 수업에 연 마지막 칸들을 보여 준다.
 if(wrapped&&now.opened===0){
  const tiles=now.tiles.map(t=>({...t,open:true}));
  const last=tiles[MAP_TILES-1];
  const view:MapView={...now,opened:MAP_TILES,tiles,current:{name:last.region,icon:last.icon},nextRegion:null};
  const fresh=Array.from({length:Math.min(gained,MAP_TILES)},(_,i)=>MAP_TILES-Math.min(gained,MAP_TILES)+i);
  return {gained,view,fresh,wrapped,full:true,line:'지도를 한 바퀴 다 채웠어요!'};
 }
 const from=wrapped?0:now.opened-gained;
 const fresh=Array.from({length:Math.max(0,now.opened-from)},(_,i)=>from+i);
 const line=wrapped
  ?`지도를 한 바퀴 다 돌았어요! 새 지도 ${now.opened}/${MAP_TILES}칸`
  :`지도 칸이 ${gained}칸 열렸어요!`;
 return {gained,view:now,fresh,wrapped,full:false,line};
}

/**
 * 칸이 차례로 튀어나오는 연출에 걸리는 시간(밀리초). 장면 자체는 선생님이 '닫기'를 누를 때까지 그대로 둔다:
 * 저절로 접히면 아래 내용(👍/👎 반응 칸)이 갑자기 위로 올라와 잘못 누르기 쉽다.
 */
export const MAP_MOMENT_MS=3200;
