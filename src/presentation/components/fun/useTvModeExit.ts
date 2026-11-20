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
  // 확인 창이 열린 채 Esc를 누르면 브라우저가 전체 화면만 끝낸다(막을 수 없음). 그때는 TV 모드와 창을 그대로 둔다.
  const fs=()=>{const now=!!fullscreenEl();if(was&&!now&&!document.querySelector(OPEN_LAYERS))setTvMode(false);was=now;};
  window.addEventListener('keydown',key);document.addEventListener('fullscreenchange',fs);
  return ()=>{window.removeEventListener('keydown',key);document.removeEventListener('fullscreenchange',fs);};
 },[tvMode]);
 // 대표 게임 화면을 떠날 때 전체 화면이면 나온다(다른 화면에 전체 화면만 남지 않게). TV 모드 설정 자체는 그대로 둔다.
 useEffect(()=>()=>{try{if(fullscreenEl())void document.exitFullscreen?.().catch(()=>{});}catch{/* 전체 화면을 못 쓰는 기기 */}},[]);
 return tvMode;
}
