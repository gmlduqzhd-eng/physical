import {useEffect} from 'react';
import {setTvMode,useDisplayPrefs} from '../../../application/displayPrefs';

const fullscreenEl=()=>typeof document==='undefined'?null:document.fullscreenElement;
/** 열려 있는 창(확인 창·리모컨 창·음성 설정)이 있으면 Esc는 그 창이 받는다. */
const OPEN_LAYERS='[role="alertdialog"],[role="dialog"],[aria-modal="true"],.fun-remote-panel,.tv-voice[data-open]';
/**
 * TV 모드에서 나가는 길: Esc(열린 창이 없을 때)와, 전체 화면을 브라우저에서 직접 끝냈을 때.
 * 대표 게임 화면이 떠 있는 동안에만 듣는다.
 */
export function useTvModeExit(){
 const {tvMode}=useDisplayPrefs();
 useEffect(()=>{
  if(!tvMode)return;
  // 전체 화면이면 Esc는 브라우저가 전체 화면을 끝내고, 아래 fullscreenchange가 TV 모드를 끈다.
  const key=(e:KeyboardEvent)=>{if(e.key!=='Escape'||e.defaultPrevented||fullscreenEl()||document.querySelector(OPEN_LAYERS))return;setTvMode(false);};
  let was=!!fullscreenEl();
  const fs=()=>{const now=!!fullscreenEl();if(was&&!now)setTvMode(false);was=now;};
  window.addEventListener('keydown',key);document.addEventListener('fullscreenchange',fs);
  return ()=>{window.removeEventListener('keydown',key);document.removeEventListener('fullscreenchange',fs);};
 },[tvMode]);
 return tvMode;
}
