import {monitorCamera,type CameraMode,type FrameClock} from './cameraMonitor';
import {cameraHelp,CAMERA_SETUP_TIMEOUT} from './localPoseSession';
export type MotionCameraState={status:'off'|'loading'|'tracking'|'lost'|'error';message:string;count:number;energy:number};
type Environment=FrameClock&{camera(mode:CameraMode):Promise<MediaStream>;video():HTMLVideoElement|null;pixels():Uint8ClampedArray;timer(fn:()=>void,ms:number):ReturnType<typeof setTimeout>;cancelTimer(id:ReturnType<typeof setTimeout>):void;emit(state:MotionCameraState):void};

export function createMotionCameraSession(env:Environment){
 let epoch=0,disposed=false,pending=false,stream:MediaStream|null=null,monitor:ReturnType<typeof monitorCamera>|null=null,deadline:ReturnType<typeof setTimeout>|null=null;
 let count=0,previous:Uint8ClampedArray|null=null,lastTrigger=-Infinity,lastSample=-Infinity,interval=100,current:MotionCameraState={status:'off',message:'',count:0,energy:0};
 const publish=(status:MotionCameraState['status'],message='',energy=0)=>{current={status,message,count,energy};if(!disposed)env.emit(current);};
 const baseline=()=>{previous=null;lastTrigger=env.now();};
 const release=()=>{epoch++;pending=false;monitor?.stop();monitor=null;if(deadline!==null)env.cancelTimer(deadline);deadline=null;stream?.getTracks().forEach(t=>t.stop());stream=null;const video=env.video();if(video){video.pause();video.srcObject=null;}baseline();lastSample=-Infinity;};
 const stop=(message='')=>{release();publish('off',message);};
 const fail=(message:string)=>{release();publish('error',message);};
 const start=async(mode:CameraMode='auto')=>{
  if(disposed||pending||stream)return;pending=true;const run=++epoch;interval=mode==='compatibility'?167:100;publish('loading','카메라를 준비하고 있어요.');
  deadline=env.timer(()=>{if(run===epoch)fail('카메라 응답을 기다리다 중지했어요. 권한 창에 응답한 뒤 다시 시작해 주세요.');},CAMERA_SETUP_TIMEOUT);
  try{
   const acquired=await env.camera(mode);if(disposed||run!==epoch){acquired.getTracks().forEach(t=>t.stop());return;}stream=acquired;
   const video=env.video();if(!video)throw Error('Missing video');video.muted=true;video.playsInline=true;video.srcObject=acquired;await video.play();if(disposed||run!==epoch)return;
   pending=false;if(deadline!==null)env.cancelTimer(deadline);deadline=null;baseline();
   monitor=monitorCamera(video,acquired,{state:(ready,message)=>{if(!ready){baseline();publish('lost',message);}else publish('tracking','새 영상의 화면 움직임을 확인하고 있어요.');},fatal:fail,frame:now=>{
    if(now-lastSample<interval)return;lastSample=now;const before=env.now(),pixels=env.pixels();
    if(pixels.length!==64*48*4)throw Error('Unexpected motion sample');
    let energy=0;if(previous){let changed=0;for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-previous[i])+Math.abs(pixels[i+1]-previous[i+1])+Math.abs(pixels[i+2]-previous[i+2])>80)changed++;energy=Math.min(100,Math.floor(changed/(64*48)*300));if(energy>35&&now-lastTrigger>700){lastTrigger=now;count++;}}
    previous=pixels.slice();interval=Math.min(300,Math.max(mode==='compatibility'?167:100,Math.ceil((env.now()-before)*2)));publish('tracking','새 영상의 화면 움직임을 확인하고 있어요.',energy);
   }},env);
  }catch(error){if(!disposed&&run===epoch)fail(cameraHelp(error));}
 };
 return {start,stop,reset:()=>{count=0;baseline();publish(current.status,current.message);},dispose:()=>{release();disposed=true;}};
}
