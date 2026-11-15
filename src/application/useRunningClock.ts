import {useEffect,useRef,useState} from 'react';

/** 달리는 동안만 흐르는 시계. 화면이 가려진 시간은 세지 않는다. */
export function useRunningClock(running:boolean){
 const [ms,setMs]=useState(0),base=useRef(0);
 useEffect(()=>{if(!running)return;let last=performance.now();const t=setInterval(()=>{const now=performance.now();if(!document.hidden)base.current+=now-last;last=now;setMs(base.current);},100);return()=>clearInterval(t);},[running]);
 return {ms,reset:()=>{base.current=0;setMs(0);}};
}
