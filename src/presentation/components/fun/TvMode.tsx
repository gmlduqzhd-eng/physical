import {getDisplayPrefs} from '../../../application/displayPrefs';
import {TvModeButton} from '../DisplayButtons';

const fullscreenEl=()=>typeof document==='undefined'?null:document.fullscreenElement;
/** TV 모드를 켜는 손동작 안에서 전체 화면도 청한다(막히면 그냥 TV 모드만 켠다). 끄면 전체 화면에서도 나온다. */
function syncFullscreen(){
 try{
  if(getDisplayPrefs().tvMode){if(!fullscreenEl())void document.documentElement.requestFullscreen?.().catch(()=>{});}
  else if(fullscreenEl())void document.exitFullscreen?.().catch(()=>{});
 }catch{/* 전체 화면을 못 쓰는 기기: TV 모드만 */}
}
/** 대표 게임의 TV 모드 단추: 누르면 TV 모드를 바꾸고, 켤 때 전체 화면을 청한다. */
export function TvModeControl({className}:{className?:string}){
 // 단추의 클릭이 먼저 TV 모드를 바꾼 뒤 여기로 올라온다(같은 손동작 안이라 전체 화면을 청할 수 있다).
 return <span className="fun-tv-control" onClick={syncFullscreen}><TvModeButton className={className}/></span>;
}
