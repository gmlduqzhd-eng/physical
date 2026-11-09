import {useCallback,useEffect,useRef,useState} from 'react';
import {relativeTilt,requestOrientationAccess,screenTilt} from './shipOrientation';

type Status='off'|'requesting'|'waiting'|'tracking'|'lost'|'denied'|'unsupported';
export function useShipOrientation(blocked:boolean) {
 const [enabled,setEnabled]=useState(false),[status,setStatus]=useState<Status>('off');
 const generation=useRef(0),center=useRef<number|null>(null),signal=useRef<{raw:number;value:number;at:number}|null>(null);
 const stop=useCallback(()=>{generation.current++;signal.current=null;center.current=null;setEnabled(false);setStatus('off');},[]);
 useEffect(()=>{if(blocked)stop();},[blocked,stop]);
 useEffect(()=>{const lifecycle=generation;const hide=()=>{if(document.hidden)stop();};const leave=()=>stop();document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',leave);return()=>{lifecycle.current++;document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',leave);signal.current=null;};},[stop]);
 const start=useCallback(async()=>{
  if(blocked)return;const epoch=++generation.current;signal.current=null;center.current=null;setStatus('requesting');
  const result=await requestOrientationAccess(window);
  if(epoch!==generation.current)return;
  setEnabled(result==='granted');setStatus(result==='granted'?'waiting':result);
 },[blocked]);
 useEffect(()=>{
  if(!enabled||blocked)return;
  const began=performance.now();
  const orientation=(event:DeviceOrientationEvent)=>{
   const legacy=(window as unknown as {orientation?:number}).orientation;
   const raw=screenTilt(event.beta,event.gamma,screen.orientation?.angle??legacy??0);
   if(raw===null)return;
   if(center.current===null)center.current=raw;
   const value=relativeTilt(raw,center.current);
   signal.current={raw,value:Math.abs(value)<.04?0:value,at:performance.now()};setStatus('tracking');
  };
  const rotate=()=>{center.current=null;signal.current=null;setStatus('waiting');};
  window.addEventListener('deviceorientation',orientation);window.addEventListener('orientationchange',rotate);screen.orientation?.addEventListener?.('change',rotate);
  const timer=setInterval(()=>{const age=performance.now()-(signal.current?.at??began);if(age>(signal.current?1500:3000))setStatus('lost');},250);
  return()=>{clearInterval(timer);window.removeEventListener('deviceorientation',orientation);window.removeEventListener('orientationchange',rotate);screen.orientation?.removeEventListener?.('change',rotate);signal.current=null;};
 },[enabled,blocked]);
 const sample=useCallback(()=>{const s=signal.current;return s&&performance.now()-s.at<1500?{value:s.value,fresh:true}:{value:0,fresh:false};},[]);
 const calibrate=useCallback(()=>{const s=signal.current;if(s&&performance.now()-s.at<1500){center.current=s.raw;signal.current={...s,value:0};}},[]);
 return {enabled,status,start,stop,sample,calibrate};
}
