import {useEffect,type RefObject} from 'react';

/**
 * 리모컨 막대(fun-dock)를 그릴 자리. body 맨 앞에 두어, Tab을 누르면 왼쪽 위 '← 목록'·TV 모드 단추에 먼저 닿게 한다
 * (게임 무대는 body 끝에 그려지므로, 막대가 무대보다 앞에 오지 않으면 나가기 단추가 Tab 순서의 맨 끝이 된다).
 */
export function funDockHost():HTMLElement{
 let el=document.getElementById('fun-dock-host');
 if(!el){el=document.createElement('div');el.id='fun-dock-host';document.body.prepend(el);}
 return el;
}

/**
 * 막대가 실제로 차지하는 너비를 재서 머리줄이 그만큼만 비켜 서게 한다(글씨 크기를 키우거나 이름이 긴 게임에서도 겹치지 않게).
 * --fun-dock-left: 왼쪽 '← 목록'의 오른쪽 끝(px), --fun-dock-right: 오른쪽 단추 무리가 오른쪽 끝에서 차지하는 너비(px).
 */
export function useDockInsets(dock:RefObject<HTMLElement|null>,active:boolean){
 useEffect(()=>{
  const el=dock.current;if(!active||!el||typeof ResizeObserver==='undefined')return;
  const root=document.documentElement;
  const measure=()=>{
   let left=0,right=0;
   for(const child of Array.from(el.children) as HTMLElement[]){
    const r=child.getBoundingClientRect();if(!r.width||!r.height)continue;
    if(child.classList.contains('fun-exit'))left=Math.max(left,r.right);
    else right=Math.max(right,window.innerWidth-r.left);
   }
   root.style.setProperty('--fun-dock-left',`${Math.ceil(left)}px`);
   root.style.setProperty('--fun-dock-right',`${Math.ceil(right)}px`);
  };
  measure();
  const ro=new ResizeObserver(measure);ro.observe(el);for(const child of Array.from(el.children))ro.observe(child);
  const mo=new MutationObserver(()=>{for(const child of Array.from(el.children))ro.observe(child);measure();});mo.observe(el,{childList:true,subtree:true,characterData:true});
  window.addEventListener('resize',measure);
  return ()=>{ro.disconnect();mo.disconnect();window.removeEventListener('resize',measure);root.style.removeProperty('--fun-dock-left');root.style.removeProperty('--fun-dock-right');};
 },[dock,active]);
}
