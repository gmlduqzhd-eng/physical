import {useCallback,useEffect,useRef,useState} from 'react';
import {browserFrameClock,type CameraMode} from './cameraMonitor';
import {createMotionCameraSession,type MotionCameraState} from './motionCameraSession';
export function useMotionCamera(){
 const video=useRef<HTMLVideoElement|null>(null),canvas=useRef<HTMLCanvasElement|null>(null),session=useRef<ReturnType<typeof createMotionCameraSession>|null>(null);
 const [mode,setMode]=useState<CameraMode>('auto'),[state,setState]=useState<MotionCameraState>({status:'off',message:'',count:0,energy:0});
 useEffect(()=>{
  const owned=createMotionCameraSession({...browserFrameClock,camera:async(profile)=>{if(!window.isSecureContext)throw {name:'SecurityError'};if(!navigator.mediaDevices?.getUserMedia)throw {name:'NotFoundError'};return navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:profile==='auto'?320:240},height:{ideal:profile==='auto'?240:180},frameRate:{ideal:24,max:30}}});},video:()=>video.current,pixels:()=>{const surface=canvas.current,source=video.current;if(!surface||!source)throw Error('Missing surface');if(surface.width!==64)surface.width=64;if(surface.height!==48)surface.height=48;const ctx=surface.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Canvas unavailable');ctx.drawImage(source,0,0,64,48);return ctx.getImageData(0,0,64,48).data;},timer:(fn,ms)=>setTimeout(fn,ms),cancelTimer:id=>clearTimeout(id),emit:setState});
  session.current=owned;const hide=()=>{if(document.hidden)owned.stop('화면을 떠나 카메라를 껐어요. 켜기 버튼을 눌러 다시 시작해 주세요.');},leave=()=>owned.stop('화면을 떠나 카메라를 껐어요.');document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',leave);
  return()=>{document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',leave);owned.dispose();if(session.current===owned)session.current=null;};
 },[]);
 const start=useCallback(()=>session.current?.start(mode),[mode]),stop=useCallback(()=>session.current?.stop(),[]),reset=useCallback(()=>session.current?.reset(),[]);
 const changeMode=useCallback(async(next:CameraMode)=>{const active=state.status==='tracking'||state.status==='lost';session.current?.stop();setMode(next);if(active)await session.current?.start(next);},[state.status]);
 return {...state,mode,changeMode,video,canvas,start,stop,reset};
}
