import {useEffect} from 'react';

/** 화면이 늦게 그려져도(나눠 받는 화면) 첫 본문 구역에 id="main"을 달아 '본문으로 건너뛰기'가 갈 자리를 만든다. */
function markMain(){
 const main=document.querySelector<HTMLElement>('#main')??document.querySelector<HTMLElement>('main,[role=main]');
 if(!main)return false;
 if(!main.id)main.id='main';
 if(!main.hasAttribute('tabindex'))main.setAttribute('tabindex','-1');
 return true;
}
import {useLocation} from 'react-router-dom';
import {playIdOf,routeTitle} from '../../domain/routeTitles';
import './RouteTitle.css';

/** 주소가 바뀔 때 탭 제목을 맞추고, 키보드 사용자가 머리글을 건너뛸 수 있는 링크를 맨 앞에 둔다. */
export function RouteTitle(){
 const {pathname,search}=useLocation();
 useEffect(()=>{
  document.title=routeTitle(pathname,undefined,search);
  const id=playIdOf(pathname);if(!id)return;
  let live=true;
  // 놀이 이름표는 놀이 화면이 어차피 받는 묶음에 있다. 여기서는 제목에만 쓴다.
  // 놀이 화면이 여는 놀이는 모두 GAMES에 있으므로, 없으면 '찾을 수 없는 놀이'로 둔다.
  void import('../../domain/gamesData').then(m=>{const name=m.GAMES.find(game=>game.type===id)?.name??null;if(live)document.title=routeTitle(pathname,name);}).catch(()=>{});
  return()=>{live=false;};
 },[pathname,search]);
 useEffect(()=>{
  if(markMain())return;
  const watch=new MutationObserver(()=>{if(markMain())watch.disconnect();});
  watch.observe(document.body,{childList:true,subtree:true});
  const stop=window.setTimeout(()=>watch.disconnect(),10000);
  return()=>{watch.disconnect();window.clearTimeout(stop);};
 },[pathname]);
 const skip=(event:React.MouseEvent)=>{
  const main=document.querySelector<HTMLElement>('main,[role=main]');if(!main)return;
  event.preventDefault();if(!main.hasAttribute('tabindex'))main.setAttribute('tabindex','-1');
  main.focus({preventScroll:true});main.scrollIntoView({block:'start'});
 };
 // 바로 가기 링크도 구역(nav) 안에 둬야 화면 읽기에서 '구역 밖 내용'이 되지 않는다.
 return <nav className="skip-nav" aria-label="바로 가기"><a className="skip-link" href="#main" onClick={skip}>본문으로 건너뛰기</a></nav>;
}
