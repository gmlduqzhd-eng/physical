import {useCallback,useEffect,useId,useRef,useState} from 'react';
import {browserFrameClock,type CameraMode} from './cameraMonitor';
import {createQrCameraSession,type QrCameraState,type QrDriver} from './qrCameraSession';

export function useQrCamera(parse:(text:string)=>string|null,accept:(text:string)=>void,invalidMessage:string,disabled=false){
 const host=useRef<HTMLDivElement|null>(null),id=useId().replace(/[^a-zA-Z0-9_-]/g,''),serial=useRef(0),options=useRef({parse,accept,invalidMessage,disabled});options.current={parse,accept,invalidMessage,disabled};
 const session=useRef<ReturnType<typeof createQrCameraSession>|null>(null),[mode,setMode]=useState<CameraMode>('auto'),[state,setState]=useState<QrCameraState>({status:'off',message:''});
 useEffect(()=>{
  const owned=createQrCameraSession({...browserFrameClock,parse:text=>options.current.disabled?null:options.current.parse(text),accept:text=>{if(!options.current.disabled)options.current.accept(text);},invalidMessage:options.current.invalidMessage,timer:(fn,ms)=>setTimeout(fn,ms),cancelTimer:timer=>clearTimeout(timer),emit:setState,create:async()=>{
   if(!window.isSecureContext)throw {name:'SecurityError'};if(!navigator.mediaDevices?.getUserMedia)throw {name:'NotFoundError'};
   const {Html5Qrcode,Html5QrcodeSupportedFormats}=await import('html5-qrcode');
   const surface=document.createElement('div');surface.id=`qr-${id}-${++serial.current}`;if(!host.current)throw Error('Missing scan host');host.current.append(surface);
   let scanner:InstanceType<typeof Html5Qrcode>;try{scanner=new Html5Qrcode(surface.id,{verbose:false,formatsToSupport:[Html5QrcodeSupportedFormats.QR_CODE]});}catch(error){surface.remove();throw error;}
   let opening:Promise<unknown>|null=null,closing:Promise<void>|null=null;
   const driver:QrDriver={open:async(profile,read)=>{opening=scanner.start({facingMode:'environment'},{fps:profile==='auto'?8:5,qrbox:(w,h)=>{const side=Math.max(40,Math.min(220,w-24,h-24));return {width:side,height:side};},videoConstraints:{facingMode:{ideal:'environment'},width:{ideal:profile==='auto'?640:480},height:{ideal:profile==='auto'?480:360},frameRate:{ideal:24,max:30}}},read,()=>{});await opening;},video:()=>surface.querySelector('video'),pause:()=>{if(scanner.getState()===2)scanner.pause(false);},resume:()=>{if(scanner.getState()===3)scanner.resume();},retire:()=>{
    // A pending library start still needs a connected, nonzero surface even
    // after React removes the panel. Keep this attempt offscreen until closed.
    const video=surface.querySelector('video');if(!video||video.readyState<2){surface.setAttribute('aria-hidden','true');Object.assign(surface.style,{position:'fixed',left:'-10000px',top:'0',width:'320px',maxWidth:'320px'});document.body.append(surface);}
   },close:()=>{
    if(closing)return closing;
    closing=(async()=>{try{await opening;}catch{/* permission denied */}const video=surface.querySelector('video');
     // Let the library's pending play settle before removing its surface.
     if(video?.srcObject&&!video.paused&&video.readyState<2)await new Promise<void>(resolve=>{const done=()=>{clearTimeout(timer);video.removeEventListener('playing',done);video.removeEventListener('error',done);resolve();};const timer=setTimeout(done,1500);video.addEventListener('playing',done,{once:true});video.addEventListener('error',done,{once:true});});
     // Library handlers throw on abort even during intentional teardown. They
     // belong to this closed surface; active errors are handled by the monitor.
     if(video){video.onabort=null;video.onerror=null;}
     const stream=video?.srcObject as MediaStream|null;try{await scanner.stop();}catch{/* not yet running */}finally{stream?.getTracks?.().forEach(track=>track.stop());if(video)video.srcObject=null;try{scanner.clear();}catch{/* already cleared */}surface.remove();}
    })();return closing;
   }};return driver;
  }});
  session.current=owned;const hide=()=>{if(document.hidden)void owned.stop('화면을 떠나 카메라를 껐어요. 촬영 시작을 눌러 다시 켜 주세요.');},leave=()=>{void owned.stop('화면을 떠나 카메라를 껐어요.');};document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',leave);
  return()=>{document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',leave);owned.dispose();if(session.current===owned)session.current=null;};
 },[id]);
 const stop=useCallback(()=>session.current?.stop(),[]),start=useCallback(()=>{if(!options.current.disabled)void session.current?.start(mode);},[mode]);
 useEffect(()=>{if(disabled)void session.current?.stop('수업이 중지되어 스캔을 껐어요.');},[disabled]);
 const changeMode=useCallback(async(next:CameraMode)=>{const active=state.status==='scanning'||state.status==='recovering';setMode(next);await session.current?.stop();if(active&&!options.current.disabled)await session.current?.start(next);},[state.status]);
 return {...state,host,mode,changeMode,start,stop};
}
