import {useCallback,useEffect,useRef,useState} from 'react';

/**
 * 달리는 동안 실제로 흐른 시간을 잰다. 다른 탭이나 화면을 보고 와도 그 시간까지 센다.
 * 멈추면 그때까지의 시간을 쌓아 두고, 다시 달리면 이어서 센다.
 */
export function useRunningClock(running:boolean){
 const [ms,setMs]=useState(0),base=useRef(0),start=useRef<number|null>(null);
 const read=useCallback(()=>base.current+(start.current===null?0:performance.now()-start.current),[]);
 useEffect(()=>{
  if(!running)return;
  start.current=performance.now();
  const tick=()=>setMs(read());
  const timer=setInterval(tick,100);document.addEventListener('visibilitychange',tick);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);if(start.current!==null)base.current+=performance.now()-start.current;start.current=null;setMs(base.current);};
 },[running,read]);
 const reset=useCallback(()=>{base.current=0;if(start.current!==null)start.current=performance.now();setMs(0);},[]);
 return {ms,read,reset};
}
