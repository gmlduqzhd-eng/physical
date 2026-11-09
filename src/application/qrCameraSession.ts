import {monitorCamera,type CameraMode,type FrameClock} from './cameraMonitor';
import {cameraHelp,CAMERA_SETUP_TIMEOUT} from './localPoseSession';
export type QrCameraState={status:'off'|'loading'|'scanning'|'recovering'|'closing'|'error';message:string};
export type QrDriver={open(mode:CameraMode,read:(text:string)=>void):Promise<void>;video():HTMLVideoElement|null;pause():void;resume():void;retire?():void;close():Promise<void>};
type Run={driver:QrDriver|null;guard:ReturnType<typeof monitorCamera>|null;opening:Promise<void>|null;closing:Promise<void>|null;stopping:boolean;accepted:boolean};
type Environment=FrameClock&{create():Promise<QrDriver>;parse(text:string):string|null;accept(value:string):void;invalidMessage:string;timer(fn:()=>void,ms:number):ReturnType<typeof setTimeout>;cancelTimer(id:ReturnType<typeof setTimeout>):void;emit(state:QrCameraState):void};
export function createQrCameraSession(env:Environment){
 let current:Run|null=null,disposed=false,generation=0,deadline:ReturnType<typeof setTimeout>|null=null,desired:QrCameraState={status:'off',message:''};
 const publish=(status:QrCameraState['status'],message:string)=>{if(!disposed)env.emit({status,message});};
 const halt=(status:QrCameraState['status']='off',message='')=>{
  const token=++generation;desired={status,message};if(deadline!==null)env.cancelTimer(deadline);deadline=null;
  const run=current;if(!run){publish(status,message);return Promise.resolve(!disposed&&token===generation);}
  run.stopping=true;run.guard?.stop();run.driver?.retire?.();publish('closing',message||'카메라 종료를 기다려요. 권한 창이 열려 있으면 응답해 주세요.');
  if(!run.closing)run.closing=(async()=>{try{await run.opening;}catch{/* opening failure still owns its surface */}try{await run.driver?.close();}catch{/* driver also releases its owned stream */}finally{if(current===run){current=null;publish(desired.status,desired.message);}}})();
  return run.closing.then(()=>!disposed&&token===generation);
 };
 const start=async(mode:CameraMode='auto')=>{
  if(disposed||current)return;generation++;const run:Run={driver:null,guard:null,opening:null,closing:null,stopping:false,accepted:false};current=run;publish('loading','카메라 권한과 영상을 준비하고 있어요.');
  deadline=env.timer(()=>{if(current===run&&!run.stopping)void halt('error','카메라 응답을 기다리다 중지했어요. 권한 창에 응답한 뒤 다시 시작해 주세요.');},CAMERA_SETUP_TIMEOUT);
  run.opening=(async()=>{
   run.driver=await env.create();if(run.stopping||disposed)return;
   await run.driver.open(mode,text=>{
    if(run.stopping||disposed||run.accepted||!run.guard?.fresh())return;
    let value:string|null=null;try{value=text.length<=4096?env.parse(text):null;}catch{/* invalid input */}
    if(value===null){publish('scanning',env.invalidMessage);return;}
    run.accepted=true;void halt('off','QR을 읽고 카메라를 껐어요.').then(valid=>{if(valid)try{env.accept(value!);}catch{publish('error','QR 연결을 처리하지 못했어요. 다시 확인해 주세요.');}});
   });
   if(run.stopping||disposed)return;
   const video=run.driver.video(),stream=video?.srcObject as MediaStream|null;if(!video||!stream?.getVideoTracks)throw Error('Missing QR video');
   if(deadline!==null)env.cancelTimer(deadline);deadline=null;
   let receivedFrames=false;
   // start() resolves before html5-qrcode builds its overlay on playing. Do not
   // pause that incomplete UI; the fresh-frame gate already rejects callbacks.
   run.guard=monitorCamera(video,stream,{state:(ready,message)=>{if(run.stopping)return;try{if(ready){receivedFrames=true;run.driver!.resume();}else if(receivedFrames)run.driver!.pause();}catch{void halt('error','스캔을 복구하지 못했어요. 다시 시작하거나 호환 모드를 선택해 주세요.');return;}publish(ready?'scanning':'recovering',ready?'QR을 비춰 주세요.':message);},frame:()=>{},fatal:message=>{void halt('error',message);}},env);
   if(run.stopping)run.guard.stop();
  })();
  try{await run.opening;}catch(error){if(current===run&&!run.stopping&&!disposed)await halt('error',cameraHelp(error));}
 };
 return {start,stop:(message='')=>halt('off',message),dispose:()=>{disposed=true;void halt();}};
}
