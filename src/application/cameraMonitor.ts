export type CameraMode='auto'|'compatibility';
export type FrameClock={now():number;frame(callback:FrameRequestCallback):number;cancelFrame(id:number):void};
export const browserFrameClock:FrameClock={now:()=>performance.now(),frame:cb=>requestAnimationFrame(cb),cancelFrame:id=>cancelAnimationFrame(id)};

// Only an existing, authorized stream is resumed. This never requests a camera.
export function monitorCamera(video:HTMLVideoElement,stream:MediaStream,callbacks:{state(ready:boolean,message:string):void;frame(now:number):void;fatal(message:string):void},clock:FrameClock=browserFrameClock){
 let stopped=false,frame=0,ready=false,previous=video.currentTime,lastFresh=clock.now(),resumeTried=false,resuming=false;
 const remove:Array<()=>void>=[];
 const live=()=>stream.getVideoTracks().some(t=>t.readyState==='live'&&!t.muted&&t.enabled!==false);
 const usable=()=>live()&&!video.paused&&!video.ended&&video.readyState>=2;
 const invalidate=(message:string)=>{if(stopped)return;previous=video.currentTime;if(ready){ready=false;callbacks.state(false,message);}};
 const stop=()=>{if(stopped)return;stopped=true;clock.cancelFrame(frame);remove.splice(0).forEach(fn=>fn());};
 const fatal=(message:string)=>{if(stopped)return;invalidate(message);stop();callbacks.fatal(message);};
 const resume=()=>{if(stopped||!video.paused||!live()||resumeTried||resuming)return;resumeTried=true;resuming=true;void video.play().catch(()=>fatal('카메라 재생을 복구하지 못했어요. 다시 시작하거나 호환 모드를 선택해 주세요.')).finally(()=>{resuming=false;});};
 const listen=(target:EventTarget,event:string,fn:()=>void)=>{target.addEventListener(event,fn);remove.push(()=>target.removeEventListener(event,fn));};
 for(const event of ['pause','waiting','stalled','resize'])listen(video,event,()=>{invalidate('새 카메라 영상을 기다려요. 판정을 잠시 멈췄어요.');resume();});
 listen(video,'error',()=>fatal('카메라 영상을 읽지 못했어요. 다시 시작해 주세요.'));
 for(const track of stream.getVideoTracks()){
  listen(track,'mute',()=>invalidate('카메라 신호가 잠시 끊겼어요. 새 영상을 기다려요.'));
  listen(track,'unmute',()=>{invalidate('카메라 신호를 다시 확인하고 있어요.');resume();});
  listen(track,'ended',()=>fatal('카메라 연결이 종료됐어요. 다시 시작해 주세요.'));
 }
 callbacks.state(false,'새 카메라 영상을 확인하고 있어요.');
 const tick=(now:number)=>{
  if(stopped)return;
  if(usable()&&Number.isFinite(video.currentTime)&&video.currentTime!==previous){
   previous=video.currentTime;lastFresh=now;resumeTried=false;
   if(!ready){ready=true;callbacks.state(true,'새 영상 수신 중');}
   try{callbacks.frame(now);}catch{fatal('카메라 화면 처리에 실패했어요. 다시 시작하거나 호환 모드를 선택해 주세요.');return;}
  }else{
   if(!usable()||now-lastFresh>400){invalidate('영상이 멈춰 판정을 중지했어요. 새 영상을 기다려요.');resume();}
   if(now-lastFresh>6000){fatal('새 영상이 오지 않아 카메라를 껐어요. 다시 시작하거나 호환 모드를 선택해 주세요.');return;}
  }
  if(!stopped)frame=clock.frame(tick);
 };
 frame=clock.frame(tick);
 return {stop,fresh:()=>!stopped&&ready&&usable()&&clock.now()-lastFresh<=400};
}
